import { z } from "zod";
import { getOpenSourceTemplateReference, sourceBackedTemplateIds } from "./open-source-templates.js";
import { defaultLevelProgression } from "./level-progression.js";

export const openAISettingsStatusSchema = z.object({
  provider: z.literal("openai"),
  configured: z.boolean(),
  source: z.enum(["environment", "session", "file"]).nullable(),
  models: z.object({
    text: z.literal("gpt-5.6"),
    image: z.literal("gpt-image-2"),
  }),
});

export type OpenAISettingsStatus = z.infer<typeof openAISettingsStatusSchema>;

export const dimensionSchema = z.enum(["2d", "3d"]);
export const runtimeTargetSchema = z.enum(["web-2d", "web-3d"]);
export const gameTemplateSchema = z.enum([
  "signal-hunt",
  "tetris",
  "puzzle",
  "breakout",
  "klotski",
  "maze",
  "snake",
  ...sourceBackedTemplateIds,
  // 实验通道:没有任何模板能承载玩法时,由模型直接生成独有代码(不走模板运行时)。
  "generated",
]);
export const artStyleSchema = z.enum(["auto", "geometric", "botanical", "lacquer", "ink", "garden", "jade", "playful", "dreamy", "pop"]);
export const visualStyleSchema = z.enum(["classic", "calm", "fashion", "cute", "line-art", "color-block"]);
export const difficultySchema = z.enum(["relaxed", "standard", "challenging"]);
export const gameAspectRatioSchema = z.enum(["16:9", "4:3", "1:1", "9:16"]);
export const cameraModeSchema = z.enum(["board", "fixed-stage", "follow-player", "scrolling", "orbit"]);
export const inputModeSchema = z.enum(["pointer", "drag", "swipe", "keyboard", "touch-buttons", "virtual-stick"]);
export const versionQualityStatusSchema = z.enum(["legacy", "pending", "passed", "failed"]);
export const artReviewStatusSchema = z.enum(["legacy", "pending", "passed", "failed"]);
export const visualStyleOptions = [
  {
    id: "classic", label: "经典", description: "轴线布局、衬线标题、徽章与双层描边",
    layout: "居中轴线与对称框架", elements: "窄角按钮、铭牌卡片、双层边框", detailLevel: "rich", detailLabel: "丰富细节",
  },
  {
    id: "calm", label: "沉稳", description: "宽松留白、低噪层级、柔和连续表面",
    layout: "宽留白与稳定双栏", elements: "轻圆角、细分隔、低频装饰", detailLevel: "restrained", detailLabel: "克制细节",
  },
  {
    id: "fashion", label: "时尚", description: "非对称编排、斜切构件、编辑感信息层级",
    layout: "错位标题与悬浮侧栏", elements: "斜切卡片、高对比标签、动态刻度", detailLevel: "expressive", detailLabel: "高密细节",
  },
  {
    id: "cute", label: "软萌", description: "圆润分组、胶囊控件、气泡与星点反馈",
    layout: "卡片簇与柔和分区", elements: "大圆角、胶囊按钮、漂浮小装饰", detailLevel: "playful", detailLabel: "趣味细节",
  },
  {
    id: "line-art", label: "简笔画", description: "纸面构图、手绘线框、主动减少视觉噪声",
    layout: "单线框架与草图留白", elements: "无阴影、黑线控件、少量排线", detailLevel: "minimal", detailLabel: "极简细节",
  },
  {
    id: "color-block", label: "色块", description: "模块拼接、硬边构件、粗线与错位投影",
    layout: "块面拼接与强节奏网格", elements: "直角按钮、粗边框、套色标记", detailLevel: "bold", detailLabel: "强烈细节",
  },
] as const;
export const puzzlePieceCounts = [6, 9, 12, 16, 20, 24, 30, 36, 42, 48, 50] as const;
export const puzzlePieceCountSchema = z.union([
  z.literal(6), z.literal(9), z.literal(12), z.literal(16), z.literal(20), z.literal(24),
  z.literal(30), z.literal(36), z.literal(42), z.literal(48), z.literal(50),
]);

export const projectInputSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(12, "请至少说明玩家做什么，以及怎样算完成。")
    .max(2_000, "玩法描述不能超过 2,000 个字符。"),
  title: z.string().trim().max(60, "游戏名称不能超过 60 个字符。").optional(),
  dimensions: z.enum(["auto", "2d", "3d"]).default("auto"),
  template: z.union([z.literal("auto"), gameTemplateSchema]).default("auto"),
  artStyle: artStyleSchema.default("auto"),
  visualStyle: visualStyleSchema.default("cute"),
  difficulty: difficultySchema.default("standard"),
  aspectRatio: z.union([z.literal("auto"), gameAspectRatioSchema]).default("auto"),
  cameraMode: z.union([z.literal("auto"), cameraModeSchema]).default("auto"),
  inputModes: z.array(inputModeSchema).min(1).max(6).optional(),
  puzzlePieceCount: puzzlePieceCountSchema.optional(),
  customImageDataUrl: z
    .string()
    .max(220_000, "自定义拼图图片处理后不能超过 220 KB。")
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "自定义拼图图片格式不正确。")
    .optional(),
});

export const acceptanceCriterionSchema = z.object({
  id: z.string().min(1),
  priority: z.enum(["P0", "P1"]),
  statement: z.string().min(1),
  probeType: z.enum(["state", "browser", "visual", "performance"]),
  status: z.enum(["pending", "passed", "failed", "skipped"]),
});

export const templateSourceSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  license: z.literal("MIT"),
  licenseUrl: z.string().url(),
  integrationMode: z.enum(["code-port", "architecture-adaptation"]),
  importedElements: z.array(z.string().min(1)).min(1),
  assetPolicy: z.string().min(1),
  verifiedAt: z.string().min(1),
});

export const gameDesignProfileSchema = z.object({
  genre: z.string().min(1),
  targetPlayer: z.string().min(1),
  playerFantasy: z.string().min(1),
  sessionLength: z.string().min(1),
  coreLoop: z.array(z.string().min(1)).min(3).max(6),
  winCondition: z.string().min(1),
  failCondition: z.string().min(1),
  progression: z.array(z.string().min(1)).min(1).max(6),
  difficultyCurve: z.array(z.string().min(1)).min(2).max(6),
  gameFeel: z.array(z.string().min(1)).min(2).max(8),
  onboarding: z.array(z.string().min(1)).min(2).max(6),
  accessibility: z.array(z.string().min(1)).min(2).max(6),
  productionRisks: z.array(z.string().min(1)).max(6),
});

export const levelProgressionSchema = z.object({
  levelCount: z.number().int().min(20).default(20),
  curve: z.literal("stepped").default("stepped"),
  tierSize: z.number().int().min(2).max(10).default(4),
  unlockMode: z.literal("sequential").default("sequential"),
  persistProgress: z.boolean().default(true),
});

