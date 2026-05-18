import React from 'react'
import { I } from '../../components/icons'
import { FormFieldPH } from '../../components/placeholders'

export function AwardsPage({ navigate }) {
  return (
    <div className="page-enter kv-lovers" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
        <div className="wrap">
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 24, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              SWEET & COFFEE WEEK AWARDS · AVALIAÇÃO DO PÚBLICO
            </div>
            <h1 className="lovers-h1" style={{ fontSize: 'clamp(48px, 7vw, 96px)', margin: 0 }}>
              Sweet & Coffee<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>Awards.</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-script)', fontSize: 36, color: 'var(--lovers-red)', margin: '20px 0 0', transform: 'rotate(-1deg)', display: 'inline-block' }}>
              Avalie sua experiência na edição Sweet & Coffee Week Lovers.
            </p>
            <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .82, marginTop: 24 }}>
              O Sweet & Coffee Week Awards é a premiação do festival. Nesta etapa, os Sweet Lovers podem avaliar os combos que experimentaram a partir de critérios definidos pela organização.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          section[style*="0 56px"] .wrap > div[style*="1.3fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section className="section" style={{ background: 'var(--lovers-purple)' }}>
        <div className="wrap">
          <div className="mb-5" style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-yellow)' }}><span className="dot" style={{ background: 'var(--lovers-yellow)' }}></span>Como funciona</div>
            <h2 className="lovers-h2 mt-3" style={{ color: 'var(--lovers-cream)' }}>Quatro passos pra avaliar.</h2>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { n: '01', icon: 'plate',  t: 'Experimente os combos', b: 'Visite os participantes da edição Sweet & Coffee Week Lovers e experimente os combos criados para a edição.' },
              { n: '02', icon: 'heart',  t: 'Acesse o formulário', b: 'Acesse o formulário de avaliação durante o período definido pela organização.' },
              { n: '03', icon: 'check',  t: 'Avalie sua experiência', b: 'Preencha os critérios de avaliação disponíveis no formulário para cada combo experimentado.' },
              { n: '04', icon: 'star',   t: 'Acompanhe os resultados', b: 'Os resultados do Sweet & Coffee Week Awards serão divulgados nos canais oficiais ao final da edição.' },
            ].map((s) => {
              const IconComp = I[s.icon] || I.star
              return (
                <div key={s.n} className="card" style={{ background: 'var(--bg-card)', borderColor: 'rgba(135,14,45,.15)' }}>
                  <div className="howit-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <span className="lovers-h3" style={{ fontSize: 44, lineHeight: 1, color: 'var(--lovers-pink)' }}>{s.n}</span>
                    <div style={{ color: 'var(--lovers-red)' }}><IconComp width={26} height={26} /></div>
                  </div>
                  <div className="lovers-h3 mb-2" style={{ fontSize: 18, color: 'var(--lovers-ink)' }}>{s.t}</div>
                  <div className="text-mute" style={{ fontSize: 14 }}>{s.b}</div>
                </div>
              )
            })}
          </div>
        </div>
        <style>{`
          @media (max-width: 880px) {
            .section .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 560px) {
            .section .grid[style*="repeat(4"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      <section className="section" style={{ background: 'var(--lovers-yellow)' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'clamp(28px, 4vw, 56px)', alignItems: 'start' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--lovers-red)' }}><span className="dot" style={{ background: 'var(--lovers-red)' }}></span>AVALIAÇÃO</div>
              <h2 className="lovers-h2 mt-3">
                Sua avaliação<br/><span style={{ color: 'var(--lovers-burgundy)' }}>importa.</span>
              </h2>
              <p className="lead mt-3" style={{ color: 'var(--lovers-ink)', opacity: .85 }}>
                A avaliação será aberta durante o período definido pela organização. Os critérios oficiais estarão disponíveis no formulário. Os resultados do Sweet & Coffee Week Awards serão divulgados nos canais oficiais do festival.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lovers-red)' }}><I.check /></span>
                  <span>Avalie apenas os combos que você experimentou</span>
                </li>
                <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lovers-red)' }}><I.check /></span>
                  <span>Os critérios de avaliação estarão disponíveis no formulário</span>
                </li>
                <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--lovers-red)' }}><I.check /></span>
                  <span>A avaliação será aberta durante o período do festival</span>
                </li>
              </ul>
            </div>

            <div className="card" style={{
              background: 'var(--bg-card)',
              borderColor: 'rgba(135,14,45,.15)',
              position: 'relative',
              padding: 'clamp(28px, 4vw, 48px)',
            }}>
              <div className="mono mb-3" style={{ color: 'var(--lovers-red)' }}>FORMULÁRIO DE AVALIAÇÃO · PREVIEW</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: .5 }}>
                <FormFieldPH label="Seu nome" placeholder="Como gostaria de ser identificado(a)" />
                <FormFieldPH label="Combo avaliado" type="select" options={['Selecione um combo participante']} />
                <FormFieldPH label="Criatividade" type="select" options={['Selecione um combo participante']} />
                <FormFieldPH label="Atendimento" type="select" options={['Selecione um combo participante']} />
                <FormFieldPH label="Apresentação" type="select" options={['Selecione um combo participante']} />
                <FormFieldPH label="Comentário (opcional)" type="textarea" placeholder="Deixe uma mensagem sobre sua experiência" />
              </div>

              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,241,230,.7)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
                  <div style={{
                    width: 64, height: 64, margin: '0 auto 20px',
                    borderRadius: 999,
                    background: 'var(--lovers-red)',
                    color: 'var(--lovers-cream)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <I.starFill width={26} height={26} />
                  </div>
                  <div className="h-3" style={{ color: 'var(--lovers-ink)' }}>O formulário de avaliação da edição Sweet & Coffee Week Lovers estará disponível em breve.</div>
                  <p className="text-mute mt-2" style={{ fontSize: 14 }}>Volte durante a edição para avaliar os combos que você experimentou.</p>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section .wrap > div[style*="1.4fr"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}
