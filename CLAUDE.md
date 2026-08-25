# Sweet & Coffee Week — Regras do projeto

**Documento único.** Versão 1.0 — 07/08/2026.
Substitui e aposenta `AGENTS.md`, `AI_RULES.md`, `DESIGN.md`, `docs/GUIA-VISUAL.md`,
`docs/DEV_GUIDE.md`, `docs/SITEMAP.md`, `docs/SITE_DIRECTION.md` e a versão anterior
deste arquivo. O que sobreviveu deles está aqui; o que não está aqui foi descartado de
propósito — o Anexo A diz o quê e por quê.

**Fontes deste documento:** `acervo/ACERVO-OFICIAL.md` (o dado do festival),
`acervo/decisoes-acervo-2026-08.md` (as decisões), `acervo/plano-site-institucional.md`
(o alvo) e a leitura integral dos 8 documentos de regra anteriores (4.082 linhas /
229 KB), filtrada contra o código real.

---

## 0 · Como usar este documento

### 0.1 Hierarquia de autoridade — só existem três degraus

| Degrau | Fonte | Vale para |
|---|---|---|
| 1 | **O código** em `src/` | Valor visual, dado, comportamento. Se este documento divergir do código, **vale o código** — e o documento é corrigido no mesmo commit |
| 2 | **Este documento** | Processo, arquitetura, direção visual, tom, o que é proibido |
| 3 | **O acervo** (`acervo/*.md` no projeto) | Dado histórico do festival: edições, marcas, pódios, números |

Não há quarto degrau. Nenhum outro `.md` do repositório carrega regra ativa.

### 0.2 Como classificar uma regra antes de responder

1. **Absoluta de segurança/operação** (§1) — respeitar sempre, sem exceção.
2. **Regra de marca/conteúdo** (§8) — respeitar, adaptando a execução.
3. **Preferência visual** (§6) — manter coerência; se o usuário pedir direção nova, seguir e registrar aqui.
4. **Orientação técnica** (§5, §10) — base para construir, **não parede**.

**"Evitar" ≠ "proibir".** Evitar decoração não proíbe elemento visual com função. Evitar
duplicação não proíbe variação justificada. Evitar animação decorativa não proíbe
transição e microinteração. Evitar mudança global página-a-página não proíbe refatorar a
fonte única.

**Toda resposta leva a uma execução ou a um plano objetivo.** Nunca usar regra como
justificativa para não fazer nada.

**Se este documento contradisser o código, parar e avisar:** dizer qual regra conflita,
qual é o estado real, qual atualização será feita — e então seguir.

---

## 1 · Absolutas

Estas não se negociam, não se contornam e não dependem de contexto.

| # | Regra |
|---|---|
| A1 | **Nunca alterar `master`/`main`.** Trabalhar sempre na branch de desenvolvimento ativa: **`dev/site-completo`**. Conferir com `git branch --show-current` antes de tocar em qualquer coisa. Se estiver em `master`/`main`: **parar e avisar** |
| A2 | **Nenhum deploy de produção.** Nunca `vercel --prod`. Nunca promover Preview para Production. Nunca fazer merge para `master`/`main` sem autorização explícita por escrito |
| A3 | **Não alterar as flags de publicação** em `src/App.jsx` sem pedido explícito (§3.4) |
| A4 | **Não inventar dado.** Nem histórico, nem ranking, nem vencedor, nem logo, nem nome de pessoa, nem veículo, nem e-mail, nem telefone, nem canal externo (§8.5) |
| A5 | **Não ler, exibir ou versionar** `.env`, secrets, tokens, chaves ou credenciais |
| A6 | **Não alterar a Home** (`/`, "O Festival") sem solicitação explícita. É a página-mãe (§7.1) |
| A7 | **Pedir confirmação antes de ação destrutiva:** apagar arquivo, `reset`, `force-push`, remover dependência principal, mexer em configuração de produção |
| A8 | **Nunca fingir ter usado uma ferramenta** |

---

## 2 · O que o site é hoje

### 2.1 As duas camadas

O ecossistema tem duas camadas, e confundi-las é a origem de metade dos erros antigos.

| | **Institucional** — permanente | **Edição** — temporária |
|---|---|---|
| Duração | o ano inteiro | enquanto a edição acontece |
| Identidade | única, fixa | KV próprio: tema, tipografia e paleta dedicados |
| Combos | histórico, como acervo | ao vivo, com preço e endereço |
| Mapa e rota | não tem | interativo, com "minha rota" |
| Avaliação | resultados históricos | avaliação aberta |
| Ações especiais | não tem | Rota da Doçura, adesivos, brindes |

**É a camada institucional que este repositório constrói.** A camada de edição não
existe hoje e não se antecipa: quando a 17ª edição for anunciada, ela nasce com KV
próprio e páginas próprias.

**O que migra da edição para o institucional quando ela termina:** (1) combos e fotos
dos participantes, que viram a galeria daquela edição no histórico; (2) resultados do
Sweet Awards, que entram no histórico da premiação e no Hall. **O resto — KV, adesivos,
ações especiais, mapa — fica como registro da edição, não vira seção do site.**

### 2.2 O princípio: o acervo é o produto

Não é um site institucional com algumas fotos. São 4.891 fotos de combo, 16 marcas de
edição, 5 depoimentos em vídeo e dez anos de história. Isso inverte a lógica: **a foto é
o conteúdo, o texto é o apoio.**

Três regras que atravessam tudo:

1. **Nada de edição ativa.** O site fala no passado e no futuro, nunca no presente.
2. **Nenhum dado volátil.** Sem preço, sem endereço, sem horário, sem patrocinador
   exibido. São os dados que envelhecem — sem eles o site fica um ano no ar sem mentir
   uma linha.
3. **Duas conversões o ano inteiro.** Marca que quer participar, empresa que quer apoiar.

### 2.3 Estado de publicação

O que está no ar em `sweetcoffeeweek.com.br` hoje é **só a landing `/em-breve`**, por
causa da flag `COMING_SOON_PUBLICATION = true`. Apagar essa página ou essa flag tira o
site do ar. Ver §3.4.

**A versão que vai substituir a landing é a de `dev/site-completo`** — o institucional
de sete páginas descrito no §2.4, não uma reescrita futura. Publicar é `false` na flag
(§3.4) mais o merge em `master` (A2): duas decisões do Eloi, nenhuma automática.

### 2.4 Mapa de páginas — alvo institucional

| Página | Papel | Estado |
|---|---|---|
| **Home** (`/`) | Explicar e seduzir | existe, 7 seções (§7.1) |
| **Edições** (`/edicoes`) | Memória e vitrine | existe, 16 cenas (§7.2) |
| **Sweet Awards** (`/sweet-awards`) | Reconhecimento | existe (§7.3) |
| **Marcas** | Diretório das 123 casas | **não existe — a construir** |
| **Participar** (`/participar`) | Converter marcas | existe, 8 seções (§7.4) |
| **Apoiar** (`/apoiar`) | Converter patrocínio | existe, 6 seções (§7.5) |
| **Contato** (`/contato`) | Triar e responder | existe, 4 seções (§7.6) |

O plano completo de conteúdo por página está em `acervo/plano-site-institucional.md`.
Este documento cobre **como construir**; o plano cobre **o que dizer**.

---

## 3 · Operação

### 3.1 Branch

Trabalhar em **`dev/site-completo`**. Confirmar antes de editar. O conector do GitHub no
Claude Design aponta por padrão para `master`, que está muito atrás — **reapontar sempre
para `dev/site-completo`**. PR de volta vai para `dev/site-completo`, nunca para
`master`.

✅ **Desde 22/08/2026 `dev/site-completo` é superconjunto de `master`** — o merge de
volta foi feito, e tudo que está no ar também está aqui. A branch deixou de ser "o
tronco que está à frente" e passou a ser **a versão do site**, ponto.

| Branch | O que carrega |
|---|---|
| `dev/site-completo` | o site institucional inteiro — **é o que vai substituir a `/em-breve`** |
| `master` | só o publicado: a landing `/em-breve` e as três páginas estáticas |

⚠️ **Commit que entrar por `master` tem que voltar para `dev/site-completo` na mesma
leva.** Foi a divergência dos dois troncos que gerou duas implementações da área da
marca e o conflito `add/add` da unificação. **Tronco que só recebe e nunca devolve vira
o segundo tronco de novo** — e aí a pergunta "qual é o site?" volta a ter duas
respostas, que é o defeito que o §5.1 descreve, subido um nível: de fonte de verdade
duplicada dentro do código para fonte de verdade duplicada entre branches.

### 3.2 Comandos

| Comando | Papel |
|---|---|
| `npm run dev` | servidor de desenvolvimento (porta = `PORT` ou 5173) |
| `npm run build` | build |
| `npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir && rm -rf "$TEMP/scw_build_$$"` | **build de verificação — SEMPRE fora do projeto, uma vez só** |
| `npm run build && npm run test:motion` | 6 páginas × 2 telas; reprova herói ilegível na abertura, reveal preso invisível, rolagem horizontal, erro de console e desrespeito a `prefers-reduced-motion` |
| `npm run test:redesign` | reprova cores/`Archivo` da F2 fora do bloco `.f2-realiza*`; reprova se os tetos de medida de linha saírem |
| `npm run test:imagens` | reprova componente que monta caminho de imagem na mão |
| `node tests/responsive.mjs` | Playwright contra o **build de produção** via `vite preview`, em 6 viewports; reprova overflow horizontal, marca fora do trilho, barra de abas ausente no celular ou visível acima de 900px, aba abaixo de 44px e folha "mais" que não abre ou não fecha por Esc/véu/link |
| `npm run build && npm run design:snapshot` | snapshot estático das 6 páginas para o Claude Design |

**Nunca disparar dois builds ao mesmo tempo.** Esperar o anterior terminar.

### 3.3 Fluxo ao finalizar uma tarefa

1. **Build local** (`npm run build`). Falhou → parar, mostrar o erro, **não** commitar.
2. `git status` — conferir o que mudou.
3. Commit pequeno e claro: `git add <arquivos da tarefa>` + `git commit -m "tipo: descrição"`.
   Tipos: `fix:` · `feat:` · `style:` · `chore:` · `docs:`.
4. `git push origin dev/site-completo`.
5. Reportar: build, hash e mensagem do commit, push, link de preview se houver.

⚠️ **O repositório pode ter trabalho em andamento não relacionado.** Commitar **só** os
arquivos da tarefa em questão.

### 3.4 Flags de publicação — `src/App.jsx`

| Flag | Valor atual | O que faz |
|---|---|---|
| `AWARDS_ONLY_PUBLICATION` | `false` | modo "só Awards", desligado |
| `COMING_SOON_PUBLICATION` | **`true`** | **gate ativo** — o domínio oficial renderiza só a landing `EmBreve` |
| `INSTITUTIONAL_PREVIEW` | *computado* | `true` em DEV e em previews `*.vercel.app?preview=1`; **sempre `false`** no domínio oficial. É **aditivo** — libera revisão sem mexer nas outras duas |

Publicar o institucional completo é `COMING_SOON_PUBLICATION = false` — **decisão do
Eloi, nunca automática**. **Não alterar flag para "ver a página em produção": use o
preview.**

### 3.5 Escopo, qualidade e segurança

- Listar os arquivos a modificar **antes** de editar.
- Alterar só o que se relaciona ao pedido.
- Usar `Edit` (não `Write`) em arquivo existente, salvo reconstrução pedida.
- Não reescrever arquivo inteiro se um ajuste local resolve.
- Preservar padrão do projeto, acessibilidade e responsividade.
- Evitar dependência nova sem justificativa.
- Resumo curto após cada conjunto de edições: **arquivos alterados + o que mudou em
  cada um + efeitos de propagação + resultado do build e dos testes**.
- **O repositório é a fonte da verdade.** Buscar contexto em arquivos, docs, commits e
  configs antes de perguntar ao usuário.

### 3.6 Higiene de repositório

- `dist*`, `vite.config.js.timestamp-*` e `**/.impeccable/` já estão no `.gitignore` —
  são clutter de disco do Dropbox, **não** desversionar com `git rm`.
- Gaps do `.gitignore` a fechar: `.devserver.log`, `por.traineddata`, `skills-lock.json`.
- A pasta `public/logos/logo edições/` deve ser renomeada para `logo-editions/` — espaço
  e acento em caminho de asset é armadilha.
- `.gitattributes` normaliza as pontas de linha para LF (texto) e marca binários. Sem
  ele, 105 arquivos aparecem como modificados sem nenhuma mudança real de conteúdo.

---

## 4 · Stack e estrutura

### 4.1 Stack

- **Vite + React 18 (JSX). Sem TypeScript.**
- **Roteamento:** router customizado em `src/router.js` (`useRoute`). **Não** usar React
  Router. O hash routing **deixou de ser obrigatório** — os QR Codes que o exigiam foram
  aposentados junto com a edição Lovers (§Anexo A-C).
- **Fontes:** Nexa Slab self-hosted em `public/fonts/nexa-slab/` (woff2, pesos 100–900 +
  itálicos + alias `'Nexa Slab Black'`), declarada em `src/styles/fonts-nexa-slab.css`.
  **Nenhum serviço externo de fonte** — o Adobe Fonts/Typekit servia só a Sofia Pro Comp
  do KV Lovers, que morreu.
- **Backend:** Supabase (`src/lib/supabase.js`). ⚠️ **Os três formulários TÊM backend** —
  conferido no código em 07/08/2026, contra três versões incompatíveis na documentação
  antiga. Cada um grava por RPC do Supabase, com a **lógica pura isolada numa lib sem
  import de supabase** (a função `rpc` é injetada, o que torna a lib testável):

  | Formulário | Lib | RPC |
  |---|---|---|
  | Contato | `src/lib/contactRequest.js` | `submit_contact_request` |
  | ~~Participar~~ | `src/lib/participationInterest.js` | `submit_participation_interest` |
  | Apoiar | `src/lib/supportInterest.js` | `submit_support_interest` |
  | **Quero participar** (estática) | — o próprio HTML | `submit_quero_participar` |

  ⚠️ **`Participar` está riscado desde 22/08/2026: a página deixou de ter formulário**
  (§7.4). A lib e a RPC continuam em pé e testadas, mas **sem nenhum importador** — o
  pré-cadastro virou a chamada para `/quero-participar/`. Deixar ou remover
  `participationInterest.js` é decisão em aberto: a tabela `participation_interests`
  guarda os envios antigos, e apagar código que ainda tem dado do outro lado é o tipo
  de limpeza que o §4.3 manda fazer devagar.

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
  lib/          supabase.js, pageMeta.js, analytics.js, adminAccess.js,
                contactRequest.js, participationInterest.js, supportInterest.js
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
public/marca/ · public/quero-participar/ · public/organizacao/
                estáticas, fora do bundle (§10.4-b)
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
⚠️ **`exceljs` e `qrcode` continuam no `package.json` sem nenhum importador em `src/`** —
podem sair numa limpeza de dependências.

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

## 5 · Arquitetura

### 5.1 A causa-raiz da dor do projeto

*"Mudo algo global — heróis, cor — e não propaga."* **A causa não é bug: é múltiplas
fontes de verdade para o mesmo conceito.**

> Se você precisa editar "todos os X" e isso obriga a tocar N arquivos, **pare**. É sinal
> de fonte duplicada. A correção é colapsar em uma, não repetir a edição N vezes.

### 5.2 Uma fonte de verdade por conceito

⚠️ **A armadilha desta família é o "snapshot derivado".** `handoff/awardsData.js` e
`handoff/edicoesData.js` nasceram como cópias congeladas da fonte, mantidas à mão — e
foram elas que mantiveram o Hall com número errado e o campo `preco` vivo, meses depois
de a fonte estar certa. **Em 07/08/2026 os dois viraram derivação de verdade**, que roda
a cada import. **Não recongelar.** Se um dado precisa aparecer em duas telas, ele deriva
duas vezes da mesma fonte — não vira dois arquivos.

| Conceito | Fonte |
|---|---|
| Cor, tipografia, espaçamento | tokens em `src/styles/scw-2026.css` |
| Movimento | tokens `--mo-*` em `src/styles/scw-motion.css` + `useSiteMotion.js` |
| Estrutura de herói / seção | um componente, não uma cópia por página |
| Caminho de imagem | `src/data/imageLibrary.js` |
| Variante responsiva de foto | `src/data/imageVariants.js` — **gerado**, ver §4.2 |
| Largura pedida ao navegador | `SIZES` em `src/data/imageLibrary.js` (3 papéis, fechados) |
| Dado histórico | `src/data/sweetCoffeeHistory.js` |
| Pódios da edição 2026.1 | `src/data/loversAwardsResults.js` |
| Perguntas frequentes | `src/data/faqCentral.js` |
| Ícones | `src/components/scw-icons/scw-icons-v2.js` |
| Cor por página em JS | `PAGE_COLORS` / `MENU_ESCURO` em `src/components/nav.jsx` |

### 5.3 Duplicação

- **`grep` no `src/` antes de criar** qualquer componente ou constante.
- **Proibido copiar-colar** bloco de JSX, `<style>` inline ou lógica entre páginas.
- **Ao ver a 2ª cópia de qualquer coisa, extraia.** Nunca a 3ª.
- **Mas:** se o padrão existente não resolve a experiência pedida, **criar variação
  justificada é o certo**. Reutilizar ≠ recusar-se a evoluir o padrão.

### 5.4 Mudança global

**Nunca aplicar ajuste global página-a-página.** Mudança global vai na fonte única; se
ela não existe, **criá-la é o caminho — não travar**. Mudança específica de uma página
pode ser local, documentada.

> Nunca usar "a fonte única não existe" como motivo para não entregar.

**Explicitar sempre o alcance da propagação:** *"isto altera todos os heróis
institucionais"*, *"isto muda a cor base do site inteiro"*. Nunca deixar efeito global
implícito.

### 5.5 Antes de uma mudança grande

Mudança que toca fonte única, múltiplas páginas ou uma decisão de design em aberto:
listar os arquivos, apresentar o plano, obter a decisão do usuário por escrito, executar
em etapas pequenas, isoladas e reversíveis — **um subcommit por item lógico**.

### 5.6 Conteúdo separado da camada visual

Dados e textos moram em `src/data/`. JSX é composição e layout, **não depósito de
conteúdo**.

### 5.7 CSS

**Não introduzir regras que se sobrescrevem** via especificidade ou `!important` para a
mesma propriedade. Estilo estrutural pertence ao componente + tokens. **Não "esconder via
CSS"** — remover markup e estilo.

### 5.8 As seis páginas são grandes demais

`Edicoes.jsx` 43 KB · `Home.jsx` 34 KB · `Participar.jsx` 33 KB · `HistoricoAwards.jsx`
27 KB · `Contato.jsx` 25 KB · `Apoiar.jsx` 25 KB. **Alvo: uma pasta por página, um
arquivo por seção.** A Home vira oito arquivos de seção mais um que os monta — assim
"mexe na seção 03" vira abrir um arquivo de 3 KB. Começar pela Home, que é a que mais
recebe pedido de alteração.

---

## 6 · Sistema visual

Fonte única: `src/styles/scw-2026.css`. **Se este capítulo divergir do arquivo, vale o
arquivo.**

### 6.1 Paleta — 9 cores fechadas

**Nenhuma cor fora desta tabela. Não escrever hex solto em componente — usar o token.**

| Token | Hex | Papel | Sobre ele usa |
|---|---|---|---|
| `--scw-creme` | `#FEF0DD` | fundo base do site; texto sobre chocolate | `--scw-choco` |
| `--scw-bege` | `#F8E4C1` | alternância de seção, chips; cor da página Contato | `--scw-choco` |
| `--scw-choco` | `#3D1308` | tinta principal, seções escuras, fundo de card com filete | `--scw-creme` |
| `--scw-marrom` | `#6A2C15` | texto de apoio, rótulos pequenos; cor da página Apoiar | `--scw-creme` |
| `--scw-amarelo` | `#FDBB1A` | acento da Home; medalha de 1º lugar | `--scw-choco` |
| `--scw-cyan` | `#01AFCC` | acento de Participar; **anel de foco global** | `--scw-choco` |
| `--scw-roxo` | `#4D257E` | acento do Sweet Awards | `--scw-creme` |
| `--scw-magenta` | `#F10767` | destaque de título; **só texto grande** (3,8:1 sobre creme) | `--scw-creme` |
| `--scw-laranja` | `#FF4810` | acento de Edições; **superfície preenchida**; medalha de 3º lugar | `--scw-choco` |

**Foco:** o anel de foco global é `--scw-cyan`. É a **única cor de estado padronizada**;
hover e ativo usam a cor da própria página.

