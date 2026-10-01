/*
 * Endereço do painel depois do `#` (reestruturação 29/09/2026) — lógica pura,
 * testada em tests/painel-app-rota.test.mjs.
 *
 *   #participantes/lista?item=<uuid>&sub=mensagens&situacao=sem_acesso
 *    └── vista ──┘ └aba┘ └────────────── filtros ──────────────────┘
 *
 * `item` abre a ficha; `sub` escolhe a aba DENTRO da ficha. Tudo o mais é
 * filtro de lista (busca, situação, ordem). Fica no `#` para não precisar de
 * regra no servidor nem mexer no service worker (escopo /painel/).
 *
 * Os links que o banco grava nas notificações (`marcas/<id>/mensagens`,
 * `producao/pedido/<id>`…) são de antes dos módulos novos: `rotaDoLink`
 * traduz os dois formatos, os antigos e os novos.
 */

/** "#vista/aba?k=v" → { vista, aba, filtros } (vista '' quando vazio). */
export function lerRota(hash) {
  const h = String(hash || '').replace(/^#/, '')
  const i = h.indexOf('?')
  const caminho = i < 0 ? h : h.slice(0, i)
  let partes
  // Endereço colado com % solto ("#marcas%") faz decodeURIComponent lançar;
  // lido no useState inicial, derrubaria o painel. Vira rota vazia.
  try { partes = caminho.split('/').filter(Boolean).map(decodeURIComponent) } catch { return { vista: '', aba: '', filtros: {} } }
  const [vista = '', aba = ''] = partes
  const filtros = {}
  if (i >= 0) for (const [k, v] of new URLSearchParams(h.slice(i + 1))) if (v !== '') filtros[k] = v
  return { vista, aba, filtros }
}

/** { vista, aba, filtros } → "#vista/aba?k=v" — chaves em ordem, vazios fora. */
export function montarRota({ vista, aba = '', filtros = {} }) {
  let s = '#' + encodeURIComponent(vista || '')
  if (aba) s += '/' + encodeURIComponent(aba)
  const q = new URLSearchParams()
  for (const k of Object.keys(filtros).sort()) {
    const v = filtros[k]
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v))
  }
  const qs = q.toString()
  return qs ? s + '?' + qs : s
}

/** Mesma rota? (compara a forma montada, que é canônica). */
export function mesmaRota(a, b) { return montarRota(a) === montarRota(b) }

// Módulos da organização (§3 da spec) e a aba inicial de cada um.
export const ABA_INICIAL = {
  visao: '', participantes: 'lista', contatos: 'pessoas', operacao: 'pedidos',
  arquivos: 'gerais', edicao: 'configuracao', admin: 'equipe',
}

// Respostas: de onde veio decide o módulo.
function rotaResposta(origem, id) {
  const filtros = { origem: origem || undefined, item: id || undefined }
  if (!origem || origem === 'quero_participar') return { vista: 'participantes', aba: 'candidaturas', filtros }
  return { vista: 'contatos', aba: 'recebidos', filtros }
}

const EDICAO_ABA = {
  temas: ['participantes', 'temas'], vendas: ['participantes', 'vendas'],
  revisao: ['admin', 'revisao'], importacoes: ['admin', 'importacoes'],
  configuracao: ['edicao', 'configuracao'], edicoes: ['edicao', 'edicoes'],
}
const PRODUCAO_ABA = {
  pedido: ['operacao', 'pedidos'], pedidos: ['operacao', 'pedidos'],
  sessao: ['operacao', 'fotos'], fotos: ['operacao', 'fotos'], agenda: ['operacao', 'fotos'],
  material: ['operacao', 'materiais'], materiais: ['operacao', 'materiais'],
  arquivo: ['arquivos', 'gerais'], arquivos: ['arquivos', 'gerais'],
  edicao: ['edicao', 'configuracao'],
}

/**
 * Link curto (do banco, de um aviso derivado ou de outra vista) → rota.
 * Aceita os segmentos antigos (mesa, marcas, respostas, producao, edicao/…,
 * equipe, fotos) e os módulos novos. Link vazio/ilegível → null.
 */
export function rotaDoLink(link) {
  const r = rotaCrua(link)
  if (!r) return null
  const filtros = {}
  for (const [k, v] of Object.entries(r.filtros)) if (v) filtros[k] = v
  return { vista: r.vista, aba: r.aba, filtros }
}

function rotaCrua(link) {
  if (!link || typeof link !== 'string') return null
  const [seg, a, b] = link.split('/').filter(Boolean)
  if (!seg) return null
  switch (seg) {
    case 'mesa': case 'visao': return { vista: 'visao', aba: '', filtros: {} }
    case 'marcas': case 'participantes':
      if (seg === 'participantes' && a && ABA_PARTICIPANTES.has(a)) return { vista: 'participantes', aba: a, filtros: b ? { item: b } : {} }
      return { vista: 'participantes', aba: 'lista', filtros: { item: a, sub: b } }
    case 'respostas': return rotaResposta(a, b)
    case 'producao': case 'operacao': {
      const [vista, aba] = PRODUCAO_ABA[a] || ['operacao', a || 'pedidos']
      return { vista, aba, filtros: b ? { item: b } : {} }
    }
    case 'edicao': {
      const [vista, aba] = EDICAO_ABA[a] || ['edicao', 'configuracao']
      return { vista, aba, filtros: {} }
    }
    case 'contatos':
      if (a && ABA_CONTATOS.has(a)) return { vista: 'contatos', aba: a, filtros: b ? { item: b } : {} }
      return { vista: 'contatos', aba: 'pessoas', filtros: a ? { item: a } : {} }
    case 'arquivos':
      if (a && ABA_ARQUIVOS.has(a)) return { vista: 'arquivos', aba: a, filtros: {} }
      return { vista: 'arquivos', aba: 'gerais', filtros: a ? { item: a } : {} }
    case 'equipe': return { vista: 'admin', aba: 'equipe', filtros: {} }
    case 'fotos': return { vista: 'arquivos', aba: 'guias', filtros: {} }
    default:
      return { vista: seg, aba: a || ABA_INICIAL[seg] || '', filtros: b ? { item: b } : {} }
  }
}

const ABA_PARTICIPANTES = new Set(['lista', 'candidaturas', 'temas', 'vendas'])
const ABA_CONTATOS = new Set(['pessoas', 'presskit', 'vouchers', 'recebidos'])
const ABA_ARQUIVOS = new Set(['gerais', 'participantes', 'guias', 'arquivados'])

/**
 * Compatibilidade com o `irPara(vista, { id, sub, origem })` das vistas de
 * antes dos módulos: monta o link curto equivalente, que `rotaDoLink` traduz.
 */
export function linkDeAlvo(vista, alvo) {
  const a = alvo || {}
  if (vista === 'participantes' || vista === 'marcas') return ['marcas', a.id, a.sub].filter(Boolean).join('/') || 'participantes'
  if (vista === 'respostas') return ['respostas', a.origem, a.id].filter(Boolean).join('/')
  if (vista === 'producao') return ['producao', a.sub, a.id].filter(Boolean).join('/')
  if (vista === 'contatos') return a.id ? 'contatos/' + a.id : 'contatos'
  return [vista, a.sub || a.id].filter(Boolean).join('/')
}
