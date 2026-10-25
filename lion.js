(function(){
 'use strict';
 if(!window.LionCore||document.getElementById('lion-companion'))return;
 const C=window.LionCore,storeKey='evolab-lion-v1';
 const load=()=>{try{return JSON.parse(localStorage.getItem(storeKey))||{};}catch(e){return {};}};
 const saved=load();let prefs=C.settings(saved.prefs),seenDay=saved.seenDay||'',sent=saved.sent||{day:'',keys:{}},elapsed=0,last={water:0,walk:0,study:0},lastTick=Date.now(),lastAuto=0,until=0,drag=null,moved=false;
 const root=document.createElement('div');root.id='lion-companion';root.hidden=true;
 root.innerHTML=`<div id="lion-anchor"><button id="lion-icon" aria-label="Abrir Lion Suheth. Arraste para mover" aria-expanded="false" aria-controls="lion-panel"><span class="lion-orbit" aria-hidden="true"></span><img src="assets/lion-cristal.webp" alt="Lion Suheth, mascote do Evolution Lab" draggable="false"><canvas class="lion-3d" aria-hidden="true"></canvas><span class="lion-dot" aria-hidden="true"></span></button></div><aside id="lion-balloon" role="status" aria-live="polite" hidden><strong>Lion Suheth</strong><p></p><button type="button" aria-label="Dispensar balão">×</button></aside><section id="lion-panel" role="dialog" aria-label="Lion Suheth, assistente de estudos" hidden><canvas aria-hidden="true"></canvas><div class="lion-front"><header><img src="assets/lion-cristal.webp" alt="" draggable="false"><div><strong>Lion Suheth</strong><small id="lion-sub">Seu companheiro de evolução</small></div><span class="lion-mood" id="lion-mood" role="status"></span><button type="button" id="lion-close" aria-label="Fechar janela">−</button></header><div class="lion-stage"><canvas class="lion-stage-cv" role="img" aria-label="Lion Suheth em 3D. Arraste para girar 360 graus. Toque duas vezes para voltar de frente."></canvas><div class="lion-stage-btns"><button type="button" data-l3="spin">Girar</button><button type="button" data-l3="hello">Acenar</button><button type="button" data-l3="celebrate">Comemorar</button><button type="button" data-l3="oops">Ops</button></div></div><div class="lion-body"><p id="lion-date"></p><p id="lion-advice" aria-live="polite"></p><div class="pet-bars" id="pet-bars"></div><div class="pet-ration"><span aria-hidden="true" class="pet-bolt">⚡</span><div class="pet-pel" id="pet-pel"></div><small id="pet-rtxt"></small></div><p class="pet-earn" id="pet-earn"></p><div class="lion-actions pet-actions"><button type="button" data-pet="feed">Comer<small>4⚡ · +30 fome</small></button><button type="button" data-pet="drink">Água<small>2⚡ · +40 sede</small></button><button type="button" data-pet="play">Brincar<small>3⚡ · +15 humor</small></button><button type="button" data-pet="nap">Soneca<small>1⚡ · +30 energia</small></button></div><div class="lion-actions"><button type="button" data-lion-action="study">Estudar agora</button><button type="button" data-lion-action="help">Pedir ajuda ao Claude</button></div><details><summary>Como o Lion funciona</summary><p class="lion-note">Cuidar de mim custa ⚡: cada 10 XP que você ganha vira 1⚡ (seu XP da carreira não diminui). Comer 4⚡, água 2⚡, brincar 3⚡ (uma vez por dia) e soneca 1⚡. Sexta eu descanso e não fico com fome.</p><p class="lion-note">Sou um companheiro com falas programadas. Uso o horário de Brasília, a página aberta e o tempo nesta aba para sugerir estudo e pausas. Não leio sua conversa do ChatGPT e não respondo por meio dela.</p><p class="lion-note">Neste navegador ficam apenas suas preferências e a data da saudação. Os contadores de lembretes recomeçam ao recarregar; não são sincronizados entre aparelhos. O progresso dos cursos usa a sincronização própria da plataforma.</p></details><details><summary>Preferências do Lion</summary><div class="lion-settings"><label>Balões automáticos<input type="checkbox" id="lion-auto"></label><label>Modo foco (só falo quando você me chamar)<input type="checkbox" id="lion-focus"></label><label>Movimento do mascote<input type="checkbox" id="lion-motion"></label><label>Falar os balões em voz alta<input type="checkbox" id="lion-speak"></label><label>Horário silencioso<input type="checkbox" id="lion-quiet"></label><div class="lion-row" id="lion-quiet-hours"><label>De<select id="lion-qfrom"></select></label><label>Até<select id="lion-qto"></select></label></div><label>Água a cada<select id="lion-water"><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option></select></label><label>Caminhada a cada<select id="lion-walk"><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label><label>Tom das falas<select id="lion-tone"><option value="divertido">Divertido</option><option value="motivador">Motivador</option><option value="firme">Firme</option></select></label><label>Voz<select id="lion-voice"><option value="">Automática (português)</option></select></label><label>Tom da voz (se não houver masculina)<select id="lion-pitch"><option value="0.78">Grave</option><option value="1">Normal</option><option value="1.45">Criança</option><option value="1.8">Criança pequena</option></select></label><label>Velocidade da voz<select id="lion-rate"><option value="0.85">Lenta</option><option value="1">Normal</option><option value="1.15">Rápida</option></select></label><button type="button" id="lion-testvoice" class="lion-test">Testar voz</button><p class="lion-note" id="lion-voice-note"></p></div></details><p class="lion-note">Horário de Brasília. Sugestões locais, sem IA conectada. Os lembretes contam o tempo nesta aba visível e em foco; não enviam notificações fora da plataforma.</p></div></div></section>`;
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

 function speak(text,manual=false){if(root.hidden||document.hidden||(!manual&&(!prefs.auto||prefs.focus||C.isQuiet(prefs))))return;balloon.querySelector('p').textContent=text;balloon.hidden=false;fitBalloon();until=Date.now()+14000;icon.classList.remove('talking');void icon.offsetWidth;icon.classList.add('talking');l3play('talk');if(prefs.speak&&!manual){try{window.EvoFeedback&&window.EvoFeedback.say(text);}catch(err){}}if(!manual)lastAuto=Date.now();}
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
 document.addEventListener('evolab:milestone',e=>{setTimeout(()=>{try{petRefresh();}catch(err){}},400);
  if(root.hidden||document.hidden||!e.detail)return;
  const text=phrase(e.detail.kind,e.detail.x);
  if(panel.hidden){if(!prefs.focus)speak(text,true);}else advice.textContent=text;
  try{if(window.EvoFeedback&&EvoFeedback.clipFor(text))EvoFeedback.say(text);}catch(err){}
  react(e.detail.kind==='levelup'||e.detail.kind==='gift'||e.detail.kind==='bonus'?'celebrate':'ok');
 });
 function open(){react('hello');panel.hidden=false;balloon.hidden=true;icon.setAttribute('aria-expanded','true');clock();fillVoices();petRefresh();advice.textContent=suggestion();fitPanel();$('#lion-close').focus({preventScroll:true});startMesh();initStage();}
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
 function fillVoices(){const sel=$('#lion-voice'),synth=window.speechSynthesis;if(!sel)return;const MALE=/\b(felipe|daniel|ricardo|antonio|ant[oô]nio|donato|jorge|paulo|lucas|rafael|thiago|fabio|f[aá]bio|male|masculin)/i,FEM=/\b(luciana|maria|francisca|vit[oó]ria|camila|giovanna|helena|fernanda|female|feminin)/i,isM=v=>MALE.test(v.name)&&!FEM.test(v.name);const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');const all=synth?synth.getVoices():[];const isPt=v=>/^pt([-_]|$)/i.test(v.lang);const list=all.filter(isPt).sort((a,b)=>isM(b)-isM(a)),other=all.filter(v=>!isPt(v)).sort((a,b)=>a.lang.localeCompare(b.lang)||a.name.localeCompare(b.name));const opt=v=>`<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})${isM(v)?' · masculina':''}</option>`;sel.innerHTML='<option value="">Automática (masculina em português)</option><option value="__off">Sem voz (só texto)</option>'+list.map(opt).join('')+(other.length?'<optgroup label="Outros idiomas (se a voz não estiver em português)">'+other.map(opt).join('')+'</optgroup>':'');sel.value=(prefs.voiceName==='__off'||all.some(v=>v.name===prefs.voiceName))?prefs.voiceName:'';$('#lion-voice-note').textContent=!synth?'Este aparelho não oferece voz. Os balões continuam funcionando.':list.length?(list.some(isM)?'Prefiro voz masculina: escolhi automaticamente uma do seu aparelho. Você pode trocar acima.':'Este aparelho só entrega ao navegador vozes femininas em português (no iPhone costumam ser Luciana e Joana). A Felipe, mesmo instalada, o Safari não costuma liberar para sites. Por isso uso a voz disponível com tom grave: ajuste em Tom da voz.'):'Nenhuma voz em português encontrada neste aparelho; vou usar a padrão.';}
 function configure(){prefs=C.settings(prefs);$('#lion-auto').checked=prefs.auto;$('#lion-focus').checked=prefs.focus;$('#lion-motion').checked=prefs.motion;$('#lion-speak').checked=!!prefs.speak;$('#lion-quiet').checked=prefs.quiet.on;hours($('#lion-qfrom'),prefs.quiet.from);hours($('#lion-qto'),prefs.quiet.to);$('#lion-quiet-hours').hidden=!prefs.quiet.on;$('#lion-water').value=String(prefs.water);$('#lion-walk').value=String(prefs.walk);$('#lion-tone').value=prefs.tone;$('#lion-rate').value=String(prefs.rate);$('#lion-pitch').value=String(prefs.pitch);fillVoices();
  if(window.EvoFeedback&&window.EvoFeedback.configure)window.EvoFeedback.configure({voiceName:prefs.voiceName,rate:prefs.rate,pitch:prefs.pitch,phrase:k=>C.phrase(prefs.tone,k)});root.classList.toggle('lion-still',!prefs.motion);l3motion();if(!prefs.motion)stopMesh();else if(!panel.hidden)startMesh();}
 root.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;
  if(id==='lion-auto'){prefs.auto=e.target.checked;if(!prefs.auto)balloon.hidden=true;}
  else if(id==='lion-focus'){prefs.focus=e.target.checked;if(prefs.focus)balloon.hidden=true;}
  else if(id==='lion-motion')prefs.motion=e.target.checked;
  else if(id==='lion-speak')prefs.speak=e.target.checked;
  else if(id==='lion-quiet')prefs.quiet.on=e.target.checked;
  else if(id==='lion-qfrom')prefs.quiet.from=Number(v);else if(id==='lion-qto')prefs.quiet.to=Number(v);
  else if(id==='lion-water')prefs.water=Number(v);else if(id==='lion-walk')prefs.walk=Number(v);
  else if(id==='lion-tone')prefs.tone=v;else if(id==='lion-voice')prefs.voiceName=v;else if(id==='lion-rate')prefs.rate=Number(v);else if(id==='lion-pitch')prefs.pitch=Number(v);
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
 function initIcon(){if(L3i||!l3ok||root.hidden)return;try{L3i=Lion3D.create(icon.querySelector('canvas.lion-3d'),{model:'chip_prata',fps:20,maxDpr:2,dist:8.2,target:[0,1.45,0],motion:motionOn()});}catch(e){L3i=null;}if(!L3i)return;icon.classList.add('l3');{const m0=C.petMood(prefs.pet,C.clock().hour,C.clock().key);L3i.setBase(m0.base);L3i.setMood(m0.state);}if(motionOn()&&!document.hidden)L3i.start();else L3i.still();}
 function l3motion(){const m=motionOn();[L3i,L3s].forEach(l=>{if(!l)return;l.setMotion(m);if(m&&!document.hidden)l.start();else l.still();});}
 function initStage(){if(L3s||!l3ok)return;const cv=panel.querySelector('.lion-stage-cv');try{L3s=Lion3D.create(cv,{model:'chip_prata',fps:30,maxDpr:2,dist:9.4,target:[0,1.5,0],motion:motionOn(),force:true});}catch(e){L3s=null;}if(!L3s){panel.querySelector('.lion-stage').hidden=true;return;}L3s.drag(cv,stageTap);
  if(window.LionFX){try{const st=panel.querySelector('.lion-stage'),FX=LionFX.create(st);let sleeping=false;const o={play:L3s.play,setBase:L3s.setBase,setMood:L3s.setMood,start:L3s.start,stop:L3s.stop,setMotion:L3s.setMotion,dispose:L3s.dispose};
   L3s.play=function(n){FX.scene(n);return o.play.apply(L3s,arguments);};
   L3s.setBase=function(n){if(n==='sleepy'){if(!sleeping){sleeping=true;FX.scene('sleepy',Infinity);}}else if(sleeping){sleeping=false;FX.calm();}return o.setBase.apply(L3s,arguments);};
   L3s.setMood=function(s){FX.setMood(s);return o.setMood.apply(L3s,arguments);};
   L3s.start=function(){FX.start();return o.start.apply(L3s,arguments);};L3s.stop=function(){FX.stop();return o.stop.apply(L3s,arguments);};
   L3s.setMotion=function(v){FX.setMotion(v);return o.setMotion.apply(L3s,arguments);};
   L3s.dispose=function(){FX.stop();st.querySelectorAll('canvas.lion-fx').forEach(c=>c.remove());return o.dispose.apply(L3s,arguments);};
   const m2=C.petMood(prefs.pet,C.clock().hour,C.clock().key);FX.setMood(m2.state);if(m2.base==='sleepy'){sleeping=true;FX.scene('sleepy',Infinity);}
  }catch(e){}}
  {const m1=C.petMood(prefs.pet,C.clock().hour,C.clock().key);L3s.setBase(m1.base);L3s.setMood(m1.state);}if(motionOn())L3s.start();else L3s.still();}
 panel.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)panel.querySelectorAll('details').forEach(o=>{if(o!==d)o.open=false;});}));
 let tapN=-1;
 function stageTap(){const pick=[['hello','ok'],['cheer','ok'],['spin','ok'],['talk','water'],['oops','bad'],['cheer','ok'],['hello','water'],['talk','walk']];let i;do{i=Math.floor(Math.random()*pick.length);}while(i===tapN);tapN=i;const [clip,kind]=pick[i];if(L3s)L3s.play(clip);if(L3i)L3i.play(clip);const text=C.phrase('divertido',kind);advice.textContent=text;try{if(prefs.voiceName!=='__off'&&window.EvoFeedback&&EvoFeedback.clipFor(text))EvoFeedback.say(text);}catch(err){}}
 function killStage(){if(L3s){L3s.dispose();L3s=null;}}
 root.addEventListener('click',e=>{const b=e.target.closest('[data-l3]');if(!b)return;const k=b.dataset.l3;if(L3s)L3s.play(k);if(L3i)L3i.play(k);});
 if(!l3ok){const st=panel.querySelector('.lion-stage');if(st)st.hidden=true;}

 // Lion Tamagotchi: fome, sede e energia; a ração vem do seu XP. Nunca morre.
 const xpNow=()=>{try{return window.EvoLion&&window.EvoLion.xp?window.EvoLion.xp():null;}catch(e){return null;}};
 const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
 function petSync(){const before=prefs.pet;let p=C.petTick(before,Date.now(),prefs);const r=C.petRation(p,xpNow());prefs.pet=r.pet;if(!before||!before.at||r.given){commit();}
  if(r.given&&!root.hidden)speak(`Chegou energia ⚡ pelo seu estudo: +${r.given}! Passa aqui pra cuidar de mim.`);return r.given;}
 function petSay(text,clip){advice.textContent=text;try{if(clip&&prefs.voiceName!=='__off'&&window.EvoFeedback&&EvoFeedback.clipFor(text))EvoFeedback.say(text);}catch(err){}}
 function renderPet(){const c=C.clock(),p=prefs.pet,m=C.petMood(p,c.hour,c.key),xp=xpNow();
  const bars=[['Fome',p.fome,'#F59E0B'],['Sede',p.sede,'#38BDF8'],['Energia',p.energia,'#A78BFA'],['Humor',m.humor,'#34D399']];
  $('#pet-bars').innerHTML=bars.map(b=>{const v=Math.round(b[1]);return `<div class="pet-bar${v<30?' low':''}"><div class="pl">${b[0]}<b>${v}%</b></div><div class="pt" role="progressbar" aria-label="${b[0]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><div class="pf" style="width:${v}%;--c:${b[2]}"></div></div></div>`;}).join('');
  $('#pet-pel').innerHTML=Array.from({length:10},(_,i)=>`<i class="${p.racao>=(i+1)*4?'':p.racao>i*4?'h':'e'}"></i>`).join('');
  $('#pet-rtxt').textContent=`${p.racao}⚡ de ${C.PET.maxRation}`;
  const falta=xp!==null&&p.xpSeen!==null?Math.max(1,C.PET.xpPerRation-(xp-p.xpSeen)):null;
  $('#pet-earn').textContent=p.racao>=C.PET.maxRation?'⚡ cheio! Cuide dele: comer, beber, brincar.':falta!==null?`Faltam ${falta} XP para +1⚡ (a cada ${C.PET.xpPerRation} XP).`:'';
  const chip=$('#lion-mood');chip.textContent=m.label;chip.dataset.mood=m.state;$('#lion-sub').textContent=`Dia ${C.petDays(p,Date.now())} juntos`;
  icon.dataset.mood=m.state;icon.setAttribute('aria-label',`Abrir Lion Suheth, humor: ${m.label}. Arraste para mover`);
  [L3i,L3s].forEach(l=>{if(l){l.setBase(m.base);l.setMood(m.state);}});return m;}
 function petRefresh(){petSync();return renderPet();}
 const petLines={feliz:['Estou radiante! Obrigado pela força nos estudos.','Barriga cheia e cabeça boa. Bora evoluir!'],fome:['Minha barriga tá roncando... Uma aulinha rende ⚡ pra mim!','Sem ⚡ eu murcho. Estuda um pouquinho?'],sono:['Zzz... soneca merecida?','Já passou da hora de descansar. Amanhã a gente continua.']};
 root.addEventListener('click',e=>{const b=e.target.closest('[data-pet]');if(!b)return;const k=b.dataset.pet;petSync();let r,m;
  if(k==='feed'){r=C.petFeed(prefs.pet);prefs.pet=r.pet;if(r.ok){commit();if(L3s)L3s.play('eat');if(L3i)L3i.play('eat');petSay(Math.random()<.5?'Mandou bem demais!':'Isso aí, craque!',true);}else petSay(r.why==='cheio'?'Estou cheio! Guarda o ⚡ pra depois.':'Faltou ⚡! Comer custa 4⚡. Estuda um pouco que eu ganho energia.');}
  else if(k==='drink'){r=C.petDrink(prefs.pet);prefs.pet=r.pet;if(r.ok){last.water=elapsed;commit();if(L3s)L3s.play('drink');if(L3i)L3i.play('drink');petSay('Água! Seu cérebro agradece e eu também.',true);}else petSay(r.why==='sem-racao'?'Faltou ⚡! Água custa 2⚡. Estuda um pouco que eu ganho.':'Estou sem sede agora. Beba você um copo por nós dois!');}
  else if(k==='nap'){r=C.petNap(prefs.pet,C.clock().key);prefs.pet=r.pet;if(r.ok){last.nap=Date.now();commit();[L3s,L3i].forEach(l=>{if(l){l.setBase('sleepy');}});petSay('Zzz... só uma sonequinha.');setTimeout(renderPet,6000);}else petSay(r.why==='limite'?'Já tirei 3 sonecas hoje. Descanso de verdade é à noite!':r.why==='sem-racao'?'Faltou ⚡ pra dormir (1⚡). Estuda um pouquinho!':'Não estou com sono agora.');}
  else if(k==='play'){r=C.petPlay(prefs.pet,C.clock().key);prefs.pet=r.pet;if(r.ok){commit();react('cheer');petSay('Que divertido! Humor lá em cima. Agora bora estudar?',true);}else petSay(r.why==='ja-brincou'?'Já brincamos hoje! Amanhã tem mais.':'Faltou ⚡ pra brincar (3⚡). Estuda um pouquinho!');}
  if(r&&!r.ok)l3play(r.why==='sem-racao'||r.why==='limite'?'oops':'think');
  if(r&&r.ok&&(k==='feed'||k==='drink')){const mm=C.petMood(prefs.pet,C.clock().hour,C.clock().key);if(mm.state==='feliz')setTimeout(()=>{if(!last.nap||Date.now()-last.nap>9000)l3play('cheer');},2300);}
  if(r&&r.ok){const cost=C.PET.cost[k],pop=document.createElement('span');pop.className='pet-pop';pop.textContent='-'+cost+'⚡';b.appendChild(pop);setTimeout(()=>pop.remove(),1100);}
  m=renderPet();if(k==='nap'&&r&&r.ok)[L3s,L3i].forEach(l=>{if(l)l.setBase('sleepy');});});
 setInterval(()=>{if(root.hidden||document.hidden)return;const m=petRefresh(),k=C.clock().key;if(m.state==='fome'&&panel.hidden&&!sentToday()['pet:'+k]&&prefs.auto&&!prefs.focus&&!C.isQuiet(prefs)){markSent('pet:'+k);speak(petLines.fome[Math.floor(Math.random()*petLines.fome.length)]);}},60000);
 configure();page();initIcon();renderPet();
})();
