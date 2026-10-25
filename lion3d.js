/* Lion Suheth em 3D: motor WebGL mínimo + modelo articulado, sem bibliotecas externas.
   Cada parte do corpo é um nó com articulação própria (ombro, cotovelo, quadril, joelho, pescoço, cauda),
   então o Lion pode girar 360 graus e reagir com o corpo todo. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Lion3D=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const PI=Math.PI,TAU=PI*2;
 /* ---------- matemática (matrizes 4x4 em ordem de coluna, como o WebGL) ---------- */
 const M={
  ident(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);},
  mul(a,b,o){o=o||new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[r+k*4]*b[k+c*4];o[r+c*4]=s;}return o;},
  perspective(fovy,asp,n,f){const t=1/Math.tan(fovy/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
  lookAt(e,t,u){let zx=e[0]-t[0],zy=e[1]-t[1],zz=e[2]-t[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
   return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1]);},
  /* T * (Rz*Ry*Rx) * S; se houver R (3x3 por colunas) ele substitui os ângulos */
  trs(p,r,s,R,o){o=o||new Float32Array(16);let r00,r01,r02,r10,r11,r12,r20,r21,r22;
   if(R){r00=R[0];r10=R[1];r20=R[2];r01=R[3];r11=R[4];r21=R[5];r02=R[6];r12=R[7];r22=R[8];}
   else{const cx=Math.cos(r[0]),sx=Math.sin(r[0]),cy=Math.cos(r[1]),sy=Math.sin(r[1]),cz=Math.cos(r[2]),sz=Math.sin(r[2]);
    r00=cz*cy;r01=cz*sy*sx-sz*cx;r02=cz*sy*cx+sz*sx;r10=sz*cy;r11=sz*sy*sx+cz*cx;r12=sz*sy*cx-cz*sx;r20=-sy;r21=cy*sx;r22=cy*cx;}
   o[0]=r00*s[0];o[1]=r10*s[0];o[2]=r20*s[0];o[3]=0;o[4]=r01*s[1];o[5]=r11*s[1];o[6]=r21*s[1];o[7]=0;o[8]=r02*s[2];o[9]=r12*s[2];o[10]=r22*s[2];o[11]=0;o[12]=p[0];o[13]=p[1];o[14]=p[2];o[15]=1;return o;},
  /* inversa transposta do bloco 3x3 (normais com escala não uniforme) */
  normal(m){const a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10];
   const A=e*i-f*h,B=f*g-d*i,C=d*h-e*g,det=a*A+b*B+c*C||1,id=1/det;
   return new Float32Array([A*id,B*id,C*id,(c*h-b*i)*id,(a*i-c*g)*id,(b*g-a*h)*id,(b*f-c*e)*id,(c*d-a*f)*id,(a*e-b*d)*id]);},
  /* base com o eixo y apontando para a direção dir */
  alignY(dir,roll){let [x,y,z]=dir;const l=Math.hypot(x,y,z)||1;x/=l;y/=l;z/=l;let ax=Math.abs(y)>.95?1:0,ay=Math.abs(y)>.95?0:1,az=0;
   let bx=ay*z-az*y,by=az*x-ax*z,bz=ax*y-ay*x;const bl=Math.hypot(bx,by,bz);bx/=bl;by/=bl;bz/=bl;const cx=y*bz-z*by,cy=z*bx-x*bz,cz=x*by-y*bx;
   const cr=Math.cos(roll||0),sr=Math.sin(roll||0);const px=bx*cr+cx*sr,py=by*cr+cy*sr,pz=bz*cr+cz*sr,qx=-bx*sr+cx*cr,qy=-by*sr+cy*cr,qz=-bz*sr+cz*cr;
   return [px,py,pz,x,y,z,qx,qy,qz];}
 };
 /* ---------- geometrias (triângulos soltos, normais lisas ou facetadas) ---------- */
 function build(verts,uvs,idx,flat){
  const nv=verts.length/3,fn=new Float32Array(idx.length),acc=new Map(),key=i=>Math.round(verts[i*3]*2000)+','+Math.round(verts[i*3+1]*2000)+','+Math.round(verts[i*3+2]*2000);
  for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];
   const ux=verts[b*3]-verts[a*3],uy=verts[b*3+1]-verts[a*3+1],uz=verts[b*3+2]-verts[a*3+2],vx=verts[c*3]-verts[a*3],vy=verts[c*3+1]-verts[a*3+1],vz=verts[c*3+2]-verts[a*3+2];
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;fn[t]=nx;fn[t+1]=ny;fn[t+2]=nz;
   if(!flat)[a,b,c].forEach(i=>{const k=key(i),v=acc.get(k)||[0,0,0];v[0]+=nx;v[1]+=ny;v[2]+=nz;acc.set(k,v);});}
  const pos=new Float32Array(idx.length*3),nor=new Float32Array(idx.length*3),uv=new Float32Array(idx.length*2);
  for(let t=0;t<idx.length;t++){const i=idx[t];pos[t*3]=verts[i*3];pos[t*3+1]=verts[i*3+1];pos[t*3+2]=verts[i*3+2];
   let n;if(flat){const f=t-t%3;n=[fn[f],fn[f+1],fn[f+2]];}else n=acc.get(key(i));const l=Math.hypot(n[0],n[1],n[2])||1;nor[t*3]=n[0]/l;nor[t*3+1]=n[1]/l;nor[t*3+2]=n[2]/l;
   if(uvs){uv[t*2]=uvs[i*2];uv[t*2+1]=uvs[i*2+1];}}
  return {pos,nor,uv,count:idx.length};
 }
 /* sólido de revolução: perfil de pontos [raio,y] de cima para baixo; frente (+z) em u=0.5 */
 function lathe(profile,seg,flat){
  const verts=[],uvs=[],idx=[],rows=profile.length;
  for(let j=0;j<rows;j++)for(let i=0;i<=seg;i++){const u=i/seg,ph=(u-.5)*TAU,r=profile[j][0];verts.push(r*Math.sin(ph),profile[j][1],r*Math.cos(ph));uvs.push(u,j/(rows-1));}
  for(let j=0;j<rows-1;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+1,c=a+seg+1,d=c+1;idx.push(a,c,b,b,c,d);}
  return build(verts,uvs,idx,flat);
 }
 const G={
  sphere(r,seg=20,rings=14){const p=[];for(let j=0;j<=rings;j++){const t=j/rings*PI;p.push([r*Math.sin(t),r*Math.cos(t)]);}return lathe(p,seg,false);},
  capsule(r,h,seg=14,cap=6){const p=[];for(let j=0;j<=cap;j++){const t=j/cap*PI/2;p.push([r*Math.sin(t),h/2+r*Math.cos(t)]);}for(let j=0;j<=cap;j++){const t=PI/2+j/cap*PI/2;p.push([r*Math.sin(t),-h/2+r*Math.cos(t)]);}return lathe(p,seg,false);},
  cylinder(r1,r2,h,seg=16){return lathe([[0,h/2],[r2,h/2],[r1,-h/2],[0,-h/2]],seg,false);},
  crystal(r,h,seg=6){const tip=h*.38;return lathe([[0,h/2+tip],[r,h/2],[r,-h/2],[r*.55,-h/2-tip*.45],[0,-h/2-tip*.45]],seg,true);},
  torus(R,r,seg=28,tseg=10){const verts=[],idx=[];for(let i=0;i<=seg;i++)for(let j=0;j<=tseg;j++){const u=i/seg*TAU,v=j/tseg*TAU;verts.push((R+r*Math.cos(v))*Math.cos(u),r*Math.sin(v),(R+r*Math.cos(v))*Math.sin(u));}
   for(let i=0;i<seg;i++)for(let j=0;j<tseg;j++){const a=i*(tseg+1)+j,b=a+1,c=a+tseg+1,d=c+1;idx.push(a,b,c,b,d,c);}return build(verts,null,idx,false);},
  box(w,h,d){const x=w/2,y=h/2,z=d/2,v=[-x,-y,z,x,-y,z,x,y,z,-x,y,z,-x,-y,-z,-x,y,-z,x,y,-z,x,-y,-z,-x,y,-z,-x,y,z,x,y,z,x,y,-z,-x,-y,-z,x,-y,-z,x,-y,z,-x,-y,z,x,-y,-z,x,y,-z,x,y,z,x,-y,z,-x,-y,-z,-x,-y,z,-x,y,z,-x,y,-z],idx=[];
   for(let f=0;f<6;f++){const a=f*4;idx.push(a,a+1,a+2,a,a+2,a+3);}return build(v,null,idx,true);}
 };
 /* ---------- sombreadores ---------- */
 const VS='attribute vec3 aP;attribute vec3 aN;attribute vec2 aU;uniform mat4 uM;uniform mat4 uVP;uniform mat3 uNM;varying vec3 vN;varying vec3 vW;varying vec2 vUV;void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=uNM*aN;vUV=aU;gl_Position=uVP*w;}';
 const FS='precision mediump float;varying vec3 vN;varying vec3 vW;varying vec2 vUV;uniform vec3 uCam;uniform vec3 uColor;uniform vec3 uEmis;uniform vec3 uTint;uniform float uMetal;uniform float uRough;uniform float uAlpha;uniform float uRim;uniform float uEmisMul;uniform float uUseMap;uniform sampler2D uMap;'+
  'vec3 env(vec3 r){float y=r.y*.5+.5;vec3 c=mix(vec3(.06,.05,.13),vec3(.34,.37,.62),pow(y,1.4));c+=vec3(.95,.97,1.)*smoothstep(.72,.95,y)*.85;c+=vec3(.45,.25,.95)*smoothstep(.45,.0,abs(r.x-.6))*.28;c+=vec3(.1,.8,1.)*smoothstep(.5,.0,abs(r.z+.7))*.24;return c;}'+
  'void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(!gl_FrontFacing)N=-N;vec3 L1=normalize(vec3(-.5,.8,.75)),L2=normalize(vec3(.85,.2,.5)),L3=normalize(vec3(0.,.4,-1.));'+
  'float d1=max(dot(N,L1),0.),d2=max(dot(N,L2),0.),d3=max(dot(N,L3),0.);vec3 diff=vec3(1.,.97,.95)*d1*.9+vec3(.55,.35,1.)*d2*.5+vec3(.2,.8,1.)*d3*.38+vec3(.17,.14,.3);'+
  'vec3 R=reflect(-V,N);float sp=pow(max(dot(R,L1),0.),mix(90.,8.,uRough));vec3 e=env(R);vec3 base=uColor+uTint;if(uUseMap>1.5){vec4 tx=texture2D(uMap,vUV);base=base*(1.-tx.a)+tx.rgb;}vec3 mt=mix(vec3(1.),base,uMetal);'+
  'vec3 col=base*diff*(1.-uMetal*.72)+e*mt*(.22+.78*uMetal)*(1.-uRough*.55)+sp*mt*(1.-uRough*.5);float fr=pow(1.-max(dot(N,V),0.),3.);col+=uRim*fr*vec3(.45,.8,1.);'+
  'vec3 em=uEmis*uEmisMul;if(uUseMap>.5&&uUseMap<1.5)em*=texture2D(uMap,vUV).rgb;col+=em;col=col/(1.+col*.18);gl_FragColor=vec4(col*uAlpha,uAlpha);}';
 const PVS='attribute vec4 aP;uniform mat4 uVP;uniform float uS;varying float vL;void main(){vec4 p=uVP*vec4(aP.xyz,1.);gl_Position=p;vL=aP.w;gl_PointSize=uS*aP.w/p.w;}';
 const PFS='precision mediump float;varying float vL;uniform vec3 uC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.0,d)*vL;gl_FragColor=vec4(uC*a,a);}';
 /* ---------- rosto do visor (textura emissiva: ciano sobre preto) ---------- */
 const FACES=['happy','wide','sad','worried','star','blink','wink','sleep','talk'];
 function drawFace(ctx,kind){
  const W=1024,H=512,cx=512,cy=250,dx=64;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#7DF3FF';ctx.fillStyle='#7DF3FF';ctx.shadowColor='#22D3EE';ctx.shadowBlur=26;ctx.lineWidth=15;
  const arc=(x,up)=>{ctx.beginPath();ctx.arc(x,cy+(up?22:-22),30,up?PI*1.08:PI*.08,up?PI*1.92:PI*.92,!up);ctx.stroke();};
  const eyes=f=>{f(cx-dx);f(cx+dx);};
  if(kind==='happy'||kind==='talk')eyes(x=>arc(x,true));
  else if(kind==='wide')eyes(x=>{ctx.beginPath();ctx.ellipse(x,cy,20,32,0,0,TAU);ctx.fill();});
  else if(kind==='sad')eyes(x=>arc(x,false));
  else if(kind==='worried'){ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(cx-dx-24,cy-22);ctx.lineTo(cx-dx+20,cy);ctx.lineTo(cx-dx-24,cy+22);ctx.moveTo(cx+dx+24,cy-22);ctx.lineTo(cx+dx-20,cy);ctx.lineTo(cx+dx+24,cy+22);ctx.stroke();}
  else if(kind==='star')eyes(x=>{ctx.beginPath();for(let k=0;k<10;k++){const a=-PI/2+k*PI/5,r=k%2?15:38;ctx.lineTo(x+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();ctx.fill();});
  else if(kind==='blink'||kind==='sleep')eyes(x=>{ctx.beginPath();ctx.moveTo(x-28,cy+(kind==='sleep'?14:0));ctx.lineTo(x+28,cy+(kind==='sleep'?14:0));ctx.stroke();});
  else if(kind==='wink'){arc(cx-dx,true);ctx.beginPath();ctx.moveTo(cx+dx-28,cy);ctx.lineTo(cx+dx+28,cy);ctx.stroke();}
  if(kind==='talk'){ctx.lineWidth=12;ctx.beginPath();ctx.arc(cx,cy+88,24,.15*PI,.85*PI);ctx.stroke();}
  if(kind==='sad'||kind==='worried'){ctx.lineWidth=11;ctx.beginPath();ctx.arc(cx,cy+112,24,PI*1.15,PI*1.85);ctx.stroke();}
  ctx.shadowBlur=0;
 }
 /* ---------- cena ---------- */
 const mat=(o)=>Object.assign({color:[.6,.59,.65],metal:.6,rough:.38,emis:[0,0,0],emisMul:1,alpha:1,rim:.25,tint:[0,0,0],map:0},o||{});
 const MET=()=>mat({color:[.62,.6,.68],metal:.7,rough:.32}),DARK=()=>mat({color:[.17,.16,.21],metal:.55,rough:.45}),BRASS=()=>mat({color:[.8,.6,.3],metal:.85,rough:.3}),
  CY=()=>mat({color:[.05,.2,.25],emis:[.2,.85,.95],metal:0,rough:.4,rim:.1}),
  CRY=()=>mat({color:[.26,.12,.7],emis:[.14,.04,.4],metal:.1,rough:.3,alpha:.9,rim:.3});
 function node(name,parent){const n={name,p:[0,0,0],r:[0,0,0],s:[1,1,1],R:null,kids:[],geo:null,mat:null,vis:true,world:M.ident(),_m:M.ident()};if(parent)parent.kids.push(n);return n;}
 /* ---------- personagens alternativos: filhote de leão (plush), herói e astronauta ---------- */
 function drawCute(ctx,kind){
  ctx.clearRect(0,0,1024,512);ctx.lineCap='round';ctx.lineJoin='round';
  const cx=512,ink='#2B1712',cream='#FFE8BF',ex=[430,594],ey=205;
  /* focinho, nariz e bochechas (a textura é pintada sobre a cor do pelo) */
  ctx.fillStyle=cream;ctx.beginPath();ctx.ellipse(cx,322,150,104,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,120,140,.5)';[[322,285],[702,285]].forEach(c=>{ctx.beginPath();ctx.ellipse(c[0],c[1],34,22,0,0,TAU);ctx.fill();});
  ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(cx,272,34,25,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(cx-10,264,10,6,0,0,TAU);ctx.fill();
  ctx.strokeStyle=ink;ctx.lineWidth=9;
  const smile=()=>{ctx.beginPath();ctx.moveTo(cx,296);ctx.lineTo(cx,316);ctx.stroke();ctx.beginPath();ctx.arc(cx-30,316,30,.1*PI,.9*PI);ctx.stroke();ctx.beginPath();ctx.arc(cx+30,316,30,.1*PI,.9*PI);ctx.stroke();};
  const frown=()=>{ctx.beginPath();ctx.moveTo(cx,296);ctx.lineTo(cx,312);ctx.stroke();ctx.beginPath();ctx.arc(cx-26,346,28,1.15*PI,1.9*PI);ctx.stroke();ctx.beginPath();ctx.arc(cx+26,346,28,1.1*PI,1.85*PI);ctx.stroke();};
  const eye=(x,rx,ry,hl)=>{ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(x,ey,rx,ry,0,0,TAU);ctx.fill();if(hl){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+rx*.3,ey-ry*.3,rx*.3,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(x-rx*.35,ey+ry*.35,rx*.14,0,TAU);ctx.fill();}};
  const arcEye=(x,up)=>{ctx.strokeStyle=ink;ctx.lineWidth=13;ctx.beginPath();ctx.arc(x,ey+(up?16:-16),32,up?PI*1.1:PI*.1,up?PI*1.9:PI*.9,!up);ctx.stroke();};
  const brow=(x,tilt)=>{ctx.strokeStyle=ink;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(x-34,ey-70+tilt);ctx.lineTo(x+34,ey-70-tilt);ctx.stroke();};
  if(kind==='happy'){ex.forEach(x=>eye(x,34,46,1));smile();}
  else if(kind==='talk'){ex.forEach(x=>eye(x,34,46,1));ctx.fillStyle='#7A2B2B';ctx.beginPath();ctx.ellipse(cx,336,34,30,0,0,PI);ctx.fill();ctx.fillStyle='#F28BA0';ctx.beginPath();ctx.ellipse(cx,350,20,12,0,0,PI);ctx.fill();ctx.beginPath();ctx.moveTo(cx,296);ctx.lineTo(cx,310);ctx.stroke();}
  else if(kind==='wide'){ex.forEach(x=>eye(x,42,56,1));smile();}
  else if(kind==='sad'){ex.forEach(x=>eye(x,34,46,1));brow(ex[0],-18);brow(ex[1],18);frown();}
  else if(kind==='worried'){ex.forEach(x=>eye(x,32,44,1));brow(ex[0],-22);brow(ex[1],22);ctx.fillStyle='#7A2B2B';ctx.beginPath();ctx.ellipse(cx,336,18,22,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(cx,296);ctx.lineTo(cx,312);ctx.stroke();}
  else if(kind==='star'){ctx.fillStyle='#FFC83D';ctx.strokeStyle=ink;ctx.lineWidth=6;ex.forEach(x=>{ctx.beginPath();for(let k=0;k<10;k++){const a=-PI/2+k*PI/5,r=k%2?20:50;ctx.lineTo(x+Math.cos(a)*r,ey+Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();});smile();}
  else if(kind==='blink'){ex.forEach(x=>arcEye(x,true));smile();}
  else if(kind==='wink'){eye(ex[0],34,46,1);arcEye(ex[1],true);smile();}
  else if(kind==='sleep'){ex.forEach(x=>arcEye(x,false));ctx.beginPath();ctx.moveTo(cx,296);ctx.lineTo(cx,312);ctx.stroke();ctx.fillStyle='#7A2B2B';ctx.beginPath();ctx.ellipse(cx,330,14,10,0,0,TAU);ctx.fill();}
 }
 function buildCub(variant){
  const T={},root=node('root');T.root=root;
  const hero=variant==='heroi',astro=variant==='astro';
  const FUR=c=>mat({color:c,metal:0,rough:.97,rim:.1}),SOFT=c=>mat({color:c,metal:0,rough:.8,rim:.2}),
   gold=[.96,.69,.27],creamC=[1,.9,.72],maneC=hero?[.5,.28,.95]:astro?[.95,.5,.16]:[.9,.46,.13],suit=[.93,.94,.98];
  const skin=astro?FUR(gold):FUR(gold),paw=SOFT(creamC);
  const add=(par,name,geo,m,p,s,r)=>{const n=node(name,par);n.geo=geo;n.mat=m;if(p)n.p=p.slice();if(s)n.s=s.slice();if(r)n.r=r.slice();T[name]=n;return n;};
  const grp=(par,name,p)=>{const n=node(name,par);if(p)n.p=p.slice();T[name]=n;return n;};
  const body=grp(root,'body',[0,.92,0]);
  const torsoM=astro?mat({color:suit,metal:.15,rough:.55,rim:.3}):skin;
  add(body,'torso',G.capsule(.3,.26),torsoM,[0,0,0],[1.12,1,.98]);
  if(!astro)add(body,'belly',G.sphere(.27,18,12),paw,[0,-.03,.2],[1,1.15,.55]);
  add(body,'core',G.sphere(hero?.1:.07,14,10),hero?mat({color:[.05,.2,.25],emis:[.25,.9,1],metal:0,rough:.3}):mat({color:[.4,.2,.9],emis:[.3,.12,.7],metal:.2,rough:.3,rim:.5}),[0,.06,hero?.33:astro?.31:.31]);
  const neck=grp(body,'neck',[0,.34,0]);
  if(!hero&&!astro)add(neck,'scarf',G.torus(.22,.07,24,8),mat({color:[.45,.22,.95],metal:0,rough:.85,rim:.2}),[0,.02,0],[1.1,1,.95]);
  if(astro)add(neck,'collar',G.torus(.24,.07,24,8),mat({color:[.8,.82,.9],metal:.4,rough:.4}),[0,.02,0],[1.1,1,.95]);
  const head=grp(neck,'head',[0,.52,0]);
  add(head,'helmet',G.sphere(.6,28,18),skin,[0,0,0],[1.12,.95,1.0]);
  [-1,1].forEach((sg,i)=>{const sd=i?'R':'L';add(head,'ear'+sd,G.sphere(.17,14,10),skin,[.4*sg,.55,.04],[1,1,.7]);add(head,'earIn'+sd,G.sphere(.1,12,8),mat({color:[1,.62,.7],metal:0,rough:.9}),[.4*sg,.54,.1],[1,1,.5]);
   add(head,'cheek'+sd,G.sphere(.2,14,10),paw,[.36*sg,-.22,.34],[1,.8,.8]);});
  const visor=add(head,'visor',G.sphere(1,36,24),mat({color:gold,metal:0,rough:.9,rim:.2,map:2}),[0,-.04,.5],[.36,.31,.13]);
  /* juba: tufos achatados em dois anéis atrás do rosto */
  const mane=grp(head,'mane',[0,0,0]);T.crystals=[];
  const ring=(n,rad,z,sx,sy,sz,off,col)=>{for(let k=0;k<n;k++){const a=off+k/n*TAU,d=[Math.sin(a),Math.cos(a),0],t=add(mane,'m'+rad+'_'+k,G.sphere(1,14,10),Object.assign(FUR(col),{emis:col.map(v=>v*.3)}),[d[0]*rad,d[1]*rad*.94,z],[sx,sy,sz]);t.R=M.alignY(d,0);T.crystals.push(t);}};
  ring(13,.6,-.16,.24,.38,.2,0.1,maneC.map(v=>v*.9));ring(11,.5,.04,.2,.3,.18,.3,maneC);
  if(astro){add(head,'glass',G.sphere(.88,32,20),mat({color:[.5,.8,1],metal:.1,rough:.05,alpha:.16,rim:1,emis:[.04,.1,.16]}),[0,.02,.02],[1.0,.95,1.0]);}
  /* braços */
  ['L','R'].forEach((sd,k)=>{const sg=k?1:-1;const sh=grp(body,'sh'+sd,[.4*sg,.14,0]);
   add(sh,'up'+sd,G.capsule(.095,.1),astro?torsoM:skin,[0,-.14,0]);
   if(hero)add(sh,'pad'+sd,G.sphere(.19,16,10),mat({color:[.9,.7,.3],metal:.85,rough:.28}),[0,.03,0],[1.05,.8,1.05]);
   const el=grp(sh,'el'+sd,[0,-.27,0]);add(el,'fore'+sd,G.capsule(.1,.1),astro?torsoM:skin,[0,-.14,0]);
   const hd=grp(el,'hand'+sd,[0,-.3,0]);add(hd,'palm'+sd,G.sphere(.125,14,10),astro?mat({color:[.8,.82,.9],metal:.3,rough:.5}):paw,[0,0,0],[1,1,.9]);});
  /* pernas */
  ['L','R'].forEach((sd,k)=>{const sg=k?1:-1;const hip=grp(body,'hip'+sd,[.17*sg,-.28,0]);
   add(hip,'thigh'+sd,G.capsule(.12,.1),astro?torsoM:skin,[0,-.12,0]);
   const kn=grp(hip,'kn'+sd,[0,-.24,0]);add(kn,'shin'+sd,G.capsule(.115,.08),astro?torsoM:skin,[0,-.12,0]);
   const ft=grp(kn,'ft'+sd,[0,-.25,0]);add(ft,'foot'+sd,G.sphere(.18,16,10),astro?mat({color:[.8,.82,.9],metal:.3,rough:.5}):paw,[0,-.03,.06],[1,.6,1.4]);});
  /* cauda com tufo */
  const tail=grp(body,'tail',[0,-.3,-.3]);let par=tail;
  [0,1,2].forEach(i=>{const seg=grp(par,'tl'+i,[0,0,i?-.17:0]);add(seg,'tlm'+i,G.capsule(.06-i*.008,.08),skin,[0,0,-.09],[1,1,1],[PI/2,0,0]);par=seg;});
  const tuft=add(par,'tuft',G.sphere(.15,14,10),Object.assign(FUR(maneC),{emis:maneC.map(v=>v*.3)}),[0,0,-.24],[1,1,1.5]);T.crystals.push(tuft);
  if(hero){const cape=add(body,'cape',G.box(.78,.95,.04),mat({color:[.45,.18,.85],metal:.1,rough:.6,rim:.5}),[0,-.05,-.3],[1,1,1]);cape.p=[0,-.05,-.3];
   add(body,'plate',G.sphere(.3,18,12),mat({color:[.9,.7,.3],metal:.85,rough:.3}),[0,.08,.2],[1.05,.8,.5]);}
  if(astro){add(body,'pack',G.box(.5,.55,.22),mat({color:[.75,.78,.88],metal:.4,rough:.45}),[0,.06,-.33]);add(body,'packLight',G.sphere(.05,10,8),mat({color:[.05,.2,.25],emis:[.2,.9,1]}),[0,.12,-.45]);}
  add(root,'pad',G.torus(.62,.028,40,8),mat({color:[.1,.3,.4],emis:[.3,.9,1],metal:0,alpha:.8,rim:0}),[0,.02,0]);
  add(root,'pad2',G.torus(.46,.018,36,6),mat({color:[.2,.1,.4],emis:[.6,.35,1],metal:0,alpha:.7,rim:0}),[0,.02,0]);
  return T;
 }
 function buildLion(){
  const T={},root=node('root');T.root=root;
  const add=(par,name,geo,material,p,s,r)=>{const n=node(name,par);n.geo=geo;n.mat=material;if(p)n.p=p.slice();if(s)n.s=s.slice();if(r)n.r=r.slice();T[name]=n;return n;};
  const grp=(par,name,p)=>{const n=node(name,par);if(p)n.p=p.slice();T[name]=n;return n;};
  const crystal=(par,name,r,h,dir,at,m)=>{const n=add(par,name,G.crystal(r,h),m||CRY(),at);n.R=M.alignY(dir,0);return n;};
  const body=grp(root,'body',[0,.98,0]);
  const torso=add(body,'torso',G.capsule(.3,.3),MET(),[0,0,0],[1.12,1,.9]);
  add(body,'chest',G.sphere(.34,20,12),DARK(),[0,.1,.04],[1.0,.72,.82]);
  add(body,'core',G.sphere(.085,16,10),CY(),[0,.09,.3]);add(body,'coreRing',G.torus(.115,.022,24,8),BRASS(),[0,.09,.292],[1,1,1],[PI/2,0,0]);
  add(body,'belt',G.cylinder(.34,.3,.1,22),DARK(),[0,-.28,0],[1.12,1,.9]);
  add(body,'pelvis',G.sphere(.27,18,10),DARK(),[0,-.36,0],[1.1,.55,.9]);
  /* crista de cristais no peito e costas */
  crystal(body,'bk1',.09,.3,[0,.7,-.7],[0,.22,-.28]);crystal(body,'bk2',.07,.22,[.5,.6,-.6],[.2,.05,-.3]);crystal(body,'bk3',.07,.22,[-.5,.6,-.6],[-.2,.05,-.3]);
  /* cabeça */
  const neck=grp(body,'neck',[0,.43,0]);add(neck,'neckMesh',G.cylinder(.13,.16,.16,14),DARK(),[0,0,0]);
  const head=grp(neck,'head',[0,.5,0]);
  add(head,'helmet',G.sphere(.56,28,18),MET(),[0,0,0],[1.1,.94,.98]);
  add(head,'helmetCap',G.sphere(.34,18,10),DARK(),[0,.5,.06],[1.2,.5,1.1]);
  const visor=add(head,'visor',G.sphere(1,36,24),mat({color:[.01,.01,.02],metal:.2,rough:.12,emis:[1,1,1],emisMul:1,rim:.5,map:1}),[0,.02,.2],[.47,.35,.4]);
  add(head,'visorRim',G.torus(.5,.035,36,8),DARK(),[0,.02,.3],[1.0,.78,.74],[PI/2,0,0]);
  ['L','R'].forEach((sd,k)=>{const sg=k?-1:1;add(head,'ear'+sd,G.cylinder(.15,.15,.14,18),BRASS(),[.6*sg,-.02,0],[1,1,1],[0,0,PI/2]);add(head,'earGlow'+sd,G.cylinder(.1,.1,.16,18),CY(),[.64*sg,-.02,0],[1,1,1],[0,0,PI/2]);});
  const mane=grp(head,'mane',[0,0,0]);
  const rows=[[-125,10,.5,.15],[-100,12,.58,.16],[-75,14,.62,.17],[-50,15,.66,.17],[-25,16,.7,.18],[0,18,.74,.19],[25,16,.7,.18],[50,15,.66,.17],[75,14,.62,.17],[100,12,.58,.16],[125,10,.5,.15]];
  rows.forEach((c,i)=>{const az=c[0]*PI/180,el=c[1]*PI/180,d=[Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)];crystal(mane,'m'+i,c[3],c[2],d,[d[0]*.62,d[1]*.62+.02,d[2]*.55],null);});
  [[-60,50,.78],[-20,58,.9],[20,58,.9],[60,50,.78],[0,72,1.05],[-90,38,.7],[90,38,.7]].forEach((c,i)=>{const az=c[0]*PI/180,el=c[1]*PI/180,d=[Math.sin(az)*Math.cos(el)*.7,Math.sin(el),-Math.cos(az)*Math.cos(el)*.7];crystal(mane,'t'+i,.17+(i===4?.05:0),c[2],d,[d[0]*.5,d[1]*.55+.08,d[2]*.5],null);});
  crystal(head,'chin',.1,.26,[0,-.5,.85],[0,-.52,.4]);crystal(head,'chinL',.07,.2,[-.5,-.6,.7],[-.28,-.5,.38]);crystal(head,'chinR',.07,.2,[.5,-.6,.7],[.28,-.5,.38]);
  crystal(head,'crown',.11,.3,[0,.9,.55],[0,.56,.2]);
  /* braços */
  const arms={};
  ['L','R'].forEach((sd,k)=>{const sg=k?1:-1;const sh=grp(body,'sh'+sd,[.47*sg,.2,0]);arms[sd]=sh;
   add(sh,'pad'+sd,G.sphere(.19,16,10),MET(),[0,.01,0],[1,.9,1]);crystal(sh,'padC'+sd,.08,.28,[sg*.75,.7,-.1],[.06*sg,.14,0]);crystal(sh,'padD'+sd,.06,.2,[sg*.9,.35,.3],[.08*sg,.1,.08]);
   add(sh,'up'+sd,G.capsule(.095,.2),DARK(),[0,-.25,0]);
   const el=grp(sh,'el'+sd,[0,-.47,0]);add(el,'elb'+sd,G.sphere(.105,12,8),MET(),[0,0,0]);
   add(el,'fore'+sd,G.capsule(.115,.2),MET(),[0,-.26,0]);crystal(el,'foreC'+sd,.085,.3,[sg*.9,.1,.35],[.1*sg,-.26,.04]);
   const hd=grp(el,'hand'+sd,[0,-.54,0]);add(hd,'palm'+sd,G.sphere(.125,14,10),DARK(),[0,0,0],[1,1,.85]);
   [-.07,0,.07].forEach((fx,fi)=>add(hd,'fg'+sd+fi,G.capsule(.034,.07,8,4),DARK(),[fx,-.14,.02],[1,1,1],[.15,0,fx*-1.5]));
   add(hd,'th'+sd,G.capsule(.034,.06,8,4),DARK(),[.11*sg*-1,-.04,.04],[1,1,1],[0,0,sg*1.0]);});
  /* pernas */
  ['L','R'].forEach((sd,k)=>{const sg=k?1:-1;const hip=grp(body,'hip'+sd,[.2*sg,-.4,0]);
   add(hip,'thigh'+sd,G.capsule(.115,.12),MET(),[0,-.17,0]);
   const kn=grp(hip,'kn'+sd,[0,-.34,0]);add(kn,'knee'+sd,G.sphere(.11,12,8),DARK(),[0,0,0]);
   add(kn,'shin'+sd,G.capsule(.12,.14),MET(),[0,-.2,0]);crystal(kn,'shinC'+sd,.07,.24,[sg*.9,.1,.3],[.12*sg,-.2,.04]);
   const ft=grp(kn,'ft'+sd,[0,-.42,0]);add(ft,'foot'+sd,G.sphere(.19,16,10),MET(),[0,-.04,.07],[1,.55,1.45]);
   add(ft,'sole'+sd,G.box(.3,.045,.52),CY(),[0,-.11,.1]);});
  /* cauda de cristais */
  const tail=grp(body,'tail',[0,-.34,-.3]);let par=tail;
  [0,1,2].forEach(i=>{const seg=grp(par,'tl'+i,[0,0,i?-.2:0]);add(seg,'tlm'+i,G.capsule(.075-i*.012,.1),i%2?MET():DARK(),[0,0,-.1],[1,1,1],[PI/2,0,0]);par=seg;});
  crystal(par,'tailC',.09,.3,[0,.2,-1],[0,0,-.32]);
  /* base luminosa */
  const pad=add(root,'pad',G.torus(.62,.028,40,8),mat({color:[.1,.3,.4],emis:[.3,.9,1],metal:0,alpha:.8,rim:0}),[0,.02,0]);
  const pad2=add(root,'pad2',G.torus(.46,.018,36,6),mat({color:[.2,.1,.4],emis:[.6,.35,1],metal:0,alpha:.7,rim:0}),[0,.02,0]);
  T.crystals=[];(function walk(n){if(n.mat&&n.mat.alpha<1&&/^(m\d|t\d|bk|chin|crown|pad[CD]|foreC|shinC|tailC)/.test(n.name))T.crystals.push(n);n.kids.forEach(walk);})(root);
  return T;
 }
 /* ---------- animação procedural: cada reação mexe nas articulações ---------- */
 const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t),ease=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);
 const CLIPS={
  idle:{dur:Infinity,face:'happy',pose(t){return {bob:Math.sin(t*2.1)*.035,yaw:Math.sin(t*.55)*.42,headY:Math.sin(t*.8)*.3,headX:Math.sin(t*1.1)*.04,headZ:Math.sin(t*.6)*.03,bodyX:Math.sin(t*1.4)*.02,
   shR:.2+Math.sin(t*1.6)*.05,shL:-.2-Math.sin(t*1.6+1)*.05,shRx:Math.sin(t*1.3)*.1,shLx:Math.sin(t*1.3+PI)*.1,elR:-.35,elL:-.35,elRz:0,elLz:0,hipRx:Math.sin(t*1.3)*.04,hipLx:-Math.sin(t*1.3)*.04,knR:.06,knL:.06,tail:Math.sin(t*2)*.35,tailX:Math.sin(t*1.7)*.15,glow:.6};}},
  hello:{dur:2.4,face:'happy',pose(t){const w=Math.sin(t*11)*.5,up=sm(t/.3)*sm((2.4-t)/.3);return {bob:Math.sin(t*3)*.03,yaw:Math.sin(t*1.3)*.2,headY:-.2,headZ:.12*up,headX:-.05,shR:.2+2.1*up,shRx:0,elR:-.35+.0,elRz:(.3+w)*up,elL:-.35,shL:-.25,knR:.05,knL:.05,glow:.9};}},
  talk:{dur:2.6,face:'talk',pose(t){const n=Math.sin(t*9);return {bob:Math.abs(Math.sin(t*4.5))*.03,yaw:Math.sin(t*1.2)*.2,headX:n*.07,headY:Math.sin(t*2.1)*.2,shR:.55+Math.sin(t*5)*.2,shRx:-.5,elR:-.9,elRz:0,glow:.6+Math.abs(n)*.6};}},
  cheer:{dur:2.2,face:'star',pose(t){const up=sm(t/.25)*sm((2.2-t)/.4),j=Math.abs(Math.sin(t*PI*1.7))*.5*up;return {bob:j,yaw:ease(t/1.0)*TAU,headX:-.18*up,headY:0,shR:.25+2.35*up,shL:-.25-2.35*up,elR:-.35,elL:-.35,elRz:Math.sin(t*14)*.35*up,elLz:-Math.sin(t*14)*.35*up,hipRx:-.25*up*(1-j),hipLx:-.25*up*(1-j),knR:.5*up*(1-j*2),knL:.5*up*(1-j*2),tail:Math.sin(t*12)*.7,glow:1.3,flash:[.1,.9,.55]};}},
  oops:{dur:2.1,face:'worried',pose(t){const d=Math.exp(-t*1.3),sh=Math.sin(t*15)*.55*d,k=sm(t/.2);return {bob:-.1*k,yaw:Math.sin(t*3)*.15*d,headY:sh,headX:.3*k*sm((2.1-t)/.4),headZ:Math.sin(t*10)*.05*d,bodyX:.12*k,shR:.5*k,shL:-.5*k,elR:-.1,elL:-.1,shRx:.2,shLx:.2,hipRx:-.12*k,hipLx:-.12*k,knR:.28*k,knL:.28*k,tail:-.3,tailX:-.4,glow:.25,flash:[.9,.15,.2]};}},
  spin:{dur:1.6,face:'wide',pose(t){const k=ease(t/1.3);return {bob:Math.sin(Math.min(1,t/1.3)*PI)*.18,yaw:k*TAU,headY:0,shR:.6,shL:-.6,elR:-.5,elL:-.5,tail:Math.sin(t*9)*.6,glow:1.1};}},
  celebrate:{dur:3.4,face:'star',pose(t){const up=sm(t/.25)*sm((3.4-t)/.5),j=Math.abs(Math.sin(t*PI*1.6))*.55*up;return {bob:j,yaw:ease(t/2.2)*TAU*2,headX:-.2*up,shR:.25+2.4*up,shL:-.25-2.4*up,elRz:Math.sin(t*16)*.4*up,elLz:-Math.sin(t*16)*.4*up,hipRx:-.2*up,hipLx:-.2*up,knR:.4*up*(1-j),knL:.4*up*(1-j),tail:Math.sin(t*14)*.8,glow:1.6,flash:[.95,.75,.2]};}},
  hungry:{dur:Infinity,face:'sad',pose(t){return {bob:-.04+Math.sin(t*1.2)*.015,yaw:Math.sin(t*.4)*.25,headX:.28,headY:Math.sin(t*.7)*.12,bodyX:.16,shR:.3,shRx:-.55,elR:-1.5,shL:-.3,elL:-.2,hipRx:-.1,hipLx:-.1,knR:.2,knL:.2,tail:-.25,tailX:-.4,glow:.3};}},
  sleepy:{dur:Infinity,face:'sleep',pose(t){return {bob:-.05+Math.sin(t*.9)*.02,yaw:Math.sin(t*.3)*.15,headX:.5+Math.sin(t*.9)*.05,headZ:.1,bodyX:.1,shR:.15,shL:-.15,elR:-.2,elL:-.2,knR:.15,knL:.15,tail:-.2,tailX:-.3,glow:.15};}},
  eat:{dur:2.6,face:'happy',pose(t){const m=Math.sin(t*9);return {bob:Math.abs(m)*.03,yaw:Math.sin(t*1.5)*.15,headX:.1+m*.08,shR:.9,shRx:-.9,elR:-1.7+m*.25,shL:.5,shLx:-.7,elL:-1.5+m*.2,tail:Math.sin(t*10)*.5,glow:1.1};}},
  drink:{dur:2.2,face:'wide',pose(t){const k=sm(t/.4)*sm((2.2-t)/.4);return {headX:-.35*k,bob:0,shR:.8*k,shRx:-1.0*k,elR:-1.9*k,shL:-.2,tail:Math.sin(t*6)*.3,glow:1};}},
  think:{dur:2.6,face:'wide',pose(t){return {headY:.3,headZ:.15,headX:-.1,shR:1.0,shRx:-1.0,elR:-1.9,elRz:0,bob:Math.sin(t*2)*.02,glow:.7};}}
 };
 const KEYS=['bob','yaw','headX','headY','headZ','bodyX','shR','shL','shRx','shLx','elR','elL','elRz','elLz','hipRx','hipLx','knR','knL','tail','tailX','glow'];
 function create(canvas,opts){
  opts=opts||{};const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'})||canvas.getContext('experimental-webgl');
  if(!gl)return null;
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(s));}return s;};
  const prog=(v,f)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;};
  let P,PP;try{P=prog(VS,FS);PP=prog(PVS,PFS);}catch(e){return null;}
  const loc={};['aP','aN','aU'].forEach(n=>loc[n]=gl.getAttribLocation(P,n));['uM','uVP','uNM','uCam','uColor','uEmis','uTint','uMetal','uRough','uAlpha','uRim','uEmisMul','uUseMap','uMap'].forEach(n=>loc[n]=gl.getUniformLocation(P,n));
  const ploc={aP:gl.getAttribLocation(PP,'aP'),uVP:gl.getUniformLocation(PP,'uVP'),uS:gl.getUniformLocation(PP,'uS'),uC:gl.getUniformLocation(PP,'uC')};
  const model=opts.model||'robo',cute=model!=='robo',T=cute?buildCub(model):buildLion(),buffers=new Map();
  const upload=g=>{let b=buffers.get(g);if(!b){b={p:gl.createBuffer(),n:gl.createBuffer(),u:gl.createBuffer()};gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,g.pos,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.bufferData(gl.ARRAY_BUFFER,g.nor,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.u);gl.bufferData(gl.ARRAY_BUFFER,g.uv,gl.STATIC_DRAW);buffers.set(g,b);}return b;};
  /* textura do rosto */
  const fc=document.createElement('canvas');fc.width=1024;fc.height=512;const fx=fc.getContext('2d');const tex=gl.createTexture();let faceNow='',faceCanvasOK=!!fx;
  function setFace(k){if(k===faceNow||!faceCanvasOK)return;faceNow=k;if(cute)drawCute(fx,k);else drawFace(fx,k);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,fc);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  setFace('happy');
  const cfg={fov:opts.fov||27,dist:opts.dist||(cute?8.4:10.2),target:opts.target||(cute?[0,1.2,0]:[0,1.55,0]),elev:opts.elev===undefined?.12:opts.elev};
  let w=1,h=1;
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,opts.maxDpr||2),cw=canvas.clientWidth||canvas.width||100,ch=canvas.clientHeight||canvas.height||100;w=Math.max(8,Math.round(cw*dpr));h=Math.max(8,Math.round(ch*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  /* estado da animação */
  const cur={},tgt={};KEYS.forEach(k=>{cur[k]=0;tgt[k]=0;});cur.glow=.6;
  let base='idle',clip='idle',clipT=0,clock=0,yawUser=0,yawVel=0,dragging=false,motion=opts.motion!==false,running=false,raf=0,last=0,blinkAt=2.5,blinkT=-1,flash=null,flashT=0,queue=null,parts=[];
  function play(name){if(!CLIPS[name])return;if(!motion&&opts.auto!==false&&name!=='spin'&&name!=='celebrate'&&!opts.force)return;clip=name;clipT=0;queue=null;if(CLIPS[name].flash){flash=CLIPS[name].flash;flashT=0;}if(name==='cheer'||name==='celebrate')burst(name==='celebrate'?[1,.85,.3]:[.4,1,.7],name==='celebrate'?46:26);if(name==='oops')burst([1,.35,.35],12);start();}
  function burst(col,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,u=Math.random()*2-1,sp=.6+Math.random()*1.4;parts.push({x:(Math.random()-.5)*.6,y:1.9+Math.random()*.6,z:(Math.random()-.5)*.6,vx:Math.cos(a)*Math.sqrt(1-u*u)*sp,vy:u*sp+1.3,vz:Math.sin(a)*Math.sqrt(1-u*u)*sp,life:1,c:col});}}
  const pbuf=gl.createBuffer();
  function applyPose(dt){
    const c=CLIPS[clip],idle=CLIPS[base].pose(clock);let p=c.pose(clipT);
    const mix={};KEYS.forEach(k=>{mix[k]=p[k]!==undefined?p[k]:idle[k]||0;});
    if(clip!=='idle'&&p.yaw===undefined)mix.yaw=idle.yaw;
    if(clip!=='idle'&&p.yaw!==undefined&&clip!=='hello'&&clip!=='talk')mix.yaw=p.yaw;
    if(clip!=='idle'&&!('tail' in p))mix.tail=idle.tail;
    KEYS.forEach(k=>{tgt[k]=mix[k];});
    const k=1-Math.exp(-dt*(clip==='idle'?7:16));KEYS.forEach(key=>{cur[key]+=(tgt[key]-cur[key])*(key==='yaw'&&clip!=='idle'&&clip!=='hello'&&clip!=='talk'?1:k);});
    if(clipT>c.dur){clip=base;clipT=0;}
    /* rosto */
    let face=c.face;if(clip==='idle'||clip==='hello'||clip==='talk'){if(blinkT>=0){face='blink';blinkT+=dt;if(blinkT>.14)blinkT=-1;}else if(clock>blinkAt){blinkT=0;blinkAt=clock+2.2+Math.random()*3;}}
    setFace(face);
    const J=T,E=cur;
    J.root.p[1]=Math.max(0,E.bob);J.root.r[1]=E.yaw+yawUser;
    J.body.r[0]=E.bodyX;J.body.p[1]=.98+Math.min(0,E.bob)*.8-Math.abs(Math.min(0,E.knR))*.0;
    J.head.r[0]=E.headX;J.head.r[1]=E.headY;J.head.r[2]=E.headZ;
    J.shR.r[2]=E.shR;J.shR.r[0]=E.shRx;J.shL.r[2]=E.shL;J.shL.r[0]=E.shLx;
    J.elR.r[0]=E.elR;J.elR.r[2]=E.elRz;J.elL.r[0]=E.elL;J.elL.r[2]=E.elLz;
    J.hipR.r[0]=E.hipRx;J.hipL.r[0]=E.hipLx;J.knR.r[0]=Math.max(0,E.knR);J.knL.r[0]=Math.max(0,E.knL);
    J.tail.r[1]=E.tail;J.tail.r[0]=E.tailX||0;J.tl0.r[1]=E.tail*.5;J.tl1.r[1]=E.tail*.7;J.tl2.r[1]=E.tail*.9;
    const pulse=1+Math.sin(clock*3)*.06*E.glow;J.core.s=[pulse,pulse,pulse];if(J.cape)J.cape.r[0]=.12+Math.sin(clock*2.2)*.05+Math.min(0,E.bob)*.4+Math.abs(E.yaw-Math.round(E.yaw/TAU)*TAU)*.0;
    J.pad.s=[1+Math.sin(clock*2)*.03,1,1+Math.sin(clock*2)*.03];J.pad.r[1]=clock*.6;J.pad2.r[1]=-clock*.9;
    /* brilho dos cristais e flash de emoção */
    let ft=0,fcol=[0,0,0];if(flash){flashT+=dt;ft=Math.max(0,1-flashT/1.1);fcol=flash.map(v=>v*ft*.6);if(ft<=0)flash=null;}
    T.crystals.forEach(n=>{n.mat.emisMul=.8+E.glow*.45;n.mat.tint=fcol;});
    if(!cute)T.visor.mat.emisMul=.75+E.glow*.4;
  }
  function world(n,parent,list){const local=M.trs(n.p,n.r,n.s,n.R,n._m);n.world=parent?M.mul(parent,local,n.world):local;if(n.geo&&n.vis)list.push(n);n.kids.forEach(k=>world(k,n.world,list));}
  function draw(){
    resize();gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
    const list=[];world(T.root,null,list);
    const asp=w/h,ey=cfg.target[1]+Math.sin(cfg.elev)*cfg.dist*.5,eye=[0,ey,cfg.dist*Math.cos(cfg.elev)],V=M.lookAt(eye,cfg.target,[0,1,0]),Pm=M.perspective(cfg.fov*PI/180,asp,.5,40),VP=M.mul(Pm,V);
    gl.useProgram(P);gl.uniform3fv(loc.uCam,eye);gl.uniformMatrix4fv(loc.uVP,false,VP);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc.uMap,0);
    const opaque=[],trans=[];list.forEach(n=>(n.mat.alpha<1?trans:opaque).push(n));
    trans.forEach(n=>{n._z=n.world[12]*V[2]+n.world[13]*V[6]+n.world[14]*V[10]+V[14];});trans.sort((a,b)=>a._z-b._z);
    const one=n=>{const b=upload(n.geo),m=n.mat;gl.uniformMatrix4fv(loc.uM,false,n.world);gl.uniformMatrix3fv(loc.uNM,false,M.normal(n.world));
     gl.uniform3fv(loc.uColor,m.color);gl.uniform3fv(loc.uEmis,m.emis);gl.uniform3fv(loc.uTint,m.tint);gl.uniform1f(loc.uMetal,m.metal);gl.uniform1f(loc.uRough,m.rough);gl.uniform1f(loc.uAlpha,m.alpha);gl.uniform1f(loc.uRim,m.rim);gl.uniform1f(loc.uEmisMul,m.emisMul);gl.uniform1f(loc.uUseMap,m.map);
     gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(loc.aP);gl.vertexAttribPointer(loc.aP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.enableVertexAttribArray(loc.aN);gl.vertexAttribPointer(loc.aN,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.u);gl.enableVertexAttribArray(loc.aU);gl.vertexAttribPointer(loc.aU,2,gl.FLOAT,false,0,0);
     gl.drawArrays(gl.TRIANGLES,0,n.geo.count);};
    gl.depthMask(true);opaque.forEach(one);gl.depthMask(false);trans.forEach(one);
    if(parts.length){gl.useProgram(PP);gl.uniformMatrix4fv(ploc.uVP,false,VP);gl.uniform1f(ploc.uS,h*.04);gl.blendFunc(gl.ONE,gl.ONE);
     parts.forEach(p=>{const d=new Float32Array([p.x,p.y,p.z,Math.max(0,p.life)]);gl.bindBuffer(gl.ARRAY_BUFFER,pbuf);gl.bufferData(gl.ARRAY_BUFFER,d,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(ploc.aP);gl.vertexAttribPointer(ploc.aP,4,gl.FLOAT,false,0,0);gl.uniform3fv(ploc.uC,p.c);gl.drawArrays(gl.POINTS,0,1);});gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
    gl.depthMask(true);
  }
  function step(dt){clock+=dt;clipT+=dt;if(!dragging){yawUser+=yawVel*dt;yawVel*=Math.exp(-dt*2.2);}parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=2.2*dt;p.life-=dt*.8;});parts=parts.filter(p=>p.life>0);applyPose(dt);}
  const fpsGap=1000/(opts.fps||30);
  function frame(now,force){raf=0;if(!force&&!running)return;const dt=Math.min(.1,Math.max(.001,(now-(last||now))/1000)||.016);if(!force&&now-last<fpsGap-2){raf=requestAnimationFrame(frame);return;}last=now;step(dt);draw();
   if(running&&(motion||clip!==base||parts.length||Math.abs(yawVel)>.02)){raf=requestAnimationFrame(frame);}else if(running){running=false;}}
  function setBase(n){if(!CLIPS[n])return;const was=clip===base;base=n;if(was){clip=n;clipT=0;}if(!running)still();}
  function start(){if(running)return;running=true;last=0;if(!raf)raf=requestAnimationFrame(frame);}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;}
  function still(){step(.016);draw();}
  /* arrastar no palco gira o Lion 360 graus com inércia */
  function drag(el,onTap){let lx=0,lt=0,id=null,mv=0,t0=0;
   el.addEventListener('pointerdown',e=>{if(e.button!==0)return;id=e.pointerId;lx=e.clientX;lt=performance.now();t0=lt;mv=0;dragging=true;yawVel=0;try{el.setPointerCapture(id);}catch(_){}start();});
   el.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==id)return;const dx=e.clientX-lx,now=performance.now(),dt=Math.max(1,now-lt);mv+=Math.abs(dx);yawUser+=dx*.012;yawVel=dx*.012/(dt/1000);lx=e.clientX;lt=now;if(!motion)still();});
   const end=e=>{if(e.pointerId!==id)return;const tap=e.type==='pointerup'&&mv<8&&performance.now()-t0<450;dragging=false;id=null;if(tap&&onTap){try{onTap();}catch(_){}}if(Math.abs(yawVel)>9)yawVel=Math.sign(yawVel)*9;start();};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
   el.addEventListener('dblclick',()=>{yawUser=Math.round(yawUser/TAU)*TAU;yawVel=0;if(!motion)still();else start();});}
  return {play,setBase,start,stop,still,drag,burst,setMotion(v){motion=!!v;if(!motion)stop();},isMotion:()=>motion,setYaw(v){yawUser=v;},resize,canvas,faces:FACES,
   dispose(){stop();try{const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();}catch(_){}}};
 }
 function supported(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}}
 return {create,supported,M,G,CLIPS,lathe,build,drawFace,KEYS};
});
