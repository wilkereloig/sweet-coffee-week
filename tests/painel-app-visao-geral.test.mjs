// Visão geral da organização (22/10/2026): três assuntos — ações da equipe, situação das marcas, atividade
// recente. Aqui: o número de cada cartão é o tamanho da lista que ele abre (contra o filtro REAL de Marcas.jsx e
// de lib/respostas.js), a ordem é por urgência, a função da pessoa decide o que aparece, e leitura incompleta
// nunca diz "em dia". Comportamento real onde dá; texto de código-fonte só para os contratos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { existe } from './_icones.mjs'
import { lerRota, montarRota } from '../painel-app/src/lib/rota.js'
import { filtrados } from '../painel-app/src/lib/respostas.js'
import { participaDaEdicao, resumoDaEdicao, encerradasNaEdicao, colunasMesa } from '../painel-app/src/lib/mesa.js'
import { TOUR } from '../painel-app/src/lib/ajuda.js'
import { DOMINIOS_VISTAS } from '../painel-app/src/lib/syncFichas.js'
import {
  LEITURA, URGENCIA, JANELA_PRAZO_DIAS, acoesDaEquipe, agendaDaEquipe, aguardandoAprovacao, avisoDeLeitura, estadoDaEdicao, estadoDasAcoes, porExtenso,
  marcasComMensagem, ordenarAcoes, permitida, resumoNomes,
} from '../painel-app/src/lib/visaoGeral.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
// Conferência de código-fonte sem despejar o arquivo inteiro na falha, e sem contar comentário.
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const tem = (src, re, msg) => assert.ok(re.test(src), msg || 'faltou no código: ' + re)
const nao = (src, re, msg) => assert.ok(!re.test(src), msg || 'não devia estar no código: ' + re)
const ED = '2026.2'
const HOJE = '2026-10-22'

// ── O que cada função pode (supabase/migrations: 20260825_contas…, 20260929_fase3…, 20261001_funcao_comercial…,
//    20260928_painel_mensagens…). Só os códigos que a Visão geral consulta. ──────────────────────────────────
const FUNCAO = {
  administrador: ['dado.ler', 'triagem.editar', 'marca.liberar', 'producao.gerir', 'curadoria.decidir', 'mensagem.enviar', 'acesso.gerir', 'redes.ver'],
  curadoria: ['dado.ler', 'triagem.editar', 'marca.liberar', 'curadoria.decidir', 'mensagem.enviar'],
  producao: ['dado.ler', 'triagem.editar', 'producao.gerir', 'mensagem.enviar'],
  comercial: ['dado.ler', 'relacionamento.gerir', 'mensagem.enviar'],
  consulta: ['dado.ler'],
}
const podeDe = (funcao) => (acao) => FUNCAO[funcao].includes(acao)
const TODAS = () => true

// ── Um mundo pequeno, com um caso de borda por cartão ────────────────────────────────────────────────────────
function mundo() {
  const participantes = [
    { id: 'm1', nome_marca: 'Doce Sol', edicao_codigo: ED, status_cadastro: 'em_preenchimento', user_id: 'u1', combo_status: 'em_analise' },
    { id: 'm2', nome_marca: 'Café Vila', edicao_codigo: ED, status_cadastro: 'aguardando_cadastro', user_id: null, combo_status: 'rascunho' },
    { id: 'm3', nome_marca: 'Bolomania', edicao_codigo: ED, status_cadastro: 'cadastro_completo', user_id: 'u3', combo_status: 'aprovado' },
    { id: 'm4', nome_marca: 'Casa de Taipa', edicao_codigo: ED, status_cadastro: 'encerrado', user_id: null, combo_status: 'em_analise' }, // desistiu
    { id: 'm5', nome_marca: 'Velha Guarda', edicao_codigo: '2026.1', status_cadastro: 'em_preenchimento', user_id: null, combo_status: 'em_analise' }, // outra edição
    { id: 'm6', nome_marca: 'Pão Quente', edicao_codigo: ED, status_cadastro: 'em_preenchimento', user_id: null, combo_status: 'rascunho' },
    { id: 'm7', nome_marca: 'Sem Edição', edicao_codigo: null, status_cadastro: 'sem_participacao', user_id: null, combo_status: null },
  ]
  const conversas = [
    { participante_id: 'm1', nome_marca: 'Doce Sol', nao_lidas: '2' }, // bigint do Postgres chega como string
    { participante_id: 'm5', nome_marca: 'Velha Guarda', nao_lidas: 1 },
    { participante_id: 'm3', nome_marca: 'Bolomania', nao_lidas: 0 },
    { participante_id: 'arquivada', nome_marca: 'Marca Arquivada', nao_lidas: 3 }, // fora da lista de Marcas
  ]
  const candidaturas = [
    { id: 'c1', status: 'novo', empresa: 'Forno & Fogo', created_at: '2026-10-20T10:00:00Z' },
    { id: 'c2', status: 'novo', nome: 'Ana', created_at: '2026-10-21T10:00:00Z' },
    { id: 'c3', status: 'em_analise', empresa: 'Em Análise', created_at: '2026-10-19T10:00:00Z' },
  ]
  const apoiar = [{ id: 'a1', status: 'novo' }, { id: 'a2', status: 'contatado' }]
  const contato = [{ id: 'k1', status: 'novo' }]
  const temas = [
    { id: 't1', tema: 'Cartoon', tema_norm: 'cartoon', status: 'proposto', prioridade: 1, marca: 'Doce Sol' },
    { id: 't2', tema: 'Cartoon', tema_norm: 'cartoon', status: 'proposto', prioridade: 2, marca: 'Café Vila' },
    { id: 't3', tema: 'Pirata', tema_norm: 'pirata', status: 'proposto', prioridade: 1, marca: 'Pão Quente' },
    { id: 't4', tema: 'Circo', tema_norm: 'circo', status: 'aprovado', prioridade: 1, marca: 'Bolomania' },
  ]
  const revisao = [{ id: 'r1', titulo: 'CNPJ repetido' }, { id: 'r2', titulo: 'Telefone inválido' }]
  const pedidos = [ // já filtrados: publicados e não arquivados
    { id: 's1', titulo: 'Logo em alta', pendentes: '3', respondidas: 5 },
    { id: 's2', titulo: 'Horário do combo', pendentes: 0, respondidas: 8 },
    { id: 's3', titulo: 'Fotos do combo', pendentes: 4, respondidas: 1 },
  ]
  return { participantes, conversas, candidaturas, respostasSite: { apoiar, contato }, temas, revisao, pedidos, edicaoCodigo: ED }
}
const semAgenda = { itens: [], total: 0, mais: 0, prazos: 0, urgente: false, urgenteTexto: '' }
const monta = (extra = {}) => acoesDaEquipe({ ...mundo(), agenda: semAgenda, pode: TODAS, ...extra })
const contagens = (r) => r.cartoes.filter((c) => c.tipo === 'contagem')
const chaves = (r) => r.cartoes.map((c) => c.chave)

