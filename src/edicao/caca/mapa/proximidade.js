/*
 * Sugestão da próxima casa perto da pessoa (07/11/2026). Funções puras (tests/cartoon-caca-perto.test.mjs).
 *
 * A sugestão AJUDA A ESCOLHER: não marca visita, não cria carimbo, não avalia, não altera a rota. A posição só entra aqui como
 * argumento: nada é guardado nem enviado. A única coisa lembrada no aparelho são escolhas da pessoa (ligar/desligar a sugestão,
 * adiar o convite, "agora não" para uma casa) — nunca coordenadas. Veja docs/cartoon-2026-2/16-perto-de-mim-sugestao.md.
 *
 * Regras de prioridade (nesta ordem):
 *   1. Sem posição válida → nenhuma sugestão ('sem-posicao').
 *   2. Só casas com combo cadastrado e com ponto no mapa (lat/lng). O desenho do mapa ilustrado NUNCA é fonte de distância.
 *   3. Com o mapa da pessoa lido: só casas AINDA NÃO VISITADAS (carimbo pendente pede avaliar, e conquistada já está feita).
 *      Sem mapa lido não dá para saber: nenhuma casa é descartada por estado.
 *   4. Impedimento confirmado de funcionamento tira a unidade: combo encerrado hoje ou sem combo hoje. Horário não informado
 *      ('sem_horario') ou fora do período NÃO impede, mas também NUNCA vira "aberta": a tela diz "horário a confirmar".
 *   5. Casa com várias unidades: vale a unidade elegível mais perto.
 *   6. Rota com paradas pendentes: a rota manda e não muda. As casas dela não são sugeridas; a sugestão vira "opção" (modo 'opcao').
 *   7. Casa dispensada hoje ("agora não") não volta no mesmo dia.
 *   8. Ordem: a mais perto em linha reta; empate em até 100 m → aberta agora, depois abre hoje, depois horário a confirmar,
 *      depois ponto conferido. Ponto aproximado (`coordenada.conferir`) entra, mas é dito aproximado.
 *   9. Posição com margem de erro acima de 1,5 km: a sugestão sai SEM distância (não se inventa precisão).
 *  10. A casa mais perto a mais de 60 km: 'longe' (a pessoa não está na cidade; "perto" não faria sentido).
 */
import { km as kmEntre, estadoAgora, hojeEmNatal } from '../../dados/modelo.js'

export const PRECISAO_MAXIMA_M = 1500
export const LIMITE_LONGE_KM = 60
const EMPATE_KM = 0.1
const FECHADAS = ['encerrado_hoje', 'sem_horario_hoje']
const ORDEM_ESTADO = { aberto: 0, abre_hoje: 1 }

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
export const posicaoValida = (p) => !!p && numero(p.lat) !== null && numero(p.lng) !== null && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180

/**
 * @param {object} a
 * @param {Array}  a.lista               participantes ({ slug, casa, combo, unidades[] }) da edição
 * @param {object} a.posicao             { lat, lng, precisao? (m) } — só na memória da página
 * @param {Function} [a.estadoDe]        slug → 'nao-visitada' | 'pendente' | 'conquistada' do SERVIDOR; ausente = mapa não lido
 * @param {Array}  [a.paradasPendentes]  slugs da rota que ainda faltam; vazio = sem rota planejada
 * @param {object} [a.periodo]           { inicio, fim } da edição
 * @param {Set}    [a.dispensadas]       slugs que a pessoa dispensou hoje
 * @param {Date}   [a.agora]
 * @returns {{tipo:'sugestao', modo:'sozinha'|'opcao', slug, unidadeId, casa, unidade, bairro, comboNome, foto, km:number|null,
 *   distanciaConfiavel:boolean, aproximada:boolean, semPonto:false, disponibilidade:object}
 *   | {tipo:'nenhuma', motivo:string, km?:number}}
 */
