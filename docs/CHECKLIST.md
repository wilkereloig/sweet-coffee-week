# CHECKLIST.md — Validação obrigatória por tarefa

> Documento interno do projeto **Sweet & Coffee Week** (site institucional).
> **Toda tarefa** — ajuste visual, refactor, novo componente, correção — só é
> considerada concluída depois de passar por este checklist e produzir o
> **RESUMO final** (modelo no fim do arquivo).
>
> Este arquivo trabalha junto com as regras vivas: **`../CLAUDE.md`** (raiz do
> projeto), o **`CLAUDE.md`** do diretório-pai (ELOI SITES) e o **`SITEMAP.md`**.
> Em caso de conflito, a fonte viva é o `CLAUDE.md` do projeto.

---

## 0. Antes de começar (pré-tarefa)

- [ ] Branch correta: `git branch --show-current` = **`dev/site-completo`**.
      Se estiver em `master`/`main`: **parar e avisar** (proteção absoluta).
- [ ] Escopo listado: quais arquivos serão tocados **antes** de editar.
      Alterar só o que se relaciona ao pedido.
- [ ] Reli as regras relevantes do `CLAUDE.md` (paleta, margens, heros, §9 Home).
- [ ] Identifiquei a **fonte de verdade** do que vou mudar (ver Contexto de
      arquitetura abaixo) — para não editar um arquivo que é sobrescrito por outro.

### Contexto de arquitetura (por que "não propaga") — LER

O site tem, hoje, **múltiplas fontes de verdade para a mesma coisa**. Isso é a
causa-raiz de "mudei algo global e não propagou". Ao mexer em algo global,
confirme onde a mudança realmente vive:

| Conceito | Estado ATUAL (cuidado) | Estado ALVO (proposto — pode ainda não existir) |
|---|---|---|
| Hero institucional | 7 heros bespoke, cada um com `<style>` inline no `.jsx`; regra global em `src/styles.css` (~linha 538) usa `!important` e **sobrescreve** o que o `.jsx` mostra. Seletor `.ed-hero` é **morto** (Edições usa `.edx-hero`). | Componente único `<Hero>` em `src/components/layout/Hero.jsx`. |
| Container / margem | `.wrap` canônico (1280 / `clamp(20px,4vw,56px)`, §4) + variações divergentes por página. | `<Section>` / `<Wrap>` únicos. |
| Tokens de cor/tipo | **Dois `:root` concorrentes**: `src/styles.css` (v1 terracota) e `src/styles/swc-redesign.css` (v2 creme, vence por ordem de import). | `src/styles/tokens.css` único, carregado 1º. |
| Form (clipboard→Instagram) | Duplicado 3x (Participar, Apoiar, SiteFooter). | `<PageForm>` + `useContactForm()`. |
| `INSTAGRAM_URL` | Hardcoded 4x. | `src/config/channels.js` único. |
| Conteúdo (depoimentos etc.) | Alguns ainda hardcoded no `.jsx`. | Migrado para `src/data/`. |

> **Regra prática:** se a tarefa é "mudar X em todas as páginas" e X ainda **não**
> tem fonte única (componente/token/config), o correto é ou (a) consolidar X numa
> fonte única primeiro, ou (b) editar **explicitamente cada ocorrência** e marcar
> no checklist §1 que todas foram cobertas. Nunca assumir propagação automática
> enquanto a fonte única não existir.

---

## 1. Checklist de validação (OBRIGATÓRIO — marcar todos)

### 1.1 Propagação e cobertura
- [ ] **Ajuste aplicado em TODAS as páginas necessárias.** Se o ajuste é global,
      confirmei que a fonte de verdade real foi editada (não um arquivo
      sobrescrito). Se não há fonte única, listei e editei cada ocorrência.
- [ ] Verifiquei no DevTools/preview que a regra que "deveria" valer **não está
      sendo vencida por um `!important` fantasma** (caso clássico dos heros).
- [ ] Rotas afetadas conferidas uma a uma (ver lista de rotas no `SITEMAP.md`).

### 1.2 Sem duplicação / sem código morto
- [ ] **Nenhum componente/lógica duplicado criado.** Antes de escrever hero,
      form, container ou constante nova, verifiquei se já existe (ou deveria
      existir) fonte única a reutilizar.