// ── 1 · O número é o tamanho da lista que o cartão abre ─────────────────────────────────────────────────────
/*
 * O filtro de Marcas.jsx executado de verdade: pega o corpo do `useMemo` da lista e o roda com os mesmos
 * argumentos que a tela passa. Se alguém mudar uma regra lá, o cartão deixa de bater e este teste cai.
 */
function filtroRealDeMarcas() {
  const src = ler('painel-app/src/components/vistas/Marcas.jsx')
  const m = /const lista = React\.useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[[^\]]*\]\)/.exec(src)
  assert.ok(m, 'Marcas.jsx mudou de forma: ajuste a extração da lista filtrada neste teste (e confira se o filtro `situacao` ainda bate com os cartões)')
  // A busca usa o `compacto` do próprio arquivo (sem acento nem pontuação): vem junto, extraído do fonte.
  const compacto = new Function('return ' + /const compacto = (\(s\) => [^\n]+)/.exec(src)[1])()
  const corpo = new Function('participantes', 'porMarca', 'termo', 'status', 'ordem', 'f', 'ORDENS', 'participaDaEdicao', 'pendenciasDe', 'compacto', m[1])
  const ORDENS = { recentes: () => 0, nome: () => 0, mensagens: () => 0 }
  const pendenciasDe = (p) => Number(p.campos_faltando || 0) + Number(p.correcoes_abertas || 0) + Number(p.pedidos_abertos || 0)
  return (participantes, conversas, filtros) => corpo(
    participantes, Object.fromEntries(conversas.map((c) => [c.participante_id, c])), filtros.busca || '', filtros.situacao || '',
    filtros.ordem || 'recentes', filtros, ORDENS, participaDaEdicao, pendenciasDe, compacto)
}

test('cartão que abre a lista de Marcas: o número É o tamanho da lista filtrada (filtro real de Marcas.jsx)', () => {
  const lista = filtroRealDeMarcas()
  const w = mundo()
  const r = monta()
  const deMarcas = contagens(r).filter((c) => c.rota.vista === 'participantes' && c.rota.aba === 'lista')
  assert.deepEqual(deMarcas.map((c) => c.chave).sort(), ['aprovacao', 'mensagens', 'semAcesso'])
  for (const c of deMarcas) {
    assert.equal(lista(w.participantes, w.conversas, c.rota.filtros).length, c.n, c.chave + ': o número difere da lista que o cartão abre')
    assert.equal(c.n, c.itens.length, c.chave + ': o cartão tem de carregar a mesma lista que conta')
  }
  // Os números do mundo, à mão: 1 marca com mensagem na lista ativa + a de outra edição; a arquivada não conta.
  assert.deepEqual(r.cartoes.filter((c) => c.chave === 'mensagens')[0].itens.map((m) => m.id).sort(), ['m1', 'm5'])
  const aprov = r.cartoes.find((c) => c.chave === 'aprovacao')
  assert.equal(aprov.n, 1, 'só m1: m4 desistiu (encerrada) e m5 é de outra edição')
  assert.deepEqual(aprov.itens.map((p) => p.id), ['m1'])
  assert.equal(r.cartoes.find((c) => c.chave === 'semAcesso').n, 2, 'm2 e m6; a encerrada e a de outra edição ficam de fora')
})

test('"aguardando aprovação": cartão e lista usam a mesma regra, com a encerrada de fora dos DOIS lados', () => {
  const lista = filtroRealDeMarcas()
  const w = mundo()
  // Sem filtro de edição (a lista aberta pelo select): a mesma expressão do cartão, marca por marca.
  const daLista = lista(w.participantes, w.conversas, { situacao: 'aguardando_aprovacao' }).map((p) => p.id).sort()
  assert.deepEqual(daLista, w.participantes.filter(aguardandoAprovacao).map((p) => p.id).sort())
  assert.ok(!daLista.includes('m4'), 'marca encerrada não espera decisão da curadoria')
  assert.ok(daLista.includes('m5'), 'a de outra edição continua na lista geral (o cartão filtra a edição por cima)')
  // Uma marca que desiste depois de enviar o combo (combo_status segue em_analise) sai do cartão.
  assert.equal(aguardandoAprovacao({ combo_status: 'em_analise', status_cadastro: 'encerrado' }), false)
  assert.equal(aguardandoAprovacao({ combo_status: 'em_analise', status_cadastro: 'em_preenchimento' }), true)
  assert.equal(aguardandoAprovacao({ combo_status: 'aprovado', status_cadastro: 'em_preenchimento' }), false)
})

test('as barras da edição também batem: com acesso, cadastro completo; o total difere só pelas encerradas (dito na tela)', () => {
  const lista = filtroRealDeMarcas()
  const w = mundo()
  const r = resumoDaEdicao(w.participantes, ED)
  assert.equal(lista(w.participantes, w.conversas, { edicao: ED, situacao: 'com_conta' }).length, r.comAcesso)
  assert.equal(lista(w.participantes, w.conversas, { edicao: ED, situacao: 'sem_conta' }).length, r.semAcesso)
  assert.equal(lista(w.participantes, w.conversas, { edicao: ED, situacao: 'cadastro_completo' }).length, r.completos)
  const total = lista(w.participantes, w.conversas, { edicao: ED })
  assert.equal(total.length, r.naEdicao.length + encerradasNaEdicao(w.participantes, ED).length)
  assert.deepEqual(encerradasNaEdicao(w.participantes, ED).map((p) => p.id), ['m4'])
  assert.equal(encerradasNaEdicao(w.participantes, undefined).length, 0)
})

