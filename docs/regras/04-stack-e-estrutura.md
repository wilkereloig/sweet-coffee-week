<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

## 4 · Stack e estrutura

### 4.1 Stack

- **Vite + React 18 (JSX). Sem TypeScript.**
- **Roteamento:** router customizado em `src/router.js` (`useRoute`). **Não** usar React
  Router. O hash routing **deixou de ser obrigatório** — os QR Codes que o exigiam foram
  aposentados junto com a edição Lovers (§Anexo A-C).
- **Fontes:** **duas vozes da mesma família** desde 11/09/2026 (§6.5). A **Nexa Slab**
  continua self-hosted em `public/fonts/nexa-slab/` (woff2, pesos 100–900 + itálicos +
  alias `'Nexa Slab Black'`), declarada em `src/styles/fonts-nexa-slab.css`. A **Nexa** e
  a **Nexa Text** vêm do **Typekit, kit `ngx4uek`**, pelo **embed JS** do `index.html`
  (e do `painel-app/index.html`).
  ⚠️ **Não voltar ao `<link>` do `ngx4uek.css`:** desde 29/09/2026 esse endereço responde
  412 e só o `ngx4uek.js` serve o kit — com o `<link>`, site e painel caíam inteiros na Slab.
  ⚠️ **A regra "nenhum serviço externo de fonte" CAIU** — e ela já estava falsa antes
  disto: o `index.html` carrega a **Archivo do Google Fonts** desde o patch da F2, para a
  seção 07 da Home. Eram duas afirmações e só uma era verdade.
  ⚠️ É o mesmo kit `ngx4uek` que o Anexo A.1 registra como morto: ele servia a Sofia Pro
  Comp do KV Lovers e morreu com ele. **Voltou com outro conteúdo.** O outro kit,
  `kgh7res`, segue fora.
  **Sem o Typekit nada quebra:** o fallback declarado nos dois tokens é a própria Nexa
  Slab — a página fica como era antes da revisão, mais pesada e nunca faltando.
