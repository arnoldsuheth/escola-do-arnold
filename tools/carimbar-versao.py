#!/usr/bin/env python3
"""Carimba uma versão nova nos arquivos do app (?v=...) para o navegador sempre buscar a atualização.
Rode ANTES de cada publicação:  python3 tools/carimbar-versao.py index.html [sw.js]"""
import re,sys,time
v=format(int(time.time()),'x')
for f in sys.argv[1:]:
    s=open(f,encoding='utf8').read()
    if f.endswith('.html'):
        s=re.sub(r'((?:src|href)="(?!https?:|//|data:)[^"?#]+\.(?:js|css))(?:\?v=[^"]*)?"',lambda m:m.group(1)+'?v='+v+'"',s)
    if f.endswith('sw.js'):
        s=re.sub(r'(const CACHE = "[a-z-]+-v)[^"]*"',lambda m:m.group(1)+v+'"',s)
    open(f,'w',encoding='utf8').write(s)
print('versão',v)
