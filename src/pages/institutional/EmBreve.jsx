/*
 * PÁGINA "EM BREVE" — landing pública temporária (COMING_SOON_PUBLICATION).
 * Enquanto o site institucional completo é finalizado, o domínio oficial mostra:
 *   1) aviso "novo site em breve" (identidade institucional do Sweet Awards:
 *      espresso #2B1810 + creme + ouro #F8B511 — CLAUDE.md §12);
 *   2) o Sweet Awards da última edição (Lovers 2026.1): Melhor Combo em
 *      destaque + as demais 7 categorias, pódio completo. Dados vêm de
 *      getCurrentEditionScenes() (src/data/sweetHistoryStats.js) — fonte única
 *      compartilhada com a página institucional Sweet Awards, já cruzando
 *      sweetCoffeeHistory.js (descrição/post) com loversAwardsResults.js
 *      (pódio) por `key`. Link pro POST DE RESULTADO no Instagram — nunca embed.
 * Sem header/footer globais: landing autocontida (logo própria no topo).
 * Logos reais via resolveParticipant, fallback monograma — nunca inventa.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { getCurrentEditionScenes } from '../../data/sweetHistoryStats'
import { resolveParticipant } from '../../data/participantAssets'
import { awardPhoto, COMBO_EDITION, RESERVA } from '../../data/imageLibrary'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'

// Cenas da edição atual (2026.1), na ordem da história (Melhor Combo primeiro).
const SCENES = getCurrentEditionScenes()
const COMBO_SCENE = SCENES.find((s) => s.key === 'melhor_combo') || null
const OTHER_SCENES = SCENES.filter((s) => s.key !== 'melhor_combo')

// Foto real por categoria, pelo sistema central de imagens: só existe quando o
// vínculo marca↔combo está no acervo (awardPhoto devolve `null` fora dele).
// Quando a mesma marca vence mais de uma categoria — O Maestro Café vence 3 —
// o contador por marca pede um frame diferente da galeria dela, nunca o mesmo
// arquivo duas vezes.
const CATEGORY_PHOTO = (() => {
  const usos = new Map()
  const mapa = {}
  for (const cena of SCENES) {
    const nome = (cena.winners || []).find((w) => w.pos === 1)?.name
    const n = usos.get(nome) || 0
    usos.set(nome, n + 1)
    mapa[cena.key] = nome ? awardPhoto(nome, COMBO_EDITION, n) : null
  }
  return mapa
})()

const MEDAL = { 1: 'ouro', 2: 'prata', 3: 'bronze' }

// getCurrentEditionScenes() devolve winners já achatados ([{place,pos,name}]);
// reagrupa por posição pra preservar empates (mais de um nome na mesma vaga).
function groupWinnersByPos(winners) {
  const map = new Map()
  for (const w of winners || []) {
    if (!map.has(w.pos)) map.set(w.pos, { pos: w.pos, names: [] })
    map.get(w.pos).names.push(w.name)
  }
  return [...map.values()].sort((a, b) => a.pos - b.pos)
}
// Foto de categoria com fallback elegante (mesmo padrão de BrandChip): esconde o
// <img> quebrado e mostra "Foto pendente" — nunca ícone de imagem quebrada nem
// bloco vazio (CLAUDE.md §8).
function SceneImg({ foto, className, prioritaria }) {
  const [broken, setBroken] = React.useState(false)
  if (!foto || broken) return <div className="eb-cat__nophoto">{RESERVA}</div>
  return (
    <img
      className={className}
      src={foto.src}
      alt={foto.alt}
      style={{ objectPosition: foto.position }}
      loading={prioritaria ? 'eager' : 'lazy'}
      fetchpriority={prioritaria ? 'high' : undefined}
      decoding="async"
      onError={() => setBroken(true)}
    />
  )
}

function BrandChip({ name, size = 40 }) {
  const m = resolveParticipant(name)
  const [broken, setBroken] = React.useState(false)
  const show = m.logo && !broken
  return (
    <span className="eb-brand" style={{ width: size, height: size, ...(m.brandColor ? { '--brand': m.brandColor } : null) }}>
      {show
        ? <img src={m.logo} alt={`Logo ${name}`} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="eb-brand__mono" aria-hidden="true">{m.fallback}</span>}
    </span>
  )
}

// Barra "Ver no Instagram" — link real pro post de resultado (nunca embed/iframe).
function PostLink({ href }) {
  if (!href) return null
  return (
    <div className="eb-post">
      <a className="eb-post__bar" href={href} target="_blank" rel="noopener noreferrer">
        <I.ig width={15} height={15} />
        <span>Ver no Instagram</span>
        <I.arrow />
      </a>
    </div>
  )
}

// Pódio (1º/2º/3º) de uma cena — empates viram múltiplos nomes na mesma medalha.
function Podium({ winners, leadFirst = false }) {
  return (
    <ol className="eb-podium">
      {groupWinnersByPos(winners).map((p) => (
        <li className={`eb-place eb-place--${MEDAL[p.pos]}`} key={p.pos}>
          <span className="eb-medal" aria-hidden="true">{p.pos}</span>
          <span className="eb-place__brands">
            {p.names.map((n) => <BrandChip name={n} key={n} size={p.pos === 1 ? (leadFirst ? 52 : 44) : 36} />)}
          </span>
          <span className="eb-place__names">
            <span className="sr-only">{p.pos}º lugar: </span>
            {p.names.join(' e ')}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function EmBrevePage() {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef, [])
  return (
    <div className="eb-page" ref={rootRef}>
      {/* 1 — AVISO "EM BREVE" */}
      <header className="eb-hero">
        <div className="eb-wrap eb-hero__inner motion-stagger">
          <img className="eb-hero__logo" src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" />
          <p className="eb-hero__soon">Em breve</p>
          <h1>O novo site do <span className="eb-nowrap">Sweet &amp; Coffee Week</span> está chegando.</h1>
          <p className="eb-hero__sub">
            Estamos preparando a casa das 16 edições, das marcas e das memórias do festival.
            Enquanto isso, reveja quem brilhou no Sweet Awards da edição Sweet &amp; Coffee Week Lovers.
          </p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="eb-btn eb-btn--gold">
            <I.ig width={16} height={16} /> Acompanhar no {INSTAGRAM_HANDLE}
          </a>
        </div>
      </header>

      {/* 2 — SWEET AWARDS DA ÚLTIMA EDIÇÃO */}
      <section className="eb-awards">
        <div className="eb-wrap">
          <div className="eb-head motion-reveal-up">
            <h2>Sweet Awards — <span className="eb-hl">Lovers 2026.1</span></h2>
            <p>
              O resultado oficial da premiação da 16ª edição, na avaliação dos Sweet Lovers.
              Cada card leva ao post do resultado no Instagram.
            </p>
          </div>
          {COMBO_SCENE && (
            <article className="eb-combo motion-stagger motion-card-hover">
              <div className="eb-combo__media">
                <SceneImg className="motion-image-reveal" foto={CATEGORY_PHOTO.melhor_combo} prioritaria />
                <span className="eb-combo__medal" aria-hidden="true">1º</span>
              </div>
              <div className="eb-combo__body">
                <p className="eb-combo__tag">Grande vencedor</p>
                <h3>{COMBO_SCENE.category}</h3>
                {COMBO_SCENE.description && <p className="eb-cat__desc">{COMBO_SCENE.description}</p>}
                <Podium winners={COMBO_SCENE.winners} leadFirst />
                <PostLink href={COMBO_SCENE.postResultado} />
              </div>
            </article>
          )}

          <div className="eb-grid eb-grid--compact">
            {OTHER_SCENES.map((scene) => (
              <article className="eb-cat motion-reveal-up motion-card-hover" key={scene.key}>
                <div className="eb-cat__media">
                  <SceneImg className="motion-image-reveal" foto={CATEGORY_PHOTO[scene.key]} />
                </div>
                <h3>{scene.category}</h3>
                {scene.description && <p className="eb-cat__desc">{scene.description}</p>}
                <Podium winners={scene.winners} />
                <PostLink href={scene.postResultado} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — FECHO */}
      <footer className="eb-foot">
        <div className="eb-wrap eb-foot__inner">
          <p>Sweet &amp; Coffee Week — o festival que transforma Natal em uma rota de sabores.</p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>
        </div>
      </footer>

      <style>{`
        .eb-page { min-height: 100vh; background: var(--cream, #FFF1E6); color: var(--ink, #2B1810); overflow-x: clip; }
        .eb-page h1, .eb-page h2, .eb-page h3 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; margin: 0; text-wrap: balance; }
        .eb-wrap { max-width: 1280px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 56px); }
        .eb-page .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        /* 1 — HERO em breve (espresso + creme + ouro) */
        .eb-hero { background: #2B1810; color: var(--cream, #FFF1E6); }
        .eb-hero__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4, 16px); padding-top: clamp(56px, 9vh, 110px); padding-bottom: clamp(56px, 9vh, 110px); }
        .eb-hero__logo { width: clamp(150px, 18vw, 220px); height: auto; }
        .eb-hero__soon { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #F8B511; margin: var(--sp-4, 16px) 0 0; }
        .eb-hero h1 { font-size: clamp(30px, 4.4vw, 56px); line-height: 1.02; max-width: 18ch; color: var(--cream, #FFF1E6); }
        .eb-nowrap { white-space: nowrap; }
        .eb-hero__sub { max-width: 58ch; margin: 0; font-size: var(--fs-lead, 17px); line-height: 1.5; color: rgba(255,241,230,.85); text-wrap: pretty; }
        .eb-btn { display: inline-flex; align-items: center; gap: 9px; min-height: 48px; padding: 12px 26px; border-radius: 999px; font-family: var(--font-sans); font-weight: 700; font-size: 15px; text-decoration: none; margin-top: var(--sp-3, 12px); transition: transform .18s ease; }
        .eb-btn:hover { transform: translateY(-2px); }
        .eb-btn--gold { background: #F8B511; color: #2B1810; }

        /* 2 — AWARDS */
        .eb-awards { padding: clamp(56px, 8vw, 110px) 0; }
        .eb-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4, 16px); max-width: 760px; margin: 0 auto clamp(32px, 4.5vw, 56px); }
        .eb-head h2 { font-size: clamp(26px, 3.4vw, 44px); line-height: 1; }
        .eb-hl { font-style: italic; color: #C98A0B; }
        .eb-head p { margin: 0; max-width: 58ch; color: var(--ink-soft, #6b5548); font-size: var(--fs-lead, 17px); line-height: 1.45; text-wrap: pretty; }

        /* Card de destaque — Melhor Combo (grande vencedor), antes da grade */
        .eb-combo { display: grid; grid-template-columns: minmax(220px, 1fr) 1.35fr; gap: clamp(20px, 3vw, 40px); align-items: stretch; background: var(--cream-card, #FFF8F0); border: 1px solid var(--paper-line, rgba(43,24,16,.12)); border-radius: var(--r-lg, 18px); padding: clamp(20px, 2.6vw, 32px); box-shadow: var(--shadow-md, 0 10px 26px rgba(43,24,16,.08)); margin-bottom: clamp(28px, 4vw, 48px); }
        .eb-combo__media { position: relative; min-height: 240px; border-radius: 14px; overflow: hidden; }
        .eb-combo__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .eb-combo__medal { position: absolute; top: 14px; left: 14px; display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: linear-gradient(160deg, #FFE08A, #E8A20C); color: #2B1810; font-family: var(--font-display); font-weight: 900; font-size: 18px; box-shadow: 0 6px 16px rgba(43,24,16,.28), inset 0 0 0 3px rgba(255,255,255,.5); }
        .eb-combo__body { display: flex; flex-direction: column; gap: var(--sp-3, 12px); }
        .eb-combo__tag { margin: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #C98A0B; }
        .eb-combo__body h3 { font-size: clamp(22px, 2.6vw, 30px); }

        .eb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: var(--sp-4, 16px); }
        .eb-grid--compact { grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: var(--sp-3, 12px); }
        .eb-cat { display: flex; flex-direction: column; gap: var(--sp-3, 12px); background: var(--cream-card, #FFF8F0); border: 1px solid var(--paper-line, rgba(43,24,16,.12)); border-radius: var(--r-lg, 18px); padding: var(--sp-6, 28px); box-shadow: var(--shadow-md, 0 10px 26px rgba(43,24,16,.08)); }
        .eb-grid--compact .eb-cat { padding: var(--sp-4, 16px); }
        .eb-cat__media { border-radius: 12px; overflow: hidden; aspect-ratio: 4 / 3; }
        .eb-cat__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .eb-cat__nophoto { width: 100%; height: 100%; display: grid; place-items: center; padding: var(--sp-4, 16px); text-align: center; color: var(--ink-soft, #6b5548); font-size: 12.5px; font-style: italic; background: repeating-linear-gradient(135deg, var(--cream-card, #FFF8F0), var(--cream-card, #FFF8F0) 10px, var(--paper-line, rgba(43,24,16,.12)) 10px, var(--paper-line, rgba(43,24,16,.12)) 11px); }
        .eb-cat h3 { font-size: clamp(17px, 1.5vw, 20px); }
        .eb-cat__desc { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft, #6b5548); }
        .eb-podium { list-style: none; margin: var(--sp-2, 8px) 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .eb-place { display: grid; grid-template-columns: 26px auto 1fr; align-items: center; column-gap: 10px; }
        .eb-medal { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; font-family: var(--font-display); font-weight: 900; font-size: 13px; color: #2B1810; box-shadow: inset 0 0 0 2px rgba(0,0,0,.12); }
        .eb-place--ouro .eb-medal { background: linear-gradient(160deg, #FFE08A, #E8A20C); }
        .eb-place--prata .eb-medal { background: linear-gradient(160deg, #ECECEC, #B9B9B9); }
        .eb-place--bronze .eb-medal { background: linear-gradient(160deg, #E8B084, #B06A38); }
        .eb-place__brands { display: inline-flex; gap: 6px; }
        .eb-brand { display: inline-grid; place-items: center; border-radius: 12px; background: #fff; border: 1px solid var(--paper-line, rgba(43,24,16,.12)); overflow: hidden; }
        .eb-brand img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .eb-brand__mono { font-family: var(--font-display); font-weight: 900; font-size: 13px; color: var(--ink, #2B1810); }
        .eb-place__names { font-family: var(--font-heading); font-weight: 800; font-size: 14.5px; line-height: 1.15; }
        .eb-place--ouro .eb-place__names { font-size: 16px; }
        /* barra "Ver no Instagram" — link real pro post de resultado, sem embed */
        .eb-post { margin-top: auto; display: flex; flex-direction: column; overflow: hidden; border-radius: 14px; border: 1px solid var(--paper-line, rgba(43,24,16,.12)); background: #fff; }
        .eb-post__bar { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 12px 14px; font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; color: #C98A0B; text-decoration: none; }
        .eb-post__bar svg:last-child { margin-left: auto; transition: transform .16s ease; }
        .eb-post__bar:hover svg:last-child { transform: translateX(3px); }

        /* 3 — FECHO */
        .eb-foot { background: #2B1810; color: rgba(255,241,230,.8); }
        .eb-foot__inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding-top: 26px; padding-bottom: 26px; font-size: 13.5px; }
        .eb-foot a { color: #F8B511; font-weight: 700; text-decoration: none; }

        @media (max-width: 720px) {
          .eb-combo { grid-template-columns: 1fr; }
          .eb-combo__media { min-height: 200px; }
        }
        @media (max-width: 560px) {
          .eb-btn { width: 100%; justify-content: center; }
          .eb-foot__inner { justify-content: center; text-align: center; }
        }
        @media (max-width: 420px) {
          .eb-nowrap { white-space: normal; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eb-btn, .eb-post__bar svg:last-child { transition: none; }
        }
      `}</style>
    </div>
  )
}
