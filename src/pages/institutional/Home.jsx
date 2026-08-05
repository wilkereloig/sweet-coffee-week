import React from 'react'
import '../../styles/scw-home.css'
import { festivalFacts } from '../../data/festivalFacts'
import { bgStyle, comboPhotos, editionPhotos, heroPhotos, RESERVA } from '../../data/imageLibrary'
import { resolveParticipant } from '../../data/participantAssets'
import ScwIcon from '../../components/scw-icons/ScwIcon'

/* ============================================================================
   Home / "O festival" — redesign 2026.
   Sete seções: 01 Abertura · 02 O que é · 03 Rotas · 04 Ciclo · 05 Números ·
   06 Prova · 07 Realização (+ faixa de palavras logo após a hero).
   Sistema visual: src/styles/scw-2026.css (tokens e classes .scw-*).
   Ajustes próprios da página: src/styles/scw-home.css (classes .hm-*).
   Nenhuma cor fora da paleta do handoff. Nenhum asset inventado.
   ========================================================================= */

/* Seta usada em todos os CTAs (mesmo traço do protótipo). */
function Seta({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* --- 01 Abertura: fotos do herói da rota, no sistema central de imagens.
   Cada foto traz o próprio enquadramento (desktop e celular) e o alt contextual;
   o véu por cima usa a cor da página (--scw-pagina) — ver scw-home.css. */
const HERO = heroPhotos('home')

const PALAVRAS = [
  'dez anos de festival',
  'combos autorais',
  'marcas locais',
  'uma cidade em movimento',
  'memória de cada edição',
]

/* Números da F2 Experience — fornecidos pelo Wilke no patch da seção 07.
   Não saem do acervo do festival; só "16 edições" é conferível aqui. */
const F2_NUMEROS = [
  ['01', '+1', 'K', 'projetos realizados'],
  ['02', '+400', 'K', 'pessoas impactadas'],
  ['03', '16', '', 'edições do festival assinadas'],
  ['04', 'BR', '', 'atuação nacional'],
]

/* --- 02 O que é: anatomia do combo. */
const INGREDIENTES = [
  {
    nome: 'doce',
    nota: 'a assinatura da casa',
    cor: 'var(--scw-magenta)',
    caminho: (
      <>
        <path d="M7.6 13.5a8.4 8.4 0 0 1 16.8 0Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
        <circle cx="16" cy="3.6" r="1.7" stroke="currentColor" strokeWidth="2" />
        <path d="M8 13.5h16l-1.9 11.5a2 2 0 0 1-2 1.7h-8.2a2 2 0 0 1-2-1.7L8 13.5Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M13.5 17.2l-.6 7.4M18.5 17.2l.6 7.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    nome: 'salgado',
    nota: 'criado para o tema',
    cor: 'var(--scw-amarelo)',
    caminho: (
      <>
        <path d="M4.5 15.4c0-4.4 5.1-7.4 11.5-7.4s11.5 3 11.5 7.4H4.5Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M5.6 19.4c1.9 0 2.6-1.4 4.2-1.4s2.2 1.4 4.1 1.4 2.6-1.4 4.2-1.4 2.2 1.4 4 1.4 1.9-1.4 3.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.8 22.6h20.4a2.4 2.4 0 0 1 0 4.8H5.8a2.4 2.4 0 0 1 0-4.8Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      </>
    ),
  },
  {
    nome: 'bebida',
    nota: 'café, quase sempre',
    cor: 'var(--scw-cyan)',
    caminho: (
      <>
        <path d="M6.5 10.5h14v5.6a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-5.6Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M20.5 12.7h2.8a3.2 3.2 0 0 1 0 6.4h-2.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 26.6h18.6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M12 7.6c-1.2-1.2 0-2.4 0-3.6M17 7.6c-1.2-1.2 0-2.4 0-3.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
  },
]

/* Frame curado do acervo de cada edição (o índice é a foto escolhida na
   galeria daquela edição — src/data/imageLibrary.js resolve caminho, alt e
   ponto focal). */
const frame = (code, i) => editionPhotos(code)[i]

const COMBOS = [
  { foto: frame('2026.1', 3), titulo: 'Edição Lovers', ano: '2026' },
  { foto: frame('2025', 8), titulo: 'Edição Celebration', ano: '2025' },
  { foto: frame('2023', 3), titulo: 'Edição Trip', ano: '2023' },
  { foto: frame('2016', 0), titulo: 'Primeira edição', ano: '2016' },
]

/* O Sweet Gift não tem foto no acervo — o protótipo usa espaço reservado.
   Aqui viram molduras honestas (.scw-reserva), nunca imagem inventada. */
const SWEET_GIFT = ['caixa fechada', 'caixa aberta', 'doces da caixa', 'pronta para viagem']

/* --- 03 Rotas. "Marcas" mostra um combo do acervo; "Público" reusa o registro
   de público que já abre a página (HERO[2]); "Parceiros" fica em reserva porque
   o acervo não tem foto de ativação de patrocinador. */
const FOTO_MARCAS = frame('2019.2', 3)
const FOTO_PUBLICO = HERO[2]

/* --- 04 Ciclo. Fotos do sistema central; a etapa 04 usa um registro de público
   (pasta `momentos`, sem vínculo com marca ou edição — não é foto de edição
   nem de combo, por isso não passa pelo sistema central). */
const ETAPAS = [
  ['01', 'Um tema abre a conversa', 'Cada edição nasce de um universo que inspira sabores e vitrines.', frame('2016', 0), 'var(--scw-laranja)', 'var(--scw-choco)'],
  ['02', 'As marcas criam o percurso', 'Os participantes transformam a ideia em combos que estreiam no festival.', frame('2019.2', 3), 'var(--scw-roxo)', 'var(--scw-creme)'],
  ['03', 'A cidade entra na rota', 'Durante a edição, o público sai atrás dos combos e descobre novos endereços e bairros.', frame('2025', 2), 'var(--scw-cyan)', 'var(--scw-choco)'],
  ['04', 'A memória continua', 'Sweet Lovers, marcas e Sweet Awards deixam a edição viva depois da última visita.', { src: '/images/momentos/04.jpg', alt: 'Público em uma edição do Sweet & Coffee Week', position: 'center 40%' }, 'var(--scw-amarelo)', 'var(--scw-choco)'],
]

/* --- 05 Números: valores vêm de src/data/festivalFacts.js (fonte canônica).
   Cor vive na régua (StatBlock — bege só sustenta 4 tintas de texto; ver
   docs/FLUXO-DESIGN-CODIGO.md), o numeral fica sempre em chocolate. */
const NUMEROS = [
  { alvo: festivalFacts.editions.value, prefixo: '', sufixo: '', rotulo: 'edições realizadas', nota: `de ${festivalFacts.firstYear} até hoje`, cor: 'var(--scw-amarelo)' },
  { alvo: festivalFacts.brands.value, prefixo: '+', sufixo: '', rotulo: 'marcas participantes', nota: 'doçarias, cafeterias e restaurantes', cor: 'var(--scw-cyan)' },
  { alvo: festivalFacts.combosSold.value, prefixo: '+', sufixo: ' mil', rotulo: 'combos vendidos', nota: 'somando todas as edições', cor: 'var(--scw-magenta)' },
  { alvo: festivalFacts.igViews.value, prefixo: '+', sufixo: ' mi', rotulo: 'visualizações no Instagram', nota: 'conteúdo do festival e das marcas', cor: 'var(--scw-roxo)' },
]

/* --- 06 Prova: depoimento real da Jolie (mesma fonte já usada em Participar). */
const VOZ = {
  frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal.”',
  pessoa: 'Carol Barreto',
  marca: 'Jolie Café Pâtisserie',
  logo: resolveParticipant('Jolie Café Pâtisserie').logo,
  // Retrato autorizado não existe no acervo → círculo fica como reserva honesta.
  retrato: null,
  fotos: comboPhotos('Jolie Café Pâtisserie', { limite: 2 }),
  iniciais: resolveParticipant('Jolie Café Pâtisserie').fallback,
}

/* Matérias reais, com link (o protótipo lista sem URL; aqui os endereços são
   os já verificados no repositório). A primeira abre a seção em destaque. */
const IMPRENSA = [
  { veiculo: 'Diário do RN', ano: '2026', titulo: '10 anos de festival e economia criativa', href: 'https://diariodorn.com.br/sweet-coffee-week-chega-aos-10-anos-e-reforca-forca-da-economia-criativa-em-natal/' },
  { veiculo: '96 FM', ano: '2026', titulo: 'Sweet Coffee Week celebra 10 anos', href: 'https://96fm.com.br/post/sweet-coffee-week-celebra-10-anos' },
  { veiculo: 'Tribuna do Norte', ano: '2026', titulo: 'Edição de 10 anos, de 04 a 14 de junho', href: 'https://blog.tribunadonorte.com.br/territoriolivre/de-04-a-14-de-junho-ocorre-o-sweet-coffee-week-2026-edicao-10-anos/' },
  { veiculo: 'Blog do BG', ano: '2025', titulo: 'A maior celebração da doçura do Brasil chega à 15ª edição', href: 'https://www.blogdobg.com.br/sweet-coffee-week-2025-a-maior-celebracao-da-docura-do-brasil-chega-a-15a-edicao/' },
  { veiculo: 'O Potengi', ano: '2025', titulo: 'Sweet Coffee Celebration reúne mais de 25 estabelecimentos', href: 'https://opotengi.com.br/sweet-coffee-celebration-chega-aos-15o-ano-reunindo-mais-de-25-estabelecimentos/' },
  { veiculo: 'TV Ponta Negra', ano: '2025', titulo: 'Entrevista com Eline Eulália sobre a edição de 2025', href: 'https://www.youtube.com/watch?v=1lPd434s3rk' },
  { veiculo: 'Conversa Gastronômica', ano: '2024', titulo: '14ª Sweet Coffee Week acontece em Natal e Parnamirim', href: 'https://conversagastronomica.com/14a-sweet-coffee-week-acontece-entre-os-dias-14-e-24-de-novembro-em-natal-e-parnamirim/' },
  { veiculo: 'UFRN', ano: '2022', titulo: 'O festival como experiência gastronômica', href: 'https://repositorioslatinoamericanos.uchile.cl/handle/2250/8603735' },
  { veiculo: 'Agência Sebrae', ano: '2021', titulo: 'Ingredientes potiguares em destaque', href: 'https://rn.agenciasebrae.com.br/arquivo/produtos-terroir-serao-destaques-na-sweet-coffee-week-2021/' },
  { veiculo: 'Conversa Gastronômica', ano: '2020', titulo: 'Heróis e vilões trazem combos a R$20,90', href: 'https://conversagastronomica.com/herois-e-viloes-trazem-combos-a-r2090-de-12-a-22-de-novembro-em-natal/' },
  { veiculo: 'Hilneth Correia', ano: '2019', titulo: '7ª Sweet & Coffee Week traz o sabor dos contos de fadas', href: 'https://hilnethcorreia.com.br/2019/09/07/7a-sweet-coffee-week-traz-o-sabor-dos-contos-de-fadas/' },
  { veiculo: 'Conversa Gastronômica', ano: '2018', titulo: '5ª Sweet Coffee resgata sabores da infância', href: 'https://conversagastronomica.com/5a-sweet-coffee-resgata-sabores-da-infancia/' },
  { veiculo: 'Conversa Gastronômica', ano: '2018', titulo: 'Sweet e Coffee celebra o amor em combos a R$18,90', href: 'https://conversagastronomica.com/sweet-e-coffee-celebra-o-amor-em-combos-a-r1890/' },
  { veiculo: 'Agora RN', ano: '', titulo: 'O evento mais doce da capital potiguar', href: 'https://agorarn.com.br/ultimas/sweet-coffee-week-evento-mais-doce-natal/' },
  { veiculo: 'NOVO Notícias', ano: '', titulo: 'Atenção, Sweet Lovers: a semana mais doce do ano vai começar!', href: 'https://novonoticias.com.br/atencao-sweet-lovers-a-semana-mais-doce-do-ano-vai-comecar/' },
  { veiculo: 'NOVO Notícias', ano: '', titulo: 'Uma volta ao mundo em 11 dias', href: 'https://novonoticias.com.br/sweet-coffee-week-proporciona-uma-volta-ao-mundo-em-11-dias/' },
  { veiculo: '98 FM Natal', ano: '', titulo: 'Sweet Coffee Week movimenta a economia criativa em Natal', href: 'https://98fmnatal.com.br/ultimas/sweet-coffee-week-comeca-hoje-e-movimenta-a-economia-criativa-em-natal/339772/' },
]

const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function HomePage({ navigate }) {
  const raizRef = React.useRef(null)
  const [heroAtiva, setHeroAtiva] = React.useState(0)
  const [contagens, setContagens] = React.useState(() =>
    semMovimento() ? NUMEROS.map((n) => n.alvo) : NUMEROS.map(() => 0),
  )
  const [verTudo, setVerTudo] = React.useState(false)

  const ir = (rota) => (evento) => {
    evento.preventDefault()
    navigate(rota)
  }

  const rolarPara = (id) => (evento) => {
    evento.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
  }

  /* Crossfade da hero: troca a foto a cada 6,2s. Sem movimento → foto fixa. */
  React.useEffect(() => {
    if (semMovimento()) return
    const t = setInterval(() => setHeroAtiva((i) => (i + 1) % HERO.length), 6200)
    return () => clearInterval(t)
  }, [])

  /* Contadores da seção 05: sobem uma única vez, quando a faixa entra na tela. */
  React.useEffect(() => {
    const alvo = raizRef.current?.querySelector('.hm-numeros')
    if (!alvo) return
    if (semMovimento() || typeof IntersectionObserver === 'undefined') {
      setContagens(NUMEROS.map((n) => n.alvo))
      return
    }
    let raf = 0
    let inicio = 0
    const suave = (t) => 1 - Math.pow(1 - t, 3)
    const passo = (ts) => {
      if (!inicio) inicio = ts
      // 1400ms deliberado (mais lento que --mo-longo/880ms): contagem precisa
      // de tempo pra ler os dígitos subindo, não é uma entrada de bloco comum.
      const p = Math.min(1, (ts - inicio) / 1400)
      setContagens(NUMEROS.map((n) => Math.round(suave(p) * n.alvo)))
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        io.disconnect()
        raf = requestAnimationFrame(passo)
      })
    }, { threshold: 0.25 })
    io.observe(alvo)
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])

  /* Palavra destacada dos títulos: vira itálico colorido ao entrar na tela.
     Sem movimento → estado final aplicado direto, sem animação. */
  React.useEffect(() => {
    const alvos = raizRef.current?.querySelectorAll('[data-destaque]')
    if (!alvos || !alvos.length) return
    if (semMovimento() || typeof IntersectionObserver === 'undefined') {
      alvos.forEach((el) => {
        el.style.color = 'var(--dest)'
        el.style.fontStyle = 'italic'
      })
      return
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.style.animation = `scwDestaque var(--mo-longo) var(--mo-mola) 1100ms both`
        io.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.6 })
    alvos.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const materias = verTudo ? IMPRENSA.slice(1) : IMPRENSA.slice(1, 5)
  const destaque = IMPRENSA[0]

  return (
    <div className="hm" ref={raizRef}>

      {/* ---------------------------------------------- 01 Abertura --------- */}
      <section className="scw-hero">
        <div className="scw-hero__fotos">
          {HERO.map((foto, i) => (
            <span
              key={foto.src}
              className={'scw-hero__foto' + (i === heroAtiva ? ' is-ativa' : '')}
              /* --pos/--pos-mobile: o enquadramento muda entre a faixa larga do
                 desktop e a foto alta do celular (scw-home.css lê as duas). */
              style={{
                backgroundImage: `url("${foto.src}")`,
                '--pos': foto.position,
                '--pos-mobile': foto.mobilePosition,
              }}
              role={i === heroAtiva ? 'img' : undefined}
              aria-label={i === heroAtiva ? foto.alt : undefined}
              aria-hidden={i === heroAtiva ? undefined : 'true'}
            />
          ))}
        </div>
        <div className="scw-hero__veu" aria-hidden="true" />
        <div className="scw-hero__base" aria-hidden="true" />
        <div className="scw-hero__topo" aria-hidden="true" />

        <div className="scw-hero__col">
          <span className="scw-pill scw-pill--pagina hm-selo">Festival gastronômico · Natal e região</span>
          <h1 className="scw-hero__titulo">
            Há dez anos, fazendo de Natal a cidade <em className="hm-hero__enfase">mais doce do Brasil.</em>
          </h1>
          <div className="scw-hero__info">
            <div className="hm-hero__texto">
              <p className="scw-hero__lead">
                A cada edição, marcas da cidade inteira criam combos a partir de um tema — e a cidade vira roteiro por onze dias.
              </p>
              <span className="hm-hero__meta">16 edições desde 2016 · mais de cem marcas participantes</span>
            </div>
            <div className="hm-acoes">
              <a className="scw-btn scw-btn--solido" href="#rotas" onClick={rolarPara('rotas')}>
                Como entrar <Seta />
              </a>
              <a className="scw-btn scw-btn--contorno-claro" href="#/participar" onClick={ir('/participar')}>
                Levar minha marca <Seta />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa de palavras em movimento (3 trilhas iguais = laço contínuo). */}
      <div className="scw-marquee" aria-hidden="true">
        {[0, 1, 2].map((trilha) => (
          <ul key={trilha}>
            {PALAVRAS.map((palavra) => (
              <li key={palavra}>
                <span className="scw-marquee__palavra">{palavra}</span>
                <span className="scw-marquee__ponto" />
              </li>
            ))}
          </ul>
        ))}
      </div>

      {/* ---------------------------------------------- 02 O que é ---------- */}
      <section className="scw-secao scw-secao--creme">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/o-que-e" tamanho={20} />O que é</span>
            <h2 className="scw-h2">
              Um tema, <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>um combo por marca</em>, onze dias.
            </h2>
          </div>
          <p className="hm-apoio">
            Doçarias, cafeterias e restaurantes de Natal criam uma composição exclusiva a partir do tema da edição — e muitos combos ganham lugar fixo no menu depois.
          </p>
        </div>

        <div className="hm-anatomia">
          <div>
            <span className="scw-rotulo hm-anatomia__rotulo">A anatomia do combo</span>
            <div className="hm-ingredientes">
              {INGREDIENTES.map((item, i) => (
                <React.Fragment key={item.nome}>
                  {i > 0 && <span className="hm-mais" aria-hidden="true">+</span>}
                  <div className="hm-ing">
                    <span className="hm-ing__disco" style={{ background: item.cor }} aria-hidden="true">
                      <svg width="52%" height="52%" viewBox="0 0 32 32" fill="none">{item.caminho}</svg>
                    </span>
                    <strong className="hm-ing__nome">{item.nome}</strong>
                    <span className="hm-ing__nota">{item.nota}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="hm-apoio hm-apoio--estreita">
            <strong>Preço único em toda a rota.</strong> Em cada edição, o público escolhe por onde começar, compara combos e monta o próprio percurso pela cidade.
          </p>
        </div>

        <div className="hm-galerias">
          <div className="hm-galeria">
            <div className="hm-galeria__topo">
              <span className="scw-rotulo">Combos de outras edições</span>
              <a className="hm-link" href="#/edicoes" onClick={ir('/edicoes')}>ver todas →</a>
            </div>
            <p className="hm-galeria__texto">
              Cada edição rende uma coleção nova de doce, salgado e bebida — alguns viraram clássicos da casa.
            </p>
            <ul className="hm-galeria__lista">
              {COMBOS.map(({ foto, titulo, ano }) => (
                <li key={titulo}>
                  {foto
                    ? <figure className="hm-galeria__foto" role="img" aria-label={foto.alt} style={bgStyle(foto)} />
                    : <div className="scw-reserva hm-galeria__reserva">{RESERVA}</div>}
                  <span className="hm-galeria__nome">{titulo}<b>{ano}</b></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hm-galeria">
            <div className="hm-galeria__topo">
              <span className="scw-rotulo">Sweet Gift</span>
              <span className="scw-rotulo scw-rotulo--micro">em algumas edições</span>
            </div>
            <p className="hm-galeria__texto">
              A versão para levar: sem bebida, uma caixa com vários doces para presentear ou seguir viagem.
            </p>
            {/* Sem foto no acervo — reserva editorial, nunca imagem inventada. */}
            <ul className="hm-galeria__lista">
              {SWEET_GIFT.map((legenda) => (
                <li key={legenda}>
                  <div className="scw-reserva hm-galeria__reserva">{RESERVA}</div>
                  <span className="hm-galeria__nome">{legenda}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- 03 Rotas ------------ */}
      <section id="rotas" className="scw-secao scw-secao--bege">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="marca/rota" tamanho={20} />Como entrar</span>
            <h2 className="scw-h2">
              Três jeitos de <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>entrar no festival</em>.
            </h2>
          </div>
          <p className="hm-apoio">
            Escolha de onde você chega — cada porta leva a uma parte diferente da rota.
          </p>
        </div>

        <div className="hm-rotas">
          <article className="hm-rota hm-rota--marcas">
            <figure className="hm-rota__foto">
              <img
                src={FOTO_MARCAS.src}
                alt={FOTO_MARCAS.alt}
                style={{ objectPosition: FOTO_MARCAS.position }}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div className="hm-rota__corpo">
              <span className="hm-rota__eixo">Marcas</span>
              <div className="hm-rota__texto">
                <h3 className="hm-rota__titulo">Leve sua marca para o festival.</h3>
                <p>Crie um combo autoral, encontre novos públicos e entre na próxima edição.</p>
                <a className="hm-rota__cta hm-rota__cta--escuro" href="#/participar" onClick={ir('/participar')}>
                  Quero participar <Seta size={16} />
                </a>
              </div>
            </div>
          </article>

          <article className="hm-rota hm-rota--publico">
            <figure className="hm-rota__foto">
              <img
                src={FOTO_PUBLICO.src}
                alt={FOTO_PUBLICO.alt}
                style={{ objectPosition: FOTO_PUBLICO.position }}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div className="hm-rota__corpo">
              <span className="hm-rota__eixo">Público</span>
              <div className="hm-rota__texto">
                <h3 className="hm-rota__titulo">Descubra a cidade a cada edição.</h3>
                <p>Quando uma edição abre, o público visita, experimenta e volta.</p>
                <a className="hm-rota__cta hm-rota__cta--escuro" href="#/edicoes" onClick={ir('/edicoes')}>
                  Conhecer as edições <Seta size={16} />
                </a>
              </div>
            </div>
          </article>

          <article className="hm-rota hm-rota--parceiros">
            {/* Foto de patrocinador/ativação não existe no acervo → reserva. */}
            <div className="hm-rota__foto hm-rota__foto--reserva">
              <div className="scw-reserva">{RESERVA}</div>
            </div>
            <div className="hm-rota__corpo">
              <span className="hm-rota__eixo hm-rota__eixo--cyan">Parceiros</span>
              <div className="hm-rota__texto">
                <h3 className="hm-rota__titulo">Apoie uma cidade em movimento.</h3>
                <p>Ponha sua marca na rota que a cidade já percorre, junto de gastronomia e cultura locais.</p>
                <a className="hm-rota__cta hm-rota__cta--cyan" href="#/apoiar" onClick={ir('/apoiar')}>
                  Quero apoiar <Seta size={16} />
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------------------------------------- 04 Ciclo ------------ */}
      <section className="scw-secao scw-secao--choco">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone hm-rotulo--amarelo"><ScwIcon nome="topicos/ciclo" tamanho={20} />Como funciona</span>
            <h2 className="scw-h2 hm-h2--claro">
              De uma ideia para a <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-creme)', '--dest': 'var(--scw-amarelo)' }}>cidade</em>.
            </h2>
          </div>
          <p className="hm-apoio hm-apoio--clara">
            O festival não começa no cardápio. Começa numa direção criativa e termina quando a cidade guarda a memória daquela edição.
          </p>
        </div>

        <div className="hm-ciclo">
          {ETAPAS.map(([numero, titulo, texto, foto, cor, tinta]) => (
            <article className="hm-etapa" key={numero}>
              <div className="hm-etapa__moldura">
                <span className="hm-etapa__foto" role="img" aria-label={foto.alt} style={bgStyle(foto)} />
                <span className="hm-etapa__num" style={{ background: cor, color: tinta }} aria-hidden="true">{numero}</span>
              </div>
              <h3 className="hm-etapa__titulo">{titulo}</h3>
              <p className="hm-etapa__texto">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------- 05 Números ---------- */}
      <section className="scw-secao scw-secao--bege">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="interface/numeros" tamanho={20} />Dez anos em números</span>
            <h2 className="scw-h2 hm-h2--marrom">
              Uma década que <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-cyan)' }}>continua em circulação</em>.
            </h2>
          </div>
          <a className="hm-link hm-link--sublinhado" href="#/sweet-awards" onClick={ir('/sweet-awards')}>
            Conhecer o Sweet Awards <Seta />
          </a>
        </div>

        <dl className="hm-numeros">
          {NUMEROS.map((numero, i) => (
            <div className="hm-num" key={numero.rotulo}>
              <span className="scw-stat__regua" aria-hidden="true" style={{ background: numero.cor }} />
              <dt className="scw-numeral hm-num__valor">
                {numero.prefixo}{contagens[i]}{numero.sufixo}
              </dt>
              <dd className="hm-num__rotulo">{numero.rotulo}</dd>
              <dd className="hm-num__nota">{numero.nota}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------------------------------------- 06 Prova ------------ */}
      <section className="scw-secao scw-secao--creme">
        <div className="hm-prova">
          <figure className="hm-voz">
            <span className="scw-rotulo scw-rotulo--com-icone hm-rotulo--claro"><ScwIcon nome="topicos/depoimento" tamanho={20} />Quem já entrou na rota</span>
            <blockquote className="hm-voz__frase">{VOZ.frase}</blockquote>
            <figcaption className="hm-voz__assinatura">
              <span className="hm-voz__retrato">
                {VOZ.retrato
                  ? <img src={VOZ.retrato} alt={`${VOZ.pessoa}, da ${VOZ.marca}`} loading="lazy" decoding="async" />
                  : <span className="scw-reserva hm-voz__reserva">{RESERVA}</span>}
                {/* Sem logo no acervo o <img> sairia sem src e quebraria na
                    tela — nesse caso ficam as iniciais da marca. */}
                <span className="hm-voz__marca">
                  {VOZ.logo
                    ? <img src={VOZ.logo} alt={VOZ.marca} loading="lazy" decoding="async" />
                    : <span aria-hidden="true">{VOZ.iniciais}</span>}
                </span>
              </span>
              <span className="hm-voz__id">
                <b>{VOZ.pessoa}</b>
                <span>{VOZ.marca}</span>
              </span>
            </figcaption>
            <div className="hm-voz__fotos">
              {VOZ.fotos.map((foto) => (
                <span key={foto.src} className="hm-voz__foto" role="img" aria-label={foto.alt} style={bgStyle(foto)} />
              ))}
            </div>
            <a className="hm-voz__link" href="#/participar?scrollTo=depoimentos" onClick={ir('/participar?scrollTo=depoimentos')}>
              Ver mais depoimentos <Seta size={16} />
            </a>
          </figure>

          <div className="hm-imprensa">
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/imprensa" tamanho={20} />Na imprensa</span>
            <h2 className="scw-h2 hm-imprensa__h2">
              E quem já <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>contou a história</em>.
            </h2>

            <a className="hm-materia" href={destaque.href} target="_blank" rel="noopener noreferrer">
              <span>
                <span className="hm-materia__veiculo">{destaque.veiculo} · {destaque.ano}</span>
                <strong className="hm-materia__titulo">{destaque.titulo}</strong>
              </span>
              <span className="hm-materia__foto">
                <img src="/images/imprensa/02.jpg" alt="Cobertura de imprensa do Sweet &amp; Coffee Week" loading="lazy" decoding="async" />
              </span>
            </a>

            <div id="hm-materias">
              {materias.map((item) => (
                <a className="hm-linha" href={item.href} key={item.href} target="_blank" rel="noopener noreferrer">
                  <span>
                    <span className="hm-linha__veiculo">{item.veiculo}</span>
                    <span className="hm-linha__titulo">{item.titulo}</span>
                  </span>
                  <span className="hm-linha__ano">{item.ano}</span>
                </a>
              ))}
            </div>

            <button
              type="button"
              className="hm-imprensa__toggle"
              aria-controls="hm-materias"
              aria-expanded={verTudo}
              onClick={() => setVerTudo((v) => !v)}
            >
              {verTudo ? 'Mostrar menos matérias' : `Ver todas as ${IMPRENSA.length} matérias`} <Seta size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- 07 Realização -------
          Quebra de marca proposital: a seção de realização usa o KV da F2
          Experience (preto #0B0B0C, acento #E50053, tipografia Archivo), não o
          sistema visual do festival. É a única seção do site fora da paleta e
          fora da Nexa Slab — decisão do Wilke, registrada no CLAUDE.md. */}
      <section className="scw-secao scw-secao--compacta f2-realiza">
        <div className="f2-realiza__kv" aria-hidden="true" />

        <div className="f2-realiza__conteudo">
          <div className="f2-realiza__topo">
            <span className="f2-realiza__indice">07 <i /> Realização</span>
            <img className="f2-realiza__logo" src="/images/logo-f2experience.svg" alt="F2 Experience" loading="lazy" />
            <span className="f2-realiza__meta">Live Marketing · desde 2004</span>
          </div>

          <div className="f2-realiza__grade">
            <h2 className="f2-realiza__h2">
              Há mais de 20 anos <em>transformando</em> estratégia em criatividade.
            </h2>
            <div>
              <p className="f2-realiza__texto">
                A F2 Experience é a agência de live marketing que idealiza e realiza o
                Sweet &amp; Coffee Week — eventos, ativações e experiências de marca para
                quem quer conexão e resultado.
              </p>
              <a
                className="f2-realiza__cta"
                href="https://www.f2experience.com.br/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Conhecer a F2 Experience <Seta />
              </a>
            </div>
          </div>

          <dl className="f2-realiza__numeros">
            {F2_NUMEROS.map(([i, num, sufixo, rotulo]) => (
              <div key={i}>
                <span className="f2-realiza__ordem">{i}</span>
                <dt>{num}{sufixo && <em>{sufixo}</em>}</dt>
                <dd>{rotulo}</dd>
              </div>
            ))}
          </dl>

          <div className="f2-realiza__assinatura">
            <span>F2 <em>realiza.</em></span>
            <span className="f2-realiza__meta">contato@fabrica2.com.br · @f2experience</span>
          </div>
        </div>
      </section>
    </div>
  )
}
