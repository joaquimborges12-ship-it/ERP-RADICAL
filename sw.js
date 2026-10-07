// Service worker simples: permite instalar o app. Sempre busca a versão mais nova na internet
// (os dados vêm do Supabase); se estiver sem internet, abre a última versão guardada.
const CACHE = 'radical-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Supabase e outros: não mexe
  e.respondWith(
    fetch(req).then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
