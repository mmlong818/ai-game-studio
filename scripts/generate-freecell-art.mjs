// 为固定游戏《空档接龙》(fixtures/freecell) 生成并切分 AI 位图美术。
// 用法:NODE_USE_ENV_PROXY=1 node scripts/generate-freecell-art.mjs [--env-file path] [--force]
// 原图存入 assets/templates/freecell-source/,切图与封面写入 fixtures/freecell/assets/,
// 溯源(prompt、sha256、字节数)写入 fixtures/freecell/_studio/DYNAMIC_ART.json 与 ART_PROVENANCE.md。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(projectRoot, "assets", "templates", "freecell-source");
const fixtureRoot = join(projectRoot, "fixtures", "freecell");
const assetRoot = join(fixtureRoot, "assets");
const studioRoot = join(fixtureRoot, "_studio");
const args = process.argv.slice(2);
const force = args.includes("--force");
const envFileArg = args.indexOf("--env-file") >= 0 ? args[args.indexOf("--env-file") + 1] : null;
const MODEL = "gpt-image-2";
const ENDPOINT = "https://api.openai.com/v1/images/generations";

function readApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  const candidates = [envFileArg, join(projectRoot, ".env.local"), resolve(projectRoot, "..", "..", "..", ".env.local")].filter(Boolean);
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const match = readFileSync(candidate, "utf8").match(/^\s*OPENAI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
    if (match?.[1]) return match[1].trim();
  }
  throw new Error("没有找到 OPENAI_API_KEY(环境变量或 .env.local)。");
}

const STYLE = "premium contemporary kawaii casual mobile-game asset art, polished hand-painted enamel and frosted glass, soft 3/4 top lighting, crisp silhouettes, sophisticated pastel palette (mint, peach, lavender, butter yellow, sky blue) with one deep navy accent, charming rather than childish.";
const NO_TEXT = "Hard constraints: no text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.";

/** @type {Array<{id:string,role:string,size:"1024x1024"|"1024x1536"|"1536x1024",transparent?:boolean,prompt:string}>} */
export const jobs = [
  {
    id: "cover",
    role: "封面",
    size: "1024x1536",
    prompt: [
      "Use case: key art cover for a browser FreeCell solitaire card game.",
      "Primary request: one vertical poster illustration. Center focus: a fanned arc of oversized playing cards floating above a soft round felt table; the cards show only large suit symbols (spade, heart, diamond, club) as glossy enamel gems, and one card is turned to show an ornate patterned back. Four small translucent glass shelves (the free cells) hover at the top, four glowing gem sockets (the foundations) at the top right, gentle sparkles and tiny star confetti.",
      `Style/medium: ${STYLE}`,
      "Composition/framing: portrait 2:3, subject centered occupying about 70% of the frame, calm gradient sky background from lavender to mint, generous margins, no border.",
      NO_TEXT,
    ].join("\n"),
  },
  {
    id: "card-back",
    role: "默认牌背",
    size: "1024x1536",
    prompt: [
      "Use case: production texture for the back of a playing card in a kawaii FreeCell solitaire game.",
      "Primary request: one full-bleed vertical playing-card back design. A deep navy field with a symmetrical ornamental lattice of tiny stars, crescent moons and four-leaf clovers in pale gold and mint enamel, a soft rounded inner frame in peach, a central round medallion with a glossy pastel star gem. Perfectly symmetrical top/bottom and left/right.",
      `Style/medium: ${STYLE}`,
      "Composition/framing: portrait 2:3, pattern fills the entire canvas edge to edge with no outer white border, no shadow, no perspective, flat front view; keep the medallion inside the central 60%.",
      NO_TEXT,
    ].join("\n"),
  },
  {
    id: "suit-atlas",
    role: "花色图集(2×2)",
    size: "1024x1024",
    transparent: true,
    prompt: [
      "Use case: production sprite atlas of the four playing-card suit symbols for a kawaii solitaire game.",
      "Primary request: one perfectly aligned 2 columns by 2 rows atlas on a fully transparent background. Top-left: spade (deep navy). Top-right: heart (coral red). Bottom-left: diamond (coral red). Bottom-right: club (deep navy). Each symbol is a glossy enamel gem with one soft highlight and a thin darker outline so it stays readable at 24 pixels.",
      `Style/medium: ${STYLE}`,
      "Composition/framing: exact 2x2 orthographic grid; cell boundaries at exactly one-half of the width and one-half of the height; each symbol centered in its cell occupying 62-70% of the cell; nothing crosses a cell boundary; no gutters, no cell backgrounds, no shadows outside the symbol.",
      NO_TEXT,
    ].join("\n"),
  },
  {
    id: "court-atlas",
    role: "人头牌图集(4×3)",
    size: "1536x1024",
    transparent: true,
    prompt: [
      "Use case: production sprite atlas of twelve court-card characters (Jack, Queen, King of each suit) for a kawaii solitaire game.",
      "Primary request: one perfectly aligned 4 columns by 3 rows atlas on a fully transparent background. Columns from left to right belong to spades (navy costume), hearts (coral costume), diamonds (peach-gold costume), clubs (forest-green costume). Row 1: young page boys with a small feather cap (Jack). Row 2: graceful queens with a small tiara and a flower (Queen). Row 3: bearded kings with a round crown and a scepter (King). Each character is a chibi bust portrait, front facing, holding or wearing a small suit-symbol gem matching its column.",
      `Style/medium: ${STYLE}`,
      "Composition/framing: exact 4x3 orthographic grid; cell boundaries at exactly one-quarter, one-half and three-quarters of the width and one-third and two-thirds of the height; each character centered in its cell occupying 60-70% of the cell; nothing crosses a cell boundary; no gutters, no cell backgrounds, no shadows outside the character.",
      NO_TEXT,
    ].join("\n"),
  },
  {
    id: "background",
    role: "局内背景",
    size: "1024x1536",
    prompt: [
      "Use case: in-game table background for a browser FreeCell solitaire game; cards and UI will be drawn on top.",
      "Primary request: a calm vertical background of a soft mint-teal felt card table seen straight from above, with a very subtle circular vignette, faint fabric grain and a gentle diffuse highlight near the top. Pure environment: no cards, no chips, no hands, no objects, no border frame.",
      `Style/medium: ${STYLE}`,
      "Composition/framing: portrait 2:3, low contrast and low saturation, very soft detail so foreground cards stay readable.",
      NO_TEXT,
    ].join("\n"),
  },
];

