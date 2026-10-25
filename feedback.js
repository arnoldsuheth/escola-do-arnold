/* Falas curtas de resultado, pela voz em português disponível no navegador. */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.EvoFeedback=api;
})(typeof window!=='undefined'?window:globalThis,function(env){
 'use strict';
 const phrases={ok:'Acertou, miseraviii!!',bad:'Erroou! Aí cê me quebra!'};
 const CLIPS=[['Isso aí, craque!','01'],['Acertou, miseraviii!!','02'],['Mandou bem demais!','03'],['Quase! Dá uma olhada na explicação e volta.','04'],['Opa, essa escapou! Bora de novo.','05'],['Erroou! Aí cê me quebra!','06'],['Promoção!','07',1],['Presente novo!','08',1],['Todas as quests de hoje! Você está imparável.','09'],['Água! Seu cérebro agradece e eu também.','10'],['Que tal fazer uma pausa para tomar água?','11',1],['Vamos esticar as pernas? Cinco minutinhos e a cabeça volta nova.','12'],['Hora de uma pausa? Levante, caminhe um pouco e descanse os olhos','13',1]];
 function clipFor(text){const t=String(text||'');const c=CLIPS.find(x=>x[2]?t.startsWith(x[0]):t===x[0]);return c?'assets/voz/'+c[1]+'.mp3':'';}
 let audio=null,utterance=null,cfg={voiceName:'',rate:1,phrase:null};
 function configure(o){cfg=Object.assign({},cfg,o||{});}
 const MALE=/\b(felipe|daniel|ricardo|antonio|ant[oô]nio|donato|jorge|paulo|lucas|rafael|thiago|fabio|f[aá]bio|male|masculin)/i;
 const FEMALE=/\b(luciana|maria|francisca|vit[oó]ria|camila|giovanna|helena|fernanda|female|feminin)/i;
 const isMale=v=>MALE.test(v.name)&&!FEMALE.test(v.name);
 function pickVoice(synth){const voices=synth.getVoices(),pt=voices.filter(v=>/^pt[-_]BR$/i.test(v.lang)),all=pt.concat(voices.filter(v=>/^pt\b/i.test(v.lang)&&!pt.includes(v)));if(cfg.voiceName){const chosen=voices.find(v=>v.name===cfg.voiceName);if(chosen)return chosen;}return all.find(v=>isMale(v)&&v.localService)||all.find(isMale)||pt.find(v=>v.localService&&!FEMALE.test(v.name))||pt[0]||all[0];}
 function hasMale(synth){try{return synth.getVoices().some(v=>/^pt\b/i.test(v.lang)&&isMale(v));}catch(e){return false;}}
 function say(text,correct){if(cfg.voiceName==='__off')return false;const file=clipFor(text);if(file&&typeof env.Audio==='function'){try{stop();audio=new env.Audio(file);audio.volume=.95;const pr=audio.play();if(pr&&pr.catch)pr.catch(()=>{audio=null;speakTTS(text,correct);});return true;}catch(e){}}return speakTTS(text,correct);}
 function speakTTS(text,correct){const synth=env.speechSynthesis;if(!synth||!env.SpeechSynthesisUtterance)return false;try{stop();utterance=new env.SpeechSynthesisUtterance(text);const voice=pickVoice(synth);if(voice)utterance.voice=voice;utterance.lang='pt-BR';utterance.rate=(correct===true?1.08:1)*(cfg.rate||1);const male=voice&&isMale(voice);utterance.pitch=(male?1:(cfg.pitch||.78))*(correct===true?1.08:correct===false?.92:1);utterance.volume=.85;synth.speak(utterance);return true;}catch(e){return false;}}
 function stop(){try{if(audio){audio.pause();audio=null;}}catch(e){}try{if(env.speechSynthesis)env.speechSynthesis.cancel();}catch(e){}utterance=null;}
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
 return {respond,stop,phrases,configure,say,clipFor};
});
