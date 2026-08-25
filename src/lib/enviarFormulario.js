/*
 * Porta anti-robô para os formulários do bundle React (Contato e Apoiar).
 *
 * `/quero-participar/` é página estática e fala com a mesma Edge Function por
 * fetch direto; aqui o caminho é outro só porque estas duas já tinham um ponto
 * de injeção pronto — `const rpc = (name, payload) => supabase.rpc(...)`, uma
 * linha em cada página.
 *
 * ESTE MÓDULO IMITA A ASSINATURA DO supabase-js DE PROPÓSITO: recebe
 * `(nome, payload)` e resolve `{ error }`. É o contrato que `contactRequest.js`
 * e `supportInterest.js` já esperam (o cabeçalho delas diz isso com todas as
 * letras), então elas não precisam saber que o caminho mudou — e continuam
 * testáveis offline com a `rpc` injetada.
 *
 * ⚠️ A Edge Function é um caminho alternativo, NÃO uma trava, enquanto as RPCs
 * `submit_*` ainda tiverem `execute` para `anon`. Fechar isso é um `revoke`, e
 * o `revoke` NÃO PODE ser aplicado antes de a versão nova destas páginas estar
 * no ar: a produção de hoje chama a RPC direto, e revogar agora derruba o
 * formulário que está publicado. Ver docs/PROGRESSO-execucao.md.
 */

const FUNCAO = 'https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/enviar-formulario'

// A Edge Function tem allowlist própria; este mapa é só a tradução do nome da
// RPC para o nome do formulário. Nome que não estiver aqui não vai a lugar
// nenhum — falha fechada.
const FORMULARIO_POR_RPC = {
  submit_contact_request: 'contato',
  submit_support_interest: 'apoio',
  submit_pesquisa: 'pesquisa',
  submit_quero_participar: 'quero_participar',
}

/**
 * Devolve uma função com a assinatura de `supabase.rpc`, que envia pela porta
 * protegida em vez de falar com o PostgREST direto.
 *
 * @param {object}   [opcoes]
 * @param {function} [opcoes.armadilha] devolve o valor do campo-armadilha, se a
 *   tela tiver um. Sem ele a barreira 1 não participa — as outras seguem de pé.
 */
export function criarEnvioProtegido (opcoes = {}) {
  const armadilha = typeof opcoes.armadilha === 'function' ? opcoes.armadilha : () => ''

  // Momento em que a tela ficou disponível. O servidor recusa envio em menos de
  // 3s: ninguém preenche um formulário nesse tempo. É carimbo do cliente, então
  // é dado de fora — a função tem teto de sanidade do outro lado.
  const abertoEm = Date.now()

  return async function rpcProtegida (nome, payload) {
    const formulario = FORMULARIO_POR_RPC[nome]
    if (!formulario) return { error: new Error('formulario_desconhecido') }

    try {
      const r = await fetch(FUNCAO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulario,
          corpo: payload,
          armadilha: armadilha(),
          aberto_em: abertoEm,
          token: '', // Turnstile ainda desligado por bandeira: falta o par de chaves
        }),
      })

      const corpo = await r.json().catch(() => null)

      // ⚠️ Bloqueio de robô e gravação bem sucedida devolvem `{ok:true}`
      // idênticos, de propósito — formato distinguível destrói o descarte
      // silencioso. Daqui não dá para saber qual dos dois foi, e é assim que
      // tem que ser: quem precisa saber é a pessoa, e ela gravou.
      if (!r.ok || !corpo?.ok) {
        return { error: new Error(corpo?.message || `HTTP ${r.status}`) }
      }
      return { error: null }
    } catch (error) {
      return { error }
    }
  }
}
