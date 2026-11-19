/* ===== Lapis 模試（仮称） for the TOEIC® L&R Test — 本体 =====
   段階0（土台）：現行の機能（単語特訓・Part別練習・模試1・苦手復習・成績・おかしい一覧）を新しい枠の上で動かす。
   画面の仕様は ux/UX設計書.html、見た目は ux/ビジュアル案.html（紙と墨の答案）。 */
"use strict";
const APP_VERSION = "0.2.0";
const READ_MIN = 75;
const PART_NAME = {1:"写真描写",2:"応答問題",3:"会話問題",4:"説明文問題",5:"短文穴埋め",6:"長文穴埋め",7:"読解問題"};
const PARTS = [1,2,3,4,5,6,7];
const PART_SIZE = {1:6,2:10,3:4,4:4,5:10,6:2,7:3};
const LET = ["A","B","C","D"];
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
const $ = s=>document.querySelector(s);
const today = ()=>dayNumber();

/* ===== 設定（prefs）と計画（profile） ===== */
let PREFS_MEMO=null, PREFS_RAW=null;   // 操作のたびに何度も読むので、保存の中身が変わるまで覚えておく
function prefs(){ const raw=Store.raw(K.prefs); if(!PREFS_MEMO||raw!==PREFS_RAW){ PREFS_RAW=raw; PREFS_MEMO=Object.assign({},PREFS_DEFAULT,loadJSON(K.prefs)); } return Object.assign({},PREFS_MEMO); }
function setPref(k,v){ const p=prefs(); p[k]=v; saveJSON(K.prefs,p); applyPrefs(); }
function profile(){ return Object.assign({},PROFILE_DEFAULT,loadJSON(K.profile)); }
function setProfile(k,v){ const p=profile(); p[k]=v; saveJSON(K.profile,p); }
function applyPrefs(){
  const p=prefs(), r=document.documentElement;
  if(p.theme==="light"||p.theme==="dark") r.dataset.theme=p.theme; else delete r.dataset.theme;
  r.dataset.text=String(p.text);
  Fx.syncMotion();
  const m=document.querySelector('meta[name="theme-color"]');
  if(m){ const dark=p.theme==="dark"||(p.theme!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches); m.content=dark?"#181816":"#F6F2EA"; }
}

/* ===== 問題データ：MOCKS = DATA.mocks、unitsOf(n) が回ごとに unit を作って覚える =====
   unit＝1画面（Part2/5は1問、他はセット） */
let MOCKS=[]; const UNIT_CACHE={};
function buildUnits(mock){
  const U={};
  for(const p of PARTS){
    U[p]=(mock["part"+p]||[]).map(it=>{
      let qs; const one=q=>[{qid:it.id,num:it.num,tag:it.tag,q,c:it.c,a:it.a,e:it.e}];
      if(p===1) qs=one(""); else if(p===2) qs=one(it.prompt); else if(p===5) qs=one(it.q);
      else qs=(it.qs||[]).map((q,i)=>({qid:it.id+"."+(i+1),num:q.num,tag:q.tag,q:q.q||"",c:q.c,a:q.a,e:q.e}));
      return {id:it.id,part:p,mock:mock.n,raw:it,qs};
    });
  }
  return U;
}
function unitsOf(n){ if(!UNIT_CACHE[n]){ const m=MOCKS.find(x=>x.n===n); UNIT_CACHE[n]=m?buildUnits(m):{}; } return UNIT_CACHE[n]; }
function availableMocks(){ return MOCKS.filter(m=>m.free); }   // TODO(段階5)：|| 解放ずみ（解放したら invalidateUnits() を呼ぶ）
/* 練習で使える unit の一覧は、データか使える回が変わるまで同じなので覚えておく */
let PU_MEMO={}, UNIT_BY_ID=null;
function invalidateUnits(){ PU_MEMO={}; UNIT_BY_ID=null; for(const k in UNIT_CACHE) delete UNIT_CACHE[k]; }
function practiceUnits(p){ return PU_MEMO[p]||(PU_MEMO[p]=availableMocks().flatMap(m=>unitsOf(m.n)[p]||[])); }
function allUnitsFlat(){ return PARTS.flatMap(p=>practiceUnits(p)); }
function unitById(id){ if(!UNIT_BY_ID) UNIT_BY_ID=new Map(allUnitsFlat().map(u=>[u.id,u])); return UNIT_BY_ID.get(id); }
function qCount(p){ const k="q"+p; return PU_MEMO[k]!=null?PU_MEMO[k]:(PU_MEMO[k]=practiceUnits(p).reduce((s,u)=>s+u.qs.length,0)); }
const CUR_MOCK = 1;   // 段階2で模試の一覧から選ぶ

/* ===== 記録 ===== */
const REVIEW_GAP=[0,1,3,7];   // 解き直しの段階 → 次に出るまでの日数（UX設計書 3.5、仮の値）
function reviewUpdate(qid,ok){
  const rv=loadJSON(K.review), t=today(), r=rv[qid];
  if(!ok){ rv[qid]={st:0,due:r?t+1:t,n:(r?r.n:0)+1}; }
  else if(r){ if(r.st>=3) delete rv[qid]; else { r.st++; r.due=t+REVIEW_GAP[r.st]; } }
  else return;
  saveJSON(K.review,rv);
  // 旧キーも同じ意味で更新しておく（元の版にもどしても使えるように）
  const m=loadJSON(K.miss);
  if(ok){ if(m[qid]){ m[qid]--; if(m[qid]<=0) delete m[qid]; } } else m[qid]=(m[qid]||0)+1;
  saveJSON(K.miss,m);
}
/* 集計の {n, ok} を1つ数える（無ければ作る）。返り値に他の項目（ms・nw）を足してよい */
function tally(map,key,good){ const r=map[key]||(map[key]={n:0,ok:0}); r.n++; if(good) r.ok++; return r; }
function recordResult(unit,q,ans){
  const ok=!!ans&&ans.pick===q.a;
  const st=loadJSON(K.stat), r=tally(st,"P"+unit.part+"|"+(q.tag||"-"),ok);
  r.ms=(r.ms||0)+((ans&&ans.ms)||0); saveJSON(K.stat,st);
  reviewUpdate(q.qid,ok);
}
function markSeen(unit){ const s=loadJSON(K.seen); s[unit.id]=(s[unit.id]||0)+1; saveJSON(K.seen,s); }
function reviewDue(){ const rv=loadJSON(K.review), t=today(); return Object.keys(rv).filter(q=>rv[q].due<=t); }
function flags(){ return loadJSON(K.flag); }
function toggleFlag(id){ const f=flags(), on=!f[id]; if(on) f[id]=Date.now(); else delete f[id]; saveJSON(K.flag,f);
  document.querySelectorAll(`[data-flagbtn][data-id="${CSS.escape(id)}"]`).forEach(b=>{ b.setAttribute("aria-pressed",on); b.innerHTML=flagInner(on); }); }
function flagInner(on){ return icon(on?"flagOn":"flag","s")+(on?"報告済み（取り消す）":"この問題はおかしい"); }
function flagBtn(id){ const on=!!flags()[id];
  return `<button type="button" class="btn sm sec pz" data-act="flag" data-id="${esc(id)}" data-flagbtn aria-pressed="${on}">${flagInner(on)}</button>`; }

/* ===== 音声 ===== */
let AUD=null;
function audioBusy(){ return !!(AUD&&!AUD.paused&&!AUD.ended); }
function stopAudio(){ if(AUD){ try{ AUD.pause(); }catch(e){} AUD=null; } }
function playAudio(src){
  stopAudio(); if(!src){ setAudSt("音声なし"); return; }
  const a=new Audio(src); AUD=a; a.preservesPitch=true; a.playbackRate=prefs().speed;
  const mine=f=>()=>{ if(AUD===a) f(); };   // 古い音声の知らせで表示を上書きしない
  a.onerror=mine(()=>setAudSt("音声ファイルを読み込めません"));
  a.onplaying=mine(()=>setAudSt("再生中")); a.onended=mine(()=>setAudSt("再生終了"));
  a.play().catch(mine(()=>setAudSt("再生ボタンを押すと流れます")));
}
function setAudSt(t){ const e=$("#audst"); if(e) e.textContent=t; }
function setSpeed(v){ setPref("speed",v); if(AUD) AUD.playbackRate=v; document.querySelectorAll("[data-spd]").forEach(b=>{ const on=parseFloat(b.dataset.v)===v; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); }); }
function audioUI(src){
  const sp=prefs().speed;
  return `<div class="audio"><button type="button" class="playb pz" data-act="play" data-src="${esc(src||"")}">${icon("replay","s")}もう一度聞く</button>`+
    [0.8,1.0,1.2].map(v=>`<button type="button" class="mini pz ${v===sp?"on":""}" data-act="speed" data-spd data-v="${v}" aria-pressed="${v===sp}" aria-label="速さ ${v.toFixed(1)}倍">${v.toFixed(1)}×</button>`).join("")+
    `<span class="st" id="audst" role="status"></span></div>`;
}

