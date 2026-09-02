import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir, networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
const allowedRoles = new Set(["player", "background", "obstacle", "collectible", "effect", "interface"]);

const execFileCancelable = (
  command: string,
  args: string[],
  request: import("node:http").IncomingMessage,
  timeout: number,
  environment?: NodeJS.ProcessEnv,
): Promise<void> => new Promise((resolvePromise, reject) => {
  const child = execFile(command, args, { timeout, windowsHide: true, maxBuffer: 1024 * 1024, env: environment }, (error) => {
    request.off("aborted", abort);
    if (error) reject(error);
    else resolvePromise();
  });
  const abort = () => child.kill();
  request.once("aborted", abort);
});

let pythonCommand: string | null = null;
const resolvePython = async (): Promise<string> => {
  if (pythonCommand) return pythonCommand;
  const candidates = [process.env.PYTHON, process.platform === "win32" ? "python" : "python3", "python"].filter(Boolean) as string[];
  for (const candidate of [...new Set(candidates)]) {
    try {
      await new Promise<void>((resolvePromise, reject) => execFile(candidate, ["--version"], { windowsHide: true }, (error) => error ? reject(error) : resolvePromise()));
      pythonCommand = candidate;
      return candidate;
    } catch { /* try the next cross-platform executable */ }
  }
  throw new Error("没有找到 Python 运行时；Windows 请安装 python，macOS/Linux 请安装 python3");
};

const localNetworkAddress = (): string | undefined =>
  Object.entries(networkInterfaces())
    .flatMap(([name, addresses]) =>
      (addresses ?? [])
        .filter((item) => item.family === "IPv4" && !item.internal)
        .map((item) => ({
          name,
          address: item.address,
          score: /wi-?fi|wlan|wireless|en0/i.test(name)
            ? 3
            : /vethernet|virtual|wsl|docker|hyper-v|vmware|vpn/i.test(name)
              ? 0
              : 2,
        })),
    )
    .sort((left, right) => right.score - left.score)[0]?.address;

const readJsonBody = async (request: import("node:http").IncomingMessage, limit: number) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > limit) throw new Error("请求内容过大");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
};

const writeImmutableFile = async (path: string, content: Buffer): Promise<void> => {
  try {
    await writeFile(path, content, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!(await readFile(path)).equals(content)) throw new Error("同一构建 ID 的不可变文件内容不一致");
  }
};

function stableReleaseHosting(): Plugin {
  const dataRoot = resolve(process.cwd(), ".studio-data", "releases");
  const pointerPath = resolve(dataRoot, "pointers.json");
  const readPointers = async (): Promise<Record<string, string>> => {
    try { return JSON.parse(await readFile(pointerPath, "utf8")) as Record<string, string>; }
    catch { return {}; }
  };
  return {
    name: "stable-release-hosting",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://local");
        if (url.pathname === "/api/releases" && request.method === "POST") {
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          try {
            const input = await readJsonBody(request, 1024 * 1024) as {
              projectId?: string; buildId?: string; files?: Record<string, string>;
              assets?: Array<{ sourceName: string; targetPath: string }>;
            };
            if (!input.projectId || !/^[A-Za-z0-9_-]{3,80}$/.test(input.projectId)) throw new Error("项目 ID 无效");
            if (!input.buildId || !/^[A-Za-z0-9_-]{3,100}$/.test(input.buildId)) throw new Error("构建 ID 无效");
            if (!input.files || typeof input.files["index.html"] !== "string") throw new Error("正式版本缺少 index.html");
            const releaseDir = resolve(dataRoot, input.projectId, input.buildId);
            await mkdir(resolve(releaseDir, "assets"), { recursive: true });
            for (const [path, content] of Object.entries(input.files)) {
              if (!/^(index\.html|styles\.css|app\.js)$/.test(path)) throw new Error("正式版本文件名无效");
              await writeImmutableFile(resolve(releaseDir, path), Buffer.from(content));
            }
            for (const asset of input.assets ?? []) {
              if (asset.sourceName !== asset.sourceName.split(/[\\/]/).pop()) throw new Error("资源文件名无效");
              if (!/^assets\/[A-Za-z0-9._-]+$/.test(asset.targetPath)) throw new Error("资源目标路径无效");
              const content = await readFile(resolve(process.cwd(), "public", "generated", asset.sourceName));
              await writeImmutableFile(resolve(releaseDir, asset.targetPath), content);
            }
            const pointers = await readPointers();
            pointers[input.projectId] = input.buildId;
            await mkdir(dataRoot, { recursive: true });
            await writeFile(pointerPath, JSON.stringify(pointers, null, 2));
            const address = server.httpServer?.address();
            const port = typeof address === "object" && address ? address.port : server.config.server.port ?? 4311;
            response.end(JSON.stringify({
              url: `http://${localNetworkAddress() ?? "127.0.0.1"}:${port}/play/${input.projectId}/index.html`,
              buildId: input.buildId,
            }));
            return;
          } catch (error) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 500) : "正式发布失败" }));
            return;
          }
        }
        const match = url.pathname.match(/^\/play\/([A-Za-z0-9_-]{3,80})\/(.+)$/);
        if (!match) return next();
        const buildId = (await readPointers())[match[1]];
        if (!buildId || !/^[A-Za-z0-9_-]{3,100}$/.test(buildId)) { response.statusCode = 404; response.end("Not published"); return; }
        const relativePath = match[2];
        if (!/^(index\.html|styles\.css|app\.js|assets\/[A-Za-z0-9._-]+)$/.test(relativePath)) { response.statusCode = 404; response.end("Not found"); return; }
        try {
          const file = await readFile(resolve(dataRoot, match[1], buildId, relativePath));
          const extension = relativePath.split(".").pop();
          response.setHeader("Content-Type", extension === "html" ? "text/html; charset=utf-8" : extension === "css" ? "text/css; charset=utf-8" : extension === "js" ? "text/javascript; charset=utf-8" : extension === "png" ? "image/png" : "application/octet-stream");
          response.setHeader("X-Studio-Build-Id", buildId);
          response.end(file);
        } catch { response.statusCode = 404; response.end("Not found"); }
      });
    },
  };
}

