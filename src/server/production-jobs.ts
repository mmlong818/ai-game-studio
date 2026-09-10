import { randomUUID } from "node:crypto";
import { projectInputSchema, type ProjectInput } from "../shared/contracts.js";
import type { StudioDatabase } from "./database.js";
import { runWithCancellation } from "./cancellation.js";

export type ProductionJob = { id: string; status: "queued" | "creating" | "building" | "succeeded" | "failed" | "cancelled"; error: string | null; events?: { title: string; createdAt: string }[] };
export class ProductionJobs {
  private active = 0;
  private waiting: { id: string; input: ProjectInput }[] = [];
  private controllers = new Map<string, AbortController>();
  constructor(private db: StudioDatabase, private execute: (input: ProjectInput, report: (title: string) => Promise<void>, signal: AbortSignal) => Promise<void>) {}
  async initialize() {
    await this.db.query("CREATE TABLE IF NOT EXISTS production_jobs (id TEXT PRIMARY KEY, input_json TEXT NOT NULL, status TEXT NOT NULL, error TEXT)");
    await this.db.query("CREATE TABLE IF NOT EXISTS production_job_events (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL)");
    // The API owns the database runtime lease before calling initialize. Only
    // queued receipts are safe to resume: creating may already have incurred cost.
    await this.db.query("UPDATE production_jobs SET status = 'failed', error = '服务重启导致创建阶段中断，未自动重试。' WHERE status = 'creating'");
    const queued = (await this.db.query<{ id: string; input_json: string }>("SELECT id, input_json FROM production_jobs WHERE status = 'queued' ORDER BY id")).rows;
    for (const row of queued) {
      try {
        const input = projectInputSchema.parse(JSON.parse(row.input_json));
        if (input.requestId !== row.id) throw new Error("制作回执与方案编号不一致。");
        this.waiting.push({ id: row.id, input });
      } catch {
        await this.db.query("UPDATE production_jobs SET status = 'failed', error = '排队方案无法恢复，未启动模型调用。' WHERE id = $1 AND status = 'queued'", [row.id]);
      }
    }
    if (this.waiting.length) setTimeout(() => this.drain(), 0);
  }
  async get(id: string): Promise<ProductionJob | null> {
    const job = (await this.db.query<ProductionJob>("SELECT id, status, error FROM production_jobs WHERE id = $1", [id])).rows[0];
    if (!job) return null;
    const events = (await this.db.query<{ title: string; created_at: string }>("SELECT title, created_at FROM production_job_events WHERE job_id = $1 ORDER BY created_at, id", [id])).rows;
    return { ...job, events: events.map(event => ({ title: event.title, createdAt: event.created_at })) };
  }
  async submit(raw: ProjectInput): Promise<ProductionJob> {
    const input = projectInputSchema.parse(raw);
    const id = input.requestId ?? randomUUID();
    const payload = JSON.stringify({ ...input, requestId: id });
    const inserted = await this.db.query("INSERT INTO production_jobs (id, input_json, status) VALUES ($1, $2, 'queued') ON CONFLICT(id) DO NOTHING", [id, payload]);
    if (!inserted.rowCount) {
      const previous = (await this.db.query<{ input_json: string; status: string }>("SELECT input_json, status FROM production_jobs WHERE id = $1", [id])).rows[0];
      if (previous.status === "cancelled") return (await this.get(id))!;
      if (JSON.stringify(projectInputSchema.parse(JSON.parse(previous.input_json))) !== payload) throw new Error("该制作请求已对应另一份方案。");
    } else {
      // The persisted receipt exists before accepting the request. Browser lifetime is irrelevant.
      this.waiting.push({ id, input: { ...input, requestId: id } });
      setTimeout(() => this.drain(), 0);
    }
    return (await this.get(id))!;
  }

  async cancel(id: string, cancelBuild: () => Promise<"cancelled" | "succeeded" | "failed" | null> = async () => null): Promise<ProductionJob> {
    let job = await this.get(id);
    if (!job) {
      await this.db.query("INSERT INTO production_jobs (id, input_json, status, error) VALUES ($1, $2, 'cancelled', NULL) ON CONFLICT(id) DO NOTHING", [id, JSON.stringify({ requestId: id })]);
      return (await this.get(id))!;
    }
    if (job.status === "building") {
      const buildStatus = await cancelBuild();
      if (buildStatus === "succeeded" || buildStatus === "failed") {
        await this.db.query("UPDATE production_jobs SET status = $2 WHERE id = $1 AND status = 'building'", [id, buildStatus]);
        return (await this.get(id))!;
      }
    }
    await this.db.query("UPDATE production_jobs SET status = 'cancelled', error = NULL WHERE id = $1 AND status IN ('queued', 'creating', 'building')", [id]);
    this.controllers.get(id)?.abort(new DOMException("用户已停止制作。", "AbortError"));
    this.waiting = this.waiting.filter(item => item.id !== id);
    job = (await this.get(id))!;
    return job;
  }

  async settle(id: string, status: "succeeded" | "failed") {
    await this.db.query("UPDATE production_jobs SET status = $2 WHERE id = $1 AND status = 'building'", [id, status]);
  }
  /**
   * 创建阶段失败（尚未生成项目）时，用同一份已确认方案开一张新回执重新制作，
   * 不重新策划。已生成项目的失败属于构建失败，走项目页的新版本流程，这里拒绝。
   */
  async resubmitFailed(id: string, projectExists: (id: string) => Promise<boolean>): Promise<ProductionJob> {
    const job = (await this.db.query<{ status: string; input_json: string }>("SELECT status, input_json FROM production_jobs WHERE id = $1", [id])).rows[0];
    if (!job) throw new Error("找不到该制作任务。");
    if (job.status !== "failed") throw new Error("只有已失败且未生成项目的任务可以用同一方案重新制作。");
    if (await projectExists(id)) throw new Error("该任务已生成项目，请在项目页启动新版本，而不是重新创建。");
    const input = projectInputSchema.parse(JSON.parse(job.input_json));
    if (!input.confirmedDesignProfile) throw new Error("该任务没有保存已确认方案，无法免策划重新制作。");
    return this.submit({ ...input, requestId: randomUUID() });
  }

  private drain() {
    while (this.active < 2 && this.waiting.length) {
      const next = this.waiting.shift()!;
      this.active++;
      void this.run(next.id, next.input).finally(() => { this.active--; this.drain(); });
    }
  }
  private async run(id: string, input: ProjectInput) {
    const controller = new AbortController();
    this.controllers.set(id, controller);
    try {
      const claimed = await this.db.query("UPDATE production_jobs SET status = 'creating' WHERE id = $1 AND status = 'queued'", [id]);
      if (claimed.rowCount !== 1) return;
      await runWithCancellation(controller.signal, () => this.execute(input, async title => {
        controller.signal.throwIfAborted();
        await this.db.query("INSERT INTO production_job_events (id, job_id, title, created_at) VALUES ($1, $2, $3, $4)", [randomUUID(), id, title, new Date().toISOString()]);
      }, controller.signal));
      controller.signal.throwIfAborted();
      await this.db.query("UPDATE production_jobs SET status = 'building' WHERE id = $1 AND status = 'creating'", [id]);
    } catch (reason) {
      const error = reason instanceof Error ? reason.message : "项目创建失败。";
      await this.db.query("UPDATE production_jobs SET status = 'failed', error = $2 WHERE id = $1 AND status IN ('queued', 'creating')", [id, error]).catch(() => {});
    } finally { this.controllers.delete(id); }
  }
}
