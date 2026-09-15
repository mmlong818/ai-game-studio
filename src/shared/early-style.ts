import { recommendedArtStyle, recommendedModernVisualStyle, visualStyleOptions, type GameTemplate } from "./contracts.js";

const explicitDirections = [
  { pattern: /水彩|水墨|墨线|宣纸|手绘线稿|简笔/, artStyle: "ink", visualStyle: "line-art", tone: "纸色、墨色与少量题材强调色" },
  { pattern: /霓虹|赛博|未来|太空|星际|科幻/, artStyle: "pop", visualStyle: "fashion", tone: "深色底、明亮高对比强调色" },
  { pattern: /植物|花园|森林|自然|田园/, artStyle: "botanical", visualStyle: "calm", tone: "低饱和自然色与清晰状态强调色" },
  { pattern: /复古|古典|漆器|宫廷|历史/, artStyle: "lacquer", visualStyle: "classic", tone: "沉稳深色、暖金或题材主色" },
  { pattern: /几何|色块|积木|方块|抽象/, artStyle: "geometric", visualStyle: "color-block", tone: "少量高区分色块与清晰中性色" },
  { pattern: /可爱|软萌|糖果|甜点|童话|轻松/, artStyle: "playful", visualStyle: "cute", tone: "柔和明快色与高辨识反馈色" },
] as const;

/** 在方案确认前把已有风格枚举变成可消费的具体方向；不在此生成或要求任何资源。 */
export function resolveEarlyStyleDirection(idea: string, template: GameTemplate) {
  const matched = explicitDirections.find(({ pattern }) => pattern.test(idea));
  const artStyle = matched?.artStyle ?? recommendedArtStyle(template);
  const visualStyle = matched?.visualStyle ?? recommendedModernVisualStyle(template);
  const style = visualStyleOptions.find(({ id }) => id === visualStyle)!;
  return {
    artStyle,
    visualStyle,
    tone: matched?.tone ?? "题材主色与清晰状态强调色，控制背景噪声",
    shape: `${style.description}；${style.elements}`,
    rendering: "按核心玩法需要选择程序绘制、复用既有资源或少量位图；风格选择本身不触发生图",
    label: style.label,
  };
}
