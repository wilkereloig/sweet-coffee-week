import React from 'react'

/*
 * A edição em números: quantas marcas participam e quantas já têm acesso e cadastro completo. Cada número
 * abre a lista de Marcas JÁ FILTRADA pelo que ele conta (`ir(filtros)` devolve o clique) — são as mesmas
 * regras de lib/mesa.js `resumoDaEdicao` e do filtro de Marcas, então o número é o tamanho da lista.
 * Marca encerrada não entra em número nenhum; a lista da edição a mostra, e o aviso embaixo diz isso.
 *
 * `estado` (lib/visaoGeral.js › estadoDaEdicao) decide se há o que afirmar: edição ou marcas que nunca foram
 * lidas dizem isso, em vez de "nenhuma edição aberta" ou "0 marcas na edição".
 */
export function ResumoEdicao({ estado, codigo, total, comAcesso, completos, encerradas, ir }) {
  if (estado.tipo !== 'ok') return <p className="ui-nota">{estado.texto}</p>
  const barras = [
    { rotulo: 'com acesso ao painel', n: comAcesso, filtros: { edicao: codigo, situacao: 'com_conta' } },
    { rotulo: 'cadastros completos', n: completos, filtros: { edicao: codigo, situacao: 'cadastro_completo' } },
  ]
  return (
    <>
      <div className="ms-edicao">
        <button type="button" className="ui-resumo__total" onClick={ir({ edicao: codigo })}>
          <span className="ui-resumo__n">{total}</span>
          <span className="ui-resumo__texto">{total === 1 ? 'marca na edição' : 'marcas na edição'}</span>
        </button>
        <ul className="ui-resumo__barras">
          {barras.map((x) => {
            const pct = total ? Math.round((x.n / total) * 100) : 0
            return (
              <li key={x.rotulo}>
                <button type="button" className="ui-resumo__barra" onClick={ir(x.filtros)}>
                  <span className="ui-resumo__linha"><span>{x.rotulo}</span><b>{x.n} de {total}</b></span>
                  <span className="ui-resumo__trilho" role="progressbar" aria-label={x.rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <span style={{ width: pct + '%' }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {encerradas > 0 && (
        <p className="ui-nota">
          {encerradas === 1 ? '1 marca encerrada não entra' : encerradas + ' marcas encerradas não entram'} nestes números, mas {encerradas === 1 ? 'aparece' : 'aparecem'} na lista da edição.
        </p>
      )}
    </>
  )
}