test('cartão de candidaturas e de respostas do site: o número é o tamanho da lista de Respostas (filtrados real)', () => {
  const w = mundo()
  const r = monta()
  const cand = r.cartoes.find((c) => c.chave === 'candidaturas')
  assert.deepEqual(cand.rota, { vista: 'participantes', aba: 'candidaturas', filtros: { status: 'novo' } })
  assert.equal(filtrados({ quero_participar: w.candidaturas }, { aba: 'quero_participar', status: cand.rota.filtros.status, dias: '', termo: '' }).length, cand.n)
  assert.equal(cand.n, 2)
  const site = r.cartoes.find((c) => c.chave === 'respostasSite')
  assert.deepEqual(site.rota, { vista: 'contatos', aba: 'recebidos', filtros: { status: 'novo' } })
  assert.equal(filtrados({ apoiar: w.respostasSite.apoiar, contato: w.respostasSite.contato }, { aba: 'tudo', status: site.rota.filtros.status, dias: '', termo: '' }).length, site.n)
  assert.equal(site.n, 2)
  assert.equal(site.detalhe, '1 do Apoiar · 1 do Contato')
})

test('revisão: o número é o da lista aberta; temas contam propostas e dizem os conflitos', () => {
  const r = monta()
  assert.equal(r.cartoes.find((c) => c.chave === 'revisao').n, 2)
  const temas = r.cartoes.find((c) => c.chave === 'temas')
  assert.equal(temas.n, 3, 'três propostas esperando; a aprovada não conta')
  assert.match(temas.detalhe, /^1 tema pedido por mais de uma marca$/)
  assert.equal(temas.n, temas.itens.length)
  assert.deepEqual(temas.rota, { vista: 'participantes', aba: 'temas', filtros: {} })
})

test('pedidos: soma as respostas que faltam (declarado); com um pedido só, abre o "Quem falta" dele', () => {
  const r = monta()
  const p = r.cartoes.find((c) => c.chave === 'pedidos')
  assert.equal(p.soma, true)
  assert.equal(p.n, 7, '3 + 4 (a string do banco vira número)')
  assert.equal(p.itens.length, 2, 'só os pedidos com falta')
  assert.equal(p.detalhe, 'em 2 pedidos')
  assert.deepEqual(p.rota, { vista: 'operacao', aba: 'pedidos', filtros: {} })
  const um = monta({ pedidos: [{ id: 's9', titulo: 'Só este', pendentes: 2 }] }).cartoes.find((c) => c.chave === 'pedidos')
  assert.deepEqual(um.rota, { vista: 'operacao', aba: 'pedidos', filtros: { item: 's9' } })
  assert.equal(um.n, 2)
  assert.equal(um.detalhe, '“Só este”')
  assert.equal(monta({ pedidos: [{ id: 's9', pendentes: 0 }] }).cartoes.find((c) => c.chave === 'pedidos'), undefined, 'pedido todo respondido não vira cartão')
})

test('toda contagem usa o MESMO texto de filtro das telas de destino', () => {
  // A execução real acima prova o comportamento; aqui, o texto que o cartão espelha — se uma regra mudar de
  // forma lá, a mensagem aponta onde.
  const marcas = ler('painel-app/src/components/vistas/Marcas.jsx')
  assert.match(marcas, /status === 'aguardando_aprovacao' \? p\.combo_status === 'em_analise' && participaDaEdicao\(p\)/)
  assert.match(marcas, /status === 'sem_conta' \? !p\.user_id && participaDaEdicao\(p\)/)
  assert.match(marcas, /status === 'com_conta' \? !!p\.user_id && participaDaEdicao\(p\)/)
  assert.match(marcas, /status === 'mensagens' \? p\._naoLidas > 0/)
  assert.match(marcas, /\.filter\(\(p\) => !f\.edicao \|\| p\.edicao_codigo === f\.edicao\)/)
  assert.match(ler('painel-app/src/lib/respostas.js'), /if \(status && reg\.status !== status\) return false/)
})

