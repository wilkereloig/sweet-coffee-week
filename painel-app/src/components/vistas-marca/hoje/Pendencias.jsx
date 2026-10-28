import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { MacroSecao, GradeModulos, Modulo, Selo, Botao } from '../../ui'
import { tituloDaPendencia } from '../../../lib/inicioMarca'

/*
 * O que ainda falta, por assunto (Meu cadastro, Meu combo, Fotos, Solicitações, Documentos): poucas
 * linhas à vista, "Ver todas" recolhido e UM botão principal por grupo. Só existem os grupos com algo
 * aberto. O destaque do topo não se repete aqui (planejarAgora tira o original da lista).
 */
const ICONE_TIPO = { correcao: 'atencao', pedido: 'pedido', campo: 'editar', fotos: 'camera', arquivo: 'documento', mensagens: 'mensagens' }
const ICONE_GRUPO = {
  cadastro: MODULO_ICONE.cadastro, combo: MODULO_ICONE.combo, fotos: MODULO_ICONE.fotos,
  solicitacoes: MODULO_ICONE.pedidos, documentos: MODULO_ICONE.arquivos,
}

function Linha({ p, itens, ir, irPara }) {
  return (
    <li className="gm-pendencia" data-tipo={p.tipo} data-prioridade={p.prioridade || undefined}>
      <span className="gm-pendencia__icone"><Icone nome={ICONE_TIPO[p.tipo] || 'pendente'} tamanho={20} /></span>
      <span className="gm-pendencia__corpo">
        <b>{tituloDaPendencia(p, itens)}{p.prioridade === 'importante' ? ' · importante' : ''}</b>
        {p.texto && <span>{p.tipo === 'correcao' ? 'A organização escreveu: ' + p.texto : p.texto}</span>}
      </span>
      {p.link
        ? <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => ir(p.link, p.vista)}>{p.acao || 'Abrir'}</button>
        : <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => irPara('mensagens')}>Escrever</button>}
    </li>
  )
}

export function Pendencias({ grupos, itens, ir, irPara, alemDoDestaque = false }) {
  const linhas = (lista) => lista.map((p, i) => <Linha key={i} p={p} itens={itens} ir={ir} irPara={irPara} />)
  return (
    <MacroSecao rotulo="Pendências" titulo="O que ainda falta" nota={(alemDoDestaque ? 'Além da ação principal acima. ' : '') + 'Separado por assunto; cada item abre direto no ponto certo.'}>
      <GradeModulos className="ui-modulos--dois">
        {grupos.map((g) => (
          <Modulo key={g.chave} icone={ICONE_GRUPO[g.chave]} titulo={g.rotulo} sub={g.resumo}
            status={<Selo tom="atencao">{g.total === 1 ? '1 aberta' : g.total + ' abertas'}</Selo>}
            acoes={<Botao onClick={() => irPara(g.vista)}>{g.botao}</Botao>}>
            <ul className="gm-pendencias">{linhas(g.aVista)}</ul>
            {g.recolhidas.length > 0 && (
              <details className="ui-recolhe">
                <summary>Ver todas ({g.itens.length})</summary>
                <ul className="gm-pendencias">{linhas(g.recolhidas)}</ul>
              </details>
            )}
          </Modulo>
        ))}
      </GradeModulos>
    </MacroSecao>
  )
}
