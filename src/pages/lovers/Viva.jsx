import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, LoversStickers, useLoversReveal, ShareCardModal, PhotoBoothModal } from '../../components/lovers'

function readNome() {
  try { return (JSON.parse(window.localStorage.getItem('sweet-awards-voter')) || {}).nome || '' } catch { return '' }
}

// Arquivo do mapa imprimível da Rota da Doçura (com espaços de carimbo).
// Coloque o arquivo em: public/mapa-rota-da-docura.pdf
const MAPA_ROTA_FILE = '/mapa-rota-da-docura.pdf'

// Card de accordion: cabeçalho clicável + corpo que expande na própria página.
function VivaCard({ id, open, onToggle, icon, eyebrow, title, tag, children }) {
  return (
    <article className={'viva-card' + (open ? ' is-open' : '')}>
      <button className="viva-card__head" onClick={() => onToggle(id)} aria-expanded={open}>
        <span className="viva-card__icon" aria-hidden="true">{icon}</span>
        <span className="viva-card__heading">
          {eyebrow && <span className="viva-card__eyebrow">{eyebrow}</span>}
          <span className="viva-card__title">{title}</span>
        </span>
        {tag && <span className="viva-card__tag">{tag}</span>}
        <span className="viva-card__chev" aria-hidden="true">⌄</span>
      </button>
      <div className="viva-card__body">
        <div className="viva-card__inner">{children}</div>
      </div>
    </article>
  )
}

export function VivaPage({ navigate }) {
  useLoversReveal()
  const [shareVariant, setShareVariant] = React.useState(null)
  const [boothOpen, setBoothOpen] = React.useState(false)
  const [openCard, setOpenCard] = React.useState(null) // todos recolhidos ao abrir
  const nome = readNome()

  const toggle = (id) => setOpenCard(cur => (cur === id ? null : id))

  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="viva" count={4} />

      {/* Hero / abertura */}
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          <span className="lovers-public-hero__eyebrow">Sweet Lovers</span>
          <h1 className="lovers-public-hero__title">Viva o Sweet</h1>
        </div>
      </section>

      <section className="section awards-section">
        <div className="wrap lovers-safe-wrap" style={{ maxWidth: 760 }}>
          <div className="promo-intro lovers-reveal">
            <p>
              O <strong>Sweet &amp; Coffee Week Lovers</strong> é feito para quem vive o festival de verdade.
              Aqui reunimos as ações, experiências e brincadeiras pra você aproveitar a edição de um jeito
              mais divertido. Toque em cada card pra abrir.
            </p>
          </div>

          <div className="viva-cards">
            {/* Card 1 — Rota da Doçura (promoção) */}
            <VivaCard id="rota" open={openCard === 'rota'} onToggle={toggle}
              icon={<I.map width={22} height={22} />}
              eyebrow="Primeira ação" title="Rota da Doçura" tag="Promoção">
              <p className="promo-card__lead">Você pediu, a gente ouviu: a Rota da Doçura vale presentes! 💛</p>
              <p className="promo-card__text">
                Durante o Sweet &amp; Coffee Week Lovers, os participantes terão <strong>carimbos próprios</strong>,
                e cada visita pode ser registrada no mapa oficial da edição.
              </p>
              <ul className="promo-card__list">
                <li><strong>A cada 5 carimbos</strong> de estabelecimentos diferentes, você concorre a sorteios de
                  brindes oficiais — canecas, moleskines, caixas de Sweet Cookies, vouchers e outras surpresas.</li>
                <li><strong>Prêmio especial:</strong> os <strong>3 primeiros</strong> Sweet Lovers que completarem o
                  mapa com os carimbos dos <strong>21 participantes</strong> ganham um <strong>Kit Especial Sweet &amp; Coffee Lovers</strong>.</li>
                <li>Os mapas impressos são uma <strong>edição limitada</strong>, distribuídos nas lojas participantes
                  enquanto durarem os estoques. Quem preferir pode baixar o mapa oficial e imprimir.</li>
              </ul>
              <p className="promo-card__tagline">Colecione carimbos. Colecione sabores. Colecione dias felizes.</p>
              <div className="promo-card__ctas">
                <LoversButton variant="primary" href={MAPA_ROTA_FILE} download>
                  <I.map width={18} height={18} /> Baixar mapa da Rota da Doçura
                </LoversButton>
                <LoversButton variant="secondary" href="#/lovers/participantes"
                  onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                  Ver participantes <I.arrow />
                </LoversButton>
              </div>
            </VivaCard>

            {/* Card 2 — Foto com stickers (cabine) */}
            <VivaCard id="foto" open={openCard === 'foto'} onToggle={toggle}
              icon={<I.cup width={22} height={22} />}
              eyebrow="Experiência" title="Tire sua foto Sweet Lover" tag="Novo">
              <p className="promo-card__lead">Selfie ou foto do combo + moldura + adesivos, e posta no seu Story 💛</p>
              <p className="promo-card__text">
                Abra a cabine, escolha entre tirar uma foto na hora ou enviar uma do seu rolo, decore com os
                adesivos exclusivos da edição e compartilhe marcando <strong>@sweetcoffeeweek</strong>.
              </p>
              <div className="promo-card__ctas">
                <LoversButton variant="primary" onClick={() => setBoothOpen(true)}>
                  <I.cup width={18} height={18} /> Abrir cabine de foto
                </LoversButton>
              </div>
            </VivaCard>

            {/* Card 3 — Placeholder (a definir) */}
            <VivaCard id="embreve" open={openCard === 'embreve'} onToggle={toggle}
              icon={<I.star width={22} height={22} />}
              eyebrow="Em breve" title="Novas ações chegando" tag="Em breve">
              <p className="promo-card__text">
                Estamos preparando mais experiências pra essa edição. Fica de olho aqui — em breve tem novidade. 💛
              </p>
            </VivaCard>
          </div>
        </div>
      </section>

      <ShareCardModal
        open={!!shareVariant}
        onClose={() => setShareVariant(null)}
        variant={shareVariant || 'carteirinha'}
        data={{ nome }}
      />
      <PhotoBoothModal open={boothOpen} onClose={() => setBoothOpen(false)} />
    </div>
  )
}