- [ ] **Nenhum código morto/repetido introduzido** (CSS, JSX, const, import).
- [ ] Não deixei markup morto "escondido por CSS" (ex.: `display:none`) quando o
      certo era remover.
- [ ] Não criei um segundo `:root`, um segundo container, ou uma segunda cópia de
      `INSTAGRAM_URL`.

### 1.3 Responsividade
- [ ] **Desktop OK** (≥1280 e faixa intermediária 960–1024).
- [ ] **Tablet OK** (768).
- [ ] **Mobile OK** (375; conferir também ~360 e 320 se houver squeeze).
- [ ] Sem overflow horizontal; grids reorganizam em coluna; botões tocáveis.
- [ ] `node tests/responsive.mjs` (ou `npm run test:responsive`) passa sem
      overflow/quebra de header/menu nos 6 viewports.

### 1.4 Sem quebra visual
- [ ] Comparação antes/depois no preview institucional
      (`npm run dev` ou `*.vercel.app?preview=1`) — sem regressão nas páginas
      vizinhas ao que mudei.
- [ ] Heros das rotas tocadas continuam coerentes com a intenção aprovada
      (fundo/texto/contraste), não com uma sobrescrita acidental.
- [ ] **Home não foi alterada** sem solicitação explícita (§9). Se só movi
      constante para `src/data/`, confirmei que o layout ficou idêntico.
- [ ] Zona de segurança menu↔hero preservada (§4.1): conteúdo da hero não encosta
      no menu.

### 1.5 Build e qualidade
- [ ] **`npm run build` passa** (verde). Falhou → parar, mostrar erro, **não**
      commitar/push.
- [ ] **Lint / TypeScript:** o projeto **não tem** ESLint config nem `tsconfig`
      hoje — não há passo de lint/TS a rodar. **Se/quando** um for adicionado,
      rodar e exigir zero erros. (Marcar N/A enquanto não existir.)
- [ ] `dist` costuma travar pelo Dropbox → buildar em `dist_check --emptyOutDir`
      e depois remover, se necessário.

### 1.6 Imagens e assets
- [ ] **Imagens carregando** nas rotas tocadas (logos de header/footer, logos de
      edição/participante, fotos de combo, shapes).
- [ ] Logos/fotos com proporção preservada (`object-fit` correto), sem distorção,
      com `alt` adequado.
- [ ] Ausência de asset tratada com **fallback editorial claro** (§7/§8) — nunca
      área vazia nem imagem externa/hotlink.
- [ ] Se renomeei/movi pasta de asset (ex.: `logo edições/`), atualizei **todas**
      as referências e confirmei que nada quebrou (`grep` antes e depois).

### 1.7 Links, botões e navegação
- [ ] **Links e botões funcionando** nas rotas tocadas.
- [ ] Hash router respeitado; nenhuma rota nova quebra o roteamento existente.
- [ ] **Rotas de QR Code congeladas não alteradas** sem decisão explícita:
      `#/lovers/combos/:slug` e `#/lovers/awards` (regra de ouro; slugs em
      `src/data/participants.js`). Hoje elas redirecionam para a home
      (`App.jsx`) — só mexer se houver decisão registrada.
- [ ] Formulários: comportamento esperado confirmado (hoje copiam+abrem Instagram;
      não prometer backend que não existe).

### 1.8 Design system respeitado
- [ ] **Nenhuma cor nova.** Só a paleta oficial (creme, bege, rosa, amarelo,
      azul/ciano, coral/vermelho, marrom, vinho). **Sem roxo/verde/lavanda/cinza
      frio/preto puro.** Reutilizei variáveis CSS existentes (sem hex aleatório).
- [ ] `--page-accent` da rota é tom claro que contrasta com `--ink`
      (contraste texto ≥ 4.5:1 / WCAG AA).
- [ ] Margens seguem a Home (`.wrap` canônico, §4). Sem gutter/max-width
      divergente.
- [ ] **Sem stickers/doodles/blobs/eyebrow-kicker** nas páginas institucionais
      (§5/§6). Sem fonte mono em rótulos/labels institucionais — usar Nexa.
- [ ] **Sem elementos soltos sem função** (§5). Placeholders parecem parte do
      sistema (§8).
- [ ] Identidades **não misturadas**: estilos Lovers só em `src/pages/lovers/`
      (wrapper `.kv-lovers`); institucional só na paleta terracotta. Nunca cruzar.

