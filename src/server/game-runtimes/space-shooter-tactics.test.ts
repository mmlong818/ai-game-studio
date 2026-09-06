import { describe, expect, it } from "vitest";
import { spaceShooterScript } from "./space-shooter.js";
function source(name: string) {
  const start = spaceShooterScript.indexOf("function " + name + "(");
  const end = spaceShooterScript.indexOf("\n}", start + 1);
  return spaceShooterScript.slice(start, end + 2);
}
describe("星环连续作战与关后强化", () => {
  it("20关均按有效作战时间铺开编队，首关120秒，后续180至300秒", () => {
    for (let number = 1; number <= 20; number++) {
      const result = new Function(`
        const currentCampaignLevel = () => ({number:${number},tier:Math.ceil(${number}/4)});
        const shooterEnemyKinds=["scout","weaver","charger","turret","shield"];
        ${source("estimatedShooterSessionSeconds")}
        ${source("shooterLevelBlueprints")}
        return {seconds:estimatedShooterSessionSeconds(),plans:shooterLevelBlueprints()};
      `)();
      expect(result.seconds).toBe(number === 1 ? 120 : 180 + Math.floor((number - 2) / 4) * 30);
      expect(result.plans).toHaveLength(3);
      expect(result.plans.reduce((sum:number,p:any)=>sum+p.durationMs,0)).toBe(result.seconds*1000);
      for (const plan of result.plans) {
        expect(plan.count).toBeGreaterThan(20);
        expect(plan.durationMs / (plan.count - 1)).toBeGreaterThan(1700);
        expect(plan.durationMs / (plan.count - 1)).toBeLessThan(1900);
      }
    }
  });
  it("清空早期敌机不能提前过关，三阶段无选择等待，最后只结算一次", () => {
    const game = new Function(`
      let shooterActiveMs=0,shooterStageStartedMs=0,shooterWaveIndex=0,shooterWaveCount=3;
      let shooterWavePlans=[0,1,2].map(()=>({count:23,durationMs:40000,label:"连续作战"}));
      let shooterWaveSpawned=23,enemies=[],shooterWaveHits=0,shooterCleanWaves=0;
      let shooterWaveDefeated=0,shooterIntermissionUntil=0,nextEnemyAt=0,shooterWaveBannerText="",shooterWaveBannerUntil=0;
      const shooterInputAuditActive=false,setStatus=()=>{};let results=0;
      const finishShooterLevel=()=>results++;
      ${source("shooterWaveComplete")}
      return {tick:(ms)=>{shooterActiveMs=ms;shooterWaveSpawned=23;return shooterWaveComplete(ms);},
        state:()=>({results,shooterWaveIndex,shooterIntermissionUntil,shooterCleanWaves})};
    `)();
    game.tick(15000); expect(game.state().shooterWaveIndex).toBe(0);
    game.tick(40000); expect(game.state().shooterIntermissionUntil).toBe(40000);
    game.tick(80000); expect(game.state().shooterWaveIndex).toBe(2);
    game.tick(119999); expect(game.state().results).toBe(0);
    game.tick(120000); game.tick(121000); expect(game.state().results).toBe(1);
    expect(game.state().shooterCleanWaves).toBe(3);
  });
  it("升级面板不在波次和帧循环中打开，教学不累计有效时间", () => {
    expect(source("shooterWaveComplete")).not.toContain("openShooterSupply");
    expect(source("updateShooter")).not.toContain("renderShooterReward");
    const update=source("updateShooter");
    expect(update.indexOf("if (onboardingIsActive())")).toBeLessThan(update.indexOf("shooterActiveMs +="));
    expect(source("startGame")).toContain('readShooterRewards()[currentCampaignLevel().number - 1]');
    expect(source("startGame")).toContain('shooterActiveMs = 0');
  });
});
describe("星环突围攻击预告", () => {
  it("Boss锁定后给予850ms反应时间，移动不会改变这次攻击方向", () => {
    const game = new Function(`
      let ship = { x: 320, y: 600, width: 80, height: 104 }, shooterBossPhase = 1;
      const shooterDifficultyProfile = () => ({fireRate: 1});
      const currentCampaignLevel = () => ({tier: 1});
      const shooterEnemyStats = () => ({delay: 380});
      let shots = [];
      const aimShooterBullet = (enemy) => shots.push(enemy.lockedAim);
      ${source("fireShooterEnemy")}
      const enemy = {kind:'boss', x:270, y:138, width:180, height:136, shotAt:0, warningUntil:0};
      fireShooterEnemy(enemy, 1000); const aim = enemy.lockedAim;
      ship.x = 50; fireShooterEnemy(enemy, 1849); const before = shots.length;
      fireShooterEnemy(enemy, 1850);
      return {before, shots, aim, nextShot:enemy.shotAt, reset:enemy.lockedAim};
    `)();
    expect(game.before).toBe(0);
    expect(game.shots).toHaveLength(5);
    expect(game.shots.every((aim: number) => aim === game.aim)).toBe(true);
    expect(game.nextShot).toBe(2230);
    expect(game.reset).toBeUndefined();
  });
});
