// Cadastro da marca sincronizado (19/10/2026) — painel-app/src/lib/cadastroMescla.js.
// Comportamento real da mesclagem pura: o que a pessoa digitou nunca é trocado, o que ela não tocou acompanha
// o servidor, o mesmo campo editado dos dois lados vira conflito, linhas novas aparecem, linhas que sumiram saem
// (menos as que ela está editando), a releitura repetida não muda nada e o eco do próprio salvamento é no-op.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as E from '../painel-app/src/lib/edicaoMarca.js'
import { precoNumero, valorInformado } from '../painel-app/src/lib/cadastro.js'
import { datasDoFestival } from '../painel-app/src/lib/horarioFestival.js'
import * as M from '../painel-app/src/lib/cadastroMescla.js'

/* ── espelhos de Cadastro.jsx (as colunas gravadas são conferidas em painel-infra) ── */
const ouNulo = (v) => String(v == null ? '' : v).trim() || null
const paraStr = (n) => (n == null ? '' : String(n).replace('.', ','))
const numeroOuNulo = (s) => (valorInformado(s) ? precoNumero(s) : null)
const marcaDeLinha = (p) => ({
  nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '', email: p.email || '',
  instagram: p.instagram || '', site: p.site || '', cnpj: p.cnpj || '', razao_social: p.razao_social || '', apresentacao_publica: p.apresentacao_publica || '',
})
const corpoMarca = (m) => ({
  responsavel: m.responsavel.trim(), telefone: m.telefone.trim(), email: m.email.trim(), instagram: m.instagram.trim(), site: m.site.trim(),
  cnpj: m.cnpj.trim(), razao_social: m.razao_social.trim(), apresentacao_publica: ouNulo(m.apresentacao_publica),
})
const participacaoDeLinha = (pa) => ({
  tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
  combo: { combo_nome: pa.combo_nome || '', combo_descricao: pa.combo_descricao || '', combo_condicoes: pa.combo_condicoes || '' },
  custosStr: { embalagem: paraStr(pa.custo_embalagem), delivery: paraStr(pa.custo_delivery) },
  extras: { combo_para_viagem: pa.combo_para_viagem ?? null, combo_proposta: pa.combo_proposta || '' },
})
const corpoParticipacao = ({ tema, combo, custosStr, extras }) => ({
  tema_combo: tema.tema_combo.trim(), tema_justificativa: tema.tema_justificativa.trim(),
  combo_nome: ouNulo(combo.combo_nome), combo_descricao: ouNulo(combo.combo_descricao), combo_condicoes: ouNulo(combo.combo_condicoes),
  custo_embalagem: numeroOuNulo(custosStr.embalagem), custo_delivery: numeroOuNulo(custosStr.delivery),
  combo_para_viagem: extras.combo_para_viagem, combo_proposta: extras.combo_proposta.trim() || null,
})
const pedidoItem = (i) => ({
  caminho: 'participantes_itens?id=eq.' + i.id,
  corpo: { nome: (i.nome || '').trim(), descricao: (i.descricao || '').trim(), ...(i.posicao === 2 ? { tipo: i.tipo } : {}) },
})
const mapas = { marcaDeLinha, corpoMarca, participacaoDeLinha, corpoParticipacao, pedidoItem }

/* ── o que o servidor devolve (uma "foto") e o que a tela monta dela na abertura ── */
const fotoInicial = () => ({
  tipo: 'ok', novo: true, edicao: { valor_combo: 35, festival_inicio: '2026-11-05', festival_fim: '2026-11-15' }, tema: null,
  p: { id: 'p1', nome_marca: 'Doce Sol', responsavel: 'Ana', telefone: '(84) 99999-1234', email: 'a@x.com', instagram: '@docesol', site: '', cnpj: '', razao_social: '', apresentacao_publica: null },
  pa: {
    id: 'pa1', edicao_codigo: '2026.2', status_cadastro: 'em_preenchimento', tema_combo: 'Natal', tema_justificativa: 'Porque sim',
    combo_nome: 'Combo A', combo_descricao: 'Desc', combo_condicoes: null, custo_embalagem: 5, custo_delivery: null, combo_para_viagem: true, combo_proposta: null,
  },
  itensRows: [
    { id: 'i1', posicao: 1, tipo: 'doce', nome: 'Bolo', descricao: 'Bolo de cenoura' },
    { id: 'i2', posicao: 2, tipo: 'salgado', nome: 'Coxinha', descricao: 'Coxinha de frango' },
    { id: 'i3', posicao: 3, tipo: 'bebida', nome: 'Café', descricao: 'Café coado' },
  ],
  unRows: [{
    id: 'u1', nome_unidade: 'Lagoa', logradouro: 'Rua A', numero: '10', complemento: null, bairro: 'Lagoa Nova', cidade: 'Natal', uf: 'RN', cep: '59000000',
    referencia: null, whatsapp_publico: null, whatsapp_autorizado: false, coordenada_verificada_em: null,
  }],
  puRows: [{
    id: 'pu1', unidade_id: 'u1', participacao_id: 'pa1', id_publico: 'uabc', ordem: 0, participa: true, endereco: 'Rua A, 10', bairro: 'Lagoa Nova',
    consumo_local: 'sim', retirada: 'nao', delivery_combo: 'nao_informado', faz_delivery: false, canais_delivery: [], delivery_regioes: null, delivery_taxa: null, observacao_combo: null,
    // o jsonb do banco volta com as chaves em outra ordem (abre, data, fecha); o texto antigo é só legado
    horarios: 'Qui a sáb, 10h às 18h', horario_festival: [{ abre: '10:00', data: '2026-11-05', fecha: '18:00' }, { abre: '10:00', data: '2026-11-06', fecha: '18:00' }],
  }],
  declRows: [{ id: 'dc1', item_id: 'i1', aspecto: 'gluten', estado: 'contem', observacao: null }],
  subRows: [{ id: 's1', item_id: 'i1', original: 'leite', alternativa: 'aveia', disponibilidade: 'sempre', acrescimo: 2, como_solicitar: null, modalidades: [], unidades: [], ordem: 0 }],
})

