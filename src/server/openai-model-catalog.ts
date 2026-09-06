import { z } from "zod";
import type { OpenAIModelCatalog } from "../shared/contracts.js";

// Models.list does not return endpoint capabilities. Restrict selection to families
// compatible with our reasoning/structured Responses and GPT image generation payloads.
export const textModelPattern = /^gpt-(?:[5-9]|\d{2,})(?:\.\d+)*(?:-(?:astra|sol|terra|luna|mini|nano))?(?:-\d{4}-\d{2}-\d{2})?$/;
export const imageModelPattern = /^gpt-image-\d+(?:\.\d+)*(?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/;
const responseSchema = z.object({ data: z.array(z.object({ id: z.string(), created: z.number() })) });

export function modelCatalog(payload: unknown): OpenAIModelCatalog {
  const entries = [...new Map(responseSchema.parse(payload).data.map(model => [model.id, model])).values()];
  const sort = (a: typeof entries[number], b: typeof entries[number]) => {
    const family = (id: string) => id.match(/^gpt-(?:image-)?\d+(?:\.\d+)*/)?.[0] ?? id;
    const generation = family(b.id).localeCompare(family(a.id), "en", { numeric: true });
    // Prefer flagship variants within a generation, independent of listing order
    // or creation timestamps. Keep stable aliases ahead of dated snapshots.
    const variant = (id: string) => /-(?:nano|luna)(?:-|$)/.test(id) ? 2 : /-(?:mini|terra)(?:-|$)/.test(id) ? 1 : 0;
    return generation || variant(a.id) - variant(b.id)
      || Number(/-\d{4}-\d{2}-\d{2}$/.test(a.id)) - Number(/-\d{4}-\d{2}-\d{2}$/.test(b.id))
      || b.created - a.created || a.id.localeCompare(b.id);
  };
  const text = entries.filter(m => textModelPattern.test(m.id)).sort(sort);
  const image = entries.filter(m => imageModelPattern.test(m.id)).sort(sort);
  return { text, image, recommended: { text: text[0]?.id ?? null, image: image[0]?.id ?? null } };
}

export async function fetchModelCatalog(key: string, fetcher: typeof fetch = fetch): Promise<OpenAIModelCatalog> {
  let response: Response;
  try {
    response = await fetcher("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000), redirect: "error",
    });
  } catch { throw new Error("模型列表获取失败或超时，请检查网络后重试。"); }
  if (!response.ok) throw new Error(response.status === 401 ? "API Key 无效，请检查后重试。" : response.status === 403 ? "此 Key 无权读取模型列表。" : response.status === 429 ? "请求过于频繁，请稍后重试。" : "远端模型服务暂不可用，请稍后重试。");
  try { return modelCatalog(await response.json()); }
  catch { throw new Error("远端模型列表格式不正确，请稍后重试。"); }
}
