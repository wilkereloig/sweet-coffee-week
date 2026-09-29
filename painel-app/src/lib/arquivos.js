/*
 * Arquivos e downloads (reestruturação 29/09/2026, etapa 4) — lógica pura,
 * testada em tests/painel-app-arquivos.test.mjs. Serve os dois painéis: a
 * organização publica por categoria, a marca baixa agrupado por categoria.
 *
 * A categoria mora no banco (arquivos.categoria, CHECK na migration
 * 20260930_etapa4_arquivos.sql). Categoria nova no CHECK entra aqui junto.
 */

export const CATEGORIAS_ARQUIVO = [
  { chave: 'combo', rotulo: 'Meu combo', rotuloOrg: 'Fotos do combo', descricao: 'Fotos oficiais e imagens tratadas do seu combo' },
  { chave: 'identidade', rotulo: 'Identidade do festival', rotuloOrg: 'Identidade do festival', descricao: 'Logo, versões da marca e elementos gráficos' },
  { chave: 'guia', rotulo: 'Guias', rotuloOrg: 'Guias', descricao: 'Manual de marca, divulgação e fotografia' },
  { chave: 'documento', rotulo: 'Documentos', rotuloOrg: 'Documentos', descricao: 'Regulamentos, orientações e materiais oficiais' },
  { chave: 'outro', rotulo: 'Outros', rotuloOrg: 'Outros', descricao: '' },
]
const POR_CHAVE = Object.fromEntries(CATEGORIAS_ARQUIVO.map((c) => [c.chave, c]))

/** Lista → grupos na ordem das categorias, só os que têm arquivo. */
export function agruparPorCategoria(lista) {
  const grupos = CATEGORIAS_ARQUIVO.map((c) => ({ ...c, itens: [] }))
  for (const a of lista || []) {
    const g = grupos.find((x) => x.chave === (POR_CHAVE[a.categoria] ? a.categoria : 'outro'))
    g.itens.push(a)
  }
  return grupos.filter((g) => g.itens.length)
}

/** 1234 → "1,2 KB"; nulo → "" (o banco nem sempre sabe o tamanho). */
export function tamanhoLegivel(bytes) {
  const n = Number(bytes)
  if (!bytes || !isFinite(n) || n <= 0) return ''
  const un = ['B', 'KB', 'MB', 'GB']
  let i = 0, v = n
  while (v >= 1024 && i < un.length - 1) { v /= 1024; i++ }
  return (i === 0 ? String(v) : v.toFixed(v >= 10 ? 0 : 1).replace('.', ',')) + ' ' + un[i]
}

const TIPOS = { pdf: 'PDF', png: 'Imagem PNG', jpg: 'Imagem JPG', jpeg: 'Imagem JPG', webp: 'Imagem WEBP', svg: 'Vetor SVG', ai: 'Illustrator', eps: 'Vetor EPS', zip: 'Pacote ZIP', mp4: 'Vídeo MP4', mov: 'Vídeo MOV', doc: 'Word', docx: 'Word', xls: 'Planilha', xlsx: 'Planilha', ppt: 'Apresentação', pptx: 'Apresentação', txt: 'Texto' }

/** Tipo legível pela extensão do caminho (mais confiável que o mime do navegador). */
export function tipoLegivel(mime, caminho) {
  const ext = String(caminho || '').split('?')[0].split('.').pop().toLowerCase()
  if (TIPOS[ext]) return TIPOS[ext]
  if (mime && mime.startsWith('image/')) return 'Imagem'
  if (mime && mime.startsWith('video/')) return 'Vídeo'
  if (mime === 'application/pdf') return 'PDF'
  return ext && ext.length <= 5 && ext !== String(caminho || '').toLowerCase() ? ext.toUpperCase() : 'Arquivo'
}

/**
 * Caminho da versão nova de um arquivo substituído: MESMA pasta (é ela que
 * decide quem lê), nome com carimbo para não servir a versão velha do cache.
 * O nome segue a regra da Edge Function arquivo-url ([A-Za-z0-9._-]{1,120}).
 */
export function caminhoSubstituto(caminhoAtual, nomeSeguroNovo, agora = Date.now()) {
  const pasta = String(caminhoAtual || '').split('/')[0]
  return pasta + '/' + (agora.toString(36) + '-' + nomeSeguroNovo).slice(0, 120)
}
