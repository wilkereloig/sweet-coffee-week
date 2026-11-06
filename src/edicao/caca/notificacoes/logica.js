/*
 * Avisos por notificação (spec 15 §13) — lógica pura. O navegador, a permissão e o banco ficam em aparelho.js e AvisosPush.jsx.
 * Consentimento: nada é pedido ao abrir a Caça. A permissão só é pedida no clique de "Ativar", e as categorias são escolhidas antes.
 */

/** Padrão do servidor na primeira assinatura (contrato metas-push §4): divulgação da edição só por escolha. */
export const PREFS_PADRAO = Object.freeze({ avaliacao_pendente: true, meta: true, grupo: true, edicao: false, voucher: false, imprevisto: true, incentivo: true, premio: true, campanha: false })
export const CHAVES_PREFS = Object.keys(PREFS_PADRAO)
export const TODAS_PREFS = Object.freeze(Object.fromEntries(CHAVES_PREFS.map((k) => [k, true])))

/** Só as chaves booleanas conhecidas (as de PREFS_PADRAO); o resto é ignorado (o servidor faz o mesmo). */
export function normalizarPrefs (p) {
  const saida = { ...PREFS_PADRAO }
  for (const k of CHAVES_PREFS) if (typeof p?.[k] === 'boolean') saida[k] = p[k]
  return saida
}

/**
 * O que a interface oferece, a partir do que o aparelho diz.
 *   nao-suportado · ios-instalar (iPhone só recebe com o app instalado) · bloqueada · desligado (pode pedir) · ligado
 */
export function estadoDoPush ({ suportado, ios = false, instalado = false, permissao = 'default', assinado = false }) {
  if (!suportado) return ios && !instalado ? 'ios-instalar' : 'nao-suportado'
  if (permissao === 'denied') return 'bloqueada'
  return assinado && permissao === 'granted' ? 'ligado' : 'desligado'
}

/**
 * Central de avisos (servidor): só avisos bem formados, mais novos primeiro, no máximo 60. O destino só vale se for caminho
 * interno da Caça (o servidor já garante; aqui é a segunda trava para nunca virar link para fora).
 */
export function organizarAvisos (lista) {
  if (!Array.isArray(lista)) return []
  return lista
    .filter((a) => a && typeof a.id === 'string' && typeof a.titulo === 'string' && typeof a.corpo === 'string')
    .map((a) => ({
      id: a.id,
      categoria: String(a.categoria || ''),
      urgente: a.urgente === true,
      titulo: a.titulo.slice(0, 80),
      corpo: a.corpo.slice(0, 240),
      destino: destinoSeguro(a.destino),
      quando: typeof a.quando === 'string' ? a.quando : '',
      visto: a.visto === true
    }))
    .sort((x, y) => (x.quando < y.quando ? 1 : x.quando > y.quando ? -1 : 0))
    .slice(0, 60)
}

/** Única saída da Caça permitida (o painel de Prêmios do mapa); espelha a constraint do banco e o service worker. */
export const DESTINO_PREMIOS = '/cartoon/mapa?painel=premios'

/** Página da campanha Ter com quem contar (Sicredi): o destino do aviso da categoria `campanha` (migration 20261234). */
export const DESTINO_CAMPANHA = '/cartoon/ter-com-quem-contar'

/** Caminho interno dentro de /cartoon/caca, o painel de Prêmios ou a página da campanha; qualquer outra coisa vira null (sem botão de abrir). */
export function destinoSeguro (url) {
  if (url === DESTINO_PREMIOS || url === DESTINO_CAMPANHA) return url
  if (typeof url !== 'string' || !/^\/(?!\/)[A-Za-z0-9/_-]*$/.test(url)) return null
  return url === '/cartoon/caca' || url.startsWith('/cartoon/caca/') ? url : null
}

/** "5 nov., 14:30" no fuso de Natal, ou '' se a data não for válida. */
export function quandoCurto (iso) {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
}

/** Erro lançado por ligarAvisos / pela chamada ao banco → o que a tela mostra. */
export function classificarErroPush (e) {
  const msg = String(e?.message || '')
  if (msg === 'bloqueado') return { tipo: 'bloqueada' }
  if (msg === 'sem_resposta') return { tipo: 'sem-resposta' }
  if (typeof e?.motivo === 'string') return { tipo: 'motivo', motivo: e.motivo }
  return { tipo: 'erro' }
}
