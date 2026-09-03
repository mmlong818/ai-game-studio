import type { OfficialSuggestionCategory, OfficialSuggestionLevel, OfficialTemplateSuggestion } from "./types.js";

export const suggestion = (
  id: string,
  category: OfficialSuggestionCategory,
  title: string,
  description: string,
  keeps: string,
  newAssets: string,
  level: OfficialSuggestionLevel,
  risk: OfficialTemplateSuggestion["risk"],
): OfficialTemplateSuggestion => ({ id, category, title, description, keeps, newAssets, level, risk });

/**
 * 每个玩法模板共用的四条改造建议：换世界观（R0）、重做视觉（R0）、换内容节奏（R1）、加一种小机制（R2）。
 * core 描述“什么保持不变”，content / mechanic 分别是内容与机制建议的正文。
 */
export const commonSuggestions = (
  id: string,
  core: string,
  content: string,
  mechanic: string,
): OfficialTemplateSuggestion[] => [
  suggestion(
    `${id}-world`,
    "world",
    "换一个世界观",
    "替换角色身份、场景设定、目标物和文案包装。",
    core,
    "角色、场景、目标物 AI 位图与界面文案",
    "R0",
    "低",
  ),
  suggestion(
    `${id}-visual`,
    "visual",
    "重做视觉风格",
    "选择一致的美术方向，重新生成封面和游戏内位图资源。",
    core,
    "完整 AI 位图资源包，不使用 SVG 代替游戏美术",
    "R0",
    "低",
  ),
  suggestion(
    `${id}-content`,
    "content",
    "更换内容与节奏",
    content,
    core,
    "关卡数据、内容资源与调节参数",
    "R1",
    "低",
  ),
  suggestion(
    `${id}-mechanic`,
    "mechanic",
    "加入一种小机制",
    mechanic,
    core,
    "一组专属资源、规则合同和自动验收场景",
    "R2",
    "中",
  ),
];
