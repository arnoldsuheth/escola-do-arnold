/* Falas curtas de resultado, pela voz em português disponível no navegador. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.EvoFeedback=api;
})(typeof window!=='undefined'?window:globalThis,function(env){
 'use strict';
 const phrases={ok:'Acertou, miseraviii!!',bad:'Erroou! Aí cê me quebra!'};
 let utterance=null,cfg={voiceName:'',rate:1,phrase:null};
 function configure(o){cfg=Object.assign({},cfg,o||{});}
 function pickVoice(synth){const voices=synth.getVoices(),pt=voices.filter(v=>/^pt[-_]BR$/i.test(v.lang));if(cfg.voiceName){const chosen=voices.find(v=>v.name===cfg.voiceName);if(chosen)return chosen;}return pt.find(v=>v.localService)||pt[0]||voices.find(v=>/^pt\b/i.test(v.lang));}
 function say(text,correct){const synth=env.speechSynthesis;if(!synth||!env.SpeechSynthesisUtterance)return false;try{stop();utterance=new env.SpeechSynthesisUtterance(text);const voice=pickVoice(synth);if(voice)utterance.voice=voice;utterance.lang='pt-BR';utterance.rate=(correct===true?1.08:1)*(cfg.rate||1);utterance.pitch=correct===true?1.15:correct===false?.9:1;utterance.volume=.85;synth.speak(utterance);return true;}catch(e){return false;}}
 function stop(){try{if(env.speechSynthesis)env.speechSynthesis.cancel();}catch(e){}utterance=null;}
 function respond(correct,options={}){
  const kind=correct?'ok':'bad';
  let text=phrases[kind];
  try{if(typeof cfg.phrase==='function')text=cfg.phrase(kind)||text;}catch(e){}
  // Reação visual continua funcionando mesmo sem som ou sem suporte a voz.
  if(env.document&&env.CustomEvent)env.document.dispatchEvent(new env.CustomEvent('evolab:answer',{detail:{kind,text}}));
  if(options.sound===false||options.voice===false||env.document&&env.document.hidden)return text;
  // Chamada síncrona a partir do toque em Verificar/Testar (compatibilidade móvel).
  say(text,!!correct);
  return text;
 }
 if(env.document)env.document.addEventListener('visibilitychange',()=>{if(env.document.hidden)stop();});
 return {respond,stop,phrases,configure,say};
});
