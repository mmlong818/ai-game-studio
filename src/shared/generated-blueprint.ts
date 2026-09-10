import { z } from "zod";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "./game-design-knowledge/mechanic-atlas.js";

/**
 * 生成式游戏的知识蓝图：把机制图谱里的独立机制与设计修饰器真正落到一次创作里，
 * 并要求策划写清玩家每次操作的取舍、张力来源与熟练度体现。
 *
 * 蓝图同时声明这次游戏需要的局内美术主体，使图片先于代码生成，
 * 代码只负责绘制已有位图，不再用 canvas 路径自绘主体。
 */
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,60}$/);
const statement = z.string().trim().min(10).max(200);

export const spriteAnimationClipIds = ["idle", "run", "hit", "effect"] as const;
export const spriteAnimationClipSchema = z.object({
  id: z.enum(spriteAnimationClipIds),
  startFrame: z.number().int().min(0).max(31),
  frameCount: z.number().int().min(4).max(8),
  fps: z.number().min(1).max(24),
  loop: z.boolean(),
});

export const spriteSheetAnimationSchema = z.object({
  frameWidth: z.number().int().min(16).max(1024),
  frameHeight: z.number().int().min(16).max(1024),
  columns: z.number().int().min(1).max(8),
  rows: z.number().int().min(1).max(8),
  frameCount: z.number().int().min(4).max(32),
  anchor: z.object({ x: z.number().min(0), y: z.number().min(0) }),
  clips: z.array(spriteAnimationClipSchema).min(1).max(4),
}).superRefine((sheet, ctx) => {
  if (sheet.frameCount > sheet.columns * sheet.rows) ctx.addIssue({ code: "custom", path: ["frameCount"], message: "动画总帧数不能超过图集网格容量。" });
  if (sheet.frameWidth * sheet.columns > 4096 || sheet.frameHeight * sheet.rows > 4096) ctx.addIssue({ code: "custom", path: ["columns"], message: "Sprite Sheet 尺寸不能超过 4096×4096。" });
  if (sheet.anchor.x > sheet.frameWidth || sheet.anchor.y > sheet.frameHeight) ctx.addIssue({ code: "custom", path: ["anchor"], message: "动画锚点必须位于单帧范围内。" });
  const ids = sheet.clips.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["clips"], message: "动画动作 id 不能重复。" });
  const occupied = new Set<number>();
  let finalFrame = 0;
  for (const [index, clip] of sheet.clips.entries()) {
    const end = clip.startFrame + clip.frameCount;
    finalFrame = Math.max(finalFrame, end);
    if (end > sheet.frameCount) ctx.addIssue({ code: "custom", path: ["clips", index], message: `动作 ${clip.id} 超出动画总帧数。` });
    for (let frame = clip.startFrame; frame < end; frame += 1) {
      if (occupied.has(frame)) ctx.addIssue({ code: "custom", path: ["clips", index], message: `动作 ${clip.id} 与其他动作帧区间重叠。` });
      occupied.add(frame);
    }
  }
  if (finalFrame !== sheet.frameCount) ctx.addIssue({ code: "custom", path: ["frameCount"], message: "动画总帧数必须等于最后一个动作的结束帧。" });
});

export type SpriteSheetAnimation = z.infer<typeof spriteSheetAnimationSchema>;
export type SpriteAnimationClipId = (typeof spriteAnimationClipIds)[number];

export const blueprintSpriteSchema = z.object({
  file: z.string().regex(/^assets\/[a-z0-9][a-z0-9-]{1,38}\.png$/, "精灵文件名必须形如 assets/shell-scallop.png"),
  role: z.string().trim().min(2).max(24),
  hint: z.string().trim().min(6).max(160),
  animation: spriteSheetAnimationSchema.optional(),
});

