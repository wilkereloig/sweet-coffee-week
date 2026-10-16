/*
 * Link de preenchimento (16/10/2026, pedido do Wilker) — lógica pura.
 *
 * A marca recebe por WhatsApp um link único (/preencher/#<código>) com o
 * manual curto da edição e o formulário pré-preenchido. O que ela envia NÃO
 * grava: fica pendente até a organização revisar na ficha (Gestão) e aplicar.
 * Banco: supabase/migrations/20261016_link_preenchimento.sql.
 *
 * Aqui: o endereço, o texto do WhatsApp e a diferença campo a campo entre o
 * cadastro atual e o envio (as duas pontas têm a forma de
 * `preenchimento_estado`). Sem React: testado em
 * tests/painel-app-preenchimento.test.mjs.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const texto = (v) => (v == null ? '' : String(v)).trim()

export const linkPreenchimento = (origem, codigo) => (codigo ? String(origem).replace(/\/$/, '') + '/preencher/#' + codigo : null)

// '2026-10-24' → '24/10'; '2026-11-05' → '5 de novembro'.
function partes(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(iso))
  return m ? { dia: Number(m[3]), mes: Number(m[2]) } : null
}
export function dataCurtaBR(iso) {
  const p = partes(iso)
  return p ? String(p.dia).padStart(2, '0') + '/' + String(p.mes).padStart(2, '0') : ''
}
export function periodoEdicao(inicio, fim) {
  const a = partes(inicio), b = partes(fim)
  if (!a || !b) return ''
  return a.mes === b.mes ? a.dia + ' a ' + b.dia + ' de ' + MESES[b.mes - 1]
    : a.dia + ' de ' + MESES[a.mes - 1] + ' a ' + b.dia + ' de ' + MESES[b.mes - 1]
}
const temaBonito = (t) => { const s = texto(t); return s ? s.charAt(0) + s.slice(1).toLowerCase() : '' }

/** O recado do WhatsApp. Obrigatório e urgente, com o prazo da edição. */
export function textoPreenchimento({ marca, responsavel, link, edicao = {} }) {
  const nome = texto(responsavel).split(/\s+/)[0]
  const tema = temaBonito(edicao.tema)
  const periodo = periodoEdicao(edicao.inicio, edicao.fim)
  const prazo = dataCurtaBR(edicao.prazo)
  return [
    'Olá' + (nome ? ', ' + nome : '') + '! Aqui é da organização do Sweet & Coffee Week.',
    '',
    'A edição' + (tema ? ' ' + tema : '') + (periodo ? ' acontece de ' + periodo : ' está chegando') +
      ' e precisamos fechar os dados da ' + texto(marca) + '. Preparamos uma página só sua, com um resumo da edição e as informações que já temos. Confira, corrija o que precisar e complete o que falta:',
    '',
    link,
    '',
    '⚠️ O preenchimento é obrigatório e urgente' + (prazo ? ': precisa ser feito até ' + prazo : '') +
      '. Sem ele, sua marca não entra no site nem nos materiais da edição.',
  ].join('\n')
}

/* ── Diferença entre o cadastro atual e o envio ───────────────────────────── */
const ROTULOS_MARCA = [
  ['responsavel', 'Responsável'], ['telefone', 'WhatsApp do responsável'], ['email', 'E-mail'],
  ['instagram', 'Instagram'], ['site', 'Site'], ['cnpj', 'CNPJ'], ['razao_social', 'Razão social'],
]
const ROTULOS_COMBO = [
  ['tema_combo', 'Desenho escolhido'], ['tema_justificativa', 'Por que esse desenho'],
  ['combo_nome', 'Nome do combo'], ['combo_descricao', 'Descrição do combo'],
  ['combo_para_viagem', 'Pode ser para viagem'], ['custo_embalagem', 'Custo da embalagem'], ['custo_delivery', 'Custo do delivery'],
]
const ROTULOS_ITEM = [['nome', 'Nome'], ['descricao', 'Descrição'], ['ingredientes', 'Ingredientes']]
const ITENS = ['Doce', 'Salgado', 'Bebida']
const ROTULOS_UNIDADE = [
  ['nome_unidade', 'Nome da loja'], ['logradouro', 'Rua / avenida'], ['numero', 'Número'], ['complemento', 'Complemento'],
  ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['cep', 'CEP'], ['referencia', 'Referência'],
  ['horario_loja', 'Horário da loja'], ['horario_combo', 'Horário do combo'],
  ['consumo_local', 'Consumo no local'], ['retirada', 'Retirada'], ['delivery_combo', 'Delivery do combo'],
  ['whatsapp', 'WhatsApp da loja'], ['whatsapp_autorizado', 'WhatsApp no site'],
]
const DIGITOS = new Set(['cep', 'whatsapp', 'telefone', 'cnpj'])
const DINHEIRO = new Set(['custo_embalagem', 'custo_delivery'])
const SIM_NAO = { sim: 'Sim', nao: 'Não', nao_informado: '' }
const SIM_NAO_CAMPOS = { consumo_local: 1, retirada: 1, delivery_combo: 1 }

