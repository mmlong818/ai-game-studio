import { commonSuggestions } from './suggestions.js';
import { defineOfficialGame } from './types.js';

export const meadowRailway = defineOfficialGame({
  id: 'meadow-railway', title: '牧野小火车', kind: 'fixture', stage: 'live', remixable: false, fixtureKind: 'meadow-railway', lobbyRank: 15,
  lobbyCover: 'assets/library/covers/meadow-railway-v1.webp',
  cover: 'fixtures/meadow-railway/assets/cover.png', referenceDoc: 'docs/72-meadow-railway-reference.md',
  knowledge: { patternId: 'toy-railway-sandbox', mechanicIds: ['endpoint-track-assembly', 'path-bound-vehicle'], rationale: '端点衔接构筑与沿路径运行分别建卡，组合成无目标的铁路玩具沙盒。' },
  fixture: { metaKey: 'meadow_railway_fixture_initialized', buildOutputs: [
    '独立轨道沙盒与真实参考交互研究已归档。',
    '直弯坡桥隧道按末端切线连接，闭环和开放线路共用路径内核。',
    '首次帮助、桌面及触控按钮和相机观察已接入。',
    '火车启停、末端折返、撤销重做与本地保存已实现。',
    '原创程序化 3D 模型与 MIT 引擎均随静态产物提供。',
    '官方仅游玩作品，不进入用户模板和改造流程；试玩验收边界单独记录。',
  ] },
  domainTemplate: {
    id: 'meadow-railway', name: '铁路玩具沙盒', genre: '自由搭建', pitch: '点选木制轨道自动衔接，让小火车穿过自己搭建的草原。',
    coreLoop: '选择轨道 → 自动衔接 → 发车观察 → 撤销改造 → 保存线路',
    coreRules: ['轨道由末端位置与方向连续连接', '火车沿同一路径运行，开放线路折返，闭环持续运行', '非法相交、越界和地下轨道不得改变现有线路', '自由沙盒没有强制关卡、时间限制或输赢'],
    capabilities: ['unified-input', 'checkpoint-save'],
    suggestions: commonSuggestions('meadow-railway', '低门槛端点搭建、同路径运行与随时可撤销', '调整草原和车站主题。', '扩充可明确验证连接与净空的轨道部件。'),
    redirectExamples: ['联网共同编辑', '真实铁路调度模拟', '无限世界生成'],
  },
  probeScenario: { actions: { append: ['piece-connected'], play: ['vehicle-moved'], close: ['loop-closed'] }, completingActions: ['close'] },
  runtimeDefinition: { actions: ['选择部件接续轨道', '启动列车观察线路', '撤销或保存自己的设计'], feedback: ['轨道位置与端点同步变化', '车辆沿真实轨迹运行', '历史恢复与持久化提示明确'], className: 'meadowrailway' },
});