const legacyDesignProfile = {
  genre: "未分类小游戏",
  targetPlayer: "希望快速开始并在一局内理解规则的浏览器玩家",
  playerFantasy: "通过清晰操作完成一段可验证的挑战",
  sessionLength: "2–5 分钟",
  coreLoop: ["观察当前状态", "执行主要操作", "读取反馈并调整下一步"],
  winCondition: "达到玩法合同约定的完成条件",
  failCondition: "触发玩法合同约定的失败条件",
  progression: ["通过一局内目标推进"],
  difficultyCurve: ["开局给出安全理解窗口", "中后段增加决策或操作压力"],
  gameFeel: ["输入后立即给出画面反馈", "关键成功与失败使用不同声音反馈"],
  onboarding: ["开始前说明目标", "首次可操作状态保持低压力"],
  accessibility: ["键盘与触控均可完成主要操作", "关键信息不只依赖颜色表达"],
  productionRisks: [],
};

export const ideaAnalysisSchema = z.object({
  source: z.enum(["llm", "heuristic", "heuristic-fallback"]),
  model: z.string().min(1).nullable().default(null),
  template: gameTemplateSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable().default(null),
  dimensions: dimensionSchema.nullable().default(null),
  threeMode: z.enum(["collector", "arena"]).nullable().default(null),
  mechanics: z.array(z.string().min(1).max(40)).max(12).default([]),
  hardConstraints: z.array(z.string().min(1).max(120)).max(10).default([]),
  summary: z.string().max(280).nullable().default(null),
  fallbackReason: z.string().max(280).nullable().default(null),
});
export type IdeaAnalysis = z.infer<typeof ideaAnalysisSchema>;

export const gameSpecSchema = z.object({
  schemaVersion: z.literal(1),
  presentationVersion: z.number().int().min(1).default(1),
  title: z.string().min(1).max(60),
  vision: z.string().min(1).max(280),
  dimensions: dimensionSchema,
  runtimeTarget: runtimeTargetSchema,
  perspective: z.enum([
    "ui",
    "top-down",
    "side",
    "first-person",
    "third-person",
  ]),
  template: gameTemplateSchema.default("signal-hunt"),
  templateSource: templateSourceSchema.nullable().default(null),
  designProfile: gameDesignProfileSchema.default(legacyDesignProfile),
  designSource: z.enum(["template", "llm"]).default("template"),
  levelProgression: levelProgressionSchema.default(defaultLevelProgression),
  artStyle: artStyleSchema.default("ink"),
  visualStyle: visualStyleSchema.default("classic"),
  difficulty: difficultySchema.default("standard"),
  aspectRatio: gameAspectRatioSchema.default("16:9"),
  cameraMode: cameraModeSchema.default("fixed-stage"),
  inputModes: z.array(inputModeSchema).min(1).max(6).default(["pointer", "keyboard", "touch-buttons"]),
  threeMode: z.enum(["collector", "arena"]).nullable().default(null),
  threeContract: z.object({
    cameraDistance: z.number().min(4).max(24),
    movement: z.string().min(1),
    objective: z.string().min(1),
    collision: z.string().min(1),
    levelBounds: z.string().min(1),
    performanceTiers: z.array(z.enum(["low", "medium", "high"])).length(3),
    touchScheme: z.string().min(1),
  }).nullable().default(null),
  puzzleRules: z.object({
    pieceCount: puzzlePieceCountSchema,
    allowedPieceCounts: z.array(puzzlePieceCountSchema).min(1),
    maxPieceCount: z.literal(50),
    startArrangement: z.literal("perimeter"),
    snapTolerance: z.number().min(0.08).max(0.5),
    guideOpacity: z.number().min(0).max(0.5),
  }).nullable().default(null),
  customImageDataUrl: z.string().nullable().default(null),
  mechanics: z.array(z.string().min(1)).min(1).max(12),
  controls: z.array(z.string().min(1)).min(1).max(8),
  hardConstraints: z.array(z.string().min(1)).max(10),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).min(4).max(20),
  nonGoalsForThisVersion: z.array(z.string().min(1)).max(10),
  ideaAnalysis: ideaAnalysisSchema.nullable().default(null),
});

export const projectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  idea: z.string(),
  slug: z.string(),
  dimensions: dimensionSchema,
  template: gameTemplateSchema,
  visualStyle: visualStyleSchema,
  difficulty: difficultySchema,
  aspectRatio: gameAspectRatioSchema,
  sessionLength: z.string().min(1),
  inputModes: z.array(inputModeSchema).min(1),
  status: z.enum(["contract_ready", "playable", "published"]),
  fixtureKind: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  createdAt: z.string(),
  archivedAt: z.string().nullable(),
  version: z.object({
    id: z.string(),
    number: z.number().int().positive(),
    label: z.string(),
    createdAt: z.string(),
    qualityStatus: versionQualityStatusSchema,
    qualitySummary: z.string().nullable(),
    qualityCheckedAt: z.string().nullable(),
    artReviewStatus: artReviewStatusSchema,
    artReviewSummary: z.string().nullable(),
    artReviewedAt: z.string().nullable(),
  }),
  publication: z
    .object({
      status: z.enum(["live", "offline"]),
      stableUrl: z.string().url(),
      versionUrl: z.string().url(),
      versionId: z.string(),
      versionNumber: z.number().int().positive(),
      publishedAt: z.string(),
    })
    .nullable(),
});

export const projectDetailSchema = projectSummarySchema.extend({
  spec: gameSpecSchema,
});

export const qualityCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["passed", "failed"]),
  evidence: z.string().min(1),
});

export const versionQualityReportSchema = z.object({
  status: z.enum(["passed", "failed"]),
  summary: z.string().min(1),
  checkedAt: z.string().min(1),
  checks: z.array(qualityCheckSchema).min(1),
});

export const projectVersionSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  label: z.string(),
  createdAt: z.string(),
  qualityStatus: versionQualityStatusSchema,
  qualitySummary: z.string().nullable(),
  qualityCheckedAt: z.string().nullable(),
  artReviewStatus: artReviewStatusSchema,
  artReviewSummary: z.string().nullable(),
  artReviewedAt: z.string().nullable(),
  isPublished: z.boolean(),
});

export const versionArtReviewInputSchema = z.object({
  status: z.enum(["passed", "failed"]),
  summary: z.string().trim().min(4).max(500),
});

export const projectVersionsResponseSchema = z.object({
  versions: z.array(projectVersionSchema),
});

export const projectsResponseSchema = z.object({
  projects: z.array(projectSummarySchema),
});

export const publishedGamesResponseSchema = z.object({
  games: z.array(projectSummarySchema),
});

export const playEventInputSchema = z.object({
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  playerId: z.string().regex(/^player-[0-9a-f-]{36}$/i),
  type: z.enum(["start", "complete", "fail", "exit", "resource-error"]),
  inputMode: z.enum(["keyboard", "touch", "pointer", "unknown"]).default("unknown"),
  viewport: z.string().regex(/^\d{2,5}x\d{2,5}$/),
  level: z.number().int().min(1).max(999).optional(),
  bestScore: z.number().finite().min(0).max(1_000_000_000).optional(),
  averageFps: z.number().finite().min(0).max(240).optional(),
});