function abrir(snap) {
  const marca = marcaDeLinha(snap.p)
  const pa = participacaoDeLinha(snap.pa)
  const unidades = snap.puRows.map((pu) => E.unidadeDeLinhas(pu, snap.unRows.find((u) => u.id === pu.unidade_id)))
  const vivo = {
    marca, tema: pa.tema, combo: pa.combo, custosStr: pa.custosStr, extras: pa.extras, itens: structuredClone(snap.itensRows), unidades,
    declaracoes: E.declaracoesPorItem(snap.declRows), substituicoes: snap.subRows.map(E.substituicaoDeLinha),
  }
  const base = {
    marca: corpoMarca(marca), participacao: corpoParticipacao(pa),
    itens: Object.fromEntries(snap.itensRows.map((i) => [i.id, pedidoItem(i).corpo])),
    un: Object.fromEntries(snap.unRows.map((u) => [u.id, E.corpoUnidade(E.unidadeDeLinhas(null, u))])),
    pu: Object.fromEntries(snap.puRows.map((r) => [r.id, E.corpoParticipacaoUnidadeDeLinha(r)])),
    decl: Object.fromEntries(snap.declRows.map((d) => [d.id, E.corpoDeclaracao({ estado: d.estado, observacao: d.observacao || '' })])),
    sub: Object.fromEntries(snap.subRows.map((s) => [s.id, E.corpoSubstituicao(E.substituicaoDeLinha(s))])),
  }
  return { vivo, base }
}
const planejar = (vivo, base, snap, extra = {}) => M.planejarMesclagem({ vivo, base, snap, mapas, ...extra })
const clone = (o) => structuredClone(o)
const semMudanca = (p) => {
  assert.deepEqual(p.tela, {}, 'nada para a tela')
  assert.deepEqual(p.conflitos, {}, 'sem conflito')
  assert.deepEqual(p.adotados, {}, 'sem aviso')
  assert.deepEqual(p.orfas, [])
}

/* ── eco do próprio salvamento, releitura repetida ─────────────────────────── */
test('eco do próprio salvamento: a base já é o servidor, então a releitura não muda nada', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const p = planejar(vivo, base, snap)
  semMudanca(p)
  assert.deepEqual(p.base, base, 'a base fica exatamente igual')
})

test('eco com a pessoa digitando de novo durante o salvamento: o digitado fica e nada é tocado', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const digitando = { ...vivo, marca: { ...vivo.marca, instagram: '@docesol_novo (digitando' }, combo: { ...vivo.combo, combo_nome: 'Combo AB' } }
  const p = planejar(digitando, base, snap)
  semMudanca(p)
  assert.deepEqual(p.base, base)
})

test('repetir o mesmo aviso é idempotente: depois de aplicar o plano, a segunda releitura não encontra nada', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.p.responsavel = 'Maria'
  novo.pa.combo_nome = 'Combo B'
  novo.itensRows[0].nome = 'Bolo de cenoura'
  novo.puRows[0].retirada = 'sim'
  novo.puRows[0].horario_festival = [{ abre: '10:00', data: '2026-11-05', fecha: '20:00' }]
  novo.declRows[0].estado = 'nao_contem'
  novo.subRows[0].alternativa = 'amêndoas'
  const p1 = planejar(vivo, base, novo)
  assert.ok(Object.keys(p1.adotados).length >= 7)
  assert.deepEqual(p1.conflitos, {})
  const depois = M.aplicarNoVivo(vivo, p1.tela)
  assert.equal(depois.marca.responsavel, 'Maria')
  assert.equal(depois.combo.combo_nome, 'Combo B')
  assert.equal(depois.itens[0].nome, 'Bolo de cenoura')
  assert.equal(depois.unidades[0].retirada, 'sim')
  assert.deepEqual(depois.unidades[0].horario_festival, [{ data: '2026-11-05', abre: '10:00', fecha: '20:00' }])
  assert.equal(depois.declaracoes.i1.gluten.estado, 'nao_contem')
  assert.equal(depois.substituicoes[0].alternativa, 'amêndoas')
  const p2 = planejar(depois, p1.base, novo)
  semMudanca(p2)
  assert.deepEqual(p2.base, p1.base)
  // e uma terceira vez, só para garantir
  semMudanca(planejar(M.aplicarNoVivo(depois, p2.tela), p2.base, novo))
})

/* ── campo a campo: marca, tema, combo ─────────────────────────────────────── */
test('campo que a pessoa não tocou acompanha o servidor (tela e base); o que ela digitou fica', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.p.responsavel = 'Maria'
  novo.p.email = 'maria@x.com'
  const digitando = { ...vivo, marca: { ...vivo.marca, email: 'ana@nova.com' } }   // a pessoa mexeu no e-mail, não no responsável
  const p = planejar(digitando, base, novo)
  assert.deepEqual(p.tela, { marca: { responsavel: 'Maria' } })
  assert.equal(p.base.marca.responsavel, 'Maria', 'a base acompanha o que foi adotado')
  assert.equal(p.base.marca.email, 'a@x.com', 'a base do campo em conflito não anda')
  assert.deepEqual(Object.keys(p.adotados), ['marca::responsavel'])
  assert.equal(p.adotados['marca::responsavel'].rotulo, 'Responsável pelo festival')
  assert.deepEqual(Object.keys(p.conflitos), ['marca::email'], 'o e-mail foi editado dos dois lados')
})

