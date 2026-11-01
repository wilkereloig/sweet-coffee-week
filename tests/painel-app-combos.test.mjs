import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  FILTROS_COMBOS, preenchido, filtrarCombos, contarCombos, alimentarDoItem, linhaAlergenicos, descricaoDaTroca, faltas,
  textoDoCombo, textoDeTodos, arroba, real,
} from '../painel-app/src/lib/combosTexto.js'
import { RPC_LEITURA } from '../painel-app/src/lib/sync/dominios.js'
import { carregar, html } from './_renderizar.mjs'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

const alim = (o) => Object.entries(o).map(([aspecto, estado]) => ({ aspecto, estado }))
const TODOS_NAO = { gluten: 'nao_contem', leite: 'nao_contem', ovo: 'nao_contem', amendoim: 'nao_contem', castanhas: 'nao_contem', soja: 'nao_contem', peixe: 'nao_contem', crustaceos: 'nao_contem' }
const item = (tipo, posicao, extra = {}) => ({ tipo, posicao, nome: 'Nome ' + tipo, descricao: 'Descrição ' + tipo, alimentar: alim(TODOS_NAO), ...extra })
const combo = (extra = {}) => ({
  marca: 'Marca A', participante_id: 'p1', participacao_id: 'pa1', instagram: 'marcaa', tema: 'Garfield', combo_status: 'aprovado',
  alterado_apos_aprovacao: false, para_viagem: true,
  combo: { nome: 'Combo A', descricao: 'Um combo de teste.', preco: 38.9, itens: [item('doce', 1), item('salgado', 2), item('bebida', 3)] },
  ...extra,
})
const BRANCO = (marca) => ({ marca, participante_id: marca, participacao_id: marca, combo_status: 'rascunho', combo: { itens: [] } })

test('"preencheu" = tem nome, descrição ou nome/descrição de algum item; texto só de espaços não conta', () => {
  assert.equal(preenchido(BRANCO('X')), false)
  assert.equal(preenchido({ marca: 'X' }), false, 'sem o objeto combo')
  assert.equal(preenchido({ combo: { nome: '  ', itens: [{ nome: ' ', descricao: '' }] } }), false)
  assert.equal(preenchido({ combo: { nome: 'Só o nome', itens: [] } }), true)
  assert.equal(preenchido({ combo: { itens: [{ descricao: 'só a descrição do item' }] } }), true)
})

test('filtros e contagem: o número de cada filtro é o tamanho da lista que ele mostra', () => {
  const lista = [
    combo({ marca: 'Alfa' }),
    combo({ marca: 'Beta', combo_status: 'rascunho' }),
    combo({ marca: 'Gama', combo_status: 'em_analise', tema: 'Moana' }),
    BRANCO('Delta'), BRANCO('Épsilon'),
  ]
  const n = contarCombos(lista)
  assert.deepEqual(n, { total: 5, preenchidos: 3, aprovados: 1, andamento: 2, em_branco: 2 })
  const nomes = (f, q) => filtrarCombos(lista, f, q).map((d) => d.marca)
  assert.deepEqual(nomes('preenchidos'), ['Alfa', 'Beta', 'Gama'])
  assert.deepEqual(nomes('aprovados'), ['Alfa'])
  assert.deepEqual(nomes('andamento'), ['Beta', 'Gama'])
  assert.deepEqual(nomes('em_branco'), ['Delta', 'Épsilon'])
  assert.equal(nomes('todos').length, n.total)
  for (const [f] of FILTROS_COMBOS) assert.equal(filtrarCombos(lista, f).length, f === 'todos' ? n.total : n[f], f)
  assert.deepEqual(nomes('preenchidos', 'moana'), ['Gama'], 'busca por tema, sem diferenciar maiúscula')
  assert.deepEqual(nomes('preenchidos', 'combo a'), ['Alfa', 'Beta', 'Gama'], 'busca pelo nome do combo')
  assert.deepEqual(nomes('qualquer-outro'), ['Alfa', 'Beta', 'Gama'], 'filtro desconhecido = preenchidos')
})

