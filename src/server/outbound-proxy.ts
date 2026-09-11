import { execFileSync } from "node:child_process";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

const windowsInternetSettings = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
const localNoProxy = ["127.0.0.1", "localhost", "::1"];

type ProxyEnvironment = Record<string, string | undefined>;
export type OutboundProxySource = "environment" | "windows-system" | null;

function normalizedProxyUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || /[\r\n\s]/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `http://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || !url.port) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Parse the WinINet ProxyServer form without assuming one fixed local port. */
export function parseWindowsProxyServer(raw: string): { http: string; https: string } | null {
  const entries = raw.split(";").map(part => part.trim()).filter(Boolean);
  if (!entries.length) return null;
  const named = new Map<string, string>();
  let shared: string | undefined;
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator > 0) named.set(entry.slice(0, separator).trim().toLowerCase(), entry.slice(separator + 1).trim());
    else if (!shared) shared = entry;
  }
  const http = normalizedProxyUrl(named.get("http") ?? named.get("https") ?? shared);
  const https = normalizedProxyUrl(named.get("https") ?? named.get("http") ?? shared);
  return http && https ? { http, https } : null;
}

function readWindowsRegistryValue(name: "ProxyEnable" | "ProxyServer"): string | null {
  try {
    const output = execFileSync("reg.exe", ["QUERY", windowsInternetSettings, "/v", name], {
      encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
    });
    const match = output.match(name === "ProxyEnable"
      ? /ProxyEnable\s+REG_DWORD\s+(0x[\da-f]+|\d+)/i
      : /ProxyServer\s+REG_(?:SZ|EXPAND_SZ)\s+([^\r\n]+)/i);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function withLocalNoProxy(current: string | undefined): string {
  const entries = (current ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const known = new Set(entries.map(value => value.toLowerCase()));
  for (const value of localNoProxy) if (!known.has(value)) entries.push(value);
  return entries.join(",");
}

/**
 * Configure Node's global fetch before any model request. Explicit environment
 * proxy settings win. Windows system settings only fill an otherwise empty proxy
 * environment, and local Studio origins always bypass the proxy.
 */
export function configureOutboundProxy(
  environment: ProxyEnvironment = process.env,
  platform = process.platform,
  readRegistryValue = readWindowsRegistryValue,
  installDispatcher = () => setGlobalDispatcher(new EnvHttpProxyAgent()),
): OutboundProxySource {
  const explicit = environment.HTTPS_PROXY ?? environment.https_proxy ?? environment.HTTP_PROXY ?? environment.http_proxy;
  let source: OutboundProxySource = explicit ? "environment" : null;
  if (!explicit && platform === "win32") {
    const enabled = readRegistryValue("ProxyEnable");
    if (enabled && Number.parseInt(enabled, 0) === 1) {
      const parsed = parseWindowsProxyServer(readRegistryValue("ProxyServer") ?? "");
      if (parsed) {
        environment.HTTP_PROXY = parsed.http;
        environment.HTTPS_PROXY = parsed.https;
        source = "windows-system";
      }
    }
  }
  if (!source) return null;
  const currentNoProxy = environment.NO_PROXY ?? environment.no_proxy;
  const noProxy = withLocalNoProxy(currentNoProxy);
  environment.NO_PROXY = noProxy;
  environment.no_proxy = noProxy;
  installDispatcher();
  return source;
}
