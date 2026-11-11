#!/usr/bin/env python3
"""audio/*.mp3 を mlx_whisper で文字起こしし、元の英文との単語一致率が90%未満のものを表示。 [--root DIR] [--only ID] [--threshold 0.9]"""
import argparse, difflib, re, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build


def norm(s):
    s = s.lower().replace("’", "'")
    return re.findall(r"[a-z0-9']+", s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(build.ROOT))
    ap.add_argument("--only")
    ap.add_argument("--threshold", type=float, default=0.9)
    a = ap.parse_args()
    root = Path(a.root).resolve()
    data, _ = build.load(root)
    plans = build.audio_plans(build.number(data))
    files = [f for f in sorted((root / "audio").glob("*.mp3")) if f.stem in plans and (not a.only or f.stem == a.only)]
    if not files: print("音声ファイルがありません"); return
    with tempfile.TemporaryDirectory() as tmp:
        # 複数ファイルを一度に渡すと出力名が衝突するため、1件ずつ実行する
        for f in files:
            r = subprocess.run(["mlx_whisper", str(f), "--model", "mlx-community/whisper-large-v3-mlx",
                                "--language", "en", "--condition-on-previous-text", "False",
                                "-o", tmp, "-f", "txt"], stdout=subprocess.DEVNULL)
            if r.returncode: sys.exit(f"mlx_whisper が失敗しました: {f.name}")
        low = 0
        for f in files:
            t = Path(tmp) / f"{f.stem}.txt"
            hyp = norm(t.read_text(encoding="utf-8")) if t.exists() else []
            ref = norm(build.plan_text(plans[f.stem]))
            m = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
            rate = sum(b.size for b in m.get_matching_blocks()) / max(len(ref), 1)
            if rate < a.threshold:
                low += 1
                print(f"{f.stem}: {rate:.1%}")
                for tag, i1, i2, j1, j2 in m.get_opcodes():
                    if tag != "equal": print(f"   元: {' '.join(ref[i1:i2])!r}  認識: {' '.join(hyp[j1:j2])!r}")
    print(f"== {len(files)}件中 {a.threshold:.0%}未満 {low}件 ==")


if __name__ == "__main__":
    main()
