/*
 * Tela cheia do mapa (redesign de 06/11/2026). É a MESMA tela, só expandida: o contêiner do mapa continua no mesmo lugar
 * da árvore (React não desmonta), então seleção, filtros, zoom e posição seguem como estavam. Quem estiliza é o CSS
 * (`.is-cheia`: position fixed, inset 0, 100dvh, safe areas); aqui fica o comportamento:
 *   · trava a rolagem da página (e destrava ao sair, voltando à posição de antes);
 *   · foco para dentro (botão Fechar), Tab preso na tela, Escape fecha (na pilha: a folha por cima fecha primeiro) e o
 *     foco volta ao botão que abriu;
 *   · teclado virtual: com o teclado aberto, a tela encolhe para a área visível (visualViewport), sem esconder o botão;
 *   · Fullscreen API só como melhoria — o iPhone não a tem para elementos de página, e o modo por CSS vale por si.
 *     Se o navegador sair da tela cheia por conta própria (Esc do navegador), a nossa fecha junto: um passo só.
 * `raizRef`: o contêiner que vira a tela cheia (ele também é o alvo do requestFullscreen, para as folhas continuarem dentro).
 * Ao entrar e sair a janela do desenho muda de tamanho; quem mantém o ponto do centro (e o zoom) é a câmera do Mundo, que
 * observa o próprio tamanho (camera.js · redimensionar); os mapas reais — Google e MapLibre — já mantêm o centro sozinhos.
 */
import React from 'react'
import { travar, soltar, useEscape, prenderTab, devolverFoco } from './interacao.js'

export function useTelaCheia (raizRef) {
  const [cheia, setCheia] = React.useState(false)
  const quem = React.useRef(null)
  const rolagem = React.useRef(0)
  const abrir = React.useCallback(() => { quem.current = document.activeElement; rolagem.current = window.scrollY; setCheia(true) }, [])
  const fechar = React.useCallback(() => setCheia(false), [])

  useEscape(cheia, fechar)

  // A página sai do ar (navegar com a tela cheia aberta): a próxima página começa no topo, quem manda é o roteador. Este
  // efeito vem ANTES do da tela cheia, então o cleanup dele roda primeiro e avisa o outro.
  const saindo = React.useRef(false)
  React.useEffect(() => () => { saindo.current = true }, [])

  React.useEffect(() => {
    if (!cheia) return undefined
    const raiz = raizRef.current
    if (!raiz) return undefined
    travar(rolagem.current) // a de antes de o contêiner sair do fluxo (a página encurta e o navegador ajusta a rolagem)
    raiz.querySelector('[data-fechar-cheia]')?.focus({ preventScroll: true })

    // Fullscreen API (melhoria): só vale como "entrou" quando o navegador confirma (fullscreenchange com o nosso contêiner);
    // evento atrasado de uma saída anterior não derruba a abertura nova.
    let entrou = false
    let usouApi = false
    if (typeof raiz.requestFullscreen === 'function') {
      Promise.resolve(raiz.requestFullscreen({ navigationUI: 'hide' })).catch(() => { /* sem permissão ou sem suporte: fica o modo por CSS */ })
    }
    const aoMudarOModo = () => {
      if (document.fullscreenElement === raiz) { entrou = true; usouApi = true; return }
      if (entrou) { entrou = false; fechar() } // o navegador saiu sozinho (Esc dele): a nossa tela cheia fecha junto
    }
    document.addEventListener('fullscreenchange', aoMudarOModo)

    const aoTeclar = (e) => { if (!raiz.querySelector('.ct-folha-m.is-modal')) prenderTab(e, raiz) } // com uma folha modal aberta (filtros, atalhos), é ela quem prende
    document.addEventListener('keydown', aoTeclar)

    const vv = window.visualViewport
    const ajustar = () => {
      if (!vv) return
      const teclado = window.innerHeight - vv.height > 120 && vv.scale <= 1.01
      if (teclado) { raiz.style.setProperty('--ct-vv-h', `${vv.height}px`); raiz.style.setProperty('--ct-vv-top', `${vv.offsetTop}px`) }
      else { raiz.style.removeProperty('--ct-vv-h'); raiz.style.removeProperty('--ct-vv-top') }
    }
    vv?.addEventListener('resize', ajustar)
    vv?.addEventListener('scroll', ajustar)

    return () => {
      document.removeEventListener('fullscreenchange', aoMudarOModo)
      document.removeEventListener('keydown', aoTeclar)
      vv?.removeEventListener('resize', ajustar)
      vv?.removeEventListener('scroll', ajustar)
      raiz.style.removeProperty('--ct-vv-h')
      raiz.style.removeProperty('--ct-vv-top')
      // Sair da Fullscreen API mexe na rolagem da página: só destrava (e devolve a posição) quando o navegador termina. Enquanto
      // isso o corpo fica preso na posição de antes, então a página de trás já aparece no lugar certo.
      const terminar = () => {
        if (saindo.current) { soltar(false); return } // desmontou: só libera a trava; nada de rolar nem de timers depois do roteador
        const y = soltar()
        if (!usouApi || y == null) return
        const volta = () => { if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, left: 0, behavior: 'instant' }) }
        requestAnimationFrame(volta)
        setTimeout(volta, 120)
      }
      if (document.fullscreenElement === raiz) Promise.resolve(document.exitFullscreen?.()).catch(() => {}).finally(terminar)
      else terminar()
      devolverFoco(quem.current)
    }
  }, [cheia])

  return { cheia, abrir, fechar }
}
