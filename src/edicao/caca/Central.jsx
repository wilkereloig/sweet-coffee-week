/*
 * Central da Caça aos Carimbos (spec 15 §9): o app abre aqui, não direto no tabuleiro. Sem mapa, criação rápida (sem
 * tutorial longo). Com mapa, a tela gira em torno de DUAS coisas: o progresso ("X de N casas validadas") e UM próximo passo
 * com uma ação principal. Mapa, ranking, grupos, rota, metas e compartilhar são atalhos de peso menor; e-mail pendente,
 * notificações e instalação são linhas pequenas e dispensáveis. O que não precisa ser lido toda vez ("como conta?") fica
 * fechado. O total de casas vem do servidor (`total_casas`), nunca de um número escrito aqui.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { prepararAvaliacao } from '../rota/carimbo.js'
import { Link } from '../componentes/base.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import { nomeDaCasa } from './regras.js'
import { useSaudacao } from './useSaudacao.js'
import { CACA, CACA_CAMINHOS as RUA } from './textos.js'
import { ComoCarimbar } from './mapa/ComoCarimbar.jsx'
import { PrimeiraVez, BotaoComoCarimbar } from './guia/GuiaCarimbar.jsx'
import { PopupDisputa } from './disputa/PopupDisputa.jsx'
import { CartaoDisputa } from './disputa/CartaoDisputa.jsx'
import { ConvitePush } from './notificacoes/ConvitePush.jsx'
import { momentoUtilParaInstalar } from './pwa/instalacao.js' // "tem carimbo": a mesma conta que oferece o app
import { CriarMapa } from './CriarMapa.jsx'
import { GuardarMapa } from './GuardarMapa.jsx'
import { CartaoEmail } from './CartaoEmail.jsx'
import { VisitaAnterior } from './visita/VisitaAnterior.jsx'
import Notificacoes from './secoes/Notificacoes.jsx'
import { SinoDeAvisos } from './notificacoes/SinoDeAvisos.jsx'
import Instalar from './secoes/Instalar.jsx'

const P = CACA.progresso

function Progresso ({ caca, dados, navigate }) {
  const { total, validadas, faltam, extras, posicao, comEmpate, pendentes, completo } = caca.resumo
  const fala = useSaudacao(caca.mapa?.apelido, caca.resumo, dados)
  return (
    <section className="ct-central__progresso" aria-labelledby="caca-progresso">
      <div className="ct-central__cabeca">
        <h2 id="caca-progresso" className="ct-central__apelido">{P.titulo(caca.mapa?.apelido)}</h2>
        <SinoDeAvisos caca={caca} dados={dados} navigate={navigate} />
      </div>
      {/* Saudação (12/11/2026, pedido do Wilker): bom dia, boa tarde ou boa noite, com um convite que muda conforme o horário e o momento do jogo. */}
      <p className="ct-central__saudacao">
        <strong className="ct-central__saudacao-oi">{fala.saudacao}</strong>
        {fala.incentivo && <span className="ct-central__saudacao-texto">{fala.incentivo}</span>}
      </p>
      <p className="ct-central__grande"><strong>{P.casas(validadas, total)}</strong> <span>{P.casasRotulo}</span></p>
      <progress className="ct-caca__barra" value={validadas} max={Math.max(total, 1)} aria-label={P.casas(validadas, total)} />
      <ul className="ct-central__numeros">
        {!completo && <li>{P.faltam(faltam)}</li>}
        {pendentes > 0 && <li className="ct-central__esperando">{P.esperando(pendentes)}</li>}
        {extras > 0 && <li>{P.extras(extras)}</li>}
        {caca.mapa?.carimbo_sicredi && <li className="ct-central__sicredi">Carimbo especial Sicredi · vale no ranking e nos sorteios</li>}
        {posicao && <li className="ct-central__posicao">{`${P.posicao(posicao)}${comEmpate > 0 ? `, ${P.empate(comEmpate)}` : ''}`}</li>}
      </ul>
      {!posicao && <p className="ct-nota">{P.semPosicao}</p>}
      {completo && <p className="ct-nota"><strong>{P.completo}</strong></p>}
      <ComoCarimbar navigate={navigate} />
      <details className="ct-central__como">
        <summary>{P.como.titulo}</summary>
        <ul>{P.como.itens.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>
    </section>
  )
}

