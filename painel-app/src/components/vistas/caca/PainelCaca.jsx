import React from 'react'
import { useDadosCaca } from './comum'
import { VouchersDia } from './VouchersDia'
import { PremioFinal } from './PremioFinal'
import { Revisao } from './Revisao'
import { Excecoes } from './Excecoes'
import { Configuracao } from './Configuracao'
import { Metas } from './Metas'
import { Avisos } from './Avisos'
import { Auditoria } from './Auditoria'
import { Movimento } from './Movimento'
import '../../../styles/caca-painel.css'

/** As abas da Caça dentro de Edição › Carimbos (a primeira, "Mapa e adesivos", é o que já existia). */
export const ABAS_CACA = Object.freeze([
  { chave: 'vouchers', rotulo: 'Vouchers do dia' },
  { chave: 'final', rotulo: 'Prêmio final' },
  { chave: 'revisao', rotulo: 'Revisão sem GPS' },
  { chave: 'presenca', rotulo: 'Pedidos de presença' },
  { chave: 'config', rotulo: 'Regras e prazos' },
  { chave: 'metas', rotulo: 'Metas' },
  { chave: 'avisos', rotulo: 'Avisos' },
  { chave: 'movimento', rotulo: 'Movimento' },
  { chave: 'auditoria', rotulo: 'Auditoria' },
])

export function PainelCaca({ edicao, pode, aba }) {
  const dados = useDadosCaca(edicao)
  switch (aba) {
    case 'vouchers': return <VouchersDia edicao={edicao} pode={pode} dados={dados} />
    case 'final': return <PremioFinal edicao={edicao} pode={pode} dados={dados} />
    case 'revisao': return <Revisao edicao={edicao} pode={pode} />
    case 'presenca': return <Excecoes edicao={edicao} pode={pode} />
    case 'config': return <Configuracao pode={pode} dados={dados} />
    case 'metas': return <Metas edicao={edicao} pode={pode} />
    case 'avisos': return <Avisos edicao={edicao} pode={pode} />
    case 'movimento': return <Movimento pode={pode} />
    case 'auditoria': return <Auditoria dados={dados} />
    default: return null
  }
}
