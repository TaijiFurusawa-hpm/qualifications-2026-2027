/* ===== Shell（画面の枠）／ Router（画面の切り替えと履歴）／ 操作の受け口 =====
   UX設計書 2.1, 7.1-2, 7.1-3
   - 枠は4つの差し込み口：上のバー #top ／本体 #body ／下のバー #bottom ／下タブ #tabs
   - 下タブ：今日／模試／練習／単語。問題を解いている間（セッション中）は隠す
   - 各タブは自分のスクロール位置を覚える。タブを押し直すと先頭に戻る
   - もどる操作（ブラウザ・Android）は Router.back と同じ。セッション中は guard で確認
*/
"use strict";
const TABS = [
  {id:"today",   label:"今日", icon:"today"},
  {id:"mock",    label:"模試", icon:"mock"},
  {id:"practice",label:"練習", icon:"practice"},
  {id:"vocab",   label:"単語", icon:"vocab"}
];
const Shell = {
  el:{},
  mount(){
    const $=id=>document.getElementById(id);
    this.el={top:$("top"), body:$("body"), bottom:$("bottom"), tabs:$("tabs")};
    this.el.tabs.innerHTML=TABS.map(t=>`<button class="tab pz" type="button" data-act="tab" data-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></button>`).join("");
  },
  /* 画面を描く。o = {top, body, bottom, tabs:true|false, tab, layer, wide, fixed, keepScroll, noAnim, focus}
     fixed：本体をスクロールさせない（Part 6・7 の読む画面。文書と設問トレイがそれぞれスクロールする：5.4） */
  render(o){
    const E=this.el;
    Fx.setLayer(o.layer||"expressive");
    E.top.innerHTML=o.top||"";
    E.body.classList.toggle("fixed",!!o.fixed);
    E.body.innerHTML=`<div class="page${o.wide?" wide":""}" id="page">${o.body||""}</div>`;
    this.setBottom(o.bottom);
    const showTabs=o.tabs!==false;
    E.tabs.hidden=!showTabs; document.documentElement.classList.toggle("tabs-on",showTabs);
    E.tabs.querySelectorAll(".tab").forEach(b=>{ if(b.dataset.tab===o.tab) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
    if(!o.keepScroll) E.body.scrollTop=0;
    if(!o.noAnim) Fx.enter(document.getElementById("page"));
    // 読み上げ：画面が替わったら本体へ焦点を移す（スクロールはしない）
    if(o.focus!==false){ try{ E.body.focus({preventScroll:true}); }catch(e){} }
  },
  setBottom(h){ this.el.bottom.innerHTML=h?`<div class="bottombar"><div class="wrapin">${h}</div></div>`:""; },
  /* 読み上げへの知らせ（画面には出さない）。同じ文を続けて出しても読まれるよう、いったん空にする */
  say(t){ const e=document.getElementById("sr"); if(!e) return; e.textContent=""; setTimeout(()=>{ e.textContent=t; },30); }
};

/* 画面（SCREENS[name] = function(arg) → Shell.render を呼ぶ）。セッションは name:"session" で中身を自分で描く */
const SCREENS = {};
const Router = {
  stack:[], scroll:{}, _silent:0,
  top(){ return this.stack[this.stack.length-1]; },
  inSession(){ const t=this.top(); return !!(t&&t.name==="session"); },
  _render(){ const t=this.top(); if(!t||t.name==="session") return; const f=SCREENS[t.name]; if(f) f(t.arg); },
  _leaveTop(){ const t=this.top(); if(!t) return; if(this.stack.length===1) this.scroll[t.name]=Shell.el.body.scrollTop; if(t.leave) try{ t.leave(); }catch(e){} },
  _sync(){
    const deep=this.stack.length>1, has=!!(history.state&&history.state.lapis);
    try{
      if(deep&&!has) history.pushState({lapis:1},"");
      else if(!deep&&has){ this._silent++; history.back(); }
    }catch(e){}
  },
  /* 下タブ：そのタブの先頭へ。同じタブを押し直すと先頭までスクロール */
  tab(name){
    const t=this.top();
    if(this.stack.length===1&&t&&t.name===name){ Shell.el.body.scrollTo({top:0,behavior:Fx.reduced()?"auto":"smooth"}); return; }
    if(this.inSession()&&!this.guardOk()) return;
    this._leaveTop();
    this.stack=[{name}]; this._sync(); this._render();
    const y=this.scroll[name]; if(y) Shell.el.body.scrollTop=y;
  },
  go(name,arg){ this._leaveTop(); this.stack.push({name,arg}); this._sync(); this._render(); },
  /* セッション（練習・模試・単語）に入る。すでにセッション中なら入れかえるだけ */
  session(opts){
    const e={name:"session", guard:opts&&opts.guard, leave:opts&&opts.leave};
    if(this.inSession()){ const t=this.top(); if(t.leave&&t.leave!==e.leave) try{ t.leave(); }catch(x){} this.stack[this.stack.length-1]=e; }
    else { this._leaveTop(); this.stack.push(e); this._sync(); }
  },
  guardOk(){ const t=this.top(); return !(t&&t.guard&&!t.guard()); },
  /* 1つもどる（画面のボタン・ブラウザ・Android の共通処理） */
  _pop(){
    const t=this.stack.pop(); if(t.leave) try{ t.leave(); }catch(e){}
    this._render();
    if(this.stack.length===1){ const y=this.scroll[this.top().name]; if(y) Shell.el.body.scrollTop=y; }
  },
  back(){
    if(this.stack.length<=1) return false;
    if(!this.guardOk()) return false;
    this._pop(); this._sync();
    return true;
  }
};
window.addEventListener("popstate",e=>{
  if(Router._silent>0){ Router._silent--; Router._sync(); return; }   // 自分で起こした back。その間の移動に合わせて印を整える
  if(Router.stack.length<=1){   // 先頭：ブラウザ／OS に任せる（アプリを閉じる）。「進む」で印が戻ってきたら消す
    if(e.state&&e.state.lapis){ Router._silent++; history.back(); }
    return;
  }
  if(!Router.guardOk()){ try{ history.pushState({lapis:1},""); }catch(x){} return; }
  Router._pop();
  if(Router.stack.length>1){ try{ history.pushState({lapis:1},""); }catch(x){} }
});

/* ===== 操作の受け口：根元で1つの click を受け、data-act で振り分ける =====
   - 押している間の見た目（.is-down）／触覚の呼び出し／二度押しの防止を1か所で扱う
   - 決定は指を離したとき（click）。押した瞬間（pointerdown）では決めない（4.0） */
const ACT = {};
const Input = {};
(function(){
  let downEl=null, lastT=0;
  const GUARD_MS=280;   // 画面が描きかわった直後の二度押し（同じ位置の別のボタン）を捨てる
  document.addEventListener("pointerdown",e=>{
    Fx.skipAll();
    const z=e.target.closest&&e.target.closest(".pz"); if(!z||z.disabled||z.getAttribute("aria-disabled")==="true") return;
    downEl=z; z.classList.add("is-down");
  },{passive:true});
  const release=()=>{ if(downEl){ downEl.classList.remove("is-down"); downEl=null; } };
  ["pointerup","pointercancel","blur"].forEach(t=>window.addEventListener(t,release,{passive:true}));
  document.addEventListener("pointerout",e=>{ if(downEl&&e.target===downEl&&e.pointerType==="mouse") release(); });
  document.addEventListener("click",e=>{
    const el=e.target.closest&&e.target.closest("[data-act]"); if(!el) return;
    if(el.disabled||el.getAttribute("aria-disabled")==="true") return;
    const fn=ACT[el.dataset.act]; if(!fn) return;
    e.preventDefault();
    const now=Date.now(); if(now-lastT<GUARD_MS&&!("rapid" in el.dataset)) return; lastT=now;
    const h=el.dataset.hap||(el.classList.contains("choice")?"select":el.classList.contains("pri")?"press":"");
    if(h) Fx.haptic(h);
    try{ fn(el.dataset,el,e); }catch(err){ console.error(err); }
  });
  /* role="button" の要素（文書の中の空所など）も Enter・Space で押せるように */
  document.addEventListener("keydown",e=>{
    const el=e.target; if(!(el&&el.getAttribute&&el.getAttribute("role")==="button"&&el.dataset&&el.dataset.act&&el.tagName!=="BUTTON")) return;
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); e.stopImmediatePropagation(); el.click(); }   // 後ろのキー操作（Enter＝次へ）に渡さない
  });
  document.addEventListener("input",e=>{ const el=e.target; const f=el&&el.dataset&&Input[el.dataset.input]; if(f) f(el.value,el); });
})();
