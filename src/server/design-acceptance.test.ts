import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { merge2048DesignSample } from "../shared/game-design-contract/samples.js";
import { POCKET_WORKSHOP_DESIGN_CONTRACT } from "../shared/game-design-knowledge/pocket-workshop-contract.js";
import { writeDesignAcceptanceReport } from "./design-acceptance.js";

const completeChecks = [
  { id: "ONBOARDING-MERGE-2048", label: "教学", status: "passed" as const, evidence: "真实滑动与合并" },
  { id: "PROGRESSION-RUNTIME", label: "递进", status: "passed" as const, evidence: "20 关" },
  { id: "ASSISTANCE-RUNTIME", label: "帮助", status: "passed" as const, evidence: "1/2/4 次失败" },
  { id: "CONTENT-VARIATION-REHEARSAL", label: "变化", status: "passed" as const, evidence: "第 9 关" },
];

it("普通输入回归不能冒充手感评审", () => {
  const root=mkdtempSync(join(tmpdir(), 'design-feel-'));
  const contract={...merge2048DesignSample,acceptance:[{...merge2048DesignSample.acceptance[0],kind:'game-feel' as const,label:'动作与反馈清楚且及时'}]};
  try {
    expect(()=>writeDesignAcceptanceReport(root,contract,[{id:'BROWSER-INTERACTION',label:'可以点击',status:'passed',evidence:'按钮可操作'}])).toThrow(/未闭环/);
    expect(writeDesignAcceptanceReport(root,contract,[{id:'GAME-FEEL-REVIEW',label:'专属反馈评审',status:'passed',evidence:'独立评审记录：输入到反馈时序、可读性和重复反馈检查'}]).status).toBe('passed');
  }finally {rmSync(root,{recursive:true,force:true});}
});

it("设计验收把四类合同承诺绑定到真实运行时证据并归档", () => {
  const root = mkdtempSync(join(tmpdir(), "design-acceptance-"));
  try {
    const check = writeDesignAcceptanceReport(root, merge2048DesignSample, completeChecks);
    expect(check.id).toBe("DESIGN-ACCEPTANCE");
    const report = JSON.parse(readFileSync(join(root, "_studio", "DESIGN_ACCEPTANCE_REPORT.json"), "utf8"));
    expect(report.passed).toBe(true);
    expect(report.criteria).toHaveLength(4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("规则、视口与资源承诺必须分别绑定对应的浏览器证据", () => {
  const root = mkdtempSync(join(tmpdir(), "design-acceptance-rich-"));
  const checks = [
    ...completeChecks,
    { id: "SOLVABILITY-RUNTIME", label: "可解", status: "passed" as const, evidence: "作者解复演" },
    { id: "GEN-BROWSER-CONTRACT", label: "规则", status: "passed" as const, evidence: "规则浏览器核对" },
    { id: "BROWSER-VIEWPORTS", label: "视口", status: "passed" as const, evidence: "桌面和移动端" },
    { id: "BROWSER-ASSETS", label: "资源", status: "passed" as const, evidence: "请求与解码完整" },
  ];
  try {
    expect(writeDesignAcceptanceReport(root, POCKET_WORKSHOP_DESIGN_CONTRACT, checks).status).toBe("passed");
    expect(() => writeDesignAcceptanceReport(root, POCKET_WORKSHOP_DESIGN_CONTRACT, checks.filter(({ id }) => id !== "BROWSER-ASSETS"))).toThrow(/已批准资源/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("设计验收缺少任一运行时证据时阻断，而不是写成通过", () => {
  const root = mkdtempSync(join(tmpdir(), "design-acceptance-missing-"));
  try {
    expect(() => writeDesignAcceptanceReport(root, merge2048DesignSample, completeChecks.filter(({ id }) => id !== "ASSISTANCE-RUNTIME"))).toThrow(/未闭环/);
    expect(existsSync(join(root, "_studio", "DESIGN_ACCEPTANCE_REPORT.json"))).toBe(true);
    const report = JSON.parse(readFileSync(join(root, "_studio", "DESIGN_ACCEPTANCE_REPORT.json"), "utf8"));
    expect(report.passed).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
