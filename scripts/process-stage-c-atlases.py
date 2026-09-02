from __future__ import annotations

import argparse
import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "assets" / "templates" / "packs"
BATCH_ID = "realtime-v2"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def grid_cell(image: Image.Image, columns: int, rows: int, column: int, row: int) -> Image.Image:
    x_edges = [round(image.width * index / columns) for index in range(columns + 1)]
    y_edges = [round(image.height * index / rows) for index in range(rows + 1)]
    return image.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1])).convert("RGBA")


def repair_enclosed_alpha_holes(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    transparent = [[pixels[x, y][3] < 32 for x in range(width)] for y in range(height)]
    exterior = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        for y in (0, height - 1):
            if transparent[y][x] and not exterior[y][x]:
                exterior[y][x] = True
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if transparent[y][x] and not exterior[y][x]:
                exterior[y][x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height and transparent[next_y][next_x] and not exterior[next_y][next_x]:
                exterior[next_y][next_x] = True
                queue.append((next_x, next_y))

    holes = {(x, y) for y in range(height) for x in range(width) if transparent[y][x] and not exterior[y][x]}
    while holes:
        filled: list[tuple[int, int, tuple[int, int, int, int]]] = []
        for x, y in holes:
            neighbors = [pixels[next_x, next_y] for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)) if 0 <= next_x < width and 0 <= next_y < height and pixels[next_x, next_y][3] >= 32]
            if neighbors:
                count = len(neighbors)
                filled.append((x, y, tuple(round(sum(pixel[channel] for pixel in neighbors) / count) for channel in range(3)) + (255,)))
        if not filled:
            break
        for x, y, color in filled:
            pixels[x, y] = color
            holes.remove((x, y))
    return rgba


def repair_dark_key_artifacts(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    artifacts = {(x, y) for y in range(height) for x in range(width) if pixels[x, y][3] > 96 and max(pixels[x, y][:3]) < 34}
    while artifacts:
        filled: list[tuple[int, int, tuple[int, int, int, int]]] = []
        for x, y in artifacts:
            neighbors = [pixels[next_x, next_y] for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)) if 0 <= next_x < width and 0 <= next_y < height and (next_x, next_y) not in artifacts and pixels[next_x, next_y][3] > 96]
            if neighbors:
                count = len(neighbors)
                filled.append((x, y, tuple(round(sum(pixel[channel] for pixel in neighbors) / count) for channel in range(3)) + (255,)))
        if not filled:
            break
        for x, y, color in filled:
            pixels[x, y] = color
            artifacts.remove((x, y))
    return rgba


def trim_and_frame(cell: Image.Image, size: tuple[int, int], subject_ratio: float = 0.84) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("图集单元为空，不能生成阶段 C 位图。")
    subject = cell.crop(bounds)
    maximum_width = round(size[0] * subject_ratio)
    maximum_height = round(size[1] * subject_ratio)
    scale = min(maximum_width / subject.width, maximum_height / subject.height)
    resized = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
    framed = Image.new("RGBA", size, (0, 0, 0, 0))
    framed.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return framed


def asset_record(path: Path, filename: str, role: str, source_hash: str, target_size: str) -> dict[str, object]:
    return {
        "filename": filename,
        "role": role,
        "source": "openai-image-api+local-chroma-key+role-extraction",
        "model": "gpt-image-2",
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "width": int(target_size.split("x")[0]),
        "height": int(target_size.split("x")[1]),
        "targetSize": target_size,
        "transparentBackground": True,
        "safeCrop": "8% transparent padding",
        "subjectRatio": "60-84%",
        "promptFile": "stage-c/prompt.json",
        "sourceVersion": 2,
        "sourceImageSha256": source_hash,
        "stageCBatch": BATCH_ID,
    }


