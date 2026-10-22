import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resumoMarca } from '../painel-app/src/lib/guia.js'
import {
  nomeDaEdicao, fraseDaFase, mensagemNova, originalDaPendencia, pendenciasAbertas, planejarAgora, rotuloDoCampo, tituloDaPendencia,
  textoDoPrazo, apresentarDestaque, semAcao, quemDaEtapa, etiquetaDeQuem, linhasDeAcompanhamento, esperandoOrganizacao,
  textoProgresso, resumoDoGrupo, gruposDoInicio, resumoSolicitacoes, ordemDoInicio, vendaVisivel, dataBr, prazoDoCadastro,
} from '../painel-app/src/lib/inicioMarca.js'
import { existe } from './_icones.mjs'
import { contarVisita } from '../painel-app/src/lib/instalar.js'

/*
 * Nova ordem do Início da marca (22/10/2026): quem é o destaque, onde cada bloco entra conforme a fase da
 * edição, o que dizer sem tarefa e como escrever o progresso sem prometer mais do que os dados sabem.
 */
const itens = [
  { posicao: 1, tipo: 'doce', nome: 'Bolo', descricao: 'd' },
  { posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: 'd' },
  { posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'd' },
]
const completo = {
  participante: { nome_marca: 'Casa', responsavel: 'Ana', telefone: '(84) 99999-8888' },
  participacao: { id: 'pa', edicao_codigo: '2026.2', logo_id: 'l1', tema_combo: 'Moana', tema_justificativa: 'x', combo_status: 'rascunho', status_cadastro: 'em_preenchimento', foto_liberacao: 'liberado' },
  itens,
  unidades: [{ endereco: 'Rua A', id_publico: 'u1', participa: true }],
  agora: '2026-10-22T12:00:00Z',
}
const com = (participacao, extra = {}) => ({ ...completo, ...extra, participacao: { ...completo.participacao, ...participacao } })
const semDescricao = (n) => itens.map((i, k) => (k === n ? { ...i, descricao: '' } : i))
const pedido = (id, prazo_em, extra = {}) => ({ id, titulo: 'Pedido ' + id, bloco: 'livre', prioridade: 'normal', estado: 'pendente', prazo_em, ...extra })
const plano = (r, msgsNovas = 0, momento = 'antes') => planejarAgora({ proxima: r.proxima, pendencias: r.pendencias, msgsNovas, momento })
const mesma = (a, b) => a.tipo === b.tipo && a.link === b.link && a.titulo === b.titulo

/* ── Mensagem × ação crítica ─────────────────────────────────────────────── */

test('mensagem nova é o destaque quando NÃO há ação crítica; a pendência segue na lista', () => {
  const r = resumoMarca(com({}, { itens: semDescricao(1) }))
  assert.equal(r.proxima.critica, false)
  const p = plano(r, 2)
  assert.equal(p.tipoDestaque, 'mensagem')
  assert.equal(p.destaque.titulo, '2 mensagens novas da organização')
  assert.equal(p.mensagemAparte, null)
  // A ação que perdeu o destaque continua visível: nada some.
  const grupos = gruposDoInicio(p)
  const todos = grupos.flatMap((g) => g.itens)
  assert.ok(todos.some((x) => mesma(x, r.proxima)), 'a próxima ação foi para a lista')
})

test('com ação crítica (correção), o destaque é a correção e a mensagem aparece à parte', () => {
  const r = resumoMarca(com({}, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'Número errado' }] }))
  assert.equal(r.proxima.critica, true)
  const p = plano(r, 1)
  assert.equal(p.tipoDestaque, 'pendencia')
  assert.equal(p.destaque.tipo, 'correcao')
  assert.equal(p.mensagemAparte.titulo, '1 mensagem nova da organização')
})

test('prazo vencido ou curto também é crítico: a mensagem não toma o lugar dele', () => {
  const vencido = resumoMarca(com({}, { pedidos: [pedido('p1', '2026-10-20T12:00:00Z')] }))
  assert.equal(plano(vencido, 3).destaque.link, 'pedidos/p1')
  assert.ok(plano(vencido, 3).mensagemAparte)
  const amanha = resumoMarca(com({}, { pedidos: [pedido('p2', '2026-10-23T12:00:00Z')] }))
  assert.equal(plano(amanha, 1).destaque.link, 'pedidos/p2')
  const longe = resumoMarca(com({}, { itens: semDescricao(0), pedidos: [pedido('p3', '2026-11-30T12:00:00Z')] }))
  assert.equal(plano(longe, 1).tipoDestaque, 'mensagem', 'prazo longe não é crítico')
})

test('sem mensagem o destaque é a próxima ação; sem nada, não há destaque', () => {
  const r = resumoMarca(com({}, { itens: semDescricao(2) }))
  const p = plano(r, 0)
  assert.equal(p.tipoDestaque, 'pendencia')
  assert.ok(mesma(p.destaque, r.proxima))
  const livre = resumoMarca(com({ combo_status: 'em_analise' }))
  const q = plano(livre, 0)
  assert.equal(q.destaque, null)
  assert.equal(q.tipoDestaque, null)
  assert.equal(plano(livre, 1).tipoDestaque, 'mensagem', 'só mensagem: ela é o destaque')
  assert.equal(mensagemNova(0), null)
})

