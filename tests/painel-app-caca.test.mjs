import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as C from '../painel-app/src/lib/caca.js'

// Mesmo shim de tests/painel-app-rpc.test.mjs: rpc() lê sessionStorage.
const mem = new Map()
globalThis.sessionStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8')
const dirCaca = join(raiz, 'painel-app/src/components/vistas/caca')
const fontesCaca = () => readdirSync(dirCaca).filter((n) => /\.jsx?$/.test(n)).map((n) => [n, readFileSync(join(dirCaca, n), 'utf8')])

const CONFIG = {
  voucher_dias: { valor: ['2026-11-07', '2026-11-08'], proposta: false },
  corte_hora_local: { valor: '23:59' },
  fuso: { valor: 'America/Fortaleza' },
  prazo_segunda_chamada_min: { valor: 120, proposta: true },
  peso_base: { valor: 100 },
  ganhadores_final: { valor: 3 },
}

function falsoFetch(resposta = {}) {
  const chamadas = []
  const f = async (url, op) => {
    chamadas.push({ url, corpo: JSON.parse(op.body) })
    return { ok: true, status: 200, text: async () => JSON.stringify(resposta), json: async () => resposta }
  }
  return { f, chamadas }
}

// ── estados e ações ──────────────────────────────────────────────────────────
test('ações possíveis repetem a tabela de transições do contrato', () => {
  const vd = (estado) => ({ tipo: 'voucher_dia', estado })
  assert.deepEqual(C.acoesPossiveis(vd('selecionado')), ['confirmar', 'expirar', 'substituir', 'cancelar'])
  assert.deepEqual(C.acoesPossiveis(vd('confirmado')), ['entregar', 'substituir', 'cancelar'])
  assert.deepEqual(C.acoesPossiveis(vd('expirado')), ['substituir'])
  for (const e of ['entregue', 'substituido', 'cancelado']) assert.deepEqual(C.acoesPossiveis(vd(e)), [], e)
  // prêmio final nunca substitui
  assert.ok(!C.acoesPossiveis({ tipo: 'final', estado: 'selecionado' }).includes('substituir'))
  assert.deepEqual(C.acoesPossiveis({ tipo: 'final', estado: 'expirado' }), [])
  assert.deepEqual(C.acoesPossiveis(null), [])
})

test('estados: seis rótulos, e expirar/substituir/cancelar exigem motivo', () => {
  assert.deepEqual(C.ORDEM_ESTADOS.map(C.rotuloEstado), ['Selecionado', 'Confirmado', 'Entregue', 'Expirado', 'Substituído', 'Cancelado'])
  for (const a of ['expirar', 'substituir', 'cancelar']) assert.equal(C.ACOES[a].nota, true, a)
  for (const a of ['confirmar', 'entregar']) assert.equal(C.ACOES[a].nota, false, a)
})

test('prazo vencido: só selecionado, pela marca do servidor ou pelo relógio; nada expira sozinho', () => {
  const agora = Date.parse('2026-11-08T15:00:00Z')
  assert.equal(C.estaVencido({ estado: 'selecionado', vencido: true }, agora), true)
  assert.equal(C.estaVencido({ estado: 'selecionado', vencido: false, prazo_ate: '2026-11-08T14:00:00Z' }, agora), true, 'tela velha: o relógio alcança')
  assert.equal(C.estaVencido({ estado: 'selecionado', prazo_ate: '2026-11-08T16:00:00Z' }, agora), false)
  assert.equal(C.estaVencido({ estado: 'confirmado', vencido: true }, agora), false)
  assert.deepEqual(C.acoesSugeridas({ estado: 'selecionado', vencido: true }, agora), ['expirar', 'substituir'])
  assert.deepEqual(C.acoesSugeridas({ estado: 'selecionado', prazo_ate: '2026-11-09T00:00:00Z' }, agora), [])
  const n = C.contarPorEstado([{ estado: 'selecionado', vencido: true }, { estado: 'confirmado' }, { estado: 'confirmado' }])
  assert.equal(n.selecionado, 1); assert.equal(n.confirmado, 2); assert.equal(n.vencidos, 1)
})

