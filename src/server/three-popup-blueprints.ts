import { createPaperPopupRules, type PopupBlueprint, type PopupCell } from "../shared/paper-popup-rules.js";

export type { PopupBlueprint } from "../shared/paper-popup-rules.js";

export const popupChapters = [
  { index: 1, name: "晨光草甸", element: "旋转看路：断桥与折叠台阶只在特定角度接上" },
  { index: 2, name: "海岸灯塔", element: "会动的纸浪与纸鸟：按节拍等时机" },
  { index: 3, name: "灯笼夜市", element: "顺序机关：按顺序踩亮压板，桥会开合" },
  { index: 4, name: "雪原天文台", element: "限时门：踩下计时压板后桥只接上几拍" },
] as const;

const c = (x: number, z: number): PopupCell => ({ x, z });

function level(
  index: number,
  name: string,
  chapter: 1 | 2 | 3 | 4,
  intro: string,
  body: Omit<PopupBlueprint, "id" | "name" | "chapter" | "chapterName" | "intro">,
): PopupBlueprint {
  return {
    id: `p${String(index).padStart(2, "0")}`,
    name,
    chapter,
    chapterName: popupChapters[chapter - 1].name,
    intro,
    ...body,
  };
}

/**
 * 20 关关卡数据。行字符串按 z 从上到下排列，字符是格子高度（. 为空洞，1–9 为纸台高度）。
 * 桥（bridge）跨过 1–2 个空洞格、两端同高；台阶（stair）连接相邻、高差 2 的两格。
 * `angles` 表示只在这些书本朝向下接上；星星的 `angles` 表示只在这些朝向下可见、可拾取。
 */
