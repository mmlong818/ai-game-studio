import { describe, expect, it } from 'vitest';
import { puzzleWorkshopScript } from './puzzle-workshop.js';
import { puzzleScript } from './puzzle-commercial.js';

const rules = new Function(puzzleWorkshopScript + ';return {puzzleRegion,puzzleWorkshopProgress,puzzleWorkshopLesson,puzzleWorkshopVisible,puzzleDropIsBoardAttempt,puzzleValidatedLayout,puzzleRecoverGroupOffset};')();
const board = { x:100,y:100,width:200,height:200,cellWidth:100,cellHeight:100 };
const pieces = Array.from({length:4},(_,index)=>({index,row:Math.floor(index/2),column:index%2,homeX:150+index%2*100,homeY:150+Math.floor(index/2)*100,groupId:index,locked:false,edges:{top:index<2?0:1,bottom:index>=2?0:1,left:index%2===0?0:1,right:index%2?0:1}}));

describe('植光拼图工作台与学习证据',()=>{
  it('任意行数每块唯一归类，空区域不计为达成',()=>{
    for(let rows=2;rows<=25;rows++) for(let row=0;row<rows;row++) expect([0,1,2]).toContain(rules.puzzleRegion(row,rows));
    const p=rules.puzzleWorkshopProgress(pieces,2,2);
    expect(p.corners).toEqual({done:0,total:4});
    expect(p.regions.reduce((sum:number,r:{total:number})=>sum+r.total,0)).toBe(4);
  });
  it('只按真实归位统计四角、边框与区域',()=>{
    const p=rules.puzzleWorkshopProgress(pieces.map((piece)=>({...piece,locked:piece.row===0})),2,2);
    expect(p.corners.done).toBe(2);expect(p.frame.done).toBe(2);
    expect(p.regions[0]).toEqual({done:2,total:2});expect(p.regions[1].done).toBe(0);
  });
  it('五章教学明确区分轮廓、组拼、纹理、综合组织、自主选择',()=>{
    const p=rules.puzzleWorkshopProgress(pieces,2,2);
    expect(new Set([1,5,9,13,17].map((level)=>rules.puzzleWorkshopLesson(level,p,0))).size).toBe(5);
    expect(rules.puzzleWorkshopLesson(5,p,1)).toContain('整组搬运');
  });
  it('区域与边框筛选显示整个组，锁定块始终可见',()=>{
    const grouped=pieces.map((p)=>({...p,groupId:p.index===2?0:p.groupId}));
    expect(rules.puzzleWorkshopVisible(grouped[2],grouped,'0',2)).toBe(true);
    expect(rules.puzzleWorkshopVisible(grouped[3],grouped,'0',2)).toBe(false);
    expect(rules.puzzleWorkshopVisible({...grouped[3],locked:true},grouped,'0',2)).toBe(true);
  });
  it('外围工作台自由整理不是错误试放',()=>{
    expect(rules.puzzleDropIsBoardAttempt([{x:70,y:200}],board)).toBe(false);
    expect(rules.puzzleDropIsBoardAttempt([{x:100,y:200}],board)).toBe(false);
    expect(rules.puzzleDropIsBoardAttempt([{x:150,y:150}],board)).toBe(true);
  });
  it('完整保存任意方向的连通小组，拒绝形变、重复和伪归位',()=>{
    const saved=pieces.map((p)=>({index:p.index,x:p.homeX,y:p.homeY,groupId:p.index,turn:0,locked:false}));
    saved[1].groupId=0;
    expect(rules.puzzleValidatedLayout(saved,pieces,board,600,900)).toEqual(saved);
    const rotated=structuredClone(saved);rotated[0].turn=1;rotated[1].turn=1;rotated[1].x=150;rotated[1].y=250;
    expect(rules.puzzleValidatedLayout(rotated,pieces,board,600,900)).toEqual(rotated);
    rotated[1].x+=12;expect(rules.puzzleValidatedLayout(rotated,pieces,board,600,900)).toBeNull();
    const duplicate=structuredClone(saved);duplicate[1].index=0;expect(rules.puzzleValidatedLayout(duplicate,pieces,board,600,900)).toBeNull();
    const falseLock=structuredClone(saved);falseLock[2].locked=true;falseLock[2].x+=40;expect(rules.puzzleValidatedLayout(falseLock,pieces,board,600,900)).toBeNull();
    const disconnected=pieces.map((p)=>({index:p.index,x:p.homeX,y:p.homeY,turn:0,groupId:p.index===3?0:p.groupId,locked:false}));
    expect(rules.puzzleValidatedLayout(disconnected,pieces,board,600,900)).toBeNull();
    expect(rules.puzzleValidatedLayout(saved.map(p=>({...p,displayScale:1})),pieces,board,600,900)).not.toBeNull();
    for(const displayScale of [NaN,Infinity,0,1.1]) expect(rules.puzzleValidatedLayout(saved.map(p=>({...p,displayScale})),pieces,board,600,900)).toBeNull();
  });
  it('运行时脚本可解析，归位与组拼进度均保留v2迁移入口',()=>{
    expect(()=>new Function(puzzleScript)).not.toThrow();
    expect(puzzleScript).toContain('![2,3].includes(saved.schemaVersion)');
    expect(puzzleScript).toContain('schemaVersion:3');
    expect(puzzleScript).toContain('elapsedActiveMs=count(saved.elapsedActiveMs');
  });
  it('先免费解释，再耗一次目标提示；用尽后仍允许解释',()=>{
    const fn=puzzleScript.match(/function showPuzzleHint\(\)\{[^\n]+/)![0];
    const run=new Function('budget',`let running=true,puzzlePaused=false,hintsRemaining=budget,hintsUsed=0,selectedGroupId=0,workshopHintIndex=-1,hintPieceIndex=-1,hintUntil=0,rows=2;
      const pieces=[{index:0,groupId:0,locked:false,row:0,angle:0,edges:{top:0,left:0,right:1,bottom:1}}];
      const selectedPieces=()=>pieces,visibleWorkshopPiece=()=>true,setStatus=()=>{},syncPuzzleControls=()=>{},drawPuzzle=()=>{},persistPuzzleSession=()=>{},playSound=()=>{},puzzleRegion=()=>0;
      ${fn};return {hint:showPuzzleHint,state:()=>({hintsRemaining,hintsUsed,workshopHintIndex})};`);
    const state=run(2);expect(state.hint()).toBe(true);expect(state.state().hintsRemaining).toBe(2);
    state.hint();expect(state.state().hintsRemaining).toBe(1);expect(state.state().hintsUsed).toBe(1);
    const empty=run(0);expect(empty.hint()).toBe(true);expect(empty.hint()).toBe(true);expect(empty.state().hintsUsed).toBe(0);
  });
  it('v2恢复真实归位，v3恢复跨视口小组、已用提示和有效计时，坏布局退回归位记录',()=>{
    const fn=puzzleScript.match(/function restorePuzzleSession\(\)\{[^\n]+/)![0];
    const restore=new Function('saved','source',puzzleWorkshopScript+`
      let pieces=structuredClone(source),restoredPieces=0,restoredGroups=0,placedCount=0,moves=0,bounceCount=0,connectionCount=0,hintsRemaining=3,hintsUsed=0,elapsedActiveMs=0,remainingMs=90000,regionFilter='all',edgeOnly=false;
      const activeLevelId='garden',activePieceCount=4,puzzleMode='timed',rotationEnabled=false,currentCampaignLevel=()=>({number:1}),puzzleBlueprint=()=>({hintUses:3}),puzzleSessionKey=()=>'',safeStorage={getItem:()=>JSON.stringify(saved)},board={x:100,y:100,cellWidth:100,cellHeight:100},canvas={width:600,height:900},trayScale=.7,timeLimitMs=90000,groupPieces=(id)=>pieces.filter(p=>p.groupId===id);
      ${fn};restorePuzzleSession();return {pieces,restoredPieces,restoredGroups,remainingMs,elapsedActiveMs,hintsRemaining,hintsUsed};`);
    const base={schemaVersion:2,level:1,imageLevel:'garden',pieceCount:4,mode:'timed',rotation:false,locked:[2],hintsRemaining:2,hintsUsed:1};
    expect(restore(base,pieces).restoredPieces).toBe(1);
    const current={...base,schemaVersion:3,layout:pieces.map(p=>({index:p.index,x:(p.homeX-100)/100,y:(p.homeY-100)/100,turn:0,groupId:p.index===1?0:p.groupId,locked:false,displayScale:1})),elapsedActiveMs:12000,remainingMs:78000};
    const result=restore(current,pieces);expect(result.restoredGroups).toBe(1);expect(result.pieces[1].x-result.pieces[0].x).toBe(100);expect(result.remainingMs).toBe(78000);expect(result.elapsedActiveMs).toBe(12000);expect(result.hintsUsed).toBe(1);
    expect(result.pieces[2].displayScale).toBe(1);
    const corrupt=structuredClone(current);corrupt.layout[1].x=NaN;
    expect(restore(corrupt,pieces).restoredPieces).toBe(1);
    expect(restore({...base,imageLevel:'other'},pieces).restoredPieces).toBe(0);
  });
  it('整理将越界组整体平移回可达区域，不改组内距离',()=>{
    const group=[{x:-500,y:1100,angle:0,displayScale:1},{x:-400,y:1100,angle:0,displayScale:1}];
    const delta=rules.puzzleRecoverGroupOffset(group,board,{left:12,right:588,top:74,bottom:700});
    expect(group[0].x+delta.dx).toBeGreaterThan(12);expect(group[1].y+delta.dy).toBeLessThan(700);
    expect((group[1].x+delta.dx)-(group[0].x+delta.dx)).toBe(100);
    expect(rules.puzzleRecoverGroupOffset([{x:200,y:200}],board,{left:12,right:588,top:74,bottom:700})).toEqual({dx:0,dy:0});
  });
  it('显式重开先删除本局存档，普通开始仍可恢复；图片载入中拒绝保存旧拼块',()=>{
    const restart=puzzleScript.match(/restartCurrentGame=\(\)=>\{[^\n]+/)![0];
    const calls:string[]=[];
    new Function('clearPuzzleSession','setGameSessionState','startGame',`let restartCurrentGame;${restart};restartCurrentGame();`)(()=>calls.push('clear'),()=>calls.push('state'),()=>calls.push('start'));
    expect(calls).toEqual(['clear','state','start']);
    const persist=puzzleScript.match(/function persistPuzzleSession\(\)\{[^\n]+/)![0];
    expect(()=>new Function(`const puzzleImageLoading=true;${persist};persistPuzzleSession();`)()).not.toThrow();
    expect(puzzleScript).toContain('lastTimerSecond=-1;restorePuzzleSession();hideOverlay()');
  });
});
