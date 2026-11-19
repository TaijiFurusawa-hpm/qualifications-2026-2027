/* ===== 模試（段階2）=====
   UX設計書 3.4（M2 準備・M3 リスニング・M4 切り替え・M5 リーディング・中断と再開）、4章の M1〜M7、6章（目安の幅）、7.2（保存キー）。
   - 解く画面（showUnit・pick・設問トレイ）は app.js と共通。ここは時間割・時間・音声・上下のバー・保存と再開・結果を持つ
   - 時間はすべて Clock.now() で数える（自己テストで差しかえる）。アプリを閉じている間は時間は進まない（3.4(e)）
   - 静かな試験層：正誤・効果音・購入の案内は出さない（MODE.mock.feedback=false、Fx.layer="quiet"）
   - 途中の状態は toeic_mockrun_v1:N に、解答・移動のたびと1秒ごとに保存（Store が300msまとめて書き、裏に回る瞬間に必ず流す） */
"use strict";
const Clock = { now:()=>Date.now() };

/* --- 時間の選び方（M2）。f：解答の間とリーディングの時間の倍率（null＝数えるだけ）／limit：時間が来たら自動で採点 --- */
const MOCK_MODES = {
  real:  {label:"本番どおり",    f:1,    limit:true},
  "x1.5":{label:"1.5倍に延ばす", f:1.5,  limit:false},
  x2:    {label:"2倍に延ばす",   f:2,    limit:false},
  none:  {label:"タイマーなし",  f:null, limit:false}
};
const MOCK_MODE_ORDER = ["real","x1.5","x2","none"];
const L_GAP = {1:5000, 2:5000, 3:8000, 4:8000};   // 解答の間（1問あたり・本番どおり）。未確認：公式の案内で確かめてから確定（8.2-1）
const L_FIRST_MS = 3000;   // 「模試を始める」「続ける」から音声まで
const L_NEXT_MS = 2000;    // タイマーなし：「次へ」から次の音声まで
const R_NOTES = [15,5];    // 残り◯分の知らせ（細い帯。閉じるまで残る）
const MOCK_PLANNED = 10;   // 一覧に並べる回数（データがまだない回は「準備中」）
/* 目安の幅（6.2）。Z＝1.28、F＝回ごとの難しさの差（問）、B＝全体のずれ（問）、UN_REF＝「参考」になる未解答の数 */
const SCORE = {Z:1.28, F:5, B:4, LO:10, HI:990, DAYS:90, KMAX:3, UN_REF:20};
const MOCK_OFFSET = {};    // 回ごとの補正（問ぶん）{n:{L,R}}。較正のデータが集まるまでは0（6.5）

/* ===== 目安のスコア（純粋な関数） ===== */
const round5 = x=>Math.floor(x/5+0.5)*5;
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
/* セクションの片側の幅：4.9 × √((1.28²×100×p(1−p) ＋ F²) ÷ k ＋ B²) を5点きざみに */
function secHalf(p,k){ return round5(4.9*Math.sqrt((SCORE.Z*SCORE.Z*100*p*(1-p)+SCORE.F*SCORE.F)/k+SCORE.B*SCORE.B)); }
/* r：100問あたりの正答数（k回の平均）→ 中心 5＋4.9r（5点きざみ）と幅 */
function secEst(r,k){ r=clamp(r,0,100); const c=round5(5+4.9*r), h=secHalf(r/100,k); return {r,c,h,lo:Math.max(5,c-h),hi:Math.min(495,c+h)}; }
/* 合計：中心は2つの和、幅は2つの単純な和。10〜990で止める */
function estimate(rL,rR,k){ const L=secEst(rL,k), R=secEst(rR,k), c=L.c+R.c, h=L.h+R.h; return {L,R,c,h,k,lo:Math.max(SCORE.LO,c-h),hi:Math.min(SCORE.HI,c+h)}; }
/* 受けた回の正答数を100問あたりに直す（音声が再生できず採点から外した問題を除いた数で割る）＋回ごとの補正 */
function runR(h,sec){ const n=sec==="L"?h.nL:h.nR, c=sec==="L"?h.L:h.R, off=(MOCK_OFFSET[h.n]||{})[sec]||0; return n>0?c/n*100+off:0; }
function histEstimate(h){ return estimate(runR(h,"L"),runR(h,"R"),1); }
/* 「参考」になる3つの条件（6.2）：①本番どおりでない ②その回の2回目以降 ③自分で途中で終えて、どちらかのセクションの未解答が20問以上 */
function refReasons(h){
  const r=[];
  if(h.mode!=="real") r.push(h.mode==="none"?"none":"ext");
  if((h.attempt||1)>1) r.push("again");
  if(!h.auto&&(h.unL>=SCORE.UN_REF||h.unR>=SCORE.UN_REF)) r.push("unanswered");
  return r;
}
const REF_TEXT = {ext:"時間を延ばして受けたため", none:"タイマーなしで受けたため", again:"2回目以降のため", unanswered:"未解答が多いため"};
/* いまの目安：条件を満たす直近の回（90日以内・最大3つ）の正答数の平均。無ければ null */
function currentEstimate(hist,now){
  const t=now==null?Date.now():now;
  const use=hist.filter(h=>h.counts&&t-h.at<=SCORE.DAYS*864e5).sort((a,b)=>b.at-a.at).slice(0,SCORE.KMAX);
  if(!use.length) return null;
  const avg=s=>use.reduce((a,h)=>a+runR(h,s),0)/use.length;
  return Object.assign(estimate(avg("L"),avg("R"),use.length),{runs:use});
}
/* 受けた回の結果（toeic_mockhist_v1 の1件）。units はその回の全 unit */
function histEntry(run,units,o){
  const by={}, picks={}; let L=0,R=0,nL=0,nR=0,unL=0,unR=0;
  for(const u of units) for(const q of u.qs){
    const a=run.ans[q.qid]; if(a) picks[q.qid]=a.pick;
    if(run.skip&&run.skip[q.qid]) continue;
    const ok=!!a&&a.pick===q.a, b=by[u.part]||(by[u.part]=[0,0]); b[1]++; if(ok) b[0]++;
    if(sectionOf(u.part)==="L"){ nL++; if(ok) L++; if(!a) unL++; } else { nR++; if(ok) R++; if(!a) unR++; }
  }
  const h={n:run.n, attempt:run.attempt||1, mode:run.mode, at:o.at, auto:!!o.auto, L,R,nL,nR,unL,unR, byPart:by, rt:Object.assign({},run.rt),
    lUsed:run.lUsed||0, rUsed:run.rUsed||0, pauses:run.pauses||0, skip:Object.keys(run.skip||{}), picks};
  h.reasons=refReasons(h); h.counts=!h.reasons.length;
  return h;
}

/* ===== リスニングの時間割（純粋な関数）=====
   st = {ai：いま音声の時間割が進んでいる unit, ph：pre（音声まで）| play（再生中）| answer（解答の間）| wait（タイマーなし：「次へ」待ち）| done, until：pre・answer の終わる時刻, vi：見ている unit}
   c = {last：リスニングの最後の unit, win(ai)：解答の間 ms（タイマーなしは null）}
   「次へ」は先読み：1つ先の設問を見せるだけで、音声は時間割どおり（タイマーなしは「次へ」から2秒後） */
