import assert from "node:assert/strict";
import test from "node:test";
import { configureOutboundProxy, parseWindowsProxyServer } from "../src/server/outbound-proxy";

test("Windows system proxy parser supports shared and protocol-specific forms without a fixed port", () => {
  assert.deepEqual(parseWindowsProxyServer("127.0.0.1:7897"), {
    http: "http://127.0.0.1:7897/", https: "http://127.0.0.1:7897/",
  });
  assert.deepEqual(parseWindowsProxyServer("http=proxy.local:8080;https=secure.local:8443"), {
    http: "http://proxy.local:8080/", https: "http://secure.local:8443/",
  });
  assert.equal(parseWindowsProxyServer("broken proxy value"), null);
});

test("explicit proxy wins and preserves NO_PROXY while adding local Studio origins", () => {
  const environment: Record<string, string | undefined> = { HTTPS_PROXY: "http://explicit.local:9000", NO_PROXY: "example.test" };
  let registryReads = 0;
  let installs = 0;
  const source = configureOutboundProxy(environment, "win32", () => { registryReads += 1; return ""; }, () => { installs += 1; });
  assert.equal(source, "environment");
  assert.equal(registryReads, 0);
  assert.equal(environment.HTTPS_PROXY, "http://explicit.local:9000");
  assert.deepEqual(new Set(environment.NO_PROXY?.split(",")), new Set(["example.test", "127.0.0.1", "localhost", "::1"]));
  assert.equal(environment.no_proxy, environment.NO_PROXY);
  assert.equal(installs, 1);
});

test("Windows proxy only fills an empty environment when ProxyEnable is active", () => {
  const disabled: Record<string, string | undefined> = {};
  assert.equal(configureOutboundProxy(disabled, "win32", name => name === "ProxyEnable" ? "0x0" : "127.0.0.1:7000", () => assert.fail()), null);
  assert.equal(disabled.HTTPS_PROXY, undefined);

  const enabled: Record<string, string | undefined> = {};
  let installs = 0;
  assert.equal(configureOutboundProxy(enabled, "win32", name => name === "ProxyEnable" ? "0x1" : "127.0.0.1:7000", () => { installs += 1; }), "windows-system");
  assert.equal(enabled.HTTP_PROXY, "http://127.0.0.1:7000/");
  assert.equal(enabled.HTTPS_PROXY, "http://127.0.0.1:7000/");
  assert.equal(installs, 1);

  const nonWindows: Record<string, string | undefined> = {};
  assert.equal(configureOutboundProxy(nonWindows, "linux", () => assert.fail(), () => assert.fail()), null);
});
