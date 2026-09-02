import { describe, expect, it } from "vitest";
import { bindAsset, createGeneratedAsset, validateAssetManifest } from "./assets";
import { createBuild, evidenceMatchesBuild } from "./quality";
import { createProject } from "./project";
import { updateSceneNode } from "./scene";
import { INITIAL_DRAFT } from "./storage";

describe("project foundation", () => {
  it("把 AI 位图版本事务式绑定到场景对象", async () => {
    const project = createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-visual"],
    });
    const asset = await createGeneratedAsset({
      role: "player",
      label: "Q 版主角",
      prompt: "圆润、清晰轮廓的 Q 版主角，透明背景",
      model: "configured-image-model",
      provider: "configured-provider",
      mimeType: "image/png",
      width: 512,
      height: 512,
      localPath: "assets/player-v1.png",
    });
    const bound = bindAsset([asset], [], project.scene, asset.id, "NODE-PLAYER");

    expect(bound.assets[0].status).toBe("active");
    expect(bound.scene.find((node) => node.id === "NODE-PLAYER")?.assetId).toBe(asset.id);
    const manifestErrors = validateAssetManifest(bound.assets, bound.bindings, bound.scene);
    expect(manifestErrors.some((item) => item.includes(bound.bindings[0].id) || item.includes("Q 版主角"))).toBe(false);
    expect(manifestErrors).toContain("背景层 尚未绑定 AI 位图");
  });

  it("允许安全场景属性修改但阻止绕过规则的碰撞修改", () => {
    const project = createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
    });
    const updated = updateSceneNode(project.scene, "NODE-PLAYER", {
      position: { x: 40, y: 70 },
      animationSpeed: 1.25,
    });

    expect(updated.find((node) => node.id === "NODE-PLAYER")?.position).toEqual({ x: 40, y: 70 });
    expect(() =>
      updateSceneNode(project.scene, "NODE-PLAYER", { colliderWidth: 2 }),
    ).toThrow(/规则合同锁定/);
  });

  it("构建证据与规格、代码、资源哈希绑定", async () => {
    const project = createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
    });
    const first = await createBuild(project, "export const version = 1");
    const second = await createBuild(project, "export const version = 2");

    expect(first.build.codeHash).not.toBe(second.build.codeHash);
    expect(first.evidence.every((item) => evidenceMatchesBuild(item, first.build))).toBe(true);
    expect(first.evidence.some((item) => evidenceMatchesBuild(item, second.build))).toBe(false);
  });

  it("拒绝 SVG、远程路径和本机路径进入 AI 资源记录", async () => {
    await expect(
      createGeneratedAsset({
        role: "background",
        label: "错误背景",
        prompt: "背景",
        model: "configured-image-model",
        provider: "configured-provider",
        mimeType: "image/png",
        width: 100,
        height: 100,
        localPath: "https://example.com/background.png",
      }),
    ).rejects.toThrow(/assets/);
  });
});
