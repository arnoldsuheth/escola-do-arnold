const test=require('node:test'),assert=require('node:assert/strict'),C=require('./lion-core.js');
test('Brasilia clock handles date boundary and greetings',()=>{const d=new Date('2026-10-26T01:00:00Z');assert.equal(C.clock(d).key,'2026-10-25');assert.equal(C.clock(d).hour,22);assert.match(C.greeting(d),/^Boa noite/);assert.match(C.greeting(new Date('2026-10-25T12:00:00Z')),/^Bom dia/);});
test('suggestion adapts to page, completed missions, weekend and late night',()=>{assert.match(C.suggestion('#curso-criadores',false,new Date('2026-10-26T18:00:00Z')),/design/);assert.match(C.suggestion('#hoje',true,new Date('2026-10-25T18:00:00Z')),/concluídas/);assert.match(C.suggestion('#hoje',false,new Date('2026-10-25T18:00:00Z')),/semana/);assert.match(C.suggestion('#prog',false,new Date('2026-10-26T06:00:00Z')),/madrugada/);});
test('reminder intervals default to 20 and 60 minutes, accept only allowed choices, and respect mute',()=>{const d=C.settings({}),last={walk:0,water:0,study:0};assert.equal(d.water,20);assert.equal(d.walk,60);const odd=C.settings({water:7,walk:999});assert.equal(odd.water,20);assert.equal(odd.walk,60);const p=C.settings({water:10,walk:30});assert.equal(p.water,10);assert.equal(p.walk,30);assert.equal(C.due(9*60000,last,p),null);assert.equal(C.due(10*60000,last,p),'water');assert.equal(C.due(30*60000,last,p),'walk');assert.equal(C.due(120*60000,last,{...p,auto:false}),null);});
test('mobile positioning clamps both orientations above bottom navigation',()=>{for(const [width,height] of [[320,568],[390,844],[844,390]]){const b={left:8,top:20,right:width-8,bottom:height-88},w=Math.min(380,width-24),h=Math.min(505,b.bottom-b.top);const p=C.clampBox(2000,2000,w,h,b);assert.ok(p.x>=b.left&&p.x+w<=b.right);assert.ok(p.y>=b.top&&p.y+h<=b.bottom);const moved=C.clampBox(-500,-500,w,h,b);assert.equal(moved.x,8);assert.equal(moved.y,20);}});
test('balloon fits above mascot or below when the mascot is at the top',()=>{const b={left:8,top:20,right:382,bottom:750};const above=C.bubblePosition({top:600,bottom:680,right:370},290,130,b);assert.equal(above.y,458);const below=C.bubblePosition({top:25,bottom:110,right:90},290,130,b);assert.equal(below.y,122);assert.equal(below.x,8);});
test('late-night greetings use boa noite in Brasilia',()=>{assert.match(C.greeting(new Date('2026-10-26T06:00:00Z')),/^Boa noite/);});

