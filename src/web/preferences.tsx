import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Languages, SunMoon } from "lucide-react";
import type { GameTemplate } from "../shared/contracts";

export type LocaleSetting = "system" | "zh-CN" | "zh-TW" | "en" | "ja";
export type ResolvedLocale = Exclude<LocaleSetting, "system">;
export type ThemeSetting = "system" | "light" | "dark";

const templateNames: Record<GameTemplate, string> = {
  "signal-hunt": "原创玩法",
  tetris: "俄罗斯方块",
  puzzle: "图片拼图",
  breakout: "打砖块",
  klotski: "华容道",

  snake: "贪吃蛇",
  "merge-2048": "数字合成",
  "space-shooter": "太空射击",
  "polyomino-fit": "多格拼块",
  "block-place": "方块填阵",
  "region-logic": "区域逻辑",
  "mahjong-roguelite": "肉鸽麻将",
  generated: "AI 实验玩法",
};

export const localizedTemplateNames: Record<ResolvedLocale, Record<GameTemplate, string>> = {
  "zh-CN": templateNames,
  "zh-TW": { "signal-hunt": "原創玩法", tetris: "俄羅斯方塊", puzzle: "圖片拼圖", breakout: "打磚塊", klotski: "華容道",snake: "貪食蛇", "merge-2048": "數字合成", "space-shooter": "太空射擊", "polyomino-fit": "多格拼塊", "block-place": "方塊填陣", "region-logic": "區域邏輯", "mahjong-roguelite": "肉鴿麻將", generated: "AI 實驗玩法" },
  en: { "signal-hunt": "Original Game", tetris: "Block Stacker", puzzle: "Image Puzzle", breakout: "Breakout", klotski: "Sliding Blocks",snake: "Snake", "merge-2048": "Number Merge", "space-shooter": "Space Shooter", "polyomino-fit": "Polyomino Fit", "block-place": "Block Placement", "region-logic": "Region Logic", "mahjong-roguelite": "Mahjong Roguelite", generated: "AI Experimental" },
  ja: { "signal-hunt": "オリジナル", tetris: "ブロック落とし", puzzle: "画像パズル", breakout: "ブロック崩し", klotski: "華容道",snake: "スネーク", "merge-2048": "数字合成", "space-shooter": "宇宙シューティング", "polyomino-fit": "ポリオミノ", "block-place": "ブロック配置", "region-logic": "領域ロジック", "mahjong-roguelite": "ローグライク麻雀", generated: "AI実験プレイ" },
};

