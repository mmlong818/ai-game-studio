"""Prepare approved AI bitmaps for the template; never generate or call an API."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/imagegen/jade-topdown'
DEST = ROOT / 'assets/templates/packs/snake/stage-c'
for part, name in [('head', 'snake-head'), ('body', 'snake-body-straight'), ('tail', 'snake-tail')]:
    sprite = Image.open(SOURCE / f'{part}-alpha-v3.png').convert('RGBA')
    sprite.putalpha(sprite.getchannel('A').point(lambda alpha: 0 if alpha < 24 else alpha))
    box = sprite.getchannel('A').getbbox()
    if box is None:
        raise ValueError(f'Empty alpha: {part}')
    sprite = sprite.crop(box)
    sprite.thumbnail((368, 368), Image.Resampling.LANCZOS)
    padded = Image.new('RGBA', (sprite.width + 16, sprite.height + 16))
    padded.paste(sprite, (8, 8))
    sprite = padded
    target = DEST / f'{name}-v3.png'
    sprite.save(target, optimize=True)
    print(f'{target.relative_to(ROOT)}: {sprite.size}')
