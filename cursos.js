/* Evolution Lab · cursos de outras plataformas (Kiwify, Hotmart) e biblioteca.
   Só a estrutura (nomes de módulos e aulas) e os links. O conteúdo continua na plataforma de origem. */
const AE = "https://www.artedeelite.com/9ea45ea4-4819-4c05-8020-2ee96a76a509/";
const EXT_CURSOS = [
 {id:"arte", nome:"Arte de Elite", sub:"Desenho realista, do esboço à pintura", plat:"Kiwify", attr:"Arte", cor:["#2B2417","#F59E0B"], url:"https://www.artedeelite.com/",
  mods:[
   {t:"Boas-vindas", aulas:[["Seja bem-vindo(a)",0,"b269c02a-7ee8-4340-81bb-2588faeabea5/37d0571a-4274-4c4e-805b-a12efaab6358"]]},
   {t:"Módulo 0 · Grupo de Alunos", aulas:[["Grupo de alunos",0,"958ef54e-0cba-4cdb-aea3-63f10701f681/b9890d24-cd11-47bf-a785-ef4cdd3f7265"]]},
   {t:"Módulo 1 · Como Desenhar · Aula em Tempo Real", aulas:[
     ["Aula 1 · Introdução e Primeiros Passos",2,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/52a93dd0-dc5a-4161-a7f0-009ee8369c86"],
     ["Aula 2 · Desvendando o APP",11,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/84a739d3-bf08-4b39-8802-fcb30c06ec15"],
     ["Aula 3 · Aplicando a Técnica no Papel",46,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/47c78ec2-cee1-4193-98e0-82c542db1234"],
     ["Aula 4 · Considerações e Dicas Extras",4,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/285b9df9-6970-4ad6-90ac-54608f0632f5"],
     ["Aula 5 · Nova Função do APP: Esboço com Guias",14,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/5e592299-4cb0-46b2-a58e-c74f1fa282e1"],
     ["Aula 6 · Esboço com Guias no Papel",5,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/b47bac13-2aed-4bf1-9f74-053db7cf919d"],
     ["Aula antiga · Esboço Completa",57,"767504d8-cc68-4ea9-a09f-2bdc3ae7cd09/c8b245d3-e74b-480d-9d1f-cce718da35b8"]]},
   {t:"Módulo 2 · Aprimore sua Line Art", aulas:[
     ["Parte 1",10,"db1d4b59-3bfe-413a-9e6b-12ed546d8066/c1e1d2cd-a87a-4113-870b-77c3554d9abc"],
     ["Parte 2",46,"db1d4b59-3bfe-413a-9e6b-12ed546d8066/ab802b6f-8a9d-4b61-aa0c-12e8690e01aa"]]},
   {t:"Módulo 3 · Tutorial Completo de Pintura", aulas:[
     ["Parte 1 · Introdução e materiais",0,"44d43cdf-86f5-4e4a-b6b1-297c1c73278f/b5d1c2b0-3bf6-4d52-958f-0d77190488cc"],
     ["Parte 2 · Pintura da pele e técnicas",0,"44d43cdf-86f5-4e4a-b6b1-297c1c73278f/564d0b3b-7e43-4d09-b67a-2eb2dbbaddff"],
     ["Parte 3 · Traje e fundo",0,"44d43cdf-86f5-4e4a-b6b1-297c1c73278f/3794f5e7-1942-4795-ac6c-e1dabd903925"],
     ["Aula 4 · Pintura completa Omni-man (lápis Supersoft)",0,"44d43cdf-86f5-4e4a-b6b1-297c1c73278f/ba678578-1c9a-44de-904a-cc0c17f2f85a"],
     ["Aula 5 · Pintura completa Flash Reverso",0,"44d43cdf-86f5-4e4a-b6b1-297c1c73278f/e4c45ad4-0856-4b7f-a1fc-50137f375a8a"]]},
   {t:"Módulo 4 · Bico de Pena", aulas:[["Bico de pena",0,"b71c7cde-6856-478d-9ee7-bd2670f528f8/a47267aa-70c9-4572-9359-c790110afd21"]]},
   {t:"Módulo 5 · Caneta Bic", aulas:[["Caneta Bic",0,"ebb272d4-c0f3-4de8-9cb5-b60419cde3e5/175e1c32-4427-4258-914e-c4165dd2eee8"]]},
   {t:"Módulo 6 · Carvão", aulas:[["Carvão",0,"1d3c73c2-af1c-445a-a18f-9c6aee76433b/7d68aeef-7983-4cf5-81ef-c86916921963"]]},
   {t:"Módulo 7 · Desenhos em Tempo Real", aulas:[
     ["Musashi",0,"f1d179a7-1860-4297-a41f-1617800b8493/7b325691-4751-47b1-86ca-b04ad35288b1"],
     ["Shenji",0,"f1d179a7-1860-4297-a41f-1617800b8493/0c697f3a-a807-4d8a-98ba-29f73e5b3f57"],
     ["Guts",0,"f1d179a7-1860-4297-a41f-1617800b8493/0baf4a72-724d-4599-a1c7-90454f8330f8"],
     ["Barragan",0,"f1d179a7-1860-4297-a41f-1617800b8493/e7bd967b-59ca-4351-8657-d7a8e3290a98"],
     ["Batman que ri",0,"f1d179a7-1860-4297-a41f-1617800b8493/3522c46d-a1fd-48ea-9a34-fe0a198a837e"],
     ["Toji",0,"f1d179a7-1860-4297-a41f-1617800b8493/44007d8a-cdd8-4f42-a460-d525f13ca157"]]},
   {t:"Módulo 8 · E-book Arte de Elite", aulas:[["E-book",0,"27caa1de-f7a6-4286-9081-3be268697bbb/7aa5be84-62f8-410b-b6c2-b8ee81ae5951"]]},
   {t:"Módulo 9 · Caneta de 10 Cores", aulas:[["Caneta de 10 cores",0,"a7a614d0-2270-4a8e-8866-cec20dadec9b/bbdf841f-2636-4d61-9415-71e5c14e9657"]]},
   {t:"Super bônus · Grafite com a Talita", aulas:[["Grafite com a Talita",0,"f4ec4da1-ce49-45e0-94f1-efd7bfb1ec0c/c130f2b3-9bb0-452b-9372-fc26b82441db"]]},
   {t:"Bônus · E-book TikTok", aulas:[["E-book TikTok",0,"554f8d67-a678-4286-86b4-3859e8a64f50/594e912a-3c7d-4e90-8483-bae6cffa0248"]]},
   {t:"Bônus · E-book YouTube", aulas:[["E-book YouTube",0,"e3ddbe50-6a1f-4ae3-89e0-ecfb110fcf2a/a18eadc3-37eb-4dd6-bf64-276597bd7c2f"]]},
   {t:"Bônus · Como tirar e editar fotos das artes", aulas:[["Fotos das artes",0,"90cf0c2c-31fe-476e-9f85-761cec4d0cde/6fd797a3-caeb-4945-a718-93b6267fc27f"]]}
  ]},
 {id:"criadores", nome:"Academia de Criadores Premium", sub:"Photoshop e Illustrator do básico ao avançado", plat:"Hotmart", attr:"Design", car:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], cor:["#2A1A4A","#A78BFA"], url:"https://hotmart.com/pt-br/club/academia-de-criadores/products/820613",
  mods:[["Bem-vindo · orientações",7],["Photoshop do básico ao avançado",77],["Illustrator do básico ao avançado",48],["Criação de logotipos com Illustrator",20],["Social media · criação de conteúdo",32],["Design para social media com Photoshop",15],["Manipulação de imagem avançada",15],["Prospecção de clientes e precificação",5],["Efeitos de texto no Photoshop",5],["YouTube · conteúdos exclusivos",7],["Caixa de ferramentas para criadores",7],["Bônus · Carrosséis que vendem",16],["Bônus · Pack de vetores, ícones e emojis",1],["Bônus · Pack de mockups",1],["Bônus · Mega-pack",1],["Bônus · Photoshop versão legado",42]].map(([t,n]) => ({t,n}))},
 {id:"violao", nome:"Violão Academy", sub:"Do zero ao fingerstyle", plat:"Hotmart", attr:"Música", cor:["#3A2014","#FB923C"], url:"https://hotmart.com/pt-br/club/aulas-de-violao-do-zero-ao-fingerstyle-2026/products/7023464",
  mods:[["Boas-vindas",6],["Começando do zero! Pra valer!",12],["Primeiros movimentos",10],["Batida 2 + exercícios + músicas",5],["Bônus · 37 mil cifras",10],["Bônus · 5.000 playbacks",1],["Bônus · 150.000 tablaturas e partituras",1],["Essencial para continuar",3],["Batida 3 + exercícios + músicas",5],["Batida 4 + exercícios + músicas",5],["Palheta nos batidos",5],["Dedilhado + exercícios + músicas",3],["Sistema CAGED",9],["Batida 5 + exercícios + músicas",5],["Batida 6 + exercícios + músicas",5],["Formação dos acordes",2],["Batida 7 + exercícios + músicas",4],["Dedilhado 2 + exercícios + músicas",5],["Harmonia · campo harmônico",15],["Inversões, linha de baixo e rearmonização",5],["Batida 8 + exercícios + músicas",4],["Batida 9 + exercícios + músicas",5],["Escalas completas",9],["Solos e riffs",6],["Bônus #1 · músicas gospel",19],["Bônus #2 · músicas diversas",17],["Bônus #3 · afinações alternativas",3],["Mestres do dedilhado",17],["Mestres do dedilhado (polegar)",10],["Percussão (caixa)",4],["Percussão (bumbo)",2],["Arranjos fingerstyle na prática",3],["A magia dos harmônicos",2],
   ["Música · Espírito Santo",5],["Música · Quando Eu Chorar",4],["Música · Espelhos Mágicos",4],["Música · Abro Mão",1],["Música · Amazing Grace",1],["Música · Deus de Promessas",1],["Música · Olha pra Mim",1],["Música · Lindo Momento",1],["Música · Sobre as Águas",1],["Música · Tua Graça me Basta",1],["Música · O Maior Vilão Sou Eu",1],["Música · Hallelujah",4],["Música · Acalma o Meu Coração",4],["Música · Jó",4],["Música · Quero Conhecer Jesus",2],["Música · Chora Israel",3],["Música · Yeshua",4],["Música · Ousado Amor",2],["Música · Quando Ele Vem",3],["Música · Ninguém Explica Deus",2],["Música · Lugar Secreto",2],["Música · Atos 2",2],["Música · A Casa é Sua",3],["Música · Raridade",3],["Música · Lindo És",3],["Música · Oceans",3],["Música · Vem com Josué Lutar em Jericó",3],["Música · Perfect",3],["Música · Numb",2]].map(([t,n]) => ({t,n}))},
 {id:"ls1", nome:"Louvor Simplificado · Básico", sub:"Apostilas de cifras simplificadas", plat:"Kiwify", attr:"Música", cor:["#14324A","#38BDF8"], url:"https://dashboard.kiwify.com/course/premium/c2b3d72f-cd63-4814-afc9-29276761737c",
  mods:[{t:"Seção 1", aulas:[["Seja bem-vindo · comunicado e suporte",0,""],["100 louvores sem pestana (apostila)",0,""],["+200 louvores com cifras simplificadas (apostila)",0,""]]}]},
 {id:"ls3", nome:"Louvor Simplificado · Vol. 3", sub:"Apostila em PDF", plat:"Kiwify", attr:"Música", cor:["#14324A","#38BDF8"], url:"https://dashboard.kiwify.com/course/a70ad2a6-4dfa-4e6e-a593-309909767e46",
  mods:[{t:"Material", aulas:[["Apostila LS Vol. 3 (PDF)",0,""]]}]}
];
/* car: módulos que contam XP na carreira (a Academia de Criadores inteira conta: design é da área).
   Cursos sem "car" são hobby: têm progresso e XP de hobby, mas não sobem o cargo. */
/* progresso que já existia nas plataformas em 25/10/2026: [curso, módulo, aulas feitas] */
const EXT_INICIAL = [["arte",0,1],["arte",1,1],["arte",2,4],["criadores",0,1],["criadores",1,19],["criadores",2,11],["criadores",5,1],["criadores",12,1],["criadores",13,1],["criadores",14,1],["violao",1,8],["ls3",0,1]];
const ACORDES = ["C","D","E","F","G","A","B","Am","Dm","Em","Bm","F#m","C7","D7","E7","G7","A7","B7"];
const LIVROS_INICIAIS = [
 {id:"forja", titulo:"Forja da Mente", autor:"Gonçalves", tema:"Automotivação estoica", status:"quero", origem:"Hotmart · e-book + 2 bônus", url:"https://consumer.hotmart.com/main/7922851", cor:"#5B3A12"},
 {id:"ebook-ae", titulo:"E-book Arte de Elite", autor:"Arte de Elite", tema:"Desenho", status:"quero", origem:"Kiwify · do curso Arte de Elite", url:AE + "27caa1de-f7a6-4286-9081-3be268697bbb/7aa5be84-62f8-410b-b6c2-b8ee81ae5951", cor:"#2B2417"}
];