const zhCN = {
  "a11y.skip": "跳到主要内容",
  "brand.home": "造界首页",
  "brand.name": "造界",
  "nav.create": "创作",
  "nav.gameCreate": "游戏创作",
  "nav.projects": "我的项目",
  "nav.games": "游戏大厅",
  "nav.local": "本机运行",
  "preferences.theme": "外观",
  "preferences.language": "语言",
  "preferences.system": "跟随系统",
  "preferences.light": "浅色",
  "preferences.dark": "深色",
  "preferences.zhCN": "简体中文",
  "preferences.zhTW": "繁體中文",
  "preferences.en": "English",
  "preferences.ja": "日本語",
  "models.trigger": "模型",
  "models.title": "模型与密钥",
  "models.description": "所有游戏必须生成并使用可追溯的 AI 位图；未配置密钥时构建会中断，SVG 不会被接受。",
  "models.available": "可用模型",
  "models.textRole": "游戏设计与代码",
  "models.textDetail": "负责玩法规划、代码生成、修改与质量检查。",
  "models.imageRole": "位图美术与编辑",
  "models.imageDetail": "每次构建至少生成封面和局内背景，并保存模型、用途与完整提示词。",
  "models.keyLabel": "OpenAI API Key",
  "models.security": "密钥只发送到本机服务端，不写入浏览器、数据库、项目或游戏产物；服务重启后会清除。生产环境可使用 OPENAI_API_KEY。",
  "models.unconfigured": "尚未配置密钥 · 无法构建游戏",
  "models.session": "已配置 · 当前服务器会话",
  "models.environment": "已配置 · 服务器环境变量",
  "models.file": "已配置 · 本机密钥文件", "models.textProvider": "文本模型：本机 Claude CLI 订阅额度（{model}）· 图片仍用 OpenAI",
  "models.save": "保存密钥",
  "models.clear": "清除会话密钥",
  "models.close": "关闭模型设置",
  "models.loadFailed": "无法读取模型设置。",
  "models.saveFailed": "无法保存密钥。",
  "models.clearFailed": "无法清除密钥。",
  "home.hero": "把想法变成\n一个能玩的世界。",
  "home.heroDetail": "从一句玩法描述开始，直接进入独立制作页。玩法合同、生成资产、测试证据和交付网址会沿途公开。",
  "create.title": "说出想法，马上开做。",
  "create.detail": "不用先填完整规格。玩法合同、位图美术、声音、代码和测试会在下一页逐步生成。",
  "create.ideaLabel": "描述你的游戏创意",
  "create.ideaPlaceholder": "例如：一只会二段跳的柴犬，在浮岛收集星星并抵达灯塔……",
  "create.uploadPuzzle": "上传图片制作拼图",
  "create.start": "开始制作",
  "create.starting": "正在开工…",
  "create.quick": "快速开始",
  "create.explore3d": "3D 探索",
  "create.settings": "详细设置",
  "create.settingsHint": "玩法、风格、难度、比例与名称",
  "create.templateTitle": "玩法模板",
  "create.templateDetail": "模板只提供稳定骨架，你的描述决定规则和题材。",
  "create.visualTitle": "画面风格",
  "create.visualDetail": "会同时改变布局、组件造型、细节密度和反馈方式。",
  "create.name": "游戏名称",
  "create.optional": "可选",
  "create.namePlaceholder": "系统会自动命名",
  "create.difficulty": "难度",
  "create.relaxed": "轻松",
  "create.standard": "标准",
  "create.challenging": "挑战",
  "create.dimension": "空间形式",
  "create.auto": "自动判断",
  "create.pieces": "拼图块数",
  "create.piecesByDifficulty": "随难度：{count} 块",
  "create.pieceUnit": "{count} 块",
  "create.aspectTitle": "选择游戏画面比例",
  "create.aspectDetail": "这个玩法的视野、关卡和触控布局会被比例明显影响。",
  "create.aspectAuto": "智能推荐 · {ratio}",
  "create.aspectLandscape": "横屏 16:9",
  "create.aspectClassic": "经典 4:3",
  "create.aspectSquare": "方形 1:1",
  "create.aspectPortrait": "竖屏 9:16",
  "create.imageAdded": "图片已加入拼图项目",
  "create.remove": "移除",
  "create.trust": "点击后直接进入独立制作页，自动开始第一版；旧版本不会被覆盖。",
  "projects.count": "你的项目 · {count}",
  "projects.continue": "继续制作",
  "projects.play": "试玩",
  "projects.playNeedsPublish": "发布后可直接试玩",
  "projects.edit": "修改",
  "projects.viewDelivered": "查看已交付游戏",
  "projects.none": "还没有游戏",
  "projects.noneDetail": "在上面说出第一个想法，制作团队已经准备好了。",
  "projects.published": "已发布",
  "projects.playable": "可试玩",
  "projects.contractReady": "合同就绪",
  "projects.loading": "正在读取项目",
  "projects.coverAlt": "{title}封面",
  "projects.views": "项目视图",
  "projects.active": "进行中的项目",
  "projects.archiveBox": "归档",
  "projects.archive": "归档项目",
  "projects.archived": "已归档",
  "projects.restore": "恢复项目",
  "projects.delete": "永久删除",
  "projects.view": "查看记录",
  "projects.archiveEmpty": "归档是空的",
  "projects.archiveEmptyDetail": "归档后的项目会集中出现在这里，并可恢复或永久删除。",
  "projects.archiveFailed": "项目归档失败。",
  "projects.restoreFailed": "项目恢复失败。",
  "projects.deleteFailed": "项目永久删除失败。",
  "projects.deleteTitle": "永久删除这个项目？",
  "projects.deleteDetail": "“{title}”将从造界中彻底移除，此操作无法撤销。",
  "projects.deleteScopeTitle": "将被删除",
  "projects.deleteScope": "项目资料、玩法合同、制作对话、构建历史、版本记录与生成文件。已经分享的项目和版本网址也会失效。",
  "projects.deleteCancel": "保留项目",
  "projects.deleteConfirm": "永久删除项目",
  "footer.studio": "造界 · AI 游戏工坊",
  "footer.proof": "可追溯构建 · 不可变版本 · 独立网址",
  "footer.maintenance": "本系统由 云一工作室 开发维护。",
  "library.eyebrow": "可玩档案 · 已交付作品",
  "library.hero": "每个世界，\n都有自己的入口。",
  "library.count": "款已发布游戏",
  "library.detail": "这里不展示草稿、失败构建或尚未发布的预览。每个入口都来自数据库中的在线交付记录。",
  "library.version": "版本",
  "library.publishedAt": "发布",
  "library.play": "开始游戏",
  "library.continue": "继续游戏",
  "library.replay": "再次挑战",
  "library.playStatus": "游玩状态",
  "library.completed": "已完成",
  "library.recent": "最近玩过",
  "library.newVersion": "有新版本",
  "library.best": "最佳 {score}",
  "library.format": "形式",
  "library.session": "预计单局",
  "library.minutes": "约 {count} 分钟",
  "library.coverUnavailable": "封面暂时无法加载",
  "library.difficulty": "难度",
  "library.difficultyRelaxed": "轻松",
  "library.difficultyStandard": "标准",
  "library.difficultyChallenging": "挑战",
  "library.input": "操作",
  "library.inputKeyboard": "键盘",
  "library.inputPointer": "鼠标",
  "library.inputTouch": "触控",
  "library.list": "已发布游戏列表",
  "library.loading": "正在读取已交付游戏",
  "library.none": "还没有已发布游戏",
  "library.noneDetail": "在创作工作台完成构建并发布后，游戏会自动出现在这里。",
  "library.back": "返回创作工作台",
  "library.footer": "造界游戏大厅",
  "library.footerDetail": "只展示已交付、可直接打开的稳定版本",
  "library.searchPlaceholder": "搜索游戏名或玩法…",
  "library.searchLabel": "搜索游戏",
  "library.categories": "按玩法筛选",
  "library.filterAll": "全部",
  "library.noResults": "没有找到匹配的游戏",
  "library.noResultsDetail": "换个关键词，或者清除筛选条件看看全部游戏。",
  "library.clearFilters": "清除筛选",
  "library.template.signal-hunt": "信号寻踪",
  "library.template.tetris": "俄罗斯方块",
  "library.template.puzzle": "图片拼图",
  "library.template.breakout": "打砖块",
  "library.template.klotski": "华容道",

  "library.template.snake": "贪吃蛇",
  "library.template.merge-2048": "数字合成",
  "library.template.space-shooter": "太空射击",
  "library.template.polyomino-fit": "多格拼块",
  "library.template.block-place": "方块填阵",
  "library.template.region-logic": "区域逻辑",
  "library.template.mahjong-roguelite": "肉鸽麻将",
  "library.template.generated": "自由创想",
  "studio.back": "游戏",
  "studio.loading": "读取中",
  "studio.buildQueued": "等待开始",
  "studio.building": "制作中",
  "studio.buildReady": "版本就绪",
  "studio.buildFailed": "构建中断",
  "studio.build": "启动构建",
  "studio.rebuild": "重新构建",
  "studio.newBuild": "构建新版本",
  "studio.publish": "发布",
  "studio.publishFailed": "版本发布没有完成。",
  "studio.versionHistory": "版本与发布",
  "studio.onlineVersion": "当前在线版本",
  "studio.publishVersion": "发布此版",
  "studio.currentOnline": "在线",
  "studio.quality.legacy": "旧版未验收",
  "studio.quality.pending": "等待质量验收",
  "studio.quality.passed": "质量验收通过",
  "studio.quality.failed": "质量验收失败",
  "studio.approveArt": "主美通过",
  "studio.artPassed": "主美复核通过",
  "studio.artFailed": "主美复核未通过",
  "studio.artReviewEvidence": "已复核主体清晰度、构图、资产一致性、画幅适配和宣传图一致性。",
  "studio.artReviewFailed": "主美复核没有保存。",
  "studio.olderVersions": "查看更早的 {count} 个版本",
  "studio.play": "试玩",
  "studio.desktop": "桌面",
  "studio.mobile": "手机",
  "studio.previewSize": "预览尺寸",
  "studio.refresh": "刷新游戏预览",
  "studio.open": "在新窗口打开游戏",
  "studio.fullscreen": "全屏预览",
  "studio.previewTitle": "{title}试玩预览",
  "studio.previewEmpty": "游戏生成后在这里直接玩",
  "studio.previewEmptyDetail": "真实构建产物会自动载入，不用离开制作页。",
  "studio.aspect": "设计画幅 {ratio}",
  "studio.contract": "玩法合同",
  "studio.passed": "{passed}/{total} 通过",
  "studio.genre": "类型",
  "studio.session": "单局时长",
  "studio.win": "胜利条件",
  "studio.visual": "视觉系统",
  "studio.aspectFact": "画面比例",
  "studio.loop": "核心循环",
  "studio.contractDetails": "规则、难度与验收标准",
  "studio.controls": "操作",
  "studio.difficultyCurve": "难度曲线",
  "studio.resources.title": "资源准备",
  "studio.resources.summary": "已自动复用 {reusable} 项；系统将补齐 {generation} 项；需关注 {review} 项。",
  "studio.constraints": "必须遵守",
  "studio.waitBuild": "等待启动构建",
  "studio.waitBuildDetail": "启动后，文档、代码、资产、测试和交付产出会按顺序出现在这里。",
  "studio.confirm.title": "确认玩法合同",
  "studio.confirm.sourceLabel": "理解方式",
  "studio.confirm.sourceLlm": "AI 解析",
  "studio.confirm.sourceHeuristic": "关键词识别",
  "studio.confirm.sourceFallback": "AI 失败已回退",
  "studio.confirm.confidence": "置信度 {value}%",
  "studio.confirm.fallbackNote": "AI 解析未成功，已使用关键词识别作为后备：{reason}",
  "studio.confirm.mechanics": "识别到的机制",
  "studio.confirm.designLlm": "AI 定制设计",
  "studio.confirm.experimental": "该玩法没有成熟模板承载,将由 AI 直接生成独有代码并通过安全扫描与真实浏览器契约验收;属于实验性作品,玩法深度以实际试玩为准。",
  "studio.fantasy": "玩家幻想",
  "studio.confirm.cta": "确认合同，开始制作",
  "studio.confirm.note": "开始后将生成文档、代码、资产，并执行自动验收。",
  "studio.design.summary": "完整游戏设计摘要",
  "studio.design.learning": "玩家先学什么",
  "studio.design.progression": "如何逐步变难",
  "studio.design.assistance": "失败后怎样帮助",
  "studio.design.variation": "每阶段有什么变化",
  "studio.steps": "制作步骤与产出",
  "studio.rawError": "错误原文",
  "studio.delivery": "已交付网址",
  "studio.playerUrl": "玩家网址",
  "studio.versionUrl": "版本网址",
  "studio.copy": "复制{label}",
  "studio.journal": "制作记录",
  "studio.productionPulse": "制作动态",
  "studio.creatorBrief": "创意摘要",
  "studio.creatorBriefFacts": "创意摘要信息",
  "studio.stageLane": "制作过程",
  "studio.stageCount": "{completed}/{total} 阶段",
  "studio.stageEvidence": "步骤产出",
  "studio.currentResult": "当前结论",
  "studio.directionLog": "修改意见",
  "studio.directionCount": "{count} 条",
  "studio.directionTitle": "下一步修改",
  "studio.directionHint": "说明希望保留或改变的内容。",
  "studio.discuss": "可继续讨论",
  "studio.you": "你",
  "studio.intro": "我先把想法整理成可检查的玩法合同。代码、视觉资产和测试都会以它为共同依据。",
  "studio.readingJournal": "正在读取制作记录…",
  "studio.messageLabel": "描述下一步想修改什么",
  "studio.messagePlaceholder": "描述下一步想修改什么…",
  "studio.send": "发送制作意见",
  "studio.messageNote": "意见会保存到项目，不会覆盖当前版本。",
  "studio.contractSaved": "玩法合同已保存。核对规则后，可以启动第一版构建。",
  "studio.queued": "制作任务已经排队，即将生成文档、代码、资产、测试和版本。",
  "studio.runningStep": "正在执行“{title}”：{detail}",
  "studio.runningNext": "正在准备下一项制作步骤。",
  "studio.failedText": "本次构建已中断：{error}",
  "studio.noError": "没有收到可读的错误说明。",
  "studio.succeededText": "可玩版本已经生成，{count} 个制作步骤已完成。预览区可以直接试玩。",
  "studio.progress": "制作进度 {progress}%",
  "studio.loadingPage": "正在打开制作台…",
  "studio.backProjects": "返回项目列表",
  "studio.archivedNotice": "这个项目已归档。内容仍可查看，但需要恢复后才能继续制作或发布。",
  "studio.archivedNote": "项目已归档；恢复后才能发送新的制作意见。",
  "notFound.title": "这个入口还没有被创造。",
  "notFound.detail": "网址可能已经变更。返回创作工作台继续项目，或者去游戏大厅打开一个已交付版本。",
  "notFound.back": "返回创作工作台",
  "notFound.games": "前往游戏大厅",
} as const;

