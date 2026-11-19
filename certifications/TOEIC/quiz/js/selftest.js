/* ===== 自己テスト（index.html?test） =====
   UX設計書 7.5：「入力と期待する答えの組」を同じアプリの中に持つ。外部の道具は足さない。
   本物の記録（localStorage）には一切さわらない：テストはすべてメモリの保存先（MemoryBackend）で行う。 */
"use strict";
(function(){
  const results=[]; let grp="";
  const ok=(c,msg)=>results.push({g:grp,ok:!!c,msg});
  const eq=(a,b,msg)=>ok(JSON.stringify(a)===JSON.stringify(b),msg+(JSON.stringify(a)===JSON.stringify(b)?"":` （期待 ${JSON.stringify(b)} ／ 実際 ${JSON.stringify(a)}）`));
  const group=g=>{ grp=g; };
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

  /* ===== 6. 段階1：表と純粋な関数 ===== */
  /* app.js の記録の関数は全体の Store を使うので、テストの間だけメモリの保存先へ差しかえる */
  function withMem(fn,day){
    const mem=createStore(MemoryBackend(),{delay:0}); mem.init();
    const real={load:window.loadJSON,save:window.saveJSON,today:window.dayNumber};
    const realRm=window.removeJSON;
    window.loadJSON=k=>mem.load(k); window.saveJSON=(k,v)=>mem.save(k,v); window.removeJSON=k=>mem.remove(k); window.dayNumber=()=>day==null?T:day;
    const end=()=>{ window.loadJSON=real.load; window.saveJSON=real.save; window.removeJSON=realRm; window.dayNumber=real.today; };
    let r; try{ r=fn(mem); }catch(e){ end(); throw e; }
    if(r&&typeof r.then==="function") return r.then(v=>{ end(); return v; },e=>{ end(); throw e; });
    end(); return r;
  }
  group("表：PART_SPEC・MODE・SECTIONS・保存キー");
  {
    eq(PARTS.map(p=>PART_SPEC[p].size),[6,10,4,4,10,2,3],"標準の量は現行の PART_SIZE と同じ（1:6, 2:10, 3・4:4, 5:10, 6:2, 7:3）");
    ok(PARTS.every(p=>["single","multi","reader"].includes(PART_SPEC[p].layout)&&typeof PART_SPEC[p].qs==="function"&&typeof PART_SPEC[p].est==="function"),"どの Part にも layout・qs・est がある");
    eq(PARTS.filter(p=>PART_SPEC[p].audio),[1,2,3,4],"音声があるのは Part 1〜4");
    eq(PARTS.filter(p=>PART_SPEC[p].layout==="reader"),[6,7],"設問トレイは Part 6・7");
    ok(PARTS.filter(p=>PART_SPEC[p].audio).every(p=>typeof PART_SPEC[p].segs==="function"&&typeof PART_SPEC[p].script==="function"),"音声の Part は、行からの再生の材料（segs・script）を持つ");
    eq(Object.keys(MODE),["practice","review","mock"],"モードは3つ");
    eq([MODE.practice.feedback,MODE.review.feedback,MODE.mock.feedback],[true,true,false],"正誤を出すのは練習と解き直しだけ（模試は出さない）");
    eq([MODE.mock.layer,MODE.mock.lockAudio,MODE.mock.flag],["quiet",true,false],"模試：静かな層・音声は1回だけ・報告ボタンなし");
    eq(SECTIONS.L.parts.concat(SECTIONS.R.parts),PARTS,"セクションは Part 1〜4 と 5〜7");
    eq([sectionOf(4),sectionOf(5),READ_MIN],["L","R",75],"リーディングは75分");
    const old={schema:"toeic_schema",profile:"toeic_profile_v1",prefs:"toeic_prefs_v1",ent:"toeic_ent_v1",review:"toeic_review_v1",day:"toeic_day_v1",mockhist:"toeic_mockhist_v1",
      stat:"toeic_stat_v1",seen:"toeic_seen_v1",flag:"toeic_flag_v1",vocab:"toeic_vocab_v1",vlog:"toeic_vlog_v1",miss:"toeic_miss_v1",speed:"toeic_speed_v1",vset:"toeic_vset_v1"};
    eq(Object.fromEntries(Object.keys(old).map(k=>[k,K[k]])),old,"記述子の一覧から作ったキーは、段階0のキーと1字も違わない（保存データを壊さない）");
    eq(Object.keys(K).filter(k=>!(k in old)),["mockrun"],"段階2で足したキーは「模試の途中の状態」だけ（toeic_mockrun_v1:回）");
    ok(KEYS.every(d=>d.key.startsWith(KEY_PREFIX)&&d.what)&&new Set(KEYS.map(d=>d.key)).size===KEYS.length,"キーはすべて toeic_ で始まり、重なりがなく、説明がある");
    eq([PREFS_DEFAULT.tray,PREFS_DEFAULT.reviewOrder],["auto","mix"],"新しい設定の既定：トレイは自動（3段階）・解き直しはPartをまぜる");
    const mk={n:9,part1:[{id:"M09-P1-01",num:1,tag:"x",c:["a","b","c","d"],a:2,e:"e"}],part3:[{id:"M09-P3-01",qs:[{num:32,q:"q1",c:[1,2,3,4],a:0},{num:33,q:"q2",c:[1,2,3,4],a:1}]}]};
    const U=buildUnits(mk);
    eq(U[1][0].qs.map(q=>q.qid),["M09-P1-01"],"1問の Part は unit の id がそのまま設問の id");
    eq(U[3][0].qs.map(q=>[q.qid,q.bi]),[["M09-P3-01.1",1],["M09-P3-01.2",2]],"セットの設問の id は「unit.番号」（現行と同じ）");
  }
  group("練習の量（短い・標準・全部）");
  eq([practiceSize(5,"short",30),practiceSize(5,"std",30),practiceSize(5,"all",30)],[5,10,30],"Part 5：短い5・標準10・全部30");
  eq([practiceSize(7,"short",15),practiceSize(6,"short",4),practiceSize(1,"std",3)],[2,1,3],"短いは半分を切り上げ。残りが少なければその数まで");
  group("解き直しの段階（reviewNext：純粋な関数）");
  {
    const G=REVIEW_GAP;
    eq(reviewNext(undefined,false,T,G),{st:0,due:T,n:1},"一覧にない問題を間違えた → 段階0・当日から");
    eq(reviewNext({st:0,due:T,n:1},false,T,G),{st:0,due:T+1,n:2},"段階0で間違えた → 段階0のまま翌日");
    eq(reviewNext({st:0,due:T,n:1},true,T,G),{st:1,due:T+1,n:1},"段階0 → 正解で段階1（翌日）");
    eq(reviewNext({st:1,due:T,n:1},true,T,G),{st:2,due:T+3,n:1},"段階1 → 正解で段階2（3日後）");
    eq(reviewNext({st:2,due:T,n:1},true,T,G),{st:3,due:T+7,n:1},"段階2 → 正解で段階3（7日後）");
    eq(reviewNext({st:3,due:T,n:1},true,T,G),null,"段階3 → 正解で一覧から外れる");
    for(const s of [1,2,3]) eq(reviewNext({st:s,due:T,n:2},false,T,G),{st:0,due:T+1,n:3},`段階${s}で間違えた → 段階0へ（翌日）、誤答の回数を足す`);
    eq(reviewNext(undefined,true,T,G),undefined,"一覧にない問題の正解は何も変えない");
    eq([reviewGaps(T,null),reviewGaps(T,T+15),reviewGaps(T,T+14),reviewGaps(T,T),reviewGaps(T,T-1)],[G,G,REVIEW_GAP_NEAR,REVIEW_GAP_NEAR,G],"受験日まで14日以内だけ間隔を縮める（過ぎたら元にもどす）");
    eq(REVIEW_GAP_NEAR,[0,1,2,4],"縮めた間隔：3日後→2日後、7日後→4日後");
    eq(reviewNext({st:1,due:T,n:1},true,T,REVIEW_GAP_NEAR).due,T+2,"受験日が近いとき、段階2は2日後");
    eq(reviewNext({st:2,due:T,n:1},true,T,REVIEW_GAP_NEAR).due,T+4,"受験日が近いとき、段階3は4日後");
    eq([dayOf("2027-01-24")-dayOf("2027-01-10"),dayOf(""),dayOf(null)],[14,null,null],"受験日の文字（YYYY-MM-DD）→ 日の番号");
    eq([dayLabel(T,T),dayLabel(T+1,T),dayLabel(T+3,T).startsWith("3日後（")],["今日","明日",true],"次に出る日の言い方");
  }
  group("解き直し：記録と一言（reviewUpdate・scheduleMsg・印）");
  withMem(mem=>{
    mem.save(K.profile,{exam:null});
    const r1=reviewUpdate("Z1",false); eq(scheduleMsg(r1,T),"解き直しの一覧に入れました（今日から出します）","初めて間違えた → 「今日から出します」");
    const r2=reviewUpdate("Z1",true);  eq(scheduleMsg(r2,T),"次は明日に出します","正解して段階が進んだ → 次に出る日");
    const r3=reviewUpdate("Z1",false); eq(scheduleMsg(r3,T),"明日にもう一度出します","解き直しでまた間違えた → 翌日にもう一度");
    eq(scheduleMsg(reviewUpdate("Z9",true),T),"","一覧にない問題の正解は何も言わない");
    mem.save(K.review,{Z2:{st:3,due:T,n:1}}); eq(scheduleMsg(reviewUpdate("Z2",true),T),"解き直しの一覧から外れました","段階3で正解 → 一覧から外れた、と言う");
    const exam=Math.floor(Date.UTC(2027,0,1)/86400000);
    withMem(m3=>{ m3.save(K.profile,{exam:"2027-01-01"}); m3.save(K.review,{Z3:{st:1,due:exam-10,n:1}}); reviewUpdate("Z3",true); eq(m3.load(K.review).Z3,{st:2,due:exam-10+2,n:1},"受験日の10日前：段階2は2日後（記録でも縮む）"); },exam-10);
    reviewMark("Z4",true); eq([mem.load(K.review).Z4,mem.load(K.miss).Z4],[{st:0,due:T+1,n:0},1],"「あとで解き直す」→ 翌日から出す（旧キーにも入れる）");
    reviewMark("Z4",false); ok(!mem.load(K.review).Z4&&!mem.load(K.miss).Z4,"印を外すと一覧から外れる");
    const st0=JSON.stringify(mem.load(K.stat)), rv0=JSON.stringify(mem.load(K.review));
    eq(recordResult({part:5},{qid:"Z5",a:1,tag:"t"},{pick:-1,peek:true,ms:10}),null,"解かずに見た（peek）問題は記録しない");
    ok(JSON.stringify(mem.load(K.stat))===st0&&JSON.stringify(mem.load(K.review))===rv0,"peek では成績も解き直しの段階も変わらない（段階が進まない）");
    recordResult({part:5},{qid:"Z6",a:1,tag:"t"},{pick:-1,ms:10});
    eq([mem.load(K.review).Z6.st,mem.load(K.stat)["P5|t"].ok],[0,0],"「わからない」は不正解として記録し、解き直しの一覧に入れる");
  });
  group("解き直し：旧キー toeic_miss_v1 からの引きつぎ → 段階の計算");
  {
    const be=MemoryBackend({toeic_miss_v1:JSON.stringify({"P5-03":2,"P7S-02.1":1,"P2-09":0})}), st=createStore(be,{delay:0}); st.init();
    migrateStore(st,T);
    const rv=st.load(K.review);
    eq(rv,{"P5-03":{st:0,due:T,n:2},"P7S-02.1":{st:0,due:T,n:1}},"誤答の回数 → 段階0・今日（回数0の記録は引きつがない）");
    eq(reviewNext(rv["P5-03"],true,T,REVIEW_GAP),{st:1,due:T+1,n:2},"引きついだ記録も、正解で段階1（翌日）へ進む");
    eq(reviewNext(rv["P7S-02.1"],false,T,REVIEW_GAP),{st:0,due:T+1,n:2},"引きついだ記録で間違えたら、翌日にもう一度");
    eq(be.getItem("toeic_miss_v1"),JSON.stringify({"P5-03":2,"P7S-02.1":1,"P2-09":0}),"旧キーは消さず、中身も変えない");
  }
  group("解説の型（根拠・言い換え・ひっかけ）");
  {
    const e="東の入口が閉鎖される間は正面入口を使うよう案内する内容。つまり一時的な変更を知らせる告知。開館時間の変更や寄付の依頼は本文に述べられていない。";
    eq(explainParts(e),[["根拠","東の入口が閉鎖される間は正面入口を使うよう案内する内容。"],["言い換え","つまり一時的な変更を知らせる告知。"],["ひっかけ","開館時間の変更や寄付の依頼は本文に述べられていない。"]],"1文目＝根拠、否定の文から後＝ひっかけ、その間＝言い換え");
    eq(explainParts("be successful in で「〜に成功する」。名詞 success は補語にならない。").map(x=>x[0]),["根拠","ひっかけ"],"言い換えの文が無ければ出さない");
    eq(explainParts("1文だけの解説。"),[["根拠","1文だけの解説。"]],"1文だけなら根拠だけ");
    eq(explainParts({basis:"a",para:"",trap:"c"}),[["根拠","a"],["ひっかけ","c"]],"データ側で分けてあれば、そのまま使う");
    eq(explainParts(e).map(x=>x[1]).join(""),e,"分けても文は1字も変えない・落とさない");
  }
  group("音声：行の始まりの推定・文の分け方");
  {
    eq(Player.estimateStarts([{say:"aaaa",line:0},{sil:1},{say:"bbbb",line:1}],5),{0:0,1:3},"無音を除いた時間を字数で割り振る（4字=2秒、無音1秒）");
    eq(Player.estimateStarts([{say:"Number 1."},{sil:.8},{say:"A."},{say:"xx",line:0}],0),{0:0.8},"長さが分からないときは無音だけで数える");
    eq(splitSentences("Mr. Lee will arrive at 3 p.m. today. Please greet him. Thanks!"),["Mr. Lee will arrive at 3 p.m. today.","Please greet him.","Thanks!"],"Mr. や p.m. の後では文を切らない");
    const r={num:7,prompt:"Where?",c:["x","y","z"],a:1};
    eq(PART_SPEC[2].segs(r).filter(g=>g.line!=null).map(g=>g.line),[0,1,2,3],"Part 2：問いかけ＋3つの応答が行になる");
    eq(PART_SPEC[2].script(r).lines.map(l=>[l.lab,!!l.ok]),[["Q",false],["A",false],["B",true],["C",false]],"スクリプトの行と正解の印");
  }
  group("設問トレイの段階（UX設計書 5.4）");
  eq([Tray.countFor(600,1,"auto"),Tray.countFor(480,2,"auto")],[3,3],"ふつうは3段階（小・中・大）");
  eq([Tray.countFor(479,1,"auto"),Tray.countFor(700,3,"auto"),Tray.countFor(700,4,"auto")],[2,2,2],"読む領域が480px未満、または文字が特大以上なら2段階");
  eq(Tray.countFor(900,0,"switch"),2,"設定「文書と切り替え」ならいつも2段階（型C）");
  eq([Tray.stagesOf(3),Tray.stagesOf(2)],[["s","m","l"],["s","l"]],"段階の並び");
  eq(TRAY_MID,0.46,"中は読む領域の46%");

  /* ===== 7. 段階1：解く画面の流れ（画面を実際に描く。記録はメモリの保存先） ===== */
  const fr=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const key=k=>document.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,cancelable:true}));
  const bottomText=()=>(document.getElementById("bottom").textContent||"").replace(/\s+/g," ");
  const uiTest=()=>withMem(async mem=>{
    loadData();
    if(!MOCKS.length){ ok(false,"問題データが読めない（画面の流れのテストを省略）"); return; }
    group("練習（Part 5）：解答前に「次へ」が出ない・解説の型");
    startPractice(5,"std"); await fr();
    eq(S.units.length,10,"標準の量は10問");
    ok(!/次へ|結果を見る/.test(bottomText()),"解答前は下のバーに「次へ」が無い");
    ok(/わからない/.test(bottomText()),"解答前の下のバーは「わからない」だけ");
    const q=cur().qs[0], wrong=(q.a+1)%q.c.length;
    pick(q.qid,wrong); await fr();
    ok(/次へ/.test(bottomText()),"解答すると「次へ」が現れる");
    const af=[...document.querySelector(".after").children].map(e=>e.className.split(" ")[0]);
    eq([af[0],af[af.length-1]],["bnr",""],"解説の順：①判定が先頭、④「あとで解き直す」が最後");
    ok(af.indexOf("ex")>af.indexOf("bnr")&&af.indexOf("trans")<af.indexOf("ex"),"②訳（スクリプト）→ ③解説（根拠・言い換え・ひっかけ）の順");
    ok(document.querySelector(".choice.is-ok .mk path")&&document.querySelector(".choice.is-ng .mk path"),"正解は✓、選んだ誤答は×の形でも示す（色に頼らない）");
    ok(/不正解/.test(document.querySelector(".bnr").textContent)&&/正解 [A-D]/.test(document.querySelector(".bnr").textContent),"判定は文字でも「不正解・正解 B」と書く");
    eq(mem.load(K.review)[q.qid],{st:0,due:T,n:1},"間違えた問題は段階0・今日で一覧に入る");
    key("Enter"); await fr();
    eq(S.i,1,"Enter で次の問題へ");
    ok(!/次へ/.test(bottomText()),"次の問題でも、解答前は「次へ」が無い");
    const q2=cur().qs[0]; key("ABCD"[q2.a].toLowerCase()); await fr();
    ok(S.ans[q2.qid]&&S.ans[q2.qid].pick===q2.a,"キー（a〜d）で選べる");
    ok(/正解/.test(document.querySelector(".bnr").textContent),"正解の判定");
    key("Enter"); await fr(); key("0"); await fr();
    ok(S.ans[cur().qs[0].qid].pick===-1&&/答えを確認/.test(document.querySelector(".bnr").textContent),"0 で「わからない」→ 中立の判定");
    key("Enter"); await fr();
    for(let i=S.i;i<10;i++){ key("1"); await fr(); key("Enter"); await fr(); }
    ok(S.view==="results","キーだけで10問を終えて結果へ");
    ok(document.querySelector('[data-act="reviewThese"]'),"結果の主ボタンは「間違えた◯問を解き直す」");

    group("解き直し：解く前に前回の答え・正解が見えない");
    startReview([q.qid]); await fr();
    const card=document.querySelector(`[data-qcard="${CSS.escape(q.qid)}"]`);
    ok(card&&!card.querySelector(".is-ok,.is-ng,.sel,[aria-pressed='true']"),"前に選んだ答えも正解も印が無い");
    ok(!document.querySelector("#page .bnr,#page .ex,#page .cmp"),"判定・解説も出ていない");
    ok(/解き直し/.test(document.getElementById("top").textContent),"札は「解き直し」");
    ok(card&&/解かずに解説を見る/.test(card.textContent),"逃げ道「解かずに解説を見る」がある");
    ok(!/次へ/.test(bottomText()),"解答前に「次へ」が無い（解き直し）");
    pick(q.qid,wrong); await fr();
    ok(document.querySelector(".cmp .ng")&&document.querySelector(".cmp .ok"),"また不正解 →「選んだ答え」と「正解」を上下に並べる");
    eq(mem.load(K.review)[q.qid],{st:0,due:T+1,n:2},"また不正解 → 段階0のまま翌日");
    ok(/明日にもう一度出します/.test(document.querySelector(".bnr").textContent),"「明日にもう一度出します」と書く");
    startReview([q.qid]); await fr();
    pick(q.qid,q.a); await fr();
    eq(mem.load(K.review)[q.qid],{st:1,due:T+1,n:2},"今度は正解 → 段階1（翌日）");
    ok(/解けました/.test(document.querySelector(".bnr").textContent)&&/次は明日に出します/.test(document.querySelector(".bnr").textContent),"「解けました」と次に出る日");
    startReview([q.qid]); await fr();
    const before=JSON.stringify(mem.load(K.review)[q.qid]);
    peek(q.qid); await fr();
    eq(JSON.stringify(mem.load(K.review)[q.qid]),before,"「解かずに解説を見る」では段階が進まない");
    ok(document.querySelector(".bnr.neutral")&&document.querySelector(".ex"),"見たときは中立の判定と解説");

    group("設問トレイ（Part 7）：キーだけで1セット");
    PR.tag={}; startPractice(7,"all"); await fr();
    const u=cur();
    ok(document.getElementById("tray")&&document.getElementById("docs"),"文書と設問トレイを別々に置く");
    eq(document.querySelectorAll("#qtabs .qchip").length,u.qs.length,"番号の札は設問の数");
    ok(!/次/.test(bottomText()),"解答前は「次の設問」「次へ」が無い");
    for(let k=0;k<u.qs.length;k++){ key(String(1+(k%4))); await fr(); key("Enter"); await fr(); }
    ok(u.qs.every(x=>S.ans[x.qid]),"1〜4 と Enter だけで、セットのすべての設問に答えた");
    eq(S.i,1,"セットの最後で Enter → 次の文書へ");
    ok(document.querySelectorAll("#qtabs .qchip .cm").length===0,"次の文書の札には、まだ✓／×が無い");
    S.i=0; showUnit({keep:true}); await fr();
    ok([...document.querySelectorAll("#qtabs .qchip")].every(c=>c.querySelector(".cm")&&/正解|不正解/.test(c.getAttribute("aria-label"))),"解いた札には✓／×の形と「正解／不正解」の名前（色に頼らない）");
    const pad=parseFloat(getComputedStyle(document.getElementById("docs")).paddingBottom), th=document.getElementById("tray").getBoundingClientRect().height;
    ok(Tray.isWide()||Math.abs(pad-(th+16))<1.5,"文書の下の余白＝トレイの高さ＋16px");
    Router.tab("today");
  });

  /* ===== 8. 段階2：模試 ===== */
  group("模試：MODE・時間の選び方・鍵つきの回");
  {
    eq([MODE.mock.sections,MODE.mock.timed,!!MODE.mock.quitAsk],[true,true,true],"模試の MODE：セクション制・時間制・中断の確認の文言を持つ");
    eq([MODE.practice.sections,MODE.practice.timed,MODE.practice.quitAsk,MODE.review.timed],[false,false,"",false],"練習・解き直しは時間制なし・確認なし");
    eq(MOCK_MODE_ORDER,["real","x1.5","x2","none"],"時間の選び方は4つ（本番どおり／1.5倍／2倍／なし）");
    eq([rLimit("real"),rLimit("x1.5"),rLimit("x2"),rLimit("none")],[75*60000,112.5*60000,150*60000,null],"リーディングの時間：75分・112分30秒・150分・制限なし");
    eq([MOCK_MODES.real.limit,MOCK_MODES["x1.5"].limit,MOCK_MODES.x2.limit,MOCK_MODES.none.limit],[true,false,false,false],"時間が来て自動で採点するのは「本番どおり」だけ");
    ok(DEV_UNLOCK===false,"自己テストの URL（?unlock なし）では開発用の解放は効かない");
    withMem(mem=>{
      ok(!mockOpen({n:2,free:false})&&mockOpen({n:1,free:true}),"鍵つきの回（free:false）は、購入の記録が無ければ開かない");
      mem.save(K.ent,{unlocked:true}); ok(mockOpen({n:2,free:false}),"購入の記録（toeic_ent_v1.unlocked）があれば開く（段階5で使う）");
    });
  }
  group("模試：目安のスコア（6.2 の式・見本10組を手で計算した値）");
  {
    // [L正答, R正答, 使う回数k, 合計の下, 上, L下, L上, R下, R上]（Python で別に計算：中心=5+4.9r、幅=4.9√((1.28²·100p(1−p)+5²)/k+4²)、5点きざみ）
    const SAMPLES=[[72,64,1,595,765,320,400,275,365],[72,64,2,610,750,325,395,285,355],[72,64,3,620,740,330,390,290,350],[0,0,1,10,70,5,35,5,35],[100,100,1,930,990,465,495,465,495],
      [50,50,1,410,590,205,295,205,295],[90,85,1,790,940,410,480,380,460],[30,45,2,305,445,115,185,190,260],[95,98,3,905,990,445,495,460,495],[10,5,1,15,155,20,90,5,65]];
    for(const [l,r,k,...want] of SAMPLES){ const e=estimate(l,r,k); eq([e.lo,e.hi,e.L.lo,e.L.hi,e.R.lo,e.R.hi],want,`L${l}・R${r}・${k}回 → 目安 ${want[0]}〜${want[1]}`); }
    eq([.3,.5,.7,.9].map(p=>[1,2,3].map(k=>secHalf(p,k))),[[45,35,30],[45,35,30],[45,35,30],[35,30,25]],"6.3 の表（セクションの片側の幅）と一致");
    eq(estimate(72,64,1).c,680,"中心は2つの中心の和（設計書の例：680）");
    const h={n:1,L:36,nL:50,R:64,nR:100}; eq(runR(h,"L"),72,"音声が再生できず外した問題があるときは、残りの問題数で100問あたりに直す");
  }
  group("模試：「参考」になる3つの条件");
  {
    const base={mode:"real",attempt:1,auto:false,unL:0,unR:0};
    eq(refReasons(base),[],"本番どおり・1回目・未解答が少ない → 目安に使う");
    eq(refReasons(Object.assign({},base,{mode:"x1.5"})),["ext"],"① 時間を延ばした（1.5倍）→ 参考");
    eq(refReasons(Object.assign({},base,{mode:"x2"})),["ext"],"① 時間を延ばした（2倍）→ 参考");
    eq(refReasons(Object.assign({},base,{mode:"none"})),["none"],"① タイマーなし → 参考");
    eq(refReasons(Object.assign({},base,{attempt:2})),["again"],"② その回の2回目 → 参考");
    eq(refReasons(Object.assign({},base,{unL:20})),["unanswered"],"③ 自分で終えて、リスニングの未解答が20問 → 参考");
    eq(refReasons(Object.assign({},base,{unR:25})),["unanswered"],"③ 自分で終えて、リーディングの未解答が25問 → 参考");
    eq(refReasons(Object.assign({},base,{unL:19,unR:19})),[],"③ 未解答が19問ずつなら参考にしない");
    eq(refReasons(Object.assign({},base,{auto:true,unR:40})),[],"③ 時間切れで自動で採点した回は、未解答が多くても参考にしない（自分で終えた場合だけ）");
    eq(refReasons({mode:"x2",attempt:3,auto:false,unL:30,unR:0}),["ext","again","unanswered"],"3つが重なれば理由を全部書く");
    const day=864e5, now=200*day, mk=(at,L,R,counts)=>({n:1,at,L,R,nL:100,nR:100,counts});
    const H=[mk(now-100*day,90,90,true),mk(now-30*day,60,60,true),mk(now-20*day,99,99,false),mk(now-10*day,70,70,true),mk(now-5*day,80,80,true),mk(now-1*day,50,50,true)];
    const ce=currentEstimate(H,now); eq([ce.k,Math.round(ce.L.r)],[3,67],"いまの目安：参考の回と90日より前を除き、直近3回の平均（50・80・70 → 66.7）");
    eq(currentEstimate([mk(now,70,70,false)],now),null,"参考の回しか無ければ「いまの目安」は出さない");
  }
  group("模試：受けた回の記録（histEntry）");
  {
    const units=[{part:1,qs:[{qid:"a",a:0},{qid:"b",a:1}]},{part:5,qs:[{qid:"c",a:2},{qid:"d",a:3}]}];
    const h=histEntry({n:1,mode:"real",attempt:1,ans:{a:{pick:0},b:{pick:0},c:{pick:2}},skip:{b:1},rt:{5:1000},lUsed:5,rUsed:6,pauses:2},units,{auto:true,at:9});
    eq([h.L,h.nL,h.unL,h.R,h.nR,h.unR],[1,1,0,1,2,1],"正答数・採点した問題数・未解答（音声で外した問題は数えない）");
    eq([h.byPart[1],h.byPart[5],h.picks,h.pauses,h.counts],[[1,1],[1,2],{a:0,b:0,c:2},2,true],"Part別・選んだ答え・中断の回数・目安に使うか");
  }
  group("模試：リスニングの時間割");
  {
    const u3={part:3,qs:[1,2,3]}, u1={part:1,qs:[1]}, u2={part:2,qs:[1]};
    eq([lWindow(u1,"real"),lWindow(u2,"real"),lWindow(u3,"real")],[5000,5000,24000],"解答の間：Part 1・2 は1問5秒、Part 3・4 は1問8秒（3問で24秒）");
    eq([lWindow(u3,"x1.5"),lWindow(u3,"x2"),lWindow(u3,"none")],[36000,48000,null],"延ばすと1.5倍・2倍、タイマーなしは制限なし");
    const units=[u1,u2,u3], c=mode=>({last:2,win:ai=>lWindow(units[ai],mode)});
    let st=TL.start(1000);
    eq([st.ph,st.until,st.ai,st.vi],["pre",4000,0,0],"「模試を始める」から3秒は音声の前");
    eq(TL.tick(st,3999,c("real")),st,"3秒たつまでは音声を始めない");
    st=TL.tick(st,4000,c("real")); eq(st.ph,"play","3秒後に最初の音声");
    eq(TL.next(TL.start(0),1,c("real")).vi,0,"音声の前は「次へ」で先へ進めない");
    st=TL.ended(st,20000,c("real")); eq([st.ph,st.until],["answer",25000],"音声が終わると解答の間（5秒）");
    const pv=TL.next(st,21000,c("real")); eq([pv.vi,pv.ai,pv.ph,pv.until],[1,0,"answer",25000],"「次へ」は先読み：次の設問を見せるが、音声の時間割は変えない");
    eq(TL.next(pv,21500,c("real")),pv,"先読みは1つ先まで");
    st=TL.tick(pv,25000,c("real")); eq([st.ai,st.ph,st.vi],[1,"play",1],"解答の間が終わると、次の音声が自動で始まる");
    st=TL.ended(st,40000,c("real")); st=TL.tick(st,45000,c("real")); eq([st.ai,st.ph],[2,"play"],"時間割どおりに進む");
    eq(TL.next(st,46000,c("real")),st,"最後の音声の途中は「次へ」で切り替えへ進めない");
    st=TL.ended(st,90000,c("real")); eq(TL.next(st,91000,c("real")).ph,"done","最後の音声のあとは「次へ」で切り替えへ");
    eq(TL.tick(st,90000+24000,c("real")).ph,"done","最後の解答の間が終わると切り替えへ");
    let sx=TL.ended({ai:2,ph:"play",until:0,vi:2},0,c("x2")); eq(sx.until,48000,"2倍：解答の間も2倍");
    let sn=TL.ended({ai:0,ph:"play",until:0,vi:0},5000,c("none")); eq(sn.ph,"wait","タイマーなし：音声のあとは「次へ」を待つ");
    eq(TL.tick(sn,5000+3600000,c("none")),sn,"タイマーなし：1時間待っても進まない");
    sn=TL.next(sn,9000,c("none")); eq([sn.ai,sn.ph,sn.until,sn.vi],[1,"pre",11000,1],"タイマーなし：「次へ」から2秒後に次の音声");
    let sp=TL.next({ai:0,ph:"play",until:0,vi:0},1000,c("none")); sp=TL.ended(sp,3000,c("none")); eq([sp.ai,sp.ph,sp.until],[1,"pre",5000],"タイマーなし：先に「次へ」を押していれば、音声のあと2秒で次へ");
    eq(TL.resume({ai:1,ph:"play",vi:1},100),{ai:1,ph:"pre",until:3100,vi:1},"再開：音声の途中で中断 → その音声を最初から（3秒後）");
    eq(TL.resume({ai:1,ph:"answer",left:4200,vi:2},100),{ai:1,ph:"answer",until:4300,vi:2},"再開：解答の間で中断 → 残りの秒から・見ていた設問のまま");
  }
  group("模試：採点の記録は1回の読み書き（recordResults）");
  withMem(mem=>{
    const items=[]; for(let i=0;i<200;i++) items.push({unit:{part:1+i%7},q:{qid:"R"+i,a:i%4,tag:"t"+(i%5)},ans:i%3?{pick:i%4,ms:100}:undefined});
    const real=window.saveJSON; let n=0; window.saveJSON=(k,v)=>{ n++; real(k,v); };
    try{ recordResults(items); } finally { window.saveJSON=real; }
    eq(n,3,"200問の記録で、保存は3回（成績・解き直し・旧キー）だけ");
    const a=JSON.stringify([mem.load(K.stat),mem.load(K.review),mem.load(K.miss)]);
    withMem(m2=>{ for(const it of items) recordResult(it.unit,it.q,it.ans); eq(JSON.stringify([m2.load(K.stat),m2.load(K.review),m2.load(K.miss)]),a,"1問ずつ記録したときと同じ中身になる"); });
  });

  /* 模試の流れ（画面を実際に描く。時計は差しかえ、音声は鳴らない偽物の <audio> で確かめる） */
  class FakeAudio{
    constructor(src){ this.src=src; this.paused=true; this.ended=false; this.currentTime=0; this.duration=20; this.playbackRate=1; this.readyState=4; this._l={}; FakeAudio.made.push(this); }
    addEventListener(t,f){ (this._l[t]=this._l[t]||[]).push(f); } removeEventListener(){}
    _fire(t){ (this._l[t]||[]).slice().forEach(f=>f()); }
    play(){ this.paused=false; this.ended=false; Promise.resolve().then(()=>this._fire("playing")); return Promise.resolve(); }
    pause(){ if(this.paused) return; this.paused=true; this._fire("pause"); }
    load(){} removeAttribute(){}
    finish(){ this.currentTime=this.duration; this.ended=true; this.paused=true; this._fire("ended"); }
  }
  FakeAudio.made=[];
  const mockTest=()=>withMem(async mem=>{
    if(!MOCKS.length) return;
    const realAudio=window.Audio, realNow=Clock.now; let now=1e12;
    window.Audio=FakeAudio; Clock.now=()=>now;
    const adv=async ms=>{ now+=ms; Mock.tick(); await fr(); };
    const fa=()=>FakeAudio.made[FakeAudio.made.length-1];
    const seen={feedback:0,buy:0}; const watch=()=>{ if(document.querySelector("#page .bnr,#page .is-ok,#page .is-ng,#page .ex")) seen.feedback++; if(/購入|¥|円で/.test((document.getElementById("shell").textContent||""))) seen.buy++; };
    const sounds=[]; const realSound=Fx.sound, realHap=Fx.haptic; Fx.sound=n=>{ sounds.push([Fx.layer,n]); realSound(n); };
    try{
      group("模試：一覧（M1）と準備（M2）");
      Router.tab("mock"); await fr();
      ok(document.querySelectorAll("#page .rowb").length>=MOCK_PLANNED,"一覧に10回分の行（データの無い回は「準備中」）");
      const lockRow=document.querySelector('#page [data-act="mLocked"]');
      ok(!!lockRow&&/未購入/.test(lockRow.textContent)&&lockRow.querySelector(".ic"),"鍵つきの回は錠の印＋「未購入」");
      tap('#page [data-act="mLocked"]'); await fr();
      ok(/準備中/.test((document.getElementById("lockmsg")||{}).textContent||"")&&!document.querySelector("dialog[open]"),"鍵つきの回を押すと「準備中」とだけ出す（シートは開かない）");
      ok(!!document.querySelector('#page [data-act="none"][disabled]'),"データの無い回は押せない");
      Router.go("mockprep",{n:1}); await fr();
      ok(!S&&FakeAudio.made.length===0&&!mem.has(Mock.runKey(1)),"準備の画面では何も始まらない（音声・時間・保存なし）");
      eq(document.querySelectorAll('#page [data-act="mMode"]').length,4,"時間の選び方は4つ");
      ok(document.querySelector('[data-act="mMode"][data-v="real"][aria-pressed="true"]'),"既定は「本番どおり」");
      ok(/目安のスコアの計算に使うのは「本番どおり」の回だけ/.test(document.getElementById("page").textContent),"スコアの扱いを1行で書く");
      ok(/模試を始める/.test(bottomText()),"主ボタンは「模試を始める」");
      await adv(10000); ok(!S&&FakeAudio.made.length===0,"待っていても始まらない");

      group("模試：リスニング（M3）");
      tap('[data-act="mStart"]'); await fr();
      ok(S&&S.mode==="mock"&&S.run.mode==="real","「模試を始める」で始まる");
      eq(Fx.layer,"quiet","静かな試験層");
      eq(FakeAudio.made.length,0,"押した直後はまだ音声を流さない");
      ok(/音声まで 3秒/.test(document.getElementById("mst").textContent),"「音声まで 3秒」と出す");
      await adv(2900); eq(FakeAudio.made.length,0,"2.9秒ではまだ流さない");
      await adv(100); eq(FakeAudio.made.length,1,"3秒で最初の音声");
      await Promise.resolve(); await fr();
      ok(!fa().paused,"音声が流れている");
      // 止める・もどす・速くする操作をすべて試す
      fa().currentTime=7;
      ACT.pltoggle(); ACT.plback(); ACT.plspeed(); Player.toggle(); Player.back(5); Player.seekTo(0,true); Player.cycleSpeed();
      for(const k of [" ","ArrowLeft","k","s","0","p","Spacebar"]) key(k);
      await fr();
      ok(!fa().paused&&fa().currentTime===7&&fa().playbackRate===1,"キー・ボタン・関数のどれでも、止める・もどす・速くすることができない");
      ok(!document.querySelector('#top [data-act="plback"],#top [data-act="plspeed"],#top .pl-seek'),"帯に一時停止・5秒もどる・速さ・再生位置の操作が無い");
      ok(document.querySelector("#plb").hidden,"「音声を始める」は、自動再生が止められたときだけ");
      tap('[data-act="menu"]'); await fr();
      ok(!document.querySelector('#menu [data-act="flag"]'),"⋯ に「この問題はおかしい」が無い（模試中）");
      tap('#menu [data-act="qset"]'); await fr();
      tap('#qsetdlg [data-act="qpref"][data-k="text"][data-v="3"]'); await fr();
      tap('#qsetdlg [data-act="qpref"][data-k="theme"][data-v="dark"]'); await fr();
      closeDlg("qsetdlg"); setPref("text",1); setPref("theme","auto");
      ok(!fa().paused&&fa().currentTime===7&&fa().playbackRate===1&&FakeAudio.made.length===1,"表示の設定（文字・外観）を変えても音声は止まらない");
      const u0=cur(); pick(u0.qs[0].qid,u0.qs[0].a); await fr(); watch();
      ok(S.ans[u0.qs[0].qid],"解答できる");
      eq(JSON.stringify(mem.load(Mock.runKey(1)).ans),JSON.stringify(S.ans),"解答のたびに保存");
      fa().finish(); await fr();
      eq(S.T.ph,"answer","音声が終わると解答の時間");
      ok(/解答の時間 あと 5秒/.test(document.getElementById("mst").textContent),"「解答の時間 あと5秒」");
      const before=FakeAudio.made.length; key("Enter"); await fr();
      eq([S.i,S.T.ai,FakeAudio.made.length],[1,0,before],"「次へ」で次の設問を先に見せる（音声はまだ）");
      ok(/音声まで \d+秒/.test(document.getElementById("mst").textContent),"先読み中は「音声まで ◯秒」");
      key("Enter"); await fr(); eq(S.i,1,"先読みは1つ先まで");
      await adv(5000); eq([S.T.ai,S.T.ph,FakeAudio.made.length],[1,"play",before+1],"時間割どおりの時刻に次の音声");
      watch();

      group("模試：中断と再開（リスニング）");
      fa().finish(); await adv(3000);
      const leftBefore=S.T.until-now;
      Mock.interrupt(); await fr();
      eq(S.view,"resume","裏に回ると音声と時間を止め、「中断していました」の1枚");
      ok(/中断していました/.test(document.getElementById("page").textContent),"「中断していました」");
      const sv=mem.load(Mock.runKey(1));
      eq([sv.phase,sv.L.ph,sv.L.ai,sv.pauses],["L","answer",1,1],"保存：リスニング・解答の時間・同じ問題・中断1回");
      await adv(60000); eq(mem.load(Mock.runKey(1)).L.left,sv.L.left,"止めている間は時間が進まない");
      Router.tab("today"); await fr(); ok(!S,"「今日」へ（途中の状態は残る）");
      ok(/模試 1 の続きから/.test(document.getElementById("page").textContent),"「今日」の主の札が「模試1の続きから」");
      Mock.open(1); await fr(); tap('[data-act="mResume"]'); await fr();
      ok(Math.abs((S.T.until-now)-leftBefore)<=2000&&S.T.ph==="answer"&&S.i===1,"再開：同じ問題・解答の時間の残りの差が2秒以内");
      ok(!!S.ans[u0.qs[0].qid],"再開しても解答が消えない");
      const nAud=FakeAudio.made.length; Mock.interrupt(); await fr(); Router.tab("today"); await fr();
      // 再生中に中断 → その音声を最初から
      Mock.open(1); await fr(); tap('[data-act="mResume"]'); await fr();
      await adv(5000); await adv(10); fa().finish(); await fr(); // 次の音声
      const a2=S.T.ai; Mock.interrupt(); await fr(); Mock.resume(); await fr();
      eq([S.T.ai,S.T.ph],[a2,"answer"],"中断の直後に「続ける」：同じ音声の続き（解答の時間）");

      group("模試：切り替え（M4）");
      for(let g=0;g<80&&S.run.phase==="L";g++){ if(S.T.ph==="play"){ fa().finish(); await fr(); } await adv(30000); }
      eq([S.run.phase,S.view],["gate","gate"],"リスニングの最後のあと、切り替えの画面");
      ok(/リーディングを始める/.test(bottomText())&&/ここで中断する/.test(bottomText()),"「リーディングを始める」と「ここで中断する」");
      eq(Player.state,"idle","切り替えでは音声を止める");
      await adv(10*60000); eq(mem.load(Mock.runKey(1)).rUsed,0,"押すまで時間を数えない（10分待っても0）");
      Mock.suspend(); await fr(); ok(!S&&mem.load(Mock.runKey(1)).phase==="gate","切り替えの画面で中断できる");
      Mock.open(1); await fr(); tap('[data-act="mResume"]'); await fr();
      eq(S.view,"gate","再開すると切り替えの画面にもどる");
      watch();

      group("模試：リーディング（M5）と解答状況（M6）");
      tap('[data-act="beginReading"]'); await fr();
      eq([S.run.phase,cur().part],["R",5],"「リーディングを始める」で Part 5 から");
      ok(/残り 75:00/.test(document.getElementById("top").textContent),"残り 75:00 から数える");
      ok(document.querySelector('#top [data-act="mGrid"]')&&/101 \/ 200/.test(document.getElementById("top").textContent),"上のバー：残り時間・番号「101 / 200」・一覧・中断");
      ok(/前へ/.test(bottomText())&&/見直す/.test(bottomText())&&/次へ/.test(bottomText()),"下のバー：前へ・あとで見直す・次へ");
      key("b"); await fr(); key("ArrowRight"); await fr(); key("f"); await fr();
      ok(S.mark[cur().qs[0].qid]&&S.i===S.info.firstR+1,"キーで選ぶ・次へ（→）・F で印");
      key("ArrowLeft"); await fr(); eq(S.i,S.info.firstR,"← で前の問題にもどれる");
      await adv(10*60000);
      ok(/残り 65:00/.test(document.getElementById("top").textContent),"10分で残り 65:00");
      const rLeft=()=>rLimit("real")-mem.load(Mock.runKey(1)).rUsed;
      Mock.save(); const l1=rLeft(); Mock.interrupt(); await fr(); Mock.resume(); await fr();
      ok(Math.abs(rLeft()-l1)<=2000&&S.i===S.info.firstR,"中断して再開：同じ問題・残り時間の差2秒以内");
      key("g"); await fr(); eq(S.view,"grid","G で解答状況");
      eq(document.querySelectorAll("#page .gq:not(.sw)").length,100,"101〜200 の100問");
      ok(document.querySelector("#page .gq.done")&&document.querySelector("#page .gq.marked"),"解答ずみ（塗り）・あとで見直す（塗り＋角の印）");
      ok([...document.querySelectorAll("#page .gq:not(.sw)")].every(b=>b.getBoundingClientRect().height>=47.5&&b.getBoundingClientRect().width>=47.5),"番号のボタンは48px以上");
      tap('[data-act="mGridF"][data-v="open"]'); await fr();
      eq(document.querySelectorAll("#page .gq:not(.sw)").length,99,"「未解答だけ」でしぼれる");
      Mock.interrupt(); await fr(); Mock.resume(); await fr(); eq(S.view,"grid","解答状況の画面で中断 → 再開すると解答状況");
      const g7=[...document.querySelectorAll("#page .gq:not(.sw)")].find(b=>+b.textContent===150); ACT[g7.dataset.act](g7.dataset,g7); await fr();
      ok(S.view==="unit"&&cur().part===7&&curQnum()===150,"番号を押すとその問題へ（Part 7 はトレイの設問）");
      watch();
      await adv(4*60000); ok(!document.querySelector(".mnote"),"残り61分では知らせなし");
      await adv(46*60000+1000); ok(/残り15分です/.test((document.querySelector(".mnote")||{}).textContent||""),"残り15分で細い知らせ（閉じるまで残る）");
      await adv(5000); ok(document.querySelector(".mnote"),"知らせは勝手に消えない");
      tap('[data-act="mNoteClose"]'); await fr(); ok(!document.querySelector(".mnote"),"閉じると消える");
      tap('[data-act="mClock"]'); await fr(); ok(!document.getElementById("mclk"),"残り時間は押すと隠せる");
      tap('[data-act="mClock"]'); await fr();
      eq(sounds.filter(s=>s[0]==="quiet").length+seen.feedback+seen.buy,0,"ここまで、正誤・効果音・購入の案内は一度も出ていない");

      group("模試：時間切れ（本番どおり）と結果（M7）");
      Mock.save(); await adv(rLimit("real")-mem.load(Mock.runKey(1)).rUsed-2000); ok(S&&!S.done,"75分の2秒前ではまだ続く");
      await adv(2500);
      ok(!S&&Router.top().name==="mockresult","本番どおり：75分で自動的に採点へ");
      const H=Mock.hist(); eq([H.length,H[0].auto,H[0].mode,H[0].counts],[1,true,"real",true],"受けた回の記録（時間切れ・本番どおり・目安に使う）");
      ok(!mem.has(Mock.runKey(1)),"採点したら途中の状態を消す");
      eq(Fx.layer,"expressive","結果は練習の層");
      const e=histEstimate(H[0]);
      ok(document.getElementById("estLo")&&new RegExp(`${SECTIONS.L.name} ${e.L.lo}〜${e.L.hi}`).test(document.getElementById("page").textContent),"目安の幅とセクション別の幅を出す");
      ok(/目安です。本番の点数を保証するものではありません/.test(document.getElementById("page").textContent),"注記をいつも出す");
      ok(document.querySelector("details.how"),"「どう出したか」は開閉式");
      ok(/中断/.test(document.getElementById("page").textContent)&&H[0].pauses>=4,"中断の回数を記録して出す");
      ok(document.querySelectorAll("#page .prow").length===7,"Part別の7本の横棒");
      ok(document.querySelector('[data-act="reviewThese"]'),"主ボタンは「間違えた◯問を解き直す」");
      await new Promise(r=>setTimeout(r,1300));
      ok(Fx.reduced()||document.querySelectorAll(".fx-layer .fx-dot").length>0,"結果の数字に墨のしずく");
      eq(+document.getElementById("estLo").textContent,e.lo,"数え上がりのあと、数字は目安の下限");
      ok(mem.load(K.stat)&&Object.keys(mem.load(K.stat)).length>0&&Object.keys(mem.load(K.review)).length>0,"採点の結果を成績と解き直しに記録");

      group("模試：延ばす・タイマーなしは終わらない／未解答の確認／参考");
      for(const md of ["x1.5","none"]){
        Mock.prepMode=md; Router.go("mockprep",{n:1}); await fr();
        tap('[data-act="mStart"]'); await fr();
        tap('#askdlg [data-k="ok"]'); await fr();   // 2回目の確認
        eq(S.run.attempt,md==="x1.5"?2:3,md+"：その回の2回目以降として始まる");
        S.run.phase="gate"; Player.stop(); S.T=null; S.live=false; Mock.save(); Mock.resume(); await fr();
        tap('[data-act="beginReading"]'); await fr();
        await adv(76*60000); ok(S&&!S.done,md+"：75分を過ぎても終わらない");
        if(md==="x1.5"){ await adv(37*60000); ok(S&&!S.done&&/延ばした時間を過ぎました/.test(document.getElementById("top").textContent),"1.5倍：112分30秒を過ぎたら知らせるだけで続けられる"); ok(/超過/.test(document.getElementById("top").textContent),"超過の時間を出す"); }
        else { await adv(300*60000); ok(S&&!S.done&&/経過/.test(document.getElementById("top").textContent),"タイマーなし：6時間たっても終わらない（経過を数えるだけ）"); }
        Mock.finish(false); await fr();
        ok(document.querySelector("dialog#askdlg[open]")&&/未解答が \d+問あります。採点しますか/.test(document.getElementById("askdlg").textContent),"未解答があれば「採点しますか」と確かめる");
        tap('#askdlg [data-k="alt"]'); await fr();
        eq([S.view,S.gridF],["grid","open"],"「未解答を見る」で解答状況（未解答だけ）");
        Mock.finish(false); await fr(); tap('#askdlg [data-k="ok"]'); await fr();
        const last=Mock.hist().pop();
        eq(last.reasons,[md==="none"?"none":"ext","again","unanswered"],md+"：参考（時間・2回目・未解答が多い）");
        ok(/参考/.test(document.getElementById("page").textContent)&&/「いまの目安」には使っていません/.test(document.getElementById("page").textContent),"結果に「参考」の札と理由");
      }
      eq(Mock.hist().filter(h=>h.counts).length,1,"「いまの目安」に使うのは本番どおりの1回目だけ");
      Mock.prepMode="real";
    } finally {
      window.Audio=realAudio; Clock.now=realNow; Fx.sound=realSound; Fx.haptic=realHap;
      if(S) { S.leaving=true; } Router.tab("today");
    }
  });
  /* 押す（二度押しの防止の280msを待たずに、同じ data-act の処理を呼ぶ） */
  function tap(sel){ const el=document.querySelector(sel); if(!el) throw new Error("見つからない："+sel); ACT[el.dataset.act](el.dataset,el); }
  const curQnum=()=>{ const u=cur(); return (isReader(u)?u.qs[S.qi]:u.qs[0]).num; };

  asyncTest.then(uiTest).then(mockTest).then(render,e=>{ results.push({g:"非同期",ok:false,msg:String(e&&e.stack||e)}); render(); });
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