**Filete e card claro não são tokens de cor** — viram `rgba()` ou creme por papel:

- filete geral = `rgba(61,19,8,.14)`
- borda de campo de formulário = `rgba(61,19,8,.22)`
- placeholder de foto = `--scw-bege`
- card claro = `--scw-creme` (o filete é que carrega o recorte visual)

**Proibido:** `#E52C4B` (vermelho-coral, removido da paleta — não usar em nada); verde;
cinza frio aleatório; preto puro; **qualquer hex fora da tabela**; hex escrito direto em
componente quando existe token.

**Regra permanente de substituição: troca-se cor por PAPEL, não por aparência.** Foi
assim que saíram, sem substituto direto, `#B3213B` (vinho), `#EBD6B4` (filete),
`#FFF7E9` (card claro), `#D0055B` (magenta profundo) e `#D19100`/`#D9BE95`/`#C99A7E`
(ouro/prata/bronze de medalha).

**O roxo entrou na paleta em julho de 2026** e é o acento oficial do Sweet Awards. A
regra antiga "evitar roxo" está **superada** — ela nasceu de um lavanda `#B38CFF` fora da
identidade, não deste roxo.

#### Exceções declaradas — marca de terceiro dentro de bloco isolado

A seção de realização usa a marca da **F2 Experience**, a agência que realiza o festival,
não a marca do festival: fundo `#0B0B0C`, acento `#E50053`, tinta `#F5F5F5`, tipografia
**Archivo**. É a única quebra de **fonte** do site, proposital, restrita ao bloco
`.f2-realiza*` em `src/styles/scw-home.css`. O teste `tests/redesign-2026.test.mjs`
reprova essas cores em qualquer outro lugar e reprova `Archivo` fora dessa seção.

Contraste medido: tinta **18,05:1** sobre o preto; o magenta dá **4,18:1**, então ele
fica em **texto grande e elemento gráfico** — rótulo pequeno e CTA usam a tinta clara.

**A segunda exceção é o verde do WhatsApp** (2026-08-22, a pedido do Eloi): o botão
"Enviar no WhatsApp" da página estática `/quero-participar/` usa `#25D366`, a cor de
marca do WhatsApp. Restrito ao seletor `.pa-whats`; `tests/quero-participar.test.mjs`
reprova o hex em qualquer outro ponto do arquivo.

⚠️ **A tinta é chocolate, não o branco que o WhatsApp usa:** branco sobre `#25D366` dá
**1,98:1** e reprovaria. Chocolate dá **8,18:1**.

**O princípio que as duas compartilham, e que vale para a próxima:** cor de marca de
terceiro não entra na paleta — entra **escopada num seletor, com teste que reprova o
vazamento**. A regra "nenhuma cor fora da tabela" continua valendo para o festival; ela
nunca teve como objeto a marca de outra empresa.

⚠️ **Ícone de marca de terceiro é outra história.** Não existe `redes/whatsapp` em
`scw-icons-v2.js`, e §6.11 proíbe editar esse arquivo à mão. Desenhar a marca de memória
seria **inventar logo (A4)**. O botão usa `redes/conversa` do próprio sistema; o glifo
oficial só entra se alguém trouxer o SVG da brand page do WhatsApp, e aí entra como
**asset**, igual à logo da F2 — nunca como ícone SCW.

### 6.2 Cor por página

Tokens em `body.route-*`: `--scw-pagina` · `--scw-pagina-tinta` · `--scw-pagina-menu` ·
`--scw-pagina-sobre-creme`.

| Rota | `--scw-pagina` | tinta | contraste |
|---|---|---|---|
| `home` | `#FDBB1A` amarelo | `#3D1308` | 9,5:1 |
| `edicoes` | `#FF4810` laranja | `#3D1308` | 4,78:1 |
| `historico-awards` | `#4D257E` roxo | `#FEF0DD` | 9,95:1 |
| `participar` | `#01AFCC` cyan | `#3D1308` | 6,2:1 |
| `apoiar` | `#6A2C15` marrom | `#FEF0DD` | 9,44:1 |
| `contato` | `#F8E4C1` bege | `#3D1308` | 13:1 |

- **A cor da página não é fundo de herói.** Ela aparece em **dois** pontos exatos: o item
  ativo do menu (pill sólida) e o selo do herói.
  ⛔ **A barra de 5px sob o cabeçalho foi REMOVIDA** no fechamento de 29/07/2026 — o
  herói já é a cor da página. **Não recriar.** Onde a documentação antiga falava dela,
  leia "dois pontos", não três.
- **Por isso o acento não precisa ser tom claro.** A regra antiga que exigia tom claro
  vinha de quando a cor pintava a hero inteira.
- **Nenhuma página repete a cor da vizinha.** É o propósito da regra.
- **Sobre superfície escura** (rodapé, folha do menu, barra de abas) cada página usa
  `pageColorDark()` em vez da cor cheia: **roxo (1,45:1) e marrom (1,53:1) não sustentam
  texto sobre chocolate e caem no amarelo; laranja (4,78:1) e cyan (6,23:1) passam e
  ficam.**
- **Espelho em JS:** `PAGE_COLORS` / `MENU_ESCURO` em `src/components/nav.jsx`.
  ⚠️ **Mudou o CSS, muda o JS no mesmo commit.**
- **Hover no menu** mostra a cor daquela página — amarelo e cyan direto; as demais caem
  no amarelo, por contraste sobre o véu escuro.
- **O herói tem par próprio, distinto de `--scw-pagina`:** `--scw-heroi` /
  `--scw-heroi-tinta`. A chapa do herói é a cor da página, e **a Home é a única exceção**
  — segue chocolate, porque a foto sangra e a cor já aparece no véu.
  Edições laranja · Awards roxo · Participar cyan · Apoiar marrom · Contato bege.
- **As compensações de contraste do herói seguem a COR, não a página.** Chapa **clara**
  (hoje só o cyan de Participar) precisa de selo, CTA e **anel de foco em chocolate** —
  o anel global é cyan e sumiria. Chapa **escura** (marrom, roxo) usa as regras base em
  creme.
- **Destaque do H1 — um acento por chapa**, sempre da paleta e sempre diferente da tinta
  do título: Home **magenta** · Edições **amarelo** · Awards **amarelo** · Participar
  **roxo** (4,25:1, texto grande) · Apoiar **amarelo** · Contato **marrom**.
  ⚠️ `--base` do `scwDestaque` tem que ser a **tinta real daquele título** — senão o
  destaque começa invisível sobre o próprio fundo.
- **Card ou CTA que navega usa a cor do DESTINO**, não a da página onde está. Onde a
  chapa do destino não separa do card (<3:1 de forma) entra um **anel de 2px** na tinta
  do card. Em **link com filete quem recebe a cor é o filete, não a tinta** — cyan e
  laranja não fecham 4,5:1 como texto sobre creme.

### 6.3 Sequência de irmãos nunca repete cor

Regra permanente, vale para toda fileira, grade ou lista de irmãos: cards, passos,
métricas, discos de ícone, pills, painéis. **Cada item recebe uma cor diferente da
paleta, na ordem**, e a sequência só volta ao começo depois de esgotar as cores
disponíveis para aquele fundo. **Dois irmãos com a mesma cor é defeito, não economia.**

Ciclo canônico: `amarelo → cyan → magenta → roxo → laranja → marrom`.

**Mas nem toda cor serve de tinta em todo fundo.** Filtrar pelo fundo antes de aplicar o
ciclo (texto grande = 3:1, texto pequeno = 4,5:1):

| Fundo | Tintas que passam | Reprovam |
|---|---|---|
| creme `#FEF0DD` | chocolate 12:1 · marrom 6,9:1 · roxo 6,7:1 · magenta 3,8:1¹ · laranja 3,0:1¹ | cyan 2,2 · amarelo 1,4 |
| bege `#F8E4C1` | chocolate 13:1 · marrom 6,3:1 · roxo 6,0:1 · magenta 3,4:1¹ | laranja 2,7 · cyan 2,1 · amarelo 1,4 |
| chocolate `#3D1308` | creme 12:1 · bege 13:1 · amarelo 9,5:1 · cyan 4,9:1 · laranja 4,8:1 | magenta 3,8¹ · roxo 1,45 · **marrom não sustenta** (~1,5:1) |
| roxo `#4D257E` | creme 10:1 · bege 8,9:1 · amarelo 6,5:1 · cyan 4,3:1¹ | magenta · laranja · chocolate |
| cyan `#01AFCC` | chocolate 5,6:1 | creme 2,3 · amarelo 1,6 |
| magenta `#F10767` | nenhuma tinta passa em texto pequeno | creme 3,8¹ · chocolate 3,8¹ |

¹ só a partir de 18,66px em peso 700+ (ou 24px normal), onde o mínimo cai para 3:1.

**Quando o fundo não oferece cores suficientes, não force a tinta: mova a cor para o
grafismo.** O numeral fica numa tinta sempre legível (chocolate) e quem carrega a cor é
**o disco de ícone** acima dele — a tinta do traço vira chocolate ou creme conforme o
fundo do disco:

```html
<span class="scw-disco" style="--c:var(--scw-magenta);--tinta:var(--scw-creme)">
```

Assim uma faixa de métricas sobre bege — onde só quatro tintas passam — tem uma cor por
dado sem nenhuma falha de contraste. Vale o mesmo raciocínio para pill, selo de canto e
filete.

⛔ **A régua pop de 4px (`.scw-stat__regua`, padrão StatBlock) saiu em 20/08/2026** — o
desenho passou a abrir cada dado com disco de ícone, que diz o que o número mede em vez
de só colorir. **Não recriar.**

**Duas leituras diferentes do mesmo padrão, e a diferença é proposital:**

| Onde | Disco | Cor |
|---|---|---|
| Home `05 Números` | `clamp(64px, 6vw, 80px)`, ícone a 60% | **uma cor por dado** — a faixa é o resumo do festival, cada número é um assunto |
| Participar `03` e Apoiar `02` | `54px`, ícone a 58%, dentro de card creme | **cor da página em todos** (`--scw-pagina` / `--scw-pagina-tinta`) — ali a cor diz "isto é Participar"; quem distingue o dado é o ícone |

### 6.4 Medalhas do Sweet Awards

Codificam colocação, não decoram.

| Posição | Token | Hex |
|---|---|---|
| 1º | `--scw-amarelo` | `#FDBB1A` |
| 2º | `--scw-cyan` | `#01AFCC` |
| 3º | `--scw-laranja` | `#FF4810` |

**Numeral sempre chocolate.** O 2º passou a **cyan** em 20/08/2026 (handoff `06-SWEET-AWARDS.md`) — 4,9:1 sobre chocolate, e separa melhor do amarelo do 1º que o bege separava. ⚠️ **O 3º lugar não é marrom:** marrom sobre chocolate dá
~1,5:1 e falha tanto como emblema quanto como texto solto — testado e descartado.

### 6.5 Tipografia — Nexa Slab, fonte única

Pesos **500** (Regular), **700** (Bold), **800** (xBold), **900** (Black). O 900 também é
servido como família separada `'Nexa Slab Black'`.

```css
--scw-font:       'Nexa Slab', system-ui, sans-serif;
--scw-font-black: 'Nexa Slab Black', 'Nexa Slab', Georgia, serif;
```

| Papel | Classe | Valor |
|---|---|---|
| H1 de herói | `.scw-h1` | `900 clamp(38px,4.8vw,84px)/.9`, `-.045em`, `max-width:17ch` |
| H1 compacto (Contato) | `.scw-h1--compacto` | `900 clamp(28px,3vw,44px)/1`, `-.035em` |
| H2 de seção | `.scw-h2` | `900 clamp(32px,3.8vw,58px)/.94`, `-.04em`, **22ch** |
| H3 de card | `.scw-h3` | `900 clamp(18px,1.7vw,22px)/1.06`, `-.026em`, **28ch** |
| Numeral grande | `.scw-numeral` | `900 clamp(38px,4.4vw,74px)/.84`, `-.06em`, `tabular-nums` |
| Corpo | `.scw-corpo` | `500 clamp(15.5px,1.35vw,18px)/1.55`, `text-wrap:pretty`, **62ch** (limite absoluto 68) |
| Lead de herói | `.scw-lead` | `500 clamp(17px,1.4vw,21px)/1.5`, **46ch** |
| Rótulo | `.scw-rotulo` | `800 12px/1`, `.16em`, uppercase, `#6A2C15` |
| Rótulo com ícone | `.scw-rotulo--com-icone` | **32ch, uma linha** |
| Botão | `.scw-btn` | `800 15px/1` |
| Item de menu | — | `700 14px/1.4` (ativo `800 italic`), lowercase |

⚠️ **O que segura a leitura não é mais o trilho — é a medida de linha.** Com trilho de
2200px e sem esses tetos, um parágrafo daria ~200 caracteres por linha. **Não remover
teto de medida "porque agora tem espaço": é o inverso — agora eles são obrigatórios.**
`tests/redesign-2026.test.mjs` reprova se saírem.

**Rótulo / eyebrow voltou e é o padrão.** A regra antiga "não usar eyebrow acima dos
títulos" está **superada**. Forma canônica `.scw-rotulo`. **Continua proibido rótulo sem
função:** repetir o título, anunciar o óbvio, enfeitar.

**Compensação óptica:** caixa-alta dentro de pill leva **1px a mais de padding no topo e
1px a menos na base** — o caixa-alta da Nexa Slab renderiza ~2px acima do centro.

⛔ **Proibida a fonte mono** (JetBrains Mono e afins) em rótulos, labels, eyebrows e
metadados — rejeitada duas vezes pelo Eloi. **Incomoda a face mono, não o caixa-alta:**
caixa-alta com letter-spacing seguem permitidos.

Tudo em `clamp()`. **Não inventar tamanho novo: usar a classe.**

### 6.6 Trilho, grade e espaçamento

**Trilho único — uma só regra de margem horizontal para cabeçalho, seções, rodapé e
Edições:**

```css
--scw-trilho: max(clamp(24px, 5vw, 96px), calc((100% - 2200px) / 2));
```

- Largura máxima de conteúdo **2200px, centralizada**, gutter de **24–96px**. Aplicar
  como `padding-inline: var(--scw-trilho)` — a classe `.scw-secao` já faz.
- **Não inventar largura nem gutter próprios. Não usar `max-width` em container além
  disso.**
- Seção que **sangra até a borda** (banda de foto) usa **margem negativa do mesmo
  trilho**, nunca um valor solto.
- O gutter vale até **2392px** de viewport; acima disso a grade centraliza.

**Ritmo vertical:**

```css
--scw-sec-y:          clamp(60px, 6.4vw, 104px); /* entre seções */
--scw-sec-y-compacta: clamp(44px, 4.8vw, 76px);
--scw-hero-topo:      clamp(216px, 19vw, 252px); /* reserva de topo das heros */
```

**Respiro interno de seção:** `--scw-gap-cabeca` (34–56px) · `--scw-gap-bloco` (20–32px)
· `--scw-gap-grade` (16–28px). **O ritmo ENTRE seções continua `--scw-sec-y`.**

**Raios, sombras, easing:**

```css
--scw-r-secao:     26px;   --scw-r-interno: 22px;   --scw-r-card: 20px;
--scw-sombra-card: 0 18px 42px rgba(61, 19, 8, .22);
--scw-sombra-foto: 0 14px 34px rgba(0, 0, 0, .34);
--scw-ease:        cubic-bezier(.22, .9, .24, 1);
```

- `var(--scw-r-card)` = **20px** em **todo** card institucional.
- `--scw-transicao`: **200ms** para cor/borda/sombra/gap, **180ms** para transform.
- **Desabilitado tem um estado só:** `.45` / `cursor: default` / `pointer-events: none`.
- **Botões são chapados:** sem `box-shadow`. O clique responde com deslocamento — hover
  sobe 2px, active volta. **Handoff que trouxer sombra em botão está desatualizado.**

**Grades:**

- `.scw-grade` — grade responsiva padrão.
- `.scw-grade-fixa` — **desconta o gap na fórmula de largura. Obrigatória em faixas de 4
  numerais:** sem ela a linha quebra a 3+1.

**Cabeça de seção:**

- Ícone do rótulo de seção: `tamanho={20}`. **16 fica só em chip e legenda.**
- Gap do rótulo: **10px**.
- **O filete é do link, não da coluna** — `.pa-cabeca__link` tem `width: fit-content`.
- **Lead só quando informa** o que o H2 não dá; senão rótulo + H2 em bloco único.

### 6.7 Zona de segurança entre menu e herói — regra estrutural

- O **fundo** do herói pode subir até o topo. O **conteúdo** — títulos, textos, imagens,
  cards — só começa **depois** do offset de segurança do cabeçalho. **Nenhum elemento do
  herói sobrepõe, compete ou encosta no menu.**
- A logo do cabeçalho **transborda metade abaixo** da linha do header
  (`top:100%; transform:translateY(-50%)`), então a reserva de topo é maior que a
  intuitiva — daí `--scw-hero-topo: clamp(216px, 19vw, 252px)`.
- Heróis com conteúdo **ancorado embaixo** (Home, Participar, Apoiar):
  `padding-top: clamp(232px, 22vw, 290px)`. Herói **compacto** (Contato):
  `var(--scw-hero-topo)`.
- **Aplicar sempre no `padding` do próprio herói.** Nunca com `margin-top` solto,
  empurrão manual no título, `position:absolute` improvisado ou ajuste que só funcione
  numa tela.
- **No mobile (≤900px) a logo perde o overhang** — `top:50%`, altura **52px**.

### 6.8 Heróis

| Regra | Valor |
|---|---|
| Altura | **proporcional ao conteúdo** — nunca 1080px fixo, nunca `height` rígida |
| Reserva de topo | `--scw-hero-topo` ou o valor ancorado |
| Título | `.scw-h1`, à esquerda, `max-width:17ch` |
| Lead | `.scw-lead`, `max-width:46ch` |
| Selo | `.scw-pill--pagina`, usa `--scw-pagina` |
| Foto | fundo à direita com **véu em degradê a 96°** (`.97 → 0` entre 0% e 92%) |
| Botões | depois do lead, alinhados à esquerda |
| Fundo | cor da página via `--scw-heroi`; **só a Home segue chocolate** |

- **Sweet Awards:** como o fundo é roxo, **o selo inverte** — creme com tinta roxa
  (mesmos 9,95:1); senão desapareceria. Título e lead seguem creme.
  ⛔ **`.swa-hero::before` não existe mais** — o degradê chocolate que descia 340px do
  topo saiu; a própria banda de foto escurece onde a logo passa. Era o mesmo trabalho
  feito duas vezes. **Não recriar.**
- **Home:** texto à esquerda limitado a `min(60%, 860px)`, foto ocupando o fundo à
  direita. Abaixo de 1000px o véu passa a vertical e o texto ocupa 100%.
- **Participar e Apoiar:** herói = **rótulo + H1 + lead + duas ações. Nada mais.**
  ⛔ O cartão 4:3 em crossfade e os 3 indicadores **saíram** — os três números já
  existiam idênticos na seção `03 Números`. **Não reintroduzir.**
- Todo herói deve: identificar a página, ter boa leitura, usar imagem coerente com o
  assunto, respeitar o KV institucional, adaptar ao mobile, não ocupar espaço excessivo e
  não esconder informação.

### 6.9 Herói no celular (<1000px) — regra estrutural

