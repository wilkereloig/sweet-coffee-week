/*
 * PÁGINA "EM BREVE" — a landing pública do domínio (COMING_SOON_PUBLICATION).
 *
 * Reescrita em 25/08/2026: deixou de ser "aviso de novo site + Sweet Awards da
 * Lovers" e passou a ser a CHAMADA DO PRÉ-CADASTRO, com destino único
 * `/quero-participar/`.
 *
 * Em 25/08/2026 a ação saiu de três lugares e foi para UM: os botões do herói,
 * do fim dos passos e do fecho sumiram, e sobrou a barra presa na base, agora
 * em toda largura (era só do celular). Ver `BarraAcao`.
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
 * O cabeçalho com o botão "Painel SCW" NÃO mora aqui: é o `<SiteHeader apenasAcesso>`
 * que o `App.jsx` renderiza só nesta rota. ⛔ Não desenhar um segundo — duas
 * portas para o mesmo painel é fonte de verdade duplicada em forma de interface.
 */
import React from 'react'
import { MARCA_SCW } from '../../components/nav'
import ScwIcon from '../../components/scw-icons/ScwIcon'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { festivalFacts } from '../../data/festivalFacts'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { EDICOES_DADOS } from '../../data/handoff/edicoesData'
import { AWARDS_DADOS } from '../../data/handoff/awardsData'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'

/* Barra final obrigatória — ver o cabeçalho do arquivo e o §10.4-b. */
const PRE_CADASTRO = '/quero-participar/'

/*
 * AS 16 EDIÇÕES — a fonte única desta página, e o que a galeria do herói mostra.
 *
 * ⛔ Nada aqui é digitado. Tema, período, foto e marca saem de
 * `sweetCoffeeHistory` (via `edicoesData`); o vencedor do Melhor Combo sai de
 * `awardsData`. O handoff de design trazia uma tabela `TEMAS_PRE_AWARDS` com os
 * cinco primeiros temas escritos à mão — NÃO entrou: seria a segunda fonte de
 * verdade que o §5.2 proíbe, dentro do arquivo que a base já responde.
 *
 * 2016 não tem `tema` na base — o nome dela guarda a grafia antiga
 * ("S&C / Início"), e o prefixo "S&C" está proibido no site (§8.2). Tirar o
 * prefixo é transformação de leitura, não uma segunda tabela.
 *
 * ⚠️ As cinco primeiras edições (2016 a 2018.2) NÃO têm vencedor, e isso é
 * fato, não furo: o Sweet Awards estreou em 2019.1. O slide delas mostra o tema
 * e diz "antes do Sweet Awards" — ausência honesta, nunca preenchida (§8.5).
 */
const EDICOES = (SWEET_COFFEE_HISTORY.edicoes || [])
  .map((e) => {
    const dados = EDICOES_DADOS[e.id] || {}
    const premio = AWARDS_DADOS.edicoes.find((a) => a.code === e.id)
    const cat = premio && (premio.cats.find((c) => /melhor combo/i.test(c.nome)) || premio.cats[0])
    const primeiro = cat && cat.pod.find((p) => p.pos === 1)
    /* ⚠️ `editionPhotos` devolve OBJETO — {src, alt, position, indice} —, não
       caminho. Tratá-lo como string produz `url([object Object])`, que o
       navegador pede ao servidor e o fallback do SPA responde com 200 e o
       index.html (§10.4-b): nenhum 404, nenhum erro de console, e a foto
       simplesmente não aparece. O `alt` e o ponto focal vêm de lá também —
       escrever descrição de foto que ninguém viu seria dado inventado (A4). */
    const foto = (dados.fotos || [])[0] || null
    return {
      code: e.id,
      tema: e.tema || (e.nome || '').replace(/^S&C\s*\/?\s*/, ''),
      periodo: dados.periodo || '',
      foto: foto ? foto.src : null,
      fotoAlt: foto ? foto.alt : '',
      fotoFoco: foto ? foto.position : 'center',
      logo: dados.logo || null,
      vencedor: primeiro ? primeiro.nomes.join(' + ') : null,
    }
  })
  /* Edição sem foto ou sem marca não vira slide vazio: sai da galeria. Hoje as
     16 têm as duas coisas — o filtro existe para o dia em que uma edição nova
     entrar na base antes de o acervo dela ser normalizado. */
  .filter((e) => e.foto && e.logo)

const TEMAS = EDICOES.map((e) => e.tema).filter(Boolean)

/* Cada número numa cor diferente, na ordem do ciclo canônico (§6.3), filtrada
   pelo que sustenta leitura sobre creme em texto GRANDE (3:1): chocolate 12:1,
   roxo 6,7:1, marrom 6,9:1, magenta 3,8:1. Cyan (2,2) e amarelo (1,4) ficam de
   fora — sobre creme eles são superfície, nunca tinta.
   ⚠️ 26/08/2026, pedido do Eloi: "marcas participantes" saiu — número pequeno
   de contagem de marca gera dúvida, e a página já tem outro cartão de
   contagem (edições). No lugar entra a movimentação (F.revenue), o mesmo
   dado comercial de CLAUDE.md §9.5 e de Apoiar 02 — fonte única, não
   redigitado aqui. */
