import { describe, expect, it } from 'vitest';
import { tetrisPlanningScript } from './tetris-planning.js';
import { tetrisScript } from './tetris.js';
const rules = new Function(tetrisPlanningScript + ';return { tetrisHoles, tetrisPlacementForecast, tetrisLesson };')();
describe('折光落点规划与课程', () => {
  it('真实旋转函数完成首课教学后安全复位，可落下一行；普通旋转不复位', () => {
    const rotate = tetrisScript.slice(tetrisScript.indexOf('function rotatePiece()'), tetrisScript.indexOf('function hardDrop()'));
    const finish = tetrisScript.slice(tetrisScript.indexOf('function finishTetrisRotationLesson('), tetrisScript.indexOf('window.addEventListener("forge:onboarding-signal"'));
    const run = new Function('tutorial', tetrisPlanningScript + `
      const rotationStates = [[[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]]];
      let piece={shapeIndex:0, rotation:0, shape:rotationStates[0][0],x:3,y:0}, running=true, modeStartedAt=0, placedPieces=0, tetrisMode='standard', lastActionWasRotation=false, lockResetCount=0;
      const lesson=tetrisLesson(1), iKickTests={'0>1':[[0,0]]}, jlstzKickTests={};
      const currentCampaignLevel=()=>({number:1}), collides=()=>false, refreshLockDelay=()=>{}, clearLockTimer=()=>{}, setStatus=()=>{}, playSound=()=>{}, drawTetris=()=>{};
      function signalOnboarding(signal) { if(tutorial) finishTetrisRotationLesson({detail:{signal,status:'completed'}}); }
      ` + rotate + finish + `rotatePiece();return { piece, lesson };`);
    const taught = run(true);
    expect(taught.piece.rotation).toBe(0);
    expect(taught.lesson.instruction).toContain('已放回横向起点');
    expect(rules.tetrisPlacementForecast(taught.lesson.grid, taught.piece.shape, 3, 18).clearRows).toEqual([19]);
    expect(run(false).piece.rotation).toBe(1);
  });
  it('20 关开局均有一枚对应形状可真实落下消除，且没有预封洞', () => {
    for (let level = 1; level <= 20; level++) {
      const lesson = rules.tetrisLesson(level);
      expect(rules.tetrisHoles(lesson.grid)).toBe(0);
      const shape = lesson.chapter === 1 ? [[1, 1], [1, 1]] : lesson.chapter === 2 ? [[1], [1], [1], [1]] : [[1, 1, 1, 1]];
      let found = false;
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 20; y++) {
          const forecast = rules.tetrisPlacementForecast(lesson.grid, shape, x, y);
          if (forecast.valid && forecast.clearRows.length === lesson.goal) {
            // The matching piece can descend from spawn height in this column.
            for (let above = 0; above <= y; above++) expect(rules.tetrisPlacementForecast(lesson.grid, shape, x, above).valid).toBe(true);
            found = true;
          }
        }
      }
      expect(found).toBe(true);
    }
  });
  it('落点预告不改棋盘，并正确计算新增封洞', () => {
    const grid = Array.from({ length: 20 }, () => Array(10).fill(0));
    grid[19][0] = 1;
    const copy = JSON.stringify(grid);
    const forecast = rules.tetrisPlacementForecast(grid, [[1, 1, 1, 1]], 0, 18);
    expect(forecast).toEqual({ valid: true, clearRows: [], addedHoles: 3 });
    expect(JSON.stringify(grid)).toBe(copy);
  });
  it('拒绝越界和重叠，不制造虚假消行预告', () => {
    const grid = rules.tetrisLesson(1).grid;
    expect(rules.tetrisPlacementForecast(grid, [[1]], 0, 19).valid).toBe(false);
    expect(rules.tetrisPlacementForecast(grid, [[1]], -1, 0).valid).toBe(false);
    expect(rules.tetrisPlacementForecast(grid, [[1]], 10, 0).valid).toBe(false);
  });
  it('暂存章节明确提供不匹配的方块和后续长条，技巧不作为强制胜利门槛', () => {
    expect(rules.tetrisLesson(13)).toMatchObject({ firstPiece: 1, secondPiece: 0, goal: 1 });
    expect(tetrisScript).toContain('if (lines >= lineTarget)');
    expect(tetrisScript).toContain('lesson.chapter !== 3 || heldForLesson');
  });
});
