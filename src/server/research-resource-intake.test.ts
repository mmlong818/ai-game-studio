import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createResearchResourceAcquisitionTask, reviewResearchResourceAcquisitionWork, submitResearchResourceAcquisitionWork } from "../shared/game-design-knowledge/research-resource-acquisition-task";
import { materializeApprovedResearchResources } from "./research-resource-intake";
import { reviewResearchResourceIntakeBatch } from "../shared/game-design-knowledge/research-resource-intake";
import { generateResearchAudioWaveform, generateResearchFontGlyphSheet, generateResearchImageContactSheet, generateResearchModelTurntable, promoteApprovedResearchResourceFamilies } from "./research-resource-promotion";
import { loadCuratedResourceLibrary } from "./resource-library";
import { rankResourceFamilies } from "../shared/resource-library";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const plan = { schemaVersion: "research-resource-acquisition-v1" as const, catalogVersion: "curated-v1" as const, generatedAt: "2026-09-05T00:00:00.000Z", decisions: [{ requirementId: "ASSET-ART", role: "effect" as const, requiredFor: "publish" as const, route: "create" as const, status: "planned" as const, selectedFamilyId: null, suggestedPaths: [], missingVariants: ["NORMAL"], license: { status: "not-required" as const, licenseId: "project-owned", sourceUrl: null, obligations: [] }, operatorAction: "review-created-asset" as const, deliverable: "提交正式 PNG", reason: "需要原创资源" }], summary: { total: 1, reuseExisting: 0, proceduralGenerate: 0, procure: 0, create: 1, licenseReview: 0, unresolved: 0, planningReady: true } };
const requirements = { schemaVersion: "asset-requirements-v1" as const, projectId: "research-sandbox:RESEARCH-1", designContractId: "research-contract:RESEARCH-1", generatedAt: "2026-09-05T00:00:00.000Z", requirements: [{ id: "ASSET-ART", role: "effect" as const, mediaType: "image" as const, usage: { sceneIds: [], objectIds: [], stateIds: ["NORMAL"], mechanicIds: [], onboardingStepIds: [] }, visual: { styleFamily: "test", palette: [], transparency: true }, technical: { formats: ["image/png"], maxBytes: 100 }, variants: ["NORMAL"], semanticTags: ["mechanic"], requiredFor: "publish" as const, fallbackPolicy: "block-build" as const }], bindings: [] };

function approvedTask() {
  let task = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan, new Date("2026-09-05T01:00:00Z"));
  task = submitResearchResourceAcquisitionWork(task, "ASSET-ART", { note: "正式资源和验收材料已经齐全", evidence: [{ kind: "resource-file", reference: "assets/art.png", note: "实际 PNG 文件" }, { kind: "visual-review", reference: "reviews/visual.json", note: "视觉复核记录" }, { kind: "runtime-report", reference: "reports/runtime.json", note: "运行验收记录" }] }, new Date("2026-09-05T02:00:00Z"));
  return reviewResearchResourceAcquisitionWork(task, "ASSET-ART", { decision: "approve", rationale: "文件、视觉与运行证据均已通过" }, new Date("2026-09-05T03:00:00Z"));
}

