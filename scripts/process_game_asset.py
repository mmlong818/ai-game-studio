"""Cross-platform raster post-processing for generated browser-game assets."""

from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image


ROLE_LIMITS = {
    "background": (1600, 1200),
    "player": (640, 640),
    "obstacle": (640, 640),
    "collectible": (512, 512),
    "effect": (1024, 1024),
    "interface": (768, 768),
}


def process(input_path: Path, output_path: Path, role: str) -> None:
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        if role != "background":
            alpha_box = image.getchannel("A").getbbox()
            if alpha_box:
                image = image.crop(alpha_box)
        image.thumbnail(ROLE_LIMITS[role], Image.Resampling.LANCZOS)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(output_path, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--role", required=True, choices=sorted(ROLE_LIMITS))
    args = parser.parse_args()
    process(args.input, args.output, args.role)


if __name__ == "__main__":
    main()
