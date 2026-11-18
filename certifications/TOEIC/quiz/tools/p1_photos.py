"""Part 1 写真を台帳（p1_photos.json）どおりに加工して img/{id}.jpg に書き出す。

使い方: python3 tools/p1_photos.py <元画像フォルダ>
元画像フォルダには {src}.jpg（Unsplash の写真ID名）を置く。
白黒化・長辺1200px・指定範囲のぼかし・切り抜きを行う。
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
LONG = 1200


def box(im, r):
    w, h = im.size
    return (int(r[0] * w), int(r[1] * h), int(r[2] * w), int(r[3] * h))


def blur_area(im, r):
    """r は矩形 [x0,y0,x1,y1] か多角形 [[x,y],...]（比率）。境目をぼかして文字だけ読めなくする。"""
    w, h = im.size
    pts = [(r[0], r[1]), (r[2], r[1]), (r[2], r[3]), (r[0], r[3])] if not isinstance(r[0], list) else r
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon([(x * w, y * h) for x, y in pts], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    return Image.composite(im.filter(ImageFilter.GaussianBlur(7)), im, mask)


def main(src_dir):
    reg = json.loads((ROOT / "tools/p1_photos.json").read_text())
    out = ROOT / "img"
    out.mkdir(exist_ok=True)
    for pid, it in reg.items():
        if pid.startswith("_"):
            continue
        im = ImageOps.grayscale(Image.open(Path(src_dir) / f"{it['src']}.jpg"))
        if it.get("crop"):
            im = im.crop(box(im, it["crop"]))
        for r in it.get("blur", []):
            im = blur_area(im, r)
        im.thumbnail((LONG, LONG))
        im.save(out / f"{pid}.jpg", quality=82, optimize=True, progressive=True)
        print(pid, im.size)


if __name__ == "__main__":
    main(sys.argv[1])
