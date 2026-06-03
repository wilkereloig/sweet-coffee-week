import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, LoversStickers, useLoversReveal, ShareCardModal } from '../../components/lovers'

function readNome() {
  try { return (JSON.parse(window.localStorage.getItem('sweet-awards-voter')) || {}).nome || '' } catch { return '' }
}

// Arquivo do mapa imprimível da Rota da Doçura (com espaços de carimbo).
// Coloque o arquivo em: public/mapa-rota-da-docura.pdf
const MAPA_ROTA_FILE = '/mapa-rota-da-docura.pdf'

const PURPLE = '#4F2092'

export function PromocoesPage({ navigate }) {
  useLoversReveal()
  const [shareVariant, setShareVariant] = React.useState(null)
  const nome = readNome()
  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="premiacao" />

      {/* Hero / abertura */}
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          <span className="lovers-public-hero__eyebrow">Sweet Lovers</span>
          <h1 className="lovers-public-hero__title">Promoções para Sweet Lovers</h1>
        </div>
      </section>

      <section className="section awards-section">
        <div className="wrap lovers-safe-wrap" style={{ maxWidth: 760 }}>
          <div className="promo-intro lovers-reveal">
            <p>
              O <strong>Sweet &amp; Coffee Week Lovers</strong> é feito para quem vive o festival de verdade:
              quem monta roteiro, visita os participantes, chama os amigos, fotografa os combos, compartilha
              as experiências e transforma cada edição em memória.
            </p>
            <p>
              Nesta página reunimos as promoções e ações especiais criadas para os Sweet Lovers aproveitarem
              ainda mais essa edição: campanhas, brindes, experiências colecionáveis e oportunidades de
              participar do festival de um jeito mais divertido.
            </p>
          </div>

          {/* Bloco da promoção — Rota da Doçura */}
          <article className="promo-card lovers-reveal" style={{ '--promo-accent': PURPLE }}>
            <span className="lovers-sticker lovers-sticker--pink promo-card__sticker" aria-hidden="true">promoção</span>
            <span className="lovers-eyebrow" style={{ color: 'var(--lovers-yellow)' }}>Primeira ação</span>
            <h2 className="promo-card__title">Sweet Lovers na Rota da Doçura</h2>
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
          </article>

          {/* Botões de compartilhamento (share cards) */}
          <div className="promo-share lovers-reveal">
            <h2 className="promo-share__title">Mostre que você é Sweet Lover</h2>
            <p className="promo-share__lead">Gere seu card e compartilhe no Story marcando <strong>@sweetcoffeeweek</strong> 💛</p>
            <div className="promo-share__btns">
              <LoversButton variant="primary" onClick={() => setShareVariant('carteirinha')}><I.heart width={16} height={16} /> Minha carteirinha</LoversButton>
              <LoversButton variant="primary" onClick={() => setShareVariant('meutop')}><I.star width={16} height={16} /> Minha avaliação</LoversButton>
              <LoversButton variant="secondary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}><I.map width={16} height={16} /> Minha rota</LoversButton>
            </div>
          </div>
        </div>
      </section>

      <ShareCardModal
        open={!!shareVariant}
        onClose={() => setShareVariant(null)}
        variant={shareVariant || 'carteirinha'}
        data={{ nome }}
      />
    </div>
  )
}
