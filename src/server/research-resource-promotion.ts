import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { chromium } from "playwright";
import { assetRequirementBundleSchema } from "../shared/resource-requirements/index.js";
import { researchResourceIntakeBatchSchema } from "../shared/game-design-knowledge/research-resource-intake.js";
import { researchResourceFamilyManifestSchema, resourceFamilyProfileSchema, type ResourceFamily } from "../shared/resource-library/index.js";
import { requireBrowserExecutable } from "./browser-quality.js";

const identityHash = (value: string) => createHash("sha256").update(value).digest("hex").toUpperCase();
const tag = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "research";

async function writeImmutable(path: string, bytes: Uint8Array | string) {
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(path, bytes, { flag: "wx" }); }
  catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    const expected = typeof bytes === "string" ? Buffer.from(bytes) : Buffer.from(bytes);
    if (!Buffer.from(await readFile(path)).equals(expected)) throw new Error(`资源族已有不同内容，拒绝覆盖：${path}`);
  }
}

export type ResearchPreviewGenerator = (input: { familyRoot: string; assets: Array<{ path: string; mimeType: string }>; label: string }) => Promise<string[]>;

export const generateResearchImageContactSheet: ResearchPreviewGenerator = async ({ familyRoot, assets, label }) => {
  if (!assets.length || assets.some(({ mimeType }) => !mimeType.startsWith("image/"))) throw new Error("当前自动派生预览只支持纯图片资源族；音频波形与 3D 转台仍需专用生成器");
  const cards = await Promise.all(assets.slice(0, 36).map(async (asset) => ({ ...asset, data: `data:${asset.mimeType};base64,${Buffer.from(await readFile(join(familyRoot, asset.path))).toString("base64")}` })));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("研究资源接触表"), headless: true });
  const output = join(familyRoot, "preview", "contact-sheet.png"); await mkdir(dirname(output), { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#0b1210;color:#eef6f1;font-family:system-ui}.sheet{display:grid;gap:16px}h1{margin:0;font-size:24px}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.card{display:grid;min-height:120px;place-items:center;padding:8px;background:#14201b;border:1px solid #385047}.card img{max-width:100%;max-height:88px;object-fit:contain}.card small{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a9bbb2;font-size:9px}</style><main class="sheet"><h1>${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h1><div class="grid">${cards.map(({ path, data }) => `<div class="card"><img src="${data}" alt=""><small>${path.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</small></div>`).join("")}</div></main>`);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    await page.locator("main").screenshot({ path: output }); await page.close();
  } finally { await browser.close(); }
  return ["preview/contact-sheet.png"];
};

export const generateResearchAudioWaveform: ResearchPreviewGenerator = async ({ familyRoot, assets, label }) => {
  if (!assets.length || assets.some(({ mimeType }) => !mimeType.startsWith("audio/"))) throw new Error("波形预览只接受纯音频资源族");
  const sources = await Promise.all(assets.slice(0, 12).map(async (asset) => `data:${asset.mimeType};base64,${Buffer.from(await readFile(join(familyRoot, asset.path))).toString("base64")}`));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("研究资源音频波形"), headless: true });
  const output = join(familyRoot, "preview", "waveform.png"); await mkdir(dirname(output), { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: Math.max(180, sources.length * 92) }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#0b1210;color:#eef6f1;font-family:system-ui}h1{margin:0 0 18px;font-size:24px}canvas{display:block;background:#14201b;border:1px solid #385047}</style><h1>${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h1><canvas width="952" height="${Math.max(110, sources.length * 82)}"></canvas>`);
    await page.evaluate(async (encoded) => {
      const context = new AudioContext(); const canvas = document.querySelector("canvas")!; const drawing = canvas.getContext("2d")!;
      drawing.fillStyle = "#14201b"; drawing.fillRect(0, 0, canvas.width, canvas.height);
      for (const [index, source] of encoded.entries()) {
        const buffer = await context.decodeAudioData(await (await fetch(source)).arrayBuffer()); const channel = buffer.getChannelData(0); const y = 40 + index * 82; const amplitude = 31;
        drawing.strokeStyle = index % 2 ? "#71b8ef" : "#62d4a3"; drawing.lineWidth = 2; drawing.beginPath();
        for (let x = 0; x < canvas.width; x += 1) { const start = Math.floor(x * channel.length / canvas.width); const end = Math.max(start + 1, Math.floor((x + 1) * channel.length / canvas.width)); let peak = 0; for (let cursor = start; cursor < end; cursor += 1) peak = Math.max(peak, Math.abs(channel[cursor] ?? 0)); const top = y - peak * amplitude; const bottom = y + peak * amplitude; drawing.moveTo(x, top); drawing.lineTo(x, bottom); }
        drawing.stroke();
      }
      await context.close();
    }, sources);
    await page.locator("canvas").screenshot({ path: output }); await page.close();
  } finally { await browser.close(); }
  return ["preview/waveform.png"];
};

