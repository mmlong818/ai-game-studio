export type CollectorPoint = { x: number; z: number };

export type CollectorObstacle = CollectorPoint & {
  width: number;
  depth: number;
  height: number;
};

export type CollectorHazard = CollectorPoint & {
  radius: number;
  motion?: { axis: "x" | "z"; range: number; speed: number; phase?: number };
};

export type CollectorBlueprint = {
  id: string;
  name: string;
  chapter: string;
  start: CollectorPoint;
  exit: CollectorPoint;
  checkpoints: CollectorPoint[];
  stars: CollectorPoint[];
  obstacles: CollectorObstacle[];
  hazards: CollectorHazard[];
};

const start = { x: 0, z: 18 };

export const collectorBestTemplateBlueprints: CollectorBlueprint[] = [
  { id: "c01", name: "潮门初醒", chapter: "认识路径", start, exit: { x: 0, z: -20 }, checkpoints: [{ x: 0, z: 1 }], stars: [{ x: 0, z: 11 }, { x: -5, z: -5 }, { x: 4, z: -14 }], obstacles: [{ x: 0, z: 7, width: 6, depth: 1.2, height: 0.75 }], hazards: [] },
  { id: "c02", name: "矮墙回声", chapter: "认识路径", start, exit: { x: -4, z: -20 }, checkpoints: [{ x: 2, z: 0 }], stars: [{ x: 4, z: 10 }, { x: -5, z: 3 }, { x: 3, z: -12 }], obstacles: [{ x: 0, z: 9, width: 7, depth: 1.2, height: 0.85 }, { x: -2, z: -7, width: 5, depth: 1.2, height: 0.95 }], hazards: [] },
  { id: "c03", name: "双径拾光", chapter: "认识路径", start, exit: { x: 5, z: -19 }, checkpoints: [{ x: -3, z: 1 }], stars: [{ x: -7, z: 9 }, { x: 6, z: 2 }, { x: -5, z: -13 }], obstacles: [{ x: 1, z: 7, width: 9, depth: 1.1, height: 0.8 }], hazards: [{ x: 3, z: -7, radius: 2.2 }] },
  { id: "c04", name: "月台折返", chapter: "认识路径", start, exit: { x: -6, z: -18 }, checkpoints: [{ x: 6, z: 2 }], stars: [{ x: -6, z: 10 }, { x: 7, z: -5 }, { x: 0, z: -14 }], obstacles: [{ x: -2, z: 6, width: 7, depth: 1.2, height: 1 }, { x: 3, z: -10, width: 6, depth: 1.2, height: 0.8 }], hazards: [{ x: 0, z: -3, radius: 2.4 }] },
  { id: "c05", name: "雾桥缺口", chapter: "跨越沟壑", start, exit: { x: 0, z: -21 }, checkpoints: [{ x: 0, z: 0 }], stars: [{ x: -6, z: 12 }, { x: 5, z: -2 }, { x: -6, z: -15 }], obstacles: [{ x: 0, z: 10, width: 8, depth: 1.4, height: 1.05 }, { x: 0, z: -10, width: 8, depth: 1.4, height: 1.05 }], hazards: [{ x: -3, z: 5, radius: 2.4 }, { x: 3, z: -6, radius: 2.4 }] },
  { id: "c06", name: "窄脊侧行", chapter: "跨越沟壑", start, exit: { x: 7, z: -20 }, checkpoints: [{ x: -6, z: 0 }], stars: [{ x: 6, z: 11 }, { x: -8, z: -3 }, { x: 2, z: -16 }], obstacles: [{ x: 1, z: 7, width: 10, depth: 1.2, height: 1.15 }], hazards: [{ x: -1, z: 1, radius: 3 }, { x: 5, z: -9, radius: 2.6 }] },
  { id: "c07", name: "三段跃石", chapter: "跨越沟壑", start, exit: { x: -7, z: -20 }, checkpoints: [{ x: 5, z: -1 }], stars: [{ x: -5, z: 11 }, { x: 7, z: 4 }, { x: -7, z: -11 }], obstacles: [{ x: -3, z: 9, width: 5, depth: 1.1, height: 0.8 }, { x: 4, z: 3, width: 5, depth: 1.1, height: 1 }, { x: -2, z: -8, width: 6, depth: 1.1, height: 1.1 }], hazards: [{ x: 0, z: -3, radius: 2.8 }] },
  { id: "c08", name: "岔潮回廊", chapter: "跨越沟壑", start, exit: { x: 0, z: -21 }, checkpoints: [{ x: -7, z: 2 }], stars: [{ x: 7, z: 12 }, { x: -8, z: 0 }, { x: 8, z: -12 }], obstacles: [{ x: 0, z: 8, width: 12, depth: 1.3, height: 1 }, { x: 0, z: -9, width: 12, depth: 1.3, height: 1.15 }], hazards: [{ x: 0, z: 2, radius: 3 }, { x: -4, z: -14, radius: 2.2 }] },
  { id: "c09", name: "潮摆前庭", chapter: "世界会动", start, exit: { x: 5, z: -20 }, checkpoints: [{ x: 4, z: 0 }], stars: [{ x: -7, z: 10 }, { x: 7, z: -5 }, { x: -5, z: -15 }], obstacles: [{ x: 0, z: 7, width: 8, depth: 1.1, height: 1.2 }, { x: 2, z: -8, width: 7, depth: 1.1, height: 1.2 }], hazards: [{ x: -4, z: 1, radius: 2.8, motion: { axis: "x", range: 5, speed: 0.7 } }] },
  { id: "c10", name: "升雾中庭", chapter: "世界会动", start, exit: { x: -5, z: -20 }, checkpoints: [{ x: -4, z: -1 }], stars: [{ x: 6, z: 11 }, { x: -7, z: -4 }, { x: 5, z: -13 }], obstacles: [{ x: -1, z: 9, width: 9, depth: 1.1, height: 1.25 }, { x: 3, z: -7, width: 7, depth: 1.1, height: 1.25 }], hazards: [{ x: 4, z: 2, radius: 2.8, motion: { axis: "z", range: 4, speed: 0.8 } }] },
  { id: "c11", name: "节拍石门", chapter: "世界会动", start, exit: { x: 0, z: -21 }, checkpoints: [{ x: 6, z: 0 }], stars: [{ x: -6, z: 12 }, { x: 8, z: -2 }, { x: -7, z: -14 }], obstacles: [{ x: 0, z: 10, width: 10, depth: 1.1, height: 1.3 }, { x: 0, z: 1, width: 10, depth: 1.1, height: 0.8 }, { x: 0, z: -9, width: 10, depth: 1.1, height: 1.3 }], hazards: [{ x: -4, z: -4, radius: 2.5, motion: { axis: "x", range: 7, speed: 0.95 } }] },
  { id: "c12", name: "回声升桥", chapter: "世界会动", start, exit: { x: 7, z: -19 }, checkpoints: [{ x: -7, z: 1 }], stars: [{ x: 7, z: 10 }, { x: -8, z: -2 }, { x: 0, z: -15 }], obstacles: [{ x: 2, z: 8, width: 8, depth: 1.2, height: 1.35 }, { x: -3, z: -10, width: 7, depth: 1.2, height: 1.35 }], hazards: [{ x: -2, z: 3, radius: 3, motion: { axis: "x", range: 5, speed: 0.72 } }, { x: 5, z: -7, radius: 2.4, motion: { axis: "z", range: 4, speed: 0.9, phase: 1.8 } }] },
  { id: "c13", name: "赤潮边线", chapter: "风险探索", start, exit: { x: -6, z: -20 }, checkpoints: [{ x: 5, z: 1 }], stars: [{ x: -8, z: 8 }, { x: 7, z: -4 }, { x: -8, z: -13 }], obstacles: [{ x: -2, z: 9, width: 7, depth: 1.1, height: 1.4 }, { x: 3, z: -8, width: 7, depth: 1.1, height: 1.4 }], hazards: [{ x: 3, z: 6, radius: 2.8 }, { x: -3, z: -3, radius: 3 }, { x: 4, z: -14, radius: 2.2 }] },
  { id: "c14", name: "巡光夹道", chapter: "风险探索", start, exit: { x: 6, z: -20 }, checkpoints: [{ x: -5, z: 0 }], stars: [{ x: 8, z: 11 }, { x: -7, z: -3 }, { x: 7, z: -14 }], obstacles: [{ x: 0, z: 8, width: 12, depth: 1.2, height: 1.45 }, { x: 0, z: -8, width: 12, depth: 1.2, height: 1.45 }], hazards: [{ x: -5, z: 5, radius: 2.6 }, { x: 5, z: 0, radius: 2.6 }, { x: -5, z: -12, radius: 2.6 }] },
  { id: "c15", name: "星砂险湾", chapter: "风险探索", start, exit: { x: 0, z: -21 }, checkpoints: [{ x: 0, z: -1 }], stars: [{ x: -10, z: 9 }, { x: 9, z: 0 }, { x: -10, z: -13 }], obstacles: [{ x: -2, z: 10, width: 8, depth: 1.1, height: 1.5 }, { x: 3, z: -10, width: 8, depth: 1.1, height: 1.5 }], hazards: [{ x: 0, z: 6, radius: 3.2 }, { x: -4, z: -5, radius: 2.8 }, { x: 5, z: -15, radius: 2.4 }] },
  { id: "c16", name: "暮色迂回", chapter: "风险探索", start, exit: { x: -8, z: -19 }, checkpoints: [{ x: 7, z: 1 }], stars: [{ x: 9, z: 12 }, { x: -9, z: 1 }, { x: 8, z: -12 }], obstacles: [{ x: 2, z: 9, width: 9, depth: 1.2, height: 1.55 }, { x: -3, z: -9, width: 9, depth: 1.2, height: 1.55 }], hazards: [{ x: -4, z: 5, radius: 3 }, { x: 4, z: -4, radius: 3 }, { x: 0, z: -15, radius: 2.3 }] },
  { id: "c17", name: "双灯归途", chapter: "归航试炼", start, exit: { x: 0, z: -21 }, checkpoints: [{ x: -6, z: 6 }, { x: 6, z: -7 }], stars: [{ x: 8, z: 11 }, { x: -9, z: -2 }, { x: 9, z: -15 }], obstacles: [{ x: 0, z: 11, width: 11, depth: 1.1, height: 1.6 }, { x: 0, z: 0, width: 11, depth: 1.1, height: 1.3 }, { x: 0, z: -12, width: 11, depth: 1.1, height: 1.6 }], hazards: [{ x: 4, z: 5, radius: 3 }, { x: -4, z: -6, radius: 3 }] },
  { id: "c18", name: "镜潮长廊", chapter: "归航试炼", start, exit: { x: 8, z: -20 }, checkpoints: [{ x: 7, z: 5 }, { x: -7, z: -8 }], stars: [{ x: -9, z: 10 }, { x: 9, z: -2 }, { x: -9, z: -15 }], obstacles: [{ x: -2, z: 9, width: 8, depth: 1.2, height: 1.65 }, { x: 3, z: -2, width: 8, depth: 1.2, height: 1.4 }, { x: -2, z: -13, width: 8, depth: 1.2, height: 1.65 }], hazards: [{ x: 4, z: 10, radius: 2.8 }, { x: -4, z: 0, radius: 3.2 }, { x: 4, z: -10, radius: 2.8 }] },
  { id: "c19", name: "王庭断桥", chapter: "归航试炼", start, exit: { x: -8, z: -20 }, checkpoints: [{ x: -7, z: 5 }, { x: 7, z: -8 }], stars: [{ x: 9, z: 11 }, { x: -10, z: -3 }, { x: 9, z: -14 }], obstacles: [{ x: 1, z: 10, width: 12, depth: 1.1, height: 1.7 }, { x: -1, z: -1, width: 12, depth: 1.1, height: 1.45 }, { x: 1, z: -12, width: 12, depth: 1.1, height: 1.7 }], hazards: [{ x: -5, z: 9, radius: 3 }, { x: 5, z: 1, radius: 3 }, { x: -5, z: -10, radius: 3 }] },
  { id: "c20", name: "潮冠终航", chapter: "归航试炼", start, exit: { x: 0, z: -22 }, checkpoints: [{ x: 8, z: 6 }, { x: -8, z: -8 }], stars: [{ x: -10, z: 12 }, { x: 10, z: -1 }, { x: -10, z: -16 }], obstacles: [{ x: 0, z: 12, width: 13, depth: 1.2, height: 1.75 }, { x: 0, z: 2, width: 13, depth: 1.2, height: 1.5 }, { x: 0, z: -9, width: 13, depth: 1.2, height: 1.75 }], hazards: [{ x: -5, z: 7, radius: 3.2, motion: { axis: "x", range: 7, speed: 0.78 } }, { x: 5, z: -3, radius: 3.2, motion: { axis: "x", range: 7, speed: 0.92, phase: 2.1 } }, { x: -5, z: -14, radius: 3.2, motion: { axis: "z", range: 4, speed: 0.86, phase: 1.2 } }] },
];

export function collectorBlueprintSignatures() {
  return collectorBestTemplateBlueprints.map((level) => JSON.stringify({
    exit: level.exit,
    checkpoints: level.checkpoints,
    stars: level.stars,
    obstacles: level.obstacles,
    hazards: level.hazards,
  }));
}
