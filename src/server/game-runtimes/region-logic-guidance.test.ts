import { describe, expect, it } from "vitest";
import vm from "node:vm";
import { regionLogicScript } from "./region-logic.js";

function harness() {
  const context = vm.createContext({
    config: { difficulty: "standard" }, performance: { now: () => 1000 },
    document: { createElement: () => ({}), head: { appendChild() {} } },
  });
  vm.runInContext(regionLogicScript.slice(0, regionLogicScript.indexOf('canvas.addEventListener("pointerup"')), context);
  vm.runInContext('refreshRegionUi = () => {}; persistRegionSession = () => {}; playSound = () => {}; setStatus = () => {};', context);
  return (source: string) => vm.runInContext(source, context);
}

describe("region logic: understandable and fair assistance", () => {
  it("offers free observation, persistent explanation, and no repeated charge", () => {
    const run = harness();
    const before = run("regionHints");
    expect(run("requestRegionHint(); regionHint.stage")).toBe("observe");
    expect(run("regionHints")).toBe(before);
    expect(run("regionHint.until")).toBe(Infinity);
    expect(run("requestRegionHint(); regionHint.stage")).toBe("explain");
    expect(run("regionHints")).toBe(before - 1);
    expect(run("requestRegionHint(); regionHints")).toBe(before - 1);
    expect(run("placedRegionStars.size + manualRegionMarks.size")).toBe(0);
  });

  it("clears stale reasoning when the board changes", () => {
    const run = harness();
    run("regionSnapshot = () => ({}); requestRegionHint(); pushRegionHistory()");
    expect(run("regionHint")).toBeNull();
  });

  it("records free observations once per position, without erasing them on undo", () => {
    const run = harness();
    run('requestRegionHint(); requestRegionHint(); requestRegionHint();');
    expect(run("regionObservationsUsed")).toBe(1);
    run('regionHint = null; requestRegionHint();');
    expect(run("regionObservationsUsed")).toBe(1);
    run('regionHint = null; manualRegionMarks.add("0:0"); requestRegionHint();');
    expect(run("regionObservationsUsed")).toBe(2);
    run('regionHint = null; manualRegionMarks.clear(); requestRegionHint();');
    expect(run("regionObservationsUsed")).toBe(2);
  });

  it("keeps the displayed hint intact if undo or redo has no history", () => {
    const run = harness();
    run('requestRegionHint();');
    expect(run('undoRegionMove()')).toBe(false);
    expect(run('regionHint.stage')).toBe('observe');
    expect(run('redoRegionMove()')).toBe(false);
    expect(run('regionHint.stage')).toBe('observe');
  });

  it("does not refund revealed reasoning when restoring an older board snapshot", () => {
    const run = harness();
    run('running = false; const saved = regionSnapshot(); requestRegionHint(); requestRegionHint(); restoreRegionSnapshot(saved);');
    expect(run("regionHints")).toBe(2);
    expect(run("regionHintsUsed")).toBe(1);
  });

  it("does not blame a particular last star for a mistaken manual exclusion", () => {
    const run = harness();
    run('manualRegionMarks = new Set([regionKey(...regionPuzzle.solution[0])]); requestRegionHint();');
    expect(run("regionHint.rule")).toBe("conflict");
    expect(run("regionHint.text")).toContain("不一定是最后一颗星");
    expect(run("regionHints")).toBe(3);
  });

  it("never auto-excludes another valid star in a two-star unit", () => {
    const run = harness();
    expect(run(`regionLevelCatalog.filter(level => level.starsPerUnit === 2).every(level => {
      regionPuzzle = level;
      placedRegionStars = new Set([regionKey(...level.solution[0])]);
      manualRegionMarks = new Set(); recomputeAutoMarks();
      return level.solution.slice(1).every(cell => !autoRegionMarks.has(regionKey(...cell)));
    })`)).toBe(true);
  });

  it("all campaign solution prefixes remain completable with automatic marks", { timeout: 20_000 }, () => {
    const run = harness();
    expect(run(`regionLevelCatalog.every(level => {
      regionPuzzle = level; manualRegionMarks = new Set();
      return level.solution.every((_, index) => {
        placedRegionStars = new Set(level.solution.slice(0, index + 1).map(cell => regionKey(...cell)));
        recomputeAutoMarks();
        return countRegionCompletions() === 1;
      });
    })`)).toBe(true);
  });
});
