# Evolution Lab

A escola particular do Arnold: **Curso de Claude** (do zero ao avançado), **Curso de Programação** (site BLESSAINT) e acompanhamento da **Faculdade Estácio** (Ciência da Computação).

- App web instalável (PWA), funciona no celular e no PC, inclusive offline.
- Login com senha. O progresso é salvo criptografado (AES-GCM) num Gist secreto; a chave de salvamento fica no `cofre.json`, também criptografada com a senha.
- Gamificação: XP, níveis, sequência de dias, missões do dia, conquistas e quiz com combo.

Acesse: https://arnoldsuheth.github.io/evolution-lab/

## Sincronização com a Estácio
Uma tarefa agendada lê a sala de aula da Estácio todo dia às 00:00 e grava `faculdade.enc.json`, criptografado com a chave pública do cofre (RSA-OAEP + AES-GCM, ver `tools/atualizar-faculdade.mjs`). Só a escola, desbloqueada com a senha, consegue ler.



# Organização vigente - 28/10/2026

O Evolution Lab Next está pausado/arquivado por decisão do Arnold. O Evolution Lab comum (`arnoldsuheth/evolution-lab`) é o Lab ativo para estudos e catálogo de projetos.

Clientes, prospecção, propostas, contratos, parcelas, mensalidades e checklist de direitos pertencem exclusivamente ao painel privado Studio Evolution Tech. Todo novo cliente comercial citado deve ser cadastrado lá como Prospectando, salvo quando Arnold informar uma etapa mais avançada. Evitar duplicatas e nunca presumir pagamento, limite de ajustes, contato ou prazo. Negócios próprios e da família são identificados separadamente. Esta regra substitui a instrução anterior de duplicar clientes no Lab.

No Lab comum, manter somente os links de projetos e o atalho da gestão; não copiar cadastros nem valores privados. Remover a área comercial duplicada da interface, preservando os registros antigos em backup/recuperação até uma conferência de migração, sem apagar silenciosamente dados criptografados.

Toda entrega de projeto segue: salvar/versionar, publicar e conferir acesso e registrar o link em Meus sites do Lab comum.

Manual de uso em PDF é obrigatório somente para projetos entregues a clientes: criar, conferir e salvar o PDF com logo oficial e timbre Studio Evolution Tech, entregando link + manual. Projetos próprios e internos do Arnold, como Evolution Lab, Studio Evolution Tech, BLESSAINT e seus painéis internos, ficam dispensados de manual, salvo pedido explícito. Esta exceção foi solicitada por Arnold em 28/10/2026 e substitui a obrigatoriedade geral anterior. Os manuais já existentes não precisam ser excluídos.

Manuais de clientes não contêm acesso ao painel interno, resultados financeiros, credenciais ou dados de outros clientes.

Não retomar desenvolvimento, sincronização, tutor ou novas gravações no Next sem nova solicitação expressa. Arquivamento é reversível; preservar código, bancos e histórico.
