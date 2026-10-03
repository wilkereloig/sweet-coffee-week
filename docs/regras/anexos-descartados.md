<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

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