test('mesmo campo editado dos dois lados: conflito, a tela e a base NÃO mudam, e o salvamento pula a coluna', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.combo_nome = 'Versão da organização'
  const eu = { ...vivo, combo: { ...vivo.combo, combo_nome: 'Minha versão' } }
  const p = planejar(eu, base, novo)
  assert.deepEqual(p.tela, {}, 'o digitado não é trocado')
  const c = p.conflitos['participacao::combo_nome']
  assert.equal(c.meu, 'Minha versão')
  assert.equal(c.deles, 'Versão da organização')
  assert.equal(c.rotulo, 'Nome do combo')
  assert.equal(c.bloco, 3)
  assert.equal(p.base.participacao.combo_nome, 'Combo A', 'a base fica no valor antigo')
  assert.deepEqual([...M.bloqueadasDe(p.conflitos, 'participacao')], ['combo_nome'])
  assert.deepEqual([...M.bloqueadasDe(p.conflitos, 'marca')], [])
  // repetir a releitura mantém o MESMO conflito (nada de duplicar nem de resolver sozinho)
  assert.deepEqual(planejar(eu, p.base, novo).conflitos, p.conflitos)
})

test('depois de um salvamento a base troca pelo servidor — reimporConflitos devolve a do conflito, e o valor da tela não é enviado por cima', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.combo_nome = 'Versão da organização'
  const eu = { ...vivo, combo: { ...vivo.combo, combo_nome: 'Minha versão' } }
  const p = planejar(eu, base, novo)
  // o PATCH (sem a coluna bloqueada) volta com a linha inteira: a base vira o servidor
  const depoisDoPatch = { ...p.base, participacao: corpoParticipacao(participacaoDeLinha(novo.pa)) }
  assert.equal(depoisDoPatch.participacao.combo_nome, 'Versão da organização')
  M.reimporConflitos(depoisDoPatch, p.conflitos)
  assert.equal(depoisDoPatch.participacao.combo_nome, 'Combo A')
  assert.deepEqual(planejar(eu, depoisDoPatch, novo).conflitos, p.conflitos, 'o conflito segue aberto')
})

test('"Usar a nova": a tela e a base ficam com a do servidor e o conflito some', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.tema_combo = 'Sabores de Natal'
  const eu = { ...vivo, tema: { ...vivo.tema, tema_combo: 'Meu tema' } }
  const p = planejar(eu, base, novo)
  const c = p.conflitos['participacao::tema_combo']
  const tela = M.aplicarNoVivo(eu, c.tela)
  M.definirNaBase(p.base, c, c.deles)
  assert.equal(tela.tema.tema_combo, 'Sabores de Natal')
  assert.equal(p.base.participacao.tema_combo, 'Sabores de Natal')
  semMudanca(planejar(tela, p.base, novo))
})

test('"Manter a minha": a base vira a do servidor e o próximo salvamento envia a minha, de propósito', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.tema_combo = 'Sabores de Natal'
  const eu = { ...vivo, tema: { ...vivo.tema, tema_combo: 'Meu tema' } }
  const p = planejar(eu, base, novo)
  const c = p.conflitos['participacao::tema_combo']
  M.definirNaBase(p.base, c, c.deles)
  const depois = planejar(eu, p.base, novo)
  semMudanca(depois)
  assert.equal(depois.base.participacao.tema_combo, 'Sabores de Natal')
  // o corpo do PATCH (local) difere da base nessa coluna → patchMudancas a envia
  assert.notEqual(corpoParticipacao({ tema: eu.tema, combo: eu.combo, custosStr: eu.custosStr, extras: eu.extras }).tema_combo, depois.base.participacao.tema_combo)
})

test('custo digitado "5,00" e gravado 5 são o mesmo valor; o servidor mudando para 6 chega na tela como "6"', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const comFormato = { ...vivo, custosStr: { ...vivo.custosStr, embalagem: '5,00' } }   // mesma coisa que 5 → não conta como editado
  const novo = clone(snap)
  novo.pa.custo_embalagem = 6
  const p = planejar(comFormato, base, novo)
  assert.deepEqual(p.tela, { custosStr: { embalagem: '6' } })
  assert.equal(p.adotados['participacao::custo_embalagem'].rotulo, 'Custo da embalagem para viagem')
})

test('o nome da marca (o login) acompanha o servidor sempre e avisa', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.p.nome_marca = 'Doce Sol Café'
  const p = planejar(vivo, base, novo)
  assert.deepEqual(p.tela, { marca: { nome_marca: 'Doce Sol Café' } })
  assert.ok(p.adotados['marca::nome_marca'])
})

test('o que a tela só mostra (edição, situação, valor do combo, tema em análise) vem em `exibicao`', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.status_cadastro = 'cadastro_completo'
  novo.edicao.valor_combo = 40
  novo.tema = { status: 'aprovado', tema: 'Natal', observacao: null }
  const p = planejar(vivo, base, novo)
  assert.equal(p.exibicao.statusCadastro, 'cadastro_completo')
  assert.equal(p.exibicao.valorCombo, 40)
  assert.deepEqual(p.exibicao.festival, { inicio: '2026-11-05', fim: '2026-11-15' })
  assert.equal(p.exibicao.revisaoTema.status, 'aprovado')
  assert.equal(p.exibicao.permanentes.length, 1)
  // leitura de edição/tema que falhou (undefined) não zera o que a tela já mostra
  const falhou = clone(snap)
  falhou.edicao = undefined
  falhou.tema = undefined
  const q = planejar(vivo, base, falhou).exibicao
  assert.ok(!('valorCombo' in q) && !('revisaoTema' in q))
})

