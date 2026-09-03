import { gameSpecSchema, generateGameSpec, type GameSpec, type ProjectInput } from "../shared/contracts.js";
import { officialFixtureGames, type OfficialGameDefinition } from "../shared/official-games/index.js";

/**
 * 固定游戏（fixtures/<kind>）在数据库里的玩法合同。
 * 登记表（src/shared/official-games/<id>.ts）负责 kind、metaKey、buildOutputs 与大厅位置；
 * 这里只保留每款固定游戏服务端专有的 ProjectInput 与验收合同构造。
 * 新增固定游戏时在 fixtureSpecBuilders 加一项，守卫测试会确认登记表里的每个 fixture 都有对应构造。
 */
interface FixtureSpecBuilder {
  input: ProjectInput;
  spec: () => GameSpec;
}

const goldenInput: ProjectInput = {
  title: "星梦对决",
  dimensions: "2d",
  idea: "玩家与 AI 共用一个棋盘轮流三消。玩家只能操作下半区，AI 只能操作上半区，所有连消归当前行动者，任一方积分归零时结束。",
};

function acceptedGoldenSpec() {
  const spec = generateGameSpec(goldenInput);
  return gameSpecSchema.parse({
    ...spec,
    acceptanceCriteria: [
      ...spec.acceptanceCriteria,
      { id: "AC-ZONE", priority: "P0", statement: "玩家与 AI 的分区操作权限始终有效", probeType: "state", status: "passed" },
      { id: "AC-CASCADE", priority: "P0", statement: "整段连消伤害归当前行动触发者", probeType: "state", status: "passed" },
    ].map((criterion) => ({ ...criterion, status: "passed" })),
  });
}

const freecellInput: ProjectInput = {
  title: "空档接龙",
  dimensions: "2d",
  idea: "经典空档接龙纸牌：52 张牌摆成 8 列，4 个空档与 4 个按花色从 A 到 K 的收牌堆；只能一张一张移动，但可以借空档和空列做超级移动。100 个经典 Microsoft 牌局全部已知可解，支持撤销、重开、点击与拖拽，并允许用自己的图片更换牌背。",
};

function acceptedFreecellSpec() {
  const spec = generateGameSpec(freecellInput);
  return gameSpecSchema.parse({
    ...spec,
    inputModes: ["pointer", "drag", "keyboard"],
    acceptanceCriteria: [
      ...spec.acceptanceCriteria,
      { id: "AC-DEAL", priority: "P0", statement: "第 1–100 关使用 Microsoft FreeCell 发牌算法且全部可解", probeType: "state", status: "passed" },
      { id: "AC-SUPERMOVE", priority: "P0", statement: "有序牌组一次最多移动 (空档数+1)×2^(空列数) 张", probeType: "state", status: "passed" },
      { id: "AC-CARDBACK", priority: "P1", statement: "自定义牌背只保存在浏览器本地并在刷新后生效", probeType: "state", status: "passed" },
    ].map((criterion) => ({ ...criterion, status: "passed" })),
  });
}

const bugClimbInput: ProjectInput = {
  title: "虫虫攀枝",
  dimensions: "2d",
  idea: "Q版小瓢虫在巨大树干的三条树纹之间高速攀爬，躲避树瘤、蘑菇和树脂，收集露珠与金色种子并冲向树冠。",
};

function acceptedBugClimbSpec() {
  const spec = generateGameSpec(bugClimbInput);
  return gameSpecSchema.parse({
    ...spec,
    template: "generated",
    inputModes: ["pointer", "keyboard", "touch-buttons"],
    acceptanceCriteria: [
      ...spec.acceptanceCriteria,
      { id: "AC-LANES", priority: "P0", statement: "三条树纹路线始终等宽可判断，每个生成批次至少保留一条安全通路", probeType: "state", status: "passed" },
      { id: "AC-DASH", priority: "P0", statement: "露珠冲刺可撞碎琥珀树脂，普通碰撞扣体力并清空倍率", probeType: "state", status: "passed" },
      { id: "AC-TOUCH", priority: "P1", statement: "键盘、触控按钮与四向滑动都能完成一局", probeType: "state", status: "passed" },
    ].map((criterion) => ({ ...criterion, status: "passed" })),
  });
}

export const fixtureSpecBuilders: Record<string, FixtureSpecBuilder> = {
  "star-dream-duel": { input: goldenInput, spec: acceptedGoldenSpec },
  freecell: { input: freecellInput, spec: acceptedFreecellSpec },
  "bug-climb": { input: bugClimbInput, spec: acceptedBugClimbSpec },
};

/**
 * 内置固定游戏：服务启动时注册为官方游戏并直接发布，
 * 静态文件由 fixtures 目录提供，无需经过 AI 构建管线。
 */
export interface OfficialFixtureDefinition {
  kind: string;
  metaKey: string;
  input: ProjectInput;
  spec: () => GameSpec;
  buildOutputs: string[];
}

function toFixtureDefinition(game: OfficialGameDefinition): OfficialFixtureDefinition {
  const builder = game.fixtureKind ? fixtureSpecBuilders[game.fixtureKind] : undefined;
  if (!game.fixtureKind || !game.fixture) throw new Error(`官方游戏 ${game.id} 登记为固定游戏，但缺少 fixtureKind 或 fixture 元信息。`);
  if (!builder) throw new Error(`固定游戏 ${game.fixtureKind} 缺少玩法合同构造：请在 src/server/official-fixtures.ts 的 fixtureSpecBuilders 里补上。`);
  return {
    kind: game.fixtureKind,
    metaKey: game.fixture.metaKey,
    input: builder.input,
    spec: builder.spec,
    buildOutputs: game.fixture.buildOutputs,
  };
}

/** 由登记表派生的固定游戏定义表（按登记顺序）。 */
export const officialFixtures: OfficialFixtureDefinition[] = officialFixtureGames().map(toFixtureDefinition);
