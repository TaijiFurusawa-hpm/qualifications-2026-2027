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
(function(){
  const fl=()=>{ try{ Store.flush(); }catch(e){} };
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") fl(); });
  window.addEventListener("pagehide",fl);
  window.addEventListener("storage",e=>{ if(e.storageArea===window.localStorage&&Store.backend.name==="localStorage") Store.external(e.key,e.newValue); });
  // TODO(段階4)：Capacitor の App 'pause' でも fl() を呼ぶ
})();

/* ===== キーの一覧（7.2） ===== */
const K = {
  schema:"toeic_schema", profile:"toeic_profile_v1", prefs:"toeic_prefs_v1", ent:"toeic_ent_v1",
  review:"toeic_review_v1", day:"toeic_day_v1", mockhist:"toeic_mockhist_v1",
  stat:"toeic_stat_v1", seen:"toeic_seen_v1", flag:"toeic_flag_v1", vocab:"toeic_vocab_v1", vlog:"toeic_vlog_v1",
  // 旧キー（読むだけ。消さない）
  miss:"toeic_miss_v1", speed:"toeic_speed_v1", vset:"toeic_vset_v1"
};
const SCHEMA_V = 2;
const PREFS_DEFAULT = { text:1, theme:"auto", sfx:0, haptic:1, hapticMock:0, motion:"auto", speed:1, autoplay:1, vAuto:1 };
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