/* ── itens ─────────────────────────────────────────────────────────────────── */
test('itens: a organização edita um, outro é digitado; item novo aparece; item removido some', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.itensRows[0].nome = 'Bolo da casa'
  novo.itensRows = novo.itensRows.filter((i) => i.id !== 'i3')                       // a organização tirou a bebida
  novo.itensRows.push({ id: 'i4', posicao: 4, tipo: 'doce', nome: 'Extra', descricao: 'Extra' })
  const digitando = { ...vivo, itens: vivo.itens.map((i) => (i.id === 'i2' ? { ...i, descricao: 'Coxinha de frango com catupiry (digitando' } : i)) }
  const p = planejar(digitando, base, novo)
  assert.deepEqual(p.tela.itens.porId, { i1: { nome: 'Bolo da casa' } })
  assert.deepEqual(p.tela.itens.remover, ['i3'])
  assert.deepEqual(p.tela.itens.novos.map((i) => i.id), ['i4'])
  assert.ok(!('i3' in p.base.itens) && 'i4' in p.base.itens && p.base.itens.i1.nome === 'Bolo da casa')
  const depois = M.aplicarNoVivo(digitando, p.tela)
  assert.deepEqual(depois.itens.map((i) => i.id), ['i1', 'i2', 'i4'])
  assert.equal(depois.itens[1].descricao, 'Coxinha de frango com catupiry (digitando', 'o digitado intacto')
  assert.equal(p.adotados['item:i1:nome'].rotulo, 'Item 1 · Nome')
  semMudanca(planejar(depois, p.base, novo))
})

test('item que a organização removeu enquanto a pessoa o edita: fica, vira órfão (não é mais gravado) e é avisado', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.itensRows = novo.itensRows.filter((i) => i.id !== 'i3')
  const digitando = { ...vivo, itens: vivo.itens.map((i) => (i.id === 'i3' ? { ...i, nome: 'Café especial' } : i)) }
  const p = planejar(digitando, base, novo)
  assert.equal(p.tela.itens, undefined, 'nada é removido da tela')
  assert.deepEqual(p.orfas, ['item:i3'])
  const c = p.conflitos['item:i3:__removida']
  assert.equal(c.meu, 'Café especial')
  assert.equal(c.deles, 'Removido pela organização')
  assert.deepEqual(c.tela, { itens: { remover: ['i3'] } }, '"usar a nova" tira o item')
  assert.equal(c.manterTela, undefined, 'item não tem como ser recriado aqui: manter é só dispensar o aviso')
  assert.deepEqual([...M.bloqueadasDe(p.conflitos, 'item', 'i3')], [], 'a remoção não bloqueia colunas — o orfão é pulado por inteiro')
  // repetido: o mesmo aviso, a mesma órfã
  const outra = planejar(digitando, p.base, novo)
  assert.deepEqual(outra.orfas, ['item:i3'])
  assert.deepEqual(Object.keys(outra.conflitos), ['item:i3:__removida'])
})

/* ── unidades ──────────────────────────────────────────────────────────────── */
test('unidade: a organização muda atendimento (participação) e endereço (permanente); o espelho da base acompanha', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.puRows[0].retirada = 'sim'
  novo.puRows[0].canais_delivery = [{ tipo: 'whatsapp', link: 'https://wa.me/5584999991234' }]
  novo.puRows[0].delivery_combo = 'sim'
  novo.puRows[0].faz_delivery = true
  novo.puRows[0].endereco = 'Rua B, 10'
  novo.unRows[0].logradouro = 'Rua B'
  novo.unRows[0].coordenada_verificada_em = '2026-10-18T10:00:00Z'
  const p = planejar(vivo, base, novo)
  const campos = p.tela.unidades.porChave['pu-pu1']
  assert.equal(campos.retirada, 'sim')
  assert.equal(campos.delivery_combo, 'sim')
  assert.deepEqual(campos.canais, { aplicativo: '', whatsapp: 'https://wa.me/5584999991234', site: '' }, 'a coluna canais_delivery vira o objeto da tela')
  assert.equal(campos.logradouro, 'Rua B')
  assert.equal(campos.verificada, true)
  assert.equal(p.base.pu.pu1.endereco, 'Rua B, 10', 'o espelho segue o servidor')
  assert.equal(p.base.pu.pu1.faz_delivery, true)
  assert.equal(p.base.un.u1.logradouro, 'Rua B')
  assert.equal(p.adotados['pu:pu1:retirada'].rotulo, 'Retirada · Lagoa')
  assert.equal(p.adotados['pu:pu1:retirada'].bloco, 6)
  assert.equal(p.adotados['un:u1:logradouro'].bloco, 4)
  const depois = M.aplicarNoVivo(vivo, p.tela)
  // o que a tela deriva dos campos adotados é o que o servidor tem: nada a gravar por causa da releitura
  assert.deepEqual(E.corpoParticipacaoUnidade(depois.unidades[0], 0), p.base.pu.pu1)
  semMudanca(planejar(depois, p.base, novo))
})

test('unidade: o mesmo campo (bairro) editado dos dois lados vira conflito da unidade permanente', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.unRows[0].bairro = 'Capim Macio'
  const eu = { ...vivo, unidades: vivo.unidades.map((u) => ({ ...u, bairro: 'Ponta Negra' })) }
  const p = planejar(eu, base, novo)
  const c = p.conflitos['un:u1:bairro']
  assert.deepEqual([c.meu, c.deles, c.rotulo], ['Ponta Negra', 'Capim Macio', 'Bairro · Lagoa'])
  assert.deepEqual([...M.bloqueadasDe(p.conflitos, 'un', 'u1')], ['bairro'])
  assert.equal(p.base.un.u1.bairro, 'Lagoa Nova')
  assert.equal(p.tela.unidades, undefined)
})

test('CEP digitado pela metade é do digitador: não é trocado por um CEP novo do servidor (vira conflito)', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.unRows[0].cep = '59010000'
  const eu = { ...vivo, unidades: vivo.unidades.map((u) => ({ ...u, cep: '5901' })) }       // CEP inválido: o corpo do PATCH nem o leva
  assert.equal('cep' in E.corpoUnidade(eu.unidades[0]), false)
  const p = planejar(eu, base, novo)
  assert.equal(p.conflitos['un:u1:cep'].meu, '5901')
  assert.equal(p.tela.unidades, undefined)
})

