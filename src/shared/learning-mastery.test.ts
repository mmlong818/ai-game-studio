import { expect, it } from 'vitest';
import { createCampaignLevels } from './level-progression.js';

it('折光全部关卡用实际模式技巧证据评价，而非只奖励硬降',()=>{
  const levels=createCampaignLevels('tetris','standard');
  expect(levels).toHaveLength(20);
  for(const level of levels){
    expect(level.masteryRules.find(rule=>rule.id==='control')).toMatchObject({metric:'skillGoalAchieved',comparison:'gte',target:1});
  }
});

it('星灵独立掌握依据已使用帮助，不能反向使用剩余提示数',()=>{
  const levels=createCampaignLevels('region-logic','standard');
  for(const level of levels){
    expect(level.masteryRules.find(rule=>rule.id==='efficiency')).toMatchObject({metric:'assistanceUsed',comparison:'lte',target:0});
  }
});
