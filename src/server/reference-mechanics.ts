import { assertPublicReferenceUrl, type ReferenceEvidence } from "./reference-intake.js";
import { parseReferenceMechanics, referenceMechanicsJsonSchema, type ReferenceMechanics } from "../shared/reference-mechanics.js";

/**
 * 参考游戏“核心玩法分析”：读取公开页面实际交付给浏览器的客户端脚本，让文本模型只提炼规则层事实。
 * 边界：只读公开、无需登录的内容；不下载美术/音频资源；不输出也不保存对方代码片段；产物是规则档案，不是可运行代码。
 */

export type ReferenceClientSource = {
  entryUrl: string;
  /** 去掉脚本与样式后的页面骨架，用来理解 HUD/控件结构。 */
  markup: string;
  /** 内联脚本 + 同源脚本文件拼接后的客户端代码（只在分析时使用，不落盘）。 */
  code: string;
  inlineScripts: number;
  scriptFiles: number;
  bytes: number;
  skipped: string[];
};

export type ReferenceSourceLimits = { documentBytes: number; totalScriptBytes: number; maxScriptFiles: number; minCodeChars: number };
export const DEFAULT_REFERENCE_SOURCE_LIMITS: ReferenceSourceLimits = { documentBytes: 1_048_576, totalScriptBytes: 640_000, maxScriptFiles: 8, minCodeChars: 1_500 };

// 广告、统计与验证脚本不是游戏逻辑，也不该进入分析上下文。
const thirdPartyScript = /(?:googlesyndication|googletagmanager|google-analytics|googleadservices|doubleclick|gstatic\.com\/recaptcha|clarity\.ms|cloudflareinsights|cdn-cgi\/|hotjar|segment\.(?:io|com)|sentry|newrelic|facebook\.net|connect\.facebook|adsbygoogle|analytics|gtag|pagead|beacon\.min\.js)/i;

const stripToMarkup = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 6_000);

async function readPublicText(url: URL, fetchImpl: typeof fetch, accept: string, maxBytes: number, timeoutMs: number): Promise<{ text: string; type: string } | null> {
  await assertPublicReferenceUrl(url);
  const response = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { Accept: accept, "User-Agent": "Mozilla/5.0 (compatible; ai-game-studio reference analysis)" } });
  if (!response.ok) return null;
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes) return null;
  const text = await response.text();
  if (text.length > maxBytes) return null;
  return { text, type: (response.headers.get("content-type") ?? "").toLowerCase() };
}

async function collectFromDocument(entry: URL, fetchImpl: typeof fetch, limits: ReferenceSourceLimits): Promise<ReferenceClientSource | null> {
  const document = await readPublicText(entry, fetchImpl, "text/html", limits.documentBytes, 8_000);
  if (!document || !document.type.includes("text/html")) return null;
  const html = document.text;
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]!.trim())
    .filter(code => code.length > 0 && !/^\s*\{[\s\S]*\}\s*$/.test(code) || /function|=>|const |let |var /.test(code));
  const externalSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]!);
  const skipped: string[] = [];
  const files: string[] = [];
  let total = inline.reduce((sum, code) => sum + code.length, 0);
  for (const raw of externalSources) {
    if (files.length >= limits.maxScriptFiles) { skipped.push(`超出脚本文件数上限：${raw}`); continue; }
    let url: URL;
    try { url = new URL(raw, entry); } catch { skipped.push(`无法解析：${raw}`); continue; }
    if (thirdPartyScript.test(url.toString())) { skipped.push(`第三方统计/广告脚本：${url.hostname}`); continue; }
    if (url.origin !== entry.origin) { skipped.push(`非同源脚本：${url.hostname}`); continue; }
    try {
      const script = await readPublicText(url, fetchImpl, "application/javascript,text/javascript,*/*", limits.totalScriptBytes - total, 8_000);
      if (!script) { skipped.push(`不可读取或超限：${url.pathname}`); continue; }
      total += script.text.length;
      files.push(`/* ---- 脚本文件 ${files.length + 1} ---- */\n${script.text}`);
      if (total >= limits.totalScriptBytes) { skipped.push("已达脚本总量上限，其余未读取"); break; }
    } catch (error) { skipped.push(`读取失败：${url.pathname}（${error instanceof Error ? error.message.slice(0, 80) : "未知"}）`); }
  }
  const code = [...inline.map((script, index) => `/* ---- 内联脚本 ${index + 1} ---- */\n${script}`), ...files].join("\n\n").slice(0, limits.totalScriptBytes);
  if (code.length < limits.minCodeChars) return null;
  return { entryUrl: entry.toString(), markup: stripToMarkup(html), code, inlineScripts: inline.length, scriptFiles: files.length, bytes: code.length, skipped };
}

