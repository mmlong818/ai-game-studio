import { randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { readPngDimensions, type ImageOutputConstraint } from "./image-generator.js";
import { sendJson } from "./http.js";
import { gameContentSecurityPolicy, sendStaticFile } from "./static-files.js";

// 边玩边改（/player-first）页面依赖的三个接口与对应静态托管。
// 它们最初只写在 vite 开发中间件里，正式部署（API 自托管 dist-web）时全部 404；
// 这里让开发与部署走同一份实现，vite 只负责把 /generated 代理到 API。

const PROJECT_ID = /^[A-Za-z0-9_-]{3,80}$/;
const BUILD_ID = /^[A-Za-z0-9_-]{3,100}$/;
const RUNTIME_FILE = /^(index\.html|styles\.css|app\.js)$/;
const ASSET_TARGET = /^assets\/[A-Za-z0-9._-]+$/;
const GENERATED_FILE = /^[A-Za-z0-9._-]+\.png$/;
const PREVIEW_TOKEN = /^[a-f0-9]{32}$/;
const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_PREVIEW_TTL_MS = 30 * 60 * 1000;
const MAX_IMAGE_PIXELS = 20_000_000;

// 与 src/domain/assetDelivery.ts 保持一致；服务端不引入 domain 层，故在此复述合同。
const assetRoles = ["player", "background", "obstacle", "collectible", "effect", "interface"] as const;
type AssetRole = typeof assetRoles[number];
const deliverySchema = z.object({
  fit: z.enum(["cover", "contain"]),
  background: z.enum(["opaque", "transparent"]),
  purpose: z.enum(["environment", "subject", "interface"]),
  safeArea: z.string().min(1).max(240),
});
type DeliverySpec = z.infer<typeof deliverySchema>;
const expectedDelivery: Record<AssetRole, Pick<DeliverySpec, "fit" | "background" | "purpose">> = {
  background: { fit: "cover", background: "opaque", purpose: "environment" },
  interface: { fit: "contain", background: "transparent", purpose: "interface" },
  player: { fit: "contain", background: "transparent", purpose: "subject" },
  obstacle: { fit: "contain", background: "transparent", purpose: "subject" },
  collectible: { fit: "contain", background: "transparent", purpose: "subject" },
  effect: { fit: "contain", background: "transparent", purpose: "subject" },
};
// 交付像素上限，沿用 scripts/process_game_asset.py 的角色限制。
const roleLimits: Record<AssetRole, { width: number; height: number }> = {
  background: { width: 1600, height: 1200 },
  player: { width: 640, height: 640 },
  obstacle: { width: 640, height: 640 },
  collectible: { width: 512, height: 512 },
  effect: { width: 1024, height: 1024 },
  interface: { width: 768, height: 768 },
};

const imageRequestSchema = z.object({
  prompt: z.string().trim().min(8, "提示词长度必须为 8–2000 个字符").max(2000, "提示词长度必须为 8–2000 个字符"),
  role: z.enum(assetRoles, { error: "资源角色无效" }),
  label: z.string().max(120).optional(),
  delivery: deliverySchema,
});

const hostedFilesSchema = z.object({
  files: z.record(z.string(), z.string()),
  assets: z.array(z.object({ sourceName: z.string().min(1), targetPath: z.string().min(1) })).default([]),
});

export interface PlayerFirstImageProvider {
  readonly model: string;
  generateAsset(label: string, request: { prompt: string; transparent?: boolean; output: ImageOutputConstraint; resource: { file: string; label: string } }): Promise<Buffer>;
}

export interface PlayerFirstHostingOptions {
  /** 稳定网址与真机预览所在的源；生产环境应为游戏子域 PUBLIC_GAME_ORIGIN。 */
  hostedOrigin: string;
  /** 生图落盘目录（同时作为发布/预览复制资源的来源），历史约定为 public/generated。 */
  generatedRoot: string;
  /** 稳定发布落盘目录，历史约定为 .studio-data/releases。 */
  releaseRoot: string;
  /** 为 null 时 /api/image-generation 直接以 400 说明未配置，不发起任何请求。 */
  images: PlayerFirstImageProvider | null;
  previewTtlMs?: number;
  now?: () => number;
}

interface HostedPreview { expiresAt: number; files: Map<string, Buffer> }

export class PlayerFirstHosting {
  private readonly previews = new Map<string, HostedPreview>();
  private readonly previewTtlMs: number;
  private readonly now: () => number;
  private readonly hostedOrigin: string;

  constructor(private readonly options: PlayerFirstHostingOptions) {
    this.previewTtlMs = options.previewTtlMs ?? DEFAULT_PREVIEW_TTL_MS;
    this.now = options.now ?? Date.now;
    this.hostedOrigin = options.hostedOrigin.replace(/\/+$/, "");
  }

  /** POST /api/releases · /api/previews · /api/image-generation；其余路径返回 false 交给后续路由。 */
  async handleApi(request: IncomingMessage, response: ServerResponse, pathname: string): Promise<boolean> {
    if (pathname !== "/api/releases" && pathname !== "/api/previews" && pathname !== "/api/image-generation") return false;
    if (request.method !== "POST") { sendJson(response, 405, { error: "只允许 POST 请求" }); return true; }
    try {
      if (pathname === "/api/releases") sendJson(response, 200, await this.publishRelease(await readBody(request)));
      else if (pathname === "/api/previews") sendJson(response, 200, await this.createPreview(await readBody(request)));
      else sendJson(response, 200, await this.generateImage(await readBody(request), request));
    } catch (error) {
      sendJson(response, 400, { error: describe(error, "请求失败") });
    }
    return true;
  }

  /** GET /play/:projectId/:file（稳定发布）· /__preview/:token/:file · /generated/:file。 */
  async handleStatic(response: ServerResponse, pathname: string): Promise<boolean> {
    const generated = pathname.match(/^\/generated\/([^/]+)$/);
    if (generated) {
      if (!GENERATED_FILE.test(generated[1])) return false;
      return sendStaticFile(response, this.options.generatedRoot, generated[1], true);
    }
    const preview = pathname.match(/^\/__preview\/([^/]+)\/(.+)$/);
    if (preview) {
      if (!PREVIEW_TOKEN.test(preview[1])) return false;
      this.expirePreviews();
      const hosted = this.previews.get(preview[1]);
      if (!hosted) { plain(response, 410, "Preview expired"); return true; }
      const file = hosted.files.get(preview[2]);
      if (!file) { plain(response, 404, "Not found"); return true; }
      response.writeHead(200, {
        "Content-Type": mimeFor(preview[2]),
        "Cache-Control": "no-store",
        "Content-Security-Policy": gameContentSecurityPolicy(),
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(file);
      return true;
    }
    const release = pathname.match(/^\/play\/([^/]+)\/(.+)$/);
    if (release) {
      if (!PROJECT_ID.test(release[1])) return false;
      const buildId = (await this.readPointers())[release[1]];
      if (!buildId || !BUILD_ID.test(buildId)) return false;
      if (!RUNTIME_FILE.test(release[2]) && !ASSET_TARGET.test(release[2])) { plain(response, 404, "Not found"); return true; }
      response.setHeader("X-Studio-Build-Id", buildId);
      if (sendStaticFile(response, join(this.options.releaseRoot, release[1], buildId), release[2], release[2] !== "index.html")) return true;
      response.removeHeader("X-Studio-Build-Id");
      plain(response, 404, "Not found");
      return true;
    }
    return false;
  }

  private async publishRelease(body: unknown): Promise<{ url: string; buildId: string }> {
    const input = hostedFilesSchema.extend({ projectId: z.string(), buildId: z.string() }).parse(body);
    if (!PROJECT_ID.test(input.projectId)) throw new Error("项目 ID 无效");
    if (!BUILD_ID.test(input.buildId)) throw new Error("构建 ID 无效");
    const files = await this.collectRuntimeFiles(input, "正式版本");
    const releaseDir = join(this.options.releaseRoot, input.projectId, input.buildId);
    await mkdir(join(releaseDir, "assets"), { recursive: true });
    for (const [path, content] of files) await writeImmutableFile(join(releaseDir, path), content);
    const pointers = await this.readPointers();
    pointers[input.projectId] = input.buildId;
    await writeFile(this.pointerPath, JSON.stringify(pointers, null, 2));
    return { url: `${this.hostedOrigin}/play/${input.projectId}/index.html`, buildId: input.buildId };
  }

  private async createPreview(body: unknown): Promise<{ url: string; expiresAt: string }> {
    const input = hostedFilesSchema.parse(body);
    const files = await this.collectRuntimeFiles(input, "预览");
    this.expirePreviews();
    const token = randomUUID().replaceAll("-", "");
    const expiresAt = this.now() + this.previewTtlMs;
    this.previews.set(token, { expiresAt, files });
    return { url: `${this.hostedOrigin}/__preview/${token}/index.html`, expiresAt: new Date(expiresAt).toISOString() };
  }

  private async generateImage(body: unknown, request: IncomingMessage) {
    const input = imageRequestSchema.parse(body);
    const expected = expectedDelivery[input.role];
    if (input.delivery.fit !== expected.fit || input.delivery.background !== expected.background || input.delivery.purpose !== expected.purpose) {
      throw new Error(`资源交付规格与 ${input.role} 槽位不一致`);
    }
    if (!this.options.images) throw new Error("本地服务没有配置 OPENAI_API_KEY；可以写入不会提交的 .env.local 后重启服务");
    const transparent = input.delivery.background === "transparent";
    const baseName = `${input.role}-${randomUUID()}`;
    const provider = this.options.images;
    const generate = provider.generateAsset(input.label || input.role, {
      prompt: structuredPrompt(input),
      transparent,
      output: { width: 1024, height: 1024, fit: transparent ? "contain" : "cover", requireAlpha: transparent },
      resource: { file: `assets/${baseName}.png`, label: input.label || input.role },
    });
    // 浏览器放弃等待时不再落盘，但已发出的提供方请求无法追回。
    const aborted = new Promise<never>((_resolve, reject) => request.once("aborted", () => reject(new Error("请求已被客户端取消"))));
    const providerBytes = await Promise.race([generate, aborted]);
    const { bytes, width, height } = await finalizeAsset(providerBytes, input.role, transparent);
    await mkdir(this.options.generatedRoot, { recursive: true });
    await writeFile(join(this.options.generatedRoot, `${baseName}.png`), bytes, { flag: "wx" });
    return {
      model: provider.model,
      provider: "openai",
      mimeType: "image/png",
      width,
      height,
      localPath: `generated/${baseName}.png`,
      publicUrl: `/generated/${baseName}.png`,
      processing: transparent
        ? ["provider-transparent-background", "transparent-trim", `delivery-${input.delivery.fit}`, "resize-fit", "png-optimize"]
        : [`delivery-${input.delivery.fit}`, "resize-fit", "png-optimize"],
    };
  }

  private async collectRuntimeFiles(input: z.infer<typeof hostedFilesSchema>, label: string): Promise<Map<string, Buffer>> {
    if (typeof input.files["index.html"] !== "string") throw new Error(`${label}缺少 index.html`);
    const files = new Map<string, Buffer>();
    for (const [path, content] of Object.entries(input.files)) {
      if (!RUNTIME_FILE.test(path)) throw new Error(`${label}文件名无效`);
      files.set(path, Buffer.from(content));
    }
    for (const asset of input.assets) {
      if (!GENERATED_FILE.test(asset.sourceName)) throw new Error("资源文件名无效");
      if (!ASSET_TARGET.test(asset.targetPath)) throw new Error("资源目标路径无效");
      const source = resolve(this.options.generatedRoot, asset.sourceName);
      if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`资源 ${asset.sourceName} 不在生成目录中`);
      files.set(asset.targetPath, await readFile(source));
    }
    return files;
  }

  private get pointerPath() { return join(this.options.releaseRoot, "pointers.json"); }

  private async readPointers(): Promise<Record<string, string>> {
    try { return JSON.parse(await readFile(this.pointerPath, "utf8")) as Record<string, string>; }
    catch { return {}; }
  }

  private expirePreviews() {
    const now = this.now();
    for (const [token, preview] of this.previews) if (preview.expiresAt <= now) this.previews.delete(token);
  }
}

function structuredPrompt(input: z.infer<typeof imageRequestSchema>): string {
  const isBackground = input.delivery.purpose === "environment";
  return [
    "Use case: stylized-concept",
    `Asset type: browser game ${input.role} raster asset`,
    `Delivery contract: ${input.delivery.purpose}; ${input.delivery.fit}; ${input.delivery.background} background`,
    `Safe area: ${input.delivery.safeArea}`,
    `Primary request: ${input.prompt}`,
    input.label ? `Subject: ${input.label}` : "",
    isBackground
      ? "Composition/framing: seamless-looking full-frame game background, no focal character"
      : "Composition/framing: one centered subject, generous padding, fully transparent background with clean anti-aliased edges",
    "Style/medium: polished Q-style painted game art, clear silhouette, production-ready raster illustration",
    "Constraints: no text; no logos; no trademarks; no watermark; no SVG; no extra subjects",
  ].filter(Boolean).join("\n");
}

/** 透明主体裁掉四周全透明像素，再按角色上限等比缩小；背景只缩小。 */
async function finalizeAsset(bytes: Buffer, role: AssetRole, transparent: boolean): Promise<{ bytes: Buffer; width: number; height: number }> {
  const limit = roleLimits[role];
  let image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS }).ensureAlpha();
  if (transparent) {
    // 透明检查针对提供方原图：裁切后主体可能恰好填满画面，不能据此判定没有透明底。
    if (!(await readPngDimensions(bytes)).hasTransparency) throw new Error("透明主体处理后没有真实透明像素，已拒绝交付");
    // 整张都透明时 trim 会报错，保留原图交付。
    const trimmed = await image.clone().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).toBuffer().catch(() => null);
    if (trimmed) image = sharp(trimmed, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS });
  }
  const output = await image.resize(limit.width, limit.height, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const dimensions = await readPngDimensions(output);
  return { bytes: output, width: dimensions.width, height: dimensions.height };
}

async function writeImmutableFile(path: string, content: Buffer): Promise<void> {
  try {
    await writeFile(path, content, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!(await readFile(path)).equals(content)) throw new Error("同一构建 ID 的不可变文件内容不一致");
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("请求内容过大");
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("请求内容不是有效的 JSON。"); }
}

function describe(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  return error instanceof Error ? error.message.slice(0, 500) : fallback;
}

function mimeFor(path: string): string {
  const extension = path.split(".").pop();
  return extension === "html" ? "text/html; charset=utf-8"
    : extension === "css" ? "text/css; charset=utf-8"
      : extension === "js" ? "text/javascript; charset=utf-8"
        : extension === "png" ? "image/png"
          : "application/octet-stream";
}

function plain(response: ServerResponse, status: number, text: string) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  response.end(text);
}
