import { beforeEach, expect, it, vi } from "vitest";
import { BuildOrchestrator } from "./build-orchestrator";
import { inspectGeneratedArtifact } from "./game-generator";
import { readGeneratedSource } from "./generated-source";
import { ArtifactValidationFailure } from "./generation-budget";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { sha256, writeRuleFidelity } from "./rule-audit-checkpoint";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
vi.mock("./generated-source", () => ({ readGeneratedSource: vi.fn().mockReturnValue(null) }));

vi.mock("./game-generator", () => ({
  inspectGeneratedArtifact: vi.fn(), writeGeneratedArtifact: vi.fn(), stripPlatformSegments: (html: string) => html,
}));
vi.mock("./browser-quality", async importOriginal => ({
  ...await importOriginal<typeof import("./browser-quality")>(), inspectGeneratedGameInBrowser: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());
const project = { version: { id: "not-on-disk" }, spec: { designProfile: {} } };
const first = { html: "<html>first failed playable version</html>", rounds: 1, designNotes: "first" };
const repaired = { html: "<html>repaired version</html>", rounds: 1, designNotes: "fixed" };

it("修订方案不可用时在规范化阶段停止，不写项目也不生成代码图片", async () => {
  const generate = vi.fn().mockResolvedValue(null);
  const code = vi.fn(); const images = vi.fn(); const update = vi.fn();
  const orchestrator = new BuildOrchestrator({ update } as never, "unused-root", {
    designContracts: { generate } as never, codeGenerator: { generate: code } as never,
    imageGenerator: { generate: images } as never,
  });
  await expect((orchestrator as any).normalizeProject({ ...project, idea: "既有游戏", spec: {
    ...project.spec, presentationVersion: 5, template: "generated", difficulty: "standard",
  } }, ["只改变背景"])).rejects.toThrow("本次没有继续生成代码或图片");
  expect(generate.mock.calls[0][0].confirmedDesignProfile).toBe(project.spec.designProfile);
  expect(code).not.toHaveBeenCalled(); expect(images).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
});

it("确认合同不变且旧代码重新验收通过时，不再调用代码模型", async () => {
  const contract = { id: "same-contract" };
  vi.mocked(readGeneratedSource).mockReturnValueOnce(first.html);
  const root = mkdtempSync(join(tmpdir(), "studio-reuse-test-"));
  const metadata = join(root, "old-build", "_studio");
  mkdirSync(metadata, { recursive: true });
  writeFileSync(join(metadata, "GAME_DESIGN_CONTRACT.json"), JSON.stringify(contract));
  writeFileSync(join(metadata, "GENERATED_CODE.json"), JSON.stringify({ rounds: 1, model: "original-model", designNotes: "existing" }));
  const generate = vi.fn();
  const repository = { recentReusableBuilds: async () => [{ id: "old-build" }], buildById: async () => ({ error: "历史检查误报" }) };
  try {
    const orchestrator = new BuildOrchestrator(repository as never, root, { browserAudit: false, codeGenerator: { generate } as never });
    const result = await (orchestrator as any).generateExperimentalGame({ ...project, id: "same-project", spec: { ...project.spec, designContract: contract } }, join(root, "new-build"), []);
    expect(generate).not.toHaveBeenCalled();
    expect(result.generation.html).toBe(first.html);
    expect(result.generation.model).toBe("original-model");
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

it("首次产物验收失败后将当前失败代码交给第二轮修复", async () => {
  vi.mocked(inspectGeneratedArtifact).mockImplementationOnce(() => { throw new ArtifactValidationFailure("开始按钮被遮挡"); });
  const generate = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(repaired);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { browserAudit: false, codeGenerator: { generate } as never });
  await (orchestrator as any).generateExperimentalGame(project, "unused-root", ["保持花园主题"]);
  expect(generate.mock.calls[0][2]).toBeNull();
  expect(generate.mock.calls[1][2]).toEqual({ html: first.html, directions: ["保持花园主题", "开始按钮被遮挡"] });
  expect(generate.mock.calls[1][1]).toEqual(["开始按钮被遮挡"]);
  expect(generate.mock.calls[0][4]).toBe(generate.mock.calls[1][4]);
});

it("验收基础设施故障不授权额外付费生成", async () => {
  vi.mocked(inspectGeneratedArtifact).mockImplementationOnce(() => { throw new Error("测试磁盘不可读"); });
  const generate = vi.fn().mockResolvedValue(first);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { browserAudit: false, codeGenerator: { generate } as never });
  await expect((orchestrator as any).generateExperimentalGame(project, "unused-root", [])).rejects.toThrow("已停止自动付费修复");
  expect(generate).toHaveBeenCalledTimes(1);
});

it("安全子轮重新从1计数时仍显示第2次针对修正的外层阶段", async () => {
  vi.mocked(inspectGeneratedArtifact).mockImplementationOnce(() => { throw new ArtifactValidationFailure("第9关没有发出动作信号"); });
  const reports: string[] = [];
  let calls = 0;
  const generate = vi.fn().mockImplementation(async (_project, _feedback, _previous, report) => {
    await report("正在生成游戏代码，第 1 轮，已收到 128 个字符");
    await report("第 1 轮输出已接收，正在进行代码安全检查");
    return ++calls === 1 ? first : repaired;
  });
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { browserAudit: false, codeGenerator: { generate } as never });
  await (orchestrator as any).generateExperimentalGame(project, "unused-root", [], async (detail: string) => { reports.push(detail); });
  const generatorReports = reports.filter(detail => detail.includes("128 个字符") || detail.includes("代码安全检查"));
  expect(generatorReports.slice(0, 2).every(detail => detail.startsWith("第 1 次制作 · 初次生成"))).toBe(true);
  expect(generatorReports.slice(2).every(detail => detail.startsWith("第 2 次制作 · 针对验收问题修正"))).toBe(true);
  expect(generatorReports).toHaveLength(4);
});

it("规则审核未落实时沿用当轮代码，只定向修正缺失规则", async () => {
  const generate = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(repaired);
  const auditRuleFidelity = vi.fn().mockResolvedValueOnce([{ rule: "配对计分", implemented: false, evidence: "未增加分数" }]).mockResolvedValueOnce([{ rule: "配对计分", implemented: true, evidence: "已增加分数" }]);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { codeGenerator: { generate } as never, designContracts: { auditRuleFidelity } as never });
  const root = mkdtempSync(join(tmpdir(), "rule-repair-"));
  mkdirSync(join(root, "_studio"));
  try { await (orchestrator as any).generateExperimentalGame(project, root, []); }
  finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
  expect(generate.mock.calls[1][2].html).toBe(first.html);
  expect(generate.mock.calls[1][2].directions).toEqual(["规则审计判定未实现:配对计分——未增加分数"]);
});

it("审核服务没有结果时停止交付，不重新付费生成代码", async () => {
  const generate = vi.fn().mockResolvedValue(first);
  const auditRuleFidelity = vi.fn().mockResolvedValue(null);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "unused-root", { codeGenerator: { generate } as never, designContracts: { auditRuleFidelity } as never });
  await expect((orchestrator as any).generateExperimentalGame(project, "unused-root", [])).rejects.toThrow("停止后续生图及交付");
  expect(generate).toHaveBeenCalledTimes(1);
});

