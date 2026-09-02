from pathlib import Path

from PIL import Image, ImageDraw

from font_support import load_cjk_font


ROOT = Path(__file__).resolve().parents[1]
ITEMS = [
    ("折光堆叠 v33", "46f78788-2489-4d06-a8f6-0aff92d2c81e"),
    ("数织矩阵 v26", "da54406c-dc20-4f29-8786-e22679ea57f0"),
    ("朱门华容 v26", "95cb4373-02ab-4520-a7d8-7e0814d1981f"),
    ("果冻填阵 v11", "80ce8434-34ba-489a-a8b1-92c333f563eb"),
    ("软糖拼岛 v11", "197739f1-64d7-42c1-8828-553903b0042d"),
    ("植光拼图 v28", "b1b6bddd-5a56-4003-8732-ebee0040680f"),
]

thumb_width, thumb_height, label_height = 260, 563, 42
sheet = Image.new("RGB", (thumb_width * 3, (thumb_height + label_height) * 2), "#f4f1eb")
draw = ImageDraw.Draw(sheet)
font = load_cjk_font(17)

for index, (label, version_id) in enumerate(ITEMS):
    screenshot = ROOT / "data" / "artifacts" / version_id / "_studio" / "quality" / "phone-standard-playing.png"
    image = Image.open(screenshot).convert("RGB")
    image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
    x = index % 3 * thumb_width
    y = index // 3 * (thumb_height + label_height)
    sheet.paste(image, (x + (thumb_width - image.width) // 2, y))
    draw.text((x + 10, y + thumb_height + 9), label, fill="#252525", font=font)

output = ROOT / "docs" / "26-stage-d-contact-sheet.png"
sheet.save(output, quality=94)
print(output)
