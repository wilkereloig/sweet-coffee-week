/*
 * Mesclagem de três vias para edição concorrente (19/10/2026). Puro.
 *
 * Quando chega uma alteração de outra pessoa enquanto este formulário está
 * aberto, nada é substituído em silêncio. Para cada campo, comparando
 *   base      = o último valor que ESTA tela viu confirmado pelo servidor
 *   local     = o que está na tela (pode ter edição não salva)
 *   servidor  = o valor atual no servidor
 * a regra é:
 *
 *   local == base            → eu não mexi: adota o do servidor (e a base acompanha)
 *   servidor == base         → ninguém mexeu: mantém o meu
 *   local == servidor        → já são iguais: só a base acompanha
 *   os três diferentes       → CONFLITO: mantém o meu e devolve o valor deles
 *
 * `local` nunca perde um caractere digitado. O conflito sobe para a tela, que
 * mostra "Esta informação mudou enquanto você editava" e deixa a pessoa escolher
 * (usar a nova / manter a minha / ver os dois).
 */
const igual = (a, b) => {
  if (a === b) return true
  if (a == null && b == null) return true                // null e undefined são "vazio"
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
  }
  return false
}

/**
 * @param {{base:object, local:object, servidor:object, campos?:string[]}} p
 * @returns {{local:object, base:object, adotados:string[], conflitos:Object<string,{meu:any, deles:any}>, mudouExterno:boolean}}
 */
export function mesclarExterno({ base, local, servidor, campos }) {
  const b = base || {}, l = local || {}, s = servidor || {}
  const lista = campos || [...new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(s)])]
  const novoLocal = { ...l }
  const novaBase = { ...b }
  const adotados = []
  const conflitos = {}
  let mudouExterno = false
  for (const c of lista) {
    const eu = igual(l[c], b[c]) ? 'parado' : 'editei'
    const eles = igual(s[c], b[c]) ? 'parado' : 'mudou'
    if (eles === 'parado') continue                         // ninguém mexeu: nada a fazer
    mudouExterno = true
    if (igual(l[c], s[c])) { novaBase[c] = s[c]; continue } // coincidiu
    if (eu === 'parado') { novoLocal[c] = s[c]; novaBase[c] = s[c]; adotados.push(c); continue }
    conflitos[c] = { meu: l[c], deles: s[c] }               // base fica: o salvamento ainda enxerga a diferença
  }
  return { local: novoLocal, base: novaBase, adotados, conflitos, mudouExterno }
}

/** O usuário escolheu "usar o da organização" num campo em conflito. */
export function adotarDeles(estado, campo) {
  const c = estado.conflitos[campo]
  if (!c) return estado
  const { [campo]: _, ...resto } = estado.conflitos
  return { ...estado, local: { ...estado.local, [campo]: c.deles }, base: { ...estado.base, [campo]: c.deles }, conflitos: resto }
}

/** O usuário escolheu "manter o meu": a base passa a ser o valor deles (o meu será o salvo por cima). */
export function manterMeu(estado, campo) {
  const c = estado.conflitos[campo]
  if (!c) return estado
  const { [campo]: _, ...resto } = estado.conflitos
  return { ...estado, base: { ...estado.base, [campo]: c.deles }, conflitos: resto }
}

/*
 * Estado de UM registro em edição (formulário aberto sobre dado do servidor).
 * Reducer puro — a camada React (useRegistroEditavel, react.js) só o aplica.
 *   · servidor  chegou valor novo do servidor (releitura): mescla em três vias
 *   · editar    a pessoa digitou
 *   · salvou    o servidor confirmou uma gravação desta tela (base acompanha)
 *   · adotar / manter / adotarTodos / manterTodos   resolução de conflito
 *   · dispensar fecha o aviso "atualizamos estes campos"
 */
export const igualValor = igual

export function iniciarRegistro(servidor, campos) {
  const lista = campos || Object.keys(servidor || {})
  const base = {}
  for (const c of lista) base[c] = (servidor || {})[c]
  return { campos: lista, base, local: { ...base }, conflitos: {}, adotados: [], mudouExterno: false }
}

export function reduzirRegistro(estado, acao) {
  switch (acao.tipo) {
    case 'servidor': {
      const m = mesclarExterno({ base: estado.base, local: estado.local, servidor: acao.servidor, campos: estado.campos })
      return {
        ...estado, base: m.base, local: m.local, conflitos: m.conflitos,
        adotados: m.mudouExterno ? [...new Set([...estado.adotados, ...m.adotados])] : estado.adotados,
        mudouExterno: estado.mudouExterno || m.mudouExterno,
      }
    }
    case 'editar':
      return { ...estado, local: { ...estado.local, [acao.campo]: acao.valor } }
    case 'salvou': {
      const base = { ...estado.base }
      for (const c of estado.campos) if (c in (acao.servidor || {})) base[c] = acao.servidor[c]
      // o que foi salvo deixa de ser conflito; o que a pessoa digitou DURANTE o salvamento continua no local
      const conflitos = {}
      for (const [c, v] of Object.entries(estado.conflitos)) if (!igual(estado.local[c], base[c]) && !igual(v.deles, estado.local[c])) conflitos[c] = v
      return { ...estado, base, conflitos }
    }
    case 'adotar': return { ...estado, ...adotarDeles(estado, acao.campo) }
    case 'manter': return { ...estado, ...manterMeu(estado, acao.campo) }
    case 'adotarTodos': return Object.keys(estado.conflitos).reduce((e, c) => ({ ...e, ...adotarDeles(e, c) }), estado)
    case 'manterTodos': return Object.keys(estado.conflitos).reduce((e, c) => ({ ...e, ...manterMeu(e, c) }), estado)
    case 'dispensar': return { ...estado, adotados: [], mudouExterno: Object.keys(estado.conflitos).length > 0 }
    case 'reiniciar': return iniciarRegistro(acao.servidor, estado.campos)
    default: return estado
  }
}

/** Há edição não salva? (local ≠ base em algum campo) */
export function registroSujo(estado) {
  return estado.campos.some((c) => !igual(estado.local[c], estado.base[c]))
}
