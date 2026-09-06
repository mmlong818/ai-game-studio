import { z } from "zod";
import type { DesignIntegrationPlan } from "./integrator.js";
import { designIntegrationPlanSchema, integrateGameDesign } from "./integrator.js";
import { knowledgeMappingForTemplate } from "./official-mapping.js";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";
import type { GameDesignKnowledgeLibrary } from "./index.js";

type ShadowInput = {
  idea: string;
  template?: string | null;
  dimensions?: "auto" | "2d" | "3d";
  inputModes?: string[];
  threeMode?: "collector" | "arena" | "popup" | null;
};

type ShadowAnalysis = {
  template?: string | null;
  dimensions?: "2d" | "3d" | null;
  threeMode?: "collector" | "arena" | "popup" | null;
};

export const designKnowledgeShadowSchema = z.object({
  mode: z.literal("shadow"),
  productionTemplate: z.string().min(1),
  productionPatternId: z.string().min(1).nullable(),
  agreement: z.enum(["exact", "compatible", "disagree", "unmapped"]),
  note: z.string().min(1),
  plan: designIntegrationPlanSchema,
}).strict();

export type DesignKnowledgeShadow = z.infer<typeof designKnowledgeShadowSchema>;

export function createDesignKnowledgeShadow(
  input: ShadowInput,
  analysis: ShadowAnalysis | null = null,
  library: GameDesignKnowledgeLibrary = GAME_DESIGN_KNOWLEDGE_LIBRARY,
): DesignKnowledgeShadow {
  const templateId = input.template && input.template !== "auto" ? input.template : analysis?.template ?? null;
  const dimensions = input.dimensions && input.dimensions !== "auto"
    ? input.dimensions === "3d" ? "limited-3d" as const : "2d" as const
    : analysis?.dimensions === "3d" ? "limited-3d" as const : "2d" as const;
  const modes = input.inputModes ?? [];
  const primaryInput = modes.some((mode) => mode.includes("touch") || mode === "swipe" || mode === "drag")
    ? "touch" as const
    : modes.includes("keyboard") ? "keyboard" as const : "touch" as const;
  const threeMode = input.threeMode ?? analysis?.threeMode ?? null;
  const knowledgeTemplateId = dimensions === "limited-3d" && templateId !== "generated"
    ? threeMode === "popup" ? "paper-popup" : threeMode === "arena" ? "three-arena" : "three-collector"
    : templateId;
  const plan: DesignIntegrationPlan = integrateGameDesign({ idea: input.idea, templateId: knowledgeTemplateId, dimensions, input: primaryInput }, library);
  const productionTemplate = templateId ?? "unresolved";
  const productionPatternId = knowledgeMappingForTemplate(knowledgeTemplateId)?.patternId ?? null;
  const agreement = !productionPatternId
    ? "unmapped" as const
    : plan.selectedPatternId === productionPatternId
      ? "exact" as const
      : plan.selectedPatternId === null
        ? "disagree" as const
        : "compatible" as const;
  return designKnowledgeShadowSchema.parse({
    mode: "shadow",
    productionTemplate,
    productionPatternId,
    agreement,
    note: agreement === "exact"
      ? "知识库策划与当前生产模板精确一致。"
      : agreement === "compatible"
        ? "知识库给出相邻玩法，需积累比较数据后再决定是否调整生产路由。"
        : agreement === "disagree"
          ? "知识库未支持当前生产选择，必须人工复核。"
          : "当前生产模板尚无官方知识映射，影子结果只用于研究。",
    plan,
  });
}
