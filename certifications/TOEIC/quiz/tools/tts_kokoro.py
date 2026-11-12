#!/usr/bin/env python3
"""Kokoro(ニューラル音声合成)でwavを作る。build.py から tools/.venv の python で呼ばれる。
使い方: tts_kokoro.py job.json   job = [{"voice": "af_heart", "text": "...", "out": "x.wav", "speed": 1.0}, ...]"""
import json, sys
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

D = Path(__file__).resolve().parent / ".tts"
k = Kokoro(str(D / "kokoro-v1.0.onnx"), str(D / "voices-v1.0.bin"))
for j in json.loads(Path(sys.argv[1]).read_text()):
    lang = "en-gb" if j["voice"].startswith("b") else "en-us"
    wav, sr = k.create(j["text"], voice=j["voice"], speed=j.get("speed", 1.0), lang=lang)
    sf.write(j["out"], wav, sr)
