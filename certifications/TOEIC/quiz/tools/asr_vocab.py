#!/usr/bin/env python3
"""audio/v/ の単語音声を mlx_whisper で文字起こしし、見出し語と違って聞こえるものを表示する。
1語だけの音声は聞き取りが揺れるので、出てきた語は人が聞いて確かめる（同音の語に化けるだけのことも多い）。 [--sent] で例文も検査。"""
import difflib, json, re, sys
from pathlib import Path
import mlx_whisper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import vocab

root = vocab.build.ROOT
norm = lambda s: " ".join(re.findall(r"[a-z0-9']+", s.lower().replace("’", "'").replace("-", " ")))
sent = "--sent" in sys.argv
bad = []
for e in vocab.load(root):
    i = vocab.slug(e["w"])
    f = root / "audio" / "v" / (i + ("_s" if sent else "") + ".mp3")
    if not f.exists(): continue
    want = norm(e["ex"] if sent else e["w"])
    r = mlx_whisper.transcribe(str(f), path_or_hf_repo="mlx-community/whisper-large-v3-mlx", language="en",
                               condition_on_previous_text=False, initial_prompt=None if sent else "A single English word or phrase:")
    got = norm(r["text"])
    ratio = difflib.SequenceMatcher(None, want, got).ratio()
    if ratio < (0.9 if sent else 0.8):
        bad.append((e["w"], got, round(ratio, 2))); print("DIFF", e["w"], "→", got, round(ratio, 2), flush=True)
print(f"== 検査終了: 食い違い {len(bad)} 件 ==")