test('rota de cada cartão: sobrevive ao endereço (montar → ler) e cai numa aba que existe', () => {
  const src = ler('painel-app/src/components/Modulos.jsx')
  const abas = {}
  for (const bloco of src.split(/\nexport function /).slice(1)) {
    const id = /<Modulo id="(\w+)"/.exec(bloco)
    if (id) abas[id[1]] = [...bloco.matchAll(/\{ chave: '([^']*)'/g)].map((m) => m[1])
  }
  const w = mundo()
  const r = monta({ pedidos: [{ id: 's9', titulo: 'x', pendentes: 1 }], agenda: { ...semAgenda, itens: [{ chave: 'p', titulo: 'T', texto: 'vence hoje', dias: 0, rota: { vista: 'edicao', aba: 'configuracao', filtros: {} } }], total: 1, prazos: 1 } })
  assert.ok(contagens(r).length >= 8, 'o mundo de teste devia abrir todos os cartões')
  for (const c of contagens(r)) {
    const volta = lerRota(montarRota(c.rota))
    assert.deepEqual(volta, { vista: c.rota.vista, aba: c.rota.aba, filtros: Object.fromEntries(Object.entries(c.rota.filtros).map(([k, v]) => [k, String(v)])) }, c.chave)
    assert.ok((abas[c.rota.vista] || []).includes(c.rota.aba), c.chave + ' → ' + c.rota.vista + '/' + c.rota.aba + ' não é uma aba')
  }
  assert.ok(w.participantes.length > 0)
})

// ── 2 · Ordem por urgência ──────────────────────────────────────────────────────────────────────────────────
test('ordem por urgência: do que tem gente esperando ao que é organização interna; a agenda por último sem prazo', () => {
  assert.deepEqual(chaves(monta()), ['mensagens', 'aprovacao', 'temas', 'pedidos', 'candidaturas', 'revisao', 'respostasSite', 'semAcesso', 'agenda'])
  const u = contagens(monta()).map((c) => c.urgencia)
  assert.deepEqual(u, [...u].sort((a, b) => a - b), 'a lista sai em ordem crescente de urgência')
})

test('a agenda sobe sozinha: prazo hoje/amanhã vai ao topo; prazo à vista entra entre temas e pedidos', () => {
  const item = { chave: 'prazo:1', titulo: 'Preenchimento', texto: 'vence hoje', dias: 0, rota: { vista: 'edicao', aba: 'configuracao', filtros: {} } }
  const hoje = monta({ agenda: { itens: [item], total: 1, mais: 0, prazos: 1, urgente: true, urgenteTexto: 'Vence hoje' } })
  assert.equal(chaves(hoje)[0], 'agenda')
  assert.equal(hoje.cartoes[0].urgencia, URGENCIA.agendaHoje)
  const logo = monta({ agenda: { itens: [{ ...item, dias: 3 }], total: 1, mais: 0, prazos: 1, urgente: false, urgenteTexto: '' } })
  assert.deepEqual(chaves(logo).slice(0, 5), ['mensagens', 'aprovacao', 'temas', 'agenda', 'pedidos'])
  // Só sessões de fotos (sem prazo): a agenda fica por último.
  const sessoes = monta({ agenda: { itens: [{ chave: 'agenda:0', titulo: '', texto: 'Sessão de fotos de X', dias: null, rota: {} }], total: 1, mais: 0, prazos: 0, urgente: false, urgenteTexto: '' } })
  assert.equal(chaves(sessoes).at(-1), 'agenda')
})

test('ordenarAcoes: empate de urgência vai para o maior número; não muda a lista recebida', () => {
  const entrada = [
    { chave: 'a', urgencia: 10, n: 2, titulo: 'B' }, { chave: 'b', urgencia: 10, n: 5, titulo: 'A' },
    { chave: 'c', urgencia: 5, n: 1, titulo: 'C' }, { chave: 'd', urgencia: 10, n: 2, titulo: 'A' },
  ]
  const copia = JSON.stringify(entrada)
  assert.deepEqual(ordenarAcoes(entrada).map((c) => c.chave), ['c', 'b', 'd', 'a'])
  assert.equal(JSON.stringify(entrada), copia)
  assert.deepEqual(ordenarAcoes(null), [])
})

// ── 3 · A função decide o que aparece ───────────────────────────────────────────────────────────────────────
test('cartão que exige ação sem permissão não aparece: cada função vê só o que pode resolver', () => {
  const por = (f) => contagens(monta({ pode: podeDe(f) })).map((c) => c.chave).sort()
  assert.deepEqual(por('administrador'), ['aprovacao', 'candidaturas', 'mensagens', 'pedidos', 'respostasSite', 'revisao', 'semAcesso', 'temas'])
  assert.deepEqual(por('curadoria'), ['aprovacao', 'candidaturas', 'mensagens', 'respostasSite', 'revisao', 'semAcesso', 'temas'])
  assert.deepEqual(por('producao'), ['candidaturas', 'mensagens', 'pedidos', 'respostasSite'])
  assert.deepEqual(por('comercial'), ['mensagens'])
  assert.deepEqual(por('consulta'), [])
  assert.deepEqual(contagens(monta({ pode: undefined })).length, 0, 'sem `pode`, ninguém age')
})

test('quem não pode resolver nada não lê "nada precisa da equipe": a pendência existe, é de outra função', () => {
  const r = monta({ pode: podeDe('consulta') })
  assert.equal(contagens(r).length, 0)
  assert.equal(r.ocultas, 8, 'os oito cartões abertos ficaram de fora só por permissão')
  const e = estadoDasAcoes({ lidas: true, falhas: [], contagens: 0, ocultas: r.ocultas })
  assert.equal(e.tipo, 'outras-funcoes')
  assert.doesNotMatch(e.texto, /Nada precisa da equipe/)
  // E o contrário: de fato nada aberto → o vazio honesto.
  const vazio = acoesDaEquipe({ agenda: semAgenda, pode: TODAS })
  assert.equal(vazio.ocultas, 0)
  assert.equal(estadoDasAcoes({ lidas: true, falhas: [], contagens: 0, ocultas: 0 }).texto, 'Nada precisa da equipe agora.')
})

test('permitida: código ou lista; sem exigência vale para todos; sem `pode` nega', () => {
  assert.equal(permitida(podeDe('consulta'), undefined), true)
  assert.equal(permitida(podeDe('consulta'), 'curadoria.decidir'), false)
  assert.equal(permitida(podeDe('producao'), ['curadoria.decidir', 'producao.gerir']), true)
  assert.equal(permitida(undefined, 'dado.ler'), false)
})

test('todo código de permissão que um cartão exige existe de verdade nas migrations (nada de typo)', () => {
  const dir = new URL('../supabase/migrations/', import.meta.url)
  const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n')
  for (const c of contagens(monta())) {
    const cods = [].concat(c.permissao)
    assert.ok(cods.length > 0, c.chave + ' sem permissão declarada — todo cartão exige uma ação')
    for (const cod of cods) assert.ok(new RegExp("\\('(?:administrador|curadoria|producao|comercial)',\\s*'" + cod.replace('.', '\\.') + "'\\)").test(sql), c.chave + ': ' + cod + ' não existe em `permissoes`')
  }
})

// ── 4 · Leitura incompleta NUNCA diz "em dia" ───────────────────────────────────────────────────────────────
test('estadoDasAcoes: "vazio" só quando leu tudo, sem falha, sem cartão e sem pendência de outra função', () => {
  for (const lidas of [false, true]) for (const falhas of [[], [LEITURA.pedidos]]) for (const n of [0, 2]) for (const ocultas of [0, 3]) {
    const e = estadoDasAcoes({ lidas, falhas, contagens: n, ocultas })
    const devia = lidas && falhas.length === 0 && n === 0 && ocultas === 0
    assert.equal(e.tipo === 'vazio', devia, JSON.stringify({ lidas, falhas, n, ocultas }) + ' → ' + e.tipo)
    if (e.tipo !== 'vazio') assert.doesNotMatch(e.texto, /Nada precisa da equipe|Tudo em dia|Nada pendente/)
  }
  assert.equal(estadoDasAcoes({ lidas: false }).tipo, 'conferindo')
  assert.equal(estadoDasAcoes({ lidas: true, falhas: [LEITURA.marcas] }).tipo, 'incompleta')
  assert.equal(estadoDasAcoes({ lidas: true, falhas: [LEITURA.marcas], contagens: 1 }).tipo, 'abertas', 'com cartão, mostra o que há — e o aviso de leitura parcial fica ao lado')
})

test('prazo vencendo hoje/amanhã: "nada precisa da equipe" nunca aparece ao lado da agenda urgente', () => {
  // A agenda é um cartão `tipo: 'agenda'`, não de contagem: sem contagem nenhuma, o estado antigo dizia "vazio".
  const urgente = { ...semAgenda, itens: [{ chave: 'prazo:1', titulo: 'Preenchimento', texto: 'vence hoje', dias: 0, rota: {} }], total: 1, prazos: 1, urgente: true, urgenteTexto: 'Vence hoje' }
  const r = acoesDaEquipe({ agenda: urgente, pode: TODAS })
  assert.equal(contagens(r).length, 0, 'sem nenhum cartão de contagem')
  assert.equal(chaves(r)[0], 'agenda', 'a agenda urgente é o primeiro cartão da tela')
  const e = estadoDasAcoes({ lidas: true, falhas: [], contagens: contagens(r).length, ocultas: r.ocultas, agendaUrgente: urgente.urgente })
  assert.equal(e.tipo, 'agenda-urgente')
  assert.equal(e.texto, '', 'sem frase: o cartão da agenda já diz o que fazer')
  assert.doesNotMatch(e.texto, /Nada precisa da equipe|Tudo em dia|Nada pendente/)
  // Sem urgência (prazo longe ou só sessão de fotos), o vazio honesto continua valendo.
  assert.equal(estadoDasAcoes({ lidas: true, falhas: [], contagens: 0, ocultas: 0, agendaUrgente: false }).tipo, 'vazio')
  // Combinações: "vazio" só quando leu tudo, sem falha, sem cartão, sem oculta E sem agenda urgente.
  for (const lidas of [false, true]) for (const falhas of [[], [LEITURA.pedidos]]) for (const n of [0, 2]) for (const ocultas of [0, 3]) for (const agendaUrgente of [false, true]) {
    const x = estadoDasAcoes({ lidas, falhas, contagens: n, ocultas, agendaUrgente })
    const devia = lidas && falhas.length === 0 && n === 0 && ocultas === 0 && !agendaUrgente
    assert.equal(x.tipo === 'vazio', devia, JSON.stringify({ lidas, falhas, n, ocultas, agendaUrgente }) + ' → ' + x.tipo)
  }
})

test('a edição e a esteira: leitura de edição/marcas que NUNCA deu certo não vira "nenhuma edição" nem "0 marcas"', () => {
  const base = { codigo: '2026.2', lidas: true, edicaoLida: true, marcasLidas: true }
  assert.equal(estadoDaEdicao({ ...base, lidas: false }).tipo, 'conferindo')
  assert.equal(estadoDaEdicao(base).tipo, 'ok')
  assert.equal(estadoDaEdicao(base).texto, '')
  // get_edicoes caiu na primeira carga: não se sabe qual edição está aberta.
  const semLeituraEdicao = estadoDaEdicao({ ...base, codigo: undefined, edicaoLida: false })
  assert.equal(semLeituraEdicao.tipo, 'edicao-nao-lida')
  assert.doesNotMatch(semLeituraEdicao.texto, /Nenhuma edição está aberta/)
  // get_edicoes respondeu e não há edição atual: aí sim.
  assert.equal(estadoDaEdicao({ ...base, codigo: undefined }).tipo, 'sem-edicao')
  assert.match(estadoDaEdicao({ ...base, codigo: undefined }).texto, /Nenhuma edição está aberta agora/)
  // get_participantes caiu na primeira carga: "0 marcas na edição" seria inventado.
  const semMarcas = estadoDaEdicao({ ...base, marcasLidas: false })
  assert.equal(semMarcas.tipo, 'marcas-nao-lidas')
  assert.match(semMarcas.texto, /Não consegui ler as marcas/)
  // Edição não lida vence marcas não lidas (sem edição não há de quem contar).
  assert.equal(estadoDaEdicao({ ...base, codigo: undefined, edicaoLida: false, marcasLidas: false }).tipo, 'edicao-nao-lida')

  const m = semComentarios(ler('painel-app/src/components/vistas/Mesa.jsx'))
  // A Mesa só liga "lida" quando a leitura funcionou (e mantém o que já leu se a releitura cair).
  tem(m, /marcasLidas: x\.marcasLidas \|\| part\.ok, edicaoLida: x\.edicaoLida \|\| edicoes\.ok/)
  tem(m, /estadoDaEdicao\(\{ codigo: edCodigo, lidas: extra\.lidas, edicaoLida: extra\.edicaoLida, marcasLidas: extra\.marcasLidas \}\)/)
  tem(m, /<ResumoEdicao estado=\{estadoEdicao\}/)
  // A esteira some (com a razão dita) em vez de mostrar etapas de zeros e "Nenhuma marca nesta etapa".
  tem(m, /esteiraSemMarcas = extra\.lidas && !extra\.marcasLidas/)
  tem(m, /\{esteiraSemMarcas \? \(\s*<p className="ui-nota">Não consegui ler as marcas agora/)
  const r = semComentarios(ler('painel-app/src/components/vistas/mesa/ResumoEdicao.jsx'))
  tem(r, /if \(estado\.tipo !== 'ok'\) return <p className="ui-nota">\{estado\.texto\}<\/p>/)
  nao(r, /Nenhuma edição está aberta|Conferindo a edição/, 'o texto da caixa vem de estadoDaEdicao (lib), não escrito à mão')
})

test('aviso de leitura: nomeia o que faltou NO bloco que a leitura alimenta; leitura de outro bloco não o condena', () => {
  assert.equal(avisoDeLeitura([], 'acoes'), null)
  assert.equal(avisoDeLeitura([LEITURA.atividade], 'acoes'), null, 'a atividade não é pendência')
  assert.equal(avisoDeLeitura([LEITURA.atividade], 'atividade'), 'Faltou ler a atividade recente. O que aparece aqui pode estar incompleto.')
  assert.equal(avisoDeLeitura([LEITURA.pedidos, LEITURA.temas, LEITURA.atividade], 'acoes'), 'Faltou ler os pedidos e os temas. O que aparece aqui pode estar incompleto.')
  assert.equal(avisoDeLeitura([LEITURA.marcas, LEITURA.edicao], 'marcas'), 'Faltou ler as marcas e a edição atual. O que aparece aqui pode estar incompleto.')
  assert.equal(avisoDeLeitura([LEITURA.pedidos], 'marcas'), null)
  assert.equal(avisoDeLeitura([LEITURA.pedidos], 'bloco-que-nao-existe'), null)
  assert.equal(porExtenso(['a']), 'a'); assert.equal(porExtenso(['a', 'b', 'c']), 'a, b e c'); assert.equal(porExtenso([]), '')
})

test('Mesa.jsx: o princípio está na tela — "nada precisa" só vem do estado da lib, depois de ler tudo', () => {
  const m = semComentarios(ler('painel-app/src/components/vistas/Mesa.jsx'))
  // Cada leitura extra é nomeada pela mesma tabela que escreve "Faltou ler …".
  for (const nome of Object.keys(LEITURA)) tem(m, new RegExp('LEITURA\\.' + nome + '\\b'), nome + ': a leitura não passa pelo nome único')
  nao(m, /pegar\([^)]*'(as|os|a) [^']+'\)/, 'rótulo de leitura escrito à mão em Mesa.jsx')
  // Nenhuma frase de "em dia" escrita à mão: vem de estadoDasAcoes (lib/visaoGeral.js).
  nao(m, /Nada precisa da equipe|Tudo em dia/, 'frase de "em dia" escrita à mão em Mesa.jsx')
  tem(m, /!extra\.lidas \? <p className="ui-nota">Conferindo o que está pendente…<\/p>\s*\n\s*: extra\.falhas\.length \? <p className="ui-nota">Não consegui ler tudo, então não dá para dizer que está em dia\.<\/p>\s*\n\s*: estado\.texto \? <p className="ui-resumo__ok"><Icone nome="ok-circulo" tamanho=\{20\} \/> \{estado\.texto\}<\/p>\s*\n\s*: null/, 'a cadeia conferindo → incompleta → estado da lib (→ nada, com agenda urgente) mudou de forma')
  // A agenda urgente entra no estado: sem isso, "Nada precisa" aparecia ao lado de "Vence hoje".
  tem(m, /estadoDasAcoes\(\{[^}]*agendaUrgente: agenda\.urgente \}\)/, 'a Mesa tem de passar agenda.urgente a estadoDasAcoes')
  // Os mesmos textos da lib, para não divergirem em silêncio.
  assert.equal(estadoDasAcoes({ lidas: false }).texto, 'Conferindo o que está pendente…')
  assert.equal(estadoDasAcoes({ lidas: true, falhas: ['x'] }).texto, 'Não consegui ler tudo, então não dá para dizer que está em dia.')
  // Atividade: lista vazia + leitura caída não vira "nenhuma ação registrada".
  const a = ler('painel-app/src/components/vistas/mesa/AtividadeRecente.jsx')
  assert.match(a, /falhou \? 'Não deu para carregar os registros agora\.' : 'Nenhuma ação registrada ainda\.'/)
})

test('Social media com algo em aberto: "nada precisa da equipe" nunca ao lado de "2 atrasadas" (23/10/2026)', () => {
  // O resumo do Social media não é cartão de contagem: sem ele no estado, a Mesa dizia "vazio" com atraso à vista.
  const base = { lidas: true, falhas: [], contagens: 0, ocultas: 0 }
  assert.equal(estadoDasAcoes({ ...base, redes: 2 }).tipo, 'redes')
  assert.equal(estadoDasAcoes({ ...base, redes: 2 }).texto, '', 'sem frase: o resumo, logo abaixo, mostra os números')
  assert.equal(estadoDasAcoes({ ...base, redes: 2, ocultas: 3 }).tipo, 'redes', '"nada que a sua função possa resolver" também seria falso')
  assert.equal(estadoDasAcoes({ ...base, redes: 0 }).tipo, 'vazio')
  assert.equal(estadoDasAcoes({ ...base, redes: 2, contagens: 1 }).tipo, 'abertas')
  assert.equal(estadoDasAcoes({ ...base, redes: 2, falhas: [LEITURA.redes] }).tipo, 'incompleta')
  assert.equal(estadoDasAcoes({ ...base, lidas: false, redes: 2 }).tipo, 'conferindo')
  // A leitura do Social media é do bloco de ações: caiu, o aviso diz ali.
  assert.equal(avisoDeLeitura([LEITURA.redes], 'acoes'), 'Faltou ler o planejamento do Social media. O que aparece aqui pode estar incompleto.')
  assert.equal(avisoDeLeitura([LEITURA.redes], 'marcas'), null)
  // A Mesa lê redes_resumo só com redes.ver, soma os alertas do perfil (a regra do topo do Planejamento) e relê com "redes".
  const m = semComentarios(ler('painel-app/src/components/vistas/Mesa.jsx'))
  tem(m, /pode && pode\('redes\.ver'\) \? pegar\('redes_resumo', \{\}, LEITURA\.redes\) : Promise\.resolve\(\{ ok: true, v: null \}\)/)
  tem(m, /const nRedes = totalAlertas\(extra\.redes, \{ aprova: !!pode && pode\('redes\.aprovar'\) \}\)/)
  tem(m, /estadoDasAcoes\(\{[^}]*redes: nRedes,[^}]*\}\)/)
  tem(m, /\}, \[guarda, pode\]\)/, 'permissão nova relê (redes.ver pode chegar depois)')
  // E relê quando o Social media muda — mas SÓ o resumo (redes_resumo), não as ~14 leituras da mesa a cada post salvo.
  assert.ok(!DOMINIOS_VISTAS.mesa.includes('redes'), '"redes" fora do conjunto que refaz a mesa inteira')
  tem(m, /rpc\('redes_resumo', \{ p_secret: lerSenha\(\) \}\)/)
  tem(m, /useSincronizar\(\['redes'\], lerRedes\)/, 'a Mesa relê o resumo do Social media quando ele muda')
  tem(m, /const guardaRedes = useGuarda\(\)/, 'guarda própria: a releitura curta não invalida a longa em andamento')
})

