(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LionCore=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function clock(now=new Date()){
  const fields=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {hour:Number(fields.hour),day:fields.weekday,key:`${fields.year}-${fields.month}-${fields.day}`,date:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long',day:'numeric',month:'long'}).format(now),time:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(now)};
 }
 function greeting(now){const c=clock(now);return `${c.hour<12?'Bom dia':c.hour<18?'Boa tarde':'Boa noite'}! Sou o Lion Cristal. Hoje é ${c.date}. Vamos evoluir juntos?`;}
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
 function settings(value){return {auto:value?.auto!==false,water:20,walk:60,motion:value?.motion!==false};}
 function due(elapsed,last,prefs){if(!prefs.auto)return null;if(elapsed-last.walk>=prefs.walk*60000)return 'walk';if(elapsed-last.water>=prefs.water*60000)return 'water';if(elapsed-last.study>=25*60000)return 'study';return null;}
 return {clock,greeting,suggestion,settings,due};
});