test('unidade nova da organização aparece (com horário) e a base a conhece; a unidade em branco da tela some', () => {
  const snap = fotoInicial()
  snap.puRows = []
  const { vivo, base } = abrir(snap)
  const branco = { ...E.unidadeDeLinhas(null, null), _key: 'novo-1' }
  const comBranco = { ...vivo, unidades: [branco] }
  const novo = clone(fotoInicial())
  novo.unRows.push({ id: 'u2', nome_unidade: 'Midway', logradouro: 'Av. Roberto Freire', numero: '1', bairro: 'Capim Macio', cidade: 'Natal', uf: 'RN', cep: null, whatsapp_publico: null, whatsapp_autorizado: false, coordenada_verificada_em: null })
  novo.puRows = [{ ...novo.puRows[0], id: 'pu9', unidade_id: 'u2', id_publico: 'uxyz', ordem: 0, horario_festival: [{ abre: '09:00', data: '2026-11-06', fecha: '17:00' }] }]
  const p = planejar(comBranco, base, novo)
  assert.equal(p.tela.unidades.novas.length, 1)
  assert.equal(p.tela.unidades.novas[0].u._key, 'pu-pu9')
  assert.deepEqual(p.tela.unidades.novas[0].u.horario_festival, [{ data: '2026-11-06', abre: '09:00', fecha: '17:00' }])
  assert.ok(p.base.pu.pu9 && p.base.un.u2, 'a base já conhece as linhas novas')
  assert.deepEqual(p.base.pu.pu9.horario_festival, [{ data: '2026-11-06', abre: '09:00', fecha: '17:00' }], 'e o horário, na forma canônica')
  assert.ok(Object.keys(p.adotados).some((k) => /^pu:pu9:__nova$/.test(k)))
  const depois = M.aplicarNoVivo(comBranco, p.tela)
  assert.deepEqual(depois.unidades.map((u) => u._key), ['pu-pu9'], 'a linha em branco foi embora')
  // e a unidade que a pessoa já tinha preenchido é preservada ao lado da nova
  const preenchida = { ...branco, logradouro: 'Rua Minha' }
  assert.deepEqual(M.aplicarNoVivo({ ...vivo, unidades: [preenchida] }, p.tela).unidades.map((u) => u._key), ['pu-pu9', 'novo-1'])
  // idempotente: aplicar o mesmo plano outra vez não duplica
  assert.equal(M.aplicarNoVivo(depois, p.tela).unidades.length, 1)
  semMudanca(planejar(depois, p.base, novo))
})

test('unidade que a organização tirou da edição: some; se a pessoa a estava editando, fica órfã e "manter" a regrava', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.puRows = []
  const limpa = planejar(vivo, base, novo)
  assert.deepEqual(limpa.tela.unidades.remover, ['pu-pu1'])
  assert.equal(M.aplicarNoVivo(vivo, limpa.tela).unidades.length, 0)
  assert.ok(!('pu1' in limpa.base.pu))

  const editando = { ...vivo, unidades: vivo.unidades.map((u) => ({ ...u, referencia: 'Em frente à praça' })) }
  const p = planejar(editando, base, novo)
  assert.equal(p.tela.unidades, undefined)
  assert.deepEqual(p.orfas, ['pu:pu1'])
  const c = p.conflitos['pu:pu1:__removida']
  assert.deepEqual(c.manterTela.unidades.porChave['pu-pu1'], { puId: null, id_publico: null }, 'a permanente ainda existe: só solta o vínculo com a edição')
  assert.deepEqual(c.limparIds, { pu: ['pu-pu1'], un: [] })
})

/* ── horário no festival (23/10/2026): coluna da unidade da edição, comparada como o resto ─────────────────── */
const LINHAS_ORG = [{ abre: '12:00', data: '2026-11-05', fecha: '20:00' }]                // do jeito que o jsonb do banco devolve
const CANON_ORG = [{ data: '2026-11-05', abre: '12:00', fecha: '20:00' }]

test('horário no festival: a organização troca e a tela acompanha (tela e base); o aviso diz qual e de qual unidade', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  assert.deepEqual(vivo.unidades[0].horario_festival, [{ data: '2026-11-05', abre: '10:00', fecha: '18:00' }, { data: '2026-11-06', abre: '10:00', fecha: '18:00' }], 'a abertura já traz as linhas canônicas')
  assert.equal(vivo.unidades[0].horarios_antigo, 'Qui a sáb, 10h às 18h')
  const novo = clone(snap)
  novo.puRows[0].horario_festival = LINHAS_ORG
  const p = planejar(vivo, base, novo)
  // o seletor se refaz a partir do horário novo, então o aviso de "horário incompleto" cai junto
  assert.deepEqual(p.tela.unidades.porChave['pu-pu1'], { horario_festival: CANON_ORG, _horarioPendente: null })
  assert.deepEqual(p.base.pu.pu1.horario_festival, CANON_ORG, 'a base acompanha, já canônica')
  const a = p.adotados['pu:pu1:horario_festival']
  assert.deepEqual([a.rotulo, a.bloco], ['Horário no festival · Lagoa', 6])
  const depois = M.aplicarNoVivo(vivo, p.tela)
  assert.deepEqual(depois.unidades[0].horario_festival, CANON_ORG)
  semMudanca(planejar(depois, p.base, novo))
  // organização limpa o horário (volta a "ainda não respondido"): a tela acompanha
  const limpo = clone(snap)
  limpo.puRows[0].horario_festival = []
  assert.deepEqual(planejar(vivo, base, limpo).tela.unidades.porChave['pu-pu1'].horario_festival, [])
})

