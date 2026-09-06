import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore standalone browser module is intentionally plain JavaScript
import { createRace, drive, stepRace, track, aiInput, RULES, ranking, interpolateCar } from '../fixtures/island-kart/race-core.js';
const advance = (race:any, seconds:number, input:any = {}) => { for (let i = 0; i < seconds * 60; i++) stepRace(race, input, 1 / 60); };

test('玩家前排起跑，对手有反应间隔、不满油门且不会开局自动冲刺',()=>{
  const race=createRace(), player=race.racers[0], opponent=race.racers[1];
  assert.ok(race.racers.slice(1).every((c:any)=>c.s<player.s));
  const first=aiInput(race,opponent);
  assert.ok(first.throttle<1);assert.equal(first.boost,false);
  opponent.offset=6;race.time=.1;
  assert.deepEqual(aiInput(race,opponent),first);
  race.time=1;assert.notEqual(aiInput(race,opponent).steer,first.steer);
  const a=createRace().racers[0], b={...a};
  for(let i=0;i<600;i++) {drive(a,{steer:0},1/60);drive(b,{steer:0,throttle:.93},1/60);}
  assert.ok(a.s>b.s+10,'持续驾驶应能利用对手不满油门留下的超车机会');
});
test('帧间插值平滑车辆位置，但不修改物理状态或在赛道接缝倒退',()=>{
  const car={s:track.length+.2,offset:2,heading:.2,previousPose:{s:track.length-.2,offset:1,heading:.1}};
  const original=structuredClone(car), middle=interpolateCar(car,.5);
  assert.equal(middle.s,track.length);assert.equal(middle.offset,1.5);
  assert.ok(interpolateCar(car,.75).s>interpolateCar(car,.25).s);
  assert.deepEqual(car,original);
});

test('赛道闭合且具有真实高低变化，顺向三圈需要完整距离', () => {
  const a=track.sample(0), b=track.sample(track.length);
  assert.deepEqual(a,b); assert.ok(track.length>1000);
  assert.ok(Math.max(...track.points.map((p:any)=>p.y))-Math.min(...track.points.map((p:any)=>p.y))>6);
  const r=createRace();advance(r,4);assert.equal(r.racers[0].lap,0);assert.equal(r.result,null);
});
test('左右转向连续、对称，护栏可恢复；不是固定换道',()=>{
  const a=createRace().racers[0], b={...a};a.speed=b.speed=25;a.offset=b.offset=0;
  for(let i=0;i<30;i++){drive(a,{steer:-1},1/60);drive(b,{steer:1},1/60);}
  assert.ok(a.offset < -1); assert.ok(b.offset > 1); assert.ok(a.heading<0&&b.heading>0);
  for(let i=0;i<1000;i++)drive(b,{steer:1},1/60);
  assert.ok(Math.abs(b.offset)<=RULES.halfWidth);assert.ok(b.speed>0);assert.ok(b.wallHits>0);
});
test('玩家与 AI 的车辆驱动完全同规则，冲刺有实际消耗与速度上限',()=>{
  const a=createRace().racers[0], b={...a,id:5};
  for(let i=0;i<130;i++){const input={steer:.1,boost:i===0};drive(a,input,1/60);drive(b,input,1/60);}
  for(const key of ['s','offset','speed','energy','boost','heading'])assert.equal(a[key],b[key]);
  assert.ok(a.energy<30);assert.equal(a.boost,0);assert.ok(a.speed<=RULES.boostSpeed);
  const c={...a,energy:0};drive(c,{boost:true},1/60);assert.equal(c.boost,0);
});
test('全场正常驾驶完成三圈，约两分钟以上，结算及圈数稳定',()=>{
  const r=createRace();for(let i=0;i<18000&&r.phase!=='finished';i++)stepRace(r,aiInput(r,r.racers[0]),1/60);
  assert.equal(r.phase,'finished');assert.ok(r.time>=120&&r.time<180);assert.equal(r.lapTimes.length,3);
  assert.ok(r.racers[0].s>=track.length*3);assert.ok(r.result.rank>=1&&r.result.rank<=3);
  assert.equal(r.racers.length,3);
  assert.equal(new Set(ranking(r).map((c:any)=>c.id)).size,3);
  const before=structuredClone(r);advance(r,3);assert.equal(r.time,before.time);assert.deepEqual(r.result,before.result);
});
test('自由驾驶超过三圈不结算，暂停不更新物理、计时或道具',()=>{
  const r=createRace('free');for(let i=0;i<12000;i++)stepRace(r,aiInput(r,r.racers[0]),1/60);
  assert.ok(r.racers[0].lap>=3);assert.equal(r.phase,'racing');assert.equal(r.result,null);
  r.phase='paused';const snapshot=structuredClone(r);advance(r,10);
  assert.equal(r.time,snapshot.time);assert.deepEqual(r.racers,snapshot.racers);assert.deepEqual(r.pickups,snapshot.pickups);
});
test('道具只由经过物品的车获取，倒计时不偷偷发奖',()=>{
  const r=createRace();r.pickups=[{s:0,offset:0,type:'coin',readyAt:0}];r.racers[0].s=-.1;r.racers[0].offset=0;
  advance(r,1);assert.equal(r.racers[0].coins,0);
  r.phase='racing';r.racers[0].speed=20;advance(r,.1);
  assert.equal(r.racers[0].coins,1);assert.ok(r.pickups[0].readyAt>r.time);
});
