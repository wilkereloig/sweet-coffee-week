import React from 'react'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { LOVERS_2026_AWARDS_RESULTS } from '../../data/loversAwardsResults'
import { resolveParticipant, initialsOf } from '../../data/participantAssets'

/*
 * SWEET AWARDS — página institucional da premiação do Sweet & Coffee Week.
 * Identidade: KV institucional do FESTIVAL (espresso/creme + ouro de medalha),
 * NÃO o KV da edição Lovers. A seção de destaque fala da última edição
 * (Sweet & Coffee Week Lovers 2026.1) sem transformar a página em página Lovers.
 *
 * Fonte de dados (cruzada, sem inventar):
 *   - descrições das 8 categorias oficiais → SWEET_COFFEE_HISTORY (edição 2026.1);
 *   - pódios da edição atual              → LOVERS_2026_AWARDS_RESULTS;
 *   - histórico por edição                → SWEET_COFFEE_HISTORY (2019–2025) +
 *     pódios de 2026.1 injetados de LOVERS_2026_AWARDS_RESULTS (na base histórica
 *     os pódios de 2026.1 estão vazios de propósito).
 *
 * Página autossuficiente: só React + dados locais + <style> interno. Sem libs novas,
 * sem imagens externas, sem stickers. Logos reais via resolveParticipant (fallback
 * em iniciais quando o acervo não tem a marca).
 */

// ── Dados derivados ──────────────────────────────────────────────────────────
const EDICOES = SWEET_COFFEE_HISTORY.edicoes
const CURRENT_EDITION = EDICOES.find((e) => e.id === '2026.1')

// 8 categorias oficiais (nome + descrição) lidas da edição atual na base histórica.
const OFFICIAL_CATEGORIES = (CURRENT_EDITION?.premiacao?.categorias || []).map((c) => ({
  name: c.categoria,
  key: c.key,
  desc: c.descricao || '',
}))

// Pódios da edição atual (Lovers 2026.1), com a descrição oficial acoplada.
const CURRENT_RESULTS = LOVERS_2026_AWARDS_RESULTS.premiacao.categorias.map((c) => ({
  name: c.categoria,
  key: c.key,
  desc: OFFICIAL_CATEGORIES.find((o) => o.key === c.key)?.desc || '',
  colocacoes: c.colocacoes,
}))

// Categorias históricas que também fizeram parte da premiação, mas não são oficiais
// hoje. Computadas (não inventadas) por diferença sobre a base, via categoryAliases.
const CAT_ALIASES = SWEET_COFFEE_HISTORY.categoryAliases || {}
function canonCategory(name) {
  for (const [canon, list] of Object.entries(CAT_ALIASES)) {
    if (list.some((a) => a.toLowerCase() === String(name).toLowerCase())) return canon
  }
  return name
}
const HISTORIC_EXTRA_CATEGORIES = [
  { name: 'Melhor Sabor', desc: 'Premiava o sabor em si, antes das categorias se especializarem por doce, salgado e bebida.' },
  { name: 'Delivery', desc: 'Reconhecia a melhor experiência de entrega/retirada — categoria das edições 2020–2021.' },
]

// Edições com premiação (exclui 2016–2018, que foram só circuito gastronômico),
// da mais recente para a mais antiga.
const AWARDED_EDITIONS = EDICOES
  .filter((e) => e.premiacao && typeof e.premiacao.status === 'string' && e.premiacao.status.startsWith('completa'))
  .slice()
  .sort((a, b) => b.ordem - a.ordem)

// Primeira edição com Sweet Awards (para a nota histórica de 2016–2018).
const FIRST_AWARD_YEAR = '2019'

function editionCategorias(e) {
  // Na base, os pódios de 2026.1 estão vazios; usar a fonte estruturada Lovers.
  if (e.id === '2026.1') return LOVERS_2026_AWARDS_RESULTS.premiacao.categorias
  return e.premiacao.categorias || []
}

const TRILHA_LABEL = {
  juri_tecnico: 'Júri Técnico',
  sweet_lovers: 'Sweet Lovers',
  publico: 'Votação do público',
}
function trilhaLabel(t) {
  return TRILHA_LABEL[t || 'publico'] || 'Votação do público'
}

