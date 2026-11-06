/*
 * Cenas da camada de edição — função pura (testada em tests/rotas-edicao.test.mjs).
 *
 * Recebe o caminho cru (sem '#', sem query) e devolve qual página da edição
 * mostrar. `/` só chega aqui quando a edição é a entrada principal.
 * /cartoon/combos/:slug abre a MESMA página do participante, focada no combo
 * (§2.3 do plano: uma ficha só).
 */
import { EDICAO } from './config.js'
import { SECOES_SIMPLES, tokenValido, grupoIdValido } from './caca/regras.js'

export const CENAS = ['entrada', 'participantes', 'participante', 'combos', 'mapa', 'avaliar', 'premiacao', 'sistema', 'carimbo', 'caca', 'voucher', 'regulamento', 'ter-com-quem-contar', 'inexistente']

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Caça aos Carimbos: `/cartoon/caca[/<seção>]`. Seções simples: recuperar · mapa · ranking · grupos · metas · compartilhar;
 * `grupo/<uuid>` e `convite/<token>` levam o terceiro segmento (formato validado). Token de convite é CASE-SENSITIVE
 * (base64url) e só existe no caminho; convite com formato ruim abre a página, que explica (`token: null`).
 */
function cenaDaCaca (resto) {
  if (resto.length === 0) return { cena: 'caca', secao: 'central' }
  const [secao, id, ...sobra] = resto
  if (sobra.length) return { cena: 'inexistente' }
  if (!id && SECOES_SIMPLES.includes(secao)) return { cena: 'caca', secao }
  if (secao === 'grupo' && id) return grupoIdValido(id) ? { cena: 'caca', secao, grupoId: id.toLowerCase() } : { cena: 'inexistente' }
  if (secao === 'convite' && id) return { cena: 'caca', secao, token: tokenValido(id) ? id : null }
  return { cena: 'inexistente' }
}

/** { cena, slug?, foco? } para um caminho da edição. */
export function resolverCena (path = '', base = EDICAO.caminho) {
  const limpo = String(path).split(/[?#]/)[0].replace(/\/+$/, '')
  const resto = limpo === '' || limpo === '/' ? '' : limpo.startsWith(base) ? limpo.slice(base.length) : null
  if (resto === null) return { cena: 'inexistente' }
  const partes = resto.split('/').filter(Boolean)
  if (partes.length === 0) return { cena: 'entrada' }
  if (partes[0] === 'caca') return cenaDaCaca(partes.slice(1))
  const [primeira, slug, ...sobra] = partes
  if (sobra.length) return { cena: 'inexistente' }
  // QR do balcão (Mapa da Doçura): a página valida o formato e explica um código ruim, em vez de 404.
  if (primeira === 'carimbo') return slug ? { cena: 'carimbo', codigo: slug.toLowerCase() } : { cena: 'inexistente' }
  // Link do voucher virtual: o token secreto vem na própria rota; token ruim abre a página, que explica.
  if (primeira === 'voucher') return slug ? { cena: 'voucher', token: slug.toLowerCase() } : { cena: 'inexistente' }
  if (primeira === 'participantes' || primeira === 'combos') {
    if (!slug) return { cena: primeira }
    if (!SLUG.test(slug)) return { cena: 'inexistente' }
    return primeira === 'combos'
      ? { cena: 'participante', slug, foco: 'combo' }
      : { cena: 'participante', slug }
  }
  // Mapa e Minha rota são UMA experiência (Mapa da Doçura): o endereço antigo da rota (QR e links já divulgados) abre o mesmo mapa
  // com o painel da rota aberto — `abrirRota` — e a página troca a URL por /mapa, sem uma segunda página.
  if (!slug && primeira === 'minha-rota') return { cena: 'mapa', abrirRota: true }
  if (!slug && ['mapa', 'avaliar', 'premiacao', 'sistema', 'regulamento', 'ter-com-quem-contar'].includes(primeira)) return { cena: primeira }
  // A página própria do patrocinador saiu (04/11): o endereço já divulgado abre a entrada, que ganhou a assinatura do Sicredi.
  if (!slug && primeira === 'patrocinador') return { cena: 'entrada', legado: true }
  return { cena: 'inexistente' }
}
