import React from 'react'
import { I } from '../../components/icons'

const darkFieldBase = {
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  padding: '14px 16px',
  border: '1px solid rgba(255,244,236,.22)',
  borderRadius: 12,
  background: 'rgba(255,244,236,.05)',
  color: 'var(--bg)',
  outline: 'none',
  width: '100%',
}

function DarkField({ label, placeholder, type = 'text', full = false, options }) {
  if (type === 'select') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
        <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,244,236,.55)' }}>{label}</span>
        <select style={darkFieldBase}>
          <option value="">{placeholder || 'Selecione'}</option>
          {(options || []).map((o, i) => <option key={i} style={{ color: 'var(--ink)' }}>{o}</option>)}
        </select>
      </label>
    )
  }
  if (type === 'textarea') {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
        <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,244,236,.55)' }}>{label}</span>
        <textarea rows={4} placeholder={placeholder} style={{ ...darkFieldBase, resize: 'vertical', minHeight: 110 }} />
      </label>
    )
  }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
      <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,244,236,.55)' }}>{label}</span>
      <input type={type} placeholder={placeholder} style={darkFieldBase} />
    </label>
  )
}

export function ApoiarPage({ navigate }) {
  const opcoes = [
    { t: 'Patrocínio financeiro', d: 'Cota oficial da próxima edição' },
    { t: 'Apoio institucional',   d: 'Instituições parceiras do festival' },
    { t: 'Permuta / produto',     d: 'Produto, insumo ou serviço' },
    { t: 'Ativação de marca',     d: 'Experiências da sua marca no evento' },
    { t: 'Mídia / divulgação',    d: 'Veículos e canais de comunicação' },
    { t: 'Espaço / local',        d: 'Pontos físicos para ações do festival' },
    { t: 'Outro',                 d: 'Tem uma proposta diferente?' },
  ]
  return (
    <div className="page-enter">
      <section style={{ padding: 'clamp(48px, 7vw, 96px) 0', position: 'relative' }}>
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>APOIAR O FESTIVAL</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'clamp(28px, 5vw, 80px)', alignItems: 'start', marginTop: 24 }}>
            <div>
              <h1 className="hero-inst__title" style={{ fontSize: 'clamp(48px, 7.5vw, 120px)' }}>
                Sua marca quer<br/>
                <span style={{ fontStyle: 'italic' }}>apoiar</span> o Sweet?
              </h1>
              <p className="lead mt-4">
                O Sweet & Coffee Week conecta marcas a uma comunidade engajada, criativa e apaixonada por experiências gastronômicas.
              </p>
              <p className="text-mute mt-3" style={{ fontSize: 15 }}>
                Empresas interessadas podem apoiar próximas edições por meio de patrocínio, ativações, mídia, produto, espaço, apoio institucional ou outras formas de parceria.
              </p>

              <div style={{ marginTop: 40 }}>
                <div className="mono mb-3 text-mute">TIPOS DE APOIO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {opcoes.map((o, i) => (
                    <div key={i} style={{ padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg-card)' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{o.t}</div>
                      <div className="text-mute" style={{ fontSize: 12, marginTop: 2 }}>{o.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form className="card" style={{ padding: 'clamp(28px, 4vw, 48px)', background: 'var(--ink)', color: 'var(--bg)', border: 0 }}
                  onSubmit={(e) => e.preventDefault()}>
              <div className="mono mb-4" style={{ color: 'var(--peach)' }}>FORMULÁRIO DE APOIO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <DarkField full label="Nome da empresa" placeholder="Empresa interessada" />
                <DarkField label="Nome do responsável" placeholder="Seu nome" />
                <DarkField label="Cargo" placeholder="Sua função na empresa" />
                <DarkField label="WhatsApp" placeholder="(00) 00000-0000" />
                <DarkField label="E-mail" type="email" placeholder="contato@empresa.com" />
                <DarkField full label="Instagram ou site" placeholder="@empresa  ·  empresa.com.br" />
                <DarkField full label="Tipo de interesse" type="select" options={opcoes.map(o => o.t)} />
                <DarkField full label="Mensagem" type="textarea"
                  placeholder="Conta um pouco sobre sua marca e o tipo de apoio que vocês imaginam" />
              </div>
              <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 11, color: 'rgba(255,244,236,.55)' }}>NOSSA EQUIPE COMERCIAL ENTRA EM CONTATO</span>
                <button className="btn btn-accent btn-lg">Quero apoiar o Sweet <I.arrow /></button>
              </div>
            </form>
          </div>
        </div>
        <style>{`
          @media (max-width: 980px) {
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