const F = festivalFacts
const NUMEROS = [
  { alvo: F.editions.value, rotulo: 'edições realizadas', cor: 'var(--scw-choco)', icone: 'simbolos/edicao' },
  { alvo: F.revenue.value, prefixo: '+R$ ', sufixo: ' mil', rotulo: 'movimentação direta', cor: 'var(--scw-roxo)', icone: 'mecanica/promocao' },
  { alvo: F.combosSold.value, prefixo: '+', sufixo: ' mil', rotulo: 'combos vendidos', cor: 'var(--scw-marrom)', icone: 'simbolos/combo-oficial' },
]

/* Os três nomeiam o que o combo É — conteúdo, não enfeite (§6.13). */
const CATEGORIAS = [
  { icone: 'doces/cupcake', rotulo: 'doce' },
  { icone: 'salgados/pao-de-queijo', rotulo: 'salgado' },
  { icone: 'bebidas/cappuccino', rotulo: 'café' },
]

const PASSOS = [
  { n: '01', t: 'Pré-cadastro', d: 'Você conta quem é, o que serve e o que torna a sua casa especial.', cor: 'var(--scw-amarelo)', icone: 'mecanica/inscricao' },
  { n: '02', t: 'Conversa', d: 'A organização entra em contato para entender o encaixe com a próxima edição.', cor: 'var(--scw-cyan)', icone: 'topicos/depoimento' },
  { n: '03', t: 'Cadastro do combo', d: 'Quem seguir adiante monta o combo — um doce, um salgado e uma bebida.', cor: 'var(--scw-laranja)', icone: 'combos/trio' },
]

/* A seta do sistema, não um SVG solto: ela lê o traço 3,2 do `SCW_ICON_SPEC` e
   acompanha qualquer mudança futura no desenho (§6.11). 20px é o degrau de
   botão da escala — o handoff pedia 18, que não existe na régua. */
const SETA = <ScwIcon nome="ui/seta-direita" tamanho={20} />

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
      {/* `data-conta-molde`: o snapshot do Claude Design arranca os <script> e
          congela a página. Sem isso o contador ficaria parado no valor em que a
          captura o pegou — e o Design desenharia em cima de um "0". O script lê
          este atributo e copia o texto do molde para o vivo. */}
      <span className="eb-num__molde" data-conta-molde>{prefixo}{alvo}{sufixo}</span>
      <span className="eb-num__vivo">{prefixo}{valor}{sufixo}</span>
    </span>
  )
}

/*
 * GALERIA DAS 16 EDIÇÕES — o herói do handoff de agosto/2026.
 *
 * O herói deixou de ter foto de FUNDO com texto por cima e passou a ter foto AO
 * LADO, em grade de duas colunas que colapsa sozinha. Como não há mais texto
 * sobre foto, o véu diagonal e a emenda de três paradas do celular saíram junto:
 * não há o que velar. Some com eles a `@keyframes ebRespira` — a galeria já tem
 * movimento próprio, e os dois competiriam.
 *
 * ⚠️ A PAUSA NÃO É CONFORTO, É REQUISITO. WCAG 2.2.2: movimento automático acima
 * de cinco segundos que carrega informação tem de ser pausável. Ela para em três
 * situações — mouse sobre a peça, foco dentro dela, botão de pausa — e nunca
 * chega a ligar com `prefers-reduced-motion`. É também o que impede a galeria de
 * ser o terceiro laço contínuo da página, acima do teto de dois (marquee e o
 * gradiente dele).
 *
 * ⚠️ O ouvinte de mouse e foco fica no INVÓLUCRO, não no quadro. O quadro não
 * tem nada focável dentro — os três botões moram nos controles, abaixo dele —,
 * então `onFocus` no quadro nunca dispararia e a pausa por teclado seria letra
 * morta. No invólucro, tabular até a seta pausa o giro, que é o comportamento
 * que a regra pede.
 *
 * ⚠️ A região viva anuncia só a troca MANUAL. Um `aria-live` disparando a cada
 * 5,2 segundos, para sempre, interromperia a leitura de quem usa leitor de tela
 * a cada cinco segundos. Os 15 slides fora de vista são `aria-hidden`: o leitor
 * percorre UMA edição, não dezesseis.
 */
