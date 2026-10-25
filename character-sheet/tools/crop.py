# Crops the renders tightly (one shared box per character so the 4 views keep the same scale)
# and builds a white-background reference strip per character for image generation.
# usage: python3 crop.py <renderDir> <outDir>
import os
import sys

from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
IDS = ['km', 'mano', 'kuromi', 'mikanyan', 'nee']
VIEWS = ['front', 'three-quarter', 'side', 'back']


def alpha_box(im, thr=6):
    return im.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox()


def padded(box, pad, w, h):
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))


for cid in IDS:
    ims = [Image.open(f'{R}/{cid}-{v}.png').convert('RGBA') for v in VIEWS]
    boxes = [alpha_box(im) for im in ims]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    box = padded(union, 20, *ims[0].size)
    crops = [im.crop(box) for im in ims]
    for v, c in zip(VIEWS, crops):
        c.save(f'{OUT}/{cid}-{v}.webp', 'WEBP', quality=88, method=6)
    w, h = crops[0].size
    gap = 48
    strip = Image.new('RGBA', (w * 4 + gap * 5, h + gap * 2), (255, 255, 255, 255))
    for k, c in enumerate(crops):
        strip.alpha_composite(c, (gap + k * (w + gap), gap))
    strip.convert('RGB').save(f'{OUT}/{cid}-ref.png')
    Image.open(f'{R}/{cid}-sprite.png').save(f'{OUT}/{cid}-sprite.png')
    print(cid, 'crop', box, 'size', (w, h))

lineup = Image.open(f'{R}/lineup.png').convert('RGBA')
lb = padded(alpha_box(lineup), 24, *lineup.size)
lineup.crop(lb).save(f'{OUT}/lineup.webp', 'WEBP', quality=88, method=6)
print('lineup', lb)
