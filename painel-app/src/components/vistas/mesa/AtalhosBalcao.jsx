import React from 'react'
import { MacroSecao, GradeModulos, Modulo } from '../../ui'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi } from '../../../lib/caca'

/*
 * Atalhos do dia a dia no início da Visão geral (05/11/2026): Vouchers e Pedidos de carimbo. Só LEVAM às telas que já existem —
 * nenhuma operação nova e nenhuma permissão nova: o que a pessoa vê lá é decidido pelas mesmas permissões de sempre.
 *   · Vouchers → Contatos › Vouchers (consultar, destinar, cancelar; a baixa do voucher é sempre da MARCA, no balcão dela).
 *   · Pedidos de carimbo → Edição › Carimbos › Pedidos de presença (GPS que falhou e visita anterior), com a contagem de pendentes.
 * Cada atalho exige `dado.ler`, a mesma permissão das leituras das duas telas.
 */
function PedidosDeCarimbo({ edicao, navegar }) {
  const lista = useLeitura(() => cacaApi.excecoes(edicao), ['carimbos'], { chave: 'atalho-pedidos-' + edicao, opcional: true })
  const n = lista.dados && Number.isFinite(Number(lista.dados.pendentes)) ? Number(lista.dados.pendentes) : null
  const frase = n === null
    ? (lista.erro ? 'Não deu para contar agora. Abra a fila para ver.' : 'Contando…')
    : n === 0 ? 'Nenhum pedido esperando decisão.' : n === 1 ? '1 pedido esperando decisão.' : n + ' pedidos esperando decisão.'
  return (
    <Modulo icone="local" titulo="Pedidos de carimbo" rotuloIr="Abrir pedidos de presença"
      onClick={() => navegar({ vista: 'edicao', aba: 'carimbos', filtros: { sub: 'presenca' } })}>
      <span className="ms-acao">
        {n !== null && <span className="ui-modulo__num">{n}</span>}
        <span className="ms-acao__frase" role="status">{frase}</span>
      </span>
      <span className="ms-acao__detalhe">GPS que falhou na casa e visitas anteriores à Caça. Quem decide é a organização.</span>
    </Modulo>
  )
}

export function AtalhosBalcao({ edicao, navegar, pode }) {
  if (!pode || !pode('dado.ler')) return null
  return (
    <MacroSecao rotulo="Balcão" titulo="Vouchers e carimbos" id="visao-balcao"
      nota="Atalhos para consultar os vouchers e decidir os pedidos de carimbo. A baixa do voucher é feita pela marca, no balcão dela.">
      <GradeModulos>
        <Modulo icone="voucher" titulo="Vouchers" rotuloIr="Abrir vouchers" onClick={() => navegar({ vista: 'contatos', aba: 'vouchers', filtros: {} })}>
          <span className="ms-acao__detalhe">Gerar, destinar e acompanhar os vouchers de cada marca, impressos e virtuais.</span>
        </Modulo>
        {edicao
          ? <PedidosDeCarimbo edicao={edicao} navegar={navegar} />
          : <Modulo icone="local" titulo="Pedidos de carimbo" rotuloIr="Abrir pedidos de presença"
              onClick={() => navegar({ vista: 'edicao', aba: 'carimbos', filtros: { sub: 'presenca' } })}>
              <span className="ms-acao__detalhe">GPS que falhou na casa e visitas anteriores à Caça.</span>
            </Modulo>}
      </GradeModulos>
    </MacroSecao>
  )
}
