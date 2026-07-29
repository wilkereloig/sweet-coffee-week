/*
 * PÁGINA INSTITUCIONAL — "Edições" (experiência de tela cheia, redesign 2026).
 * Spec: design_handoff_site_institucional/README.md (§ "Edições — experiência de
 * tela cheia") + protótipo Edicoes.dc.html. Estilos em src/styles/scw-edicoes.css.
 *
 * Desktop: cena de 100vh. Metade direita = mosaico de 3 fotos sangrando (uma
 * larga em cima, duas embaixo, filete de 3px). Metade esquerda = rótulo, tema,
 * frase, meta (período / marcas / Sweet Awards) e dois botões que abrem painéis
 * flutuantes de participantes e curiosidades. Fundo = foto do combo desfocada
 * (blur 64px) sob véu chocolate a 87%, com deriva lenta de 46s. Rodapé com a
 * trilha das 16 edições (dots + anos), setas e barra de progresso. Navega por
 * setas do teclado, clique na trilha e arraste.
 *
 * Mobile: capítulo vertical (capa 4:5 com tema + mosaico 1:1 + dados +
 * palavras-chave + sanfonas de marcas e curiosidades) e três peças de
 * navegação: régua de anos fixa na base, setas laterais metade fora da tela e
 * `disabled` (não só opacity) na seta sem destino.
 *
 * Casca: em Edições o App.jsx NÃO renderiza header, barra de 5px nem rodapé — a
 * página traz cabeçalho próprio com a mesma geometria (mesmo --scw-trilho,
 * mesmo padding:50px vertical, marca da edição no slot da logo), pra o menu não
 * mudar de lugar entre páginas. A tab bar mobile continua montada por fora: o
 * deslocamento da régua e do conteúdo vive em UMA variável CSS
 * (--scw-edx-abas), zerada pelo modificador `.scw-edx--solta` quando a página é
 * aberta sozinha (prop `embutido`) — nunca um literal espalhado.
 *
 * Dados (regra: NÃO inventar): src/data/handoff/edicoesData.js (período,
 * participantes, curiosidades, premiação, preço, fotos) e editionMark() para a
 * marca da edição — o resolvedor do repo, porque o campo `logo` do handoff
 * aponta pra /images/editions/<code>.png, que não existe no acervo (os arquivos
 * reais são /images/editions/<code>/logo.png). Onde falta foto ou marca, fica
 * reserva editorial honesta. Texto editorial das cenas (tema, rótulo, frase,
 * palavras-chave) vem do handoff de design, transcrito abaixo.
 */
import React from 'react'
import '../../styles/scw-edicoes.css'
import { EDICOES_DADOS } from '../../data/handoff/edicoesData'
import { editionMark } from '../../data/editionAssets'
import { NAV_LINKS, pageColor, ChaveIcon } from '../../components/nav'

