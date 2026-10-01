import React from 'react'
import '../../styles/scw-home.css'
import { festivalFacts as F } from '../../data/festivalFacts'
import { proximaEdicao as PROX } from '../../data/proximaEdicao'
import { AWARDS_DADOS } from '../../data/handoff/awardsData'
import { fotoAte, fotosHome, heroPhotos, LARGURA_HEROI_MOBILE, SIZES, srcSet } from '../../data/imageLibrary'
import { resolveParticipant } from '../../data/participantAssets'
import ScwIcon from '../../components/scw-icons/ScwIcon'
import { ANATOMIA_COMBO } from '../../components/scw-icons/anatomia-combo'

/* ============================================================================
   Home / "O festival" — reconstrução de 28/09/2026 (pedido do Wilker).
   Duas funções: anunciar a edição de novembro com o pré-cadastro aberto
   ("agora") e apresentar o festival ("sempre"). Sete seções:
   01 Abertura · 02 O festival · 03 Como participar · 04 Por que participar ·
   05 O festival em movimento · 06 Trajetória · 07 Apoio e realização.
   O que a edição de novembro pode dizer vem de proximaEdicao.js — campo null
   não aparece (A4). Fotos: fotosHome()/heroPhotos() de imageLibrary.js.
   ========================================================================= */

