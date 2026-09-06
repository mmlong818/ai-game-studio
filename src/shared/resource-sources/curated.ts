import { z } from "zod";
import { resourceSourceRecordSchema } from "./schemas.js";

const selectorSchema = z.object({
  exactPaths: z.array(z.string().min(1)).default([]),
  prefixes: z.array(z.string().min(1)).default([]),
  extensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)).min(1),
}).strict();

export const curatedResourcePackSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: z.string().min(1),
  familyId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  source: resourceSourceRecordSchema,
  downloadUrl: z.string().url(),
  archiveFileName: z.string().regex(/^[A-Za-z0-9_.-]+\.zip$/),
  archiveSha256: z.string().regex(/^[A-F0-9]{64}$/),
  licenseEntry: z.literal("License.txt"),
  licenseSha256: z.string().regex(/^[A-F0-9]{64}$/),
  selector: selectorSchema,
  expectedMinimumSelected: z.number().int().positive(),
  maxArchiveBytes: z.number().int().positive(),
  maxExpandedBytes: z.number().int().positive(),
  maxEntryBytes: z.number().int().positive(),
  observedAt: z.string().date(),
  selectionRationale: z.string().min(1),
}).strict();

export type CuratedResourcePack = z.infer<typeof curatedResourcePackSchema>;

const licenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";
const commonRights = { commercialUse: true, modification: true, redistribution: true, sourceRedistribution: true };
const natureGlbs = [
  "bed.glb", "bed_floor.glb", "bridge_center_stone.glb", "bridge_center_wood.glb", "bridge_side_stone.glb", "bridge_side_wood.glb",
  "bridge_stone.glb", "bridge_stoneNarrow.glb", "bridge_wood.glb", "bridge_woodNarrow.glb", "cactus_short.glb", "cactus_tall.glb",
  "campfire_bricks.glb", "campfire_logs.glb", "campfire_planks.glb", "campfire_stones.glb", "canoe.glb", "canoe_paddle.glb",
  "cliff_blockCave_rock.glb", "cliff_blockCave_stone.glb", "cliff_blockDiagonal_rock.glb", "cliff_blockDiagonal_stone.glb",
  "cliff_blockHalf_rock.glb", "cliff_blockHalf_stone.glb", "cliff_blockQuarter_rock.glb", "cliff_blockQuarter_stone.glb",
].map((name) => `Models/GLTF format/${name}`);

