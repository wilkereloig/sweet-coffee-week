# Sweet & Coffee Week — Regras do Projeto

## Fluxo padrão para qualquer ajuste importante

### Antes de alterar

1. Ler `CODE_REVIEW_GRAPH.md`.
2. Confirmar branch: `git branch --show-current`
3. Só continuar se branch for **`dev/lovers-internal-pages`**.
   - Se estiver em `master`, `main` ou outra branch: **parar e avisar. Não continuar.**
4. Nunca alterar `master/main`. Nunca publicar produção. Nunca fazer merge. Nunca usar `vercel --prod`. Nunca promover Preview para Production.

### Durante a tarefa

- Fazer apenas as alterações solicitadas.
- Não alterar rotas, slugs, URLs de QR Codes, configuração de deploy ou arquivos fora do escopo sem autorização.

### Ao finalizar — fluxo obrigatório

1. **Build local:**
   ```
   npm run build
   ```
   - Falhou → parar, mostrar erro, não commitar, não fazer push, não atualizar Vercel.

2. **Verificar alterações:**
   ```
   git status
   ```

3. **Commit:**
   ```
   git add .
   git commit -m "tipo: descrição curta"
   ```
   Tipos aceitos: `fix:` / `feat:` / `style:` / `chore:` / `docs:`

4. **Push para branch de desenvolvimento:**
   ```
   git push origin dev/lovers-internal-pages
   ```

5. **Verificar deployments Vercel (se CLI disponível):**
   ```
   vercel ls
   ```
   - Se pedir escopo/team, informar que o usuário deve conferir pelo painel da Vercel.

6. **Responder ao usuário confirmando:**
   - Build: passou ou falhou
   - Commit: hash + mensagem
   - Push: feito para `dev/lovers-internal-pages`
   - Preview Deployment: detectado via CLI ou aguardando geração automática pela Vercel
   - Link de preview: informar se aparecer no terminal; caso contrário, orientar a abrir o painel da Vercel

### Regras absolutas de proteção

- Nunca atualizar produção.
- Nunca usar `vercel --prod`.
- Nunca fazer merge para `master/main` sem autorização explícita.
- O site oficial em `sweetcoffeeweek.com.br` não deve ser afetado por nenhuma dessas operações.

---

## URLs estáveis para QR Codes — REGRA PERMANENTE

URLs públicas dos QR Codes da edição Sweet & Coffee Week Lovers **NÃO podem mudar** depois de definidas.

Padrões fixos:
- Combo: `https://www.sweetcoffeeweek.com.br/#/lovers/combos/{slug-do-participante}`
- Premiação: `https://www.sweetcoffeeweek.com.br/#/lovers/awards`

Regras:
- Nunca alterar rota `#/lovers/combos/:slug` nem `#/lovers/awards`.
- Slug do combo = slug do participante (mesmo que o nome do combo mude).
- Não renomear slugs já definidos em `src/data/participants.js`.
- Não trocar hash routing por path routing.
- Mudança em URL/rota/slug exige parar e avisar antes — nunca automático.

Detalhamento completo e lista dos 21 slugs congelados: ver seção 9 de `CODE_REVIEW_GRAPH.md`.

## Grafias oficiais da marca

- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet & Coffee Week Awards**

Variações incorretas a evitar: "Sweet Coffee Week", "Sweet Coffee", "Sweet Coffee Awards", "Sweet & Coffee Lovers", "Sweet Coffee Lovers".

## Escopo de edição

- Listar os arquivos que serão modificados **antes** de editar qualquer coisa.
- Alterar apenas os arquivos diretamente relacionados ao pedido.
- Nunca refatorar o projeto inteiro nem reescrever arquivos completos sem necessidade explícita.
- Usar `Edit` (não `Write`) para alterações em arquivos existentes.
- Resumo curto após cada conjunto de edições.

## Duas identidades visuais — nunca misturar

### Institucional
- Páginas: `src/pages/institutional/` (Home, Curiosidades, Edições, Participar, Apoiar, Contato)
- Sistema vigente: `src/styles/swc-redesign.css` (paleta v2 creme/chocolate + acentos coral/rosa/ciano/amarelo; Nexa Slab). Ver **Regras de layout institucional** abaixo.
- Tokens semânticos compatíveis: `--bg`, `--ink`, `--accent`, `--peach` seguem válidos (mapeados para a paleta v2).