// Forma comparável e forma de mostrar de um valor, pelo tipo do campo.
function normal(campo, v) {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (DINHEIRO.has(campo)) {
    const n = Number(texto(v).replace(',', '.').replace(/[^0-9.]/g, ''))
    return texto(v) === '' || Number.isNaN(n) ? texto(v) : 'R$ ' + n.toFixed(2).replace('.', ',')
  }
  if (campo in SIM_NAO_CAMPOS) return SIM_NAO[texto(v)] ?? texto(v)
  return texto(v).replace(/\s+/g, ' ')
}
function igual(campo, a, b) {
  if (DIGITOS.has(campo)) {
    const da = texto(a).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
    const db = texto(b).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
    return da === db
  }
  if (campo === 'whatsapp_autorizado') return !!a === !!b
  return normal(campo, a) === normal(campo, b)
}

function comparar(grupo, rotulos, atual = {}, novo = {}, lista) {
  for (const [campo, rotulo] of rotulos) {
    if (!(campo in (novo || {}))) continue
    const de = (atual || {})[campo], para = novo[campo]
    if (!igual(campo, de, para)) lista.push({ grupo, campo: rotulo, de: normal(campo, de), para: normal(campo, para) })
  }
}

/**
 * Lista do que mudaria ao aplicar o envio: [{ grupo, campo, de, para }].
 * Campo que o envio não traz não entra (não é "apagar").
 */
export function diferencasEnvio(atual = {}, enviado = {}) {
  const lista = []
  comparar('Responsável e contato', ROTULOS_MARCA, atual.marca, enviado.marca, lista)
  comparar('Tema e combo', ROTULOS_COMBO, atual.combo, enviado.combo, lista)
  for (const it of Array.isArray(enviado.itens) ? enviado.itens : []) {
    const pos = Number(it && it.posicao)
    if (!(pos >= 1 && pos <= 3)) continue
    const antes = (atual.itens || []).find((x) => Number(x.posicao) === pos) || {}
    comparar(ITENS[pos - 1], ROTULOS_ITEM, antes, it, lista)
  }
  const unidadesAtuais = atual.unidades || []
  let nova = 0
  for (const u of Array.isArray(enviado.unidades) ? enviado.unidades : []) {
    const antes = u && u.id ? unidadesAtuais.find((x) => x.id === u.id) : null
    const nome = (antes && (texto(antes.nome_unidade) || texto(antes.bairro) || texto(antes.logradouro))) || ''
    if (u && u.remover) {
      if (antes) lista.push({ grupo: 'Loja ' + (nome || ''), campo: 'Participação', de: 'Participa', para: 'Não participa mais' })
      continue
    }
    if (!antes) {
      nova += 1
      if (!texto(u && u.logradouro)) continue // o banco ignora loja nova sem endereço
      comparar('Loja nova' + (nova > 1 ? ' ' + nova : ''), ROTULOS_UNIDADE, {}, u, lista)
    } else {
      comparar('Loja ' + nome, ROTULOS_UNIDADE, antes, u, lista)
    }
  }
  return lista
}

/** Situação do link numa linha só (lista e ficha). */
export function situacaoLink(l, pendentes = 0) {
  if (!l || !l.codigo) return { texto: 'Link não gerado', tom: 'neutro' }
  if (pendentes > 0) return { texto: 'Enviado · revisar', tom: 'atencao' }
  if (l.enviado_em) return { texto: 'Enviado e revisado', tom: 'ok' }
  if (l.aberto_em) return { texto: 'Aberto, não enviado', tom: 'andamento' }
  return { texto: 'Ainda não abriu', tom: 'neutro' }
}