/* ── O destaque não se repete na lista ───────────────────────────────────── */

test('o destaque sai da lista: guia.js entrega a MESMA pendência (identidade por referência)', () => {
  const r = resumoMarca({
    ...com({}, { itens: [{ ...itens[0], descricao: '' }, { ...itens[1], descricao: '' }, itens[2]] }),
    arquivosParaLer: 2, fotosParaLer: 1, vagasAbertas: 2,
    pedidos: [pedido('a', null), pedido('b', null, { bloco: 'combo' })],
  })
  assert.equal(r.pendencias.find((p) => mesma(p, r.proxima)), r.proxima, 'proxima é a própria pendência da lista')
  const p = plano(r, 0)
  const grupos = gruposDoInicio(p)
  const itensDosGrupos = grupos.flatMap((g) => g.itens)
  assert.ok(!itensDosGrupos.some((x) => mesma(x, p.destaque)), 'o destaque não está em nenhum grupo')
  // Nada se perde: lista + destaque + "enviar" = todas as pendências.
  const enviar = r.pendencias.filter((x) => x.tipo === 'enviar').length
  assert.equal(itensDosGrupos.length + 1 + enviar, r.pendencias.length)
  const ids = itensDosGrupos
  assert.equal(new Set(ids).size, ids.length, 'nenhuma pendência em dois grupos')
})

test('mensagem no destaque não tira nada da lista', () => {
  const r = resumoMarca(com({}, { itens: semDescricao(0), arquivosParaLer: 1 }))
  const p = plano(r, 1)
  assert.equal(p.fora, null)
  const total = gruposDoInicio(p).flatMap((g) => g.itens).length
  assert.equal(total, r.pendencias.filter((x) => x.tipo !== 'enviar').length)
})

test('pendência sem destino (item que ainda não existe) vira "Falar com a organização" e a lista não a repete', () => {
  const r = resumoMarca(com({}, { itens: [itens[0]] }))   // faltam doce/salgado/bebida criados pela organização
  const p = plano(r, 0)
  const sem = r.pendencias.filter((x) => x.tipo === 'campo' && !x.link)
  assert.ok(sem.length > 0)
  assert.ok(p.destaque, 'não mostra "nada pendente" com isso aberto')
  const d = apresentarDestaque(p.destaque, { itens })
  assert.ok(d.titulo)
  if (!r.proxima) {
    assert.equal(p.destaque.link, 'mensagens')
    assert.equal(d.acao, 'Falar com a organização')
  }
  assert.ok(!gruposDoInicio(p).flatMap((g) => g.itens).some((x) => mesma(x, originalDaPendencia(r.pendencias, p.destaque) || {})))
})

/* ── Fase da edição ──────────────────────────────────────────────────────── */

test('ordem por fase: identificação e destaque sempre primeiro; vendas logo abaixo do destaque só DURANTE', () => {
  for (const m of ['antes', 'durante', 'depois', 'indefinido']) {
    const o = ordemDoInicio(m)
    assert.deepEqual(o.slice(0, 2), ['identificacao', 'agora'], m)
    assert.equal(new Set(o).size, o.length, 'sem bloco repetido: ' + m)
    assert.ok(o.includes('pendencias') && o.includes('acompanhamento') && o.includes('comunicacao') && o.includes('materiais'), m)
    assert.ok(o.indexOf('comunicacao') > o.indexOf('acompanhamento') && o.indexOf('acompanhamento') > o.indexOf('pendencias'), 'ordem do corpo: ' + m)
    assert.equal(o[o.length - 1], 'materiais', 'materiais e história por último: ' + m)
  }
  const durante = ordemDoInicio('durante')
  assert.equal(durante.indexOf('venda'), durante.indexOf('agora') + 1)
  assert.ok(durante.indexOf('venda') < durante.indexOf('pendencias'))
  const antes = ordemDoInicio('antes')
  assert.ok(!antes.includes('venda'), 'antes do festival não há venda a lançar')
  assert.equal(vendaVisivel('antes'), false)
  for (const m of ['durante', 'depois', 'indefinido']) assert.equal(vendaVisivel(m), true, m)
  for (const m of ['depois', 'indefinido']) {
    const o = ordemDoInicio(m)
    assert.ok(o.indexOf('venda') > o.indexOf('comunicacao'), 'a rotina diária desce: ' + m)
  }
})

test('o destaque crítico continua em cima durante o festival (a venda é um bloco ABAIXO dele)', () => {
  const r = resumoMarca(com({}, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'x' }] }))
  const p = plano(r, 0, 'durante')
  assert.equal(p.destaque.tipo, 'correcao')
  const o = ordemDoInicio('durante')
  assert.ok(o.indexOf('agora') < o.indexOf('venda'))
})

