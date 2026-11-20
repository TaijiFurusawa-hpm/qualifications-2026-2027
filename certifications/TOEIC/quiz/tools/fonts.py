#!/usr/bin/env python3
"""同梱する書体（fonts/*.woff2）を tools/fonts_src/ の原本から作る。tools/.venv の python で実行する。
  tools/.venv/bin/python tools/fonts.py
- 日本語（Zen Kaku Gothic New 500/700）：アプリに出てくる文字だけに絞る（＋かな・記号は全部）。
  問題や単語を足したら、このスクリプトを流し直す（出てこない字は端末の書体で表示される＝崩れはしない）。
- 英字（Inter・Literata の可変フォント）：ラテン文字と記号に絞り、太さの軸を使う範囲（400〜700 / 400〜600）に縮める。
- 原本は Google Fonts（github.com/google/fonts）、SIL OFL 1.1。ライセンス文も fonts/ に写す。2026-11-20"""
import shutil
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

Q = Path(__file__).resolve().parent.parent
SRC = Q / "tools" / "fonts_src"
OUT = Q / "fonts"
CHARS = Q / "tools" / "fonts_chars.txt"

# 画面に出る文字の出どころ（本体・データ）
TEXT_FILES = [Q / "index.html", Q / "manifest.webmanifest", *sorted((Q / "js").glob("*.js")),
              Q / "data" / "data.js", Q / "data" / "vocab.js"]
JA_RANGES = [(0x3000, 0x30FF), (0x31F0, 0x31FF), (0xFF00, 0xFFEF)]   # 記号・かな・全角英数
LATIN_RANGES = [(0x20, 0x7E), (0xA0, 0x24F), (0x2000, 0x206F), (0x20AC, 0x20AC), (0x2100, 0x2122),
                (0x2190, 0x2193), (0x2212, 0x2212), (0x25A0, 0x25CF)]

# (原本, 出力名, 太さの軸を縮める範囲 or None, 日本語か)
FONTS = [
    ("ZenKakuGothicNew-Medium.ttf", "zen-kaku-500.woff2", None, True),
    ("ZenKakuGothicNew-Bold.ttf", "zen-kaku-700.woff2", None, True),
    ("Inter-VF.ttf", "inter.woff2", (400, 700), False),
    ("Literata-VF.ttf", "literata.woff2", (400, 600), False),
]


def used_chars():
    s = set()
    for f in TEXT_FILES:
        s |= set(f.read_text(encoding="utf-8"))
    return {ord(c) for c in s if ord(c) >= 0x20}


def expand(ranges):
    return {u for a, b in ranges for u in range(a, b + 1)}


def build(src, out, wght, ja, used):
    font = TTFont(SRC / src)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]        # tnum（数字の幅をそろえる）なども残す
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=(used | expand(JA_RANGES)) if ja else (expand(LATIN_RANGES) | {u for u in used if u < 0x3000}))
    sub.subset(font)
    if wght:   # 絞ってから軸を縮める（先に縮めると Inter の .tf 字形の参照が切れて subset が落ちる）
        font = instancer.instantiateVariableFont(font, {"wght": wght})
    font.flavor = "woff2"
    font.save(OUT / out)
    return (OUT / out).stat().st_size


def main():
    OUT.mkdir(exist_ok=True)
    used = used_chars()
    total = 0
    for src, out, wght, ja in FONTS:
        n = build(src, out, wght, ja, used)
        total += n
        print(f"{out:22s} {n/1024:7.0f} KB")
    # 絞った文字の控え：scripts/build-web.mjs が、足した問題に控えに無い漢字が出たら止める（このスクリプトの流し忘れ）
    CHARS.write_text("".join(sorted(chr(u) for u in used if u >= 0x3000)), encoding="utf-8")
    for lic in SRC.glob("*-OFL.txt"):
        shutil.copy(lic, OUT / lic.name)
    print(f"合計 {total/1024:.0f} KB（使用文字 {len(used)} 字）")


if __name__ == "__main__":
    main()
