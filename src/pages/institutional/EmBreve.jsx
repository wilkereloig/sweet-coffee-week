/*
 * PÁGINA "EM BREVE" — landing pública temporária (COMING_SOON_PUBLICATION).
 * Enquanto o site institucional completo é finalizado, o domínio oficial mostra:
 *   1) aviso "novo site em breve" (identidade institucional do Sweet Awards:
 *      espresso #2B1810 + creme + ouro #F8B511 — CLAUDE.md §12);
 *   2) o Sweet Awards da última edição (Lovers 2026.1): 8 categorias com pódio
 *      completo (dados oficiais de loversAwardsResults.js — §12/§16) e card
 *      linkando o POST DE RESULTADO no Instagram (postResultado em
 *      sweetCoffeeHistory.js; link, não embed — §12 proíbe embeds).
 * Sem header/footer globais: landing autocontida (logo própria no topo).
 * Logos reais via resolveParticipant, fallback monograma — nunca inventa.
 */
import React from 'react'
import { I } from '../../components/icons'
import { LOVERS_2026_AWARDS_RESULTS } from '../../data/loversAwardsResults'
import { SWEET_COFFEE_HISTORY } from '../../data/sweetCoffeeHistory'
import { resolveParticipant } from '../../data/participantAssets'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'

// Base da edição Lovers na história (descrições + posts de resultado por key).
const LOVERS_META = (() => {
  const ed = (SWEET_COFFEE_HISTORY.edicoes || []).find((e) => e.id === '2026.1')
  const map = {}
  for (const c of ed?.premiacao?.categorias || []) map[c.key] = c
  return map
})()

// Pódios oficiais (fonte: loversAwardsResults — §12) + meta (descrição/post).
const CATEGORIES = LOVERS_2026_AWARDS_RESULTS.premiacao.categorias.map((c) => ({
  ...c,
  descricao: LOVERS_META[c.key]?.descricao || '',
  post: LOVERS_META[c.key]?.postResultado || null,
}))

const MEDAL = { 1: 'ouro', 2: 'prata', 3: 'bronze' }

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

// URL de post/reel do Instagram -> versão "/embed" (iframe server-rendered do IG,
// que carrega o card do post mesmo com o visitante deslogado — ao contrário do
// widget blockquote+embed.js, que colapsa). Mesmo método do site anterior.
function toEmbedUrl(url) {
  try {
    const m = new URL(url.trim()).pathname.match(/\/(p|reel|tv)\/([^/]+)/)
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : ''
  } catch { return '' }
}

// Card do post real: iframe do /embed + barra "Ver no Instagram" (fallback sempre
// clicável se o iframe não carregar por rede/bloqueio).
function PostCard({ post, categoria }) {
  const embed = toEmbedUrl(post)
  return (
    <div className="eb-post">
      {embed && (
        <iframe
          className="eb-post__frame"
          src={embed}
          title={`Sweet Awards — ${categoria} no Instagram`}
          loading="lazy"
        />
      )}
      <a className="eb-post__bar" href={post} target="_blank" rel="noopener noreferrer">
        <I.ig width={15} height={15} />
        <span>Ver no Instagram</span>
        <I.arrow />
      </a>
    </div>
  )
}

export function EmBrevePage() {
  return (
    <div className="eb-page">
      {/* 1 — AVISO "EM BREVE" */}
      <header className="eb-hero">
        <div className="eb-wrap eb-hero__inner">
          <img className="eb-hero__logo" src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" />
          <p className="eb-hero__soon">Em breve</p>
          <h1>O novo site do Sweet &amp; Coffee Week está chegando.</h1>
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
          <div className="eb-head">
            <h2>Sweet Awards — <span className="eb-hl">Lovers 2026.1</span></h2>
            <p>
              O resultado oficial da premiação da 16ª edição, na avaliação dos Sweet Lovers.
              Cada card leva ao post do resultado no Instagram.
            </p>
          </div>
          <div className="eb-grid">
            {CATEGORIES.map((c) => (
              <article className="eb-cat" key={c.key}>
                <h3>{c.categoria}</h3>
                {c.descricao && <p className="eb-cat__desc">{c.descricao}</p>}
                <ol className="eb-podium">
                  {c.colocacoes.map((col) => (
                    <li className={`eb-place eb-place--${MEDAL[col.pos]}`} key={col.pos}>
                      <span className="eb-medal" aria-hidden="true">{col.pos}</span>
                      <span className="eb-place__brands">
                        {col.nomes.map((n) => <BrandChip name={n} key={n} size={col.pos === 1 ? 44 : 36} />)}
                      </span>
                      <span className="eb-place__names">
                        <span className="sr-only">{col.pos}º lugar: </span>
                        {col.nomes.join(' e ')}
                      </span>
                    </li>
                  ))}
                </ol>
                {c.post && <PostCard post={c.post} categoria={c.categoria} />}
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
        .eb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--sp-4, 16px); }
        .eb-cat { display: flex; flex-direction: column; gap: var(--sp-3, 12px); background: var(--cream-card, #FFF8F0); border: 1px solid var(--paper-line, rgba(43,24,16,.12)); border-radius: var(--r-lg, 18px); padding: var(--sp-6, 28px); box-shadow: var(--shadow-md, 0 10px 26px rgba(43,24,16,.08)); }
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
        .eb-brand img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .eb-brand__mono { font-family: var(--font-display); font-weight: 900; font-size: 13px; color: var(--ink, #2B1810); }
        .eb-place__names { font-family: var(--font-heading); font-weight: 800; font-size: 14.5px; line-height: 1.15; }
        .eb-place--ouro .eb-place__names { font-size: 16px; }
        /* card do post no Instagram (iframe /embed + barra link) */
        .eb-post { margin-top: auto; display: flex; flex-direction: column; overflow: hidden; border-radius: 14px; border: 1px solid var(--paper-line, rgba(43,24,16,.12)); background: #fff; }
        .eb-post__frame { width: 100%; height: 540px; border: 0; display: block; background: #fff; }
        .eb-post__bar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--paper-line, rgba(43,24,16,.12)); font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; color: #C98A0B; text-decoration: none; }
        .eb-post__bar svg:last-child { margin-left: auto; transition: transform .16s ease; }
        .eb-post__bar:hover svg:last-child { transform: translateX(3px); }

        /* 3 — FECHO */
        .eb-foot { background: #2B1810; color: rgba(255,241,230,.8); }
        .eb-foot__inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding-top: 26px; padding-bottom: 26px; font-size: 13.5px; }
        .eb-foot a { color: #F8B511; font-weight: 700; text-decoration: none; }

        @media (max-width: 560px) {
          .eb-btn { width: 100%; justify-content: center; }
          .eb-foot__inner { justify-content: center; text-align: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eb-btn, .eb-cat__post svg:last-child { transition: none; }
        }
      `}</style>
    </div>
  )
}
