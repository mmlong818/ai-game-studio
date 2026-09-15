import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const fixtureRoot = join(process.cwd(), "fixtures", "arrow-escape");

test("箭头逃脱不再渲染遮挡棋盘的缩放按钮，同时保留必要操作", () => {
  const html = readFileSync(join(fixtureRoot, "index.html"), "utf8");
  const styles = readFileSync(join(fixtureRoot, "styles.css"), "utf8");
  const script = readFileSync(join(fixtureRoot, "app.js"), "utf8");

  assert.doesNotMatch(html, /id="(?:zoom|zin|zout)"/);
  assert.doesNotMatch(styles, /#zoom/);
  assert.doesNotMatch(script, /getElementById\("(?:zin|zout)"\)/);

  assert.match(html, /id="restart"/);
  assert.match(html, /id="gear"/);
  assert.match(html, /id="levels"/);
  assert.match(script, /addEventListener\("pointerup",endPointer\)/);
  assert.match(script, /addEventListener\("wheel"/);
  assert.match(script, /if\(k==="Enter"\|\|k===" "\)/);
});
