/* ===== Native（アプリの中だけで働く部分）=====
   UX設計書 7.3「Capacitor まわり」。Web では何もしない（画面を消さないだけは Web の Wake Lock を使う）。
   - ready()：最初の画面を描いたら起動画面を消す（白い一瞬を出さない。起動画面と Webビューの下地は紙の色）
   - bars(dark)：上下のバーの文字色を外観に合わせる（applyPrefs から呼ぶ。Capacitor 8 の SystemBars）
   - keepAwake(on)：模試の最中（音声と時間が動いている間）は画面を自動で消さない（js/mock.js の live）
   - もどるボタン（Android）：開いているシート・メニューを閉じる → Router の履歴で1つもどる（popstate と同じ処理：
     セッション中は guard の確認）→ 先頭ならアプリを閉じる
   - 裏に回る（App の pause）：書き残しを保存先へ流し、模試の最中なら中断の扱い（3.4(e)）
   部品は scripts/build-web.mjs が www/index.html に足す（Web 版の index.html には入らない） */
"use strict";
const Native = (()=>{
  const native=isNativeApp();
  const plugin=name=>native&&window.Capacitor.Plugins&&window.Capacitor.Plugins[name]||null;
  const quiet=p=>{ if(p&&p.catch) p.catch(()=>{}); };

  let shown=false;
  function ready(){
    if(shown) return; shown=true;
    const S=plugin("SplashScreen"); if(!S) return;
    // 描いた結果が画面に出てから消す（2フレーム待つ）
    requestAnimationFrame(()=>requestAnimationFrame(()=>quiet(S.hide({fadeOutDuration:150}))));
  }

  let barDark=null;
  function bars(dark){
    const B=plugin("SystemBars"); if(!B||barDark===dark) return; barDark=dark;
    quiet(B.setStyle({style:dark?"DARK":"LIGHT"}));   // DARK＝暗い下地に明るい文字
  }

  let awake=false, lock=null;
  function keepAwake(on){
    on=!!on; if(on===awake) return; awake=on;
    const K=plugin("KeepAwake");
    if(K){ quiet(on?K.keepAwake():K.allowSleep()); return; }
    // Web：Screen Wake Lock（対応していない・拒まれたときは何もしない）
    if(on){ if(navigator.wakeLock) navigator.wakeLock.request("screen").then(l=>{ if(awake) lock=l; else quiet(l.release()); },()=>{}); }
    else if(lock){ quiet(lock.release()); lock=null; }
  }

  /* もどるボタン（Android）。返り値：何かしたら true */
  function back(){
    const d=document.querySelector("dialog[open]");
    if(d){ try{ d.close(); }catch(e){ d.removeAttribute("open"); } return true; }
    const m=document.getElementById("menu");
    if(m&&!m.hidden&&typeof closeMenu==="function"){ closeMenu(); return true; }
    if(Router.stack.length>1){ history.back(); return true; }   // popstate（js/shell.js）が Router.back と同じ処理をする
    return false;
  }

  function onPause(){
    try{ if(typeof Mock!=="undefined") Mock.interrupt(); }catch(e){}
    try{ Store.flush(); }catch(e){}
  }

  const A=plugin("App");
  if(A){
    quiet(A.addListener("backButton",()=>{ if(!back()) quiet(A.exitApp()); }));
    quiet(A.addListener("pause",onPause));
  }

  return { native, ready, bars, keepAwake, back, get awake(){ return awake; } };
})();
