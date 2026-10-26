// Laboratório local em memória: não é uma API de produção.
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
const produtos=new Map([['nuvem',{id:'nuvem',nome:'Nuvem',preco:10000}]]);
export function validar(p){return !!p&&typeof p.id==='string'&&/^[a-z0-9-]{1,40}$/.test(p.id)&&typeof p.nome==='string'&&p.nome.trim().length>0&&p.nome.length<=120&&Number.isSafeInteger(p.preco)&&p.preco>=0;}
export const server=createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 if(req.url==='/api/produtos'&&req.method==='GET')return send(200,[...produtos.values()]);
 if(req.url==='/api/produtos'&&req.method==='POST'){
  if(!String(req.headers['content-type']).startsWith('application/json'))return send(415,{erro:'Use application/json'});
  let body='',size=0;
  try{for await(const chunk of req){size+=chunk.length;if(size>16384)return send(413,{erro:'Corpo excede 16 KiB'});body+=chunk.toString();}
   const p=JSON.parse(body);if(!validar(p))return send(400,{erro:'Produto inválido'});
   if(produtos.has(p.id))return send(409,{erro:'ID já existe'});
   produtos.set(p.id,{id:p.id,nome:p.nome.trim(),preco:p.preco});return send(201,produtos.get(p.id));
  }catch{return send(400,{erro:'JSON inválido'});}
 }
 return send(404,{erro:'Rota não encontrada'});
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(3000,'127.0.0.1',()=>console.log('Laboratório: http://127.0.0.1:3000/api/produtos'));
