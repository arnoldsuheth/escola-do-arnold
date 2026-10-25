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
   tone:toneOf(v.tone),voiceName:typeof v.voiceName==='string'?v.voiceName.slice(0,120):'',rate:pick(v.rate,[0.85,1,1.15],1),at:Number(v.at)||0};
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
 return {clock,greeting,suggestion,settings,due,clampBox,bubblePosition,TONES,phrase,isQuiet,smart,goalNudge};
});
