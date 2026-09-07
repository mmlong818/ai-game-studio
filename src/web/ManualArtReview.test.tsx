import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ManualArtReview } from "./ManualArtReview";
afterEach(cleanup);
function setup(onRecord = vi.fn().mockResolvedValue(undefined)) {
  render(<ManualArtReview versionId="v1" busy={false} onRecord={onRecord} />);
  fireEvent.click(screen.getByText("记录人工美术审核"));
  return onRecord;
}
it("不能一键通过，必须主动选择结论和填写依据", async () => {
  const record = setup();
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByLabelText("实际检查依据")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("审核结论"), { target: { value: "failed" } });
  fireEvent.change(screen.getByLabelText("实际检查依据"), { target: { value: "手机首关结算文字遮挡按钮，需要重新排版。" } });
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(record).toHaveBeenCalledWith("v1", "failed", "手机首关结算文字遮挡按钮，需要重新排版。"));
});
it("失败时保留依据并提示，不写默认通过记录", async () => {
  const record = setup(vi.fn().mockRejectedValue(new Error("offline")));
  fireEvent.change(screen.getByLabelText("审核结论"), { target: { value: "passed" } });
  fireEvent.change(screen.getByLabelText("实际检查依据"), { target: { value: "已检查桌面与手机首关画面，主体清楚且资源一致。" } });
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("实际检查依据")).not.toHaveValue("");
  expect(record).toHaveBeenCalledTimes(1);
});