function lWindow(u,mode){ const f=MOCK_MODES[mode].f; return f==null?null:Math.round(L_GAP[u.part]*u.qs.length*f); }
const TL = {
  start(now){ return {ai:0, ph:"pre", until:now+L_FIRST_MS, vi:0}; },
  /* 音声が終わった（または再生できなかった） */
  ended(st,now,c){
    if(st.ph!=="play") return st;
    const w=c.win(st.ai);
    if(w!=null) return Object.assign({},st,{ph:"answer",until:now+w});
    return st.vi>st.ai?TL.go(st,now,c):Object.assign({},st,{ph:"wait",until:0});   // タイマーなし：先に「次へ」を押していれば2秒後に次へ
  },
  tick(st,now,c){
    if(st.ph==="pre"&&now>=st.until) return Object.assign({},st,{ph:"play",until:0});
    if(st.ph==="answer"&&now>=st.until) return st.ai>=c.last?Object.assign({},st,{ph:"done"}):{ai:st.ai+1, ph:"play", until:0, vi:Math.max(st.vi,st.ai+1)};
    return st;
  },
  /* 「次へ」。押せないときは同じ st を返す（呼ぶ側は === で押せるかを知る） */
  next(st,now,c){
    if(st.vi>st.ai||st.ph==="pre"||st.ph==="done") return st;   // 先読みは1つ先まで。音声の前は待つ
    if(st.ai>=c.last) return (st.ph==="answer"||st.ph==="wait")?Object.assign({},st,{ph:"done"}):st;   // 最後の音声が終わるまでは切り替えへ進めない
    if(st.ph==="wait") return TL.go(st,now,c);
    return Object.assign({},st,{vi:st.ai+1});
  },
  go(st,now,c){ return st.ai>=c.last?Object.assign({},st,{ph:"done"}):{ai:st.ai+1, ph:"pre", until:now+L_NEXT_MS, vi:st.ai+1}; },
  /* 保存した {ai, ph, left, vi} から再開：音声の途中・前なら、その音声を最初から（3秒後）。解答の間は残りの秒から */
  resume(sv,now){
    const ph=sv.ph==="answer"?"answer":sv.ph==="wait"?"wait":"pre";
    return {ai:sv.ai, ph, until:ph==="answer"?now+Math.max(0,sv.left||0):ph==="pre"?now+L_FIRST_MS:0, vi:Math.max(sv.ai,sv.vi==null?sv.ai:sv.vi)};
  }
};
function rLimit(mode){ const f=MOCK_MODES[mode].f; return f==null?null:READ_MIN*60000*f; }
function durLabel(ms){ const s=Math.round(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h?h+"時間":"")+(m||!h?m+"分":"")+(x?x+"秒":""); }
function dateLabel(at){ const d=new Date(at); return `${d.getMonth()+1}月${d.getDate()}日`; }

