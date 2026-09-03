// @ts-nocheck
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const core = await import("../fixtures/freecell/game-core.js");
const fixtureRoot = resolve("fixtures", "freecell");

// Microsoft FreeCell 第 1 号牌局的公开牌面(按行从左到右发牌),用于锁定 LCG 发牌算法。
const knownDealOne = [
  "JD 2D 9H JC 5D 7H 7C 5H",
  "KD KC 9S 5S AD QC KH 3H",
  "2S KS 9D QD JS AS AH 3C",
  "4C 5C 10S QH 4H AC 4D 7S",
  "3S 10D 4S 10H 8H 2C JH 7D",
  "6D 8S 8D QS 6C 3D 8C 10C",
  "6S 9C 2H 6H",
].join("\n");

test("Microsoft 发牌算法复现第 1 号牌局并且 52 张牌不重不漏", () => {
  const columns = core.dealMicrosoft(1);
  assert.equal(core.formatDeal(columns).split("\n").map((row) => row.trim()).join("\n"), knownDealOne);
  assert.deepEqual(columns.map((column) => column.length), [7, 7, 7, 7, 6, 6, 6, 6]);
  const all = columns.flat().sort((left, right) => left - right);
  assert.deepEqual(all, Array.from({ length: 52 }, (_, index) => index));
  assert.notDeepEqual(core.dealMicrosoft(2), core.dealMicrosoft(1));
  assert.equal(core.formatDeal(core.dealMicrosoft(617)).split("\n")[0].trim(), "7D AD 5C 3S 5S 8C 2D AH");
  assert.throws(() => core.dealMicrosoft(0));
});

test("列内叠放必须交替颜色且点数递减,收牌堆按花色从 A 到 K", () => {
  const state = {
    gameNumber: 0,
    columns: [
      [core.RANK_LABELS.indexOf("9") * 4 + 3, core.RANK_LABELS.indexOf("8") * 4 + 2], // 9S 8H
      [core.RANK_LABELS.indexOf("7") * 4 + 0], // 7C
      [core.RANK_LABELS.indexOf("7") * 4 + 1], // 7D
      [], [], [], [], [],
    ],
    cells: [null, null, null, null],
    foundations: [0, 0, 0, 0],
  };
  const fromColumn0 = { type: "column", index: 0 };
  assert.equal(core.validateMove(state, { from: { type: "column", index: 1 }, to: fromColumn0, count: 1 }).ok, true, "黑 7 放红 8 合法");
  assert.equal(core.validateMove(state, { from: { type: "column", index: 2 }, to: fromColumn0, count: 1 }).ok, false, "红 7 放红 8 不合法");
  assert.equal(core.validateMove(state, { from: fromColumn0, to: { type: "cell", index: 0 }, count: 2 }).ok, false, "空档只能放一张");
  assert.equal(core.validateMove(state, { from: fromColumn0, to: { type: "foundation" }, count: 1 }).ok, false, "8H 不能直接进收牌堆");
  const ace = 0 * 4 + 2; // AH
  const withAce = { ...state, cells: [ace, null, null, null] };
  assert.equal(core.validateMove(withAce, { from: { type: "cell", index: 0 }, to: { type: "foundation", index: 2 }, count: 1 }).ok, true);
  const next = core.applyMove(withAce, { from: { type: "cell", index: 0 }, to: { type: "foundation", index: 2 }, count: 1 });
  assert.deepEqual(next.foundations, [0, 0, 1, 0]);
  assert.equal(next.cells[0], null);
  assert.equal(withAce.cells[0], ace, "applyMove 不修改原状态");
});