export const generateResearchModelTurntable: ResearchPreviewGenerator = async ({ familyRoot, assets, label }) => {
  if (!assets.length || assets.some(({ mimeType }) => mimeType !== "model/gltf-binary")) throw new Error("转台预览只接受 GLB 模型资源族");
  const allowed = new Map(assets.map((asset, index) => [String(index), join(familyRoot, asset.path)])); const threeRoot = resolve("node_modules/three");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#101815;overflow:hidden}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three.module.js"}}</script></head><body><script type="module">import * as THREE from 'three';import{GLTFLoader}from'/GLTFLoader.js';const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(512,512);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.append(renderer.domElement);const scene=new THREE.Scene();scene.background=new THREE.Color(0x101815);const camera=new THREE.PerspectiveCamera(35,1,.01,1000);scene.add(new THREE.HemisphereLight(0xffffff,0x334155,2.5));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(4,6,5);scene.add(key);const group=new THREE.Group();scene.add(group);const loader=new GLTFLoader();window.loadAsset=async(id)=>{while(group.children.length)group.remove(group.children[0]);const gltf=await loader.loadAsync('/asset?id='+id);const model=gltf.scene;group.add(model);const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());model.position.sub(center);const radius=Math.max(size.x,size.y,size.z,.1);camera.position.set(radius*1.7,radius*1.25,radius*2.2);camera.near=radius/100;camera.far=radius*30;camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.render(scene,camera)};window.rotateAsset=(angle)=>{group.rotation.y=angle;renderer.render(scene,camera)};window.previewReady=true;</script></body></html>`;
  const server = createServer(async (request, response) => { try { const url = new URL(request.url ?? "/", "http://127.0.0.1"); let path: string | undefined; if (url.pathname === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; } if (url.pathname === "/three.module.js") path = join(threeRoot, "build", "three.module.js"); else if (url.pathname === "/three.core.js") path = join(threeRoot, "build", "three.core.js"); else if (url.pathname === "/GLTFLoader.js") path = join(threeRoot, "examples", "jsm", "loaders", "GLTFLoader.js"); else if (/^\/utils\/[A-Za-z0-9._-]+\.js$/.test(url.pathname)) path = join(threeRoot, "examples", "jsm", url.pathname.slice(1)); else if (url.pathname === "/asset") path = allowed.get(url.searchParams.get("id") ?? ""); if (!path) { response.statusCode = 404; response.end(); return; } response.setHeader("Content-Type", path.endsWith(".js") ? "text/javascript" : "model/gltf-binary"); response.end(await readFile(path)); } catch (error) { response.statusCode = 400; response.end(error instanceof Error ? error.message : "preview error"); } });
  await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept)); const port = (server.address() as AddressInfo).port;
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("研究资源 3D 转台"), headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", `--explicitly-allowed-ports=${port}`] }); const output = join(familyRoot, "preview", "turntable.png"); await mkdir(dirname(output), { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } }); const diagnostics: string[] = []; page.on("pageerror", (error) => diagnostics.push(error.message)); page.on("console", (message) => { if (message.type() === "error") diagnostics.push(message.text()); }); page.on("response", (response) => { if (response.status() >= 400) diagnostics.push(`${response.status()} ${response.url()}`); }); await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    try { await page.waitForFunction(() => Boolean((window as any).previewReady), undefined, { timeout: 10_000 }); } catch { throw new Error(`3D 转台页初始化失败：${diagnostics.join(" | ") || "没有浏览器诊断"}`); }
    await page.evaluate(() => (window as any).loadAsset("0"));
    const frames: string[] = []; for (let index = 0; index < 8; index += 1) { await page.evaluate((angle) => (window as any).rotateAsset(angle), index * Math.PI / 4); frames.push(`data:image/png;base64,${(await page.locator("canvas").screenshot()).toString("base64")}`); } await page.close();
    const sheet = await browser.newPage({ viewport: { width: 1060, height: 580 } }); await sheet.setContent(`<!doctype html><style>body{margin:0;padding:18px;background:#0b1210;color:#eef6f1;font-family:system-ui}h1{margin:0 0 14px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(4,250px);gap:8px}.grid img{width:250px;height:250px;object-fit:cover;background:#101815}</style><main><h1>${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h1><div class="grid">${frames.map((frame) => `<img src="${frame}" alt="">`).join("")}</div></main>`); await sheet.locator("main").screenshot({ path: output }); await sheet.close();
  } finally { await browser.close(); await new Promise<void>((accept) => server.close(() => accept())); }
  return ["preview/turntable.png"];
};

