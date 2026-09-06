import { OFFICIAL_GAMES, type OfficialGameId } from "../official-games/index.js";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";

export type OfficialKnowledgeMapping = {
  officialGameId: OfficialGameId;
  templateId: string;
  serverTemplate: string | null;
  patternId: string;
  mechanicIds: string[];
  rationale: string;
  lifecycle: "verified" | "candidate";
};

export const TEMPLATE_KNOWLEDGE_MAPPINGS = [{
  templateId: "signal-hunt",
  patternId: "timed-target-hunt",
  mechanicIds: ["target-acquisition"],
  rationale: "移动目标、限时捕获和数量进度构成完整且已验证的短局循环。",
  lifecycle: "verified" as const,
}, {
  templateId: "three-collector",
  patternId: "third-person-collection",
  mechanicIds: ["spatial-navigation"],
  rationale: "三维移动、跳跃、检查点与可选收集共同构成已验证探索循环。",
  lifecycle: "verified" as const,
}, {
  templateId: "three-arena",
  patternId: "wave-shooter",
  mechanicIds: ["projectile-wave"],
  rationale: "第三人称走位、主动发射、敌人波次与局内强化构成竞技场循环。",
  lifecycle: "verified" as const,
}];

export const OFFICIAL_GAME_KNOWLEDGE_MAPPINGS: OfficialKnowledgeMapping[] = OFFICIAL_GAMES.map((game) => {
  const pattern = GAME_DESIGN_KNOWLEDGE_LIBRARY.patterns.find(({ id }) => id === game.knowledge.patternId);
  if (!pattern) throw new Error(`官方游戏 ${game.id} 映射的玩法不存在：${game.knowledge.patternId}`);
  return {
    officialGameId: game.id,
    templateId: game.domainTemplate.id,
    serverTemplate: game.serverTemplate ?? null,
    lifecycle: pattern.lifecycle === "verified" ? "verified" : "candidate",
    ...game.knowledge,
  };
});

export function knowledgeMappingForTemplate(templateId: string | null | undefined) {
  return templateId
    ? OFFICIAL_GAME_KNOWLEDGE_MAPPINGS.find((mapping) => mapping.templateId === templateId || mapping.officialGameId === templateId)
      ?? TEMPLATE_KNOWLEDGE_MAPPINGS.find((mapping) => mapping.templateId === templateId)
      ?? OFFICIAL_GAME_KNOWLEDGE_MAPPINGS.find((mapping) => mapping.serverTemplate === templateId)
      ?? null
    : null;
}
