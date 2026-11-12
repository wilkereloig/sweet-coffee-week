/*
 * Mapa da Doçura — carimbo pelo QR fixo da unidade (docs/cartoon-2026-2/14-mapa-da-docura.md §14.2–14.3).
 *
 * O visitante não tem conta: o banco devolve uma chave uma vez, o site guarda no aparelho
 * (`scw:edicao:<codigo>:mapa`) e o link pessoal leva a chave SEMPRE depois do `#` (não chega à
 * Vercel, ao Analytics nem aos logs). Regras e limites moram no banco (`mapa_carimbar`); aqui só
 * se lê, se mostra e se explica a recusa. Funções puras testadas em tests/cartoon-carimbo.test.mjs.
 */
import { SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabaseConfig.js'
import { comEnvio } from '../caca/pwa/pendencias.js'

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

/*
 * QUARENTENA da chave (12/11/2026, pedido do Wilker: "os dados salvos têm que ficar salvos; não quero que as pessoas tenham que recuperar o mapa de novo").
 * Quando o banco deixa de reconhecer a chave do aparelho (confirmado em duas leituras), ela NÃO é apagada: sai do lugar da chave ativa — o aparelho passa
 * a "sem mapa" e mostra a recuperação — e fica guardada à parte. O aparelho a tenta de novo UMA vez por sessão, por até 7 dias: se o problema estava do
 * lado do banco (um erro, uma restauração, uma migration), o mapa volta sozinho, sem código por e-mail. Só `sair`/`apagar` (a pessoa decidiu) e uma
 * chave nova (criação ou recuperação) esvaziam a quarentena; um mapa que o banco conhece de novo também.
 */
export const QUARENTENA_MS = 7 * 24 * 60 * 60 * 1000
const chaveQuarentena = (codigo) => `${chaveMapa(codigo)}:quarentena`
const SESSAO_QUARENTENA = 'scw_caca_quarentena_tentada'

/** `{ chave, desde }` da quarentena (formato conferido) ou null. */
export function lerQuarentena (codigo, armazenamento) {
  try {
    const q = JSON.parse(loja(armazenamento).getItem(chaveQuarentena(codigo)) || 'null')
    return q && chaveValida(q.chave) && Number.isFinite(q.desde) ? { chave: q.chave, desde: q.desde } : null
  } catch { return null }
}
export function apagarQuarentena (codigo, armazenamento) {
  try { loja(armazenamento).removeItem(chaveQuarentena(codigo)) } catch { /* sem storage */ }
}
/** A chave ativa sai do lugar de "chave do aparelho" e vai para a quarentena (grava ANTES de tirar: sem lugar para guardar, nada muda de lugar às cegas). */
export function soltarChave (codigo, { armazenamento, agora = Date.now() } = {}) {
  const k = lerChave(codigo, armazenamento)
  if (k) { try { loja(armazenamento).setItem(chaveQuarentena(codigo), JSON.stringify({ chave: k, desde: agora })) } catch { /* sem espaço: cai no comportamento de sempre */ } }
  apagarChave(codigo, armazenamento)
}
let tentativaAgora = null // { chave, quando }: os ganchos montados juntos na mesma página recebem a MESMA chave para tentar (não um sim e outro não)
/**
 * A chave da quarentena que vale tentar de novo NESTA visita, ou null: uma vez por sessão (`sessao`, padrão sessionStorage) e só até 7 dias depois de
 * ter sido solta; vencida, a quarentena é esvaziada. Chamar isto já conta a tentativa da sessão.
 */
export function chaveDaQuarentena (codigo, { armazenamento, sessao, agora = Date.now() } = {}) {
  const q = lerQuarentena(codigo, armazenamento)
  if (!q) return null
  if (agora - q.desde > QUARENTENA_MS) { apagarQuarentena(codigo, armazenamento); return null }
  if (tentativaAgora && tentativaAgora.chave === q.chave && agora - tentativaAgora.quando < 8000) return q.chave
  try {
    const s = sessao ?? globalThis.sessionStorage
    if (s.getItem(SESSAO_QUARENTENA) === '1') return null // já tentada nesta sessão
    s.setItem(SESSAO_QUARENTENA, '1')
  } catch { /* sem sessionStorage: tenta mesmo assim, uma leitura a mais não custa o mapa */ }
  tentativaAgora = { chave: q.chave, quando: agora }
  return q.chave
}

/** `#mapa=<chave>` (sozinho ou com outros parâmetros no hash) → chave; qualquer outra coisa → null. */
export function chaveDoHash (hash) {
  const m = /(?:^#|&)mapa=([^&]+)/.exec(String(hash || ''))
  if (!m) return null
  try { const c = decodeURIComponent(m[1]); return chaveValida(c) ? c : null } catch { return null }
}
export const linkDoMapa = (origem, chave) => `${origem}/cartoon/mapa#mapa=${chave}`

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
    case 'nao_aberta': return { titulo: 'A Caça aos Carimbos ainda não abriu', texto: r.abre_em ? `Os carimbos começam ${quandoVolta(r.abre_em, agora).replace('depois das', 'às')}.` : 'Os carimbos começam junto com a edição.' }
    case 'encerrada': return { titulo: 'A Caça aos Carimbos encerrou', texto: 'Obrigado por rodar a cidade com a gente. O resultado sai pelos canais do festival.' }
    case 'qr_invalido': return { titulo: 'Este QR não vale', texto: 'Ele não é da Caça aos Carimbos desta edição ou foi trocado. Leia o adesivo que está no balcão da casa.' }
    case 'casa_sem_combo': return { titulo: 'Esta casa ainda não tem combo', texto: 'O carimbo só vale em casa com combo para avaliar. Quando o combo da casa entrar no ar, o carimbo abre.' }
    case 'sem_ponto': return { titulo: 'Esta casa precisa de uma conferência', texto: 'O ponto exato desta casa ainda está sendo conferido, e o QR sozinho não prova que você está lá. Você pode pedir à organização que confira a sua visita.' }
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
const ILEGIVEL = Symbol('corpo ilegível')
export function chamar (funcao, corpo, { buscar = globalThis.fetch } = {}) {
  // `comEnvio`: enquanto a chamada não volta, o app da Caça não troca de versão (carimbo, avaliação e criação do mapa não se perdem).
  return comEnvio(async () => {
    const r = await buscar(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    const dados = await r.json().catch(() => ILEGIVEL)
    if (!r.ok) throw new Error((dados !== ILEGIVEL && dados?.message) || `rpc_${r.status}`)
    // 200 com um corpo que não é JSON (a página de login de um Wi-Fi, um proxy, uma resposta cortada) NÃO é "o banco respondeu null": antes virava `null`, que a Caça lê
    // como "mapa desconhecido" — e o aparelho largava o mapa. Agora é erro de rede (a chave fica). O `null` de verdade chega como o texto JSON `null`; função sem retorno é 204.
    if (dados === ILEGIVEL) { if (r.status === 204) return null; throw new Error('rpc_resposta_ilegivel') }
    return dados
  })
}

/** Posição do celular: { lat, lng, precisao } ou o motivo ('negada' · 'indisponivel' · 'demorou'). */
export function pedirPosicao ({ geo = globalThis.navigator?.geolocation, espera = 15000 } = {}) {
  // O pedido de localização faz parte de um carimbo em andamento: o app não troca de versão enquanto ele não termina.
  return comEnvio(() => new Promise((resolve) => {
    if (!geo) return resolve({ erro: 'indisponivel' })
    geo.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      (e) => resolve({ erro: e?.code === 1 ? 'negada' : e?.code === 3 ? 'demorou' : 'indisponivel' }),
      { enableHighAccuracy: true, timeout: espera, maximumAge: 0 })
  }))
}

/**
 * Três tentativas progressivas de ler o GPS, para o toque em "Carimbar" (Caça aos Carimbos, GPS autônomo).
 * Cada tentativa escuta o sinal (`watchPosition`, alta precisão) por uma janela e pára cedo se a margem fecha no `alvo`
 * dela; senão guarda a MELHOR leitura e tenta de novo com mais folga. Permissão negada pára na hora (não adianta insistir).
 * O servidor decide: aceita até 200 m + a margem do GPS (no máximo 300 m). A posição só vive em memória e só segue para a RPC.
 * Devolve { lat, lng, precisao, tentativas } ou { erro: 'negada' · 'indisponivel' · 'demorou' }.
 */
export const TENTATIVAS_GPS = Object.freeze([
  { janela: 6000, alvo: 50 },
  { janela: 9000, alvo: 100 },
  { janela: 12000, alvo: 250 },
])
function ouvirSinal (geo, { janela, alvo }, { setT, clearT }) {
  return new Promise((resolve) => {
    let melhor = null; let erro = null; let id = null; let fim = false
    const fechar = (r) => { if (fim) return; fim = true; clearT(timer); try { geo.clearWatch(id) } catch { /* sem watch */ } resolve(r) }
    const timer = setT(() => fechar({ melhor, erro }), janela)
    try {
      id = geo.watchPosition(
        (p) => {
          const lido = { lat: p.coords.latitude, lng: p.coords.longitude, precisao: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : 100000 }
          if (!Number.isFinite(lido.lat) || !Number.isFinite(lido.lng)) return
          if (!melhor || !(lido.precisao >= melhor.precisao)) melhor = lido
          if (melhor.precisao <= alvo) fechar({ melhor, erro })
        },
        (e) => { erro = e?.code === 1 ? 'negada' : e?.code === 3 ? 'demorou' : 'indisponivel'; if (erro === 'negada') fechar({ melhor, erro }) },
        { enableHighAccuracy: true, timeout: janela + 3000, maximumAge: 0 })
    } catch { fechar({ melhor, erro: 'indisponivel' }) }
    if (fim) try { geo.clearWatch(id) } catch { /* sem watch */ }
  })
}
export async function capturarPosicao ({ geo = globalThis.navigator?.geolocation, tentativas = TENTATIVAS_GPS, aoTentar, setT = setTimeout, clearT = clearTimeout } = {}) {
  if (!geo || typeof geo.watchPosition !== 'function') return { erro: 'indisponivel' }
  let melhor = null; let erro = null
  for (let i = 0; i < tentativas.length; i += 1) {
    aoTentar?.(i + 1, tentativas.length)
    const r = await ouvirSinal(geo, tentativas[i], { setT, clearT })
    if (r.melhor && (!melhor || r.melhor.precisao < melhor.precisao)) melhor = r.melhor
    if (r.erro) erro = r.erro
    if (r.erro === 'negada') return { erro: 'negada' }
    if (melhor && melhor.precisao <= tentativas[i].alvo) return { ...melhor, tentativas: i + 1 }
  }
  return melhor ? { ...melhor, tentativas: tentativas.length } : { erro: erro || 'demorou' }
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

/*
 * Unidade que a pessoa carimbou, por casa (só neste aparelho). O servidor decide a unidade do carimbo (QR da unidade ou a mais perto
 * do GPS) e `mapa_ler_v2` não a devolve; guardada aqui, a avaliação abre já na unidade certa em vez de na primeira da lista.
 */
export const chaveUnidadeCarimbo = (codigo) => `scw:edicao:${codigo}:unidade-carimbo`
export function lerUnidadeCarimbo (codigo, slug, armazenamento) {
  try {
    const m = JSON.parse(loja(armazenamento).getItem(chaveUnidadeCarimbo(codigo)) || 'null')
    return m && typeof m[slug] === 'string' ? m[slug] : ''
  } catch { return '' }
}
export function gravarUnidadeCarimbo (codigo, slug, unidade, armazenamento) {
  if (typeof slug !== 'string' || !slug || typeof unidade !== 'string' || !unidade) return false
  try {
    const s = loja(armazenamento)
    const m = JSON.parse(s.getItem(chaveUnidadeCarimbo(codigo)) || 'null') || {}
    s.setItem(chaveUnidadeCarimbo(codigo), JSON.stringify({ ...m, [slug]: unidade }))
    return true
  } catch { return false }
}

/** Mesmo e-mail, ignorando maiúsculas e espaços — a regra do servidor para ligar a avaliação ao carimbo. */
export const mesmoEmail = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

/**
 * `codigo` (opcional): sem `unidade` explícita, usa a unidade que a pessoa carimbou. O e-mail do mapa vai junto (`emailMapa`)
 * para o formulário avisar quando o e-mail digitado for outro: a avaliação só valida o carimbo com o mesmo e-mail.
 */
export function prepararAvaliacao ({ caminho, slug, unidade, mapa, codigo }, armazenamento) {
  const un = unidade || (codigo ? lerUnidadeCarimbo(codigo, slug, armazenamento) : '') // `armazenamento` só nos testes: em uso, rascunho na sessão e unidade no localStorage
  try {
    const s = armazenamento ?? globalThis.sessionStorage
    const atual = JSON.parse(s.getItem(RASCUNHO_AVALIACAO) || 'null') || {}
    s.setItem(RASCUNHO_AVALIACAO, JSON.stringify({ ...atual, slug, unidade: un || atual.unidade, nome: atual.nome || mapa?.apelido || '', email: atual.email || mapa?.email || '', emailMapa: mapa?.email || atual.emailMapa || '' }))
  } catch { /* sem storage: o formulário abre com a casa marcada pelo endereço */ }
  return `${caminho}/avaliar?participante=${encodeURIComponent(slug)}${un ? `&unidade=${encodeURIComponent(un)}` : ''}`
}