/**
 * 在候选入口（浏览器观察到的 iframe / 直接入口 / 页面本身）中找出真正承载游戏逻辑的文档，返回其客户端源码。
 * 取代码量最大的候选；没有任何候选含有足够的脚本时返回 null。
 */
export async function collectReferenceClientSource(candidates: readonly (string | null | undefined)[], fetchImpl: typeof fetch = fetch, limits: ReferenceSourceLimits = DEFAULT_REFERENCE_SOURCE_LIMITS): Promise<ReferenceClientSource | null> {
  const seen = new Set<string>();
  let best: ReferenceClientSource | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    let url: URL;
    try { url = new URL(candidate); url.hash = ""; } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || seen.has(url.toString())) continue;
    seen.add(url.toString());
    try {
      const source = await collectFromDocument(url, fetchImpl, limits);
      if (source && (!best || source.bytes > best.bytes)) best = source;
    } catch { /* 候选不可读取时继续尝试下一个 */ }
  }
  return best;
}

/**
 * 从落地页 HTML 里找同源的游戏入口文档（iframe src、点击后才挂载的播放器路径、`/games/<slug>/index.html` 之类）。
 * 站点壳通常是框架页面，真正的游戏逻辑在另一个同源文档里；这里不执行脚本，只做文本扫描。
 */
export function discoverEntryCandidates(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const unescaped = html.replace(/\\\//g, "/").replace(/\\u002F/gi, "/").replace(/\\"/g, '"');
  const found = new Set<string>();
  const push = (raw: string) => {
    try {
      const url = new URL(raw, base); url.hash = "";
      if (url.origin !== base.origin || url.toString() === base.toString()) return;
      if (thirdPartyScript.test(url.toString())) return;
      found.add(url.toString());
    } catch { /* 不是可解析地址 */ }
  };
  for (const match of unescaped.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(match[1]!);
  for (const match of unescaped.matchAll(/<(?:iframe|embed|div|button|a)\b[^>]*\bdata-[a-z-]*(?:src|url|entry|game)[a-z-]*=["']([^"']+)["']/gi)) push(match[1]!);
  for (const match of unescaped.matchAll(/["'(](\/?[A-Za-z0-9_./-]*(?:index|game|play|embed)\.html?)(?:\?[^"')\s]*)?["')]/gi)) push(match[1]!);
  for (const match of unescaped.matchAll(/["'(]((?:https?:\/\/[^"')\s]+)?\/(?:games?|play|embed|html5)\/[A-Za-z0-9_./-]+)["')?]/gi)) push(match[1]!);
  return [...found].slice(0, 8);
}

/**
 * 先读落地页，把页面本身、HTML 里能看到的同源入口和浏览器观察到的入口都作为候选，取真正承载游戏逻辑的那一个。
 */
export async function collectReferenceMechanicsSource(pageUrl: string, fetchImpl: typeof fetch = fetch, browserCandidates: readonly (string | null | undefined)[] = [], limits: ReferenceSourceLimits = DEFAULT_REFERENCE_SOURCE_LIMITS): Promise<ReferenceClientSource | null> {
  const discovered: string[] = [];
  try {
    const page = await readPublicText(new URL(pageUrl), fetchImpl, "text/html", limits.documentBytes, 8_000);
    if (page?.type.includes("text/html")) discovered.push(...discoverEntryCandidates(page.text, pageUrl));
  } catch { /* 落地页读不到时仍尝试浏览器候选 */ }
  return collectReferenceClientSource([...browserCandidates, ...discovered, pageUrl], fetchImpl, limits);
}

