import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { MacroSecao, GradeModulos, Modulo, Selo } from '../../ui'

/*
 * Acompanhamento: duas listas que não se misturam.
 *  - "Seu preenchimento": o que a marca faz (progresso dos DADOS OBRIGATÓRIOS — o alcance vai escrito);
 *  - "Com a organização": o que ela analisa e decide. Tema aprovado, combo aprovado e página publicada
 *    são estados DIFERENTES e aparecem em linhas diferentes.
 * Em cada linha, quem age vem em ícone + texto (Sua vez · Com a organização · Concluído…), nunca só cor.
 */
// Situação do cadastro inteiro (lib/inicioMarca · textoProgresso): falta · com a organização · aprovado.
const ICONE_ENVIO = { falta: 'atencao', conferindo: 'horario', ok: 'sucesso' }

function Linha({ l, irPara }) {
  const corpo = (
    <>
      <span className="im-linha__corpo">
        <b>{l.rotulo}</b>
        <span>{l.detalhe}</span>
        {l.nota && <span className="im-linha__nota">{l.nota}</span>}
        {l.link && (
          <a className="link" href={l.link} target="_blank" rel="noopener noreferrer">Ver a página no site<Icone nome="link-externo" tamanho={16} /></a>
        )}
      </span>
      <Selo tom={l.etiqueta.tom}>{l.etiqueta.texto}</Selo>
    </>
  )
  return (
    <li data-quem={l.quem}>
      {l.vista
        ? <button type="button" className="im-linha" onClick={() => irPara(l.vista)}>{corpo}</button>
        : <div className="im-linha">{corpo}</div>}
    </li>
  )
}

export function Acompanhamento({ progresso, linhas, irPara }) {
  const envio = progresso.envio
  return (
    <MacroSecao rotulo="Acompanhamento" titulo="Como está a sua participação">
      <GradeModulos className="ui-modulos--dois">
        <Modulo icone={MODULO_ICONE.cadastro} titulo="Seu preenchimento" sub={progresso.contagem}>
          <div className="im-progresso">
            <p className="im-progresso__dados">{progresso.dados}</p>
            <div className="gm-progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso.pct} aria-label="Dados obrigatórios preenchidos">
              <span style={{ width: progresso.pct + '%' }} />
            </div>
            {envio && (
              <p className="im-progresso__envio" data-estado={envio.estado}>
                <Icone nome={ICONE_ENVIO[envio.estado]} tamanho={16} />{envio.texto}
              </p>
            )}
          </div>
          <ol className="im-linhas">{linhas.preenchimento.map((l) => <Linha key={l.chave} l={l} irPara={irPara} />)}</ol>
        </Modulo>
        <Modulo icone={MODULO_ICONE.participantes} titulo="Com a organização" sub="O que ela analisa e decide">
          <ol className="im-linhas">{linhas.organizacao.map((l) => <Linha key={l.chave} l={l} irPara={irPara} />)}</ol>
        </Modulo>
      </GradeModulos>
    </MacroSecao>
  )
}
