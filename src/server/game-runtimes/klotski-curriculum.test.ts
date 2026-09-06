import {describe,it,expect} from 'vitest';
import {klotskiScript} from './klotski.js';
import {KLOTSKI_COURSE,KLOTSKI_PRACTICE_LAYOUTS} from './klotski-curriculum.js';
function source(name:string){const start=klotskiScript.indexOf('function '+name+'(');return klotskiScript.slice(start,klotskiScript.indexOf('\n}',start)+2);}
const api=new Function('const currentCampaignLevel=()=>({number:1});'+klotskiScript.slice(0,klotskiScript.indexOf('const courtyardArt'))+
  ['klotskiStateKey','klotskiStateCanMove','solveKlotski'].map(source).join('\n')+
  ';return {initial:initialPieces,bank:klotskiBlueprints,solve:solveKlotski};')();
describe('朱门主题课程',()=>{
  it('20个主题关包含入门、变式与综合题，重复使用不计为新题',()=>{
    expect(KLOTSKI_COURSE).toHaveLength(20);
    expect(new Set(KLOTSKI_COURSE.map(item=>item.name)).size).toBe(20);
    for(const course of KLOTSKI_COURSE){
      expect(course.boards.length).toBeGreaterThanOrEqual(3);
      expect(new Set(course.boards).size).toBe(course.boards.length);
      expect(course.boards.every(index=>index>=0&&index<20)).toBe(true);
    }
  });
  it('三张新入门练习及镜像均合法且精确最短',()=>{
    const ids=['cao','guan','z1','z2','s1','s2'];
    for(const entry of KLOTSKI_PRACTICE_LAYOUTS)for(const mirror of [false,true]){
      const pieces=ids.map((id,i)=>{const base=api.initial.find((p:any)=>p.id===id);return {...base,x:mirror?4-base.w-entry.points[i][0]:entry.points[i][0],y:entry.points[i][1]};});
      const occupied=new Set();
      for(const piece of pieces)for(let y=piece.y;y<piece.y+piece.h;y++)for(let x=piece.x;x<piece.x+piece.w;x++){
        expect(x>=0&&x<4&&y>=0&&y<5).toBe(true);expect(occupied.has(x+','+y)).toBe(false);occupied.add(x+','+y);
      }
      const result=api.solve(pieces);expect(result.status).toBe('solved');expect(result.distance).toBe(entry.optimal);
    }
  },30000);
  it('题组内容预算54至156单位步，避免连续堆叠长解题；不代替真人时长',()=>{
    KLOTSKI_COURSE.forEach((course,level)=>{
      const total=course.boards.reduce((sum,index,room)=>sum+(room===0&&level<3?KLOTSKI_PRACTICE_LAYOUTS[level].optimal:api.bank[index][1]),0);
      expect(total).toBeGreaterThanOrEqual(54);expect(total).toBeLessThanOrEqual(156);
    });
  });
  it('题组使用的20张基础题和镜像最短步数重新核验',()=>{
    const ids=['z1','z2','z3','z4','guan','cao','s1','s2','s3','s4'];
    for(const [name,distance,points] of api.bank)for(const mirror of [false,true]){
      const pieces=ids.map((id,i)=>{const base=api.initial.find((p:any)=>p.id===id);return {...base,x:mirror?4-base.w-points[i][0]:points[i][0],y:points[i][1]};});
      const result=api.solve(pieces);expect(result.status,name).toBe('solved');expect(result.distance,name).toBe(distance);
    }
  },60000);
});
