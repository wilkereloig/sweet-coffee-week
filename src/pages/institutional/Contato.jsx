import React from 'react'
import { I } from '../../components/icons'

export function ContatoPage({ navigate }) {
  return (
    <div className="page-enter">
      <section style={{ padding: 'clamp(48px, 7vw, 96px) 0 32px' }}>
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>CONTATO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'clamp(28px, 5vw, 80px)', alignItems: 'end', marginTop: 16 }}
               className="contato-hero">
            <h1 className="hero-inst__title" style={{ fontSize: 'clamp(48px, 8vw, 128px)' }}>
              Vamos<br/>
              <span style={{ fontStyle: 'italic' }}>conversar?</span>
            </h1>
            <p className="lead" style={{ paddingBottom: 8 }}>
              Imprensa, comercial, organização, dúvidas do público — escolha o canal e a gente responde.
            </p>
          </div>
        </div>
        <style>{`
          @media (max-width: 880px) {
            .contato-hero { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="contato-grid">
            {[
              { tag: 'GERAL',      t: 'Fale com a organização',    d: 'Dúvidas, parcerias e informações sobre o festival.',           c: 'contato@sweetcoffeeweek.com.br',  btn: 'Enviar e-mail' },
              { tag: 'IMPRENSA',   t: 'Pauta, entrevista, release', d: 'Material de imprensa e contato da assessoria.',               c: 'imprensa@sweetcoffeeweek.com.br',  btn: 'Enviar e-mail' },
              { tag: 'COMERCIAL',  t: 'Patrocínio e parcerias',     d: 'Quer apoiar a próxima edição? Falamos com sua marca.',         c: 'comercial@sweetcoffeeweek.com.br', btn: 'Enviar e-mail' },
              { tag: 'PARTICIPAR', t: 'Sua marca quer participar?', d: 'Para docerias, cafeterias e marcas gastronômicas.',            c: 'Formulário rápido de interesse',  btn: 'Abrir formulário', route: '/participar' },
            ].map((c, i) => (
              <div key={i} className="card" style={{ padding: 32 }}>
                <span className="tag tag-accent">{c.tag}</span>
                <div className="h-2 mt-3" style={{ fontSize: 28 }}>{c.t}</div>
                <p className="text-mute mt-3" style={{ fontSize: 15 }}>{c.d}</p>
                <div className="mono mt-4" style={{ color: 'var(--accent)' }}>{c.c}</div>
                <a href={c.route || `mailto:${c.c}`}
                   onClick={(e) => { if (c.route) { e.preventDefault(); navigate(c.route) } }}
                   className="btn btn-secondary mt-3 btn-sm">
                  {c.btn} <I.arrow />
                </a>
              </div>
            ))}
          </div>

          <div className="contato-row mt-5">
            <div className="card" style={{ padding: 32, background: 'var(--ink)', color: 'var(--bg)', border: 0 }}>
              <div className="mono mb-2" style={{ color: 'var(--peach)' }}>REALIZAÇÃO</div>
              <div className="h-2" style={{ color: 'var(--bg)' }}>F2 Experience</div>
              <p style={{ color: 'rgba(255,244,236,.7)', marginTop: 14, fontSize: 15 }}>
                Empresa responsável pela elaboração, criação e execução do Sweet & Coffee Week.
              </p>
              <a href="https://f2experience.com.br" target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-4 btn-sm">Site da F2 <I.arrow /></a>
            </div>
            <div className="card" style={{ padding: 32 }}>
              <div className="mono mb-2 text-mute">REDES SOCIAIS</div>
              <div className="h-2" style={{ fontSize: 26 }}>@sweetcoffeeweek</div>
              <p className="text-mute mt-3" style={{ fontSize: 15 }}>
                Acompanhe o festival, novidades de edição e bastidores no Instagram.
              </p>
              <a href="https://www.instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-3 btn-sm">
                <I.ig width={14} height={14} /> Abrir Instagram
              </a>
            </div>
          </div>
        </div>

        <style>{`
          .contato-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .contato-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media (max-width: 880px) {
            .contato-grid, .contato-row { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    </div>
  )
}