test('depois do festival não se cobra agendar fotos; sobra só o que está realmente aberto', () => {
  // Cadastro já enviado e nada mais aberto: a agenda de fotos é a única ação.
  const r = resumoMarca(com({ status_cadastro: 'cadastro_completo' }, { vagasAbertas: 3 }))
  assert.equal(r.proxima.tipo, 'fotos', 'sem outra coisa, a agenda de fotos é a próxima ação')
  assert.ok(pendenciasAbertas(r.pendencias, 'antes').some((x) => x.tipo === 'fotos'))
  assert.ok(!pendenciasAbertas(r.pendencias, 'depois').some((x) => x.tipo === 'fotos'))
  const p = plano(r, 0, 'depois')
  assert.equal(p.destaque, null, 'sem a agenda e sem outra tarefa, não sobra destaque')
  const com2 = resumoMarca(com({ status_cadastro: 'cadastro_completo' }, { vagasAbertas: 3, pedidos: [pedido('p9', null)] }))
  const q = plano(com2, 0, 'depois')
  assert.equal(q.destaque.tipo, 'pedido', 'a tarefa aberta assume o lugar da agenda')
})

test('sem tarefa: aguardando a organização (com o quê), edição encerrada ou nada pendente', () => {
  const analise = resumoMarca(com({ combo_status: 'em_analise' }))
  const esperas = esperandoOrganizacao({ resumo: analise, dados: com({ combo_status: 'em_analise' }) })
  assert.ok(esperas.includes('A análise do seu cadastro e do combo'))
  const a = semAcao({ momento: 'antes', esperas })
  assert.equal(a.tipo, 'espera')
  assert.equal(a.titulo, 'Aguardando a organização')
  assert.ok(a.itens.length >= 1)
  assert.equal(semAcao({ momento: 'depois' }).tipo, 'encerrada')
  assert.match(semAcao({ momento: 'depois' }).texto, /Obrigado/)
  assert.equal(semAcao({ momento: 'antes' }).titulo, 'Nada pendente')
  assert.match(semAcao({ momento: 'durante', vendaFeita: false }).texto, /Registre os combos vendidos hoje/)
  assert.match(semAcao({ momento: 'durante', vendaFeita: true }).texto, /já foram lançados/)
})

test('tema em análise e fotos aguardando liberação também entram em "aguardando a organização"', () => {
  const dados = com({ foto_liberacao: 'pendente' }, { tema: { status: 'proposto' }, publicacao: { estado: 'nao_publicado' } })
  const r = resumoMarca(dados)
  const e = esperandoOrganizacao({ resumo: r, dados })
  assert.ok(e.includes('A aprovação do tema escolhido'))
  assert.ok(e.includes('A liberação da sessão de fotos'))
  const aprovado = com({ combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }, { publicacao: { estado: 'nao_publicado' } })
  assert.ok(esperandoOrganizacao({ resumo: resumoMarca(aprovado), dados: aprovado }).includes('A publicação da sua página no site'))
})

/* ── Texto de progresso ──────────────────────────────────────────────────── */

test('progresso diz o alcance ("dos dados básicos") e nunca "Tudo pronto" com envio.pronto falso', () => {
  const faltando = com({}, { faltandoEdicao: ['combo_nome', 'unidade:u1:modos', 'item:2:alimentar'] })
  const r = resumoMarca(faltando)
  assert.equal(r.progresso.pct, 100)
  assert.equal(r.envio.pronto, false)
  const t = textoProgresso(r)
  assert.equal(t.dados, '100% dos dados básicos')
  assert.equal(t.envio.texto, 'Faltam 3 itens para enviar')
  assert.doesNotMatch(JSON.stringify(t), /pronto|preenchido/i)
  assert.equal(textoProgresso(resumoMarca(com({}, { faltandoEdicao: ['combo_nome'] }))).envio.texto, 'Falta 1 item para enviar')
})

test('"Tudo pronto para enviar" só com a leitura do servidor, envio.pronto e uma ação de enviar aberta', () => {
  const pronto = resumoMarca(com({}, { faltandoEdicao: [] }))
  assert.equal(pronto.envio.pronto, true)
  assert.equal(textoProgresso(pronto).envio.texto, 'Tudo pronto para enviar')
  // Sem a leitura (migration ausente) não se afirma nada sobre o envio.
  const desconhecido = resumoMarca(com({}))
  assert.equal(desconhecido.envio.conhecido, false)
  assert.equal(textoProgresso(desconhecido).envio, null)
  assert.equal(textoProgresso(desconhecido).dados, desconhecido.progresso.pct + '% dos dados básicos')
  // Já enviado: não é "pronto para enviar".
  const analise = resumoMarca(com({ combo_status: 'em_analise' }, { faltandoEdicao: [] }))
  assert.match(textoProgresso(analise).envio.texto, /analisando/)
  assert.doesNotMatch(textoProgresso(analise).envio.texto, /Tudo pronto/)
  // Aprovado: pronto só para as ALTERAÇÕES, e só se houve.
  const aprov = { combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }
  assert.match(textoProgresso(resumoMarca(com(aprov, { faltandoEdicao: [] }))).envio.texto, /sem alterações/)
  assert.equal(textoProgresso(resumoMarca(com(aprov, { faltandoEdicao: [], publicacao: { alterado_apos_aprovacao: true } }))).envio.texto, 'Tudo pronto para enviar as alterações')
  // A logo faltando não trava, mas o texto não a esconde.
  assert.match(textoProgresso(resumoMarca(com({ logo_id: null }, { faltandoEdicao: [] }))).envio.texto, /logo pode ir depois/)
})

/* ── Acompanhamento: quem age e estados distintos ────────────────────────── */

