import { randomUUID } from "node:crypto";
import { explicitAspectProjectInputSchema, projectInputSchema, type Build, type ProjectInput } from "../shared/contracts.js";
import type { StudioDatabase } from "./database.js";
import { runWithCancellation } from "./cancellation.js";
import { safeFailure } from "./build-failure.js";
import type { ZeroModelRecoveryCheckpoint } from "./production-auto-recovery.js";

export type ProductionJob = { id: string; status: "queued" | "creating" | "building" | "recovering" | "succeeded" | "failed" | "cancelled"; error: string | null; failureDetails?: Build["failureDetails"]; autoRecovery?: "checking" | "started" | "failed" | null; events?: { title: string; createdAt: string }[] };

type RecoveryOptions = {
  latestBuild: (projectId: string) => Promise<Build | null>;
  recoveryCheckpoint: (build: Build) => Promise<ZeroModelRecoveryCheckpoint | null>;
  startBuild: (projectId: string, checkpoint: ZeroModelRecoveryCheckpoint, signal: AbortSignal) => Promise<Build>;
  pollMs?: number;
};

export class ProductionJobs {
  private active = 0;
  private waiting: { id: string; input: ProjectInput }[] = [];
  private controllers = new Map<string, AbortController>();
  private monitors = new Set<string>();
  constructor(private db: StudioDatabase, private execute: (input: ProjectInput, report: (title: string) => Promise<void>, signal: AbortSignal) => Promise<void>, private recovery?: RecoveryOptions) {}
  async initialize() {
    await this.db.query("CREATE TABLE IF NOT EXISTS production_jobs (id TEXT PRIMARY KEY, input_json TEXT NOT NULL, status TEXT NOT NULL, error TEXT, failure_details_json TEXT)");
    if (this.db.provider === "postgresql") await this.db.query("ALTER TABLE production_jobs ADD COLUMN IF NOT EXISTS failure_details_json TEXT");
    await this.db.query("CREATE TABLE IF NOT EXISTS production_job_events (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL)");
    await this.db.query("CREATE TABLE IF NOT EXISTS production_job_recoveries (job_id TEXT PRIMARY KEY, source_build_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)");
    // The API owns the database runtime lease before calling initialize. Only
    // queued receipts are safe to resume: creating may already have incurred cost.
    const interrupted = {
      stage: "planning", category: "unknown", code: "CREATION_OUTCOME_UNKNOWN",
      message: "服务重启时创建步骤的结果无法确认，系统已停止重复调用并保留同一制作回执。",
      nextStep: "系统会按原回执检查是否已有项目或构建记录；在确认结果前不会重复调用付费服务。", retryable: false,
    };
    await this.db.query("UPDATE production_jobs SET status = 'failed', error = $1, failure_details_json = $2 WHERE status = 'creating'", [interrupted.message, JSON.stringify([interrupted])]);
    // A recovery start is a local database/build handoff. After restart, inspect
    // the latest persisted build; never repeat the handoff itself because the
    // recovery receipt below remains the single-use claim.
    await this.db.query("UPDATE production_jobs SET status = 'building' WHERE status = 'recovering'");
    const queued = (await this.db.query<{ id: string; input_json: string }>("SELECT id, input_json FROM production_jobs WHERE status = 'queued' ORDER BY id")).rows;
    for (const row of queued) {
      try {
        const input = explicitAspectProjectInputSchema.parse(JSON.parse(row.input_json));
        if (input.requestId !== row.id) throw new Error("制作回执与方案编号不一致。");
        this.waiting.push({ id: row.id, input });
      } catch {
        await this.db.query("UPDATE production_jobs SET status = 'failed', error = '排队方案无法恢复，未启动模型调用。' WHERE id = $1 AND status = 'queued'", [row.id]);
      }
    }
    if (this.recovery) {
      const building = (await this.db.query<{ id: string }>("SELECT id FROM production_jobs WHERE status IN ('building', 'recovering')")).rows;
      for (const row of building) this.monitor(row.id);
    }
    if (this.waiting.length) setTimeout(() => this.drain(), 0);
  }
  async get(id: string): Promise<ProductionJob | null> {
    const job = (await this.db.query<ProductionJob & { failure_details_json?: string | null; auto_recovery?: ProductionJob["autoRecovery"] }>("SELECT p.id, p.status, p.error, p.failure_details_json, r.status AS auto_recovery FROM production_jobs p LEFT JOIN production_job_recoveries r ON r.job_id = p.id WHERE p.id = $1", [id])).rows[0];
    if (!job) return null;
    const events = (await this.db.query<{ title: string; created_at: string }>("SELECT title, created_at FROM production_job_events WHERE job_id = $1 ORDER BY created_at, id", [id])).rows;
    return { id: job.id, status: job.status, error: job.error, failureDetails: job.failure_details_json ? JSON.parse(job.failure_details_json) : null, autoRecovery: job.auto_recovery ?? null, events: events.map(event => ({ title: event.title, createdAt: event.created_at })) };
  }
  async submit(raw: ProjectInput): Promise<ProductionJob> {
    const input = explicitAspectProjectInputSchema.parse(raw);
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
    await this.db.query("UPDATE production_jobs SET status = 'cancelled', error = NULL, failure_details_json = NULL WHERE id = $1 AND status IN ('queued', 'creating', 'building', 'recovering')", [id]);
    this.controllers.get(id)?.abort(new DOMException("用户已停止制作。", "AbortError"));
    this.waiting = this.waiting.filter(item => item.id !== id);
    job = (await this.get(id))!;
    return job;
  }

