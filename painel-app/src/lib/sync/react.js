/*
 * Hooks de sincronização para as telas (19/10/2026).
 *
 *   useSincronizar(['participantes', 'unidades'], recarregar)
 *       Chama `recarregar(aviso)` quando QUALQUER desses domínios muda — por
 *       gravação desta sessão, sinal do servidor ou reconciliação. Junta rajadas
 *       (barramento), roda no máximo uma por vez e, se chegar aviso durante uma
 *       carga, roda mais uma ao fim (nunca em paralelo, nunca perde o último).
 *       `aviso` é sempre um objeto: use-o para NÃO mostrar spinner nem trocar o
 *       conteúdo por "Carregando…" — a releitura é silenciosa.
 *
 *   const guarda = useGuarda()
 *   async function carregar() {
 *     const vale = guarda()               // marca esta carga como a mais nova
 *     const dados = await rpc(...)
 *     if (!vale()) return                 // resposta velha, tela desmontada ou conta trocada
 *     setDados(dados)
 *   }
 *
 *   useEstadoSync()   → { modo, situacao, tempoRealAtivo, ... } para o indicador.
 */
import React from 'react'
import { barramento } from './barramento.js'
import { sincronizacao } from './index.js'
import { iniciarRegistro, reduzirRegistro, registroSujo } from './mesclar.js'
import { criarSerializador } from './serializar.js'

export function useSincronizar(dominios, recarregar, { ativo = true } = {}) {
  const ref = React.useRef(recarregar)
  ref.current = recarregar
  const chave = Array.isArray(dominios) ? dominios.join('|') : String(dominios)
  React.useEffect(() => {
    if (!ativo) return undefined
    // Uma carga por vez; aviso que chega no meio vira UMA releitura ao fim (serializar.js).
    // Falha de carga fica registrada no estado de sincronização (rastrear) e não derruba nada.
    const ser = criarSerializador((aviso) => sincronizacao.rastrear(Promise.resolve().then(() => ref.current(aviso))))
    const desligar = barramento.ouvir(Array.isArray(dominios) ? dominios : [dominios], ser.rodar)
    return () => { ser.encerrar(); desligar() }
  }, [chave, ativo]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useGuarda() {
  const seq = React.useRef(0)
  const montado = React.useRef(true)
  React.useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  return React.useCallback(() => {
    const minha = ++seq.current
    const epoca = barramento.epoca()
    return () => montado.current && minha === seq.current && epoca === barramento.epoca()
  }, [])
}

export function useEstadoSync() {
  return React.useSyncExternalStore(sincronizacao.ouvirEstado, sincronizacao.estado, sincronizacao.estado)
}

/*
 * Registro em edição que RESISTE a alteração externa (19/10/2026).
 *   const r = useRegistroEditavel(servidor, ['nome', 'descricao'], { chave: participante.id })
 *   r.local.nome, r.editar('nome', v)      → o que a pessoa vê e digita
 *   r.conflitos / r.adotados                → alerta para <AvisoMudancaExterna/>
 *   r.salvou(registroConfirmado)            → depois de salvar, a base acompanha
 *   r.sujo                                  → há edição não salva (use em usePendencia)
 * Quando `servidor` muda (releitura por sinal, reconexão ou salvamento de outra pessoa):
 *   · campo que a pessoa não tocou acompanha o servidor, sem perguntar;
 *   · campo que ela digitou NUNCA é trocado em silêncio;
 *   · o mesmo campo editado dos dois lados vira conflito, e ela escolhe.
 * `chave` (id do registro) trocou → recomeça do zero, sem herdar o rascunho de outro registro.
 */
export function useRegistroEditavel(servidor, campos, { chave = null } = {}) {
  const camposRef = React.useRef(campos)
  const [estado, despachar] = React.useReducer(reduzirRegistro, null, () => iniciarRegistro(servidor || {}, campos))
  const ultimaChave = React.useRef(chave)
  // Compara o CONTEÚDO dos campos, não a identidade do objeto: quem monta `servidor` na hora a
  // cada render não pode causar laço de releitura, e releitura idêntica não dispara aviso.
  const instantaneo = (s) => JSON.stringify((camposRef.current || Object.keys(s || {})).map((c) => (s || {})[c] ?? null))
  const ultimoServidor = React.useRef(instantaneo(servidor))
  React.useEffect(() => {
    const agora = instantaneo(servidor)
    if (chave !== ultimaChave.current) { ultimaChave.current = chave; ultimoServidor.current = agora; despachar({ tipo: 'reiniciar', servidor: servidor || {} }); return }
    if (agora !== ultimoServidor.current) {
      // Primeira chegada do dado (antes só vazio, ex.: config carregando): não é mudança externa.
      const antesVazio = JSON.parse(ultimoServidor.current).every((v) => v === null || v === '')
      ultimoServidor.current = agora
      if (servidor) despachar(antesVazio && !registroSujo(estado) ? { tipo: 'reiniciar', servidor } : { tipo: 'servidor', servidor })
    }
  }, [servidor, chave]) // eslint-disable-line react-hooks/exhaustive-deps
  return React.useMemo(() => ({
    ...estado,
    sujo: registroSujo(estado),
    campos: camposRef.current,
    editar: (campo, valor) => despachar({ tipo: 'editar', campo, valor }),
    salvou: (confirmado) => despachar({ tipo: 'salvou', servidor: confirmado }),
    adotar: (campo) => despachar({ tipo: 'adotar', campo }),
    manter: (campo) => despachar({ tipo: 'manter', campo }),
    adotarTodos: () => despachar({ tipo: 'adotarTodos' }),
    manterTodos: () => despachar({ tipo: 'manterTodos' }),
    dispensar: () => despachar({ tipo: 'dispensar' }),
  }), [estado])
}