// Texto editorial das 16 cenas (handoff de design — não inventar nem alterar).
const EDS = [
  { code: '2016', tema: 'S&C / Início', etapa: 'A estreia',
    lead: 'Idealizado pela jornalista Eline Eulália: um circuito de marcas locais, combo a preço único e um hábito novo — sair pela cidade para descobrir.',
    palavras: ['Xícara', 'Vitrine', 'Bolo', 'Balcão de cafeteria'] },
  { code: '2017.1', tema: 'Páscoa', etapa: 'Chocolate e presente',
    lead: 'Chocolate, ovos e os símbolos pascais como ponto de partida — a data ganhou roteiro, descoberta e experimentação.',
    palavras: ['Ovos', 'Coelhos', 'Chocolate derretido', 'Cestas'] },
  { code: '2017.2', tema: 'Doces do Mundo', etapa: 'Viagem gastronômica',
    lead: 'Países, culturas e sobremesas internacionais como inspiração: cada combo abria a chance de viajar sem sair de Natal.',
    palavras: ['Globo', 'Mala', 'Passaporte', 'Mapas'] },
  { code: '2018.1', tema: 'Namorados', etapa: 'Afeto à mesa',
    lead: 'Combos pensados para dividir ou presentear, com chocolate, morango e cafés especiais — o festival virou programa a dois.',
    palavras: ['Corações', 'Mesa para dois', 'Envelopes', 'Fitas'] },
  { code: '2018.2', tema: 'Sabores da Infância', etapa: 'Memória afetiva',
    lead: 'Lanche da escola, bolo de vó, festa infantil: a nostalgia entrou como ingrediente principal de cada criação.',
    palavras: ['Lancheira', 'Pirulito', 'Brinquedos', 'Bolo de vó'] },
  { code: '2019.1', tema: 'Pâtisserie Francesa', etapa: 'Técnica e elegância',
    lead: 'Massas, cremes, folhados, macarons e éclairs: a tradição francesa elevou o padrão técnico e visual das criações.',
    palavras: ['Croissant', 'Éclair', 'Macaron', 'Vitrine francesa'] },
  { code: '2019.2', tema: 'Contos de Fadas', etapa: 'Imaginação',
    lead: 'Castelos, poções e histórias clássicas: as lojas viraram cenário e cada combo, capítulo de uma narrativa encantada.',
    palavras: ['Castelos', 'Coroas', 'Livros mágicos', 'Estrelas'] },
  { code: '2020.1', tema: 'No Ritmo da Música', etapa: 'Trilha sonora',
    lead: 'Gêneros, artistas e canções virando receita. No auge da pandemia, manteve as marcas visíveis e o público ligado ao comércio local.',
    palavras: ['Vinil', 'Microfone', 'Notas musicais', 'Palco'] },
  { code: '2020.2', tema: 'Heróis & Vilões', etapa: 'Cultura pop',
    lead: 'Cultura pop no centro da mesa: doce e amargo, claro e escuro, nomes impactantes e sabores mais ousados.',
    palavras: ['Máscaras', 'Capas', 'Raios', 'Emblemas'] },
  { code: '2021.1', tema: 'Séries', etapa: 'Maratona de sabores',
    lead: 'Comfort food, pipoca e café de maratona: o hábito de acompanhar temporadas virou território criativo.',
    palavras: ['Tela', 'Botão play', 'Sofá', 'Pipoca'] },
  { code: '2021.2', tema: 'Terras Potiguares', etapa: 'Identidade local',
    lead: 'Castanha de caju, mel de Jandaíra e queijos artesanais no centro da criação, em parceria com o Sebrae-RN e produtores potiguares.',
    palavras: ['Caju', 'Castanha', 'Queijo coalho', 'Dunas'] },
  { code: '2022', tema: 'Movies', etapa: 'Cinema',
    lead: 'Filmes, cenas marcantes e tapete vermelho: cada loja criou a sua sessão e o festival virou um cinema espalhado pela cidade.',
    palavras: ['Claquete', 'Ingresso', 'Projetor', 'Rolo de filme'] },
  { code: '2023', tema: 'Trip', etapa: 'Rota pelo mundo',
    lead: 'Uma volta ao mundo pelo sabor: 32 endereços de Natal e Parnamirim escolheram um destino e o público montou o próprio percurso.',
    palavras: ['Mala', 'Avião', 'Bússola', 'Postal'] },
  { code: '2024', tema: 'Books', etapa: 'Literatura e café',
    lead: 'A Livraria da Doçura: 29 combos em que o nome era o título, os ingredientes o enredo e a apresentação, o cenário.',
    palavras: ['Livro aberto', 'Marcador', 'Pena', 'Biblioteca'] },
  { code: '2025', tema: 'Celebration', etapa: 'Festa e rito',
    lead: 'Carnaval, São João, aniversários e premiações: 26 estabelecimentos transformaram o gesto de celebrar em combo.',
    palavras: ['Confete', 'Balões', 'Convite', 'Bandeirinhas'] },
  { code: '2026.1', tema: 'Lovers', etapa: 'Especial 10 anos',
    lead: 'Feito de amor, recriando sabores: dez anos com os Sweet Lovers no centro e temas antigos recriados por cada marca.',
    palavras: ['Stickers', 'Mapa', 'Câmera', 'Corações'] },
]
const TOTAL = EDS.length

