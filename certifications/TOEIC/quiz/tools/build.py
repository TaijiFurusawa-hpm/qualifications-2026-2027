#!/usr/bin/env python3
"""TOEIC quiz builder: validate / audio / data.  Usage: build.py [validate|audio|data] [--root DIR] [--only ID]"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RATE = "165"
NARR = "Samantha"
VOICES = {
    "US-F": "Samantha", "US-F2": "Shelley (英語（アメリカ）)", "US-M": "Reed (英語（アメリカ）)",
    "US-M2": "Eddy (英語（アメリカ）)", "UK-F": "Shelley (英語（イギリス）)", "UK-M": "Daniel",
    "UK-M2": "Reed (英語（イギリス）)", "AU-F": "Karen",
}
P2_TAGS = ["WH疑問文", "YesNo疑問文", "否定・付加疑問文", "選択疑問文", "依頼・提案・申し出", "平叙文"]
P34_TAGS = ["主題・目的", "詳細", "次の行動", "話者・場所", "意図問題", "図表問題"]
P5_TAGS = ["品詞", "動詞の形", "前置詞・接続詞", "代名詞・関係詞", "語彙", "語法・その他"]
P6_TAGS = ["文挿入", "語彙", "文法"]
P7_TAGS = ["主旨・目的", "詳細", "推測", "NOT問題", "言い換え（同義語）", "意図問題", "文挿入", "複数文書の照合"]
# (name, file, id prefix, count, first num)
FILES = {
    "part2": ("part2.json", "P2", 25), "part3": ("part3.json", "P3", 13), "part4": ("part4.json", "P4", 10),
    "part5": ("part5.json", "P5", 30), "part6": ("part6.json", "P6", 4),
    "part7s": ("part7_single.json", "P7S", 10), "part7m": ("part7_multi.json", "P7M", 5),
}
STARTS = {"part2": 7, "part3": 32, "part4": 71, "part5": 101, "part6": 131, "part7": 147}


def load(root):
    data, errs = {}, []
    for k, (fn, _, _) in FILES.items():
        p = root / "content" / fn
        if not p.exists():
            errs.append(f"{fn}: ファイルがありません"); data[k] = []; continue
        try:
            data[k] = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            errs.append(f"{fn}: JSON読込エラー {e}"); data[k] = []
    return data, errs


def words(s):
    return len(re.findall(r"[A-Za-z0-9'’$%.,-]+", re.sub(r"\{\{\d\}\}|\[\d\]|-{3,}", " ", s)))


def number(data):
    """Return dict part -> list of items, with 'num' assigned (set parts get num on each q)."""
    out = {}
    for part in ["part2", "part3", "part4", "part5", "part6"]:
        n = STARTS[part]; items = []
        for it in data.get(part, []):
            it = json.loads(json.dumps(it))
            if "qs" in it:
                for q in it["qs"]: q["num"] = n; n += 1
            else:
                it["num"] = n; n += 1
            items.append(it)
        out[part] = items
    n = STARTS["part7"]; items = []
    for it in data.get("part7s", []) + data.get("part7m", []):
        it = json.loads(json.dumps(it))
        for q in it["qs"]: q["num"] = n; n += 1
        items.append(it)
    out["part7"] = items
    return out


# ---------------- validate ----------------
def validate(root):
    data, errs = load(root)
    warns = []
    E = lambda m: errs.append(m)
    W = lambda m: warns.append(m)

    def base(k, items):
        fn, pre, cnt = FILES[k]
        if items and len(items) != cnt: E(f"{fn}: 件数 {len(items)}（期待 {cnt}）")
        for i, it in enumerate(items, 1):
            exp = f"{pre}-{i:02d}"
            if it.get("id") != exp: E(f"{fn}: {i}番目の id が {it.get('id')!r}（期待 {exp}）")

    def need(fn, id_, it, keys):
        miss = [k for k in keys if k not in it]
        if miss: E(f"{fn} {id_}: 必須キー欠落 {miss}")
        return not miss

    def check_choice(fn, id_, o, nc, tags, e_needed=True):
        c = o.get("c")
        if not isinstance(c, list) or len(c) != nc: E(f"{fn} {id_}: 選択肢が{nc}個ではない"); return
        if len(set(c)) != nc: E(f"{fn} {id_}: 選択肢に重複")
        a = o.get("a")
        if not isinstance(a, int) or isinstance(a, bool) or not 0 <= a < nc: E(f"{fn} {id_}: a が範囲外 {a!r}")
        if tags is not None and o.get("tag") not in tags: E(f"{fn} {id_}: tag {o.get('tag')!r} が一覧にない")
        if e_needed and not str(o.get("e", "")).strip(): E(f"{fn} {id_}: e が空")

    def bias(fn, ans, n):
        if len(ans) < 8: return
        dist = [ans.count(i) for i in range(n)]
        lim = len(ans) * (0.5 if n == 3 else 0.4)
        W(f"{fn}: 正解位置の分布 {dist}") if max(dist) > lim or min(dist) == 0 else None

    # Part 2
    items = data["part2"]; base("part2", items); fn = "part2.json"; ans = []
    tagc = {}
    for it in items:
        i = it.get("id")
        if not need(fn, i, it, ["id", "tag", "vq", "va", "prompt", "c", "a", "ja", "e"]): continue
        check_choice(fn, i, it, 3, P2_TAGS); ans.append(it["a"]) if isinstance(it["a"], int) else None
        tagc[it["tag"]] = tagc.get(it["tag"], 0) + 1
        for v in ("vq", "va"):
            if it[v] not in VOICES: E(f"{fn} {i}: {v}={it[v]!r} は未知の声")
        if it["vq"] == it["va"]: W(f"{fn} {i}: vq と va が同じ声")
        if not isinstance(it["ja"], dict) or "prompt" not in it["ja"] or len(it["ja"].get("c", [])) != 3: E(f"{fn} {i}: ja の形が不正")
    bias(fn, ans, 3)
    if items:
        exp = dict(zip(P2_TAGS, [10, 4, 3, 2, 3, 3]))
        if any(tagc.get(t, 0) != n for t, n in exp.items()): W(f"{fn}: tag配分 {tagc}（目安 {exp}）")

    # Part 3 / 4
    for k, lo, hi in (("part3", 90, 130), ("part4", 90, 120)):
        items = data[k]; base(k, items); fn = FILES[k][0]; ans = []; intents = 0
        for idx, it in enumerate(items, 1):
            i = it.get("id")
            keys = ["id", "intro", "speakers", "lines", "ja", "qs"] if k == "part3" else ["id", "intro", "v", "text", "ja", "qs"]
            if not need(fn, i, it, keys): continue
            if k == "part3":
                sp = {s.get("k"): s.get("v") for s in it["speakers"]}
                for s, v in sp.items():
                    if v not in VOICES: E(f"{fn} {i}: 未知の声 {v!r}")
                if len(set(sp.values())) != len(sp): W(f"{fn} {i}: 同じ声が複数の話者に")
                for ln in it["lines"]:
                    if ln.get("s") not in sp: E(f"{fn} {i}: 話者 {ln.get('s')!r} が speakers にない")
                if len(it["ja"]) != len(it["lines"]): E(f"{fn} {i}: ja の行数が lines と不一致")
                if not 6 <= len(it["lines"]) <= 9: W(f"{fn} {i}: 発話数 {len(it['lines'])}（目安 6〜9）")
                w = sum(words(l.get("t", "")) for l in it["lines"])
                three = "three" in it["intro"]
                if three != (len(sp) == 3): W(f"{fn} {i}: intro と話者数が合わない")
            else:
                if it["v"] not in VOICES: E(f"{fn} {i}: 未知の声 {it['v']!r}")
                w = words(it["text"])
            if not lo <= w <= hi: W(f"{fn} {i}: 語数 {w}（目安 {lo}〜{hi}）")
            needg = (k == "part3" and idx >= 11) or (k == "part4" and idx >= 9)
            g = it.get("graphic")
            if needg and not g: E(f"{fn} {i}: graphic が必要")
            if not needg and g: W(f"{fn} {i}: graphic は不要のはず")
            if g and (not isinstance(g.get("rows"), list) or len(g["rows"]) < 2): E(f"{fn} {i}: graphic.rows が不正")
            if len(it["qs"]) != 3: E(f"{fn} {i}: 設問が3問ではない")
            for j, q in enumerate(it["qs"], 1):
                if not need(fn, f"{i}#{j}", q, ["q", "c", "a", "e", "tag"]): continue
                check_choice(fn, f"{i}#{j}", q, 4, P34_TAGS); ans.append(q["a"]) if isinstance(q["a"], int) else None
                if q["tag"] == "意図問題": intents += 1
                if q["tag"] == "図表問題" and not g: E(f"{fn} {i}#{j}: 図表問題だが graphic なし")
        bias(fn, ans, 4)
        if items and intents != 3: W(f"{fn}: 意図問題 {intents}問（目安 3）")

    # Part 5
    items = data["part5"]; base("part5", items); fn = "part5.json"; ans = []; tagc = {}
    for it in items:
        i = it.get("id")
        if not need(fn, i, it, ["id", "tag", "q", "c", "a", "ja", "e"]): continue
        check_choice(fn, i, it, 4, P5_TAGS); ans.append(it["a"]) if isinstance(it["a"], int) else None
        tagc[it["tag"]] = tagc.get(it["tag"], 0) + 1
        if it["q"].count("-------") != 1: E(f"{fn} {i}: 空所 ------- が1つではない")
    bias(fn, ans, 4)
    if items:
        exp = dict(zip(P5_TAGS, [8, 5, 5, 3, 8, 1]))
        if any(tagc.get(t, 0) != n for t, n in exp.items()): W(f"{fn}: tag配分 {tagc}（目安 {exp}）")

    # Part 6
    items = data["part6"]; base("part6", items); fn = "part6.json"; ans = []
    for it in items:
        i = it.get("id")
        if not need(fn, i, it, ["id", "doc", "text", "sum", "qs"]): continue
        for b in range(1, 5):
            if it["text"].count("{{%d}}" % b) != 1: E(f"{fn} {i}: {{{{{b}}}}} が1回ではない")
        w = words(it["text"])
        if not 100 <= w <= 130: W(f"{fn} {i}: 語数 {w}（目安 100〜130）")
        if len(it["qs"]) != 4: E(f"{fn} {i}: 設問が4問ではない")
        ins = 0
        for j, q in enumerate(it["qs"], 1):
            if not need(fn, f"{i}#{j}", q, ["c", "a", "e", "tag"]): continue
            check_choice(fn, f"{i}#{j}", q, 4, P6_TAGS); ans.append(q["a"]) if isinstance(q["a"], int) else None
            ins += q["tag"] == "文挿入"
        if ins != 1: E(f"{fn} {i}: 文挿入が{ins}問（期待 1）")
    bias(fn, ans, 4)

    # Part 7
    for k, counts in (("part7s", [2, 2, 2, 2, 3, 3, 3, 4, 4, 4]), ("part7m", [5] * 5)):
        items = data[k]; base(k, items); fn = FILES[k][0]; ans = []
        tot = {"意図問題": 0, "文挿入": 0, "NOT問題": 0, "言い換え（同義語）": 0, "複数文書の照合": 0}
        for idx, it in enumerate(items, 1):
            i = it.get("id")
            if not need(fn, i, it, ["id", "docs", "sum", "qs"]): continue
            if len(it["sum"]) != len(it["docs"]): E(f"{fn} {i}: sum の数が docs と不一致")
            if k == "part7m":
                exp = 2 if idx <= 2 else 3
                if len(it["docs"]) != exp: E(f"{fn} {i}: 文書数 {len(it['docs'])}（期待 {exp}）")
            for d in it["docs"]:
                if "type" not in d or "text" not in d: E(f"{fn} {i}: docs の type/text 欠落")
            alltext = "\n".join(d.get("text", "") for d in it["docs"])
            if k == "part7s" and idx - 1 < len(counts) and len(it["qs"]) != counts[idx - 1]:
                E(f"{fn} {i}: 設問数 {len(it['qs'])}（期待 {counts[idx-1]}）")
            if k == "part7m" and len(it["qs"]) != 5: E(f"{fn} {i}: 設問数 {len(it['qs'])}（期待 5）")
            for j, q in enumerate(it["qs"], 1):
                if not need(fn, f"{i}#{j}", q, ["q", "c", "a", "e", "tag"]): continue
                check_choice(fn, f"{i}#{j}", q, 4, P7_TAGS); ans.append(q["a"]) if isinstance(q["a"], int) else None
                tot[q["tag"]] = tot.get(q["tag"], 0) + 1
                if q["tag"] == "文挿入":
                    for b in range(1, 5):
                        if alltext.count(f"[{b}]") != 1: E(f"{fn} {i}#{j}: 本文の [{b}] が1回ではない")
            w = words(alltext)
            if k == "part7s":
                if idx == 1 and w > 150: W(f"{fn} {i}: 語数 {w}（最初は約100語）")
                if idx == 10 and not 220 <= w <= 400: W(f"{fn} {i}: 語数 {w}（最後は約300語）")
        bias(fn, ans, 4)
        if items:
            if k == "part7s":
                for t, n in (("意図問題", 2), ("文挿入", 2), ("NOT問題", 3)):
                    if tot[t] != n: W(f"{fn}: {t} {tot[t]}問（目安 {n}）")
                if not 1 <= tot["言い換え（同義語）"] <= 2: W(f"{fn}: 同義語 {tot['言い換え（同義語）']}問（目安 1〜2）")
                types = [d.get("type") for it in items for d in it.get("docs", [])]
                if len(set(types)) < 8: W(f"{fn}: 文書の種類が少ない（{len(set(types))}種）")
            else:
                if tot["言い換え（同義語）"] != 2: W(f"{fn}: 同義語 {tot['言い換え（同義語）']}問（目安 2）")
                if tot["複数文書の照合"] != 9: W(f"{fn}: 複数文書の照合 {tot['複数文書の照合']}問（目安 2文書×1〜2＋3文書×2＝8〜10）") if not 8 <= tot["複数文書の照合"] <= 10 else None

    print(f"== validate: エラー {len(errs)} / 警告 {len(warns)} ==")
    for m in errs: print("ERROR", m)
    for m in warns: print("WARN ", m)
    return not errs


# ---------------- audio ----------------
def audio_plans(numbered):
    """id -> list of segments: ('say', voice_name, text) or ('sil', sec)"""
    plans = {}
    for it in numbered["part2"]:
        va = VOICES[it["va"]]
        seg = [("say", NARR, f"Number {it['num']}."), ("say", VOICES[it["vq"]], it["prompt"]), ("sil", 0.6)]
        for lab, c in zip("ABC", it["c"]):
            seg += [("say", va, f"{lab}."), ("say", va, c)]
        plans[it["id"]] = seg
    for k in ("part3", "part4"):
        for it in numbered[k]:
            n1, n2 = it["qs"][0]["num"], it["qs"][-1]["num"]
            seg = [("say", NARR, f"Questions {n1} through {n2} refer to the following {it['intro']}."), ("sil", 1.0)]
            if k == "part3":
                sp = {s["k"]: VOICES[s["v"]] for s in it["speakers"]}
                for ln in it["lines"]:
                    seg += [("say", sp[ln["s"]], ln["t"]), ("sil", 0.5)]
            else:
                seg += [("say", VOICES[it["v"]], it["text"])]
            plans[it["id"]] = seg
    return plans


def plan_text(seg):
    return " ".join(s[2] for s in seg if s[0] == "say")


def run(cmd):
    subprocess.run(cmd, check=True)


def render(seg, out):
    with tempfile.TemporaryDirectory() as tmp:
        parts, sil = [], {}
        for n, s in enumerate(seg):
            if s[0] == "say":
                a, w = os.path.join(tmp, f"{n}.aiff"), os.path.join(tmp, f"{n}.wav")
                run(["say", "-v", s[1], "-r", RATE, "-o", a, s[2]])
                run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-ar", "22050", "-ac", "1", w])
            else:
                w = os.path.join(tmp, f"sil_{s[1]}.wav")
                if not os.path.exists(w):
                    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", str(s[1]), w])
            parts.append(w)
        lst = os.path.join(tmp, "list.txt")
        Path(lst).write_text("".join(f"file '{p}'\n" for p in parts))
        tmpout = out.with_suffix(".tmp.mp3")
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
             "-ar", "22050", "-ac", "1", "-b:a", "96k", str(tmpout)])
        os.replace(tmpout, out)


def audio(root, only=None):
    data, errs = load(root)
    plans = audio_plans(number(data))
    if only and only not in plans:
        print(f"ERROR: {only} は音声対象（Part 2〜4）にありません"); return False
    adir = root / "audio"; adir.mkdir(exist_ok=True)
    hp = adir / ".hashes.json"
    hashes = json.loads(hp.read_text()) if hp.exists() else {}
    made = skipped = 0
    for id_, seg in plans.items():
        if only and id_ != only: continue
        h = hashlib.sha1(json.dumps([RATE, seg], ensure_ascii=False).encode()).hexdigest()
        out = adir / f"{id_}.mp3"
        if out.exists() and hashes.get(id_) == h: skipped += 1; continue
        print("audio:", id_, flush=True)
        render(seg, out); hashes[id_] = h; made += 1
        hp.write_text(json.dumps(hashes, indent=0))
    print(f"== audio: 作成 {made} / 変更なし {skipped} ==")
    return True


# ---------------- data ----------------
def build_data(root):
    data, errs = load(root)
    nd = number(data)
    for k in ("part2", "part3", "part4"):
        for it in nd[k]:
            if (root / "audio" / f"{it['id']}.mp3").exists(): it["audio"] = f"audio/{it['id']}.mp3"
            else: print(f"WARN  音声なし: {it['id']}")
    (root / "data").mkdir(exist_ok=True)
    body = json.dumps(nd, ensure_ascii=False, indent=1)
    (root / "data" / "data.js").write_text(f"window.TOEIC_DATA = {body};\n", encoding="utf-8")
    print("== data: data/data.js を出力 ==", {k: len(v) for k, v in nd.items()})
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("cmd", nargs="?", choices=["validate", "audio", "data"])
    ap.add_argument("--root", default=str(ROOT))
    ap.add_argument("--only")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    ok = True
    if a.cmd in (None, "validate"): ok = validate(root)
    if a.cmd is None and not ok: sys.exit(1)
    if a.cmd in (None, "audio"): ok = audio(root, a.only) and ok
    if a.cmd in (None, "data"): ok = build_data(root) and ok
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
