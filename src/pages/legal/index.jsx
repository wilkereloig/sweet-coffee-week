import React from 'react'
import { DOCUMENTOS, ATUALIZADO_EM } from '../../data/conteudo/legal'
import { abrirPreferencias } from '../../lib/consentimento'
import '../../styles/scw-legal.css'

/*
 * Documentos legais — /privacidade, /cookies, /termos, /uso-de-imagem (13/10/2026).
 *
 * Uma página para os três: o texto vem de src/data/conteudo/legal.js e a
 * rota resolve ANTES dos gates de publicação (src/lib/rotas.js), então os
 * documentos abrem por link direto mesmo com o site restrito a uma página.
 * Sem animação de entrada: é página de consulta (§6.15, como a central de
 * dúvidas) — `data-mo-fora` no artigo.
 */

const ORDEM = [
  ['privacidade', 'Privacidade'],
  ['cookies', 'Cookies'],
  ['termos', 'Termos de Uso'],
  ['uso-de-imagem', 'Uso de imagem'],
]

/* Rola até a seção e leva o foco ao título dela. */
function rolarPara(id) {
  const alvo = document.getElementById(`lg-${id}`)
  if (alvo) { alvo.scrollIntoView({ block: 'start' }); alvo.focus({ preventScroll: true }) }
}

/* [texto](href) e **negrito**, nada além. `#id` sem barra rola até a seção:
   o roteador é por hash, e `href="#id"` cru trocaria de rota. */
function Texto({ t }) {
  const partes = []
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g
  let fim = 0
  let m
  while ((m = re.exec(t))) {
    if (m.index > fim) partes.push(t.slice(fim, m.index))
    if (m[3]) {
      partes.push(<strong key={m.index}>{m[3]}</strong>)
    } else {
      const [, rotulo, href] = m
      const ancora = href.startsWith('#') && !href.startsWith('#/')
      const externo = /^https?:/.test(href)
      partes.push(
        <a
          key={m.index}
          href={href}
          {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          onClick={ancora ? (e) => { e.preventDefault(); rolarPara(href.slice(1)) } : undefined}
        >
          {rotulo}
        </a>,
      )
    }
    fim = re.lastIndex
  }
  if (fim < t.length) partes.push(t.slice(fim))
  return partes
}

function Bloco({ b }) {
  if (typeof b === 'string') return <p><Texto t={b} /></p>
  if (b.lista) return <ul>{b.lista.map((item) => <li key={item}><Texto t={item} /></li>)}</ul>
  if (b.acao === 'preferencias') {
    return (
      <p>
        <button type="button" className="scw-btn lg-pref" aria-haspopup="dialog" onClick={abrirPreferencias}>
          Abrir preferências de cookies
        </button>
      </p>
    )
  }
  if (b.tabela) {
    const { colunas, linhas } = b.tabela
    return (
      <div className="lg-tabela" role="region" aria-label="Inventário de armazenamento" tabIndex={0}>
        <table>
          <thead><tr>{colunas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l[0]}>
                {l.map((cel, i) => (i === 0
                  ? <th key={i} scope="row"><code>{cel}</code></th>
                  : <td key={i} data-coluna={colunas[i]}>{cel}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return null
}

export function LegalPage({ documento, navigate }) {
  const doc = DOCUMENTOS[documento] || DOCUMENTOS.privacidade
  const ir = (id) => (e) => { e.preventDefault(); navigate(`/${id}`) }

  return (
    <article className="lg" data-mo-fora aria-labelledby="lg-titulo">
      <header className="scw-secao lg-topo">
        <nav className="lg-docs" aria-label="Documentos legais">
          {ORDEM.map(([id, rotulo]) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={id === documento ? 'page' : undefined}
              onClick={id === documento ? (e) => e.preventDefault() : ir(id)}
            >
              {rotulo}
            </a>
          ))}
        </nav>
        <h1 id="lg-titulo" className="scw-h1 lg-titulo">{doc.titulo}</h1>
        <p className="lg-data">Atualizada em {ATUALIZADO_EM}</p>
        <div className="lg-resumo">
          <h2 className="lg-resumo__titulo">Em resumo</h2>
          <ul>{doc.resumo.map((r) => <li key={r}><Texto t={r} /></li>)}</ul>
        </div>
      </header>

      <div className="scw-secao lg-corpo">
        <nav className="lg-indice" aria-labelledby="lg-indice-titulo">
          <h2 id="lg-indice-titulo" className="lg-indice__titulo">Neste documento</h2>
          <ol>
            {doc.secoes.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); rolarPara(s.id) }}>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="lg-texto">
          {doc.secoes.map((s) => (
            <section key={s.id} className="lg-secao" aria-labelledby={`lg-${s.id}`}>
              <h2 id={`lg-${s.id}`} className="lg-secao__titulo" tabIndex={-1}>{s.titulo}</h2>
              {s.blocos.map((b, i) => <Bloco key={i} b={b} />)}
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}

export default LegalPage
