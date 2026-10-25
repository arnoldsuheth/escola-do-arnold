/* Avaliações manuais: o registro guarda evidência e critérios, não certifica profissão. */
(function(){
  "use strict";
  document.addEventListener("submit",function(e){
    if(e.target.id!=="practice-form")return;
    e.preventDefault();
    const form=e.target,data=new FormData(form),out=form.querySelector('[role="alert"]');
    const entry={id:typeof crypto.randomUUID==="function"?crypto.randomUUID():"p"+Date.now(),type:data.get("type"),title:String(data.get("title")||"").trim(),url:String(data.get("url")||"").trim(),reviewer:String(data.get("reviewer")||"").trim(),notes:String(data.get("notes")||"").trim(),functional:data.has("functional"),explained:data.has("explained"),reviewed:data.has("reviewed"),integrator:data.has("integrator"),autonomy:data.has("autonomy"),documentation:data.has("documentation"),finalAssessment:data.has("finalAssessment"),at:Date.now()};
    if(!EvoProgress.validEvidence(entry)){out.textContent="Preencha a entrega, o avaliador, ao menos 20 caracteres de observações e os três critérios de revisão.";return;}
    if(typeof window.evoRegisterPractice!=="function"){out.textContent="Entre na sua conta para registrar a avaliação.";return;}
    const error=window.evoRegisterPractice(entry);
    if(error)out.textContent=error;
  });
})();
