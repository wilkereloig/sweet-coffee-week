import React from 'react'
import IconeUi from './scw-icons/IconeUi'

/*
 * Catálogo legado `I` — ADAPTADOR do registro de ícones v3 (14/10/2026).
 * Os desenhos daqui foram aposentados; cada nome antigo aponta para o desenho
 * oficial de mesmo significado. Contrato mantido: `I.nome(props)`, com
 * `width`/`size` encaixados na escala da interface (16 · 20 · 24).
 * Código novo usa `IconeUi`/`ScwIcon` direto.
 */
const NOMES = {
  arrow: 'seta-direita', arrowDown: 'baixar', chevronLeft: 'voltar', chevronRight: 'avancar',
  cup: 'xicara', plate: 'combo', pin: 'local', pinFill: 'local', map: 'trajeto', search: 'busca',
  cal: 'calendario', heart: 'coracao', heartLine: 'coracao', star: 'estrela', starFill: 'estrela',
  route: 'trajeto', donut: 'cupcake', croissant: 'cupcake', ig: 'instagram', close: 'fechar',
  menu: 'menu', check: 'feito', home: 'inicio', lock: 'cadeado', sound: 'som', soundOff: 'som-desligado',
  user: 'conta',
}

const escala = (px) => (px <= 17 ? 16 : px <= 21 ? 20 : 24)

export const I = Object.fromEntries(Object.entries(NOMES).map(([antigo, nome]) => [
  antigo,
  function IconeLegado({ width, size, className } = {}) {
    return <IconeUi nome={nome} tamanho={escala(+(size || width || 20))} className={className} />
  },
]))
