/*
 * Mapa da Doçura — carimbo pelo QR fixo da unidade (docs/cartoon-2026-2/14-mapa-da-docura.md §14.2–14.3).
 *
 * O visitante não tem conta: o banco devolve uma chave uma vez, o site guarda no aparelho
 * (`scw:edicao:<codigo>:mapa`) e o link pessoal leva a chave SEMPRE depois do `#` (não chega à
 * Vercel, ao Analytics nem aos logs). Regras e limites moram no banco (`mapa_carimbar`); aqui só
 * se lê, se mostra e se explica a recusa. Funções puras testadas em tests/cartoon-carimbo.test.mjs.
 */
import { SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabaseConfig.js'

export const chaveMapa = (codigo) => `scw:edicao:${codigo}:mapa`
const FORMATO_CHAVE = /^[A-Za-z0-9_-]{32}$/
export const FORMATO_QR = /^[a-hjkmnp-z2-9]{8}$/
const FUSO = 'America/Fortaleza'

export const chaveValida = (c) => typeof c === 'string' && FORMATO_CHAVE.test(c)

const loja = (a) => a ?? globalThis.localStorage
export function lerChave (codigo, armazenamento) {
  try { const c = loja(armazenamento).getItem(chaveMapa(codigo)); return chaveValida(c) ? c : null } catch { return null }
}
export function gravarChave (codigo, chave, armazenamento) {
  if (!chaveValida(chave)) return false
  try { loja(armazenamento).setItem(chaveMapa(codigo), chave); return true } catch { return false }
}
export function apagarChave (codigo, armazenamento) {
  try { loja(armazenamento).removeItem(chaveMapa(codigo)) } catch { /* sem storage */ }
}

/** `#mapa=<chave>` (sozinho ou com outros parâmetros no hash) → chave; qualquer outra coisa → null. */
export function chaveDoHash (hash) {
  const m = /(?:^#|&)mapa=([^&]+)/.exec(String(hash || ''))
  if (!m) return null
  try { const c = decodeURIComponent(m[1]); return chaveValida(c) ? c : null } catch { return null }
}
export const linkDoMapa = (origem, chave) => `${origem}/cartoon/minha-rota#mapa=${chave}`

/** `/cartoon/carimbo/<código>` → código em minúsculas; formato errado → null. */
export function codigoDoCaminho (caminho) {
  const m = /^\/cartoon\/carimbo\/([^/?#]+)\/?$/i.exec(String(caminho || ''))
  if (!m) return null
  const c = m[1].toLowerCase()
  return FORMATO_QR.test(c) ? c : null
}

const diaEm = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d) // AAAA-MM-DD
function horaEm (d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]))
  return `${Number(p.hour)}h${p.minute}`
}
/** Quando pode carimbar de novo, no fuso de Natal: "depois das 20h40" · "amanhã, depois das 8h10" · "em 07/11, depois das 9h00". */
export function quandoVolta (iso, agora = new Date()) {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  const hoje = diaEm(agora); const dia = diaEm(d)
  const amanha = diaEm(new Date(+agora + 864e5))
  if (dia === hoje) return `depois das ${horaEm(d)}`
  if (dia === amanha) return `amanhã, depois das ${horaEm(d)}`
  return `em ${dia.slice(8, 10)}/${dia.slice(5, 7)}, depois das ${horaEm(d)}`
}
export const distanciaTexto = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

/** Texto da recusa do banco: { titulo, texto }. `casa` = nome da casa do QR lido. */
export function mensagemRecusa (r, { casa = 'esta casa', agora = new Date() } = {}) {
  switch (r?.motivo) {
    case 'cedo': return { titulo: 'Você já carimbou aqui', texto: `Na mesma casa vale uma leitura a cada 12 horas. Volte ${quandoVolta(r.liberado_em, agora)}.` }
    case 'longe': return {
      titulo: `Você não parece estar na ${casa}`,
      texto: `${Number.isFinite(r.distancia_m) ? `Seu celular está a ${distanciaTexto(r.distancia_m)} da casa. ` : ''}Chegue perto do balcão e tente de novo.`,
    }
    case 'sem_localizacao': return { titulo: 'Precisamos da sua localização', texto: `O carimbo confere que você está na ${casa}. Ligue a localização do celular e tente de novo.` }
    case 'nao_aberta': return { titulo: 'O Mapa da Doçura ainda não abriu', texto: r.abre_em ? `Os carimbos começam ${quandoVolta(r.abre_em, agora).replace('depois das', 'às')}.` : 'Os carimbos começam junto com a edição.' }
    case 'encerrada': return { titulo: 'O Mapa da Doçura encerrou', texto: 'Obrigado por rodar a cidade com a gente. O resultado sai pelos canais do festival.' }
    case 'qr_invalido': return { titulo: 'Este QR não vale', texto: 'Ele não é do Mapa da Doçura desta edição ou foi trocado. Leia o adesivo que está no balcão da casa.' }
    case 'mapa_desconhecido': return { titulo: 'Não achamos seu mapa', texto: 'Abra pelo seu link pessoal ou comece um mapa novo.' }
    default: return { titulo: 'Não deu para carimbar agora', texto: 'Tente de novo em instantes.' }
  }
}

/** Erro de `mapa_criar` → texto do campo. */
export function mensagemCriar (erro) {
  return ({
    apelido_invalido: 'O apelido precisa ter de 2 a 24 letras.',
    email_invalido: 'Confira o e-mail.',
    whatsapp_invalido: 'Confira o WhatsApp, com DDD.',
    aceite_obrigatorio: 'Para participar, aceite o regulamento.',
    muitos_pedidos: 'Muitos pedidos agora, tente de novo em alguns minutos.',
  })[erro] || 'Não deu para criar o mapa agora. Tente de novo em instantes.'
}

