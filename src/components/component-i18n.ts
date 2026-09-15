import { usePreferences, type MessageKey, type ResolvedLocale } from "../web/preferences";

const zhCN = {
  "aspect.title": "选择游戏画幅",
  "aspect.detail": "画幅只决定游戏画面的横竖比例，不限制操作方式或设备。",
  "aspect.portrait": "竖向", "aspect.landscape": "横向", "aspect.square": "方形",
  "aspect.portraitShape": "竖向画幅", "aspect.landscapeShape": "横向画幅", "aspect.squareShape": "方形画幅",
  "creation.begin": "从一个想法开始", "creation.step": "01 / 描述", "creation.question": "你想做一个什么游戏？",
  "creation.placeholder": "比如：让一只小龙在花园里吃星星，越吃越长。轻松上手，也能一直玩下去。",
  "creation.needAspect": "请选择画幅后提交。确认前不会生成方案或制作游戏。",
  "creation.ready": "确认后会生成方案并使用文字模型额度；确认前不会生成图片或制作游戏。",
  "creation.needBrief": "写一句完整的话，再选择游戏画幅。确认查看方案时会使用文字模型额度。",
  "creation.submit": "提交，生成方案", "creation.inspiration": "没想好？试试一个灵感",
  "creation.replacePrompt": "要用这个灵感替换当前描述吗？", "creation.replace": "替换描述", "creation.keep": "保留原文",
  "creation.flowLabel": "创作流程", "creation.flowEyebrow": "从想法到试玩", "creation.flowTitle": "你定方向，\n制作交给平台。",
  "creation.flow1": "说说你想玩的", "creation.flow1Detail": "主题、玩法或喜欢的感觉，选一个说就行。",
  "creation.flow2": "确认玩法方案", "creation.flow2Detail": "先看玩法如何组合，再决定是否制作。",
  "creation.flow3": "制作、检查、试玩", "creation.flow3Detail": "平台自动制作和检查，完成后即可试玩。",
  "creation.remix": "改一个现有游戏", "creation.remixDetail": "保留喜欢的玩法，做出自己的版本。",
  "creation.idea1Name": "星光收集", "creation.idea1": "一只小龙在星空花园里自由移动，吃星星会变长，躲开巡逻障碍，操作简单，关卡难度逐步提升。",
  "creation.idea2Name": "午后拼图", "creation.idea2": "一个温暖植物园主题的拖拽拼图游戏，从简单轮廓逐步挑战复杂图案，拼好后有漂亮的庆祝动画。",
  "creation.idea3Name": "三分钟合成", "creation.idea3": "一个单手就能玩的水果合成小游戏，每局三到五分钟，有新手引导、连锁奖励和不限目标的无限玩法。",
  "sprite.idle": "待机", "sprite.run": "移动", "sprite.hit": "受击", "sprite.effect": "特效",
  "sprite.previewLabel": "Sprite Sheet 播放预览", "sprite.example": "可播放示例", "sprite.exampleDetail": "示例动画，可切换动作查看效果",
  "sprite.frameA11y": "{clip}动作第 {frame} 帧", "sprite.actions": "预览动作", "sprite.speed": "预览速度",
  "sprite.status": "{clip} · 第 {frame}/{total} 帧 · {fps} fps · {state}", "sprite.loop": "循环播放", "sprite.ended": "已停在最后一帧", "sprite.once": "播放一次后停在最后一帧",
  "sprite.title": "角色和短特效要动起来吗？", "sprite.detail": "适合 2D 角色、持续运动物和命中特效。平台会把每个动作做成 4–8 帧的透明底图集，并在游戏中播放。",
  "sprite.auto": "适用时生成可播放动画", "sprite.autoDetail": "为适合的角色或特效自动安排待机、移动、受击或短特效。",
  "sprite.none": "这次使用静态图片", "sprite.noneDetail": "适合以静态道具和界面元素为主的游戏。",
  "sprite.replace": "要替换哪段动画？", "sprite.replaceDetail": "这款游戏已有可播放图集。只替换一段动作，其余动作和玩法会保留。", "sprite.replaceGroup": "要替换的动画",
  "waiting.label": "等待状态", "waiting.durable": "本次制作已用", "waiting.page": "本次页面等待", "waiting.time": "{minutes} 分 {seconds} 秒",
  "waiting.delay": "本次等待较长，尚未收到完成结果。计时不代表制作进度，不会因此重复提交。",
  "waiting.excerpt": "正在写入的游戏代码", "waiting.excerptDetail": "只显示最后几行，完整代码在制作完成后可查",
  "steps.analyze": "分析", "steps.document": "编写文档", "steps.code": "编写代码", "steps.asset": "生成资源", "steps.test": "运行测试", "steps.delivery": "打包", "steps.evidence": "步骤结果",
  "failure.defaultFallback": "本次记录未保存详细原因。", "failure.defaultMessage": "本次制作未完成。", "failure.shortTitle": "未能完成", "failure.title": "本次未能完成",
  "failure.retryable": "系统可恢复", "failure.account": "需要账户或配置处理", "failure.preserved": "平台已保留现场",
  "failure.resource": "受影响资源：{label}（{file}）", "failure.operation": "受影响项目：{operation}", "failure.next": "下一步：{next}",
  "failure.reference": "参考编号：{code}", "failure.attempt": "第 {attempt} 次尝试", "failure.http": "服务状态 {status}", "failure.technical": "技术详情",
  "failure.stage.planning": "修改计划", "failure.stage.design": "方案生成", "failure.stage.asset": "资源生成", "failure.stage.code": "代码制作", "failure.stage.validation": "规则检查", "failure.stage.browser": "浏览器验收", "failure.stage.delivery": "交付", "failure.stage.cancelled": "已停止", "failure.stage.unknown": "制作过程",
  "failure.category.timeout": "响应超时", "failure.category.network": "连接失败", "failure.category.http": "服务请求失败", "failure.category.authentication": "身份验证失败", "failure.category.permission": "权限不足", "failure.category.rate-limit": "服务限流", "failure.category.invalid-response": "返回内容无效", "failure.category.invalid-image": "图片不符合要求", "failure.category.validation": "检查未通过", "failure.category.configuration": "配置不完整", "failure.category.cancelled": "用户已停止", "failure.category.unknown": "未分类问题",
} as const;

