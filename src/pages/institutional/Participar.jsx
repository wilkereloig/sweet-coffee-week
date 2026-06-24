import React from 'react'
import { I } from '../../components/icons'
import { FormFieldPH, PhotoEditorial } from '../../components/placeholders'

function Benefit({ title, body, icon, tone }) {
  const Icon = I[icon] || I.star
  return (
    <article className={`participar-benefit participar-benefit--${tone}`}>
      <span className="participar-benefit__badge"><Icon width={24} height={24} /></span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function Step({ n, title, body, tone, last }) {
  return (
    <article className={`participar-step participar-step--${tone}${last ? ' participar-step--last' : ''}`}>
      <span className="participar-step__num">{n}</span>
      <div className="participar-step__body">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  )
}

export function ParticiparPage({ navigate }) {
  const benefits = [
    ['Visibilidade local', 'Sua marca entra em uma campanha de cidade, com comunicação própria e público interessado em descobrir novidades.', 'star'],
    ['Tráfego em loja', 'O mapa, a divulgação e a lógica de rota ajudam a transformar a visita em programa.', 'pin'],
    ['Produto exclusivo', 'O combo permite criar algo autoral, limitado e conectado a um tema com alto potencial de desejo.', 'plate'],
    ['Conteúdo compartilhável', 'Fotos, vídeos, stories, avaliações e indicações ampliam a presença da marca nas redes.', 'ig'],
    ['Relacionamento com novos públicos', 'O Sweet & Coffee Week leva consumidores a conhecerem marcas que talvez ainda não fizessem parte da rotina deles.', 'heart'],
    ['Memória de marca', 'Uma boa experiência no festival pode transformar uma visita pontual em lembrança, recomendação e retorno.', 'starFill'],
  ]

  const steps = [
    ['1', 'Cadastro de interesse', 'A marca preenche o formulário e entra no radar da organização.'],
    ['2', 'Curadoria', 'A equipe avalia perfil, estrutura, localização, proposta e alinhamento com o formato da edição.'],
    ['3', 'Apresentação do tema', 'Os participantes selecionados recebem o conceito criativo da edição e as orientações de participação.'],
    ['4', 'Criação do combo', 'Cada marca desenvolve sua proposta exclusiva, conectando sabor, narrativa e experiência.'],
    ['5', 'Divulgação e rota', 'A marca entra no site, no mapa, na comunicação da edição e nas ações de divulgação do festival.'],
    ['6', 'Sweet Awards', 'O público avalia os participantes e ajuda a reconhecer os destaques da temporada.'],
  ]

  return (
    <div className="page-enter participar-page">
      <section className="participar-hero">
        <img src="/images/shapes/shape-arrow-yellow.svg" alt="" aria-hidden="true" className="participar-shape participar-shape--hero-arrow" />
        <img src="/images/shapes/shape-flower-coral.svg" alt="" aria-hidden="true" className="participar-shape participar-shape--hero-flower" />
        <div className="wrap participar-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Para estabelecimentos</span>
            <h1>Faça sua marca entrar na <span className="participar-hl">rota</span> do Sweet &amp; Coffee Week.</h1>
            <p className="lead">
              O Sweet &amp; Coffee Week é uma plataforma de visibilidade para docerias, cafeterias, confeitarias, restaurantes, sorveterias e marcas gastronômicas que querem criar uma experiência exclusiva, atrair público e fazer parte de uma das temporadas mais aguardadas de Natal.
            </p>
            <p className="lead">
              Participar do Sweet &amp; Coffee Week é transformar um produto em história, uma visita em experiência e uma edição em oportunidade de relacionamento com novos clientes.
            </p>
            <div className="participar-hero__actions">
              <a href="#form-participar" className="btn btn-primary btn-lg">Tenho interesse em participar <I.arrow /></a>
              <a href="#/edicoes" className="btn btn-secondary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}>Ver histórico do festival</a>
            </div>
          </div>
          <div className="participar-hero__photo">
            <PhotoEditorial label="MARCA PARTICIPANTE" caption="Combo exclusivo, vitrine preparada e experiência para o público do Sweet & Coffee Week." aspect="4/5" tone="warm" />
          </div>
        </div>
      </section>

      <section className="section participar-benefits-section">
        <img src="/images/shapes/shape-star-cyan.svg" alt="" aria-hidden="true" className="participar-shape participar-shape--benefits-star" />
        <div className="wrap">
          <div className="participar-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Valor para a marca</span>
              <h2>O festival conecta criação, venda e comunidade.</h2>
            </div>
            <div className="participar-section-head__text">
              <p>
                Durante o Sweet &amp; Coffee Week, a cidade entra em modo de descoberta. O público busca novidades, salva combos, marca amigos, monta rotas e visita estabelecimentos motivado pelo tema da edição.
              </p>
              <p>
                Para a marca participante, isso significa exposição, fluxo, conteúdo espontâneo, teste de produto, fortalecimento de posicionamento e conexão direta com consumidores que valorizam experiências locais.
              </p>
            </div>
          </div>
          <div className="participar-benefits-grid">
            {benefits.map(([title, body, icon], i) => <Benefit key={title} title={title} body={body} icon={icon} tone={['coral', 'cyan', 'yellow', 'coral', 'cyan', 'yellow'][i % 6]} />)}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap participar-intro">
          <div>
            <span className="eyebrow"><span className="dot"></span>O que a marca cria</span>
            <h2>Um combo com história, não só um produto.</h2>
          </div>
          <div className="participar-intro__body">
            <p>
              A cada edição, os participantes recebem um tema central e desenvolvem uma criação exclusiva. O combo deve traduzir esse tema em sabor, apresentação, nome, narrativa e experiência.
            </p>
            <div className="participar-combo-highlight">
              <span className="mono">O combo</span>
              <strong>1 doce + 1 salgado + 1 bebida</strong>
            </div>
            <p>
              Além do combo, a marca pode explorar embalagem, vitrine, ambientação, uniforme, decoração, ação em loja, conteúdo digital e qualquer detalhe que ajude o público a viver melhor a proposta da edição.
            </p>
          </div>
        </div>
      </section>

      <section className="section participar-dark">
        <div className="wrap participar-dark__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Quem pode participar</span>
            <h2>Marcas com produto, atendimento e vontade de criar.</h2>
            <p className="participar-dark__text">
              O Sweet &amp; Coffee Week é voltado para negócios gastronômicos que tenham capacidade de atender o público durante o período da edição e desenvolver uma experiência exclusiva alinhada ao tema.
            </p>
          </div>
          <div className="participar-types">
            {[
              'Docerias',
              'Confeitarias',
              'Cafeterias',
              'Restaurantes',
              'Sorveterias',
              'Empórios',
              'Marcas autorais',
              'Negócios gastronômicos com atendimento ao público',
            ].map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="section participar-process-section">
        <img src="/images/shapes/shape-badge-choco.svg" alt="" aria-hidden="true" className="participar-shape participar-shape--process-badge" />
        <div className="wrap">
          <div className="participar-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Processo</span>
              <h2>Como funciona o processo de participação.</h2>
            </div>
          </div>
          <div className="participar-steps-grid">
            {steps.map(([n, title, body], i) => <Step key={n} n={n} title={title} body={body} tone={['coral', 'cyan', 'yellow'][i % 3]} last={i === steps.length - 1} />)}
          </div>
        </div>
      </section>

      <section id="form-participar" className="section participar-form-section">
        <img src="/images/shapes/shape-flower-coral.svg" alt="" aria-hidden="true" className="participar-shape participar-shape--form-flower" />
        <div className="wrap participar-form-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Cadastro de interesse</span>
            <h2>Deixe sua marca no radar da próxima edição.</h2>
            <p>
              Este formulário funciona como pré-cadastro. Quando uma nova edição estiver em fase de curadoria, a organização poderá entrar em contato com marcas alinhadas ao formato, ao tema e ao momento do festival.
            </p>
          </div>

          <form className="card participar-form" onSubmit={(e) => e.preventDefault()}>
            <div className="mono mb-4" style={{ color: 'var(--accent)' }}>FORMULÁRIO DE INTERESSE</div>
            <div className="participar-form__fields">
              <FormFieldPH full label="Nome da marca" placeholder="Como sua marca se chama" />
              <FormFieldPH label="Nome do responsável" placeholder="Seu nome" />
              <FormFieldPH label="Cargo ou função" placeholder="Sócio(a), gerente..." />
              <FormFieldPH label="WhatsApp" placeholder="(00) 00000-0000" />
              <FormFieldPH label="E-mail" type="email" placeholder="contato@suamarca.com" />
              <FormFieldPH label="Instagram" placeholder="@suamarca" />
              <FormFieldPH label="Site, se houver" type="url" placeholder="suamarca.com.br" />
              <FormFieldPH label="Bairro" placeholder="Petrópolis" />
              <FormFieldPH label="Cidade" placeholder="Natal/RN" />
              <FormFieldPH full label="Tipo de negócio" type="select" options={['Doceria', 'Confeitaria', 'Cafeteria', 'Restaurante', 'Sorveteria', 'Empório', 'Marca autoral', 'Outro']} />
              <FormFieldPH full label="Tem ponto físico?" type="select" options={['Sim, com atendimento ao público', 'Sim, apenas produção', 'Não, somente delivery', 'Em estruturação']} />
              <FormFieldPH full label="Já participou do Sweet & Coffee Week?" type="select" options={['Ainda não participei', 'Sim, em uma edição', 'Sim, em mais de uma edição']} />
              <FormFieldPH full label="Quais produtos principais a marca oferece?" type="textarea" placeholder="Descreva os produtos e especialidades da sua marca" />
              <FormFieldPH full label="Por que quer participar do Sweet & Coffee Week?" type="textarea" placeholder="Conte o que motiva sua marca a fazer parte da próxima edição" />
              <FormFieldPH full label="Mensagem" type="textarea" placeholder="Algo mais que queira contar para a organização" />
            </div>
            <div className="participar-form__footer">
              <span className="mono text-mute">PRÉ-CADASTRO PARA PRÓXIMAS EDIÇÕES</span>
              <button className="btn btn-primary btn-lg">Enviar interesse <I.arrow /></button>
            </div>
            <p className="participar-form__note">
              O envio do formulário não garante participação automática. A entrada no festival depende de curadoria, disponibilidade de vagas e alinhamento com a edição.
            </p>
          </form>
        </div>
      </section>

      <style>{`
        /* SHAPES decorativos */
        .participar-page section { position: relative; overflow: hidden; }
        .participar-page .wrap { position: relative; z-index: 1; }
        .participar-shape { position: absolute; pointer-events: none; z-index: 0; user-select: none; }
        .participar-shape--hero-arrow { top: clamp(40px, 8vw, 96px); right: clamp(-30px, 2vw, 40px); width: clamp(90px, 12vw, 170px); transform: rotate(8deg); opacity: .9; }
        .participar-shape--hero-flower { bottom: -36px; left: -40px; width: clamp(120px, 14vw, 200px); transform: rotate(-12deg); opacity: .55; }
        .participar-shape--benefits-star { top: -34px; right: clamp(-26px, 3vw, 60px); width: clamp(70px, 9vw, 128px); transform: rotate(-10deg); opacity: .8; }
        .participar-shape--process-badge { bottom: -46px; left: -44px; width: clamp(120px, 15vw, 210px); transform: rotate(14deg); opacity: .5; }
        .participar-shape--form-flower { top: -50px; right: -50px; width: clamp(130px, 16vw, 220px); transform: rotate(18deg); opacity: .45; }

        .participar-hero { padding: clamp(54px, 8vw, 112px) 0 48px; }
        .participar-hero__grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .participar-hero h1, .participar-intro h2, .participar-section-head h2, .participar-dark h2, .participar-form-grid h2 { font-family: var(--font-serif); font-size: clamp(52px, 7.6vw, 128px); line-height: .88; letter-spacing: -.055em; margin: 18px 0 0; color: var(--ink); }
        .participar-hero h1 { max-width: 13ch; font-size: clamp(54px, 8.4vw, 140px); }
        .participar-hl { color: var(--swc-coral); font-style: italic; }
        .participar-hero .lead { max-width: 58ch; color: var(--ink-soft); line-height: 1.65; }
        .participar-hero .lead + .lead { margin-top: 14px; }
        .participar-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .participar-hero__actions .btn { min-height: 44px; }
        .participar-hero__photo { box-shadow: 0 24px 70px rgba(43,24,16,.16); border-radius: 24px; overflow: hidden; }
        .participar-intro { display: grid; grid-template-columns: .95fr 1.05fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .participar-intro__body p { color: var(--ink-soft); font-size: 18px; line-height: 1.7; }
        .participar-intro__body p + p { margin-top: 18px; }
        .participar-combo-highlight { margin: 22px 0; border: 1px solid var(--line); background: var(--bg-card); border-radius: 18px; padding: 22px 24px; display: flex; flex-direction: column; gap: 8px; }
        .participar-combo-highlight .mono { color: var(--accent); }
        .participar-combo-highlight strong { font-family: var(--font-serif); font-size: clamp(26px, 4vw, 40px); line-height: 1; letter-spacing: -.03em; color: var(--ink); }
        .participar-section-head { margin-bottom: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(24px, 5vw, 70px); align-items: end; }
        .participar-section-head__text p { color: var(--ink-soft); font-size: 16px; line-height: 1.7; }
        .participar-section-head__text p + p { margin-top: 14px; }
        .participar-benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .participar-benefit { position: relative; border: 1px solid var(--line); background: var(--bg-card); border-radius: 22px; padding: 26px; min-height: 250px; display: flex; flex-direction: column; transition: transform .28s cubic-bezier(.2,.7,.3,1), box-shadow .28s ease, border-color .28s ease; }
        .participar-benefit:hover { transform: translateY(-6px); box-shadow: 0 22px 50px rgba(56,22,16,.14); border-color: transparent; }
        .participar-benefit__badge { width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 26px; transition: transform .28s cubic-bezier(.2,.7,.3,1); }
        .participar-benefit:hover .participar-benefit__badge { transform: rotate(-6deg) scale(1.06); }
        .participar-benefit__badge svg { color: #fff; }
        .participar-benefit--coral .participar-benefit__badge { background: var(--swc-coral); }
        .participar-benefit--cyan .participar-benefit__badge { background: var(--swc-cyan); }
        .participar-benefit--yellow .participar-benefit__badge { background: var(--swc-yellow); }
        .participar-benefit--yellow .participar-benefit__badge svg { color: var(--swc-chocolate); }
        .participar-benefit--coral:hover { box-shadow: 0 22px 50px rgba(246,93,116,.22); }
        .participar-benefit--cyan:hover { box-shadow: 0 22px 50px rgba(1,175,204,.22); }
        .participar-benefit--yellow:hover { box-shadow: 0 22px 50px rgba(253,187,26,.24); }
        .participar-benefit h3 { font-size: 22px; line-height: 1.08; margin: 0; color: var(--ink); }
        .participar-benefit p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: auto 0 0; padding-top: 14px; }
        .participar-process-section { background: var(--bg-soft); }
        .participar-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 24px; }
        .participar-step { position: relative; border: 1px solid var(--line); background: var(--bg-card); border-radius: 22px; padding: 28px 26px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; transition: transform .28s cubic-bezier(.2,.7,.3,1), box-shadow .28s ease; }
        .participar-step:hover { transform: translateY(-5px); box-shadow: 0 20px 46px rgba(56,22,16,.13); }
        /* conector da jornada entre passos da mesma linha */
        .participar-step::after { content: ''; position: absolute; top: 50px; right: -24px; width: 24px; height: 2px; background: repeating-linear-gradient(90deg, var(--swc-coral) 0 6px, transparent 6px 12px); z-index: 0; }
        .participar-step--last::after, .participar-step:nth-child(3n)::after { display: none; }
        .participar-step__num { flex: 0 0 auto; width: 64px; height: 64px; border-radius: 18px; color: #fff; font-family: var(--font-serif); font-size: 34px; display: flex; align-items: center; justify-content: center; line-height: 1; letter-spacing: -.04em; }
        .participar-step--coral .participar-step__num { background: var(--swc-coral); }
        .participar-step--cyan .participar-step__num { background: var(--swc-cyan); }
        .participar-step--yellow .participar-step__num { background: var(--swc-yellow); color: var(--swc-chocolate); }
        .participar-step__body { width: 100%; }
        .participar-step h3 { font-size: 20px; line-height: 1.12; margin: 0; color: var(--ink); }
        .participar-step p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }
        .participar-dark { background: var(--ink); color: var(--bg); }
        .participar-dark__grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .participar-dark h2 { color: var(--bg); }
        .participar-dark__text { color: var(--peach); line-height: 1.7; margin-top: 18px; max-width: 52ch; }
        .participar-types { display: flex; flex-wrap: wrap; gap: 10px; }
        .participar-types span { border: 1px solid rgba(255,244,236,.18); background: rgba(255,244,236,.05); color: var(--peach); border-radius: 999px; padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
        .participar-form-grid { display: grid; grid-template-columns: .75fr 1.25fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .participar-form-grid p { color: var(--ink-soft); line-height: 1.7; }
        .participar-form { padding: clamp(28px, 4vw, 52px); border-radius: 28px; box-shadow: 0 24px 70px rgba(56,22,16,.10); border: 1px solid var(--line); }
        .participar-form__fields { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 24px; }
        .participar-form :is(input, select, textarea) { transition: border-color .2s ease, box-shadow .2s ease, background .2s ease; border-radius: 12px; }
        .participar-form :is(input, select, textarea):focus { outline: none; border-color: var(--swc-coral); box-shadow: 0 0 0 4px rgba(246,93,116,.16); background: var(--bg-card); }
        .participar-form :is(input, select, textarea) { min-height: 44px; }
        .participar-form__footer { margin-top: 34px; padding-top: 26px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .participar-form__footer .btn { min-height: 48px; padding-inline: 28px; box-shadow: 0 10px 26px rgba(253,187,26,.34); }
        .participar-form__footer .btn:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(253,187,26,.42); }
        .participar-form__note { margin-top: 18px; font-size: 13px; line-height: 1.6; color: var(--ink-mute); }
        @media (max-width: 1040px) {
          .participar-hero__grid, .participar-intro, .participar-dark__grid, .participar-form-grid, .participar-section-head { grid-template-columns: 1fr; }
          .participar-benefits-grid { grid-template-columns: repeat(2, 1fr); }
          .participar-steps-grid { grid-template-columns: repeat(2, 1fr); }
          /* conector: esconder na última coluna (par) */
          .participar-step:nth-child(2n)::after { display: none; }
          .participar-step:nth-child(3n)::after { display: block; }
          .participar-step--last::after { display: none; }
        }
        @media (max-width: 640px) {
          .participar-benefits-grid, .participar-steps-grid, .participar-form__fields { grid-template-columns: 1fr; }
          .participar-step::after { display: none; }
          .participar-shape { opacity: .35; }
          .participar-shape--hero-arrow { width: 84px; right: -12px; }
          .participar-shape--hero-flower, .participar-shape--process-badge, .participar-shape--form-flower { display: none; }
          .participar-benefit { min-height: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .participar-benefit, .participar-step, .participar-form__footer .btn { transition: none; }
        }
      `}</style>
    </div>
  )
}
