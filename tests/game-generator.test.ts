import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateGameSpec, getTemplateCatalog, type ProjectDetail } from "../src/shared/contracts";
import {
  GameCodeGenerator,
  inspectGeneratedArtifact,
  scanGeneratedHtml,
  stripPlatformSegments,
  writeGeneratedArtifact,
} from "../src/server/game-generator";
import { OpenAISettings } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

const contractHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>灯塔守夜人</title>
<style>#start,#restart{min-width:44px;min-height:44px}</style>
</head>
<body>
<button id="start">开始</button>
<button id="restart" hidden>重新开始</button>
<canvas id="game-canvas"></canvas>
<script>
let state = "idle";
function setState(next) {
  state = next;
  document.body.dataset.gameState = next;
  dispatchEvent(new CustomEvent("game:state-change", { detail: { state: next } }));
}
setState("idle");
document.querySelector("#start").addEventListener("click", () => setState("playing"));
document.querySelector("#restart").addEventListener("click", () => setState("idle"));
if (new URLSearchParams(location.search).has("probe")) {
  window.__GAME_DEBUG__ = {
    getState: () => ({ state, score: 0, level: 1 }),
    forceWin: () => setState("won"),
    forceLose: () => setState("lost"),
  };
}
safeStorage.setItem("best", "0");
</script>
</body>
</html>`;

function fakeProject(): ProjectDetail {
  const spec = generateGameSpec({ idea: "守夜人在灯塔上转动光束驱散一波波逼近的雾兽。", template: "generated", dimensions: "2d" });
  return { id: "p-gen", title: "灯塔守夜人", version: { id: "v-gen-1" }, spec } as unknown as ProjectDetail;
}

function llmResponse(answer: Record<string, unknown>) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), { status: 200 });
}

test("安全扫描:拦截网络、外链、存储偷渡;放行合规代码与 w3.org 命名空间", () => {
  assert.deepEqual(scanGeneratedHtml(contractHtml), []);
  assert.ok(scanGeneratedHtml(`<script>fetch("/x")</script>`).some((item) => item.includes("fetch")));
  assert.ok(scanGeneratedHtml(`<script src="https://cdn.example.com/x.js"></script>`).length > 0);
  assert.ok(scanGeneratedHtml(`<script>localStorage.setItem("a","b")</script>`).some((item) => item.includes("localStorage")));
  assert.ok(scanGeneratedHtml(`<script>new Function("alert(1)")</script>`).some((item) => item.includes("Function")));
  assert.ok(scanGeneratedHtml(`<img src="https://evil.example.com/x.png">`).some((item) => item.includes("外部地址")));
  assert.deepEqual(scanGeneratedHtml(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), []);
});

test("没有密钥时生成器直接抛错,不静默兜底", async () => {
  const generator = new GameCodeGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      throw new Error("不应该发起请求");
    },
  });
  await assert.rejects(() => generator.generate(fakeProject()), /密钥/);
});

test("首轮违规时带违规原因重试,第二轮合规则返回 rounds=2", async () => {
  const prompts: string[] = [];
  let calls = 0;
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      prompts.push(body.messages.find((message) => message.role === "user")?.content ?? "");
      if (calls === 1) return llmResponse({ html: `${contractHtml}<script>fetch("/steal")</script>`, design_notes: "v1" });
      return llmResponse({ html: contractHtml, design_notes: "v2" });
    },
  });
  const generated = await generator.generate(fakeProject());
  assert.equal(generated.rounds, 2);
  assert.match(prompts[1] ?? "", /安全扫描违规/);
});

test("连续三轮违规后抛错,构建应当失败", async () => {
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ html: `${contractHtml}<script>fetch("/steal")</script>`, design_notes: "bad" }),
  });
  await assert.rejects(() => generator.generate(fakeProject()), /安全扫描/);
});

test("迭代模式:带上一版代码与意见,系统提示声明增量修改;无意见时要求保持实现", async () => {
  const captured: Array<{ system: string; user: string }> = [];
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      captured.push({
        system: body.messages.find((message) => message.role === "system")?.content ?? "",
        user: body.messages.find((message) => message.role === "user")?.content ?? "",
      });
      return llmResponse({ html: contractHtml, design_notes: "迭代" });
    },
  });
  const previousHtml = "<!DOCTYPE html><html><body><!-- 上一版实现标记 old-impl --></body></html>";
  await generator.generate(fakeProject(), [], { html: previousHtml, directions: ["橘猫价格降到 60"] });
  assert.match(captured[0]!.system, /迭代模式/);
  assert.match(captured[0]!.user, /old-impl/);
  assert.match(captured[0]!.user, /橘猫价格降到 60/);

  await generator.generate(fakeProject(), [], { html: previousHtml, directions: [] });
  assert.match(captured[1]!.user, /小幅校准/);

  await generator.generate(fakeProject());
  assert.ok(!captured[2]!.system.includes("迭代模式"), "无上一版时不应进入迭代模式");
});

test("产物写入+静态探针:拆分为外链三件套(生产 CSP 禁内联),注入遥测与存档垫片", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-"));
  try {
    writeGeneratedArtifact(root, fakeProject(), { html: contractHtml, designNotes: "测试实现", rounds: 1 });
    const labels = inspectGeneratedArtifact(root);
    assert.ok(labels.includes("外链交付结构"));
    assert.ok(labels.includes("运行时状态机"));
    assert.ok(labels.includes("安全扫描"));
    assert.ok(labels.includes("试玩遥测注入"));
    const written = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(!/<script(?![^>]*\bsrc)[^>]*>[\s\S]*?<\/script>/i.test(written), "index.html 不得残留内联脚本");
    assert.ok(!written.includes("<style"), "index.html 不得残留内联样式块");
    assert.ok(written.includes('<link rel="stylesheet" href="./styles.css">'));
    assert.ok(written.includes('<script src="./app.js"></script>'));
    const appScript = readFileSync(join(root, "app.js"), "utf8");
    assert.ok(appScript.includes("/api/play-events"), "遥测脚本必须注入 app.js");
    assert.ok(appScript.indexOf("const safeStorage") < appScript.indexOf("setState"), "存档垫片必须先于游戏脚本定义");
    const stripped = stripPlatformSegments(appScript);
    assert.ok(!stripped.includes("/api/play-events"), "剥离后不应残留平台脚本");
    assert.ok(readFileSync(join(root, "styles.css"), "utf8").includes("min-width:44px"), "样式必须落入 styles.css");
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { experimental: boolean; template: string };
    assert.equal(manifest.experimental, true);
    assert.equal(manifest.template, "generated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("静态探针接受运行时生成的开始控件，但拒绝只有查询语句而没有控件声明", () => {
  const dynamicStartHtml = contractHtml
    .replace('<button id="start">开始</button>', '<div id="start-slot"></div>')
    .replace(
      'let state = "idle";',
      `document.querySelector("#start-slot").innerHTML = '<button id="start">开始</button>';
