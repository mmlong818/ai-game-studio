import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
export type ReferenceEvidence = { status: "observed" | "inferred" | "unknown"; basis?: "page-shell" | "resource-index" | "gameplay-text" | "gameplay-source" | "source-contract"; claim: string; source: string };
export const hasUsableReferenceEvidence = (items: ReferenceEvidence[]) => items.some(item => item.status === "observed" && ["gameplay-text", "gameplay-source", "source-contract"].includes(item.basis ?? ""));
const challengePage = (value: string) => /just a moment|cloudflare|verify (?:you are )?human|access denied|sign in to continue|请完成验证|登录后继续/i.test(value);
const gameplayText = (value: string) => value.length >= 30 && /\b(?:click(?:ing|ed)?|tap(?:ping|ped)?|drag(?:ging|ged)?|swipe|move|merge|match|clear|collect|avoid|control|goal|win|lose)\b|玩家|点击|拖动|滑动|移动|合并|匹配|清空|收集|躲避|控制|操作|目标|获胜|失败/i.test(value);
const gameplaySections = (body: string) => {
  const starts = [...body.matchAll(/\bhow to play\b|\bcontrols?\b|玩法(?:说明)?|怎么玩|操作(?:方法|说明)?/gi)].map(match => match.index);
  return [...new Set(starts)].slice(0, 3).map(start => body.slice(start, start + 650).trim()).filter(gameplayText);
};
const privateAddress = (address: string): boolean => {
  const value = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (/^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|::$|fc|fd|fe80)/.test(value) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(value)) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? privateAddress(mapped) : /^::ffff:(?:7f|0a|ac1[0-9a-f]|c0a8|a9fe)/.test(value);
};
export async function assertPublicReferenceUrl(url: URL) {
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("参考地址只允许公开 HTTP/HTTPS 页面。");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("参考地址不能指向本机或私有网络。");
}
export async function inspectPublicReference(idea: string, fetchImpl: typeof fetch = fetch): Promise<ReferenceEvidence[]> {
  const raw = idea.match(/https?:\/\/[^\s]+/i)?.[0];
  if (!raw) return [{ status: "unknown", claim: "没有可公开读取的参考网址；需要用户提供可访问页面或已授权资料。", source: "用户描述" }];
  let url = new URL(raw);
  try {
    for (let redirect = 0; redirect < 4; redirect += 1) {
      await assertPublicReferenceUrl(url);
      const response = await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(5_000), headers: { Accept: "text/html" } });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) { url = new URL(response.headers.get("location")!, url); continue; }
      if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) throw new Error("参考页面不可公开读取或不是 HTML 页面。");
      if (Number(response.headers.get("content-length") ?? 0) > 262_144) throw new Error("参考页面超过读取上限。");
      const text = await response.text(); if (text.length > 262_144) throw new Error("参考页面超过读取上限。");
      const clean = (value = "") => value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|#39);/g, " ").replace(/\s+/g, " ").trim();
      const title = clean(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
      const description = text.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)?.[1]?.replace(/\s+/g, " ").trim();
      const bodyFull = clean(text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]);
      const body = bodyFull.slice(0, 210);
      const gameplay = gameplaySections(bodyFull);
      if (challengePage([title, description, body].filter(Boolean).join(" "))) throw new Error("参考页面是登录或访问验证页面，没有取得游戏规则。");
      const links = [...text.matchAll(/<(iframe|embed|script|link|img)\b[^>]+(?:src|href)=["']([^"']+)/gi)].slice(0, 20).map(match => `${match[1]!.toLowerCase()}:${new URL(match[2]!, url).toString()}`);
      const evidence: ReferenceEvidence[] = [
        { status: "observed", basis: "page-shell", claim: `公开页面文字：${[title, description, body].filter(Boolean).join(" — ").slice(0, 220) || "页面可访问但无可用正文。"}`, source: url.toString() },
        ...gameplay.map(section => ({ status: "observed" as const, basis: "gameplay-text" as const, claim: `公开玩法正文：${section.slice(0, 220)}`, source: url.toString() })),
        ...(links.length ? [{ status: "observed" as const, basis: "resource-index" as const, claim: `公开资源入口索引：${links.join("；").slice(0, 220)}`, source: url.toString() }] : []),
      ];
      const follow = links.filter(item => /^(?:iframe|embed|script|link):/.test(item)).slice(0, 3);
      for (const item of follow) {
        const child = new URL(item.slice(item.indexOf(":") + 1)); await assertPublicReferenceUrl(child);
        const childResponse = await fetchImpl(child, { redirect: "manual", signal: AbortSignal.timeout(3_000), headers: { Accept: "text/html,text/css,application/javascript" } });
        const childType = (childResponse.headers.get("content-type") ?? "").toLowerCase();
        if (!childResponse.ok || !/(?:text\/html|text\/css|javascript|json)/.test(childType) || Number(childResponse.headers.get("content-length") ?? 0) > 131_072) continue;
        const childText = await childResponse.text(); if (childText.length > 131_072) continue;
        const childClean = clean(childText).slice(0, 190) || childText.replace(/\s+/g, " ").slice(0, 190);
        evidence.push({ status: "observed", basis: gameplayText(childClean) ? "gameplay-source" : "page-shell", claim: `公开入口文本片段：${childClean}`, source: child.toString() });
      }
      evidence.push({ status: "unknown", claim: "上述公开文字和资源入口仍不能证明未实际执行的交互、完整关数、混淆代码语义或受限资源。", source: url.toString() });
      return evidence;
    }
    throw new Error("参考页面重定向过多。");
  } catch (error) { return [{ status: "unknown", claim: `参考页面未形成可验证观察：${error instanceof Error ? error.message : "读取失败"}`, source: url.toString() }]; }
}