test('alergênicos: ausente é "ainda não informados", nunca "não contém"', () => {
  assert.equal(linhaAlergenicos(alimentarDoItem({ tipo: 'doce' })), 'Alergênicos: ainda não informados.')
  assert.equal(linhaAlergenicos(alimentarDoItem({ alimentar: [] })), 'Alergênicos: ainda não informados.')
  assert.equal(linhaAlergenicos(alimentarDoItem({ alimentar: alim(TODOS_NAO) })), 'Alergênicos: não contém nenhum dos 8 alergênicos principais.')
  const misto = alimentarDoItem({ alimentar: alim({ ...TODOS_NAO, gluten: 'contem', leite: 'contem', ovo: 'pode_conter', peixe: 'nao_informado' }) })
  assert.equal(linhaAlergenicos(misto), 'Alergênicos: contém glúten e leite · pode conter ovo · sem resposta: peixe.')
  // uma resposta só não vira "não contém" nos que faltam
  const poucos = alimentarDoItem({ alimentar: alim({ gluten: 'contem' }) })
  assert.equal(linhaAlergenicos(poucos), 'Alergênicos: contém glúten · sem resposta: leite, ovo, amendoim, castanhas, soja, peixe e crustáceos.')
})

test('selos: vegano vale mais que vegetariano; lactose é característica e leite é alergênico (não se confundem)', () => {
  const a = alimentarDoItem({ alimentar: alim({ ...TODOS_NAO, vegano: 'sim', vegetariano: 'sim', lactose: 'nao', acucar_adicionado: 'nao' }) })
  assert.deepEqual(a.selos, ['vegano', 'sem glúten', 'sem lactose', 'sem açúcar adicionado'])
  const b = alimentarDoItem({ alimentar: alim({ ...TODOS_NAO, leite: 'contem', lactose: 'nao' }) })
  assert.deepEqual(b.contem, ['leite'], 'sem lactose não apaga "contém leite"')
  assert.ok(b.selos.includes('sem lactose'))
  assert.deepEqual(alimentarDoItem({ alimentar: alim({ vegetariano: 'sim' }) }).selos, ['vegetariano'])
  assert.deepEqual(alimentarDoItem({ alimentar: alim({ vegano: 'nao', gluten: 'contem' }) }).selos, [], 'não declarar não vira selo')
})

test('"outro alergênico" entra com o que a marca escreveu, sem repetir o verbo', () => {
  const a = alimentarDoItem({ alimentar: [...alim(TODOS_NAO), { aspecto: 'outro_alergenico', estado: 'contem', observacao: 'Contém Abacaxi na Redução' }] })
  assert.deepEqual(a.contem, ['abacaxi na redução'])
  const p = alimentarDoItem({ alimentar: [...alim(TODOS_NAO), { aspecto: 'outro_alergenico', estado: 'pode_conter', observacao: 'Gergelim' }] })
  assert.deepEqual(p.pode, ['gergelim'])
  const n = alimentarDoItem({ alimentar: [...alim(TODOS_NAO), { aspecto: 'outro_alergenico', estado: 'nao_contem', observacao: 'Gergelim' }] })
  assert.deepEqual([n.contem, n.pode], [[], []])
})

test('trocas: acréscimo vazio = não informado, 0 = sem acréscimo, valor = "+ R$"', () => {
  const i = { tipo: 'bebida' }
  const base = { original: 'Soda', alternativa: 'Café', disponibilidade: 'limitada' }
  assert.equal(descricaoDaTroca(i, { ...base, acrescimo: null }), 'Bebida: Soda → Café (limitada (até acabar))')
  assert.equal(descricaoDaTroca(i, { ...base, acrescimo: 0 }), 'Bebida: Soda → Café (limitada (até acabar); sem acréscimo)')
  assert.equal(descricaoDaTroca(i, { ...base, disponibilidade: 'sempre', acrescimo: '5.50' }), 'Bebida: Soda → Café (sempre disponível; + R$ 5,50)')
  assert.equal(descricaoDaTroca(i, { original: 'A', alternativa: 'B', modalidades: ['retirada', 'delivery'], como_solicitar: 'Peça no balcão' }),
    'Bebida: A → B (só retirada e delivery) — como pedir: Peça no balcão')
})