// ── corte do dia ─────────────────────────────────────────────────────────────
test('o corte vem da configuração: 23:59 de Natal, minuto inteiro, só apura depois', () => {
  // Fortaleza é UTC-3 sem horário de verão: 23:59 do dia 7 acaba às 03:00Z do dia 8.
  assert.equal(new Date(C.instanteLocal('2026-11-07', '23:59', 'America/Fortaleza')).toISOString(), '2026-11-08T02:59:00.000Z')
  const antes = Date.parse('2026-11-08T02:59:59Z')
  const depois = Date.parse('2026-11-08T03:00:00Z')
  const s1 = C.situacaoDoDia('2026-11-07', { config: CONFIG, apuracoes: [], agora: antes })
  assert.equal(s1.situacao, 'aberto'); assert.equal(s1.liberaEm, Date.parse('2026-11-08T03:00:00Z'))
  assert.equal(C.situacaoDoDia('2026-11-07', { config: CONFIG, apuracoes: [], agora: depois }).situacao, 'pronto')
  assert.equal(C.situacaoDoDia('2026-11-07', { config: CONFIG, apuracoes: [{ dia: '2026-11-07' }], agora: antes }).situacao, 'apurado')
  assert.equal(C.situacaoDoDia('2026-11-07', { config: {}, apuracoes: [] }).situacao, 'sem_regra', 'sem corte configurado não afirma nada')
  // Outro corte configurado muda o limite (não há 23:59 escrito na conta).
  const c22 = { ...CONFIG, corte_hora_local: { valor: '22:00' } }
  assert.equal(C.situacaoDoDia('2026-11-07', { config: c22, apuracoes: [], agora: Date.parse('2026-11-08T01:01:00Z') }).situacao, 'pronto')
})

test('regras lidas da configuração, inclusive a marca de proposta', () => {
  const r = C.lerRegras(CONFIG)
  assert.deepEqual(r.dias, ['2026-11-07', '2026-11-08'])
  assert.equal(r.segundaChamadaMin, 120); assert.equal(r.segundaChamadaProposta, true)
  assert.deepEqual(C.lerRegras(undefined).dias, [])
  assert.equal(C.diaBr('2026-11-07'), '07/11')
})

// ── ranking e fila ───────────────────────────────────────────────────────────
test('empates ficam marcados (mesmas casas e extras), de qualquer lado', () => {
  const r = C.marcarEmpates([
    { posicao: 1, apelido: 'A', casas: 10, extras: 2 }, { posicao: 1, apelido: 'B', casas: 10, extras: 2 },
    { posicao: 3, apelido: 'C', casas: 9, extras: 5 }, { posicao: 4, apelido: 'D', casas: 8, extras: 0 },
  ])
  assert.deepEqual(r.map((x) => x.empate), [true, true, false, false])
  assert.deepEqual(C.marcarEmpates(undefined), [])
})

test('fila de substituição: tira quem já tem prêmio no dia e quem está bloqueado em outro', () => {
  const ap = [{ dia: '2026-11-07', ranking: ['Ana', 'Beto', 'Cida', 'Davi'].map((apelido, i) => ({ posicao: i + 1, apelido, casas: 9 - i, extras: 0 })) }]
  const premios = [
    { tipo: 'voucher_dia', dia: '2026-11-07', estado: 'selecionado', apelido: 'Ana', id: '1' },
    { tipo: 'voucher_dia', dia: '2026-11-06', estado: 'confirmado', apelido: 'Beto', id: '2' },
    { tipo: 'voucher_dia', dia: '2026-11-05', estado: 'expirado', apelido: 'Cida', id: '3' },
  ]
  assert.deepEqual(C.filaDoDia('2026-11-07', premios, ap).map((r) => r.apelido), ['Cida', 'Davi'], 'expirado em outro dia volta a concorrer')
  assert.deepEqual(C.filaDoDia('2026-11-09', premios, ap), [])
  const f = C.filaDeSubstituicao(premios, ap)
  assert.deepEqual(f.map((x) => x.dia), ['2026-11-05', '2026-11-06', '2026-11-07'], 'selecionado, confirmado e expirado ainda podem ser substituídos')
  assert.equal(f[2].proximos[0].apelido, 'Cida'); assert.deepEqual(f[0].proximos, [], 'dia sem foto não tem prévia')
  // com e-mail (relatorio.ler) a pessoa é o e-mail, não o apelido
  const ap2 = [{ dia: 'd', ranking: [{ apelido: 'Ana', email: 'a@x.com', posicao: 1, casas: 1, extras: 0 }, { apelido: 'Ana2', email: 'b@x.com', posicao: 2, casas: 1, extras: 0 }] }]
  const pr2 = [{ tipo: 'voucher_dia', dia: 'd', estado: 'selecionado', apelido: 'Outro', email: 'A@x.com' }]
  assert.deepEqual(C.filaDoDia('d', pr2, ap2).map((r) => r.apelido), ['Ana2'])
})