function localPreviewHosting(): Plugin {
  const previews = new Map<string, { expiresAt: number; files: Map<string, Buffer> }>();
  return {
    name: "local-preview-hosting",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://local");
        if (url.pathname === "/api/previews" && request.method === "POST") {
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          try {
            const input = await readJsonBody(request, 1024 * 1024) as {
              files?: Record<string, string>;
              assets?: Array<{ sourceName: string; targetPath: string }>;
            };
            if (!input.files || typeof input.files["index.html"] !== "string") {
              throw new Error("预览缺少 index.html");
            }
            const files = new Map<string, Buffer>();
            for (const [path, content] of Object.entries(input.files)) {
              if (!/^(index\.html|styles\.css|app\.js)$/.test(path)) throw new Error("预览文件名无效");
              files.set(path, Buffer.from(content));
            }
            for (const asset of input.assets ?? []) {
              if (asset.sourceName !== asset.sourceName.split(/[\\/]/).pop()) throw new Error("资源文件名无效");
              if (!/^assets\/[A-Za-z0-9._-]+$/.test(asset.targetPath)) throw new Error("资源目标路径无效");
              files.set(
                asset.targetPath,
                await readFile(resolve(process.cwd(), "public", "generated", asset.sourceName)),
              );
            }
            const token = randomUUID().replaceAll("-", "");
            const expiresAt = Date.now() + 30 * 60 * 1000;
            previews.set(token, { expiresAt, files });
            for (const [key, preview] of previews) {
              if (preview.expiresAt <= Date.now()) previews.delete(key);
            }
            const privateAddress = localNetworkAddress();
            const address = server.httpServer?.address();
            const port = typeof address === "object" && address ? address.port : server.config.server.port ?? 4311;
            response.statusCode = 200;
            response.end(JSON.stringify({
              url: `http://${privateAddress ?? "127.0.0.1"}:${port}/__preview/${token}/index.html`,
              expiresAt: new Date(expiresAt).toISOString(),
            }));
            return;
          } catch (error) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 500) : "预览创建失败" }));
            return;
          }
        }
        const match = url.pathname.match(/^\/__preview\/([a-f0-9]{32})\/(.+)$/);
        if (!match) return next();
        const preview = previews.get(match[1]);
        if (!preview || preview.expiresAt <= Date.now()) {
          response.statusCode = 410;
          response.end("Preview expired");
          return;
        }
        const path = match[2];
        const file = preview.files.get(path);
        if (!file) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }
        const extension = path.split(".").pop();
        const mime = extension === "html" ? "text/html" : extension === "css" ? "text/css" : extension === "js" ? "text/javascript" : extension === "png" ? "image/png" : "application/octet-stream";
        response.setHeader("Content-Type", `${mime}; charset=utf-8`);
        response.setHeader("X-Robots-Tag", "noindex, nofollow");
        response.end(file);
      });
    },
  };
}

