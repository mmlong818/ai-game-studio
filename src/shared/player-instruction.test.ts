import { expect, it } from "vitest";
import { playerInstruction } from "./player-instruction";
it("已识别的策划描述只转换显示措辞，不添加新动作", () => {
  expect(playerInstruction("首次打开直接高亮一张牌，提示玩家点击")).toBe("点一下发光的牌。");
  expect(playerInstruction("首次错配时说明两张牌稍后会自动盖回")).toBe("两张不同的牌会自动盖回。记住位置，再试一次。");
  expect(playerInstruction("第1关结束后再介绍连击与个人最佳")).toBe("完成第1关，看看你的连击与个人最佳。");
});
it("不猜测或改写未知玩法指令", () => {
  expect(playerInstruction("向左拖动挡板，把球弹回去")).toBe("向左拖动挡板，把球弹回去");
});
