#!/usr/bin/env python3
"""英単語特訓のデータを作る。
使い方: vocab.py merge | validate | blind-export | blind-compare | audio | data   [--root DIR] [--only 語]
  merge         blind/vocab_work/part*.json を tsv の順にまとめて content/vocab.json を作る（初回・語の追加時）
  validate      content/vocab.json の形を検査する
  blind-export  空所問題を答え抜きで blind/vocab_cloze_N.json に出す
  blind-compare blind/vocab_answers_*.json と正解を照合する
  audio         audio/v/{id}.mp3（単語）と {id}_s.mp3（例文）を作る
  data          data/vocab.js を出力する
"""
import argparse, hashlib, json, os, random, re, subprocess, sys, tempfile, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build

POS = ["動", "名", "形", "副", "前・接", "句"]
# 単語の声は Kokoro の米・英だけを順に使う（say の声は使わない）
VOICE_KEYS = ["US-F", "UK-M", "US-M", "UK-F", "US-F2", "UK-M2", "US-M2"]
CHUNK = 40
BLIND_PARTS = 3


def slug(w):
    return re.sub(r"[^a-z0-9]+", "_", w.lower()).strip("_")


def words_tsv(root):
    rows = []
    for l in (root / "content" / "vocab_words.tsv").read_text(encoding="utf-8").splitlines():
        if l.strip() and not l.startswith("#"):
            p = l.split("\t")
            rows.append((int(p[0]), p[1], p[2] if len(p) > 2 else ""))
    return rows


def load(root):
    p = root / "content" / "vocab.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def count_f(e):
    return len(re.findall(r"(?<![A-Za-z])" + re.escape(e["f"]) + r"(?![A-Za-z])", e["ex"]))


