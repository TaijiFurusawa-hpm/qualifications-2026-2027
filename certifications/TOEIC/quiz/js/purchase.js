/* ===== Purchase（購入：段階5）=====
   UX設計書 3.6（入口3つ・B1 シート・状態の表・鍵つきの回 M1）、7.2（toeic_ent_v1）、7.3（購入）、8.1 リスク4（回数はデータから数える）。
   - 商品は1つ：買い切り（non-consumable）。価格の文字はストアから受け取った表示をそのまま使う（アプリに金額を書きこまない）
   - 正しいのはストアの答え。toeic_ent_v1 は、オフラインでもすぐ画面を出すための控え。
     ストアに聞けなかった・失敗したときは控えを変えない。「持っていない」とはっきり返ってきたときだけ鍵にもどす（記録は消さない）
   - 起動時と前面にもどるたび（js/native.js の resume）に確かめる。保留の完了・払いもどしはストアの知らせ（transactionUpdated）でも受ける
   - シートを開くのは、利用者が押したときだけ（模試1の結果の札・模試の一覧の鍵つきの回と案内・設定）。アプリからは開かない
   - ストアの口は差しかえ式（Clock.now() と同じ流儀）：Purchase.use(口) で自己テストの偽物に替える
     口の形：kind（"native"|"web"）／product() → {price}／buy() → "purchased"|"pending"|"cancelled"（失敗は throw）／
            owned() → {owned:bool, pending:bool|null}（聞けなかったら throw）／restore() → owned() と同じ／listen(fn(tx))
   部品は @capgo/native-purchases（StoreKit 2 / Play Billing）。scripts/build-web.mjs が www/ にだけ足す */
"use strict";
const PRODUCT_ID = "jp.co.hpmnagoya.enpitsu.allmocks";

/* --- ストアの口：アプリ（Capacitor の NativePurchases） --- */
function NativeStore(P){
  P=P||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.NativePurchases);
  if(!P||!isNativeApp()) return null;
  let listening=false;   // 知らせの受け口は1つだけ（init をやり直しても重ねない）
  const msg=e=>String(e&&(e.code||"")+" "+(e.message||e.errorMessage||e)||"");
  /* 部品の失敗の言い方（8.9.6 の原文）。iOS は文字だけ（PurchaseHandling.swift）、Android は BillingResponseCode の名前。知らないものは失敗 */
  const KNOWN=[[/USER_CANCELED|User cancelled/,"cancelled"],[/Transaction pending|Purchase is pending/,"pending"],[/ITEM_ALREADY_OWNED/,"owned"]];
  const classify=e=>{ const m=msg(e); const k=KNOWN.find(([re])=>re.test(m)); return k?k[1]:"failed"; };
  const mine=t=>t&&t.productIdentifier===PRODUCT_ID;
  const ios=()=>{ try{ return window.Capacitor.getPlatform()==="ios"; }catch(e){ return false; } };
  async function owned(){
    // iOS：currentEntitlements（払いもどし・取り消しされた分は入らない）／Android：購入の一覧（"1"＝購入ずみ、"2"＝保留）
    const r=await P.getPurchases(ios()?{onlyCurrentEntitlements:true}:{productType:"inapp"});
    const list=(r&&r.purchases||[]).filter(mine);
    if(ios()) return {owned:list.some(t=>!t.revocationDate), pending:null};
    return {owned:list.some(t=>String(t.purchaseState)==="1"), pending:list.some(t=>String(t.purchaseState)==="2")};
  }
  return { kind:"native", owned,
    async product(){
      const r=await P.getProducts({productIdentifiers:[PRODUCT_ID], productType:"inapp"});
      const p=(r&&r.products||[]).find(x=>x.identifier===PRODUCT_ID);
      if(!p||!p.priceString) throw new Error("product not found");
      return {price:p.priceString};
    },
    async buy(){
      try{
        const t=await P.purchaseProduct({productIdentifier:PRODUCT_ID, productType:"inapp", quantity:1});
        if(t&&String(t.purchaseState)==="2") return "pending";
        return "purchased";
      }catch(e){
        const c=classify(e);
        if(c==="cancelled"||c==="pending") return c;
        if(c==="owned"){ const o=await owned(); if(o.owned) return "purchased"; }
        throw e;
      }
    },
    async restore(){ await P.restorePurchases(); return owned(); },
    listen(fn){ if(listening) return; listening=true; try{ const r=P.addListener("transactionUpdated",fn); if(r&&r.catch) r.catch(()=>{}); }catch(e){} }
  };
}
/* --- ストアの口：Web（ブラウザ）。購入はできない --- */
function WebStore(){ return { kind:"web" }; }