export type MessageKey = keyof typeof zhCN;
type MessageTable = Record<MessageKey, string>;

const zhTW: MessageTable = {
  ...zhCN,
  "library.continue": "繼續遊戲", "library.replay": "再次挑戰", "library.playStatus": "遊玩狀態", "library.completed": "已完成", "library.recent": "最近玩過", "library.newVersion": "有新版本", "library.best": "最佳 {score}", "library.format": "形式", "library.session": "預計單局", "library.minutes": "約 {count} 分鐘", "library.coverUnavailable": "封面暫時無法載入", "library.difficulty": "難度", "library.difficultyRelaxed": "輕鬆", "library.difficultyStandard": "標準", "library.difficultyChallenging": "挑戰", "library.input": "操作", "library.inputKeyboard": "鍵盤", "library.inputPointer": "滑鼠", "library.inputTouch": "觸控",
  "studio.publishFailed": "版本發佈未完成。", "studio.versionHistory": "版本與發佈", "studio.onlineVersion": "目前線上版本", "studio.publishVersion": "發佈此版本", "studio.currentOnline": "線上", "studio.quality.legacy": "舊版未驗收", "studio.quality.pending": "等待品質驗收", "studio.quality.passed": "品質驗收通過", "studio.quality.failed": "品質驗收失敗", "studio.approveArt": "主美通過", "studio.artPassed": "主美複核通過", "studio.artFailed": "主美複核未通過", "studio.artReviewEvidence": "已複核主體清晰度、構圖、資產一致性、畫幅適配和宣傳圖一致性。", "studio.artReviewFailed": "主美複核未儲存。", "studio.olderVersions": "查看較早的 {count} 個版本",
  "a11y.skip": "跳到主要內容", "brand.home": "造界首頁", "nav.create": "創作", "nav.gameCreate": "遊戲創作", "nav.projects": "我的專案", "nav.games": "遊戲大廳", "nav.local": "本機執行",
  "preferences.theme": "外觀", "preferences.language": "語言", "preferences.system": "跟隨系統", "preferences.light": "淺色", "preferences.dark": "深色",
  "models.trigger": "模型", "models.title": "模型與金鑰", "models.description": "所有遊戲都必須生成並使用可追溯的 AI 點陣圖；未設定金鑰時會中斷構建，SVG 不會被接受。", "models.available": "可用模型", "models.textRole": "遊戲設計與程式碼", "models.textDetail": "負責玩法規劃、程式碼生成、修改與品質檢查。", "models.imageRole": "點陣美術與編輯", "models.imageDetail": "每次構建至少生成封面和局內背景，並保存模型、用途與完整提示詞。", "models.keyLabel": "OpenAI API Key", "models.security": "金鑰只傳送到本機服務端，不寫入瀏覽器、資料庫、專案或遊戲產物；服務重啟後會清除。正式環境可使用 OPENAI_API_KEY。", "models.unconfigured": "尚未設定金鑰 · 無法構建遊戲", "models.session": "已設定 · 目前服務器工作階段", "models.environment": "已設定 · 服務器環境變數", "models.file": "已設定 · 本機金鑰檔案", "models.textProvider": "文字模型：本機 Claude CLI 訂閱額度（{model}）· 圖片仍用 OpenAI", "models.save": "儲存金鑰", "models.clear": "清除工作階段金鑰", "models.close": "關閉模型設定", "models.loadFailed": "無法讀取模型設定。", "models.saveFailed": "無法儲存金鑰。", "models.clearFailed": "無法清除金鑰。",
  "studio.productionPulse": "製作動態", "studio.creatorBrief": "創意摘要", "studio.creatorBriefFacts": "創意摘要資訊", "studio.stageLane": "製作過程", "studio.stageCount": "{completed}/{total} 階段", "studio.stageEvidence": "步驟產出", "studio.currentResult": "目前結論", "studio.directionLog": "修改意見", "studio.directionCount": "{count} 條", "studio.directionTitle": "下一步修改", "studio.directionHint": "說明希望保留或改變的內容。",
  "home.hero": "把想法變成\n一個能玩的世界。", "home.heroDetail": "從一句玩法描述開始，直接進入獨立製作頁。玩法合約、生成資產、測試證據和交付網址會沿途公開。",
  "create.title": "說出想法，馬上開做。", "create.detail": "不用先填完整規格。玩法合約、點陣美術、聲音、程式碼和測試會在下一頁逐步生成。",
  "create.ideaLabel": "描述你的遊戲創意", "create.ideaPlaceholder": "例如：一隻會二段跳的柴犬，在浮島收集星星並抵達燈塔……", "create.uploadPuzzle": "上傳圖片製作拼圖",
  "create.start": "開始製作", "create.starting": "正在開工…", "create.quick": "快速開始", "create.settings": "詳細設定", "create.settingsHint": "玩法、風格、難度、比例與名稱",
  "create.templateTitle": "玩法範本", "create.templateDetail": "範本只提供穩定骨架，你的描述決定規則和題材。", "create.visualTitle": "畫面風格", "create.visualDetail": "會同時改變版面、元件造型、細節密度和回饋方式。",
  "create.name": "遊戲名稱", "create.optional": "可選", "create.namePlaceholder": "系統會自動命名", "create.difficulty": "難度", "create.relaxed": "輕鬆", "create.challenging": "挑戰", "create.dimension": "空間形式", "create.auto": "自動判斷",
  "create.pieces": "拼圖塊數", "create.piecesByDifficulty": "隨難度：{count} 塊", "create.pieceUnit": "{count} 塊", "create.aspectTitle": "選擇遊戲畫面比例", "create.aspectDetail": "這個玩法的視野、關卡和觸控版面會被比例明顯影響。", "create.aspectAuto": "智慧推薦 · {ratio}", "create.aspectLandscape": "橫屏 16:9", "create.aspectClassic": "經典 4:3", "create.aspectSquare": "方形 1:1", "create.aspectPortrait": "直屏 9:16",
  "create.imageAdded": "圖片已加入拼圖專案", "create.remove": "移除", "create.trust": "點擊後直接進入獨立製作頁，自動開始第一版；舊版本不會被覆蓋。",
  "projects.count": "你的專案 · {count}", "projects.continue": "繼續製作", "projects.play": "試玩", "projects.playNeedsPublish": "發佈後可直接試玩", "projects.edit": "修改", "projects.viewDelivered": "查看已交付遊戲", "projects.none": "還沒有遊戲", "projects.noneDetail": "在上面說出第一個想法，製作團隊已經準備好了。", "projects.published": "已發佈", "projects.playable": "可試玩", "projects.contractReady": "合約就緒", "projects.loading": "正在讀取專案", "projects.coverAlt": "{title}封面", "projects.views": "專案檢視", "projects.active": "進行中的專案", "projects.archiveBox": "封存", "projects.archive": "封存專案", "projects.archived": "已封存", "projects.restore": "恢復專案", "projects.delete": "永久刪除", "projects.view": "查看記錄", "projects.archiveEmpty": "封存是空的", "projects.archiveEmptyDetail": "封存後的專案會集中顯示在這裡，並可恢復或永久刪除。", "projects.archiveFailed": "專案封存失敗。", "projects.restoreFailed": "專案恢復失敗。", "projects.deleteFailed": "專案永久刪除失敗。", "projects.deleteTitle": "永久刪除這個專案？", "projects.deleteDetail": "「{title}」將從造界中徹底移除，此操作無法復原。", "projects.deleteScopeTitle": "將被刪除", "projects.deleteScope": "專案資料、玩法合約、製作對話、建置歷史、版本記錄與生成檔案。已分享的專案和版本網址也會失效。", "projects.deleteCancel": "保留專案", "projects.deleteConfirm": "永久刪除專案",
  "footer.proof": "可追溯建置 · 不可變版本 · 獨立網址", "footer.maintenance": "本系統由 云一工作室 開發維護。", "library.eyebrow": "可玩檔案 · 已交付作品", "library.hero": "每個世界，\n都有自己的入口。", "library.count": "款已發佈遊戲", "library.detail": "這裡不展示草稿、失敗建置或尚未發佈的預覽。每個入口都來自資料庫中的線上交付記錄。", "library.publishedAt": "發佈", "library.play": "開始遊戲", "library.list": "已發佈遊戲列表", "library.loading": "正在讀取已交付遊戲", "library.none": "還沒有已發佈遊戲", "library.noneDetail": "在創作工作台完成建置並發佈後，遊戲會自動出現在這裡。", "library.back": "返回創作工作台", "library.footer": "造界遊戲大廳", "library.footerDetail": "只展示已交付、可直接開啟的穩定版本",
  "library.searchPlaceholder": "搜尋遊戲名或玩法…", "library.searchLabel": "搜尋遊戲", "library.categories": "依玩法篩選", "library.filterAll": "全部", "library.noResults": "沒有找到符合的遊戲", "library.noResultsDetail": "換個關鍵字，或清除篩選條件看看全部遊戲。", "library.clearFilters": "清除篩選", "library.template.signal-hunt": "信號尋蹤", "library.template.tetris": "俄羅斯方塊", "library.template.puzzle": "圖片拼圖", "library.template.breakout": "打磚塊", "library.template.klotski": "華容道","library.template.snake": "貪吃蛇", "library.template.merge-2048": "數字合成", "library.template.space-shooter": "太空射擊", "library.template.polyomino-fit": "多格拼塊", "library.template.block-place": "方塊填陣", "library.template.region-logic": "區域邏輯", "library.template.mahjong-roguelite": "肉鴿麻將", "library.template.generated": "自由創想",
  "studio.back": "遊戲", "studio.loading": "讀取中", "studio.buildQueued": "等待開始", "studio.building": "製作中", "studio.buildReady": "版本就緒", "studio.buildFailed": "建置中斷", "studio.build": "啟動建置", "studio.rebuild": "重新建置", "studio.newBuild": "建置新版本", "studio.publish": "發佈", "studio.play": "試玩", "studio.desktop": "桌面", "studio.mobile": "手機", "studio.previewSize": "預覽尺寸", "studio.refresh": "重新整理遊戲預覽", "studio.open": "在新視窗開啟遊戲", "studio.fullscreen": "全螢幕預覽", "studio.previewTitle": "{title}試玩預覽", "studio.previewEmpty": "遊戲生成後在這裡直接玩", "studio.previewEmptyDetail": "真實建置產物會自動載入，不用離開製作頁。", "studio.aspect": "設計畫幅 {ratio}", "studio.contract": "玩法合約", "studio.passed": "{passed}/{total} 通過", "studio.session": "單局時長", "studio.win": "勝利條件", "studio.visual": "視覺系統", "studio.aspectFact": "畫面比例", "studio.loop": "核心循環", "studio.contractDetails": "規則、難度與驗收標準", "studio.controls": "操作", "studio.difficultyCurve": "難度曲線", "studio.constraints": "必須遵守", "studio.waitBuild": "等待啟動建置", "studio.waitBuildDetail": "啟動後，文件、程式碼、資產、測試和交付產出會依序出現在這裡。", "studio.confirm.title": "確認玩法合約", "studio.confirm.sourceLabel": "理解方式", "studio.confirm.sourceLlm": "AI 解析", "studio.confirm.sourceHeuristic": "關鍵字識別", "studio.confirm.sourceFallback": "AI 失敗已回退", "studio.confirm.confidence": "信心度 {value}%", "studio.confirm.fallbackNote": "AI 解析未成功，已使用關鍵字識別作為後備：{reason}", "studio.confirm.mechanics": "識別到的機制", "studio.confirm.designLlm": "AI 定制設計", "studio.confirm.experimental": "該玩法沒有成熟範本承載,將由 AI 直接生成獨有程式碼並通過安全掃描與真實瀏覽器契約驗收;屬於實驗性作品,玩法深度以實際試玩為準。", "studio.fantasy": "玩家幻想", "studio.confirm.cta": "確認合約，開始製作", "studio.confirm.note": "啟動後將生成文件、程式碼、資產，並執行自動驗收。", "studio.steps": "製作步驟與產出", "studio.rawError": "錯誤原文", "studio.delivery": "已交付網址", "studio.playerUrl": "玩家網址", "studio.versionUrl": "版本網址", "studio.copy": "複製{label}", "studio.journal": "製作記錄", "studio.discuss": "可繼續討論", "studio.you": "你", "studio.intro": "我先把想法整理成可檢查的玩法合約。程式碼、視覺資產和測試都會以它為共同依據。", "studio.readingJournal": "正在讀取製作記錄…", "studio.messageLabel": "描述下一步想修改什麼", "studio.messagePlaceholder": "描述下一步想修改什麼…", "studio.send": "傳送製作意見", "studio.messageNote": "意見會儲存到專案，不會覆蓋目前版本。", "studio.contractSaved": "玩法合約已儲存。核對規則後，可以啟動第一版建置。", "studio.queued": "製作任務已經排隊，即將生成文件、程式碼、資產、測試和版本。", "studio.runningStep": "正在執行「{title}」：{detail}", "studio.runningNext": "正在準備下一項製作步驟。", "studio.failedText": "本次建置已中斷：{error}", "studio.noError": "沒有收到可讀的錯誤說明。", "studio.succeededText": "可玩版本已經生成，{count} 個製作步驟已完成。預覽區可以直接試玩。", "studio.progress": "製作進度 {progress}%", "studio.loadingPage": "正在開啟製作台…", "studio.backProjects": "返回專案列表", "studio.archivedNotice": "此專案已封存。內容仍可查看，但恢復後才能繼續製作或發佈。", "studio.archivedNote": "專案已封存；恢復後才能傳送新的製作意見。",
  "notFound.title": "這個入口還沒有被創造。", "notFound.detail": "網址可能已經變更。返回創作工作台繼續專案，或者去遊戲大廳開啟一個已交付版本。", "notFound.back": "返回創作工作台", "notFound.games": "前往遊戲大廳",
};