test('tema aprovado, combo aprovado e página publicada são linhas DIFERENTES, cada uma com o seu estado', () => {
  const dados = com({ combo_status: 'em_analise' }, { tema: { status: 'aprovado' }, publicacao: { estado: 'nao_publicado', alterado_apos_aprovacao: false } })
  const { organizacao } = linhasDeAcompanhamento({ resumo: resumoMarca(dados), dados })
  const por = Object.fromEntries(organizacao.map((l) => [l.chave, l]))
  assert.deepEqual(Object.keys(por), ['tema', 'analise', 'fotos', 'pagina'])
  assert.equal(por.tema.quem, 'feito')
  assert.equal(por.analise.quem, 'organizacao')
  assert.match(por.analise.detalhe, /em análise pela organização/i)
  assert.equal(por.pagina.quem, 'depois')
  assert.match(por.pagina.detalhe, /ainda não publicada/)
  const aprovado = com({ combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }, { tema: { status: 'aprovado' }, publicacao: { estado: 'publicado', versao: 2, slug: 'casa' } })
  const l2 = Object.fromEntries(linhasDeAcompanhamento({ resumo: resumoMarca(aprovado), dados: aprovado }).organizacao.map((l) => [l.chave, l]))
  assert.equal(l2.analise.quem, 'feito')
  assert.match(l2.pagina.detalhe, /publicada \(versão 2\)/)
  assert.match(l2.pagina.link, /casa$/)
})

test('"aprovado, com alterações a enviar" é vez da marca; a organização só espera o que está com ela', () => {
  const dados = com({ combo_status: 'aprovado', status_cadastro: 'cadastro_completo' }, { publicacao: { estado: 'publicado', alterado_apos_aprovacao: true } })
  const r = resumoMarca(dados)
  const an = linhasDeAcompanhamento({ resumo: r, dados }).organizacao.find((l) => l.chave === 'analise')
  assert.match(an.detalhe, /aprovado, com alterações a enviar/i)
  assert.equal(an.quem, 'marca')
  assert.equal(an.etiqueta.texto, 'Sua vez')
  assert.equal(esperandoOrganizacao({ resumo: r, dados }).includes('A análise do seu cadastro e do combo'), false)
})

test('quem age: ação da marca e espera da organização têm selos e textos diferentes', () => {
  const ctx = { envioPronto: false, fotoLiberada: true, vagasAbertas: 2 }
  assert.equal(quemDaEtapa({ chave: 'tema', estado: 'pendente' }, ctx), 'marca')
  assert.equal(quemDaEtapa({ chave: 'tema', estado: 'atencao' }, ctx), 'marca')
  assert.equal(quemDaEtapa({ chave: 'tema', estado: 'feito' }, ctx), 'feito')
  assert.equal(quemDaEtapa({ chave: 'analise', estado: 'andamento' }, ctx), 'organizacao')
  assert.equal(quemDaEtapa({ chave: 'analise', estado: 'pendente' }, ctx), 'depois')
  assert.equal(quemDaEtapa({ chave: 'analise', estado: 'pendente' }, { ...ctx, envioPronto: true }), 'marca')
  assert.equal(quemDaEtapa({ chave: 'fotos', estado: 'pendente' }, ctx), 'marca')
  assert.equal(quemDaEtapa({ chave: 'fotos', estado: 'pendente' }, { ...ctx, fotoLiberada: false }), 'organizacao')
  assert.equal(quemDaEtapa({ chave: 'fotos', estado: 'pendente' }, { ...ctx, vagasAbertas: 0 }), 'organizacao')
  assert.equal(quemDaEtapa({ chave: 'fotos', estado: 'andamento' }, ctx), 'marcado')
  assert.equal(quemDaEtapa({ chave: 'fotos', estado: 'pendente', quem: 'organizacao' }, ctx), 'organizacao', 'o que o guia declara vale')
  const m = etiquetaDeQuem('marca')
  const o = etiquetaDeQuem('organizacao')
  assert.notEqual(m.texto, o.texto)
  assert.notEqual(m.tom, o.tom)
  for (const q of ['feito', 'marca', 'organizacao', 'marcado', 'atencao', 'depois']) assert.ok(etiquetaDeQuem(q).texto, q)
})

test('as etapas do guia aparecem uma vez só: preenchimento + organização cobrem todas, com a frase do detalhe', () => {
  const dados = com({}, { itens: semDescricao(1), vagasAbertas: 2 })
  const r = resumoMarca(dados)
  const l = linhasDeAcompanhamento({ resumo: r, dados })
  const chaves = [...l.preenchimento, ...l.organizacao].map((x) => x.chave).filter((k) => r.etapas.some((e) => e.chave === k))
  assert.deepEqual([...chaves].sort(), r.etapas.map((e) => e.chave).sort())
  const itensLinha = l.preenchimento.find((x) => x.chave === 'itens')
  assert.match(itensLinha.detalhe, /^Falta 1 informação$/)
  assert.ok(l.preenchimento.every((x) => x.detalhe && !/^falta$/i.test(x.detalhe)))
})

/* ── Nomes e textos ──────────────────────────────────────────────────────── */