/* Acento por edição, rodando pela paleta oficial. Cada tom carrega a tinta que
   passa AA SOBRE ele (vinho e magenta pedem creme; cyan e amarelo pedem
   chocolate) e a cor que ele pode assumir como TEXTO sobre o chocolate — ali
   vinho e magenta não chegam a 4,5:1, então caem no creme. */
const TONS = [
  { cor: 'var(--scw-vinho)',   tinta: 'var(--scw-creme)', txt: 'var(--scw-creme)' },
  { cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)', txt: 'var(--scw-creme)' },
  { cor: 'var(--scw-cyan)',    tinta: 'var(--scw-choco)', txt: 'var(--scw-cyan)' },
  { cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)', txt: 'var(--scw-amarelo)' },
]

const PREMIACAO = {
  'nao-teve': 'Sem premiação',
  'nao-encontrada': 'Não encontrada no acervo',
  completa: 'Premiação registrada',
  completa_em_publicacoes_oficiais: 'Premiação registrada',
  parcial: 'Premiação parcial',
}

const SEM_DADOS = { periodo: '', n: null, participantes: [], curiosidades: [], premiacao: null, fotos: [], preco: '' }
const pad2 = (n) => String(n).padStart(2, '0')

const SetaEsq = (p) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...p}>
    <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const SetaDir = (p) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Chevron = (p) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...p}>
    <path d="M4 6.5l4 4 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const XisFechar = (p) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...p}>
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const Mais = (p) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...p}>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

// Fundo só quando o arquivo existe no acervo (nunca url("none")).
const fundo = (src) => (src ? { backgroundImage: `url("${src}")` } : undefined)