export const popupBestTemplateBlueprints: PopupBlueprint[] = [
  level(1, "翻开第一页", 1, "断桥折在半空。把书转一格，桥就会落下来。", {
    rows: [
      ".....11",
      "1111..1",
      "1..1...",
      "1..1...",
      "1111...",
      "1......",
    ],
    start: c(0, 5), exit: c(6, 0), checkpoints: [c(3, 1)],
    stars: [{ ...c(3, 4), angles: [0, 1, 2, 3] }, { ...c(0, 2), angles: [2] }, { ...c(6, 1), angles: [2] }],
    links: [{ id: "b1", kind: "bridge", from: c(3, 1), to: c(6, 1), angles: [1] }],
    plates: [], hazards: [],
  }),
  level(2, "折叠台阶", 1, "高台要靠折叠台阶。跳过一格空隙，再找台阶会展开的角度。", {
    rows: [
      "3333...",
      "...3...",
      "...3...",
      "1.11...",
      "1.1....",
      "1.1....",
      "111....",
    ],
    start: c(0, 6), exit: c(0, 0), checkpoints: [c(3, 3)],
    stars: [{ ...c(0, 3), angles: [0, 1, 2, 3] }, { ...c(1, 0), angles: [2] }, { ...c(2, 4), angles: [0, 3] }],
    links: [{ id: "s1", kind: "stair", from: c(3, 3), to: c(3, 2), angles: [3] }],
    plates: [], hazards: [],
  }),
  level(3, "两次转动", 1, "两座桥在不同角度落下，路要分两段想。", {
    rows: [
      "...1..11",
      "...1....",
      "1..1....",
      "1.......",
      "1.......",
      "1.......",
    ],
    start: c(0, 5), exit: c(7, 0), checkpoints: [c(3, 2)],
    stars: [{ ...c(0, 4), angles: [0, 1, 2, 3] }, { ...c(3, 1), angles: [2] }, { ...c(6, 0), angles: [3, 0] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 2), to: c(3, 2), angles: [1] },
      { id: "b2", kind: "bridge", from: c(3, 0), to: c(6, 0), angles: [3] },
    ],
    plates: [], hazards: [],
  }),
  level(4, "草甸回环", 1, "先跳一步，再把书转到背面，出口前的桥才会接上。", {
    rows: [
      "..2..2..",
      "..2..2..",
      "112..2..",
      "1.......",
      "........",
      "1.......",
      "1.......",
    ],
    start: c(0, 6), exit: c(5, 0), checkpoints: [c(2, 2)],
    stars: [{ ...c(0, 3), angles: [0, 1, 2, 3] }, { ...c(2, 0), angles: [1] }, { ...c(5, 2), angles: [2, 3] }],
    links: [{ id: "b1", kind: "bridge", from: c(2, 1), to: c(5, 1), angles: [2] }],
    plates: [], hazards: [],
  }),
  level(5, "草甸尽头", 1, "桥和台阶各有自己的角度；高处的星要靠一次跳跃。", {
    rows: [
      ".....333",
      "111333..",
      "........",
      "....3...",
      "11......",
      "1.......",
      "1.......",
      "1.......",
    ],
    start: c(0, 7), exit: c(7, 0), checkpoints: [c(1, 1)],
    stars: [{ ...c(0, 1), angles: [2] }, { ...c(4, 3), angles: [0, 1, 2, 3] }, { ...c(1, 4), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 4), to: c(0, 1), angles: [3] },
      { id: "s1", kind: "stair", from: c(2, 1), to: c(3, 1), angles: [1] },
    ],
    plates: [], hazards: [],
  }),
  level(6, "第一道纸浪", 2, "纸浪沿着堤道来回。看清节拍再走，被卷到会回到旗子。", {
    rows: [
      ".......1",
      "........",
      "........",
      "11111111",
      "1...1...",
      "1.......",
    ],
    start: c(0, 5), exit: c(7, 0), checkpoints: [c(1, 3)],
    stars: [{ ...c(4, 4), angles: [2] }, { ...c(7, 3), angles: [0, 1, 2, 3] }, { ...c(0, 3), angles: [1] }],
    links: [{ id: "b1", kind: "bridge", from: c(7, 3), to: c(7, 0), angles: [1] }],
    plates: [],
    hazards: [{ id: "w1", kind: "wave", every: 1, path: [c(2, 3), c(3, 3), c(4, 3), c(5, 3), c(6, 3), c(5, 3), c(4, 3), c(3, 3)] }],
  }),
  level(7, "纸鸟巡航", 2, "纸鸟绕着广场飞。穿过它的航线，去找展开台阶的角度。", {
    rows: [
      "........",
      "........",
      "..111133",
      "..1111.3",
      "..1111..",
      "..1111..",
      "111.....",
      "1.......",
    ],
    start: c(0, 7), exit: c(7, 2), checkpoints: [c(2, 6)],
    stars: [{ ...c(3, 3), angles: [1] }, { ...c(4, 4), angles: [0, 1, 2, 3] }, { ...c(5, 3), angles: [2, 3] }],
    links: [{ id: "s1", kind: "stair", from: c(5, 2), to: c(6, 2), angles: [2] }],
    plates: [],
    hazards: [{ id: "k1", kind: "bird", every: 1, path: [c(2, 2), c(3, 2), c(4, 2), c(5, 2), c(5, 3), c(5, 4), c(5, 5), c(4, 5), c(3, 5), c(2, 5), c(2, 4), c(2, 3)] }],
  }),
  level(8, "潮汐走廊", 2, "两条堤道、两道节拍不同的纸浪，中间还有一座要转角度的桥。", {
    rows: [
      "........1",
      "........1",
      "....11111",
      ".........",
      "......1..",
      "11111....",
      "1........",
    ],
    start: c(0, 6), exit: c(8, 0), checkpoints: [c(4, 5)],
    stars: [{ ...c(6, 4), angles: [2] }, { ...c(0, 5), angles: [0, 1, 2, 3] }, { ...c(8, 2), angles: [1] }],
    links: [{ id: "b1", kind: "bridge", from: c(4, 5), to: c(4, 2), angles: [3] }],
    plates: [],
    hazards: [
      { id: "w1", kind: "wave", every: 1, path: [c(1, 5), c(2, 5), c(3, 5), c(2, 5)] },
      { id: "w2", kind: "wave", every: 2, path: [c(5, 2), c(6, 2), c(7, 2), c(6, 2)] },
    ],
  }),
  level(9, "灯塔阶梯", 2, "环形平台上有一只纸鸟。绕到内侧，转到台阶展开的角度登顶。", {
    rows: [
      "........",
      ".22222..",
      ".2...2..",
      ".2.6.2..",
      ".2.4.2..",
      ".2222211",
      "........",
      "........",
    ],
    start: c(7, 5), exit: c(3, 3), checkpoints: [c(6, 5)],
    stars: [{ ...c(1, 1), angles: [3] }, { ...c(3, 1), angles: [0, 1, 2, 3] }, { ...c(1, 3), angles: [1] }],
    links: [
      { id: "s0", kind: "stair", from: c(3, 5), to: c(3, 4) },
      { id: "s1", kind: "stair", from: c(3, 4), to: c(3, 3), angles: [2] },
    ],
    plates: [],
    hazards: [{ id: "k1", kind: "bird", every: 1, path: [c(1, 1), c(2, 1), c(3, 1), c(4, 1), c(5, 1), c(5, 2), c(5, 3), c(5, 4), c(5, 5), c(4, 5), c(3, 5), c(2, 5), c(1, 5), c(1, 4), c(1, 3), c(1, 2)] }],
  }),
  level(10, "海岸尽头", 2, "纸浪、纸鸟和两座角度桥一起出现；两面旗子帮你分段。", {
    rows: [
      "........2",
      "......2.2",
      "111111222",
      "......222",
      "......222",
      "1........",
      "1........",
      "1........",
    ],
    start: c(0, 7), exit: c(8, 0), checkpoints: [c(0, 2), c(5, 2)],
    stars: [{ ...c(7, 3), angles: [2] }, { ...c(6, 4), angles: [0, 1, 2, 3] }, { ...c(6, 1), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 5), to: c(0, 2), angles: [1] },
      { id: "b2", kind: "bridge", from: c(6, 1), to: c(8, 1), angles: [3] },
    ],
    plates: [],
    hazards: [
      { id: "w1", kind: "wave", every: 1, path: [c(1, 2), c(2, 2), c(3, 2), c(4, 2), c(3, 2), c(2, 2)] },
      { id: "k1", kind: "bird", every: 1, path: [c(7, 2), c(8, 2), c(8, 3), c(8, 4), c(7, 4), c(6, 4), c(6, 3), c(7, 3)] },
    ],
  }),
  level(11, "第一盏灯", 3, "踩亮压板，桥才会落下。夜市的纸浪仍在来回。", {
    rows: [
      "......33",
      "......11",
      "......1.",
      "1111..11",
      "11......",
      "1.......",
      "1.......",
    ],
    start: c(0, 6), exit: c(7, 0), checkpoints: [c(6, 2)],
    stars: [{ ...c(7, 3), angles: [1] }, { ...c(1, 4), angles: [0, 1, 2, 3] }, { ...c(7, 1), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(3, 3), to: c(6, 3), step: 1 },
      { id: "s1", kind: "stair", from: c(6, 1), to: c(6, 0), angles: [2] },
    ],
    plates: [{ id: "p1", kind: "order", order: 1, at: c(0, 3) }],
    hazards: [{ id: "w1", kind: "wave", every: 2, path: [c(1, 3), c(2, 3)] }],
  }),
  level(12, "顺序点灯", 3, "第一盏灯开第一座桥，第二盏灯开第二座桥、收第一座。", {
    rows: [
      "...1....3",
      "...1..133",
      "1..1..1..",
      "1.....1..",
      "1........",
      "1........",
      "1........",
    ],
    start: c(0, 6), exit: c(8, 0), checkpoints: [c(3, 2)],
    stars: [{ ...c(6, 3), angles: [2] }, { ...c(3, 1), angles: [0, 1, 2, 3] }, { ...c(0, 3), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 2), to: c(3, 2), step: 1, closeStep: 2 },
      { id: "b2", kind: "bridge", from: c(3, 2), to: c(6, 2), step: 2 },
      { id: "s1", kind: "stair", from: c(6, 1), to: c(7, 1), angles: [1] },
    ],
    plates: [
      { id: "p1", kind: "order", order: 1, at: c(0, 4) },
      { id: "p2", kind: "order", order: 2, at: c(3, 0) },
    ],
    hazards: [{ id: "k1", kind: "bird", every: 1, path: [c(6, 2), c(6, 3), c(5, 3), c(5, 2)] }],
  }),
  level(13, "翻转木板", 3, "翻转压板每踩一次就切换一次。按顺序点两盏灯，出口的桥才在角度上接得住。", {
    rows: [
      "....1..1.",
      "11111..11",
      ".........",
      ".........",
      "11111....",
      "1..1.....",
      "1..1.....",
      "1........",
    ],
    start: c(0, 7), exit: c(8, 1), checkpoints: [c(4, 4)],
    stars: [{ ...c(3, 6), angles: [0, 1, 2, 3] }, { ...c(1, 1), angles: [2] }, { ...c(7, 0), angles: [1] }],
    links: [
      { id: "b1", kind: "bridge", from: c(4, 4), to: c(4, 1), plate: "t1" },
      { id: "b2", kind: "bridge", from: c(0, 1), to: c(0, 4), step: 2 },
      { id: "b3", kind: "bridge", from: c(4, 1), to: c(7, 1), step: 2, angles: [3] },
    ],
    plates: [
      { id: "t1", kind: "toggle", at: c(2, 4) },
      { id: "p1", kind: "order", order: 1, at: c(4, 0) },
      { id: "p2", kind: "order", order: 2, at: c(0, 1) },
    ],
    hazards: [{ id: "w1", kind: "wave", every: 2, path: [c(3, 5), c(3, 6)] }],
  }),
  level(14, "夜市回环", 3, "绕着环形街道按顺序点亮三盏灯，中央的桥才会落到出口。", {
    rows: [
      ".........",
      ".11..111.",
      ".1.....1.",
      "11..1..1.",
      ".1.....1.",
      ".1.....1.",
      ".1111111.",
      ".........",
    ],
    start: c(0, 3), exit: c(4, 3), checkpoints: [c(7, 3)],
    stars: [{ ...c(1, 4), angles: [2] }, { ...c(7, 5), angles: [0, 1, 2, 3] }, { ...c(2, 1), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(2, 1), to: c(5, 1), angles: [1] },
      { id: "b2", kind: "bridge", from: c(4, 6), to: c(4, 3), step: 3 },
    ],
    plates: [
      { id: "p1", kind: "order", order: 1, at: c(1, 1) },
      { id: "p2", kind: "order", order: 2, at: c(7, 1) },
      { id: "p3", kind: "order", order: 3, at: c(7, 6) },
    ],
    hazards: [{ id: "k1", kind: "bird", every: 1, path: [c(2, 6), c(3, 6), c(4, 6), c(5, 6), c(6, 6), c(5, 6), c(4, 6), c(3, 6)] }],
  }),
  level(15, "夜市尽头", 3, "翻转板、三盏顺序灯、纸浪与纸鸟一起登场；第三盏灯挡在第二盏前面，得绕上一层去。", {
    rows: [
      "..11333..",
      ".........",
      "...111...",
      "..11111..",
      ".........",
      ".........",
      "1111111..",
      "11.......",
      "1........",
    ],
    start: c(0, 8), exit: c(6, 0), checkpoints: [c(6, 3)],
    stars: [{ ...c(0, 6), angles: [2] }, { ...c(1, 7), angles: [1] }, { ...c(5, 3), angles: [0, 1, 2, 3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(6, 6), to: c(6, 3), plate: "t1" },
      { id: "b2", kind: "bridge", from: c(2, 3), to: c(2, 0), step: 3 },
      { id: "s1", kind: "stair", from: c(3, 0), to: c(4, 0), angles: [3] },
    ],
    plates: [
      { id: "t1", kind: "toggle", at: c(1, 6) },
      { id: "p1", kind: "order", order: 1, at: c(6, 6) },
      { id: "p2", kind: "order", order: 2, at: c(2, 3) },
      { id: "p3", kind: "order", order: 3, at: c(4, 3) },
    ],
    hazards: [
      { id: "w1", kind: "wave", every: 1, path: [c(2, 6), c(3, 6), c(4, 6), c(3, 6)] },
      { id: "k1", kind: "bird", every: 1, path: [c(3, 2), c(4, 2), c(5, 2), c(4, 2)] },
    ],
  }),
  level(16, "第一扇限时门", 4, "踩下计时压板后，桥只接上几拍。别在纸浪前犹豫太久。", {
    rows: [
      ".......3",
      "......33",
      "......11",
      "......1.",
      "1111..11",
      "11......",
      "1.......",
    ],
    start: c(0, 6), exit: c(7, 0), checkpoints: [c(6, 4)],
    stars: [{ ...c(7, 4), angles: [1] }, { ...c(1, 5), angles: [0, 1, 2, 3] }, { ...c(7, 2), angles: [3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(3, 4), to: c(6, 4), timer: "t1" },
      { id: "s1", kind: "stair", from: c(6, 2), to: c(6, 1), angles: [2] },
    ],
    plates: [{ id: "t1", kind: "timer", duration: 8, at: c(0, 4) }],
    hazards: [{ id: "w1", kind: "wave", every: 2, path: [c(1, 4), c(2, 4)] }],
  }),
  level(17, "守夜星轨", 4, "两块计时压板、两座限时桥，第二座还要转到对的角度。", {
    rows: [
      "...1..111",
      "...1.....",
      "...1.....",
      "1..1.....",
      "1........",
      "11.......",
      "1........",
    ],
    start: c(0, 6), exit: c(8, 0), checkpoints: [c(3, 3)],
    stars: [{ ...c(0, 4), angles: [3] }, { ...c(1, 5), angles: [1] }, { ...c(6, 0), angles: [0, 1, 2, 3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 3), to: c(3, 3), timer: "t1" },
      { id: "b2", kind: "bridge", from: c(3, 0), to: c(6, 0), timer: "t2", angles: [1] },
    ],
    plates: [
      { id: "t1", kind: "timer", duration: 7, at: c(0, 5) },
      { id: "t2", kind: "timer", duration: 6, at: c(3, 2) },
    ],
    hazards: [{ id: "k1", kind: "bird", every: 1, path: [c(3, 1), c(3, 0), c(4, 0), c(4, 1)] }],
  }),
  level(18, "双门雪径", 4, "先赶第一扇限时门，再用翻转板和第二块计时板一起打开第二座桥。", {
    rows: [
      "111111..1",
      ".1......1",
      "........1",
      "11......3",
      "1........",
      "1........",
      "1........",
      "1........",
    ],
    start: c(0, 7), exit: c(8, 3), checkpoints: [c(2, 0)],
    stars: [{ ...c(1, 3), angles: [2] }, { ...c(8, 1), angles: [1] }, { ...c(1, 1), angles: [0, 1, 2, 3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(0, 3), to: c(0, 0), timer: "t1" },
      { id: "b2", kind: "bridge", from: c(5, 0), to: c(8, 0), plate: "x1", timer: "t2" },
      { id: "s1", kind: "stair", from: c(8, 2), to: c(8, 3), angles: [2] },
    ],
    plates: [
      { id: "t1", kind: "timer", duration: 9, at: c(0, 6) },
      { id: "x1", kind: "toggle", at: c(3, 0) },
      { id: "t2", kind: "timer", duration: 5, at: c(4, 0) },
    ],
    hazards: [{ id: "w1", kind: "wave", every: 2, path: [c(0, 4), c(0, 5)] }],
  }),
  level(19, "雪脊机关", 4, "顺序灯、计时板、纸浪与纸鸟同时出现；藏在雪脊后的星要跳过去。", {
    rows: [
      "........3",
      "........3",
      "....1...1",
      "....1...1",
      "..1.1..11",
      "....1....",
      "11111....",
      "1........",
      "1........",
    ],
    start: c(0, 8), exit: c(8, 0), checkpoints: [c(4, 5)],
    stars: [{ ...c(2, 4), angles: [0, 1, 2, 3] }, { ...c(4, 2), angles: [2] }, { ...c(0, 6), angles: [1] }],
    links: [
      { id: "b1", kind: "bridge", from: c(4, 4), to: c(7, 4), timer: "t1", step: 1 },
      { id: "s1", kind: "stair", from: c(8, 2), to: c(8, 1), angles: [3] },
    ],
    plates: [
      { id: "p1", kind: "order", order: 1, at: c(4, 6) },
      { id: "t1", kind: "timer", duration: 8, at: c(4, 3) },
    ],
    hazards: [
      { id: "w1", kind: "wave", every: 1, path: [c(1, 6), c(2, 6), c(3, 6), c(2, 6)] },
      { id: "k1", kind: "bird", every: 2, path: [c(4, 3), c(4, 2), c(5, 2), c(5, 3)] },
    ],
  }),
  level(20, "天文台", 4, "两条通往天文台的路：一条要顺序点灯与角度，一条要翻转板、计时板与另一个角度。", {
    rows: [
      "....3....",
      "....3....",
      "....11...",
      ".1..1..1.",
      ".1.....1.",
      ".1.....1.",
      "11111111.",
      "....1....",
      "....1....",
    ],
    start: c(4, 8), exit: c(4, 0), checkpoints: [c(1, 6), c(7, 3)],
    stars: [{ ...c(1, 3), angles: [2] }, { ...c(0, 6), angles: [1] }, { ...c(5, 2), angles: [0, 1, 2, 3] }],
    links: [
      { id: "b1", kind: "bridge", from: c(1, 3), to: c(4, 3), step: 2, angles: [1] },
      { id: "b2", kind: "bridge", from: c(7, 3), to: c(4, 3), plate: "x1", timer: "t1", angles: [3] },
      { id: "s1", kind: "stair", from: c(4, 2), to: c(4, 1), angles: [2] },
    ],
    plates: [
      { id: "p1", kind: "order", order: 1, at: c(1, 5) },
      { id: "x1", kind: "toggle", at: c(1, 4) },
      { id: "p2", kind: "order", order: 2, at: c(7, 5) },
      { id: "t1", kind: "timer", duration: 7, at: c(7, 4) },
    ],
    hazards: [
      { id: "w1", kind: "wave", every: 1, path: [c(3, 6), c(4, 6), c(5, 6), c(4, 6)] },
      { id: "k1", kind: "bird", every: 2, path: [c(4, 2), c(5, 2), c(5, 1), c(4, 1)] },
    ],
  }),
];

export function popupBlueprintSignatures() {
  return popupBestTemplateBlueprints.map((bp) => JSON.stringify({ rows: bp.rows, start: bp.start, exit: bp.exit, checkpoints: bp.checkpoints, stars: bp.stars, links: bp.links, plates: bp.plates, hazards: bp.hazards }));
}

export type PopupLevelReport = {
  id: string;
  issues: string[];
  solution: ReturnType<ReturnType<typeof createPaperPopupRules>["solveLevel"]>;
  requiresRotation: boolean;
  hiddenStarIndexes: number[];
  starsCollectible: boolean[];
};

/** 对全部关卡做静态校验与求解，供测试、审计与文档使用。 */
export function auditPopupBlueprints(blueprints: PopupBlueprint[] = popupBestTemplateBlueprints): PopupLevelReport[] {
  const rules = createPaperPopupRules();
  return blueprints.map((bp) => {
    const issues = rules.validate(bp);
    const solution = issues.length ? null : rules.solveLevel(bp);
    const withoutRotation = issues.length ? null : rules.solveLevel(bp, { allowRotate: false });
    return {
      id: bp.id,
      issues,
      solution,
      requiresRotation: solution !== null && withoutRotation === null,
      hiddenStarIndexes: bp.stars.flatMap((star, index) => (star.angles.includes(0) ? [] : [index])),
      starsCollectible: bp.stars.map((_, index) => (issues.length ? false : rules.solveStar(bp, index) !== null)),
    };
  });
}
