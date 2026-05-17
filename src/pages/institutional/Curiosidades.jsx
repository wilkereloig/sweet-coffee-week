import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'

function RankCard({ pos, marca, edicoes, primeira, ultima }) {
  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center' }}>
      <div style={{ width: 64, textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 56, lineHeight: 1, color: 'var(--accent)' }}>
        {pos.toString().padStart(2, '0')}
      </div>
      <div>
        <div className="h-3">{marca}</div>
        <div className="mono mt-1 text-mute">PARTICIPOU EM {edicoes} EDIÇÕES</div>
        <div className="text-mute mt-2" style={{ fontSize: 14 }}>
          De <span style={{ fontStyle: 'italic' }}>{primeira}</span> até <span style={{ fontStyle: 'italic' }}>{ultima}</span>
        </div>
      </div>
      <div style={{ width: 80, height: 80, borderRadius: 16, background: 'rgba(43,24,16,.04)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-mute)' }}>
        {[I.cup, I.donut, I.croissant, I.plate][pos % 4]({ width: 28, height: 28 })}
      </div>
    </div>
  )
}

export function CuriosidadesPage({ navigate }) {
  return (
    <div className="page-enter">
      <section style={{ padding: 'clamp(48px, 7vw, 96px) 0 32px' }}>
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>CURIOSIDADES DO SWEET</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'clamp(28px, 5vw, 80px)', alignItems: 'end', marginTop: 16 }}>
            <h1 className="hero-inst__title" style={{ fontSize: 'clamp(48px, 8vw, 128px)' }}>
              Curiosidades<br/><span className="roman">do Sweet.</span>
            </h1>
            <p className="lead" style={{ paddingBottom: 8 }}>
              Rankings, memórias e números que contam a história do festival ao longo das suas 16 edições.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="eyebrow mb-3"><span className="dot"></span>NÚMEROS RÁPIDOS</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { n: '16',       l: 'TOTAL DE EDIÇÕES' },
              { n: '+200',     l: 'TOTAL DE PARTICIPANTES' },
              { n: '+540',     l: 'TOTAL DE COMBOS CRIADOS' },
              { n: 'Movies',   l: 'TEMA COM MAIS PARTICIPANTES' },
              { n: 'Tirol',    l: 'BAIRRO COM MAIS PARTICIPANTES' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ background: 'var(--bg-card)' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: 1, color: 'var(--accent)' }}>
                  {s.n}
                </div>
                <div className="mono mt-3 text-mute" style={{ fontSize: 11 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 1280px) {
            .section .grid[style*="repeat(5"] { grid-template-columns: repeat(4, 1fr) !important; }
          }
          @media (max-width: 1100px) {
            .section .grid[style*="repeat(5"] { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 880px) {
            .section .grid[style*="repeat(5"] { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
      </section>

      <section className="section">
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow"><span className="dot"></span>QUEM MAIS PARTICIPOU DO SWEET</div>
            <h2 className="h-1 mt-3">Ranking de presença.</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <RankCard pos={1} marca="Doceria Placeholder I"       edicoes={14} primeira="S&C 2016"          ultima="Lovers 2026" />
            <RankCard pos={2} marca="Cafeteria Placeholder II"    edicoes={12} primeira="Páscoa 2017"        ultima="Lovers 2026" />
            <RankCard pos={3} marca="Confeitaria Placeholder III" edicoes={10} primeira="Doces do Mundo"     ultima="Celebration 2025" />
            <RankCard pos={4} marca="Restaurante Placeholder IV"  edicoes={9}  primeira="Namorados 2018"     ultima="Celebration 2025" />
            <RankCard pos={5} marca="Marca Gastronômica V"        edicoes={8}  primeira="Pâtisserie 2019"    ultima="Books 2024" />
            <RankCard pos={6} marca="Doceria Placeholder VI"      edicoes={7}  primeira="Heróis & Vilões"    ultima="Trip 2023" />
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section .grid[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow"><span className="dot"></span>FOTOS DAS EDIÇÕES</div>
            <h2 className="h-2 mt-2">Memória do festival.</h2>
          </div>
          <div className="curi-mosaic">
            <PhotoEditorial label="2016 · S&C" aspect="3/4" tone="warm" />
            <PhotoEditorial label="2019 · PÂTISSERIE" aspect="3/4" tone="cream" />
            <PhotoEditorial label="2022 · MOVIES" aspect="3/4" tone="dark" />
            <PhotoEditorial label="2023 · TRIP" aspect="3/4" tone="cool" />
            <PhotoEditorial label="2025 · CELEBRATION" aspect="3/4" tone="coffee" />
          </div>
          <style>{`
            .curi-mosaic { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
            @media (max-width: 880px) { .curi-mosaic { grid-template-columns: repeat(3, 1fr); }
              .curi-mosaic > figure:nth-child(n+4) { display: none; }
            }
            @media (max-width: 560px) { .curi-mosaic { grid-template-columns: repeat(2, 1fr); }
              .curi-mosaic > figure:nth-child(n+3) { display: none; }
            }
          `}</style>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,244,236,.55)' }}>
              <span className="dot" style={{ background: 'var(--accent)' }}></span>
              MAIORES VENCEDORES DO SWEET & COFFEE WEEK AWARDS
            </div>
            <h2 className="h-1 mt-3" style={{ color: 'var(--bg)' }}>Hall da Doçura.</h2>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { pos: 1, marca: 'Doceria Placeholder I',  premios: 7, categorias: ['Melhor Combo', 'Mais Criativo', 'Mais Afetivo'], edicoes: ['Movies','Trip','Lovers'] },
              { pos: 2, marca: 'Confeitaria II',          premios: 5, categorias: ['Melhor Combo', 'Atendimento'],                  edicoes: ['Books','Celebration'] },
              { pos: 3, marca: 'Cafeteria III',           premios: 4, categorias: ['Mais Criativo'],                                edicoes: ['Séries','Trip'] },
              { pos: 4, marca: 'Marca IV',                premios: 3, categorias: ['Mais Afetivo'],                                 edicoes: ['Sabores da Infância'] },
              { pos: 5, marca: 'Doceria V',               premios: 3, categorias: ['Atendimento'],                                  edicoes: ['Movies','Books'] },
              { pos: 6, marca: 'Marca VI',                premios: 2, categorias: ['Melhor Combo'],                                 edicoes: ['Terras Potiguares'] },
            ].map((w) => (
              <div key={w.pos} className="card" style={{ background: 'rgba(255,244,236,.04)', color: 'var(--bg)', borderColor: 'rgba(255,244,236,.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 56, lineHeight: 1, color: 'var(--peach)' }}>{w.pos.toString().padStart(2,'0')}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ color: 'rgba(255,244,236,.5)' }}>PRÊMIOS</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 36, lineHeight: 1, marginTop: 4 }}>{w.premios}</div>
                  </div>
                </div>
                <div className="h-3 mt-3" style={{ color: 'var(--bg)' }}>{w.marca}</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {w.categorias.map((c, i) => (
                    <span key={i} className="tag" style={{ fontSize: 10, background: 'rgba(255,244,236,.06)', color: 'var(--peach)' }}>{c}</span>
                  ))}
                </div>
                <div className="mono mt-3" style={{ fontSize: 11, color: 'rgba(255,244,236,.45)' }}>VENCEU EM: {w.edicoes.join(' · ')}</div>
              </div>
            ))}
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section .grid[style*="repeat(3, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 560px) {
              .section .grid[style*="repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}