test('edição legível: tema (ou nome) com o código como complemento; sem nome, "Edição <código>"', () => {
  assert.equal(nomeDaEdicao({ tema: 'Cartoon', nome: 'X', codigo: '2026.2' }, '2026.2'), 'Cartoon · 2026.2')
  assert.equal(nomeDaEdicao({ nome: 'Sweet & Coffee Week 2026.2' }, '2026.2'), 'Sweet & Coffee Week 2026.2')
  assert.equal(nomeDaEdicao(null, '2026.2'), 'Edição 2026.2')
  assert.equal(nomeDaEdicao(null, null), '')
  const ed = { festival_inicio: '2026-11-05', festival_fim: '2026-11-15' }
  assert.equal(fraseDaFase(ed, 'antes'), 'O festival começa em 05/11/2026')
  assert.equal(fraseDaFase(ed, 'durante'), 'O festival está acontecendo, até 15/11/2026')
  assert.equal(fraseDaFase(ed, 'depois'), 'O festival terminou')
  assert.equal(fraseDaFase(ed, 'indefinido'), '')
})

test('correção diz QUAL item (nome do item) e o campo; unidade extra leva o número', () => {
  assert.equal(rotuloDoCampo('item-1-descricao', itens), 'Bolo · Descrição')
  assert.equal(rotuloDoCampo('item-3-nome', itens), 'Café · Nome')
  assert.equal(rotuloDoCampo('item-2-alimentar', itens), 'Coxinha · Alergênicos e características')
  assert.equal(rotuloDoCampo('item-2-nome', []), 'Item 2 · Nome')
  assert.equal(rotuloDoCampo('telefone'), 'A marca · WhatsApp')
  assert.equal(rotuloDoCampo('unidade-endereco'), 'Unidades · Endereço')
  assert.equal(rotuloDoCampo('unidade-endereco-2'), 'Unidades · Endereço (unidade 2)')
  assert.equal(rotuloDoCampo('campo-que-nao-existe'), '')
  const r = resumoMarca(com({}, { correcoes: [{ campo: 'item-1-descricao', bloco: 2, estado: 'aberta', comentario: 'Detalhe o recheio' }] }))
  const c = r.pendencias.find((p) => p.tipo === 'correcao')
  assert.equal(tituloDaPendencia(c, itens), 'Corrigir: Bolo · Descrição')
  const d = apresentarDestaque(plano(r).destaque, { itens })
  assert.equal(d.titulo, 'Corrigir: Bolo · Descrição')
  assert.equal(d.texto, 'Detalhe o recheio')
  assert.equal(d.citacao, true)
  assert.equal(d.critica, true)
  assert.match(d.rotulo, /Precisa de você/)
  // Tema recusado mantém o título próprio.
  const t = resumoMarca(com({}, { tema: { status: 'recusado', observacao: 'Já foi escolhido' } }))
  assert.equal(tituloDaPendencia(t.pendencias.find((p) => p.tipo === 'correcao'), itens), 'Escolha outro tema')
})

test('prazo do pedido vira texto claro e o destaque mostra prazo e motivo sem repetir a data', () => {
  const agora = new Date('2026-10-22T15:00:00')
  assert.equal(textoDoPrazo('2026-10-22T23:59:00', agora), 'vence hoje')
  assert.equal(textoDoPrazo('2026-10-23T23:59:00', agora), 'vence amanhã')
  assert.equal(textoDoPrazo('2026-10-25T23:59:00', agora), 'vence em 3 dias (25/10/2026)')
  assert.equal(textoDoPrazo('2026-10-20T23:59:00', agora), 'prazo vencido em 20/10/2026')
  assert.equal(textoDoPrazo('2026-12-30T23:59:00', agora), 'prazo: 30/12/2026')
  assert.equal(textoDoPrazo(null, agora), '')
  const r = resumoMarca(com({}, { pedidos: [pedido('p1', '2026-10-23T12:00:00Z')] }))
  const d = apresentarDestaque(plano(r).destaque, { itens, agora: new Date('2026-10-22T12:00:00Z') })
  assert.equal(d.prazo.texto, 'Vence amanhã')
  assert.equal(d.prazo.urgente, true)
  assert.equal(d.texto, '', 'o texto do guia só repetia a data')
  assert.ok(d.motivo)
  assert.equal(d.acao, 'Responder')
  assert.equal(apresentarDestaque(null), null)
})

test('grupos: resumo em palavras, botão principal por assunto e "Corrigir" quando há correção', () => {
  const r = resumoMarca({
    ...com({}, { itens: [{ ...itens[0], descricao: '' }, { ...itens[1], descricao: '' }, { ...itens[2], descricao: '' }], correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'x' }, { campo: 'nome_marca', bloco: 0, estado: 'aberta', comentario: 'y' }] }),
    arquivosParaLer: 2, fotosParaLer: 1, pedidos: [pedido('a', null)],
  })
  const grupos = gruposDoInicio(plano(r, 1))
  const por = Object.fromEntries(grupos.map((g) => [g.chave, g]))
  assert.equal(por.combo.resumo, 'faltam 3 informações')
  assert.equal(por.combo.botao, 'Continuar meu combo')
  assert.match(por.cadastro.resumo, /alteração pedida/)
  assert.equal(por.cadastro.botao, 'Corrigir meu cadastro')
  assert.equal(por.documentos.resumo, '2 arquivos para ler')
  assert.equal(por.fotos.resumo, '1 foto para conferir')
  // Um nome só para o que o participante lê: o mesmo "solicitação" do botão "Ver solicitações" e do resumo de Comunicação.
  assert.equal(por.solicitacoes.resumo, '1 solicitação aberta')
  assert.equal(por.solicitacoes.vista, 'pedidos')
  assert.equal(por.documentos.vista, 'arquivos')
  assert.ok(Object.values(por).every((g) => g.aVista.length <= 3 && g.aVista.length + g.recolhidas.length === g.itens.length))
  assert.equal(resumoDoGrupo({ chave: 'combo', itens: [] }), '')
  // Só os grupos que existem.
  assert.deepEqual(gruposDoInicio(plano(resumoMarca(com({ combo_status: 'em_analise' })))).map((g) => g.chave), [])
})

