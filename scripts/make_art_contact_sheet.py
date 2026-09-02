from pathlib import Path
from urllib.request import urlopen
import json

from PIL import Image, ImageDraw

from font_support import load_cjk_font


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:4312"
THUMB_WIDTH = 195
THUMB_HEIGHT = 422
LABEL_HEIGHT = 34
COLUMNS = 4


with urlopen(f"{ORIGIN}/api/projects", timeout=5) as response:
    projects = json.load(response)["projects"]

items = []
for project in projects:
    if project.get("fixtureKind"):
        continue
    version = project["version"]
    screenshot = ROOT / "data" / "artifacts" / version["id"] / "_studio" / "quality" / "phone-standard-playing.png"
    if screenshot.exists():
        items.append((project["title"], version["number"], screenshot))

rows = (len(items) + COLUMNS - 1) // COLUMNS
sheet = Image.new("RGB", (COLUMNS * THUMB_WIDTH, rows * (THUMB_HEIGHT + LABEL_HEIGHT)), "#f4f1eb")
draw = ImageDraw.Draw(sheet)
font = load_cjk_font(15)

for index, (title, version, screenshot) in enumerate(items):
    column = index % COLUMNS
    row = index // COLUMNS
    x = column * THUMB_WIDTH
    y = row * (THUMB_HEIGHT + LABEL_HEIGHT)
    image = Image.open(screenshot).convert("RGB")
    image.thumbnail((THUMB_WIDTH, THUMB_HEIGHT), Image.Resampling.LANCZOS)
    offset_x = x + (THUMB_WIDTH - image.width) // 2
    sheet.paste(image, (offset_x, y))
    draw.text((x + 8, y + THUMB_HEIGHT + 7), f"{title}  v{version}", fill="#202421", font=font)

output = ROOT / "docs" / "17-stage-a-art-contact-sheet.png"
sheet.save(output, quality=94)
print(output)
