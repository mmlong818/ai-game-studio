import { z } from "zod";

const id = z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1).max(500);

const evidenceSchema = z.object({
  sourceUrl: z.string().url(),
  observedAt: z.string().date(),
  signal: z.enum(["editorial-award", "ranking", "ratings", "downloads", "revenue", "retention", "design-analysis"]),
  note: text,
}).strict();

export const mechanicRelationSchema = z.object({
  targetId: id,
  kind: z.enum(["requires", "enables", "complements", "conflicts", "substitutes", "taught-before", "balance-coupled"]),
  reason: text,
}).strict();

export const gameMechanicSchema = z.object({
  id,
  label: text,
  family: z.enum(["movement", "spatial", "matching", "economy", "combat", "collection", "construction", "information", "timing", "social-simulation", "progression", "risk-reward"]),
  playerVerb: text,
  state: z.array(id).min(1),
  inputs: z.array(id).min(1),
  outputs: z.array(id).min(1),
  capabilityIds: z.array(id).min(1),
  relations: z.array(mechanicRelationSchema).default([]),
  tunableDimensions: z.array(z.enum(["cognition", "operation", "space", "resources", "combination", "punishment"])).min(1),
  probeSignals: z.array(id).min(1),
}).strict();

export const playPatternSchema = z.object({
  id,
  label: text,
  summary: text,
  scope: z.object({ dimensions: z.array(z.enum(["2d", "limited-3d"])).min(1), sessionMinutes: z.tuple([z.number().positive(), z.number().positive()]), inputs: z.array(z.enum(["keyboard", "pointer", "touch", "gamepad"])).min(1) }).strict(),
  tags: z.array(id).min(1),
  coreCapabilityIds: z.array(id).min(1),
  coreMechanicIds: z.array(id).min(1),
  optionalMechanicIds: z.array(id).default([]),
  compositionRules: z.array(text).min(1),
  knownRisks: z.array(text).min(1),
  evidence: z.array(evidenceSchema).min(1),
  lifecycle: z.enum(["candidate", "verified", "deprecated"]),
  evaluationVersion: z.number().int().positive(),
}).strict();
