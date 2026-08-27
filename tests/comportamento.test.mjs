/*
 * Testes que EXECUTAM o código, em vez de conferir o texto dele.
 *
 * ⚠️ A seção "O rpc() do painel da organização" que existia aqui saiu em
 * 27/08/2026, junto com public/organizacao/index.html: /organizacao passou a
 * servir o painel React (painel-app/), e o `rpc()` que ela testava por
 * extração de texto + `new Function` agora é um módulo de verdade —
 * `painel-app/src/lib/rpc.js`, importado direto (sem extração, sem eval) por
 * tests/painel-app-rpc.test.mjs. Isso é estritamente melhor que o que saiu:
 * import real de módulo ES, não recorte de string por posição de chave.
 *
 * POR QUE O RESTO DESTE ARQUIVO EXISTE, e é a lição mais cara desta série de
 * fases: medir a FONTE por expressão regular é útil — pega chave secreta,
 * arrow function, dado indo cru para innerHTML —, mas não pega comportamento.
 * Em 25/08/2026 o `rpc()` do painel quebrava em TODA função `returns void` do
 * Postgres, e sete RPCs caem nessa categoria: cinco botões da Fase 6 estavam
 * mortos e a suíte inteira passava.
 *
 *   A prova daquela fase também não pegou, e o motivo importa: ela chamou as
 *   RPCs por `curl`, lendo o corpo FORA do painel. **Chamada por HTTP não é
 *   chamada pelo caminho do código.**
 *
 * COMO: as funções são extraídas do arquivo real e executadas com as
 * dependências injetadas. Nada é reimplementado aqui — reimplementar provaria
 * a reimplementação, que é o defeito clássico deste tipo de teste.
 *
 * Rodar: node --test tests/comportamento.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { transformSync } from 'esbuild'

const RAIZ = new URL('../', import.meta.url)
const ler = (p) => readFileSync(new URL(p, RAIZ), 'utf8')

/* ═══════════════════════════════════════════════════════════════════════════
   2 · O validador de caminho da Edge Function `arquivo-url`
   ═══════════════════════════════════════════════════════════════════════════ */

