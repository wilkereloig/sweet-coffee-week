// =============================================================================
// Edge Function: enviar-push
// Manda notificação para quem assinou — a organização, ou uma marca.
//
// POR QUE A CRIPTOGRAFIA ESTÁ ESCRITA AQUI, e não numa biblioteca:
//   Web Push não é "POST no endpoint". O corpo vai cifrado com uma chave
//   derivada da chave pública do NAVEGADOR de quem assinou (RFC 8291), e o
//   pedido vai assinado com VAPID (RFC 8292). As bibliotecas de Node para isso
//   dependem de `node:crypto` e de Buffer; aqui roda Deno, e o que existe é
//   Web Crypto. São ~80 linhas de crypto padrão contra uma dependência que
//   pode não resolver no isolate — e dependência que não resolve derruba a
//   função inteira, não só o push.
//
// ⛔ A CHAVE PRIVADA VAPID VIVE SÓ AQUI, em variável de ambiente. Ela nunca
//   entra em public/ nem em src/. A PÚBLICA está no código dos dois painéis de
//   propósito: o navegador precisa dela para assinar, e ela é pública.
//
// ⚠️ ENDPOINT DE PUSH É CREDENCIAL. Quem tem o endpoint de alguém manda
//   notificação para o aparelho dessa pessoa. Por isso `push_subscriptions`
//   não tem policy de SELECT para ninguém — quem lê é esta função, com
//   service_role, e ela nunca devolve endpoint na resposta.
//
// Deploy: supabase functions deploy enviar-push --no-verify-jwt
//   (--no-verify-jwt porque a porta de sempre foi o secret no CORPO, nunca o
//    gateway. Fase 4 do plano de funções da organização, 28/08/2026: sem
//    secret, aceita o JWT da sessão nominal no cabeçalho Authorization.)
//
// Entrada (POST JSON):
//   { secret, alvo: 'organizacao' | 'marca', participante_id?, titulo, corpo, url? }
//   — ou, sem secret, o JWT da sessão nominal em Authorization: Bearer <token>.
// Saída: { ok, enviados, falharam, removidos }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ── Bytes e base64url ────────────────────────────────────────────────────────
const texto = new TextEncoder()

function deB64url(s: string): Uint8Array {
  const base = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base + '='.repeat((4 - (base.length % 4)) % 4))
  const saida = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) saida[i] = bin.charCodeAt(i)
  return saida
}

function paraB64url(b: Uint8Array): string {
  let bin = ''
  // Laço, não `String.fromCharCode(...b)`: espalhar um array grande estoura a
  // pilha de argumentos. Aqui é sempre pequeno, mas o laço custa nada.
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function juntar(...partes: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of partes) total += p.length
  const saida = new Uint8Array(total)
  let i = 0
  for (const p of partes) { saida.set(p, i); i += p.length }
  return saida
}

async function hmac(chave: Uint8Array, dados: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, dados))
}

// HKDF de uma volta só: é o que o RFC 8291 usa, com saída sempre ≤ 32 bytes.
const UM = new Uint8Array([1])
// O separador do RFC 8291 é o BYTE 0x00, e ele fica FORA do literal de texto.
// Escrito como escape dentro da string, já se perdeu no heredoc do shell e no
// JSON do deploy — e das duas vezes o sintoma seria o mesmo: chave diferente e
// o navegador descartando a mensagem sem dizer por quê.
const NUL = new Uint8Array([0])
async function derivar(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) {
  const prk = await hmac(salt, ikm)
  return (await hmac(prk, juntar(info, UM))).slice(0, n)
}

// ── VAPID: o cabeçalho que prova quem está mandando ──────────────────────────
async function assinaturaVapid(endpoint: string, publica: Uint8Array, privadaD: string, sub: string) {
  const cabecalho = paraB64url(texto.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corpo = paraB64url(texto.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub,
  })))

  // A chave privada é só o `d` do JWK; `x` e `y` saem da pública, que são os
  // bytes 1..33 e 33..65 do ponto não comprimido (o primeiro byte é o 0x04).
  const chave = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d: privadaD,
    x: paraB64url(publica.slice(1, 33)),
    y: paraB64url(publica.slice(33, 65)),
    ext: true,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])

  const assinatura = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, chave, texto.encode(cabecalho + '.' + corpo)))

  return 'vapid t=' + cabecalho + '.' + corpo + '.' + paraB64url(assinatura) +
         ', k=' + paraB64url(publica)
}

// ── Cifra do corpo (RFC 8291, aes128gcm) ─────────────────────────────────────
async function cifrar(carga: string, p256dh: string, authChave: string): Promise<Uint8Array> {
  const uaPublica = deB64url(p256dh)      // 65 bytes: 0x04 || x || y
  const segredo = deB64url(authChave)     // 16 bytes

  // Par efêmero: cada envio usa um novo. É o que impede que duas notificações
  // para o mesmo aparelho compartilhem chave.
  const efemero = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', efemero.publicKey))
  const chaveUa = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const compartilhado = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: chaveUa }, efemero.privateKey, 256))

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const ikm = await derivar(segredo,
    compartilhado,
    juntar(texto.encode('WebPush: info'), NUL, uaPublica, asPublica), 32)
  const cek = await derivar(salt, ikm, juntar(texto.encode('Content-Encoding: aes128gcm'), NUL), 16)
  const nonce = await derivar(salt, ikm, juntar(texto.encode('Content-Encoding: nonce'), NUL), 12)

  const chaveAes = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  // O 0x02 no fim é o delimitador de preenchimento do aes128gcm — sem ele o
  // navegador descarta a mensagem sem dizer por quê.
  const claro = juntar(texto.encode(carga), new Uint8Array([2]))
  const cifrado = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, chaveAes, claro))

  // Cabeçalho do corpo: salt(16) | tamanho de registro(4) | tamanho da chave(1) | chave(65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return juntar(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado)
}