const en: MessageTable = {
  ...zhCN,
  "library.continue": "Continue", "library.replay": "Play again", "library.playStatus": "Play status", "library.completed": "Completed", "library.recent": "Recently played", "library.newVersion": "New version", "library.best": "Best {score}", "library.format": "Format", "library.session": "Session", "library.minutes": "About {count} min", "library.coverUnavailable": "Cover unavailable", "library.difficulty": "Difficulty", "library.difficultyRelaxed": "Relaxed", "library.difficultyStandard": "Standard", "library.difficultyChallenging": "Challenging", "library.input": "Input", "library.inputKeyboard": "Keyboard", "library.inputPointer": "Pointer", "library.inputTouch": "Touch",
  "studio.publishFailed": "The version was not published.", "studio.versionHistory": "Versions & Publishing", "studio.onlineVersion": "Current live version", "studio.publishVersion": "Publish version", "studio.currentOnline": "Live", "studio.quality.legacy": "Legacy · not verified", "studio.quality.pending": "Quality review pending", "studio.quality.passed": "Quality review passed", "studio.quality.failed": "Quality review failed", "studio.approveArt": "Approve art", "studio.artPassed": "Art review passed", "studio.artFailed": "Art review failed", "studio.artReviewEvidence": "Reviewed focal clarity, composition, asset consistency, aspect adaptation, and cover-to-game consistency.", "studio.artReviewFailed": "The art review was not saved.", "studio.olderVersions": "Show {count} earlier versions",
  "a11y.skip": "Skip to main content", "brand.home": "Forge home", "brand.name": "Forge", "nav.create": "Create", "nav.gameCreate": "Game Creation", "nav.projects": "My Projects", "nav.games": "Game Library", "nav.local": "Local",
  "preferences.theme": "Appearance", "preferences.language": "Language", "preferences.system": "Use system", "preferences.light": "Light", "preferences.dark": "Dark", "preferences.zhCN": "简体中文", "preferences.zhTW": "繁體中文",
  "models.trigger": "Models", "models.title": "Models & API Key", "models.description": "Every game must generate and use traceable AI bitmaps. Builds stop without a key, and SVG is rejected.", "models.available": "Available models", "models.textRole": "Game design & code", "models.textDetail": "Plans gameplay, generates and revises code, and performs quality checks.", "models.imageRole": "Bitmap art & editing", "models.imageDetail": "Every build generates at least a cover and in-game background and records the model, role, and full prompt.", "models.keyLabel": "OpenAI API Key", "models.security": "The key is sent only to the local server. It is not written to the browser, database, project, or game output, and is cleared on restart. Use OPENAI_API_KEY in production.", "models.unconfigured": "API key not configured · builds unavailable", "models.session": "Configured · current server session", "models.environment": "Configured · server environment", "models.file": "Configured · local key file", "models.textProvider": "Text model: local Claude CLI subscription ({model}) · images still use OpenAI", "models.save": "Save key", "models.clear": "Clear session key", "models.close": "Close model settings", "models.loadFailed": "Could not load model settings.", "models.saveFailed": "Could not save the key.", "models.clearFailed": "Could not clear the key.",
  "studio.productionPulse": "Build Activity", "studio.creatorBrief": "Idea Summary", "studio.creatorBriefFacts": "Idea summary facts", "studio.stageLane": "Build Process", "studio.stageCount": "{completed}/{total} stages", "studio.stageEvidence": "Step Output", "studio.currentResult": "Current Outcome", "studio.directionLog": "Change Notes", "studio.directionCount": "{count} notes", "studio.directionTitle": "Next Change", "studio.directionHint": "Describe what you want to preserve or change.",
  "home.hero": "Turn an idea into\na world you can play.", "home.heroDetail": "Start with one gameplay sentence and move directly into a dedicated build page. The contract, assets, test evidence, and delivery URL stay visible throughout.",
  "create.title": "Describe it. Start building.", "create.detail": "You do not need a complete spec. The gameplay contract, bitmap art, sound, code, and tests are created step by step on the next page.", "create.ideaLabel": "Describe your game idea", "create.ideaPlaceholder": "Example: A double-jumping shiba crosses floating islands, collects stars, and reaches a lighthouse…", "create.uploadPuzzle": "Upload an image for a puzzle", "create.start": "Start Building", "create.starting": "Starting…", "create.quick": "Quick Start", "create.explore3d": "3D Explore", "create.settings": "Detailed Settings", "create.settingsHint": "Gameplay, style, difficulty, ratio, and name", "create.templateTitle": "Gameplay Template", "create.templateDetail": "Templates provide a stable foundation; your description defines the rules and theme.", "create.visualTitle": "Visual Style", "create.visualDetail": "Changes layout, component shapes, detail density, and feedback—not only color.", "create.name": "Game Name", "create.optional": "Optional", "create.namePlaceholder": "Named automatically", "create.difficulty": "Difficulty", "create.relaxed": "Relaxed", "create.standard": "Standard", "create.challenging": "Challenging", "create.dimension": "World Type", "create.auto": "Auto", "create.pieces": "Puzzle Pieces", "create.piecesByDifficulty": "By difficulty: {count}", "create.pieceUnit": "{count} pieces", "create.aspectTitle": "Choose the Game Ratio", "create.aspectDetail": "This gameplay's visibility, level design, and touch layout change materially with the ratio.", "create.aspectAuto": "Recommended · {ratio}", "create.aspectLandscape": "Landscape 16:9", "create.aspectClassic": "Classic 4:3", "create.aspectSquare": "Square 1:1", "create.aspectPortrait": "Portrait 9:16", "create.imageAdded": "Image added to the puzzle project", "create.remove": "Remove", "create.trust": "You will enter a dedicated build page and the first version starts automatically. Existing versions are never overwritten.",
  "projects.count": "YOUR PROJECTS · {count}", "projects.continue": "Continue Building", "projects.play": "Play", "projects.playNeedsPublish": "Playable after publishing", "projects.edit": "Edit", "projects.viewDelivered": "View Delivered Games", "projects.none": "No games yet", "projects.noneDetail": "Describe your first idea above. The build team is ready.", "projects.published": "Published", "projects.playable": "Playable", "projects.contractReady": "Contract Ready", "projects.loading": "Loading projects", "projects.coverAlt": "{title} cover", "projects.views": "Project views", "projects.active": "Active projects", "projects.archiveBox": "Archive", "projects.archive": "Archive project", "projects.archived": "Archived", "projects.restore": "Restore project", "projects.delete": "Delete permanently", "projects.view": "View record", "projects.archiveEmpty": "The archive is empty", "projects.archiveEmptyDetail": "Archived projects appear here and can be restored or permanently deleted.", "projects.archiveFailed": "Could not archive the project.", "projects.restoreFailed": "Could not restore the project.", "projects.deleteFailed": "Could not permanently delete the project.", "projects.deleteTitle": "Permanently delete this project?", "projects.deleteDetail": "“{title}” will be completely removed from Forge. This cannot be undone.", "projects.deleteScopeTitle": "This will delete", "projects.deleteScope": "Project data, gameplay contract, build conversation, build history, versions, and generated files. Shared project and version URLs will stop working.", "projects.deleteCancel": "Keep project", "projects.deleteConfirm": "Delete project permanently",
  "footer.studio": "Forge · AI Game Studio", "footer.proof": "Traceable builds · Immutable versions · Dedicated URLs", "footer.maintenance": "Developed and maintained by Yunyi Studio.", "library.eyebrow": "PLAYABLE ARCHIVE · DELIVERED WORK", "library.hero": "Every world has\nits own entrance.", "library.count": "published games", "library.detail": "Drafts, failed builds, and unpublished previews stay out. Every link comes from a live delivery record in the database.", "library.version": "Version", "library.publishedAt": "Published", "library.play": "Play Game", "library.list": "Published games", "library.loading": "Loading delivered games", "library.none": "No published games yet", "library.noneDetail": "Finish and publish a build in the studio. It will appear here automatically.", "library.back": "Back to Studio", "library.footer": "Forge Game Library", "library.footerDetail": "Only stable, delivered games that open directly",
  "library.searchPlaceholder": "Search games or gameplay…", "library.searchLabel": "Search games", "library.categories": "Filter by gameplay", "library.filterAll": "All", "library.noResults": "No matching games", "library.noResultsDetail": "Try another keyword, or clear the filters to see everything.", "library.clearFilters": "Clear filters", "library.template.signal-hunt": "Signal Hunt", "library.template.tetris": "Tetris", "library.template.puzzle": "Jigsaw Puzzle", "library.template.breakout": "Breakout", "library.template.klotski": "Klotski","library.template.snake": "Snake", "library.template.merge-2048": "2048 Merge", "library.template.space-shooter": "Space Shooter", "library.template.polyomino-fit": "Polyomino Fit", "library.template.block-place": "Block Place", "library.template.region-logic": "Region Logic", "library.template.mahjong-roguelite": "Mahjong Roguelite", "library.template.generated": "Free Creation",
  "studio.back": "Games", "studio.loading": "Loading", "studio.buildQueued": "Queued", "studio.building": "Building", "studio.buildReady": "Version Ready", "studio.buildFailed": "Build Interrupted", "studio.build": "Start Build", "studio.rebuild": "Rebuild", "studio.newBuild": "Build New Version", "studio.publish": "Publish", "studio.play": "Play", "studio.desktop": "Desktop", "studio.mobile": "Mobile", "studio.previewSize": "Preview size", "studio.refresh": "Refresh game preview", "studio.open": "Open game in a new window", "studio.fullscreen": "Fullscreen preview", "studio.previewTitle": "{title} playable preview", "studio.previewEmpty": "Play the game here after it is built", "studio.previewEmptyDetail": "The real build loads automatically without leaving this page.", "studio.aspect": "DESIGNED FOR {ratio}", "studio.contract": "Gameplay Contract", "studio.passed": "{passed}/{total} passed", "studio.genre": "Genre", "studio.session": "Session", "studio.win": "Win Condition", "studio.visual": "Visual System", "studio.aspectFact": "Game Ratio", "studio.loop": "Core Loop", "studio.contractDetails": "Rules, Difficulty & Acceptance", "studio.controls": "Controls", "studio.difficultyCurve": "Difficulty Curve", "studio.constraints": "Required", "studio.waitBuild": "Waiting to Start", "studio.waitBuildDetail": "Documents, code, assets, tests, and delivery outputs appear here in sequence after the build starts.", "studio.confirm.title": "Confirm the Gameplay Contract", "studio.confirm.sourceLabel": "Understood via", "studio.confirm.sourceLlm": "AI analysis", "studio.confirm.sourceHeuristic": "Keyword matching", "studio.confirm.sourceFallback": "AI failed · fell back", "studio.confirm.confidence": "Confidence {value}%", "studio.confirm.fallbackNote": "AI analysis did not succeed; keyword matching was used as a fallback: {reason}", "studio.confirm.mechanics": "Detected mechanics", "studio.confirm.designLlm": "AI-tailored design", "studio.confirm.experimental": "No mature template can carry this gameplay. The code will be generated directly by AI, pass a security scan and a real-browser contract check. This is an experimental piece — judge depth by actually playing it.", "studio.fantasy": "Player Fantasy", "studio.confirm.cta": "Confirm & Start Building", "studio.confirm.note": "Starting will generate documents, code, and assets, and run automated acceptance checks.", "studio.steps": "Build Steps & Outputs", "studio.rawError": "Raw Error", "studio.delivery": "Delivery URLs", "studio.playerUrl": "Player URL", "studio.versionUrl": "Version URL", "studio.copy": "Copy {label}", "studio.journal": "Build Journal", "studio.discuss": "Open for Discussion", "studio.you": "You", "studio.intro": "I turned the idea into an inspectable gameplay contract first. Code, visual assets, and tests all use it as their shared source of truth.", "studio.readingJournal": "Loading build journal…", "studio.messageLabel": "Describe what to change next", "studio.messagePlaceholder": "Describe what to change next…", "studio.send": "Send build direction", "studio.messageNote": "Your direction is saved to the project and never overwrites the current version.", "studio.contractSaved": "The gameplay contract is saved. Review the rules, then start the first build.", "studio.queued": "The build is queued. Documents, code, assets, tests, and a version are next.", "studio.runningStep": "Running “{title}”: {detail}", "studio.runningNext": "Preparing the next build step.", "studio.failedText": "This build stopped: {error}", "studio.noError": "No readable error message was returned.", "studio.succeededText": "A playable version is ready. {count} build steps completed. Play it in the preview.", "studio.progress": "Build progress {progress}%", "studio.loadingPage": "Opening the studio…", "studio.backProjects": "Back to Projects", "studio.archivedNotice": "This project is archived. You can still review it, but restore it before building or publishing.", "studio.archivedNote": "This project is archived. Restore it before sending new build direction.",
  "notFound.title": "This entrance has not been created yet.", "notFound.detail": "The URL may have changed. Return to the studio, or open a delivered version in the game library.", "notFound.back": "Back to Studio", "notFound.games": "Go to Game Library",
};

