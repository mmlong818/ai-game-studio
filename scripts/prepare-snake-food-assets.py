"""Prepare generated food images; this local image processor makes no API calls."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/templates/packs/snake/stage-c'
records = []
for kind in ['golden', 'mint', 'dew']:
    im = Image.open(ROOT / f'output/imagegen/jade-foods/{kind}-alpha-v4.png').convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 24 else a))
    box = im.getchannel('A').getbbox()
    if not box:
        raise ValueError(f'Empty food: {kind}')
    im = im.crop(box)
    im.thumbnail((240, 240), Image.Resampling.LANCZOS)
    padded = Image.new('RGBA', (im.width + 16, im.height + 16))
    padded.paste(im, (8, 8))
    target = DEST / f'snake-food-{kind}-v4.png'
    padded.save(target, optimize=True)
    records.append({'filename': 'stage-c/' + target.name, 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'width': padded.width, 'height': padded.height})
print(json.dumps(records))
preview = Image.new('RGBA', (384, 144), '#edf8f0')
for index, kind in enumerate(['golden', 'mint', 'dew']):
    icon = Image.open(DEST / f'snake-food-{kind}-v4.png').convert('RGBA')
    icon.thumbnail((96, 112), Image.Resampling.LANCZOS)
    preview.alpha_composite(icon, (index * 128 + (128 - icon.width) // 2, (144 - icon.height) // 2))
preview.save(ROOT / 'output/imagegen/jade-foods/preview.png')
