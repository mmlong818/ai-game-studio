import { commonSuggestions } from './suggestions.js';
import { defineOfficialGame } from './types.js';

export const islandKart = defineOfficialGame({
  id: 'island-kart', title: '椰风海岛', kind: 'fixture', stage: 'live', remixable: false, fixtureKind: 'island-kart', lobbyRank: 14,
  lobbyCover: 'assets/library/covers/island-kart-v1.webp',
  cover: 'fixtures/island-kart/assets/cover.png', referenceDoc: 'docs/71-island-kart-video-remake.md',
  knowledge: { patternId: 'assisted-circuit-racing', mechanicIds: ['continuous-kart-steering', 'circuit-lap-progress', 'energy-speed-burst', 'collect-charge'], rationale: '将转向、计圈和能量冲刺作为独立机制组合，视频只提供视觉与体验参考，规则由本地确定性测试验证。' },
  fixture: { metaKey: 'island_kart_fixture_initialized', buildOutputs: [
    '三车同场、连续转向、三圈计时与无限自由驾驶规则已实现。',
    '视频观察、原创资源溯源、首次操作帮助与验收边界已归档。',
    '键盘与多点触控、暂停恢复、冲刺和自动道具效果已接入。',
    '原创程序化海岛、木桥、Kenney CC0 车辆及植被与 Web Audio 音效随产物提供。',
    '独立规则内核与浏览器回归测试随项目提供；品质仍待玩家体验评审。',
    '官方仅游玩作品沿用平台发布通道，不提供用户模板或改造入口。',
  ] },
  domainTemplate: {
    id: 'island-kart', name: '轻操作赛道竞速', genre: '街机竞速', pitch: '自动前进，左右驾驶卡丁车环绕海岛，与两名对手竞逐三圈。',
    coreLoop: '观察弯道 → 连续转向 → 收集蓄能 → 直道冲刺超车 → 冲线结算',
    coreRules: ['车辆在连续赛道空间移动，不采用固定换道', '玩家与 AI 共用加速、碰撞、冲刺和道具规则', '顺向完成三圈才结算，自由驾驶没有终点', '碰撞只减速，暂停不会推进比赛时间'],
    capabilities: ['continuous-movement', 'unified-input', 'score-system', 'checkpoint-save'],
    suggestions: commonSuggestions('island-kart', '连续转向、完整圈数、同规则对手与低操作负担', '替换海岛、车辆配色与装饰主题。', '调整赛道起伏或冲刺的风险收益。'),
    redirectExamples: ['联网多人', '真实汽车模拟', '开放世界驾驶'],
  },
  probeScenario: { actions: { steer: ['heading-changed', 'lateral-position-changed'], boost: ['energy-consumed', 'speed-increased'], finish: ['three-laps-completed', 'race-result-visible'] }, completingActions: ['finish'] },
  runtimeDefinition: { actions: ['连续转向通过弯道', '蓄能并在直道冲刺', '完成三圈冲线'], feedback: ['位置、车头方向与小地图同步变化', '能量消耗与速度反馈一致', '名次、单圈与个人纪录结算'], className: 'islandkart' },
});
