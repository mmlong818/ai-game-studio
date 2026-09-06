import { describe, it, expect } from 'vitest';
import { snakeForagingScript } from './snake-foraging.js';
const rules = new Function(snakeForagingScript + ';return {snakeForagingPlan,newSnakeForaging,advanceSnakeForage,snakeFoodReward,snakeShouldSeedFood};')();
describe('青玉采集与巡游机制', () => {
  it('首关至少 120 秒，后续 180–300 秒的有效巡游', () => {
    for (let level=1;level<=20;level++) {
      const plan=rules.snakeForagingPlan(level,'campaign'), state=rules.newSnakeForaging();
      expect(plan.minimumSeconds).toBeGreaterThanOrEqual(level===1?120:180);
      expect(plan.minimumSeconds).toBeLessThanOrEqual(300);
      for(let phase=0;phase<plan.phases;phase++) {
        state.picked=999; state.kinds=['normal','golden']; state.phaseSeconds=29.99;
        expect(rules.advanceSnakeForage(state,plan)).toBe(false);
        expect(state.phase).toBe(phase);
        state.phaseSeconds=30;
        expect(rules.advanceSnakeForage(state,plan)).toBe(phase===plan.phases-1);
      }
    }
  });
  it('时间、数量与两类采集均为真实过段条件', () => {
    const p=rules.snakeForagingPlan(1,'campaign'), s=rules.newSnakeForaging();
    s.phaseSeconds=60;s.picked=8;s.kinds=['normal'];
    expect(rules.advanceSnakeForage(s,p)).toBe(false);
    s.kinds.push('mint');s.picked=7;
    expect(rules.advanceSnakeForage(s,p)).toBe(false);
    s.picked=8;rules.advanceSnakeForage(s,p);
    expect(s.phase).toBe(1);expect(s.picked).toBe(0);expect(s.kinds).toEqual(['normal','mint']);
  });
  it('四类食物各有独立效果，积分不等同于采集数量', () => {
    const s=rules.newSnakeForaging();
    expect(rules.snakeFoodReward(s,'golden',4)).toEqual({points:5,length:5});
    rules.snakeFoodReward(s,'normal',4);rules.snakeFoodReward(s,'normal',4);
    expect(rules.snakeFoodReward(s,'normal',4).length).toBe(5);
    expect(rules.snakeFoodReward(s,'mint',10).length).toBe(11);
    expect(rules.snakeFoodReward(s,'mint',4).length).toBe(5);
    expect(s.agilityUntil).toBe(6);
    s.activeSeconds=50;rules.snakeFoodReward(s,'dew',4);expect(s.magnetUntil).toBe(56);
    expect(s.totalPicked).toBe(7);
  });
  it('无限玩法没有胜利阈值；每次吃食都增长', () => {
    const p=rules.snakeForagingPlan(20,'endless'),s=rules.newSnakeForaging();
    s.phaseSeconds=99999;s.picked=99999;s.kinds=['normal','golden','mint','dew'];
    expect(rules.advanceSnakeForage(s,p)).toBe(false);expect(p.phases).toBe(0);
    s.normalPicked=2;expect(rules.snakeFoodReward(s,'normal',48).length).toBe(49);
  });
  it('关卡仅开局铺食物，无限仅吃空才重铺', () => {
    expect(rules.snakeForagingPlan(1,'campaign').population).toBe(40);
    expect(rules.snakeForagingPlan(20,'campaign').population).toBe(125);
    expect(rules.snakeForagingPlan(1,'endless').population).toBe(64);
    expect(rules.snakeShouldSeedFood('campaign',0,false)).toBe(false);
    expect(rules.snakeShouldSeedFood('endless',1,false)).toBe(false);
    expect(rules.snakeShouldSeedFood('endless',0,false)).toBe(true);
    expect(rules.snakeShouldSeedFood('campaign',50,true)).toBe(true);
    for(let level=1;level<=20;level++) {
      const p=rules.snakeForagingPlan(level,'campaign');
      expect(p.population).toBeGreaterThanOrEqual(p.phases*p.quota);
      expect(p.population).toBe(Math.ceil(p.phases*p.quota*1.25));
    }
  });
  it('提前吃完可携带采集进度，不会在后段因无食物而卡死', () => {
    const p=rules.snakeForagingPlan(1,'campaign'),s=rules.newSnakeForaging();
    for(let i=0;i<p.population;i++)rules.snakeFoodReward(s,i%2?'normal':'golden',4);
    for(let phase=0;phase<p.phases;phase++) {
      s.phaseSeconds=30;
      expect(rules.advanceSnakeForage(s,p)).toBe(phase===p.phases-1);
    }
  });
});
