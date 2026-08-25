/*
 * PÁGINA "EM BREVE" — a landing pública do domínio (COMING_SOON_PUBLICATION).
 *
 * Reescrita em 25/08/2026: deixou de ser "aviso de novo site + Sweet Awards da
 * Lovers" e passou a ser a CHAMADA DO PRÉ-CADASTRO. Uma ação só, repetida três
 * vezes, sempre com o mesmo rótulo e o mesmo destino: `/quero-participar/`.
 *
 * ⚠️ A barra final do destino não é enfeite (§10.4-b): `/quero-participar/` é
 * página estática fora do bundle, e sem a barra o servidor não resolve o índice
 * do diretório — a rota cai no fallback do SPA e abre esta mesma landing. Por
 * isso é `<a href>` de navegador, nunca `navigate()` nem `#/`.
 *
 * O bloco do Sweet Awards SAIU (decisão do Eloi, 25/08). É remoção de EXIBIÇÃO,
 * não de dado: `sweetHistoryStats.js`, `loversAwardsResults.js` e o acervo de
 * fotos seguem intactos — só deixaram de ser importados aqui. O resultado da
 * Lovers volta a ter endereço público quando o institucional for publicado.
 *
 * IDENTIDADE: a página nasceu numa terceira paleta (espresso #2B1810 + ouro
 * #F8B511, tokens de `em-breve.css`) que era do Sweet Awards de antes do
 * redesign. Agora consome a PALETA VIVA (`--scw-*`) e as utilitárias do sistema
 * — `.scw-h1`, `.scw-btn`, `.scw-secao`, `.scw-marquee`, `.scw-hero-veu`. Some
 * a terceira identidade do projeto e o Design passa a desenhar no sistema real.
 * ⛔ `em-breve.css` continua no ar: `components/icons.jsx` e `data/participants.js`
 * ainda leem tokens dele. Sair do consumo é uma coisa; apagar o arquivo é outra.
 *
 * MOVIMENTO: esta é a única tela servida por `motion-system.css` +
 * `useRevealOnScroll` (§6.15). Os `@keyframes` próprios daqui consomem os
 * tokens `--motion-*` de `layout-tokens.css` — nada de duração ou curva nova.
 * `prefers-reduced-motion` é desligado pelo bloco global de `.scw-raiz`, que
 * zera animação e transição de tudo que está dentro dela; o contador respeita
 * a preferência em JS, mostrando o valor final de saída.
 *
 * O cabeçalho com o botão "Acesso" NÃO mora aqui: é o `<SiteHeader apenasAcesso>`
 * que o `App.jsx` renderiza só nesta rota. ⛔ Não desenhar um segundo — duas
 * portas para o mesmo painel é fonte de verdade duplicada em forma de interface.
 */
import React from 'react'
import { HeroFotos } from '../../components/HeroFotos'
import { MARCA_SCW } from '../../components/nav'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { heroPhotos } from '../../data/imageLibrary'
import { festivalFacts } from '../../data/festivalFacts'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'

/* Barra final obrigatória — ver o cabeçalho do arquivo e o §10.4-b. */
const PRE_CADASTRO = '/quero-participar/'

/* As fotos do herói da Home. Não é empréstimo: enquanto o gate está ligado,
   esta landing É a porta de entrada do domínio, o mesmo papel da Home. Assim o
   caminho continua saindo do sistema central (§6.12) e os alt já são os do
   acervo, conferidos — inventar descrição de foto que ninguém viu seria dado
   inventado por outro meio (A4). */
const FOTOS_HERO = heroPhotos('home')

/* Os 16 temas, derivados da fonte histórica. 2016 não tem `tema` na base — o
   nome dela guarda a grafia antiga ("S&C / Início"), e o prefixo "S&C" está
   proibido no site (§8.2). Tirar o prefixo é transformação de leitura, não uma
   segunda tabela de temas para alguém manter à mão (§5.2). */