type Key = keyof typeof zhCN;
type Table = Record<Key, string>;

const zhTW: Table = {
  ...zhCN,
  "aspect.title": "選擇遊戲畫幅", "aspect.detail": "畫幅只決定遊戲畫面的橫豎比例，不限制操作方式或裝置。", "aspect.portrait": "直向", "aspect.landscape": "橫向", "aspect.square": "方形", "aspect.portraitShape": "直向畫幅", "aspect.landscapeShape": "橫向畫幅", "aspect.squareShape": "方形畫幅",
  "creation.begin": "從一個想法開始", "creation.step": "01 / 描述", "creation.question": "你想做一個什麼遊戲？", "creation.placeholder": "例如：讓一隻小龍在花園裡吃星星，越吃越長。輕鬆上手，也能一直玩下去。", "creation.needAspect": "請選擇畫幅後提交。確認前不會生成方案或製作遊戲。", "creation.ready": "確認後會生成方案並使用文字模型額度；確認前不會生成圖片或製作遊戲。", "creation.needBrief": "寫一句完整的話，再選擇遊戲畫幅。確認查看方案時會使用文字模型額度。", "creation.submit": "提交，生成方案", "creation.inspiration": "還沒想好？試試一個靈感", "creation.replacePrompt": "要用這個靈感取代目前描述嗎？", "creation.replace": "取代描述", "creation.keep": "保留原文", "creation.flowLabel": "創作流程", "creation.flowEyebrow": "從想法到試玩", "creation.flowTitle": "你定方向，\n製作交給平台。", "creation.flow1": "說說你想玩的", "creation.flow1Detail": "主題、玩法或喜歡的感覺，選一個說就行。", "creation.flow2": "確認玩法方案", "creation.flow2Detail": "先看玩法如何組合，再決定是否製作。", "creation.flow3": "製作、檢查、試玩", "creation.flow3Detail": "平台自動製作和檢查，完成後即可試玩。", "creation.remix": "改一個現有遊戲", "creation.remixDetail": "保留喜歡的玩法，做出自己的版本。",
  "creation.idea1Name": "星光收集", "creation.idea1": "一隻小龍在星空花園裡自由移動，吃星星會變長，避開巡邏障礙，操作簡單，關卡難度逐步提升。", "creation.idea2Name": "午後拼圖", "creation.idea2": "一個溫暖植物園主題的拖曳拼圖遊戲，從簡單輪廓逐步挑戰複雜圖案，拼好後有漂亮的慶祝動畫。", "creation.idea3Name": "三分鐘合成", "creation.idea3": "一個單手就能玩的水果合成小遊戲，每局三到五分鐘，有新手引導、連鎖獎勵和不限目標的無限玩法。",
  "sprite.idle": "待機", "sprite.run": "移動", "sprite.hit": "受擊", "sprite.effect": "特效", "sprite.previewLabel": "Sprite Sheet 播放預覽", "sprite.example": "可播放範例", "sprite.exampleDetail": "範例動畫，可切換動作查看效果", "sprite.frameA11y": "{clip}動作第 {frame} 格", "sprite.actions": "預覽動作", "sprite.speed": "預覽速度", "sprite.status": "{clip} · 第 {frame}/{total} 格 · {fps} fps · {state}", "sprite.loop": "循環播放", "sprite.ended": "已停在最後一格", "sprite.once": "播放一次後停在最後一格", "sprite.title": "角色和短特效要動起來嗎？", "sprite.detail": "適合 2D 角色、持續移動物件和命中特效。平台會把每個動作做成 4–8 格的透明底圖集，並在遊戲中播放。", "sprite.auto": "適用時生成可播放動畫", "sprite.autoDetail": "為適合的角色或特效自動安排待機、移動、受擊或短特效。", "sprite.none": "這次使用靜態圖片", "sprite.noneDetail": "適合以靜態道具和介面元素為主的遊戲。", "sprite.replace": "要替換哪段動畫？", "sprite.replaceDetail": "這款遊戲已有可播放圖集。只替換一段動作，其餘動作和玩法會保留。", "sprite.replaceGroup": "要替換的動畫",
  "waiting.label": "等待狀態", "waiting.durable": "本次製作已用", "waiting.page": "本次頁面等待", "waiting.time": "{minutes} 分 {seconds} 秒", "waiting.delay": "本次等待較長，尚未收到完成結果。計時不代表製作進度，不會因此重複提交。", "waiting.excerpt": "正在寫入遊戲程式碼", "waiting.excerptDetail": "只顯示最後幾行，完整程式碼可在製作完成後查看",
  "steps.analyze": "分析", "steps.document": "編寫文件", "steps.code": "編寫程式碼", "steps.asset": "生成資源", "steps.test": "執行測試", "steps.delivery": "打包", "steps.evidence": "步驟結果",
  "failure.defaultFallback": "本次記錄未儲存詳細原因。", "failure.defaultMessage": "本次製作未完成。", "failure.shortTitle": "未能完成", "failure.title": "本次未能完成", "failure.retryable": "系統可恢復", "failure.account": "需要處理帳戶或設定", "failure.preserved": "平台已保留現場", "failure.resource": "受影響資源：{label}（{file}）", "failure.operation": "受影響項目：{operation}", "failure.next": "下一步：{next}", "failure.reference": "參考編號：{code}", "failure.attempt": "第 {attempt} 次嘗試", "failure.http": "服務狀態 {status}", "failure.technical": "技術詳情",
  "failure.stage.planning": "修改計畫", "failure.stage.design": "方案生成", "failure.stage.asset": "資源生成", "failure.stage.code": "程式碼製作", "failure.stage.validation": "規則檢查", "failure.stage.browser": "瀏覽器驗收", "failure.stage.delivery": "交付", "failure.stage.cancelled": "已停止", "failure.stage.unknown": "製作過程", "failure.category.timeout": "回應逾時", "failure.category.network": "連線失敗", "failure.category.http": "服務請求失敗", "failure.category.authentication": "身分驗證失敗", "failure.category.permission": "權限不足", "failure.category.rate-limit": "服務限流", "failure.category.invalid-response": "傳回內容無效", "failure.category.invalid-image": "圖片不符合要求", "failure.category.validation": "檢查未通過", "failure.category.configuration": "設定不完整", "failure.category.cancelled": "使用者已停止", "failure.category.unknown": "未分類問題",
};