// ── 5 · Agenda e prazos ─────────────────────────────────────────────────────────────────────────────────────
test('agenda: só prazos de 0 a 5 dias, do mais perto ao mais longe; data ausente nunca entra', () => {
  assert.equal(JANELA_PRAZO_DIAS, 5)
  const crono = [
    { id: 'p5', tipo: 'prazo', titulo: 'Cinco', fim: '2026-10-27' },
    { id: 'p0', tipo: 'prazo', titulo: 'Hoje', fim: '2026-10-22' },
    { id: 'p6', tipo: 'prazo', titulo: 'Seis', fim: '2026-10-28' }, // fora da janela
    { id: 'pm', tipo: 'prazo', titulo: 'Ontem', fim: '2026-10-21' }, // já passou
    { id: 'sd', tipo: 'prazo', titulo: 'Sem data' }, // null >= 0 é true em JS: não pode entrar
    { id: 'pe', tipo: 'periodo', titulo: 'Festival', inicio: '2026-10-23', fim: '2026-10-30' },
  ]
  const a = agendaDaEquipe({ cronograma: crono, hoje: HOJE, avisosAgenda: [{ texto: '2 vagas abertas na agenda de fotos.', rota: { vista: 'operacao', aba: 'fotos' } }] })
  assert.deepEqual(a.itens.map((i) => i.chave), ['prazo:p0', 'prazo:p5', 'agenda:0'])
  assert.equal(a.itens[0].texto, 'vence hoje')
  assert.equal(a.itens[1].texto, 'vence em 5 dias')
  assert.equal(a.urgente, true)
  assert.equal(a.urgenteTexto, 'Vence hoje')
  assert.equal(a.prazos, 2)
  assert.equal(agendaDaEquipe({ cronograma: [{ id: 'x', tipo: 'prazo', titulo: 'T', fim: '2026-10-23' }], hoje: HOJE }).urgenteTexto, 'Vence amanhã')
  assert.equal(agendaDaEquipe({ cronograma: [{ id: 'x', tipo: 'prazo', titulo: 'T', fim: '2026-10-26' }], hoje: HOJE }).urgente, false)
})

