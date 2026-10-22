/*
 * Campanhas do Social media (21/10/2026) — lógica pura.
 * Uma campanha por postagem (ou nenhuma). O banco decide (nome repetido, cor, período, permissão — migration
 * 20261031_social_campanhas.sql); aqui a tela antecipa para não oferecer o que vai ser recusado e escreve os rótulos.
 * A cor é uma chave da MESMA paleta da pasta da Biblioteca (lib/pastas.js): uma paleta só, contraste já garantido lá.
 */
import { corValida } from './pastas.js'

export const LIMITE_NOME = 60
export const LIMITE_DESCRICAO = 300

export const CAMPANHA_VAZIA = { nome: '', cor: 'amarelo', descricao: '', inicio: '', fim: '', meta: '' }

const num = (v) => Number(v || 0)

/** Contagem do banco pode chegar como texto (bigint). Com meta, conta contra ela; sem meta, contra o planejado. */
export function progressoCampanha(c) {
  const feitas = num(c && c.n_publicadas)
  const total = num(c && c.n_total)
  const meta = num(c && c.meta)
  const plural = (n, s, p) => (n === 1 ? s : p)
  if (meta > 0) {
    return { feitas, alvo: meta, pct: Math.min(100, Math.round((feitas / meta) * 100)), rotulo: feitas + ' de ' + meta + ' ' + plural(feitas, 'publicada', 'publicadas') }
  }
  if (total > 0) {
    return { feitas, alvo: total, pct: Math.min(100, Math.round((feitas / total) * 100)), rotulo: feitas + ' ' + plural(feitas, 'publicada', 'publicadas') + ' de ' + total + ' ' + plural(total, 'planejada', 'planejadas') }
  }
  return { feitas: 0, alvo: 0, pct: 0, rotulo: 'Nenhuma postagem ainda' }
}

/** { ok, erros: { campo: frase } } — mesmas regras que o banco aplica. */
export function validarCampanha(d) {
  const erros = {}
  const nome = String((d && d.nome) || '').trim()
  if (!nome) erros.nome = 'Dê um nome à campanha.'
  else if (nome.length > LIMITE_NOME) erros.nome = 'O nome pode ter no máximo ' + LIMITE_NOME + ' caracteres.'
  if (!corValida(d && d.cor)) erros.cor = 'Escolha uma das cores da lista.'
  if (String((d && d.descricao) || '').trim().length > LIMITE_DESCRICAO) erros.descricao = 'A descrição pode ter no máximo ' + LIMITE_DESCRICAO + ' caracteres.'
  if (d && d.inicio && d.fim && d.fim < d.inicio) erros.fim = 'O fim precisa ser no mesmo dia ou depois do início.'
  const meta = String((d && d.meta) ?? '').trim()
  if (meta !== '' && !/^\d+$/.test(meta)) erros.meta = 'A meta é um número inteiro de postagens, zero ou mais.'
  return { ok: Object.keys(erros).length === 0, erros }
}

/** Formulário → o que `redes_campanha_salvar` recebe. */
export function dadosParaSalvar(d) {
  const meta = String((d && d.meta) ?? '').trim()
  return {
    nome: String((d && d.nome) || '').trim(),
    cor: d && d.cor,
    descricao: String((d && d.descricao) || '').trim(),
    inicio: (d && d.inicio) || '',
    fim: (d && d.fim) || '',
    meta: meta === '' ? '' : Number(meta),
  }
}

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Ativas pelo início (sem início depois, por nome); arquivadas por último. */
export function ordenarCampanhas(lista) {
  return [...(lista || [])].sort((a, b) => {
    if (!!a.arquivada !== !!b.arquivada) return a.arquivada ? 1 : -1
    if (a.inicio && b.inicio && a.inicio !== b.inicio) return a.inicio < b.inicio ? -1 : 1
    if (!!a.inicio !== !!b.inicio) return a.inicio ? -1 : 1
    return semAcento(a.nome).localeCompare(semAcento(b.nome), 'pt-BR')
  })
}

export function nomeCurto(nome, max = 18) {
  const t = String(nome || '').trim()
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…'
}

const dm = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '')
export function periodoTexto(c) {
  if (c && c.inicio && c.fim) return dm(c.inicio) + ' a ' + dm(c.fim)
  if (c && c.inicio) return 'a partir de ' + dm(c.inicio)
  if (c && c.fim) return 'até ' + dm(c.fim)
  return ''
}

/** A campanha como a postagem a carrega (redes_json devolve id, nome e cor). */
export function campanhaDaPostagem(post) {
  return post && post.campanha_id && post.campanha_nome ? { id: post.campanha_id, nome: post.campanha_nome, cor: post.campanha_cor } : null
}

const ERROS = {
  nome_obrigatorio: 'Dê um nome à campanha.',
  nome_longo: 'O nome pode ter no máximo ' + LIMITE_NOME + ' caracteres.',
  nome_repetido: 'Já existe uma campanha ativa com esse nome.',
  cor_invalida: 'Escolha uma das cores da lista.',
  periodo_invalido: 'Confira as datas: o fim precisa ser no mesmo dia ou depois do início.',
  meta_invalida: 'A meta é um número inteiro de postagens, zero ou mais.',
  descricao_longa: 'A descrição pode ter no máximo ' + LIMITE_DESCRICAO + ' caracteres.',
  campanha_nao_encontrada: 'Essa campanha não existe mais.',
  campanha_invalida: 'Essa campanha não está disponível (foi arquivada ou não existe). Escolha outra.',
}
/** Código do banco → frase; desconhecido → null (quem chama cai no tradutor geral). */
export const traduzirErroCampanha = (codigo) => ERROS[codigo] || null