/* ===== 共通の部品 ===== */
function dataAttrs(d){ return Object.entries(d||{}).map(([k,v])=>` data-${k}="${esc(v)}"`).join(""); }
function choiceHTML(o){
  const mk=o.state==="is-ok"?MARK_OK:o.state==="is-ng"?MARK_NG:"";
  const da=dataAttrs(o.data);
  return `<button type="button" class="choice pz ${o.state||""}" data-act="${o.act}"${da}${o.hap?` data-hap="${o.hap}"`:""}${o.disabled?" disabled":""}`+
    `${o.state==="sel"?' aria-pressed="true"':""}${o.label?` aria-label="${esc(o.label)}"`:""}>`+
    `<i class="wash"></i><span class="badge"><i></i><b>${o.letter}</b></span>${o.inner||""}<svg class="mk" viewBox="0 0 24 24" aria-hidden="true">${mk}</svg></button>`;
}
function verdict(kind,title,sub){   // kind: ok | ng | neutral
  return `<div class="bnr ${kind==="ok"?"":kind}" role="status"><span class="bic"><svg viewBox="0 0 24 24" aria-hidden="true">${kind==="ok"?MARK_OK:kind==="ng"?MARK_NG:'<path d="M12 7v6M12 16.5v.5"/>'}</svg></span><div class="bt"><b>${title}</b>${sub?`<span class="sm">${sub}</span>`:""}</div></div>`;
}
/* 下の階層の上のバー。close=true で「×閉じる」（結果の画面）、ほかは「＜もどる」 */
function subTop(title,close){
  return `<div class="topbar"><button type="button" class="iconbtn pz" data-act="${close?"close":"back"}" aria-label="${close?"閉じる":"もどる"}">${icon(close?"x":"back")}</button><div class="t"><b>${esc(title)}</b></div></div>`;
}
function tabTop(title,right){ return `<div class="topbar gl"><div class="t"><b class="h" style="font-size:1.0625rem">${esc(title)}</b></div>${right||""}</div>`; }
function barHTML(v,attrs){ return `<div class="bar"${attrs?" "+attrs:""}><i style="--v:${v}"></i></div>`; }
function sessionTop(label,i,n,extra,quitLabel){
  return `<div class="topbar"><button type="button" class="iconbtn lab pz" data-act="quit">${icon("x","s")}<span>${quitLabel||"やめる"}</span></button>`+
    `<div class="t"><b>${label}</b>${barHTML(n?i/n:0,`role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}"`)}</div>`+
    `<div class="meta">${extra||""}</div></div>`;
}
/* 一覧の行ボタン。o = {act, data:{…}, no, title, sub, disabled} */
function rowbHTML(o){
  const da=dataAttrs(o.data);
  return `<button type="button" class="rowb pz" data-act="${o.act}"${da}${o.disabled?" disabled":""}><span class="no">${o.no}</span><span class="m"><b>${o.title}</b><span class="xs mut">${o.sub}</span></span>${icon("chev")}</button>`;
}
/* 数字の並び（習得・学習中…）。items = [[数, 名前], …] */
function statsHTML(items,style){ return `<div class="stats"${style?` style="${style}"`:""}>`+items.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")+`</div>`; }
function fmt(ms){ const s=Math.max(0,Math.round(ms/1000)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function noData(){ return `<div class="card"><p>問題データ（data/data.js）を読み込めません。アプリを入れ直すか、build.py を実行してから開き直してください。</p></div>`; }

/* ===== セッション（練習・苦手復習・模試） ===== */
let S=null, TIMER=null;
function clearTimer(){ if(TIMER){ clearInterval(TIMER); TIMER=null; } }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickOne(a){ return a[Math.floor(Math.random()*a.length)]; }   // pick() は解答の処理なので別の名前
function endSession(){ clearTimer(); stopAudio(); S=null; }
function enterQuiz(){ Router.session({ leave:endSession, guard:()=> !(S&&S.mode==="mock"&&!S.done) || confirm("模試を中断します。採点せずにもどります。") }); }

function startPractice(part,all){
  let units=practiceUnits(part); if(!units.length) return;
  if(!all){ const seen=loadJSON(K.seen); units=shuffle(units).sort((a,b)=>(seen[a.id]||0)-(seen[b.id]||0)).slice(0,PART_SIZE[part]); units=shuffle(units); }
  enterQuiz(); S={mode:"practice",label:"練習",units,i:0,ans:{}}; showUnit();
}
function reviewUnits(){
  const rv=loadJSON(K.review), t=today();
  const w=q=>{ const r=rv[q.qid]; return r&&r.due<=t?r:null; };
  return allUnitsFlat().map(u=>{ const rs=u.qs.map(w).filter(Boolean); return {u,st:rs.length?Math.min(...rs.map(r=>r.st)):9,n:rs.length?Math.max(...rs.map(r=>r.n)):0,has:rs.length>0}; })
    .filter(x=>x.has).sort((a,b)=>a.st-b.st||b.n-a.n).map(x=>x.u);
}
function startReview(){
  const units=reviewUnits().slice(0,15); if(!units.length) return;
  enterQuiz(); S={mode:"review",label:"苦手復習",units,i:0,ans:{}}; showUnit();
}
function startMock(){
  const U=unitsOf(CUR_MOCK), units=PARTS.flatMap(p=>U[p]||[]); if(!units.length) return;
  const firstR=units.findIndex(u=>u.part>=5);
  enterQuiz(); S={mode:"mock",mock:CUR_MOCK,label:"模試 "+CUR_MOCK,units,i:0,ans:{},firstR,rStarted:false,deadline:0};
  if(firstR===0) readingGate(); else showUnit();
}
function readingGate(){
  clearTimer(); stopAudio();
  const n=S.units.filter(u=>u.part>=5).reduce((s,u)=>s+u.qs.length,0);
  Shell.render({layer:"quiet",tabs:false,
    top:sessionTop(esc(S.label)+" ・ リーディングへ",S.i,S.units.length,"","中断"),
    body:`<div class="card"><h2 class="h h2">リスニングはここまで</h2><p>次はリーディング ${n}問・制限時間 ${READ_MIN}分です。下のボタンを押した時点から時間を数えます。リーディングでは前の問題にもどれます。</p><p class="note">本番では休みなく続きます。</p></div>`,
    bottom:`<button type="button" class="btn pri pz" data-act="beginReading">リーディングを始める</button>`});
}
const cur=()=>S.units[S.i];

function showUnit(){
  clearTimer(); stopAudio();
  const u=cur(), r=u.raw, p=u.part, mock=S.mode==="mock";
  S.t=Date.now(); S.ut=Date.now();
  const qnums=u.qs.map(q=>q.num).filter(x=>x!=null);
  const nr=qnums.length?`<span class="qno">${qnums.length>1?qnums[0]+"–"+qnums[qnums.length-1]:qnums[0]}</span>`:"";
  let body="";
  if(p===1){
    body=`<div class="card"><p class="inst">${nr}写真に最も合う説明を、音声を聞いて選びましょう</p>${audioUI(r.audio)}
      <img class="p1img" src="${esc(r.img)}" alt="Part 1 の写真" draggable="false"></div><div id="qs" class="stack"></div><div id="extra" class="stack"></div>`;
  } else if(p===2||p===3||p===4){
    body=`<div class="card"><p class="inst">${nr}${p===2?"質問への応答として最もよいものを選びましょう":"音声を聞いて、すべての設問に答えましょう"}</p>${audioUI(r.audio)}
      ${r.graphic?graphicHTML(r.graphic):""}</div><div id="qs" class="stack"></div><div id="extra" class="stack"></div>`;
  } else if(p===5){
    body=`<div id="qs" class="stack"></div><div id="extra" class="stack"></div>`;
  } else {
    body=`<div class="split"><div class="pane-d" id="docp" lang="en"></div><div><div id="qs" class="stack"></div><div id="extra" class="stack"></div></div></div>`;
  }
  const tm=`${mock&&S.rStarted?'<span class="chip ol num" id="mtm"></span>':""}<span class="chip ol num" id="tm"></span>`;
  Shell.render({layer:mock?"quiet":"expressive",tabs:false,wide:p===6||p===7,
    top:sessionTop(`${esc(S.label)} ・ Part ${p} <span class="num mut w5">${S.i+1}/${S.units.length}</span>`,S.i,S.units.length,tm,mock?"中断":"やめる"),
    body});
  if(p===6||p===7){ S.dtab=0; paintDoc(); }
  paintQs();
  // 時間の札：要素と文字の節を覚えておき、tick では変わったときだけ書く
  const tmEl=$("#tm"), txt=document.createTextNode("");
  tmEl.innerHTML=icon("clock","s"); tmEl.appendChild(txt); tmEl.setAttribute("aria-label","この問題の経過時間");
  S.tk={tm:tmEl,txt,mtm:$("#mtm"),last:{}};
  tick(); TIMER=setInterval(tick,500);
  if(p<=4) playAudio(r.audio);
}
function graphicHTML(g){
  const rows=g.rows||[]; if(!rows.length) return "";
  return `<div class="gr-t">${esc(g.title||"")}</div><div class="tblw"><table class="gr" lang="en">`+rows.map((r,i)=>"<tr>"+r.map(c=>i?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join("")+"</tr>").join("")+"</table></div>";
}
function paintDoc(){
  const u=cur(), r=u.raw, p=u.part; let h="";
  if(p===6){
    const t=esc(r.text).replace(/\{\{(\d+)\}\}/g,(m,n)=>`<span class="blank">${n}</span>`);
    h=`<div class="doc-h ui">${esc(r.doc||"")}</div><div class="doc">${t}</div>`;
  } else {
    const docs=r.docs||[];
    if(docs.length>1) h+=`<div class="dtabs ui">`+docs.map((d,i)=>`<button type="button" class="btn sm sec pz ${i===S.dtab?"on":""}" data-act="dtab" data-i="${i}" aria-pressed="${i===S.dtab}">文書${i+1}</button>`).join("")+`</div>`;
    const d=docs[S.dtab]||{};
    h+=`<div class="doc-h ui">${esc(d.type||"")}${d.title?" ・ "+esc(d.title):""}</div><div class="doc">${esc(d.text)}</div>`;
  }
  $("#docp").innerHTML=h;
}
function unitDone(u){ return u.qs.every(q=>S.ans[q.qid]); }
/* 設問1つ分のカード */
function qCardHTML(u,q,qi){
  const p=u.part, practice=S.mode!=="mock", a=S.ans[q.qid], locked=practice&&a;
  let head="";
  const qn=q.num!=null?`<span class="qno">${q.num}</span>`:"";
  if(p===6) head=`<p class="qtext">${qn}空所 ${qi+1}</p>`;
  else if(p===1) head=locked?"":`<p class="sm mut">A・B・C・D から選ぶ</p>`;   // 番号は上の指示文に出している
  else if(p===2) head=locked?`<p class="qtext"><span lang="en">${esc(q.q)}</span></p>`:`<p class="sm mut">A・B・C から選ぶ</p>`;
  else head=`<p class="qtext">${qn}<span lang="en">${esc(p===5?q.q.replace(/-{3,}/g,"_______"):q.q)}</span></p>`;
  const hap=practice?"none":"select";
  let ch="";
  if((p===1||p===2)&&!locked){
    ch=`<div class="choices abc">`+q.c.map((c,ci)=>choiceHTML({act:"pick",data:{q:q.qid,c:ci},letter:LET[ci],state:a&&a.pick===ci?"sel":"",hap,label:LET[ci]})).join("")+`</div>`;
  } else {
    ch=`<div class="choices">`+q.c.map((c,ci)=>{
      let st=""; if(locked){ if(ci===q.a) st="is-ok"; else if(a.pick===ci) st="is-ng"; } else if(a&&a.pick===ci) st="sel";
      return choiceHTML({act:"pick",data:{q:q.qid,c:ci},letter:LET[ci],state:st,disabled:!!locked,hap,inner:`<span class="ct" lang="en">${esc(c)}</span>`});
    }).join("")+`</div>`;
  }
  let ex="";
  if(locked){
    const ok=a.pick===q.a;
    ex=`<div class="stack">`+verdict(ok?"ok":"ng",ok?"正解":"不正解",`正解 ${LET[q.a]}${q.tag?`<span class="tag">${esc(q.tag)}</span>`:""}${ok?"":" ・ 解き直しの一覧に入れました"}`)+`<p class="expl">${esc(q.e)}</p>`;
    if(p===1) ex+=`<p class="sm mut">`+(u.raw.c||[]).map((c,i)=>`${LET[i]}: <span lang="en">${esc(c)}</span>　${esc((u.raw.ja||[])[i]||"")}`).join("<br>")+`</p>`;
    if(p===2){ const j=u.raw.ja||{}; ex+=`<p class="sm mut">${esc(j.prompt||"")}<br>`+(j.c||[]).map((c,i)=>LET[i]+": "+esc(c)).join("<br>")+`</p>`; }
    ex+=`</div>`;
  }
  return `<div class="card" data-qcard="${esc(q.qid)}">${head}${ch}${ex}</div>`;
}
function paintQs(){
  const u=cur();
  $("#qs").innerHTML=u.qs.map((q,qi)=>qCardHTML(u,q,qi)).join("");
  paintExtra(u); paintNav(u);
}
/* 解いたカードだけを描き直す（ほかのカードの状態・焦点はそのまま） */
function paintCard(u,q){
  const old=document.querySelector(`#qs [data-qcard="${CSS.escape(q.qid)}"]`); if(!old){ paintQs(); return; }
  const fc=old.contains(document.activeElement)?document.activeElement.dataset.c:null;
  old.outerHTML=qCardHTML(u,q,u.qs.indexOf(q));
  if(fc!=null){ const b=document.querySelector(`#qs .choice[data-q="${CSS.escape(q.qid)}"][data-c="${fc}"]`); if(b&&!b.disabled) try{ b.focus({preventScroll:true}); }catch(e){} }
}
/* 解答後の補足（スクリプト・和訳）と報告ボタン */
function paintExtra(u){
  const p=u.part, practice=S.mode!=="mock";
  let ext="";
  if(practice&&unitDone(u)){
    const r=u.raw;
    if(p===3) ext=`<div class="card script"><b>スクリプト</b>`+(r.lines||[]).map((l,i)=>`<p lang="en"><b>${esc(l.s)}:</b> ${esc(l.t)}</p><p class="ja">${esc((r.ja||[])[i]||"")}</p>`).join("")+`</div>`;
    if(p===4) ext=`<div class="card script"><b>スクリプト</b><p lang="en">${esc(r.text)}</p><p class="ja">${esc(r.ja||"")}</p></div>`;
    if(p===5) ext=`<div class="card script"><p class="ja" style="margin:0">${esc(r.ja||"")}</p></div>`;
    if(p===6) ext=`<div class="card script"><p class="ja" style="margin:0">${esc(r.sum||"")}</p></div>`;
    if(p===7) ext=`<div class="card script">`+(r.sum||[]).map((s,i)=>`<p class="ja">文書${i+1}: ${esc(s)}</p>`).join("")+`</div>`;
  }
  if(practice) ext+=`<div>${flagBtn(u.id)}</div>`;   // 模試中は報告ボタンを出さない（結果から送れる）
  $("#extra").innerHTML=ext;
}
/* 下のバー */
function paintNav(u){
  const last=S.i===S.units.length-1;
  let nav="";
  if(S.mode==="mock"){
    const canPrev=S.i>0&&S.units[S.i-1].part>=5&&u.part>=5;
    nav=`${canPrev?`<button type="button" class="btn sec pz" data-act="prev">${icon("back","s")}前へ</button>`:""}<button type="button" class="btn pri pz" data-act="${last?"finishMock":"next"}">${last?"解答を終える":"次へ"}</button>`;
  } else {
    const done=unitDone(u);
    nav=`<button type="button" class="btn ${done?"pri":"sec"} pz" data-act="${last?"finishPractice":"next"}">${last?"結果を見る":done?"次へ":"とばして次へ"}</button>`;
  }
  Shell.setBottom(nav);
}
function pick(qid,ci){
  if(!S) return; const u=cur(), q=u.qs.find(x=>x.qid===qid); if(!q) return;
  const now=Date.now(), practice=S.mode!=="mock";
  if(practice&&S.ans[qid]) return;
  const prev=S.ans[qid];
  const ms=(prev?prev.ms:0)+(now-S.t); S.t=now;
  S.ans[qid]={pick:ci,ms};
  const done=practice&&unitDone(u);   // 練習で、この1問でセットを解き終えた（模試では補足も下のバーも変わらない）
  if(practice){ recordResult(u,q,S.ans[qid]); if(done){ markSeen(u); clearTimer(); tick(); } }
  paintCard(u,q);
  if(done){ paintExtra(u); paintNav(u); }
  const sel=(c)=>document.querySelector(`#qs .choice[data-q="${qid}"][data-c="${c}"]`);
  if(practice){
    const ok=ci===q.a;
    Fx.mark(sel(q.a),true); if(!ok) Fx.mark(sel(ci),false);
    Fx.haptic(ok?"correct":"wrong"); Fx.sound(ok?"correct":"wrong");
    const card=document.querySelector(`[data-qcard="${qid}"] .stack`); Fx.reveal(card);
  } else Fx.select(sel(ci));
}
function go(d){
  const u=cur();
  if(S.mode==="mock"&&d>0&&S.i+1<S.units.length&&u.part<5&&S.units[S.i+1].part>=5&&!S.rStarted){ S.i++; readingGate(); return; }
  S.i=Math.max(0,Math.min(S.units.length-1,S.i+d)); showUnit();
}
function tick(){
  if(!S) return; const u=cur(), k=S.tk; if(!u||!k) return;
  const put=(key,v,apply)=>{ if(k.last[key]!==v){ k.last[key]=v; apply(v); } };   // 前と同じなら書かない
  const el_ms=Date.now()-S.ut, p=u.part;
  const target=p===5?20:p===7?60*u.qs.length:0;
  put("t",target?`${fmt(el_ms)} / 目安 ${fmt(target*1000)}`:fmt(el_ms),v=>{ k.txt.data=v; });
  put("c","chip num "+(target&&el_ms>target*1000?"warn":"ol"),v=>{ k.tm.className=v; });
  if(S.mode==="mock"&&S.rStarted){
    const rest=S.deadline-Date.now();
    if(k.mtm){ put("mt","残り "+fmt(rest),v=>{ k.mtm.textContent=v; }); put("mc","chip num "+(rest<5*60000?"red":rest<15*60000?"warn":"ol"),v=>{ k.mtm.className=v; }); }
    if(rest<=0){ clearTimer(); finishMock(true); }
  }
}

/* ===== 結果 ===== */
function finishPractice(){ clearTimer(); stopAudio(); Fx.haptic("done"); Fx.sound("done"); results(false); }
function finishMock(auto){
  if(!auto){
    const un=S.units.reduce((s,u)=>s+u.qs.filter(q=>!S.ans[q.qid]).length,0);
    if(un&&!confirm("未解答が "+un+" 問あります。採点しますか？")) return;
  }
  clearTimer(); stopAudio();
  for(const u of S.units){ for(const q of u.qs) recordResult(u,q,S.ans[q.qid]); markSeen(u); }
  S.done=true; Fx.haptic("grade"); results(true);
}
function results(mock){
  const by={}, tags={}, wrongs=[]; let tot=0, ok=0, un=0;
  for(const u of S.units){
    for(const q of u.qs){
      const a=S.ans[q.qid]; if(!a&&!mock) continue;
      tot++; const good=!!a&&a.pick===q.a; if(good) ok++; if(!a) un++;
      const pk="P"+u.part; tally(by,pk,good); tally(tags,pk+"|"+(q.tag||"-"),good);
      if(!good) wrongs.push({u,q,a});
    }
  }
  const pct=(a,b)=>b?Math.round(a/b*100):0;
  let h=`<section class="card score"><span class="chip ol">${esc(S.label)}の結果</span>
    <div class="big" aria-label="${tot}問中${ok}問正解"><span class="num" id="scoreN">${ok}</span><em>/ ${tot}</em></div>
    <p class="sm mut">正答率 ${pct(ok,tot)}%${un?" ・ 未解答 "+un+" 問":""}</p></section>`;
  h+=`<h2 class="sec-h">パート別</h2><section class="card stack">`+Object.keys(by).sort().map(k=>`<div class="prow"><b>${k.replace("P","Part ")}</b>${barHTML(by[k].ok/by[k].n)}<span>${by[k].ok}/${by[k].n}</span></div>`).join("")+`</section>`;
  h+=`<h2 class="sec-h">tag別</h2><section class="card"><table class="st"><tr><th>tag</th><th>正答</th><th>率</th></tr>`+
    Object.keys(tags).sort().map(k=>{ const [a,b]=k.split("|"); return `<tr><td>${a} ${esc(b)}</td><td class="num">${tags[k].ok} / ${tags[k].n}</td><td class="num">${pct(tags[k].ok,tags[k].n)}%</td></tr>`; }).join("")+`</table></section>`;
  if(wrongs.length){
    h+=`<h2 class="sec-h">間違えた問題（${wrongs.length}）</h2><section class="card">`+wrongs.map(({u,q,a})=>
      `<details class="rev"><summary><span class="num">${q.num!=null?q.num+".":""}</span> ${esc(u.id)} ${q.tag?`<span class="tag">${esc(q.tag)}</span>`:""}</summary><div>
      ${q.q?`<p class="sm" lang="en">${esc(q.q)}</p>`:""}
      <p class="sm">あなた：${a?LET[a.pick]+' <span lang="en">'+esc(q.c[a.pick])+"</span>":"未解答"}<br>正解：${LET[q.a]} <span lang="en">${esc(q.c[q.a])}</span></p>
      <p class="expl">${esc(q.e)}</p><div>${flagBtn(u.id)}</div></div></details>`).join("")+`</section>`;
  }
  h+=`<button type="button" class="btn pri pz" data-act="close">閉じる</button>`;
  Shell.render({layer:"expressive",tabs:false,top:subTop(S.label+"の結果",true),body:h});
  celebrate("#scoreN",ok);
  document.querySelectorAll("#page .prow .bar>i").forEach((e,i)=>Fx.fill(e,100+i*70));
}
/* 結果の数字：数え上がり → 墨のしずく（練習層だけ） */
function celebrate(sel,to){
  const el=$(sel); if(!el) return; Fx.countUp(el,to,0);
  setTimeout(()=>{ if(el.isConnected) Fx.inkDrops(el.closest(".big")||el,8,true); }, Fx.reduced()?0:1100);
}

/* ===== 英単語特訓（箱と間隔・出題形式・誤答の作り方は現行のまま） ===== */
const V_INT=[0,1,3,7,14,30,90];   // 箱ごとの「次に出るまでの日数」。箱6で習得
const V_LV={1:"〜400",2:"〜500",3:"〜600",4:"〜700",5:"〜800",6:"〜900",7:"900〜"};  // 100点刻み（2026-11-19）
const V_LEVELS=[1,2,3,4,5,6,7];
const V_TYPE={mean:"意味を選ぶ",listen:"聞いて意味を選ぶ",cloze:"空所に入る語を選ぶ",rev:"英語を選ぶ"};
let VOCAB=[], VBY={}, V=null;
function vSet(){ const p=profile(), q=prefs(); return {nw:+p.newPerDay||10, lv:+p.curLv||0, auto:q.vAuto?1:0}; }
function vState(){ return loadJSON(K.vocab); }
function vCounts(){
  const st=vState(), t=today(); let nw=0,lr=0,ms=0,due=0,weak=0;
  for(const e of VOCAB){ const r=st[e.id]; if(!r){ nw++; continue; } if(r.b>=6) ms++; else lr++; if(r.d<=t) due++; if(r.l>0&&r.b<6) weak++; }
  return {nw,lr,ms,due,weak};
}
function vAud(e,sent){ return e.au?"audio/v/"+e.id+(sent?"_s":"")+".mp3":""; }
function vGloss(e){ return e.ja.split(/[、，,・／\/；;]/).map(s=>s.replace(/[〜~（）()\s]|を|に|が/g,"").replace(/する$/,"")).filter(Boolean); }
function vVerbish(e){ return /(する|[うくぐすつぬぶむる])$/.test(e.ja.split(/[、，,／\/]/)[0].replace(/[（(].*?[）)]/g,"").trim()); }
function vClash(a,b){   // 意味が近く、誤答にすると正解が2つになりかねない組
  if(a.id===b.id) return true;
  const sa=a.syn.map(x=>x.toLowerCase()), sb=b.syn.map(x=>x.toLowerCase());
  if(sa.includes(b.w.toLowerCase())||sb.includes(a.w.toLowerCase())||sa.some(x=>sb.includes(x))) return true;
  const ga=vGloss(a), gb=vGloss(b);
  return ga.some(x=>gb.some(y=>x===y||(x.length>=2&&y.length>=2&&(x.includes(y)||y.includes(x)))));
}
function vGroup(e){ return e.pos==="前・接"?"句":e.pos; }
function vDistract(e){
  const g=vGroup(e), vb=vVerbish(e), out=[];
  const cand=shuffle(VOCAB.filter(x=>vGroup(x)===g&&!vClash(e,x))).map(x=>({x,k:(vVerbish(x)===vb?0:10)+Math.abs(x.lv-e.lv)})).sort((a,b)=>a.k-b.k).map(o=>o.x);
  for(const x of cand){ if(out.length>=3) break; if(!out.some(y=>vClash(x,y))) out.push(x); }
  return out;
}
function vTypesFor(e){ return e.au?["mean","listen","cloze","rev"]:["mean","cloze","rev"]; }   // 音声が無い語は「聞いて」を出さない
function vType(e,r){
  const au=!!e.au;
  if(!r) return "mean";
  if(r.b<=1) return au?pickOne(["mean","listen"]):"mean";
  if(r.b===2) return "cloze";
  if(r.b===3) return "rev";
  if(r.b===4) return au?"listen":"cloze";
  if(r.b===5) return pickOne(["cloze","rev"]);
  return pickOne(vTypesFor(e));
}
function startVocab(mode){
  const st=vState(), t=today(), set=vSet();
  let due=[], nw=[];
  if(mode==="daily"||mode==="review"){ due=VOCAB.filter(e=>st[e.id]&&st[e.id].d<=t).sort((a,b)=>st[a.id].d-st[b.id].d).slice(0,80); due=shuffle(due); }
  if(mode==="daily"||mode==="new"){
    const pool=VOCAB.filter(e=>!st[e.id]&&(!set.lv||e.lv===set.lv));
    nw=V_LEVELS.flatMap(lv=>shuffle(pool.filter(e=>e.lv===lv))).slice(0,set.nw);
  }
  let queue=due.concat(nw), free=false;
  if(mode==="weak"){ queue=shuffle(VOCAB.filter(e=>st[e.id]&&st[e.id].l>0&&st[e.id].b<6).sort((a,b)=>st[b.id].l-st[a.id].l).slice(0,30)); free=true; }
  if(!queue.length) return;
  Router.session({leave:()=>{ stopAudio(); V=null; }});
  V={mode,free,queue,i:0,n:0,ok:0,nw:0,miss:{},q:null};
  vShow();
}
function vShow(){
  stopAudio();
  const e=V.queue[V.i]; if(!e){ vFinish(); return; }
  const r=vState()[e.id], forced=V.miss[e.id]&&V.miss[e.id].type;
  const type=forced||(V.free?pickOne(vTypesFor(e)):vType(e,r));
  const q=V.q={e,type,isNew:!r,done:false,pick:-1};
  if(type==="cloze") q.opts=shuffle([{t:e.f,ok:true}].concat(e.d.map(t=>({t,ok:false}))));
  else q.opts=shuffle([{t:type==="rev"?e.w:e.ja,ok:true,sub:type==="rev"?e.ja:e.w}].concat(vDistract(e).map(x=>({t:type==="rev"?x.w:x.ja,ok:false,sub:type==="rev"?x.ja:x.w}))));
  V.t=Date.now(); vPaint(true);
  if(type==="listen") playAudio(vAud(e));
}
/* 例文（esc 済み）の中の見出し語 e.f を fill（HTML）に置きかえる */
function vBlank(e,fill){ return esc(e.ex).replace(new RegExp("(^|[^A-Za-z])"+esc(e.f).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?![A-Za-z])"),(m,pre)=>pre+fill); }
function vExample(e){ return `<p class="vex" lang="en">${vBlank(e,`<b>${esc(e.f)}</b>`)}</p><p class="sm mut">${esc(e.exja)}</p>`; }
function vAudBtns(e){ return e.au?`<div class="row"><button type="button" class="mini pz" data-act="play" data-src="${esc(vAud(e))}">${icon("speaker","s")}単語</button><button type="button" class="mini pz" data-act="play" data-src="${esc(vAud(e,1))}">${icon("speaker","s")}例文</button></div>`:""; }
function vPaint(fresh){
  const q=V.q, e=q.e;
  const top=sessionTop(`単語特訓 <span class="num mut w5">残り ${V.queue.length-V.i}</span>`,V.i,V.queue.length,"","やめる");
  let head=`<div class="row"><span class="chip">${q.isNew?"新しい語":V.miss[e.id]?"もう一度":"復習"}</span><span class="chip ol">${V_LV[e.lv]||""}</span><span class="sm mut">${V_TYPE[q.type]}</span></div>`;
  if(q.type==="mean") head+=`<div class="vw" lang="en">${esc(e.w)} <span class="tag">${esc(e.pos)}</span></div>`;
  if(q.type==="listen") head+=`<div class="stack">${q.done?`<div class="vw" lang="en">${esc(e.w)}</div>`:""}<div class="audio"><button type="button" class="playb pz" data-act="vplay">${icon("replay","s")}もう一度聞く</button><span class="st" id="audst" role="status"></span></div></div>`;
  if(q.type==="cloze") head+=`<p class="vq" lang="en">${vBlank(e,q.done?`<b style="color:var(--c-accent)">${esc(e.f)}</b>`:'<span class="blank" aria-label="空所">&nbsp;</span>')}</p>`;
  if(q.type==="rev") head+=`<div class="vja" style="font-size:1.375rem">${esc(e.ja)} <span class="tag">${esc(e.pos)}</span></div>`;
  const enOpt=q.type==="rev"||q.type==="cloze";
  const ch=`<div class="choices">`+q.opts.map((o,ci)=>{
    let st=""; if(q.done){ if(o.ok) st="is-ok"; else if(q.pick===ci) st="is-ng"; }
    return choiceHTML({act:"vans",data:{c:ci},letter:String(ci+1),state:st,disabled:q.done,hap:"none",
      inner:`<span class="ct"><span${enOpt?' lang="en"':""}>${esc(o.t)}</span>${q.done&&o.sub?`<small${enOpt?"":' lang="en"'}>＝ ${esc(o.sub)}</small>`:""}</span>`});
  }).join("")+`</div>`;
  let after="";
  if(q.done){
    const ok=q.pick>=0&&q.opts[q.pick].ok;
    after=`<div class="stack" id="vafter">`+verdict(ok?"ok":q.pick<0?"neutral":"ng",ok?"正解":q.pick<0?"答えを確認":"不正解",esc(q.msg||""))+vCard(e)+`</div>`;
  }
  const bottom=q.done?`<button type="button" class="btn pri pz" data-act="vnext">次へ</button>`:`<button type="button" class="btn sec pz" data-act="vans" data-c="-1" data-hap="none">わからない</button>`;
  Shell.render({layer:"expressive",tabs:false,top,body:`<section class="card">${head}${ch}</section>`+after,bottom,noAnim:!fresh,focus:!!fresh});
}
function vCard(e){
  return `<section class="card"><div class="vw" lang="en" style="font-size:1.5rem">${esc(e.w)} <span class="tag">${esc(e.pos)}</span><span class="tag">${V_LV[e.lv]||""}</span></div>
    <div class="vja">${esc(e.ja)}</div>${vExample(e)}
    <p class="sm mut">言い換え：<span lang="en" style="color:var(--c-text)">${e.syn.map(esc).join(" ／ ")}</span></p>
    ${e.note?`<p class="sm mut">メモ：${esc(e.note)}</p>`:""}
    ${vAudBtns(e)}
    <div>${flagBtn("V:"+e.id)}</div></section>`;
}
function vAnswer(ci){
  const q=V&&V.q; if(!q||q.done) return;
  const e=q.e, ok=ci>=0&&q.opts[ci].ok, st=vState(), t=today();
  let r=st[e.id]; const again=!!V.miss[e.id];
  q.done=true; q.pick=ci;
  if(!again){ V.n++; if(ok) V.ok++; if(q.isNew) V.nw++; const lg=loadJSON(K.vlog), d=tally(lg,t,ok); d.nw=(d.nw||0)+(q.isNew?1:0); saveJSON(K.vlog,lg); }
  if(!r){
    r=st[e.id]=ok?{b:2,d:t+V_INT[2],n:1,ok:1,l:0}:{b:0,d:t,n:1,ok:0,l:0};
    q.msg=ok?"知っている語として3日後に確認します":"このあともう一度出ます";
  } else {
    r.n++;
    if(ok){ r.ok++; if(!V.free||r.b===0){ r.b=Math.min(6,r.b+1); r.d=t+V_INT[r.b]; } q.msg=V.free?"":r.b>=6?"習得。90日後に確認します":"次は"+V_INT[r.b]+"日後"; }
    else { if(r.b>0) r.l=(r.l||0)+1; r.b=0; r.d=t; q.msg="このあともう一度出ます"; }
  }
  saveJSON(K.vocab,st);
  if(ok) delete V.miss[e.id];
  else { V.miss[e.id]={type:q.type==="listen"?"mean":q.type,w:1}; V.missed=V.missed||{}; V.missed[e.id]=1; V.queue.splice(Math.min(V.queue.length,V.i+5),0,e); }
  vPaint(false);
  const okEl=q.opts.findIndex(o=>o.ok), cs=document.querySelectorAll("#page .choices .choice");
  Fx.mark(cs[okEl],true); if(!ok&&ci>=0) Fx.mark(cs[ci],false);
  Fx.reveal($("#vafter"));
  if(ci>=0){ Fx.haptic(ok?"correct":"wrong"); Fx.sound(ok?"correct":"wrong"); }
  if(vSet().auto&&e.au) playAudio(vAud(e,q.type==="cloze"));
}
function vNext(){ if(!V||!V.q||!V.q.done) return; V.i++; vShow(); }
function vFinish(){
  stopAudio(); if(!V){ Router.back(); return; }
  const c=vCounts(), ids=Object.keys(V.missed||{}), set=vSet();
  let h=`<section class="card score"><span class="chip ol">英単語特訓の結果</span><div class="big" aria-label="${V.n}問中${V.ok}問正解"><span class="num" id="scoreN">${V.ok}</span><em>/ ${V.n}</em></div>
    <p class="sm mut">1回目の正答率 ${V.n?Math.round(V.ok/V.n*100):0}% ・ 新しい語 ${V.nw}</p>
    ${statsHTML([[c.ms,"習得"],[c.lr,"学習中"],[c.nw,"未着手"]],"width:100%")}</section>`;
  if(ids.length) h+=`<h2 class="sec-h">間違えた語（${ids.length}）</h2><section class="card">`+ids.map(id=>vRow(VBY[id])).join("")+`</section>`;
  const more=V.n>0&&c.nw?`<button type="button" class="btn sec pz" data-act="vstart" data-mode="new">新しい語をもう ${Math.min(set.nw,c.nw)} 語</button>`:"";
  const n=V.n, ok=V.ok; V=null;
  if(n>0){ Fx.haptic("done"); Fx.sound("done"); }
  Shell.render({layer:"expressive",tabs:false,top:subTop("英単語特訓の結果",true),body:h+more+`<button type="button" class="btn pri pz" data-act="close">閉じる</button>`});
  if(n>0) celebrate("#scoreN",ok);
}
function vRow(e,r){
  const b=r?(r.b>=6?'<i class="box m">習得</i>':`<i class="box ${r.l?"l":""}">箱${r.b}${r.l?" ・ ミス"+r.l:""}</i>`):"";
  return `<details class="vrow"><summary><b lang="en">${esc(e.w)}</b><span>${esc(e.ja)}</span>${b}</summary><div>
    ${vExample(e)}
    <p class="sm mut">言い換え：<span lang="en">${e.syn.map(esc).join(" ／ ")}</span>${e.note?"　メモ："+esc(e.note):""}</p>
    ${vAudBtns(e)}</div></details>`;
}
const VL_DEFAULT={q:"",lv:0,stt:""};   // 単語一覧の絞りこみ
let VL=Object.assign({},VL_DEFAULT);
function vListPaint(){
  const st=vState(), k=VL.q.trim().toLowerCase();
  const rows=VOCAB.filter(e=>{
    const r=st[e.id];
    if(VL.lv&&e.lv!==VL.lv) return false;
    if(VL.stt==="new"&&r) return false;
    if(VL.stt==="learn"&&!(r&&r.b<6)) return false;
    if(VL.stt==="weak"&&!(r&&r.l>0&&r.b<6)) return false;
    if(VL.stt==="done"&&!(r&&r.b>=6)) return false;
    return !k||e.w.toLowerCase().includes(k)||e.ja.includes(k)||e.syn.some(s=>s.toLowerCase().includes(k));
  });
  const n=$("#vln"), l=$("#vlist"); if(!n||!l) return;
  n.textContent=rows.length+" 語"; l.innerHTML=rows.map(e=>vRow(e,st[e.id])).join("");
}
function vLevelCounts(){
  const st=vState(), o={};
  for(const lv of V_LEVELS) o[lv]={all:0,nw:0,ms:0};
  for(const e of VOCAB){ const c=o[e.lv]; if(!c) continue; c.all++; const r=st[e.id]; if(!r) c.nw++; else if(r.b>=6) c.ms++; }
  return o;
}

/* ===== タブの画面 ===== */
const JWD="日月火水木金土";
function todayLabel(){ const d=new Date(); return `${d.getMonth()+1}月${d.getDate()}日（${JWD[d.getDay()]}）`; }
function vPlan(){ const c=vCounts(), set=vSet(); const left=VOCAB.filter(e=>!vState()[e.id]&&(!set.lv||e.lv===set.lv)).length; return {c,set,due:Math.min(c.due,80),nn:Math.min(set.nw,left)}; }
const ETS_NOTE="TOEIC is a registered trademark of ETS. This product is not endorsed or approved by ETS.";

SCREENS.today=()=>{
  const top=`<div class="topbar gl"><div class="brand" style="flex:1;min-width:0"><span class="logo" aria-hidden="true">L</span><div class="bn"><b>Lapis 模試 <span class="xs mut w5">（仮称）</span></b><small lang="en">for the TOEIC® L&amp;R Test</small></div></div>`+
    `<button type="button" class="iconbtn pz" data-act="nav" data-to="stats" aria-label="記録">${icon("chart")}</button><button type="button" class="iconbtn pz" data-act="nav" data-to="settings" aria-label="設定">${icon("gear")}</button></div>`;
  if(!MOCKS.length&&!VOCAB.length){ Shell.render({tab:"today",top,body:noData()}); return; }
  let h=`<p class="sm mut">${todayLabel()}</p>`;
  if(VOCAB.length){
    const {due,nn,c}=vPlan(), tot=due+nn, min=Math.max(1,Math.ceil(tot*12/60));
    const lg=loadJSON(K.vlog)[today()]||{n:0,ok:0,nw:0};
    if(tot) h+=`<section class="card hero"><div class="eyebrow">今日の単語</div><h1 class="h">${due?`復習 ${due}語`:""}${due&&nn?" と、<br>":""}${nn?`新しい語 ${nn}語`:""}</h1><p class="sm mut">約${min}分 ・ ${vSet().lv?V_LV[vSet().lv]+"の段":"易しい段から"}</p><button type="button" class="btn pri pz" data-act="vstart" data-mode="daily">はじめる</button></section>`;
    else h+=`<section class="card hero"><div class="eyebrow">今日の単語</div><h1 class="h">今日の分は終わりました</h1><p class="sm mut">今日 ${lg.n}問・正答 ${lg.ok}</p>${c.nw?`<button type="button" class="btn sec pz" data-act="vstart" data-mode="new">新しい語をもう少し</button>`:""}</section>`;
  }
  const rv=reviewUnits().length;
  if(MOCKS.length){
    h+=`<div class="list">`;
    if(rv) h+=rowbHTML({act:"review",no:icon("redo","s"),title:"苦手の解き直し",sub:`${rv}問（セット）・ 正解すると間隔をあけて出し直します`});
    h+=rowbHTML({act:"tab",data:{tab:"mock"},no:CUR_MOCK,title:`模試 ${CUR_MOCK}　<span class="chip acc">無料</span>`,sub:"200問・約2時間 ・ 本番と同じ順番"});
    h+=rowbHTML({act:"tab",data:{tab:"practice"},no:"P",title:"Part別の練習",sub:"1問ごとに解説 ・ 何度でも聞ける"})+`</div>`;
  }
  h+=`<p class="legal" lang="en">${ETS_NOTE}</p>`;
  Shell.render({tab:"today",top,body:h});
};
SCREENS.mock=()=>{
  const top=tabTop("模試");
  if(!MOCKS.length){ Shell.render({tab:"mock",top,body:noData()}); return; }
  const total=PARTS.reduce((s,p)=>s+(unitsOf(CUR_MOCK)[p]||[]).reduce((a,u)=>a+u.qs.length,0),0);
  const h=`<div class="list">${rowbHTML({act:"mockstart",data:{n:CUR_MOCK},no:CUR_MOCK,title:`模試 ${CUR_MOCK}　<span class="chip acc">無料</span>`,sub:`${total}問 ・ リスニング→リーディング ・ リーディング${READ_MIN}分`})}</div>
    <section class="card"><h2 class="h h2">模試の進み方</h2><p class="sm">リスニング（Part 1〜4）は音声が自動で流れます。最後の問題のあと、リーディングを始めるボタンを押した時点から${READ_MIN}分を数え、時間が来ると自動で採点します。リーディングでは前の問題にもどれます。途中の解説は出ません。</p><p class="note">途中でやめると、その回の解答は採点されません（続きから再開できるのは次の更新から）。</p></section>`;
  Shell.render({tab:"mock",top,body:h});
};
SCREENS.practice=()=>{
  const top=tabTop("練習");
  if(!MOCKS.length){ Shell.render({tab:"practice",top,body:noData()}); return; }
  const rv=reviewUnits().length, st=loadJSON(K.stat);
  const acc=p=>{ let n=0,ok=0; for(const k in st){ if(k.startsWith("P"+p+"|")){ n+=st[k].n; ok+=st[k].ok; } } return n?`正答率 ${Math.round(ok/n*100)}%（${n}問）`:"まだ解いていません"; };
  let h=rowbHTML({act:"review",disabled:!rv,no:icon("redo","s"),title:"苦手の解き直し",sub:rv?`今日の解き直し ${Math.min(rv,15)}問（セット）${rv>15?` ・ あと${rv-15}`:""}`:"解き直す問題はありません"});
  h+=`<h2 class="sec-h">Part別</h2><div class="list">`;
  for(const p of PARTS){
    const n=practiceUnits(p).length, unit=p<=2||p===5?"問":"セット";
    h+=`<section class="card"><div class="row nowrap"><span class="no num" style="width:2.375rem;height:2.375rem;display:grid;place-items:center;background:var(--c-selected);border-radius:var(--r-s);font-weight:700;flex:none">P${p}</span>
      <div style="flex:1;min-width:0;line-height:1.4"><b>Part ${p} ${PART_NAME[p]}</b><div class="xs mut">${n}${unit}・${qCount(p)}問 ・ ${acc(p)}</div></div></div>
      <div class="row"><button type="button" class="btn sm sec pz" data-act="practice" data-p="${p}" ${n?"":"disabled"}>ランダム ${PART_SIZE[p]}${unit}</button><button type="button" class="btn sm sec pz" data-act="practice" data-p="${p}" data-all="1" ${n?"":"disabled"}>全部（番号順）</button></div></section>`;
  }
  Shell.render({tab:"practice",top,body:h+`</div>`});
};
SCREENS.vocab=()=>{
  const top=tabTop("単語",`<span class="xs mut" style="padding-right:4px">${VOCAB.length.toLocaleString()}語</span>`);
  if(!VOCAB.length){ Shell.render({tab:"vocab",top,body:`<div class="card"><p>単語データ（data/vocab.js）を読み込めません。</p></div>`}); return; }
  const {c,set,due,nn}=vPlan(), lg=loadJSON(K.vlog)[today()]||{n:0,ok:0,nw:0}, lc=vLevelCounts();
  const prog=(c.ms+c.lr*0.4)/VOCAB.length;
  let h=`<section class="card hero">${statsHTML([[c.due,"復習"],[c.ms,"習得"],[c.lr,"学習中"],[c.nw,"未着手"]])}
    ${barHTML(prog.toFixed(4),'aria-hidden="true"')}
    <button type="button" class="btn pri pz col" data-act="vstart" data-mode="daily" ${due+nn?"":"disabled"}>今日の特訓<small>復習 ${due} ＋ 新しい語 ${nn}</small></button>
    <div class="row"><button type="button" class="btn sm sec pz" data-act="vstart" data-mode="review" ${c.due?"":"disabled"}>復習だけ</button>
      <button type="button" class="btn sm sec pz" data-act="vstart" data-mode="new" ${nn?"":"disabled"}>新しい語だけ</button>
      <button type="button" class="btn sm sec pz" data-act="vstart" data-mode="weak" ${c.weak?"":"disabled"}>苦手な語 ${c.weak}</button>
      <button type="button" class="btn sm sec pz" data-act="nav" data-to="vlist">${icon("list","s")}単語一覧</button></div>
    <p class="xs mut">今日 ${lg.n}問（正答 ${lg.ok} ・ 新しい語 ${lg.nw}）　キー操作：1〜4で解答、0でわからない、Enterで次へ</p></section>`;
  h+=`<h2 class="sec-h">新しい語を出す段 <span class="xs mut w5">段の名前は語の難しさの目安です</span></h2>
    <div class="lvlist" role="group" aria-label="新しい語を出す段"><button type="button" class="lvb pz" data-act="vlv" data-lv="0" aria-pressed="${!set.lv}"><b>易しい順</b><small>全段から</small></button>`+
    V_LEVELS.map(lv=>{ const k=lc[lv]; return `<button type="button" class="lvb pz" data-act="vlv" data-lv="${lv}" aria-pressed="${set.lv===lv}" ${k.all?"":"disabled"}><b>${V_LV[lv]}</b><small>${k.all?`未着手 ${k.nw}／${k.all}語`:"準備中"}</small></button>`; }).join("")+`</div>
    <p class="note">1日の新しい語の数（いま ${set.nw}語）と、答えのあとの発音は設定で変えられます。</p>`;
  Shell.render({tab:"vocab",top,body:h});
};

/* ===== 下の階層の画面（タブは出したまま） ===== */
SCREENS.stats=()=>{
  const st=loadJSON(K.stat), keys=Object.keys(st).sort();
  let h=`<section class="card"><h2 class="h h2">成績（累計）</h2>`;
  if(!keys.length) h+=`<p class="sm mut">まだ記録がありません。練習か模試を解くと表示されます。</p>`;
  else {
    let tn=0,tok=0; keys.forEach(k=>{ tn+=st[k].n; tok+=st[k].ok; });
    h+=`<p class="sm mut">全体 ${tok} / ${tn}（${Math.round(tok/tn*100)}%）</p><table class="st"><tr><th>パート・tag</th><th>回答</th><th>正答率</th><th>平均</th></tr>`+
      keys.map(k=>{ const [a,b]=k.split("|"), r=st[k]; return `<tr><td>${a.replace("P","Part ")} ${esc(b)}</td><td class="num">${r.n}</td><td class="num">${Math.round(r.ok/r.n*100)}%</td><td class="num">${(r.ms/r.n/1000).toFixed(1)}秒</td></tr>`; }).join("")+`</table>`;
  }
  h+=`</section>`;
  if(VOCAB.length){ const c=vCounts(); h+=`<section class="card"><h2 class="h h2">単語</h2>${statsHTML([[c.ms,"習得"],[c.lr,"学習中"],[c.nw,"未着手"],[c.weak,"苦手"]])}</section>`; }
  h+=`<button type="button" class="btn ghost pz" data-act="resetStats">成績をリセット（苦手と単語は残ります）</button>`;
  Shell.render({tab:"today",top:subTop("記録"),body:h});
};
/* 選択肢のボタン群。opts = [[値, 表示], …]。値は data-v に文字列で入れ、受け取る側で optVal() で型をもどす */
function optBtns(act,k,opts,cur,cls){
  return opts.map(([v,l])=>{ const on=cur===v; return `<button type="button" class="${cls?cls+(on?" on":"")+" ":""}pz" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}">${l}</button>`; }).join("");
}
function segHTML(k,opts,cur,act){ return `<div class="seg" role="group">${optBtns(act||"pref",k,opts,cur)}</div>`; }
function optVal(def,s){ return typeof def==="number"?+s:s; }   // 既定値が数なら数に
SCREENS.settings=(o)=>{ const re=!!(o&&o.rerender);
  const p=prefs(), pf=profile();
  const nwOpts=[5,10,15,20,30]; if(!nwOpts.includes(pf.newPerDay)) nwOpts.push(pf.newPerDay); nwOpts.sort((a,b)=>a-b);
  const h=`<h2 class="sec-h">表示</h2><section class="card plain">
    <div class="setrow"><b>外観</b>${segHTML("theme",[["auto","端末に合わせる"],["light","明るい"],["dark","暗い"]],p.theme)}</div>
    <div class="setrow"><b>文字の大きさ</b>${segHTML("text",[[0,"小"],[1,"標準"],[2,"大"],[3,"特大"],[4,"最大"]],p.text)}<p class="vex" lang="en">The quarterly report will be distributed to all department heads.</p></div>
    <div class="setrow"><b>動きを減らす</b>${segHTML("motion",[["auto","端末に合わせる"],["reduce","いつも減らす"]],p.motion)}</div></section>
    <h2 class="sec-h">音と触覚</h2><section class="card plain">
    <div class="setrow"><b>効果音</b>${segHTML("sfx",[[1,"入"],[0,"切"]],p.sfx)}<p class="note">模試の最中と、音声が流れている間は鳴りません。</p></div>
    <div class="setrow"><b>触覚</b>${segHTML("haptic",[[1,"入"],[0,"切"]],p.haptic)}<p class="note">アプリ版で働きます（ブラウザでは何も起きません）。</p></div>
    <div class="setrow"><b>模試中の触覚</b>${segHTML("hapticMock",[[1,"入"],[0,"切"]],p.hapticMock)}</div></section>
    <h2 class="sec-h">練習の音声</h2><section class="card plain">
    <div class="setrow"><b>速さの既定</b>${segHTML("speed",[[0.8,"0.8×"],[1,"1.0×"],[1.2,"1.2×"]],p.speed)}</div></section>
    <h2 class="sec-h">単語</h2><section class="card plain">
    <div class="setrow"><b>1日の新しい語</b>${segHTML("newPerDay",nwOpts.map(n=>[n,n]),pf.newPerDay,"prof")}</div>
    <div class="setrow"><b>答えのあとに発音</b>${segHTML("vAuto",[[1,"入"],[0,"切"]],p.vAuto)}</div></section>
    <h2 class="sec-h">そのほか</h2><div class="list">
    ${rowbHTML({act:"nav",data:{to:"flags"},no:icon("flag","s"),title:"報告した問題",sub:`${Object.keys(flags()).length}件 ・ 一覧とコピー`})}
    ${rowbHTML({act:"nav",data:{to:"about"},no:icon("info","s"),title:"このアプリについて",sub:"商標・プライバシー・ライセンス・版"})}</div>`;
  Shell.render({tab:"today",top:subTop("設定"),body:h,keepScroll:re,noAnim:re,focus:!re});
};
SCREENS.about=()=>{
  const h=`<section class="card"><div class="brand"><span class="logo" aria-hidden="true">L</span><div class="bn"><b>Lapis 模試（仮称）</b><small lang="en">for the TOEIC® L&amp;R Test</small></div></div>
    <p class="sm">版 ${APP_VERSION} ・ 収録：模試 ${MOCKS.length}回（いま使えるのは${availableMocks().length}回）・ 単語 ${VOCAB.length.toLocaleString()}語</p></section>
    <h2 class="sec-h">商標について</h2><section class="card"><p lang="en">${ETS_NOTE}</p><p class="sm mut">TOEIC は ETS の登録商標です。このアプリは ETS の認定・承認を受けたものではありません。問題はすべて独自に作成しています。</p></section>
    <h2 class="sec-h">プライバシー</h2><section class="card"><p class="sm">学習の記録は端末の中だけに保存し、外へ送りません。</p></section>
    <h2 class="sec-h">ライセンス</h2><section class="card"><p class="sm">書体：Zen Kaku Gothic New・Inter・Literata（SIL Open Font License 1.1）。写真：商用利用可のライセンスの素材（出典の一覧は今後ここに載せます）。</p></section>`;
  Shell.render({tab:"today",top:subTop("このアプリについて"),body:h});
};
function snippet(id){
  if(id.startsWith("V:")){ const e=VBY[id.slice(2)]; return e?("単語 "+e.w+" ／ "+e.ex).slice(0,90):""; }
  const u=unitById(id); if(!u) return "";
  const r=u.raw; const t=r.prompt||r.q||r.text||(r.lines&&r.lines[0]&&r.lines[0].t)||(r.docs&&r.docs[0]&&r.docs[0].text)||(r.qs&&r.qs[0]&&r.qs[0].q)||"";
  return String(t).replace(/\s+/g," ").slice(0,60);
}
function flagText(){ const f=flags(); return Object.keys(f).sort().map(id=>id+"\t"+snippet(id)).join("\n"); }
SCREENS.flags=(o)=>{
  const ids=Object.keys(flags()).sort();
  let h=`<section class="card"><h2 class="h h2">報告した問題（${ids.length}）</h2>`;
  if(!ids.length) h+=`<p class="sm mut">登録はありません。解説の下の「この問題はおかしい」から登録できます。</p>`;
  else {
    h+=ids.map(id=>`<div class="flagrow"><div class="m"><b class="num">${esc(id)}</b> <span class="mut">${esc(snippet(id))}</span></div><button type="button" class="btn sm sec pz" data-act="unflag" data-id="${esc(id)}">取り消す</button></div>`).join("");
    h+=`<textarea class="cp" id="cpt" readonly aria-label="コピー用のテキスト">${esc(flagText())}</textarea><div class="row"><button type="button" class="btn sm sec pz" data-act="copyFlags">${icon("copy","s")}テキストをコピー</button><span class="sm mut" id="cpm" role="status"></span></div>`;
  }
  Shell.render({tab:"today",top:subTop("報告した問題"),body:h+`</section>`,keepScroll:!!(o&&o.rerender),noAnim:!!(o&&o.rerender)});
};
SCREENS.vlist=(o)=>{
  const b=(k,opts)=>optBtns("vl",k,opts,VL[k],"btn sm sec");
  const h=`<input class="vsearch" id="vsq" type="search" placeholder="英語か日本語で検索" aria-label="単語を検索" value="${esc(VL.q)}" data-input="vsearch" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="row">${b("lv",[[0,"全レベル"],...V_LEVELS.map(l=>[l,V_LV[l]])])}</div>
    <div class="row">${b("stt",[["","すべて"],["new","未着手"],["learn","学習中"],["weak","苦手"],["done","習得"]])}</div>
    <p class="sm mut" id="vln" role="status"></p><section class="card" id="vlist" style="gap:0;padding-top:4px;padding-bottom:4px"></section>`;
  Shell.render({tab:"vocab",top:subTop("単語一覧"),body:h,keepScroll:!!(o&&o.rerender),noAnim:!!(o&&o.rerender)});
  vListPaint();
};

/* ===== 操作（data-act）の割り当て ===== */
Object.assign(ACT,{
  tab:d=>Router.tab(d.tab),
  nav:d=>Router.go(d.to),
  back:()=>{ if(!Router.back()) Router.tab("today"); },
  quit:()=>{ if(V){ vFinish(); return; } if(!Router.back()) Router.tab("today"); },
  play:d=>playAudio(d.src),
  vplay:()=>{ if(V&&V.q) playAudio(vAud(V.q.e)); },
  speed:d=>setSpeed(parseFloat(d.v)),
  flag:d=>toggleFlag(d.id),
  unflag:d=>{ toggleFlag(d.id); SCREENS.flags({rerender:true}); },
  copyFlags:()=>{
    const t=flagText(), m=$("#cpm");
    const fb=()=>{ const a=$("#cpt"); a.select(); try{ document.execCommand("copy"); m.textContent="コピーしました"; }catch(e){ m.textContent="選択しました。手動でコピーしてください"; } };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>m.textContent="コピーしました",fb); else fb();
  },
  practice:d=>startPractice(+d.p,!!d.all),
  review:()=>startReview(),
  mockstart:()=>startMock(),
  beginReading:()=>{ S.rStarted=true; S.deadline=Date.now()+READ_MIN*60000; showUnit(); },
  pick:d=>pick(d.q,+d.c),
  dtab:d=>{ S.dtab=+d.i; paintDoc(); },
  next:()=>go(1), prev:()=>go(-1),
  finishMock:()=>finishMock(false), finishPractice:()=>finishPractice(),
  vstart:d=>startVocab(d.mode),
  vans:d=>vAnswer(+d.c),
  vnext:()=>vNext(),
  vlv:d=>{ setProfile("curLv",+d.lv); SCREENS.vocab(); },
  vl:d=>{ VL[d.k]=optVal(VL_DEFAULT[d.k],d.v); SCREENS.vlist({rerender:true}); },
  pref:d=>{ const v=optVal(PREFS_DEFAULT[d.k],d.v); setPref(d.k,v); if(d.k==="haptic"&&v) Fx.haptic("toggle"); SCREENS.settings({rerender:true}); },
  prof:d=>{ setProfile(d.k,optVal(PROFILE_DEFAULT[d.k],d.v)); SCREENS.settings({rerender:true}); },
  resetStats:()=>{ if(confirm("成績の記録を消します（苦手と単語の進み具合は残ります）")){ Store.remove(K.stat); SCREENS.stats(); } }
});
ACT.close=ACT.back;   // 結果の「×閉じる」と「＜もどる」は同じ動き
Input.vsearch=v=>{ VL.q=v; vListPaint(); };

document.addEventListener("keydown",ev=>{
  if(ev.metaKey||ev.ctrlKey||ev.altKey) return;
  if(ev.target&&/^(INPUT|TEXTAREA)$/.test(ev.target.tagName)) return;
  if(!V||!V.q) return;
  if(!V.q.done){ const n="1234".indexOf(ev.key); if(n>=0&&n<V.q.opts.length){ ev.preventDefault(); vAnswer(n); } else if(ev.key==="0"){ ev.preventDefault(); vAnswer(-1); } }
  else if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); vNext(); }
});
window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").addEventListener&&matchMedia("(prefers-color-scheme: dark)").addEventListener("change",applyPrefs);

/* ===== 起動 ===== */
function loadData(){
  let D=window.TOEIC_DATA||null;
  if(D&&!D.mocks) D={mocks:[Object.assign({n:1,free:true},D)]};   // 旧形式（data.sample.js）
  MOCKS=D&&Array.isArray(D.mocks)?D.mocks.filter(m=>m&&m.n!=null):[];
  VOCAB=window.TOEIC_VOCAB||[]; VBY={}; for(const e of VOCAB) VBY[e.id]=e;
  invalidateUnits();
}
async function boot(){
  Shell.mount();
  try{ await Store.init(); }catch(e){ console.error(e); }
  const testMode=/[?&]test(\b|=|&|$)/.test(location.search);
  if(!testMode&&Store.ready) migrateStore(Store);   // 読みこみに失敗したときは引きつがない（既定値で上書きしないため）
  try{ if(history.state&&history.state.lapis) history.replaceState(null,""); }catch(e){}   // 再読みこみ前の「もどる」の印を消す
  applyPrefs();
  if(testMode){ const s=document.createElement("script"); s.src="js/selftest.js"; document.head.appendChild(s); return; }
  if(!window.TOEIC_DATA&&/[?&]sample/.test(location.search)){
    await new Promise(r=>{ const s=document.createElement("script"); s.src="data/data.sample.js"; s.onload=r; s.onerror=r; document.head.appendChild(s); });
  }
  loadData();
  Router.tab("today");
  // Service Worker は Web 版だけで登録する（アプリの中では登録しない：7.1-14）
  if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)&&!isNativeApp()&&!/[?&]sample/.test(location.search)){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
boot();