test('horário no festival: o mesmo horário editado dos dois lados é conflito, e o legível usa os dias do festival', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.puRows[0].horario_festival = LINHAS_ORG
  const meu = [{ data: '2026-11-05', abre: '09:00', fecha: '15:00' }]
  const editando = { ...vivo, unidades: vivo.unidades.map((u) => ({ ...u, horario_festival: meu })) }
  const q = planejar(editando, base, novo)
  assert.deepEqual(Object.keys(q.conflitos), ['pu:pu1:horario_festival'])
  const c = q.conflitos['pu:pu1:horario_festival']
  assert.deepEqual(c.meu, meu)
  assert.deepEqual(c.deles, CANON_ORG)
  assert.equal(c.rotulo, 'Horário no festival · Lagoa')
  assert.equal(c.bloco, 6)
  assert.deepEqual([...M.bloqueadasDe(q.conflitos, 'pu', 'pu1')], ['horario_festival'], 'o salvamento pula a coluna até a pessoa escolher')
  assert.deepEqual(q.base.pu.pu1.horario_festival, [{ data: '2026-11-05', abre: '10:00', fecha: '18:00' }, { data: '2026-11-06', abre: '10:00', fecha: '18:00' }], 'a base não anda')
  assert.deepEqual(q.tela, {}, 'o digitado não é trocado')
  // "usar a nova" leva o horário da organização para a tela
  assert.deepEqual(M.aplicarNoVivo(editando, c.tela).unidades[0].horario_festival, CANON_ORG)
  // ninguém lê código de banco: o legível sai em palavras, com os dias do festival (o "não abre" precisa deles)
  const DIAS = datasDoFestival('2026-11-05', '2026-11-15')
  assert.match(M.valorLegivel('horario_festival', meu, DIAS), /Qui 5\/11: das 9h às 15h/)
  assert.match(M.valorLegivel('horario_festival', meu, DIAS), /não abre/)
  assert.equal(M.valorLegivel('horario_festival', CANON_ORG, []), 'Qui 5/11: das 12h às 20h', 'sem as datas valem os dias que têm linha')
  assert.equal(M.valorLegivel('horario_festival', [], DIAS), 'Ainda sem horário')
})

test('horário incompleto no seletor não entra na mesclagem: o marcador não é dado, e a releitura não o desfaz', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const marcador = { faltando: ['Sábado'], semDiaAberto: false }
  const comMarcador = { ...vivo, unidades: vivo.unidades.map((u) => ({ ...u, _horarioPendente: marcador })) }
  semMudanca(planejar(comMarcador, base, snap))
  assert.deepEqual(Object.keys(planejar(comMarcador, base, snap).base.pu.pu1).filter((k) => /pendente/i.test(k)), [], 'a base não conhece o marcador')
  // uma releitura que traz OUTRA coisa da unidade não mexe no marcador (só o horário novo da organização o apaga)
  const outra = clone(snap)
  outra.puRows[0].retirada = 'sim'
  const depois = M.aplicarNoVivo(comMarcador, planejar(comMarcador, base, outra).tela)
  assert.equal(depois.unidades[0].retirada, 'sim')
  assert.deepEqual(depois.unidades[0]._horarioPendente, marcador)
  // o horário completo que a pessoa já tinha continua o mesmo enquanto o seletor está incompleto
  assert.deepEqual(depois.unidades[0].horario_festival, vivo.unidades[0].horario_festival)
})

/* ── declarações e trocas ──────────────────────────────────────────────────── */
test('declaração: resposta mudada, nova e removida pela organização', () => {
  const snap = fotoInicial()
  snap.declRows.push({ id: 'dc2', item_id: 'i1', aspecto: 'leite', estado: 'nao_contem', observacao: null })
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.declRows = [
    { ...novo.declRows[0], estado: 'pode_conter' },                                                    // gluten muda; leite some
    { id: 'dc3', item_id: 'i1', aspecto: 'outro_alergenico', estado: 'contem', observacao: 'gergelim' },
  ]
  const p = planejar(vivo, base, novo)
  assert.deepEqual(p.tela.declaracoes.porNk['i1|gluten'], { id: 'dc1', estado: 'pode_conter' })
  assert.deepEqual(p.tela.declaracoes.porNk['i1|outro_alergenico'], { id: 'dc3', estado: 'contem', observacao: 'gergelim' })
  assert.deepEqual(p.tela.declaracoes.remover, [{ itemId: 'i1', aspecto: 'leite' }])
  const depois = M.aplicarNoVivo(vivo, p.tela)
  assert.equal(depois.declaracoes.i1.gluten.estado, 'pode_conter')
  assert.equal(depois.declaracoes.i1.outro_alergenico.observacao, 'gergelim')
  assert.ok(!('leite' in depois.declaracoes.i1))
  assert.match(p.adotados['decl:dc1:estado'].rotulo, /^Glúten \(Item 1\)$/i)
  semMudanca(planejar(depois, p.base, novo))
})

test('declaração respondida na tela e ainda sem id, que a organização também respondeu: liga o id e só conflita se diferirem', () => {
  const snap = fotoInicial()
  snap.declRows = []
  const { vivo, base } = abrir(snap)
  const eu = { ...vivo, declaracoes: { i1: { leite: { observacao: '', estado: 'contem' }, gluten: { observacao: '', estado: 'contem' } } } }
  const novo = clone(snap)
  novo.declRows = [
    { id: 'dc1', item_id: 'i1', aspecto: 'leite', estado: 'contem', observacao: null },            // igual ao que eu marquei
    { id: 'dc2', item_id: 'i1', aspecto: 'gluten', estado: 'nao_contem', observacao: null },       // diferente
  ]
  const p = planejar(eu, base, novo)
  assert.deepEqual(p.tela.declaracoes.porNk['i1|leite'], { id: 'dc1' }, 'só liga o id: evita um POST duplicado')
  assert.equal(p.base.decl.dc1.estado, 'contem')
  assert.deepEqual(Object.keys(p.conflitos), ['decl:dc2:estado'])
  assert.deepEqual([p.conflitos['decl:dc2:estado'].meu, p.conflitos['decl:dc2:estado'].deles], ['contem', 'nao_contem'])
  assert.equal(M.valorLegivel('estado', 'nao_contem'), 'Não contém')
})

