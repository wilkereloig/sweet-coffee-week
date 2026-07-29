/*
 * PÁGINA INSTITUCIONAL — "Apoiar" (redesign 2026). Irmã da Participar: mesma
 * estrutura de herói e mesmo kit de seções, com números de mídia no lugar dos
 * números de participação.
 *
 * Recriada a partir de design_handoff_site_institucional (README + protótipo
 * .dc.html, seções 01 a 06): 01 Abertura · 02 Alcance · 03 Por que apoiar ·
 * 04 Onde aparece · 05 Quem vive · 06 Proposta.
 *
 * A proposta de apoio mantém a PERSISTÊNCIA REAL que já existia: grava via RPC
 * Supabase `submit_support_interest` (lógica pura em src/lib/supportInterest.js
 * — nome + empresa obrigatórios, e-mail OU WhatsApp). Nunca afirma "enviado" se
 * a gravação falhar. Nenhum número inventado: tudo vem do protótipo/acervo.
 */
import React from 'react'
import { I } from '../../components/icons'
import { supabase } from '../../lib/supabase'
import {
  EMPTY_SUPPORT,
  SEGMENTOS,
  INTERESSES,
  validateSupport,
  submitSupport,
} from '../../lib/supportInterest'
import { bgStyle, comboMain, editionPhotos, heroPhotos, RESERVA } from '../../data/imageLibrary'
import '../../styles/scw-participar-apoiar.css'

const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Fotos do herói desta rota (sistema central): cartão em crossfade no desktop,
// banda sangrando no celular. O véu por cima usa a cor da página.
const FOTOS_HERO = heroPhotos('apoiar')
const FOTO_BANDA = FOTOS_HERO[0]

const INDICADORES = [
  { v: '+200 mil', d: 'pessoas alcançadas', c: 'var(--scw-amarelo)' },
  { v: '+18 mi', d: 'visualizações no Instagram', c: 'var(--scw-cyan)' },
  { v: '+290 mil', d: 'interações do público', c: 'var(--scw-magenta)' },
]

const PALAVRAS = [
  'patrocínio', 'ativação de marca', 'mídia e conteúdo',
  'economia criativa', 'sweet lovers',
]

// 02 Alcance — histórico comercial das edições + Instagram oficial.
const ALCANCE = [
  { n: '+65 mil', t: 'seguidores no Instagram', d: 'comunidade que acompanha combos e resultados', c: 'var(--scw-vinho)' },
  { n: '+34 mil', t: 'combos vendidos', d: 'consumo gerado nas últimas edições', c: 'var(--scw-roxo)' },
  { n: '+R$ 712 mil', t: 'movimentação direta', d: 'valor movimentado nas últimas edições', c: 'var(--scw-marrom)' },
  { n: '16', t: 'edições realizadas', d: 'histórico consolidado desde 2016', c: 'var(--scw-vinho)' },
  { n: '10', t: 'anos de história', d: 'uma década de público, marcas e cidade', c: 'var(--scw-vinho)' },
  { n: '+1.600', t: 'posts publicados', d: 'participantes, combos, bastidores e Sweet Awards', c: 'var(--scw-roxo)' },
]

