/* Service worker da área da marca — escopo /marca/ APENAS.
 *
 * 🔴 O ESCOPO DE UM SERVICE WORKER É A PASTA EM QUE ELE É SERVIDO.
 * Este arquivo tem que continuar em `public/marca/`. Movido para a raiz, ele
 * assumiria escopo `/` e passaria a interceptar o site inteiro — inclusive a
 * landing /em-breve, que está no ar. Um SW nesse escopo servindo versão velha
 * não se desfaz por deploy: exige desregistro no navegador de CADA visitante.
 *
 * ⚠️ SÃO DOIS SERVICE WORKERS, um por painel, e é de propósito. Um SW só na
 * raiz cobriria os dois com metade do código — e cobriria também o site
 * público, que não pede nada disso. Escopo separado é o que garante que a
 * marca instale a área dela e a organização instale a dela.
 *
 * Offline está FORA DE ESCOPO. Este SW existe por três motivos, nada além:
 *   1. satisfazer o critério de instalabilidade do Chrome, que exige um
 *      handler de `fetch`;
 *   2. servir a casca (fonte e marca) rápido na segunda abertura;
 *   3. receber a notificação quando o painel está fechado — que é o único
 *      lugar onde isso pode acontecer.
 * NÃO cacheia dado do banco. Ver o corte de origem no handler.
 *
 * ⚠️ O nome do serviço de banco não aparece neste arquivo NEM EM COMENTÁRIO —
 * `tests/marca.test.mjs` reprova por regex, e a regra é boa: o jeito mais
 * fácil de um cache de PII nascer é alguém acrescentar o host "só para o
 * offline funcionar". Sem o nome escrito aqui, não há o que copiar e colar.
 */
const VERSAO = 'scw-marca-v1';

/* Só a casca. O HTML não entra aqui — ele é sempre da rede (ver abaixo). */
const CASCA = [
  '/marca/',
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
     `return` já o exclui — e com ele todo o dado da marca. Sem resposta do
     handler, o navegador faz a requisição normalmente, como se o SW não
     existisse. */
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  /* O HTML é SEMPRE da rede. Como o JS do painel é inline no documento,
     cachear o HTML congelaria o painel inteiro numa versão antiga — e uma
     correção só chegaria quando a pessoa limpasse o navegador. O cache aqui é
     socorro de rede caída, não estratégia. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function () { return caches.match('/marca/'); })
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
 * campo de notificação, que não interpreta HTML. É a mesma regra do
 * `escapar()` do painel, aplicada no outro lado do canal.
 */
self.addEventListener('push', function (e) {
  let dados = {};
  try { dados = e.data ? e.data.json() : {}; } catch (err) { dados = {}; }

  const titulo = dados.titulo || 'Sweet & Coffee Week';
  const corpo = dados.corpo || '';
  /* Só caminho interno. Notificação que abre outro site é phishing com a marca
     do festival — e quem clica não vê a URL antes. */
  const destino = (typeof dados.url === 'string' && dados.url.charAt(0) === '/')
    ? dados.url : '/marca/';

  e.waitUntil(self.registration.showNotification(titulo, {
    body: corpo,
    icon: '/favicon-192.png',
    badge: '/favicon-96.png',
    lang: 'pt-BR',
    /* `tag` fixa por destino: dois avisos da mesma coisa se substituem em vez
       de empilhar. Aparelho com quatro cópias do mesmo recado é aparelho que a
       pessoa silencia. */
    tag: 'scw-marca',
    renotify: true,
    data: { url: destino },
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/marca/';

  /* Se o painel já está aberto numa aba, foca essa aba em vez de abrir outra.
     Duas abas do mesmo painel é como se perde trabalho não salvo. */
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (abas) {
        for (let i = 0; i < abas.length; i++) {
          if (abas[i].url.indexOf('/marca/') !== -1 && 'focus' in abas[i]) {
            return abas[i].focus();
          }
        }
        return self.clients.openWindow(destino);
      })
  );
});
