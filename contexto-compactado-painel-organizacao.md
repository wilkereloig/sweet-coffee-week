# Contexto Compactado — Painel da organização + formulário /quero-participar (SCW)

**Data da compactação:** 20/08/2026
**Chat original:** ~45 trocas, duas fases (integração do formulário estático → painel interno + publicação)
**Repositório:** `ELOI SITES/site-sweet-coffee-week-home-v2` · branch `dev/site-completo`

---

## 1. Objetivo

Construir a área interna onde a organização do Sweet & Coffee Week lê as respostas
dos formulários do site, para poder **lançar o formulário de pré-cadastro de marcas**.
Terminou publicado em produção, com o ciclo completo verificado: formulário público →
RPC → tabela → painel.

## 2. Decisões Tomadas

- **Painel como página estática (`public/organizacao/index.html`), não rota React:** o gate
  `COMING_SOON_PUBLICATION = true` faz o domínio renderizar só a landing em qualquer rota
  React. A Vercel serve o sistema de arquivos antes do rewrite do SPA, então a página
  estática responde sem tocar em nenhuma flag (A3).
- **Autenticação por senha única (`admin_ok`), não magic link / `organizacao_membros`:** a
  infra de senha já existia no `schema.sql` (do painel do Awards). O plano de handoff previa
  5 migrations; sobrou **1**, porque RLS já estava ligado, as RPCs já eram `SECURITY DEFINER`,
  as colunas `reviewed_at`/`internal_notes` já existiam e a leitura por senha já existia.
- **Sem `supabase-js` no painel:** PostgREST chamado por `fetch` direto. Seriam ~100 KB de CDN
  para fazer quatro POSTs.
- **Sem view `UNION ALL` de listagem:** as quatro RPCs de leitura já devolvem as linhas; juntar
  quatro arrays em JS é mais barato que manter uma view que exige `security_invoker`.
- **Tabela própria `quero_participar` com `payload jsonb`:** o formulário tem 14 campos contra
  os 9 da RPC antiga de participação. Colunas para o que é consultável, `jsonb` para o resto —
  pergunta nova no formulário não pede migration nova.
- **Uma RPC de escrita para as quatro origens** (`organizacao_atualizar_registro`), com a origem
  entrando por lista fechada e `format(%I)` — nunca concatenação (injeção de SQL).
- **Nenhuma política nem RPC de `DELETE`:** registro se arquiva pelo status.
- **Área "Os formulários" com link só onde há link real:** só `/quero-participar/` é público. Os
  outros três são rota React e, com o gate ligado, qualquer link levaria à landing — aparecem
  com ausência honesta (§8.4).
- **`ascendium-ecommerce` pausado** para liberar vaga do SCW (pedido: manter só ELOI Studio e
  Sweet & Coffee Week ativos).
- **Merge para `master` autorizado explicitamente** pelo Eloi, ciente de que publicava 177
  commits e trocava a versão da landing no ar. Gate permaneceu ligado.

## 3. Estado Atual

**Tudo em produção e verificado.** `https://www.sweetcoffeeweek.com.br/organizacao/` e
`/quero-participar/` respondem 200. Envio real feito pelo Eloi chegou ao banco (1 registro,
status `novo`). Build verde; `tests/organizacao.test.mjs` 11/11, `tests/quero-participar.test.mjs`
9/9, `tests/redesign-2026.test.mjs` 15/15.

O gate `COMING_SOON_PUBLICATION` **continua `true`** — o público vê só a landing. O
institucional completo não foi ao ar.

### Descobertas que mudaram o plano

1. **O projeto Supabase estava PAUSADO, não deletado.** Projeto pausado perde o DNS e devolve
   NXDOMAIN, o que parece remoção. Diagnóstico anterior (nesta mesma sessão) estava errado.
