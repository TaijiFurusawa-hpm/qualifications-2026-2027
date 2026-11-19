/* ===== Fx（動き・音・触覚）=====
   UX設計書 1.2 と 5章。出す・出さないを決めるのはここだけ（画面の側で判断しない）。
   - Fx.layer = "quiet"（模試）| "expressive"（練習・単語・結果・記録）
   - 設定：prefs.sfx（効果音・既定オフ）／prefs.haptic（触覚・既定オン）／prefs.hapticMock（模試中の触覚・既定オフ）／prefs.motion（auto|reduce）
   - 触覚は Capacitor Haptics があればそれを、無ければ何もしない（navigator.vibrate は使わない：5.1）
*/
"use strict";
const Fx = (()=>{
  const root=document.documentElement;
  const mq=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
  let layer="expressive", lastHap=0, ac=null, noise=null;
  const P=()=> (typeof prefs==="function"?prefs():PREFS_DEFAULT);

  function reduced(){ const m=P().motion; return m==="reduce"||(m!=="none"&&mq.matches); }
  function syncMotion(){ root.dataset.rm=reduced()?"1":"0"; }
  if(mq.addEventListener) mq.addEventListener("change",syncMotion);

  function setLayer(l){ layer=l==="quiet"?"quiet":"expressive"; root.dataset.layer=layer; }

  /* --- 触覚（5.1 の対応表） --- */
  const HAP = {
    select:{impact:"LIGHT"}, press:{impact:"LIGHT"}, correct:{notify:"SUCCESS"}, wrong:{notify:"WARNING"},
    toggle:{impact:"LIGHT"}, done:{impact:"MEDIUM"}, milestone:{notify:"SUCCESS", then:"MEDIUM"},
    error:{notify:"ERROR"}, grade:{impact:"MEDIUM"}
  };
  function haptic(name){
    const spec=HAP[name]; if(!spec) return;
    const p=P(); if(!p.haptic) return;
    if(layer==="quiet"&&!(name==="select"&&p.hapticMock)) return;   // 模試は「選択」だけ、設定が入のときだけ
    const now=Date.now(); if(now-lastHap<80) return; lastHap=now;     // 80ms以内の重なりは後を捨てる
    const H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    Fx.lastHaptic=name;
    if(!H) return;   // Web では何もしない（触覚だけで伝える情報はない）
    try{
      if(spec.impact) H.impact({style:spec.impact});
      if(spec.notify) H.notification({type:spec.notify});
      if(spec.then) setTimeout(()=>{ try{ H.impact({style:spec.then}); }catch(e){} },120);
    }catch(e){}
  }

  /* --- 効果音（5.2）：既定オフ。模試の層では鳴らさない。リスニング音声の再生中も鳴らさない --- */
  const DONE_SND=[[3000,70,"n",.07],[3400,60,"n",.06,100],[3000,90,"n",.07,200]];
  const SND = { // 「紙の答案」の鉛筆の音（[周波数, ms, 'n'=ノイズ|波形, 音量, 遅れms]）
    correct:[[3000,70,"n",.07],[3400,60,"n",.06,90]], wrong:[[1800,60,"n",.06]],
    done:DONE_SND, milestone:DONE_SND   // 区切り（milestone）は今は「終わり」と同じ音（5.2）
  };
  function ctx(){ if(!ac){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; ac=new C(); } if(ac.state==="suspended") ac.resume(); return ac; }
  function sound(name){
    const p=P(); if(!p.sfx||layer==="quiet") return;
    if(Player.busy()) return;   // リスニングの音声が流れている間は鳴らさない
    const notes=SND[name]; if(!notes) return; const a=ctx(); if(!a) return; const t0=a.currentTime+.01;
    for(const [f,d,type,g,dl] of notes){
      const t=t0+(dl||0)/1000, dur=d/1000, gn=a.createGain();
      gn.gain.setValueAtTime(.0001,t); gn.gain.linearRampToValueAtTime(g,t+.004); gn.gain.exponentialRampToValueAtTime(.0001,t+dur+.02); gn.connect(a.destination);
      if(type==="n"){
        if(!noise){ noise=a.createBuffer(1,a.sampleRate*.2,a.sampleRate); const ch=noise.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; }
        const s=a.createBufferSource(), bp=a.createBiquadFilter(); s.buffer=noise; bp.type="bandpass"; bp.frequency.value=f*(1+(Math.random()-.5)*.04); bp.Q.value=1.2;
        s.connect(bp); bp.connect(gn); s.start(t); s.stop(t+dur+.03);
      }
    }
  }

  /* --- 動き（5.3）。transform と opacity だけを動かす --- */
  const can=el=>el&&typeof el.animate==="function";
  function anim(el,kf,o){ if(!can(el)) return null; try{ return el.animate(kf,o); }catch(e){ return null; } }
  function enter(el){   // 画面の入れ替え：練習＝フェード＋小さく上がる／模試＝フェードのみ
    if(!el) return;
    if(reduced()) return anim(el,{opacity:[0,1]},{duration:100});
    if(layer==="quiet") return anim(el,{opacity:[0,1]},{duration:150});
    return anim(el,{opacity:[0,1],transform:["translateY(12px)","none"]},{duration:200,easing:"cubic-bezier(.2,0,0,1)"});
  }
  function reveal(el){ // 解説が現れる
    if(!el) return; anim(el,{opacity:[0,1],transform:reduced()?["none","none"]:["translateY(8px)","none"]},{duration:reduced()?100:220,easing:"cubic-bezier(.2,0,0,1)"});
  }
  /* 選択肢の行の色（.wash）と楕円のマーク（.badge i）を左から満たす */
  function inkFill(choice,washMs,badgeMs,ease){
    const grow={transform:["scaleX(0)","scaleX(1)"]};
    anim(choice.querySelector(".wash"),grow,{duration:washMs,easing:ease});
    anim(choice.querySelector(".badge i"),grow,{duration:badgeMs,easing:"linear"});
  }
  /* 選んだとき：淡い色（墨）が左から流れ、楕円のマークが鉛筆で塗られる。模試でも静かな塗りだけは出す（ビジュアル案・決定候補） */
  function select(choice){
    if(!choice||reduced()) return;
    const q=layer==="quiet";
    inkFill(choice,q?120:320,q?120:200,"cubic-bezier(.3,0,.1,1)");
  }
  /* 正誤：✓の線を描く＋行の色が左から満ちる（正解）／×と枠（不正解・揺らさない） */
  function mark(choice, ok){
    if(!choice) return;
    const mk=choice.querySelector(".mk"); if(mk){ mk.innerHTML=ok?MARK_OK:MARK_NG; draw(mk, ok?360:160); }
    if(reduced()) return;
    if(ok) inkFill(choice,420,200,"cubic-bezier(.65,0,.35,1)");
    else anim(choice,{opacity:[.6,1]},{duration:160});
  }
  function draw(svg,dur){
    svg.querySelectorAll("path").forEach((p,i)=>{
      let L=30; try{ L=p.getTotalLength()||30; }catch(e){}
      p.style.strokeDasharray=L; if(reduced()) return;
      anim(p,{strokeDashoffset:[L,0]},{duration:dur,delay:i*dur*.7,easing:"cubic-bezier(.65,0,.35,1)",fill:"backwards"});
    });
  }
  /* 数字の数え上がり（結果・記録だけ）。終わりほどゆっくり。押すと即座に終わる */
  function countUp(el,to,from){
    if(!el) return; to=+to; from=+(from||0);
    if(reduced()||layer==="quiet"){ el.textContent=to; return; }
    const dur=1000, t0=performance.now(); el._cu=true; el.setAttribute("data-cu","");
    const tick=now=>{ if(!el._cu){ el.textContent=to; return; } const t=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-t,4); el.textContent=t>=1?to:Math.round(from+(to-from)*e); if(t<1&&el.isConnected) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function fill(el,delay){ if(!el||reduced()) return; const tf=getComputedStyle(el).transform; anim(el,{transform:["scaleX(0)",tf==="none"?"scaleX(1)":tf]},{duration:600,delay:delay||0,easing:"cubic-bezier(.3,0,.1,1)",fill:"backwards"}); }
  /* 墨のしずく（「生成りの答案」から移植）：にじんだ墨の粒が静かに散って消える。
     結果画面の数字にだけ使う。粒は少なめ（最大8）。模試の層・動きを減らす では出さない */
  function inkDrops(el,n,big){
    if(!el||reduced()||layer==="quiet") return;
    const r=el.getBoundingClientRect(); if(!r.width) return;
    let lay=document.querySelector(".fx-layer"); if(!lay){ lay=document.createElement("div"); lay.className="fx-layer"; lay.setAttribute("aria-hidden","true"); document.body.appendChild(lay); }
    const cx=r.left+r.width/2, cy=r.top+r.height/2, ink=getComputedStyle(root).getPropertyValue("--c-text").trim()||"#2A2826";
    n=Math.min(n||5,8);
    for(let i=0;i<n;i++){
      const ang=(i/n)*Math.PI*2+Math.random()*.5, dist=(big?80:30)+Math.random()*(big?90:34), dx=Math.cos(ang)*dist*.7, dy=Math.sin(ang)*dist*.7;
      const s=3+Math.random()*(big?9:6), d=document.createElement("span"); d.className="fx-dot";
      d.style.cssText=`width:${s}px;height:${s}px;margin:${-s/2}px;background:${ink};filter:blur(.4px);transform:translate(${cx}px,${cy}px)`;
      lay.appendChild(d);
      const a=anim(d,{transform:[`translate(${cx}px,${cy}px)`,`translate(${cx+dx}px,${cy+dy}px) scale(1.5)`],opacity:[1,1,0]},{duration:((big?1000:560)+Math.random()*300)*1.3,easing:"cubic-bezier(.1,.7,.3,1)"});
      if(a) a.onfinish=()=>d.remove(); else d.remove();
    }
  }
  function skipAll(){ document.querySelectorAll("[data-cu]").forEach(e=>{ e._cu=false; }); }

  syncMotion(); setLayer("expressive");
  return { get layer(){ return layer; }, setLayer, reduced, syncMotion, haptic, sound, enter, reveal, select, mark, draw, countUp, fill, inkDrops, skipAll, lastHaptic:null };
})();
