from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


def trim_and_frame(cell: Image.Image, size: int = 384) -> Image.Image:
    rgba = cell.convert("RGBA")
    alpha = rgba.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("图集单元为空，无法生成独立精灵。")
    subject = rgba.crop(bounds)
    maximum = int(size * 0.82)
    scale = min(maximum / subject.width, maximum / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    framed = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    framed.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return framed


def split_atlas(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGBA")
    output.mkdir(parents=True, exist_ok=True)
    x_edges = [round(image.width * index / 3) for index in range(4)]
    y_edges = [round(image.height * index / 3) for index in range(4)]
    for row in range(3):
        for column in range(3):
            index = row * 3 + column + 1
            cell = image.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
            trim_and_frame(cell).save(output / f"sprite-{index:02d}.png", optimize=True)


def make_gameplay_background(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    image = ImageEnhance.Color(image).enhance(0.72)
    image = ImageEnhance.Brightness(image).enhance(0.58)
    image = image.filter(ImageFilter.GaussianBlur(radius=5.5))
    image.save(destination, optimize=True, quality=90)


def main() -> None:
    parser = argparse.ArgumentParser(description="把 3x3 源图集拆成安全裁切的独立透明精灵。")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cover", type=Path)
    parser.add_argument("--background", type=Path)
    args = parser.parse_args()
    split_atlas(args.source, args.output)
    if args.cover and args.background:
        make_gameplay_background(args.cover, args.background)


if __name__ == "__main__":
    main()