### 1.9 Motion system respeitado
- [ ] Usei os tokens/escala de motion do sistema (`src/styles/motion-system.css`),
      **sem inventar durações novas** fora da escala.
- [ ] Reveal on scroll via `useRevealOnScroll` quando aplicável; efeitos que
      dependem de `animation-timeline: view()` têm **fallback** (Chrome-only não
      pode deixar Firefox/Safari sem reveal).
- [ ] Respeito a `prefers-reduced-motion` mantido.
- [ ] Não introduzi biblioteca de animação nova sem justificativa (`CLAUDE.md`).

### 1.10 Escopo, segurança e higiene
- [ ] Não alterei indevidamente `AWARDS_ONLY_PUBLICATION` nem
      `INSTITUTIONAL_PREVIEW` (`App.jsx`).
- [ ] Não li/exibi/versionei `.env`, secrets, tokens ou chaves.
- [ ] Usei `Edit` (não `Write`) em arquivos existentes, salvo reconstrução pedida.
- [ ] Vou commitar **só os arquivos da tarefa** (o repo pode ter WIP local não
      relacionado). Ação destrutiva (delete/reset/rename de asset pesado) só com
      confirmação.

---

## 2. Fluxo ao finalizar (após o checklist verde)

1. `npm run build` — verde. Falhou → parar, não commitar.
2. `git status` — conferir que só os arquivos da tarefa mudaram.
3. `git add <arquivos da tarefa>` + `git commit -m "tipo: descrição"`
   (`fix:` / `feat:` / `style:` / `chore:` / `docs:`).
4. `git push origin dev/site-completo`.
5. Produzir o **RESUMO final** (modelo abaixo).

> Nunca tocar `master`/`main`, nunca `vercel --prod`, nunca promover Preview para
> Production. O domínio oficial `sweetcoffeeweek.com.br` não pode ser afetado.

---

## 3. Modelo de RESUMO final (colar preenchido ao encerrar a tarefa)

```markdown
## Resumo da tarefa — <título curto>

### Arquivos alterados
- `caminho/arquivo-1` — <o que mudou nele, 1 linha>
- `caminho/arquivo-2` — <...>
- (novos: marcar com "(novo)"; renomeados: "antigo → novo")

### O que mudou (visão de produto/design)
<2–5 linhas: o efeito visível/estrutural. Se foi refactor sem mudança visual,
dizer explicitamente "sem mudança visual — consolidação de fonte única".>

### Como validar
- Build: `npm run build` → <ok / hash>
- Responsivo: `node tests/responsive.mjs` → <ok / notas>
- Preview: rotas conferidas → </edicoes, /participar, ...>
- Passos manuais: <o que abrir/clicar para ver o resultado>
- Commit: <hash + mensagem> · push: `dev/site-completo` <ok>
- Preview Vercel (se houver): <link ?preview=1>

### Riscos / pendências
- <regressões possíveis, itens que dependem de decisão do usuário,
  TODOs deixados, assets não confirmados, contraste a validar, etc.>
- <se nenhum: "Sem riscos identificados.">
```

---

## 4. Gatilhos que EXIGEM decisão do usuário antes de prosseguir

Não decidir sozinho nestes casos — parar e perguntar:

- [ ] Direção do hero institucional (chocolate `#381610` **vs** acento-claro) —
      há divergência entre código e `CLAUDE.md §3`.
- [ ] Rotas de QR Code (`#/lovers/*`) voltarem a funcionar ou seguirem
      redirecionando (regra de ouro de URLs estáveis).
- [ ] Deletar assets pesados (`fotos-combos-site/`, `adesivos-site/`) — confirmar
      antes; nunca apagar às cegas.
- [ ] Qualquer mudança de contraste/cor que altere o visual aprovado de uma hero.
- [ ] Qualquer alteração na Home (§9), na paleta oficial ou na separação
      Institucional × Lovers.

---

## 5. Como este arquivo evolui

Sempre que o usuário rejeitar algo, aprovar uma nova regra, ou uma etapa da
refatoração criar uma fonte única nova (`<Hero>`, `<Section>`, `tokens.css`,
`channels.js` etc.), **atualizar este checklist e o `CLAUDE.md`** — movendo itens
da coluna "ALVO (proposto)" para "ATUAL" na tabela do §0, para que o checklist
reflita a realidade do código.