test('troca: disponibilidade mudada, troca nova, troca removida (acréscimo não conta: a troca não muda o valor)', () => {
  const snap = fotoInicial()
  snap.subRows.push({ id: 's2', item_id: 'i1', original: 'açúcar', alternativa: 'mel', disponibilidade: 'sob_consulta', acrescimo: null, como_solicitar: null, modalidades: [], unidades: [], ordem: 1 })
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.subRows = [
    { ...novo.subRows[0], acrescimo: 3.5, disponibilidade: 'limitada' },
    { id: 's3', item_id: 'i1', original: 'farinha', alternativa: 'de arroz', disponibilidade: 'limitada', acrescimo: 0, como_solicitar: null, modalidades: ['local'], unidades: [], ordem: 2 },
  ]
  const p = planejar(vivo, base, novo)
  assert.deepEqual(p.tela.substituicoes.porKey['sub-s1'], { id: 's1', disponibilidade: 'limitada' })
  assert.deepEqual(p.tela.substituicoes.remover, ['sub-s2'])
  assert.deepEqual(p.tela.substituicoes.novas.map((s) => s.id), ['s3'])
  const depois = M.aplicarNoVivo(vivo, p.tela)
  assert.deepEqual(depois.substituicoes.map((s) => s._key), ['sub-s1', 'sub-s3'])
  semMudanca(planejar(depois, p.base, novo))
})

/* ── linhas em voo, removidas pela pessoa, ids ainda fora do estado ──────────── */
test('troca que a PESSOA removeu (DELETE em voo) não ressuscita quando o servidor ainda a devolve', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const semTroca = { ...vivo, substituicoes: [] }
  const baseSem = clone(base)
  delete baseSem.sub.s1                                                  // sub.remover apaga da base
  const ressuscita = planejar(semTroca, baseSem, snap)
  assert.equal(ressuscita.tela.substituicoes.novas.length, 1, 'sem a lista de esquecidas ela voltaria')
  const protegido = planejar(semTroca, baseSem, snap, { esquecidas: new Set(['s1']) })
  semMudanca(protegido)
})

test('unidade removida pela pessoa (DELETE em voo): a base ainda a conhece e ela não volta', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  semMudanca(planejar({ ...vivo, unidades: [] }, base, snap))
})

test('ids que o servidor acabou de devolver e o estado ainda não tem: a linha não vira "nova" (sem POST duplicado)', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  // a tela ainda tem a unidade/declaração/troca sem id (o setState da resposta do POST não renderizou)
  const semIds = {
    ...vivo,
    unidades: vivo.unidades.map((u) => ({ ...u, unId: null, puId: null, id_publico: null })),
    declaracoes: { i1: { gluten: { observacao: '', estado: 'contem' } } },
    substituicoes: vivo.substituicoes.map((s) => ({ ...s, id: null })),
  }
  const ids = {
    unId: () => 'u1', puId: () => 'pu1', declId: () => 'dc1', subId: () => 's1',
  }
  const p = planejar(semIds, base, snap, { ids })
  assert.equal(p.tela.unidades.novas, undefined)
  assert.equal(p.tela.substituicoes.novas, undefined)
  assert.equal(p.tela.declaracoes, undefined, 'a declaração com id resolvido por referência não gera POST nem alteração')
  // a tela ganha os ids que faltavam
  assert.deepEqual(p.tela.unidades.porChave['pu-pu1'], { unId: 'u1', puId: 'pu1', id_publico: 'uabc' })
})

/* ── mesclarColecao e aplicadores: contratos pequenos ─────────────────────── */
test('mesclarColecao: o que a base conhece e a tela não tem é remoção local, nunca linha nova', () => {
  const r = M.mesclarColecao({
    base: { a: { x: 1 }, b: { x: 1 } },
    locais: [{ chave: 'a', id: 'a', corpo: { x: 1 } }],
    servidor: [{ chave: 'a', id: 'a', corpo: { x: 1 } }, { chave: 'b', id: 'b', corpo: { x: 1 } }, { chave: 'c', id: 'c', corpo: { x: 9 } }],
  })
  assert.deepEqual(r.novas, ['c'])
  assert.deepEqual(r.base.c, { x: 9 })
  assert.deepEqual(r.removidas, [])
})

test('mesclarColecao: linha sem id (ainda não gravada) nunca é tocada nem tratada como removida', () => {
  const r = M.mesclarColecao({ base: {}, locais: [{ chave: 'n', id: null, corpo: { x: 1 } }], servidor: [] })
  assert.deepEqual([r.novas, r.removidas, r.removidasEditando], [[], [], []])
})

test('aplicadores devolvem o mesmo objeto quando não há o que fazer (React não renderiza à toa)', () => {
  const v = abrir(fotoInicial()).vivo
  assert.equal(M.aplicarCampos(v.marca, {}), v.marca)
  assert.equal(M.aplicarCampos(v.marca, undefined), v.marca)
  assert.equal(M.aplicarItens(v.itens, undefined), v.itens)
  assert.equal(M.aplicarItens(v.itens, { remover: [], novos: [] }), v.itens)
  assert.equal(M.aplicarUnidades(v.unidades, undefined), v.unidades)
  assert.equal(M.aplicarDeclaracoes(v.declaracoes, undefined), v.declaracoes)
})