// 03 Por que apoiar — ícones desenhados para cada argumento (24×24, traço).
const ICO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const MOTIVOS = [
  {
    t: 'Visibilidade qualificada', c: 'var(--scw-magenta)',
    d: 'Sua marca aparece em uma temporada de público ativo, conteúdo diário e alta circulação digital.',
    p: <><path d="M2.5 12s3.4-6.3 9.5-6.3S21.5 12 21.5 12s-3.4 6.3-9.5 6.3S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.6" /></>,
  },
  {
    t: 'Conexão com consumo local', c: 'var(--scw-vinho)',
    d: 'O festival leva pessoas para cafeterias, docerias, restaurantes e marcas autorais da cidade.',
    p: <><path d="M4.2 9.5 5.4 5.4h13.2l1.2 4.1" /><path d="M3.8 9.5h16.4c0 1.6-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1-2.5-1.6 2.7 2.7 0 0 1-5 0 2.7 2.7 0 0 1-2.5 1.6c-1.5 0-2.7-1.1-2.7-2.7Z" /><path d="M5.3 12.4V19.5h13.4V12.4" /><path d="M10 19.5V15h4v4.5" /></>,
  },
  {
    t: 'Presença em experiência real', c: 'var(--scw-amarelo)',
    d: 'A marca participa de algo vivido na loja, no mapa, nas redes e na memória do público.',
    p: <><path d="M12 21s6.4-5.5 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15.5 12 21 12 21Z" /><circle cx="12" cy="10.4" r="2.4" /></>,
  },
  {
    t: 'Associação à economia criativa', c: 'var(--scw-cyan)',
    d: 'Gastronomia, conteúdo, design, fotografia, atendimento e turismo urbano em movimento.',
    p: <><path d="M11 3.5 12.7 9l5.3 1.7-5.3 1.7L11 17.9l-1.7-5.5L4 10.7 9.3 9 11 3.5Z" /><path d="M18.5 3.5v3.4M16.8 5.2h3.4" /></>,
  },
  {
    t: 'Comunidade Sweet Lovers', c: 'var(--scw-bege)',
    d: 'O público não só consome: fotografa, avalia, compartilha e acompanha os resultados.',
    p: <><circle cx="9" cy="8.4" r="3" /><path d="M3.6 19a5.4 5.4 0 0 1 10.8 0" /><path d="M16 5.8a3 3 0 0 1 0 5.6" /><path d="M16.6 13.4A5.4 5.4 0 0 1 20.4 19" /></>,
  },
  {
    t: 'Conteúdo antes, durante e depois', c: 'var(--scw-vinho)',
    d: 'O apoio aparece no lançamento, nos posts, no site, no Sweet Awards e nas ações promocionais.',
    p: <><path d="M3.5 8.3h3l1.3-2h6.4l1.3 2h3A1.5 1.5 0 0 1 20 9.8V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 2 18V9.8a1.5 1.5 0 0 1 1.5-1.5Z" /><circle cx="11" cy="13.4" r="3.2" /></>,
  },
]

// 04 Onde a marca aparece — 4 pontos de contato, fotos do acervo real.
const ONDE = [
  {
    t: 'Digital', c: 'var(--scw-vinho)', tinta: 'var(--scw-creme)', ponto: 'var(--scw-vinho)',
    foto: editionPhotos('2026.1')[1],
    itens: ['Posts e stories', 'Reels', 'Site oficial', 'Página de participantes', 'Página de promoções'],
  },
  {
    t: 'Cidade e PDV', c: 'var(--scw-marrom)', tinta: 'var(--scw-creme)', ponto: 'var(--scw-magenta)',
    // Campanha e público não têm vínculo com edição nem marca no acervo — ficam
    // fora do sistema central, com alt e ponto focal declarados aqui.
    foto: { src: '/images/campanha/03.jpg', alt: 'Display de mesa do Sweet & Coffee Week com QR code em uma loja participante', position: 'center 44%' },
    itens: ['Display de mesa', 'Adesivo de vitrine', 'Mapa e rota do festival', 'Materiais impressos', 'Ativações nas lojas'],
  },
  {
    t: 'Relacionamento', c: 'var(--scw-cyan)', tinta: 'var(--scw-choco)', ponto: 'var(--scw-cyan)',
    foto: { src: '/images/momentos/05.jpg', alt: 'Sweet Lovers em uma ação de marca do Sweet & Coffee Week', position: 'center 40%' },
    itens: ['Press kit', 'Vouchers e brindes', 'Sorteios', 'Ações com Sweet Lovers', 'Experiências de marca'],
  },
  {
    t: 'Premiação', c: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)', ponto: 'var(--scw-amarelo)',
    foto: comboMain('O Maestro Café'),
    itens: ['Sweet Awards', 'Cards de resultado', 'Conteúdos de vencedores', 'Ações de reconhecimento'],
  },
]

// 05 Quem vive o festival — perfil qualitativo (sem número de público inventado).
const PUBLICO = [
  'Público urbano e conectado',
  'Consumidores de experiência gastronômica',
  'Comunidade ativa no Instagram do festival',
  'Pessoas que circulam por cafeterias, docerias e restaurantes',
  'Sweet Lovers que fotografam, avaliam e compartilham',
  'Quem acompanha combos, participantes e resultados de cada edição',
]

