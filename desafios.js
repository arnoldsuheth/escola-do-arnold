/* Evolution Lab · Arena de desafios.
   Exercícios originais criados pelo Claude a partir dos temas de cada curso (nomes dos módulos e do cronograma).
   Não reproduzem o material das plataformas: são perguntas próprias sobre o assunto de cada módulo.
   Formato de cada questão: [pergunta, [opções], índice da correta, explicação] */
const DESAFIOS = {
 prog: {nome:"Programação", sub:"Site BLESSAINT", carreira:true, cor:"#A78BFA", rota:"#prog", fases:[
  {t:"HTML", sub:"estrutura e tags", q:[
   ["Qual tag guarda o conteúdo que aparece na página?", ["<head>","<body>","<meta>","<title>"], 1, "O <head> guarda informações para o navegador; o que o usuário vê fica no <body>."],
   ["Para um link abrir o Instagram da BLESSAINT, qual atributo leva o endereço?", ["src","alt","href","link"], 2, "Em <a>, o destino vai no href. src é para imagens e scripts."],
   ["Qual é o uso certo do atributo alt numa <img>?", ["Deixar a imagem maior","Descrever a imagem para leitor de tela e quando ela não carrega","Mudar a cor da borda","Abrir a imagem em outra aba"], 1, "alt é acessibilidade e SEO: descreve a imagem em texto."],
   ["Quantos <h1> o ideal é ter numa página?", ["Nenhum","Um, com o assunto principal","Um por parágrafo","Pelo menos cinco"], 1, "O h1 é o título principal. Os subtítulos usam h2, h3…"],
   ["Qual tag cria uma lista com marcadores (bolinhas)?", ["<ol>","<li>","<ul>","<dl>"], 2, "<ul> = lista não ordenada; <ol> = numerada; <li> é cada item."],
   ["O que <meta name=\"viewport\" content=\"width=device-width\"> faz?", ["Deixa o site responsivo no celular","Muda a fonte","Adiciona o ícone da aba","Esconde o site do Google"], 0, "Sem ele o celular mostra a página como se fosse um desktop encolhido."]]},
  {t:"CSS", sub:"estilo, caixa e layout", q:[
   ["Qual seletor pega TODOS os elementos com class=\"produto\"?", ["#produto","produto",".produto","*produto"], 2, "Ponto = classe, cerquilha = id."],
   ["No modelo de caixa, o espaço INTERNO entre o conteúdo e a borda é…", ["margin","padding","border","gap"], 1, "padding é dentro da borda; margin é fora."],
   ["Para colocar 3 cards lado a lado e alinhados, a forma moderna é…", ["float: left","display: flex (ou grid)","position: absolute em cada um","<table>"], 1, "Flexbox e Grid são as ferramentas de layout do CSS atual."],
   ["Com display:flex, qual propriedade alinha os itens no eixo principal (horizontal por padrão)?", ["align-items","justify-content","text-align","vertical-align"], 1, "justify-content = eixo principal; align-items = eixo cruzado."],
   ["Para o layout mudar no celular, você usa…", ["@media (max-width: 600px) { … }","@import","!important em tudo","um arquivo HTML separado"], 0, "Media queries aplicam regras só em certas larguras de tela."],
   ["Se duas regras brigam, qual costuma vencer?", ["A mais antiga no arquivo","A mais específica (id > classe > tag)","Sempre a de cor","A primeira do arquivo"], 1, "Especificidade decide; empatando, vale a que vem por último."]]},
  {t:"Git e GitHub", sub:"versões e publicação", q:[
   ["Qual comando prepara um arquivo para entrar no próximo commit?", ["git push","git add arquivo","git clone","git log"], 1, "git add coloca na área de preparação (stage); depois vem o commit."],
   ["O que um commit registra?", ["Um backup na nuvem automaticamente","Uma foto do projeto naquele momento, com mensagem","Só o último arquivo aberto","A senha do GitHub"], 1, "Commit é um ponto salvo no histórico local. Para ir ao GitHub precisa do push."],
   ["Qual a ordem certa para publicar uma mudança?", ["commit → add → push","add → commit → push","push → add → commit","clone → push → add"], 1, "Prepara (add), salva (commit) e envia (push)."],
   ["Para que serve o GitHub Pages?", ["Hospedar sites estáticos direto do repositório","Editar fotos","Criar banco de dados","Enviar e-mails"], 0, "É como o Evolution Lab e a BLESSAINT ficam no ar."],
   ["Uma boa mensagem de commit é…", ["\"mudanças\"","\"asdf\"","\"Adiciona seção de produtos na home\"","em branco"], 2, "Diz o que mudou, no imperativo e curto."]]},
  {t:"JavaScript", sub:"lógica", q:[
   ["Qual declaração cria uma variável que NÃO pode receber outro valor?", ["var","let","const","fixed"], 2, "const não permite reatribuir; let permite."],
   ["Quanto vale \"5\" + 3 em JavaScript?", ["8","\"53\"","erro","NaN"], 1, "Com texto, o + concatena: vira \"53\"."],
   ["Qual comparação confere valor E tipo?", ["=","==","===","=>"], 2, "=== é igualdade estrita; == converte tipos e engana."],
   ["Para percorrer a lista de produtos e fazer algo com cada um, você usa…", ["if","for / forEach","return","switch"], 1, "Laços repetem para cada item do array."],
   ["Qual é o índice do PRIMEIRO item de um array?", ["0","1","-1","depende"], 0, "Arrays começam no 0."],
   ["O que uma função com return faz?", ["Fecha o navegador","Devolve um valor para quem chamou","Repete para sempre","Apaga a variável"], 1, "return entrega o resultado e termina a função."]]},
  {t:"JS no site", sub:"DOM e eventos", q:[
   ["Como pegar o elemento com id=\"carrinho\"?", ["document.get(\"carrinho\")","document.querySelector(\"#carrinho\")","window.carrinho()","html.carrinho"], 1, "querySelector usa os seletores do CSS."],
   ["Para reagir ao clique num botão, você usa…", ["botao.addEventListener(\"click\", fn)","botao.click = true","onload no CSS","<click>"], 0, "addEventListener liga uma função a um evento."],
   ["Qual propriedade troca o texto de um elemento sem interpretar HTML?", ["innerHTML","textContent","value","style"], 1, "textContent é mais seguro para texto puro."],
   ["Para mostrar/esconder o menu adicionando uma classe CSS, use…", ["el.classList.toggle(\"aberto\")","el.class = \"aberto\" + 1","el.css(\"aberto\")","el.hide()"], 0, "classList.toggle liga e desliga a classe."],
   ["Para guardar o carrinho no navegador mesmo fechando a aba, use…", ["console.log","localStorage","alert","uma variável let"], 1, "localStorage persiste no aparelho; variáveis somem ao recarregar."]]}
 ]},
 fac: {nome:"Faculdade", sub:"Ciência da Computação · 1º período", carreira:true, cor:"#F472B6", rota:"#fac", fases:[
  {t:"Fundamentos de redes", sub:"Fundamentos de redes de computadores", q:[
   ["Quantas camadas tem o modelo OSI?", ["4","5","7","9"], 2, "Física, enlace, rede, transporte, sessão, apresentação e aplicação."],
   ["O endereço IP trabalha em qual camada?", ["Física","Rede","Aplicação","Enlace"], 1, "IP é o protocolo da camada de rede; o MAC fica no enlace."],
   ["Qual a diferença principal entre TCP e UDP?", ["TCP garante entrega e ordem; UDP é mais rápido sem garantia","UDP é mais seguro","TCP só funciona em Wi-Fi","Não há diferença"], 0, "Streaming e jogos usam muito UDP; páginas e e-mails usam TCP."],
   ["O que o DNS faz?", ["Criptografa senhas","Traduz nomes (google.com) em endereços IP","Aumenta a velocidade do Wi-Fi","Bloqueia vírus"], 1, "DNS é a \"agenda de contatos\" da internet."],
   ["Qual a porta padrão do HTTPS?", ["21","80","443","3306"], 2, "HTTP usa 80; HTTPS, 443."]]},
  {t:"Segurança da informação", sub:"Introdução à segurança da informação", q:[
   ["Os três pilares clássicos da segurança (tríade CID) são…", ["Confidencialidade, Integridade, Disponibilidade","Criptografia, Internet, Dados","Controle, Identidade, Defesa","Cópia, Integração, Domínio"], 0, "Também chamada de CIA em inglês."],
   ["Um e-mail falso que imita um banco para roubar sua senha é…", ["Firewall","Phishing","Backup","Patch"], 1, "Phishing é engenharia social: engana a pessoa, não a máquina."],
   ["O que a autenticação em dois fatores (2FA) adiciona?", ["Uma senha maior","Uma segunda prova de identidade, como código no celular","Um antivírus","Mais velocidade"], 1, "Mesmo com a senha vazada, falta o segundo fator."],
   ["Criptografia simétrica usa…", ["A mesma chave para cifrar e decifrar","Duas chaves, pública e privada","Nenhuma chave","Só senhas numéricas"], 0, "Assimétrica é a do par pública/privada, como o cofre do Evolution Lab."],
   ["Ransomware é…", ["Um programa que sequestra seus arquivos e pede resgate","Um tipo de backup","Um cabo de rede","Uma senha forte"], 0, "Backup atualizado e fora do computador é a melhor defesa."]]},
  {t:"Matemática e lógica", sub:"Matemática e lógica", q:[
   ["Se p é verdadeiro e q é falso, quanto vale p E q (p ∧ q)?", ["Verdadeiro","Falso","Depende","Indefinido"], 1, "O E só é verdadeiro quando os dois são."],
   ["Se p é falso e q é verdadeiro, quanto vale p OU q (p ∨ q)?", ["Verdadeiro","Falso","Depende","Indefinido"], 0, "O OU basta um verdadeiro."],
   ["A condicional p → q só é FALSA quando…", ["p é falso","q é verdadeiro","p é verdadeiro e q é falso","os dois são falsos"], 2, "Promessa quebrada: a condição aconteceu e o resultado não."],
   ["Quanto é o número binário 1010 em decimal?", ["8","10","12","5"], 1, "1·8 + 0·4 + 1·2 + 0·1 = 10."],
   ["A negação de \"todos os alunos passaram\" é…", ["Nenhum aluno passou","Algum aluno não passou","Todos reprovaram","Alguns passaram"], 1, "Negar \"todos\" vira \"existe pelo menos um que não\"."]]},
  {t:"Introdução à programação", sub:"Introdução à programação de computadores", q:[
   ["Um algoritmo é…", ["Um tipo de computador","Uma sequência finita de passos para resolver um problema","Uma linguagem de programação","Um vírus"], 1, "Receita de bolo é o exemplo clássico."],
   ["Qual estrutura escolhe entre dois caminhos?", ["Laço (while)","Decisão (if/else)","Variável","Comentário"], 1, "if/else desvia o fluxo conforme uma condição."],
   ["Um laço while que nunca fica falso causa…", ["Erro de sintaxe","Loop infinito","Variável nula","Nada"], 1, "Sempre garanta que a condição muda dentro do laço."],
   ["Em Python, qual o resultado de 7 // 2?", ["3.5","3","4","1"], 1, "// é divisão inteira; 7 % 2 daria o resto, 1."],
   ["Qual destes é um tipo de dado lógico (booleano)?", ["\"verdadeiro\" entre aspas","True / False","3.14","[1,2,3]"], 1, "Booleano só tem dois valores. Entre aspas vira texto."]]},
  {t:"Computação em nuvem", sub:"Computação em nuvem", q:[
   ["IaaS, PaaS e SaaS são…", ["Linguagens de programação","Modelos de serviço da nuvem","Tipos de cabo","Antivírus"], 1, "Infraestrutura, Plataforma e Software como serviço."],
   ["O Gmail e o Google Drive, para o usuário, são exemplos de…", ["IaaS","PaaS","SaaS","On-premises"], 2, "Você só usa o software pronto pela internet."],
   ["Elasticidade na nuvem significa…", ["O servidor é de borracha","Aumentar ou diminuir recursos conforme a demanda","Nunca cair","Ficar mais barato sempre"], 1, "Black Friday: sobe; madrugada: desce."],
   ["Nuvem pública é…", ["Infraestrutura de um provedor compartilhada por vários clientes","Um servidor só da sua empresa","Wi-Fi grátis","Um pendrive"], 0, "AWS, Azure e Google Cloud são nuvens públicas."],
   ["\"Pagar pelo uso\" (pay-as-you-go) quer dizer…", ["Pagar um valor fixo vitalício","Pagar pelo que consumir de recurso","Não pagar nada","Pagar só no primeiro mês"], 1, "É uma das grandes vantagens da nuvem."]]}
 ]},
 criadores: {nome:"Design", sub:"Academia de Criadores · Photoshop e Illustrator", carreira:true, cor:"#FBBF24", rota:"#curso-criadores", fases:[
  {t:"Photoshop · base", sub:"interface, abrir, salvar e exportar", q:[
   ["Qual formato guarda as camadas do Photoshop para editar depois?", ["JPG","PNG","PSD","GIF"], 2, "PSD é o arquivo de trabalho; JPG/PNG são para entregar."],
   ["Para uma logo com fundo transparente no site, exporte em…", ["JPG","PNG","BMP","PDF de impressão"], 1, "JPG não tem transparência."],
   ["Qual a principal diferença entre Photoshop e Illustrator?", ["Nenhuma","Photoshop é pixel (raster); Illustrator é vetor","Illustrator só faz texto","Photoshop só abre fotos de celular"], 1, "Foto e manipulação no Photoshop; logo e ícone no Illustrator."],
   ["Para que servem as guias e grids?", ["Deixar a imagem mais clara","Alinhar e organizar os elementos do design","Recortar o fundo","Aumentar a resolução"], 1, "Alinhamento é o que faz o design parecer profissional."],
   ["Pranchetas (artboards) permitem…", ["Vários formatos/telas no mesmo arquivo","Desenhar à mão livre","Gravar vídeo","Instalar fontes"], 0, "Ex.: post, story e capa juntos num PSD."]]},
  {t:"Camadas e máscaras", sub:"edição não destrutiva", q:[
   ["Por que usar máscara de camada em vez da borracha?", ["É mais rápida de carregar","Esconde sem apagar: dá para voltar atrás","Deixa a cor mais forte","Não tem diferença"], 1, "Na máscara, preto esconde e branco mostra."],
   ["Numa máscara de camada, pintar de PRETO…", ["Mostra a área","Esconde a área","Muda a cor para preto","Duplica a camada"], 1, "Branco revela, preto oculta, cinza deixa semi-transparente."],
   ["Camada de ajuste (curvas, níveis, matiz) serve para…", ["Corrigir cor/luz sem estragar a foto original","Adicionar texto","Criar formas","Salvar em PNG"], 0, "Ela fica separada e editável."],
   ["Objeto inteligente (smart object) permite…", ["Redimensionar e aplicar filtros sem perder qualidade original","Apagar o fundo sozinho","Mudar o idioma","Gravar ações"], 0, "Filtros viram filtros inteligentes, editáveis."],
   ["Ações (actions) no Photoshop servem para…", ["Gravar e repetir uma sequência de passos","Postar no Instagram","Corrigir ortografia","Criar pincéis"], 0, "Ótimo para editar muitas fotos de produto iguais."]]},
  {t:"Seleção e recorte", sub:"fundos, cabelo, roupas", q:[
   ["Para recortar um produto com contorno reto e preciso, a melhor ferramenta é…", ["Pincel","Caneta (Pen tool)","Balde de tinta","Borracha"], 1, "A caneta cria caminhos limpos que viram seleção."],
   ["Para cabelo e pelos, o recurso ideal é…", ["Seleção retangular","Selecionar e máscara (refinar borda)","Laço poligonal","Degradê"], 1, "Refinar borda pega os fios finos."],
   ["\"Preenchimento sensível ao conteúdo\" faz o quê?", ["Remove algo da foto preenchendo com o que está em volta","Aumenta o contraste","Cria uma moldura","Troca a fonte"], 0, "Bom para tirar objetos e pessoas do fundo."],
   ["Para mudar a cor de uma camiseta da BLESSAINT mantendo as dobras, use…", ["Balde de tinta","Camada de ajuste Matiz/Saturação com máscara","Borracha","Pincel com 100% de opacidade"], 1, "Ajuste com máscara preserva luz e sombra do tecido."],
   ["Carimbo e Band-Aid (pincel de recuperação) servem para…", ["Retocar e clonar áreas da imagem","Criar textos","Exportar","Fazer vetores"], 0, "Remover espinhas, poeira e sujeira."]]},
  {t:"Illustrator · vetores", sub:"formas, caneta, pathfinder", q:[
   ["Por que a logo da BLESSAINT deve ser feita em vetor?", ["Fica mais colorida","Aumenta de tamanho sem perder qualidade (banner, camiseta, ícone)","Ocupa mais espaço","É obrigatório por lei"], 1, "Vetor é matemática, não pixel."],
   ["O Pathfinder serve para…", ["Combinar, cortar e subtrair formas","Encontrar arquivos","Corrigir cor","Exportar PNG"], 0, "Unir, menos frente, interseção…"],
   ["Image Trace (rastreamento de imagem) faz…", ["Converte uma imagem em vetor automaticamente","Tira foto","Recorta pixels","Cria máscara"], 0, "Bom ponto de partida, mas sempre precisa de ajuste."],
   ["Ao aumentar um objeto, o contorno ficou desproporcional. O que verificar?", ["Escalar contornos e efeitos","A cor CMYK","O nome da camada","A fonte"], 0, "Essa opção nas preferências mantém a proporção do traço."],
   ["Ferramenta de mesclagem (blend) cria…", ["Transições entre duas formas ou cores","Textos curvados","Máscaras de foto","Pranchetas"], 0, "Ótima para efeitos 3D e degradês de formas."]]},
  {t:"Cor, texto e impressão", sub:"CMYK, RGB, tipografia", q:[
   ["Para algo que vai para a gráfica (flyer, etiqueta), use o modo de cor…", ["RGB","CMYK","Escala de cinza sempre","HEX"], 1, "RGB é para telas; CMYK para tinta."],
   ["Kerning é…", ["O espaço entre um par específico de letras","O tamanho da fonte","A cor do texto","O espaço entre linhas"], 0, "Tracking é o espaço do texto todo; entrelinha é o vertical."],
   ["Antes de mandar para a gráfica, o texto deve ser…", ["Convertido em contorno (curvas)","Apagado","Deixado em RGB","Salvo em JPG"], 0, "Assim a gráfica não troca sua fonte."],
   ["Sangria (bleed) num arquivo de impressão é…", ["Uma margem extra além do corte para não sobrar borda branca","Um efeito de sombra","Um tipo de fonte","Uma cor"], 0, "Normalmente 3 a 5 mm."],
   ["Para combinar fontes num post, uma regra segura é…", ["Usar 5 fontes diferentes","Uma fonte de destaque + uma de leitura","Só fontes manuscritas","Tudo em caixa alta e negrito"], 1, "Contraste com moderação."]]},
  {t:"Social media e negócio", sub:"posts, carrossel, preço", q:[
   ["O primeiro slide de um carrossel deve…", ["Ter todo o conteúdo","Prender a atenção com um gancho forte","Ser só a logo","Ser em branco"], 1, "Se o primeiro não segura, ninguém passa para o segundo."],
   ["Mockup serve para…", ["Mostrar o design aplicado num produto real (camiseta, celular)","Corrigir cor","Vetorizar","Imprimir"], 0, "Vende muito mais que a arte \"solta\"."],
   ["Uma forma justa de precificar um job de design considera…", ["Só o preço do concorrente","Horas, custos, complexidade e valor para o cliente","O que der na cabeça","Sempre o mais barato"], 1, "Calcule o seu valor-hora e some os custos."],
   ["Por que usar contrato na prestação de serviço?", ["Deixa o cliente com medo","Define escopo, prazo, revisões e pagamento","Não serve para nada","É só para empresas grandes"], 1, "Evita a famosa \"só mais uma alteração\" infinita."],
   ["Identidade visual consistente no Instagram significa…", ["Cada post com um estilo","Mesma paleta, fontes e estilo reconhecível","Só fotos sem texto","Muitos filtros"], 1, "A pessoa reconhece a marca antes de ler o nome."]]}
 ]},
 arte: {nome:"Desenho", sub:"Arte de Elite", carreira:false, cor:"#F59E0B", rota:"#curso-arte", fases:[
  {t:"Esboço", sub:"primeiros passos e guias", q:[
   ["No esboço, o ideal é começar com…", ["Traços fortes e detalhados","Linhas leves e formas gerais","Sombras","A pintura"], 1, "Leve no começo para poder corrigir; detalhe vem depois."],
   ["Para que servem as linhas-guia num rosto?", ["Enfeitar","Posicionar olhos, nariz e boca com proporção","Fazer sombra","Pintar a pele"], 1, "Guias dão proporção e direção do rosto."],
   ["Com guias (grade) para copiar uma referência, você…", ["Desenha tudo de uma vez","Compara quadrado por quadrado da referência com o papel","Apaga a referência","Usa só caneta"], 1, "Quebrar em partes pequenas facilita a precisão."],
   ["Ao copiar uma referência, o mais importante é observar…", ["Só os contornos","Formas, proporções e espaços entre as partes","O nome do personagem","A marca do lápis"], 1, "Olhe mais para a referência do que para o papel."],
   ["Um lápis mais macio (ex.: 6B) comparado a um HB…", ["Faz traço mais claro e duro","Faz traço mais escuro e macio","É igual","Não apaga"], 1, "B = mais macio e escuro; H = mais duro e claro."]]},
  {t:"Line art", sub:"traço final", q:[
   ["Line art é…", ["A arte-final de linhas limpas sobre o esboço","Um tipo de papel","A pintura de fundo","A sombra"], 0, "É o traço definitivo."],
   ["Para dar profundidade só com linhas, uma técnica é…", ["Variar a espessura do traço","Usar sempre a mesma espessura","Desenhar mais rápido","Não fechar as formas"], 0, "Linhas mais grossas na sombra/perto, finas na luz/longe."],
   ["Traço confiante sai melhor quando você…", ["Faz muitos tracinhos curtos","Faz um movimento contínuo usando o braço","Prende a respiração","Gira o papel o tempo todo sem parar"], 1, "Movimento do ombro/cotovelo dá linhas mais limpas."],
   ["Antes de passar a line art, o esboço deve…", ["Estar bem escuro","Estar clarinho (apagado com borracha limpa-tipos)","Ser jogado fora","Ter cor"], 1, "Assim o esboço não aparece por baixo."],
   ["Hachura é…", ["Linhas paralelas que criam tom/sombra","Uma borracha","Um papel colorido","Um tipo de cola"], 0, "Cruzar hachuras escurece ainda mais."]]},
  {t:"Pintura e luz", sub:"pele, traje e fundo", q:[
   ["Antes de pintar sombras, defina…", ["A direção da luz","A cor do fundo do quarto","O nome da arte","A moldura"], 0, "Tudo que não recebe luz fica na sombra do lado oposto."],
   ["Pintar em camadas, do claro para o escuro, ajuda a…", ["Gastar mais lápis","Controlar o tom sem perder o ponto","Acabar mais rápido sempre","Não precisar de referência"], 1, "Escurecer é fácil; clarear é difícil."],
   ["Sombra projetada é…", ["A sombra que um objeto joga em outra superfície","O brilho do olho","A cor da pele","A borda do papel"], 0, "Ex.: a sombra do queixo no pescoço."],
   ["Para a pele parecer viva, costuma-se…", ["Usar só uma cor","Misturar tons quentes e frios, não só bege","Pintar tudo de preto","Não sombrear"], 1, "Vermelho nas bochechas, frio nas sombras."],
   ["O fundo serve para…", ["Destacar o personagem com contraste","Esconder erros sempre","Ser mais detalhado que o personagem","Nada"], 0, "Fundo escuro faz o personagem claro saltar."]]},
  {t:"Materiais", sub:"bico de pena, Bic, carvão, grafite", q:[
   ["A caneta Bic exige mais cuidado porque…", ["Não dá para apagar","É cara","Só tem preto","Rasga o papel sempre"], 0, "Construa os tons aos poucos, com pouca pressão."],
   ["O carvão é ótimo para…", ["Detalhes minúsculos","Tons escuros e profundos, rápidos","Pintura com água","Desenhar em vidro"], 1, "Esfuminho e borracha moldável combinam com ele."],
   ["Bico de pena cria tons principalmente com…", ["Hachura e pontilhismo","Borrões","Água","Esfuminho"], 0, "A tinta é sólida; o tom vem da densidade das linhas."],
   ["O esfuminho serve para…", ["Apontar lápis","Espalhar e suavizar o grafite/carvão","Colar papel","Apagar caneta"], 1, "Deixa a transição de tons suave."],
   ["Fixador spray é usado para…", ["Proteger carvão e grafite de borrar","Deixar o papel colorido","Apagar","Afiar o lápis"], 0, "Aplique em camadas finas e de longe."]]}
 ]},
 violao: {nome:"Violão", sub:"Violão Academy + Louvor Simplificado", carreira:false, cor:"#FB923C", rota:"#violao", fases:[
  {t:"Começando do zero", sub:"afinação, cordas e acordes", q:[
   ["Na afinação padrão, da corda mais grossa (6ª) para a mais fina (1ª), as notas são…", ["E A D G B E","E B G D A E","C D E F G A","A D G C E A"], 0, "Mi, Lá, Ré, Sol, Si, Mi."],
   ["Na cifra, a letra G representa a nota…", ["Lá","Sol","Ré","Fá"], 1, "A=Lá, B=Si, C=Dó, D=Ré, E=Mi, F=Fá, G=Sol."],
   ["O \"m\" em Am significa…", ["Maior","Menor","Médio","Mudo"], 1, "Am = Lá menor. Sem o m é maior."],
   ["Para o acorde soar limpo, pressione a corda…", ["Em cima do traste","Logo atrás do traste, com a ponta do dedo","No meio da casa com o dedo deitado","Com a unha"], 1, "Perto do traste exige menos força e evita trastejar."],
   ["Qual destes acordes NÃO precisa de pestana na forma básica?", ["F (Fá maior)","Bm","Em","F#m"], 2, "Em usa só dois dedos. F, Bm e F#m costumam pedir pestana."]]},
  {t:"Ritmo e batidas", sub:"batidas e palheta", q:[
   ["No compasso 4/4, quantos tempos cabem em cada compasso?", ["2","3","4","6"], 2, "É o mais comum no pop e no louvor."],
   ["Ao fazer as batidas, a mão direita deve…", ["Parar entre as batidas","Manter o vai-e-vem constante, mesmo quando não toca","Bater só para baixo","Tocar o mais forte possível"], 1, "O movimento constante segura o tempo."],
   ["Para treinar uma batida nova, o melhor é…", ["Já começar rápido","Começar devagar, com metrônomo, e acelerar aos poucos","Tocar só a música inteira","Olhar só a mão esquerda"], 1, "Devagar e certo vira rápido e certo."],
   ["Abafar as cordas com a palma (palm mute) cria…", ["Um som curto e percussivo","Um som mais longo","Uma nota mais aguda","Um acorde menor"], 0, "Muito usado para dar groove."],
   ["Com palheta, o ideal é segurar…", ["Com a mão toda fechada","Entre o polegar e o indicador, com pouca ponta para fora","Só com o mindinho","Na boca"], 1, "Firme, mas sem travar o pulso."]]},
  {t:"Dedilhado", sub:"dedilhado e fingerstyle", q:[
   ["Na notação de dedilhado, p-i-m-a são…", ["Polegar, indicador, médio, anelar","Pausa, início, meio, acorde","Notas da escala","Cordas do violão"], 0, "Vem dos nomes em espanhol/português."],
   ["No dedilhado básico, o polegar costuma tocar…", ["As cordas agudas","As cordas graves (baixo do acorde)","Só a 1ª corda","Nada"], 1, "Os outros dedos ficam com as cordas agudas."],
   ["No fingerstyle, o \"baixo alternado\" é…", ["O polegar alternando entre duas cordas graves enquanto a melodia toca","Trocar de violão","Tocar só baixo","Afinar mais grave"], 0, "É o que faz parecer que dois violões tocam juntos."],
   ["Harmônico natural é tirado…", ["Apertando forte a corda","Encostando levemente o dedo sobre o traste 12 (ou 7, 5) sem apertar","Com a palheta","Desafinando"], 1, "Soa como um sininho."],
   ["Percussão no corpo do violão (caixa/bumbo) serve para…", ["Afinar","Imitar uma bateria junto com a música","Trocar as cordas","Nada, estraga o violão"], 1, "Bumbo com o polegar perto da boca; caixa com a palma nas cordas."]]},
  {t:"Teoria", sub:"formação de acordes e CAGED", q:[
   ["Um acorde maior é formado por…", ["Tônica, terça maior e quinta","Tônica, terça menor e quinta","Só duas notas","Quatro tônicas"], 0, "Ex.: C = Dó, Mi, Sol."],
   ["O que muda de um acorde maior para o menor?", ["A quinta","A terça, que desce meio tom","A tônica","Nada"], 1, "C = Dó Mi Sol; Cm = Dó Mi♭ Sol."],
   ["O sistema CAGED usa as formas de quais acordes?", ["C A G E D","C D E F G","A B C D E","Am Em Dm Bm G"], 0, "Cinco desenhos que se repetem pelo braço."],
   ["O capotraste na 2ª casa com forma de G soa como…", ["G","A","F","C"], 1, "Cada casa sobe meio tom: G → G# → A."],
   ["O acorde C7 tem, além de Dó-Mi-Sol, a nota…", ["Si","Si bemol (sétima menor)","Ré","Fá#"], 1, "O 7 sozinho é a sétima menor; 7M seria a maior."]]},
  {t:"Harmonia e escalas", sub:"campo harmônico e solos", q:[
   ["No campo harmônico maior de Dó, os acordes são…", ["C Dm Em F G Am Bm(b5)","C D E F G A B","Cm Dm Em Fm Gm Am Bm","C F G apenas"], 0, "Graus I ii iii IV V vi vii°."],
   ["Em Dó maior, o acorde relativo menor é…", ["Dm","Em","Am","Bm"], 2, "O vi grau: Lá menor."],
   ["A progressão I – V – vi – IV em G é…", ["G D Em C","G C D Em","G Am Bm C","G E A D"], 0, "Base de muitas músicas de louvor e pop."],
   ["A escala pentatônica tem quantas notas?", ["5","6","7","12"], 0, "Penta = cinco. É a mais usada para solos."],
   ["O \"V grau\" (dominante) costuma…", ["Criar tensão que pede para voltar ao I","Encerrar a música sempre","Ser um acorde menor","Ser evitado"], 0, "Em C, o G (ou G7) puxa de volta para o C."]]},
  {t:"Louvor simplificado", sub:"tocar na igreja", q:[
   ["Uma \"cifra simplificada\" geralmente…", ["Troca acordes difíceis por versões mais fáceis que soam parecido","Muda a letra","Tira o ritmo","Só funciona no piano"], 0, "Ex.: trocar F por Fmaj7 ou usar capotraste."],
   ["Se a música está num tom alto demais para cantar, você pode…", ["Transpor para outro tom","Tocar mais rápido","Apertar mais as cordas","Desafinar o violão"], 0, "Transpor muda todos os acordes juntos, mantendo a música."],
   ["Para tocar com a banda da igreja, o mais importante é…", ["Tocar mais alto que todos","Manter o tempo junto com a banda","Fazer solo o tempo todo","Mudar a batida a cada verso"], 1, "Servir a música e o ministério."],
   ["\"Louvores sem pestana\" ajudam o iniciante porque…", ["Usam acordes abertos, mais fáceis de montar","Não têm letra","São instrumentais","Só usam uma corda"], 0, "Você toca música inteira antes de dominar a pestana."],
   ["Ao ensaiar uma música nova, a melhor ordem é…", ["Já tocar com a banda","Treinar as trocas de acordes devagar, depois a batida, depois com a música","Só ouvir","Decorar a letra primeiro e nunca o acorde"], 1, "Separe os desafios e junte no final."]]}
 ]}
};