// ── regras e prazos ──────────────────────────────────────────────────────────
test('os campos da configuração são exatamente as 10 chaves do contrato', () => {
  assert.deepEqual(C.CAMPOS_CONFIG.map((c) => c.chave).sort(), [
    'corte_hora_local', 'email_confirmado_se_sem_coluna', 'fuso', 'ganhadores_final', 'intervalo_carimbo_h', 'peso_base',
    'prazo_confirmacao_proximo_dia_hora', 'prazo_segunda_chamada_min', 'voucher_dias', 'voucher_validade_ate',
  ])
  const sql = ler('supabase/migrations/20261204_caca_premiacao.sql')
  for (const c of C.CAMPOS_CONFIG) assert.ok(sql.includes(`'${c.chave}'`), 'o banco não conhece ' + c.chave)
})

test('validação espelha as faixas do banco', () => {
  const campo = (k) => C.CAMPOS_CONFIG.find((c) => c.chave === k)
  assert.deepEqual(C.validarConfig(campo('voucher_dias'), '2026-11-07\n2026-11-08, 2026-11-09'), { ok: true, valor: ['2026-11-07', '2026-11-08', '2026-11-09'] })
  assert.equal(C.validarConfig(campo('voucher_dias'), '').ok, false)
  assert.equal(C.validarConfig(campo('voucher_dias'), '2026-02-30').ok, false, 'data que não existe')
  assert.equal(C.validarConfig(campo('voucher_dias'), '2026-11-07 2026-11-07').ok, false, 'repetida')
  assert.equal(C.validarConfig(campo('voucher_dias'), Array.from({ length: 32 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, '0')}`).join(' ')).ok, false)
  assert.equal(C.validarConfig(campo('corte_hora_local'), '23:59').ok, true)
  assert.equal(C.validarConfig(campo('corte_hora_local'), '24:00').ok, false)
  assert.equal(C.validarConfig(campo('corte_hora_local'), '9:00').ok, false)
  assert.equal(C.validarConfig(campo('fuso'), 'America/Fortaleza').ok, true)
  assert.equal(C.validarConfig(campo('fuso'), 'Marte/Olimpo').ok, false)
  assert.equal(C.validarConfig(campo('voucher_validade_ate'), '2026-11-15').ok, true)
  assert.equal(C.validarConfig(campo('voucher_validade_ate'), '15/11/2026').ok, false)
  assert.deepEqual(C.validarConfig(campo('peso_base'), '100'), { ok: true, valor: 100 })
  for (const [k, ruim, bom] of [['peso_base', ['0', '10001', '1.5', '-1', ''], ['1', '10000']], ['ganhadores_final', ['0', '21'], ['1', '20']],
    ['prazo_confirmacao_proximo_dia_hora', ['24', '-1'], ['0', '23']], ['prazo_segunda_chamada_min', ['0', '1441'], ['1', '1440']], ['intervalo_carimbo_h', ['73'], ['0', '72']]]) {
    for (const v of ruim) assert.equal(C.validarConfig(campo(k), v).ok, false, k + ' ' + v)
    for (const v of bom) assert.equal(C.validarConfig(campo(k), v).ok, true, k + ' ' + v)
  }
  assert.equal(C.configMudou(campo('peso_base'), '100', 100), false)
  assert.equal(C.configMudou(campo('peso_base'), '101', 100), true)
  assert.equal(C.configMudou(campo('voucher_dias'), '2026-11-07\n2026-11-08', ['2026-11-07', '2026-11-08']), false)
  assert.equal(C.textoDoValor(campo('voucher_dias'), ['a', 'b']), 'a\nb')
  assert.ok(campo('intervalo_carimbo_h').informativo && campo('email_confirmado_se_sem_coluna').inerte)
})

// ── sorteio: simulação verificável ──────────────────────────────────────────
test('semente é obrigatória; simulações com a mesma semente têm que bater', () => {
  assert.equal(C.validarSemente('   ').ok, false)
  assert.equal(C.validarSemente('x'.repeat(201)).ok, false)
  assert.deepEqual(C.validarSemente('  festa 2026 '), { ok: true, semente: 'festa 2026' })
  const base = { semente: 's', hash_verificacao: 'h1', concorrentes: [{ apelido: 'A', casas: 27, extras: 3, peso: 103 }], ganhadores: [{ posicao: 1, apelido: 'A', casas: 27, extras: 3, peso: 103, motivo: 'completo' }] }
  assert.equal(C.compararSimulacoes(base, structuredClone(base)).igual, true)
  assert.equal(C.compararSimulacoes(base, { ...structuredClone(base), hash_verificacao: 'h2' }).mesmoHash, false)
  const outro = structuredClone(base); outro.ganhadores[0].apelido = 'B'
  assert.equal(C.compararSimulacoes(base, outro).mesmosGanhadores, false)
  assert.equal(C.compararSimulacoes(base, null).igual, false)
  assert.equal(C.pesoTotal([{ peso: 100 }, { peso: 105 }]), 205)
  assert.equal(C.rotuloMotivo('sorteio_ponderado'), 'Sorteio ponderado')
})

// ── auditoria ────────────────────────────────────────────────────────────────
test('o que mudou: só o que difere e nunca contato', () => {
  assert.equal(C.resumoMudanca({ estado: 'selecionado', x: 1 }, { estado: 'confirmado', x: 1 }), 'estado: selecionado → confirmado')
  assert.equal(C.resumoMudanca({ email: 'a@b.c', n: 1 }, { email: 'd@e.f', n: 2 }), 'n: 1 → 2')
  assert.equal(C.resumoMudanca({ whatsapp: '1' }, { whatsapp: '2' }), '')
  assert.equal(C.resumoMudanca(['a'], ['b']), '["a"] → ["b"]')
  assert.equal(C.resumoMudanca(null, null), '')
  assert.equal(C.rotuloEvento('config_gravar'), 'Regra alterada')
  assert.equal(C.rotuloEvento('inventado'), 'inventado')
})

// ── metas ────────────────────────────────────────────────────────────────────
test('metas: mesmas regras do banco e comando pronto', () => {
  const ok = C.validarMetas([{ casas: '10', titulo: 'Dez' }, { casas: '5', titulo: 'Cinco' }], 27)
  assert.equal(ok.ok, true); assert.deepEqual(ok.metas.map((m) => m.casas), [5, 10])
  assert.equal(C.validarMetas([{ casas: '28', titulo: 'x' }], 27).ok, false, 'mais que as casas da edição')
  assert.equal(C.validarMetas([{ casas: '28', titulo: 'x' }], undefined).ok, true, 'sem o total só confere o piso')
  assert.equal(C.validarMetas([{ casas: '5', titulo: 'a' }, { casas: '5', titulo: 'b' }], 27).ok, false, 'repetida')
  assert.equal(C.validarMetas([{ casas: '0', titulo: 'a' }], 27).ok, false)
  assert.equal(C.validarMetas([{ casas: '3,5', titulo: 'a' }], 27).ok, false)
  assert.equal(C.validarMetas([{ casas: '3', titulo: ' ' }], 27).ok, false)
  assert.equal(C.validarMetas([], 27).ok, false)
  const sql = C.sqlDasMetas([{ casas: 5, titulo: "L'amour" }])
  assert.equal(sql, `update public.caca_config set valor = '[{"casas":5,"titulo":"L''amour"}]'::jsonb, atualizado_em = now() where chave = 'metas';`)
  assert.ok(!/exemplo/i.test(sql), 'o comando não carrega a marca de exemplo')
  assert.deepEqual(C.METAS_EXEMPLO.map((m) => m.casas), [5, 10, 20, 27])
})

test('mensagens de erro em português; código desconhecido aparece cru', () => {
  assert.match(C.mensagemCaca(new Error('dia_nao_encerrado')), /corte/)
  assert.match(C.mensagemCaca(new Error('HTTP 400: sem_proximo_elegivel')), /Nada foi alterado/)
  assert.match(C.mensagemCaca('Failed to fetch'), /conexão/)
  assert.equal(C.mensagemCaca(new Error('coisa_nova')), 'coisa_nova')
  assert.ok(C.mensagemCaca(undefined).length > 0)
})

// ── chamadas ao banco ────────────────────────────────────────────────────────
test('o corpo de cada chamada é o do contrato', async () => {
  mem.set('scw_org', 'senha-de-teste')
  const { f, chamadas } = falsoFetch({ ok: true })
  await C.cacaApi.apurarDia('2026.2', '2026-11-07', f)
  await C.cacaApi.acaoDoPremio('p1', 'substituir', 'não atendeu', f)
  await C.cacaApi.acaoDoPremio('p1', 'confirmar', undefined, f)
  await C.cacaApi.gravarConfig('peso_base', 100, f)
  await C.cacaApi.premios('2026.2', f)
  await C.cacaApi.revisao('2026.2', f)
  await C.cacaApi.anularCarimbo('c1', 'fora do lugar', f)
  const sem = ({ p_secret, ...resto }) => resto
  assert.deepEqual(chamadas.map((c) => [c.url.split('/rpc/')[1], sem(c.corpo)]), [
    ['caca_apurar_dia', { p_edicao: '2026.2', p_dia: '2026-11-07' }],
    ['caca_premio_acao', { p_premio: 'p1', p_acao: 'substituir', p_nota: 'não atendeu' }],
    ['caca_premio_acao', { p_premio: 'p1', p_acao: 'confirmar', p_nota: null }],
    ['caca_config_gravar', { p_chave: 'peso_base', p_valor: 100 }],
    ['caca_premio_listar', { p_edicao: '2026.2' }],
    ['caca_carimbo_revisao_listar', { p_edicao: '2026.2' }],
    ['carimbo_anular', { p_carimbo: 'c1', p_motivo: 'fora do lugar' }],
  ])
  mem.clear()
})

test('sorteio da tela é SEMPRE simulação e o push é SEMPRE dry_run', async () => {
  const { f, chamadas } = falsoFetch({ simulacao: true, ganhadores: [], concorrentes: [] })
  await C.cacaApi.sortear('2026.2', 'semente', f)
  assert.equal(chamadas[0].corpo.p_simular, true)
  assert.equal(chamadas[0].corpo.p_semente, 'semente')
  assert.equal(C.cacaApi.sortear.length <= 3, true, 'não há parâmetro que desligue a simulação')
  await C.cacaApi.simularPush('meta', f)
  assert.ok(chamadas[1].url.endsWith('/functions/v1/caca-push'))
  assert.equal(chamadas[1].corpo.dry_run, true)
  assert.equal(chamadas[1].corpo.tipo, 'meta')
  assert.equal(C.cacaApi.simularPush.length <= 2, true)
})

test('o sorteio oficial está travado e nem chega ao banco', async () => {
  assert.equal(C.SORTEIO_OFICIAL_LIBERADO, false)
  const { f, chamadas } = falsoFetch({})
  await assert.rejects(C.realizarSorteioOficial('2026.2', 's', { simulacao: true, semente: 's', hash_verificacao: 'h' }, f), /sorteio_oficial_bloqueado/)
  assert.equal(chamadas.length, 0)
})

// ── regras de código da frente ───────────────────────────────────────────────
test('só o sorteio oficial grava: p_simular:false e dry_run:false não existem fora dele', () => {
  const lib = ler('painel-app/src/lib/caca.js')
  assert.equal((lib.match(/p_simular:\s*false/g) || []).length, 1)
  assert.match(lib, /export const SORTEIO_OFICIAL_LIBERADO = false/)
  assert.ok(!/dry_run:\s*false/.test(lib))
  assert.ok(!/Math\.random/.test(lib), 'a semente é de quem sorteia, nunca escondida')
  for (const [nome, src] of fontesCaca()) {
    assert.ok(!/p_simular|dry_run/.test(src), nome + ' monta a chamada na mão')
    if (nome !== 'PremioFinal.jsx') assert.ok(!/realizarSorteioOficial/.test(src), nome)
  }
  const final = ler('painel-app/src/components/vistas/caca/PremioFinal.jsx')
  assert.match(final, /disabled=\{!SORTEIO_OFICIAL_LIBERADO/)
  assert.match(final, /Etapa 1 de 2/); assert.match(final, /Etapa 2 de 2/)
})

test('diálogos do próprio painel: nada de window.confirm, prompt ou alert', () => {
  const alvos = [...fontesCaca(), ['CarimbosMapa.jsx', ler('painel-app/src/components/vistas/CarimbosMapa.jsx')], ['lib/caca.js', ler('painel-app/src/lib/caca.js')]]
  for (const [nome, src] of alvos) assert.ok(!/\b(window\.)?(confirm|prompt|alert)\s*\(/.test(src.replace(/\bconfirmar\(|\bpedirTexto\(|\bavisar\(/g, '')), nome)
})

test('nada de data ou hora de corte escrita na tela: tudo vem da configuração', () => {
  for (const [nome, src] of fontesCaca()) {
    assert.ok(!/2026-1[0-2]-\d\d/.test(src), nome + ' tem data escrita')
    assert.ok(!/23:59|23h59/.test(src), nome + ' tem o corte escrito')
  }
})

test('contato só é desenhado com relatorio.ler e a surpresa do prêmio final não aparece', () => {
  for (const [nome, src] of fontesCaca()) {
    if (/contatoDe\(/.test(src) && nome !== 'comum.jsx') assert.match(src, /relatorio\.ler|contato/, nome)
    assert.ok(!/plaquinha/i.test(src), nome + ' revela a surpresa')
  }
  assert.match(ler('painel-app/src/components/vistas/caca/PremioFinal.jsx'), /pode\('relatorio\.ler'\)/)
  assert.match(ler('painel-app/src/components/vistas/caca/VouchersDia.jsx'), /pode\('relatorio\.ler'\)/)
})

test('2ª chamada aparece como proposta e as abas estão ligadas', () => {
  assert.match(ler('painel-app/src/components/vistas/caca/VouchersDia.jsx'), /PROPOSTA — aguardando decisão do Wilker/)
  assert.match(ler('painel-app/src/components/vistas/caca/Configuracao.jsx'), /PROPOSTA — aguardando decisão do Wilker/)
  const painel = ler('painel-app/src/components/vistas/caca/PainelCaca.jsx')
  for (const k of ['vouchers', 'final', 'revisao', 'config', 'metas', 'avisos', 'auditoria']) assert.match(painel, new RegExp(`chave: '${k}'`))
  const mapa = ler('painel-app/src/components/vistas/CarimbosMapa.jsx')
  assert.match(mapa, /PainelCaca/); assert.ok(!/get_caca_apuracao/.test(mapa), 'a apuração v1 saiu')
})

// ── achados do painel (revisão 05/11) ───────────────────────────────────────
test('CSV neutraliza fórmula em texto livre (apelido) e preserva número e aspas', () => {
  const csv = C.csvDe([['=1+1', '@SUM(1)', '+x', '-x', '\tx', 'normal', 'a"b', 12, -3, null]])
  assert.equal(csv, `"'=1+1";"'@SUM(1)";"'+x";"'-x";"'\tx";"normal";"a""b";"12";"-3";""`)
})

test('rótulo de sorteio_final não fala em simulação: o evento só existe no sorteio oficial', () => {
  assert.ok(!/simula/i.test(C.rotuloEvento('sorteio_final')))
  assert.equal(C.rotuloEvento('sorteio_final'), 'Ganhador sorteado')
})

test('Mapa e adesivos não vende o ranking legado como decisão de prêmio', () => {
  const src = ler('painel-app/src/components/vistas/CarimbosMapa.jsx')
  assert.ok(/legado, não decide prêmio/.test(src))
  assert.ok(!/avaliações com bônus/.test(src))
})
