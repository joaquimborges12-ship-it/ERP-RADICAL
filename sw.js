// Service worker: faz o sistema ABRIR NA HORA com a cópia guardada no aparelho (não espera a internet).
// Ao mesmo tempo confere no site se existe versão nova: se existir, já deixa baixada e avisa a tela ("Saiu uma versão nova").
// Os DADOS (OS, vendas, clientes, produtos...) não passam por aqui: vêm do Supabase e ficam guardados no aparelho como antes.
const CACHE = 'radical-v4';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const LIBS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// avisa as telas abertas (repete por alguns segundos: a tela que acabou de abrir pode ainda estar carregando)
async function avisarNovaVersao(idNovo){
  const avisados = new Set();
  for(let i = 0; i < 12; i++){
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if(idNovo){ const c = await self.clients.get(idNovo); if(c) cs.push(c); }
    cs.forEach(c => { if(!avisados.has(c.id)){ c.postMessage({ tipo: 'nova-versao' }); if(i >= 2) avisados.add(c.id); } });
    await new Promise(r => setTimeout(r, 700));
  }
}

// página do sistema: responde com a cópia guardada e atualiza por trás
async function pagina(e){
  const cache = await caches.open(CACHE);
  const chave = new Request(self.registration.scope);
  const guardada = await cache.match(chave);
  const daRede = fetch(e.request, { cache: 'no-cache' }).then(async res => {
    if(res && res.ok && res.type === 'basic'){
      if(guardada){
        try{
          const [a, b] = await Promise.all([guardada.clone().text(), res.clone().text()]);
          if(a !== b){ await cache.put(chave, res.clone()); await avisarNovaVersao(e.resultingClientId); }
        }catch(err){ await cache.put(chave, res.clone()); }
      } else await cache.put(chave, res.clone());
    }
    return res;
  });
  if(guardada){ e.waitUntil(daRede.catch(() => {})); return guardada; }
  try{ return await daRede; }
  catch(err){ return (await cache.match(chave)) || Response.error(); }
}

// bibliotecas, fontes, ícones: usa a cópia guardada na hora e renova por trás
async function guardadoPrimeiro(e){
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(e.request);
  const daRede = fetch(e.request).then(res => { if(res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone()); return res; });
  if(guardada){ e.waitUntil(daRede.catch(() => {})); return guardada; }
  try{ return await daRede; } catch(err){ return Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const u = new URL(req.url);
  if(req.mode === 'navigate' && u.origin === location.origin){ e.respondWith(pagina(e)); return; }
  if(LIBS.includes(u.hostname) || (u.origin === location.origin && !/\/sw\.js$/.test(u.pathname))){ e.respondWith(guardadoPrimeiro(e)); return; }
  // Supabase (dados) e qualquer outro endereço: não mexe
});
