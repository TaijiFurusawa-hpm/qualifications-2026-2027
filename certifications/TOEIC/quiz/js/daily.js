/* ===== 毎日の流れ（段階3）=====
   UX設計書 3.1（はじめに O1〜O4）・3.2（今日の1セット）・3.8（単語の階段・V5 段の到達・V6 まとめて確認）・3.9（記録 T1）・3.10（設定の「学習の計画」「記録」）
   - 単語の段は7段（100点刻み）。設計書の「6段」「各段2語・12問」は 7段×2語＝14問 に読みかえる
   - 箱と間隔（vApply）は app.js のまま変えない。ここは「どの語を・いつ出すか」と画面だけ
   - 「やった日」＝その日に1問でも解いた日（toeic_day_v1 の a、または単語の学習日誌 toeic_vlog_v1 の n）。
     今日の1セットのかたまりを最後まで終えた印は w（単語）・r（解き直し）・p（弱点の1セット） */
"use strict";
const SET_REVIEW_MAX=3;            // 今日の1セットの解き直し（最大3問）
const WEAK_MIN=8;                  // 弱点・時間の使い方・タグの順位に入れる最小の問題数（仮の値：8.2-13）
const WEAK_SIZE={1:3,2:5,5:5};     // 弱点の1セットの量（ほかの Part は1セット）
const LV_DONE_RATE=0.85;           // 段の修了＝その段の語の85%以上が定着中以上（仮の値）
const PLACE_PER_LV=2, PLACE_STOP=3, PLACE_SEC=6;   // 実力チェック：各段2語・3問続けて外れたら終わり・1問の目安6秒
const CK_BATCH=20;                 // まとめて確認の1回の枚数
const TARGETS=[500,600,730,860,900];
/* 目標スコア → 新しい語を出す上の段（7段への読みかえ：その点数を含む段まで）。900＝「900以上」 */
const TARGET_LV={500:2,600:3,730:5,860:6,900:7};
const TARGET_NAME=t=>t>=900?"900以上":String(t);
const TARGET_LABEL=t=>t>=900?"900点以上":t+"点";
const CHUNK_NAME={w:"単語",r:"解き直し",p:"弱点の1セット"};
const LV_TOP=V_LEVELS[V_LEVELS.length-1];
const isoOf=d=>new Date(d*86400000).toISOString().slice(0,10);   // 日の番号 → YYYY-MM-DD（dayOf の逆）

/* ===== 学習した日 ===== */
function markDay(f){ const d=loadJSON(K.day), t=today(), e=d[t]||(d[t]={}); if(e[f]&&e.a) return; e[f]=1; e.a=1; saveJSON(K.day,d); }
function studyDays(){
  const s=new Set(), d=loadJSON(K.day), lg=loadJSON(K.vlog);
  for(const k in d) if(d[k]&&d[k].a) s.add(+k);
  for(const k in lg) if(lg[k]&&lg[k].n>0) s.add(+k);
  return s;
}
const weekStart=t=>t-((new Date(t*86400000).getUTCDay()+6)%7);   // 月曜はじまり
const WD="月火水木金土日";
/* 今週の7つの点・累計・連続・再開（純粋な関数：days＝Set、t＝今日） */
function weekInfo(days,t){
  const ws=weekStart(t), week=[0,1,2,3,4,5,6].map(i=>({d:ws+i, on:days.has(ws+i)}));
  const n=week.filter(x=>x.on).length;
  let streak=0; for(let d=days.has(t)?t:t-1; days.has(d); d--) streak++;
  const resumed=days.has(t)&&!days.has(t-1)&&[...days].some(x=>x<t-1);
  return {week, n, total:days.size, streak, resumed};
}

/* ===== 学習の計画（3.1「1日の語数の出し方」） ===== */
function targetLv(target){ return target?TARGET_LV[target>=900?900:target]||LV_TOP:LV_TOP; }
/* 1日の新しい語。words＝対象の語数、days＝受験日までの日数（未定は null）。純粋な関数 */
function perDay(words,days){
  if(days==null) return {n:10};
  const use=days-7;   // 最後の1週間は復習だけ
  if(use<=0) return {n:5, late:true};
  const need=words/use;
  return {n:Math.min(30,Math.max(5,Math.ceil(need/5)*5)), short:need>30, use};
}
/* いまの計画：開始の段〜目標の段の未着手の語、受験日、おすすめの語数、足りないときの文 */
function planFor(p,st){
  const lc=vLevelStats(st), start=vCurLv(st), top=Math.max(start,targetLv(p.target)), ex=dayOf(p.exam), days=ex==null?null:ex-today();
  let words=0; for(let lv=start;lv<=top;lv++) words+=lc[lv].nw;
  const r=perDay(words,days); let msg="";
  if(r.late) msg="受験日まで1週間を切っています。新しい語は少なめにして、復習を中心にします。";
  else if(r.short){ let reach=start-1, acc=0; for(let lv=start;lv<=top;lv++){ acc+=lc[lv].nw; if(acc/r.use<=30) reach=lv; else break; }
    msg=`受験日までに全部は終わりません。まず${V_LV[Math.max(start,reach)]}の段までを目標にします。`; }
  return {start, top, words, days, n:r.n, msg};
}

