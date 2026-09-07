import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArtReviewHistory } from "./ArtReviewHistory";
import { getArtReviewHistory } from "./api";
vi.mock("./api", () => ({ getArtReviewHistory: vi.fn() }));
beforeEach(() => vi.mocked(getArtReviewHistory).mockReset());
afterEach(cleanup);
function open() {
  const summary = screen.getByText("查看此版本审核历史");
  const details = summary.closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
}
it("默认不请求，空记录不代表审核通过", async () => {
  vi.mocked(getArtReviewHistory).mockResolvedValue([]);
  render(<ArtReviewHistory projectId="p1" versionId="v1" revision={null} />);
  expect(getArtReviewHistory).not.toHaveBeenCalled();
  open();
  expect(await screen.findByText(/尚无可追溯的审核历史/)).toBeVisible();
});
it("读取失败不是空记录，重新读取只有查询", async () => {
  vi.mocked(getArtReviewHistory).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
  render(<ArtReviewHistory projectId="p1" versionId="v1" revision={null} />);
  open();
  await screen.findByRole("alert");
  expect(screen.queryByText(/尚无可追溯的审核历史/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
  await screen.findByText(/尚无可追溯的审核历史/);
  expect(getArtReviewHistory).toHaveBeenCalledTimes(2);
});
it("依据以文本呈现，状态与来源分开说明，复核后重新读取", async () => {
  vi.mocked(getArtReviewHistory).mockResolvedValue([{ id: "r1", projectId: "p1", versionId: "v1", sequence: 1, previousStatus: "pending", status: "failed", summary: "<script>并非可执行脚本</script>", reviewedAt: "2026-09-07T00:00:00.000Z", source: "manual-unverified" }]);
  const { rerender } = render(<ArtReviewHistory projectId="p1" versionId="v1" revision={null} />);
  open();
  await screen.findByText("第 1 次记录 · 待审核 → 未通过");
  expect(screen.getByText(/历史人工记录 · 身份未验证/)).toBeVisible();
  expect(document.querySelector("script")).toBeNull();
  rerender(<ArtReviewHistory projectId="p1" versionId="v1" revision="2026-09-07T01:00:00.000Z" />);
  await waitFor(() => expect(getArtReviewHistory).toHaveBeenCalledTimes(2));
});
