/* Service worker do painel unificado — escopo /painel/ APENAS.
 *
 * 🔴 O ESCOPO DE UM SERVICE WORKER É A PASTA EM QUE ELE É SERVIDO.
 * Este arquivo tem que continuar em `public/painel/`. Movido para a raiz, ele
 * assumiria escopo `/` e passaria a interceptar o site inteiro — inclusive a
 * landing /em-breve, que está no ar. Um SW nesse escopo servindo versão velha
 * não se desfaz por deploy: exige desregistro no navegador de CADA visitante.
 *
 * /organizacao/ e /marca/ redirecionam para /painel/ desde 28/09/2026 — é o
 * único endereço dentro deste escopo. Os sw.js daquelas pastas continuam
 * existindo para quem instalou o ícone antigo (CLAUDE.md §10.4-b).
 *
 * O que ele faz, e nada além:
 *   1. critério de instalabilidade (handler de `fetch`);
 *   2. casca offline: o HTML vem da rede e, sem rede, do cache; os arquivos
 *      com hash (/assets/) ficam no cache na primeira visita — sem eles o HTML
 *      guardado abria uma tela em branco. O painel mostra "sem conexão" e não
 *      finge ter dado;
 *   3. push e clique na notificação levando ao item.
 * NÃO cacheia dado do banco. Ver o corte de origem no handler.
 *
 * ⚠️ O nome do serviço de banco não aparece neste arquivo NEM EM COMENTÁRIO —
 * `tests/painel-infra.test.mjs` reprova por regex, e a regra é boa: o jeito
 * mais fácil de um cache de PII nascer é alguém acrescentar o host "só para o
 * offline funcionar". Sem o nome escrito aqui, não há o que copiar e colar.
 */
const VERSAO = 'scw-painel-v2';

/* Só a casca. O HTML entra só como reserva de rede caída (ver abaixo). */
const CASCA = [
  '/painel/',
  '/images/logo-seal-sweet-coffee.svg',
  '/fonts/nexa-slab/NexaSlab-Regular.woff2',
  '/fonts/nexa-slab/NexaSlab-Bold.woff2',
  '/fonts/nexa-slab/NexaSlab-xBold.woff2',
  '/fonts/nexa-slab/NexaSlabBlack.woff2',
];

self.addEventListener('install', function (e) {
  /* `addAll` é tudo-ou-nada: um arquivo que falhe reprova a instalação inteira
     e o SW nem chega a existir. É o comportamento certo aqui — casca pela
     metade seria pior que nenhuma. */
  e.waitUntil(
    caches.open(VERSAO)
      .then(function (c) { return c.addAll(CASCA); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSAO; })
                             .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);

  /* ⛔ NUNCA tocar em rede de dados. O banco vive em OUTRA ORIGEM, então este
     `return` já o exclui — e com ele todo o PII dos formulários e do
     cadastro. Sem resposta do handler, o navegador faz a requisição
     normalmente, como se o SW não existisse. */
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  /* O HTML é SEMPRE da rede. Cachear o HTML congelaria o painel numa versão
     antiga — e uma correção só chegaria quando a pessoa limpasse o
     navegador. O cache aqui é socorro de rede caída, não estratégia. A cópia
     de reserva é renovada a cada navegação que dá certo. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (r) {
        if (r.ok && url.pathname === '/painel/') {
          const copia = r.clone();
          caches.open(VERSAO).then(function (c) { c.put('/painel/', copia); });
        }
        return r;
      }).catch(function () { return caches.match('/painel/'); })
    );
    return;
  }

  /* Arquivos com hash no nome (/assets/…) são imutáveis: o nome muda a cada
     build. Guardar na primeira visita é o que deixa a casca abrir offline. */
  if (url.pathname.indexOf('/assets/') === 0) {
    e.respondWith(
      caches.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (resp) {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(VERSAO).then(function (c) { c.put(e.request, copia); });
          }
          return resp;
        });
      })
    );
    return;
  }

  /* Assets da casca: cache primeiro, rede como reserva. São imutáveis na
     prática (fonte e marca), então servir do cache não esconde correção. */
  e.respondWith(
    caches.match(e.request).then(function (r) { return r || fetch(e.request); })
  );
});

/* ── Notificação ───────────────────────────────────────────────────────────
 * O corpo vem cifrado da função de envio e chega aqui já decifrado pelo
 * navegador. ⚠️ Ele é DADO, nunca marcação: o título e o texto entram por
 * campo de notificação, que não interpreta HTML.
 */
function destinoSeguro(url) {
  /* Só caminho interno, e dentro do painel. Notificação que abre outro site é
     phishing com a marca do festival — e quem clica não vê a URL antes. */
  return (typeof url === 'string' && url.charAt(0) === '/' && url.indexOf('/painel/') === 0)
    ? url : '/painel/';
}

self.addEventListener('push', function (e) {
  let dados = {};
  try { dados = e.data ? e.data.json() : {}; } catch (err) { dados = {}; }

  e.waitUntil(self.registration.showNotification(dados.titulo || 'Sweet & Coffee Week', {
    body: dados.corpo || '',
    icon: '/favicon-192.png',
    badge: '/favicon-96.png',
    lang: 'pt-BR',
    /* Uma tag por aviso (vem da função de envio): avisos diferentes empilham,
       o MESMO aviso reenviado substitui em vez de duplicar. */
    tag: typeof dados.tag === 'string' ? dados.tag : 'scw-painel',
    renotify: true,
    data: { url: destinoSeguro(dados.url) },
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const destino = destinoSeguro(e.notification.data && e.notification.data.url);

  /* Painel já aberto numa aba: foca e manda a aba ir até o item (mensagem,
     não recarga — recarregar perderia o que estiver sendo digitado). Sem aba,
     abre uma nova no destino; o `?ir=` sobrevive ao login. */
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (abas) {
        for (let i = 0; i < abas.length; i++) {
          if (abas[i].url.indexOf('/painel/') !== -1 && 'focus' in abas[i]) {
            abas[i].postMessage({ tipo: 'abrir', url: destino });
            return abas[i].focus();
          }
        }
        return self.clients.openWindow(destino);
      })
  );
});
