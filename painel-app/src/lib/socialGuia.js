/*
 * Texto do guia passo a passo do Social media (components/vistas/SocialGuia.jsx).
 * Seis passos, de planejar a confirmar. `aprova`: quem lê é quem aprova.
 */
export function passosDoGuia({ aprovador = 'quem aprova', aprova = false } = {}) {
  return [
    { titulo: 'Planeje', texto: 'Toque em “Nova postagem” (ou no dia da semana). Dê um título, escolha o formato, o dia e a hora.' },
    { titulo: 'Prepare', texto: 'Envie a arte e escreva a legenda. Os @ vão em “Perfis a mencionar” (já entram no texto copiado). Fotos e logos dos participantes estão na Biblioteca.' },
    { titulo: 'Envie para aprovação', texto: 'Quando não faltar nada, toque em “Enviar para aprovação”. ' + (aprova ? 'Quem aprova recebe um aviso.' : 'A aprovação fica com ' + aprovador + ', que recebe um aviso.') },
    { titulo: aprova ? 'Aprove ou peça ajuste' : 'Aguarde a aprovação', texto: aprova
      ? 'Toque no alerta “para aprovar”, no alto do Planejamento. Aprove, ou peça ajuste dizendo o que mudar: a postagem volta para quem cuida dela.'
      : 'Aprovada, ela aparece no alerta “a publicar”. Se pedirem ajuste, ela volta para você com o comentário.' },
    { titulo: 'Publique no Instagram', texto: 'Na hora marcada, abra a postagem aprovada: “Copiar legenda” e “Baixar arte” (ou “Salvar ou compartilhar”, no celular). Publique pelo Instagram.' },
    { titulo: 'Confirme aqui', texto: 'Volte e toque em “Confirmar publicação”. Só assim ela fica como Publicada — o painel não publica sozinho.' },
  ]
}

/** A orientação curta da primeira visita: o caminho inteiro numa frase (aprovação e publicação manual incluídas). */
export function etapasResumo({ aprovador = 'quem aprova', aprova = false } = {}) {
  return 'Rascunho → Aguardando aprovação (' + (aprova ? 'você ou quem aprova' : aprovador) + ' aprova) → Aprovado → '
    + 'publicação manual no Instagram → “Confirmar publicação” aqui. O painel não publica sozinho.'
}

/** "Eline" · "Eline ou Wilker" · "quem aprova" — primeiro nome, sem artigo (não se deduz pelo nome). */
export function quemAprova(aprovadores = []) {
  const nomes = aprovadores.map((a) => String((a && a.nome) || '').trim().split(/\s+/)[0]).filter(Boolean)
  return nomes.length ? nomes.join(' ou ') : 'quem aprova'
}