export type ReferenceMechanicsAnalysisOptions = {
  fetchImpl: typeof fetch;
  endpoint: string;
  apiKey: string;
  requestOptions: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const analystSystemPrompt = [
  "你是游戏机制分析员。给你一份公开网页游戏实际交付给浏览器的客户端脚本和页面骨架，请只提炼规则层事实：操作、对象、核心规则、阻挡判定、胜负、计时、生命、关卡数量与生成/结构规律、计分、场景几何、HUD 布局、反馈时机。",
  "这些事实将作为另一款原创实现的复刻依据。禁止输出任何原代码片段、变量名、函数名、资源文件名或网址；所有结论用中文规则语言描述，可以且应当给出具体数值（尺寸、时长、数量、概率、公式、阈值）。",
  "关卡若是程序化生成，把生成参数随关卡变化的公式或表格、各生成阶段与约束写清楚——这是复刻最需要的信息。读不出的内容写进 unknowns，不要猜。",
].join("\n");

/** 让文本模型从客户端源码提炼机制档案；模型输出经 zod 校验，不合格即抛错。 */
export async function analyzeReferenceMechanics(source: ReferenceClientSource, options: ReferenceMechanicsAnalysisOptions): Promise<ReferenceMechanics> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 300_000);
  try {
    const response = await options.fetchImpl(options.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
      signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal,
      body: JSON.stringify({
        ...options.requestOptions,
        messages: [
          { role: "system", content: analystSystemPrompt },
          { role: "user", content: `参考入口：${source.entryUrl}\n\n页面骨架（已去掉脚本与样式）：\n${source.markup}\n\n客户端脚本（${source.inlineScripts} 段内联 + ${source.scriptFiles} 个同源文件，共 ${source.bytes} 字符）：\n${source.code}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "reference_mechanics", strict: true, schema: referenceMechanicsJsonSchema } },
      }),
    });
    if (!response.ok) throw new Error(`机制分析模型接口返回 ${response.status}。`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("机制分析模型没有返回内容。");
    let raw: unknown;
    try { raw = JSON.parse(content); } catch { throw new Error("机制分析模型返回的内容不是有效 JSON。"); }
    return parseReferenceMechanics(raw);
  } finally { clearTimeout(timer); }
}

const clipClaim = (prefix: string, value: string) => `${prefix}${value}`.replace(/\s+/g, " ").trim().slice(0, 240);

/** 把档案的关键事实登记为可审查的参考证据（observed / gameplay-source）。 */
export function referenceMechanicsEvidence(dossier: ReferenceMechanics, entryUrl: string): ReferenceEvidence[] {
  const entries: Array<[string, string]> = [
    ["公开客户端行为分析·核心规则：", dossier.coreRule],
    ["公开客户端行为分析·胜利条件：", dossier.winCondition],
    ["公开客户端行为分析·失败条件：", dossier.loseCondition],
    ["公开客户端行为分析·计时：", dossier.timer],
    ["公开客户端行为分析·生命：", dossier.lives],
    ["公开客户端行为分析·关卡：", dossier.levels],
    ["公开客户端行为分析·关卡结构：", dossier.levelStructure],
  ];
  return [
    ...entries.filter(([, value]) => value.trim().length > 0).map(([prefix, value]) => ({ status: "observed" as const, basis: "gameplay-source" as const, claim: clipClaim(prefix, value), source: entryUrl })),
    ...(dossier.unknowns.length ? [{ status: "unknown" as const, claim: clipClaim("客户端行为分析仍未读出：", dossier.unknowns.join("；")), source: entryUrl }] : []),
  ];
}
