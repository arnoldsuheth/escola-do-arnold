import json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
records=json.loads((root/'course/base-lessons.json').read_text())
source=(root/'content.js').read_text()
old=source[source.index('const PROG_AULAS'):source.index('const PROG_PONTOS_FRACOS')]
titles={int(n):t for n,t in re.findall(r'\[(\d+),"[^"]*","([^"]+)"\]',old)}
extra=['JSON e contratos de dados','HTTP e catálogo remoto','Assincronismo e cancelamento','Módulos e arquitetura JavaScript','TypeScript e tipos de domínio','React: componentes e propriedades','React: estado e carrinho','React: efeitos e integração','Node.js: seu primeiro servidor','API: contratos e validação','SQL: persistência e restrições','Relacionamentos e variantes','Banco conectado e transações','Autenticação e autorização','Segurança nas fronteiras','Testes de lógica e regressões','Testes de integração e jornada','Deploy, ambientes e recuperação','Auditoria e manutenção','Projeto final: demonstrar autonomia']
titles.update({51+i:t for i,t in enumerate(extra)})
for x in records:
 x['title']=titles[x['id']]; x['minutes']=120 if x['id']<51 else 180
 # Four different checks: concept, expected output, diagnostic reasoning and transfer.
 qs=[(x['question'],x['choices']),('Qual resultado você deve verificar nesta prática?',[x['expected'],'Apenas que o arquivo foi salvo, sem executar o cenário.','Somente que a página tem aparência parecida, sem conferir comportamento.','Nenhum resultado: uma execução sem mensagem basta.']),('Qual cuidado evita uma conclusão incorreta nesta aula?',[x['bug'],'Se o primeiro exemplo funcionou, não é necessário investigar outros casos.','Alterar vários arquivos sem testar entre as alterações.','Ignorar os erros e marcar a prática como concluída.']),('Qual exercício demonstra que você consegue aplicar o conteúdo?',[x['challenge'],'Copiar o exemplo sem executar nem explicar.','Marcar todas as tarefas antes de testar.','Trocar apenas o título da página e encerrar o módulo.'])]
 x['quiz']=[]
 for j,(q,opts) in enumerate(qs):
  rot=(x['id']+j)%4; opts=opts[rot:]+opts[:rot]
  correct=(-rot)%4
  x['quiz'].append({'question':q,'options':opts,'answer':correct,'explanation':('Conceito: '+x['explain']) if j==0 else ['','Conferir o resultado esperado demonstra comportamento, não só edição. '+x['expected'],'Este diagnóstico ajuda a localizar a causa. '+x['bug'],'Autonomia exige executar uma variação e explicar o raciocínio. '+x['challenge']][j]})
phases=[('HTML e fundamentos',0,8),('CSS e experiência móvel',9,24),('Git e primeira publicação',25,28),('Lógica com JavaScript',29,39),('BLESSAINT interativa',40,50),('Dados e arquitetura',51,54),('TypeScript e React',55,58),('Servidor e banco de dados',59,63),('Identidade, segurança e testes',64,67),('Entrega e autonomia',68,70)]
data={'version':1,'title':'Evolução Tech · Construindo a BLESSAINT','phases':[dict(name=n,start=a,end=b) for n,a,b in phases],'lessons':records,'history':'Você já estudou HTML, CSS e eventos; retomada histórica entre as aulas 7 e 8, com CSS e frente/costas pendentes de conferência. Essa numeração antiga não corresponde necessariamente aos tópicos abaixo. Registros já salvos são preservados; nenhuma nota foi inventada.','sources':[{'name':'MDN · desenvolvimento web','url':'https://developer.mozilla.org/en-US/docs/Learn_web_development'},{'name':'React · documentação','url':'https://react.dev/learn'},{'name':'Node.js · HTTP','url':'https://nodejs.org/api/http.html'},{'name':'PostgreSQL · tutorial','url':'https://www.postgresql.org/docs/current/tutorial.html'},{'name':'Git · livro oficial','url':'https://git-scm.com/book/pt-br/v2'}]}
(root/'programacao.js').write_text('/* Conteúdo autoral do curso; os IDs 0–50 preservam o cronograma anterior. */\nwindow.EVO_COURSE_DATA = '+json.dumps(data,ensure_ascii=False)+';\n')
print(f'{len(records)} aulas, {sum(len(x["quiz"]) for x in records)} questões')
