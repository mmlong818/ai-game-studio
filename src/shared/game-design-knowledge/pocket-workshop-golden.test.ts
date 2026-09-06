import { describe, expect, it } from "vitest";
import { POCKET_WORKSHOP_ASSISTANCE, POCKET_WORKSHOP_LEVELS, POCKET_WORKSHOP_ONBOARDING, pocketWorkshopHint, resolvePocketWorkshop, validateWorkshopLayout } from "./pocket-workshop-golden";

describe("掌心工坊黄金玩法内核", () => {
  it("二十关分为五章，每关作者解合法且达到确定性目标", () => {
    expect(POCKET_WORKSHOP_LEVELS).toHaveLength(20); expect(new Set(POCKET_WORKSHOP_LEVELS.map(({ name }) => name)).size).toBe(20);
    for (const level of POCKET_WORKSHOP_LEVELS) {
      expect(level.chapter).toBeTruthy(); expect(level.tier).toBe(Math.ceil(level.number / 4));
      expect(validateWorkshopLayout(level, level.solution)).toMatchObject({ valid: true, complete: true });
      const first = resolvePocketWorkshop(level, level.solution); const second = resolvePocketWorkshop(level, structuredClone(level.solution));
      expect(first.won, `第 ${level.number} 关作者解`).toBe(true); expect(second).toEqual(first);
    }
  });

  it("越界、损坏格、重叠和重复零件都会被规则拒绝", () => {
    const level = POCKET_WORKSHOP_LEVELS[15]!; const part = level.parts[0]!;
    expect(validateWorkshopLayout(level, [{ partId: part.id, row: -1, column: 0, rotation: 0 }]).errors.join(" ")).toMatch(/越出容器/);
    expect(validateWorkshopLayout(level, [{ partId: part.id, row: level.blocked[0]![0], column: level.blocked[0]![1], rotation: 0 }]).errors.join(" ")).toMatch(/损坏格/);
    expect(validateWorkshopLayout(level, [{ partId: part.id, row: 1, column: 1, rotation: 0 }, { partId: level.parts[1]!.id, row: 1, column: 1, rotation: 0 }]).errors.join(" ")).toMatch(/重叠/);
    expect(validateWorkshopLayout(level, [{ partId: part.id, row: 1, column: 1, rotation: 0 }, { partId: part.id, row: 2, column: 2, rotation: 0 }]).errors.join(" ")).toMatch(/重复放置/);
  });

  it("完整但分散的布局会失败，证明邻接位置是有意义选择", () => {
    const level = POCKET_WORKSHOP_LEVELS[7]!; const scattered = level.parts.map((part, index) => ({ partId: part.id, row: index < 2 ? 0 : 3, column: (index % 2) * 3, rotation: 0 }));
    const result = resolvePocketWorkshop(level, scattered); expect(result.complete).toBe(true); expect(result.score).toBeLessThan(level.targetScore); expect(result.won).toBe(false);
  });

  it("教学只要求三个安全动作，连续失败逐级公开帮助", () => {
    expect(POCKET_WORKSHOP_ONBOARDING.map(({ requiredSignal }) => requiredSignal)).toEqual(["part-inspected", "synergy-previewed", "resolution-explained"]);
    expect(POCKET_WORKSHOP_ONBOARDING.every(({ safe }) => safe)).toBe(true); expect(POCKET_WORKSHOP_ASSISTANCE.map(({ afterFailures }) => afterFailures)).toEqual([1, 2, 3]);
    const level = POCKET_WORKSHOP_LEVELS[0]!; expect(pocketWorkshopHint(level, [], 1)?.placement).toBeNull(); expect(pocketWorkshopHint(level, [], 3)?.placement).toEqual(level.solution[0]);
  });
});

