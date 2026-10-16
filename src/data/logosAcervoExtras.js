/*
 * Logos oficiais de marcas da edição Cartoon 2026.2 que NÃO estão no registro
 * Lovers (`participants.js`, só as casas das edições anteriores). O arquivo é
 * `public/logos/participants/<slug>.png`, gerado por
 * `scripts/sincronizar-logos-oficiais.py` a partir da pasta
 * `10_LOGOS_PARTICIPANTES/PRINCIPAIS` da edição (decisão do Wilker, 15/10/2026).
 *
 * `name` = nome da marca no painel (é dele que o banco tira a chave de
 * `acervo_logos`). Entra aqui só marca com logo oficial; não é registro de
 * participação — por isso não vive em PARTICIPANTS, que alimenta as páginas
 * históricas.
 */
export const LOGOS_ACERVO_EXTRAS = [
  { name: 'Boldfood Confeitaria Inclusiva', slug: 'boldfood-confeitaria-inclusiva' },
  { name: 'Casa Alice Doceria', slug: 'casa-alice-doceria' },
  { name: 'Cookitos', slug: 'cookitos' },
  { name: 'Delas Café Bistrô', slug: 'delas-cafe-bistro' },
  { name: 'Diva do Café', slug: 'diva-do-cafe' },
  { name: 'Docinhos da Lalá', slug: 'docinhos-da-lala' },
  { name: 'Maison Julie Douceur', slug: 'maison-julie-douceur' },
  { name: "Mariana's Confeitaria", slug: 'marianas-confeitaria' },
  { name: 'Marlon Vinicius - Confeitaria e Café', slug: 'marlon-vinicius-confeitaria-e-cafe' },
].map((p) => ({ ...p, logo: `/logos/participants/${p.slug}.png` }))
