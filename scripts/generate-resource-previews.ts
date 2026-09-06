import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { chromium } from "playwright";
import { loadCuratedResourceLibrary } from "../src/server/resource-library.js";

const libraryRoot = resolve(process.argv[2] ?? "assets/library/curated");
const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`${command} 失败：${result.stderr || result.stdout}`);
};
const mime = (path: string) => path.endsWith(".js") ? "text/javascript" : path.endsWith(".glb") ? "model/gltf-binary" : "application/octet-stream";

const families = await loadCuratedResourceLibrary(libraryRoot);
for (const family of families.filter(({ profile }) => profile.mediaTypes.some((type) => type === "image" || type === "spritesheet"))) {
  const root = join(libraryRoot, family.profile.familyId);
  const output = join(root, "preview", "contact-sheet.png");
  await mkdir(dirname(output), { recursive: true });
  const images = family.manifest.assets.slice(0, 36).map(({ path }) => join(root, path));
  run("magick", ["montage", ...images, "-thumbnail", "96x96", "-background", "#111827", "-tile", "6x6", "-geometry", "112x112+6+6", output]);
}

const audioFamily = families.find(({ profile }) => profile.mediaTypes.includes("audio"));
if (audioFamily) {
  const root = join(libraryRoot, audioFamily.profile.familyId);
  const preferred = ["click_001.ogg", "confirmation_001.ogg", "error_001.ogg", "select_001.ogg", "toggle_001.ogg"];
  const audio = preferred.map((name) => audioFamily.manifest.assets.find(({ path }) => basename(path) === name)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const output = join(root, "preview", "waveform.png");
  await mkdir(dirname(output), { recursive: true });
  const filters = audio.map((_, index) => `[${index}:a]aformat=sample_rates=44100:channel_layouts=mono,showwavespic=s=1000x100:colors=${index % 2 ? "0x60A5FA" : "0xF59E0B"}[v${index}]`);
  filters.push(`${audio.map((_, index) => `[v${index}]`).join("")}vstack=inputs=${audio.length},format=rgb24[out]`);
  run("ffmpeg", ["-y", ...audio.flatMap(({ path }) => ["-i", join(root, path)]), "-filter_complex", filters.join(";"), "-map", "[out]", "-frames:v", "1", output]);
}

const modelFamily = families.find(({ profile }) => profile.mediaTypes.includes("model"));
if (modelFamily) {
  const root = join(libraryRoot, modelFamily.profile.familyId);
  const threeRoot = resolve("node_modules/three");
  const allowedAssets = new Set(modelFamily.manifest.assets.map(({ path }) => path));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#111827;overflow:hidden}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three.module.js"}}</script></head><body><script type="module">
    import * as THREE from 'three'; import { GLTFLoader } from '/jsm/loaders/GLTFLoader.js';
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.setSize(512,512); renderer.setPixelRatio(1); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2; document.body.append(renderer.domElement);
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0x111827); const camera=new THREE.PerspectiveCamera(35,1,0.01,1000); scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2.4)); const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(3,5,4); scene.add(key); const fill=new THREE.DirectionalLight(0x60a5fa,1.2); fill.position.set(-4,2,-3); scene.add(fill);
    const group=new THREE.Group(); scene.add(group); const loader=new GLTFLoader();
    window.loadModel=async(path)=>{ while(group.children.length) group.remove(group.children[0]); const gltf=await loader.loadAsync('/asset?path='+encodeURIComponent(path)); const model=gltf.scene; group.add(model); const box=new THREE.Box3().setFromObject(model); const center=box.getCenter(new THREE.Vector3()); const size=box.getSize(new THREE.Vector3()); model.position.sub(center); const radius=Math.max(size.x,size.y,size.z,0.1); camera.position.set(radius*1.7,radius*1.25,radius*2.1); camera.lookAt(0,0,0); camera.near=radius/100; camera.far=radius*20; camera.updateProjectionMatrix(); group.rotation.y=0.5; renderer.render(scene,camera); };
    window.rotateModel=(angle)=>{group.rotation.y=angle;renderer.render(scene,camera)}; window.previewReady=true;
  </script></body></html>`;
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; }
      if (url.pathname === "/three.module.js") { const path = join(threeRoot, "build", "three.module.js"); response.setHeader("Content-Type", mime(path)); response.end(await readFile(path)); return; }
      if (url.pathname === "/three.core.js") { const path = join(threeRoot, "build", "three.core.js"); response.setHeader("Content-Type", mime(path)); response.end(await readFile(path)); return; }
      if (url.pathname.startsWith("/jsm/")) { const path = resolve(threeRoot, "examples", url.pathname.slice(1)); if (!path.startsWith(`${resolve(threeRoot, "examples")}${sep}`)) throw new Error("模块路径越界"); response.setHeader("Content-Type", mime(path)); response.end(await readFile(path)); return; }
      if (url.pathname === "/asset") { const relative = url.searchParams.get("path") ?? ""; if (!allowedAssets.has(relative)) throw new Error("模型不在精选清单"); const path = resolve(root, relative); if (!path.startsWith(`${root}${sep}`)) throw new Error("模型路径越界"); response.setHeader("Content-Type", mime(path)); response.end(await readFile(path)); return; }
      response.statusCode = 404; response.end();
    } catch (error) { response.statusCode = 400; response.end(error instanceof Error ? error.message : "preview error"); }
  });
  await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
  const port = (server.address() as AddressInfo).port;
  const temp = await mkdtemp(join(tmpdir(), "resource-preview-"));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    const diagnostics: string[] = [];
    page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`));
    page.on("response", (response) => { if (response.status() >= 400) diagnostics.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:${port}/`);
    try {
      await page.waitForFunction(() => Boolean((window as Window & { previewReady?: boolean }).previewReady), undefined, { timeout: 30_000 });
    } catch {
      throw new Error(`3D 预览页初始化失败：${diagnostics.join(" | ") || "没有浏览器诊断"}`);
    }
    const thumbs = [];
    for (const [index, asset] of modelFamily.manifest.assets.entries()) {
      await page.evaluate((path) => (window as Window & { loadModel(path: string): Promise<void> }).loadModel(path), asset.path);
      const target = join(temp, `model-${String(index).padStart(2, "0")}.png`); await page.locator("canvas").screenshot({ path: target }); thumbs.push(target);
    }
    const previewRoot = join(root, "preview"); await mkdir(previewRoot, { recursive: true });
    run("magick", ["montage", ...thumbs, "-thumbnail", "160x160", "-tile", "6x5", "-geometry", "176x176+6+6", join(previewRoot, "contact-sheet.png")]);
    const representative = modelFamily.manifest.assets.find(({ path }) => path.includes("bridge_stone.glb")) ?? modelFamily.manifest.assets[0];
    await page.evaluate((path) => (window as Window & { loadModel(path: string): Promise<void> }).loadModel(path), representative.path);
    const frames = [];
    for (let index = 0; index < 12; index += 1) { await page.evaluate((angle) => (window as Window & { rotateModel(angle: number): void }).rotateModel(angle), index * Math.PI / 6); const target = join(temp, `turn-${String(index).padStart(2, "0")}.png`); await page.locator("canvas").screenshot({ path: target }); frames.push(target); }
    run("magick", ["-delay", "8", "-loop", "0", ...frames, "-resize", "384x384", join(previewRoot, "turntable.webp")]);
  } finally { await browser.close(); await new Promise<void>((accept) => server.close(() => accept())); await rm(temp, { recursive: true, force: true }); }
}

console.log(JSON.stringify({ libraryRoot, previews: families.map(({ profile }) => ({ familyId: profile.familyId, previewPaths: profile.previewPaths })) }, null, 2));