test('valorLegivel: nada de código do banco para a pessoa', () => {
  assert.equal(M.valorLegivel('retirada', 'nao_informado'), 'Ainda não sei')
  assert.equal(M.valorLegivel('delivery_combo', 'sim'), 'Sim')
  assert.equal(M.valorLegivel('combo_para_viagem', false), 'Não')
  assert.equal(M.valorLegivel('disponibilidade', 'sob_consulta'), 'Sob consulta')
  assert.equal(M.valorLegivel('canais_delivery', [{ tipo: 'whatsapp', link: 'https://wa.me/55' }]), 'whatsapp: https://wa.me/55')
  assert.equal(M.valorLegivel('modalidades', ['local', 'delivery']), 'Consumo no local, Delivery')
  assert.equal(M.valorLegivel('combo_nome', 'sim'), 'sim', 'texto livre não é traduzido')
})

/* ── blocos, base e fragmentos ─────────────────────────────────────────────── */
test('cada campo avisa o bloco de onde veio, para a aba mostrar só o que é dela', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const novo = clone(snap)
  novo.pa.tema_combo = 'Outro'
  novo.pa.combo_nome = 'Outro combo'
  novo.p.email = 'z@z.com'
  novo.unRows[0].numero = '11'
  novo.puRows[0].retirada = 'sim'
  const p = planejar(vivo, base, novo)
  const bloco = (ui) => p.adotados[ui].bloco
  assert.deepEqual(
    [bloco('marca::email'), bloco('participacao::tema_combo'), bloco('participacao::combo_nome'), bloco('un:u1:numero'), bloco('pu:pu1:retirada')],
    [0, 1, 3, 4, 6],
  )
})

test('definirNaBase e apagarDaBase mexem só na linha certa; juntar une fragmentos sem perder lista', () => {
  const base = { marca: { a: 1 }, participacao: { b: 2 }, itens: { i1: { nome: 'x' } }, un: {}, pu: {}, decl: {}, sub: { s1: { original: 'a' } } }
  M.definirNaBase(base, { ent: 'item', id: 'i1', chave: 'nome' }, 'y')
  M.definirNaBase(base, { ent: 'marca', id: '', chave: 'a' }, 9)
  M.definirNaBase(base, { ent: 'decl', id: 'dc1', chave: 'estado' }, 'contem')
  assert.deepEqual([base.itens.i1.nome, base.marca.a, base.decl.dc1.estado], ['y', 9, 'contem'])
  M.apagarDaBase(base, { ent: 'sub', id: 's1' })
  assert.deepEqual(base.sub, {})
  assert.deepEqual(M.juntar({ x: { l: [1], k: { a: 1 } } }, { x: { l: [2], k: { b: 2 } } }), { x: { l: [1, 2], k: { a: 1, b: 2 } } })
})

test('o digitado nunca é perdido: depois de qualquer plano, todo campo editado continua com o valor da pessoa', () => {
  const snap = fotoInicial()
  const { vivo, base } = abrir(snap)
  const eu = {
    ...vivo,
    marca: { ...vivo.marca, instagram: '@meu' },
    combo: { ...vivo.combo, combo_descricao: 'minha descrição' },
    itens: vivo.itens.map((i) => (i.id === 'i1' ? { ...i, nome: 'Meu bolo' } : i)),
    unidades: vivo.unidades.map((u) => ({ ...u, numero: '99', retirada: 'sim' })),
    declaracoes: { i1: { gluten: { id: 'dc1', estado: 'nao_contem', observacao: '' } } },
    substituicoes: vivo.substituicoes.map((s) => ({ ...s, alternativa: 'minha troca' })),
  }
  // a organização mexe em TUDO que a pessoa mexeu e em mais algumas coisas
  const novo = clone(snap)
  novo.p.instagram = '@org'; novo.p.responsavel = 'Maria'
  novo.pa.combo_descricao = 'descrição da org'; novo.pa.combo_condicoes = 'só no salão'
  novo.itensRows[0].nome = 'Bolo da org'; novo.itensRows[0].descricao = 'nova descrição'
  novo.unRows[0].numero = '55'; novo.unRows[0].cidade = 'Parnamirim'
  novo.puRows[0].retirada = 'nao_informado'; novo.puRows[0].observacao_combo = 'obs'
  novo.declRows[0].estado = 'pode_conter'
  novo.subRows[0].alternativa = 'troca da org'; novo.subRows[0].como_solicitar = 'no caixa'
  const p = planejar(eu, base, novo)
  const depois = M.aplicarNoVivo(eu, p.tela)
  // o que ela digitou
  assert.equal(depois.marca.instagram, '@meu')
  assert.equal(depois.combo.combo_descricao, 'minha descrição')
  assert.equal(depois.itens[0].nome, 'Meu bolo')
  assert.equal(depois.unidades[0].numero, '99')
  assert.equal(depois.unidades[0].retirada, 'sim')
  assert.equal(depois.declaracoes.i1.gluten.estado, 'nao_contem')
  assert.equal(depois.substituicoes[0].alternativa, 'minha troca')
  // o que ela não tocou acompanhou a organização
  assert.equal(depois.marca.responsavel, 'Maria')
  assert.equal(depois.combo.combo_condicoes, 'só no salão')
  assert.equal(depois.itens[0].descricao, 'nova descrição')
  assert.equal(depois.unidades[0].cidade, 'Parnamirim')
  assert.equal(depois.unidades[0].observacao_combo, 'obs')
  assert.equal(depois.substituicoes[0].como_solicitar, 'no caixa')
  // e os sete campos editados dos dois lados são exatamente os conflitos
  assert.deepEqual(Object.keys(p.conflitos).sort(), [
    'decl:dc1:estado', 'item:i1:nome', 'marca::instagram', 'participacao::combo_descricao', 'pu:pu1:retirada', 'sub:s1:alternativa', 'un:u1:numero',
  ])
  // repetir não muda nada, nem a tela nem os conflitos
  const de_novo = planejar(depois, p.base, novo)
  assert.deepEqual(de_novo.tela, {})
  assert.deepEqual(de_novo.conflitos, p.conflitos)
})
