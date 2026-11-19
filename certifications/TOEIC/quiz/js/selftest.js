/* ===== 自己テスト（index.html?test） =====
   UX設計書 7.5：「入力と期待する答えの組」を同じアプリの中に持つ。外部の道具は足さない。
   本物の記録（localStorage）には一切さわらない：テストはすべてメモリの保存先（MemoryBackend）で行う。 */
"use strict";
(function(){
  const results=[]; let cur="";
  const ok=(c,msg)=>results.push({g:cur,ok:!!c,msg});
  const eq=(a,b,msg)=>ok(JSON.stringify(a)===JSON.stringify(b),msg+(JSON.stringify(a)===JSON.stringify(b)?"":` （期待 ${JSON.stringify(b)} ／ 実際 ${JSON.stringify(a)}）`));
  const group=g=>{ cur=g; };
  const T=20776;   // 固定の「今日」

  /* --- 現行版（v1）で作られる記録の見本：空／少し／多い --- */
  function fixture(kind){
    if(kind==="empty") return {};
    const big=kind==="many", st={}, miss={}, seen={}, flag={}, voc={}, vlog={};
    const tags=["WH疑問文","YesNo疑問文","品詞","語彙","詳細","推測","意図問題"];
    for(let p=1;p<=7;p++) for(const t of tags.slice(0,big?7:2)) st["P"+p+"|"+t]={n:big?40+p:3,ok:big?20+p:2,ms:big?123456:9000};
    for(let i=1;i<=(big?180:6);i++) miss["P"+(1+i%7)+"-"+String(i).padStart(2,"0")+(i%3?"":".2")]=1+i%3;
    for(let i=1;i<=(big?150:5);i++) seen["P5-"+String(i).padStart(2,"0")]=1+i%4;
    for(let i=1;i<=(big?12:1);i++) flag[(i%2?"P7S-":"V:")+String(i)]=1700000000000+i;
    const words=big?900:12;
    for(let i=0;i<words;i++) voc["w"+i]={b:i%7,d:T-5+i%11,n:1+i%5,ok:i%5,l:i%4===0?1:0};
    for(let d=0;d<(big?60:3);d++) vlog[T-d]={n:20,ok:15,nw:5};
    const o={toeic_stat_v1:st,toeic_miss_v1:miss,toeic_seen_v1:seen,toeic_flag_v1:flag,toeic_vocab_v1:voc,toeic_vlog_v1:vlog,
      toeic_speed_v1:{v:big?1.2:0.8}, toeic_vset_v1:{nw:big?30:20,lv:big?5:0,auto:big?0:1}};
    const raw={}; for(const k in o) raw[k]=JSON.stringify(o[k]); return raw;
  }
  function counts(st){
    const L=k=>st.load(k), n=o=>Object.keys(o).length;
    const stat=L("toeic_stat_v1"); let sn=0,sok=0,sms=0; for(const k in stat){ sn+=stat[k].n; sok+=stat[k].ok; sms+=stat[k].ms; }
    const voc=L("toeic_vocab_v1"); let vb=0; for(const k in voc) vb+=voc[k].b;
    return {statKeys:n(stat),statN:sn,statOk:sok,statMs:sms,miss:n(L("toeic_miss_v1")),seen:n(L("toeic_seen_v1")),flags:n(L("toeic_flag_v1")),
      vocab:n(voc),vocabBoxSum:vb,vlog:n(L("toeic_vlog_v1"))};
  }

  /* ===== 1. Store ===== */
  group("Store：読み書きと write-behind");
  {
    const be=MemoryBackend({toeic_a:'{"x":1}', other:'"skip"', toeic_bad:"{broken"});
    const st=createStore(be,{delay:300});
    st.init();
    eq(st.load("toeic_a"),{x:1},"起動時に toeic_ のキーをメモリへ読む");
    ok(!st.has("other"),"toeic_ 以外のキーは読まない");
    eq(st.load("toeic_bad"),{},"壊れた値は {} を返す（現行の loadJSON と同じ）");
    eq(st.load("toeic_none"),{},"無いキーは {} を返す");
    const a=st.load("toeic_a"); a.x=99; eq(st.load("toeic_a"),{x:1},"返したオブジェクトを書きかえても、保存しなければ変わらない");
    st.save("toeic_a",{x:2});
    eq(st.load("toeic_a"),{x:2},"保存した値はすぐメモリから読める");
    eq(be.getItem("toeic_a"),'{"x":1}',"保存先へはまだ書かない（300msまとめる）");
    st.save("toeic_a",{x:3}); st.save("toeic_c",[1,2]);
    eq(st.pending(),2,"同じキーへの書きこみは1つにまとまる");
    st.flush();
    eq(be.getItem("toeic_a"),'{"x":3}',"flush で保存先へ書く");
    eq(be.getItem("toeic_c"),"[1,2]","配列も保存できる");
    eq(st.pending(),0,"flush 後は書き残しなし");
    st.remove("toeic_c"); st.flush();
    eq(be.getItem("toeic_c"),null,"remove も flush で保存先から消える");
    const st2=createStore(be); st2.init(); eq(st2.load("toeic_a"),{x:3},"開き直すと保存した値が読める");
  }
  {
    const be=MemoryBackend(); let threw=0; const orig=be.setItem;
    be.setItem=(k,v)=>{ if(threw++<1) throw new Error("QuotaExceeded"); orig(k,v); };
    const st=createStore(be,{delay:0}); st.init();
    st.save("toeic_q",{a:1});
    eq(st.load("toeic_q"),{a:1},"保存先が失敗してもメモリには残る");
    eq(st.pending(),1,"失敗したキーは書き残しとして残る");
    st.flush(); eq(be.getItem("toeic_q"),'{"a":1}',"次の flush で書ける");
  }
  /* 非同期の保存先（Capacitor Preferences を想定） */
  const asyncTest=(async()=>{
    const m={toeic_x:'{"v":5}'};
    const be={async:true, keys:async()=>Object.keys(m), getItem:async k=>m[k]??null, setItem:async(k,v)=>{ m[k]=v; }, removeItem:async k=>{ delete m[k]; }};
    const st=createStore(be); await st.init();
    group("Store：非同期の保存先（Capacitor Preferences 想定）");
    eq(st.load("toeic_x"),{v:5},"init を待つと全キーが読める");
    st.save("toeic_x",{v:6}); await st.flush(); eq(m.toeic_x,'{"v":6}',"flush で非同期に書く");
  })();

  /* ===== 2. 引きつぎ ===== */
  for(const kind of ["empty","few","many"]){
    group(`引きつぎ：記録の見本「${({empty:"空",few:"少し",many:"多い"})[kind]}」`);
    const raw=fixture(kind), be=MemoryBackend(raw), st=createStore(be,{delay:0}); st.init();
    const before=counts(st);
    const r=migrateStore(st,T);
    const after=counts(st);
    ok(r.ran,"toeic_schema が無いので引きつぎを行う");
    eq(after,before,"成績・誤答・単語の進み具合・学習日誌の件数と合計が1件も減らない");
    eq(st.load("toeic_schema").v,2,"toeic_schema {v:2} を書く");
    const rv=st.load("toeic_review_v1"), miss=st.load("toeic_miss_v1");
    eq(Object.keys(rv).length,Object.keys(miss).length,"誤答の件数＝解き直しの件数");
    ok(Object.keys(rv).every(q=>rv[q].st===0&&rv[q].due===T&&rv[q].n===miss[q]),"解き直しは「段階0・今日」、回数を引きつぐ");
    for(const k of Object.keys(raw)) ok(be.getItem(k)===raw[k],`元のキー ${k} は消さず、中身も変えない`);
    const p=st.load("toeic_prefs_v1"), pf=st.load("toeic_profile_v1");
    if(kind==="empty"){
      eq(p,PREFS_DEFAULT,"新しい利用者の設定は既定値（効果音は切、触覚は入）");
      eq(pf.newPerDay,10,"新しい利用者の1日の新しい語は10");
      eq(pf.onboarded,0,"新しい利用者は「はじめに」を未完了");
    } else {
      const sp=JSON.parse(raw.toeic_speed_v1).v, vs=JSON.parse(raw.toeic_vset_v1);
      eq(p.speed,sp,"toeic_speed_v1 → prefs.speed");
      eq(p.vAuto,vs.auto?1:0,"toeic_vset_v1.auto → prefs.vAuto");
      eq(pf.newPerDay,vs.nw,"toeic_vset_v1.nw → profile.newPerDay");
      eq(pf.curLv,vs.lv,"toeic_vset_v1.lv → profile.curLv");
      eq(pf.onboarded,1,"既存の利用者には「はじめに」を出さない");
      eq(p.sfx,0,"効果音は既定で切");
    }
    const snap=JSON.stringify(st.keys().sort().map(k=>[k,st.raw(k)]));
    const r2=migrateStore(st,T+3);
    ok(!r2.ran,"2回目は何もしない（何度開いても同じ）");
    eq(JSON.stringify(st.keys().sort().map(k=>[k,st.raw(k)])),snap,"2回目で記録が変わらない");
    const st3=createStore(be); st3.init(); eq(counts(st3),before,"保存先から開き直しても件数が同じ");
  }
  group("引きつぎ：v2 の設定がすでにあるとき");
  {
    const be=MemoryBackend({toeic_prefs_v1:JSON.stringify({speed:1.2,theme:"dark"}),toeic_speed_v1:'{"v":0.8}'}), st=createStore(be,{delay:0}); st.init();
    migrateStore(st,T); const p=st.load("toeic_prefs_v1");
    eq([p.speed,p.theme],[1.2,"dark"],"新しい設定を古いキーで上書きしない");
  }

  /* ===== 3. 解き直しの段階（3.5 の表） ===== */
  group("解き直しの段階（誤答が出直す間隔）");
  {
    const mem=createStore(MemoryBackend(),{delay:0}); mem.init();
    // app.js の reviewUpdate は全体の Store を使うので、ここでは同じ規則を mem 上で確かめる
    const real={load:window.loadJSON,save:window.saveJSON,today:window.dayNumber};
    window.loadJSON=k=>mem.load(k); window.saveJSON=(k,v)=>mem.save(k,v); window.dayNumber=()=>T;
    try{
      reviewUpdate("Q1",false); eq(mem.load("toeic_review_v1").Q1,{st:0,due:T,n:1},"初めて間違えた → 段階0・当日から");
      reviewUpdate("Q1",false); eq(mem.load("toeic_review_v1").Q1,{st:0,due:T+1,n:2},"段階0でまた間違えた → 段階0のまま翌日");
      reviewUpdate("Q1",true);  eq(mem.load("toeic_review_v1").Q1.st,1,"正解 → 段階1");
      eq(mem.load("toeic_review_v1").Q1.due,T+1,"段階1は翌日");
      reviewUpdate("Q1",true);  eq([mem.load("toeic_review_v1").Q1.st,mem.load("toeic_review_v1").Q1.due],[2,T+3],"段階2は3日後");
      reviewUpdate("Q1",true);  eq([mem.load("toeic_review_v1").Q1.st,mem.load("toeic_review_v1").Q1.due],[3,T+7],"段階3は7日後");
      reviewUpdate("Q1",true);  ok(!mem.load("toeic_review_v1").Q1,"段階3で正解 → 一覧から外れる");
      reviewUpdate("Q2",true);  ok(!mem.load("toeic_review_v1").Q2,"一覧にない問題の正解は何もしない");
      reviewUpdate("Q3",false); reviewUpdate("Q3",true); reviewUpdate("Q3",false);
      eq(mem.load("toeic_review_v1").Q3.st,0,"段階1で間違えた → 段階0へ");
      eq(mem.load("toeic_miss_v1").Q3,1,"旧キー toeic_miss_v1 も現行と同じ意味で更新");
    } finally { window.loadJSON=real.load; window.saveJSON=real.save; window.dayNumber=real.today; }
  }

  /* ===== 4. 単語の箱と間隔（現行の規則のまま） ===== */
  group("単語の箱と間隔（V_INT）");
  eq(V_INT,[0,1,3,7,14,30,90],"箱ごとの日数は現行のまま");
  eq(Object.keys(V_LV).map(Number),[1,2,3,4,5,6,7],"レベルは7段");
  eq(Object.values(V_LV),["〜400","〜500","〜600","〜700","〜800","〜900","900〜"],"段の名前");

  /* ===== 5. Fx の層 ===== */
  group("Fx：層と設定");
  {
    const before=Fx.layer;
    Fx.setLayer("quiet"); eq(document.documentElement.dataset.layer,"quiet","模試の層＝quiet を <html> に反映");
    Fx.lastHaptic=null; Fx.haptic("correct"); eq(Fx.lastHaptic,null,"模試の層では正解の触覚を出さない");
    Fx.setLayer("expressive"); Fx.haptic("correct"); eq(Fx.lastHaptic,"correct","練習の層では出す");
    Fx.setLayer(before);
    eq(PREFS_DEFAULT.sfx,0,"効果音は既定で切");
  }

  asyncTest.then(render,e=>{ results.push({g:"非同期",ok:false,msg:String(e)}); render(); });
  function render(){
    const n=results.length, bad=results.filter(r=>!r.ok);
    const gs=[...new Set(results.map(r=>r.g))];
    const body=`<section class="card"><h1 class="h h2">自己テスト</h1><p class="${bad.length?"":"mut"}" id="tsum" data-pass="${n-bad.length}" data-fail="${bad.length}">${n-bad.length} / ${n} 件 合格${bad.length?` ・ <b style="color:var(--c-wrong)">${bad.length} 件 不合格</b>`:""}</p>
      <p class="note">本物の記録には触れません（メモリの保存先で確認しています）。</p></section>`+
      gs.map(g=>`<h2 class="sec-h">${esc(g)}</h2><ul class="tres">`+results.filter(r=>r.g===g).map(r=>`<li class="${r.ok?"ok":"ng"}">${r.ok?"合格":"不合格"}：${esc(r.msg)}</li>`).join("")+`</ul>`).join("")+
      `<a class="btn sec" href="./" style="margin-top:16px">アプリへもどる</a>`;
    Shell.render({tabs:false,top:`<div class="topbar" style="padding-left:var(--gutter)"><div class="t"><b>自己テスト（index.html?test）</b></div></div>`,body});
    window.__SELFTEST={pass:n-bad.length,fail:bad.length,failures:bad};
    console.log("SELFTEST",n-bad.length,"/",n, bad.length?bad:"");
  }
})();
