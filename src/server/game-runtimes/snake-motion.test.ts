import { describe, it, expect } from 'vitest';
import { snakeMotionScript } from './snake-motion.js';
const advance = new Function(snakeMotionScript + ';return advanceSnakeMotion;')();
const options = { speed: 5, turnRate: 3.6, width: 42, height: 48, obstacles: [], selfCollision: true, wrap: false };
const body = () => [{ x: 20, y: 20 }, { x: 19.2, y: 20 }, { x: 18.4, y: 20 }, { x: 17.6, y: 20 }];
describe('青玉连续移动', () => {
  it('斜向移动保持速度，不会变成十字转向', () => {
    const result = advance(body(), Math.PI / 4, Math.PI / 4, .2, options);
    expect(result.parts[0].x).toBeCloseTo(20 + Math.SQRT1_2, 5);
    expect(result.parts[0].y).toBeCloseTo(20 + Math.SQRT1_2, 5);
    expect(result.distance).toBeCloseTo(1, 5);
  });
  it('30 与 120 帧率得到相同轨迹', () => {
    const run = (fps: number) => {
      let parts = body(), angle = 0;
      for (let i = 0; i < fps; i++) { const result = advance(parts, angle, 1, 1 / fps, options); parts = result.parts; angle = result.angle; }
      return parts[0];
    };
    expect(run(30).x).toBeCloseTo(run(120).x, 6);
    expect(run(30).y).toBeCloseTo(run(120).y, 6);
  });
  it('掉帧时也不会穿过庭石，输入不被修改', () => {
    const parts = body();
    const result = advance(parts, 0, 0, .25, { ...options, speed: 20, obstacles: [{ x: 22, y: 20 }] });
    expect(result.reason).toBe('撞到庭石');
    expect(result.parts[0].x).toBeLessThan(22);
    expect(parts).toEqual(body());
  });
  it('反向意图逐步转弯而非瞬间折返；零时长不前进', () => {
    expect(advance(body(), 0, Math.PI, .1, options).angle).toBeCloseTo(.36, 6);
    expect(advance(body(), 0, 0, 0, options).parts).toEqual(body());
  });
  it('标准边界会碰撞，轻松越界保持身体连续', () => {
    const parts = [{ x: 41.9, y: 20 }, { x: 41.1, y: 20 }, { x: 40.3, y: 20 }];
    expect(advance(parts, 0, 0, .1, options).reason).toBe('撞到庭园边界');
    const wrapped = advance(parts, 0, 0, .1, { ...options, wrap: true });
    expect(wrapped.reason).toBe('');
    expect(wrapped.parts[0].x).toBeCloseTo(.4, 5);
    for (let i = 1; i < wrapped.parts.length; i++) expect(Math.hypot(wrapped.parts[i].x - wrapped.parts[i - 1].x, wrapped.parts[i].y - wrapped.parts[i - 1].y)).toBeLessThanOrEqual(.800001);
  });
  it('标准自撞检测生效，轻松模式允许穿过身体', () => {
    const parts = [...body(), { x: 20.3, y: 20 }];
    expect(advance(parts, 0, 0, .2, options).reason).toBe('撞到自己的身体');
    expect(advance(parts, 0, 0, .2, { ...options, selfCollision: false }).reason).toBe('');
  });
});
