/*
 * PÁGINA INSTITUCIONAL — "Edições" (experiência de tela cheia, redesign 2026).
 * Spec: design_handoff_site_institucional/README.md (§ "Edições — experiência de
 * tela cheia") + protótipo Edicoes.dc.html. Estilos em src/styles/scw-edicoes.css.
 *
 * Desktop: cena de 100vh. Metade direita = mosaico de 3 fotos sangrando (uma
 * larga em cima, duas embaixo, filete de 3px) que agora é um CARROSSEL do
 * acervo inteiro da edição — 11 a 12 fotos, em páginas de 3 (ver <Galeria>).
 * Metade esquerda = rótulo, tema, frase, meta (período / marcas / Sweet Awards)
 * e dois botões que abrem painéis flutuantes de participantes e curiosidades.
 * Fundo = foto do acervo desfocada (blur 64px) sob véu chocolate a 87%, com
 * deriva lenta de 46s. Rodapé com a trilha das 16 edições (dots + anos), setas
 * e barra de progresso. Navega por setas do teclado, clique na trilha e arraste.
 *
 * Mobile: capítulo vertical (capa 4:5 com tema + carrossel do restante do
 * acervo em pares 1:1 + dados + palavras-chave + sanfonas de marcas e do texto
 * editorial) e três peças de navegação: régua de anos fixa na base, setas
 * laterais metade fora da tela e `disabled` (não só opacity) na seta sem
 * destino.
 *
 * Fotografia: TODA foto vem do sistema central `src/data/imageLibrary.js`
 * (`editionPhotos` / `bgStyle`) — caminho de imagem não se escreve à mão aqui,
 * e o alt e o ponto focal (`position`) já vêm prontos por foto. O acervo NÃO
 * identifica qual foto é de qual participante nas edições de 2016 a 2025: a
 * galeria mostra o registro da edição, e a lista de marcas segue textual.
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
 * participantes, curiosidades, premiação, fotos) e editionMark() para a marca
 * da edição — editionMark() é o resolvedor oficial do repo. (O campo `logo` do
 * handoff apontava pra /images/editions/<code>.png, caminho que nunca existiu;
 * corrigido em jul/2026 para /images/marcas-edicoes/<code>/logo.png. O campo
 * segue sem ser lido: quem manda é editionMark().) Onde falta foto ou marca,
 * fica reserva editorial honesta.
 *
 * TEXTO: o `lead` de cada cena e os três blocos do painel editorial (marco,
 * curiosidade, legado) vêm de src/data/edicoesNarrativa.js — fonte única, não
 * duplicar aqui. Do handoff de design ficam só tema, etapa e palavras-chave.
 * PREÇO não aparece na página (decisão do Wilke, jul/2026): nem a linha "Combo"
 * da ficha, nem as curiosidades que só contam o valor do combo.
 */
import React from 'react'
import '../../styles/scw-edicoes.css'
import { EDICOES_DADOS } from '../../data/handoff/edicoesData'
import { EDICOES_NARRATIVA, ABERTURA } from '../../data/edicoesNarrativa'
import { editionPhotos, bgStyle } from '../../data/imageLibrary'
import { editionMark } from '../../data/editionAssets'
import { NAV_LINKS, pageColor, ChaveIcon } from '../../components/nav'

