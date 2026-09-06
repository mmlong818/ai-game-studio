import { describe, expect, it } from 'vitest';
import { snakeScript } from './snake.js';

describe('青玉进食视觉反馈', () => {
  it('龙头与身体不因转向或进食缩放，也不覆盖旧进食图', () => {
    expect(snakeScript).not.toMatch(/growthPulseUntil|turnPulseUntil|drawBitmapImage\(stageCImages\[6\]/);
    expect(snakeScript).toContain('const scale = (head ? 2.18 : tail ? 1.72 : 1.66) * look.scale;');
  });
  it('消失效果使用原食物位置和图片，绘制在龙身下面', () => {
    expect(snakeScript).toContain('snakePickupEffects.push({ x:item.x, y:item.y, kind:item.kind, until:performance.now()+220 })');
    expect(snakeScript.indexOf('snakePickupEffects.forEach')).toBeLessThan(snakeScript.indexOf('parts.slice().reverse()'));
    expect(snakeScript).toContain('snakePickupEffects = snakePickupEffects.filter(effect => timestamp < effect.until)');
  });
});
