import React from 'react'
import { rpc } from './rpc'
import { useLeitura } from './leituraVivaReact'
import { DOMINIOS_VISTAS } from './syncFichas'
import { datasDoFestival } from './horarioFestival'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'

/*
 * As datas do festival são da edição (Edição › Configuração): lidas de get_edicoes, nunca escritas no código.
 * Para telas da equipe que não recebem a edição de quem as monta (editar o horário da unidade, prévia da página pública).
 *   const f = useDatasDoFestival(participante.edicao_codigo)
 *   f.datas (['AAAA-MM-DD', …]) · f.periodo ({ inicio, fim } | null) · f.carregando · f.falhou · f.tentarDeNovo()
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export function useDatasDoFestival(codigo) {
  const l = useLeitura(() => rpc('get_edicoes', { p_secret: lerSenha() }), DOMINIOS_VISTAS.edicaoAtual, { chave: codigo || '', ativo: !!codigo, opcional: true })
  const e = (Array.isArray(l.dados) ? l.dados : []).find((x) => x.codigo === codigo)
  const inicio = e && e.festival_inicio
  const fim = e && e.festival_fim
  const datas = React.useMemo(() => datasDoFestival(inicio, fim), [inicio, fim])
  return {
    datas,
    periodo: inicio && fim ? { inicio, fim } : null,
    falhou: !!l.erro && !e,
    carregando: !!l.carregando && !e,
    tentarDeNovo: l.recarregar,
  }
}