it("到达修正轮上限仍有未实现规则不能被当成可交付成果，并说明是上限所致", async () => {
  const generate = vi.fn().mockResolvedValue(first);
  const auditRuleFidelity = vi.fn().mockResolvedValue([{ rule: "必须配对才得分", implemented: false, evidence: "点击就得分" }]);
  const root = mkdtempSync(join(tmpdir(), "rule-rejected-")); mkdirSync(join(root, "_studio"));
  try {
    const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, root, { codeGenerator: { generate } as never, designContracts: { auditRuleFidelity } as never, maxRepairRounds: 2 });
    await expect((orchestrator as any).generateExperimentalGame(project, root, [])).rejects.toThrow("规则审核仍有 1 项未落实");
    await expect((orchestrator as any).generateExperimentalGame(project, root, [])).rejects.toThrow("修正上限");
    expect(generate).toHaveBeenCalledTimes(4);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

it("质量问题不交给用户重试：验收连续失败时带原因继续修正，直到通过", async () => {
  vi.mocked(inspectGeneratedArtifact)
    .mockImplementationOnce(() => { throw new ArtifactValidationFailure("开始按钮不在首屏"); })
    .mockImplementationOnce(() => { throw new ArtifactValidationFailure("结算面板盖住重开按钮"); })
    .mockImplementationOnce(() => { throw new ArtifactValidationFailure("教学第二步未完成"); });
  const generate = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(first).mockResolvedValueOnce(first).mockResolvedValueOnce(repaired);
  const report = vi.fn().mockResolvedValue(undefined);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { browserAudit: false, codeGenerator: { generate } as never });
  const result = await (orchestrator as any).generateExperimentalGame(project, "unused-root", [], report);
  expect(result.generation.html).toBe(repaired.html);
  expect(generate).toHaveBeenCalledTimes(4);
  expect(generate.mock.calls[3][1]).toEqual(["教学第二步未完成"]);
  expect(report.mock.calls.map(call => call[0]).some((text: string) => text.includes("第 4 次针对性修复（最多 6 次）"))).toBe(true);
});

it("修正轮用尽仍未通过验收才停止，错误写明是上限而不是服务故障", async () => {
  vi.mocked(inspectGeneratedArtifact).mockImplementation(() => { throw new ArtifactValidationFailure("横向溢出"); });
  const generate = vi.fn().mockResolvedValue(first);
  const orchestrator = new BuildOrchestrator({ recentReusableBuilds: async () => [] } as never, "missing-test-artifact-root", { browserAudit: false, codeGenerator: { generate }, maxRepairRounds: 3 } as never);
  await expect((orchestrator as any).generateExperimentalGame(project, "unused-root", [])).rejects.toThrow("连续 3 轮生成代码均未通过产物契约验收，已达本次制作的修正上限");
  expect(generate).toHaveBeenCalledTimes(3);
  vi.mocked(inspectGeneratedArtifact).mockReset();
});

it("恢复同项目失败构建的完整代码与错误，不重新从空白制作", async () => {
  vi.mocked(readGeneratedSource).mockReturnValueOnce(first.html);
  const generate = vi.fn().mockResolvedValue(repaired);
  const recentReusableBuilds = vi.fn().mockResolvedValue([{ id: "previous-failed" }]);
  const repository = { recentReusableBuilds, buildById: async () => ({ error: "旧教学信号未接入" }) };
  const orchestrator = new BuildOrchestrator(repository as never, "root", { browserAudit: false, codeGenerator: { generate } as never });
  await (orchestrator as any).generateExperimentalGame({ ...project, id: "same-project" }, "root/current-build", []);
  expect(recentReusableBuilds).toHaveBeenCalledWith("same-project", "current-build");
  expect(generate.mock.calls[0][2].html).toBe(first.html);
  expect(generate.mock.calls[0][2].directions).toContain("上一版验收问题：旧教学信号未接入");
});

const auditProfile = { coreLoop: ["翻开两张牌"], winCondition: "配对全部完成", failCondition: "不会失败", generatedCampaign: null };
const auditRules = ["核心循环第 1 步:翻开两张牌", "胜利条件:配对全部完成", "失败条件:不会失败"];
function prepareReusableBuild(root: string, contract: object, sourceSha256: string, verdicts: Array<{ rule: string; implemented: boolean; evidence: string }>) {
  const metadata = join(root, "old-build", "_studio");
  mkdirSync(metadata, { recursive: true });
  writeFileSync(join(metadata, "GAME_DESIGN_CONTRACT.json"), JSON.stringify(contract));
  writeFileSync(join(metadata, "GENERATED_CODE.json"), JSON.stringify({ rounds: 1, model: "original-model", designNotes: "existing" }));
  writeRuleFidelity(join(root, "old-build"), { verdicts, sourceSha256 });
  mkdirSync(join(root, "new-build", "_studio"), { recursive: true });
}

it("复用同一份代码且规则未变时，复用上一版已通过的规则审核，不再调用审核模型", async () => {
  const contract = { id: "same-contract" };
  const verdicts = auditRules.map(rule => ({ rule, implemented: true, evidence: "代码核对通过" }));
  vi.mocked(readGeneratedSource).mockReturnValueOnce(first.html);
  const root = mkdtempSync(join(tmpdir(), "studio-audit-reuse-"));
  prepareReusableBuild(root, contract, sha256(first.html), verdicts);
  const generate = vi.fn();
  const auditRuleFidelity = vi.fn();
  const repository = { recentReusableBuilds: async () => [{ id: "old-build" }], buildById: async () => ({ error: null }) };
  try {
    const orchestrator = new BuildOrchestrator(repository as never, root, { codeGenerator: { generate } as never, designContracts: { auditRuleFidelity } as never });
    const result = await (orchestrator as any).generateExperimentalGame({ ...project, id: "same-project", spec: { designProfile: auditProfile, designContract: contract } }, join(root, "new-build"), []);
    expect(generate).not.toHaveBeenCalled();
    expect(auditRuleFidelity).not.toHaveBeenCalled();
    expect(result.audit).toEqual(verdicts);
    expect(result.auditReusedFrom).toBe("old-build");
    const written = JSON.parse(readFileSync(join(root, "new-build", "_studio", "RULE_FIDELITY.json"), "utf8"));
    expect(written.reusedFromBuildId).toBe("old-build");
    expect(written.implemented).toBe(3);
    expect(readFileSync(join(root, "new-build", "_studio", "GENERATION_ATTEMPTS.jsonl"), "utf8")).toContain("rule-audit-reused");
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

it("上一版规则审核对应另一份代码时照常调用审核模型", async () => {
  const contract = { id: "same-contract" };
  vi.mocked(readGeneratedSource).mockReturnValueOnce(first.html);
  const root = mkdtempSync(join(tmpdir(), "studio-audit-fresh-"));
  prepareReusableBuild(root, contract, sha256(repaired.html), auditRules.map(rule => ({ rule, implemented: true, evidence: "旧代码" })));
  const auditRuleFidelity = vi.fn().mockResolvedValue(auditRules.map(rule => ({ rule, implemented: true, evidence: "新审核" })));
  const repository = { recentReusableBuilds: async () => [{ id: "old-build" }], buildById: async () => ({ error: null }) };
  try {
    const orchestrator = new BuildOrchestrator(repository as never, root, { codeGenerator: { generate: vi.fn() } as never, designContracts: { auditRuleFidelity } as never });
    const result = await (orchestrator as any).generateExperimentalGame({ ...project, id: "same-project", spec: { designProfile: auditProfile, designContract: contract } }, join(root, "new-build"), []);
    expect(auditRuleFidelity).toHaveBeenCalledTimes(1);
    expect(result.auditReusedFrom).toBeNull();
    const written = JSON.parse(readFileSync(join(root, "new-build", "_studio", "RULE_FIDELITY.json"), "utf8"));
    expect(written.schemaVersion).toBe(2);
    expect(written.reusedFromBuildId).toBeUndefined();
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});
