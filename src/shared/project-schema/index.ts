import { z } from "zod";
import { PLATFORM_RELEASE, PROJECT_FORMAT_VERSION } from "../platform-version.js";

const identifierSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const vector2Schema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const projectReferenceKindSchema = z.enum(["scene", "object", "instance", "behavior", "rule", "resource"]);
const projectReferenceSchema = z.object({
  kind: projectReferenceKindSchema,
  id: identifierSchema,
}).strict();

const behaviorBindingSchema = z.object({
  id: identifierSchema,
  moduleId: identifierSchema,
  moduleVersion: z.string().trim().min(1).max(40),
  enabled: z.boolean().default(true),
  parameters: z.record(z.string(), z.unknown()).default({}),
}).strict();

const gameObjectSchema = z.object({
  id: identifierSchema,
  name: z.string().trim().min(1).max(100),
  role: z.enum(["player", "hazard", "collectible", "background", "interface", "effect", "helper"]),
  renderer: z.enum(["dom", "canvas-2d", "webgl"]),
  resourceIds: z.array(identifierSchema).default([]),
  behaviors: z.array(behaviorBindingSchema).default([]),
}).strict();

const gameInstanceSchema = z.object({
  id: identifierSchema,
  objectId: identifierSchema,
  parentInstanceId: identifierSchema.nullable().default(null),
  position: vector2Schema,
  size: z.object({ width: z.number().positive(), height: z.number().positive() }).strict(),
  anchor: vector2Schema.default({ x: 0.5, y: 0.5 }),
  layer: z.number().int(),
  visible: z.boolean().default(true),
  overrides: z.record(z.string(), z.unknown()).default({}),
}).strict();

const gameSceneSchema = z.object({
  id: identifierSchema,
  name: z.string().trim().min(1).max(100),
  instances: z.array(gameInstanceSchema).default([]),
}).strict();

const ruleInstructionSchema = z.object({
  type: identifierSchema,
  parameters: z.record(z.string(), z.unknown()).default({}),
  references: z.array(projectReferenceSchema).default([]),
}).strict();

const gameRuleSchema = z.object({
  id: identifierSchema,
  name: z.string().trim().min(1).max(140),
  sceneId: identifierSchema.nullable().default(null),
  enabled: z.boolean().default(true),
  priority: z.enum(["P0", "P1", "P2"]),
  when: z.array(ruleInstructionSchema).min(1),
  then: z.array(ruleInstructionSchema).min(1),
}).strict();

const gameResourceSchema = z.object({
  id: identifierSchema,
  role: z.enum(["player", "background", "obstacle", "collectible", "effect", "interface", "audio", "font", "model"]),
  path: z.string().trim().min(1).refine(
    (path) => !path.includes("\\") && !path.startsWith("/") && !path.split("/").includes("..") && !/^[A-Za-z][A-Za-z\d+.-]*:/.test(path),
    "资源路径必须是工程内的安全相对路径",
  ),
  mimeType: z.string().trim().min(1),
  contentHash: z.string().trim().min(8),
  provenance: z.enum(["ai-generated", "project-owned", "licensed", "system"]),
  license: z.string().trim().min(1),
}).strict();

const projectVariableSchema = z.object({
  id: identifierSchema,
  scope: z.enum(["global", "scene", "object"]),
  ownerId: identifierSchema.nullable().default(null),
  initialValue: z.unknown(),
  persistent: z.boolean().default(false),
}).strict();

const acceptanceSchema = z.object({
  id: identifierSchema,
  label: z.string().trim().min(1),
  kind: z.enum(["rule", "asset", "viewport", "performance", "accessibility", "game-feel", "manual"]),
  ruleIds: z.array(identifierSchema).default([]),
  behaviorIds: z.array(identifierSchema).default([]),
}).strict();

const controlsSchema = z.object({
  keyboard: z.boolean(),
  pointer: z.boolean(),
  touch: z.boolean(),
  gamepad: z.boolean().default(false),
}).strict();

const presentationSchema = z.object({
  aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16"]),
  targetFps: z.number().int().min(30).max(240),
  responsive: z.boolean(),
}).strict();

const metadataSchema = z.object({
  id: identifierSchema,
  title: z.string().trim().min(1).max(120),
  platformRelease: z.literal(PLATFORM_RELEASE),
  projectFormat: z.literal(PROJECT_FORMAT_VERSION),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

function addDuplicateIssues(values: Array<{ id: string }>, path: Array<string | number>, context: z.core.$RefinementCtx) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      context.addIssue({ code: "custom", path: [...path, index, "id"], message: `ID 重复：${value.id}` });
    }
    seen.add(value.id);
  });
}

