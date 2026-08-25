/*
 * PÁGINA INSTITUCIONAL — "Contato" (redesign 2026).
 * Quatro seções, na ordem do protótipo `Site Sweet Coffee Week.dc.html`:
 *   01 Abertura (compacta, banda de foto no mobile) · 02 Dúvidas (central de 93
 *   perguntas em 10 assuntos) · 03 Caminhos · 04 Mensagem (formulário).
 *
 * Central de dúvidas: fonte única `src/data/faqCentral.js` (FAQ_DADOS) — alimenta
 * o índice, a busca, os accordions E o schema FAQPage. A busca ignora acentos e
 * caixa, exige TODOS os termos e troca o filtro para "Todas" ao digitar. Links de
 * resposta só aparecem quando existem em FAQ_DADOS.links (campos `null` = rota que
 * ainda não existe → nada de link quebrado).
 *
 * Formulário: mantém a integração real já existente — validação nativa + RPC
 * Supabase `submit_contact_request` via `src/lib/contactRequest.js`. Nunca afirma
 * "enviado" se a gravação falhar.
 *
 * Casca (header, rodapé, abas mobile) é global (App.jsx); a cor da página
 * (bege #F8E4C1, desde o fechamento de paleta de 29/07) vem de
 * `body.route-contato` → `--scw-pagina`.
 */
import React from 'react'
import '../../styles/scw-contato.css'
import FAQ_DADOS from '../../data/faqCentral'
import { heroPhotos } from '../../data/imageLibrary'
import { HeroFotos } from '../../components/HeroFotos'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'
import { CONTACT_SUBJECTS } from '../../data/contactFaq'
import { EMPTY_CONTACT, normalizeText, submitContact } from '../../lib/contactRequest'
import { criarEnvioProtegido } from '../../lib/enviarFormulario'
import ScwIcon from '../../components/scw-icons/ScwIcon'

// Foto do herói desta rota (sistema central de imagens): ambienta a abertura
// no desktop e vira banda sangrando no celular. O véu por cima usa a cor da
// página (--scw-pagina) — ver scw-contato.css.
const HERO_FOTOS = heroPhotos('contato')

// RPC injetado na lógica pura (mantém o módulo testável offline).
// Passa pela porta anti-robo em vez de falar com o PostgREST direto.
// Mesma assinatura que as libs esperam ({ error }), entao elas nao mudam.
const rpc = criarEnvioProtegido()

// Rotas reais do App.jsx para os `link` das respostas (FAQ_DADOS.links[*].rota).
const ROTAS = {
  participar: '/participar',
  apoiar: '/apoiar',
  awards: '/sweet-awards',
  edicoes: '/edicoes',
}

const { categorias: CATEGORIAS, perguntas: PERGUNTAS, links: LINKS } = FAQ_DADOS
const TOTAL = PERGUNTAS.length
const CAT_PADRAO = 'sobre'

const rotuloCat = (id) => (CATEGORIAS.find((c) => c[0] === id) || ['', 'Todas'])[1]

/* Filtro da central: categoria + busca multi-termo (AND) sem acento/caixa,
   casando pergunta + resposta + palavras-chave + rótulo do assunto + id. */
function filtrarPerguntas(cat, busca) {
  const termos = normalizeText(busca).split(/\s+/).filter(Boolean)
  return PERGUNTAS.filter((q) => {
    if (cat !== 'todas' && q.cat !== cat) return false
    if (!termos.length) return true
    const alvo = normalizeText(
      [q.p, (q.r || []).join(' '), (q.k || []).join(' '), rotuloCat(q.cat), q.id].join(' '),
    )
    return termos.every((t) => alvo.includes(t))
  })
}

/* Link da resposta. Só devolve algo quando o alvo existe em FAQ_DADOS.links —
   os campos `null` (mapa, regulamentos, imprensa, press kit) somem sozinhos.
   'contato' e 'formulario' apontam para o formulário desta mesma página. */
