/*
 * Vista "A mesa" — lógica pura, sem DOM. Porta fiel de renderMesa() em
 * public/painel/index.html (~2384-2424): seis colunas por ETAPA da
 * candidatura/conta, não quatro cartões por ORIGEM — o eixo é "em que fase
 * está", não "de onde veio".
 */
import { acessoDe } from './painelFormat.js'

export const ETAPAS = [
  { chave: 'novas', nome: 'Novas', legenda: 'chegaram pelo site', cor: '#FDBB1A', tinta: '#3D1308' },
  { chave: 'analise', nome: 'Em análise', legenda: 'a equipe está lendo', cor: '#01AFCC', tinta: '#3D1308' },
  { chave: 'contatadas', nome: 'Contatadas', legenda: 'conversa aberta', cor: '#4D257E', tinta: '#FEF0DD' },
  { chave: 'aprovadas', nome: 'Aprovadas', legenda: 'entram na edição', cor: '#FF4810', tinta: '#3D1308' },
  { chave: 'acesso', nome: 'Com acesso', legenda: 'preenchendo o cadastro', cor: '#6A2C15', tinta: '#FEF0DD' },
  { chave: 'completas', nome: 'Completas', legenda: 'combo fechado', cor: '#3D1308', tinta: '#FEF0DD' },
]

// As 4 primeiras etapas são o status da CANDIDATURA (quero_participar); as
// duas últimas são o status da CONTA (participantes) — duas máquinas de
// estado diferentes. 'nao_selecionado' não tem etapa: sai da esteira.
const STATUS_PARA_ETAPA = { novo: 'novas', em_analise: 'analise', contatado: 'contatadas', aprovado: 'aprovadas' }

export function colunasMesa({ candidaturas = [], participantes = [] }) {
  const colunas = Object.fromEntries(ETAPAS.map((e) => [e.chave, []]))

  candidaturas.forEach((r) => {
    // Já é conta: mora nas duas últimas colunas, não nas quatro primeiras
    // (senão contaria dobrado).
    if (acessoDe('quero_participar', r, participantes)) return
    const et = STATUS_PARA_ETAPA[r.status]
    if (!et) return
    colunas[et].push({
      tipo: 'candidatura', id: r.id,
      nome: r.empresa || r.nome, meta: [r.tipo, r.cidade].filter(Boolean).join(' · '),
      novo: Date.now() - new Date(r.created_at).getTime() < 3 * 864e5,
    })
  })

  participantes.forEach((p) => {
    const et = p.status_cadastro === 'cadastro_completo' || p.status_cadastro === 'encerrado' ? 'completas' : 'acesso'
    colunas[et].push({
      tipo: 'marca', participacaoId: p.participacao_id,
      nome: p.nome_marca, meta: p.edicao_codigo ? 'edição ' + p.edicao_codigo : 'sem edição aberta',
      // Contagem vinda do banco pode chegar como STRING (bigint do Postgres).
      itensProntos: Number(p.itens_prontos || 0), novo: false,
    })
  })

  return ETAPAS.map((e) => ({ ...e, itens: colunas[e.chave] }))
}
