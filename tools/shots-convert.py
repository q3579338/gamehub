"""把 .shots-tmp/<id>.png 压成 site/shots/<id>.jpg（1200x750，质量 82，渐进式）。用法：python tools/shots-convert.py [id ...]"""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
only = set(sys.argv[1:])
games = json.loads((ROOT / 'games.json').read_text('utf8'))['games']
(ROOT / 'site' / 'shots').mkdir(parents=True, exist_ok=True)
for g in games:
    if only and g['id'] not in only:
        continue
    src = ROOT / '.shots-tmp' / f"{g['id']}.png"
    if not src.exists():
        print('skip (no png):', g['id']); continue
    im = Image.open(src).convert('RGB')
    if im.size != (1200, 750):
        im = im.resize((1200, 750), Image.LANCZOS)
    dst = ROOT / 'site' / 'shots' / f"{g['id']}.jpg"
    im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
    # 小图给列表/OG 用不着，单一尺寸就够；顺手给个 600 宽的缩略给移动端
    im.resize((600, 375), Image.LANCZOS).save(ROOT / 'site' / 'shots' / f"{g['id']}-s.jpg", 'JPEG', quality=80, optimize=True, progressive=True)
    print(f"{g['id']}: {dst.stat().st_size // 1024} KB")
