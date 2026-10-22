import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { existe } from './_icones.mjs'
import { consultaDoCaminho } from '../painel-app/src/lib/marcaApi.js'
import {
  minhasSolicitacoes, descreverPrazo, situacaoDoPedido, SITUACAO, ordenarPendentes, ordenarRespondidas, resumoDaLista,
  ondeNoPainel, destinoDoPedido, lugarDoPedido,
  chaveDosRascunhos, lerRascunhos, guardarRascunhos, temRascunho, limparRascunhosPedidos, PREFIXO_RASCUNHO_PEDIDOS,
} from '../painel-app/src/lib/pedidosMarca.js'
import { resumoMarca, interpretarLinkMarca, vistaDoPedido } from '../painel-app/src/lib/guia.js'
import { resumoSolicitacoes, resumoDoGrupo, apresentarDestaque } from '../painel-app/src/lib/inicioMarca.js'
import { proximosPassos } from '../painel-app/src/lib/hoje.js'
import { repartirPedidos } from '../painel-app/src/lib/sincMarca.js'

/*
 * Tela Solicitações da marca (22/10/2026): prazo em palavras, situação, ordem, "o que é pedido", destinos e a
 * contagem do Início. Lógica pura + o que o código das telas tem que continuar garantindo.
 */
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
// 22/10/2026 às 10h, no fuso de quem roda o teste: o resultado não depende de onde ele roda.
const AGORA = new Date(2026, 9, 22, 10, 0)
const em = (d, h = 23, m = 59) => new Date(2026, 9, 22 + d, h, m).toISOString()
const ped = (id, extra = {}) => ({ id, titulo: 'Pedido ' + id, texto: 'Texto ' + id, escopo: 'marca', participacao_id: 'pa', bloco: 'livre', prioridade: 'normal', prazo_em: null, created_at: em(-30), ...extra })

// ── Prazo ────────────────────────────────────────────────────────────────────

test('prazo em palavras, com a data local: hoje, amanhã, dias, vencido, distante e sem prazo', () => {
  const p = (d) => descreverPrazo(em(d), AGORA)
  assert.equal(p(0).texto, 'vence hoje (22/10/2026)')
  assert.equal(p(1).texto, 'vence amanhã (23/10/2026)')
  assert.equal(p(5).texto, 'vence em 5 dias (27/10/2026)')
  assert.equal(p(-2).texto, 'prazo vencido em 20/10/2026')
  assert.equal(p(30).texto, 'prazo: 21/11/2026')
  assert.deepEqual(descreverPrazo(null, AGORA), { tem: false, texto: 'sem prazo definido', data: '', dias: null, vencido: false, urgente: false, tom: 'neutro' })
  assert.equal(descreverPrazo('lixo', AGORA).tem, false)
  // O selo diz a urgência: até 3 dias (ou vencido) = atenção; até 7 = andamento; depois, neutro.
  assert.deepEqual([p(-2), p(0), p(1), p(3)].map((x) => x.tom), ['atencao', 'atencao', 'atencao', 'atencao'])
  assert.deepEqual([p(4), p(7)].map((x) => x.tom), ['andamento', 'andamento'])
  assert.equal(p(8).tom, 'neutro')
  assert.equal(p(-2).vencido, true)
  assert.equal(p(1).vencido, false)
  assert.equal(p(1).urgente, true)
  assert.equal(p(10).urgente, false)
})

test('o prazo gravado às 23h59 é do dia marcado (nada de "falta 1 dia" no próprio dia)', () => {
  assert.equal(descreverPrazo(em(0, 23, 59), new Date(2026, 9, 22, 8, 0)).texto, 'vence hoje (22/10/2026)')
  assert.equal(descreverPrazo(em(1, 0, 30), new Date(2026, 9, 22, 22, 0)).texto, 'vence amanhã (23/10/2026)')
})

// ── Situação, ordem e resumo ─────────────────────────────────────────────────