const en: Table = {
  ...zhCN,
  "aspect.title": "Choose the game aspect ratio", "aspect.detail": "The ratio controls the game canvas shape. It does not limit controls or devices.", "aspect.portrait": "Portrait", "aspect.landscape": "Landscape", "aspect.square": "Square", "aspect.portraitShape": "Portrait canvas", "aspect.landscapeShape": "Landscape canvas", "aspect.squareShape": "Square canvas",
  "creation.begin": "Start with an idea", "creation.step": "01 / Describe", "creation.question": "What game would you like to make?", "creation.placeholder": "For example: a little dragon eats stars in a garden and grows longer. Easy to learn, with endless play.", "creation.needAspect": "Choose an aspect ratio before submitting. Nothing is generated before confirmation.", "creation.ready": "Confirming generates a plan and uses text-model quota. No images or game are created yet.", "creation.needBrief": "Write one complete sentence and choose an aspect ratio. Reviewing the plan uses text-model quota.", "creation.submit": "Submit and generate plan", "creation.inspiration": "Need an idea? Try one", "creation.replacePrompt": "Replace your current description with this idea?", "creation.replace": "Replace description", "creation.keep": "Keep my text", "creation.flowLabel": "Creation flow", "creation.flowEyebrow": "From idea to playtest", "creation.flowTitle": "You set the direction.\nThe studio handles production.", "creation.flow1": "Describe what you want to play", "creation.flow1Detail": "Mention a theme, mechanic, or feeling you like.", "creation.flow2": "Confirm the game plan", "creation.flow2Detail": "See how the mechanics fit before deciding to produce it.", "creation.flow3": "Build, check, and play", "creation.flow3Detail": "The studio builds and checks the game, then opens it for play.", "creation.remix": "Remix an existing game", "creation.remixDetail": "Keep the parts you like and make your own version.", "creation.idea1Name": "Starlight Collector", "creation.idea1": "A little dragon roams a starlit garden, grows by eating stars, and dodges patrolling obstacles as levels become harder.", "creation.idea2Name": "Afternoon Puzzle", "creation.idea2": "A warm botanical-garden drag puzzle that progresses from simple silhouettes to intricate patterns, with a celebration when complete.", "creation.idea3Name": "Three-Minute Merge", "creation.idea3": "A one-handed fruit merge game with three-to-five-minute rounds, onboarding, chain bonuses, and an endless mode without a final target.",
  "sprite.idle": "Idle", "sprite.run": "Move", "sprite.hit": "Hit", "sprite.effect": "Effect", "sprite.previewLabel": "Sprite sheet playback preview", "sprite.example": "Playable example", "sprite.exampleDetail": "Switch actions to preview the animation", "sprite.frameA11y": "{clip}, frame {frame}", "sprite.actions": "Preview actions", "sprite.speed": "Preview speed", "sprite.status": "{clip} · frame {frame}/{total} · {fps} fps · {state}", "sprite.loop": "loops", "sprite.ended": "stopped on the last frame", "sprite.once": "plays once and stops on the last frame", "sprite.title": "Should characters and short effects move?", "sprite.detail": "Best for 2D characters, moving objects, and hit effects. Each action uses a transparent 4–8 frame sprite sheet played in the game.", "sprite.auto": "Generate playable animation when suitable", "sprite.autoDetail": "Automatically plan idle, move, hit, or short-effect clips for suitable characters and effects.", "sprite.none": "Use static images this time", "sprite.noneDetail": "Best for games built mainly from static props and interface elements.", "sprite.replace": "Which animation should be replaced?", "sprite.replaceDetail": "This game already has a playable sprite sheet. Replace one action while keeping the others and the gameplay.", "sprite.replaceGroup": "Animation to replace",
  "waiting.label": "Waiting status", "waiting.durable": "Production time", "waiting.page": "Page wait time", "waiting.time": "{minutes} min {seconds} sec", "waiting.delay": "This is taking longer than usual and no final result has arrived. The timer is not progress and will not trigger another submission.", "waiting.excerpt": "Writing game code", "waiting.excerptDetail": "Only the latest lines are shown. The complete code is available after production.",
  "steps.analyze": "Analyze", "steps.document": "Write docs", "steps.code": "Write code", "steps.asset": "Generate assets", "steps.test": "Run tests", "steps.delivery": "Package", "steps.evidence": "Step result",
  "failure.defaultFallback": "No detailed reason was saved for this record.", "failure.defaultMessage": "Production did not finish.", "failure.shortTitle": "Could not complete", "failure.title": "This run did not complete", "failure.retryable": "The system can recover", "failure.account": "Account or configuration action required", "failure.preserved": "The platform preserved the current state", "failure.resource": "Affected asset: {label} ({file})", "failure.operation": "Affected project: {operation}", "failure.next": "Next step: {next}", "failure.reference": "Reference: {code}", "failure.attempt": "attempt {attempt}", "failure.http": "service status {status}", "failure.technical": "Technical details",
  "failure.stage.planning": "Change plan", "failure.stage.design": "Plan generation", "failure.stage.asset": "Asset generation", "failure.stage.code": "Code production", "failure.stage.validation": "Rule check", "failure.stage.browser": "Browser acceptance", "failure.stage.delivery": "Delivery", "failure.stage.cancelled": "Stopped", "failure.stage.unknown": "Production", "failure.category.timeout": "Response timed out", "failure.category.network": "Connection failed", "failure.category.http": "Service request failed", "failure.category.authentication": "Authentication failed", "failure.category.permission": "Permission denied", "failure.category.rate-limit": "Service rate limit", "failure.category.invalid-response": "Invalid response", "failure.category.invalid-image": "Image requirements not met", "failure.category.validation": "Check failed", "failure.category.configuration": "Configuration incomplete", "failure.category.cancelled": "Stopped by user", "failure.category.unknown": "Unclassified issue",
};

