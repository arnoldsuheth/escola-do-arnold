# Evolution Tech — curso v2

Modelo aprovado aplicado às 71 aulas, com oito etapas, 142 questões, prática e desafio próprios. Conteúdo canônico: `lessons-v2.json`; gere `programacao.js` com `python3 course/compile.py`. Os scripts `build_content.py` e o material v1 permanecem apenas como histórico editorial.

- `course-ui.js` usa o adaptador de estado do app; rascunhos não lançam XP. `courseV1`, notas e IDs anteriores são preservados; novos registros ficam em `courseV2`.
- Telas mostram aulas 1–71. O id 0 continua em `#prog-0` para preservar links e dados.
- `curso-evolution-tech.html` permite consulta independente, com progresso local separado do Lab. A área `#prog` do app usa a sincronização já existente.
- HTML/CSS podem ser experimentados em iframe isolado sem scripts; DOM, React, SQL e Node exigem o ambiente indicado na aula.
- As entregas são autoavaliação registrada. A revisão externa de projeto permanece na Trajetória.
- `claude-review.js` corrige explicações de memória, instruções e API sem reescrever o curso ou mudar suas notas.

Validação: `node --test *.test.cjs`. A inspeção em navegador cobre etapas, rascunhos, prática, quiz, entrega, recarga e preservação de registros antigos. Testes de nuvem autenticada e aparelho físico não foram executados nesta atualização.
