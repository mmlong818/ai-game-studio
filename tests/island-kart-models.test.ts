import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
// @ts-ignore Local generated CC0 mesh data; no runtime loader dependency.
import {models} from '../fixtures/island-kart/assets/models/kenney-models.js';

test('精选模型有完整许可、有限数值与本地预算',()=>{
  const folder=new URL('../fixtures/island-kart/assets/models/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',folder),'utf8'));
  assert.equal(Object.keys(models).length,9);
  for(const entry of manifest) {
    assert.equal(entry.license,'CC0-1.0');assert.match(entry.sha256,/^[a-f0-9]{64}$/);
    assert.match(readFileSync(new URL(entry.pack+'-LICENSE.txt',folder),'utf8'),/commercial/);
    const model=models[entry.name];let triangles=0;
    for(const part of model.parts) {
      assert.equal(part.position.length%9,0);
      assert.equal(part.position.length,part.normal.length);assert.equal(part.position.length,part.color.length);
      for(const key of ['position','normal','color'])assert.ok(part[key].every(Number.isFinite));
      triangles+=part.position.length/9;
    }
    assert.equal(triangles,entry.triangles);assert.ok(triangles<4000);
  }
  assert.ok(statSync(new URL('kenney-models.js',folder)).size<2_200_000);
});

test('三辆车各自保留角色、四个车轮和两个前轮，不把动画部件合死',()=>{
  for(const name of ['kart-oopi','kart-oodi','kart-oobi']) {
    const parts=models[name].parts;
    assert.ok(parts.some((p:any)=>p.name==='character'));
    assert.equal(parts.filter((p:any)=>p.name.startsWith('wheel-')).length,4);
    assert.equal(parts.filter((p:any)=>p.name.startsWith('wheel-front')).length,2);
  }
});
