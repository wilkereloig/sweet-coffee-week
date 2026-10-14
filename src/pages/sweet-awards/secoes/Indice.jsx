import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { INDICE_ROTULO } from '../../../data/conteudo/sweet-awards'

const semMovimento = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* O site roteia pelo hash (#/sweet-awards): um `href="#swa-hall"` puro trocaria a
   ROTA. Então o link rola até a seção sem tocar no endereço e leva o foco ao
   título dela — teclado e leitor de tela chegam onde o olho chegou. */
export function irPara(id) {
  return (e) => {
    e.preventDefault()
    const alvo = document.getElementById(id)
    if (!alvo) return
    alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
    const titulo = document.getElementById(`${id}-titulo`)
    if (titulo) titulo.focus({ preventScroll: true })
  }
}

/*
 * Índice da página — as quatro áreas de consulta, com o que há em cada uma
 * (contado dos dados em `indiceDaPagina`). É o único atalho entre seções: as
 * categorias se escolhem no filtro dos resultados e as edições no acordeão do
 * histórico, cada coisa num lugar só.
 */
export function Indice({ itens }) {
  return (
    <nav className="scw-secao scw-secao--compacta scw-secao--bege swa-indice" aria-labelledby="swa-indice-rotulo">
      <span className="scw-rotulo" id="swa-indice-rotulo">{INDICE_ROTULO}</span>
      <ol className="swa-indice__lista">
        {itens.map((item) => (
          <li key={item.id}>
            <a className="swa-indice__link" href={`#${item.id}`} onClick={irPara(item.id)}>
              <span className="scw-disco swa-indice__disco" aria-hidden="true">
                <ScwIcon nome={item.icone} tamanho={24} />
              </span>
              <span className="swa-indice__texto">
                <b>{item.rotulo}</b>
                <span>{item.resumo}</span>
              </span>
              <span className="swa-indice__seta" aria-hidden="true">
                <ScwIcon nome="abrir" tamanho={20} />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
