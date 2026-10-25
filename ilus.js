const ARROW = `<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ink"/></marker></defs>`;
const svg = (body, h=220, label="") => `<svg class="il" viewBox="0 0 480 ${h}" role="img" aria-label="${label}">${ARROW}${body}</svg>`;

const ILUS = {
tokens: () => svg(`
 ${[["Camiseta",14,96],["over",116,58],["sized",180,62],["preta",248,62],["com",316,50]].map(([t,x,w])=>`<rect x="${x}" y="22" width="${w}" height="38" rx="7" class="c"/><text x="${x+w/2}" y="46" text-anchor="middle">${t}</text>`).join("")}
 <rect x="374" y="22" width="92" height="38" rx="7" class="p" stroke-dasharray="5 4"/><text x="420" y="46" text-anchor="middle" class="tb" style="fill:var(--pen);fill:var(--pen)">próximo?</text>
 <path d="M420 66 V92" class="k" marker-end="url(#ar)"/>
 ${[["estampa",62],["logo",21],["bolso",9]].map(([t,p],i)=>`<text x="150" y="${122+i*32}" text-anchor="end">${t}</text><rect x="162" y="${108+i*32}" width="${p*3.6}" height="20" rx="4" class="${i?'p':'h'}"/><text x="${170+p*3.6}" y="${123+i*32}" class="tsm">${p}%</text>`).join("")}
 <text x="404" y="140" class="th" text-anchor="middle">escolhe o</text><text x="404" y="166" class="th" text-anchor="middle">mais provável</text>
 <path d="M350 150 Q330 128 300 124" class="r" marker-end="url(#ar)"/>`, 220, "Tokens e previsão do próximo token"),

familia: () => svg(`
 <path d="M20 196 H460" class="k"/>
 ${[["Haiku","rápido",30,48],["Sonnet","equilíbrio",140,86],["Opus","potente",250,124],["Mythos","Fable",360,162]].map(([n,s,x,h],i)=>`<rect x="${x}" y="${196-h}" width="96" height="${h}" rx="8" class="${i==3?'as':i==2?'p':'c'}"/><text x="${x+48}" y="${196-h+26}" text-anchor="middle" class="tb">${n}</text><text x="${x+48}" y="${196-h+46}" text-anchor="middle" class="tsm">${s}</text>`).join("")}
 <path d="M60 128 Q200 20 420 22" class="r" marker-end="url(#ar)" stroke-dasharray="6 5"/>
 <text x="190" y="56" class="th">mais inteligência</text>`, 210, "Família de modelos do mais rápido ao mais potente"),

prompt: () => svg(`
 <rect x="30" y="14" width="420" height="196" rx="12" class="c"/>
 ${[["Contexto","Sou dono da BLESSAINT, streetwear gospel",'h'],["Tarefa","Escreva 3 legendas para a camiseta",'p'],["Restrições","Tom urbano, máximo 2 linhas",'ok'],["Formato","Lista numerada + #useBlessaint",'as']].map(([t,s,c],i)=>`<rect x="46" y="${28+i*45}" width="110" height="34" rx="6" class="${c}"/><text x="101" y="${50+i*45}" text-anchor="middle" class="tb ${c=='h'?'onhl':''}">${t}</text><text x="170" y="${50+i*45}" class="tsm">${s}</text>`).join("")}`, 224, "As quatro partes de um bom prompt"),

arquivos: () => svg(`
 ${[["PDF",20],["XLSX",76],["PNG",132]].map(([t,y])=>`<rect x="24" y="${y}" width="74" height="44" rx="6" class="c"/><text x="61" y="${y+28}" text-anchor="middle" class="tb">${t}</text><path d="M104 ${y+22} L178 104" class="k" marker-end="url(#ar)"/>`).join("")}
 <circle cx="240" cy="104" r="54" class="as"/><text x="240" y="100" text-anchor="middle" class="tb">Claude</text><text x="240" y="120" text-anchor="middle" class="tsm">lê e roda código</text>
 ${[["análise",30],["gráfico",86],["arquivo novo",142]].map(([t,y])=>`<path d="M298 104 L352 ${y+20}" class="k" marker-end="url(#ar)"/><rect x="356" y="${y}" width="104" height="40" rx="6" class="p"/><text x="408" y="${y+25}" text-anchor="middle">${t}</text>`).join("")}`, 200, "Arquivos entram, análises e arquivos saem"),

projetos: () => svg(`
 <path d="M30 50 H170 L196 30 H450 V200 H30 Z" class="c"/>
 ${[["Instruções","regras de todas as conversas",'h'],["Documentos","identidade visual, cronograma",'p'],["Conversas","todas juntas, no mesmo lugar",'ok']].map(([t,s,c],i)=>`<rect x="52" y="${66+i*42}" width="120" height="32" rx="6" class="${c}"/><text x="112" y="${87+i*42}" text-anchor="middle" class="tb ${c=='h'?'onhl':''}">${t}</text><text x="186" y="${87+i*42}" class="tsm">${s}</text>`).join("")}
 <text x="62" y="44" class="tb">Projeto Evolução Tech</text>`, 214, "Um projeto guarda instruções, documentos e conversas"),

artefatos: () => svg(`
 ${[["Docs",'c'],["Slides",'p'],["Sheets",'ok'],["Design",'as'],["Dashboard",'p'],["Página",'h']].map(([t,c],i)=>{const x=24+(i%3)*150,y=18+Math.floor(i/3)*96;return `<rect x="${x}" y="${y}" width="132" height="80" rx="10" class="${c}"/><rect x="${x+14}" y="${y+14}" width="60" height="7" rx="3" class="ink" opacity=".25"/><rect x="${x+14}" y="${y+28}" width="96" height="6" rx="3" class="ink" opacity=".15"/><text x="${x+14}" y="${y+64}" class="tb ${c=='h'?'onhl':''}">${t}</text>`}).join("")}`, 210, "Tipos de artefatos"),

pesquisa: () => svg(`
 ${[["docs oficiais","2026",1],["MDN","2026",1],["blog sem data","2019",0]].map(([t,d,ok],i)=>`<rect x="${30+i*150}" y="30" width="126" height="110" rx="10" class="c"/><text x="${44+i*150}" y="60" class="tb">${t}</text><text x="${44+i*150}" y="84" class="tsm">${d}</text>${ok?`<path style="stroke:var(--ok)" d="M${60+i*150} 112 l12 12 l26 -28" stroke-width="4" fill="none" stroke-linecap="round"/>`:`<path d="M${342} 100 l40 30 M${382} 100 l-40 30" class="r"/>`}`).join("")}
 <circle cx="236" cy="176" r="22" class="k"/><path d="M252 192 L276 214" class="k" stroke-width="5"/>
 <text x="290" y="184" class="th">confira fonte e data</text>`, 224, "Avaliar fontes de pesquisa"),

mcp: () => svg(`
 <circle cx="240" cy="110" r="46" class="as"/><text x="240" y="106" text-anchor="middle" class="tb">Claude</text><text x="240" y="126" text-anchor="middle" class="tsm">MCP</text>
 ${[["Google Drive",70,40],["Notion",410,40],["Agenda",70,180],["Seu sistema",410,180]].map(([t,x,y])=>`<path d="M${x<240?x+50:x-50} ${y} L${x<240?196:284} ${y<110?90:130}" class="k" stroke-dasharray="${t=='Seu sistema'?'5 5':'0'}"/><rect x="${x-56}" y="${y-18}" width="112" height="36" rx="18" class="${t=='Seu sistema'?'h':'c'}"/><text x="${x}" y="${y+5}" text-anchor="middle" class="${t=='Seu sistema'?'onhl':''}">${t}</text>`).join("")}`, 220, "MCP liga o Claude a vários apps"),

agente: () => svg(`
 <circle cx="240" cy="112" r="40" class="h"/><text x="240" y="118" text-anchor="middle" class="tb onhl">Objetivo</text>
 ${[["Pensar",240,24],["Agir",392,112],["Observar",240,200],["Repetir",88,112]].map(([t,x,y])=>`<rect x="${x-58}" y="${y-18}" width="116" height="36" rx="18" class="${t=='Agir'?'as':'c'}"/><text x="${x}" y="${y+5}" text-anchor="middle" class="tb">${t}</text>`).join("")}
 <path d="M300 34 Q370 48 384 88" class="k" marker-end="url(#ar)"/><path d="M384 136 Q370 180 300 192" class="k" marker-end="url(#ar)"/><path d="M180 192 Q110 180 96 136" class="k" marker-end="url(#ar)"/><path d="M96 88 Q110 48 180 34" class="k" marker-end="url(#ar)"/>`, 224, "Ciclo do agente: pensar, agir, observar, repetir"),

navegador: () => svg(`
 <rect x="24" y="16" width="290" height="190" rx="10" class="c"/><path d="M24 44 H314" class="k"/><circle cx="42" cy="30" r="5" class="rf"/><circle cx="58" cy="30" r="5" class="h"/><circle cx="74" cy="30" r="5" class="ok"/>
 <rect style="stroke:var(--line)" x="44" y="62" width="160" height="28" rx="5" class="paper" stroke-width="2"/><text x="54" y="81" class="tsm">Nome</text>
 <rect style="stroke:var(--line)" x="44" y="102" width="160" height="28" rx="5" class="paper" stroke-width="2"/><text x="54" y="121" class="tsm">E-mail</text>
 <rect x="44" y="146" width="92" height="32" rx="16" class="pf"/><text x="90" y="167" text-anchor="middle" class="tb onink" style="fill:#fff">Enviar</text>
 <path d="M126 160 l0 26 l7 -7 l6 13 l6 -3 l-6 -12 l10 0 z" class="ink"/>
 <rect x="344" y="56" width="112" height="78" rx="8" class="c"/><rect x="380" y="134" width="40" height="20" class="ink"/><rect x="360" y="154" width="80" height="6" rx="3" class="ink"/>
 <text x="400" y="186" text-anchor="middle" class="tsm">seu computador</text><text x="400" y="100" text-anchor="middle" class="th">prints</text>`, 220, "O Claude usando navegador e computador"),

skills: () => svg(`
 <rect x="30" y="18" width="220" height="184" rx="10" class="c"/><text x="48" y="48" class="tb">SKILL.md</text>
 <text x="48" y="76" class="tsm">name: post-blessaint</text><text x="48" y="98" class="tsm">description: legendas</text>
 ${[0,1,2].map(i=>`<rect x="48" y="${118+i*24}" width="${150-i*30}" height="8" rx="4" class="ink" opacity=".2"/>`).join("")}
 <circle cx="360" cy="96" r="58" class="p"/><path d="M360 60 V96 L388 112" class="k" stroke-width="3"/>
 <text x="360" y="182" text-anchor="middle" class="tb">toda segunda, 8h</text><text x="360" y="204" text-anchor="middle" class="tsm">tarefa agendada</text>`, 220, "Skill e tarefa agendada"),

terminal: () => svg(`
 <rect x="24" y="14" width="432" height="196" rx="12" class="ink"/>
 <circle cx="44" cy="32" r="5" class="rf"/><circle cx="60" cy="32" r="5" class="h"/><circle cx="76" cy="32" r="5" class="ok"/>
 <text x="44" y="70" class="onink" style="font-family:var(--f-mono);font-size:14px">$ cd blessaint-site</text>
 <text x="44" y="96" class="onink" style="font-family:var(--f-mono);font-size:14px">$ claude</text>
 <text x="44" y="126" style="font-family:var(--f-mono);font-size:14px;fill:var(--hl)">&gt; explique a estrutura do site</text>
 <text x="44" y="154" style="font-family:var(--f-mono);font-size:14px;fill:var(--ok)">✓ li index.html, sobre.html, style.css</text>
 <text x="44" y="180" class="onink" style="font-family:var(--f-mono);font-size:14px">  O site tem 3 páginas e…</text>`, 224, "Claude Code no terminal"),

api: () => svg(`
 ${[["Seu site","navegador",20,'c'],["Seu servidor","chave guardada",180,'h'],["API Claude","modelo",340,'as']].map(([t,s,x,c])=>`<rect x="${x}" y="60" width="122" height="76" rx="10" class="${c}"/><text x="${x+61}" y="94" text-anchor="middle" class="tb ${c=='h'?'onhl':''}">${t}</text><text x="${x+61}" y="116" text-anchor="middle" class="tsm" ${c=='h'?'style="fill:var(--hl-ink)"':''}>${s}</text>`).join("")}
 <path d="M146 86 H174" class="k" marker-end="url(#ar)"/><path d="M306 86 H334" class="k" marker-end="url(#ar)"/>
 <path d="M334 112 H306" class="k" marker-end="url(#ar)"/><path d="M174 112 H146" class="k" marker-end="url(#ar)"/>
 <text x="240" y="40" text-anchor="middle" class="th">a chave nunca vai no site</text>
 <text x="400" y="168" text-anchor="middle" class="tsm">resposta em JSON</text>`, 190, "Site, servidor e API"),

tools: () => svg(`
 <rect x="20" y="30" width="120" height="56" rx="10" class="as"/><text x="80" y="64" text-anchor="middle" class="tb">Modelo</text>
 <rect x="340" y="30" width="120" height="56" rx="10" class="c"/><text x="400" y="64" text-anchor="middle" class="tb">Seu código</text>
 <path d="M146 48 H334" class="k" marker-end="url(#ar)"/><text x="240" y="40" text-anchor="middle" class="tsm">pede: consultar_estoque</text>
 <path d="M334 72 H146" class="k" marker-end="url(#ar)"/><text x="240" y="96" text-anchor="middle" class="tsm">resultado: M = 4 un.</text>
 <path d="M80 92 V140" class="k" marker-end="url(#ar)"/>
 <rect x="20" y="146" width="300" height="48" rx="10" class="ok"/><text x="34" y="176">"Temos 4 camisetas M em estoque!"</text>`, 210, "Ciclo de uso de ferramentas"),

xml: () => svg(`
 <rect x="24" y="14" width="432" height="190" rx="12" class="c"/>
 ${[["<instrucoes>","Resuma e classifique","pf"],["<avaliacao>","Chegou rápido, mas…","a"],["<formato>","resumo | sentimento","ok"]].map(([t,s,c],i)=>`<text x="44" y="${52+i*56}" style="font-family:var(--f-mono);font-size:14px;fill:${c=='pf'?'var(--pen)':c=='a'?'var(--c-claude)':'var(--ok)'}">${t.replace('<','&lt;').replace('>','&gt;')}</text><text x="64" y="${74+i*56}" class="tsm">${s}</text>`).join("")}`, 218, "Prompt estruturado com tags"),

escudo: () => svg(`
 <path d="M240 18 L320 46 V110 C320 160 282 190 240 206 C198 190 160 160 160 110 V46 Z" class="p"/>
 <path style="stroke:var(--pen)" d="M206 112 l24 24 l46 -50" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
 ${[["privacidade",70,60],["ética",70,150],["autoria",410,60],["carreira",410,150]].map(([t,x,y])=>`<rect x="${x-56}" y="${y-18}" width="112" height="36" rx="18" class="c"/><text x="${x}" y="${y+5}" text-anchor="middle">${t}</text>`).join("")}`, 220, "Segurança, ética e carreira"),

capaClaude: () => svg(`
 <path d="M20 200 H460" class="k"/>
 ${[1,2,3,4].map(n=>`<rect x="${20+(n-1)*108}" y="${200-n*40}" width="100" height="${n*40}" rx="6" class="${n==4?'as':n==3?'p':'c'}"/><text x="${70+(n-1)*108}" y="${200-n*40+26}" text-anchor="middle" class="tb">Nível ${n}</text>`).join("")}
 <path d="M440 40 V6" class="k"/><path d="M440 8 L470 16 L440 24 Z" class="rf"/>
 <text x="300" y="34" class="th" text-anchor="end">expert</text>`, 210, "Quatro níveis até expert"),
};

const CREST = `<svg class="crest" viewBox="0 0 40 40" aria-hidden="true"><circle style="fill:var(--ink)" cx="20" cy="20" r="18.5"/><circle style="stroke:var(--hl)" cx="20" cy="20" r="14.5" fill="none" stroke-width="1.2" stroke-dasharray="2 2"/><text x="20" y="25.5" text-anchor="middle" style="font-family:var(--f-display);font-weight:800;font-size:14px;fill:var(--paper)">EA</text></svg>`;
const ICON = {
 casa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 ia:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
 code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
 fac:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>',
 bol:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
 dica:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
 copy:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
 lock:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
};
