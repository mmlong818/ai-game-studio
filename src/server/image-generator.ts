import { visualStyleOptions, type GameTemplate, type ProjectDetail } from "../shared/contracts.js";
import { OPENAI_IMAGE_MODEL, type OpenAISettings } from "./openai-settings.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/images/generations";
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 2;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

// 生成图同时充当封面、拼图源图、砖阵/地面纹理,必须匹配游戏画幅。
const sizeByAspect: Record<ProjectDetail["spec"]["aspectRatio"], ImageSize> = {
  "16:9": "1536x1024",
  "4:3": "1536x1024",
  "1:1": "1024x1024",
  "9:16": "1024x1536",
};

/** 单个可动态主题化的角色位图:只收方向无关、不承担成套结构的角色,避免与规则表意冲突。 */
export interface RoleArtSpec {
  file: string;
  role: string;
  hint: string;
}

// Phase 1 的角色动态生图计划。成套块面(2048 数字块、俄罗斯方块、砖块三态)不在此列——
// 单独替换其中几张会造成同组风格断裂,整套生成属于后续阶段。
const roleArtPlan: Partial<Record<GameTemplate, RoleArtSpec[]>> = {
  snake: [
    { file: "assets/stage-c/snake-food-v2.png", role: "食物", hint: "蛇要收集的食物,单个主体、可爱诱人、轮廓清晰" },
    { file: "assets/stage-c/snake-obstacle-v2.png", role: "障碍物", hint: "致命的固定障碍物,单个主体、有明确危险感但不血腥" },
  ],
  maze: [
    { file: "assets/sprites/sprite-04.png", role: "出口目标", hint: "迷宫终点的目标物,单个主体、发光醒目、值得奔赴" },
  ],
};

export function roleArtPlanFor(template: GameTemplate): RoleArtSpec[] {
  return roleArtPlan[template] ?? [];
}

/**
 * 成套块面计划(Phase 2):同组块面必须整套生成、整套替换——任何一张失败就整套弃用,
 * 绝不允许模板块与生成块混排造成风格断裂。anchor 是整套共享的风格锚点。
 */
export interface SpriteSetSpec {
  anchor: string;
  entries: RoleArtSpec[];
}

const spriteSetPlan: Partial<Record<GameTemplate, SpriteSetSpec>> = {
  "merge-2048": {
    anchor: "这是同一套六级数字块块面中的一张:六张共用完全相同的圆角方形轮廓、材质质感、光照方向与描边语言,只随等级递增亮度、饱和度与装饰华丽度;画面中绝对不能出现数字或文字(数字由游戏运行时叠加)",
    entries: [
      { file: "assets/sprites/sprite-02.png", role: "1 级块面", hint: "六级中的第 1 级:最朴素、色彩最浅、几乎无装饰" },
      { file: "assets/sprites/sprite-03.png", role: "2 级块面", hint: "六级中的第 2 级:略微升温的色彩,一点点装饰" },
      { file: "assets/sprites/sprite-04.png", role: "3 级块面", hint: "六级中的第 3 级:中等饱和度,装饰开始清晰" },
      { file: "assets/sprites/sprite-05.png", role: "4 级块面", hint: "六级中的第 4 级:色彩明快,装饰醒目" },
      { file: "assets/sprites/sprite-06.png", role: "5 级块面", hint: "六级中的第 5 级:华丽,带柔和内发光" },
      { file: "assets/sprites/sprite-07.png", role: "6 级块面", hint: "六级中的第 6 级(最高):最华丽,明显发光与高光点缀" },
    ],
  },
};

export function spriteSetPlanFor(template: GameTemplate): SpriteSetSpec | null {
  return spriteSetPlan[template] ?? null;
}

function styleOf(project: ProjectDetail) {
  return visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
}

function themeLines(project: ProjectDetail): string[] {
  const style = styleOf(project);
  const design = project.spec.designProfile;
  return [
    `游戏名称:${project.title}。玩法类型:${design.genre}。`,
    `创意描述:${project.spec.vision}`,
    `画面风格:${style.label}——${style.description};细节密度:${style.detailLabel};题材方向:${project.spec.artStyle}。`,
    "硬性禁止:画面中不得出现任何文字、字母、数字、Logo 或水印。",
  ];
}

export function coverPrompt(project: ProjectDetail): string {
  const design = project.spec.designProfile;
  return [
    `为一款网页小游戏绘制主视觉封面插画。`,
    ...themeLines(project).slice(0, 2),
    `玩家幻想:${design.playerFantasy}`,
    ...themeLines(project).slice(2),
    "构图要求:核心玩法主体是第一视觉焦点并大致居中,背景服务主体不喧宾夺主,色彩层次分明。",
  ].join("\n");
}

function backgroundPrompt(project: ProjectDetail): string {
  return [
    `为一款网页小游戏绘制局内棋盘背后的场景背景图。`,
    ...themeLines(project),
    "构图要求:纯环境氛围图,没有前景主角、没有棋盘或界面元素;整体低对比、低饱和、细节柔和,",
    "因为棋盘、角色和交互元素会覆盖在它上面——背景绝不能喧宾夺主或干扰前景可读性。",
  ].join("\n");
}

