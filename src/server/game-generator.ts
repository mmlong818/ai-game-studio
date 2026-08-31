import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { z } from "zod";
import { visualStyleOptions, type ProjectDetail } from "../shared/contracts.js";
import { playTelemetryScript, safeStorageShim } from "./game-artifact.js";
import { OPENAI_TEXT_MODEL, type OpenAISettings } from "./openai-settings.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_NETWORK_ATTEMPTS = 2;
const MAX_GENERATION_ROUNDS = 3;

const moduleRoot = fileURLToPath(new URL(".", import.meta.url));
const placeholderCover = resolve(moduleRoot, "..", "..", "assets", "starter", "signal-studio", "cover.png");

// ---------- 安全扫描 ----------
// 生成代码在独立源的沙箱 iframe 里运行,但仍然静态禁止一切网络、逃逸与持久化偷渡。
const forbiddenPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bfetch\s*\(/, reason: "禁止网络请求(fetch)" },
  { pattern: /XMLHttpRequest/, reason: "禁止网络请求(XMLHttpRequest)" },
  { pattern: /WebSocket/, reason: "禁止网络连接(WebSocket)" },
  { pattern: /EventSource/, reason: "禁止网络连接(EventSource)" },
  { pattern: /sendBeacon/, reason: "禁止网络上报(sendBeacon)" },
  { pattern: /\beval\s*\(/, reason: "禁止 eval" },
  { pattern: /new\s+Function/, reason: "禁止 new Function" },
  { pattern: /\bimport\s*\(/, reason: "禁止动态 import" },
  { pattern: /<script[^>]*\bsrc\s*=/i, reason: "禁止外链脚本" },
  { pattern: /<link[^>]*\bhref\s*=/i, reason: "禁止外链样式或资源" },
  { pattern: /document\.cookie/, reason: "禁止读写 cookie" },
  { pattern: /window\.open/, reason: "禁止弹窗与导航" },
  { pattern: /location\s*\.\s*(href|assign|replace)\s*=?/, reason: "禁止页面导航" },
  { pattern: /\blocalStorage\b/, reason: "禁止直接使用 localStorage(用平台注入的 safeStorage)" },
  { pattern: /\bsessionStorage\b/, reason: "禁止 sessionStorage" },
  { pattern: /indexedDB/, reason: "禁止 indexedDB" },
  { pattern: /postMessage/, reason: "禁止跨窗口通信" },
  { pattern: /<iframe/i, reason: "禁止嵌套 iframe" },
  { pattern: /<object|<embed/i, reason: "禁止 object/embed" },
];

const THREE_MODULE_SPECIFIER = "./vendor/three.module.js";

export function scanGeneratedHtml(html: string, options: { allowThreeModule?: boolean } = {}): string[] {
  const violations = forbiddenPatterns
    .filter(({ pattern }) => pattern.test(html))
    .map(({ reason }) => reason);
  // 模块脚本与静态 import:2D 全禁;3D 只放行内联 module 脚本 + 唯一指向本地 three 的 import。
  if (/<script[^>]*type\s*=\s*["']module/i.test(html) && !options.allowThreeModule) {
    violations.push("禁止模块脚本(仅 3D 实验通道允许)");
  }
  const importSpecifiers = [
    ...[...html.matchAll(/\bimport\b[^;\n]*?\bfrom\s*["']([^"']+)["']/g)].map((match) => match[1]),
    ...[...html.matchAll(/\bimport\s*["']([^"']+)["']/g)].map((match) => match[1]),
  ];
  for (const specifier of importSpecifiers) {
    if (!options.allowThreeModule) {
      violations.push(`禁止 import(2D 通道):${specifier}`);
    } else if (specifier !== THREE_MODULE_SPECIFIER) {
      violations.push(`import 只允许本地 three 模块(${THREE_MODULE_SPECIFIER}),发现:${specifier}`);
    }
  }
  const externalUrls = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/gi)]
    .map((match) => match[0])
    .filter((url) => !url.includes("www.w3.org"));
  if (externalUrls.length > 0) violations.push(`禁止引用外部地址:${externalUrls.slice(0, 3).join("、")}`);
  return violations;
}