/* ===== 今日の1セット（3.2）：① 単語 → ② 解き直し → ③ 弱点の1セット ===== */
/* 弱点の Part：正答率がいちばん低い Part（8問以上解いた Part だけ）。記録が足りなければ Part 5 */
function weakPart(){
  const st=loadJSON(K.stat), by={};
  for(const k in st){ const p=+k.slice(1,k.indexOf("|")), b=by[p]||(by[p]={n:0,ok:0}); b.n+=st[k].n; b.ok+=st[k].ok; }
  const c=PARTS.filter(p=>by[p]&&by[p].n>=WEAK_MIN&&practiceUnits(p).length).sort((a,b)=>by[a].ok/by[a].n-by[b].ok/by[b].n||a-b);
  return c[0]||5;
}
/* かたまりの一覧。n＝量（0なら飛ばす）、done＝今日すでに最後まで終えた */
function setChunks(){
  const t=today(), d=loadJSON(K.day)[t]||{}, out=[];
  if(VOCAB.length){
    const st=vState(); let due=0; for(const e of VOCAB){ const r=st[e.id]; if(r&&r.d<=t) due++; }
    const n=Math.min(due,V_SET_DUE)+vNewLeft(st);
    out.push({k:"w", n, unit:"語", sec:n*V_SEC, done:!!d.w});
  }
  if(MOCKS.length){
    const rp=reviewPlan(null,SET_REVIEW_MAX);
    out.push({k:"r", n:rp.count, unit:"問", sec:rp.count*REVIEW_SEC_PER_Q, done:!!d.r});
    const p=weakPart(), us=practiceUnits(p);
    if(us.length){ const sp=PART_SPEC[p], n=Math.min(WEAK_SIZE[p]||1,us.length), avg=us.reduce((s,u)=>s+sp.est(u),0)/us.length;
      out.push({k:"p", part:p, n, unit:sp.unit, sec:n*avg, done:!!d.p}); }
  }
  return out;
}
const setRest=all=>all.filter(c=>!c.done&&c.n>0);
const pUnit=c=>c.unit==="セット"?"セット":"問";
const chunkQty=c=>c.k==="p"?`Part ${c.part} ${c.n}${pUnit(c)}`:`${CHUNK_NAME[c.k]}${c.n}`;   // 札の見出し「単語22・解き直し3・Part 5 5問」
const chunkSay=c=>c.k==="p"?`Part ${c.part}を${c.n}${pUnit(c)}`:`${CHUNK_NAME[c.k]}${c.n}${c.unit}`;   // 読み上げ・区切りの文
/* 3つのかたまりの進み具合（終えたものは✓と「おわり」の文字：色に頼らない） */
function setStepsHTML(all){
  const shown=all.filter(c=>c.done||c.n>0); if(!shown.length) return "";
  return `<ol class="setp">`+shown.map(c=>`<li class="${c.done?"done":""}">${c.done?icon("check","s"):'<i class="dot" aria-hidden="true"></i>'}<span>${c.k==="p"?`Part ${c.part}`:CHUNK_NAME[c.k]}</span>${c.done?'<small>おわり</small>':""}</li>`).join("")+`</ol>`;
}
/* 次のかたまりを始める（どれも無ければ「今日」へ） */
function runSet(){
  const nx=setRest(setChunks())[0]; if(!nx){ Router.tab("today"); return; }
  const ok=nx.k==="w"?startVocab("set"):nx.k==="r"?startReview(null,SET_REVIEW_MAX,{set:"r"}):startPractice(nx.part,WEAK_SIZE[nx.part]||1,"",{set:"p"});
  if(!ok){ markDay(nx.k); runSet(); }   // 数えたあとで無くなっていたら、そのかたまりは飛ばす
}
/* かたまりの区切り（1枚）。k＝終えたかたまり、sum＝その結果の1行。「今日はここまで」と「続ける」は同じ大きさ */
function between(k,sum){
  markDay(k);
  const all=setChunks(), nx=setRest(all)[0];
  let h=`<section class="card"><div class="eyebrow">今日の1セット</div><h1 class="h h1">${CHUNK_NAME[k]}おわり</h1><p class="sm mut">${esc(sum)}</p>${setStepsHTML(all)}`+
    (nx?`<p>次は${chunkSay(nx)}（約${minOf(nx.sec)}分）。</p>`:`<p><b>今日の分は終わりました。</b></p>`)+`<p class="note">ここまでの記録は保存ずみです。</p></section>`;
  const bottom=nx?`<button type="button" class="btn sec pz" data-act="close">今日はここまで</button><button type="button" class="btn pri pz" data-act="setGo">続ける</button>`
    :`<button type="button" class="btn pri pz" data-act="close">閉じる</button>`;
  Shell.render({layer:"expressive",tabs:false,top:subTop("今日の1セット",true),body:h,bottom});
}

/* ===== 今日（H1） ===== */
function setCardHTML(second){
  const all=setChunks(), rest=setRest(all);
  if(!rest.length){
    const more=(VOCAB.length&&vCounts().nw?`<button type="button" class="btn sm sec pz" data-act="vstart" data-mode="new">単語の新しい語</button>`:"")+(MOCKS.length?`<button type="button" class="btn sm sec pz" data-act="tab" data-tab="practice">Part別の練習</button>`:"");
    return `<section class="card${second?"":" hero"}" data-set="done"><div class="eyebrow">今日の1セット</div><h1 class="h">今日の分は終わりました</h1>${setStepsHTML(all)}`+
      (more?`<p class="sm mut">もう少しやる</p><div class="row">${more}</div>`:"")+`</section>`;
  }
  const started=all.some(c=>c.done), min=minOf(rest.reduce((a,c)=>a+c.sec,0));
  const say=`今日の1セットを${started?"続ける":"始める"}。${rest.map(chunkSay).join("、")}。約${min}分`;
  return `<section class="card${second?"":" hero"}" data-set="open"><div class="eyebrow">今日の1セット</div><h1 class="h">${rest.map(chunkQty).join("・")}</h1>`+
    `<p class="sm mut">約${min}分 ・ どこで止めても記録が残ります</p>${setStepsHTML(all)}`+
    `<button type="button" class="btn ${second?"sec":"pri"} pz" data-act="setGo" aria-label="${esc(say)}">${started?"続ける":"はじめる"}</button></section>`;
}
function weekHTML(){
  const t=today(), w=weekInfo(studyDays(),t);
  const on=w.week.filter(x=>x.on).map(x=>WD[x.d-w.week[0].d]);
  const say=on.length?`今週は${on.join("、")}に学習`:"今週はまだ学習していません";
  const line=w.resumed?`再開しました。今週${w.n}日目です`:`今週 ${w.n}日 ・ 累計 ${w.total}日${w.streak>=2?` ・ 連続 ${w.streak}日`:""}`;
  return `<section class="card wk" role="group" aria-label="${say}。累計${w.total}日"><div class="wdots" aria-hidden="true">`+
    w.week.map((x,i)=>`<span class="wd${x.on?" on":""}${x.d===t?" now":""}"><i></i><small>${WD[i]}</small></span>`).join("")+`</div><p class="sm mut">${line}</p></section>`;
}
SCREENS.today=()=>{
  const top=`<div class="topbar gl"><div class="brand" style="flex:1;min-width:0"><span class="logo" aria-hidden="true">え</span><div class="bn"><b>えんぴつ模試</b><small lang="en">for the TOEIC® L&amp;R Test</small></div></div>`+
    `<button type="button" class="iconbtn pz" data-act="nav" data-to="stats" aria-label="記録">${icon("chart")}</button>${gearBtn()}</div>`;
  if(!MOCKS.length&&!VOCAB.length){ Shell.render({tab:"today",top,body:noData()}); return; }
  const p=profile(), ex=dayOf(p.exam), left=ex==null?null:ex-today();
  let h=`<div class="row tday"><p class="sm mut">${todayLabel()}</p>${left!=null&&left>=0?`<p class="sm"><b>${left?`受験日まで あと ${left}日`:"今日が受験日です"}</b></p>`:""}</div>`;
  if(left!=null&&left<0) h+=`<section class="card"><p>おつかれさまでした。次の受験日を決めますか。</p><p class="sm mut">決めなくても、このまま使えます。</p><div><button type="button" class="btn sm sec pz" data-act="nav" data-to="settings">受験日を決める</button></div></section>`;
  const resume=MOCKS.length?Mock.resumeHeroHTML():"";   // 中断した模試があれば、主の札は「続きから」（3.2）
  h+=resume+setCardHTML(!!resume)+weekHTML();
  if(MOCKS.length) h+=`<div class="list">${Mock.todayRowHTML()}</div>`;
  h+=`<p class="legal" lang="en">${ETS_NOTE}</p>`;
  Shell.render({tab:"today",top,body:h});
};

