/*
 * Caça aos Carimbos — regras puras da interface (testadas em tests/cartoon-caca-regras.test.mjs).
 * Aqui só se DECIDE o que mostrar; a regra do jogo (o que vale, ranking, prazos) mora no banco e a tela só a explica.
 * Nenhum número do festival é escrito aqui: o total de casas vem sempre do servidor (`total_casas`) ou da edição.
 */

/** Token de convite do grupo (24 bytes em base64url = 32 caracteres hoje; aceita margem se o servidor mudar). */
export const FORMATO_TOKEN = /^[A-Za-z0-9_-]{16,64}$/
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const tokenValido = (t) => typeof t === 'string' && FORMATO_TOKEN.test(t)
export const grupoIdValido = (id) => typeof id === 'string' && FORMATO_UUID.test(id)

/** Seções da Caça (segundo segmento do caminho `/cartoon/caca/<seção>`). `grupo` e `convite` levam um terceiro segmento. */
export const SECOES_SIMPLES = ['recuperar', 'mapa', 'ranking', 'grupos', 'metas', 'compartilhar', 'delivery']

const num = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

/** O progresso do mapa v2 em números seguros para a tela. */
export function resumoProgresso (mapa) {
  const total = num(mapa?.total_casas)
  const validadas = num(mapa?.casas_validadas)
  const casas = Array.isArray(mapa?.casas) ? mapa.casas : []
  const emp = num(mapa?.empatados)
  return {
    total, validadas, faltam: mapa?.faltam == null ? Math.max(total - validadas, 0) : num(mapa.faltam),
    extras: num(mapa?.extras),
    posicao: Number.isFinite(Number(mapa?.posicao)) && Number(mapa?.posicao) > 0 ? Math.trunc(Number(mapa.posicao)) : null,
    comEmpate: Math.max(emp - 1, 0), // `empatados` conta a própria pessoa
    pendentes: casas.filter((c) => c?.estado === 'pendente').length,
    completo: total > 0 && validadas >= total,
  }
}

/**
 * A próxima ação útil da central (spec §9):
 *   comecar   — nenhuma casa carimbada ainda ("Escolha uma casa para começar");
 *   avaliar   — há carimbo pendente: leva direto à avaliação da casa mais recente (`mais` = quantas outras esperam);
 *   completo  — todas as casas validadas;
 *   continuar — o resto.
 */
export function proximaAcao (mapa) {
  const casas = Array.isArray(mapa?.casas) ? mapa.casas : []
  const pendentes = casas.filter((c) => c?.estado === 'pendente' && typeof c.slug === 'string')
  if (pendentes.length) return { tipo: 'avaliar', slug: pendentes[0].slug, mais: pendentes.length - 1 }
  const r = resumoProgresso(mapa)
  if (r.completo) return { tipo: 'completo' }
  if (casas.length === 0 && r.validadas === 0) return { tipo: 'comecar' }
  return { tipo: 'continuar' }
}

/** Nome da casa pelo slug, na lista da edição; sem lista (ainda carregando), "a casa". */
export function nomeDaCasa (dados, slug) {
  return (dados?.participantes || []).find((p) => p.slug === slug)?.casa?.nome || 'a casa'
}

/** Situação do e-mail do mapa a partir de `emailStatus`: 'confirmado' · 'pendente' · 'desconhecido' (sem resposta ou chave trocada). */
export function situacaoEmail (resp) {
  if (!resp?.ok || resp.valido === false) return 'desconhecido'
  return resp.confirmado ? 'confirmado' : 'pendente'
}

/** "ana@exemplo.com" → "a**@exemplo.com" (o dono vê o próprio e-mail sem deixá-lo inteiro na tela). */
export function emailMascarado (email) {
  const [local, dominio] = String(email || '').split('@')
  if (!local || !dominio) return ''
  return `${local.charAt(0)}${'*'.repeat(Math.min(Math.max(local.length - 1, 1), 6))}@${dominio}`
}

