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
function blank(){ return {v:1, nome:"Arnold", updatedAt:0, claude:{}, missoes:{}, prog:{}, chefes:{}, fac:{min:6, sem:1, discs:[]}, log:[], bonus:{}, cfg:{meta:100, som:true, fala:true}, ext:{}, violao:{treinos:{}, acordes:{}, musicas:[], meta:120}, livros:[], desafios:{}}; }
function norm(o){ const b = blank(); const s = Object.assign(b, o||{}); s.fac = Object.assign(blank().fac, s.fac||{}); s.fac.discs = s.fac.discs||[]; s.log = s.log||[]; s.bonus = s.bonus||{}; s.chefes = s.chefes||{}; s.cfg = Object.assign(blank().cfg, s.cfg||{}); s.ext = s.ext||{}; s.violao = Object.assign(blank().violao, s.violao||{}); s.livros = s.livros||[]; s.desafios = s.desafios||{}; delete s.pin; return s; }
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
  else pull().then(async ch => { const f = await lerFeed(), g = await lerFeedCursos(); if (ch || f || g) render(true); });
});

/* ===================== cálculos ===================== */
const AULAS = CURSO_CLAUDE.filter(x => !x.tipo);
const numAula = id => AULAS.findIndex(a => a.id === id) + 1;
const nomeItem = x => x.tipo ? x.titulo : `Aula ${numAula(x.id)}`;
const pct = r => r && r.total ? r.best / r.total : 0;
const estrelas = r => !r || !r.done ? 0 : pct(r) >= .9 ? 3 : pct(r) >= .7 ? 2 : 1;
function nivelDone(n){ return CURSO_CLAUDE.filter(x => x.nivel === n && x.tipo !== "prova").every(x => S.claude[x.id] && S.claude[x.id].done); }
function claudeTitulo(){ if (S.claude.pf && pct(S.claude.pf) >= .7) return "Expert em Claude"; const t = ["Iniciante","Usuário","Usuário avançado","Agente","Construtor","Especialista","Estrategista"]; let k = 0; for (let n=1;n<=6;n++){ if (nivelDone(n)) k = n; else break; } return t[k]; }
function claudeStats(){ let done = 0, ps = []; CURSO_CLAUDE.forEach(x => { const r = S.claude[x.id]; if (r && r.done){ done++; if (r.total) ps.push(pct(r)); } }); return {done, total:CURSO_CLAUDE.length, p:done/CURSO_CLAUDE.length, nota: ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length*10 : null}; }
function progStats(){ let done = 0, ps = []; PROG_AULAS.forEach(([n]) => { const r = S.prog[n]; if (r && r.done){ done++; if (r.tot) ps.push(r.ok/r.tot); } }); return {done, total:PROG_AULAS.length, p:done/PROG_AULAS.length, nota: ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length*10 : null}; }
function media(d){ const v = ["av1","av2","av3"].map(k => d.notas && d.notas[k]).filter(x => typeof x === "number"); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
function facStats(){ let ap = 0, ns = [], t = 0, td2 = 0; S.fac.discs.forEach(d => { const m = media(d); if (m !== null){ ns.push(m); if (m >= S.fac.min) ap++; } (d.topicos||[]).concat(d.entregas||[]).forEach(x => { t++; if (x.ok) td2++; }); }); return {discs:S.fac.discs.length, ap, nota: ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : null, tarefas:t, tdone:td2, p: t ? td2/t : 0}; }
function xpLegacy(){
  let x = 0;
  CURSO_CLAUDE.forEach(it => { const r = S.claude[it.id]; if (r && r.done){ const b = it.tipo === "prova" ? [300,200] : it.tipo === "rev" ? [150,100] : [100,50]; x += b[0] + Math.round(b[1]*pct(r)); } });
  Object.values(S.missoes).forEach(a => (a||[]).forEach(v => { if (v) x += 20; }));
  PROG_AULAS.forEach(([n]) => { const r = S.prog[n]; if (r && r.done){ x += 100; if (r.tot) x += Math.round(50*r.ok/r.tot); } });
  Object.values(S.chefes).forEach(v => { if (v) x += 50; });
  S.fac.discs.forEach(d => { const m = media(d); if (m !== null && m >= S.fac.min) x += 200; (d.topicos||[]).forEach(t => { if (t.ok) x += 10; }); (d.entregas||[]).forEach(t => { if (t.ok) x += 30; }); });
  x += Object.keys(S.bonus).length * 50;
  x += xpExtra() + xpDesafios(true);
  return x;
}
const RANKS = EvoProgress.ranks;
const CARREIRA = ["Formação","Júnior","Pleno","Sênior","Especialista"];
const carreiraIdx = n => n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : n === 7 ? 3 : 4;
const RANK_COR = ["#6E7891","#22D3EE","#22D3EE","#34D399","#A78BFA","#A78BFA","#F59E0B","#F472B6","#F472B6"];
function nivel(v){ const lv = EvoProgress.level(v ?? xpTotal(), S.practice||[]); lv.cor = RANK_COR[lv.n-1]; return lv; }
function weekKey(){ const d = new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return iso(d); }
function scoreSnapshot(){
  const out = {};
  CURSO_CLAUDE.forEach(it => { const r=S.claude[it.id]; if (!r || !r.done) return;
    if (it.tipo === "rev") out["review:"+it.id] = 10;
    else { out["claude:"+it.id+":lesson"]=20; out["claude:"+it.id+":quiz"]=Math.round(30*pct(r)); }
  });
  PROG_AULAS.forEach(([id])=>{const r=S.prog[id]; if(!r || !r.done)return; out["prog:"+id+":lesson"]=20; out["prog:"+id+":quiz"]=r.tot ? Math.round(30*Math.min(1,Math.max(0,(r.ok||0)/r.tot))) : 0;});
  EXT_CURSOS.forEach(c=>c.mods.forEach((m,mi)=>{if(!modCar(c,mi))return;out["ext:"+c.id+":"+mi]=modFeitas(c,mi)*20;}));
  S.fac.discs.forEach(d=>{const key="fac:"+d.id+":"; const m=media(d); if(d.aprovada && m!==null && m>=S.fac.min)out[key+"approval"]=200;
    (d.topicos||[]).forEach((t,i)=>{if(t.ok)out[key+"topic:"+i]=10;});
    (d.entregas||[]).forEach((t,i)=>{if(t.ok)out[key+"delivery:"+i]=50;});
  });
  Object.entries(S.desafios||{}).forEach(([k,r])=>{if(dCarreira(k) && r && r.done)out["arena:"+k]=Math.round(30*dPct(r));});
  Object.keys(S.bonus).forEach(k=>out["daily:"+k]=10);
  Object.keys(S.reviews||{}).forEach(k=>out["weekly:"+k]=10);
  EvoProgress.evidence(S.practice||[]).forEach(e=>out["practice:"+EvoProgress.safeURL(e.url)]=e.type==="project"?150:50);
  return out;
}
function ensureXP(){
  if (S.xpLedger && S.xpLedger.version===2) return false;
  const baseline=scoreSnapshot();S.fac.discs.forEach(d=>{const m=media(d);if(m!==null && m>=S.fac.min)baseline["fac:"+d.id+":approval"]=200;});
  S.xpLedger=EvoProgress.create(xpLegacy(),baseline,Date.now());
  S.xpLedger.previousRanks=Object.assign({},S.ranks||{});
  return true;
}
function xpTotal(){ensureXP();return EvoProgress.total(S.xpLedger);}
function pendingPromotion(lv){return lv.prox && lv.pending.length ? (lv.xp>=lv.prox ? "Projeto pendente para promoção: " : "Próxima promoção exige: ")+lv.pending.join(", ") : "";}

function notaGeral(){ const ns = [claudeStats().nota, progStats().nota, facStats().nota].filter(x => x !== null); return ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : null; }
function xpDia(d){ return S.log.filter(l => l.d === d).reduce((a,l) => a + (l.xp||0), 0); }
function diasAtivos(){ const m = {}; S.log.forEach(l => { if ((l.xp||0) > 0) m[l.d] = (m[l.d]||0) + l.xp; }); return m; }
function streak(){
  const at = diasAtivos(); let c = 0; const d = new Date();
  if (!at[iso(d)]) d.setDate(d.getDate()-1);
  for (let guard = 0; guard < 400; guard++){ const k = iso(d); if (at[k]) c++; else if (d.getDay() !== 5) break; d.setDate(d.getDate()-1); }
  return c;
}
function contaHoje(kinds){ const h = hoje(); return S.log.filter(l => l.d === h && kinds.includes(l.k) && ((l.xp||0) > 0 || l.k === "retry" || l.k === "desafio")).length; }
function feitoQ(q){ return (q.n||1) > 1 ? contaHoje(q.k) >= q.n : feitoHoje(q.k); }
function feitoHoje(kinds){ const h = hoje(); return S.log.some(l => l.d === h && kinds.includes(l.k) && ((l.xp||0) > 0 || l.k === "retry" || l.k === "desafio")); }
const proxClaude = () => CURSO_CLAUDE.find(x => !(S.claude[x.id] && S.claude[x.id].done));
const proxProg = () => PROG_AULAS.find(([n]) => !(S.prog[n] && S.prog[n].done));
function piorAula(){ const feitas = CURSO_CLAUDE.filter(x => !x.tipo && S.claude[x.id] && S.claude[x.id].done); if (!feitas.length) return null; return feitas.slice().sort((a,b) => pct(S.claude[a.id]) - pct(S.claude[b.id]) || (S.claude[a.id].at||0) - (S.claude[b.id].at||0))[0]; }
function missoesDia(){
  const dow = new Date().getDay(), pc = proxClaude(), pp = proxProg(), pa = piorAula();
  const fac = S.fac.discs.flatMap(d => (d.topicos||[]).filter(t => !t.ok).map(t => ({d, t})))[0];
  const list = [], dd = S.desafios["dia:" + hoje()];
  if (dow === 5) return {rest:true, list:[{k:["claude","prog","fac","retry","desafio"], ic:"star", t:"Missão livre (opcional)", s:"Hoje é dia de descanso. Se bater vontade, o Desafio do dia vale.", href:"#desafio-dia", xp:"até 30"}]};
  if (feitoHoje(["claude"])) list.push({k:["claude"], ic:"ia", t:"Curso de Claude", s:"Aula de hoje concluída", href:"#claude", xp:"até 50"});
  else if (pc) list.push({k:["claude"], ic:"ia", t:`Curso de Claude: ${nomeItem(pc)}`, s:pc.titulo, href:`#aula-${pc.id}`, xp:"até 50"});
  if (dow >= 1 && dow <= 4 && feitoHoje(["prog"])) list.push({k:["prog"], ic:"code", t:"Programação", s:"Aula de hoje concluída", href:"#prog", xp:"até 50"});
  else if (dow >= 1 && dow <= 4 && pp) list.push({k:["prog"], ic:"code", t:`Programação: Aula ${pp[0]}`, s:pp[2], href:`#prog-${pp[0]}`, xp:"até 50"});
  const cDone = contaHoje(["claude"]), pDone = contaHoje(["prog"]);
  const pcs = CURSO_CLAUDE.filter(x => !(S.claude[x.id] && S.claude[x.id].done)), pps = PROG_AULAS.filter(([n]) => !(S.prog[n] && S.prog[n].done));
  const c2 = cDone >= 2 ? null : (cDone === 1 ? pcs[0] : pcs[1]), p2 = pDone >= 2 ? null : (pDone === 1 ? pps[0] : pps[1]);
  if (cDone >= 2) list.push({k:["claude"], n:2, ic:"ia", t:"Claude: aula extra", s:"Segunda aula concluída", href:"#claude", xp:"até 50"});
  else if (c2) list.push({k:["claude"], n:2, ic:"ia", t:`Claude: aula extra · ${nomeItem(c2)}`, s:c2.titulo, href:`#aula-${c2.id}`, xp:"até 50"});
  if (dow >= 1 && dow <= 4) { if (pDone >= 2) list.push({k:["prog"], n:2, ic:"code", t:"Programação: aula extra", s:"Segunda aula concluída", href:"#prog", xp:"até 50"}); else if (p2) list.push({k:["prog"], n:2, ic:"code", t:`Programação: aula extra ${p2[0]}`, s:p2[2], href:`#prog-${p2[0]}`, xp:"até 50"}); }
  if (feitoHoje(["fac"])) list.push({k:["fac"], ic:"fac", t:"Faculdade · Ciência da Computação", s:"Atividade de hoje concluída", href:"#fac", xp:"+10"});
  else if (fac) list.push({k:["fac"], ic:"fac", t:`Faculdade: ${fac.t.t}`, s:fac.d.nome, href:"#fac", xp:"+10"});
  else {
    const entrega = S.fac.discs.flatMap(d => (d.entregas||[]).filter(t => !t.ok).map(t => ({d, t}))).sort((a,b) => (a.t.data||"9999").localeCompare(b.t.data||"9999"))[0];
    list.push({k:["fac"], ic:"fac", t:entrega ? `Faculdade: ${entrega.t.t}` : "Faculdade · Ciência da Computação", s:entrega ? entrega.d.nome : "Estude a disciplina do dia e registre um tópico ou atividade na Faculdade", href:"#fac", xp:entrega ? "+50" : "+10"});
  }
  list.push({k:["desafio"], ic:"sword", t:"Desafio do dia", s: dd && dd.done ? `Feito: ${dd.best}/${dd.total}` : "6 perguntas sorteadas da sua carreira", href:"#desafio-dia", xp:"até 30"});
  if (pa) list.push({k:["retry"], ic:"bolt", t:"Revisão relâmpago", s:`Refaça o quiz de ${nomeItem(pa)}: ${pa.titulo}`, href:`#aula-${pa.id}-quiz`, xp:"+XP"});
  return {rest:false, list:list.slice(0, 7)};
}
function missoesCompletas(){ const m = missoesDia(); return m.list.length && m.list.every(q => feitoQ(q)); }


function rngProg(a,b){ let t = 0, d = 0; for (let i=a;i<=b;i++){ t++; if (S.prog[i] && S.prog[i].done) d++; } return t ? d/t : 0; }
function atributos(){
  const fs = facStats();
  const fe = (rngProg(0,24)*25 + rngProg(40,50)*11) / 36;
  const cl = CURSO_CLAUDE.reduce((s,x) => { const r = S.claude[x.id]; return s + (r && r.done ? .6 + .4*pct(r) : 0); }, 0) / CURSO_CLAUDE.length;
  const logica = Math.min(1, rngProg(29,39)*.7 + (fs.tarefas ? fs.tdone/fs.tarefas : 0)*.3);
  const fac = fs.discs ? fs.p*.6 + (fs.ap/fs.discs)*.4 : 0;
  const cr = extC("criadores"); let cd = 0, ct = 0; cr.car.forEach(mi => { cd += modFeitas(cr, mi); ct += modTot(cr.mods[mi]); });
  const design = ct ? cd/ct : 0;
  return [["Lógica",logica,"#22D3EE"],["Front-end",fe,"#A78BFA"],["IA / Claude",cl,"#F59E0B"],["Git",rngProg(25,28),"#34D399"],["Faculdade",fac,"#F472B6"],["Design",design,"#FBBF24"]].map(([n,v,c]) => [n, Math.round(v*100), c]);
}
const TREE = [{id:"HTML",a:0,b:8,x:40,y:75},{id:"CSS",a:9,b:24,x:180,y:75},{id:"Git",a:25,b:26,x:310,y:36},{id:"JS",a:29,b:39,x:310,y:114},{id:"GitHub",a:27,b:28,x:440,y:36},{id:"DOM",a:40,b:45,x:440,y:114},{id:"v1.0",a:46,b:50,x:560,y:75}];
const TREE_E = [["HTML","CSS"],["CSS","Git"],["CSS","JS"],["Git","GitHub"],["JS","DOM"],["GitHub","v1.0"],["DOM","v1.0"]];
function progHref(t){ const a = PROG_AULAS.find(z => z[0] >= t.a && z[0] <= t.b && !(S.prog[z[0]] && S.prog[z[0]].done)); return "#prog-" + (a ? a[0] : t.a); }
function arvore(){
  const N = {}; TREE.forEach(t => N[t.id] = Object.assign({p:rngProg(t.a,t.b)}, t));
  const prox = TREE.find(t => N[t.id].p < 1);
  let svg = `<svg class="tree tree-wide" viewBox="0 0 600 150" role="img" aria-label="Árvore de tecnologias">`;
  TREE_E.forEach(([s,d]) => { const A = N[s], B = N[d], on = A.p === 1; svg += `<path d="M${A.x} ${A.y}L${B.x} ${B.y}" style="stroke:${on?"#22D3EE":"#232B3B"}" stroke-width="2.5"/>`; });
  TREE.forEach(t => { const n = N[t.id], r = t.id.length > 4 ? 26 : 24, c = 2*Math.PI*r; svg += `<a href="${progHref(t)}">`;
    if (n.p === 1) svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:#22D3EE"/><text x="${t.x}" y="${t.y+4}" text-anchor="middle" style="fill:#04161A;font-weight:600">${t.id}</text>`;
    else { const front = prox && prox.id === t.id;
      svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:#0E131C;stroke:${front?"#7C5CFF":"#2E3748"}" stroke-width="2" ${front?'stroke-dasharray="4 4"':""}/>`;
      if (n.p > 0) svg += `<circle cx="${t.x}" cy="${t.y}" r="${r}" style="fill:none;stroke:#22D3EE" stroke-width="3" stroke-dasharray="${c*n.p} ${c}" transform="rotate(-90 ${t.x} ${t.y})"/>`;
      svg += `<text x="${t.x}" y="${t.y+4}" text-anchor="middle" style="fill:${n.p>0||front?"#E6E8EE":"#5A6377"}">${t.id}</text>`; } svg += `</a>`; });
  svg += `</svg>`;
  let txt = "Árvore completa. Você publicou a BLESSAINT 1.0.";
  if (prox){ const aula = PROG_AULAS.find(z => z[0] >= prox.a && z[0] <= prox.b && !(S.prog[z[0]] && S.prog[z[0]].done)); txt = `Próximo destravamento: <b style="color:var(--text)">${prox.id}</b> · faltam ${PROG_AULAS.filter(z => z[0] >= prox.a && z[0] <= prox.b && !(S.prog[z[0]] && S.prog[z[0]].done)).length} aulas (próxima: Aula ${aula[0]})`; }
  return {svg, txt};
}

/* ===================== ação com XP ===================== */
function act(fn, k, txt, ev, reviewId){
  const before = xpTotal(), lvB = nivel(before).n, hb0 = xpHobby();
  EvoProgress.reconcile(S.xpLedger, scoreSnapshot(), true);
  fn();
  if (k === "retry"){
    const id = reviewId;
    if (id && CURSO_CLAUDE.some(x=>x.id===id && !x.tipo)){S.reviews=S.reviews||{};S.reviews[id+":"+weekKey()]=true;}
  }
  EvoProgress.reconcile(S.xpLedger, scoreSnapshot(), k === "import");
  let delta = xpTotal() - before; const hd = xpHobby() - hb0;
  S.log.unshift({t:Date.now(), d:hoje(), k, txt:txt||"Atividade atualizada", xp:k === "import" ? 0 : delta, scoreVersion:2}); S.log=S.log.slice(0,400);
  let bonusAgora = false;
  if (k !== "import" && (delta > 0 || k === "retry") && !S.bonus[hoje()] && missoesCompletas()){ S.bonus[hoje()] = true; EvoProgress.reconcile(S.xpLedger, scoreSnapshot(), false); S.log.unshift({t:Date.now(), d:hoje(), k:"bonus", txt:"Missões do dia completas", xp:10,scoreVersion:2}); bonusAgora = true; }
  registrarRank();
  persist();
  const total = xpTotal(), lvA = nivel(total);
  if (delta > 0){ floatXP("+" + delta + " XP", ev); som("xp"); }
  else if (hd > 0){ floatXP("+" + hd + " hobby", ev); som("ok"); if (S.log[0] && S.log[0].t > Date.now() - 2000) S.log[0].hb = hd; }
  if (lvA.n > lvB) setTimeout(() => levelUp(lvA), 500);
  else if (bonusAgora) setTimeout(() => { lionEvento("bonus"); modal(`<span class="tag gold">quests de hoje · 100%</span><h2>Todas as quests concluídas</h2><p class="muted">Bônus de constância: <b class="mono" style="color:var(--cyan)">+10 xp</b>.</p><button class="btn gold" data-close>Continuar</button>`, true); }, 450);
  paintTop();
  setTimeout(() => checarPresentes(true), 50);
  return delta;
}

/* ===================== efeitos ===================== */
let actx = null;
function som(tipo){
  if (!S.cfg.som) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume().catch(() => {});
    const notas = {ok:[660,880], bad:[220,180], xp:[880,1320], up:[523,659,784,1047], done:[523,784,1047]}[tipo] || [600];
    notas.forEach((f,i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f; const t0 = actx.currentTime + i*0.09; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(tipo === "bad" ? 0.04 : 0.07, t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0+0.22); o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0+0.25); });
  } catch(e){}
  try { if (navigator.vibrate) navigator.vibrate(tipo === "bad" ? [40,40,40] : 25); } catch(e){}
}
function respostaQuiz(ok){
  som(ok ? "ok" : "bad");
  if (window.EvoFeedback) window.EvoFeedback.respond(ok,{sound:S.cfg.som,voice:S.cfg.fala!==false});
}
function fraseResposta(ok){return `<span class="answer-phrase">${ok ? "Acertou, miseraviii!!" : "Erroou! Aí cê me quebra!"}</span>`;}
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
function lionEvento(kind, x){ try { document.dispatchEvent(new CustomEvent("evolab:milestone", {detail:{kind, x}})); } catch(e){} }
function levelUp(lv){ lionEvento("levelup", lv.nome); som("up"); modal(`${badge(lv, 96)}<span class="eyebrow">Promoção · lvl ${lv.n}</span><h2 style="font-size:1.8rem">Agora você é <span class="gtext">${esc(lv.nome)}</span></h2><p class="muted">${lv.prox ? `Próximo cargo: ${esc(lv.proxNome)} com ${lv.prox} xp.` : "Topo da carreira: Principal."}</p><button class="btn gold" data-close>Continuar</button>`, true); }
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
  traj: I('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  gift: I('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
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
  pen: I('<path d="M12 19l7-7 3 3-7 7z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>'),
  pencil: I('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="M15 5l4 4"/>'),
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


/* ===================== central de sites ===================== */

const PROSPECT_STAGES = {pedido:"Aguardando pedido detalhado",iniciativa:"Preparar proposta por iniciativa própria",apresentado:"Proposta apresentada · aguardando retorno"};
function prospectos(){ return Array.isArray(S.prospectos) ? S.prospectos : []; }
function prospectForm(id){
 const p=prospectos().find(x=>x.id===id)||{};
 modal(`<h2>${p.id?"Editar cliente":"Novo cliente em prospecção"}</h2><form id="f-prospect" data-id="${esc(p.id||"")}" class="stack">
 <label>Cliente ou empresa<input class="input" name="nome" required maxlength="100" value="${esc(p.nome||"")}" placeholder="Nome do cliente"></label>
 <label>Situação<select class="input" name="etapa">${Object.entries(PROSPECT_STAGES).map(([k,v])=>`<option value="${k}" ${(p.etapa||"pedido")===k?"selected":""}>${v}</option>`).join("")}</select></label>
 <label>Oportunidade<textarea class="input" name="ideia" maxlength="2000" rows="3" placeholder="O que conversaram ou o que você quer criar">${esc(p.ideia||"")}</textarea></label>
 <label>Próxima ação<input class="input" name="acao" maxlength="300" value="${esc(p.acao||"")}" placeholder="Ex.: pedir detalhes ou preparar uma prévia"></label>
 <label>Prazo (opcional)<input class="input" type="date" name="prazo" value="${esc(p.prazo||"")}"></label>
 <label>Link da prévia ou site (opcional)<input class="input" type="url" name="url" value="${esc(p.url||"")}" placeholder="https://..."></label>
 <div class="row"><button class="btn gold" type="submit">Salvar cliente</button><button class="btn" type="button" data-close>Cancelar</button></div></form>`);
}
function prospectSection(){
 const all=prospectos(),active=all.filter(p=>!p.arquivado),archived=all.filter(p=>p.arquivado);
 const cards=items=>items.map(p=>`<article class="card site-card"><div><span class="tag gold">${esc(PROSPECT_STAGES[p.etapa]||PROSPECT_STAGES.pedido)}</span><h2>${esc(p.nome)}</h2><p class="small muted" style="white-space:pre-wrap">${esc(p.ideia||"Oportunidade ainda sem detalhes.")}</p></div><div class="small"><b>Próxima ação</b><p>${esc(p.acao||"Definir próximo passo")}</p>${p.prazo?`<p class="${!p.arquivado&&p.prazo<hoje()?"tag gold":"muted"}">Prazo: ${esc(fmtData(p.prazo))}</p>`:""}</div><div class="site-actions"><button class="btn sm" data-prospect-edit="${esc(p.id)}">Editar</button><button class="btn sm" data-prospect-archive="${esc(p.id)}">${p.arquivado?"Reativar":"Arquivar"}</button>${/^https?:\/\//i.test(p.url||"")?`<a class="btn sm" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir prévia ↗</a>`:""}</div></article>`).join("");
 return `<details class="card site-section" open><summary>Prospectando <span class="tiny muted">${active.length} ${active.length===1?"oportunidade":"oportunidades"}</span></summary><div style="padding:0 18px 18px" class="stack"><p class="small muted">Clientes com quem você já conversou: aguardando um pedido detalhado ou uma proposta que você vai preparar para apresentar e vender.</p><div><button class="btn gold" data-prospect-new>Novo cliente</button></div></div><div class="site-grid">${active.length?cards(active):`<p class="small muted">Nenhum cliente cadastrado ainda. Adicione uma oportunidade para acompanhar o próximo passo.</p>`}</div>${archived.length?`<details><summary>Arquivados (${archived.length})</summary><div class="site-grid">${cards(archived)}</div></details>`:""}</details>`;
}

function viewSites(){
 const logos={"studio":"<svg viewBox=\"0 0 64 64\" aria-hidden=\"true\"><rect x=\"6\" y=\"38\" width=\"13\" height=\"20\" rx=\"3.5\" fill=\"#1E3A8A\"/><rect x=\"25.5\" y=\"26\" width=\"13\" height=\"32\" rx=\"3.5\" fill=\"#3B82F6\"/><path d=\"M45 58V16l6.5-10L58 16v42z\" fill=\"#22D3EE\"/></svg>","ju":"<svg viewBox=\"22 20 156 176\" xmlns=\"http://www.w3.org/2000/svg\"><defs>\n<linearGradient id=\"lab-ju-c\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#F6E1DB\"/><stop offset=\"1\" stop-color=\"#E2B5AB\"/></linearGradient>\n<linearGradient id=\"lab-ju-l\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#F3DAD3\"/><stop offset=\"1\" stop-color=\"#D9A69C\"/></linearGradient></defs>\n<g class=\"petala esq\"><path d=\"M100 150 C70 132 64 86 88 50 C118 84 124 126 100 150 Z\" transform=\"rotate(-30 100 150)\" fill=\"url(#lab-ju-l)\" opacity=\".82\"/></g>\n<g class=\"petala dir\"><path d=\"M100 150 C70 132 64 86 88 50 C118 84 124 126 100 150 Z\" transform=\"scale(-1 1) translate(-200 0) rotate(-30 100 150)\" fill=\"url(#lab-ju-l)\" opacity=\".82\"/></g>\n<g class=\"petala meio\"><path d=\"M100 150 C70 120 72 66 100 26 C128 66 130 120 100 150 Z\" fill=\"url(#lab-ju-c)\" opacity=\".9\"/><path d=\"M100 146 C96 110 96 70 100 34\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" opacity=\".55\"/></g>\n<path class=\"haste\" d=\"M100 150 C98 166 92 180 80 192\" fill=\"none\" stroke=\"#D3A498\" stroke-width=\"2.2\" stroke-linecap=\"round\"/></svg>","lnet":"<svg class=\"brand151-logo\" viewBox=\"0 0 650 192\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"LL NET Telecom — proposta de nova identidade\"><defs><linearGradient id=\"lab-ll-ribbon\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#2384ff\"/><stop offset=\"1\" stop-color=\"#155EEB\"/></linearGradient></defs><g transform=\"translate(5 6) scale(.78)\"><path d=\"M73 4 36 30C17 43 10 54 10 76v66c0 24 17 42 41 42h66l-31-31H53c-7 0-11-5-11-12V77c0-7 3-13 9-17l22-15Z\" fill=\"url(#lab-ll-ribbon)\"/><path d=\"m125 21-33 23c-9 6-14 15-14 27v49l31 28h37v53l31 20v-79c0-19-14-34-34-34h-34V70l16-12Z\" fill=\"#65D4FF\"/><path d=\"M109 108h34c20 0 34 15 34 34v8h-31v-2h-37l-31-28V90Z\" fill=\"#155EEB\"/></g><text x=\"173\" y=\"113\" fill=\"#F5F8FF\" font-size=\"105\" font-weight=\"800\" letter-spacing=\"-4\" font-family=\"Arial,Helvetica,sans-serif\">LL <tspan fill=\"#3b83ff\">NET</tspan></text><text x=\"181\" y=\"164\" fill=\"#d4e6ff\" font-size=\"28\" letter-spacing=\"21\" font-family=\"Arial,Helvetica,sans-serif\">TELECOM</text></svg>"};
 const bless='<img src="https://arnoldsuheth.github.io/Blessaint/img/logo-blessaint-branco.png" alt="BLESSAINT" loading="lazy" width="180" height="70">';
 const link=(href,label,primary=false)=>`<a class="btn ${primary?"gold":""}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
 const card=(logo,name,description,status,links,waiting=false)=>`<article class="card site-card"><div class="site-logo" aria-hidden="true">${logo}</div><div class="site-info"><span class="tag ${waiting?"gold":""}">${esc(status)}</span><h2>${esc(name)}</h2><p class="small muted">${esc(description)}</p></div><div class="site-actions">${links.map(([url,label],i)=>link(url,label,i===0)).join("")}</div></article>`;
 return `<div class="stack fade sites-hub"><style>
 .sites-hub .site-section{padding:0;overflow:hidden}.sites-hub summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px;font-weight:800;font-size:1.05rem}.sites-hub summary::-webkit-details-marker{display:none}.sites-hub summary:after{content:"+";font-size:24px;color:var(--cyan)}.sites-hub details[open]>summary:after{content:"−"}.sites-hub .site-grid{padding:0 18px 18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.sites-hub .site-card{display:flex;flex-direction:column;gap:18px;min-width:0;background:linear-gradient(135deg,rgba(124,92,255,.08),rgba(34,211,238,.025));transition:transform .2s,border-color .2s}.sites-hub .site-card:hover{transform:translateY(-3px);border-color:var(--cyan)}.sites-hub .site-logo{height:88px;display:flex;align-items:center;justify-content:flex-start;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(5,9,18,.65)}.sites-hub .site-logo svg,.sites-hub .site-logo img{height:62px;width:auto;max-width:210px;object-fit:contain}.sites-hub .site-logo svg.brand151-logo{width:210px}.sites-hub .site-info{flex:1}.sites-hub h2{font-size:1.25rem;margin:12px 0 8px;line-height:1.3}.sites-hub p{margin:0;line-height:1.65}.sites-hub .site-actions{display:flex;flex-wrap:wrap;gap:9px}.sites-hub .site-actions a{min-height:44px;justify-content:center}.sites-hub .site-stats{display:flex;flex-wrap:wrap;gap:10px}.sites-hub a:focus-visible,.sites-hub summary:focus-visible{outline:2px solid var(--cyan);outline-offset:4px}@media(max-width:640px){.sites-hub .site-grid{grid-template-columns:minmax(0,1fr);padding:0 12px 12px}.sites-hub summary{padding:18px}.sites-hub .site-actions a{flex:1 1 140px}}@media(prefers-reduced-motion:reduce){.sites-hub .site-card{transition:none}.sites-hub .site-card:hover{transform:none}}
 </style><div><span class="eyebrow">Seu trabalho em um só lugar</span><h1>Meus sites</h1><p class="muted">Empresas, sistemas e projetos de clientes. Os links abrem em uma nova aba.</p></div>
 <div class="site-stats"><span class="pill">3 acessos das empresas</span><span class="pill">2 projetos aguardando aprovação</span><span class="pill">${prospectos().filter(p=>!p.arquivado).length} em prospecção</span></div>
 <details class="card site-section" open><summary>Empresas <span class="tiny muted">3 acessos</span></summary><div class="site-grid">
 ${card(logos.studio,"Studio Evolution Tech","Site do estúdio, serviços, portfólio e propostas.","Publicado",[["https://www.studioevolutiontech.com.br/","Abrir site"],["https://github.com/arnoldsuheth/studio-evolution-tech","GitHub"]])}
 ${card(bless,"BLESSAINT","Loja e catálogo oficial da marca.","Publicado",[["https://www.blessaint.com.br/","Abrir site"],["https://github.com/arnoldsuheth/Blessaint","GitHub"]])}
 ${card(bless,"BLESSAINT BUSINESS","Gestão de estoque, vendas, finanças e equipe. O sistema solicita seu acesso.","Sistema de gestão",[["https://blessaint-business-cloud.silkypixie512.chatgpt.site/painel","Abrir sistema"],["https://github.com/arnoldsuheth/blessaint-business","GitHub privado"]])}
 </div></details>
 <details class="card site-section" open><summary>Projetos de clientes <span class="tiny muted">2 projetos</span></summary><div class="site-grid">
 ${card(logos.ju,"Ju Intimates","Site de moda íntima e catálogo da coleção.","Aguardando aprovação do cliente",[["https://arnoldsuheth.github.io/ju-intimates/","Abrir prévia"],["https://github.com/arnoldsuheth/ju-intimates","GitHub"]],true)}
 ${card(logos.lnet,"LL NET Telecom","Pacote Evolution 360: propostas com identidade atual e nova identidade, mais o sistema de gestão.","Aguardando aprovação do cliente",[["https://projeto-151-2-lnet.silkypixie512.chatgpt.site","Nova identidade"],["https://projeto-lnet-02-arnold.silkypixie512.chatgpt.site","Identidade atual"],["https://lnet-gestao-arnold.silkypixie512.chatgpt.site","Abrir gestão"],["https://github.com/arnoldsuheth/studio-evolution-tech/tree/main/lnet","GitHub"]],true)}
 </div></details>${prospectSection()}</div>`;
}

/* ===================== moldura ===================== */
const NAV = [["hoje","Painel","hoje"],["trajetoria","Trajetória","traj"],["sites","Meus sites","grid"],["cursos","Meus cursos","grid"],["arena","Desafios","sword"],["claude","Claude","ia"],["prog","Programação","code"],["fac","Faculdade","fac"],["curso-criadores","Design","pen"],["curso-arte","Desenho","pencil"],["violao","Violão","music"],["livros","Biblioteca","book"],["presentes","Presentes","gift"],["perfil","Perfil","perfil"]];
const NAV_GRUPO = {claude:"Carreira", "curso-arte":"Hobbies", perfil:""};
const NAV_TAB = ["hoje","cursos","arena","violao","sites","perfil"];
const rota = () => (location.hash || "#hoje").slice(1) || "hoje";
const secao = r0 => { const r = r0.replace(/^(curso-.+)-m\d+$/, "$1"); return r.startsWith("fac-") ? "fac" : r.startsWith("aula-") ? "claude" : r.startsWith("prog-") ? "prog" : r.startsWith("desafio-") ? "arena" : NAV.some(n => n[0] === r) ? r : r === "curso-violao" || r === "curso-ls1" || r === "curso-ls3" ? "violao" : r.startsWith("curso-") ? "cursos" : "hoje"; };
function shell(){
  return `<div class="read-bar" id="readbar"></div><div class="shell">
  <aside class="rail"><a class="brand" href="#hoje">${CREST_BIG}<span><b>Evolution <span class="gtext">Lab</span></b><small id="brandsub">lvl 1 · Estagiário</small></span></a>
   ${NAV.map(([k,t,i]) => `${k in NAV_GRUPO ? `<div class="navg">${NAV_GRUPO[k]}</div>` : ""}<a class="navi" href="#${k}" data-nav="${k}">${ICO[i]}${t}</a>`).join("")}
   <div class="spacer"></div><div class="sync sync-ind">${syncHTML()}</div></aside>
  <div class="main"><header class="topbar"><a class="brand" href="#hoje">${crestSVG()}<span><b>Evolution <span class="gtext">Lab</span></b></span></a><div class="crumb" id="crumb" aria-hidden="true"></div><div id="pills" class="row" style="gap:8px;flex-wrap:nowrap"></div></header>
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
const FILOSOFOS = [
 ["Não é que tenhamos pouco tempo, é que perdemos muito.","Sêneca · Sobre a brevidade da vida"],
 ["O que bloqueia o caminho torna-se o caminho.","Marco Aurélio · Meditações"],
 ["Não são as coisas que perturbam as pessoas, e sim o que pensam sobre elas.","Epicteto · Manual"],
 ["Aprendemos as artes fazendo: é construindo que se aprende a construir.","Aristóteles · Ética a Nicômaco"],
 ["Ninguém se banha duas vezes no mesmo rio.","Heráclito · Fragmentos"],
 ["O começo é a parte mais importante de qualquer trabalho.","Platão · A República"],
 ["Quem tem um porquê para viver suporta quase qualquer como.","Nietzsche · Crepúsculo dos Ídolos"],
 ["Conhecimento é poder.","Francis Bacon · Meditationes Sacrae"],
 ["Aprender sem pensar é inútil; pensar sem aprender é perigoso.","Confúcio · Analectos"],
 ["Uma vida sem reflexão não vale a pena ser vivida.","Sócrates · Apologia, de Platão"],
 ["Enquanto ensinamos, aprendemos.","Sêneca · Cartas a Lucílio"]
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
function studyBlocks(value){
 const p=Math.min(100,Math.max(0,value)),n=20,r=43;
 const point=a=>[55+r*Math.cos(a*Math.PI/180),55+r*Math.sin(a*Math.PI/180)];
 const arc=(a,b)=>{const u=point(a),v=point(b);return `M${u[0]},${u[1]} A${r},${r} 0 0 1 ${v[0]},${v[1]}`;};
 let paths="";for(let i=0;i<n;i++){const a=-90+i*18,b=a+15,f=Math.max(0,Math.min(1,p*n/100-i));paths+=`<path d="${arc(a,b)}" class="study-block-empty"/>`;if(f>0)paths+=`<path d="${arc(a,a+15*f)}" class="study-block-fill"/>`;}
 return `<svg class="study-blocks" viewBox="0 0 110 110" role="progressbar" aria-label="Progresso" aria-valuenow="${p.toFixed(2)}" aria-valuemin="0" aria-valuemax="100">${paths}<text x="55" y="60" text-anchor="middle">${(Math.floor(p*10)/10).toLocaleString("pt-BR")}%</text></svg>`;
}
function studyProgressHTML(cs,ps,ds,fs){
 const approved=S.fac.discs.filter(d=>d.aprovada && media(d)!==null && media(d)>=S.fac.min).length;
 const rows=[["Claude",cs.done,cs.total,"aulas"],["Programação",ps.done,ps.total,"aulas"],["Design",ds.d,ds.t,"aulas"],["Faculdade",approved,fs.discs,"disciplinas aprovadas"]];
 return `<details class="study-progress"><summary>Progresso por área <span class="tiny muted">Ver detalhes</span></summary><div class="study-grid">${rows.map(([name,done,total,unit])=>{
   const exact=total?Math.min(100,Math.max(0,done/total*100)):0, percent=Math.floor(exact*10)/10, tone=exact<45?"low":exact<=65?"mid":"high";
   return `<div class="study-box ${tone}" role="group" aria-label="${name}">${studyBlocks(exact)}<div class="study-top"><b>${name}</b></div><div class="small muted">${done}/${total} ${unit}</div>${name==="Faculdade" && fs.tarefas?`<div class="tiny muted">${fs.tdone}/${fs.tarefas} tópicos e entregas</div>`:""}</div>`;
 }).join("")}</div></details>`;
}
function viewHoje(){
  const lv = nivel(), st = streak(), hx = xpDia(hoje()), meta = S.cfg.meta, sd = saudacao(), md = missoesDia();
  const cs = claudeStats(), ps = progStats(), fs = facStats(), pc = proxClaude(), pp = proxProg();
  const design = extC("criadores"), ds = design ? extStats(design) : {d:0,t:0};
  const at = diasAtivos(), ci = carreiraIdx(lv.n), arv = arvore(), attrs = atributos(), med = medalhas();
  const seg = new Date(); seg.setDate(seg.getDate() - ((seg.getDay()+6)%7));
  const NOMES = ["dom","seg","ter","qua","qui","sex","sáb"];
  const semana = [...Array(7)].map((_,i) => { const d = new Date(seg); d.setDate(seg.getDate()+i); const k = iso(d); return `<div><i class="${at[k]?"on":""} ${d.getDay()===5&&!at[k]?"rest":""} ${k===hoje()?"today":""}" title="${fmtData(k)}: ${at[k]||0} xp"></i><small>${NOMES[d.getDay()]}</small></div>`; }).join("");
  const feitas = md.list.filter(q => feitoQ(q)).length;
  const conq = med.filter(m => m[2]).concat(med.filter(m => !m[2])).slice(0,4);
  const abrev = t => t.split(" ").map(w => w[0]).join("").slice(0,3).toUpperCase();
  const prox = pc ? `#aula-${pc.id}` : "#perfil";
  return `<div class="stack fade">
  <section class="hero" id="hero" data-open="1">
   <div class="hero-main">
    <button type="button" class="hero-toggle" id="heroToggle" aria-expanded="true" aria-controls="heroBody"><span class="hero-hi">${sd.oi}, <b>${esc((S.nome||"").split(" ")[0])}</b></span><span class="hero-chev" aria-hidden="true"></span></button>
    <div class="hero-body" id="heroBody"><h1>${sd.oi}, <span>${esc(S.nome)}</span></h1><div class="hero-sub">${new Date().toLocaleDateString("pt-BR",{weekday:"long"})} · ${sd.sub}</div></div>
   </div>
   ${(([f,a]) => `<figure class="quote" id="quote"><span class="quote-mark" aria-hidden="true">“</span><blockquote data-full="${esc(f)}" aria-label="${esc(f)}"><span class="qt">${esc(f)}</span></blockquote>${a ? `<figcaption>${esc(a)}</figcaption>` : ""}</figure>`)(FRASE_DIA())}
   <span class="pill hero-pill">nota geral ${f1(notaGeral())}</span>
  </section>
  <div class="dash">
   <div class="stack">
    <section class="card o2"><div class="row between"><span class="k">Carreira</span><span class="tag gold">lvl ${lv.n} · ${esc(lv.nome)}</span></div>
     <div class="career-mobile"><span>${esc(lv.nome)}</span><span aria-hidden="true">→</span><span>${esc(lv.proxNome||"Trajetória concluída")}</span></div><div class="career">${CARREIRA.map((c,i) => `${i ? `<i class="${i<=ci?"on":""}"></i>` : ""}<span class="${i<ci?"on":i===ci?"cur":""}">${c}</span>`).join("")}</div>
     <div class="stats3"><div class="stat" data-go="#trajetoria" role="link" tabindex="0"><div class="k">xp</div><div class="v num">${lv.xp}<small>/${lv.prox || lv.xp}</small></div></div><div class="stat" data-go="#trajetoria" role="link" tabindex="0"><div class="k">aulas</div><div class="v num">${cs.done+ps.done+ds.d}<small>/${cs.total+ps.total+ds.t}</small></div></div><div class="stat" data-go="#trajetoria" role="link" tabindex="0"><div class="k">conquistas</div><div class="v num">${med.filter(m=>m[2]).length}<small>/${med.length}</small></div></div></div>
     ${studyProgressHTML(cs,ps,ds,fs)}<div class="bar" style="margin-top:14px"><i style="width:${Math.round(lv.p*100)}%"></i></div><div class="tiny dim mono" style="margin-top:6px">${lv.prox ? `${Math.max(0,lv.prox-lv.xp)} xp para ${esc(lv.proxNome)}` : "topo da carreira"}</div><p class="small" style="color:var(--amber);margin:8px 0 0">${esc(pendingPromotion(lv))}</p><details class="level-info"><summary>Sobre os níveis</summary><p class="tiny muted">Os cargos representam níveis do jogo. A prática demonstra seu domínio técnico.</p></details></section>
    <section class="card questcard o1"><div class="row between"><span class="k">${md.rest ? "Sexta livre · sequência protegida" : `Quests de hoje · ${feitas}/${md.list.length}`}</span><span class="tiny mono" style="color:var(--violet)">${S.bonus[hoje()] ? "bônus ganho" : "bônus +10 xp"}</span></div>
     <div style="margin-top:6px">${md.list.map(q => { const ok = feitoQ(q); return `<a class="quest ${ok?"done":""}" href="${q.href}"><span class="ic">${ok ? ICO.check : ""}</span><span style="min-width:0"><b style="display:block;line-height:1.3;font-weight:600">${esc(q.t)}</b><span class="tiny dim">${esc(q.s)}</span></span><span class="rw">${ok ? "feito" : q.xp.replace("XP","xp")}</span></a>`; }).join("") || `<p class="muted">Tudo concluído.</p>`}</div>
     <div class="row" style="margin-top:12px"><a class="btn gold" href="${prox}">${pc ? `Continuar quest · ${esc(nomeItem(pc))}` : "Ver certificado"}</a>${pp && new Date().getDay()>=1 && new Date().getDay()<=4 ? `<a class="btn" href="#prog">Aula ${pp[0]} de programação</a>` : ""}</div></section>
    <div class="trees o4"><div class="ttabs" role="tablist">${[["prog","Programação"],["claude","Claude"],["fac","Faculdade"],["design","Design"]].map(([k,t]) => `<button role="tab" data-ttab="${k}" aria-selected="${TREE_TAB===k}">${t}</button>`).join("")}</div>
    <section class="card treecard ${TREE_TAB==="prog"?"on":""}" data-tree="prog"><div class="row between"><span class="k">Árvore · Programação</span><a class="tiny mono" href="#prog" style="color:var(--violet);text-decoration:none">${Math.round(ps.p*100)}% ›</a></div><div style="margin-top:8px">${arv.svg}${listaArvore(arvoreProgNodes().nodes)}</div><div class="small muted">${arv.txt}</div></section>
    ${[["claude",arvoreClaude()],["fac",arvoreFac()],["design",arvoreDesign()]].map(([k,t]) => cardArvore(t, k)).join("")}</div>
   </div>
   <div class="stack">
    <section class="card o5"><span class="k">Atributos</span>${attrs.map(([n,v,c]) => `<div class="attr"><span>${n}</span><div class="bar"><i style="width:${v}%;background:${c}"></i></div><b>${v}</b></div>`).join("")}<div class="tiny dim" style="margin-top:10px">Crescem conforme você conclui aulas, tarefas e disciplinas.</div></section>
    <section class="card o3"><div class="row between"><span class="k">Constância · ${st} ${st===1?"dia":"dias"}</span><span class="tiny mono" style="color:${hx >= meta ? "var(--green)" : "var(--muted)"}">${hx >= meta ? "Meta atingida" : "Em andamento"}</span></div><div class="small muted" style="margin-top:8px">Hoje: <b class="num" style="color:var(--text)">${hx} XP</b> · Meta diária: ${meta} XP</div><div class="weekt">${semana}</div><div class="bar" style="margin-top:14px;height:6px"><i style="width:${Math.min(100,Math.round(hx/meta*100))}%;background:var(--amber)"></i></div></section>
    <section class="card o6"><span class="k">Conquistas</span><div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px">${conq.map(([t,d,on,cor]) => `<div class="badge-mini ${on?"":"off"}" title="${esc(d)}"><i style="background:${cor}">${abrev(t)}</i><span style="min-width:0;line-height:1.25">${esc(t)}</span></div>`).join("")}</div></section>
    <section class="card o7"><span class="k">Cursos</span>
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
  const UNIT_BG = NIVEIS.map(() => "var(--card)");
  return `<div class="stack fade">
  <section class="course-hero" style="--acc:linear-gradient(90deg,#F59E0B,#F472B6)"><div class="hero-grid">
   <div class="stack" style="gap:12px"><span class="eyebrow" style="color:var(--amber)">curso_01 · ia</span><h1>Curso de Claude</h1>
    <p class="muted" style="font-size:1.05rem;margin:0">Do zero ao avançado: como a IA funciona, como pedir bem, o app inteiro, agentes, Claude Code e a API, mais as 5 frentes (Chat, Code, Cowork, Agents e Design), skills e casos de uso em marketing, apps e conteúdo. Tudo em português, com prática na BLESSAINT.</p>
    <div class="row"><span class="tag cl">${AULAS.length} aulas</span><span class="tag cl">${CURSO_CLAUDE.filter(x => x.tipo === "rev").length} revisões</span><span class="tag cl">prova final</span><span class="tag gold">${cs.done}/${cs.total} feitas</span></div>
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
   ${x.missao ? `<section><span class="eyebrow">Missão prática no site</span><div style="margin-top:10px">${x.missao.map((m,k) => { const on = (S.missoes[x.id]||[])[k]; return `<button class="check" role="checkbox" aria-checked="${!!on}" data-mis="${x.id}:${k}"><span class="box"></span><span class="t">${esc(m)}</span><span class="xp">prática</span></button>`; }).join("")}</div><p class="tiny muted">Registre a entrega revisada em Trajetória para receber XP de prática.</p></section>` : ""}
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
   ${q.checked ? `<div class="feedback ${q.pick===item[2]?"ok":"bad"}"><div>${fraseResposta(q.pick===item[2])}<b>${q.pick===item[2] ? (q.combo>=3 ? `Combo ${q.combo}x.` : "Correto.") : "Incorreto."}</b> ${q.pick===item[2] ? "" : `Resposta: ${esc(item[1][item[2]])}. `}${esc(item[3])}</div></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ${q.pick===item[2]?"ok":"gold"}" data-qnext="${x.id}">${qi+1 < x.quiz.length ? "Continuar" : "Ver resultado"} ${ICO.arrow}</button></div>`
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
  ${arenaMini("prog")}
  ${vazio ? `<section class="card row between"><div style="min-width:0;flex:1"><span class="tag gold">Histórico disponível</span><h3 style="margin-top:10px">Aulas anteriores ainda não importadas</h3><p class="small muted" style="margin:6px 0 0">Seu diário registra as aulas 0 a 5 concluídas (quizzes 5/5, 4/8, 6/7, 5/7, 4/7 e 4/8). Elas ainda não entram no progresso desta plataforma. A importação só acontece quando você escolher.</p></div><button class="btn gold" data-import-hist="1">Importar histórico</button></section>` : ""}
  <section class="card"><div class="row between"><h3>${ICO.sword.replace("<svg","<svg style='width:20px;height:20px;vertical-align:-4px;color:var(--red)'")} Bugs a corrigir</h3><span class="small dim mono">seus pontos fracos · pratique e registre a avaliação na Trajetória</span></div>
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
   <button class="check" role="checkbox" aria-checked="${!!r.done}" data-prog="${a[0]}"><span class="box"></span><span class="t">Aula concluída</span><span class="xp">+20 XP</span></button>
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
  ${arenaMini("fac")}
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
  return `<section class="disc stack" id="disc-${d.id}" style="gap:16px"><div class="row between" style="flex-wrap:nowrap"><div style="min-width:0"><h3 style="font-size:1.15rem">${esc(d.nome)}</h3><div class="row" style="gap:6px;margin-top:6px"><span class="tag ${st[0]}">${st[1]}</span>${portalDisc(d.nome) ? `<span class="tag fc">portal ${portalDisc(d.nome).progresso||0}%${portalDisc(d.nome).prova ? " · " + esc(portalDisc(d.nome).prova) : ""}</span>` : ""}</div></div>${ring(m===null?0:m/10, 70, 8, m!==null&&m>=S.fac.min?"#3BDB8C":"#FF5E6E", m===null?"–":f1(m))}</div>
   <div class="grades">${[["av1","AV1"],["av2","AV2"],["av3","AV3 / AVS"]].map(([k,l]) => `<label class="field">${l}<input inputmode="decimal" data-nota="${d.id}:${k}" value="${val(k)}" placeholder="0 a 10"></label>`).join("")}<label class="field">Frequência %<input inputmode="numeric" data-freq="${d.id}" value="${d.freq ?? ""}" placeholder="75"></label></div>
   <label class="small"><input type="checkbox" data-fac-approved="${esc(d.id)}" ${d.aprovada ? "checked" : ""}> Disciplina aprovada · resultado final confirmado</label><p class="tiny muted">Confirme após o resultado final. A aprovação rende 200 XP quando a média também atinge o mínimo.</p>
   <div class="grid2"><div><b class="small">Assuntos para estudar</b><div style="margin-top:8px">${(d.topicos||[]).map((t,k) => `<button class="check" role="checkbox" aria-checked="${!!t.ok}" data-top="${d.id}:${k}"><span class="box"></span><span class="t">${esc(t.t)}</span><span class="xp">+10</span></button>`).join("") || `<p class="small dim">Nenhum assunto ainda.</p>`}</div>
     <form class="row" data-add-top="${d.id}" style="margin-top:10px;flex-wrap:nowrap"><input class="input" placeholder="Ex.: estruturas de repetição" aria-label="Novo assunto"><button class="btn sm" type="submit" aria-label="Adicionar assunto">${ICO.plus}</button></form></div>
    <div><b class="small">Provas e entregas</b><div style="margin-top:8px">${(d.entregas||[]).map((t,k) => `<button class="check" role="checkbox" aria-checked="${!!t.ok}" data-ent="${d.id}:${k}"><span class="box"></span><span class="t">${esc(t.t)}${t.data ? ` · ${fmtData(t.data)}` : ""}</span><span class="xp">+50</span></button>`).join("") || `<p class="small dim">Nada marcado.</p>`}</div>
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
/* feed das plataformas (Kiwify, Hotmart): cursos.enc.json = {cursos:{id:[aulas feitas por módulo]}}. Só soma, nunca apaga o que foi marcado à mão. */
async function lerFeedCursos(){
  try {
    if (!KEY || !COFRE || COFRE === "offline" || !COFRE.privBox) return false;
    let r = await fetch("cursos.enc.json?t=" + Date.now(), {cache:"no-store"});
    if (!r.ok) r = await fetch(`https://api.github.com/repos/${HOST}/${REPO}/contents/cursos.enc.json`, {headers:{"Accept":"application/vnd.github.raw+json"}, cache:"no-store"});
    if (!r.ok) return false;
    const f = await r.json(); if (!f || !f.ek) return false;
    if ((S.extFeedAt||0) >= f.at) return false;
    const {priv} = await decJSON(KEY, COFRE.privBox);
    const pk = await crypto.subtle.importKey("pkcs8", unb64(priv), {name:"RSA-OAEP", hash:"SHA-256"}, false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({name:"RSA-OAEP"}, pk, unb64(f.ek));
    const ak = await crypto.subtle.importKey("raw", raw, {name:"AES-GCM"}, false, ["decrypt"]);
    const data = JSON.parse(td.decode(await crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(f.iv)}, ak, unb64(f.ct))));
    if (!S.extSeed) semearExt();
    let novas = 0;
    (() => {
      Object.entries(data.cursos || {}).forEach(([id, arr]) => { const c = extC(id); if (!c || !Array.isArray(arr)) return; const rr = extR(id);
        arr.forEach((n, mi) => { const m = c.mods[mi]; if (!m || typeof n !== "number") return; n = Math.min(modTot(m), Math.max(0, Math.round(n))); const fz = modFeitas(c, mi); if (n <= fz) return; novas += n - fz;
          if (m.aulas){ let falta = n - fz; for (let ai=0; ai<m.aulas.length && falta>0; ai++){ const k = mi+":"+ai; if (!rr.a[k]){ rr.a[k] = true; falta--; } } }
          else rr.m[mi] = n; }); });
      S.extFeedAt = f.at;
    })();
    if (novas){ S.log.unshift({t:Date.now(), d:hoje(), k:"import", txt:`Cursos sincronizados com Kiwify e Hotmart: +${novas} ${novas===1?"aula":"aulas"}`, xp:0}); toast(`Sincronizei ${novas} ${novas===1?"aula nova":"aulas novas"} da Kiwify e da Hotmart.`); }
    persist(); paintTop();
    return novas > 0;
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
   ["Frentes","Fechar o nível 5 de Claude", nivelDone(5), "#22D3EE"],
   ["Aplicado","Fechar o nível 6 de Claude", nivelDone(6), "#34D399"],
   ["Expert em Claude","Passar na prova final", !!(S.claude.pf && pct(S.claude.pf) >= .7), "#22D3EE"],
   ["Zero bugs","Corrigir todos os pontos fracos", PROG_PONTOS_FRACOS.every((_,k) => S.chefes[k]), "#F87171"],
   ["Fase HTML","Concluir aulas 0 a 8", PROG_AULAS.filter(a => a[0] <= 8).every(a => S.prog[a[0]] && S.prog[a[0]].done), "#A78BFA"],
   ["Fase CSS","Concluir aulas 9 a 24", PROG_AULAS.filter(a => a[0] >= 9 && a[0] <= 24).every(a => S.prog[a[0]] && S.prog[a[0]].done), "#22D3EE"],
   ["BLESSAINT 1.0","Concluir a Aula 50", !!(S.prog[50] && S.prog[50].done), "#22D3EE"],
   ["Aprovado","Ficar acima da média numa disciplina", fs.ap >= 1, "#F472B6"],
   ["Missão cumprida","Completar as missões de um dia", Object.keys(S.bonus).length >= 1, "#34D399"],
   ["Caçador","Derrotar o primeiro chefão da arena", DKEYS.some(k => dStats(k).boss), "#F87171"],
   ["Estrela da arena","Ganhar 3 estrelas numa fase de cada curso", DKEYS.every(k => DESAFIOS[k].fases.some((_,fi) => dStars(dRec(k+":"+fi)) === 3)), "#22D3EE"],
   ["Constante","Fazer 7 desafios do dia", Object.keys(S.desafios).filter(k => k.startsWith("dia:") && S.desafios[k].done).length >= 7, "#F59E0B"]
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
   <div class="row between"><div><b class="small">Voz nas respostas</b><div class="tiny dim">Frases divertidas nos quizzes · voz do aparelho</div></div><button class="chip" aria-pressed="${S.cfg.fala!==false}" data-fala="1">${S.cfg.fala!==false?"Ligada":"Desligada"}</button></div>
   <div class="sound-tests"><button class="btn sm ok" data-test-feedback="ok" ${!S.cfg.som?"disabled":""}>Testar acerto</button><button class="btn sm" data-test-feedback="bad" ${!S.cfg.som?"disabled":""}>Testar erro</button></div>
   <p class="tiny dim" style="margin:0">Testes não mudam seu XP. A voz varia conforme o aparelho; som, voz e vibração dependem do suporte do navegador.</p>
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
  { const cur = $(".rail [aria-current=page]"), cr = $("#crumb"); if (cr) cr.textContent = cur ? cur.textContent.trim() : ""; }
  const y = scrollY, mm = r.match(/^curso-(.+)-m(\d+)$/);
  if (mm){ OPEN_MODS.add(mm[1]+":"+mm[2]); FECHADOS.delete(mm[1]+":"+mm[2]); }
  if (!S.presentes) checarPresentes(false);
  const aq = r.startsWith("aula-") && r.endsWith("-quiz"), aid = aq ? r.slice(5, -5) : r.slice(5);
  const dk = r === "desafio-dia" ? "dia:" + hoje() : r.startsWith("desafio-") ? r.slice(8).replace(/-(\d+|boss)$/, ":$1") : null;
  const v = r.startsWith("aula-") ? viewAula(aid) : r === "arena" ? viewArena() : dk ? viewDesafio(dk) : r.startsWith("prog-") ? viewProg() : r === "claude" ? viewClaude() : r === "prog" ? viewProg() : (r === "fac" || r.startsWith("fac-")) ? viewFac() : r === "trajetoria" ? viewTrajetoria() : r === "sites" ? viewSites() : r === "presentes" ? viewPresentes() : r === "perfil" ? viewPerfil() : r === "cursos" ? viewCursos() : r.startsWith("curso-") ? viewCurso(mm ? mm[1] : r.slice(6)) : r === "violao" ? viewViolao() : r === "livros" ? viewLivros() : viewHoje();
  $("#view").innerHTML = v;
  heroInit();
  paintTop(); $$(".sync-ind").forEach(el => el.innerHTML = syncHTML());
  if (keep) scrollTo(0, y);
  else if (mm) setTimeout(() => { const d = document.querySelector(`details[data-mod="${mm[1]}:${mm[2]}"]`); const t = d && (d.querySelector(".les.nx") || d); t && t.scrollIntoView({block:"center"}); }, 80);
  else if (r.startsWith("fac-")) setTimeout(() => { const t = document.getElementById("disc-" + r.slice(4)); t && t.scrollIntoView({block:"start"}); }, 80);
  if (aq && !keep){ QZ[aid] = {i:0, pick:null, checked:false, res:[], combo:0, maxCombo:0}; repintarQuiz(aid); setTimeout(() => { const z = $("#quiz"); z && z.scrollIntoView({block:"start"}); }, 60); }
  if (r.startsWith("prog-") && !keep && PROG_AULAS.some(a => String(a[0]) === r.slice(5))) setTimeout(() => abrirSheet(r.slice(5)), 30);
  document.title = (r.startsWith("aula-") ? ((CURSO_CLAUDE.find(x => x.id === aid)||{}).titulo || "Aula") + " · " : "") + "Evolution Lab";
}
/* Saudação que recolhe e frase com efeito de digitação (uma vez por dia; sem movimento se o aparelho pedir) */
function heroInit(){
  const h = $("#hero"); if (!h) return;
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches, dia = hoje();
  let st = {}; try { st = JSON.parse(sessionStorage.getItem("evolab-hero") || "{}"); } catch(e){}
  const visto = st.dia === dia;
  const set = open => { h.dataset.open = open ? "1" : "0"; const b = $("#heroToggle"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false"); };
  let timer = 0;
  const save = () => { try { sessionStorage.setItem("evolab-hero", JSON.stringify({dia})); } catch(e){} };
  $("#heroToggle").onclick = () => { clearTimeout(timer); set(h.dataset.open !== "1"); };
  const q = $("#quote .qt"), full = q ? q.parentNode.dataset.full : "";
  if (visto || calmo){ set(!visto ? true : false); if (!visto && !calmo) save(); }
  else {
    set(true); save();
    if (q){
      q.textContent = ""; q.parentNode.classList.add("typing"); let i = 0;
      const tick = () => { if (!document.body.contains(q)) return; i++; q.textContent = full.slice(0, i); if (i < full.length) setTimeout(tick, 24 + Math.random() * 28); else { q.parentNode.classList.remove("typing"); timer = setTimeout(() => set(false), 5000); } };
      setTimeout(tick, 350);
    } else timer = setTimeout(() => set(false), 6000);
  }
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
const modCar = (c, mi) => !!(c.car && c.car.includes(mi));
const cursoCar = c => !!(c.car && c.car.length);
/* XP de carreira: só o que é da área (módulos marcados em "car" e livros marcados como da área) */
function xpExtra(){
  let x = 0;
  EXT_CURSOS.forEach(c => c.mods.forEach((m,mi) => { if (!modCar(c, mi)) return; const f = modFeitas(c, mi); x += f * XP_EXT_AULA; if (f >= modTot(m)) x += XP_EXT_MOD; }));
  S.livros.forEach(l => { if (l.status === "lido" && l.area) x += XP_LIVRO; });
  return x;
}
/* XP de hobby: desenho, violão, livros fora da área. Fica separado e não muda o cargo. */
function xpHobby(){
  let x = 0;
  EXT_CURSOS.forEach(c => c.mods.forEach((m,mi) => { if (modCar(c, mi)) return; const f = modFeitas(c, mi); x += f * XP_EXT_AULA; if (f >= modTot(m)) x += XP_EXT_MOD; }));
  const v = S.violao; Object.values(v.treinos).forEach(min => x += Math.min(XP_TREINO_DIA, min));
  Object.values(v.acordes).forEach(s => { if (s === 2) x += XP_ACORDE; });
  v.musicas.forEach(m => { if (m.st === "d") x += XP_MUSICA; });
  S.livros.forEach(l => { if (l.status === "lido" && !l.area) x += XP_LIVRO; });
  x += xpDesafios(false);
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
const platTag = p => { const k = PLAT_COR[p.split(" ·")[0]]; return `<span class="ptag" style="color:${k||"#A3ABBD"};border-color:${k||"#2A3245"}55">${esc(p)}</span>`; };

function viewCursos(){
  const cs = claudeStats(), ps = progStats(), fs = facStats(), pc = proxClaude(), pp = proxProg();
  const ext = EXT_CURSOS.map(c => [c, extStats(c)]);
  const fora = ext.reduce((a,[,s]) => a + s.d, 0);
  const card = (href, cover, titulo, plat, linha, p, btn, gold) => `<a class="ccard" href="${href}"><div class="ccover" style="${cover}"><b>${esc(titulo)}</b></div><div class="row between">${platTag(plat)}<span class="tiny mono ${p>=1?"okc":""}">${linha}</span></div><div class="bar"><i style="width:${Math.round(p*100)}%"></i></div><span class="btn sm ${gold?"gold":""}" style="width:100%">${btn}</span></a>`;
  return `<div class="stack fade">
  <div><span class="k">Evolution Lab · todos os cursos</span><h1 style="margin-top:6px">Meus <span class="gtext">cursos</span></h1><p class="muted" style="margin-top:4px">Tudo num lugar só. Só o que é da sua área (tecnologia, design e o seu estúdio) sobe o cargo; desenho, violão e leituras fora da área viram XP de hobby.</p></div>
  <div class="stats3 s4" style="max-width:760px"><div class="stat"><div class="k">cursos</div><div class="v num">${3 + EXT_CURSOS.length}</div></div><div class="stat"><div class="k">plataformas</div><div class="v num">4<small>→1</small></div></div><div class="stat"><div class="k">aulas lá fora</div><div class="v num">${fora}</div></div><div class="stat"><div class="k">xp de hobby</div><div class="v num" style="color:var(--amber)">${xpHobby()}</div></div></div>
  <div class="cgrid">
   ${card("#claude", "background:linear-gradient(135deg,#3A2F66,#121722 75%)", "Claude do zero ao avançado", "Evolution Lab", `${cs.done}/${cs.total}`, cs.p, pc ? `Continuar · ${esc(nomeItem(pc))}` : "Ver certificado")}
   ${card("#prog", "background:linear-gradient(135deg,#1B3550,#121722 75%)", "Programação · Site BLESSAINT", "Evolution Lab", `${ps.done}/${ps.total}`, ps.p, pp ? `Continuar · Aula ${pp[0]}` : "Concluído")}
   ${card("#fac", "background:linear-gradient(135deg,#4A1E38,#121722 75%)", "Estácio · Ciência da Computação", "Estácio", `${fs.discs} disc.`, fs.p, "Ver disciplinas")}
   ${ext.map(([c,s]) => { const px = extProx(c); return card(`#curso-${c.id}`, capa(c), c.nome, c.plat + (cursoCar(c) ? "" : " · hobby"), s.p >= 1 ? "concluído" : `${s.d}/${s.t} aulas`, s.p, px ? `Próxima: ${esc(px.t)}` : "Revisar", !!px && s.d > 0); }).join("")}
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
    return `<details class="mod ${done?"done":cur?"cur":""}" data-mod="${ok2}" ${aberto?"open":""}><summary><span class="mn">${done ? ICO.check : f ? Math.round(f/n*100) + "%" : "·"}</span><span style="flex:1;min-width:0"><b style="display:block;line-height:1.3">${esc(m.t)}</b><span class="tiny dim">${n} ${n===1?"aula":"aulas"}</span>${cursoCar(c) ? (modCar(c, mi) ? ` <span class="xtag car">carreira</span>` : ` <span class="xtag hb">hobby</span>`) : ""}${f && !done ? `<div class="bar" style="margin-top:8px;max-width:240px;height:5px"><i style="width:${Math.round(f/n*100)}%"></i></div>` : ""}</span><span class="mono small ${done?"okc":"dim"}">${f}/${n}</span></summary>${corpo}</details>`;
  }).join("");
  return `<div class="stack fade">
  <a class="back" href="#cursos">${ICO.back} Meus cursos</a>
  <div class="chero">
   <section class="card" style="${capa(c)}">${platTag(c.plat)}<h1 style="margin:12px 0 6px">${esc(c.nome)}</h1><p class="muted">${esc(c.sub)} · ${c.mods.length} módulos, ${s.t} aulas.</p>
    <div class="row" style="margin-top:14px">${px ? `<a class="btn gold" href="${esc(pxURL)}" target="_blank" rel="noopener">▶ Continuar: ${esc(px.t)}</a>` : `<span class="tag ok">curso concluído</span>`}<a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Abrir na ${esc(c.plat)} ↗</a></div></section>
   <section class="card row" style="gap:18px;flex-wrap:nowrap">${ring(s.p, 104, 10, "#22D3EE", Math.round(s.p*100) + "%")}<div><span class="k">Progresso</span><div class="mono" style="font-size:1.25rem;font-weight:700">${s.d} / ${s.t} aulas</div><div class="small muted">${s.mc} módulos completos</div><div class="tiny dim" style="margin-top:6px">${!cursoCar(c) ? `<span class="xtag hb">hobby</span> aula +${XP_EXT_AULA} · módulo +${XP_EXT_MOD} em XP de hobby, não muda o cargo` : `<span class="xtag car">carreira</span> ${c.car.length} de ${c.mods.length} módulos sobem o cargo (+20 por aula; projetos revisados em Trajetória). Os outros contam como hobby.`}</div></div></section>
  </div>
  ${arenaMini(c.id === "ls1" || c.id === "ls3" ? "violao" : c.id)}
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
    <div class="tiny dim" style="margin-top:8px"><span class="xtag hb">hobby</span> 1 xp de hobby por minuto, até ${XP_TREINO_DIA} por dia. Não muda o cargo. · Total de hobby: <b class="mono" style="color:var(--amber)">${xpHobby()} xp</b></div></section>
   <section class="card"><h2 style="margin-bottom:12px">Acordes</h2><div class="chords">${ACORDES.map(a => { const s2 = v.acordes[a] || 0; return `<button class="cd s${s2}" data-acorde="${esc(a)}" aria-label="${esc(a)}: ${["ainda não","treinando","domino"][s2]}">${esc(a)}</button>`; }).join("")}</div>
    <p class="tiny dim" style="margin-top:12px">Toque para mudar: <span style="color:var(--dim)">●</span> ainda não → <span style="color:var(--amber)">●</span> treinando → <span style="color:var(--green)">●</span> domino (+${XP_ACORDE} xp)</p></section>
  </div>
  ${arenaMini("violao")}
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
   <div class="seg">${Object.entries(BST).map(([k,t]) => `<button data-bst="${esc(l.id)}:${k}" aria-pressed="${l.status===k}">${t}</button>`).join("")}<button data-bfav="${esc(l.id)}" aria-pressed="${!!l.fav}">★ favorito</button><button data-barea="${esc(l.id)}" aria-pressed="${!!l.area}" title="Livro de tecnologia, programação, design ou negócios do estúdio">${l.area ? "da área · conta na carreira" : "fora da área · hobby"}</button></div>
   <div class="row" style="gap:8px"><label class="tiny dim">Página <input class="input" type="number" min="0" inputmode="numeric" style="width:90px" value="${l.pag||""}" data-bpag="${esc(l.id)}"></label><label class="tiny dim">de <input class="input" type="number" min="0" inputmode="numeric" style="width:90px" value="${l.pags||""}" data-bpags="${esc(l.id)}"></label>${l.status==="lido" ? `<span class="tiny okc">terminado ${l.fim ? fmtData(l.fim) : ""} · ${l.area ? "registre uma aplicação prática na Trajetória" : `+${XP_LIVRO} XP de hobby`}</span>` : ""}</div>
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
  if (d.prospectNew !== undefined){ prospectForm(); return; }
  if (d.prospectEdit){ prospectForm(d.prospectEdit); return; }
  if (d.prospectArchive){ const p=prospectos().find(x=>x.id===d.prospectArchive); if(p){p.arquivado=!p.arquivado;persist();render(true);toast(p.arquivado?"Cliente arquivado. Você pode reativá-lo.":"Cliente reativado.");} return; }
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
  if (d.barea){ const l = L(d.barea); act(() => { l.area = !l.area; }, "livro", null, e); abrirLivro(l.id); return; }
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

/* ===================== ARENA DE DESAFIOS ===================== */
const DKEYS = Object.keys(DESAFIOS);
const dRec = k => S.desafios[k];
const dPct = r => r && r.total ? r.best / r.total : 0;
const dStars = r => !r || !r.done ? 0 : dPct(r) >= .9 ? 3 : dPct(r) >= .7 ? 2 : 1;
const bossAberto = ck => DESAFIOS[ck].fases.every((_,fi) => dRec(ck+":"+fi) && dRec(ck+":"+fi).done);
function dXP(k, r){ if (!r || !r.done) return 0; const boss = k.endsWith(":boss"), dia = k.startsWith("dia:"); const p = dPct(r);
  return (dia ? 40 + Math.round(30*p) : boss ? 80 + Math.round(70*p) : 30 + Math.round(30*p)) + ((r.combo||0) >= 5 ? 10 : 0); }
function dCarreira(k){ if (k.startsWith("dia:")) return true; const ck = k.split(":")[0]; return !!(DESAFIOS[ck] && DESAFIOS[ck].carreira); }
function xpDesafios(carreira){ let x = 0; Object.entries(S.desafios||{}).forEach(([k,r]) => { if (dCarreira(k) === carreira) x += dXP(k, r); }); return x; }
function dStats(ck){ const c = DESAFIOS[ck]; let st = 0; c.fases.forEach((_,fi) => st += dStars(dRec(ck+":"+fi))); const b = dRec(ck+":boss"); return {st, max: c.fases.length*3, boss: b && b.done && dPct(b) >= .7, bossTry: !!(b && b.done)}; }
function rngSeed(seed){ let h = hash32(seed) || 1; return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h>>>0) % 100000) / 100000; }; }
function embaralhar(a, r){ a = a.slice(); for (let i=a.length-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
function perguntasDia(d){
  const pool = [];
  DKEYS.filter(k => DESAFIOS[k].carreira).forEach(k => DESAFIOS[k].fases.forEach((f,fi) => f.q.forEach(q => pool.push({q, de: `${DESAFIOS[k].nome} · ${f.t}`}))));
  CURSO_CLAUDE.forEach(x => { if (S.claude[x.id] && S.claude[x.id].done && !x.tipo) x.quiz.forEach(q => pool.push({q, de: `Claude · ${nomeItem(x)}`})); });
  return embaralhar(pool, rngSeed("dia" + d)).slice(0, 6);
}
/* monta a partida: fase normal, chefão (10 aleatórias, 3 vidas) ou desafio do dia (6 do dia) */
function dMontar(k){
  if (k.startsWith("dia:")) return {titulo:"Desafio do dia", sub:"6 perguntas de tudo que é da sua carreira", itens: perguntasDia(k.slice(4)), vidas:0};
  const [ck, fs] = k.split(":"), c = DESAFIOS[ck];
  if (fs === "boss"){ const all = c.fases.flatMap(f => f.q.map(q => ({q, de:f.t}))); return {titulo:`Chefão · ${c.nome}`, sub:"10 perguntas sorteadas de todas as fases. 3 vidas: errou, perde uma.", itens: embaralhar(all, Math.random).slice(0, 10), vidas:3}; }
  const f = c.fases[+fs]; return {titulo:`${c.nome} · ${f.t}`, sub:f.sub, itens: f.q.map(q => ({q, de:f.t})), vidas:0};
}
let DQ = null;
function viewArena(){
  const dia = "dia:" + hoje(), rd = dRec(dia), xc = Object.entries((S.xpLedger||{}).earned||{}).filter(([k])=>k.startsWith("arena:")).reduce((n,[k,v])=>n+v,0), xh = xpDesafios(false);
  return `<div class="stack fade">
  <div><span class="k">Arena · exercícios de todos os cursos</span><h1 style="margin-top:6px">Desafios</h1><p class="muted" style="margin-top:4px">Fases com estrelas, combo e um chefão no fim de cada curso. Exercícios criados a partir do tema de cada módulo.</p></div>
  <div class="stats3 s4" style="max-width:760px"><div class="stat"><div class="k">estrelas</div><div class="v num" style="color:var(--cyan)">${DKEYS.reduce((a,k) => a + dStats(k).st, 0)}<small>/${DKEYS.reduce((a,k) => a + dStats(k).max, 0)}</small></div></div><div class="stat"><div class="k">chefões</div><div class="v num">${DKEYS.filter(k => dStats(k).boss).length}<small>/${DKEYS.length}</small></div></div><div class="stat"><div class="k">XP novo · carreira</div><div class="v num">${xc}</div></div><div class="stat"><div class="k">xp hobby</div><div class="v num" style="color:var(--amber)">${xh}</div></div></div>
  <a class="card dday" href="#desafio-dia"><span class="ico2" style="color:var(--amber)">${ICO.bolt}</span><span style="flex:1;min-width:0"><b>Desafio do dia</b><span class="tiny dim" style="display:block">${rd && rd.done ? `feito hoje · ${rd.best}/${rd.total} · volte amanhã para um novo` : "6 perguntas sorteadas de Claude, Programação, Faculdade e Design · até 30 XP"}</span></span>${rd && rd.done ? starRow(dStars(rd), 16) : `<span class="btn sm gold">Jogar</span>`}</a>
  ${DKEYS.map(arenaCurso).join("")}
  </div>`;
}
function arenaCurso(ck){
  const c = DESAFIOS[ck], s = dStats(ck), ab = bossAberto(ck), b = dRec(ck+":boss");
  return `<section class="card arena"><div class="row between"><div style="min-width:0"><span class="xtag ${c.carreira?"car":"hb"}">${c.carreira?"carreira":"hobby"}</span><h2 style="margin-top:6px">${esc(c.nome)}</h2><span class="tiny dim">${esc(c.sub)}</span></div><span class="mono" style="color:${c.cor}">★ ${s.st}/${s.max}</span></div>
   <div class="fases">${c.fases.map((f,fi) => { const r = dRec(ck+":"+fi); return `<a class="fase ${r && r.done ? "ok" : ""}" href="#desafio-${ck}-${fi}"><span class="fn mono">${fi+1}</span><span style="flex:1;min-width:0"><b>${esc(f.t)}</b><span class="tiny dim" style="display:block">${f.q.length} perguntas${r && r.done ? ` · melhor ${r.best}/${r.total}` : ""}</span></span>${starRow(dStars(r), 14)}</a>`; }).join("")}
    <a class="fase boss ${ab?"":"lock"} ${s.boss?"ok":""}" href="${ab ? `#desafio-${ck}-boss` : `#arena`}" ${ab ? "" : `aria-disabled="true"`}><span class="fn">${ab ? ICO.sword : ICO.lock}</span><span style="flex:1;min-width:0"><b>Chefão</b><span class="tiny dim" style="display:block">${ab ? (b && b.done ? `melhor ${b.best}/${b.total}${s.boss ? " · derrotado" : " · tente de novo"}` : "10 perguntas, 3 vidas") : "complete todas as fases para liberar"}</span></span>${b && b.done ? starRow(dStars(b), 14) : ""}</a></div></section>`;
}
function arenaMini(ck){
  const c = DESAFIOS[ck]; if (!c) return ""; const s = dStats(ck), prox = c.fases.findIndex((_,fi) => !(dRec(ck+":"+fi) && dRec(ck+":"+fi).done));
  return `<a class="card dday" href="${prox >= 0 ? `#desafio-${ck}-${prox}` : bossAberto(ck) && !s.boss ? `#desafio-${ck}-boss` : "#arena"}"><span class="ico2" style="color:${c.cor}">${ICO.sword}</span><span style="flex:1;min-width:0"><b>Desafios de ${esc(c.nome)}</b><span class="tiny dim" style="display:block">${c.fases.length} fases + chefão · ★ ${s.st}/${s.max}${s.boss ? " · chefão derrotado" : ""}</span></span><span class="btn sm gold">${prox >= 0 ? `Fase ${prox+1}` : s.boss ? "Arena" : "Chefão"}</span></a>`;
}
function viewDesafio(k){
  if (!k) return viewArena();
  if (!k.startsWith("dia:")){ const [ck, fs] = k.split(":"); if (!DESAFIOS[ck] || (fs !== "boss" && !DESAFIOS[ck].fases[+fs])) return viewArena(); if (fs === "boss" && !bossAberto(ck)) return viewArena(); }
  const back = k.startsWith("dia:") ? "#arena" : "#arena";
  return `<div class="stack fade" style="max-width:760px">
   <a class="back" href="${back}">${ICO.back} Desafios</a>
   <div id="dbox">${desafioHTML(k)}</div></div>`;
}
function desafioHTML(k){
  const r = dRec(k), car = dCarreira(k);
  if (!DQ || DQ.k !== k){
    const m = dMontar(k);
    return `<div class="quiz" style="text-align:center"><span class="xtag ${car?"car":"hb"}">${car?"xp de carreira":"xp de hobby"}</span><h2 style="margin:10px 0 6px">${esc(m.titulo)}</h2><p class="muted small">${esc(m.sub)}</p>
     <p class="small" style="margin:10px 0 14px">${r && r.done ? `Melhor: <b class="num" style="color:var(--cyan)">${r.best}/${r.total}</b> ${starRow(dStars(r),14)}` : `${m.itens.length} perguntas · ${car ? "até 30 XP; vale a melhor nota" : "combo de 5 = +10 XP"}`}</p>
     ${k.startsWith("dia:") && r && r.done ? `<p class="small muted">Você já fez o de hoje. Pode jogar de novo para treinar; vale a melhor nota.</p>` : ""}
     <button class="btn gold" data-dstart="${k}">${r && r.done ? "Jogar de novo" : "Começar"}</button></div>`;
  }
  const q = DQ;
  if (q.fim){
    const right = q.res.filter(Boolean).length, n = q.res.length, tot = q.itens.length, p = right/tot, st = !q.vivo ? 0 : p >= .9 ? 3 : p >= .7 ? 2 : 1;
    return `<div class="quiz result"><div class="bigstars">${[1,2,3].map(i => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="${i<=st?"#22D3EE":"rgba(255,255,255,.12)"}"/></svg>`).join("")}</div>
     <h2>${!q.vivo ? "As vidas acabaram" : right === tot ? "Gabarito!" : p >= .7 ? (q.vidas0 ? "Chefão derrotado" : "Fase concluída") : "Revise e tente de novo"}</h2>
     <div class="row" style="justify-content:center;gap:24px"><div><div class="xpgain num">${right}/${tot}</div><div class="tiny dim">acertos</div></div><div><div class="xpgain num">${q.gain > 0 ? "+"+q.gain : "+0"}</div><div class="tiny dim">${car?"xp":"xp hobby"}</div></div><div><div class="xpgain num" style="color:var(--fire)">${q.maxCombo}</div><div class="tiny dim">maior combo</div></div></div>
     ${q.erros.length ? `<div class="card" style="text-align:left;background:var(--bg2)"><b class="small">Para revisar</b>${q.erros.map(e => `<p class="small muted" style="margin:8px 0 0">• ${esc(e[0])} <span style="color:var(--green)">→ ${esc(e[1])}</span></p>`).join("")}</div>` : ""}
     <div class="row" style="justify-content:center"><button class="btn gold" data-dstart="${k}">Jogar de novo</button><a class="btn" href="#arena">Voltar à arena</a></div></div>`;
  }
  const it = q.itens[q.i].q, ord = ordem(k + ":" + q.i, q.i, it[1].length);
  return `<div class="quiz"><div class="row between" style="flex-wrap:nowrap;gap:14px"><div class="qprog" style="flex:1">${q.itens.map((_,j) => `<i class="${j<q.i ? (q.res[j]?"ok":"bad") : j===q.i ? "cur" : ""}"></i>`).join("")}</div>${q.vidas0 ? `<span class="vidas" aria-label="${q.vidas} vidas">${[1,2,3].map(v => `<i class="${v<=q.vidas?"on":""}">♥</i>`).join("")}</span>` : ""}${q.combo >= 2 ? `<span class="combo">${flameMini().replace("<svg","<svg style='width:18px;height:18px'")} ${q.combo}x</span>` : `<span class="small dim num">${q.i+1}/${q.itens.length}</span>`}</div>
   <span class="tiny dim">${esc(q.itens[q.i].de)}</span>
   <div class="qtext">${esc(it[0])}</div>
   ${ord.map(oi => { let cls = ""; if (q.checked){ if (oi === it[2]) cls = "right"; else if (q.pick === oi) cls = "wrong"; } return `<button class="opt ${cls}" role="checkbox" aria-checked="${q.pick===oi}" data-dopt="${oi}" ${q.checked?"disabled":""}><span class="box"></span><span>${esc(it[1][oi])}</span></button>`; }).join("")}
   ${q.checked ? `<div class="feedback ${q.pick===it[2]?"ok":"bad"}"><div>${fraseResposta(q.pick===it[2])}<b>${q.pick===it[2] ? (q.combo>=3 ? `Combo ${q.combo}x.` : "Correto.") : "Incorreto."}</b> ${q.pick===it[2] ? "" : `Resposta: ${esc(it[1][it[2]])}. `}${esc(it[3])}</div></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ${q.pick===it[2]?"ok":"gold"}" data-dnext="1">${q.i+1 < q.itens.length && !(q.vidas0 && q.vidas <= 0) ? "Continuar" : "Ver resultado"} ${ICO.arrow}</button></div>`
     : `<div class="row between" style="margin-top:16px"><span class="err" id="derr" role="alert"></span><button class="btn gold" data-dcheck="1">Verificar</button></div>`}
  </div>`;
}
function repintarD(){ const b = $("#dbox"); if (b && DQ) b.innerHTML = desafioHTML(DQ.k); }
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || !SESS && !LOCAL) return; const d = t.dataset;
  if (d.dstart){ const k = d.dstart, m = dMontar(k); DQ = {k, itens:m.itens, i:0, pick:null, checked:false, res:[], combo:0, maxCombo:0, vidas:m.vidas, vidas0:m.vidas, vivo:true, erros:[]}; repintarD(); $("#dbox").scrollIntoView({block:"start", behavior:"smooth"}); return; }
  if (!DQ) return;
  if (d.dopt !== undefined){ if (DQ.checked) return; DQ.pick = +d.dopt; $$("#dbox .opt").forEach(o => o.setAttribute("aria-checked", String(o === t))); const er = $("#derr"); if (er) er.textContent = ""; return; }
  if (d.dcheck){ if (DQ.checked) return; if (DQ.pick === null){ $("#derr").textContent = "Marque uma opção primeiro."; return; } const it = DQ.itens[DQ.i].q, ok = DQ.pick === it[2];
    DQ.checked = true; DQ.res[DQ.i] = ok; DQ.combo = ok ? DQ.combo + 1 : 0; DQ.maxCombo = Math.max(DQ.maxCombo, DQ.combo); if (!ok){ DQ.erros.push([it[0], it[1][it[2]]]); if (DQ.vidas0) DQ.vidas--; } respostaQuiz(ok); repintarD(); return; }
  if (d.dnext){ const acabou = DQ.vidas0 && DQ.vidas <= 0;
    if (DQ.i + 1 < DQ.itens.length && !acabou){ DQ.i++; DQ.pick = null; DQ.checked = false; repintarD(); return; }
    const k = DQ.k, right = DQ.res.filter(Boolean).length, n = DQ.itens.length; DQ.vivo = !acabou;
    const prev = dRec(k), ja = !!(prev && prev.done), nome = dMontar(k).titulo;
    DQ.gain = act(() => { const r = Object.assign({}, S.desafios[k]); if (DQ.vivo){ r.done = true; r.best = Math.max(r.best||0, right); r.total = n; r.combo = Math.max(r.combo||0, DQ.maxCombo); } r.last = right; r.at = Date.now(); r.tent = (r.tent||0) + 1; S.desafios[k] = r; }, "desafio", `${nome}: ${right}/${n}${acabou ? " (sem vidas)" : ""}`, e);
    if (!dCarreira(k)) DQ.gain = Math.max(0, dXP(k, dRec(k)) - dXP(k, prev));
    DQ.fim = true; repintarD(); $("#dbox").scrollIntoView({block:"start", behavior:"smooth"}); if (DQ.vivo && right/n >= .7){ confetti(); som("done"); } render(true); return; }
});

/* ===================== árvores de carreira (Claude, Faculdade, Design) ===================== */
/* nó: {id, cod (dentro do círculo), nome, x, y, p (0..1)}; arestas [de, para] */
function svgArvore(nodes, edges, nome){
  const N = {}; nodes.forEach(n => N[n.id] = n); const prox = nodes.find(n => n.p < 1 && !n.ini);
  let s = `<svg class="tree tree-wide" viewBox="0 0 600 176" role="img" aria-label="${esc(nome)}">`;
  edges.forEach(([a,b]) => { const A = N[a], B = N[b], on = A.p >= 1 || A.ini; s += `<path d="M${A.x} ${A.y}L${B.x} ${B.y}" style="stroke:${on?"#22D3EE":"#232B3B"}" stroke-width="2.5"/>`; });
  nodes.forEach(n => { const r = 22, c = 2*Math.PI*r, front = prox && prox.id === n.id; s += `<a href="${esc(n.href||"#hoje")}">`;
    if (n.p >= 1) s += `<circle cx="${n.x}" cy="${n.y}" r="${r}" style="fill:#22D3EE"/><text x="${n.x}" y="${n.y+4}" text-anchor="middle" style="fill:#04161A;font-weight:700">${esc(n.cod)}</text>`;
    else { s += `<circle cx="${n.x}" cy="${n.y}" r="${r}" style="fill:#0E131C;stroke:${front?"#7C5CFF":"#2E3748"}" stroke-width="2" ${front?'stroke-dasharray="4 4"':""}/>`;
      if (n.p > 0) s += `<circle cx="${n.x}" cy="${n.y}" r="${r}" style="fill:none;stroke:#22D3EE" stroke-width="3" stroke-dasharray="${c*n.p} ${c}" transform="rotate(-90 ${n.x} ${n.y})"/>`;
      s += `<text x="${n.x}" y="${n.y+4}" text-anchor="middle" style="fill:${n.p>0||front?"#E6E8EE":"#5A6377"};font-weight:600">${esc(n.cod)}</text>`; }
    s += `<text x="${n.x}" y="${n.y+38}" text-anchor="middle" class="tl" style="fill:${n.p>=1?"#A3ABBD":front?"#C4B5FD":"#6E7891"}">${esc(n.nome)}</text></a>`; });
  return s + `</svg>`;
}
function listaArvore(nodes){
  const prox = nodes.find(n => n.p < 1 && !n.ini);
  return `<div class="tree-list">${nodes.map(n => { const st = n.ini && n.p < 1 ? "em andamento" : n.p >= 1 ? (n.ini ? "concluído" : "dominado") : prox && prox.id === n.id ? (n.p > 0 ? "em progresso" : "próximo") : n.p > 0 ? "em progresso" : "bloqueado";
    return `<a class="tn ${n.p>=1||n.ini?"ok":prox && prox.id===n.id?"cur":n.p>0?"mid":"lock"}" href="${esc(n.href||"#hoje")}">${ring(n.p, 40, 5, n.p>=1||n.ini?"#22D3EE":n.p>0?"#7C5CFF":"transparent", n.cod)}<span style="min-width:0;flex:1"><b>${esc(n.nome)}</b><span class="tiny dim" style="display:block">${st}</span></span><span class="mono small ${n.p>=1?"okc":n.ini?"":"dim"}">${Math.round(n.p*100)}%</span></a>`; }).join("")}</div>`;
}
function cardArvore(t, k){
  const nn = t.nodes.filter(n => !n.ini), prox = nn.find(n => n.p < 1), total = nn.length ? nn.reduce((a,n) => a + n.p, 0) / nn.length : 0;
  return `<section class="card treecard ${TREE_TAB===k?"on":""}" data-tree="${k}"><div class="row between"><span class="k">Árvore · ${esc(t.nome)}</span><a class="tiny mono" href="${t.href}" style="color:var(--violet);text-decoration:none">${Math.round(total*100)}% ›</a></div>
   <div style="margin-top:8px">${svgArvore(t.nodes, t.edges, t.nome)}${listaArvore(t.nodes)}</div>
   <div class="small muted" style="margin-top:6px">${prox ? `Próximo destravamento: <b style="color:var(--text)">${esc(prox.nome)}</b>${t.dica ? ` · ${t.dica(prox)}` : ""}` : esc(t.fim)}</div></section>`;
}
function arvoreProgNodes(){ const nomes = {HTML:"Estrutura", CSS:"Estilo", Git:"Versões", JS:"Lógica", GitHub:"Publicar", DOM:"Interação", "v1.0":"BLESSAINT 1.0"};
  return {nome:"Programação (mobile)", nodes: TREE.map(t => ({id:t.id, cod:t.id.length > 4 ? t.id.slice(0,4) : t.id, nome:nomes[t.id]||t.id, x:t.x, y:t.y, p:rngProg(t.a,t.b), href:progHref(t)})), edges:TREE_E}; }
function arvoreClaude(){
  const pn = n => { const its = CURSO_CLAUDE.filter(x => x.nivel === n && x.tipo !== "prova"); return its.filter(x => S.claude[x.id] && S.claude[x.id].done).length / (its.length || 1); };
  const pf = S.claude.pf, pe = pf && pf.done ? Math.min(1, pct(pf)/.7) : 0;
  const hl = n => { const its = CURSO_CLAUDE.filter(x => x.nivel === n && x.tipo !== "prova"), a = its.find(x => !(S.claude[x.id] && S.claude[x.id].done)) || its[0]; return a ? "#aula-" + a.id : "#claude"; }, pv = CURSO_CLAUDE.find(x => x.tipo === "prova");
  const nodes = [{id:"n1",cod:"N1",nome:"Base",x:36,y:84,p:pn(1),href:hl(1)},{id:"n2",cod:"N2",nome:"Avançado",x:122,y:40,p:pn(2),href:hl(2)},{id:"n3",cod:"N3",nome:"Agentes",x:208,y:84,p:pn(3),href:hl(3)},{id:"n4",cod:"N4",nome:"Construtor",x:294,y:40,p:pn(4),href:hl(4)},{id:"n5",cod:"N5",nome:"Frentes",x:380,y:84,p:pn(5),href:hl(5)},{id:"n6",cod:"N6",nome:"Casos",x:466,y:40,p:pn(6),href:hl(6)},{id:"ex",cod:"★",nome:"Expert",x:560,y:84,p:pe,href:pv ? "#aula-" + pv.id : "#claude"}];
  return {nome:"Claude", href:"#claude", nodes, edges:[["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","ex"]], fim:"Árvore completa: Expert em Claude.", dica: n => { const pc = proxClaude(); return pc ? `próxima: ${esc(nomeItem(pc))}` : ""; }};
}
const FAC_COD = [["redes","RED","Redes"],["segur","SEG","Segurança"],["matem","MAT","Matemática"],["program","PRG","Programação"],["nuvem","NUV","Nuvem"],["labvida","LAB","Labvida"],["algorit","ALG","Algoritmos"],["banco","BD","Banco de dados"],["estrutura","ED","Estruturas"],["sistemas","SO","Sistemas"],["engenharia","ES","Engenharia"]];
function facCod(nome){ const s = nome.toLowerCase(); const m = FAC_COD.find(([k]) => s.includes(k)); return m ? m[1] : nome.replace(/[^A-Za-zÀ-ú]/g,"").slice(0,3).toUpperCase(); }
function facCurto(nome){ const m = FAC_COD.find(([k]) => nome.toLowerCase().includes(k)); if (m) return m[2]; return nome.replace(/^(Introdução à|Fundamentos de|Introdução a)\s+/i,"").replace(/ de computadores$/i,"").replace(/ em ciência da computação.*$/i,"").replace(/^./, c => c.toUpperCase()).slice(0,22); }
function arvoreFac(){
  const pd = (S.fac.portal && S.fac.portal.disciplinas) || [], nomes = pd.length ? pd.map(d => d.nome) : S.fac.discs.filter(d => (d.sem||1) === (S.fac.sem||1)).map(d => d.nome);
  const prog = nome => { const p = pd.find(d => d.nome === nome); const loc = S.fac.discs.find(d => d.nome.toLowerCase() === nome.toLowerCase()); let v = p ? (p.progresso||0)/100 : 0;
    if (loc){ const its = (loc.topicos||[]).concat(loc.entregas||[]); if (its.length) v = Math.max(v, its.filter(x => x.ok).length/its.length); const m = media(loc); if (m !== null && m >= S.fac.min) v = 1; } return Math.min(1, v); };
  const per = (S.fac.portal && S.fac.portal.periodo) || S.fac.sem || 1;
  const lista = nomes.slice(0, 8), metade = Math.ceil(lista.length/2), cols = Math.max(1, metade), xs = i => cols === 1 ? 300 : 160 + i*(320/(cols-1));
  const nodes = [{id:"ini", href:"#fac", cod:per+"º", nome:"Período "+per, x:40, y:84, p: lista.length ? lista.reduce((a,n) => a + prog(n), 0)/lista.length : 0}];
  const edges = [];
  lista.forEach((n,i) => { const row = i < metade ? 0 : 1, col = row ? i - metade : i; nodes.push({id:"d"+i, href:(l => l ? "#fac-"+l.id : "#fac")(S.fac.discs.find(d => d.nome.toLowerCase() === n.toLowerCase())), cod:facCod(n), nome:facCurto(n), x:xs(col), y: row ? 128 : 40, p:prog(n)}); });
  [0,1].forEach(row => { const ids = nodes.slice(1).filter(n => n.y === (row ? 128 : 40)).map(n => n.id); if (!ids.length) return; edges.push(["ini", ids[0]]); for (let k=1;k<ids.length;k++) edges.push([ids[k-1], ids[k]]); edges.push([ids[ids.length-1], "fim"]); });
  nodes.push({id:"fim", href:"#fac", cod:(per+1)+"º", nome:"Período "+(per+1), x:560, y:84, p: nodes.slice(1).length && nodes.slice(1).every(n => n.p >= 1) ? 1 : 0});
  const ini = nodes[0]; ini.ini = true; /* período em curso: progresso = média das disciplinas, já destravado */
  return {nome:"Faculdade", href:"#fac", nodes, edges, fim:"Período concluído. Rumo ao próximo!", dica: n => n.id === "fim" ? "feche todas as disciplinas" : "acompanhe pelo portal"};
}
function arvoreDesign(){
  const c = extC("criadores"), hm = idx => { const mi = idx.find(k => modFeitas(c, k) < modTot(c.mods[k])); return "#curso-criadores-m" + (mi === undefined ? idx[0] : mi); }, g = idx => { let d = 0, t = 0; idx.forEach(mi => { d += modFeitas(c, mi); t += modTot(c.mods[mi]); }); return t ? d/t : 0; };
  const nodes = [{id:"base",cod:"BAS",nome:"Base",x:40,y:84,p:g([0]),href:hm([0])},{id:"ps",cod:"PS",nome:"Photoshop",x:160,y:40,p:g([1,15]),href:hm([1,15])},{id:"ai",cod:"AI",nome:"Illustrator",x:160,y:128,p:g([2]),href:hm([2])},
   {id:"fx",cod:"FX",nome:"Efeitos",x:290,y:40,p:g([6,8,9]),href:hm([6,8,9])},{id:"logo",cod:"LOG",nome:"Logotipos",x:290,y:128,p:g([3]),href:hm([3])},{id:"soc",cod:"SOC",nome:"Social media",x:420,y:40,p:g([4,5,11]),href:hm([4,5,11])},{id:"neg",cod:"$",nome:"Negócio",x:420,y:128,p:g([7,10,12,13,14]),href:hm([7,10,12,13,14])},
   {id:"pro",cod:"PRO",nome:"Designer",x:560,y:84,p:extStats(c).p,href:(px => px ? "#curso-criadores-m" + px.mi : "#curso-criadores")(extProx(c))}];
  return {nome:"Design", href:"#curso-criadores", nodes, edges:[["base","ps"],["base","ai"],["ps","fx"],["ai","logo"],["fx","soc"],["logo","neg"],["soc","pro"],["neg","pro"]], fim:"Designer completo.", dica: () => { const px = extProx(c); return px ? `continue em ${esc(px.m)}` : ""; }};
}
let TREE_TAB = (() => { try { return localStorage.getItem("ea-ttab") || "prog"; } catch(e){ return "prog"; } })();
document.addEventListener("click", e => { const t = e.target.closest("[data-ttab]"); if (!t) return; TREE_TAB = t.dataset.ttab; try { localStorage.setItem("ea-ttab", TREE_TAB); } catch(x){}
  $$("[data-ttab]").forEach(b => b.setAttribute("aria-selected", String(b === t))); $$("[data-tree]").forEach(c => c.classList.toggle("on", c.dataset.tree === TREE_TAB)); });

/* ===================== TRAJETÓRIA (patentes e histórico) ===================== */
function xpPartes(){
  ensureXP(); const groups={claude:0,prog:0,ext:0,fac:0,arena:0,daily:0,weekly:0,practice:0};
  Object.entries(S.xpLedger.earned).forEach(([k,v])=>{const g=k.split(":")[0];if(g in groups)groups[g]+=v;});
  return [["Saldo anterior preservado",S.xpLedger.legacy,"#A78BFA"],["Curso de Claude",groups.claude,"#A78BFA"],["Programação",groups.prog,"#22D3EE"],["Design e cursos da área",groups.ext,"#34D399"],["Faculdade",groups.fac,"#F472B6"],["Quizzes da arena",groups.arena,"#F59E0B"],["Revisões e constância",groups.daily+groups.weekly,"#7C5CFF"],["Prática e projetos",groups.practice,"#22D3EE"]];
}

/* data em que cada patente foi alcançada, reconstruída do diário */
function datasPatentes(){ensureXP(); return Object.assign({}, S.xpLedger.rankDates);}
function registrarRank(){ensureXP();const lv=nivel();S.xpLedger.rankDates=S.xpLedger.rankDates||{};RANKS.forEach((r,i)=>{if(i<lv.n && !S.xpLedger.rankDates[i])S.xpLedger.rankDates[i]=hoje();});}

function practiceHTML(){
 const rows=EvoProgress.evidence(S.practice||[]);
 return `<section class="card"><div class="row between"><h2>Prática e projetos</h2><span class="tag">${rows.filter(e=>e.type==="project").length} projetos revisados</span></div>
 <p class="small muted" style="margin:10px 0">Registre uma entrega após revisão com seu professor, mentor ou responsável. Esta é uma avaliação manual registrada por você. Exercício: 50 XP · projeto: 150 XP. Cada entrega pontua uma vez.</p>
 <details><summary class="btn">Registrar avaliação</summary><form id="practice-form" class="stack" style="margin-top:14px">
 <div class="grid2"><label class="field">Tipo<select class="input" name="type"><option value="exercise">Exercício prático</option><option value="project">Projeto de módulo</option></select></label><label class="field">Nome da entrega<input class="input" name="title" required maxlength="120"></label></div>
 <label class="field">Link da entrega<input class="input" name="url" type="url" placeholder="https://..." required></label>
 <label class="field">Quem avaliou<input class="input" name="reviewer" required maxlength="100"></label>
 <label class="field">Observações da avaliação<textarea class="input" name="notes" minlength="20" maxlength="2000" required placeholder="O que foi testado, o que você explicou e quais correções foram feitas?"></textarea></label>
 <label class="small"><input type="checkbox" name="functional" required> A entrega funciona ou atende ao objetivo do exercício.</label>
 <label class="small"><input type="checkbox" name="explained" required> Consegui explicar as decisões e o que aprendi.</label>
 <label class="small"><input type="checkbox" name="reviewed" required> A revisão foi realizada e as correções necessárias foram conferidas.</label>
 <fieldset style="border:1px solid var(--line2);border-radius:10px;padding:12px"><legend class="small">Marcos avaliados · apenas para projetos</legend><div class="stack" style="gap:8px"><label class="small"><input type="checkbox" name="integrator"> Desafio integrador: aplicou conhecimentos de mais de uma área.</label><label class="small"><input type="checkbox" name="autonomy"> Autonomia: planejou, executou e resolveu problemas sem solução pronta.</label><label class="small"><input type="checkbox" name="documentation"> Documentação: instalação, uso e decisões foram documentados.</label><label class="small"><input type="checkbox" name="finalAssessment"> Avaliação final: revisão abrangente da trajetória concluída.</label></div></fieldset>
 <div role="alert" class="err"></div><button class="btn gold" type="submit">Salvar avaliação</button></form></details>
 ${rows.map(e=>`<div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px"><b>${esc(e.title)}</b><span class="tag" style="margin-left:8px">${e.type==="project"?"projeto":"exercício"}</span><p class="tiny muted">Avaliação registrada: ${esc(e.reviewer)}</p><a href="${esc(EvoProgress.safeURL(e.url))}" target="_blank" rel="noopener noreferrer">Ver entrega ↗</a><p class="small muted">${esc(e.notes)}</p></div>`).join("")}
 <details style="margin-top:16px"><summary class="small">Regras de XP e promoção</summary><p class="small muted">Aula: 20 XP · quiz: até 30 · revisão: até 10 por conteúdo por semana · tópico da faculdade: 10 · entrega: 50 · disciplina aprovada: 200 · missões diárias completas: 10. Os bônus de módulo são substituídos por projetos avaliados. Repetir conclusões não soma XP novamente. O saldo anterior e o histórico foram preservados. As patentes são níveis de aprendizagem, não certificações profissionais.</p><p class="small muted">Promoções: Júnior I exige 1 projeto; Júnior II, 2; Pleno I, 3 e desafio integrador; Pleno II, 4; Sênior, 5 e autonomia; Especialista Técnico, 6 e documentação; Especialista Sênior, 8 e avaliação final. Os requisitos anteriores também precisam estar cumpridos.</p></details></section>`;
}
window.evoRegisterPractice=function(entry){
 if((!SESS && !LOCAL) || !EvoProgress.validEvidence(entry))return "Não foi possível validar a avaliação.";
 if((S.practice||[]).some(e=>EvoProgress.safeURL(e.url)===EvoProgress.safeURL(entry.url)))return "Essa entrega já está registrada. Use um link específico para cada entrega diferente.";
 act(()=>{S.practice=S.practice||[];S.practice.push(entry);},"practice",`Avaliação prática: ${entry.title}`);
 render(true);toast("Avaliação registrada.");return null;
};

function viewTrajetoria(){
  const lv = nivel(), tot = lv.xp, dp = datasPatentes(), partes = xpPartes(), maxP = Math.max(1, ...partes.map(p => p[1]));
  const ativos = diasAtivos(), dias14 = [...Array(14)].map((_,i) => { const d = new Date(); d.setDate(d.getDate() - (13-i)); const k = iso(d); return [k, ativos[k]||0]; });
  const mx = Math.max(10, ...dias14.map(d => d[1])), xp7 = dias14.slice(7).reduce((a,d) => a + d[1], 0), media7 = S.log.filter(l=>l.scoreVersion===2 && l.d>=dias14[7][0] && l.d<=hoje()).reduce((n,l)=>n+(l.xp||0),0)/7;
  const falta = lv.prox ? Math.max(0,lv.prox - tot) : 0, estim = lv.prox && falta > 0 && media7 > 0 ? Math.ceil(falta/media7) : null;
  const fmt = k => k === "antes" ? "antes do diário" : fmtData(k);
  const medalhas_ = medalhas(), pres = presentesAtuais();
  const marcos = S.log.filter(l => (l.xp||0) >= 100).slice(0, 6);
  return `<div class="stack fade">
  <section class="course-hero"><div class="hero-grid"><div class="row" style="gap:20px;flex-wrap:nowrap">${badge(lv, 84)}<div style="min-width:0"><span class="eyebrow">trajetória · lvl ${lv.n} de ${RANKS.length}</span><h1 style="font-size:2rem">${esc(lv.nome)}</h1><p class="muted small" style="margin:4px 0 0">${CARREIRA[carreiraIdx(lv.n)]} · <span class="mono">${tot} xp</span> de carreira</p></div></div>
   <div><div class="bar"><i style="width:${Math.round(lv.p*100)}%"></i></div><p class="small muted" style="margin:8px 0 0">${lv.prox ? `Faltam <b class="mono" style="color:var(--text)">${falta} xp</b> para ${esc(lv.proxNome)}${estim ? ` · no seu ritmo dos últimos 7 dias (${Math.round(media7)} xp/dia), cerca de ${estim} ${estim === 1 ? "dia" : "dias"}` : ""}.` : "Topo da carreira."}</p></div></div></section>
  <p class="small" style="color:var(--amber)">${esc(pendingPromotion(lv))}</p>${practiceHTML()}<div class="stats3 s4" style="max-width:760px"><div class="stat"><div class="k">xp de carreira</div><div class="v num">${tot}</div></div><div class="stat"><div class="k">xp de hobby</div><div class="v num" style="color:var(--amber)">${xpHobby()}</div></div><div class="stat"><div class="k">últimos 7 dias</div><div class="v num">${xp7}<small> xp</small></div></div><div class="stat"><div class="k">sequência</div><div class="v num">${streak()}<small> dias</small></div></div></div>
  <section class="card"><span class="k">Escada de patentes</span><div class="ladder" style="margin-top:10px">${RANKS.map((r,i) => { const ok = i < lv.n, cur = lv.n === i+1, pend = EvoProgress.gate(i,S.practice||[]);
    return `<div class="rg ${ok?"ok":""} ${cur?"cur":""}"><span class="dot">${ok ? ICO.check : (i+1)}</span><span style="flex:1;min-width:0"><b>${esc(r[1])}</b><span class="tiny dim" style="display:block">${CARREIRA[carreiraIdx(i+1)]} · ${r[0]} xp</span></span><span class="tiny mono ${cur?"vio":"dim"}">${cur ? "você está aqui" : ok ? fmt(dp[i]||"antes") : tot >= r[0] ? `pendente: ${esc(pend.join(", "))}` : `faltam ${r[0]-tot} xp`}</span></div>`; }).join("")}</div></section>
  <div class="grid2"><section class="card"><span class="k">De onde vem o seu XP</span>${partes.map(([n,v,c]) => `<div class="attr"><span style="min-width:0">${esc(n)}</span><div class="bar"><i style="width:${Math.round(v/maxP*100)}%;background:${c}"></i></div><b>${v}</b></div>`).join("")}<div class="tiny dim" style="margin-top:10px">Novos pontos aparecem por área; os anteriores estão no saldo preservado. Hobbies (violão, desenho) têm XP próprio.</div></section>
  <section class="card"><span class="k">Últimos 14 dias</span><div class="hbars" style="margin-top:12px">${dias14.map(([k,v]) => `<div title="${fmtData(k)}: ${v} xp"><i style="height:${Math.max(3, Math.round(v/mx*100))}%" class="${v ? "on" : ""} ${k===hoje() ? "today" : ""}"></i></div>`).join("")}</div><div class="row between tiny dim" style="margin-top:6px"><span>${fmtData(dias14[0][0])}</span><span>hoje</span></div></section></div>
  <section class="card"><span class="k">Maiores conquistas recentes</span>${marcos.length ? marcos.map(l => `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:nowrap"><span class="small" style="min-width:0">${esc(l.txt || "Conquista")}</span><span class="row" style="gap:10px;flex:none"><b class="mono" style="color:var(--cyan)">+${l.xp}</b><span class="tiny dim">${fmtData(l.d)}</span></span></div>`).join("") : `<p class="small muted" style="margin-top:8px">Ainda sem grandes marcos. Conclua uma aula ou um módulo e ele aparece aqui.</p>`}</section>
  <div class="grid2"><a class="card dday" href="#presentes"><span class="ico2" style="color:var(--amber)">${ICO.gift}</span><span style="flex:1;min-width:0"><b>Presentes</b><span class="tiny dim" style="display:block">${pres.length} desbloqueados</span></span><span class="tiny mono" style="color:var(--violet)">abrir ›</span></a>
  <a class="card dday" href="#perfil"><span class="ico2" style="color:var(--violet)">${ICO.perfil}</span><span style="flex:1;min-width:0"><b>Conquistas e boletim</b><span class="tiny dim" style="display:block">${medalhas_.filter(m => m[2]).length}/${medalhas_.length} medalhas</span></span><span class="tiny mono" style="color:var(--violet)">abrir ›</span></a></div>
  </div>`;
}

/* ===================== PRESENTES (material gratuito ao concluir etapas) ===================== */
const progOk = (a,b) => rngProg(a,b) >= 1;
const criadoresOk = idx => { const c = extC("criadores"); return !!c && idx.every(mi => modFeitas(c, mi) >= modTot(c.mods[mi])); };
const facOk = cod => { const n = arvoreFac().nodes.find(x => x.cod === cod && !x.ini); return !!n && n.p >= 1; };
const cursoOk = id => { const c = extC(id); return !!c && extStats(c).p >= 1; };
const PRESENTES = [
 {id:"p-html", area:"Programação", t:"MDN: trilha de desenvolvimento web", tipo:"curso", url:"https://developer.mozilla.org/pt-BR/docs/Learn_web_development", why:"Você fechou o bloco de HTML da BLESSAINT. A MDN é a referência que profissionais abrem todo dia, e a trilha de aprendizado deles é gratuita e em português. Use para tirar dúvida de qualquer tag.", quando:"Conclua as aulas 0 a 8 de programação (HTML)", ok:() => progOk(0,8)},
 {id:"p-git", area:"Programação", t:"Pro Git (livro oficial, em português)", tipo:"ebook", url:"https://git-scm.com/book/pt-br/v2", why:"Git e GitHub são o que publica o seu site. Esse é o livro oficial, gratuito, e vai te acompanhar até virar profissional.", quando:"Conclua as aulas 25 a 28 (Git e GitHub)", ok:() => progOk(25,28)},
 {id:"p-js", area:"Programação", t:"Eloquent JavaScript (livro online)", tipo:"ebook", url:"https://eloquentjavascript.net/", why:"Lógica de programação com JavaScript, de graça, de um jeito que faz pensar. Está em inglês, e vale a pena porque o inglês técnico vai ser seu aliado de carreira.", quando:"Conclua as aulas 29 a 39 (JavaScript)", ok:() => progOk(29,39)},
 {id:"p-v1", area:"Programação", t:"Dica de carreira: seu primeiro portfólio", tipo:"dica", txt:"Você publicou a BLESSAINT 1.0. Agora transforme isso em portfólio: uma página simples com 3 projetos reais (BLESSAINT, o Studio Evolution Tech e a loja da Juliana), cada um com uma foto, o problema que resolveu e o link. Quem contrata quer ver coisa funcionando, não só certificado.", quando:"Conclua a aula 50 (BLESSAINT 1.0)", ok:() => progOk(46,50)},
 {id:"c-n1", area:"Claude", t:"Guia oficial de engenharia de prompts", tipo:"ebook", url:"https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview", why:"Você terminou o Nível 1. Aprender a pedir bem é a habilidade que mais rende com IA, e esse guia é da própria Anthropic.", quando:"Conclua o Nível 1 do curso de Claude", ok:() => nivelDone(1)},
 {id:"c-n2", area:"Claude", t:"Documentação do Claude Code", tipo:"curso", url:"https://docs.claude.com/en/docs/claude-code/overview", why:"No Nível 2 você já usa recursos avançados. Esse é o caminho para programar junto com a IA direto no seu projeto.", quando:"Conclua o Nível 2 do curso de Claude", ok:() => nivelDone(2)},
 {id:"c-n3", area:"Claude", t:"Building effective agents (artigo da Anthropic)", tipo:"ebook", url:"https://www.anthropic.com/engineering/building-effective-agents", why:"Você chegou em Agentes. Esse artigo explica, em linguagem direta, quando usar agentes e como montar um bom (está em inglês).", quando:"Conclua o Nível 3 do curso de Claude", ok:() => nivelDone(3)},
 {id:"c-n4", area:"Claude", t:"Agent SDK: documentação oficial", tipo:"curso", url:"https://docs.claude.com/en/api/agent-sdk/overview", why:"Construtor de verdade: com o SDK você monta o seu próprio agente. É o tipo de habilidade que vira serviço para vender no Studio Evolution Tech.", quando:"Conclua o Nível 4 do curso de Claude", ok:() => nivelDone(4)},
 {id:"d-base", area:"Design", t:"Laws of UX", tipo:"ebook", url:"https://lawsofux.com/", why:"Você fechou a base do design. Aqui estão, de graça, as regras de psicologia por trás de interfaces que funcionam: ótimo para o site da BLESSAINT e para vender melhor (em inglês).", quando:"Conclua o módulo Base do curso Academia de Criadores", ok:() => criadoresOk([0])},
 {id:"d-ps", area:"Design", t:"Google Fonts Knowledge", tipo:"ebook", url:"https://fonts.google.com/knowledge", why:"Depois do Photoshop, o que mais separa o amador do profissional é tipografia. Esse guia gratuito ensina a escolher e combinar fontes.", quando:"Conclua os módulos de Photoshop", ok:() => criadoresOk([1,15])},
 {id:"d-ai", area:"Design", t:"Dica de carreira: logo é conversa, não só desenho", tipo:"dica", txt:"Antes de abrir o Illustrator, faça 5 perguntas ao cliente: quem compra, o que ele sente ao comprar, 3 marcas que ele admira, onde o logo vai aparecer e o que não pode parecer. Logotipo bom nasce da resposta, e o cliente paga melhor por quem entende o negócio dele.", quando:"Conclua o módulo de Illustrator", ok:() => criadoresOk([2])},
 {id:"d-neg", area:"Design", t:"Sebrae: conteúdos gratuitos para vender e precificar", tipo:"curso", url:"https://www.sebrae.com.br/", why:"Você terminou os módulos de negócio. O Sebrae tem cursos e e-books gratuitos sobre preço, atendimento e vendas, perfeitos para quem atende cliente pequeno, que é o seu caso.", quando:"Conclua os módulos de negócio do curso de design", ok:() => criadoresOk([7,10,12,13,14])},
 {id:"d-pro", area:"Design", t:"Dica de carreira: venda o resultado, não a hora", tipo:"dica", txt:"Designer completo: agora pare de cobrar por hora. Ofereça 3 pacotes (básico, completo e premium) com o que o cliente recebe em cada um e o prazo. Quem escolhe entre 3 opções raramente pergunta se deve contratar.", quando:"Conclua todo o curso Academia de Criadores", ok:() => cursoOk("criadores")},
 {id:"f-red", area:"Faculdade", t:"Cartilha de Segurança para Internet (CERT.br)", tipo:"ebook", url:"https://cartilha.cert.br/", why:"Redes e segurança andam juntas. A cartilha do CERT.br é gratuita, em português, e serve até para orientar seus clientes.", quando:"Conclua a disciplina de Redes", ok:() => facOk("RED")},
 {id:"f-seg", area:"Faculdade", t:"OWASP Top 10", tipo:"ebook", url:"https://owasp.org/www-project-top-ten/", why:"A lista das 10 falhas mais comuns em sites. Conhecer isso cedo coloca você na frente de muito programador (em inglês).", quando:"Conclua a disciplina de Segurança", ok:() => facOk("SEG")},
 {id:"f-prg", area:"Faculdade", t:"Python para Zumbis", tipo:"curso", url:"https://pycursos.com/python-para-zumbis/", why:"Curso gratuito em português que ensina lógica de programação do jeito divertido, ótimo reforço para a faculdade.", quando:"Conclua a disciplina de Programação", ok:() => facOk("PRG")},
 {id:"f-mat", area:"Faculdade", t:"Khan Academy: Matemática", tipo:"curso", url:"https://pt.khanacademy.org/math", why:"Matemática vira sua amiga com aulas gratuitas, em português e no seu ritmo.", quando:"Conclua a disciplina de Matemática", ok:() => facOk("MAT")},
 {id:"f-per", area:"Faculdade", t:"CS50 de Harvard (curso gratuito)", tipo:"curso", url:"https://cs50.harvard.edu/x/", why:"Você fechou um período inteiro. O CS50 é o curso introdutório de Ciência da Computação mais famoso do mundo, gratuito e com legendas.", quando:"Conclua todas as disciplinas do período", ok:() => { const n = arvoreFac().nodes; return n.length > 2 && n.filter(x => !x.ini && x.id !== "fim").every(x => x.p >= 1); }},
 {id:"h-arte", area:"Hobby", t:"Dica: desenho é treino, não talento", tipo:"dica", txt:"Concluir o curso Arte de Elite é só a largada. O que faz a mão evoluir é volume: 10 minutos por dia valem mais que 2 horas por mês. Escolha um tema por semana, desenhe, e guarde tudo em ordem: em 3 meses você vai se surpreender ao comparar.", quando:"Conclua o curso Arte de Elite", ok:() => cursoOk("arte")},
 {id:"h-violao", area:"Hobby", t:"Dica: violão cresce com constância", tipo:"dica", txt:"Você completou o Violão Academy. Agora toque música inteira, ainda que devagar. Escolha uma por mês, grave um áudio no celular e compare com o mês anterior. Tocar no louvor ou para a família também é treino, e dá motivo para continuar.", quando:"Conclua o curso Violão Academy", ok:() => cursoOk("violao")}
];
const DICAS_MOD = [
 "Quem sabe construir e vender ganha dos dois lados: o programador que vende e o vendedor que entende de tecnologia.",
 "Portfólio vence currículo. Mostre projeto funcionando, com link, e conte o problema que ele resolveu.",
 "Cobre pelo resultado. “Site que vende pelo WhatsApp” vale mais do que “site bonito”.",
 "Ensinar fixa. Escreva um post curto sobre o que aprendeu neste módulo para o Instagram do Studio Evolution Tech.",
 "Estude em blocos de 25 minutos com 5 de pausa. Parar na hora certa é parte do método.",
 "Todo cliente quer saber 3 coisas: quanto custa, quando entrega e o que ganha. Tenha essas respostas prontas.",
 "Erro no código não é fracasso, é pista. Leia a mensagem inteira antes de pedir ajuda.",
 "Padronize: mesma cor, mesma fonte, mesmo botão. É isso que faz uma marca parecer profissional.",
 "Peça depoimento de cada cliente satisfeito, ainda no dia da entrega. Prova social vende por você.",
 "Revise o que aprendeu 1 dia, 1 semana e 1 mês depois. É assim que o cérebro guarda de verdade.",
 "Pequeno todo dia vence grande de vez em quando. Dez minutos hoje já contam.",
 "Aprenda a dizer o prazo real. Prometer menos e entregar antes constrói sua reputação.",
 "Copie o processo, não o resultado: veja como bons sites e designs são montados e refaça do seu jeito.",
 "Anote o que deu certo em cada projeto. Em seis meses isso vira o seu manual de trabalho.",
 "Cliente pequeno bem atendido indica o próximo. Boa resposta no WhatsApp também é parte do serviço."
];
function presentesModulos(){
  const out = [];
  EXT_CURSOS.forEach(c => c.mods.forEach((m,mi) => { out.push({id:`m-${c.id}-${mi}`, area:c.nome, t:`Módulo concluído: ${m.t}`, tipo:"dica", txt:DICAS_MOD[hash32(c.id+mi) % DICAS_MOD.length], quando:`Conclua o módulo "${m.t}"`, ok:() => modFeitas(c, mi) >= modTot(m) && modTot(m) > 0, mod:true}); }));
  return out;
}
const presentesTodos = () => PRESENTES.concat(presentesModulos());
const presentesAtuais = () => presentesTodos().filter(g => { try { return g.ok(); } catch(e){ return false; } });
function checarPresentes(avisar){
  if (!S.presentes){ S.presentes = {}; presentesAtuais().forEach(g => S.presentes[g.id] = "antes"); return []; }
  const novos = presentesAtuais().filter(g => !S.presentes[g.id]);
  novos.forEach(g => S.presentes[g.id] = hoje());
  if (novos.length && avisar){ try { persist(); } catch(e){} setTimeout(() => { if ($(".modal")) return toast("Presente novo desbloqueado! Veja em Presentes."); mostrarPresente(novos[0], novos.length - 1); }, 1400); }
  return novos;
}
function mostrarPresente(g, mais){
  lionEvento("gift", g.t);
  som("up"); confetti && confetti();
  modal(`<span class="tag gold">presente desbloqueado</span><h2 style="margin:10px 0 6px">${esc(g.t)}</h2><p class="muted" style="line-height:1.55">${esc(g.why || g.txt)}</p>${mais ? `<p class="tiny dim">Mais ${mais} ${mais === 1 ? "presente" : "presentes"} esperando em Presentes.</p>` : ""}<div class="row" style="margin-top:14px">${g.url ? `<a class="btn gold" href="${esc(g.url)}" target="_blank" rel="noopener">Abrir material ↗</a>` : ""}<a class="btn" href="#presentes" data-close>Ver todos</a><button class="btn ghost" data-close>Depois</button></div>`, true);
}
function viewPresentes(){
  const todos = presentesTodos(), fixos = todos.filter(g => !g.mod), mods = todos.filter(g => g.mod), ok = fixos.filter(g => { try { return g.ok(); } catch(e){ return false; } }), modsOk = mods.filter(g => { try { return g.ok(); } catch(e){ return false; } });
  const card = (g, on) => `<section class="card gift ${on ? "" : "lock"}"><div class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><span class="tag ${on ? "gold" : ""}">${esc(g.area)} · ${g.tipo === "ebook" ? "e-book" : g.tipo === "curso" ? "curso grátis" : "dica"}</span><h3 style="margin:8px 0 4px;font-size:1.05rem;line-height:1.3">${on ? esc(g.t) : "Presente escondido"}</h3></div><span class="gico">${on ? ICO.gift : ICO.lock}</span></div>
   <p class="small ${on ? "muted" : "dim"}" style="margin:4px 0 0;line-height:1.5">${on ? esc(g.why || g.txt) : esc(g.quando)}</p>${on && g.url ? `<div class="row" style="margin-top:12px"><a class="btn sm gold" href="${esc(g.url)}" target="_blank" rel="noopener">Abrir material ↗</a></div>` : ""}</section>`;
  return `<div class="stack fade">
  <div class="head"><div><h1>Presentes</h1><div class="muted small" style="margin-top:4px">Material gratuito escolhido para o caminho que você está seguindo. Cada etapa concluída libera um.</div></div><span class="pill">${ok.length + modsOk.length} desbloqueados</span></div>
  <div class="grid2" style="align-items:start">${fixos.map(g => card(g, ok.includes(g))).join("")}</div>
  <details class="card"><summary style="cursor:pointer"><b>Dicas de módulo</b> <span class="tiny dim">· ${modsOk.length}/${mods.length} liberadas</span></summary><div class="stack" style="margin-top:12px;gap:10px">${modsOk.length ? modsOk.map(g => card(g, true)).join("") : `<p class="small muted">Conclua um módulo dos seus cursos e a primeira dica aparece aqui.</p>`}</div></details>
  <p class="tiny dim">Os materiais são de terceiros, abrem em outra aba e são gratuitos. Se algum link mudar, me avise que eu troco.</p>
  </div>`;
}
document.addEventListener("click", e => { const g = e.target.closest && e.target.closest("[data-go]"); if (g) location.hash = g.dataset.go; });

/* ===================== ponte com o Lion (preferências sincronizadas, contexto e pedido de ajuda) ===================== */
function textoAjuda(){
  const r = rota(), lv = nivel(); let ctx = "Estou no Evolution Lab.";
  if (r.startsWith("aula-")){ const id = r.slice(5).replace(/-quiz$/, ""), it = CURSO_CLAUDE.find(x => x.id === id); ctx = `Estou numa aula do curso de Claude${it ? `: ${it.titulo}` : ""}.`; }
  else if (r.startsWith("prog")){ const m = r.match(/^prog-(\d+)/), a = m && PROG_AULAS.find(z => String(z[0]) === m[1]); ctx = `Estou no curso de Programação (BLESSAINT)${a ? `, aula ${a[0]}: ${a[2]}` : ""}.`; }
  else if (r === "fac" || r.startsWith("fac-")) ctx = "Estou na Faculdade.\n" + textoFac();
  else if (r.startsWith("curso-")){ const c = extC(r.slice(6).replace(/-m\d+$/, "")); if (c){ const st = extStats(c), px = extProx(c); ctx = `Estou no curso ${c.nome}: ${st.d}/${st.t} aulas${px ? `, próxima: ${px.t}` : ""}.`; } }
  else if (r === "arena" || r.startsWith("desafio-")) ctx = "Estou na Arena de desafios.";
  return `Evolution Lab · pedido de ajuda\n${ctx}\nMeu nível na plataforma: ${lv.nome}.\nMinha dúvida: `;
}
window.EvoLion = {
  prefs: () => (S && S.cfg && S.cfg.lion) || null,
  setPrefs: p => { if (!S) return; S.cfg = S.cfg || {}; S.cfg.lion = p; persist(); },
  context: () => { try {
    const provas = S.fac.discs.flatMap(d => (d.entregas || []).filter(e => !e.ok && e.data).map(e => ({id:d.id + ":" + e.t, titulo:e.t, disciplina:facCurto(d.nome), dias:Math.round((new Date(e.data + "T12:00") - new Date(hoje() + "T12:00")) / 864e5)})));
    return {provas, xpHoje:diasAtivos()[hoje()] || 0, sequencia:streak(), meta:S.cfg.meta || 100};
  } catch(e){ return null; } },
  help: () => copiar(textoAjuda()),
  xp: () => { try { return xpTotal() + xpHobby(); } catch(e){ return null; } }
};

const FRASE_DIA = () => { const h = hash32(hoje()); const pool = h % 10 < 7 ? FILOSOFOS : FRASES; return pool[Math.floor(h / 10) % pool.length]; };

/* ===================== eventos ===================== */
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || !SESS && !LOCAL) return; const d = t.dataset;
  if (d.intro) return introModal();
  if (d.qstart){ QZ[d.qstart] = {i:0, pick:null, checked:false, res:[], combo:0, maxCombo:0}; repintarQuiz(d.qstart); $("#quiz").scrollIntoView({block:"start", behavior:"smooth"}); return; }
  if (d.opt){ const [id, oi] = d.opt.split(":"); const q = QZ[id]; if (!q || q.checked) return; q.pick = +oi; $$(".opt", $("#quizbox")).forEach(o => o.setAttribute("aria-checked", String(o === t))); const er = $("#qerr"); if (er) er.textContent = ""; return; }
  if (d.qcheck){ const id = d.qcheck, q = QZ[id], x = CURSO_CLAUDE.find(z => z.id === id); if (q.checked) return; if (q.pick === null){ $("#qerr").textContent = "Marque uma opção primeiro."; return; }
    q.checked = true; const ok = q.pick === x.quiz[q.i][2]; q.res[q.i] = ok; q.combo = ok ? q.combo + 1 : 0; q.maxCombo = Math.max(q.maxCombo, q.combo); respostaQuiz(ok); repintarQuiz(id); return; }
  if (d.qnext){ const id = d.qnext, q = QZ[id], x = CURSO_CLAUDE.find(z => z.id === id);
    if (q.i + 1 < x.quiz.length){ q.i++; q.pick = null; q.checked = false; repintarQuiz(id); return; }
    const right = q.res.filter(Boolean).length, n = x.quiz.length, wrong = q.res.map((v,k) => v ? null : k+1).filter(Boolean);
    const prev = S.claude[id], jaFeito = !!(prev && prev.done);
    q.gain = act(() => { const r = S.claude[id] || {}; S.claude[id] = Object.assign(r, {done:true, best:Math.max(r.best||0, right), last:right, total:n, wrong, at:Date.now()}); }, jaFeito ? "retry" : "claude", `${nomeItem(x)}: quiz ${right}/${n}`, e, x.id);
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
  if (d.testFeedback){ respostaQuiz(d.testFeedback === "ok"); return; }
  if (d.fala){ S.cfg.fala = S.cfg.fala === false; if (!S.cfg.fala && window.EvoFeedback) window.EvoFeedback.stop(); persist(); render(true); return; }
  if (d.som){ S.cfg.som = !S.cfg.som; if (!S.cfg.som && window.EvoFeedback) window.EvoFeedback.stop(); persist(); render(true); if (S.cfg.som) som("ok"); return; }
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
  if (f.id === "f-prospect"){
    const data=new FormData(f), nome=String(data.get("nome")||"").trim().slice(0,100), url=String(data.get("url")||"").trim();
    if(!nome){toast("Informe o nome do cliente.");return;}
    if(url&&!/^https?:\/\//i.test(url)){toast("Use um link iniciado por https:// ou http://.");return;}
    S.prospectos=prospectos();const previous=S.prospectos.find(p=>p.id===f.dataset.id);
    const item={id:previous?.id||crypto.randomUUID(),nome,etapa:Object.hasOwn(PROSPECT_STAGES,data.get("etapa"))?data.get("etapa"):"pedido",ideia:String(data.get("ideia")||"").trim().slice(0,2000),acao:String(data.get("acao")||"").trim().slice(0,300),prazo:String(data.get("prazo")||""),url,arquivado:previous?.arquivado||false};
    if(previous)Object.assign(previous,item);else S.prospectos.push(item);
    persist();fecharModal();render(true);toast("Cliente salvo.");return;
  }
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
  if (d.facApproved){const disc=S.fac.discs.find(x=>x.id===d.facApproved);if(!disc)return;act(()=>{disc.aprovada=t.checked;},"fac",`Faculdade · resultado final de ${disc.nome}`);render(true);return;}
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
   <div class="field"><label for="pw">Senha</label><div class="password-row"><input type="password" id="pw" autocomplete="current-password" required autofocus><button class="btn sm" type="button" data-toggle-password aria-controls="pw" aria-pressed="false">Mostrar senha</button></div></div>
   <label class="row small" style="gap:10px;cursor:pointer"><input type="checkbox" id="lembrar" checked style="width:20px;height:20px;accent-color:#22D3EE"> Manter conectado neste aparelho</label>
   <div class="err" id="lerr" role="alert"></div>
   <button class="btn gold" type="submit" id="lbtn">${ICO.lock} Entrar</button>
   ${cofre === "offline" ? `<p class="small muted" style="text-align:center">Sem internet e sem login salvo neste aparelho. Conecte-se para entrar.</p>` : ""}
  </form></div>`;
  starfield();
}
document.addEventListener("click", e => {
  const toggle = e.target.closest("[data-toggle-password]");
  if (!toggle) return;
  const input = $("#pw"); if (!input) return;
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  toggle.textContent = visible ? "Ocultar senha" : "Mostrar senha";
  toggle.setAttribute("aria-pressed", String(visible));
});
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
  LOCAL = true; lastR = rota();
  if (fazerPull){setSync("busy");await pull();}else setSync("ok");
  if (!S.extSeed)semearExt();
  if(fazerPull && sync!=="ok" && !S.updatedAt){LOCAL=false;$("#app").innerHTML=`<div class="login"><div class="login-box"><h1>Progresso indisponível</h1><p class="muted">Não consegui carregar seu progresso da nuvem e não há uma cópia neste aparelho. Tente novamente antes de estudar para preservar seus dados.</p><a class="btn gold" href="./">Tentar novamente</a></div></div>`;return;}
  const migrated=ensureXP();if(migrated){registrarRank();if(sync==="ok")persist();else lsSet("ea-state",S);}
  render();
  await garantirChaves(); if(await lerFeed())render(true);if(await lerFeedCursos())render(true);
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