let state = "idle";`,
    );
  const dynamicRoot = mkdtempSync(join(tmpdir(), "forge-gen-dynamic-control-"));
  const missingRoot = mkdtempSync(join(tmpdir(), "forge-gen-missing-control-"));
  try {
    writeGeneratedArtifact(dynamicRoot, fakeProject(), { html: dynamicStartHtml, designNotes: "动态开始按钮", rounds: 1 });
    assert.ok(inspectGeneratedArtifact(dynamicRoot).includes("开始与重开控件"));

    const missingStartHtml = contractHtml.replace('<button id="start">开始</button>', '<div id="start-slot"></div>');
    writeGeneratedArtifact(missingRoot, fakeProject(), { html: missingStartHtml, designNotes: "缺少开始按钮", rounds: 1 });
    assert.throws(() => inspectGeneratedArtifact(missingRoot), /缺少可在运行时生成的 #start/);
  } finally {
    rmSync(dynamicRoot, { recursive: true, force: true });
    rmSync(missingRoot, { recursive: true, force: true });
  }
});

const contract3dHtml = contractHtml
  .replace("<script>", `<script type="module">\nimport * as THREE from "./vendor/three.module.js";\nvoid THREE;`)
  .replace("safeStorage.setItem", "// three scene omitted\nsafeStorage.setItem");

function fake3dProject(): ProjectDetail {
  const spec = generateGameSpec({ idea: "第三人称在悬浮岛间驾驶热气球收集星火,撞上风暴云失败。", template: "generated", dimensions: "3d" });
  return { id: "p-gen3d", title: "热气球星火", version: { id: "v-gen3d-1" }, spec } as unknown as ProjectDetail;
}

test("3D 扫描白名单:只放行本地 three 模块 import,其余 import 与 2D 模块脚本仍被拦", () => {
  assert.deepEqual(scanGeneratedHtml(contract3dHtml, { allowThreeModule: true }), []);
  assert.ok(scanGeneratedHtml(contract3dHtml).some((item) => item.includes("模块脚本") || item.includes("import")), "2D 通道必须拦模块脚本");
  const foreignImport = contract3dHtml.replace("./vendor/three.module.js", "https://esm.sh/three");
  assert.ok(scanGeneratedHtml(foreignImport, { allowThreeModule: true }).some((item) => item.includes("import 只允许本地 three")), "非白名单 import 必须拦");
  const dynamicImport = `${contract3dHtml}<script type="module">import("./x.js")</script>`;
  assert.ok(scanGeneratedHtml(dynamicImport, { allowThreeModule: true }).some((item) => item.includes("动态 import")));
});

test("3D 产物:module 外链、vendor three 落盘、语法校验剥 import 后通过", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen3d-"));
  try {
    const project = fake3dProject();
    assert.equal(project.spec.runtimeTarget, "web-3d");
    assert.equal(project.spec.threeContract, null, "generated 3D 不应套模板 threeContract");
    writeGeneratedArtifact(root, project, { html: contract3dHtml, designNotes: "3D 测试", rounds: 1 });
    const labels = inspectGeneratedArtifact(root);
    assert.ok(labels.includes("本地 3D 引擎"));
    assert.ok(labels.includes("安全扫描"));
    const written = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(written.includes('<script type="module" src="./app.js"></script>'));
    const appScript = readFileSync(join(root, "app.js"), "utf8");
    assert.ok(appScript.includes('import * as THREE from "./vendor/three.module.js"'));
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { runtimeTarget: string; engine?: string };
    assert.equal(manifest.runtimeTarget, "web-3d");
    assert.equal(manifest.engine, "three.js");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generated 不进入模板目录,不参与匹配", () => {
  assert.ok(getTemplateCatalog().every((entry) => String(entry.id) !== "generated"));
  const spec = generateGameSpec({ idea: "守夜人在灯塔上转动光束驱散雾兽。", template: "generated", dimensions: "2d" });
  assert.equal(spec.template, "generated");
  assert.equal(spec.runtimeTarget, "web-2d");
});
