import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { inspectShooterContinuousInput } from "../src/server/browser-quality.js";
import { openTestDatabase } from "../src/server/database.js";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact.js";
import { StudioRepository } from "../src/server/studio-repository.js";

const firstArgument = process.argv[2];
const suppliedRoot = firstArgument && !/^\d+$/.test(firstArgument) ? resolve(firstArgument) : null;
const requestedDuration = Number(suppliedRoot ? process.argv[3] ?? 600_000 : firstArgument ?? 600_000);
if (!Number.isFinite(requestedDuration) || requestedDuration < 3_000) {
  throw new Error("持续输入验收时长必须至少为 3000ms。 ");
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const artifactRoot = suppliedRoot ?? resolve("data", "quality", `stage-c-shooter-${stamp}`);
if (suppliedRoot && !existsSync(suppliedRoot)) throw new Error(`验收产物目录不存在：${suppliedRoot}`);

const database = suppliedRoot ? null : await openTestDatabase();
try {
  if (database) {
    mkdirSync(artifactRoot, { recursive: true });
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    const project = await repository.create({
      title: "星环突围 · 十分钟持续输入验收",
      idea: "做一个太空射击游戏，按住拖动飞船持续规避敌机，并完成目标击破数。",
      template: "space-shooter",
      dimensions: "2d",
      aspectRatio: "9:16",
      difficulty: "standard",
    });
    writeDesignDocuments(artifactRoot, project);
    writeGameArtifact(artifactRoot, project);
  }
  console.log(`验收产物：${artifactRoot}`);
  const result = await inspectShooterContinuousInput(artifactRoot, requestedDuration, (elapsedMs, state) => {
    const runtime = (state as any)?.runtime ?? {};
    console.log(`持续输入 ${Math.floor(elapsedMs / 60_000)} 分钟：拖动 ${runtime.pointerMoves ?? 0} 次，帧 ${runtime.frameCount ?? 0}，状态正常。`);
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await database?.close();
}