export const CURATED_RESOURCE_PACKS: CuratedResourcePack[] = [
  {
    id: "kenney-nature-kit-core-3d", label: "Kenney Nature Kit：首批自然环境 GLB", familyId: "low-poly-nature-3d",
    source: { schemaVersion: "resource-source-v1", id: "SOURCE-KENNEY-NATURE-KIT", sourceUrl: "https://kenney.nl/assets/nature-kit", author: "Kenney", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass: "model", licenseId: "CC0-1.0", licenseUrl, licenseTextHash: "CB96B75E3560AC78D7A53CE6F083F4CDB5C53FAEA6141B62D63458DCFE1E4B9D", attributionText: null, rights: commonRights, provenanceNote: "官方资源页标明 3D、330 个文件、CC0；只导入固定清单中的 GLB。", reviewedBy: "platform-curation", reviewedAt: "2026-09-05T00:00:00.000Z" },
    downloadUrl: "https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip", archiveFileName: "kenney_nature-kit.zip", archiveSha256: "FA7974A0D342BFE63C38664BA9F8EC1A4AAB8EA25F099BDC56870E33588C4D9D", licenseEntry: "License.txt", licenseSha256: "CB96B75E3560AC78D7A53CE6F083F4CDB5C53FAEA6141B62D63458DCFE1E4B9D", selector: { exactPaths: natureGlbs, prefixes: [], extensions: [".glb"] }, expectedMinimumSelected: 26, maxArchiveBytes: 12_000_000, maxExpandedBytes: 150_000_000, maxEntryBytes: 8_000_000, observedAt: "2026-09-05", selectionRationale: "以 26 个桥梁、营地、植被和地形模块建立首个可组合低多边形 3D 环境族。",
  },
  {
    id: "kenney-puzzle-pack-1-png", label: "Kenney Puzzle Pack 1：PNG 益智部件", familyId: "classic-puzzle-2d",
    source: { schemaVersion: "resource-source-v1", id: "SOURCE-KENNEY-PUZZLE-1", sourceUrl: "https://kenney.nl/assets/puzzle-pack-1", author: "Kenney", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass: "image", licenseId: "CC0-1.0", licenseUrl, licenseTextHash: "1B937A994F3D2C0D181356BEB352E204C029EE999BA6B0BB197CB5132A50ACF4", attributionText: null, rights: commonRights, provenanceNote: "官方资源页标明 2D、75 个文件、CC0；排除 SVG、SWF 与元数据文件。", reviewedBy: "platform-curation", reviewedAt: "2026-09-05T00:00:00.000Z" },
    downloadUrl: "https://kenney.nl/media/pages/assets/puzzle-pack-1/627a04c0d3-1774770940/kenney_puzzle-pack-1.zip", archiveFileName: "kenney_puzzle-pack-1.zip", archiveSha256: "0D143F821CFF40EEC16B3D28C4D377CEA7460D8796F6C7346B178B1534827A7C", licenseEntry: "License.txt", licenseSha256: "1B937A994F3D2C0D181356BEB352E204C029EE999BA6B0BB197CB5132A50ACF4", selector: { exactPaths: [], prefixes: ["PNG/Default/"], extensions: [".png"] }, expectedMinimumSelected: 60, maxArchiveBytes: 1_000_000, maxExpandedBytes: 20_000_000, maxEntryBytes: 2_000_000, observedAt: "2026-09-05", selectionRationale: "为挡板、球、按钮和益智机关提供同风格 PNG 基础件，不导入平台禁止的 SWF/SVG。",
  },
  {
    id: "kenney-ui-pack-blue-default", label: "Kenney UI Pack：蓝色默认 UI", familyId: "clean-blue-ui-2d",
    source: { schemaVersion: "resource-source-v1", id: "SOURCE-KENNEY-UI-PACK", sourceUrl: "https://kenney.nl/assets/ui-pack", author: "Kenney", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass: "image", licenseId: "CC0-1.0", licenseUrl, licenseTextHash: "69F7EAA5E05913B4D09CF5848F75390B5C3C9A409EF8555777803D9CA0C171FB", attributionText: null, rights: commonRights, provenanceNote: "官方资源页标明 2D/UI、430 个文件、CC0；首批只选蓝色默认 PNG 子族。", reviewedBy: "platform-curation", reviewedAt: "2026-09-05T00:00:00.000Z" },
    downloadUrl: "https://kenney.nl/media/pages/assets/ui-pack/f651646eab-1718203990/kenney_ui-pack.zip", archiveFileName: "kenney_ui-pack.zip", archiveSha256: "A8A14A234911EB648C062622915C93E79E94E97CB7F9F375A70F6617F1174318", licenseEntry: "License.txt", licenseSha256: "69F7EAA5E05913B4D09CF5848F75390B5C3C9A409EF8555777803D9CA0C171FB", selector: { exactPaths: [], prefixes: ["PNG/Blue/Default/"], extensions: [".png"] }, expectedMinimumSelected: 60, maxArchiveBytes: 2_000_000, maxExpandedBytes: 30_000_000, maxEntryBytes: 2_000_000, observedAt: "2026-09-05", selectionRationale: "用单一颜色和状态子族覆盖按钮、箭头、面板等通用 UI，避免跨风格混搭。",
  },
  {
    id: "kenney-interface-sounds-ogg", label: "Kenney Interface Sounds：OGG 反馈音", familyId: "neutral-interface-audio",
    source: { schemaVersion: "resource-source-v1", id: "SOURCE-KENNEY-INTERFACE-SOUNDS", sourceUrl: "https://kenney.nl/assets/interface-sounds", author: "Kenney", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass: "audio", licenseId: "CC0-1.0", licenseUrl, licenseTextHash: "F7966C773BBED0ECA6A9C75081C44A178B38EAE112724DBB5FDFBD4192D118A9", attributionText: null, rights: commonRights, provenanceNote: "官方资源页标明 Audio、100 个文件、CC0；只导入 Audio 目录的 OGG。", reviewedBy: "platform-curation", reviewedAt: "2026-09-05T00:00:00.000Z" },
    downloadUrl: "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip", archiveFileName: "kenney_interface-sounds.zip", archiveSha256: "F2193D072726D6758A5F7871B2DCC54DCCE0D5C35C6F0A62F92549B327C81232", licenseEntry: "License.txt", licenseSha256: "F7966C773BBED0ECA6A9C75081C44A178B38EAE112724DBB5FDFBD4192D118A9", selector: { exactPaths: [], prefixes: ["Audio/"], extensions: [".ogg"] }, expectedMinimumSelected: 100, maxArchiveBytes: 2_000_000, maxExpandedBytes: 15_000_000, maxEntryBytes: 1_000_000, observedAt: "2026-09-05", selectionRationale: "覆盖点击、确认、错误、开关等通用反馈，满足首批至少 80 个短音效目标。",
  },
].map((pack) => curatedResourcePackSchema.parse(pack));

export function curatedResourcePackById(id: string) { return CURATED_RESOURCE_PACKS.find((pack) => pack.id === id) ?? null; }