test("超级移动上限为 (空档数+1)×2^(空列数),目标为空列时不计入该列", () => {
  const run = [10 * 4 + 3, 9 * 4 + 2, 8 * 4 + 0, 7 * 4 + 1, 6 * 4 + 3]; // JS 10H 9C 8D 7S
  const base = {
    gameNumber: 0,
    columns: [run, [11 * 4 + 1], [], [], [], [], [], []], // 目标 QD 在第 2 列
    cells: [null, null, null, null],
    foundations: [0, 0, 0, 0],
  };
  assert.equal(core.orderedRunLength(run), 5);
  assert.equal(core.maxMovableCount(base, false), 5 * 2 ** 6);
  const twoCellsOneEmpty = { ...base, cells: [1 * 4 + 0, 2 * 4 + 0, null, null], columns: [run, [11 * 4 + 1], [3 * 4 + 0], [3 * 4 + 1], [3 * 4 + 2], [3 * 4 + 3], [4 * 4 + 0], []] };
  assert.equal(core.maxMovableCount(twoCellsOneEmpty, false), 6, "(2+1)×2^1");
  assert.equal(core.maxMovableCount(twoCellsOneEmpty, true), 3, "搬到空列本身时只剩 (2+1)×2^0");
  const move = { from: { type: "column", index: 0 }, to: { type: "column", index: 1 }, count: 5 };
  assert.equal(core.validateMove(twoCellsOneEmpty, move).ok, true);
  const noRoom = { ...twoCellsOneEmpty, cells: [1 * 4 + 0, 2 * 4 + 0, 5 * 4 + 0, null], columns: twoCellsOneEmpty.columns.map((column, index) => (index === 7 ? [5 * 4 + 1] : column)) };
  assert.equal(core.maxMovableCount(noRoom, false), 2);
  const verdict = core.validateMove(noRoom, move);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.code, "supermove-limit");
  assert.equal(verdict.limit, 2);
  assert.match(verdict.reason, /最多一次搬 2 张/);
  // 只搬底部两张(8D 7S)到黑 9 上:2 张在上限内且叠放合法。
  const nineTarget = { ...noRoom, columns: noRoom.columns.map((column, index) => (index === 6 ? [8 * 4 + 0] : column)) };
  assert.equal(core.validateMove(nineTarget, { from: { type: "column", index: 0 }, to: { type: "column", index: 6 }, count: 2 }).ok, true);
  assert.equal(core.validateMove(nineTarget, { from: { type: "column", index: 0 }, to: { type: "column", index: 6 }, count: 3 }).ok, false);
  const toEmpty = { from: { type: "column", index: 0 }, to: { type: "column", index: 7 }, count: 3 };
  assert.equal(core.validateMove(twoCellsOneEmpty, toEmpty).ok, true);
  assert.equal(core.validateMove(twoCellsOneEmpty, { ...toEmpty, count: 4 }).ok, false);
});

test("安全自动收牌只收不会再被需要的牌", () => {
  const state = {
    gameNumber: 0,
    columns: [[0 * 4 + 3], [1 * 4 + 3], [4 * 4 + 2], [], [], [], [], []], // AS 2S 5H
    cells: [null, null, null, null],
    foundations: [0, 0, 0, 0],
  };
  const auto = core.autoPlayAll(state);
  assert.deepEqual(auto.state.foundations, [0, 0, 0, 2], "A、2 直接自动收");
  assert.equal(auto.moves.length, 2);
  const fiveReady = { ...state, columns: [[], [], [4 * 4 + 2], [], [], [], [], []], foundations: [3, 0, 4, 3] };
  assert.equal(core.isSafeToFoundation(fiveReady, 4 * 4 + 2), false, "黑 4 还没全部收完时红 5 不能自动收");
  assert.equal(core.isSafeToFoundation({ ...fiveReady, foundations: [4, 0, 4, 4] }, 4 * 4 + 2), true);
});

test("第 1 到 100 号牌局都能被有界求解器解出,且解路径逐步合法", { timeout: 120_000 }, () => {
  const unsolved = [];
  for (let level = 1; level <= core.LEVEL_COUNT; level += 1) {
    const result = core.solve(core.createState(level), { maxNodes: 150_000 });
    if (!result.solved) {
      unsolved.push(level);
      continue;
    }
    let state = core.autoPlayAll(core.createState(level)).state;
    for (const step of result.moves) {
      assert.equal(core.validateMove(state, step.move).ok, true, `第 ${level} 关解路径包含非法移动`);
      state = core.autoPlayAll(core.applyMove(state, step.move)).state;
    }
    assert.equal(core.isWon(state), true, `第 ${level} 关解路径没有走到胜利`);
  }
  assert.deepEqual(unsolved, [], "所有 100 关都必须可解");
});

