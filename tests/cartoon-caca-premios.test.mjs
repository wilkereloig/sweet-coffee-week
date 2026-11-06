// Aba "Prêmios" do Mapa da Doçura: dias e regras vêm do servidor (nada escrito à mão), estados honestos, progresso sem misturar
// casa validada, carimbo extra, pendente e "Já fui". Spec: docs/cartoon-2026-2/15-caca-contrato-premiacao.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { descreverData, horaDoCorte, organizarPremios, organizarPeriodo, estadoExibido, situacaoDoJogador } from '../src/edicao/caca/premios/logica.js'
import { PREMIOS as P } from '../src/edicao/caca/premios/textos.js'
import { criarApi } from '../src/edicao/caca/api.js'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const DIAS = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']
const resposta = (estados, extra = {}) => ({
  agora: '2026-11-08T15:00:00Z', corte_hora_local: '23:59', voucher_validade_ate: '2026-11-15', ganhadores_final: 3,
  dias: DIAS.map((dia, i) => ({ dia, corte: `${dia}T23:59:00-03:00`, estado: estados[i] })), ...extra,
})

test('datas: calendário puro, sem fuso; data torta vira null', () => {
  assert.deepEqual(descreverData('2026-11-07'), { dia: 7, mes: 'novembro', semana: 'sábado', curta: '7/11', longa: '7 de novembro' })
  assert.equal(descreverData('2026-13-01'), null)
  assert.equal(descreverData('7/11'), null)
  assert.equal(descreverData(undefined), null)
  assert.equal(horaDoCorte('23:59'), '23h59')
  assert.equal(horaDoCorte('x'), null)
})

test('antes, durante e depois de cada dia: o foco é o voucher mais relevante agora', () => {
  const antes = organizarPremios(resposta(['proximo', 'proximo', 'proximo', 'proximo', 'proximo']))
  assert.equal(antes.foco.iso, '2026-11-07'); assert.equal(antes.dias.length, 5)
  const durante = organizarPremios(resposta(['resultado', 'em_disputa', 'proximo', 'proximo', 'proximo']))
  assert.equal(durante.foco.iso, '2026-11-08'); assert.equal(durante.foco.estado, 'em_disputa')
  const apuracao = organizarPremios(resposta(['resultado', 'em_apuracao', 'proximo', 'proximo', 'proximo']))
  assert.equal(apuracao.foco.iso, '2026-11-09', 'o próximo da fila vem antes do que está só em apuração')
  assert.deepEqual(apuracao.apurando.map((d) => d.iso), ['2026-11-08'], 'o dia encerrado sem confirmação continua à vista')
  const fim = organizarPremios(resposta(['resultado', 'resultado', 'resultado', 'resultado', 'em_apuracao']))
  assert.equal(fim.foco.iso, '2026-11-11'); assert.equal(fim.foco.estado, 'em_apuracao')
  const tudo = organizarPremios(resposta(['resultado', 'resultado', 'resultado', 'resultado', 'resultado']))
  assert.equal(tudo.foco.iso, '2026-11-11', 'tudo confirmado: o último resultado')
  assert.equal(tudo.outros.length, 4)
})

test('configuração mudada pela organização: outros dias, outra quantidade, outra validade, sem editar texto', () => {
  const d = organizarPremios({ ...resposta(['proximo', 'proximo']), dias: [{ dia: '2026-11-12', estado: 'proximo' }, { dia: '2026-11-13', estado: 'proximo' }], voucher_validade_ate: '2026-11-20', ganhadores_final: 5, corte_hora_local: '22:00' })
  assert.deepEqual(d.dias.map((x) => x.data.curta), ['12/11', '13/11'])
  assert.equal(d.ganhadores, 5); assert.equal(d.corte, '22h00')
  assert.match(P.regras(d.corte, d.validade).join(' '), /22h00/); assert.match(P.regras(d.corte, d.validade).join(' '), /20 de novembro/)
  assert.match(P.finalTexto(d.ganhadores), /5 ganhadores/)
  assert.match(P.vouchersResumo(2), /2 dias/)
})

test('dados ausentes ou tortos: estado honesto, nunca exceção nem prêmio inventado', () => {
  for (const ruim of [null, undefined, {}, { dias: 'x' }, { dias: [{ dia: 'ontem', estado: 'proximo' }, { dia: '2026-11-07', estado: 'ganhou' }] }]) {
    const d = organizarPremios(ruim)
    assert.equal(d.foco, null); assert.deepEqual(d.dias, []); assert.equal(d.ganhadores, null); assert.equal(d.validade, null)
  }
  assert.match(P.finalTexto(null), /ganhadores previstos/); assert.doesNotMatch(P.finalTexto(null), /\d/)
  assert.doesNotMatch(P.regras(null, null).join(' '), /\d/, 'sem horário nem validade no servidor, nenhum número é inventado')
})

