import React from 'react'
import { I } from '../../components/icons'
import { FormFieldPH } from '../../components/placeholders'

export function AwardsPage({ navigate, mode }) {
  if (mode === 'coming-soon') {
    return (
      <div className="page-enter kv-lovers lovers-gradient-bg" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

        <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 56px', position: 'relative' }}>
          <div className="wrap">
            <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <span className="tag tag-lovers">SWEET & COFFEE WEEK AWARDS</span>
              </div>
              <h1 className="lovers-h1" style={{ fontSize: 'clamp(48px, 7vw, 96px)', margin: 0 }}>
                Premiação<br/>
                <span style={{ color: 'var(--lovers-pink)' }}>em breve.</span>
              </h1>
              <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .82, marginTop: 24, lineHeight: 1.6 }}>
                Em breve você poderá avaliar os combos da edição Lovers e participar da escolha dos destaques do Sweet &amp; Coffee Week Awards.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'clamp(16px, 2vw, 24px)',
              maxWidth: 720,
              margin: '48px auto 0',
            }}>
              {[
                { label: 'Avaliação dos combos',    status: 'Em breve' },
                { label: 'Participação do público', status: 'Em breve' },
                { label: 'Resultado dos destaques', status: 'Em breve' },
              ].map((item) => (
                <div key={item.label} style={{
                  padding: 24,
                  background: 'var(--lovers-cream)',
                  borderRadius: 18,
                  border: '1px solid rgba(135,14,45,.2)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'var(--font-lovers-body)', fontWeight: 700, fontSize: 14, color: 'var(--lovers-ink)', marginBottom: 8 }}>
                    {item.label}
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--lovers-red)' }}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 40 }}>
              <a href="#/lovers"
                 onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
                 className="btn btn-lovers">
                Voltar para a edição <I.arrow />
              </a>
            </div>
          </div>
        </section>

        <style>{`
          @media (max-width: 600px) {
            div[style*="repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="page-enter kv-lovers lovers-gradient-bg" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 190, height: 190, top: -50, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 120, height: 120, top: 20, right: '6%' }} />
        </div>
        <span className="lovers-sticker lovers-sticker--pink" style={{ position: 'absolute', top: 16, right: 18, transform: 'rotate(-8deg)', zIndex: 3 }} aria-hidden="true">avalie!</span>
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 24, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              PREMIAÇÃO LOVERS
            </div>
            <h1 className="lovers-h1" style={{ fontSize: 'clamp(40px, 6vw, 84px)', margin: 0 }}>
              Provou? Agora<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>conte pra gente.</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-script)', fontSize: 32, color: 'var(--lovers-red)', margin: '20px 0 0', transform: 'rotate(-1deg)', display: 'inline-block' }}>
              Depois de viver a rota, chega a hora de escolher os destaques da edição.
            </p>
            <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .82, marginTop: 24 }}>
              A avaliação dos combos será liberada em breve. Enquanto isso, vá salvando seus favoritos, montando sua rota e preparando suas apostas.
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
            <h2 className="lovers-h2 mt-3" style={{ color: 'var(--lovers-cream)' }}>Como você vai participar.</h2>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { n: '01', icon: 'plate',  t: 'Prove', b: 'Visite os participantes e descubra as criações da edição Lovers.' },
              { n: '02', icon: 'star',   t: 'Avalie', b: 'Quando a votação abrir, conte quais combos conquistaram você.' },
              { n: '03', icon: 'heart',  t: 'Torça', b: 'Acompanhe os destaques da edição e compartilhe seus favoritos.' },
              { n: '04', icon: 'check',  t: 'Compartilhe', b: 'Marque os amigos, poste sua rota e mostre seu momento Sweet.' },
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
              <div className="eyebrow" style={{ color: 'var(--lovers-red)' }}><span className="dot" style={{ background: 'var(--lovers-red)' }}></span>EM BREVE</div>
              <h2 className="lovers-h2 mt-3">
                A votação ainda<br/><span style={{ color: 'var(--lovers-burgundy)' }}>não começou.</span>
              </h2>
              <p className="lead mt-3" style={{ color: 'var(--lovers-ink)', opacity: .85 }}>
                A avaliação será aberta durante o período definido pela organização. Quando estiver disponível, você poderá avaliar os combos que experimentou e ajudar a escolher os destaques da edição.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                <a href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }} className="btn btn-lovers">
                  Ver participantes <I.arrow />
                </a>
                <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }} className="btn btn-lovers-outline">
                  <I.route /> Abrir mapa da Doçura
                </a>
              </div>
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
