/* ===== Lapis 模試（仮称） for the TOEIC® L&R Test — 本体 =====
   段階0（土台）＋段階1（解く画面）：セッションの枠、Player、解答後の解説の型、設問トレイ（Part 6・7）、解き直しの流れ、練習の量の選択。
   段階2（模試）は js/mock.js（時間割・自動保存と再開・目安のスコア・一覧／準備／結果の画面）。
   画面の仕様は ux/UX設計書.html、見た目は ux/ビジュアル案.html（紙と墨の答案）。 */
"use strict";
const APP_VERSION = "0.5.0";
const LET = ["A","B","C","D"];
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
const $ = s=>document.querySelector(s);
const today = ()=>dayNumber();

/* ===== Part ごとの違い（PART_SPEC）=====
   画面の関数は Part の番号で分岐せず、この表を引く。
   layout：single＝1問1画面（1・2・5）／multi＝1セットを1画面に並べる（3・4）／reader＝文書＋設問トレイ（6・7）
   abc：解答前は A B C（D）のボタンだけ（選択肢の文は音声で読まれる）
   size：標準の量（短い＝その半分）。est：練習の1単位の目安の秒数（解説を読む時間を含む・設計判断）。target：上の札の時間の目安
   qs：データの1件 → 設問の並び。segs：音声の組み立て（build.py の audio_plans と同じ順。行からの再生の推定に使う）
   script：解答後のスクリプト（行・和訳）。trans：和訳・要約（「訳を見る」）
   docTabs：文書の切り替え（Part 7 の複数文書）。doc(u,s)：読む領域の文書の HTML（s＝セッション：いまの設問・解答・文書）。blanks：文書の中に空所の札がある（Part 6） */
