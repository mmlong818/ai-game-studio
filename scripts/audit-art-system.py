from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "assets" / "templates" / "packs"
REPORT_JSON = ROOT / "docs" / "19-stage-b-asset-audit.json"
REPORT_MD = ROOT / "docs" / "19-stage-b-asset-audit.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def edge_energy(path: Path) -> float:
    image = Image.open(path).convert("L").resize((128, 192))
    return round(ImageStat.Stat(image.filter(ImageFilter.FIND_EDGES)).mean[0], 2)


def inspect_sprite(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        return {"file": path.name, "passed": False, "reason": "empty-alpha"}
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    subject_ratio = round(max(width / image.width, height / image.height), 3)
    edge_pixels = 0
    alpha_pixels = alpha.load()
    for y in range(image.height):
        for x in range(image.width):
            if x < 4 or y < 4 or x >= image.width - 4 or y >= image.height - 4:
                edge_pixels += int(alpha_pixels[x, y] > 12)
    opaque = [pixel for pixel in image.get_flattened_data() if pixel[3] > 128]
    dark_ratio = round(sum(1 for red, green, blue, _ in opaque if max(red, green, blue) < 22) / max(1, len(opaque)), 4)
    passed = image.size == (384, 384) and edge_pixels == 0 and 0.58 <= subject_ratio <= 0.84 and dark_ratio < 0.35
    return {
        "file": path.name,
        "size": list(image.size),
        "subjectRatio": subject_ratio,
        "edgeAlphaPixels": edge_pixels,
        "darkOpaqueRatio": dark_ratio,
        "passed": passed,
    }


def inspect_pack(pack: Path) -> dict[str, object]:
    manifest = json.loads((pack / "asset-manifest.json").read_text(encoding="utf-8"))
    sprites = [asset for asset in manifest["assets"] if asset["role"].startswith("sprite-")]
    sprite_checks = [inspect_sprite(pack / asset["filename"]) for asset in sprites]
    cover_energy = edge_energy(pack / "cover.png")
    background_energy = edge_energy(pack / "background.png")
    hashes_match = all(sha256(pack / asset["filename"]) == asset["sha256"] for asset in manifest["assets"])
    roles_unique = len({asset["role"] for asset in sprites}) == 9
    metadata_complete = all(
        asset.get("targetSize") == "384x384"
        and asset.get("transparentBackground") is True
        and asset.get("safeCrop")
        and asset.get("subjectRatio")
        and asset.get("promptFile")
        and asset.get("sourceVersion") == 1
        for asset in sprites
    )
    audio_roles = {asset["role"] for asset in manifest["assets"] if asset["role"].endswith("-sfx") or asset["role"].endswith("-track")}
    required_audio = {"music-track", "ambient-track", "legal-sfx", "illegal-sfx", "reward-sfx", "hit-sfx", "victory-sfx", "defeat-sfx", "ui-sfx"}
    passed = (
        manifest.get("schemaVersion") == 3
        and len(sprites) == 9
        and roles_unique
        and metadata_complete
        and hashes_match
        and audio_roles == required_audio
        and background_energy < cover_energy * 0.82
        and all(check["passed"] for check in sprite_checks)
    )
    return {
        "template": pack.name,
        "passed": passed,
        "spriteCount": len(sprites),
        "rolesUnique": roles_unique,
        "metadataComplete": metadata_complete,
        "hashesMatch": hashes_match,
        "audioRoleCount": len(audio_roles),
        "coverEdgeEnergy": cover_energy,
        "backgroundEdgeEnergy": background_energy,
        "backgroundNoiseReduction": round(1 - background_energy / cover_energy, 3),
        "sprites": sprite_checks,
    }


def main() -> None:
    packs = [inspect_pack(path) for path in sorted(PACKS.iterdir()) if path.is_dir() and (path / "asset-manifest.json").exists()]
    report = {
        "schemaVersion": 1,
        "packCount": len(packs),
        "passedCount": sum(1 for pack in packs if pack["passed"]),
        "passed": all(pack["passed"] for pack in packs),
        "checks": [
            "role-split transparent sprites",
            "safe crop and subject ratio",
            "edge and black contamination",
            "background frequency reduction",
            "four-track audio role completeness",
            "file hash traceability",
        ],
        "packs": packs,
    }
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rows = "\n".join(
        f"| {pack['template']} | {'通过' if pack['passed'] else '失败'} | {pack['spriteCount']} | {pack['audioRoleCount']} | {pack['backgroundNoiseReduction']:.1%} |"
        for pack in packs
    )
    REPORT_MD.write_text(
        "# 阶段 B 资产硬检查\n\n"
        f"- 模板包：{len(packs)}\n"
        f"- 通过：{report['passedCount']}\n"
        f"- 总结：{'全部通过' if report['passed'] else '存在失败项，禁止发布'}\n\n"
        "| 模板 | 结果 | 独立精灵 | 声音角色 | 背景高频降低 |\n| --- | --- | ---: | ---: | ---: |\n"
        + rows
        + "\n\n> 本报告检查文件、透明边缘、裁切、主体占比、背景频率、音轨角色和哈希；审美与封面—局内语义一致性仍需真实页面主美复核。\n",
        encoding="utf-8",
    )
    if not report["passed"]:
        raise SystemExit("阶段 B 资产硬检查失败。")


if __name__ == "__main__":
    main()
