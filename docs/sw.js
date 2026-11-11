// Guarda os arquivos do app no aparelho para ele abrir sem internet.
// Com internet, busca sempre a versão mais nova; sem internet, usa a cópia guardada.
const CACHE = "calorias-202611111218";
const ARQUIVOS = ["./", "index.html", "manifest.webmanifest", "zxing.min.js", "icone-192.png", "icone-512.png", "icone-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Open Food Facts e Google passam direto
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache" }) // sempre confere se há versão nova no servidor
      .then((resposta) => {
        if (resposta.ok) { const copia = resposta.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
        return resposta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
