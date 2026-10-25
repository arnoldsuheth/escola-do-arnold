(function(){
"use strict";
/* ===================== base ===================== */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const DIAS = ["D","S","T","Q","Q","S","S"];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const hoje = () => iso(new Date());
const fmtData = s => { if(!s) return ""; const [y,m,d] = s.split("-"); return `${+d} ${MESES[+m-1]}`; };
const f1 = n => n === null || n === undefined ? "–" : (Math.round(n*10)/10).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };

const HOST = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : "arnoldsuheth";
const REPO = location.hostname.endsWith(".github.io") ? (location.pathname.split("/").filter(Boolean)[0] || "evolution-lab") : "evolution-lab";

/* ===================== estado ===================== */
function blank(){ return {v:1, nome:"Arnold", updatedAt:0, claude:{}, missoes:{}, prog:{}, chefes:{}, fac:{min:6, sem:1, discs:[]}, log:[], bonus:{}, cfg:{meta:100, som:true}, ext:{}, violao:{treinos:{}, acordes:{}, musicas:[], meta:120}, livros:[]}; }
function norm(o){ const b = blank(); const s = Object.assign(b, o||{}); s.fac = Object.assign(blank().fac, s.fac||{}); s.fac.discs = s.fac.discs||[]; s.log = s.log||[]; s.bonus = s.bonus||{}; s.chefes = s.chefes||{}; s.cfg = Object.assign(blank().cfg, s.cfg||{}); s.ext = s.ext||{}; s.violao = Object.assign(blank().violao, s.violao||{}); s.livros = s.livros||[]; delete s.pin; return s; }
let S = norm(lsGet("ea-state"));

/* ===================== cripto ===================== */
const te = new TextEncoder(), td = new TextDecoder();
function b64(buf){ const a = new Uint8Array(buf); let s = ""; for (let i=0;i<a.length;i+=0x8000) s += String.fromCharCode.apply(null, a.subarray(i,i+0x8000)); return btoa(s); }
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const utf8b64 = str => b64(te.encode(str));
async function deriveKey(pass, salt, iter){
  const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2", salt, iterations:iter, hash:"SHA-256"}, base, {name:"AES-GCM", length:256}, true, ["encrypt","decrypt"]);
}
async function encJSON(key, obj){ const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, te.encode(JSON.stringify(obj))); return {iv:b64(iv), ct:b64(ct)}; }
async function decJSON(key, box){ const pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(box.iv)}, key, unb64(box.ct)); return JSON.parse(td.decode(pt)); }
const exportKey = async k => b64(await crypto.subtle.exportKey("raw", k));
const importKey = s => crypto.subtle.importKey("raw", unb64(s), {name:"AES-GCM"}, true, ["encrypt","decrypt"]);

/* ===================== GitHub ===================== */
let SESS = null, KEY = null, COFRE = null;
async function gh(path, opts={}, token){
  const t = token || (SESS && SESS.token);
  const r = await fetch("https://api.github.com" + path, Object.assign({}, opts, {headers: Object.assign({"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Authorization":"Bearer "+t}, opts.body ? {"Content-Type":"application/json"} : {})}));
  if (!r.ok){ const e = new Error("GitHub " + r.status); e.status = r.status; try { e.info = await r.json(); } catch(x){} throw e; }
  return r.status === 204 ? null : r.json();
}
async function fetchCofre(){
  try {
    const r = await fetch("cofre.json?t=" + Date.now(), {cache:"no-store"});
    if (r.ok){ const j = await r.json(); lsSet("ea-cofre", j); return j; }
    const r2 = await fetch(`https://api.github.com/repos/${HOST}/${REPO}/contents/cofre.json`, {headers:{"Accept":"application/vnd.github.raw+json"}, cache:"no-store"});
    if (r2.ok){ const j = await r2.json(); lsSet("ea-cofre", j); return j; }
    if (r.status === 404 && r2.status === 404) return null;
    return lsGet("ea-cofre");
  } catch(e){ return lsGet("ea-cofre") || "offline"; }
}
async function putCofre(cofre, token){
  let sha;
  try { const cur = await gh(`/repos/${HOST}/${REPO}/contents/cofre.json`, {}, token); sha = cur.sha; } catch(e){ if (e.status !== 404) throw e; }
  await gh(`/repos/${HOST}/${REPO}/contents/cofre.json`, {method:"PUT", body:JSON.stringify({message:"Cofre da Evolution Lab", content:utf8b64(JSON.stringify(cofre, null, 1)), sha})}, token);
  lsSet("ea-cofre", cofre);
}

/* ===================== sincronização ===================== */
let sync = "off", pushT = null, pushing = false, pushAgain = false, dirty = false;
function setSync(s){ sync = s; $$(".sync-ind").forEach(el => el.innerHTML = syncHTML()); }
function syncHTML(){ const m = {ok:["","Salvo na nuvem"], busy:["busy","Salvando…"], off:["off","Sem internet: salvo no aparelho"], err:["off","Erro ao salvar na nuvem"]}[sync] || ["off",""]; return `<span class="dot ${m[0]}"></span>${m[1]}`; }
function persist(){ S.updatedAt = Date.now(); lsSet("ea-state", S); dirty = true; schedulePush(); }
function schedulePush(){ if (!SESS) return; setSync("busy"); clearTimeout(pushT); pushT = setTimeout(push, 2200); }
async function push(){
  if (!SESS || !KEY || !dirty) { if (sync === "busy") setSync("ok"); return; }
  if (pushing){ pushAgain = true; return; }
  pushing = true; dirty = false;
  try {
    const box = await encJSON(KEY, S);
    await gh(`/gists/${SESS.gist}`, {method:"PATCH", body:JSON.stringify({files:{"progresso.json":{content:JSON.stringify({v:1, at:S.updatedAt, box})}}})});
    setSync("ok");
  } catch(e){ dirty = true; setSync(navigator.onLine === false ? "off" : "err"); if (e.status === 401) toast("Seu token do GitHub expirou. Atualize em Perfil → Ajustes."); }
  pushing = false;
  if (pushAgain){ pushAgain = false; push(); }
}
async function pull(){
  if (!SESS || !KEY) return false;
  try {
    const g = await gh(`/gists/${SESS.gist}`);
    const f = g.files && g.files["progresso.json"]; if (!f) return false;
    let txt = f.content;
    if (f.truncated && f.raw_url){ txt = await (await fetch(f.raw_url)).text(); }
    const w = JSON.parse(txt); if (!w.box) return false;
    const remote = norm(await decJSON(KEY, w.box));
    if ((remote.updatedAt||0) > (S.updatedAt||0)){ S = remote; lsSet("ea-state", S); setSync("ok"); return true; }
    if ((S.updatedAt||0) > (remote.updatedAt||0)){ dirty = true; push(); }
    else setSync("ok");
  } catch(e){ setSync(navigator.onLine === false ? "off" : "err"); }
  return false;
}
window.addEventListener("online", () => { if (dirty) push(); else pull().then(ch => ch && render()); });
document.addEventListener("visibilitychange", () => {
  if (!SESS) return;
  if (document.visibilityState === "hidden"){ if (dirty){ clearTimeout(pushT); push(); } }
  else pull().then(async ch => { const f = await lerFeed(); if (ch || f) render(true); });
});

