/* ============================================================
   コピーボタン共通スニペット v2（2026-08-25）
   ------------------------------------------------------------
   ★これが原本。NotebookLM_*_ポッドキャスト用プロンプト.html へ
     script タグで埋め込む際は、必ずここからコピーする。
     ※このファイル内に script の終了タグを literal で書かないこと
       （HTMLに埋め込むとパーサがそこで script を終端し、リスナーが登録されない）
     実装を各HTMLで書き起こさない（v1のバグ再発原因がそれだった）。

   v1のバグ（2026-08-25 発覚）
     var text = btn.parentElement.querySelector('pre').innerText;
     → pre と button を包む親が無い構成では btn.parentElement が
       ページ全体のコンテナになり、【常にページ最初の pre】を返した。
       結果、全ボタンがプロンプト①をコピーしていた。
       しかも「静かに間違ったものをコピーする」ため気づけなかった。

   v2の方針
     ① 構造非依存 … .prompt ラッパーがあってもなくても正しく拾う
     ② fail loud  … 見つからなければ黙って別のものをコピーせず、失敗を表示する
   ============================================================ */
(function(){
  function findPre(btn){
    // ① 同じラッパー（.prompt）の中を探す
    var wrap = btn.closest ? btn.closest('.prompt') : null;
    if (wrap) { var p = wrap.querySelector('pre'); if (p) return p; }
    // ② ボタンの直前を遡って探す（包む親が無い構成でも拾う）
    var el = btn.previousElementSibling;
    while (el) { if (el.tagName === 'PRE') return el; el = el.previousElementSibling; }
    // ③ 見つからなければ null を返す。★ページ先頭の pre を返さない
    return null;
  }
  function flash(btn, msg, ok){
    if (btn.dataset.orig === undefined) btn.dataset.orig = btn.textContent;
    btn.textContent = msg;
    btn.classList.remove('done','fail');
    btn.classList.add(ok ? 'done' : 'fail');
    setTimeout(function(){
      btn.textContent = btn.dataset.orig;
      btn.classList.remove('done','fail');
    }, 1800);
  }
  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch(e){ ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  document.querySelectorAll('.copy').forEach(function(btn){
    btn.addEventListener('click', function(){
      var pre = findPre(btn);
      if (!pre) { flash(btn, 'コピー元が見つかりません', false); return; }
      var text = pre.innerText;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function(){ flash(btn, 'コピーしました', true); },
          function(){ var ok = fallbackCopy(text); flash(btn, ok ? 'コピーしました' : 'コピーに失敗しました', ok); }
        );
      } else {
        var ok = fallbackCopy(text);
        flash(btn, ok ? 'コピーしました' : 'コピーに失敗しました', ok);
      }
    });
  });
})();