// Identidade das 16 cenas (handoff de design). A frase de abertura NÃO mora
// aqui — vem de EDICOES_NARRATIVA[code].lead.
const EDS = [
  { code: '2016', tema: 'S&C / Início', etapa: 'A estreia',
    palavras: ['Xícara', 'Vitrine', 'Bolo', 'Balcão de cafeteria'] },
  { code: '2017.1', tema: 'Páscoa', etapa: 'Chocolate e presente',
    palavras: ['Ovos', 'Coelhos', 'Chocolate derretido', 'Cestas'] },
  { code: '2017.2', tema: 'Doces do Mundo', etapa: 'Viagem gastronômica',
    palavras: ['Globo', 'Mala', 'Passaporte', 'Mapas'] },
  { code: '2018.1', tema: 'Namorados', etapa: 'Afeto à mesa',
    palavras: ['Corações', 'Mesa para dois', 'Envelopes', 'Fitas'] },
  { code: '2018.2', tema: 'Sabores da Infância', etapa: 'Memória afetiva',
    palavras: ['Lancheira', 'Pirulito', 'Brinquedos', 'Bolo de vó'] },
  { code: '2019.1', tema: 'Pâtisserie Francesa', etapa: 'Técnica e elegância',
    palavras: ['Croissant', 'Éclair', 'Macaron', 'Vitrine francesa'] },
  { code: '2019.2', tema: 'Contos de Fadas', etapa: 'Imaginação',
    palavras: ['Castelos', 'Coroas', 'Livros mágicos', 'Estrelas'] },
  { code: '2020.1', tema: 'No Ritmo da Música', etapa: 'Trilha sonora',
    palavras: ['Vinil', 'Microfone', 'Notas musicais', 'Palco'] },
  { code: '2020.2', tema: 'Heróis & Vilões', etapa: 'Cultura pop',
    palavras: ['Máscaras', 'Capas', 'Raios', 'Emblemas'] },
  { code: '2021.1', tema: 'Séries', etapa: 'Maratona de sabores',
    palavras: ['Tela', 'Botão play', 'Sofá', 'Pipoca'] },
  { code: '2021.2', tema: 'Terras Potiguares', etapa: 'Identidade local',
    palavras: ['Caju', 'Castanha', 'Queijo coalho', 'Dunas'] },
  { code: '2022', tema: 'Movies', etapa: 'Cinema',
    palavras: ['Claquete', 'Ingresso', 'Projetor', 'Rolo de filme'] },
  { code: '2023', tema: 'Trip', etapa: 'Rota pelo mundo',
    palavras: ['Mala', 'Avião', 'Bússola', 'Postal'] },
  { code: '2024', tema: 'Books', etapa: 'Literatura e café',
    palavras: ['Livro aberto', 'Marcador', 'Pena', 'Biblioteca'] },
  { code: '2025', tema: 'Celebration', etapa: 'Festa e rito',
    palavras: ['Confete', 'Balões', 'Convite', 'Bandeirinhas'] },
  { code: '2026.1', tema: 'Lovers', etapa: 'Especial 10 anos',
    palavras: ['Stickers', 'Mapa', 'Câmera', 'Corações'] },
]
const TOTAL = EDS.length

/* Acento por edição, rodando pela paleta oficial. Cada tom carrega a tinta que
   passa AA SOBRE ele (roxo e magenta pedem creme; cyan e amarelo pedem
   chocolate) e a cor que ele pode assumir como TEXTO sobre o chocolate — ali
   roxo e magenta não chegam a 4,5:1, então caem no creme. */
const TONS = [
  { cor: 'var(--scw-roxo)',    tinta: 'var(--scw-creme)', txt: 'var(--scw-creme)' },
  { cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)', txt: 'var(--scw-creme)' },
  { cor: 'var(--scw-cyan)',    tinta: 'var(--scw-choco)', txt: 'var(--scw-cyan)' },
  { cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)', txt: 'var(--scw-amarelo)' },
]

const PREMIACAO = {
  'nao-teve': 'Sem premiação',
  'nao-encontrada': 'Sem registro disponível',
  completa: 'Premiação registrada',
  completa_em_publicacoes_oficiais: 'Premiação registrada',
  parcial: 'Premiação parcial',
}

const SEM_DADOS = { periodo: '', n: null, participantes: [], curiosidades: [], premiacao: null, fotos: [] }
const pad2 = (n) => String(n).padStart(2, '0')

/* Preço fora da página: as curiosidades que só contam o valor do combo saem da
   lista (o valor mora no campo `v`, e o `x` dessas repete o mesmo número). Nada
   é apagado em src/data — só deixa de ser exibido. */