test('settings sanitise tone, voice, rate and quiet hours',()=>{const p=C.settings({tone:'x',rate:3,voiceName:5,quiet:{on:true,from:99,to:'a'}});assert.equal(p.tone,'divertido');assert.equal(p.rate,1);assert.equal(p.voiceName,'');assert.equal(p.quiet.from,23);assert.equal(p.quiet.to,7);assert.equal(C.settings({tone:'firme',rate:1.15}).rate,1.15);});
test('quiet hours cross midnight and can be off',()=>{const p=C.settings({quiet:{on:true,from:22,to:7}});assert.equal(C.isQuiet(p,new Date('2026-10-26T01:00:00Z')),true);assert.equal(C.isQuiet(p,new Date('2026-10-25T15:00:00Z')),false);assert.equal(C.isQuiet(p,new Date('2026-10-25T05:00:00Z')),true);assert.equal(C.isQuiet(C.settings({}),new Date('2026-10-26T01:00:00Z')),false);});
test('tones keep the original quiz lines and fill placeholders',()=>{assert.equal(C.phrase('divertido','ok',undefined,0),'Acertou, miseraviii!!');assert.equal(C.phrase('divertido','bad',undefined,0),'Erroou! Aí cê me quebra!');assert.match(C.phrase('motivador','levelup','Júnior I',0),/Júnior I/);assert.match(C.phrase('firme','goal',20,0),/20/);assert.ok(C.phrase('desconhecido','ok',undefined,1));});
test('smart reminders use real progress, once per day, never on Friday or while quiet',()=>{
 const prefs=C.settings({}),night=new Date('2026-10-26T23:00:00Z'),sent={};
 const exam=C.smart({provas:[{id:'a1',titulo:'AV1',disciplina:'Redes',dias:1}],xpHoje:0,sequencia:0},prefs,sent,new Date('2026-10-26T14:00:00Z'));
 assert.match(exam.text,/AV1 \(Redes\) é amanhã/);sent[exam.key]=1;
 assert.equal(C.smart({provas:[{id:'a1',titulo:'AV1',disciplina:'Redes',dias:1}],xpHoje:5,sequencia:0},prefs,sent,new Date('2026-10-26T14:00:00Z')),null);
 const streak=C.smart({provas:[],xpHoje:0,sequencia:5},prefs,{},night);assert.match(streak.text,/5/);
 assert.equal(C.smart({provas:[],xpHoje:0,sequencia:5},prefs,{},new Date('2026-10-23T23:00:00Z')),null,'sexta livre');
 assert.equal(C.smart({provas:[],xpHoje:0,sequencia:5},C.settings({quiet:{on:true,from:20,to:7}}),{},night),null);
 assert.equal(C.smart({provas:[],xpHoje:0,sequencia:5},C.settings({auto:false}),{},night),null);
});
test('goal nudge appears only when close to the daily goal',()=>{const p=C.settings({}),t=new Date('2026-10-26T21:00:00Z');assert.match(C.goalNudge({xpHoje:70,meta:100},p,{},t).text,/30/);assert.equal(C.goalNudge({xpHoje:10,meta:100},p,{},t),null);assert.equal(C.goalNudge({xpHoje:100,meta:100},p,{},t),null);});

test('Lion Tamagotchi: desgaste calmo, pausa na sexta e nunca abaixo de zero',()=>{
 const seg=Date.UTC(2026,9,26,12,0),sex=Date.UTC(2026,9,23,12,0);
 let p=C.petTick({},seg,{});p=C.petTick(p,seg+10*3600000,{});assert.deepEqual([p.fome,p.sede,p.energia],[65,60,60]);
 let f=C.petTick({},sex,{});f=C.petTick(f,sex+8*3600000,{});assert.equal(f.fome,80);assert.equal(f.sede,80);
 let q=C.petTick({},seg,{});q=C.petTick(q,seg+24*3600000*30,{});assert.ok(q.fome>=0&&q.sede>=0&&q.energia>=0);
 let n=C.petTick({},seg,{focus:true});n=C.petTick(n,seg+8*3600000,{focus:true});assert.equal(n.fome,80);
});
test('Lion Tamagotchi: ração a cada 40 XP, limite de 10 e sem retroativo',()=>{
 let r=C.petRation({},500);assert.equal(r.given,0);assert.equal(r.pet.xpSeen,500);
 r=C.petRation(r.pet,590);assert.equal(r.given,2);assert.equal(r.pet.racao,4);assert.equal(r.pet.xpSeen,580);
 r=C.petRation({racao:10,xpSeen:0},400);assert.equal(r.given,0);assert.equal(r.pet.racao,10);
});
test('Lion Tamagotchi: alimentar, beber, soneca e humor',()=>{
 assert.equal(C.petFeed({fome:50,racao:1}).pet.fome,80);assert.equal(C.petFeed({fome:50,racao:0}).why,'sem-racao');assert.equal(C.petFeed({fome:99,racao:3}).why,'cheio');
 assert.equal(C.petDrink({sede:30}).pet.sede,70);
 const p={energia:10,napDay:'2026-10-26',napN:3};assert.equal(C.petNap(p,'2026-10-26').why,'limite');assert.equal(C.petNap(p,'2026-10-27').ok,true);assert.equal(C.petNap({energia:95},'x').why,'sem-sono');
 assert.equal(C.petMood({fome:20,sede:80,energia:80},14,'x').state,'fome');assert.equal(C.petMood({fome:80,sede:10,energia:80},14,'x').label,'Com sede');
 assert.equal(C.petMood({fome:80,sede:80,energia:80},23,'x').state,'sono');assert.equal(C.petMood({fome:80,sede:80,energia:80},14,'x').state,'feliz');
});
