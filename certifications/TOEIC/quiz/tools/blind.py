#!/usr/bin/env python3
"""blind.py export | compare blind/answers_xxx.json   [--root DIR]"""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build

STRIP = {"a", "e", "ja", "sum", "tag"}


def clean(d):
    return {k: v for k, v in d.items() if k not in STRIP}


def questions(root):
    """Return (listing, r56, r7, answers) with answers keyed by qid."""
    data, _ = build.load(root)
    nd = build.number(data)
    ans, L, R, S = {}, [], [], []
    for it in nd["part2"]:
        L.append({"qid": it["id"], "part": 2, "num": it["num"], "question": it["prompt"], "c": it["c"]})
        ans[it["id"]] = it["a"]
    for k, part in (("part3", 3), ("part4", 4)):
        for it in nd[k]:
            if k == "part3":
                tr = [f"{ln['s']}: {ln['t']}" for ln in it["lines"]]
            else:
                tr = it["text"]
            for j, q in enumerate(it["qs"], 1):
                qid = f"{it['id']}#{j}"
                e = {"qid": qid, "part": part, "num": q["num"], "set": it["id"], "intro": it["intro"],
                     "transcript": tr, "question": q["q"], "c": q["c"]}
                if it.get("graphic"): e["graphic"] = it["graphic"]
                L.append(e); ans[qid] = q["a"]
    for it in nd["part5"]:
        R.append({"qid": it["id"], "part": 5, "num": it["num"], "question": it["q"], "c": it["c"]})
        ans[it["id"]] = it["a"]
    for it in nd["part6"]:
        for j, q in enumerate(it["qs"], 1):
            qid = f"{it['id']}#{j}"
            R.append({"qid": qid, "part": 6, "num": q["num"], "set": it["id"], "doc": it["doc"],
                      "text": it["text"], "blank": j, "c": q["c"]})
            ans[qid] = q["a"]
    for it in nd["part7"]:
        for j, q in enumerate(it["qs"], 1):
            qid = f"{it['id']}#{j}"
            S.append({"qid": qid, "part": 7, "num": q["num"], "set": it["id"], "docs": it["docs"],
                      "question": q["q"], "c": q["c"]})
            ans[qid] = q["a"]
    return L, R, S, ans


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["export", "compare"])
    ap.add_argument("file", nargs="?")
    ap.add_argument("--root", default=str(build.ROOT))
    a = ap.parse_args()
    root = Path(a.root).resolve()
    L, R, S, ans = questions(root)
    if a.cmd == "export":
        b = root / "blind"; b.mkdir(exist_ok=True)
        for name, v in (("listening", L), ("reading56", R), ("reading7", S)):
            (b / f"{name}.json").write_text(json.dumps(v, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"blind/{name}.json: {len(v)}問")
    else:
        if not a.file: ap.error("compare には答えファイルを指定")
        given = json.loads(Path(a.file).read_text(encoding="utf-8"))
        bad = 0
        for qid in sorted(set(ans) | set(given)):
            if qid not in ans: print(f"{qid}: 正本に存在しない qid"); bad += 1
            elif qid not in given: print(f"{qid}: 未回答（正本 {ans[qid]}）"); bad += 1
            elif given[qid] != ans[qid]: print(f"{qid}: 回答 {given[qid]} / 正本 {ans[qid]}"); bad += 1
        print(f"== 不一致 {bad} / {len(ans)} ==")
        sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