export const playActivitySchema = z.object({
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  status: z.enum(["started", "completed", "failed", "exited"]),
  currentLevel: z.number().int().min(1),
  bestScore: z.number().nonnegative(),
  inputMode: z.enum(["keyboard", "touch", "pointer", "unknown"]),
  viewport: z.string(),
  averageFps: z.number().nonnegative().nullable(),
  resourceErrorCount: z.number().int().nonnegative(),
  lastPlayedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const playActivitiesResponseSchema = z.object({ activities: z.array(playActivitySchema) });

export const buildStepSchema = z.object({
  id: z.string(),
  sequence: z.number().int().nonnegative(),
  kind: z.enum(["analyze", "document", "code", "asset", "test", "delivery"]),
  title: z.string(),
  detail: z.string(),
  status: z.enum(["pending", "running", "succeeded", "failed"]),
  output: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const buildSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  runtimeTarget: runtimeTargetSchema,
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  versionId: z.string().nullable(),
  previewUrl: z.string().url().nullable(),
  error: z.string().nullable(),
  steps: z.array(buildStepSchema),
});

export const projectMessageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  createdAt: z.string(),
});

export const projectMessageInputSchema = z.object({
  content: z.string().trim().min(2, "请说明你希望修改或讨论的内容。").max(2_000, "单条消息不能超过 2,000 个字符。")
    // 客户端编码错误(如 GBK 终端)会产生替换字符;这类乱码一旦入库会持续污染后续合同修订。
    .refine((value) => !value.includes("�"), "消息包含无法解码的字符，请检查输入编码后重发。"),
});

export const projectMessagesResponseSchema = z.object({
  messages: z.array(projectMessageSchema),
});

export type ProjectInput = z.input<typeof projectInputSchema>;
type ParsedProjectInput = z.output<typeof projectInputSchema>;
export type GameTemplate = z.infer<typeof gameTemplateSchema>;
export type GameDesignProfile = z.infer<typeof gameDesignProfileSchema>;
export type VisualStyle = z.infer<typeof visualStyleSchema>;
export type GameAspectRatio = z.infer<typeof gameAspectRatioSchema>;
export type CameraMode = z.infer<typeof cameraModeSchema>;
export type InputMode = z.infer<typeof inputModeSchema>;
export type PuzzlePieceCount = z.infer<typeof puzzlePieceCountSchema>;
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type GameSpec = z.infer<typeof gameSpecSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type BuildStep = z.infer<typeof buildStepSchema>;
export type Build = z.infer<typeof buildSchema>;
export type ProjectMessage = z.infer<typeof projectMessageSchema>;
export type QualityCheck = z.infer<typeof qualityCheckSchema>;
export type VersionQualityReport = z.infer<typeof versionQualityReportSchema>;
export type ProjectVersion = z.infer<typeof projectVersionSchema>;
export type VersionArtReviewInput = z.infer<typeof versionArtReviewInputSchema>;
export type PlayEventInput = z.infer<typeof playEventInputSchema>;
export type PlayActivity = z.infer<typeof playActivitySchema>;

const mechanicSignals: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["方块堆叠与消行", ["俄罗斯方块", "消行", "堆叠方块"]],
  ["拖拽拼图", ["拼图", "滑块", "图片拼图"]],
  ["弹球与清砖", ["打砖块", "弹球", "砖块"]],
  ["华容道移块", ["华容道", "曹操", "移块"]],
  ["迷宫寻路", ["迷宫", "走迷宫", "寻路"]],
  ["贪吃蛇成长", ["贪吃蛇", "吃食物", "蛇"]],
  ["数字合成", ["2048", "数字合成", "合并数字"]],
  ["多格拼块填形", ["多格拼块", "拼块填形", "聚形拼板", "软糖拼岛"]],
  ["自由方块填阵", ["方块填阵", "三选拼块", "果冻填阵", "横竖消行"]],
  ["区域独占推理", ["区域独占", "星灵巡格", "每行每列一个", "相邻禁放"]],
  ["麻将接龙与肉鸽成长", ["麻将接龙", "麻将消除", "肉鸽麻将", "月港雀旅", "whatajong"]],
  ["三消与连锁", ["三消", "消除", "连消"]],
  ["平台跳跃", ["跳跃", "平台", "横版"]],
  ["探索与收集", ["探索", "收集", "宝藏", "寻找"]],
  ["战斗", ["战斗", "攻击", "敌人", "怪物", "射击"]],
  ["竞速", ["竞速", "赛车", "终点", "计时赛"]],
  ["经营与资源", ["经营", "建造", "商店", "资源"]],
  ["解谜", ["解谜", "机关", "谜题", "推箱子"]],
  ["叙事选择", ["剧情", "对话", "选择", "故事"]],
];

const templateSignals: ReadonlyArray<readonly [GameTemplate, readonly string[]]> = [
  ["mahjong-roguelite", ["麻将接龙", "麻将消除", "肉鸽麻将", "月港雀旅", "whatajong"]],
  ["polyomino-fit", ["多格拼块", "拼块填形", "聚形拼板", "软糖拼岛"]],
  ["block-place", ["方块填阵", "三选拼块", "果冻填阵", "横竖消行"]],
  ["region-logic", ["区域独占", "星灵巡格", "每行每列一个", "相邻禁放"]],
  ["klotski", ["华容道", "曹操"]],
  ["tetris", ["俄罗斯方块", "消行", "堆叠方块"]],
  ["breakout", ["打砖块", "弹球", "挡板", "反弹击碎"]],
  // “小青蛇吃糕越变越长”这类不含“贪吃蛇”三个字的描述曾被兜底成 signal-hunt,
  // 同义特征必须覆盖“吃了会变长/撞到自己”这一规则结构本身。
  ["snake", ["贪吃蛇", "越变越长", "越长越长", "越吃越长", "撞到自己", "咬到自己"]],
  ["maze", ["走迷宫", "迷宫"]],
  ["puzzle", ["拼图", "滑块拼图"]],
  ["merge-2048", ["2048", "数字合成", "合并数字", "滑动合并"]],
  ["space-shooter", ["太空射击", "飞船射击", "敌机", "清除波次"]],
];