// ---------- 运行时契约 ----------
// 与模板游戏共用同一套平台约定,这样遥测脚本与浏览器验收无需为生成游戏另起炉灶。
function runtimeContract(is3d: boolean): string {
  return [
    "1. 状态机:document.body.dataset.gameState 只能取 idle/playing/won/lost;每次变化后必须 dispatchEvent(new CustomEvent(\"game:state-change\", { detail: { state } }))(在 window 上派发)。",
    "2. 开始与重开:idle 态必须有 id=\"start\" 的开始按钮(至少 44x44px);游戏中与结算后必须有 id=\"restart\" 的重新开始按钮,点击后回到 idle 或直接开始新局。",
    "3. 探针钩子:当 new URLSearchParams(location.search).has(\"probe\") 为真时,必须挂载 window.__GAME_DEBUG__ = { getState: () => ({ state, score, level }), forceWin: () => 立即进入 won, forceLose: () => 立即进入 lost };probe 参数不存在时绝不挂载。",
    "4. 输入:键盘与触控/指针都能完成全部操作;触控目标不小于 44x44px;禁止依赖悬停。",
    "5. 布局:必须有 <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">;在 360px 宽的手机与桌面上都不得出现横向滚动;主游戏区域使用 id=\"game-canvas\" 的 <canvas> 或等价交互区。",
    "6. 资源:全部视觉用内联 CSS/Canvas/内联 SVG/Emoji" + (is3d ? "/程序化几何与纹理" : "") + " 实现;可选用 ./assets/cover.png 与 ./assets/background.png 作装饰背景" + (is3d ? "或纹理" : "") + ",但文件缺失时页面必须依然完整可玩;禁止任何其他外部资源。",
    "7. 声音:只允许 Web Audio API 程序化合成,且必须在用户首次交互后才创建 AudioContext;禁止音频文件。",
    "8. 存档:如需记录最高分,只使用平台注入的全局 safeStorage(getItem/setItem/removeItem);禁止直接触碰 localStorage。",
    "9. 全部界面文案使用简体中文;不显示任何水印或模型名。",
    is3d
      ? "10. 代码必须是一个完整的 HTML 文档:<style> 内联全部样式,单个 <script type=\"module\"> 内联全部逻辑;唯一允许的 import 是 `import * as THREE from \"./vendor/three.module.js\";`(平台提供的本地 three.js v0.185),除此之外禁止任何 import;不使用任何构建工具语法。"
      : "10. 代码必须是一个完整的 HTML 文档:<style> 内联全部样式,单个 <script>(非 module)内联全部逻辑;不使用任何构建工具语法。",
    ...(is3d ? [
      "11. 3D 工程边界:WebGLRenderer({ antialias: true }) 并 renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));场景只用 three 原始几何(Box/Sphere/Cylinder/Plane 等)+顶点色/纯色/程序 CanvasTexture,禁止加载外部模型与纹理文件;同屏动态物体不超过 60 个,光源不超过 2 个平行光/点光+1 个环境光;监听 resize 同步相机纵横比与画布尺寸;每帧逻辑放 renderer.setAnimationLoop,页面隐藏时暂停渲染。",
      "12. 3D 操控:桌面用键盘(WASD/方向键)与鼠标;移动端必须提供 DOM 虚拟按键(方向+动作),不得依赖陀螺仪;相机跟随主角或固定俯视,主体始终可读。",
    ] : []),
  ].join("\n");
}

