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
    window.loadJSON=k=>mem.load(k); window.saveJSON=(k,v)=>mem.save(k,v); window.dayNumber=()=>day==null?T:day;
    const end=()=>{ window.loadJSON=real.load; window.saveJSON=real.save; window.dayNumber=real.today; };
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
    eq(K,old,"記述子の一覧から作ったキーは、段階0のキーと1字も違わない（保存データを壊さない）");
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

  asyncTest.then(uiTest).then(render,e=>{ results.push({g:"非同期",ok:false,msg:String(e&&e.stack||e)}); render(); });
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
