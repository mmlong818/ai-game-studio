import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readGeneratedSource } from "../src/server/generated-source";

function withSource(module: boolean, run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "forge-source-test-"));
  try {
    writeFileSync(join(root, "index.html"), `<html><head><link rel="stylesheet" href="./styles.css"></head><body><button id="start">开始</button><script ${module ? 'type="module" ' : ""}src="./app.js"></script></body></html>`);
    writeFileSync(join(root, "styles.css"), 'body{color:red}\n.forge-onboarding{color:white}\n.forge-assistance{color:white}');
    writeFileSync(join(root, "app.js"), '/* forge-platform:begin */\nconst privatePlatform = true;\n/* forge-platform:end */\nconst originalGame = "翻牌";\n/* forge-platform:begin */\ntrackPlay();\n/* forge-platform:end */');
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("三件套复原真实样式与逻辑，而非只有外链空壳", () => withSource(false, root => {
  const source = readGeneratedSource(root)!;
  assert.match(source, /<style>\s*body\{color:red\}/);
  assert.match(source, /const originalGame = "翻牌"/);
  assert.doesNotMatch(source, /privatePlatform|trackPlay|forge-onboarding|forge-assistance|src="\.\/app.js"/);
  assert.match(source, /id="start"/);
}));

test("3D 模块类型和本地three导入保留", () => withSource(true, root => {
  writeFileSync(join(root, "app.js"), 'import * as THREE from "./vendor/three.module.js"; const originalGame = new THREE.Scene();');
  const source = readGeneratedSource(root)!;
  assert.match(source, /<script type="module">/);
  assert.match(source, /import \* as THREE/);
}));

test("成功版本平台检查器不阻止复原，但任意外链仍拒绝", () => withSource(false, root => {
  const path = join(root, "index.html");
  const base = readFileSync(path, "utf8");
  writeFileSync(path, base.replace("</body>", '<script src="_studio/runtime-inspector.js"></script></body>'));
  assert.match(readGeneratedSource(root)!, /originalGame/);
  assert.doesNotMatch(readGeneratedSource(root)!, /runtime-inspector/);
  writeFileSync(path, base.replace("</body>", '<script src="_studio/foreign.js"></script></body>'));
  assert.equal(readGeneratedSource(root), null);
}));

test("缺失三件套时跳过，绝不拿空壳重新生成", () => withSource(false, root => {
  rmSync(join(root, "app.js"));
  assert.equal(readGeneratedSource(root), null);
}));

test("不跟随HTML中的路径穿越或外部脚本", () => withSource(false, root => {
  writeFileSync(join(root, "index.html"), '<link href="./styles.css"><script src="../secret.js"></script>');
  assert.equal(readGeneratedSource(root), null);
}));

test("旧平台HTML哨兵同样剥离，平台脚本不成为迭代输入", () => withSource(false, root => {
  writeFileSync(join(root, "app.js"), '<!-- forge-platform:begin -->legacyPlatform();<!-- forge-platform:end -->\nconst originalGame = true;');
  const source = readGeneratedSource(root)!;
  assert.match(source, /originalGame/);
  assert.doesNotMatch(source, /legacyPlatform/);
}));