test('solicitações: quantas e o prazo mais próximo, em uma linha', () => {
  const agora = new Date('2026-10-22T12:00:00')
  assert.equal(resumoSolicitacoes([], agora), null)
  assert.equal(resumoSolicitacoes([{ estado: 'respondido', titulo: 'x' }], agora), null)
  const um = resumoSolicitacoes([{ estado: 'pendente', titulo: 'Fotos do cardápio', prazo_em: '2026-10-24T23:59:00' }], agora)
  assert.equal(um.titulo, '1 solicitação aberta')
  assert.match(um.prazo, /Fotos do cardápio \(vence em 2 dias/)
  assert.equal(um.urgente, true)
  const dois = resumoSolicitacoes([{ estado: 'pendente', titulo: 'A' }, { estado: 'pendente', titulo: 'B', prazo_em: '2026-12-01T12:00:00' }], agora)
  assert.equal(dois.titulo, '2 solicitações abertas')
  assert.equal(dois.urgente, false)
})

/* ── A tela (texto-fonte) ────────────────────────────────────────────────── */

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('Hoje.jsx: venda do dia mantém o id e é desenhada sob key (mover não remonta)', () => {
  const hoje = ler('painel-app/src/components/vistas-marca/Hoje.jsx')
  assert.match(hoje, /id="venda-do-dia"/)
  assert.match(hoje, /ordemDoInicio\(momento\)\.map\(\(k\) => <React\.Fragment key=\{k\}>/)
  assert.doesNotMatch(hoje, /function VendaDoDia/, 'o componente com estado mora em hoje/VendaDoDia.jsx')
  assert.match(hoje, /useSincronizar\(\['participantes', 'edicao', 'vendas'\]/)
  assert.match(hoje, /useGuarda\(\)/)
  assert.match(hoje, /inicio-marca\.css/)
  assert.doesNotMatch(hoje, /setInterval|window\.confirm/)
})

test('Arquivos.jsx: o botão confirma LEITURA (não "de acordo") e a falha de gravação não marca como lido', () => {
  const a = ler('painel-app/src/components/vistas-marca/Arquivos.jsx')
  assert.doesNotMatch(a, /estou de acordo/)
  assert.match(a, /Li e confirmo a leitura/)
  assert.match(a, /Conferi as fotos/)
  assert.match(a, /Confirme que conferiu/)
  assert.match(a, /Conferência confirmada em/)
  // `setLidos` vem depois do `await api('arquivo_leitura'…)` e dentro do mesmo `try`: se a gravação falha, cai no catch.
  const f = a.slice(a.indexOf('async function confirmarLeitura'), a.indexOf('const visiveis'))
  assert.ok(f.indexOf("await api('arquivo_leitura'") < f.indexOf('setLidos('), 'marca como lido só DEPOIS de gravar')
  assert.ok(f.indexOf('setLidos(') < f.indexOf('} catch'), 'e dentro do try')
  assert.match(f.slice(f.indexOf('} catch')), /setAviso\(/, 'falha avisa em vez de confirmar')
})

test('os ícones das peças do Início existem (mapas dinâmicos que o teste de reconstrução não enxerga)', () => {
  const pasta = 'painel-app/src/components/vistas-marca/hoje/'
  const arquivos = readdirSync(new URL('../' + pasta, import.meta.url)).filter((f) => f.endsWith('.jsx'))
  assert.ok(arquivos.length >= 8)
  let mapas = 0
  for (const f of arquivos) {
    const txt = ler(pasta + f)
    // Mapas `const ICONE… = { tipo: 'nome' }` e ternários dentro de <Icone nome={…} />.
    for (const m of txt.matchAll(/const ICONE(?:_[A-Z]+)? = \{([^}]+)\}/g)) {
      for (const v of m[1].matchAll(/:\s*'([a-z0-9/-]+)'/g)) { mapas++; assert.ok(existe(v[1]), f + ': ícone inexistente "' + v[1] + '"') }
    }
    for (const m of txt.matchAll(/Icone nome=\{[^}]*\?\s*'([a-z0-9/-]+)'\s*:\s*'([a-z0-9/-]+)'/g)) {
      mapas += 2
      assert.ok(existe(m[1]) && existe(m[2]), f + ': ícone inexistente em ' + m[0])
    }
  }
  assert.ok(mapas >= 10)
  // Os tipos de pendência que o guia produz têm ícone no mapa de Pendencias.jsx.
  const pend = ler(pasta + 'Pendencias.jsx')
  for (const t of ['correcao', 'pedido', 'campo', 'fotos', 'arquivo', 'mensagens']) assert.match(pend, new RegExp('\\b' + t + ':'), 'sem ícone para ' + t)
})

test('estilo do Início: só tokens (sem hex, raio ou fonte literal), sem caixa-alta e sem animação nova', () => {
  const css = ler('painel-app/src/styles/inicio-marca.css')
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'cor literal')
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/)
  assert.doesNotMatch(css, /@keyframes|animation\s*:|transition\s*:/)
  for (const m of css.matchAll(/border-radius:([^;}]+)/g)) {
    const v = m[1].trim()
    assert.ok(v.startsWith('var(--r-') || ['999px', '50%'].includes(v), 'raio solto: ' + v)
  }
  for (const m of css.matchAll(/font:[^;}]*?\d+(?:\.\d+)?px\/[\d.]+\s+([^;}]+)/g)) assert.match(m[1].trim(), /^var\(--f-/, 'família literal: ' + m[1])
})