export const generateResearchFontGlyphSheet: ResearchPreviewGenerator = async ({ familyRoot, assets, label }) => {
  if (!assets.length || assets.some(({ mimeType }) => !mimeType.startsWith("font/"))) throw new Error("字形预览只接受字体资源族");
  const fonts = await Promise.all(assets.slice(0, 8).map(async (asset, index) => ({ name: `ResearchFont${index}`, data: `data:${asset.mimeType};base64,${Buffer.from(await readFile(join(familyRoot, asset.path))).toString("base64")}`, path: asset.path })));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("研究资源字体字形页"), headless: true }); const output = join(familyRoot, "preview", "glyph-sheet.png"); await mkdir(dirname(output), { recursive: true });
  try { const page = await browser.newPage({ viewport: { width: 1100, height: Math.max(420, fonts.length * 210) }, deviceScaleFactor: 1 }); await page.setContent(`<!doctype html><meta charset="utf-8"><style>${fonts.map(({ name, data }) => `@font-face{font-family:'${name}';src:url('${data}')}`).join("")}body{margin:0;padding:28px;background:#0b1210;color:#eef6f1}h1{margin:0 0 20px;font:700 24px system-ui}.sample{margin:0 0 14px;padding:18px;border:1px solid #385047;background:#14201b}.sample small{display:block;margin-bottom:10px;color:#9db1a7;font:11px system-ui}.sample p{margin:4px 0;font-size:34px;line-height:1.3}</style><main><h1>${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</h1>${fonts.map(({ name, path }) => `<section class="sample" style="font-family:'${name}'"><small>${path}</small><p>游戏设计 ABC 0123456789</p><p>开始 · 暂停 · 提示 · 胜利</p></section>`).join("")}</main>`); await page.evaluate(() => document.fonts.ready); await page.locator("main").screenshot({ path: output }); await page.close(); } finally { await browser.close(); }
  return ["preview/glyph-sheet.png"];
};

export const generateResearchResourcePreview: ResearchPreviewGenerator = async (input) => {
  if (input.assets.every(({ mimeType }) => mimeType.startsWith("image/"))) return generateResearchImageContactSheet(input);
  if (input.assets.every(({ mimeType }) => mimeType.startsWith("audio/"))) return generateResearchAudioWaveform(input);
  if (input.assets.every(({ mimeType }) => mimeType === "model/gltf-binary")) return generateResearchModelTurntable(input);
  if (input.assets.every(({ mimeType }) => mimeType.startsWith("font/"))) return generateResearchFontGlyphSheet(input);
  throw new Error("同一资源族混入了不同媒体类型，不能生成可信派生预览");
};

