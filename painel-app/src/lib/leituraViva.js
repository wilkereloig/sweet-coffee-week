/*
 * Núcleo puro das vistas que se atualizam sozinhas (19/10/2026): Produção,
 * Publicação, Arquivos, Materiais e a logo da marca. Sem React e sem rede — o
 * que DECIDE mora aqui, para ser testado; o que liga isso à tela é
 * leituraVivaReact.js.
 */
import { igualValor } from './sync/mesclar.js'

// ── uma leitura: o que a vista busca e mostra ───────────────────────────────
//   chave  de QUEM são os dados (id do registro, código da edição…)
//   dados  undefined = nada chegou ainda; senão a última resposta BOA
//   erro   mensagem da última tentativa que falhou, ou null
export const LEITURA_VAZIA = Object.freeze({ chave: null, dados: undefined, erro: null })

export function reduzirLeitura(estado, acao) {
  switch (acao.tipo) {
    case 'chegou':
      return { chave: acao.chave, dados: acao.dados, erro: null }
    case 'falhou':
      // Releitura que falha NUNCA apaga o que está na tela: só guarda o erro. Quem
      // ainda não tem dados é quem fica com a tela de erro (ver `bloqueada`).
      return estado.chave === acao.chave
        ? { ...estado, erro: acao.erro }
        : { chave: acao.chave, dados: undefined, erro: acao.erro }
    case 'ajustar': {
      // Registro novo que o próprio servidor acabou de devolver (valor): vale mesmo que a
      // primeira leitura ainda não tenha chegado. Ajuste local já confirmado (função): só
      // mexe nos dados do MESMO registro, e só se já houver dados.
      if (typeof acao.valor !== 'function') return { chave: acao.chave, dados: acao.valor, erro: null }
      if (estado.chave !== acao.chave || estado.dados === undefined) return estado
      return { ...estado, dados: acao.valor(estado.dados) }
    }
    default: return estado
  }
}

/** O que a tela enxerga para a chave de agora: dado de OUTRO registro nunca aparece. */
export function visaoDaLeitura(estado, chave) {
  const mesma = estado.chave === chave
  return { dados: mesma ? estado.dados : undefined, erro: mesma ? estado.erro : null }
}

/** Sem nada para mostrar e a leitura falhou: aí sim a tela inteira vira "Erro". */
export const bloqueada = (visao) => visao.dados === undefined && !!visao.erro
/** Já há conteúdo na tela e a releitura falhou: o conteúdo fica, a falha vira aviso. */
export const atualizacaoFalhou = (visao) => visao.dados !== undefined && !!visao.erro

// ── registro aberto num painel/folha que foi clicado numa lista ──────────────
/** O registro de agora na lista (fresco); se sumiu da lista, mantém o que a pessoa clicou. */
export function renovarDaLista(clicado, lista, chave = 'id') {
  if (!clicado) return null
  if (!Array.isArray(lista)) return clicado
  return lista.find((x) => x && x[chave] === clicado[chave]) || clicado
}

// ── campos de formulário ────────────────────────────────────────────────────
/** Valores do servidor prontos para <input>: vazio vira '', número vira texto, boolean fica. */
export function valoresEditaveis(registro, campos, padroes = {}) {
  const r = registro || {}
  const o = {}
  for (const c of campos) {
    const v = r[c]
    o[c] = v == null ? (c in padroes ? padroes[c] : '') : typeof v === 'number' ? String(v) : v
  }
  return o
}

/** Só o que a pessoa mexeu (local ≠ base). É isto que se manda: o resto o servidor já tem. */
export function soAlterados(base, local, campos) {
  const o = {}
  for (const c of campos) if (!igualValor((local || {})[c], (base || {})[c])) o[c] = local[c]
  return o
}

/** O que o servidor guardaria: texto sem espaço nas pontas (o banco faz o mesmo com btrim). */
export function aparar(objeto) {
  const o = {}
  for (const [k, v] of Object.entries(objeto || {})) o[k] = typeof v === 'string' ? v.trim() : v
  return o
}

// ── arquivo publicado (Arquivos › editar) ───────────────────────────────────
export const CAMPOS_ARQUIVO = ['nome', 'descricao', 'categoria', 'versao', 'exige_leitura']
export function formularioDoArquivo(arquivo) {
  const f = valoresEditaveis(arquivo, CAMPOS_ARQUIVO, { exige_leitura: false })
  f.categoria = f.categoria || 'documento'
  f.exige_leitura = !!f.exige_leitura
  return f
}

// ── material (Operação › Materiais) ─────────────────────────────────────────
/**
 * "Marcar entregue" lê o texto de quem recebeu — isso leva segundos. A linha que
 * vai para `salvar_material` (que regrava a linha inteira) tem que sair da lista
 * de AGORA, não da de quando a pessoa clicou.
 */
export function materialParaEntregar(lista, id, quem) {
  const atual = (lista || []).find((x) => x && x.id === id)
  if (!atual) return { motivo: 'sumiu' }
  if (atual.status === 'entregue') return { motivo: 'ja_entregue', atual }
  if (atual.status === 'cancelado') return { motivo: 'cancelado', atual }
  return { item: { ...atual, status: 'entregue', recebido_por: quem } }
}

// ── envio de arquivo que subiu mas não foi registrado ───────────────────────
/** Impressão digital barata do arquivo escolhido (nome, tamanho, data). */
export const impressaoDoArquivo = (f) => (f ? [f.name, f.size, f.lastModified].join('|') : '')

/**
 * O objeto JÁ está no armazenamento (o PUT deu certo) e só o registro falhou: tentar
 * de novo com o MESMO arquivo e o mesmo caminho não precisa subir outra vez (e o
 * armazenamento recusa sobrescrever). Outro arquivo ou outro caminho: sobe.
 */
export function envioReaproveitavel(ultimo, path, arquivo) {
  return !!ultimo && ultimo.path === path && ultimo.impressao === impressaoDoArquivo(arquivo)
}
