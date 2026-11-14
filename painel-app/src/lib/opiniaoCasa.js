// Opinião da casa sobre a edição: forma do formulário e conversão para o banco (feedback_casa).
// Os marcadores precisam casar com public.feedback_casa_temas() na migration 20270208.
export const TEMAS_MELHORAR = [
  ['divulgacao', 'Divulgação'],
  ['painel', 'Painel'],
  ['mapa_carimbos', 'Mapa e carimbos'],
  ['vouchers', 'Vouchers'],
  ['prazos', 'Prazos'],
  ['atendimento_org', 'Atendimento da organização'],
]
export const ROTULO_TEMA = Object.fromEntries(TEMAS_MELHORAR)
export const ROTULO_INTERESSE = { sim: 'Sim', talvez: 'Talvez', nao: 'Não' }

export const opiniaoVazia = {
  recomendacao: null, funcionou: '', melhorar: '', melhorar_temas: [], interesse: null, tema_sugerido: '', livre: '',
}

export function opiniaoDoBanco(o) {
  if (!o) return { ...opiniaoVazia }
  return {
    recomendacao: Number.isInteger(o.recomendacao) ? o.recomendacao : null,
    funcionou: o.funcionou || '', melhorar: o.melhorar || '',
    melhorar_temas: Array.isArray(o.melhorar_temas) ? o.melhorar_temas.filter((t) => t in ROTULO_TEMA) : [],
    interesse: o.interesse || null, tema_sugerido: o.tema_sugerido || '', livre: o.livre || '',
  }
}

export function opiniaoParaSalvar(f) {
  const n = Number(f.recomendacao)
  return {
    recomendacao: Number.isInteger(n) && n >= 0 && n <= 10 && f.recomendacao !== null ? n : null,
    funcionou: f.funcionou.trim(), melhorar: f.melhorar.trim(),
    melhorar_temas: f.melhorar_temas.filter((t) => t in ROTULO_TEMA),
    interesse: f.interesse in ROTULO_INTERESSE ? f.interesse : null,
    tema_sugerido: f.tema_sugerido.trim(), livre: f.livre.trim(),
  }
}

/** A resposta tem algo escrito ou marcado? (a ficha da organização só mostra respostas reais) */
export const opiniaoTemConteudo = (o) => !!o && (o.recomendacao !== null && o.recomendacao !== undefined
  || !!o.funcionou || !!o.melhorar || (o.melhorar_temas || []).length > 0 || !!o.interesse || !!o.tema_sugerido || !!o.livre)
