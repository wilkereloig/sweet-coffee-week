/* Service worker do painel da organização — escopo /organizacao/ APENAS.
 *
 * 🔴 O ESCOPO DE UM SERVICE WORKER É A PASTA EM QUE ELE É SERVIDO.
 * Este arquivo tem que continuar em `public/organizacao/`. Movido para a raiz,
 * ele assumiria escopo `/` e passaria a interceptar o site inteiro — inclusive
 * a landing /em-breve, que está no ar. Um SW nesse escopo servindo versão velha
 * não se desfaz por deploy: exige desregistro no navegador de CADA visitante.
 *
 * Offline está FORA DE ESCOPO. Este SW existe por dois motivos, nada além:
 *   1. satisfazer o critério de instalabilidade do Chrome, que exige um handler
 *      de `fetch`;
 *   2. servir a casca (fonte e marca) rápido na segunda abertura.
 * NÃO cacheia dado do banco. Ver o corte de origem no handler.
 *
 * ⚠️ O nome do serviço de banco não aparece neste arquivo NEM EM COMENTÁRIO —
 * `tests/organizacao.test.mjs` reprova por regex, e a regra é boa: o jeito mais
 * fácil de um cache de PII nascer é alguém acrescentar o host "só para o
 * offline funcionar". Sem o nome escrito aqui, não há o que copiar e colar.
 */
const VERSAO = 'scw-org-v1';

/* Só a casca. O HTML não entra aqui — ele é sempre da rede (ver abaixo). */
const CASCA = [
  '/organizacao/',
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
     `return` já o exclui — e com ele todo o PII dos formulários. Sem resposta
     do handler, o navegador faz a requisição normalmente, como se o SW não
     existisse. */
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  /* O HTML é SEMPRE da rede. Como o JS do painel é inline no documento,
     cachear o HTML congelaria o painel inteiro numa versão antiga — e uma
     correção só chegaria quando a pessoa limpasse o navegador. O cache aqui é
     socorro de rede caída, não estratégia. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function () { return caches.match('/organizacao/'); })
    );
    return;
  }

  /* Assets da casca: cache primeiro, rede como reserva. São imutáveis na
     prática (fonte e marca), então servir do cache não esconde correção. */
  e.respondWith(
    caches.match(e.request).then(function (r) { return r || fetch(e.request); })
  );
});