function Seta({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* --- 01 Abertura ---------------------------------------------------------- */
const PESSOAS = heroPhotos('home')
const COMBOS_HEROI = fotosHome('heroiCombos')
// ponytail: só o estado de hoje tem texto; outro status some com o selo até a Home ser revista.
const ESTADO = { 'pre-cadastro': 'Cadastro aberto' }[PROX.status]
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const FICHA = [
  ['Quando', PROX.periodo || maiuscula(PROX.mes)],
  ['Quem', 'Casas de Natal e região'],
  ['Tema e datas', PROX.tema || 'No anúncio oficial'],
]

/* --- 02 O festival -------------------------------------------------------- */
const INGREDIENTES = [
  { nome: 'doce', tinta: 'var(--scw-creme)', cor: 'var(--scw-magenta)' },
  { nome: 'salgado', tinta: 'var(--scw-choco)', cor: 'var(--scw-amarelo)' },
  { nome: 'bebida', tinta: 'var(--scw-choco)', cor: 'var(--scw-cyan)' },
]
const LACOS = [
  ['Para as casas', 'Um produto novo, criado para o tema, que muitas mantêm no cardápio depois.'],
  ['Para o público', 'Uma rota de descobertas: escolher por onde começar, provar e avaliar.'],
  ['Para Natal', 'A gastronomia local tratada como programa cultural, edição após edição.'],
]

/* --- 03 Como participar: os passos que existem de fato (os mesmos de
   Participar 05, resumidos) — pré-cadastro, curadoria, painel da marca. */
const PASSOS = [
  ['mecanica/inscricao', 'Faça o pré-cadastro', 'Dois passos rápidos: você e o estabelecimento.'],
  ['mecanica/avaliar', 'Passe pela curadoria', 'A organização avalia perfil, capacidade de atendimento e alinhamento com a edição.'],
  ['simbolos/combo-oficial', 'Crie o seu combo', 'Casa aprovada recebe acesso ao painel da marca, cadastra o combo e segue as orientações da produção.'],
]

/* --- 04 Por que participar: número só com o que ele mede (festivalFacts). */
const GANHOS = [
  { icone: 'redes/instagram', alvo: F.igViews.value, antes: '+', depois: ' mi', titulo: 'Visibilidade', texto: 'visualizações no Instagram do festival, além de TV, rádio e portais.' },
  { icone: 'combos/doce-cafe', alvo: F.combosSold.value, antes: '+', depois: ' mil', titulo: 'Vendas', texto: `combos vendidos somando as ${F.editions.value} edições.` },
  { icone: 'mecanica/loja', alvo: F.revenue.value, antes: '+R$ ', depois: ' mil', titulo: 'Movimento na casa', texto: 'no caixa das marcas participantes, somando todas as edições.' },
  { icone: 'simbolos/destaque', palavra: 'Sweet Awards', titulo: 'Reconhecimento', texto: 'o público avalia os combos e o festival premia os destaques de cada edição.' },
]
const CONTADOS = GANHOS.filter((g) => g.alvo)

const JOLIE = resolveParticipant('Jolie Café Pâtisserie')
const VOZ = {
  frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal.”',
  pessoa: 'Carol Barreto',
  marca: 'Jolie Café Pâtisserie',
}

/* --- 06 Trajetória -------------------------------------------------------- */
const EDICOES_PREMIADAS = AWARDS_DADOS.edicoes.length

/* Matérias reais, com link verificado. A primeira abre em destaque. */
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

/* Números da F2 Experience — fornecidos pelo Wilker no patch da seção de
   realização. Não saem do acervo do festival; só "16 edições" é conferível. */
const F2_NUMEROS = [
  ['01', '+1', 'K', 'projetos realizados'],
  ['02', '+400', 'K', 'pessoas impactadas'],
  ['03', '16', '', 'edições do festival assinadas'],
  ['04', 'BR', '', 'atuação nacional'],
]

/* Foto de acervo como <img> responsiva: o `sizes` vem dos três papéis fechados. */
function Foto({ foto, papel = 'cartao', className, carregar = 'lazy' }) {
  return (
    <img
      className={className}
      src={foto.src}
      srcSet={srcSet(foto.src)}
      sizes={SIZES[papel]}
      alt={foto.alt}
      loading={carregar}
      decoding="async"
      style={{ objectPosition: foto.position || 'center' }}
    />
  )
}

export function HomePage({ navigate }) {
  const raizRef = React.useRef(null)
  const [ativa, setAtiva] = React.useState(0)
  /* Só a camada visível e a próxima pedem a foto (mesma técnica de HeroFotos):
     quem já passou fica, para voltar sem piscar. */
  const [pedidas, setPedidas] = React.useState(() => PESSOAS.map((_, i) => i === 0))
  const [contagens, setContagens] = React.useState(() =>
    semMovimento() ? CONTADOS.map((g) => g.alvo) : CONTADOS.map(() => 0),
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

  React.useEffect(() => {
    setPedidas((antes) => {
      const proxima = (ativa + 1) % PESSOAS.length
      if (antes[ativa] && antes[proxima]) return antes
      const agora = antes.slice()
      agora[ativa] = true
      agora[proxima] = true
      return agora
    })
  }, [ativa])

  /* Crossfade da abertura: pessoa e combo trocam juntos a cada 6,2s. */
  React.useEffect(() => {
    if (semMovimento()) return
    const t = setInterval(() => setAtiva((i) => (i + 1) % PESSOAS.length), 6200)
    return () => clearInterval(t)
  }, [])

  /* Contadores da seção 04: sobem uma única vez, quando a faixa entra na tela. */
  React.useEffect(() => {
    const alvo = raizRef.current?.querySelector('.hm-ganhos')
    if (!alvo) return
    if (semMovimento() || typeof IntersectionObserver === 'undefined') {
      setContagens(CONTADOS.map((g) => g.alvo))
      return
    }
    let raf = 0
    let inicio = 0
    const suave = (t) => 1 - Math.pow(1 - t, 3)
    const passo = (ts) => {
      if (!inicio) inicio = ts
      // 1400ms: a contagem precisa de tempo para os dígitos serem lidos subindo.
      const p = Math.min(1, (ts - inicio) / 1400)
      setContagens(CONTADOS.map((g) => Math.round(suave(p) * g.alvo)))
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    const io = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      io.disconnect()
      raf = requestAnimationFrame(passo)
    }, { threshold: 0.3 })
    io.observe(alvo)
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])

  /* Palavra destacada dos títulos: vira itálico colorido ao entrar na tela. */
  React.useEffect(() => {
    const alvos = raizRef.current?.querySelectorAll('[data-destaque]')
    if (!alvos || !alvos.length) return
    if (semMovimento() || typeof IntersectionObserver === 'undefined') {
      alvos.forEach((el) => { el.style.color = 'var(--dest)'; el.style.fontStyle = 'italic' })
      return
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.style.animation = 'scwDestaque var(--mo-longo) var(--mo-mola) 600ms both'
        io.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.6 })
    alvos.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const destaque = IMPRENSA[0]
  const materias = verTudo ? IMPRENSA.slice(1) : IMPRENSA.slice(1, 5)
  let k = 0 // índice do contador de cada ganho

  return (
    <div className="hm" ref={raizRef}>

      {/* ------------------------------------------ 01 Abertura ------------ */}
      <section className="hm-abre" aria-labelledby="hm-abre-titulo">
        <div className="hm-abre__texto">
          <p className="hm-abre__estado">
            <span>Próxima edição</span>
            {ESTADO && <span className="hm-abre__selo"><i aria-hidden="true" />{ESTADO}</span>}
          </p>
          <h1 id="hm-abre-titulo" className="scw-h1 hm-abre__titulo">
            O Sweet &amp; Coffee Week volta <em className="hm-abre__enfase">em&nbsp;{PROX.mes}.</em>
          </h1>
          <p className="hm-abre__lead">
            Cafeterias, confeitarias, docerias, padarias, sorveterias, bistrôs e restaurantes já podem fazer o <span className="hm-inteiro">pré-cadastro</span> para a curadoria.
          </p>
          <div className="hm-acoes">
            <a className="scw-btn scw-btn--solido" href={PROX.preCadastro}>
              Fazer pré-cadastro <Seta />
            </a>
            <a className="scw-btn scw-btn--contorno-claro" href="#festival" onClick={rolarPara('festival')}>
              Conhecer o festival
            </a>
          </div>
          <dl className="hm-abre__ficha">
            {FICHA.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="hm-abre__fotos">
          <div className="hm-abre__pessoas">
            {PESSOAS.map((foto, i) => (
              <span
                key={foto.src}
                className={'hm-abre__foto' + (i === ativa ? ' is-ativa' : '')}
                style={{
                  '--foto': pedidas[i] ? `url("${foto.src}")` : undefined,
                  '--foto-mobile': pedidas[i] ? `url("${fotoAte(foto.src, LARGURA_HEROI_MOBILE)}")` : undefined,
                  '--pos': foto.position,
                }}
                role={i === ativa ? 'img' : undefined}
                aria-label={i === ativa ? foto.alt : undefined}
                aria-hidden={i === ativa ? undefined : 'true'}
              />
            ))}
          </div>
          <div className="hm-abre__combo">
            {COMBOS_HEROI.map((foto, i) => (
              <span
                key={foto.src}
                className={'hm-abre__foto' + (i === ativa ? ' is-ativa' : '')}
                style={{ '--foto': pedidas[i] ? `url("${fotoAte(foto.src, 480)}")` : undefined, '--pos': foto.position }}
                role={i === ativa ? 'img' : undefined}
                aria-label={i === ativa ? foto.alt : undefined}
                aria-hidden={i === ativa ? undefined : 'true'}
              />
            ))}
          </div>
          {/* A legenda existe para ninguém ler estas fotos como material da
              edição de novembro: são registros da Lovers (2026.1). */}
          <figcaption className="hm-abre__legenda">
            Registros da edição Lovers · 2026 · combo {COMBOS_HEROI[ativa].legenda}
          </figcaption>
        </figure>
      </section>

      {/* ------------------------------------------ 02 O festival ---------- */}
      <section id="festival" className="scw-secao scw-secao--creme hm-festival">
        <div className="hm-festival__texto">
          <span className="scw-rotulo">O festival</span>
          <h2 className="scw-h2">
            Um tema, <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>um combo por casa</em>, a cidade como rota.
          </h2>
          <p className="hm-apoio">
            Desde 2016, casas de Natal e região criam uma composição exclusiva a partir do tema de cada edição. O público percorre a rota, prova e avalia.
          </p>

          <div className="hm-anatomia">
            <span className="scw-rotulo">A anatomia do combo</span>
            <div className="hm-ingredientes">
              {INGREDIENTES.map((item, i) => (
                <React.Fragment key={item.nome}>
                  {i > 0 && (
                    <span className="hm-mais" aria-hidden="true">
                      <svg width="52%" height="52%" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                        <path d="M16 5.8v20.4M5.8 16h20.4" />
                      </svg>
                    </span>
                  )}
                  <div className="hm-ing">
                    <span className="hm-ing__disco" style={{ background: item.cor, color: item.tinta }} aria-hidden="true">
                      {ANATOMIA_COMBO[item.nome].map((desenho, j) => (
                        <svg
                          key={j}
                          className="hm-ing__icone"
                          viewBox="0 0 32 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animationDelay: `${j * 2200}ms` }}
                          dangerouslySetInnerHTML={{ __html: desenho }}
                        />
                      ))}
                    </span>
                    <strong className="hm-ing__nome">{item.nome}</strong>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <dl className="hm-lacos">
            {LACOS.map(([quem, texto]) => (
              <div key={quem}>
                <dt>{quem}</dt>
                <dd>{texto}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="hm-festival__foto">
          <Foto foto={fotosHome('combo')} papel="cartao" />
          <figcaption>Doce, salgado e bebida · Lovers 2026</figcaption>
        </figure>
      </section>

      {/* ------------------------------------------ 03 Como participar ----- */}
      <section className="scw-secao hm-participa" aria-labelledby="hm-participa-titulo">
        <div className="hm-participa__cab">
          <span className="scw-rotulo">Como participar</span>
          <h2 id="hm-participa-titulo" className="scw-h2">Três passos até a rota de {PROX.mes}.</h2>
          <p className="hm-participa__nota">
            O pré-cadastro registra o interesse. A participação depende da curadoria e das vagas da edição.
          </p>
        </div>

        <ol className="hm-passos">
          {PASSOS.map(([icone, titulo, texto], i) => (
            <li className="hm-passo" key={titulo}>
              <span className="hm-passo__topo">
                <span className="hm-passo__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="scw-disco hm-passo__disco" aria-hidden="true"><ScwIcon nome={icone} tamanho={24} /></span>
              </span>
              <h3 className="hm-passo__titulo">{titulo}</h3>
              <p className="hm-passo__texto">{texto}</p>
            </li>
          ))}
        </ol>

        <div className="hm-participa__acoes">
          <a className="scw-btn hm-btn--choco" href={PROX.preCadastro}>
            Fazer pré-cadastro <Seta />
          </a>
          <a className="hm-link hm-link--escuro" href="/participar" onClick={ir('/participar')}>
            Tudo sobre participar <Seta size={16} />
          </a>
        </div>
      </section>

      {/* ------------------------------------------ 04 Por que participar -- */}
      <section className="scw-secao scw-secao--creme">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo">Por que participar</span>
            <h2 className="scw-h2">
              O que a rota <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>deixa na casa</em>.
            </h2>
          </div>
          <p className="hm-apoio">Dez anos de números, prêmios e histórias de quem já entrou.</p>
        </div>

        <div className="hm-voz">
          <figure className="hm-voz__foto">
            <Foto foto={fotosHome('jolie')} papel="cartao" />
          </figure>
          <figure className="hm-voz__texto">
            <blockquote className="hm-voz__frase">{VOZ.frase}</blockquote>
            <figcaption className="hm-voz__assinatura">
              <span className="hm-voz__marca">
                {JOLIE.logo
                  ? <img src={JOLIE.logo} alt="" loading="lazy" decoding="async" />
                  : <span aria-hidden="true">{JOLIE.fallback}</span>}
              </span>
              <span className="hm-voz__id">
                <b>{VOZ.pessoa}</b>
                <span>{VOZ.marca}</span>
              </span>
            </figcaption>
            <a className="hm-link" href="/participar?scrollTo=depoimentos" onClick={ir('/participar?scrollTo=depoimentos')}>
              Ver os depoimentos em vídeo <Seta size={16} />
            </a>
          </figure>
        </div>

        <ul className="hm-ganhos">
          {GANHOS.map((g) => {
            const i = g.alvo ? k++ : -1
            return (
              <li className="hm-ganho" key={g.titulo}>
                <span className="hm-ganho__cabeca">
                  <ScwIcon nome={g.icone} tamanho={24} />
                  <b>{g.titulo}</b>
                </span>
                {g.alvo
                  ? <strong className="scw-numeral hm-ganho__valor">{g.antes}{contagens[i]}{g.depois}</strong>
                  : <strong className="hm-ganho__valor hm-ganho__valor--palavra">{g.palavra}</strong>}
                <p className="hm-ganho__texto">{g.texto}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ------------------------------------------ 05 Em movimento -------- */}
      <section className="scw-secao scw-secao--choco hm-movimento">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo hm-rotulo--amarelo">O festival em movimento</span>
            <h2 className="scw-h2 hm-h2--claro">
              Gente à mesa, casas cheias, <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-creme)', '--dest': 'var(--scw-amarelo)' }}>combos que viram assunto</em>.
            </h2>
          </div>
          <p className="hm-apoio hm-apoio--clara">Registros de edições anteriores: pessoas, equipes, combos e os detalhes que fazem cada um.</p>
        </div>

        <div className="hm-mosaico">
          {fotosHome('mosaico').map((foto) => (
            <figure className="hm-mosaico__item" key={foto.src}>
              <Foto foto={foto} papel="cartao" />
              <figcaption>{foto.legenda}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------ 06 Trajetória ---------- */}
      <section className="scw-secao scw-secao--bege">
        <div className="hm-cab">
          <div>
            <span className="scw-rotulo">Trajetória</span>
            <h2 className="scw-h2">
              Dez anos que <em className="scw-destaque" data-destaque style={{ '--base': 'var(--scw-choco)', '--dest': 'var(--scw-magenta)' }}>continuam na rota</em>.
            </h2>
          </div>
          <p className="hm-apoio">
            {F.editions.value} edições, {F.brands.value} marcas e um prêmio decidido pelo público. A história inteira está nas páginas do festival.
          </p>
        </div>

        <div className="hm-destinos">
          <a className="hm-destino hm-destino--edicoes" href="/edicoes" onClick={ir('/edicoes')}>
            <span className="hm-destino__fotos">
              {fotosHome('edicoes').map((foto) => (
                <span className="hm-destino__capa" key={foto.src}>
                  <Foto foto={foto} papel="miniatura" />
                  <b>{foto.ano}</b>
                </span>
              ))}
            </span>
            <span className="hm-destino__corpo">
              <span className="hm-destino__eixo">Edições</span>
              <strong className="hm-destino__titulo">Um tema novo a cada edição, desde 2016.</strong>
              <span className="hm-destino__texto">Veja os temas, as casas participantes e as fotos de cada ano.</span>
              <span className="hm-destino__cta">Explorar as edições <Seta size={16} /></span>
            </span>
          </a>

          <a className="hm-destino hm-destino--awards" href="/sweet-awards" onClick={ir('/sweet-awards')}>
            <span className="hm-destino__foto">
              <Foto foto={fotosHome('premio')} papel="cartao" />
            </span>
            <span className="hm-destino__corpo">
              <span className="hm-destino__eixo">Sweet Awards</span>
              <strong className="hm-destino__titulo">{EDICOES_PREMIADAS} edições premiadas pela avaliação do público.</strong>
              <span className="hm-destino__texto">Pódios por categoria e as casas que mais subiram nele.</span>
              <span className="hm-destino__cta">Ver o Sweet Awards <Seta size={16} /></span>
            </span>
          </a>
        </div>

        <div className="hm-imprensa">
          <div className="hm-imprensa__cab">
            <span className="scw-rotulo">Na imprensa</span>
            <a className="hm-materia" href={destaque.href} target="_blank" rel="noopener noreferrer">
              <span className="hm-materia__veiculo">{destaque.veiculo} · {destaque.ano}</span>
              <strong className="hm-materia__titulo">{destaque.titulo}</strong>
            </a>
          </div>
          <div>
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

      {/* ------------------------------------------ 07 Apoio -------------- */}
      <section className="scw-secao scw-secao--compacta hm-apoiar">
        <div>
          <span className="scw-rotulo hm-rotulo--bege">Para parceiros</span>
          <h2 className="hm-apoiar__titulo">Apoie a próxima edição.</h2>
        </div>
        <p className="hm-apoiar__texto">
          Conecte sua marca à gastronomia, à cultura e à economia criativa de Natal, ao lado das casas e do público do festival.
        </p>
        <a className="scw-btn hm-btn--bege" href="/apoiar" onClick={ir('/apoiar')}>
          Quero apoiar <Seta />
        </a>
      </section>

      {/* ------------------------------------------ 07 Realização ----------
          Quebra de marca proposital: KV da F2 Experience (preto #0B0B0C,
          acento #E50053, Archivo). Única seção fora da paleta e da Nexa —
          decisão do Wilker, registrada no CLAUDE.md §6.1. */}
      <section className="scw-secao scw-secao--compacta f2-realiza">
        <div className="f2-realiza__kv" aria-hidden="true" />

        <div className="f2-realiza__conteudo">
          <div className="f2-realiza__topo">
            <span className="f2-realiza__indice">Realização <i /></span>
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
                Sweet &amp; Coffee Week: eventos, ativações e experiências de marca para
                quem quer conexão e resultado.
              </p>
              <a className="f2-realiza__cta" href="https://www.f2experience.com.br/" target="_blank" rel="noopener noreferrer">
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
