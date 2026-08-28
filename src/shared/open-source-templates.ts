export const sourceBackedTemplateIds = [
  "merge-2048",
  "platformer",
  "space-shooter",
  "polyomino-fit",
  "block-place",
  "region-logic",
  "mahjong-roguelite",
] as const;

export type SourceBackedTemplateId = (typeof sourceBackedTemplateIds)[number];

export type OpenSourceTemplateReference = {
  template: SourceBackedTemplateId;
  sourceName: string;
  sourceUrl: string;
  license: "MIT";
  licenseUrl: string;
  integrationMode: "code-port" | "architecture-adaptation";
  importedElements: readonly string[];
  assetPolicy: string;
  verifiedAt: string;
};

export const openSourceTemplateCatalog: Record<SourceBackedTemplateId, OpenSourceTemplateReference> = {
  "merge-2048": {
    template: "merge-2048",
    sourceName: "2048",
    sourceUrl: "https://github.com/gabrielecirulli/2048",
    license: "MIT",
    licenseUrl: "https://github.com/gabrielecirulli/2048/blob/master/LICENSE.txt",
    integrationMode: "code-port",
    importedElements: ["四向遍历顺序", "单次合并标记", "移动后生成新数字块", "无可用移动判定"],
    assetPolicy: "只移植玩法结构；画面、声音和界面由本平台独立制作。",
    verifiedAt: "2026-08-26",
  },
  platformer: {
    template: "platformer",
    sourceName: "Phaser Examples",
    sourceUrl: "https://github.com/phaserjs/examples",
    license: "MIT",
    licenseUrl: "https://github.com/phaserjs/examples#license",
    integrationMode: "architecture-adaptation",
    importedElements: ["场景循环拆分", "平台碰撞", "重力与落地跳跃", "收集物和终点状态"],
    assetPolicy: "仅参考 MIT 源代码模式；上游明确排除的示例资产没有进入交付。",
    verifiedAt: "2026-08-26",
  },
  "space-shooter": {
    template: "space-shooter",
    sourceName: "Radius Raid (js13kGames 2013)",
    sourceUrl: "https://github.com/jackrugile/radius-raid-js13k",
    license: "MIT",
    licenseUrl: "https://github.com/jackrugile/radius-raid-js13k/blob/master/LICENSE.md",
    integrationMode: "code-port",
    importedElements: ["持续帧循环", "敌机波次生成", "弹体与目标碰撞", "生命和击破数结束条件"],
    assetPolicy: "只移植玩法结构；没有复制上游图像和音效。",
    verifiedAt: "2026-08-26",
  },
  "polyomino-fit": {
    template: "polyomino-fit",
    sourceName: "mkgame-poly",
    sourceUrl: "https://github.com/MkThingsHQ/mkgame-poly",
    license: "MIT",
    licenseUrl: "https://github.com/MkThingsHQ/mkgame-poly/blob/main/LICENSE",
    integrationMode: "architecture-adaptation",
    importedElements: ["占位放置状态机", "旋转与合法落点判定", "触控覆盖格放置", "提示与完成判定"],
    assetPolicy: "未复制原 APK 的关卡、拼块表、已知解、图像、音乐或音效；规则、关卡和视听资产均由本平台重制。",
    verifiedAt: "2026-08-27",
  },
  "block-place": {
    template: "block-place",
    sourceName: "mkgame-blocks",
    sourceUrl: "https://github.com/MkThingsHQ/mkgame-blocks",
    license: "MIT",
    licenseUrl: "https://github.com/MkThingsHQ/mkgame-blocks/blob/main/LICENSE",
    integrationMode: "code-port",
    importedElements: ["三选拼块批次", "横竖消行", "连击计分", "种子随机与无解判定"],
    assetPolicy: "只移植 MIT 玩法结构；未复制 Android 应用音频、TanStarter 图标、品牌字标或其他上游媒体。",
    verifiedAt: "2026-08-27",
  },
  "region-logic": {
    template: "region-logic",
    sourceName: "mkgame-sudoku",
    sourceUrl: "https://github.com/MkThingsHQ/mkgame-sudoku",
    license: "MIT",
    licenseUrl: "https://github.com/MkThingsHQ/mkgame-sudoku/blob/main/LICENSE",
    integrationMode: "architecture-adaptation",
    importedElements: ["行列区域独占规则", "相邻禁放", "自动标记", "撤销提示与会话结构"],
    assetPolicy: "未复制 MimoDoku 吉祥物、题库、图标、宣传图或受限音乐；题目由本平台生成器与唯一解求解器产生。",
    verifiedAt: "2026-08-27",
  },
  "mahjong-roguelite": {
    template: "mahjong-roguelite",
    sourceName: "Whatajong",
    sourceUrl: "https://github.com/masylum/whatajong",
    license: "MIT",
    licenseUrl: "https://github.com/masylum/whatajong/blob/main/LICENSE",
    integrationMode: "architecture-adaptation",
    importedElements: ["自由牌遮挡与左右开放判定", "可用对子与无对子判定", "反向放置保证可解牌局", "多回合旅程与局间成长选择"],
    assetPolicy: "未复制 Whatajong 的牌面、字体、背景、音乐、音效、响应式牌阵、商店内容或品牌；规则、牌阵、遗物和视听资产均由本平台重制。",
    verifiedAt: "2026-08-27",
  },
};

export function getOpenSourceTemplateReference(template: string) {
  return template in openSourceTemplateCatalog
    ? openSourceTemplateCatalog[template as SourceBackedTemplateId]
    : null;
}
