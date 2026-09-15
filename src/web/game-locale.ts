import type { ResolvedLocale } from "./preferences";

export const supportedGameLocales = ["zh-CN", "zh-TW", "en", "ja"] as const;

export function isSupportedGameLocale(value: unknown): value is ResolvedLocale {
  return typeof value === "string" && supportedGameLocales.includes(value as ResolvedLocale);
}

/** Add the initial locale without discarding an existing query string or hash. */
export function withGameLocale(value: string, locale: ResolvedLocale, base = window.location.href) {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Unsupported game URL protocol.");
  url.searchParams.set("lang", locale);
  return url.href;
}

/** Synchronize an already-running game without reloading and losing its play state. */
export function postGameLocale(frame: HTMLIFrameElement | null, locale: ResolvedLocale) {
  if (!frame?.contentWindow || !isSupportedGameLocale(locale)) return false;
  let origin: string;
  try {
    const url = new URL(frame.src, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    origin = url.origin;
  } catch {
    return false;
  }
  frame.contentWindow.postMessage({ type: "forge:locale", locale }, origin);
  return true;
}
