from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SPRITES = {
    "player-orb.png": "arena-player.png",
    "enemy-chaser.png": "arena-enemy-chaser.png",
    "enemy-runner.png": "arena-enemy-runner.png",
    "enemy-tank.png": "arena-enemy-tank.png",
    "enemy-ranged.png": "arena-enemy-ranged.png",
}


def remove_magenta(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    width, height = source.size
    pixels = list(source.get_flattened_data())
    background = bytearray(width * height)
    queue: deque[int] = deque()

    def is_backdrop(pixel: tuple[int, int, int, int]) -> bool:
        red, green, blue, _ = pixel
        return red > 115 and green < 125 and red > green + 70 and (blue > green + 25 or red > 220)

    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(1, height - 1):
        queue.extend((y * width, y * width + width - 1))

    while queue:
        index = queue.popleft()
        if background[index] or not is_backdrop(pixels[index]):
            continue
        background[index] = 1
        x = index % width
        if x > 0:
            queue.append(index - 1)
        if x + 1 < width:
            queue.append(index + 1)
        if index >= width:
            queue.append(index - width)
        if index + width < width * height:
            queue.append(index + width)

    alpha = Image.frombytes("L", (width, height), bytes(0 if value else 255 for value in background))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.65))
    output = source.copy()
    output.putalpha(alpha)
    return output


def frame_sprite(image: Image.Image, size: int = 512) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("去除背景后没有可见角色。")
    subject = image.crop(bounds)
    maximum = round(size * 0.9)
    scale = min(maximum / subject.width, maximum / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    framed = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    framed.alpha_composite(subject, ((size - subject.width) // 2, (size - subject.height) // 2))
    return framed


def main() -> None:
    parser = argparse.ArgumentParser(description="清理 gpt-image-2 竞技场角色的纯洋红背景并统一为透明位图精灵。")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for source_name, target_name in SPRITES.items():
        source = args.input / source_name
        target = args.output / target_name
        frame_sprite(remove_magenta(Image.open(source))).save(target, optimize=True)
        print(f"Wrote {target}")


if __name__ == "__main__":
    main()