/* ===================== cálculos ===================== */
const AULAS = CURSO_CLAUDE.filter(x => !x.tipo);
const numAula = id => AULAS.findIndex(a => a.id === id) + 1;
const nomeItem = x => x.tipo ? x.titulo : `Aula ${numAula(x.id)}`;
const pct = r => r && r.total ? r.best / r.total : 0;
const estrelas = r => !r || !r.done ? 0 : pct(r) >= .9 ? 3 : pct(r) >= .7 ? 2 : 1;
function nivelDone(n){ return CURSO_CLAUDE.filter(x => x.nivel === n && x.tipo !== "prova").every(x => S.claude[x.id] && S.claude[x.id].done); }
function claudeTitulo(){ if (S.claude.pf && pct(S.claude.pf) >= .7) return "Expert em Claude"; const t = ["Iniciante","Usuário","Usuário avançado","Agente","Construtor"]; let k = 0; for (let n=1;n<=4;n++){ if (nivelDone(n)) k = n; else break; } return t[k]; }
function claudeStats(){ let done = 0, ps = []; CURSO_CLAUDE.forEach(x => { const r = S.claude[x.id]; if (r && r.done){ done++; if (r.total) ps.push(pct(r)); } }); return {done, total:CURSO_CLAUDE.length, p:done/CURSO_CLAUDE.length, nota: ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length*10 : null}; }
function progStats(){ let done = 0, ps = []; PROG_AULAS.forEach(([n]) => { const r = S.prog[n]; if (r && r.done){ done++; if (r.tot) ps.push(r.ok/r.tot); } }); return {done, total:PROG_AULAS.length, p:done/PROG_AULAS.length, nota: ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length*10 : null}; }
function media(d){ const v = ["av1","av2","av3"].map(k => d.notas && d.notas[k]).filter(x => typeof x === "number"); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
function facStats(){ let ap = 0, ns = [], t = 0, td2 = 0; S.fac.discs.forEach(d => { const m = media(d); if (m !== null){ ns.push(m); if (m >= S.fac.min) ap++; } (d.topicos||[]).concat(d.entregas||[]).forEach(x => { t++; if (x.ok) td2++; }); }); return {discs:S.fac.discs.length, ap, nota: ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : null, tarefas:t, tdone:td2, p: t ? td2/t : 0}; }
function xpTotal(){
  let x = 0;
  CURSO_CLAUDE.forEach(it => { const r = S.claude[it.id]; if (r && r.done){ const b = it.tipo === "prova" ? [300,200] : it.tipo === "rev" ? [150,100] : [100,50]; x += b[0] + Math.round(b[1]*pct(r)); } });
  Object.values(S.missoes).forEach(a => (a||[]).forEach(v => { if (v) x += 20; }));
  PROG_AULAS.forEach(([n]) => { const r = S.prog[n]; if (r && r.done){ x += 100; if (r.tot) x += Math.round(50*r.ok/r.tot); } });
  Object.values(S.chefes).forEach(v => { if (v) x += 50; });
  S.fac.discs.forEach(d => { const m = media(d); if (m !== null && m >= S.fac.min) x += 200; (d.topicos||[]).forEach(t => { if (t.ok) x += 10; }); (d.entregas||[]).forEach(t => { if (t.ok) x += 30; }); });
  x += Object.keys(S.bonus).length * 50;
  x += xpExtra();
  return x;
}
const RANKS = [[0,"Estagiário"],[300,"Trainee"],[800,"Júnior I"],[1500,"Júnior II"],[2500,"Pleno I"],[3800,"Pleno II"],[5400,"Sênior"],[7400,"Staff"],[10000,"Principal"]];
const CARREIRA = ["Estagiário","Júnior","Pleno","Sênior","Staff"];
const carreiraIdx = n => n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : n === 7 ? 3 : 4;
const RANK_COR = ["#6E7891","#22D3EE","#22D3EE","#34D399","#A78BFA","#A78BFA","#F59E0B","#F472B6","#F472B6"];
function nivel(v){ v = v ?? xpTotal(); let i = 0; RANKS.forEach((r,k) => { if (v >= r[0]) i = k; }); const cur = RANKS[i], nx = RANKS[i+1]; return {n:i+1, nome:cur[1], cor:RANK_COR[i], xp:v, prox: nx ? nx[0] : null, proxNome: nx ? nx[1] : null, p: nx ? (v-cur[0])/(nx[0]-cur[0]) : 1}; }
function notaGeral(){ const ns = [claudeStats().nota, progStats().nota, facStats().nota].filter(x => x !== null); return ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : null; }
function xpDia(d){ return S.log.filter(l => l.d === d).reduce((a,l) => a + (l.xp||0), 0); }
function diasAtivos(){ const m = {}; S.log.forEach(l => { if ((l.xp||0) > 0) m[l.d] = (m[l.d]||0) + l.xp; }); return m; }
function streak(){
  const at = diasAtivos(); let c = 0; const d = new Date();
  if (!at[iso(d)]) d.setDate(d.getDate()-1);
  for (let guard = 0; guard < 400; guard++){ const k = iso(d); if (at[k]) c++; else if (d.getDay() !== 5) break; d.setDate(d.getDate()-1); }
  return c;
}
function feitoHoje(kinds){ const h = hoje(); return S.log.some(l => l.d === h && kinds.includes(l.k) && (l.xp||0) > 0); }
const proxClaude = () => CURSO_CLAUDE.find(x => !(S.claude[x.id] && S.claude[x.id].done));
const proxProg = () => PROG_AULAS.find(([n]) => !(S.prog[n] && S.prog[n].done));
function missoesDia(){
  const dow = new Date().getDay(), pc = proxClaude(), pp = proxProg();
  const fac = S.fac.discs.flatMap(d => (d.topicos||[]).filter(t => !t.ok).map(t => ({d, t})))[0];
  const list = [];
  if (dow === 5) return {rest:true, list:[{k:["claude","prog","fac","retry"], ic:"star", t:"Missão livre (opcional)", s:"Hoje é dia de descanso. Se bater vontade, qualquer atividade vale.", href:"#hoje", xp:"+50"}]};
  if (feitoHoje(["claude"])) list.push({k:["claude"], ic:"ia", t:"Curso de Claude", s:"Aula de hoje concluída", href:"#claude", xp:"+150"});
  else if (pc) list.push({k:["claude"], ic:"ia", t:`Curso de Claude: ${nomeItem(pc)}`, s:pc.titulo, href:`#aula-${pc.id}`, xp:"+150"});
  if (dow >= 1 && dow <= 4 && feitoHoje(["prog"])) list.push({k:["prog"], ic:"code", t:"Programação", s:"Aula de hoje concluída", href:"#prog", xp:"+100"});
  else if (dow >= 1 && dow <= 4 && pp) list.push({k:["prog"], ic:"code", t:`Programação: Aula ${pp[0]}`, s:pp[2], href:"#prog", xp:"+100"});
  if (fac) list.push({k:["fac"], ic:"fac", t:`Faculdade: ${fac.t.t}`, s:fac.d.nome, href:"#fac", xp:"+10"});
  else if (Object.keys(S.claude).length) list.push({k:["retry"], ic:"bolt", t:"Revisão relâmpago", s:"Refaça o quiz de uma aula que você já fez", href:"#claude", xp:"+XP"});
  else if (dow === 0 || dow === 6) list.push({k:["claude","prog"], ic:"bolt", t:"Bônus de fim de semana", s:"Conclua mais uma atividade qualquer", href:"#claude", xp:"+XP"});
  return {rest:false, list};
}
function missoesCompletas(){ const m = missoesDia(); return m.list.length && m.list.every(q => feitoHoje(q.k)); }


function rngProg(a,b){ let t = 0, d = 0; for (let i=a;i<=b;i++){ t++; if (S.prog[i] && S.prog[i].done) d++; } return t ? d/t : 0; }
function atributos(){
  const fs = facStats();
  const fe = (rngProg(0,24)*25 + rngProg(40,50)*11) / 36;
  const cl = CURSO_CLAUDE.reduce((s,x) => { const r = S.claude[x.id]; return s + (r && r.done ? .6 + .4*pct(r) : 0); }, 0) / CURSO_CLAUDE.length;
  const logica = Math.min(1, rngProg(29,39)*.7 + (fs.tarefas ? fs.tdone/fs.tarefas : 0)*.3);
  const fac = fs.discs ? fs.p*.6 + (fs.ap/fs.discs)*.4 : 0;
  const arte = (extStats(extC("arte")).p + extStats(extC("criadores")).p) / 2;
  const mus = Math.min(1, extStats(extC("violao")).p*.6 + Math.min(1, Object.values(S.violao.acordes).filter(v => v === 2).length/12)*.25 + Math.min(1, S.violao.musicas.filter(m => m.st === "d").length/10)*.15);
  return [["Lógica",logica,"#22D3EE"],["Front-end",fe,"#A78BFA"],["IA / Claude",cl,"#F59E0B"],["Git",rngProg(25,28),"#34D399"],["Faculdade",fac,"#F472B6"],["Arte e design",arte,"#FBBF24"],["Música",mus,"#FB923C"]].map(([n,v,c]) => [n, Math.round(v*100), c]);
}
const TREE = [{id:"HTML",a:0,b:8,x:40,y:75},{id:"CSS",a:9,b:24,x:180,y:75},{id:"Git",a:25,b:26,x:310,y:36},{id:"JS",a:29,b:39,x:310,y:114},{id:"GitHub",a:27,b:28,x:440,y:36},{id:"DOM",a:40,b:45,x:440,y:114},{id:"v1.0",a:46,b:50,x:560,y:75}];
const TREE_E = [["HTML","CSS"],["CSS","Git"],["CSS","JS"],["Git","GitHub"],["JS","DOM"],["GitHub","v1.0"],["DOM","v1.0"]];
function arvore(){
  const N = {}; TREE.forEach(t => N[t.id] = Object.assign({p:rngProg(t.a,t.b)}, t));
  const prox = TREE.find(t => N[t.id].p < 1);
  let svg = `<svg class="tree" viewBox="0 0 600 150" role="img" aria-label="Árvore de tecnologias">`;
  TREE_E.forEach(([s,d]) => { const A = N[s], B = N[d], on = A.p === 1; svg += `<path d="M${A.x} ${A.y}L${B.x} ${B.y}" style="stroke:${on?"#22D3EE":"#232B3B"}" stroke-width="2.5"/>`; });
  TREE.forEach(t => { const n = N[t.id], r = t.id.length > 4 ? 26 : 24, c = 2*Math.PI*r;
    if (n.p === 1) svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:#22D3EE"/><text x="${t.x}" y="${t.y+4}" text-anchor="middle" style="fill:#04161A;font-weight:600">${t.id}</text>`;
    else { const front = prox && prox.id === t.id;
      svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:#0E131C;stroke:${front?"#7C5CFF":"#2E3748"}" stroke-width="2" ${front?'stroke-dasharray="4 4"':""}/>`;
      if (n.p > 0) svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:none;stroke:#22D3EE" stroke-width="3" stroke-dasharray="${c*n.p} ${c}" transform="rotate(-90 ${t.x} ${t.y})"/>`;
      svg += `<text x="${t.x}" y="${t.y+4}" text-anchor="middle" style="fill:${n.p>0||front?"#E6E8EE":"#5A6377"}">${t.id}</text>`; } });
  svg += `</svg>`;
  let txt = "Árvore completa. Você publicou a BLESSAINT 1.0.";
  if (prox){ const aula = PROG_AULAS.find(z => z[0] >= prox.a && z[0] <= prox.b && !(S.prog[z[0]] && S.prog[z[0]].done)); txt = `Próximo destravamento: <b style="color:var(--text)">${prox.id}</b> · faltam ${PROG_AULAS.filter(z => z[0] >= prox.a && z[0] <= prox.b && !(S.prog[z[0]] && S.prog[z[0]].done)).length} aulas (próxima: Aula ${aula[0]})`; }
  return {svg, txt};
}

/* ===================== ação com XP ===================== */
function act(fn, k, txt, ev){
  const before = xpTotal(), lvB = nivel(before).n;
  fn();
  let delta = xpTotal() - before;
  if (delta !== 0 || txt){ S.log.unshift({t:Date.now(), d:hoje(), k, txt, xp: k === "import" ? 0 : delta}); S.log = S.log.slice(0, 400); }
  let bonusAgora = false;
  if (delta > 0 && !S.bonus[hoje()] && missoesCompletas()){ S.bonus[hoje()] = true; S.log.unshift({t:Date.now(), d:hoje(), k:"bonus", txt:"Missões do dia completas", xp:50}); bonusAgora = true; }
  persist();
  const total = xpTotal(), lvA = nivel(total);
  if (delta > 0){ floatXP("+" + delta + " XP", ev); som("xp"); }
  if (lvA.n > lvB) setTimeout(() => levelUp(lvA), 500);
  else if (bonusAgora) setTimeout(() => modal(`<span class="tag gold">quests de hoje · 100%</span><h2>Todas as quests concluídas</h2><p class="muted">Bônus de constância: <b class="mono" style="color:var(--cyan)">+50 xp</b>.</p><button class="btn gold" data-close>Continuar</button>`, true), 450);
  paintTop();
  return delta;
}

/* ===================== efeitos ===================== */
let actx = null;
function som(tipo){
  if (!S.cfg.som) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notas = {ok:[660,880], bad:[220,180], xp:[880,1320], up:[523,659,784,1047], done:[523,784,1047]}[tipo] || [600];
    notas.forEach((f,i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f; const t0 = actx.currentTime + i*0.09; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(tipo === "bad" ? 0.04 : 0.07, t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0+0.22); o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0+0.25); });
    if (navigator.vibrate) navigator.vibrate(tipo === "bad" ? [40,40,40] : 25);
  } catch(e){}
}
function floatXP(txt, ev){
  const el = document.createElement("div"); el.className = "xp-float"; el.textContent = txt;
  const x = ev && ev.clientX ? ev.clientX : innerWidth/2, y = ev && ev.clientY ? ev.clientY : innerHeight/2;
  el.style.left = (x - 40) + "px"; el.style.top = (y - 30) + "px"; document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
}
function confetti(){
  return;
  const c = $("#confetti"); c.hidden = false; const ctx = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight;
  const cores = ["#FFC94A","#FF8A5B","#3DDBB5","#8D7BFF","#58B4FF","#EADDC3","#FF5E9A"];
  const ps = Array.from({length:160}, () => ({x:innerWidth/2 + (Math.random()-.5)*120, y:innerHeight*0.35, vx:(Math.random()-.5)*14, vy:-Math.random()*14-4, s:Math.random()*8+4, r:Math.random()*6, vr:(Math.random()-.5)*.3, c:cores[Math.floor(Math.random()*cores.length)]}));
  let f = 0;
  (function tick(){ ctx.clearRect(0,0,c.width,c.height); ps.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); ctx.restore(); }); if (++f < 150) requestAnimationFrame(tick); else { ctx.clearRect(0,0,c.width,c.height); c.hidden = true; } })();
}
let toastT;
function toast(msg){ let t = $(".toast"); if (!t){ t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3000); }
function modal(html, festa){ fecharModal(); const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="modal-in" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(m); m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) fecharModal(); }); if (festa){ confetti(); som("done"); } const b = $("button", m); if (b) b.focus(); }
function fecharModal(){ $$(".modal, .sheet").forEach(m => m.remove()); }
function levelUp(lv){ som("up"); modal(`${badge(lv, 96)}<span class="eyebrow">Promoção · lvl ${lv.n}</span><h2 style="font-size:1.8rem">Agora você é <span class="gtext">${esc(lv.nome)}</span></h2><p class="muted">${lv.prox ? `Próximo cargo: ${esc(lv.proxNome)} com ${lv.prox} xp.` : "Topo da carreira: Principal."}</p><button class="btn gold" data-close>Continuar</button>`, true); }
function copiar(txt){
  const ok = () => toast("Copiado. Cole na conversa com o Claude.");
  const fb = () => { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let r = false; try { r = document.execCommand("copy"); } catch(e){} ta.remove(); if (r) ok(); else modal(`<h3>Copie o texto</h3><textarea class="input" style="min-height:180px">${esc(txt)}</textarea><button class="btn" data-close>Fechar</button>`); };
  try { navigator.clipboard.writeText(txt).then(ok, fb); } catch(e){ fb(); }
}
function hash32(s){ let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function ordem(id, qi, n){ let h = hash32(id + ":" + qi) || 1; const r = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h>>>0) % 10000) / 10000; }; const a = [...Array(n).keys()]; for (let i=n-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

/* ===================== ícones e peças ===================== */
const I = (p, w=2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO = {
  hoje: I('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  ia: I('<path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>'),
  code: I('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
  fac: I('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'),
  perfil: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  check: I('<path d="M5 12l5 5L20 7"/>', 3),
  bolt: I('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  star: I('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  lamp: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
  lock: I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  out: I('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4"/>'),
  sword: I('<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>'),
  cal: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  back: I('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  grid: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  music: I('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  book: I('<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M4 20.5A1.5 1.5 0 0 0 5.5 22H20v-3"/>'),
  phone: I('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
};
const ICON_SVG = {
  trophy: `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFAE1F"/></linearGradient></defs><path d="M18 8h28v14c0 9-6 16-14 16s-14-7-14-16z" fill="url(#tg)"/><path d="M18 12H8c0 8 4 13 11 14M46 12h10c0 8-4 13-11 14" fill="none" stroke="#FFC94A" stroke-width="4"/><rect x="28" y="38" width="8" height="10" fill="#FFAE1F"/><rect x="18" y="48" width="28" height="8" rx="3" fill="#C98200"/></svg>`
};
function flame(cold){ return `<svg class="flame ${cold?"cold":""}" viewBox="0 0 64 76" aria-hidden="true"><defs><linearGradient id="fg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFD25A"/><stop offset="1" stop-color="#FF4D1F"/></linearGradient><linearGradient id="fg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFF4C2"/><stop offset="1" stop-color="#FFB13B"/></linearGradient></defs><path class="f1" d="M32 2C36 16 54 24 54 46c0 16-10 28-22 28S10 62 10 46c0-10 5-17 10-22 1 8 5 12 9 13-3-12 0-24 3-35z" fill="url(#fg1)"/><path class="f2" d="M32 34c3 7 12 11 12 22 0 8-5 14-12 14s-12-6-12-14c0-6 4-9 6-11 0 4 2 6 4 6-1-6 0-12 2-17z" fill="url(#fg2)"/></svg>`; }
function badge(lv, size=64){ const c = lv.cor; return `<svg class="lvlbadge" style="width:${size}px;height:${size*1.12}px" viewBox="0 0 64 72" aria-hidden="true"><defs><linearGradient id="bg${lv.n}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><path d="M32 2l28 16v36L32 70 4 54V18z" fill="#0E131C" stroke="url(#bg${lv.n})" stroke-width="3"/><text x="32" y="44" text-anchor="middle" style="font-family:var(--f-d);font-weight:800;font-size:22px;fill:#fff">${lv.n}</text></svg>`; }
function starRow(n, size=16){ return `<span class="stars">${[1,2,3].map(i => `<svg viewBox="0 0 24 24" style="width:${size}px;height:${size}px" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="${i<=n?"#22D3EE":"rgba(255,255,255,.12)"}"/></svg>`).join("")}</span>`; }
function ring(p, size, stroke, color, label){ const r = (size-stroke)/2, c = 2*Math.PI*r, v = Math.max(0, Math.min(1, p)); return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c*v} ${c}" transform="rotate(-90 ${size/2} ${size/2})"/>${label ? `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" style="font-size:${size/4.4}px">${label}</text>` : ""}</svg>`; }
let _crestN = 0;
const crestSVG = () => { const p = "cr" + (++_crestN); return `<svg class="crest" viewBox="14 8 64 82" aria-hidden="true"><defs><linearGradient id="${p}T" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#67E8F9"/></linearGradient><linearGradient id="${p}L" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7C3AED"/><stop offset="1" stop-color="#4F46E5"/></linearGradient><linearGradient id="${p}R" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3B82F6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><polygon points="44,22 60,31 60,50 44,41" fill="url(#${p}L)"/><polygon points="60,31 76,22 76,41 60,50" fill="url(#${p}R)"/><polygon points="60,13 76,22 60,31 44,22" fill="url(#${p}T)"/><polygon points="18,40 34,49 34,68 18,59" fill="url(#${p}L)"/><polygon points="34,49 50,40 50,59 34,68" fill="url(#${p}R)"/><polygon points="34,31 50,40 34,49 18,40" fill="url(#${p}T)"/><polygon points="42,58 58,67 58,86 42,77" fill="url(#${p}L)"/><polygon points="58,67 74,58 74,77 58,86" fill="url(#${p}R)"/><polygon points="58,49 74,58 58,67 42,58" fill="url(#${p}T)"/></svg>`; };
const CREST_BIG = crestSVG();

/* ===================== moldura ===================== */
const NAV = [["hoje","Painel","hoje"],["cursos","Meus cursos","grid"],["claude","Claude","ia"],["prog","Programação","code"],["fac","Faculdade","fac"],["violao","Violão","music"],["livros","Biblioteca","book"],["perfil","Perfil","perfil"]];
const NAV_TAB = ["hoje","cursos","violao","livros","perfil"];
const rota = () => (location.hash || "#hoje").slice(1) || "hoje";
const secao = r => r.startsWith("aula-") ? "claude" : r.startsWith("curso-") ? "cursos" : NAV.some(n => n[0] === r) ? r : "hoje";
function shell(){
  return `<div class="read-bar" id="readbar"></div><div class="shell">
  <aside class="rail"><a class="brand" href="#hoje">${CREST_BIG}<span><b>Evolution <span class="gtext">Lab</span></b><small id="brandsub">lvl 1 · Estagiário</small></span></a>
   ${NAV.map(([k,t,i]) => `<a class="navi" href="#${k}" data-nav="${k}">${ICO[i]}${t}</a>`).join("")}
   <div class="spacer"></div><div class="sync sync-ind">${syncHTML()}</div></aside>
  <div class="main"><header class="topbar"><a class="brand" href="#hoje">${crestSVG()}<span><b>Evolution <span class="gtext">Lab</span></b></span></a><div id="pills" class="row" style="gap:8px;flex-wrap:nowrap"></div></header>
   <main id="view" class="wrap"></main></div></div>
  <nav class="tabbar" aria-label="Seções">${NAV.filter(n => NAV_TAB.includes(n[0])).map(([k,t,i]) => `<a href="#${k}" data-nav="${k}">${ICO[i]}<span>${t}</span></a>`).join("")}</nav>`;
}
function paintTop(){
  const p = $("#pills"); if (!p) return; const lv = nivel(), st = streak(), hx = xpDia(hoje());
  p.innerHTML = `<a class="pill fire ${hx>0?"":"cold"}" href="#hoje" title="Dias seguidos">${flameMini()}${st} ${st===1?"dia":"dias"}</a><a class="pill xp" href="#perfil" title="XP total">${lv.xp} xp</a><a class="pill lvl" href="#perfil" title="Cargo">lvl ${lv.n} · ${esc(lv.nome)}</a>`;
  const bs = $("#brandsub"); if (bs) bs.textContent = `lvl ${lv.n} · ${lv.nome}`;
}
const flameMini = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1.5 5 7 7.5 7 14a7 7 0 0 1-14 0c0-3.5 2-6 3.5-7.3.3 2.6 1.6 4 3 4.3C10.6 9 11 5 12 2z" fill="currentColor"/></svg>`;

/* ===================== HOJE ===================== */
const FRASES = [
 ["Todo especialista já foi iniciante. Hoje você está mais perto do que ontem.",""],
 ["Tudo posso naquele que me fortalece.","Filipenses 4:13"],
 ["Código bom é código que você entende. Escreva, teste, entenda.",""],
 ["Constância vence talento quando o talento não é constante.",""],
 ["Esforce-se, e tenha bom ânimo.","Josué 1:9"],
 ["A vida é curta para roupas sem graça, e para código sem propósito.","BLESSAINT"],
 ["Um commit por dia mantém o medo longe.",""],
 ["O segredo de progredir é começar.",""],
 ["Quem é fiel no pouco, também é fiel no muito.","Lucas 16:10"],
 ["Erro no console é professor de graça.",""],
 ["Você não é todo mundo.","BLESSAINT"],
 ["Pequenas aulas, todo dia, viram uma carreira.",""]
];
function saudacao(){
  const d = new Date(), h = d.getHours(), dow = d.getDay();
  const oi = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  let sub;
  if (dow === 5) sub = "Sexta é dia de churrasco. Descansa: sua sequência fica protegida hoje.";
  else if (dow === 0 || dow === 6) sub = "Fim de semana é estudo leve. Uma aula de Claude já vale o dia.";
  else if (h < 5) sub = "Já passou da meia-noite. Descansa, que amanhã tem mais.";
  else if (h < 20){ const m = (20-h)*60 - d.getMinutes(); sub = `Sua sessão de estudo começa às 20h. Faltam ${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}.`; }
  else sub = "Sessão aberta até a meia-noite. Bora pra cima.";
  return {oi, sub};
}
function viewHoje(){
  const lv = nivel(), st = streak(), hx = xpDia(hoje()), meta = S.cfg.meta, sd = saudacao(), md = missoesDia();
  const cs = claudeStats(), ps = progStats(), fs = facStats(), pc = proxClaude(), pp = proxProg();
  const at = diasAtivos(), ci = carreiraIdx(lv.n), arv = arvore(), attrs = atributos(), med = medalhas();
  const seg = new Date(); seg.setDate(seg.getDate() - ((seg.getDay()+6)%7));
  const NOMES = ["dom","seg","ter","qua","qui","sex","sáb"];
  const semana = [...Array(7)].map((_,i) => { const d = new Date(seg); d.setDate(seg.getDate()+i); const k = iso(d); return `<div><i class="${at[k]?"on":""} ${d.getDay()===5&&!at[k]?"rest":""} ${k===hoje()?"today":""}" title="${fmtData(k)}: ${at[k]||0} xp"></i><small>${NOMES[d.getDay()]}</small></div>`; }).join("");
  const feitas = md.list.filter(q => feitoHoje(q.k)).length;
  const conq = med.filter(m => m[2]).concat(med.filter(m => !m[2])).slice(0,4);
  const abrev = t => t.split(" ").map(w => w[0]).join("").slice(0,3).toUpperCase();
  const prox = pc ? `#aula-${pc.id}` : "#perfil";
  return `<div class="stack fade">
  <div class="head"><div><h1>${sd.oi}, <span>${esc(S.nome)}</span></h1><div class="muted small" style="margin-top:4px">${new Date().toLocaleDateString("pt-BR",{weekday:"long"})} · ${sd.sub}</div></div>
   <span class="pill">nota geral ${f1(notaGeral())}</span></div>
  <div class="dash">
   <div class="stack">
    <section class="card"><div class="row between"><span class="k">Carreira</span><span class="tag gold">lvl ${lv.n} · ${esc(lv.nome)}</span></div>
     <div class="career">${CARREIRA.map((c,i) => `${i ? `<i class="${i<=ci?"on":""}"></i>` : ""}<span class="${i<ci?"on":i===ci?"cur":""}">${c}</span>`).join("")}</div>
     <div class="stats3"><div class="stat"><div class="k">xp</div><div class="v num">${lv.xp}<small>/${lv.prox || lv.xp}</small></div></div><div class="stat"><div class="k">aulas</div><div class="v num">${cs.done+ps.done}<small>/${cs.total+ps.total}</small></div></div><div class="stat"><div class="k">conquistas</div><div class="v num">${med.filter(m=>m[2]).length}<small>/${med.length}</small></div></div></div>
     <div class="bar" style="margin-top:14px"><i style="width:${Math.round(lv.p*100)}%"></i></div><div class="tiny dim mono" style="margin-top:6px">${lv.prox ? `${lv.prox-lv.xp} xp para ${esc(lv.proxNome)}` : "topo da carreira"}</div></section>
    <section class="card"><span class="k">Árvore de tecnologias · programação</span><div style="margin-top:8px">${arv.svg}</div><div class="small muted">${arv.txt}</div></section>
    <section class="card"><div class="row between"><span class="k">${md.rest ? "Sexta livre · sequência protegida" : `Quests de hoje · ${feitas}/${md.list.length}`}</span><span class="tiny mono" style="color:var(--violet)">${S.bonus[hoje()] ? "bônus ganho" : "bônus +50 xp"}</span></div>
     <div style="margin-top:6px">${md.list.map(q => { const ok = feitoHoje(q.k); return `<a class="quest ${ok?"done":""}" href="${q.href}"><span class="ic">${ok ? ICO.check : ""}</span><span style="min-width:0"><b style="display:block;line-height:1.3;font-weight:600">${esc(q.t)}</b><span class="tiny dim">${esc(q.s)}</span></span><span class="rw">${ok ? "feito" : q.xp.replace("XP","xp")}</span></a>`; }).join("") || `<p class="muted">Tudo concluído.</p>`}</div>
     <div class="row" style="margin-top:12px"><a class="btn gold" href="${prox}">${pc ? `Continuar quest · ${esc(nomeItem(pc))}` : "Ver certificado"}</a>${pp && new Date().getDay()>=1 && new Date().getDay()<=4 ? `<a class="btn" href="#prog">Aula ${pp[0]} de programação</a>` : ""}</div></section>
   </div>
   <div class="stack">
    <section class="card"><span class="k">Atributos</span>${attrs.map(([n,v,c]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${c}"></i></div><b>${v}</b></div>`).join("")}<div class="tiny dim" style="margin-top:10px">Crescem conforme você conclui aulas, tarefas e disciplinas.</div></section>
    <section class="card"><div class="row between"><span class="k">Constância · ${st} ${st===1?"dia":"dias"}</span><span class="tiny mono dim">meta ${hx}/${meta} xp</span></div><div class="weekt">${semana}</div><div class="bar" style="margin-top:14px;height:6px"><i style="width:${Math.min(100,Math.round(hx/meta*100))}%;background:var(--amber)"></i></div></section>
    <section class="card"><span class="k">Conquistas</span><div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px">${conq.map(([t,d,on,cor]) => `<div class="badge-mini ${on?"":"off"}" title="${esc(d)}"><i style="background:${cor}">${abrev(t)}</i><span style="min-width:0;line-height:1.25">${esc(t)}</span></div>`).join("")}</div></section>
    <section class="card"><span class="k">Cursos</span>
     ${[["#claude","Curso de Claude",cs.p,"#F59E0B",`${cs.done}/${cs.total}`],["#prog","Programação · BLESSAINT",ps.p,"#A78BFA",`${ps.done}/${ps.total}`],["#fac","Faculdade Estácio",fs.p,"#F472B6",fs.discs?`${fs.tdone}/${fs.tarefas} tarefas`:"cadastrar"]].concat(EXT_CURSOS.filter(c => extStats(c).d > 0 && extStats(c).p < 1).map(c => { const s = extStats(c); return [`#curso-${c.id}`, c.nome, s.p, c.cor[1], `${s.d}/${s.t}`]; })).map(([h,t,p,c,s]) => `<a href="${h}" style="display:block;text-decoration:none;color:var(--text);padding:11px 0;border-top:1px solid var(--line)"><div class="row between"><span style="font-weight:600;font-size:.92rem">${t}</span><span class="tiny mono" style="color:${c}">${s}</span></div><div class="bar" style="height:5px;margin-top:8px"><i style="width:${Math.round(p*100)}%;background:${c}"></i></div></a>`).join("")}<a class="btn sm" href="#cursos" style="width:100%;margin-top:8px">Ver todos os cursos</a></section>
   </div>
  </div></div>`;
}
function courseCard(href, cls, ic, t, sub, p, cor, linha, nota){
  return `<a class="course ${cls}" href="${href}"><div class="row between" style="flex-wrap:nowrap"><span class="ico">${ICO[ic]}</span>${ring(p, 58, 7, cor, Math.round(p*100)+"%")}</div>
   <div><span class="eyebrow" style="color:rgba(255,255,255,.5)">${esc(sub)}</span><h3 style="margin-top:4px">${esc(t)}</h3></div><div class="grow"></div>
   <div class="row between"><span class="small muted">${esc(linha)}</span>${nota !== null ? `<span class="grade">${f1(nota)}</span>` : ""}</div></a>`;
}
function heatmap(sem){
  const at = diasAtivos(); const fim = new Date(); const ini = new Date(); ini.setDate(fim.getDate() - (sem*7 - 1) - ((fim.getDay()+6)%7 ? 0 : 0));
  ini.setDate(ini.getDate() - ((ini.getDay()+6)%7));
  let h = ""; const d = new Date(ini);
  while (d <= fim){ const k = iso(d), v = at[k]||0; h += `<i class="${v>=200?"l4":v>=100?"l3":v>=50?"l2":v>0?"l1":""}" title="${fmtData(k)}: ${v} XP"></i>`; d.setDate(d.getDate()+1); }
  return `<div class="heat">${h}</div><div class="row tiny dim" style="margin-top:8px;gap:6px">menos <i style="width:12px;height:12px;border-radius:3px;background:#1E2533"></i><i style="width:12px;height:12px;border-radius:3px;background:#156075"></i><i style="width:12px;height:12px;border-radius:3px;background:#1597B0"></i><i style="width:12px;height:12px;border-radius:3px;background:#22D3EE"></i> mais</div>`;
}

/* ===================== CLAUDE: trilha ===================== */
const ZIG = [0, 70, 105, 70, 0, -70, -105, -70];
function viewClaude(){
  const cs = claudeStats(), pc = proxClaude(); let idx = 0;
  const UNIT_BG = ["var(--card)","var(--card)","var(--card)","var(--card)"];
  return `<div class="stack fade">
  <section class="course-hero" style="--acc:linear-gradient(90deg,#F59E0B,#F472B6)"><div class="hero-grid">
   <div class="stack" style="gap:12px"><span class="eyebrow" style="color:var(--amber)">curso_01 · ia</span><h1>Curso de Claude</h1>
    <p class="muted" style="font-size:1.05rem;margin:0">Do zero ao avançado: como a IA funciona, como pedir bem, o app inteiro, agentes, Claude Code e a API. Tudo em português, com prática na BLESSAINT.</p>
    <div class="row"><span class="tag cl">16 aulas</span><span class="tag cl">4 revisões</span><span class="tag cl">prova final</span><span class="tag gold">${cs.done}/${cs.total} feitas</span></div>
    <div class="row">${pc ? `<a class="btn gold" href="#aula-${pc.id}">${cs.done ? "Continuar" : "Começar"}: ${esc(nomeItem(pc))}</a>` : ""}<button class="btn ghost" data-intro="1">Como funciona</button></div></div>
   <figure class="fig ill" style="justify-self:center;width:100%">${ILUS.capaClaude()}</figure>
  </div></section>
  <div class="trail">${NIVEIS.map((nv,ni) => {
    const its = CURSO_CLAUDE.filter(x => x.nivel === nv.n); const f = its.filter(x => S.claude[x.id] && S.claude[x.id].done).length;
    return `<div class="unit" style="background:${UNIT_BG[ni]}"><div style="min-width:0"><span class="eyebrow">nível_${nv.n} · ${f}/${its.length}</span><h3 style="margin-top:4px">${esc(nv.nome)}</h3><div class="small muted">${esc(nv.desc)}</div></div>${nivelDone(nv.n) ? `<span class="tag gold">${ICO.check} concluído</span>` : ""}</div>` +
      its.map(x => { const r = S.claude[x.id], done = r && r.done, cur = pc && pc.id === x.id, off = ZIG[idx++ % ZIG.length];
        const inner = x.tipo === "prova" ? ICO.star : x.tipo === "rev" ? ICO.bolt : done ? ICO.check : numAula(x.id);
        return `<div class="node-wrap" style="transform:translateX(${off}px)">${cur ? `<span class="bubble">PRÓXIMA</span>` : ""}<a class="node ${done?"done":""} ${cur?"cur":""} ${x.tipo?"rev":""}" href="#aula-${x.id}" aria-label="${esc(nomeItem(x)+": "+x.titulo)}">${inner}</a><div class="node-lbl">${esc(x.tipo ? x.titulo : x.titulo)}<small>${esc(nomeItem(x))} · ${x.min} min${DATAS_CLAUDE[x.id] ? " · "+fmtData(DATAS_CLAUDE[x.id]) : ""}</small>${done ? starRow(estrelas(r)) : ""}</div></div>`; }).join("");
  }).join("")}
  ${S.claude.pf && pct(S.claude.pf) >= .7 ? `<div style="width:100%;max-width:620px;margin-top:24px">${certificado()}</div>` : ""}
  </div></div>`;
}
function introModal(){ modal(`<span class="eyebrow">Curso de Claude</span><h2>Como funciona</h2><div style="text-align:left" class="small"><p>Cada aula tem explicação curta com ilustração e dica do professor. No fechamento: mapa mental, quiz de marcar X (uma pergunta por vez, com combo) e a missão prática.</p><p><b>Estrelas:</b> 1 por concluir, 2 com 70% e 3 com 90% no quiz. Vale a melhor tentativa.</p><p><b>Seu título</b> sobe a cada nível: Usuário, Usuário avançado, Agente, Construtor e, passando na prova final com 70%, Expert em Claude com certificado.</p><p>Dúvidas? Toque em "Copiar" e cole na conversa do Projeto com o Claude.</p></div><button class="btn gold" data-close>Entendi</button>`); }
function certificado(){ const r = S.claude.pf; return `<section class="cert"><span class="eyebrow" style="color:rgba(255,255,255,.6)">O Evolution Lab certifica que</span><h2 style="margin:12px 0;font-size:2rem">${esc(S.nome)}</h2><p>concluiu o <b>Curso de Claude: do zero ao avançado</b></p><p class="small muted" style="margin:0">Prova final ${r.best}/${r.total} · ${new Date(r.at).toLocaleDateString("pt-BR")}</p><div style="margin-top:14px">${starRow(estrelas(r), 30)}</div></section>`; }

/* ===================== AULA ===================== */
const QZ = {};
function viewAula(id){
  const i = CURSO_CLAUDE.findIndex(x => x.id === id); if (i < 0) return viewClaude();
  const x = CURSO_CLAUDE[i], prev = CURSO_CLAUDE[i-1], next = CURSO_CLAUDE[i+1], r = S.claude[x.id];
  const cobre = (x.cobre||[]).map(c => { const a = CURSO_CLAUDE.find(z => z.id === c); return `<a href="#aula-${c}" class="tag cl" style="text-decoration:none">Aula ${numAula(c)} · ${esc(a.titulo)}</a>`; }).join(" ");
  return `<article class="lesson stack fade" style="gap:16px">
   <nav class="crumbs"><a href="#claude">${ICO.back.replace("<svg","<svg style='width:16px;height:16px;vertical-align:-3px'")} Curso de Claude</a><span class="dim">/</span><span class="dim">Nível ${x.nivel} · ${esc(NIVEIS[x.nivel-1].nome)}</span></nav>
   <header class="stack" style="gap:10px"><div class="row"><span class="tag cl">${x.tipo === "prova" ? "Prova final" : x.tipo ? "Revisão" : "Aula " + numAula(x.id)}</span><span class="small dim">${x.min} min</span>${r && r.done ? `<span class="tag gold">${starRow(estrelas(r),13)} concluída</span>` : ""}</div>
    <h1 style="font-size:clamp(1.9rem,6vw,2.8rem)">${esc(x.titulo)}</h1><p class="muted" style="font-size:1.1rem;margin:0">${esc(x.sub)}</p></header>
   ${x.ilu ? `<figure class="fig">${ILUS[x.ilu]()}</figure>` : ""}
   ${x.tipo ? `<div class="card"><b>${x.tipo === "prova" ? "Regras da prova" : "Esta revisão cobre"}</b><div style="margin-top:10px" class="${x.tipo==="prova"?"muted small":"row"}">${x.tipo === "prova" ? "15 questões do curso todo. Com 70% ou mais você passa e ganha o certificado e o título Expert em Claude. Pode refazer à vontade; vale a melhor nota." : cobre}</div></div>` : `
   <p class="content" style="font-size:1.12rem;margin:0">${esc(x.intro)}</p>
   <div class="content">${x.secoes.map((s,k) => `<section class="sec"><h3><span class="k">${k+1}</span>${esc(s[0])}</h3>${s[1]}</section>`).join("")}</div>
   <aside class="tip">${ICO.lamp}<div><b style="font-family:var(--f-d)">Dica do professor</b><p style="margin:6px 0 0">${esc(x.dica)}</p></div></aside>`}
   <div class="divider"><h2>Fechamento</h2></div>
   <section><span class="eyebrow">Mapa mental</span><div class="mind" style="margin-top:10px"><div class="center">${esc(x.titulo)}</div>${x.mapa.map(m => `<div class="n">${esc(m)}</div>`).join("")}</div></section>
   <section id="quiz"><span class="eyebrow">Quiz · marque um X</span><div style="margin-top:10px" id="quizbox">${quizHTML(x)}</div></section>
   ${x.missao ? `<section><span class="eyebrow">Missão prática no site</span><div style="margin-top:10px">${x.missao.map((m,k) => { const on = (S.missoes[x.id]||[])[k]; return `<button class="check" role="checkbox" aria-checked="${!!on}" data-mis="${x.id}:${k}"><span class="box"></span><span class="t">${esc(m)}</span><span class="xp">+20 XP</span></button>`; }).join("")}</div></section>` : ""}
   <section class="card"><div class="row between"><b>Enviar para o Claude</b><span class="small dim">cole na conversa do Projeto</span></div><div class="row" style="margin-top:12px"><button class="btn sm" data-copy-aula="${x.id}">${ICO.copy} Copiar resultado</button><button class="btn sm ghost" data-duvida="${x.id}">${ICO.copy} Copiar pedido de dúvida</button></div></section>
   <nav class="row between">${prev ? `<a class="btn ghost" href="#aula-${prev.id}">${ICO.back} ${esc(nomeItem(prev))}</a>` : "<span></span>"}${next ? `<a class="btn" href="#aula-${next.id}">${esc(nomeItem(next))} ${ICO.arrow}</a>` : ""}</nav>
  </article>`;
}
function quizHTML(x){
  const q = QZ[x.id], r = S.claude[x.id];
  if (!q){
    return `<div class="quiz" style="text-align:center"><span class="tag pg">quiz · ${x.quiz.length} questões</span><h3 style="margin:10px 0 6px">Teste o que você aprendeu</h3><p class="muted small">${r && r.total ? `Sua melhor nota: <b class="num" style="color:var(--gold)">${r.best}/${r.total}</b> ${starRow(estrelas(r),14)}` : "Responda clicando na caixinha. Acertos seguidos viram combo."}</p><button class="btn gold" data-qstart="${x.id}">${r && r.total ? "Refazer quiz" : "Começar quiz"}</button></div>`;
  }
  if (q.fim){
    const right = q.res.filter(Boolean).length, n = x.quiz.length, p = right/n, st = p >= .9 ? 3 : p >= .7 ? 2 : 1;
    return `<div class="quiz result"><div class="bigstars">${[1,2,3].map(i => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="${i<=st?"#22D3EE":"rgba(255,255,255,.12)"}"/></svg>`).join("")}</div>
     <h2>${right === n ? "100% de acerto" : p >= .7 ? "Aprovado" : "Revise e tente de novo"}</h2><div class="row" style="justify-content:center;gap:24px"><div><div class="xpgain num">${right}/${n}</div><div class="tiny dim">acertos</div></div><div><div class="xpgain num">${q.gain > 0 ? "+"+q.gain : "+0"}</div><div class="tiny dim">XP</div></div><div><div class="xpgain num" style="color:var(--fire)">${q.maxCombo}</div><div class="tiny dim">maior combo</div></div></div>
     <div class="row" style="justify-content:center"><button class="btn gold" data-copy-aula="${x.id}">${ICO.copy} Enviar resultado ao Claude</button><button class="btn" data-qstart="${x.id}">Refazer</button></div></div>`;
  }
  const qi = q.i, item = x.quiz[qi], ord = ordem(x.id, qi, item[1].length);
  return `<div class="quiz"><div class="row between" style="flex-wrap:nowrap;gap:14px"><div class="qprog" style="flex:1">${x.quiz.map((_,k) => `<i class="${k<qi ? (q.res[k]?"ok":"bad") : k===qi ? "cur" : ""}"></i>`).join("")}</div>${q.combo >= 2 ? `<span class="combo">${flameMini().replace("<svg","<svg style='width:18px;height:18px'")} ${q.combo}x</span>` : `<span class="small dim num">${qi+1}/${x.quiz.length}</span>`}</div>
   <div class="qtext">${esc(item[0])}</div>
   ${ord.map(oi => { let cls = ""; if (q.checked){ if (oi === item[2]) cls = "right"; else if (q.pick === oi) cls = "wrong"; } return `<button class="opt ${cls}" role="checkbox" aria-checked="${q.pick===oi}" data-opt="${x.id}:${oi}" ${q.checked?"disabled":""}><span class="box"></span><span>${esc(item[1][oi])}</span></button>`; }).join("")}
   ${q.checked ? `<div class="feedback ${q.pick===item[2]?"ok":"bad"}"><div><b>${q.pick===item[2] ? (q.combo>=3 ? `Combo ${q.combo}x.` : "Correto.") : "Incorreto."}</b> ${q.pick===item[2] ? "" : `Resposta: ${esc(item[1][item[2]])}. `}${esc(item[3])}</div></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ${q.pick===item[2]?"ok":"gold"}" data-qnext="${x.id}">${qi+1 < x.quiz.length ? "Continuar" : "Ver resultado"} ${ICO.arrow}</button></div>`
     : `<div class="row between" style="margin-top:16px"><span class="err" id="qerr" role="alert"></span><button class="btn gold" data-qcheck="${x.id}">Verificar</button></div>`}
  </div>`;
}
function repintarQuiz(id){ const x = CURSO_CLAUDE.find(z => z.id === id); const b = $("#quizbox"); if (b) b.innerHTML = quizHTML(x); }
function textoAula(id){
  const x = CURSO_CLAUDE.find(z => z.id === id), r = S.claude[id], m = S.missoes[id] || [];
  let t = `Evolution Lab · Curso de Claude\n${nomeItem(x)}: ${x.titulo}\n`;
  if (r && r.total){ t += `Quiz: última ${r.last}/${r.total} · melhor ${r.best}/${r.total}\n`; if (r.wrong && r.wrong.length) t += `Errei: ${r.wrong.map(n => `pergunta ${n} ("${x.quiz[n-1][0]}")`).join("; ")}\n`; } else t += "Quiz ainda não feito.\n";
  if (x.missao) t += `Missão: ${m.filter(Boolean).length}/${x.missao.length}${x.missao.map((mm,k) => m[k] ? "" : `\n- pendente: ${mm}`).join("")}\n`;
  return t + "Me explica o que eu errei e me dá um desafio extra de múltipla escolha.";
}

/* ===================== PROGRAMAÇÃO ===================== */
function viewProg(){
  const ps = progStats(), pp = proxProg(), vazio = Object.keys(S.prog).length === 0;
  return `<div class="stack fade">
  <section class="course-hero" style="--acc:linear-gradient(90deg,#7C5CFF,#A78BFA)"><div class="hero-grid">
   <div class="stack" style="gap:12px"><span class="eyebrow" style="color:var(--violet)">curso_02 · front-end</span><h1>Programação</h1>
    <p class="muted" style="margin:0;font-size:1.05rem">HTML, CSS, Git e JavaScript construindo o site da BLESSAINT. Você digita o código, o Claude explica e corrige.</p>
    <div class="row"><span class="tag pg">51 aulas</span><span class="tag pg">5 fases</span><span class="tag gold">${ps.done} feitas · nota ${f1(ps.nota)}</span></div>
    ${pp ? `<div class="row"><button class="btn gold" data-sheet="${pp[0]}">${ICO.arrow} Próxima: Aula ${pp[0]}</button></div>` : ""}</div>
   <div class="stack" style="gap:12px">${PROG_FASES.map(f => { const its = PROG_AULAS.filter(a => a[0] >= f.de && a[0] <= f.ate), d = its.filter(a => S.prog[a[0]] && S.prog[a[0]].done).length; return `<div><div class="row between"><b>${f.nome}</b><span class="small dim num">${d}/${its.length}</span></div><div class="bar" style="margin-top:6px"><i style="width:${Math.round(d/its.length*100)}%"></i></div></div>`; }).join("")}</div>
  </div></section>
  ${vazio ? `<section class="card row between"><div style="min-width:0;flex:1"><b>Já começou este curso?</b><p class="small muted" style="margin:4px 0 0">Pelo diário de bordo, as aulas 0 a 5 estão feitas (quizzes 5/5, 4/8, 6/7, 5/7, 4/7 e 4/8).</p></div><button class="btn gold" data-import-hist="1">Importar histórico</button></section>` : ""}
  <section class="card"><div class="row between"><h3>${ICO.sword.replace("<svg","<svg style='width:20px;height:20px;vertical-align:-4px;color:var(--red)'")} Bugs a corrigir</h3><span class="small dim mono">seus pontos fracos · +50 xp cada</span></div>
   <div class="stack" style="gap:10px;margin-top:14px">${PROG_PONTOS_FRACOS.map((p,k) => { const dead = !!S.chefes[k]; return `<button class="boss ${dead?"dead":""}" data-boss="${k}" aria-pressed="${dead}"><span class="tick" aria-checked="${dead}"></span><span class="hp"><span class="t" style="font-weight:800;display:block">${esc(p)}</span><span class="bar" style="height:7px;margin-top:8px;display:block"><i style="width:${dead?0:100}%;background:linear-gradient(90deg,#F87171,#F472B6)"></i></span></span><span class="tiny dim mono">${dead?"corrigido":"aberto"}</span></button>`; }).join("")}</div></section>
  ${PROG_FASES.map(f => `<section><div class="row between" style="margin:8px 0 10px"><h3>Fase ${esc(f.nome)}</h3></div><div class="list">${PROG_AULAS.filter(a => a[0] >= f.de && a[0] <= f.ate).map(progRow).join("")}</div></section>`).join("")}
  <p class="small dim">Datas previstas do cronograma original. Depois da Aula 50 vem a Fase 2: JSON, React, back-end e banco de dados.</p>
  </div>`;
}
function progRow([n,d,t]){ const r = S.prog[n] || {}; return `<button class="li" data-sheet="${n}"><span class="tick" aria-checked="${!!r.done}"></span><span style="min-width:0"><b style="display:block;line-height:1.3">Aula ${n} · ${esc(t)}</b><span class="tiny dim">previsto ${fmtData(d)}</span></span>${r.tot ? `<span class="grade">${f1(r.ok/r.tot*10)}</span>` : `<span class="dim">${ICO.arrow.replace("<svg","<svg style='width:18px;height:18px'")}</span>`}</button>`; }
function abrirSheet(n){
  const a = PROG_AULAS.find(z => String(z[0]) === String(n)); const r = S.prog[a[0]] || {};
  fecharModal(); const s = document.createElement("div"); s.className = "sheet";
  s.innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true"><div class="row between"><span class="tag pg">Aula ${a[0]} · previsto ${fmtData(a[1])}</span><button class="btn sm ghost" data-close aria-label="Fechar">Fechar</button></div>
   <h2 style="font-size:1.4rem">${esc(a[2])}</h2>
   <button class="check" role="checkbox" aria-checked="${!!r.done}" data-prog="${a[0]}"><span class="box"></span><span class="t">Aula concluída</span><span class="xp">+100 XP</span></button>
   <div><b class="small">Quantas questões tinha o quiz?</b><div class="chips" style="margin-top:8px">${[5,6,7,8,10,12,15].map(v => `<button class="chip" aria-pressed="${r.tot===v}" data-ptot="${a[0]}:${v}">${v}</button>`).join("")}</div></div>
   ${r.tot ? `<div><b class="small">Quantas você acertou?</b><div class="chips" style="margin-top:8px">${[...Array(r.tot+1).keys()].map(v => `<button class="chip" aria-pressed="${r.ok===v}" data-pok="${a[0]}:${v}">${v}</button>`).join("")}</div></div>` : ""}
   <div class="row"><button class="btn gold" data-copy-prog="${a[0]}">${ICO.copy} Pedir esta aula ao Claude</button></div>
   <p class="tiny dim" style="margin:0">O botão copia "Vamos estudar a Aula ${a[0]}…". Cole na conversa do Projeto.</p></div>`;
  document.body.appendChild(s);
  s.addEventListener("click", e => { if (e.target === s || e.target.closest("[data-close]")) fecharModal(); });
}

/* ===================== FACULDADE ===================== */
function viewFac(){
  const fs = facStats(), sem = S.fac.sem, ds = S.fac.discs.filter(d => (d.sem||1) === sem);
  const evs = S.fac.discs.flatMap(d => (d.entregas||[]).filter(e => !e.ok && e.data).map(e => ({...e, disc:d.nome}))).sort((a,b) => a.data.localeCompare(b.data)).slice(0,6);
  const dias = s => Math.round((new Date(s+"T12:00") - new Date(hoje()+"T12:00"))/864e5);
  return `<div class="stack fade">
  <section class="course-hero" style="--acc:linear-gradient(90deg,#F472B6,#A78BFA)"><div class="hero-grid">
   <div class="stack" style="gap:12px"><span class="eyebrow" style="color:var(--pink)">curso_03 · faculdade</span><h1>Faculdade Estácio</h1>
    <p class="muted" style="margin:0;font-size:1.05rem">Ciência da Computação. Disciplinas, notas, provas e o que estudar, tudo num lugar, para o Claude te ajudar a acompanhar.</p>
    <div class="row"><span class="tag fc">${fs.discs} disciplinas</span><span class="tag ok">${fs.ap} acima da média</span><span class="tag">média mínima ${f1(S.fac.min)}</span></div>
    <div class="row"><button class="btn gold" data-copy-fac="1">${ICO.copy} Pedir plano de estudo ao Claude</button></div></div>
   <div class="card" style="background:var(--bg2)"><div class="row between"><b>Próximas provas</b>${ICO.cal.replace("<svg","<svg style='width:18px;height:18px;color:var(--pink)'")}</div>
    ${evs.length ? evs.map(e => { const dd = dias(e.data); const [y,m,d] = e.data.split("-"); return `<div class="ev"><div class="d">${+d}<small>${MESES[+m-1]}</small></div><div style="min-width:0;flex:1"><b>${esc(e.t)}</b><div class="small muted">${esc(e.disc)}</div></div><span class="tag ${dd<=3?"bad":"fc"}">${dd<0?"atrasada":dd===0?"hoje":dd===1?"amanhã":"em "+dd+" dias"}</span></div>`; }).join("") : `<p class="small muted" style="margin:10px 0 0">Nada marcado. Adicione provas dentro de cada disciplina.</p>`}</div>
  </div></section>
  ${portalCard()}
  <section class="card stack" style="gap:14px"><div class="row between"><b>Período</b><div class="chips">${[1,2,3,4,5,6,7,8].map(k => `<button class="chip" aria-pressed="${sem===k}" data-sem="${k}">${k}º</button>`).join("")}</div></div>
   <form class="row" id="add-disc" style="align-items:flex-end"><label class="field" style="flex:1;min-width:200px">Nova disciplina do ${sem}º período<input id="disc-nome" placeholder="Algoritmos e lógica de programação" autocomplete="off"></label><button class="btn gold" type="submit">${ICO.plus} Adicionar</button></form>
   <div class="err" id="disc-err" role="alert"></div>
   ${ds.length ? "" : `<div><span class="small muted">Sugestões comuns (confira sua grade no portal do aluno):</span><div class="chips" style="margin-top:8px">${FAC_SUGESTOES.map(s => `<button class="chip" data-sug="${esc(s)}">+ ${esc(s)}</button>`).join("")}</div></div>`}</section>
  ${ds.map(discCard).join("")}
  <section class="card row between"><div style="min-width:0;flex:1"><b>Média mínima para aprovação</b><p class="small muted" style="margin:4px 0 0">Aqui a conta é a média simples das notas lançadas. A regra oficial pode ter pesos e prova substitutiva; confira no regulamento da Estácio.</p></div><div class="chips">${[5,6,7].map(v => `<button class="chip" aria-pressed="${S.fac.min===v}" data-min="${v}">${v},0</button>`).join("")}</div></section>
  </div>`;
}
function discCard(d){
  const m = media(d), st = m === null ? ["","Sem notas"] : m >= S.fac.min ? ["ok","Acima da média"] : ["bad","Abaixo da média"];
  const val = k => typeof (d.notas||{})[k] === "number" ? String(d.notas[k]).replace(".",",") : "";
  return `<section class="disc stack" style="gap:16px"><div class="row between" style="flex-wrap:nowrap"><div style="min-width:0"><h3 style="font-size:1.15rem">${esc(d.nome)}</h3><div class="row" style="gap:6px;margin-top:6px"><span class="tag ${st[0]}">${st[1]}</span>${portalDisc(d.nome) ? `<span class="tag fc">portal ${portalDisc(d.nome).progresso||0}%${portalDisc(d.nome).prova ? " · " + esc(portalDisc(d.nome).prova) : ""}</span>` : ""}</div></div>${ring(m===null?0:m/10, 70, 8, m!==null&&m>=S.fac.min?"#3BDB8C":"#FF5E6E", m===null?"–":f1(m))}</div>
   <div class="grades">${[["av1","AV1"],["av2","AV2"],["av3","AV3 / AVS"]].map(([k,l]) => `<label class="field">${l}<input inputmode="decimal" data-nota="${d.id}:${k}" value="${val(k)}" placeholder="0 a 10"></label>`).join("")}<label class="field">Frequência %<input inputmode="numeric" data-freq="${d.id}" value="${d.freq ?? ""}" placeholder="75"></label></div>
   <div class="grid2"><div><b class="small">Assuntos para estudar</b><div style="margin-top:8px">${(d.topicos||[]).map((t,k) => `<button class="check" role="checkbox" aria-checked="${!!t.ok}" data-top="${d.id}:${k}"><span class="box"></span><span class="t">${esc(t.t)}</span><span class="xp">+10</span></button>`).join("") || `<p class="small dim">Nenhum assunto ainda.</p>`}</div>
     <form class="row" data-add-top="${d.id}" style="margin-top:10px;flex-wrap:nowrap"><input class="input" placeholder="Ex.: estruturas de repetição" aria-label="Novo assunto"><button class="btn sm" type="submit" aria-label="Adicionar assunto">${ICO.plus}</button></form></div>
    <div><b class="small">Provas e entregas</b><div style="margin-top:8px">${(d.entregas||[]).map((t,k) => `<button class="check" role="checkbox" aria-checked="${!!t.ok}" data-ent="${d.id}:${k}"><span class="box"></span><span class="t">${esc(t.t)}${t.data ? ` · ${fmtData(t.data)}` : ""}</span><span class="xp">+30</span></button>`).join("") || `<p class="small dim">Nada marcado.</p>`}</div>
     <form class="row" data-add-ent="${d.id}" style="margin-top:10px"><input class="input" style="flex:1;min-width:120px" placeholder="Ex.: AV1" aria-label="Nova prova ou entrega"><input class="input" type="date" style="width:auto" aria-label="Data"><button class="btn sm" type="submit" aria-label="Adicionar prova">${ICO.plus}</button></form></div></div>
   <div class="row"><button class="btn sm" data-copy-disc="${d.id}">${ICO.copy} Pedir ajuda nesta disciplina</button><button class="btn sm ghost" data-del-disc="${d.id}">Remover</button></div></section>`;
}
function textoFac(d){
  const linha = x => { const m = media(x); const n = x.notas||{}; return `- ${x.nome}: AV1 ${n.av1 ?? "–"}, AV2 ${n.av2 ?? "–"}, AV3 ${n.av3 ?? "–"}, média ${m===null?"–":f1(m)}, frequência ${x.freq ?? "–"}%`; };
  if (d) return `Evolution Lab · Faculdade Estácio (Ciência da Computação)\n${linha(d)}\nAssuntos pendentes: ${(d.topicos||[]).filter(t=>!t.ok).map(t=>t.t).join(", ") || "nenhum"}\nPróximas provas: ${(d.entregas||[]).filter(t=>!t.ok).map(t=>t.t+(t.data?" ("+fmtData(t.data)+")":"")).join(", ") || "nenhuma"}\nMe ajuda a estudar essa disciplina com explicação curta e exercícios de múltipla escolha.`;
  return `Evolution Lab · Faculdade Estácio (Ciência da Computação)\nMinhas disciplinas:\n${S.fac.discs.map(linha).join("\n") || "(nenhuma cadastrada)"}\nPróximas provas: ${S.fac.discs.flatMap(x => (x.entregas||[]).filter(e=>!e.ok).map(e => e.t+" de "+x.nome+(e.data?" em "+fmtData(e.data):""))).join("; ") || "nenhuma"}\nMonte um plano de estudo para esta semana encaixado na minha rotina (seg a qui, 20h à meia-noite; sábado e domingo leve; sexta descanso).`;
}


/* ===================== portal Estácio (feed criptografado) ===================== */
async function garantirChaves(){
  try {
    if (!SESS || !KEY) return;
    // sempre confere a versão mais nova direto no GitHub (nunca o cache), para não gerar chave duplicada
    let c = null;
    try { const meta = await gh(`/repos/${HOST}/${REPO}/contents/cofre.json?t=${Date.now()}`); c = JSON.parse(td.decode(unb64(String(meta.content||"").replace(/\s/g,"")))); } catch(e){ return; }
    if (!c || !c.box) return;
    if (c.pub && c.privBox){ COFRE = c; lsSet("ea-cofre", c); return; }
    COFRE = c;
    const kp = await crypto.subtle.generateKey({name:"RSA-OAEP", modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:"SHA-256"}, true, ["encrypt","decrypt"]);
    const pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
    const priv = b64(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
    const novo = Object.assign({}, c, {pub:{kty:pub.kty, n:pub.n, e:pub.e, alg:"RSA-OAEP-256"}, privBox: await encJSON(KEY, {priv})});
    await putCofre(novo); COFRE = novo;
  } catch(e){}
}
async function lerFeed(){
  try {
    if (!KEY || !COFRE || COFRE === "offline" || !COFRE.privBox) return false;
    let r = await fetch("faculdade.enc.json?t=" + Date.now(), {cache:"no-store"});
    if (!r.ok) r = await fetch(`https://api.github.com/repos/${HOST}/${REPO}/contents/faculdade.enc.json`, {headers:{"Accept":"application/vnd.github.raw+json"}, cache:"no-store"});
    if (!r.ok) return false;
    const f = await r.json(); if (!f || !f.ek) return false;
    if (S.fac.portal && (S.fac.portal.at||0) >= f.at) return false;
    const {priv} = await decJSON(KEY, COFRE.privBox);
    const pk = await crypto.subtle.importKey("pkcs8", unb64(priv), {name:"RSA-OAEP", hash:"SHA-256"}, false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({name:"RSA-OAEP"}, pk, unb64(f.ek));
    const ak = await crypto.subtle.importKey("raw", raw, {name:"AES-GCM"}, false, ["decrypt"]);
    const data = JSON.parse(td.decode(await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(f.iv)}, ak, unb64(f.ct))));
    data.at = f.at;
    S.fac.portal = data;
    const per = data.periodo || 1;
    (data.disciplinas||[]).forEach(d => {
      let x = S.fac.discs.find(z => z.nome.toLowerCase() === d.nome.toLowerCase());
      if (!x){ x = {id:"d"+hash32(d.nome).toString(36), nome:d.nome, sem:per, notas:{}, freq:null, topicos:[], entregas:[], portal:true}; S.fac.discs.push(x); }
      if (d.notas) Object.entries(d.notas).forEach(([k,v]) => { if (typeof v === "number") { x.notas = x.notas || {}; x.notas[k] = v; } });
      (d.provas||[]).forEach(pv => { if (pv.data && !x.entregas.some(e => e.t === pv.nome)) x.entregas.push({t:pv.nome, data:pv.data, ok:false, portal:true}); });
    });
    S.log.unshift({t:Date.now(), d:hoje(), k:"portal", txt:"Faculdade sincronizada com o portal da Estácio", xp:0});
    persist(); return true;
  } catch(e){ return false; }
}
function portalDisc(nome){ const p = S.fac.portal; return p && (p.disciplinas||[]).find(d => d.nome.toLowerCase() === String(nome).toLowerCase()); }
function portalCard(){
  const p = S.fac.portal;
  if (!p) return `<section class="card row between"><div style="min-width:0;flex:1"><span class="k">Portal Estácio</span><p class="small muted" style="margin:6px 0 0">A sincronização automática com a sala de aula da Estácio roda todo dia às 00:00. Os dados aparecem aqui depois da primeira atualização.</p></div><span class="tag">aguardando</span></section>`;
  const dt = new Date(p.at); const R = p.requisitos || {};
  const reqs = [["disciplinas","Disciplinas"],["aac","Horas AAC"],["documentos","Documentos"]].filter(([k]) => R[k]).map(([k,l]) => { const [v,t] = R[k]; return `<div class="stat"><div class="k">${l}</div><div class="v num">${v}<small>/${t}</small></div><div class="bar" style="height:5px;margin-top:8px"><i style="width:${t?Math.round(v/t*100):0}%;background:var(--pink)"></i></div></div>`; }).join("");
  return `<section class="card stack" style="gap:14px"><div class="row between"><span class="k">Portal Estácio · ${esc(p.curso || "Ciência da Computação")}</span><span class="tag ok">sincronizado ${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
   ${reqs ? `<div class="stats3">${reqs}</div>` : ""}
   <div class="list">${(p.disciplinas||[]).map(d => `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><span style="min-width:0"><b style="display:block;font-weight:600;line-height:1.3">${esc(d.nome)}</b><span class="tiny dim mono">${esc(d.modalidade||"")}${d.prova ? " · " + esc(d.prova) : ""}</span><span class="bar" style="display:block;height:5px;margin-top:8px"><i style="width:${d.progresso||0}%;background:var(--pink)"></i></span></span><span class="grade" style="color:var(--pink)">${d.progresso||0}%</span></div>`).join("")}</div>
   ${(p.avisos||[]).length ? `<div><span class="k">Avisos</span>${p.avisos.map(v => `<div class="row" style="gap:10px;padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:nowrap"><span class="tag fc">${esc(v.tipo||"aviso")}</span><span class="small" style="min-width:0">${esc(v.texto)}</span></div>`).join("")}</div>` : ""}
   <div class="row"><button class="btn sm" data-copy-portal="1">${ICO.copy} Pedir plano de estudo com esses dados</button></div></section>`;
}

/* ===================== PERFIL ===================== */
function medalhas(){
  const cs = claudeStats(), ps = progStats(), fs = facStats(), st = streak();
  return [
   ["1ª aula","Concluir a primeira aula", cs.done+ps.done >= 1, "#22D3EE"],
   ["Em chamas","3 dias seguidos", st >= 3, "#F59E0B"],
   ["Semana de fogo","7 dias seguidos", st >= 7, "#F59E0B"],
   ["Imparável","30 dias seguidos", st >= 30, "#F472B6"],
   ["Gabarito","Acertar tudo num quiz", Object.values(S.claude).some(r => r.total && r.best === r.total), "#22D3EE"],
   ["Fundamentos","Fechar o nível 1 de Claude", nivelDone(1), "#F59E0B"],
   ["Agente","Fechar o nível 3 de Claude", nivelDone(3), "#A78BFA"],
   ["Expert em Claude","Passar na prova final", !!(S.claude.pf && pct(S.claude.pf) >= .7), "#22D3EE"],
   ["Zero bugs","Corrigir todos os pontos fracos", PROG_PONTOS_FRACOS.every((_,k) => S.chefes[k]), "#F87171"],
   ["Fase HTML","Concluir aulas 0 a 8", PROG_AULAS.filter(a => a[0] <= 8).every(a => S.prog[a[0]] && S.prog[a[0]].done), "#A78BFA"],
   ["Fase CSS","Concluir aulas 9 a 24", PROG_AULAS.filter(a => a[0] >= 9 && a[0] <= 24).every(a => S.prog[a[0]] && S.prog[a[0]].done), "#22D3EE"],
   ["BLESSAINT 1.0","Concluir a Aula 50", !!(S.prog[50] && S.prog[50].done), "#22D3EE"],
   ["Aprovado","Ficar acima da média numa disciplina", fs.ap >= 1, "#F472B6"],
   ["Missão cumprida","Completar as missões de um dia", Object.keys(S.bonus).length >= 1, "#34D399"]
  ];
}
function medalSVG(cor, on){ return `<svg class="m" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="${on?cor:"#1E2533"}" opacity="${on?.2:1}"/><circle cx="26" cy="26" r="17" fill="${on?cor:"#171D2B"}"/><path d="M26 15l3.2 6.6 7.2 1-5.2 5.1 1.2 7.2L26 31.5l-6.4 3.4 1.2-7.2-5.2-5.1 7.2-1z" fill="${on?"#0B0E14":"#3A4570"}"/></svg>`; }
function viewPerfil(){
  const lv = nivel(), cs = claudeStats(), ps = progStats(), fs = facStats(), md = medalhas();
  const sit = v => v === null ? `<span class="tag">sem nota</span>` : v >= 7 ? `<span class="tag ok">ótimo</span>` : v >= 6 ? `<span class="tag gold">na média</span>` : `<span class="tag bad">atenção</span>`;
  return `<div class="stack fade">
  <section class="course-hero"><div class="hero-grid"><div class="row" style="gap:20px;flex-wrap:nowrap">${badge(lv, 84)}<div style="min-width:0"><span class="eyebrow">lvl ${lv.n} · ${CARREIRA[carreiraIdx(lv.n)]}</span><h1 style="font-size:2rem">${esc(S.nome)}</h1><p class="muted mono small" style="margin:4px 0 0">${esc(lv.nome)} · ${lv.xp} xp · ${streak()} dias seguidos</p></div></div>
   <div><div class="bar"><i style="width:${Math.round(lv.p*100)}%"></i></div><p class="small muted" style="margin:8px 0 12px">${lv.prox ? `Faltam ${lv.prox-lv.xp} XP para ${esc(lv.proxNome)}.` : "Nível máximo."}</p><div class="row"><button class="btn gold" data-copy-bol="1">${ICO.copy} Enviar boletim ao Claude</button></div></div></div></section>
  <section class="card"><h3>Boletim</h3><div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Curso</th><th>Progresso</th><th>Nota</th><th>Situação</th></tr></thead><tbody>
   <tr><td><b>Curso de Claude</b><div class="tiny dim">${claudeTitulo()}</div></td><td class="num">${cs.done}/${cs.total}</td><td><span class="grade">${f1(cs.nota)}</span></td><td>${sit(cs.nota)}</td></tr>
   <tr><td><b>Programação</b><div class="tiny dim">BLESSAINT</div></td><td class="num">${ps.done}/${ps.total}</td><td><span class="grade">${f1(ps.nota)}</span></td><td>${sit(ps.nota)}</td></tr>
   <tr><td><b>Faculdade Estácio</b><div class="tiny dim">${fs.discs} disciplinas</div></td><td class="num">${fs.tdone}/${fs.tarefas}</td><td><span class="grade">${f1(fs.nota)}</span></td><td>${sit(fs.nota)}</td></tr>
   <tr><td><b>Geral</b></td><td></td><td><span class="grade" style="font-size:1.4rem">${f1(notaGeral())}</span></td><td></td></tr></tbody></table></div></section>
  <div class="grid2"><section class="card"><span class="k">Atributos</span>${atributos().map(([n,v,c]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${c}"></i></div><b>${v}</b></div>`).join("")}</section><section class="card"><span class="k">Histórico de estudo</span><div style="margin-top:12px">${heatmap(16)}</div></section></div>
  <section><div class="row between" style="margin-bottom:12px"><h3>Conquistas</h3><span class="tag gold">${md.filter(m => m[2]).length}/${md.length}</span></div><div class="grid3">${md.map(([t,d,on,cor]) => `<div class="medal ${on?"on":"off"}">${medalSVG(cor,on)}<div><b>${esc(t)}</b><div class="tiny muted">${esc(d)}</div></div></div>`).join("")}</div></section>
  ${S.claude.pf && pct(S.claude.pf) >= .7 ? certificado() : ""}
  <section class="card"><h3>Diário</h3>${S.log.length ? `<div style="margin-top:8px">${S.log.slice(0,20).map(l => `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:nowrap"><span style="min-width:0" class="small">${esc(l.txt||"")}</span><span class="row" style="gap:10px;flex-wrap:nowrap">${l.xp ? `<span class="tiny" style="color:${l.xp>0?"var(--gold)":"var(--bad)"};font-weight:800">${l.xp>0?"+":""}${l.xp} XP</span>` : ""}<span class="tiny dim">${fmtData(l.d)}</span></span></div>`).join("")}</div>` : `<p class="small muted" style="margin:8px 0 0">Seu diário aparece aqui conforme você estuda.</p>`}</section>
  ${ajustesHTML()}
  </div>`;
}
function ajustesHTML(){
  return `<section class="card stack" style="gap:18px" id="ajustes"><h3>Ajustes</h3>
   <form class="row" id="f-nome" style="align-items:flex-end"><label class="field" style="flex:1;min-width:180px">Seu nome<input id="nome" value="${esc(S.nome)}"></label><button class="btn" type="submit">Salvar</button></form>
   <div><b class="small">Meta diária de XP</b><div class="chips" style="margin-top:8px">${[50,100,150,200,300].map(v => `<button class="chip" aria-pressed="${S.cfg.meta===v}" data-meta="${v}">${v} XP</button>`).join("")}</div></div>
   <div class="row between"><div><b class="small">Sons e vibração</b><div class="tiny dim">Ao acertar, errar e subir de nível</div></div><button class="chip" aria-pressed="${S.cfg.som}" data-som="1">${S.cfg.som?"Ligado":"Desligado"}</button></div>
   <div class="row between"><div><b class="small">Onde fica salvo</b><div class="tiny dim sync-ind" style="display:flex;gap:8px;align-items:center">${syncHTML()}</div></div><button class="btn sm" data-sync="1">Sincronizar agora</button></div>
   <details><summary style="cursor:pointer;font-weight:800">${ICO.phone.replace("<svg","<svg style='width:18px;height:18px;vertical-align:-3px'")} Instalar como app no celular</summary><ul class="small muted" style="padding-left:1.2em"><li><b>iPhone (Safari):</b> botão Compartilhar → "Adicionar à Tela de Início".</li><li><b>Android (Chrome):</b> menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".</li><li><b>PC (Chrome/Edge):</b> ícone de instalar na barra de endereço.</li></ul></details>
   <details><summary style="cursor:pointer;font-weight:800">${ICO.lock.replace("<svg","<svg style='width:18px;height:18px;vertical-align:-3px'")} Trocar senha</summary><form id="f-senha" class="stack" style="gap:10px;margin-top:12px"><label class="field">Nova senha<input type="password" id="ns1" autocomplete="new-password" minlength="6"></label><label class="field">Repita a nova senha<input type="password" id="ns2" autocomplete="new-password"></label><div class="err" id="ns-err"></div><button class="btn" type="submit">Trocar senha</button></form></details>
   <details><summary style="cursor:pointer;font-weight:800">Atualizar token do GitHub</summary><form id="f-token" class="stack" style="gap:10px;margin-top:12px"><p class="tiny dim" style="margin:0">Use quando o token expirar. Mesmas permissões da configuração inicial.</p><label class="field">Novo token<input type="password" id="tk" autocomplete="off"></label><div class="err" id="tk-err"></div><button class="btn" type="submit">Salvar token</button></form></details>
   <details><summary style="cursor:pointer;font-weight:800">Cópia de segurança</summary><div class="stack" style="gap:10px;margin-top:12px"><button class="btn sm" data-export="1">${ICO.copy} Copiar meu progresso</button><textarea class="input" id="imp" placeholder="Cole aqui um progresso copiado (também aceita o da versão anterior)" style="min-height:90px"></textarea><div class="row"><button class="btn sm" data-import="1">Importar</button><span class="err" id="imp-err"></span></div></div></details>
   <div class="row"><button class="btn ghost" data-sair="1">${ICO.out} Sair deste aparelho</button></div></section>`;
}
function textoBoletim(){ const lv = nivel(), cs = claudeStats(), ps = progStats(), fs = facStats(); return `Evolution Lab · Boletim de ${S.nome} (${new Date().toLocaleDateString("pt-BR")})\nNível ${lv.n} · ${lv.nome} · ${lv.xp} XP · nota geral ${f1(notaGeral())} · ${streak()} dias seguidos\nCurso de Claude: ${cs.done}/${cs.total}, nota ${f1(cs.nota)}, título ${claudeTitulo()}\nProgramação: ${ps.done}/${ps.total} aulas, nota ${f1(ps.nota)}; chefões derrotados: ${Object.values(S.chefes).filter(Boolean).length}/${PROG_PONTOS_FRACOS.length}\nFaculdade: ${fs.discs} disciplinas, ${fs.ap} acima da média, nota ${f1(fs.nota)}, ${fs.tdone}/${fs.tarefas} tarefas\n${EXT_CURSOS.map(c => { const s = extStats(c); return `${c.nome} (${c.plat}): ${s.d}/${s.t} aulas`; }).join("\n")}\nViolão: ${Object.values(S.violao.treinos).reduce((a,b)=>a+b,0)} min de treino, ${S.violao.musicas.filter(m => m.st === "d").length} músicas dominadas · Biblioteca: ${S.livros.filter(l => l.status === "lido").length} livros lidos\nAnalise meu desempenho, diga meus pontos fracos e o que priorizar nesta semana.`; }

/* ===================== render ===================== */
function render(keep){
  const app = $("#app");
  if (!$(".shell", app)){ app.innerHTML = shell(); }
  const r = rota(), s = secao(r);
  $$("[data-nav]").forEach(a => a.dataset.nav === s ? a.setAttribute("aria-current","page") : a.removeAttribute("aria-current"));
  const y = scrollY;
  const v = r.startsWith("aula-") ? viewAula(r.slice(5)) : r === "claude" ? viewClaude() : r === "prog" ? viewProg() : r === "fac" ? viewFac() : r === "perfil" ? viewPerfil() : r === "cursos" ? viewCursos() : r.startsWith("curso-") ? viewCurso(r.slice(6)) : r === "violao" ? viewViolao() : r === "livros" ? viewLivros() : viewHoje();
  $("#view").innerHTML = v;
  paintTop(); $$(".sync-ind").forEach(el => el.innerHTML = syncHTML());
  if (keep) scrollTo(0, y);
  document.title = (r.startsWith("aula-") ? (CURSO_CLAUDE.find(x => x.id === r.slice(5))||{}).titulo + " · " : "") + "Evolution Lab";
}
let lastR = null;
addEventListener("hashchange", () => { if (!SESS && !LOCAL) return; const r = rota(); if (r !== lastR){ lastR = r; fecharModal(); render(); scrollTo(0,0); } });
addEventListener("scroll", () => { const b = $("#readbar"); if (!b) return; if (!rota().startsWith("aula-")){ b.style.width = "0"; return; } const h = document.documentElement.scrollHeight - innerHeight; b.style.width = (h > 0 ? Math.min(100, scrollY/h*100) : 0) + "%"; }, {passive:true});

/* ===================== MEUS CURSOS (Kiwify, Hotmart), VIOLÃO e BIBLIOTECA ===================== */
const XP_EXT_AULA = 10, XP_EXT_MOD = 30, XP_TREINO_DIA = 60, XP_ACORDE = 10, XP_MUSICA = 30, XP_LIVRO = 100;
const extC = id => EXT_CURSOS.find(c => c.id === id);
const extR = id => { S.ext[id] = S.ext[id] || {m:{}, a:{}}; S.ext[id].m = S.ext[id].m || {}; S.ext[id].a = S.ext[id].a || {}; return S.ext[id]; };
const modTot = m => m.aulas ? m.aulas.length : m.n;
function modFeitas(c, mi){ const r = (S.ext[c.id] || {}), m = c.mods[mi]; if (m.aulas) return m.aulas.filter((_,ai) => r.a && r.a[mi+":"+ai]).length; return Math.min(m.n, (r.m && r.m[mi]) || 0); }
function extStats(c){ let d = 0, t = 0, mc = 0; c.mods.forEach((m,mi) => { const f = modFeitas(c, mi), n = modTot(m); d += f; t += n; if (f >= n) mc++; }); return {d, t, p: t ? d/t : 0, mc}; }
function extProx(c){
  const r = S.ext[c.id] || {}; let best = -1, bp = 0;
  c.mods.forEach((m,mi) => { const f = modFeitas(c, mi), n = modTot(m); if (f > 0 && f < n && f/n > bp){ bp = f/n; best = mi; } });
  if (best < 0) best = c.mods.findIndex((m,mi) => modFeitas(c, mi) < modTot(m));
  if (best < 0) return null; const m = c.mods[best];
  if (m.aulas){ const ai = m.aulas.findIndex((_,k) => !(r.a && r.a[best+":"+k])); return {mi:best, ai, t:m.aulas[ai][0], m:m.t}; }
  return {mi:best, t:m.t, m:m.t};
}
const aulaURL = (c, mi, ai) => { const a = c.mods[mi].aulas && c.mods[mi].aulas[ai]; return a && a[2] ? (c.id === "arte" ? AE + a[2] : a[2]) : c.url; };
function xpExtra(){
  let x = 0;
  EXT_CURSOS.forEach(c => c.mods.forEach((m,mi) => { const f = modFeitas(c, mi); x += f * XP_EXT_AULA; if (f >= modTot(m)) x += XP_EXT_MOD; }));
  const v = S.violao; Object.values(v.treinos).forEach(min => x += Math.min(XP_TREINO_DIA, min));
  Object.values(v.acordes).forEach(s => { if (s === 2) x += XP_ACORDE; });
  v.musicas.forEach(m => { if (m.st === "d") x += XP_MUSICA; });
  S.livros.forEach(l => { if (l.status === "lido") x += XP_LIVRO; });
  return x;
}
function semearExt(){
  if (S.extSeed) return;
  act(() => {
    EXT_INICIAL.forEach(([id, mi, n]) => { const c = extC(id), r = extR(id), m = c.mods[mi]; if (m.aulas) for (let k=0; k<n; k++) r.a[mi+":"+k] = true; else r.m[mi] = n; });
    LIVROS_INICIAIS.forEach(l => { if (!S.livros.some(b => b.id === l.id)) S.livros.push(Object.assign({nota:0, pag:0, pags:0, frases:[], notas:"", add:Date.now()}, l)); });
    S.extSeed = 1;
  }, "import", "Importei o progresso da Kiwify e da Hotmart");
}
function treinoSemana(){ const seg = new Date(); seg.setDate(seg.getDate() - ((seg.getDay()+6)%7)); return [...Array(7)].map((_,i) => { const d = new Date(seg); d.setDate(seg.getDate()+i); const k = iso(d); return {k, min: S.violao.treinos[k] || 0, dow: d.getDay()}; }); }
function streakViolao(){ const t = S.violao.treinos; let c = 0; const d = new Date(); if (!t[iso(d)]) d.setDate(d.getDate()-1); for (let g=0; g<400; g++){ if (t[iso(d)]) c++; else break; d.setDate(d.getDate()-1); } return c; }
function capa(c){ return `background:linear-gradient(135deg,${c.cor[0]},#121722 75%)`; }
const PLAT_COR = {Kiwify:"#7EE787", Hotmart:"#FF8A5B", "Evolution Lab":"#A78BFA", "Estácio":"#F472B6"};
const platTag = p => `<span class="ptag" style="color:${PLAT_COR[p]||"#A3ABBD"};border-color:${PLAT_COR[p]||"#2A3245"}55">${esc(p)}</span>`;

function viewCursos(){
  const cs = claudeStats(), ps = progStats(), fs = facStats(), pc = proxClaude(), pp = proxProg();
  const ext = EXT_CURSOS.map(c => [c, extStats(c)]);
  const fora = ext.reduce((a,[,s]) => a + s.d, 0);
  const card = (href, cover, titulo, plat, linha, p, btn, gold) => `<a class="ccard" href="${href}"><div class="ccover" style="${cover}"><b>${esc(titulo)}</b></div><div class="row between">${platTag(plat)}<span class="tiny mono ${p>=1?"okc":""}">${linha}</span></div><div class="bar"><i style="width:${Math.round(p*100)}%"></i></div><span class="btn sm ${gold?"gold":""}" style="width:100%">${btn}</span></a>`;
  return `<div class="stack fade">
  <div><span class="k">Evolution Lab · todos os cursos</span><h1 style="margin-top:6px">Meus <span class="gtext">cursos</span></h1><p class="muted" style="margin-top:4px">Tudo num lugar só. Marque aqui o que você assistiu lá e ganhe XP no seu cargo.</p></div>
  <div class="stats3" style="max-width:560px"><div class="stat"><div class="k">cursos</div><div class="v num">${3 + EXT_CURSOS.length}</div></div><div class="stat"><div class="k">plataformas</div><div class="v num">4<small>→1</small></div></div><div class="stat"><div class="k">aulas lá fora</div><div class="v num" style="color:var(--amber)">${fora}</div></div></div>
  <div class="cgrid">
   ${card("#claude", "background:linear-gradient(135deg,#3A2F66,#121722 75%)", "Claude do zero ao avançado", "Evolution Lab", `${cs.done}/${cs.total}`, cs.p, pc ? `Continuar · ${esc(nomeItem(pc))}` : "Ver certificado")}
   ${card("#prog", "background:linear-gradient(135deg,#1B3550,#121722 75%)", "Programação · Site BLESSAINT", "Evolution Lab", `${ps.done}/${ps.total}`, ps.p, pp ? `Continuar · Aula ${pp[0]}` : "Concluído")}
   ${card("#fac", "background:linear-gradient(135deg,#4A1E38,#121722 75%)", "Estácio · Ciência da Computação", "Estácio", `${fs.discs} disc.`, fs.p, "Ver disciplinas")}
   ${ext.map(([c,s]) => { const px = extProx(c); return card(`#curso-${c.id}`, capa(c), c.nome, c.plat, s.p >= 1 ? "concluído" : `${s.d}/${s.t} aulas`, s.p, px ? `Próxima: ${esc(px.t)}` : "Revisar", !!px && s.d > 0); }).join("")}
  </div>
  <div class="grid2"><a class="card linkcard" href="#violao"><span class="ico2">${ICO.music}</span><span><b>Violão</b><span class="tiny dim" style="display:block">Treino da semana, acordes e repertório</span></span>${ICO.arrow}</a>
   <a class="card linkcard" href="#livros"><span class="ico2">${ICO.book}</span><span><b>Biblioteca</b><span class="tiny dim" style="display:block">${S.livros.length} ${S.livros.length===1?"livro":"livros"} na estante</span></span>${ICO.arrow}</a></div>
  </div>`;
}

function viewCurso(id){
  const c = extC(id); if (!c) return viewCursos();
  const s = extStats(c), px = extProx(c), r = S.ext[c.id] || {a:{}, m:{}};
  const pxURL = px ? aulaURL(c, px.mi, px.ai) : c.url;
  const mods = c.mods.map((m, mi) => {
    const f = modFeitas(c, mi), n = modTot(m), done = f >= n, cur = px && px.mi === mi;
    const corpo = m.aulas
      ? m.aulas.map((a, ai) => { const on = !!(r.a && r.a[mi+":"+ai]), nx = cur && px.ai === ai; return `<div class="les ${nx?"nx":""}"><button class="tick" role="checkbox" aria-checked="${on}" aria-label="Marcar ${esc(a[0])}" data-exta="${c.id}:${mi}:${ai}"></button><span class="t"><b>${esc(a[0])}</b><span class="tiny ${nx?"vio":"dim"}">${nx ? "próxima" : ""}${nx && a[1] ? " · " : ""}${a[1] ? a[1] + " min" : ""}</span></span><a class="open" href="${esc(aulaURL(c, mi, ai))}" target="_blank" rel="noopener">Abrir ↗</a></div>`; }).join("")
      : `<div class="les"><div class="cnt"><button class="btn sm" data-extm="${c.id}:${mi}:-1" aria-label="Menos uma aula">−</button><span class="mono num">${f}<small class="dim">/${n}</small></span><button class="btn sm" data-extm="${c.id}:${mi}:1" aria-label="Mais uma aula">+</button></div><span class="t tiny dim">aulas assistidas neste módulo</span>${done ? `<button class="btn sm ghost" data-extm="${c.id}:${mi}:0">zerar</button>` : `<button class="btn sm" data-extm="${c.id}:${mi}:all">Concluir módulo</button>`}</div><div class="les"><span class="t tiny dim">A lista de aulas fica na ${esc(c.plat)}.</span><a class="open" href="${esc(c.url)}" target="_blank" rel="noopener">Abrir curso ↗</a></div>`;
    const ok2 = c.id+":"+mi, aberto = OPEN_MODS.has(ok2) || (cur && !FECHADOS.has(ok2));
    return `<details class="mod ${done?"done":cur?"cur":""}" data-mod="${ok2}" ${aberto?"open":""}><summary><span class="mn">${done ? ICO.check : f ? Math.round(f/n*100) + "%" : "·"}</span><span style="flex:1;min-width:0"><b style="display:block;line-height:1.3">${esc(m.t)}</b><span class="tiny dim">${n} ${n===1?"aula":"aulas"}</span>${f && !done ? `<div class="bar" style="margin-top:8px;max-width:240px;height:5px"><i style="width:${Math.round(f/n*100)}%"></i></div>` : ""}</span><span class="mono small ${done?"okc":"dim"}">${f}/${n}</span></summary>${corpo}</details>`;
  }).join("");
  return `<div class="stack fade">
  <a class="back" href="#cursos">${ICO.back} Meus cursos</a>
  <div class="chero">
   <section class="card" style="${capa(c)}">${platTag(c.plat)}<h1 style="margin:12px 0 6px">${esc(c.nome)}</h1><p class="muted">${esc(c.sub)} · ${c.mods.length} módulos, ${s.t} aulas.</p>
    <div class="row" style="margin-top:14px">${px ? `<a class="btn gold" href="${esc(pxURL)}" target="_blank" rel="noopener">▶ Continuar: ${esc(px.t)}</a>` : `<span class="tag ok">curso concluído</span>`}<a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Abrir na ${esc(c.plat)} ↗</a></div></section>
   <section class="card row" style="gap:18px;flex-wrap:nowrap">${ring(s.p, 104, 10, "#22D3EE", Math.round(s.p*100) + "%")}<div><span class="k">Progresso</span><div class="mono" style="font-size:1.25rem;font-weight:700">${s.d} / ${s.t} aulas</div><div class="small muted">${s.mc} módulos completos · atributo <b style="color:${c.cor[1]}">${esc(c.attr)}</b></div><div class="tiny dim" style="margin-top:6px">Aula +${XP_EXT_AULA} xp · módulo completo +${XP_EXT_MOD} xp</div></div></section>
  </div>
  <div>${mods}</div>
  <p class="tiny dim">Assistiu lá? Marque aqui. O vídeo e o material continuam na ${esc(c.plat)}; aqui fica o seu progresso.</p>
  </div>`;
}

const OPEN_MODS = new Set(), FECHADOS = new Set();
document.addEventListener("toggle", e => { const k = e.target.dataset && e.target.dataset.mod; if (!k) return; if (e.target.open){ OPEN_MODS.add(k); FECHADOS.delete(k); } else { OPEN_MODS.delete(k); FECHADOS.add(k); } }, true);
let MUS_ADD = false;
function viewViolao(){
  const v = S.violao, sem = treinoSemana(), tot = sem.reduce((a,d) => a + d.min, 0), meta = v.meta || 120, mx = Math.max(30, ...sem.map(d => d.min));
  const NOMES = ["dom","seg","ter","qua","qui","sex","sáb"], hj = v.treinos[hoje()] || 0, st = streakViolao();
  const va = extC("violao"), vs = extStats(va), vp = extProx(va);
  const mvs = va.mods.map((m,mi) => [m, mi, modFeitas(va, mi)]).filter(([m,mi,f]) => f < modTot(m) && (!vp || mi >= vp.mi)).slice(0,3);
  const STN = {q:["quero tocar","q"], a:["aprendendo","a"], d:["domino","d"]};
  return `<div class="stack fade">
  <div><span class="k">Prática · Violão Academy + Louvor Simplificado</span><h1 style="margin-top:6px">Violão</h1></div>
  <div class="chero">
   <section class="card"><div class="row between"><h2>Treino da semana</h2><span class="mono" style="color:var(--amber)">${st} ${st===1?"dia":"dias"} seguidos</span></div>
    <div class="vweek">${sem.map(d => `<div title="${fmtData(d.k)}: ${d.min} min"><i style="height:${d.min ? Math.max(8, Math.round(d.min/mx*72)) : 0}px"></i><span class="${d.k===hoje()?"today":""}">${NOMES[d.dow]}</span></div>`).join("")}</div>
    <div class="row between" style="margin-top:12px"><span class="small muted"><b class="mono" style="color:var(--text)">${tot} min</b> de ${meta} min na semana · hoje ${hj} min</span></div>
    <div class="row" style="margin-top:10px;gap:8px"><span class="tiny dim">Registrar treino de hoje:</span>${[10,20,30,45].map(n => `<button class="btn sm" data-treino="${n}">+${n} min</button>`).join("")}${hj ? `<button class="btn sm ghost" data-treino="0">desfazer hoje</button>` : ""}</div>
    <div class="tiny dim" style="margin-top:8px">1 xp por minuto, até ${XP_TREINO_DIA} xp por dia.</div></section>
   <section class="card"><h2 style="margin-bottom:12px">Acordes</h2><div class="chords">${ACORDES.map(a => { const s2 = v.acordes[a] || 0; return `<button class="cd s${s2}" data-acorde="${esc(a)}" aria-label="${esc(a)}: ${["ainda não","treinando","domino"][s2]}">${esc(a)}</button>`; }).join("")}</div>
    <p class="tiny dim" style="margin-top:12px">Toque para mudar: <span style="color:var(--dim)">●</span> ainda não → <span style="color:var(--amber)">●</span> treinando → <span style="color:var(--green)">●</span> domino (+${XP_ACORDE} xp)</p></section>
  </div>
  <section class="card"><div class="row between"><div>${platTag("Hotmart")}<h2 style="margin-top:8px">Violão Academy</h2></div><span class="mono">${vs.d}/${vs.t} · ${Math.round(vs.p*100)}%</span></div>
   <div class="bar" style="margin:12px 0 4px"><i style="width:${Math.round(vs.p*100)}%"></i></div>
   ${mvs.map(([m,mi,f]) => `<div class="song"><span class="st ${f?"a":"q"}">${Math.round(f/modTot(m)*100)}%</span><span style="flex:1;min-width:0"><b>${esc(m.t)}</b><span class="tiny dim" style="display:block">${f}/${modTot(m)} aulas${vp && vp.mi === mi ? " · você parou aqui" : ""}</span></span><button class="btn sm" data-extm="violao:${mi}:1">+1 aula</button></div>`).join("")}
   <div class="row" style="margin-top:10px"><a class="btn sm" href="#curso-violao">Ver os ${va.mods.length} módulos</a><a class="btn sm" href="${esc(va.url)}" target="_blank" rel="noopener">Abrir na Hotmart ↗</a></div></section>
  <section class="card"><div class="row between" style="margin-bottom:6px"><h2>Repertório</h2><button class="btn sm" data-musadd>${ICO.plus} Música</button></div>
   ${MUS_ADD ? `<form id="f-mus" class="row" style="gap:8px;margin:8px 0 12px"><input id="mus-nome" class="input" placeholder="Nome da música" maxlength="60" style="flex:2;min-width:160px" required><select id="mus-fonte" class="input" style="flex:1;min-width:150px">${["Violão Academy","100 louvores sem pestana","+200 louvores","LS Vol. 3","Outra"].map(o => `<option>${o}</option>`).join("")}</select><button class="btn sm gold">Adicionar</button></form>` : ""}
   ${v.musicas.length ? v.musicas.map((m,i) => `<div class="song"><button class="st ${STN[m.st][1]}" data-musst="${i}" aria-label="Mudar status">${STN[m.st][0]}</button><span style="flex:1;min-width:0"><b>${esc(m.nome)}</b><span class="tiny dim" style="display:block">${esc(m.fonte)} · ${m.tr||0} ${m.tr===1?"treino":"treinos"}</span></span><button class="btn sm" data-mustr="${i}">+1 treino</button><button class="btn sm ghost" data-musdel="${i}" aria-label="Remover">✕</button></div>`).join("") : `<p class="muted small" style="margin:8px 0 0">Nenhuma música ainda. Adicione as que você está tirando: aqui fica o nome e o progresso, a cifra continua na apostila.</p>`}
   <div class="row" style="margin-top:12px;gap:8px">${["ls1","ls3"].map(k => { const c = extC(k); return `<a class="btn sm" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.nome.replace("Louvor Simplificado","LS"))} ↗</a>`; }).join("")}</div>
   <div class="tiny dim" style="margin-top:8px">Toque no status para mudar: quero tocar → aprendendo → domino (+${XP_MUSICA} xp).</div></section>
  </div>`;
}

let BIBF = "todos", BOOK_ADD = false;
const BST = {lendo:"lendo", lido:"lido", quero:"quero ler"};
function capaLivro(l, big){ return `<div class="bc ${big?"big":""}" style="background:linear-gradient(160deg,${l.cor || "#3A2F66"},#121722)"><small>${esc((l.tema || "livro").toUpperCase())}</small><b>${esc(l.titulo)}</b><small>${esc(l.autor || "")}</small></div>`; }
function viewLivros(){
  const ano = String(new Date().getFullYear());
  const lidosAno = S.livros.filter(l => l.status === "lido" && (l.fim || "").startsWith(ano)).length, lendo = S.livros.filter(l => l.status === "lendo").length, favs = S.livros.filter(l => l.fav).length;
  const lista = S.livros.filter(l => BIBF === "todos" ? true : BIBF === "fav" ? l.fav : l.status === BIBF);
  const ord = {lendo:0, quero:1, lido:2};
  lista.sort((a,b) => (ord[a.status]-ord[b.status]) || (b.add||0)-(a.add||0));
  return `<div class="stack fade">
  <div><span class="k">Leituras · o que forma a sua cabeça</span><h1 style="margin-top:6px">Biblioteca</h1><p class="muted" style="margin-top:4px">Livros que você leu, está lendo e quer ler. Com nota, anotações e as frases que marcaram.</p></div>
  <div class="stats3" style="max-width:560px"><div class="stat"><div class="k">lidos em ${ano}</div><div class="v num">${lidosAno}</div></div><div class="stat"><div class="k">lendo</div><div class="v num">${lendo}</div></div><div class="stat"><div class="k">favoritos</div><div class="v num">${favs}</div></div></div>
  <div class="row between"><div class="seg">${[["todos","Todos"],["lendo","Lendo"],["lido","Lidos"],["quero","Quero ler"],["fav","Favoritos ★"]].map(([k,t]) => `<button data-bibf="${k}" aria-pressed="${BIBF===k}">${t}</button>`).join("")}</div><button class="btn sm gold" data-bookadd>${ICO.plus} Livro</button></div>
  ${BOOK_ADD ? `<form id="f-book" class="card row" style="gap:8px"><input id="bk-t" class="input" placeholder="Título" maxlength="80" required style="flex:2;min-width:180px"><input id="bk-a" class="input" placeholder="Autor" maxlength="60" style="flex:1;min-width:140px"><select id="bk-s" class="input" style="flex:1;min-width:120px"><option value="lendo">Lendo</option><option value="lido">Já li</option><option value="quero">Quero ler</option></select><button class="btn sm gold">Pôr na estante</button></form>` : ""}
  <div class="shelf">${lista.map(l => `<button class="book" data-book="${esc(l.id)}">${capaLivro(l)}${l.status === "lendo" && l.pags ? `<div class="bar" style="height:4px"><i style="width:${Math.round(l.pag/l.pags*100)}%"></i></div>` : ""}<span class="tiny ${l.status==="lido"?"okc":"dim"}">${BST[l.status]}${l.nota ? ` · <span style="color:var(--amber)">${"★".repeat(l.nota)}</span>` : ""}${l.fav ? " · favorito" : ""}</span></button>`).join("")}
   <button class="book add" data-bookadd><span>${ICO.plus}<br>Adicionar livro</span></button></div>
  </div>`;
}
function abrirLivro(id){
  const l = S.livros.find(b => b.id === id); if (!l) return;
  fecharModal(); const s = document.createElement("div"); s.className = "sheet";
  s.innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true" aria-label="${esc(l.titulo)}">
   <div class="row" style="gap:16px;align-items:flex-start;flex-wrap:nowrap">${capaLivro(l, true)}<div style="min-width:0;flex:1"><h2>${esc(l.titulo)}</h2><div class="small muted">${esc(l.autor||"")}${l.tema ? " · " + esc(l.tema) : ""}</div>${l.origem ? `<div class="tiny dim" style="margin-top:4px">${esc(l.origem)}</div>` : ""}
    <div class="stars5" style="margin-top:10px">${[1,2,3,4,5].map(n => `<button data-bnota="${esc(l.id)}:${n}" aria-label="${n} estrelas" class="${n<=l.nota?"on":""}">★</button>`).join("")}</div></div></div>
   <div class="seg">${Object.entries(BST).map(([k,t]) => `<button data-bst="${esc(l.id)}:${k}" aria-pressed="${l.status===k}">${t}</button>`).join("")}<button data-bfav="${esc(l.id)}" aria-pressed="${!!l.fav}">★ favorito</button></div>
   <div class="row" style="gap:8px"><label class="tiny dim">Página <input class="input" type="number" min="0" inputmode="numeric" style="width:90px" value="${l.pag||""}" data-bpag="${esc(l.id)}"></label><label class="tiny dim">de <input class="input" type="number" min="0" inputmode="numeric" style="width:90px" value="${l.pags||""}" data-bpags="${esc(l.id)}"></label>${l.status==="lido" ? `<span class="tiny okc">terminado ${l.fim ? fmtData(l.fim) : ""} · +${XP_LIVRO} xp</span>` : ""}</div>
   <div><span class="k">Frases que marcaram</span>${(l.frases||[]).map((f,i) => `<div class="note row between" style="flex-wrap:nowrap"><span>“${esc(f)}”</span><button class="btn sm ghost" data-bfdel="${esc(l.id)}:${i}" aria-label="Apagar frase">✕</button></div>`).join("")}
    <form class="row" data-bfrase="${esc(l.id)}" style="gap:8px;margin-top:8px"><input class="input" placeholder="Escreva uma frase do livro com as suas palavras" maxlength="280" style="flex:1;min-width:0"><button class="btn sm">Salvar</button></form></div>
   <div><span class="k">Minhas anotações</span><textarea class="input" rows="4" data-bnotas="${esc(l.id)}" placeholder="O que eu aprendi e o que vou aplicar" style="width:100%;margin-top:8px">${esc(l.notas||"")}</textarea></div>
   <div class="row between">${l.url ? `<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">Abrir o livro ↗</a>` : "<span></span>"}<div class="row" style="gap:8px"><button class="btn sm ghost" data-bdel="${esc(l.id)}">Remover</button><button class="btn sm gold" data-close>Fechar</button></div></div>
  </div>`;
  document.body.appendChild(s);
  s.addEventListener("click", e => { if (e.target === s || e.target.closest("[data-close]")){ fecharModal(); render(true); } });
}

document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || !SESS && !LOCAL) return; const d = t.dataset;
  if (d.exta){ const [id, mi, ai] = d.exta.split(":"); const c = extC(id), k = mi+":"+ai; let on; act(() => { const r = extR(id); r.a[k] = !r.a[k]; if (!r.a[k]) delete r.a[k]; on = !!r.a[k]; }, "ext", null, e); if (on) S.log[0] && (S.log[0].txt = `${c.nome} · ${c.mods[+mi].aulas[+ai][0]}`); render(true); return; }
  if (d.extm){ const [id, mi, op] = d.extm.split(":"); const c = extC(id), m = c.mods[+mi], f = modFeitas(c, +mi); const nv = op === "all" ? m.n : op === "0" ? 0 : Math.max(0, Math.min(m.n, f + (+op)));
    act(() => { extR(id).m[mi] = nv; }, "ext", nv > f ? `${c.nome} · ${m.t} (${nv}/${m.n})` : null, e); render(true); return; }
  if (d.treino !== undefined){ const n = +d.treino, h = hoje(); act(() => { const tr = S.violao.treinos; if (!n) delete tr[h]; else tr[h] = (tr[h]||0) + n; }, "violao", n ? `Violão · treino de ${n} min` : null, e); render(true); return; }
  if (d.acorde){ const a = d.acorde; act(() => { S.violao.acordes[a] = ((S.violao.acordes[a]||0) + 1) % 3; }, "violao", (S.violao.acordes[a]||0) === 1 ? `Violão · dominei o acorde ${a}` : null, e); render(true); return; }
  if (d.musadd !== undefined){ MUS_ADD = !MUS_ADD; render(true); if (MUS_ADD){ const i = $("#mus-nome"); i && i.focus(); } return; }
  if (d.musst !== undefined){ const m = S.violao.musicas[+d.musst], nx = {q:"a", a:"d", d:"q"}[m.st]; act(() => { m.st = nx; }, "violao", nx === "d" ? `Violão · ${m.nome} dominada` : null, e); render(true); return; }
  if (d.mustr !== undefined){ const m = S.violao.musicas[+d.mustr]; m.tr = (m.tr||0) + 1; if (m.st === "q") m.st = "a"; persist(); render(true); toast(`${m.nome}: ${m.tr} ${m.tr===1?"treino":"treinos"}`); return; }
  if (d.musdel !== undefined){ if (t.dataset.confirm !== "1"){ t.dataset.confirm = "1"; t.textContent = "remover?"; return; } act(() => { S.violao.musicas.splice(+d.musdel, 1); }, "violao", null); render(true); return; }
  if (d.bibf){ BIBF = d.bibf; render(true); return; }
  if (d.bookadd !== undefined){ BOOK_ADD = !BOOK_ADD; render(true); if (BOOK_ADD){ const i = $("#bk-t"); i && i.focus(); } return; }
  if (d.book) return abrirLivro(d.book);
  const L = id => S.livros.find(b => b.id === id);
  if (d.bnota){ const [id, n] = d.bnota.split(":"); const l = L(id); l.nota = l.nota === +n ? 0 : +n; persist(); abrirLivro(id); return; }
  if (d.bst){ const [id, st] = d.bst.split(":"); const l = L(id); act(() => { l.status = st; if (st === "lido"){ l.fim = l.fim || hoje(); if (l.pags) l.pag = l.pags; } else delete l.fim; }, "livro", st === "lido" ? `Biblioteca · terminei ${l.titulo}` : null, e); abrirLivro(id); return; }
  if (d.bfav){ const l = L(d.bfav); l.fav = !l.fav; persist(); abrirLivro(l.id); return; }
  if (d.bfdel){ const [id, i] = d.bfdel.split(":"); L(id).frases.splice(+i, 1); persist(); abrirLivro(id); return; }
  if (d.bdel){ if (t.dataset.confirm !== "1"){ t.dataset.confirm = "1"; t.textContent = "Toque de novo para remover"; return; } act(() => { S.livros = S.livros.filter(b => b.id !== d.bdel); }, "livro", null); fecharModal(); render(true); return; }
});
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.id === "f-mus"){ e.preventDefault(); const nome = $("#mus-nome").value.trim(); if (!nome) return; S.violao.musicas.unshift({nome: nome.slice(0,60), fonte: $("#mus-fonte").value, st:"a", tr:0}); MUS_ADD = false; persist(); render(true); return; }
  if (f.id === "f-book"){ e.preventDefault(); const tt = $("#bk-t").value.trim(); if (!tt) return; const st = $("#bk-s").value, cores = ["#3A2F66","#1B3550","#4A1E38","#5B3A12","#14324A","#1F3A2A"];
    act(() => S.livros.push({id:"b"+Date.now().toString(36), titulo:tt.slice(0,80), autor:$("#bk-a").value.trim().slice(0,60), status:st, nota:0, pag:0, pags:0, frases:[], notas:"", add:Date.now(), fim: st === "lido" ? hoje() : undefined, cor:cores[S.livros.length % cores.length]}), "livro", `Biblioteca · ${tt}`, e); BOOK_ADD = false; render(true); return; }
  if (f.dataset.bfrase){ e.preventDefault(); const i = f.querySelector("input"), v = i.value.trim(); if (!v) return; const l = S.livros.find(b => b.id === f.dataset.bfrase); l.frases = l.frases || []; l.frases.push(v.slice(0,280)); persist(); abrirLivro(l.id); return; }
}, true);
document.addEventListener("change", e => {
  const t = e.target, d = t.dataset; const L = id => S.livros.find(b => b.id === id);
  if (d.bpag){ const l = L(d.bpag); l.pag = Math.max(0, parseInt(t.value,10) || 0); if (l.pags && l.pag > l.pags) l.pag = l.pags; if (l.status === "quero" && l.pag) l.status = "lendo"; persist(); return; }
  if (d.bpags){ const l = L(d.bpags); l.pags = Math.max(0, parseInt(t.value,10) || 0); persist(); return; }
  if (d.bnotas){ const l = L(d.bnotas); l.notas = t.value.slice(0, 4000); persist(); return; }
});

/* ===================== eventos ===================== */
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || !SESS && !LOCAL) return; const d = t.dataset;
  if (d.intro) return introModal();
  if (d.qstart){ QZ[d.qstart] = {i:0, pick:null, checked:false, res:[], combo:0, maxCombo:0}; repintarQuiz(d.qstart); $("#quiz").scrollIntoView({block:"start", behavior:"smooth"}); return; }
  if (d.opt){ const [id, oi] = d.opt.split(":"); const q = QZ[id]; if (!q || q.checked) return; q.pick = +oi; $$(".opt", $("#quizbox")).forEach(o => o.setAttribute("aria-checked", String(o === t))); const er = $("#qerr"); if (er) er.textContent = ""; return; }
  if (d.qcheck){ const id = d.qcheck, q = QZ[id], x = CURSO_CLAUDE.find(z => z.id === id); if (q.pick === null){ $("#qerr").textContent = "Marque uma opção primeiro."; return; }
    q.checked = true; const ok = q.pick === x.quiz[q.i][2]; q.res[q.i] = ok; q.combo = ok ? q.combo + 1 : 0; q.maxCombo = Math.max(q.maxCombo, q.combo); som(ok ? "ok" : "bad"); repintarQuiz(id); return; }
  if (d.qnext){ const id = d.qnext, q = QZ[id], x = CURSO_CLAUDE.find(z => z.id === id);
    if (q.i + 1 < x.quiz.length){ q.i++; q.pick = null; q.checked = false; repintarQuiz(id); return; }
    const right = q.res.filter(Boolean).length, n = x.quiz.length, wrong = q.res.map((v,k) => v ? null : k+1).filter(Boolean);
    const prev = S.claude[id], jaFeito = !!(prev && prev.done);
    q.gain = act(() => { const r = S.claude[id] || {}; S.claude[id] = Object.assign(r, {done:true, best:Math.max(r.best||0, right), last:right, total:n, wrong, at:Date.now()}); }, jaFeito ? "retry" : "claude", `${nomeItem(x)}: quiz ${right}/${n}`, e);
    q.fim = true; repintarQuiz(id); $("#quiz").scrollIntoView({block:"start", behavior:"smooth"}); if (right/n >= .7) { confetti(); som("done"); } return; }
  if (d.mis){ const [id,k] = d.mis.split(":"); const x = CURSO_CLAUDE.find(z => z.id === id); let on;
    act(() => { const a = S.missoes[id] = (S.missoes[id] || []).slice(); a[+k] = !a[+k]; on = a[+k]; }, "claude", null, e);
    t.setAttribute("aria-checked", String(on)); if (on){ S.log[0] && !S.log[0].txt && (S.log[0].txt = `Missão: ${x.missao[+k]}`); } return; }
  if (d.copyAula) return copiar(textoAula(d.copyAula));
  if (d.duvida){ const x = CURSO_CLAUDE.find(z => z.id === d.duvida); return copiar(`Evolution Lab · Curso de Claude · ${nomeItem(x)}: ${x.titulo}\nTenho uma dúvida sobre esta aula: `); }
  if (d.sheet !== undefined) return abrirSheet(d.sheet);
  if (d.prog !== undefined){ const n = d.prog; let on; act(() => { const r = S.prog[n] = Object.assign({}, S.prog[n]); r.done = !r.done; on = r.done; }, "prog", null, e); if (on) S.log[0].txt = `Programação · Aula ${n} concluída`; abrirSheet(n); render(true); return; }
  if (d.ptot){ const [n,v] = d.ptot.split(":"); act(() => { const r = S.prog[n] = Object.assign({}, S.prog[n]); r.tot = +v; if (r.ok === undefined || r.ok > r.tot) r.ok = undefined; }, "prog", null); abrirSheet(n); return; }
  if (d.pok){ const [n,v] = d.pok.split(":"); act(() => { const r = S.prog[n] = Object.assign({}, S.prog[n]); r.ok = +v; r.done = true; }, "prog", `Programação · quiz da Aula ${n}: ${v}/${(S.prog[n]||{}).tot}`, e); abrirSheet(n); render(true); return; }
  if (d.copyProg !== undefined){ const a = PROG_AULAS.find(z => String(z[0]) === String(d.copyProg)); return copiar(`Vamos estudar a Aula ${a[0]} do curso de programação: ${a[2]}`); }
  if (d.importHist){ act(() => { Object.entries(PROG_HISTORICO).forEach(([n,[ok,tot]]) => { S.prog[n] = {done:true, ok, tot}; }); }, "import", "Importei o histórico das aulas 0 a 5", e); render(true); return; }
  if (d.boss !== undefined){ const k = d.boss; act(() => { S.chefes[k] = !S.chefes[k]; }, "prog", S.chefes[k] ? null : `Bug corrigido: ${PROG_PONTOS_FRACOS[k]}`, e); render(true); return; }
  if (d.sem){ S.fac.sem = +d.sem; persist(); render(true); return; }
  if (d.min){ act(() => { S.fac.min = +d.min; }, "fac", null); render(true); return; }
  if (d.sug) return addDisc(d.sug);
  if (d.top){ const [id,k] = d.top.split(":"); const disc = S.fac.discs.find(x => x.id === id); let it; act(() => { it = disc.topicos[+k]; it.ok = !it.ok; }, "fac", null, e); if (it.ok) S.log[0].txt = `Faculdade · estudei ${it.t}`; t.setAttribute("aria-checked", String(it.ok)); return; }
  if (d.ent){ const [id,k] = d.ent.split(":"); const disc = S.fac.discs.find(x => x.id === id); act(() => { const it = disc.entregas[+k]; it.ok = !it.ok; }, "fac", `Faculdade · ${disc.entregas[+k].t} (${disc.nome})`, e); render(true); return; }
  if (d.delDisc){ if (t.dataset.confirm !== "1"){ t.dataset.confirm = "1"; t.textContent = "Toque de novo para remover"; return; } const disc = S.fac.discs.find(x => x.id === d.delDisc); act(() => { S.fac.discs = S.fac.discs.filter(x => x.id !== d.delDisc); }, "fac", `Removi ${disc.nome}`); render(true); return; }
  if (d.copyDisc) return copiar(textoFac(S.fac.discs.find(x => x.id === d.copyDisc)));
  if (d.copyFac) return copiar(textoFac());
  if (d.copyPortal){ const p = S.fac.portal || {}; return copiar(`Evolution Lab · Portal Estácio (sincronizado ${new Date(p.at).toLocaleString("pt-BR")})\n${(p.disciplinas||[]).map(x => `- ${x.nome}: ${x.progresso||0}% · ${x.prova||""}`).join("\n")}\nRequisitos: ${Object.entries(p.requisitos||{}).map(([k,[v,t]]) => `${k} ${v}/${t}`).join(", ")}\nMonte um plano de estudo desta semana para essas disciplinas, encaixado na minha rotina (seg a qui 20h-00h, fim de semana leve, sexta descanso).`); }
  if (d.copyBol) return copiar(textoBoletim());
  if (d.meta){ S.cfg.meta = +d.meta; persist(); render(true); return; }
  if (d.som){ S.cfg.som = !S.cfg.som; persist(); render(true); if (S.cfg.som) som("ok"); return; }
  if (d.sync){ setSync("busy"); pull().then(ch => { if (dirty) push(); if (ch) render(true); toast(sync === "ok" ? "Sincronizado." : "Não consegui sincronizar agora."); }); return; }
  if (d.export) return copiar(JSON.stringify(S));
  if (d.import){ const v = $("#imp").value.trim(); try { const o = JSON.parse(v); if (!o || !o.v) throw 0; S = norm(o); persist(); render(); toast("Progresso importado."); } catch(x){ $("#imp-err").textContent = "Não reconheci esse texto."; } return; }
  if (d.sair){ lsDel("ea-sess"); lsDel("ea-state"); location.hash = ""; location.reload(); return; }
});
function addDisc(nome){
  nome = (nome||"").trim(); const er = $("#disc-err");
  if (!nome){ er.textContent = "Digite o nome da disciplina."; return; }
  if (S.fac.discs.some(x => x.nome.toLowerCase() === nome.toLowerCase() && (x.sem||1) === S.fac.sem)){ er.textContent = "Essa disciplina já está neste período."; return; }
  act(() => S.fac.discs.push({id:"d"+Date.now().toString(36), nome, sem:S.fac.sem, notas:{}, freq:null, topicos:[], entregas:[]}), "fac", `Faculdade · adicionei ${nome}`); render(true);
}
document.addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target;
  if (f.id === "login-form") return doLogin();
  if (f.id === "setup-form") return doSetup();
  if (f.id === "add-disc") return addDisc($("#disc-nome").value);
  if (f.id === "f-nome"){ const v = $("#nome").value.trim(); if (v){ S.nome = v.slice(0,40); persist(); render(true); toast("Nome salvo."); } return; }
  if (f.dataset.addTop){ const v = f.querySelector("input").value.trim(); if (!v) return; S.fac.discs.find(x => x.id === f.dataset.addTop).topicos.push({t:v, ok:false}); persist(); render(true); return; }
  if (f.dataset.addEnt){ const [a,b] = f.querySelectorAll("input"); const v = a.value.trim(); if (!v) return; S.fac.discs.find(x => x.id === f.dataset.addEnt).entregas.push({t:v, data:b.value || null, ok:false}); persist(); render(true); return; }
  if (f.id === "f-senha"){ const a = $("#ns1").value, b = $("#ns2").value, er = $("#ns-err");
    if (a.length < 6){ er.textContent = "Use pelo menos 6 caracteres."; return; } if (a !== b){ er.textContent = "As senhas não são iguais."; return; }
    try { er.textContent = ""; toast("Trocando a senha…"); const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 250000; const k = await deriveKey(a, salt, iter);
      const cofre = {v:1, salt:b64(salt), iter, user:SESS.user, box: await encJSON(k, {token:SESS.token, gist:SESS.gist})}; await putCofre(cofre); KEY = k; COFRE = cofre; dirty = true; await push(); saveSess(); f.reset(); toast("Senha trocada."); }
    catch(x){ er.textContent = "Não consegui trocar agora. Verifique a internet e o token."; } return; }
  if (f.id === "f-token"){ const tk = $("#tk").value.trim(), er = $("#tk-err");
    try { await gh("/user", {}, tk); await gh(`/gists/${SESS.gist}`, {}, tk); const cofre = Object.assign({}, COFRE, {box: await encJSON(KEY, {token:tk, gist:SESS.gist})}); await putCofre(cofre, tk); SESS.token = tk; COFRE = cofre; saveSess(); f.reset(); toast("Token atualizado."); }
    catch(x){ er.textContent = "Token recusado. Confira as permissões (Gists e Contents de leitura e escrita)."; } return; }
});
document.addEventListener("change", e => {
  const t = e.target, d = t.dataset;
  if (d.nota){ const [id,k] = d.nota.split(":"); const disc = S.fac.discs.find(x => x.id === id); const raw = t.value.trim().replace(",",".");
    if (raw !== ""){ const v = parseFloat(raw); if (isNaN(v) || v < 0 || v > 10){ t.value = ""; toast("A nota vai de 0 a 10."); return; } }
    act(() => { disc.notas = disc.notas || {}; if (raw === "") delete disc.notas[k]; else disc.notas[k] = Math.round(parseFloat(raw)*10)/10; }, "fac", raw ? `Faculdade · ${k.toUpperCase()} de ${disc.nome}: ${raw.replace(".",",")}` : null); render(true); return; }
  if (d.freq){ const disc = S.fac.discs.find(x => x.id === d.freq); const v = parseInt(t.value,10); disc.freq = isNaN(v) ? null : Math.max(0, Math.min(100, v)); persist(); }
});

/* ===================== login e configuração ===================== */
let LOCAL = false;
function saveSess(){ if (!SESS) return; if (SESS.lembrar === false) return; exportKey(KEY).then(k => lsSet("ea-sess", {token:SESS.token, gist:SESS.gist, user:SESS.user, key:k})); }
function starfield(){
  const c = $("#stars"); if (!c) return; const ctx = c.getContext("2d"); const st = Array.from({length:140}, () => ({x:Math.random(), y:Math.random(), r:Math.random()*1.6+.2, s:Math.random()*.02+.004, p:Math.random()*6}));
  let run = true; const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  (function tick(t){ if (!document.body.contains(c)) return; c.width = innerWidth; c.height = innerHeight; ctx.clearRect(0,0,c.width,c.height);
    st.forEach(s => { const a = .35 + .65*Math.abs(Math.sin(s.p + (t||0)*s.s/10)); ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x*c.width, s.y*c.height, s.r, 0, 7); ctx.fill(); });
    if (!still) requestAnimationFrame(tick); })(0);
}
function telaLogin(cofre){
  const sd = saudacao();
  $("#app").innerHTML = `<div class="login"><canvas id="stars"></canvas><form class="login-box" id="login-form" autocomplete="on">
   ${CREST_BIG}<div style="text-align:center"><span class="eyebrow">${sd.oi}</span><h1 style="margin-top:6px">Evolution <span class="gtext">Lab</span></h1><div class="eyebrow" style="margin-top:6px">conhecimento em blocos</div><p class="muted" style="margin:8px 0 0">Digite sua senha para continuar de onde parou.</p></div>
   <input type="text" name="username" value="${esc(cofre && cofre.user || HOST)}" autocomplete="username" hidden>
   <label class="field">Senha<input type="password" id="pw" autocomplete="current-password" required autofocus></label>
   <label class="row small" style="gap:10px;cursor:pointer"><input type="checkbox" id="lembrar" checked style="width:20px;height:20px;accent-color:#22D3EE"> Manter conectado neste aparelho</label>
   <div class="err" id="lerr" role="alert"></div>
   <button class="btn gold" type="submit" id="lbtn">${ICO.lock} Entrar</button>
   ${cofre === "offline" ? `<p class="small muted" style="text-align:center">Sem internet e sem login salvo neste aparelho. Conecte-se para entrar.</p>` : ""}
  </form></div>`;
  starfield();
}
async function doLogin(){
  const pw = $("#pw").value, er = $("#lerr"), btn = $("#lbtn"); if (!COFRE || COFRE === "offline"){ er.textContent = "Sem conexão para buscar seu cofre."; return; }
  btn.disabled = true; btn.textContent = "Abrindo o cofre…"; er.textContent = "";
  try {
    const k = await deriveKey(pw, unb64(COFRE.salt), COFRE.iter || 250000);
    const sec = await decJSON(k, COFRE.box);
    KEY = k; SESS = {token:sec.token, gist:sec.gist, user:COFRE.user, lembrar:$("#lembrar").checked};
    if (SESS.lembrar) saveSess();
    await entrar(true);
  } catch(x){ btn.disabled = false; btn.innerHTML = `${ICO.lock} Entrar`; er.textContent = "Senha incorreta. Tente de novo."; som("bad"); }
}
function telaSetup(){
  const url = "https://github.com/settings/personal-access-tokens/new";
  $("#app").innerHTML = `<div class="login"><canvas id="stars"></canvas><form class="login-box" id="setup-form" style="max-width:560px">
   ${CREST_BIG}<div style="text-align:center"><span class="eyebrow">Primeiro acesso</span><h1 style="margin-top:6px;font-size:clamp(1.7rem,6vw,2.4rem)">Vamos criar seu cofre</h1><p class="muted" style="margin:8px 0 0">É uma vez só. Depois, de qualquer aparelho, você entra só com a senha.</p></div>
   <section class="card stack" style="gap:12px"><b>1. Crie sua senha</b><label class="field">Senha (mínimo 6 caracteres)<input type="password" id="s1" autocomplete="new-password" required></label><label class="field">Repita a senha<input type="password" id="s2" autocomplete="new-password" required></label></section>
   <section class="card stack" style="gap:12px"><b>2. Cole a chave de salvamento do GitHub</b>
    <ol class="steps"><li><span>Abra <a href="${url}" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</span></li><li><span>Nome: <code>evolution-lab</code>. Validade: 1 ano.</span></li><li><span>Repository access: <b>Only select repositories</b> → <code>${esc(REPO)}</code>.</span></li><li><span>Permissions → Repository: <b>Contents: Read and write</b>. Account: <b>Gists: Read and write</b>.</span></li><li><span>Clique em Generate token, copie e cole aqui.</span></li></ol>
    <label class="field">Token<input type="password" id="tok" autocomplete="off" placeholder="github_pat_…" required></label>
    <p class="tiny dim" style="margin:0">O token fica guardado criptografado com a sua senha. Sem a senha, ninguém consegue usá-lo.</p></section>
   <div class="err" id="serr" role="alert"></div><button class="btn gold" type="submit" id="sbtn">Criar meu cofre e entrar</button></form></div>`;
  starfield();
}
async function doSetup(){
  const a = $("#s1").value, b = $("#s2").value, tok = $("#tok").value.trim(), er = $("#serr"), btn = $("#sbtn");
  if (a.length < 6) return er.textContent = "A senha precisa de pelo menos 6 caracteres.";
  if (a !== b) return er.textContent = "As senhas não são iguais.";
  if (!/^(github_pat_|ghp_)/.test(tok)) return er.textContent = "Isso não parece um token do GitHub (começa com github_pat_).";
  btn.disabled = true; er.textContent = "";
  try {
    btn.textContent = "Conferindo o token…"; const u = await gh("/user", {}, tok);
    btn.textContent = "Criando o cofre…"; const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 250000; const k = await deriveKey(a, salt, iter);
    S.updatedAt = Date.now();
    const g = await gh("/gists", {method:"POST", body:JSON.stringify({description:"Evolution Lab · progresso (criptografado)", public:false, files:{"progresso.json":{content:JSON.stringify({v:1, at:S.updatedAt, box: await encJSON(k, S)})}}})}, tok);
    const cofre = {v:1, salt:b64(salt), iter, user:u.login, box: await encJSON(k, {token:tok, gist:g.id})};
    btn.textContent = "Guardando no GitHub…"; await putCofre(cofre, tok);
    COFRE = cofre; KEY = k; SESS = {token:tok, gist:g.id, user:u.login, lembrar:true}; saveSess();
    await entrar(false);
    modal(`<span class="tag ok">cofre criado</span><h2>Tudo pronto</h2><p class="muted">Agora é só abrir este endereço em qualquer aparelho e entrar com a sua senha. O GitHub leva cerca de 1 minuto para publicar o cofre.</p><button class="btn gold" data-close>Começar a estudar</button>`, true);
  } catch(x){
    btn.disabled = false; btn.textContent = "Criar meu cofre e entrar";
    er.textContent = x.status === 401 ? "Token inválido. Gere de novo e cole." : (x.status === 403 || x.status === 404) ? `Token sem permissão. Confira: acesso ao repositório ${REPO}, Contents e Gists com leitura e escrita.` : "Não consegui falar com o GitHub. Verifique a internet.";
  }
}
async function entrar(fazerPull){
  LOCAL = true; lastR = rota(); render();
  if (fazerPull){ setSync("busy"); const ch = await pull(); if (ch) render(true); }
  else setSync("ok");
  if (!S.extSeed){ semearExt(); render(true); }
  await garantirChaves(); if (await lerFeed()) render(true);
}

/* ===================== início ===================== */
(async function boot(){
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  $("#app").innerHTML = `<div class="login"><div style="text-align:center">${crestSVG().replace('class="crest"','class="crest" style="width:64px;height:80px"')}<p class="muted">Abrindo a escola…</p></div></div>`;
  const sess = lsGet("ea-sess");
  const cofreP = fetchCofre();
  if (sess && sess.key){
    try { KEY = await importKey(sess.key); SESS = Object.assign({lembrar:true}, sess); COFRE = lsGet("ea-cofre"); await entrar(true); cofreP.then(c => { if (c && c !== "offline") COFRE = c; }); return; } catch(e){ lsDel("ea-sess"); }
  }
  COFRE = await cofreP;
  if (COFRE === null) telaSetup(); else telaLogin(COFRE);
})();
})();
