import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGameSpec } from "../../domain/gameSpec";
import { createProbe } from "../../domain/probe";
import { generateRuntimeFiles } from "../../domain/runtimeGenerator";
import { INITIAL_DRAFT } from "../../domain/storage";
import { GAME_TEMPLATES, MECHANIC_LIBRARY, TEMPLATE_RUNTIME_DEFINITIONS } from "../../domain/templates";
import { DOMAIN_TEMPLATE_ART, FIXTURE_TEMPLATE_TO_DOMAIN, SERVER_TEMPLATE_TO_DOMAIN, THREE_MODE_TO_DOMAIN } from "../../domain/templateResolution";
import { artStyleSchema, gameSpecSchema, gameTemplateSchema, getTemplateCatalog, visualStyleSchema } from "../contracts";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "../game-design-knowledge/catalog";
import { OFFICIAL_GAMES, OFFICIAL_SERVER_TEMPLATE_IDS, officialCoverPath, officialLobbyOrder } from "./index";

const repoRoot = resolve(process.cwd());
const fileExists = (relativePath: string) => existsSync(resolve(repoRoot, relativePath));

/** 大厅顺序锁：改动这里必须是产品负责人确认过的大厅调整。 */
const LOCKED_LOBBY_ORDER = [
  "star-dream-duel",
  "puzzle",
  "mahjong-roguelite",
  "freecell",
  "block-place",
  "merge-2048",
  "region-logic",
  "polyomino-fit",
  "space-shooter",
  "snake",
  "klotski",
  "breakout",
  "tetris",
  "island-kart",
  "meadow-railway",
];