function roleBitmapPrompt(project: ProjectDetail, spec: RoleArtSpec, setAnchor: string | null = null): string {
  const design = project.spec.designProfile;
  return [
    `为一款网页小游戏绘制一张游戏内角色位图:${spec.role}。`,
    `角色要求:${spec.hint}。`,
    ...(setAnchor ? [`成套一致性(最高优先级):${setAnchor}。`] : []),
    ...themeLines(project),
    // 设计合同承载对话修订后的最新规则(如"桂花糕改成莲子"),创意描述是最初原文;
    // 两者冲突时必须以规则语境为准,否则角色位图会退回修订前的题材。
    `规则语境(优先于创意描述,冲突时以此为准):核心循环:${design.coreLoop.join("→")};胜利:${design.winCondition};失败:${design.failCondition}。`,
    "构图要求:单一主体居中,占画面约 82%–94%,完全透明背景,边缘干净无杂色,",
    "主体在缩小到棋盘格尺寸后仍轮廓清晰可辨。",
  ].join("\n");
}

export interface DynamicArtEntry {
  file: string;
  role: string;
  bytes: Buffer;
  prompt: string;
}

interface CoverArtOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export class CoverArtGenerator {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: CoverArtOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** 返回 PNG 封面字节；没有密钥或生成失败时返回 null，由构建门禁中断本次构建。 */
  async generate(project: ProjectDetail): Promise<Buffer | null> {
    return this.tryImage("封面", {
      prompt: coverPrompt(project),
      size: sizeByAspect[project.spec.aspectRatio],
    });
  }

  /** 局内场景背景（低对比氛围图）；失败返回 null，由构建门禁中断本次构建。 */
  async generateBackground(project: ProjectDetail): Promise<Buffer | null> {
    return this.tryImage("局内背景", {
      prompt: backgroundPrompt(project),
      size: "1024x1536",
    });
  }

  /** 透明底角色位图;失败返回 null 保留模板角色。 */
  async generateRoleBitmap(project: ProjectDetail, spec: RoleArtSpec, setAnchor: string | null = null): Promise<Buffer | null> {
    return this.tryImage(`角色位图(${spec.role})`, {
      prompt: roleBitmapPrompt(project, spec, setAnchor),
      size: "1024x1024",
      transparent: true,
    });
  }

  /** 成套块面:并行生成整套;任何一张失败返回空数组(整套弃用,保持模板套装完整)。 */
  async generateSpriteSet(project: ProjectDetail): Promise<DynamicArtEntry[]> {
    if (!this.settings.getApiKey()) return [];
    const plan = spriteSetPlanFor(project.spec.template);
    if (!plan) return [];
    const results = await Promise.all(plan.entries.map(async (spec) => {
      const bytes = await this.generateRoleBitmap(project, spec, plan.anchor);
      return bytes ? { file: spec.file, role: spec.role, bytes, prompt: roleBitmapPrompt(project, spec, plan.anchor) } : null;
    }));
    if (results.some((entry) => entry === null)) {
      console.warn(`成套块面生成不完整(${results.filter(Boolean).length}/${plan.entries.length}),整套弃用以保持风格一致。`);
      return [];
    }
    return results as DynamicArtEntry[];
  }

  /**
   * 按 Phase 1 计划为整个项目生成动态美术:局内背景 + 模板允许的角色位图,全部并行。
   * 只返回成功项;prompt 一并返回供产物溯源归档。封面由调用方单独生成(拼图自传图时要跳过)。
   */
  async generateDynamicArt(project: ProjectDetail): Promise<DynamicArtEntry[]> {
    if (!this.settings.getApiKey()) return [];
    const jobs: Array<Promise<DynamicArtEntry | null>> = [
      this.generateBackground(project).then((bytes) => bytes
        ? { file: "assets/background.png", role: "局内背景", bytes, prompt: backgroundPrompt(project) }
        : null),
      ...roleArtPlanFor(project.spec.template).map((spec) =>
        this.generateRoleBitmap(project, spec).then((bytes) => bytes
          ? { file: spec.file, role: spec.role, bytes, prompt: roleBitmapPrompt(project, spec) }
          : null)),
    ];
    const [singles, spriteSet] = await Promise.all([Promise.all(jobs), this.generateSpriteSet(project)]);
    return [...singles.filter((entry): entry is DynamicArtEntry => entry !== null), ...spriteSet];
  }

  private async tryImage(label: string, request: { prompt: string; size: ImageSize; transparent?: boolean }): Promise<Buffer | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;
    try {
      return await this.requestImage(request, apiKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "生成失败。";
      console.warn(`${label} gpt-image-2 生成失败：${reason}`);
      return null;
    }
  }

  private async requestImage(request: { prompt: string; size: ImageSize; transparent?: boolean }, apiKey: string): Promise<Buffer> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
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
            model: OPENAI_IMAGE_MODEL,
            prompt: request.prompt,
            size: request.size,
            output_format: "png",
            ...(request.transparent ? { background: "transparent" } : {}),
          }),
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          const detail = (await response.text().catch(() => "")).slice(0, 200);
          const error = new Error(`生图接口返回 ${response.status}。${detail}`);
          if (retryable && attempt < MAX_ATTEMPTS) {
            lastError = error;
            continue;
          }
          throw error;
        }
        return this.parseAnswer(await response.json());
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`生图接口在 ${this.timeoutMs}ms 内没有响应。`);
          if (attempt < MAX_ATTEMPTS) continue;
          throw lastError;
        }
        if (attempt < MAX_ATTEMPTS && error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("生图接口调用失败。");
  }

  private parseAnswer(payload: unknown): Buffer {
    const body = payload as { data?: Array<{ b64_json?: string | null }> };
    const encoded = body.data?.[0]?.b64_json;
    if (!encoded) throw new Error("生图接口没有返回图像数据。");
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length < 500 || !bytes.subarray(0, 4).equals(PNG_SIGNATURE)) {
      throw new Error("生图接口返回的内容不是有效的 PNG 图像。");
    }
    return bytes;
  }
}