const ja: MessageTable = {
  ...en,
  "library.continue": "つづきから", "library.replay": "もう一度", "library.playStatus": "プレイ状況", "library.completed": "クリア済み", "library.recent": "最近プレイ", "library.newVersion": "新バージョン", "library.best": "ベスト {score}", "library.format": "形式", "library.session": "プレイ時間", "library.minutes": "約 {count} 分", "library.coverUnavailable": "カバーを読み込めません", "library.difficulty": "難易度", "library.difficultyRelaxed": "やさしい", "library.difficultyStandard": "標準", "library.difficultyChallenging": "挑戦", "library.input": "操作", "library.inputKeyboard": "キーボード", "library.inputPointer": "マウス", "library.inputTouch": "タッチ",
  "studio.publishFailed": "バージョンを公開できませんでした。", "studio.versionHistory": "バージョンと公開", "studio.onlineVersion": "現在の公開バージョン", "studio.publishVersion": "この版を公開", "studio.currentOnline": "公開中", "studio.quality.legacy": "旧版・未検証", "studio.quality.pending": "品質確認待ち", "studio.quality.passed": "品質確認合格", "studio.quality.failed": "品質確認不合格", "studio.approveArt": "アート承認", "studio.artPassed": "アート確認合格", "studio.artFailed": "アート確認不合格", "studio.artReviewEvidence": "主役の明瞭さ、構図、アセットの統一、画面比への対応、カバーとの整合性を確認しました。", "studio.artReviewFailed": "アート確認を保存できませんでした。", "studio.olderVersions": "以前の {count} バージョンを表示",
  "a11y.skip": "メインコンテンツへ移動", "brand.home": "造界ホーム", "brand.name": "造界", "nav.create": "制作", "nav.gameCreate": "ゲーム制作", "nav.projects": "マイプロジェクト", "nav.games": "ゲーム一覧", "nav.local": "ローカル実行",
  "preferences.theme": "外観", "preferences.language": "言語", "preferences.system": "システムに従う", "preferences.light": "ライト", "preferences.dark": "ダーク",
  "models.trigger": "モデル", "models.title": "モデルと API キー", "models.description": "すべてのゲームで追跡可能な AI ビットマップの生成と使用が必須です。キーがない場合はビルドを中断し、SVG は受け付けません。", "models.available": "利用可能なモデル", "models.textRole": "ゲーム設計とコード", "models.textDetail": "ゲームプレイ設計、コード生成・修正、品質チェックを担当します。", "models.imageRole": "ビットマップアートと編集", "models.imageDetail": "各ビルドでカバーとゲーム内背景を生成し、モデル、用途、完全なプロンプトを記録します。", "models.keyLabel": "OpenAI API Key", "models.security": "キーはローカルサーバーにのみ送信され、ブラウザー、DB、プロジェクト、ゲーム成果物には保存されません。サーバー再起動時に消去されます。本番環境では OPENAI_API_KEY を使用できます。", "models.unconfigured": "APIキー未設定 · ビルド不可", "models.session": "設定済み · 現在のサーバーセッション", "models.environment": "設定済み · サーバー環境変数", "models.file": "設定済み · ローカルキーファイル", "models.textProvider": "テキストモデル：ローカル Claude CLI のサブスクリプション（{model}）· 画像は引き続き OpenAI", "models.save": "キーを保存", "models.clear": "セッションキーを消去", "models.close": "モデル設定を閉じる", "models.loadFailed": "モデル設定を読み込めませんでした。", "models.saveFailed": "キーを保存できませんでした。", "models.clearFailed": "キーを消去できませんでした。",
  "studio.productionPulse": "制作状況", "studio.creatorBrief": "アイデア概要", "studio.creatorBriefFacts": "アイデア概要情報", "studio.stageLane": "制作過程", "studio.stageCount": "{completed}/{total} 工程", "studio.stageEvidence": "工程の出力", "studio.currentResult": "現在の結論", "studio.directionLog": "変更メモ", "studio.directionCount": "{count} 件", "studio.directionTitle": "次の変更", "studio.directionHint": "残したい内容、変更したい内容を入力してください。",
  "home.hero": "アイデアを、\n遊べる世界へ。", "home.heroDetail": "一文のゲーム案から専用の制作ページへ。ゲームプレイ契約、生成アセット、テスト結果、公開URLまで一貫して確認できます。",
  "create.title": "アイデアを伝えて、すぐ制作。", "create.detail": "最初から完全な仕様は不要です。ゲームプレイ契約、ビットマップアート、音、コード、テストを次のページで段階的に生成します。", "create.ideaLabel": "ゲームのアイデアを説明", "create.ideaPlaceholder": "例：二段ジャンプできる柴犬が浮島で星を集め、灯台を目指す……", "create.uploadPuzzle": "パズル用画像をアップロード", "create.start": "制作を開始", "create.starting": "開始中…", "create.quick": "クイックスタート", "create.explore3d": "3D 探索", "create.settings": "詳細設定", "create.settingsHint": "遊び、スタイル、難易度、比率、名前", "create.templateTitle": "ゲームテンプレート", "create.templateDetail": "テンプレートは安定した土台です。ルールとテーマは説明から決まります。", "create.visualTitle": "ビジュアルスタイル", "create.visualDetail": "色だけでなく、レイアウト、部品形状、情報量、フィードバックも変わります。", "create.name": "ゲーム名", "create.optional": "任意", "create.namePlaceholder": "自動で命名", "create.difficulty": "難易度", "create.relaxed": "やさしい", "create.standard": "標準", "create.challenging": "挑戦", "create.dimension": "空間形式", "create.auto": "自動判定", "create.pieces": "ピース数", "create.piecesByDifficulty": "難易度に合わせる：{count}", "create.pieceUnit": "{count} ピース", "create.aspectTitle": "ゲーム画面の比率を選択", "create.aspectDetail": "このゲームでは視野、レベル設計、タッチ配置が比率によって大きく変わります。", "create.aspectAuto": "おすすめ · {ratio}", "create.aspectLandscape": "横 16:9", "create.aspectClassic": "標準 4:3", "create.aspectSquare": "正方形 1:1", "create.aspectPortrait": "縦 9:16", "create.imageAdded": "画像をパズルプロジェクトに追加しました", "create.remove": "削除", "create.trust": "専用制作ページへ移動し、初版を自動生成します。以前のバージョンは上書きしません。",
  "projects.count": "プロジェクト · {count}", "projects.continue": "制作を続ける", "projects.play": "プレイ", "projects.playNeedsPublish": "公開後にプレイできます", "projects.edit": "編集", "projects.viewDelivered": "公開済みゲームを見る", "projects.none": "ゲームはまだありません", "projects.noneDetail": "上で最初のアイデアを入力してください。制作の準備はできています。", "projects.published": "公開済み", "projects.playable": "プレイ可能", "projects.contractReady": "契約準備完了", "projects.loading": "プロジェクトを読み込み中", "projects.coverAlt": "{title} のカバー", "projects.views": "プロジェクト表示", "projects.active": "進行中", "projects.archiveBox": "アーカイブ", "projects.archive": "アーカイブする", "projects.archived": "アーカイブ済み", "projects.restore": "プロジェクトを復元", "projects.delete": "完全に削除", "projects.view": "記録を見る", "projects.archiveEmpty": "アーカイブは空です", "projects.archiveEmptyDetail": "アーカイブしたプロジェクトはここに表示され、復元または完全削除できます。", "projects.archiveFailed": "プロジェクトをアーカイブできませんでした。", "projects.restoreFailed": "プロジェクトを復元できませんでした。", "projects.deleteFailed": "プロジェクトを完全削除できませんでした。", "projects.deleteTitle": "このプロジェクトを完全に削除しますか？", "projects.deleteDetail": "「{title}」は造界から完全に削除されます。この操作は元に戻せません。", "projects.deleteScopeTitle": "削除される内容", "projects.deleteScope": "プロジェクト資料、ゲームプレイ契約、制作会話、ビルド履歴、バージョン、生成ファイル。共有済みのプロジェクトURLとバージョンURLも無効になります。", "projects.deleteCancel": "プロジェクトを残す", "projects.deleteConfirm": "プロジェクトを完全削除",
  "footer.studio": "造界 · AIゲームスタジオ", "footer.proof": "追跡可能なビルド · 不変バージョン · 専用URL", "footer.maintenance": "本システムは云一工作室が開発・保守しています。", "library.eyebrow": "PLAYABLE ARCHIVE · 公開作品", "library.hero": "すべての世界に、\n専用の入口を。", "library.count": "本の公開ゲーム", "library.detail": "下書き、失敗したビルド、未公開プレビューは表示しません。すべての入口はデータベースの公開記録に基づきます。", "library.version": "バージョン", "library.publishedAt": "公開日", "library.play": "ゲームを開始", "library.list": "公開済みゲーム一覧", "library.loading": "公開ゲームを読み込み中", "library.none": "公開済みゲームはまだありません", "library.noneDetail": "制作スタジオでビルドして公開すると、ここに自動表示されます。", "library.back": "制作スタジオへ戻る", "library.footer": "造界ゲーム一覧", "library.footerDetail": "直接開ける安定版のみを表示",
  "library.searchPlaceholder": "ゲーム名や遊び方で検索…", "library.searchLabel": "ゲームを検索", "library.categories": "遊び方で絞り込み", "library.filterAll": "すべて", "library.noResults": "一致するゲームが見つかりません", "library.noResultsDetail": "別のキーワードを試すか、絞り込みを解除してすべて表示してください。", "library.clearFilters": "絞り込みを解除", "library.template.signal-hunt": "シグナルハント", "library.template.tetris": "テトリス", "library.template.puzzle": "ジグソーパズル", "library.template.breakout": "ブロック崩し", "library.template.klotski": "箱入り娘","library.template.snake": "スネーク", "library.template.merge-2048": "2048", "library.template.space-shooter": "スペースシューター", "library.template.polyomino-fit": "ポリオミノ", "library.template.block-place": "ブロックパズル", "library.template.region-logic": "エリアロジック", "library.template.mahjong-roguelite": "麻雀ローグライト", "library.template.generated": "自由制作",
  "studio.back": "ゲーム", "studio.loading": "読込中", "studio.buildQueued": "開始待ち", "studio.building": "制作中", "studio.buildReady": "バージョン完成", "studio.buildFailed": "ビルド中断", "studio.build": "ビルド開始", "studio.rebuild": "再ビルド", "studio.newBuild": "新バージョンをビルド", "studio.publish": "公開", "studio.play": "プレイ", "studio.desktop": "デスクトップ", "studio.mobile": "モバイル", "studio.previewSize": "プレビューサイズ", "studio.refresh": "ゲームプレビューを更新", "studio.open": "新しいウィンドウで開く", "studio.fullscreen": "全画面プレビュー", "studio.previewTitle": "{title} プレイプレビュー", "studio.previewEmpty": "生成後、ここですぐ遊べます", "studio.previewEmptyDetail": "実際のビルドが自動で読み込まれ、制作ページを離れる必要はありません。", "studio.aspect": "設計画面比 {ratio}", "studio.contract": "ゲームプレイ契約", "studio.passed": "{passed}/{total} 合格", "studio.genre": "ジャンル", "studio.session": "プレイ時間", "studio.win": "クリア条件", "studio.visual": "ビジュアル", "studio.aspectFact": "画面比率", "studio.loop": "コアループ", "studio.contractDetails": "ルール・難易度・受入基準", "studio.controls": "操作", "studio.difficultyCurve": "難易度曲線", "studio.constraints": "必須条件", "studio.waitBuild": "ビルド開始待ち", "studio.waitBuildDetail": "開始後、ドキュメント、コード、アセット、テスト、配信結果が順番に表示されます。", "studio.confirm.title": "ゲームプレイ契約を確認", "studio.confirm.sourceLabel": "理解の方法", "studio.confirm.sourceLlm": "AI解析", "studio.confirm.sourceHeuristic": "キーワード認識", "studio.confirm.sourceFallback": "AI失敗・後備使用", "studio.confirm.confidence": "確信度 {value}%", "studio.confirm.fallbackNote": "AI解析が失敗したため、キーワード認識を後備として使用しました：{reason}", "studio.confirm.mechanics": "検出されたメカニクス", "studio.confirm.designLlm": "AIカスタム設計", "studio.confirm.experimental": "このプレイを支えるテンプレートがないため、AIがコードを直接生成し、安全スキャンと実ブラウザ検収を通過します。実験的作品です。", "studio.fantasy": "プレイヤー体験", "studio.confirm.cta": "契約を確認して制作開始", "studio.confirm.note": "開始後、ドキュメント、コード、アセットを生成し、自動受け入れ検査を実行します。", "studio.steps": "制作手順と成果物", "studio.rawError": "エラー原文", "studio.delivery": "配信URL", "studio.playerUrl": "プレイヤーURL", "studio.versionUrl": "バージョンURL", "studio.copy": "{label}をコピー", "studio.journal": "制作記録", "studio.discuss": "相談可能", "studio.you": "あなた", "studio.intro": "まずアイデアを確認可能なゲームプレイ契約に整理しました。コード、ビジュアルアセット、テストはこの契約を共通の基準にします。", "studio.readingJournal": "制作記録を読み込み中…", "studio.messageLabel": "次に変更したい内容", "studio.messagePlaceholder": "次に変更したい内容…", "studio.send": "制作指示を送信", "studio.messageNote": "指示はプロジェクトに保存され、現在のバージョンを上書きしません。", "studio.contractSaved": "ゲームプレイ契約を保存しました。ルールを確認して初版ビルドを開始できます。", "studio.queued": "制作タスクをキューに追加しました。ドキュメント、コード、アセット、テスト、バージョンを生成します。", "studio.runningStep": "「{title}」を実行中：{detail}", "studio.runningNext": "次の制作手順を準備中です。", "studio.failedText": "今回のビルドは中断しました：{error}", "studio.noError": "読み取れるエラー説明がありません。", "studio.succeededText": "プレイ可能なバージョンが完成しました。{count} 個の制作手順が完了し、プレビューですぐ遊べます。", "studio.progress": "制作進捗 {progress}%", "studio.loadingPage": "制作スタジオを開いています…", "studio.backProjects": "プロジェクト一覧へ戻る", "studio.archivedNotice": "このプロジェクトはアーカイブ済みです。内容は確認できますが、制作や公開を続けるには復元してください。", "studio.archivedNote": "プロジェクトはアーカイブ済みです。復元後に新しい制作指示を送信できます。",
  "notFound.title": "この入口はまだ作られていません。", "notFound.detail": "URLが変更された可能性があります。制作スタジオへ戻るか、ゲーム一覧から公開済みバージョンを開いてください。", "notFound.back": "制作スタジオへ戻る", "notFound.games": "ゲーム一覧へ",
};