// Veículos que já noticiaram o festival — só nomes (sem logo inventada).
const VEICULOS = [
  'Agora RN', 'NOVO Notícias', 'Diário do RN', '96 FM',
  '98 FM', 'Tribuna do Norte', 'Agência Sebrae de Notícias', 'UFRN',
]

// RPC injetado na lógica pura (mantém o módulo testável offline).
const rpc = (name, payload) => supabase.rpc(name, payload)

// Crossfade do cartão de foto do herói. Para quando o sistema pede menos
// movimento. (Gêmeo do hook da Participar — 6 linhas, não vale um módulo.)
function useRotacao(total, intervalo = 6200) {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (typeof window === 'undefined' || total < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = window.setInterval(() => setI((v) => (v + 1) % total), intervalo)
    return () => window.clearInterval(id)
  }, [total, intervalo])
  return i
}

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

export function ApoiarPage() {
  const foto = useRotacao(FOTOS_HERO.length)
  const barraVisivel = useBarra()

  const [form, setForm] = React.useState(EMPTY_SUPPORT)
  const [errors, setErrors] = React.useState({})
  const [sending, setSending] = React.useState(false)
  const [state, setState] = React.useState('idle') // idle | success | error
  const sucessoRef = React.useRef(null)

  React.useEffect(() => {
    if (state === 'success' && sucessoRef.current) sucessoRef.current.focus()
  }, [state])

  const onChange = (campoNome) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [campoNome]: value }))
    // limpa o erro do campo (e o de contato, que depende de e-mail + WhatsApp)
    if (errors[campoNome] || errors.contato) {
      setErrors(({ [campoNome]: _drop, contato: _c, ...resto }) => resto)
    }
    if (state === 'error') setState('idle')
  }

  const irPara = (id) => (e) => {
    if (e) e.preventDefault()
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recomecar = () => {
    setForm(EMPTY_SUPPORT)
    setErrors({})
    setState('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const check = validateSupport(form)
    if (!check.ok) { setErrors(check.errors); return }
    setSending(true)
    const res = await submitSupport(form, rpc)
    setSending(false)
    if (res.status === 'invalid') { setErrors(res.errors); return }
    if (res.status === 'success') { setErrors({}); setState('success'); return }
    setState('error')
  }

  // Campo de texto (label + input + erro). Chamado como FUNÇÃO — nunca como
  // <Campo/> — para o React não remontar o input a cada tecla (perderia o foco).
  const campo = ({ name, label, type = 'text', placeholder, opcional, autoComplete, full }) => {
    const err = errors[name]
    const eid = `pa-apoio-${name}-err`
    return (
      <label className={`scw-campo${full ? ' scw-campo--full' : ''}`}>
        <span>{label}{opcional ? '' : ' *'}</span>
        <input
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

  const seletor = ({ name, label, opcoes }) => {
    const err = errors[name]
    const eid = `pa-apoio-${name}-err`
    return (
      <label className="scw-campo">
        <span>{label} *</span>
        <select
          value={form[name]}
          onChange={onChange(name)}
          required
          aria-required="true"
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? eid : undefined}
        >
          <option value="">Selecione</option>
          {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {err && <span className="pa-erro" id={eid} role="alert">{err}</span>}
      </label>
    )
  }

  return (
    <>
      {/* ═══ 01 Abertura ═══ */}
      <section className="scw-hero-bloco pa-hero" aria-labelledby="pa-titulo">
        <div className="scw-hero-banda" role="img" aria-label={FOTO_BANDA.alt} style={bgStyle(FOTO_BANDA, { mobile: true })} />

        <div className="pa-hero__grade">
          <div>
            <span className="scw-pill scw-pill--pagina pa-hero__selo">Para empresas, marcas e instituições</span>
            <h1 id="pa-titulo" className="scw-h1 pa-hero__titulo">
              Sua marca associada à{' '}
              <em className="pa-destaque" style={{ '--base': '#FEF0DD', '--dest': '#FDBB1A' }}>economia criativa de Natal</em>.
            </h1>
            <p className="scw-lead pa-hero__lead">
              Apoiar o Sweet &amp; Coffee Week é associar sua marca a gastronomia, cultura e pequenos
              negócios — com presença na campanha, nos conteúdos e nas ações de cada edição.
            </p>
            <div className="pa-hero__acoes">
              <a href="#proposta" className="scw-btn scw-btn--solido" onClick={irPara('proposta')}>
                Conversar sobre apoio <I.arrow width={17} height={17} />
              </a>
              <a href="#alcance" className="scw-btn scw-btn--contorno-claro" onClick={irPara('alcance')}>
                Ver o alcance do festival
              </a>
            </div>
            <span className="pa-hero__nota">
              Patrocínio, ativação e conteúdo · cotas por edição · Natal e Parnamirim
            </span>
          </div>

          <div className="pa-hero__aside">
            <div className="scw-hero-cartao">
              {FOTOS_HERO.map((f, i) => (
                <span
                  key={f.src}
                  className={`scw-hero-cartao__foto${i === foto ? ' is-ativa' : ''}`}
                  role={i === foto ? 'img' : undefined}
                  aria-label={i === foto ? f.alt : undefined}
                  aria-hidden={i === foto ? undefined : 'true'}
                  style={bgStyle(f)}
                />
              ))}
            </div>
            <p className="pa-hero__rotulos">
              <b>Onde sua marca aparece</b>
              <span>@sweetcoffeeweek</span>
            </p>
            <dl className="pa-hero__dados">
              {INDICADORES.map((m) => (
                <div className="pa-hero__dado" key={m.d} style={{ '--c': m.c }}>
                  <dt>{m.v}</dt>
                  <dd>{m.d}</dd>
                </div>
              ))}
            </dl>
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

      {/* ═══ 02 Alcance ═══ */}
      <section id="alcance" className="scw-secao scw-secao--bege">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo">O que já foi construído</span>
            <h2 className="scw-h2">
              Dez anos de <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#B3213B' }}>audiência e consumo</em> na cidade.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Números do histórico comercial das edições e do Instagram oficial do festival —
            arredondados para baixo.
          </p>
        </div>
        <ul className="pa-numeros">
          {ALCANCE.map((n) => (
            <li key={n.t} style={{ '--c': n.c }}>
              <b>{n.n}</b>
              <strong>{n.t}</strong>
              <span>{n.d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 03 Por que apoiar ═══ */}
      <section className="scw-secao scw-secao--creme">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo">Por que apoiar</span>
            <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
              Seis motivos que <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#B3213B' }}>justificam o investimento</em>.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            O apoio não fica num logo isolado: entra na experiência que o público vive na cidade.
          </p>
        </div>
        <ul className="pa-cards pa-cards--largos">
          {MOTIVOS.map((m) => (
            <li className="pa-card" key={m.t}>
              <span className="pa-card__ic" style={{ '--c': m.c }}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...ICO}>{m.p}</svg>
              </span>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 04 Onde aparece ═══ */}
      <section className="scw-secao scw-secao--bege">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo">Onde a marca aparece</span>
            <h2 className="scw-h2" style={{ maxWidth: '22ch' }}>
              Quatro pontos de <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#01AFCC' }}>contato com o público</em>.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Do digital ao balcão da loja, cada frente pode receber a presença do apoiador.
          </p>
        </div>
        <ul className="pa-onde">
          {ONDE.map((g) => (
            <li key={g.t} style={{ '--c': g.ponto }}>
              <figure>
                {g.foto
                  ? <img src={g.foto.src} alt={g.foto.alt} style={{ objectPosition: g.foto.position }} loading="lazy" decoding="async" />
                  : <div className="scw-reserva">{RESERVA}</div>}
                <span className="pa-onde__tag" style={{ '--c': g.c, '--tinta': g.tinta }}>{g.t}</span>
              </figure>
              <ul>
                {g.itens.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ 05 Quem vive o festival ═══ */}
      <section className="scw-secao scw-secao--choco">
        <div className="pa-cabeca">
          <div>
            <span className="scw-rotulo">Quem vive o festival</span>
            <h2 className="scw-h2" style={{ color: 'var(--scw-creme)', maxWidth: '20ch' }}>
              Um público que <em className="pa-destaque" style={{ '--base': '#FEF0DD', '--dest': '#01AFCC' }}>sai de casa para provar</em>.
            </h2>
          </div>
          <p className="pa-cabeca__apoio">
            Perfil qualitativo da comunidade que acompanha cada edição — e da imprensa que cobre
            o festival.
          </p>
        </div>
        <div className="pa-quem">
          <ul className="pa-quem__lista">
            {PUBLICO.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <div>
            <span className="pa-veiculos__rotulo">Já noticiaram o festival</span>
            <ul className="pa-veiculos">
              {VEICULOS.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ 06 Proposta (formulário em destaque) ═══ */}
      <section id="proposta" className="scw-secao scw-secao--bege">
        <div className="pa-form__intro">
          <span className="scw-rotulo">Conversar com a organização</span>
          <h2 className="scw-h2" style={{ margin: 'clamp(14px,1.6vw,20px) auto 0' }}>
            Conte como sua marca quer <em className="pa-destaque" style={{ '--base': '#3D1308', '--dest': '#B3213B' }}>entrar na edição</em>.
          </h2>
          <p>
            A organização responde com formatos de apoio, contrapartidas e prazos da próxima edição.
          </p>
        </div>

        {state === 'success' ? (
          <div className="pa-sucesso" ref={sucessoRef} tabIndex={-1} role="status">
            <span className="pa-sucesso__mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <strong>Proposta registrada.</strong>
            <p>
              A organização do Sweet &amp; Coffee Week recebeu sua proposta e retorna pelo contato
              informado para alinhar formato, contrapartidas e disponibilidade.
            </p>
            <button type="button" onClick={recomecar}>Enviar outra proposta</button>
          </div>
        ) : (
          <form className="pa-form" onSubmit={onSubmit} noValidate aria-label="Proposta de apoio">
            <div className="pa-form__grade">
              {campo({ name: 'nome', label: 'Seu nome', placeholder: 'Quem fala com a gente', autoComplete: 'name' })}
              {campo({ name: 'empresa', label: 'Empresa ou marca', placeholder: 'Nome da empresa', autoComplete: 'organization' })}
              {campo({ name: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@empresa.com', autoComplete: 'email', opcional: true })}
              {campo({ name: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '(84) 90000-0000', autoComplete: 'tel', opcional: true })}
              <p
                className={`pa-form__consent scw-campo--full${errors.contato ? ' pa-erro' : ''}`}
                id="pa-apoio-contato-err"
                role={errors.contato ? 'alert' : undefined}
              >
                {errors.contato || 'Informe pelo menos um contato: e-mail ou WhatsApp.'}
              </p>
              {seletor({ name: 'segmento', label: 'Segmento', opcoes: SEGMENTOS })}
              {seletor({ name: 'interesse', label: 'Tipo de apoio', opcoes: INTERESSES })}
              <label className="scw-campo scw-campo--full">
                <span>Mensagem <em>(opcional)</em></span>
                <textarea
                  value={form.mensagem}
                  onChange={onChange('mensagem')}
                  rows={3}
                  placeholder="Conte o que sua empresa busca com o apoio."
                />
              </label>
            </div>

            <div className="pa-form__pe">
              <p className="pa-form__consent">
                Seus dados são usados pela organização apenas para contato e análise da proposta.
              </p>
              <button type="submit" className="scw-btn pa-form__enviar" disabled={sending}>
                {sending ? 'Enviando…' : <>Enviar proposta <I.arrow width={17} height={17} /></>}
              </button>
            </div>
            <p className="pa-form__status" role="status" aria-live="polite">
              {state === 'error' && (
                <>Não conseguimos registrar sua proposta agora. Tente de novo em instantes ou fale
                  com a organização no{' '}
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@sweetcoffeeweek</a>.</>
              )}
            </p>
          </form>
        )}
      </section>

      <div className={`pa-barra${barraVisivel ? ' is-visivel' : ''}`}>
        <span>Apoio institucional e de edições em aberto.</span>
        <a href="#proposta" className="scw-btn scw-btn--solido" onClick={irPara('proposta')}>
          Falar sobre apoio <I.arrow />
        </a>
      </div>
    </>
  )
}
