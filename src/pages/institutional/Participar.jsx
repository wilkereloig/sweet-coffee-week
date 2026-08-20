/*
 * PÁGINA INSTITUCIONAL — "Participar" (redesign 2026).
 * Recriada a partir de design_handoff_site_institucional (README + protótipo
 * .dc.html, seções 01 a 08). O protótipo é referência de design em HTML com
 * estilo inline; aqui o layout vira JSX + classes (scw-2026.css para o sistema
 * visual e scw-participar-apoiar.css para as peças próprias das duas páginas).
 *
 * Seções: 01 Abertura · 02 Números · 03 Circulação · 04 Quem pode ·
 * 05 Depoimentos · 06 Imprensa · 07 Jornada · 08 Pré-cadastro.
 *
 * O pré-cadastro mantém a PERSISTÊNCIA REAL que já existia: grava o interesse
 * via RPC Supabase `submit_participation_interest` (lógica pura e testada em
 * src/lib/participationInterest.js). Nunca afirma "enviado" se a gravação
 * falhar. Nada de dado inventado: depoimentos, números e veículos de imprensa
 * vêm do acervo/protótipo.
 */
import React from 'react'
import { I } from '../../components/icons'
import ScwIcon from '../../components/scw-icons/ScwIcon'
import { supabase } from '../../lib/supabase'
import {
  NEGOCIOS,
  EMPTY_INTEREST,
  validateInterest,
  submitInterest,
} from '../../lib/participationInterest'
import { bgStyle, comboMain, editionPhotos, heroPhotos, RESERVA } from '../../data/imageLibrary'
import { resolveParticipant } from '../../data/participantAssets'
import '../../styles/scw-participar-apoiar.css'

// Fotos do herói desta rota (sistema central): cartão em crossfade no desktop,
// banda sangrando no celular. O véu por cima usa a cor da página.
const FOTOS_HERO = heroPhotos('participar')
const FOTO_BANDA = FOTOS_HERO[0]

/* Os três indicadores do herói saíram com o cartão (PATCH 01 §6). Nada de dado
   se perdeu: os três já existiam, com os mesmos números, em NUMEROS abaixo
   (+34 mil combos, +100 marcas, 11 dias por edição) — repetir os mesmos valores
   em seções vizinhas era a duplicação que a seção 03 já resolvia. */

const PALAVRAS = [
  'um combo autoral', 'presença na campanha', 'nova relação com o público',
  'sua marca na rota', 'sweet lovers',
]

// 02 Números — histórico do festival (mesmos dados do protótipo). Cor vive na
// régua (StatBlock — ver docs/FLUXO-DESIGN-CODIGO.md), ciclo de seis sem repetir.
const NUMEROS = [
  { n: '16', t: 'edições realizadas', d: 'de 2016 até hoje, duas por ano em média', c: 'var(--scw-marrom)' },
  { n: '+100', t: 'marcas participantes', d: 'doçarias, cafeterias, confeitarias e restaurantes', c: 'var(--scw-amarelo)' },
  { n: '+34 mil', t: 'combos vendidos', d: 'somando todas as edições do festival', c: 'var(--scw-cyan)' },
  { n: '+18 mi', t: 'visualizações no Instagram', d: 'conteúdo do festival e das marcas participantes', c: 'var(--scw-magenta)' },
  { n: '11', t: 'dias por edição', d: 'tempo em que o combo fica em cartaz na rota', c: 'var(--scw-roxo)' },
  { n: '17', t: 'matérias na imprensa', d: 'rádio, TV, jornais e portais de Natal e do RN', c: 'var(--scw-laranja)' },
]

