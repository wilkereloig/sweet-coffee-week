/*
 * Central da Caça aos Carimbos (spec 15 §9): o app abre aqui, não direto no tabuleiro. Sem mapa, criação rápida (sem
 * tutorial longo). Com mapa: progresso (casas X de N, faltam, extras, posição e empate), a próxima ação útil, os atalhos,
 * o lembrete de e-mail pendente e os blocos de notificações e instalação (outras frentes).
 * O total de casas vem do servidor (`total_casas`), nunca de um número escrito aqui.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { prepararAvaliacao } from '../rota/carimbo.js'
import { Link } from '../componentes/base.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import { nomeDaCasa } from './regras.js'
import { CACA, CACA_CAMINHOS as RUA } from './textos.js'
import { CriarMapa } from './CriarMapa.jsx'
import { GuardarMapa } from './GuardarMapa.jsx'
import { EmailPendente } from './EmailPendente.jsx'
import Notificacoes from './secoes/Notificacoes.jsx'
import Instalar from './secoes/Instalar.jsx'

const P = CACA.progresso

function Progresso ({ caca }) {
  const { total, validadas, faltam, extras, posicao, comEmpate, pendentes, completo } = caca.resumo
  return (
    <section className="ct-caca__progresso" aria-labelledby="caca-progresso">
      <h2 id="caca-progresso" className="ct-sub">{P.titulo(caca.mapa?.apelido)}</h2>
      <p className="ct-caca__grande"><strong>{P.casas(validadas, total)}</strong> <span>{P.casasRotulo}</span></p>
      <progress className="ct-caca__barra" value={validadas} max={Math.max(total, 1)} aria-label={P.casas(validadas, total)} />
      <ul className="ct-caca__numeros">
        {!completo && <li>{P.faltam(faltam)}</li>}
        <li>{P.extras(extras)}</li>
        <li>{posicao ? `${P.posicao(posicao)}${comEmpate > 0 ? `, ${P.empate(comEmpate)}` : ''}` : P.semPosicao}</li>
      </ul>
      <p className="ct-nota">{P.extrasAjuda}</p>
      {pendentes > 0 && <p className="ct-aviso" role="status">{P.pendentes(pendentes)}</p>}
      {completo && <p className="ct-nota"><strong>{P.completo}</strong></p>}
    </section>
  )
}

function ProximaAcao ({ caca, dados, navigate }) {
  const t = CACA.proxima
  const { tipo, slug, mais } = caca.proxima
  const casa = nomeDaCasa(dados, slug)
  const base = { comecar: [t.comecar.titulo, t.comecar.texto], avaliar: [t.avaliar.titulo, t.avaliar.texto(casa, mais)], continuar: [t.continuar.titulo, t.continuar.texto], completo: [t.completo.titulo, t.completo.texto] }[tipo]
  return (
    <section className="ct-caca__proxima" aria-labelledby="caca-proxima">
      <p className="ct-rotulo">{t.titulo}</p>
      <h2 id="caca-proxima" className="ct-sub">{base[0]}</h2>
      <p className="ct-nota">{base[1]}</p>
      <div className="ct-acoes">
        {tipo === 'avaliar' && <button type="button" className="ct-botao" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, slug, mapa: caca.mapa }))}>{t.avaliar.acao}</button>}
        {tipo === 'comecar' && <Link href={RUA.casas} navigate={navigate} className="ct-botao">{t.comecar.acao}</Link>}
        {tipo === 'continuar' && <Link href={RUA.mapa} navigate={navigate} className="ct-botao">{t.continuar.acao}</Link>}
        {tipo === 'completo' && <Link href={RUA.ranking} navigate={navigate} className="ct-botao">{t.completo.acao}</Link>}
      </div>
    </section>
  )
}

function Atalhos ({ navigate }) {
  return (
    <nav className="ct-caca__atalhos" aria-labelledby="caca-atalhos">
      <h2 id="caca-atalhos" className="ct-sub">{CACA.atalhos.titulo}</h2>
      <ul>
        {CACA.atalhos.itens.map((a) => (
          <li key={a.chave}>
            <Link href={RUA[a.chave]} navigate={navigate} className="ct-caca__atalho">
              <IconeCartoon nome={a.desenho} tamanho={32} />
              <span className="ct-caca__atalho-texto"><strong>{a.rotulo}</strong><span>{a.texto}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Central ({ caca, dados, navigate }) {
  if (caca.estado === 'sem-mapa') {
    return (
      <>
        {caca.perdeu && <p className="ct-aviso" role="status">{CACA.chaveTrocada}</p>}
        <CriarMapa navigate={navigate} aoAbrir={(k, criado) => caca.entrar(k, { criado })} />
      </>
    )
  }

  return (
    <div className="ct-caca__central">
      <EmailPendente caca={caca} navigate={navigate} />
      <Progresso caca={caca} />
      <ProximaAcao caca={caca} dados={dados} navigate={navigate} />
      {caca.recemCriado && <GuardarMapa chave={caca.chave} />}
      <Atalhos navigate={navigate} />
      <Notificacoes caca={caca} navigate={navigate} dados={dados} />
      <Instalar caca={caca} navigate={navigate} dados={dados} />
      <div className="ct-acoes">
        <Link href={RUA.regulamento} navigate={navigate} className="ct-botao ct-botao--contorno">Regulamento</Link>
        <Link href={RUA.recuperar} navigate={navigate} className="ct-botao ct-botao--contorno">{CACA.criar.recuperar}</Link>
      </div>
    </div>
  )
}
