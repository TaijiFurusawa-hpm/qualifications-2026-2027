/* ===== Store（保存）＋ 記録の引きつぎ =====
   UX設計書 7.1-1 / 7.2
   - 起動時に toeic_ で始まる全キーをメモリへ読みこみ、loadJSON はメモリから返す（呼び出し側は変えない）
   - saveJSON はメモリへ書き、保存先へは300msまとめて書く（write-behind）。裏に回る瞬間（visibilitychange / pagehide）に必ず流す
   - 保存先は差しかえ式：いまは localStorage、アプリでは Capacitor Preferences（下の CapacitorPrefsBackend）
*/
"use strict";
const KEY_PREFIX = "toeic_";

/* --- 保存先（backend）：keys / getItem / setItem / removeItem。同期でも Promise でもよい --- */
function LocalStorageBackend(){
  let ls=null; try{ ls=window.localStorage; const t="__toeic_probe"; ls.setItem(t,"1"); ls.removeItem(t); }catch(e){ ls=null; }
  if(!ls) return MemoryBackend();   // プライベートモード等で使えないとき（その回だけ動く）
  return {
    name:"localStorage",
    keys(){ const a=[]; for(let i=0;i<ls.length;i++){ const k=ls.key(i); if(k&&k.startsWith(KEY_PREFIX)) a.push(k); } return a; },
    getItem(k){ return ls.getItem(k); },
    setItem(k,v){ ls.setItem(k,v); },
    removeItem(k){ ls.removeItem(k); }
  };
}
function MemoryBackend(init){
  const m=Object.assign({},init||{});
  return { name:"memory", data:m,
    keys(){ return Object.keys(m).filter(k=>k.startsWith(KEY_PREFIX)); },
    getItem(k){ return k in m?m[k]:null; }, setItem(k,v){ m[k]=String(v); }, removeItem(k){ delete m[k]; } };
}
/* TODO(段階4)：@capacitor/preferences を入れたら有効になる。値は文字列（JSON）。すべて Promise を返す */
function CapacitorPrefsBackend(){
  const P=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Preferences;
  if(!P) return null;
  return { name:"capacitor-preferences", async:true,
    async keys(){ const r=await P.keys(); return (r.keys||[]).filter(k=>k.startsWith(KEY_PREFIX)); },
    async getItem(k){ const r=await P.get({key:k}); return r.value==null?null:r.value; },
    setItem(k,v){ return P.set({key:k,value:v}); },
    removeItem(k){ return P.remove({key:k}); } };
}
function isNativeApp(){ return !!(window.Capacitor&&(typeof window.Capacitor.isNativePlatform==="function"?window.Capacitor.isNativePlatform():window.Capacitor.platform&&window.Capacitor.platform!=="web")); }

function createStore(backend, opts){
  opts=opts||{};
  const delay=opts.delay==null?300:opts.delay;
  let cache=Object.create(null);  // key -> JSON文字列
  const dirty=new Set(), removed=new Set();
  let timer=0, ready=false;
  const S={
    backend, writes:0,
    /* 起動時に全キーを読む。localStorage なら同期で終わる（Promise は解決済みで返す） */
    init(){
      const done=()=>{ ready=true; return S; };
      const ks=backend.keys();
      if(ks&&typeof ks.then==="function"){
        return ks.then(list=>Promise.all(list.map(k=>Promise.resolve(backend.getItem(k)).then(v=>{ if(v!=null) cache[k]=v; })))).then(done);
      }
      for(const k of ks){ const v=backend.getItem(k); if(v!=null) cache[k]=v; }
      return Promise.resolve(done());
    },
    get ready(){ return ready; },
    has(k){ return k in cache; },
    raw(k){ return k in cache?cache[k]:null; },
    keys(){ return Object.keys(cache); },
    /* 現行の loadJSON と同じ：無い・壊れている → {} 。毎回新しいオブジェクトを返す */
    load(k){ const s=cache[k]; if(s==null) return {}; try{ return JSON.parse(s)||{}; }catch(e){ return {}; } },
    save(k,v){ let s; try{ s=JSON.stringify(v); }catch(e){ return; } cache[k]=s; removed.delete(k); dirty.add(k); S.schedule(); },
    remove(k){ delete cache[k]; dirty.delete(k); removed.add(k); S.schedule(); },
    schedule(){ if(timer) return; if(delay<=0){ S.flush(); return; } timer=setTimeout(()=>{ timer=0; S.flush(); }, delay); },
    pending(){ return dirty.size+removed.size; },
    /* 別のタブ・ウィンドウが書いた値を取りこむ（書き残しのあるキーは自分の値を優先） */
    external(k,v){ if(!k||!k.startsWith(KEY_PREFIX)||dirty.has(k)||removed.has(k)) return; if(v==null) delete cache[k]; else cache[k]=v; },
    /* 書き残しを保存先へ流す。失敗したキーは残して次の機会に再試行 */
    flush(){
      if(timer){ clearTimeout(timer); timer=0; }
      const ps=[];
      for(const k of Array.from(removed)){ try{ const r=backend.removeItem(k); if(r&&r.then) ps.push(r.catch(()=>removed.add(k))); removed.delete(k); }catch(e){} }
      for(const k of Array.from(dirty)){
        try{ const r=backend.setItem(k,cache[k]); dirty.delete(k); S.writes++; if(r&&r.then) ps.push(r.catch(()=>{ dirty.add(k); })); }
        catch(e){ S.lastError=e; if(!timer) timer=setTimeout(()=>{ timer=0; S.flush(); }, 2000); /* 容量オーバー等：メモリには残っているので、間をあけて再試行 */ }
      }
      return ps.length?Promise.all(ps):undefined;
    }
  };
  return S;
}

