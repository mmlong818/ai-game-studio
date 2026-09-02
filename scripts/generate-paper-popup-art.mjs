// 纸境 · 立体书迷宫（paper-popup）官方贴图与封面生成脚本。
// 用法：NODE_USE_ENV_PROXY=1 node scripts/generate-paper-popup-art.mjs [--env D:/path/.env.local] [--only cover,background]
// 产出：assets/starter/paper-popup/*.png 与 manifest.json（记录提示词、模型、源图与交付图 sha256）。
// 规则：所有 AI 图只作为贴图或封面使用；不生成 SVG；密钥只从环境或 .env.local 读取，不打印。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptRoot, "..");
const outputRoot = join(projectRoot, "assets", "starter", "paper-popup");
const args = process.argv.slice(2);
const argValue = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const envFile = argValue("--env") ?? join(projectRoot, ".env.local");
const only = argValue("--only")?.split(",").map((item) => item.trim()).filter(Boolean) ?? null;

function loadApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, "utf8").split(/\r?\n/).find((entry) => entry.startsWith("OPENAI_API_KEY="));
    if (line) return line.slice("OPENAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("未找到 OPENAI_API_KEY（环境变量或 .env.local）。");
}

const STYLE = "Flat-shaded low-poly papercraft pop-up book world, handmade cream paper with subtle fiber grain, visible cut paper edges, soft studio light from the upper left, calm and cozy. No text, letters, numbers, logos, watermark, UI, or human faces. Not a photo of a real book, not clay, not plastic.";

/** @type {Array<{file:string, role:string, size:"1024x1024"|"1024x1536"|"1536x1024", quality:"high"|"medium", transparent?:boolean, deliver:{width:number,height:number}, use:string, prompt:string}>} */
const plan = [
  {
    file: "cover.png", role: "封面", size: "1024x1536", quality: "high", deliver: { width: 1024, height: 1536 }, use: "lobby-cover",
    prompt: `Clean premium key art for a cozy 3D rotating-maze puzzle game set inside a pop-up storybook. One hand-sized paper diorama level stands open on the pages of a large book: layered papercraft cliffs on two levels, a small folded paper bridge that is half folded up, a folded paper staircase, a tiny paper checkpoint flag, a small lantern gate at the far end, and three glowing folded-paper stars, one of them tucked behind a paper cutout so it is only half visible. A small round paper explorer with a round hat and a paper backpack stands at the start. Fixed isometric three-quarter view, gentle tilt-shift depth of field. Palette: warm cream paper, sage green, dusty coral, ink navy, one marigold accent. 9:16 portrait composition, the diorama fills the middle 70 percent, calm empty cream paper at top and bottom with no objects. ${STYLE}`,
  },
  {
    file: "background.png", role: "局内背景", size: "1024x1024", quality: "medium", deliver: { width: 1024, height: 1024 }, use: "desk-backdrop-texture",
    prompt: `An abstract, completely empty material texture: a flat sheet of warm cream handmade paper photographed straight down, filling the entire frame edge to edge. Only paper fibers and a very faint soft warm-to-neutral light gradient from the top left to the bottom right. Absolutely nothing on the paper: no objects, no scenery, no houses, no trees, no mountains, no diorama, no folds, no creases, no shadows of objects, no vignette, no text. Extremely low contrast, calm, uniform. This is a backdrop texture that will sit underneath a 3D scene, so it must stay empty. Square 1:1.`,
  },
  {
    // 纸纹直接复用概念阶段已确认的样张（docs/concepts/paper-popup/04-paper-texture.png），只做缩放；提示词与其一致。
    file: "paper-grain.png", role: "纸纹贴图", size: "1024x1024", quality: "high", deliver: { width: 512, height: 512 }, use: "paper-surface-tile",
    sourceFile: "docs/concepts/paper-popup/04-paper-texture.png",
    prompt: "A seamless tileable texture of fine handmade cream paper with subtle fiber grain and very light cold-press texture, evenly lit with no vignette, no shadows, no folds, no creases, no edges, no text, no watermark. Neutral warm cream color, low contrast, suitable as a repeating material map for 3D papercraft surfaces. Square 1:1.",
  },
  {
    file: "decal-meadow.png", role: "印花-晨光草甸", size: "1024x1024", quality: "medium", transparent: true, deliver: { width: 512, height: 512 }, use: "chapter-decal",
    prompt: `A single round paper sticker motif for a morning meadow chapter: a cluster of flat cut-paper wildflowers in marigold and cream with sage green leaves, arranged inside a soft circle, papercraft layered look with visible cut edges. Centered, fills about 85 percent of the frame, completely transparent background, clean edges. ${STYLE}`,
  },
  {
    file: "decal-coast.png", role: "印花-海岸灯塔", size: "1024x1024", quality: "medium", transparent: true, deliver: { width: 512, height: 512 }, use: "chapter-decal",
    prompt: `A single round paper sticker motif for a coastal lighthouse chapter: stylized flat cut-paper waves in seafoam and ink navy with a tiny cream paper boat and two small paper gulls, arranged inside a soft circle, papercraft layered look with visible cut edges. Centered, fills about 85 percent of the frame, completely transparent background, clean edges. ${STYLE}`,
  },
  {
    file: "decal-market.png", role: "印花-灯笼夜市", size: "1024x1024", quality: "medium", transparent: true, deliver: { width: 512, height: 512 }, use: "chapter-decal",
    prompt: `A single round paper sticker motif for a lantern night market chapter: a string of glowing flat cut-paper lanterns in warm amber and plum on an ink navy circle with tiny paper stars, papercraft layered look with visible cut edges. Centered, fills about 85 percent of the frame, completely transparent background outside the circle, clean edges. ${STYLE}`,
  },
  {
    file: "decal-snow.png", role: "印花-雪原天文台", size: "1024x1024", quality: "medium", transparent: true, deliver: { width: 512, height: 512 }, use: "chapter-decal",
    prompt: `A single round paper sticker motif for a snowy observatory chapter: flat cut-paper snow crystals and a small paper crescent moon in ice white and pale blue with a single brass accent star, arranged inside a soft pale-blue circle, papercraft layered look with visible cut edges. Centered, fills about 85 percent of the frame, completely transparent background outside the circle, clean edges. ${STYLE}`,
  },
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function requestImage(apiKey, item) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 240_000);
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: item.prompt,
          size: item.size,
          quality: item.quality,
          output_format: "png",
          ...(item.transparent ? { background: "transparent" } : {}),
        }),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 300);
        if ((response.status === 429 || response.status >= 500) && attempt < 3) { await new Promise((r) => setTimeout(r, 4_000 * attempt)); continue; }
        throw new Error(`生图接口返回 ${response.status}：${detail}`);
      }
      const payload = await response.json();
      const encoded = payload.data?.[0]?.b64_json;
      if (!encoded) throw new Error("生图接口没有返回图像数据。");
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.subarray(0, 4).toString("hex") !== "89504e47") throw new Error("返回内容不是 PNG。");
      return bytes;
    } catch (error) {
      if (attempt < 3 && (error.name === "AbortError" || error instanceof TypeError)) continue;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("生图重试次数已用完。");
}

