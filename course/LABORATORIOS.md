# Materiais de prática — Evolução Tech

## Como usar
Estude o exemplo, escreva sua implementação, teste e só então compare. As aulas 0–50 formam a vitrine; as aulas 51–70 ampliam o projeto. Reserve sessões adicionais para os laboratórios: a duração indicada na aula é uma referência.

## API local — aulas 59 e 60
Instale Node LTS pelo site oficial. Na pasta course, execute `node server-demo.mjs`. O terminal fica ocupado pelo servidor. Abra outro terminal para testar. O GET `/api/produtos` retorna uma lista. Faça POST JSON com id, nome e preco inteiro em centavos. Teste preço negativo (400), id duplicado (409), corpo acima de 16 KiB (413), tipo de conteúdo diferente (415) e JSON quebrado (400). Reiniciar limpa a memória: essa limitação é o motivo da etapa de SQL.

## Banco — aulas 61 a 63
Crie um banco local `blessaint_estudo`. Execute as tabelas das aulas na ordem: produtos antes de variantes. Instale `pg` na pasta do servidor e configure DATABASE_URL no ambiente. Use consultas parametrizadas. Substitua o Map pelas funções de consulta; teste novamente a matriz de status. Adicione migrações SQL numeradas ao repositório. Nunca versione senhas.

## Autenticação — aula 64
Este laboratório exige um provedor de identidade mantido. O exemplo didático de política não é um sistema de login pronto. Para implementar com Supabase Auth:
1. Crie um projeto de estudo e um usuário de teste. Não reutilize a base de produção.
2. Instale `@supabase/supabase-js`. Configure URL e chave pública no cliente. Chaves administrativas ficam exclusivamente no servidor.
3. No cliente, chame `auth.signInWithPassword({email,password})`. Trate erro, mostre estado de carregamento e use `auth.signOut()` no logout.
4. Envie o access_token em `Authorization: Bearer ...` na requisição de escrita. Não aceite o papel enviado no corpo.
5. No servidor, extraia o token, verifique com `auth.getUser(token)` e rejeite identidade ausente ou inválida com 401. Obtenha o papel de uma tabela administrada no servidor, vinculada ao ID retornado. Usuário sem papel adequado recebe 403.
6. Só depois da autorização execute a consulta de escrita. Use parâmetros SQL e trate erros sem divulgar segredos.
7. Teste visitante, leitor e administrador chamando a rota diretamente. Mudar o HTML ou o corpo para declarar papel admin deve continuar falhando.
8. Repita testes após expiração e logout. Para produção, revise armazenamento de sessão, política de origem, proteção CSRF quando usar cookies, limites de requisição e recuperação de acesso com a documentação oficial do provedor.

Documentação: https://supabase.com/docs/reference/javascript/auth-signinwithpassword e https://supabase.com/docs/reference/javascript/auth-getuser .

## Runbook de publicação — aula 68
1. Escolha um host que execute o servidor Node e um banco de teste compatível. Confira requisitos e custos antes de contratar.
2. Configure conexão e identidade no ambiente do servidor. Rode migrações em teste e faça backup.
3. Execute os testes e gere o front-end com `npm run build`. Configure a URL da API no ambiente de build; não inclua segredos no bundle.
4. Publique uma versão identificada por commit. Verifique HTTPS, health check, catálogo, login e autorização pela URL final.
5. Teste restauração de backup em banco de teste e retorno à versão anterior. Uma migração destrutiva pode exigir restauração, não apenas rollback do código.
6. Registre comandos, variáveis necessárias sem seus valores, URL, versão e passos de recuperação no README.

## Defesa final — aula 70
O avaliador deve conseguir instalar e rodar seguindo o README, consultar catálogo, usar filtros/carrinho, confirmar persistência, negar escrita ao visitante e leitor e permitir ao administrador. Exija testes que falhem quando a política ou cálculo é quebrado. Durante a demonstração, peça uma mudança pequena no requisito e avalie a explicação da solução. Registre avaliação e evidência na Trajetória; autoavaliação não equivale a revisão externa.
