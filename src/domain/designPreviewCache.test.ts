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