/* ── Revisão independente de 22/10/2026: o que ela achou e ficou corrigido ───────────────────────────── */

const cron = (fim, chave = 'preenchimento') => [{ chave, tipo: 'prazo', fim, visivel_participante: true }]

test('o envio que perde o destaque continua à vista (enviarAparte) — correção, pedido ou mensagem na frente', () => {
  const corrigindo = resumoMarca(com({ combo_status: 'correcao_solicitada' }, { correcoes: [{ campo: 'telefone', bloco: 0, estado: 'aberta', comentario: 'x' }] }))
  const a = plano(corrigindo, 0)
  assert.equal(a.destaque.tipo, 'correcao')
  assert.equal(a.enviarAparte.tipo, 'enviar')
  const comMensagem = plano(resumoMarca(com({})), 2)
  assert.equal(comMensagem.tipoDestaque, 'mensagem')
  assert.equal(comMensagem.enviarAparte.tipo, 'enviar', 'a mensagem tomou o destaque, o envio não some')
  const soEnviar = plano(resumoMarca(com({})), 0)
  assert.equal(soEnviar.destaque.tipo, 'enviar')
  assert.equal(soEnviar.enviarAparte, null, 'quando é o destaque não se repete')
  const soLogo = plano(resumoMarca(com({ logo_id: null })), 0)
  assert.equal(soLogo.destaque.campo, 'logo')
  assert.equal(soLogo.enviarAparte.tipo, 'enviar')
})

test('prazo de preenchimento do cronograma: acompanha a ação do cadastro e a torna crítica quando está perto', () => {
  assert.equal(prazoDoCadastro([], '2026-10-22'), null)
  assert.equal(prazoDoCadastro([{ chave: 'preenchimento', tipo: 'prazo', fim: '2026-10-24', visivel_participante: false }], '2026-10-22'), null, 'o que a marca não vê não entra')
  const perto = prazoDoCadastro(cron('2026-10-24'), '2026-10-22')
  assert.equal(perto.urgente, true)
  assert.match(perto.texto, /Prazo do cadastro: vence em 2 dias \(24\/10\/2026\)/)
  assert.equal(prazoDoCadastro(cron('2026-11-20'), '2026-10-22').urgente, false)
  assert.match(prazoDoCadastro(cron('2026-10-20'), '2026-10-22').texto, /venceu em 20\/10\/2026/)
  // com o prazo em cima, o cadastro pendente é crítico: a mensagem vai para o lado e o destaque mostra o prazo
  const r = resumoMarca(com({}, { itens: semDescricao(1) }))
  const urgente = planejarAgora({ proxima: r.proxima, pendencias: r.pendencias, msgsNovas: 2, momento: 'antes', prazoCadastro: perto })
  assert.equal(urgente.tipoDestaque, 'pendencia')
  assert.ok(urgente.mensagemAparte)
  assert.equal(urgente.destaque.critica, true)
  const d = apresentarDestaque(urgente.destaque, { itens, prazoCadastro: perto })
  assert.equal(d.prazo.urgente, true)
  assert.match(d.prazo.texto, /Prazo do cadastro/)
  // longe: a mensagem continua podendo ser o destaque
  const longe = planejarAgora({ proxima: r.proxima, pendencias: r.pendencias, msgsNovas: 2, momento: 'antes', prazoCadastro: prazoDoCadastro(cron('2026-11-20'), '2026-10-22') })
  assert.equal(longe.tipoDestaque, 'mensagem')
  // pedido continua com o prazo dele (não o do cadastro)
  const ped = resumoMarca(com({}, { pedidos: [pedido('p9', '2026-10-23T12:00:00Z')] }))
  const dp = apresentarDestaque(planejarAgora({ proxima: ped.proxima, pendencias: ped.pendencias, prazoCadastro: perto }).destaque, { itens })
  assert.doesNotMatch(dp.prazo.texto, /Prazo do cadastro/)
})