const templateDefaults: Record<GameTemplate, { title: string; perspective: GameSpec["perspective"]; controls: string[]; style: GameSpec["artStyle"] }> = {
  "signal-hunt": { title: "雾港信号", perspective: "top-down", controls: ["点击或触控", "声音开关"], style: "dreamy" },
  tetris: { title: "折光堆叠", perspective: "ui", controls: ["方向键移动", "上键旋转", "触控按钮"], style: "pop" },
  puzzle: { title: "植光拼图", perspective: "ui", controls: ["拖拽拼块并吸附", "上传自定义图片"], style: "playful" },
  breakout: { title: "漆海碎星", perspective: "side", controls: ["指针或方向键移动挡板", "触控按钮"], style: "pop" },
  klotski: { title: "朱门华容", perspective: "ui", controls: ["直接拖动棋子", "方向键", "Z 撤销 / Y 重做"], style: "playful" },
  maze: { title: "苔径迷庭", perspective: "top-down", controls: ["方向键移动", "触控方向键"], style: "dreamy" },
  snake: { title: "青玉长游", perspective: "top-down", controls: ["方向键改变方向", "触控方向键"], style: "playful" },
  "merge-2048": { title: "数织矩阵", perspective: "ui", controls: ["棋盘直接滑动", "方向键或 WASD", "Z 键回溯"], style: "pop" },
  "space-shooter": { title: "星环突围", perspective: "top-down", controls: ["左右移动", "持续射击", "触控按钮"], style: "pop" },
  "polyomino-fit": { title: "软糖拼岛", perspective: "ui", controls: ["选择与放置", "旋转", "提示与撤销"], style: "playful" },
  "block-place": { title: "果冻填阵", perspective: "ui", controls: ["选择拼块", "点击棋盘放置", "提示"], style: "playful" },
  "region-logic": { title: "星灵巡格", perspective: "ui", controls: ["放置星灵", "标记排除格", "提示与撤销"], style: "dreamy" },
  "mahjong-roguelite": { title: "月港雀旅", perspective: "ui", controls: ["选择自由牌配对", "提示与洗牌", "撤销", "局间选择遗物"], style: "playful" },
  generated: { title: "自由创想", perspective: "ui", controls: ["点击或触控", "键盘"], style: "dreamy" },
};

const modernVisualStyles: Record<GameTemplate, VisualStyle> = {
  "signal-hunt": "cute",
  tetris: "cute",
  puzzle: "cute",
  breakout: "fashion",
  klotski: "cute",
  maze: "cute",
  snake: "cute",
  "merge-2048": "color-block",
  "space-shooter": "fashion",
  "polyomino-fit": "cute",
  "block-place": "color-block",
  "region-logic": "cute",
  "mahjong-roguelite": "cute",
  generated: "cute",
};

export function recommendedArtStyle(template: GameTemplate): GameSpec["artStyle"] {
  return templateDefaults[template].style;
}

export function recommendedModernVisualStyle(template: GameTemplate): VisualStyle {
  return modernVisualStyles[template];
}

function includesAny(text: string, signals: readonly string[]) {
  return signals.some((signal) => text.includes(signal));
}

function inferDimensions(input: Pick<ParsedProjectInput, "idea" | "dimensions">) {
  if (input.dimensions !== "auto") return input.dimensions;
  return includesAny(input.idea.toLowerCase(), ["3d", "3D", "第一人称", "第三人称"])
    ? "3d"
    : "2d";
}

export function recommendedAspectRatio(template: GameTemplate, dimensions: "auto" | "2d" | "3d" = "2d"): GameAspectRatio {
  void template;
  void dimensions;
  return "9:16";
}

export function recommendedCameraMode(template: GameTemplate, dimensions: "2d" | "3d"): CameraMode {
  if (dimensions === "3d") return template === "signal-hunt" ? "follow-player" : "orbit";
  if (template === "space-shooter") return "scrolling";
  if (["tetris", "puzzle", "klotski", "maze", "snake", "merge-2048", "polyomino-fit", "block-place", "region-logic", "mahjong-roguelite"].includes(template)) return "board";
  return "fixed-stage";
}

export function recommendedInputModes(template: GameTemplate, dimensions: "2d" | "3d"): InputMode[] {
  if (dimensions === "3d") return ["keyboard", "virtual-stick"];
  if (template === "puzzle") return ["drag", "pointer", "keyboard"];
  if (template === "klotski") return ["drag", "pointer", "keyboard"];
  if (template === "merge-2048") return ["swipe", "keyboard"];
  if (template === "space-shooter") return ["drag", "keyboard", "touch-buttons"];
  if (["tetris", "merge-2048", "maze", "snake"].includes(template)) return ["swipe", "keyboard", "touch-buttons"];
  return ["pointer", "keyboard", "touch-buttons"];
}

export function inferGameTemplate(input: Pick<ParsedProjectInput, "idea" | "template" | "dimensions">): GameTemplate {
  if (input.template !== "auto") return input.template;
  if (inferDimensions(input) === "2d" && includesAny(input.idea, ["平台跳跃", "横版跳跃", "跳过障碍"])) return "generated";
  return templateSignals.find(([, signals]) => includesAny(input.idea, signals))?.[0] ?? "signal-hunt";
}

function inferPerspective(idea: string, dimensions: "2d" | "3d", template: GameTemplate): GameSpec["perspective"] {
  if (idea.includes("第一人称")) return "first-person";
  if (idea.includes("第三人称")) return "third-person";
  if (includesAny(idea, ["横版", "平台跳跃", "侧视"])) return "side";
  if (includesAny(idea, ["俯视", "塔防", "上帝视角"])) return "top-down";
  return dimensions === "3d" ? "third-person" : templateDefaults[template].perspective;
}

function inferMechanics(idea: string) {
  const positiveIdea = idea.replace(/(?:不能|不要|无法|不允许)攻击[^，。！？；\n]*/g, "");
  const mechanics = mechanicSignals
    .filter(([, signals]) => includesAny(positiveIdea, signals))
    .map(([mechanic]) => mechanic);
  return mechanics.length > 0 ? mechanics : ["核心循环待细化"];
}

