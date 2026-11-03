import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  FILTROS_COMBOS, preenchido, filtrarCombos, contarCombos, alimentarDoItem, linhaAlergenicos, descricaoDaTroca, faltas,
  textoDoCombo, textoDeTodos, arroba, real, AGUARDANDO, trocasEOpcoes, enderecoTexto, foneTexto,
} from '../painel-app/src/lib/combosTexto.js'
import { revisar, paraTexto, marcaDoCampo, contarAlteracoes, textoDoAntes } from '../painel-app/src/lib/alteracoesCampo.js'
import { RPC_LEITURA, dominiosDeRpc } from '../painel-app/src/lib/sync/dominios.js'
import { migrarRota } from '../painel-app/src/lib/rota.js'
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

test('troca antiga (original de outra coisa, sem descrição): "original → alternativa"; troca não tem custo, só o acréscimo antigo > 0 aparece', () => {
  const i = { tipo: 'bebida', nome: 'Refri' }
  const base = { original: 'Soda', alternativa: 'Café', disponibilidade: 'limitada' }
  assert.equal(descricaoDaTroca(i, { ...base, acrescimo: null }), 'Bebida: Soda → Café (limitada, até acabar)')
  assert.equal(descricaoDaTroca(i, { ...base, acrescimo: 0 }), 'Bebida: Soda → Café (limitada, até acabar)')
  assert.equal(descricaoDaTroca(i, { ...base, disponibilidade: 'sempre', acrescimo: '5.50' }), 'Bebida: Soda → Café (sempre disponível; + R$ 5,50)')
  assert.equal(descricaoDaTroca(i, { original: 'A', alternativa: 'B', modalidades: ['retirada', 'delivery'], como_solicitar: 'Peça no balcão' }),
    'Bebida: A → B (só retirada e delivery) — como pedir: Peça no balcão')
})

test('troca nova: o nome é a alternativa (o original é o próprio item), com descrição e alergênicos da alternativa', () => {
  const i = { tipo: 'salgado', nome: 'Cachorro-quente' }
  const s = { original: 'Cachorro-quente', alternativa: 'Cachorro-quente vegetariano', descricao: 'Com salsicha de soja', disponibilidade: 'sempre', acrescimo: 0,
    alimentar: [{ aspecto: 'gluten', estado: 'contem' }, { aspecto: 'soja', estado: 'contem' }, { aspecto: 'amendoim', estado: 'pode_conter' }, { aspecto: 'leite', estado: 'nao_contem' }] }
  assert.equal(descricaoDaTroca(i, s), 'Salgado: Cachorro-quente vegetariano — Com salsicha de soja (sempre disponível; contém glúten e soja; pode conter amendoim)')
  // original igual ao item (maiúscula/espaço não importam) e sem descrição: só o nome
  assert.equal(descricaoDaTroca(i, { original: ' cachorro-quente ', alternativa: 'Sem pão' }), 'Salgado: Sem pão')
  // com descrição, nem um original diferente vira seta (é registro no formato novo)
  assert.equal(descricaoDaTroca(i, { original: 'Pão', alternativa: 'Na tigela', descricao: 'Sem o pão' }), 'Salgado: Na tigela — Sem o pão')
  // várias trocas do mesmo item: todas, na ordem
  const d = { combo: { itens: [{ ...i, substituicoes: [s, { original: 'Cachorro-quente', alternativa: 'Sem pão' }] }] } }
  assert.deepEqual(trocasEOpcoes(d).map((x) => x.texto), ['Cachorro-quente vegetariano — Com salsicha de soja (sempre disponível; contém glúten e soja; pode conter amendoim)', 'Sem pão'])
})

test('"ainda sem": diz o que falta, com o artigo certo', () => {
  assert.deepEqual(faltas(combo()), [])
  const f = faltas({ combo: { nome: '', descricao: '', itens: [item('doce', 1), item('salgado', 2, { nome: '' }), item('bebida', 3, { alimentar: [] })] } })
  assert.deepEqual(f, ['nome do combo', 'descrição do combo', 'nome do salgado', 'alergênicos da bebida'])
  assert.ok(faltas({ combo: { nome: 'X', descricao: 'Y', itens: [] } }).includes('nome da bebida'))
})

