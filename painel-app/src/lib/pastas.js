/*
 * Pastas da Biblioteca do Social media (17/10/2026) — lógica pura.
 * As pastas são VIRTUAIS (20261019_social_pastas.sql): organizam referências
 * (tipo, id) ao material; nenhum objeto do Storage muda de lugar. O banco é
 * quem decide (ciclo, nome repetido, permissão); aqui a tela antecipa para
 * não oferecer o que vai ser recusado.
 */

export const LIMITE_NOME = 80
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const chaveNome = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase()

/** { porId, filhos } — `filhos.get(null)` são as pastas da raiz. */
export function indexar(pastas = []) {
  const porId = new Map(pastas.map((p) => [p.id, p]))
  const filhos = new Map()
  for (const p of pastas) {
    const pai = p.pai_id && porId.has(p.pai_id) ? p.pai_id : null
    if (!filhos.has(pai)) filhos.set(pai, [])
    filhos.get(pai).push(p)
  }
  return { porId, filhos }
}

/** Da raiz até a pasta (inclusive). Pasta inexistente → []. Laço no dado → corta. */
export function caminho(porId, id) {
  const r = []
  const vistos = new Set()
  let p = id ? porId.get(id) : null
  while (p && !vistos.has(p.id)) { vistos.add(p.id); r.unshift(p); p = p.pai_id ? porId.get(p.pai_id) : null }
  return r
}
export const textoCaminho = (porId, id) => ['Biblioteca', ...caminho(porId, id).map((p) => p.nome)].join(' › ')

/** A pasta e todas as que estão dentro dela (destinos proibidos ao mover essa pasta). */
export function descendentes(filhos, id) {
  const r = new Set([id])
  const fila = [id]
  while (fila.length) for (const f of filhos.get(fila.shift()) || []) if (!r.has(f.id)) { r.add(f.id); fila.push(f.id) }
  return r
}

/** Nome de pasta: sem vazio, sem "/", até 80, sem repetir (maiúsculas não contam) no mesmo nível. */
export function validarNome(nome, irmas = [], ignorarId = null) {
  const n = String(nome || '').trim().replace(/\s+/g, ' ')
  if (!n) return { ok: false, erro: 'Dê um nome à pasta.' }
  if (n.length > LIMITE_NOME) return { ok: false, erro: 'Use até ' + LIMITE_NOME + ' caracteres.' }
  if (n.includes('/')) return { ok: false, erro: 'O nome não pode ter “/”.' }
  if (irmas.some((p) => p.id !== ignorarId && chaveNome(p.nome) === chaveNome(n))) return { ok: false, erro: 'Já existe uma pasta “' + n + '” aqui.' }
  return { ok: true, nome: n }
}

/** Ordem: 'nome' (A–Z, sem acento) ou 'recente' (mais nova/atualizada primeiro). */
export function ordenarPastas(lista = [], ordem = 'nome') {
  return [...lista].sort((a, b) => (ordem === 'recente'
    ? String(b.atualizada_em || b.criada_em || '').localeCompare(String(a.atualizada_em || a.criada_em || ''))
    : semAcento(a.nome).localeCompare(semAcento(b.nome))))
}

/** Pastas cujo nome contém a busca (em qualquer nível). */
export function buscarPastas(pastas = [], q = '') {
  const t = semAcento(q).trim()
  return t ? pastas.filter((p) => semAcento(p.nome).includes(t)) : []
}

/**
 * Destinos para "Mover para…": a árvore inteira, em ordem, com o nível de
 * recuo. Movendo uma PASTA, ela e as de dentro saem (ciclo); a pasta-mãe
 * atual fica marcada como "onde já está".
 */
export function arvoreDestinos(pastas = [], { moverPasta = null } = {}) {
  const { filhos } = indexar(pastas)
  const proibidas = moverPasta ? descendentes(filhos, moverPasta) : new Set()
  const r = []
  const visitar = (pai, nivel) => {
    for (const p of ordenarPastas(filhos.get(pai) || [])) {
      r.push({ ...p, nivel, proibida: proibidas.has(p.id) })
      if (!proibidas.has(p.id)) visitar(p.id, nivel + 1)
    }
  }
  visitar(null, 0)
  return r
}

/** Item da biblioteca como referência estável (o que o banco recebe ao mover). */
export const refItem = (x) => ({ tipo: x.tipo, id: x.id })
export const chaveItem = (x) => x.tipo + ':' + x.id

/*
 * COR da pasta (21/10/2026, pedido do Wilker): uma chave da PALETA da marca, nunca cor livre — contraste e
 * coerência garantidos. A lista é a de `social_pastas_cor_check` (20261025_social_pastas_cor.sql; há teste que
 * reprova divergência). `tinta` é a cor do ícone SOBRE o disco da pasta (creme sobre roxo, marrom e magenta;
 * chocolate sobre o resto — a mesma regra do acento dos módulos). Sem cor = acento do módulo (o de antes).
 */
export const CORES_PASTA = [
  { chave: 'amarelo', rotulo: 'Amarelo', tinta: 'choco' },
  { chave: 'laranja', rotulo: 'Laranja', tinta: 'choco' },
  { chave: 'magenta', rotulo: 'Magenta', tinta: 'creme' },
  { chave: 'roxo', rotulo: 'Roxo', tinta: 'creme' },
  { chave: 'cyan', rotulo: 'Ciano', tinta: 'choco' },
  { chave: 'verde', rotulo: 'Verde', tinta: 'choco' },
  { chave: 'marrom', rotulo: 'Marrom', tinta: 'creme' },
]
const COR = Object.fromEntries(CORES_PASTA.map((c) => [c.chave, c]))
export const corValida = (cor) => !!cor && Object.prototype.hasOwnProperty.call(COR, cor)
export const rotuloCor = (cor) => (corValida(cor) ? COR[cor].rotulo : 'Padrão')
/** Variáveis CSS do disco da pasta; sem cor (ou desconhecida) → nada, e o CSS cai no acento do módulo. */
export const estiloPasta = (cor) => (corValida(cor) ? { '--pasta-cor': 'var(--scw-' + cor + ')', '--pasta-tinta': 'var(--scw-' + COR[cor].tinta + ')' } : undefined)