### Edição Lovers
- Páginas: `src/pages/lovers/` (Hub, Combos, Mapa, Awards)
- Paleta: cream, vermelho lovers (`--lovers-red`), burgundy, pink, yellow
- Tipografia: Sofia Pro Comp (`sofia-pro-comp`) via Typekit + fallbacks
- Wrapper obrigatório: classe `.kv-lovers` em todas as páginas Lovers
- Fontes via CSS custom properties: `--font-lovers-display`, `--font-lovers-body`

Nunca aplicar estilos Lovers em páginas Institucionais nem vice-versa, a menos que explicitamente pedido.

## Regras de layout institucional

O sistema visual institucional vigente está em `src/styles/swc-redesign.css` (carregado por último em `src/main.jsx`, vence o cascade). É a fonte de verdade para tokens, tipografia, paleta e formas da marca nas páginas institucionais. As páginas (`src/pages/institutional/`) trazem o markup + um bloco `<style>` próprio com as classes específicas de cada página.

### Sistema único — não duplicar tokens
- Paleta de campanha (v2): papel creme (`--cream`, `--cream-deep`, `--cream-card`), tinta chocolate (`--choco`, `--choco-deep`) e 4 acentos pop — coral (`--coral`), rosa/doce (`--pink`), ciano (`--cyan`), amarelo (`--yellow`). Pontes `--swc-coral/--swc-cyan/--swc-yellow/--swc-chocolate/--swc-coffee/--swc-cream` são usadas nas páginas.
- Tipografia institucional: **Nexa Slab** (`--font-display`, `--font-heading`, `--font-body`); mono só no eyebrow.
- Tokens de layout já existentes — **reutilizar, não recriar**: largura/recuo do conteúdo via `.wrap` (`--maxw`/`--pad`) e, na Home, `--hm-gutter`/`--hm-content-max`; ritmo vertical entre seções via `--sp-section`/`.section`; sombras quentes via `--shadow-sm/md/lg` (sempre `rgba(43,24,16,…)`, nunca preto puro `rgba(0,0,0,…)`); raios `--r-*`.

### Margem de segurança do header / hero
- Desktop (≥960px): sidebar fixa (`--sidebar-w`), sem header no topo — `main` recebe `margin-left`. Mobile/tablet (<960px): header `sticky` (em fluxo), o conteúdo já começa abaixo dele.
- Toda hero interna usa recuo de topo padrão `padding: clamp(54px, 8vw, 112px) 0 …` e container `.wrap`. Conteúdo (título, foto, cards, botões) nunca invade o header. Resolver respiro de hero de forma estrutural (padding da seção), nunca com `margin-top` solto.
- Seções que carregam formas decorativas posicionadas (`position: absolute`) devem ser `position: relative; overflow: hidden;` para evitar overflow horizontal no mobile.

### Formas da marca x stickers
- As formas orgânicas (`/images/shapes/shape-*.svg`: arrow-yellow, flower-coral, star-cyan, badge-choco, splat-coral) são **linguagem oficial da marca**, aplicadas de forma sistemática (peek nos cantos, `aria-hidden`, `pointer-events: none`, dentro de seção com `overflow: hidden`). Mantê-las.
- O que é proibido: stickers/doodles/blobs aleatórios fora desse sistema, ornamentos sem função, ícones decorativos soltos que competem com texto ou foto. Todo elemento visual deve organizar, hierarquizar, conduzir leitura ou destacar dado/foto/logo.

### Paleta
- Usar apenas a paleta v2 acima (creme, bege, rosa, amarelo, ciano, coral/vermelho, marrom, vinho nos contextos Lovers). Não criar cores novas, não usar roxo/verde/cinza frio nem preto puro sem necessidade.

### Áreas de foto, placeholders e logos
- Usar `PhotoEditorial`/`.media-ph*` como áreas de foto editoriais; sempre `alt` e `onError` de fallback. Placeholder deve parecer parte do design, não erro técnico (ex.: "Foto pendente", "Galeria pendente").
- Logos reais com `object-fit: contain`, limite de altura e `alt`. Não inventar logo nem hotlinkar imagem externa.

