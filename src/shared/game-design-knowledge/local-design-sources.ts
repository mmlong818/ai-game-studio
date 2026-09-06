import { z } from "zod";

export const localDesignSourceSchema = z.object({
  schemaVersion: z.literal("local-design-source-v1"), id: z.string().regex(/^[a-z0-9-]+$/), relativePath: z.string().min(1),
  format: z.enum(["markdown", "docx", "pdf", "html"]), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  role: z.enum(["mechanic-seed", "design-rule", "evaluation-rule", "genre-reference"]),
  ingestion: z.literal("summary-only"), rightsStatus: z.literal("not-reviewed"),
  themes: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1), derivedPrinciples: z.array(z.string().min(1).max(240)).min(1),
}).strict();
export type LocalDesignSource = z.infer<typeof localDesignSourceSchema>;

const source = (value: Omit<LocalDesignSource, "schemaVersion" | "ingestion" | "rightsStatus">) => localDesignSourceSchema.parse({ schemaVersion: "local-design-source-v1", ingestion: "summary-only", rightsStatus: "not-reviewed", ...value });

export const LOCAL_DESIGN_SOURCES: LocalDesignSource[] = [
  source({ id: "local-101-game-mechanics", relativePath: "101游戏机制.md", format: "markdown", bytes: 9053, sha256: "92fbc6241d0bd12ac74dab42423e63cc79ff612201769ed9ba0d65744584a8ab", role: "mechanic-seed", themes: ["mechanics", "motivation", "social", "economy"], derivedPrinciples: ["原清单混合了机制、动机、题材、商业和表现元素；入库前必须重新分类，不能把所有名词都当作可执行机制。", "倒计时、回合、资源管理、冷却、风险回报和关卡可以作为设计透镜或系统结构。"] }),
  source({ id: "local-gamification-mechanics", relativePath: "游戏机制.md", format: "markdown", bytes: 8966, sha256: "921d1d2b5d62c50ceb7f8ee1f19a3831b940c586cc8d2dc8834a84043d311c22", role: "mechanic-seed", themes: ["gamification", "progression", "feedback", "motivation"], derivedPrinciples: ["成就、积分、进度和奖励属于外围激励结构，必须绑定真实核心动作，不能代替玩法。", "信息应随玩家掌握程度逐步释放，避免首次体验的信息过载。"] }),
  source({ id: "local-236-design-techniques", relativePath: "游戏设计的236个技巧.docx", format: "docx", bytes: 12778, sha256: "96c4b4b253080eeeb2eb9631e4132ceb27481bd5946945143b189eb7a18e4592", role: "genre-reference", themes: ["three-dimensional", "combat", "enemy-ai", "level-design", "camera"], derivedPrinciples: ["动作、敌人、关卡、碰撞和镜头必须作为相互影响的系统评估，而不是孤立功能。", "简单输入、可读距离、命中反馈、容错与镜头可见性是非专业玩家动作游戏的优先验证项。"] }),
  source({ id: "local-puzzle-design", relativePath: "益智游戏.md", format: "markdown", bytes: 64149, sha256: "1f8d9e71eaff28336ef05681e28e6be9ab8cf829c3ae7872fca71f22df6c81e5", role: "genre-reference", themes: ["puzzle", "taxonomy", "difficulty", "solvability"], derivedPrinciples: ["益智玩法应按玩家动作、信息结构和约束关系分类，并为关键关卡保留可解证明。", "难度递进优先改变单一主维度，提示应解释推理而不是只给答案。"] }),
  source({ id: "local-rpg-core-action", relativePath: "RPG设计七卷书/book/05-找到核心动作.md", format: "markdown", bytes: 22960, sha256: "072b6e7f839ae6c222f4ce239535d0e25744d5521429183ed9b965dcacfc9ccd", role: "design-rule", themes: ["core-action", "frequency", "mastery", "prototype"], derivedPrinciples: ["核心动作应按实际频次识别，并写成具有完整玩家意图的一句话。", "高频动作必须产生可变结果、具有可感知质感或允许玩家提升判断与技巧。"] }),
  source({ id: "local-rpg-core-loop", relativePath: "RPG设计七卷书/book/06-核心循环的构造.md", format: "markdown", bytes: 18016, sha256: "c944b9522f232d994ad31509f8498c044ab6ec416bcabcd469b036ce40fbf8d7", role: "design-rule", themes: ["core-loop", "feedback", "world-state", "scope"], derivedPrinciples: ["核心动作的结果必须改变世界状态，并给出可以归因的反馈，使下一次行动具有内部动机。", "移除一个系统后循环仍闭合，说明它是可选特性；不再闭合，说明它属于核心规则。"] }),
  source({ id: "local-rpg-decision-weight", relativePath: "RPG设计七卷书/book/07-决策的重量.md", format: "markdown", bytes: 15854, sha256: "44299cfb5e2f98e155a37680d19713b9be95bdd553761b64a794093a57606a0a", role: "design-rule", themes: ["decision", "information", "irreversibility", "choice-density"], derivedPrinciples: ["真正的决策需要可理解的选项、差异化后果和足够信息，而不是外观不同但结果相同的按钮。", "信息量和不可撤销性共同决定决策重量，不能同时无提示地提高。"] }),
  source({ id: "local-rpg-economy", relativePath: "RPG设计七卷书/book/09-内部经济.md", format: "markdown", bytes: 18233, sha256: "5f3aed100b96d64096477cc3c268e7e60039dda66a16f7dd89891aa4747de933", role: "design-rule", themes: ["economy", "resource", "source-sink", "conversion"], derivedPrinciples: ["每种资源必须说明用途与稀缺性，并明确来源、消耗点和转换关系。", "经济链过长、消耗品囤积和投放速度超过消耗速度都应触发设计风险。"] }),
  source({ id: "local-rpg-difficulty", relativePath: "RPG设计七卷书/book/20-难度、渐进与自驱动.md", format: "markdown", bytes: 20552, sha256: "55f348af4b3c8c421e87c7353f28452273a1d2750d0f7d6f5f343efbe2aad4c4", role: "design-rule", themes: ["difficulty", "progression", "information", "failure"], derivedPrinciples: ["难度应拆成多个可独立调节的维度，相邻阶段避免多个维度同时突升。", "技能地板与掌握天花板应分别调整，失败处理要保留原因、恢复动作和继续尝试的希望。"] }),
  source({ id: "local-rpg-onboarding", relativePath: "RPG设计七卷书/book/22-引导、导航与信息.md", format: "markdown", bytes: 21874, sha256: "ab8cf3727a8e2b4459343738ae272a650440210087039b04bff9aed24a41ee3f", role: "design-rule", themes: ["onboarding", "navigation", "information", "assistance"], derivedPrinciples: ["教学应让玩家完成真实动作，不只说明按键；帮助按解释原因、方向提示和展示一步逐级增加。", "决策所需的状态应始终可查，可推断线索才可以作为难度变量。"] }),
  source({ id: "local-rpg-playtest", relativePath: "RPG设计七卷书/book/24-玩测.md", format: "markdown", bytes: 26592, sha256: "a6c415895fc3b245acf0ba11e107b6fa79caaf40bffb04bce1d4e46543944874", role: "evaluation-rule", themes: ["playtest", "observation", "qualitative", "segments"], derivedPrinciples: ["试玩应记录玩家实际行为、卡住时刻和未发生的预期行为，不能只采纳玩家提出的解决方案。", "测试者应覆盖新手和目标玩家，并区分共性问题与个体偏好。"] }),
  source({ id: "local-rpg-acceptance", relativePath: "RPG设计七卷书/book/25-三级验收.md", format: "markdown", bytes: 18748, sha256: "7a720afab399c64de34496a1339aec04229085e8f5ff2c3cb96524ca9b4775fa", role: "evaluation-rule", themes: ["acceptance", "function", "content", "balance"], derivedPrinciples: ["验收分成功能可运行、内容完整和数值平衡三层，后一层不能替代前一层。", "每项设计承诺都应绑定可重复的测试方法和可归档证据。"] }),
];

export const LOCAL_DESIGN_SOURCE_SUMMARY = {
  schemaVersion: "local-design-source-summary-v1" as const,
  indexed: LOCAL_DESIGN_SOURCES.length,
  bytes: LOCAL_DESIGN_SOURCES.reduce((sum, item) => sum + item.bytes, 0),
  byRole: Object.fromEntries(["mechanic-seed", "design-rule", "evaluation-rule", "genre-reference"].map((role) => [role, LOCAL_DESIGN_SOURCES.filter((item) => item.role === role).length])),
  sourceRootHint: "D:/Admin/Desktop/game",
  policy: "仅保存文件指纹、主题和原创摘要；原文件不复制，许可未复核前不得用于公开内容或正式资源。",
};