function localImageGeneration(apiKey: string | undefined): Plugin {
  return {
    name: "local-image-generation",
    configureServer(server) {
      server.middlewares.use("/api/image-generation", async (request, response) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "只允许 POST 请求" }));
          return;
        }
        try {
          const input = await readJsonBody(request, 64 * 1024) as {
            prompt?: string;
            role?: string;
            label?: string;
          };
          const prompt = input.prompt?.trim() ?? "";
          const role = input.role ?? "";
          if (prompt.length < 8 || prompt.length > 2000) throw new Error("提示词长度必须为 8–2000 个字符");
          if (!allowedRoles.has(role)) throw new Error("资源角色无效");
          if (!apiKey) throw new Error("本地服务没有配置 OPENAI_API_KEY；可以写入不会提交的 .env.local 后重启服务");

          const codexRoot = process.env.CODEX_HOME || join(homedir(), ".codex");
          const imageCli = join(codexRoot, "skills", ".system", "imagegen", "scripts", "image_gen.py");
          const removeChromaCli = join(codexRoot, "skills", ".system", "imagegen", "scripts", "remove_chroma_key.py");
          const outputDir = resolve(process.cwd(), "public", "generated");
          await mkdir(outputDir, { recursive: true });
          const baseName = `${role}-${randomUUID()}`;
          const rawPath = join(outputDir, `${baseName}-raw.png`);
          const finalPath = join(outputDir, `${baseName}.png`);
          const processedPath = join(outputDir, `${baseName}-processed.png`);
          const isBackground = role === "background";
          const structuredPrompt = [
            "Use case: stylized-concept",
            `Asset type: browser game ${role} raster asset`,
            `Primary request: ${prompt}`,
            input.label ? `Subject: ${input.label}` : "",
            isBackground
              ? "Composition/framing: seamless-looking full-frame game background, no focal character"
              : "Composition/framing: one centered subject, generous padding, perfectly uniform pure green #00FF00 backdrop for chroma removal",
            "Style/medium: polished Q-style painted game art, clear silhouette, production-ready raster illustration",
            "Constraints: no text; no logos; no trademarks; no watermark; no SVG; no extra subjects",
          ].filter(Boolean).join("\n");
          const python = await resolvePython();
          await execFileCancelable(python, [
            imageCli,
            "generate",
            "--model",
            "gpt-image-2",
            "--prompt",
            structuredPrompt,
            "--quality",
            "medium",
            "--size",
            "1024x1024",
            "--out",
            isBackground ? finalPath : rawPath,
          ], request, 180_000, { ...process.env, OPENAI_API_KEY: apiKey });
          if (!isBackground) {
            await execFileCancelable(python, [
              removeChromaCli,
              "--input",
              rawPath,
              "--out",
              finalPath,
              "--key-color",
              "#00ff00",
              "--soft-matte",
              "--spill-cleanup",
              "--force",
            ], request, 60_000);
            await unlink(rawPath).catch(() => undefined);
          }
          const assetProcessor = resolve(process.cwd(), "scripts", "process_game_asset.py");
          await execFileCancelable(python, [
            assetProcessor,
            "--input", finalPath,
            "--output", processedPath,
            "--role", role,
          ], request, 60_000);
          await unlink(finalPath).catch(() => undefined);
          await rename(processedPath, finalPath);
          response.statusCode = 200;
          response.end(JSON.stringify({
            model: "gpt-image-2",
            provider: "openai",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            localPath: `generated/${baseName}.png`,
            publicUrl: `/generated/${baseName}.png`,
            processing: isBackground
              ? ["resize-fit", "png-optimize"]
              : ["chroma-key-alpha-extraction", "spill-cleanup", "transparent-trim", "resize-fit", "png-optimize"],
          }));
        } catch (error) {
          response.statusCode = 400;
          const message = error instanceof Error ? error.message : "图片生成失败";
          response.end(JSON.stringify({ error: message.slice(0, 500) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, process.cwd(), "");
  const apiKey = process.env.OPENAI_API_KEY || fileEnvironment.OPENAI_API_KEY;
  return {
    plugins: [react(), localImageGeneration(apiKey), localPreviewHosting(), stableReleaseHosting()],
    server: {
      host: "0.0.0.0",
      port: 4311,
      strictPort: false,
    },
    preview: {
      port: 4311,
    },
  };
});
