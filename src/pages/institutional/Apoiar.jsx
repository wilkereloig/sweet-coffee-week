import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'

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

function PartnerPath({ title, body, icon }) {
  const Icon = I[icon] || I.star
  return (
    <article className="partner-path">
      <Icon width={24} height={24} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

export function ApoiarPage({ navigate }) {
  const opcoes = [
    'Patrocínio oficial',
    'Apoio institucional',
    'Ativação de marca',
    'Produto / insumo / serviço',
    'Mídia e divulgação',
    'Espaço para experiência',
    'Premiação / brindes',
    'Outra proposta',
  ]

  return (
    <div className="page-enter apoiar-page">
      <section className="apoiar-hero">
        <div className="wrap apoiar-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Para parceiros e patrocinadores</span>
            <h1>Associe sua marca à temporada mais doce de Natal.</h1>
            <p className="lead">
              O Sweet & Coffee Week conecta marcas a um público urbano, engajado e interessado em gastronomia, experiência, lifestyle, circulação pela cidade e consumo local.
            </p>
            <div className="apoiar-hero__actions">
              <a href="#form-apoiar" className="btn btn-accent btn-lg">Tenho interesse <I.arrow /></a>
              <a href="#/contato" className="btn btn-secondary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/contato') }}>Falar com a organização</a>
            </div>
          </div>
          <div className="apoiar-hero__media">
            <PhotoEditorial label="ATIVAÇÃO DE MARCA" caption="Marcas podem entrar no festival por patrocínio, experiência, produto, mídia ou ação promocional." aspect="4/5" tone="dark" />
          </div>
        </div>
      </section>

      <section className="section apoiar-photo-band">
        <div className="wrap apoiar-photo-grid">
          <div className="apoiar-photo-grid__wide"><PhotoEditorial label="PÚBLICO EM ROTA" caption="Pessoas circulando, fotografando e compartilhando experiências da edição." aspect="16/9" tone="warm" /></div>
          <PhotoEditorial label="PONTO DE VENDA" caption="Presença de marca, vitrine e comunicação no local." aspect="4/5" tone="cream" />
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap apoiar-intro">
          <div>
            <span className="eyebrow"><span className="dot"></span>Plataforma de marca</span>
            <h2>O Sweet é mídia, experiência e cidade ao mesmo tempo.</h2>
          </div>
          <p>
            Apoiar o Sweet significa participar de uma campanha com narrativa própria, presença digital, circulação em lojas, relacionamento com empreendedores, conteúdo espontâneo do público e alto potencial de ativação local.
          </p>
        </div>
      </section>

      <section className="section apoiar-paths-section">
        <div className="wrap">
          <div className="apoiar-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Formas de apoio</span>
              <h2>Da cota oficial à experiência personalizada.</h2>
            </div>
          </div>
          <div className="partner-path-grid">
            <PartnerPath title="Patrocínio" body="Cotas para marcas que querem aparecer como apoiadoras oficiais da edição e da comunicação do festival." icon="star" />
            <PartnerPath title="Ativação" body="Ações presenciais ou digitais que conectam sua marca à rota, aos participantes e aos Sweet Lovers." icon="heart" />
            <PartnerPath title="Produto ou serviço" body="Apoios por meio de brindes, insumos, experiências, tecnologia, mídia, espaço ou premiações." icon="plate" />
            <PartnerPath title="Institucional" body="Parcerias com entidades, instituições, shoppings, projetos de cidade, turismo, cultura e economia criativa." icon="pin" />
          </div>
        </div>
      </section>

      <section id="form-apoiar" className="section apoiar-form-section">
        <div className="wrap apoiar-form-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Proposta comercial</span>
            <h2>Conte como sua marca quer entrar no Sweet.</h2>
            <p>
              A partir do interesse, a organização pode avaliar possibilidades de patrocínio, apoio, mídia, ativações, brindes, experiências presenciais ou ações sob medida para próximas edições.
            </p>
          </div>

          <form className="card apoiar-form" onSubmit={(e) => e.preventDefault()}>
            <div className="mono mb-4" style={{ color: 'var(--peach)' }}>FORMULÁRIO DE APOIO</div>
            <div className="apoiar-form__fields">
              <DarkField full label="Nome da empresa" placeholder="Empresa interessada" />
              <DarkField label="Nome do responsável" placeholder="Seu nome" />
              <DarkField label="Cargo" placeholder="Sua função na empresa" />
              <DarkField label="WhatsApp" placeholder="(00) 00000-0000" />
              <DarkField label="E-mail" type="email" placeholder="contato@empresa.com" />
              <DarkField full label="Instagram ou site" placeholder="@empresa  ·  empresa.com.br" />
              <DarkField full label="Tipo de interesse" type="select" options={opcoes} />
              <DarkField full label="Mensagem" type="textarea" placeholder="Conte um pouco sobre sua marca e o tipo de apoio que vocês imaginam" />
            </div>
            <div className="apoiar-form__footer">
              <span className="mono">CONTATO COMERCIAL PARA PRÓXIMAS EDIÇÕES</span>
              <button className="btn btn-accent btn-lg">Enviar proposta <I.arrow /></button>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        .apoiar-hero { padding: clamp(54px, 8vw, 112px) 0 48px; }
        .apoiar-hero__grid { display: grid; grid-template-columns: 1.08fr .92fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .apoiar-hero h1, .apoiar-intro h2, .apoiar-section-head h2, .apoiar-form-grid h2 { font-family: var(--font-serif); font-size: clamp(48px, 7vw, 118px); line-height: .9; letter-spacing: -.055em; margin: 18px 0 0; color: var(--ink); }
        .apoiar-hero h1 { max-width: 11ch; }
        .apoiar-hero .lead { color: var(--ink-soft); max-width: 58ch; line-height: 1.65; }
        .apoiar-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .apoiar-hero__media { border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(43,24,16,.16); }
        .apoiar-photo-band { padding-top: 24px; }
        .apoiar-photo-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 18px; align-items: stretch; }
        .apoiar-photo-grid__wide > figure, .apoiar-photo-grid > figure { height: 100%; min-height: 440px; aspect-ratio: auto !important; }
        .apoiar-intro { display: grid; grid-template-columns: .95fr 1.05fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .apoiar-intro p { color: var(--ink-soft); font-size: 18px; line-height: 1.7; }
        .apoiar-section-head { margin-bottom: 34px; }
        .partner-path-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .partner-path { background: var(--bg-card); border: 1px solid var(--line); border-radius: 22px; padding: 26px; min-height: 260px; display: flex; flex-direction: column; }
        .partner-path svg { color: var(--accent); margin-bottom: 26px; }
        .partner-path h3 { font-size: 24px; line-height: 1.05; margin: 0; color: var(--ink); }
        .partner-path p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: auto 0 0; }
        .apoiar-form-section { background: var(--ink); color: var(--bg); }
        .apoiar-form-grid { display: grid; grid-template-columns: .75fr 1.25fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .apoiar-form-grid h2 { color: var(--bg); }
        .apoiar-form-grid p { color: rgba(255,244,236,.72); line-height: 1.7; }
        .apoiar-form { padding: clamp(28px, 4vw, 48px); background: rgba(255,244,236,.04); color: var(--bg); border-color: rgba(255,244,236,.12); }
        .apoiar-form__fields { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .apoiar-form__footer { margin-top: 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .apoiar-form__footer span { font-size: 11px; color: rgba(255,244,236,.55); }
        @media (max-width: 1040px) {
          .apoiar-hero__grid, .apoiar-photo-grid, .apoiar-intro, .apoiar-form-grid { grid-template-columns: 1fr; }
          .partner-path-grid { grid-template-columns: repeat(2, 1fr); }
          .apoiar-photo-grid__wide > figure, .apoiar-photo-grid > figure { min-height: 340px; }
        }
        @media (max-width: 640px) { .partner-path-grid, .apoiar-form__fields { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