// Agrupa as categorias de uma edição por trilha, preservando a ordem de aparição.
function groupByTrilha(cats) {
  const order = []
  const map = new Map()
  for (const c of cats) {
    const t = c.trilha || 'publico'
    if (!map.has(t)) {
      map.set(t, [])
      order.push(t)
    }
    map.get(t).push(c)
  }
  return order.map((t) => ({ trilha: t, cats: map.get(t) }))
}

// Lista de categorias distintas (canônicas) presentes no histórico, para o filtro.
const FILTER_CATEGORIES = (() => {
  const seen = new Set()
  const out = []
  for (const e of AWARDED_EDITIONS) {
    for (const c of editionCategorias(e)) {
      const canon = canonCategory(c.categoria)
      if (!seen.has(canon)) {
        seen.add(canon)
        out.push(canon)
      }
    }
  }
  return out
})()

// ── Subcomponentes ───────────────────────────────────────────────────────────

// Selo de colocação — marca editorial (não sticker). Ouro no 1º; apoio no 2º/3º.
function Seal({ pos, size = 'md' }) {
  return (
    <span className={`swa-seal swa-seal--p${pos} swa-seal--${size}`} aria-hidden="true">
      {pos}
      <i>º</i>
    </span>
  )
}

// Marca do participante: logo real do acervo, senão chip de iniciais (sem inventar).
function Brand({ name, size = 'md' }) {
  const p = resolveParticipant(name)
  const [err, setErr] = React.useState(false)
  if (p.logo && !err) {
    return (
      <img
        className={`swa-brand swa-brand--${size}`}
        src={p.logo}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <span className={`swa-brand swa-brand--${size} swa-brand--fb`} aria-hidden="true">
      {p.fallback || initialsOf(name)}
    </span>
  )
}

// Um nome premiado: marca + nome. Empates renderizam vários numa mesma colocação.
function Honoree({ name, size = 'md' }) {
  return (
    <span className="swa-honoree">
      <Brand name={name} size={size} />
      <span className="swa-honoree__name">{name}</span>
    </span>
  )
}

// Card de categoria da edição atual (premiação): 1º em destaque, 2º/3º de apoio.
function CurrentCategoryCard({ cat }) {
  const colocacoes = cat.colocacoes || []
  const champion = colocacoes.find((c) => c.pos === 1)
  const support = colocacoes.filter((c) => c.pos !== 1).sort((a, b) => a.pos - b.pos)
  return (
    <article className="swa-win">
      <header className="swa-win__head">
        <h3 className="swa-win__cat">{cat.name}</h3>
        {cat.desc && <p className="swa-win__desc">{cat.desc}</p>}
      </header>

      {champion && (
        <div className="swa-win__champ">
          <Seal pos={1} size="lg" />
          <div className="swa-win__champ-body">
            <span className="swa-place-label">1º lugar</span>
            <div className="swa-honoree-row">
              {champion.nomes.map((n) => (
                <Honoree key={n} name={n} size="lg" />
              ))}
            </div>
          </div>
        </div>
      )}

      {support.length > 0 && (
        <ul className="swa-win__rest">
          {support.map((c) => (
            <li className="swa-win__rest-row" key={c.pos}>
              <Seal pos={c.pos} size="sm" />
              <span className="swa-sr">{c.pos}º lugar</span>
              <div className="swa-honoree-row">
                {c.nomes.map((n) => (
                  <Honoree key={n} name={n} size="sm" />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// Pódio compacto do histórico (3 linhas), com empates na mesma colocação.
function HistoryPodium({ colocacoes }) {
  const ordered = colocacoes.slice().sort((a, b) => a.pos - b.pos)
  return (
    <ol className="swa-podium">
      {ordered.map((c) => (
        <li className="swa-podium__row" key={c.pos}>
          <Seal pos={c.pos} size="sm" />
          <span className="swa-sr">{c.pos}º lugar</span>
          <div className="swa-honoree-row">
            {c.nomes.map((n) => (
              <Honoree key={n} name={n} size="sm" />
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

// Accordion de uma edição do histórico.
function EditionAccordion({ edicao, open, onToggle, categoryFilter }) {
  const cats = editionCategorias(edicao)
  const filtered = categoryFilter
    ? cats.filter((c) => canonCategory(c.categoria) === categoryFilter)
    : cats
  const grupos = groupByTrilha(filtered)
  const panelId = `swa-ed-${edicao.id}`
  const displayName = edicao.id === '2026.1' ? 'Sweet & Coffee Week Lovers' : (edicao.tema || edicao.nome)
  const year = edicao.id.split('.')[0]
  const hasContent = filtered.length > 0

  return (
    <div className={`swa-acc${open ? ' is-open' : ''}`}>
      <h3 className="swa-acc__h">
        <button
          type="button"
          className="swa-acc__btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="swa-acc__code">{edicao.id}</span>
          <span className="swa-acc__title">
            <span className="swa-acc__theme">{displayName}</span>
            <span className="swa-acc__meta">
              {year} · {edicao.periodo}
            </span>
          </span>
          <span className="swa-acc__chev" aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} className="swa-acc__panel" hidden={!open}>
        {!hasContent ? (
          <p className="swa-acc__empty">Sem resultados nesta categoria para a edição.</p>
        ) : (
          grupos.map((g) => (
            <div className="swa-track" key={g.trilha}>
              <p className="swa-track__label">{trilhaLabel(g.trilha)}</p>
              <div className="swa-track__grid">
                {g.cats.map((c, i) => (
                  <div className="swa-histcat" key={`${c.categoria}-${i}`}>
                    <p className="swa-histcat__name">{c.categoria}</p>
                    <HistoryPodium colocacoes={c.colocacoes} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export function SweetAwardsPage() {
  const [openEd, setOpenEd] = React.useState(AWARDED_EDITIONS[0]?.id || null)
  const [edFilter, setEdFilter] = React.useState('')
  const [catFilter, setCatFilter] = React.useState('')

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const visibleEditions = edFilter
    ? AWARDED_EDITIONS.filter((e) => e.id === edFilter)
    : AWARDED_EDITIONS

  const hasFilters = edFilter || catFilter
  const clearFilters = () => {
    setEdFilter('')
    setCatFilter('')
  }

  return (
    <div className="swa">
      {/* 1 ── HERO enxuta ──────────────────────────────────────────────────── */}
      <section className="swa-hero swa-hero--lean">
        <div className="swa-hero__inner">
          <h1 className="swa-hero__title">
            A premiação que reconhece os grandes destaques do{' '}
            <em>Sweet &amp; Coffee Week</em>.
          </h1>
          <p className="swa-hero__text">
            A cada edição, os Sweet Lovers elegem os participantes que mais se destacaram.
            Veja quem venceu na edição atual.
          </p>
          <div className="swa-hero__cta">
            <button type="button" className="swa-btn swa-btn--gold" onClick={() => scrollTo('atual')}>
              Ver vencedores
            </button>
            <button type="button" className="swa-btn swa-btn--ghost" onClick={() => scrollTo('historico')}>
              Explorar histórico
            </button>
          </div>
        </div>
      </section>

      {/* 2 ── Resultado da Premiação Lovers 2026.1 — primeiro bloco da página ── */}
      <section className="swa-sec swa-current" id="atual">
        <div className="swa-wrap">
          <header className="swa-sec__head swa-current__head">
            <h2 className="swa-h2 swa-h2--cream">Resultado da Premiação — Sweet &amp; Coffee Week Lovers 2026.1</h2>
            <p className="swa-current__text">
              A edição Lovers celebrou os 10 anos do festival e reconheceu os participantes
              que mais se destacaram nas avaliações dos Sweet Lovers.
            </p>
            {/* Link interino para o perfil oficial. Quando os posts da premiação
                chegarem, dá para apontar cada categoria/colocação ao seu post. */}
            <a className="swa-btn swa-btn--gold swa-current__ig" href="https://www.instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer">
              Ver a premiação no Instagram
            </a>
          </header>
          <div className="swa-current__grid">
            {CURRENT_RESULTS.map((cat) => (
              <CurrentCategoryCard cat={cat} key={cat.key} />
            ))}
          </div>
        </div>
      </section>

      {/* 3 ── O que é o Sweet Awards ────────────────────────────────────────── */}
      <section className="swa-sec swa-about">
        <div className="swa-wrap">
          <div className="swa-about__grid">
            <div className="swa-about__lead">
              <h2 className="swa-h2">O reconhecimento oficial dos destaques do festival.</h2>
              <p className="swa-lead">
                O Sweet Awards reúne as avaliações do público e reconhece os participantes
                que mais se destacaram em cada edição do Sweet &amp; Coffee Week.
              </p>
            </div>
            <ul className="swa-about__points">
              <li>
                <span className="swa-about__k">Quem decide</span>
                <span className="swa-about__v">A avaliação dos Sweet Lovers, edição após edição.</span>
              </li>
              <li>
                <span className="swa-about__k">O que reconhece</span>
                <span className="swa-about__v">Sabor, atendimento, apresentação, criatividade e encantamento.</span>
              </li>
              <li>
                <span className="swa-about__k">Para que serve</span>
                <span className="swa-about__v">Virar memória oficial e histórico consultável do festival.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3 ── Categorias da premiação ───────────────────────────────────────── */}
      <section className="swa-sec swa-cats">
        <div className="swa-wrap">
          <header className="swa-sec__head">
            <h2 className="swa-h2">As categorias da premiação.</h2>
          </header>
          <div className="swa-cats__grid">
            {OFFICIAL_CATEGORIES.map((c, i) => (
              <article className="swa-cat" key={c.key}>
                <span className="swa-cat__n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="swa-cat__name">{c.name}</h3>
                <p className="swa-cat__desc">{c.desc}</p>
                <span className="swa-tag swa-tag--current">Edição atual</span>
              </article>
            ))}
          </div>

          <div className="swa-cats__historic">
            <h3 className="swa-h3">Categorias que também fizeram parte da história</h3>
            <div className="swa-cats__historic-grid">
              {HISTORIC_EXTRA_CATEGORIES.map((c) => (
                <article className="swa-cat swa-cat--hist" key={c.name}>
                  <h4 className="swa-cat__name">{c.name}</h4>
                  <p className="swa-cat__desc">{c.desc}</p>
                  <span className="swa-tag swa-tag--hist">Histórica</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 ── Histórico do Sweet Awards por edição ──────────────────────────── */}
      <section className="swa-sec swa-history" id="historico">
        <div className="swa-wrap">
          <header className="swa-sec__head">
            <h2 className="swa-h2">Histórico do Sweet Awards</h2>
            <p className="swa-lead">Explore os resultados por edição, categoria e trilha de avaliação.</p>
          </header>

          {/* Filtros simples */}
          <div className="swa-filters" role="group" aria-label="Filtrar histórico">
            <div className="swa-filters__chips">
              <button
                type="button"
                className={`swa-chip${!edFilter ? ' is-active' : ''}`}
                onClick={() => setEdFilter('')}
              >
                Todas as edições
              </button>
              {AWARDED_EDITIONS.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className={`swa-chip${edFilter === e.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setEdFilter(e.id)
                    setOpenEd(e.id)
                  }}
                >
                  {e.id}
                </button>
              ))}
            </div>
            <div className="swa-filters__right">
              <label className="swa-select">
                <span className="swa-select__label">Categoria</span>
                <select value={catFilter} onChange={(ev) => setCatFilter(ev.target.value)}>
                  <option value="">Todas</option>
                  {FILTER_CATEGORIES.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {hasFilters && (
                <button type="button" className="swa-clear" onClick={clearFilters}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="swa-acc-list">
            {visibleEditions.map((e) => (
              <EditionAccordion
                key={e.id}
                edicao={e}
                open={openEd === e.id}
                onToggle={() => setOpenEd(openEd === e.id ? null : e.id)}
                categoryFilter={catFilter}
              />
            ))}
          </div>

          <p className="swa-history__note">
            Nas primeiras edições (2016–2018), o festival ainda funcionava apenas como
            circuito gastronômico. O Sweet Awards começou a aparecer a partir de {FIRST_AWARD_YEAR}.
          </p>
        </div>
      </section>

      {/* 6 ── CTA / nav final ───────────────────────────────────────────────── */}
      <section className="swa-sec swa-end">
        <div className="swa-wrap swa-end__inner">
          <h2 className="swa-h2 swa-h2--cream">O Sweet Awards é a memória viva do festival.</h2>
          <p className="swa-end__text">
            Cada edição soma novos nomes a esse histórico. Acompanhe o Sweet &amp; Coffee Week
            e descubra quem serão os próximos destaques.
          </p>
          <div className="swa-hero__cta">
            <a
              className="swa-btn swa-btn--gold"
              href="https://www.instagram.com/sweetcoffeeweek"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acompanhar no Instagram
            </a>
            <button type="button" className="swa-btn swa-btn--ghost" onClick={() => scrollTo('atual')}>
              Rever vencedores
            </button>
          </div>
        </div>
      </section>

      <style>{styles}</style>
    </div>
  )
}

export default SweetAwardsPage

// ── Estilos (institucional, escopo .swa) ─────────────────────────────────────
const styles = `
.swa {
  --swa-espresso: var(--ink, #2B1810);   /* fundo marrom do festival (Home hero) */
  --swa-espresso-2: #3A2114;             /* marrom mais quente p/ camadas */
  --swa-cream: var(--bg, #FFF4EC);
  --swa-cream-2: var(--bg-soft, #FBEADC);
  --swa-gold: #F8B511;                   /* amarelo oficial (medalha / 1º lugar) */
  --swa-pink: var(--page-accent, #F2548A);
  --swa-coral: var(--accent, #E8553A);
  --swa-line: rgba(255, 244, 236, .16);
  --swa-line-ink: rgba(43, 24, 16, .12);
  --swa-content-start: var(--hero-content-start, clamp(152px, 18vh, 224px));
  background: var(--swa-cream);
  color: var(--ink);
  font-family: var(--font-sans);
}
.swa em { font-style: italic; }
/* container alinhado à Home (.wrap → --maxw 1280 / --pad clamp(20,4vw,56)) */
.swa-wrap { max-width: 1280px; margin: 0 auto; padding-inline: clamp(20px, 4vw, 56px); }
.swa-sec { padding-block: clamp(64px, 9vw, 132px); }
.swa-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.swa-eyebrow {
  display: inline-block; font-family: var(--font-slab); font-size: 12px; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; color: var(--swa-gold);
}
.swa-eyebrow--ink { color: var(--swa-coral); }
.swa-h2 {
  font-family: var(--font-serif); font-weight: 400; letter-spacing: -.02em;
  font-size: clamp(28px, 3.6vw, 52px); line-height: 1.04; margin: 14px 0 0; color: var(--ink); text-wrap: balance;
}
.swa-h2--cream { color: var(--swa-cream); }
.swa-h3 { font-family: var(--font-serif); font-weight: 400; font-size: clamp(20px, 2.2vw, 30px); line-height: 1.1; margin: 0; color: var(--ink); }
.swa-lead { max-width: 56ch; margin: 16px 0 0; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.5; color: var(--ink-soft); text-wrap: pretty; }
.swa-sec__head { margin-bottom: clamp(32px, 4vw, 56px); }

/* Botões */
.swa-btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 48px;
  padding: 0 22px; border-radius: 999px; border: 1.5px solid transparent; font-family: var(--font-slab);
  font-weight: 700; font-size: 14px; letter-spacing: .02em; transition: transform .15s ease, background .2s ease, color .2s ease, border-color .2s ease;
}
.swa-btn--gold { background: var(--swa-gold); color: #2B1810; }
.swa-btn--gold:hover { transform: translateY(-2px); }
.swa-btn--ghost { background: transparent; color: var(--swa-cream); border-color: var(--swa-line); }
.swa-current .swa-btn--ghost, .swa-end .swa-btn--ghost { color: var(--swa-cream); }
.swa-btn--ghost:hover { border-color: var(--swa-gold); color: var(--swa-gold); }
.swa-btn:focus-visible { outline: 3px solid var(--swa-gold); outline-offset: 2px; }

/* ── HERO ─────────────────────────────────────────────────────────────────── */
.swa-hero { background: var(--swa-espresso); color: var(--swa-cream); overflow: clip; }
.swa-hero__inner {
  max-width: 1280px; margin: 0 auto; padding-inline: clamp(20px, 4vw, 56px);
  padding-top: var(--swa-content-start); padding-bottom: clamp(56px, 8vw, 104px);
  display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 5vw, 72px); align-items: end;
}
.swa-hero--lean .swa-hero__inner { grid-template-columns: 1fr; align-items: start; max-width: 900px; padding-bottom: clamp(40px, 6vw, 72px); }
.swa-hero--lean .swa-hero__title { margin-top: 0; }
.swa-current__ig { margin-top: 22px; align-self: flex-start; }
.swa-hero__title {
  font-family: var(--font-serif); font-weight: 400; letter-spacing: -.02em;
  font-size: clamp(36px, 5.2vw, 74px); line-height: 1; margin: 18px 0 0; max-width: 16ch; color: var(--swa-cream); text-wrap: balance;
}
.swa-hero__title em { color: var(--swa-gold); }
.swa-hero__text { max-width: 50ch; margin: 22px 0 0; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.5; color: rgba(255, 244, 236, .82); text-wrap: pretty; }
.swa-hero__cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }

/* Quadro de honra (assinatura) */
.swa-roll { border: 1px solid var(--swa-line); border-radius: 18px; background: rgba(255, 244, 236, .04); padding: clamp(20px, 2vw, 28px); }
.swa-roll__seal { display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 18px; margin-bottom: 8px; border-bottom: 1px solid var(--swa-line); }
.swa-roll__seal-top { font-family: var(--font-script); font-size: 26px; line-height: 1; color: var(--swa-gold); }
.swa-roll__seal-mid { font-family: var(--font-serif); font-size: clamp(26px, 3vw, 36px); letter-spacing: .02em; color: var(--swa-cream); line-height: 1; margin-top: 2px; }
.swa-roll__seal-sub { font-family: var(--font-slab); font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: rgba(255, 244, 236, .6); margin-top: 8px; }
.swa-roll__list { list-style: none; margin: 0; padding: 0; }
.swa-roll__item { display: flex; align-items: baseline; gap: 14px; padding: 9px 0; border-bottom: 1px solid var(--swa-line); }
.swa-roll__item:last-child { border-bottom: 0; }
.swa-roll__n { font-family: var(--font-mono); font-size: 12px; color: var(--swa-gold); min-width: 22px; }
.swa-roll__cat { font-family: var(--font-slab); font-size: 15px; font-weight: 700; color: var(--swa-cream); }

/* ── O QUE É ───────────────────────────────────────────────────────────────── */
.swa-about { background: var(--swa-cream); }
.swa-about__grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: start; }
.swa-about__points { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; align-self: center; }
.swa-about__points li { display: grid; gap: 4px; padding: 18px 0; border-top: 1px solid var(--swa-line-ink); }
.swa-about__points li:last-child { border-bottom: 1px solid var(--swa-line-ink); }
.swa-about__k { font-family: var(--font-slab); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--swa-coral); }
.swa-about__v { font-size: 17px; color: var(--ink); }

/* ── CATEGORIAS ───────────────────────────────────────────────────────────── */
.swa-cats { background: var(--swa-cream-2); }
.swa-cats__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.swa-cat { position: relative; background: var(--swa-cream); border: 1px solid var(--swa-line-ink); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.swa-cat__n { font-family: var(--font-mono); font-size: 12px; color: var(--swa-coral); }
.swa-cat__name { font-family: var(--font-serif); font-weight: 400; font-size: 21px; line-height: 1.05; margin: 0; color: var(--ink); }
.swa-cat__desc { font-size: 14px; line-height: 1.45; color: var(--ink-soft); margin: 0; flex: 1; }
.swa-tag { align-self: flex-start; font-family: var(--font-slab); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
.swa-tag--current { background: rgba(248, 181, 17, .18); color: #8a5d00; }
.swa-tag--hist { background: rgba(43, 24, 16, .08); color: var(--ink-soft); }
.swa-cats__historic { margin-top: clamp(32px, 4vw, 48px); padding-top: clamp(28px, 3vw, 40px); border-top: 1px solid var(--swa-line-ink); }
.swa-cats__historic-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
.swa-cat--hist { background: transparent; border-style: dashed; }

/* ── VENCEDORES EDIÇÃO ATUAL ──────────────────────────────────────────────── */
.swa-current { background: var(--swa-espresso); color: var(--swa-cream); }
.swa-current__text { max-width: 56ch; margin: 16px 0 0; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.5; color: rgba(255, 244, 236, .82); }
.swa-current__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
.swa-win { background: var(--swa-cream); color: var(--ink); border-radius: 18px; padding: clamp(20px, 2vw, 28px); display: flex; flex-direction: column; gap: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.28); }
.swa-win__cat { font-family: var(--font-serif); font-weight: 400; font-size: clamp(22px, 2vw, 28px); line-height: 1; margin: 0; }
.swa-win__desc { font-size: 14px; line-height: 1.45; color: var(--ink-soft); margin: 6px 0 0; }
.swa-win__champ { display: flex; gap: 16px; align-items: flex-start; padding: 16px; border-radius: 14px; background: linear-gradient(180deg, rgba(248,181,17,.16), rgba(248,181,17,.06)); border: 1px solid rgba(248,181,17,.4); }
.swa-win__champ-body { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
.swa-place-label { font-family: var(--font-slab); font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #8a5d00; }
.swa-win__rest { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.swa-win__rest-row { display: flex; align-items: center; gap: 12px; padding-top: 10px; border-top: 1px solid var(--swa-line-ink); }
.swa-honoree-row { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; min-width: 0; }
.swa-honoree { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
.swa-honoree__name { font-family: var(--font-slab); font-weight: 700; font-size: 15px; line-height: 1.1; }
.swa-win__rest .swa-honoree__name { font-size: 14px; font-weight: 600; }
.swa-points { font-family: var(--font-mono); font-size: 12px; color: #8a5d00; background: rgba(248,181,17,.16); padding: 2px 8px; border-radius: 999px; align-self: flex-start; }
.swa-points--sm { margin-left: auto; }

/* Selos de colocação */
.swa-seal {
  display: inline-flex; align-items: baseline; justify-content: center; flex: none;
  font-family: var(--font-serif); font-weight: 400; border-radius: 50%; line-height: 1;
}
.swa-seal i { font-style: normal; font-size: .55em; margin-left: 1px; }
.swa-seal--lg { width: 56px; height: 56px; font-size: 26px; }
.swa-seal--md { width: 40px; height: 40px; font-size: 18px; }
.swa-seal--sm { width: 30px; height: 30px; font-size: 14px; }
.swa-seal--p1 { background: var(--swa-gold); color: #2B1810; box-shadow: inset 0 0 0 2px rgba(43,24,16,.18); }
.swa-seal--p2 { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 2px var(--swa-line-ink); }
.swa-seal--p3 { background: transparent; color: var(--swa-coral); box-shadow: inset 0 0 0 2px rgba(232,85,58,.4); }

/* Marca do participante (logo / fallback iniciais) */
.swa-brand { object-fit: contain; border-radius: 8px; background: #fff; flex: none; }
.swa-brand--lg { width: 52px; height: 52px; padding: 5px; box-shadow: 0 1px 0 var(--swa-line-ink), inset 0 0 0 1px var(--swa-line-ink); }
.swa-brand--md { width: 40px; height: 40px; padding: 4px; box-shadow: inset 0 0 0 1px var(--swa-line-ink); }
.swa-brand--sm { width: 32px; height: 32px; padding: 3px; box-shadow: inset 0 0 0 1px var(--swa-line-ink); }
.swa-brand--fb { display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-slab); font-weight: 700; color: var(--ink-soft); background: var(--swa-cream-2); font-size: 13px; }
.swa-brand--lg.swa-brand--fb { font-size: 17px; }
.swa-brand--sm.swa-brand--fb { font-size: 11px; }

/* ── HISTÓRICO ────────────────────────────────────────────────────────────── */
.swa-history { background: var(--swa-cream); }
.swa-filters { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.swa-filters__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.swa-chip { font-family: var(--font-slab); font-weight: 700; font-size: 13px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--swa-line-ink); background: var(--swa-cream); color: var(--ink-soft); transition: border-color .15s, color .15s, background .15s; }
.swa-chip:hover { border-color: var(--swa-coral); color: var(--ink); }
.swa-chip.is-active { background: var(--ink); color: var(--swa-cream); border-color: var(--ink); }
.swa-filters__right { display: flex; align-items: center; gap: 14px; }
.swa-select { display: inline-flex; align-items: center; gap: 8px; }
.swa-select__label { font-family: var(--font-slab); font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
.swa-select select { font: inherit; font-size: 14px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--swa-line-ink); background: var(--swa-cream); color: var(--ink); }
.swa-clear { font-family: var(--font-slab); font-size: 13px; font-weight: 700; color: var(--swa-coral); background: none; border: 0; text-decoration: underline; text-underline-offset: 3px; }

.swa-acc-list { display: grid; gap: 12px; }
.swa-acc { border: 1px solid var(--swa-line-ink); border-radius: 14px; overflow: hidden; background: var(--swa-cream); }
.swa-acc.is-open { border-color: rgba(43,24,16,.24); }
.swa-acc__h { margin: 0; }
.swa-acc__btn { display: flex; align-items: center; gap: 16px; width: 100%; text-align: left; padding: 18px 20px; background: none; border: 0; }
.swa-acc__code { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--swa-coral); background: var(--swa-cream-2); padding: 4px 9px; border-radius: 8px; flex: none; }
.swa-acc__title { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.swa-acc__theme { font-family: var(--font-serif); font-size: clamp(18px, 1.8vw, 24px); line-height: 1.05; color: var(--ink); }
.swa-acc__meta { font-size: 12.5px; color: var(--ink-mute); }
.swa-acc__chev { width: 12px; height: 12px; border-right: 2px solid var(--ink-soft); border-bottom: 2px solid var(--ink-soft); transform: rotate(45deg); transition: transform .2s ease; flex: none; }
.swa-acc.is-open .swa-acc__chev { transform: rotate(-135deg); }
.swa-acc__panel { padding: 4px 20px 24px; }
.swa-acc__empty { color: var(--ink-mute); font-size: 14px; margin: 8px 0 0; }
.swa-track { margin-top: 18px; }
.swa-track__label { font-family: var(--font-slab); font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--swa-coral); margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--swa-line-ink); }
.swa-track__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.swa-histcat__name { font-family: var(--font-slab); font-weight: 700; font-size: 14px; margin: 0 0 10px; color: var(--ink); }
.swa-podium { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.swa-podium__row { display: flex; align-items: center; gap: 10px; }

/* ── FIM ──────────────────────────────────────────────────────────────────── */
.swa-end { background: var(--swa-espresso-2); color: var(--swa-cream); text-align: center; }
.swa-end__inner { max-width: 760px; }
.swa-end__text { max-width: 52ch; margin: 16px auto 0; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.5; color: rgba(255,244,236,.82); }
.swa-end .swa-hero__cta { justify-content: center; }
.swa-history__note { margin: 28px 0 0; font-size: 14px; line-height: 1.5; color: var(--ink-mute); border-left: 2px solid var(--swa-line-ink); padding-left: 16px; max-width: 64ch; }

/* ── RESPONSIVO ───────────────────────────────────────────────────────────── */
@media (max-width: 920px) {
  .swa-hero__inner, .swa-about__grid { grid-template-columns: 1fr; }
  .swa-roll { max-width: 460px; }
  .swa-cats__grid { grid-template-columns: repeat(2, 1fr); }
  .swa-current__grid { grid-template-columns: 1fr; }
  .swa-track__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .swa-cats__grid, .swa-cats__historic-grid, .swa-track__grid { grid-template-columns: 1fr; }
  .swa-filters { flex-direction: column; align-items: stretch; }
  .swa-filters__right { justify-content: space-between; }
  .swa-win__champ { flex-direction: row; }
}
@media (prefers-reduced-motion: reduce) {
  .swa-btn, .swa-acc__chev, .swa-chip { transition: none; }
  .swa-btn--gold:hover { transform: none; }
}
`
