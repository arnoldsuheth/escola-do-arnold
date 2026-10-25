const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const P=require('./progression.js');
function load(){
 const noop=()=>{};
 const ctx={console,EvoProgress:P,URL,Date,Map,Set,Uint8Array,TextEncoder,TextDecoder,crypto:require('node:crypto').webcrypto,
   location:{hostname:'localhost',pathname:'/',hash:''},localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},
   document:{addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],documentElement:{},createElement:()=>({})},
   navigator:{onLine:true},addEventListener:noop,setTimeout:()=>0,clearTimeout:noop,matchMedia:()=>({matches:true}),
   atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};
 ctx.window=ctx;
 vm.createContext(ctx);
 for(const n of ['content.js','cursos.js','desafios.js','ilus.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+n,'utf8'),ctx);
 let source=fs.readFileSync(__dirname+'/app.js','utf8').split('/* ===================== início ===================== */')[0];
 source+='\npersist=()=>{};paintTop=()=>{};som=()=>{};floatXP=()=>{};window.testAPI={blank,norm,act,legacy:xpLegacy,total:xpTotal,snapshot:scoreSnapshot,level:nivel,claudeStats,progStats,facStats,viewHoje,viewTrajetoria,parts:xpPartes,importState:o=>{S=norm(o);},state:()=>S,reviewKey:weekKey};})();';
 vm.runInContext(source,ctx);return ctx.testAPI;
}
test('real app migrates legacy XP, preserves state and displays all career studies',()=>{
 const a=load(),s=a.blank();s.nome='Teste';s.extSeed=true;
 s.prog[0]={done:true,ok:4,tot:8};s.bonus['2026-10-24']=true;
 s.fac.discs=[{id:'d1',nome:'Redes',aprovada:true,notas:{av1:8},topicos:[{t:'IP',ok:true}],entregas:[]}];
 s.ext.criadores={m:{1:35},a:{}};s.ranks={3:'2026-10-24'};s.presentes=[];
 a.importState(s);const before=a.legacy(),total=a.total();assert.equal(total,before);
 assert.equal(a.state().prog[0].done,true);assert.equal(a.state().ranks[3],'2026-10-24');
 assert.equal(a.state().xpLedger.previousRanks[3],'2026-10-24');
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),0);
 const page=a.viewHoje();assert.match(page,/Design: 35\/299/);assert.match(page,/Faculdade: 1\/1 disciplinas aprovadas/);
 assert.match(a.viewTrajetoria(),/Prática e projetos/);
 assert.equal(a.parts().reduce((n,r)=>n+r[1],0),total);
});
test('new real course work uses balanced rates, no legacy rewards reissued',()=>{
 const a=load(),s=a.blank();s.extSeed=true;a.importState(s);assert.equal(a.total(),0);
 a.state().prog[0]={done:true,ok:4,tot:8};
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),35);
 a.state().prog[0].ok=8;
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),15);
 a.state().ext.criadores={m:{1:1},a:{}};
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),20);
 a.state().fac.discs=[{id:'d',nome:'Redes',aprovada:true,notas:{av1:8},topicos:[{t:'IP',ok:true}],entregas:[{t:'Trabalho',ok:true}]}];
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),260);
 assert.equal(a.total(),330);
});
test('actual action pipeline preserves history for zero-XP toggles and suppresses imports',()=>{
 const a=load();a.importState(a.blank());a.total();
 assert.equal(a.act(()=>{a.state().prog[0]={done:true};},'prog'),20);
 assert.equal(a.act(()=>{a.state().prog[0].done=false;},'prog'),0);
 assert.equal(a.state().log[0].xp,0);
 assert.equal(a.act(()=>{a.state().prog[0].done=true;},'prog'),0);
 assert.equal(a.act(()=>{a.state().prog[1]={done:true,ok:5,tot:5};},'import','Histórico importado'),0);
 assert.equal(a.total(),20);assert.equal(a.state().log[0].k,'import');
});
test('partial faculty grades never award approval points without final confirmation',()=>{
 const a=load();a.importState(a.blank());a.total();
 a.state().fac.discs=[{id:'d',nome:'Redes',notas:{av1:8},topicos:[],entregas:[]}];
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),0);
 a.state().fac.discs[0].aprovada=true;
 assert.equal(P.reconcile(a.state().xpLedger,a.snapshot()),200);
});
