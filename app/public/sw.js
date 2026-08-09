// Service worker básico — cache "conforme usa" (sem manifest de precache, já que o nome
// do bundle JS muda a cada build e gerar esse manifest exigiria um passo de build à
// parte). Estratégia network-first: sempre tenta a rede primeiro (evita o problema
// clássico de PWA "preso numa versão velha" do app), só cai pro cache quando offline.
// Isso dá instalabilidade + abrir rápido depois da 1ª visita — não é sincronização
// offline de dados reais (postos/mapa continuam precisando de rede pra dado atualizado).
const CACHE_NAME = "abastecai-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
        return resposta;
      })
      .catch(() => caches.match(request).then((cache) => cache || caches.match("/")))
  );
});