function GaleriaEdicoes() {
  const total = EDICOES.length
  const [i, setI] = React.useState(total - 1)   // abre na edição mais recente
  const [pausado, setPausado] = React.useState(false)
  const [sobre, setSobre] = React.useState(false)
  const [anuncio, setAnuncio] = React.useState('')
  /* Uma leitura só, na montagem: `podeAnimar` consulta `matchMedia`, e chamá-la
     a cada render faria o efeito reavaliar sem necessidade. */
  const [gira] = React.useState(podeAnimar)

  const parado = pausado || sobre || !gira

  React.useEffect(() => {
    if (parado) return undefined
    const relogio = setInterval(() => setI((v) => (v + 1) % total), 5200)
    return () => clearInterval(relogio)
  }, [parado, i, total])

  const andar = (passo) => {
    const proximo = (i + passo + total) % total
    setI(proximo)
    const ed = EDICOES[proximo]
    setAnuncio(`Edição ${ed.code}, ${ed.tema}, ${proximo + 1} de ${total}`)
  }

  return (
    <div
      className="eb-gal"
      style={{ '--eb-i': i, '--eb-n': total }}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocus={() => setSobre(true)}
      onBlur={() => setSobre(false)}
    >
      <div className="eb-gal__quadro">
        <ul className="eb-gal__trilha">
          {EDICOES.map((ed, k) => (
            <li className="eb-gal__slide" key={ed.code} aria-hidden={k !== i ? 'true' : undefined}>
              <span
                className="eb-gal__foto"
                role="img"
                aria-label={ed.fotoAlt}
                style={{ backgroundImage: `url("${ed.foto}")`, backgroundPosition: ed.fotoFoco }}
              />
              <span className="eb-gal__veu" aria-hidden="true" />
              {/* ⚠️ CONTORNO CLARO, NUNCA CHAPA ATRÁS DA LOGO — a chapa foi
                  desenhada, mostrada e recusada. São 16 marcas de cores
                  arbitrárias sobre fotografia arbitrária, e o caso que quebra é
                  escuro-sobre-escuro (a marca vinho de Séries sobre uma cortina
                  vinho). Escurecer o véu PIORA esse caso; o halo creme no
                  próprio filtro resolve nos dois extremos. */}
              <img className="eb-gal__logo" src={ed.logo} alt={`Marca da edição ${ed.code}`} loading="lazy" />
              <span className="eb-gal__rotulo">
                {ed.vencedor ? `Melhor combo · ${ed.code}` : `Edição ${ed.code}`}
              </span>
              <span className="eb-gal__legenda">
                <strong className="eb-gal__nome">{ed.vencedor || ed.tema}</strong>
                <span className="eb-gal__meta">
                  {ed.vencedor ? `${ed.tema} · ${ed.periodo}` : `${ed.periodo} · antes do Sweet Awards`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="eb-gal__controles">
        <button type="button" className="eb-gal__btn" aria-label="Edição anterior" onClick={() => andar(-1)}>
          <ScwIcon nome="ui/seta-esquerda" tamanho={20} />
        </button>
        <button type="button" className="eb-gal__btn" aria-label="Próxima edição" onClick={() => andar(1)}>
          <ScwIcon nome="ui/seta-direita" tamanho={20} />
        </button>
        <button
          type="button"
          className="eb-gal__btn"
          aria-label={pausado ? 'Retomar a galeria das edições' : 'Pausar a galeria das edições'}
          onClick={() => setPausado((v) => !v)}
        >
          <ScwIcon nome={pausado ? 'ui/play' : 'ui/pausa'} tamanho={20} />
        </button>
        <span className="eb-gal__barra" aria-hidden="true"><span /></span>
        <span className="eb-gal__contador">
          {String(i + 1).padStart(2, '0')} / {total}
        </span>
      </div>

      <p aria-live="polite" className="eb-sr">{anuncio}</p>
    </div>
  )
}

/*
 * A BARRA DA AÇÃO — a única chamada da página desde 25/08/2026.
 *
 * Os três botões "Quero participar" que moravam no herói, no fim dos passos e
 * no fecho saíram (pedido do Eloi). A ação deixou de ser algo que o leitor
 * reencontra três vezes e passou a ser algo que nunca sai da tela.
 *
 * ⚠️ O CONVITE É FINITO, NUNCA UM LAÇO — e isso não é economia, é regra. A
 * página já tem dois laços contínuos, o marquee e o gradiente dele, que é o
 * teto do sistema (§6.15). Um pulso permanente na barra seria o terceiro, e
 * ainda por cima um que ninguém pode pausar: diferente da galeria, não há como
 * parar um botão que pisca. Então o gesto dispara em dois momentos e para —
 * quando a barra chega, e quando o leitor alcança o fecho, que é onde ele
 * decide. Entre um e outro a barra fica completamente parada.
 *
 * ⚠️ Sem classe de reveal, nunca: elemento `position: fixed` não entra na zona
 * de disparo do observer e ficaria invisível para sempre (§10.3). A entrada
 * dela é `@keyframes` na montagem, que não depende de observer nenhum.
 */
function BarraAcao() {
  const ref = React.useRef(null)
  const [batendo, setBatendo] = React.useState(false)
  const [lido, setLido] = React.useState(0)

  /* ⚠️ ALTURA DE BARRA FIXA SE MEDE, NÃO SE CALCULA (§10.4-b). O primeiro
     palpite foi 70px — "padding + botão", na conta — e o botão real dá 84px:
     a barra cobria 31px do rodapé e se sobrepunha ao aviso de cookies nas três
     larguras. Quem escreve o token agora é o próprio elemento, e reescreve
     quando a fonte termina de carregar, quando a tela gira ou quando a nota
     entra e sai no ponto de 760px. */
  React.useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const escrever = () =>
      document.body.style.setProperty('--eb-barra-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    escrever()
    if (typeof ResizeObserver === 'undefined') return () => document.body.style.removeProperty('--eb-barra-h')
    const ro = new ResizeObserver(escrever)
    ro.observe(el)
    return () => { ro.disconnect(); document.body.style.removeProperty('--eb-barra-h') }
  }, [])

  /* 1º convite: logo depois de a barra terminar de subir. */
  React.useEffect(() => {
    if (!podeAnimar()) return undefined
    const t = setTimeout(() => setBatendo(true), 1000)
    return () => clearTimeout(t)
  }, [])

  /* O INDICADOR. É a peça de 3px da barra de abas, trazida com o mesmo desenho
     e o mesmo mecanismo — transform, origem à esquerda, sem transição (§10.3) —,
     mas com sentido próprio: na barra de abas ele diz ONDE você está entre cinco
     destinos; aqui, QUANTO da página você já leu. Sem sentido nenhum ele seria
     grafismo puro, e o §6.13 manda tirar.
     ⚠️ Sem transição de propósito: ele acompanha um valor exato quadro a quadro,
     e transição em barra de progresso trava o valor — a régua de anos de Edições
     custou essa lição. */
  React.useEffect(() => {
    let quadro = 0
    const medir = () => {
      quadro = 0
      const alcance = document.documentElement.scrollHeight - window.innerHeight
      setLido(alcance > 0 ? Math.min(1, Math.max(0, window.scrollY / alcance)) : 1)
    }
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(medir) }
    medir()
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('resize', aoRolar)
    return () => {
      window.removeEventListener('scroll', aoRolar)
      window.removeEventListener('resize', aoRolar)
      if (quadro) cancelAnimationFrame(quadro)
    }
  }, [])

  /* 2º convite: quem chegou ao fecho já leu a página inteira e está decidindo.
     Uma vez só — `disconnect` no primeiro cruzamento. Insistir depois disso
     deixa de ser convite e vira cutucão. */
  React.useEffect(() => {
    if (!podeAnimar()) return undefined
    const alvo = document.querySelector('.eb-fecho')
    if (!alvo) return undefined
    const io = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      io.disconnect()
      setBatendo(true)
    }, { threshold: 0.35 })
    io.observe(alvo)
    return () => io.disconnect()
  }, [])

  return (
    <div className="eb-barra scw-casca-base" ref={ref} style={{ '--eb-lido': lido }}>
      <span className="eb-barra__indicador" aria-hidden="true" />
      <span className="eb-barra__nota">Quatro passos rápidos. Não compromete nada.</span>
      <a
        className={`scw-btn scw-btn--solido eb-barra__btn${batendo ? ' is-convite' : ''}`}
        href={PRE_CADASTRO}
        onAnimationEnd={() => setBatendo(false)}
      >
        Abrir o pré-cadastro{SETA}
      </a>
    </div>
  )
}

