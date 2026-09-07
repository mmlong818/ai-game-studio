/** Presentation-only wording. Keep the original design contract and action signals intact. */
export function playerInstruction(value: string): string {
  const text = value.trim();
  if (/^首次打开直接高亮一张牌，提示玩家点击[。]?$/.test(text)) return "点一下发光的牌。";
  if (/^首张翻开后高亮其配对牌，完成可操作示例[。]?$/.test(text)) return "再点发光的配对牌，试着配成一对。";
  if (/^首次错配时说明两张牌稍后会自动盖回[。]?$/.test(text)) return "两张不同的牌会自动盖回。记住位置，再试一次。";
  const finish = /^第(\d+)关结束后再介绍(.+?)[。]?$/.exec(text);
  if (finish) return `完成第${finish[1]}关，看看你的${finish[2]}。`;
  if (/^帮助按钮常驻，可随时重看.+[。]?$/.test(text)) return "点“玩法帮助”，看看怎样回顾操作。";
  return value;
}