- **Backend:** Supabase (`src/lib/supabase.js`). ⚠️ **Os três formulários TÊM backend** —
  conferido no código em 07/08/2026, contra três versões incompatíveis na documentação
  antiga. Cada um grava por RPC do Supabase, com a **lógica pura isolada numa lib sem
  import de supabase** (a função `rpc` é injetada, o que torna a lib testável):

  | Formulário | Lib | RPC |
  |---|---|---|
  | Contato | `src/lib/contactRequest.js` | `submit_contact_request` |
  | Apoiar | `src/lib/supportInterest.js` | `submit_support_interest` |
  | **Quero participar** (estática) | — o próprio HTML | `submit_quero_participar` |

  ⚠️ **`participationInterest.js` foi removido em 26/08/2026** (junto com
  `tests/participation-interest.test.mjs`). A página `Participar` (§7.4) não tem
  formulário desde 22/08/2026 — o pré-cadastro virou a chamada para
  `/quero-participar/`, e a lib ficou sem nenhum importador. **A RPC
  `submit_participation_interest` e a tabela `participation_interests` continuam no
  Supabase, intocadas:** guardam os envios antigos, e apagar schema com dado do
  outro lado não é limpeza de frontend (§4.3).
  ⚠️ **A origem `participar` saiu do painel (`/organizacao/` e `/painel/`) em
  27/08/2026** (pedido do Wilke) — era o cartão de "os formulários" com a nota
  desatualizada "ainda não está público... seção 08 da página Participar", e a
  aba/tab de Respostas e Mesa que lia `get_participation_interests`. A RPC e a
  tabela seguem intocadas no Supabase; **as duas telas só pararam de exibi-las**
  — quem substitui é a origem `quero_participar`, já pública.

  ⚠️ **Ter código de backend não é ter backend.** Em 20/08/2026 descobriu-se que
  **as três migrations de formulário nunca tinham sido aplicadas**: as tabelas
  `contact_requests`, `participation_interests` e `support_interests` não
  existiam no Postgres. Os três formulários falhavam em **todo** envio desde que
  foram ao ar — honestamente, porque a lib nunca afirma "enviado" sem gravar, e
  por isso ninguém percebeu. Não há `supabase/config.toml` nem CLI: **migration
  em arquivo só vira migration aplicada por ação manual.** As quatro estão
  aplicadas desde 20/08/2026.

  ⚠️ **Projeto Supabase pausado perde o DNS** e devolve NXDOMAIN, o que parece
  projeto deletado. O plano free da org permite **2 projetos ativos**; o
  `ascendium-ecommerce` foi pausado em 20/08/2026 para o SCW voltar. Antes de
  concluir que um projeto sumiu, checar o status — `INACTIVE` é pausa.

  🔴 **`supabase/migrations/` não é o esquema inteiro, e por isso não é a fonte
  de verdade dele.** Em 23/08/2026 o banco tinha **17 migrations** e a pasta,
  **8**: as 9 de junho — as que criam `votos`, `feedback_geral`, `admin_ok`,
  `submit_vote` e `get_rankings` — só existem dentro do Supabase. Num projeto
  no plano free, sem backup automático, isso é esquema sem cópia: um dump dos
  2.702 votos não teria onde ser recolocado. Recuperar é rodar no SQL Editor
  `select version, name, array_to_string(statements, E';
') as sql from
  supabase_migrations.schema_migrations order by version;`, baixar o CSV e
  passar em `node scripts/recuperar-migrations.mjs <csv>`.
  ⚠️ **Não transcrever migration à mão.** Arquivo que sai diferente do banco é
  pior que arquivo ausente: parece autoridade e mente. Por isso o caminho é o
  CSV, e não a digitação.
  ⚠️ **Conferir migration por contagem não pega a divergência** — foi o que
  falhou em 22/08, quando a checagem deu "13, sem divergência". Os nomes de
  arquivo do repositório usam data sem hora (`20260710_contact_requests.sql`) e
  os do banco usam o carimbo cheio (`20260820212953`): parecidos o bastante
  para enganar quem confere de olho.

  ✅ **Plano de funções da organização no banco e nas Edge Functions — 18/09/2026.**
  As quatro migrations que estavam só em arquivo foram aplicadas pelo MCP, cada uma
  registrada: `revoke_criar_itens_do_combo` · `fase1_funcoes_organizacao` ·
  `fase2_marcar_senha_trocada_ator_rotulo` · `fase4_pode_por_user`. Com elas, as 11
  RPCs que chamavam `pode_organizacao(p_secret)` passaram a chamar `pode()` direto
  (5 relatórios sensíveis exigem `relatorio.ler`, **só Administrador**, decisão do
  Wilke), e nasceram `minhas_permissoes()` e `pode_por_user()`. As cinco Edge
  Functions de conta foram publicadas a partir de `supabase/functions/`:
  `regerar-senha-conta` (nova), `criar-conta-organizacao`, `arquivo-url`,
  `enviar-push` e `criar-acesso-marca`. Conferido por `has_function_privilege`,
  teste de fumaça (401 sem credencial nas cinco) e Security Advisor sem alerta
  novo.
  ⚠️ **O `revoke` de `criar_itens_do_combo` estava escrito só para `anon,
  authenticated`** e deixaria o EXECUTE de `PUBLIC` — corrigido antes de aplicar.
  Antes dele, `anon` executava a função (conferido).
  ⚠️ **O painel publicado já dependia dessas peças desde o merge de 18/09**; a
  senha única e o login das marcas nunca dependeram, e seguem pelo caminho de
  sempre. Contas nominais de organização: **zero** — a porta nova existe, vazia.
  ⚠️ **O MCP do Supabase recusou o SQL por horas com `password authentication
  failed for user "postgres"`** enquanto a API de gestão (Edge Functions)
  respondia e o SQL Editor do painel funcionava. **Religar o conector resolveu
  na hora, sem trocar senha nenhuma** — a causa exata não foi apurada. Antes de
  redefinir a senha do banco por causa desse erro, religar o conector.

  ✅ **Fase 2 da autenticação aplicada em 23/08/2026** (migrations
  `pode_organizacao_fase2` + `pode_organizacao_revoke_anon`). As **14 RPCs da
  organização** deixaram de chamar `admin_ok(p_secret)` e passaram a chamar
  **`pode_organizacao(p_secret)`**, que devolve `true` para quem tem
  `perfis.papel = 'organizacao'` **ou** para a senha única. Fora, de propósito:
  `admin_ping` (é o próprio teste da senha) e `get_rankings` (pública).
  **Nada foi removido:** `admin_ok` e a tela de senha única seguem funcionando,
  e `/organizacao/` não exige login nominal. A porta nova está aberta e vazia —
  ninguém tem `papel = 'organizacao'` ainda.
  ⚠️ **Fechar uma função de guard exige `revoke ... from public, anon,
  authenticated` — os três na mesma linha.** A regra registrada aqui em 23/08
  dizia só metade, e a outra metade custou quatro tentativas em 25/08:

  - `revoke ... from public` sozinho não basta: o Supabase concede EXECUTE
    **explicitamente** a `anon` e `authenticated`;
  - `revoke ... from anon, authenticated` sozinho **também** não basta: o
    Postgres concede EXECUTE a **`PUBLIC`** por padrão em toda função nova, e
    `anon` herda de `PUBLIC`.

  `admin_ok` e `pode_organizacao` estavam fechadas porque a Fase 2 fez os dois
  sem saber que precisava dos dois. `pode` e `acesso_travado` nasceram abertas
  e só fecharam quando os três alvos entraram juntos.

  ⚠️ **A conferência é por `has_function_privilege`, nunca por ter escrito a
  linha do `revoke`.** As três primeiras tentativas de 25/08 retornaram sucesso
  e não mudaram nada — `revoke` de permissão que o papel não tem diretamente
  não dá erro, só não faz nada:

  ```sql
  select has_function_privilege('anon', 'public.minha_funcao(text)', 'execute');
  ```

  `create or replace` **preserva a ACL** da função existente — por isso uma
  função já fechada continua fechada ao ser reescrita, e só as **novas** exigem
  o revoke. O Security Advisor pega o que escapar, mas só depois de aplicada.

  Migration em `supabase/migrations/`. **Nenhum deles afirma "enviado" se a gravação
  falhar** — é regra escrita no cabeçalho dos três arquivos. ⛔ **Não trocar por
  "copia para a área de transferência e abre o Instagram"**: essa era a descrição do
  `DEV_GUIDE.md`, e estava errada.
