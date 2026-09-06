import { KLOTSKI_COURSE, KLOTSKI_PRACTICE_LAYOUTS } from '../../shared/klotski-course.js';
export { KLOTSKI_COURSE, KLOTSKI_PRACTICE_LAYOUTS } from '../../shared/klotski-course.js';
export const klotskiCurriculumScript = "const klotskiPracticeLayouts = "+JSON.stringify(KLOTSKI_PRACTICE_LAYOUTS)+";\nconst klotskiCourse = "+JSON.stringify(KLOTSKI_COURSE)+";\n"+String.raw`
let klotskiRoomIndex=0;
let klotskiRoomResults=[];
let klotskiMissionMs=0;
let klotskiClockAt=0;
let klotskiRoomHints=0;
let klotskiRoomUndo=0;
let klotskiRoomHandoff=false;
let klotskiResultSummary=null;
function currentKlotskiCourse(){return klotskiCourse[Math.max(0,Math.min(19,currentCampaignLevel().number-1))];}
function currentKlotskiRoom(){const index=Math.min(klotskiRoomIndex,currentKlotskiCourse().boards.length-1);return {layout:currentKlotskiCourse().boards[index],mirror:index%2===1};}
function klotskiRoomOptimal(index){return index===0&&currentCampaignLevel().number<=3?klotskiPracticeLayouts[currentCampaignLevel().number-1].optimal:klotskiBlueprints[currentKlotskiCourse().boards[index]][1];}
function klotskiCourseTotals(){
  return {moves:klotskiRoomResults.reduce((sum,r)=>sum+r.path.length,0)+moves,
    optimal:currentKlotskiCourse().boards.reduce((sum,_,index)=>sum+klotskiRoomOptimal(index),0),
    hints:klotskiRoomResults.reduce((sum,r)=>sum+r.hints,0)+klotskiRoomHints};
}
`;
