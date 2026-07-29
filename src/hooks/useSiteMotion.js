import { useEffect } from 'react'

/* ============================================================================
   useSiteMotion — motor de entrada do site institucional (redesign 2026).
   CSS: src/styles/scw-motion.css. Regras: CLAUDE.md §0, §5, §21, §22.

   POR QUE UM MOTOR E NÃO CLASSES NO JSX
   O site tem um vocabulário de classe estável (.scw-rotulo → .scw-h2 →
   .scw-corpo → grade → .scw-btn) e, no HTML, a ordem do DOM já É a ordem de
   leitura. Então dá para derivar a coreografia da estrutura em vez de repetir
   marcação em seis páginas — e o ritmo fica num lugar só.

   O QUE ELE FAZ
   1. marca <html> com `.scw-mo-on` (é essa classe que autoriza o CSS a esconder
      qualquer coisa — sem JS, nada some: CLAUDE.md §24);
   2. varre a página por ITEM, guardando só a ocorrência mais externa de cada
      ramo — um <p> dentro de um card dentro de uma grade não é item próprio, a
      grade é;
   3. carimba `data-mo` (o tipo de entrada) e `--mo-i` (posição na sequência).
      A contagem REINICIA a cada rótulo de seção: o rótulo é a "identificação da
      seção" da ordem de leitura, então ele abre naturalmente cada sub-bloco;
   4. nas grades, carimba `--mo-j` nos filhos para eles entrarem card a card;
   5. observa cada item e adiciona `.is-in` quando ele entra na tela — uma vez.

   O QUE ELE NÃO FAZ
   - não roda sob prefers-reduced-motion nem sem IntersectionObserver;
   - não toca em herói (entra por @keyframes, está acima da dobra);
   - não toca em áreas que precisam de concentração — FAQ, formulários (§20).
   ========================================================================= */

/* Fora do alcance: heróis (coreografados no CSS) e blocos que precisam ficar
   calmos ou já têm animação própria. */
const FORA =
  '.scw-hero, .pa-hero, .ctt-abertura, .swa-hero, ' +
  '.scw-marquee, .scw-header, .scw-folha, .scw-abas, [data-mo-fora]'

/* Rótulo de seção: reinicia a contagem da sequência. */
const ROTULO = '.scw-rotulo, .scw-pill, [class$="__rotulo"], [class*="__rotulo "], [class$="__eixo"], [class$="__ordem"]'

/* Contêineres cujos FILHOS entram em sequência (cards, listas, faixas). */
const GRADE =
  'ul, ol, dl, ' +
  '.hm-rotas, .hm-ciclo, .hm-galerias, .hm-prova, .hm-ingredientes, ' +
  '.pa-faixas, .pa-cards, .pa-depos, .pa-numeros, .pa-jornada, .pa-onde, ' +
  '.ctt-portas, .ctt-colunas, ' +
  '.swa-cats, .swa-edicoes, .swa-podio, .swa-hall, .swa-hist-cats, .swa-trilha'

/* Listas longas ou de leitura concentrada: entram como bloco único, sem
   sequência item a item (§20 — a central de dúvidas tem 93 perguntas). */
const SEM_SEQUENCIA = '.ctt-perguntas, .ctt-cats, .pa-imprensa, .pa-veiculos, .swa-edicao__cats, #hm-materias'

/* Tudo que pode receber entrada própria. A ordem aqui não importa: o filtro de
   profundidade abaixo é que decide quem sobra. */
const ITEM = [
  ROTULO,
  'h1, h2, h3',
  '.scw-h1, .scw-h2, .scw-h3',
  'p, blockquote',
  'figure, img, picture, .scw-reserva',
  'form',
  GRADE,
  SEM_SEQUENCIA,
  '.scw-btn, [class$="__cta"], [class$="__link"], [class$="__toggle"], [class$="__acoes"]',
].join(', ')

/* Grade e lista longa também são itens — mas com no máximo 8 degraus de atraso,
   senão uma lista de 20 cards viraria espera (§5). */
const TETO_SEQUENCIA = 6
const TETO_CARDS = 7

