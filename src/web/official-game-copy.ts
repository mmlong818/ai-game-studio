import type { ProjectSummary } from "../shared/contracts";
import type { ResolvedLocale } from "./preferences";

type Copy = Record<ResolvedLocale, { title: string; idea: string }>;

const copy: Record<string, Copy> = {
  tetris: {
    "zh-CN": { title: "折光堆叠", idea: "构成主义风格的方块堆叠游戏，完成 10 条消行获胜，支持键盘和触控。" }, "zh-TW": { title: "折光堆疊", idea: "構成主義風格的方塊堆疊遊戲，完成 10 條消行即可獲勝，支援鍵盤與觸控。" }, en: { title: "Prism Stack", idea: "A Constructivist block-stacking game. Clear 10 lines to win with keyboard or touch controls." }, ja: { title: "プリズムスタック", idea: "構成主義風のブロック積みゲーム。10ラインを消すとクリア。キーボードとタッチに対応。" },
  },
  puzzle: {
    "zh-CN": { title: "植光拼图", idea: "植物标本室风格的经典拖拽拼图，可使用横图、竖图或方图。" }, "zh-TW": { title: "植光拼圖", idea: "植物標本室風格的經典拖曳拼圖，可使用橫圖、直圖或方圖。" }, en: { title: "Botanical Light", idea: "A botanical specimen-room jigsaw with drag controls and landscape, portrait, or square images." }, ja: { title: "植物標本パズル", idea: "植物標本室をテーマにしたドラッグ式パズル。横・縦・正方形の画像に対応。" },
  },
  breakout: {
    "zh-CN": { title: "漆海碎星", idea: "漆艺海面风格的打砖块游戏，击碎全部矿物砖获胜。" }, "zh-TW": { title: "漆海碎星", idea: "漆藝海面風格的打磚塊遊戲，擊碎所有礦物磚即可獲勝。" }, en: { title: "Lacquer Sea", idea: "A lacquer-sea brick breaker. Shatter every mineral brick to win." }, ja: { title: "漆海の星屑", idea: "漆の海を描いたブロック崩し。鉱石ブロックをすべて壊すとクリア。" },
  },
  klotski: {
    "zh-CN": { title: "朱门华容", idea: "东方庭院中的机器人华容道，拖动包裹为队长让路。" }, "zh-TW": { title: "朱門華容", idea: "東方庭院中的機器人華容道，拖動包裹為隊長讓路。" }, en: { title: "Vermilion Passage", idea: "A robot sliding-block puzzle in an eastern courtyard. Move parcels to clear the captain's path." }, ja: { title: "朱門の抜け道", idea: "東洋の庭を舞台にしたロボットのスライドパズル。荷物を動かし隊長の道を開けよう。" },
  },
  snake: {
    "zh-CN": { title: "青玉长游", idea: "青玉庭园里的自由转向采集游戏，四类食物各有作用，并提供无限玩法。" }, "zh-TW": { title: "青玉長遊", idea: "青玉庭園中的自由轉向收集遊戲，四類食物各有作用，並提供無限玩法。" }, en: { title: "Jade Garden Trail", idea: "Free-turn collecting in a jade garden, with four food types and an endless mode." }, ja: { title: "青玉の庭めぐり", idea: "青玉の庭で自由に曲がりながら集めるゲーム。4種類の食べ物とエンドレスモードを収録。" },
  },
  "merge-2048": {
    "zh-CN": { title: "数织矩阵", idea: "数字织造主题的 2048，包含关卡闯关与自由无尽玩法。" }, "zh-TW": { title: "數織矩陣", idea: "數字織造主題的 2048，包含闖關與自由無限玩法。" }, en: { title: "Number Loom", idea: "A number-weaving 2048 game with staged challenges and a free endless mode." }, ja: { title: "数織りマトリクス", idea: "数字を織り上げる 2048。ステージ攻略と自由なエンドレスモードを収録。" },
  },
  "space-shooter": {
    "zh-CN": { title: "星环突围", idea: "俯视太空射击游戏，自由移动规避弹幕并连续突破三段封锁。" }, "zh-TW": { title: "星環突圍", idea: "俯視太空射擊遊戲，自由移動閃避彈幕並連續突破三段封鎖。" }, en: { title: "Star-Ring Breakout", idea: "A top-down space shooter: evade warning fire and break through three blockades." }, ja: { title: "星環突破", idea: "見下ろし型スペースシューター。予告弾幕を避け、3つの封鎖線を突破しよう。" },
  },
  "polyomino-fit": {
    "zh-CN": { title: "软糖拼岛", idea: "旋转并安放软糖拼块，完整填满目标轮廓。" }, "zh-TW": { title: "軟糖拼島", idea: "旋轉並放置軟糖拼塊，完整填滿目標輪廓。" }, en: { title: "Gummy Island Fit", idea: "Rotate and place gummy polyominoes to fill each target silhouette." }, ja: { title: "グミ島パズル", idea: "グミのピースを回転して置き、目標の形を隙間なく埋めよう。" },
  },
  "block-place": {
    "zh-CN": { title: "果冻填阵", idea: "从三块中选择并放进 8×8 棋盘，通过横竖消行达到目标分数。" }, "zh-TW": { title: "果凍填陣", idea: "從三塊中選擇並放入 8×8 棋盤，透過橫豎消行達到目標分數。" }, en: { title: "Jelly Grid", idea: "Choose from three jelly blocks, place them on an 8×8 board, and clear rows and columns for the target score." }, ja: { title: "ゼリーグリッド", idea: "3つのゼリーブロックから選んで8×8盤に置き、縦横を消して目標スコアを目指そう。" },
  },
  "region-logic": {
    "zh-CN": { title: "星灵巡格", idea: "每行、每列和每个区域各放一个星灵，且星灵不能相邻。" }, "zh-TW": { title: "星靈巡格", idea: "每行、每列和每個區域各放一個星靈，且星靈不能相鄰。" }, en: { title: "Starling Regions", idea: "Place one starling in every row, column, and region, with no adjacent starlings." }, ja: { title: "星霊の巡回", idea: "各行・各列・各エリアに星霊を1体ずつ置き、隣り合わせを避けるロジックパズル。" },
  },
  "mahjong-roguelite": {
    "zh-CN": { title: "月港雀旅", idea: "配对自由牌清空层叠牌阵，并在航段之间选择遗物。" }, "zh-TW": { title: "月港雀旅", idea: "配對自由牌清空層疊牌陣，並在航段之間選擇遺物。" }, en: { title: "Moonport Mahjong", idea: "Pair free tiles to clear layered boards and choose relics between voyages." }, ja: { title: "月港の麻雀旅", idea: "自由牌をペアにして積層盤を消し、航海の合間にレリックを選ぼう。" },
  },
  freecell: {
    "zh-CN": { title: "空档接龙", idea: "经典空档接龙，包含 100 个已知可解牌局，支持撤销、重开、点击与拖拽。" }, "zh-TW": { title: "新接龍", idea: "經典新接龍，包含 100 個已知可解牌局，支援復原、重開、點擊與拖曳。" }, en: { title: "FreeCell", idea: "Classic FreeCell with 100 known-solvable deals, undo, restart, click, and drag controls." }, ja: { title: "フリーセル", idea: "解けることが確認された100ディールを収録。取り消し、再開、クリック、ドラッグに対応。" },
  },
  "star-dream-duel": {
    "zh-CN": { title: "星梦对决", idea: "包含单人限步收集、人机对战和无目标的无限休闲三种独立玩法。" }, "zh-TW": { title: "星夢對決", idea: "包含單人限步收集、人機對戰和無目標的無限休閒三種獨立玩法。" }, en: { title: "Star Dream Duel", idea: "Three separate modes: limited-move solo collecting, an AI duel, and goal-free endless play." }, ja: { title: "スタードリーム対決", idea: "手数制のソロ収集、AI対戦、目標なしのエンドレスという3つの独立モード。" },
  },
  "endless-match3": {
    "zh-CN": { title: "无限三消", idea: "拖动或点选交换相邻方块，触发消除、下落和连锁；没有通关或失败，可一直玩。" }, "zh-TW": { title: "無限三消", idea: "拖曳或點選交換相鄰方塊，觸發消除、下落和連鎖；沒有通關或失敗，可一直玩。" }, en: { title: "Endless Match 3", idea: "Drag or select adjacent tiles to create matches, falls, and chains. There is no win or loss, so play can continue indefinitely." }, ja: { title: "エンドレスマッチ3", idea: "隣のピースをドラッグまたは選択して交換し、消去・落下・連鎖を起こそう。クリアや失敗はなく、ずっと遊べます。" },
  },
  "arrow-escape": { "zh-CN": { title: "箭头逃脱", idea: "点击前方通道全空的箭头，让它沿自身折线滑出棋盘。" }, "zh-TW": { title: "箭頭逃脫", idea: "點擊前方通道全空的箭頭，讓它沿自身折線滑出棋盤。" }, en: { title: "Arrow Escape", idea: "Select arrows with a clear path ahead and slide them along their bent routes off the board." }, ja: { title: "アローエスケープ", idea: "前方が空いている矢印を選び、折れ曲がった経路に沿って盤外へ逃がそう。" } },
  "arrow-cube-3d": { "zh-CN": { title: "箭头魔方", idea: "选择立方体中的箭头方块，沿箭头方向将它们逐块滑出。" }, "zh-TW": { title: "箭頭魔方", idea: "選擇立方體中的箭頭方塊，沿箭頭方向將它們逐塊滑出。" }, en: { title: "Arrow Cube", idea: "Choose arrow blocks inside a cube and slide them out one by one in their arrow direction." }, ja: { title: "アローキューブ", idea: "立方体の矢印ブロックを選び、矢印の方向へ1つずつ滑り出そう。" } },
  "island-kart": { "zh-CN": { title: "椰风海岛", idea: "轻操作海岛卡丁车，包含三圈竞速和无限自由驾驶。" }, "zh-TW": { title: "椰風海島", idea: "輕操作海島卡丁車，包含三圈競速和無限自由駕駛。" }, en: { title: "Coconut Island", idea: "Easy island karting with a three-lap race and endless free driving." }, ja: { title: "ココナツアイランド", idea: "手軽な島のカートゲーム。3周レースとエンドレスなフリードライブを収録。" } },
  "meadow-railway": { "zh-CN": { title: "牧野小火车", idea: "自由搭建木制铁路玩具，让火车沿线路运行；无目标、无时限。" }, "zh-TW": { title: "牧野小火車", idea: "自由搭建木製鐵路玩具，讓火車沿路線運行；無目標、無時限。" }, en: { title: "Meadow Railway", idea: "Freely build a wooden toy railway and run the train, with no goals or time limit." }, ja: { title: "牧野の小さな鉄道", idea: "木製おもちゃの線路を自由に組み、列車を走らせよう。目標も制限時間もありません。" } },
};

export function localizeOfficialGame<T extends Pick<ProjectSummary, "isOfficial" | "fixtureKind" | "template" | "title" | "idea">>(game: T, locale: ResolvedLocale) {
  if (!game.isOfficial) return game;
  const localized = copy[game.fixtureKind ?? game.template]?.[locale];
  return localized ? { ...game, ...localized } : game;
}
