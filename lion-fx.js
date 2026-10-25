/* Palco do Lion: aura tecnológica (grade, dígitos, pulso) + cenas por evento (comer, beber, dormir, chorar, feliz). Canvas 2D, sem bibliotecas. */
(function(root){
 const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
 const MOOD={feliz:[52,235,130],fome:[255,110,70],sono:[90,130,255]};
 const FONT="'Pixelify Sans','Silkscreen',ui-monospace,monospace";
 function create(stage,opt){
  opt=opt||{};
  const mk=z=>{const c=document.createElement('canvas');c.className='lion-fx';c.setAttribute('aria-hidden','true');c.style.cssText=`position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;return c;};
  const back=mk(0),front=mk(2),cv=stage.querySelector('.lion-stage-cv');
  if(cv){cv.style.position='relative';cv.style.zIndex=1;}
  stage.insertBefore(back,stage.firstChild);stage.appendChild(front);
  const bx=back.getContext('2d'),fx=front.getContext('2d');
  let W=0,H=0,dpr=1,raf=0,run=false,last=0,T=0,mood='feliz',sc=null,parts=[],digits=[],stars=[],still=false,motion=true;
  function size(){const r=stage.getBoundingClientRect();dpr=Math.min(2,root.devicePixelRatio||1);W=Math.max(2,r.width);H=Math.max(2,r.height);[back,front].forEach(c=>{c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);});bx.setTransform(dpr,0,0,dpr,0,0);fx.setTransform(dpr,0,0,dpr,0,0);}
  function seed(){digits=Array.from({length:28},()=>({x:rnd(0,1),y:rnd(0,1),v:rnd(.012,.04),s:rnd(10,15),c:pick(['0','1','{','}','<','>','/','=',';','01','</>','&&']),a:rnd(.12,.34)}));stars=Array.from({length:26},()=>({x:rnd(0,1),y:rnd(0,.7),p:rnd(0,TAU),s:rnd(1,2.4)}));}
  const col=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function spawn(kind,n){for(let i=0;i<n;i++)add(kind);}
  function add(kind){const cx=W/2;
   if(kind==='eat'){const a=rnd(0,TAU);parts.push({k:'eat',x:cx+Math.cos(a)*W*.42,y:H*.9+rnd(-10,10),vx:0,vy:0,tx:cx+rnd(-8,8),ty:H*.42,t:0,d:rnd(.55,.95),s:rnd(5,9),c:pick(['#FCD34D','#F59E0B','#FDE68A','#34D399','#38BDF8'])});}
   else if(kind==='drink'){parts.push({k:'drop',x:cx+rnd(-W*.22,W*.22),y:rnd(-30,0),vy:rnd(220,360),s:rnd(3,6),life:2});}
   else if(kind==='rain'){parts.push({k:'rain',x:rnd(-20,W+20),y:rnd(-40,0),vy:rnd(420,620),l:rnd(10,22),life:3});}
   else if(kind==='tear'){const sd=Math.random()<.5?-1:1;parts.push({k:'tear',x:cx+sd*W*.075,y:H*.43,vy:rnd(30,70),s:rnd(3,5),life:1.1,t:0});}
   else if(kind==='z'){parts.push({k:'z',x:cx+W*.16,y:H*.36,vx:rnd(8,18),vy:-rnd(18,30),s:rnd(14,22),t:0,life:3.2});}
   else if(kind==='confetti'){parts.push({k:'conf',x:rnd(0,W),y:rnd(-30,-4),vx:rnd(-30,30),vy:rnd(90,180),s:rnd(4,8),c:pick(['#A78BFA','#67E8F9','#FCD34D','#34D399','#F472B6','#60A5FA']),life:3,r:rnd(0,TAU)});}
   else if(kind==='spark'){const a=rnd(0,TAU),r=rnd(20,110);parts.push({k:'spark',x:cx+Math.cos(a)*r,y:H*.5+Math.sin(a)*r*.7,s:rnd(3,7),t:0,life:rnd(.5,1),c:pick(['#FDE68A','#A5F3FC','#C4B5FD','#86EFAC'])});}
   else if(kind==='q'){parts.push({k:'q',x:cx+W*.15,y:H*.3,vy:-rnd(14,24),t:0,life:2,s:rnd(18,26)});}
  }
  function scene(name,ms){
   const map={eat:'eat',drink:'drink',sleepy:'sleep',sleep:'sleep',oops:'cry',cry:'cry',hungry:'cry',cheer:'happy',celebrate:'happy',hello:'happy',think:'think',spin:'happy'};
   const s=map[name];if(!s)return;
   sc={name:s,t:0,dur:ms==null?({eat:2.4,drink:2.4,cry:2.6,happy:2.6,think:2,sleep:6}[s]||2.4):ms/1000,keep:ms===Infinity};
   if(ms===Infinity)sc.dur=1e9;
   if(s==='eat'){spawn('eat',16);label('NHAC!','#FCD34D');}
   if(s==='drink')label('GLUP!','#7DD3FC');
   if(s==='happy'){spawn('confetti',34);spawn('spark',14);label('YAY!','#A7F3D0');}
   if(s==='think')label('hmm...','#E9D5FF');
   if(s==='cry')label('buá...','#93C5FD');
   if(s==='sleep')label('zzz','#A5B4FC');
   if(!running()&&still)frame(performance.now(),true);
  }
  function label(t,c){parts.push({k:'txt',t,c,x:W/2,y:H*.2,t0:0,life:1.4});}
  const running=()=>run;
  function setMood(m){if(MOOD[m])mood=m;}
  function calm(){if(sc&&sc.keep){sc=null;}}
  function update(dt){T+=dt;
   if(sc){sc.t+=dt;const s=sc.name;
    if(s==='drink'&&sc.t<1.6&&Math.random()<dt*28)add('drop');
    if(s==='cry'){if(Math.random()<dt*30)add('rain');if(Math.random()<dt*7)add('tear');}
    if(s==='sleep'&&Math.random()<dt*.8)add('z');
    if(s==='happy'&&sc.t<1.8){if(Math.random()<dt*18)add('confetti');if(Math.random()<dt*14)add('spark');}
    if(s==='think'&&Math.random()<dt*1.6)add('q');
    if(s==='eat'&&sc.t<1.5&&Math.random()<dt*8)add('eat');
    if(sc.t>=sc.dur)sc=null;}
   digits.forEach(d=>{d.y-=d.v*dt;if(d.y<-.05){d.y=1.05;d.x=rnd(0,1);}});
   parts.forEach(p=>{p.t=(p.t||0)+dt;
    if(p.k==='eat'){const u=Math.min(1,p.t/p.d),e=u*u*(3-2*u);p.px=p.x+(p.tx-p.x)*e;p.py=p.y+(p.ty-p.y)*e-Math.sin(u*Math.PI)*H*.14;if(u>=1)p.dead=true;}
    else if(p.k==='drop'||p.k==='rain'||p.k==='tear'){p.y+=p.vy*dt;if(p.k==='rain')p.x-=p.vy*dt*.18;p.life-=dt;if(p.y>H*.9||p.life<=0)p.dead=true;}
    else if(p.k==='z'){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t>p.life)p.dead=true;}
    else if(p.k==='conf'){p.vy+=40*dt;p.x+=p.vx*dt+Math.sin(p.t*4+p.r)*.6;p.y+=p.vy*dt;p.r+=dt*6;p.life-=dt;if(p.y>H+10||p.life<=0)p.dead=true;}
    else if(p.k==='spark'||p.k==='q'||p.k==='txt'){if(p.k==='q')p.y+=p.vy*dt;if(p.t>p.life)p.dead=true;}});
   parts=parts.filter(p=>!p.dead);}
  function drawBack(){const c=MOOD[mood],cx=W/2,hz=H*.6;
   bx.clearRect(0,0,W,H);
   let g=bx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0e1430');g.addColorStop(1,'#0a0d1c');bx.fillStyle=g;bx.fillRect(0,0,W,H);
   const sl=sc&&sc.name==='sleep',cr=sc&&sc.name==='cry';
   const pulse=.5+.5*Math.sin(T*1.8);
   g=bx.createRadialGradient(cx,H*.5,4,cx,H*.5,Math.max(W,H)*.62);g.addColorStop(0,col(c,(.2+.1*pulse)*(sl?.5:1)));g.addColorStop(.55,col(c,.07));g.addColorStop(1,'rgba(0,0,0,0)');bx.fillStyle=g;bx.fillRect(0,0,W,H);
   if(sl||sc&&sc.name==='sleep'){stars.forEach(s=>{const a=.35+.65*Math.abs(Math.sin(T*1.4+s.p));bx.fillStyle=`rgba(220,230,255,${a})`;const z=Math.round(s.s);bx.fillRect(Math.round(s.x*W),Math.round(s.y*H),z,z);});
    bx.fillStyle='#FDE68A';bx.beginPath();bx.arc(W*.83,H*.17,16,0,TAU);bx.fill();bx.fillStyle='#0e1430';bx.beginPath();bx.arc(W*.83+8,H*.17-4,14,0,TAU);bx.fill();}
   bx.save();bx.beginPath();bx.rect(0,hz,W,H-hz);bx.clip();
   const sp=(T*.35)%1;bx.strokeStyle=col(c,.28);bx.lineWidth=1;
   for(let i=-14;i<=14;i++){bx.beginPath();bx.moveTo(cx+i*8,hz);bx.lineTo(cx+i*W*.09,H);bx.stroke();}
   for(let i=0;i<9;i++){const u=((i+sp)/9),y=hz+(H-hz)*u*u;bx.globalAlpha=.15+.5*u;bx.beginPath();bx.moveTo(0,y);bx.lineTo(W,y);bx.stroke();}
   bx.restore();bx.globalAlpha=1;
   for(let i=0;i<2;i++){const u=((T*.3+i*.5)%1),rx=W*(.16+.4*u),ry=rx*.22;bx.strokeStyle=col(c,.5*(1-u));bx.lineWidth=2;bx.beginPath();bx.ellipse(cx,H*.84,rx,ry,0,0,TAU);bx.stroke();}
   if(!sl&&Math.sin(T*2.3)>.97)for(let i=0;i<3;i++){bx.fillStyle=col(c,.5);bx.fillRect(Math.round(rnd(0,W)),Math.round(rnd(0,H*.6)),2,2);}
   bx.font=`12px ${FONT}`;bx.textBaseline='middle';
   digits.forEach(d=>{bx.font=`${d.s}px ${FONT}`;bx.fillStyle=col(c,d.a*(sl?.5:1));bx.fillText(d.c,d.x*W,d.y*H);});
   const sw=((T*.22)%1.3-.15)*H;g=bx.createLinearGradient(0,sw-14,0,sw+14);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,col(c,.1));g.addColorStop(1,'rgba(255,255,255,0)');bx.fillStyle=g;bx.fillRect(0,sw-14,W,28);
   if(sl){bx.fillStyle='rgba(6,10,40,.5)';bx.fillRect(0,0,W,H);}
   if(cr){bx.fillStyle='rgba(30,50,110,.28)';bx.fillRect(0,0,W,H);}}
  function drawFront(){fx.clearRect(0,0,W,H);
   parts.forEach(p=>{
    if(p.k==='eat'){fx.fillStyle=p.c;const s=Math.round(p.s);fx.fillRect(Math.round(p.px),Math.round(p.py),s,s);}
    else if(p.k==='drop'){fx.fillStyle='#7DD3FC';fx.fillRect(Math.round(p.x),Math.round(p.y),Math.round(p.s*.7),Math.round(p.s*1.6));fx.fillStyle='#E0F2FE';fx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}
    else if(p.k==='rain'){fx.strokeStyle='rgba(147,197,253,.55)';fx.lineWidth=1.5;fx.beginPath();fx.moveTo(p.x,p.y);fx.lineTo(p.x+p.l*.18,p.y-p.l);fx.stroke();}
    else if(p.k==='tear'){fx.fillStyle='#BAE6FD';fx.fillRect(Math.round(p.x),Math.round(p.y),Math.round(p.s),Math.round(p.s*1.5));}
    else if(p.k==='z'){const a=1-p.t/p.life,s=p.s*(.6+p.t*.25);fx.globalAlpha=Math.max(0,a);fx.fillStyle='#C7D2FE';fx.font=`700 ${s}px ${FONT}`;fx.fillText('Z',p.x,p.y);fx.globalAlpha=1;}
    else if(p.k==='conf'){fx.save();fx.translate(p.x,p.y);fx.rotate(p.r);fx.fillStyle=p.c;fx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);fx.restore();}
    else if(p.k==='spark'){const u=p.t/p.life,s=p.s*(1-u*.5);fx.globalAlpha=1-u;fx.fillStyle=p.c;fx.fillRect(p.x-s/2,p.y-1,s,2);fx.fillRect(p.x-1,p.y-s/2,2,s);fx.globalAlpha=1;}
    else if(p.k==='q'){fx.globalAlpha=1-p.t/p.life;fx.fillStyle='#E9D5FF';fx.font=`700 ${p.s}px ${FONT}`;fx.fillText('?',p.x,p.y);fx.globalAlpha=1;}
    else if(p.k==='txt'){const u=p.t/p.life,y=p.y-u*14,a=u<.15?u/.15:1-Math.max(0,(u-.6)/.4);fx.globalAlpha=Math.max(0,a);fx.font=`700 26px ${FONT}`;fx.textAlign='center';fx.fillStyle='#0b0f1d';fx.fillText(p.t,p.x+2,y+2);fx.fillStyle=p.c;fx.fillText(p.t,p.x,y);fx.textAlign='start';fx.globalAlpha=1;}});}
  function frame(now,force){raf=0;if(!force&&!run)return;const dt=Math.min(.08,Math.max(.001,((now-(last||now))/1000)||.016));last=now;update(dt);drawBack();drawFront();if(run)raf=requestAnimationFrame(frame);}
  function start(){if(run||!motion)return;run=true;last=0;if(!W)size();raf=requestAnimationFrame(frame);}
  function stop(){run=false;if(raf)cancelAnimationFrame(raf);raf=0;}
  function snap(){if(!W)size();update(.016);drawBack();drawFront();}
  function setMotion(v){motion=!!v;if(!motion){stop();snap();}else if(!document.hidden)start();}
  function advance(sec){if(!W)size();for(let i=0;i<Math.round(sec*30);i++)update(1/30);drawBack();drawFront();}
  size();seed();
  if(root.ResizeObserver){new ResizeObserver(()=>{size();if(!run)snap();}).observe(stage);}
  snap();
  return {scene,setMood,start,stop,snap,advance,setMotion,calm,isRunning:()=>run,resize:size};
 }
 root.LionFX={create};
})(typeof window!=='undefined'?window:globalThis);