/* ===== 模試の進行 ===== */
const Mock = (()=>{
  let MT=0, ASK={}, PREP_MODE="real", LOCK_MSG=0, sampleT=0;
  const runKey=n=>K.mockrun+":"+n;
  function loadRun(n){ const r=loadJSON(runKey(n)); return r&&r.n===n&&r.ans?r:null; }
  function runs(){ return availableMocks().map(m=>loadRun(m.n)).filter(Boolean); }   // 鍵のかかった回の途中の状態は出さない（消さずに残す）
  function hist(){ const h=loadJSON(K.mockhist); return Array.isArray(h)?h:[]; }
  function mockUnits(n){ const U=unitsOf(n); return PARTS.flatMap(p=>U[p]||[]); }
  const isL=u=>sectionOf(u.part)==="L";
  /* 回の形：リスニングの最後の unit・リーディングの最初の unit・問題数 */
  function info(units){
    const nq=s=>units.filter(u=>sectionOf(u.part)===s).reduce((a,u)=>a+u.qs.length,0);
    return {lastL:units.reduce((a,u,i)=>isL(u)?i:a,-1), firstR:units.findIndex(u=>!isL(u)), nL:nq("L"), nR:nq("R")};
  }
  const cfg=()=>({last:S.info.lastL, win:ai=>lWindow(S.units[ai],S.run.mode)});
  const curQ=u=>isReader(u)?(u.qs[S.qi]||u.qs[0]):u.qs[0];
  const active=()=>!!(S&&S.run&&!S.done);

  /* --- 経過時間：止まっている間は数えない。used＝保存した分＋いま動いている区間 --- */
  function usedNow(w){ const t0=S[w+"T0"]; return (S.run[w+"Used"]||0)+(t0!=null?Clock.now()-t0:0); }
  function startSeg(w){ if(S[w+"T0"]==null) S[w+"T0"]=Clock.now(); }
  function stopSeg(w){ if(S[w+"T0"]!=null){ S.run[w+"Used"]=usedNow(w); S[w+"T0"]=null; } }

  /* --- 保存（解答・移動のたび、1秒ごと、裏に回る瞬間） --- */
  function save(){
    if(!active()) return;
    const r=S.run, now=Clock.now();
    if(S.view==="unit"||S.view==="grid"){ r.i=S.i; r.qi=S.qi; r.view=S.view; }   // 再開の1枚・切り替えの間は、最後に見ていた場所を保つ
    r.savedAt=Date.now();
    const out=Object.assign({},r,{lUsed:usedNow("l"), rUsed:usedNow("r")});
    if(r.phase==="L") out.L=S.T?{ai:S.T.ai, ph:S.T.ph, vi:S.i, left:S.T.until?Math.max(0,S.T.until-now):0}:r.L;
    saveJSON(runKey(r.n),out); S.lastSave=now;
  }
  const flushNow=()=>{ try{ Store.flush(); }catch(e){} };

  /* --- 始める・開く --- */
  function begin(n,units,run){
    enterQuiz();
    S=newSession("mock",units,{mock:n, label:"模試 "+n, run, ans:run.ans, mark:run.mark, info:info(units), T:null, live:false, lT0:null, rT0:null, lastSave:0, lastTick:0});
    if(!MT) MT=setInterval(tick,250);
  }
  function start(n,mode){
    const units=mockUnits(n); if(!units.length) return;
    stopSample();
    const inf=info(units);
    const run={v:1, n, mode:MOCK_MODES[mode]?mode:"real", attempt:1+hist().filter(h=>h.n===n).length, phase:inf.lastL>=0?"L":"gate",
      i:0, qi:0, view:"unit", L:null, ans:{}, mark:{}, skip:{}, lUsed:0, rUsed:0, rt:{}, pauses:0, notes:{}, hideT:0, startedAt:Date.now(), savedAt:0};
    begin(n,units,run);
    if(run.phase==="L"){ S.T=TL.start(Clock.now()); runL(); } else toGate();
  }
  /* 一覧・今日の「続きから」：途中の状態があれば1枚の案内から、無ければ準備へ */
  function open(n){
    const run=loadRun(n); if(!run){ Router.go("mockprep",{n}); return; }
    const units=mockUnits(n); if(!units.length) return;
    stopSample();
    begin(n,units,run); S.i=Math.min(run.i||0,units.length-1); S.qi=run.qi||0;
    showResume(false);
  }
  function resume(){
    if(!active()) return;
    const r=S.run;
    if(r.phase==="gate"){ renderGate(); return; }
    if(r.phase==="L"){ S.T=TL.resume(r.L||{ai:Math.min(r.i,S.info.lastL),ph:"pre"},Clock.now()); runL(); return; }
    S.i=r.i; S.qi=r.qi||0; startR(r.view);
  }

  /* --- リスニング（M3） --- */
  function runL(){ S.view="unit"; S.live=true; startSeg("l"); S.i=S.T.vi; showUnit(); if(S.T.ph==="play") playL(); paintBand(); save(); }
  function step(nx){
    const old=S.T; if(nx===old) return;
    S.T=nx;
    if(nx.ph==="done"){ toGate(); return; }
    if(nx.vi!==S.i){ S.i=nx.vi; showUnit(); } else paintNav(cur());   // 時間割が次の設問へ進めた／先読み
    if(nx.ph==="play"&&(old.ph!=="play"||old.ai!==nx.ai)) playL();
    if(nx.ph==="answer"&&old.ph!=="answer"&&S.i===nx.ai) Shell.say("解答の時間です");
    paintBand(); save();
  }
  function playL(){
    const ai=S.T.ai, u=S.units[ai]; S.lErr=null;
    const mine=()=>active()&&S.live&&S.T&&S.T.ai===ai;
    Player.load(u.raw.audio,{mode:S.M, autoplay:true, ui:false,
      onEnded:()=>{ if(mine()) step(TL.ended(S.T,Clock.now(),cfg())); },
      onError:()=>{ if(!mine()) return; u.qs.forEach(q=>{ S.run.skip[q.qid]=1; }); S.lErr=ai;   // 黙って無音にしない：書いて、採点から外して、次へ進める
        Shell.say("この問題の音声を再生できません。この問題は採点から外します"); step(TL.ended(S.T,Clock.now(),cfg())); },
      onExternalPause:()=>interrupt()});
  }
  /* 音声の帯：状態（音声まで／再生中／解答の時間）と進み具合。止める・もどす・速さの操作は置かない */
  function bandHTML(){
    return `<div class="player lock mband" id="pl"><button type="button" class="playb pz" data-act="pltoggle" id="plb" hidden>${icon("play","s f")}<span>音声を始める</span></button>`+
      `<span class="pl-st" id="mst"></span><div class="bar pl-bar" aria-hidden="true"><i id="mbar" style="--v:0"></i></div><span class="pl-tm num" id="mtm" aria-hidden="true"></span></div>`;
  }
  function paintBand(){
    const st=document.getElementById("mst"); if(!st||!S||!S.T) return;
    const T=S.T, now=Clock.now(), c=cfg(), here=S.i===T.ai, dur=Player.duration(), ct=Player.currentTime();
    let txt="", v=0, tm="", blocked=false;
    if(S.lErr===T.ai&&here) txt="この問題の音声を再生できません。この問題は採点から外します";
    else if(T.ph==="pre"||(!here&&T.ph!=="wait")){
      const w=c.win(T.ai), ms=T.ph==="play"?Math.max(0,(dur-ct)*1000)+(w==null?L_NEXT_MS:w):T.until-now;
      txt=`音声まで ${Math.max(0,Math.ceil(ms/1000))}秒`;
    } else if(T.ph==="play"){
      blocked=Player.state==="blocked";
      txt=blocked?"音声が止められています。ボタンで始めてください":"再生中"; v=dur?ct/dur:0; tm=dur?fmt(ct*1000)+" / "+fmt(dur*1000):"";
    } else if(T.ph==="answer"){ const w=c.win(T.ai)||1, left=Math.max(0,T.until-now); txt=`解答の時間 あと ${Math.ceil(left/1000)}秒`; v=left/w; }
    else if(T.ph==="wait") txt="解答の時間（制限なし）。「次へ」で次の音声へ";
    if(st.textContent!==txt) st.textContent=txt;
    const bar=document.getElementById("mbar"); if(bar){ const s=v.toFixed(3); if(bar.style.getPropertyValue("--v")!==s) bar.style.setProperty("--v",s); }
    const t=document.getElementById("mtm"); if(t&&t.textContent!==tm) t.textContent=tm;
    const b=document.getElementById("plb"); if(b&&b.hidden===blocked) b.hidden=!blocked;
  }
  /* 「次へ」（先読み）：時間割が許すときだけ */
  function next(){ if(!active()||!S.live||S.run.phase!=="L"||!S.T) return; step(TL.next(S.T,Clock.now(),cfg())); }

  /* --- 切り替え（M4） --- */
  function toGate(){
    Player.stop(); stopSeg("l"); S.T=null; S.live=false;
    S.run.phase="gate"; S.run.L=null; S.i=Math.max(0,S.info.firstR); S.qi=0;
    renderGate(); save();
  }
  function renderGate(){
    S.view="gate"; Tray.off(); closeMenu();
    const lim=rLimit(S.run.mode), time=lim?`制限時間 ${durLabel(lim)}`:"時間の制限なし（かかった時間だけを数えます）";
    Shell.render({layer:"quiet",tabs:false,
      top:sessionTop(`${esc(S.label)} ・ ${SECTIONS.R.name}へ`,S.info.lastL+1,S.units.length,"",S.M.quit,true),
      body:`<section class="card"><h1 class="h h2">${SECTIONS.L.name}はここまで</h1><p>次は${SECTIONS.R.name} ${S.info.nR}問・${time}です。下のボタンを押した時点から時間を数えます。${SECTIONS.R.name}では前の問題にもどれます。</p>`+
        `<p class="note">本番では休みなく続きます。ここまでの解答は保存ずみです。</p></section>`,
      bottom:`<button type="button" class="btn sec pz" data-act="mSuspend">ここで中断する</button><button type="button" class="btn pri pz" data-act="beginReading">${SECTIONS.R.name}を始める</button>`});
  }
  function beginReading(){ if(!active()||S.run.phase!=="gate") return; S.run.phase="R"; S.i=S.info.firstR; S.qi=0; startR("unit"); }

  /* --- リーディング（M5）・解答状況（M6） --- */
  function startR(view){ S.live=true; startSeg("r"); S.lastTick=Clock.now(); if(view==="grid") showGrid(); else showUnit({qi:S.qi}); save(); }
  function clockState(){
    const used=usedNow("r"), lim=rLimit(S.run.mode);
    if(lim==null) return {t:"経過 "+fmt(used), cls:"ol", say:"経過時間"};
    const left=lim-used;
    if(left>=0) return {t:"残り "+fmt(left), cls:left<5*60000?"red":left<15*60000?"warn":"ol", say:"残り時間"};
    return {t:"超過 "+fmt(-left), cls:"warn", say:"延ばした時間を過ぎた分"};
  }
  function clockBtnHTML(){
    const hid=!!S.run.hideT, c=clockState();
    return `<button type="button" class="tbtn pz" data-act="mClock" aria-pressed="${!hid}" aria-label="${c.say}の表示。押すと${hid?"表示する":"隠す"}">`+
      (hid?`<span class="chip ol">${icon("clock","s")}</span>`:`<span class="chip ${c.cls} num" id="mclk">${c.t}</span>`)+`</button>`;
  }
  const NOTE_TEXT={15:"残り15分です", 5:"残り5分です", over:"延ばした時間を過ぎました。このまま続けられます"};
  function noticeHTML(){
    const k=S.run.notes.open; if(!k||!NOTE_TEXT[k]) return "";
    return `<div class="mnote"><span>${NOTE_TEXT[k]}</span><button type="button" class="iconbtn pz" data-act="mNoteClose" aria-label="知らせを閉じる">${icon("x","s")}</button></div>`;
  }
  function rAnswered(){ let n=0; for(const u of S.units) if(!isL(u)) for(const q of u.qs) if(S.ans[q.qid]) n++; return n; }
  function rTop(label){
    const right=`<button type="button" class="iconbtn pz" data-act="mGrid" aria-label="解答状況の一覧">${icon("list")}</button>`;
    return sessionTop(label,rAnswered(),S.info.nR,clockBtnHTML(),S.M.quit,true,right)+noticeHTML();
  }
  const qNum=u=>`${curQ(u).num}<span class="tot"> / ${S.info.nL+S.info.nR}</span>`;
  const qLabel=u=>`Part ${u.part} <span class="num mut w5" id="mqn">${qNum(u)}</span>`;
  /* 上のバー（showUnit から呼ぶ） */
  function topHTML(u){
    if(isL(u)){
      const ns=u.qs.map(q=>q.num), rng=ns.length>1?ns[0]+"–"+ns[ns.length-1]:ns[0];
      return sessionTop(`Part ${u.part} <span class="num mut w5">${rng} / ${S.info.nL}</span>`,S.i,S.info.lastL+1,"",S.M.quit,true)+bandHTML();
    }
    return rTop(qLabel(u));
  }
  function paintTop(){
    if(!active()||S.run.phase!=="R") return;
    Shell.el.top.innerHTML=S.view==="grid"?rTop("解答状況"):topHTML(cur());
  }
  function paintClock(){
    const el=document.getElementById("mclk"); if(!el) return;
    const c=clockState(), cls="chip num "+c.cls;
    if(el.textContent!==c.t) el.textContent=c.t;
    if(el.className!==cls) el.className=cls;
  }
  /* 時間の知らせ・時間切れ。採点へ進んだら true */
  function checkTime(){
    const lim=rLimit(S.run.mode); if(lim==null) return false;
    const left=lim-usedNow("r"), n=S.run.notes;
    let changed=false;
    for(const m of R_NOTES) if(left<=m*60000&&left>0&&!n["n"+m]){ n["n"+m]=1; n.open=String(m); Shell.say(NOTE_TEXT[m]); changed=true; }
    if(left<=60000&&left>0&&!n.n1){ n.n1=1; Shell.say("残り1分です"); }
    if(left<=0){
      if(MOCK_MODES[S.run.mode].limit){ grade(true); return true; }   // 本番どおり：自動で採点（解答はすべて保存ずみ）
      if(!n.over){ n.over=1; n.open="over"; Shell.say(NOTE_TEXT.over); changed=true; }
    }
    if(changed) paintTop();
    return false;
  }
  function onMove(){ const u=cur(), el=document.getElementById("mqn"); if(el&&!isL(u)) el.innerHTML=qNum(u); save(); }
  function toggleMark(){
    if(!active()||S.run.phase!=="R"||S.view!=="unit") return;
    const u=cur(), q=curQ(u), on=!S.mark[q.qid];
    if(on) S.mark[q.qid]=1; else delete S.mark[q.qid];
    paintNav(u); if(isReader(u)){ paintTray(); Tray.refresh(); }
    Shell.say(on?"あとで見直す印をつけました":"印を外しました"); save();
  }
  /* リーディングの全設問（番号の一覧と移動に使う） */
  function rItems(){ const out=[]; S.units.forEach((u,ui)=>{ if(!isL(u)) u.qs.forEach((q,qi)=>out.push({q,ui,qi})); }); return out; }
  function showGrid(filter){
    if(!active()||S.run.phase!=="R") return;
    if(filter) S.gridF=filter; const f=S.gridF||"all";
    S.view="grid"; Tray.off(); closeMenu();
    const items=rItems(), curQid=curQ(cur()).qid;
    const cnt={open:items.filter(x=>!S.ans[x.q.qid]).length, mark:items.filter(x=>S.mark[x.q.qid]).length};
    const shown=items.filter(x=>f==="open"?!S.ans[x.q.qid]:f==="mark"?!!S.mark[x.q.qid]:true);
    const gq=x=>{ const a=!!S.ans[x.q.qid], mk=!!S.mark[x.q.qid], c=x.q.qid===curQid;
      return `<button type="button" class="gq pz${a?" done":""}${mk?" marked":""}${c?" cur":""}" data-act="mGo" data-u="${x.ui}" data-qi="${x.qi}" aria-label="${x.q.num}、${a?"解答ずみ":"未解答"}${mk?"、あとで見直す":""}${c?"、いまの問題":""}"><span class="num">${x.q.num}</span></button>`; };
    const body=`<div class="seg" role="group" aria-label="しぼり込み">${optBtns("mGridF","f",[["all","すべて"],["open",`未解答だけ（${cnt.open}）`],["mark",`印だけ（${cnt.mark}）`]],f)}</div>`+
      (shown.length?`<div class="mgrid">${shown.map(gq).join("")}</div>`:`<p class="sm mut">${f==="open"?"未解答の問題はありません。":"印をつけた問題はありません。"}</p>`)+
      `<p class="note glegend"><span class="gq sw" aria-hidden="true"></span>未解答　<span class="gq sw done" aria-hidden="true"></span>解答ずみ　<span class="gq sw done marked" aria-hidden="true"></span>あとで見直す</p>`;
    Shell.render({layer:"quiet",tabs:false,top:rTop("解答状況"),body,
      bottom:`<button type="button" class="btn sec pz" data-act="mBackQ">問題にもどる</button><button type="button" class="btn pri pz" data-act="mFinish">解答を終える</button>`});
    save();
  }
  function goQ(ui,qi){ if(!active()||S.run.phase!=="R") return; S.i=ui; showUnit({qi}); }

  /* --- 下のバー（showUnit・paintNav から） --- */
  function navHTML(u){
    if(isL(u)){
      const can=!!(S.T&&S.live&&TL.next(S.T,Clock.now(),cfg())!==S.T), last=S.T&&S.T.ai>=S.info.lastL;
      return `<button type="button" class="btn sec pz" data-act="next"${can?"":' aria-disabled="true"'}>${last?SECTIONS.R.name+"へ":"次へ"}</button>`;
    }
    const q=curQ(u), canPrev=(isReader(u)&&S.qi>0)||canBackUnit(u), mk=!!S.mark[q.qid];
    return `<button type="button" class="btn sec pz nav-s" data-act="prev" aria-label="前の問題"${canPrev?"":' aria-disabled="true"'}>${icon("back","s")}<span aria-hidden="true">前へ</span></button>`+
      `<button type="button" class="btn sec pz mmark" data-act="mMark" aria-pressed="${mk}" aria-label="あとで見直す">${icon(mk?"flagOn":"flag","s")}<span aria-hidden="true"><span class="lg">あとで</span>見直す</span></button>`+
      `<button type="button" class="btn pri pz" data-act="next">${nextLabel(u)}</button>`;
  }
  /* Part 3・4：上に「32・33・34」の札（解答ずみか分かる。押すとその問いへ） */
  function lqHTML(u){
    return `<div class="lq" role="group" aria-label="設問の番号">`+u.qs.map(q=>{ const a=!!S.ans[q.qid];
      return `<button type="button" class="qchip pz${a?" done":""}" data-act="mJump" data-q="${esc(q.qid)}" aria-label="設問 ${q.num}、${a?"解答ずみ":"未解答"}"><span class="num">${q.num}</span></button>`; }).join("")+`</div>`;
  }
  function bodyHTML(u){ return isL(u)&&u.qs.length>1?lqHTML(u):""; }
  function afterRender(u){ if(isL(u)) paintBand(); else paintClock(); save(); }
  function onAnswer(u){
    if(isL(u)&&u.qs.length>1){ const el=document.querySelector("#page .lq"); if(el) el.outerHTML=lqHTML(u); }
    if(!isL(u)){ const b=document.querySelector("#top .topbar .bar>i"); if(b) b.style.setProperty("--v",(rAnswered()/S.info.nR).toFixed(4)); }
    save();
  }

  /* --- 毎秒（250ms ごと）の処理 --- */
  function tick(){
    if(!active()||!S.live) return;
    const now=Clock.now(), r=S.run;
    if(r.phase==="L"&&S.T){ step(TL.tick(S.T,now,cfg())); if(S&&S.T) paintBand(); }
    else if(r.phase==="R"){
      const u=cur(); if(u&&S.lastTick) r.rt[u.part]=(r.rt[u.part]||0)+clamp(now-S.lastTick,0,2000);   // Part ごとの使用時間（結果に出す）
      if(checkTime()) return;
      paintClock();
    }
    if(!active()) return;
    S.lastTick=now;
    if(now-S.lastSave>=1000) save();
  }

  /* --- 中断・再開（3.4(e)） --- */
  function pauseLive(){
    if(!S||!S.live) return;
    const now=Clock.now(), r=S.run;
    if(r.phase==="L"&&S.T){ r.L={ai:S.T.ai, ph:S.T.ph, vi:S.i, left:S.T.until?Math.max(0,S.T.until-now):0}; S.T=null; }
    Player.stop(); stopSeg("l"); stopSeg("r"); S.live=false;
  }
  /* 自分で「中断」：保存して「今日」へ。時間は止まる */
  function suspend(){
    if(!active()) return;
    closeDlg("askdlg"); pauseLive(); S.run.pauses++; save(); flushNow();
    S.leaving=true; Router.tab("today");
  }
  /* 裏に回った・外から音声を止められた（イヤホンが抜けた等）：音声と時間を止め、「中断していました」の1枚 */
  function interrupt(){
    if(!active()||!S.live) return;
    pauseLive(); S.run.pauses++; save(); flushNow();
    showResume(true);
  }
  function showResume(interrupted){
    S.view="resume"; Tray.off(); closeMenu(); ["qsetdlg","keysdlg","askdlg"].forEach(closeDlg);
    const r=S.run;
    const how=r.phase==="L"?(r.L&&r.L.ph==="answer"?"解答の時間の続きから始まります。":r.L&&r.L.ph==="wait"?"解答の時間の続きから始まります。":"この設問の音声は、最初から流れます（「続ける」の3秒後）。")
      :r.phase==="R"?"同じ問題、同じ残り時間から続けます。「続ける」を押すまで時間は止まっています。":"リーディングを始める前の画面にもどります。";
    Shell.render({layer:"quiet",tabs:false,
      top:`<div class="topbar gl"><div class="t"><b>${esc(S.label)}（${esc(MOCK_MODES[r.mode].label)}）</b></div></div>`,
      body:`<section class="card"><h1 class="h h2">${interrupted?"中断していました":esc(S.label)+"の続き"}</h1><p>${esc(summary(r).text)}</p><p class="sm mut">${how}</p>`+
        (r.pauses?`<p class="note">中断 ${r.pauses}回（結果に小さく出します。目安のスコアにはそのまま使います）</p>`:"")+`</section>`+
        `<button type="button" class="btn ghost pz" data-act="mRestart">この回をやめて、最初からやり直す</button>`,
      bottom:`<button type="button" class="btn sec pz" data-act="mLeave">あとで</button><button type="button" class="btn pri pz" data-act="mResume">続ける</button>`});
  }
  /* 途中の状態の一言（一覧・今日・再開の1枚） */
  function summary(run){
    const units=mockUnits(run.n); if(!units.length) return {text:""};
    if(run.phase==="gate") return {text:`${SECTIONS.R.name}の前で中断`};
    if(run.phase==="L"){ const u=units[run.L?run.L.ai:run.i]||units[0]; return {text:`Part ${u.part}・${u.qs[0].num}問目で中断（${SECTIONS.L.name}）`}; }
    const u=units[run.i]||units[0], q=u.qs[run.qi]||u.qs[0], lim=rLimit(run.mode), left=lim==null?null:lim-(run.rUsed||0);
    return {text:`Part ${u.part}・${q.num}問目で中断`+(left==null?`・経過 ${Math.floor((run.rUsed||0)/60000)}分`:left>0?`・残り${Math.ceil(left/60000)}分`:"・延ばした時間を過ぎています")};
  }
  /* 「もどる」（画面のボタン・ブラウザ・Android）：模試の最中は確認してから中断 */
  function guard(){
    if(!active()||S.leaving) return true;
    if(S.view==="resume"){ S.leaving=true; return true; }
    askQuit(); return false;
  }
  function askQuit(){
    if(!active()) return;
    if(S.view==="resume"){ S.leaving=true; Router.tab("today"); return; }
    ask({title:S.M.quitAsk, body:S.run.phase==="L"?"再開すると、この設問の音声が最初から流れます。":"", ok:"中断する", cancel:"続ける", onOk:suspend});
  }

  /* --- 採点 --- */
  function finish(auto){
    if(!active()) return;
    if(!auto){
      const un=rItems().filter(x=>!S.ans[x.q.qid]).length;
      if(un){ ask({title:`未解答が ${un}問あります。採点しますか`, ok:"採点する", alt:"未解答を見る", cancel:"もどる", onOk:()=>grade(false), onAlt:()=>showGrid("open")}); return; }
    }
    grade(auto);
  }
  function grade(auto){
    if(!active()) return;
    closeDlg("askdlg"); pauseLive();
    const r=S.run, H=hist(), h=histEntry(r,S.units,{auto,at:Date.now()});
    const items=[]; for(const u of S.units) for(const q of u.qs) if(!r.skip[q.qid]) items.push({unit:u,q,ans:r.ans[q.qid]});
    recordResults(items); markSeen(S.units);   // 成績・解き直し・旧キー・解いた回数を、それぞれ1回の読み書きで
    H.push(h); saveJSON(K.mockhist,H); removeJSON(runKey(r.n));
    S.done=true; flushNow();
    Router.tab("mock"); Router.go("mockresult",{n:h.n,at:h.at});
    Fx.haptic("grade");   // 結果へ移る瞬間（練習の層になってから）
  }
  function end(){ if(MT){ clearInterval(MT); MT=0; } ASK={}; closeDlg("askdlg"); }

  /* --- 確認の1枚（中断・採点・やり直し）。勝手には開かない。Esc・「もどる」で閉じる --- */
  function ask(o){
    ASK={ok:o.onOk, alt:o.onAlt};
    openSheet("askdlg",`<h2 class="h h2" id="askdlg-h">${esc(o.title)}</h2>${o.body?`<p class="sm">${esc(o.body)}</p>`:""}`+
      `<button type="button" class="btn pri pz" data-act="askBtn" data-k="ok">${esc(o.ok)}</button>`+
      (o.alt?`<button type="button" class="btn sec pz" data-act="askBtn" data-k="alt">${esc(o.alt)}</button>`:"")+
      `<button type="button" class="btn sec pz" data-act="askBtn" data-k="cancel">${esc(o.cancel||"もどる")}</button>`);
  }

  /* --- キー（sessionKey と根元の keydown から）。処理したら true --- */
  function key(ev,inter){
    if(!active()) return false;
    const k=ev.key, L=k.length===1?k.toLowerCase():k;
    if(S.view==="grid"){ if(k==="Escape"||L==="g"){ ev.preventDefault(); showUnit({qi:S.qi}); return true; } return false; }
    if(S.view!=="unit") return false;
    if(isL(cur())){
      if(k===" "){ if(inter) return false; ev.preventDefault(); if(Player.state==="blocked") Player.toggle(); return true; }   // 自動再生が止められたときに始めるだけ
      if(k==="ArrowLeft"||L==="s"){ ev.preventDefault(); return true; }   // もどす・スクリプトは使えない
      return false;   // A〜D・Enter・→ は共通の処理（advance → Mock.next）
    }
    if(L==="f"){ ev.preventDefault(); toggleMark(); return true; }
    if(L==="g"){ ev.preventDefault(); showGrid(); return true; }
    return false;
  }

  /* --- 音を確かめる（M2：5秒の見本。単語の例文の音声を使う＝模試の問題を先に聞かせない） --- */
  function stopSample(){ if(sampleT){ clearTimeout(sampleT); sampleT=0; Player.stop(); } }
  function sample(){
    const e=VOCAB.find(x=>x.au), st=document.getElementById("audst"); if(!e) return;
    stopSample(); Player.load(vAud(e,true),{mode:MODE.mock,autoplay:true});
    sampleT=setTimeout(()=>{ sampleT=0; Player.stop(); const s=document.getElementById("audst"); if(s) s.textContent="聞こえましたか。聞こえなければ、本体の音量を上げてください"; },5000);
    if(st) st.textContent="再生中（5秒）";
  }

  /* ===== 画面：模試の一覧（M1）・準備（M2）・結果（M7）・今日の札 ===== */
  function rowFor(n,H){
    const m=MOCKS.find(x=>x.n===n);
    if(!m) return rowbHTML({act:"none",no:n,title:`模試 ${n}`,sub:"準備中",disabled:true});
    if(!mockOpen(m)) return rowbHTML({act:"mLocked",data:{n},no:icon("lock","s"),title:`模試 ${n}`,sub:`未購入 ・ ${mockQCount(n)}問・約2時間・Part 1〜7`});
    const run=loadRun(n), last=H.filter(x=>x.n===n).pop();
    if(run) return rowbHTML({act:"mOpen",data:{n},no:n,title:`模試 ${n}　<span class="chip ol">途中</span>`,sub:`${esc(summary(run).text)} ・ 続きから`});
    if(last){ const e=histEstimate(last); return rowbHTML({act:"mPrep",data:{n},no:n,title:`模試 ${n}`,sub:`目安 ${e.lo}〜${e.hi}${last.counts?"":"（参考）"} ・ ${dateLabel(last.at)}に受験`}); }
    return rowbHTML({act:"mPrep",data:{n},no:n,title:`模試 ${n}${m.free?'　<span class="chip acc">無料</span>':""}`,sub:`未受験 ・ ${mockQCount(n)}問・約2時間`});
  }
  function estLine(est){
    return est?`<section class="card"><div class="eyebrow">いまの目安</div><p class="estl"><b class="num">${est.lo}〜${est.hi}点</b><span class="sm mut">直近${est.k}回（本番どおりで受けた回）から</span></p><p class="note">目安です。本番の点数を保証するものではありません。</p></section>`
      :`<p class="sm mut">模試を「本番どおり」で1回受けると、目安のスコアが表示されます。</p>`;
  }
  SCREENS.mock=(o)=>{
    const re=!!(o&&o.rerender), top=tabTop("模試");
    if(!re) LOCK_MSG=0;   // 「準備中」の一言は、押したその場だけ
    if(!MOCKS.length){ Shell.render({tab:"mock",top,body:noData()}); return; }
    const H=hist(), locked=MOCKS.filter(m=>!mockOpen(m)), maxN=Math.max(MOCK_PLANNED,...MOCKS.map(m=>m.n));
    let h=estLine(currentEstimate(H));
    if(locked.length) h+=`<p class="sm mut lockl">${icon("lock","s")}<span>模試 ${locked.map(m=>m.n).join("・")} は鍵つきです（開く手続きは準備中です）</span></p>`;
    if(DEV_UNLOCK) h+=`<p class="note">開発用：?unlock ですべての回を開いています（記録には残りません。公開先では効きません）</p>`;
    h+=`<div class="list">`;
    for(let n=1;n<=maxN;n++) h+=rowFor(n,H);
    h+=`</div>`;
    if(LOCK_MSG) h+=`<p class="sm" role="status" id="lockmsg">模試 ${LOCK_MSG} は鍵つきです。開く手続きは、いま準備中です。</p>`;
    h+=`<section class="card"><h2 class="h h2">模試の進み方</h2><p class="sm">${SECTIONS.L.name}（Part 1〜4）は音声が1回だけ流れ、止められません。${SECTIONS.R.name}は「${SECTIONS.R.name}を始める」を押した時点から時間を数え、前の問題にもどれます。途中の正誤や解説は出ません。途中でやめても、続きから再開できます。</p></section>`;
    Shell.render({tab:"mock",top,body:h,keepScroll:re,noAnim:re,focus:!re});
  };
  SCREENS.mockprep=(o)=>{
    const n=o.n, m=MOCKS.find(x=>x.n===n), re=!!o.rerender;
    if(!m||!mockOpen(m)){ Shell.render({tab:"mock",top:subTop(`模試 ${n}`),body:`<section class="card"><p>この回はまだ開いていません。</p></section>`}); return; }
    const inf=info(mockUnits(n)), H=hist().filter(h=>h.n===n), run=loadRun(n), mode=PREP_MODE, lim=rLimit(mode), f=MOCK_MODES[mode].f;
    const desc=mode==="real"?`${SECTIONS.R.name}${READ_MIN}分で自動的に採点します。${SECTIONS.L.name}の解答の時間は、Part 1・2 が1問5秒、Part 3・4 が1問8秒です。`
      :mode==="none"?`時間を数えるだけで、制限はありません（数字は隠せます）。${SECTIONS.L.name}は「次へ」を押すと2秒後に次の音声が流れます。`
      :`解答の時間と${SECTIONS.R.name}（${durLabel(lim)}）を${f}倍にします。時間が来ても終わらず、知らせるだけです。`;
    let h=`<section class="card"><h1 class="h h1">模試 ${n}</h1><p>${inf.nL+inf.nR}問　約2時間（${SECTIONS.L.name} 約40分＋${SECTIONS.R.name} ${READ_MIN}分）</p></section>`;
    if(run) h+=`<section class="card"><p><b>途中の回があります。</b>${esc(summary(run).text)}</p><p class="sm mut">続きから再開できます。</p></section>`;
    h+=`<h2 class="sec-h">時間の選び方</h2><section class="card plain stack"><div class="seg" role="group" aria-label="時間の選び方">${optBtns("mMode","mode",MOCK_MODE_ORDER.map(k=>[k,MOCK_MODES[k].label]),mode)}</div>`+
      `<p class="sm" id="mmdesc">${desc}</p><p class="note">目安のスコアの計算に使うのは「本番どおり」の回だけです。</p></section>`;
    h+=`<h2 class="sec-h">音の確認</h2><section class="card plain stack"><div class="row"><button type="button" class="btn sm sec pz" data-act="mSample">${icon("speaker","s")}音を確かめる（5秒）</button><span class="sm mut" id="audst" role="status"></span></div>`+
      `<p class="note">イヤホンをおすすめします。音量は本体のボタンで調整してください。消音にしていても音声は流れます。</p></section>`;
    h+=`<h2 class="sec-h">約束ごと</h2><ul class="rules sm"><li>${SECTIONS.L.name}の音声は1回だけ流れ、止められません。</li><li>「次へ」で次の設問を先に読めます。音声は時間割どおりに始まります。</li>`+
      `<li>${SECTIONS.R.name}では前の問題にもどれます。「あとで見直す」の印をつけられます。</li><li>途中でやめても、続きから再開できます。</li><li>通知を止めておくと集中できます（おやすみモードなど）。</li></ul>`;
    if(H.length){
      h+=`<h2 class="sec-h">これまでの結果</h2><div class="list">`+H.slice().reverse().map(x=>{ const e=histEstimate(x);
        return rowbHTML({act:"mResult",data:{n,at:x.at},no:x.attempt,title:`目安 ${e.lo}〜${e.hi}点${x.counts?"":'　<span class="chip warn">参考</span>'}`,sub:`${dateLabel(x.at)} ・ ${esc(MOCK_MODES[x.mode].label)} ・ ${x.L+x.R}/${x.nL+x.nR}問正解`}); }).join("")+`</div>`+
        `<p class="note">2回目からは問題を覚えているので、目安のスコアには使いません（「参考」として結果を出します）。</p>`;
    }
    const bottom=run?`<button type="button" class="btn pri pz" data-act="mOpen" data-n="${n}">続きから</button>`
      :`<button type="button" class="btn pri pz" data-act="mStart" data-n="${n}">模試を始める</button>`;
    Shell.render({tab:"mock",layer:"quiet",top:subTop(`模試 ${n} の準備`),body:h,bottom,keepScroll:re,noAnim:re,focus:!re});
  };
  /* 結果（M7）：目安 → 正答数 → Part別 → タグ → 解き直し → 次の模試（3.5） */
  SCREENS.mockresult=(o)=>{
    const H=hist(), h=H.find(x=>x.n===o.n&&x.at===o.at);
    if(!h){ Shell.render({tab:"mock",top:subTop("模試の結果",true),body:`<section class="card"><p>結果が見つかりません。</p></section>`}); return; }
    const units=mockUnits(h.n), est=histEstimate(h), ref=h.reasons.length>0, tot=h.L+h.R, nTot=h.nL+h.nR, un=h.unL+h.unR, skip=new Set(h.skip||[]);
    const prev=H.filter(x=>x.at<h.at), best=prev.length>0&&prev.every(x=>x.L+x.R<tot);
    const wrongs=[]; for(const u of units) for(const q of u.qs){ if(skip.has(q.qid)) continue; const p=h.picks[q.qid]; if(p!==q.a) wrongs.push({u,q,a:p==null?null:{pick:p}}); }
    let s=`<section class="card score est"><div class="row" style="justify-content:center"><span class="chip ol">模試 ${h.n} の結果</span>${ref?'<span class="chip warn">参考</span>':""}${best?'<span class="chip acc">自己ベスト</span>':""}</div>`+
      `<div class="big" role="img" aria-label="目安のスコア、${est.lo}点から${est.hi}点。本番の点数を保証するものではありません"><span class="eye" aria-hidden="true">目安</span><span class="num" id="estLo" aria-hidden="true">${est.lo}</span><em aria-hidden="true">〜</em><span class="num" id="estHi" aria-hidden="true">${est.hi}</span><em aria-hidden="true">点</em></div>`+
      `<p class="rng sm">${SECTIONS.L.name} <b class="num">${est.L.lo}〜${est.L.hi}</b>　${SECTIONS.R.name} <b class="num">${est.R.lo}〜${est.R.hi}</b></p>`+
      `<p class="note">目安です。本番の点数を保証するものではありません。</p>`+
      (ref?`<p class="sm">この回は${h.reasons.map(k=>REF_TEXT[k]).join("、")}、「いまの目安」には使っていません。</p>`:"")+
      `<details class="trans how"><summary class="pz">どう出したか</summary><div class="ja"><p>この点数は、この模試の正答数から出した目安です。</p><ul>`+
      `<li>リスニングとリーディングそれぞれの正答数を、5〜495点の目盛りに置きかえています。置きかえ方はこのアプリ独自のもので、公式の換算ではありません。</li>`+
      `<li>このアプリの模試は自作です。本番の結果と照らし合わせた調整は、まだ行っていません。</li>`+
      `<li>そのため、点を1つに決めず、幅で示しています。幅には、問題数による偶然のぶれ、回ごとの難しさの差、調整前であることによるずれを見込んでいます。</li>`+
      `<li>「本番どおり」で受けた回が増えると、幅は少し狭くなります（最大3回分を使います）。</li></ul><p>実際のTOEIC® L&amp;R のスコアを予測・保証するものではありません。</p></div></details></section>`;
    s+=`<p class="sm">おつかれさまでした。${un?"":`${durLabel(h.lUsed+h.rUsed)}、最後まで解きました。`}</p>`;
    s+=`<h2 class="sec-h">正答数</h2><section class="card">${statsHTML([[`${tot}<small>/${nTot}</small>`,"合計"],[`${h.L}<small>/${h.nL}</small>`,SECTIONS.L.name],[`${h.R}<small>/${h.nR}</small>`,SECTIONS.R.name]])}`+
      `<table class="st"><tr><td>未解答</td><td class="num">${un}問</td></tr><tr><td>かかった時間</td><td class="num">${durLabel(h.lUsed+h.rUsed)}</td></tr><tr><td>時間の選び方</td><td>${esc(MOCK_MODES[h.mode].label)}</td></tr>`+
      `<tr><td>中断</td><td class="num">${h.pauses}回</td></tr>${skip.size?`<tr><td>音声を再生できず採点から外した問題</td><td class="num">${skip.size}問</td></tr>`:""}</table></section>`;
    s+=`<h2 class="sec-h">Part別</h2><section class="card stack">`+PARTS.map(p=>{ const b=h.byPart[p]||[0,0]; return partRowHTML(`Part ${p}`,b[0],b[1],` ・ ${pct(b[0],b[1])}%`); }).join("")+`</section>`;
    const rows=SECTIONS.R.parts.map(p=>{ const tg=PART_SPEC[p].target, us=units.filter(u=>u.part===p), t=tg?us.reduce((a,u)=>a+tg(u),0)*1000:0;
      return `<tr><td>Part ${p}</td><td class="num">${fmt(h.rt[p]||0)}</td><td class="num">${t?fmt(t):"—"}</td></tr>`; }).join("");
    s+=`<section class="card"><table class="st"><tr><th>${SECTIONS.R.name}の使った時間</th><th>使った時間</th><th>目安</th></tr>${rows}</table></section>`;
    // 苦手なタグ：累計で8問以上解いたタグだけを順位に入れる（1回の模試ではタグあたりの問題数が少ないため）
    const st=loadJSON(K.stat), keys=[...new Set(units.flatMap(u=>u.qs.map(q=>"P"+u.part+"|"+(q.tag||"-"))))];
    const enough=keys.filter(k=>st[k]&&st[k].n>=8).sort((a,b)=>st[a].ok/st[a].n-st[b].ok/st[b].n).slice(0,3), few=keys.filter(k=>!(st[k]&&st[k].n>=8)).length;
    s+=`<h2 class="sec-h">苦手なタグ（これまでの累計）</h2><section class="card">`+(enough.length?enough.map(k=>{ const [pp,t]=k.split("|"), r=st[k];
      return `<div class="trow"><div class="m"><b>${pp.replace("P","Part ")} ${esc(t)}</b><span class="xs mut">正答率 ${pct(r.ok,r.n)}%（累計 ${r.n}問）</span></div><button type="button" class="btn sm sec pz" data-act="mTag" data-p="${pp.slice(1)}" data-t="${esc(t)}">このタグを練習する</button></div>`; }).join(""):"")+
      (few?`<p class="note">${few}個のタグは、まだデータ不足です（累計8問から順位に入れます）。</p>`:"")+`</section>`;
    if(wrongs.length){
      s+=`<button type="button" class="btn pri pz" data-act="reviewThese" data-q="${esc(wrongs.map(w=>w.q.qid).join(" "))}">間違えた${wrongs.length}問を解き直す</button>`+
        `<details class="trans wl"><summary class="pz">解説の一覧を見る（${wrongs.length}問）</summary><div class="card">${wrongListHTML(wrongs)}</div></details>`;
    } else s+=`<section class="card"><p>間違いはありません。</p></section>`;
    const nx=MOCKS.find(m=>m.n===h.n+1);
    if(nx&&mockOpen(nx)) s+=`<button type="button" class="btn sec pz" data-act="mPrep" data-n="${nx.n}">模試 ${nx.n} の準備へ</button>`;
    else if(nx) s+=`<p class="sm mut lockl">${icon("lock","s")}<span>次の模試 ${nx.n} は鍵つきです（開く手続きは準備中です）</span></p>`;
    s+=`<button type="button" class="btn sec pz" data-act="close">閉じる</button>`;
    Shell.render({tab:"mock",top:subTop(`模試 ${h.n} の結果`,true),body:s});
    // 数字の数え上がり → 墨のしずく（練習の層。押せば即座に終わる）
    Fx.countUp($("#estHi"),est.hi,0); celebrate("#estLo",est.lo);
    fillBars();
  };
  function resumeHeroHTML(){
    const r=runs().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0]; if(!r) return "";
    return `<section class="card hero"><div class="eyebrow">模試の続き</div><h1 class="h">模試 ${r.n} の続きから</h1><p class="sm mut">${esc(summary(r).text)}</p><button type="button" class="btn pri pz" data-act="mOpen" data-n="${r.n}">続きから</button></section>`;
  }
  function todayRowHTML(){
    const H=hist(), est=currentEstimate(H);
    if(est) return rowbHTML({act:"nav",data:{to:"stats"},no:icon("chart","s"),title:`いまの目安 ${est.lo}〜${est.hi}点`,sub:`直近${est.k}回の模試から ・ 目安です ・ 記録へ`});
    const m1=availableMocks()[0]; if(!m1) return "";
    if(H.some(x=>x.n===m1.n)) return rowbHTML({act:"tab",data:{tab:"mock"},no:icon("mock","s"),title:"模試の一覧",sub:"「本番どおり」で受けると、目安のスコアが出ます"});
    return rowbHTML({act:"mPrep",data:{n:m1.n},no:m1.n,title:`まず実力を知る：模試 ${m1.n}　<span class="chip acc">無料</span>`,sub:`${mockQCount(m1.n)}問・約2時間 ・ 本番と同じ順番`});
  }

  /* --- 操作 --- */
  Object.assign(ACT,{
    mPrep:d=>Router.go("mockprep",{n:+d.n}),
    mOpen:d=>open(+d.n),
    mLocked:d=>{ LOCK_MSG=+d.n; SCREENS.mock({rerender:true}); refocus("#lockmsg"); },
    mMode:d=>{ PREP_MODE=d.v; const t=Router.top(); SCREENS.mockprep(Object.assign({},t&&t.arg,{rerender:true})); refocus(`[data-act="mMode"][aria-pressed="true"]`); },
    mSample:()=>sample(),
    mStart:d=>{ const n=+d.n, go=()=>start(n,PREP_MODE);
      if(hist().some(h=>h.n===n)) ask({title:"もう一度受けますか",body:"2回目からは問題を覚えているので、目安のスコアには使いません（「参考」として結果を出します）。",ok:"始める",cancel:"やめる",onOk:go}); else go(); },
    mResult:d=>Router.go("mockresult",{n:+d.n,at:+d.at}),
    beginReading:()=>beginReading(),
    mSuspend:()=>suspend(),
    mResume:()=>resume(),
    mLeave:()=>{ if(!S) return; S.leaving=true; Router.tab("today"); },
    mRestart:()=>ask({title:"この回を最初からやり直しますか",body:"ここまでの解答は消えます（受けた回の記録には残りません）。",ok:"やり直す",cancel:"やめない",
      onOk:()=>{ const n=S.run.n; removeJSON(runKey(n)); S.leaving=true; Router.tab("mock"); Router.go("mockprep",{n}); }}),
    mClock:()=>{ if(!active()) return; S.run.hideT=S.run.hideT?0:1; paintTop(); refocus('[data-act="mClock"]'); save(); },
    mNoteClose:()=>{ if(!active()) return; S.run.notes.open=""; paintTop(); save(); },
    mGrid:()=>showGrid(),
    mGridF:d=>{ showGrid(d.v); refocus(`[data-act="mGridF"][aria-pressed="true"]`); },
    mGo:d=>goQ(+d.u,+d.qi),
    mBackQ:()=>{ if(active()) showUnit({qi:S.qi}); },
    mMark:()=>toggleMark(),
    mFinish:()=>finish(false),
    mJump:d=>{ const c=document.querySelector(`[data-qcard="${CSS.escape(d.q)}"]`); if(!c) return; c.scrollIntoView({block:"start",behavior:Fx.reduced()?"auto":"smooth"}); const b=c.querySelector(".choice"); if(b) try{ b.focus({preventScroll:true}); }catch(e){} },
    mTag:d=>startPractice(+d.p,"std",d.t),
    askBtn:d=>{ const f=ASK[d.k]; ASK={}; closeDlg("askdlg"); if(f) f(); }
  });
  /* 裏に回る瞬間：音声と時間を止めて保存（電話・ほかのアプリ・画面ロック・タブを閉じる・再読みこみ） */
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") interrupt(); });
  window.addEventListener("pagehide",()=>{ if(active()){ if(S.live) interrupt(); else { save(); flushNow(); } } });

  return { start, open, resume, next, finish, grade, guard, askQuit, suspend, interrupt, key, save, tick, end,
    topHTML, bodyHTML, navHTML, afterRender, onAnswer, onMove, showGrid, beginReading, toggleMark,
    resumeHeroHTML, todayRowHTML, summary, loadRun, runKey, hist, info,
    /* 自己テスト用 */ endAudio:()=>{ if(active()&&S.T) step(TL.ended(S.T,Clock.now(),cfg())); }, get prepMode(){ return PREP_MODE; }, set prepMode(v){ PREP_MODE=v; } };
})();
