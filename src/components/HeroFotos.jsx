/*
 * HeroFotos — as fotos de fundo de um herói institucional, em crossfade.
 *
 * Nasceu da terceira cópia: o herói da Home já fazia isso desde o redesign, o
 * Sweet Awards passou a fazer em 21/08/2026 e Participar/Apoiar entraram na
 * sequência. Em vez de repetir o mesmo `setInterval` e o mesmo mapa de camadas
 * em cada página, a peça vive aqui (§5.3 — ao ver a 2ª cópia, extraia).
 *
 * A Home NÃO usa este componente: o herói dela tem classe própria, respiração
 * na propriedade `scale` e enquadramento em `--pos`, e a página-mãe não se
 * mexe sem pedido (A6). Quando alguém for encostar nela, é aqui que ela cai.
 *
 * Cada camada manda o enquadramento como custom property em vez de resolver um
 * valor só: `bgStyle()` decide entre desktop e celular na hora, e style inline
 * vence media query — o mesmo tropeço registrado no §10.4 do CLAUDE.md. Assim
 * quem escolhe é o CSS.
 *
 * Acessibilidade: só a camada visível carrega `role="img"` e o alt; as outras
 * são `aria-hidden`. Um leitor de tela nunca ouve seis descrições de fundo.
 */

import React from 'react'
import { fotoAte, LARGURA_HEROI_MOBILE } from '../data/imageLibrary'

/* Mesmo intervalo do herói da Home. Duração que já existe no sistema, não um
   tempo novo (§6.15 — "nada de curva ou duração nova"). */
const INTERVALO = 6200

const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param {object}   props
 * @param {Array}    props.fotos     itens de `heroPhotos(rota)` (src, alt, position, mobilePosition)
 * @param {string}   [props.classe]  classe do container; o padrão é a banda do sistema
 */
export function HeroFotos({ fotos, classe = 'scw-hero-banda' }) {
  const [ativa, setAtiva] = React.useState(0)
  const [reduzido, setReduzido] = React.useState(false)

  React.useEffect(() => { setReduzido(semMovimento()) }, [])

  React.useEffect(() => {
    /* Uma foto só não é crossfade: não vale acordar um timer para nada. */
    if (semMovimento() || fotos.length < 2) return
    const t = setInterval(() => setAtiva((i) => (i + 1) % fotos.length), INTERVALO)
    return () => clearInterval(t)
  }, [fotos.length])

  /* Sem movimento, sem crossfade: uma camada só.
     A salvaguarda do §6.15 — "prefers-reduced-motion ligado, nada é escondido" —
     devolve `opacity: 1` a TODAS as camadas. Como são absolutas e de z-index
     automático, quem aparecia era a última do DOM, não a ativa: em Apoiar o
     herói mostrava a foto 22 enquanto o `is-ativa` estava na 12. O defeito é
     anterior a esta mudança e passava despercebido porque as duas eram fotos
     plausíveis do mesmo acervo. Renderizar só a camada visível corrige o que
     aparece e, de quebra, deixa a página de movimento reduzido baixar UMA foto. */
  const camadas = reduzido ? fotos.slice(0, 1) : fotos

  const pedidas = usePedidas(camadas.length, ativa)

  if (!fotos.length) return null

  /* Fundo em CSS não tem carga preguiçosa, e `loading="lazy"` também não
     resolveria: as camadas ficam DENTRO da tela, empilhadas, e o navegador
     baixa tudo que está no viewport. O resultado era um herói de seis fotos
     pedindo as seis de uma vez para mostrar uma — em Participar isso eram
     5,3 MB antes de qualquer rolagem, a 390px de largura.

     Quem decide é o componente: só recebem `background-image` a camada visível,
     as que já foram vistas (voltar atrás não pode piscar) e a PRÓXIMA, que é
     pedida um intervalo inteiro antes de aparecer — 6,2s de folga, muito mais
     do que a rede precisa. Visualmente idêntico; o que muda é a ordem em que a
     rede é usada. As camadas seguem montadas: quem sai do fluxo é o download,
     não o elemento, então nada de salto de layout. */
  return (
    <div className={classe}>
      {camadas.map((foto, i) => (
        <span
          key={foto.src}
          className={'scw-hero-banda__foto' + (i === ativa ? ' is-ativa' : '')}
          style={{
            /* As duas urls como propriedade custom, e o CSS escolhe por media
               query — mesmo arranjo de `--foco`/`--foco-mobile` (§10.4). Um
               `backgroundImage` resolvido aqui venceria a media query e cravaria
               o arquivo de desktop também no celular, que é o defeito que estas
               variantes existem para corrigir. */
            '--foto': pedidas[i] ? `url("${foto.src}")` : undefined,
            '--foto-mobile': pedidas[i]
              ? `url("${fotoAte(foto.src, LARGURA_HEROI_MOBILE)}")`
              : undefined,
            '--foco': foto.position || 'center',
            '--foco-mobile': foto.mobilePosition || foto.position || 'center',
          }}
          role={i === ativa ? 'img' : undefined}
          aria-label={i === ativa ? foto.alt : undefined}
          aria-hidden={i === ativa ? undefined : 'true'}
        />
      ))}
    </div>
  )
}

/* Quais camadas já podem pedir a foto: a visível, a próxima e todas as que já
   passaram. A memória importa porque voltar para uma foto já vista não pode
   piscar — uma vez baixada ela está em cache e reaparece instantânea. */
function usePedidas(total, ativa) {
  const [pedidas, setPedidas] = React.useState(() =>
    Array.from({ length: total }, (_, i) => i === 0))

  React.useEffect(() => {
    if (!total) return
    setPedidas((antes) => {
      const proxima = (ativa + 1) % total
      if (antes[ativa] && antes[proxima]) return antes   // nada novo: não re-renderiza
      const agora = antes.slice()
      agora[ativa] = true
      agora[proxima] = true
      return agora
    })
  }, [ativa, total])

  return pedidas
}

export default HeroFotos
