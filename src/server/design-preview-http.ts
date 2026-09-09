import type { IncomingMessage, ServerResponse } from "node:http";
import type { ProjectInput } from "../shared/contracts.js";
import type { DesignContractGenerator } from "./design-contract.js";
import { sendJson } from "./http.js";

/** Only previews follow the HTTP connection lifetime; production jobs do not. */
export async function serveDesignPreview(request: IncomingMessage, response: ServerResponse, input: ProjectInput, generator: Pick<DesignContractGenerator, "generate">) {
  const cancellation = new AbortController();
  const disconnect = () => { if (!response.writableEnded) cancellation.abort(); };
  response.once("close", disconnect);
  if (response.destroyed) cancellation.abort();
  try {
    const streaming = request.headers.accept?.includes("application/x-ndjson");
    const emit = (event: unknown) => { if (!response.destroyed) response.write(JSON.stringify(event) + "\n"); };
    if (streaming) {
      response.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      response.flushHeaders();
      emit({ type: "status", phase: "submitted" });
    }
    let receiving = false;
    const delta = streaming ? (text: string) => {
      if (!receiving) {
        receiving = true;
        emit({ type: "status", phase: "receiving" });
      }
      emit({ type: "delta", text });
    } : undefined;
    const profile = await generator.generate(input, null, [
      "这是用户确认前的实时游戏策划。根据本次描述设计具体玩法，不要返回通用套话。使用普通人能懂的中文，说明实际操作、目标、新手引导、递进与成功反馈。用户未明确的细节给出合理且操作简单的建议。灵感仅是输入，不是固定方案。",
    ], delta, streaming ? () => {
      receiving = false;
      emit({ type: "reset" });
      emit({ type: "status", phase: "submitted" });
    } : undefined, cancellation.signal, streaming ? { onValidating: () => emit({ type: "status", phase: "checking" }) } : undefined);
    if (cancellation.signal.aborted) return;
    if (streaming) {
      emit(profile ? { type: "done", profile, source: "llm" } : { type: "error", error: "模型输出未完成或未通过检查，请检查模型设置后重试；当前片段不能用于制作。" });
      response.end();
    } else if (!profile) {
      sendJson(response, 503, { error: "实时方案生成失败，请检查模型设置或稍后重试。没有使用固定方案替代。" });
    } else sendJson(response, 200, { profile, source: "llm" });
  } catch (error) {
    if (!cancellation.signal.aborted) throw error;
  } finally {
    response.removeListener("close", disconnect);
  }
}
