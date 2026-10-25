const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function load({unsupported=false,throws=false}={}){
 const calls={spoken:[],events:[],cancels:0},listeners={};
 const br={lang:'pt-BR',localService:true},en={lang:'en-US',localService:true};
 const env={document:{hidden:false,addEventListener:(k,f)=>listeners[k]=f,dispatchEvent:e=>calls.events.push(e)},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  speechSynthesis:{getVoices:()=>[en,br],cancel:()=>calls.cancels++,speak:u=>{if(throws)throw Error('No voice');calls.spoken.push(u);}}};
 if(unsupported){delete env.speechSynthesis;delete env.SpeechSynthesisUtterance;}
 const ctx={window:env};vm.runInNewContext(fs.readFileSync(__dirname+'/feedback.js','utf8'),ctx);
 return {api:env.EvoFeedback,env,calls,listeners,br};
}
test('answers choose Brazilian voice and replace previous speech instead of piling up',()=>{
 const {api,calls,br}=load();api.respond(true);api.respond(false);
 assert.equal(calls.spoken.length,2);assert.equal(calls.cancels,2);
 assert.equal(calls.spoken[0].voice,br);assert.equal(calls.spoken[0].lang,'pt-BR');
 assert.match(calls.spoken[0].text,/Acertou/);assert.match(calls.spoken[1].text,/cê me quebra/);
 assert.deepEqual(calls.events.map(e=>e.detail.kind),['ok','bad']);
});
test('sound and voice switches mute speech while retaining visual feedback',()=>{
 const {api,calls}=load();api.respond(true,{sound:false});api.respond(false,{voice:false});
 assert.equal(calls.spoken.length,0);assert.equal(calls.events.length,2);
});
test('missing speech API or failed speech leaves both result paths usable',()=>{
 for(const opts of [{unsupported:true},{throws:true}]){
  const {api,calls}=load(opts);assert.doesNotThrow(()=>api.respond(true));assert.doesNotThrow(()=>api.respond(false));
  assert.equal(calls.events.length,2);
 }
});
test('backgrounding stops ongoing speech and never starts another utterance',()=>{
 const {api,env,calls,listeners}=load();api.respond(true);env.document.hidden=true;listeners.visibilitychange();api.respond(false);
 assert.equal(calls.cancels,2);assert.equal(calls.spoken.length,1);
});
