import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { merge2048Script } from "./merge-2048.js";

function session() {
  const context = createContext({ config: { campaignStorageKey: "isolated-project:version", difficulty: "standard" }, performance: { now: () => 0 } });
  // Execute the real runtime declarations and rule functions, before browser event registration.
  runInContext(merge2048Script.slice(0, merge2048Script.indexOf("function mergeLayout()")), context);
  return (code: string) => runInContext(code, context);
}

describe("2048 新生块任务", () => {
  it("所有关卡必须达到完整目标，随机技巧没有资格阻挡主目标通关",()=>{
    const run=session();
    expect(run("mergeBlueprints[0].target")).toBe(128);
    expect(run("mergeBlueprints.every((item,index)=>item.target===[128,256,512,1024,2048][Math.floor(index/4)])")).toBe(true);
    run("mergeBlueprint=mergeBlueprints[9];mergeTarget=mergeBlueprint.target;bestTile=64;mergePreviewFours=2;");
    expect(run("mergeMissionComplete()")).toBe(false);
    run("bestTile=mergeTarget;mergePreviewFours=0;");
    expect(run("mergeMissionComplete()")).toBe(true);
    run("mergeEndless=true;");expect(run("mergeMissionComplete()")).toBe(false);
  });
  it("方向预览与一次一并规则同源且不消耗随机数",()=>{
    const run=session();run("board2048=[[2,2,2,2],[0,0,0,0],[0,0,0,0],[0,0,0,0]];");
    expect(run("JSON.stringify(mergeDirectionOptions().find(option=>option.direction==='left'))")).toBe(JSON.stringify({direction:'left',legal:true,gain:8,pairs:2,spacesAfterSpawn:13}));
    expect(run("mergeRngState")).toBe(1);
    expect(run("mergeDirectionOptions().find(option=>option.direction==='up').legal")).toBe(false);
  });
  it("拒绝损坏棋盘与伪造坐标，关卡及无尽存档键互不重叠",()=>{
    const run=session();run("board2048=emptyBoard();board2048[0][0]=2;const state=mergeSnapshot();");
    expect(run("validMergeSnapshot(state)")).toBe(true);
    run("state.board[0][0]=3;");expect(run("validMergeSnapshot(state)")).toBe(false);
    run("state.board[0][0]=2;state.trackedSpawn={row:9,column:0,value:2};");expect(run("validMergeSnapshot(state)")).toBe(false);
    const first=run("mergeStorageKey()");run("mergeLevelNumber=2;");expect(run("mergeStorageKey()")).not.toBe(first);
    run("mergeEndless=true;");expect(run("mergeStorageKey()")).toContain(':endless');
  });
  it("随机生成本身不增加任务进度，真实合并指定新生块才增加", () => {
    const run = session();
    run("board2048 = emptyBoard(); spawnNumber();");
    expect(run("mergePreviewTwos + mergePreviewFours")).toBe(0);
    run("board2048 = [[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; mergeTrackedSpawn = {row:0,column:1,value:2}; recordMergeSpawnUse(resolveMergeMove(board2048,'left'));");
    expect(run("mergePreviewTwos")).toBe(1);
    run("recordMergeSpawnUse(resolveMergeMove(board2048,'left'));");
    expect(run("mergePreviewTwos")).toBe(1);
  });
  it("空操作保留机会，其他方块合并和教学不能冒充任务完成", () => {
    const run = session();
    run("board2048 = [[2,4,0,0],[8,8,0,0],[0,0,0,0],[0,0,0,0]]; mergeTrackedSpawn={row:0,column:0,value:2}; recordMergeSpawnUse({changed:false});");
    expect(run("mergeTrackedSpawn.value")).toBe(2);
    run("recordMergeSpawnUse(resolveMergeMove(board2048,'left'));");
    expect(run("mergePreviewTwos")).toBe(0);
    run("mergeTutorialMode='merge'; mergeTrackedSpawn={row:1,column:0,value:8}; recordMergeSpawnUse(resolveMergeMove(board2048,'left'));");
    expect(run("mergePreviewTwos + mergePreviewFours")).toBe(0);
  });
  it("撤销恢复任务机会与计数；旧存档保留棋盘但清除旧口径证据", () => {
    const run = session();
    run("board2048=emptyBoard(); board2048[0]=[4,4,0,0]; mergeTrackedSpawn={row:0,column:1,value:4}; const saved=mergeSnapshot(); recordMergeSpawnUse(resolveMergeMove(board2048,'left'));");
    expect(run("mergePreviewFours")).toBe(1);
    run("restoreMergeSnapshot(saved);");
    expect(run("mergePreviewFours")).toBe(0);
    expect(run("mergeTrackedSpawn.value")).toBe(4);
    run("saved.previewTwos=90; delete saved.missionSchema; restoreMergeSnapshot(saved);");
    expect(run("mergePreviewTwos")).toBe(0);
    expect(run("board2048[0][0]")).toBe(4);
  });
  it("不同游戏实例的任务状态互不影响", () => {
    const a = session(); const b = session();
    a("mergePreviewTwos=12;");
    expect(b("mergePreviewTwos")).toBe(0);
  });
});
