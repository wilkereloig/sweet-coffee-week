// Pop-up "O que você disputa" (mapa): o que diz, quando aparece, e que não promete o que o regulamento não promete.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { quando, blocoVoucher, acaoDoPopup, montarDisputa, devePopup, lerDia, gravarDia, CHAVE_DIA } from '../src/edicao/caca/disputa/logica.js'
import { DISPUTA as T } from '../src/edicao/caca/disputa/textos.js'
import { organizarPremios, situacaoDoJogador } from '../src/edicao/caca/premios/logica.js'
import { estadoDaCampanha, TEXTOS_CAMPANHA } from '../src/edicao/caca/campanha/terComQuemContar.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const SERVIDOR = (estados = {}) => ({
  periodo: { inicio: '2026-11-05', fim: '2026-11-15', estado: 'aberta' },
  corte_hora_local: '23:59',
  ganhadores_final: 3,
  dias: ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'].map((dia) => ({ dia, estado: estados[dia] || 'proximo' })),
})
const premios = (estados) => organizarPremios(SERVIDOR(estados))
const camp = (iso) => estadoDaCampanha(new Date(iso))

test('quando: conta em dias de Fortaleza, sem depender do aparelho', () => {
  assert.equal(quando('2026-11-07', '2026-11-07'), 'hoje')
  assert.equal(quando('2026-11-07', '2026-11-06'), 'amanha')
  assert.equal(quando('2026-11-09', '2026-11-06'), 'depois')
  assert.equal(quando('2026-11-05', '2026-11-06'), 'passado')
  assert.equal(quando('lixo', '2026-11-06'), 'passado', 'data torta não vira anúncio')
})

test('voucher: véspera diz "amanhã", o dia diz "hoje", e traz o corte do servidor', () => {
  const v = blocoVoucher(premios(), '2026-11-06')
  assert.equal(v.quando, 'amanha')
  assert.equal(v.corte, '23h59')
  assert.equal(v.data.curta, '7/11')
  assert.equal(blocoVoucher(premios({ '2026-11-07': 'em_disputa' }), '2026-11-07').quando, 'hoje')
  assert.equal(blocoVoucher(premios({ '2026-11-07': 'em_disputa' }), '2026-11-07').aberta, true)
})

test('voucher: sem anúncio de disputa que já passou, de período encerrado ou sem dia', () => {
  const tudoApurado = { '2026-11-07': 'resultado', '2026-11-08': 'resultado', '2026-11-09': 'resultado', '2026-11-10': 'resultado', '2026-11-11': 'em_apuracao' }
  assert.equal(blocoVoucher(premios(tudoApurado), '2026-11-12'), null, 'só apuração/resultado: nada em disputa')
  const encerrado = organizarPremios({ ...SERVIDOR(), periodo: { inicio: '2026-11-05', fim: '2026-11-15', estado: 'encerrada' } })
  assert.equal(blocoVoucher(encerrado, '2026-11-16'), null)
  assert.equal(blocoVoucher(organizarPremios({ dias: [] }), '2026-11-06'), null)
  assert.equal(blocoVoucher(null, '2026-11-06'), null)
})

test('ação principal: criar o mapa, confirmar o e-mail ou seguir', () => {
  assert.equal(acaoDoPopup({ estado: 'sem-mapa', email: 'desconhecido' }), 'criar-mapa')
  assert.equal(acaoDoPopup({ estado: 'pronto', email: 'pendente' }), 'confirmar-email')
  assert.equal(acaoDoPopup({ estado: 'pronto', email: 'confirmado' }), 'seguir')
  assert.equal(acaoDoPopup({ estado: 'pronto', email: 'desconhecido' }), 'seguir', 'sem resposta sobre o e-mail, nada é afirmado')
})

test('montarDisputa: junta voucher, campanha, prêmio final e o aviso de e-mail', () => {
  const mapa = { total_casas: 38, casas_validadas: 3, extras: 0, casas: [] }
  const jogador = situacaoDoJogador(mapa, 38)
  const d = montarDisputa({ premios: premios(), campanha: camp('2026-11-06T15:00:00Z'), jogador, estado: 'pronto', email: 'pendente', hojeIso: '2026-11-06' })
  assert.equal(d.voucher.quando, 'amanha')
  assert.equal(d.campanha, true)
  assert.equal(d.emailPendente, true)
  assert.equal(d.acao, 'confirmar-email')
  assert.equal(d.ganhadores, 3)
  const semMapa = montarDisputa({ premios: premios(), campanha: camp('2026-11-06T15:00:00Z'), jogador: situacaoDoJogador(null, 38), estado: 'sem-mapa', email: 'desconhecido', hojeIso: '2026-11-06' })
  assert.equal(semMapa.acao, 'criar-mapa')
  assert.equal(semMapa.emailPendente, false)
  assert.equal(semMapa.final.total, 38, 'sem mapa o pop-up ainda mostra o tamanho do prêmio final')
  const encerrada = montarDisputa({ premios: null, campanha: camp('2026-11-12T15:00:00Z'), jogador: null, estado: 'sem-mapa', email: 'desconhecido', hojeIso: '2026-11-12' })
  assert.equal(encerrada.campanha, false)
  assert.equal(encerrada.voucher, null)
  assert.equal(encerrada.final, null)
})