/* ===== 単語（V1：7段の階段） ===== */
const VS={open:0};   // 内訳を開いている段
const LV_SAY=lv=>lv>=LV_TOP?"900点以上の目安":`${V_LV[lv].replace("〜","")}点までの目安`;
function sbarHTML(k){ return `<span class="sbar" aria-hidden="true">`+[["ms",k.ms],["fx",k.fx],["lr",k.lr],["nw",k.nw]].map(([c,v])=>v?`<i class="${c}" style="flex:${v}"></i>`:"").join("")+`</span>`; }
const kText=k=>`習得 ${k.ms}・定着中 ${k.fx}・学習中 ${k.lr}・未着手 ${k.nw}`;
function stepHTML(lv,k,cur){
  const on=lv===cur, open=VS.open===lv&&k.all>0;
  const say=`段${lv}、${LV_SAY(lv)}、${k.all}語、習得${k.ms}、定着中${k.fx}、学習中${k.lr}、未着手${k.nw}${on?"、いまの段":""}`;
  let o="";
  if(open){
    o=`<div class="sto">`+(on?"":`<button type="button" class="btn sm pri pz" data-act="vlv" data-lv="${lv}">この段から始める</button>`)+
      `<button type="button" class="btn sm sec pz" data-act="vlistLv" data-lv="${lv}">${icon("list","s")}この段の単語を見る</button>`+
      (lv<cur&&k.nw?`<button type="button" class="btn sm sec pz" data-act="ckStart" data-lv="${lv}">まとめて確認（${k.nw}語）</button>`:"")+`</div>`;
  }
  return `<li class="stp${on?" cur":""}" style="--i:${lv-1}"><button type="button" class="stph pz" data-act="vstep" data-lv="${lv}" aria-expanded="${open}" aria-label="${say}" ${k.all?"":"disabled"}>`+
    `<span class="stn num">${V_LV[lv]}</span><span class="stm"><span class="stt"><b class="num">${k.all?k.all+"語":"準備中"}</b>${on?'<span class="chip acc">いまここ</span>':""}</span>${k.all?sbarHTML(k)+`<span class="xs mut">${kText(k)}</span>`:""}</span>${k.all?icon(open?"up":"down"):""}</button>${o}</li>`;
}
SCREENS.vocab=(o)=>{
  const re=!!(o&&o.rerender), top=tabTop("単語",`<span class="xs mut" style="padding-right:4px">${VOCAB.length.toLocaleString()}語</span>`);
  if(!VOCAB.length){ Shell.render({tab:"vocab",top,body:`<div class="card"><p>単語データ（data/vocab.js）を読み込めません。</p></div>`}); return; }
  const st=vState(), t=today(), {c,due,nn}=vPlan(), lc=vLevelStats(st), cur=vCurLv(st), set=vSet();
  const allFixed=V_LEVELS.every(lv=>lc[lv].nw+lc[lv].lr===0);
  let tomorrow=0, below=0; for(const e of VOCAB){ const r=st[e.id]; if(r&&r.d===t+1) tomorrow++; if(!r&&e.lv<cur) below++; }
  let h=`<section class="card hero">`;
  if(due+nn) h+=`<button type="button" class="btn pri pz col" data-act="vstart" data-mode="daily">今日の単語<small>復習 ${due} ＋ 新しい語 ${nn}　約${minOf((due+nn)*V_SEC)}分</small></button>`;
  else if(allFixed) h+=`<h1 class="h">全${VOCAB.length.toLocaleString()}語が定着中以上です。</h1><p class="sm mut">復習だけ続きます。</p>`;
  else h+=`<h1 class="h">今日の単語は終わりました</h1>${c.nw?`<button type="button" class="btn sec pz" data-act="vstart" data-mode="new">新しい語をもう ${Math.min(set.nw,c.nw)}語</button>`:""}`;
  if(c.due>V_DUE_MAX) h+=`<p class="sm">復習 ${c.due}語。今日は${V_DUE_MAX}語まで出します。</p>`;
  h+=`<p class="sm mut">明日の復習 約${tomorrow}語</p>`+statsHTML([[c.ms,"習得"],[c.lr,"学習中"],[c.nw,"未着手"]])+`</section>`;
  h+=`<div class="row">`+
    `<button type="button" class="btn sm sec pz" data-act="vstart" data-mode="weak" ${c.weak?"":"disabled"}>苦手な語 ${c.weak}</button>`+
    `<button type="button" class="btn sm sec pz" data-act="nav" data-to="vlist">${icon("list","s")}単語の一覧</button>`+
    (below?`<button type="button" class="btn sm sec pz" data-act="ckStart" data-lv="0">まとめて確認（下の段 ${below}語）</button>`:"")+`</div>`;
  h+=`<h2 class="sec-h">単語の階段 <span class="xs mut w5">段の名前は語の難しさの目安です</span></h2>`+
    `<ol class="stairs">`+V_LEVELS.slice().reverse().map(lv=>stepHTML(lv,lc[lv],cur)).join("")+`</ol>`+
    `<p class="note">新しい語は「いまここ」の段から出ます。段の語をすべて出し終えると、次の段へ移ります。どの段も最初から選べます。1日の新しい語（いま ${set.nw}語）は設定で変えられます。</p>`;
  Shell.render({tab:"vocab",top,body:h,keepScroll:re,noAnim:re,focus:!re});
};

/* ===== V5 段の到達 ===== */
let MS={lv:0,then:null};
function levelsDone(lc){ return V_LEVELS.filter(lv=>lc[lv].all&&(lc[lv].fx+lc[lv].ms)/lc[lv].all>=LV_DONE_RATE); }
/* 単語のセッションのあと：新しく修了した段があれば V5、なければ then() */
function milestone(then){
  const p=profile(), now=levelsDone(vLevelStats());
  if(!p.lvDone||typeof p.lvDone!=="object"){   // 初めての判定：いまの状態を覚えるだけ（前から修了していた段を祝い直さない）
    const o={}; now.forEach(l=>{ o[l]=today(); }); setProfile("lvDone",o); then(); return;
  }
  const fresh=now.find(l=>!p.lvDone[l]); if(fresh==null){ then(); return; }
  setProfile("lvDone",Object.assign({},p.lvDone,{[fresh]:today()}));
  showLevelDone(fresh,then);
}
function showLevelDone(lv,then){
  MS={lv,then};
  const k=vLevelStats()[lv], s0=(profile().lvStart||{})[lv], days=s0!=null?today()-s0+1:null, last=lv>=LV_TOP;
  const steps=V_LEVELS.map(l=>`<i class="${l<=lv?"on":""}" style="--i:${l}"></i>`).join("");
  const body=`<section class="card score v5"><span class="chip ol">段の到達</span><div class="v5st" aria-hidden="true">${steps}<b class="v5mk" id="v5mk" style="--i:${lv}"></b></div>`+
    `<h1 class="h h1" id="v5h">${V_LV[lv]} の段、修了</h1><p>${k.all}語のうち${k.fx+k.ms}語が定着中以上</p>${days!=null?`<p class="sm mut">かかった日数 ${days}日</p>`:""}`+
    `<p class="note">段の名前は語の難しさの目安です。</p></section>`;
  const bottom=last?`<button type="button" class="btn pri pz" data-act="msGo" data-v="stay">続ける</button>`
    :`<button type="button" class="btn sec pz" data-act="msGo" data-v="stay">この段をもう少し</button><button type="button" class="btn pri pz" data-act="msGo" data-v="next">次の段へ</button>`;
  Shell.render({layer:"expressive",tabs:false,top:`<div class="topbar gl"><div class="t"><b>単語</b></div></div>`,body,bottom});
  Fx.haptic("milestone"); Fx.sound("milestone");
  const mk=$("#v5mk"); if(mk&&!Fx.reduced()&&mk.animate) try{ mk.animate({transform:["translateY(12px)","none"],opacity:[.3,1]},{duration:500,easing:"cubic-bezier(.2,0,0,1)"}); }catch(e){}
  setTimeout(()=>{ const el=$("#v5h"); if(el&&el.isConnected) Fx.inkDrops(el,8,true); }, Fx.reduced()?0:300);
}

/* ===== V6 まとめて確認（めくり・スワイプ）=====
   開始の段より下の語を、自分で「知ってる／まだ」に分ける。知ってる＝初回正解と同じ扱い（箱2・3日後に4択で確かめる）、まだ＝新しい語のまま */