const qOne=(it,q)=>[{qid:it.id,num:it.num,tag:it.tag,q,c:it.c,a:it.a,e:it.e}];
const qSet=it=>(it.qs||[]).map((q,i)=>({qid:it.id+"."+(i+1),num:q.num,tag:q.tag,q:q.q||"",c:q.c,a:q.a,e:q.e,bi:i+1}));
const introText=r=>{ const qs=r.qs||[]; return `Questions ${qs[0]&&qs[0].num} through ${qs.length&&qs[qs.length-1].num} refer to the following ${r.intro||""}.`; };
/* 英文を文に分ける（Ms. や p.m. の後では切らない） */
function splitSentences(t){
  const out=[]; for(const s of String(t||"").split(/(?<=[.!?]["')]?)\s+(?=["'(]?[A-Z0-9])/)){
    if(out.length&&/\b(Mr|Ms|Mrs|Dr|St|No|a\.m|p\.m|Inc|Co|Ltd|U\.S)\.$/i.test(out[out.length-1])) out[out.length-1]+=" "+s; else out.push(s); }
  return out.filter(Boolean);
}
const PART_SPEC = {
  1:{name:"写真描写", unit:"問", size:6, audio:true, layout:"single", abc:true, est:()=>40,
     inst:"写真に最も合う説明を、音声を聞いて選びましょう", qs:it=>qOne(it,""),
     media:r=>`<img class="p1img" src="${esc(r.img)}" alt="Part 1 の写真" draggable="false">`,
     segs:r=>[{say:`Number ${r.num}.`},{sil:.8}].concat(...(r.c||[]).map((c,i)=>[{say:LET[i]+"."},{say:c,line:i},{sil:.4}])),
     script:r=>({lines:(r.c||[]).map((c,i)=>({lab:LET[i],en:c,ja:(r.ja||[])[i]||"",ok:i===r.a}))})},
  2:{name:"応答問題", unit:"問", size:10, audio:true, layout:"single", abc:true, est:()=>35,
     inst:"質問への応答として最もよいものを選びましょう", qs:it=>qOne(it,it.prompt),
     segs:r=>[{say:`Number ${r.num}.`},{say:r.prompt||"",line:0},{sil:.6}].concat(...(r.c||[]).map((c,i)=>[{say:LET[i]+"."},{say:c,line:i+1}])),
     script:r=>{ const j=r.ja||{}; return {lines:[{lab:"Q",en:r.prompt||"",ja:j.prompt||""}].concat((r.c||[]).map((c,i)=>({lab:LET[i],en:c,ja:(j.c||[])[i]||"",ok:i===r.a})))}; }},
  3:{name:"会話問題", unit:"セット", size:4, audio:true, layout:"multi", est:u=>60+35*u.qs.length,
     inst:"音声を聞いて、すべての設問に答えましょう", qs:qSet,
     segs:r=>[{say:introText(r)},{sil:1}].concat(...(r.lines||[]).map((l,i)=>[{say:l.t,line:i},{sil:.5}])),
     script:r=>({lines:(r.lines||[]).map((l,i)=>({lab:String(l.s||"").replace(/^F/,"W"),en:l.t,ja:(r.ja||[])[i]||""}))})},
  4:{name:"説明文問題", unit:"セット", size:4, audio:true, layout:"multi", est:u=>60+35*u.qs.length,
     inst:"音声を聞いて、すべての設問に答えましょう", qs:qSet,
     segs:r=>[{say:introText(r)},{sil:1}].concat(splitSentences(r.text).map((s,i)=>({say:s,line:i}))),
     script:r=>({lines:splitSentences(r.text).map((s,i)=>({lab:String(i+1),en:s,ja:""})), ja:r.ja||""})},
  5:{name:"短文穴埋め", unit:"問", size:10, layout:"single", est:()=>45, target:()=>20,
     qs:it=>qOne(it,it.q), qtext:q=>q.q.replace(/-{3,}/g,"_______"), trans:r=>r.ja||""},
  6:{name:"長文穴埋め", unit:"セット", size:2, layout:"reader", est:u=>60*u.qs.length, qs:qSet, trans:r=>r.sum||"", blanks:true,
     doc:(u,s)=>`<div class="doc-h">${esc(u.raw.doc||"")}</div><div class="doc" lang="en">${blankDocHTML(u,s)}</div>`},
  7:{name:"読解問題", unit:"セット", size:3, layout:"reader", est:u=>90*u.qs.length, target:u=>60*u.qs.length,
     qs:qSet, trans:r=>(r.sum||[]).map((s,i)=>(r.sum.length>1?`文書${i+1}：`:"")+s).join("\n"),
     docTabs:r=>r.docs||[],
     doc:(u,s)=>{ const d=(u.raw.docs||[])[s.dtab]||{}; return `<div class="doc-h"><span lang="en">${esc(d.type||"")}</span>${d.title?` ・ <span lang="en">${esc(d.title)}</span>`:""}</div><div class="doc" lang="en">${esc(d.text)}</div>`; }}
};
/* Part 6 の本文：{{n}} を空所の札（押すとその設問がトレイに出る）に置きかえる */
const NB=" ";
function blankLabel(q,on,done){ return `空所 ${q.num!=null?q.num:q.bi}${on?"、表示中":""}${done?"、解答ずみ":""}`; }
function blankDocHTML(u,s){
  const byBi={}; u.qs.forEach((q,i)=>{ byBi[q.bi]=i; });
  return esc(u.raw.text).replace(/\{\{(\d+)\}\}/g,(m,n)=>{
    const qi=byBi[+n]; if(qi==null) return `<span class="dblank off">${NB}${n}${NB}</span>`;
    const q=u.qs[qi], on=qi===s.qi, done=!!s.ans[q.qid];
    return `<span class="dblank pz${on?" cur":""}${done?" done":""}" role="button" tabindex="0" data-act="qi" data-i="${qi}" aria-label="${blankLabel(q,on,done)}">${NB}${q.num!=null?q.num:n}${NB}</span>`;
  });
}
const PARTS = [1,2,3,4,5,6,7];
const PART_NAME = Object.fromEntries(PARTS.map(p=>[p,PART_SPEC[p].name]));
/* セクション：リスニングとリーディング（模試の切り替え・時間） */
const SECTIONS = { L:{name:"リスニング", parts:[1,2,3,4]}, R:{name:"リーディング", parts:[5,6,7], minutes:75} };
const sectionOf = p=>SECTIONS.L.parts.includes(p)?"L":"R";
const READ_MIN = SECTIONS.R.minutes;
/* ===== モードごとの違い（MODE）=====
   feedback：1問ごとに正誤と解説を出す／review：解き直し（「解かずに解説を見る」・段階の表示）／lockAudio：音声は1回だけ（止める・もどす・速さなし）
   layer：Fx の層（模試は静か）／quit：左上のボタン／flag：⋯ に「この問題はおかしい」を出すか
   sections：リスニング→切り替え→リーディングの順に進む（リスニングはもどれない）／timed：時間割と制限時間があり、時間と音声は js/mock.js が持つ
   quitAsk：やめるときの確認の文言（空＝確認しない。模試は「中断」で、続きから再開できる） */
const MODE = {
  practice:{label:"練習",     layer:"expressive", feedback:true,  review:false, lockAudio:false, quit:"やめる", flag:true,  sections:false, timed:false, quitAsk:""},
  review:  {label:"解き直し", layer:"expressive", feedback:true,  review:true,  lockAudio:false, quit:"やめる", flag:true,  sections:false, timed:false, quitAsk:""},
  mock:    {label:"模試",     layer:"quiet",      feedback:false, review:false, lockAudio:true,  quit:"中断",   flag:false, sections:true,  timed:true,  quitAsk:"中断しますか。続きから再開できます。"}
};

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
  const dark=p.theme==="dark"||(p.theme!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  if(m) m.content=dark?"#181816":"#F6F2EA";
  Native.bars(dark);   // アプリ：上のバーの文字色
}

/* ===== 問題データ：MOCKS = DATA.mocks、unitsOf(n) が回ごとに unit を作って覚える =====
   unit＝1画面（Part2/5は1問、他はセット） */
let MOCKS=[]; const UNIT_CACHE={};
function buildUnits(mock){
  const U={};
  for(const p of PARTS) U[p]=(mock["part"+p]||[]).map(it=>({id:it.id,part:p,mock:mock.n,raw:it,qs:PART_SPEC[p].qs(it)}));
  return U;
}
function unitsOf(n){ if(!UNIT_CACHE[n]){ const m=MOCKS.find(x=>x.n===n); UNIT_CACHE[n]=m?buildUnits(m):{}; } return UNIT_CACHE[n]; }
/* 鍵つきの回（free:false）を使えるか。正は購入の状態（toeic_ent_v1。段階5でストアと結ぶ。解放したら invalidateUnits() を呼ぶ）。
   開発の確認用に、手元のサーバー（localhost・127.0.0.1）で ?unlock を付けたときだけ全回を開く。
   記録には何も書かず、公開先（Vercel・アプリの中）では効かないので、残しても害はない */
const DEV_UNLOCK = (()=>{ try{ return /[?&]unlock(\b|=|&|$)/.test(location.search)&&/^https?:$/.test(location.protocol)&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&!isNativeApp(); }catch(e){ return false; } })();
function unlockedAll(){ return DEV_UNLOCK||loadJSON(K.ent).unlocked===true; }
function mockOpen(m){ return !!m&&(!!m.free||unlockedAll()); }
function availableMocks(){ return MOCKS.filter(mockOpen); }
/* 練習で使える unit の一覧は、データか使える回が変わるまで同じなので覚えておく */
let PU_MEMO={}, UNIT_BY_ID=null;
function invalidateUnits(){ PU_MEMO={}; UNIT_BY_ID=null; for(const k in UNIT_CACHE) delete UNIT_CACHE[k]; }
function practiceUnits(p){ return PU_MEMO[p]||(PU_MEMO[p]=availableMocks().flatMap(m=>unitsOf(m.n)[p]||[])); }
function allUnitsFlat(){ return PARTS.flatMap(p=>practiceUnits(p)); }
function unitById(id){ if(!UNIT_BY_ID) UNIT_BY_ID=new Map(allUnitsFlat().map(u=>[u.id,u])); return UNIT_BY_ID.get(id); }
function qCount(p){ const k="q"+p; return PU_MEMO[k]!=null?PU_MEMO[k]:(PU_MEMO[k]=practiceUnits(p).reduce((s,u)=>s+u.qs.length,0)); }

/* ===== 日付 ===== */
const JWD="日月火水木金土";
/* dayNumber の日 → 「11月22日」（dayNumber は端末の時刻の0時を境にした通し番号） */
function dayDate(d){ const x=new Date(d*86400000); return `${x.getUTCMonth()+1}月${x.getUTCDate()}日`; }
function dayLabel(d,t){ const n=d-t; return n<=0?"今日":n===1?"明日":`${n}日後（${dayDate(d)}）`; }
function dayOf(s){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||""); return m?Math.floor(Date.UTC(+m[1],+m[2]-1,+m[3])/86400000):null; }

/* ===== 解き直し（UX設計書 3.5「誤答が出直す間隔」）=====
   段階 st：0（間違えた直後・当日から）→ 正解で1（翌日）→ 2（3日後）→ 3（7日後）→ 正解で一覧から外れる。どの段階でも間違えたら0（翌日）
   受験日が14日以内なら 3日後→2日後、7日後→4日後に縮める（仮の値：8.2-13） */
const REVIEW_GAP=[0,1,3,7], REVIEW_GAP_NEAR=[0,1,2,4], REVIEW_NEAR_DAYS=14, REVIEW_MAX=15;
function reviewGaps(t,examDay){ const n=examDay==null?null:examDay-t; return n!=null&&n>=0&&n<=REVIEW_NEAR_DAYS?REVIEW_GAP_NEAR:REVIEW_GAP; }
/* 次の記録（純粋な関数）。返り値：新しい記録／null＝一覧から外す／undefined＝変えない */
function reviewNext(r,ok,t,gaps){
  if(!ok) return {st:0, due:r?t+1:t, n:(r?r.n:0)+1};
  if(!r) return undefined;
  if(r.st>=3) return null;
  const st=r.st+1; return {st, due:t+(gaps||REVIEW_GAP)[st], n:r.n};
}
/* 読みこんだ記録（rv＝解き直し、m＝旧キー）に1問ぶんを当てる。保存は呼ぶ側が1回だけ行う */
function reviewApply(rv,m,qid,ok,t,gaps){
  const before=rv[qid]||null, after=reviewNext(before,ok,t,gaps);
  if(after===undefined) return {before,after};
  if(after===null) delete rv[qid]; else rv[qid]=after;
  // 旧キーも同じ意味で更新しておく（元の版にもどしても使えるように）
  if(ok){ if(m[qid]){ m[qid]--; if(m[qid]<=0) delete m[qid]; } } else m[qid]=(m[qid]||0)+1;
  return {before,after};
}
function reviewUpdate(qid,ok){
  const rv=loadJSON(K.review), m=loadJSON(K.miss), t=today();
  const res=reviewApply(rv,m,qid,ok,t,reviewGaps(t,dayOf(profile().exam)));
  if(res.after!==undefined){ saveJSON(K.review,rv); saveJSON(K.miss,m); }
  return res;
}
/* 「あとで解き直す」の印（正解した問題も一覧に入れられる。翌日から）。on=false で一覧から外す */
function reviewMark(qid,on){
  const rv=loadJSON(K.review), m=loadJSON(K.miss), t=today();
  if(on){ if(!rv[qid]) rv[qid]={st:0,due:t+1,n:0}; if(!m[qid]) m[qid]=1; }
  else { delete rv[qid]; delete m[qid]; }
  saveJSON(K.review,rv); saveJSON(K.miss,m);
}
/* 解答のあとに出す、次に出る日の一言 */
function scheduleMsg(res,t){
  if(!res) return "";
  const {before,after}=res;
  if(after===null) return "解き直しの一覧から外れました";
  if(after===undefined) return "";
  if(before&&after.st>before.st) return `次は${dayLabel(after.due,t)}に出します`;
  if(!before) return "解き直しの一覧に入れました（今日から出します）";
  return after.due<=t?"解き直しの一覧に入っています":`${dayLabel(after.due,t)}にもう一度出します`;
}
/* 期限の来た解き直し。qset を渡すと、期限に関係なくその問題だけ（結果画面の「間違えた◯問を解き直す」）
   unit は、出す設問だけに絞った写しを返す。最大 REVIEW_MAX 問（段階の低い順・間違えた回数の多い順に取る） */
function reviewPlan(qset,max){
  const rv=loadJSON(K.review), t=today(), all=[], lim=max||REVIEW_MAX;
  const want=q=>qset?qset.has(q.qid):!!(rv[q.qid]&&rv[q.qid].due<=t);
  for(const u of allUnitsFlat()){
    const qs=u.qs.filter(want); if(!qs.length) continue;
    const rs=qs.map(q=>rv[q.qid]).filter(Boolean);
    all.push({u:Object.assign({},u,{qs}), st:rs.length?Math.min(...rs.map(r=>r.st)):0, n:rs.length?Math.max(...rs.map(r=>r.n)):0});
  }
  all.sort((a,b)=>a.st-b.st||b.n-a.n);
  const total=all.reduce((s,x)=>s+x.u.qs.length,0), take=[]; let count=0;
  for(const x of all){ if(take.length&&count+x.u.qs.length>lim) break; take.push(x.u); count+=x.u.qs.length; }
  const units=prefs().reviewOrder==="part"?take.sort((a,b)=>a.part-b.part):shuffle(take);
  let next=null;
  if(!qset) for(const q in rv){ const d=rv[q].due; if(d>t&&unitById(q.replace(/\.\d+$/,""))){ if(!next||d<next.due) next={due:d,n:1}; else if(d===next.due) next.n++; } }
  return {units,total,count,rest:total-count,next};
}

/* ===== 解説の型（根拠・言い換え・ひっかけ）=====
   データの解説は「①根拠 ②言い換え ③主なひっかけ」の順の1つの文（SPEC.md）。区切りの印は無いので、
   1文目を根拠、ほかの選択肢を否定する文（〜ない／不適切／合わない…）から後をひっかけ、その間を言い換えとして分ける。
   データ側で {basis, para, trap} を持てばそれをそのまま使う */
const TRAP_RE=/ない[。、]?$|ない[。、]|ではな|不適|合わ[なず]|述べられ|書かれてい|すぎず|すぎな|誤り|ひっかけ|無関係|関係がな|当てはまらな|一致しな|異な[るり]|違う|あたらな|当たらな|取れな|置けな|使えな|できな/;
function explainParts(e){
  if(e&&typeof e==="object") return [["根拠",e.basis],["言い換え",e.para],["ひっかけ",e.trap]].filter(x=>x[1]);
  const s=(String(e||"").match(/[^。]+(?:。|$)/g)||[]).map(x=>x.trim()).filter(Boolean);
  if(s.length<=1) return [["根拠",s.join("")]].filter(x=>x[1]);
  const k=s.findIndex((x,i)=>i>0&&TRAP_RE.test(x));
  return [["根拠",s[0]],["言い換え",s.slice(1,k<0?s.length:k).join("")],["ひっかけ",k<0?"":s.slice(k).join("")]].filter(x=>x[1]);
}

/* ===== 記録 ===== */
/* 集計の {n, ok} を1つ数える（無ければ作る）。返り値に他の項目（ms・nw）を足してよい */
function tally(map,key,good){ const r=map[key]||(map[key]={n:0,ok:0}); r.n++; if(good) r.ok++; return r; }
/* 結果をまとめて記録する（模試の採点は200問を1回の読み書きで）。items = [{unit, q, ans}]。
   解かずに見た（peek）問題は記録しない。返り値は1問ごとの解き直しの変化（peek は null） */
function recordResults(items){
  const st=loadJSON(K.stat), rv=loadJSON(K.review), m=loadJSON(K.miss), t=today(), gaps=reviewGaps(t,dayOf(profile().exam));
  const dy=loadJSON(K.day), P={};   // その日の Part 別（記録の「直近30日」に使う）
  let changed=false;
  const out=items.map(({unit,q,ans})=>{
    if(ans&&ans.peek) return null;
    const ok=!!ans&&ans.pick===q.a, r=tally(st,"P"+unit.part+"|"+(q.tag||"-"),ok);
    r.ms=(r.ms||0)+((ans&&ans.ms)||0); changed=true;
    const pp=P[unit.part]||(P[unit.part]=[0,0]); pp[0]++; if(ok) pp[1]++;
    return reviewApply(rv,m,q.qid,ok,t,gaps);
  });
  if(changed){
    const de=dy[t]||(dy[t]={}), dp=de.P||(de.P={}); de.a=1;
    for(const p in P){ const x=dp[p]||(dp[p]=[0,0]); x[0]+=P[p][0]; x[1]+=P[p][1]; }
    saveJSON(K.stat,st); saveJSON(K.review,rv); saveJSON(K.miss,m); saveJSON(K.day,dy);
  }
  return out;
}
function recordResult(unit,q,ans){ return recordResults([{unit,q,ans}])[0]; }
function markSeen(units){ const s=loadJSON(K.seen); for(const u of [].concat(units)) s[u.id]=(s[u.id]||0)+1; saveJSON(K.seen,s); }
function flags(){ return loadJSON(K.flag); }
function toggleFlag(id){ const f=flags(), on=!f[id]; if(on) f[id]=Date.now(); else delete f[id]; saveJSON(K.flag,f);
  document.querySelectorAll(`[data-flagbtn][data-id="${CSS.escape(id)}"]`).forEach(b=>{ b.setAttribute("aria-pressed",on); b.innerHTML=flagInner(on); }); }
function flagInner(on){ return icon(on?"flagOn":"flag","s")+(on?"報告済み（取り消す）":"この問題はおかしい"); }
function flagBtn(id,cls){ const on=!!flags()[id];
  return `<button type="button" class="${cls||"btn sm sec"} pz" data-act="flag" data-id="${esc(id)}" data-flagbtn aria-pressed="${on}">${flagInner(on)}</button>`; }

/* ===== 音声（単語・行からの再生は Player を通す） ===== */
function playAudio(src){ Player.load(src,{autoplay:true}); }

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
const markSvg=ok=>`<svg class="cm" viewBox="0 0 24 24" aria-hidden="true">${ok?MARK_OK:MARK_NG}</svg>`;
/* 下の階層の上のバー。close=true で「×閉じる」（結果の画面）、ほかは「＜もどる」 */
function subTop(title,close){
  return `<div class="topbar"><button type="button" class="iconbtn pz" data-act="${close?"close":"back"}" aria-label="${close?"閉じる":"もどる"}">${icon(close?"x":"back")}</button><div class="t"><b>${esc(title)}</b></div></div>`;
}
/* 設定の入口：4つのタブの右上に同じ位置で置く */
const gearBtn=()=>`<button type="button" class="iconbtn pz" data-act="nav" data-to="settings" aria-label="設定">${icon("gear")}</button>`;
function tabTop(title,right){ return `<div class="topbar gl"><div class="t"><b class="h" style="font-size:1.0625rem">${esc(title)}</b></div>${right||""}${gearBtn()}</div>`; }
function barHTML(v,attrs){ return `<div class="bar"${attrs?" "+attrs:""}><i style="--v:${v}"></i></div>`; }
/* セッションの上のバー：やめる／見出し＋進み具合／札（時間など）／右のボタン（模試の「一覧」）／その他（⋯） */
function sessionTop(label,i,n,extra,quitLabel,menu,right){
  const mb=menu?`<div class="menuw"><button type="button" class="iconbtn pz" data-act="menu" aria-haspopup="true" aria-expanded="false" aria-controls="menu" aria-label="その他">${icon("more")}</button><div class="menu" id="menu" hidden></div></div>`:"";
  return `<div class="topbar ses"><button type="button" class="iconbtn lab pz" data-act="quit" aria-label="${quitLabel||"やめる"}">${icon("x","s")}<span aria-hidden="true">${quitLabel||"やめる"}</span></button>`+
    `<div class="t"><div class="tl"><b>${label}</b>${extra?`<span class="tchips">${extra}</span>`:""}</div>${barHTML(n?i/n:0,`role="progressbar" aria-label="進み具合" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}"`)}</div>${right||""}${mb}</div>`;
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
function transHTML(t,label){ return t?`<details class="trans" data-trans><summary class="pz">${label||"訳を見る"}</summary><p class="ja">${esc(t).replace(/\n/g,"<br>")}</p></details>`:""; }
function graphicHTML(g){
  const rows=g.rows||[]; if(!rows.length) return "";
  return `<div class="gr-t">${esc(g.title||"")}</div><div class="tblw"><table class="gr" lang="en">`+rows.map((r,i)=>"<tr>"+r.map(c=>i?`<td>${esc(c)}</td>`:`<th>${esc(c)}</th>`).join("")+"</tr>").join("")+"</table></div>";
}

/* ===== セッション（練習・解き直し・模試） =====
   S = {mode, M:MODE[mode], label, units, i（いまの unit）, qi（いまの設問）, ans:{qid:{pick, ms, peek?}}, sched:{qid:次に出る日の一言},
        played（最初の再生を自分で押した）, dtab・dscroll（文書の切り替えとスクロール位置）, stage（トレイの段階）, view} */
let S=null, TIMER=null;
function clearTimer(){ if(TIMER){ clearInterval(TIMER); TIMER=null; } }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickOne(a){ return a[Math.floor(Math.random()*a.length)]; }   // pick() は解答の処理なので別の名前
function endSession(){ clearTimer(); if(S&&S.M.timed) Mock.end(); Player.stop(); Tray.off(); closeMenu(); S=null; }
/* やめるときの確認（MODE.quitAsk）は Mock.guard が受け持つ（ブラウザ・Android の「もどる」も同じ） */
function enterQuiz(){ Router.session({ leave:endSession, guard:()=> !(S&&S.M.quitAsk) || Mock.guard() }); }
function newSession(mode,units,extra){
  return Object.assign({mode, M:MODE[mode], label:MODE[mode].label, units, i:0, qi:0, ans:{}, sched:{}, played:false, dtab:0, dscroll:{}, stage:null, view:"unit"}, extra||{});
}
const cur=()=>S.units[S.i];
const specOf=u=>PART_SPEC[u.part];
const isReader=u=>specOf(u).layout==="reader";
function firstOpen(u){ return u.qs.findIndex(q=>!S.ans[q.qid]); }
function unitDone(u){ return u.qs.every(q=>S.ans[q.qid]); }

/* 練習：amt = short（標準の半分）| std（PART_SPEC.size）| all（全部・番号順）。tag でしぼれる */
function practiceSize(p,amt,avail){ const s=PART_SPEC[p].size; return Math.min(avail, typeof amt==="number"?amt:amt==="all"?avail:amt==="short"?Math.max(1,Math.ceil(s/2)):s); }   // amt が数なら、その数（今日の1セットの弱点）
function practicePool(p,tag){ const all=practiceUnits(p); return tag?all.filter(u=>u.qs.some(q=>q.tag===tag)):all; }
/* extra：セッションに足す項目（今日の1セットのかたまりは {set:"p"}） */
function startPractice(part,amt,tag,extra){
  let units=practicePool(part,tag); if(!units.length) return false;
  if(amt!=="all"){ const seen=loadJSON(K.seen); units=shuffle(shuffle(units).sort((a,b)=>(seen[a.id]||0)-(seen[b.id]||0)).slice(0,practiceSize(part,amt,units.length))); }   // まだ解いていない問題を先に
  enterQuiz(); S=newSession("practice",units,extra); showUnit(); return true;
}
function startReview(qids,max,extra){
  const plan=reviewPlan(qids?new Set(qids):null,max); if(!plan.units.length) return false;
  enterQuiz(); S=newSession("review",plan.units,extra); showUnit(); return true;
}
/* 1画面（unit）を描く。opt.qi＝最初に出す設問、opt.keep＝描き直しだけ（時間・答え・トレイの段階を保つ）
   模試（M.timed）では、音声と時間・上のバー・下のバーを Mock が持つ（画面を描きかえても音声は止めない：先読みのため） */
function showUnit(opt){
  opt=opt||{};
  const M=S.M, own=M.timed;
  clearTimer(); if(!own) Player.stop(); Tray.off(); closeMenu();
  const u=cur(), r=u.raw, sp=specOf(u), reader=isReader(u);
  S.view="unit";
  if(!opt.keep){ S.t=S.ut=Date.now(); const o=firstOpen(u); S.qi=opt.qi!=null?opt.qi:Math.max(0,o); S.dtab=0; S.dscroll={}; }
  const qnums=u.qs.map(q=>q.num).filter(x=>x!=null);
  const nr=qnums.length?`<span class="qno">${qnums.length>1?qnums[0]+"–"+qnums[qnums.length-1]:qnums[0]}</span>`:"";
  let body;
  if(reader) body=readerHTML(u);
  else {
    const lead=(sp.inst?`<p class="inst">${nr}${sp.inst}</p>`:"")+(sp.media?sp.media(r):"")+(r.graphic?graphicHTML(r.graphic):"");
    body=(lead?`<div class="card">${lead}</div>`:"")+`<div id="qs" class="stack"></div><div id="extra" class="stack"></div>`;
  }
  const top=own?Mock.topHTML(u):sessionTop(`${esc(S.label)} ・ Part ${u.part} <span class="num mut w5">${S.i+1}/${S.units.length}</span>`,S.i,S.units.length,'<span class="chip ol num" id="tm"></span>',M.quit,true)+
    (sp.audio?Player.bandHTML({mode:M}):"");
  if(own) body=Mock.bodyHTML(u)+body;
  Shell.render({layer:M.layer,tabs:false,fixed:reader,wide:reader,top,body,noAnim:!!opt.keep,focus:!opt.keep});
  if(sp.audio&&!own){ Player.bind(); Player.load(r.audio,{mode:M, autoplay:S.played&&!!prefs().autoplay}); }
  if(reader) paintDoc();
  paintQs();
  if(reader) Tray.mount($("#reader"),{stage:S.stage, mode:M, onChange:onTrayStage});
  if(own){ Mock.afterRender(u); return; }
  // 時間の札：要素と文字の節を覚えておき、tick では変わったときだけ書く
  const tmEl=$("#tm"), txt=document.createTextNode("");
  tmEl.innerHTML=icon("clock","s"); tmEl.appendChild(txt); tmEl.setAttribute("aria-label","この問題の経過時間");
  S.tk={tm:tmEl,txt,last:{}};
  tick(); if(!(M.feedback&&unitDone(u))) TIMER=setInterval(tick,500);
}
function onTrayStage(to){ if(S) S.stage=to; Shell.say(to==="s"?"文書を表示":"設問を表示"); }

/* --- Part 6・7：文書＋設問トレイ（5.4）。DOM の順＝読み上げの順：文書の切り替え → 文書 → つまみ → 設問 → 選択肢 --- */
function readerHTML(u){
  const sp=specOf(u), docs=sp.docTabs?sp.docTabs(u.raw):[];
  const sw=docs.length>1?`<div class="dsw" role="group" aria-label="文書の切り替え">`+docs.map((d,i)=>`<button type="button" class="btn sm sec pz" data-act="dtab" data-i="${i}" aria-pressed="${i===S.dtab}">${i+1} <span lang="en">${esc(d.type||"")}</span></button>`).join("")+`</div>`:"";
  return `<div class="reader" id="reader"><div class="dpane">${sw}<div class="docs" id="docs" tabindex="0" role="region" aria-label="文書"></div></div>`+
    `<section class="tray" id="tray" aria-label="設問"><div class="tray-h"><i class="grab" aria-hidden="true"></i><div class="qtabs" id="qtabs" role="group" aria-label="設問の番号"></div>`+
    `<button type="button" class="iconbtn pz tray-t" data-act="trayToggle" aria-controls="trayb" aria-expanded="true" aria-label="設問をたたむ">${icon("down")}</button></div>`+
    `<button type="button" class="tray-peek pz" id="traypeek" data-act="trayOpen"></button><div class="tray-b" id="trayb"></div></section></div>`;
}
function paintDoc(){
  const u=cur(), sp=specOf(u), el=$("#docs"); if(!el) return;
  const y=el.scrollTop;
  el.innerHTML=sp.doc(u,S)+(S.M.feedback&&unitDone(u)?transHTML(sp.trans(u.raw),"要約（日本語）を見る"):"");
  el.scrollTop=y;
}
/* Part 6 の空所：いまの設問・解答ずみの印だけを付けかえる（文書を描き直さない＝スクロールと文字の選択を保つ） */
function paintBlanks(){
  const u=cur(); if(!specOf(u).blanks) return;
  document.querySelectorAll("#docs .dblank[data-i]").forEach(el=>{
    const qi=+el.dataset.i, q=u.qs[qi], on=qi===S.qi, done=!!S.ans[q.qid];
    el.classList.toggle("cur",on); el.classList.toggle("done",done);
    el.setAttribute("aria-label",blankLabel(q,on,done));
  });
}
/* 設問の番号の札。模試の「あとで見直す」の印（S.mark）は角の印＋名前で示す */
function qchipHTML(u,q,i){
  const a=S.ans[q.qid], fb=S.M.feedback&&a&&!a.peek, ok=fb&&a.pick===q.a, n=q.num!=null?q.num:i+1, mk=!!(S.mark&&S.mark[q.qid]);
  const st=!a?"未解答":a.peek?"解説を表示ずみ":fb?(a.pick<0?"わからない":ok?"正解":"不正解"):"解答ずみ";
  return `<button type="button" class="qchip pz${a?" done":""}${fb?(ok?" ok":" ng"):""}${mk?" marked":""}" data-act="qi" data-i="${i}" aria-current="${i===S.qi}" aria-label="設問 ${n}、${st}${mk?"、あとで見直す":""}">`+
    `<span class="num">${n}</span>${fb?markSvg(ok):""}</button>`;
}
function paintTray(){
  const u=cur(), q=u.qs[S.qi]||u.qs[0], wide=Tray.isWide();
  $("#qtabs").innerHTML=u.qs.map((x,i)=>qchipHTML(u,x,i)).join("");
  const pv=u.part===6?`空所 ${q.bi}　4つから選ぶ`:q.q;
  const pk=$("#traypeek"); pk.innerHTML=`<span class="qno">${q.num!=null?q.num:""}</span><span${u.part===6?"":' lang="en"'}>${esc(pv)}</span>`; pk.setAttribute("aria-label",`設問 ${q.num!=null?q.num:""} を広げる`);
  const b=$("#trayb"), y=b.scrollTop;
  const rv=loadJSON(K.review);   // 「あとで解き直す」の状態：1回だけ読む
  b.innerHTML=wide?u.qs.map((x,i)=>qCardHTML(u,x,i,true,rv)).join(""):qCardHTML(u,q,S.qi,true,rv);
  b.scrollTop=wide?y:0;
}
/* 設問を替える（番号の札・空所・前へ／次へ）。how="chip" なら小のトレイを広げる */
function setQi(i,how){
  const u=cur(); if(!u||i<0||i>=u.qs.length) return;
  S.qi=i; S.t=Date.now();
  paintTray(); paintBlanks(); paintNav(u);
  if(S.M.timed) Mock.onMove();
  if(how==="chip"&&!Tray.isWide()) Tray.expand();
  if(Tray.isWide()){ const c=document.querySelector(`#trayb [data-qcard="${CSS.escape(u.qs[i].qid)}"]`); if(c) c.scrollIntoView({block:"nearest",behavior:Fx.reduced()?"auto":"smooth"}); }
  else Tray.refresh();
}

/* --- 設問1つ分（判定 → スクリプト → 解説 → あとで解き直す の順：3.3） --- */
function qCardHTML(u,q,qi,inTray,rv){
  const sp=specOf(u), M=S.M, a=S.ans[q.qid], shown=M.feedback&&!!a;
  const qn=q.num!=null?`<span class="qno">${q.num}</span>`:"";
  let head;
  if(u.part===6) head=`<p class="qtext">${qn}空所 ${q.bi}</p>`;
  else if(sp.abc) head=shown?"":`<p class="sm mut">${LET.slice(0,q.c.length).join("・")} から選ぶ</p>`;   // 番号は上の指示文に出している
  else head=`<p class="qtext">${qn}<span lang="en">${esc(sp.qtext?sp.qtext(q):q.q)}</span></p>`;
  const hap=M.feedback?"none":"select";
  const ch=`<div class="choices${sp.abc?" abc":""}" role="group" aria-label="${q.num!=null?"設問 "+q.num+" の":""}選択肢">`+q.c.map((c,ci)=>{
    let st=""; if(shown){ if(ci===q.a) st="is-ok"; else if(a.pick===ci) st="is-ng"; } else if(a&&a.pick===ci) st="sel";
    const label=sp.abc?LET[ci]+(st==="is-ok"?"、正解":st==="is-ng"?"、選んだ答え":st==="sel"?"、選択中":""):null;
    return choiceHTML({act:"pick",data:{q:q.qid,c:ci},letter:LET[ci],state:st,disabled:shown,hap,label,inner:sp.abc?"":`<span class="ct" lang="en">${esc(c)}</span>`});
  }).join("")+`</div>`;
  const peek=!a&&M.review?`<div><button type="button" class="btn ghost sm pz peekb" data-act="peek" data-q="${esc(q.qid)}">解かずに解説を見る</button></div>`:"";
  const after=shown?`<div class="stack after">${verdictFor(q,a)}${sp.layout==="single"?unitScript(u):""}${explainHTML(q.e)}${markBtn(q,rv)}</div>`:"";
  return `<div class="card qcard${inTray?" plain":""}" data-qcard="${esc(q.qid)}">${head}${ch}${peek}${after}</div>`;
}
function verdictFor(q,a){
  const msg=S.sched[q.qid]||"", right=`${LET[q.a]}${q.c[q.a]?`　<span lang="en">${esc(q.c[q.a])}</span>`:""}`;
  const tag=q.tag?`<span class="tag">${esc(q.tag)}</span>`:"", tail=msg?`<br>${esc(msg)}`:"";
  if(a.peek) return verdict("neutral","解説を表示しました",`正解 ${right}<br>解かずに見た問題は、段階が進みません`);
  if(a.pick<0) return verdict("neutral","答えを確認",`正解 ${right}${tag}${tail}`);
  if(a.pick===q.a) return verdict("ok",S.M.review?"解けました":"正解",`正解 ${right}${tag}${tail}`);
  let h=verdict("ng","不正解",`正解 ${right}${tag}${tail}`);
  if(S.M.review) h+=`<dl class="cmp"><div class="ng"><dt>${markSvg(false)}選んだ答え</dt><dd>${LET[a.pick]}　<span lang="en">${esc(q.c[a.pick])}</span></dd></div>`+
    `<div class="ok"><dt>${markSvg(true)}正解</dt><dd>${LET[q.a]}　<span lang="en">${esc(q.c[q.a])}</span></dd></div></dl>`;
  return h;
}
function explainHTML(e){ return `<div class="ex">`+explainParts(e).map(([h,t])=>`<div class="ex-s"><b class="ex-h">${h}</b><p>${esc(t)}</p></div>`).join("")+`</div>`; }
function markInner(on){ return icon("redo","s")+(on?"解き直しの一覧に入っています":"あとで解き直す"); }
function markBtn(q,rv){ const on=!!(rv||loadJSON(K.review))[q.qid]; return `<div><button type="button" class="btn sm sec pz" data-act="rvmark" data-q="${esc(q.qid)}" aria-pressed="${on}">${markInner(on)}</button></div>`; }
/* スクリプト（Part 1〜4。行を押すとその行から再生、和訳は「訳を見る」）／和訳（Part 5） */
function unitScript(u){
  const sp=specOf(u);
  if(sp.script){
    const sc=sp.script(u.raw);
    return `<div class="script" data-script><div class="script-h"><b>スクリプト</b><button type="button" class="btn sm ghost pz" data-act="trans" aria-pressed="false">訳を見る</button></div><ol class="slines">`+
      sc.lines.map((l,i)=>`<li><button type="button" class="sline pz" data-act="pline" data-k="${i}"><span class="vh">この行から再生：</span><span class="lab num">${esc(l.lab)}</span><span class="en" lang="en">${esc(l.en)}</span>${l.ok?`<span class="okm">${markSvg(true)}<span class="vh">正解</span></span>`:""}</button>${l.ja?`<p class="ja">${esc(l.ja)}</p>`:""}</li>`).join("")+
      `</ol>${sc.ja?`<p class="ja">${esc(sc.ja)}</p>`:""}</div>`;
  }
  return sp.trans?transHTML(sp.trans(u.raw)):"";
}
function paintQs(){
  const u=cur();
  if(isReader(u)) paintTray();
  else { const rv=loadJSON(K.review); $("#qs").innerHTML=u.qs.map((q,qi)=>qCardHTML(u,q,qi,false,rv)).join(""); paintExtra(u); }
  paintNav(u);
}
/* 解いたカードだけを描き直す（ほかのカードの状態・焦点はそのまま） */
function paintCard(u,q){
  const old=document.querySelector(`#qs [data-qcard="${CSS.escape(q.qid)}"]`); if(!old){ paintQs(); return; }
  const fc=old.contains(document.activeElement)?document.activeElement.dataset.c:null;
  old.outerHTML=qCardHTML(u,q,u.qs.indexOf(q));
  if(fc!=null){ const b=document.querySelector(`#qs .choice[data-q="${CSS.escape(q.qid)}"][data-c="${fc}"]`); if(b&&!b.disabled) try{ b.focus({preventScroll:true}); }catch(e){} }
}
/* セットを解き終えたあとのスクリプト（Part 3・4） */
function paintExtra(u){
  const el=$("#extra"); if(!el) return;
  el.innerHTML=S.M.feedback&&specOf(u).layout==="multi"&&unitDone(u)?`<div class="card">${unitScript(u)}</div>`:"";
}
/* 下のバー。練習・解き直しでは、解答する前に「次へ」を出さない（3.3）。代わりに「わからない」 */
function canAdvance(u){
  if(!S.M.feedback) return true;
  return isReader(u)?!!S.ans[(u.qs[S.qi]||{}).qid]:unitDone(u);
}
function keyQ(u){ if(isReader(u)) return u.qs[S.qi]; const o=firstOpen(u); return u.qs[o>=0?o:(S.M.feedback?-1:u.qs.length-1)]; }
/* 模試で1つ前の unit にもどれるか（リーディングの中だけ：3.4(d)） */
function canBackUnit(u){ return S.i>0&&sectionOf(S.units[S.i-1].part)==="R"&&sectionOf(u.part)==="R"; }
function nextLabel(u){
  const last=S.i===S.units.length-1;
  if(isReader(u)){ if(S.qi<u.qs.length-1) return "次の設問"; if(S.M.feedback&&!unitDone(u)) return "未解答の設問へ"; }
  return last?(S.M.feedback?"結果を見る":"解答を終える"):"次へ";
}
function paintNav(u){
  const reader=isReader(u);
  let nav="";
  if(S.M.timed) nav=Mock.navHTML(u);
  else if(!S.M.feedback){
    const canPrev=(reader&&S.qi>0)||canBackUnit(u);
    nav=`${canPrev?`<button type="button" class="btn sec pz" data-act="prev">${icon("back","s")}前へ</button>`:""}<button type="button" class="btn pri pz" data-act="next">${nextLabel(u)}</button>`;
  } else {
    const prev=reader&&S.qi>0?`<button type="button" class="btn sec pz nav-s" data-act="prev" aria-label="前の設問">${icon("back","s")}<span aria-hidden="true">前の設問</span></button>`:"";
    if(canAdvance(u)) nav=prev+`<button type="button" class="btn pri pz" data-act="next">${nextLabel(u)}</button>`;
    else { const q=keyQ(u); nav=prev+`<button type="button" class="btn sec pz" data-act="unknown" data-q="${esc(q.qid)}" data-hap="none">わからない${q.num!=null&&u.qs.length>1?`<small class="num">　${q.num}</small>`:""}</button>`; }
  }
  Shell.setBottom(nav);
}
/* 解答。viaKey＝キーで選んだ（次の未解答へ焦点を移す） */
function pick(qid,ci,viaKey){
  if(!S||S.view!=="unit") return; const u=cur(), q=u.qs.find(x=>x.qid===qid); if(!q) return;
  const M=S.M, now=Date.now();
  if(M.feedback&&S.ans[qid]) return;
  const prev=S.ans[qid];
  if(!M.feedback&&prev&&prev.pick===ci&&ci>=0){ delete S.ans[qid]; repaintAfter(u,q,false); return; }   // 模試：同じ選択肢をもう一度押すと未解答にもどす（M5）
  S.ans[qid]={pick:ci,ms:(prev?prev.ms:0)+(now-S.t)}; S.t=now;
  S.qi=u.qs.indexOf(q);
  const done=M.feedback&&unitDone(u);
  if(M.feedback){ S.sched[qid]=scheduleMsg(recordResult(u,q,S.ans[qid]),today()); if(done){ markSeen(u); clearTimer(); tick(); } }
  repaintAfter(u,q,done);
  const sel=c=>document.querySelector(`[data-qcard="${CSS.escape(qid)}"] .choice[data-c="${c}"]`);
  if(M.feedback){
    const ok=ci===q.a;
    Fx.mark(sel(q.a),true); if(ci>=0&&!ok) Fx.mark(sel(ci),false);
    if(ci>=0){ Fx.haptic(ok?"correct":"wrong"); Fx.sound(ok?"correct":"wrong"); }
    const af=document.querySelector(`[data-qcard="${CSS.escape(qid)}"] .after`); Fx.reveal(af);
    const vb=af&&af.querySelector(".bnr"); if(vb) try{ vb.scrollIntoView({block:"nearest",behavior:Fx.reduced()?"auto":"smooth"}); }catch(e){}
    if(viaKey&&!isReader(u)){ const o=firstOpen(u); if(o>=0) refocus(`[data-qcard="${CSS.escape(u.qs[o].qid)}"] .choice`); }
  } else Fx.select(sel(ci));
}
/* 解かずに解説を見る（解き直しの逃げ道）。記録しない＝段階は進まない */
function peek(qid){
  if(!S) return; const u=cur(), q=u.qs.find(x=>x.qid===qid); if(!q||S.ans[qid]) return;
  S.ans[qid]={pick:-1,peek:true,ms:Date.now()-S.t}; S.qi=u.qs.indexOf(q);
  const done=unitDone(u); if(done){ markSeen(u); clearTimer(); tick(); }
  repaintAfter(u,q,done);
}
function repaintAfter(u,q,done){
  if(isReader(u)){ paintTray(); if(done) paintDoc(); else paintBlanks(); Tray.refresh(); }
  else { paintCard(u,q); if(done) paintExtra(u); }
  paintNav(u);
  if(S.M.timed) Mock.onAnswer(u);
}
/* 次へ（下のバー・Enter・→）：トレイでは同じセットの次の設問 → 未解答の設問 → 次の unit */
function advance(){
  const u=cur(); if(!canAdvance(u)) return;
  if(S.M.sections&&sectionOf(u.part)==="L"){ Mock.next(); return; }   // リスニングの「次へ」は時間割が決める（先読み）
  if(isReader(u)){
    if(S.qi<u.qs.length-1){ setQi(S.qi+1); return; }
    if(S.M.feedback){ const o=firstOpen(u); if(o>=0){ setQi(o); return; } }
  }
  if(S.i===S.units.length-1){ if(S.M.feedback){ S.complete=true; finishPractice(); } else Mock.finish(false); return; }
  go(1);
}
function retreat(){
  const u=cur();
  if(isReader(u)&&S.qi>0){ setQi(S.qi-1); return; }
  if(!S.M.feedback&&canBackUnit(u)) go(-1);
}
function go(d){
  const u=cur();
  if(specOf(u).audio) S.played=true;   // 1つ聞き終えたら、次からは自動で再生（設定で切れる）
  S.i=Math.max(0,Math.min(S.units.length-1,S.i+d));
  showUnit({qi:d<0?cur().qs.length-1:undefined});
}
function tick(){
  if(!S||S.view!=="unit") return; const u=cur(), k=S.tk; if(!u||!k) return;
  const put=(key,v,apply)=>{ if(k.last[key]!==v){ k.last[key]=v; apply(v); } };   // 前と同じなら書かない
  const el_ms=Date.now()-S.ut, tg=specOf(u).target, target=tg?tg(u):0;
  put("t",target?`${fmt(el_ms)} / 目安 ${fmt(target*1000)}`:fmt(el_ms),v=>{ k.txt.data=v; });
  put("c","chip num "+(target&&el_ms>target*1000?"warn":"ol"),v=>{ k.tm.className=v; });
}

/* --- その他（⋯）：この問題はおかしい／キーの一覧 --- */
function closeMenu(){ const m=$("#menu"); if(m&&!m.hidden){ m.hidden=true; const b=document.querySelector('[data-act="menu"]'); if(b) b.setAttribute("aria-expanded","false"); } }
function openMenu(btn){
  const m=$("#menu"); if(!m) return;
  if(!m.hidden){ closeMenu(); return; }
  let h="";
  if(S&&S.M.flag&&S.view==="unit") h+=flagBtn(cur().id,"mi");
  h+=`<button type="button" class="mi pz" data-act="qset">${icon("gear","s")}表示の設定</button>`;
  h+=`<button type="button" class="mi pz" data-act="keys">${icon("keys","s")}キーの一覧</button>`;
  m.innerHTML=h; m.hidden=false; btn.setAttribute("aria-expanded","true");
  refocus("#menu button");
}
document.addEventListener("click",e=>{ const m=$("#menu"); if(m&&!m.hidden&&!e.target.closest(".menuw")) closeMenu(); },true);
const KEY_HELP=[["1〜4／A〜D","選択肢を選ぶ"],["0","わからない（練習・解き直し）"],["Enter／→","次へ（解答のあと）"],["Space","再生・一時停止（Part 1〜4。模試では使えません）"],["←","5秒もどる（Part 1〜4）／前の設問（Part 6・7）"],
  ["S","スクリプト・訳を開く"],["T","設問トレイの上げ下げ（Part 6・7）"],["F","あとで見直す の印（模試のリーディング）"],["G","解答状況の一覧（模試のリーディング）"],["Esc","やめる（模試は中断）"],["?","この一覧"]];
function closeDlg(id){ const d=$("#"+id); if(d) try{ d.close(); }catch(e){ d.removeAttribute("open"); } }
/* 1枚のシート（<dialog class="sheet">）に中身を入れて開く。Esc で閉じる（ブラウザに任せる） */
function openSheet(id,html){
  closeMenu();
  let d=$("#"+id); if(!d){ d=document.createElement("dialog"); d.id=id; d.className="sheet"; d.setAttribute("aria-labelledby",id+"-h"); document.body.appendChild(d); }
  d.innerHTML=html;
  try{ d.showModal(); }catch(e){ d.setAttribute("open",""); }
  return d;
}
function showKeys(){
  openSheet("keysdlg",`<h2 class="h h2" id="keysdlg-h">キーの一覧</h2><table class="st keys">`+KEY_HELP.map(([k,v])=>`<tr><th scope="row"><kbd>${esc(k)}</kbd></th><td>${esc(v)}</td></tr>`).join("")+`</table>`+
    `<p class="note">単語特訓・実力チェック：1〜4で解答、0でわからない、Enterで次へ。まとめて確認：Spaceでめくる、→ 知ってる、← まだ、Z 1つもどす。今日・模試・練習・単語の画面：1〜4でタブ、Enterで主ボタン</p><button type="button" class="btn sec pz" data-act="keysClose">閉じる</button>`);
}
/* 解いている途中の「表示の設定」：解答・時間・音声は止めずに、見え方だけ変える */
function quickSetHTML(){
  const p=prefs(), reader=!!(S&&S.view==="unit"&&cur()&&isReader(cur()));
  return `<h2 class="h h2" id="qsetdlg-h">表示の設定</h2>`+
    `<div class="setrow"><b>文字の大きさ</b>${segHTML("text",OPT_TEXT,p.text,"qpref")}</div>`+
    `<div class="setrow"><b>外観</b>${segHTML("theme",OPT_THEME,p.theme,"qpref")}</div>`+
    (reader?`<div class="setrow"><b>Part 6・7 の設問</b>${segHTML("tray",OPT_TRAY,p.tray,"qpref")}</div>`:"")+
    `<button type="button" class="btn sec pz" data-act="qsetClose">閉じる</button>`;
}
function showQuickSet(){ openSheet("qsetdlg",quickSetHTML()); }
function toggleScript(){
  const root=(cur()&&isReader(cur()))?$("#reader"):$("#page"); if(!root) return;
  const b=root.querySelector('[data-act="trans"]'); if(b){ b.click(); return; }
  const d=root.querySelector("details[data-trans]"); if(d) d.open=!d.open;
}
/* セッション中のキー（P2・M5）。焦点がボタンなどにあるときの Enter・Space はその部品に任せる */
function sessionKey(ev){
  const u=cur(); if(!u) return;
  const k=ev.key, L=k.length===1?k.toLowerCase():k, sp=specOf(u), reader=isReader(u);
  const ae=document.activeElement, inter=!!(ae&&ae.matches&&ae.matches("button,a[href],summary,input,select,textarea,[role=button]"));
  if(k==="Escape"){ ev.preventDefault(); ACT.quit(); return; }
  if(S.M.timed&&Mock.key(ev,inter)) return;   // 模試：音声の操作は受けつけない・F／G など
  if((k==="Enter"||k===" ")&&inter) return;
  let n="1234".indexOf(L); if(n<0&&L.length===1) n="abcd".indexOf(L);
  if(n>=0&&L.length===1){
    const q=keyQ(u); if(!q||n>=q.c.length||(S.M.feedback&&S.ans[q.qid])) return;
    ev.preventDefault(); if(reader&&Tray.stage==="s"&&!Tray.isWide()) Tray.expand();
    pick(q.qid,n,true); return;
  }
  if(L==="0"&&S.M.feedback){ const q=keyQ(u); if(q&&!S.ans[q.qid]){ ev.preventDefault(); pick(q.qid,-1,true); } return; }
  if(k==="Enter"||k==="ArrowRight"){ if(canAdvance(u)){ ev.preventDefault(); advance(); } return; }
  if(k===" "){ if(sp.audio){ ev.preventDefault(); S.played=true; Player.toggle(); } return; }
  if(k==="ArrowLeft"){ if(sp.audio){ ev.preventDefault(); Player.back(5); } else { ev.preventDefault(); retreat(); } return; }
  if(L==="s"){ ev.preventDefault(); toggleScript(); return; }
  if(L==="t"&&reader){ ev.preventDefault(); Tray.toggle(); return; }
}

/* ===== 結果 ===== */
/* 今日の1セットのかたまり（S.set）を最後まで解いたら、結果の代わりに区切りの1枚（js/daily.js）。途中でやめたら、ふつうの結果 */
function finishPractice(){ clearTimer(); Player.stop(); S.done=true; Fx.haptic("done"); Fx.sound("done");
  if(S.set&&S.complete){ Tray.off(); S.view="results"; const r=sessionScore(); Daily.between(S.set,`${r.tot}問中 ${r.ok}問正解`); return; }
  results(); }
function sessionScore(){ let tot=0,ok=0; for(const u of S.units) for(const q of u.qs){ const a=S.ans[q.qid]; if(!a||a.peek) continue; tot++; if(a.pick===q.a) ok++; } return {tot,ok}; }
/* 練習・解き直しの結果（模試の結果は js/mock.js の SCREENS.mockresult） */
function results(){
  Tray.off(); S.view="results";
  const by={}, tags={}, wrongs=[]; let tot=0, ok=0, peeked=0;
  for(const u of S.units){
    for(const q of u.qs){
      const a=S.ans[q.qid]; if(!a) continue;
      if(a.peek){ peeked++; continue; }
      tot++; const good=a.pick===q.a; if(good) ok++;
      const pk="P"+u.part; tally(by,pk,good); tally(tags,pk+"|"+(q.tag||"-"),good);
      if(!good) wrongs.push({u,q,a});
    }
  }
  let h=`<section class="card score"><span class="chip ol">${esc(S.label)}の結果</span>
    <div class="big" aria-label="${tot}問中${ok}問正解"><span class="num" id="scoreN">${ok}</span><em>/ ${tot}</em></div>
    <p class="sm mut">正答率 ${pct(ok,tot)}%${peeked?" ・ 解かずに見た "+peeked+" 問":""}</p></section>`;
  const wq=wrongs.map(w=>w.q.qid), origin=(Router.stack[0]||{}).name;
  if(wq.length) h+=`<button type="button" class="btn pri pz" data-act="reviewThese" data-q="${esc(wq.join(" "))}">間違えた${wq.length}問を解き直す</button>`;
  if(S.M.review){ const rest=reviewPlan().total; if(rest) h+=`<p class="sm mut">今日の解き直しは、あと ${rest}問あります。続けるかどうかは、いま決めなくてかまいません。</p><button type="button" class="btn sec pz" data-act="review">続けて解き直す（${Math.min(rest,REVIEW_MAX)}問まで）</button>`; }
  h+=`<button type="button" class="btn ${wq.length?"sec":"pri"} pz" data-act="close">${origin==="practice"?"練習にもどる":"閉じる"}</button>`;
  if(Object.keys(by).length) h+=`<h2 class="sec-h">パート別</h2><section class="card stack">`+Object.keys(by).sort().map(k=>partRowHTML(k.replace("P","Part "),by[k].ok,by[k].n)).join("")+`</section>`;
  if(Object.keys(tags).length) h+=`<h2 class="sec-h">タグ別</h2><section class="card"><table class="st"><tr><th>タグ</th><th>正答</th><th>率</th></tr>`+
    Object.keys(tags).sort().map(k=>{ const [a,b]=k.split("|"); return `<tr><td>${a} ${esc(b)}</td><td class="num">${tags[k].ok} / ${tags[k].n}</td><td class="num">${pct(tags[k].ok,tags[k].n)}%</td></tr>`; }).join("")+`</table></section>`;
  if(wrongs.length) h+=`<h2 class="sec-h">間違えた問題（${wrongs.length}）</h2><section class="card">${wrongListHTML(wrongs)}</section>`;
  Shell.render({layer:"expressive",tabs:false,top:subTop(S.label+"の結果",true),body:h});
  celebrate("#scoreN",ok);
  fillBars();
}
const pct=(a,b)=>b?Math.round(a/b*100):0;
/* Part の横棒の行（結果）。正答数／問題数（と％） */
function partRowHTML(label,ok,n,sub){ return `<div class="prow"><b>${label}</b>${barHTML(n?ok/n:0)}<span>${ok}/${n}${sub||""}</span></div>`; }
function fillBars(){ document.querySelectorAll("#page .prow .bar>i").forEach((e,i)=>Fx.fill(e,100+i*70)); }
/* 間違えた問題の一覧（開くと答えと解説）。wrongs = [{u, q, a}] */
function wrongListHTML(wrongs){
  return wrongs.map(({u,q,a})=>
    `<details class="rev"><summary><span class="num">${q.num!=null?q.num+".":""}</span> ${esc(u.id)} ${q.tag?`<span class="tag">${esc(q.tag)}</span>`:""}</summary><div>
    ${q.q?`<p class="sm" lang="en">${esc(q.q)}</p>`:""}
    <p class="sm">あなた：${a&&a.pick>=0?LET[a.pick]+' <span lang="en">'+esc(q.c[a.pick])+"</span>":a?"わからない":"未解答"}<br>正解：${LET[q.a]} <span lang="en">${esc(q.c[q.a])}</span></p>
    ${explainHTML(q.e)}<div>${flagBtn(u.id)}</div></div></details>`).join("");
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
const V_DUE_MAX=60, V_SET_DUE=20, V_SEC=12;   // 1回の復習の上限（現行80を下げる：3.8）／今日の1セットの中の復習の上限／1語の目安の秒数
let VOCAB=[], VBY={}, V=null;
function vSet(){ return {nw:+profile().newPerDay||10, auto:prefs().vAuto?1:0}; }   // 段は vCurLv()
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
/* いまの段（V1の「いまここ」）：profile.curLv の段から上へ、まだ出していない語が残っている最初の段。
   上の段まで出し終えたら、下の段の残り。curLv=0（段階0までの「易しい順」）は段1から */
function vCurLv(st){
  st=st||vState(); const L=+profile().curLv||1, has=lv=>VOCAB.some(e=>e.lv===lv&&!st[e.id]);
  return V_LEVELS.filter(l=>l>=L).concat(V_LEVELS.filter(l=>l<L)).find(has)||L;
}
/* 新しい語 n 個：いまの段から順に（段の中はまぜる）。出し終えた段は自動で次の段へ（3.8） */
function vNewWords(st,n){
  const L=vCurLv(st), out=[];
  for(const lv of V_LEVELS.filter(l=>l>=L).concat(V_LEVELS.filter(l=>l<L))){ if(out.length>=n) break; out.push(...shuffle(VOCAB.filter(e=>e.lv===lv&&!st[e.id])).slice(0,n-out.length)); }
  return out;
}
/* 今日まだ出せる新しい語の数（1日の計画 − 今日すでに出した数） */
function vNewLeft(st){ st=st||vState(); const lg=loadJSON(K.vlog)[today()]||{}; return Math.min(Math.max(0,vSet().nw-(lg.nw||0)),VOCAB.reduce((a,e)=>a+(st[e.id]?0:1),0)); }
/* mode：daily（今日の単語：復習60＋今日の残りの新しい語）／set（今日の1セットの単語：復習20＋同）／review／new（新しい語をもう1日分）／weak（苦手な語・箱は進めない） */
function startVocab(mode){
  const st=vState(), t=today();
  let queue=[], free=false;
  if(mode==="weak"){ queue=shuffle(VOCAB.filter(e=>st[e.id]&&st[e.id].l>0&&st[e.id].b<6).sort((a,b)=>st[b.id].l-st[a.id].l).slice(0,30)); free=true; }
  else {
    if(mode!=="new") queue=shuffle(VOCAB.filter(e=>st[e.id]&&st[e.id].d<=t).sort((a,b)=>st[a.id].d-st[b.id].d).slice(0,mode==="set"?V_SET_DUE:V_DUE_MAX));
    if(mode!=="review") queue=queue.concat(vNewWords(st,mode==="new"?vSet().nw:vNewLeft(st)));
  }
  if(!queue.length) return false;
  // 新しい語を出すとき、いまの段を出し終えていたら次の段へ移し、結果で知らせる
  const was=+profile().curLv||0, now=vCurLv(st), moved=!free&&mode!=="review"&&was&&now!==was;
  if(moved) setProfile("curLv",now);
  vBegin(mode,queue,free,{set:mode==="set"?"w":"", lvMoved:moved?[was,now]:null});
  return true;
}
/* 単語のセッションを始める（自己テストの再生でも使う：並びをそのまま渡す） */
function vBegin(mode,queue,free,extra){
  Router.session({leave:()=>{ Player.stop(); V=null; }});
  V=Object.assign({mode,free,queue,i:0,n:0,ok:0,nw:0,miss:{},q:null},extra||{});
  vShow();
}
function vShow(){
  Player.stop();
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
/* 箱と間隔（現行のまま。自己テストで 1565874 の時点と同じ toeic_vocab_v1 になることを確かめている）。
   r＝その語の記録（無ければ新しい語）。r は書きかえる。返り値 {r, msg} */
function vApply(r,ok,t,free){
  let msg;
  if(!r){
    r=ok?{b:2,d:t+V_INT[2],n:1,ok:1,l:0}:{b:0,d:t,n:1,ok:0,l:0};
    msg=ok?"知っている語として3日後に確認します":"このあともう一度出ます";
  } else {
    r.n++;
    if(ok){ r.ok++; if(!free||r.b===0){ r.b=Math.min(6,r.b+1); r.d=t+V_INT[r.b]; } msg=free?"":r.b>=6?"習得。90日後に確認します":"次は"+V_INT[r.b]+"日後"; }
    else { if(r.b>0) r.l=(r.l||0)+1; r.b=0; r.d=t; msg="このあともう一度出ます"; }
  }
  return {r,msg};
}
/* 学習日誌（toeic_vlog_v1）に1問。rn・rok＝復習（新しい語でない）の数と正解（記録の「復習での正答率」） */
function vLog(t,ok,isNew){ const lg=loadJSON(K.vlog), d=tally(lg,t,ok); d.nw=(d.nw||0)+(isNew?1:0); if(!isNew){ d.rn=(d.rn||0)+1; if(ok) d.rok=(d.rok||0)+1; } saveJSON(K.vlog,lg); }
/* 段に初めて手をつけた日（V5「かかった日数」） */
function vLvStart(lv,t){ const p=profile(), s=Object.assign({},p.lvStart); if(s[lv]!=null) return; s[lv]=t; setProfile("lvStart",s); }
function vAnswer(ci){
  const q=V&&V.q; if(!q||q.done) return;
  const e=q.e, ok=ci>=0&&q.opts[ci].ok, st=vState(), t=today();
  const again=!!V.miss[e.id];
  q.done=true; q.pick=ci;
  if(!again){ V.n++; if(ok) V.ok++; if(q.isNew) V.nw++; vLog(t,ok,q.isNew); }
  if(!st[e.id]) vLvStart(e.lv,t);
  const res=vApply(st[e.id],ok,t,V.free); st[e.id]=res.r; q.msg=res.msg;
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
/* 単語の結果（V3）。段を修了していたら先に到達の画面（V5）。今日の1セットのかたまりを最後まで終えたら、結果の代わりに区切りの1枚 */
function vFinish(){
  Player.stop(); if(!V){ Router.back(); return; }
  const w=V, complete=w.i>=w.queue.length, c=vCounts(), ids=Object.keys(w.missed||{}), left=vNewLeft(), nw=vSet().nw;
  V=null;
  if(w.n>0){ Fx.haptic("done"); Fx.sound("done"); }
  const moved=w.lvMoved?`<p class="note">${V_LV[w.lvMoved[0]]}の語をすべて出しました。新しい語は${V_LV[w.lvMoved[1]]}の段から出します。</p>`:"";
  const show=()=>{
    if(w.set&&complete){ Daily.between(w.set,`${w.n}語 ・ 1回目の正答 ${w.ok}`+(w.nw?` ・ 新しい語 ${w.nw}`:"")); return; }
    let h=`<section class="card score"><span class="chip ol">英単語特訓の結果</span><div class="big" aria-label="${w.n}問中${w.ok}問正解"><span class="num" id="scoreN">${w.ok}</span><em>/ ${w.n}</em></div>
      <p class="sm mut">1回目の正答率 ${w.n?Math.round(w.ok/w.n*100):0}% ・ 新しい語 ${w.nw}</p>
      ${statsHTML([[c.ms,"習得"],[c.lr,"学習中"],[c.nw,"未着手"]],"width:100%")}${moved}</section>`;
    if(ids.length) h+=`<h2 class="sec-h">間違えた語（${ids.length}）</h2><section class="card">`+ids.map(id=>vRow(VBY[id])).join("")+`</section>`;
    const more=w.n>0&&c.nw?`<button type="button" class="btn sec pz" data-act="vstart" data-mode="${left?"daily":"new"}">${left?`今日の新しい語の残り ${left}語`:`新しい語をもう ${Math.min(nw,c.nw)} 語`}</button>`:"";
    Shell.render({layer:"expressive",tabs:false,top:subTop("英単語特訓の結果",true),body:h+more+`<button type="button" class="btn pri pz" data-act="close">閉じる</button>`});
    if(w.n>0) celebrate("#scoreN",w.ok);
  };
  if(w.n>0) Daily.milestone(show); else show();
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
/* 段ごとの4つの状態：未着手 nw／学習中（箱0〜2）lr／定着中（箱3〜5）fx／習得（箱6）ms（3.8） */
function vLevelStats(st){
  st=st||vState(); const o={};
  for(const lv of V_LEVELS) o[lv]={all:0,nw:0,lr:0,fx:0,ms:0};
  for(const e of VOCAB){ const c=o[e.lv]; if(!c) continue; c.all++; const r=st[e.id]; if(!r) c.nw++; else if(r.b>=6) c.ms++; else if(r.b>=3) c.fx++; else c.lr++; }
  return o;
}

/* ===== タブの画面 ===== */
function todayLabel(){ const d=new Date(); return `${d.getMonth()+1}月${d.getDate()}日（${JWD[d.getDay()]}）`; }
function vPlan(){ const c=vCounts(); return {c,due:Math.min(c.due,V_DUE_MAX),nn:vNewLeft()}; }
const ETS_NOTE="TOEIC is a registered trademark of ETS. This product is not endorsed or approved by ETS.";
const REVIEW_SEC_PER_Q=40;   // 解き直し1問の目安（解説を読む時間を含む・設計判断）
const minOf=sec=>Math.max(1,Math.round(sec/60));
function mockQCount(n){ const U=unitsOf(n); return PARTS.reduce((s,p)=>s+(U[p]||[]).reduce((a,u)=>a+u.qs.length,0),0); }

/* 今日（H1）・単語（V1）・記録（T1）の画面は js/daily.js */
/* 練習タブ：解き直し（件数・時間・並び）と、Part ごとの行（押すとその場で量の選択が開く：3.3） */
const PR={open:0, tag:{}};   // 量の選択を開いている Part、Part ごとのタグのしぼり込み
function partAcc(st,p){ let n=0,ok=0; for(const k in st){ if(k.startsWith("P"+p+"|")){ n+=st[k].n; ok+=st[k].ok; } } return n?`正答率 ${Math.round(ok/n*100)}%（${n}問）`:"まだ解いていません"; }
function amountHTML(p){
  const sp=PART_SPEC[p], tag=PR.tag[p]||"", all=practiceUnits(p), pool=practicePool(p,tag);
  const avg=pool.reduce((s,u)=>s+sp.est(u),0)/Math.max(1,pool.length);
  const btn=(k,l)=>{ const n=practiceSize(p,k,pool.length); return `<button type="button" class="btn ${k==="std"?"pri":"sec"} col pz" data-act="practice" data-p="${p}" data-amt="${k}" ${n?"":"disabled"}>${l}<small>${n}${sp.unit} ・ 約${minOf(n*avg)}分${k==="all"?" ・ 番号順":""}</small></button>`; };
  const tags=[...new Set(all.flatMap(u=>u.qs.map(q=>q.tag)).filter(Boolean))];
  const tg=tags.length>1?`<div class="stack"><b class="sm">タグをしぼる（任意）</b><div class="seg" role="group" aria-label="タグ">`+
    [["","すべて"]].concat(tags.map(t=>[t,t])).map(([v,l])=>`<button type="button" class="pz" data-act="prTag" data-p="${p}" data-v="${esc(v)}" aria-pressed="${tag===v}">${esc(l)}</button>`).join("")+`</div></div>`:"";
  return `<div class="amt" role="group" aria-label="量">${btn("short","短い")}${btn("std","標準")}${btn("all","全部")}</div>${tg}`;
}
SCREENS.practice=(o)=>{
  const re=!!(o&&o.rerender), top=tabTop("練習");
  if(!MOCKS.length){ Shell.render({tab:"practice",top,body:noData()}); return; }
  const rp=reviewPlan(), st=loadJSON(K.stat), t=today(), ord=prefs().reviewOrder;
  let h=`<section class="card"><div class="row nowrap"><span class="no">${icon("redo","s")}</span><div class="m"><b>苦手の解き直し</b><div class="xs mut">`+
    (rp.total?`今日の解き直し ${rp.count}問 ・ 約${minOf(rp.count*REVIEW_SEC_PER_Q)}分${rp.rest?` ・ あと${rp.rest}問あります`:""}`:"解き直す問題はありません")+`</div></div></div>`;
  if(rp.total) h+=`<button type="button" class="btn pri pz" data-act="review">解き直す（${rp.count}問）</button>`+
    `<div class="seg" role="group" aria-label="解き直しの並び">${optBtns("pref","reviewOrder",[["mix","Partをまぜる"],["part","Partをそろえる"]],ord)}</div>`;
  else h+=`<p class="sm">${rp.next?`次の解き直しは${dayLabel(rp.next.due,t)}に ${rp.next.n}問 です。`:"間違えた問題は、ここに自動で集まります。"}いまは下の Part 別の練習からどうぞ。</p>`;
  h+=`</section><h2 class="sec-h">Part別</h2><div class="list">`;
  for(const p of PARTS){
    const sp=PART_SPEC[p], n=practiceUnits(p).length, open=PR.open===p&&n>0;
    h+=`<section class="card prt"><button type="button" class="prh pz" data-act="prOpen" data-p="${p}" aria-expanded="${open}"${open?` aria-controls="prs${p}"`:""} ${n?"":"disabled"}>`+
      `<span class="no num">P${p}</span><span class="m"><b>Part ${p} ${sp.name}</b><span class="xs mut">${n}${sp.unit}・${qCount(p)}問 ・ ${partAcc(st,p)}</span></span>${icon(open?"up":"down")}</button>`+
      (open?`<div class="prs" id="prs${p}">${amountHTML(p)}</div>`:"")+`</section>`;
  }
  Shell.render({tab:"practice",top,body:h+`</div>`,keepScroll:re,noAnim:re,focus:!re});
};
/* ===== 下の階層の画面（タブは出したまま） ===== */
/* 選択肢のボタン群。opts = [[値, 表示], …]。値は data-v に文字列で入れ、受け取る側で optVal() で型をもどす */
function optBtns(act,k,opts,cur,cls){
  return opts.map(([v,l])=>{ const on=cur===v; return `<button type="button" class="${cls?cls+(on?" on":"")+" ":""}pz" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${on}">${l}</button>`; }).join("");
}
/* 設定画面と「表示の設定」で同じ選択肢を使う */
const OPT_TEXT=[[0,"小"],[1,"標準"],[2,"大"],[3,"特大"],[4,"最大"]], OPT_THEME=[["auto","端末に合わせる"],["light","明るい"],["dark","暗い"]], OPT_TRAY=[["auto","3段階で上げ下げ"],["switch","文書と切り替え"]];
function segHTML(k,opts,cur,act){ return `<div class="seg" role="group">${optBtns(act||"pref",k,opts,cur)}</div>`; }
function optVal(def,s){ return typeof def==="number"?+s:s; }   // 既定値が数なら数に
SCREENS.settings=(o)=>{ const re=!!(o&&o.rerender);
  const p=prefs();
  const h=`<h2 class="sec-h">表示</h2><section class="card plain">
    <div class="setrow"><b>外観</b>${segHTML("theme",OPT_THEME,p.theme)}</div>
    <div class="setrow"><b>文字の大きさ</b>${segHTML("text",OPT_TEXT,p.text)}<p class="vex" lang="en">The quarterly report will be distributed to all department heads.</p></div>
    <div class="setrow"><b>動きを減らす</b>${segHTML("motion",[["auto","端末に合わせる"],["reduce","いつも減らす"]],p.motion)}</div>
    <div class="setrow"><b>Part 6・7 の設問</b>${segHTML("tray",OPT_TRAY,p.tray)}<p class="note">「3段階」でも、文字が特大以上か画面が低いときは、文書と設問を切り替える2段階になります。</p></div></section>
    <h2 class="sec-h">音と触覚</h2><section class="card plain">
    <div class="setrow"><b>効果音</b>${segHTML("sfx",[[1,"入"],[0,"切"]],p.sfx)}<p class="note">模試の最中と、音声が流れている間は鳴りません。</p></div>
    <div class="setrow"><b>触覚</b>${segHTML("haptic",[[1,"入"],[0,"切"]],p.haptic)}<p class="note">アプリ版で働きます（ブラウザでは何も起きません）。</p></div>
    <div class="setrow"><b>模試中の触覚</b>${segHTML("hapticMock",[[1,"入"],[0,"切"]],p.hapticMock)}</div></section>
    <h2 class="sec-h">練習と単語の音声</h2><section class="card plain">
    <div class="setrow"><b>速さの既定</b>${segHTML("speed",[[0.8,"0.8×"],[1,"1.0×"],[1.2,"1.2×"]],p.speed)}<p class="note">模試には効きません（模試はいつも1.0×で1回だけ）。</p></div>
    <div class="setrow"><b>次の問題で自動的に再生</b>${segHTML("autoplay",[[1,"入"],[0,"切"]],p.autoplay)}<p class="note">最初の1問は、再生ボタンを押して始めます。</p></div>
    <div class="setrow"><b>単語：答えのあとに発音</b>${segHTML("vAuto",[[1,"入"],[0,"切"]],p.vAuto)}</div></section>
    ${Daily.planSettingsHTML()}
    <h2 class="sec-h">記録</h2><div class="list">
    ${rowbHTML({act:"obAgain",no:icon("redo","s"),title:"はじめの案内をもう一度",sub:"目標・受験日・単語の実力チェック（記録は消えません）"})}
    ${rowbHTML({act:"wipeAsk",no:icon("x","s"),title:"記録を消す",sub:"成績／単語の進み具合／すべて（購入は消えません）"})}
    ${rowbHTML({act:"nav",data:{to:"flags"},no:icon("flag","s"),title:"報告した問題",sub:`${Object.keys(flags()).length}件 ・ 一覧とコピー`})}</div>
    <h2 class="sec-h">そのほか</h2><div class="list">
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
/* いまの画面を描き直す（設定の切り替えなど、同じ画面にとどまる操作） */
function rerender(){ const t=Router.top(); if(t&&SCREENS[t.name]) SCREENS[t.name]({rerender:true}); }
function refocus(sel){ const b=document.querySelector(sel); if(b) try{ b.focus({preventScroll:true}); }catch(e){} }
Object.assign(ACT,{
  tab:d=>Router.tab(d.tab),
  nav:d=>Router.go(d.to),
  back:()=>{ if(!Router.back()) Router.tab("today"); },
  /* やめる：練習・解き直しで1問でも解いていれば、そこまでの結果を出す（記録は1問ごとに保存ずみ） */
  quit:()=>{
    if(V){ vFinish(); return; }
    if(S&&S.M.quitAsk){ Mock.askQuit(); return; }
    if(S&&S.M.feedback&&S.view==="unit"&&Object.keys(S.ans).length){ finishPractice(); return; }
    if(!Router.back()) Router.tab("today");
  },
  play:d=>playAudio(d.src),
  vplay:()=>{ if(V&&V.q) playAudio(vAud(V.q.e)); },
  pltoggle:()=>{ if(S) S.played=true; Player.toggle(); },
  plback:()=>Player.back(5),
  plspeed:()=>Player.cycleSpeed(),
  pline:d=>{ const u=S&&cur(); if(!u||!specOf(u).segs) return; const st=Player.estimateStarts(specOf(u).segs(u.raw),Player.duration())[+d.k]; if(st!=null){ S.played=true; Player.seekTo(Math.max(0,st-0.3),true); } },
  trans:(d,el)=>{ const sc=el.closest(".script"); if(!sc) return; const on=sc.classList.toggle("show-ja"); el.setAttribute("aria-pressed",on); el.textContent=on?"訳を隠す":"訳を見る"; },
  flag:d=>toggleFlag(d.id),
  unflag:d=>{ toggleFlag(d.id); SCREENS.flags({rerender:true}); },
  copyFlags:()=>{
    const t=flagText(), m=$("#cpm");
    const fb=()=>{ const a=$("#cpt"); a.select(); try{ document.execCommand("copy"); m.textContent="コピーしました"; }catch(e){ m.textContent="選択しました。手動でコピーしてください"; } };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>m.textContent="コピーしました",fb); else fb();
  },
  prOpen:d=>{ const p=+d.p; PR.open=PR.open===p?0:p; SCREENS.practice({rerender:true}); refocus(`[data-act="prOpen"][data-p="${p}"]`); },
  prTag:d=>{ PR.tag[+d.p]=d.v; SCREENS.practice({rerender:true}); refocus(`[data-act="prTag"][data-p="${d.p}"][data-v="${CSS.escape(d.v)}"]`); },
  practice:d=>startPractice(+d.p,d.amt||"std",PR.tag[+d.p]||""),
  review:()=>startReview(),
  reviewThese:d=>startReview(String(d.q||"").split(" ").filter(Boolean)),
  pick:d=>pick(d.q,+d.c),
  unknown:d=>pick(d.q,-1),
  peek:d=>peek(d.q),
  rvmark:(d,el)=>{ const on=el.getAttribute("aria-pressed")!=="true"; reviewMark(d.q,on); el.setAttribute("aria-pressed",on); el.innerHTML=markInner(on); },
  dtab:d=>{ const el=$("#docs"); if(el) S.dscroll[S.dtab]=el.scrollTop; S.dtab=+d.i;
    document.querySelectorAll('.dsw [data-act="dtab"]').forEach(b=>b.setAttribute("aria-pressed",+b.dataset.i===S.dtab));
    paintDoc(); if(el) el.scrollTop=S.dscroll[S.dtab]||0; },
  qi:(d,el)=>{ const blank=el.classList.contains("dblank"), had=el===document.activeElement; setQi(+d.i,"chip"); if(had) refocus(blank?`#docs .dblank[data-i="${d.i}"]`:`#qtabs [data-i="${d.i}"]`); },
  trayToggle:()=>Tray.toggle(),
  trayOpen:()=>Tray.expand(),
  next:()=>advance(), prev:()=>retreat(),
  menu:(d,el)=>openMenu(el),
  keys:()=>showKeys(),
  qset:()=>showQuickSet(),
  qsetClose:()=>closeDlg("qsetdlg"),
  qpref:d=>{ setPref(d.k,optVal(PREFS_DEFAULT[d.k],d.v)); const g=$("#qsetdlg"); if(g) g.innerHTML=quickSetHTML(); if(typeof Tray!=="undefined") Tray.refresh(); refocus(`#qsetdlg [data-k="${d.k}"][aria-pressed="true"]`); },
  keysClose:()=>closeDlg("keysdlg"),
  vstart:d=>startVocab(d.mode),
  vans:d=>vAnswer(+d.c),
  vnext:()=>vNext(),
  vlv:d=>{ setProfile("curLv",+d.lv); rerender(); refocus(`[data-act="vstep"][data-lv="${d.lv}"]`); },
  vl:d=>{ VL[d.k]=optVal(VL_DEFAULT[d.k],d.v); SCREENS.vlist({rerender:true}); },
  pref:d=>{ const v=optVal(PREFS_DEFAULT[d.k],d.v); setPref(d.k,v); if(d.k==="haptic"&&v) Fx.haptic("toggle"); rerender(); refocus(`[data-act="pref"][data-k="${d.k}"][aria-pressed="true"]`); },
  prof:d=>{ setProfile(d.k,d.v===""?null:optVal(PROFILE_DEFAULT[d.k]==null?0:PROFILE_DEFAULT[d.k],d.v)); rerender(); refocus(`[data-act="prof"][data-k="${d.k}"][aria-pressed="true"]`); }
});
ACT.close=ACT.back;   // 結果の「×閉じる」と「＜もどる」は同じ動き
Input.vsearch=v=>{ VL.q=v; vListPaint(); };

document.addEventListener("keydown",ev=>{
  if(ev.metaKey||ev.ctrlKey||ev.altKey) return;
  if(ev.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
  if(document.querySelector("dialog[open]")) return;   // キーの一覧などは Esc で閉じる（ブラウザに任せる）
  const m=$("#menu"); if(m&&!m.hidden&&ev.key==="Escape"){ ev.preventDefault(); closeMenu(); refocus('[data-act="menu"]'); return; }
  if(ev.key==="?"){ ev.preventDefault(); showKeys(); return; }
  if(V&&V.q){
    if(!V.q.done){ const n="1234".indexOf(ev.key); if(n>=0&&n<V.q.opts.length){ ev.preventDefault(); vAnswer(n); } else if(ev.key==="0"){ ev.preventDefault(); vAnswer(-1); } }
    else if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); vNext(); }
    return;
  }
  if(S&&S.view==="unit"&&Router.inSession()){ sessionKey(ev); return; }
  if(S&&S.M.timed&&Router.inSession()&&Mock.key(ev,false)) return;   // 模試の解答状況・切り替えの画面
  if(Daily.key(ev)) return;   // 実力チェック・まとめて確認
  if(ev.key==="Escape"&&Router.stack.length>1){ ev.preventDefault(); ACT.back(); return; }
  // タブの先頭（H1）：1〜4でタブ、Enterで主ボタン（焦点がボタンなどにあるときはその部品に任せる）
  if(Router.stack.length===1&&!Router.inSession()&&!document.getElementById("tabs").hidden){
    const n="1234".indexOf(ev.key); if(n>=0){ ev.preventDefault(); Router.tab(TABS[n].id); return; }
    const ae=document.activeElement, inter=!!(ae&&ae.matches&&ae.matches("button,a[href],summary,input,select,textarea,[role=button]"));
    if(ev.key==="Enter"&&!inter){ const b=document.querySelector("#page .hero .btn.pri"); if(b){ ev.preventDefault(); b.click(); } }
  }
});
/* 幅840pxをまたいだら、読む画面を左右2画面⇄トレイで描き直す（答え・時間はそのまま） */
Tray.onWideChange(()=>{ if(S&&S.view==="unit"&&isReader(cur())) showUnit({keep:true}); });
window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").addEventListener&&matchMedia("(prefers-color-scheme: dark)").addEventListener("change",applyPrefs);

/* ===== 起動 =====
   boot は全部の <script>（js/mock.js・js/daily.js を含む）を読み終えてから呼ぶ（await の続きが次のスクリプトより先に動くため） */
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
  if(!testMode&&Store.ready){ migrateStore(Store); settleOnboarding(Store); }   // 読みこみに失敗したときは引きつがない（既定値で上書きしないため）。記録のある人には「はじめに」を出さない
  try{ if(history.state&&history.state.lapis) history.replaceState(null,""); }catch(e){}   // 再読みこみ前の「もどる」の印を消す
  applyPrefs();
  if(testMode){ const s=document.createElement("script"); s.src="js/selftest.js"; document.head.appendChild(s); Native.ready(); return; }
  if(!window.TOEIC_DATA&&/[?&]sample/.test(location.search)){
    await new Promise(r=>{ const s=document.createElement("script"); s.src="data/data.sample.js"; s.onload=r; s.onerror=r; document.head.appendChild(s); });
  }
  loadData();
  Router.tab(profile().onboarded?"today":"onboard");   // 初回だけ「はじめに」（O1〜O4）
  Native.ready();   // アプリ：最初の画面を描いたら起動画面を消す
  // Service Worker は Web 版だけで登録する（アプリの中では登録しない：7.1-14）
  if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)&&!isNativeApp()&&!/[?&]sample/.test(location.search)){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
