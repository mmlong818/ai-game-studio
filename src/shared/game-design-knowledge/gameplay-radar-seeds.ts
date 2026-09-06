import type { GameplaySignal } from "./gameplay-radar.js";

const APPLE_DESIGN_2025 = "https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/";
const APPLE_STORE_2025 = "https://www.apple.com/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/";
const GOOGLE_PLAY_2025 = "https://play.google.com/store/apps/editorial?hl=en-US&id=mc_games_cmp_bestof2025_fcp";

export const INITIAL_GAMEPLAY_RADAR_SIGNALS: GameplaySignal[] = [
  {
    gameTitle: "Art of Fauna", sourceTitle: "Apple Design Awards 2025", sourceUrl: APPLE_DESIGN_2025,
    sourceType: "annual-award", platform: "mobile", observedAt: "2026-09-05", publishedAt: "2025-06-03",
    signalSummary: "官方将其列为包容性奖项游戏，并指出视觉重排、文字重排、旁白与触觉反馈可共同构成解谜体验。",
    playerVerbs: ["重排", "阅读"], mechanicTags: ["puzzle", "accessibility", "reorder"],
  },
  {
    gameTitle: "Art of Fauna", sourceTitle: "App Store Awards 2025", sourceUrl: APPLE_STORE_2025,
    sourceType: "annual-award", platform: "mobile", observedAt: "2026-09-05", publishedAt: "2025-12-04",
    signalSummary: "官方文化影响奖再次强调其轻松拼图与无障碍设计，形成跨榜复核信号。",
    playerVerbs: ["重排", "阅读"], mechanicTags: ["puzzle", "accessibility", "reorder"],
  },
  {
    gameTitle: "Pokémon TCG Pocket", sourceTitle: "App Store Awards 2025", sourceUrl: APPLE_STORE_2025,
    sourceType: "annual-award", platform: "mobile", observedAt: "2026-09-05", publishedAt: "2025-12-04",
    signalSummary: "官方强调移动端卡牌对战、视觉表现与适配手机的交互体验。",
    playerVerbs: ["收集", "构筑", "对战"], mechanicTags: ["card", "collection", "turn-based"],
  },
  {
    gameTitle: "Pokémon TCG Pocket", sourceTitle: "Google Play Best Games 2025", sourceUrl: GOOGLE_PLAY_2025,
    sourceType: "editorial-list", platform: "cross-platform", observedAt: "2026-09-05", publishedAt: null,
    signalSummary: "官方年度榜单强调开包、收集与卡牌对战的触感反馈和易上手体验。",
    playerVerbs: ["收集", "构筑", "对战"], mechanicTags: ["card", "collection", "turn-based"],
  },
  {
    gameTitle: "Chants of Sennaar", sourceTitle: "App Store Awards 2025", sourceUrl: APPLE_STORE_2025,
    sourceType: "annual-award", platform: "mobile", observedAt: "2026-09-05", publishedAt: "2025-12-04",
    signalSummary: "官方文化影响奖将语言理解与思考型冒险列为核心价值。",
    playerVerbs: ["观察", "推理", "翻译"], mechanicTags: ["puzzle", "deduction", "language"],
  },
  {
    gameTitle: "Chants of Sennaar", sourceTitle: "Google Play Best Games 2025", sourceUrl: GOOGLE_PLAY_2025,
    sourceType: "editorial-list", platform: "mobile", observedAt: "2026-09-05", publishedAt: null,
    signalSummary: "官方年度榜单将其评为独立游戏代表，提供第二个独立平台的研究触发信号。",
    playerVerbs: ["观察", "推理", "翻译"], mechanicTags: ["puzzle", "deduction", "language"],
  },
];
