import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readReusableRuleAudit, safeContractRules, sha256, writeRuleFidelity } from "./rule-audit-checkpoint";

const rules = ["核心循环第 1 步:翻开两张牌", "胜利条件:配对全部完成", "失败条件:不会失败"];
const passing = rules.map(rule => ({ rule, implemented: true, evidence: "函数 matchPair 实现" }));
const source = "<html><script>const game = 1;</script></html>";

function withRoot(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "rule-audit-checkpoint-"));
  try { run(root); } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
}

describe("规则审核回执复用", () => {
  it("源码哈希、规则清单逐条一致且全部已实现时复用", () => withRoot(root => {
    const written = writeRuleFidelity(root, { verdicts: passing, sourceSha256: sha256(source) });
    expect(written.schemaVersion).toBe(2);
    expect(written.implemented).toBe(3);
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toEqual(passing);
  }));

  it("源码不同、规则不同、顺序不同或缺少哈希时不复用", () => withRoot(root => {
    writeRuleFidelity(root, { verdicts: passing, sourceSha256: sha256(source) });
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(`${source} `) })).toBeNull();
    expect(readReusableRuleAudit(root, { rules: [...rules, "关卡总数严格为7"], sourceSha256: sha256(source) })).toBeNull();
    expect(readReusableRuleAudit(root, { rules: [rules[1], rules[0], rules[2]], sourceSha256: sha256(source) })).toBeNull();
    writeRuleFidelity(root, { verdicts: passing });
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toBeNull();
  }));

  it("未通过、不完整、旧版本或损坏的回执不能被复用", () => withRoot(root => {
    writeRuleFidelity(root, { verdicts: [...passing.slice(0, 2), { rule: rules[2], implemented: false, evidence: "仍会失败" }], sourceSha256: sha256(source) });
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toBeNull();
    writeRuleFidelity(root, { verdicts: passing.slice(0, 2), sourceSha256: sha256(source) });
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toBeNull();
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "RULE_FIDELITY.json"), JSON.stringify({ schemaVersion: 1, checkedAt: new Date().toISOString(), implemented: 3, total: 3, verdicts: passing }));
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toBeNull();
    writeFileSync(join(root, "_studio", "RULE_FIDELITY.json"), "{not json");
    expect(readReusableRuleAudit(root, { rules, sourceSha256: sha256(source) })).toBeNull();
    expect(readReusableRuleAudit(join(root, "missing"), { rules, sourceSha256: sha256(source) })).toBeNull();
  }));

  it("规则清单从确认方案派生，结构缺失时返回 null 而不是抛错", () => {
    expect(safeContractRules(null)).toBeNull();
    expect(safeContractRules({} as never)).toBeNull();
    const derived = safeContractRules({ coreLoop: ["翻牌"], winCondition: "配对完成", failCondition: "不会失败", generatedCampaign: null } as never);
    expect(derived).toEqual(["核心循环第 1 步:翻牌", "胜利条件:配对完成", "失败条件:不会失败"]);
  });
});