test('situação: pendente, resposta em andamento (rascunho só neste aparelho) ou respondido', () => {
  assert.equal(situacaoDoPedido(undefined, undefined), 'pendente')
  assert.equal(situacaoDoPedido({ estado: 'pendente' }, { texto: '   ' }), 'pendente', 'só espaços não é resposta em andamento')
  assert.equal(situacaoDoPedido({ estado: 'pendente' }, { texto: 'começando…' }), 'andamento')
  assert.equal(situacaoDoPedido({ estado: 'respondido' }, { texto: 'complemento' }), 'respondido', 'o banco manda')
  assert.deepEqual(Object.keys(SITUACAO), ['pendente', 'andamento', 'respondido'])
  for (const s of Object.values(SITUACAO)) assert.ok(s.texto && ['atencao', 'andamento', 'ok'].includes(s.tom))
})

test('para responder: importantes e prazo curto/vencido primeiro; depois por prazo; sem prazo por último', () => {
  const lista = [
    ped('longe', { prazo_em: em(20) }),
    ped('sem', { created_at: em(-1) }),
    ped('sem-velho', { created_at: em(-10) }),
    ped('amanha', { prazo_em: em(1) }),
    ped('importante-sem-prazo', { prioridade: 'importante' }),
    ped('vencido', { prazo_em: em(-3) }),
    ped('semana', { prazo_em: em(6) }),
    ped('importante-longe', { prioridade: 'importante', prazo_em: em(15) }),
  ]
  assert.deepEqual(ordenarPendentes(lista, AGORA).map((s) => s.id),
    ['vencido', 'amanha', 'importante-longe', 'importante-sem-prazo', 'semana', 'longe', 'sem', 'sem-velho'])
  assert.deepEqual(ordenarPendentes(null, AGORA), [])
  assert.equal(lista[0].id, 'longe', 'não reordena a lista de quem chamou')
})

test('respondidas: a resposta mais recente primeiro', () => {
  const lista = [ped('a', { created_at: em(-9) }), ped('b'), ped('c')]
  const estados = { a: { respondido_em: em(-1) }, b: { respondido_em: em(-5) }, c: { respondido_em: null } }
  assert.deepEqual(ordenarRespondidas(lista, estados).map((s) => s.id), ['a', 'b', 'c'], 'sem data de resposta vale a de criação')
})

test('resumo: o mesmo do Início, e nada quando não há solicitação aberta', () => {
  const minhas = [ped('a', { prazo_em: em(1) }), ped('b', { prazo_em: em(20) }), ped('c')]
  const estados = { c: { estado: 'respondido' } }
  const r = resumoDaLista(minhas, estados, AGORA)
  assert.equal(r.total, 2)
  assert.equal(r.titulo, '2 solicitações abertas')
  assert.equal(r.urgente, true)
  assert.match(r.prazo, /a mais próxima: Pedido a \(vence amanhã\)/)
  assert.deepEqual(r, resumoSolicitacoes([{ ...minhas[0], estado: 'pendente' }, { ...minhas[1], estado: 'pendente' }, { ...minhas[2], estado: 'respondido' }], AGORA))
  assert.equal(resumoDaLista(minhas, { a: { estado: 'respondido' }, b: { estado: 'respondido' }, c: { estado: 'respondido' } }, AGORA), null)
  assert.equal(resumoDaLista([], {}, AGORA), null)
})

// ── O que é pedido ───────────────────────────────────────────────────────────