const answerSchema = z.object({
  html: z.string().min(500),
  design_notes: z.string(),
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["html", "design_notes"],
  properties: {
    html: { type: "string", description: "完整的单文件 HTML 游戏(<!DOCTYPE html> 开头,包含内联 style 与 script)" },
    design_notes: { type: "string", description: "实现说明:规则如何映射到代码、难度如何递进、已知取舍,不超过 400 字" },
  },
} as const;

export interface PreviousGeneration {
  html: string;
  directions: string[];
}

function buildSystemPrompt(project: ProjectDetail, iterating: boolean): string {
  const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
  const is3d = project.spec.runtimeTarget === "web-3d";
  return [
    `你是一个游戏创作平台的资深玩法程序员。平台的模板库无法承载这句创意,由你直接生成一个完整、可玩、自包含的单文件 ${is3d ? "three.js 3D" : "HTML"} 小游戏。`,
    "生成代码将在独立源的沙箱 iframe 中运行,并接受自动化验收;不满足运行时契约会被直接拒收。",
    ...(is3d ? ["注意:自动验收在软件渲染(SwiftShader)下运行,场景必须在低性能 GPU 上也能于 3 秒内出画面。"] : []),
    "== 运行时契约(逐条硬性要求) ==",
    runtimeContract(is3d),
    "== 设计合同(玩法规则的唯一依据) ==",
    JSON.stringify(project.spec.designProfile),
    `== 画面风格 ==\n${style.label}:${style.description};页面编排:${style.layout};组件语言:${style.elements};细节密度:${style.detailLabel}。`,
    `== 画幅与输入 ==\n目标画幅 ${project.spec.aspectRatio};输入方式:${project.spec.inputModes.join("、")};难度档:${project.spec.difficulty}。`,
    "== 规模边界 ==\n单人、单页、无网络、无服务端;至少 3 个逐级加压的关卡或一条明确的局内难度曲线;一局 2–8 分钟;宁可规则收窄做扎实,不可堆砌做不完的系统。",
    "== 质量底线 ==\n每个关键操作有即时视听反馈;胜负原因可读;开局有一句话目标说明;不使用 alert/confirm/prompt。",
    ...(iterating ? [
      "== 迭代模式 ==\n本次是对已上线版本的修改,不是重写:以用户消息中的上一版代码为基础,只落实修改意见与验收反馈,其余实现、手感、数值与视觉保持原样;仍然输出修改后的完整 HTML。",
    ] : []),
  ].join("\n\n");
}

function buildUserPrompt(project: ProjectDetail, feedback: string[], previous: PreviousGeneration | null): string {
  const analysis = project.spec.ideaAnalysis;
  const lines = [
    `游戏名称:${project.title}`,
    `创意描述:${project.spec.vision}`,
  ];
  if (analysis?.mechanics.length) lines.push(`已识别机制:${analysis.mechanics.join("、")}`);
  if (project.spec.hardConstraints.length) lines.push(`硬性约束:${project.spec.hardConstraints.join(";")}`);
  if (previous) {
    if (previous.directions.length) {
      lines.push("创作者对上一版的修改意见(按时间顺序,越靠后优先级越高,必须逐条落实):");
      lines.push(...previous.directions.map((item, index) => `${index + 1}. ${item}`));
    } else {
      lines.push("本次重建没有新的修改意见:按最新设计合同做必要的小幅校准即可,不要改变玩家已熟悉的实现。");
    }
    lines.push(`上一版代码(修改基础):\n${previous.html}`);
  }
  if (feedback.length) {
    lines.push("上一版代码未通过验收,必须修复以下问题后重新输出完整 HTML:");
    lines.push(...feedback.map((item, index) => `${index + 1}. ${item}`));
  }
  return lines.join("\n");
}

export interface GeneratedGame {
  html: string;
  designNotes: string;
  rounds: number;
}

interface GameCodeGeneratorOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export class GameCodeGenerator {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: GameCodeGeneratorOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * 生成通过安全扫描的完整 HTML;feedback 传入上一轮浏览器验收/规则审计的失败原因;
   * previous 传入上一版代码与修改意见时走迭代模式(增量修改而非重写)。
   * 扫描不通过会带违规原因重试,MAX_GENERATION_ROUNDS 轮后仍失败则抛错(构建失败,不静默兜底)。
   */
  async generate(project: ProjectDetail, feedback: string[] = [], previous: PreviousGeneration | null = null): Promise<GeneratedGame> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) throw new Error("实验通道需要配置 OpenAI 密钥才能生成玩法代码。");
    let pendingFeedback = [...feedback];
    let lastViolations: string[] = [];
    for (let round = 1; round <= MAX_GENERATION_ROUNDS; round += 1) {
      const answer = await this.requestGame(project, pendingFeedback, previous, apiKey);
      const violations = scanGeneratedHtml(answer.html, { allowThreeModule: project.spec.runtimeTarget === "web-3d" });
      if (violations.length === 0) {
        return { html: answer.html, designNotes: answer.design_notes.trim().slice(0, 1_000), rounds: round };
      }
      lastViolations = violations;
      pendingFeedback = [...feedback, ...violations.map((item) => `安全扫描违规:${item}`)];
    }
    throw new Error(`生成代码连续 ${MAX_GENERATION_ROUNDS} 轮未通过安全扫描:${lastViolations.join(";")}`);
  }

  private async requestGame(project: ProjectDetail, feedback: string[], previous: PreviousGeneration | null, apiKey: string): Promise<z.infer<typeof answerSchema>> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_NETWORK_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: OPENAI_TEXT_MODEL,
            messages: [
              { role: "system", content: buildSystemPrompt(project, previous !== null) },
              { role: "user", content: buildUserPrompt(project, feedback, previous) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "generated_game", strict: true, schema: responseJsonSchema },
            },
          }),
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          const detail = (await response.text().catch(() => "")).slice(0, 200);
          const error = new Error(`模型接口返回 ${response.status}。${detail}`);
          if (retryable && attempt < MAX_NETWORK_ATTEMPTS) {
            lastError = error;
            continue;
          }
          throw error;
        }
        const body = (await response.json()) as { choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }> };
        const message = body.choices?.[0]?.message;
        if (message?.refusal) throw new Error(`模型拒绝了该请求：${message.refusal.slice(0, 120)}`);
        if (!message?.content) throw new Error("模型没有返回可解析的内容。");
        return answerSchema.parse(JSON.parse(message.content));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`模型接口在 ${this.timeoutMs}ms 内没有响应。`);
          if (attempt < MAX_NETWORK_ATTEMPTS) continue;
          throw lastError;
        }
        if (attempt < MAX_NETWORK_ATTEMPTS && error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("模型接口调用失败。");
  }
}