const TEMAS = (SWEET_COFFEE_HISTORY.edicoes || [])
  .map((e) => e.tema || (e.nome || '').replace(/^S&C\s*\/?\s*/, ''))
  .filter(Boolean)

/* Cada número numa cor diferente, na ordem do ciclo canônico (§6.3), filtrada
   pelo que sustenta leitura sobre creme em texto GRANDE (3:1): chocolate 12:1,
   roxo 6,7:1, marrom 6,9:1, magenta 3,8:1. Cyan (2,2) e amarelo (1,4) ficam de
   fora — sobre creme eles são superfície, nunca tinta.
   ⚠️ "+120 marcas" é a grafia obrigatória do §8.4 e o acervo tem 123: a dezena
   sai de uma conta sobre a fonte, não de um número digitado que envelhece
   sozinho no dia em que a 17ª edição entrar na base. */
const F = festivalFacts
const NUMEROS = [
  { alvo: F.editions.value, rotulo: 'edições realizadas', cor: 'var(--scw-choco)' },
  { alvo: Math.floor(F.brands.value / 10) * 10, prefixo: '+', rotulo: 'marcas participantes', cor: 'var(--scw-roxo)' },
  { alvo: F.combosSold.value, prefixo: '+', sufixo: ' mil', rotulo: 'combos vendidos', cor: 'var(--scw-marrom)' },
]

const PASSOS = [
  { n: '01', t: 'Pré-cadastro', d: 'Você conta quem é, o que serve e o que torna a sua casa especial.', cor: 'var(--scw-amarelo)' },
  { n: '02', t: 'Conversa', d: 'A organização entra em contato para entender o encaixe com a próxima edição.', cor: 'var(--scw-cyan)' },
  { n: '03', t: 'Cadastro do combo', d: 'Quem seguir adiante monta o combo — um doce, um salgado e uma bebida.', cor: 'var(--scw-laranja)' },
]

const SETA = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const podeAnimar = () =>
  typeof window !== 'undefined' &&
  typeof IntersectionObserver !== 'undefined' &&
  !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

/*
 * Contador — 0 → valor ao entrar na viewport, uma vez só.
 *
 * ⚠️ Duas armadilhas, e as duas custam layout shift, que a regra 3 do §6.15
 * proíbe:
 *  1. o número muda de largura enquanto sobe (1 → 16 → 34). Por isso o valor
 *     final fica renderizado como MOLDE invisível e o vivo é absoluto por cima:
 *     a caixa já nasce com a largura que vai ter no fim, medida, não estimada;
 *  2. `tabular-nums` para os dígitos não dançarem entre si — vem do
 *     `.scw-numeral`, que já traz a propriedade.
 *
 * Sem movimento (ou sem observer) o estado inicial já é o valor final: quem
 * desliga animação nunca vê zero.
 */
function Contador({ alvo, prefixo = '', sufixo = '' }) {
  const ref = React.useRef(null)
  const [valor, setValor] = React.useState(() => (podeAnimar() ? 0 : alvo))

  React.useEffect(() => {
    const el = ref.current
    if (!el || !podeAnimar()) return
    let quadro = 0
    const io = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      io.disconnect()
      const inicio = performance.now()
      const passo = (agora) => {
        const t = Math.min(1, (agora - inicio) / 1200)
        // Desaceleração cúbica: o número chega e para, sem pique no fim.
        setValor(Math.round(alvo * (1 - Math.pow(1 - t, 3))))
        if (t < 1) quadro = requestAnimationFrame(passo)
      }
      quadro = requestAnimationFrame(passo)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); if (quadro) cancelAnimationFrame(quadro) }
  }, [alvo])

  return (
    <span className="scw-numeral eb-num__caixa" ref={ref}>
      <span className="eb-num__molde">{prefixo}{alvo}{sufixo}</span>
      <span className="eb-num__vivo">{prefixo}{valor}{sufixo}</span>
    </span>
  )
}