/**
 * Ajuda quando a localização não deixou carimbar. `r` = resposta do carimbo com `posicao` (erro do navegador:
 * 'negada' · 'indisponivel' · 'demorou') e/ou `precisao` (metros). Devolve null quando não é caso de localização.
 */
export function ajudaLocalizacao (r) {
  const pos = r?.posicao
  const imprecisa = r?.motivo === 'longe' && Number.isFinite(r?.precisao) && r.precisao > 100
  if (r?.motivo !== 'sem_localizacao' && !imprecisa) return null
  const titulo = imprecisa ? 'O sinal de localização está fraco'
    : pos === 'negada' ? 'O navegador bloqueou a localização'
      : pos === 'demorou' ? 'A localização demorou demais'
        : pos === 'indisponivel' ? 'Este aparelho não conseguiu a localização'
          : 'Precisamos da sua localização'
  const dist = imprecisa && Number.isFinite(r?.distancia_m) ? ` O celular a coloca a cerca de ${Math.round(r.distancia_m / 10) * 10} m da casa.` : ''
  const texto = imprecisa
    ? `O celular informou uma margem de cerca de ${Math.round(r.precisao)} m, grande demais para conferir que você está na casa.${dist} Vá para perto da entrada ou do balcão, espere uns segundos e tente de novo.`
    : pos === 'negada' ? 'O carimbo só confere que você está na casa e não guarda sua posição. Libere a localização para este site e tente de novo.'
      : pos === 'demorou' ? 'Em lugar fechado o sinal chega devagar. Chegue perto da entrada ou de uma janela, espere uns segundos e tente de novo.'
        : 'Ligue a localização do celular, confira se o navegador tem permissão e tente de novo.'
  const passos = [
    ['No iPhone', 'Ajustes › Privacidade e Segurança › Serviços de Localização (ligado) › Safari ou Chrome › "Durante o Uso" e "Localização Precisa" ligada.'],
    ['No Android', 'toque no cadeado ao lado do endereço do site › Permissões › Localização › Permitir. Depois, nas configurações do celular, ligue a Localização e a "precisão alta" (GPS).'],
    ['Abriu pelo Instagram ou outro app?', 'toque em "Abrir no navegador" e carimbe por lá: o navegador do app costuma bloquear a localização.'],
  ]
  return { titulo, texto, passos }
}

/**
 * Aparelho pelo user agent: `plataforma` ('iphone' · 'android' · 'outro') e `app` (navegador embutido de rede social, que costuma
 * bloquear a localização). Só para escolher QUAL ajuda mostrar primeiro; nada é guardado nem enviado.
 */
export function aparelhoDoNavegador (ua = '') {
  const u = String(ua || '')
  return {
    plataforma: /iPhone|iPad|iPod/i.test(u) ? 'iphone' : /Android/i.test(u) ? 'android' : 'outro',
    app: /Instagram|FBAN|FBAV|FB_IAB|Line\/|musical_ly|TikTok|Snapchat|MicroMessenger/i.test(u),
  }
}

/**
 * Separa os passos de `ajudaLocalizacao` em os do aparelho da pessoa (à vista) e os dos outros (recolhidos): quem está no Android
 * não precisa ler o caminho do iPhone. Em aplicativo (Instagram…), "abrir no navegador" vem primeiro. Aparelho desconhecido: tudo à vista.
 */
export function passosParaAparelho (passos = [], aparelho = { plataforma: 'outro', app: false }) {
  const [iphone, android, app] = passos
  const proprio = aparelho.plataforma === 'iphone' ? iphone : aparelho.plataforma === 'android' ? android : null
  if (!proprio && !aparelho.app) return { principais: passos.filter(Boolean), outros: [] }
  const principais = [aparelho.app ? app : null, proprio].filter(Boolean)
  return { principais, outros: passos.filter((p) => p && !principais.includes(p)) }
}