  async settle(id: string, status: "succeeded" | "failed") {
    if (status === "failed" && this.recovery) { this.monitor(id); return; }
    await this.db.query("UPDATE production_jobs SET status = $2 WHERE id = $1 AND status = 'building'", [id, status]);
  }
  async deleteTerminal(id: string) {
    const job = await this.get(id);
    if (!job) return { deleted: false };
    if (["queued", "creating", "building", "recovering"].includes(job.status)) throw new Error("制作任务仍在运行，请先停止后再删除。");
    await this.db.transaction(async database => {
      await database.query("DELETE FROM production_job_events WHERE job_id = $1", [id]);
      await database.query("DELETE FROM production_job_recoveries WHERE job_id = $1", [id]);
      await database.query("DELETE FROM production_jobs WHERE id = $1", [id]);
    });
    return { deleted: true };
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
      this.monitor(id);
    } catch (reason) {
      const detail = safeFailure("planning", reason);
      await this.db.query("UPDATE production_jobs SET status = 'failed', error = $2, failure_details_json = $3 WHERE id = $1 AND status IN ('queued', 'creating')", [id, detail.message, JSON.stringify([detail])]).catch(() => {});
    } finally { this.controllers.delete(id); }
  }

  private monitor(id: string) {
    if (!this.recovery || this.monitors.has(id)) return;
    this.monitors.add(id);
    const poll = async () => {
      const job = await this.get(id).catch(() => null);
      if (!job || !["building", "recovering"].includes(job.status)) { this.monitors.delete(id); return; }
      if (job.status === "recovering") { setTimeout(() => void poll(), this.recovery!.pollMs ?? 750); return; }
      const build = await this.recovery!.latestBuild(id).catch(() => null);
      if (!build || build.status === "queued" || build.status === "running") { setTimeout(() => void poll(), this.recovery!.pollMs ?? 750); return; }
      if (build.status === "succeeded" || build.status === "cancelled") {
        await this.db.query("UPDATE production_jobs SET status = $2 WHERE id = $1 AND status = 'building'", [id, build.status]);
        this.monitors.delete(id); return;
      }
      const checkpoint = await this.recovery!.recoveryCheckpoint(build).catch(() => null);
      if (!checkpoint) {
        await this.db.query("UPDATE production_jobs SET status = 'failed' WHERE id = $1 AND status = 'building'", [id]);
        this.monitors.delete(id); return;
      }
      const recorded = await this.db.query("INSERT INTO production_job_recoveries (job_id, source_build_id, status, created_at) VALUES ($1, $2, 'checking', $3) ON CONFLICT(job_id) DO NOTHING", [id, checkpoint.sourceBuildId, new Date().toISOString()]);
      if (!recorded.rowCount) {
        await this.db.query("UPDATE production_jobs SET status = 'failed' WHERE id = $1 AND status = 'building'", [id]);
        this.monitors.delete(id); return;
      }
      const claimed = await this.db.query("UPDATE production_jobs SET status = 'recovering', error = NULL, failure_details_json = NULL WHERE id = $1 AND status = 'building'", [id]);
      if (!claimed.rowCount) { this.monitors.delete(id); return; }
      const controller = new AbortController();
      this.controllers.set(id, controller);
      await this.db.query("INSERT INTO production_job_events (id, job_id, title, created_at) VALUES ($1, $2, $3, $4)", [randomUUID(), id, "检测到无需新增模型请求的完整检查点，系统正在自动复验", new Date().toISOString()]);
      try {
        await this.recovery!.startBuild(id, checkpoint, controller.signal);
        await this.db.query("UPDATE production_job_recoveries SET status = 'started' WHERE job_id = $1", [id]);
        await this.db.query("UPDATE production_jobs SET status = 'building' WHERE id = $1 AND status = 'recovering'", [id]);
      } catch (reason) {
        if (controller.signal.aborted) return;
        const detail = safeFailure("unknown", reason);
        await this.db.query("UPDATE production_job_recoveries SET status = 'failed' WHERE job_id = $1", [id]);
        await this.db.query("UPDATE production_jobs SET status = 'failed', error = $2, failure_details_json = $3 WHERE id = $1 AND status = 'recovering'", [id, detail.message, JSON.stringify([detail])]);
      } finally {
        this.controllers.delete(id);
        const current = await this.get(id).catch(() => null);
        if (current?.status === "building") setTimeout(() => void poll(), this.recovery!.pollMs ?? 750);
        else this.monitors.delete(id);
      }
    };
    setTimeout(() => void poll(), this.recovery.pollMs ?? 750);
  }
}