export const generatedBlueprintSchema = z.object({
  mechanicIds: z.array(slug).min(1).max(3),
  modifierIds: z.array(slug).min(1).max(2),
  /** 玩家每次操作前的真实取舍：不同选择必须导致不同结果。 */
  coreDecision: statement,
  /** 张力来源：即使没有失败，也要说明什么让取舍有意义。 */
  tension: statement,
  /** 熟练度体现：技巧更好的玩家在同一关里表现出什么可观察差别。 */
  masterySignal: statement,
  sprites: z.array(blueprintSpriteSchema).min(2).max(5),
}).superRefine((plan, ctx) => {
  const unknownMechanics = plan.mechanicIds.filter(id => !MECHANIC_ATLAS.some(entry => entry.id === id));
  if (unknownMechanics.length) ctx.addIssue({ code: "custom", path: ["mechanicIds"], message: `机制必须取自机制图谱：${unknownMechanics.join("、")} 不在库中。` });
  const unknownModifiers = plan.modifierIds.filter(id => !DESIGN_MODIFIERS.some(entry => entry.id === id));
  if (unknownModifiers.length) ctx.addIssue({ code: "custom", path: ["modifierIds"], message: `设计修饰器必须取自知识库：${unknownModifiers.join("、")} 不在库中。` });
  if (new Set(plan.mechanicIds).size !== plan.mechanicIds.length) ctx.addIssue({ code: "custom", path: ["mechanicIds"], message: "机制不能重复。" });
  if (new Set(plan.modifierIds).size !== plan.modifierIds.length) ctx.addIssue({ code: "custom", path: ["modifierIds"], message: "设计修饰器不能重复。" });
  const files = plan.sprites.map(({ file }) => file);
  if (new Set(files).size !== files.length) ctx.addIssue({ code: "custom", path: ["sprites"], message: "局内美术文件名不能重复。" });
  // 封面与局内背景由平台固定生成，蓝图只声明玩家直接看到或操作的主体。
  const reserved = files.filter(file => file === "assets/cover.png" || file === "assets/background.png");
  if (reserved.length) ctx.addIssue({ code: "custom", path: ["sprites"], message: "封面与局内背景由平台生成，不要写进局内美术清单。" });
});

export type GeneratedBlueprint = z.infer<typeof generatedBlueprintSchema>;

export function blueprintMechanics(plan?: GeneratedBlueprint | null) {
  return (plan?.mechanicIds ?? []).map(id => MECHANIC_ATLAS.find(entry => entry.id === id)).filter((entry): entry is (typeof MECHANIC_ATLAS)[number] => Boolean(entry));
}

export function blueprintModifiers(plan: GeneratedBlueprint) {
  return plan.modifierIds.map(id => DESIGN_MODIFIERS.find(entry => entry.id === id)!).filter(Boolean);
}

export function blueprintSpriteFiles(plan?: GeneratedBlueprint | null): string[] {
  return plan?.sprites.map(({ file }) => file) ?? [];
}

/**
 * 供代码生成使用的规则段：既列出必须绘制的位图，也把机制与修饰器的生产规则写成硬要求。
 */
export function generatedBlueprintPrompt(plan?: GeneratedBlueprint | null): string {
  if (!plan) return "";
  const mechanics = blueprintMechanics(plan).map(entry => `- 机制「${entry.label}」：${entry.productionRule}`);
  const modifiers = blueprintModifiers(plan).map(entry => `- 修饰器「${entry.label}」：${entry.intent}${entry.rule}`);
  return [
    `玩法取舍（必须在代码中成立）：${plan.coreDecision}`,
    `张力来源：${plan.tension}`,
    `熟练度体现：${plan.masterySignal}`,
    ...mechanics,
    ...modifiers,
    `局内美术：平台已生成 ${plan.sprites.map(({ file, role, animation }) => `${file}（${role}${animation ? `；Sprite Sheet ${animation.columns}×${animation.rows}，单帧 ${animation.frameWidth}×${animation.frameHeight}，锚点 ${animation.anchor.x},${animation.anchor.y}，动作 ${animation.clips.map(clip => `${clip.id}:${clip.startFrame}+${clip.frameCount}@${clip.fps}fps${clip.loop ? "循环" : "单次"}`).join("/")}` : "；静态位图"}）`).join("、")}，全部必须实际加载并绘制。`,
    ...(plan.sprites.some(({ animation }) => animation) ? ["带 animation 的文件是 row-major Sprite Sheet。必须使用平台 window.__FORGE_SPRITES__.create(image, animation, initialClip) 播放，并在正常玩法状态切换时调用 play(id)；每帧用 player.draw(ctx, anchorX, anchorY, scale, timestamp) 绘制。禁止把整张网格当静态图显示，也禁止另写一套帧索引算法。"] : []),
    "玩家直接看到或操作的主体必须使用这些位图绘制；禁止用 canvas 路径、圆形、多边形或渐变自绘主体充当美术。程序化绘制只允许用于连线、高亮框、进度条一类的界面标记。",
  ].join("\n");
}