export const gameProjectV3Schema = z.object({
  metadata: metadataSchema,
  migration: z.object({
    source: z.literal("legacy-1.0"),
    sourceProjectId: z.string().min(1),
    sourceSpecVersion: z.number().int().positive(),
    migratedAt: z.string().datetime(),
  }).strict().nullable().default(null),
  startSceneId: identifierSchema,
  scenes: z.array(gameSceneSchema).min(1),
  objects: z.array(gameObjectSchema).default([]),
  rules: z.array(gameRuleSchema).default([]),
  variables: z.array(projectVariableSchema).default([]),
  resources: z.array(gameResourceSchema).default([]),
  controls: controlsSchema,
  presentation: presentationSchema,
  acceptance: z.array(acceptanceSchema).default([]),
}).strict().superRefine((project, context) => {
  addDuplicateIssues(project.scenes, ["scenes"], context);
  addDuplicateIssues(project.objects, ["objects"], context);
  addDuplicateIssues(project.rules, ["rules"], context);
  addDuplicateIssues(project.variables, ["variables"], context);
  addDuplicateIssues(project.resources, ["resources"], context);
  addDuplicateIssues(project.acceptance, ["acceptance"], context);

  const sceneIds = new Set(project.scenes.map(({ id }) => id));
  const objectIds = new Set(project.objects.map(({ id }) => id));
  const ruleIds = new Set(project.rules.map(({ id }) => id));
  const resourceIds = new Set(project.resources.map(({ id }) => id));
  const behaviorIds = new Set(project.objects.flatMap(({ behaviors }) => behaviors.map(({ id }) => id)));
  const instanceIds = new Set(project.scenes.flatMap(({ instances }) => instances.map(({ id }) => id)));
  const referenceSets = { scene: sceneIds, object: objectIds, instance: instanceIds, behavior: behaviorIds, rule: ruleIds, resource: resourceIds };

  if (!sceneIds.has(project.startSceneId)) {
    context.addIssue({ code: "custom", path: ["startSceneId"], message: `开始场景不存在：${project.startSceneId}` });
  }

  const seenBehaviorIds = new Set<string>();
  project.objects.forEach((object, objectIndex) => {
    addDuplicateIssues(object.behaviors, ["objects", objectIndex, "behaviors"], context);
    object.behaviors.forEach((behavior, behaviorIndex) => {
      if (seenBehaviorIds.has(behavior.id)) {
        context.addIssue({ code: "custom", path: ["objects", objectIndex, "behaviors", behaviorIndex, "id"], message: `行为 ID 跨对象重复：${behavior.id}` });
      }
      seenBehaviorIds.add(behavior.id);
    });
    object.resourceIds.forEach((resourceId, resourceIndex) => {
      if (!resourceIds.has(resourceId)) {
        context.addIssue({ code: "custom", path: ["objects", objectIndex, "resourceIds", resourceIndex], message: `资源不存在：${resourceId}` });
      }
    });
  });

  const seenInstanceIds = new Set<string>();
  project.scenes.forEach((scene, sceneIndex) => {
    addDuplicateIssues(scene.instances, ["scenes", sceneIndex, "instances"], context);
    const localInstanceIds = new Set(scene.instances.map(({ id }) => id));
    const parentByInstance = new Map(scene.instances.map(({ id, parentInstanceId }) => [id, parentInstanceId]));
    scene.instances.forEach((instance, instanceIndex) => {
      const basePath = ["scenes", sceneIndex, "instances", instanceIndex] as Array<string | number>;
      if (seenInstanceIds.has(instance.id)) {
        context.addIssue({ code: "custom", path: [...basePath, "id"], message: `实例 ID 跨场景重复：${instance.id}` });
      }
      seenInstanceIds.add(instance.id);
      if (!objectIds.has(instance.objectId)) {
        context.addIssue({ code: "custom", path: [...basePath, "objectId"], message: `对象不存在：${instance.objectId}` });
      }
      if (instance.parentInstanceId && !localInstanceIds.has(instance.parentInstanceId)) {
        context.addIssue({ code: "custom", path: [...basePath, "parentInstanceId"], message: `父实例不在同一场景：${instance.parentInstanceId}` });
      }
      if (instance.parentInstanceId === instance.id) {
        context.addIssue({ code: "custom", path: [...basePath, "parentInstanceId"], message: "实例不能以自身为父级" });
      }
      const ancestors = new Set([instance.id]);
      let parentId = instance.parentInstanceId;
      while (parentId && localInstanceIds.has(parentId)) {
        if (ancestors.has(parentId)) {
          context.addIssue({ code: "custom", path: [...basePath, "parentInstanceId"], message: `实例父级形成循环：${instance.id}` });
          break;
        }
        ancestors.add(parentId);
        parentId = parentByInstance.get(parentId) ?? null;
      }
    });
  });

  project.rules.forEach((rule, ruleIndex) => {
    if (rule.sceneId && !sceneIds.has(rule.sceneId)) {
      context.addIssue({ code: "custom", path: ["rules", ruleIndex, "sceneId"], message: `规则场景不存在：${rule.sceneId}` });
    }
    (["when", "then"] as const).forEach((branch) => {
      rule[branch].forEach((instruction, instructionIndex) => {
        instruction.references.forEach((reference, referenceIndex) => {
          if (!referenceSets[reference.kind].has(reference.id)) {
            context.addIssue({
              code: "custom",
              path: ["rules", ruleIndex, branch, instructionIndex, "references", referenceIndex, "id"],
              message: `${reference.kind} 引用不存在：${reference.id}`,
            });
          }
        });
      });
    });
  });

  project.variables.forEach((variable, index) => {
    const validOwner = variable.scope === "global"
      ? variable.ownerId === null
      : variable.scope === "scene"
        ? Boolean(variable.ownerId && sceneIds.has(variable.ownerId))
        : Boolean(variable.ownerId && objectIds.has(variable.ownerId));
    if (!validOwner) {
      context.addIssue({ code: "custom", path: ["variables", index, "ownerId"], message: `变量作用域与所属对象不匹配：${variable.id}` });
    }
  });

  project.acceptance.forEach((assertion, assertionIndex) => {
    assertion.ruleIds.forEach((ruleId, ruleIndex) => {
      if (!ruleIds.has(ruleId)) context.addIssue({ code: "custom", path: ["acceptance", assertionIndex, "ruleIds", ruleIndex], message: `验收规则不存在：${ruleId}` });
    });
    assertion.behaviorIds.forEach((behaviorId, behaviorIndex) => {
      if (!behaviorIds.has(behaviorId)) context.addIssue({ code: "custom", path: ["acceptance", assertionIndex, "behaviorIds", behaviorIndex], message: `验收行为不存在：${behaviorId}` });
    });
  });
});