test('devePopup: uma vez por dia, e só com algo a dizer', () => {
  const com = { voucher: { quando: 'amanha' }, campanha: false }
  assert.equal(devePopup(com, '2026-11-06', null), true)
  assert.equal(devePopup(com, '2026-11-06', '2026-11-06'), false, 'já apareceu hoje')
  assert.equal(devePopup(com, '2026-11-07', '2026-11-06'), true, 'no dia seguinte volta')
  assert.equal(devePopup({ voucher: null, campanha: true }, '2026-11-06', null), true, 'só a campanha aberta já basta')
  assert.equal(devePopup({ voucher: null, campanha: false }, '2026-11-06', null), false, 'sem nada em disputa, não aparece')
  assert.equal(devePopup(null, '2026-11-06', null), false)
})

test('armazenamento: guarda só a data; se o navegador bloquear, não quebra', () => {
  const mem = new Map()
  const bom = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) }
  gravarDia(bom, '2026-11-06')
  assert.equal(mem.get(CHAVE_DIA), '2026-11-06')
  assert.equal(lerDia(bom), '2026-11-06')
  const ruim = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('bloqueado') } }
  assert.equal(lerDia(ruim), null)
  assert.doesNotThrow(() => gravarDia(ruim, '2026-11-06'))
  assert.equal(lerDia(null), null)
})

test('textos: não promete sorteio do voucher do dia nem chama o festival de "Sweet" sozinho', () => {
  const tudo = JSON.stringify([T, TEXTOS_CAMPANHA.bloco.disputa])
  assert.doesNotMatch(tudo, /todo mundo (concorre|ganha)|todos ganham/i)
  assert.doesNotMatch(tudo, /\b(o|do|no|ao) Sweet\b/)
  assert.match(TEXTOS_CAMPANHA.bloco.disputa, /2 vouchers/, 'a promoção do Sicredi mostra os 2 vouchers')
  assert.match(TEXTOS_CAMPANHA.bloco.disputa, /não conta carimbo/, 'e diz que é separada da Caça')
  assert.doesNotMatch(TEXTOS_CAMPANHA.bloco.disputa, /sorteio/i, 'a escolha é de jornalistas, não sorteio')
})

test('montagem: pop-up no mapa, fora da tela cheia e de link com intenção; CSS sem !important e dentro da camada', () => {
  const mapa = semComentarios(ler('src/edicao/cartoon/paginas/mapa/index.jsx'))
  assert.match(mapa, /<PopupDisputa [\s\S]*?bloqueado=\{cheia \|\| veioComIntencao\}/)
  assert.match(mapa, /veioComIntencao.*abrirRota.*painel.*unidade.*compartilhada/s)
  const css = ler('src/styles/cartoon/21-disputa-popup.css')
  assert.doesNotMatch(css, /!important/)
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'só tokens --ct-*, sem hex solto')
  assert.match(ler('src/styles/scw-cartoon.css'), /@import '\.\/cartoon\/21-disputa-popup\.css'/)
  const comp = semComentarios(ler('src/edicao/caca/disputa/PopupDisputa.jsx'))
  assert.match(comp, /variante="jogo"/, 'reusa a folha modal do mapa (foco preso, Escape, Fechar)')
  assert.match(comp, /usarPremios\(caca\.api, \{ refrescar: false \}\)/, 'lê os prêmios uma vez só: sem sondagem por minuto em cada mapa aberto')
  assert.match(comp, /class ErroDoPopup/, 'um erro do pop-up nunca derruba o mapa')
  assert.match(semComentarios(ler('src/edicao/cartoon/paginas/mapa/PainelPremios.jsx')), /usarPremios\(caca\.api\)/, 'a aba Prêmios segue relendo a cada minuto')
  assert.match(comp, /gravarDia\(armazem\(\), hojeIso\)/, 'registra o dia ao abrir, para não voltar a cada visita')
})
