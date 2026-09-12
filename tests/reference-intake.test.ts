import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasUsableReferenceEvidence, inspectPublicReference } from "../src/server/reference-intake";

test("公开参考只归档页面摘要并保留嵌入玩法未知", async () => {
  const evidence = await inspectPublicReference("参考 https://example.com/game", async () => new Response('<title>公开游戏页</title><meta name="description" content="简短公开说明">', { status: 200, headers: { "content-type": "text/html" } }));
  assert.deepEqual(evidence.map(item => item.status), ["observed", "unknown"]);
  assert.match(evidence[0]!.claim, /公开游戏页/);
  assert.match(evidence[1]!.claim, /不能证明未实际执行的交互/);
});

test("站点导航不能冒充玩法证据，并从真实页面形状中提取玩法与操作章节", async () => {
  const html = readFileSync(join(import.meta.dirname, "..", "src", "server", "fixtures", "piece-of-cake-public-reference.html"), "utf8");
  const evidence = await inspectPublicReference("复制 https://example.com/piece-of-cake", async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
  assert.equal(hasUsableReferenceEvidence(evidence), true);
  const gameplay = evidence.filter(item => item.basis === "gameplay-text").map(item => item.claim).join("\n");
  assert.match(gameplay, /merge matching items/);
  assert.match(gameplay, /Drag one object/);
  assert.doesNotMatch(gameplay, /Recently played New Popular Games/);
});

test("只有标题与游戏站导航时不能形成可用玩法证据", async () => {
  const html = '<title>Merge Game — Play Now</title><body><nav>Home Recently played New Popular Games Clicker Driving Puzzle</nav></body>';
  const evidence = await inspectPublicReference("复制 https://example.com/shell", async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
  assert.equal(hasUsableReferenceEvidence(evidence), false);
  assert.equal(evidence.some(item => item.basis === "gameplay-text"), false);
});

test("私网参考不发请求并记录未知", async () => {
  let called = false;
  const evidence = await inspectPublicReference("参考 http://127.0.0.1/private", async () => { called = true; throw new Error("不应请求"); });
  assert.equal(called, false);
  assert.equal(evidence[0]?.status, "unknown");
  assert.match(evidence[0]?.claim ?? "", /私有网络/);
});

test("IPv4-mapped IPv6 私网同样拒绝", async () => {
  let called = false;
  const evidence = await inspectPublicReference("参考 http://[::ffff:127.0.0.1]/private", async () => { called = true; throw new Error("不应请求"); });
  assert.equal(called, false);
  assert.equal(evidence[0]?.status, "unknown");
});
