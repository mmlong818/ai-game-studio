import { describe, expect, it } from "vitest";
import { breakoutGuidanceScript } from "./breakout-guidance.js";
import { breakoutScript } from "./breakout.js";

const { velocity, landing, trace, arrange, lesson } = new Function(breakoutGuidanceScript + ";return { velocity: breakoutReturnVelocity, landing: breakoutLandingX, trace: breakoutTraceReturn, arrange: breakoutArrangePowers, lesson: breakoutLesson };")();
const brick = (id: string, x: number, y: number) => ({ id, x, y, width: 50, height: 30, alive: true });

describe("漆海控角与章节课程", () => {
  it("预告和实际反弹共用速度函数，左右对称、不产生近水平死球", () => {
    for (let offset = -1; offset <= 1; offset += .05) {
      const result = velocity(offset, 12);
      expect(Math.hypot(result.vx, result.vy)).toBeCloseTo(12, 9);
      expect(result.vy).toBeLessThan(-6);
      expect(result.vx).toBeCloseTo(-velocity(-offset, 12).vx, 9);
    }
    expect(breakoutScript).toContain("const velocity = breakoutReturnVelocity(offset, speed)");
    expect(() => new Function(breakoutScript)).not.toThrow();
  });

  it("落点计算含墙面反弹和球半径，不提前预测向上球", () => {
    expect(landing({ x: 650, y: 400, vx: 10, vy: 10, radius: 14 }, 514)).toBeCloseTo(566);
    expect(landing({ x: 70, y: 400, vx: -10, vy: 10, radius: 14 }, 514)).toBeCloseTo(154);
    expect(landing({ x: 360, y: 400, vx: 0, vy: -10, radius: 14 }, 514)).toBeNull();
    expect(landing({ x: 360, y: 510, vx: 0, vy: 10, radius: 14 }, 514)).toBeNull();
  });

  it("预测停在最先撞到的砖，不穿过前排去标记后排", () => {
    const targets = [brick("back", 330, 150), brick("front", 330, 250)];
    const result = trace({ x: 350, y: 500 }, { vx: 0, vy: -10 }, targets, 50);
    expect(result.targetId).toBe("front");
    expect(result.points.at(-1).y).toBe(294);
    expect(targets[1].alive).toBe(true);
  });

  it("真实回球的侧墙折返显示折线，并忽略已清除砖", () => {
    const target = brick("right", 580, 260);
    const result = trace({ x: 640, y: 500 }, { vx: 4, vy: -10 }, [target], 50);
    expect(result.points[1].x).toBe(658);
    expect(result.targetId).toBe("right");
    target.alive = false;
    expect(trace({ x: 640, y: 500 }, { vx: 4, vy: -10 }, [target], 50).targetId).toBeNull();
  });

  it("二十关逐章保证教学能力存在，不靠随机命中概率", () => {
    for (let index = 0; index < 20; index += 1) {
      const targets = Array.from({ length: 40 }, (_, n) => ({ id: String(n), row: Math.floor(n / 8), column: n % 8, kind: "armor", hits: 3, maxHits: 3 }));
      const coordinates = targets.map(({ row, column }) => `${row}:${column}`);
      arrange(targets, index);
      const specials = targets.filter(target => target.kind !== "armor");
      expect(specials.length).toBe([0, 1, 2, 2, 3][Math.floor(index / 4)]);
      expect(targets.map(({ row, column }) => `${row}:${column}`)).toEqual(coordinates);
      if (index >= 4) expect(specials.some(target => target.kind === "shield")).toBe(true);
      if (index >= 12) expect(specials.some(target => target.kind === "pierce")).toBe(true);
      specials.forEach(target => expect(target.hits).toBe(1));
      expect(lesson(index).title.length).toBeGreaterThan(0);
    }
  });

  it("能力课先给可接近入口，不将唯一能力放在最深行", () => {
    const targets = Array.from({ length: 40 }, (_, n) => ({ row: Math.floor(n / 8), column: n % 8, kind: "normal", hits: 1, maxHits: 1 }));
    arrange(targets, 4);
    expect(targets.find(target => target.kind === "shield")?.row).toBe(4);
    const again = targets.map(target => ({ ...target, kind: "normal" }));
    arrange(again, 4);
    expect(again).toEqual(targets);
  });

  it("限时和宽板使用有效游玩时钟，暂停期间不消耗", () => {
    expect(breakoutScript).toContain("Math.floor(activeElapsed / 1000)");
    expect(breakoutScript).toContain("Math.max(widePaddleUntil, activeElapsed) + 10_000");
    expect(breakoutScript).not.toContain("performance.now() < widePaddleUntil");
    const start = breakoutScript.indexOf("function updateBreakout(delta)");
    const update = breakoutScript.slice(start, breakoutScript.indexOf('window.addEventListener("forge:onboarding-signal"', start));
    expect(update.indexOf("if (onboardingIsActive())")).toBeLessThan(update.indexOf("activeElapsed += activeDelta"));
  });

  it("运行真实更新函数：教学安全等待、异常大帧间隔和有效时长一致", () => {
    const extract = (name: string) => {
      const start = breakoutScript.indexOf(`function ${name}(`);
      return breakoutScript.slice(start, breakoutScript.indexOf("\n}\n", start) + 2);
    };
    const runtime = new Function(`
      let activeElapsed=0, widePaddleUntil=10000, modeStartedAt=1, breakoutMode="time-attack", timeAttackSeconds=120;
      let onboarding=true, focusActive=false, focusTimeScale=.55, serveDelay=0;
      let physicsUnits=0;
      let paddle={ x:100, width:118, baseWidth:118, y:500 }, ball={};
      function breakoutLayout(){return {};}
      function onboardingIsActive(){return onboarding;}
      function syncActivePaddleWidth(){}
      function updateFocus(){}
      function updateBrickFragments(){}
      function advanceBallPhysics(scale){physicsUnits+=scale;}
      function showTerminalResult(){}
      ${extract("timeAttackRemaining")}
      ${extract("activePaddleWidth")}
      ${extract("updateBreakout")}
      return {tick:updateBreakout, start:()=>{onboarding=false;}, reset:()=>{activeElapsed=0;physicsUnits=0;}, distance:()=>physicsUnits, state:()=>({activeElapsed, time:timeAttackRemaining(),width:activePaddleWidth()})};
    `)();
    runtime.tick(50000);
    expect(runtime.state()).toEqual({ activeElapsed: 0, time: 120, width: 156 });
    runtime.start();
    for (let i = 0; i < 100; i += 1) runtime.tick(16);
    expect(runtime.state()).toEqual({ activeElapsed: 1600, time: 119, width: 156 });
    runtime.tick(20000);
    expect(runtime.state().activeElapsed).toBe(1700);
    for (let i = 0; i < 83; i += 1) runtime.tick(100);
    expect(runtime.state()).toEqual({ activeElapsed: 10000, time: 110, width: 118 });
    runtime.reset();
    for (let i = 0; i < 60; i += 1) runtime.tick(1000 / 60);
    const smooth = runtime.distance();
    runtime.reset();
    for (let i = 0; i < 20; i += 1) runtime.tick(50);
    expect(runtime.distance()).toBeCloseTo(smooth, 9);
    expect(runtime.state().activeElapsed).toBe(1000);
    expect(runtime.distance()).toBeCloseTo(1000 / 16.67, 9);
  });

  it("真实挡板接触函数按接触线插值回球，含同子步墙反弹与擦边漏球", () => {
    const start = breakoutScript.indexOf("function resolvePaddleBounce(");
    const end = breakoutScript.indexOf("function reflectBallFromBrick(", start);
    const run = new Function("initial", "previous", "board", breakoutGuidanceScript + `
      let ball={...initial}, paddle={...board}, breakoutMode="campaign", boardsCleared=0, paddleReturns=0,lastGuidedTarget=null,bricks=[];
      function currentLevel(){return {speed:20};}
      function breakoutLayout(){return {top:48};}
      function playSound(){}
      ${breakoutScript.slice(start, end)}
      const caught=resolvePaddleBounce(previous.x,previous.y);
      return {caught,ball,paddleReturns};
    `);
    const board = { x: 301, y: 632, width: 118 };
    const previous = { x: 350, y: 610 };
    const initial = { x: 368, y: 625, vx: 12, vy: 10, radius: 14 };
    const preview = landing({ ...initial, ...previous }, board.y);
    const result = run(initial, previous, board);
    expect(result.caught).toBe(true);
    expect(result.ball.x).toBeCloseTo(preview, 10);
    const expected = velocity((preview - 360) / 59, Math.hypot(12, 10) * 1.022);
    expect(result.ball.vx).toBeCloseTo(expected.vx, 10);
    expect(result.ball.vy).toBeCloseTo(expected.vy, 10);
    expect(result.paddleReturns).toBe(1);
    const wall = run({ ...initial, x: 668 }, { x: 650, y: 610 }, { ...board, x: 550 });
    expect(wall.caught).toBe(true);
    expect(wall.ball.x).toBeCloseTo(656.4, 10);
    const miss = run({ ...initial, x: 412, vx: -12 }, { x: 430, y: 610 }, { x: 300, y: 632, width: 100 });
    expect(miss.caught).toBe(false);
    expect(miss.paddleReturns).toBe(0);
  });
});
