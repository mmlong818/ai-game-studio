export interface ImageJob<T> {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  result?: T;
  error?: string;
}

export class ImageGenerationQueue<T> {
  private jobs = new Map<string, ImageJob<T>>();
  private controllers = new Map<string, AbortController>();
  private tail = Promise.resolve();

  enqueue(id: string, run: (signal: AbortSignal) => Promise<T>): ImageJob<T> {
    if (this.jobs.has(id)) throw new Error("图片任务 ID 重复");
    const job: ImageJob<T> = { id, status: "queued" };
    this.jobs.set(id, job);
    const controller = new AbortController();
    this.controllers.set(id, controller);
    this.tail = this.tail.then(async () => {
      if (controller.signal.aborted) return;
      job.status = "running";
      try {
        job.result = await run(controller.signal);
        job.status = controller.signal.aborted ? "cancelled" : "completed";
      } catch (error) {
        job.status = controller.signal.aborted ? "cancelled" : "failed";
        job.error = error instanceof Error ? error.message : "图片生成失败";
      } finally {
        this.controllers.delete(id);
      }
    });
    return job;
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || ["completed", "failed", "cancelled"].includes(job.status)) return false;
    this.controllers.get(id)?.abort();
    job.status = "cancelled";
    return true;
  }

  get(id: string): ImageJob<T> | undefined { return this.jobs.get(id); }
  list(): ImageJob<T>[] { return [...this.jobs.values()]; }
  async idle(): Promise<void> { await this.tail; }
}
