import { projectRevisionInputSchema } from "../shared/contracts";
import { getProjectRevision, submitProjectRevision } from "./api";

const key = (projectId: string) => `studio-pending-revision:${projectId}`;
export function pendingRevision(projectId: string) {
  const saved = localStorage.getItem(key(projectId));
  return saved ? projectRevisionInputSchema.parse(JSON.parse(saved)) : null;
}
function acknowledge(projectId: string, requestId: string) {
  if (pendingRevision(projectId)?.requestId === requestId) localStorage.removeItem(key(projectId));
}
export async function recoverPendingRevision(projectId: string) {
  const receipt = pendingRevision(projectId);
  if (!receipt) return null;
  const build = await getProjectRevision(projectId, receipt.requestId);
  if (build) acknowledge(projectId, receipt.requestId);
  return build;
}
export async function confirmProjectRevision(projectId: string, content: string) {
  const previous = pendingRevision(projectId);
  if (previous && previous.content !== content.trim()) throw new Error("上次修改的接收状态尚未确认，请先刷新恢复原任务，不要改写待确认的请求。");
  const receipt = previous ?? projectRevisionInputSchema.parse({ requestId: crypto.randomUUID(), content });
  // Failure to persist stops before any network write. Reconnection only reads;
  // explicit confirmation may resend this same id, which is atomic server-side.
  localStorage.setItem(key(projectId), JSON.stringify(receipt));
  const existing = await getProjectRevision(projectId, receipt.requestId);
  const build = existing ?? await submitProjectRevision(projectId, receipt);
  acknowledge(projectId, receipt.requestId);
  return build;
}