// ⚠️ É a ÚNICA coisa que separa "subir arquivo da marca X" de "escrever por
// cima do arquivo da marca Y". A URL assinada vale para UM caminho, e é este
// código que decide qual — então ele merece ser executado, não lido.
function daFuncao(arquivo, exportar) {
  const fonte = ler('supabase/functions/' + arquivo + '/index.ts')
    .replace(/import \{ createClient \}[^\n]*\n/, '')
    .replace(/Deno\.serve\([\s\S]*$/, '')
  const js = transformSync(fonte, { loader: 'ts', format: 'cjs' }).code
  const mod = { exports: {} }
  new Function('module', 'exports', 'Deno', js + '\n' + exportar)(
    mod, mod.exports, { env: { get: () => '' } })
  return mod.exports
}

const { caminhoValido } = daFuncao('arquivo-url', 'exports.caminhoValido = caminhoValido')
const UUID = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'

test('caminhoValido aceita as duas pastas legítimas', () => {
  assert.equal(caminhoValido('geral/regulamento.pdf'), true)
  assert.equal(caminhoValido(UUID + '/combo-doce.jpg'), true)
  assert.equal(caminhoValido('geral/Guia_2027-final.PDF'), true)
})

test('caminhoValido recusa tudo que tenta sair da pasta', () => {
  for (const ruim of [
    '../segredo.pdf',
    'geral/../../etc/passwd',
    'geral/sub/arquivo.pdf',      // profundidade a mais
    'geral',                       // sem arquivo
    'geral/',                      // arquivo vazio
    'outra-pasta/arquivo.pdf',     // pasta que não é geral nem UUID
    'geral/.oculto',               // nome começando com ponto
    'geral/arquivo com espaco.pdf',
    'geral/arquivo;rm -rf.pdf',
    UUID.slice(0, -1) + '/x.pdf',  // UUID malformado
    '',
  ]) {
    assert.equal(caminhoValido(ruim), false, 'devia recusar: ' + JSON.stringify(ruim))
  }
})

test('caminhoValido recusa nome longo demais', () => {
  assert.equal(caminhoValido('geral/' + 'a'.repeat(121)), false)
  assert.equal(caminhoValido('geral/' + 'a'.repeat(120)), true)
})

/* ═══════════════════════════════════════════════════════════════════════════
   3 · A criptografia do Web Push, executada
   ═══════════════════════════════════════════════════════════════════════════ */

const push = daFuncao('enviar-push',
  'exports.cifrar = cifrar; exports.assinaturaVapid = assinaturaVapid;' +
  'exports.deB64url = deB64url; exports.paraB64url = paraB64url')

const texto = new TextEncoder()
const b64url = (b) => Buffer.from(b).toString('base64url')
const juntar = (...ps) => {
  const s = new Uint8Array(ps.reduce((a, p) => a + p.length, 0))
  let i = 0
  for (const p of ps) { s.set(p, i); i += p.length }
  return s
}
const hmac = async (chave, dados) => new Uint8Array(await webcrypto.subtle.sign('HMAC',
  await webcrypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
  dados))

test('o corpo cifrado volta ao original quando decifrado como o navegador decifra', async () => {
  // Faz o papel do NAVEGADOR: gera o par dele e o segredo de autenticação, que
  // é exatamente o que `pushManager.subscribe` devolve.
  const parUa = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const uaPublica = new Uint8Array(await webcrypto.subtle.exportKey('raw', parUa.publicKey))
  const segredoAuth = webcrypto.getRandomValues(new Uint8Array(16))

  const CARGA = JSON.stringify({ titulo: 'Teste', corpo: 'Chegou inteiro.', url: '/organizacao/' })
  const corpo = await push.cifrar(CARGA, b64url(uaPublica), b64url(segredoAuth))

  // Cabeçalho do aes128gcm: salt(16) | registro(4) | tamanho da chave(1) | chave
  const salt = corpo.slice(0, 16)
  const rs = new DataView(corpo.buffer, corpo.byteOffset + 16, 4).getUint32(0)
  const idlen = corpo[20]
  const asPublica = corpo.slice(21, 21 + idlen)
  const cifrado = corpo.slice(21 + idlen)

  assert.equal(rs, 4096, 'tamanho de registro anunciado')
  assert.equal(idlen, 65, 'ponto P-256 não comprimido tem 65 bytes')

  // Derivação do lado do navegador, seguindo o RFC 8291.
  const UM = new Uint8Array([1])
  const NUL = new Uint8Array([0])
  const chaveAs = await webcrypto.subtle.importKey('raw', asPublica,
    { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const compartilhado = new Uint8Array(await webcrypto.subtle.deriveBits(
    { name: 'ECDH', public: chaveAs }, parUa.privateKey, 256))

  const prkChave = await hmac(segredoAuth, compartilhado)
  const ikm = (await hmac(prkChave,
    juntar(texto.encode('WebPush: info'), NUL, uaPublica, asPublica, UM))).slice(0, 32)
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, juntar(texto.encode('Content-Encoding: aes128gcm'), NUL, UM))).slice(0, 16)
  const nonce = (await hmac(prk, juntar(texto.encode('Content-Encoding: nonce'), NUL, UM))).slice(0, 12)

  const claro = new Uint8Array(await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    await webcrypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']),
    cifrado))

  assert.equal(claro[claro.length - 1], 2, 'falta o delimitador 0x02 do aes128gcm')
  assert.equal(new TextDecoder().decode(claro.slice(0, -1)), CARGA)
})

test('cada envio usa um par efêmero novo', async () => {
  // Duas notificações para o mesmo aparelho não podem compartilhar chave.
  const par = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const ua = b64url(new Uint8Array(await webcrypto.subtle.exportKey('raw', par.publicKey)))
  const auth = b64url(webcrypto.getRandomValues(new Uint8Array(16)))

  const a = await push.cifrar('x', ua, auth)
  const b = await push.cifrar('x', ua, auth)
  assert.notDeepEqual(a.slice(21, 86), b.slice(21, 86), 'a chave efêmera se repetiu')
  assert.notDeepEqual(a.slice(0, 16), b.slice(0, 16), 'o salt se repetiu')
})

