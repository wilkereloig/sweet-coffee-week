import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  camposObrigatorios, progressoCampos, resumoMarca, nivelDoAviso, interpretarLinkMarca, fotosDaParticipacao,
  vistaDoBloco, linkDoCampo, vistaDoPedido,
} from '../painel-app/src/lib/guia.js'

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

test('17 campos obrigatórios, a mesma conta do banco (campos_cadastro, com a logo)', () => {
  const lista = camposObrigatorios({ marca: {}, tema: {}, itens: [], unidades: [], precoStr: '' })
  assert.equal(lista.length, 17)
  assert.ok(lista.some((c) => c.campo === 'logo' && c.bloco === 0), 'a logo é campo do bloco 0')
  assert.equal(lista.filter((c) => c.ok).length, 0)
  // Sem item criado não há campo para abrir.
  assert.equal(lista.filter((c) => c.bloco === 2 && c.campo === null).length, 9)
})

test('progresso é campo preenchido ÷ obrigatório, nada inventado', () => {
  const r = resumoMarca(base)
  assert.deepEqual(r.progresso, { feitos: 16, total: 17, pct: 94 })
  assert.deepEqual(progressoCampos({ marca: {}, tema: {}, itens: [], unidades: [] }), { feitos: 0, total: 17, pct: 0 })
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

test('tudo preenchido e não enviado: a próxima ação é enviar para análise', () => {
  const cheio = { ...base, itens: itens.map((i) => ({ ...i, descricao: 'd' })) }
  const r = resumoMarca(cheio)
  assert.equal(r.progresso.pct, 100)
  assert.equal(r.proxima.tipo, 'enviar')
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
