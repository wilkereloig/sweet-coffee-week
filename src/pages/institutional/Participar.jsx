/*
 * PÁGINA INSTITUCIONAL — "Participar" (redesign 2026).
 *
 * Seções: 01 Abertura · 02 Depoimentos · 03 Números · 08 Pré-cadastro.
 *
 * ⚠️ A seção 08 NÃO tem mais formulário. Desde 22/08/2026 ela é uma chamada
 * para a página estática `/quero-participar/`, que é onde o pré-cadastro vive
 * de verdade — quatro passos, índice pegajoso, validação por passo e gravação
 * na tabela `quero_participar`, a que o painel da organização lê.
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
import { comboMain, heroPhotos, RESERVA, SIZES, srcSet } from '../../data/imageLibrary'
import { HeroFotos } from '../../components/HeroFotos'
import { Marquee } from '../../components/Marquee'
import { resolveParticipant } from '../../data/participantAssets'
import { festivalFacts as F } from '../../data/festivalFacts'
import '../../styles/scw-participar-apoiar.css'

// Fotos do herói desta rota (sistema central): cartão em crossfade no desktop,
// banda sangrando no celular. O véu por cima usa a cor da página.
const FOTOS_HERO = heroPhotos('participar')

/* Os três indicadores do herói saíram com o cartão (PATCH 01 §6): a seção 03
   Números abaixo já cobre a prova de escala, e repetir os mesmos valores em
   seções vizinhas era a duplicação que ela resolvia. */

const PALAVRAS = [
  'um combo autoral', 'presença na campanha', 'nova relação com o público',
  'sua marca na rota', 'sweet lovers',
]

/* 03 Números — reformulada em 26/08/2026 (pedido do Eloi): fora os números de
   QUANTIDADE de participante (lojas/marcas por edição) — são pequenos e
   geram dúvida. Ficam só os expressivos: venda, combos, tempo de festival.
   Mesma dupla (movimentação + combos) que Apoiar usa em 02 Alcance — dado
   compartilhado, mesma fonte (festivalFacts.js), mesma leitura (§5.2). */
const NUMEROS = [
  { n: '+R$ 712 mil', t: 'movimentação direta', d: F.revenue.mede, i: 'mecanica/promocao' },
  { n: '+34 mil', t: 'combos vendidos', d: F.combosSold.mede, i: 'combos/doce-cafe' },
  { n: `${F.years.value} anos`, t: 'de Sweet & Coffee Week', d: `o festival de doces e cafés de Natal, desde ${F.firstYear}`, i: 'ui/calendario' },
  { n: `${F.editions.value} edições`, t: 'já realizadas', d: 'uma curadoria e um tema autoral novos a cada edição', i: 'topicos/circulacao' },
]

