import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { PlayerFirstHosting, type PlayerFirstImageProvider } from "../src/server/player-first-hosting.js";

// 全部走真实 HTTP 与临时目录；图片提供方为本地假实现，不触发任何付费调用。

const runtimeFiles = { "index.html": "<!doctype html><title>demo</title><script src=\"./app.js\"></script>", "app.js": "console.log(1)", "styles.css": "body{}" };

async function transparentPng(): Promise<Buffer> {
  // 1024×1024 透明画布，中央 200×200 不透明方块：可验证透明裁切与角色缩放。
  const square = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();
  return sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: square, left: 412, top: 412 }]).png().toBuffer();
}

async function opaquePng(): Promise<Buffer> {
  return sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
}

async function withHosting(
  setup: { images?: PlayerFirstImageProvider | null; now?: () => number; previewTtlMs?: number },
  run: (context: { origin: string; hosting: PlayerFirstHosting; generatedRoot: string; releaseRoot: string }) => Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), "player-first-hosting-"));
  const generatedRoot = join(root, "generated");
  const releaseRoot = join(root, "releases");
  const errors: unknown[] = [];
  let hosting!: PlayerFirstHosting;
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://local").pathname;
    void (async () => {
      if (await hosting.handleApi(request, response, pathname)) return;
      if (request.method === "GET" && await hosting.handleStatic(response, pathname)) return;
      response.writeHead(404); response.end("fallthrough");
    })().catch(error => { errors.push(error); response.destroy(); });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  hosting = new PlayerFirstHosting({ hostedOrigin: origin, generatedRoot, releaseRoot, images: setup.images ?? null, now: setup.now, previewTtlMs: setup.previewTtlMs });
  try { await run({ origin, hosting, generatedRoot, releaseRoot }); }
  finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  }
  assert.deepEqual(errors, []);
}

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("稳定发布落盘、返回托管源网址并按指针提供文件", async () => {
  await withHosting({}, async ({ origin, releaseRoot, generatedRoot }) => {
    mkdirSync(generatedRoot, { recursive: true });
    writeFileSync(join(generatedRoot, "player-abc.png"), await opaquePng());
    const response = await post(`${origin}/api/releases`, { projectId: "demo-project", buildId: "build-001", files: runtimeFiles, assets: [{ sourceName: "player-abc.png", targetPath: "assets/player-abc.png" }] });
    assert.equal(response.status, 200);
    const result = await response.json() as { url: string; buildId: string };
    assert.equal(result.buildId, "build-001");
    assert.equal(result.url, `${origin}/play/demo-project/index.html`);
    assert.ok(existsSync(join(releaseRoot, "demo-project", "build-001", "assets", "player-abc.png")));
    assert.deepEqual(JSON.parse(readFileSync(join(releaseRoot, "pointers.json"), "utf8")), { "demo-project": "build-001" });

    const page = await fetch(result.url);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("x-studio-build-id"), "build-001");
    assert.match(page.headers.get("content-type") ?? "", /text\/html/);
    assert.equal(await page.text(), runtimeFiles["index.html"]);
    assert.equal((await fetch(`${origin}/play/demo-project/assets/player-abc.png`)).headers.get("content-type"), "image/png");
    assert.equal((await fetch(`${origin}/play/demo-project/../pointers.json`)).status, 404);
    assert.equal((await fetch(`${origin}/play/unknown-project/index.html`)).status, 404);
  });
});

test("同一构建 ID 的不可变文件内容不一致时拒绝覆盖", async () => {
  await withHosting({}, async ({ origin }) => {
    assert.equal((await post(`${origin}/api/releases`, { projectId: "demo-project", buildId: "build-001", files: runtimeFiles })).status, 200);
    const conflict = await post(`${origin}/api/releases`, { projectId: "demo-project", buildId: "build-001", files: { ...runtimeFiles, "app.js": "console.log(2)" } });
    assert.equal(conflict.status, 400);
    assert.match(((await conflict.json()) as { error: string }).error, /不可变文件内容不一致/);
    const invalid = await post(`${origin}/api/releases`, { projectId: "bad id", buildId: "build-001", files: runtimeFiles });
    assert.equal(invalid.status, 400);
    assert.match(((await invalid.json()) as { error: string }).error, /项目 ID 无效/);
  });
});

test("真机预览驻留内存、拒绝越权文件名，到期后返回 410", async () => {
  let clock = 1_000_000;
  await withHosting({ now: () => clock, previewTtlMs: 60_000 }, async ({ origin }) => {
    const rejected = await post(`${origin}/api/previews`, { files: { "index.html": "<p>x</p>", "../evil.html": "x" } });
    assert.equal(rejected.status, 400);
    assert.match(((await rejected.json()) as { error: string }).error, /预览文件名无效/);

    const response = await post(`${origin}/api/previews`, { files: runtimeFiles });
    assert.equal(response.status, 200);
    const result = await response.json() as { url: string; expiresAt: string };
    assert.match(result.url, new RegExp(`^${origin}/__preview/[a-f0-9]{32}/index\\.html$`));
    assert.equal(result.expiresAt, new Date(clock + 60_000).toISOString());
    const page = await fetch(result.url);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(await page.text(), runtimeFiles["index.html"]);
    assert.equal((await fetch(result.url.replace("index.html", "missing.js"))).status, 404);

    clock += 60_000;
    assert.equal((await fetch(result.url)).status, 410);
  });
});

