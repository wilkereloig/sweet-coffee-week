import React from 'react'
import { I } from '../../components/icons'
import { FormFieldPH, PhotoEditorial } from '../../components/placeholders'

function Benefit({ title, body, icon }) {
  const Icon = I[icon] || I.star
  return (
    <article className="participar-benefit">
      <Icon width={24} height={24} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

export function ParticiparPage({ navigate }) {
  const benefits = [
    ['Visibilidade local', 'Sua marca entra em uma campanha de cidade, com público buscando novidades e rotas gastronômicas.', 'star'],
    ['Produto exclusivo', 'O combo permite testar uma criação autoral, contar uma história e gerar desejo por tempo limitado.', 'plate'],
    ['Tráfego em loja', 'O mapa, a divulgação e o tema ajudam o público a transformar a visita em programa.', 'pin'],
    ['Conteúdo compartilhável', 'Fotos, vitrines, bastidores e avaliações ampliam a presença da marca nas redes.', 'heart'],
  ]

  return (
    <div className="page-enter participar-page">
      <section className="participar-hero">
        <div className="wrap participar-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Para marcas gastronômicas</span>
            <h1>Faça sua marca entrar na rota do Sweet.</h1>
            <p className="lead">
              O Sweet & Coffee Week é uma vitrine para docerias, cafeterias, confeitarias, restaurantes, sorveterias e marcas autorais que querem criar uma experiência especial e atrair novos públicos.
            </p>
            <div className="participar-hero__actions">
              <a href="#form-participar" className="btn btn-primary btn-lg">Tenho interesse <I.arrow /></a>
              <a href="#/edicoes" className="btn btn-secondary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}>Ver histórico</a>
            </div>
          </div>
          <div className="participar-hero__photo">
            <PhotoEditorial label="MARCA PARTICIPANTE" caption="Combo exclusivo, vitrine preparada e experiência para os Sweet Lovers." aspect="4/5" tone="warm" />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap participar-intro">
          <div>
            <span className="eyebrow"><span className="dot"></span>O que a marca cria</span>
            <h2>Um combo com história, não só um produto.</h2>
          </div>
          <p>
            A cada edição, os participantes recebem um tema central e desenvolvem uma criação exclusiva. O combo pode explorar ingredientes, referências afetivas, apresentação, embalagem, decoração em loja, narrativa de divulgação e uma experiência completa para o público.
          </p>
        </div>
      </section>

      <section className="section participar-benefits-section">
        <div className="wrap">
          <div className="participar-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Por que participar</span>
              <h2>O festival conecta criação, venda e comunidade.</h2>
            </div>
          </div>
          <div className="participar-benefits-grid">
            {benefits.map(([title, body, icon]) => <Benefit key={title} title={title} body={body} icon={icon} />)}
          </div>
        </div>
      </section>

      <section className="section participar-dark">
        <div className="wrap participar-dark__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Quem pode participar</span>
            <h2>Marcas com produto, experiência e vontade de criar.</h2>
          </div>
          <div className="participar-types">
            {[
              'Docerias',
              'Confeitarias',
              'Cafeterias',
              'Restaurantes',
              'Sorveterias',
              'Marcas autorais',
              'Empórios',
              'Negócios gastronômicos com atendimento ao público',
            ].map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section id="form-participar" className="section participar-form-section">
        <div className="wrap participar-form-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Cadastro de interesse</span>
            <h2>Deixe sua marca no radar da próxima edição.</h2>
            <p>
              Este formulário funciona como pré-cadastro. Quando uma nova edição estiver em fase de curadoria, a organização poderá entrar em contato com marcas alinhadas ao formato e ao momento do festival.
            </p>
          </div>

          <form className="card participar-form" onSubmit={(e) => e.preventDefault()}>
            <div className="mono mb-4" style={{ color: 'var(--accent)' }}>FORMULÁRIO DE INTERESSE</div>
            <div className="participar-form__fields">
              <FormFieldPH full label="Nome da marca" placeholder="Como sua marca se chama" />
              <FormFieldPH label="Nome do responsável" placeholder="Seu nome" />
              <FormFieldPH label="Cargo / função" placeholder="Sócio(a), gerente..." />
              <FormFieldPH label="WhatsApp" placeholder="(00) 00000-0000" />
              <FormFieldPH label="E-mail" type="email" placeholder="contato@suamarca.com" />
              <FormFieldPH label="Instagram" placeholder="@suamarca" />
              <FormFieldPH label="Bairro / cidade" placeholder="Petrópolis · Natal/RN" />
              <FormFieldPH full label="Tipo de negócio" type="select" options={['Doceria', 'Confeitaria', 'Cafeteria', 'Restaurante', 'Sorveteria', 'Marca gastronômica', 'Outro']} />
              <FormFieldPH full label="Tem ponto físico?" type="select" options={['Sim, com atendimento ao público', 'Sim, apenas produção', 'Não, somente delivery', 'Em estruturação']} />
              <FormFieldPH full label="Mensagem" type="textarea" placeholder="Conte um pouco sobre sua marca, seus produtos principais e por que quer fazer parte do Sweet" />
            </div>
            <div className="participar-form__footer">
              <span className="mono text-mute">PRÉ-CADASTRO PARA PRÓXIMAS EDIÇÕES</span>
              <button className="btn btn-primary btn-lg">Enviar interesse <I.arrow /></button>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        .participar-hero { padding: clamp(54px, 8vw, 112px) 0 48px; }
        .participar-hero__grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .participar-hero h1, .participar-intro h2, .participar-section-head h2, .participar-dark h2, .participar-form-grid h2 { font-family: var(--font-serif); font-size: clamp(48px, 7vw, 116px); line-height: .9; letter-spacing: -.055em; margin: 18px 0 0; color: var(--ink); }
        .participar-hero h1 { max-width: 10ch; }
        .participar-hero .lead { max-width: 58ch; color: var(--ink-soft); line-height: 1.65; }
        .participar-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .participar-hero__photo { box-shadow: 0 24px 70px rgba(43,24,16,.16); border-radius: 24px; overflow: hidden; }
        .participar-intro { display: grid; grid-template-columns: .95fr 1.05fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .participar-intro p { color: var(--ink-soft); font-size: 18px; line-height: 1.7; }
        .participar-section-head { margin-bottom: 34px; }
        .participar-benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .participar-benefit { border: 1px solid var(--line); background: var(--bg-card); border-radius: 22px; padding: 26px; min-height: 250px; display: flex; flex-direction: column; }
        .participar-benefit svg { color: var(--accent); margin-bottom: 26px; }
        .participar-benefit h3 { font-size: 24px; line-height: 1.05; margin: 0; color: var(--ink); }
        .participar-benefit p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: auto 0 0; }
        .participar-dark { background: var(--ink); color: var(--bg); }
        .participar-dark__grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .participar-dark h2 { color: var(--bg); }
        .participar-types { display: flex; flex-wrap: wrap; gap: 10px; }
        .participar-types span { border: 1px solid rgba(255,244,236,.18); background: rgba(255,244,236,.05); color: var(--peach); border-radius: 999px; padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
        .participar-form-grid { display: grid; grid-template-columns: .75fr 1.25fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .participar-form-grid p { color: var(--ink-soft); line-height: 1.7; }
        .participar-form { padding: clamp(28px, 4vw, 48px); }
        .participar-form__fields { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .participar-form__footer { margin-top: 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        @media (max-width: 1040px) {
          .participar-hero__grid, .participar-intro, .participar-dark__grid, .participar-form-grid { grid-template-columns: 1fr; }
          .participar-benefits-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .participar-benefits-grid, .participar-form__fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
