import React from 'react'
import { Atividade } from '../../Atividade'
import { Carregando, Modulo, Botao } from '../../ui'

// Formato compacto: as mais novas à vista; o resto a um toque (a Mesa já leu 12).
export const LIMITE_COMPACTO = 5

/*
 * ATIVIDADE RECENTE da Visão geral: o que a equipe fez por último, em um card só.
 * `linhas` null = ainda carregando; [] = nada registrado. `falhou` = a leitura caiu (a Mesa avisa no bloco):
 * lista vazia com leitura caída NUNCA vira "nenhuma ação registrada" — não se sabe.
 */
export function AtividadeRecente({ linhas, falhou, abrirLink, navegar, verHistorico }) {
  const [tudo, setTudo] = React.useState(false)
  if (linhas === null) return <Carregando linhas={3} />
  const lista = tudo ? linhas : linhas.slice(0, LIMITE_COMPACTO)
  const resto = linhas.length - LIMITE_COMPACTO
  return (
    <Modulo largo icone="historico" titulo="Últimos registros da equipe" sub="Quem fez o quê, por último"
      acoes={(resto > 0 || verHistorico) ? (
        <>
          {resto > 0 && (
            <Botao variante="secundario" icone={tudo ? 'recolher' : 'mais'} aria-expanded={tudo} onClick={() => setTudo(!tudo)}>
              {tudo ? 'Ver só os mais novos' : 'Ver mais ' + resto}
            </Botao>
          )}
          {verHistorico && <Botao variante="secundario" icone="historico" onClick={() => navegar({ vista: 'admin', aba: 'historico', filtros: {} })}>Abrir o histórico completo</Botao>}
        </>
      ) : undefined}>
      {linhas.length === 0
        ? <p className="ui-nota">{falhou ? 'Não deu para carregar os registros agora.' : 'Nenhuma ação registrada ainda.'}</p>
        : <Atividade linhas={lista} onAbrirMarca={(id) => abrirLink('marcas/' + id)} />}
    </Modulo>
  )
}
