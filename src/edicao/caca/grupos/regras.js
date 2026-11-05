/*
 * Grupos da Caça — regras puras da interface (tests/cartoon-caca-grupos.test.mjs).
 * A regra do jogo (ranking do grupo, limites, quem pode o quê) mora no banco; aqui só se decide o que mostrar:
 * link de convite, casas que ainda cabem na rota, posições de subir/descer e como juntar a resposta de cada operação.
 * Nada aqui toca em storage, log ou endereço: token de convite só existe em memória e no caminho que a pessoa compartilha.
 */
import { tokenValido } from '../regras.js'
import { CACA_CAMINHOS } from '../textos.js'

const inteiro = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

export const NOME_MIN = 2
export const NOME_MAX = 40

/** Mesma limpeza do servidor: espaços repetidos viram um só e as pontas saem. */
export const limparNome = (nome) => String(nome ?? '').replace(/\s+/g, ' ').trim()
export const nomeDoGrupoValido = (nome) => { const n = limparNome(nome); return n.length >= NOME_MIN && n.length <= NOME_MAX }

/** Link de convite completo (o único lugar onde o token vira endereço). Token fora do formato = `''`. */
export function linkDoConvite (origem, token) {
  return tokenValido(token) ? `${String(origem || '').replace(/\/+$/, '')}${CACA_CAMINHOS.convite(token)}` : ''
}

/** Quando o link vence: "11/11" no horário de Natal (sem hora, sem ano). Data ruim = `''`. */
export function validadeDoConvite (isoOuData) {
  const d = new Date(isoOuData)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' }).format(d)
}

/** Grupo da lista (já vem ordenado do servidor): números seguros para o cartão. */
export function resumoDoGrupo (g) {
  const total = inteiro(g?.total_casas)
  const bruto = inteiro(g?.casas_coletivas)
  return { id: String(g?.grupo_id ?? ''), nome: String(g?.nome ?? ''), dono: g?.papel === 'dono', integrantes: inteiro(g?.membros_qtd), coletivas: total ? Math.min(bruto, total) : bruto, total }
}

/** Progresso coletivo do grupo aberto (`caca_grupo_ler`). `faltam` vem do servidor, com reserva para o cálculo. */
export function progressoColetivo (g) {
  const total = inteiro(g?.total_casas)
  const feitas = inteiro(g?.casas_coletivas)
  return { total, feitas, faltam: g?.faltam_coletivo == null ? Math.max(total - feitas, 0) : inteiro(g.faltam_coletivo), completo: total > 0 && feitas >= total }
}

/** Integrantes para a lista de ranking do grupo (ordem e posição do servidor; `eu` marcado pelo servidor). */
export function linhasDoGrupo (g) {
  return (Array.isArray(g?.membros) ? g.membros : []).map((m) => ({
    membro_id: String(m?.membro_id ?? ''), apelido: String(m?.apelido ?? ''), papel: m?.papel === 'dono' ? 'dono' : 'membro',
    casas: inteiro(m?.casas), extras: inteiro(m?.extras), posicao: m?.posicao ?? null, eu: m?.eu === true,
  }))
}

/* ------------------------------------------------------------------ rota colaborativa */

/** Casas que ainda cabem na rota (têm slug e não estão nela), em ordem alfabética para o seletor. */
export function casasParaAdicionar (participantes, rota) {
  const naRota = new Set((Array.isArray(rota) ? rota : []).map((r) => r?.slug))
  return (Array.isArray(participantes) ? participantes : [])
    .filter((p) => typeof p?.slug === 'string' && p.slug && !naRota.has(p.slug))
    .map((p) => ({ slug: p.slug, nome: String(p.casa?.nome || p.slug).replace(/^\[DEMO\]\s*/, '').trim() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Posição (1-based) para onde o botão leva a casa: `passo` -1 sobe, +1 desce. `null` = já está na ponta (botão desligado). */
export function posicaoDoPasso (rota, indice, passo) {
  const n = Array.isArray(rota) ? rota.length : 0
  const destino = indice + passo
  return indice < 0 || indice >= n || destino < 0 || destino >= n ? null : destino + 1
}

/** Linhas da rota que o servidor devolveu, com o nome da casa do dado da edição (`nomeDe`). */
export function itensDaRota (rota, nomeDe) {
  return (Array.isArray(rota) ? rota : [])
    .filter((r) => r && typeof r.slug === 'string')
    .map((r, i) => ({ slug: r.slug, posicao: i + 1, nome: nomeDe(r.slug), por: String(r.adicionado_por ?? ''), porMembro: r.adicionado_por_membro || null }))
}

/**
 * Junta a resposta de uma operação de rota ao grupo aberto. Sucesso e `conflito` trazem a rota atual do servidor
 * (no conflito nada foi alterado: a tela mostra a versão nova e a pessoa repete); qualquer outra falha não mexe em nada.
 */
export function aplicarRota (grupo, r) {
  if (!grupo || !r || !Array.isArray(r.rota) || (!r.ok && r.motivo !== 'conflito')) return grupo
  return { ...grupo, rota: r.rota, rota_versao: Number.isFinite(Number(r.versao)) ? Number(r.versao) : grupo.rota_versao }
}

/** Motivo em que a pessoa deixou de poder ver o grupo: sai da tela do grupo, sem "tentar de novo". */
export const semAcesso = (motivo) => motivo === 'negado'

/** Casas validadas por alguém do grupo, para marcar na rota ("o grupo já validou"). */
export const conjuntoColetivo = (g) => new Set(Array.isArray(g?.casas_coletivas_slugs) ? g.casas_coletivas_slugs : [])

/** Nome de quem adicionou: "você" quando foi a própria pessoa. */
export const quemAdicionou = (item, euMembroId) => (item.porMembro && item.porMembro === euMembroId ? 'você' : item.por || 'alguém do grupo')

/** Nome da casa para a rota: o do dado da edição; sem ele, o próprio slug legível (nunca um nome inventado). */
export function nomeParaRota (dados, slug) {
  const achada = (dados?.participantes || []).find((p) => p?.slug === slug)?.casa?.nome
  if (achada) return String(achada).replace(/^\[DEMO\]\s*/, '').trim()
  return String(slug ?? '').replace(/[-_]+/g, ' ').trim() || 'Casa'
}