def merge(root):
    by = {}
    for p in sorted((root / "blind" / "vocab_work").glob("part*.json")):
        for e in json.loads(p.read_text(encoding="utf-8")):
            by[e["w"]] = e
    old = {e["w"]: e for e in load(root)}
    out, miss = [], []
    for lv, w, _ in words_tsv(root):
        e = by.get(w) or old.get(w)
        if not e: miss.append(w); continue
        e = {k: e[k] for k in ("w", "pos", "lv", "ja", "ex", "f", "exja", "syn", "d", "note") if k in e and e[k] not in ("", None)}
        e["lv"] = lv
        out.append(e)
    (root / "content" / "vocab.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"== merge: {len(out)}語 を content/vocab.json に出力。未作成 {len(miss)}語 {miss[:20]}")
    return not miss


def validate(root):
    items = load(root)
    errs, warns = [], []
    tsv = words_tsv(root)
    if [e.get("w") for e in items] != [w for _, w, _ in tsv]:
        have = {e.get("w") for e in items}; want = {w for _, w, _ in tsv}
        errs.append(f"tsv と語の並びが違う。不足 {sorted(want - have)[:10]} 余分 {sorted(have - want)[:10]}")
    seen = {}
    for e in items:
        w = e.get("w", "?")
        miss = [k for k in ("w", "pos", "lv", "ja", "ex", "f", "exja", "syn", "d") if k not in e]
        if miss: errs.append(f"{w}: 必須キー欠落 {miss}"); continue
        s = slug(w)
        if s in seen: errs.append(f"{w}: id が {seen[s]} と重複")
        seen[s] = w
        if e["pos"] not in POS: errs.append(f"{w}: pos {e['pos']!r}")
        if e["lv"] not in (1, 2, 3): errs.append(f"{w}: lv {e['lv']!r}")
        if not e["ja"].strip() or len(e["ja"]) > 22: errs.append(f"{w}: ja が空か長い（{len(e['ja'])}字）")
        if count_f(e) != 1: errs.append(f"{w}: ex の中の f={e['f']!r} が {count_f(e)} 回")
        n = len(e["ex"].split())
        if not 9 <= n <= 17: warns.append(f"{w}: 例文 {n}語")
        d = e["d"]
        if not isinstance(d, list) or len(d) != 3 or len({x.lower() for x in d} | {e["f"].lower()}) != 4:
            errs.append(f"{w}: d が3つの別の語ではない"); continue
        if not isinstance(e["syn"], list) or not 1 <= len(e["syn"]) <= 3: errs.append(f"{w}: syn は1〜3個")
        both = {x.lower() for x in d} & {x.lower() for x in e["syn"]}
        if both: errs.append(f"{w}: 誤答 {both} が言い換え(syn)にも入っている")
        if not e["exja"].strip(): errs.append(f"{w}: exja が空")
        if len(e.get("note", "")) > 40: warns.append(f"{w}: note が40字超")
        if (len(e["f"].split()) > 1) != any(len(x.split()) > 1 for x in d) and e["pos"] in ("句",):
            warns.append(f"{w}: 句なのに誤答が1語（または逆）")
    print(f"== vocab validate: {len(items)}語 / エラー {len(errs)} / 警告 {len(warns)} ==")
    for m in errs: print("ERROR", m)
    for m in warns: print("WARN ", m)
    return not errs


# ---------------- blind ----------------
def cloze(e):
    """答え抜きの空所問題。選択肢の順は語ごとに固定（何度出しても同じ）。"""
    opts = [e["f"]] + list(e["d"])
    random.Random(slug(e["w"])).shuffle(opts)
    s = re.sub(r"(?<![A-Za-z])" + re.escape(e["f"]) + r"(?![A-Za-z])", "_____", e["ex"], count=1)
    return s, opts, opts.index(e["f"])


def blind_export(root, only=None):
    items = [e for e in load(root) if not only or e["w"] in only]
    qs = [{"id": slug(e["w"]), "s": cloze(e)[0], "c": cloze(e)[1]} for e in items]
    random.Random(7).shuffle(qs)
    out = root / "blind"; out.mkdir(exist_ok=True)
    for f in out.glob("vocab_cloze_*.json"): f.unlink()
    n = BLIND_PARTS if len(qs) > 120 else 1
    for i in range(n):
        part = qs[i::n]
        (out / f"vocab_cloze_{i+1}.json").write_text(json.dumps(part, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"blind/vocab_cloze_{i+1}.json: {len(part)}問")
    return True


def blind_compare(root):
    items = {slug(e["w"]): e for e in load(root)}
    ans, amb = {}, {}
    for p in sorted((root / "blind").glob("vocab_answers_*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        ans.update(d.get("answers", {})); amb.update(d.get("ambiguous", {}))
    wrong = []
    for i, e in items.items():
        if i not in ans: continue
        _, opts, a = cloze(e)
        if ans[i] != a: wrong.append((e["w"], opts[ans[i]] if isinstance(ans[i], int) and 0 <= ans[i] < 4 else ans[i]))
    print(f"== blind-compare: 解答 {len(ans)} / 全 {len(items)}、不一致 {len(wrong)}、あいまいの指摘 {len(amb)} ==")
    for w, pick in wrong: print(f"MISS  {w}: 解答者は {pick!r} を選んだ")
    for i, why in amb.items(): print(f"AMBIG {items[i]['w'] if i in items else i}: {why}")
    rep = {"miss": [w for w, _ in wrong], "ambiguous": [items[i]["w"] for i in amb if i in items]}
    (root / "blind" / "vocab_report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    return True


# ---------------- audio ----------------
def voice_for(w):
    k = VOICE_KEYS[int(hashlib.sha1(w.encode()).hexdigest(), 16) % len(VOICE_KEYS)]
    _, name, sp = build.VOICES[k].split(":")
    return name, float(sp)


def audio(root, only=None):
    tools = Path(__file__).resolve().parent
    adir = root / "audio" / "v"; adir.mkdir(parents=True, exist_ok=True)
    hp = adir / ".hashes.json"
    hashes = json.loads(hp.read_text()) if hp.exists() else {}
    jobs = []
    op = tools / "vocab_voice.json"
    over = json.loads(op.read_text(encoding="utf-8")) if op.exists() else {}
    for e in load(root):
        if only and e["w"] not in only: continue
        i = slug(e["w"])
        for key, text in ((i, e["w"].rstrip(".") + "."), (i + "_s", e["ex"])):
            name, sp = voice_for(e["w"])
            if key == i and e["w"] in over:  # 1語だと発音が崩れた語は、声を指定して作り直す（tools/vocab_voice.json）
                _, name, sp = build.VOICES[over[e["w"]]].split(":"); sp = float(sp)
            h = hashlib.sha1(json.dumps([build.TTS_VER, name, sp, text]).encode()).hexdigest()
            if (adir / f"{key}.mp3").exists() and hashes.get(key) == h: continue
            jobs.append((key, name, sp, text, h))
    print(f"== vocab audio: 作成 {len(jobs)} 件 ==", flush=True)
    lock = threading.Lock(); done = [0]

    def work(chunk):
        with tempfile.TemporaryDirectory() as tmp:
            job = [{"voice": n, "text": t, "out": os.path.join(tmp, f"{k}.wav"), "speed": s} for k, n, s, t, _ in chunk]
            jp = os.path.join(tmp, "job.json"); Path(jp).write_text(json.dumps(job))
            for _ in range(3):
                try:
                    subprocess.run([str(tools / ".venv/bin/python"), str(tools / "tts_kokoro.py"), jp], check=True, timeout=400,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    break
                except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
                    print("  合成に失敗。やり直します", flush=True)
            else:
                print("  3回失敗したのでこの束を飛ばします:", [c[0] for c in chunk], flush=True); return
            for (k, _, _, _, h), j in zip(chunk, job):
                gain = max(-12.0, min(12.0, -20.0 - build.mean_db(j["out"])))
                tmpout = adir / f"{k}.tmp.mp3"
                build.run(["ffmpeg", "-y", "-loglevel", "error", "-i", j["out"], "-af",
                           f"volume={gain:.1f}dB,alimiter=limit=0.9,adelay=120,apad=pad_dur=0.25",
                           "-ar", build.SR, "-ac", "1", "-b:a", "64k", str(tmpout)])
                os.replace(tmpout, adir / f"{k}.mp3")
                with lock: hashes[k] = h
            with lock:
                done[0] += len(chunk)
                hp.write_text(json.dumps(hashes, indent=0))
                print(f"  {done[0]} / {len(jobs)}", flush=True)

    chunks = [jobs[i:i + CHUNK] for i in range(0, len(jobs), CHUNK)]
    with ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(work, chunks))
    left = len(jobs) - done[0]
    print(f"== vocab audio: 完了 {done[0]} / 失敗 {left} ==")
    return left == 0


# ---------------- data ----------------
def build_data(root):
    items = load(root)
    if not items: return True
    out, noaudio = [], 0
    for e in items:
        i = slug(e["w"])
        o = {"id": i, **e}
        if (root / "audio" / "v" / f"{i}.mp3").exists() and (root / "audio" / "v" / f"{i}_s.mp3").exists(): o["au"] = 1
        else: noaudio += 1
        out.append(o)
    (root / "data").mkdir(exist_ok=True)
    (root / "data" / "vocab.js").write_text("window.TOEIC_VOCAB = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
    print(f"== vocab data: data/vocab.js を出力 {len(out)}語（音声なし {noaudio}語） ==")
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["merge", "validate", "blind-export", "blind-compare", "audio", "data"])
    ap.add_argument("--root", default=str(build.ROOT))
    ap.add_argument("--only", nargs="*", help="この語だけ（audio / blind-export）")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    f = {"merge": merge, "validate": validate, "blind-compare": blind_compare, "data": build_data}.get(a.cmd)
    if f: ok = f(root)
    elif a.cmd == "audio": ok = audio(root, a.only)
    else: ok = blind_export(root, a.only)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
