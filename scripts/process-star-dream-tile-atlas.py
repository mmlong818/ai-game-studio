from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


TILES = ["moon", "cloud", "star", "flower", "heart", "drop"]


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="拆分并登记星梦对决 3×2 位图卡面。")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--prompt", type=Path, required=True)
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGB")
    if image.size != (1536, 1024):
        raise ValueError(f"星梦卡面图集尺寸必须为 1536×1024，实际为 {image.size}。")

    args.output.mkdir(parents=True, exist_ok=True)
    assets: list[dict[str, object]] = []
    for index, name in enumerate(TILES):
        column = index % 3
        row = index // 3
        tile = image.crop((column * 512, row * 512, (column + 1) * 512, (row + 1) * 512))
        destination = args.output / f"{name}.png"
        tile.save(destination, optimize=True)
        assets.append({
            "filename": destination.name,
            "role": f"match3-tile-{name}",
            "source": "openai-image-api+equal-grid-extraction",
            "model": "gpt-image-2",
            "width": 512,
            "height": 512,
            "bytes": destination.stat().st_size,
            "sha256": file_hash(destination),
        })

    manifest = {
        "schemaVersion": 1,
        "model": "gpt-image-2",
        "sourceAtlas": str(args.source).replace("\\", "/"),
        "sourceAtlasSha256": file_hash(args.source),
        "promptFile": str(args.prompt).replace("\\", "/"),
        "layout": "3x2",
        "assets": assets,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Processed 6 Star Dream bitmap tile cards.")


if __name__ == "__main__":
    main()