const semPreco = (c) => !/R\$/.test(`${c.x || ''} ${c.v || ''}`)

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

/* ============================================================================
   GALERIA DA EDIÇÃO — carrossel do acervo completo
   ----------------------------------------------------------------------------
   Cada edição tem 11 ou 12 fotos no acervo; antes a cena mostrava 3. Aqui as
   fotos entram TODAS, na ordem do acervo, em páginas do tamanho do mosaico
   (3 no desktop, 2 no par do mobile). Regras:

   - transição curta (320ms) só em opacity + `translate`/`scale` (propriedades
     independentes, pra o deslize não brigar com o ken burns no `transform`);
   - a foto seguinte entra POR CIMA e a anterior fica embaixo até o fim do
     crossfade — nunca cai a tela pro fundo do quadro;
   - a última página é ancorada no fim (`n - porPagina`), então o mosaico nunca
     aparece com buraco quando o total não é múltiplo da página;
   - giro automático de 6s que pausa no hover e no foco e PARA de vez assim que
     alguém navega na mão (não volta a girar por cima de quem está olhando);
   - `prefers-reduced-motion`: sem giro e sem animação, navegação intacta.
   ========================================================================= */

const GIRO = 6000

/** Quebra a lista em páginas do tamanho do mosaico, ancorando a última no fim. */
function paginasDe(fotos, porPagina) {
  const n = fotos.length
  if (!n) return []
  const passo = Math.max(1, porPagina)
  const total = Math.ceil(n / passo)
  return Array.from({ length: total }, (_, k) => {
    const inicio = Math.max(0, Math.min(k * passo, n - passo))
    return fotos.slice(inicio, inicio + passo)
  })
}

function useSemMovimento() {
  const [reduz, setReduz] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const avaliar = () => setReduz(mq.matches)
    avaliar()
    mq.addEventListener('change', avaliar)
    return () => mq.removeEventListener('change', avaliar)
  }, [])
  return reduz
}

/* Um quadro do mosaico. Guarda a foto anterior enquanto a nova entra, pra a
   troca não piscar: a que sai fica embaixo (ref no render + estado com prazo,
   porque só o ref sumiria no primeiro re-render alheio). */
function Quadro({ foto, classe = '', eager = false, children = null }) {
  const anterior = React.useRef(null)
  const [residual, setResidual] = React.useState(null)
  const antes = anterior.current
  const sai = antes && (!foto || antes.src !== foto.src) ? antes : residual

  React.useEffect(() => {
    const anteriorFoto = anterior.current
    anterior.current = foto || null
    if (!anteriorFoto || !foto || anteriorFoto.src === foto.src) return undefined
    setResidual(anteriorFoto)
    const t = setTimeout(() => setResidual(null), 420)
    return () => clearTimeout(t)
  }, [foto])

  return (
    <figure className={`scw-gal__quadro${classe ? ` ${classe}` : ''}`}>
      {sai ? (
        <img
          className="scw-gal__foto scw-gal__foto--sai"
          src={sai.src}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ objectPosition: sai.position }}
        />
      ) : null}
      {foto ? (
        <img
          key={foto.src}
          className="scw-gal__foto scw-gal__foto--entra"
          src={foto.src}
          alt={foto.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          style={{ objectPosition: foto.position }}
        />
      ) : (
        <span className="scw-edx__reserva">Foto pendente</span>
      )}
      {children}
    </figure>
  )
}