const Purchase = (()=>{
  let store=null;
  let prod=null, prodSt="idle", slow=false, prodTimer=0;   // prodSt：idle|loading|ok|fail
  let st="", rst="", busy=false, lastErr="";                             // st：シートの状態（""|success|pending|failed）／rst：復元（""|busy|found|none|fail）
  const now=()=>(typeof Clock!=="undefined"?Clock.now():Date.now());
  const ENT_DEFAULT={unlocked:false, product:PRODUCT_ID, checkedAt:0, pending:false};
  function ent(){ return Object.assign({},ENT_DEFAULT,loadJSON(K.ent)); }
  function setEnt(patch){
    const e=ent(), was=e.unlocked===true;
    Object.assign(e,patch); saveJSON(K.ent,e);
    if(was!==(e.unlocked===true)) changed();
  }
  const grant=()=>setEnt({unlocked:true, pending:false, checkedAt:now()});    // 持っている（ストアの答え）
  const revoke=()=>setEnt({unlocked:false, checkedAt:now()});                 // はっきり持っていない（払いもどし・別アカウント）
  const sheetOpen=()=>{ const d=document.getElementById("buydlg"); return !!(d&&d.open); };
  /* 開いた・鍵にもどった：使える回の一覧を作り直し、いまの画面を描き直す（学習の途中は描き直さない） */
  function changed(){
    if(typeof invalidateUnits==="function") invalidateUnits();
    paint();
    const t=Router.top(); if(!t||Router.inSession()) return;
    if(t.name==="mockresult"){ const c=document.getElementById("nextm"); if(c) c.outerHTML=Mock.nextHTML(t.arg.n); return; }   // 結果の数え上がりはやり直さない
    if(["mock","settings","today","practice","about"].includes(t.name)) rerender();
  }

  /* --- 収録データから数える（8.1 リスク4）：鍵つきの回・範囲・あと何回分 --- */
  function lockInfo(){
    const locked=MOCKS.filter(m=>!m.free).map(m=>m.n).sort((a,b)=>a-b), freeN=MOCKS.filter(m=>m.free).map(m=>m.n);
    const a=locked[0], b=Math.max(MOCK_PLANNED,...MOCKS.map(m=>m.n)), planned=b-freeN.length;
    return { a, b, n:locked.length, complete:locked.length>=planned, range:a==null?"":a===b?`模試${a}`:`模試${a}〜${b}`,
      q:a==null?0:mockQCount(a), free:freeN.map(n=>`模試${n}`).join("・") };
  }
  function contentText(L){
    const q=L.q?`本番と同じ${L.q}問の模試`:"模試";
    return L.complete?`${q}が、あと${L.n}回分。`:`${q}が、いま${L.n}回分。残りは更新で追加します（追加料金なし）。`;
  }
  /* 一覧（M1）と結果（M7）の案内の1行（文字のまま返す。描く側で esc）：価格は取れたときだけ書く */
  function offerLine(){
    const L=lockInfo();
    if(store&&store.kind==="web") return `${L.range}は、アプリ版での購入ですべて開きます（買い切り）`;
    return prodSt==="ok"?`${L.range}は ${prod.price} ですべて開きます（買い切り）`:`${L.range}は、1回の購入ですべて開きます（買い切り）`;
  }
  const canBuy=()=>!!store&&store.kind==="native";
  const unlocked=()=>ent().unlocked===true;

  /* --- ストアに聞く --- */
  let inflight=null;   // 起動と前面復帰が重なっても、ストアに聞くのは1回
  function check(){
    if(!canBuy()) return Promise.resolve(null);
    if(!inflight) inflight=checkOnce().finally(()=>{ inflight=null; });
    return inflight;
  }
  async function checkOnce(){
    let r; try{ r=await store.owned(); }catch(e){ return null; }   // 聞けなかった：控えを変えない
    const was=unlocked();
    if(r.owned) grant();
    else { revoke(); if(r.pending!=null) setEnt({pending:!!r.pending}); }   // はっきり「持っていない」：鍵にもどす
    if(r.owned&&!was&&st==="pending") st="success";
    paint();
    return r;
  }
  function loadProduct(force){
    if(!canBuy()) return Promise.resolve();
    if(prodSt==="loading"||(prodSt==="ok"&&!force)) return Promise.resolve();
    prodSt="loading"; slow=false; clearTimeout(prodTimer);
    prodTimer=setTimeout(()=>{ if(prodSt==="loading"){ slow=true; paint(); } },150);   // 0.15秒以内に取れれば何も見せない
    paint();
    return store.product().then(p=>{ prod=p; prodSt="ok"; },()=>{ prodSt="fail"; }).then(()=>{
      clearTimeout(prodTimer); slow=false;
      paint();
      const t=Router.top(); if(prodSt==="ok"&&!unlocked()&&t&&!Router.inSession()){ const c=document.getElementById("offerl"); if(c) c.textContent=offerLine(); }
    });
  }
  /* ストアからの知らせ（保留の完了・払いもどし）。iOS の Transaction.updates */
  function onTx(t){
    if(!t||t.productIdentifier!==PRODUCT_ID) return;
    if(t.revocationDate){ revoke(); return; }
    const was=unlocked();
    grant();
    if(!was&&(st==="pending"||sheetOpen())) { st="success"; if(sheetOpen()){ paint(); Fx.haptic("buy"); } }
  }
  function use(s){
    store=s||null; prod=null; prodSt="idle"; slow=false; st=""; rst=""; busy=false; clearTimeout(prodTimer);
    if(store&&store.listen) store.listen(onTx);
    return store;
  }
  /* 起動時：ストアの口を決めて、購入の状態を確かめる（待たずに最初の画面を描く。控えで先に開く） */
  function init(){
    use(NativeStore()||WebStore());
    if(canBuy()){ check(); if(!unlocked()) loadProduct(); }
  }

  /* --- 操作 --- */
  async function buy(){
    if(!canBuy()||busy) return;
    if(prodSt!=="ok"){ await loadProduct(true); return; }   // 「もう一度」：価格から取り直す
    busy=true; st=""; rst=""; paint();
    let r; try{ r=await store.buy(); }catch(e){ r="failed"; lastErr=String(e&&(e.message||e.errorMessage)||e); }
    busy=false;
    if(r==="purchased"){ grant(); st="success"; Fx.haptic("buy"); }
    else if(r==="pending"){ setEnt({pending:true}); st="pending"; }
    else if(r==="cancelled"){ st=""; }   // 何も言わずに元のシートへ
    else { st="failed"; Fx.haptic("error"); }
    paint(); focusMain();
  }
  async function restore(){
    if(!canBuy()||rst==="busy") return;
    rst="busy"; paint();
    let r=null; try{ r=await store.restore(); }catch(e){}
    if(!r) rst="fail";
    else if(r.owned){ rst="found"; st=""; grant(); Fx.haptic("buy"); }
    else { rst="none"; revoke(); }
    paint();
  }

  /* --- B1 シート（3.6）。読み上げの順：見出し → 中身 → 価格 → 注意 → 開く → あとで → 復元 --- */
  const OFFLINE="いまストアにつながりません。通信できる場所でもう一度お試しください。";
  function statusText(){
    const L=lockInfo(), freeUse=`${L.free?L.free+"と":""}単語は、このまま使えます。`;
    if(rst==="busy") return "購入を確かめています…";
    if(rst==="found") return "購入を確認しました。模試がすべて開きました。";
    if(rst==="none") return "このアカウントでの購入は見つかりませんでした。";
    if(rst==="fail") return OFFLINE+freeUse;
    if(busy) return "購入の手続き中です。";
    if(st==="failed") return "購入できませんでした。料金はかかっていません。";
    if(st==="pending"||(!unlocked()&&ent().pending)) return "手続きの完了を待っています。完了すると自動で開きます。";
    if(prodSt==="fail") return OFFLINE+freeUse;
    return "";
  }
  function sheetHTML(){
    const L=lockInfo(), e=ent();
    let h=`<span class="grab" aria-hidden="true"></span><h2 class="h h2" id="buydlg-h" tabindex="-1">${L.range}を開く</h2>`;
    if(e.unlocked&&(st==="success"||rst==="found")){
      return h+`<div class="bnr"><span class="bic"><svg class="mk" viewBox="0 0 24 24" aria-hidden="true">${MARK_OK}</svg></span><div class="bt"><b>${st==="success"?`${L.range}が開きました`:"購入を確認しました"}</b>`+
        `<span class="sm">${st==="success"?"買い切りです。お支払いはこの1回だけです。":"模試がすべて開きました。"}</span></div></div>`+
        `<p class="vh" role="status">${st==="success"?`${L.range}が開きました`:"購入を確認しました。模試がすべて開きました。"}</p>`+
        `<button type="button" class="btn pri pz" data-act="buyGo" data-n="${L.a}">模試${L.a}の準備へ</button><button type="button" class="btn sec pz" data-act="buyClose">閉じる</button>`;
    }
    if(e.unlocked) return h+`<p>購入ずみです。${L.range}は開いています。</p><button type="button" class="btn sec pz" data-act="buyClose">閉じる</button>`;
    h+=`<p>${contentText(L)}</p>`;
    if(!canBuy()){
      return h+`<p class="sm">この版（ブラウザ）では購入できません。iPhone・Android のアプリ版で開けます。</p>`+
        `<button type="button" class="btn sec pz" data-act="buyClose">閉じる</button>`;
    }
    if(prodSt==="ok") h+=`<p class="price"><b class="num">${esc(prod.price)}</b>（買い切り・お支払いは1回だけ）</p>`;
    else if(prodSt==="loading"&&slow) h+=`<p class="sm mut">価格を読み込んでいます…</p>`;
    h+=`<ul class="rules sm"><li>月額や自動更新はありません</li><li>機種を替えても「購入を復元」で元にもどせます</li><li>記録はこの端末の中だけに保存されます</li></ul>`;
    const s=statusText(), pend=st==="pending";
    h+=`<p class="sm" role="status" id="buyst"${s?"":" hidden"}>${s}</p>`;
    let main;
    if(busy) main=`<button type="button" class="btn pri pz" data-act="buy" aria-disabled="true" aria-busy="true">手続き中…</button>`;
    else if(prodSt==="loading"||prodSt==="idle") main=`<button type="button" class="btn pri pz" data-act="buy" disabled${slow?"":' style="visibility:hidden"'}>読み込み中…</button>`;
    else if(prodSt==="fail"||st==="failed") main=`<button type="button" class="btn pri pz" data-act="buy">もう一度</button>`;
    else main=`<button type="button" class="btn pri pz" data-act="buy">${esc(prod.price)}で開く</button>`;
    h+=pend?`<button type="button" class="btn sec pz" data-act="buyClose">閉じる</button>`
      :`<div class="buyrow">${main}<button type="button" class="btn sec pz" data-act="buyClose">あとで</button></div>`;
    h+=`<button type="button" class="btn ghost pz" data-act="buyRestore"${rst==="busy"?' aria-disabled="true"':""}>${rst==="busy"?"確かめています…":"購入を復元"}</button>`;
    return h;
  }
  function paint(){
    const d=document.getElementById("buydlg"); if(!d||!d.open) return;
    const a=document.activeElement, act=a&&d.contains(a)&&a.dataset?a.dataset.act:"";
    d.innerHTML=sheetHTML();
    const mk=d.querySelector(".bnr .mk"); if(mk) Fx.draw(mk,360);
    if(act){ const b=d.querySelector(`[data-act="${act}"]:not([disabled])`); if(b) try{ b.focus({preventScroll:true}); }catch(e){} }
  }
  function focusMain(){ const d=document.getElementById("buydlg"); if(!d||!d.open) return; const b=d.querySelector(".btn.pri:not([disabled]),.btn.sec"); if(b) try{ b.focus({preventScroll:true}); }catch(e){} }
  /* 開く（入口は3つ。どれも利用者が押したときだけ） */
  function open(){
    if(Router.inSession()) return;   // 学習の途中には出さない
    if(!busy){ st=""; } if(rst!=="busy") rst="";
    if(canBuy()&&!unlocked()) loadProduct();   // 先に取りはじめる（取れていれば何もしない）
    const d=openSheet("buydlg",sheetHTML());
    if(!d._b1){ d._b1=1; bindClose(d); }
    const h=d.querySelector("#buydlg-h"); if(h) try{ h.focus({preventScroll:true}); }catch(e){}
    return d;
  }
  /* 閉じる：Esc（ブラウザ）・外側を押す・下へ引く。手続き中でも閉じられる（OSの画面が前に出る） */
  function bindClose(d){
    d.addEventListener("click",ev=>{
      if(ev.target!==d) return; const r=d.getBoundingClientRect();
      if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom) close();
    });
    let y0=null;
    d.addEventListener("touchstart",ev=>{ const t=ev.touches[0], r=d.getBoundingClientRect(); y0=(t&&t.clientY-r.top<56&&d.scrollTop<=0)?t.clientY:null; },{passive:true});
    d.addEventListener("touchend",ev=>{ const t=ev.changedTouches[0]; if(y0!=null&&t&&t.clientY-y0>72) close(); y0=null; },{passive:true});
  }
  function close(){ closeDlg("buydlg"); }

  /* --- 設定（X1）の「購入」 --- */
  function settingsHTML(){
    const L=lockInfo(); if(L.a==null) return "";
    const u=unlocked();
    let h=`<h2 class="sec-h">購入</h2><div class="list">`;
    if(!u) h+=rowbHTML({act:"buyOpen",no:icon("lock","s"),title:"模試をすべて開く",sub:`${L.range} ・ 買い切り`});
    if(canBuy()) h+=rowbHTML({act:"buyRestore",no:icon("redo","s"),title:"購入を復元",sub:u?"購入ずみ":rst==="busy"?"確かめています…":"機種を替えたとき・入れ直したとき"});
    h+=`</div>`;
    const s=rst&&rst!=="busy"&&!sheetOpen()?statusText():"";
    h+=`<p class="sm" role="status" id="rstst"${s?"":" hidden"}>${s}</p>`;
    return h;
  }

  Object.assign(ACT,{
    buyOpen:()=>open(),
    buy:()=>buy(),
    buyClose:()=>close(),
    buyGo:d=>{ close(); Router.tab("mock"); Router.go("mockprep",{n:+d.n}); },
    buyRestore:async()=>{ await restore(); const t=Router.top(); if(t&&t.name==="settings"&&!sheetOpen()){ rerender(); refocus("#rstst:not([hidden]),[data-act=\"buyRestore\"]"); } }
  });

  return { init, use, check, open, close, buy, restore, onTx, loadProduct, lockInfo, offerLine, settingsHTML, sheetHTML, ent,
    get unlocked(){ return unlocked(); }, get store(){ return store; }, get state(){ return {st,rst,busy,prodSt,slow,price:prod&&prod.price,lastErr}; } };
})();