// 03 Circulação — quatro faixas alternando o lado da imagem (larguras iguais).
const FAIXAS = [
  {
    ordem: '01 · Produto',
    titulo: 'Um combo autoral com a sua assinatura.',
    texto: 'Sua marca cria a assinatura da edição a partir do tema — e apresenta o que faz de melhor a quem chegou para descobrir.',
    resumo: 'doce + salgado + bebida',
    foto: editionPhotos('2026.1')[3],
    fundo: 'var(--scw-marrom)',
  },
  {
    ordem: '02 · Campanha',
    titulo: 'Presença na campanha do festival.',
    texto: 'Cada participante entra na comunicação: rota oficial, redes, imprensa e materiais de vitrine que circulam pela cidade inteira.',
    resumo: 'rota + redes + imprensa',
    // Campanha e público não têm vínculo com edição nem com marca no acervo —
    // ficam fora do sistema central, com alt e ponto focal declarados aqui.
    foto: { src: '/images/campanha/01.jpg', alt: 'Material de campanha do Sweet & Coffee Week em um ponto de venda', position: 'center 42%' },
    fundo: 'var(--scw-roxo)',
    inversa: true,
  },
  {
    ordem: '03 · Público',
    titulo: 'Uma relação nova com o público.',
    texto: 'Os Sweet Lovers experimentam, compartilham, avaliam e indicam — uma relação que costuma continuar depois da edição.',
    resumo: 'quem prova, volta',
    corResumo: 'var(--scw-amarelo)',
    foto: { src: '/images/lovers-publico/04.jpg', alt: 'Sweet Lovers durante a edição Lovers do Sweet & Coffee Week', position: 'center 38%' },
    fundo: 'var(--scw-choco)',
  },
  {
    ordem: '04 · Materiais',
    titulo: 'O material da edição chega pronto pra loja.',
    texto: 'Display de mesa, adesivo de vitrine, mapa da rota e brindes temáticos: a identidade da edição chega montada para a sua loja receber o público.',
    resumo: 'display + rota + brindes',
    // Peça real do acervo, sem vínculo de marca: o balde temático da edição
    // Séries — a palavra "Séries" está impressa na peça, não é inferência.
    foto: { src: '/images/campanha/19.jpg', alt: 'Balde temático e combo da edição Séries do Sweet & Coffee Week', position: 'center' },
    // Magenta é a única cor restante do ciclo (§5) que sustenta a tinta creme
    // deste painel — cyan e amarelo falham como fundo de texto normal.
    fundo: 'var(--scw-magenta)',
    inversa: true,
  },
]

// 04 Quem pode participar — ícones desenhados para cada tipo de negócio.
const ICO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
// Ciclo de seis sem repetir (§5): magenta, roxo, amarelo, cyan, bege, laranja.
// Roxo e laranja eram os dois discos chocolate-sobre-chocolate (ícone
// invisível) — roxo pede traço creme; laranja fecha AA com o traço padrão.
const PUBLICOS = [
  {
    t: 'Doçarias', d: 'doces, tortas e sobremesas', c: 'var(--scw-magenta)', tinta: 'var(--scw-choco)',
    p: <><path d="M6.6 10.5a5.4 5.4 0 0 1 10.8 0" /><path d="M6.4 10.5h11.2l-1.3 8a1.6 1.6 0 0 1-1.6 1.4H9.3a1.6 1.6 0 0 1-1.6-1.4l-1.3-8Z" /><path d="M10.4 13.4l-.5 5M13.6 13.4l.5 5" /><circle cx="12" cy="4.4" r="1.5" /></>,
  },
  {
    t: 'Confeitarias', d: 'bolos, docinhos e encomendas', c: 'var(--scw-roxo)', tinta: 'var(--scw-creme)',
    p: <><path d="M4.2 11.4h15.6V18a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2v-6.6Z" /><path d="M4.2 15.6h15.6" /><path d="M12 6.6v4.2" /><path d="M12 3.4c1.1 1 1.1 2 0 2.6-1.1-.6-1.1-1.6 0-2.6Z" /></>,
  },
  {
    t: 'Cafeterias', d: 'café, brunch e padaria', c: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)',
    p: <><path d="M4.6 9.4h10.8v4.8a4 4 0 0 1-4 4H8.6a4 4 0 0 1-4-4V9.4Z" /><path d="M15.4 11h2.1a2.4 2.4 0 0 1 0 4.8h-2.1" /><path d="M4 20.6h13" /><path d="M8.4 3.6c.7 1.4-.7 2 0 3.4M11.6 3.6c.7 1.4-.7 2 0 3.4" /></>,
  },
  {
    t: 'Restaurantes', d: 'cozinha autoral e bistrôs', c: 'var(--scw-cyan)', tinta: 'var(--scw-choco)',
    p: <><path d="M8.6 3.2v5.4a2.4 2.4 0 0 1-4.8 0V3.2" /><path d="M6.2 11v9.8" /><path d="M16.4 3.2c2.2 2.8 2.4 6.6 1.1 9.6h-2.4V6.8c0-1.4.5-2.6 1.3-3.6Z" /><path d="M16.3 12.8v8" /></>,
  },
  {
    t: 'Marcas gastronômicas', d: 'produção autoral, com ou sem loja', c: 'var(--scw-bege)', tinta: 'var(--scw-choco)',
    p: <><path d="M7.2 12.4a3.4 3.4 0 1 1 1.2-6.6 3.8 3.8 0 0 1 7.2 0 3.4 3.4 0 1 1 1.2 6.6H7.2Z" /><path d="M7.8 12.4h8.4v5.2a2 2 0 0 1-2 2H9.8a2 2 0 0 1-2-2v-5.2Z" /><path d="M7.8 15.6h8.4" /></>,
  },
  {
    t: 'Negócios afetivos', d: 'projetos de bairro e de família', c: 'var(--scw-laranja)', tinta: 'var(--scw-choco)',
    p: <><path d="M3.6 4.6h16.8l1.2 4.4H2.4l1.2-4.4Z" /><path d="M4.6 9v10.8h14.8V9" /><path d="M12 19.8v-6.4c1.9 0 3 1.1 3 2.4 0 1.6-1.6 2.6-3 4Z" /><path d="M12 13.4c-1.9 0-3 1.1-3 2.4 0 1.6 1.6 2.6 3 4" /></>,
  },
]