describe("官方游戏登记表守卫", () => {
  it("指定大厅封面是独立插画资源，不与游戏内封面或测试截图混用", () => {
    for (const id of ['puzzle', 'island-kart', 'meadow-railway']) {
      const game = OFFICIAL_GAMES.find(game => game.id === id)!;
      expect(game.lobbyCover).toMatch(/^assets\/library\/covers\/[a-z0-9-]+\.webp$/);
      expect(fileExists(game.lobbyCover!)).toBe(true);
      expect(game.lobbyCover).not.toBe(game.cover);
    }
    const covers = OFFICIAL_GAMES.flatMap(game => game.lobbyCover ? [game.lobbyCover] : []);
    expect(new Set(covers).size).toBe(covers.length);
  });
  it("已删除游戏没有登记、资源目录或可改造模板，旧模板参数被拒绝", () => {
    expect(OFFICIAL_GAMES.map(game => game.id)).not.toContain("maze");
    expect(OFFICIAL_GAMES.map(game => game.id)).not.toContain("bug-climb");
    expect(GAME_TEMPLATES.map(game => game.id)).not.toContain("maze");
    expect(GAME_TEMPLATES.map(game => game.id)).not.toContain("lane-climb");
    expect(gameTemplateSchema.safeParse("maze").success).toBe(false);
    expect(fileExists("fixtures/bug-climb")).toBe(false);
    expect(fileExists("examples/bug-climb")).toBe(false);
    expect(fileExists("assets/templates/packs/maze")).toBe(false);
    expect(OFFICIAL_GAMES.map(game => game.id)).not.toContain("paper-popup");
    expect(GAME_TEMPLATES.map(game => game.id)).not.toContain("popup-rotate-3d");
    expect(gameSpecSchema.shape.threeMode.safeParse("popup").success).toBe(false);
    expect(fileExists("assets/starter/paper-popup")).toBe(false);
    expect(fileExists("src/server/playcanvas-popup-runtime.ts")).toBe(false);
  });
  it("两款仅游玩官方游戏进入大厅，但不进入创作模板或改造映射", async () => {
    const { resolveTemplateForGame } = await import('../../domain/templateResolution');
    const { validateDraft } = await import('../../domain/validation');
    for (const id of ['island-kart','meadow-railway']) {
      const game=OFFICIAL_GAMES.find(game=>game.id===id)!;
      expect(game.stage).toBe('live');expect(game.remixable).toBe(false);
      expect(officialLobbyOrder().some(game=>game.id===id)).toBe(true);
      expect(GAME_TEMPLATES.some(template=>template.id===id)).toBe(false);
      expect(FIXTURE_TEMPLATE_TO_DOMAIN[id]).toBeUndefined();
      expect(resolveTemplateForGame({fixtureKind:id,template:'generated',idea:'收集并建造'})).toBeUndefined();
      expect(validateDraft({...INITIAL_DRAFT,templateId:id,freeRequest:'换成绿色'}).errors.join('')).toContain('仅供游玩');
    }
  });
  it("登记 id 唯一，玩法模板 id 唯一，且都不与补充模板冲突", () => {
    const ids = OFFICIAL_GAMES.map((game) => game.id);
    expect(new Set(ids).size, `登记 id 重复：${ids.join(", ")}`).toBe(ids.length);
    const templateIds = GAME_TEMPLATES.map((template) => template.id);
    expect(new Set(templateIds).size, `玩法模板 id 重复：${templateIds.join(", ")}`).toBe(templateIds.length);
    for (const game of OFFICIAL_GAMES) {
      expect(game.title.trim().length, `${game.id} 缺少大厅标题 title`).toBeGreaterThan(0);
      expect(game.domainTemplate, `${game.id} 缺少 domainTemplate`).toBeDefined();
    }
  });

  it("lobbyRank 从 1 起连续且唯一，并且大厅顺序与锁定序列一致", () => {
    const ranks = officialLobbyOrder().map((game) => game.lobbyRank);
    expect(ranks, "lobbyRank 必须是 1..N 连续且不重复").toEqual(ranks.map((_, index) => index + 1));
    expect(officialLobbyOrder().map((game) => game.id)).toEqual(LOCKED_LOBBY_ORDER);
  });

  it("kind 与字段组合合法", () => {
    for (const game of OFFICIAL_GAMES) {
      if (game.kind === "fixture") {
        expect(game.fixtureKind, `${game.id} 是固定游戏，必须填 fixtureKind`).toBeTruthy();
        expect(game.fixture, `${game.id} 是固定游戏，必须填 fixture（metaKey、buildOutputs）`).toBeDefined();
        expect(game.fixture?.metaKey, `${game.id} 的 fixture.metaKey 不能为空`).toBeTruthy();
        expect(game.fixture?.buildOutputs.length, `${game.id} 的 fixture.buildOutputs 需要六步构建输出`).toBe(6);
        expect(game.threeMode, `${game.id} 是固定游戏，不应填 threeMode`).toBeUndefined();
        expect(game.seed, `${game.id} 是固定游戏，不应填 seed（固定游戏不走 seed 脚本）`).toBeUndefined();
      }
      if (game.kind === "template") {
        expect(game.serverTemplate, `${game.id} 是模板游戏，必须填 serverTemplate`).toBeTruthy();
        expect(game.seed, `${game.id} 是模板游戏，必须填 seed（idea、artStyle、visualStyle）`).toBeDefined();
        expect(game.fixtureKind, `${game.id} 是模板游戏，不应填 fixtureKind`).toBeUndefined();
        expect(game.threeMode, `${game.id} 是模板游戏，不应填 threeMode`).toBeUndefined();
        expect(fileExists(`src/server/game-runtimes/${game.serverTemplate}.ts`), `${game.id} 缺少服务端运行时 src/server/game-runtimes/${game.serverTemplate}.ts`).toBe(true);
      }
      if (game.kind === "three") {
        expect(game.threeMode, `${game.id} 是 3D 游戏，必须填 threeMode`).toBeTruthy();
        expect(game.seed, `${game.id} 是 3D 游戏，必须填 seed（idea、artStyle、visualStyle）`).toBeDefined();
        expect(game.fixtureKind, `${game.id} 是 3D 游戏，不应填 fixtureKind`).toBeUndefined();
      }
      if (game.seed) {
        expect(artStyleSchema.options, `${game.id} 的 seed.artStyle "${game.seed.artStyle}" 不是合法题材方向`).toContain(game.seed.artStyle);
        expect(visualStyleSchema.options, `${game.id} 的 seed.visualStyle "${game.seed.visualStyle}" 不是合法画面风格`).toContain(game.seed.visualStyle);
        expect(game.seed.idea.trim().length, `${game.id} 的 seed.idea 不能为空`).toBeGreaterThan(10);
      }
    }
    const templateIds = OFFICIAL_GAMES.filter((game) => game.kind === "template").map((game) => game.serverTemplate);
    expect(new Set(templateIds).size, `模板游戏的 serverTemplate 重复：${templateIds.join(", ")}`).toBe(templateIds.length);
  });

  it("封面与参照文档文件真实存在", () => {
    for (const game of OFFICIAL_GAMES) {
      expect(game.cover, `${game.id} 的 cover 路径应为 ${officialCoverPath(game)}`).toBe(officialCoverPath(game));
      expect(fileExists(game.cover), `${game.id} 缺少封面文件 ${game.cover}`).toBe(true);
      expect(fileExists(game.referenceDoc), `${game.id} 缺少参照文档 ${game.referenceDoc}`).toBe(true);
      if (game.kind === "fixture") {
        expect(fileExists(`fixtures/${game.fixtureKind}/index.html`), `${game.id} 缺少固定游戏入口 fixtures/${game.fixtureKind}/index.html`).toBe(true);
      }
    }
  });

  it("每款游戏都有可用的验收探针、稳定知识引用与R2运行时", () => {
    const knowledgePatternIds = new Set(GAME_DESIGN_KNOWLEDGE_LIBRARY.patterns.map(({ id }) => id));
    const knowledgeMechanicIds = new Set(GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics.map(({ id }) => id));
    for (const game of OFFICIAL_GAMES) {
      const templateId = game.domainTemplate.id;
      const spec = buildGameSpec({ ...INITIAL_DRAFT, creationMode: "template-remix", templateId, selectedSuggestionIds: [`${templateId}-world`] });
      expect(() => createProbe(spec), `${game.id}（${templateId}）的探针无法创建：probeKind=${game.probeKind ?? "golden"}`).not.toThrow();
      expect(TEMPLATE_RUNTIME_DEFINITIONS[templateId], `${game.id} 缺少运行时定义`).toBeDefined();
      expect(game.runtimeDefinition.actions.length, `${game.id} 的运行时定义需要三步动作`).toBe(3);
      expect(game.runtimeDefinition.feedback.length, `${game.id} 的运行时定义需要三条反馈`).toBe(3);
      expect(generateRuntimeFiles(spec)["app.js"].length, `${game.id} 生成的运行时为空`).toBeGreaterThan(0);
      expect(knowledgePatternIds.has(game.knowledge.patternId), `${game.id} 的知识玩法 ${game.knowledge.patternId} 不存在`).toBe(true);
      expect(game.knowledge.mechanicIds.length, `${game.id} 至少引用一个知识库机制`).toBeGreaterThan(0);
      expect(game.knowledge.mechanicIds.every((id) => knowledgeMechanicIds.has(id)), `${game.id} 存在悬空知识机制`).toBe(true);
      expect(game.knowledge.rationale.trim().length, `${game.id} 缺少知识采用理由`).toBeGreaterThan(0);
      expect(game.knowledge.mechanicIds.every((id) => MECHANIC_LIBRARY.some((mechanic) => mechanic.id === id)), `${game.id} 的知识机制没有进入高级创作器`).toBe(true);
      expect(game.domainTemplate.suggestions.map((item) => item.id)).toEqual(
        ["world", "visual", "content", "mechanic"].map((category) => `${templateId}-${category}`),
      );
    }
  });

  it("新增官方游戏脚手架只生成稳定知识引用，不再创建旧机制字段", () => {
    const scaffold = readFileSync(resolve(repoRoot, "scripts/new-official-game.mjs"), "utf8");
    expect(scaffold).toContain('knowledge: { patternId: "sliding-merge-puzzle", mechanicIds: ["grid-slide-merge"]');
    expect(scaffold).not.toContain('\n  mechanicId: "grid-merge"');
    expect(scaffold).not.toContain("legacyMechanicId");
  });

  it("服务端模板枚举、模板目录标题与三张映射表都由登记表派生", () => {
    expect([...gameTemplateSchema.options]).toEqual([...OFFICIAL_SERVER_TEMPLATE_IDS, "generated"]);
    for (const game of OFFICIAL_GAMES) {
      if ((game.stage ?? "live") !== "live" || game.remixable === false) continue; // 开发中与仅游玩登记不进改造映射
      if (game.serverTemplate) {
        expect(SERVER_TEMPLATE_TO_DOMAIN[game.serverTemplate]).toBe(game.domainTemplate.id);
        expect(DOMAIN_TEMPLATE_ART[game.domainTemplate.id]).toBe(game.serverTemplate);
      }
      if (game.kind === "fixture") expect(FIXTURE_TEMPLATE_TO_DOMAIN[game.fixtureKind as string]).toBe(game.domainTemplate.id);
      if (game.kind === "three") expect(THREE_MODE_TO_DOMAIN[game.threeMode as string]).toBe(game.domainTemplate.id);
      if (game.kind === "template") {
        const catalogEntry = getTemplateCatalog().find((entry) => entry.id === game.serverTemplate);
        expect(catalogEntry?.name, `${game.id} 的登记标题与 contracts.ts templateDefaults 标题不一致`).toBe(game.title);
      }
    }
  });


  it("development 阶段的登记不进大厅、不做改造模板、不映射，但探针仍可创建", async () => {
    const { GAME_TEMPLATES: creationTemplates, getGameplayBundle } = await import("../../domain/templates");
    const { THREE_MODE_TO_DOMAIN, resolveTemplateForGame } = await import("../../domain/templateResolution");
    const developing = OFFICIAL_GAMES.filter((game) => (game.stage ?? "live") === "development");
    expect(OFFICIAL_GAMES.map(game => game.id)).not.toContain("paper-popup");
    for (const game of developing) {
      expect(officialLobbyOrder().some((item) => item.id === game.id), `${game.id} 不应出现在大厅顺序里`).toBe(false);
      expect(creationTemplates.some((template) => template.id === game.domainTemplate.id), `${game.id} 不应出现在创作页模板里`).toBe(false);
      expect(getGameplayBundle(game.domainTemplate.id), `${game.id} 的探针与运行时捆绑仍应保留`).toBeDefined();
      if (game.threeMode) {
        expect(THREE_MODE_TO_DOMAIN[game.threeMode]).toBeUndefined();
        expect(resolveTemplateForGame({ template: "generated", idea: "", threeMode: game.threeMode })).toBeUndefined();
      }
    }
  });
});
