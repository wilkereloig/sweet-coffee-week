/*
 * Aba "Prêmios" do Mapa da Doçura: o próximo voucher, o prêmio final com o progresso da pessoa, as metas e as regras curtas.
 * Serve a folha dos atalhos (tela cheia) e a aba do painel (mapa normal): um componente só. Os dias, a validade e o número de
 * ganhadores vêm do servidor (`caca_premios_publico` → logica.js); os textos não escrevem data nem quantidade (premios/textos.js).
 * Nunca afirma que alguém ganhou: o estado "Resultado confirmado" só aparece quando o servidor diz que a organização confirmou.
 */
import React from 'react'
import { Carregando } from '../../../componentes/base.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao } from '../../../componentes/sistema/pecas.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { PREMIOS as P } from '../../../caca/premios/textos.js'
import { situacaoDoJogador } from '../../../caca/premios/logica.js'
import { usarPremios } from '../../../caca/premios/usarPremios.js'
import { usarMeusPremios } from '../../../caca/premios/usarMeusPremios.js'
import { usarMetas } from '../../../caca/metas/usarMetas.js'
import { BlocoCampanha } from '../../../caca/campanha/Campanha.jsx'

function Estado ({ estado }) {
  return <span className={`ct-premios__estado is-${estado}`}>{P.estado[estado]}</span>
}

/** Dia ainda sem encerrar: a disputa está aberta (o servidor chama de 'proximo' o dia que ainda não chegou). */
const aberto = (estado) => estado === 'proximo' || estado === 'em_disputa'

function Voucher ({ foco, corte, periodo }) {
  return (
    <section className="ct-premios__destaque" aria-labelledby="premio-voucher">
      <p className="ct-rotulo">{P.proximoRotulo[foco.estado]}</p>
      <h3 id="premio-voucher" className="ct-sub">{P.diaTitulo(foco.data)}</h3>
      <p className="ct-premios__linha"><strong>{P.umVoucher}</strong><Estado estado={foco.exibe} /></p>
      <p className="ct-nota">{foco.estado === 'em_disputa' ? P.hoje : P.estadoDica[foco.exibe]}</p>
      {foco.exibe === 'em_breve' && periodo && <p className="ct-nota">{P.comecaEm(periodo.inicio)}</p>}
      {aberto(foco.estado) && <p className="ct-nota">{P.fimDoDia(corte)}</p>}
      {foco.estado === 'em_apuracao' && <p className="ct-nota">{P.comoConcorre(corte)}</p>}
      {periodo?.estado === 'encerrada' && <p className="ct-nota">{P.encerrada(periodo.fim)}</p>}
    </section>
  )
}

function Dias ({ dados }) {
  return (
    <details className="ct-premios__dias">
      <summary>{P.verTodos}</summary>
      <ol className="ct-premios__lista" aria-label={P.todosTitulo}>
        {dados.dias.map((d) => (
          <li key={d.iso} className={`ct-premios__dia${d === dados.foco ? ' is-foco' : ''}`}>
            <span className="ct-premios__data"><b>{d.data.curta}</b><span>{d.data.semana}</span></span>
            <span>{P.umVoucherCurto}</span>
            <Estado estado={d.exibe} />
          </li>
        ))}
      </ol>
    </details>
  )
}

function Regras ({ dados }) {
  return (
    <details className="ct-premios__regras">
      <summary>{P.regrasTitulo}</summary>
      <ul>{P.regras(dados.corte, dados.validade, dados.periodo).map((t) => <li key={t}>{t}</li>)}</ul>
    </details>
  )
}

function Metas ({ caca }) {
  const { estado, metas } = usarMetas(caca)
  if (estado !== 'pronto' || !metas || !metas.marcos.length) return null
  return (
    <section className="ct-premios__bloco" aria-labelledby="premio-metas">
      <h3 id="premio-metas" className="ct-sub">{P.metasTitulo}</h3>
      {metas.todasAlcancadas
        ? <p><strong>{P.metasTodas}</strong></p>
        : metas.proxima && (
          <>
            <progress className="ct-caca__barra" value={Math.min(metas.validadas, metas.proxima.casas)} max={metas.proxima.casas} aria-label={P.metaProxima(metas.proxima.titulo, metas.proxima.faltam)} />
            <p><strong>{P.metaProxima(metas.proxima.titulo, metas.proxima.faltam)}</strong></p>
          </>
        )}
      <p className="ct-nota">{P.metasNota}</p>
    </section>
  )
}