test('onde o pedido mexe no painel, em português (nunca código)', () => {
  const itens = [{ posicao: 1, nome: 'Bolo' }, { posicao: 2, nome: 'Coxinha' }]
  assert.equal(ondeNoPainel({ campo: 'item-2-descricao', bloco: 'item_salgado' }, itens), 'Meu combo › Coxinha · Descrição')
  assert.equal(ondeNoPainel({ campo: 'item-3-nome', bloco: 'item_bebida' }, itens), 'Meu combo › Item 3 · Nome', 'item sem nome conhecido cai no genérico')
  assert.equal(ondeNoPainel({ campo: 'telefone', bloco: 'estabelecimento' }, []), 'Meu cadastro › A marca · WhatsApp')
  assert.equal(ondeNoPainel({ campo: 'unidade-endereco-2' }, []), 'Meu cadastro › Unidades · Endereço (unidade 2)')
  assert.equal(ondeNoPainel({ campo: 'combo_condicoes' }, []), 'Meu combo › Combo · Condições')
  assert.equal(ondeNoPainel({ campo: 'campo_que_nao_existe', bloco: 'fotos' }, []), 'Fotos', 'campo desconhecido cai na área')
  for (const [bloco, texto] of Object.entries({ estabelecimento: 'Meu cadastro (dados da marca)', combo: 'Meu combo', item_doce: 'Meu combo (o doce)', item_salgado: 'Meu combo (o salgado)', item_bebida: 'Meu combo (a bebida)', fotos: 'Fotos', arquivo: 'Arquivos' })) {
    assert.equal(ondeNoPainel({ bloco }, []), texto)
  }
  assert.equal(ondeNoPainel({ bloco: 'livre' }, []), '', 'pedido geral não aponta lugar nenhum')
  assert.equal(ondeNoPainel({}, []), '')
  for (const bloco of ['estabelecimento', 'combo', 'item_doce', 'item_salgado', 'item_bebida', 'fotos', 'arquivo']) assert.doesNotMatch(ondeNoPainel({ bloco }, []), /_|item_/)
})

test('o botão leva ao campo ou à área, e todo destino é um link que o painel entende', () => {
  const campo = destinoDoPedido({ campo: 'item-1-nome', bloco: 'item_doce' })
  assert.deepEqual(campo, { link: 'combo/2/item-1-nome', rotulo: 'Ir para o campo' })
  assert.deepEqual(interpretarLinkMarca(campo.link), { vista: 'combo', sub: '2', campo: 'item-1-nome' })
  assert.deepEqual(interpretarLinkMarca(destinoDoPedido({ campo: 'telefone' }).link), { vista: 'cadastro', sub: '0', campo: 'telefone' })
  const areas = { estabelecimento: ['cadastro', 'Abrir Meu cadastro'], combo: ['combo', 'Abrir Meu combo'], item_doce: ['combo', 'Abrir Meu combo'], fotos: ['fotos', 'Abrir Fotos'], arquivo: ['arquivos', 'Abrir Arquivos'] }
  for (const [bloco, [vista, rotulo]] of Object.entries(areas)) {
    const d = destinoDoPedido({ bloco })
    assert.deepEqual([d.link, d.rotulo], [vista, rotulo], bloco)
    assert.equal(d.link, vistaDoPedido(bloco), 'a mesma vista que o Início usa para contar o pedido')
    assert.equal(interpretarLinkMarca(d.link).vista, vista)
  }
  assert.equal(destinoDoPedido({ bloco: 'livre' }), null)
  assert.equal(destinoDoPedido({ bloco: 'livre', campo: 'campo_que_nao_existe' }), null)
  assert.equal(destinoDoPedido({ campo: 'campo_que_nao_existe', bloco: 'fotos' }).link, 'fotos')
})

// ── Links e contador (bate com o Início) ─────────────────────────────────────

test('os links `pedidos` e `pedidos/<id>` continuam abrindo esta tela, e o pedido certo', () => {
  assert.deepEqual(interpretarLinkMarca('pedidos'), { vista: 'pedidos' })
  assert.deepEqual(interpretarLinkMarca('pedidos/abc'), { vista: 'pedidos', id: 'abc' })
  assert.equal(lugarDoPedido('a', [ped('a')], [ped('b')]), 'pendente')
  assert.equal(lugarDoPedido('b', [ped('a')], [ped('b')]), 'respondido', 'respondido abre a gaveta')
  assert.equal(lugarDoPedido('z', [ped('a')], [ped('b')]), 'ausente')
  assert.equal(lugarDoPedido('z', null, null), 'ausente')
})