2. **As três migrations de formulário nunca tinham sido aplicadas.** `contact_requests`,
   `participation_interests` e `support_interests` não existiam no Postgres. Contato, Participar
   e Apoiar falhavam em **todo** envio desde que foram ao ar — silenciosamente, porque as libs
   nunca afirmam "enviado" sem gravar. Aplicadas em 20/08/2026.
3. **Rota estática sem barra final cai no fallback do SPA.** Era a causa de "clico em
   Organização e volta para a página principal".

## 4. Arquivos e Artefatos Relevantes

| Arquivo | Status | Descrição |
|---|---|---|
| `public/organizacao/index.html` | Criado | Painel inteiro: HTML+CSS+JS inline, sem dependência externa |
| `public/quero-participar/index.html` | Editado | Passou de Formspree para Supabase; `urlPublica` com barra final |
| `supabase/migrations/20260820_painel_organizacao.sql` | Criado | Tabela `quero_participar` + 3 RPCs |
| `public/robots.txt` | Criado | `Disallow: /organizacao` |
| `vercel.json` | Editado | Rewrites explícitos para as duas rotas estáticas |
| `src/components/AccessDialog.jsx` | Editado | Cartão "Organização" virou `<a href="/organizacao/">` |
| `src/components/nav.jsx` | Editado | Prop `apenasAcesso` — cabeçalho reduzido ao botão |
| `src/App.jsx` | Editado | Renderiza header reduzido + AccessDialog na `/em-breve` |
| `src/styles/scw-2026.css` | Editado | `.scw-header--so-acesso`, `a.scw-acesso__cartao--link` |
| `tests/organizacao.test.mjs` | Criado | 11 checagens do script inline |
| `tests/quero-participar.test.mjs` | Editado | 9 checagens |
| `CLAUDE.md` | Editado | §4.1 (migrations não aplicadas, projeto pausado) e §10.4-b novo |

**Commits (todos em `dev/site-completo` e `master`):** `1c98d72` painel · `b919ff6` acesso ·
`b95dc3e` barra final · `26086ad` rewrites · `0156204` botão na landing · `0e77951` merge ·
`927a2d1` área de formulários + CLAUDE.md

## 5. Código e Configurações Críticas

**Supabase — projeto SCW Lovers** (chave publicável, pública por design; RLS ligado sem policy):

```
URL:  https://dgfmoibynftadsyjcclg.supabase.co
KEY:  sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R
Org:  ELOI STUDIO DESIGN (mubtwzjqfezblmwtsmkt) — plano FREE, 2 projetos ativos
```

**RPCs em uso pelo painel:**

| Origem | Leitura | Escrita pública |
|---|---|---|
| `contato` | `get_contact_requests(p_secret)` | `submit_contact_request` |
| `participar` | `get_participation_interests(p_secret)` | `submit_participation_interest` |
| `apoiar` | `get_support_interests(p_secret)` | `submit_support_interest` |
| `quero_participar` | `get_quero_participar(p_secret)` | `submit_quero_participar(p_payload jsonb)` |

Mais `admin_ping(p_secret)` (login), `get_organizacao_resumo(p_secret)` e
`organizacao_atualizar_registro(p_secret, p_origem, p_id, p_status, p_nota)`.

**Definir/trocar a senha do painel** — só pelo SQL Editor (a função tem `revoke all from
public, anon, authenticated`; o banco guarda só o hash bcrypt, então a senha **não é
recuperável**). Usar `$$` evita erro de sintaxe com apóstrofo e `@`:

```sql
select public.set_admin_secret($$a-senha-aqui$$);
select public.admin_ok($$a-senha-aqui$$);  -- true = o painel aceita
```

**Vocabulário de status por tabela** (cada uma tem seu `CHECK` — não são iguais):

```
contact_requests         novo · em_analise · respondido · encerrado
participation_interests  novo · em_analise · contatado · aprovado · nao_selecionado · aguardando_cadastro
support_interests        novo · em_analise · contatado · em_negociacao · fechado · arquivado
quero_participar         igual a participation_interests
```

