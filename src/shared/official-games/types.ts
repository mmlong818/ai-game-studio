/**
 * 官方游戏登记表的类型定义。
 *
 * 这里是 src/shared：只允许纯类型与纯数据，不能引用 src/domain 或 src/server。
 * 创作侧（GAME_TEMPLATES、GOLDEN_SCENARIOS、运行时定义、机制映射）、
 * 服务端（gameTemplateSchema 枚举、officialFixtures、大厅同步）和脚本（seed 清单）
 * 都从 OFFICIAL_GAMES 派生，不再各自手写一份。
 */

/** 官方游戏的三种落地方式。 */
export type OfficialGameKind =
  /** 固定游戏：fixtures/<fixtureKind>/ 自包含静态产物，服务启动时直接注册并发布。 */
  | "fixture"
  /** 模板游戏：src/server/game-runtimes/<serverTemplate>.ts 运行时 + assets/templates/packs/<serverTemplate>/ 美术包。 */
  | "template"
  /** 3D 游戏：走 three 运行时，由 threeMode 决定场景类型。 */
  | "three";

export type OfficialThreeMode = "collector" | "arena" | "popup";

export type OfficialSuggestionCategory = "world" | "visual" | "content" | "mechanic";
export type OfficialSuggestionLevel = "R0" | "R1" | "R2";

/** 与 src/domain/types.ts 的 TemplateSuggestion 结构一致（shared 不能反向依赖 domain）。 */
export interface OfficialTemplateSuggestion {
  id: string;
  category: OfficialSuggestionCategory;
  title: string;
  description: string;
  keeps: string;
  newAssets: string;
  level: OfficialSuggestionLevel;
  risk: "低" | "中";
}

/** 与 src/domain/types.ts 的 GameTemplate 结构一致：创作页“改一个现有游戏”使用的玩法模板。 */
export interface OfficialDomainTemplate {
  id: string;
  name: string;
  genre: string;
  pitch: string;
  coreLoop: string;
  coreRules: string[];
  capabilities: string[];
  suggestions: OfficialTemplateSuggestion[];
  redirectExamples: string[];
}

/** 与 src/domain/probe.ts 的 GoldenScenarioDefinition 结构一致：确定性验收场景。 */
export interface OfficialProbeScenario {
  actions: Record<string, string[]>;
  rejectedActions?: string[];
  completingActions?: string[];
}

/**
 * 探针种类。"golden" 用登记的 probeScenario 驱动通用 GoldenTemplateProbe；
 * 其余值指向 src/domain/probe.ts 里的专属探针类。
 */
export type OfficialProbeKind = "golden" | "merge-grid" | "tile-roguelite" | "collect-escape-3d" | "paper-popup";

/** 与 src/domain/runtimeGenerator.ts 的模板运行时定义一致。 */
export interface OfficialRuntimeDefinition {
  actions: string[];
  feedback: string[];
  className: string;
}

/** 一套玩法模板的完整捆绑：模板定义 + 验收探针 + 运行时定义 + R2 研究机制。 */
export interface GameplayTemplateBundle {
  domainTemplate: OfficialDomainTemplate;
  /** 缺省为 "golden"。 */
  probeKind?: OfficialProbeKind;
  probeScenario: OfficialProbeScenario;
  runtimeDefinition: OfficialRuntimeDefinition;
  /** 模板改造触发 R2 时用来做同类机制研究的内部机制 id（见 MECHANIC_LIBRARY）。 */
  mechanicId: string;
  /** 若这套玩法模板就是某种 3D 模式的落点，写上 threeMode；3D 项目按它映射到玩法模板。 */
  threeMode?: OfficialThreeMode;
}

/** 模板游戏的示范项目参数，供 scripts/seed-showcase-games.ts 通过 API 创建并发布。标题取登记的 title。 */
export interface OfficialGameSeed {
  idea: string;
  artStyle: string;
  visualStyle: string;
}

/** 固定游戏注册时写入构建记录的元信息。 */
export interface OfficialFixtureMeta {
  /** studio_meta 中的初始化标记键，保证只注册一次。 */
  metaKey: string;
  /** 注册时写入的六步构建输出说明。 */
  buildOutputs: string[];
}

export interface OfficialGameDefinition<
  Id extends string = string,
  ServerTemplate extends string | undefined = string | undefined,
> extends GameplayTemplateBundle {
  /** 登记 id，同时也是脚手架生成的文件名与固定游戏目录名。 */
  id: Id;
  /** 大厅显示的中文名。 */
  title: string;
  kind: OfficialGameKind;
  /**
   * 服务端 GameTemplate 枚举值。模板型必填；固定型可选（表示该固定游戏的 spec 落到哪个服务端模板，
   * 例如星梦对决落到 "signal-hunt"）。gameTemplateSchema 枚举由全部 serverTemplate 派生。
   */
  serverTemplate?: ServerTemplate;
  /** 固定型必填：fixtures/<fixtureKind>/ 目录名与 projects.fixture_kind。 */
  fixtureKind?: string;
  /** 3D 型必填。 */
  threeMode?: OfficialThreeMode;
  /** 大厅顺序，1 起连续且唯一。 */
  lobbyRank: number;
  /** 封面文件的仓库相对路径。固定型：fixtures/<kind>/assets/cover.png；模板型：assets/templates/packs/<template>/cover.png。 */
  cover: string;
  /** 参照文档（docs/NN-<id>-best-template-reference.md 等）。 */
  referenceDoc: string;
  /** 模板型必填。 */
  seed?: OfficialGameSeed;
  /** 固定型必填。 */
  fixture?: OfficialFixtureMeta;
}

/** 保留 id 与 serverTemplate 的字面量类型，让 gameTemplateSchema 枚举能从登记表派生出精确的联合类型。 */
export const defineOfficialGame = <
  const Id extends string,
  const ServerTemplate extends string | undefined = undefined,
>(definition: OfficialGameDefinition<Id, ServerTemplate>): OfficialGameDefinition<Id, ServerTemplate> => definition;

/** 从登记表元组中按顺序抽出所有 serverTemplate 字面量。 */
export type ServerTemplatesOf<T extends readonly OfficialGameDefinition[]> =
  T extends readonly [infer Head extends OfficialGameDefinition, ...infer Rest extends readonly OfficialGameDefinition[]]
    ? [Exclude<Head["serverTemplate"], undefined>] extends [never]
      ? ServerTemplatesOf<Rest>
      : [Exclude<Head["serverTemplate"], undefined>, ...ServerTemplatesOf<Rest>]
    : [];

/** 按 kind 推出封面的默认路径；登记文件里的 cover 字段应与它一致。 */
export const officialCoverPath = (game: Pick<OfficialGameDefinition, "kind" | "fixtureKind" | "serverTemplate" | "id">): string => {
  if (game.kind === "fixture") return `fixtures/${game.fixtureKind ?? game.id}/assets/cover.png`;
  if (game.kind === "template") return `assets/templates/packs/${game.serverTemplate ?? game.id}/cover.png`;
  return `assets/starter/${game.id}/cover.png`;
};