- **`src/config/channels.js` existe** e é a fonte de `INSTAGRAM_HANDLE` / `INSTAGRAM_URL`.
  A documentação antiga o marcava como "alvo a criar" — não é.
- `src/lib/pageMeta.js` atualiza `<title>` e description por rota em runtime.
  `src/lib/analytics.js` é GA4 com consentimento.

### 4.2 Estrutura de pastas

```
src/
  components/   nav.jsx (SiteHeader + PAGE_COLORS/pageColorDark), SiteFooter.jsx,
                MobileTabBar.jsx, MobileMenu.jsx, AccessDialog.jsx,
                BotaoTopo.jsx, icons.jsx
  components/scw-icons/  ScwIcon.jsx + scw-icons-v2.js (136 ícones, 16 famílias,
                traço 3.2 — gerado no Design, NÃO editar à mão)
  pages/institutional/   Home · Edicoes · HistoricoAwards · Participar · Apoiar ·
                Contato · EmBreve
  data/         sweetCoffeeHistory.js, loversAwardsResults.js, participants.js,
                sweetAwards.js, participantAssets.js, editionAssets.js,
                faqCentral.js (93 dúvidas), imageLibrary.js,
                imageVariants.js (GERADO — não editar à mão),
                handoff/{edicoesData,awardsData}.js
  data/_arquivo/  dados aposentados, FORA do bundle — não importar em código vivo
  lib/          supabase.js, pageMeta.js, analytics.js, adminAccess.js, marcaAccess.js,
                contactRequest.js, supportInterest.js
  hooks/        useSiteMotion.js (motor de movimento do institucional)
                useRevealOnScroll.js (sistema anterior, só /em-breve)
  styles/scw-2026.css      SISTEMA VISUAL ATUAL: tokens --scw-*, casca, utilitárias
  styles/scw-motion.css    MOVIMENTO: tokens --mo-*, reveal, heróis, hover
  styles/scw-<pagina>.css  scw-home, scw-edicoes, scw-awards, scw-contato,
                           scw-participar-apoiar
  styles/motion-system.css movimento do sistema ANTERIOR — só serve /em-breve
  styles/fonts-nexa-slab.css
  App.jsx · router.js
scripts/        gerar-variantes.mjs (produz as variantes e o imageVariants.js)
public/images/  logos, combos/<slug>/, edicoes/<code>/, marcas-edicoes/<code>/,
                momentos/, campanha/, imprensa/, shapes/
                + variantes `NN-480.webp` / `NN-960.webp` ao lado do original
public/fonts/nexa-slab/
public/manifest.webmanifest   camada de aplicativo (theme-color, ícones, iOS)
public/quero-participar/   estática, fora do bundle (§10.4-b)
public/painel/ · public/organizacao/ · public/marca/
                só sw.js + app.webmanifest (ícone instalado). O painel em si é
                o app React em painel-app/ (docs/PAINEL-REACT-MAPA.md)
acervo-bruto/   ~58 GB, na RAIZ, fora de public/ e fora do git
```

⚠️ **Não devolver o acervo bruto para dentro de `public/`.** Ele morava lá e o Vite
copiava 58 GB a cada build. Movido para a raiz, o build caiu para ~364 MB / ~5 s.

#### Variantes responsivas de imagem — como funciona, e o que não fazer

Cada foto do acervo ganha versões estreitas em disco (`480`, `960`), e o componente pede
a certa por `srcSet(src)` + `sizes={SIZES.*}` de `imageLibrary.js`. O celular passou a
baixar de **72% a 92% menos** por página.

- **`imageVariants.js` é GERADO.** Sai de `node scripts/gerar-variantes.mjs`. ⛔ **Não
  editar à mão** — vale a mesma regra de `scw-icons-v2.js` (§6.11). Acrescentou foto ao
  acervo? Rodar o script.
