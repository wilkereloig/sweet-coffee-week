/*
 * PÁGINA INSTITUCIONAL — "Participar" (redesign 2026).
 *
 * Seções: 01 Abertura · 02 Depoimentos · 03 O que a marca ganha · 04 Números ·
 * 05 Como funciona · 06 Pré-cadastro.
 *
 * Refeita em 18/09/2026 (pedido do Wilke: "visual genérico"). Entraram 03 e 05,
 * que saem da receita grade-de-cards-com-disco das outras seções: 03 é mosaico
 * fotográfico, 05 é trilha de passos sobre chocolate. A 06 era 08 — a numeração
 * velha só guardava o lugar das seções que saíram em 26/08.
 *
 * ⚠️ A seção 06 NÃO tem mais formulário. Desde 22/08/2026 ela é uma chamada
 * para a página estática `/quero-participar/`, que é onde o pré-cadastro vive
 * de verdade — hoje dois passos (Você / O estabelecimento, sete campos),
 * validação por passo e gravação na tabela `quero_participar`, a que o
 * painel da organização lê.
 *
 * ⚠️ Em 26/08/2026 as seções 04 Circulação, 05 Quem pode, 06 Imprensa e
 * 07 Jornada saíram (pedido do Eloi): a página existia pra converter visita
 * fria; agora ela anuncia a próxima edição chegando e empurra pro
 * pré-cadastro, que já está aberto. Depoimentos e Números ficaram por serem
 * prova social direta. Nada de dado inventado: depoimentos e números vêm do
 * acervo/festivalFacts.js — nenhuma data ou tema da próxima edição é citado,
 * porque não foram anunciados (A4).
 */
import React from 'react'
import { I } from '../../components/icons'
import ScwIcon from '../../components/scw-icons/ScwIcon'
import { comboMain, fotoGanho, heroPhotos, RESERVA, SIZES, srcSet } from '../../data/imageLibrary'
import { HeroFotos } from '../../components/HeroFotos'
import { Marquee } from '../../components/Marquee'
import { resolveParticipant } from '../../data/participantAssets'
import { festivalFacts as F } from '../../data/festivalFacts'
import '../../styles/scw-participar-apoiar.css'

// Fotos do herói desta rota (sistema central): cartão em crossfade no desktop,
// banda sangrando no celular. O véu por cima usa a cor da página.
const FOTOS_HERO = heroPhotos('participar')

/* Os três indicadores do herói saíram com o cartão (PATCH 01 §6): a seção 04
   Números abaixo já cobre a prova de escala, e repetir os mesmos valores em
   seções vizinhas era a duplicação que ela resolvia. */

const PALAVRAS = [
  'um combo autoral', 'presença na campanha', 'nova relação com o público',
  'sua marca na rota', 'sweet lovers',
]

/* 03 O que a marca ganha (18/09/2026, pedido do Wilke). Quatro ganhos, cada um
   sobre uma foto do acervo (fotoGanho, em imageLibrary). Nada de promessa: o
   pré-cadastro não garante vaga nem prêmio (§8.4) — o texto diz o que a edição
   faz por quem participa. Selo numa cor do ciclo sem o magenta, que não fecha
   4,5:1 em texto pequeno com nenhuma das duas tintas. */
