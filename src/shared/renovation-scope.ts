import type { GameDesignProfile, RenovationScope } from "./contracts.js";

export const renovationScopeLabel: Record<RenovationScope, string> = {
  gameplay: "一个局部玩点",
  assets: "部分资源替换",
  "visual-style": "美术风格",
};

export function renovationScopeInstruction(scope: RenovationScope, request: string): string {
  const fixed = "核心规则、胜负条件、操作方式、页面布局、模式、关卡结构及未点名的资源必须保持当前版本不变";
  const boundary = scope === "gameplay"
    ? "只调整描述中明确点名的一个玩点，不连带重做其他循环、数值或系统"
    : scope === "assets"
      ? "只替换描述中明确点名的资源，未点名的资源和全部玩法保持不变"
      : "只改变视觉语言、配色、材质和装饰表现，不改变玩法、操作、信息层级或布局";
  return `【改造范围：${renovationScopeLabel[scope]}】【范围边界：${boundary}】【固定保留：${fixed}】${request}`;
}

export function renovationSourceForBuild(originalSourceProjectId: string, currentProjectId: string, isRevisionBuild: boolean): string {
  return isRevisionBuild ? currentProjectId : originalSourceProjectId;
}

/**
 * A model may propose a broader contract even when the prompt is explicit. This
 * merge is the local enforcement boundary: visual/resource work cannot alter
 * gameplay, and a gameplay-focus revision may change at most one loop step.
 */
export function constrainRenovationProfile(candidate: GameDesignProfile, baseline: GameDesignProfile, scope: RenovationScope): GameDesignProfile {
  if (scope === "assets" || scope === "visual-style") return baseline;
  const coreLoop = baseline.coreLoop.map((step, index) => {
    const firstChanged = baseline.coreLoop.findIndex((item, itemIndex) => candidate.coreLoop[itemIndex] !== item);
    return index === firstChanged ? (candidate.coreLoop[index] ?? step) : step;
  });
  return {
    ...candidate,
    genre: baseline.genre,
    targetPlayer: baseline.targetPlayer,
    playerFantasy: baseline.playerFantasy,
    sessionLength: baseline.sessionLength,
    coreLoop,
    winCondition: baseline.winCondition,
    failCondition: baseline.failCondition,
    progression: baseline.progression,
    generatedCampaign: baseline.generatedCampaign,
    generatedBlueprint: baseline.generatedBlueprint,
  };
}
