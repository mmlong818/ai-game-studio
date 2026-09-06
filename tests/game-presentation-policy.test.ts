import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gamePresentationPolicy, GAME_DESIGN_PRINCIPLES, gameDesignPrinciplesPrompt } from '../src/shared/game-presentation-policy.js';

test('所有游戏保留核心反馈与独立边界，3D 专项不强加到 2D', () => {
  for (const is3d of [false, true]) {
    const policy = gamePresentationPolicy(is3d);
    assert.match(policy, /核心反馈不可作为优化牺牲品/);
    assert.match(policy, /游戏实例独立/);
    assert.match(policy, /自动测试不能代替人工观感评审/);
    assert.equal(policy.includes('3D 专项要求'), is3d);
  }
});

test('生成系统提示实际接入共享表现规则', () => {
  const source = readFileSync(new URL('../src/server/game-generator.ts', import.meta.url), 'utf8');
  assert.match(source, /runtimeContract\(is3d\),\s*gamePresentationPolicy\(is3d\),/);
});

test('设计复盘原则有独立编号、适用范围、来源与审核问题，设计和生成均使用',()=>{
  assert.equal(new Set(GAME_DESIGN_PRINCIPLES.map(p=>p.id)).size,GAME_DESIGN_PRINCIPLES.length);
  for(const p of GAME_DESIGN_PRINCIPLES) {
    assert.ok(p.scope&&p.source&&p.review&&p.principle);
    assert.ok(gameDesignPrinciplesPrompt().includes(p.id));
    assert.ok(gamePresentationPolicy(false).includes(p.id));
  }
  assert.match(gameDesignPrinciplesPrompt(),/技术预算不能伪装成玩法规则/);
  const source=readFileSync(new URL('../src/server/design-contract.ts',import.meta.url),'utf8');
  assert.match(source,/gameDesignPrinciplesPrompt\(\),/);
});