function tipoDe(el) {
  const tag = el.tagName
  if (el.matches(ROTULO)) return 'sobe'
  if (tag === 'H1' || tag === 'H2' || tag === 'H3' || el.matches('.scw-h1, .scw-h2, .scw-h3')) return 'titulo'
  if (tag === 'FIGURE' || tag === 'IMG' || tag === 'PICTURE' || el.matches('.scw-reserva')) return 'foto'
  if (tag === 'P' || tag === 'BLOCKQUOTE') return 'texto'
  return 'sobe'
}

/**
 * @param raizRef  ref do elemento que contém a página (o <main> do App).
 * @param deps     dependências do efeito — normalmente [route].
 * @param ativo    false nas rotas com sistema próprio (Edições) e nos painéis.
 */
/* Elemento preso à tela (barra fixa, cabeçalho grudento) — dele ou de algum pai.
   Fica de fora do motor: um bloco `position: fixed` colado na base nunca entra
   na zona de disparo do observer (a margem negativa a empurra para fora), e o
   reveal o deixaria invisível para sempre. O aparecimento desses elementos já é
   controlado pelo próprio componente. */
function presoNaTela(el, raiz) {
  for (let no = el; no && no !== raiz; no = no.parentElement) {
    const p = getComputedStyle(no).position
    if (p === 'fixed' || p === 'sticky') return true
  }
  return false
}

export function useSiteMotion(raizRef, deps = [], ativo = true) {
  useEffect(() => {
    const raiz = (raizRef && raizRef.current) || null
    if (!raiz || !ativo) return

    const semMovimento =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sem movimento ou sem observer: não liga o motor. Como o CSS só esconde
    // sob `.scw-mo-on`, a página aparece inteira e estática.
    if (semMovimento || typeof IntersectionObserver === 'undefined') return

    const html = document.documentElement
    html.classList.add('scw-mo-on')

    // --- 1. seleciona os itens mais externos de cada ramo -------------------
    const candidatos = [...raiz.querySelectorAll(ITEM)]
    const itens = candidatos.filter((el) => {
      if (el.closest(FORA)) return false
      if (presoNaTela(el, raiz)) return false
      const pai = el.parentElement
      // já coberto por um item mais externo dentro desta raiz?
      return !(pai && pai.closest(ITEM) && raiz.contains(pai.closest(ITEM)))
    })
    if (!itens.length) {
      html.classList.remove('scw-mo-on')
      return
    }

    // --- 2. carimba tipo e posição na sequência ----------------------------
    // A contagem reinicia em dois pontos: ao trocar de <section> e a cada rótulo.
    // Sem isso o índice só cresceria e o último bloco da página abriria com meio
    // segundo de atraso — espera, não apresentação.
    let i = 0
    let secaoAtual = null
    itens.forEach((el) => {
      const secao = el.closest('section')
      if (secao !== secaoAtual) { secaoAtual = secao; i = 0 }
      if (el.matches(ROTULO)) i = 0 // rótulo abre um bloco novo
      el.setAttribute('data-mo', tipoDe(el))
      el.style.setProperty('--mo-i', String(Math.min(i, TETO_SEQUENCIA)))
      i += 1

      // grade: os filhos entram card a card (a própria grade não se esconde,
      // senão o conteúdo animaria duas vezes)
      if (el.matches(GRADE) && !el.matches(SEM_SEQUENCIA)) {
        const filhos = [...el.children]
        if (filhos.length > 1) {
          el.removeAttribute('data-mo')
          el.setAttribute('data-mo-grade', '')
          filhos.forEach((filho, j) => filho.style.setProperty('--mo-j', String(Math.min(j, TETO_CARDS))))
        }
      }
    })

    // --- 3. revela ao entrar na tela, uma vez por elemento ------------------
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return
          entrada.target.classList.add('is-in')
          io.unobserve(entrada.target)
        })
      },
      // threshold 0 + margem negativa: dispara assim que o topo do elemento
      // encosta na área de leitura. Fração fixa quebraria em blocos mais altos
      // que a viewport (a grade de edições nunca chegaria a 15% visível).
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    )
    itens.forEach((el) => io.observe(el))

    return () => {
      io.disconnect()
      html.classList.remove('scw-mo-on')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
