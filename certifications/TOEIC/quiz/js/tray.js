/* ===== 設問トレイ（Part 6・7 の読むレイアウト）=====
   UX設計書 5.4「採用する型Bの仕様」。中身（文書・設問）は app.js が描き、ここは段階と上げ下げだけを受け持つ。
   - 段階：小 s（番号の札＋いまの設問文の1行目）／中 m（読む領域の46%）／大 l（読む領域いっぱい）
   - 文字が「特大」以上か、読む領域が480px未満なら 小／大 の2段階（型C：切り替えと同じ使い方）
   - 設定 prefs.tray = "switch" でいつも2段階（試作で使いにくければ型Cに落とせるように：リスク5）
   - 文書の下の余白は、いつも「いまのトレイの高さ＋16px」（CSS の --tray-h）。トレイの背景は不透明
   - 指で動かしている間は transform で追従させ、離したら近い段へ落ち着いてから高さを確定する（5.3）
   - 幅840px以上は左右2画面（トレイは使わない） */
"use strict";
const TRAY_SMALL_MAX = 480;   // これ未満の読む領域は2段階
const TRAY_MID = 0.46;        // 中の高さ（読む領域に対する割合）
const TRAY_MID_MIN_REM = 12;  // 中のときに設問を読む場所（つまみの行を除く）がこれ未満なら2段階
const Tray = (()=>{
  const mqWide=window.matchMedia?window.matchMedia("(min-width:840px)"):{matches:false,addEventListener(){}};
  let R=null, T=null, H={s:0,m:0,l:0}, stage="m", count=3, quiet=false, onChange=null, ro=null, anim=null, drag=null, eatClick=false;

  function stagesOf(n){ return n===3?["s","m","l"]:["s","l"]; }
  /* いまの段階の数で使えない段（2段階の中）を近い段へ寄せる */
  function fit(s){ return stagesOf(count).includes(s)?s:(s==="m"?"l":"s"); }
  /* 段階の数を決める（純粋な関数：自己テストで確かめる） */
  function countFor(readerH,text,mode){ if(mode==="switch") return 2; return (+text>=3||readerH<TRAY_SMALL_MAX)?2:3; }
  function measure(){
    const rh=R.clientHeight, p=prefs();
    count=countFor(rh,p.text,p.tray);
    T.classList.add("measuring");
    const hh=T.querySelector(".tray-h").offsetHeight, ph=T.querySelector(".tray-peek").offsetHeight;
    T.classList.remove("measuring");
    H={s:Math.min(rh,hh+ph+1), m:Math.round(rh*TRAY_MID), l:rh};
    // 中で設問と選択肢を読む場所が足りない（12rem 未満）なら2段階：大きな文字や低い画面で、選択肢が中に収まらないため
    const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
    if(count===3&&H.m-hh<TRAY_MID_MIN_REM*rem) count=2;
    stage=fit(stage);
  }
  function apply(){
    if(!R) return;
    R.style.setProperty("--tray-h",H[stage]+"px");
    T.dataset.stage=stage; T.dataset.count=count;
    T.classList.toggle("is-s",stage==="s");
    const b=T.querySelector(".tray-t"), open=stage!=="s";
    if(b&&b.getAttribute("aria-expanded")!==String(open)){ b.setAttribute("aria-expanded",open); b.setAttribute("aria-label",open?"設問をたたむ":"設問を広げる"); b.innerHTML=icon(open?"down":"up"); }
    const body=T.querySelector(".tray-b"); if(body) body.toggleAttribute("inert",stage==="s");
  }
  function finishAnim(){ if(!anim) return; clearTimeout(anim.t); anim.done(); anim=null; }
  /* from の見た目から to へ動かす（高さを大にして transform でずらす）。終わったら高さを確定 */
  function animate(fromH,to){
    finishAnim();
    const done=()=>{ T.style.transition="none"; T.style.height=""; T.style.transform=""; apply(); };
    if(Fx.reduced()){ done(); return; }
    T.classList.remove("is-s");
    T.style.transition="none"; T.style.height=H.l+"px"; T.style.transform=`translateY(${H.l-fromH}px)`;
    T.getBoundingClientRect();
    T.style.transition=`transform 300ms ${quiet?"cubic-bezier(.2,0,0,1)":"cubic-bezier(.3,1.12,.5,1)"}`;   // 練習はわずかに行き過ぎてもどる
    T.style.transform=`translateY(${H.l-H[to]}px)`;
    R.style.setProperty("--tray-h",H[to]+"px");
    anim={done, t:setTimeout(()=>{ anim=null; done(); },320)};
  }
  function set(to,why){
    if(!R||isWide()) return;
    to=fit(to);
    const from=stage; if(from===to&&!anim) return;
    stage=to; animate(H[from],to);
    if(from!==to&&onChange) onChange(to,from,why);
  }
  /* つまみ・キー T：小⇄中（2段階なら小⇄大）。大からは小へ */
  function toggle(){ const L=stagesOf(count); set(stage==="s"?L[1]:"s","toggle"); }
  /* 設問を見せる（番号の札を押したとき）：小なら中へ（2段階なら大へ） */
  function expand(){ if(stage==="s") set(stagesOf(count)[1],"expand"); }

  /* --- 指で上げ下げ（つまみの行どこからでも）。6px動くまではタップとして扱う --- */
  function onDown(e){
    if(isWide()||e.button>0) return;
    drag={y0:e.clientY, h0:H[stage], h:H[stage], t:performance.now(), v:0, id:e.pointerId, moved:false};
  }
  function onMove(e){
    if(!drag||e.pointerId!==drag.id) return;
    const dy=e.clientY-drag.y0;
    if(!drag.moved){ if(Math.abs(dy)<6) return; drag.moved=true; finishAnim(); try{ e.currentTarget.setPointerCapture(drag.id); }catch(x){}
      T.classList.remove("is-s"); T.classList.add("dragging"); T.style.transition="none"; T.style.height=H.l+"px"; }
    const h=Math.max(H.s,Math.min(H.l,drag.h0-dy)), now=performance.now(), dt=Math.max(1,now-drag.t);
    drag.v=(h-drag.h)/dt; drag.h=h; drag.t=now;
    T.style.transform=`translateY(${H.l-h}px)`;
  }
  function onUp(e){
    if(!drag||e.pointerId!==drag.id) return;
    const d=drag; drag=null; T.classList.remove("dragging");
    if(!d.moved) return;
    eatClick=true; setTimeout(()=>{ eatClick=false; },0);
    const L=stagesOf(count);
    let to=L.reduce((b,s)=>Math.abs(H[s]-d.h)<Math.abs(H[b]-d.h)?s:b,L[0]);
    if(Math.abs(d.v)>0.5){ const dir=d.v>0?1:-1, cand=L.filter(s=>dir>0?H[s]>d.h:H[s]<d.h); if(cand.length) to=dir>0?cand[0]:cand[cand.length-1]; }   // 速く払ったらその向きの次の段（0.5px/ms：3.8）
    const from=stage; stage=to; animate(d.h,to);
    if(from!==to&&onChange) onChange(to,from,"drag");
  }
  function isWide(){ return !!mqWide.matches; }

  /* 読む領域にトレイをつける。opt = {stage, mode, onChange}。mode は MODE の1つ（模試＝静かな層：行き過ぎない動き） */
  function mount(reader,opt){
    off(); opt=opt||{};
    R=reader; T=reader.querySelector(".tray"); quiet=!!(opt.mode&&opt.mode.layer==="quiet"); onChange=opt.onChange||null;
    if(isWide()){ R.classList.add("wide"); R.style.removeProperty("--tray-h"); return; }
    measure();
    stage=opt.stage?fit(opt.stage):(count===3?"m":"s");   // 既定：3段階は中、2段階は小（文書から読む）
    apply();
    const h=T.querySelector(".tray-h");
    h.addEventListener("pointerdown",onDown); h.addEventListener("pointermove",onMove);
    h.addEventListener("pointerup",onUp); h.addEventListener("pointercancel",onUp);
    T.addEventListener("click",e=>{ if(eatClick){ e.stopPropagation(); e.preventDefault(); eatClick=false; } },true);
    if(window.ResizeObserver){ let last=R.clientHeight; ro=new ResizeObserver(()=>{ if(!R||anim||drag) return; const now=R.clientHeight; if(Math.abs(now-last)<1) return; last=now; refresh(); }); ro.observe(R); }
  }
  /* 中身（番号の札の折り返しなど）や文字の大きさが変わったら測り直す */
  function refresh(){ if(!R||isWide()||!R.isConnected) return; finishAnim(); measure(); apply(); }
  function off(){ finishAnim(); if(ro){ ro.disconnect(); ro=null; } R=null; T=null; drag=null; }

  function onWideChange(fn){ if(mqWide.addEventListener) mqWide.addEventListener("change",fn); }
  return { mount, refresh, set, toggle, expand, off, countFor, stagesOf, isWide, onWideChange,
    get stage(){ return stage; }, get count(){ return count; }, get heights(){ return Object.assign({},H); } };
})();