function inferHardConstraints(idea: string) {
  const constraintSignals = ["必须", "只能", "不能", "不要", "需要", "支持"];
  return idea
    .split(/[。！？；\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && includesAny(part, constraintSignals))
    .slice(0, 10);
}

function deriveTitle(input: ParsedProjectInput) {
  if (input.title) return input.title;
  const template = inferGameTemplate(input);
  if (/^(做|制作|生成|来|我想|创建)/.test(input.idea.trim())) return templateDefaults[template].title;
  const firstClause = input.idea.split(/[，。！？；\n]/)[0]?.trim() ?? "未命名游戏";
  return firstClause.length > 18 ? `${firstClause.slice(0, 18)}…` : firstClause;
}

function createAcceptance(dimensions: "2d" | "3d", visualStyle: ParsedProjectInput["visualStyle"]): AcceptanceCriterion[] {
  const style = visualStyleOptions.find((option) => option.id === visualStyle)!;
  const criteria: AcceptanceCriterion[] = [
    { id: "AC-LOAD", priority: "P0", statement: "游戏可以完成首次加载并进入可操作状态", probeType: "browser", status: "pending" },
    { id: "AC-INPUT", priority: "P0", statement: "主要输入在桌面和目标手机画幅可操作", probeType: "browser", status: "pending" },
    { id: "AC-LOOP", priority: "P0", statement: "核心循环至少能够完整执行一次", probeType: "state", status: "pending" },
    { id: "AC-END", priority: "P0", statement: "胜负或完成条件能够被触发并正确显示", probeType: "state", status: "pending" },
    { id: "AC-RESTART", priority: "P0", statement: "重开会清理旧状态并开始新一局", probeType: "state", status: "pending" },
    { id: "AC-CONSOLE", priority: "P0", statement: "完整流程没有未处理控制台错误", probeType: "browser", status: "pending" },
    { id: "AC-STYLE", priority: "P0", statement: `“${style.label}”必须同时改变页面编排、组件造型、字体层级、装饰密度、画布细节与反馈动效，不能只换配色`, probeType: "visual", status: "pending" },
    { id: "AC-FOCAL", priority: "P0", statement: "玩家角色、主要目标或核心棋盘必须成为第一视觉焦点，不能被背景、装饰或界面面板淹没", probeType: "visual", status: "pending" },
    { id: "AC-FEEDBACK", priority: "P1", statement: "关键操作、受击或错误、成功与失败都有可区分的即时反馈", probeType: "visual", status: "pending" },
    { id: "AC-PACING", priority: "P1", statement: "所选难度会改变真实规则参数，并形成可感知的局内压力曲线", probeType: "state", status: "pending" },
    { id: "AC-ASPECT", priority: "P0", statement: "游戏画布、关卡视野与触控布局必须按玩法合同中的目标比例设计，不能统一强制为方形", probeType: "visual", status: "pending" },
    { id: "AC-CAMERA", priority: "P0", statement: "镜头策略必须与玩法和目标画幅匹配，主体不能因全景缩放而失去可读性", probeType: "visual", status: "pending" },
    { id: "AC-STATE", priority: "P0", statement: "等待、游玩、关卡完成、胜利、失败与重开状态必须锁定正确的输入范围", probeType: "state", status: "pending" },
  ];
  if (dimensions === "3d") {
    criteria.push({
      id: "AC-3D-PERF",
      priority: "P0",
      statement: "目标设备达到场景约定的加载和帧率预算",
      probeType: "performance",
      status: "pending",
    });
  }
  return criteria;
}

function createPuzzleRules(input: ParsedProjectInput, template: GameTemplate) {
  if (template !== "puzzle") return null;
  const difficultyDefaults = {
    relaxed: { pieceCount: 9, snapTolerance: 0.38, guideOpacity: 0.28 },
    standard: { pieceCount: 20, snapTolerance: 0.26, guideOpacity: 0.14 },
    challenging: { pieceCount: 42, snapTolerance: 0.16, guideOpacity: 0.06 },
  } as const;
  const defaults = difficultyDefaults[input.difficulty];
  return {
    pieceCount: input.puzzlePieceCount ?? defaults.pieceCount,
    allowedPieceCounts: [...puzzlePieceCounts],
    maxPieceCount: 50 as const,
    startArrangement: "perimeter" as const,
    snapTolerance: defaults.snapTolerance,
    guideOpacity: defaults.guideOpacity,
  };
}

function createHardConstraints(input: ParsedProjectInput, template: GameTemplate, analysis: IdeaAnalysis | null = null) {
  const inferred = analysis && analysis.hardConstraints.length > 0 ? analysis.hardConstraints : inferHardConstraints(input.idea);
  const visualStyle = visualStyleOptions.find((option) => option.id === input.visualStyle)!;
  const visualConstraint = `必须以“${visualStyle.label}”视觉风格统一改变页面编排、组件造型、字体层级、${visualStyle.detailLabel}、画布细节与反馈，不能只换配色`;
  if (template !== "puzzle") return [visualConstraint, ...inferred].slice(0, 10);
  return [
    visualConstraint,
    "拼图块数量必须从允许档位中选择且不得超过 50 块",
    "每局开始时所有拼图块必须排布在中央目标画板外围",
    "难度必须同时影响默认块数、吸附范围和参考原图透明度",
    ...inferred,
  ].slice(0, 10);
}

const designBlueprints: Record<GameTemplate, Omit<z.infer<typeof gameDesignProfileSchema>, "difficultyCurve">> = {
  "signal-hunt": {
    genre: "限时反应与搜寻",
    targetPlayer: "希望在一分钟内理解规则、完成短局挑战的玩家",
    playerFantasy: "像监听员一样在雾港中重建一条失联的信号链路",
    sessionLength: "30–60 秒",
    coreLoop: ["观察信号出现位置", "快速点击捕获", "读取声光反馈", "在倒计时内完成目标"],
    winCondition: "倒计时结束前捕获全部信号",
    failCondition: "时间耗尽时仍有信号未被捕获",
    progression: ["信号位置持续变化", "临近结束时加强时间压力"],
    gameFeel: ["捕获动作即时发光并发声", "最后十秒使用明确警示", "胜负状态冻结输入避免误操作"],
    onboarding: ["开始卡片直接说明数量和时限", "首个目标出现位置保持清晰"],
    accessibility: ["目标具备高对比轮廓和键盘焦点", "声音可以关闭且不影响胜负判断"],
    productionRisks: ["移动目标不能出现在小屏遮挡区"],
  },
  tetris: {
    genre: "落块消行",
    targetPlayer: "熟悉经典规则、希望得到短局技巧挑战的玩家",
    playerFantasy: "在结构失稳前把不断落下的光块组织成完整横线",
    sessionLength: "3–8 分钟",
    coreLoop: ["预判落点", "移动或旋转方块", "完成横线消除", "为下一块保留空间"],
    winCondition: "完成当前难度要求的目标消行数",
    failCondition: "新方块无法进入棋盘",
    progression: ["消行数持续累积", "落块速度随难度提高"],
    gameFeel: ["旋转和硬降有独立反馈", "消行形成明显节奏停顿", "危险高度通过对比增强"],
    onboarding: ["开局展示移动、旋转和硬降", "前几个方块使用较缓落速"],
    accessibility: ["键盘和触控均提供全部动作", "方块使用轮廓与颜色共同区分"],
    productionRisks: ["旋转贴墙判定必须稳定", "移动端控制不能遮挡棋盘"],
  },
  puzzle: {
    genre: "经典自由拼图",
    targetPlayer: "希望使用个人照片或艺术图片进行舒缓解谜的玩家",
    playerFantasy: "从散落在画板外围的真实拼块中逐步恢复完整图像",
    sessionLength: "3–15 分钟",
    coreLoop: ["观察图像与拼块边缘", "从外围选择拼块", "拖到目标区域", "吸附确认并继续还原"],
    winCondition: "所有拼块都吸附到正确位置",
    failCondition: "无强制失败；玩家可以重开或调整块数",
    progression: ["已归位拼块持续减少搜索空间", "玩家可以在 6–50 块间改变复杂度"],
    gameFeel: ["拼块拖动保持一比一跟手", "接近正确位置时产生明确吸附", "最后一块完成时使用完整画面和庆祝声"],
    onboarding: ["开局说明外围排布与吸附规则", "参考底图强度随难度变化"],
    accessibility: ["自定义图片自动适配横竖比例", "关键状态同时使用位置、轮廓和声音表达"],
    productionRisks: ["高块数下必须保持触控命中面积", "用户图片需要在浏览器边界完成格式和大小校验"],
  },
  breakout: {
    genre: "反弹清砖",
    targetPlayer: "喜欢短局动作反馈和路线预判的休闲玩家",
    playerFantasy: "控制一块稳定挡板，把光球持续送回砖阵并清空场面",
    sessionLength: "2–6 分钟",
    coreLoop: ["判断光球落点", "移动挡板接球", "连续清砖积累炸弹", "下一次清砖触发十字爆炸"],
    winCondition: "清除全部砖块",
    failCondition: "光球越过挡板底部",
    progression: ["二十关使用二十种不同砖阵", "难度通过阵型、砖块耐久、球速和挡板宽度组合控制"],
    gameFeel: ["挡板接球改变水平角度", "每次击砖有短促声音", "炸弹使用明确的上下左右十字爆炸反馈"],
    onboarding: ["开局直接指出挡板和清砖目标", "说明连续消除三块会获得一次自动爆炸"],
    accessibility: ["支持指针、键盘和触控", "球、挡板和砖块保持亮度差"],
    productionRisks: ["高速球不能穿过薄砖或挡板", "十字爆炸不能越过相邻格或误伤斜角"],
  },
  klotski: {
    genre: "滑块逻辑解谜",
    targetPlayer: "偏好低压力、可反复推演空间关系的玩家",
    playerFantasy: "在有限棋盘里腾挪木块，为主将打开唯一出口",
    sessionLength: "5–20 分钟",
    coreLoop: ["选择木块", "判断可移动方向", "执行一步腾挪", "评估出口空间"],
    winCondition: "将曹操移动到棋盘底部中央出口",
    failCondition: "无强制失败；步数用于自我优化",
    progression: ["每一步改变后续可用空间", "完成后以步数支持重复挑战"],
    gameFeel: ["选择态和不可移动态清晰区分", "移动以整格动画和木质声音确认", "到达出口立即结束计步"],
    onboarding: ["高亮主将与出口", "第一次选择后显示可用方向"],
    accessibility: ["按钮操作不依赖精细拖拽", "木块使用尺寸、标签与颜色共同区分"],
    productionRisks: ["棋盘布局必须保证可解"],
  },
  maze: {
    genre: "程序迷宫寻路",
    targetPlayer: "喜欢短局探索和路线记忆的玩家",
    playerFantasy: "穿过每局重新生长的庭园，找到远端灯火",
    sessionLength: "1–5 分钟",
    coreLoop: ["观察相邻通路", "移动到下一格", "修正错误路线", "抵达出口"],
    winCondition: "从入口抵达右下角出口",
    failCondition: "无强制失败；步数记录路线效率",
    progression: ["探索逐步建立空间记忆", "难度通过迷宫规模、环路数量和岔口密度共同变化"],
    gameFeel: ["每步移动有格点反馈", "入口、玩家和出口具有稳定视觉层级", "岔口与环路提供真正的路线选择"],
    onboarding: ["入口和出口在开始前可见", "四向操作与墙体碰撞即时反馈", "开局明确说明每关包含多条可选路线"],
    accessibility: ["键盘和触控方向键等价", "路径与墙体保持充分明度差"],
    productionRisks: ["随机生成必须保证入口到出口连通", "不能只生成唯一通路；至少需要一条可绕行的替代路线"],
  },
  snake: {
    genre: "持续移动与收集",
    targetPlayer: "喜欢逐步提速、风险不断累积的街机玩家",
    playerFantasy: "引导不断生长的玉蛇穿过花园并保持完整",
    sessionLength: "2–7 分钟",
    coreLoop: ["预判蛇头方向", "转向收集朱果", "身体增长", "在更小安全空间中继续移动"],
    winCondition: "收集当前难度要求的全部朱果",
    failCondition: "撞到边界或自身",
    progression: ["身体长度持续增加", "难度同时改变速度和目标数量"],
    gameFeel: ["逻辑仍按格点推进，但画面使用逐帧插值连续移动", "转向只在格点生效避免输入抖动", "收集和失败声音明确区分", "蛇头与身体层级清晰"],
    onboarding: ["开局给出直线路径和明显首个目标", "禁止直接反向并保持规则可预测"],
    accessibility: ["键盘和触控均支持四向输入", "食物使用形状和亮度与身体区分"],
    productionRisks: ["快速连续转向不能造成自相交误判", "刷新节奏不能依赖容易抖动的固定间隔定时器"],
  },
  "merge-2048": {
    genre: "滑动数字合成",
    targetPlayer: "偏好短回合规划、追求高阶合成的益智玩家",
    playerFantasy: "用有限棋盘把分散数字组织成越来越高的单一数值",
    sessionLength: "3–12 分钟",
    coreLoop: ["观察空位与相同数字", "选择一个整体滑动方向", "合并同值数字", "为新数字块预留空间"],
    winCondition: "合成当前难度指定的目标数字",
    failCondition: "棋盘填满且四个方向都不能产生移动或合并",
    progression: ["二十个独立开局分为五章，逐步加入角落、空位、连并、预告、限步和零回溯任务", "最终关合成 2048 后可继续无尽模式"],
    gameFeel: ["数字块在 168ms 内连续滑向目标格，合并与新生分别反馈", "无效移动只产生轻微回弹且绝不生成新块", "下一块预告靠近棋盘并在生成后更新"],
    onboarding: ["第一关在棋盘下方只显示一次滑动提示", "开局保持低密度，随后用不同初始局面教学角落与空位"],
    accessibility: ["手机直接滑动棋盘，桌面使用方向键或 WASD，Z 键和回溯按钮等价", "数字文本始终提供并维持高对比，不只依赖色块"],
    productionRisks: ["一次移动中每个数字块最多合并一次；2、2、2、2 必须得到 4、4", "动画期间只允许缓存一个方向，存档必须保留棋盘、下一块和随机状态"],
  },
  "space-shooter": {
    genre: "俯视街机射击",
    targetPlayer: "喜欢短局弹幕、清晰波次、主动防御和高分复玩的玩家",
    playerFantasy: "选择自己的星环战机，在三波编队与守关者之间打穿一条跃迁航道",
    sessionLength: "2–6 分钟",
    coreLoop: ["读取预警与编队", "移动规避并持续射击", "擦弹积蓄脉冲", "在弹幕高压时释放脉冲", "完成三波与守关目标"],
    winCondition: "完成三波敌机编队并击破精英或守关者",
    failCondition: "生命值降为零",
    progression: ["二十关分为五章，每关三波，每章第四关出现分阶段守关者", "侦察、摆翼、冲锋、炮台和护盾编队逐章组合", "三种机体用射速、耐久、追随与脉冲形成不同打法"],
    gameFeel: ["玩家弹使用青白核心和短尾迹，敌弹使用暖色实心轮廓，二者不依赖颜色单独识别", "网页端鼠标悬停跟随，手机端按住拖动，飞船平滑追随而不瞬移", "顶部薄 HUD 只显示能量、波次、得分和 Boss 血量", "击破、护盾破裂、脉冲清弹、受击和 Boss 转阶段都有不同的声音与画面反馈"],
    onboarding: ["第一关先出现有完整入口预警的侦察机编队", "默认持续射击，让玩家先专注移动", "脉冲首次充满时只提示一次，并提供独立大触控目标"],
    accessibility: ["鼠标、四向键和按压拖动均可移动，默认持续射击", "Space、F 与触控按钮等价释放脉冲", "弹体、敌机、预警和掉落使用形状、亮度、动势与颜色共同表达"],
    productionRisks: ["弹体、敌机和粒子离屏后必须回收并限制上限", "低帧率下高速冲锋机和弹体不能穿透", "触控能力按钮不能被解释为移动指令"],
  },
  "polyomino-fit": {
    genre: "多格拼块填形",
    targetPlayer: "喜欢短局空间推理、希望触控操作宽容明确的玩家",
    playerFantasy: "旋转并安放软糖岛块，让散落构件严丝合缝地填满目标轮廓",
    sessionLength: "2–8 分钟",
    coreLoop: ["观察目标轮廓", "选择并旋转拼块", "尝试合法落点", "填满全部目标格"],
    winCondition: "所有原创拼块无重叠地覆盖全部目标格",
    failCondition: "无强制失败；可以撤销、提示或重新开始",
    progression: ["拼块数量与相似度增加", "目标轮廓产生更多凹槽并收紧吸附距离"],
    gameFeel: ["下方候选拼块使用大尺寸卡槽，点击拼块本身即可选择并旋转", "上方目标轮廓从首关起就具有凹凸转折和至少四块组合结构", "落点合法性即时预览", "吸附后播放短促弹性反馈", "完成时由最后落点扩散庆祝效果"],
    onboarding: ["第一局使用三块和宽松吸附", "选中拼块后突出旋转与目标覆盖方式"],
    accessibility: ["点击放置不要求精确拖拽", "颜色之外同时使用纹理和轮廓区分拼块"],
    productionRisks: ["所有关卡必须保留可验证解", "旋转后触控锚点不能发生跳跃"],
  },
  "block-place": {
    genre: "自由方块填阵",
    targetPlayer: "喜欢无倒计时规划、追求连续消行和高分的休闲玩家",
    playerFantasy: "把三组果冻拼块排进有限棋盘，用连续横竖消除维持空间",
    sessionLength: "3–12 分钟",
    coreLoop: ["观察三个候选拼块", "规划放置顺序", "完成横行或竖列", "用连击腾出新空间"],
    winCondition: "达到当前难度的目标分数",
    failCondition: "剩余候选拼块全部没有合法落点",
    progression: ["每组三块使用后刷新", "棋盘密度和形状风险持续增加"],
    gameFeel: ["三枚候选使用统一浅色底座和扁平编号卡槽，选中态用结构与描边表达而不是堆叠发光边框", "绿色拼块使用浅薄荷底板与深绿色轮廓，确保在暗色游戏背景上可辨认", "选择与放置保持立即响应", "交叉消除有方向明确的扩散反馈", "连击通过粒子和得分飞字强化"],
    onboarding: ["首组三块可以自然完成一条横线", "棋盘预览明确区分合法与非法落点"],
    accessibility: ["点击选择和点击放置适合单指操作", "拼块通过材质、轮廓和颜色共同区分"],
    productionRisks: ["交叉格只能清除一次", "只要任一候选可放就不能误判结束"],
  },
  "region-logic": {
    genre: "区域独占逻辑",
    targetPlayer: "喜欢逐步排除、无时间压力或轻量每日挑战的逻辑玩家",
    playerFantasy: "通过行列、区域与相邻关系推理出星灵唯一驻留位置",
    sessionLength: "3–15 分钟",
    coreLoop: ["观察区域边界", "标记不可能格", "放置星灵", "利用自动排除继续推理"],
    winCondition: "每行、每列和每个区域均达到本关规定星数，且任意两颗星互不相邻",
    failCondition: "标准模式不以生命耗尽强制失败；直接冲突会阻止落子，逻辑死路由可解释提示和撤销修正",
    progression: ["第 1–12 关从 6×6 一星逐步推进到 8×8 一星", "第 13–20 关进入 10×10 双星规则，并以反证和复合约束延长推理链"],
    gameFeel: ["单击循环、星星和排除三种输入方式兼容不同熟练度", "手动标记与规则自动排除来源清晰", "冲突在格内反馈而不弹出遮挡窗口", "完成时星灵连成庆祝轨迹"],
    onboarding: ["首章分步解释配额与相邻禁放", "默认开启自动排除降低重复操作", "提示只解释下一步理由而不直接亮出答案"],
    accessibility: ["循环、星星、排除、撤销、重做和推理都有文字按钮与键盘操作", "区域同时使用边界、纹理和色相表达", "刷新页面可恢复当前关卡"],
    productionRisks: ["每题必须验证区域连通、唯一解和人工规则可推理", "20 关布局签名必须去重", "不得把求解器答案数组作为普通提示来源"],
  },
  generated: {
    genre: "AI 生成的实验玩法",
    targetPlayer: "愿意尝鲜、对新玩法宽容度较高的玩家",
    playerFantasy: "体验一个专为这句创意现场生成的独有玩法",
    sessionLength: "2–8 分钟",
    coreLoop: ["理解本局目标", "执行核心操作", "读取反馈并调整策略", "达成或错失目标"],
    winCondition: "达成设计合同约定的目标条件",
    failCondition: "触发设计合同约定的失败条件",
    progression: ["按设计合同的推进设定逐步加压"],
    gameFeel: ["关键操作有即时视听反馈", "胜负状态有明确提示"],
    onboarding: ["开局说明目标与操作", "首个挑战保持低压力"],
    accessibility: ["键盘与触控均可完成主要操作", "关键信息不只依赖颜色"],
    productionRisks: ["实验性生成玩法:规则代码由模型生成,通过自动验收后仍需试玩确认"],
  },
  "mahjong-roguelite": {
    genre: "肉鸽式麻将接龙",
    targetPlayer: "喜欢可观察空间关系、短回合配对和局间成长选择的休闲策略玩家",
    playerFantasy: "沿月港航线清除层叠灵牌，并用旅途遗物塑造本次牌局节奏",
    sessionLength: "6–15 分钟",
    coreLoop: ["观察未被覆盖且侧边开放的自由牌", "选择两张相同灵牌消除", "维持连击并寻找新开放边缘", "清空牌阵后选择遗物进入下一航段"],
    winCondition: "清空当前难度要求的全部航段牌阵",
    failCondition: "牌面仍有灵牌但没有可用对子，且洗牌次数已经耗尽",
    progression: ["后续航段增加牌层和灵牌数量", "每航段结束从三件遗物中选择一件永久强化", "连击和遗物共同改变得分、提示或洗牌资源"],
    gameFeel: ["自由牌保持高亮与轻微抬升", "配对成功时两张牌同步收束并释放陶瓷清响", "新开放牌产生短促轮廓脉冲", "遗物选择明确改变下一航段资源"],
    onboarding: ["首航段只使用低层牌阵并默认点亮一对可消除牌", "被阻挡牌点击后直接说明是上层覆盖还是左右被夹住"],
    accessibility: ["灵牌同时使用位图符号、编号替代文本和明暗表达可用性", "提示、洗牌和撤销都有文字按钮与键盘快捷键"],
    productionRisks: ["生成器必须保证初始牌阵存在完整解法", "洗牌后不能制造无解状态", "移动端牌面不能因层数增加而小于可辨识尺寸"],
  },
};

function createDifficultyCurve(template: GameTemplate, difficulty: ParsedProjectInput["difficulty"]) {
  const label = difficulty === "relaxed" ? "轻松" : difficulty === "challenging" ? "挑战" : "标准";
  const pressure = difficulty === "relaxed"
    ? "放宽操作窗口、降低速度或减少目标量"
    : difficulty === "challenging"
      ? "缩短操作窗口、提高速度并增加目标量"
      : "保持足够学习窗口，并在中段形成稳定压力";
  return [`${label}档：${pressure}`, `难度调整必须改变 ${template} 的真实规则参数，而不是只改标签`];
}

export function createDesignProfile(template: GameTemplate, difficulty: ParsedProjectInput["difficulty"]): z.infer<typeof gameDesignProfileSchema> {
  return {
    ...designBlueprints[template],
    difficultyCurve: createDifficultyCurve(template, difficulty),
  };
}

export function resolveGameTemplate(rawInput: ProjectInput, analysis: IdeaAnalysis | null = null): GameTemplate {
  const input = projectInputSchema.parse(rawInput);
  return input.template !== "auto" ? input.template : analysis?.template ?? inferGameTemplate(input);
}

function createTemplateSource(template: GameTemplate) {
  const source = getOpenSourceTemplateReference(template);
  if (!source) return null;
  return {
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    license: source.license,
    licenseUrl: source.licenseUrl,
    integrationMode: source.integrationMode,
    importedElements: [...source.importedElements],
    assetPolicy: source.assetPolicy,
    verifiedAt: source.verifiedAt,
  };
}

export function generateGameSpec(
  rawInput: ProjectInput,
  analysis: IdeaAnalysis | null = null,
  designProfile: GameDesignProfile | null = null,
): GameSpec {
  const input = projectInputSchema.parse(rawInput);
  const dimensions = input.dimensions !== "auto" ? input.dimensions : analysis?.dimensions ?? inferDimensions(input);
  const template = input.template !== "auto" ? input.template : analysis?.template ?? inferGameTemplate(input);
  const title = deriveTitle(input);
  const aspectRatio = input.aspectRatio === "auto" ? recommendedAspectRatio(template, dimensions) : input.aspectRatio;
  const cameraMode = input.cameraMode === "auto" ? recommendedCameraMode(template, dimensions) : input.cameraMode;
  // 模板 3D 才有 collector/arena 双模合同;generated 3D 的规则完全由设计合同定义。
  const threeMode = dimensions === "3d" && template !== "generated"
    ? analysis?.threeMode ?? (/竞技场|敌人|波次|射击|战斗|arena|wave/i.test(input.idea) ? "arena" : "collector")
    : null;
  const spec: GameSpec = {
    schemaVersion: 1,
    presentationVersion: 5,
    title,
    vision: input.idea,
    dimensions,
    runtimeTarget: dimensions === "3d" ? "web-3d" : "web-2d",
    perspective: inferPerspective(input.idea, dimensions, template),
    template,
    templateSource: createTemplateSource(template),
    designProfile: designProfile ?? createDesignProfile(template, input.difficulty),
    designSource: designProfile ? "llm" : "template",
    levelProgression: defaultLevelProgression,
    artStyle: input.artStyle === "auto" ? templateDefaults[template].style : input.artStyle,
    visualStyle: input.visualStyle,
    difficulty: input.difficulty,
    aspectRatio,
    cameraMode,
    inputModes: input.inputModes ?? recommendedInputModes(template, dimensions),
    threeMode,
    threeContract: dimensions === "3d" && template !== "generated" ? {
      cameraDistance: threeMode === "arena" ? 10 : 8,
      movement: threeMode === "arena" ? "第三人称平面移动，自动朝向最近敌人" : "第三人称平面移动与跳跃",
      objective: threeMode === "arena" ? "完成三波敌人并在升级后存活" : "收集碎片、经过检查点并抵达终点",
      collision: "圆形角色碰撞体、地面约束与场景障碍阻挡",
      levelBounds: "52×52 米封闭场地，越界输入被阻止",
      performanceTiers: ["low", "medium", "high"],
      touchScheme: threeMode === "arena" ? "四向移动键与独立攻击键" : "四向移动键与独立跳跃键",
    } : null,
    puzzleRules: createPuzzleRules(input, template),
    customImageDataUrl: template === "puzzle" ? input.customImageDataUrl ?? null : null,
    mechanics: analysis && analysis.mechanics.length > 0 ? analysis.mechanics.slice(0, 12) : inferMechanics(input.idea),
    controls: dimensions === "3d" ? ["键盘与鼠标", "触控虚拟摇杆"] : templateDefaults[template].controls,
    hardConstraints: createHardConstraints(input, template, analysis),
    acceptanceCriteria: createAcceptance(dimensions, input.visualStyle),
    nonGoalsForThisVersion: dimensions === "3d" ? ["实时多人", "开放世界"] : ["实时多人"],
    ideaAnalysis: analysis,
  };
  return gameSpecSchema.parse(spec);
}

/** 可供匹配与选择的成熟模板目录;"generated" 是无模板兜底通道,不在目录里。 */
export function getTemplateCatalog() {
  return gameTemplateSchema.options.filter((id) => id !== "generated").map((id) => ({
    id,
    name: templateDefaults[id].title,
    genre: designBlueprints[id].genre,
    fantasy: designBlueprints[id].playerFantasy,
    coreLoop: designBlueprints[id].coreLoop.join(" → "),
  }));
}

export function heuristicIdeaAnalysis(rawInput: ProjectInput, fallbackReason: string | null = null): IdeaAnalysis {
  const input = projectInputSchema.parse(rawInput);
  return ideaAnalysisSchema.parse({
    source: fallbackReason ? "heuristic-fallback" : "heuristic",
    template: inferGameTemplate(input),
    dimensions: inferDimensions(input),
    mechanics: inferMechanics(input.idea),
    hardConstraints: inferHardConstraints(input.idea),
    fallbackReason: fallbackReason ? fallbackReason.slice(0, 280) : null,
  });
}
