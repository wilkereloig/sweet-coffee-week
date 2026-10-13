import React from 'react'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/*
 * NAVEGAÇÃO POR ANO — compacta e presa ao rolar, só dentro da coleção (sai de
 * cena quando a coleção acaba, antes do rodapé). Desktop: coluna à esquerda da
 * grade, abaixo da linha do cabeçalho. Celular: faixa de anos no topo da tela,
 * rolável na horizontal — longe da base, onde moram as abas e o aviso de
 * cookies.
 *
 * Os anos são <button>, não âncoras: o roteador é por hash, e `href="#ano"`
 * trocaria de rota. O clique rola até o grupo e leva o foco ao numeral dele.
 * O ano marcado (`aria-current`) acompanha a leitura.
 */
const reduzido = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function NavAnos({ grupos }) {
  const [atual, setAtual] = React.useState(grupos[0] && grupos[0].ano)
  const faixa = React.useRef(null)
  /* Anos com a mesma linha da grade (2020 e 2019 lado a lado) cruzam a faixa
     de leitura juntos: o ano escolhido no clique vale enquanto estiver à vista. */
  const escolhido = React.useRef(null)

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const visiveis = new Map()
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => visiveis.set(en.target.dataset.ano, en.isIntersecting))
      // O ano clicado manda até sair da faixa de leitura depois de ter chegado
      // nela (durante a rolagem suave até ele, os anos do caminho não contam).
      const e = escolhido.current
      if (e) {
        if (visiveis.get(e.ano)) { e.chegou = true; setAtual(e.ano); return }
        if (!e.chegou) return
        escolhido.current = null
      }
      // senão, o primeiro grupo (na ordem da página) que cruza a faixa
      const ano = grupos.map((g) => g.ano).find((a) => visiveis.get(a))
      if (ano) { setAtual(ano); return }
      // Acima da coleção (de volta ao topo), o ano marcado é o primeiro.
      const primeiro = document.getElementById(`edx-ano-${grupos[0].ano}`)
      if (primeiro && primeiro.getBoundingClientRect().top > window.innerHeight * 0.45) setAtual(grupos[0].ano)
    }, { rootMargin: '-35% 0px -55% 0px' })
    grupos.forEach((g) => {
      const el = document.getElementById(`edx-ano-${g.ano}`)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [grupos])

  // Mantém o ano marcado visível na faixa do celular, sem rolar a página.
  React.useEffect(() => {
    const f = faixa.current
    const b = f && f.querySelector('[aria-current="true"]')
    if (!f || !b || f.scrollWidth <= f.clientWidth) return
    const alvo = b.offsetLeft - (f.clientWidth - b.offsetWidth) / 2
    f.scrollTo({ left: Math.max(0, alvo), behavior: reduzido() ? 'auto' : 'smooth' })
  }, [atual])

  const ir = (ano) => {
    const grupo = document.getElementById(`edx-ano-${ano}`)
    if (!grupo) return
    escolhido.current = { ano, chegou: false }
    setAtual(ano)
    grupo.scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' })
    const titulo = grupo.querySelector('.edx-ano__num')
    if (titulo) titulo.focus({ preventScroll: true })
  }

  return (
    <nav className="edx-anos" aria-label={TEXTOS.rotuloAnos}>
      <ul className="edx-anos__lista" ref={faixa}>
        {grupos.map((g) => (
          <li key={g.ano}>
            <button
              type="button"
              className="edx-anos__ano"
              aria-current={atual === g.ano ? 'true' : undefined}
              onClick={() => ir(g.ano)}
            >
              {g.ano}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
