// =============================================================================
// Edge Function: caca-push
// Push da Caça aos Carimbos para o VISITANTE (sem login). Lê public.caca_push (service_role) e manda um aviso curto.
//
// MODO SEGURO: por padrão `dry_run` é true — só CONTA quantos aparelhos receberiam e devolve o número; nada é enviado.
// Envio real só com `{ dry_run: false }` E autenticação de organização (a mesma do enviar-push: `secret` no corpo, ou o JWT
// nominal em Authorization). Sem agendamento, sem gatilho: ninguém chama isto sozinho. Nunca disparar em teste.
//
// v4 (30/12/2026): modo AVISO — `{ aviso_id, dry_run? }` processa as entregas de um aviso já enviado pelo painel
//   (caca_aviso_enviar). Título/corpo/destino vêm do banco; preferência, janela (08–21h Fortaleza), teto por pessoa/dia e
//   urgente são decididos em caca_aviso_entregas_pendentes. dry_run (padrão) só conta; nada é enviado sem `dry_run:false`.
//   Repetir a chamada enquanto `restam > 0`. Entrega 'adiada' (fora da janela) volta a ser considerada na próxima chamada.
// v5: modo CICLO `{ ciclo:true }` (agendador do banco, a cada 15 min): sem credencial e sem escolha; só processa o que caca_avisos_para_processar() lista.
// Entrada (POST JSON):
//   { secret?, tipo: 'avaliacao_pendente'|'meta'|'grupo'|'edicao', dry_run?: boolean (padrão true),
//     titulo, corpo, url?, mapa_ids?: uuid[], apos?: {criado_em, id} }   titulo/corpo/url só são exigidos no envio real.
// Saída: dry_run -> { ok, dry_run:true, destinatarios, vapid_configurado }
//        real    -> { ok, dry_run:false, destinatarios, enviados, falharam, removidos, limitado, proximo }
//   Cada chamada envia no máximo 500. Com `limitado:true`, repetir a chamada com `apos` = `proximo` até `limitado:false`
//   (sem `apos` reenvia aos mesmos 500 do começo da fila).
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
  const k = await crypto.subtle.importKey('raw', new Uint8Array(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new Uint8Array(dados)))
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
  const chaveUa = await crypto.subtle.importKey('raw', new Uint8Array(uaPublica), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
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
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, chaveAes, new Uint8Array(claro)))

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
      body: new Uint8Array(corpoCifrado),
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

// Processa um lote (até 200 aparelhos) de um aviso JÁ enviado. As regras (preferência, janela, teto, urgente) são decididas no banco.
// deno-lint-ignore no-explicit-any
async function processarAviso(admin: any, aviso: any, vapid: { publica: Uint8Array, privadaD: string, sub: string }) {
  const { data: alvos, error: pErr } = await admin.rpc('caca_aviso_entregas_pendentes', { p_aviso: aviso.id, p_max: 200 })
  if (pErr) return null
  const carga = JSON.stringify({
    titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.destino,
    tag: aviso.urgente ? 'scw-caca-' + aviso.categoria + '-' + aviso.id.slice(0, 8) : 'scw-caca-' + aviso.categoria, tipo: 'caca',
  })
  // deno-lint-ignore no-explicit-any
  const lista: any[] = alvos || []
  const porMapa = new Map<string, boolean>() // mapa -> algum aparelho aceitou
  const mortas: string[] = []
  for (let i = 0; i < lista.length; i += 10) {
    const lote = lista.slice(i, i + 10)
    const res = await Promise.all(lote.map((a) => enviarUm(a, carga, vapid)))
    res.forEach((r, j) => {
      const mid = lote[j].mapa_id as string
      if (r === 'ok') porMapa.set(mid, true)
      else {
        if (!porMapa.has(mid)) porMapa.set(mid, false)
        if (r === 'morta') mortas.push(lote[j].push_id)
      }
    })
  }
  if (mortas.length) await admin.from('caca_push').update({ ativo: false }).in('id', mortas)
  const ok = [...porMapa].filter(([, v]) => v).map(([k]) => k)
  const falhou = [...porMapa].filter(([, v]) => !v).map(([k]) => k)
  if (ok.length) await admin.rpc('caca_aviso_entrega_marcar', { p_estado: 'enviado', p_aviso: aviso.id, p_mapas: ok })
  if (falhou.length) await admin.rpc('caca_aviso_entrega_marcar', { p_estado: 'falhou', p_aviso: aviso.id, p_mapas: falhou })
  const { count: restam } = await admin.from('caca_aviso_entrega')
    .select('mapa_id', { count: 'exact', head: true }).eq('aviso_id', aviso.id).is('push_estado', null)
  return { enviados: ok.length, falharam: falhou.length, removidos: mortas.length, restam: restam ?? 0 }
}

