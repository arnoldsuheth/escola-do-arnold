(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EvoProgress = api;
})(typeof globalThis === "object" ? globalThis : this, function(){
  "use strict";
  const ranks = [[0,"Iniciante"],[1000,"Trainee"],[3000,"Júnior I"],[7000,"Júnior II"],[14000,"Pleno I"],[25000,"Pleno II"],[40000,"Sênior"],[65000,"Especialista Técnico"],[100000,"Especialista Sênior"]];
  const requiredProjects = [0,0,1,2,3,4,5,6,8];
  const num = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  function safeURL(value){
    try { const u = new URL(value); if (!["https:","http:"].includes(u.protocol) || u.username || u.password) return null; u.hash = ""; return u.href.replace(/\/$/, ""); } catch(e){ return null; }
  }
  function validEvidence(e){ return !!(e && ["exercise","project"].includes(e.type) && String(e.title||"").trim() && safeURL(e.url) && String(e.reviewer||"").trim() && String(e.notes||"").trim().length >= 20 && e.functional && e.explained && e.reviewed); }
  function evidence(items){ const seen = new Set(); return (items||[]).filter(e => { if (!validEvidence(e)) return false; const u = safeURL(e.url); if (seen.has(u)) return false; seen.add(u); return true; }); }
  function create(legacy, snapshot, at){ return {version:2, legacy:num(legacy), earned:{}, paid:Object.fromEntries(Object.entries(snapshot||{}).map(([k,v])=>[k,num(v)])), at, rankDates:{}}; }
  function total(ledger){ return num(ledger.legacy) + Object.values(ledger.earned||{}).reduce((s,n)=>s+num(n),0); }
  function reconcile(ledger, snapshot, suppress){
    ledger.paid = ledger.paid || {}; ledger.earned = ledger.earned || {};
    let delta = 0;
    Object.entries(snapshot||{}).forEach(([key,value]) => {
      const next = num(value), before = num(ledger.paid[key]);
      if (next <= before) return;
      ledger.paid[key] = next;
      if (!suppress){ const gain = next-before; ledger.earned[key] = num(ledger.earned[key])+gain; delta += gain; }
    });
    return delta;
  }
  function gate(index, items){
    const projects=evidence(items).filter(e=>e.type==="project"), missing=[];
    if (projects.length < requiredProjects[index]) missing.push(`${requiredProjects[index]-projects.length} projeto(s) revisado(s)`);
    if (index>=4 && !projects.some(e=>e.integrator)) missing.push("desafio integrador");
    if (index>=6 && !projects.some(e=>e.autonomy)) missing.push("projeto com autonomia");
    if (index>=7 && !projects.some(e=>e.documentation)) missing.push("documentação de projeto");
    if (index>=8 && !projects.some(e=>e.finalAssessment)) missing.push("avaliação final");
    return missing;
  }
  function level(xp, items){
    xp=num(xp); let i=0;
    for(let n=1;n<ranks.length;n++){ if(xp<ranks[n][0] || gate(n,items).length)break; i=n; }
    const cur=ranks[i], next=ranks[i+1];
    return {n:i+1,nome:cur[1],xp,prox:next?next[0]:null,proxNome:next?next[1]:null,p:next?Math.min(1,Math.max(0,(xp-cur[0])/(next[0]-cur[0]))):1,pending:next?gate(i+1,items):[]};
  }
  return {ranks,create,total,reconcile,gate,level,evidence,validEvidence,safeURL};
});
