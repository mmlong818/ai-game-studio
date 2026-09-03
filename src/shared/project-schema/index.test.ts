import { describe, expect, it } from "vitest";
import { PLATFORM_RELEASE, PROJECT_FORMAT_VERSION } from "../platform-version";
import { buildProjectReferenceIndex, parseGameProjectV3, validateGameProjectV3 } from ".";

const validProject = {
  metadata: {
    id: "PROJECT-DEMO",
    title: "露珠冲刺",
    platformRelease: PLATFORM_RELEASE,
    projectFormat: PROJECT_FORMAT_VERSION,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  },
  startSceneId: "SCENE-GAME",
  scenes: [{
    id: "SCENE-GAME",
    name: "游戏场景",
    instances: [{
      id: "INSTANCE-PLAYER",
      objectId: "OBJECT-PLAYER",
      parentInstanceId: null,
      position: { x: 180, y: 560 },
      size: { width: 72, height: 96 },
      anchor: { x: 0.5, y: 0.5 },
      layer: 10,
      visible: true,
      overrides: {},
    }],
  }],
  objects: [{
    id: "OBJECT-PLAYER",
    name: "玩家昆虫",
    role: "player",
    renderer: "canvas-2d",
    resourceIds: ["RESOURCE-PLAYER"],
    behaviors: [{ id: "BEHAVIOR-MOVE", moduleId: "movement-2d", moduleVersion: "1.1.0", enabled: true, parameters: { speed: 420 } }],
  }],
  rules: [{
    id: "RULE-MOVE",
    name: "玩家输入驱动移动",
    sceneId: "SCENE-GAME",
    enabled: true,
    priority: "P0",
    when: [{ type: "input.direction", parameters: {}, references: [{ kind: "object", id: "OBJECT-PLAYER" }] }],
    then: [{ type: "movement.apply", parameters: {}, references: [{ kind: "behavior", id: "BEHAVIOR-MOVE" }] }],
  }],
  variables: [{ id: "VARIABLE-SCORE", scope: "global", ownerId: null, initialValue: 0, persistent: true }],
  resources: [{ id: "RESOURCE-PLAYER", role: "player", path: "assets/player.png", mimeType: "image/png", contentHash: "12345678", provenance: "ai-generated", license: "project-owned" }],
  controls: { keyboard: true, pointer: false, touch: true, gamepad: false },
  presentation: { aspectRatio: "9:16", targetFps: 60, responsive: true },
  acceptance: [{ id: "ASSERT-MOVE", label: "玩家可以移动", kind: "rule", ruleIds: ["RULE-MOVE"], behaviorIds: ["BEHAVIOR-MOVE"] }],
} as const;

describe("GameProjectV3（平台 1.1）", () => {
  it("解析有效工程并建立反向引用索引", () => {
    const project = parseGameProjectV3(validProject);
    const references = buildProjectReferenceIndex(project);

    expect(project.metadata.platformRelease).toBe("1.1");
    expect(references.get("resource:RESOURCE-PLAYER")).toEqual(["objects.0.resourceIds.0"]);
    expect(references.get("behavior:BEHAVIOR-MOVE")).toEqual([
      "rules.0.then.0.references.0",
      "acceptance.0.behaviorIds.0",
    ]);
  });

  it("拒绝旧版或未标明 1.1 的工程", () => {
    const result = validateGameProjectV3({
      ...validProject,
      metadata: { ...validProject.metadata, platformRelease: "1.0" },
    });

    expect(result.success).toBe(false);
  });

  it("在构建前拒绝悬空对象、资源和规则引用", () => {
    const result = validateGameProjectV3({
      ...validProject,
      scenes: [{ ...validProject.scenes[0], instances: [{ ...validProject.scenes[0].instances[0], objectId: "OBJECT-MISSING" }] }],
      objects: [{ ...validProject.objects[0], resourceIds: ["RESOURCE-MISSING"] }],
      acceptance: [{ ...validProject.acceptance[0], ruleIds: ["RULE-MISSING"] }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(({ message }) => message);
      expect(messages).toContain("对象不存在：OBJECT-MISSING");
      expect(messages).toContain("资源不存在：RESOURCE-MISSING");
      expect(messages).toContain("验收规则不存在：RULE-MISSING");
    }
  });

  it("拒绝外部资源路径和循环实例层级", () => {
    const result = validateGameProjectV3({
      ...validProject,
      scenes: [{
        ...validProject.scenes[0],
        instances: [
          { ...validProject.scenes[0].instances[0], parentInstanceId: "INSTANCE-CHILD" },
          { ...validProject.scenes[0].instances[0], id: "INSTANCE-CHILD", parentInstanceId: "INSTANCE-PLAYER" },
        ],
      }],
      resources: [{ ...validProject.resources[0], path: "https://example.com/player.png" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(({ message }) => message === "资源路径必须是工程内的安全相对路径")).toBe(true);
      expect(result.error.issues.some(({ message }) => message.startsWith("实例父级形成循环"))).toBe(true);
    }
  });
});
