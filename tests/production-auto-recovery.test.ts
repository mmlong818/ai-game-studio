import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { generateGameSpec, type Build, type ProjectDetail } from "../src/shared/contracts.js";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy.js";
import { safeContractRules, sha256, writeRuleFidelity } from "../src/server/rule-audit-checkpoint.js";
import { zeroModelRecoveryCheckpoint } from "../src/server/production-auto-recovery.js";

const prefix = "/* 平台交付事实：index.html 先加载 app.js；app.js 中 forge-platform 段由平台在游戏代码前安装 safeStorage 与 __FORGE_SPRITES__，不是缺失依赖。以下是浏览器实际执行的交付文件。 */";

test("production 只认领零图片且源码与完整审核回执匹配的明确平台失败", () => {
    const artifactRoot = mkdtempSync(join(tmpdir(), "production-recovery-"));
    const base = generateGameSpec({ idea: "持续移动棋盘上的宝石并消除相同图案，不设最终胜负。", template: "generated", dimensions: "2d" });
    const designContract = createGameDesignContractForLegacyProject({ projectId: "p1", title: "宝石棋盘", idea: base.vision, createdAt: "2026-09-15T00:00:00.000Z", spec: base });
    const project = { id: "p1", title: "宝石棋盘", version: { id: "v1" }, spec: { ...base, designContract } } as unknown as ProjectDetail;
    const build = { id: "b1", projectId: project.id, status: "failed", revisionPlan: null, revisionScope: null, failureDetails: [{ stage: "validation", category: "validation", code: "PLATFORM_SCHEMA", message: "平台格式检查未通过。", nextStep: "从检查点复验。", retryable: false }] } as unknown as Build;
    const root = join(artifactRoot, build.id);
    const index = '<main data-game-board></main><script src="./app.js"></script><script src="_studio/runtime-inspector.js"></script>';
    const styles = "main{display:block}";
    const app = "document.body.dataset.gameState='playing';";
    try {
      mkdirSync(join(root, "_studio"), { recursive: true });
      writeFileSync(join(root, "index.html"), index); writeFileSync(join(root, "styles.css"), styles); writeFileSync(join(root, "app.js"), app);
      writeFileSync(join(root, "_studio", "DYNAMIC_ART.json"), JSON.stringify({ entries: [] }));
      writeFileSync(join(root, "_studio", "V11_BUILD.json"), JSON.stringify({ resourceCount: 0 }));
      writeFileSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"), JSON.stringify(designContract));
      const source = [prefix, `<!-- index.html -->\n${index.replace('<script src="_studio/runtime-inspector.js"></script>', "")}`, `/* styles.css */\n${styles}`, `/* app.js */\n${app}`].join("\n\n");
      const rules = safeContractRules(project.spec.designProfile)!;
      writeRuleFidelity(root, { verdicts: rules.map(rule => ({ rule, implemented: true, evidence: "通过" })), sourceSha256: sha256(source) });
      assert.deepEqual(zeroModelRecoveryCheckpoint(artifactRoot, project, build), { sourceBuildId: build.id, sourceSha256: sha256(source) });
      writeFileSync(join(root, "app.js"), `${app}// drift`);
      assert.equal(zeroModelRecoveryCheckpoint(artifactRoot, project, build), null);
      assert.equal(zeroModelRecoveryCheckpoint(artifactRoot, project, { ...build, failureDetails: [{ ...build.failureDetails![0]!, code: "AUTO_REPAIR_EXHAUSTED" }] }), null);
    } finally { rmSync(artifactRoot, { recursive: true, force: true }); }
});