### Texto e nomenclatura
- Não usar "Sweet" sozinho para falar do festival. Usar **Sweet & Coffee Week**, **SCW** (após apresentar o nome), "o festival", "a edição", "o evento". Evitar "o Sweet", "do Sweet", "história do Sweet", "Sweet na mídia".
- Nomes oficiais preservados: **Sweet Awards**, **Sweet Lovers**, **Sweet & Coffee Week Lovers**.
- Priorizar clareza, objetividade e tom afetivo institucional; menos repetição.

### CTAs e formulários
- Cada página tem uma ação principal clara. Em **Participar** e **Apoiar**, o formulário é o objetivo principal: manter em destaque, com CTA da hero ancorando até ele (`#form-participar` / `#form-apoiar`), labels claros e botão evidente.

### Referência
- **Home / O Festival** é a página de referência do sistema. Não reconstruí-la nem alterá-la profundamente — apenas pequenos ajustes (desalinhamentos, margem, sombras quentes, texto repetido).

## Estrutura do projeto

```
src/
  components/     # nav.jsx, footer.jsx, icons.jsx, placeholders.jsx
  pages/
    institutional/
    lovers/
  data/           # editions.js, partners.js
  styles.css      # estilos globais — editar com cuidado
  App.jsx
  router.js
  theme.js
public/
  images/         # logo e imagens estáticas
```

## Stack

- Vite + React (JSX)
- Hash router customizado (`useRoute` em `src/router.js`)
- Adobe Fonts / Typekit: `https://use.typekit.net/kgh7res.css`
- Google Fonts: Instrument Serif, DM Sans, Caveat, Caprasimo, JetBrains Mono
- Dev server: `npm run dev` → `localhost:5173`

## Variáveis CSS relevantes

```css
--font-lovers-display: 'sofia-pro-comp', 'Caprasimo', serif;
--font-lovers-body:    'sofia-pro-comp', 'DM Sans', sans-serif;
--lovers-red:    #D63648;
--lovers-cream:  #FFF1E6;
--accent:        #E8553A;
--ink:           #2B1810;
```

---

## Princípio principal

O repositório é a fonte da verdade.

Antes de pedir mais contexto ao usuário, procure contexto nos arquivos do projeto, no README, em docs/, nas issues, nos commits e nos arquivos de configuração existentes.

Não peça explicações que possam ser inferidas com segurança a partir do repositório.

---

## Economia de tokens

1. Leia apenas os arquivos necessários para a tarefa atual.
2. Não escaneie o repositório inteiro sem motivo claro.
3. Não abra arquivos grandes se bastar localizar símbolos, imports, rotas ou trechos específicos.
4. Prefira comandos objetivos como git diff, git status, grep, rg, npm scripts e ferramentas de análise disponíveis.
5. Não repita no chat grandes trechos de código se um resumo e uma lista de arquivos alterados forem suficientes.
6. Se a sessão estiver longa, use compactação focada em:
   - decisões tomadas;
   - arquivos alterados;
   - problemas encontrados;
   - validações executadas;
   - próximos passos.
7. Quando mudar para uma tarefa não relacionada, recomende limpar ou compactar o contexto antes de continuar.
8. Prefira usar documentos do projeto em vez de pedir que o usuário cole contexto manualmente.

---

## Uso de ferramentas, plugins, skills, MCPs e integrações

Sempre que houver uma ferramenta, plugin, skill, MCP, servidor de linguagem, comando CLI ou integração disponível que ajude a resolver melhor o pedido, use automaticamente a opção mais adequada.

Use esses recursos de forma proativa para:

- localizar arquivos relevantes;
- entender a arquitetura;
- navegar por símbolos e definições;
- revisar código;
- revisar pull requests;
- analisar issues;
- gerar ou revisar testes;
- validar build, lint e typecheck;
- investigar bugs;
- consultar documentação;
- analisar performance;
- revisar acessibilidade;
- revisar SEO;
- organizar commits e PRs;
- automatizar tarefas repetitivas.

