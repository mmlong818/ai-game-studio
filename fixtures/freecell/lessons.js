import {createState} from './game-core.js';

export const LESSONS=[
  {name:'借一个空档',detail:'先把亮起的牌放进上方任一空档，为下面的牌让路。',cards:[21],target:null},
  {name:'异色递减',detail:'把红色 6 放到黑色 7 上。颜色交替，点数小一。',cards:[21],target:24},
  {name:'整组搬运',detail:'从黑色 3 拿起 3、2、A，放到红色 4 上。空档越多，整组能搬越长。',cards:[8,5,0],target:13},
];
export function lessonState(index){
  const lesson=LESSONS[index],state=createState(1);
  const lifted=new Set([...lesson.cards,...(lesson.target===null?[]:[lesson.target])]);
  state.columns=state.columns.map(column=>column.filter(card=>!lifted.has(card)));
  state.columns[0].push(...lesson.cards);
  if(lesson.target!==null)state.columns[1].push(lesson.target);
  return state;
}
export function lessonAccepts(index,move){
  return move.from.type==='column'&&move.from.index===0&&move.count===LESSONS[index].cards.length&&
    (index===0?move.to.type==='cell':move.to.type==='column'&&move.to.index===1);
}
