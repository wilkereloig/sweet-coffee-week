import React from 'react'

/*
 * Aviso de alteração externa num registro que a pessoa está editando (19/10/2026).
 * Recebe o `registro` de useRegistroEditavel (lib/sync/react.js):
 *   · campos que ela NÃO tinha tocado e acompanharam o servidor → "Outra pessoa
 *     atualizou X. Já está na tela" (o que ela digitou não mudou);
 *   · campos editados dos DOIS lados → mostra a versão dela e a nova, lado a lado,
 *     e ela escolhe por campo (ou todos de uma vez). Nunca troca em silêncio.
 * `rotulos` = { campo: 'Descrição do combo' } para falar com gente, não com coluna.
 */
const resumo = (v) => {
  const t = v == null || v === '' ? '(vazio)' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return t.length > 220 ? t.slice(0, 220) + '…' : t
}
const lista = (itens) => (itens.length <= 1 ? itens.join('') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1])

export function AvisoMudancaExterna({ registro, rotulos = {}, quem = 'outra pessoa' }) {
  const campos = Object.keys(registro.conflitos)
  const rot = (c) => rotulos[c] || c
  if (!campos.length && !registro.adotados.length) return null
  return (
    <div className={'pn-aviso-externo' + (campos.length ? ' pn-aviso-externo--conflito' : '')} role="status" aria-live="polite" data-externo={campos.length ? 'conflito' : 'atualizado'}>
      {!campos.length && (
        <>
          <p className="pn-aviso-externo__texto">
            Atualizado por {quem}: <strong>{lista(registro.adotados.map(rot))}</strong>. Já está na tela — o que você digitou não mudou.
          </p>
          <button type="button" className="pn-aviso-externo__btn" onClick={registro.dispensar}>Entendi</button>
        </>
      )}
      {campos.length > 0 && (
        <>
          <p className="pn-aviso-externo__texto">
            <strong>{campos.length === 1 ? 'Esta informação mudou' : 'Estas informações mudaram'}</strong> enquanto você editava. Suas alterações continuam aqui — escolha qual versão vale.
          </p>
          <ul className="pn-aviso-externo__lista">
            {campos.map((c) => (
              <li key={c} className="pn-aviso-externo__item">
                <span className="pn-aviso-externo__campo">{rot(c)}</span>
                <span className="pn-aviso-externo__versao"><em>Você</em>{resumo(registro.conflitos[c].meu)}</span>
                <span className="pn-aviso-externo__versao"><em>Versão nova</em>{resumo(registro.conflitos[c].deles)}</span>
                <span className="pn-aviso-externo__acoes">
                  <button type="button" className="pn-aviso-externo__btn" onClick={() => registro.adotar(c)}>Usar a nova</button>
                  <button type="button" className="pn-aviso-externo__btn" onClick={() => registro.manter(c)}>Manter a minha</button>
                </span>
              </li>
            ))}
          </ul>
          {campos.length > 1 && (
            <div className="pn-aviso-externo__acoes">
              <button type="button" className="pn-aviso-externo__btn" onClick={registro.adotarTodos}>Usar todas as novas</button>
              <button type="button" className="pn-aviso-externo__btn" onClick={registro.manterTodos}>Manter todas as minhas</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