async function resizePng(page, bytes, width, height) {
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  const result = await page.evaluate(async ({ dataUrl, width, height }) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    if (image.naturalWidth === width && image.naturalHeight === height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, { dataUrl, width, height });
  return result ? Buffer.from(result, "base64") : bytes;
}

async function main() {
  const apiKey = loadApiKey();
  mkdirSync(join(outputRoot, "source"), { recursive: true });
  const manifestPath = join(outputRoot, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { schemaVersion: 1, purpose: "paper-popup official 3D showcase textures", model: "gpt-image-2", conceptReference: "docs/concepts/paper-popup/manifest.json", entries: [] };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const selected = plan.filter((item) => !only || only.includes(item.file.replace(".png", "")));
    const queue = [...selected];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const item = queue.shift();
        const startedAt = Date.now();
        console.log(`生成 ${item.file} …`);
        const source = item.sourceFile ? readFileSync(join(projectRoot, item.sourceFile)) : await requestImage(apiKey, item);
        writeFileSync(join(outputRoot, "source", item.file), source);
        const delivered = await resizePng(page, source, item.deliver.width, item.deliver.height);
        writeFileSync(join(outputRoot, item.file), delivered);
        const entry = {
          file: item.file, role: item.role, use: item.use, model: "gpt-image-2", quality: item.quality,
          requestedSize: item.size, transparentBackground: Boolean(item.transparent),
          source: { file: `source/${item.file}`, ...(item.sourceFile ? { copiedFrom: item.sourceFile } : {}), bytes: source.length, sha256: sha256(source) },
          delivered: { width: item.deliver.width, height: item.deliver.height, bytes: delivered.length, sha256: sha256(delivered) },
          prompt: item.prompt, generatedAt: new Date().toISOString(),
        };
        manifest.entries = [...manifest.entries.filter((existing) => existing.file !== item.file), entry];
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
        console.log(`完成 ${item.file}（${Math.round((Date.now() - startedAt) / 1000)}s，交付 ${delivered.length} 字节）`);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`已写入 ${manifestPath}`);
}

await main();