function Acao({ classe = 'scw-btn scw-btn--solido', children = 'Quero participar' }) {
  return <a className={classe} href={PRE_CADASTRO}>{children}{SETA}</a>
}

export function EmBrevePage() {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef, [])

  return (
    <div className="eb-page" ref={rootRef}>
      {/* 1 — TOPO: a marca. O botão "Acesso" vem do cabeçalho fixo do App. */}
      <div className="eb-topo">
        <img className="eb-topo__marca" src={MARCA_SCW} alt="Sweet &amp; Coffee Week" />
      </div>

      {/* 2 — HERÓI: a notícia e a ação */}
      <header className="eb-hero scw-hero-veu">
        <HeroFotos fotos={FOTOS_HERO} classe="eb-hero__fotos" />
        <div className="eb-hero__conteudo motion-stagger">
          <span className="scw-pill eb-pill">Pré-cadastro aberto</span>
          <h1 className="scw-h1 eb-h1">
            Uma <em className="scw-italico eb-h1__dest">nova edição</em> do Sweet &amp; Coffee Week vem aí.
          </h1>
          <p className="scw-lead eb-lead">
            São 16 edições transformando Natal numa rota de doce, salgado e café. A próxima
            está sendo preparada — e o pré-cadastro para os estabelecimentos já está aberto.
          </p>
          <div className="eb-acao">
            <Acao />
            <span className="eb-acao__nota">Leva quatro passos e uma revisão antes de enviar.</span>
          </div>
        </div>
      </header>

      {/* 3 — PROVA: os números do acervo */}
      <section className="scw-secao scw-secao--creme eb-prova">
        <ul className="scw-grade-fixa eb-prova__grade motion-stagger" style={{ '--scw-cols': 4, '--scw-gap': 'clamp(16px,2.4vw,32px)' }}>
          {NUMEROS.map((n) => (
            <li className="eb-num" key={n.rotulo} style={{ color: n.cor }}>
              <span aria-hidden="true">
                <Contador alvo={n.alvo} prefixo={n.prefixo} sufixo={n.sufixo} />
                <span className="eb-num__rotulo">{n.rotulo}</span>
              </span>
              <span className="eb-sr">{n.prefixo || ''}{n.alvo}{n.sufixo || ''} {n.rotulo}</span>
            </li>
          ))}
          <li className="eb-num" style={{ color: 'var(--scw-magenta)' }}>
            <span className="scw-numeral">desde {F.firstYear}</span>
            <span className="eb-num__rotulo">a primeira edição</span>
          </li>
        </ul>
      </section>

      {/* 4 — OS 16 TEMAS, em movimento. Duas listas idênticas: o laço do sistema
             desloca cada `ul` em -100% da própria largura, então a segunda entra
             exatamente quando a primeira sai. A cópia é `aria-hidden` — quem usa
             leitor de tela ouve os temas uma vez, não duas. */}
      <div className="scw-marquee eb-marquee">
        {[0, 1].map((copia) => (
          <ul key={copia} aria-hidden={copia === 1 ? 'true' : undefined}>
            {TEMAS.map((t) => (
              <li key={t}>
                <span className="scw-marquee__palavra">{t}</span>
                <span className="scw-marquee__ponto" />
              </li>
            ))}
          </ul>
        ))}
      </div>

      {/* 5 — PARA QUEM É */}
      <section className="scw-secao scw-secao--bege eb-quem">
        <div className="eb-cabeca motion-reveal-up">
          <span className="scw-rotulo">Para quem é</span>
          <h2 className="scw-h2">Casas que fazem doce, salgado e café em Natal.</h2>
          <p className="scw-corpo">
            Cafeterias, confeitarias, docerias, casas de bolo, padarias, chocolaterias,
            sorveterias, bistrôs, restaurantes e cozinhas sem loja física — em Natal e região.
          </p>
        </div>
      </section>

      {/* 6 — COMO FUNCIONA */}
      <section className="scw-secao scw-secao--creme eb-passos">
        <div className="eb-cabeca motion-reveal-up">
          <span className="scw-rotulo">Como funciona</span>
          <h2 className="scw-h2">Três passos até a próxima edição.</h2>
        </div>
        <ol className="scw-grade eb-passos__grade motion-stagger" style={{ '--scw-min': '260px' }}>
          {PASSOS.map((p) => (
            <li className="eb-passo" key={p.n}>
              <span className="eb-passo__n" style={{ background: p.cor }}>{p.n}</span>
              <h3 className="scw-h3">{p.t}</h3>
              <p className="scw-corpo eb-passo__txt">{p.d}</p>
            </li>
          ))}
        </ol>
        <div className="eb-passos__acao motion-reveal-up"><Acao /></div>
      </section>

      {/* 7 — FECHO */}
      <section className="scw-secao scw-secao--choco eb-fecho">
        <div className="eb-fecho__inner motion-stagger">
          <h2 className="scw-h2 eb-fecho__h2">O pré-cadastro é o primeiro passo.</h2>
          <p className="scw-corpo eb-fecho__txt">
            A próxima edição está sendo montada agora. O pré-cadastro é o primeiro passo —
            e não compromete nada.
          </p>
          <Acao />
          <p className="scw-corpo eb-fecho__lover">
            É Sweet Lover? A data, o tema e as marcas confirmadas saem primeiro no{' '}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>.
          </p>
        </div>
      </section>

      {/* 8 — RODAPÉ. Fundo creme, e não chocolate: a logo da F2 é um asset de cor
             fixa (#de1a59) e sobre chocolate ela não fecha os 3:1 de elemento
             gráfico. Sobre creme fecha. A cor da realizadora entra como ASSET,
             igual à da Home — não como token, não como exceção de paleta nova. */}
      <footer className="eb-rodape">
        <a className="eb-rodape__f2" href="https://f2experience.com.br" target="_blank" rel="noopener noreferrer">
          <span className="scw-rotulo scw-rotulo--micro">Realização</span>
          <img src="/images/logo-f2experience.svg" alt="F2 Experience" loading="lazy" />
        </a>
        <p className="eb-rodape__linha">
          Sweet &amp; Coffee Week · Natal/RN ·{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>
        </p>
      </footer>

      {/* 9 — A AÇÃO PRESA NA BASE, só no celular.
             ⚠️ Sem classe de reveal, nunca: elemento `position: fixed` não entra
             na zona de disparo do observer e ficaria invisível para sempre
             (§10.3). O respiro da base é `--scw-safe-b`, o token que a barra de
             abas do site já usa — não um `env()` reescrito aqui. */}
      <div className="eb-barra">
        <Acao classe="scw-btn scw-btn--solido eb-barra__btn" />
      </div>

      <style>{`
        .eb-page {
          min-height: 100vh;
          background: var(--scw-creme);
          color: var(--scw-choco);
          overflow-x: clip;
        }
        /* Prefixado, nunca !important: o reset .scw-raiz a { color: inherit }
           tem especificidade 0,1,1 e venceria uma classe sozinha (§10.1). */
        .eb-page a { color: inherit; text-decoration: none; }
        .eb-page .eb-sr {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }

        /* 1 — TOPO ------------------------------------------------------- */
        .eb-topo {
          display: flex;
          align-items: center;
          /* Altura mínima = a do cabeçalho fixo (padding + botão de 46px), para
             o "Acesso" pousar DENTRO da faixa e não sobre o herói. */
          min-height: clamp(86px, 9vw, 104px);
          padding: clamp(18px, 2.4vw, 28px) var(--scw-trilho) 0;
          background: var(--scw-choco);
        }
        .eb-topo__marca { height: clamp(46px, 5vw, 62px); width: auto; }

        /* 2 — HERÓI ------------------------------------------------------ */
        .eb-hero {
          position: relative;
          isolation: isolate;
          background: var(--scw-choco);
          color: var(--scw-creme);
          /* Sem altura rígida: o herói é proporcional ao conteúdo (§6.8). */
          padding: clamp(56px, 7vw, 96px) var(--scw-trilho) clamp(64px, 7vw, 104px);
          --hv-cor: var(--scw-choco);
          --hv-esq: 88%;
          --hv-centro: 56%;
          --hv-fim: 74%;
        }
        .eb-hero__fotos { position: absolute; inset: 0; z-index: 0; }
        .eb-hero__conteudo {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: clamp(16px, 1.8vw, 22px);
          max-width: min(62%, 860px);
        }
        .eb-pill { background: var(--scw-amarelo); color: var(--scw-choco); }
        .eb-h1 { color: var(--scw-creme); }
        /* Um acento por chapa (§6.2). Magenta sobre chocolate dá 3,8:1 — passa
           em texto grande, que é exatamente o que o .scw-h1 é. */
        .eb-h1__dest { color: var(--scw-magenta); }
        .eb-lead { color: var(--scw-creme); }
        .eb-acao { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
        .eb-acao__nota { font: 500 13.5px/1.4 var(--scw-font); opacity: .82; }

        /* Respiração da foto: laço na propriedade \`scale\`, NUNCA em transform —
           transform fica livre para o crossfade e não há salto de reinício
           (§6.15). 26s é o respiro do sistema, não uma duração nova. */
        .eb-hero__fotos .scw-hero-banda__foto {
          animation: ebRespira 26s var(--ease-out-soft) infinite alternate;
        }
        @keyframes ebRespira { from { scale: 1; } to { scale: 1.06; } }

        /* 3 — PROVA ------------------------------------------------------ */
        .eb-prova__grade { list-style: none; margin: 0; padding: 0; }
        .eb-num { display: flex; flex-direction: column; gap: 8px; }
        /* O molde reserva a largura do valor FINAL e o vivo corre por cima:
           a caixa nunca muda de tamanho enquanto o número sobe. */
        .eb-num__caixa { position: relative; display: inline-block; }
        .eb-num__molde { visibility: hidden; }
        .eb-num__vivo { position: absolute; inset: 0; }
        .eb-num__rotulo {
          display: block;
          margin-top: 6px;
          font: 800 12px/1.3 var(--scw-font);
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--scw-marrom);
        }

        /* 4 — MARQUEE ---------------------------------------------------- */
        .eb-marquee { color: var(--scw-choco); }

        /* 5 e 6 — CABEÇAS E PASSOS -------------------------------------- */
        .eb-cabeca { display: flex; flex-direction: column; gap: var(--scw-gap-bloco); }
        .eb-passos__grade {
          list-style: none;
          margin: var(--scw-gap-cabeca) 0 0;
          padding: 0;
        }
        .eb-passo { display: flex; flex-direction: column; gap: 12px; }
        /* A cor vive no grafismo, não na tinta: sobre creme, amarelo e cyan não
           sustentam texto — como CHAPA, com numeral chocolate, sustentam com
           folga (9,5:1 · 5,6:1 · 4,8:1). É a saída do §6.3. */
        .eb-passo__n {
          display: inline-grid;
          place-items: center;
          width: 54px; height: 54px;
          border-radius: 50%;
          color: var(--scw-choco);
          font: 900 18px/1 var(--scw-font-black);
          letter-spacing: -.02em;
        }
        .eb-passo__txt { max-width: 34ch; }
        .eb-passos__acao { margin-top: var(--scw-gap-cabeca); }

        /* 7 — FECHO ------------------------------------------------------ */
        .eb-fecho__inner { display: flex; flex-direction: column; align-items: flex-start; gap: var(--scw-gap-bloco); }
        .eb-fecho__h2 { color: var(--scw-creme); }
        .eb-fecho__txt { color: var(--scw-creme); opacity: .9; }
        .eb-fecho__lover { color: var(--scw-creme); opacity: .82; font-size: 14.5px; }
        .eb-page .eb-fecho__lover a {
          color: var(--scw-amarelo);
          font-weight: 800;
          /* Alvo de 44px sem quebrar a linha do parágrafo: o padding vertical
             cresce e o inline-flex dá altura ao link (§10.2). */
          display: inline-flex; align-items: center; min-height: 44px;
        }

        /* 8 — RODAPÉ ----------------------------------------------------- */
        .eb-rodape {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          padding: clamp(28px, 3vw, 40px) var(--scw-trilho);
          background: var(--scw-creme);
          border-top: 1px solid rgba(61, 19, 8, .14);
        }
        .eb-rodape__f2 { display: inline-flex; flex-direction: column; gap: 8px; min-height: 44px; justify-content: center; }
        .eb-rodape__f2 img { height: 20px; width: auto; }
        .eb-rodape__linha { margin: 0; font: 500 13.5px/1.5 var(--scw-font); color: var(--scw-marrom); }
        .eb-page .eb-rodape__linha a {
          color: var(--scw-choco);
          font-weight: 800;
          display: inline-flex; align-items: center; min-height: 44px;
        }

        /* 9 — BARRA FIXA (celular) --------------------------------------- */
        .eb-barra { display: none; }

        /* --- herói no celular: foto quadrada em cima, texto embaixo (§6.9) - */
        @media (max-width: 1000px) {
          .eb-hero { display: block; padding-top: clamp(28px, 5vw, 40px); }
          /* Sai do absoluto e volta ao fluxo: a foto passa a ocupar a largura
             cheia num quadrado, e o texto vem embaixo sobre a chapa sólida. */
          .eb-hero__fotos {
            position: relative;
            inset: auto;
            aspect-ratio: 1;
            margin: calc(clamp(28px, 5vw, 40px) * -1) calc(var(--scw-trilho) * -1) 0;
          }
          /* O véu existia para segurar texto SOBRE foto, e não há mais texto
             sobre foto. No lugar dele, a emenda: rampa de TRÊS paradas na cor
             do bloco, no ::after da própria imagem. Duas paradas voltariam a
             marcar aresta — o olho enxerga a derivada, não o valor (§10.4). */
          .eb-hero.scw-hero-veu::after { display: none; }
          .eb-hero__fotos::after {
            content: '';
            position: absolute;
            inset: auto 0 0 0;
            height: 46%;
            pointer-events: none;
            background: linear-gradient(180deg,
              rgba(61, 19, 8, 0) 0%,
              rgba(61, 19, 8, .58) 62%,
              var(--scw-choco) 100%);
          }
          .eb-hero__conteudo {
            max-width: none;
            padding-top: clamp(20px, 4vw, 30px);
          }
        }

        @media (max-width: 900px) {
          .eb-barra {
            display: block;
            position: fixed;
            left: 0; right: 0; bottom: 0;
            z-index: 70;
            padding: 10px clamp(16px, 4vw, 24px) calc(10px + var(--scw-safe-b));
            background: var(--scw-choco);
          }
          .eb-barra__btn { width: 100%; justify-content: center; }
          /* A barra é fixa: sem este respiro ela cobriria o rodapé. */
          .eb-rodape { padding-bottom: calc(clamp(28px, 3vw, 40px) + 74px + var(--scw-safe-b)); }
        }

        @media (max-width: 760px) {
          .eb-acao { align-self: stretch; }
          .eb-acao .scw-btn { width: 100%; justify-content: center; }
          .eb-passos__acao .scw-btn,
          .eb-fecho .scw-btn { width: 100%; justify-content: center; }
          .eb-rodape { justify-content: flex-start; }
        }
      `}</style>
    </div>
  )
}
