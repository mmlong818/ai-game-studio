from hashlib import sha256
from pathlib import Path
from shutil import copy2

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets" / "templates" / "packs" / "puzzle"
GENERATED = ROOT / "assets" / "templates" / "generated-levels" / "puzzle"


def main() -> None:
    sources = [GENERATED / f"level-gallery-{index:02d}.png" for index in range(1, 21)]
    missing = [source.name for source in sources if not source.exists()]
    if missing:
        raise FileNotFoundError(f"Missing generated puzzle levels: {', '.join(missing)}")

    hashes: set[str] = set()
    for source in sources:
        with Image.open(source) as image:
            if image.size != (1024, 1536):
                raise ValueError(f"Unexpected dimensions for {source.name}: {image.size}")
        hashes.add(sha256(source.read_bytes()).hexdigest())
    if len(hashes) != len(sources):
        raise ValueError("Puzzle level collection contains duplicate bitmap files")

    for source in sources:
        copy2(source, PACK / source.name)


if __name__ == "__main__":
    main()
