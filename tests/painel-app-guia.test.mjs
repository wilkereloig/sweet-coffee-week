import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  camposObrigatorios, progressoCampos, resumoMarca, nivelDoAviso, interpretarLinkMarca, fotosDaParticipacao,
  vistaDoBloco, linkDoCampo, vistaDoPedido, blocoDoCampo, CAMPOS_APONTAVEIS,
} from '../painel-app/src/lib/guia.js'
import { readFileSync } from 'node:fs'

const itens = [
  { posicao: 1, tipo: 'doce', nome: 'Bolo', descricao: 'd', ingredientes: 'i' },
  { posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: '', ingredientes: 'i' },
  { posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'd', ingredientes: 'i' },
]
const base = {
  participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
  participacao: { id: 'pa', logo_id: 'l1', tema_combo: 'Moana', tema_justificativa: 'x', combo_preco: 39.9, combo_status: 'rascunho', status_cadastro: 'em_preenchimento' },
  itens,
  unidades: [{ endereco: 'Rua A' }],
}

test('13 campos fixos + os custos que se aplicam — a mesma conta do banco (campos_cadastro)', () => {
  const lista = camposObrigatorios({ marca: {}, tema: {}, itens: [], unidades: [] })
  assert.equal(lista.length, 13)
  assert.ok(!lista.some((c) => c.campo === 'combo_preco'), 'o valor do combo é da organização')
  const comCustos = camposObrigatorios({ marca: {}, tema: {}, itens: [], unidades: [], custos: { viagem: true, delivery: true } })
  assert.equal(comCustos.length, 15)
  assert.ok(lista.some((c) => c.campo === 'logo' && c.bloco === 0), 'a logo é campo do bloco 0')
  assert.equal(lista.filter((c) => c.ok).length, 0)
  // Sem item criado não há campo para abrir.
  assert.equal(lista.filter((c) => c.bloco === 2 && c.campo === null).length, 6)
})

test('progresso é campo preenchido ÷ obrigatório, nada inventado', () => {
  const r = resumoMarca(base)
  assert.deepEqual(r.progresso, { feitos: 12, total: 13, pct: 92 })
  assert.deepEqual(progressoCampos({ marca: {}, tema: {}, itens: [], unidades: [] }), { feitos: 0, total: 13, pct: 0 })
})

test('pendência de campo leva ao campo exato, na aba certa', () => {
  const r = resumoMarca(base)
  const p = r.pendencias.find((x) => x.tipo === 'campo')
  assert.equal(p.link, 'combo/2/item-2-descricao')
  assert.equal(p.titulo, 'Descrição do salgado')
  assert.equal(r.contagem.combo, 1)
  assert.equal(r.contagem.cadastro, 0)
  assert.equal(r.proxima.link, 'combo/2/item-2-descricao')
})

test('correção vem antes de tudo, com o motivo, e marca o campo', () => {
  const r = resumoMarca({ ...base, correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'Número errado' }] })
  assert.equal(r.pendencias[0].tipo, 'correcao')
  assert.equal(r.pendencias[0].texto, 'Número errado')
  assert.equal(r.pendencias[0].link, 'cadastro/0/telefone')
  assert.deepEqual(r.campo('telefone'), { estado: 'alteracao', comentario: 'Número errado' })
  assert.equal(r.etapas.find((e) => e.chave === 'estabelecimento').estado, 'atencao')
})

test('pedido importante sobe; pedido conta na aba do bloco; respondido some', () => {
  const r = resumoMarca({ ...base, pedidos: [
    { id: 'p1', titulo: 'Mande a logo', bloco: 'arquivo', prioridade: 'normal', estado: 'pendente' },
    { id: 'p2', titulo: 'Confirme o preço', bloco: 'combo', prioridade: 'importante', estado: 'pendente' },
    { id: 'p3', titulo: 'Velho', bloco: 'livre', estado: 'respondido' },
  ] })
  assert.equal(r.pendencias[0].link, 'pedidos/p2')
  assert.equal(r.contagem.arquivos, 1)
  assert.equal(r.contagem.combo, 2)
  assert.ok(!r.pendencias.some((p) => p.link === 'pedidos/p3'))
})

