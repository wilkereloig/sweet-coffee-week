/* Service worker da Caça aos Carimbos — escopo /cartoon/caca APENAS.
 *
 * O escopo é fixado no registro (`register('/caca-sw.js', { scope: '/cartoon/caca' })`) e confirmado pelo cabeçalho
 * Service-Worker-Allowed do vercel.json. O arquivo mora na raiz pública só para poder ter esse escopo sem depender de uma pasta;
 * ele NÃO controla o resto do site nem o painel (/painel/ tem o service worker próprio, em public/painel/sw.js).
 *
 * O que ele faz, e nada além:
 *   1. critério de instalabilidade (um handler de `fetch` que não responde nada: a rede segue como sempre);
 *   2. receber push do tipo 'caca' e mostrar a notificação;
 *   3. ao tocar na notificação, abrir ou focar a central da Caça.
 * NÃO guarda cache (nada de offline prometido) e NÃO guarda dado de ninguém. A carga do push nunca traz apelido, e-mail,
 * chave nem link de recuperação (contrato metas-push §5): só título, corpo e um caminho interno.
 */
var ESCOPO = '/cartoon/caca';
var CENTRAL = '/cartoon/caca';
var ICONE = '/images/caca/app-icone-192-v2.png';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* Sem respondWith: o navegador busca na rede normalmente. Existe só para a instalação (Chrome costumava exigir). */
self.addEventListener('fetch', function () {});

/* Só caminho interno dentro do escopo da Caça; qualquer outra coisa vira a central. */
function destino(url) {
  if (typeof url !== 'string' || url.charAt(0) !== '/' || url.charAt(1) === '/') return CENTRAL;
  var limpo = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return limpo === ESCOPO || limpo.indexOf(ESCOPO + '/') === 0 ? url : CENTRAL;
}

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }
  var titulo = typeof d.titulo === 'string' && d.titulo ? d.titulo.slice(0, 80) : 'Caça aos Tesouros SCW';
  var corpo = typeof d.corpo === 'string' ? d.corpo.slice(0, 240) : '';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: corpo,
    icon: ICONE,
    badge: ICONE,
    tag: typeof d.tag === 'string' && d.tag ? d.tag.slice(0, 60) : 'scw-caca',
    data: { url: destino(d.url) }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var alvo = (e.notification.data && e.notification.data.url) || CENTRAL;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (abas) {
    for (var i = 0; i < abas.length; i++) {
      var caminho = '';
      try { caminho = new URL(abas[i].url).pathname; } catch (err) { caminho = ''; }
      if (caminho === ESCOPO || caminho.indexOf(ESCOPO + '/') === 0) {
        return abas[i].focus().then(function (c) { return c && 'navigate' in c ? c.navigate(alvo) : c; });
      }
    }
    return self.clients.openWindow(alvo);
  }));
});