let CK=null;
function startCheck(lv){
  const st=vState(), cur=vCurLv(st);
  const list=shuffle(VOCAB.filter(e=>!st[e.id]&&(lv?e.lv===lv:e.lv<cur))).slice(0,CK_BATCH);
  if(!list.length) return;
  Router.session({leave:()=>{ CK=null; }});
  CK={lv,list,i:0,flip:false,hist:[],known:0,later:0,moved:false};
  ckPaint(true);
}
function ckPaint(fresh){
  const e=CK.list[CK.i]; if(!e){ ckEnd(); return; }
  const n=CK.list.length, undo=`<button type="button" class="iconbtn pz" data-act="ckUndo" aria-label="1つもどす" ${CK.hist.length?"":"disabled"}>${icon("replay")}</button>`;
  const top=sessionTop(`まとめて確認 <span class="num mut w5">${CK.i+1}/${n}</span>`,CK.i,n,"","おわる",false,undo);
  const face=CK.flip?`<span class="ckja">${esc(e.ja)}</span><span class="vex" lang="en">${vBlank(e,`<b>${esc(e.f)}</b>`)}</span><span class="xs mut">${esc(e.exja)}</span>`
    :`<span class="vw" lang="en">${esc(e.w)}</span><span class="tag">${esc(e.pos)}</span><span class="xs mut">押すと意味が出ます</span>`;
  const body=`<p class="sm mut">知っている語は右へ、まだの語は左へ送ります（下のボタンでも同じ）。</p>`+
    `<div class="ckwrap"><button type="button" class="ckcard pz${CK.flip?" back":""}" data-act="ckFlip" aria-pressed="${CK.flip}" aria-label="${esc(e.w)}${CK.flip?"、"+esc(e.ja):"、押すと意味が出ます"}">${face}</button></div>`;
  const bottom=`<button type="button" class="btn sec pz" data-act="ckAns" data-v="0">${icon("back","s")}まだ</button><button type="button" class="btn sec pz" data-act="ckAns" data-v="1">知ってる${icon("chev","s")}</button>`;
  Shell.render({layer:"expressive",tabs:false,top,body,bottom,noAnim:!fresh,focus:!!fresh});
  ckSwipe($(".ckcard"));
}
/* スワイプ：カードの上から始めたときだけ。決まる位置＝カード幅の30%か、速さ0.5px/ms以上（3.8）。越えた瞬間に触覚1回 */
function ckSwipe(el){
  if(!el) return;
  let x0=null, t0=0, dx=0, over=false, pid=null;
  el.addEventListener("pointerdown",e=>{ if(e.button>0) return; x0=e.clientX; t0=performance.now(); dx=0; over=false; pid=e.pointerId; CK.moved=false; });
  el.addEventListener("pointermove",e=>{
    if(x0==null||e.pointerId!==pid) return; dx=e.clientX-x0;
    if(!CK.moved&&Math.abs(dx)>8){ CK.moved=true; try{ el.setPointerCapture(pid); }catch(_){} }
    if(!CK.moved) return;
    el.style.transform=`translateX(${dx}px)`+(Fx.reduced()?"":` rotate(${(dx/28).toFixed(2)}deg)`);
    const o=Math.abs(dx)>=el.offsetWidth*.3; if(o!==over){ over=o; if(o) Fx.haptic("select"); }
    el.dataset.dir=o?(dx>0?"r":"l"):"";
  });
  const up=()=>{ if(x0==null) return; const v=Math.abs(dx)/Math.max(1,performance.now()-t0); x0=null;
    if(!CK||!CK.moved) return;
    if(Math.abs(dx)>=el.offsetWidth*.3||(v>=0.5&&Math.abs(dx)>24)){ ckFling(el,dx>0); return; }
    el.dataset.dir=""; const from=el.style.transform; el.style.transform="";
    if(!Fx.reduced()&&el.animate) try{ el.animate({transform:[from,"none"]},{duration:300,easing:"cubic-bezier(.2,0,0,1)"}); }catch(_){}
  };
  el.addEventListener("pointerup",up); el.addEventListener("pointercancel",up);
}
function ckFling(el,known){
  const done=()=>ckAnswer(known);
  if(Fx.reduced()||!el.animate){ done(); return; }
  try{ const a=el.animate({transform:[el.style.transform||"none",`translateX(${known?120:-120}%) rotate(${known?8:-8}deg)`],opacity:[1,0]},{duration:200,easing:"cubic-bezier(.3,0,.8,.2)",fill:"forwards"}); a.onfinish=()=>{ if(CK) done(); }; }catch(_){ done(); }
}
function ckFlip(){
  if(!CK) return; if(CK.moved){ CK.moved=false; return; }   // 送る操作のあとの click は、めくりにしない
  CK.flip=!CK.flip;
  const el=$(".ckcard");
  if(el&&!Fx.reduced()&&el.animate){ try{ const a=el.animate({transform:["none","rotateY(90deg)"]},{duration:210,easing:"ease-in"}); a.onfinish=()=>{ if(!CK) return; ckPaint(); const b=$(".ckcard"); if(b&&b.animate) b.animate({transform:["rotateY(-90deg)","none"]},{duration:210,easing:"ease-out"}); refocus(".ckcard"); }; return; }catch(_){} }
  ckPaint(); refocus(".ckcard");
}
function ckAnswer(known){
  if(!CK) return; const e=CK.list[CK.i]; if(!e) return;
  const st=vState(), prev=st[e.id], t=today();
  CK.hist.push({id:e.id, prev:prev?Object.assign({},prev):null, known});
  if(known&&!prev){ st[e.id]=vApply(undefined,true,t,false).r; saveJSON(K.vocab,st); vLvStart(e.lv,t); markDay("a"); CK.known++; }
  else if(!known) CK.later++;
  CK.i++; CK.flip=false; ckPaint(); refocus(".ckcard");
}
function ckUndo(){
  if(!CK||!CK.hist.length) return;
  const h=CK.hist.pop(), st=vState();
  if(h.known){ if(h.prev) st[h.id]=h.prev; else delete st[h.id]; saveJSON(K.vocab,st); CK.known--; } else CK.later--;
  CK.i--; CK.flip=false; ckPaint(); refocus(".ckcard");
}
function ckEnd(){
  const c=CK, more=VOCAB.some(e=>!vState()[e.id]&&(c.lv?e.lv===c.lv:e.lv<vCurLv()));
  const h=`<section class="card score"><span class="chip ol">まとめて確認の結果</span>${statsHTML([[c.known,"知ってる"],[c.later,"まだ"]],"width:100%")}`+
    `<p class="sm">知ってる語は3日後に4択で確かめます。まだの語は、新しい語として出ます。</p></section>`+
    (more?`<button type="button" class="btn sec pz" data-act="ckStart" data-lv="${c.lv||0}">続けてもう${CK_BATCH}枚</button>`:"")+
    `<button type="button" class="btn pri pz" data-act="close">閉じる</button>`;
  CK=null;
  Shell.render({layer:"expressive",tabs:false,top:subTop("まとめて確認の結果",true),body:h});
}

