import { describe,it,expect } from 'vitest';
import { blockPlanningScript } from './block-planning.js';
const {forecast,plan}=new Function(blockPlanningScript+';return {forecast:blockForecast,plan:blockPlanBatch};')();
const piece=(cells:number[][])=>({cells,used:false});
describe('果冻三块前瞻',()=>{
  it('交叉消除只移除一次交点，预览分数与连击规则一致',()=>{
    const board=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>r===3||c===4?1:0));board[3][4]=0;
    const before=JSON.stringify(board);
    const result=forecast(board,piece([[0,0]]),3,4,2);
    expect(result.rows).toEqual([3]);expect(result.columns).toEqual([4]);
    expect(result.cells).toHaveLength(15);expect(result.earned).toBe(73);
    expect(result.next.flat().filter(Boolean)).toHaveLength(0);
    expect(JSON.stringify(board)).toBe(before);
  });
  it('碰撞、越界、已使用的拼块不会伪报可消线',()=>{
    const board=[[1,0],[0,0]],single=piece([[0,0]]);
    expect(forecast(board,single,0,0).reason).toContain('已有');
    expect(forecast(board,single,-1,0).reason).toContain('边界');
    expect(forecast(board,{...single,used:true},1,1).valid).toBe(false);
  });
  it('提示提供当前整组的可执行路径，且不修改原棋盘',()=>{
    const board=Array.from({length:8},()=>Array(8).fill(0));
    board[0].fill(1);board[0][6]=0;board[0][7]=0;
    const pieces=[piece([[0,0],[0,1]]),piece([[0,0],[1,0],[2,0]]),piece([[0,0],[0,1],[1,0],[1,1]])];
    const result=plan(board,pieces);expect(result.status).toBe('solved');expect(result.plan).toHaveLength(3);
    expect(result.plan[0].forecast.rows).toContain(0);
    let next=board;
    for(const step of result.plan){const actual=forecast(next,pieces[step.index],step.row,step.column);expect(actual.valid).toBe(true);next=actual.next;}
    expect(board[0][0]).toBe(1);
  });
  it('优先大块消线，不要求候选编号顺序',()=>{
    const board=[[0,0,0,0],[1,0,1,0],[0,1,0,1],[1,0,1,0]];
    const pieces=[piece([[0,0]]),piece([[0,0],[0,1],[0,2],[0,3]])];
    const result=plan(board,pieces);expect(result.status).toBe('solved');
    expect(result.plan[0].index).toBe(1);
  });
  it('搜索预算耗尽与确实无解分开，不虚称安全',()=>{
    const board=Array.from({length:8},()=>Array(8).fill(0));
    expect(plan(board,[piece([[0,0]])],1).status).toBe('budget-exhausted');
    expect(plan([[1,1],[1,1]],[piece([[0,0]])]).status).toBe('unsolvable');
  });
});
