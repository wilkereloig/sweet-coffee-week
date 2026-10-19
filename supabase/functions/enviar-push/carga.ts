// =============================================================================
// O que vai NA TELA da pessoa quando chega um push de aviso (19/10/2026).
//
// O aviso dentro do painel tem o texto inteiro; o push aparece na tela de
// BLOQUEIO, onde qualquer um que esteja perto lê. Por isso:
//   · mensagem (organização ↔ marca): só "abra o painel para ler" — o texto da
//     conversa nunca sai do painel;
//   · formulário do site (candidatura, contato, apoio): título genérico e sem
//     corpo — o nome da pessoa/empresa e o assunto ficam no painel;
//   · os demais tipos (pedido, arquivo, fotos, cadastro, redes…) mostram título
//     e texto curto, que já são operacionais e sem dado pessoal.
// Função PURA (sem Deno, sem rede): testada em tests/painel-push-carga.test.mjs.
// =============================================================================
export interface AvisoPush {
  tipo?: string | null
  titulo?: string | null
  texto?: string | null
  link?: string | null
}

export interface CargaPush {
  titulo: string
  corpo: string
  url: string
  tag: string
}

export function montarCarga(n: AvisoPush, id: string): CargaPush {
  const tipo = String(n.tipo || '')
  let titulo = String(n.titulo || '').slice(0, 80)
  let corpo = String(n.texto || '').slice(0, 240)
  if (tipo === 'formulario') {
    titulo = 'Nova resposta em um formulário'
    corpo = 'Abra o painel para ver.'
  } else if (tipo === 'mensagem') {
    corpo = 'Abra o painel para ler.'
  }
  return {
    titulo,
    corpo,
    url: '/painel/' + (n.link ? '?ir=' + encodeURIComponent(String(n.link)) : ''),
    // O MESMO aviso reenviado substitui a notificação em vez de empilhar duplicada.
    tag: 'scw-' + id,
  }
}
