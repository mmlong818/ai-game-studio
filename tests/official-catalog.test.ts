import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { fixtureSpecBuilders, officialFixtures } from "../src/server/official-fixtures";
import { StudioRepository } from "../src/server/studio-repository";
import { OFFICIAL_GAMES, officialFixtureGames, officialLobbyOrder } from "../src/shared/official-games";

async function createRepository() {
  const database = await openTestDatabase();
  return { database, repository: new StudioRepository(database, "http://127.0.0.1:4312") };
}

/** 直接把一个项目标成“已发布且在线”，绕过构建管线，只为测试目录同步。 */
async function publishDirectly(database: Awaited<ReturnType<typeof openTestDatabase>>, projectId: string, versionId: string, slug: string, publishedAt: string) {
  await database.query("UPDATE projects SET status = 'published' WHERE id = $1", [projectId]);
  await database.query(
    `INSERT INTO publications (id, project_id, version_id, status, stable_path, version_path, published_at)
     VALUES ($1, $2, $3, 'live', $4, $5, $6)`,
    [`publication-${slug}`, projectId, versionId, `/play/${slug}/`, `/version/${slug}/`, publishedAt],
  );
}

test("登记表里的每个固定游戏都有服务端玩法合同构造，且 officialFixtures 与登记顺序一致", () => {
  const registered = officialFixtureGames();
  assert.deepEqual(officialFixtures.map((fixture) => fixture.kind), registered.map((game) => game.fixtureKind));
  for (const game of registered) {
    assert.ok(fixtureSpecBuilders[game.fixtureKind as string], `固定游戏 ${game.id} 缺少 fixtureSpecBuilders 条目`);
    const definition = officialFixtures.find((fixture) => fixture.kind === game.fixtureKind)!;
    assert.equal(definition.metaKey, game.fixture?.metaKey);
    assert.equal(definition.input.title, game.title);
    assert.equal(definition.spec().title, game.title);
  }
});

test("启动同步按登记表标记官方并写入大厅顺序，未登记的项目不动，重复执行幂等", async () => {
  const { database, repository } = await createRepository();
  try {
    await repository.ensureOfficialFixtures();

    const tetrisGame = OFFICIAL_GAMES.find((game) => game.id === "tetris")!;
    const tetris = await repository.create({ title: tetrisGame.title, dimensions: "2d", template: "tetris", idea: tetrisGame.seed!.idea });
    await publishDirectly(database, tetris.id, tetris.version.id, "tetris-showcase", "2026-09-01T00:00:00.000Z");

    // 同名但模板不同的用户项目：不该被认作官方。
    const impostor = await repository.create({ title: tetrisGame.title, dimensions: "2d", template: "snake", idea: "同名但玩法不同的用户项目，用来验证同步不会误判。" });
    await publishDirectly(database, impostor.id, impostor.version.id, "impostor", "2026-09-01T00:00:01.000Z");

    // 未登记、由人工转官方的 AI 原创项目：保留它的 is_official 与手工 lobby_rank。
    const ladybug = await repository.create({ title: "手工转官方的用户游戏", dimensions: "2d", template: "generated", idea: "Q版小瓢虫在巨大树干的三条树纹之间高速攀爬，躲避树瘤、蘑菇和树脂，收集露珠与金色种子并冲向树冠。" });
    await publishDirectly(database, ladybug.id, ladybug.version.id, "ladybug", "2026-09-02T00:00:00.000Z");
    const officialValue = database.provider === "sqlite-test" ? 1 : true;
    await database.query("UPDATE projects SET is_official = $1, lobby_rank = $2 WHERE id = $3", [officialValue, 99, ladybug.id]);

    const first = await repository.syncOfficialCatalog();
    assert.equal(first.tetris, tetris.id);
    assert.ok(first["star-dream-duel"]);
    assert.ok(first.freecell);
    assert.equal(first.puzzle, null, "未发布的登记游戏不会被匹配");

    const ranks = new Map(officialLobbyOrder().map((game) => [game.id, game.lobbyRank]));
    const rowsAfterFirst = (await database.query<{ id: string; is_official: number | boolean; lobby_rank: number | null }>(
      "SELECT id, is_official, lobby_rank FROM projects",
    )).rows;
    const rowOf = (id: string) => rowsAfterFirst.find((row) => row.id === id)!;
    assert.equal(Boolean(rowOf(tetris.id).is_official), true);
    assert.equal(rowOf(tetris.id).lobby_rank, ranks.get("tetris"));
    assert.equal(rowOf(first["star-dream-duel"]!).lobby_rank, ranks.get("star-dream-duel"));
    assert.equal(rowOf(first.freecell!).lobby_rank, ranks.get("freecell"));
    assert.equal(Boolean(rowOf(impostor.id).is_official), false, "同名不同模板的项目不应被标记官方");
    assert.equal(rowOf(impostor.id).lobby_rank, null);
    assert.equal(Boolean(rowOf(ladybug.id).is_official), true);
    assert.equal(rowOf(ladybug.id).lobby_rank, 99, "未登记项目的手工 lobby_rank 必须原样保留");

    const second = await repository.syncOfficialCatalog();
    assert.deepEqual(second, first);
    const rowsAfterSecond = (await database.query<{ id: string; is_official: number | boolean; lobby_rank: number | null }>(
      "SELECT id, is_official, lobby_rank FROM projects",
    )).rows;
    assert.deepEqual(rowsAfterSecond, rowsAfterFirst);

    const lobby = await repository.publishedGames();
    assert.deepEqual(
      lobby.map((game) => game.title),
      [
        OFFICIAL_GAMES.find((game) => game.id === "star-dream-duel")!.title,
        tetrisGame.title,
        OFFICIAL_GAMES.find((game) => game.id === "freecell")!.title,
        "虫虫攀枝",
        "手工转官方的用户游戏",
      ],
      "大厅按 lobby_rank 升序：星梦对决(1) → 折光堆叠(13) → 空档接龙(14) → 虫虫攀枝(15) → 手工转官方的用户游戏(99)",
    );
  } finally {
    await database.close();
  }
});
