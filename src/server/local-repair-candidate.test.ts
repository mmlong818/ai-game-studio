import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { ProjectDetail } from "../shared/contracts.js";
import { localRepairContractHash, readLocalRepairCandidate, registerLocalRepairCandidate } from "./local-repair-candidate.js";

vi.mock("./generated-source.js", () => ({ readGeneratedSource: () => "<!doctype html><style></style><script>game()</script>" }));

const project = {
  id: "6fe5bf6f-3e91-4fb3-934a-7da67dddd65d",
  spec: { aspectRatio: "9:16", designProfile: { onboarding: [], coreLoop: ["直接点击箭头离场"] }, designContract: { id: "contract", onboarding: [] } },
} as unknown as ProjectDetail;

function writeCandidate(root: string) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "index.html"), '<link rel="stylesheet" href="./styles.css"><script src="./app.js"></script>');
  writeFileSync(join(root, "styles.css"), "canvas{display:block}");
  writeFileSync(join(root, "app.js"), "document.body.dataset.gameState='idle';");
}

describe("服务器本地修复候选登记", () => {
  it("复制到私有根并绑定项目与当前合同哈希", () => {
    const root = mkdtempSync(join(tmpdir(), "local-repair-registry-"));
    const source = mkdtempSync(join(tmpdir(), "local-repair-source-"));
    try {
      writeCandidate(source);
      const descriptor = registerLocalRepairCandidate(root, project, source);
      expect(descriptor.contractHash).toBe(localRepairContractHash(project));
      expect(readLocalRepairCandidate(root, project)?.html).toContain("game()");
      const changed = { ...project, spec: { ...project.spec, aspectRatio: "16:9" } } as ProjectDetail;
      expect(readLocalRepairCandidate(root, changed)).toBeNull();
      const descriptorPath = join(root, project.id, "candidate.json");
      const saved = JSON.parse(readFileSync(descriptorPath, "utf8"));
      saved.payload = "../../outside";
      writeFileSync(descriptorPath, JSON.stringify(saved));
      expect(readLocalRepairCandidate(root, project)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(source, { recursive: true, force: true });
    }
  });
});