export type GameProjectV3 = z.infer<typeof gameProjectV3Schema>;
export type ProjectReference = z.infer<typeof projectReferenceSchema>;

export function parseGameProjectV3(input: unknown): GameProjectV3 {
  return gameProjectV3Schema.parse(input);
}

export function validateGameProjectV3(input: unknown) {
  return gameProjectV3Schema.safeParse(input);
}

export function serializeGameProjectV3(input: unknown): string {
  return `${JSON.stringify(parseGameProjectV3(input), null, 2)}\n`;
}

export function buildProjectReferenceIndex(project: GameProjectV3): ReadonlyMap<string, readonly string[]> {
  const paths = new Map<string, string[]>();
  const add = (kind: ProjectReference["kind"], id: string, path: string) => {
    const key = `${kind}:${id}`;
    paths.set(key, [...(paths.get(key) ?? []), path]);
  };

  project.objects.forEach((object, objectIndex) => {
    object.resourceIds.forEach((id, index) => add("resource", id, `objects.${objectIndex}.resourceIds.${index}`));
  });
  project.scenes.forEach((scene, sceneIndex) => {
    scene.instances.forEach((instance, instanceIndex) => {
      add("object", instance.objectId, `scenes.${sceneIndex}.instances.${instanceIndex}.objectId`);
      if (instance.parentInstanceId) add("instance", instance.parentInstanceId, `scenes.${sceneIndex}.instances.${instanceIndex}.parentInstanceId`);
    });
  });
  project.rules.forEach((rule, ruleIndex) => {
    if (rule.sceneId) add("scene", rule.sceneId, `rules.${ruleIndex}.sceneId`);
    (["when", "then"] as const).forEach((branch) => {
      rule[branch].forEach((instruction, instructionIndex) => {
        instruction.references.forEach((reference, referenceIndex) => add(reference.kind, reference.id, `rules.${ruleIndex}.${branch}.${instructionIndex}.references.${referenceIndex}`));
      });
    });
  });
  project.acceptance.forEach((assertion, assertionIndex) => {
    assertion.ruleIds.forEach((id, index) => add("rule", id, `acceptance.${assertionIndex}.ruleIds.${index}`));
    assertion.behaviorIds.forEach((id, index) => add("behavior", id, `acceptance.${assertionIndex}.behaviorIds.${index}`));
  });
  return paths;
}