test('"Para responder (N)" é o número de solicitações abertas que o Início conta', () => {
  const participacao = { id: 'pa', edicao_codigo: '2026.2', combo_status: 'rascunho', status_cadastro: 'em_preenchimento' }
  const lista = [
    ped('a', { prazo_em: em(1) }), ped('b', { prioridade: 'importante' }), ped('c', { bloco: 'combo' }), ped('d'),
    ped('geral', { escopo: 'geral', participacao_id: null, edicao_codigo: '2026.2' }),
    ped('outra-edicao', { escopo: 'geral', participacao_id: null, edicao_codigo: '2025.1' }),
    ped('outra-marca', { participacao_id: 'pa-antiga' }),
  ]
  const minhas = minhasSolicitacoes(lista, participacao)
  assert.deepEqual(minhas.map((s) => s.id), ['a', 'b', 'c', 'd', 'geral'])
  const estados = { d: { estado: 'respondido' }, b: { estado: 'pendente' } }
  const { pendentes, feitos } = repartirPedidos(minhas, estados, {})
  // O Início monta `pedidos` do mesmo jeito (useResumoMarca) e o resumo gera uma pendência por solicitação aberta.
  const pedidosDoInicio = minhas.map((s) => ({ ...s, estado: (estados[s.id] && estados[s.id].estado) || 'pendente' }))
  const r = resumoMarca({ participacao, pedidos: pedidosDoInicio, agora: AGORA })
  const doInicio = r.pendencias.filter((p) => p.tipo === 'pedido')
  assert.equal(pendentes.length, doInicio.length)
  assert.deepEqual(pendentes.map((s) => 'pedidos/' + s.id).sort(), doInicio.map((p) => p.link).sort())
  assert.equal(feitos.length, 1)
  assert.equal(resumoDaLista(minhas, estados, AGORA).total, doInicio.length)
  // Resposta começada e ainda não enviada NÃO tira a solicitação da conta (continua aberta).
  assert.equal(repartirPedidos(minhas, estados, { a: { texto: 'escrevendo', visto: { respondido: false } } }).pendentes.length, doInicio.length)
})

// ── O que o código das telas tem que continuar garantindo ────────────────────

const PEDIDOS = ler('painel-app/src/components/vistas-marca/Pedidos.jsx')
const LINHA = ler('painel-app/src/components/vistas-marca/pedidos/PedidoLinha.jsx')
const CSS = ler('painel-app/src/styles/pedidos-marca.css')

test('a assinatura de Pedidos não mudou e a tela continua achando o pedido por `alvo`', () => {
  assert.match(PEDIDOS, /export function Pedidos\(\{ alvo, consumirAlvo, abrirLink, recarregarResumo \}\)/)
  // Espera a lista chegar antes de decidir: link recém-aberto não pode acusar "não encontrei".
  const f = PEDIDOS.slice(PEDIDOS.indexOf('if (!alvo || !alvo.id'), PEDIDOS.indexOf('function digitar'))
  assert.match(f, /carregando \|\| erro\) return/)
  assert.match(f, /lugarDoPedido\(alvo\.id, pendentes, feitos\)/)
  assert.match(f, /if \(lugar === 'respondido'\) setRespAberta\(true\)/)
  assert.match(f, /Não encontrei essa solicitação/)
  assert.match(f, /if \(consumirAlvo\) consumirAlvo\(\)/)
})

