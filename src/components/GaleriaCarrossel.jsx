/*
 * GaleriaCarrossel — fita de fotos que corre sozinha, com legenda por item.
 *
 * Serve as duas galerias irmãs da seção 02 da Home (combos de outras edições e
 * Sweet Gift), que antes eram grades 2×2 fixas. Com o acervo crescendo — dez
 * fotos de Sweet Gift, dezesseis edições — a grade mostrava quatro e escondia
 * o resto (pedido do Wilke, 21/08/2026).
 *
 * A fita é a MESMA técnica do marquee: a lista é renderizada duas vezes e a
 * animação desloca -50%, então o ponto de emenda cai exatamente onde a segunda
 * cópia começa e o laço não tem costura. Reusa `scwMarquee`, que já existe.
 *
 * O que ela NÃO faz, de propósito:
 * · não tem setas nem pontos — não é navegação, é vitrine; quem quiser ver
 *   tudo tem o link "ver todas" que já existe na cabeça de cada galeria;
 * · não para sozinha em item nenhum: é fluxo contínuo, não slideshow.
 *
 * Acessibilidade e controle:
 * · a fita PARA no hover e no foco de teclado, senão ler a legenda de um item
 *   em movimento é impossível;
 * · com `prefers-reduced-motion` a animação não roda e a fita vira uma faixa
 *   de rolagem manual — o conteúdo continua todo alcançável;
 * · a segunda cópia é `aria-hidden`: para um leitor de tela a lista tem o
 *   tamanho real, não o dobro.
 */

import React from 'react'

export function GaleriaCarrossel({ itens, duracao = 46 }) {
  if (!itens || !itens.length) return null

  const fita = (copia) =>
    itens.map((item, i) => (
      <li key={`${copia}-${item.src || i}`}>
        {item.src
          ? <figure
              className="hm-galeria__foto"
              role={copia === 0 ? 'img' : undefined}
              aria-label={copia === 0 ? item.alt : undefined}
              aria-hidden={copia === 0 ? undefined : 'true'}
              style={{ backgroundImage: `url("${item.src}")` }}
            />
          : <div className="scw-reserva hm-galeria__reserva">{item.reserva}</div>}
        <span className="hm-galeria__nome">
          {item.titulo}
          {item.legenda ? <b>{item.legenda}</b> : null}
        </span>
      </li>
    ))

  return (
    <div className="hm-fita">
      {/* A duração cresce com o número de itens para que a VELOCIDADE seja a
          mesma nas duas galerias — uma fita de dez fotos no mesmo tempo de uma
          de quatro correria duas vezes e meia mais rápido. */}
      <ul className="hm-fita__trilha" style={{ '--fita-duracao': `${duracao}s` }}>
        {fita(0)}
        {fita(1)}
      </ul>
    </div>
  )
}

export default GaleriaCarrossel