def merge_pack_manifest(pack: Path, stage_manifest: dict[str, object]) -> None:
    path = pack / "asset-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assets = [asset for asset in manifest["assets"] if asset.get("stageCBatch") != BATCH_ID]
    assets.extend(stage_manifest["assets"])
    manifest["assets"] = assets
    manifest["stageCGeneration"] = {
        "batch": BATCH_ID,
        "model": "gpt-image-2",
        "sourceImageSha256": stage_manifest["sourceImageSha256"],
        "promptFile": "stage-c/prompt.json",
        "assetCount": len(stage_manifest["assets"]),
    }
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_pack(
    template: str,
    source_path: Path,
    image: Image.Image,
    layout: tuple[int, int],
    names: list[tuple[str, str]],
    size: tuple[int, int],
    prompt_job: dict[str, object],
    repair_cell: int | None = None,
) -> None:
    pack = PACKS / template
    stage_root = pack / "stage-c"
    stage_root.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(source_path)
    prompt_path = stage_root / "prompt.json"
    prompt_path.write_text(json.dumps(prompt_job, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    assets: list[dict[str, object]] = []
    columns, rows = layout
    for index, (filename, role) in enumerate(names):
        cell = grid_cell(image, columns, rows, index % columns, index // columns)
        if repair_cell == index:
            cell = repair_dark_key_artifacts(repair_enclosed_alpha_holes(cell))
        destination = stage_root / filename
        trim_and_frame(cell, size).save(destination, optimize=True)
        assets.append(asset_record(destination, f"stage-c/{filename}", role, source_hash, f"{size[0]}x{size[1]}"))
    prompt_asset = {
        "filename": "stage-c/prompt.json",
        "role": "stage-c-generation-prompt",
        "source": "user-approved-cli-specification",
        "bytes": prompt_path.stat().st_size,
        "sha256": sha256(prompt_path),
        "stageCBatch": BATCH_ID,
    }
    assets.append(prompt_asset)
    stage_manifest = {
        "schemaVersion": 1,
        "template": template,
        "batch": BATCH_ID,
        "model": "gpt-image-2",
        "sourceImageSha256": source_hash,
        "assets": assets,
    }
    (stage_root / "manifest.json").write_text(json.dumps(stage_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    merge_pack_manifest(pack, stage_manifest)


def main() -> None:
    parser = argparse.ArgumentParser(description="拆分并登记阶段 C 的蛇身与砖块状态位图。")
    parser.add_argument("--snake", type=Path, required=True)
    parser.add_argument("--breakout", type=Path, required=True)
    parser.add_argument("--jobs", type=Path, required=True)
    args = parser.parse_args()
    jobs = [json.loads(line) for line in args.jobs.read_text(encoding="utf-8").splitlines() if line.strip()]
    jobs_by_name = {job["out"]: job for job in jobs}
    write_pack(
        "snake",
        args.snake,
        Image.open(args.snake).convert("RGBA"),
        (3, 3),
        [
            ("snake-head-v2.png", "stage-c-sprite-player-head"),
            ("snake-body-straight-v2.png", "stage-c-sprite-player-body-straight"),
            ("snake-body-corner-v2.png", "stage-c-sprite-player-body-corner"),
            ("snake-tail-v2.png", "stage-c-sprite-player-tail"),
            ("snake-food-v2.png", "stage-c-sprite-interactive-food"),
            ("snake-obstacle-v2.png", "stage-c-sprite-obstacle"),
            ("snake-eat-v2.png", "stage-c-sprite-eat-feedback"),
            ("snake-danger-v2.png", "stage-c-sprite-danger-feedback"),
            ("snake-complete-v2.png", "stage-c-sprite-completion-feedback"),
        ],
        (384, 384),
        jobs_by_name["snake-runtime-atlas-v2.png"],
        repair_cell=4,
    )
    breakout_names: list[tuple[str, str]] = []
    level_names = ["pearl", "coral", "jellyfish", "star", "abyss"]
    state_names = ["intact", "cracked", "critical"]
    for level in level_names:
        for state in state_names:
            breakout_names.append((f"brick-{level}-{state}-v2.png", f"stage-c-sprite-brick-{level}-{state}"))
    write_pack(
        "breakout",
        args.breakout,
        Image.open(args.breakout).convert("RGBA"),
        (3, 5),
        breakout_names,
        (384, 216),
        jobs_by_name["breakout-damage-atlas-v2.png"],
    )
    print("Processed 9 snake assets and 15 breakout damage assets into versioned Stage C packs.")


if __name__ == "__main__":
    main()