test('responder grava pelo mesmo RPC e só depois de gravar a tela dá a solicitação por respondida', () => {
  const f = LINHA.slice(LINHA.indexOf('async function responder'), LINHA.indexOf('const rotuloAcao'))
  assert.match(f, /await api\('rpc\/marca_responder_solicitacao', \{ metodo: 'POST', corpo: \{ p_solicitacao: s\.id, p_resposta: texto\.trim\(\) \} \}\)/)
  assert.ok(f.indexOf("await api('rpc/marca_responder_solicitacao'") < f.indexOf("aoDigitar('')"), 'só limpa o campo depois de gravar')
  assert.ok(f.indexOf("aoDigitar('')") < f.indexOf('await onRespondido'), 'e só então relê')
  assert.ok(f.indexOf('await onRespondido') < f.indexOf('} catch'))
  const catchBloco = f.slice(f.indexOf('} catch'))
  assert.match(catchBloco, /setErro\(traduzirErro\(e\.message\) \+ ' O texto continua no campo\.'\)/)
  assert.doesNotMatch(catchBloco, /aoDigitar|onRespondido/, 'a falha nunca limpa o campo nem dá por respondido')
  // Nenhuma tela marca "respondido" por conta própria: o estado vem do banco, na releitura.
  assert.doesNotMatch(PEDIDOS + LINHA, /setEstados\(\(?[a-z]*\)? ?=>|estado: 'respondido'|respondido_em: new Date/)
  // A releitura que falha depois de gravar não vira "não deu para enviar": a resposta JÁ foi gravada; a tela só avisa que a lista não atualizou.
  assert.match(PEDIDOS, /await carregar\(\)\.catch\(\(\) => \{ atualizou = false \}\)/)
  assert.match(PEDIDOS, /A lista não atualizou agora/)
  assert.match(LINHA, /Enviar resposta/)
  assert.match(LINHA, /Enviar complemento/)
})

test('a tela só lê as tabelas que já lia e o único RPC é o de responder', () => {
  const tela = PEDIDOS + LINHA
  const tabelas = new Set([...tela.matchAll(/api\(\s*'([a-z_]+)[?']/g)].map((m) => m[1]))
  assert.deepEqual([...tabelas].sort(), ['participacoes', 'participantes_itens', 'solicitacao_estado', 'solicitacoes'])
  assert.deepEqual([...tela.matchAll(/rpc\/([a-z_]+)/g)].map((m) => m[1]), ['marca_responder_solicitacao'])
  assert.deepEqual([...tela.matchAll(/metodo: '([A-Z]+)'/g)].map((m) => m[1]), ['POST'])
  assert.doesNotMatch(tela, /window\.(confirm|prompt|alert)\(|setInterval/)
  // O rótulo dos campos é só enfeite: a leitura dos nomes dos itens falhar não derruba a lista.
  assert.match(PEDIDOS, /participantes_itens\?select=posicao,nome&participacao_id=eq\.' \+ pa\.id\)\.catch\(\(\) => null\)/)
  // Releitura que falha mantém a lista e rejeita (o indicador mostra a falha); o erro em tela só aparece sem dado.
  assert.match(PEDIDOS, /if \(!temDados\.current\) setErro\(e\.message\)\s*throw e/)
})

test('o rascunho de resposta continua sobrevivendo à releitura (repartirPedidos, avisos de mudança, pedido retirado)', () => {
  for (const nome of ['repartirPedidos', 'rascunhosSemPedido', 'mudancaDoPedido', 'textoDaMudanca', 'fotoDoPedido']) assert.ok(PEDIDOS.includes(nome), nome)
  assert.match(PEDIDOS, /useSincronizar\(\['pedidos', 'participantes'\], carregar\)/)
  assert.match(PEDIDOS, /Descartar/)
  assert.match(LINHA, /aviso && <p className="ui-nota ui-nota--erro" role="status">/)
})

test('a linha mostra título, o que é pedido, prazo, situação e UMA ação; respondidas ficam recolhidas', () => {
  for (const t of ['O que é pedido', 'Onde:', 'Responder', 'Continuar resposta', 'Ver resposta', 'Importante']) assert.ok(LINHA.includes(t), t)
  assert.match(LINHA, /<Selo tom=\{sit\.tom\}>\{sit\.texto\}<\/Selo>/)
  assert.match(LINHA, /descreverPrazo\(s\.prazo_em, agora\)/)
  assert.match(PEDIDOS, /Respondidas \(\{respondidas\.length\}\)/)
  assert.match(PEDIDOS, /Para responder \(' \+ paraResponder\.length/)
  assert.match(PEDIDOS, /<details open=\{respAberta\}/)
  assert.match(PEDIDOS, /titulo="Solicitações"/)
  assert.match(PEDIDOS, /ordenarPendentes\(pendentes, agora\)/)
})

test('ícones, botões e estilos seguem as regras do painel', () => {
  const nomes = [...(PEDIDOS + LINHA).matchAll(/(?:nome|icone)="([a-z0-9/-]+)"/g)].map((m) => m[1])
  const ternarios = [...(PEDIDOS + LINHA).matchAll(/nome=\{[^}]*?'([a-z-]+)' : '([a-z-]+)'\}/g)].flatMap((m) => [m[1], m[2]])
  const icone = [...LINHA.matchAll(/const iconeAcao = aberto \? '([a-z-]+)' : feito \? '([a-z-]+)' : '([a-z-]+)'/g)].flatMap((m) => m.slice(1))
  assert.ok(nomes.length >= 6 && ternarios.length >= 4 && icone.length === 3, JSON.stringify({ nomes, ternarios, icone }))
  for (const n of [...nomes, ...ternarios, ...icone]) assert.ok(existe(n), 'ícone inexistente: ' + n)
  // Alvo de toque ≥ 44px: todo botão é og-btn--mini ou o botão do formulário (.acao, 46px).
  const botoes = [...LINHA.matchAll(/<button\b[^>]*className=\{?['"]([^'"]*)['"]/g)].map((m) => m[1])
  assert.ok(botoes.length >= 3)
  for (const c of botoes) assert.match(c, /og-btn--mini|^acao$/)
  assert.doesNotMatch(PEDIDOS + LINHA, /className="og-selo"/)
  for (const m of CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{[^{}]*\}/g)) assert.match(m[1], /\.pm-/, 'seletor fora do prefixo pm-: ' + m[1].trim())
  assert.doesNotMatch(CSS.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(|text-transform|box-shadow:|font-family:/)
  for (const m of CSS.matchAll(/border-radius:([^;}]+)/g)) assert.match(m[1].trim(), /^(var\(--r-\d\)|999px)$/)
  for (const m of CSS.matchAll(/font:([^;}]+)/g)) assert.match(m[1], /var\(--f-(ui|texto|titulo)\)/, 'fonte literal: ' + m[1])
})

test('toda leitura da tela cabe no "Ver como participante": consulta válida, tabela da lista fechada do banco', () => {
  const sql = ler('supabase/migrations/20261104_ver_como_participante.sql')
  const tabelas = [...sql.match(/tabelas constant text\[\] := array\[([^\]]*)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  assert.ok(tabelas.length > 10)
  const caminhos = [...(PEDIDOS + LINHA).matchAll(/api\(\s*'([^']+)'/g)].map((m) => m[1]).filter((c) => !c.startsWith('rpc/'))
  assert.ok(caminhos.length >= 3, 'achou as leituras da tela')
  for (const c of caminhos) {
    const q = consultaDoCaminho(c)
    assert.ok(tabelas.includes(q.tabela), 'tabela fora da lista do "Ver como": ' + q.tabela)
  }
})

// ── Resposta começada sobrevive a sair da tela (achado #7 da revisão de 22/10/2026) ──────────────────────────

/** sessionStorage de mentira: guarda em memória e deixa `Object.keys(st)` listar as chaves, como o de verdade. */
function armazemFalso(inicial = {}) {
  const dados = { ...inicial }
  return new Proxy({}, {
    get: (_, k) => ({
      getItem: (c) => (c in dados ? dados[c] : null),
      setItem: (c, v) => { dados[c] = String(v) },
      removeItem: (c) => { delete dados[c] },
    }[k]),
    ownKeys: () => Object.keys(dados),
    getOwnPropertyDescriptor: (_, k) => (k in dados ? { value: dados[k], enumerable: true, configurable: true } : undefined),
  })
}

test('rascunho de resposta: guarda por participação, devolve o que tem texto e some quando o campo esvazia', () => {
  const st = armazemFalso()
  const chave = chaveDosRascunhos('pa-1')
  assert.equal(chave, PREFIXO_RASCUNHO_PEDIDOS + 'pa-1')
  const visto = { titulo: 'Fotos do cardápio', texto: 'Mande as fotos', prazo_em: null, prioridade: 'normal', respondido: false, resposta: '' }
  guardarRascunhos(chave, { a: { texto: 'Estou fazendo', visto }, b: { texto: '   ', visto }, c: { texto: '', visto: null } }, st)
  assert.deepEqual(lerRascunhos(chave, st), { a: { texto: 'Estou fazendo', visto } }, 'só o que tem texto; o `visto` volta para o aviso de mudança')
  // Enviou (campo esvaziado): a entrada some e a chave também — nenhum lixo no armazenamento.
  guardarRascunhos(chave, {}, st)
  assert.equal(st.getItem(chave), null)
  assert.deepEqual(lerRascunhos(chave, st), {})
  assert.equal(temRascunho({ a: { texto: 'x' } }), true)
  assert.equal(temRascunho({ a: { texto: '  ' } }), false, 'só espaços não é trabalho pendente')
  assert.equal(temRascunho({}), false)
  assert.equal(temRascunho(null), false)
})

test('rascunho de resposta: outra participação não vê, lixo no armazenamento não quebra, texto longo é cortado no teto do campo', () => {
  const st = armazemFalso()
  guardarRascunhos(chaveDosRascunhos('pa-1'), { geral: { texto: 'resposta da marca 1', visto: null } }, st)
  // Pedido GERAL tem o mesmo id para todas as marcas: a chave por participação impede que a outra marca leia o texto.
  assert.deepEqual(lerRascunhos(chaveDosRascunhos('pa-2'), st), {})
  for (const lixo of ['não é json', '[]', '"texto"', '{"a":"x"}', '{"a":{"texto":5}}', 'null']) {
    const s = armazemFalso({ k: lixo })
    assert.deepEqual(lerRascunhos('k', s), {}, lixo)
  }
  const longo = armazemFalso({ k: JSON.stringify({ a: { texto: 'x'.repeat(5000), visto: 'não é objeto' } }) })
  const lido = lerRascunhos('k', longo)
  assert.equal(lido.a.texto.length, 4000)
  assert.equal(lido.a.visto, null)
  // Armazenamento bloqueado (modo privado): a tela funciona, só sem a memória.
  const quebrado = { getItem() { throw new Error('bloqueado') }, setItem() { throw new Error('bloqueado') }, removeItem() { throw new Error('bloqueado') } }
  assert.deepEqual(lerRascunhos('k', quebrado), {})
  assert.doesNotThrow(() => guardarRascunhos('k', { a: { texto: 'oi' } }, quebrado))
  assert.deepEqual(lerRascunhos('k', null), {})
  assert.doesNotThrow(() => guardarRascunhos('k', { a: { texto: 'oi' } }, null))
})

test('"Sair" / troca de conta tira os rascunhos de resposta deste navegador (e só eles)', () => {
  const st = armazemFalso({ [chaveDosRascunhos('pa-1')]: '{}', [chaveDosRascunhos('pa-2')]: '{}', scw_outra_coisa: '1' })
  limparRascunhosPedidos(st)
  assert.equal(st.getItem(chaveDosRascunhos('pa-1')), null)
  assert.equal(st.getItem(chaveDosRascunhos('pa-2')), null)
  assert.equal(st.getItem('scw_outra_coisa'), '1')
})

test('Pedidos.jsx: restaura ao reabrir, guarda depois de restaurar, declara o trabalho pendente — e não grava nada no banco por isso', () => {
  assert.match(PEDIDOS, /import \{ usePendencia \} from '\.\.\/\.\.\/lib\/pendencias'/)
  assert.match(PEDIDOS, /usePendencia\(temRascunho\(rascunhos\), \{ rotulo: 'Resposta a uma solicitação, ainda não enviada', guardaRascunho: true \}\)/)
  // Restaura quando a participação é conhecida e SÓ depois guarda (senão o primeiro guardar apagaria o que estava lá).
  const restaurar = PEDIDOS.slice(PEDIDOS.indexOf('const chaveRasc'), PEDIDOS.indexOf('const minhas'))
  assert.match(restaurar, /chaveDosRascunhos\(participacao\.id\)/)
  assert.match(restaurar, /lerRascunhos\(chaveRasc\)/)
  assert.match(restaurar, /if \(chaveRasc && restauradoDe === chaveRasc\) guardarRascunhos\(chaveRasc, rascunhos\)/)
  assert.ok(restaurar.indexOf('lerRascunhos(') < restaurar.indexOf('guardarRascunhos('))
  // Nenhuma escrita nova: a única gravação continua sendo o RPC de responder (a lista de métodos do teste acima).
  assert.doesNotMatch(restaurar, /api\(|rpc\//)
  // O campo esvaziado ao enviar (`aoDigitar('')`) é o que apaga a entrada: `digitar` remove a chave do estado.
  assert.match(PEDIDOS, /if \(!valor\) \{ if \(!\(s\.id in r\)\) return r; const \{ \[s\.id\]: _, \.\.\.resto \} = r; return resto \}/)
})

test('responder: o resultado vai para o topo COM foco (a linha muda de lista e o botão tocado some)', () => {
  assert.match(PEDIDOS, /import \{ AvisoComFoco \} from '\.\/AvisoComFoco'/)
  assert.match(PEDIDOS, /<AvisoComFoco aviso=\{retorno\} \/>/)
  assert.doesNotMatch(PEDIDOS, /role=\{retorno\.tom/, 'o <p role> solto, sem foco, saiu')
  // O aviso novo é um objeto novo a cada resposta (o foco entra uma vez por aviso).
  assert.match(PEDIDOS, /setRetorno\(\{ tom: 'ok', texto: complemento/)
  const comp = ler('painel-app/src/components/vistas-marca/AvisoComFoco.jsx')
  assert.match(comp, /tabIndex=\{-1\}/)
  assert.match(comp, /ref\.current\.focus\(\)/)
})

// ── Um nome só: "Solicitações" (achados #4/#12) ──────────────────────────────

test('tudo que a marca lê no Início e na tela diz "solicitação", não "pedido" (a chave de rota `pedidos` não muda)', () => {
  const hoje = ler('painel-app/src/components/vistas-marca/Hoje.jsx')
  assert.match(hoje, /\['pedidos', 'Solicitações', pedidosAbertos\]/, 'o atalho tem o nome da tela')
  assert.doesNotMatch(hoje, /'Pedidos'/)
  const com = ler('painel-app/src/components/vistas-marca/hoje/Comunicacao.jsx')
  assert.match(com, /sub="Conversa, solicitações e avisos"/)
  assert.match(com, /irPara\('pedidos'\)/, 'a chave da rota segue `pedidos`')
  // O resumo do grupo, ao lado do botão "Ver solicitações", usa a mesma palavra e a mesma contagem do resumo de Comunicação.
  const grupo = (n) => resumoDoGrupo({ chave: 'solicitacoes', itens: Array.from({ length: n }, () => ({ tipo: 'pedido' })) })
  assert.equal(grupo(1), '1 solicitação aberta')
  assert.equal(grupo(3), '3 solicitações abertas')
  assert.equal(grupo(1), resumoSolicitacoes([{ estado: 'pendente', titulo: 'x' }]).titulo)
  assert.equal(grupo(3), resumoSolicitacoes([{ estado: 'pendente' }, { estado: 'pendente' }, { estado: 'pendente' }]).titulo)
  // O motivo do destaque e o passo "Responder…" também.
  const destaque = apresentarDestaque({ tipo: 'pedido', titulo: 'Fotos', prioridade: 'importante', link: 'pedidos/p1', vista: 'pedidos' })
  assert.equal(destaque.motivo, 'A organização marcou esta solicitação como importante.')
  const passos = proximosPassos({ pedidosPendentes: 2, statusCadastro: 'cadastro_completo' }).passos
  assert.equal(passos.find((p) => p.chave === 'pedidos').texto, 'Responder 2 solicitações da organização')
  assert.equal(proximosPassos({ pedidosPendentes: 1, statusCadastro: 'cadastro_completo' }).passos.find((p) => p.chave === 'pedidos').texto, 'Responder 1 solicitação da organização')
  for (const t of [hoje, com]) assert.doesNotMatch(t, />\s*Pedidos\s*</)
})