export async function promoteApprovedResearchResourceFamilies(rawBatch: unknown, rawRequirements: unknown, quarantineRoot: string, libraryRoot: string, previewGenerator: ResearchPreviewGenerator = generateResearchResourcePreview, now = new Date()): Promise<ResourceFamily[]> {
  const batch = researchResourceIntakeBatchSchema.parse(rawBatch); const requirements = assetRequirementBundleSchema.parse(rawRequirements);
  if (batch.status !== "approved" || batch.items.some(({ binding }) => binding.status !== "approved")) throw new Error("隔离批次与全部绑定批准后才能晋升资源族");
  const requirementById = new Map(requirements.requirements.map((requirement) => [requirement.id, requirement]));
  const realQuarantineRoot = resolve(quarantineRoot); await mkdir(libraryRoot, { recursive: true });
  if (previewGenerator === generateResearchResourcePreview && batch.items.some((item) => new Set(item.versions.map(({ mimeType }) => mimeType.split("/")[0])).size !== 1)) throw new Error("批次包含混合媒体资源族，未写入任何资源族");
  const stagingRoot = await mkdtemp(join(libraryRoot, ".research-promotion-"));
  const families: ResourceFamily[] = [];
  try { for (const item of batch.items) {
    const requirement = requirementById.get(item.requirementId); if (!requirement) throw new Error(`晋升资源没有对应需求：${item.requirementId}`);
    const familyId = `research-${identityHash(`${batch.researchTaskId}:${item.requirementId}`).slice(0, 24).toLowerCase()}`;
    const familyRoot = resolve(stagingRoot, familyId); await mkdir(familyRoot, { recursive: true });
    const assets = [];
    for (const version of item.versions) {
      const source = resolve(realQuarantineRoot, version.quarantinedPath);
      if (!source.startsWith(`${realQuarantineRoot}${sep}`)) throw new Error(`隔离资源路径越界：${version.quarantinedPath}`);
      const bytes = await readFile(source); const digest = createHash("sha256").update(bytes).digest("hex").toUpperCase();
      if (digest !== version.sha256) throw new Error(`隔离资源哈希已变化：${version.originalFileName}`);
      const targetPath = `assets/${version.sha256}${version.originalFileName.slice(version.originalFileName.lastIndexOf("."))}`;
      await writeImmutable(join(familyRoot, targetPath), bytes); assets.push({ path: targetPath, bytes: bytes.byteLength, sha256: digest, mimeType: version.mimeType });
    }
    const securityReviewId = batch.securityReviews.at(-1)!.id;
    const manifest = researchResourceFamilyManifestSchema.parse({ schemaVersion: "research-resource-family-v1", familyId, researchTaskId: batch.researchTaskId, intakeBatchId: batch.id, promotedAt: batch.securityReviews.at(-1)?.reviewedAt ?? now.toISOString(), sources: [{ route: item.route, sourceUrl: item.source.sourceUrl, licenseId: item.source.licenseId, obligations: item.source.obligations, securityReviewId }], assets: assets.map(({ mimeType: _, ...asset }) => asset) });
    const label = `研究资源 · ${requirement.role} · ${item.requirementId}`;
    const previewPaths = await previewGenerator({ familyRoot, assets: assets.map(({ path, mimeType }) => ({ path, mimeType })), label });
    const profile = resourceFamilyProfileSchema.parse({ familyId, label, dimensions: requirement.mediaType === "model" ? ["limited-3d"] : ["2d"], roles: [requirement.role], mediaTypes: [requirement.mediaType], formats: [...new Set(item.versions.map(({ mimeType }) => mimeType))], styleTags: [...new Set(["research", tag(requirement.visual?.styleFamily ?? "project-owned")])], gameplayTags: [...new Set(requirement.semanticTags.map(tag))], stateTags: requirement.variants, lifecycle: "reviewed", previewPaths });
    await writeImmutable(join(familyRoot, "RESOURCE_FAMILY.json"), `${JSON.stringify(manifest, null, 2)}\n`); await writeImmutable(join(familyRoot, "RESOURCE_PROFILE.json"), `${JSON.stringify(profile, null, 2)}\n`);
    families.push({ manifest, profile });
  }
    for (const family of families) {
      const staged = join(stagingRoot, family.profile.familyId); const target = join(libraryRoot, family.profile.familyId);
      try { await rename(staged, target); }
      catch (error) {
        if (!(error instanceof Error) || !("code" in error) || !["EEXIST", "ENOTEMPTY"].includes(String(error.code))) throw error;
        const expected = `${JSON.stringify(family.manifest, null, 2)}\n`; const existing = await readFile(join(target, "RESOURCE_FAMILY.json"), "utf8");
        if (existing !== expected) throw new Error(`正式资源族已有不同清单，拒绝覆盖：${family.profile.familyId}`);
      }
    }
    return families;
  } finally { await rm(stagingRoot, { recursive: true, force: true }); }
}
