const CACHE = "evolab-v42";
const SHELL = ["./", "index.html", "app.js", "lion-core.js", "lion.js", "lion3d.js", "lion-fx.js", "lion.css", "pixel.css", "feedback.js", "effects.css", "assets/lion-cristal.webp", "progression.js", "practice.js", "content.js", "cursos.js", "desafios.js", "ilus.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
 const u = new URL(e.request.url);
 if(e.request.method !== "GET") return;
 if(u.hostname === "api.github.com" || u.hostname.endsWith("githubusercontent.com")) return;
 if(u.origin === location.origin){
   e.respondWith(fetch(e.request, {cache:"no-cache"}).then(r => {if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match(u.pathname).then(v=>v||(e.request.mode==="navigate"?caches.match("index.html"):Response.error())))));
   return;
 }
 if(u.hostname.includes("fonts.g")) e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res;})));
});
