/*
 * Hooks das vistas que se atualizam sozinhas (19/10/2026). A regra de cada um
 * está em leituraViva.js (puro, testado); aqui só se liga à camada de
 * sincronização (lib/sync/react.js).
 *
 *   const lista = useLeitura(() => rpc('get_x', {...}), ['pedidos', 'participantes'], { chave: id })
 *   lista.dados          undefined enquanto nada chegou; depois, a última resposta BOA
 *   lista.erro           falha da última tentativa (a tela decide: bloqueia ou avisa)
 *   lista.recarregar()   "tentar de novo" — nunca rejeita
 *
 *   · carga inicial ao montar e a cada troca de `chave` (outro registro): o que estava
 *     na tela era de outro, então NUNCA aparece — a vista volta a "carregando";
 *   · releitura por sinal (useSincronizar) é SILENCIOSA: não zera nada, não troca o
 *     conteúdo por "Carregando…" e, se falhar, os dados anteriores ficam (a falha sobe
 *     para o indicador de sincronização);
 *   · resposta velha, tela desmontada ou conta trocada nunca gravam (useGuarda);
 *   · `opcional`: falha SEM dados anteriores não sobe (função sem permissão, migration
 *     ainda não aplicada) — igual ao catch que essas leituras já tinham.
 */
import React from 'react'
import { useGuarda, useSincronizar, useRegistroEditavel } from './sync/react.js'
import { usePendencia } from './pendencias.js'
import { LEITURA_VAZIA, reduzirLeitura, visaoDaLeitura, bloqueada, atualizacaoFalhou } from './leituraViva.js'

export function useLeitura(ler, dominios, { chave = '', ativo = true, opcional = false } = {}) {
  const guarda = useGuarda()
  const [estado, despachar] = React.useReducer(reduzirLeitura, LEITURA_VAZIA)
  const vivo = React.useRef(null)
  vivo.current = { ler, chave, opcional, estado }

  const carregar = React.useCallback(async () => {
    const vale = guarda()
    const minha = vivo.current.chave
    try {
      const lido = await vivo.current.ler()
      if (!vale()) return undefined
      const dados = lido === undefined ? null : lido
      despachar({ tipo: 'chegou', chave: minha, dados })
      return dados
    } catch (e) {
      if (!vale()) return undefined
      if (e && e.message === 'sessao_expirada') throw e        // o App leva ao login; não é falha de leitura
      const antes = vivo.current.estado
      const tinha = antes.chave === minha && antes.dados !== undefined
      despachar({ tipo: 'falhou', chave: minha, erro: (e && e.message) || String(e) })
      if (tinha || !vivo.current.opcional) throw e              // sobe para o indicador
      return undefined
    }
  }, [guarda])

  // Para botões ("Tentar de novo") e esperas depois de gravar: a falha já está em `erro`.
  const recarregar = React.useCallback(async () => {
    try { return await carregar() } catch { return undefined }
  }, [carregar])

  React.useEffect(() => {
    if (ativo) carregar().catch(() => { /* a falha já está em `erro` */ })
  }, [ativo, chave, carregar])
  useSincronizar(dominios, carregar, { ativo })

  const temDados = () => visaoDaLeitura(vivo.current.estado, vivo.current.chave).dados !== undefined
  // Aplica o que uma gravação CONFIRMADA já devolveu (ou um ajuste local). Uma leitura que
  // estava em voo antes dela perde o direito de gravar: senão desfaria o ajuste.
  const ajustar = React.useCallback((valor) => {
    if (typeof valor !== 'function' || temDados()) guarda()
    despachar({ tipo: 'ajustar', chave: vivo.current.chave, valor })
  }, [guarda]) // eslint-disable-line react-hooks/exhaustive-deps
  // Gravei algo cuja resposta vai chegar por sinal: o que estava em voo é anterior a isso.
  const invalidar = React.useCallback(() => { if (temDados()) guarda() }, [guarda]) // eslint-disable-line react-hooks/exhaustive-deps
  // Os dados DE AGORA (depois de awaits longos, como um diálogo de texto).
  const atual = React.useCallback(() => visaoDaLeitura(vivo.current.estado, vivo.current.chave).dados, [])

  const visao = visaoDaLeitura(estado, chave)
  return {
    dados: visao.dados,
    erro: visao.erro,
    carregando: visao.dados === undefined && !visao.erro,
    bloqueada: bloqueada(visao),
    falhouAtualizar: atualizacaoFalhou(visao),
    carregar, recarregar, ajustar, invalidar, atual,
  }
}

/*
 * Registro em edição que resiste a alteração externa E avisa o resto do painel:
 * useRegistroEditavel (mescla em três vias) + usePendencia (conta como trabalho
 * pela metade enquanto estiver sujo) + sinal de "mudou por fora".
 *
 *   const r = useEdicaoProtegida(servidor, ['nome', 'obs'], { chave: id, rotulo: 'Sessão (não salva)' })
 *   r.local.nome · r.editar('nome', v) · r.sujo · r.base
 *   <AvisoMudancaExterna registro={r} rotulos={{ nome: 'Nome' }} />
 *   r.confirmarSalvo(enviado, brutos)
 *       `enviado` = o que o servidor guardou (a base acompanha); `brutos` = r.local de
 *       QUANDO a pessoa clicou em salvar. Campo que o servidor normalizou (espaço nas
 *       pontas, par de coordenadas colado) acompanha — a menos que ela tenha digitado
 *       mais alguma coisa enquanto salvava.
 * `servidor` precisa ser estável (useMemo) — a identidade dele é o sinal de "chegou dado novo".
 * `pendente: false` = o formulário está escondido; não conta como trabalho pela metade.
 */
export function useEdicaoProtegida(servidor, campos, { chave = null, rotulo = 'Edição não salva', pendente = true } = {}) {
  const r = useRegistroEditavel(servidor, campos, { chave })
  const pend = usePendencia(r.sujo && pendente, { rotulo })
  const conflito = Object.keys(r.conflitos).length > 0
  React.useEffect(() => {
    if (r.sujo && pendente && (r.mudouExterno || conflito)) pend.sinalizarExterno()
    else pend.limparExterno()
  }, [r.sujo, pendente, r.mudouExterno, conflito, pend])
  const localAgora = React.useRef(r.local)
  localAgora.current = r.local
  return React.useMemo(() => ({
    ...r,
    conflito,
    confirmarSalvo(enviado, brutos = null) {
      r.salvou(enviado)
      if (!brutos) return
      for (const [c, v] of Object.entries(enviado)) {
        if (brutos[c] !== v && localAgora.current[c] === brutos[c]) r.editar(c, v)
      }
    },
  }), [r, conflito])
}