/**
 * Álbum das casas, na ordem da edição. `participantes` = os publicados (slug, casa); `mapa` = resposta de
 * `mapa_ler` (ou null). Casa colorida = pelo menos um carimbo. Carimbo PENDENTE (Caça aos Carimbos, 04/11): a casa
 * carimbada só conta depois da avaliação do combo — `podeAvaliar` = pendente; `visitadas` conta só as validadas
 * (o "mapa completo" é todas validadas). Os pontos vêm do banco (`carimbo_placar`), já com a mesma regra.
 */
export function estadoAlbum (participantes = [], mapa = null) {
  const porSlug = new Map((mapa?.casas || []).map((c) => [c.slug, c]))
  const casas = participantes.map((p) => {
    const c = porSlug.get(p.slug)
    const carimbos = c?.carimbos || 0
    return { slug: p.slug, nome: p.casa?.nome || p.slug, carimbos, avaliou: !!c?.avaliou, colorida: carimbos > 0, podeAvaliar: carimbos > 0 && !c?.avaliou }
  })
  return {
    casas,
    visitadas: casas.filter((c) => c.colorida && c.avaliou).length,
    pendentes: casas.filter((c) => c.podeAvaliar).length,
    // Caça (mapa_ler_v2): o total e o resto do progresso vêm do servidor; sem eles, a lista da edição.
    total: Number.isFinite(mapa?.total_casas) ? mapa.total_casas : casas.length,
    extras: mapa?.extras || 0, faltam: mapa?.faltam ?? null, empatados: mapa?.empatados || 0,
    pontos: mapa?.pontos || 0, posicao: mapa?.posicao ?? null,
  }
}

/** Chamada anônima ao banco. Erro do PostgREST (exceção da função) vira `Error(<mensagem>)`, ex.: 'email_invalido'. */
export async function chamar (funcao, corpo, { buscar = globalThis.fetch } = {}) {
  const r = await buscar(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const dados = await r.json().catch(() => null)
  if (!r.ok) throw new Error(dados?.message || `rpc_${r.status}`)
  return dados
}

/** Posição do celular: { lat, lng, precisao } ou o motivo ('negada' · 'indisponivel' · 'demorou'). */
export function pedirPosicao ({ geo = globalThis.navigator?.geolocation, espera = 15000 } = {}) {
  return new Promise((resolve) => {
    if (!geo) return resolve({ erro: 'indisponivel' })
    geo.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      (e) => resolve({ erro: e?.code === 1 ? 'negada' : e?.code === 3 ? 'demorou' : 'indisponivel' }),
      { enableHighAccuracy: true, timeout: espera, maximumAge: 0 })
  })
}

const RASCUNHO_AVALIACAO = 'scw:cartoon:avaliacao:rascunho' // o mesmo de cartoon/paginas/awards/Formulario.jsx
/**
 * Prepara a avaliação da casa carimbada: grava no rascunho do formulário a casa, a unidade e o apelido/e-mail do
 * mapa (sem apagar o que a pessoa já tinha digitado) e devolve o endereço do formulário com a casa marcada.
 */
/*
 * Perfil do visitante (Caça aos Carimbos, 04/11): nome, e-mail e WhatsApp digitados no mapa OU na avaliação ficam
 * neste aparelho e preenchem o outro formulário — ninguém redigita. Só no aparelho (localStorage), nunca no banco.
 */
export const chavePerfil = (codigo) => `scw:edicao:${codigo}:perfil`
export function lerPerfil (codigo, armazenamento) {
  try {
    const p = JSON.parse((armazenamento ?? globalThis.localStorage).getItem(chavePerfil(codigo)) || 'null')
    return { nome: p?.nome || '', email: p?.email || '', whatsapp: p?.whatsapp || '' }
  } catch { return { nome: '', email: '', whatsapp: '' } }
}
export function gravarPerfil (codigo, dados, armazenamento) {
  try {
    const s = armazenamento ?? globalThis.localStorage
    const atual = lerPerfil(codigo, s)
    const limpo = Object.fromEntries(Object.entries(dados || {}).filter(([k, v]) => k in atual && typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.trim()]))
    s.setItem(chavePerfil(codigo), JSON.stringify({ ...atual, ...limpo }))
  } catch { /* sem storage: cada formulário pede de novo */ }
}

export function apagarPerfil (codigo, armazenamento) {
  try { (armazenamento ?? globalThis.localStorage).removeItem(chavePerfil(codigo)) } catch { /* sem storage */ }
}

export function prepararAvaliacao ({ caminho, slug, unidade, mapa }, armazenamento) {
  try {
    const s = armazenamento ?? globalThis.sessionStorage
    const atual = JSON.parse(s.getItem(RASCUNHO_AVALIACAO) || 'null') || {}
    s.setItem(RASCUNHO_AVALIACAO, JSON.stringify({ ...atual, slug, unidade: unidade || atual.unidade, nome: atual.nome || mapa?.apelido || '', email: atual.email || mapa?.email || '' }))
  } catch { /* sem storage: o formulário abre com a casa marcada pelo endereço */ }
  return `${caminho}/avaliar?participante=${encodeURIComponent(slug)}${unidade ? `&unidade=${encodeURIComponent(unidade)}` : ''}`
}
