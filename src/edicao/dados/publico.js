/*
 * Cliente da projeção pública da edição (§3.6 do plano).
 *
 * Lê SÓ as duas funções abertas do banco — edicao_publica() e
 * participante_publico() — com fetch, sem supabase-js. O que chega já é a lista
 * fechada de campos públicos: nada privado é escondido aqui.
 *
 * Cache: memória + sessionStorage por 5 minutos. Em falha de rede devolve a
 * última cópia marcada `desatualizado`; sem cópia, lança — e a página mostra o
 * estado de falha. Dado de demonstração NUNCA é plano B: só entra em DEV com
 * ?demo=1, e o bloco some do build de produção.
 */
import { SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabaseConfig'
import { urlDaImagem } from './modelo.js'

const VALIDADE = 5 * 60 * 1000
const memoria = new Map()

const demoLigado = () => import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('demo') === '1'

function lerCache (chave) {
  if (memoria.has(chave)) return memoria.get(chave)
  try {
    const bruto = sessionStorage.getItem(chave)
    if (bruto) { const v = JSON.parse(bruto); memoria.set(chave, v); return v }
  } catch { /* armazenamento indisponível */ }
  return null
}
function gravarCache (chave, dados) {
  const v = { em: Date.now(), dados }
  memoria.set(chave, v)
  try { sessionStorage.setItem(chave, JSON.stringify(v)) } catch { /* cheio ou bloqueado */ }
}

async function rpc (funcao, corpo, sinal) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: sinal,
  })
  if (!r.ok) throw new Error(`projecao_${r.status}`)
  return r.json()
}

async function comCache (chave, buscar) {
  const c = lerCache(chave)
  if (c && Date.now() - c.em < VALIDADE) return { ...c.dados, desatualizado: false }
  try {
    const dados = await buscar()
    gravarCache(chave, dados)
    return { ...dados, desatualizado: false }
  } catch (e) {
    if (c) return { ...c.dados, desatualizado: true }
    throw e
  }
}

/** Edição inteira: fase, interruptores e participantes publicados. */
export async function carregarEdicao (codigo, { sinal } = {}) {
  if (demoLigado()) {
    const { DEMO_EDICAO } = await import('./demo/cartoon.js')
    return { ...DEMO_EDICAO, desatualizado: false, demo: true }
  }
  const dados = await comCache(`scw:edicao:${codigo}`, async () => {
    const d = await rpc('edicao_publica', { p_edicao: codigo }, sinal)
    if (!d) throw new Error('edicao_inexistente')
    return d
  })
  return dados
}

/**
 * Um participante pelo slug: { estado, fase?, participante? }.
 * estado = publicado · retirado · nao_divulgado · inexistente.
 * Primeiro tenta a lista da edição já em cache (evita segunda ida ao banco).
 */
export async function carregarParticipante (codigo, slug, { sinal } = {}) {
  if (demoLigado()) {
    const { DEMO_EDICAO } = await import('./demo/cartoon.js')
    const p = DEMO_EDICAO.participantes.find((x) => x.slug === slug)
    return p ? { estado: 'publicado', fase: DEMO_EDICAO.fase, participante: p, demo: true } : { estado: 'inexistente', demo: true }
  }
  const lista = lerCache(`scw:edicao:${codigo}`)
  if (lista && Date.now() - lista.em < VALIDADE) {
    const p = (lista.dados.participantes || []).find((x) => x.slug === slug)
    if (p) return { estado: 'publicado', fase: lista.dados.fase, participante: p, desatualizado: false }
  }
  return comCache(`scw:participante:${codigo}:${slug}`, () => rpc('participante_publico', { p_edicao: codigo, p_slug: slug }, sinal))
}

/** Critérios da avaliação (só vêm com a avaliação aberta). Sem cache: o servidor decide na hora. */
export async function carregarCriterios (codigo) {
  if (demoLigado()) return [
    { chave: 'doce', rotulo: 'Doce', minimo: 5, maximo: 10 }, { chave: 'salgado', rotulo: 'Salgado', minimo: 5, maximo: 10 },
    { chave: 'bebida', rotulo: 'Bebida', minimo: 5, maximo: 10 }]
  return rpc('criterios_avaliacao', { p_edicao: codigo })
}

/** Resultados publicados da edição, ou null antes do interruptor 6. */
export async function carregarResultados (codigo) {
  if (demoLigado()) return null
  return rpc('resultados_publicos', { p_edicao: codigo })
}

/** URL pública de uma imagem do banco ({bucket, path} ou só path do bucket da edição). */
export function imagemPublica (foto, bucket = 'edicao-publico') {
  return urlDaImagem(SUPABASE_URL, foto, bucket)
}

export function limparCacheEdicao (codigo) {
  for (const k of [...memoria.keys()]) if (k.includes(codigo)) memoria.delete(k)
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith('scw:') && k.includes(codigo)) sessionStorage.removeItem(k)
    }
  } catch { /* sem armazenamento */ }
}
