// =============================================================================
// Edge Function: caca-push
// Push da Caça aos Carimbos para o VISITANTE (sem login). Lê public.caca_push (service_role) e manda um aviso curto.
//
// MODO SEGURO: por padrão `dry_run` é true — só CONTA quantos aparelhos receberiam e devolve o número; nada é enviado.
// Envio real só com `{ dry_run: false }` E autenticação de organização (a mesma do enviar-push: `secret` no corpo, ou o JWT
// nominal em Authorization). Sem agendamento, sem gatilho: ninguém chama isto sozinho. Nunca disparar em teste.
//
// Entrada (POST JSON):
//   { secret?, tipo: 'avaliacao_pendente'|'meta'|'grupo'|'edicao', dry_run?: boolean (padrão true),
//     titulo, corpo, url?, mapa_ids?: uuid[] }      titulo/corpo/url só são exigidos no envio real.
// Saída: dry_run -> { ok, dry_run:true, destinatarios, vapid_configurado }
//        real    -> { ok, dry_run:false, destinatarios, enviados, falharam, removidos, limitado }
//   Nunca devolve endpoint, chave nem dado do visitante.
// Carga mínima: { titulo, corpo, url, tag: 'scw-caca-<tipo>', tipo: 'caca' } — sem apelido, e-mail, chave ou link de recuperação.
//
// Variáveis de ambiente (já existentes para o enviar-push; só os NOMES aqui): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. O Painel SCW (enviar-push / push_subscriptions) NÃO é tocado.
//
// ponytail: a criptografia Web Push abaixo é cópia da de enviar-push (lá o arquivo tem Deno.serve e não exporta módulo).
// Extrair para um módulo compartilhado quando houver uma terceira cópia.
//
// Deploy: supabase functions deploy caca-push --no-verify-jwt   (auth própria, como enviar-push)
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

// ── Um aparelho: 'ok' (o serviço de push aceitou — NÃO é prova de que apareceu
// na tela), 'morta' (404/410: desinstalou ou revogou) ou 'falhou' (tenta depois).
// deno-lint-ignore no-explicit-any
async function enviarUm(a: any, carga: string, vapid: { publica: Uint8Array, privadaD: string, sub: string }) {
  try {
    const corpoCifrado = await cifrar(carga, a.p256dh, a.auth_chave)
    const r = await fetch(a.endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Authorization': await assinaturaVapid(a.endpoint, vapid.publica, vapid.privadaD, vapid.sub),
      },
      body: corpoCifrado,
      // Um serviço de push pendurado não pode travar o laço inteiro.
      signal: AbortSignal.timeout(10000),
    })
    if (r.ok) return 'ok'
    // 404/410: o navegador desinstalou ou a pessoa revogou. Não é erro de
    // envio — é assinatura que deixou de existir, e insistir nela vira ruído
    // em todo envio futuro.
    return r.status === 404 || r.status === 410 ? 'morta' : 'falhou'
  } catch {
    return 'falhou'
  }
}

function lerVapid() {
  const publicaB64 = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  const privadaD = Deno.env.get('VAPID_PRIVATE_KEY') || ''
  const sub = Deno.env.get('VAPID_SUBJECT') || ''
  if (!publicaB64 || !privadaD || !sub) return null
  return { publica: deB64url(publicaB64), privadaD, sub }
}

// ── A função ─────────────────────────────────────────────────────────────────
const TIPOS = ['avaliacao_pendente', 'meta', 'grupo', 'edicao']
const LIMITE_POR_CHAMADA = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: {
    secret?: string; tipo?: string; dry_run?: boolean; titulo?: string; corpo?: string; url?: string; mapa_ids?: string[]
  }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Autenticação de organização ANTES de qualquer outra coisa (inclusive o dry_run): contar assinantes também é dado interno.
  // Duas portas, como em enviar-push: `secret` (senha única) ou JWT nominal.
  const secret = (payload.secret || '').trim()
  let autorizado = false
  if (secret) {
    const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: 'producao.gerir' })
    if (authErr) return json({ erro: 'db_error' }, 500)
    autorizado = data === true
  } else {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userRes, error: jwtErr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: null }
    if (jwtErr && jwtErr.name === 'AuthRetryableFetchError') return json({ erro: 'auth_indisponivel' }, 503)
    if (userRes?.user) {
      const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: 'producao.gerir' })
      if (authErr) return json({ erro: 'db_error' }, 500)
      autorizado = data === true
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // Só `dry_run: false` (booleano) liga o envio real; qualquer outra coisa é simulação.
  const dryRun = payload.dry_run !== false
  const tipo = (payload.tipo || '').trim()
  if (!TIPOS.includes(tipo)) return json({ erro: 'tipo_invalido' }, 400)

  const ids = payload.mapa_ids
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 1000 || !ids.every((i) => typeof i === 'string' && UUID.test(i)))) {
    return json({ erro: 'mapa_ids_invalido' }, 422)
  }

  const vapid = lerVapid()

  // Só quem está ativo E quer este tipo de aviso (tipo vem da lista fechada acima).
  // deno-lint-ignore no-explicit-any
  const filtro = (q: any) => {
    q = q.eq('ativo', true).eq('prefs->>' + tipo, 'true')
    return ids && ids.length ? q.in('mapa_id', ids) : q
  }

  if (dryRun) {
    const { count, error } = await filtro(admin.from('caca_push').select('id', { count: 'exact', head: true }))
    if (error) return json({ erro: 'db_error' }, 500)
    return json({ ok: true, dry_run: true, destinatarios: count ?? 0, vapid_configurado: !!vapid })
  }

  // ── Envio real ──
  const titulo = (payload.titulo || '').trim()
  const corpo = (payload.corpo || '').trim()
  const destino = (payload.url || '/').trim()
  if (!titulo || titulo.length > 80) return json({ erro: 'titulo_invalido' }, 422)
  if (!corpo || corpo.length > 240) return json({ erro: 'corpo_invalido' }, 422)
  // Caminho interno, nunca URL absoluta (notificação que abre outro site é phishing com a marca do festival).
  if (!/^\/(?!\/)[A-Za-z0-9/_-]*$/.test(destino)) return json({ erro: 'url_invalida' }, 422)
  if (!vapid) return json({ erro: 'vapid_ausente', detalhe: 'faltam VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT' }, 503)

  const { data: alvos, count, error } = await filtro(
    admin.from('caca_push').select('id, endpoint, p256dh, auth_chave', { count: 'exact' }),
  ).order('criado_em').limit(LIMITE_POR_CHAMADA)
  if (error) return json({ erro: 'db_error' }, 500)

  const carga = JSON.stringify({ titulo, corpo, url: destino, tag: 'scw-caca-' + tipo, tipo: 'caca' })
  let enviados = 0
  let falharam = 0
  const mortas: string[] = []
  const lista = alvos || []
  for (let i = 0; i < lista.length; i += 10) {
    const lote = lista.slice(i, i + 10)
    // deno-lint-ignore no-explicit-any
    const res = await Promise.all(lote.map((a: any) => enviarUm(a, carga, vapid)))
    res.forEach((r, j) => {
      if (r === 'ok') enviados++
      else if (r === 'morta') mortas.push(lote[j].id)
      else falharam++
    })
  }
  // Desativa, não apaga (assinatura que o navegador revogou: 404/410).
  if (mortas.length) await admin.from('caca_push').update({ ativo: false }).in('id', mortas)

  return json({
    ok: true, dry_run: false, destinatarios: count ?? lista.length, enviados, falharam, removidos: mortas.length,
    limitado: (count ?? 0) > lista.length,
  })
})
