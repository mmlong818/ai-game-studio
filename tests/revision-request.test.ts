import assert from "node:assert/strict";
import test from "node:test";
import { effectiveRevisionRequestFor, MINIMUM_REVISION_IDEA_LENGTH, selectedRevisionRequest } from "../src/server/build-orchestrator";

const plan = (operations: Array<{ scope: "gameplay" | "visual-style"; content: string }>, content: string) => ({ sourceProjectId: "p", sourceVersionId: "v", content, operations });

test("计划拆出的操作太短时退回用户完整原话，够长时沿用选中操作", () => {
  const short = plan([{ scope: "gameplay", content: "关卡需要扩展为100关" }], "看起来可以了，关卡需要扩展为100关；另外需要允许整体旋转方便观察");
  assert.ok(selectedRevisionRequest(short).length < MINIMUM_REVISION_IDEA_LENGTH);
  assert.equal(effectiveRevisionRequestFor(short), short.content);
  const long = plan([{ scope: "gameplay", content: "关卡从 8 关扩展为 100 关，方块数逐关递增" }], "随便写的完整原话，不应被采用");
  assert.equal(effectiveRevisionRequestFor(long), "关卡从 8 关扩展为 100 关，方块数逐关递增");
});

test("为操作单独撰写的内容原样保留，只有沿用整段原话的操作才做关键词筛句", () => {
  const content = "看起来可以了，关卡需要扩展为100关；另外需要允许整体旋转方便观察";
  const authored = plan([{ scope: "gameplay", content: "允许整体旋转方便观察：恢复拖动旋转并提供回正按钮，箭头贴面规则不变。" }], content);
  assert.equal(selectedRevisionRequest(authored), "允许整体旋转方便观察：恢复拖动旋转并提供回正按钮，箭头贴面规则不变。");
  const echoed = plan([{ scope: "gameplay", content }], content);
  assert.equal(selectedRevisionRequest(echoed), "关卡需要扩展为100关");
});