test('o cabeçalho VAPID é um JWT ES256 que verifica contra a própria chave', async () => {
  // Par descartável, gerado aqui: o teste não pode depender da chave real, que
  // vive fora do repositório.
  const par = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const publica = new Uint8Array(await webcrypto.subtle.exportKey('raw', par.publicKey))
  const jwk = await webcrypto.subtle.exportKey('jwk', par.privateKey)

  const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/exemplo'
  const cabecalho = await push.assinaturaVapid(ENDPOINT, publica, jwk.d, 'mailto:x@y.z')

  assert.match(cabecalho, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/)
  const t = cabecalho.match(/t=([^,]+)/)[1]
  const k = cabecalho.match(/k=(.+)$/)[1]
  const [h, p, s] = t.split('.')

  assert.equal(k, push.paraB64url(publica), 'k= tem que ser a chave que assinou')
  assert.ok(await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' },
    par.publicKey, push.deB64url(s), texto.encode(h + '.' + p)), 'assinatura não verifica')

  const corpo = JSON.parse(new TextDecoder().decode(push.deB64url(p)))
  assert.equal(corpo.aud, 'https://fcm.googleapis.com', 'aud tem que ser a ORIGEM do endpoint')
  const horas = (corpo.exp - Date.now() / 1000) / 3600
  assert.ok(horas > 0 && horas <= 24, 'o RFC 8292 limita a validade a 24 h; deu ' + horas)
  assert.equal(JSON.parse(new TextDecoder().decode(push.deB64url(h))).alg, 'ES256')
})

test('o aud acompanha o serviço de push, e não fica preso ao Google', async () => {
  // Foi o WNS da Microsoft que entregou a primeira notificação real, não o FCM.
  // Assinar sempre com o mesmo `aud` faria o outro serviço recusar.
  const par = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const publica = new Uint8Array(await webcrypto.subtle.exportKey('raw', par.publicKey))
  const d = (await webcrypto.subtle.exportKey('jwk', par.privateKey)).d

  for (const [endpoint, esperado] of [
    ['https://wns2-bl2p.notify.windows.com/w/?token=abc', 'https://wns2-bl2p.notify.windows.com'],
    ['https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://updates.push.services.mozilla.com'],
  ]) {
    const c = await push.assinaturaVapid(endpoint, publica, d, 'mailto:x@y.z')
    const corpo = JSON.parse(new TextDecoder().decode(
      push.deB64url(c.match(/t=[^.]+\.([^.]+)\./)[1])))
    assert.equal(corpo.aud, esperado)
  }
})

/* ═══════════════════════════════════════════════════════════════════════════
   4 · A regra de declaração, na página estática que resta
   ═══════════════════════════════════════════════════════════════════════════ */

// ⚠️ 'marca' e 'organizacao' saíram em 27/08/2026 — /marca e /organizacao
// passaram a servir o painel React (painel-app/), que passa pelo Vite e não
// tem esta classe de bug (build falha antes). 'quero-participar' continua
// estático, fora do bundle, e continua exposto ao mesmo risco.
test('nenhuma função declarada como arrow na página estática que resta', () => {
  // O motivo é hoisting: arrow em `const` referenciada acima da própria linha
  // estoura em ReferenceError, e como esses scripts nunca passam pelo Vite,
  // isso só apareceria com a tela aberta na frente de alguém.
  for (const pagina of ['quero-participar']) {
    const js = (ler('public/' + pagina + '/index.html')
      .match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1]
    const achadas = [...js.matchAll(
      /^[ \t]*(?:const|let|var)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]+)?\([^)]*\)[ \t]*=>/gm)]
      .map((m) => m[1])
    assert.deepEqual(achadas, [], pagina + ': função em arrow — ' + achadas.join(', '))
  }
})

test('a página estática que resta traz exatamente um bloco de script', () => {
  for (const pagina of ['quero-participar']) {
    const html = ler('public/' + pagina + '/index.html')
    assert.equal((html.match(/<script[\s>]/g) || []).length, 1, pagina + ': mais de um <script>')
  }
})
