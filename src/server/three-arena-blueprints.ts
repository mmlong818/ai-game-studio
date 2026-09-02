export type ArenaEnemyType = "chaser" | "runner" | "tank" | "ranged";

export type ArenaObstacle = { x: number; z: number; radius: number };
export type ArenaWave = Record<ArenaEnemyType, number> & { elite: boolean };

export type ArenaBlueprint = {
  id: string;
  name: string;
  chapter: string;
  spawnRotation: number;
  obstacles: ArenaObstacle[];
  waves: ArenaWave[];
};

const names = [
  ["初鸣圆庭", "锁定训练"], ["折柱回廊", "锁定训练"], ["双岛练习", "锁定训练"], ["潮门考核", "锁定训练"],
  ["侧风夹道", "侧翼压力"], ["雾环追逐", "侧翼压力"], ["三角封线", "侧翼压力"], ["疾潮回旋", "侧翼压力"],
  ["重甲前庭", "重装突破"], ["石脊分流", "重装突破"], ["四柱围猎", "重装突破"], ["铁潮断面", "重装突破"],
  ["远火廊桥", "远火预警"], ["交叉瞭望", "远火预警"], ["双塔盲区", "远火预警"], ["暮光火线", "远火预警"],
  ["四象合围", "潮冠试炼"], ["碎环终场", "潮冠试炼"], ["王庭夹击", "潮冠试炼"], ["潮冠决战", "潮冠试炼"],
] as const;

const layouts: ArenaObstacle[][] = [
  [{ x: 0, z: 0, radius: 1.5 }],
  [{ x: -5, z: 0, radius: 1.4 }, { x: 5, z: 0, radius: 1.4 }],
  [{ x: -4, z: -4, radius: 1.5 }, { x: 4, z: 4, radius: 1.5 }],
  [{ x: 0, z: -6, radius: 1.6 }, { x: -6, z: 5, radius: 1.3 }, { x: 6, z: 5, radius: 1.3 }],
  [{ x: -6, z: -2, radius: 1.5 }, { x: 0, z: 4, radius: 1.4 }, { x: 6, z: -2, radius: 1.5 }],
  [{ x: -7, z: 0, radius: 1.3 }, { x: 0, z: -7, radius: 1.3 }, { x: 7, z: 0, radius: 1.3 }, { x: 0, z: 7, radius: 1.3 }],
  [{ x: -5, z: -5, radius: 1.5 }, { x: 5, z: -5, radius: 1.5 }, { x: 0, z: 5, radius: 1.7 }],
  [{ x: -8, z: -4, radius: 1.4 }, { x: -3, z: 5, radius: 1.4 }, { x: 4, z: -5, radius: 1.4 }, { x: 8, z: 4, radius: 1.4 }],
  [{ x: -3, z: 0, radius: 2 }, { x: 4, z: 0, radius: 2 }],
  [{ x: -7, z: -6, radius: 1.6 }, { x: -7, z: 6, radius: 1.6 }, { x: 3, z: 0, radius: 2 }],
  [{ x: -6, z: -6, radius: 1.7 }, { x: 6, z: -6, radius: 1.7 }, { x: -6, z: 6, radius: 1.7 }, { x: 6, z: 6, radius: 1.7 }],
  [{ x: -8, z: 0, radius: 1.8 }, { x: -2, z: -5, radius: 1.6 }, { x: 4, z: 0, radius: 2 }, { x: -2, z: 6, radius: 1.6 }],
  [{ x: -7, z: -3, radius: 1.4 }, { x: 0, z: -3, radius: 1.8 }, { x: 7, z: -3, radius: 1.4 }, { x: 0, z: 6, radius: 1.6 }],
  [{ x: -7, z: -7, radius: 1.5 }, { x: 7, z: -7, radius: 1.5 }, { x: -7, z: 7, radius: 1.5 }, { x: 7, z: 7, radius: 1.5 }, { x: 0, z: 0, radius: 1.4 }],
  [{ x: -5, z: 0, radius: 2.1 }, { x: 5, z: 0, radius: 2.1 }, { x: 0, z: -8, radius: 1.3 }, { x: 0, z: 8, radius: 1.3 }],
  [{ x: -9, z: -4, radius: 1.4 }, { x: -3, z: 4, radius: 1.6 }, { x: 3, z: -4, radius: 1.6 }, { x: 9, z: 4, radius: 1.4 }],
  [{ x: -7, z: 0, radius: 1.8 }, { x: 0, z: -7, radius: 1.8 }, { x: 7, z: 0, radius: 1.8 }, { x: 0, z: 7, radius: 1.8 }, { x: 0, z: 0, radius: 1.2 }],
  [{ x: -9, z: -6, radius: 1.4 }, { x: 0, z: -6, radius: 1.7 }, { x: 9, z: -6, radius: 1.4 }, { x: -5, z: 5, radius: 1.7 }, { x: 5, z: 5, radius: 1.7 }],
  [{ x: -8, z: -8, radius: 1.6 }, { x: 0, z: -3, radius: 2 }, { x: 8, z: -8, radius: 1.6 }, { x: -8, z: 8, radius: 1.6 }, { x: 8, z: 8, radius: 1.6 }],
  [{ x: -9, z: 0, radius: 1.7 }, { x: -5, z: -7, radius: 1.5 }, { x: 0, z: 4, radius: 2.1 }, { x: 5, z: -7, radius: 1.5 }, { x: 9, z: 0, radius: 1.7 }, { x: 0, z: 10, radius: 1.4 }],
];

function createWave(levelIndex: number, waveIndex: number): ArenaWave {
  const tier = Math.floor(levelIndex / 4) + 1;
  return {
    chaser: 2 + tier + waveIndex,
    runner: tier >= 2 ? Math.max(1, tier - 1 + (waveIndex > 0 ? 1 : 0)) : 0,
    tank: tier >= 3 ? Math.max(1, tier - 2 + (waveIndex === 2 ? 1 : 0)) : 0,
    ranged: tier >= 4 ? Math.max(1, tier - 3 + (waveIndex > 0 ? 1 : 0)) : 0,
    elite: waveIndex === 2 && (levelIndex + 1) % 4 === 0,
  };
}

export const arenaBestTemplateBlueprints: ArenaBlueprint[] = names.map(([name, chapter], index) => ({
  id: `a${String(index + 1).padStart(2, "0")}`,
  name,
  chapter,
  spawnRotation: Number((index * 0.43).toFixed(2)),
  obstacles: layouts[index],
  waves: [0, 1, 2].map((waveIndex) => createWave(index, waveIndex)),
}));

export function arenaBlueprintSignatures() {
  return arenaBestTemplateBlueprints.map((level) => JSON.stringify({
    spawnRotation: level.spawnRotation,
    obstacles: level.obstacles,
    waves: level.waves,
  }));
}
