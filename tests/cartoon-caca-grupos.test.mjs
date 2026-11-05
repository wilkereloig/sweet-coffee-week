// Caça aos Carimbos — grupos e rota colaborativa: regras puras, fluxo contra a api (cliente simulado) e vigias de segurança dos textos/fontes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { criarApi } from '../src/edicao/caca/api.js'
import {
  limparNome, nomeDoGrupoValido, linkDoConvite, validadeDoConvite, resumoDoGrupo, progressoColetivo, linhasDoGrupo,
  casasParaAdicionar, posicaoDoPasso, itensDaRota, aplicarRota, semAcesso, conjuntoColetivo, quemAdicionou, nomeParaRota,
} from '../src/edicao/caca/grupos/regras.js'
import { GRUPOS, mensagemDoMotivoGrupo } from '../src/edicao/caca/grupos/textos.js'
import { MOTIVOS } from '../src/edicao/caca/textos.js'

const raiz = path.resolve(import.meta.dirname, '..')
const CHAVE = 'k'.repeat(32)
const GRUPO = '3f2b8c1e-5a4d-4e7f-9b6a-1c2d3e4f5a6b'
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012-_9'

test('nome do grupo: 2 a 40 depois de colapsar espaços (igual ao servidor)', () => {
  assert.equal(limparNome('  Turma   do  café '), 'Turma do café')
  assert.equal(nomeDoGrupoValido('A'), false)
  assert.equal(nomeDoGrupoValido('  A   '), false)
  assert.equal(nomeDoGrupoValido('Ok'), true)
  assert.equal(nomeDoGrupoValido('x'.repeat(40)), true)
  assert.equal(nomeDoGrupoValido('x'.repeat(41)), false)
  assert.equal(nomeDoGrupoValido(null), false)
})

