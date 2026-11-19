#!/usr/bin/env python3
"""Kokoro(ニューラル音声合成)でwavを作る。build.py から tools/.venv の python で呼ばれる。
使い方: tts_kokoro.py job.json   job = [{"voice": "af_heart", "text": "...", "out": "x.wav", "speed": 1.0}, ...]"""
import json, re, sys
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

D = Path(__file__).resolve().parent / ".tts"
k = Kokoro(str(D / "kokoro-v1.0.onnx"), str(D / "voices-v1.0.bin"))
# 発音記号への変換は敬称の略語を読めない（Ms. を「エム・エス」と読み、どれも直後のピリオドで文末の間が入る）。
# 読み上げる文だけ読みの形に置き換える（画面の英文は変えない）。2026-11-19
TITLES = [(r"\bMs\.", "Miz"), (r"\bMrs\.", "Missus"), (r"\bMr\.", "Mister"), (r"\bDr\.", "Doctor")]


def speakable(t):
    for pat, rep in TITLES: t = re.sub(pat, rep, t)
    return t


for j in json.loads(Path(sys.argv[1]).read_text()):
    lang = "en-gb" if j["voice"].startswith("b") else "en-us"
    wav, sr = k.create(speakable(j["text"]), voice=j["voice"], speed=j.get("speed", 1.0), lang=lang)
    sf.write(j["out"], wav, sr)
