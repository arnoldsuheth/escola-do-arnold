(function(){
 'use strict';
 if(!window.LionCore||document.getElementById('lion-companion'))return;
 const C=window.LionCore,storeKey='evolab-lion-v1';
 const load=()=>{try{return JSON.parse(localStorage.getItem(storeKey))||{};}catch(e){return {};}};
 const saved=load();let prefs=C.settings(saved.prefs),seenDay=saved.seenDay||'',elapsed=0,last={water:0,walk:0,study:0},lastTick=Date.now(),lastAuto=0,until=0,drag=null,moved=false;
 const root=document.createElement('div');root.id='lion-companion';root.hidden=true;
 root.innerHTML=`<div id="lion-anchor"><button id="lion-icon" aria-label="Abrir Lion Cristal. Arraste para mover" aria-expanded="false" aria-controls="lion-panel"><img src="assets/lion-cristal.webp" alt="Lion Cristal, mascote do Evolution Lab" draggable="false"></button></div><aside id="lion-balloon" role="status" aria-live="polite" hidden><strong>Lion Cristal</strong><p></p><button type="button" aria-label="Dispensar balão">×</button></aside><section id="lion-panel" role="dialog" aria-label="Lion Cristal, assistente de estudos" hidden><canvas aria-hidden="true"></canvas><div class="lion-front"><header><img src="assets/lion-cristal.webp" alt="" draggable="false"><div><strong>Lion Cristal</strong><small>Seu companheiro de evolução</small></div><button type="button" id="lion-close" aria-label="Fechar janela">−</button></header><div class="lion-body"><p id="lion-date"></p><p id="lion-advice" aria-live="polite"></p><div class="lion-actions"><button type="button" data-lion-action="study">Estudar agora</button><button type="button" data-lion-action="water">Água</button><button type="button" data-lion-action="walk">Pausa</button></div><details><summary>Como o Lion funciona</summary><p class="lion-note">Sou um companheiro com falas programadas. Uso o horário de Brasília, a página aberta e o tempo nesta aba para sugerir estudo e pausas. Não leio sua conversa do ChatGPT e não respondo por meio dela.</p><p class="lion-note">Neste navegador ficam apenas suas preferências e a data da saudação. Os contadores de lembretes recomeçam ao recarregar; não são sincronizados entre aparelhos. O progresso dos cursos usa a sincronização própria da plataforma.</p></details><details><summary>Preferências do Lion</summary><div class="lion-settings"><label>Balões automáticos<input type="checkbox" id="lion-auto"></label><label>Movimento do mascote<input type="checkbox" id="lion-motion"></label><p>Água: a cada 20 minutos.<br>Caminhada: a cada 1 hora.</p></div></details><p class="lion-note">Horário de Brasília. Sugestões locais, sem IA conectada. Os lembretes contam o tempo nesta aba visível e em foco; não enviam notificações fora da plataforma.</p></div></div></section>`;
 document.body.append(root);
 const $=s=>root.querySelector(s),anchor=$('#lion-anchor'),icon=$('#lion-icon'),balloon=$('#lion-balloon'),panel=$('#lion-panel'),advice=$('#lion-advice');
 const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify({prefs,seenDay}));}catch(e){}};
 function done(){const all=document.querySelectorAll('#view .quest');return all.length>0&&Array.from(all).every(q=>q.classList.contains('done'));}
 function suggestion(){return C.suggestion(location.hash,done());}
 const messages={water:'Que tal fazer uma pausa para tomar água? Deixe sua garrafinha por perto e volte no seu ritmo.',walk:'Hora de uma pausa? Levante, caminhe um pouco e descanse os olhos antes de continuar.'};
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

 function speak(text,manual=false){if(root.hidden||document.hidden||(!manual&&!prefs.auto))return;balloon.querySelector('p').textContent=text;balloon.hidden=false;fitBalloon();until=Date.now()+14000;icon.classList.remove('talking');void icon.offsetWidth;icon.classList.add('talking');if(!manual)lastAuto=Date.now();}
 function open(){panel.hidden=false;balloon.hidden=true;icon.setAttribute('aria-expanded','true');clock();advice.textContent=suggestion();fitPanel();$('#lion-close').focus({preventScroll:true});startMesh();}
 function close(){panel.hidden=true;icon.setAttribute('aria-expanded','false');stopMesh();icon.focus();}
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
 root.querySelectorAll('[data-lion-action]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.lionAction;advice.textContent=k==='study'?suggestion():messages[k];if(k!=='study')last[k]=elapsed;}));
 function configure(){prefs=C.settings(prefs);$('#lion-auto').checked=prefs.auto;$('#lion-motion').checked=prefs.motion;root.classList.toggle('lion-still',!prefs.motion);if(!prefs.motion)stopMesh();else if(!panel.hidden)startMesh();}
 root.addEventListener('change',e=>{if(e.target.id==='lion-auto'){prefs.auto=e.target.checked;if(!prefs.auto)balloon.hidden=true;}if(e.target.id==='lion-motion')prefs.motion=e.target.checked;configure();save();});
 function page(){const c=clock();root.hidden=!document.querySelector('#app .shell');if(root.hidden){balloon.hidden=true;panel.hidden=true;stopMesh();return;}if(!panel.hidden)advice.textContent=suggestion();if(prefs.auto&&seenDay!==c.key&&!document.hidden){seenDay=c.key;save();speak(C.greeting());}}
 const app=document.getElementById('app');if(app)new MutationObserver(page).observe(app,{childList:true,subtree:false});
 addEventListener('hashchange',()=>setTimeout(()=>{page();reflow();},100));addEventListener('resize',reflow);if(window.visualViewport){visualViewport.addEventListener('resize',reflow);visualViewport.addEventListener('scroll',reflow);}
 document.addEventListener('visibilitychange',()=>{lastTick=Date.now();if(document.hidden){balloon.hidden=true;stopMesh();}else{page();if(!panel.hidden)startMesh();}});
 setInterval(()=>{const now=Date.now(),delta=Math.min(10000,Math.max(0,now-lastTick));lastTick=now;if(root.hidden||document.hidden||!document.hasFocus())return;elapsed+=delta;clock();if(until&&now>until)balloon.hidden=true;const day=C.clock().key;if(day!==seenDay)page();if(now-lastAuto<5*60000||!panel.hidden)return;const k=C.due(elapsed,last,prefs);if(k){last[k]=elapsed;const both=k==='walk'&&elapsed-last.water>=prefs.water*60000;if(both)last.water=elapsed;speak(both?'Hora da pausa: que tal tomar água e dar uma caminhada antes de continuar?':k==='study'?suggestion():messages[k]);}},5000);
 // A rede fica na camada de vidro, sem capturar cliques ou rodar com a janela fechada.
 const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),calm=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,lastFrame=0;
 const nodes=Array.from({length:18},()=>({x:Math.random(),y:Math.random(),dx:(Math.random()-.5)*.0005,dy:(Math.random()-.5)*.0004}));
 function stopMesh(){cancelAnimationFrame(frame);frame=0;lastFrame=0;}
 function startMesh(){stopMesh();if(!ctx||panel.hidden||document.hidden)return;const w=panel.clientWidth,h=panel.clientHeight;canvas.width=w;canvas.height=h;function draw(t){if(panel.hidden||document.hidden){stopMesh();return;}if(!lastFrame||t-lastFrame>=33){ctx.clearRect(0,0,w,h);nodes.forEach(n=>{if(prefs.motion&&!calm.matches){n.x+=n.dx;n.y+=n.dy;if(n.x<0||n.x>1)n.dx*=-1;if(n.y<0||n.y>1)n.dy*=-1;}ctx.fillStyle='#92EEFF';ctx.beginPath();ctx.arc(n.x*w,n.y*h,1.5,0,7);ctx.fill();});nodes.forEach((a,i)=>nodes.slice(i+1).forEach(b=>{const d=Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);if(d<110){ctx.strokeStyle=`rgba(100,220,255,${1-d/110})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}));lastFrame=t;}if(prefs.motion&&!calm.matches)frame=requestAnimationFrame(draw);}draw(0);}
 configure();page();
})();
