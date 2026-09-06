import { resolve } from "node:path";
import { inspectCuratedResourceArchive } from "../src/server/resource-intake.js";
import { CURATED_RESOURCE_PACKS } from "../src/shared/resource-sources/curated.js";

const quarantineRoot = resolve(process.argv[2] ?? ".resource-quarantine/kenney");
const reports = [];
for (const pack of CURATED_RESOURCE_PACKS) {
  reports.push(await inspectCuratedResourceArchive(pack, resolve(quarantineRoot, pack.archiveFileName)));
}
console.log(JSON.stringify({ inspectedAt: new Date().toISOString(), quarantineRoot, reports }, null, 2));
