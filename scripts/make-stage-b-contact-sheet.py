from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
VERSIONS = [
    ("mahjong-roguelite", "05f38ca6-8611-4d8b-b27a-720085f165ca"),
    ("region-logic", "0a253830-50f3-4aa8-93a7-defb9e499840"),
    ("block-place", "1c8d315a-7172-4490-b87b-9915a8f720da"),
    ("polyomino-fit", "1f596b4c-a9e4-4dce-a89d-90851535ddb0"),
    ("space-shooter", "b4c6a5c7-f0f2-48df-87f9-c80db5fd50d5"),
    ("merge-2048", "767b4ede-0109-4ae3-b205-8f4f5a18ed8c"),
    ("snake", "2303778b-d844-4862-bc98-6c2bba60851b"),
    ("maze", "358a00ed-1a3c-487b-889f-0175c14abf6d"),
    ("klotski", "e69e8949-1fd5-4ba0-890d-421a04161b85"),
    ("breakout", "3f8501a8-0ab5-4f70-b460-2c34c76ba266"),
    ("puzzle", "a2958b93-cd87-4fa7-976d-926fd4832a28"),
    ("tetris", "1f5eff1c-806f-4b66-af88-9938a05384ff"),
]


def main() -> None:
    columns = 4
    tile_width, tile_height = 195, 422
    label_height, gap = 24, 12
    rows = (len(VERSIONS) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * (tile_width + gap) + gap, rows * (tile_height + label_height + gap) + gap), "#171717")
    draw = ImageDraw.Draw(sheet)
    for index, (label, version_id) in enumerate(VERSIONS):
        source = ROOT / "data" / "artifacts" / version_id / "_studio" / "quality" / "phone-standard-playing.png"
        image = Image.open(source).convert("RGB").resize((tile_width, tile_height), Image.Resampling.LANCZOS)
        x = gap + index % columns * (tile_width + gap)
        y = gap + index // columns * (tile_height + label_height + gap)
        sheet.paste(image, (x, y + label_height))
        draw.text((x + 4, y + 4), label, fill="#f3efe8")
    sheet.save(ROOT / "docs" / "20-stage-b-playing-contact-sheet.png", optimize=True)


if __name__ == "__main__":
    main()
