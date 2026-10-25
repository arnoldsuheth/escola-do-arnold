# Evolution Lab — atualização de progresso e aprendizagem

## Alterações

- Lion com levitação mais expressiva, aura/orbita e reações ao toque e às respostas. Respeita pausa de movimento e movimento reduzido do aparelho.
- Botões existentes com acabamento de vidro, reflexo, iluminação no hover e retorno de toque; formato e paleta preservados. Árvores de tecnologia sem alterações.
- Retorno de acerto e erro mantém os tons/vibrações e acrescenta falas sintetizadas em português nos quizzes Claude e Arena. Controle separado de voz, testes sem XP em Perfil → Ajustes e suporte móvel sem bloquear estudo quando áudio/voz/vibração não estão disponíveis.

- Painel soma Claude, Programação e Academia de Criadores no contador de aulas e detalha a Faculdade por disciplinas, tópicos e entregas.
- Níveis: Iniciante, Trainee, Júnior I, Júnior II, Pleno I, Pleno II, Sênior, Especialista Técnico e Especialista Sênior.
- Limites de XP: 0, 1.000, 3.000, 7.000, 14.000, 25.000, 40.000, 65.000 e 100.000.
- Primeiro acesso à atualização preserva o saldo real anterior e registra uma base para impedir que conclusões antigas pontuem novamente. Aulas, notas, conquistas, hobbies, histórico e credenciais não são apagados.
- Novas atividades: aula de carreira 20; quiz até 30; revisão relâmpago de Claude 10 por conteúdo por semana; tópico da faculdade 10; entrega da faculdade 50; aprovação final confirmada e acima da média 200; missões diárias completas 10.
- Os quizzes da Arena de carreira passam a valer até 30 XP pelo melhor resultado; combo e chefão não substituem projeto prático. Hobbies mantêm regras próprias.
- Bônus de módulos da carreira dão lugar a exercícios e projetos com avaliação manual registrada na Trajetória: exercício 50 e projeto 150. Cada link específico de entrega pontua uma vez.
- Leituras e checklists da área seguem no acompanhamento, sem bônus automático de carreira: a aplicação prática pode ser registrada na Trajetória.
- Projetos exigem link, avaliador, observações e confirmação dos critérios. O registro é manual, não uma certificação automática.
- Promoções exigem projetos cumulativos: Júnior I 1; Júnior II 2; Pleno I 3 e integrador; Pleno II 4; Sênior 5 e autonomia; Especialista Técnico 6 e documentação; Especialista Sênior 8 e avaliação final. Requisitos anteriores continuam exigidos.
- Repetições não premiam a conclusão novamente. Melhoras de quiz pagam apenas a diferença. Importar histórico de programação não gera XP nem atividade retroativa no dia atual.
- Meta diária separa total do dia e objetivo; histórico pendente é explicado; textos auxiliares ficam mais legíveis.
- Entrada ganha mostrar/ocultar senha. Manter conectado continua disponível e marcado como antes.
- Aplicativo offline atualizado com os novos arquivos.

## Verificação

Execute `node --test progression.test.cjs integration.test.cjs`.
Dez testes cobrem migração, saldo legado, taxas novas, repetição, importação, registros sem XP, resultado final da faculdade, segurança dos links e requisitos de promoção.

## Cópias e restauração

A pasta de atualização no Drive contém a versão anterior do código e a versão atualizada. O progresso pessoal continua na sincronização criptografada existente; esses ZIPs são cópias do projeto, não uma exportação do progresso da conta.

Recarregue as abas abertas após a atualização para usar as mesmas regras em todos os aparelhos. A migração só é gravada depois de carregar o progresso disponível na nuvem; sem conexão, utiliza o progresso salvo no aparelho.

## Publicação

Base anterior: 3c3e8aea77a5c827cef6dd267bf8ab137541165e.
As patentes representam marcos de aprendizagem da plataforma; não equivalem a certificação ou enquadramento profissional.

## Organização visual do progresso

Progresso por área recolhível, em caixas com barra, percentual e brilho discreto: vermelho abaixo de 45%, amarelo entre 45% e 65% inclusive, verde acima de 65%. Explicação dos níveis recolhível; tarefas vazias ocultas; carreira mobile mostra nível atual e próximo. Nenhuma regra de XP ou dado foi alterado neste ajuste visual.

Medidores circulares de 20 blocos aplicados somente em Progresso por área (Claude, Programação, Design e Faculdade). Mantidas as cores por percentual e o brilho discreto. Nenhuma alteração nas árvores, demais medidores, pontuação ou dados.

## Lion Suheth

Mascote selecionado com arte transparente, movimento discreto, botão móvel e janela de apoio arrastável. Balão de fala acima do mascote: saudações pela data e hora de Brasília, sugestões de estudo conforme página/período do dia e missões concluídas; água a cada 20 minutos e caminhada a cada 1 hora de aba visível e em foco. A janela só abre por clique. Lembretes podem ser silenciados; animação respeita movimento reduzido. Regras locais, sem IA conectada, sem custos de API ou notificações fora da plataforma. Preferências locais separadas do progresso; nenhuma alteração no XP, árvores ou cursos. Testes de regras de horário, contexto e lembretes adicionados (13 testes no total).

## Adaptação a celular e transparência do Lion

Ajustados área visível, rotação, limites de arraste, balão acima/abaixo do mascote, menu inferior, área segura, fechamento fixo e botões para toque. Layout geral em colunas no celular, formulários e rolagem responsivos; árvores e pontuação preservadas. Incluída a opção Como o Lion funciona na janela, com esclarecimento de que não acessa esta conversa do ChatGPT e que as preferências e os contadores não são compartilhados entre aparelhos. Guia LION-COMO-FUNCIONA.md adicionado. Verificações de limites em 320×568, 390×844 e 844×390; 16 testes automatizados passam.