test("点击自动放置优先收牌堆,其次非空列、空档、空列", () => {
  const state = core.autoPlayAll(core.createState(1)).state;
  // 第 1 局第 6 列底牌 3D:没有收牌堆和列可放,应进入空档。
  const best = core.findBestDestination(state, { type: "column", index: 5 }, 1);
  assert.deepEqual(best.to, { type: "cell", index: 0 });
  // 第 4 列底牌 6H 可放到第 1 列的 ... 不合法;第 3 列 2H 放第 6 列 3D? 3D 为红色不合法。检验找不到时返回 null。
  const blocked = { ...state, cells: [1, 2, 3, 4] };
  assert.equal(core.findBestDestination(blocked, { type: "column", index: 5 }, 1), null);
});

test("固定游戏交付包为纯位图资源并带有 gpt-image-2 溯源", () => {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(fixtureRoot);
  assert.equal(files.some((file) => file.toLowerCase().endsWith(".svg")), false);
  const source = ["index.html", "styles.css", "app.js"].map((file) => readFileSync(join(fixtureRoot, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /<svg\b|image\/svg\+xml|\.svg\b/i);
  const manifest = JSON.parse(readFileSync(join(fixtureRoot, "_studio", "DYNAMIC_ART.json"), "utf8"));
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.model, "gpt-image-2");
  assert.ok(manifest.entries.some((entry) => entry.file === "assets/cover.png" && entry.role === "封面"));
  assert.ok(manifest.entries.some((entry) => entry.file === "assets/card-back.png"));
  for (const suit of core.SUITS) assert.ok(manifest.entries.some((entry) => entry.file === `assets/suits/${suit}.png`));
  for (const entry of manifest.entries) {
    const path = join(fixtureRoot, entry.file);
    assert.ok(existsSync(path), `缺少 ${entry.file}`);
    assert.equal(statSync(path).size, entry.bytes, `${entry.file} 字节数与溯源不一致`);
    assert.ok(entry.prompt.length > 40);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  }
  assert.match(readFileSync(join(fixtureRoot, "_studio", "ART_PROVENANCE.md"), "utf8"), /sha256/);
  const app = readFileSync(join(fixtureRoot, "app.js"), "utf8");
  assert.match(app, /freecell\.cardBack\.v1/);
  assert.match(app, /toDataURL/);
  assert.doesNotMatch(app, /fetch\(|XMLHttpRequest/, "牌背图片不得上传");
});

test("四个空档占满、没有任何合法落点时 legalMoves 返回空数组", () => {
  // 红黑 Q 分别压在 A 上，3 压在 2 上，四张 K 占满空档：既不能收牌，也没有可叠放的目标或空列。
  const state = {
    gameNumber: 0,
    columns: [[0, 11 * 4 + 2], [1, 11 * 4 + 1], [2, 11 * 4 + 3], [3, 11 * 4 + 0], [1 * 4 + 0, 2 * 4 + 2], [1 * 4 + 1, 2 * 4 + 1], [1 * 4 + 2, 2 * 4 + 3], [1 * 4 + 3, 2 * 4 + 0]],
    cells: [12 * 4 + 0, 12 * 4 + 1, 12 * 4 + 2, 12 * 4 + 3],
    foundations: [0, 0, 0, 0],
  };
  assert.equal(core.legalMoves(state).length, 0);
  // 腾出一个空档后就有合法移动了。
  assert.ok(core.legalMoves({ ...state, cells: [12 * 4 + 0, 12 * 4 + 1, 12 * 4 + 2, null] }).length > 0);
});