export function sugerirProximaCasa ({ lista = [], posicao = null, estadoDe = null, paradasPendentes = [], periodo = null, dispensadas = new Set(), agora = new Date() } = {}) {
  if (!posicaoValida(posicao)) return { tipo: 'nenhuma', motivo: 'sem-posicao' }
  const naRota = new Set(paradasPendentes)
  const comRota = naRota.size > 0
  const confiavel = numero(posicao.precisao) === null || posicao.precisao <= PRECISAO_MAXIMA_M

  const candidatas = []
  let fechadas = 0
  let jaFeitas = 0
  let daRota = 0
  let dispensadasHoje = 0
  let comCombo = 0
  for (const p of lista) {
    if (!p?.combo || !(p.unidades || []).length) continue
    comCombo++
    if (naRota.has(p.slug)) { daRota++; continue }
    if (dispensadas.has(p.slug)) { dispensadasHoje++; continue }
    // Estado na Caça: `estadoDe(slug)` ('nao-visitada' | 'pendente' | 'conquistada' | null) quando o mapa foi lido.
    const estado = estadoDe ? estadoDe(p.slug) : null
    if (estado && estado !== 'nao-visitada') { jaFeitas++; continue }
    let melhor = null
    for (const u of p.unidades) {
      const c = u.coordenada
      if (!c || numero(c.lat) === null || numero(c.lng) === null) continue
      const disponibilidade = estadoAgora(u, agora, periodo)
      if (FECHADAS.includes(disponibilidade.estado)) { fechadas++; continue }
      const d = kmEntre(posicao, c)
      if (!Number.isFinite(d)) continue
      if (!melhor || d < melhor.d) melhor = { p, u, d, disponibilidade, aproximada: !!c.conferir }
    }
    if (melhor) candidatas.push(melhor)
  }

  if (!candidatas.length) {
    const motivo = !comCombo ? 'sem-casas'
      : fechadas ? 'todas-fechadas'
        : jaFeitas && !daRota && !dispensadasHoje ? 'todas-conquistadas'
          : daRota ? 'so-na-rota'
            : dispensadasHoje ? 'dispensadas'
              : 'sem-ponto'
    return { tipo: 'nenhuma', motivo }
  }

  candidatas.sort((a, b) => {
    if (Math.abs(a.d - b.d) > EMPATE_KM) return a.d - b.d
    const ea = ORDEM_ESTADO[a.disponibilidade.estado] ?? 2
    const eb = ORDEM_ESTADO[b.disponibilidade.estado] ?? 2
    if (ea !== eb) return ea - eb
    if (a.aproximada !== b.aproximada) return a.aproximada ? 1 : -1
    return a.d - b.d
  })
  const { p, u, d, disponibilidade, aproximada } = candidatas[0]
  if (d > LIMITE_LONGE_KM) return { tipo: 'nenhuma', motivo: 'longe', km: d }
  return {
    tipo: 'sugestao',
    modo: comRota ? 'opcao' : 'sozinha',
    slug: p.slug,
    unidadeId: u.id,
    casa: p.casa?.nome || '',
    unidade: u.nome && u.nome !== p.casa?.nome ? u.nome : '',
    bairro: u.endereco?.bairro || '',
    comboNome: p.combo?.nome || '',
    foto: p.combo?.fotos?.principal || null,
    km: confiavel ? d : null,
    distanciaConfiavel: confiavel,
    aproximada,
    disponibilidade,
    participante: p,
    unidadeDados: u,
  }
}

// ---------------------------------------------------------------- o que a pessoa escolheu (nunca coordenadas)
const CHAVE_PREFERENCIA = 'scw_perto_sugestoes'
const CHAVE_CONVITE = 'scw_perto_convite'
const CHAVE_DISPENSAS = 'scw_perto_dispensas'
const CHAVE_CONCEDIDA = 'scw_perto_concedida'
export const DIAS_DO_CONVITE_ADIADO = 7

const abrir = (fn, padrao) => { try { return fn() } catch { return padrao } }
const guardado = () => abrir(() => globalThis.localStorage || null, null)

/** 'ligada' (padrão) ou 'desligada'. Desligar também para a leitura automática da posição ao abrir o mapa. */
export function sugestoesLigadas (armazem = guardado()) {
  return abrir(() => armazem?.getItem(CHAVE_PREFERENCIA), null) !== 'desligada'
}
export function ligarSugestoes (ligadas, armazem = guardado()) {
  abrir(() => armazem?.setItem(CHAVE_PREFERENCIA, ligadas ? 'ligada' : 'desligada'))
  return ligadas
}

/**
 * A pessoa já deixou a localização ser lida neste aparelho (07/11/2026). Guarda só a DATA da concessão, nunca coordenadas.
 * Vale mais que o estado da Permissions API: o Safari do iPhone costuma responder "prompt" mesmo depois de liberada, e sem esta
 * lembrança o convite voltava a cada visita. Recusa (código 1 do navegador) apaga a lembrança e o convite volta a poder aparecer.
 */
export function localizacaoConcedida (armazem = guardado()) {
  return !!abrir(() => armazem?.getItem(CHAVE_CONCEDIDA), null)
}
export function lembrarLocalizacao (concedida, armazem = guardado(), agora = new Date()) {
  abrir(() => (concedida ? armazem?.setItem(CHAVE_CONCEDIDA, agora.toISOString()) : armazem?.removeItem(CHAVE_CONCEDIDA)))
  return concedida
}

/** O convite de localização foi adiado ("agora não") há menos de 7 dias? Guarda só a data da escolha. */
export function conviteAdiado (armazem = guardado(), agora = new Date()) {
  const quando = abrir(() => Date.parse(armazem?.getItem(CHAVE_CONVITE) || ''), NaN)
  return Number.isFinite(quando) && agora.getTime() - quando < DIAS_DO_CONVITE_ADIADO * 86400000
}
export function adiarConvite (armazem = guardado(), agora = new Date()) {
  abrir(() => armazem?.setItem(CHAVE_CONVITE, agora.toISOString()))
}

/** Casas que a pessoa dispensou HOJE (dia de Natal). Dia diferente = lista nova: dispensa vale um dia. */
export function casasDispensadas (armazem = guardado(), agora = new Date()) {
  const dia = hojeEmNatal(agora)
  const salvo = abrir(() => JSON.parse(armazem?.getItem(CHAVE_DISPENSAS) || 'null'), null)
  return new Set(salvo && salvo.dia === dia && Array.isArray(salvo.slugs) ? salvo.slugs.filter((s) => typeof s === 'string') : [])
}
export function dispensarCasa (slug, armazem = guardado(), agora = new Date()) {
  const atuais = casasDispensadas(armazem, agora)
  atuais.add(slug)
  abrir(() => armazem?.setItem(CHAVE_DISPENSAS, JSON.stringify({ dia: hojeEmNatal(agora), slugs: [...atuais] })))
  return atuais
}