// 05 Depoimentos REAIS (transcritos do protótipo — não editar o sentido).
// O 6º card é reserva editorial honesta: a marca existe, o depoimento ainda não.
const DEPOIMENTOS = [
  { frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.”', pessoa: 'Carol Barreto', marca: 'Jolie Café Pâtisserie', slug: 'jolie-cafe-patisserie', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { frase: '“É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos.”', pessoa: 'João Dantas', marca: 'O Maestro Café', slug: 'o-maestro-cafe', cor: 'var(--scw-marrom)', tinta: 'var(--scw-creme)' },
  { frase: '“O Sweet & Coffee Week hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.”', pessoa: 'Fernando Gurgel', marca: 'Paneer Pâtisserie', slug: 'paneer-patisserie', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { frase: '“O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.”', pessoa: 'César e Tiago', marca: 'Mr. Cupcake Confeitaria', slug: 'mr-cupcake-confeitaria', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { frase: '“Foi além das expectativas. Foram onze dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.”', pessoa: 'Edvan Barreto', marca: 'Casa 1190 - Restaurant e Coffee', slug: 'casa-1190', cor: 'var(--scw-choco)', tinta: 'var(--scw-creme)' },
  { frase: null, pessoa: null, marca: 'Caroli Douces', slug: 'caroli-douces', cor: 'var(--scw-bege)', tinta: 'var(--scw-choco)' },
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

// Cartão de depoimento em vídeo: autoplay mudo em loop (movimento tipo Reels);
// toque ativa o som deste (a trilha some quando ativo === false). O `muted`
// é sincronizado via ref porque a prop React não reflete de forma confiável
// a propriedade DOM depois da montagem.
function DepoVideo({ src, poster, alt, ativo, onToggle, describedBy }) {
  const ref = React.useRef(null)
  const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  React.useEffect(() => {
    if (ref.current) ref.current.muted = !ativo
  }, [ativo])

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={!ativo}
        loop
        playsInline
        autoPlay={!reduzido}
        preload="metadata"
        aria-label={alt}
        aria-describedby={describedBy}
        onClick={onToggle}
      />
      <button type="button" className="pa-depo__som" onClick={onToggle} aria-pressed={ativo}
        aria-label={ativo ? 'Silenciar depoimento' : 'Ativar som do depoimento'}>
        {ativo ? <I.sound width={14} height={14} /> : <I.soundOff width={14} height={14} />}
      </button>
    </>
  )
}

export function ParticiparPage() {
  const barraVisivel = useBarra()
  const [audioAtivo, setAudioAtivo] = React.useState(null) // slug do depoimento com som ligado

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
            <span className="scw-pill scw-pill--pagina pa-hero__selo">Para doçarias, cafeterias e restaurantes</span>
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
              <a href="#numeros" className="scw-btn scw-btn--contorno-claro" onClick={irPara('numeros')}>
                Ver o que o festival entrega
              </a>
            </div>
          </div>
        </div>
      </section>

      <Marquee palavras={PALAVRAS} />

      {/* ═══ 02 Depoimentos ═══
          Sobe logo depois da abertura (a pedido do Wilke, 30/07/2026): é a
          prova social da página — quem decide participar quer ouvir quem já
          participou antes de ler número ou processo. */}
      <section id="depoimentos" className="scw-secao scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/depoimento" tamanho={20} />Marcas que já viveram a edição</span>
            <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
              Quem participou conta com as <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>próprias palavras</em>.
            </h2>
          </div>
          <a href="#pre-cadastro" className="pa-cabeca__link" onClick={irPara('pre-cadastro')}>
            Quero estar nessa lista <I.arrow width={17} height={17} />
          </a>
        </div>
        <ul className="pa-depos">
          {DEPOIMENTOS.map((d) => {
            const fotoCombo = comboMain(d.slug)
            const marca = resolveParticipant(d.slug)
            const videoSrc = depoVideoSrc(d.slug)
            return (
            <li
              className="pa-depo"
              key={d.slug}
              style={{
                '--cor': d.cor,
                '--tinta': d.tinta,
                '--filete': d.tinta === 'var(--scw-creme)' ? 'rgba(254,240,221,.24)' : 'rgba(61,19,8,.22)',
              }}
            >
              <div className="pa-depo__media">
                <div className="pa-depo__foto">
                  {videoSrc
                    ? <DepoVideo
                        src={videoSrc}
                        poster={fotoCombo?.src}
                        alt={`${d.pessoa} falando sobre a experiência da ${d.marca} no Sweet & Coffee Week`}
                        ativo={audioAtivo === d.slug}
                        onToggle={() => setAudioAtivo((atual) => (atual === d.slug ? null : d.slug))}
                        describedBy={d.frase ? `pa-depo-frase-${d.slug}` : undefined}
                      />
                    : fotoCombo
                      ? <img src={fotoCombo.src} srcSet={srcSet(fotoCombo.src)} sizes={SIZES.cartao} alt={fotoCombo.alt} style={{ objectPosition: fotoCombo.position }} loading="lazy" decoding="async" />
                      : <div className="scw-reserva">{RESERVA}</div>}
                </div>
                <span className="pa-depo__selo" aria-hidden="true">
                  {marca.logo
                    ? <img src={marca.logo} alt="" loading="lazy" decoding="async" />
                    : <span className="pa-depo__iniciais">{iniciais(d.marca)}</span>}
                </span>
              </div>
              <div className="pa-depo__corpo">
                {d.frase
                  ? <blockquote id={`pa-depo-frase-${d.slug}`}>{d.frase}</blockquote>
                  : <p className="pa-depo__espera">Depoimento desta marca chegando em breve.</p>}
                <span className="pa-depo__quem">
                  {d.pessoa && <b>{d.pessoa}</b>}
                  <span>{d.marca}</span>
                </span>
              </div>
            </li>
            )
          })}
        </ul>
      </section>

      {/* ═══ 03 Números ═══ */}
      <section id="numeros" className="scw-secao scw-secao--bege">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/alcance" tamanho={20} />A potência do festival</span>
            <h2 className="scw-h2" style={{ color: 'var(--scw-marrom)' }}>
              O tamanho da <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>vitrine</em> que sua marca ocupa.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Dez anos de rota e público que se organiza para provar cada edição.
          </p>
        </div>
        <ul className="pa-numeros">
          {NUMEROS.map((n) => (
            <li key={n.t}>
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

      {/* ═══ 08 Pré-cadastro ═══
          ⚠️ O FORMULÁRIO NÃO MORA MAIS AQUI (22/08/2026, pedido do Wilke). O
          pré-cadastro é a página estática /quero-participar/, que tem os quatro
          passos, o índice pegajoso com contagem de pendências, a validação por
          passo e o envio pela RPC `submit_quero_participar`.

          Duas telas pedindo os mesmos dados são duas fontes de verdade do mesmo
          cadastro (§5.2) — e era a daqui que ficava para trás a cada melhoria
          feita lá. A trava real, porém, é o BANCO: esta gravava em
          `participation_interests` e a de lá grava em `quero_participar`, que é
          a tabela que o painel da organização lê e triaria. Formulário que
          escreve numa tabela que ninguém abre é envio que se perde em silêncio.

          ⛔ A barra final de /quero-participar/ não é opcional (§10.4-b): sem
          ela o servidor cai no fallback do SPA e a pessoa vê a landing. */}
      <section id="pre-cadastro" className="scw-secao scw-secao--bege">
        <div className="pa-form__intro">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="mecanica/inscricao" tamanho={20} />Pré-cadastro</span>
          <h2 className="scw-h2">
            Comece a <em className="pa-destaque" style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>jornada da sua marca</em>.
          </h2>
          <p>
            Leva dois minutos. Depois do envio, a equipe avalia o perfil e retorna pelos canais
            que você informar.
          </p>
        </div>

        <div className="pa-cta">
          <ul className="pa-cta__lista">
            <li><ScwIcon nome="ui/horario" tamanho={20} />Quatro passos, cerca de dois minutos</li>
            <li><ScwIcon nome="mecanica/loja" tamanho={20} />Dados da marca, do combo e do contato</li>
            <li><ScwIcon nome="mecanica/regulamento" tamanho={20} />Usados só pela organização, para contato e curadoria</li>
          </ul>
          <a className="scw-btn scw-btn--solido pa-cta__botao" href="/quero-participar/">
            Abrir o pré-cadastro <I.arrow width={17} height={17} />
          </a>
        </div>
      </section>

      <div className={`pa-barra${barraVisivel ? ' is-visivel' : ''}`}>
        <span>Inscrições passam por curadoria.</span>
        <a href="#pre-cadastro" className="scw-btn scw-btn--solido" onClick={irPara('pre-cadastro')}>
          Iniciar pré-cadastro <I.arrow />
        </a>
      </div>
    </>
  )
}
