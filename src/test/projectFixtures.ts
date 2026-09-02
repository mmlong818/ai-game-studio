import { bindAsset, createGeneratedAsset } from "../domain/assets";
import type { StudioProject } from "../domain/platformTypes";

export async function withGeneratedAssets(project: StudioProject): Promise<StudioProject> {
  let assets = project.assets;
  let bindings = project.assetBindings;
  let scene = project.scene;
  for (const node of project.scene.filter((item) => item.id !== "SCENE-ROOT")) {
    const asset = await createGeneratedAsset(
      {
        role: node.role,
        label: `${node.label}测试位图`,
        prompt: `用于自动测试的${node.label} AI 位图，清晰轮廓，无文字，无水印`,
        model: "gpt-image-2",
        provider: "openai",
        mimeType: "image/png",
        width: 512,
        height: 512,
        localPath: `assets/${node.role}.png`,
        generatedAt: "2026-09-01T00:00:00.000Z",
      },
      assets,
    );
    const result = bindAsset([...assets, asset], bindings, scene, asset.id, node.id);
    assets = result.assets;
    bindings = result.bindings;
    scene = result.scene;
  }
  return { ...project, assets, assetBindings: bindings, scene };
}
