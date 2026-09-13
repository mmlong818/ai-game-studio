import assert from "node:assert/strict";
import test from "node:test";
import { analyzeReferenceMechanics, collectReferenceClientSource, collectReferenceMechanicsSource, discoverEntryCandidates, referenceMechanicsEvidence } from "../src/server/reference-mechanics";
import { isUnknownRuleText, parseReferenceMechanics, referenceMechanicsPrompt } from "../src/shared/reference-mechanics";
import { contractRules } from "../src/server/design-contract";
import { createDesignProfile } from "../src/shared/contracts";

// 全部使用假 fetch：不访问任何真实网站，不调用任何模型。

const gameScript = `const BOARD=[];function build(level){const w=15+level*2;return {w,h:w+5};}\n${"function step(){/* rules */}\n".repeat(120)}`;
const site: Record<string, { body: string; type: string }> = {
  "https://example.com/arrow/": { type: "text/html", body: `<html><head><title>Arrow</title><script src="/_next/static/chunks/app.js"></script><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script></head><body><div data-player-iframe-area="true"><button aria-label="Play">Play</button></div><script>self.__next_f.push(["src\\":\\"/games/arrow/index.html\\""])</script></body></html>` },
  "https://example.com/games/arrow/index.html": { type: "text/html", body: `<html><head><title>Arrow Game</title><script src="./engine.js"></script><script src="https://www.clarity.ms/tag/abc"></script></head><body><div id="hud">LVL 1</div><canvas></canvas><script>${gameScript}</script></body></html>` },
  "https://example.com/games/arrow/engine.js": { type: "application/javascript", body: "function render(){}\n".repeat(40) },
  "https://example.com/_next/static/chunks/app.js": { type: "application/javascript", body: "console.log('shell');" },
};
const fakeFetch: typeof fetch = async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  const hit = site[url];
  if (!hit) return new Response("not found", { status: 404 });
  return new Response(hit.body, { status: 200, headers: { "content-type": hit.type } });
};

test("从落地页 HTML 里发现同源游戏入口，忽略第三方与跨源地址", () => {
  const candidates = discoverEntryCandidates(site["https://example.com/arrow/"]!.body, "https://example.com/arrow/");
  assert.ok(candidates.includes("https://example.com/games/arrow/index.html"), JSON.stringify(candidates));
  assert.ok(candidates.every(url => url.startsWith("https://example.com/")));
});

test("选取真正承载游戏逻辑的文档：内联脚本 + 同源脚本文件，跳过统计/广告脚本", async () => {
  const source = await collectReferenceMechanicsSource("https://example.com/arrow/", fakeFetch);
  assert.ok(source);
  assert.equal(source.entryUrl, "https://example.com/games/arrow/index.html");
  assert.equal(source.inlineScripts, 1);
  assert.equal(source.scriptFiles, 1);
  assert.ok(source.code.includes("function build(level)"));
  assert.ok(source.code.includes("function render()"));
  assert.ok(source.skipped.some(item => item.includes("clarity.ms")));
  assert.ok(!source.markup.includes("<script"));
});

test("没有足够客户端脚本的页面返回 null，不把站点壳当成游戏", async () => {
  assert.equal(await collectReferenceClientSource(["https://example.com/_next/static/chunks/app.js", "https://example.com/missing"], fakeFetch), null);
});

test("脚本总量受上限约束，超出部分记录为跳过", async () => {
  const source = await collectReferenceClientSource(["https://example.com/games/arrow/index.html"], fakeFetch, { documentBytes: 1_048_576, totalScriptBytes: gameScript.length + 100, maxScriptFiles: 8, minCodeChars: 100 });
  assert.ok(source);
  assert.ok(source.bytes <= gameScript.length + 100);
});

test("机制分析只向模型要规则层事实，产出经校验的档案与可审查证据", async () => {
  const dossier = {
    title: "Arrow", controls: ["点击箭头"], entities: ["箭头：有朝向"], core_rule: "点击后沿朝向检查路径，畅通则滑出", blocking_rule: "路径被占则不动并扣 1 心（同一箭头连点不重复扣）",
    win_condition: "所有箭头离场", lose_condition: "心数为 0 或倒计时归零", timer: "第 2 关起 max(4×箭头数,120) 秒并向上取整到 5 的倍数", lives: "初始 4 颗",
    levels: "前 100 关来自表格，之后按公式生成，无上限", level_structure: "宽高随关号线性增长；每 10 关为大关", scoring: "无分数，只有连胜", board: "W×H 网格", ui_layout: "顶部 HUD", feedback: ["成功滑出时上行音阶"], unknowns: ["配色与字体"],
  };
  let seenBody: any = null;
  const textFetch: typeof fetch = async (_url, init) => {
    seenBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(dossier) } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const source = (await collectReferenceMechanicsSource("https://example.com/arrow/", fakeFetch))!;
  const result = await analyzeReferenceMechanics(source, { fetchImpl: textFetch, endpoint: "https://text.local/v1/chat/completions", apiKey: "sk-test_1234567890abcdef", requestOptions: { model: "test-model" } });
  assert.equal(result.winCondition, "所有箭头离场");
  assert.equal(result.levelStructure, "宽高随关号线性增长；每 10 关为大关");
  assert.equal(seenBody.model, "test-model");
  assert.equal(seenBody.response_format.json_schema.name, "reference_mechanics");
  assert.match(seenBody.messages[0].content, /禁止输出任何原代码片段/);
  assert.ok(seenBody.messages[1].content.includes("function build(level)"), "客户端脚本应作为分析输入");
  const evidence = referenceMechanicsEvidence(result, source.entryUrl);
  assert.ok(evidence.every(item => item.source === source.entryUrl));
  assert.ok(evidence.some(item => item.basis === "gameplay-source" && item.claim.includes("所有箭头离场")));
  assert.ok(evidence.some(item => item.status === "unknown" && item.claim.includes("配色与字体")));
  const prompt = referenceMechanicsPrompt(result);
  assert.match(prompt, /不含也不得照搬任何原代码/);
  assert.match(prompt, /关卡结构与生成规律：宽高随关号线性增长/);
});

test("模型输出不符合档案合同时抛错，超长字段只截断", async () => {
  const badFetch: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: "x" }) } }] }), { status: 200 });
  const source = (await collectReferenceMechanicsSource("https://example.com/arrow/", fakeFetch))!;
  await assert.rejects(analyzeReferenceMechanics(source, { fetchImpl: badFetch, endpoint: "https://text.local", apiKey: "sk-test_1234567890abcdef", requestOptions: {} }));
  const long = parseReferenceMechanics({ title: "t", controls: [], entities: [], core_rule: "r".repeat(9000), blocking_rule: "", win_condition: "", lose_condition: "", timer: "", lives: "", levels: "", level_structure: "", scoring: "", board: "", ui_layout: "", feedback: [], unknowns: [] });
  assert.equal(long.coreRule.length, 6000);
});

test("方案里写成“未知”的胜负条件不进入规则审核清单", () => {
  const profile = { ...createDesignProfile("generated", "standard"), coreLoop: ["点击箭头"], winCondition: "未知", failCondition: "箭头被挡住时本次无法滑出", generatedCampaign: null };
  const rules = contractRules(profile);
  assert.ok(!rules.some(rule => rule.startsWith("胜利条件")));
  assert.ok(rules.some(rule => rule.startsWith("失败条件")));
  assert.equal(isUnknownRuleText("未知。"), true);
  assert.equal(isUnknownRuleText("清空全部箭头"), false);
});
