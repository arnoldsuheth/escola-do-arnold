(function(){
 'use strict';
 if(!window.LionCore||document.getElementById('lion-companion'))return;
 const C=window.LionCore,storeKey='evolab-lion-v1';
 const load=()=>{try{return JSON.parse(localStorage.getItem(storeKey))||{};}catch(e){return {};}};
 const saved=load();let prefs=C.settings(saved.prefs),seenDay=saved.seenDay||'',sent=saved.sent||{day:'',keys:{}},elapsed=0,last={water:0,walk:0,study:0},lastTick=Date.now(),lastAuto=0,until=0,drag=null,moved=false;
 const root=document.createElement('div');root.id='lion-companion';root.hidden=true;
 root.innerHTML=`<div id="lion-anchor"><button id="lion-icon" aria-label="Abrir Lion Suheth. Arraste para mover" aria-expanded="false" aria-controls="lion-panel"><span class="lion-orbit" aria-hidden="true"></span><img src="assets/lion-cristal.webp" alt="Lion Suheth, mascote do Evolution Lab" draggable="false"><canvas class="lion-3d" aria-hidden="true"></canvas></button></div><aside id="lion-balloon" role="status" aria-live="polite" hidden><strong>Lion Suheth</strong><p></p><button type="button" aria-label="Dispensar balão">×</button></aside><section id="lion-panel" role="dialog" aria-label="Lion Suheth, assistente de estudos" hidden><canvas aria-hidden="true"></canvas><div class="lion-front"><header><img src="assets/lion-cristal.webp" alt="" draggable="false"><div><strong>Lion Suheth</strong><small>Seu companheiro de evolução</small></div><button type="button" id="lion-close" aria-label="Fechar janela">−</button></header><div class="lion-stage"><canvas class="lion-stage-cv" role="img" aria-label="Lion Suheth em 3D. Arraste para girar 360 graus. Toque duas vezes para voltar de frente."></canvas><div class="lion-stage-btns"><button type="button" data-l3="spin">Girar</button><button type="button" data-l3="hello">Acenar</button><button type="button" data-l3="celebrate">Comemorar</button><button type="button" data-l3="oops">Ops</button></div></div><div class="lion-body"><p id="lion-date"></p><p id="lion-advice" aria-live="polite"></p><div class="lion-actions"><button type="button" data-lion-action="study">Estudar agora</button><button type="button" data-lion-action="water">Água</button><button type="button" data-lion-action="walk">Pausa</button><button type="button" data-lion-action="help">Pedir ajuda ao Claude</button></div><details><summary>Como o Lion funciona</summary><p class="lion-note">Sou um companheiro com falas programadas. Uso o horário de Brasília, a página aberta e o tempo nesta aba para sugerir estudo e pausas. Não leio sua conversa do ChatGPT e não respondo por meio dela.</p><p class="lion-note">Neste navegador ficam apenas suas preferências e a data da saudação. Os contadores de lembretes recomeçam ao recarregar; não são sincronizados entre aparelhos. O progresso dos cursos usa a sincronização própria da plataforma.</p></details><details><summary>Preferências do Lion</summary><div class="lion-settings"><label>Balões automáticos<input type="checkbox" id="lion-auto"></label><label>Modo foco (só falo quando você me chamar)<input type="checkbox" id="lion-focus"></label><label>Movimento do mascote<input type="checkbox" id="lion-motion"></label><label>Horário silencioso<input type="checkbox" id="lion-quiet"></label><div class="lion-row" id="lion-quiet-hours"><label>De<select id="lion-qfrom"></select></label><label>Até<select id="lion-qto"></select></label></div><label>Água a cada<select id="lion-water"><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option></select></label><label>Caminhada a cada<select id="lion-walk"><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label><label>Tom das falas<select id="lion-tone"><option value="divertido">Divertido</option><option value="motivador">Motivador</option><option value="firme">Firme</option></select></label><label>Voz<select id="lion-voice"><option value="">Automática (português)</option></select></label><label>Velocidade da voz<select id="lion-rate"><option value="0.85">Lenta</option><option value="1">Normal</option><option value="1.15">Rápida</option></select></label><button type="button" id="lion-testvoice" class="lion-test">Testar voz</button><p class="lion-note" id="lion-voice-note"></p></div></details><p class="lion-note">Horário de Brasília. Sugestões locais, sem IA conectada. Os lembretes contam o tempo nesta aba visível e em foco; não enviam notificações fora da plataforma.</p></div></div></section>`;
 document.body.append(root);
 const $=s=>root.querySelector(s),anchor=$('#lion-anchor'),icon=$('#lion-icon'),balloon=$('#lion-balloon'),panel=$('#lion-panel'),advice=$('#lion-advice');
 const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify({prefs,seenDay,sent}));}catch(e){}};
 const commit=()=>{prefs.at=Date.now();save();try{if(window.EvoLion)window.EvoLion.setPrefs(prefs);}catch(e){}};
 function sentToday(){const k=C.clock().key;if(sent.day!==k)sent={day:k,keys:{}};return sent.keys;}
 function markSent(key){sentToday()[key]=1;save();}
 const phrase=(kind,x)=>C.phrase(prefs.tone,kind,x);
 function done(){const all=document.querySelectorAll('#view .quest');return all.length>0&&Array.from(all).every(q=>q.classList.contains('done'));}
 function suggestion(){return C.suggestion(location.hash,done());}
 const message=k=>phrase(k);
 function clock(){const c=C.clock();$('#lion-date').textContent=`${c.date} · ${c.time}`;return c;}
 function bounds(){
  const v=window.visualViewport,l=v?v.offsetLeft:0,t=v?v.offsetTop:0,w=v?v.width:innerWidth,h=v?v.height:innerHeight;
  const safeTop=parseFloat(getComputedStyle(root).getPropertyValue('--lion-safe-top'))||0;
  const nav=document.querySelector('.tabbar'),n=nav&&nav.getBoundingClientRect();
  return {left:l+8,top:t+safeTop+8,right:l+w-8,bottom:n&&n.height>0&&n.top>t&&n.top<t+h?Math.min(t+h-8,n.top-8):t+h-8};
 }
 function fitAnchor(x,y){const b=bounds(),p=C.clampBox(x,y,anchor.offsetWidth,anchor.offsetHeight,b);anchor.style.left=p.x+'px';anchor.style.top=p.y+'px';anchor.style.right='auto';anchor.style.bottom='auto';fitBalloon();}
 function fitBalloon(){if(balloon.hidden)return;const r=anchor.getBoundingClientRect(),b=bounds();balloon.style.maxHeight=Math.max(100,b.bottom-b.top)+'px';const p=C.bubblePosition(r,balloon.offsetWidth,balloon.offsetHeight,b);balloon.style.left=p.x+'px';balloon.style.top=p.y+'px';}
 function fitPanel(){if(panel.hidden)return;const b=bounds();panel.style.maxHeight=Math.max(100,b.bottom-b.top)+'px';const r=panel.getBoundingClientRect(),p=C.clampBox(r.left,r.top,r.width,r.height,b);panel.style.left=p.x+'px';panel.style.top=p.y+'px';panel.style.right='auto';panel.style.bottom='auto';}
 function reflow(){if(anchor.style.left){const r=anchor.getBoundingClientRect();fitAnchor(r.left,r.top);}fitBalloon();fitPanel();}

 function speak(text,manual=false){if(root.hidden||document.hidden||(!manual&&(!prefs.auto||prefs.focus||C.isQuiet(prefs))))return;balloon.querySelector('p').textContent=text;balloon.hidden=false;fitBalloon();until=Date.now()+14000;icon.classList.remove('talking');void icon.offsetWidth;icon.classList.add('talking');l3play('talk');if(!manual)lastAuto=Date.now();}
 let reactionTimer=0;
 function react(kind){
  clearTimeout(reactionTimer);icon.classList.remove('talking','lion-react-ok','lion-react-bad','lion-react-hello');
  void icon.offsetWidth;icon.classList.add('lion-react-'+(kind==='celebrate'?'ok':kind));l3play(kind);
  reactionTimer=setTimeout(()=>icon.classList.remove('lion-react-ok','lion-react-bad','lion-react-hello'),1900);
 }
 document.addEventListener('evolab:answer',e=>{
  if(root.hidden||document.hidden||!e.detail)return;
  if(panel.hidden){if(!prefs.focus)speak(e.detail.text,true);}else advice.textContent=e.detail.text;
  react(e.detail.kind==='ok'?'ok':'bad');
 });
 document.addEventListener('evolab:milestone',e=>{
  if(root.hidden||document.hidden||!e.detail)return;
  const text=phrase(e.detail.kind,e.detail.x);
  if(panel.hidden){if(!prefs.focus)speak(text,true);}else advice.textContent=text;
  react(e.detail.kind==='levelup'||e.detail.kind==='gift'||e.detail.kind==='bonus'?'celebrate':'ok');
 });
 function open(){react('hello');panel.hidden=false;balloon.hidden=true;icon.setAttribute('aria-expanded','true');clock();advice.textContent=suggestion();fitPanel();$('#lion-close').focus({preventScroll:true});startMesh();initStage();}
 function close(){panel.hidden=true;killStage();icon.setAttribute('aria-expanded','false');stopMesh();icon.focus();}
 $('#lion-close').addEventListener('click',close);
 const panelHead=panel.querySelector('header');let panelDrag=null;
 panelHead.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;const r=panel.getBoundingClientRect();panelDrag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};panelHead.setPointerCapture(e.pointerId);});
 panelHead.addEventListener('pointermove',e=>{if(!panelDrag)return;const pos=C.clampBox(panelDrag.left+e.clientX-panelDrag.x,panelDrag.top+e.clientY-panelDrag.y,panel.offsetWidth,panel.offsetHeight,bounds());panel.style.left=pos.x+'px';panel.style.top=pos.y+'px';panel.style.right='auto';panel.style.bottom='auto';});
 panelHead.addEventListener('pointerup',()=>{panelDrag=null;});panelHead.addEventListener('pointercancel',()=>{panelDrag=null;});

 balloon.querySelector('button').addEventListener('click',()=>{balloon.hidden=true;lastAuto=Date.now();});
 icon.addEventListener('click',()=>{if(moved){moved=false;return;}panel.hidden?open():close();});
 icon.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=anchor.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};moved=false;icon.setPointerCapture(e.pointerId);});
 icon.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)moved=true;if(moved)fitAnchor(drag.left+dx,drag.top+dy);});
 const endDrag=()=>{drag=null;};icon.addEventListener('pointerup',endDrag);icon.addEventListener('pointercancel',endDrag);
 icon.addEventListener('keydown',e=>{if(!e.shiftKey||!e.key.startsWith('Arrow'))return;e.preventDefault();const r=anchor.getBoundingClientRect();fitAnchor(r.left+(e.key==='ArrowLeft'?-15:e.key==='ArrowRight'?15:0),r.top+(e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close();});
 root.querySelectorAll('[data-lion-action]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.lionAction;react('hello');if(k==='help'){try{window.EvoLion&&window.EvoLion.help();}catch(e){}return;}advice.textContent=k==='study'?suggestion():message(k);if(k==='water'||k==='walk')last[k]=elapsed;}));
 function hours(sel,val){if(!sel.options.length)for(let h=0;h<24;h++)sel.add(new Option(String(h).padStart(2,'0')+':00',String(h)));sel.value=String(val);}
 function fillVoices(){const sel=$('#lion-voice'),synth=window.speechSynthesis;if(!sel)return;const list=synth?synth.getVoices().filter(v=>/^pt\b/i.test(v.lang)):[];sel.innerHTML='<option value="">Automática (português)</option>'+list.map(v=>`<option value="${v.name.replace(/"/g,'&quot;')}">${v.name.replace(/</g,'&lt;')} (${v.lang})</option>`).join('');sel.value=list.some(v=>v.name===prefs.voiceName)?prefs.voiceName:'';$('#lion-voice-note').textContent=!synth?'Este aparelho não oferece voz. Os balões continuam funcionando.':list.length?'As vozes disponíveis dependem do aparelho. São vozes do sistema, sem imitar ninguém.':'Nenhuma voz em português encontrada neste aparelho; vou usar a padrão.';}
 function configure(){prefs=C.settings(prefs);$('#lion-auto').checked=prefs.auto;$('#lion-focus').checked=prefs.focus;$('#lion-motion').checked=prefs.motion;$('#lion-quiet').checked=prefs.quiet.on;hours($('#lion-qfrom'),prefs.quiet.from);hours($('#lion-qto'),prefs.quiet.to);$('#lion-quiet-hours').hidden=!prefs.quiet.on;$('#lion-water').value=String(prefs.water);$('#lion-walk').value=String(prefs.walk);$('#lion-tone').value=prefs.tone;$('#lion-rate').value=String(prefs.rate);fillVoices();
  if(window.EvoFeedback&&window.EvoFeedback.configure)window.EvoFeedback.configure({voiceName:prefs.voiceName,rate:prefs.rate,phrase:k=>C.phrase(prefs.tone,k)});root.classList.toggle('lion-still',!prefs.motion);l3motion();if(!prefs.motion)stopMesh();else if(!panel.hidden)startMesh();}
 root.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;
  if(id==='lion-auto'){prefs.auto=e.target.checked;if(!prefs.auto)balloon.hidden=true;}
  else if(id==='lion-focus'){prefs.focus=e.target.checked;if(prefs.focus)balloon.hidden=true;}
  else if(id==='lion-motion')prefs.motion=e.target.checked;
  else if(id==='lion-quiet')prefs.quiet.on=e.target.checked;
  else if(id==='lion-qfrom')prefs.quiet.from=Number(v);else if(id==='lion-qto')prefs.quiet.to=Number(v);
  else if(id==='lion-water')prefs.water=Number(v);else if(id==='lion-walk')prefs.walk=Number(v);
  else if(id==='lion-tone')prefs.tone=v;else if(id==='lion-voice')prefs.voiceName=v;else if(id==='lion-rate')prefs.rate=Number(v);
  else return;
  configure();commit();});
 $('#lion-testvoice').addEventListener('click',()=>{const t=phrase('ok');advice.textContent=t;react('ok');try{window.EvoFeedback&&window.EvoFeedback.say(t,true);}catch(err){}});
 if(window.speechSynthesis&&speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',fillVoices);
 function syncRemote(){try{const r=window.EvoLion&&window.EvoLion.prefs();if(r&&(Number(r.at)||0)>(prefs.at||0)){prefs=C.settings(r);save();configure();}}catch(err){}}
 function page(){const c=clock();root.hidden=!document.querySelector('#app .shell');if(root.hidden){balloon.hidden=true;panel.hidden=true;stopMesh();return;}initIcon();syncRemote();if(!panel.hidden)advice.textContent=suggestion();if(prefs.auto&&!prefs.focus&&!C.isQuiet(prefs)&&seenDay!==c.key&&!document.hidden){seenDay=c.key;save();speak(C.greeting(undefined,prefs.tone));}}
 const app=document.getElementById('app');if(app)new MutationObserver(page).observe(app,{childList:true,subtree:false});
 addEventListener('hashchange',()=>setTimeout(()=>{page();reflow();},100));addEventListener('resize',reflow);if(window.visualViewport){visualViewport.addEventListener('resize',reflow);visualViewport.addEventListener('scroll',reflow);}
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();root.classList.toggle('lion-suspended',document.hidden);if(document.hidden){balloon.hidden=true;stopMesh();[L3i,L3s].forEach(l=>l&&l.stop());}else{page();if(!panel.hidden)startMesh();l3motion();}});
 setInterval(()=>{const now=Date.now(),delta=Math.min(10000,Math.max(0,now-lastTick));lastTick=now;if(root.hidden||document.hidden||!document.hasFocus())return;elapsed+=delta;clock();if(until&&now>until)balloon.hidden=true;const day=C.clock().key;if(day!==seenDay)page();if(now-lastAuto<5*60000||!panel.hidden||prefs.focus||C.isQuiet(prefs))return;const ctx=window.EvoLion&&window.EvoLion.context(),sm=C.smart(ctx,prefs,sentToday(),new Date())||C.goalNudge(ctx,prefs,sentToday(),new Date());if(sm){markSent(sm.key);speak(sm.text);return;}const k=C.due(elapsed,last,prefs);if(k){last[k]=elapsed;const both=k==='walk'&&elapsed-last.water>=prefs.water*60000;if(both)last.water=elapsed;speak(both?'Hora da pausa: que tal tomar água e dar uma caminhada antes de continuar?':k==='study'?suggestion():message(k));}},5000);
 // A rede fica na camada de vidro, sem capturar cliques ou rodar com a janela fechada.
 const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),calm=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,lastFrame=0;
 const nodes=Array.from({length:18},()=>({x:Math.random(),y:Math.random(),dx:(Math.random()-.5)*.0005,dy:(Math.random()-.5)*.0004}));
 function stopMesh(){cancelAnimationFrame(frame);frame=0;lastFrame=0;}
 function startMesh(){stopMesh();if(!ctx||panel.hidden||document.hidden)return;const w=panel.clientWidth,h=panel.clientHeight;canvas.width=w;canvas.height=h;function draw(t){if(panel.hidden||document.hidden){stopMesh();return;}if(!lastFrame||t-lastFrame>=33){ctx.clearRect(0,0,w,h);nodes.forEach(n=>{if(prefs.motion&&!calm.matches){n.x+=n.dx;n.y+=n.dy;if(n.x<0||n.x>1)n.dx*=-1;if(n.y<0||n.y>1)n.dy*=-1;}ctx.fillStyle='#92EEFF';ctx.beginPath();ctx.arc(n.x*w,n.y*h,1.5,0,7);ctx.fill();});nodes.forEach((a,i)=>nodes.slice(i+1).forEach(b=>{const d=Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);if(d<110){ctx.strokeStyle=`rgba(100,220,255,${1-d/110})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}));lastFrame=t;}if(prefs.motion&&!calm.matches)frame=requestAnimationFrame(draw);}draw(0);}

 // Lion Suheth em 3D (WebGL próprio, sem bibliotecas). Se o aparelho não suportar, continua a arte 2D.
 const l3ok=!!(window.Lion3D&&Lion3D.supported());let L3i=null,L3s=null;
 const motionOn=()=>prefs.motion&&!calm.matches;
 const clipOf={ok:'cheer',bad:'oops',hello:'hello',celebrate:'celebrate'};
 function l3play(k){const c=clipOf[k]||k;[L3i,L3s].forEach(l=>{if(l)l.play(c);});}
 function initIcon(){if(L3i||!l3ok||root.hidden)return;try{L3i=Lion3D.create(icon.querySelector('canvas.lion-3d'),{fps:20,maxDpr:2,dist:7.8,target:[0,1.55,0],motion:motionOn()});}catch(e){L3i=null;}if(!L3i)return;icon.classList.add('l3');if(motionOn()&&!document.hidden)L3i.start();else L3i.still();}
 function l3motion(){const m=motionOn();[L3i,L3s].forEach(l=>{if(!l)return;l.setMotion(m);if(m&&!document.hidden)l.start();else l.still();});}
 function initStage(){if(L3s||!l3ok)return;const cv=panel.querySelector('.lion-stage-cv');try{L3s=Lion3D.create(cv,{fps:30,maxDpr:2,dist:9.2,target:[0,1.6,0],motion:motionOn(),force:true});}catch(e){L3s=null;}if(!L3s){panel.querySelector('.lion-stage').hidden=true;return;}L3s.drag(cv);if(motionOn())L3s.start();else L3s.still();}
 function killStage(){if(L3s){L3s.dispose();L3s=null;}}
 root.addEventListener('click',e=>{const b=e.target.closest('[data-l3]');if(!b)return;const k=b.dataset.l3;if(L3s)L3s.play(k);if(L3i)L3i.play(k);});
 if(!l3ok){const st=panel.querySelector('.lion-stage');if(st)st.hidden=true;}
 configure();page();initIcon();
})();
