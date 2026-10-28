/*
 * Social media na camada de sincronização (19/10/2026): a lógica PURA que protege o que a pessoa digitou
 * quando chega alteração de fora — mesclagem da postagem em três vias, conflitos que sobrevivem à
 * releitura, aviso de "outra postagem", seleção da biblioteca, combo editorial e o cache de endereços
 * assinados por sessão. As telas só aplicam estas funções (components/vistas/Redes*, Social*).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as R from '../painel-app/src/lib/redes.js'
import { iniciarRegistro, reduzirRegistro, registroSujo } from '../painel-app/src/lib/sync/mesclar.js'
import { barramento } from '../painel-app/src/lib/sync/barramento.js'
import { urlsAssinadas, limparCacheUrls } from '../painel-app/src/lib/redesArquivos.js'

const post = (o = {}) => ({
  id: 'p1', versao: 1, situacao: 'rascunho', titulo: 'Combo de outubro', perfil: '@sweetcoffeeweek', edicao_codigo: '2026.2',
  participante_id: null, formato: 'feed', legenda: 'Legenda original', mencoes: '', observacoes: '', referencias: '',
  programado_para: '2026-10-20T15:00:00+00:00', responsavel_id: 'u1', ...o,
})
const digitado = (p, o) => ({ ...R.camposDoPost(p), ...o })

// ── Postagem: três vias ─────────────────────────────────────────────────────
test('postagem: a releitura leva o que a pessoa não tocou e preserva o que ela digitou', () => {
  const velha = post()
  const atuais = digitado(velha, { legenda: 'Minha legenda' })
  const servidor = post({ versao: 2, titulo: 'Título da Eline', responsavel_id: 'u2' })
  const m = R.mesclarPostExterno(velha, atuais, servidor)
  assert.equal(m.campos.legenda, 'Minha legenda', 'o texto digitado nunca é trocado')
  assert.equal(m.campos.titulo, 'Título da Eline', 'campo não tocado acompanha o servidor')
  assert.equal(m.campos.responsavel_id, 'u2')
  assert.deepEqual(m.conflitos, [])
  assert.deepEqual(m.adotados.sort(), ['responsavel_id', 'titulo'])
  assert.equal(m.mudouFora, true)
  assert.deepEqual(Object.keys(R.diferencas(servidor, m.campos)), ['legenda'], 'só a legenda segue como alteração dela')
})

test('postagem: o mesmo campo mudado dos dois lados é CONFLITO — fica o texto dela e a tela sabe que há o que decidir', () => {
  const velha = post()
  const atuais = digitado(velha, { legenda: 'Minha legenda' })
  const servidor = post({ versao: 2, legenda: 'Legenda da Eline' })
  const m = R.mesclarPostExterno(velha, atuais, servidor)
  assert.deepEqual(m.conflitos, ['legenda'])
  assert.equal(m.campos.legenda, 'Minha legenda')
  assert.deepEqual(m.adotados, [], 'o campo em conflito não é "adotado"')
  assert.deepEqual(R.conflitosAbertos([], m.conflitos, R.diferencas(servidor, m.campos)), ['legenda'])
})

test('postagem: o conflito sobrevive à releitura seguinte (a base anda para a versão nova; esquecer liberaria o salvar por cima)', () => {
  const v1 = post()
  const atuais = digitado(v1, { legenda: 'Minha legenda' })
  const v2 = post({ versao: 2, legenda: 'Legenda da Eline' })
  const m2 = R.mesclarPostExterno(v1, atuais, v2)
  let abertos = R.conflitosAbertos([], m2.conflitos, R.diferencas(v2, m2.campos))
  assert.deepEqual(abertos, ['legenda'])
  // Segunda releitura: alguém mexe só no título. Para a base (agora v2) a legenda NÃO mudou: não há conflito "novo".
  const v3 = post({ versao: 3, legenda: 'Legenda da Eline', titulo: 'Outro título' })
  const m3 = R.mesclarPostExterno(v2, m2.campos, v3)
  assert.deepEqual(m3.conflitos, [])
  assert.deepEqual(R.conflitosAbertos([], m3.conflitos, R.diferencas(v3, m3.campos)), [], 'sem carregar o aviso anterior, o conflito sumiria')
  abertos = R.conflitosAbertos(abertos, m3.conflitos, R.diferencas(v3, m3.campos))
  assert.deepEqual(abertos, ['legenda'], 'com o aviso carregado, continua pedindo escolha')
  assert.equal(m3.campos.titulo, 'Outro título')
})

test('postagem: conflito deixa de valer quando a pessoa desfaz o dela ou os dois textos coincidem', () => {
  const v1 = post()
  const v2 = post({ versao: 2, legenda: 'Legenda da Eline' })
  const m = R.mesclarPostExterno(v1, digitado(v1, { legenda: 'Minha legenda' }), v2)
  const abertos = R.conflitosAbertos([], m.conflitos, R.diferencas(v2, m.campos))
  // Ela desfez a alteração (voltou ao que o servidor tem):
  assert.deepEqual(R.conflitosAbertos(abertos, [], R.diferencas(v2, R.camposDoPost(v2))), [])
  // Os dois escreveram a mesma coisa: não é conflito.
  const igual = R.mesclarPostExterno(v1, digitado(v1, { legenda: 'Legenda da Eline' }), v2)
  assert.deepEqual(igual.conflitos, [])
  assert.deepEqual(R.diferencas(v2, igual.campos), {})
})

test('postagem: versão que não andou não é mudança de fora; campo que só ela mudou não conflita', () => {
  const velha = post()
  const m = R.mesclarPostExterno(velha, digitado(velha, { titulo: 'Novo título' }), post())
  assert.equal(m.mudouFora, false)
  assert.deepEqual(m.conflitos, [])
  assert.deepEqual(m.adotados, [])
  assert.equal(m.campos.titulo, 'Novo título')
})

test('postagem: texto vazio e nulo são a mesma coisa (não gera conflito nem alteração falsa)', () => {
  const velha = post({ observacoes: null })
  const servidor = post({ versao: 2, observacoes: '' })
  const m = R.mesclarPostExterno(velha, R.camposDoPost(velha), servidor)
  assert.deepEqual(m.adotados, [])
  assert.deepEqual(m.conflitos, [])
})

// ── Aviso de outra postagem ─────────────────────────────────────────────────
test('aviso: só ignora quando TEM certeza de que é de outra postagem', () => {
  const av = (o) => ({ dominios: ['redes'], refs: ['p2'], origens: ['remota'], ...o })
  assert.equal(R.avisoDeOutraPostagem(av(), 'p1'), true, 'sinal do servidor sobre a postagem p2')
  assert.equal(R.avisoDeOutraPostagem(av({ refs: ['p2', 'p1'] }), 'p1'), false, 'p1 está entre as afetadas')
  assert.equal(R.avisoDeOutraPostagem(av({ refs: [] }), 'p1'), false, 'sem id: relê')
  assert.equal(R.avisoDeOutraPostagem(av({ origens: ['remota', 'local'] }), 'p1'), false, 'gravação desta sessão: relê')
  assert.equal(R.avisoDeOutraPostagem(av({ origens: ['reconciliacao'] }), 'p1'), false, 'reconexão: relê')
  assert.equal(R.avisoDeOutraPostagem(av({ dominios: ['redes', 'perfis'] }), 'p1'), false, 'outro domínio junto: relê')
  assert.equal(R.avisoDeOutraPostagem(null, 'p1'), false)
  assert.equal(R.avisoDeOutraPostagem(av(), ''), false)
})

// ── Texto alternativo ───────────────────────────────────────────────────────
test('texto alternativo: avisa quando OUTRA pessoa mexeu depois de a pessoa começar a digitar', () => {
  assert.equal(R.altMudouFora({ v: 'meu', base: 'antigo' }, 'antigo'), false, 'ninguém mexeu')
  assert.equal(R.altMudouFora({ v: 'meu', base: 'antigo' }, 'da Eline'), true, 'outro texto no servidor')
  assert.equal(R.altMudouFora({ v: 'meu', base: 'antigo' }, 'meu'), false, 'coincidiu')
  assert.equal(R.altMudouFora({ v: 'meu', base: '' }, null), false, 'vazio e nulo são o mesmo')
  assert.equal(R.altMudouFora(undefined, 'x'), false, 'sem rascunho não há o que avisar')
})

// ── Biblioteca ──────────────────────────────────────────────────────────────
test('biblioteca: a seleção sobrevive à releitura — fica quem ainda existe, já com o objeto novo', () => {
  const chave = (x) => x.tipo + ':' + x.id
  const a = { tipo: 'arte', id: 1, nome: 'a (velho)' }, b = { tipo: 'logo', id: 2, nome: 'b' }
  const marcados = new Map([[chave(a), a], [chave(b), b]])
  const lista = [{ tipo: 'arte', id: 1, nome: 'a (novo)' }, { tipo: 'foto_combo', id: 9, nome: 'c' }]
  const depois = R.podarSelecao(marcados, lista, chave)
  assert.deepEqual([...depois.keys()], ['arte:1'], 'o logo que sumiu da lista sai da seleção')
  assert.equal(depois.get('arte:1').nome, 'a (novo)')
  const vazia = new Map()
  assert.equal(R.podarSelecao(vazia, lista, chave), vazia, 'sem seleção não troca o estado')
})

// ── Combo editorial ─────────────────────────────────────────────────────────
const combo = (o = {}) => ({
  combo_nome: 'Combo A', combo_descricao: 'Descrição', combo_proposta: null,
  itens: [{ id: 'i1', tipo: 'doce', posicao: 1, nome: 'Brigadeiro', descricao: 'Doce de leite' }, { id: 'i2', tipo: 'bebida', posicao: 3, nome: 'Café', descricao: null }],
  ...o,
})
const abrir = (ed) => R.reduzirEditorial(null, { tipo: 'iniciar', editavel: ed })
const ver = (reg, servidor) => ({ lido: R.aEditavel(reg.base, servidor), form: R.aEditavel(reg.local, servidor) })

test('editorial: o que a pessoa não tocou acompanha o servidor e o "esperado" é atualizado a partir dele', () => {
  const ed0 = combo()
  let reg = abrir(ed0)
  reg = R.reduzirEditorial(reg, { tipo: 'editar', campo: 'combo_nome', valor: 'Combo B' })
  const ed1 = combo({ combo_descricao: 'Descrição nova da marca' })
  reg = R.reduzirEditorial(reg, { tipo: 'servidor', servidor: R.achatarEditavel(ed1) })
  const { lido, form } = ver(reg, ed1)
  assert.deepEqual(Object.keys(reg.conflitos), [])
  assert.deepEqual(reg.adotados, ['combo_descricao'])
  assert.equal(form.combo_nome, 'Combo B')
  assert.equal(form.combo_descricao, 'Descrição nova da marca')
  assert.equal(lido.combo_descricao, 'Descrição nova da marca', 'esperado = o que o servidor tem agora')
  assert.deepEqual(R.mudancasEditoriais(lido, form), { combo_nome: 'Combo B' }, 'só o dela vai ao servidor')
})

test('editorial: mesmo campo dos dois lados → conflito; a escolha acerta o "esperado"; salvar por cima não desfaz o que ela não tocou', () => {
  const ed0 = combo()
  let reg = abrir(ed0)
  reg = R.reduzirEditorial(reg, { tipo: 'editar', campo: 'combo_nome', valor: 'Combo B' })
  // A marca mexeu no mesmo nome E na descrição (que a pessoa não tocou).
  const ed1 = combo({ combo_nome: 'Combo C', combo_descricao: 'Descrição da marca' })
  reg = R.reduzirEditorial(reg, { tipo: 'servidor', servidor: R.achatarEditavel(ed1) })
  assert.deepEqual(reg.conflitos.combo_nome, { meu: 'Combo B', deles: 'Combo C' })
  let v = ver(reg, ed1)
  assert.equal(v.form.combo_nome, 'Combo B', 'o texto dela continua na tela')
  assert.equal(v.lido.combo_nome, 'Combo A', 'enquanto há conflito, o "esperado" é o antigo: o servidor recusaria (e a tela nem deixa salvar)')
  // "Manter a minha": o esperado passa a ser o do servidor e só o campo dela vai.
  const manteve = R.reduzirEditorial(reg, { tipo: 'manter', campo: 'combo_nome' })
  v = ver(manteve, ed1)
  assert.equal(v.lido.combo_nome, 'Combo C')
  assert.deepEqual(R.mudancasEditoriais(v.lido, v.form), { combo_nome: 'Combo B' }, 'a descrição da marca fica como está')
  // Como era antes: o formulário guardava a descrição VELHA e, em "salvar por cima", era comparado com a versão nova —
  // a descrição velha ia junto e apagava o que a marca escreveu.
  const formAntigo = { ...ed0, combo_nome: 'Combo B' }
  assert.ok('combo_descricao' in R.mudancasEditoriais(ed1, formAntigo), 'o jeito antigo sobrescrevia o que a marca escreveu')
  // "Usar a nova": some a alteração dela.
  const adotou = R.reduzirEditorial(reg, { tipo: 'adotar', campo: 'combo_nome' })
  v = ver(adotou, ed1)
  assert.equal(v.form.combo_nome, 'Combo C')
  assert.deepEqual(R.mudancasEditoriais(v.lido, v.form), {})
})

test('editorial: componentes (nome e descrição) mesclam por componente', () => {
  const ed0 = combo()
  let reg = abrir(ed0)
  reg = R.reduzirEditorial(reg, { tipo: 'editar', campo: 'item:i1:nome', valor: 'Brigadeiro gourmet' })
  const ed1 = combo({ itens: [{ ...ed0.itens[0], descricao: 'Chocolate belga' }, ed0.itens[1]] })
  reg = R.reduzirEditorial(reg, { tipo: 'servidor', servidor: R.achatarEditavel(ed1) })
  const { lido, form } = ver(reg, ed1)
  assert.deepEqual(R.mudancasEditoriais(lido, form), { itens: [{ id: 'i1', nome: 'Brigadeiro gourmet' }] })
  assert.equal(form.itens[0].descricao, 'Chocolate belga')
  assert.equal(lido.itens[0].descricao, 'Chocolate belga')
})

test('editorial: nulo no servidor continua nulo no "esperado" (o banco compara vazio e nulo como coisas diferentes)', () => {
  const ed0 = combo()
  const reg = abrir(ed0)
  const { lido, form } = ver(reg, ed0)
  assert.equal(lido.combo_proposta, null)
  assert.equal(lido.itens[1].descricao, null)
  assert.deepEqual(R.mudancasEditoriais(lido, form), {}, 'abrir a edição não é alterar')
  // Se a marca preencheu a proposta enquanto a base ainda era vazia, o esperado antigo ('') não pode virar "nulo" por engano.
  const ed1 = combo({ combo_proposta: 'Texto da marca' })
  assert.equal(R.aEditavel({ combo_proposta: '' }, ed1).combo_proposta, '', 'vazio antigo ≠ texto novo: o banco recusa e a tela mostra')
})

test('editorial: sair fecha a edição; sinal sem edição aberta não faz nada', () => {
  const reg = abrir(combo())
  assert.equal(R.reduzirEditorial(reg, { tipo: 'sair' }), null)
  assert.equal(R.reduzirEditorial(null, { tipo: 'servidor', servidor: R.achatarEditavel(combo({ combo_nome: 'X' })) }), null)
  assert.equal(R.reduzirEditorial(null, { tipo: 'editar', campo: 'combo_nome', valor: 'X' }), null)
})

test('editorial: componente que aparece depois da abertura entra com o valor do servidor e editar nele é alteração', () => {
  const ed0 = combo()
  let reg = abrir(ed0)
  const novoItem = { id: 'i3', tipo: 'salgado', posicao: 2, nome: 'Coxinha', descricao: 'Frango' }
  const ed1 = combo({ itens: [ed0.itens[0], novoItem, ed0.itens[1]] })
  reg = R.reduzirEditorial(reg, { tipo: 'servidor', servidor: R.achatarEditavel(ed1) })
  let v = ver(reg, ed1)
  assert.equal(v.form.itens[1].nome, 'Coxinha')
  assert.deepEqual(R.mudancasEditoriais(v.lido, v.form), {})
  reg = R.reduzirEditorial(reg, { tipo: 'editar', campo: 'item:i3:nome', valor: 'Coxinha de queijo' })
  v = ver(reg, ed1)
  assert.deepEqual(R.mudancasEditoriais(v.lido, v.form), { itens: [{ id: 'i3', nome: 'Coxinha de queijo' }] })
})

// ── Meu perfil: o nome digitado resiste ao diretório ────────────────────────
test('meu perfil: renomeação de fora não troca o nome digitado; salvar faz a base acompanhar', () => {
  let reg = iniciarRegistro({ nome: 'Wilke' }, ['nome'])
  assert.equal(registroSujo(reg), false)
  // Sem digitar nada: acompanha.
  reg = reduzirRegistro(reg, { tipo: 'servidor', servidor: { nome: 'Wilke E.' } })
  assert.equal(reg.local.nome, 'Wilke E.')
  assert.equal(registroSujo(reg), false, 'adotar o nome novo não é "alteração não salva"')
  // Digitando e, no meio, renomeiam por fora: conflito, o texto fica.
  reg = reduzirRegistro(reg, { tipo: 'editar', campo: 'nome', valor: 'Wilker' })
  reg = reduzirRegistro(reg, { tipo: 'servidor', servidor: { nome: 'Wilker Eloi' } })
  assert.equal(reg.local.nome, 'Wilker')
  assert.deepEqual(reg.conflitos.nome, { meu: 'Wilker', deles: 'Wilker Eloi' })
  // Escolheu manter o dela e salvou: a base acompanha o salvo.
  reg = reduzirRegistro(reg, { tipo: 'manter', campo: 'nome' })
  reg = reduzirRegistro(reg, { tipo: 'salvou', servidor: { nome: 'Wilker' } })
  assert.equal(registroSujo(reg), false)
  assert.equal(reg.base.nome, 'Wilker')
})

// ── Endereços assinados: cache da sessão ────────────────────────────────────
function fetchContando() {
  const reg = { chamadas: 0 }
  globalThis.fetch = async (url, op) => {
    reg.chamadas += 1
    const paths = JSON.parse(op.body).paths || []
    return { ok: true, json: async () => ({ validade: 300, urls: paths.map((p) => ({ path: p, url: 'https://storage/' + p + '?n=' + reg.chamadas })) }) }
  }
  return reg
}
const sessaoFalsa = () => {
  const mem = new Map()
  const s = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  globalThis.sessionStorage = s
  globalThis.localStorage = s
}

test('urls assinadas: o cache vale dentro da sessão e zera sozinho ao sair / trocar de conta', async () => {
  sessaoFalsa()
  limparCacheUrls()
  const c = fetchContando()
  const fonte = [{ bucket: 'redes', path: 'p1/a.png' }]
  const a = await urlsAssinadas(fonte)
  const b = await urlsAssinadas(fonte)
  assert.equal(c.chamadas, 1, 'a segunda consulta sai do cache')
  assert.equal(a['redes:p1/a.png'], b['redes:p1/a.png'])
  barramento.reiniciar() // sair ou trocar de conta
  const d = await urlsAssinadas(fonte)
  assert.equal(c.chamadas, 2, 'conta nova: pede de novo (o endereço da conta anterior não serve)')
  assert.notEqual(d['redes:p1/a.png'], a['redes:p1/a.png'])
})

test('urls assinadas: resposta que chega depois de trocar de conta não entra no cache da conta nova', async () => {
  sessaoFalsa()
  limparCacheUrls()
  let soltar
  const portao = new Promise((ok) => { soltar = ok })
  const c = { chamadas: 0 }
  globalThis.fetch = async (url, op) => {
    c.chamadas += 1
    await portao
    const paths = JSON.parse(op.body).paths || []
    return { ok: true, json: async () => ({ validade: 300, urls: paths.map((p) => ({ path: p, url: 'https://storage/antiga/' + p })) }) }
  }
  const fonte = [{ bucket: 'redes', path: 'p1/b.png' }]
  const emVoo = urlsAssinadas(fonte)
  barramento.reiniciar() // trocou de conta com a consulta ainda no ar
  soltar()
  await emVoo
  const novo = fetchContando()
  const depois = await urlsAssinadas(fonte)
  assert.equal(novo.chamadas, 1, 'a resposta da conta antiga não foi guardada: busca de novo')
  assert.match(depois['redes:p1/b.png'], /\?n=1$/)
})
