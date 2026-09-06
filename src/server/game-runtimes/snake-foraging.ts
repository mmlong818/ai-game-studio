/** Shared by generated gameplay and deterministic mechanism tests. Time is active play only. */
export const snakeForagingScript = String.raw`
const snakeFoodTypes = {
  normal: { name: '朱果', points: 1, color: '#c95339', effect: '增长一节' },
  golden: { name: '金果', points: 5, color: '#b98619', effect: '增长一节，额外积分' },
  mint: { name: '青叶', points: 2, color: '#287a55', effect: '增长一节，六秒灵活转向' },
  dew: { name: '露珠', points: 2, color: '#327caa', effect: '增长一节，六秒扩大吸取范围' },
};
function snakeForagingPlan(level, mode) {
  const phases = level === 1 ? 4 : Math.min(10, 6 + Math.floor((level - 2) / 4));
  const quota = level === 1 ? 8 : 10;
  return { phases: mode === 'endless' ? 0 : phases, secondsPerPhase: 30, quota, variety: 2, population: mode === 'endless' ? 64 : Math.ceil(phases * quota * 1.25), minimumSeconds: mode === 'endless' ? 0 : phases * 30 };
}
function newSnakeForaging() { return { phase: 0, phaseSeconds: 0, activeSeconds: 0, picked: 0, totalPicked: 0, kinds: [], totalKinds: [], normalPicked: 0, magnetUntil: 0, agilityUntil: 0 }; }
function snakeForageReady(state, plan) { return plan.phases > 0 && state.phaseSeconds >= plan.secondsPerPhase && state.picked >= plan.quota && state.kinds.length >= plan.variety; }
function advanceSnakeForage(state, plan) {
  if (!snakeForageReady(state, plan)) return false;
  state.phase += 1; state.phaseSeconds = 0; state.picked -= plan.quota;
  return state.phase >= plan.phases;
}
function snakeFoodReward(state, kind, length) {
  const rule = snakeFoodTypes[kind];
  state.picked += 1; state.totalPicked += 1;
  if (!state.kinds.includes(kind)) state.kinds.push(kind);
  if (!state.totalKinds.includes(kind)) state.totalKinds.push(kind);
  length += 1;
  if (kind === 'normal') state.normalPicked += 1;
  if (kind === 'mint') state.agilityUntil = state.activeSeconds + 6;
  if (kind === 'dew') state.magnetUntil = state.activeSeconds + 6;
  return { points: rule.points, length };
}
function snakeShouldSeedFood(mode, remaining, reset) { return reset || (mode === 'endless' && remaining === 0); }
`;
