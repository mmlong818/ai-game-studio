import { describe, expect, it } from "vitest";
import { applyDeterministicArtifactRepair } from "./deterministic-artifact-repair.js";

const hint = { kind: "add-game-board-marker", elementId: "stage", elementTag: "div" } as const;

describe("deterministic artifact repair", () => {
  it("只修改运行时已确认的唯一棋盘共同容器", () => {
    const html = '<main><div id="stage" data-score="0"><canvas></canvas><div id="hint-layer"></div></div></main><script>hintLayer.append(document.createElement("button")); const fake=`<div id="stage">`;</script>';
    const repaired = applyDeterministicArtifactRepair(html, hint);
    expect(repaired?.html).toBe('<main><div data-game-board id="stage" data-score="0"><canvas></canvas><div id="hint-layer"></div></div></main><script>hintLayer.append(document.createElement("button")); const fake=`<div id="stage">`;</script>');
    expect(repaired?.strategyId).toBe("repair-game-board-marker");
  });

  it("拒绝根容器、重复 id、标签不符与已有另一棋盘", () => {
    expect(applyDeterministicArtifactRepair('<body id="stage"><canvas></canvas></body>', { ...hint, elementTag: "body" })).toBeNull();
    expect(applyDeterministicArtifactRepair('<div id="stage"></div><section><div id="stage"></div></section>', hint)).toBeNull();
    expect(applyDeterministicArtifactRepair('<section id="stage"><canvas></canvas></section>', hint)).toBeNull();
    expect(applyDeterministicArtifactRepair('<div id="board"></div><div id="stage"><canvas></canvas></div>', hint)).toBeNull();
    expect(applyDeterministicArtifactRepair('<div role="grid"></div><div id="stage"><canvas></canvas></div>', hint)).toBeNull();
  });

  it("不把脚本字符串或注释中的伪标签当作可修节点", () => {
    expect(applyDeterministicArtifactRepair('<script>const html=`<div id="stage"><canvas></canvas></div>`</script>', hint)).toBeNull();
    expect(applyDeterministicArtifactRepair('<!-- <div id="stage"><canvas></canvas></div> -->', hint)).toBeNull();
  });
});