test('agenda: corta no limite e diz quantos ficaram de fora; sem dados, vazia', () => {
  const avisos = Array.from({ length: 9 }, (_, k) => ({ texto: 'Sessão ' + k, rota: { vista: 'operacao', aba: 'fotos' } }))
  const a = agendaDaEquipe({ cronograma: [], hoje: HOJE, avisosAgenda: avisos, limite: 6 })
  assert.equal(a.itens.length, 6)
  assert.equal(a.total, 9)
  assert.equal(a.mais, 3)
  const vazia = agendaDaEquipe({ hoje: HOJE })
  assert.deepEqual([vazia.itens.length, vazia.mais, vazia.prazos, vazia.urgente], [0, 0, 0, false])
})

// ── 6 · Ajudantes ───────────────────────────────────────────────────────────────────────────────────────────
test('marcasComMensagem: só quem está na lista de Marcas; sem a lista lida, vale a conversa', () => {
  const w = mundo()
  assert.deepEqual(marcasComMensagem(w.participantes, w.conversas).map((m) => [m.id, m.n]), [['m1', 2], ['m5', 1]])
  assert.deepEqual(marcasComMensagem([], w.conversas).map((m) => m.id).sort(), ['arquivada', 'm1', 'm5'])
  assert.deepEqual(marcasComMensagem(undefined, undefined), [])
})