async function generate(job, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240_000);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        prompt: job.prompt,
        size: job.size,
        output_format: "png",
        ...(job.transparent ? { background: "transparent" } : {}),
      }),
    });
    if (!response.ok) throw new Error(`生图接口返回 ${response.status}:${(await response.text()).slice(0, 300)}`);
    const payload = await response.json();
    const encoded = payload.data?.[0]?.b64_json;
    if (!encoded) throw new Error("生图接口没有返回图像数据。");
    return Buffer.from(encoded, "base64");
  } finally {
    clearTimeout(timer);
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// 浏览器 canvas 负责裁切/缩放:项目不依赖 PIL 或 sharp,Playwright Chromium 是已安装的位图处理运行时。
async function processInBrowser(page, sourcePng, ops) {
  const dataUrl = `data:image/png;base64,${sourcePng.toString("base64")}`;
  const results = await page.evaluate(async ({ dataUrl, ops }) => {
    const image = new Image();
    await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = dataUrl; });
    return ops.map((op) => {
      const canvas = document.createElement("canvas");
      canvas.width = op.outWidth;
      canvas.height = op.outHeight;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, op.sx, op.sy, op.sw, op.sh, 0, 0, op.outWidth, op.outHeight);
      return { id: op.id, dataUrl: canvas.toDataURL("image/png") };
    });
  }, { dataUrl, ops });
  return results.map((item) => ({ id: item.id, bytes: Buffer.from(item.dataUrl.split(",")[1], "base64") }));
}

function gridOps(columns, rows, width, height, inset, outSize, ids) {
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const ops = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const side = Math.min(cellWidth, cellHeight) * (1 - inset * 2);
      const sx = column * cellWidth + (cellWidth - side) / 2;
      const sy = row * cellHeight + (cellHeight - side) / 2;
      ops.push({ id: ids[row * columns + column], sx, sy, sw: side, sh: side, outWidth: outSize, outHeight: outSize });
    }
  }
  return ops;
}

const apiKey = readApiKey();
mkdirSync(sourceRoot, { recursive: true });
mkdirSync(assetRoot, { recursive: true });
mkdirSync(studioRoot, { recursive: true });