// ---------- 产物写入 ----------
// 平台段哨兵必须是 JS 注释:它们现在包裹在 app.js 内,HTML 注释的 `<!--` 在经典脚本里
// 是历史遗留的行注释语法,会把同一行的代码(如 const safeStorage=...)整行吞掉。
const PLATFORM_BEGIN = "/* forge-platform:begin */";
const PLATFORM_END = "/* forge-platform:end */";
// 旧版单文件产物用的 HTML 注释哨兵;迭代模式读取旧产物时仍需能剥离。
const LEGACY_BEGIN = "<!-- forge-platform:begin -->";
const LEGACY_END = "<!-- forge-platform:end -->";

function platformSegment(script: string) {
  return `${PLATFORM_BEGIN}\n${script}\n${PLATFORM_END}`;
}

function stripBetween(source: string, begin: string, end: string): string {
  return source.split(begin).map((part, index) => {
    if (index === 0) return part;
    const endAt = part.indexOf(end);
    return endAt === -1 ? "" : part.slice(endAt + end.length);
  }).join("");
}

/** 剥离平台注入段(新 JS 哨兵与旧 HTML 哨兵),得到纯生成代码,用于静态复扫与迭代基础。 */
export function stripPlatformSegments(source: string): string {
  return stripBetween(stripBetween(source, PLATFORM_BEGIN, PLATFORM_END), LEGACY_BEGIN, LEGACY_END);
}

function declaresElementId(source: string, id: string) {
  const quotedId = `["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`;
  return [
    new RegExp(`(?:^|[\\s<])id\\s*=\\s*${quotedId}`),
    new RegExp(`\\.id\\s*=\\s*${quotedId}`),
    new RegExp(`setAttribute\\(\\s*["']id["']\\s*,\\s*${quotedId}`),
  ].some((pattern) => pattern.test(source));
}

