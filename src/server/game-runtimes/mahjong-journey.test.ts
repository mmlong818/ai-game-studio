import {createContext,runInContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
import {mahjongRogueliteScript} from './mahjong-roguelite.js';
function rules(){
  const store=new Map<string,string>();
  const context=createContext({config:{difficulty:'standard',campaignStorageKey:'project-v1'},Date,performance:{now:()=>0},safeStorage:{getItem:(k:string)=>store.get(k),setItem:(k:string,v:string)=>store.set(k,v)},currentCampaignLevel:()=>({number:1,tier:1,seed:123})});
  runInContext(mahjongRogueliteScript.slice(0,mahjongRogueliteScript.indexOf('function mahjongLayout()')),context);
  return (code:string)=>runInContext(code,context);
}
describe('月港牌阵与开路证据',()=>{
  it('三种结构24到72张、多种种子均能实际成对清空',()=>{
    const run=rules();
    expect(run(`(()=>{for(let shape=0;shape<3;shape++)for(let count=24;count<=72;count+=4)for(let seed=1;seed<=8;seed++){
      mahjongBoard=createSolvableMahjongBoard(count,seed,shape);
      while(mahjongRemaining()){const pair=getAvailableMahjongPairs()[0];if(!pair)return false;pair.forEach(tile=>tile.deleted=true);}
    }return true;})()`)).toBe(true);
  });
  it('配对预览给出的开路数与实际释放一致且不修改牌阵',()=>{
    const run=rules();run('mahjongBoard=createSolvableMahjongBoard(40,789,1);');
    expect(run(`(()=>{const pair=getAvailableMahjongPairs()[0],before=JSON.stringify(mahjongBoard),forecast=previewMahjongPair(pair);if(JSON.stringify(mahjongBoard)!==before)return false;
      const free=new Set(mahjongBoard.filter(isMahjongTileFree).map(tile=>tile.id));pair.forEach(tile=>tile.deleted=true);
      return forecast.count===mahjongBoard.filter(tile=>isMahjongTileFree(tile)&&!free.has(tile.id)).length;})()`)).toBe(true);
  });
  it('模式隔离且重新打开恢复剩余时间，不受关闭时长影响',()=>{
    const run=rules();run('mahjongBoard=createSolvableMahjongBoard(28,1);mahjongDeadline=Date.now()+60000;saveMahjongRun();');
    const key=run('mahjongScopedRunKey()');run('mahjongMode="daily";');expect(run('mahjongScopedRunKey()')).not.toBe(key);
    expect(run('restoreMahjongRun()')).toBe(false);run('mahjongMode="campaign";mahjongDeadline=0;');
    expect(run('restoreMahjongRun()')).toBe(true);expect(run('mahjongTimeRemaining()')).toBeGreaterThanOrEqual(59);
  });
});
