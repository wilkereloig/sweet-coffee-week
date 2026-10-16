// Gera o INSERT de `acervo_logos` a partir de src/data/participants.js — as
// logos que o SITE já exibe (public/logos/participants/<slug>.png). Nunca
// digitar essa lista: rodar de novo quando o acervo ganhar logo.
//   node scripts/acervo-logos-para-sql.mjs > /tmp/acervo_logos.sql
import { PARTICIPANTS } from '../src/data/participants.js'
import { LOGOS_ACERVO_EXTRAS } from '../src/data/logosAcervoExtras.js'

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
// Registro Lovers + marcas só da Cartoon (logos oficiais: scripts/sincronizar-logos-oficiais.py).
const linhas = [...PARTICIPANTS, ...LOGOS_ACERVO_EXTRAS].filter((p) => p.logo).map((p) =>
  `  (public.normalizar_nome(${q(p.name)}), ${q(p.name)}, ${q(p.slug)}, ${q(p.logo)})`)
console.log('insert into public.acervo_logos (chave, nome, slug, path) values')
console.log(linhas.join(',\n'))
console.log('on conflict (chave) do update set nome = excluded.nome, slug = excluded.slug, path = excluded.path;')
