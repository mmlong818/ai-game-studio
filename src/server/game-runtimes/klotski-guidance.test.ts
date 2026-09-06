import { describe,it,expect } from 'vitest';
import { klotskiScript } from './klotski.js';
function source(name:string){
  const start=klotskiScript.indexOf('function '+name+'(');
  return klotskiScript.slice(start,klotskiScript.indexOf('\n}',start)+2);
}
const api=new Function(
  'let number=1;const currentCampaignLevel=()=>({number});'+
  klotskiScript.slice(0,klotskiScript.indexOf('const courtyardArt'))+
  ['klotskiStateKey','klotskiStateCanMove','solveKlotski','explainKlotskiMove','rebuildKlotskiPath'].map(source).join('\n')+
  ';return {level:(value)=>{number=value;return createCampaignKlotskiPieces();},solve:solveKlotski,rebuild:rebuildKlotskiPath,explain:explainKlotskiMove};'
)();
describe('华容让路与可验证恢复',()=>{
  it('首庭6步入门路径可逐步执行和恢复',()=>{
    const initial=api.level(1);let state=initial;
    const path=[];
    for(let step=0;step<6;step++){
      const result=api.solve(state);
      expect(result.status).toBe('solved');expect(result.distance).toBe(6-step);
      expect(api.explain(state,result.first).length).toBeGreaterThan(0);
      path.push(result.first);state=api.rebuild(initial,path).state;
    }
    const hero=state.find((piece:any)=>piece.id==='cao');expect([hero.x,hero.y]).toEqual([1,3]);
    expect(api.rebuild(initial,path).history).toHaveLength(6);
    expect(api.level(1)).toEqual(initial);
  });
  it('预算不足不能误报无解或建议丢弃当前局面',()=>{
    const result=api.solve(api.level(20),1);
    expect(result.status).toBe('budget-exhausted');expect(result.first).toBeNull();
  });
  it('恢复拒绝非法方向、伪造棋子、穿越和超长路径',()=>{
    const initial=api.level(1);
    for(const move of [{id:'cao',dx:2,dy:0},{id:'missing',dx:1,dy:0},{id:'cao',dx:1,dy:0},{id:'cao',dx:0,dy:0}])
      expect(api.rebuild(initial,[move])).toBeNull();
    expect(api.rebuild(initial,Array(2001).fill({id:'cao',dx:1,dy:0}))).toBeNull();
  });
  it('让路说明仅报告实际新获得的移动方向',()=>{
    const pieces=[{id:'cao',label:'队长',kind:'hero',w:2,h:2,x:1,y:0},{id:'bar',label:'横梁',kind:'guard',w:1,h:1,x:1,y:2}];
    expect(api.explain(pieces,{id:'bar',dx:-1,dy:0})).toContain('队长可向下');
    expect(api.explain(pieces,{id:'bar',dx:0,dy:-1})).toBe('');
  });
});