export function EmBrevePage() {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef, [])

  return (
    <div className="eb-page" ref={rootRef}>
      {/* 1 — TOPO: a marca. O botão "Painel SCW" vem do cabeçalho fixo do App. */}
      <div className="eb-topo">
        <img className="eb-topo__marca" src={MARCA_SCW} alt="Sweet &amp; Coffee Week" />
      </div>

      {/* 2 — HERÓI: a notícia e a ação */}
      <header className="eb-hero">
        <div className="eb-hero__grade">
        <div className="eb-hero__conteudo motion-stagger">
          <span className="scw-pill eb-pill">Pré-cadastro aberto</span>
          <h1 className="scw-h1 eb-h1">
            Uma <em className="scw-italico eb-h1__dest">nova edição</em> do Sweet &amp; Coffee Week vem aí.
          </h1>
          <p className="scw-lead eb-lead">
            São 16 edições transformando Natal numa rota de doce, salgado e café. A próxima
            está sendo preparada, e o pré-cadastro para os estabelecimentos já está aberto.
          </p>
        </div>
          <GaleriaEdicoes />
        </div>
      </header>

      {/* 3 — PROVA: os números do acervo */}
      <section className="scw-secao scw-secao--creme eb-prova">
        <ul className="eb-prova__grade motion-stagger">
          {NUMEROS.map((n) => (
            <li className="eb-num" key={n.rotulo} style={{ color: n.cor }}>
              <span aria-hidden="true">
                <span className="eb-num__icone"><ScwIcon nome={n.icone} tamanho={32} /></span>
                <Contador alvo={n.alvo} prefixo={n.prefixo} sufixo={n.sufixo} />
                <span className="eb-num__rotulo">{n.rotulo}</span>
              </span>
              <span className="eb-sr">{n.prefixo || ''}{n.alvo}{n.sufixo || ''} {n.rotulo}</span>
            </li>
          ))}
          {/* ⚠️ "desde 2016" é PALAVRA, não numeral: na escala dos outros três
              ela estoura a coluna e some no `overflow-x: clip` da página, sem
              barra que denuncie. Escala própria resolve na origem — alargar a
              coluna traria de volta o órfão de 3+1. */}
          <li className="eb-num eb-num--palavra" style={{ color: 'var(--scw-magenta)' }}>
            <span className="eb-num__icone"><ScwIcon nome="simbolos/memoria" tamanho={32} /></span>
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
            sorveterias, bistrôs, restaurantes e cozinhas sem loja física, em Natal e região.
          </p>
          <ul className="eb-cats">
            {CATEGORIAS.map((c) => (
              <li className="eb-cat" key={c.rotulo}>
                <ScwIcon nome={c.icone} tamanho={24} />
                <span>{c.rotulo}</span>
              </li>
            ))}
          </ul>
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
              <span className="eb-passo__n" style={{ background: p.cor }}>
                <ScwIcon nome={p.icone} tamanho={48} />
              </span>
              <span className="eb-passo__ordem">Passo {p.n}</span>
              <h3 className="scw-h3">{p.t}</h3>
              <p className="scw-corpo eb-passo__txt">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 7 — FECHO */}
      <section className="scw-secao scw-secao--choco eb-fecho">
        <div className="eb-fecho__inner motion-stagger">
          <h2 className="scw-h2 eb-fecho__h2">O pré-cadastro é o primeiro passo.</h2>
          <p className="scw-corpo eb-fecho__txt">
            A próxima edição está sendo montada agora. O pré-cadastro é o primeiro passo.
            Não compromete nada.
          </p>
          <span className="eb-fecho__selo"><ScwIcon nome="simbolos/sweet-lovers" tamanho={32} /></span>
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
        {/* ⚠️ O separador entre as duas metades é um VÃO DE FLEX, não um "·".
            O caractere órfa nas duas pontas e não há posição que resolva: preso
            ao texto, a primeira linha terminava nele; movido para dentro do
            link, a segunda linha passava a começar com ele. O link é
            `inline-flex` com 44px de alvo (§10.2), então ele quebra cedo e a
            quebra sempre cai no separador. O "·" que importa continua onde ele
            é conteúdo: dentro de "Week · Natal/RN". */}
        <p className="eb-rodape__linha">
          <span className="eb-rodape__cidade">Sweet &amp; Coffee Week · Natal/RN</span>{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>
        </p>
      </footer>

      {/* 9 — A AÇÃO PRESA NA BASE, em toda largura. Ver o cabeçalho de BarraAcao. */}
      <BarraAcao />

      <style>{`
        /* A altura da barra fixa mora no BODY, e não em .eb-page, porque quem
           também precisa dela é o aviso de cookies — que é peça de casca, irmã
           desta página e não filha dela (§6.10). Um valor só, dois leitores. */
        /* 108px é o valor MEDIDO (12 + botão de 84 + 12), não estimado, e serve
           de padrão enquanto o JS não escreve o token. A medida já inclui o
           respiro de \`--scw-safe-b\` que a própria barra aplica no padding —
           por isso quem consome soma só uma folga, nunca o safe-b de novo. */
        body.route-em-breve { --eb-barra-h: 108px; }

        .eb-page {
          min-height: 100vh;
          background: var(--scw-creme);
          color: var(--scw-choco);
          overflow-x: clip;
          /* A barra é fixa e vale em TODA largura desde 25/08/2026: sem este
             respiro ela cobriria o fim do rodapé em qualquer tela. */
          padding-bottom: calc(var(--eb-barra-h) + 12px);
        }

        /* O aviso de cookies nasce colado na base, no mesmo lugar da barra. Um
           banner de consentimento por cima da única conversão da página é as
           duas coisas piores ao mesmo tempo: esconde a ação e faz o aviso legal
           parecer estorvo. Ele sobe a altura da barra e os dois convivem.
           ⚠️ Escopado na rota, nunca solto: o mesmo banner serve as sete rotas,
           e só esta tem barra fixa em toda largura. */
        body.route-em-breve .cookie-consent {
          bottom: calc(clamp(12px, 2vw, 24px) + var(--eb-barra-h));
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
             o "Painel SCW" pousar DENTRO da faixa e não sobre o herói. */
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
          padding: clamp(30px, 4.4vw, 72px) var(--scw-trilho) clamp(48px, 6vw, 96px);
        }
        /* Duas colunas que colapsam SOZINHAS, sem media query: abaixo de ~880px
           não cabem duas faixas de 400px e a grade empilha texto e galeria. Foi
           isso que aposentou o bloco @media do herói — e, junto com ele, o véu
           diagonal e a emenda de três paradas, que existiam só para segurar
           texto SOBRE foto. Não há mais texto sobre foto. */
        .eb-hero__grade {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
          gap: clamp(30px, 4vw, 72px);
          align-items: center;
          max-width: 1600px;
          margin-inline: auto;
        }
        .eb-hero__conteudo {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: clamp(16px, 1.8vw, 22px);
        }
        .eb-pill { background: var(--scw-amarelo); color: var(--scw-choco); }
        .eb-h1 { color: var(--scw-creme); }
        /* Um acento por chapa (§6.2). Magenta sobre chocolate dá 3,8:1 — passa
           em texto grande, que é exatamente o que o .scw-h1 é. */
        .eb-h1__dest { color: var(--scw-magenta); }
        .eb-lead { color: var(--scw-creme); }

        /* --- GALERIA DAS 16 EDIÇÕES ------------------------------------- */
        /* A respiração de 26s da foto saiu junto com o herói de fundo: a galeria
           tem movimento próprio e as duas competiriam. */
        .eb-gal { display: flex; flex-direction: column; gap: 14px; }
        .eb-gal__quadro {
          position: relative;
          aspect-ratio: 1;              /* 1:1 — a proporção de galeria do §6.12 */
          border-radius: 26px;
          overflow: hidden;
          background: var(--scw-marrom);
          box-shadow: 0 22px 60px rgba(0, 0, 0, .36);
        }
        /* Um custom property só (--eb-i), em vez de dezesseis regras. */
        .eb-gal__trilha {
          display: flex;
          width: 100%; height: 100%;
          margin: 0; padding: 0; list-style: none;
          transform: translate3d(calc(var(--eb-i, 0) * -100%), 0, 0);
          transition: transform 620ms var(--scw-ease);
        }
        .eb-gal__slide { position: relative; flex: 0 0 100%; height: 100%; }
        .eb-gal__foto {
          position: absolute; inset: 0; display: block;
          background-size: cover; background-position: center;
        }
        /* CINCO paradas, não duas: o olho enxerga a derivada, não o valor, e uma
           rampa de duas paradas marca aresta nos dois pontos onde começa e onde
           termina (§10.4). A do topo segura o rótulo; a da base, a legenda. */
        .eb-gal__veu {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(180deg,
            rgba(61, 19, 8, .5) 0%,
            rgba(61, 19, 8, .16) 20%,
            rgba(61, 19, 8, .06) 34%,
            rgba(61, 19, 8, .14) 48%,
            rgba(61, 19, 8, .84) 100%);
        }
        /* Contorno CLARO no próprio filtro, nunca chapa atrás da marca — o
           porquê está no comentário do JSX. */
        .eb-gal__logo {
          position: absolute;
          top: clamp(16px, 2vw, 26px); left: clamp(16px, 2vw, 26px);
          height: clamp(62px, 7vw, 96px); width: auto; display: block;
          filter: drop-shadow(0 0 2px rgba(254, 240, 221, .92))
                  drop-shadow(0 0 6px rgba(254, 240, 221, .55))
                  drop-shadow(0 3px 12px rgba(61, 19, 8, .45));
        }
        .eb-gal__rotulo {
          position: absolute;
          top: clamp(16px, 2vw, 26px); right: clamp(16px, 2vw, 26px);
          display: inline-flex; align-items: center;
          padding: 7px 13px 5px;
          border-radius: 999px;
          background: rgba(61, 19, 8, .72);
          color: var(--scw-creme);
          font: 800 10px/1.2 var(--scw-font);
          letter-spacing: .14em; text-transform: uppercase;
        }
        .eb-gal__legenda {
          position: absolute; inset: auto 0 0 0;
          display: flex; flex-direction: column; gap: 7px;
          padding: clamp(18px, 2.2vw, 30px);
        }
        .eb-gal__nome {
          font: 900 clamp(21px, 2.1vw, 30px)/1.05 var(--scw-font-black);
          letter-spacing: -.03em; color: var(--scw-creme); text-wrap: balance;
        }
        .eb-gal__meta { font: 500 13px/1.45 var(--scw-font); color: rgba(254, 240, 221, .82); }
        .eb-gal__controles { display: flex; align-items: center; gap: 12px; }
        .eb-gal__btn {
          display: inline-grid; place-items: center;
          width: 48px; height: 48px; flex: 0 0 auto;
          border: 1.5px solid rgba(254, 240, 221, .42);
          border-radius: 50%;
          background: transparent; color: var(--scw-creme);
          cursor: pointer;
          transition: background .2s var(--scw-ease), color .2s var(--scw-ease);
        }
        @media (hover: hover) {
          .eb-gal__btn:hover { background: var(--scw-creme); color: var(--scw-choco); }
        }
        .eb-gal__barra {
          position: relative; flex: 1 1 auto; height: 3px;
          border-radius: 3px; background: rgba(254, 240, 221, .22); overflow: hidden;
        }
        /* scaleX com origem à esquerda, não width: é o padrão que a régua de anos
           de Edições já usa, e não pede layout a cada quadro (§10.3). */
        .eb-gal__barra > span {
          position: absolute; inset: 0;
          border-radius: 3px; background: var(--scw-amarelo);
          transform-origin: left center;
          transform: scaleX(calc((var(--eb-i, 0) + 1) / var(--eb-n, 16)));
          transition: transform 620ms var(--scw-ease);
        }
        .eb-gal__contador {
          flex: 0 0 auto;
          font: 800 12px/1 var(--scw-font);
          letter-spacing: .14em; color: rgba(254, 240, 221, .82);
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .eb-gal__trilha, .eb-gal__barra > span { transition: none; }
        }

        /* 3 — PROVA ------------------------------------------------------ */
        /* ⚠️ Quatro colunas fixas, e 2×2 abaixo de 900px — NÃO um auto-fit.
           Qualquer auto-fit desce de 4 para 3 antes de chegar a 2, e o quarto
           item fica órfão com dois vãos ao lado; o handoff propunha piso de
           140px para evitar isso, mas o auto-fit sempre passa pelo 3. Com
           repeat() explícito a fileira vai de 4 direto para 2×2, sem largura
           mágica. 900px é o degrau canônico do §6.14. */
        .eb-prova__grade {
          list-style: none; margin: 0; padding: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(16px, 2.4vw, 32px);
        }
        @media (max-width: 900px) {
          .eb-prova__grade { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .eb-num { display: flex; flex-direction: column; gap: 8px; }
        /* Caixa de BLOCO, não inline: o ícone dos três primeiros mora dentro do
           invólucro inline que o aria-hidden cria, e como inline ele pousava AO
           LADO do numeral em vez de acima. Caixa de bloco resolve, e os quatro
           itens voltam a alinhar pelo topo. */
        .eb-num__icone { display: flex; margin-bottom: 8px; }
        /* "desde 2016" é palavra: escala própria, e livre para quebrar em duas
           linhas em vez de estourar a coluna. */
        .eb-num--palavra .scw-numeral {
          font-size: clamp(30px, 3.2vw, 54px);
          letter-spacing: -.05em;
          white-space: normal;
          text-wrap: balance;
        }
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

        /* Os três nomeiam o que o combo é. Chapa creme sobre o bege da seção:
           13:1 de tinta chocolate, e o filete fica por conta do contraste das
           duas superfícies (§6.1). */
        .eb-cats {
          display: flex; flex-wrap: wrap; gap: 10px;
          list-style: none; margin: clamp(6px, 1vw, 12px) 0 0; padding: 0;
        }
        .eb-cat {
          display: inline-flex; align-items: center; gap: 11px;
          min-height: 52px; padding: 0 20px 0 16px;
          border-radius: 999px;
          background: var(--scw-creme); color: var(--scw-choco);
          font: 800 14px/1 var(--scw-font);
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
        /* 80px de disco com ícone de 48px = os 60% do §6.3. O numeral saiu de
           dentro e virou o rótulo abaixo: quem diz o que a etapa É agora é o
           desenho, e a ordem vira metadado. */
        .eb-passo__n {
          display: inline-grid;
          place-items: center;
          width: 80px; height: 80px;
          border-radius: 50%;
          color: var(--scw-choco);
        }
        .eb-passo__ordem {
          font: 800 11px/1 var(--scw-font);
          letter-spacing: .16em; text-transform: uppercase;
          color: var(--scw-marrom);
        }
        .eb-passo__txt { max-width: 34ch; }

        /* 7 — FECHO ------------------------------------------------------ */
        .eb-fecho__inner { display: flex; flex-direction: column; align-items: flex-start; gap: var(--scw-gap-bloco); }
        .eb-fecho__selo { display: inline-flex; color: var(--scw-amarelo); }
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
        .eb-rodape__f2 img { height: 24px; width: auto; }
        .eb-rodape__cidade { white-space: nowrap; }
        /* Vão no lugar do separador. O "·" solto órfa nas duas pontas: preso ao
           texto, a primeira linha terminava nele; movido para dentro do link,
           a segunda linha passava a COMEÇAR com ele. Um gap não órfã em largura
           nenhuma, e o "·" que importa continua dentro de "Week · Natal/RN". */
        .eb-rodape__linha {
          margin: 0;
          display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px;
          font: 500 13.5px/1.5 var(--scw-font);
          color: var(--scw-marrom);
        }
        .eb-page .eb-rodape__linha a {
          color: var(--scw-choco);
          font-weight: 800;
          display: inline-flex; align-items: center; min-height: 44px;
        }

        /* 9 — A BARRA DA AÇÃO -------------------------------------------- */
        /* Era só do celular até 25/08/2026. Agora vale em toda largura, porque
           virou a única chamada da página. */
        /* A chapa, o desfoque, o filete e o \`position: fixed\` vêm de
           \`.scw-casca-base\` — a mesma casca da barra de abas do site. Aqui fica
           só o que é desta barra: o arranjo interno e o ritmo vertical de 8px,
           que é o da barra de abas. */
        .eb-barra {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(12px, 2vw, 28px);
          padding: 8px var(--scw-trilho) calc(8px + var(--scw-safe-b));
          /* A chegada: a barra sobe até o leitor. Mesma duração e mesma curva
             do aviso de cookies, que faz este exato gesto — nada de tempo novo
             (§6.15, regra 7). */
          animation: ebBarraSobe var(--mo-entra) var(--mo-mola) both;
        }
        @keyframes ebBarraSobe {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: none; }
        }

        /* ⚠️ A tinta do botão é PREFIXADA, e não é preciosismo: o reset
           .eb-page a { color: inherit } tem especificidade 0,1,1 e venceria
           .scw-btn--solido sozinha (0,1,0). Hoje ele sobrevive por acidente,
           herdando o chocolate de .eb-page; no dia em que alguém pintar a barra
           de creme para a nota, o botão sai creme sobre amarelo — 1,4:1,
           invisível. É a armadilha nº 1 do §10.1, e ela já custou duas vezes
           neste projeto. */
        /* O indicador de leitura, no lugar exato em que a barra de abas põe o
           dela: colado no topo da chapa. */
        .eb-barra__indicador {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: 3px;
          background: var(--scw-amarelo);
          transform: scaleX(var(--eb-lido, 0));
          transform-origin: left center;
        }

        /* ⛔ Não redeclarar box-sizing aqui. Em 25/08/2026 esta página
           esteve FORA do reset do sistema, e as peças entravam no border-box uma
           a uma para não sair deformadas: o .scw-btn rendia 84px em vez de 54 e
           os controles da galeria, 51px em vez de 48. A exclusão caiu no mesmo dia e
           o reset vale nas sete rotas — declaração local aqui volta a ser a
           segunda fonte de verdade que o §5.2 proíbe. */

        .eb-page .eb-barra__btn { color: var(--scw-choco); }
        /* O mesmo tom do rótulo das abas: .9 de creme sobre a chapa = 12,6:1. */
        .eb-barra__nota {
          font: 500 13.5px/1.4 var(--scw-font);
          color: rgba(254, 240, 221, .9);
        }

        /* O CONVITE. Gesto finito, disparado por evento — ver o cabeçalho de
           BarraAcao para o motivo de não ser um laço. Só transform: nada de
           layout shift (§6.15, regra 3). */
        @keyframes ebConvite {
          0%, 100% { transform: none; }
          35%      { transform: translateY(-5px); }
          70%      { transform: translateY(0); }
        }
        @keyframes ebConviteSeta {
          0%, 100% { transform: none; }
          40%      { transform: translateX(5px); }
        }
        .eb-barra__btn.is-convite      { animation: ebConvite var(--mo-entra) var(--mo-mola) 2; }
        .eb-barra__btn.is-convite svg  { animation: ebConviteSeta var(--mo-entra) var(--mo-mola) 2; }

        /* Escrito junto, sempre (§6.15, regra 4). O gate de JS em podeAnimar
           já impede o convite de disparar; esta é a segunda tranca, para a
           entrada da barra, que é CSS puro e não passa por JS nenhum. */
        @media (prefers-reduced-motion: reduce) {
          .eb-barra,
          .eb-barra__btn.is-convite,
          .eb-barra__btn.is-convite svg { animation: none; }
        }

        @media (max-width: 760px) {
          /* A nota sai e o botão toma a largura: numa barra fixa, cada linha a
             mais é viewport a menos, e o que precisa estar ali é a ação. A
             informação dos quatro passos reaparece dentro do próprio
             /quero-participar/, que os numera na tela. */
          /* 10px é o gutter da barra de abas — a mesma folga, para as duas
             lerem como a mesma peça de casca. */
          .eb-barra { padding-inline: 10px; justify-content: center; }
          .eb-barra__nota { display: none; }
          /* ⛔ O botão NÃO estica. Esticado, ele virava uma lâmina amarela de
             ponta a ponta e a barra deixava de parecer casca de aplicativo — a
             barra de abas do site é escura com acentos contidos, e é com ela
             que esta peça tem de conversar. Na largura do conteúdo o alvo ainda
             passa de 200px, muito acima dos 44px do §6.10. */
          .eb-barra__btn { justify-content: center; }
          .eb-rodape { justify-content: flex-start; }
        }
      `}</style>
    </div>
  )
}