test('"ainda sem": diz o que falta, com o artigo certo', () => {
  assert.deepEqual(faltas(combo()), [])
  const f = faltas({ combo: { nome: '', descricao: '', itens: [item('doce', 1), item('salgado', 2, { nome: '' }), item('bebida', 3, { alimentar: [] })] } })
  assert.deepEqual(f, ['nome do combo', 'descrição do combo', 'nome do salgado', 'alergênicos da bebida'])
  assert.ok(faltas({ combo: { nome: 'X', descricao: 'Y', itens: [] } }).includes('nome da bebida'))
})

test('o texto de uma marca: marcador, Instagram com @, tema, combo, itens, trocas, viagem e o que falta', () => {
  const d = combo({
    alterado_apos_aprovacao: true,
    combo: {
      nome: 'Combo A', descricao: '', preco: 38.9,
      itens: [item('doce', 1, { alimentar: alim({ ...TODOS_NAO, vegano: 'sim' }) }), item('salgado', 2, { alimentar: [] }),
        item('bebida', 3, { substituicoes: [{ original: 'Soda', alternativa: 'Café', disponibilidade: 'sempre', acrescimo: 0 }] })],
    },
  })
  const t = textoDoCombo(d, 3)
  assert.equal(t.split('\n')[0], '*3. Marca A*  ✅ aprovado · a marca alterou depois de aprovado')
  for (const linha of ['Instagram: @marcaa', 'Tema: Garfield', 'Combo: *Combo A*', '• Doce: Nome doce', '  Selos: vegano · sem glúten', '• Salgado: Nome salgado',
    '  Alergênicos: ainda não informados.', 'Trocas:', '• Bebida: Soda → Café (sempre disponível; sem acréscimo)', 'Para viagem: sim', '⚠️ Ainda sem: descrição do combo, alergênicos do salgado.']) {
    assert.ok(t.split('\n').includes(linha), 'faltou a linha: ' + linha)
  }
  assert.ok(!t.includes('Descrição:'), 'descrição vazia não vira linha')
  const sem = textoDoCombo(combo({ marca: 'B', instagram: '', tema: '', para_viagem: null, combo: { nome: '', itens: [] } }))
  assert.ok(sem.includes('Combo: (a marca ainda não deu nome ao combo)') && !sem.includes('Instagram') && !sem.includes('Tema:') && !sem.includes('Para viagem'))
})

test('o texto de todos: título do filtro, contagem, valor, data, ordem A–Z com acento, só quem preencheu e o rodapé', () => {
  const lista = [combo({ marca: 'Zeca' }), combo({ marca: 'Édson' }), combo({ marca: 'Caffè' }), BRANCO('Em branco')]
  const edicao = { codigo: '2026.2', nome: 'Cartoon', valor_combo: 38.9 }
  const t = textoDeTodos(lista, { filtro: 'preenchidos', edicao, data: '31/10/2026', semNada: ['Em branco'] })
  const linhas = t.split('\n')
  assert.equal(linhas[0], '*COMBOS JÁ PREENCHIDOS · Sweet & Coffee Week Cartoon (2026.2)*')
  assert.equal(linhas[1], '3 participantes · valor do combo R$ 38,90 · posição de 31/10/2026')
  assert.deepEqual(linhas.filter((l) => /^\*\d+\. /.test(l)).map((l) => l.replace(/\*\d+\. ([^*]+)\*.*/, '$1')), ['Caffè', 'Édson', 'Zeca'])
  assert.ok(!t.includes('Em branco*  '), 'quem não preencheu nada não ganha bloco')
  assert.equal(linhas[linhas.length - 2], '*Ainda sem nada preenchido (1):* Em branco.')
  assert.equal(t.endsWith('\n') && !t.endsWith('\n\n'), true)
  assert.ok(textoDeTodos([combo()], { filtro: 'aprovados', edicao }).startsWith('*COMBOS APROVADOS · '))
  assert.ok(textoDeTodos([combo()], { filtro: 'andamento', edicao }).startsWith('*COMBOS EM ANÁLISE OU EM PREENCHIMENTO · '))
  assert.ok(textoDeTodos([combo()], { edicao }).split('\n')[1].startsWith('1 participante ·'), 'singular')
  assert.ok(!textoDeTodos([combo()], {}).includes('valor do combo'), 'sem edição, sem valor inventado')
})

