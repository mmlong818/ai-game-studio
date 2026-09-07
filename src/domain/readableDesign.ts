import { getTemplate, MECHANIC_LIBRARY } from "./templates";
import type { StudioDraft } from "./types";

// Player-facing explanations of existing candidates, not evidence of implementation.
const examples: Record<string, { action: string; example: string; goal: string }> = {
  "drag-snap-assembly": { action: "按住一块图片，把它拖到对应位置，再松手。手机上直接用手指拖动。", example: "先找图案的边角。把一块叶子拖到轮廓附近，位置正确时自动贴齐，并给出清楚的亮光反馈。", goal: "把散开的图片拼成完整画面。暂时放不对可以继续调整，不因一次放错就结束。" },
  "grid-slide-merge": { action: "向一个方向滑动，让棋盘上的方块一起移动；相同的方块碰到一起时合成更高一级。", example: "把两个相同的水果移到一起，得到一个更高级的水果，再为下一次合并留下空位。实际图案按你的主题制作。", goal: "闯关时合成指定等级的目标；棋盘填满且不能再移动或合并时，这一局结束。" },
  "polyomino-placement": { action: "从待选区域拿起一块形状，拖到棋盘的空位上；放满一行或一列后清除。", example: "先放小块填补缺口，清掉一行腾出位置，再安排较大的拼块。", goal: "完成本关显示的清除目标。剩余拼块都无处可放时，结算并允许重试。" },
  "continuous-kart-steering": { action: "控制赛车向左、向右转弯，沿赛道前进；不要求玩家记复杂的组合按键。", example: "看到弯道先调整方向，出弯后回到平稳路线，避免一直贴着边缘碰撞。", goal: "按顺序经过赛道检查点并完成规定圈数；排名玩法需要另行明确胜利条件。" },
  "collect-charge": { action: "移动角色靠近可收集的东西，拿到后继续寻找下一个，同时避开危险。", example: "先拿安全位置的物品，再判断是否绕过障碍去拿远处的奖励。拿到的物品消失，并显示收集反馈。", goal: "闯关时收集规定物品，再到达终点；遇到危险怎样扣血或结束，需要按你的要求确定。" },
  "match-combo": { action: "交换两个相邻图案，让三个或更多相同图案连在一起并消除。", example: "先找到差一步就能连成三个的位置，交换一次。消除后落下的新图案还可能继续连着消除。", goal: "完成本关的消除目标；对战版本还需要说明双方如何轮流行动、怎样造成伤害。" },
  "tableau-solitaire": { action: "把牌移到允许的位置，借助空位整理被压住的牌，再把牌按顺序收上去。", example: "先把挡路的一张牌暂放在空格里，露出下面需要的牌，完成移动后尽量腾回空格。", goal: "把所有牌按花色从小到大收齐。没有好走法时提供提示或重新开局，不强迫快速操作。" },
  "projectile-wave": { action: "移动角色躲开敌人和攻击，再寻找安全位置反击；是否自动射击需在制作时明确。", example: "敌人从一侧靠近时先移动到空旷处，避开攻击，再处理面前的敌人。", goal: "完成本关的敌人或生存目标。生命耗尽时结算，允许直接重试。" },
  "sliding-block": { action: "拖动棋盘上的块，利用空位挪出一条路，把目标块送到出口。", example: "先把挡路的小块移到空处，再移动较大的目标块；一次移动只解决眼前的一步。", goal: "目标块到达出口即完成。走错可以撤回，不要求靠反应速度通关。" },
};

export function readableDesign(draft: StudioDraft) {
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  const candidates = MECHANIC_LIBRARY.filter(item => draft.selectedMechanicIds.includes(item.id));
  const explained = candidates.map(item => ({ name: item.name, ...examples[item.id], fallback: item.description }));
  const preserve = Boolean(template);
  const endlessOnly = !preserve && /(?:只有|只要|纯|不要目标|没有目标|无目标|不要关卡)/.test(draft.newGameBrief) && /无限|无尽|自由|目标/.test(draft.newGameBrief);
  return {
    request: preserve ? draft.freeRequest : draft.newGameBrief,
    play: preserve ? template!.coreLoop : explained.map(item => item.action ?? item.fallback).join("；"),
    example: preserve ? template!.coreRules.slice(0, 3).join("；") : explained.map(item => item.example ?? `先尝试“${item.fallback}”，观察画面反馈，再决定下一步。具体操作方式需要在制作时补齐。`).join("\n"),
    goal: preserve ? "原游戏的过关和失败规则优先保留；只有你的要求明确涉及这些规则时才调整。" : endlessOnly ? "按你的要求不设置必须完成的关卡目标，玩家可以持续游玩并主动结束；是否保留碰撞或无路可走等失败条件，需要进一步明确。" : explained.map(item => item.goal ?? "目前还没有足够明确的过关和失败条件，制作前需根据这一玩法补齐，不能仅凭玩法名称判定。").join("\n"),
    preserve,
    experience: [
    { title: "第一次打开", detail: preserve ? "保留原有操作和新手帮助。若改动了操作，帮助内容也要同步更新。" : "先示范一个最简单的动作，让玩家跟着做成功一次，再开始正常游戏。提示可以跳过，也能重新打开。" },
    { title: "后面怎样变难", detail: preserve ? "未要求调整难度时，保留原有关卡节奏，不因为换画风而改变规则。" : "闯关类建议首关至少有约两分钟的游玩内容，后续约三到五分钟；一次只增加一种变化，不靠强制等待凑时长。自由或无限玩法不套用过关时间。" },
    { title: "做对了有什么反馈", detail: "动作成功时立即有清楚的画面反馈。闯关成功后突出本关成果，再让玩家选择下一关；失败时说明原因，并能方便地重新开始。这些效果仍需制作和试玩验证。" },
    { title: "画面要准备什么", detail: preserve ? "按你的改造要求替换相关图片，保持未涉及的资源和玩法不变。" : "准备符合你所述主题的主角或棋子、场景、可互动物品和成功反馈图像；优先保证小屏幕上看得清，不让装饰遮住操作位置。" },
    { title: "积分与奖励", detail: preserve ? "没有提出修改时保留原有计分方式。" : "有计分需要时清楚显示得分原因和本局成果；不强行给自由创作或纯解谜加入等级、每日任务和复杂奖励。" },
    ],
    needsCombination: !preserve && candidates.length > 1,
  };
}

export function confirmedDesignText(draft: StudioDraft) {
  const plan = readableDesign(draft);
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  return [
    "用户确认的制作方案（未验证的建议仍需制作检查，不得当成已经实现）：",
    plan.request,
    template ? "基于玩法：" + template.name : "",
    ...(template?.suggestions.filter(item => draft.selectedSuggestionIds.includes(item.id)).map(item => item.title + "：" + item.description) ?? []),
    "操作：" + plan.play, "示例：" + plan.example, "结束条件：" + plan.goal,
    ...plan.experience.map(item => item.title + "：" + item.detail),
    plan.needsCombination ? "多个玩法为候选方向，需整合为一个一致目标，不可机械叠加。" : "",
  ].filter(Boolean).join("\n");
}