test('tudo preenchido: não há "enviar" (a marca só salva) e nada fica pendente', () => {
  const cheio = { ...base, itens: itens.map((i) => ({ ...i, descricao: 'd' })) }
  const r = resumoMarca(cheio)
  assert.equal(r.progresso.pct, 100)
  assert.equal(r.proxima, null)
  assert.equal(r.pendencias.length, 0)
  const aprovado = resumoMarca({ ...cheio, participacao: { ...cheio.participacao, combo_status: 'aprovado', status_cadastro: 'cadastro_completo' } })
  assert.equal(aprovado.pendencias.length, 0)
  assert.deepEqual(aprovado.campo('nome_marca'), { estado: 'aprovado' })
  assert.equal(aprovado.etapas.find((e) => e.chave === 'analise').estado, 'feito')
})

test('sem participação aberta: resumo vazio, sem quebrar', () => {
  const r = resumoMarca({ participante: {} })
  assert.equal(r.semParticipacao, true)
  assert.equal(r.campo('x'), null)
})

test('nível do aviso por tipo, com os avisos antigos de combo e tema lidos pelo título', () => {
  assert.equal(nivelDoAviso({ tipo: 'correcao' }), 'alteracao')
  assert.equal(nivelDoAviso({ tipo: 'arquivo' }), 'arquivo')
  assert.equal(nivelDoAviso({ tipo: 'pedido' }), 'pendencia')
  assert.equal(nivelDoAviso({ tipo: 'combo', titulo: 'Combo aprovado' }), 'aprovado')
  assert.equal(nivelDoAviso({ tipo: 'combo', titulo: 'Ajuste pedido no seu combo' }), 'alteracao')
  assert.equal(nivelDoAviso({ tipo: 'tema', titulo: 'Tema aprovado' }), 'aprovado')
  assert.equal(nivelDoAviso({ tipo: 'qualquer' }), 'informacao')
})

test('links antigos da marca abrem o lugar novo', () => {
  assert.deepEqual(interpretarLinkMarca('hoje'), { vista: 'inicio' })
  assert.deepEqual(interpretarLinkMarca('cadastro/fotos'), { vista: 'fotos' })
  assert.deepEqual(interpretarLinkMarca('cadastro/2/item-1-nome'), { vista: 'combo', sub: '2', campo: 'item-1-nome' })
  assert.deepEqual(interpretarLinkMarca('cadastro/0'), { vista: 'cadastro', sub: '0' })
  assert.deepEqual(interpretarLinkMarca('combo/1/tema_combo'), { vista: 'combo', sub: '1', campo: 'tema_combo' })
  assert.deepEqual(interpretarLinkMarca('combo'), { vista: 'combo' })
  assert.deepEqual(interpretarLinkMarca('pedidos/abc'), { vista: 'pedidos', id: 'abc' })
  assert.deepEqual(interpretarLinkMarca('arquivos/x'), { vista: 'arquivos', id: 'x' })
})

test('o tipo do aviso desfaz os links genéricos "hoje" e "cadastro"', () => {
  assert.deepEqual(interpretarLinkMarca('hoje/venda'), { vista: 'inicio', id: 'venda' })
  assert.deepEqual(interpretarLinkMarca('hoje', 'venda'), { vista: 'inicio', id: 'venda' })
  assert.deepEqual(interpretarLinkMarca('hoje', 'mensagem'), { vista: 'inicio' })
  assert.deepEqual(interpretarLinkMarca('cadastro', 'prazo'), { vista: 'combo' })
  assert.deepEqual(interpretarLinkMarca('cadastro', 'combo'), { vista: 'combo' })
  assert.deepEqual(interpretarLinkMarca('cadastro', 'tema'), { vista: 'combo' })
  assert.deepEqual(interpretarLinkMarca('cadastro/0', 'prazo'), { vista: 'cadastro', sub: '0' })
})