- **A tabela é permissiva de propósito.** Caminho que não está nela sai **sem** `srcset` e
  o navegador usa o original — o comportamento de antes. Então uma foto nova nunca
  quebra; ela só deixa de economizar até o script rodar.
- **O original é o último candidato do `srcset`, com a largura real dele.** Sem essa
  entrada a tela grande cairia na variante de 960px e a foto ficaria mole no desktop.
- **Três `sizes` fechados**, e não um valor por chamada: `miniatura` (fita e galeria),
  `cartao` (pódio e grade), `cheia` (foto que sangra). Valor solto em componente é a
  segunda fonte de verdade que o §5.2 proíbe.

### 4.3 A demolição — feita em 07/08/2026

**Um sistema visual só.** Saíram 379 KB de código morto:

| Arquivo removido | Tamanho | O que era |
|---|---|---|
| `src/styles/lovers-system.css` | 138 KB | KV Lovers |
| `src/styles.css` | 113 KB | sistema legado v1 |
| `src/pages/lovers/Painel.jsx` | 67 KB | painel de votação — pertence à camada de edição |
| `src/pages/institutional/PainelAdmin.jsx` | 20 KB | tela interna |
| `src/styles/swc-redesign.css` | 17 KB | redesign anterior (v2) |
| `src/pages/institutional/Pesquisa.jsx` | 9 KB | tela interna |
| `src/styles/pesquisa.css` | 6 KB | idem |
| `src/data/pesquisaLovers.js` | 4 KB | idem |
| `src/styles/tokens.css` | 3 KB | `:root` do sistema anterior |

Junto saíram as rotas `painel`, `pesquisa` e `painel-admin` do `App.jsx` e três imports
do `main.jsx`. **Resultado medido no build:**

| | Antes | Depois |
|---|---|---|
| CSS entregue | 325 KB (219 + 106 de chunk) | **122 KB** |
| JS entregue | 1.726 KB | **715 KB** |
| Módulos transformados | 142 | 129 |
| Tempo de build | 9,0 s | **2,5 s** |

O `exceljs` (939 KB, exportação de planilha do painel admin) saiu do bundle inteiro.
✅ `exceljs` não está mais em lugar nenhum (28/09/2026: não constava no `package.json`,
só restos no `package-lock.json`, removidos). `qrcode` ainda tem um importador.

#### O arquivo novo: `src/styles/em-breve.css`

A landing traz o próprio CSS num `<style>` inline, mas **consumia 26 tokens** definidos
só nos arquivos mortos — cor, as três famílias de fonte, escala tipográfica, espaço,
raio, sombra e as seis cores de marca da Lovers que `participants.js` ainda lê. Apagar
sem extrair teria quebrado a única página no ar.

`em-breve.css` preserva esses tokens **já resolvidos**, sem `var()` encadeado. ⛔ **Não
usar nenhum deles em página nova** — o sistema vivo é `scw-2026.css`.

⚠️ **Em 25/08/2026 a landing parou de consumi-los** (§7.7): a reescrita a levou para a
paleta viva. O arquivo **continua obrigatório** mesmo assim — `components/icons.jsx` e
`data/participants.js` / `participantAssets.js` leem tokens dele. É a lição do §4.3 outra
vez: **quem apaga por caminho não vê quem consome por `var()`.** Ele morre quando o
último consumidor sair, não quando a landing sair.

#### ⛔ O que continua intocável

| Arquivo | Por quê |
|---|---|
| `src/pages/institutional/EmBreve.jsx` | é a página pública ativa |
| `src/styles/motion-system.css` | define as `.motion-*` que a EmBreve usa |
| `src/hooks/useRevealOnScroll.js` | a EmBreve o chama direto |
| `src/styles/layout-tokens.css` | ⚠️ **não é órfão:** guarda os `--motion-*` e `--ease-*-soft` que o `motion-system.css` consome |
| `src/styles/em-breve.css` | os tokens extraídos acima |
| `src/config/channels.js` | a EmBreve importa `INSTAGRAM_HANDLE`/`INSTAGRAM_URL` dele |
| `src/data/contactFaq.js` | exporta `CONTACT_SUBJECTS`, usado pelo formulário do Contato |

#### A lição, que vale para a próxima remoção

**Procurar pelo nome do arquivo não basta.** Três itens entraram na lista de mortos sem
estarem mortos — `layout-tokens.css`, `contactFaq.js` e os tokens da landing — porque
ninguém os importava *pelo nome*: eram consumidos por `var()` e por named export.

**Antes de apagar qualquer arquivo:** varrer os **nomes que ele exporta** e os
**custom properties que ele define**, não só o caminho dele.

---

