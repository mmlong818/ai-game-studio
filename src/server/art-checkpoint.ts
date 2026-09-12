import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spriteSheetAnimationSchema } from "../shared/generated-blueprint.js";
import { IMAGE_TRANSFORM_VERSION, readPngDimensions, type DynamicArtEntry, type ImageDeliveryMetadata, type ImageRequestFingerprint } from "./image-generator.js";
import { throwIfCancellationRequested } from "./cancellation.js";

type Plan = Omit<DynamicArtEntry, "bytes">;
export type ArtCheckpointIdentity = {
  projectId: string; model: string; runtimeTarget: string; aspectRatio: string; group: "cover" | "dynamic"; plan: Plan[]; request: ImageRequestFingerprint;
};
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const isPng = (bytes: Buffer) => bytes.length >= 24 && bytes.length <= 32 * 1024 * 1024 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString("ascii", 12, 16) === "IHDR";
const isDelivery = (value: unknown, width: number, height: number): value is ImageDeliveryMetadata => {
  const image = value as ImageDeliveryMetadata | undefined;
  const parsedSheet = image?.spriteSheet ? spriteSheetAnimationSchema.safeParse(image.spriteSheet) : null;
  const hasSheet = Boolean(image?.spriteSheet);
  const usesSheetFit = image?.delivered?.fit === "sprite-sheet";
  const warningsValid = image?.warnings === undefined || (Array.isArray(image.warnings) && image.warnings.every(warning => warning.code === "SPRITE_FRAME_EDGE"
    && Number.isInteger(warning.frame) && warning.frame > 0 && Number.isInteger(warning.recommendedMargin) && warning.recommendedMargin > 0
    && Array.isArray(warning.sides) && warning.sides.length > 0 && warning.sides.every(side => ["left", "top", "right", "bottom"].includes(side))
    && typeof warning.message === "string" && warning.message.length > 0));
  const repairsValid = image?.repairs === undefined || (Array.isArray(image.repairs) && image.repairs.length <= 2 && image.repairs.every(repair =>
    Number.isInteger(repair.attempt) && repair.attempt >= 2 && repair.attempt <= 3
    && /^[A-Z0-9_]{1,60}$/.test(repair.code) && typeof repair.message === "string" && repair.message.length > 0 && repair.message.length <= 300));
  const transformValid = image?.transform === undefined || Boolean(image.transform.version === IMAGE_TRANSFORM_VERSION
    && /^[a-f0-9]{64}$/.test(image.transform.sourceSha256) && [image.transform.anchor.x, image.transform.anchor.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    && Number.isFinite(image.transform.safeInsetRatio) && image.transform.safeInsetRatio >= 0 && image.transform.safeInsetRatio <= 0.25
    && Number.isInteger(image.transform.minSourcePixels) && image.transform.minSourcePixels >= 1
    && Number.isInteger(image.transform.resized.width) && image.transform.resized.width > 0 && Number.isInteger(image.transform.resized.height) && image.transform.resized.height > 0
    && Number.isInteger(image.transform.placement.left) && Number.isInteger(image.transform.placement.top));
  const presentationValid = image?.presentation === undefined || Boolean(image.presentation.fit === "contain"
    && ["playfield", "hud", "overlay"].includes(image.presentation.region)
    && image.presentation.logicalSize.min >= 0.02 && image.presentation.logicalSize.min <= image.presentation.logicalSize.max && image.presentation.logicalSize.max <= 0.8
    && [image.presentation.anchor.x, image.presentation.anchor.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    && image.presentation.safeInsetRatio >= 0 && image.presentation.safeInsetRatio <= 0.25
    && Number.isInteger(image.presentation.minSourcePixels) && image.presentation.minSourcePixels >= 16 && image.presentation.minSourcePixels <= 2048);
  return Boolean(image && warningsValid && repairsValid && transformValid && presentationValid && Number.isInteger(image.providerSource?.width) && Number.isInteger(image.providerSource?.height)
    && typeof image.providerSource?.hasAlpha === "boolean" && typeof image.providerSource?.hasTransparency === "boolean"
    && image.delivered?.width === width && image.delivered?.height === height && ["cover", "contain", "sprite-sheet"].includes(image.delivered?.fit)
    && hasSheet === usesSheetFit
    && (!hasSheet || (parsedSheet?.success && width === parsedSheet.data.frameWidth * parsedSheet.data.columns && height === parsedSheet.data.frameHeight * parsedSheet.data.rows)));
};

/** Successful image responses survive failure of a sibling request or later build
 * stage. This is a local generation receipt, not an art-review approval. */
export async function getOrGenerateArtCheckpoint(root: string, identity: ArtCheckpointIdentity, generate: () => Promise<DynamicArtEntry[]>) {
  throwIfCancellationRequested();
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) throw new Error("图像检查点目录不可为符号链接。");
  const identityJson = JSON.stringify(identity);
  const path = join(root, `${hash(identityJson)}.json`);
  try {
    if (lstatSync(root).isSymbolicLink()) throw new Error("Checkpoint directory is a symlink");
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 96 * 1024 * 1024) throw new Error("Invalid checkpoint");
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (saved.schemaVersion !== 1 || saved.identity !== identityJson || !Number.isFinite(Date.parse(saved.generatedAt)) || saved.entries.length !== identity.plan.length) throw new Error("Checkpoint identity mismatch");
    const entries = await Promise.all(identity.plan.map(async (plan, index) => {
      const item = saved.entries[index];
      const bytes = Buffer.from(item.base64, "base64");
      if (!isPng(bytes) || hash(bytes) !== item.sha256) throw new Error("Checkpoint bytes invalid");
      const actual = await readPngDimensions(bytes);
      if (!item.image || !isDelivery(item.image, actual.width, actual.height)) throw new Error("Checkpoint image metadata missing or invalid");
      if (plan.expectedSpriteSheet) {
        if (!item.image || item.image.delivered?.fit !== "sprite-sheet" || !item.image.spriteSheet
          || JSON.stringify(item.image.spriteSheet) !== JSON.stringify(plan.expectedSpriteSheet)) throw new Error("Checkpoint sprite metadata missing or mismatched");
      }
      return { ...plan, bytes, ...(item.image ? { image: item.image } : {}) };
    }));
    throwIfCancellationRequested();
    return { entries, cacheHit: true, generatedAt: saved.generatedAt as string };
  } catch { throwIfCancellationRequested(); /* A missing or invalid receipt is never treated as successful art. */ }
  const entries = await generate();
  throwIfCancellationRequested();
  if (entries.length !== identity.plan.length || entries.some((entry, index) => {
    const plan = identity.plan[index];
    const requiresSheet = plan.expectedSpriteSheet;
    return entry.file !== plan.file || entry.role !== plan.role || entry.prompt !== plan.prompt || !isPng(entry.bytes) || !entry.image
      || Boolean(requiresSheet && (!entry.image || entry.image.delivered.fit !== "sprite-sheet" || !entry.image.spriteSheet
        || JSON.stringify(entry.image.spriteSheet) !== JSON.stringify(requiresSheet)));
  })) return { entries, cacheHit: false, generatedAt: new Date().toISOString() };
  const deliveries = await Promise.all(entries.map(async entry => {
    const actual = await readPngDimensions(entry.bytes);
    return isDelivery(entry.image, actual.width, actual.height);
  }));
  if (deliveries.some(valid => !valid)) return { entries, cacheHit: false, generatedAt: new Date().toISOString() };
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) throw new Error("图像检查点目录不可为符号链接。");
  mkdirSync(root, { recursive: true });
  const generatedAt = new Date().toISOString();
  const temporary = join(root, `${hash(identityJson)}.${randomUUID()}.tmp`);
  try {
    throwIfCancellationRequested();
    writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, identity: identityJson, generatedAt,
      entries: entries.map(entry => ({ sha256: hash(entry.bytes), base64: entry.bytes.toString("base64"), ...(entry.image ? { image: entry.image } : {}) })),
    }), { encoding: "utf8", flag: "wx" });
    throwIfCancellationRequested();
    renameSync(temporary, path);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
  return { entries, cacheHit: false, generatedAt };
}
