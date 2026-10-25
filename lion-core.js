(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LionCore=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function clock(now=new Date()){
  const fields=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {hour:Number(fields.hour),day:fields.weekday,key:`${fields.year}-${fields.month}-${fields.day}`,date:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long',day:'numeric',month:'long'}).format(now),time:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(now)};
 }
 function greeting(now,tone){const c=clock(now),hi=c.hour>=6&&c.hour<12?'Bom dia':c.hour>=12&&c.hour<18?'Boa tarde':'Boa noite';if(tone==='firme')return `${hi}. Hoje é ${c.date}. Vamos ao que importa.`;if(tone==='motivador')return `${hi}! Sou o Lion Suheth. Hoje é ${c.date}, um ótimo dia para avançar um passo.`;return `${hi}! Sou o Lion Suheth. Hoje é ${c.date}. Vamos evoluir juntos?`;}
 function suggestion(hash,done,now){
  const c=clock(now);
  if(c.hour<6)return 'Já é madrugada. Que tal anotar sua próxima tarefa e dar espaço ao descanso?';
  if(done)return 'Suas missões de hoje já estão concluídas! Uma revisão breve ou uma pausa pode ser um bom próximo passo.';
  const light=c.day==='Sat'||c.day==='Sun';
  if(c.day==='Fri')return 'Hoje pode ser um dia mais leve: revise uma dúvida ou pratique por alguns minutos, se quiser.';
  const time=light?'10 a 15 minutos':'20 a 25 minutos';
  if(/prog|aula-/.test(hash))return `Faça um bloco de ${time}: entenda um conceito, escreva um exemplo e tente explicar o resultado com suas palavras.`;
  if(/criadores|design/.test(hash))return `Que tal ${time} de design? Assista a uma aula e aplique uma técnica em uma peça sua.`;
  if(/fac/.test(hash))return `Dedique ${time} a um tópico da faculdade e resolva um exercício para conferir o entendimento.`;
  if(/arena|desafio/.test(hash))return 'Tente um desafio e revise as respostas que errou antes de passar ao próximo.';
  return light?'Fim de semana combina com estudo leve: uma aula curta, uma revisão ou uma prática de 10 a 15 minutos.':`Escolha uma aula para um bloco de ${time}. Depois, pratique um exemplo antes de continuar.`;
 }
 const TONES={divertido:'Divertido',motivador:'Motivador',firme:'Firme'};
 const BANK={
  divertido:{ok:['Acertou, miseraviii!!','Mandou bem demais!','Isso aí, craque!'],bad:['Erroou! Aí cê me quebra!','Opa, essa escapou! Bora de novo.','Quase! Dá uma olhada na explicação e volta.'],
   water:['Que tal fazer uma pausa para tomar água? Deixe sua garrafinha por perto e volte no seu ritmo.','Água! Seu cérebro agradece e eu também.'],
   walk:['Hora de uma pausa? Levante, caminhe um pouco e descanse os olhos antes de continuar.','Vamos esticar as pernas? Cinco minutinhos e a cabeça volta nova.'],
   levelup:['Promoção! Agora você é {x}. Até eu fiquei de queixo caído!'],gift:['Presente novo! {x}. Dá uma olhada quando puder.'],bonus:['Todas as quests de hoje! Você está imparável.'],
   exam:['{x}. Bora garantir essa?'],streak:['Sua sequência de {x} dias está no ar! Um bloco rapidinho salva tudo.'],routine:['Hoje ainda não teve estudo. Vamos fazer um bloco curtinho?'],goal:['Faltam {x} xp para a meta de hoje. Dá pra bater!']},
  motivador:{ok:['Excelente! Cada acerto constrói o seu futuro.','Muito bem! Você está evoluindo.','Isso! Continue assim.'],bad:['Faz parte do aprendizado. Revise e tente de novo.','Errar é treinar. Leia a explicação e siga em frente.','Sem problema. Você aprende mais com este erro do que com mil acertos fáceis.'],
   water:['Um gole de água ajuda a manter o foco. Cuide de você.','Pausa para hidratar: seu corpo sustenta seus estudos.'],
   walk:['Você merece uma pausa. Levante e caminhe um pouco, depois volte com mais energia.','Descanso também é estudo. Uma caminhada rápida e você retorna renovado.'],
   levelup:['Parabéns! Você subiu para {x}. Resultado do seu esforço.'],gift:['Você ganhou um presente por concluir mais uma etapa: {x}.'],bonus:['Quests do dia completas. Constância é o que transforma carreira.'],
   exam:['{x}. Um passo de cada vez e você chega preparado.'],streak:['Você já tem {x} dias seguidos. Que tal manter essa constância hoje?'],routine:['Um bloco curto hoje já mantém o ritmo. Você consegue.'],goal:['Faltam {x} xp para a meta de hoje. Está bem perto.']},
  firme:{ok:['Correto. Próxima.','Acertou. Mantenha o foco.','Certo. Siga.'],bad:['Errou. Leia a explicação e refaça.','Incorreto. Entenda o motivo antes de avançar.','Erro registrado. Corrija agora.'],
   water:['Beba água agora.','Pausa de água. Dois minutos e volte.'],
   walk:['Levante e caminhe cinco minutos. Depois retome.','Hora de pausar. Sem tela por alguns minutos.'],
   levelup:['Novo nível: {x}. Agora mire no próximo.'],gift:['Presente liberado: {x}. Use.'],bonus:['Quests do dia concluídas. Amanhã tem mais.'],
   exam:['{x}. Estude hoje.'],streak:['Sequência de {x} dias em risco. Faça um bloco agora.'],routine:['Hoje ainda não estudou. Comece por um bloco de 20 minutos.'],goal:['Faltam {x} xp para a meta. Termine.']}
 };
 function toneOf(t){return BANK[t]?t:'divertido';}
 function phrase(tone,kind,x,seed){const list=(BANK[toneOf(tone)][kind]||BANK.divertido[kind]||[''])||[''];const i=Math.abs(Number.isFinite(seed)?seed:Math.floor(Math.random()*1e6))%list.length;return String(list[i]).replace('{x}',x===undefined?'':x);}
 const pick=(v,list,def)=>list.includes(Number(v))?Number(v):def;
 function settings(value){
  const v=value||{},q=v.quiet||{};
  return {auto:v.auto!==false,motion:v.motion!==false,focus:v.focus===true,
   water:pick(v.water,[10,15,20,30,45,60],20),walk:pick(v.walk,[30,45,60,90,120],60),
   quiet:{on:q.on===true,from:Math.min(23,Math.max(0,Number.isFinite(Number(q.from))?Number(q.from):22)),to:Math.min(23,Math.max(0,Number.isFinite(Number(q.to))?Number(q.to):7))},
   tone:toneOf(v.tone),voiceName:typeof v.voiceName==='string'?v.voiceName.slice(0,120):'',rate:pick(v.rate,[0.85,1,1.15],1),speak:v.speak===true,pitch:pick(v.pitch,[0.6,0.78,1],0.78),pet:petClean(v.pet),at:Number(v.at)||0};
 }
 function isQuiet(prefs,now){if(!prefs.quiet||!prefs.quiet.on)return false;const h=clock(now).hour,a=prefs.quiet.from,b=prefs.quiet.to;if(a===b)return false;return a<b?h>=a&&h<b:h>=a||h<b;}
 /* Lembretes ligados ao progresso real. Cada tipo, no máximo uma vez por dia. */
 function smart(ctx,prefs,sent,now){
  if(!ctx||!prefs.auto||isQuiet(prefs,now))return null;
  const c=clock(now),tone=prefs.tone,fri=c.day==='Fri',weekend=c.day==='Sat'||c.day==='Sun';
  const used=k=>sent&&sent[k];
  const soon=(ctx.provas||[]).filter(p=>p.dias>=0&&p.dias<=3).sort((a,b)=>a.dias-b.dias)[0];
  if(soon&&!used('exam:'+soon.id)&&c.hour>=8){const quando=soon.dias===0?'hoje':soon.dias===1?'amanhã':`em ${soon.dias} dias`;return {key:'exam:'+soon.id,text:phrase(tone,'exam',`${soon.titulo} (${soon.disciplina}) é ${quando}`)};}
  if(ctx.xpHoje>0)return null;
  if(!fri&&ctx.sequencia>=2&&c.hour>=19&&!used('streak:'+c.key))return {key:'streak:'+c.key,text:phrase(tone,'streak',ctx.sequencia)};
  if(!fri&&!weekend&&c.hour>=19&&c.hour<23&&!used('routine:'+c.key))return {key:'routine:'+c.key,text:phrase(tone,'routine')};
  return null;
 }
 function goalNudge(ctx,prefs,sent,now){const c=clock(now);if(!ctx||!prefs.auto||isQuiet(prefs,now)||!ctx.meta)return null;const falta=ctx.meta-ctx.xpHoje;if(ctx.xpHoje>0&&falta>0&&falta<=Math.ceil(ctx.meta*.4)&&c.hour>=17&&!(sent&&sent['goal:'+c.key]))return {key:'goal:'+c.key,text:phrase(prefs.tone,'goal',falta)};return null;}
 function due(elapsed,last,prefs){if(!prefs.auto)return null;if(elapsed-last.walk>=prefs.walk*60000)return 'walk';if(elapsed-last.water>=prefs.water*60000)return 'water';if(elapsed-last.study>=25*60000)return 'study';return null;}
 function clampBox(x,y,width,height,bounds){return {x:Math.max(bounds.left,Math.min(bounds.right-width,x)),y:Math.max(bounds.top,Math.min(bounds.bottom-height,y))};}
 function bubblePosition(anchor,width,height,bounds){const top=anchor.top-height-12;return clampBox(anchor.right-width,top>=bounds.top?top:anchor.bottom+12,width,height,bounds);}

 /* ===== Lion Tamagotchi: fome, sede, energia, ração vinda do XP. Nunca morre; tudo é calculado pelo relógio e sincroniza com as preferências. ===== */
 const PET={xpPerRation:40,maxRation:10,startRation:2,capHours:24,decay:{fome:1.5,sede:2,energia:2},sleepGain:6,night:{from:22,to:6},feed:30,drink:40,nap:30,napsPerDay:3};
 const clamp100=(n,d)=>{n=Number(n);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):d;};
 function petClean(p){const v=p||{};const ration=Number(v.racao);return {at:Number(v.at)>0?Number(v.at):0,since:Number(v.since)>0?Number(v.since):0,fome:clamp100(v.fome,80),sede:clamp100(v.sede,80),energia:clamp100(v.energia,80),
  racao:Number.isFinite(ration)?Math.max(0,Math.min(PET.maxRation,Math.floor(ration))):PET.startRation,xpSeen:Number.isFinite(Number(v.xpSeen))&&v.xpSeen!==null&&v.xpSeen!==undefined?Number(v.xpSeen):null,
  playDay:typeof v.playDay==='string'?v.playDay.slice(0,10):'',napDay:typeof v.napDay==='string'?v.napDay.slice(0,10):'',napN:Math.max(0,Math.min(9,Math.floor(Number(v.napN)||0)))};}
 const isNight=h=>h>=PET.night.from||h<PET.night.to;
 /* avança o relógio do Lion hora a hora (no máximo 24 h por vez). Sexta, horário silencioso e modo foco pausam o desgaste. */
 function petTick(pet,nowMs,prefs){const p=petClean(pet);if(!p.at){p.at=nowMs;p.since=p.since||nowMs;return p;}
  if(!p.since)p.since=p.at;let t=Math.max(p.at,nowMs-PET.capHours*3600000);const pr=prefs||{};
  while(t<nowMs){const step=Math.min(3600000,nowMs-t),k=step/3600000,d=new Date(t),c=clock(d);t+=step;
   if(isNight(c.hour)){p.energia=Math.min(100,p.energia+PET.sleepGain*k);}
   if(c.day==='Fri'||pr.focus||isQuiet(pr,d))continue;
   p.fome=Math.max(0,p.fome-PET.decay.fome*k);p.sede=Math.max(0,p.sede-PET.decay.sede*k);if(!isNight(c.hour))p.energia=Math.max(0,p.energia-PET.decay.energia*k);}
  p.at=nowMs;return p;}
 function petRation(pet,xpNow){const p=petClean(pet);if(!Number.isFinite(xpNow))return {pet:p,given:0};if(p.xpSeen===null||xpNow<p.xpSeen){p.xpSeen=xpNow;return {pet:p,given:0};}
  const n=Math.floor((xpNow-p.xpSeen)/PET.xpPerRation),give=Math.min(n,PET.maxRation-p.racao);if(give>0){p.racao+=give;p.xpSeen+=give*PET.xpPerRation;}return {pet:p,given:Math.max(0,give)};}
 function petFeed(pet){const p=petClean(pet);if(p.fome>=95)return {pet:p,ok:false,why:'cheio'};if(p.racao<1)return {pet:p,ok:false,why:'sem-racao'};p.racao-=1;p.fome=Math.min(100,p.fome+PET.feed);return {pet:p,ok:true};}
 function petDrink(pet){const p=petClean(pet);if(p.sede>=95)return {pet:p,ok:false,why:'sem-sede'};p.sede=Math.min(100,p.sede+PET.drink);return {pet:p,ok:true};}
 function petNap(pet,dayKey){const p=petClean(pet);if(p.napDay!==dayKey){p.napDay=dayKey;p.napN=0;}if(p.energia>=90)return {pet:p,ok:false,why:'sem-sono'};if(p.napN>=PET.napsPerDay)return {pet:p,ok:false,why:'limite'};p.napN+=1;p.energia=Math.min(100,p.energia+PET.nap);return {pet:p,ok:true};}
 function petPlay(pet,dayKey){const p=petClean(pet);p.playDay=dayKey;return p;}
 function petMood(pet,hour,dayKey){const p=petClean(pet);const humor=Math.max(0,Math.min(100,Math.round((p.fome+p.sede+p.energia)/3*.85+(p.playDay===dayKey?15:0))));
  let state='feliz',label='Feliz';if(p.sede<25&&p.sede<=p.fome){state='fome';label='Com sede';}else if(p.fome<30){state='fome';label='Com fome';}else if(p.energia<25||isNight(hour)){state='sono';label='Sonolento';}
  return {state,label,humor,base:state==='fome'?'hungry':state==='sono'?'sleepy':'idle'};}
 function petDays(pet,nowMs){const p=petClean(pet);return p.since?Math.max(1,Math.floor((nowMs-p.since)/86400000)+1):1;}
 return {PET,petClean,petTick,petRation,petFeed,petDrink,petNap,petPlay,petMood,petDays,clock,greeting,suggestion,settings,due,clampBox,bubblePosition,TONES,phrase,isQuiet,smart,goalNudge};
});