function linkDaResposta(q) {
  const l = q.link ? LINKS[q.link] : null
  if (!l) return null
  if (l.url) return { label: l.label, href: l.url, externo: true }
  if (l.ancora) return { label: l.label, href: l.ancora, ancora: l.ancora.replace('#', '') }
  if (l.rota === 'contato') return { label: l.label, href: '#mensagem', ancora: 'mensagem' }
  if (l.rota && ROTAS[l.rota]) return { label: l.label, href: `#${ROTAS[l.rota]}`, rota: ROTAS[l.rota] }
  return null
}

const semMovimento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Ícones do protótipo (traço currentColor, sem dependência nova).
const SetaDireita = (p) => (
  <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconeInstagram = (p) => (
  <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17" cy="7" r="1.2" fill="currentColor" />
  </svg>
)

export function ContatoPage({ navigate }) {
  // Central de dúvidas: assunto, busca e conjunto de respostas abertas.
  // `abertos === null` = estado inicial → as duas primeiras da lista abrem.
  const [cat, setCat] = React.useState(CAT_PADRAO)
  const [busca, setBusca] = React.useState('')
  const [abertos, setAbertos] = React.useState(null)

  // Formulário: idle | enviando | ok | invalido | erro.
  const [form, setForm] = React.useState(EMPTY_CONTACT)
  const [estado, setEstado] = React.useState('idle')

  const buscando = busca.trim() !== ''
  const lista = filtrarPerguntas(cat, busca)
  const autoAbertos = lista.slice(0, 2).map((q) => q.id)
  const idsAbertos = abertos === null ? autoAbertos : abertos

  const alternar = (id) =>
    setAbertos((atual) => {
      const base = atual === null ? autoAbertos : atual
      return base.includes(id) ? base.filter((x) => x !== id) : base.concat([id])
    })

  // Digitar busca vale mais que o filtro: volta para "Todas" automaticamente.
  const mudarBusca = (e) => {
    const valor = e.target.value
    setBusca(valor)
    setCat(valor.trim() ? 'todas' : CAT_PADRAO)
    setAbertos(null)
  }
  const limparBusca = () => { setBusca(''); setCat(CAT_PADRAO); setAbertos(null) }
  const escolherCat = (id) => { setCat(id); setBusca(''); setAbertos(null) }

  const rolarPara = (id) => (e) => {
    if (e) e.preventDefault()
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
  }
  const irPara = (rota) => (e) => {
    if (e) e.preventDefault()
    navigate(rota)
  }

  // Schema FAQPage — mesma fonte de dados da tela, injetado no <head>.
  React.useEffect(() => {
    const anterior = document.getElementById('faq-schema')
    if (anterior) anterior.remove()
    const tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.id = 'faq-schema'
    tag.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: PERGUNTAS.map((q) => ({
        '@type': 'Question',
        name: q.p,
        acceptedAnswer: { '@type': 'Answer', text: (q.r || []).join(' ') },
      })),
    })
    document.head.appendChild(tag)
    return () => tag.remove()
  }, [])

  const mudarCampo = (chave) => (e) => {
    setForm((f) => ({ ...f, [chave]: e.target.value }))
    if (estado === 'erro' || estado === 'invalido') setEstado('idle')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (estado === 'enviando') return
    setEstado('enviando')
    const res = await submitContact(form, rpc)
    if (res.ok) {
      setEstado('ok')
      setForm(EMPTY_CONTACT)
    } else {
      setEstado(res.status === 'invalid' ? 'invalido' : 'erro')
    }
  }

  return (
    <>
      {/* ---------- 01 ABERTURA (compacta) ---------------------------------- */}
      <section className="scw-hero-bloco scw-hero-bloco--compacto scw-hero-veu ctt-abertura" aria-labelledby="ctt-titulo">
        {/* A foto ambienta a abertura nas duas telas, sob o véu do sistema —
            uma construção só, desde a padronização de 21/08/2026. Antes eram
            três peças diferentes aqui: um <img> de fundo no desktop, um véu
            próprio e a banda sangrando no celular. */}
        <HeroFotos fotos={HERO_FOTOS} />
        {/* Coluna única, como nas outras cinco aberturas: rótulo, H1, lead e as
            duas ações. A coluna de apoio à direita saiu no desenho de 20/08 —
            ela repetia, em nota, o que a própria seção 02 logo abaixo mostra. */}
        <div className="ctt-abertura__grade">
          <span className="scw-rotulo ctt-abertura__rotulo">Contato</span>
          <h1 id="ctt-titulo" className="scw-h1 ctt-abertura__titulo">
            Sua dúvida, respondida aqui.
          </h1>
          <p className="scw-hero__lead ctt-abertura__lead">
            Público, marcas, imprensa e parceiros: busque nas perguntas frequentes ou escreva para a
            organização pelo formulário abaixo.
          </p>
          <div className="ctt-abertura__acoes">
            <a
              href="#perguntas"
              onClick={rolarPara('perguntas')}
              className="scw-btn scw-btn--solido ctt-btn-mini"
            >
              Ver as perguntas
            </a>
            <a
              href="#mensagem"
              onClick={rolarPara('mensagem')}
              className="scw-btn scw-btn--contorno-claro ctt-btn-mini"
            >
              Ir para o formulário
            </a>
          </div>
        </div>
      </section>

      {/* ---------- 02 DÚVIDAS (central de 93 perguntas) --------------------- */}
      <section id="perguntas" className="ctt-sec ctt-sec--creme" aria-labelledby="ctt-duvidas-titulo">
        {/* Sem lead (PATCH 03 §1): ele explicava um controle que está na tela
            ("escolha um assunto ao lado", "busque por uma palavra"). A contagem
            não se perde — abre a página, e cada chip de assunto traz a sua. */}
        <div className="ctt-cabeca ctt-cabeca--simples">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/duvidas" tamanho={20} />Central de dúvidas</span>
          <h2 id="ctt-duvidas-titulo" className="scw-h2 ctt-cabeca__titulo">
            O que a gente <em className="ctt-destaque ctt-destaque--magenta">mais responde</em>.
          </h2>
        </div>

        <div className="ctt-colunas">
          <aside className="ctt-lateral" aria-label="Assuntos das perguntas">
            <label className="ctt-busca">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={busca}
                onChange={mudarBusca}
                placeholder="Buscar por palavra"
                aria-label="Buscar uma dúvida"
                autoComplete="off"
              />
            </label>
            <span className="ctt-lateral__rotulo" aria-hidden="true">Assuntos</span>
            <ul className="ctt-cats">
              {CATEGORIAS.map(([id, label]) => {
                const ativo = cat === id
                const n = id === 'todas' ? TOTAL : PERGUNTAS.filter((q) => q.cat === id).length
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`ctt-cat${ativo ? ' is-ativa' : ''}`}
                      aria-pressed={ativo}
                      onClick={() => escolherCat(id)}
                    >
                      <span>{label}</span>
                      <span className="ctt-cat__n">{n}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <div className="ctt-resultados">
            <div className="ctt-resultados__topo">
              <h3 className="ctt-resultados__titulo">{rotuloCat(cat)}</h3>
              <p className="ctt-resultados__contagem" aria-live="polite">
                {lista.length} {lista.length === 1 ? 'pergunta' : 'perguntas'}
              </p>
              {buscando && (
                <button type="button" className="ctt-limpar" onClick={limparBusca}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Limpar busca
                </button>
              )}
            </div>

            <ul className="ctt-perguntas">
              {lista.map((q) => {
                const aberto = idsAbertos.includes(q.id)
                const link = linkDaResposta(q)
                return (
                  <li key={q.id} className={`ctt-item${aberto ? ' is-aberta' : ''}`}>
                    <h3 className="ctt-item__h">
                      <button
                        type="button"
                        id={`faq-b-${q.id}`}
                        className="ctt-item__botao"
                        aria-expanded={aberto}
                        aria-controls={`faq-p-${q.id}`}
                        onClick={() => alternar(q.id)}
                      >
                        <span className="ctt-item__texto">
                          {buscando && <span className="ctt-item__cat">{rotuloCat(q.cat)}</span>}
                          <span className="ctt-item__pergunta">{q.p}</span>
                        </span>
                        <span className="ctt-item__sinal" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>
                    </h3>
                    <div
                      id={`faq-p-${q.id}`}
                      role="region"
                      aria-labelledby={`faq-b-${q.id}`}
                      className="ctt-item__corpo"
                      hidden={!aberto}
                    >
                      {(q.r || []).map((texto, i) => <p key={i}>{texto}</p>)}
                      {link && (
                        <a
                          className="ctt-item__link"
                          href={link.href}
                          onClick={
                            link.rota ? irPara(link.rota) : link.ancora ? rolarPara(link.ancora) : undefined
                          }
                          target={link.externo ? '_blank' : undefined}
                          rel={link.externo ? 'noopener noreferrer' : undefined}
                        >
                          {link.label} <SetaDireita s={13} />
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {lista.length === 0 && (
              <div className="ctt-vazio">
                <b>Nenhuma pergunta encontrada</b>
                <p>
                  Tente outra palavra (pagamento, lactose, carimbo, patrocínio) ou volte para os assuntos.
                </p>
                <div className="ctt-vazio__acoes">
                  <button type="button" className="scw-btn ctt-btn-mini ctt-btn-choco" onClick={limparBusca}>
                    Voltar aos assuntos
                  </button>
                  <a
                    href="#mensagem"
                    onClick={rolarPara('mensagem')}
                    className="scw-btn scw-btn--contorno-escuro ctt-btn-mini"
                  >
                    Ir para o formulário
                  </a>
                </div>
              </div>
            )}

            <div className="ctt-chamada">
              <div>
                <b>Não encontrou sua dúvida?</b>
                <p>
                  Escreva para a organização pelo formulário desta página. Se for sobre pedido, pagamento,
                  entrega ou produto, fale primeiro com o estabelecimento responsável — a venda é feita por
                  ele.
                </p>
              </div>
              <div className="ctt-chamada__acoes">
                <a
                  href="#mensagem"
                  onClick={rolarPara('mensagem')}
                  className="scw-btn scw-btn--solido ctt-btn-mini"
                >
                  Falar com a organização
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scw-btn scw-btn--contorno-claro ctt-btn-mini"
                >
                  Chamar no Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 03 CAMINHOS ---------------------------------------------- */}
      <section className="ctt-sec ctt-sec--bege" aria-labelledby="ctt-caminhos-titulo">
        <div
          className="ctt-cabeca ctt-cabeca--caminhos ctt-cabeca--simples"
        >
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/caminhos" tamanho={20} />Escolha o caminho</span>
            <h2 id="ctt-caminhos-titulo" className="scw-h2 ctt-cabeca__titulo ctt-cabeca__titulo--marrom">
              Cada assunto tem <em className="ctt-destaque ctt-destaque--choco">uma porta certa</em>.
            </h2>
          </div>
        </div>

        <ul className="ctt-portas">
          <li className="ctt-porta">
            <span className="ctt-porta__topo">
              <span className="scw-disco ctt-porta__ic" style={{ '--c': 'var(--scw-roxo)', '--tinta': 'var(--scw-creme)' }}>
                <ScwIcon nome="mecanica/loja" tamanho={20} />
              </span>
              <span className="scw-pill ctt-pill--roxo">Estabelecimentos</span>
            </span>
            <strong>Quero levar minha marca para a rota.</strong>
            <span className="ctt-porta__texto">
              Doçarias, cafeterias, confeitarias e restaurantes fazem o pré-cadastro na página Participar. A
              participação passa por curadoria.
            </span>
            <a className="ctt-porta__link" href="#/participar" onClick={irPara('/participar')}>
              Ir para Participar <SetaDireita />
            </a>
          </li>
          <li className="ctt-porta">
            <span className="ctt-porta__topo">
              <span className="scw-disco ctt-porta__ic" style={{ '--c': 'var(--scw-choco)', '--tinta': 'var(--scw-creme)' }}>
                <ScwIcon nome="topicos/proposta" tamanho={20} />
              </span>
              <span className="scw-pill ctt-pill--choco">Empresas</span>
            </span>
            <strong>Quero apoiar ou patrocinar o festival.</strong>
            <span className="ctt-porta__texto">
              Patrocínio, ativação de marca, mídia e brindes: a proposta entra pela página Apoiar e a
              organização responde com formatos e prazos.
            </span>
            <a className="ctt-porta__link" href="#/apoiar" onClick={irPara('/apoiar')}>
              Ir para Apoiar <SetaDireita />
            </a>
          </li>
          <li className="ctt-porta">
            <span className="ctt-porta__topo">
              <span className="scw-disco ctt-porta__ic" style={{ '--c': 'var(--scw-cyan)', '--tinta': 'var(--scw-choco)' }}>
                <ScwIcon nome="topicos/imprensa" tamanho={20} />
              </span>
              <span className="scw-pill ctt-pill--cyan">Imprensa e outros</span>
            </span>
            <strong>Sou imprensa ou tenho outro assunto.</strong>
            <span className="ctt-porta__texto">
              Entrevistas, correções no site, sugestões e demais temas: use o formulário abaixo escolhendo o
              assunto correspondente.
            </span>
            <a className="ctt-porta__link" href="#mensagem" onClick={rolarPara('mensagem')}>
              Ir para o formulário <SetaDireita />
            </a>
          </li>
        </ul>
      </section>

      {/* ---------- 04 MENSAGEM (formulário com envio real) ------------------ */}
      <section id="mensagem" className="ctt-sec ctt-sec--mensagem" aria-labelledby="ctt-mensagem-titulo">
        <div className="ctt-mensagem__cabeca">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/mensagem" tamanho={20} />Falar com a equipe</span>
          <h2 id="ctt-mensagem-titulo" className="scw-h2 ctt-mensagem__titulo">
            Não achou sua <em className="ctt-destaque ctt-destaque--magenta">resposta</em>? Escreva para a
            gente.
          </h2>
          <p className="ctt-mensagem__lead">
            A organização responde em dias úteis. Escolha o assunto para a mensagem chegar na pessoa certa.
          </p>
        </div>

        {estado === 'ok' ? (
          <div className="ctt-ok" role="status">
            <span className="ctt-ok__selo" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <strong>Mensagem enviada.</strong>
            <p>
              A organização do Sweet &amp; Coffee Week já recebeu sua mensagem, analisa o assunto e retorna
              pelo contato informado, em dias úteis.
            </p>
            <button type="button" className="scw-btn ctt-ok__acao" onClick={() => setEstado('idle')}>
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form className="ctt-form" onSubmit={enviar}>
            <div className="ctt-form__grade">
              <label className="scw-campo">
                <span>Seu nome *</span>
                <input
                  name="nome"
                  value={form.name}
                  onChange={mudarCampo('name')}
                  placeholder="Como te chamamos"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="scw-campo">
                <span>E-mail *</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={mudarCampo('email')}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="scw-campo ctt-campo--full">
                <span>Assunto *</span>
                <select name="assunto" value={form.subject} onChange={mudarCampo('subject')} required>
                  <option value="">Selecione</option>
                  {CONTACT_SUBJECTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="scw-campo ctt-campo--full">
                <span>Mensagem *</span>
                <textarea
                  name="mensagem"
                  rows={4}
                  value={form.message}
                  onChange={mudarCampo('message')}
                  placeholder="Escreva sua dúvida ou mensagem."
                  required
                />
              </label>
            </div>

            {estado === 'invalido' && (
              <p className="ctt-form__aviso" role="alert">
                Confira os campos obrigatórios: nome, e-mail válido, assunto da lista e mensagem.
              </p>
            )}
            {estado === 'erro' && (
              <p className="ctt-form__aviso" role="alert">
                Não foi possível enviar sua mensagem agora. Tente novamente em alguns minutos ou fale no{' '}
                {INSTAGRAM_HANDLE}.
              </p>
            )}

            <div className="ctt-form__pe">
              <span className="ctt-form__nota">
                Seus dados são usados apenas para responder esta mensagem.
              </span>
              <button type="submit" className="scw-btn ctt-enviar" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar mensagem'} <SetaDireita s={17} />
              </button>
            </div>
          </form>
        )}

        <div className="ctt-direto">
          <span>Prefere mensagem direta?</span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <IconeInstagram /> {INSTAGRAM_HANDLE}
          </a>
        </div>
      </section>
    </>
  )
}
