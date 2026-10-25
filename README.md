# Escola do Arnold

A escola particular do Arnold: **Curso de Claude** (do zero ao avançado), **Curso de Programação** (site BLESSAINT) e acompanhamento da **Faculdade Estácio** (Ciência da Computação).

- App web instalável (PWA), funciona no celular e no PC, inclusive offline.
- Login com senha. O progresso é salvo criptografado (AES-GCM) num Gist secreto; a chave de salvamento fica no `cofre.json`, também criptografada com a senha.
- Gamificação: XP, níveis, sequência de dias, missões do dia, conquistas e quiz com combo.

Acesse: https://arnoldsuheth.github.io/escola-do-arnold/

## Sincronização com a Estácio
Uma tarefa agendada lê a sala de aula da Estácio todo dia às 00:00 e grava `faculdade.enc.json`, criptografado com a chave pública do cofre (RSA-OAEP + AES-GCM, ver `tools/atualizar-faculdade.mjs`). Só a escola, desbloqueada com a senha, consegue ler.