function MeusVouchers ({ caca, navigate }) {
  const { estado, premios, tentar } = usarMeusPremios(caca)
  if (estado === 'sem-mapa' || (estado === 'pronto' && premios.length === 0)) return null
  if (estado === 'carregando') return <p className="ct-nota" role="status">Conferindo se há um voucher para este mapa…</p>
  if (estado === 'falha') return <div className="ct-estado" role="alert"><p>Não foi possível carregar seus vouchers agora.</p><button type="button" className="ct-botao" onClick={tentar}>Tentar de novo</button></div>

  return (
    <section className="ct-premios__bloco ct-premios__pessoal" aria-labelledby="premios-pessoais" role="status">
      <p className="ct-rotulo">Aviso para este mapa</p>
      <h3 id="premios-pessoais" className="ct-sub">Seu voucher</h3>
      {premios.map((premio) => (
        <article key={premio.id} className={`ct-premios__ganho is-${premio.estado}`}>
          <div className="ct-premios__ganho-cabeca"><IconeCartoon nome="vouchers" tamanho={52} /><h4>{premio.estado === 'selecionado' ? 'Você foi selecionado para o voucher!' : premio.estado === 'entregue' ? 'Seu voucher foi entregue' : 'Você ganhou um voucher!'}</h4></div>
          <p>Voucher do dia {premio.dia.curta}.</p>
          {premio.estado === 'selecionado' && (
            <>
              <p>Confirme o e-mail cadastrado no mapa{premio.prazo ? ` até ${premio.prazo}` : ''} para a organização concluir a validação.</p>
              <Botao href={TC.caminhos.central} navigate={navigate}>Ir para confirmar meu e-mail</Botao>
            </>
          )}
          {premio.estado === 'confirmado' && <p>A organização confirmou seu prêmio. Acompanhe os avisos do mapa para saber como receber o voucher.</p>}
          {premio.estado === 'entregue' && <p>A organização marcou este voucher como entregue.</p>}
          {premio.validade && <p className="ct-nota">Válido até {premio.validade.longa}.</p>}
        </article>
      ))}
    </section>
  )
}

export function PainelPremios ({ caca, totalDaEdicao = 0, navigate }) {
  const { estado, dado, tentar } = usarPremios(caca.api)
  const eu = situacaoDoJogador(caca.estado === 'pronto' ? caca.mapa : null, totalDaEdicao)
  const comMapa = caca.estado === 'pronto' && !!caca.mapa
  return (
    <div className="ct-premios">
      <p className="ct-nota">{P.intro}</p>
      <MeusVouchers caca={caca} navigate={navigate} />

      <section className="ct-premios__bloco" aria-labelledby="premio-vouchers">
        <h3 id="premio-vouchers" className="ct-sub">{P.vouchersTitulo}</h3>
        {estado === 'carregando' && <Carregando texto={P.carregando} />}
        {estado === 'falha' && <div className="ct-estado" role="alert"><p>{P.semDias}</p><button type="button" className="ct-botao" onClick={tentar}>{P.tentar}</button></div>}
        {estado === 'pronto' && dado && (dado.foco
          ? (
            <>
              <Voucher foco={dado.foco} corte={dado.corte} periodo={dado.periodo} />
              {dado.apurando.map((d) => <p key={d.iso} className="ct-nota ct-premios__apurando">{P.apurando(d.data)}</p>)}
              <p className="ct-nota">{P.vouchersResumo(dado.dias.length)}</p>
              {dado.dias.length > 1 && <Dias dados={dado} />}
              <Regras dados={dado} />
            </>
          )
          : <p className="ct-nota">{P.semDias}</p>)}
      </section>

      <section className="ct-premios__bloco ct-premios__final" aria-labelledby="premio-final">
        <h3 id="premio-final" className="ct-sub">{P.finalTitulo}</h3>
        <p><strong>{eu.total > 0 ? P.finalMeta(eu.total) : P.finalSemTotal}</strong></p>
        {comMapa && eu.total > 0 && (
          <>
            <progress className="ct-caca__barra" value={Math.min(eu.feitas, eu.total)} max={eu.total} aria-label={P.progresso(eu.feitas, eu.total)} />
            <p className="ct-premios__linha"><span>{P.progresso(eu.feitas, eu.total)}</span><strong>{P.faltam(eu.faltam)}</strong></p>
            {eu.tipo === 'completo' && <p className="ct-premios__ok" role="status">{P.completo}</p>}
            {eu.tipo === 'vazio' && <p className="ct-nota">{P.vazio}</p>}
            {eu.pendentes > 0 && <p className="ct-nota">{P.pendentes(eu.pendentes)}</p>}
            {eu.extras > 0 && <p className="ct-nota">{P.extras(eu.extras)}</p>}
          </>
        )}
        <p>{P.finalTexto(dado?.ganhadores ?? null)}</p>
        <p className="ct-nota">{P.finalExtras}</p>
        <p className="ct-nota">{P.vouchersNaoTiram}</p>
        <p className="ct-nota">{P.finalRegras} <a href={TC.caminhos.regulamento} onClick={(e) => { if (!e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); navigate(TC.caminhos.regulamento) } }}>{P.regulamento}</a></p>
      </section>

      {!comMapa && caca.estado !== 'carregando' && (
        <section className="ct-premios__bloco ct-jogo__convite">
          <p>{P.semMapa}</p>
          <Botao href={TC.caminhos.central} navigate={navigate}>{P.criarMapa}</Botao>
        </section>
      )}
      {comMapa && <Metas caca={caca} />}

      <BlocoCampanha navigate={navigate} variante="premios" />

      <section className="ct-premios__bloco" aria-labelledby="premio-conta">
        <h3 id="premio-conta" className="ct-sub">{P.diferencaTitulo}</h3>
        <dl className="ct-premios__diferenca">
          {P.diferenca.map(([nome, texto]) => <div key={nome}><dt>{nome}</dt><dd>{texto}</dd></div>)}
        </dl>
      </section>
    </div>
  )
}
