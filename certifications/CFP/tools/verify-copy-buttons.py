#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
コピーボタンの挙動検証（2026-08-25 新設）

★「ボタンが何個あるか」を数えるだけの検証はしない。
  実際に headless Chrome でページを開き、navigator.clipboard を差し替えて
  【全ボタンをクリックし、実際にコピーされた文字列】を回収して照合する。

v1のバグ（全ボタンがプロンプト①をコピーする）は、
「ボタン数を数える」検証では検出できなかった。だからこのスクリプトを作った。

使い方:  python3 tools/verify-copy-buttons.py [HTMLファイル...]
        引数なしなら NotebookLM_*_ポッドキャスト用プロンプト.html を全部検査
"""
import sys, os, re, glob, subprocess, tempfile, html

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SEP = "<<|>>"

HARNESS = """
<script>
(function(){
  var SEP = '<<|>>';
  var log = [];
  var note = [];

  // 経路A: navigator.clipboard.writeText を差し替える
  var stub = { writeText: function(t){ log.push(String(t)); return Promise.resolve(); } };
  var stubbed = false;
  try { Object.defineProperty(navigator, 'clipboard', { value: stub, configurable: true }); stubbed = true; }
  catch(e) { try { navigator.clipboard = stub; stubbed = (navigator.clipboard === stub); } catch(e2) {} }
  note.push('clipboardStub=' + stubbed);

  // 経路B: execCommand('copy') のフォールバックも捕捉する
  //   （headless / file:// では navigator.clipboard が無く、こちらに落ちる）
  var origExec = document.execCommand ? document.execCommand.bind(document) : null;
  document.execCommand = function(cmd){
    if (String(cmd).toLowerCase() === 'copy') {
      var ae = document.activeElement;
      if (ae && typeof ae.value === 'string') { log.push(ae.value); return true; }
      log.push('__NO_ACTIVE_TEXTAREA__'); return false;
    }
    return origExec ? origExec.apply(null, arguments) : false;
  };

  var btns = Array.prototype.slice.call(document.querySelectorAll('.copy'));
  var pres = Array.prototype.slice.call(document.querySelectorAll('pre'));
  btns.forEach(function(b){ try { b.click(); } catch(e) { log.push('__CLICK_ERROR__'); } });

  setTimeout(function(){
    var lines = [];
    lines.push('BUTTONS=' + btns.length);
    lines.push('PRES=' + pres.length);
    lines.push('COPIED=' + log.length);
    var uniq = {}; log.forEach(function(t){ uniq[t] = 1; });
    lines.push('UNIQUE=' + Object.keys(uniq).length);
    lines.push('NOTE=' + note.join(','));
    log.forEach(function(t, i){
      lines.push('COPY' + (i+1) + '=' + t.replace(/\\s+/g, ' ').slice(0, 60));
    });
    pres.forEach(function(p, i){
      lines.push('PRE' + (i+1) + '=' + p.innerText.replace(/\\s+/g, ' ').slice(0, 60));
    });
    var out = document.createElement('div');
    out.id = '__VERIFY__';
    out.setAttribute('data-report', lines.join(SEP));
    document.body.appendChild(out);
  }, 200);
})();
</script>
"""

def verify(path):
    src = open(path, encoding="utf-8").read()
    injected = src.replace("</body>", HARNESS + "\n</body>")
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as t:
        t.write(injected); tmp = t.name
    try:
        dom = subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--dump-dom",
             "--virtual-time-budget=4000", "file://" + tmp],
            capture_output=True, text=True, timeout=90).stdout
    finally:
        os.unlink(tmp)

    m = re.search(r'id="__VERIFY__" data-report="([^"]*)"', dom)
    if not m:
        return False, ["NG 検証ハーネスが動かなかった（JSエラーの可能性）"]
    rep = {}
    for item in html.unescape(m.group(1)).split(SEP):
        if "=" in item:
            k, v = item.split("=", 1); rep[k] = v

    msgs, ok = [], True
    nb, npre, nc, nu = (int(rep.get(k, 0)) for k in ("BUTTONS", "PRES", "COPIED", "UNIQUE"))
    msgs.append("ボタン%d / pre%d / コピー実行%d / ユニーク%d  [%s]" % (nb, npre, nc, nu, rep.get("NOTE","")))

    if nb != npre:
        ok = False; msgs.append("NG ボタン数(%d)と pre数(%d)が一致しない" % (nb, npre))
    if nc != nb:
        ok = False; msgs.append("NG クリックしたのに %d 個がコピーを実行していない（コピー元が見つからない）" % (nb - nc))
    if nc and nu != nc:
        ok = False; msgs.append("NG 重複コピーあり ― %d回中ユニークは%d種類のみ。別ボタンが同じものをコピーしている" % (nc, nu))

    for i in range(1, min(nc, npre) + 1):
        c, p = rep.get("COPY%d" % i, ""), rep.get("PRE%d" % i, "")
        if c != p:
            ok = False
            msgs.append("NG ボタン%d の対応ズレ\n      コピー: %s\n      期待  : %s" % (i, c[:50], p[:50]))
    if ok:
        msgs.append("OK 全ボタンが自分の直前の pre を正しくコピーしている")
    return ok, msgs

def main():
    targets = sys.argv[1:] or sorted(glob.glob("NotebookLM_*_ポッドキャスト用プロンプト.html"))
    if not targets:
        print("対象ファイルが見つかりません"); return 1
    all_ok = True
    for f in targets:
        ok, msgs = verify(f)
        all_ok &= ok
        print("\n########## %s" % f)
        for m in msgs: print("   " + m)
    print("\n" + ("=== すべて合格 ===" if all_ok else "=== 不合格あり ==="))
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
