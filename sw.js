// Service worker: permite instalar o app. SEMPRE confere no servidor se há versão nova (sem usar cópia velha do navegador);
// só usa a cópia guardada quando está sem internet. Os dados vêm do Supabase e não passam por aqui.
const CACHE = 'radical-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Supabase e outros: não mexe
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
