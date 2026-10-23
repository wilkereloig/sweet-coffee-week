/*
 * Arquivos da marca — o que a TELA decide (22/10/2026), em lógica pura, sem DOM:
 * testada em tests/painel-app-arquivos-marca.test.mjs.
 *
 *  · o que pede leitura vai para o topo, separado do que é "novo";
 *  · "novo" NÃO é "ainda não aberto": o banco não guarda quem abriu um arquivo
 *    (`arquivo_leitura` só existe para o que exige confirmação). Novo = publicado
 *    há até 7 dias, e a tela não diz mais do que isso;
 *  · Abrir (mostrar no navegador) × Baixar (pedir o download), por tipo de arquivo;
 *  · o que a tela diz sobre o que vai acontecer em cada aparelho — sem prometer
 *    "salvo": quem guarda o arquivo é o navegador.
 *
 * Categorias, tamanho e formato continuam em arquivos.js (uma fonte só).
 */
import { agruparPorCategoria, tamanhoLegivel, tipoLegivel } from './arquivos.js'
import { dataBr } from './inicioMarca.js'

export const DIAS_NOVO = 7
const DIA = 86400000

const ms = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v))
const quando = (a) => (a && (a.publicado_em || a.created_at)) || null
const maisRecentePrimeiro = (a, b) => (ms(quando(b)) || 0) - (ms(quando(a)) || 0)

/** Publicado há até 7 dias. Data futura ou ilegível: não é novo. */
export function ehNovo(a, agora = new Date()) {
  const t = ms(quando(a))
  const n = ms(agora)
  return Number.isFinite(t) && Number.isFinite(n) && n - t >= 0 && n - t <= DIAS_NOVO * DIA
}

/**
 * Exige leitura e a marca ainda não confirmou ESTA versão: sem leitura, ou leitura anterior à publicação atual (o
 * arquivo foi substituído depois — `publicadoDepoisDaLeitura`). A MESMA regra do Início (`arquivosParaLer`/`fotosParaLer`)
 * e da conferência das fotos oficiais (fotosMarca.js › `situacaoDaConferencia`).
 */
export const leituraVale = (a, lidoEm) => !!lidoEm && !publicadoDepoisDaLeitura(a, lidoEm)
export const precisaLeitura = (a, lidos) => !!(a && a.exige_leitura) && !leituraVale(a, lidos && lidos[a.id])

/**
 * `arquivo_leitura` da marca → { arquivo_id: lido_em mais recente }. A RLS devolve as linhas de TODAS as participações dela
 * (uma por participação), em ordem nenhuma: o mesmo arquivo geral pode vir mais de uma vez, e vale a leitura mais recente —
 * com "o último ganha", uma leitura antiga reabriria a pendência de um arquivo já confirmado.
 */
export function mapaDeLeituras(linhas) {
  const o = {}
  for (const l of linhas || []) {
    if (!l || !l.arquivo_id) continue
    if (!(l.arquivo_id in o) || (ms(l.lido_em) || 0) > (ms(o[l.arquivo_id]) || 0)) o[l.arquivo_id] = l.lido_em
  }
  return o
}

/**
 * O que a ficha da EQUIPE diz sobre a leitura de um arquivo (`a` = item de `get_ficha_participacao`, com `publicado_em` e `lido_em`):
 * a mesma regra da marca — leitura anterior à versão atual não vale, e a ficha não pode dizer "leu" enquanto a marca vê "pendente".
 */
export function leituraNaFicha(a, formatarData, semLeitura = 'ainda não confirmou a leitura') {
  if (!a || !a.exige_leitura) return 'sem confirmação de leitura'
  if (!a.lido_em) return semLeitura
  return leituraVale(a, a.lido_em)
    ? 'leu em ' + formatarData(a.lido_em)
    : 'leu a versão anterior em ' + formatarData(a.lido_em) + '; falta confirmar a atual'
}

/**
 * As solicitações da organização sobre arquivos (`solicitacoes.bloco = 'arquivo'`) que `resumoMarca` (guia.js) já conta
 * no selo da aba Arquivos. Só `pedido`: o que pede leitura (`tipo: 'arquivo'`) a tela já mostra em "Para ler e confirmar".
 */
export function pendenciasDeArquivos(resumo) {
  if (!resumo || !Array.isArray(resumo.pendencias)) return []
  return resumo.pendencias.filter((p) => p.tipo === 'pedido' && p.vista === 'arquivos')
}

/**
 * Lista → o que vai no topo (para ler) + as categorias de sempre com o resto.
 * `lidos` = { [arquivo_id]: lido_em }; `null` = a leitura das confirmações falhou ou ainda não veio:
 * sem ela não dá para dizer o que está pendente, então nada é chutado como pendente.
 * `mantidos` = ids (Set) confirmados NESTA visita: ficam no topo, já como "confirmado", até a tela ser reaberta —
 * o item que a pessoa acabou de tocar não pula para uma categoria lá embaixo (e o foco e o aviso ficam onde estão).
 */
export function organizarArquivos(lista, lidos, mantidos = null) {
  const todos = Array.isArray(lista) ? lista : []
  const fica = (a) => precisaLeitura(a, lidos) || (!!a.exige_leitura && !!mantidos && mantidos.has(a.id))
  const paraLer = lidos ? todos.filter(fica).sort(maisRecentePrimeiro) : []
  const ids = new Set(paraLer.map((a) => a.id))
  return {
    paraLer,
    grupos: agruparPorCategoria(todos.filter((a) => !ids.has(a.id))),
    leituraIncerta: !lidos && todos.some((a) => a.exige_leitura),
  }
}