test('fotos: só a sessão desta participação e as vagas da edição dela', () => {
  const pa = { id: 'pa-atual', edicao_codigo: '2026.2' }
  const sessoes = [
    { id: 1, status: 'realizada', participante_id: 'p', participacao_id: 'pa-2025' },
    { id: 2, status: 'agendada', participante_id: 'p', participacao_id: 'pa-atual' },
    { id: 3, status: 'aberto', participante_id: null, edicao_codigo: '2026.2' },
    { id: 4, status: 'aberto', participante_id: null, edicao_codigo: '2025' },
  ]
  const f = fotosDaParticipacao(sessoes, pa)
  assert.deepEqual(f.minhas.map((s) => s.id), [2])
  assert.deepEqual(f.vagas.map((s) => s.id), [3])
  assert.deepEqual(fotosDaParticipacao(sessoes, null), { minhas: [], vagas: [] })
  // Vaga vencida sai da lista: o banco recusa a reserva.
  const agora = new Date('2026-10-10T12:00:00Z')
  const comData = [{ id: 5, status: 'aberto', edicao_codigo: '2026.2', data_hora: '2026-10-09T12:00:00Z' },
    { id: 6, status: 'aberto', edicao_codigo: '2026.2', data_hora: '2026-10-11T12:00:00Z' }]
  assert.deepEqual(fotosDaParticipacao(comData, pa, agora).vagas.map((s) => s.id), [6])
  // A sessão realizada em 2025 não dá a etapa Fotos desta edição por feita.
  const r = resumoMarca({ ...base, sessoes: fotosDaParticipacao([sessoes[0]], pa).minhas })
  assert.equal(r.etapas.find((e) => e.chave === 'fotos').estado, 'pendente')
})

test('bloco → aba, e o link do banco (link_campo_marca) tem o mesmo formato', () => {
  assert.equal(vistaDoBloco(0), 'cadastro')
  assert.equal(vistaDoBloco('4'), 'cadastro')
  assert.equal(vistaDoBloco(3), 'combo')
  assert.equal(linkDoCampo(2, 'item-1-nome'), 'combo/2/item-1-nome')
  assert.equal(vistaDoPedido('fotos'), 'fotos')
  assert.equal(vistaDoPedido('desconhecido'), 'inicio')
})

// Camada de edição (Cartoon 2026.2): blocos 5 a 7 e os campos novos que a
// organização pode apontar numa correção.
test('blocos novos: 6 e 7 em Meu cadastro, 5 em Meu combo — a mesma regra de link_campo_marca', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261014_cartoon_03_revisao.sql', import.meta.url), 'utf8')
  const m = /when p_bloco in \(([\d, ]+)\) then 'cadastro'/.exec(sql)
  assert.ok(m, 'link_campo_marca não encontrado')
  const doCadastro = m[1].split(',').map(Number)
  for (let b = 0; b <= 7; b++) assert.equal(vistaDoBloco(b), doCadastro.includes(b) ? 'cadastro' : 'combo', 'bloco ' + b)
  assert.match(sql, /check \(bloco between 0 and 7\)/)
})

test('todo campo apontável cai num bloco de 0 a 7, e os novos no bloco certo', () => {
  for (const [campo] of CAMPOS_APONTAVEIS) {
    const b = blocoDoCampo(campo)
    assert.ok(Number.isInteger(b) && b >= 0 && b <= 7, campo + ' sem bloco')
  }
  assert.equal(blocoDoCampo('apresentacao_publica'), 0)
  assert.equal(blocoDoCampo('combo_nome'), 3)
  assert.equal(blocoDoCampo('item-2-alimentar'), 5)
  assert.equal(blocoDoCampo('item-2-trocas'), 5)
  assert.equal(blocoDoCampo('item-2-nome'), 2)
  assert.equal(blocoDoCampo('unidade-whatsapp'), 4)
  assert.equal(blocoDoCampo('atendimento-horario'), 6)
  // Horário no festival (23/10/2026): uma pergunta só, no bloco 6. O "horário da loja" saiu da lista do que a equipe pode apontar.
  const rotulos = Object.fromEntries(CAMPOS_APONTAVEIS)
  assert.equal(rotulos['atendimento-horario'], 'Atendimento · Horário no festival')
  assert.ok(!('unidade-horario-loja' in rotulos), 'a marca não responde mais o horário da loja')
  for (const r of Object.values(rotulos)) assert.doesNotMatch(r, /horário (da loja|do combo)/i)
  assert.equal(blocoDoCampo('atendimento-modos-2'), 6)
  assert.equal(new Set(CAMPOS_APONTAVEIS.map(([k]) => k)).size, CAMPOS_APONTAVEIS.length, 'campo repetido')
  assert.deepEqual(interpretarLinkMarca('cadastro/6/atendimento-modos'), { vista: 'cadastro', sub: '6', campo: 'atendimento-modos' })
  assert.deepEqual(interpretarLinkMarca('combo/5/item-1-alimentar'), { vista: 'combo', sub: '5', campo: 'item-1-alimentar' })
})