/* --- アプリ全体で使う Store --- */
const Store = createStore((isNativeApp()&&CapacitorPrefsBackend())||LocalStorageBackend());
function loadJSON(k){ return Store.load(k); }
function saveJSON(k,v){ Store.save(k,v); }
function removeJSON(k){ Store.remove(k); }
(function(){
  const fl=()=>{ try{ Store.flush(); }catch(e){} };
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") fl(); });
  window.addEventListener("pagehide",fl);
  window.addEventListener("storage",e=>{ if(e.storageArea===window.localStorage&&Store.backend.name==="localStorage") Store.external(e.key,e.newValue); });
  // TODO(段階4)：Capacitor の App 'pause' でも fl() を呼ぶ
})();

/* ===== 保存キーの記述子（7.2）。K.名前 → キー。形を変えるときは、ここと migrateStore と自己テストを同時に直す =====
   since：使い始めた段階／legacy：旧キー（読むだけ。消さない）／shape：中身の形 */
const KEYS = [
  {id:"schema",   key:"toeic_schema",      since:0, shape:"{v, at, from}",                         what:"形の版。引きつぎの判定に使う"},
  {id:"profile",  key:"toeic_profile_v1",  since:0, shape:"PROFILE_DEFAULT ＋ lvStart:{段:日}・lvDone:{段:日}", what:"はじめに・学習の計画・段に手をつけた日と修了した日（段階3）"},
  {id:"prefs",    key:"toeic_prefs_v1",    since:0, shape:"PREFS_DEFAULT",                         what:"設定（toeic_speed_v1・toeic_vset_v1 を吸収）"},
  {id:"ent",      key:"toeic_ent_v1",      since:5, shape:"{unlocked, product, checkedAt, pending}", what:"購入の状態の控え（正はストア）"},
  {id:"review",   key:"toeic_review_v1",   since:0, shape:"{qid:{st:0..3, due:日, n:誤答の回数}}",   what:"解き直しの段階と次に出る日（toeic_miss_v1 から引きつぐ）"},
  {id:"day",      key:"toeic_day_v1",      since:3, shape:"{日:{w,r,p:1＝今日の1セットのかたまりを終えた, a:1＝何か解いた, P:{Part:[解いた数,正解]}}}", what:"その日に終えたかたまり・学習した日・Part別（直近30日）"},
  {id:"mockhist", key:"toeic_mockhist_v1", since:2, shape:"[{n, attempt, mode, at, L, R, nL, nR, …}]",  what:"受けた模試の結果（js/mock.js の histEntry）"},
  {id:"mockrun",  key:"toeic_mockrun_v1",  since:2, perMock:true, shape:"{n, mode, attempt, phase, i, qi, L, ans, mark, …}", what:"回Nの途中の状態。キーは toeic_mockrun_v1:N（回ごとに別キー。採点したら消す）"},
  {id:"stat",     key:"toeic_stat_v1",     since:0, shape:"{'P5|品詞':{n, ok, ms}}",                what:"Part・タグ別の成績"},
  {id:"seen",     key:"toeic_seen_v1",     since:0, shape:"{unitId:回数}",                          what:"解いた回数（まだ解いていない問題を先に出す）"},
  {id:"flag",     key:"toeic_flag_v1",     since:0, shape:"{id:時刻}",                              what:"「この問題はおかしい」の報告"},
  {id:"vocab",    key:"toeic_vocab_v1",    since:0, shape:"{wordId:{b, d, n, ok, l}}",              what:"単語の箱と次に出る日"},
  {id:"vlog",     key:"toeic_vlog_v1",     since:0, shape:"{日:{n, ok, nw, rn, rok}}",              what:"単語の学習日誌（rn・rok＝復習の数と正解。段階3で足した。無い日は0）"},
  {id:"miss",     key:"toeic_miss_v1",     legacy:true, shape:"{qid:回数}",                         what:"旧：誤答の回数（review と同じ意味で書きつづける）"},
  {id:"speed",    key:"toeic_speed_v1",    legacy:true, shape:"{v}",                                what:"旧：再生の速さ"},
  {id:"vset",     key:"toeic_vset_v1",     legacy:true, shape:"{nw, lv, auto}",                     what:"旧：単語の設定"}
];
const K = Object.fromEntries(KEYS.map(d=>[d.id,d.key]));
const SCHEMA_V = 2;
/* tray：Part 6・7 の設問の出し方。"auto"＝3段階（文字が特大以上か読む領域が480px未満なら2段階）／"switch"＝いつも2段階（型C：切り替え）
   reviewOrder：解き直しの並び。"mix"＝Partとタグをまぜる／"part"＝Partをそろえる（3.7） */
