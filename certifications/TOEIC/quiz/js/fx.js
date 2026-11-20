/* ===== Fx（動き・音・触覚）=====
   UX設計書 1.2 と 5章。出す・出さないを決めるのはここだけ（画面の側で判断しない）。
   - Fx.layer = "quiet"（模試）| "expressive"（練習・単語・結果・記録）
   - 設定：prefs.sfx（効果音・既定オフ）／prefs.haptic（触覚・既定オン）／prefs.hapticMock（模試中の触覚・既定オフ）／prefs.motion（auto|reduce）
           prefs.mark（マークの塗り方：pencil＝鉛筆で円を描いて塗る・既定｜quick＝左から短く塗る）
   - 触覚は Capacitor Haptics があればそれを、無ければ何もしない（navigator.vibrate は使わない：5.1）
*/
"use strict";
const Fx = (()=>{
  const root=document.documentElement;
  const mq=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
  let layer="expressive", lastHap=0, ac=null;
  const P=()=> (typeof prefs==="function"?prefs():PREFS_DEFAULT);

  function reduced(){ const m=P().motion; return m==="reduce"||(m!=="none"&&mq.matches); }
  function syncMotion(){ root.dataset.rm=reduced()?"1":"0"; }
  if(mq.addEventListener) mq.addEventListener("change",syncMotion);

  function setLayer(l){ layer=l==="quiet"?"quiet":"expressive"; root.dataset.layer=layer; }

  /* --- 触覚（5.1 の対応表） --- */
  const HAP = {
    select:{impact:"LIGHT"}, press:{impact:"LIGHT"}, correct:{notify:"SUCCESS"}, wrong:{notify:"WARNING"},
    toggle:{impact:"LIGHT"}, done:{impact:"MEDIUM"}, milestone:{notify:"SUCCESS", then:"MEDIUM"},
    error:{notify:"ERROR"}, grade:{impact:"MEDIUM"}, buy:{notify:"SUCCESS"}
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

  /* --- 効果音（5.2）：既定オフ。模試の層では鳴らさない。リスニング音声の再生中も鳴らさない ---
     鉛筆（2B）で紙に書く音：ピンクノイズ（高い音が弱い雑音）を途切れない「画」として流し、なだらかに絞る。
     高い音を細かく区切ると「虫のカサカサ」に聞こえるため、区切らない（ux/マーク演出_比較.html で聞き比べて決定）。
     大きさはイヤホンで「聞こえるか聞こえないか」：リスニング音声（話している部分 約 -18dBFS）の約1/10に聞こえる -51dBFS（RMS）。
     初めて鳴らすときに一度だけ裏で鳴らして大きさを測り（OfflineAudioContext）、倍率を決める。画＝{at:始まり秒, d:長さ秒, f0→f1:高さの倍率, a:強さ} */
  const DONE_SND=[{at:0,d:.38,f0:.95,f1:1.05,a:1}];   // 終わり：ゆっくり引く下線1本
  const SND = {
    correct:[{at:0,d:.07,f0:1,f1:1.05,a:.8},{at:.085,d:.16,f0:1.02,f1:1.25,a:1}],   // ✓：短く下ろす→長く払い上げる（少し明るく）
    wrong:[{at:0,d:.11,f0:1,f1:.88,a:.9},{at:.16,d:.11,f0:.98,f1:.85,a:.9}],        // ×：同じ長さで2画（少し下がる）
    done:DONE_SND, milestone:DONE_SND   // 区切り（milestone）は今は「終わり」と同じ音（5.2）
  };
  const SND_DB=-51, SND_HZ=1400;
  let pinkBuf=null, sndScale=null;
  function pink(a){   // 0.6秒分のピンクノイズ（Paul Kellet の近似）。測定と本番は同じ sampleRate なので、作るのは一度だけ
    if(pinkBuf&&pinkBuf.sampleRate===a.sampleRate) return pinkBuf;
    const n=Math.round(a.sampleRate*.6), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<n;i++){ const w=Math.random()*2-1;
      b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856;
      b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; }
    return (pinkBuf=buf);
  }
  function stroke(a,t0,seg,scale){   // 画を1つ鳴らす：ピンクノイズ → 低いうなりを切る → 2B の帯 → 上を丸める → ふわっと出入り
    const s=a.createBufferSource(); s.buffer=pink(a); s.loop=true;
    const hp=a.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=350; hp.Q.value=.5;
    const bp=a.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=.35;
    const lp=a.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3800; lp.Q.value=.3;
    const t=t0+seg.at, T=seg.d, g=a.createGain(), N=64, c=new Float32Array(N);
    bp.frequency.setValueAtTime(SND_HZ*seg.f0,t); bp.frequency.linearRampToValueAtTime(SND_HZ*seg.f1,t+T);
    for(let i=0;i<N;i++){ const x=i/(N-1); c[i]=Math.max(.00001,scale*seg.a*Math.pow(Math.min(1,x/.25),1.3)*Math.min(1,(1-x)/.4)); }
    g.gain.setValueAtTime(.00001,t); g.gain.setValueCurveAtTime(c,t,T);
    s.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g); g.connect(a.destination);
    s.start(t,Math.random()*.4); s.stop(t+T+.03);
  }
  function scale(sr){   // 倍率1の画（0.5秒）の大きさを測って、-51dBFS になる倍率を返す（測れなければ控えめな既定値）。測るのは一度だけ
    return sndScale||(sndScale=measure(sr));
  }
  async function measure(sr){
    let rms=.3;
    try{
      const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;
      if(O){ const o=new O(1,Math.ceil(sr*.6),sr); stroke(o,0,{at:0,d:.5,f0:1,f1:1,a:1},1);
        const r=(await o.startRendering()).getChannelData(0); let sum=0,n=0;
        for(let i=Math.floor(sr*.15);i<Math.floor(sr*.3);i++){ sum+=r[i]*r[i]; n++; }
        if(sum>0) rms=Math.sqrt(sum/n); }
    }catch(e){}
    return Math.pow(10,SND_DB/20)/rms;
  }
  function ctx(){ if(!ac){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; ac=new C(); } if(ac.state==="suspended") ac.resume(); return ac; }
  async function sound(name){
    const p=P(); if(!p.sfx||layer==="quiet") return;
    if(Player.busy()) return;   // リスニングの音声が流れている間は鳴らさない
    const segs=SND[name]; if(!segs) return; const a=ctx(); if(!a) return;
    const k=await scale(a.sampleRate), t0=a.currentTime+.01;
    for(const seg of segs) stroke(a,t0,seg,k);
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
  /* マークを塗る（ux/マーク演出_比較.html の E を決定）。墨の流れ（行の色が左から満ちる）はやめた：鉛筆の答案と合わないため
     - 鉛筆：楕円の縁から中心へ、約5周の円を描いて塗る線（.pen）。線は choiceHTML が描いておき（選んだ・選んで採点された楕円）、ここでは書く動きだけ
       長さ：練習 0.52秒／模試 0.24秒（2時間押し続けても待たされない短さ）。答えは押した瞬間に記録ずみ（演出は見た目だけ）
     - 線の無い楕円（設定が すばやく・はじめのレベル判定・選ばなかった正解）：左から短く塗る（0.2秒／模試 0.12秒） */
  const PEN_MS={expressive:520, quiet:240};
  function markFill(badge){
    if(!badge) return;
    const p=badge.querySelector(".pen path");
    if(!p){ anim(badge.querySelector("i"),{transform:["scaleX(0)","scaleX(1)"]},{duration:layer==="quiet"?120:200,easing:"linear"}); return; }
    drawPath(p,PEN_MS[layer],"cubic-bezier(.35,.05,.55,.95)",200);
    anim(badge,{transform:["scale(1)","scale(.965)","scale(1)"]},{duration:150,easing:"ease-out"});   // 芯が紙に当たる、ごく小さな沈み
  }
  /* 選んだとき（模試・レベル判定）：正誤は出さない */
  function select(choice){
    if(!choice||reduced()) return;
    markFill(choice.querySelector(".badge"));
  }
  /* 正誤：✓の線を描く＋行の色がふわっと出る（正解）／×と枠（不正解・揺らさない）。選んだ楕円は鉛筆で塗る */
  function mark(choice, ok){
    if(!choice) return;
    const mk=choice.querySelector(".mk"); if(mk){ mk.innerHTML=ok?MARK_OK:MARK_NG; draw(mk, ok?360:160); }
    if(reduced()) return;
    markFill(choice.querySelector(".badge"));
    if(ok) anim(choice.querySelector(".wash"),{opacity:[0,1]},{duration:220,easing:"cubic-bezier(.2,0,0,1)"});
    else anim(choice,{opacity:[.6,1]},{duration:160});
  }
  /* 線を書く動き（線の長さだけ破線をずらす）。✓×の印と鉛筆のマークで共用 */
  function drawPath(p,dur,easing,fallbackL,delay){
    let L=fallbackL; try{ L=p.getTotalLength()||fallbackL; }catch(e){}
    p.style.strokeDasharray=L; if(reduced()) return;
    anim(p,{strokeDashoffset:[L,0]},{duration:dur,delay:delay||0,easing,fill:"backwards"});
  }
  function draw(svg,dur){
    svg.querySelectorAll("path").forEach((p,i)=>drawPath(p,dur,"cubic-bezier(.65,0,.35,1)",30,i*dur*.7));
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