// 05 Depoimentos REAIS (transcritos do protótipo — não editar o sentido).
// O 6º card é reserva editorial honesta: a marca existe, o depoimento ainda não.
const DEPOIMENTOS = [
  { frase: '“Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.”', pessoa: 'Carol Barreto', marca: 'Jolie Café Pâtisserie', slug: 'jolie-cafe-patisserie', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { frase: '“É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos.”', pessoa: 'João Dantas', marca: 'O Maestro', slug: 'o-maestro-cafe', cor: 'var(--scw-marrom)', tinta: 'var(--scw-creme)' },
  { frase: '“O Sweet & Coffee Week hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.”', pessoa: 'Fernando Gurgel', marca: 'Paneer Patisserie', slug: 'paneer-patisserie', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)' },
  { frase: '“O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.”', pessoa: 'César e Tiago', marca: 'Mr. Cupcake', slug: 'mr-cupcake-confeitaria', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)' },
  { frase: '“Foi além das expectativas. Foram onze dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.”', pessoa: 'Edvan Barreto', marca: 'Casa 1190', slug: 'casa-1190', cor: 'var(--scw-choco)', tinta: 'var(--scw-creme)' },
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

// 06 Imprensa — veículos reais que noticiaram o festival. Os cards ainda NÃO
// têm URL (pendência do handoff), então não viram link.
// Registros reais de participantes do festival em programas de TV locais. Não
// nomeiam ninguém: o acervo não traz crédito confiável de veículo, data nem
// pessoa, e §16 proíbe preencher isso por dedução. O ponto focal de cada uma
// mira o grupo, que fica acima do centro nas três.
const IMPRENSA_FOTOS = [
  { src: '/images/imprensa/01.jpg', alt: 'Participante do Sweet & Coffee Week apresentando cookies em um programa de TV', position: 'center 30%' },
  { src: '/images/imprensa/02.jpg', alt: 'Cobertura de imprensa do Sweet & Coffee Week em estúdio de TV', position: 'center' },
  { src: '/images/imprensa/03.jpg', alt: 'Confeiteira participante do Sweet & Coffee Week apresentando um doce natalino em um programa de TV', position: 'center 26%' },
]

const IMPRENSA = [
  { veiculo: '96 FM', ano: '2026' },
  { veiculo: 'Tribuna do Norte', ano: '2026' },
  { veiculo: 'Blog do BG', ano: '2025' },
  { veiculo: 'TV Ponta Negra', ano: '2025' },
  { veiculo: 'Conversa Gastronômica', ano: '2024' },
  { veiculo: 'Agência Sebrae', ano: '2021' },
  { veiculo: 'UFRN', ano: '2022' },
]

// 07 Jornada depois do interesse.
const JORNADA = [
  { n: '01', t: 'Pré-cadastro', d: 'Você conta sobre a marca e registra o interesse — o começo de tudo.', c: 'var(--scw-amarelo)' },
  { n: '02', t: 'Análise', d: 'A organização avalia o perfil junto aos critérios de curadoria da edição.', c: 'var(--scw-cyan)' },
  { n: '03', t: 'Contato e aprovação', d: 'A equipe fala com você para confirmar os detalhes e a participação.', c: 'var(--scw-magenta)' },
  { n: '04', t: 'Próximos passos', d: 'Com a marca aprovada, chegam as orientações e os materiais para preparar a presença.', c: 'var(--scw-laranja)' },
]

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

// RPC injetado na lógica pura (mantém o módulo testável offline).
const rpc = (name, payload) => supabase.rpc(name, payload)

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

  const [form, setForm] = React.useState(EMPTY_INTEREST)
  const [errors, setErrors] = React.useState({})
  const [sending, setSending] = React.useState(false)
  const [state, setState] = React.useState('idle') // idle | success | error
  const sucessoRef = React.useRef(null)
  const primeiroRef = React.useRef(null)

  React.useEffect(() => {
    if (state === 'success' && sucessoRef.current) sucessoRef.current.focus()
  }, [state])

  const onChange = (campo) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [campo]: value }))
    if (errors[campo]) setErrors(({ [campo]: _drop, ...resto }) => resto)
    if (state === 'error') setState('idle')
  }

  const irPara = (id) => (e) => {
    if (e) e.preventDefault()
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recomecar = () => {
    setForm(EMPTY_INTEREST)
    setErrors({})
    setState('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const check = validateInterest(form)
    if (!check.ok) { setErrors(check.errors); return }
    setSending(true)
    const res = await submitInterest(form, rpc)
    setSending(false)
    if (res.status === 'invalid') { setErrors(res.errors); return }
    if (res.status === 'success') { setErrors({}); setState('success'); return }
    setState('error')
  }

  // Campo de texto (label + input + erro). Chamado como FUNÇÃO — nunca como
  // <Campo/> — para o React não remontar o input a cada tecla (perderia o foco).
  const campo = ({ name, label, type = 'text', placeholder, opcional, autoComplete, inputRef, full }) => {
    const err = errors[name]
    const eid = `pa-part-${name}-err`
    return (
      <label className={`scw-campo${full ? ' scw-campo--full' : ''}`}>
        <span>{label}{opcional ? <em> (opcional)</em> : ' *'}</span>
        <input
          ref={inputRef}
          type={type}
          value={form[name]}
          onChange={onChange(name)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={!opcional}
          aria-required={opcional ? undefined : 'true'}
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? eid : undefined}
        />
        {err && <span className="pa-erro" id={eid} role="alert">{err}</span>}
      </label>
    )
  }

  return (
    <>
      {/* ═══ 01 Abertura ═══ */}
      <section className="scw-hero-bloco pa-hero" aria-labelledby="pa-titulo">
        <div className="scw-hero-banda" role="img" aria-label={FOTO_BANDA.alt} style={bgStyle(FOTO_BANDA, { mobile: true })} />
        <img className="pa-hero__forma pa-hero__forma--participar" src="/images/shapes/shape-heart-yellow.svg" alt="" aria-hidden="true" />

        <div className="pa-hero__grade">
          <div>
            <span className="scw-pill scw-pill--pagina pa-hero__selo">Para doçarias, cafeterias e restaurantes</span>
            <h1 id="pa-titulo" className="scw-h1 pa-hero__titulo">
              Sua marca pode ser a próxima{' '}
              {/* Chapa cyan, tinta chocolate: o acento é roxo (4,25:1 — texto grande). */}
              <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#4D257E' }}>descoberta de Natal.</em>
            </h1>
            <p className="scw-lead pa-hero__lead">
              Participar é criar um combo autoral para o tema da edição e entrar na rota oficial
              do festival — com sua marca na comunicação, no site e no Sweet Awards.
            </p>
            <div className="pa-hero__acoes">
              <a href="#pre-cadastro" className="scw-btn scw-btn--solido" onClick={irPara('pre-cadastro')}>
                Fazer pré-cadastro <I.arrow width={17} height={17} />
              </a>
              <a href="#numeros" className="scw-btn scw-btn--contorno-claro" onClick={irPara('numeros')}>
                Ver o que o festival entrega
              </a>
            </div>
            <span className="pa-hero__nota">
              Participação por curadoria · Natal e Parnamirim
            </span>
          </div>
        </div>
      </section>

      <div className="scw-marquee" aria-hidden="true">
        {[0, 1, 2].map((linha) => (
          <ul key={linha}>
            {PALAVRAS.map((p) => (
              <li key={p}>
                <span className="scw-marquee__palavra">{p}</span>
                <span className="scw-marquee__ponto" />
              </li>
            ))}
          </ul>
        ))}
      </div>

      {/* ═══ 02 Depoimentos ═══
          Sobe logo depois da abertura (a pedido do Wilke, 30/07/2026): é a
          prova social da página — quem decide participar quer ouvir quem já
          participou antes de ler número ou processo. */}
      <section id="depoimentos" className="scw-secao scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/depoimento" tamanho={20} />Marcas que já viveram a edição</span>
            <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
              Quem participou conta com as <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#F10767' }}>próprias palavras</em>.
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
                      ? <img src={fotoCombo.src} alt={fotoCombo.alt} style={{ objectPosition: fotoCombo.position }} loading="lazy" decoding="async" />
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
              O tamanho da <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#F10767' }}>vitrine</em> que sua marca ocupa.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Dez anos de rota, imprensa e público que se organiza para provar cada edição.
          </p>
        </div>
        <ul className="pa-numeros">
          {NUMEROS.map((n) => (
            <li key={n.t}>
              <span className="scw-stat__regua" aria-hidden="true" style={{ background: n.c }} />
              <b>{n.n}</b>
              <strong>{n.t}</strong>
              <span>{n.d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 04 Circulação ═══ */}
      <section className="scw-secao scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/circulacao" tamanho={20} />O que a marca leva da edição</span>
            <h2 className="scw-h2" style={{ color: 'var(--scw-marrom)', maxWidth: '22ch' }}>
              Quatro frentes de <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#F10767' }}>visibilidade</em>, ao mesmo tempo.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Participar não é entrar numa lista: é criar, aparecer e conversar com um público novo.
          </p>
        </div>
        <div className="pa-faixas">
          {FAIXAS.map((f) => (
            <article
              className={`pa-faixa${f.inversa ? ' pa-faixa--inversa' : ''}`}
              key={f.ordem}
              style={{ '--fundo': f.fundo, '--resumo': f.corResumo || 'var(--scw-creme)' }}
            >
              <figure>
                {f.foto
                  ? <img src={f.foto.src} alt={f.foto.alt} style={{ objectPosition: f.foto.position }} loading="lazy" decoding="async" />
                  : <div className="scw-reserva">{RESERVA}</div>}
              </figure>
              <div className="pa-faixa__corpo">
                <span className="pa-faixa__ordem">{f.ordem}</span>
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
                <span className="pa-faixa__resumo">{f.resumo}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ 05 Quem pode ═══ */}
      <section className="scw-secao scw-secao--compacta scw-secao--bege">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/quem-pode" tamanho={20} />Quem pode participar</span>
            <h2 className="scw-h2">
              Marcas que fazem <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#01AFCC' }}>comida afetiva</em> em Natal e região.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Não é preciso ser grande: é preciso ter uma criação sua para colocar na rota.
            A participação passa por curadoria da organização.
          </p>
        </div>
        <ul className="pa-cards">
          {PUBLICOS.map((p) => (
            <li className="pa-card" key={p.t}>
              <span className="scw-disco" style={{ '--c': p.c, '--tinta': p.tinta }}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...ICO}>{p.p}</svg>
              </span>
              <span className="pa-card__txt">
                <b>{p.t}</b>
                <span>{p.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 06 Imprensa ═══ */}
      <section className="scw-secao scw-secao--compacta scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/imprensa" tamanho={20} />O festival na imprensa</span>
            <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
              Sua marca aparece onde a cidade <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#01AFCC' }}>já está olhando</em>.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Rádio, TV, jornais e portais de Natal e do RN acompanham cada edição desde 2016.
          </p>
        </div>
        <ul className="pa-imprensa__fotos">
          {IMPRENSA_FOTOS.map((f) => (
            <li key={f.src}>
              <img src={f.src} alt={f.alt} style={{ objectPosition: f.position }} loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
        <ul className="pa-imprensa">
          {IMPRENSA.map((v) => (
            <li key={`${v.veiculo}-${v.ano}`}>
              <b>{v.veiculo}</b>
              <span>{v.ano}</span>
            </li>
          ))}
        </ul>
        <p className="pa-imprensa__nota">
          São 17 matérias no total. Os links das publicações entram aqui assim que forem reunidos.
        </p>
      </section>

      {/* ═══ 07 Jornada ═══ */}
      <section className="scw-secao scw-secao--choco">
        <div className="pa-cabeca pa-cabeca--simples">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="mapa/trajeto" tamanho={20} />Depois do seu interesse</span>
            <h2 className="scw-h2" style={{ color: 'var(--scw-creme)', maxWidth: '22ch' }}>
              Um <em className="pa-destaque" style={{ '--base': '#FEF0DD', '--dest': '#01AFCC' }}>percurso claro</em>, do pré-cadastro à edição.
            </h2>
          </div>
        </div>
        <ol className="pa-jornada">
          {JORNADA.map((j) => (
            <li key={j.n} style={{ '--c': j.c }}>
              <b>{j.n}</b>
              <h3>{j.t}</h3>
              <p>{j.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ═══ 08 Pré-cadastro (formulário em destaque) ═══ */}
      <section id="pre-cadastro" className="scw-secao scw-secao--bege">
        <div className="pa-form__intro">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="mecanica/inscricao" tamanho={20} />Pré-cadastro</span>
          <h2 className="scw-h2" style={{ margin: 'clamp(14px,1.6vw,20px) auto 0' }}>
            Comece a <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#F10767' }}>jornada da sua marca</em>.
          </h2>
          <p>
            Leva dois minutos. Depois do envio, a equipe avalia o perfil e retorna pelos canais
            que você informar.
          </p>
        </div>

        {state === 'success' ? (
          <div className="pa-sucesso" ref={sucessoRef} tabIndex={-1} role="status">
            <span className="pa-sucesso__mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <strong>Interesse registrado.</strong>
            <p>
              Recebemos os dados da sua marca. A organização vai analisar o perfil e entrar em
              contato pelos canais que você informou.
            </p>
            <button type="button" onClick={recomecar}>Preencher outro pré-cadastro</button>
          </div>
        ) : (
          <form className="pa-form" onSubmit={onSubmit} noValidate aria-label="Pré-cadastro de participação">
            <fieldset>
              <legend>01 · Sua marca</legend>
              <div className="pa-form__grade">
                {campo({ name: 'marca', label: 'Nome da marca', placeholder: 'Como sua marca se chama', inputRef: primeiroRef, full: true })}
                <label className="scw-campo">
                  <span>Tipo de negócio *</span>
                  <select
                    value={form.tipo}
                    onChange={onChange('tipo')}
                    required
                    aria-required="true"
                    aria-invalid={errors.tipo ? 'true' : undefined}
                    aria-describedby={errors.tipo ? 'pa-part-tipo-err' : undefined}
                  >
                    <option value="">Selecione</option>
                    {NEGOCIOS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors.tipo && <span className="pa-erro" id="pa-part-tipo-err" role="alert">{errors.tipo}</span>}
                </label>
                {campo({ name: 'bairro', label: 'Bairro', placeholder: 'Bairro da marca' })}
                {campo({ name: 'cidade', label: 'Cidade', placeholder: 'Cidade / UF' })}
              </div>
            </fieldset>

            <fieldset>
              <legend>02 · Seu contato</legend>
              <div className="pa-form__grade">
                {campo({ name: 'responsavel', label: 'Nome do responsável', placeholder: 'Seu nome', autoComplete: 'name', full: true })}
                {campo({ name: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@suamarca.com', autoComplete: 'email' })}
                {campo({ name: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '(84) 90000-0000', autoComplete: 'tel' })}
                {campo({ name: 'instagram', label: 'Instagram', placeholder: '@suamarca', opcional: true })}
                <label className="scw-campo scw-campo--full">
                  <span>Apresentação da marca <em>(opcional)</em></span>
                  <textarea
                    value={form.apresentacao}
                    onChange={onChange('apresentacao')}
                    rows={3}
                    placeholder="Conte, em poucas linhas, o que sua marca faz."
                  />
                </label>
              </div>
            </fieldset>

            <div className="pa-form__pe">
              <p className="pa-form__consent">
                Seus dados são usados pela organização apenas para contato e análise do interesse.
              </p>
              <button type="submit" className="scw-btn pa-form__enviar" disabled={sending}>
                {sending ? 'Enviando…' : <>Enviar pré-cadastro <I.arrow width={17} height={17} /></>}
              </button>
            </div>
            <p className="pa-form__status" role="status" aria-live="polite">
              {state === 'error' && 'Não conseguimos registrar agora. Confira a conexão e tente de novo.'}
            </p>
          </form>
        )}
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