export function EdicoesPage({ navigate, embutido = true, onOpenAccess, accessOpen }) {
  const [i, setI] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const [painel, setPainel] = React.useState(null)   // 'participantes' | 'curiosidades' | null
  const [estreito, setEstreito] = React.useState(false)

  const e = EDS[i]
  const d = EDICOES_DADOS[e.code] || SEM_DADOS
  const marca = editionMark(e.code)
  const tom = TONS[i % TONS.length]
  const fotos = d.fotos || []
  const curiosidades = d.curiosidades || []
  const participantes = d.participantes || []
  const nParticipantes = d.n != null ? d.n : '—'
  const premiacao = PREMIACAO[d.premiacao] || 'A conferir'

  const vaiPara = React.useCallback((k) => {
    setI((atual) => {
      const alvo = Math.min(TOTAL - 1, Math.max(0, k))
      if (alvo !== atual) setDir(alvo < atual ? -1 : 1)
      return alvo
    })
    setPainel(null)
  }, [])

  const passo = React.useCallback((delta) => {
    setI((atual) => Math.min(TOTAL - 1, Math.max(0, atual + delta)))
    setDir(delta < 0 ? -1 : 1)
    setPainel(null)
  }, [])

  // ---- modo estreito: mesma quebra da casca do site (900px) ---------------
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 900px)')
    const avaliar = () => setEstreito(mq.matches)
    avaliar()
    mq.addEventListener('change', avaliar)
    return () => mq.removeEventListener('change', avaliar)
  }, [])

  // ---- teclado: setas, PageUp/Down, Home/End; Esc fecha o painel -----------
  React.useEffect(() => {
    const aoTeclar = (ev) => {
      if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return
      if (ev.key === 'Escape') { setPainel(null); return }
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { ev.preventDefault(); passo(1) }
      else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { ev.preventDefault(); passo(-1) }
      else if (ev.key === 'Home') { ev.preventDefault(); vaiPara(0) }
      else if (ev.key === 'End') { ev.preventDefault(); vaiPara(TOTAL - 1) }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [passo, vaiPara])

  /* ---- performance -------------------------------------------------------
     Só a cena em foco existe no DOM: montar 16 cenas de viewport inteiro de uma
     vez congela o compositor (era o gargalo da versão anterior desta página,
     resolvido lá com janela live/near). Aqui a janela é de 1 cena; pra a troca
     não piscar, as fotos das cenas vizinhas são aquecidas no cache — 6 imagens,
     sem nó no DOM. */
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    ;[i - 1, i + 1].forEach((k) => {
      const viz = EDS[k]
      if (!viz) return
      const dv = EDICOES_DADOS[viz.code]
      ;(dv ? dv.fotos || [] : []).slice(0, 3).forEach((src) => { const img = new Image(); img.src = src })
    })
  }, [i])

  // ---- arraste (mouse e toque, via pointer events) ------------------------
  const arraste = React.useRef(null)
  const gestos = {
    onPointerDown: (ev) => { arraste.current = { x: ev.clientX, y: ev.clientY } },
    onPointerUp: (ev) => {
      const a = arraste.current
      arraste.current = null
      if (!a) return
      const dx = ev.clientX - a.x
      const dy = ev.clientY - a.y
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy)) passo(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => { arraste.current = null },
  }

  // ---- foco dos painéis (abre no fechar, volta ao gatilho) ----------------
  const btnParticipantes = React.useRef(null)
  const btnCuriosidades = React.useRef(null)
  const fecharRef = React.useRef(null)
  const gatilho = React.useRef(null)
  React.useEffect(() => {
    if (painel) {
      gatilho.current = painel === 'participantes' ? btnParticipantes.current : btnCuriosidades.current
      if (fecharRef.current) fecharRef.current.focus()
    } else if (gatilho.current) {
      gatilho.current.focus()
      gatilho.current = null
    }
  }, [painel])

  // ---- régua mobile: rola e centraliza no ano ativo -----------------------
  const reguaRef = React.useRef(null)
  React.useEffect(() => {
    const trilho = reguaRef.current
    if (!trilho) return
    const alvo = trilho.children[i]
    if (!alvo) return
    const suave = typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    trilho.scrollTo({
      left: Math.max(0, alvo.offsetLeft - (trilho.clientWidth - alvo.offsetWidth) / 2),
      behavior: suave ? 'smooth' : 'auto',
    })
  }, [i, estreito])

  const ir = (href) => (ev) => {
    ev.preventDefault()
    navigate(href.replace('#', ''))
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const raiz = ['scw-edx', dir < 0 ? 'is-tras' : '', embutido ? '' : 'scw-edx--solta']
    .filter(Boolean).join(' ')

  const tokens = {
    '--scw-edx-tom': tom.cor,
    '--scw-edx-tinta': tom.tinta,
    '--scw-edx-tom-txt': tom.txt,
    '--scw-edx-prog': `${((i + 0.5) / TOTAL) * 100}%`,
    '--scw-edx-prog-n': (i + 0.5) / TOTAL,
  }

  const fotoAlt = `Registro da edição ${e.tema} do Sweet & Coffee Week`
  const marcaAlt = `Marca da edição ${e.tema}`
  const anuncio = `Edição ${pad2(i + 1)} de ${pad2(TOTAL)}: ${e.tema}, ${e.code}`

  const meta = (
    <>
      <div><dt>Período</dt><dd>{d.periodo || 'período não encontrado'}</dd></div>
      <div><dt>Marcas</dt><dd>{nParticipantes} participantes</dd></div>
      <div><dt>Sweet Awards</dt><dd>{premiacao}</dd></div>
      {d.preco ? <div><dt>Combo</dt><dd>{d.preco}</dd></div> : null}
    </>
  )

  const listaMarcas = participantes.length
    ? participantes.map((p) => <li key={p}><span className="scw-edx__ponto" aria-hidden="true" />{p}</li>)
    : <li>Lista de participantes pendente no acervo.</li>

  /* ============================ MOBILE ================================== */
  if (estreito) {
    return (
      <div className={raiz} style={tokens}>
        <p className="scw-edx__sr" aria-live="polite">{anuncio}</p>

        <section className="scw-edx-mob" aria-label="Edições do Sweet &amp; Coffee Week">
          <div className="scw-edx-mob__conteudo" {...gestos}>
            {/* capa 4:5 — key por edição reinicia wipe + ken burns */}
            <div className="scw-edx-mob__capa" key={`capa-${e.code}`}>
              {fotos[0]
                ? <span className="scw-edx-mob__capa-foto" style={fundo(fotos[0])} role="img" aria-label={fotoAlt} />
                : <span className="scw-edx__reserva">Foto pendente no acervo</span>}
              <span className="scw-edx-mob__capa-topo" aria-hidden="true" />
              <span className="scw-edx-mob__capa-base" aria-hidden="true" />

              <div className="scw-edx-mob__cab">
                {marca.logo
                  ? <img className="scw-edx-mob__marca" src={marca.logo} alt={marcaAlt} decoding="async" />
                  : <span className="scw-edx-mob__marca-reserva">Marca pendente</span>}
                <span className="scw-edx-mob__contagem" aria-hidden="true">
                  <b>{pad2(i + 1)}</b><span>/{pad2(TOTAL)}</span>
                </span>
              </div>

              <div className="scw-edx-mob__titulo">
                <span className="scw-edx-mob__rotulo">{e.etapa}</span>
                <h1 className="scw-edx-mob__tema">{e.tema}</h1>
              </div>
            </div>

            {/* mosaico de 2 fotos 1:1 */}
            <div className="scw-edx-mob__par" key={`par-${e.code}`}>
              <figure>
                {fotos[1]
                  ? <span className="scw-edx-mob__capa-foto" style={fundo(fotos[1])} role="img" aria-label={fotoAlt} />
                  : <span className="scw-edx__reserva">Foto pendente</span>}
              </figure>
              <figure>
                {fotos[2]
                  ? <span className="scw-edx-mob__capa-foto" style={fundo(fotos[2])} role="img" aria-label={fotoAlt} />
                  : <span className="scw-edx__reserva">Foto pendente</span>}
              </figure>
            </div>

            <div className="scw-edx-mob__corpo">
              <p className="scw-edx-mob__lead" key={`lead-${e.code}`}>{e.lead}</p>

              <dl className="scw-edx-mob__meta">{meta}</dl>

              <ul className="scw-edx-mob__palavras">
                {e.palavras.map((p) => <li key={p}>{p}</li>)}
              </ul>

              <button
                type="button"
                className="scw-edx-mob__sanfona"
                aria-expanded={painel === 'participantes'}
                aria-controls="scw-edx-marcas"
                onClick={() => setPainel((p) => (p === 'participantes' ? null : 'participantes'))}
              >
                <span>Ver as {nParticipantes} marcas</span>
                <span className="scw-edx-mob__chevron"><Chevron width={15} height={15} /></span>
              </button>
              {painel === 'participantes' && (
                <ul className="scw-edx-mob__lista" id="scw-edx-marcas">{listaMarcas}</ul>
              )}

              {curiosidades.length > 0 && (
                <button
                  type="button"
                  className="scw-edx-mob__sanfona scw-edx-mob__sanfona--vazada"
                  aria-expanded={painel === 'curiosidades'}
                  aria-controls="scw-edx-curios"
                  onClick={() => setPainel((p) => (p === 'curiosidades' ? null : 'curiosidades'))}
                >
                  <span>Curiosidades desta edição · {curiosidades.length}</span>
                  <span className="scw-edx-mob__chevron"><Chevron width={15} height={15} /></span>
                </button>
              )}
              {painel === 'curiosidades' && (
                <ul className="scw-edx-mob__curios" id="scw-edx-curios">
                  {curiosidades.map((c) => (
                    <li key={c.t}>
                      <b>{c.t}</b>
                      <span>{c.x}</span>
                      {c.v ? <em>{c.v}</em> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* peça 1 — régua de anos fixa na base, acima da tab bar do site */}
          <nav className="scw-edx-mob__regua" aria-label="Linha do tempo das edições">
            <div className="scw-edx-mob__regua-topo">
              <span className="scw-edx-mob__regua-code"><b>{e.code}</b><span>{e.tema}</span></span>
              <span className="scw-edx-mob__regua-rot">linha do tempo</span>
            </div>
            {/* progresso por scaleX com origem à esquerda e SEM transition em
                width/transform (travava o valor no meio do caminho) */}
            <div className="scw-edx-mob__regua-barra" aria-hidden="true">
              <span style={{ transform: `scaleX(${TOTAL > 1 ? i / (TOTAL - 1) : 0})` }} />
            </div>
            <div className="scw-edx-mob__regua-anos" ref={reguaRef}>
              {EDS.map((ed, k) => (
                <button
                  type="button"
                  key={ed.code}
                  className={`scw-edx-mob__ano${k === i ? ' is-ativo' : ''}${k < i ? ' is-visto' : ''}`}
                  aria-label={`${ed.code} — ${ed.tema}`}
                  aria-current={k === i ? 'true' : undefined}
                  onClick={() => vaiPara(k)}
                >
                  <span className="scw-edx-mob__ano-tick" aria-hidden="true" />
                  <span className="scw-edx-mob__ano-rot">{ed.code}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* peças 2 e 3 — setas laterais metade fora da tela; nos extremos a
              seta sem destino recebe `disabled` e sai da tabulação */}
          <button
            type="button"
            className="scw-edx-mob__seta scw-edx-mob__seta--ant"
            disabled={i === 0}
            aria-label={i > 0 ? `Edição anterior: ${EDS[i - 1].tema}` : 'Esta é a primeira edição'}
            onClick={() => passo(-1)}
          >
            <SetaEsq width={20} height={20} />
          </button>
          <button
            type="button"
            className="scw-edx-mob__seta scw-edx-mob__seta--prox"
            disabled={i === TOTAL - 1}
            aria-label={i < TOTAL - 1 ? `Próxima edição: ${EDS[i + 1].tema}` : 'Esta é a última edição'}
            onClick={() => passo(1)}
          >
            <SetaDir width={20} height={20} />
          </button>
        </section>
      </div>
    )
  }

  /* ============================ DESKTOP ================================= */
  return (
    <div className={raiz} style={tokens}>
      <p className="scw-edx__sr" aria-live="polite">{anuncio}</p>

      <section
        className="scw-edx__palco"
        aria-roledescription="apresentação"
        aria-label="Edições do Sweet &amp; Coffee Week"
      >
        {/* key por edição: remonta a cena e reinicia wipe, ken burns e entradas */}
        <div className="scw-edx__cena" key={e.code} {...gestos}>
          {/* fundo: combo desfocado (blur 64px) sob véu chocolate a 87% */}
          <div className="scw-edx__fundo" aria-hidden="true">
            {(fotos[1] || fotos[0]) && (
              <span className="scw-edx__fundo-foto" style={fundo(fotos[1] || fotos[0])} />
            )}
            <span className="scw-edx__veu" />
          </div>

          {/* mosaico de 3 fotos sangrando na metade direita */}
          <div className="scw-edx__mosaico">
            <figure className="scw-edx__quadro scw-edx__quadro--largo">
              {fotos[0]
                ? <span className="scw-edx__foto" style={fundo(fotos[0])} role="img" aria-label={fotoAlt} />
                : <span className="scw-edx__reserva">Foto pendente no acervo</span>}
              <span className="scw-edx__topo-scrim" aria-hidden="true" />
            </figure>
            <figure className="scw-edx__quadro">
              {fotos[1]
                ? <span className="scw-edx__foto" style={fundo(fotos[1])} role="img" aria-label={fotoAlt} />
                : <span className="scw-edx__reserva">Foto pendente</span>}
            </figure>
            <figure className="scw-edx__quadro">
              {fotos[2]
                ? <span className="scw-edx__foto" style={fundo(fotos[2])} role="img" aria-label={fotoAlt} />
                : <span className="scw-edx__reserva">Foto pendente</span>}
            </figure>
            <span className="scw-edx__acervo">Acervo · {e.code}</span>
          </div>

          {/* cabeçalho próprio — mesma geometria da casca (trilho + 50px) */}
          <header className="scw-edx__cab">
            <div className="scw-edx__cab-linha">
              <span className="scw-edx__marca">
                {marca.logo
                  ? <img className="scw-edx__marca-img" src={marca.logo} alt={marcaAlt} decoding="async" />
                  : <span className="scw-edx__marca-reserva">Marca pendente</span>}
                <span className="scw-edx__marca-txt">
                  <b className="scw-edx__marca-tema">{e.tema}</b>
                  <span className="scw-edx__marca-code">{e.code} · edição {pad2(i + 1)}</span>
                </span>
              </span>

              <nav className="scw-nav" aria-label="Navegação principal">
                {NAV_LINKS.map((l) => {
                  const ativo = l.id === 'edicoes'
                  const c = pageColor(l.id)
                  return (
                    <a
                      key={l.id}
                      href={l.href}
                      className={ativo ? 'is-ativo' : undefined}
                      aria-current={ativo ? 'page' : undefined}
                      onClick={ativo ? (ev) => ev.preventDefault() : ir(l.href)}
                      style={{ '--scw-nav-cor': c.menu, '--scw-nav-tinta': c.tinta }}
                    >
                      {l.label}
                    </a>
                  )
                })}
              </nav>

              {/* O cabeçalho do site não é renderizado nesta rota, então o botão de
                  acesso vive aqui — o gatilho do diálogo vem do App por prop. */}
              {onOpenAccess && (
                <button
                  type="button"
                  className="scw-acesso-topo"
                  onClick={onOpenAccess}
                  aria-haspopup="dialog"
                  aria-expanded={!!accessOpen}
                  aria-label="Acessar área restrita"
                >
                  <ChaveIcon />
                </button>
              )}
            </div>
          </header>

          {/* coluna editorial (metade esquerda) */}
          <div className="scw-edx__coluna">
            <span className="scw-edx__rotulo">{e.etapa}</span>
            <h1 className="scw-edx__tema">{e.tema}</h1>
            <p className="scw-edx__lead">{e.lead}</p>
            <dl className="scw-edx__meta">{meta}</dl>

            <div className="scw-edx__acoes">
              <button
                type="button"
                ref={btnParticipantes}
                className="scw-edx__botao"
                aria-expanded={painel === 'participantes'}
                aria-controls="scw-edx-painel"
                onClick={() => setPainel((p) => (p === 'participantes' ? null : 'participantes'))}
              >
                Ver participantes · {nParticipantes}
                <SetaDir width={15} height={15} />
              </button>
              {curiosidades.length > 0 && (
                <button
                  type="button"
                  ref={btnCuriosidades}
                  className="scw-edx__botao scw-edx__botao--vazado"
                  aria-expanded={painel === 'curiosidades'}
                  aria-controls="scw-edx-painel"
                  onClick={() => setPainel((p) => (p === 'curiosidades' ? null : 'curiosidades'))}
                >
                  Curiosidades · {curiosidades.length}
                  <Mais width={15} height={15} />
                </button>
              )}
            </div>
          </div>

          {/* painéis flutuantes */}
          {painel === 'participantes' && (
            <aside
              className="scw-edx__painel scw-edx__painel--claro"
              id="scw-edx-painel"
              role="region"
              aria-label={`Participantes da edição ${e.tema}`}
              onKeyDown={(ev) => { if (ev.key === 'Escape') setPainel(null) }}
            >
              <div className="scw-edx__painel-topo">
                <div>
                  <span className="scw-edx__painel-rot">Participantes · {e.code}</span>
                  <b className="scw-edx__painel-t">{nParticipantes} marcas na rota de {e.tema}</b>
                </div>
                <button type="button" ref={fecharRef} className="scw-edx__fechar" aria-label="Fechar" onClick={() => setPainel(null)}>
                  <XisFechar width={15} height={15} />
                </button>
              </div>
              <ul className="scw-edx__marcas">{listaMarcas}</ul>
            </aside>
          )}

          {painel === 'curiosidades' && (
            <aside
              className="scw-edx__painel scw-edx__painel--escuro"
              id="scw-edx-painel"
              role="region"
              aria-label={`Curiosidades da edição ${e.tema}`}
              onKeyDown={(ev) => { if (ev.key === 'Escape') setPainel(null) }}
            >
              <div className="scw-edx__painel-topo">
                <span className="scw-edx__painel-rot">Curiosidades desta edição</span>
                <button type="button" ref={fecharRef} className="scw-edx__fechar" aria-label="Fechar" onClick={() => setPainel(null)}>
                  <XisFechar width={15} height={15} />
                </button>
              </div>
              <ul className="scw-edx__curios">
                {curiosidades.map((c) => (
                  <li key={c.t}>
                    <b>{c.t}</b>
                    <span className="scw-edx__curios-x">{c.x}</span>
                    {c.v ? <span className="scw-edx__curios-v">{c.v}</span> : null}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        {/* rodapé: trilha das 16 edições (dots + anos), setas e progresso */}
        <footer className="scw-edx__rodape">
          <div className="scw-edx__rodape-linha">
            <button
              type="button"
              className="scw-edx__seta"
              disabled={i === 0}
              aria-label={i > 0 ? `Edição anterior: ${EDS[i - 1].tema}` : 'Esta é a primeira edição'}
              onClick={() => passo(-1)}
            >
              <SetaEsq width={17} height={17} />
            </button>

            <div className="scw-edx__trilha">
              <span className="scw-edx__trilho" aria-hidden="true" />
              <span className="scw-edx__brilho" aria-hidden="true" />
              <span className="scw-edx__progresso" aria-hidden="true" />
              <span className="scw-edx__cursor" aria-hidden="true" />
              <span className="scw-edx__cursor-anel" aria-hidden="true" />
              {EDS.map((ed, k) => (
                <button
                  type="button"
                  key={ed.code}
                  className={`scw-edx__ano${k === i ? ' is-ativo' : ''}`}
                  aria-label={`${ed.code} — ${ed.tema}`}
                  aria-current={k === i ? 'true' : undefined}
                  onClick={() => vaiPara(k)}
                >
                  <span className="scw-edx__ano-tick" aria-hidden="true" />
                  <span className="scw-edx__ano-rot">{ed.code}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="scw-edx__seta scw-edx__seta--proxima"
              disabled={i === TOTAL - 1}
              aria-label={i < TOTAL - 1 ? `Próxima edição: ${EDS[i + 1].tema}` : 'Esta é a última edição'}
              onClick={() => passo(1)}
            >
              <SetaDir width={17} height={17} />
            </button>
          </div>

          <div className="scw-edx__rodape-legenda">
            <span className="scw-edx__rodape-atual">{pad2(i + 1)} · {e.tema}</span>
            <span className="scw-edx__rodape-dica">setas do teclado, clique na trilha ou arraste para navegar</span>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default EdicoesPage
