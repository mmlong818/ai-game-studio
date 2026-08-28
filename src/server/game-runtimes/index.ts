import type { GameTemplate } from "../../shared/contracts.js";
import { breakoutScript } from "./breakout.js";
import { blockPlaceScript } from "./block-place.js";
import { klotskiScript } from "./klotski.js";
import { mazeScript } from "./maze.js";
import { mahjongRogueliteScript } from "./mahjong-roguelite.js";
import { merge2048Script } from "./merge-2048.js";
import { platformerScript } from "./platformer.js";
import { polyominoFitScript } from "./polyomino-fit.js";
import { puzzleScript } from "./puzzle.js";
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
    objective: "拖动任意拼块，靠近正确位置时会自动吸附；可切换关卡或上传自己的图片。",
    primaryMetric: "已归位",
    controls: [],
    script: puzzleScript,
    redrawFunction: "drawPuzzle",
    probeTokens: ["function createPieces()", "function perimeterSlots()", "function snapSelectedPiece()", "#puzzle-upload", "data-puzzle-count", "data-puzzle-level"],
  },
  breakout: {
    id: "breakout",
    label: "漆海碎星",
    eyebrow: "LACQUER TIDES / 五重漆海",
    intro: "穿过五片漆海，击散二十种不同形状的砖阵。",
    objective: "移动挡板接住光球；连续消除三块会获得炸弹，下一次消除自动触发十字爆炸。",
    primaryMetric: "已清除",
    controls: directions.filter((item) => item.value === "left" || item.value === "right"),
    script: breakoutScript,
    redrawFunction: "drawBreakout",
    probeTokens: ["function hitBrick(brick)", "function levelHasBrick(level, row, column)", "function showLevelComplete()", "data-breakout-level", "campaignComplete"],
  },
  klotski: {
    id: "klotski",
    label: "朱门华容",
    eyebrow: "VERMILION GATE / 流光机关",
    intro: "拨开朱门庭院中的机关包裹，让队长机器人穿过流光出口。",
    objective: "选择棋子后按照发光方向提示移动；打开底部朱门，送队长机器人离场。",
    primaryMetric: "步数",
    controls: [...directions, { value: "undo", label: "撤销", ariaLabel: "撤销上一步" }, { value: "replay", label: "回放", ariaLabel: "回放本局步骤" }],
    script: klotskiScript,
    redrawFunction: "drawKlotski",
    probeTokens: ["function canMove(piece", "function moveSelected", "function animationLoop(timestamp)", "function drawMoveGuides", "klotski-courtyard.png"],
  },
  maze: {
    id: "maze",
    label: "苔径迷庭",
    eyebrow: "CLOUD MAZE / 云上寻星",
    intro: "穿过会重新生长的苔径迷庭，在环路与岔口之间找到右下角的星星。",
    objective: "每关都有多条可选路线；直接滑动迷宫，或使用十字方向键、键盘方向键和 WASD 移动。",
    primaryMetric: "步数",
    controls: directions,
    script: mazeScript,
    redrawFunction: "drawMaze",
    probeTokens: ["function createMaze()", "function braidMaze()", "function movePlayer", "function gestureDirection", ".maze-pad [data-control]", "mazeRows - 1"],
  },
  snake: {
    id: "snake",
    label: "青玉长游",
    eyebrow: "JADE GARDEN / 青玉巡游",
    intro: "带着青玉小龙穿过当代庭园，追逐发光朱果。",
    objective: "先选择难度，再改变方向收集朱果；不同难度会改变速度、目标数量和碰撞规则。",
    primaryMetric: "朱果",
    controls: [...directions, { value: "undo", label: "撤销", ariaLabel: "撤销上一步" }],
    script: snakeScript,
    redrawFunction: "drawSnake",
    probeTokens: ["function snakeStep(timestamp", "function snakeAnimationLoop(timestamp)", "function applyDifficulty", "data-snake-difficulty", "score >= foodTarget"],
  },
  "merge-2048": {
    id: "merge-2048",
    label: "数织矩阵",
    eyebrow: "BENTO MERGE / 数字合成",
    intro: "推动整盒彩色软糖，让相同数字在有限空间里合成彩虹方块。",
    objective: "四向推动数字块；同值相遇会合并，达到目标数字前不要让棋盘锁死。",
    primaryMetric: "最高数字",
    controls: directions,
    script: merge2048Script,
    redrawFunction: "drawMergeBoard",
    probeTokens: ["function moveBoard(direction)", "function hasAvailableMove()", "merged.has(index)"],
  },
  platformer: {
    id: "platformer",
    label: "云脊跃迁",
    eyebrow: "SKYLINE PLATFORMER / 浮岛跳跃",
    intro: "沿着悬浮云脊校准每一次起跳，在能量耗尽前抵达高处信标。",
    objective: "左右移动并跳跃，收集足够能量后抵达右上方终点。",
    primaryMetric: "已收集",
    controls: [...directions.filter((item) => item.value === "left" || item.value === "right"), { value: "jump", label: "跳跃", ariaLabel: "跳跃" }],
    script: platformerScript,
    redrawFunction: "drawPlatformer",
    probeTokens: ["function updatePlatformer(delta, timestamp)", "function landOnPlatforms(previousBottom)", "coinsCollected >= coinTarget"],
  },
  "space-shooter": {
    id: "space-shooter",
    label: "星环突围",
    eyebrow: "ORBITAL RAID / 星环射击",
    intro: "敌机正在封锁跃迁航道，保持火力并从不断收紧的航线中穿过去。",
    objective: "网页端移动鼠标操纵飞船；手机端按住并拖动。持续射击，完成目标击破数。",
    primaryMetric: "已击破",
    controls: [...directions.filter((item) => item.value === "left" || item.value === "right"), { value: "fire", label: "射击", ariaLabel: "发射弹体" }],
    script: spaceShooterScript,
    redrawFunction: "drawShooter",
    probeTokens: ["function spawnEnemy(timestamp)", "function updateShooter(delta, timestamp)", "function drawShooterBullet(bullet)", "function moveShipTowardPointer(event)", "kills >= killTarget"],
  },
  "polyomino-fit": {
    id: "polyomino-fit",
    label: "软糖拼岛",
    eyebrow: "JELLY ISLAND / 多格拼合",
    intro: "从外围挑选软糖拼块，旋转并填满中央岛屿的轮廓。",
    objective: "点击下方大拼块即可旋转，再点击上方复杂轮廓落点；所有格子必须完整覆盖，不能越界或重叠。",
    primaryMetric: "已吸附",
    controls: [
      { value: "rotate", label: "旋转", ariaLabel: "旋转当前拼块" },
      { value: "hint", label: "提示", ariaLabel: "显示一个合法落点" },
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
    objective: "每行、每列、每个色区各一颗星；任意两颗星不能相邻。",
    primaryMetric: "星星",
    controls: [
      { value: "star", label: "星星", ariaLabel: "切换为放置星星" },
      { value: "mark", label: "标记", ariaLabel: "切换为排除标记" },
      { value: "undo", label: "撤销", ariaLabel: "撤销上一步" },
      { value: "hint-conflict", label: "查冲突", ariaLabel: "指出当前冲突或错误标记" },
      { value: "hint-eliminate", label: "排一格", ariaLabel: "排除一个不可能的位置" },
      { value: "hint-correct", label: "亮答案", ariaLabel: "点亮一个正确位置" },
    ],
    script: regionLogicScript,
    redrawFunction: "drawRegionLogic",
    probeTokens: ["function countRegionSolutions", "function generateUniqueRegionPuzzle", "function recomputeAutoMarks", "placedRegionStars.size === regionPuzzle.size"],
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