test('resumoNomes: um, dois, "e mais N"; nome em branco vira (sem nome)', () => {
  assert.equal(resumoNomes([]), '')
  assert.equal(resumoNomes(['A']), 'A')
  assert.equal(resumoNomes(['A', 'B']), 'A e B')
  assert.equal(resumoNomes(['A', 'B', 'C', 'D', 'E']), 'A, B e mais 3')
  assert.equal(resumoNomes(['A', '', null]), 'A, (sem nome) e mais 1')
})

test('esteira: o número de cada etapa é o tamanho da lista que ela mostra (e nenhuma marca aparece em duas)', () => {
  const w = mundo()
  const colunas = colunasMesa({ candidaturas: w.candidaturas, participantes: w.participantes })
  const ids = colunas.flatMap((c) => c.itens.map((i) => (i.tipo === 'marca' ? 'marca:' + i.participanteId : 'cand:' + i.id)))
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(colunas.find((c) => c.chave === 'novas').itens.length, 2)
})

// ── 7 · Ícones, nomes e tela ────────────────────────────────────────────────────────────────────────────────
test('cada cartão tem ícone do registro, destino dito, frase e título; nenhum sem rota', () => {
  const r = monta()
  for (const c of contagens(r)) {
    assert.ok(existe(c.icone), c.chave + ': ícone inexistente ' + c.icone)
    for (const k of ['titulo', 'frase', 'destino']) assert.ok(String(c[k] || '').trim(), c.chave + ' sem ' + k)
    assert.ok(c.rota && c.rota.vista, c.chave + ' sem destino: métrica sem destino não entra')
    assert.ok(c.n > 0, c.chave + ' aparece com zero')
  }
  assert.equal(new Set(contagens(r).map((c) => c.chave)).size, contagens(r).length)
})

