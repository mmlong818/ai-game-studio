import { describe, expect, it } from 'vitest';
import { polyominoSolverScript } from './polyomino-solver.js';
import { polyominoFitScript } from './polyomino-fit.js';

const solve = new Function(polyominoSolverScript + ';return solvePolyRemainder;')();
const variants = () => [{ rotation: 0, cells: [[0,0],[0,1]] }, { rotation: 1, cells: [[0,0],[1,0]] }];
const pieces = ['a','b'].map(id => ({ id, cells: [[0,0],[0,1]] }));
const target = new Set(['0:0','0:1','1:0','1:1']);
describe('软糖拼岛当前局面求解', () => {
  it('三种难度的二十关都能给出实际可完成的提示', () => {
    const prefix=polyominoFitScript.slice(0,polyominoFitScript.indexOf('function currentPolyBlueprint()'));
    for(const difficulty of ['relaxed','standard','challenging']){
      const config={difficulty,campaignLevels:Array.from({length:20},(_,index)=>({tier:Math.floor(index/4)+1}))};
      const api=new Function('config',prefix+';return {compilePolyBlueprint,polyShapeVariants,rotatePolyCells,solvePolyRemainder};')(config);
      for(let level=1;level<=20;level++){
        const blueprint=api.compilePolyBlueprint(level);
        const target=new Set<string>();
        for(const piece of blueprint.pieces)for(const [r,c] of api.rotatePolyCells(piece.cells,piece.solution[2]))target.add((piece.solution[0]+r)+':'+(piece.solution[1]+c));
        const result=api.solvePolyRemainder(blueprint.pieces,[],target,api.polyShapeVariants);
        expect(result.exhausted, difficulty+' '+level).toBe(false);
        expect(result.solution, difficulty+' '+level).toHaveLength(blueprint.pieces.length);
        const occupied=new Set<string>();
        for(const step of result.solution)for(const cell of step.cells){expect(occupied.has(cell)).toBe(false);expect(target.has(cell)).toBe(true);occupied.add(cell);}
        expect(occupied.size).toBe(target.size);
      }
    }
  });
  it('接受非预设方向，提示避开已经放置的拼块', () => {
    const result=solve(pieces,[{id:'a',row:0,column:0,rotation:1}],target,variants);
    expect(result.solution).toEqual([{id:'b',row:0,column:1,rotation:1,cells:['0:1','1:1']}]);
  });
  it('不修改传入棋盘和拼块', () => {
    const before=JSON.stringify(pieces);
    const result=solve(pieces,[],target,variants);
    expect(result.solution).toHaveLength(2);
    expect(JSON.stringify(pieces)).toBe(before);
    expect(target.size).toBe(4);
  });
  it('无解和搜索预算耗尽是两种不同结果', () => {
    expect(solve(pieces,[],new Set(['0:0','0:1','2:0','3:2']),variants).solution).toBeNull();
    expect(solve(pieces,[],target,variants,0)).toMatchObject({solution:null,exhausted:true});
  });
  it('无解提示不扣次数，吸附与错误反馈都有逐帧退出', () => {
    const hint=polyominoFitScript.slice(polyominoFitScript.indexOf('function hintPolyPiece()'),polyominoFitScript.indexOf('function undoPolyPiece()'));
    expect(hint.indexOf('if(!result.solution)')).toBeLessThan(hint.indexOf('polyHintsRemaining-=1'));
    expect(polyominoFitScript).toContain('polyFeedbackFrame=requestAnimationFrame');
    expect(polyominoFitScript).toContain('cancelAnimationFrame(polyFeedbackFrame)');
  });
});