function ProximaAcao ({ caca, dados, navigate }) {
  const t = CACA.proxima
  const { tipo, slug, mais } = caca.proxima
  const nome = nomeDaCasa(dados, slug)
  const casa = nome === 'a casa' ? 'casa' : nome // a lista da edição pode ainda não ter chegado: "da casa", nunca "da a casa"
  const avaliar = tipo === 'avaliar'
  const base = { comecar: [t.comecar.titulo, t.comecar.texto], avaliar: [t.avaliar.titulo(casa), t.avaliar.texto(mais)], continuar: [t.continuar.titulo, t.continuar.texto], completo: [t.completo.titulo, t.completo.texto] }[tipo]
  return (
    <section className={`ct-central__proxima${avaliar ? ' ct-central__proxima--avaliar' : ''}`} aria-labelledby="caca-proxima">
      <div className="ct-central__proxima-corpo">
        {avaliar && <IconeCartoon nome="avaliar" tamanho={48} />}
        <div>
          <p className="ct-rotulo">{avaliar ? t.avaliar.etiqueta : t.titulo}</p>
          <h2 id="caca-proxima" className="ct-sub">{base[0]}</h2>
          <p className="ct-nota">{base[1]}</p>
        </div>
      </div>
      <div className="ct-acoes">
        {avaliar && <button type="button" className="ct-botao" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug, mapa: caca.mapa }))}>{t.avaliar.acao}</button>}
        {tipo === 'comecar' && <Link href={RUA.casas} navigate={navigate} className="ct-botao">{t.comecar.acao}</Link>}
        {tipo === 'continuar' && <Link href={RUA.mapa} navigate={navigate} className="ct-botao">{t.continuar.acao}</Link>}
        {tipo === 'completo' && <Link href={RUA.ranking} navigate={navigate} className="ct-botao">{t.completo.acao}</Link>}
      </div>
    </section>
  )
}

/** Atalhos de peso menor: só ícone e rótulo. O Mapa vem primeiro e com cor própria, porque é o lugar onde a Caça acontece. */
function Entradas ({ navigate }) {
  return (
    <nav className="ct-central__entradas" aria-labelledby="caca-atalhos">
      <h2 id="caca-atalhos" className="ct-rotulo">{CACA.atalhos.titulo}</h2>
      <ul>
        {CACA.atalhos.itens.map((a) => (
          <li key={a.chave}>
            <Link href={RUA[a.chave]} navigate={navigate} className={`ct-central__entrada${a.chave === 'mapa' ? ' ct-central__entrada--mapa' : ''}`}>
              <IconeCartoon nome={a.desenho} tamanho={32} />
              <span>{a.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Central ({ caca, dados, navigate }) {
  // "O que você disputa" (voucher do dia, campanha, prêmio final): morava no mapa; com o mapa abrindo em tela cheia (10/11/2026) passa a aparecer aqui, no hub.
  const disputa = <PopupDisputa caca={caca} totalDaEdicao={(dados?.participantes || []).filter((p) => (p.unidades || []).length).length} navigate={navigate} bloqueado={false} />
  if (caca.estado === 'sem-mapa') {
    return (
      <>
        {caca.perdeu && <p className="ct-aviso" role="status">{CACA.chaveTrocada}</p>}
        <PrimeiraVez navigate={navigate} />
        <CriarMapa navigate={navigate} aoAbrir={(k, criado) => caca.entrar(k, { criado })} />
        <p><BotaoComoCarimbar navigate={navigate} /></p>
        <VisitaAnterior caca={caca} dados={dados} navigate={navigate} />
        {disputa}
      </>
    )
  }

  return (
    <div className="ct-caca__central ct-central">
      {disputa}
      <div className="ct-central__col">
        <PrimeiraVez navigate={navigate} />
        <Progresso caca={caca} dados={dados} navigate={navigate} />
        <ProximaAcao caca={caca} dados={dados} navigate={navigate} />
        {caca.recemCriado && <GuardarMapa chave={caca.chave} />}
        <CartaoEmail caca={caca} navigate={navigate} />
        <VisitaAnterior caca={caca} dados={dados} navigate={navigate} />
      </div>
      <div className="ct-central__col">
        <CartaoDisputa caca={caca} navigate={navigate} />
        <ConvitePush chave={caca.chave} api={caca.api} temCarimbo={momentoUtilParaInstalar(caca.mapa)} curto />
        <BotaoComoCarimbar navigate={navigate} />
        <Entradas navigate={navigate} />
        <div className="ct-central__extras">
          <Notificacoes caca={caca} />
          <Instalar caca={caca} navigate={navigate} dados={dados} />
        </div>
        <p className="ct-central__rodape">
          <Link href={RUA.regulamento} navigate={navigate} className="ct-link">{CACA.rodape.regulamento}</Link>
          <Link href={RUA.recuperar} navigate={navigate} className="ct-link">{CACA.criar.recuperar}</Link>
        </p>
      </div>
    </div>
  )
}
