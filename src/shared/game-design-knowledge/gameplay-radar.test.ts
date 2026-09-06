import { describe, expect, it } from "vitest";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog";
import { buildGameplayRadarView, createGameplayRadarCluster, createRadarResearchTask, gameplayRadarFreshness, mergeGameplaySignal, recommendGameplayRadarMatch } from "./gameplay-radar";

const apple = {
  gameTitle: "Art of Fauna", sourceTitle: "Apple Design Awards 2025", sourceUrl: "https://apple.example/design-awards", sourceType: "annual-award" as const,
  platform: "mobile" as const, observedAt: "2026-09-05", publishedAt: "2025-06-03", signalSummary: "因包容性设计获奖。", playerVerbs: ["重排"], mechanicTags: ["puzzle", "accessibility"],
};

describe("玩法雷达", () => {
  it("把同名游戏的跨榜信号合并，并按网址幂等更新", () => {
    let cluster = createGameplayRadarCluster(apple, new Date("2026-09-05T00:00:00Z"));
    cluster = mergeGameplaySignal(cluster, { ...apple, sourceTitle: "App Store Awards 2025", sourceUrl: "https://apple.example/app-store-awards", publishedAt: "2025-12-04" }, new Date("2026-09-05T01:00:00Z"));
    cluster = mergeGameplaySignal(cluster, { ...apple, signalSummary: "再次核验包容性设计。" }, new Date("2026-09-05T02:00:00Z"));
    const unchanged = mergeGameplaySignal(cluster, cluster.signals.find(({ sourceUrl }) => sourceUrl === apple.sourceUrl)!, new Date("2026-09-05T03:00:00Z"));
    expect(cluster.signals).toHaveLength(2);
    expect(unchanged.updatedAt).toBe(cluster.updatedAt);
    expect(cluster.normalizedTitle).toBe("artoffauna");
    expect(buildGameplayRadarView(cluster, [], GAME_DESIGN_KNOWLEDGE_LIBRARY).distinctSourceCount).toBe(1);
  });

  it("按来源类别计算新鲜、临期和过期", () => {
    const cluster = createGameplayRadarCluster(apple);
    expect(gameplayRadarFreshness(cluster, new Date("2026-06-01T00:00:00Z")).freshness).toBe("fresh");
    expect(gameplayRadarFreshness(cluster, new Date("2026-07-20T00:00:00Z")).freshness).toBe("aging");
    expect(gameplayRadarFreshness(cluster, new Date("2026-09-05T00:00:00Z")).freshness).toBe("stale");
  });

  it("优先推荐相似研究任务，其次提示已知玩法", () => {
    const cluster = createGameplayRadarCluster({ ...apple, playerVerbs: ["合并"], mechanicTags: ["merge", "puzzle"] });
    const task = createRadarResearchTask(cluster, { kind: "none", id: null, label: "无", score: 0, reason: "无" });
    expect(recommendGameplayRadarMatch(cluster, [task], GAME_DESIGN_KNOWLEDGE_LIBRARY).kind).toBe("research-task");
  });

  it("每月刷新生成独立研究任务且永远从 queued 开始", () => {
    const cluster = createGameplayRadarCluster(apple);
    const match = recommendGameplayRadarMatch(cluster, [], GAME_DESIGN_KNOWLEDGE_LIBRARY);
    const first = createRadarResearchTask(cluster, match, new Date("2026-09-05T00:00:00Z"));
    const sameMonth = createRadarResearchTask(cluster, match, new Date("2026-09-28T00:00:00Z"));
    const nextMonth = createRadarResearchTask(cluster, match, new Date("2026-10-01T00:00:00Z"));
    expect(first.id).toBe(sameMonth.id);
    expect(nextMonth.id).not.toBe(first.id);
    expect(nextMonth.status).toBe("queued");
    expect(nextMonth.candidateDraft).toBeNull();
  });
});
