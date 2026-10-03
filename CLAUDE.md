# Sweet & Coffee Week — Regras do projeto

**Regras do projeto.** Versão 1.0 — 07/08/2026. Desde 03/10/2026 dividido em
arquivos por área (índice em "Onde está o resto das regras", antes do §13):
este arquivo carrega em toda conversa e guarda só o que vale sempre.
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
| 2 | **Este documento e os arquivos do índice** | Processo, arquitetura, direção visual, tom, o que é proibido |
| 3 | **O acervo** (`acervo/*.md` no projeto) | Dado histórico do festival: edições, marcas, pódios, números |

Não há quarto degrau. Fora deste arquivo e dos listados no índice, nenhum `.md`
do repositório carrega regra ativa.

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

**Desde 18/09/2026 (pedido do Wilke) o domínio abre na página Participar, e só nela:**
`PARTICIPAR_ONLY_PUBLICATION = true` faz **qualquer endereço** — inclusive `/` e
`/contato` — renderizar Participar, **sem menu**: o cabeçalho fica com a marca e o
botão "Painel SCW", o rodapé perde os links de página e a barra de abas do celular não
entra. As páginas estáticas (`/quero-participar/`, `/painel/`) seguem no ar. Ver §3.4.

⚠️ **Esta seção estava atrasada duas publicações** e foi corrigida junto: dizia que o
ar era a landing `/em-breve` (`COMING_SOON_PUBLICATION`), que saiu em 26/08/2026; entre
26/08 e 18/09 o que valeu foi `AGUARDE_ONLY_PUBLICATION` (página de espera em `/`, com
Contato e Participar por link direto), que nunca chegou a ser registrada aqui.

**O institucional completo continua em `dev/site-completo`** — as sete páginas do
§2.4, visíveis em DEV e em `*.vercel.app?preview=1`. Publicá-lo é desligar
`PARTICIPAR_ONLY_PUBLICATION` (§3.4) mais o merge em `master` (A2): duas decisões do
Wilke, nenhuma automática.

### 2.4 Mapa de páginas — alvo institucional

| Página | Papel | Estado |
|---|---|---|
| **Home** (`/`) | Anunciar a próxima edição e explicar o festival | existe, 7 seções (§7.1) |
| **Edições** (`/edicoes`) | Memória e vitrine | existe, 16 cenas (§7.2) |
| **Sweet Awards** (`/sweet-awards`) | Reconhecimento | existe (§7.3) |
| **Marcas** | Diretório das 123 casas | **não existe — a construir** |
| **Participar** (`/participar`) | Converter marcas | existe, 6 seções (§7.4) |
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
| `COMING_SOON_PUBLICATION` | `false` | landing `EmBreve` em toda rota — desligada em 26/08/2026 |
| `AGUARDE_ONLY_PUBLICATION` | `false` | página de espera em `/`, Contato e Participar por link — desligada em 18/09/2026 |
| `PARTICIPAR_ONLY_PUBLICATION` | **`true`** | **gate ativo** — toda rota renderiza Participar, sem menu (`SiteHeader semNav`, `SiteFooter semLinks`, sem barra de abas) |
| `INSTITUTIONAL_PREVIEW` | *computado* | `true` em DEV e em previews `*.vercel.app?preview=1`; **sempre `false`** no domínio oficial. É **aditivo** — libera revisão sem mexer nas outras |

⚠️ **O gate some em DEV** (`INSTITUTIONAL_PREVIEW` é `true` no `npm run dev`). Para ver
a versão que vai ao ar, é o deploy de Preview da Vercel **sem** `?preview=1`.

Publicar o institucional completo é `PARTICIPAR_ONLY_PUBLICATION = false` — **decisão do
Wilke, nunca automática**. **Não alterar flag para "ver a página em produção": use o
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

## Onde está o resto das regras

Este arquivo carrega em toda conversa, então guarda só o que vale sempre. O resto
foi movido **sem reescrita** em 03/10/2026, com a mesma numeração de seção — uma
referência como "§6.12" continua válida, só mora em outro arquivo.

| Seções | Arquivo | Carrega |
|---|---|---|
| §6 Sistema visual · §10.1–10.7 armadilhas de CSS, cor e layout | `src/CLAUDE.md` | sozinho, ao mexer em `src/` |
| §7 As páginas (Home, Edições, Awards, Participar, Apoiar, Contato, Em breve) | `src/pages/CLAUDE.md` | sozinho, ao mexer em `src/pages/` |
| §10.4-b Páginas estáticas, painel, contas, push, Fases 5–16 | `painel-app/CLAUDE.md` | sozinho, ao mexer em `painel-app/` |
| §4 Stack, Supabase, migrations, estrutura de pastas, demolição | `docs/regras/04-stack-e-estrutura.md` | **ler antes** de mexer em banco, Supabase, dependência ou estrutura |
| §9 O dado do festival (números, Hall, marcas) | `docs/regras/09-dado-do-festival.md` | **ler antes** de exibir ou alterar dado |
| §10.8–10.9 Testes e acervo | `docs/regras/10-testes-e-acervo.md` | **ler antes** de rodar/escrever teste ou usar acervo |
| §11 Decisões reprovadas · §12 Fluxo Claude Design | `docs/regras/11-12-reprovadas-e-fluxo-design.md` | **ler antes** de propor layout ou aplicar patch do Design |
| Anexos A e B (o que foi descartado) | `docs/regras/anexos-descartados.md` | **ler antes** de reintroduzir algo antigo |

⚠️ **Mexeu no site (`public/`, `index.html`, `vite.config.js`) sem passar por `src/`?** O
`src/CLAUDE.md` não carrega sozinho — abrir antes.

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

