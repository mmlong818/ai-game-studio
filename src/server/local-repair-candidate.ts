import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import type { ProjectDetail } from "../shared/contracts.js";
import { readGeneratedSource } from "./generated-source.js";
import { stripTutorialContract } from "./tutorial-contract.js";

const descriptorSchema = z.object({
  schemaVersion: z.literal("local-repair-candidate-v1"),
  projectId: z.string().uuid(),
  contractHash: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9-]+\/payload$/),
  registeredAt: z.string().datetime(),
}).strict();

export function localRepairContractHash(project: ProjectDetail) {
  const identity = {
    projectId: project.id,
    aspectRatio: project.spec.aspectRatio,
    designProfile: { ...project.spec.designProfile, onboarding: [] },
    designContract: stripTutorialContract(project.spec.designContract),
  };
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export type LocalRepairCandidateResult =
  | { status: "absent" }
  | { status: "invalid"; reason: string }
  | { status: "ready"; html: string; descriptor: z.infer<typeof descriptorSchema>; payload: string };

function inside(root: string, path: string) {
  const rel = relative(root, path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** Admin-only filesystem operation. Runtime APIs never accept candidate paths. */
export function registerLocalRepairCandidate(registryRoot: string, project: ProjectDetail, sourceRoot: string) {
  const canonicalSource = realpathSync(resolve(sourceRoot));
  if (!lstatSync(canonicalSource).isDirectory() || !readGeneratedSource(canonicalSource)) throw new Error("本地修复候选必须包含可重建的 index.html、styles.css 和 app.js。 ");
  const projectRoot = join(resolve(registryRoot), project.id);
  const candidateId = randomUUID();
  const payload = join(projectRoot, candidateId, "payload");
  mkdirSync(dirname(payload), { recursive: true });
  cpSync(canonicalSource, payload, { recursive: true, dereference: false, filter: (source) => !lstatSync(source).isSymbolicLink() });
  const descriptor = descriptorSchema.parse({
    schemaVersion: "local-repair-candidate-v1",
    projectId: project.id,
    contractHash: localRepairContractHash(project),
    payload: `${candidateId}/payload`,
    registeredAt: new Date().toISOString(),
  });
  mkdirSync(projectRoot, { recursive: true });
  writeFileSync(join(projectRoot, "candidate.json"), `${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
  return descriptor;
}

export function inspectLocalRepairCandidate(registryRoot: string, project: ProjectDetail): LocalRepairCandidateResult {
  const descriptorPath = join(resolve(registryRoot), project.id, "candidate.json");
  if (!existsSync(descriptorPath)) return { status: "absent" };
  try {
    const canonicalRegistry = realpathSync(resolve(registryRoot));
    const projectRoot = realpathSync(join(canonicalRegistry, project.id));
    if (!inside(canonicalRegistry, projectRoot)) return { status: "invalid", reason: "项目登记目录越出私有候选根目录" };
    const descriptorPath = join(projectRoot, "candidate.json");
    if (lstatSync(descriptorPath).isSymbolicLink()) return { status: "invalid", reason: "登记描述文件不能是符号链接" };
    const descriptor = descriptorSchema.parse(JSON.parse(readFileSync(descriptorPath, "utf8")));
    if (descriptor.projectId !== project.id) return { status: "invalid", reason: "登记项目与当前项目不一致" };
    const currentHash = localRepairContractHash(project);
    if (descriptor.contractHash !== currentHash) return { status: "invalid", reason: `登记合同哈希 ${descriptor.contractHash} 与当前合同哈希 ${currentHash} 不一致` };
    const payload = realpathSync(join(projectRoot, descriptor.payload));
    if (!inside(projectRoot, payload)) return { status: "invalid", reason: "候选载荷越出项目私有目录" };
    const html = readGeneratedSource(payload);
    return html ? { status: "ready", html, descriptor, payload } : { status: "invalid", reason: "候选载荷不是完整可重建游戏" };
  } catch (error) {
    return { status: "invalid", reason: error instanceof Error ? error.message : String(error) };
  }
}

export function readLocalRepairCandidate(registryRoot: string, project: ProjectDetail) {
  const result = inspectLocalRepairCandidate(registryRoot, project);
  return result.status === "ready" ? result : null;
}
