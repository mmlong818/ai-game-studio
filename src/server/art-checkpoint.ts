import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DynamicArtEntry } from "./image-generator.js";

type Plan = Omit<DynamicArtEntry, "bytes">;
export type ArtCheckpointIdentity = {
  projectId: string; model: string; runtimeTarget: string; aspectRatio: string; group: "cover" | "dynamic"; plan: Plan[];
};
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const isPng = (bytes: Buffer) => bytes.length >= 24 && bytes.length <= 32 * 1024 * 1024 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString("ascii", 12, 16) === "IHDR";

/** Successful image responses survive failure of a sibling request or later build
 * stage. This is a local generation receipt, not an art-review approval. */
export async function getOrGenerateArtCheckpoint(root: string, identity: ArtCheckpointIdentity, generate: () => Promise<DynamicArtEntry[]>) {
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) throw new Error("图像检查点目录不可为符号链接。");
  const identityJson = JSON.stringify(identity);
  const path = join(root, `${hash(identityJson)}.json`);
  try {
    if (lstatSync(root).isSymbolicLink()) throw new Error("Checkpoint directory is a symlink");
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 96 * 1024 * 1024) throw new Error("Invalid checkpoint");
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (saved.schemaVersion !== 1 || saved.identity !== identityJson || !Number.isFinite(Date.parse(saved.generatedAt)) || saved.entries.length !== identity.plan.length) throw new Error("Checkpoint identity mismatch");
    const entries = identity.plan.map((plan, index) => {
      const item = saved.entries[index];
      const bytes = Buffer.from(item.base64, "base64");
      if (!isPng(bytes) || hash(bytes) !== item.sha256) throw new Error("Checkpoint bytes invalid");
      return { ...plan, bytes };
    });
    return { entries, cacheHit: true, generatedAt: saved.generatedAt as string };
  } catch { /* A missing or invalid receipt is never treated as successful art. */ }
  const entries = await generate();
  if (entries.length !== identity.plan.length || entries.some((entry, index) => {
    const plan = identity.plan[index];
    return entry.file !== plan.file || entry.role !== plan.role || entry.prompt !== plan.prompt || !isPng(entry.bytes);
  })) return { entries, cacheHit: false, generatedAt: new Date().toISOString() };
  if (existsSync(root) && lstatSync(root).isSymbolicLink()) throw new Error("图像检查点目录不可为符号链接。");
  mkdirSync(root, { recursive: true });
  const generatedAt = new Date().toISOString();
  const temporary = join(root, `${hash(identityJson)}.${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, identity: identityJson, generatedAt,
    entries: entries.map(entry => ({ sha256: hash(entry.bytes), base64: entry.bytes.toString("base64") })),
  }), { encoding: "utf8", flag: "wx" });
  renameSync(temporary, path);
  return { entries, cacheHit: false, generatedAt };
}
