import { resolve } from "node:path";
import { importCuratedResourceArchive } from "../src/server/resource-intake.js";
import { CURATED_RESOURCE_PACKS } from "../src/shared/resource-sources/curated.js";

const quarantineRoot = resolve(process.argv[2] ?? ".resource-quarantine/kenney");
const libraryRoot = resolve(process.argv[3] ?? "assets/library/curated");
const results = [];
for (const pack of CURATED_RESOURCE_PACKS) {
  const result = await importCuratedResourceArchive(pack, resolve(quarantineRoot, pack.archiveFileName), libraryRoot);
  results.push({ packId: pack.id, familyId: pack.familyId, familyRoot: result.familyRoot, assets: result.manifest.assets.length, bytes: result.report.selectedBytes });
}
console.log(JSON.stringify({ libraryRoot, results }, null, 2));