## 6. Erros e Armadilhas Conhecidas

- ⛔ **Barra final é obrigatória** nas rotas estáticas. `/organizacao` → index.html do SPA;
  `/organizacao/` → o painel. Medido em `vite preview`. O `vercel.json` tem rewrite como rede
  de segurança em produção, mas **todo link interno escreve a barra**.
- ⛔ **O dev server (`npm run dev`) NUNCA serve as páginas estáticas**, com barra ou sem — o Vite
  não faz resolução de índice de diretório para `public/`. Conferir sempre contra o build.
- ⛔ **O JS inline dessas páginas não passa pelo Vite**: `npm run build` fica verde com o script
  quebrado. Foi assim que um `ReferenceError` (`montarResumo` apagada junto com `montarRevisao`)
  chegou ao commit. Guarda por *substring* não pega — os testes checam **declaração**.
- ⛔ **Migration em arquivo ≠ migration aplicada.** Não há `supabase/config.toml` nem CLI.
- ⛔ **Projeto Supabase `INACTIVE` é pausa, não remoção.** Checar `list_projects` antes de
  concluir que sumiu. Restaurar exige pausar outro (limite de 2 no free).
- ⛔ **Não usar `service_role` em nada dentro de `public/`.** O teste reprova o arquivo se a string
  aparecer, inclusive em comentário.
- ⛔ **Encoding do shell (Git Bash) corrompe UTF-8** em `curl -d` com acento → HTTP 400 que parece
  bug da aplicação. Testar payload acentuado via `node -e` com `fetch`.
- ⛔ `node --check <(...)` e `node -e` lendo `/tmp` falham no Windows. Usar arquivo real no
  scratchpad.

## 7. Próximos Passos

- [ ] **Trocar a senha do painel** se ficou a que apareceu em print durante a sessão (está no
      histórico do chat, logo não é mais secreta). Uma linha de SQL, ver §5.
- [ ] **Aviso de resposta nova** — hoje ninguém é notificado; a organização precisa abrir o
      painel. Recomendado: resumo diário. Não iniciado.
- [ ] **Aplicar `PATCH-participar-08-quero-participar.md`** — transforma a seção `08 Pré-cadastro`
      da página Participar num convite para `/quero-participar/`. Perguntado 3× sem resposta. Sem
      urgência: aquela página só vai ao ar quando o gate cair.
- [ ] **Exportar CSV** do que está filtrado no painel (JS puro — ⛔ não trazer o `exceljs` de volta).
- [ ] Retenção de dados (LGPD): por quanto tempo o registro fica e quem pode exportar.

## 8. Informações Pendentes

- **`participation_interests` está definida duas vezes** — em `supabase/schema.sql:529` e na
  migration `20260710`. Idempotente, não quebra, mas convém saber qual o banco aplicou antes de
  escrever migration em cima.
- **`src/data/sweetCoffeeHistory.js` segue modificado e não commitado** — trabalho anterior, não
  relacionado a esta tarefa. Nunca foi incluído em nenhum commit desta sessão.
- **Hook do impeccable acusa `single-font` e `flat-type-hierarchy`** no painel. Deixados como
  estão: fonte única é regra do projeto (§6.5) e densidade é deliberada em painel interno.
  Não suprimidos, só não corrigidos.
- **`acervo/`** é referenciado pelo `CLAUDE.md` e pelos handoffs, mas **não existe no repositório**.

---

> **Instrução para o próximo chat:** Este arquivo contém o contexto compactado de um chat
> anterior. Use-o como base para continuar o trabalho. Não peça ao usuário para repetir
> informações que já estão aqui. Leia também o `CLAUDE.md` do projeto — ele é a fonte de regra
> e foi atualizado nesta sessão (§4.1 e §10.4-b). Comece confirmando brevemente que entendeu o
> contexto e pergunte por onde o usuário quer continuar.
