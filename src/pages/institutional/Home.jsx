import React from 'react'
import { I, LoversLogo, HeartTiny, TapeStrip } from '../../components/icons'
import { PhotoEditorial, LogoPH } from '../../components/placeholders'
import { PARTNERS } from '../../data/partners'

function HowItWorksCard({ n, title, body, icon }) {
  const IconComp = I[icon] || I.cup
  return (
    <div className="card" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 44, lineHeight: 1, color: 'var(--accent)' }}>{n.toString().padStart(2, '0')}</span>
        <div style={{ color: 'var(--ink-soft)' }}><IconComp width={28} height={28} /></div>
      </div>
      <div className="h-3" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{body}</div>
    </div>
  )
}

export function HomePage({ navigate }) {
  return (
    <div className="page-enter">

      <section className="hero-inst">
        <div className="wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <span className="eyebrow"><span className="dot"></span>FESTIVAL GASTRONÔMICO · NATAL/RN · DESDE 2016</span>
          </div>

          <div className="home-hero-grid">
            <div className="home-hero-text">
              <h1 className="hero-inst__title" style={{ fontSize: 'clamp(56px, 8.5vw, 144px)' }}>
                Sweet<br/>
                <span className="roman">Coffee</span> <span className="accent">Week.</span>
              </h1>
              <p className="hero-inst__sub" style={{ marginTop: 28 }}>
                A temporada mais doce de Natal.
              </p>
              <p style={{ color: 'var(--ink-soft)', fontSize: 17, maxWidth: '48ch', margin: '16px 0 0', lineHeight: 1.55 }}>
                Um festival gastronômico que reúne docerias, cafeterias, confeitarias, restaurantes e marcas da cidade em uma rota de combos exclusivos criados especialmente para cada edição.
              </p>
              <div className="hero-inst__meta">
                <a href="#/lovers" onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
                   className="btn btn-primary btn-lg">
                  Conheça a edição Lovers <I.arrow />
                </a>
                <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
                   className="btn btn-secondary btn-lg">
                  Ver mapa da edição
                </a>
              </div>
            </div>

            <div className="home-hero-photo">
              <PhotoEditorial
                label="HERO · COMBO COMPLETO"
                caption="Foto principal — combo da edição, mesa do café, vitrine ou momento do festival."
                aspect="4/5"
                tone="warm"
              />
            </div>
          </div>

          <div className="hero-inst__strip">
            <div className="hero-stat">
              <div className="hero-stat__icon"><I.cal width={20} height={20} /></div>
              <span className="num"><span className="roman">16</span></span>
              <span className="lbl">edições desde 2016</span>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><I.plate width={20} height={20} /></div>
              <span className="num">+200</span>
              <span className="lbl">participantes na história</span>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><I.pin width={20} height={20} /></div>
              <span className="num">+15</span>
              <span className="lbl">bairros mapeados</span>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__icon"><I.cup width={20} height={20} /></div>
              <span className="num">11</span>
              <span className="lbl">dias por edição</span>
            </div>
          </div>
        </div>

        <style>{`
          .home-hero-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: clamp(28px, 4vw, 64px);
            align-items: stretch;
          }
          .home-hero-text { display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 12px; }
          .home-hero-photo { min-height: 540px; }
          @media (max-width: 880px) {
            .home-hero-grid { grid-template-columns: 1fr; }
            .home-hero-photo { min-height: 0; }
          }
        `}</style>
      </section>

      <hr className="divider" />

      <section className="section">
        <div className="wrap home-two-col">
          <div>
            <div className="eyebrow"><span className="dot"></span>O que é</div>
            <h2 className="h-1 mt-2">
              Um festival onde<br/>
              <span style={{ fontStyle: 'italic' }}>marcas da cidade</span> criam<br/>
              combos por <span style={{ fontStyle: 'italic' }}>tempo limitado</span>.
            </h2>
          </div>
          <div style={{ paddingTop: 12 }}>
            <p className="lead">
              A cada edição, os participantes criam <strong style={{ color: 'var(--ink)' }}>combos exclusivos</strong> inspirados em um tema central. O público acessa o site para conhecer a edição, ver os participantes, encontrar combos, traçar rotas pelo Mapa da Doçura e votar nos favoritos no Sweet & Coffee Week Awards.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28 }}>
              <span className="tag tag-accent">Combos exclusivos</span>
              <span className="tag">Tempo limitado</span>
              <span className="tag">Rota pela cidade</span>
              <span className="tag">Votação pública</span>
              <span className="tag">Tema por edição</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 56 }}>
            <div>
              <div className="eyebrow"><span className="dot"></span>Como funciona</div>
              <h2 className="h-1 mt-2">Quatro passos para viver o Sweet.</h2>
            </div>
            <a href="#/edicoes" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}
               className="btn btn-ghost">Ver todas as edições <I.arrow /></a>
          </div>

          <div className="grid home-four-col">
            <HowItWorksCard n={1} title="A edição lança um tema." body="Cada edição parte de um conceito central que inspira e conecta toda a temporada." icon="cal" />
            <HowItWorksCard n={2} title="As marcas criam seus combos." body="Docerias, cafeterias e restaurantes criam combos exclusivos com doce, salgado e bebida." icon="plate" />
            <HowItWorksCard n={3} title="O público escolhe onde ir." body="Cada combo é uma porta de entrada para um lugar, uma marca e uma experiência." icon="cup" />
            <HowItWorksCard n={4} title="Monta sua rota pelo Mapa." body="O Mapa da Doçura mostra todos os participantes para você traçar sua própria rota pela cidade." icon="map" />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 80 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
            <div>
              <div className="eyebrow"><span className="dot"></span>16 EDIÇÕES EM IMAGENS</div>
              <h2 className="h-1 mt-2">O festival aconteceu.<br/><span style={{ fontStyle: 'italic' }}>Em cada esquina.</span></h2>
            </div>
            <p className="text-mute" style={{ maxWidth: 420, margin: 0 }}>
              Mosaico fotográfico de combos, bastidores, vitrines, pessoas e momentos das edições passadas.
            </p>
          </div>

          <div className="home-mosaic">
            <div className="m-a"><PhotoEditorial label="EDIÇÃO MOVIES · 2022" caption="Combo inspirado em clássicos do cinema." aspect="4/5" tone="warm" /></div>
            <div className="m-b"><PhotoEditorial label="BASTIDORES" caption="Doceria participante preparando o combo da edição." aspect="3/4" tone="cool" /></div>
            <div className="m-c"><PhotoEditorial label="VITRINE" caption="Selo do festival em uma das lojas participantes." aspect="1/1" tone="cream" /></div>
            <div className="m-d"><PhotoEditorial label="COMBO · BOOKS 2024" caption="Café, doce e salgado inspirados em literatura." aspect="16/9" tone="coffee" /></div>
            <div className="m-e"><PhotoEditorial label="PESSOAS · CELEBRATION 2025" caption="O público traçando rota pelo Mapa da Doçura." aspect="3/4" tone="warm" /></div>
            <div className="m-f"><PhotoEditorial label="DETALHE · TRIP 2023" caption="Uma releitura gastronômica em primeiro plano." aspect="1/1" tone="dark" /></div>
          </div>
        </div>

        <style>{`
          .home-mosaic {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            grid-auto-rows: 120px;
            gap: 16px;
          }
          .home-mosaic > div { overflow: hidden; border-radius: 18px; }
          .home-mosaic > div > figure { width: 100%; height: 100%; aspect-ratio: auto !important; }
          .m-a { grid-column: span 4; grid-row: span 4; }
          .m-b { grid-column: span 3; grid-row: span 3; }
          .m-c { grid-column: span 2; grid-row: span 2; }
          .m-d { grid-column: span 8; grid-row: span 3; }
          .m-e { grid-column: span 3; grid-row: span 4; }
          .m-f { grid-column: span 2; grid-row: span 2; }
          @media (max-width: 980px) {
            .home-mosaic { grid-template-columns: repeat(6, 1fr); grid-auto-rows: 110px; }
            .m-a { grid-column: span 6; grid-row: span 3; }
            .m-b { grid-column: span 3; grid-row: span 3; }
            .m-c { grid-column: span 3; grid-row: span 2; }
            .m-d { grid-column: span 6; grid-row: span 3; }
            .m-e { grid-column: span 3; grid-row: span 3; }
            .m-f { grid-column: span 3; grid-row: span 2; }
          }
          @media (max-width: 560px) {
            .home-mosaic { grid-template-columns: 1fr; grid-auto-rows: auto; }
            .home-mosaic > div { grid-column: span 1 !important; grid-row: auto !important; min-height: 280px; }
          }
        `}</style>
      </section>

      <section className="section">
        <div className="wrap">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(28px, 4vw, 64px)',
            alignItems: 'stretch',
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 32,
            padding: 'clamp(40px, 5vw, 72px)',
          }} className="home-f2">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="eyebrow" style={{ color: 'rgba(255,244,236,.55)' }}>
                <span className="dot" style={{ background: 'var(--accent)' }}></span>
                Idealização · criação · realização
              </div>
              <h2 className="h-1 mt-3" style={{ color: 'var(--bg)' }}>
                Uma realização da<br/>
                <span style={{ fontStyle: 'italic', color: 'var(--peach)' }}>F2 Experience.</span>
              </h2>
              <p style={{ color: 'rgba(255,244,236,.78)', fontSize: 17, maxWidth: '52ch', marginTop: 24 }}>
                A F2 Experience é a empresa responsável pela elaboração, criação e execução do festival. Desenvolve eventos, ativações, conteúdos e experiências que conectam marcas, pessoas e cidade.
              </p>
              <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="#" className="btn btn-accent btn-lg">
                  Conheça a F2 Experience <I.arrow />
                </a>
                <a href="#/edicoes" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}
                   className="btn btn-lg" style={{ color: 'var(--bg)', border: '1px solid rgba(255,244,236,.25)', background: 'transparent' }}>
                  16 edições de história
                </a>
              </div>
            </div>
            <div style={{ borderRadius: 20, overflow: 'hidden' }}>
              <PhotoEditorial label="F2 EXPERIENCE · BASTIDORES" caption="Equipe e produção do Sweet & Coffee Week em ação." aspect="1/1" tone="coffee" />
            </div>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .home-f2 { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40, paddingBottom: 120 }}>
        <div className="wrap">
          <div className="home-edition kv-lovers" style={{
            position: 'relative',
            background: 'var(--lovers-bg-deep, #FAD1B0)',
            borderRadius: 32,
            overflow: 'hidden',
          }}>
            {/* Gradiente de fundo da identidade Lovers */}
            <div className="lovers-bg" style={{ position: 'absolute', inset: 0, opacity: .55, pointerEvents: 'none' }} />

            <div className="home-edition__grid" style={{ position: 'relative' }}>

              {/* Coluna da foto com decorativos */}
              <div className="home-edition__photo" style={{ position: 'relative' }}>
                <PhotoEditorial label="SWEET & COFFEE WEEK LOVERS · COMBO HERO" caption="Foto principal da campanha — combo da edição Lovers." aspect="1/1" tone="warm" />
                <div style={{ position: 'absolute', bottom: 24, left: 20, zIndex: 2 }}>
                  <TapeStrip rotate={-2}>16ª EDIÇÃO · LOVERS</TapeStrip>
                </div>
                <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
                  <span className="sticker sticker-pink" style={{ transform: 'rotate(8deg)', display: 'inline-block' }}>
                    recriando.
                  </span>
                </div>
              </div>

              {/* Coluna de texto */}
              <div className="home-edition__text">

                {/* Badge */}
                <div style={{ marginBottom: 24 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--lovers-burgundy)', color: 'var(--lovers-cream)',
                    padding: '5px 14px', borderRadius: 999,
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
                  }}>
                    <HeartTiny size={10} color="var(--lovers-cream)" /> EDIÇÃO EM CURSO
                  </span>
                </div>

                {/* Logo da edição */}
                <img
                  src="/images/sweet-lovers-logo.svg"
                  alt="Sweet & Coffee Week Lovers 16ª Edição"
                  style={{ height: 110, width: 'auto', display: 'block', marginBottom: 28 }}
                />

                {/* Título */}
                <h2 className="lovers-h1" style={{ margin: 0, fontSize: 'clamp(40px, 5.5vw, 80px)', lineHeight: 1 }}>
                  Sweet &<br/>
                  Coffee <span style={{ color: 'var(--lovers-pink)' }}>Lovers.</span>
                </h2>

                <p style={{ fontFamily: 'var(--font-script)', fontSize: 30, color: 'var(--lovers-burgundy)', lineHeight: 1, margin: '20px 0 0' }}>
                  Feito de amor, recriando sabores.
                </p>

                <p style={{ color: 'var(--lovers-brown)', opacity: .82, fontSize: 17, maxWidth: '44ch', marginTop: 20, lineHeight: 1.55 }}>
                  A 16ª edição do Sweet & Coffee Week celebra os Sweet Lovers com combos inspirados em temas que marcaram a história do festival.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                  <a href="#/lovers" onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
                     className="btn btn-lovers btn-lg">
                    Conhecer a edição <I.arrow />
                  </a>
                  <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
                     className="btn btn-lg" style={{ background: 'transparent', color: 'var(--lovers-burgundy)', border: '1px solid var(--lovers-burgundy)' }}>
                    Abrir mapa
                  </a>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            .home-edition__grid {
              display: grid;
              grid-template-columns: 1fr 1.1fr;
              align-items: stretch;
            }
            .home-edition__photo { min-height: 560px; }
            .home-edition__photo > figure { border-radius: 0; }
            .home-edition__text {
              padding: clamp(40px, 5vw, 80px);
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            @media (max-width: 880px) {
              .home-edition__grid { grid-template-columns: 1fr; }
              .home-edition__photo { min-height: 0; aspect-ratio: 4/3; }
            }
          `}</style>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
            <div className="eyebrow"><span className="dot"></span>Quem já fez parte dessa história</div>
            <h2 className="h-1 mt-3">Marcas, empresas e instituições<br/>que acreditaram no festival.</h2>
            <p className="lead mt-3" style={{ margin: '16px auto 0' }}>
              Ao longo das edições, o Sweet & Coffee Week contou com parceiros que ajudaram a ampliar essa experiência para o público, os participantes e a cidade.
            </p>
          </div>

          <div className="mono center mb-3" style={{ color: 'var(--ink-mute)' }}>PATROCINADORES & PARCEIROS HISTÓRICOS</div>
          <div className="home-logos">
            {PARTNERS.map((n, i) => (
              <LogoPH key={i} name={n} width="100%" height={68} />
            ))}
          </div>
        </div>
        <style>{`
          .home-logos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
          @media (max-width: 880px) { .home-logos { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 560px) { .home-logos { grid-template-columns: repeat(2, 1fr); } }
        `}</style>
      </section>

      <section className="section-tight" style={{ paddingBottom: 80 }}>
        <div className="wrap home-ctas">
          <div className="card" style={{ padding: 'clamp(28px, 4vw, 48px)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <span className="tag tag-accent">PARA MARCAS GASTRONÔMICAS</span>
              <div style={{ color: 'var(--accent)' }}><I.plate /></div>
            </div>
            <div className="h-2">Sua doceria ou cafeteria quer participar?</div>
            <p className="text-mute mt-3" style={{ fontSize: 15 }}>
              Docerias, cafeterias, confeitarias, restaurantes e marcas gastronômicas podem demonstrar interesse em participar de próximas edições.
            </p>
            <a href="#/participar" onClick={(e) => { e.preventDefault(); navigate('/participar') }}
               className="btn btn-primary mt-4">Quero participar como loja <I.arrow /></a>
          </div>
          <div className="card" style={{ padding: 'clamp(28px, 4vw, 48px)', background: 'var(--ink)', color: 'var(--bg)', border: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <span className="tag" style={{ background: 'rgba(255,244,236,.1)', color: 'var(--peach)' }}>PARA MARCAS APOIADORAS</span>
              <div style={{ color: 'var(--peach)' }}><I.star /></div>
            </div>
            <div className="h-2" style={{ color: 'var(--bg)' }}>Sua marca quer apoiar o Sweet?</div>
            <p style={{ color: 'rgba(255,244,236,.7)', marginTop: 24, fontSize: 15 }}>
              Empresas interessadas podem apoiar próximas edições por meio de patrocínio, ativações, mídia, produtos, espaços, apoio institucional ou outras formas de parceria.
            </p>
            <a href="#/apoiar" onClick={(e) => { e.preventDefault(); navigate('/apoiar') }}
               className="btn btn-accent mt-4">Quero apoiar o Sweet <I.arrow /></a>
          </div>
        </div>
        <style>{`
          .home-ctas { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          @media (max-width: 880px) { .home-ctas { grid-template-columns: 1fr; } }
        `}</style>
      </section>

      <style>{`
        .home-two-col { display: grid; grid-template-columns: 1fr 1.4fr; gap: clamp(28px, 5vw, 80px); }
        @media (max-width: 880px) { .home-two-col { grid-template-columns: 1fr !important; } }
        .home-four-col { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 980px) { .home-four-col { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .home-four-col { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