test('estados nunca afirmam entrega ou vencedor; só "resultado confirmado" fala em confirmação', () => {
  assert.deepEqual(Object.keys(P.estado), ['em_breve', 'andamento', 'agendado', 'em_apuracao', 'resultado'])
  for (const t of [...Object.values(P.estado), ...Object.values(P.estadoDica)]) assert.doesNotMatch(t, /entregue|vencedor|ganhou o voucher|parabéns/i)
  assert.match(P.estadoDica.em_apuracao, /ainda não há confirmação/)
  assert.match(P.estado.resultado, /confirmado/)
})

test('período da Caça (início e fim vêm do servidor): antes · aberta · encerrada, e a tela só afirma o que sabe', () => {
  const per = (estado) => ({ inicio: '2026-11-05', fim: '2026-11-15', estado })
  assert.deepEqual(organizarPeriodo(per('aberta')), { inicio: descreverData('2026-11-05'), fim: descreverData('2026-11-15'), estado: 'aberta' })
  for (const ruim of [null, undefined, {}, per('talvez'), { inicio: 'x', fim: '2026-11-15', estado: 'aberta' }, { inicio: '2026-11-05', estado: 'aberta' }]) assert.equal(organizarPeriodo(ruim), null, JSON.stringify(ruim))
  const dias = ['proximo', 'proximo', 'proximo', 'proximo', 'proximo']
  // Caça aberta (hoje 6/11): o dia 7 ainda não chegou, mas os carimbos já contam → em andamento, nunca "em breve".
  const aberta = organizarPremios(resposta(dias, { periodo: per('aberta') }))
  assert.equal(aberta.periodo.estado, 'aberta'); assert.ok(aberta.dias.every((d) => d.exibe === 'andamento'))
  assert.equal(aberta.foco.iso, '2026-11-07')
  // Antes do início: aí sim "em breve".
  assert.ok(organizarPremios(resposta(dias, { periodo: per('antes') })).dias.every((d) => d.exibe === 'em_breve'))
  // Sem informação do período (resposta antiga ou torta): nada é afirmado.
  assert.ok(organizarPremios(resposta(dias)).dias.every((d) => d.exibe === 'agendado'))
  // O dia de hoje é sempre em andamento; apuração e resultado não mudam com o período.
  assert.equal(estadoExibido('em_disputa', null), 'andamento')
  for (const e of ['em_apuracao', 'resultado']) for (const pe of [null, per('antes'), per('aberta'), per('encerrada')]) assert.equal(estadoExibido(e, pe && organizarPeriodo(pe)), e)
  assert.equal(estadoExibido('proximo', organizarPeriodo(per('encerrada'))), 'agendado')
  // Textos.
  assert.equal(P.estado.andamento, 'Disputa em andamento'); assert.equal(P.estado.em_breve, 'Em breve')
  assert.doesNotMatch(`${P.estado.andamento} ${P.estadoDica.andamento} ${P.hoje}`, /em breve|não começou/i)
  assert.match(P.estadoDica.andamento, /acumular carimbos/); assert.match(P.hoje, /acumular carimbos/)
  assert.match(P.estadoDica.em_breve, /ainda não começou/)
  const i = descreverData('2026-11-05'); const f = descreverData('2026-11-15')
  assert.match(P.comecaEm(i), /5 de novembro/); assert.match(P.encerrada(f), /15 de novembro/)
  assert.match(P.regras('23h59', null, { inicio: i, fim: f })[0], /de 5 de novembro a 15 de novembro/)
  assert.equal(P.regras('23h59', null, null).length, P.regras('23h59', null, { inicio: i, fim: f }).length - 1, 'sem período, a regra do período não aparece')
  const fim = P.fimDoDia('23h59')
  assert.match(fim, /Ao fim do dia/); assert.match(fim, /mais casas diferentes validadas até as 23h59/); assert.match(fim, /sorteio entre as pessoas empatadas/)
  assert.doesNotMatch(P.fimDoDia(null), /undefined|null/, 'sem corte do servidor, nenhum horário é inventado')
})

