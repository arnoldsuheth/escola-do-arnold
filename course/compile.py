"""Gera o bundle a partir do conteúdo v2 revisado, sem reintroduzir quizzes genéricos."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
data=json.loads((root/'course/lessons-v2.json').read_text())
assert data['version']==2
assert [x['id'] for x in data['lessons']]==list(range(71))
for x in data['lessons']:
 assert all(x.get(k) for k in ['title','theory','deep','code','explain','tasks','expected','bug','challenge','file','setup','reference'])
 assert len(x['quiz'])>=2
 for q in x['quiz']:
  assert 0<=q['answer']<len(q['options']) and q['explanation']
(root/'programacao.js').write_text('/* Conteúdo autoral v2; IDs estáveis preservam histórico e sincronização. */\nwindow.EVO_COURSE_DATA = '+json.dumps(data,ensure_ascii=False)+';\n')
print(f"{len(data['lessons'])} aulas validadas e compiladas.")
