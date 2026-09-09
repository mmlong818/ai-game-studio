import { beforeEach, expect, it, vi } from "vitest";
import { createDesignProfile } from "../shared/contracts";
import { generateDesignPreview } from "../web/api";
import { clearDesignPreviewCache, getDesignPreview } from "./designPreviewCache";
vi.mock("../web/api", () => ({ generateDesignPreview: vi.fn() }));
beforeEach(() => { clearDesignPreviewCache(); vi.resetAllMocks(); });
it("刷新清空内存后仍复用已完成的真实方案，不再次调用模型", async () => {
  const profile = createDesignProfile("puzzle", "standard");
  vi.mocked(generateDesignPreview).mockResolvedValue(profile);
  const input = { idea: "花园里翻牌找到全部相同的花朵即可获胜" };
  await expect(getDesignPreview(input)).resolves.toEqual(profile);
  clearDesignPreviewCache(false);
  await expect(getDesignPreview(input)).resolves.toEqual(profile);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
  await getDesignPreview(input, true);
  expect(generateDesignPreview).toHaveBeenCalledTimes(2);
});

it("生成未完成时多次重新生成仍共享同一次请求，完成后才允许新一轮", async () => {
  let resolve!: (value: ReturnType<typeof createDesignProfile>) => void;
  const pending = new Promise<ReturnType<typeof createDesignProfile>>(done => { resolve = done; });
  vi.mocked(generateDesignPreview).mockReturnValue(pending);
  const input = { idea: "在海边收集贝壳，规划有限的篮子容量" };
  const first = getDesignPreview(input);
  expect(getDesignPreview(input, true)).toBe(first);
  expect(getDesignPreview(input, true)).toBe(first);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
  resolve(createDesignProfile("puzzle", "standard"));
  await first;
  await getDesignPreview(input, true);
  expect(generateDesignPreview).toHaveBeenCalledTimes(2);
});

it("缓存容量不能驱逐仍在运行的请求，否则返回时会重复调用", () => {
  vi.mocked(generateDesignPreview).mockReturnValue(new Promise(() => {}));
  const input = { idea: "第一份尚未完成的创意" };
  const first = getDesignPreview(input);
  for (let index = 0; index < 13; index++) getDesignPreview({ idea: `另外的创意 ${index}` });
  expect(getDesignPreview(input, true)).toBe(first);
  expect(generateDesignPreview).toHaveBeenCalledTimes(14);
});

it("返回页面复用同一请求、同一开始时间和最新阶段", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-09T08:00:00.000Z"));
  let report!: (phase: "submitted" | "receiving" | "checking") => void;
  vi.mocked(generateDesignPreview).mockImplementation((_input, _signal, _delta, _reset, onStatus) => {
    report = onStatus!;
    return new Promise(() => {});
  });
  const input = { idea: "在雨林遗迹寻找符文" };
  const first: Array<[string, string]> = [];
  const pending = getDesignPreview(input, false, undefined, (phase, startedAt) => first.push([phase, startedAt]));
  report("receiving");
  vi.setSystemTime(new Date("2026-09-09T08:00:07.000Z"));
  const returned: Array<[string, string]> = [];
  expect(getDesignPreview(input, false, undefined, (phase, startedAt) => returned.push([phase, startedAt]))).toBe(pending);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
  expect(returned).toEqual([["receiving", "2026-09-09T08:00:00.000Z"]]);
  vi.useRealTimers();
});
