// Independent, versioned single-player rules. No battle health or AI dependencies.
export const SOLO_RULE_VERSION = 1;
const chapters = ['初识星光', '双星彩集', '花月同行', '三色旅途', '星梦收藏'];
const names = ['第一束星光', '云间拾梦', '心愿萌芽', '花开三枚', '星与水', '花与月', '心与云', '双星回响', '月下花园', '云上心愿', '潮汐星灯', '花月满庭', '三色初见', '晴空花雨', '月光心曲', '星河合奏', '繁花星愿', '潮声月色', '云端收藏', '点亮星梦'];
const goals = [
  { star: 3 }, { cloud: 6 }, { heart: 6 }, { flower: 9 },
  { star: 6, drop: 6 }, { flower: 6, moon: 6 }, { heart: 6, cloud: 6 }, { star: 9, moon: 6 },
  { moon: 9, flower: 9 }, { cloud: 9, heart: 9 }, { drop: 9, star: 9 }, { flower: 12, moon: 9 },
  { star: 9, heart: 6, drop: 6 }, { cloud: 9, flower: 6, drop: 6 }, { moon: 9, heart: 9, star: 6 }, { star: 9, moon: 9, drop: 9 },
  { flower: 12, star: 9, heart: 9 }, { drop: 12, moon: 9, flower: 9 }, { cloud: 12, heart: 12, moon: 9 }, { star: 12, flower: 12, drop: 12 },
];
export const SOLO_LEVELS = goals.map((targets, index) => ({
  number: index + 1, name: names[index], targets, moves: [12, 16, 24, 26, 30][Math.floor(index / 4)],
  tier: Math.floor(index / 4) + 1, tierLabel: chapters[Math.floor(index / 4)],
  mission: '在步数用完前收集目标棋子；连消一并计入，无效交换不扣步。',
  startingScore: 100, allowSkills: false, allowShapes: false, allowExtraTurn: false,
  blockers: [], seed: (0x51a790 + index * 7919) >>> 0,
}));
export function createSoloProgress(level) {
  return { version: SOLO_RULE_VERSION, movesLeft: level.moves, collected: {}, hints: 0 };
}
export function collectSolo(progress, counts) {
  for (const [type, count] of Object.entries(counts)) {
    if (Number.isFinite(count) && count > 0) progress.collected[type] = (progress.collected[type] || 0) + count;
  }
}
export function soloOutcome(level, progress) {
  if (Object.entries(level.targets).every(([type, count]) => (progress.collected[type] || 0) >= count)) return 'won';
  return progress.movesLeft <= 0 ? 'lost' : 'playing';
}
export function soloStars(level, progress) {
  if (soloOutcome(level, progress) !== 'won') return 0;
  // Hints are free: rating depends only on remaining moves, not help usage.
  return 1 + Number(progress.movesLeft >= Math.ceil(level.moves * .2)) + Number(progress.movesLeft >= Math.ceil(level.moves * .4));
}
