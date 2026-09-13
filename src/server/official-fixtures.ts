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
  idea: "星梦对决包含单人限步收集和人机对战，各自 20 关；另有无限休闲，无目标、无步数限制、无对手，三种玩法独立存档。单人可操作整张棋盘，目标收满即胜，无效交换不扣步。对战时玩家操作下半区、AI 操作上半区，所有连消归当前行动者，任一方生命归零时结束。",
};

function acceptedGoldenSpec() {
  const spec = generateGameSpec(goldenInput);
  return gameSpecSchema.parse({
    ...spec,
    acceptanceCriteria: [
      ...spec.acceptanceCriteria,
      { id: "AC-ZONE", priority: "P0", statement: "对战模式中玩家与 AI 的分区操作权限始终有效", probeType: "state", status: "passed" },
      { id: "AC-MODES", priority: "P0", statement: "单人与对战拥有独立关卡进度，切换不覆盖彼此存档", probeType: "state", status: "passed" },
      { id: "AC-SOLO", priority: "P0", statement: "单人整盘操作按实际消除收集目标，无效交换不扣步，最后一步完成目标优先判胜", probeType: "state", status: "passed" },
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

const arrowEscapeIdea = "抽象细线箭头逻辑解谜：点击前方通道全空的箭头让它沿自身折线滑出棋盘，被挡则扣心；固定种子生成 20 关可解盘面，第 2 关起按箭头数计时。";

export const fixtureSpecBuilders: Record<string, FixtureSpecBuilder> = {
  'arrow-escape': {
    input: { title: '箭头逃脱', dimensions: '2d', template: 'generated', aspectRatio: '9:16', idea: arrowEscapeIdea },
    spec: () => {
      const spec = generateGameSpec({ title: '箭头逃脱', dimensions: '2d', template: 'generated', aspectRatio: '9:16', idea: arrowEscapeIdea });
      return gameSpecSchema.parse({ ...spec, template: 'generated', inputModes: ['pointer', 'keyboard', 'touch-buttons'], acceptanceCriteria: [
        { id: 'AC-ARROW-RAY', priority: 'P0', statement: '点击箭头沿朝向逐格检查到边缘，全空才滑出并清空所占格子；被挡原地不动并扣心，同一箭头连点不重复扣', probeType: 'state', status: 'passed' },
        { id: 'AC-ARROW-SOLVABLE', priority: 'P0', statement: '20 关盘面由固定种子生成，剥离验证全部可解，真实点击可自动清空', probeType: 'state', status: 'passed' },
        { id: 'AC-ARROW-TIMER', priority: 'P0', statement: '第 1 关不计时，第 2 关起时限为向上取整到 5 的倍数(max(4×箭头数,120)) 秒；4 心扣光或归零中断并可重试', probeType: 'state', status: 'passed' },
        { id: 'AC-ARROW-QUALITY', priority: 'P0', statement: '真人确认弯折互锁带来的阻碍与解开爽感、抽象线条表现与原作一致', probeType: 'state', status: 'pending' },
      ] });
    },
  },
  'meadow-railway': {
    input: { title: '牧野小火车', dimensions: '3d', template: 'generated', idea: '自由搭建木制铁路玩具，无目标无时限，点击自动接续，火车沿线路运行，支持撤销和本地保存。' },
    spec: () => {
      const spec = generateGameSpec({ title: '牧野小火车', dimensions: '3d', template: 'generated', idea: '自由搭建木制铁路玩具，无目标无时限，点击自动接续，火车沿线路运行，支持撤销和本地保存。' });
      return gameSpecSchema.parse({ ...spec, template: 'generated', inputModes: ['pointer', 'keyboard', 'touch-buttons'], acceptanceCriteria: [
        { id: 'AC-RAIL-CONNECTION', priority: 'P0', statement: '部件端点与切线连续，闭环可验证，非法相交不改变路线', probeType: 'state', status: 'pending' },
        { id: 'AC-RAIL-TRAIN', priority: 'P0', statement: '列车沿同一条路径行驶，开放路线折返，暂停停止模拟', probeType: 'state', status: 'pending' },
        { id: 'AC-RAIL-RECOVERY', priority: 'P0', statement: '撤销重做与刷新保存不损坏路线，状态与其他游戏隔离', probeType: 'state', status: 'pending' },
        { id: 'AC-RAIL-QUALITY', priority: 'P0', statement: '真人检查搭轨乐趣、美术、相机和目标设备流畅度', probeType: 'state', status: 'pending' },
      ] });
    },
  },
  'island-kart': {
    input: { title: '椰风海岛', dimensions: '3d', template: 'generated', idea: '轻操作海岛卡丁车，三车同场连续转向，三圈竞速或无限自由驾驶。' },
    spec: () => {
      const spec = generateGameSpec({ title: '椰风海岛', dimensions: '3d', template: 'generated', idea: '轻操作海岛卡丁车，三车同场连续转向，三圈竞速或无限自由驾驶。' });
      return gameSpecSchema.parse({ ...spec, template: 'generated', inputModes: ['keyboard', 'touch-buttons'], acceptanceCriteria: [
        { id: 'AC-KART-CONTROL', priority: 'P0', statement: '连续转向、自动前进与双端操作可完成赛道', probeType: 'state', status: 'pending' },
        { id: 'AC-KART-FAIR', priority: 'P0', statement: '玩家和两位 AI 使用相同车辆规则，三圈结算与自由驾驶相互独立', probeType: 'state', status: 'pending' },
        { id: 'AC-KART-PAUSE', priority: 'P0', statement: '暂停与失焦不推进计时、车辆或道具，输入释放后不粘滞', probeType: 'state', status: 'pending' },
        { id: 'AC-KART-QUALITY', priority: 'P0', statement: '真实玩家确认驾驶手感与视频复刻品质达到要求', probeType: 'state', status: 'pending' },
      ] });
    },
  },
  "star-dream-duel": { input: goldenInput, spec: acceptedGoldenSpec },
  freecell: { input: freecellInput, spec: acceptedFreecellSpec },
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