const PREFS_DEFAULT = { text:1, theme:"auto", sfx:0, haptic:1, hapticMock:0, motion:"auto", speed:1, autoplay:1, vAuto:1, tray:"auto", reviewOrder:"mix" };
const PROFILE_DEFAULT = { target:null, exam:null, onboarded:0, placedLv:null, curLv:0, newPerDay:10 };

function dayNumber(d){ d=d||new Date(); return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000); }

/* 引きつぎ：toeic_schema が無ければ現行（v1）の記録とみなして新しい形へ移す。元のキーは消さない。
   何度呼んでも同じ結果（v2 になっていれば何もしない）。st は createStore の戻り値 */
function migrateStore(st, today){
  const sc=st.load(K.schema);
  if(sc.v>=SCHEMA_V) return {ran:false, from:sc.v};
  const t=today==null?dayNumber():today;
  const had=st.keys().length>0;
  // 1) 誤答 → 解き直しの段階（古い記録は「段階0・今日」）
  const miss=st.load(K.miss), rev=st.load(K.review); let moved=0;
  if(!st.has(K.review)) for(const qid of Object.keys(miss)){ const n=+miss[qid]||0; if(n<=0) continue; if(!rev[qid]){ rev[qid]={st:0,due:t,n}; moved++; } }
  if(!st.has(K.review)&&(moved||st.has(K.miss))) st.save(K.review,rev);   // review がすでにあれば作り直さない
  // 2) 設定：速さ・単語の設定 → prefs ／ profile
  const prefs=Object.assign({},PREFS_DEFAULT,st.load(K.prefs));
  const sp=parseFloat(st.load(K.speed).v); if(sp>0&&!st.has(K.prefs)) prefs.speed=sp;
  const vs=st.load(K.vset);
  if(vs.auto!=null&&!st.has(K.prefs)) prefs.vAuto=vs.auto?1:0;
  const prof=Object.assign({},PROFILE_DEFAULT,st.load(K.profile));
  if(!st.has(K.profile)){
    if(+vs.nw>0) prof.newPerDay=+vs.nw;
    if(vs.lv!=null) prof.curLv=+vs.lv||0;
    if(had) prof.onboarded=1;   // 既存の利用者には「はじめに」を出さない（段階3で使う）
  }
  st.save(K.prefs,prefs); st.save(K.profile,prof);
  st.save(K.schema,{v:SCHEMA_V, at:Date.now(), from:had?1:0});
  return {ran:true, from:had?1:0, reviewMoved:moved};
}
/* 「はじめに」を出すか：まだ済んでいなくても、学習の記録がすでにある人（段階0〜2の版から使っている人）には出さない。
   出さないと決めたら profile.onboarded=1 を書く（何度呼んでも同じ）。返り値：書いたら true */
const RECORD_IDS = ["stat","review","miss","seen","vocab","vlog","mockhist","day"];
function settleOnboarding(st){
  const p=Object.assign({},PROFILE_DEFAULT,st.load(K.profile)); if(p.onboarded) return false;
  const has=RECORD_IDS.some(id=>Object.keys(st.load(K[id])).length>0)||st.keys().some(k=>k.startsWith(K.mockrun+":"));
  if(!has) return false;
  p.onboarded=1; st.save(K.profile,p); return true;
}
