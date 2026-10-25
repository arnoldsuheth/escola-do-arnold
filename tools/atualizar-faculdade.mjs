// Criptografa os dados do portal da Estácio com a chave pública do cofre
// e grava faculdade.enc.json. Só a escola, com a senha do Arnold, consegue ler.
// Uso: node tools/atualizar-faculdade.mjs dados.json [cofre.json] [saida.json]
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
const [dadosPath, cofrePath = "cofre.json", outPath = "faculdade.enc.json"] = process.argv.slice(2);
if (!dadosPath) { console.error("informe o arquivo de dados"); process.exit(1); }
const cofre = JSON.parse(readFileSync(cofrePath, "utf8"));
if (!cofre.pub) { console.error("o cofre ainda não tem chave pública: abra a escola uma vez com a senha"); process.exit(2); }
const dados = JSON.parse(readFileSync(dadosPath, "utf8"));
const b64 = b => Buffer.from(b).toString("base64");
const pub = await crypto.subtle.importKey("jwk", {kty:"RSA", n:cofre.pub.n, e:cofre.pub.e, alg:"RSA-OAEP-256", ext:true}, {name:"RSA-OAEP", hash:"SHA-256"}, false, ["encrypt"]);
const aesRaw = crypto.getRandomValues(new Uint8Array(32));
const aes = await crypto.subtle.importKey("raw", aesRaw, {name:"AES-GCM"}, false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv}, aes, new TextEncoder().encode(JSON.stringify(dados)));
const ek = await crypto.subtle.encrypt({name:"RSA-OAEP"}, pub, aesRaw);
writeFileSync(outPath, JSON.stringify({v:1, at:Date.now(), alg:"RSA-OAEP-256+A256GCM", ek:b64(ek), iv:b64(iv), ct:b64(ct)}));
console.log("ok:", outPath);