/** Formato só quando se sabe (o genérico "Arquivo" não informa nada). */
export function formatoLegivel(a) {
  const t = tipoLegivel(a && a.mime, a && a.path)
  return t === 'Arquivo' ? '' : t
}

/** "2", "v2" e "1.1" viram "versão 2", "versão 2" e "versão 1.1". Sem versão: vazio. */
export function versaoLegivel(v) {
  const s = String(v == null ? '' : v).trim().replace(/^v(?=\d)/i, '')
  return s ? 'versão ' + s : ''
}

/** Formato · tamanho · versão — só o que existe no dado. */
export const detalhesDoArquivo = (a) => [formatoLegivel(a), tamanhoLegivel(a && a.tamanho), versaoLegivel(a && a.versao)].filter(Boolean)

/** "22/10/2026" — o dia local da publicação (a substituição de um arquivo também a renova). */
export const publicadoEm = (a) => dataBr(quando(a))

/**
 * A versão atual foi publicada DEPOIS de a marca confirmar a leitura (o arquivo foi substituído): a confirmação
 * volta a ser pedida (`precisaLeitura`), e `marca_confirmar_leitura` renova a hora da leitura.
 * Tolerância de 1 min para não acusar o relógio do aparelho contra o do servidor — o banco usa a MESMA
 * (migration 20261105_marca_confirmar_leitura.sql: renovar e "N confirmaram").
 */
export function publicadoDepoisDaLeitura(a, lidoEm) {
  const p = ms(quando(a))
  const l = ms(lidoEm)
  return Number.isFinite(p) && Number.isFinite(l) && p - l > 60000
}

/** Hora provisória da leitura recém-confirmada: nunca anterior à publicação (o relógio daqui pode estar atrasado). */
export const leituraProvisoria = (a, agora = new Date()) => new Date(Math.max(ms(agora) || 0, ms(quando(a)) || 0)).toISOString()

// ── Abrir × Baixar ───────────────────────────────────────────────────────────
const POR_EXTENSAO = { pdf: 'pdf', png: 'imagem', jpg: 'imagem', jpeg: 'imagem', webp: 'imagem', gif: 'imagem', svg: 'imagem', mp4: 'video' }

/** O que o navegador sabe mostrar sem programa externo: 'pdf' | 'imagem' | 'video' | 'outro'. */
export function tipoDeAbertura(a) {
  const ext = String((a && (a.path || a.nome)) || '').split('?')[0].split('.').pop().toLowerCase()
  if (POR_EXTENSAO[ext]) return POR_EXTENSAO[ext]
  const mime = String((a && a.mime) || '').toLowerCase()
  if (mime === 'application/pdf') return 'pdf'
  if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(mime)) return 'imagem'
  if (mime === 'video/mp4') return 'video'
  return 'outro'
}

/** Todo arquivo baixa; só o que o navegador mostra também abre. `dica` explica a ausência do "Abrir". */
export function acoesDoArquivo(a) {
  const abrir = tipoDeAbertura(a) !== 'outro'
  return { abrir, baixar: true, dica: abrir ? '' : 'Este formato não abre no navegador: use “Baixar” e abra o arquivo depois, no aparelho.' }
}

/**
 * O link assinado serve o arquivo "inline" (o navegador mostra). Com `download` o Storage responde como anexo,
 * com o nome certo — é o que diferencia Baixar de Abrir sem baixar os bytes pela página.
 */
export function urlParaBaixar(url, nome) {
  try {
    const u = new URL(url)
    u.searchParams.set('download', nome || '')
    return u.toString()
  } catch { return url }
}

/** O que acontece em cada aparelho, em uma frase que cabe sob o título da lista. `plat` = plataforma() de instalar.js. */
export function notaDeAbertura(plat = {}, { fotos = false } = {}) {
  const coisa = fotos ? 'a foto' : 'o arquivo'
  const baixar = '“Baixar” pede ao ' + (plat.ios && plat.safari ? 'Safari' : 'navegador') + ' para baixar ' + coisa + (plat.ios ? '; ele pode perguntar antes' : '') + '.'
  if (plat.ios) {
    return 'No iPhone, “Abrir” mostra ' + coisa + ' em outra aba; ' + (fotos
      ? 'para levá-la à galeria, toque em Compartilhar › Salvar imagem. '
      : 'para guardá-lo, toque em Compartilhar › Salvar em Arquivos. ') + baixar
  }
  if (plat.android) return '“Abrir” mostra ' + coisa + ' em outra aba (alguns navegadores baixam o PDF em vez de mostrá-lo). ' + baixar
  return '“Abrir” mostra ' + coisa + ' em outra aba. ' + baixar
}

/** Depois do clique: só o que se sabe (a aba abriu, o pedido de download foi feito), nunca "salvo". */
export function retornoDaAcao(acao, nome) {
  return acao === 'abrir'
    ? '“' + nome + '” aberto em outra aba.'
    : 'Pedi ao navegador para baixar “' + nome + '”. Confira os downloads dele.'
}
export const erroDaAcao = (acao, nome) => 'Não deu para ' + (acao === 'abrir' ? 'abrir' : 'baixar') + ' “' + nome + '” agora. Tente de novo em instantes.'