function Galeria({ fotos, total, porPagina, variante, etiqueta, semMovimento }) {
  const paginas = React.useMemo(() => paginasDe(fotos, porPagina), [fotos, porPagina])
  const n = paginas.length
  const [k, setK] = React.useState(0)
  const [auto, setAuto] = React.useState(true)
  const [parado, setParado] = React.useState(false)
  const [sentido, setSentido] = React.useState(1)
  const arraste = React.useRef(null)

  const irPara = React.useCallback((alvo, s) => {
    if (n < 2) return
    setAuto(false)                       // na mão manda: o giro não volta sozinho
    setSentido(s)
    setK(((alvo % n) + n) % n)
  }, [n])
  const andar = React.useCallback((d) => irPara(k + d, d), [irPara, k])

  React.useEffect(() => {
    if (!auto || parado || semMovimento || n < 2) return undefined
    const t = setTimeout(() => { setSentido(1); setK((x) => (x + 1) % n) }, GIRO)
    return () => clearTimeout(t)
  }, [auto, parado, semMovimento, n, k])

  // aquece a próxima página no cache (sem nó no DOM)
  React.useEffect(() => {
    if (typeof window === 'undefined' || n < 2) return
    ;(paginas[(k + 1) % n] || []).forEach((f) => { const img = new Image(); img.src = f.src })
  }, [k, n, paginas])

  if (!n) {
    return (
      <section className={`scw-gal scw-gal--${variante}`} aria-label={etiqueta}>
        <div className="scw-gal__quadros">
          <figure className="scw-gal__quadro">
            <span className="scw-edx__reserva">Galeria pendente</span>
          </figure>
        </div>
      </section>
    )
  }

  const pagina = paginas[Math.min(k, n - 1)]
  const de = pagina[0].indice
  const ate = pagina[pagina.length - 1].indice
  const quantas = total || fotos.length
  const anuncio = de === ate ? `Foto ${de} de ${quantas}` : `Fotos ${de} a ${ate} de ${quantas}`

  const aoTeclar = (ev) => {
    const passoTecla = { ArrowRight: 1, ArrowLeft: -1 }[ev.key]
    if (passoTecla) { ev.preventDefault(); ev.stopPropagation(); andar(passoTecla); return }
    if (ev.key === 'Home') { ev.preventDefault(); ev.stopPropagation(); irPara(0, -1) }
    else if (ev.key === 'End') { ev.preventDefault(); ev.stopPropagation(); irPara(n - 1, 1) }
  }

  // Arraste próprio: o `stopPropagation` evita que o gesto vire troca de EDIÇÃO
  // (a cena inteira também escuta arraste horizontal).
  const gestos = {
    onPointerDown: (ev) => { arraste.current = { x: ev.clientX, y: ev.clientY }; ev.stopPropagation() },
    onPointerUp: (ev) => {
      const a = arraste.current
      arraste.current = null
      ev.stopPropagation()
      if (!a) return
      const dx = ev.clientX - a.x
      const dy = ev.clientY - a.y
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) andar(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => { arraste.current = null },
  }

  return (
    <section
      className={`scw-gal scw-gal--${variante}${sentido < 0 ? ' is-voltando' : ''}`}
      data-galeria=""
      role="group"
      aria-roledescription="carrossel"
      aria-label={etiqueta}
      onKeyDown={aoTeclar}
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocus={() => setParado(true)}
      onBlur={() => setParado(false)}
      {...gestos}
    >
      <div className="scw-gal__quadros">
        {pagina.map((f, j) => (
          <Quadro
            key={j}
            foto={f}
            eager={k === 0}
            classe={j === 0 && variante === 'mosaico' ? 'scw-gal__quadro--largo' : ''}
          >
            {j === 0 && variante === 'mosaico' ? <span className="scw-edx__topo-scrim" aria-hidden="true" /> : null}
          </Quadro>
        ))}
      </div>

      <p className="scw-edx__sr" aria-live="polite" aria-atomic="true">{anuncio}</p>

      {/* Duas ações e UM indicador. O rótulo "Fotos · <ano>" e os pontos saíram
          (ago/2026): o ano já está no cabeçalho da cena e na trilha, e pontos +
          contador diziam a mesma posição duas vezes. Com 4 páginas o acesso
          aleatório dos pontos não pagava a largura que custavam. */}
      <div className="scw-gal__barra">
        <button
          type="button"
          className="scw-gal__seta scw-gal__seta--ant"
          aria-label="Fotos anteriores desta edição"
          onClick={() => andar(-1)}
        >
          <SetaEsq width={15} height={15} />
        </button>
        <span className="scw-gal__contador">
          {pad2(de)}–{pad2(ate)}<span>/{pad2(quantas)}</span>
        </span>
        <button
          type="button"
          className="scw-gal__seta scw-gal__seta--prox"
          aria-label="Próximas fotos desta edição"
          onClick={() => andar(1)}
        >
          <SetaDir width={15} height={15} />
        </button>
      </div>
    </section>
  )
}

/* ============================================================================
   PAINEL EDITORIAL — a mesma peça no desktop (dentro do painel flutuante) e no
   celular (dentro da sanfona). Ordem de leitura: história do festival (só na
   primeira cena), marco, curiosidade, legado e, por fim, os achados curtos do
   acervo. É bem mais texto que antes, então quem rola é ESTE bloco no desktop
   (`--painel`, com o topo do painel fixo) — a cena de 100vh não cresce.
   Hierarquia: o <h1> da página é o tema da edição; aqui os rótulos são <h2>.
   ========================================================================= */
function Bloco({ rotulo, children }) {
  return (
    <section className="scw-edx__bloco">
      <h2 className="scw-edx__bloco-rot">{rotulo}</h2>
      {children}
    </section>
  )
}

function Editorial({ id, classe = '', narrativa, abertura, curiosidades }) {
  return (
    <div id={id} className={`scw-edx__editorial${classe ? ` ${classe}` : ''}`}>
      {abertura && (
        <Bloco rotulo="A história do festival">
          <p className="scw-edx__bloco-lede">{abertura.titulo}</p>
          {abertura.paragrafos.map((p) => (
            <p key={p.slice(0, 32)} className="scw-edx__bloco-txt">{p}</p>
          ))}
        </Bloco>
      )}
      {narrativa.marco && (
        <Bloco rotulo="Por que essa edição marcou a história">
          <p className="scw-edx__bloco-txt">{narrativa.marco}</p>
        </Bloco>
      )}
      {narrativa.curiosidade && (
        <Bloco rotulo="Um destaque da edição">
          <p className="scw-edx__bloco-txt">{narrativa.curiosidade}</p>
        </Bloco>
      )}
      {narrativa.legado && (
        <Bloco rotulo="O que ficou">
          <p className="scw-edx__bloco-txt">{narrativa.legado}</p>
        </Bloco>
      )}
      {curiosidades.length > 0 && (
        <Bloco rotulo={`Curiosidades · ${curiosidades.length}`}>
          <ul className="scw-edx__curios">
            {curiosidades.map((c) => (
              <li key={c.t}>
                <b>{c.t}</b>
                <span className="scw-edx__curios-x">{c.x}</span>
                {c.v ? <span className="scw-edx__curios-v">{c.v}</span> : null}
              </li>
            ))}
          </ul>
        </Bloco>
      )}
    </div>
  )
}

export function EdicoesPage({ navigate, embutido = true, onOpenAccess, accessOpen }) {
  const [i, setI] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const [painel, setPainel] = React.useState(null)   // 'participantes' | 'editorial' | null
  const [estreito, setEstreito] = React.useState(false)
  const semMovimento = useSemMovimento()

  const e = EDS[i]
  const d = EDICOES_DADOS[e.code] || SEM_DADOS
  const marca = editionMark(e.code)
  const tom = TONS[i % TONS.length]
  // Acervo inteiro da edição (11–12 fotos), na ordem do acervo e com alt e
  // ponto focal prontos — fonte única em src/data/imageLibrary.js.
  const fotos = React.useMemo(() => editionPhotos(e.code), [e.code])
  const curiosidades = React.useMemo(() => (d.curiosidades || []).filter(semPreco), [d])
  const participantes = d.participantes || []
  // Texto longo: fonte única em src/data/edicoesNarrativa.js. A abertura (a
  // história do festival em três parágrafos) entra pela PRIMEIRA cena — a
  // apresentação é a página, não existe hero separada pra contextualizar.
  const narrativa = EDICOES_NARRATIVA[e.code] || {}
  const abertura = i === 0 ? ABERTURA : null
  const rotuloEditorial = abertura ? 'A história do festival' : 'Marcos, curiosidades e legado'
  const temEditorial = !!(abertura || narrativa.marco || narrativa.curiosidade
    || narrativa.legado || curiosidades.length)
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
      // Dentro da galeria as setas e Home/End percorrem FOTOS, não edições.
      if (ev.target && ev.target.closest && ev.target.closest('[data-galeria]')) return
      // Painel editorial/participantes tem texto rolável — as mesmas teclas
      // aqui rolam o painel, não trocam de edição.
      if (ev.target && ev.target.closest && ev.target.closest('.scw-edx__painel')) return
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
     resolvido lá com janela live/near). Aqui a janela é de 1 cena, e dentro
     dela só a página do carrossel em foco. Pra a troca não piscar, as PRIMEIRAS
     fotos das cenas vizinhas são aquecidas no cache — 6 imagens, sem nó no DOM
     (as 11–12 de cada edição só carregam quando a edição entra em foco). */
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    ;[i - 1, i + 1].forEach((k) => {
      const viz = EDS[k]
      if (!viz) return
      editionPhotos(viz.code).slice(0, 3).forEach((f) => { const img = new Image(); img.src = f.src })
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
  const btnEditorial = React.useRef(null)
  const fecharRef = React.useRef(null)
  const gatilho = React.useRef(null)
  React.useEffect(() => {
    if (painel) {
      gatilho.current = painel === 'participantes' ? btnParticipantes.current : btnEditorial.current
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

  const marcaAlt = `Marca da edição ${e.tema}`
  const anuncio = `Edição ${pad2(i + 1)} de ${pad2(TOTAL)}: ${e.tema}, ${e.code}`

  const capa = fotos[0] || null
  // memo: sem isto a lista nasceria nova a cada render e o carrossel do mobile
  // refaria páginas (e o aquecimento de cache) por render.
  const fotosDepoisDaCapa = React.useMemo(() => fotos.slice(1), [fotos])
  /* Ambiente do desktop: a ÚLTIMA foto do acervo, desfocada a 64px sob véu de
     87% — assim a foto que abre o mosaico não aparece duas vezes na mesma cena
     (e o fundo fica fixo por edição, sem repintar blur a cada troca de foto). */
  const fotoFundo = fotos.length ? fotos[fotos.length - 1] : null
  const etiquetaGaleria = `Galeria de fotos da edição ${e.tema}, ${e.code}`

  const meta = (
    <>
      <div><dt>Período</dt><dd>{d.periodo || 'não encontrado'}</dd></div>
      <div><dt>Marcas</dt><dd>{nParticipantes} participantes</dd></div>
      <div><dt>Sweet Awards</dt><dd>{premiacao}</dd></div>
    </>
  )

  const listaMarcas = participantes.length
    ? participantes.map((p) => <li key={p}><span className="scw-edx__ponto" aria-hidden="true" />{p}</li>)
    : <li>Lista de participantes pendente.</li>

  /* ============================ MOBILE ================================== */
  if (estreito) {
    return (
      <div className={raiz} style={tokens}>
        <p className="scw-edx__sr" aria-live="polite">{anuncio}</p>

        <section className="scw-edx-mob" aria-label="Edições do Sweet &amp; Coffee Week">
          <div className="scw-edx-mob__conteudo" {...gestos}>
            {/* capa 4:5 — key por edição reinicia wipe + ken burns */}
            <div className="scw-edx-mob__capa" key={`capa-${e.code}`}>
              {capa
                ? <img className="scw-edx-mob__capa-foto" src={capa.src} alt={capa.alt} decoding="async" style={{ objectPosition: capa.position }} />
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

            {/* carrossel do resto do acervo, em pares 1:1 (a capa acima é a 1ª
                foto, então aqui entra fotos.slice(1) — nada se repete na cena) */}
            <Galeria
              key={`galeria-${e.code}`}
              fotos={fotosDepoisDaCapa}
              total={fotos.length}
              porPagina={2}
              variante="par"
              etiqueta={etiquetaGaleria}
              semMovimento={semMovimento}
            />

            <div className="scw-edx-mob__corpo">
              <p className="scw-edx-mob__lead" key={`lead-${e.code}`}>{narrativa.lead}</p>

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

              {temEditorial && (
                <button
                  type="button"
                  className="scw-edx-mob__sanfona scw-edx-mob__sanfona--vazada"
                  aria-expanded={painel === 'editorial'}
                  aria-controls="scw-edx-editorial"
                  onClick={() => setPainel((p) => (p === 'editorial' ? null : 'editorial'))}
                >
                  <span>{rotuloEditorial}</span>
                  <span className="scw-edx-mob__chevron"><Chevron width={15} height={15} /></span>
                </button>
              )}
              {painel === 'editorial' && (
                <Editorial
                  id="scw-edx-editorial"
                  classe="scw-edx__editorial--cartao"
                  narrativa={narrativa}
                  abertura={abertura}
                  curiosidades={curiosidades}
                />
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
          {/* fundo: foto do acervo desfocada (blur 64px) sob véu chocolate a 87% */}
          <div className="scw-edx__fundo" aria-hidden="true">
            {fotoFundo && <span className="scw-edx__fundo-foto" style={bgStyle(fotoFundo)} />}
            <span className="scw-edx__veu" />
          </div>

          {/* mosaico de 3 fotos sangrando na metade direita — carrossel do
              acervo inteiro da edição, em páginas de 3 */}
          <Galeria
            fotos={fotos}
            porPagina={3}
            variante="mosaico"
            etiqueta={etiquetaGaleria}
            semMovimento={semMovimento}
          />

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
                      style={{ '--scw-nav-cor': c.menu, '--scw-nav-tinta': c.tinta, '--scw-nav-hover': c.menu }}
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
                  <ChaveIcon width="17" height="17" strokeWidth="2" />
                  <span>Acesso</span>
                </button>
              )}
            </div>
          </header>

          {/* coluna editorial (metade esquerda) */}
          <div className="scw-edx__coluna">
            <span className="scw-edx__rotulo">{e.etapa}</span>
            <h1 className="scw-edx__tema">{e.tema}</h1>
            <p className="scw-edx__lead">{narrativa.lead}</p>
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
              {temEditorial && (
                <button
                  type="button"
                  ref={btnEditorial}
                  className="scw-edx__botao scw-edx__botao--vazado"
                  aria-expanded={painel === 'editorial'}
                  aria-controls="scw-edx-painel"
                  onClick={() => setPainel((p) => (p === 'editorial' ? null : 'editorial'))}
                >
                  {rotuloEditorial}
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

          {painel === 'editorial' && (
            <aside
              className="scw-edx__painel scw-edx__painel--escuro"
              id="scw-edx-painel"
              role="region"
              aria-label={abertura ? 'A história do festival e a edição de 2016' : `Sobre a edição ${e.tema}`}
              onKeyDown={(ev) => { if (ev.key === 'Escape') setPainel(null) }}
            >
              <div className="scw-edx__painel-topo">
                <span className="scw-edx__painel-rot">
                  {abertura ? 'A história do Sweet & Coffee Week' : `Sobre a edição · ${e.code}`}
                </span>
                <button type="button" ref={fecharRef} className="scw-edx__fechar" aria-label="Fechar" onClick={() => setPainel(null)}>
                  <XisFechar width={15} height={15} />
                </button>
              </div>
              <Editorial
                classe="scw-edx__editorial--painel"
                narrativa={narrativa}
                abertura={abertura}
                curiosidades={curiosidades}
              />
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
