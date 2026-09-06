import rawCatalog from "./candidates.json" with { type: "json" };
import type { EngineCandidate, EngineCandidateCatalog } from "./types.js";

const VALID_DISPOSITIONS = new Set(["baseline", "evaluate", "compare", "observe", "reject"]);
const VALID_LICENSE_SCOPES = new Set(["runtime", "editor", "tooling", "examples", "cloud-service"]);

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`候选引擎清单字段无效：${field}`);
}

function validateCandidate(value: unknown, index: number): EngineCandidate {
  if (!value || typeof value !== "object") throw new Error(`候选引擎清单第 ${index} 项无效`);
  const candidate = value as EngineCandidate;
  assertString(candidate.id, `engines.${index}.id`);
  assertString(candidate.name, `engines.${index}.name`);
  assertString(candidate.primaryValue, `engines.${index}.primaryValue`);
  assertString(candidate.versionPolicy, `engines.${index}.versionPolicy`);
  if (!VALID_DISPOSITIONS.has(candidate.disposition)) throw new Error(`候选引擎 ${candidate.id} 的 disposition 无效`);
  if (!Array.isArray(candidate.capabilities) || !Array.isArray(candidate.targets)) throw new Error(`候选引擎 ${candidate.id} 缺少能力或目标清单`);
  if (!candidate.automation || typeof candidate.automation !== "object") throw new Error(`候选引擎 ${candidate.id} 缺少自动化清单`);
  if (!Array.isArray(candidate.licenses) || candidate.licenses.length === 0) throw new Error(`候选引擎 ${candidate.id} 缺少许可清单`);
  candidate.licenses.forEach((license, licenseIndex) => {
    assertString(license.component, `engines.${index}.licenses.${licenseIndex}.component`);
    assertString(license.license, `engines.${index}.licenses.${licenseIndex}.license`);
    assertString(license.sourceUrl, `engines.${index}.licenses.${licenseIndex}.sourceUrl`);
    if (!VALID_LICENSE_SCOPES.has(license.scope)) throw new Error(`候选引擎 ${candidate.id} 的许可 scope 无效`);
  });
  if (!Array.isArray(candidate.evidenceUrls) || candidate.evidenceUrls.length === 0) throw new Error(`候选引擎 ${candidate.id} 缺少证据链接`);
  if (!Array.isArray(candidate.notes)) throw new Error(`候选引擎 ${candidate.id} 的 notes 无效`);
  return candidate;
}

export function parseEngineCandidateCatalog(value: unknown): EngineCandidateCatalog {
  if (!value || typeof value !== "object") throw new Error("候选引擎清单必须是对象");
  const catalog = value as EngineCandidateCatalog;
  if (catalog.catalogVersion !== 1) throw new Error(`不支持的候选引擎清单版本：${String(catalog.catalogVersion)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.reviewedAt)) throw new Error("候选引擎 reviewedAt 必须是 YYYY-MM-DD");
  if (!Array.isArray(catalog.engines) || catalog.engines.length === 0) throw new Error("候选引擎清单为空");
  const engines = catalog.engines.map(validateCandidate);
  const ids = engines.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error("候选引擎清单包含重复 ID");
  return { catalogVersion: 1, reviewedAt: catalog.reviewedAt, engines };
}

export const ENGINE_CANDIDATE_CATALOG = parseEngineCandidateCatalog(rawCatalog);

export function getEngineCandidate(id: string): EngineCandidate {
  const candidate = ENGINE_CANDIDATE_CATALOG.engines.find((item) => item.id === id);
  if (!candidate) throw new Error(`候选引擎不存在：${id}`);
  return candidate;
}

export function buildLicenseInventory(catalog = ENGINE_CANDIDATE_CATALOG) {
  return catalog.engines.flatMap((engine) => engine.licenses.map((license) => ({ engineId: engine.id, engineName: engine.name, ...license })));
}