Object.assign(zhTW, {
  "studio.resources.title": "資源準備",
  "studio.resources.summary": "已自動重用 {reusable} 項；系統將補齊 {generation} 項；需關注 {review} 項。",
  "studio.design.summary": "完整遊戲設計摘要", "studio.design.learning": "玩家先學什麼", "studio.design.progression": "如何逐步變難", "studio.design.assistance": "失敗後怎樣幫助", "studio.design.variation": "每階段有什麼變化",
});
Object.assign(en, {
  "studio.resources.title": "Asset readiness",
  "studio.resources.summary": "Reusing {reusable}; the studio will prepare {generation}; {review} need attention.",
  "studio.design.summary": "Complete game design summary", "studio.design.learning": "What players learn first", "studio.design.progression": "How difficulty grows", "studio.design.assistance": "Help after failure", "studio.design.variation": "What changes by stage",
});
Object.assign(ja, {
  "studio.resources.title": "素材の準備",
  "studio.resources.summary": "{reusable} 件を自動再利用し、{generation} 件を補完します。{review} 件は確認が必要です。",
  "studio.design.summary": "完全なゲーム設計概要", "studio.design.learning": "最初に学ぶこと", "studio.design.progression": "難易度の上がり方", "studio.design.assistance": "失敗後のサポート", "studio.design.variation": "段階ごとの変化",
});