const ja: Table = {
  ...en,
  "aspect.title": "ゲーム画面の比率を選択", "aspect.detail": "画面比率はゲーム画面の縦横だけを決めます。操作方法や端末は制限しません。", "aspect.portrait": "縦向き", "aspect.landscape": "横向き", "aspect.square": "正方形", "aspect.portraitShape": "縦向き画面", "aspect.landscapeShape": "横向き画面", "aspect.squareShape": "正方形画面",
  "creation.begin": "アイデアから始める", "creation.step": "01 / 説明", "creation.question": "どんなゲームを作りたいですか？", "creation.placeholder": "例：小さなドラゴンが庭で星を食べ、長くなっていく。すぐ覚えられて、ずっと遊べるゲーム。", "creation.needAspect": "画面比率を選んでから送信してください。確認前には生成や制作を行いません。", "creation.ready": "確認すると企画を生成し、テキストモデル枠を使用します。この時点では画像やゲームを制作しません。", "creation.needBrief": "一文で内容を書き、画面比率を選んでください。企画の確認にはテキストモデル枠を使用します。", "creation.submit": "送信して企画を生成", "creation.inspiration": "迷ったらアイデアを試す", "creation.replacePrompt": "現在の説明をこのアイデアに置き換えますか？", "creation.replace": "説明を置き換える", "creation.keep": "元の文を残す", "creation.flowLabel": "制作の流れ", "creation.flowEyebrow": "アイデアから試遊まで", "creation.flowTitle": "方向はあなたが決め、\n制作はプラットフォームに。", "creation.flow1": "遊びたい内容を伝える", "creation.flow1Detail": "テーマ、遊び方、好きな雰囲気のどれかを教えてください。", "creation.flow2": "ゲーム企画を確認", "creation.flow2Detail": "遊び方の組み合わせを見て、制作するか決めます。", "creation.flow3": "制作・検査・試遊", "creation.flow3Detail": "プラットフォームが制作と検査を行い、完成後すぐ試遊できます。", "creation.remix": "既存ゲームをアレンジ", "creation.remixDetail": "好きな遊び方を残して、自分の版を作ります。", "creation.idea1Name": "星明かり集め", "creation.idea1": "小さなドラゴンが星空の庭を自由に動き、星を食べて長くなり、巡回する障害を避けながら段階的に難しくなるゲーム。", "creation.idea2Name": "午後のパズル", "creation.idea2": "温かな植物園をテーマにしたドラッグパズル。簡単な輪郭から複雑な模様へ進み、完成すると華やかな演出が流れます。", "creation.idea3Name": "3分マージ", "creation.idea3": "片手で遊べるフルーツ合成ゲーム。1回3〜5分で、導入、連鎖ボーナス、最終目標のないエンドレスモードがあります。",
  "sprite.idle": "待機", "sprite.run": "移動", "sprite.hit": "被弾", "sprite.effect": "エフェクト", "sprite.previewLabel": "スプライトシート再生プレビュー", "sprite.example": "再生サンプル", "sprite.exampleDetail": "アクションを切り替えて動きを確認できます", "sprite.frameA11y": "{clip}、{frame}フレーム目", "sprite.actions": "プレビューする動き", "sprite.speed": "再生速度", "sprite.status": "{clip} · {frame}/{total}フレーム · {fps} fps · {state}", "sprite.loop": "ループ再生", "sprite.ended": "最終フレームで停止", "sprite.once": "1回再生して最終フレームで停止", "sprite.title": "キャラクターや短いエフェクトを動かしますか？", "sprite.detail": "2Dキャラクター、動く物体、ヒット演出向けです。各動作を透明背景の4〜8フレームのスプライトシートにして、ゲーム内で再生します。", "sprite.auto": "適する場合は再生可能なアニメを生成", "sprite.autoDetail": "適したキャラクターや演出に、待機、移動、被弾、短いエフェクトを自動で設定します。", "sprite.none": "今回は静止画を使用", "sprite.noneDetail": "静止した小物やUI要素が中心のゲームに向いています。", "sprite.replace": "どのアニメを差し替えますか？", "sprite.replaceDetail": "このゲームには再生可能なスプライトシートがあります。ほかの動きと遊び方を保ち、1つだけ差し替えます。", "sprite.replaceGroup": "差し替えるアニメ",
  "waiting.label": "待機状況", "waiting.durable": "今回の制作時間", "waiting.page": "ページでの待ち時間", "waiting.time": "{minutes}分 {seconds}秒", "waiting.delay": "完了結果が届かず、通常より時間がかかっています。この計時は進捗率ではなく、再送信も行いません。", "waiting.excerpt": "ゲームコードを作成中", "waiting.excerptDetail": "末尾の数行だけを表示しています。完全なコードは制作完了後に確認できます。",
  "steps.analyze": "分析", "steps.document": "文書作成", "steps.code": "コード作成", "steps.asset": "素材生成", "steps.test": "テスト実行", "steps.delivery": "パッケージ", "steps.evidence": "手順の結果",
  "failure.defaultFallback": "この記録には詳しい理由が保存されていません。", "failure.defaultMessage": "今回の制作は完了しませんでした。", "failure.shortTitle": "完了できませんでした", "failure.title": "今回の処理は完了しませんでした", "failure.retryable": "システムで復旧可能", "failure.account": "アカウントまたは設定の対応が必要", "failure.preserved": "現在の状態を保存しました", "failure.resource": "影響を受けた素材：{label}（{file}）", "failure.operation": "影響を受けたプロジェクト：{operation}", "failure.next": "次の手順：{next}", "failure.reference": "参照番号：{code}", "failure.attempt": "{attempt}回目", "failure.http": "サービス状態 {status}", "failure.technical": "技術詳細",
  "failure.stage.planning": "変更計画", "failure.stage.design": "企画生成", "failure.stage.asset": "素材生成", "failure.stage.code": "コード制作", "failure.stage.validation": "ルール検査", "failure.stage.browser": "ブラウザ検収", "failure.stage.delivery": "配信", "failure.stage.cancelled": "停止済み", "failure.stage.unknown": "制作処理", "failure.category.timeout": "応答タイムアウト", "failure.category.network": "接続失敗", "failure.category.http": "サービス要求失敗", "failure.category.authentication": "認証失敗", "failure.category.permission": "権限不足", "failure.category.rate-limit": "サービスのレート制限", "failure.category.invalid-response": "無効な応答", "failure.category.invalid-image": "画像要件を満たしていません", "failure.category.validation": "検査不合格", "failure.category.configuration": "設定不足", "failure.category.cancelled": "ユーザーが停止", "failure.category.unknown": "未分類の問題",
};

const tables: Record<ResolvedLocale, Table> = { "zh-CN": zhCN, "zh-TW": zhTW, en, ja };

export function useComponentMessages() {
  const locale = useComponentLocale();
  return (key: Key, values: Record<string, string | number> = {}) => Object.entries(values)
    .reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), tables[locale][key]);
}

export function useComponentLocale(): ResolvedLocale {
  // Some isolated component tests and embedders predate PreferencesProvider.
  // The hook call remains unconditional; production always supplies the provider.
  try { return usePreferences().locale; } catch { return "zh-CN"; }
}

export function useCentralMessages() {
  try {
    const { t } = usePreferences();
    return (key: MessageKey, _fallback: string, values?: Record<string, string | number>) => t(key, values);
  } catch {
    return (_key: MessageKey, fallback: string, values: Record<string, string | number> = {}) => Object.entries(values)
      .reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), fallback);
  }
}
