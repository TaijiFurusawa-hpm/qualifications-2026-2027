/* ===== Player（音声の再生バー）=====
   UX設計書 7.1-5 ／ P2 ②音声の帯 ／ 3.3「練習セッションの1問の流れ」
   - 状態：idle（なし）| ready（押せば流れる）| loading | playing | paused | ended | error | blocked（自動再生を止められた）
   - lock：模試。止める・もどす・速さを変える操作を出さない（自動再生が止められたときだけ「音声を始める」を出す）
   - 外からの一時停止（イヤホン抜け・着信・ほかのアプリ）は onExternalPause で知らせる（段階2で模試の中断につなぐ）
   - <audio> を使いつづける。帯（bandHTML）が画面にあれば状態を描き、無ければ #audst の文字だけを書く
   - 行からの再生：データに時刻が無いので、build.py が音声を組み立てる順（話す文と無音の秒数）から割り振って推定する */
"use strict";
const Player = (()=>{
  const SPEEDS=[0.8,1,1.2];
  const ST_TEXT={ready:"再生ボタンで流れます", loading:"読み込み中", playing:"再生中", paused:"一時停止", ended:"再生終了", blocked:"再生ボタンを押すと流れます"};
  let a=null, o={}, state="idle", mine=false, ui={}, last={};

  const fmtT=s=>fmt(Math.floor(s||0)*1000);   // app.js の fmt（m:ss）
  const curSpeed=()=>prefs().speed;
  const spName=v=>`速さ ${(+v).toFixed(1)}倍、変更`, spAttrs=v=>`aria-label="${spName(v)}"`;
  const spLabel=v=>(+v).toFixed(1)+"×";
  const playInner=on=>icon(on?"pause":"play","s f")+`<span>${on?"一時停止":"再生"}</span>`;

  /* 帯の HTML。o.lock＝模試 */
  function bandHTML(opt){
    if(opt&&opt.lock) return `<div class="player lock" id="pl" data-state="idle">`+
      `<button type="button" class="playb pz" data-act="pltoggle" id="plb" hidden>${icon("play","s f")}<span>音声を始める</span></button>`+
      `<span class="pl-st" id="audst" role="status"></span>`+
      `<div class="bar pl-bar" aria-hidden="true"><i id="plbar" style="--v:0"></i></div><span class="pl-tm num" id="pltm"></span></div>`;
    const sp=curSpeed();
    return `<div class="player" id="pl" data-state="idle">`+
      `<button type="button" class="playb pz" data-act="pltoggle" id="plb" aria-label="再生">${playInner(false)}</button>`+
      `<button type="button" class="mini pz" data-act="plback" aria-label="5秒もどる">${icon("back5","s")}5秒</button>`+
      `<button type="button" class="mini pz" data-act="plspeed" id="plsp" ${spAttrs(sp)}>${spLabel(sp)}</button>`+
      `<input type="range" class="pl-seek" id="plseek" min="0" max="1000" step="1" value="0" aria-label="再生位置">`+
      `<span class="pl-tm num" id="pltm" aria-hidden="true">0:00</span>`+
      `<span class="pl-st" id="audst" role="status"></span></div>`;
  }
  /* 画面を描いたあとに呼ぶ（帯の要素をつかむ） */
  function bind(){
    const g=id=>document.getElementById(id);
    ui={root:g("pl"), btn:g("plb"), tm:g("pltm"), seek:g("plseek"), st:g("audst"), sp:g("plsp"), bar:g("plbar")}; last={};
    if(ui.seek) ui.seek.addEventListener("input",()=>{ if(a&&a.duration&&!o.lock){ a.currentTime=ui.seek.value/1000*a.duration; paintTime(); } });
    paint();
  }
  function paint(){
    if(ui.root&&!ui.root.isConnected) ui={};
    if(ui.root) ui.root.dataset.state=state;
    let t=ST_TEXT[state]||"";
    if(state==="error") t=o.lock?"この問題の音声を再生できません":"音声を再生できません。スクリプトで確認できます";
    if(state==="idle") t="";
    if(ui.st) ui.st.textContent=t; else { const e=document.getElementById("audst"); if(e) e.textContent=t; }
    if(ui.btn){
      const playing=state==="playing"||state==="loading";
      if(o.lock){ ui.btn.hidden=state!=="blocked"; }
      else { if(last.playing!==playing){ last.playing=playing; ui.btn.innerHTML=playInner(playing); ui.btn.setAttribute("aria-label",playing?"一時停止":"再生"); } ui.btn.disabled=state==="error"||state==="idle"; }
    }
    paintTime();
  }
  function paintTime(){
    if(!ui.tm) return;
    const d=a&&isFinite(a.duration)?a.duration:0, c=a?a.currentTime:0, f=d?Math.min(1,c/d):0;
    const k=Math.floor(c)+"/"+Math.floor(d)+"/"+Math.round(f*1000); if(last.t===k) return; last.t=k;   // timeupdate（約4回/秒）では、変わったときだけ書く
    ui.tm.textContent=d?fmtT(c)+" / "+fmtT(d):fmtT(c);
    if(ui.seek){ ui.seek.value=Math.round(f*1000); ui.seek.style.setProperty("--p",(f*100).toFixed(2)+"%"); ui.seek.setAttribute("aria-valuetext",d?`${fmtT(c)}、全体 ${fmtT(d)}`:"0:00"); }
    if(ui.bar) ui.bar.style.setProperty("--v",f.toFixed(4));
  }
  function set(s){ state=s; paint(); }

  /* 音声を読み込む。opt = {autoplay, lock, onExternalPause} */
  function load(src,opt){
    stop(); o=Object.assign({},opt||{});
    if(!src){ set("error"); return; }
    const me=new Audio(src); a=me; me.preload="auto"; me.preservesPitch=true;
    me.playbackRate=o.lock?1:curSpeed();
    const on=(ev,f)=>me.addEventListener(ev,()=>{ if(a===me) f(); });   // 古い音声の知らせで表示を上書きしない
    on("loadedmetadata",paintTime); on("timeupdate",paintTime); on("durationchange",paintTime);
    on("playing",()=>set("playing")); on("ended",()=>set("ended")); on("error",()=>set("error"));
    on("pause",()=>{ if(me.ended) return; const ext=!mine&&state==="playing"; mine=false; set("paused"); if(ext&&o.onExternalPause) o.onExternalPause(); });
    set("ready");
    if(o.autoplay) play();
  }
  function play(){
    if(!a||state==="error") return;
    if(a.ended) a.currentTime=0;
    set("loading");
    const me=a, p=a.play();
    if(p&&p.catch) p.catch(()=>{ if(a===me&&state!=="error") set("blocked"); });
  }
  function pause(){ if(!a||a.paused) return; mine=true; a.pause(); }
  /* 再生⇄一時停止。模試では、まだ流れていない（止められた）ときに始めるだけ */
  function toggle(){
    if(!a) return;
    if(o.lock){ if(state==="blocked"||state==="ready") play(); return; }
    if(a.paused||a.ended) play(); else pause();
  }
  function back(sec){ if(!a||o.lock) return; a.currentTime=Math.max(0,a.currentTime-(sec||5)); paintTime(); }
  function seekTo(sec,andPlay){
    if(!a||o.lock) return; const me=a;
    const go=()=>{ if(a!==me) return; a.currentTime=Math.max(0,Math.min(sec,isFinite(a.duration)?a.duration-0.05:sec)); paintTime(); if(andPlay&&(a.paused||a.ended)) play(); };
    if(a.readyState>=1) go(); else a.addEventListener("loadedmetadata",go,{once:true});
  }
  /* 速さ：0.8 → 1.0 → 1.2 → 0.8。既定（設定）も書きかえる（現行の setSpeed と同じ） */
  function cycleSpeed(){
    if(o.lock) return;
    const cur=curSpeed();
    const nx=SPEEDS[(SPEEDS.findIndex(v=>Math.abs(v-cur)<.01)+1)%SPEEDS.length];
    setPref("speed",nx);
    if(a) a.playbackRate=nx;
    if(ui.sp){ ui.sp.textContent=spLabel(nx); ui.sp.setAttribute("aria-label",spName(nx)); }
    return nx;
  }
  function stop(){ if(a){ mine=true; const x=a; a=null; try{ x.pause(); x.removeAttribute("src"); x.load(); }catch(e){} } state="idle"; o={}; }   // 読み込み途中の通信とバッファを手放す
  function busy(){ return !!(a&&!a.paused&&!a.ended); }

  /* 行の始まりの推定。segs = [{say:"文", line:k?}|{sil:秒}]、dur = 音声の長さ（秒）。
     話す文の長さ（字数）に比例して、無音を除いた時間を割り振る。返り値 {line: 秒} */
  function estimateStarts(segs,dur){
    let chars=0, sil=0; for(const g of segs){ if(g.say!=null) chars+=g.say.length; else sil+=g.sil||0; }
    const per=chars?Math.max(0,(dur||0)-sil)/chars:0, out={}; let t=0;
    for(const g of segs){
      if(g.say!=null){ if(g.line!=null&&out[g.line]==null) out[g.line]=+t.toFixed(3); t+=g.say.length*per; }
      else t+=g.sil||0;
    }
    return out;
  }
  function duration(){ return a&&isFinite(a.duration)?a.duration:0; }

  return { bandHTML, bind, load, toggle, back, seekTo, cycleSpeed, stop, busy, estimateStarts, duration, get state(){ return state; } };
})();
