/*
 * O que o pin do mapa diz, em ordem de importância (função pura: tests/cartoon-mapa-pins.test.mjs). Vale para os dois mapas
 * (ilustrado e real): o pin tem UM SELO PRINCIPAL e cada indicador mora no SEU lugar, para nunca se sobreporem.
 *
 *   1 · selo principal (aro, canto superior direito) — UM só: carimbo pendente > casa conquistada > ainda não visitada
 *   2 · extras da conquista (aro, canto inferior direito) — "+N" revisitas; só existem em casa conquistada
 *   3 · aberto / abre em breve / fechado (ponto menor, entre o disco e a ponta, à direita) — é o horário de HOJE; o texto completo
 *       ("Combo abre em 30 min") fica no cartão da casa. Se o "+N" está à vista, ele ganha o canto e o ponto some (o nome acessível
 *       e o cartão continuam dizendo o horário)
 *   (parada da rota, número do impresso e ordem do "Perto de mim" seguem nos cantos que já tinham)
 *
 * Horário que não dá para saber (sem horário cadastrado, fora do festival) NÃO afirma aberto nem fechado: sem indicador.
 * Reaproveita `estadoAgora` (a mesma regra da ficha, do cartão e dos filtros); aqui só se decide o que desenhar.
 */
import { estadoAgora, minutosAte, JANELA_ABRE_EM_BREVE } from '../../dados/modelo.js'
import { ESTADO_TEXTO } from '../../caca/mapa/textos.js'

/** Níveis do horário no pin, do mais ao menos "agora": aberto · breve (abre em até 1 h) · fechado. */
export const NIVEIS = ['aberto', 'breve', 'fechado']

/** Frase curta do nível (nome acessível do pin e título do ponto). Minutos não entram: o pin só é redesenhado quando o nível muda. */
export const ROTULO_NIVEL = {
  aberto: 'combo disponível agora',
  breve: 'combo abre em breve',
  fechado: 'combo fora do horário agora',
}

/** Ícone do catálogo de interface de cada nível: forma diferente além da cor (check · relógio · pausa). */
export const ICONE_NIVEL = { aberto: 'sucesso', breve: 'horario', fechado: 'pausa' }

/** Nível do horário de UMA unidade agora, ou `null` quando não dá para afirmar. */
export function nivelDaUnidade (unidade, agora = new Date(), periodo = null) {
  const e = estadoAgora(unidade, agora, periodo)
  switch (e.estado) {
    case 'aberto': return 'aberto'
    case 'abre_hoje': {
      const min = minutosAte(e.as, agora)
      if (min === null) return null // horário ilegível: não afirma nada
      return min >= 1 && min <= JANELA_ABRE_EM_BREVE ? 'breve' : 'fechado'
    }
    case 'encerrado_hoje':
    case 'sem_horario_hoje': return 'fechado'
    default: return null // sem_horario · fora_do_periodo
  }
}

/** Nível da CASA (o pin é um por casa): vale a unidade mais "agora" — se uma está aberta, a casa está; só é `null` se nenhuma tem dado. */
export function nivelDaCasa (unidades = [], agora = new Date(), periodo = null) {
  let melhor = null
  for (const u of unidades) {
    const n = nivelDaUnidade(u, agora, periodo)
    if (n && (melhor === null || NIVEIS.indexOf(n) < NIVEIS.indexOf(melhor))) melhor = n
  }
  return melhor
}

/** Selo principal pela prioridade pendente > conquistada > não visitada; estado desconhecido ou `null` (sem mapa) não desenha selo. */
const PRIORIDADE = ['pendente', 'conquistada', 'nao-visitada']

/**
 * O pin inteiro: `{ selo, extras, nivel, ponto, mudou, rotulo }`.
 * `estado`: o da Caça no servidor · `revisitas`: carimbos extras · `nivel`: de nivelDaUnidade/nivelDaCasa · `mudou`: o nível acabou
 * de mudar (um pulso único) · `revisitasVisiveis`: a tela desenha o "+N" agora (o ilustrado só com zoom; o mapa real, nunca).
 * `extras` só vale com o selo "conquistada". `nivel` é o dado (vai para o nome acessível, em `rotulo`); `ponto` é o que se DESENHA:
 * o "+N" ocupa o canto de baixo e ganha do ponto do horário quando os dois aparecem juntos.
 */
export function hierarquiaDoPin ({ estado = null, revisitas = 0, nivel = null, mudou = false, revisitasVisiveis = false } = {}) {
  const selo = PRIORIDADE.includes(estado) ? estado : null
  const extras = selo === 'conquistada' && Number(revisitas) > 0 ? Math.trunc(Number(revisitas)) : 0
  const nivelOk = NIVEIS.includes(nivel) ? nivel : null
  const ponto = extras > 0 && revisitasVisiveis ? null : nivelOk
  return { selo, extras, nivel: nivelOk, ponto, mudou: !!ponto && !!mudou, rotulo: nivelOk ? ROTULO_NIVEL[nivelOk] : '' }
}

/** O que o pin acrescenta ao nome acessível do marcador do mapa real: estado na Caça, revisitas e horário de hoje (nunca só cor ou ícone). */
export function partesDoNome (pin) {
  if (!pin) return []
  const h = hierarquiaDoPin(pin)
  return [
    h.selo && ESTADO_TEXTO[h.selo].rotulo.toLowerCase(),
    h.extras > 0 && (h.extras === 1 ? '1 revisita' : `${h.extras} revisitas`),
    h.rotulo,
  ].filter(Boolean)
}

/** Assinatura dos níveis (Map chave → nível): só muda quando algum nível muda — evita refazer a tela a cada tick do relógio. */
export const assinaturaDosNiveis = (mapa) => [...mapa].map(([k, v]) => `${k}=${v ?? ''}`).sort().join('|')

/** Quais chaves mudaram de nível entre dois mapas (a primeira leitura, sem anterior, não conta como mudança). */
export function niveisQueMudaram (antes, depois) {
  const mudaram = new Set()
  if (!antes) return mudaram
  for (const [k, v] of depois) if (antes.has(k) && antes.get(k) !== v && v !== null) mudaram.add(k)
  return mudaram
}
