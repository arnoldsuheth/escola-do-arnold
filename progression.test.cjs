const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('./progression.js');
const project=(n,flags={})=>({id:'p'+n,type:'project',title:'Projeto '+n,url:'https://example.com/projeto/'+n,reviewer:'Professor',notes:'Entrega testada, explicada e revisada.',functional:true,explained:true,reviewed:true,...flags});
test('migration preserves actual balance, not a hardcoded sample',()=>{
 for(const old of [0,1688,3456]){const l=P.create(old,{a:50,b:700},1);assert.equal(P.total(l),old);assert.equal(P.reconcile(l,{a:50,b:700}),0);assert.equal(P.total(l),old);}
});
test('best score pays only improvement, undo/recheck cannot farm XP',()=>{
 const l=P.create(1688,{lesson:20,quiz:20},1);
 assert.equal(P.reconcile(l,{lesson:20,quiz:27}),7);
 assert.equal(P.reconcile(l,{lesson:0,quiz:0}),0);
 assert.equal(P.reconcile(l,{lesson:20,quiz:27}),0);
 assert.equal(P.total(l),1695);
});
test('historical import updates baseline without awarding points',()=>{
 const l=P.create(1688,{},1);assert.equal(P.reconcile(l,{oldLesson:50},true),0);assert.equal(P.total(l),1688);
 assert.equal(P.reconcile(l,{oldLesson:50,newLesson:20}),20);
});
test('weekly review and daily bonus are unique by content/date',()=>{
 const l=P.create(0,{},1),snap={'weekly:a:2026-10-19':10,'daily:2026-10-25':10};
 assert.equal(P.reconcile(l,snap),20);assert.equal(P.reconcile(l,snap),0);
 assert.equal(P.reconcile(l,{...snap,'weekly:a:2026-10-26':10}),10);
});
test('rank requires both XP and cumulative reviewed projects',()=>{
 assert.equal(P.level(1688,[]).nome,'Trainee');
 assert.equal(P.level(100000,[]).nome,'Trainee');
 assert.equal(P.level(3000,[project(1)]).nome,'Júnior I');
 const eight=Array.from({length:8},(_,n)=>project(n,{integrator:true,autonomy:true,documentation:true,finalAssessment:true}));
 assert.equal(P.level(100000,eight).nome,'Especialista Sênior');
 assert.equal(P.level(14000,[project(1),project(2),project(3)]).nome,'Júnior II');
 assert.equal(P.level(14000,[project(1,{integrator:true}),project(2),project(3)]).nome,'Pleno I');
});
test('unsafe, unreviewed and duplicate deliverables do not unlock promotion',()=>{
 assert.equal(P.validEvidence(project(1,{url:'javascript:alert(1)'})),false);
 assert.equal(P.validEvidence(project(1,{reviewer:''})),false);
 assert.equal(P.validEvidence(project(1,{reviewed:false})),false);
 assert.equal(P.evidence([project(1),project(1)]).length,1);
 assert.equal(P.level(7000,[project(1),project(1)]).nome,'Júnior I');
});
