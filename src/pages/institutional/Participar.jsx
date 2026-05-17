import React from 'react'
import { I } from '../../components/icons'
import { FormFieldPH } from '../../components/placeholders'

export function ParticiparPage({ navigate }) {
  return (
    <div className="page-enter">
      <section style={{ padding: 'clamp(48px, 7vw, 96px) 0' }}>
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>PARTICIPAR DA PRÓXIMA EDIÇÃO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'clamp(28px, 5vw, 80px)', alignItems: 'start', marginTop: 24 }}>
            <div>
              <h1 className="hero-inst__title" style={{ fontSize: 'clamp(48px, 7.5vw, 120px)' }}>
                Sua marca quer<br/>
                <span style={{ fontStyle: 'italic' }}>participar</span><br/>
                do Sweet?
              </h1>
              <p className="lead mt-4">
                O Sweet & Coffee Week reúne marcas gastronômicas que querem criar combos especiais, atrair novos públicos e fazer parte de uma experiência coletiva pela cidade.
              </p>
              <p className="text-mute mt-3" style={{ fontSize: 15 }}>
                Se sua marca tem interesse em participar de uma próxima edição, deixe seus dados. Vamos retomar o contato quando abrirem inscrições.
              </p>

              <div style={{ marginTop: 40 }}>
                <div className="mono mb-3 text-mute">QUEM PODE PARTICIPAR</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: 'donut',     t: 'Docerias' },
                    { icon: 'croissant', t: 'Confeitarias' },
                    { icon: 'cup',       t: 'Cafeterias' },
                    { icon: 'plate',     t: 'Restaurantes' },
                    { icon: 'star',      t: 'Marcas gastronômicas' },
                    { icon: 'heartLine', t: 'Negócios afetivos' },
                  ].map((p, i) => {
                    const Ic = I[p.icon] || I.cup
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg-card)' }}>
                        <span style={{ color: 'var(--accent)' }}><Ic width={20} height={20} /></span>
                        <span style={{ fontSize: 14 }}>{p.t}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <form className="card" style={{ padding: 'clamp(28px, 4vw, 48px)' }} onSubmit={(e) => e.preventDefault()}>
              <div className="mono mb-4" style={{ color: 'var(--accent)' }}>FORMULÁRIO DE INTERESSE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <FormFieldPH full label="Nome da marca" placeholder="Como sua marca se chama" />
                <FormFieldPH label="Nome do responsável" placeholder="Seu nome" />
                <FormFieldPH label="Cargo / função" placeholder="Sócio(a), gerente..." />
                <FormFieldPH label="WhatsApp" placeholder="(00) 00000-0000" />
                <FormFieldPH label="E-mail" type="email" placeholder="contato@suamarca.com" />
                <FormFieldPH label="Instagram" placeholder="@suamarca" />
                <FormFieldPH label="Bairro / cidade" placeholder="Petrópolis · Natal/RN" />
                <FormFieldPH full label="Tipo de negócio" type="select"
                  options={['Doceria', 'Confeitaria', 'Cafeteria', 'Restaurante', 'Marca gastronômica', 'Outro']} />
                <FormFieldPH full label="Tem ponto físico?" type="select"
                  options={['Sim, com atendimento ao público', 'Sim, apenas produção', 'Não, somente delivery', 'Em estruturação']} />
                <FormFieldPH full label="Mensagem" type="textarea"
                  placeholder="Conta um pouco sobre sua marca, o que vocês fazem de melhor e por que querem fazer parte do Sweet" />
              </div>
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span className="mono text-mute" style={{ fontSize: 11 }}>RESPONDEMOS EM ATÉ 7 DIAS ÚTEIS</span>
                <button className="btn btn-primary btn-lg">Tenho interesse em participar <I.arrow /></button>
              </div>

              <style>{`
                @media (max-width: 880px) {
                  form > div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
                }
              `}</style>
            </form>
          </div>
        </div>
        <style>{`
          @media (max-width: 880px) {
            section .wrap > div[style*="1.1fr 1fr"] { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 560px) {
            section .wrap > div > div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    </div>
  )
}