Você não precisa pedir autorização para usar ferramentas de leitura, busca, análise, validação, revisão ou diagnóstico.

Peça confirmação antes de ações destrutivas ou sensíveis, como:

- apagar arquivos importantes;
- resetar branch;
- fazer force push;
- alterar histórico do Git;
- modificar secrets;
- mexer em .env;
- publicar deploy;
- remover dependências principais;
- alterar configuração de produção.

Se uma ferramenta, plugin ou skill falhar, explique brevemente a falha e continue com a melhor alternativa possível.

Nunca finja ter usado uma ferramenta.

---

## Git e GitHub

Use GitHub como sistema de organização do trabalho.

Quando a tarefa for relevante, siga este fluxo:

1. Identifique ou sugira uma issue.
2. Crie ou sugira uma branch específica.
3. Faça mudanças pequenas e focadas.
4. Mostre os arquivos alterados.
5. Rode validações disponíveis.
6. Sugira uma mensagem de commit.
7. Sugira descrição de pull request.

Nunca trabalhe diretamente na branch principal sem necessidade.

Prefira nomes de branch como:

- feat/melhorar-home
- feat/nova-secao-contato
- fix/menu-mobile
- fix/seo-home
- refactor/componentes-home
- chore/organizar-assets
- docs/atualizar-readme

Commits devem ser pequenos, claros e reversíveis.

Mensagens de commit devem explicar a mudança de forma objetiva.

---

## Escopo das alterações

Antes de editar, defina mentalmente o menor escopo possível.

Evite alterações amplas quando uma mudança pontual resolver.

Não altere arquivos fora do escopo sem explicar o motivo.

Se encontrar problemas fora do pedido, registre como recomendação, mas não corrija automaticamente, a menos que seja pequeno, seguro e diretamente relacionado.

---

## Qualidade de código

Ao modificar código:

1. Preserve o padrão existente do projeto.
2. Prefira legibilidade e manutenção.
3. Evite complexidade desnecessária.
4. Remova duplicação quando fizer sentido.
5. Preserve tipagem.
6. Preserve acessibilidade.
7. Preserve responsividade.
8. Evite dependências novas sem justificativa forte.
9. Não quebre APIs, props, rotas ou contratos existentes sem explicar.
10. Não reescreva arquivos inteiros se uma alteração local resolver.

---

## Design e interface

Ao melhorar UI:

1. Preserve a identidade visual existente.
2. Melhore hierarquia, ritmo, espaçamento e clareza.
3. Priorize mobile first.
4. Garanta contraste e leitura.
5. Evite poluição visual.
6. Evite efeitos desnecessários.
7. Prefira componentes reutilizáveis.
8. Não altere textos estratégicos, tom de voz ou identidade sem necessidade clara.

---

## SEO, performance e acessibilidade

Quando relevante, verifique:

- title;
- meta description;
- heading structure;
- texto alternativo de imagens;
- semântica HTML;
- performance de imagens;
- scripts desnecessários;
- navegação por teclado;
- responsividade;
- links quebrados;
- conteúdo duplicado.

---

## Validação

Sempre que possível, rode os comandos disponíveis no projeto, como:

- npm run lint
- npm run build
- npm run test
- npm run typecheck
- pnpm lint
- pnpm build
- pnpm test

Antes de rodar comandos, verifique package.json para entender quais scripts existem.

Se não for possível validar, explique por quê.

---

## Segurança

Não leia, exiba, altere ou versione:

- .env
- .env.local
- secrets
- tokens
- chaves privadas
- credenciais
- arquivos de produção sensíveis

Se precisar confirmar uma variável de ambiente, peça ao usuário para verificar localmente sem revelar o valor.

---

## Formato de resposta ao finalizar uma tarefa

Use este formato:

Resumo:
- O que foi feito.

Arquivos alterados:
- arquivo 1
- arquivo 2

Validação:
- comando executado;
- resultado;
- ou motivo pelo qual não foi possível validar.

Riscos ou observações:
- pontos de atenção;
- possíveis impactos;
- melhorias futuras.

Commit sugerido:
- mensagem de commit objetiva.

Pull request sugerido:
- título;
- resumo;
- checklist.
