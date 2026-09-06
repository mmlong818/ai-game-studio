export const MAX_PIECES = 96;
export const TYPES = ['straight','left','right','up','down','tunnel','bridge'];
export const START = {x:-12,y:0,z:6,a:0};
const clone = value => JSON.parse(JSON.stringify(value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function segment(start,type) {
  if(!TYPES.includes(type)) throw new Error('未知轨道');
  const turn=type==='left'?-1:type==='right'?1:0;
  const rise=type==='up'?2.8:type==='down'?-2.8:0;
  const points=[];
  for(let i=0;i<=24;i++) {
    const t=i/24, angle=turn*Math.PI/2*t;
    const lx=turn?6*Math.sin(Math.abs(angle)):6*t;
    const lz=turn?turn*6*(1-Math.cos(angle)):0;
    points.push({x:start.x+lx*Math.cos(start.a)-lz*Math.sin(start.a),y:start.y+rise*(t*t*(3-2*t)),z:start.z+lx*Math.sin(start.a)+lz*Math.cos(start.a),a:start.a+angle});
  }
  return {type,points,end:points.at(-1)};
}
export function buildRoute(pieces) {
  let end={...START},length=0;const segments=[],points=[{...end,d:0}];
  for(const piece of pieces) {
    const s=segment(end,piece.type);s.color=piece.color??0;s.startDistance=length;
    for(const p of s.points.slice(1)){length+=distance(points.at(-1),p);points.push({...p,d:length});}
    s.endDistance=length;segments.push(s);end=s.end;
  }
  const closed=pieces.length>3&&distance(end,START)<.05&&Math.cos(end.a-START.a)>.999;
  return {segments,points,end,length,closed};
}
export function sample(route,d) {
  d=Math.max(0,Math.min(route.length,d));
  let low=0,high=route.points.length-1;
  while(low+1<high){const mid=(low+high)>>1;if(route.points[mid].d<d)low=mid;else high=mid;}
  const a=route.points[low],b=route.points[high],t=(d-a.d)/(b.d-a.d||1);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,a:a.a+(b.a-a.a)*t,pitch:Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z))};
}
export const starter=()=>['straight','left','straight','left','straight','left','straight'].map(type=>({type,color:0}));
export const loop=()=>[...starter(),{type:'left',color:0}];
export const scenicLoop=()=>['straight','up','bridge','down','left','straight','tunnel','straight','left','straight','straight','straight','straight','left','straight','tunnel','straight','left'].map((type,i)=>({type,color:type==='bridge'?2:type==='tunnel'?1:i<4?0:3}));
export function validateAddition(pieces,type) {
  if(!TYPES.includes(type))return '请选择一种轨道';
  if(pieces.length>=MAX_PIECES)return '轨道盒已装满：最多 96 段，可以撤销后重新设计';
  const route=buildRoute(pieces);
  if(route.closed)return '线路已经闭环；撤销最后一段可以继续搭建';
  if(type==='down'&&route.end.y<2.7)return '已经在地面了，先搭上坡才能下坡';
  if(type==='up'&&route.end.y>11)return '已经很高了，试试平路或下坡';
  const next=segment(route.end,type);
  if(next.points.some(p=>Math.abs(p.x)>54||Math.abs(p.z)>54))return '到了地图边缘，换一个弯道返回草原';
  // Compare centerlines, excluding the connected neighbor. Separated elevated paths may cross.
  for(let i=4;i<next.points.length;i+=2)for(let j=3;j<route.points.length-20;j+=3){
    const p=next.points[i],q=route.points[j];
    if(distance(p,START)<1.8&&distance(next.end,START)<.05&&Math.cos(next.end.a-START.a)>.999)continue;
    if(Math.hypot(p.x-q.x,p.z-q.z)<1.05&&Math.abs(p.y-q.y)<2.2)return '这里会撞上已有轨道，试试转弯或搭高架桥';
  }
  return '';
}
export function createState(pieces=starter()) {
  return {pieces:clone(pieces),history:[],future:[],route:buildRoute(pieces),distance:3.8,previous:3.8,direction:1,running:false,wait:0,time:0,trips:0};
}
export function edit(state,type,color=0) {
  const reason=validateAddition(state.pieces,type);if(reason)return reason;
  state.history.push(clone(state.pieces));state.future=[];
  state.pieces.push({type,color});state.route=buildRoute(state.pieces);return '';
}
export function undo(state,redo=false) {
  const from=redo?state.future:state.history,to=redo?state.history:state.future;
  if(!from.length)return false;to.push(clone(state.pieces));state.pieces=from.pop();state.route=buildRoute(state.pieces);
  normalizePosition(state);return true;
}
function normalizePosition(state){state.distance=Math.max(state.route.closed?0:3.8,Math.min(state.distance,state.route.length));state.previous=state.distance;state.wait=0;}
export function removeLast(state){if(state.pieces.length<=1)return false;state.history.push(clone(state.pieces));state.future=[];state.pieces.pop();state.route=buildRoute(state.pieces);normalizePosition(state);return true;}
export function step(state,dt,speed=3.4) {
  state.previous=state.distance;if(!state.running||!state.route.length)return;
  state.time+=dt;if(state.wait>0){state.wait=Math.max(0,state.wait-dt);return;}
  state.distance+=dt*speed*state.direction;
  if(state.route.closed){if(state.distance>=state.route.length||state.distance<0){state.distance=(state.distance%state.route.length+state.route.length)%state.route.length;state.previous=state.distance;state.trips++;}return;}
  if(state.distance>=state.route.length){state.distance=state.route.length;state.direction=-1;state.wait=1.2;state.trips++;}
  if(state.distance<=3.8){state.distance=3.8;state.direction=1;state.wait=1.2;state.trips++;}
}
export function decodeSave(text) {
  try{const x=JSON.parse(text);if(x.version!==1||!Array.isArray(x.pieces)||!x.pieces.length||x.pieces.length>MAX_PIECES)return null;
    const pieces=[];for(const p of x.pieces){if(!p||!Number.isInteger(p.color)||p.color<0||p.color>3||validateAddition(pieces,p.type))return null;pieces.push({type:p.type,color:p.color});}return pieces;
  }catch{return null;}
}