test('link de convite: só com token no formato, no caminho (nunca em query ou hash)', () => {
  const url = linkDoConvite('https://site.exemplo/', TOKEN)
  assert.equal(url, `https://site.exemplo/cartoon/caca/convite/${TOKEN}`)
  assert.doesNotMatch(url, /[?#]/)
  assert.equal(linkDoConvite('https://site.exemplo', 'curto'), '')
  assert.equal(linkDoConvite('https://site.exemplo', null), '')
})

test('validade do convite: dia/mês no horário de Natal; data ruim = vazio', () => {
  assert.equal(validadeDoConvite('2026-11-11T02:00:00Z'), '10/11', '23h do dia 10 em Natal (UTC-3)')
  assert.equal(validadeDoConvite('2026-11-11T15:00:00Z'), '11/11')
  assert.equal(validadeDoConvite('lixo'), '')
  assert.equal(validadeDoConvite(undefined), '')
})

test('lista de grupos: números seguros, coletivas nunca passam do total', () => {
  assert.deepEqual(resumoDoGrupo({ grupo_id: GRUPO, nome: 'Turma', papel: 'dono', membros_qtd: 3, casas_coletivas: 30, total_casas: 27 }),
    { id: GRUPO, nome: 'Turma', dono: true, integrantes: 3, coletivas: 27, total: 27 })
  assert.equal(resumoDoGrupo({ papel: 'membro' }).dono, false)
  assert.deepEqual(resumoDoGrupo(null), { id: '', nome: '', dono: false, integrantes: 0, coletivas: 0, total: 0 })
})

test('progresso coletivo: faltam do servidor, completo só com total > 0', () => {
  assert.deepEqual(progressoColetivo({ total_casas: 27, casas_coletivas: 3, faltam_coletivo: 24 }), { total: 27, feitas: 3, faltam: 24, completo: false })
  assert.equal(progressoColetivo({ total_casas: 27, casas_coletivas: 3 }).faltam, 24, 'reserva: calcula do total do servidor')
  assert.equal(progressoColetivo({ total_casas: 2, casas_coletivas: 2, faltam_coletivo: 0 }).completo, true)
  assert.equal(progressoColetivo({ total_casas: 0, casas_coletivas: 0 }).completo, false)
  assert.deepEqual(progressoColetivo(null), { total: 0, feitas: 0, faltam: 0, completo: false })
})

test('ranking dos amigos: ordem e posição do servidor, sem e-mail nem chave no que vira linha', () => {
  const l = linhasDoGrupo({ membros: [
    { membro_id: 'm1', apelido: 'Ana', papel: 'dono', casas: 4, extras: 1, posicao: 1, eu: true, email: 'a@a.com', chave: 'zzz' },
    { membro_id: 'm2', apelido: 'Bia', papel: 'membro', casas: 0, extras: 0, posicao: null, eu: false },
  ] })
  assert.deepEqual(l[0], { membro_id: 'm1', apelido: 'Ana', papel: 'dono', casas: 4, extras: 1, posicao: 1, eu: true })
  assert.equal(l[1].posicao, null)
  assert.deepEqual(linhasDoGrupo(null), [])
})

const PART = [
  { slug: 'zeta', casa: { nome: 'Zeta Doces' } },
  { slug: 'alfa', casa: { nome: '[DEMO] Alfa Café' } },
  { slug: 'beta', casa: { nome: 'Beta' } },
  { casa: { nome: 'Sem slug' } },
]

test('casas para adicionar: sem slug e as que já estão na rota saem; ordem alfabética sem o prefixo de demonstração', () => {
  const r = casasParaAdicionar(PART, [{ slug: 'beta' }])
  assert.deepEqual(r, [{ slug: 'alfa', nome: 'Alfa Café' }, { slug: 'zeta', nome: 'Zeta Doces' }])
  assert.deepEqual(casasParaAdicionar(null, null), [])
})

test('subir/descer: posição 1-based do destino, null na ponta', () => {
  const rota = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
  assert.equal(posicaoDoPasso(rota, 0, -1), null)
  assert.equal(posicaoDoPasso(rota, 0, 1), 2)
  assert.equal(posicaoDoPasso(rota, 1, -1), 1)
  assert.equal(posicaoDoPasso(rota, 2, 1), null)
  assert.equal(posicaoDoPasso(rota, 2, -1), 2)
  assert.equal(posicaoDoPasso([], 0, 1), null)
  assert.equal(posicaoDoPasso(rota, 7, -1), null)
})

test('itens da rota: posição densa, nome da casa e autor; "você" quando o autor é a própria pessoa', () => {
  const itens = itensDaRota([
    { slug: 'alfa', adicionado_por: 'Ana', adicionado_por_membro: 'm1' },
    { slug: 'beta', adicionado_por: 'Bia', adicionado_por_membro: null },
    { adicionado_por: 'sem slug' },
  ], (s) => nomeParaRota({ participantes: PART }, s))
  assert.deepEqual(itens.map((i) => [i.slug, i.posicao, i.nome]), [['alfa', 1, 'Alfa Café'], ['beta', 2, 'Beta']])
  assert.equal(quemAdicionou(itens[0], 'm1'), 'você')
  assert.equal(quemAdicionou(itens[0], 'm2'), 'Ana')
  assert.equal(quemAdicionou(itens[1], 'm1'), 'Bia')
  assert.equal(quemAdicionou({ por: '', porMembro: null }, 'm1'), 'alguém do grupo')
})

test('nome da casa sem o dado da edição: o slug legível, nunca um nome inventado', () => {
  assert.equal(nomeParaRota(null, 'casa-do-bolo'), 'casa do bolo')
  assert.equal(nomeParaRota({ participantes: PART }, 'zeta'), 'Zeta Doces')
  assert.equal(nomeParaRota(null, ''), 'Casa')
})

test('resposta de rota: sucesso e conflito trazem a rota do servidor; qualquer outra falha não mexe em nada', () => {
  const g = { rota: [{ slug: 'a' }], rota_versao: 3, grupo: { nome: 'x' } }
  const nova = [{ slug: 'b' }, { slug: 'a' }]
  assert.deepEqual(aplicarRota(g, { ok: true, mudou: true, versao: 4, rota: nova }), { ...g, rota: nova, rota_versao: 4 })
  assert.deepEqual(aplicarRota(g, { ok: false, motivo: 'conflito', versao: 7, rota: nova }), { ...g, rota: nova, rota_versao: 7 })
  assert.equal(aplicarRota(g, { ok: false, motivo: 'negado' }), g)
  assert.equal(aplicarRota(g, { ok: false, motivo: 'casa_desconhecida', rota: nova }), g)
  assert.equal(aplicarRota(g, { ok: true, versao: 5 }), g, 'sem rota na resposta, nada a aplicar')
  assert.equal(aplicarRota(g, { ok: true, rota: nova }).rota_versao, 3, 'sem versão válida, mantém a que a tela tinha')
  assert.equal(aplicarRota(null, { ok: true, rota: nova }), null)
  assert.equal(semAcesso('negado'), true)
  assert.equal(semAcesso('conflito'), false)
  assert.deepEqual([...conjuntoColetivo({ casas_coletivas_slugs: ['a', 'b'] })], ['a', 'b'])
  assert.equal(conjuntoColetivo(null).size, 0)
})

/* ---- fluxo completo contra a api real com um "banco" simulado: conflito de versão e recarga ---- */
function bancoSimulado () {
  const estado = { versao: 6, rota: [{ posicao: 1, slug: 'a', adicionado_por: 'Ana', adicionado_por_membro: 'm1' }, { posicao: 2, slug: 'b', adicionado_por: 'Bia', adicionado_por_membro: 'm2' }] }
  const chamadas = []
  const chamar = async (nome, corpo) => {
    chamadas.push([nome, corpo])
    if (nome === 'caca_grupo_rota_mover') {
      if (corpo.p_versao != null && corpo.p_versao !== estado.versao) return { ok: false, motivo: 'conflito', versao: estado.versao, rota: estado.rota }
      const i = estado.rota.findIndex((r) => r.slug === corpo.p_slug)
      if (i < 0) return { ok: false, motivo: 'nao_esta_na_rota' }
      const [it] = estado.rota.splice(i, 1)
      estado.rota.splice(corpo.p_posicao - 1, 0, it)
      estado.rota = estado.rota.map((r, k) => ({ ...r, posicao: k + 1 }))
      estado.versao += 1
      return { ok: true, mudou: true, versao: estado.versao, rota: estado.rota }
    }
    throw new Error('rpc_inesperada')
  }
  return { estado, chamadas, api: criarApi({ chamar }) }
}

test('rota: mover manda a versão vista; conflito não altera nada e devolve a rota atual para repetir', async () => {
  const { estado, chamadas, api } = bancoSimulado()
  const tela = { rota: estado.rota.map((r) => ({ ...r })), rota_versao: 6 }
  estado.versao = 7 // alguém mexeu antes da pessoa clicar

  const r1 = await api.grupoRotaMover(CHAVE, GRUPO, 'b', posicaoDoPasso(tela.rota, 1, -1), tela.rota_versao)
  assert.equal(r1.ok, false)
  assert.equal(r1.motivo, 'conflito')
  assert.equal(chamadas.at(-1)[1].p_versao, 6)
  const depoisDoConflito = aplicarRota(tela, r1)
  assert.equal(depoisDoConflito.rota_versao, 7)
  assert.deepEqual(depoisDoConflito.rota.map((r) => r.slug), ['a', 'b'], 'nada foi movido no conflito')

  const r2 = await api.grupoRotaMover(CHAVE, GRUPO, 'b', 1, depoisDoConflito.rota_versao)
  assert.equal(r2.ok, true)
  const final = aplicarRota(depoisDoConflito, r2)
  assert.deepEqual(final.rota.map((r) => r.slug), ['b', 'a'])
  assert.equal(final.rota_versao, 8)
})

test('rota: erro de rede e id fora do formato nunca chegam ao banco nem lançam', async () => {
  const { chamadas, api } = bancoSimulado()
  assert.equal((await api.grupoRotaMover(CHAVE, 'nao-e-uuid', 'a', 1)).motivo, 'negado')
  assert.equal((await api.grupoRotaMover('curta', GRUPO, 'a', 1)).motivo, 'mapa_desconhecido')
  assert.equal(chamadas.length, 0)
  const falha = criarApi({ chamar: async () => { throw new Error('Failed to fetch') } })
  assert.equal((await falha.grupoRotaAdicionar(CHAVE, GRUPO, 'a')).motivo, 'rede')
})

test('toda falha prevista pelo contrato dos grupos tem frase própria (nenhuma cai no genérico)', () => {
  const doContrato = ['mapa_desconhecido', 'negado', 'so_dono', 'nome_invalido', 'aceite_obrigatorio', 'limite_grupos', 'limite_convites', 'convite_invalido', 'convite_revogado',
    'convite_expirado', 'convite_esgotado', 'edicao_diferente', 'removido_do_grupo', 'grupo_cheio', 'membro_desconhecido', 'use_sair', 'casa_desconhecida',
    'nao_esta_na_rota', 'posicao_invalida', 'conflito']
  for (const m of doContrato) assert.notEqual(mensagemDoMotivoGrupo(m), MOTIVOS.generico, m)
  assert.equal(mensagemDoMotivoGrupo('operacao_invalida'), MOTIVOS.generico, 'interno: o front não deve ver')
  assert.equal(mensagemDoMotivoGrupo(undefined), MOTIVOS.generico)
})

/* ---- vigias: textos e fontes ---- */
// Comentários explicam a regra com as mesmas palavras que o vigia proíbe ("log", "storage"): olha-se só o código.
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const arquivos = (pasta) => fs.readdirSync(path.join(raiz, pasta)).filter((f) => /\.(jsx?|mjs)$/.test(f)).map((f) => [`${pasta}/${f}`, semComentarios(fs.readFileSync(path.join(raiz, pasta, f), 'utf8'))])
const FONTES = [...arquivos('src/edicao/caca/grupos'), ...arquivos('src/edicao/caca/ranking'),
  ...['Grupos', 'GrupoDetalhe', 'Convite', 'Ranking'].map((n) => [`secoes/${n}`, semComentarios(fs.readFileSync(path.join(raiz, `src/edicao/caca/secoes/${n}.jsx`), 'utf8'))])]

test('textos: sem "voto/votação", sem "Sweet" sozinho, sem prêmio revelado, convite nunca "público"', () => {
  const texto = JSON.stringify(GRUPOS) + GRUPOS.convite.mensagem('X') + GRUPOS.rota.anuncio.adicionada('Casa', 2)
  assert.doesNotMatch(texto, /\bvot(o|os|ação|ações|ar|am)\b/i)
  assert.doesNotMatch(texto, /\bSweet\b(?! (Awards|Lovers|Gift|&))/)
  assert.doesNotMatch(texto, /plaquinha|troféu/i)
  assert.match(GRUPOS.convite.texto, /não deixa nada público/)
})

test('fontes: sem window.confirm/alert/prompt, sem console, sem storage/analytics e sem guardar token ou chave', () => {
  for (const [f, src] of FONTES) {
    assert.doesNotMatch(src, /window\.(confirm|alert|prompt)|\bconfirm\(|\balert\(|\bprompt\(/, `${f}: diálogo nativo`)
    assert.doesNotMatch(src, /console\.|localStorage|sessionStorage|gtag|analytics|dataLayer/i, `${f}: log/storage/analytics`)
    assert.doesNotMatch(src, /!important/, f)
  }
})

test('fontes: o link de convite só é montado em regras.linkDoConvite e só aparece na tela que o recebeu', () => {
  const montadores = FONTES.filter(([, src]) => /CACA_CAMINHOS\.convite\(/.test(src)).map(([f]) => f)
  assert.deepEqual(montadores, ['src/edicao/caca/grupos/regras.js'])
  const comToken = FONTES.filter(([, src]) => /convite_token/.test(src)).map(([f]) => f).sort()
  assert.deepEqual(comToken, ['src/edicao/caca/grupos/ConviteDoGrupo.jsx', 'src/edicao/caca/grupos/CriarGrupo.jsx'])
})

test('css dos grupos: só tokens da edição, sem hex solto', () => {
  const css = fs.readFileSync(path.join(raiz, 'src/styles/cartoon/14-caca-grupos.css'), 'utf8')
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/)
  assert.doesNotMatch(css, /!important/)
  assert.match(fs.readFileSync(path.join(raiz, 'src/styles/scw-cartoon.css'), 'utf8'), /14-caca-grupos\.css/)
})
