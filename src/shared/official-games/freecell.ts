import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const freecell = defineOfficialGame({
  id: "freecell",
  title: "空档接龙",
  kind: "fixture",
  fixtureKind: "freecell",
  lobbyRank: 4,
  cover: "fixtures/freecell/assets/cover.png",
  referenceDoc: "docs/53-freecell-best-template-reference.md",
  knowledge: { patternId: "freecell-solitaire", mechanicIds: ["tableau-solitaire"], rationale: "牌列、空档、超级移动和收牌构成确定性规划。" },
  fixture: {
    metaKey: "freecell_fixture_initialized",
    buildOutputs: [
      "8 列、4 空档、4 收牌堆与超级移动上限已锁定。",
      "Microsoft 发牌算法 1–100 号牌局已由求解器逐局验证可解。",
      "gpt-image-2 花色、人头、牌背、封面与桌面位图已切分并归档溯源。",
      "已接入点击、拖拽、键盘输入、撤销与自动收牌。",
      "发牌、合法性、超级移动与浏览器通关测试通过。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },
  domainTemplate: {
    id: "solitaire-freecell",
    name: "四空档接龙",
    genre: "纸牌接龙",
    pitch: "用四个空档和空列倒腾整副牌，把 52 张牌按花色从 A 到 K 收齐。",
    coreLoop: "观察牌列 → 倒腾到空档 → 交替叠放 → 收入收牌堆",
    coreRules: ["牌列只能按颜色交替、点数递减叠放", "空档一次只放一张", "一次搬动的张数受空档与空列数量限制", "收牌堆按花色从 A 到 K 收齐即通关"],
    capabilities: ["card-tableau", "free-cells", "supermove", "foundation-build", "seeded-deal", "undo-history"],
    suggestions: commonSuggestions(
      "solitaire-freecell",
      "空档数量、叠放规则、搬动上限和收牌方式保持不变",
      "替换牌面主题、牌背、桌面与开局牌局编号范围。",
      "只加入一种计分或一种限时规则。",
    ),
    redirectExamples: ["对战", "联机", "开放世界", "多人"],
  },
  probeScenario: {
    actions: {
      "inspect-tableau": ["tableau-readable", "free-cells-visible"],
      "stack-illegal": ["stack-rule-blocked"],
      "move-to-cell": ["card-parked-in-cell"],
      "stack-legal": ["alternating-descending-stack"],
      "supermove-over-limit": ["supermove-limit-blocked"],
      "build-foundation": ["foundation-advanced", "session-completed"],
    },
    rejectedActions: ["stack-illegal", "supermove-over-limit"],
    completingActions: ["build-foundation"],
  },
  runtimeDefinition: {
    actions: ["拿起牌组", "放入空档", "收入收牌堆"],
    feedback: ["牌列与空档已显示", "牌已放入空档", "收牌堆推进一张"],
    className: "solitaire",
  },
});