const sources = {};
for (const job of jobs) {
  const sourcePath = join(sourceRoot, `${job.id}-source.png`);
  if (existsSync(sourcePath) && !force) {
    console.log(`已存在原图,跳过生成:${job.id}`);
  } else {
    console.log(`正在生成:${job.id}(${job.size})`);
    const bytes = await generate(job, apiKey);
    writeFileSync(sourcePath, bytes);
    console.log(`已保存原图:${sourcePath}(${bytes.length} 字节)`);
  }
  sources[job.id] = readFileSync(sourcePath);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");

const derived = [];
const write = (relative, bytes, sourceId) => {
  const target = join(fixtureRoot, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  derived.push({ file: relative, bytes: bytes.length, sha256: sha256(bytes), source: sourceId });
};

const suits = ["spade", "heart", "diamond", "club"];
const ranks = ["jack", "queen", "king"];
const courtIds = ranks.flatMap((rank) => suits.map((suit) => `${rank}-${suit}`));

write("assets/cover.png", (await processInBrowser(page, sources.cover, [{ id: "cover", sx: 0, sy: 0, sw: 1024, sh: 1536, outWidth: 1024, outHeight: 1536 }]))[0].bytes, "cover");
// 牌背按 5:7 比例居中裁切,输出 500×700,与游戏内用户上传牌背走同一尺寸。
write("assets/card-back.png", (await processInBrowser(page, sources["card-back"], [{ id: "back", sx: 12, sy: 68, sw: 1000, sh: 1400, outWidth: 500, outHeight: 700 }]))[0].bytes, "card-back");
write("assets/background.png", (await processInBrowser(page, sources.background, [{ id: "bg", sx: 0, sy: 0, sw: 1024, sh: 1536, outWidth: 512, outHeight: 768 }]))[0].bytes, "background");
for (const item of await processInBrowser(page, sources["suit-atlas"], gridOps(2, 2, 1024, 1024, 0.06, 256, suits))) {
  write(`assets/suits/${item.id}.png`, item.bytes, "suit-atlas");
}
for (const item of await processInBrowser(page, sources["court-atlas"], gridOps(4, 3, 1536, 1024, 0.04, 320, courtIds))) {
  write(`assets/courts/${item.id}.png`, item.bytes, "court-atlas");
}
await browser.close();

const generatedAt = new Date().toISOString();
const manifest = {
  schemaVersion: 2,
  model: MODEL,
  generatedAt,
  entries: derived.map((entry) => {
    const job = jobs.find((candidate) => candidate.id === entry.source);
    return { file: entry.file, role: entry.file === "assets/cover.png" ? "封面" : entry.file === "assets/background.png" ? "局内背景" : job.role, bytes: entry.bytes, prompt: job.prompt, sourceFile: `assets/templates/freecell-source/${job.id}-source.png`, sha256: entry.sha256 };
  }),
};
writeFileSync(join(studioRoot, "DYNAMIC_ART.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const lines = [
  "# 《空档接龙》AI 美术溯源",
  "",
  `生成时间:${generatedAt}  模型:${MODEL}  接口:${ENDPOINT}`,
  "",
  "所有位图均由 gpt-image-2 生成;切图、裁切与缩放由 `scripts/generate-freecell-art.mjs` 通过 Playwright Chromium canvas 完成。牌面点数由运行时以文字叠加,花色与人头来自下表切图。",
  "",
  "## 原图",
  "",
  "| 原图 | 尺寸 | 字节 | sha256 |",
  "| --- | --- | --- | --- |",
  ...jobs.map((job) => `| assets/templates/freecell-source/${job.id}-source.png | ${job.size} | ${sources[job.id].length} | ${sha256(sources[job.id])} |`),
  "",
  "## 提示词",
  "",
  ...jobs.flatMap((job) => [`### ${job.id}(${job.role})`, "", "```text", job.prompt, "```", ""]),
  "## 交付切图",
  "",
  "| 文件 | 来源原图 | 字节 | sha256 |",
  "| --- | --- | --- | --- |",
  ...derived.map((entry) => `| ${entry.file} | ${entry.source} | ${entry.bytes} | ${entry.sha256} |`),
  "",
];
writeFileSync(join(studioRoot, "ART_PROVENANCE.md"), lines.join("\n"));
console.log(`完成:${derived.length} 个交付位图,溯源已写入 ${studioRoot}`);