test('migration do período: semeia 5 e 15/11, valida início <= fim e a leitura pública devolve o estado pelo relógio do servidor', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20261233_caca_periodo.sql', import.meta.url), 'utf8')
  assert.match(sql, /'caca_inicio', '"2026-11-05"'/); assert.match(sql, /'caca_fim', '"2026-11-15"'/)
  assert.match(sql, /on conflict \(chave\) do nothing/, 'só semeia: nunca sobrescreve o que a organização editou')
  assert.match(sql, /when 'caca_inicio' then[\s\S]*> \(public\.caca_pcfg\('caca_fim'\)/); assert.match(sql, /when 'caca_fim' then[\s\S]*< \(public\.caca_pcfg\('caca_inicio'\)/)
  for (const e of ['antes', 'aberta', 'encerrada']) assert.ok(sql.includes(`'${e}'`), e)
  assert.match(sql, /grant execute on function public\.caca_premios_publico\(text\) to anon, authenticated/)
  assert.doesNotMatch(sql, /caca_premio[^;]*(delete|update)/i, 'não mexe em prêmio, carimbo nem apuração')
  assert.ok(fs.existsSync(new URL('../supabase/reverter/20261233_caca_periodo.sql', import.meta.url)), 'tem reverter')
})

test('pessoa sem mapa, com mapa vazio, com carimbo pendente, com casas validadas e completa', () => {
  assert.equal(situacaoDoJogador(null, 27).tipo, 'sem-mapa'); assert.equal(situacaoDoJogador(null, 27).faltam, 27)
  assert.equal(situacaoDoJogador({ total_casas: 27, casas_validadas: 0, casas: [], extras: 0 }).tipo, 'vazio')
  const pend = situacaoDoJogador({ total_casas: 27, casas_validadas: 0, casas: [{ estado: 'pendente' }], extras: 0 })
  assert.equal(pend.tipo, 'pendente'); assert.equal(pend.feitas, 0, 'pendente não conta casa'); assert.equal(pend.pendentes, 1)
  const val = situacaoDoJogador({ total_casas: 27, casas_validadas: 7, casas: [], extras: 3 })
  assert.deepEqual([val.tipo, val.feitas, val.faltam, val.extras], ['validadas', 7, 20, 3])
  const ok = situacaoDoJogador({ total_casas: 27, casas_validadas: 27, casas: [], extras: 0 })
  assert.deepEqual([ok.tipo, ok.faltam], ['completo', 0])
  assert.equal(situacaoDoJogador({ total_casas: 27, casas_validadas: 30 }).feitas, 27, 'nunca passa do total')
})

test('as regras do texto casam com o regulamento aprovado', () => {
  const regras = P.regras('23h59', { longa: '15 de novembro' }).join(' ')
  assert.match(regras, /mais casas diferentes validadas até as 23h59/)
  assert.match(regras, /carimbos extras de revisitas desempatam/)
  assert.match(regras, /sorteio entre as pessoas empatadas/)
  assert.match(regras, /no máximo um voucher por dia/)
  assert.match(regras, /continua na Caça e no prêmio final/)
  assert.match(regras, /só conta na apuração quando o carimbo está validado/)
  assert.match(regras, /depois que o dia encerra/)
  assert.match(regras, /valem até 15 de novembro/)
  assert.match(P.finalTexto(3), /press kit oficial da edição e uma surpresa/)
  assert.match(P.finalExtras, /não uma chance garantida/); assert.doesNotMatch(P.finalExtras, /%/)
  assert.match(P.metasNota, /não dão prêmio/)
  assert.deepEqual(P.diferenca.map((x) => x[0]), ['Casa validada', 'Carimbo extra', 'Já fui'])
})

test('nenhuma data, hora ou quantidade escrita à mão nos textos nem no componente', () => {
  const textos = semComentarios(ler('src/edicao/caca/premios/textos.js'))
  assert.doesNotMatch(textos, /\b(7|8|9|10|11|15)\b/, 'dia de voucher ou validade escritos nos textos')
  assert.doesNotMatch(textos, /23h59|23:59/)
  assert.doesNotMatch(textos, /\btrês\b|\b3\b/, 'quantidade de ganhadores vem do servidor')
  const comp = semComentarios(ler('src/edicao/cartoon/paginas/mapa/PainelPremios.jsx'))
  assert.doesNotMatch(comp, /2026-11|\b27\b|novembro/)
})

test('api: premiosLer chama a RPC pública da edição, sem chave, e devolve só o dado', async () => {
  const chamadas = []
  const api = criarApi({ edicao: 'cartoon-2026-2', chamar: async (nome, corpo) => { chamadas.push([nome, corpo]); return resposta(['proximo']) } })
  const r = await api.premiosLer()
  assert.deepEqual(chamadas, [['caca_premios_publico', { p_edicao: 'cartoon-2026-2' }]])
  assert.equal(r.ok, true); assert.equal(r.premios.dias.length, 5)
  const falha = await criarApi({ chamar: async () => { throw new Error('rede') } }).premiosLer()
  assert.equal(falha.ok, false)
})

test('migration pública: só config e estado do dia, nada de pessoa; grant só para leitura', () => {
  const sql = ler('supabase/migrations/20261223_caca_premios_publico.sql')
  const corpo = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.match(corpo, /grant execute on function public\.caca_premios_publico\(text\) to anon, authenticated/)
  assert.doesNotMatch(corpo, /apelido|email|whatsapp|pessoa|mapa_id|semente/i, 'a função pública não pode expor ninguém')
  assert.match(corpo, /security definer set search_path to 'public'/)
  assert.match(corpo, /estado in \('confirmado', 'entregue'\)/, 'resultado só com prêmio confirmado ou entregue')
})

test('o atalho Prêmios existe nos atalhos e no painel do mapa normal, com texto', () => {
  assert.match(ler('src/edicao/cartoon/paginas/mapa/Atalhos.jsx'), /\['premios', 'vouchers'\]/)
  const idx = ler('src/edicao/cartoon/paginas/mapa/index.jsx')
  assert.match(idx, /PAINEIS = \['rota', 'album', 'premios'\]/)
  assert.match(idx, /case 'premios': return premiosEl/)
  assert.match(ler('src/edicao/caca/mapa/textos.js'), /premios: 'Prêmios'/)
})