/* ===== はじめに（O1〜O4）：初回だけ。どの画面も右上の「スキップ」で抜けられ、抜けても既定値で使える ===== */
const OB={step:1, pl:null, open:"", nwSet:false, picked:false};
function obReset(){ Object.assign(OB,{step:1,pl:null,open:"",nwSet:false,picked:false}); }
function obTop(label){
  const back=OB.step>1&&!(OB.pl&&!OB.pl.done&&OB.step===3);
  return `<div class="topbar${back?"":" gl"}">${back?`<button type="button" class="iconbtn pz" data-act="obBack" aria-label="もどる">${icon("back")}</button>`:""}`+
    `<div class="t"><b>${label||"はじめに"} <span class="num mut w5">${OB.step} / 4</span></b></div><button type="button" class="btn ghost sm pz" data-act="obSkip">スキップ</button></div>`;
}
function obRender(body,bottom,label){ Shell.render({layer:"quiet",tabs:false,top:obTop(label),body,bottom}); }
SCREENS.onboard=()=>{ [null,ob1,ob2,ob3,ob4][OB.step](); };
function ob1(){
  const p=profile(), cur=OB.picked?(p.target==null?"":String(p.target)):null;
  const opts=TARGETS.map(x=>[String(x),TARGET_LABEL(x)]).concat([["","まだ決めていない"]]);
  obRender(`<h1 class="h h1">目標のスコアは？</h1><p class="sm mut">新しい単語をどの段まで出すかの目安にします。あとで設定から変えられます。</p>`+
    `<div class="list" role="group" aria-label="目標のスコア">`+opts.map(([v,l])=>`<button type="button" class="btn sec pz obopt" data-act="obTarget" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join("")+`</div>`+
    `<p class="legal" lang="en">${ETS_NOTE}</p>`);
}
function ob2(){
  const p=profile();
  obRender(`<h1 class="h h1">次に受ける日は？</h1><p class="sm mut">受験日から、1日に出す新しい語の数を決めます。</p>`+
    `<label class="stack"><b class="sm">受験日</b><input class="vsearch" type="date" id="obExam" min="${isoOf(today())}" value="${esc(p.exam||"")}" data-input="obExam"></label>`+
    `<button type="button" class="btn sec pz" data-act="obNoExam">まだ決めていない</button>`,
    `<button type="button" class="btn pri pz" data-act="obNext">次へ</button>`);
}
const placeCount=()=>V_LEVELS.length*PLACE_PER_LV;
function ob3(){
  if(OB.pl&&!OB.pl.done){ plPaint(); return; }
  obRender(`<h1 class="h h1">単語の実力チェック</h1><p>単語を${placeCount()}問だけ。約${Math.ceil(placeCount()*PLACE_SEC/10)*10}秒。</p>`+
    `<ul class="rules sm"><li>やさしい段から順に、英単語の意味を4つから選びます。</li><li>正解・不正解は出しません。分からなければ「わからない」。</li><li>3問続けて外れたら、そこで終わります。</li><li>結果から、単語をどの段から始めるかを決めます。解いた語はそのまま記録に残ります。</li></ul>`,
    `<button type="button" class="btn sec pz" data-act="obLater">あとで</button><button type="button" class="btn pri pz" data-act="plStart">始める</button>`);
}
/* 実力チェックの開始の段（純粋な関数）：2問とも正解できなかった最初の段。全部正解なら最上段 */
function placeLevel(res){ for(const lv of V_LEVELS){ if(res.filter(x=>x.lv===lv&&x.ok).length<PLACE_PER_LV) return lv; } return LV_TOP; }
function plStart(){
  const st=vState();
  const pick=lv=>{ const pool=VOCAB.filter(e=>e.lv===lv&&e.au), fresh=pool.filter(e=>!st[e.id]); return shuffle(fresh.length>=PLACE_PER_LV?fresh:pool).slice(0,PLACE_PER_LV); };
  const items=V_LEVELS.flatMap(pick).map(e=>({e, opts:shuffle([{t:e.ja,ok:true}].concat(vDistract(e).map(x=>({t:x.ja,ok:false}))))}));
  OB.pl={items,i:0,res:[],run:0,busy:false,done:false,t0:Date.now()};
  plPaint(true);
}
function plPaint(fresh){
  const P=OB.pl, it=P.items[P.i];
  if(!it||P.run>=PLACE_STOP){ plEnd(); return; }
  const n=P.items.length, e=it.e;
  const dots=`<div class="pdots" role="progressbar" aria-label="実力チェックの進み具合" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${P.i}">`+P.items.map((x,i)=>`<i class="${i<P.i?"on":""}${i===P.i?" cur":""}"></i>`).join("")+`</div>`;
  const ch=`<div class="choices" role="group" aria-label="意味の選択肢">`+it.opts.map((o,ci)=>choiceHTML({act:"plAns",data:{c:ci},letter:String(ci+1),hap:"select",inner:`<span class="ct">${esc(o.t)}</span>`})).join("")+`</div>`;
  Shell.render({layer:"quiet",tabs:false,top:obTop("実力チェック"),body:dots+`<section class="card"><p class="sm mut">この単語の意味は？</p><div class="vw" lang="en">${esc(e.w)}</div>${ch}</section>`,
    bottom:`<button type="button" class="btn sec pz" data-act="plAns" data-c="-1" data-hap="none">わからない</button>`,noAnim:!fresh,focus:!!fresh});
}
/* チェックで解いた語は通常の解答として記録する（新しい語の1回目と同じ：箱と間隔は vApply）。
   学習日誌には数えるが、今日の「新しい語」の枠（nw）は使わない（チェックのあとの1セットで、計画どおりの数の新しい語が出るように） */
function plRecord(e,ok){
  const st=vState(), t=today(); if(st[e.id]) return;   // もう手をつけている語（「はじめの案内をもう一度」）は記録を変えない
  st[e.id]=vApply(undefined,ok,t,false).r; saveJSON(K.vocab,st);
  const lg=loadJSON(K.vlog); tally(lg,t,ok); saveJSON(K.vlog,lg); vLvStart(e.lv,t);
}
function plAnswer(ci,el){
  const P=OB.pl; if(!P||P.busy||P.done) return; const it=P.items[P.i]; if(!it) return;
  const ok=ci>=0&&it.opts[ci].ok; P.busy=true;
  P.res.push({lv:it.e.lv,ok}); P.run=ok?0:P.run+1;
  plRecord(it.e,ok);
  if(el&&ci>=0) Fx.select(el);   // 正誤は出さない（選んだ印だけ）。線の無い楕円なので短く塗る（すぐ次へ進む）
  setTimeout(()=>{ if(OB.pl!==P) return; P.i++; P.busy=false; plPaint(); }, Fx.reduced()?60:200);
}
function plEnd(){
  const P=OB.pl; P.done=true; P.secs=Math.round((Date.now()-P.t0)/1000);
  const lv=placeLevel(P.res); setProfile("placedLv",lv); setProfile("curLv",lv);
  OB.step=4; SCREENS.onboard();
}
function ob4(){
  const p=profile(), st=vState(), cur=vCurLv(st), pl=planFor(p,st), ex=dayOf(p.exam), left=ex==null?null:ex-today();
  if(!OB.nwSet&&p.newPerDay!==pl.n){ setProfile("newPerDay",pl.n); }
  const nw=profile().newPerDay, placed=OB.pl&&OB.pl.done;
  const row=(k,title,sub,btn,more)=>`<div class="obrow"><div class="m"><b>${title}</b>${sub?`<span class="xs mut">${sub}</span>`:""}</div><button type="button" class="btn sm sec pz" data-act="obOpen" data-k="${k}" aria-expanded="${OB.open===k}">${btn||"変える"}</button></div>${OB.open===k?`<div class="obmore">${more}</div>`:""}`;
  let h=`<h1 class="h h1">こう始めましょう</h1><section class="card">`+
    row("lv",`${V_LV[cur]} の段から始めましょう`,placed?`実力チェック（${OB.pl.res.length}問）の結果から`:"いちばんやさしい段から（実力チェックはあとでもできます）","変える",
      `<div class="seg" role="group" aria-label="始める段">${optBtns("obLv","lv",V_LEVELS.map(l=>[l,V_LV[l]]),cur)}</div>`)+
    row("nw",`1日 新しい語 ${nw}語 ＋ 復習`,`おすすめ ${pl.n}語${p.target?` ・ 目標 ${TARGET_LABEL(p.target)}（${V_LV[pl.top]}の段まで）`:""}`,"変える",
      `<div class="seg" role="group" aria-label="1日の新しい語">${optBtns("obNw","nw",nwOpts(nw).map(n=>[n,n===pl.n?`${n}<small>おすすめ</small>`:String(n)]),nw)}</div>`)+
    row("ex",left!=null&&left>=0?`受験日まで あと ${left}日`:"受験日は未定",left!=null&&left>=0?`${esc(p.exam)}`:"未定のあいだは、新しい語は1日10語",left!=null&&left>=0?"変える":"決める",
      `<input class="vsearch" type="date" min="${isoOf(today())}" value="${esc(p.exam||"")}" data-input="obExam4" aria-label="受験日">`)+
    `</section>`+(pl.msg?`<p class="sm">${pl.msg}</p>`:"")+`<p class="note">2問ずつのチェックなので粗い目安です。合わなければ、単語タブでいつでも変えられます。</p>`;
  const m1=availableMocks()[0];
  if(m1) h+=`<button type="button" class="btn sec pz" data-act="obMock" data-n="${m1.n}">先に模試${m1.n}を受ける（無料・約2時間）</button>`;
  obRender(h,`<button type="button" class="btn pri pz" data-act="obGo">今日の1セットを始める</button>`,"提案");
}
const nwOpts=cur=>{ const o=[5,10,15,20,30]; if(!o.includes(cur)) o.push(cur); return o.sort((a,b)=>a-b); };
function obFinish(){ setProfile("onboarded",1); obReset(); }

/* ===== 記録（T1）。空の欄には「どうすれば表示されるか」を書く（data-empty） ===== */
const TS={per:"all"};
function tsec(id,title,body,empty,extra){
  return `<h2 class="sec-h">${title}</h2><section class="card" data-sec="${id}">${body||`<p class="sm mut" data-empty>${empty}</p>${extra||""}`}</section>`;
}
/* 受けた回ごとの目安の幅を縦の帯で並べ、目標の線を1本（表としても読める） */
function estChartHTML(H,target){
  const runs=H.slice().sort((a,b)=>a.at-b.at).slice(-6).map(h=>({h,e:histEstimate(h)})); if(!runs.length) return "";
  let lo=Math.min(...runs.map(r=>r.e.lo)), hi=Math.max(...runs.map(r=>r.e.hi));
  if(target){ lo=Math.min(lo,target); hi=Math.max(hi,target); }
  lo=Math.max(0,Math.floor((lo-20)/50)*50); hi=Math.min(990,Math.ceil((hi+20)/50)*50);
  const W=320, Hh=150, x0=38, y=v=>10+(hi-v)/(hi-lo||1)*(Hh-30), step=(W-x0-8)/Math.max(runs.length,3);
  let s=`<svg class="ech" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="受けた回ごとの目安の幅${target?`と目標 ${TARGET_LABEL(target)}`:""}">`+
    `<text x="${x0-6}" y="${y(hi)+4}" text-anchor="end">${hi}</text><text x="${x0-6}" y="${y(lo)+4}" text-anchor="end">${lo}</text><line class="ax" x1="${x0}" y1="${y(hi)}" x2="${x0}" y2="${y(lo)}"/>`;
  runs.forEach((r,i)=>{ const cx=x0+step*(i+.5), w=Math.min(36,step*.6);
    s+=`<rect class="bd${r.h.counts?"":" ref"}" x="${cx-w/2}" y="${y(r.e.hi)}" width="${w}" height="${Math.max(2,y(r.e.lo)-y(r.e.hi))}" rx="2"/><text x="${cx}" y="${Hh-6}" text-anchor="middle">${dateLabel(r.h.at)}</text>`; });
  if(target) s+=`<line class="tg" x1="${x0}" x2="${W-4}" y1="${y(target)}" y2="${y(target)}"/><text class="tgl" x="${W-6}" y="${y(target)-4}" text-anchor="end">目標 ${TARGET_NAME(target)}</text>`;
  s+=`</svg>`;
  const tbl=`<details class="trans"><summary class="pz">表で見る</summary><table class="st"><tr><th>受けた日</th><th>回</th><th>目安</th></tr>`+
    runs.map(r=>`<tr><td>${dateLabel(r.h.at)}</td><td>模試 ${r.h.n}</td><td class="num">${r.e.lo}〜${r.e.hi}${r.h.counts?"":"（参考）"}</td></tr>`).join("")+`</table></details>`;
  return s+`<p class="note">塗りの帯＝「いまの目安」に使う回、白抜き＝参考の回${target?"。横の線は目標":""}。</p>`+tbl;
}
function partSums(per){
  const out={}; PARTS.forEach(p=>{ out[p]=[0,0]; });
  if(per==="30"){ const d=loadJSON(K.day), t=today(); for(let x=t-29;x<=t;x++){ const P=d[x]&&d[x].P; if(P) for(const p in P){ if(out[p]){ out[p][0]+=P[p][0]; out[p][1]+=P[p][1]; } } } }
  else { const st=loadJSON(K.stat); for(const k in st){ const p=+k.slice(1,k.indexOf("|")); if(out[p]){ out[p][0]+=st[k].n; out[p][1]+=st[k].ok; } } }
  return out;
}
function calHTML(days,t){
  const d0=new Date(t*86400000), y=d0.getUTCFullYear(), m=d0.getUTCMonth(), first=Math.floor(Date.UTC(y,m,1)/86400000), last=Math.floor(Date.UTC(y,m+1,1)/86400000)-1;
  const lead=(new Date(first*86400000).getUTCDay()+6)%7, on=[];
  let c=`<div class="cal" aria-hidden="true">`+[...WD].map(w=>`<b>${w}</b>`).join("")+"<i></i>".repeat(lead);
  for(let d=first;d<=last;d++){ const s=days.has(d); if(s) on.push(d-first+1); c+=`<span class="${s?"on":""}${d===t?" now":""}">${d-first+1}<i></i></span>`; }
  return `<p class="vh">${m+1}月の学習した日：${on.length?on.map(x=>x+"日").join("、"):"まだありません"}</p>${c}</div>`;
}
SCREENS.stats=(o)=>{
  const re=!!(o&&o.rerender), H=MOCKS.length?Mock.hist():[], st=loadJSON(K.stat), t=today(), p=profile();
  let h="";
  // いまの目安
  const est=H.length?currentEstimate(H):null, m1=availableMocks()[0];
  h+=tsec("est","いまの目安",est?`<p class="estl"><b class="num">${est.lo}〜${est.hi}点</b><span class="sm mut">直近${est.k}回（本番どおりで受けた回）から</span></p>`+estChartHTML(H,p.target)+`<p class="note">目安です。本番の点数を保証するものではありません。</p>`:"",
    "模試を「本番どおり」で1回受けると表示されます（2回目以降・時間を延ばした回・未解答の多い回は使いません）。",
    (H.length?estChartHTML(H,p.target):"")+(m1?`<div><button type="button" class="btn sm sec pz" data-act="mPrep" data-n="${m1.n}">模試${m1.n}へ</button></div>`:""));
  // 模試の履歴
  h+=tsec("hist","模試の履歴",H.length?`<div class="list">`+H.slice().reverse().map(x=>{ const e=histEstimate(x);
      return rowbHTML({act:"mResult",data:{n:x.n,at:x.at},no:x.n,title:`模試 ${x.n}${x.attempt>1?`（${x.attempt}回目）`:""}　目安 ${e.lo}〜${e.hi}点${x.counts?"":'　<span class="chip warn">参考</span>'}`,sub:`${dateLabel(x.at)} ・ ${esc(MOCK_MODES[x.mode].label)} ・ ${x.L+x.R}/${x.nL+x.nR}問正解`}); }).join("")+`</div>`:"",
    "模試を最後まで受けて採点すると、ここに並びます。");
  // Part別
  const ps=partSums(TS.per), any=PARTS.some(x=>ps[x][0]>0);
  const perSeg=`<div class="seg" role="group" aria-label="期間">${optBtns("tsPer","per",[["all","累計"],["30","直近30日"]],TS.per)}</div>`;
  h+=`<h2 class="sec-h">Part別の正答率</h2><section class="card" data-sec="part">${perSeg}`+
    (any?`<div class="stack">`+PARTS.map(x=>partRowHTML(`Part ${x}`,ps[x][1],ps[x][0],ps[x][0]?` ・ ${pct(ps[x][1],ps[x][0])}%`:"")).join("")+`</div>`
      :`<p class="sm mut" data-empty>${TS.per==="30"?"直近30日に解いた問題はありません。":""}練習か模試を解くと表示されます。</p>`)+
    (TS.per==="30"?`<p class="note">直近30日の記録は、この版から数えています。</p>`:"")+`</section>`;
  // 弱点のタグ
  const tags=Object.keys(st).filter(k=>st[k].n>=WEAK_MIN).sort((a,b)=>st[a].ok/st[a].n-st[b].ok/st[b].n).slice(0,5);
  h+=tsec("tags","弱点のタグ",tags.length?tags.map(k=>{ const [pp,tg]=k.split("|"), r=st[k];
      return `<div class="trow"><div class="m"><b>${pp.replace("P","Part ")} ${esc(tg)}</b><span class="xs mut">正答率 ${pct(r.ok,r.n)}%（${r.n}問）</span></div><button type="button" class="btn sm sec pz" data-act="mTag" data-p="${pp.slice(1)}" data-t="${esc(tg)}">練習する</button></div>`; }).join(""):"",
    `まだデータが足りません（タグごとに${WEAK_MIN}問から表示されます）。`);
  // 時間の使い方（Part 5・6・7 の1問あたり）
  const tb={}; for(const k in st){ const x=+k.slice(1,k.indexOf("|")); if(x>=5){ const b=tb[x]||(tb[x]={n:0,ms:0}); b.n+=st[k].n; b.ms+=st[k].ms||0; } }
  const tgt={5:PART_SPEC[5].target({qs:[1]}), 7:PART_SPEC[7].target({qs:[1]})};
  const tEnough=SECTIONS.R.parts.some(x=>tb[x]&&tb[x].n>=WEAK_MIN);
  h+=tsec("time","時間の使い方",tEnough?`<table class="st"><tr><th>Part</th><th>1問あたり</th><th>目安</th></tr>`+SECTIONS.R.parts.map(x=>{ const b=tb[x];
      return `<tr><td>Part ${x}</td><td class="num">${b&&b.n>=WEAK_MIN?(b.ms/b.n/1000).toFixed(1)+"秒":`<span class="xs mut">データ不足（${WEAK_MIN}問から）</span>`}</td><td class="num">${tgt[x]?tgt[x]+"秒":"—"}</td></tr>`; }).join("")+`</table>`:"",
    `Part 5〜7 を解くと表示されます（Part ごとに${WEAK_MIN}問から）。`);
  // 単語
  const vs=vState(), started=Object.keys(vs).length>0;
  let vb="";
  if(started&&VOCAB.length){
    const lc=vLevelStats(vs), lg=loadJSON(K.vlog); let rn=0,rok=0; for(const k in lg){ rn+=lg[k].rn||0; rok+=lg[k].rok||0; }
    const next=[1,2,3,4,5,6,7].map(i=>{ let n=0; for(const id in vs) if(vs[id].d===t+i) n++; return n; });
    vb=`<div class="stack">`+V_LEVELS.map(lv=>{ const k=lc[lv]; return k.all?`<div class="vlrow"><b class="num">${V_LV[lv]}</b>${sbarHTML(k)}<span class="xs mut">${kText(k)}</span></div>`:""; }).join("")+`</div>`+
      `<p class="note glegend"><i class="sw ms"></i>習得　<i class="sw fx"></i>定着中　<i class="sw lr"></i>学習中　<i class="sw nw"></i>未着手</p>`+
      (rn?`<p class="sm">復習での正答率 <b class="num">${pct(rok,rn)}%</b>（${rn}問）</p>`:`<p class="sm mut" data-empty>復習での正答率：単語の復習（2回目からの出題）を解くと表示されます。</p>`)+
      `<p class="sm"><b>明日から7日の復習</b></p><table class="st nx"><tr><th>日</th>${next.map((_,i)=>`<th class="num">${dayDate(t+i+1).replace(/^\d+月|日$/g,"")}</th>`).join("")}</tr><tr><td>語数</td>${next.map(n=>`<td class="num">${n}</td>`).join("")}</tr></table>`;
  }
  h+=tsec("vocab","単語",vb,"単語を始めると表示されます（今日の1セットか、単語タブから）。");
  // 学習した日
  const days=studyDays(), w=weekInfo(days,t);
  h+=`<h2 class="sec-h">学習した日</h2><section class="card" data-sec="days">${statsHTML([[w.total,"累計"],[w.n,"今週"],[w.streak,"連続"]])}${calHTML(days,t)}`+
    (days.size?"":`<p class="sm mut" data-empty>1問でも解いた日に点がつきます（今日の欄は枠で示しています）。</p>`)+`</section>`;
  h+=`<p class="note">比べる相手は、これまでの自分だけです。記録は端末の中だけに保存しています。</p>`;
  Shell.render({tab:"today",top:subTop("記録"),body:h,keepScroll:re,noAnim:re,focus:!re});
  if(!re) fillBars();   // 棒が伸びるのは開いた最初の1回だけ
};

/* ===== 設定：学習の計画・記録を消す ===== */
function planSettingsHTML(){
  const p=profile(), pl=planFor(p,vState()), ex=p.exam||"";
  return `<h2 class="sec-h">学習の計画</h2><section class="card plain">`+
    `<div class="setrow"><b>目標スコア</b>${segHTML("target",TARGETS.map(x=>[x,TARGET_NAME(x)]).concat([["","未定"]]),p.target==null?"":p.target,"prof")}</div>`+
    `<div class="setrow"><b>受験日</b><div class="row"><input class="vsearch dt" type="date" min="${isoOf(today())}" value="${esc(ex)}" data-input="examDate" aria-label="受験日"><button type="button" class="btn sm sec pz" data-act="examClear" ${ex?"":"disabled"}>未定にする</button></div></div>`+
    `<div class="setrow"><b>1日の新しい語</b>${segHTML("newPerDay",nwOpts(p.newPerDay).map(n=>[n,n===pl.n?`${n}<small>おすすめ</small>`:String(n)]),p.newPerDay,"prof")}`+
    `<p class="note">${pl.msg||`おすすめは目標と受験日から出しています（受験日が未定なら10語）。`}</p></div></section>`;
}
/* 記録を消す：3つに分ける。購入（toeic_ent_v1）と設定（toeic_prefs_v1）は消さない */
const WIPE={
  stat:{label:"成績", ids:["stat","review","miss","seen","mockhist","day"], runs:true, what:"Part・タグ別の成績、解き直しの一覧、模試の結果と途中の回、学習した日"},
  vocab:{label:"単語の進み具合", ids:["vocab","vlog"], prof:["lvStart","lvDone"], what:"単語の箱と次に出る日、単語の学習日誌、段の記録"},
  all:{label:"すべての記録", ids:["stat","review","miss","seen","mockhist","day","vocab","vlog"], runs:true, prof:["lvStart","lvDone"], what:"成績と単語の進み具合のすべて（設定と購入は残ります）"}
};
function wipe(kind){
  const w=WIPE[kind]; if(!w) return;
  for(const id of w.ids) removeJSON(K[id]);
  if(w.runs) for(const k of Store.keys()) if(k.startsWith(K.mockrun+":")) removeJSON(k);
  if(w.prof){ const p=loadJSON(K.profile); w.prof.forEach(f=>{ delete p[f]; }); saveJSON(K.profile,p); }
}

/* ===== キー（実力チェック・まとめて確認）。処理したら true ===== */
function dailyKey(ev){
  const k=ev.key;
  if(Router.top()&&Router.top().name==="onboard"&&OB.step===3&&OB.pl&&!OB.pl.done){
    const n="1234".indexOf(k); if(n>=0){ ev.preventDefault(); plAnswer(n,document.querySelectorAll("#page .choice")[n]); return true; }
    if(k==="0"){ ev.preventDefault(); plAnswer(-1); return true; }
    return false;
  }
  if(CK&&Router.inSession()){
    const L=k.length===1?k.toLowerCase():k;
    if(k===" "){ const ae=document.activeElement; if(ae&&ae.matches&&ae.matches("button")&&!ae.classList.contains("ckcard")) return false; ev.preventDefault(); ckFlip(); return true; }
    if(k==="ArrowRight"){ ev.preventDefault(); ckAnswer(true); return true; }
    if(k==="ArrowLeft"){ ev.preventDefault(); ckAnswer(false); return true; }
    if(L==="z"){ ev.preventDefault(); ckUndo(); return true; }
    if(k==="Escape"){ ev.preventDefault(); ckEnd(); return true; }
  }
  return false;
}

/* ===== 操作 ===== */
const quit0=ACT.quit;
Object.assign(ACT,{
  quit:()=>{ if(CK){ ckEnd(); return; } quit0(); },
  setGo:()=>runSet(),
  vstep:d=>{ const lv=+d.lv; VS.open=VS.open===lv?0:lv; rerender(); refocus(`[data-act="vstep"][data-lv="${lv}"]`); },
  vlistLv:d=>{ VL.lv=+d.lv; VL.stt=""; VL.q=""; Router.go("vlist"); },
  msGo:d=>{ if(d.v==="next"&&MS.lv<LV_TOP) setProfile("curLv",MS.lv+1); const f=MS.then; MS={lv:0,then:null}; if(f) f(); },
  ckStart:d=>startCheck(+d.lv||0),
  ckFlip:()=>ckFlip(),
  ckAns:d=>ckAnswer(d.v==="1"),
  ckUndo:()=>ckUndo(),
  // はじめに
  obSkip:()=>{ if(OB.pl&&!OB.pl.done&&OB.pl.res.length){ const lv=placeLevel(OB.pl.res); setProfile("placedLv",lv); setProfile("curLv",lv); } obFinish(); Router.tab("today"); },
  obBack:()=>{ if(OB.step===4&&OB.pl) OB.pl.done=true; OB.step=Math.max(1,OB.step-1); OB.open=""; SCREENS.onboard(); },
  obTarget:d=>{ setProfile("target",d.v===""?null:+d.v); OB.picked=true; OB.step=2; SCREENS.onboard(); },
  obNoExam:()=>{ setProfile("exam",null); OB.step=3; SCREENS.onboard(); },
  obNext:()=>{ OB.step++; SCREENS.onboard(); },
  obLater:()=>{ OB.step=4; SCREENS.onboard(); },
  plStart:()=>plStart(),
  plAns:(d,el)=>plAnswer(+d.c,el),
  obOpen:d=>{ OB.open=OB.open===d.k?"":d.k; SCREENS.onboard(); refocus(`[data-act="obOpen"][data-k="${d.k}"]`); },
  obLv:d=>{ setProfile("curLv",+d.v); SCREENS.onboard(); refocus(`[data-act="obLv"][aria-pressed="true"]`); },
  obNw:d=>{ OB.nwSet=true; setProfile("newPerDay",+d.v); SCREENS.onboard(); refocus(`[data-act="obNw"][aria-pressed="true"]`); },
  obGo:()=>{ obFinish(); Router.tab("today"); runSet(); },
  obMock:d=>{ obFinish(); Router.tab("mock"); Router.go("mockprep",{n:+d.n}); },
  obAgain:()=>{ obReset(); Router.tab("onboard"); },
  // 記録・設定
  tsPer:d=>{ TS.per=d.v; rerender(); refocus(`[data-act="tsPer"][aria-pressed="true"]`); },
  examClear:()=>{ setProfile("exam",null); rerender(); },
  wipeAsk:()=>openSheet("wipedlg",`<h2 class="h h2" id="wipedlg-h">記録を消す</h2><p class="sm">消すものを選んでください。次の画面で、もう一度確かめます。</p>`+
    Object.keys(WIPE).map(k=>`<button type="button" class="btn sec pz col" data-act="wipePick" data-k="${k}">${WIPE[k].label}<small>${WIPE[k].what}</small></button>`).join("")+
    `<button type="button" class="btn pri pz" data-act="wipeClose">やめる</button>`),
  wipePick:d=>{ const w=WIPE[d.k]; const g=$("#wipedlg"); if(!g) return;
    g.innerHTML=`<h2 class="h h2" id="wipedlg-h">${w.label}を消しますか</h2><p class="sm">消えるもの：${w.what}。</p><p class="sm"><b>元にはもどせません。</b>購入は消えません。</p>`+
      `<button type="button" class="btn pri pz" data-act="wipeClose">やめる</button><button type="button" class="btn sec pz" data-act="wipeDo" data-k="${d.k}">${w.label}を消す</button>`; refocus('#wipedlg [data-act="wipeClose"]'); },
  wipeDo:d=>{ wipe(d.k); closeDlg("wipedlg"); rerender(); Shell.say(WIPE[d.k].label+"を消しました"); },
  wipeClose:()=>closeDlg("wipedlg")
});
Input.obExam=v=>{ setProfile("exam",v||null); };
Input.obExam4=v=>{ setProfile("exam",v||null); OB.nwSet=false; SCREENS.onboard(); refocus('[data-input="obExam4"]'); };
Input.examDate=v=>{ setProfile("exam",v||null); rerender(); refocus('[data-input="examDate"]'); };

const Daily={ between, milestone, planSettingsHTML, key:dailyKey, runSet, setChunks, weekInfo, studyDays, perDay, planFor, placeLevel, targetLv, weakPart, levelsDone, startCheck, ckAnswer, ckUndo, wipe, OB, get CK(){ return CK; } };
