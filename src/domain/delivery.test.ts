import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildOpenSourceBundle, validateDeliveryText } from "./delivery";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { createBuild } from "./quality";
import { createProject } from "./project";
import { INITIAL_DRAFT } from "./storage";
import { withGeneratedAssets } from "../test/projectFixtures";

describe("portable delivery", () => {
  it("生成包含启动、重开和静音控件的独立运行时", () => {
    const project = createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
    const files = generateRuntimeFiles(project.spec);

    expect(files["index.html"]).toContain('id="start"');
    expect(files["index.html"]).toContain('id="restart"');
    expect(files["index.html"]).toContain('id="mute"');
    expect(files["styles.css"]).toContain("prefers-reduced-motion");
    expect(files["app.js"]).toContain("ArrowLeft");
  });

  it("导出同一健康构建及全部质量文件", async () => {
    let project = await withGeneratedAssets(createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] }));
    const result = await createBuild(project, generateRuntimeFiles(project.spec)["app.js"]);
    project = { ...project, builds: [result.build], assertions: result.assertions, evidence: result.evidence, activeBuildId: result.build.id };
    const assetBytes = Object.fromEntries(result.build.assetPaths.map((path) => [path, new Uint8Array([137, 80, 78, 71])]));
    const bundle = buildOpenSourceBundle(project, result.build, assetBytes);
    const files = unzipSync(bundle.bytes);

    expect(Object.keys(files)).toContain("index.html");
    expect(Object.keys(files)).toContain("_studio/GAME_SPEC.json");
    expect(Object.keys(files)).toContain("_studio/ASSET_PROVENANCE.json");
    expect(strFromU8(files["game-manifest.json"])).toContain(result.build.id);
  });

  it("阻止密钥、本机路径、远程游戏图片和 SVG 进入交付包", () => {
    const errors = validateDeliveryText({
      "assets/icon.svg": "<svg></svg>",
      "app.js": "const key='sk-abcdefghijklmnopqrstuvwxyz'; const p='C:\\\\Users\\\\person\\\\file';",
      "styles.css": "background:url(https://example.com/art.png)",
    });

    expect(errors).toHaveLength(3);
  });
});