// ── A função ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: {
    secret?: string; alvo?: string; participante_id?: string
    titulo?: string; corpo?: string; url?: string
  }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const alvo = (payload.alvo || '').trim()
  const titulo = (payload.titulo || '').trim()
  const corpo = (payload.corpo || '').trim()
  const destino = (payload.url || '').trim()

  if (alvo !== 'organizacao' && alvo !== 'marca') return json({ erro: 'alvo_invalido' }, 400)
  if (!titulo || titulo.length > 80) return json({ erro: 'titulo_invalido' }, 422)
  if (!corpo || corpo.length > 240) return json({ erro: 'corpo_invalido' }, 422)
  // O destino vira o link da notificação. Caminho interno, nunca URL absoluta:
  // notificação que abre outro site é phishing com a marca do festival.
  if (destino && !/^\/[A-Za-z0-9/_-]*$/.test(destino)) return json({ erro: 'url_invalida' }, 422)
  if (alvo === 'marca' && !payload.participante_id) return json({ erro: 'participante_ausente' }, 422)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Duas portas (Fase 4, 28/08/2026): com `secret`, a senha única; sem, o
  // JWT nominal no cabeçalho, resolvido por `pode_por_user`.
  let autorizado = false
  if (secret) {
    const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: 'producao.gerir' })
    if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
    autorizado = data === true
  } else {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userRes, error: jwtErr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: null }
    // gotrue-js não lança em falha de rede — devolve { data: { user: null }, error }.
    // Sem distinguir, um blip do serviço de auth viraria "sessão não vale mais"
    // (401), igual a um token realmente inválido — achado de revisão adversarial.
    if (jwtErr && jwtErr.name === 'AuthRetryableFetchError') {
      return json({ erro: 'auth_indisponivel', detalhe: jwtErr.message }, 503)
    }
    if (userRes?.user) {
      const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: 'producao.gerir' })
      if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
      autorizado = data === true
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // ⚠️ A conferência do ambiente vem DEPOIS de autorizar, de propósito. Antes,
  // qualquer um que chamasse a função descobria se as chaves estão postas — é
  // pouca coisa, e é exatamente o tipo de pouca coisa que descreve o servidor
  // para quem não devia estar perguntando.
  const publicaB64 = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  const privadaD = Deno.env.get('VAPID_PRIVATE_KEY') || ''
  const sub = Deno.env.get('VAPID_SUBJECT') || ''
  if (!publicaB64 || !privadaD || !sub) {
    // Recado explícito: sem as três variáveis a função não tem como assinar, e
    // "falhou em silêncio" num canal de aviso é o pior defeito possível.
    return json({ erro: 'vapid_ausente', detalhe: 'faltam VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT' }, 503)
  }

  let consulta = admin.from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_chave')
    .eq('papel', alvo).eq('ativo', true)
  if (alvo === 'marca') consulta = consulta.eq('participante_id', payload.participante_id)

  const { data: assinaturas, error: lerErr } = await consulta
  if (lerErr) return json({ erro: 'db_error', detalhe: lerErr.message }, 500)
  if (!assinaturas || assinaturas.length === 0) return json({ ok: true, enviados: 0, falharam: 0, removidos: 0 })

  const carga = JSON.stringify({ titulo, corpo, url: destino || (alvo === 'marca' ? '/marca/' : '/organizacao/') })
  const publica = deB64url(publicaB64)

  let enviados = 0
  const mortas: string[] = []
  const falhas: string[] = []

  for (const a of assinaturas) {
    try {
      const corpoCifrado = await cifrar(carga, a.p256dh, a.auth_chave)
      const r = await fetch(a.endpoint, {
        method: 'POST',
        headers: {
          'TTL': '86400',
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          'Authorization': await assinaturaVapid(a.endpoint, publica, privadaD, sub),
        },
        body: corpoCifrado,
      })
      if (r.ok) { enviados++; continue }
      // 404/410: o navegador desinstalou ou a pessoa revogou. Não é erro de
      // envio — é assinatura que deixou de existir, e insistir nela vira ruído
      // em todo envio futuro.
      if (r.status === 404 || r.status === 410) mortas.push(a.id)
      else falhas.push(a.id)
    } catch {
      falhas.push(a.id)
    }
  }

  if (mortas.length) {
    // Desativa, não apaga: apagar dado é decisão de quem toca o festival, não
    // de um laço de envio.
    await admin.from('push_subscriptions').update({ ativo: false }).in('id', mortas)
  }

  return json({ ok: true, enviados, falharam: falhas.length, removidos: mortas.length })
})
