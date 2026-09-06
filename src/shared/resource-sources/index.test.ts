import { describe, expect, it } from "vitest";
import { assessQuarantineEntry, createQuarantineEntry, evaluateResourceLicense, type ResourceSourceRecord } from ".";

function source(licenseId: ResourceSourceRecord["licenseId"], assetClass: ResourceSourceRecord["assetClass"] = "image"): ResourceSourceRecord {
  return { schemaVersion: "resource-source-v1", id: `SOURCE-${licenseId}`, sourceUrl: "https://assets.example/item", author: "Example Author", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass, licenseId, licenseUrl: licenseId === "unknown" ? null : "https://license.example/text", licenseTextHash: licenseId === "unknown" ? null : "abcdef1234567890", attributionText: ["CC-BY-4.0", "OFL-1.1", "MIT", "Apache-2.0", "CC-BY-SA-4.0", "custom-store"].includes(licenseId) ? "Example Author — asset" : null, rights: { commercialUse: !["CC-BY-NC-4.0", "unknown"].includes(licenseId), modification: !["CC-BY-ND-4.0", "unknown"].includes(licenseId), redistribution: !["unknown"].includes(licenseId), sourceRedistribution: !["custom-store", "unknown"].includes(licenseId) }, provenanceNote: "从资源详情页人工登记。", reviewedBy: null, reviewedAt: null };
}

describe("资源来源、许可和隔离门禁", () => {
  const target = { commercial: true, modified: true, openSourcePackage: true };

  it("自动准入 CC0，并拒绝未知、非商业和禁止演绎许可", () => {
    expect(evaluateResourceLicense(source("CC0-1.0"), target).decision).toBe("auto-approve");
    expect(evaluateResourceLicense(source("unknown"), target).decision).toBe("reject");
    expect(evaluateResourceLicense(source("CC-BY-NC-4.0"), target).decision).toBe("reject");
    expect(evaluateResourceLicense(source("CC-BY-ND-4.0"), target).decision).toBe("reject");
  });

  it("不把代码许可证误当作图片许可证", () => {
    expect(evaluateResourceLicense(source("MIT", "image"), target).decision).toBe("reject");
    expect(evaluateResourceLicense(source("MIT", "code"), target).decision).toBe("auto-approve");
  });

  it("自定义商店许可和传染条件进入人工复核", () => {
    expect(evaluateResourceLicense(source("custom-store"), { ...target, openSourcePackage: false }).decision).toBe("manual-review");
    expect(evaluateResourceLicense(source("CC-BY-SA-4.0"), target).decision).toBe("manual-review");
  });

  it("所有检查完成且许可自动准入后才离开隔离区", () => {
    const record = source("CC0-1.0");
    const pending = createQuarantineEntry(record, { id: "Q-1", fileName: "asset.png", hash: "1234567890abcdef" }, "2026-09-05T00:00:00.000Z");
    const approved = assessQuarantineEntry(pending, record, { malware: "pass", sensitiveContent: "pass", license: "pending", technical: "pass", provenance: "pass" }, target, "2026-09-05T01:00:00.000Z");
    expect(approved.status).toBe("approved");
    const rejected = assessQuarantineEntry(pending, record, { malware: "fail", sensitiveContent: "pass", license: "pending", technical: "pass", provenance: "pass" }, target);
    expect(rejected.status).toBe("rejected");
  });
});
