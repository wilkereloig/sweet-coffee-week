/*
 * 02 Central de dúvidas — 93 perguntas em 10 assuntos (src/data/faqCentral.js).
 *
 * Fica FORA do motor de movimento (`data-mo-fora`): quem chega para consultar
 * não espera uma entrada animada para começar (§6.15).
 *
 * Contratos que não mudam:
 *  · cada pergunta é `h3 > button` com aria-expanded/aria-controls, painel
 *    `role="region"`;
 *  · link de resposta só aparece quando existe em FAQ_DADOS.links — campo
 *    `null` (mapa, regulamentos, press kit) some sozinho, não é bug;
 *  · no celular o índice vira fita de chips (`flex: 0 0 auto` no `<li>`).
 */
import React from 'react'
import FAQ_DADOS from '../../../data/faqCentral'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import Rotulo from '../../../components/Rotulo'
import Seta from '../../../components/Seta'
import { CENTRAL } from '../../../data/conteudo/contato'
import { ASSUNTOS, rotuloCat } from '../useCentralDuvidas'
import { ancora } from '../rolar'

const LINKS = FAQ_DADOS.links

// Rotas reais do App para FAQ_DADOS.links[*].rota.
const ROTAS = {
  participar: '/participar',
  apoiar: '/apoiar',
  awards: '/sweet-awards',
  edicoes: '/edicoes',
}

/* Link da resposta. 'contato' e 'formulario' apontam para o formulário desta
   mesma página; rota de outra página vai por hash, que é o roteador do site. */
function linkDaResposta(q) {
  const l = q.link ? LINKS[q.link] : null
  if (!l) return null
  if (l.url) return { label: l.label, href: l.url, externo: true }
  if (l.ancora) return { label: l.label, href: l.ancora, ancora: l.ancora.replace('#', '') }
  if (l.rota === 'contato') return { label: l.label, href: '#mensagem', ancora: 'mensagem' }
  if (l.rota && ROTAS[l.rota]) return { label: l.label, href: `#${ROTAS[l.rota]}` }
  return null
}

function Pergunta({ q, aberto, alternar, comAssunto }) {
  const link = linkDaResposta(q)
  return (
    <li className={`ctt-item${aberto ? ' is-aberta' : ''}`}>
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
            {comAssunto && <span className="ctt-item__cat">{rotuloCat(q.cat)}</span>}
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
            onClick={link.ancora ? ancora(link.ancora) : undefined}
            target={link.externo ? '_blank' : undefined}
            rel={link.externo ? 'noopener noreferrer' : undefined}
          >
            {link.label} <Seta size={14} />
          </a>
        )}
      </div>
    </li>
  )
}

export function Duvidas({ central }) {
  const c = central
  return (
    <section
      id="perguntas"
      className="ctt-sec ctt-sec--creme"
      aria-labelledby="ctt-duvidas-titulo"
      data-mo-fora
    >
      <div className="ctt-cabeca">
        <Rotulo icone="topicos/duvidas">{CENTRAL.rotulo}</Rotulo>
        <h2 id="ctt-duvidas-titulo" className="scw-h2 ctt-cabeca__titulo">
          {CENTRAL.titulo[0]}
          <span className="ctt-sem-quebra"><em className="ctt-destaque">{CENTRAL.titulo[1]}</em>{CENTRAL.titulo[2]}</span>
        </h2>
      </div>

      <div className="ctt-colunas">
        <div className="ctt-lateral">
          <div role="search" className="ctt-busca">
            <label htmlFor="ctt-busca" className="ctt-lateral__rotulo">{CENTRAL.buscaRotulo}</label>
            <div className="ctt-busca__linha">
              <ScwIcon nome="ui/busca" tamanho={20} />
              <input
                id="ctt-busca"
                type="search"
                value={c.busca}
                onChange={(e) => c.mudarBusca(e.target.value)}
                placeholder={CENTRAL.buscaExemplo}
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
          </div>
          <div role="group" aria-labelledby="ctt-assuntos-rotulo" className="ctt-assuntos">
            <p id="ctt-assuntos-rotulo" className="ctt-lateral__rotulo">{CENTRAL.assuntos}</p>
            <ul className="ctt-cats">
              {ASSUNTOS.map((a) => {
                const ativo = c.cat === a.id
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`ctt-cat${ativo ? ' is-ativa' : ''}`}
                      aria-pressed={ativo}
                      onClick={() => c.escolherCat(a.id)}
                    >
                      <span>{a.rotulo}</span>
                      <span className="ctt-cat__n">{a.n}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="ctt-resultados" id="ctt-resultados">
          <div className="ctt-resultados__topo">
            <h3 id="ctt-resultados-titulo" className="ctt-resultados__titulo" tabIndex={-1}>{c.titulo}</h3>
            <p className="ctt-resultados__contagem" aria-live="polite">
              {c.lista.length} {c.lista.length === 1 ? 'pergunta' : 'perguntas'}
              {c.buscando && <> para “{c.busca.trim()}”</>}
            </p>
            {c.buscando && (
              <button type="button" className="ctt-limpar" onClick={c.limparBusca}>
                <ScwIcon nome="ui/fechar" tamanho={16} />
                {CENTRAL.limpar}
              </button>
            )}
          </div>

          {c.visiveis.length > 0 && (
            <ul className="ctt-perguntas">
              {c.visiveis.map((q) => (
                <Pergunta
                  key={q.id}
                  q={q}
                  aberto={c.idsAbertos.includes(q.id)}
                  alternar={c.alternar}
                  comAssunto={c.misturado}
                />
              ))}
            </ul>
          )}

          {c.restantes > 0 && (
            <button type="button" className="ctt-mais" onClick={c.mostrarMais}>
              <ScwIcon nome="ui/mais" tamanho={16} />
              Mostrar mais {c.proximoPasso}
              <span className="ctt-mais__resto">de {c.restantes} restantes</span>
            </button>
          )}

          {c.lista.length === 0 && (
            <div className="ctt-vazio">
              <b>{CENTRAL.vazioTitulo}</b>
              <p>{CENTRAL.vazioTexto}</p>
              <div className="ctt-vazio__acoes">
                <button type="button" className="scw-btn ctt-btn-mini ctt-btn-choco" onClick={c.limparBusca}>
                  {CENTRAL.limpar}
                </button>
                <a href="#mensagem" onClick={ancora('mensagem')} className="scw-btn scw-btn--contorno-escuro ctt-btn-mini">
                  {CENTRAL.ponteLink}
                </a>
              </div>
            </div>
          )}

          {c.lista.length > 0 && (
            <p className="ctt-ponte">
              <b>{CENTRAL.ponteTitulo}</b>
              <a href="#mensagem" onClick={ancora('mensagem')} className="ctt-ponte__link">
                {CENTRAL.ponteLink} <Seta size={16} />
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default Duvidas