test('a tela: três áreas na ordem pedida, cartões pelo Modulo do painel, Social media só com a permissão dela', () => {
  const m = ler('painel-app/src/components/vistas/Mesa.jsx')
  const mc = semComentarios(m)
  const ordem = ['rotulo="Ações da equipe"', 'rotulo="Situação das marcas"', 'rotulo="Atividade recente"'].map((t) => m.indexOf(t))
  assert.ok(ordem.every((i) => i > 0) && ordem[0] < ordem[1] && ordem[1] < ordem[2], 'ordem das áreas: ' + ordem)
  assert.equal((m.match(/<MacroSecao /g) || []).length, 3)
  const cartao = ler('painel-app/src/components/vistas/mesa/CartaoAcao.jsx')
  // Só o cartão com `acao.abrir` (Combos para aprovar, 27/10/2026) resolve numa folha; os outros seguem sendo o atalho da lista.
  assert.match(cartao, /<Modulo [^>]*onClick=\{\(\) => \(aqui \? abrir\(acao\.abrir\) : navegar\(acao\.rota\)\)\}/, 'o cartão inteiro é o atalho da lista que conta (ou abre a folha)')
  assert.match(cartao, /rotuloIr=\{aqui \? 'Revisar e decidir' : 'Abrir ' \+ acao\.destino\}/, 'o destino é dito')
  // Social media: a leitura é a da Mesa (entra no "nada precisa"); o resumo confere a permissão (redes.ver) e fica sob o título certo.
  tem(mc, /\{pode && !\(extra\.lidas && !extra\.redes\) && \(\s*<NivelTitulo\.Provider value=\{3\}>\s*<ResumoRedes navegar=\{navegar\} pode=\{pode\} resumo=\{extra\.redes\} \/>/)
  assert.match(ler('painel-app/src/components/vistas/Redes.jsx'), /const ver = pode\('redes\.ver'\)[\s\S]*if \(!ver\) return null/)
  // A função Social media (sem dado.ler) segue com o resumo que lê sozinho.
  assert.match(ler('painel-app/src/components/Modulos.jsx'), /: <ResumoRedes navegar=\{props\.navegar\} pode=\{props\.pode\} \/>/)
  // Só leitura: nenhum controle de escrita nem caixa nativa.
  nao(mc, /window\.(confirm|prompt|alert)\(|setInterval|className="ui-chip"/)
  // Pedidos: o cartão só conta o que a tela de pedidos mostra e já foi publicado (não arquivado).
  tem(mc, /s\.publicada_em && !s\.arquivada/)
})

test('o estilo da Visão geral usa só tokens do painel: sem cor, raio, fonte ou caixa-alta literal', () => {
  const css = ler('painel-app/src/styles/mesa-org.css')
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(semComentarios, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'cor literal')
  assert.doesNotMatch(semComentarios, /text-transform|!important|@import/)
  assert.doesNotMatch(semComentarios, /font-family|border-radius|box-shadow|background\s*:/, 'raio, sombra, fundo e fonte vêm do painel.css')
  for (const seletor of semComentarios.match(/[^{}]+(?=\{)/g).map((s) => s.trim()).filter((s) => !s.startsWith('@')))
    for (const parte of seletor.split(',')) assert.match(parte.trim(), /\.ms-/, 'seletor fora do prefixo ms-: ' + parte.trim())
  tem(ler('painel-app/src/components/vistas/Mesa.jsx'), /import '\.\.\/\.\.\/styles\/mesa-org\.css'/)
})

test('cartão de temas × aba Temas: o número do cartão é o da lista que a aba abre por padrão', () => {
  const edicao = readFileSync(new URL('../painel-app/src/components/vistas/Edicao.jsx', import.meta.url), 'utf8')
  const aba = edicao.slice(edicao.indexOf('function AbaTemas'), edicao.indexOf('/* ── Vendas'))
  assert.match(aba, /temas\.filter\(\(t\) => t\.status === 'proposto'\)\.length/, 'a aba conta as mesmas propostas pendentes do cartão')
  assert.match(aba, /ver \|\| \(aguardando \? 'pendentes' : 'todos'\)/, 'com pendência, a aba abre nas pendentes')
  assert.match(aba, /Esperando decisão \(' \+ aguardando/, 'o filtro mostra o número')
  assert.match(aba, /g\.itens\.some\(aparece\)/, 'o grupo só entra se tem uma proposta que o filtro mostra')
  assert.match(aba, /g\.itens\.filter\(\(t\) => aparece\(t\) \|\| \(g\.aprovado && t\.id === g\.aprovado\.id\)\)/, 'a lista respeita o filtro, mas a marca com tema já aprovado fica à vista no grupo')
})

test('aba Temas: grupo com tema já aprovado + proposta de outra marca não esconde a aprovada nem a conta como "pediu"', () => {
  const edicao = readFileSync(new URL('../painel-app/src/components/vistas/Edicao.jsx', import.meta.url), 'utf8')
  const aba = edicao.slice(edicao.indexOf('function AbaTemas'), edicao.indexOf('/* ── Vendas'))
  // A nota do grupo vem de UMA função; a frase de conflito só é dita sem aprovada e conta o que pediu (nada aprovado).
  assert.match(aba, /nota=\{notaDoGrupo\(g\)\}/)
  assert.doesNotMatch(aba, /nota=\{g\.conflito \?/, 'a nota antiga contava a aprovada entre as marcas que "pediram"')
  const nota = /const notaDoGrupo = \(g\) => \{([\s\S]*?)\n  \}\n/.exec(aba)
  assert.ok(nota, 'notaDoGrupo mudou de forma')
  const notaDoGrupo = new Function('rotulo', 'g', nota[1])
  const rotulo = (tipo, st) => ({ aprovado: 'Aprovado', proposto: 'Aguardando decisão' }[st])
  const A = { id: 'a', marca: 'Pão Real', status: 'aprovado', prioridade: 1 }
  const B = { id: 'b', marca: 'Café Lua', status: 'proposto', prioridade: 2 }
  const C = { id: 'c', marca: 'Doce Sol', status: 'proposto', prioridade: 3 }
  const grupo = (itens) => ({ itens, conflito: itens.length > 1, aprovado: itens.find((t) => t.status === 'aprovado') || null })
  const dis = (g) => notaDoGrupo(rotulo, g)
  assert.equal(dis(grupo([A, B])), 'Já aprovado para Pão Real: a outra marca precisa trocar de tema')
  assert.equal(dis(grupo([A, B, C])), 'Já aprovado para Pão Real: as outras marcas precisam trocar de tema')
  assert.equal(dis(grupo([B, C])), 'Conflito: 2 marcas pediram este tema', 'sem aprovada: as duas pediram')
  assert.equal(dis(grupo([A])), 'Aprovado', 'só a aprovada: nada esperando')
  assert.equal(dis(grupo([B])), 'Aguardando decisão')
  assert.doesNotMatch(dis(grupo([A, B, C])), /pediram/, 'a aprovada não entra na conta de quem pediu')
})

test('texto que descreve o cartão não promete "o mesmo número" onde a lista mostra mais (pedidos: soma × linhas do Quem falta)', () => {
  const passo = TOUR.organizacao.find((e) => e.id === 'visao')
  assert.doesNotMatch(passo.texto, /mesmo número/)
  assert.match(passo.texto, /o número soma as respostas que faltam e a lista mostra também quem já respondeu/)
  const mesa = ler('painel-app/src/components/vistas/Mesa.jsx')
  assert.match(mesa, /nota="Cada cartão abre a lista do que ele conta\./)
  assert.doesNotMatch(mesa, /Cada número abre a lista que ele conta/)
  // O comentário da lib diz o que a folha realmente lista (todas as marcas do pedido, quem falta primeiro).
  const lib = ler('painel-app/src/lib/visaoGeral.js')
  assert.doesNotMatch(lib, /que tem exatamente N linhas/)
  assert.match(lib, /lista TODAS as marcas do\s*\n? \* pedido/)
  // E é verdade: a RPC da folha não filtra por estado e ordena por estado (pendente < respondido).
  const sql = ler('supabase/migrations/20260928_painel_mensagens_avisos_autoria.sql')
  const rpc = sql.slice(sql.indexOf('create function public.get_pendentes_solicitacao'))
  const corpo = rpc.slice(0, rpc.indexOf('$$;', rpc.indexOf('as $$')))
  assert.match(corpo, /order by e\.estado, p\.nome_marca/)
  assert.doesNotMatch(corpo.slice(corpo.indexOf('where')), /e\.estado\s*(=|<>|!=|\bin\b)/, 'a RPC não filtra por estado: devolve respondidas também')
})

test('busca de Marcas ignora acento, espaço e a formatação do telefone', () => {
  const filtrar = filtroRealDeMarcas()
  const lista = [
    { id: 'a', nome_marca: 'Padaria São José', telefone: '(84) 99999-1234', participacao_id: 'pa' },
    { id: 'b', nome_marca: 'Doce Lar', telefone: '(84) 98888-0000', participacao_id: 'pb' },
  ]
  assert.deepEqual(filtrar(lista, [], { busca: 'padaria sao jose' }).map((p) => p.id), ['a'])
  assert.deepEqual(filtrar(lista, [], { busca: '8499999' }).map((p) => p.id), ['a'])
  assert.deepEqual(filtrar(lista, [], { busca: 'doce' }).map((p) => p.id), ['b'])
})
