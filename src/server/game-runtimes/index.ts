import type { GameTemplate } from "../../shared/contracts.js";
import { breakoutScript } from "./breakout.js";
import { blockPlaceScript } from "./block-place.js";
import { klotskiScript } from "./klotski.js";
import { mahjongRogueliteScript } from "./mahjong-roguelite.js";
import { merge2048Script } from "./merge-2048.js";
import { polyominoFitScript } from "./polyomino-fit.js";
import { puzzleScript } from "./puzzle-commercial.js";
import { snakeScript } from "./snake.js";
import { spaceShooterScript } from "./space-shooter.js";
import { regionLogicScript } from "./region-logic.js";
import { tetrisScript } from "./tetris.js";
import type { RuntimeDefinition } from "./types.js";

const directions = [
  { value: "up", label: "↑", ariaLabel: "向上" },
  { value: "left", label: "←", ariaLabel: "向左" },
  { value: "down", label: "↓", ariaLabel: "向下" },
  { value: "right", label: "→", ariaLabel: "向右" },
];

// "generated" 没有模板运行时——它的代码由模型逐项目生成(game-generator.ts)。
const runtimes: Record<Exclude<GameTemplate, "signal-hunt" | "generated">, RuntimeDefinition> = {
  tetris: {
    id: "tetris",
    label: "折光堆叠",
    eyebrow: "PRISM STACK / 折光构筑",
    intro: "让不同折光纹样的构件咬合成完整横线。",
    objective: "完成目标消行数，避免方块触及顶端。",
    primaryMetric: "消行",
    controls: [...directions.slice(1), { value: "rotate", label: "旋转", ariaLabel: "旋转方块" }, { value: "hold", label: "暂存", ariaLabel: "暂存当前方块" }, { value: "drop", label: "落下", ariaLabel: "快速落下" }],
    script: tetrisScript,
    redrawFunction: "drawTetris",
    probeTokens: ["function rotatePiece()", "function hardDrop()", "lines >= lineTarget"],
  },
  puzzle: {
    id: "puzzle",
    label: "植光拼图",
    eyebrow: "PICTURE GARDEN / 图像重组",
    intro: "选择喜欢的图案与拼图数量，再亲手恢复完整画面。",
    objective: "从四周整理拼块，先连接相邻轮廓再整组归位；可缩放、筛边、预览或上传自己的图片。",
    primaryMetric: "已归位",
    controls: [
      { value: "zoom-in", label: "放大", ariaLabel: "放大拼图画板" },
      { value: "zoom-out", label: "缩小", ariaLabel: "缩小拼图画板" },
      { value: "arrange", label: "整理", ariaLabel: "重新整理外围拼块" },
      { value: "edge", label: "只看边块", ariaLabel: "只显示边缘拼块" },
      { value: "preview", label: "预览", ariaLabel: "短暂预览完成图" },
      { value: "hint", label: "提示 3", ariaLabel: "提示一块与目标区域" },
      { value: "rotate", label: "旋转", ariaLabel: "旋转当前拼块组" },
      { value: "pause", label: "暂停", ariaLabel: "暂停拼图" },
    ],
    script: puzzleScript,
    redrawFunction: "drawPuzzle",
    probeTokens: ["const puzzleBlueprints = [", "function createPieces()", "function perimeterSlots()", "function tryConnectSelected()", "function setPuzzleZoom", "#puzzle-upload", "data-puzzle-count", "data-puzzle-level"],
  },
  breakout: {
    id: "breakout",
    label: "漆海碎星",
    eyebrow: "LACQUER TIDES / 五重漆海",
    intro: "穿过五片漆海，击散二十种不同形状的砖阵。",
    objective: "移动挡板接住光球；连续消除三块会获得炸弹，下一次消除自动触发十字爆炸。",
    primaryMetric: "已清除",
    controls: [
      ...directions.filter((item) => item.value === "left" || item.value === "right"),
      { value: "focus", label: "聚光", ariaLabel: "切换聚光减速" },
    ],
    script: breakoutScript,
    redrawFunction: "drawBreakout",
    probeTokens: ["function hitBrick(brick)", "function levelHasBrick(level, row, column)", "function showLevelComplete()", "data-breakout-level", "campaignComplete"],
  },
  klotski: {
    id: "klotski",
    label: "朱门华容",
    eyebrow: "VERMILION GATE / 流光机关",
    intro: "拨开朱门庭院中的机关包裹，让队长机器人穿过流光出口。",
    objective: "直接拖动棋子腾出路径；打开底部朱门，送队长机器人离场。",
    primaryMetric: "步数",
    controls: [...directions, { value: "undo", label: "撤销", ariaLabel: "撤销上一步" }, { value: "redo", label: "重做", ariaLabel: "重做上一步" }, { value: "hint", label: "提示", ariaLabel: "显示最短路径下一步" }, { value: "replay", label: "回放", ariaLabel: "回放本局步骤" }],
    script: klotskiScript,
    redrawFunction: "drawKlotski",
    probeTokens: ["const klotskiBlueprints = [", "function canMove(piece", "function moveSelected", "pointerdown", "function redoKlotskiMove", "klotski-courtyard.png"],
  },
  snake: {
    id: "snake",
    label: "青玉长游",
    eyebrow: "JADE GARDEN / 青玉巡游",
    intro: "带着青玉小龙穿过当代庭园，追逐发光朱果。",
    objective: "鼠标指向或单指拖动自由转向。开局铺满固定食物，每段巡游 30 秒并计入 8–10 枚采集，整关至少两类，超额保留；首关至少 2 分钟，后续至少 3–5 分钟，未达采集目标可继续。朱果增长、金果加分、青叶灵活转向、露珠吸取；无限版无目标。",
    primaryMetric: "巡游",
    controls: [{ value: "pause", label: "暂停", ariaLabel: "暂停游戏" }],
    script: snakeScript,
    redrawFunction: "drawSnake",
    probeTokens: ["const snakeLevelBlueprints = [", "function queueSnakeTurn", "function reachableSnakeCells", "pointerup", "data-snake-control-mode", "advanceSnakeForage"],
  },
  "merge-2048": {
    id: "merge-2048",
    label: "数织矩阵",
    eyebrow: "NUMBER WEAVE / 二十局数字织造",
    intro: "读取下一块，在二十个不同开局中织出稳定的数字秩序。",
    objective: "在棋盘上直接滑动；相同数字每次只合并一次，完成本关任务并避免锁死。",
    primaryMetric: "最高数字",
    controls: [...directions, { value: "undo", label: "回溯", ariaLabel: "回溯上一步" }],
    script: merge2048Script,
    redrawFunction: "drawMergeBoard",
    probeTokens: ["const mergeBlueprints = [", "function resolveMergeMove(source, direction)", "const mergeMoveDuration = 168", "prepareDoubleMerge", "directSwipe: true", "merge-session-v2"],
  },
  "space-shooter": {
    id: "space-shooter",
    label: "星环突围",
    eyebrow: "ORBITAL RAID / 星环射击",
    intro: "选择战机，穿过三波敌军编队，并在守环者封锁跃迁前打开航道。",
    objective: "网页端移动鼠标，手机端按住拖动；主武器自动射击，脉冲充满后可清除近身敌弹。",
    primaryMetric: "任务进度",
    controls: [{ value: "pulse", label: "脉冲 35%", ariaLabel: "释放星环脉冲" }],
    script: spaceShooterScript,
    redrawFunction: "drawShooter",
    probeTokens: ["function spawnShooterEnemy(kind, timestamp)", "function updateShooter(delta, timestamp)", "function drawShooterBullet(bullet)", "function moveShipTowardPointer(event)", "function activateShooterPulse()", "shooterWaveCount = 3"],
  },
  "polyomino-fit": {
    id: "polyomino-fit",
    label: "软糖拼岛",
    eyebrow: "JELLY ISLAND / 多格拼合",
    intro: "观察紧角与凹槽，旋转软糖拼块并把整座岛屿严丝合缝地拼完整。",
    objective: "点击同一拼块旋转，按住后直接拖到上方轮廓；合法位置会整块吸附，越界、重叠或目标外会回弹。",
    primaryMetric: "已吸附",
    controls: [
      { value: "rotate", label: "旋转", ariaLabel: "旋转当前拼块" },
      { value: "hint", label: "提示", ariaLabel: "显示区域或锚点提示" },
      { value: "undo", label: "撤销", ariaLabel: "撤销上一块拼图" },
    ],
    script: polyominoFitScript,
    redrawFunction: "drawPolyomino",
    probeTokens: ["function canPlacePolyPiece", "function findNearestLegalPlacement", "polyPlacements.length === polyPieces.length"],
  },
  "block-place": {
    id: "block-place",
    label: "果冻填阵",
    eyebrow: "JELLY GRID / 方块填阵",
    intro: "把三枚果冻构件安排进棋盘，以横竖消除维持可用空间。",
    objective: "每轮用完三个候选；填满完整横行或竖列得分并触发连击。",
    primaryMetric: "得分",
    controls: [{ value: "hint", label: "提示", ariaLabel: "显示一个安全落点" }],
    script: blockPlaceScript,
    redrawFunction: "drawBlockPlace",
    probeTokens: ["function canPlaceBlockPiece", "function findLineClear", "function hasAnyPlacement"],
  },
  "region-logic": {
    id: "region-logic",
    label: "星灵巡格",
    eyebrow: "STAR REGIONS / 区域逻辑",
    intro: "在不规则色区中安放星灵，让每条规则同时成立。",
    objective: "每行、每列、每个色区放入规定数量的星灵；任意两颗星不能相邻。",
    primaryMetric: "星星",
    controls: [
      { value: "cycle", label: "循环", ariaLabel: "单击依次切换星星、排除和清空" },
      { value: "star", label: "星星", ariaLabel: "切换为放置星星" },
      { value: "mark", label: "排除", ariaLabel: "切换为排除标记" },
      { value: "undo", label: "撤销", ariaLabel: "撤销上一步" },
      { value: "redo", label: "重做", ariaLabel: "重做刚才撤销的一步" },
      { value: "hint", label: "推理", ariaLabel: "解释当前可执行的一步推理" },
    ],
    script: regionLogicScript,
    redrawFunction: "drawRegionLogic",
    probeTokens: ["function solveRegionPuzzle", "function nextRegionDeduction", "function persistRegionSession", "function redoRegionMove", "function recomputeAutoMarks"],
  },
  "mahjong-roguelite": {
    id: "mahjong-roguelite",
    label: "月港雀旅",
    eyebrow: "MOON HARBOR / 肉鸽麻将接龙",
    intro: "从层叠灵牌的开放边缘寻找对子，沿月港航线完成一段可成长的旅程。",
    objective: "只有未被上层覆盖且左右至少一侧开放的灵牌可以配对；清空牌阵并在航段间选择遗物。",
    primaryMetric: "剩余灵牌",
    controls: [
      { value: "hint", label: "提示", ariaLabel: "点亮一对可消除灵牌" },
      { value: "shuffle", label: "洗牌", ariaLabel: "重新生成可解的剩余牌面" },
      { value: "undo", label: "撤销", ariaLabel: "撤销上一对灵牌" },
    ],
    script: mahjongRogueliteScript,
    redrawFunction: "drawMahjongRoguelite",
    probeTokens: ["function isMahjongTileFree", "function getAvailableMahjongPairs", "function createSolvableMahjongBoard", "function chooseMahjongRelic", "mahjongRemaining() === 0"],
  },
};

export function getRuntimeDefinition(template: GameTemplate) {
  return template === "signal-hunt" || template === "generated" ? null : runtimes[template];
}
