/* Falas curtas de resultado, pela voz em português disponível no navegador. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.EvoFeedback=api;
})(typeof window!=='undefined'?window:globalThis,function(env){
 'use strict';
 const phrases={ok:'Acertou, miseraviii!!',bad:'Erroou! Aí cê me quebra!'};
 let utterance=null;
 function stop(){try{if(env.speechSynthesis)env.speechSynthesis.cancel();}catch(e){}utterance=null;}
 function respond(correct,options={}){
  const kind=correct?'ok':'bad',text=phrases[kind];
  // Reação visual continua funcionando mesmo sem som ou sem suporte a voz.
  if(env.document&&env.CustomEvent)env.document.dispatchEvent(new env.CustomEvent('evolab:answer',{detail:{kind,text}}));
  if(options.sound===false||options.voice===false||env.document&&env.document.hidden)return text;
  const synth=env.speechSynthesis;
  if(!synth||!env.SpeechSynthesisUtterance)return text;
  try{
   stop();
   utterance=new env.SpeechSynthesisUtterance(text);
   const voices=synth.getVoices(),pt=voices.filter(v=>/^pt[-_]BR$/i.test(v.lang));
   const voice=pt.find(v=>v.localService)||pt[0]||voices.find(v=>/^pt\b/i.test(v.lang));
   if(voice)utterance.voice=voice;
   utterance.lang='pt-BR';utterance.rate=correct?1.08:1;utterance.pitch=correct?1.15:.9;utterance.volume=.85;
   // Chamada síncrona a partir do toque em Verificar/Testar (compatibilidade móvel).
   synth.speak(utterance);
  }catch(e){/* Os tons e o feedback visual continuam disponíveis. */}
  return text;
 }
 if(env.document)env.document.addEventListener('visibilitychange',()=>{if(env.document.hidden)stop();});
 return {respond,stop,phrases};
});