test("生图接口校验角色与交付规格，透明主体裁切后按角色上限落盘并可通过 /generated 访问", async () => {
  const requests: Array<{ label: string; transparent?: boolean; prompt: string }> = [];
  const images: PlayerFirstImageProvider = {
    model: "gpt-image-2",
    async generateAsset(label, request) {
      requests.push({ label, transparent: request.transparent, prompt: request.prompt });
      return request.transparent ? transparentPng() : opaquePng();
    },
  };
  await withHosting({ images }, async ({ origin, generatedRoot }) => {
    const subjectDelivery = { fit: "contain", background: "transparent", purpose: "subject", safeArea: "留白" };
    const mismatch = await post(`${origin}/api/image-generation`, { prompt: "一只戴围巾的小狐狸角色", role: "background", label: "狐狸", delivery: subjectDelivery });
    assert.equal(mismatch.status, 400);
    assert.match(((await mismatch.json()) as { error: string }).error, /与 background 槽位不一致/);
    const badRole = await post(`${origin}/api/image-generation`, { prompt: "一只戴围巾的小狐狸角色", role: "villain", delivery: subjectDelivery });
    assert.equal(badRole.status, 400);
    assert.match(((await badRole.json()) as { error: string }).error, /资源角色无效/);
    assert.equal(requests.length, 0);

    const response = await post(`${origin}/api/image-generation`, { prompt: "一只戴围巾的小狐狸角色", role: "collectible", label: "狐狸", delivery: subjectDelivery });
    const result = await response.json() as { model: string; provider: string; width: number; height: number; localPath: string; publicUrl: string; processing: string[]; error?: string };
    assert.equal(response.status, 200, result.error);
    assert.equal(result.model, "gpt-image-2");
    assert.equal(result.provider, "openai");
    // 1024 透明画布里 200×200 的主体：裁切后即 200×200，低于 collectible 512 上限，不放大。
    assert.deepEqual([result.width, result.height], [200, 200]);
    assert.match(result.localPath, /^generated\/collectible-[0-9a-f-]+\.png$/);
    assert.equal(result.publicUrl, `/${result.localPath}`);
    assert.ok(result.processing.includes("transparent-trim"));
    assert.ok(existsSync(join(generatedRoot, result.localPath.slice("generated/".length))));
    assert.equal(requests[0].transparent, true);
    assert.match(requests[0].prompt, /Subject: 狐狸/);
    assert.match(requests[0].prompt, /transparent background/);

    const served = await fetch(`${origin}${result.publicUrl}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("content-type"), "image/png");
    const meta = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
    assert.deepEqual([meta.width, meta.height], [200, 200]);

    const background = await post(`${origin}/api/image-generation`, { prompt: "黄昏海边沙滩的横向游戏背景", role: "background", delivery: { fit: "cover", background: "opaque", purpose: "environment", safeArea: "中央低细节" } });
    assert.equal(background.status, 200);
    const backgroundResult = await background.json() as { width: number; height: number; processing: string[] };
    assert.deepEqual([backgroundResult.width, backgroundResult.height], [1024, 1024]);
    assert.ok(!backgroundResult.processing.includes("transparent-trim"));
    assert.equal((await fetch(`${origin}/generated/../package.json`)).status, 404);
  });
});

test("透明主体的生图结果没有真实透明像素时拒绝交付", async () => {
  const images: PlayerFirstImageProvider = { model: "gpt-image-2", generateAsset: async () => opaquePng() };
  await withHosting({ images }, async ({ origin, generatedRoot }) => {
    const response = await post(`${origin}/api/image-generation`, { prompt: "一只戴围巾的小狐狸角色", role: "player", delivery: { fit: "contain", background: "transparent", purpose: "subject", safeArea: "留白" } });
    assert.equal(response.status, 400);
    assert.match(((await response.json()) as { error: string }).error, /没有真实透明像素/);
    assert.equal(existsSync(generatedRoot), false);
  });
});

test("没有配置图像服务时以 400 说明原因且不落盘", async () => {
  await withHosting({ images: null }, async ({ origin, generatedRoot }) => {
    const response = await post(`${origin}/api/image-generation`, { prompt: "一只戴围巾的小狐狸角色", role: "player", delivery: { fit: "contain", background: "transparent", purpose: "subject", safeArea: "留白" } });
    assert.equal(response.status, 400);
    assert.match(((await response.json()) as { error: string }).error, /OPENAI_API_KEY/);
    assert.equal(existsSync(generatedRoot), false);
    assert.equal((await fetch(`${origin}/api/image-generation`)).status, 405);
  });
});
