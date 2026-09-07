import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { ProjectDetail } from "../shared/contracts.js";
import { coverPrompt, dynamicArtPlan, type DynamicArtEntry } from "./image-generator.js";

type ArtProvenance = {
  schemaVersion: number; model: string; generatedAt: string;
  entries: Array<{ file: string; role: string; prompt: string; bytes: number; sha256?: string }>;
  [key: string]: unknown;
};
export type ArtReuseCandidate = { root: string; projectId: string; buildId: string; status: string };

/** Only the repository may nominate successful candidates belonging to this project. */
export function readReusableGeneratedArt(project: ProjectDetail, model: string, candidate: ArtReuseCandidate): {
  cover: Buffer; dynamicArt: DynamicArtEntry[]; provenance: ArtProvenance; provenanceJson: string; sourceBuildId: string;
} | null {
  if (project.spec.template !== "generated" || candidate.projectId !== project.id || candidate.status !== "succeeded") return null;
  try {
    const root = realpathSync(resolve(candidate.root));
    const read = (file: string, maxBytes: number) => {
      if (!file || isAbsolute(file) || file.includes("\\") || file.includes(":") || file.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Unsafe art path");
      let path = root;
      for (const part of file.split("/")) {
        path = join(path, part);
        if (lstatSync(path).isSymbolicLink()) throw new Error("Symlink art path");
      }
      const stat = lstatSync(path);
      const resolved = realpathSync(path);
      const within = relative(root, resolved);
      if (!stat.isFile() || stat.size > maxBytes || isAbsolute(within) || within.startsWith("..")) throw new Error("Invalid art file");
      return readFileSync(path);
    };
    const manifest = JSON.parse(read("game-manifest.json", 1024 * 1024).toString("utf8"));
    if (manifest.template !== "generated" || manifest.aspectRatio !== project.spec.aspectRatio || manifest.runtimeTarget !== project.spec.runtimeTarget) return null;
    const provenanceJson = read("_studio/DYNAMIC_ART.json", 1024 * 1024).toString("utf8");
    const provenance = JSON.parse(provenanceJson) as ArtProvenance;
    if (provenance.schemaVersion !== 2 || provenance.model !== model || typeof provenance.generatedAt !== "string" || !Number.isFinite(Date.parse(provenance.generatedAt)) || !Array.isArray(provenance.entries)) return null;
    const expected = [{ file: "assets/cover.png", role: "封面", prompt: coverPrompt(project) }, ...dynamicArtPlan(project)];
    if (provenance.entries.length !== expected.length || new Set(provenance.entries.map(entry => entry.file)).size !== expected.length) return null;
    const loaded: DynamicArtEntry[] = [];
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    for (const plan of expected) {
      const entry = provenance.entries.find(item => item.file === plan.file);
      if (!entry || entry.prompt !== plan.prompt || entry.role !== plan.role || !Number.isSafeInteger(entry.bytes) || entry.bytes < 24) return null;
      const bytes = read(entry.file, 32 * 1024 * 1024);
      if (bytes.length !== entry.bytes || !bytes.subarray(0, 8).equals(signature) || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
      if (entry.sha256 && entry.sha256 !== createHash("sha256").update(bytes).digest("hex")) return null;
      loaded.push({ ...plan, bytes });
    }
    return { cover: loaded[0].bytes, dynamicArt: loaded.slice(1), provenance, provenanceJson, sourceBuildId: candidate.buildId };
  } catch { return null; }
}