const threeModuleSource = resolve(moduleRoot, "..", "..", "node_modules", "three", "build", "three.module.js");
const threeCoreSource = resolve(moduleRoot, "..", "..", "node_modules", "three", "build", "three.core.js");

export function writeGeneratedArtifact(root: string, project: ProjectDetail, generation: GeneratedGame) {
  const is3d = project.spec.runtimeTarget === "web-3d";
  mkdirSync(join(root, "assets"), { recursive: true });
  mkdirSync(join(root, "_studio"), { recursive: true });
  if (is3d) {
    if (!existsSync(threeModuleSource) || !existsSync(threeCoreSource)) throw new Error("Three.js 浏览器运行时缺失，请先安装项目依赖。");
    mkdirSync(join(root, "vendor"), { recursive: true });
    copyFileSync(threeModuleSource, join(root, "vendor", "three.module.js"));
    copyFileSync(threeCoreSource, join(root, "vendor", "three.core.js"));
  }
  // 交付源的 CSP 是 script-src 'self'; style-src 'self'——内联脚本与样式会被浏览器直接拦截,
  // 所以把生成的单文件 HTML 拆成外链三件套:index.html + styles.css + app.js。
  // app.js 内平台段(存档垫片在游戏脚本前、遥测在其后)仍用哨兵包裹,静态复扫只查生成段。
  const styleBlocks: string[] = [];
  const scriptBlocks: string[] = [];
  let markup = generation.html
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
      styleBlocks.push(css);
      return "";
    })
    .replace(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi, (_match, js: string) => {
      scriptBlocks.push(js);
      return "";
    });
  const headInjection = `<link rel="stylesheet" href="./styles.css">`;
  markup = /<head[^>]*>/i.test(markup)
    ? markup.replace(/<head[^>]*>/i, (match) => `${match}\n${headInjection}`)
    : `${headInjection}\n${markup}`;
  const scriptTag = is3d ? `<script type="module" src="./app.js"></script>` : `<script src="./app.js"></script>`;
  markup = markup.includes("</body>")
    ? markup.replace("</body>", `${scriptTag}\n</body>`)
    : `${markup}\n${scriptTag}`;
  const appScript = [
    platformSegment(safeStorageShim),
    scriptBlocks.join("\n;\n"),
    platformSegment(playTelemetryScript(project.id, project.version.id)),
  ].join("\n");
  try {
    // 语法校验:拼装(平台段+生成段)引入的语法错误在写盘前即暴露,不消耗模型修复轮次。
    // node:vm 的 Script 只支持经典脚本;3D 的 module 语法先剥掉顶层 import 声明再校验其余代码。
    const checkable = is3d
      ? appScript.replace(/^\s*import\b[^;\n]*;?\s*$/gm, "")
      : appScript;
    void new Script(checkable, { filename: "app.js" });
  } catch (error) {
    throw new Error(`生成产物 app.js 语法校验失败：${error instanceof Error ? error.message : String(error)}`);
  }
  writeFileSync(join(root, "styles.css"), styleBlocks.join("\n"), "utf8");
  writeFileSync(join(root, "app.js"), appScript, "utf8");
  const html = markup;
  writeFileSync(join(root, "index.html"), html, "utf8");
  // 封面占位:动态生图成功时会在资产步骤覆盖;失败时游戏大厅仍有可显示的封面。
  if (!existsSync(join(root, "assets", "cover.png")) && existsSync(placeholderCover)) {
    copyFileSync(placeholderCover, join(root, "assets", "cover.png"));
  }
  writeFileSync(join(root, "game-manifest.json"), JSON.stringify({
    title: project.title,
    template: "generated",
    experimental: true,
    runtimeTarget: project.spec.runtimeTarget,
    ...(is3d ? { engine: "three.js", engineVersion: "0.185.1" } : {}),
    generator: OPENAI_TEXT_MODEL,
    generationRounds: generation.rounds,
    difficulty: project.spec.difficulty,
    visualStyle: project.spec.visualStyle,
    aspectRatio: project.spec.aspectRatio,
    inputModes: project.spec.inputModes,
    generatedAt: new Date().toISOString(),
  }, null, 2), "utf8");
  const deliverable = `${html}\n${styleBlocks.join("\n")}\n${appScript}`;
  writeFileSync(join(root, "_studio", "GENERATED_CODE.json"), JSON.stringify({
    schemaVersion: 1,
    model: OPENAI_TEXT_MODEL,
    experimental: true,
    rounds: generation.rounds,
    files: ["index.html", "styles.css", "app.js"],
    bytes: Buffer.byteLength(deliverable, "utf8"),
    sha256: createHash("sha256").update(deliverable).digest("hex"),
    securityScan: "passed",
    designNotes: generation.designNotes,
    generatedAt: new Date().toISOString(),
  }, null, 2), "utf8");
}

