import { resolve } from "node:path";
import { projectDetailSchema } from "../src/shared/contracts.js";
import { registerLocalRepairCandidate } from "../src/server/local-repair-candidate.js";

const [projectId, sourcePath] = process.argv.slice(2);
if (!projectId || !sourcePath) throw new Error("用法: tsx scripts/register-local-repair-candidate.ts <project-id> <candidate-directory>");
const response = await fetch(`http://127.0.0.1:4312/api/projects/${encodeURIComponent(projectId)}`);
if (!response.ok) throw new Error(`读取项目失败: HTTP ${response.status}`);
const project = projectDetailSchema.parse((await response.json() as { project: unknown }).project);
const descriptor = registerLocalRepairCandidate(resolve("data", "local-repair-candidates"), project, resolve(sourcePath));
console.log(JSON.stringify({ projectId: descriptor.projectId, contractHash: descriptor.contractHash, registeredAt: descriptor.registeredAt }));
