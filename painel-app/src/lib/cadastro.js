/*
 * Vista "Cadastro" da marca — lógica pura, sem DOM. Porte fiel de
 * public/painel/index.html: TIPOS/ROTULO_TIPO/CANAIS (~4305-4315),
 * precoNumero (~5406), itemCompleto (~5018), blocoCompleto (~5418-5425),
 * blocosPendentes (~5299-5307) e progresso (~5391-5399). O componente lê
 * estado do React em vez do DOM; estas funções recebem os mesmos dados como
 * argumento.
 */
export const TIPOS = ['doce', 'salgado', 'bebida']
export const ROTULO_TIPO = { doce: 'O doce', salgado: 'O salgado', bebida: 'A bebida' }

// Três canais fixos, não uma lista que a marca monta — mesmo motivo do
// arquivo estático: o briefing nomeia exatamente estes três.
export const CANAIS = [
  { tipo: 'aplicativo', rotulo: 'Aplicativo de entrega', dica: 'https://ifood.com.br/…' },
  { tipo: 'whatsapp', rotulo: 'WhatsApp', dica: 'https://wa.me/55…' },
  { tipo: 'site', rotulo: 'Site próprio', dica: 'https://…' },
]

export const BLOCOS = 5
const NOMES_BLOCO = ['A marca', 'O tema', 'Os três itens', 'Preço', 'Onde encontrar']

// Mapeia os códigos que `rpc/marca_concluir_cadastro` devolve em `faltando`
// para texto legível.
export const NOMES_FALTANDO = {
  nome_marca: 'nome da marca', responsavel: 'responsável', telefone: 'telefone',
  tema_combo: 'tema escolhido', tema_justificativa: 'justificativa do tema',
  combo_preco: 'preço do combo', unidades: 'ao menos uma unidade com endereço',
  item_doce: 'os dados do doce', item_salgado: 'os dados do salgado',
  item_bebida: 'os dados da bebida',
}

// Preço chega como string em formato brasileiro ("1.234,56"): milhar por
// ponto, decimal por vírgula.
export function precoNumero(str) {
  const cru = String(str || '').trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cru)
  return isNaN(n) ? 0 : n
}

export function itemDe(tipo, itens) {
  return (itens || []).find((i) => i.tipo === tipo) || null
}

export function itemCompleto(i) {
  if (!i) return false
  return (i.nome || '').trim() !== '' && (i.descricao || '').trim() !== '' && (i.ingredientes || '').trim() !== ''
}

export function unidadeTemEndereco(u) {
  return !!(u && (u.endereco || '').trim() !== '')
}

export function blocoCompleto(n, { marca = {}, tema = {}, itens = [], unidades = [], precoStr = '' } = {}) {
  if (n === 0) return !!((marca.nome_marca || '').trim() && (marca.responsavel || '').trim() && (marca.telefone || '').trim())
  if (n === 1) return !!((tema.tema_combo || '').trim() && (tema.tema_justificativa || '').trim())
  if (n === 2) return itens.length === TIPOS.length && itens.every(itemCompleto)
  if (n === 3) return precoNumero(precoStr) > 0
  if (n === 4) return unidades.filter(unidadeTemEndereco).length > 0
  return false
}

export function blocosPendentes(dados) {
  const faltam = []
  for (let n = 0; n < BLOCOS; n++) if (!blocoCompleto(n, dados)) faltam.push(NOMES_BLOCO[n])
  return faltam
}

export function progresso(dados) {
  let feitos = 0
  for (let n = 0; n < BLOCOS; n++) if (blocoCompleto(n, dados)) feitos++
  return feitos
}

// Primeiro bloco ainda pendente ao carregar a página, ou `null` se os 5 já
// estão prontos (abrirPrimeiroPendente).
export function primeiroBlocoPendente(dados) {
  for (let n = 0; n < BLOCOS; n++) if (!blocoCompleto(n, dados)) return n
  return null
}

// Mesma regra de completude, lida direto das linhas do banco (`combo_preco`
// numérico, não a string em edição) — usada pela vista Hoje, que só precisa
// saber o que falta, nunca edita o formulário (CLAUDE.md §5.2: uma fonte só
// para "o que falta no cadastro").
export function blocosPendentesDeLinhas({ participante = {}, participacao = {}, itens = [], unidades = [] } = {}) {
  return blocosPendentes({
    marca: { nome_marca: participante.nome_marca, responsavel: participante.responsavel, telefone: participante.telefone },
    tema: { tema_combo: participacao.tema_combo, tema_justificativa: participacao.tema_justificativa },
    itens,
    unidades,
    // Number -> string BR e de volta: um decimal do Postgres nunca carrega
    // separador de milhar, então o par replace('.',',')/precoNumero fecha
    // sem perda (29.9 -> "29,9" -> 29.9).
    precoStr: participacao.combo_preco == null ? '' : String(participacao.combo_preco).replace('.', ','),
  })
}

// `canais_delivery` do banco é um array [{tipo,link}]; a tela edita como um
// campo por canal fixo. As duas funções convertem entre os dois formatos.
export function canaisParaObjeto(lista) {
  const obj = {}
  CANAIS.forEach((c) => { obj[c.tipo] = '' })
  ;(Array.isArray(lista) ? lista : []).forEach((c) => {
    if (c && Object.prototype.hasOwnProperty.call(obj, c.tipo)) obj[c.tipo] = c.link || ''
  })
  return obj
}

export function canaisParaArray(obj) {
  return CANAIS.filter((c) => ((obj && obj[c.tipo]) || '').trim() !== '')
    .map((c) => ({ tipo: c.tipo, link: obj[c.tipo].trim() }))
}