const GANHOS = [
  { chave: 'combo', selo: 'Criação', titulo: 'Um combo autoral, no tema da edição', texto: 'Doce, salgado e bebida inéditos, criados pela sua casa a partir do tema que abre cada edição.', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { chave: 'imprensa', selo: 'Visibilidade', titulo: 'Presença na campanha e na imprensa', texto: 'A campanha oficial e a cobertura de imprensa de cada edição apresentam as casas participantes.', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { chave: 'publico', selo: 'Público', titulo: 'Sweet Lovers batendo à sua porta', texto: 'Gente que se organiza para provar os combos e sai atrás de endereços que ainda não conhecia.', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { chave: 'awards', selo: 'Reconhecimento', titulo: 'Concorrer ao Sweet Awards', texto: 'Os combos disputam as categorias da edição, a partir da avaliação do público.', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
]

/* 04 Números — reformulada em 26/08/2026 (pedido do Eloi): fora os números de
   QUANTIDADE de participante (lojas/marcas por edição) — são pequenos e
   geram dúvida. Ficam só os expressivos: venda, combos, tempo de festival.
   Mesma dupla (movimentação + combos) que Apoiar usa em 02 Alcance — dado
   compartilhado, mesma fonte (festivalFacts.js), mesma leitura (§5.2). */
const NUMEROS = [
// Uma cor por card (15/09/2026, pedido do Wilke), na ordem do ciclo do §6.3 sem o
// magenta — nenhuma tinta fecha 4,5:1 sobre ele em texto pequeno.
  { n: '+R$ 712 mil', t: 'movimentação direta', d: F.revenue.mede, i: 'mecanica/promocao', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { n: '+34 mil', t: 'combos vendidos', d: F.combosSold.mede, i: 'combos/doce-cafe', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { n: `${F.years.value} anos`, t: 'de Sweet & Coffee Week', d: `o festival de doces e cafés de Natal, desde ${F.firstYear}`, i: 'ui/calendario', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { n: `${F.editions.value} edições`, t: 'já realizadas', d: 'uma curadoria e um tema autoral novos a cada edição', i: 'topicos/circulacao', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
]

/* 05 Como funciona (18/09/2026, pedido do Wilke). Só passos que existem de fato:
   o pré-cadastro de dois passos, a curadoria (critérios do FAQ de Participação),
   o painel da marca que a organização libera na aprovação (§10.4-b) e a edição
   com o Sweet Awards. Nó numa cor do ciclo filtrada pelo chocolate (§6.3). */
const PASSOS = [
  { titulo: 'Pré-cadastro', texto: 'Você conta sobre a casa e o estabelecimento em dois passos rápidos.', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { titulo: 'Curadoria', texto: 'A organização avalia o perfil, a capacidade de atendimento e o alinhamento com a proposta da edição.', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { titulo: 'Aprovação e painel', texto: 'Casa aprovada recebe acesso ao painel da marca, onde cadastra o combo e acompanha os pedidos da organização.', cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)' },
  { titulo: 'O combo nasce', texto: 'Doce, salgado e bebida inéditos, criados para o tema e aprovados antes da estreia.', cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
  { titulo: 'A edição acontece', texto: 'Os Sweet Lovers visitam as casas, avaliam os combos e o Sweet Awards reconhece os destaques.', cor: 'var(--scw-creme)', tinta: 'var(--scw-choco)' },
]

// 02 Depoimentos REAIS (transcritos do protótipo — não editar o sentido).
// A reserva da Caroli Douces (marca sem depoimento) saiu em 18/09/2026, pedido
// do Wilke: no palco, um depoimento vazio viraria uma aba que não diz nada.
const DEPOIMENTOS = [
  { frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.”', pessoa: 'Carol Barreto', marca: 'Jolie Café Pâtisserie', slug: 'jolie-cafe-patisserie', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { frase: '“É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos.”', pessoa: 'João Dantas', marca: 'O Maestro Café', slug: 'o-maestro-cafe', cor: 'var(--scw-marrom)', tinta: 'var(--scw-creme)' },
  { frase: '“O Sweet & Coffee Week hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.”', pessoa: 'Fernando Gurgel', marca: 'Paneer Pâtisserie', slug: 'paneer-patisserie', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { frase: '“O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.”', pessoa: 'César e Tiago', marca: 'Mr. Cupcake Confeitaria', slug: 'mr-cupcake-confeitaria', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { frase: '“Foi além das expectativas. Foram onze dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.”', pessoa: 'Edvan Barreto', marca: 'Casa 1190 - Restaurant e Coffee', slug: 'casa-1190', cor: 'var(--scw-choco)', tinta: 'var(--scw-creme)' },
]

// Depoimentos em vídeo (mesmo slug do participante). Ausente = mantém foto.
const DEPO_VIDEO_SLUGS = new Set([
  'jolie-cafe-patisserie',
  'mr-cupcake-confeitaria',
  'o-maestro-cafe',
  'casa-1190',
  'paneer-patisserie',
])
function depoVideoSrc(slug) {
  return DEPO_VIDEO_SLUGS.has(slug) ? `/videos/depoimentos/${slug}.mp4` : null
}

// Iniciais para o monograma de fallback da marca (ignora "e"/"&"; máx. 2 letras).
function iniciais(nome) {
  return (nome || '')
    .split(/[\s&]+/)
    .filter((w) => w && !/^e$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Logo da marca preenchendo o slot (§6.12); sem logo, iniciais sobre bege.
function LogoMarca({ slug, marca, classe }) {
  const { logo } = resolveParticipant(slug)
  return (
    <span className={classe} aria-hidden="true">
      {logo
        ? <img src={logo} alt="" loading="lazy" decoding="async" />
        : <span className="pa-palco__iniciais">{iniciais(marca)}</span>}
    </span>
  )
}

// Barra de ação fixa: só depois de o herói sair da tela.
function useBarra() {
  const [visivel, setVisivel] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onScroll = () => setVisivel(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return visivel
}

// Vídeo do palco. Toca SOB DEMANDA (15/09/2026, pedido do Wilke; §6.15/§6.16):
// com ponteiro, no hover/foco do palco; no toque, quando o vídeo entra ≥60% na
// tela. Com som ligado, não pausa ao sair. Cada troca de aba monta um vídeo
// novo (key = slug), então só existe um no DOM.
// O `muted` é sincronizado via ref porque a prop React não reflete de forma
// confiável a propriedade DOM depois da montagem.
function DepoVideo({ src, poster, alt, ativo, onToggle, describedBy }) {
  const ref = React.useRef(null)
  const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  React.useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = !ativo
    if (ativo) {
      v.currentTime = 0
      v.play().catch(() => {})
    }
  }, [ativo])

  React.useEffect(() => {
    const v = ref.current
    const card = v?.closest('.pa-palco')
    if (!v || !card || reduzido) return undefined
    const tocar = () => v.play().catch(() => {})
    const parar = () => { if (v.muted) v.pause() }

    if (window.matchMedia('(hover: hover)').matches) {
      const eventos = [['pointerenter', tocar], ['pointerleave', parar], ['focusin', tocar], ['focusout', parar]]
      eventos.forEach(([e, fn]) => card.addEventListener(e, fn))
      return () => eventos.forEach(([e, fn]) => card.removeEventListener(e, fn))
    }
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => (e.intersectionRatio >= 0.6 ? tocar() : parar()), { threshold: [0, 0.6] })
    io.observe(v)
    return () => io.disconnect()
  }, [reduzido])

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={!ativo}
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        aria-describedby={describedBy}
        onClick={onToggle}
      />
      <button type="button" className="pa-palco__som scw-icone-rotulo" onClick={onToggle} aria-pressed={ativo}
        aria-label={ativo ? 'Silenciar depoimento' : 'Ativar som do depoimento'}
        data-rotulo={ativo ? 'Silenciar' : 'Ouvir'}>
        {ativo ? <I.sound width={14} height={14} /> : <I.soundOff width={14} height={14} />}
      </button>
    </>
  )
}

export function ParticiparPage() {
  const barraVisivel = useBarra()
  const [somLigado, setSomLigado] = React.useState(null) // slug do depoimento com som ligado
  const [depo, setDepo] = React.useState(0) // aba do palco
  const escolher = (i) => { setDepo(i); setSomLigado(null) }
  // Abas (padrão WAI-ARIA): setas andam em laço, Home/End vão às pontas, e o
  // foco acompanha a seleção — só a aba ativa entra na tabulação.
  const teclasAbas = (e) => {
    const n = DEPOIMENTOS.length
    const alvo = { ArrowRight: depo + 1, ArrowLeft: depo - 1, Home: 0, End: n - 1 }[e.key]
    if (alvo === undefined) return
    e.preventDefault()
    const i = (alvo + n) % n
    escolher(i)
    e.currentTarget.querySelectorAll('[role="tab"]')[i]?.focus()
  }
  const d = DEPOIMENTOS[depo]
  const fotoDepo = comboMain(d.slug)
  const videoDepo = depoVideoSrc(d.slug)

  const irPara = (id) => (e) => {
    if (e) e.preventDefault()
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* ═══ 01 Abertura ═══ */}
      <section className="scw-hero-bloco scw-hero-veu pa-hero" aria-labelledby="pa-titulo">
        <HeroFotos fotos={FOTOS_HERO} />

        <div className="pa-hero__grade">
          <div>
            <h1 id="pa-titulo" className="scw-h1 pa-hero__titulo">
              A próxima edição está a caminho{' '}
              {/* Chapa cyan, tinta chocolate: o acento é roxo (4,25:1 — texto grande). */}
              <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-roxo)' }}>e o pré-cadastro já abriu.</em>
            </h1>
            <p className="scw-lead pa-hero__lead">
              Faça o pré-cadastro da sua marca agora e entre na fila de curadoria da
              organização para a próxima edição do Sweet & Coffee Week.
            </p>
            <div className="pa-hero__acoes">
              <a href="#pre-cadastro" className="scw-btn scw-btn--solido" onClick={irPara('pre-cadastro')}>
                Fazer pré-cadastro <I.arrow width={17} height={17} />
              </a>
              <a href="#ganhos" className="scw-btn scw-btn--contorno-claro" onClick={irPara('ganhos')}>
                Ver o que sua marca ganha
              </a>
            </div>
          </div>
        </div>
      </section>

      <Marquee palavras={PALAVRAS} comPausa />

      {/* ═══ 02 Depoimentos ═══
          Sobe logo depois da abertura (a pedido do Wilke, 30/07/2026): é a
          prova social da página — quem decide participar quer ouvir quem já
          participou antes de ler número ou processo. */}
      <section id="depoimentos" className="scw-secao scw-secao--creme">
        <div className="pa-cabeca pa-cabeca--simples">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/depoimento" tamanho={20} />Marcas que já viveram a edição</span>
          <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
            Quem participou conta com as <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>próprias palavras</em>.
          </h2>
        </div>

        {/* PALCO (18/09/2026, pedido do Wilke): um depoimento por vez, grande, e as
            marcas embaixo como abas. Substituiu a faixa de seis cards iguais. */}
        <div
          className="pa-palco"
          id="pa-palco"
          role="tabpanel"
          aria-labelledby={`pa-aba-${d.slug}`}
          style={{ '--cor': d.cor, '--tinta': d.tinta, '--filete': d.tinta === 'var(--scw-creme)' ? 'rgba(254,240,221,.24)' : 'rgba(61,19,8,.22)' }}
        >
          <div className="pa-palco__video">
            {videoDepo
              ? <DepoVideo
                  key={d.slug}
                  src={videoDepo}
                  poster={fotoDepo?.src}
                  alt={`${d.pessoa} falando sobre a experiência da ${d.marca} no Sweet & Coffee Week`}
                  ativo={somLigado === d.slug}
                  onToggle={() => setSomLigado((atual) => (atual === d.slug ? null : d.slug))}
                  describedBy="pa-palco-frase"
                />
              : fotoDepo
                ? <img src={fotoDepo.src} srcSet={srcSet(fotoDepo.src)} sizes={SIZES.cartao} alt={fotoDepo.alt} style={{ objectPosition: fotoDepo.position }} loading="lazy" decoding="async" />
                : <div className="scw-reserva">{RESERVA}</div>}
          </div>
          <figure className="pa-palco__fala" key={d.slug}>
            <blockquote id="pa-palco-frase">{d.frase}</blockquote>
            <figcaption className="pa-palco__quem">
              <LogoMarca slug={d.slug} marca={d.marca} classe="pa-palco__logo" />
              <span className="pa-palco__nome"><b>{d.pessoa}</b><span>{d.marca}</span></span>
            </figcaption>
          </figure>
        </div>

        <div className="pa-palco__marcas" role="tablist" aria-label="Escolha o depoimento" onKeyDown={teclasAbas}>
          {DEPOIMENTOS.map((m, i) => (
            <button
              type="button"
              role="tab"
              key={m.slug}
              id={`pa-aba-${m.slug}`}
              className="pa-palco__aba"
              aria-selected={i === depo}
              aria-controls="pa-palco"
              aria-label={m.marca}
              tabIndex={i === depo ? 0 : -1}
              style={{ '--cor': m.cor, '--tinta': m.tinta }}
              onClick={() => escolher(i)}
            >
              <LogoMarca slug={m.slug} marca={m.marca} classe="pa-palco__aba-logo" />
              <span className="pa-palco__aba-nome" aria-hidden="true">{m.marca}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ 03 O que a marca ganha ═══ */}
      <section id="ganhos" className="scw-secao scw-secao--bege">
        <div className="pa-cabeca pa-cabeca--simples">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="simbolos/destaque" tamanho={20} />O que a marca ganha</span>
          <h2 className="scw-h2">
            O que a edição <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>coloca na mesa</em> da sua marca.
          </h2>
        </div>
        <ul className="pa-ganhos">
          {GANHOS.map((g) => {
            const foto = fotoGanho(g.chave)
            return (
              <li className="pa-ganho" key={g.chave} style={{ '--c': g.cor, '--tinta': g.tinta }}>
                {foto
                  ? <img src={foto.src} srcSet={srcSet(foto.src)} sizes={SIZES.cheia} alt={foto.alt} style={{ objectPosition: foto.position }} loading="lazy" decoding="async" />
                  : <div className="scw-reserva">{RESERVA}</div>}
                <span className="scw-pill pa-ganho__selo">{g.selo}</span>
                <div className="pa-ganho__texto">
                  <h3 className="scw-h3">{g.titulo}</h3>
                  <p>{g.texto}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ═══ 04 Números ═══ */}
      <section id="numeros" className="scw-secao scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/alcance" tamanho={20} />A potência do festival</span>
            <h2 className="scw-h2">
              O tamanho da <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>vitrine</em> que sua marca ocupa.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Dez anos de rota e público que se organiza para provar cada edição.
          </p>
        </div>
        <ul className="pa-numeros pa-numeros--quatro">
          {NUMEROS.map((n) => (
            <li key={n.t} style={{ '--card': n.cor, '--card-tinta': n.tinta }}>
              <span className="scw-disco pa-num__disco" aria-hidden="true">
                <ScwIcon nome={n.i} tamanho={32} />
              </span>
              <b>{n.n}</b>
              <strong>{n.t}</strong>
              <span>{n.d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 05 Como funciona ═══ */}
      <section id="como-funciona" className="scw-secao scw-secao--choco">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="mapa/trajeto" tamanho={20} />Como funciona</span>
            <h2 className="scw-h2">
              Do pré-cadastro <em className="pa-destaque" style={{ '--base': 'var(--scw-creme)', '--dest': 'var(--scw-amarelo)' }}>à estreia do combo</em>.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            O pré-cadastro registra o interesse. A participação depende da curadoria e das vagas de cada edição.
          </p>
        </div>
        <ol className="pa-passos">
          {PASSOS.map((p, i) => (
            <li className="pa-passo" key={p.titulo} style={{ '--c': p.cor, '--tinta': p.tinta }}>
              <span className="pa-passo__no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="scw-h3">{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ═══ 06 Pré-cadastro ═══
          ⚠️ O FORMULÁRIO NÃO MORA MAIS AQUI (22/08/2026, pedido do Wilke). O
          pré-cadastro é a página estática /quero-participar/, que hoje tem
          DOIS passos (Você / O estabelecimento, sete campos ao todo, sem
          índice pegajoso — simplificado depois de 22/08/2026), validação por
          passo e o envio pela RPC `submit_quero_participar`.

          Duas telas pedindo os mesmos dados são duas fontes de verdade do mesmo
          cadastro (§5.2) — e era a daqui que ficava para trás a cada melhoria
          feita lá. A trava real, porém, é o BANCO: esta gravava em
          `participation_interests` e a de lá grava em `quero_participar`, que é
          a tabela que o painel da organização lê e triaria. Formulário que
          escreve numa tabela que ninguém abre é envio que se perde em silêncio.

          ⛔ A barra final de /quero-participar/ não é opcional (§10.4-b): sem
          ela o servidor cai no fallback do SPA e a pessoa vê a landing. */}
      <section id="pre-cadastro" className="scw-secao scw-secao--creme">
        <div className="pa-form__intro">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="mecanica/inscricao" tamanho={20} />Pré-cadastro</span>
          <h2 className="scw-h2">
            Comece a <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>jornada da sua marca</em>.
          </h2>
          <p>
            Leva menos de um minuto. Depois do envio, a equipe avalia o perfil e retorna pelos canais
            que você informar.
          </p>
        </div>

        <div className="pa-cta">
          <ul className="pa-cta__lista">
            <li><ScwIcon nome="ui/horario" tamanho={20} />Dois passos, sete campos, menos de um minuto</li>
            <li><ScwIcon nome="mecanica/loja" tamanho={20} />Seus dados e os do estabelecimento</li>
            <li><ScwIcon nome="mecanica/regulamento" tamanho={20} />Usados só pela organização, para contato e curadoria</li>
          </ul>
          <a className="scw-btn scw-btn--pagina pa-cta__botao" href="/quero-participar/">
            Fazer pré-cadastro <I.arrow width={17} height={17} />
          </a>
        </div>
      </section>

      <div className={`pa-barra${barraVisivel ? ' is-visivel' : ''}`}>
        <span>Inscrições passam por curadoria.</span>
        <a href="#pre-cadastro" className="scw-btn scw-btn--solido" onClick={irPara('pre-cadastro')}>
          Fazer pré-cadastro <I.arrow />
        </a>
      </div>
    </>
  )
}