test('pequenos formatos', () => {
  assert.equal(arroba('marca'), '@marca')
  assert.equal(arroba('@marca'), '@marca')
  assert.equal(arroba('https://instagram.com/marca'), 'https://instagram.com/marca')
  assert.equal(arroba(null), '')
  assert.equal(real(38.9), 'R$ 38,90')
})

test('o cartão desenhado: marca, status, itens, selos, o que falta e o botão de copiar (e o cartão em branco não copia)', () => {
  const { CartaoCombo } = carregar('painel-app/src/components/vistas/SocialCombos.jsx')
  const d = combo({ alterado_apos_aprovacao: true, combo: { nome: 'Combo A', descricao: '', itens: [item('doce', 1, { alimentar: alim({ ...TODOS_NAO, vegano: 'sim' }) }), item('salgado', 2), item('bebida', 3)] } })
  const h = html(CartaoCombo, { d, onCopiar() {} })
  for (const t of ['Marca A', 'Tema: Garfield', '@marcaa', 'Combo A', 'Nome doce', 'Nome salgado', 'Nome bebida', 'vegano', 'sem glúten', 'Alterado depois de aprovado',
    'Ainda sem: descrição do combo.', 'Copiar texto desta marca', 'Para viagem: sim']) assert.ok(h.includes(t), 'faltou no cartão: ' + t)
  const vazio = html(CartaoCombo, { d: BRANCO('Sem Nada'), onCopiar() {} })
  assert.ok(vazio.includes('Sem Nada') && vazio.includes('Em branco') && vazio.includes('A marca ainda não preencheu nada do combo.'))
  assert.ok(!vazio.includes('Copiar texto desta marca'), 'não há o que copiar')
})

test('a aba existe só para quem lê o editorial, lê pela RPC nova e nunca grava', () => {
  const mod = ler('painel-app/src/components/Modulos.jsx')
  assert.match(mod, /chave: 'combos', rotulo: 'Combos', mostrar: props\.pode\('editorial\.ler'\)/)
  const tela = ler('painel-app/src/components/vistas/SocialCombos.jsx')
  assert.deepEqual([...tela.matchAll(/rpc\('([a-z_]+)'/g)].map((m) => m[1]), ['editorial_combos'], 'a tela só lê')
  assert.ok(RPC_LEITURA.has('editorial_combos'), 'leitura nova classificada para a sincronização')
  const sql = ler('supabase/migrations/20261121_social_combos.sql')
  assert.match(sql, /function public\.editorial_combos\(p_secret text, p_edicao text default null\)/)
  assert.match(sql, /redes_exigir\(p_secret, 'editorial\.ler'\)/)
  assert.doesNotMatch(sql, /\b(insert|update|delete)\b\s+(into|from)?\s*public\./i, 'a função só lê')
  for (const p of ['supabase/reverter/20261121_social_combos.sql', 'supabase/testes/social-combos.sql']) assert.ok(existsSync(new URL('../' + p, import.meta.url)), p)
})