test('o texto de uma marca: campos FIXOS, "Aguardando informação" no lugar, trocas e opções, lojas', () => {
  const d = combo({
    alterado_apos_aprovacao: true,
    unidades: [{ id: 'u1', nome: 'Loja Centro', endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Natal', uf: 'RN' }, combo: { modos: { local: 'sim', delivery: 'nao' } } }],
    _opcoes: [{ item: 'bebida', onde: 'bebida', texto: 'Soda ou refrigerante' }],
    combo: {
      nome: 'Combo A', descricao: '', preco: 38.9,
      itens: [item('doce', 1, { alimentar: alim({ ...TODOS_NAO, vegano: 'sim' }) }), item('salgado', 2, { alimentar: [] }),
        item('bebida', 3, { substituicoes: [{ original: 'Soda', alternativa: 'Café', disponibilidade: 'sempre', acrescimo: 0 }] })],
    },
  })
  const t = textoDoCombo(d, 3, { horario: () => 'todos os dias, das 15h às 22h' })
  const linhas = t.split('\n')
  assert.equal(linhas[0], '*3. Marca A*  ✅ aprovado · a marca alterou depois de aprovado')
  for (const l of ['Instagram: @marcaa', 'Tema: Garfield', 'Combo: *Combo A*', 'Descrição: ' + AGUARDANDO, '*Doce:* Nome doce', '  Selos: vegano · sem glúten',
    '*Salgado:* Nome salgado', '  Alergênicos: ' + AGUARDANDO, '  Selos: ' + AGUARDANDO, '*Trocas e opções:*', '• Bebida: Soda → Café (sempre disponível)',
    '• Bebida: Soda ou refrigerante (na descrição da bebida)', 'Para viagem: sim', '• Loja Centro — Rua A, 10 – Centro, Natal/RN',
    '  Atendimento: No local · Horário: todos os dias, das 15h às 22h']) {
    assert.ok(linhas.includes(l), 'faltou a linha: ' + l)
  }
  assert.ok(!t.includes('Ainda sem'), 'acabou a lista "Ainda sem" no fim')
  // em branco: TODOS os campos aparecem, cada um com "Aguardando informação" no lugar
  const b = textoDoCombo(BRANCO('Sem Nada'))
  for (const l of ['Tema: ' + AGUARDANDO, 'Combo: ' + AGUARDANDO, 'Para viagem: ' + AGUARDANDO, '*Doce:* ' + AGUARDANDO, '*Bebida:* ' + AGUARDANDO, '*Onde encontrar:* ' + AGUARDANDO])
    assert.ok(b.split('\n').includes(l), 'em branco, faltou: ' + l)
  assert.ok(b.includes('Instagram: Não informado'), 'opcional vazio = "Não informado"')
})

test('o texto de todos: título, contagem, valor, data, ordem A–Z com acento e TODOS os participantes (inclusive em branco)', () => {
  const lista = [combo({ marca: 'Zeca' }), combo({ marca: 'Édson' }), combo({ marca: 'Caffè' }), BRANCO('Em branco')]
  const edicao = { codigo: '2026.2', nome: 'Cartoon', valor_combo: 38.9 }
  const t = textoDeTodos(lista, { edicao, data: '31/10/2026' })
  const linhas = t.split('\n')
  assert.equal(linhas[0], '*COMBOS DOS PARTICIPANTES · Sweet & Coffee Week Cartoon (2026.2)*')
  assert.equal(linhas[1], '4 participantes · valor do combo R$ 38,90 · posição de 31/10/2026')
  assert.deepEqual(linhas.filter((l) => /^\*\d+\. /.test(l)).map((l) => l.replace(/\*\d+\. ([^*]+)\*.*/, '$1')), ['Caffè', 'Édson', 'Em branco', 'Zeca'])
  assert.equal(t.endsWith('\n') && !t.endsWith('\n\n'), true)
  assert.ok(textoDeTodos([combo()], { edicao }).split('\n')[1].startsWith('1 participante ·'), 'singular')
  assert.ok(!textoDeTodos([combo()], {}).includes('valor do combo'), 'sem edição, sem valor inventado')
})

test('pequenos formatos', () => {
  assert.equal(arroba('marca'), '@marca')
  assert.equal(arroba('@marca'), '@marca')
  assert.equal(arroba('https://instagram.com/marca'), 'https://instagram.com/marca')
  assert.equal(arroba(null), '')
  assert.equal(real(38.9), 'R$ 38,90')
  assert.equal(foneTexto('84997056330'), '(84) 99705-6330')
  assert.equal(enderecoTexto({ logradouro: 'Av. X', numero: 'S/N', bairro: 'Tirol', cidade: 'Natal', uf: 'RN', cep: '59000-000', referencia: 'ao lado da praça' }),
    'Av. X, S/N – Tirol, Natal/RN – CEP 59000-000 (ao lado da praça)')
})

/* ── Revisão à parte e "Novo / Alterado" ─────────────────────────────────── */

test('revisão: vale só enquanto o original for o mesmo; o cadastro (objeto de entrada) não muda', () => {
  const d = combo({
    revisoes: {
      'combo.nome': { original: 'Combo  A', revisado: 'Combo Alfa' }, // espaço a mais no original não importa
      'doce.descricao': { original: 'Outro texto', revisado: 'Não pode entrar' }, // a marca mudou: revisão caduca
      'bebida.troca0.alternativa': { original: 'cafe', revisado: 'Café' },
    },
    combo: { nome: 'Combo A', descricao: 'x', itens: [item('doce', 1), item('bebida', 3, { substituicoes: [{ original: 'Soda', alternativa: 'cafe' }] })] },
  })
  const r = revisar(d)
  assert.equal(r.d.combo.nome, 'Combo Alfa')
  assert.equal(r.d.combo.itens[0].descricao, 'Descrição doce', 'original mudou: fica o que a marca escreveu')
  assert.equal(r.d.combo.itens[1].substituicoes[0].alternativa, 'Café')
  assert.deepEqual(r.caducas, ['doce.descricao'])
  assert.equal(d.combo.nome, 'Combo A', 'a entrada não é alterada')
  assert.equal(d.combo.itens[1].substituicoes[0].alternativa, 'cafe')
  // a descrição da troca também se revisa pelo campo (a chave segue a posição da troca)
  const comDescricao = revisar(combo({
    revisoes: { 'bebida.troca0.descricao': { original: 'com leite  de aveia', revisado: 'Com leite de aveia' } },
    combo: { nome: 'C', itens: [item('bebida', 3, { substituicoes: [{ original: 'Nome bebida', alternativa: 'Café gelado', descricao: 'com leite de aveia' }] })] },
  }))
  assert.equal(comDescricao.d.combo.itens[0].substituicoes[0].descricao, 'Com leite de aveia')
  assert.deepEqual(trocasEOpcoes(comDescricao.d).map((x) => x.texto), ['Café gelado — Com leite de aveia'])
})

test('opções escritas na descrição e trocas repetidas: só valem com a descrição/troca original intacta', () => {
  const d = combo({
    revisoes: {
      'opcao:bebida:1': { original: 'Descrição bebida', revisado: JSON.stringify({ item: 'bebida', texto: 'Soda ou suco' }) },
      'opcao:combo:1': { original: 'texto antigo do combo', revisado: JSON.stringify({ item: 'bebida', texto: 'não entra' }) },
      'ocultar:doce.troca0': { original: 'Soda → Café', revisado: 'repetida da bebida' },
    },
    combo: { nome: 'C', descricao: 'Novo texto', itens: [item('doce', 1, { substituicoes: [{ original: 'Soda', alternativa: 'Café' }] }), item('bebida', 3, { substituicoes: [{ original: 'Soda', alternativa: 'Café' }] })] },
  })
  const p = paraTexto(d)
  assert.deepEqual(p._opcoes, [{ item: 'bebida', onde: 'bebida', texto: 'Soda ou suco' }])
  assert.deepEqual(p._ocultas, ['doce.troca0'])
  const tr = trocasEOpcoes(p)
  assert.deepEqual(tr.map((x) => x.tipo + ':' + x.texto), ['bebida:Soda → Café', 'bebida:Soda ou suco'], 'a repetida do doce some; a opção entra')
})

test('marcação: novo (sem antes), alterado (com antes), apagado; o "antes" sai em português', () => {
  const d = { alteracoes: {
    'combo.nome': { antes: null, removido: false, em: '2026-10-31T23:00:00Z' },
    'doce.descricao': { antes: 'Velho', removido: false, em: '2026-10-31T23:00:00Z' },
    'combo.condicoes': { antes: 'X', removido: true, em: '2026-10-31T23:00:00Z' },
  } }
  assert.equal(marcaDoCampo(d, 'combo.nome').tipo, 'novo')
  assert.equal(marcaDoCampo(d, 'doce.descricao').tipo, 'alterado')
  assert.equal(marcaDoCampo(d, 'combo.condicoes').tipo, 'removido')
  assert.equal(marcaDoCampo(d, 'tema'), null)
  assert.equal(contarAlteracoes(d), 3)
  assert.equal(textoDoAntes('doce.alimentar', JSON.stringify({ gluten: 'contem' })), 'contém glúten · sem resposta: leite, ovo, amendoim, castanhas, soja, peixe e crustáceos.')
  assert.equal(textoDoAntes('bebida.trocas', JSON.stringify({ a: 'Soda → Café' })), 'Soda → Café')
  assert.equal(textoDoAntes('para_viagem', 'true'), 'Sim')
})

test('o cartão: campos fixos, "Aguardando informação", marcação com o antes, "Marquei como visto" e copiar', () => {
  const { CartaoParticipante } = carregar('painel-app/src/components/vistas/social/CartaoParticipante.jsx')
  const bruto = combo({ alteracoes: { 'doce.nome': { antes: 'Nome antigo', removido: false, em: '2026-10-31T23:00:00Z' } } })
  const d = paraTexto({ ...bruto, combo: { ...bruto.combo, descricao: '' } })
  const h = html(CartaoParticipante, { d, bruto, datas: [], valorCombo: 38.9, horario: () => '', onCopiar() {}, onVisto() {}, onAbrir() {} })
  for (const t of ['Marca A', 'Tema: Garfield', '@marcaa', 'Combo A', 'Nome doce', 'Nome salgado', 'Nome bebida', 'Trocas e opções', 'Onde encontrar',
    AGUARDANDO, 'Alterado', 'Antes: Nome antigo', '1 alteração', 'Marquei como visto', 'Abrir ficha', 'R$ 38,90']) assert.ok(h.includes(t), 'faltou no cartão: ' + t)
  assert.ok(!h.includes('Ainda sem'), 'sem a lista "Ainda sem"')
  const vazio = html(CartaoParticipante, { d: paraTexto(BRANCO('Sem Nada')), bruto: BRANCO('Sem Nada'), onCopiar() {} })
  assert.ok(vazio.includes('Sem Nada') && vazio.includes('Combo em branco') && vazio.split(AGUARDANDO).length > 10, 'em branco: todos os campos no lugar')
  assert.ok(!vazio.includes('Marquei como visto'), 'sem alteração, sem botão de visto')
})

test('Participantes vira a página completa; a aba Combos sai e o endereço antigo cai nela', () => {
  const mod = ler('painel-app/src/components/Modulos.jsx')
  assert.doesNotMatch(mod, /chave: 'combos'/, 'a aba Combos saiu')
  assert.ok(!existsSync(new URL('../painel-app/src/components/vistas/SocialCombos.jsx', import.meta.url)))
  assert.deepEqual(migrarRota({ vista: 'social', aba: 'combos', filtros: { mostrar: 'aprovados' } }), { vista: 'social', aba: 'participantes', filtros: {} })
  const tela = ler('painel-app/src/components/vistas/SocialParticipantes.jsx')
  assert.match(tela, /rpc\('editorial_combos'/)
  assert.match(tela, /rpc\('editorial_marcar_visto'/)
  assert.ok(RPC_LEITURA.has('editorial_combos'), 'leitura classificada para a sincronização')
  assert.ok(!RPC_LEITURA.has('editorial_marcar_visto'), 'marcar visto grava')
  assert.deepEqual(dominiosDeRpc('editorial_marcar_visto'), ['editorial'])
})

test('banco: só a MARCA marca alteração, revisão à parte, visto por pessoa e reversão/teste existem', () => {
  const sql = ler('supabase/migrations/20261122_social_participantes_completo.sql')
  assert.match(sql, /v_eu := public\.meu_participante\(\);\s*if v_eu is null then return null; end if;/, 'só a marca dispara')
  assert.match(sql, /scw\.silencioso[\s\S]*ver_como_ativo\(\)/, 'importação e "Ver como" não marcam')
  assert.match(sql, /exception when others then\s*raise warning/, 'falha nunca derruba o salvamento')
  assert.match(sql, /interval '10 minutes'/, 'o salvamento automático vira uma linha')
  for (const t of ['participantes', 'participacoes', 'participantes_itens', 'declaracoes_alimentares', 'substituicoes', 'unidades', 'participacao_unidades'])
    assert.ok(sql.includes("'" + t + "'"), 'gatilho em ' + t)
  assert.match(sql, /revoke all on public\.alteracoes_campo, public\.editorial_vistos, public\.revisoes_texto from anon, authenticated/)
  assert.match(sql, /if v_eu is null then raise exception 'conta_pessoal'/, 'o visto é da pessoa')
  assert.doesNotMatch(sql, /update public\.(participacoes|participantes|participantes_itens|unidades)\b/, 'nada aqui grava no cadastro')
  for (const p of ['supabase/reverter/20261122_social_participantes_completo.sql', 'supabase/testes/social-participantes-completo.sql'])
    assert.ok(existsSync(new URL('../' + p, import.meta.url)), p)
})