test('durante o festival, venda por lançar não vira "nada a fazer"; depois, não se espera sessão de fotos', () => {
  const s = semAcao({ momento: 'durante', esperas: ['A análise do seu cadastro e do combo'], vendaFeita: false })
  assert.equal(s.titulo, 'Falta lançar os combos de hoje')
  assert.match(s.texto, /Registre os combos/)
  assert.deepEqual(s.itens, ['A análise do seu cadastro e do combo'])
  assert.equal(semAcao({ momento: 'durante', esperas: ['x'], vendaFeita: true }).tipo, 'espera')
  assert.equal(semAcao({ momento: 'durante', esperas: [], vendaFeita: false }).titulo, 'Falta lançar os combos de hoje')
  // fotos ainda não liberadas depois do festival: não é espera nenhuma
  const r = resumoMarca(com({ combo_status: 'em_analise', foto_liberacao: 'pendente' }, { faltandoEdicao: [] }))
  const dados = com({ combo_status: 'em_analise', foto_liberacao: 'pendente' }, { faltandoEdicao: [] })
  assert.ok(esperandoOrganizacao({ resumo: r, dados, momento: 'antes' }).some((x) => /sessão de fotos/.test(x)))
  assert.ok(!esperandoOrganizacao({ resumo: r, dados, momento: 'depois' }).some((x) => /fotos/.test(x)))
  assert.ok(esperandoOrganizacao({ resumo: r, dados, momento: 'depois' }).some((x) => /análise/.test(x)), 'o resto continua valendo')
})

test('data do prazo: instante gravado em UTC vira a data LOCAL; dia puro fica como veio', () => {
  assert.equal(dataBr('2026-10-24'), '24/10/2026')
  assert.equal(dataBr(''), '')
  const local = new Date(2026, 9, 24, 23, 59, 0)   // 24/10 23:59 no fuso de quem abre
  assert.equal(dataBr(local.toISOString()), '24/10/2026', 'não escorrega para o dia seguinte por causa do UTC')
  assert.match(textoDoPrazo(local.toISOString(), new Date(2026, 9, 21, 9, 0)), /\(24\/10\/2026\)/)
})

test('o que a marca preencheu NÃO sai como "Concluído": só a decisão da organização é concluída/aprovada', () => {
  const cheio = com({ combo_status: 'em_analise' }, { faltandoEdicao: [] })
  const l = linhasDeAcompanhamento({ resumo: resumoMarca(cheio), dados: cheio })
  assert.ok(l.preenchimento.length > 0)
  assert.ok(l.preenchimento.every((x) => x.etiqueta.texto !== 'Concluído'), 'preenchido ≠ aprovado')
  assert.ok(l.preenchimento.some((x) => x.etiqueta.texto === 'Preenchido'))
  assert.equal(etiquetaDeQuem('feito').texto, 'Concluído', 'o selo de concluído continua existindo para a organização')
})

test('guardas de leitura: unidades em ordem (os ids dos campos dependem da posição) e o resumo escuta a publicação', () => {
  const hook = readFileSync(new URL('../painel-app/src/components/vistas-marca/useResumoMarca.js', import.meta.url), 'utf8')
  assert.match(hook, /participacao_unidades\?select=\*&participacao_id=eq\.' \+ id \+ '&order=ordem/, 'sem order=ordem o link vai para o campo da unidade errada')
  const casca = readFileSync(new URL('../painel-app/src/components/PainelMarcaShell.jsx', import.meta.url), 'utf8')
  const dominios = /const DOMINIOS_RESUMO = \[([^\]]*)\]/.exec(casca)[1]
  for (const d of ['publicacao', 'edicao']) assert.ok(dominios.includes("'" + d + "'"), 'o resumo lê ' + d + ' e tem que reler quando ela mudar')
})

test('convite de instalar/ligar avisos: só da 2ª visita em diante (a 1ª é da primeira tarefa)', () => {
  const guarda = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) } }
  const local = guarda()
  // 1ª sessão: conta 1, e recarregar a página na mesma sessão não conta de novo
  const s1 = guarda()
  assert.equal(contarVisita('marca', 'p1', { local, sessao: s1 }), 1)
  assert.equal(contarVisita('marca', 'p1', { local, sessao: s1 }), 1)
  // outra sessão do navegador: 2ª visita
  assert.equal(contarVisita('marca', 'p1', { local, sessao: guarda() }), 2)
  // outra pessoa no mesmo aparelho começa do zero
  assert.equal(contarVisita('marca', 'p2', { local, sessao: guarda() }), 1)
  // sem armazenamento (aba privada): não esconde o convite para sempre
  assert.equal(contarVisita('marca', 'p1', { local: null, sessao: null }), 2)
  const shell = readFileSync(new URL('../painel-app/src/components/PainelMarcaShell.jsx', import.meta.url), 'utf8')
  assert.match(shell, /liberado=\{!tour\.aberto && visitas >= 2\}/, 'o shell da marca só libera o convite na 2ª visita')
})

test('botão de conversa: o nome acessível CONTÉM os dois textos visíveis (WCAG 2.5.3, comando de voz)', () => {
  const shell = readFileSync(new URL('../painel-app/src/components/PainelMarcaShell.jsx', import.meta.url), 'utf8')
  const bloco = shell.slice(shell.indexOf('data-tour="conversa"'), shell.indexOf('data-tour="conversa"') + 900)
  const nome = /aria-label=\{'([^']+)'/.exec(bloco)[1].toLowerCase()
  for (const visivel of ['falar com a organização', 'conversa']) assert.ok(nome.includes(visivel), 'o aria-label tem que conter "' + visivel + '"')
})
