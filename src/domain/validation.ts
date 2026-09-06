import { getTemplate, getGameplayBundle } from "./templates";
import type { StudioDraft, ValidationResult } from "./types";

export function validateDraft(draft: StudioDraft): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft.creationMode === "template-remix") {
    if (getGameplayBundle(draft.templateId)?.remixable === false) errors.push("该官方游戏仅供游玩，不提供模板改造，请选择其他游戏。");
    const template = getTemplate(draft.templateId);
    if (!template) {
      errors.push("请选择一个成熟玩法作为改造起点。");
    } else {
      const selectedSuggestions = template.suggestions.filter((suggestion) =>
        draft.selectedSuggestionIds.includes(suggestion.id),
      );
      const smallMechanicCount = selectedSuggestions.filter(
        (suggestion) => suggestion.level === "R2",
      ).length;
      if (selectedSuggestions.length === 0 && !draft.freeRequest.trim()) {
        errors.push("至少选择一项固定建议，或补充一条具体改造要求。");
      }
      if (smallMechanicCount > 1) {
        errors.push("一次改造最多加入一种小机制，请减少机制类建议。");
      }
      if (draft.changeLevel === "R3") {
        errors.push("这项要求已经改变核心玩法，需要转入新游戏设计流程。");
      }
      if (draft.changeLevel === "R2" && !draft.referenceDossier) {
        errors.push("小规则扩展必须先建立同类机制参考档案。");
      }
    }
  } else {
    if (draft.newGameBrief.trim().length < 12) {
      errors.push("请用至少一句完整描述说明玩家反复做什么以及为什么有趣。");
    }
    if (draft.selectedMechanicIds.length === 0) {
      errors.push("至少选择一个已经验证的玩法要素。");
    }
    if (draft.selectedMechanicIds.length > 2) {
      warnings.push("首版同时使用超过两种主要机制，原型失败风险较高。");
    }
    if (!draft.referenceDossier || draft.referenceDossier.references.length < 2) {
      errors.push("新游戏至少需要两个真实来源：玩法规则和跨设备控制。 ");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