**DOIS BLOCOS, NAS CINCO PÁGINAS — construção fechada em 22/08/2026** (pedido do Eloi:
*"aplica a mesma lógica e regras em todas, pra ficarem com tamanho igual, mas cada uma
mantém a sua cor"*). Foto quadrada de largura cheia em cima, esfumada na base, texto
embaixo sobre a chapa sólida da página.

| Peça | Regra |
|---|---|
| Foto | `.scw-hero-banda` (`.scw-hero__fotos` na Home) **no fluxo**, `aspect-ratio: 1`, largura cheia. Em 390px são 390px — ~46% de um viewport de 844 |
| Emenda | `::after` na própria foto, rampa de **três** paradas, na cor do bloco. A foto dissolve na chapa em vez de terminar numa aresta |
| Chapa | `background: var(--scw-heroi)` + `color: var(--scw-heroi-tinta)` — chocolate na Home, cyan em Participar, marrom em Apoiar, bege em Contato, roxo no Awards |
| Véu | `display: none`. Existia para segurar texto SOBRE foto, e não há mais texto sobre foto |
| Altura | `min-height: 0` — foto + texto, sem piso (§6.8) |

⚠️ **A chapa é obrigatória, e é o erro que custaria caro.** Antes quem pintava a cor do
herói era o VÉU, por cima da foto; o bloco podia ficar no chocolate padrão. Sem véu e sem
esta linha, o título de **Contato sairia chocolate sobre chocolate** — a tinta do herói
dele é escura.

**Contrastes medidos, todos acima de 4,5:1:** creme sobre chocolate 12:1 · chocolate
sobre cyan 5,6:1 · creme sobre marrom 9,44:1 · chocolate sobre bege 13:1 · creme sobre
roxo 9,95:1.

**O zoom é consequência da caixa, não de enquadramento:** `cover` num quadrado corta ~33%
da largura de uma foto 3:2, contra ~70% na caixa alta de antes. Foi o que motivou a
mudança, junto com o título caindo sobre rostos e áreas claras.

⛔ **Não devolver a foto para `inset: 0`, não recriar o véu no celular, não devolver piso
de altura.** A construção anterior (foto cobrindo o herói, texto por cima, véu segurando
a leitura) valeu de 21/08 a 22/08/2026 e está revogada.

**Alturas medidas em 390×844:** Home 905px · **Participar e Apoiar 886px** · Contato
770px · Awards 826px.

⚠️ **Participar e Apoiar são a exceção da proporção: a foto delas é 4:3, não 1:1**
(`.pa-hero .scw-hero-banda`, pedido do Eloi em 22/08/2026 — "encurtar o herói"). Eram as
duas mais altas das cinco, com 983px, porque levam 89px de conteúdo que as outras não
têm: o selo quebra em duas linhas (48px) e há a nota de curadoria embaixo das ações
(41px). O 4:3 tirou 98px e trouxe a última ação para dentro do viewport.

⛔ **A alavanca das "ações lado a lado" não existe, e está medido:** os dois botões dão
**241px + 287px numa linha de 342px**. Lado a lado quebrariam o rótulo dentro do botão e
devolveriam a altura economizada. Não testar de novo.

Se um dia a uniformidade voltar a pesar mais que a altura, o certo é **levar as cinco
para a mesma proporção**, não devolver estas duas para o quadrado.
⛔ **A rampa em S por máscara MORREU junto com o véu.** Até 22/08/2026 a banda era
recortada por `mask-image` em smoothstep `t²(3−2t)`, com os tokens `--scw-esfuma` /
`--scw-esfuma-topo` e `--scw-banda-base`. **Os três tokens não existem mais no CSS**, e a
geometria de `44vh / 340px` da banda de desktop do Awards saiu junto: as cinco páginas
usam a mesma foto quadrada no fluxo. A emenda hoje é a linha da tabela acima — `::after`
na própria foto, rampa de três paradas, na cor do bloco.

> **O que continua valendo dessa história, e por que:** degradê **linear** em alpha lê
> como faixa dura — *o olho enxerga a derivada, não o valor* —, então a rampa de três
> paradas existe pelo mesmo motivo que a smoothstep existia. Mudou o mecanismo (cor sobre
> a foto, não máscara), não a razão. Rampa de duas paradas volta a marcar aresta.

⚠️ **Ponto focal por breakpoint:** `bgStyle()` resolve **um** valor, e style inline
**vence media query**. Elemento único que aparece nas duas telas com enquadramento
diferente manda os dois como custom property (`--foco` / `--foco-mobile`) e deixa o CSS
escolher. É o arranjo que `HeroFotos.jsx` usa.

**As fotos vêm de `heroPhotos(rota)`** em `src/data/imageLibrary.js` — **caminho de
imagem não se escreve à mão na página** (§6.12). ⚠️ **Deixaram de ser foto única e viraram
séries em crossfade**, montadas por `HeroFotos.jsx` a cada 6,2s:

| Rota | Série | Nº |
|---|---|---|
| Home | combos e momentos de várias edições | 4 |
| Participar | `participantes-lojas/01–11` | 11 |
| Apoiar | `participantes-lojas/12–22` | 11 |
| Contato | `sweet-lovers/01–05` | 5 |
| Sweet Awards | `awards-entrega/01–06` | 6 |

⚠️ **As 22 fotos de loja são divididas, não compartilhadas:** Participar leva a primeira
metade, Apoiar a segunda, e **nenhuma imagem se repete entre os dois heróis**. Ao
acrescentar foto, manter a divisão — repetir quebra a intenção sem quebrar nada visível.

### 6.10 Componentes

**Casca (global):**

| Componente | Classe | Arquivo |
|---|---|---|
| Raiz | `.scw-raiz` | `scw-2026.css` |
| Cabeçalho | `.scw-header`, `.scw-header__linha`, `.scw-header__veu` | `nav.jsx` |
| Marca | `.scw-marca` → `MARCA_SCW` = `/images/logo-seal-sweet-coffee.svg` | `nav.jsx` (const exportada, reusada pelo rodapé) |
| Navegação | `.scw-nav` | `nav.jsx` |
| Chapa das barras da base | `.scw-casca-base` | `scw-2026.css` — fixa, `rgba(43,14,6,.96)`, `blur(14px)`, filete de creme a .14. **Duas peças a usam**: a barra de abas do site e a barra da ação da `/em-breve`. ⚠️ O chocolate é mais fundo que `--scw-choco` de propósito: sob desfoque a chapa clareia com o que passa atrás |
| Barra inferior mobile | — | `MobileTabBar.jsx` (**5 abas, ≤900px**) — compõe `.scw-casca-base` |
| Folha "mais" | `.scw-folha*` | `MobileMenu.jsx` |
| Painel da organização | `.og-*` | `public/organizacao/index.html` — **fora do bundle**, casca de app própria (§10.4-b) |
| Diálogo de acesso | `.scw-acesso*` | `AccessDialog.jsx` — duas faixas (topo chocolate + corpo creme), botão "Acesso" **com rótulo**, sem marca-d'água. **Os dois cartões têm peso diferente de propósito**: Organização em chapa chocolate com ação amarela; Participante em card bege com filete sólido e **ação chocolate** (14,46:1). A régua de 5px segue a ordem dos cartões: cyan à esquerda, roxo à direita. ⛔ Não igualar os dois. ⚠️ **Mas o motivo do peso mudou em 25/08/2026, e a regra antiga não vale mais:** até então o cartão do participante era **reserva honesta** (§6.12) — moldura tracejada, selo "Painel · em breve", sem ação — porque `/marca/` não existia. Existe desde 25/08, e o diálogo é a **única porta pública do domínio** enquanto o gate está ligado: manter o selo seria a interface negando a área que ela abre, para a marca que acabou de receber as credenciais. Tracejado e selo saíram; o peso hoje diz **público**, não disponibilidade. ⚠️ A ação nova é `<a>`, e por isso o seletor dela é **prefixado** — sem prefixo ela nasce chocolate sobre chocolate, 1:1 (§10.1). **Reformulado em 22/08/2026** (§6.10-b) |
| Voltar ao topo | — | `BotaoTopo.jsx`, flutuante, aparece após **1,5 tela** |
| Rodapé | `.scw-footer*` | `SiteFooter.jsx` |
| Pular para conteúdo | `.scw-skip` | `nav.jsx` |

**Blocos:**

| Peça | Classe | Variações |
|---|---|---|
| Seção | `.scw-secao` | `--creme` `--bege` `--choco` `--marrom` `--compacta` |
| Card | `.scw-card` | `--destaque` |
| Botão | `.scw-btn` | — |
| Pill / selo | `.scw-pill` | `--bege` `--pagina` |
| Rótulo | `.scw-rotulo` | `--micro` `--com-icone` |
| Foto | `.scw-foto` | `--banner` `--retrato` |
| Abas | `.scw-abas`, `.scw-aba` | `__icone` `__rotulo` `__indicador` |
| Campo | `.scw-campo` | — |
| Marquee | `.scw-marquee` | `__palavra` `__ponto` |
| Reserva | `.scw-reserva` | — |
| Destaque | `.scw-destaque` | — |
| Régua de dado | `.scw-stat__regua` | 4px, padrão StatBlock |

**Prefixos por página:** Home `.hm-` · Edições `.scw-` (cena própria) · Sweet Awards
`.swa-` · Contato `.ctt-` · Participar e Apoiar `.pa-`.

**Regra:** peça usada por **2+ páginas** vira utilitária `.scw-*` em `scw-2026.css`. Peça
de **uma página só** fica no CSS da página, com o prefixo dela. **Não criar um terceiro
lugar.**

**Pisos de toque:** **44px** para qualquer controle — inclusive link de texto e item de
acordeão — **46px** para pílula de ação dentro de card, **54px** no herói. ⚠️ **O piso
vale para o controle real, não para a linha que o contém.**

#### 6.10-b Tela de acesso — reformulada em 22/08/2026

Pedido do Eloi, três frentes.

**1 · Entra pela borda, e cada tela tem a sua.** A caixa centrada acabou nas duas.

| Tela | Peça | Geometria | Entrada / saída |
|---|---|---|---|
| ≤900px | **folha**, a mesma da aba "mais" | colada na base, largura cheia, raio `30px 30px 0 0`, puxador dentro da faixa chocolate, `max-height: 88svh` | `scwFolha` 340ms · `moFolhaSai` 260ms |
| >900px | **gaveta** | colada à direita, do alto ao pé, **520px**, raio `30px 0 0 30px`, sombra para a esquerda | `moGavetaEntra` 340ms · `moGavetaSai` 260ms |

Mesmas durações e curvas da folha nas duas — **só a direção muda** (§6.15.7). A gaveta
tem 520px e não os 760px da caixa antiga: nessa largura os dois cartões empilham, que é
a leitura certa numa peça alta. Fechar é movimento nas duas: `.is-fechando` por 260ms
antes de desmontar, como o `MobileMenu`.
⚠️ A faixa chocolate + a régua ficam num invólucro `.scw-acesso__cabecalho` com
`position: sticky` — quem rola é a caixa, e sem isso o **X sai de cena** junto com o
conteúdo. Na gaveta alta, isso é perder a saída do painel.

**2 · "Entrar" não sai do diálogo.** O botão era um `<a>` para `/organizacao/` e a senha
era pedida lá. Agora o corpo do próprio diálogo **vira o campo de senha**.
⚠️ **Não há autenticação nova aqui — é a mesma, um passo antes.** A lógica vive em
`src/lib/adminAccess.js`, no padrão dos formulários (§4.1): a lib não importa supabase,
a `rpc` é injetada. Ela chama `admin_ping` e, **só com `=== true`**, grava a senha em
`sessionStorage.scw_org` — a chave que `public/organizacao/` **já lê na abertura** para
montar o painel direto. Mesma origem, mesma aba, mesma chave: nada novo é exposto, e a
senha continua morrendo com a aba.
**Nada afirma que entrou sem o banco confirmar**, e os quatro motivos têm recados
diferentes (`vazio`, `senha`, `rede`, `sessao`).

**3 · Contraste.** ⚠️ O rótulo "Falar com a equipe" estava **chocolate sobre chocolate,
1:1, invisível** desde que o pé foi desenhado — a armadilha nº 1 do §10.1 de novo:
`.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-acesso__cta` (0,1,0). Corrigido por
**prefixo de seletor**, nunca `!important`. O "Entrar" saiu de `<a>` para `<button>` e,
de quebra, saiu do alcance do mesmo reset: antes ele herdava creme e ficava creme sobre
amarelo (~1,4:1); agora é chocolate sobre amarelo, 9,5:1.
⚠️ **Peça que troca de `<a>` para `<button>` precisa de `border: 0` explícito** — senão
herda a borda `2px outset` padrão do navegador. E o hover de `.scw-acesso__acao` inverte
para creme, leitura que só funciona sobre a chapa chocolate do cartão: no passo da senha,
que mora no corpo creme, o botão inverte para **chocolate** (12:1), senão sumiria.

### 6.11 Iconografia v2

`<ScwIcon nome="familia/nome" tamanho={20} />` — fonte única em
`src/components/scw-icons/scw-icons-v2.js`: **136 ícones em 16 famílias, traço 3.2**.
Único importador é `ScwIcon.jsx`; **nenhum CSS crava `stroke-width` de ícone
institucional**. ⛔ **O arquivo não se edita à mão** — muda no Design e reexporta.

| Regra | Valor |
|---|---|
| Grade / área viva | **32** · ink só entre **3 e 29** |
| Traço | **3.2** (detalhe interno 2.4 · trilha pontilhada 4.0) |
| Cor | `currentColor` **sempre** — nunca `fill`/`stroke` fixo, nunca cor por prop |
| Tamanhos | **16 · 20 · 24 · 32 · 48**, e nada entre eles |
| Objetos por ícone | **1** |
| Vão interno livre | ≥ 2× o traço (6,4). Não cabe? a forma vira preenchida ou sai |
| Separação entre formas | ≥ traço + 1,5 (4,7) |

**Dois níveis, com piso de tamanho diferente:**

- **funcional** (`ui`, `aviso`, `acesso`) — **16 a 24px**, dentro de botão, campo, aba,
  menu e feedback. **No máximo 3 elementos**: legibilidade acima de personalidade.
- **expressivo** (as outras 13 famílias) — **piso de 24px**. Abaixo disso o desenho perde
  o que o torna autoral.

**Onde entra hoje:** rótulo de seção (`tamanho={20}`), chip e legenda (16), disco de dado
ou etapa. **Ícone acompanha rótulo, nunca o substitui.**

**Documentação embutida no próprio arquivo** — consultar antes de inventar regra de
ícone: `SCW_ICON_RULES`, `SCW_ICON_TIERS`, `SCW_ICON_MOTION`, `SCW_ICON_AUDIT`.

**Movimento:** 7 gestos prontos em `SCW_ICON_MOTION`, cada um com gatilho — avanço
(hover), toque (active), varredura (foco de campo), vapor (laço, só ≥32px), carimbo (ação
concluída), rota (`stroke-dashoffset`, exceção declarada) e pulso. **Nenhum roda em laço
solto. Ainda não aplicados no site** — a prancha existe, a decisão de animar é separada.

⚠️ **Ícone que não existe não quebra a página:** `ScwIcon` devolve `null` e avisa no
console só em DEV. Por isso a checagem é **manual** — ao mexer em ícone, **varrer as
chaves de `nome=` contra `SCW_ICONS` antes de commitar.**

### 6.12 Imagens

**Fonte única:** todo caminho de imagem sai de `src/data/imageLibrary.js`. **Nenhum
componente monta caminho na mão** — `tests/imagens.test.mjs` reprova; exceções
conscientes ficam na allowlist do próprio teste.

| Pasta (`public/images/`) | Conteúdo |
|---|---|
| `combos/<slug>/` | fotos dos combos por participante |
| `edicoes/<code>/` | **fotos** — acervo normalizado das 16 edições (`NN.webp`) |
| `marcas-edicoes/<code>/logo.png` | **marca** de cada edição (16) |
| `momentos/` | fotos institucionais de público e evento |
| `campanha/` | peças de campanha |
| `imprensa/` | material de imprensa |
| `shapes/` | formas de apoio (restam 2 com função) |
| `logos/participants/` | logos reais dos participantes |

**Regras de uso:**

- Foto real sempre que existir; `object-fit: cover`; proporção preservada; alt adequado.
- Logo real: `object-fit: contain`, nunca distorcer, limite de altura. **Nunca inventar
  logo** — `resolveParticipant` com fallback em iniciais.
- **Coerência de conteúdo é obrigatória:** página de edição mostra fotos daquela edição;
  página de participante mostra o participante certo; **Sweet Awards mostra a peça
  premiada** (Melhor Doce → o doce, Melhor Salgado → o salgado, Melhor Bebida → a bebida,
  demais → o combo); página histórica não usa só imagem da edição atual; herói usa imagem
  do assunto da página.
- Proporções em uso: **1:1** (pódio, galerias) e **4:5** (card de 1º lugar no desktop,
  vira 1:1 até 820px).

⛔ **Nada gerado por IA entra como registro do festival.** O acervo externo tem pelo menos
uma peça assim, que imita um mapa com lista de participantes em texto deformado. **Uma
peça gerada que finge ser material real é dado inventado por outro meio.** Sinais de
alerta ao varrer acervo: nome de arquivo tipo "Imagem N gerada", texto ilegível ou
derretido em rótulos, logo com forma inconsistente. **Na dúvida, ampliar e ler o texto da
peça antes de usar.**

**Padrão de nome de arquivo** — o nome explica o conteúdo, **sem** parêntese, espaço,
acento, `final`, `novo`, `cópia` ou número de versão solto:

| Padrão | Exemplo |
|---|---|
| Foto de edição | `edicoes/<code>/NN.webp` |
| Marca de edição | `marcas-edicoes/<code>/logo.png` |
| Combo de participante | `combos/<slug>/main.jpg` |
| Logo de participante | `logos/participants/<slug>.png` |
| Foto de acervo numerada | `<pasta>/NN.jpg` |
| Peça de campanha | `<assunto>-<variante>.png` |

**Identidade em disco:**

| Arquivo | Status |
|---|---|
| `/images/logo-seal-sweet-coffee.svg` | ✅ **marca oficial do cabeçalho e do rodapé** |
| `/images/logo-sweet-coffee-week.svg` | ✅ wordmark grande — landing `/em-breve` |
| `/images/logo-f2experience.svg`, `/images/f2-symbol.svg` | ✅ marca da realizadora — seção 07 da Home |
| `/images/logo-sweet-coffee-week-header.svg` | ⚠️ sem uso — mantido |
| `/logos/lockup-scw-creme.svg` | ⚠️ sem uso — **não é a marca do cabeçalho** |
| `/images/logo-f2-experience.svg` (com hífen) | ⚠️ sem uso — a viva é sem hífen |
| `/images/selo-10-anos.svg` + `.png`, `/videos/video-selo10anos.webm` | ⚠️ sem uso — mantido |

**Favicons:** `favicon-sweet.svg` (mestre vetorial) + PNG 32, 48, 96, 192 e
`apple-touch-icon` de 180. Seis em disco, seis declarados no `index.html`.

⚠️ **Acervo não referenciado não é lixo.** As fotos sem página apontando para elas são
acervo do festival. **Não remover conteúdo do festival só porque não aparece na Home.**
Ao usar uma, registrar em `imageLibrary.js`.

**Ausência de imagem:** **reserva honesta** (`.scw-reserva`) — moldura editorial, borda
sutil, fundo da paleta, texto curto ("Foto pendente" / "Galeria pendente"), proporção
definida. **Nunca área vazia sem explicação, nunca imagem aleatória externa, nunca
hotlink, nunca esconder a ausência.**

### 6.13 Elementos gráficos e ilustração

- Todo elemento visual precisa de **função**: estruturar layout, indicar hierarquia,
  representar dado, organizar conteúdo, apoiar fotografia, reforçar identidade. Sem
  função clara → remover.
- **Teste:** *"esse elemento carrega informação ou só enfeita?"* Carrega → fica. Enfeita
  → sai.
- **A regra proíbe decoração gratuita, não elemento visual funcional.** Medalhas,
  pódios, selos de 1º lugar e destaques de categoria **codificam colocação e resultado**
  — são funcionais. Indicador de dado e feedback de UI também.
- ⛔ **Não usar stickers por padrão nas institucionais.** Só em material de campanha ou
  página específica, quando solicitado explicitamente.
- **Página Edições:** linguagem editorial, histórica, fotográfica — **não** estética de
  sticker ou colagem.
- **Ilustração:** hoje o site é **photo-first** e não há ilustração autoral em produção.
  Se entrar: flat artesanal, textura de pincel, formas simples, cores chapadas da paleta,
  aparência autoral, composição editorial, leitura rápida. **Evitar:** 3D, sombra
  realista, acabamento excessivamente digital, cartoon infantil, elemento genérico de
  banco, excesso de detalhe, estética sem relação com Natal ou com o festival.
- **Sweet Lovers = comunidade de fãs, nunca casais românticos.** Podem aparecer amigos,
  famílias, pessoas sozinhas, grupos, gente fotografando combo, seguindo rota, avaliando.

### 6.14 Responsividade

**Escala canônica: 1000 · 900 · 820 · 760 · 420.** Não existe token de breakpoint (CSS
não aceita `var()` em `@media`) — **a consistência é por convenção.**

| Ponto | Significado fixo |
|---|---|
| **1000px** | herói vira dois blocos empilhados — foto em cima, texto embaixo |
| **900px** | a casca vira aplicativo: logo perde o overhang (52px), botão de acesso do topo some, entra a **barra inferior de 5 abas** |
| **820px** | card de 1º lugar do Awards passa de 4:5 para 1:1; a grade de vencedores vira **carrossel de arrasto com snap** |

- Testado em 320, 360, 375, 388, 390, 430, 768, 1024, 1280, 1440, 1544 e 1920 — sem
  rolagem horizontal e sem texto cortado.
- Viewports do script Playwright: 390×844 · 414×896 · 430×932 · 768×1024 · 1024×768 ·
  1366×768.
- **Valor fora da escala só quando o conteúdo exigir ponto próprio — nunca por inércia ou
  cópia. Não renumerar em massa breakpoints já calibrados.**
- **Alvo de toque mínimo 44px no celular**, auditado em 390px nas 6 rotas.
- Mobile: evitar sticky horizontal complexo; evitar overflow lateral; manter leitura
  clara; botões tocáveis; reorganizar grades em coluna; manter logos e fotos
  proporcionais.

### 6.15 Movimento

**Fonte única do institucional:** `src/styles/scw-motion.css` + o motor
`src/hooks/useSiteMotion.js`. ⛔ `src/styles/motion-system.css` é o sistema **anterior** e
sobrevive **só** para a landing `/em-breve` — **não usar em página nova.** O mesmo vale
para `useRevealOnScroll.js` e para as classes `.motion-reveal-left/right`,
`.motion-button-hover`, `.motion-press`, `.motion-float-soft`, todas **removidas** do
institucional.

**Ritmo — uma escala, quatro degraus:**

| Token | Valor | Onde |
|---|---|---|
| `--mo-rapido` | **180ms** | botão, link, ícone |
| `--mo-estado` | **300ms** | hover de card, acordeão, cabeçalho, menu |
| `--mo-entra` | **620ms** | entrada de texto, bloco e card |
| `--mo-longo` | **880ms** | herói e imagem grande |
| `--mo-passo` | **90ms** | intervalo entre itens de uma sequência |
| `--mo-passo-card` | **70ms** | card a card dentro de uma grade |
| `--mo-respiro` | **26s** | laço de respiração da imagem |

**Curvas:** `--mo-ease` (saída suave, **igual a `--scw-ease`**) · `--mo-mola` (chegada que
pousa) · `--mo-suave` (laços de ida e volta).

**Deslocamento:** `--mo-y` 22px · `--mo-y-titulo` 30px · `--mo-y-texto` 14px · `--mo-x`
26px · `--mo-desfoque` 6px. **Abaixo de 900px todos encolhem e o desfoque zera.**

**Como o motor decide.** O JSX **não** carrega classe de animação. `useSiteMotion` varre a
página, guarda **só a ocorrência mais externa de cada ramo** (um `<p>` dentro de um card
dentro de uma grade não é item próprio — a grade é) e carimba:

- `data-mo="sobe|titulo|texto|foto|lado"` — o tipo de entrada;
- `--mo-i` — posição na sequência; **reinicia a cada `<section>` e a cada `.scw-rotulo`**;
- `data-mo-grade` + `--mo-j` nos filhos — cards entram um a um, **teto de 8 degraus**.

**Fica de fora:** heróis (coreografados por `@keyframes`), página Edições (apresentação
própria), `.ctt-perguntas` e formulários (áreas de concentração), e **qualquer elemento
`position: fixed` ou `sticky`** — barra presa à base nunca entra na zona de disparo do
observer e ficaria invisível para sempre.

**Salvaguarda:** o estado oculto **só existe sob `html.scw-mo-on`**, classe que o próprio
motor adiciona. Script que não carrega, navegador sem `IntersectionObserver` ou
`prefers-reduced-motion` ligado → **nada é escondido**.

**Regras para criar movimento novo:**

1. reusar as classes e atributos existentes quando bastarem;
2. classe nova **sempre consumindo os tokens `--mo-*`**;
3. animar **só** `transform`, `opacity`, `filter` e `scale` — **sem layout shift**;
4. respeitar `prefers-reduced-motion`, **sempre**, escrito junto;
5. não instalar biblioteca de animação nova sem justificativa;
6. **hover só onde existe ação. Card sem link não sobe** — elevação sem destino é
   decoração e promete algo que não acontece.
7. **Nada de curva ou duração nova.** Se um handoff pedir um tempo que não está no
   sistema, o certo é perguntar, não inventar.

**Movimentos em produção:**

- **Heróis** — sequência foto → selo → título → apoio → ação, com atrasos de 140 a 760ms.
  Em Awards a banda surge e o texto sobe atrás dela.
- **Ciclo da anatomia** (Home 02) — quatro desenhos por ingrediente em 8,8s. É o terceiro
  laço contínuo da Home, ao lado da respiração das fotos e do marquee.
- **Respiração da imagem** — laço `alternate` na propriedade **`scale`** (nunca em
  `transform`, que fica livre para reveal e hover), então a volta refaz o mesmo caminho e
  **não existe salto de reinício**. Nas fotos dos heróis e, só no desktop, nas três fotos
  de Rotas da Home.
- **Transição de página** — `main.page-enter` em **opacidade, 300ms. Sem transform, de
  propósito** (ver §10.3).
- **Cabeçalho** — `.is-rolado` adensa o véu no desktop e recolhe o overhang da logo.
  **Não encolhe altura nem move a logo** — a geometria é regra estrutural.
  ⚠️ **No celular (≤900px) `.is-rolado` faz o cabeçalho SAIR de cena** (opacidade 0 +
  `pointer-events: none`, volta em `:focus-within` por causa do "pular para o
  conteúdo"). Motivo: abaixo de 900px `.scw-nav` e `.scw-acesso-topo` estão em
  `display: none` — sobra só a marca, e a navegação inteira mora na barra de abas.
  Uma barra fixa com conteúdo decorativo passava por cima do texto rolado (o rótulo
  "A anatomia do combo" virava "TOMIA DO COMBO") e o véu, longe do herói, lia como
  mancha marrom sobre a seção creme. Abaixo de 40px de rolagem nada muda: o herói
  continua como desenhado. **A landing `/em-breve` fica de fora** (`--so-acesso`) —
  ali o cabeçalho reduzido é a única porta de acesso (§10.4-b).
- **Menu mobile** — entra por `scwFolha` com itens escalonados; sai por `.is-fechando`
  (260ms) e só então desmonta.
- **Edições** — ken burns `scale(1.06) → scale(1.001)` em 12s; wipe direcional
  (`clip-path: inset()`) de 820ms escalonado 0/110/220ms; deriva de fundo em 46s.

**Seção ou página nova herda o movimento do sistema** — revelação no scroll, cascata dos
filhos, press dos botões, `is-rolado` no cabeçalho, zoom lento nas fotos. **Componente
novo sem movimento é componente incompleto.** E **um patch de layout não toca animação
existente** a menos que diga explicitamente que toca.

---

## 7 · As páginas

### 7.1 Home / O Festival — `/`, amarelo `#FDBB1A`

⛔ **Não alterar sem solicitação explícita.** É a página-mãe: as demais usam a Home como
referência de margem, largura máxima, respiro, hierarquia, ritmo, nível de acabamento e
tom institucional-afetivo. Extrair componente ou constante é permitido **desde que não
mude o comportamento visual** — validar idêntico.

**Sete seções:** `01 Abertura` · `02 O que é` · `03 Rotas` · `04 Ciclo` · `05 Números` ·
`06 Prova` · `07 Realização`.

- **Herói, desktop:** texto à esquerda limitado a `min(60%,860px)`, foto ocupando o
  fundo à direita, véu em degradê a 96°.
- **Herói, celular (<1000px): dois blocos** — foto quadrada de largura cheia em cima,
  esfumada na base, e o texto embaixo em chapa chocolate sólida. Ver §6.9, que traz a
  geometria e o motivo. ⛔ Não unificar com o desktop de novo.
- **02 O que é:** anatomia do combo — três ingredientes ligados por "+" — **sem card**,
  com filete separando. ⛔ **Sempre em UMA LINHA, inclusive no celular** (pedido do Eloi,
  22/08/2026): `disco + disco + disco`, com o nome embaixo de cada um. O empilhamento
  vertical que valia abaixo de 560px saiu — custava três telas de rolagem para dizer
  "doce + salgado + bebida", e o "+" entre duas linhas lia como marcador de lista, não
  como soma. O que muda no celular é só a escala, e ela vem de **dois tokens na própria
  grade** (`--ing-disco` / `--ing-mais`), de onde o alinhamento do "+" é derivado por
  cálculo. **Não empilhar de novo, e não reescrever os dois `clamp()` em outro lugar.** Cada ingrediente **percorre quatro desenhos da própria família**,
  um por quarto de um ciclo de 8,8s (`scwIcnCiclo`, atraso de 2200ms por peça). Os quatro
  ficam empilhados e só a opacidade muda — nada entra ou sai do fluxo. A arte vive em
  `src/components/scw-icons/anatomia-combo.js`, **fora** de `scw-icons-v2.js`: é desenho
  próprio desta seção, com traço 2,6, e a biblioteca não se edita à mão (§6.11).
  Com `prefers-reduced-motion` fica só o primeiro desenho, parado. Duas galerias irmãs de mesmo peso: combos de edições anteriores e
  **Sweet Gift** (2×2, fotos 1:1).
- **05 Números:** 4 numerais grandes em uma linha, com `.scw-grade-fixa` — sem ela a
  faixa quebra a 3+1.
- **07 Realização:** KV da F2 Experience — a exceção declarada de paleta e fonte (§6.1).

> **Alvo do plano institucional:** a Home passa a ter oito seções, com "O festival
> transforma Natal" e "Os temas de todas as edições" ganhando bloco próprio. Ver
> `acervo/plano-site-institucional.md`. **Isso é plano, não estado — e depende de pedido
> explícito para ser executado (A6).**

### 7.2 Edições — `/edicoes`, laranja `#FF4810`

Experiência de tela cheia: apresentação editorial photo-first da história do festival.
**16 cenas, uma por edição.**

Em Edições o `App.jsx` **não renderiza** o cabeçalho do site nem o rodapé: a página tem
**cabeçalho próprio com a mesma geometria** — mesmo `--scw-trilho`, mesmo padding vertical
de 50px, marca da edição no slot da logo. **O menu não muda de lugar entre páginas.** A
barra de abas mobile continua montada por fora.

**Desktop:** cena de 100vh. Metade direita com **mosaico de 3 fotos** sangrando (uma larga
em cima, duas embaixo, filete de 3px). Metade esquerda com rótulo, tema, frase, meta
(período / marcas / Sweet Awards) e dois botões que abrem painéis flutuantes de
participantes e curiosidades. Fundo: foto do combo com `blur(64px)` sob véu chocolate a
87%, com deriva lenta de 46s. Rodapé com trilha das 16 edições (dots + anos), setas e
barra de progresso. Navegação por setas do teclado, clique na trilha e arraste.

**Mobile:** cabeçalho compacto com a marca da edição e progresso `01/16`; foto 4:5 com
tema; mosaico de 2 fotos 1:1; dados; palavras-chave; sanfonas de marcas e curiosidades.
Navegação em **uma peça só**: a régua de anos fixa na base, com as setas dentro.

1. **Régua de anos fixa na base** — trilha horizontal com os 16 anos + barra de progresso
   (`transform: scaleX` com origem à esquerda, **sem transição**). Rola e centraliza no
   ano ativo. O deslocamento acima da barra de abas é **condicional, nunca literal**.
   Fundo **chapado** (`rgb(43,14,6)`) e **sem `backdrop-filter`** — blur sobre cena
   animada trava o compositor (§10.3), e os 4% de transparência que havia antes
   deixavam o contador da galeria aparecer como texto fantasma atrás dos anos.
2. **As setas de passar vivem NA régua**, flanqueando os anos: `seta · anos · seta`, o
   **mesmo arranjo e a mesma peça** do rodapé do desktop (`.scw-edx__seta` e
   `--proxima`). Os anos são a única parte elástica (`flex: 1` + `min-width: 0`).
3. Nos extremos a seta sem destino recebe **`disabled`** de verdade — não só
   `opacity:0` —, para sair da tabulação. Dentro da régua ela fica no estado padrão
   do sistema (`.45`): sumir deixaria um buraco na linha.

⛔ **As setas laterais saíram em 22/08/2026** (pedido do Eloi) — 62×52px a 31% da altura,
metade fora da tela, com laço de pulso de 2,8s cada. Flutuavam sobre a cena, longe da
régua que comandam, e precisavam do pulso para se anunciar. **Não recriar.**

**Selo da cena:** disco vazado de 54px (44px em ≤900px) com **um ícone por edição**,
no tom da cena, ao lado da pill do rótulo — `ICONE_EDICAO` em `Edicoes.jsx`, mapeado
um a um do desenho. ⚠️ A classe é `.scw-edx__cena-selo`, **não** `.scw-edx__marca`:
essa última já é a marca da edição no cabeçalho, e o nome colide.

**Dados:** `src/data/handoff/edicoesData.js`, derivado de `sweetCoffeeHistory.js`.
**Performance:** janela `live/near ±1-2` monta foto e mosaico só perto do foco.

**Barra da galeria de fotos** (`.scw-gal__barra`) é **`seta · contador · seta` — três
peças, nada mais.** ⛔ **Não reintroduzir** pontos, rótulo `Fotos · <ano>` nem "N de N"
por extenso. As duas variantes (`--mosaico` no desktop, `--par` no celular) usam o
**mesmo** flex. Se voltar a precisar de layouts diferentes, é sinal de que peça a mais
entrou. O que **não** se mexe ao simplificar: as setas de 44px e o teclado ←/→/Home/End.

O numeral da edição é sempre `#FEF0DD` — o vinho sobre foto dava 2,08:1.

**Não usar:** stickers; grade comum de cards; `backdrop-filter` sobre o trilho animado. A
navegação das edições parece **controle de apresentação**, não segunda navbar — não pode
brigar com o menu.

### 7.3 Sweet Awards — `/sweet-awards` e `/historico-sweet-awards`, roxo `#4D257E`

Arquivo: `src/pages/institutional/HistoricoAwards.jsx`, componente
`HistoricoAwardsPage`, rota interna `historico-awards`. ⛔ **Não existe
`SweetAwards.jsx` — não criar arquivo novo só para casar com documentação antiga.**

Aparência de premiação e hall de vencedores — **não embeds de Instagram**. **A página
pode ser alterada com pedido explícito** (layout, seções, movimento, conteúdo editorial).
O que não muda sem autorização: flags de publicação, dados oficiais e deploy.

- **Herói:** banda de foto (desktop **e** celular) + título editorial + **3 números**
  (edições premiadas · categorias julgadas · marcas premiadas) + índice das 8 categorias.
  Fundo roxo; o selo inverte para creme com tinta roxa.
  ⛔ **A vitrine com as fotos dos 4 primeiros lugares saiu em 06/08/2026. Não
  reintroduzir** — eram as mesmas quatro fotos que abrem a seção 02 logo abaixo, lá com
  pódio completo e medalha. Sem ela o desktop ficava com 216–268px de roxo chapado no
  topo; por isso a banda de foto passou a valer também no desktop.
- **Vencedores da última edição:** 8 categorias × 3 colocações, cada card com a **foto da
  peça premiada**. **Medalha dentro da legenda do card**, ao lado do rótulo de colocação,
  **não solta no canto da foto**. Numeral sempre chocolate. 1º lugar em coluna larga
  (span de 2 linhas), 2º e 3º empilhados ao lado — **as três fotos sempre 1:1**; o 1º só é
  maior por ocupar coluna mais larga, não por aspect-ratio próprio. Empates no mesmo
  card. No celular (≤820px) vira carrossel de arrasto com snap.
- **Quem dá a nota:** **trilha do tempo de três momentos cronológicos** — 2019 (categoria
  única) → 2020.2–2021.2 (Júri Técnico) → 2022 em diante (só Sweet Lovers, com selo
  "hoje"). ⛔ **Não** dois cards gêmeos lado a lado: isso escondia que a régua mudou ao
  longo do tempo. Espinha tracejada atrás dos discos; no celular vira vertical com o
  disco fora do fluxo.
- **Hall dos mais premiados:** barra segmentada por colocação, contagem por posição e
  total.
- **Histórico:** acordeão por edição, pódio completo por categoria, separado por trilha
  quando houve júri e público.
- **Antes de 2019:** as cinco primeiras edições não tiveram premiação — **dizer isso**.
- ⛔ A seção **"O momento de receber o prêmio"** (bastidores, 3 fotos) **saiu em
  20/08/2026**: não estava no desenho nem nesta lista de seções. As fotos seguem em
  `public/images/awards-bastidores/`.
- ⚠️ O desenho de 20/08 traz o pódio em **três colunas** com o 1º em **4:5**. Isso é
  exatamente o que o §11 registra como testado e reprovado, e o mesmo arquivo ainda
  desenha a medalha de 2º em `#EBD6B4`, cor que saiu da paleta. **O código fica como
  está** — 1º em coluna larga, as três fotos 1:1.

**Regra de dados:** descrições das categorias vêm de `sweetCoffeeHistory.js`; **os pódios
da edição 2026.1 vêm de `loversAwardsResults.js`** (na base histórica eles estão vazios
de propósito); o histórico das demais vem de `sweetCoffeeHistory.js`; o agregado é
derivado em `src/data/handoff/awardsData.js` — **se divergir do código em `src/data/`,
vale o código.** Logos reais via `resolveParticipant`, com fallback em iniciais. **2º e 3º
lugares que o acervo não registra: ausência honesta, nunca preenchida.**

✅ **Os números do Hall batem com o acervo desde 07/08/2026** e não são mais digitados:
saem da fonte a cada import (§9.4).

### 7.4 Participar — `/participar`, cyan `#01AFCC`

Segue a lógica visual da Home. Precisa de: proposta clara; fotos quando disponíveis;
**depoimentos**; **formulário em destaque**; linguagem voltada a participantes; visual
editorial e comercial. **Não parecer formulário genérico.**

**Oito seções:** `01 Abertura` · `02 Depoimentos` · `03 Números` · `04 Circulação` ·
`05 Quem pode` · `06 Imprensa` · `07 Jornada` · `08 Pré-cadastro`.

- Herói = rótulo do público + H1 + lead + **duas ações, nada mais**. No celular a foto
  continua, sangrando na `.scw-hero-banda`.
- **Circulação: três faixas** alternando lado, imagem e texto com **larguras iguais** —
  a coluna acompanha o trilho, o texto para na medida de linha.
  ⛔ A 4ª faixa (`04 · Materiais`) **saiu em 20/08/2026**, junto com o H2 que dizia
  "Quatro frentes": o desenho fechou a seção em três. Se voltar, o H2 volta junto.
- **06 Imprensa** é cabeça + chips de veículo + a nota das 17 matérias.
  ⛔ A galeria de 3 registros em TV que abria a seção **saiu em 20/08/2026** — o desenho
  deixou a seção só com os chips. As fotos seguem em `public/images/imprensa/`.
- **Depoimentos vêm logo depois da abertura** (decisão do Eloi, 30/07/2026): são a prova
  social; quem cogita participar quer ouvir quem já participou antes de ler número ou
  processo, e vários depoimentos são em vídeo.

- **08 Pré-cadastro NÃO tem formulário** (22/08/2026, pedido do Eloi). A seção é uma
  chamada (`.pa-cta`) para a página estática **`/quero-participar/`**, que é onde o
  pré-cadastro vive: quatro passos, índice pegajoso com contagem de pendências,
  validação por passo e gravação em `quero_participar`.
  ⚠️ **A razão não é estética, é o banco.** O formulário que morava na página gravava
  em `participation_interests`, tabela que **nenhuma tela abre** — nem o painel da
  organização. O de `/quero-participar/` grava na tabela que o painel lê e triaria.
  Formulário que escreve onde ninguém lê é envio que se perde em silêncio, e some
  parecendo que funcionou.
  Por isso a regra "**formulário em destaque**" do parágrafo acima se cumpre pela
  chamada, não por um `<form>` na página. ⛔ Não devolver o formulário para cá: duas
  telas pedindo os mesmos dados são duas fontes de verdade do mesmo cadastro (§5.2), e
  era a daqui que ficava para trás a cada melhoria feita lá.

### 7.5 Apoiar — `/apoiar`, marrom `#6A2C15`

Precisa de: **formulário em destaque**; explicação visual das oportunidades de apoio;
benefícios para marcas; exemplos de presença da marca no festival; linguagem comercial
alinhada ao tom. **Não parecer página institucional fria.**

**Seis seções:** `01 Abertura` · `02 Alcance` · `03 Por que apoiar` · `04 Onde aparece` ·
`05 Quem vive` · `06 Proposta`. Mesma estrutura de herói de Participar — sem cartão e sem
indicadores.

- Os três indicadores de audiência **mudaram de lugar, não sumiram**: abrem a seção
  `02 Alcance`. Diferente de Participar, **não se repetem** — são dado próprio. Padrão
  disco + ícone + numeral + rótulo, com o disco de 54px na cor da página.
- **`05 Quem vive` é grade editorial**, não duas listas de bullets lado a lado: os seis
  traços do público viram itens com índice `01`–`06` e **filete horizontal** entre eles —
  bolinha de 7px é indicador de item de lista, **não de dado**. O texto do traço é
  `700 17–21px`: **ele é o argumento da seção**. A imprensa sai de dentro da grade e vira
  **bloco irmão embaixo, separado por 44–72px** — a distância entre argumento e prova é
  maior **de propósito**. ⛔ Não usar `--scw-gap-bloco` aí.
- **A página não exibe patrocinadores.** Em vez de vitrine de logos, mostra **formatos de
  ativação** — o que já foi feito, sem nomear a marca (§9.6).
- Os números vêm da fonte canônica, cada um com o que mede e quando foi apurado (§9.5).

### 7.6 Contato — `/contato`, bege `#F8E4C1`

**Quatro seções:** `01 Abertura` · `02 Dúvidas` · `03 Caminhos` · `04 Mensagem`.

A abertura é **coluna única**, como as outras cinco: rótulo, H1 (`.scw-h1` cheio, sem
teto próprio de medida — é o 17ch que faz o título quebrar em duas linhas), lead e as
duas ações. ⛔ A coluna de apoio à direita, com a nota "a central reúne N respostas",
**saiu em 20/08/2026**: dizia em nota o que a seção 02 logo abaixo mostra inteiro.

⛔ **A regra antiga "Contato é página simples, SEM hero" está superada** — a página abre
com herói compacto e banda de foto no mobile.

**Central de dúvidas: 93 perguntas em 10 assuntos** — Sobre o festival 9 · Edição atual 7
· Combos 10 · Atendimento 10 · Ingredientes e acessibilidade 7 · Rota da Doçura 9 · Sweet
Awards 13 · Participação 13 · Parcerias 8 · Suporte 7. **Fonte única das perguntas:
`src/data/faqCentral.js`** (import default em `Contato.jsx`).

⚠️ **`src/data/contactFaq.js` NÃO está morto** — conferido no código em 07/08/2026. Ele
exporta `FAQ_CATEGORIES`, `FAQ_ITEMS` e **`CONTACT_SUBJECTS`**, e é o `CONTACT_SUBJECTS`
que alimenta a triagem do formulário, importado por `Contato.jsx` e por
`src/lib/contactRequest.js`. **São duas coisas diferentes que a documentação antiga
confundia:** `faqCentral.js` são as 93 perguntas; `contactFaq.js` são os assuntos do
formulário. **Não remover.** O que sobra dele — `FAQ_CATEGORIES` e `FAQ_ITEMS`, a lista
de perguntas antiga — é que está morto, e some quando alguém confirmar que ninguém
importa esses dois nomes.

- Índice editorial à esquerda (linhas com filete, contagem à direita, ativo por peso +
  sublinhado de 2px na cor da página) e busca como linha com traço inferior.
- **No mobile o índice vira chips roláveis** — `flex: 0 0 auto` **obrigatório** no `<li>`,
  senão os chips colapsam.
- A busca **ignora acentos e maiúsculas, casa múltiplos termos e muda o filtro para
  "Todas" automaticamente**.
- Cada pergunta é `h3 > button` com `aria-expanded`/`aria-controls`, painel
  `role="region"`. Schema `FAQPage` gerado da mesma fonte de dados.
- Os campos `mapa`, `regulamentoRota`, `regulamentoAwards`, `areaAvaliacao`, `imprensa` e
  `pressKit` estão `null`. **Isso não é bug:** quando `null`, o link não aparece;
  preencher faz o link surgir sozinho. **Mapa, rota e avaliação pertencem à camada de
  edição e ficam `null` até a próxima edição existir.**

**O bloco "Edição atual" é reescrito para o estado entre-edições.** As perguntas que
apontavam para mapa, regulamento e área de avaliação passam a **explicar como funciona**,
sem prometer link que não existe.

### 7.7 Em breve — `/em-breve`

Landing própria. É o gate de publicação (`COMING_SOON_PUBLICATION`) e **é a única página
servida por `motion-system.css` + `useRevealOnScroll.js`.** ⛔ Não tocar sem pedido
explícito — é o que está no ar.

**Desde 25/08/2026 ela é a chamada do pré-cadastro**, e não mais "aviso de novo site + o
Sweet Awards da Lovers". Oito blocos, rolagem curta, **uma ação só — `Quero participar`
→ `/quero-participar/`**.

⛔ **Desde 26/08/2026 essa ação existe em UM lugar só: a barra presa na base** (pedido do
Eloi). Os três botões que moravam no herói, no fim dos passos e no fecho **saíram**, e a
barra deixou de ser peça de celular para valer em **toda largura**. **Não devolver botão
para dentro das seções**: a página tem uma conversão só, e espalhá-la de novo é a mesma
troca que já foi desfeita — o leitor reencontrar a ação três vezes em vez de ela nunca
sair da tela.

**A barra é a mesma casca da barra de abas do site** (`.scw-casca-base`, §6.10) — chapa
translúcida com desfoque, filete de creme e o mesmo ritmo vertical de 8px. Foi pedido do
Eloi: *"faz tipo como é o menu mobile, integrado, animado"*.

| Peça da barra | Regra |
|---|---|
| Chapa | `.scw-casca-base` — **não** redeclarar cor, desfoque nem `position` aqui |
| Indicador de 3px | é a peça da barra de abas, com **sentido próprio**: lá diz *onde* você está entre cinco destinos, aqui *quanto* da página já leu. `scaleX`, origem à esquerda, **sem transição** (§10.3) |
| Nota "Leva quatro passos…" | acompanha o botão acima de 760px; **sai** abaixo, onde cada linha a mais é viewport a menos. A informação reaparece dentro do próprio `/quero-participar/`, que numera os passos na tela |
| Botão | `.eb-barra__btn`, tinta **prefixada** em chocolate (§10.1) |
| Altura | `--eb-barra-h`, escrito **no `body`** por `ResizeObserver` |

⛔ **O botão NÃO estica no celular.** Esticado ele vira uma lâmina amarela de ponta a
ponta, e a barra deixa de ler como casca de aplicativo — a barra de abas é **escura com
acentos contidos**, e é com ela que esta peça conversa. Na largura do conteúdo o alvo
ainda passa de 200px, muito acima dos 44px do §6.10.

🐛 **A landing está FORA do reset de `border-box`**, e a exclusão é explícita em
`scw-2026.css` (`body:not(.route-em-breve)`). Escrita quando a página era a de antes,
"calibrada em content-box e no ar", ela agora custa em toda peça que some medida fixa com
padding ou borda: o `.scw-btn`, que o sistema define com `min-height: 54px` e
`padding: 15px 28px`, renderizava com **84px** — os 30px entravam POR CIMA da altura
mínima, e o botão virava um bolo amarelo. Os controles da galeria davam 51px em vez de 48.
Enquanto a exclusão inteira não cair, **as peças de sistema que esta página usa entram no
reset uma a uma** (`.eb-barra__btn`, `.eb-gal__btn`). ⚠️ Derrubar a exclusão é mudança
global numa página no ar (§5.4) — decisão do Eloi, com varredura de regressão visual.

⚠️ **O convite é FINITO, e isso é regra, não economia.** A página já tem dois laços
contínuos — o marquee e o gradiente dele —, que é o teto do §6.15. Um pulso permanente na
barra seria o terceiro, e ainda por cima **um que ninguém pode pausar**: diferente da
galeria, não há como parar um botão que pisca. O gesto dispara em **dois momentos e
para** — quando a barra chega, e quando o leitor alcança o fecho, que é onde ele decide.
Voltar ao fecho **não** redispara: insistir deixa de ser convite e vira cutucão.

⚠️ **A altura da barra se MEDE, não se calcula** — é o §10.4-b outra vez. O palpite
"padding + botão" deu 70px; o botão real tem **84px**, e a barra cobria 31px do rodapé e
se sobrepunha ao aviso de cookies **nas três larguras**. Quem escreve `--eb-barra-h` é o
próprio elemento, por `ResizeObserver`, e reescreve quando a fonte carrega, quando a tela
gira e quando a nota entra ou sai no ponto de 760px.

⚠️ **O token mora no `body`, não em `.eb-page`** — quem também precisa dele é o aviso de
cookies, que é peça de casca (§6.10), **irmã** desta página e não filha dela. Ele sobe a
altura da barra: banner de consentimento por cima da única conversão é as duas coisas
piores ao mesmo tempo — esconde a ação e faz o aviso legal parecer estorvo. A regra é
**escopada na rota**, porque o mesmo banner serve as sete e só esta tem barra fixa.

| Bloco | O que é |
|---|---|
| Topo | faixa chocolate com `MARCA_SCW`. O botão "Acesso" **não mora aqui** — vem do `<SiteHeader apenasAcesso>` do `App.jsx` |
| Herói | **grade de duas colunas**: rótulo + H1 + lead + ação à esquerda, a **galeria das 16 edições** à direita |
| Prova | 16 edições · +120 marcas · +34 mil combos · desde 2016 — cada um com ícone |
| Marquee | os 16 temas, em `.scw-marquee` |
| Para quem é | os dez tipos de casa + os três chips do combo (doce · salgado · café) |
| Como funciona | três passos + a ação |
| Fecho | chapa chocolate, a ação e a linha do Instagram |
| Rodapé | **creme**, com a marca da F2 |

#### A galeria das 16 edições — herói reescrito em 25/08/2026

O herói **deixou de ter foto de fundo com texto por cima**. A grade
`repeat(auto-fit, minmax(min(100%,400px), 1fr))` colapsa sozinha, **sem media
query**, e por isso saíram junto: o véu diagonal, os tokens `--hv-*`, a emenda
de três paradas do celular, o `@media (max-width:1000px)` inteiro do herói e a
respiração de 26s (`ebRespira`) — a galeria tem movimento próprio e as duas
competiriam. ⛔ Não recriar nenhum deles: não há mais texto sobre foto, então
não há o que velar.

Quadro 1:1, 16 slides em `flex`, deslocados por **um custom property só**
(`--eb-i`) em vez de dezesseis regras. Cada slide traz foto, véu de **cinco
paradas**, marca da edição, pílula do rótulo e legenda com o vencedor do Melhor
Combo.

⚠️ **A pausa não é conforto, é requisito.** WCAG 2.2.2: movimento automático
acima de 5s que carrega informação tem de ser pausável. Ela para por mouse, por
foco e pelo botão, e **nunca liga** com `prefers-reduced-motion`. É também o que
impede a galeria de ser o **terceiro laço contínuo** da página, acima do teto de
dois (o marquee e o gradiente dele).

⚠️ **O ouvinte de mouse e foco fica no INVÓLUCRO, não no quadro.** O quadro não
tem nada focável dentro — os três botões moram nos controles, abaixo dele —,
então `onFocus` no quadro nunca dispararia e a pausa por teclado seria letra
morta.

⚠️ **A região viva anuncia só a troca MANUAL.** Um `aria-live` disparando a cada
5,2s, para sempre, interromperia a leitura de quem usa leitor de tela a cada
cinco segundos. Os 15 slides fora de vista são `aria-hidden`.

⛔ **Contorno claro no `drop-shadow` da marca, NUNCA chapa atrás dela** — a chapa
foi desenhada, mostrada e recusada. São 16 marcas de cores arbitrárias sobre
fotografia arbitrária, e o caso que quebra é escuro-sobre-escuro (a marca vinho
de Séries sobre uma cortina vinho). ⛔ **Escurecer o véu piora esse caso.**

⚠️ **A prova usa `repeat(4,1fr)` + `repeat(2,1fr)` abaixo de 900px, não
auto-fit.** Qualquer auto-fit desce de 4 para **3** antes de chegar a 2, e o
quarto item fica órfão com dois vãos ao lado — inclusive com o piso de 140px que
o handoff propunha. E **"desde 2016" é palavra, não numeral**: tem escala própria
(`clamp(30px,3.2vw,54px)`) e pode quebrar em duas linhas; na escala dos outros
três ela estoura a coluna e some no `overflow-x: clip`, sem barra que denuncie.

⚠️ **A barra final de `/quero-participar/` não é enfeite** (§10.4-b), e é `<a href>` de
navegador — nunca `navigate()`, nunca `#/`.

🐛 **`editionPhotos()` devolve OBJETO — `{src, alt, position, indice}` —, não
caminho.** Tratá-lo como string produz `url([object Object])`, e o **fallback do
SPA responde 200 com o index.html**: nenhum 404, nenhum erro de console, e a foto
simplesmente não aparece. Custou uma rodada inteira de teste verde com a galeria
em branco. **Status 200 não prova que o asset existe** — a checagem que vale é o
`content-type` da resposta e o `naturalWidth` depois do `onload`. O `alt` e o
ponto focal saem do mesmo objeto: escrever descrição de foto que ninguém viu
seria dado inventado por outro meio (A4).

⚠️ **Não usar backtick dentro do `<style>{\`…\`}`** da página. O CSS mora num
template literal; um backtick num comentário fecha a string e o build morre em
"Expected } but found …", com a linha apontando para o comentário, não para a
causa.

⚠️ **O rodapé é creme, e é decisão de contraste, não de gosto:** a logo da F2 é asset de
cor fixa (`#de1a59`) e sobre chocolate não fecha os 3:1 de elemento gráfico. Sobre creme
fecha. ⛔ Não devolver o rodapé para chocolate sem trocar o asset.

⚠️ **A página saiu da terceira paleta do projeto.** Ela consumia os tokens de
`em-breve.css` — espresso `#2B1810` + ouro `#F8B511`, a identidade do Sweet Awards de
antes do redesign — e agora consome a **paleta viva** (`--scw-*`) e as utilitárias do
sistema. ⛔ `em-breve.css` **continua no ar**: `icons.jsx` e `participants.js` ainda leem
tokens dele (§4.3).

⚠️ **A iconografia v2 entrou, mas ESTÁTICA — e é decisão, não esquecimento.** O
handoff de agosto/2026 pedia ícones que se montam peça por peça, com as props
`movimento`/`aoVivo`/`receita` do `ScwIcon`, as classes `.scw-icone-host--*` e os
tokens `--icon-mo-hover`/`--icon-ease-soft`. **Nada disso existe no repositório:**
o `PATCH-icones-animados.md` que os cria nunca foi aplicado, e a receita "recortar
o `d` em três `path`" exigiria editar `scw-icons-v2.js` à mão, que o §6.11 proíbe.
Os ícones entram pelo `ScwIcon` como está; o movimento fica com o sistema que a
página já tem (`motion-stagger` / `motion-reveal-up`).

⚠️ **Os tamanhos do handoff (18 · 28 · 30 · 34 · 44) NÃO estão na escala** do
§6.11, e `tests/regua-visual.mjs` reprova. Foram encaixados nos degraus reais:
seta de botão e controles **20**, chip **24**, prova e fecho **32**, disco de
passo **48** (os 60% de um disco de 80px, a proporção do §6.3).

⚠️ **A logo da F2 do rodapé NÃO foi trocada, e o handoff estava errado ali.** Ele
afirma que `logo-f2experience.svg` é um lockup claro `#F5F5F5` a 1,06:1; os dois
arquivos em `public/images/` são `#de1a59` na regra `.cls-1`. Só a altura mudou,
de 20px para 24px. É o §12.6 na prática: premissa de patch se confere contra o
código antes de aplicar.

⛔ **O bloco do Sweet Awards saiu, e é remoção de EXIBIÇÃO, não de dado.**
`sweetHistoryStats.js`, `loversAwardsResults.js` e as fotos seguem intactos — só
deixaram de ser importados ali. **Consequência a não esquecer: o resultado oficial da
Lovers deixou de ter endereço público** até o institucional ir ao ar.

---

## 8 · Conteúdo e tom

### 8.1 Nomenclatura obrigatória

⛔ **Não usar "Sweet" sozinho para o festival.**

- **Usar:** **Sweet & Coffee Week** · **SCW** (só depois de o nome completo já ter
  aparecido) · "o festival" · "o evento" · "a edição".
- **Não usar:** "o Sweet", "do Sweet", "no Sweet", "sobre o Sweet", "história do Sweet",
  "participar do Sweet".
- **Exceções permitidas:** **Sweet Awards**, **Sweet Lovers**, **Sweet & Coffee Week
  Lovers**, **Sweet Gift**, nomes oficiais, hashtags, arrobas.

### 8.2 Grafias oficiais

| Coisa | Grafia |
|---|---|
| Festival | **Sweet & Coffee Week** |
| Sigla | **SCW** (nunca "SWC") |
| Premiação | **Sweet Awards** / **Sweet & Coffee Week Awards** |
| Categoria do Awards | **"Encantamento em Loja"** — nunca "Envolvimento" |
| Realizadora | **F2 Experience** — nunca "Experience" nem "Fábrica 2" |
| Nome de edição | **só o tema**: Início, Páscoa, Doces do Mundo, Namorados, Sabores da Infância, Pâtisserie Francesa, Contos de Fadas, No Ritmo da Música, Heróis & Vilões, Séries, Terras Potiguares, Movies, Trip, Books, Celebration, Lovers |

**Variações erradas a evitar:** "Sweet Coffee Week", "Sweet Coffee", "Sweet Coffee
Awards", "Sweet & Coffee Lovers", "Sweet Coffee Lovers".

⛔ **O prefixo "S&C" sai do site.** Fica registrado no acervo como grafia histórica.
⛔ **"Movies" e "Books"**, não "Movies / Cinema" nem "Books / Livraria da Doçura" — os
conceitos longos ficam no acervo como subtítulo de campanha.

### 8.3 Tom de voz

- **Claro, afetivo, institucional na medida.**
- **Evitar:** texto técnico ou longo demais; repetição de dados; tom burocrático; excesso
  de adjetivo genérico; excesso de explicação.
- **Preferir:** frases objetivas e diretas, com ritmo; linguagem calorosa; conexão com
  **Natal, gastronomia, marcas locais, Sweet Lovers**.
- Comunicar o festival como **experiência de cidade**, não apenas promoção de combos.

### 8.4 Palavras

- Preferir **"avaliam"** em vez de "votam". **Não usar "votação" como termo principal**
  quando o contexto for avaliação do público.
- **"Sweet Lovers"** é a comunidade e o público do festival.
- **Evitar repetir em sequência as mesmas palavras**, especialmente: *experiência,
  cidade, rota, memória, marcas*.
- Falar em **"interesse"** e **"próximas edições"** — **nunca prometer participação ou
  patrocínio automático**.
- **Não prometer função ainda indisponível ao público.**
- **"+120 marcas"**, não "+100".
- **"10 anos" / "dez anos" liberado** — decisão do Eloi, 21/08/2026. A regra anterior pedia
  "desde 2016" porque o décimo aniversário só se completa em setembro de 2026; a partir desta
  data o termo pode ser usado na prosa institucional. `festivalFacts.years` segue em 10.

### 8.5 O que nunca escrever

- **Não inventar dado.** Não criar ranking fake. Não esconder ausência de dado
  importante. **2º e 3º lugares que o acervo não registra: ausência honesta, nunca
  preenchida.**
- ⛔ **Edições não competem entre si.** Nenhum gráfico ou dado comparando edições — o
  gráfico de "participantes por edição" com pico e recorde foi rejeitado: *"parece
  competição entre edições, isso não deve ocorrer"*. **Comparação e ranking só entre
  participantes** (premiados, recorrentes), nunca entre edições. Linha do tempo permitida
  **só como marcos e primeiras vezes**, sem números de tamanho por edição.
  - *Exceção aprovada:* agrupar e contar marcas pela edição que escolheram reviver — o
    dado é a **escolha das marcas**, não o tamanho da edição.
- **Nunca nomear pessoa, veículo ou data que o acervo não confirma.**
- **Nunca inventar logo.**
- **Nunca inventar e-mail, telefone ou canal externo.**
- Placeholder honesto: "Foto pendente" / "Galeria pendente" — nunca área vazia sem
  explicação.

### 8.6 Narrativa institucional — ordem canônica

1. O Sweet & Coffee Week nasce de um **tema**.
2. O tema **inspira os participantes**.
3. Os participantes criam **combos e experiências**.
4. O público **circula pela cidade**.
5. A edição gera **conteúdo, descoberta e memória**.
6. O **Sweet Awards** reconhece os destaques a partir da **avaliação do público**.
7. A **F2 Experience** realiza e organiza essa plataforma.

---

## 9 · O dado do festival

O acervo completo e verificado está em **`acervo/ACERVO-OFICIAL.md`**, e as decisões que o
produziram em **`acervo/decisoes-acervo-2026-08.md`**. Este capítulo traz só o que o
código precisa saber.

### 9.1 Números canônicos

| Dado | Valor |
|---|---|
| Primeira edição | setembro de **2016** |
| Edições realizadas | **16** |
| Participações somadas | **410** |
| Marcas distintas | **123** |
| Marcas que já subiram ao pódio | **44** |
| Colocações no total | **271** |
| Edições premiadas | **11** (as 5 primeiras não tiveram premiação) |

### 9.2 Participantes por edição

| Edição | Tema | Marcas |
|---|---|---|
| 2016 | Início | 13 |
| 2017.1 | Páscoa | 17 |
| 2017.2 | Doces do Mundo | 22 |
| 2018.1 | Namorados | 19 |
| 2018.2 | Sabores da Infância | 25 |
| 2019.1 | Pâtisserie Francesa | 28 |
| 2019.2 | Contos de Fadas | 37 |
| 2020.1 | No Ritmo da Música | 20 |
| 2020.2 | Heróis & Vilões | 27 |
| 2021.1 | Séries | 30 |
| 2021.2 | Terras Potiguares | **29** |
| 2022 | Movies | **34** |
| 2023 | Trip | 33 |
| 2024 | Books | 29 |
| 2025 | Celebration | 26 |
| 2026.1 | Lovers | 21 |

⚠️ **As duas mudanças em relação ao código (2021.2 e 2022) vêm de duplicação de marca,
não de participante a mais ou a menos.** A Fran's conta uma vez em 2021.2; a Caramel
conta uma vez em 2022. **Nenhuma edição perdeu ou ganhou participante real.**

### 9.3 Marcas — regras de exibição

- **Aplicar todos os aliases.** Uma marca = uma entrada no histórico e no Hall.
- **Exibir sempre o nome atual**, inclusive nas edições antigas.
- **Exibir a forma longa do nome:** *Mr. Cupcake Confeitaria*, *Jolie Café Pâtisserie*,
  *Paneer Pâtisserie*, *Rollab Confeitaria*, *Duart's Confeitaria*, *Atelier Mine
  Confeitaria*, *Delicato Bolos*, *Crooks Cookie Shop*.
- **Rede com várias unidades conta como 1 marca por edição.**
- O nome correto é **Jana's Cakes** (não "Jona's Cakes") e **Supermercado Nordestão**
  (não "Supernordestão").
- **`KNVE Casa Café` não é marca** — é transcrição truncada de "Café Casa Verde by
  Caramel", ou seja, a própria **Caramel Healthy Food**. Vira alias.
- **Cuidado com o apóstrofo:** `'` reto e `'` curvo partiram Canuto's e Caffè Basilico's
  em duas marcas cada. Normalizar.

### 9.4 Hall dos mais premiados — valores corretos

| # | Marca | 1º | 2º | 3º | Total |
|---|---|---|---|---|---|
| 1 | Mr. Cupcake Confeitaria | 9 | 14 | 6 | **29** |
| 2 | Bocaditos | 12 | 7 | 7 | **26** |
| 3 | Marlon Vinicius | 9 | 5 | 12 | **26** |
| 4 | O Maestro Café | 9 | 9 | 4 | **22** |
| 5 | Atelier Mine Confeitaria | 0 | 9 | 5 | **14** |
| 6 | Canuto's | 4 | 5 | 3 | **12** |
| 7 | Duart's Confeitaria | 3 | 2 | 7 | **12** |
| 8 | Delicato Bolos | 5 | 4 | 2 | **11** |
| 9 | Jolie Café Pâtisserie | 3 | 2 | 4 | **9** |
| 10 | Bolomania | 2 | 4 | 3 | **9** |

✅ **Aplicado no código em 07/08/2026.** O Hall deixou de ser digitado: `HistoricoAwards`
o calcula de `handoff/awardsData.js`, que por sua vez deriva de `sweetCoffeeHistory.js` a
cada import. **Nenhum número desta tabela existe escrito em lugar nenhum** — todos saem
da contagem. Antes das correções o código dava Mr. Cupcake 28, Bocaditos 13 primeiros
lugares e Marlon Vinicius 24.

**Correções de pódio aplicadas** (conferidas card a card contra os cards oficiais):

- **2024 · Melhor Salgado** — 1º **Bolomania** · 2º **Bocaditos** · 3º **Delicato e Just
  Food&Coffee**.
- **2024 · Melhor Doce** — 1º **Bocaditos e Delicato** (empate) · 2º O Maestro Café · 3º
  Sweet Duo.
- **2025 · Melhor Combo** — 1º **Marlon Vinicius** · 2º **O Maestro Café e Bolomania** ·
  3º Delicato.
- **2025 · Encantamento em Loja** — categoria inteira ausente do código, com empate nas
  três posições: 1º **Just Food&Coffee e O Maestro Café** · 2º **Mr. Cupcake e Adocee** ·
  3º **Marlon Vinicius e Bolomania**.

**Outras correções — estado:**

- ✅ **Nomes de categoria unificados.** **18 grafias na base viram 10 categorias
  canônicas** pelo `categoryAliases`: as 6 variações de encantamento são
  **"Encantamento em Loja"**, as 5 de entrega são **"Delivery/Takeaway"**. O nome
  histórico fica na base; a unificação acontece na leitura.
- ✅ **Campo `pontos`** — já não existia no código.
- ✅ **Trilhas preenchidas.** Restou **um** `null`, e é correto: **2019.1 não nomeia
  júri** no card oficial. 2019.2 e 2020.1 são Sweet Lovers; as 5 categorias sem trilha de
  2020.2 viraram Sweet Lovers, ao lado do Júri Técnico do Melhor Combo.
- ✅ **Contagens.** 2021.2 passou a 29 e 2022 a 34. A lista `participantes` **preserva o
  registro histórico** — as três unidades da Fran's continuam lá —, mas `n` conta
  **marcas**, aplicando os aliases. Somadas dão **410**, com **123 marcas distintas**.
- ✅ **Nomes na forma longa** (§9.3) viraram os canônicos: Mr. Cupcake Confeitaria,
  Duart's Confeitaria, Atelier Mine Confeitaria, Jolie Café Pâtisserie, Paneer
  Pâtisserie, Rollab Confeitaria, Delicato Bolos, Crooks Cookie Shop, Fran's Café,
  Jana's Cakes. `KNVE Casa Café` e `Café Casa Verde by Caramel` viraram alias de Caramel
  Healthy Food; `Supernordestão` virou Supermercado Nordestão.
- ✅ **Menção Honrosa de 2021.1** — já vivia na base como `premiacao.mencaoHonrosa`,
  **fora de `categorias`**, e é por isso que nunca contaminou o Hall. O que faltava era
  aparecer: agora `awardsData` a carrega no campo `mencao` e o acordeão da edição a
  mostra em bloco próprio (`.swa-mencao`), sem medalha e sem numeral.
  ⚠️ **Regra permanente: menção não é colocação.** Se algum dia ela entrar em
  `categorias`, vira sete colocações fantasma e o Hall mente.
- ✅ **Edição homenageada na Lovers.** `participants.js` ganhou **`editionCode`**, e
  `edition` passou a trazer o nome real em vez do rótulo de campanha: "Sweet Music" →
  No Ritmo da Música (2020.1) · "Filmes" → Movies (2022) · "Sweet Series" → Séries
  (2021.1) · "Sweet Trip" → Trip (2023) · "Sweet Celebration" → Celebration (2025) ·
  "Contos de Fada" → Contos de Fadas (2019.2). A **Delicato Bolos passou para Pâtisserie
  Francesa (2019.1)** — o `theme` dela, "Confeitaria Francesa", confirmava o acervo.
  `getHomageGroups()` agrupa por **código**, não por string: **8 edições revividas**.

### 9.5 Números comerciais

Cinco números, com data de apuração e definição do que medem. A página Apoiar **lê da
fonte canônica**, não de valores cravados no JSX.

| Número | O que mede |
|---|---|
| **+R$ 712 mil** | movimentação direta |
| **+200 mil** | alcance |
| **+290 mil** | interações |
| **+18 milhões** | visualizações |
| **+65 mil** | seguidores |
| **+1.600** | posts |

⚠️ **Alcance, interações e visualizações são métricas distintas — nunca somar.**

⛔ **A série histórica de preços (11 edições, R$ 16,90 → R$ 38,90) fica no acervo marcada
como NÃO PUBLICAR.**

### 9.6 Patrocinadores e parceiros

⛔ **Patrocinadores e parceiros não são exibidos por enquanto.** A página Apoiar mostra
**formatos de ativação** — o que já foi feito, sem nomear a marca:

| Formato | Exemplo real (não nomeado no site) |
|---|---|
| Benefício cruzado em parceiro | cupom fiscal do combo dava 50% off no cinema |
| Sorteio para o público | like no participante concorria a uma máquina de café |
| Prêmio de avaliação | quem avaliava concorria a uma mesa de jantar |
| Ativação temática | distribuidora de ingredientes assinando "os ingredientes mais mágicos" |
| Título oficial da edição | "Cinema Oficial" |
| Parceria de origem | Sebrae e fornecedores locais em Terras Potiguares |

Os nomes documentados ficam no acervo, não no site.

### 9.7 Sweet Gift

**O Sweet Gift é o combo em versão presente ou viagem** — o doce especial para levar,
para saborear em casa, no escritório ou com amigos, embalado para presentear. Em geral
sem bebida.

**Estreou na Páscoa (2017.1)**, com o Bolo da Vovó e o "Petit Bolo da Vovó" — não em
2017.2 nem em 2019.2, como versões anteriores diziam. Confirmado pelo Instagram oficial
do festival: post de 03/04/2017 já anuncia o Sweet Gift do Bolo da Vovó na edição de
Páscoa. A Rafaela Fontes Chocolateria entrou na modalidade depois, em Doces do Mundo
(2017.2).

⚠️ **Não há foto de Sweet Gift no acervo.** O Eloi vai selecionar. Até lá, `.scw-reserva`.

### 9.8 Fotos de combo

- **Galeria de 3 a 5 fotos por marca por edição** — cerca de 1.500 selecionadas das 4.891
  do acervo bruto.
- As **13 edições com pastas por marca** (2017.2 → 2026.1) ganham vínculo **foto ↔ marca ↔
  edição**.
- **2016, 2017.1 e 2018.2** têm foto de combo mas sem identificação de marca. Entram como
  **"combos da edição"**, sem atribuir a ninguém.
- ⚠️ **Hoje existem só 21 logos de marca no acervo** (os da Lovers). Os outros 102 saem
  dos **cards "Confirmado"** de cada edição, que trazem o logo em alta.

### 9.9 Modelo de dados alvo

| Entidade | Chave | Liga com |
|---|---|---|
| **Edição** | código (`2023`) | participantes, prêmios, fotos |
| **Marca** | slug estável | participações, pódios, fotos, logo |
| **Participação** | marca + edição | combo, fotos, tema escolhido |
| **Prêmio** | edição + categoria + colocação | marcas, empates |
| **Foto** | caminho | edição, marca, crédito, alt |
| **Depoimento** | pessoa + marca | vídeo, edição, autorização |
| **Pergunta** | id | assunto, validade |

**Todo dado volátil carrega três campos:** de onde veio · quando foi verificado · se pode
publicar. É o que impede preço, endereço e horário de voltarem ao ar por descuido.

⚠️ **Os slugs deixaram de ser congelados** — os QR Codes impressos que os travavam
pertenciam à edição Lovers e foram aposentados. **A convenção de nome de arquivo
(`combos/<slug>/main.jpg`, `logos/participants/<slug>.png`) continua valendo**; o que
morreu foi o congelamento, não a convenção.

---

## 10 · Armadilhas conhecidas

Cada uma destas custou tempo pelo menos uma vez. Ler antes de mexer na área
correspondente.

### 10.1 Especificidade — a armadilha nº 1 do mobile

⚠️ **Um reset genérico com seletor de dois níveis vence a regra específica de um nível**,
e o efeito **só aparece no celular**, porque é lá que a regra específica existe. Dois
casos já corrigidos:

- `.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-aba` (0,1,0) → **apagava os
  rótulos da barra de abas**;
- `.scw-raiz img { display: block }` (0,1,1) vencia `.ctt-abertura__fundo { display:
  none }` (0,1,0) → **montava a foto de tela cheia atrás do texto do Contato**.

**Regra:** ao esconder ou recolorir um elemento no mobile, **conferir se existe reset
genérico em `.scw-raiz` para aquela tag** — e **prefixar o seletor, nunca usar
`!important`**.

### 10.2 Toque e acessibilidade

⚠️ **O piso de 44px vale para o CONTROLE real, não para a linha que o contém.** Clicar no
padding de um flex **não foca o `<input>` filho** — foi o caso da busca do Contato: campo
de 26px dentro de uma linha de 46px.

⚠️ **`disabled` de verdade, não `opacity:0`.** Só transparência mantém o elemento na
tabulação.

### 10.3 Compositor, GPU e performance

⚠️ **Não usar `backdrop-filter` sobre trilho animado.** Blur + readback de GPU a cada
frame congela o compositor — usar fundo semi-opaco.

⚠️ **16 cenas full-viewport de uma vez congelam o compositor.** Por isso a janela
`live/near ±1-2` em Edições.

⚠️ **Não colocar `transition` em `width`/`transform` de barra de progresso que precise de
valor exato** — travava o valor. A régua de anos usa `transform: scaleX` com origem à
esquerda, sem transição.

⚠️ **Não pôr `transform` em `<main>`.** Criaria bloco de contenção e **quebraria os
`position: fixed` de dentro das páginas** (a régua de anos de Edições). Por isso a
transição de página é só opacidade.

⚠️ **Elemento `position: fixed`/`sticky` nunca entra na zona de disparo do observer** —
ficaria invisível para sempre. Por isso fica fora do motor de movimento.

⚠️ **A respiração da imagem usa a propriedade `scale`, nunca `transform`** — senão haveria
salto de reinício.

### 10.4 Degradês, máscaras e emendas

⚠️ **Degradê linear em alpha lê como faixa dura.** *"O olho enxerga a derivada, não o
valor."* Uma rampa de **duas** paradas marca aresta nos dois pontos onde começa e termina;
é preciso ao menos **três**, com a do meio quebrando a reta.

⚠️ **O mecanismo mudou em 22/08/2026, o princípio não.** A rampa era uma **máscara** em
smoothstep `t²(3−2t)` (`--scw-esfuma`); hoje é **cor sobre a foto**, em três paradas, no
`::after` da própria imagem (§6.9). ⛔ **`--scw-esfuma`, `--scw-esfuma-topo` e
`--scw-banda-base` não existem mais — não reintroduzir.**

⚠️ **A emenda fecha na cor do BLOCO, não do herói.** Errar isso deixa uma linha dura —
o `box-shadow` curto de antes escondia, a rampa longa expõe. **É por isso que a chapa do
bloco é obrigatória no celular** (§6.9): sem ela o Contato sairia chocolate sobre
chocolate.

⚠️ **`bgStyle()` resolve UM valor e style inline vence media query.** Elemento que aparece
nas duas telas com enquadramento diferente **tem** que mandar `--foco` e `--foco-mobile`.

### 10.4-b Páginas estáticas fora do bundle

Existem **três**: **`/marca/`** (área da marca participante — login, definir senha,
cadastro da edição e status, tudo numa página que troca de view conforme o estado),
**`/quero-participar/`** (formulário de pré-cadastro) e
**`/organizacao/`** (painel interno da organização). Ficam em `public/`, fora do
React, e é isso que as mantém acessíveis com `COMING_SOON_PUBLICATION = true`
**sem tocar em flag nenhuma** (A3).

⚠️ **A barra final não é opcional.** Sem ela o servidor não resolve o índice do
diretório e a rota cai no fallback do SPA — ou seja, abre a landing. Medido no
build via `vite preview`: `/organizacao` → index.html do SPA · `/organizacao/` →
o painel. O `vercel.json` ganhou rewrite explícito para as três rotas como rede
de segurança em produção (a Vercel checa o sistema de arquivos antes dos
rewrites), mas **todo link interno escreve a barra**.

⛔ **O `redirectTo` do convite NÃO existe mais** — e com ele morreu a
dependência da allowlist de URL do projeto (Authentication → URL Configuration).
A entrega de acesso deixou de passar por link em 22/08/2026: ver "Como a marca
ganha conta", abaixo. **A barra final em `/marca/` continua obrigatória**, pelo
motivo do parágrafo anterior — resolução de índice de diretório —, não mais por
causa de token no `#hash`.

✅ **O dev server passou a servir essas páginas em 22/08/2026.** O Vite não faz
resolução de índice de diretório para `public/`, e por isso `/organizacao/`
caía no fallback do SPA e abria a landing — sintoma que **mentia**, porque uma
página abria, só que a errada. Estava escrito aqui e mesmo assim derrubou duas
pessoas no mesmo dia; virou código. O plugin `paginasEstaticasDev` em
`vite.config.js` é dev-only (`apply: 'serve'`), reescreve `/<nome>/` para
`/<nome>/index.html` quando o arquivo existe, e **redireciona 301 a forma sem
barra** — assim o DEV fica honesto com a produção e um link sem barra falha
onde custa barato. Rota do SPA sem pasta correspondente (`/participar`) segue
para o fallback normalmente.

⚠️ **`sessionStorage` é POR ORIGEM — foi o que quebrou o acesso ao painel.**
O diálogo grava `scw_org` e navega para `/organizacao/`, que lê a mesma chave
e abre direto (`if (senha) abrirPainel()`). Servir o painel de **outra porta**
para contornar o parágrafo acima não resolvia nada: a senha ficava na origem
do site e o painel lia o armazenamento dele, vazio. **O fluxo de acesso só
fecha quando uma única origem serve o SPA e `public/`** — hoje o `npm run dev`,
o `vite preview` e a produção. ⛔ Não testar esse fluxo com dois servidores.

🐛 **RPC `returns void` responde 204 SEM CORPO, e `r.json()` estoura em cima do
vazio** com "Unexpected end of JSON input" — erro que parece de rede e é de
leitura. Atingia **7 RPCs** e deixou cinco botões do painel mortos. O `rpc()`
dos painéis lê `r.text()` e só converte se vier conteúdo; há teste que executa
a função real.
⚠️ **A prova por `curl` não pega isso**: ela lê o corpo fora do caminho do
código. **Chamada por HTTP não é chamada pelo caminho do código.**

🐛 **`id` de elemento vira propriedade global, e isso matou o Turnstile.**
Um `<div id="turnstile">` define `window.turnstile`; o `api.js` da Cloudflare
abre com `if (window.turnstile) return`, guarda contra importar duas vezes.
Ele via a div, concluía que já tinha carregado e **saía sem renderizar** —
script buscado, executado, e nenhum widget na tela, só um aviso no console
dizendo "Turnstile already has been loaded". O alvo passou a ser
`#pa-turnstile` em 25/08/2026, e `tests/quero-participar.test.mjs` reprova o
nome de volta. **A regra é maior que o Turnstile:** `id` curto de elemento
colide com qualquer global que uma biblioteca de terceiro consulte antes de
se instalar.

⚠️ **O aviso do console foi descartado duas vezes como "ruído de recarga"** —
primeiro no navegador embutido, que nem chega a pedir domínio de terceiro, e
por isso produziu um diagnóstico convincente e falso. Só o Playwright contra
`localhost` (que está na lista de hostnames do widget) desmentiu. **Navegador
que não busca a rede não testemunha sobre a rede** — é a mesma lição do
§10.8, subida um nível.

⚠️ **O JS delas mora inline e não passa pelo Vite**, então `npm run build` fica
verde com o script quebrado. `tests/quero-participar.test.mjs` e
`tests/organizacao.test.mjs` cobrem esse vão: parse, funções **declaradas** (não
só citadas), escape de tudo que vem do banco e ausência de chave secreta.

**Acesso ao painel:** pelo cartão "Organização" do diálogo de acesso — inclusive
na `/em-breve`, que ganhou um cabeçalho reduzido só com o botão. Não há link em
menu nem rodapé, de propósito. A senha é a mesma de `admin_config` e só se
redefine por SQL (`select public.set_admin_secret($$…$$)`); o banco guarda só o
hash, então **ela não é recuperável**.

**Como a marca ganha conta (modelo de 22/08/2026, no ar desde então):** pela
ficha de uma candidatura **aprovada** do `/quero-participar` **ou** pelo cadastro
manual, no painel, de uma marca que nunca preencheu formulário. Os dois pontos de
entrada chamam a mesma Edge Function `criar-acesso-marca`, e **do slug para baixo
o caminho é idêntico** — é isso que impede o cadastro manual de escapar da trava
de primeiro uso.

⛔ **Não há mais convite por e-mail.** A função cria o usuário **com senha
gerada** (12 caracteres, `crypto.getRandomValues`, alfabeto sem I/O/0/1 porque a
senha vai ser lida em voz alta) e devolve as credenciais **uma única vez**, na
resposta. Quem entrega é a organização, por WhatsApp ou copiando da tela.

⚠️ **O login é o NOME DO ESTABELECIMENTO, não um e-mail.** O Auth identifica por
e-mail, então o nome vira um endereço interno determinístico
(`<slug>@marcas.sweetcoffeeweek.com.br`) que **não recebe mensagem** — o e-mail
real da marca continua em `participantes.email`. Consequências que não se
negociam:

- **as duas slugificações têm que casar** — a de `public/marca/index.html` e a da
  Edge Function. Divergiram, a marca digita o nome certo e não entra, e o erro é
  genérico de propósito, então ninguém descobre o motivo. `tests/marca.test.mjs`
  compara as duas;
- **"esqueci minha senha" por e-mail foi REMOVIDO, e não é esquecimento:**
  mandar link para um endereço sem caixa de entrada é botão que nunca entrega
  nada. Quem redefine é a organização, gerando acesso novo pelo painel;
- **`deve_trocar_senha` é o que torna aceitável mandar senha por WhatsApp.** A
  senha viaja em texto e fica no histórico da conversa; com a trava, o que ficou
  lá é bilhete de uso único. ⛔ **Não desligar essa flag.** Se o `update` dela
  falhar, a função **apaga o usuário recém-criado** — conta sem trava é pior que
  conta nenhuma.

O quarto destino do painel, **"marcas"**, lista quem já tem conta e em que ponto
do cadastro está. O passo a passo e as decisões estão em
`docs/PLANO-painel-contas-participantes.md`.

#### `/marca/` mudou de dono no banco — 25/08/2026 (Fase 5)

✅ **`participantes` é a MARCA; `participacoes` é a marca NAQUELA EDIÇÃO.** Combo,
tema, preço, itens, unidades, horário e fotos são fato de uma edição, não da
marca — é como o acervo sempre contou a história (410 participações, 123 marcas).
O painel passou a ler e escrever a participação; `participantes` guarda o que
atravessa as edições: nome, responsável, contato, Instagram, site, CNPJ.

| Peça | Onde vive hoje |
|---|---|
| tema, justificativa, preço, `status_cadastro` do cadastro | `participacoes` |
| doce, salgado, bebida (nome, descrição, ingredientes, restrições) | `participantes_itens.participacao_id` |
| endereço, bairro, horário do festival, delivery e canais | `participacao_unidades` |
| nome da marca, responsável, telefone, e-mail, Instagram, site, CNPJ | `participantes` |

⚠️ **`admin_config.edicao_atual` é o que faz a conta nova nascer útil.** As duas
`vincular_*` chamam `abrir_participacao_interna` com esse código; **nula, nenhuma
participação é aberta e a tela diz isso com todas as letras** — a 17ª edição não
foi anunciada e inventar um código seria inventar dado (A4). Quem define é
`definir_edicao_atual(p_secret, p_codigo)`, guardada por `producao.gerir`.

⚠️ **`marca_concluir_cadastro` trocou de argumento: `p_participacao`, não
`p_participante`.** `create or replace` não renomeia argumento, então a antiga foi
derrubada. Chamada com o nome velho, o PostgREST devolve 404 e o botão "concluir"
nunca conclui — sem erro no console.

⚠️ **`participantes_operacao` ficou para trás e não é lida por tela nenhuma.**
Continua no banco com os dados de quem cadastrou pelo modelo antigo (hoje: zero
linhas). Não gravar nela.

🐛 **`text[] || 'literal'` explode com `malformed array literal`.** O Postgres
resolve `anyarray || unknown` como array‖array e tenta ler `'tema_combo'` como
literal de array. É preciso `|| 'tema_combo'::text`. O bug morava na
`marca_concluir_cadastro` original desde 22/08 e **só disparava quando faltava
campo** — ou seja, exatamente no caminho que a função existe para servir. A
conclusão devolvia exceção em vez da lista do que falta.

⚠️ **A marca não escreve caminho de foto em lugar nenhum.** `combo_foto_path` saiu
do grant de `participantes` (briefing §3.5); `participantes_itens.foto_path` já
estava fora. RLS decide LINHA, `grant` decide COLUNA — é preciso os dois.

#### `/organizacao/` alcançou o modelo novo — 25/08/2026 (Fase 6)

A barra passou de **4 para 5 destinos**: `resumo · respostas · marcas · produção
· equipe`. "Os formulários" desceu para dentro do resumo — é lista de
referência, não destino. ⚠️ **`DESTINOS.length` no script e o `repeat(N,1fr)` do
CSS são o mesmo número em dois lugares**; há teste que reprova a divergência.

- **marcas** — a linha virou `<button>` e abre a **ficha completa** da
  participação, numa chamada só (`get_ficha_participacao`).
- **produção** — pedidos com prazo e quem falta responder, arquivos, sessões.
- **equipe** — a edição aberta e as contas nominais por função.

⚠️ **`get_participantes` mudou de forma.** Devolve a participação corrente por
marca, com `unidades` e `itens_prontos` **contados pelo banco**. Quem lê tem que
usar `participacao_id`/`edicao_codigo`/`tema_combo` — `combo_nome`,
`combo_descricao` e `participantes_operacao` são o modelo antigo e vêm vazios.

⚠️ **`left join lateral`, nunca join comum.** Join devolveria a marca repetida
por edição, e a lista de marcas passaria a contar participações.

🐛 **`created_at` não desempata dentro de uma transação.** `now()` é o carimbo da
TRANSAÇÃO, não do comando: duas participações abertas juntas têm a mesma data, e
a escolha vira sorteio. O desempate é pelo **código da edição**, que ordena
sozinho.

🐛 **Coluna de saída chamada `id` sequestra `where id`.** Numa função
`returns table (id uuid, …)`, o plpgsql resolve `id` como VARIÁVEL antes de
resolver como coluna — `select … from admin_config where id` dá
`column reference "id" is ambiguous`, e só na hora da chamada. Apelidar a tabela
resolve.

⚠️ **Contagem que vem do banco é `bigint` e pode chegar como STRING.** `"2" + "1"`
é `"21"`, e `"1" === 1` é falso. Toda contagem passa por `Number()` antes de
virar conta ou plural.

**Duas Edge Functions novas:** `criar-conta-organizacao` (guardada por
`acesso.gerir`, só administrador; aqui o e-mail é **real**, diferente da marca)
e `arquivo-url` (assina upload e download dos buckets privados).

⚠️ **Os bytes não atravessam a Edge Function.** Ela assina; o navegador faz `PUT`
direto no Storage. Um PDF de 20 MB dentro do isolate esbarra em limite de corpo,
de memória e de tempo. O que passa pela função é a **autorização** e o
**caminho** — e o caminho é a única coisa que separa "subir arquivo da marca X"
de "escrever por cima do arquivo da marca Y". Validado nos dois lados, e o do
servidor é o que conta.

⚠️ **`producao.gerir` substituiu `pode_organizacao`** em `registrar_foto_item`,
`agendar_sessao_fotos` e `atualizar_sessao_fotos`. Quem entra como `consulta` lê
tudo e não escreve foto nem remarca sessão — que é o ponto inteiro de ter
funções. ⚠️ **Mas elas só separam algo quando existir conta nominal:** enquanto
todo mundo entrar pela senha compartilhada, `pode()` devolve `true` para as seis
ações.

⚠️ **A leitura das marcas (`get_participantes`) carrega FORA do `Promise.all` das
quatro origens, com `catch` próprio.** A RPC só existe depois de a migration das
contas ser aplicada; junto das outras, um 404 dela derrubaria o painel inteiro —
inclusive as respostas que já funcionam. **Toda leitura nova que dependa de
migration não aplicada segue a mesma regra.** `tests/organizacao.test.mjs`
reprova quem a colocar de volta no `Promise.all`.

⚠️ **Status novo no banco tem que ganhar rótulo no painel no mesmo commit.** O
CHECK de `quero_participar` ganhou `cadastro_completo`, e sem entrada em
`ROTULO_STATUS` ele apareceria como string crua e sumiria do filtro. O teste
deriva o vocabulário do próprio CHECK da migration.

#### O painel é um app instalável — armadilhas do 22/08/2026

🔴 **Service worker tem escopo de PASTA, não de configuração.** O do painel vive
em `public/organizacao/sw.js` e é registrado com `scope: '/organizacao/'`.
Servido da raiz, ele assumiria escopo `/` e passaria a interceptar **a landing
que está no ar** — e desfazer isso não é deploy: é desregistro no navegador de
cada visitante. `tests/organizacao.test.mjs` guarda as duas pontas.

⚠️ **O HTML do painel é sempre `network-first`.** Como o JS é inline no
documento, cachear o HTML congela o painel inteiro na versão antiga, e a
correção só chega quando a pessoa limpa o navegador. Cache ali é socorro de rede
caída, não estratégia.

⚠️ **O SW nunca vê requisição ao banco** — corte por origem no primeiro `if` do
handler de `fetch`. E **o nome do serviço não aparece no `sw.js` nem em
comentário**: sem o host escrito, não há o que copiar e colar quando alguém for
"fazer o offline funcionar". Offline está fora de escopo de propósito.

⚠️ **Dois manifests, escopos disjuntos.** `/manifest.webmanifest` instala o
**site**; `/organizacao/app.webmanifest` instala o **painel**. Barra final nos
dois campos de escopo dos dois arquivos — sem ela o escopo vira a raiz e
instalar o painel instalaria o site.

⚠️ **Ícone maskable: a caixa é 326px em 512, não 410.** A máscara do Android
recorta um círculo inscrito. Medido em pixel: com 410px sobravam **2191 pontos
de tinta fora** do círculo; com 326px sobram 9px de folga e zero pixels fora.
`public/favicon-512-maskable.png` foi gerado assim. **Regenerou a marca? remeça
a caixa** — não herde o número.

⚠️ **Altura de esqueleto se mede, não se calcula.** Um `.og-item` real dá
**102px até 900px** e **99px acima** (abaixo de 900px o `.og-item__dir` ganha
linha própria). A conta "padding + conteúdo" dava 74px e esquecia selo e data —
com ela a lista pularia 28px por item na chegada dos dados, que é o defeito que
o esqueleto existe para evitar.

⚠️ **O bloco `prefers-reduced-motion` fica por último no `<style>`, sempre.** Ele
zera animação e transição de tudo que veio antes; regra acrescentada depois dele
escapa sem ninguém notar. Há teste.

⛔ **Atualização otimista de status não entrou, e é decisão.** `salvar()` só diz
"Salvo." depois de o servidor confirmar (§4.1, com teste). Antecipar a
*aparência* é permitido; antecipar a *afirmação* não. Num painel que decide
aprovação de marca, otimismo mal feito é pior que lentidão.

#### Notificações — os dois painéis, 25/08/2026 (Fase 7)

`/marca/` virou aplicativo instalável, como `/organizacao/` já era: **manifest e
service worker próprios, escopo `/marca/`**. São **dois** SW, um por painel, e é
de propósito — um SW só na raiz cobriria os dois com metade do código e cobriria
junto o site público, que não pede nada disso.

⛔ **A chave privada VAPID não está no repositório.** Ela mora em
`ELOI SITES/scw-segredos/vapid.txt`, fora do git, e só vale ligada como
**variável de ambiente da Edge Function**. A **pública** está no código dos dois
painéis de propósito: o navegador precisa dela para assinar, e ela é pública.

⚠️ **As duas metades andam juntas.** Assinatura criada com uma chave não aceita
envio assinado por outra, e o sintoma é o pior possível: **some sem erro**,
porque o serviço de push devolve 403 para a função, não para a pessoa. Trocar o
par é trocar `VAPID_PUBLICA` nos dois painéis **e** as três variáveis, na mesma
leva — e toda assinatura existente vira lixo.

🐛 **O separador do RFC 8291 é o BYTE `0x00`, e ele fica FORA do literal de
texto** (`const NUL = new Uint8Array([0])`). Escrito como sequência de escape
dentro da string, esse byte se perdeu **duas vezes** numa sessão só: no heredoc
do shell e no JSON do deploy. Das duas o sintoma seria idêntico — chave
derivada diferente e o navegador **descartando a mensagem sem dizer por quê**.
Há teste que reprova tanto o byte cru quanto o escape.

⚠️ **`enviar-push` autoriza ANTES de conferir o ambiente.** Na primeira versão a
ordem era inversa, e qualquer um que chamasse a função descobria se as chaves
estavam postas. É pouca coisa, e é exatamente o tipo de pouca coisa que descreve
o servidor para quem não devia estar perguntando.

⚠️ **Endpoint de push é credencial.** Quem tem o endpoint de alguém manda
notificação para o aparelho dessa pessoa. Por isso `push_subscriptions` **não
tem policy de SELECT para ninguém** — quem lê é a Edge Function, com
`service_role` — e a resposta do envio nunca devolve endpoint.

⚠️ **A marca grava a própria assinatura pelo PostgREST, não por RPC** (a policy
de insert já existia). Como `update` está revogado de `authenticated`, **upsert
não funciona**: o caminho é apagar a linha do mesmo endpoint — que a RLS limita
ao dono — e só então inserir. O endpoint é `unique`.

⚠️ **No iPhone o push só existe com o painel INSTALADO na tela inicial.** Antes
disso o Safari não expõe `PushManager`. Não é defeito, é como o iOS funciona, e
as duas telas **dizem isso** em vez de mostrarem um botão que não faz nada.

⚠️ **Aviso é por APARELHO, não por conta.** Quem entra da mesma conta no celular
e no computador liga nos dois, separadamente.

⚠️ **`/marca/sw.js` entrou no `no-store` do `vercel.json`**, ao lado do da
organização. SW cacheado prende a correção no navegador de quem já abriu, e
nenhum deploy a alcança.

### 10.5 Grade e layout

⚠️ **`.scw-grade-fixa` desconta o gap na fórmula de largura** — sem ela, faixas de 4
numerais quebram a 3+1.

⚠️ **`flex: 0 0 auto` é obrigatório no `<li>` de chips roláveis no mobile** — senão os
chips colapsam.

⚠️ **Alargar o trilho tornou os tetos de medida de linha OBRIGATÓRIOS, não dispensáveis.**
Não remover teto "porque agora tem espaço" — é o inverso.

⚠️ **Mover uma seção exige conferir a alternância de fundo das vizinhas.** Creme e bege
alternam; a saída dos Depoimentos do meio de Participar deixou duas seções seguidas em
bege.

⚠️ **Pontuação órfã em títulos grandes: nenhuma linha pode conter só pontuação** (`:`,
`,`, `.`). **Causa raiz:** um destaque com `display: inline-block` vira **token atômico**,
e a pontuação seguinte ganha oportunidade de quebra própria. **Solução:** agrupar
palavra-destaque **+ sua pontuação** num wrapper com `white-space: nowrap`; **o espaço
fica FORA do wrapper**, para preservar a quebra natural entre grupos. **`nowrap` só em
grupos curtos — nunca em frase inteira, causa overflow horizontal.** `text-wrap: balance`
(títulos) e `pretty` (parágrafos) convivem com os grupos. **Revisar títulos grandes em
mobile, tablet e desktop antes de aprovar qualquer página.**

⚠️ **Container queries `cqi` escalam pela largura do card, não pelo comprimento do
texto** — limitar o teto do `clamp` quando o conteúdo for longo (ex.: `+R$ 712 mil`),
**sem aumentar só um card**.

### 10.6 Cor e contraste — números que já derrubaram decisões

| Combinação | Contraste | Consequência |
|---|---|---|
| Marrom `#6A2C15` sobre chocolate | **~1,5:1** | falha como emblema **e** como texto → 3º lugar não é marrom |
| Roxo `#4D257E` sobre chocolate | 1,45:1 | cai no amarelo em `pageColorDark()` |
| Marrom sobre chocolate (menu escuro) | 1,53:1 | cai no amarelo |
| Laranja `#FF4810` sobre chocolate | 4,78:1 | passa, fica |
| Cyan `#01AFCC` sobre chocolate | 6,23:1 | passa, fica |
| Laranja como tinta pequena sobre creme | 3,0:1 | **só superfície preenchida** |
| Magenta `#F10767` sobre creme | 3,8:1 | **só texto grande** |
| Roxo como destaque de H1 em Participar | 4,25:1 | só texto grande |
| Magenta `#E50053` sobre `#0B0B0C` (F2) | 4,18:1 | só texto grande e elemento gráfico |
| Tinta `#F5F5F5` sobre `#0B0B0C` (F2) | 18,05:1 | rótulos pequenos e CTA usam esta |
| Magenta como fundo de texto creme (Participar 04) | 4,86:1 | passa — por isso o ciclo fecha em magenta ali |
| Vinho sobre foto (numeral de Edições) | 2,08:1 | por isso o numeral é `#FEF0DD` |
| Pill chocolate com tinta creme (menu Participar) | 10:1 | substituiu `#D0055B` |

⚠️ **Cyan e laranja não fecham 4,5:1 como texto sobre creme** → em link com filete, quem
recebe a cor é **o filete**, não a tinta.

⚠️ **O anel de foco global é cyan** → em chapa clara cyan (Participar) ele sumiria; usar
chocolate no selo, no CTA e no anel.

⚠️ **`--base` do `scwDestaque` tem que ser a tinta REAL daquele título** — senão o destaque
começa invisível sobre o próprio fundo.

### 10.7 Sincronia CSS ↔ JS

⚠️ **`PAGE_COLORS` / `MENU_ESCURO` em `src/components/nav.jsx` são espelho JS do CSS.
Mudou o CSS, muda o JS no mesmo commit.**

⚠️ **Ícone que não existe não quebra a página** — a checagem é manual, ver §6.11.

### 10.8 Testes e ferramentas

✅ **`tests/responsive.mjs` passa em 6 de 6 desde 22/08/2026.** A reprova crônica de
"menu-toggle invisível no mobile" acabou — e o diagnóstico antigo desta seção estava
**errado**, o que vale mais que a correção.

A doc dizia: *"`.menu-toggle` é do sistema legado, o teste está desatualizado, a falha
some quando `styles.css` for removido"*. Meia verdade. `styles.css` já tinha sido
demolido e a falha continuava, porque a causa era outra e mais funda: **o teste nunca
carregou o site.** Ele abria `${BASE}/`, e o `vite preview` serve o build de PRODUÇÃO,
onde `import.meta.env.DEV` é `false` — então `COMING_SOON_PUBLICATION` derrubava as seis
viewports na landing `/em-breve` (§3.4). Faltava `?preview=1`, que o `tests/motion.mjs`
sempre teve.

⚠️ **A pista estava no próprio relatório e passou meses sem ser lida:** o teste *achava*
`.brand` e *não achava* `.menu-toggle`. Um seletor do sistema antigo presente e outro
ausente, no mesmo DOM, não é envelhecimento — é **página errada**. (`.brand` é da
`EmBreve.jsx`; a landing nunca teve menu.) **Seletor achado e seletor ausente do mesmo
"sistema morto" é assinatura de rota errada, não de código morto.**

O arquivo foi reescrito na mesma etapa. Saíram quatro premissas do sistema anterior:
`.site-header`/`.brand`/`.menu-toggle`/`.mobile-menu`/`.mobile-overlay` → casca 2026;
breakpoint 960 → **900**; gutter `clamp(28px,11.5vw,150px)` → `--scw-trilho` **lido do CSS
computado**, não redigitado (§5.2 — teste que recopia a fórmula passa a medir a cópia);
rota `/#/` → `/`, o hash routing morreu no Anexo A.3. O piso de toque subiu de 40 para os
**44px** do §6.10, e o fluxo do menu virou o da folha "mais" — que fecha por `.is-fechando`
e só então desmonta, então "fechada" se mede por `state: 'detached'`, não por
invisibilidade.

⚠️ **`tests/icones.mjs` não existe no repositório**, apesar de a documentação antiga mandar
rodá-lo.

⚠️ **`tests/responsive.mjs` e `tests/motion.mjs` rodam contra o BUILD de produção via
`vite preview`, não contra o dev server** — só o build reflete o site real: minificação,
ordem final de CSS, assets com hash. **Por rodarem no build, os dois precisam de
`?preview=1` na URL**, senão medem a landing (acima).

### 10.9 Acervo e dados

⚠️ **Nome de pasta do acervo não é descrição de conteúdo — já falhou duas vezes.**
"encantamento em loja" e "patrocínios e apoios" **eram fotos de festa a fantasia.**
**Inspecionar visualmente antes de confiar.** Contraexemplo útil: a pasta `sinalização/`
tem 9 arquivos chamados `nao usar essas (N).jpg` — aí o nome **é** a instrução.

⚠️ **A Base de Conhecimento não vale como fonte-mestra de contagem.** Ela errou quatro
vezes (2018.1, 2019.2, 2020.1, 2023), tratando pastas mal nomeadas do acervo bruto como se
fossem marcas participantes. **A fonte mais confiável são os cards "Confirmado" oficiais**,
em `acervo-bruto/EDIÇÕES DO FESTIVAL/<edição>/participantes/`, acima do código e muito
acima da Base.

⚠️ **Se `ACERVO.md` ou `src/data/handoff/*` divergirem do código em `src/data/`, vale o
CÓDIGO** — e o resumo é corrigido, não o contrário.

⚠️ **`src/data/_arquivo/` está fora do bundle de propósito. Não importar de lá em código
vivo.**

⚠️ **Campos `null` em `faqCentral.js` não são bug** — ver §7.6.

---

## 11 · Decisões já testadas e reprovadas

**Não repetir o teste.** Cada linha custou uma rodada.

| Tentativa | Por que caiu |
|---|---|
| Card de 1º lugar do Awards em **4:5 exclusivo** | cortava a foto de forma inconsistente com as outras duas e, em fotos sem espaço vertical de sobra, dava zoom demais. As três fotos sempre 1:1 |
| **Vitrine dos 4 primeiros lugares** no herói do Awards | eram as mesmas quatro fotos que abrem a seção 02 logo abaixo, lá com pódio completo e medalha. O assunto da página contado duas vezes, a primeira pior |
| Barra da galeria de Edições com **5 peças** | três indicadores do mesmo estado ao mesmo tempo. Com 4 páginas por edição, o acesso aleatório dos pontos não pagava a largura |
| **"Como é decidido" com dois cards gêmeos** | escondia que a régua mudou ao longo do tempo |
| Gráfico de "participantes por edição" com pico e recorde | *"parece competição entre edições, isso não deve ocorrer"* |
| Fonte **mono** em rótulos institucionais (rejeitada 2×) | incomoda a face mono, não o caixa-alta |
| **Medalha de 3º em marrom** | ~1,5:1 sobre chocolate |
| Trilho de **1360px** | em tela larga sobrava faixa vazia dos dois lados — *"o site tem que acompanhar as dimensões da tela"* |
| `--sp-section clamp(56px, 11.5vw, 220px)` | inflava ≈440px entre seções em telas largas |
| Duas listas de bullets lado a lado em Apoiar 05 | bolinha de 7px é indicador de item de lista, não de dado |
| `.swa-hero::before`, degradê de 340px do topo | era o mesmo trabalho feito duas vezes — a banda já escurece onde a logo passa |
| Barra de 5px sob o cabeçalho | o herói já é a cor da página |
| Cartão 4:3 + 3 indicadores no herói de Participar/Apoiar | os três números já existiam idênticos na seção `03 Números` |
| Contato sem herói | a página abre com herói compacto desde o redesign 2026 |
| Herói de Participar com formulário integrado e selo girando | herói é rótulo + H1 + lead + duas ações |

---

## 12 · Fluxo Claude Design ⇄ Código

### 12.1 Regra de ouro

**O código é a fonte de verdade.** O Claude Design é onde a mudança é *desenhada*, nunca
onde ela passa a existir. **Nenhum valor visual nasce no Design e fica só lá.**

A sincronização é de mão única: `DesignSync` empurra código → Design. O caminho de volta é
manual, e é sempre um **patch por seletor**.

### 12.2 Divisão de trabalho

| Tipo de mudança | Onde fazer | Por quê |
|---|---|---|
| Layout, grade, hierarquia | **Design** | vê-se na hora, no site real congelado |
| Cor, tipografia, espaçamento | **Design** | os tokens no snapshot são os do site |
| Copy, títulos, textos editoriais | **Design** | edição direta no texto renderizado |
| Novas seções e blocos | **Design** | compor antes de implementar |
| **Movimento, timing, easing** | **Código** | o snapshot congela animação no estado final |
| Comportamento (acordeão, busca, filtro, formulário) | **Código** | snapshot é HTML sem React |
| Dados, contagens, acervo | **Código** | vêm de `src/data/*` |
| Acessibilidade, foco, teclado | **Código** | precisa do DOM real e de teste |

Se a mudança precisar de **layout + movimento** junto: desenhe o estado final no Design,
implemente o layout no código, e só então ajuste o movimento no código.

### 12.3 O ciclo

1. **Sincronize antes de começar.** Mexeu no CSS do site desde o último sync? Rode o
   `DesignSync` — desenhar por cima de snapshot velho gera patch que não aplica.
2. **Trabalhe em `paginas/*.html`.** O CSS embutido é cópia integral de `scw-2026.css` +
   `scw-motion.css`, então os seletores que você mexe são os reais.
3. **Feche o escopo por página.** Um patch por página, não um patch por sessão.
4. **Gere o patch** — seletor, valor antes, valor depois, arquivo destino.
5. **Aplique no código** e rode os testes que o patch listar.
6. **Rode o `DesignSync` de novo.** Fecha o ciclo.

### 12.4 Um arquivo só: o site inteiro

Nada de tela isolada, página de teste ou variação em arquivo próprio. Toda mudança
acontece dentro do **site único**, na seção ou no componente real — inclusive diálogos e
estados. **Duas cópias da mesma tela divergem na primeira rodada seguinte**, e aí o patch
passa a descrever algo que o site não tem.

### 12.5 Template de patch

```md
# PATCH — <página> / <o que mudou>

Origem: `paginas/<pagina>.html`
Destino: `src/styles/scw-2026.css` (+ `src/pages/institutional/<Pagina>.jsx` se houver markup novo)
Branch: `dev/site-completo`

## Alterações de CSS

| Seletor | Propriedade | Antes | Depois |
| --- | --- | --- | --- |

## Markup novo (se houver)
   trecho colável, com as classes já existentes do sistema

## Movimento
Nada aqui — ou: "este bloco precisa entrar com `.scw-reveal`".

Sempre válido: preservar as animações existentes e aplicar o movimento do
sistema às seções novas. Botões chapados, sem sombra.

## Checagens
- [ ] `npm run build`
- [ ] `node tests/redesign-2026.test.mjs`
- [ ] `node tests/responsive.mjs`
- [ ] Contraste AA nos textos tocados
- [ ] `DesignSync` rodado depois de aplicar
```

**O escopo do que vem do Design é visual:** layout, cor, tipografia, espaçamento,
hierarquia, copy, ícones, novas seções. **Não vem lógica, rota, dado nem estado.**

### 12.6 Armadilhas do fluxo

⚠️ **Patches podem ter premissas desatualizadas.** O Design trabalha sobre um snapshot
congelado; o código pode ter mudado desde o último `DesignSync`. **Sempre conferir contra
o estado real do arquivo antes de aplicar — se o patch e o código divergirem, o código
manda, e o patch é ajustado (nunca o contrário).**

⚠️ **Um patch pode contradizer outro da mesma leva.** Já aconteceu: um patch usou
`#D0055B` num token que o patch seguinte, na mesma rodada, removia da paleta. **Antes de
aplicar em sequência, confira se um patch posterior não bane uma cor ou token que um
anterior acabou de introduzir.** Vale ler o patch inteiro — se ele mesmo dá o motivo da
mudança, a lógica interna geralmente aponta qual dos dois valores é o correto.

⚠️ **Não aceitar handoff em prosa ou print.** Sem seletor, a mudança é reinterpretada — e
reinterpretação é como valor redigitado entra no sistema.

⚠️ **Um patch não reescreve arquivo.** Se está grande demais para caber em tabela, o
escopo estava errado: quebre por seção.

⚠️ **O conector do GitHub lê código, não renderiza.** Ele vê `Home.jsx` e `scw-2026.css`,
**não vê a Home**. Para o resultado visual existe o snapshot em `paginas/`.

⚠️ **O snapshot não tem interatividade** (sem React: acordeão, busca, filtros e
formulários ficam no estado inicial), traz **Edições em uma cena só** e **congela o
movimento no estado final** — que é justamente como se edita layout sem lutar com
animação.

### 12.7 Onde buscar cada coisa

| Precisa de | Use |
|---|---|
| Valor exato de token, classe ou medida | conector, direto no `src/styles/` |
| Regra ("posso usar roxo aqui?") | este documento |
| Ver a página como ela é | snapshot `paginas/*.html` |
| Compor com peça existente | cards de componente no projeto de design |

### 12.8 Projetos no Claude Design

| Projeto | ID | O que é |
|---|---|---|
| **Componentes (sync)** | `9e1564b3-a104-4667-8303-4388d9d91d9e` | Design System — **alvo atual do `DesignSync`**, gerado do código real |
| **Redesign 2026** | `b98b740b-4746-4ad5-8074-2ac47d03b4e6` | onde ficam os snapshots `paginas/*.html` e onde as páginas são desenhadas |
| **SITE SCW** | `1bdcc919-8ad5-42d1-b759-cb86fb9da5c0` | project imutável — **hoje consome o DS errado** |

⚠️ **Pendência do Eloi:** reapontar "SITE SCW" para `9e1564b3`. Só dá para fazer na
interface do claude.ai/design. **Enquanto não migrar, qualquer desenho novo nasce na
paleta errada, não importa a instrução colada junto.**

⛔ **Projetos antigos — não usar:** "Sweet & Coffee Week Design System" (paleta terracotta,
`--coral: #E8553A`, componentes `Sticker`/`SideNav`, sem roxo) e o DS handmade
`3f2c7a10-…`. **Sincronizar o sistema atual dentro de qualquer um deles misturaria duas
identidades no mesmo painel** e contaminaria qualquer conversa futura.

---

## 13 · Checklist antes de finalizar

1. Home não alterada sem necessidade.
2. Flags de publicação em `App.jsx` não alteradas sem pedido explícito.
3. Nenhuma cor fora da tabela do §6.1. Nunca `#E52C4B`.
4. Nenhum elemento decorativo sem função (elemento funcional é permitido).
5. Margens no trilho único `--scw-trilho`.
6. Tetos de medida de linha respeitados.
7. Placeholders honestos — reserva editorial, nunca área vazia.
8. Desktop e mobile funcionam (1000 · 900 · 820 · 760 · 420; sem rolagem horizontal).
9. Build de verificação **fora do projeto**, uma vez só.
10. Mexeu em movimento? `npm run build && npm run test:motion`.
11. Mexeu em ícone? Varredura de chaves `nome=` contra `SCW_ICONS`.
12. Mexeu em cor de página? `PAGE_COLORS`/`MENU_ESCURO` no mesmo commit.
13. **Acessibilidade:** um `<h1>` por página e hierarquia coerente; contraste ≥ 4,5:1;
    label real (`<span>`) + placeholder, nunca placeholder-como-label; ação de navegação é
    `<button>`/`<a>`, nunca `onClick` em elemento morto; alvo de toque ≥ 44px.
14. **Não regressão visual:** em mudança de token ou global, varrer todas as rotas
    comparando antes e depois. **Refatoração ≠ redesign.**
15. Commit só com os arquivos da tarefa.

---

## Anexo A · O que foi descartado, e por quê

Este anexo existe para que ninguém reintroduza uma regra morta achando que ela foi
esquecida. **Nada aqui é regra ativa.**

### A.1 O KV e o sistema visual "Lovers"

**Decisão do Eloi, 06/08/2026: o KV da Lovers é apagado.** Morreram junto:

- todo o bloco de identidade Lovers: paleta cream, `--lovers-red: #D63648`, burgundy,
  pink, yellow; tipografia Sofia Pro Comp via Typekit; wrapper obrigatório `.kv-lovers`;
- `src/styles/lovers-system.css` (138 KB) e o carregamento lazy dele;
- a proibição "nunca aplicar estilos Lovers em institucionais e vice-versa" — perdeu o
  objeto;
- o nível "Edição vigente" da hierarquia de identidade de três níveis, que vira **duas**:
  institucional + histórico;
- **Adobe Fonts / Typekit** na stack — servia só à Sofia Pro Comp;
- `/images/lovers-logo.svg`, `/images/sweet-lovers-logo.svg`,
  `/images/email-logo-lovers.png`, as três molduras `moldura-lovers-*.png`.

**Não morreu junto:** "Sweet Lovers" como nomenclatura permitida e como nome da
comunidade; a direção "Sweet Lovers = comunidade de fãs, nunca casais românticos";
`loversAwardsResults.js` como fonte dos pódios de 2026.1; a pasta
`public/images/lovers-publico/` como acervo fotográfico.

### A.2 As rotas `/lovers/*` e o painel de votação

Todas as rotas `/lovers/*` já redirecionavam para a home no código. Morrem formalmente:
`/lovers/painel`, `src/pages/lovers/`, a exceção "o painel admin do Sweet Awards segue
acessível", `LEGACY_LOVERS_PATHS`, e **todas as ressalvas "vale só nas telas legadas
`/pesquisa` e painéis internos"** — que apareciam em 15 lugares diferentes.

O painel de votação pertence à **camada de edição** e nasce de novo, com KV próprio,
quando a 17ª edição acontecer.

### A.3 Hash routing obrigatório e QR Codes

A seção "URLs estáveis para QR Codes — REGRA PERMANENTE" morre inteira, com os padrões
`#/lovers/combos/{slug}` e `#/lovers/awards`, a proibição de trocar hash por path routing,
e o script `qr:lovers`.

> **O código já desmentia essa regra há meses:** `App.jsx` redirecionava exatamente essas
> rotas para a home. Era a contradição mais antiga do repositório — uma regra marcada como
> "permanente e absoluta" em sete arquivos, quebrada no código.

### A.4 Os 21 slugs congelados

Morre o **congelamento**. **A convenção de nome de arquivo continua viva** (§9.9).

### A.5 A página `/curiosidades`

Descontinuada, redireciona para `/edicoes`. Morrem o capítulo inteiro que a documentava,
`Curiosidades.jsx`, `curioContent.js` e a rota.

**Não morre junto:** "Edições não competem entre si" — nasceu no contexto de Curiosidades
mas é **regra geral de conteúdo** (§8.5).

### A.6 `/pesquisa`, `PainelAdmin` e o `styles.css` legado

Morre tudo que descrevia o sistema anterior: `--page-accent` como fundo cheio da hero
(`background: var(--page-accent) !important`), a regra "o acento tem que ser tom claro",
os tokens `--header-safe-offset` / `--hero-top-clearance` / `--hero-content-start`, a
"armadilha do `!important` global" em `styles.css`, os "dois `:root` concorrentes", o
código morto `.site-sidebar` / `.combo-rail` / `.ed-hero`, o rodapé `.site-footer*`, e os
capítulos "Como alterar uma hero GLOBALMENTE" e "Como alterar cores/fontes/espaçamentos".

### A.7 `swc-redesign.css` e o design system v2

**O arquivo `DESIGN.md` morre inteiro.** Era a especificação do design system anterior:

- **Cor:** `--cream #FFF1E6` · `--choco #3A2114` · `--ink #2B1810` · `--coral #E8553A` ·
  `--pink #F2548A` · `--cyan #2BC4E8` · `--yellow #F8B511` · `--peach #F2B6A0`.
- **Tipografia:** `--font-display` / `--font-heading` / `--font-body` / **`--font-mono`
  JetBrains Mono para eyebrows**.
- **Forma:** raios `--r-sm/md/lg/xl/pill`, sombras `--shadow-sm/md/lg/pop` (drop chunky de
  sticker), `--ease-pop` bouncy, durações 140/240/420ms, `.wrap` 1280px.
- **Componentes:** Button (pill sticker), **Sticker**, Card, FeatureTag, **SideNav**
  (sidebar fixa de 280px), SectionHeader, StepCard, StatBlock, PhotoBadge.
- **Estética "sticker-forward"** — recortes orgânicos, selo, sombra de sticker, quatro
  acentos pop.

> **A única coisa que sobreviveu:** o **padrão StatBlock**, reinterpretado — régua de 4px
> + numeral chocolate (§6.3). É decisão deliberada e ativa.

### A.8 Preço, endereço, horário e patrocinadores

**Não vão ao ar** (§2.2). ⚠️ **A auditar:** a central de dúvidas (`faqCentral.js`) é o
lugar mais provável onde preço, endereço ou horário apareçam como conteúdo de texto.
**Varrer o arquivo diretamente antes de publicar.**

### A.9 Mapa, rota interativa e avaliação ao vivo

Pertencem à camada de edição, que não existe hoje. Morrem as rotas `/mapa`, `/rota`,
`/participantes`, o serviço Google Maps, e o CTA institucional que apontava para
`go('/rota')` — **uma rota morta**.

**Não morre junto:** a **anatomia do combo** na Home e as galerias de combos de edições
anteriores e de Sweet Gift (são histórico institucional, não combo ao vivo); o **mapa como
peça impressa** citado em `04 · Materiais` de Participar (é material físico, não
funcionalidade); a regra de linguagem "avaliam, não votam"; e "não prometer função ainda
indisponível ao público", que fica ainda mais relevante.

### A.10 Documentos aposentados

| Arquivo | Destino |
|---|---|
| `CLAUDE.md` (versão anterior, 66 KB) | **substituído por este** |
| `docs/GUIA-VISUAL.md` (51 KB) | **substituído** — era o núcleo do §6 |
| `docs/DEV_GUIDE.md` (29 KB) | **substituído** — sobrevivem partes nos §3 e §5 |
| `AGENTS.md` (26 KB) | **descartado** — era uma cópia anterior do `CLAUDE.md`, uma geração atrás em quase tudo |
| `AI_RULES.md` (18 KB) | **descartado** — sobrevive na arquitetura do §5 |
| `DESIGN.md` (9 KB) | **descartado inteiro** — ver A.7 |
| `docs/SITEMAP.md` | **descartado** — a tabela de rotas estava errada em 7 de 9 linhas e a branch estava errada |
| `docs/SITE_DIRECTION.md` | **descartado** — descrevia a Home do sistema anterior |
| `docs/FLUXO-DESIGN-CODIGO.md` | **absorvido pelo §12** |

**Podem ser apagados do repositório.** O histórico do git guarda tudo.

### A.11 As 53 contradições que motivaram esta reescrita

A leitura integral dos 8 documentos anteriores encontrou **53 contradições documentadas**:
24 entre arquivos, 17 dentro do mesmo arquivo e 12 em que o código desmentia a
documentação. Entre elas:

- **quatro** valores diferentes de margem horizontal, cada um declarado como "a regra";
- **quatro** escalas de ritmo vertical;
- **quatro** escalas de movimento;
- **quatro** vocabulários de componente;
- **três** Homes diferentes descritas;
- **duas** paletas oficiais, uma delas proibindo o roxo que é a cor de uma página viva;
- **dois** rodapés documentados;
- **duas** fontes de dados para o FAQ do Contato;
- uma regra "permanente e absoluta" sobre QR Codes que o código já quebrava;
- e **onze** trechos em que um documento declara por escrito que está desatualizado.

**Era o terreno que travava, não o modelo.** Toda alteração visual exigia responder antes
*qual dos três CSS manda aqui?* e *isso é permitido por qual dos seis documentos?* —
sendo que os documentos erravam.

Este documento existe para que essa pergunta tenha **uma** resposta.

---

## Anexo B · Ordem de execução do plano

Da `acervo/plano-demolicao.md`, para contexto:

1. **Demolição** — remover os arquivos do §4.3, um commit por sub-etapa, build entre cada
   uma. *(Bloqueada: exige rodar na máquina do Eloi.)*
2. **Regras** — este documento. ✅
3. **Quebra das páginas** em componentes, começando pela Home (§5.8).
4. **Modelo de dados e acervo** — processar as ~1.500 fotos de combo, extrair os 102 logos
   que faltam, aplicar as correções do §9.4.

Depois disso, as páginas na ordem do plano institucional: Edições, Sweet Awards e Marcas
primeiro (as três que o acervo sustenta sozinho), depois a Home, depois Participar,
Apoiar e Contato.

---

*Documento único do projeto Sweet & Coffee Week. Se algo aqui divergir do código, vale o
código — e este arquivo é corrigido no mesmo commit.*