// ── A função ─────────────────────────────────────────────────────────────────
const TIPOS = ['avaliacao_pendente', 'meta', 'grupo', 'edicao', 'voucher', 'imprevisto']
const LIMITE_POR_CHAMADA = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,6})?(Z|[+-]\d\d:\d\d)$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: {
    secret?: string; tipo?: string; dry_run?: boolean; titulo?: string; corpo?: string; url?: string; mapa_ids?: string[]
    aviso_id?: string; ciclo?: boolean; teste?: boolean; chave?: string; endpoint?: string
    apos?: { criado_em: string; id: string } | null
  }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // O teste só pode alcançar o endpoint já vinculado à chave deste mapa. O banco limita a frequência.
  if (payload.teste === true) {
    if (typeof payload.chave !== 'string' || typeof payload.endpoint !== 'string' || payload.chave.length > 256 || payload.endpoint.length > 2048) return json({ ok: false, motivo: 'pedido_invalido' }, 400)
    const vapid = lerVapid()
    if (!vapid) return json({ ok: false, motivo: 'indisponivel' }, 503)
    const { data, error } = await admin.rpc('caca_push_preparar_teste', { p_chave: payload.chave, p_endpoint: payload.endpoint })
    if (error) return json({ ok: false, motivo: 'indisponivel' }, 503)
    if (!data?.ok) return json({ ok: false, motivo: data?.motivo || 'sem_assinatura' }, 400)
    const carga = JSON.stringify({ titulo: 'Tudo pronto para a Caça!', corpo: 'Este é o teste dos seus avisos. Fique de olho nas novidades e oportunidades de prêmios.', url: '/cartoon/caca', tag: 'scw-caca-teste', tipo: 'caca' })
    const resultado = await enviarUm(data.aparelho, carga, vapid)
    if (resultado !== 'ok') return json({ ok: false, motivo: 'falha_envio' }, 503)
    return json({ ok: true })
  }

  // ── Modo CICLO (agendador do banco, a cada 15 min): sem credencial e SEM escolha. Só processa avisos que o banco diz que têm
  // entrega pendente (caca_avisos_para_processar); título, destino e destinatários vêm todos do banco, como no `reenviar` do enviar-push.
  if (payload.ciclo === true) {
    const vapidC = lerVapid()
    if (!vapidC) return json({ ok: true, processados: 0, vapid_configurado: false })
    const { data: ids } = await admin.rpc('caca_avisos_para_processar')
    let enviados = 0; let falharam = 0; let processados = 0
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 5)) {
      const { data: av } = await admin.from('caca_aviso').select('id, categoria, urgente, titulo, corpo, destino, estado').eq('id', id).maybeSingle()
      if (!av || av.estado !== 'enviado') continue
      const o = await processarAviso(admin, av, vapidC)
      if (o) { processados++; enviados += o.enviados; falharam += o.falharam }
    }
    return json({ ok: true, processados, enviados, falharam })
  }

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

  // ── Modo AVISO (v4): processa as entregas de um aviso JÁ ENVIADO pelo painel (caca_aviso_enviar). Título, corpo e destino
  // vêm do banco, nunca do corpo da chamada. As regras (preferência, janela, teto por pessoa/dia, urgente) são decididas em
  // caca_aviso_entregas_pendentes; aqui só se envia o que ela liberou e se grava o resultado. Dry-run só conta.
  if (payload.aviso_id !== undefined) {
    if (typeof payload.aviso_id !== 'string' || !UUID.test(payload.aviso_id)) return json({ erro: 'aviso_id_invalido' }, 422)
    const { data: aviso, error: avErr } = await admin.from('caca_aviso')
      .select('id, categoria, urgente, titulo, corpo, destino, estado').eq('id', payload.aviso_id).maybeSingle()
    if (avErr) return json({ erro: 'db_error' }, 500)
    if (!aviso) return json({ erro: 'aviso_desconhecido' }, 404)
    if (aviso.estado !== 'enviado') return json({ erro: 'aviso_nao_enviado', estado: aviso.estado }, 409)
    const vapidAviso = lerVapid()
    const { count: aguardando, error: cErr } = await admin.from('caca_aviso_entrega')
      .select('mapa_id', { count: 'exact', head: true }).eq('aviso_id', aviso.id).or('push_estado.is.null,push_estado.eq.adiado')
    if (cErr) return json({ erro: 'db_error' }, 500)
    if (dryRun) return json({ ok: true, dry_run: true, aguardando: aguardando ?? 0, vapid_configurado: !!vapidAviso })
    if (!vapidAviso) return json({ erro: 'vapid_ausente' }, 503)

    const out = await processarAviso(admin, aviso, vapidAviso)
    if (out === null) return json({ erro: 'db_error' }, 500)
    return json({ ok: true, dry_run: false, ...out })
  }

  const tipo = (payload.tipo || '').trim()
  if (!TIPOS.includes(tipo)) return json({ erro: 'tipo_invalido' }, 400)

  const ids = payload.mapa_ids
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 1000 || !ids.every((i) => typeof i === 'string' && UUID.test(i)))) {
    return json({ erro: 'mapa_ids_invalido' }, 422)
  }

  const apos = payload.apos
  if (apos !== undefined && apos !== null && !(typeof apos === 'object' && typeof apos.criado_em === 'string' && ISO.test(apos.criado_em) &&
    typeof apos.id === 'string' && UUID.test(apos.id))) return json({ erro: 'apos_invalido' }, 422)

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

  // Cursor: lote a lote por (criado_em, id). Reenviar com `apos` = `proximo` da resposta anterior continua de onde parou
  // (offset não serve: assinatura morta sai do filtro e desloca a fila).
  // deno-lint-ignore no-explicit-any
  let consulta: any = filtro(admin.from('caca_push').select('id, criado_em, endpoint, p256dh, auth_chave', { count: 'exact' }))
  if (apos) consulta = consulta.or(`criado_em.gt.${apos.criado_em},and(criado_em.eq.${apos.criado_em},id.gt.${apos.id})`)
  const { data: alvos, count, error } = await consulta.order('criado_em').order('id').limit(LIMITE_POR_CHAMADA)
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

  const limitado = (count ?? 0) > lista.length
  const ultimo = lista[lista.length - 1]
  return json({
    ok: true, dry_run: false, destinatarios: count ?? lista.length, enviados, falharam, removidos: mortas.length,
    limitado, proximo: limitado && ultimo ? { criado_em: ultimo.criado_em, id: ultimo.id } : null,
  })
})
