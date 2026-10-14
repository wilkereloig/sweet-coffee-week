/*
 * Camada Cartoon (2026.2) — fase 1 do plano docs/cartoon-2026-2/.
 *
 * Casca própria (cabeçalho, conteúdo, rodapé) e a resolução de cena. As páginas
 * reais (catálogo, participante, mapa…) entram na fase 4, lendo a projeção
 * pública do banco. Até lá cada cena mostra só o próprio nome e um texto de
 * preparação — nenhum dado de participante, nenhum dado de demonstração.
 *
 * Só aparece com CARTOON_PUBLICA ou em preview (src/lib/rotas.js).
 */
import React from 'react'
import '../../styles/scw-cartoon.css'
import { EDICAO, INICIO_INSTITUCIONAL } from '../config.js'
import { resolverCena } from '../rotas.js'
import { fotoProximaEdicao } from '../../data/imageLibrary'
import { LINKS_LEGAIS } from '../../components/SiteFooter'
import { abrirPreferencias } from '../../lib/consentimento'
import { NAV, CENA_TEXTO, RODAPE } from './textos.js'

function Link({ href, navigate, children, ...resto }) {
  const ir = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(href)
  }
  return <a href={href} onClick={ir} {...resto}>{children}</a>
}

export function CartoonPage({ path, navigate }) {
  const { cena } = resolverCena(path)
  const texto = CENA_TEXTO[cena] || CENA_TEXTO.inexistente
  const lettering = fotoProximaEdicao('marca')
  const ativa = cena === 'participante' || cena === 'combos' ? 'participantes' : cena

  return (
    <div className="ct-edicao">
      <header className="ct-topo">
        <Link href={EDICAO.caminho} navigate={navigate} className="ct-topo__marca" aria-label={`${EDICAO.nome}, início`}>
          {lettering && <img src={lettering.src} alt="" width="140" height="72" />}
        </Link>
        <nav className="ct-topo__nav" aria-label="Navegação da edição">
          <ul>
            {NAV.map((item) => (
              <li key={item.cena}>
                <Link href={item.href} navigate={navigate} aria-current={ativa === item.cena ? 'page' : undefined}>
                  {item.rotulo}
                </Link>
              </li>
            ))}
            <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
          </ul>
        </nav>
      </header>

      <section className="ct-cena" aria-labelledby="ct-titulo">
        <h1 id="ct-titulo" className="ct-cena__titulo">{texto.titulo}</h1>
        <p className="ct-cena__apoio">{texto.apoio}</p>
        {cena === 'inexistente' && (
          <p><Link href={EDICAO.caminho} navigate={navigate} className="ct-botao">Ir para a entrada</Link></p>
        )}
      </section>

      <footer className="ct-rodape">
        <p>{RODAPE.assinatura}</p>
        <ul className="ct-rodape__links">
          <li><Link href={INICIO_INSTITUCIONAL} navigate={navigate}>{RODAPE.sobre}</Link></li>
          <li><Link href="/participar" navigate={navigate}>Participar</Link></li>
          <li><Link href="/apoiar" navigate={navigate}>Apoiar</Link></li>
          <li><Link href="/contato" navigate={navigate}>Contato</Link></li>
        </ul>
        <ul className="ct-rodape__links">
          {LINKS_LEGAIS.map(([href, rotulo]) => (
            <li key={href}><Link href={href} navigate={navigate}>{rotulo}</Link></li>
          ))}
          <li><button type="button" className="ct-rodape__botao" onClick={abrirPreferencias}>{RODAPE.preferencias}</button></li>
        </ul>
      </footer>
    </div>
  )
}