/** 逐条进入规则审核的知识与深度要求。 */
export function blueprintRules(plan?: GeneratedBlueprint | null): string[] {
  if (!plan) return [];
  return [
    `玩家取舍:${plan.coreDecision}`,
    `张力来源:${plan.tension}`,
    `熟练度体现:${plan.masterySignal}`,
    ...blueprintMechanics(plan).map(entry => `机制${entry.label}:${entry.productionRule}`),
    ...blueprintModifiers(plan).map(entry => `修饰器${entry.label}:${entry.rule}`),
    `局内美术必须加载并绘制:${plan.sprites.map(({ file }) => file).join("、")}；主体不得用程序化图形自绘。`,
  ];
}

/**
 * 按创意检索机制候选：先取与描述有字面重合的机制，再按家族补齐，
 * 保证菜单既贴题又不单一。结果确定，不随机。
 */
export function selectBlueprintCandidates(idea: string, limit = 14) {
  const text = (idea ?? "").replace(/\s+/g, "");
  const grams = new Set<string>();
  for (let index = 0; index + 2 <= text.length; index += 1) grams.add(text.slice(index, index + 2));
  const scored = MECHANIC_ATLAS.map(entry => {
    const haystack = `${entry.label}${entry.playerVerb}${entry.state}${entry.outcome}`;
    let hits = 0;
    for (const gram of grams) if (haystack.includes(gram)) hits += 1;
    return { entry, hits };
  }).sort((left, right) => right.hits - left.hits || left.entry.id.localeCompare(right.entry.id));
  const picked = scored.filter(({ hits }) => hits > 0).slice(0, limit).map(({ entry }) => entry);
  for (const family of [...new Set(MECHANIC_ATLAS.map(entry => entry.family))]) {
    if (picked.length >= limit) break;
    const next = MECHANIC_ATLAS.find(entry => entry.family === family && !picked.includes(entry));
    if (next) picked.push(next);
  }
  return picked.slice(0, limit);
}

/** 供策划阶段使用的候选菜单与深度要求。 */
export function blueprintPlanningPrompt(idea: string): string {
  const candidates = selectBlueprintCandidates(idea).map(entry => `- ${entry.id}｜${entry.label}｜玩家动作:${entry.playerVerb}｜状态:${entry.state}｜结果:${entry.outcome}`);
  const modifiers = DESIGN_MODIFIERS.map(entry => `- ${entry.id}｜${entry.label}｜${entry.intent}`);
  return [
    "知识库机制候选(mechanic_ids 只能从这些 id 中选 1–3 个，必须真正构成这次玩法的主体动作):",
    ...candidates,
    "设计修饰器候选(modifier_ids 只能从这些 id 中选 1–2 个，用来决定节奏、信息、空间、资源或恢复方式):",
    ...modifiers,
    "玩法深度硬要求:",
    "- core_decision 必须描述玩家每次操作前的真实取舍：不同选择导致不同结果。“点到就得分”不是取舍。",
    "- tension 必须说明取舍为什么有意义。无失败玩法同样要有张力，例如有限空间、互相冲突的目标、会变化的局面或值得权衡的收益。",
    "- mastery_signal 必须说明技巧更好的玩家在同一关里的可观察差别。",
    "- difficulty_curve 至少有一条改变决策结构（新对象关系、空间约束、信息变化、资源竞争或时机窗口），不能全是数量、尺寸或间隔的加减。",
    "- 只靠增加数量、缩小目标或拉长时间的纯点选玩法不可接受，必须重新设计取舍。",
    "局内美术清单(sprites, 2–5 个):",
    "- 列出玩家直接看到或操作的主体，例如可拾取物、角色、容器、障碍。平台会在代码生成之前先把它们生成为透明底位图。",
    "- file 用小写英文短横线命名，形如 assets/shell-scallop.png；role 是中文短名；hint 说明外形、材质与辨识特征。",
    "- 对玩家控制或持续运动的主要主体，优先增加 animation。第一版动作只能是 idle/run/hit/effect；每个动作 4–8 帧，row-major 单图集多动作，动作区间不可重叠。静态道具可不填 animation。",
    "- animation 填单帧 frameWidth/frameHeight、网格 columns/rows、总 frameCount、单帧像素锚点 anchor，以及 clips(startFrame/frameCount/fps/loop)。总帧数最多 32，图集不超过 4096×4096。",
    "- 封面与局内背景由平台固定生成，不要列进来。",
  ].join("\n");
}