describe("已批准研究资源隔离导入", () => {
  it("读取真实文件、固定哈希并生成待安全复核绑定", async () => {
    const source = await mkdtemp(join(tmpdir(), "research-resource-source-")); const quarantine = await mkdtemp(join(tmpdir(), "research-resource-quarantine-"));
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(source, "assets"), { recursive: true }));
    await writeFile(join(source, "assets", "art.png"), png);
    const batch = await materializeApprovedResearchResources(approvedTask(), requirements, source, quarantine, new Date("2026-09-05T04:00:00Z"));
    const digest = createHash("sha256").update(png).digest("hex").toUpperCase();
    expect(batch).toMatchObject({ status: "awaiting-security-review", summary: { requirements: 1, files: 1, bytes: png.byteLength, awaitingSecurityReview: 1, approvedBindings: 0 } });
    expect(batch.items[0]).toMatchObject({ binding: { status: "reviewed", coveredVariants: ["NORMAL"] }, quarantine: [{ status: "manual-review", originalHash: digest, checks: { malware: "pending", sensitiveContent: "pending", license: "pass", technical: "pass", provenance: "pass" } }], versions: [{ sha256: digest, mimeType: "image/png", provenance: "project-owned", preview: { kind: "image", status: "available-for-review" } }] });
    expect(new Uint8Array(await readFile(join(quarantine, batch.items[0]!.versions[0]!.quarantinedPath)))).toEqual(png);
    const approved = reviewResearchResourceIntakeBatch(batch, { reviewer: "独立安全复核员", malware: "pass", sensitiveContent: "pass", rationale: "文件内容与来源均完成独立安全复核" }, new Date("2026-09-05T05:00:00Z"));
    expect(approved).toMatchObject({ status: "approved", summary: { awaitingSecurityReview: 0, approvedBindings: 1 }, items: [{ binding: { status: "approved" }, quarantine: [{ status: "approved", checks: { malware: "pass", sensitiveContent: "pass" } }] }], securityReviews: [{ reviewer: "独立安全复核员" }] });
    expect(() => reviewResearchResourceIntakeBatch(approved, { reviewer: "另一位复核员", malware: "pass", sensitiveContent: "pass", rationale: "不应重复覆盖已经完成的检查结果" })).toThrow(/只有等待安全复核/);
    const library = await mkdtemp(join(tmpdir(), "research-resource-library-"));
    const promoted = await promoteApprovedResearchResourceFamilies(approved, requirements, quarantine, library, async ({ familyRoot }) => {
      await import("node:fs/promises").then(({ mkdir }) => mkdir(join(familyRoot, "preview"), { recursive: true })); await writeFile(join(familyRoot, "preview", "contact-sheet.png"), png); return ["preview/contact-sheet.png"];
    }, new Date("2026-09-05T06:00:00Z"));
    expect(promoted[0]).toMatchObject({ manifest: { schemaVersion: "research-resource-family-v1", researchTaskId: "RESEARCH-1", assets: [{ sha256: digest }] }, profile: { lifecycle: "reviewed", roles: ["effect"], previewPaths: ["preview/contact-sheet.png"] } });
    const loaded = await loadCuratedResourceLibrary(library, { requireCurated: false });
    const match = rankResourceFamilies(requirements.requirements[0]!, loaded)[0]!;
    expect(match).toMatchObject({ familyId: promoted[0]!.profile.familyId, eligible: true, autoBindable: false });
  });

  it("未全部批准、伪造类型或超过技术预算均不能入库", async () => {
    const source = await mkdtemp(join(tmpdir(), "research-resource-source-")); const quarantine = await mkdtemp(join(tmpdir(), "research-resource-quarantine-"));
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(source, "assets"), { recursive: true }));
    await writeFile(join(source, "assets", "art.png"), png);
    const unapproved = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan);
    await expect(materializeApprovedResearchResources(unapproved, requirements, source, quarantine)).rejects.toThrow(/全部资源工作项/);
    await writeFile(join(source, "assets", "art.png"), new TextEncoder().encode("<script>alert(1)</script>"));
    await expect(materializeApprovedResearchResources(approvedTask(), requirements, source, quarantine)).rejects.toThrow(/无法确认资源文件类型/);
    await writeFile(join(source, "assets", "art.png"), new Uint8Array([...png, ...new Uint8Array(100)]));
    await expect(materializeApprovedResearchResources(approvedTask(), requirements, source, quarantine)).rejects.toThrow(/超过 ASSET-ART 的预算/);
    expect(await readdir(quarantine, { recursive: true })).toEqual([]);
  });

  it("任一安全检查失败时拒绝整批且不批准绑定", async () => {
    const source = await mkdtemp(join(tmpdir(), "research-resource-source-")); const quarantine = await mkdtemp(join(tmpdir(), "research-resource-quarantine-"));
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(source, "assets"), { recursive: true })); await writeFile(join(source, "assets", "art.png"), png);
    const batch = await materializeApprovedResearchResources(approvedTask(), requirements, source, quarantine);
    const rejected = reviewResearchResourceIntakeBatch(batch, { reviewer: "独立安全复核员", malware: "pass", sensitiveContent: "fail", rationale: "内容复核发现不适合目标用户的元素" });
    expect(rejected).toMatchObject({ status: "rejected", summary: { approvedBindings: 0 }, items: [{ binding: { status: "reviewed" }, quarantine: [{ status: "rejected" }] }] });
  });

  it("从真实 PNG 生成接触表、从真实 OGG 生成波形预览", async () => {
    const imageRoot = await mkdtemp(join(tmpdir(), "research-image-preview-")); await import("node:fs/promises").then(({ mkdir }) => mkdir(join(imageRoot, "assets"), { recursive: true }));
    await copyFile(join(process.cwd(), "assets/library/curated/classic-puzzle-2d/PNG/Default/selectorC.png"), join(imageRoot, "assets", "selector.png"));
    expect(await generateResearchImageContactSheet({ familyRoot: imageRoot, assets: [{ path: "assets/selector.png", mimeType: "image/png" }], label: "图片接触表测试" })).toEqual(["preview/contact-sheet.png"]);
    expect((await stat(join(imageRoot, "preview", "contact-sheet.png"))).size).toBeGreaterThan(100);
    const audioRoot = await mkdtemp(join(tmpdir(), "research-audio-preview-")); await import("node:fs/promises").then(({ mkdir }) => mkdir(join(audioRoot, "assets"), { recursive: true }));
    await copyFile(join(process.cwd(), "assets/library/curated/neutral-interface-audio/Audio/glass_001.ogg"), join(audioRoot, "assets", "glass.ogg"));
    expect(await generateResearchAudioWaveform({ familyRoot: audioRoot, assets: [{ path: "assets/glass.ogg", mimeType: "audio/ogg" }], label: "音频波形测试" })).toEqual(["preview/waveform.png"]);
    expect((await stat(join(audioRoot, "preview", "waveform.png"))).size).toBeGreaterThan(100);
  }, 30_000);

  it("从真实 GLB 生成八视角转台，并从真实字体生成字形页", async () => {
    const modelRoot = await mkdtemp(join(tmpdir(), "research-model-preview-")); await import("node:fs/promises").then(({ mkdir }) => mkdir(join(modelRoot, "assets"), { recursive: true }));
    await copyFile(join(process.cwd(), "assets/library/curated/low-poly-nature-3d/Models/GLTF format/bridge_stone.glb"), join(modelRoot, "assets", "bridge.glb"));
    expect(await generateResearchModelTurntable({ familyRoot: modelRoot, assets: [{ path: "assets/bridge.glb", mimeType: "model/gltf-binary" }], label: "模型转台测试" })).toEqual(["preview/turntable.png"]);
    expect((await stat(join(modelRoot, "preview", "turntable.png"))).size).toBeGreaterThan(1_000);
    const systemFont = "C:/Windows/Fonts/arial.ttf";
    if (existsSync(systemFont)) {
      const fontRoot = await mkdtemp(join(tmpdir(), "research-font-preview-")); await import("node:fs/promises").then(({ mkdir }) => mkdir(join(fontRoot, "assets"), { recursive: true })); await copyFile(systemFont, join(fontRoot, "assets", "font.ttf"));
      expect(await generateResearchFontGlyphSheet({ familyRoot: fontRoot, assets: [{ path: "assets/font.ttf", mimeType: "font/ttf" }], label: "字体字形测试" })).toEqual(["preview/glyph-sheet.png"]);
      expect((await stat(join(fontRoot, "preview", "glyph-sheet.png"))).size).toBeGreaterThan(1_000);
    }
  }, 60_000);
});
