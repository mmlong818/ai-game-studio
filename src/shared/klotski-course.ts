/** Authored teaching sequences. Layout IDs refer to the existing verified puzzle bank;
 * reused/mirrored exercises are variations, not additional unique original boards. */
export const KLOTSKI_COURSE = [
  {name:"把路让出来",skill:"让路",intro:"先移动包裹，给队长留出两格宽的通路。",boards:[0,1,2,3],minutes:[2,3]},
  {name:"横梁不堵门",skill:"横梁调位",intro:"横向包裹需要完整的横向空位，先整理它的两侧。",boards:[0,2,4],minutes:[3,5]},
  {name:"空位会接力",skill:"空位接力",intro:"空位也会随着包裹移动；把分散的空位接到需要的位置。",boards:[1,3,5],minutes:[3,5]},
  {name:"第一庭考核",skill:"综合腾挪",intro:"先判断出口前谁挡路，再安排让路顺序。",boards:[2,4,6],minutes:[3,5]},
  {name:"向边缘借位",skill:"侧边整理",intro:"把长包裹移到边缘，让中央留给转身。",boards:[0,4,7],minutes:[3,5]},
  {name:"给横梁找家",skill:"横梁调位",intro:"不要只追着队长走，先给横梁准备落脚处。",boards:[2,5,8],minutes:[3,5]},
  {name:"两空相会",skill:"空位接力",intro:"横着两格与竖着两格服务不同形状，留意空位朝向。",boards:[1,6,9],minutes:[3,5]},
  {name:"回廊考核",skill:"综合腾挪",intro:"尝试先解决最拥挤的局部，再推进队长。",boards:[3,7,10],minutes:[3,5]},
  {name:"退一步也前进",skill:"临时让路",intro:"暂时远离出口，也可能为下一次前进腾出空间。",boards:[0,4,11],minutes:[3,5]},
  {name:"小件先换位",skill:"空位接力",intro:"用小包裹调整空位，让长件获得移动方向。",boards:[1,5,12],minutes:[3,5]},
  {name:"绕开横梁",skill:"横梁调位",intro:"观察横梁与两侧长件的依赖，不只看出口距离。",boards:[2,4,13],minutes:[3,5]},
  {name:"深庭考核",skill:"综合腾挪",intro:"把让路、接力与临时退让连起来。",boards:[3,5,14],minutes:[3,5]},
  {name:"拆开连环扣",skill:"临时让路",intro:"一次只处理一个拥堵点，记住刚释放的空位。",boards:[0,3,15],minutes:[3,5]},
  {name:"重排中庭",skill:"侧边整理",intro:"先安排长件停靠，再让队长穿过中央。",boards:[1,4,16],minutes:[3,5]},
  {name:"横竖交换",skill:"空位接力",intro:"通过短件搬运改变空位方向。",boards:[2,3,17],minutes:[3,5]},
  {name:"连廊考核",skill:"综合腾挪",intro:"把复杂局面拆成若干次有目的的让路。",boards:[3,4,18],minutes:[3,5]},
  {name:"看清依赖",skill:"临时让路",intro:"谁先动取决于谁能获得空间，而不是谁离门最近。",boards:[0,2,19],minutes:[3,5]},
  {name:"先整理再出发",skill:"侧边整理",intro:"先为出口前的关键包裹准备位置。",boards:[1,3,18],minutes:[3,5]},
  {name:"横刀再解",skill:"横梁调位",intro:"用已经练过的让路方法处理经典密集局面。",boards:[2,1,19],minutes:[3,5]},
  {name:"朱门总考",skill:"综合腾挪",intro:"不追求第一次就最少步，完成后再改善自己的路线。",boards:[3,2,19],minutes:[3,5]},
] as const;
export const KLOTSKI_PRACTICE_LAYOUTS = [
  {name:"先给长件让路",optimal:6,points:[[2,1],[0,0],[1,3],[3,3],[0,2],[0,3]]},
  {name:"横梁需要两格",optimal:16,points:[[1,0],[1,2],[0,0],[3,0],[0,3],[3,3]]},
  {name:"把空位送过去",optimal:13,points:[[1,1],[1,3],[0,2],[3,2],[0,0],[3,0]]},
] as const;
