import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createQuality} from '../fixtures/island-kart/adaptive-quality.js';

test('independent artifacts carry the same quality policy',()=>{
  assert.equal(readFileSync('fixtures/island-kart/adaptive-quality.js','utf8'),readFileSync('fixtures/meadow-railway/adaptive-quality.js','utf8'));
});
test('pixel budget covers high DPI and 4K; weak hardware starts balanced',()=>{
  const q=createQuality({cores:4,memory:4});
  assert.equal(q.profile().name,'balanced');
  for(const [w,h] of [[3840,2160],[1920,1080],[390,844]]) {
    assert.ok(w*h*q.ratio(w,h,3)**2<=1000001);
    assert.ok(q.ratio(w,h,3)<=1);
  }
});
test('sustained slow frames lower quality, single hitch does not; instances stay independent',()=>{
  const q=createQuality(), other=createQuality();
  for(let i=0;i<600;i++)q.sample(16.67);
  q.sample(300);
  for(let i=0;i<300;i++)q.sample(16.67);
  assert.equal(q.profile().name,'high');
  for(let i=0;i<400;i++)q.sample(40);
  assert.equal(q.profile().name,'low');
  assert.equal(other.profile().name,'high');
  assert.ok(q.profile().particles>0);
  q.reset();
  for(let i=0;i<600;i++)q.sample(16.67);
  assert.equal(q.profile().name,'low','no mid-game quality oscillation');
});