const messages: Record<ResolvedLocale, MessageTable> = { "zh-CN": zhCN, "zh-TW": zhTW, en, ja };

function resolveSystemLocale(): ResolvedLocale {
  const language = navigator.language.toLowerCase();
  if (language.startsWith("ja")) return "ja";
  if (language.startsWith("en")) return "en";
  if (/zh-(tw|hk|mo)|hant/.test(language)) return "zh-TW";
  return "zh-CN";
}

function readSetting<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

type PreferencesContextValue = {
  localeSetting: LocaleSetting;
  locale: ResolvedLocale;
  themeSetting: ThemeSetting;
  theme: "light" | "dark";
  setLocaleSetting: (value: LocaleSetting) => void;
  setThemeSetting: (value: ThemeSetting) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [localeSetting, setLocaleSetting] = useState<LocaleSetting>(() => readSetting("forge-locale", ["system", "zh-CN", "zh-TW", "en", "ja"], "system"));
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => readSetting("forge-theme", ["system", "light", "dark"], "system"));
  const [systemLocale, setSystemLocale] = useState<ResolvedLocale>(resolveSystemLocale);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const locale = localeSetting === "system" ? systemLocale : localeSetting;
  const theme = themeSetting === "system" ? (systemDark ? "dark" : "light") : themeSetting;

  useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const languageQuery = () => setSystemLocale(resolveSystemLocale());
    const darkListener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    darkQuery.addEventListener("change", darkListener);
    window.addEventListener("languagechange", languageQuery);
    return () => {
      darkQuery.removeEventListener("change", darkListener);
      window.removeEventListener("languagechange", languageQuery);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101412" : "#f4f1e9");
    try {
      window.localStorage.setItem("forge-theme", themeSetting);
      window.localStorage.setItem("forge-locale", localeSetting);
    } catch {
      // 无持久化权限时仍保留本次会话设置。
    }
  }, [locale, localeSetting, theme, themeSetting]);

  const value = useMemo<PreferencesContextValue>(() => ({
    localeSetting,
    locale,
    themeSetting,
    theme,
    setLocaleSetting,
    setThemeSetting,
    t(key, values = {}) {
      return Object.entries(values).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), messages[locale][key]);
    },
  }), [locale, localeSetting, theme, themeSetting]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is missing.");
  return context;
}

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { localeSetting, setLocaleSetting, setThemeSetting, t, themeSetting } = usePreferences();
  return (
    <div className={`preference-controls ${compact ? "is-compact" : ""}`}>
      <label title={t("preferences.theme")}>
        <SunMoon size={15} aria-hidden="true" />
        <span className="sr-only">{t("preferences.theme")}</span>
        <select value={themeSetting} onChange={(event) => setThemeSetting(event.currentTarget.value as ThemeSetting)} aria-label={t("preferences.theme")}>
          <option value="system">{t("preferences.system")}</option><option value="light">{t("preferences.light")}</option><option value="dark">{t("preferences.dark")}</option>
        </select>
      </label>
      <label title={t("preferences.language")}>
        <Languages size={15} aria-hidden="true" />
        <span className="sr-only">{t("preferences.language")}</span>
        <select value={localeSetting} onChange={(event) => setLocaleSetting(event.currentTarget.value as LocaleSetting)} aria-label={t("preferences.language")}>
          <option value="system">{t("preferences.system")}</option><option value="zh-CN">{t("preferences.zhCN")}</option><option value="zh-TW">{t("preferences.zhTW")}</option><option value="en">{t("preferences.en")}</option><option value="ja">{t("preferences.ja")}</option>
        </select>
      </label>
    </div>
  );
}