// ---------- 静态探针 ----------
export function inspectGeneratedArtifact(root: string): string[] {
  const indexPath = join(root, "index.html");
  if (!existsSync(indexPath)) throw new Error("生成产物缺少 index.html。");
  const html = readFileSync(indexPath, "utf8");
  const appPath = join(root, "app.js");
  const stylesPath = join(root, "styles.css");
  const appScript = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
  const styles = existsSync(stylesPath) ? readFileSync(stylesPath, "utf8") : "";
  const manifestPath = join(root, "game-manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")) as { runtimeTarget?: string }
    : {};
  const is3d = manifest.runtimeTarget === "web-3d";
  // 复扫对象 = 生成段(剥离平台哨兵段)+ 样式 + 页面骨架(去掉平台注入的外链两行)。
  const markupForScan = html
    .replace('<link rel="stylesheet" href="./styles.css">', "")
    .replace('<script type="module" src="./app.js"></script>', "")
    .replace('<script src="./app.js"></script>', "");
  const generatedCode = `${markupForScan}\n${styles}\n${stripPlatformSegments(appScript)}`;
  const checks: Array<{ label: string; ok: boolean; detail: string }> = [
    { label: "外链交付结构", ok: existsSync(appPath) && existsSync(stylesPath) && !/<script(?![^>]*\bsrc)[^>]*>[\s\S]*?<\/script>/i.test(html) && !/<style/i.test(html), detail: "交付源 CSP 禁内联:index.html 必须外链 styles.css 与 app.js" },
    ...(is3d ? [{ label: "本地 3D 引擎", ok: existsSync(join(root, "vendor", "three.module.js")) && existsSync(join(root, "vendor", "three.core.js")), detail: "3D 产物缺少本地 three.js 模块" }] : []),
    { label: "运行时状态机", ok: appScript.includes("data-game-state") || appScript.includes("dataset.gameState"), detail: "缺少 data-game-state 状态机" },
    { label: "状态变化事件", ok: appScript.includes("game:state-change"), detail: "缺少 game:state-change 事件派发" },
    { label: "探针门禁", ok: appScript.includes("__GAME_DEBUG__") && appScript.includes("probe"), detail: "缺少 probe 门禁的 __GAME_DEBUG__ 钩子" },
    { label: "开始与重开控件", ok: declaresElementId(generatedCode, "start") && declaresElementId(generatedCode, "restart"), detail: "缺少可在运行时生成的 #start 或 #restart 控件" },
    { label: "移动端视口", ok: /<meta[^>]+viewport/i.test(html), detail: "缺少 viewport meta" },
    { label: "试玩遥测注入", ok: appScript.includes("/api/play-events"), detail: "平台遥测脚本未注入" },
    { label: "安全扫描", ok: scanGeneratedHtml(generatedCode, { allowThreeModule: is3d }).length === 0, detail: "复扫发现违规 API" },
    { label: "生成溯源", ok: existsSync(join(root, "_studio", "GENERATED_CODE.json")), detail: "缺少 GENERATED_CODE.json" },
    { label: "游戏清单", ok: existsSync(join(root, "game-manifest.json")), detail: "缺少 game-manifest.json" },
  ];
  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) throw new Error(`生成产物静态探针未通过:${failed.map((check) => check.detail).join(";")}`);
  return checks.map((check) => check.label);
}
