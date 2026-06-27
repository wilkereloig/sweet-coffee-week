# SITE_DIRECTION.md — Direção institucional do Sweet & Coffee Week

> Memória técnica e editorial do padrão que está sendo construído na página
> **"O Festival"** (`src/pages/institutional/Home.jsx`). Este documento é a
> referência a consultar **antes** de propor ou executar mudanças nas demais
> páginas institucionais.
>
> Status: **em refinamento**. A Home ainda não está aprovada. As regras aqui
> evoluem junto com ela. Nada deve ser replicado para outras páginas sem
> aprovação explícita.

---

## 1. Papel da página "O Festival"

- É a **página-mãe** do sistema institucional do Sweet & Coffee Week.
- Não é uma Home isolada: define a **direção visual, editorial e estrutural**
  que depois orienta Edições, Curiosidades, Participar, Apoiar e Contato.
- É o **laboratório principal**. Ajustes minuciosos feitos nela viram **regras
  reutilizáveis** para as próximas telas.
- Ao revisar ou criar qualquer outra página institucional, a referência de
  ritmo, hierarquia e clareza é esta página.

---

## 2. Princípios de estrutura

Lógica de construção da Home, de cima para baixo:

- **Hero forte e editorial** — abertura com presença, não banner de campanha.
- **Introdução clara** sobre o que é o festival, logo após o hero.
- **Blocos explicativos** com hierarquia simples e legível.
- **Seções que combinam texto curto + presença visual** (foto/colagem real).
- **Números** usados para reforçar relevância e escala.
- **Fechamento institucional** com a realização (F2 Experience).
- **Navegação para outras áreas** integrada ao todo — sem parecer promoção
  isolada de combos.

---

## 3. Princípios de texto

Regras de linguagem:

- Tom **institucional, mas caloroso**.
- Evitar texto **burocrático**.
- Evitar **excesso de explicação**.
- Frases **claras, diretas e com ritmo**.
- Comunicar o festival como **experiência de cidade**, não apenas promoção de
  combos.
- Preferir **"avaliam"** em vez de "votam".
- Usar **"Sweet Lovers"** como a comunidade / o público do festival.
- Evitar repetir em sequência as mesmas palavras, especialmente:
  *experiência, cidade, rota, memória, marcas*.
- Manter **"Sweet & Coffee Week"** como grafia oficial.

### Grafias oficiais (não variar)

- Festival: **Sweet & Coffee Week**
- Edição Lovers: **Sweet & Coffee Week Lovers**
- Premiação: **Sweet & Coffee Week Awards** (referida como **Sweet Awards** no
  uso editorial corrente)

Variações incorretas a evitar: "Sweet Coffee Week", "Sweet Coffee",
"Sweet Coffee Awards", "Sweet & Coffee Lovers", "Sweet Coffee Lovers".

---

## 4. Princípios de narrativa

Narrativa central do festival, na ordem:

1. O Sweet & Coffee Week nasce de um **tema**.
2. O tema **inspira os participantes**.
3. Os participantes criam **combos e experiências**.
4. O público **circula pela cidade**.
5. A edição gera **conteúdo, descoberta e memória**.
6. O **Sweet Awards** reconhece os destaques a partir da **avaliação do
   público**.
7. A **F2 Experience** realiza e organiza essa plataforma.

---

## 5. Princípios de componentes / seções

Padrões que a Home está consolidando (vocabulário de seções reutilizável):

- **Hero institucional** — abertura editorial.
- **Bloco "o que é"** — introdução do festival.
- **Cards numerados / processuais** — passos da narrativa.
- **Blocos de números** — escala e relevância.
- **Cards de pilares / impacto** — valor institucional.
- **Seção de realização** — F2 Experience.
- **CTAs institucionais** — encaminham para outras áreas.
- **Colagens / fotos reais** — apoio editorial e prova de cidade.

---

## 6. Regras para futuras páginas

Ao criar ou revisar Edições, Curiosidades, Participar, Apoiar, Contato:

- **Não copiar literalmente** a Home.
- Usar a Home como **referência de ritmo, hierarquia e clareza**.
- **Reutilizar padrões de seção** quando fizer sentido.
- Evitar criar estilos muito diferentes **sem necessidade**.
- Manter **consistência** entre títulos, textos de apoio, cards, CTAs e
  fechamentos.
- Cada página tem **função clara**:

| Página | Função |
|---|---|
| **Edições** | Memória e linha do tempo. |
| **Curiosidades** | Acervo, dados e bastidores. |
| **Participar** | Entrada para marcas participantes. |
| **Apoiar** | Entrada para patrocinadores e parceiros. |
| **Contato** | Canais e encaminhamentos. |
| **Sweet Awards** | Premiação institucional e resultados. |

---

## 7. O que NÃO fazer

- Não transformar cada página em uma **estética diferente**.
- Não criar **componentes redundantes** se o padrão já existe na Home.
- Não **duplicar textos**.
- Não usar **"votação"** como termo principal quando o contexto for avaliação
  do público.
- Não mexer na página **Sweet Awards** publicada nesta etapa.
- Não desligar **`AWARDS_ONLY_PUBLICATION`** (mantém `true`).
- Não **liberar outras rotas** ainda.

---

## 8. Próximos passos

- A Home ainda está em **refinamento**.
- As regras deste documento **podem ser atualizadas** conforme os ajustes
  finais forem definidos.
- Só **depois da aprovação da Home** essas regras devem ser aplicadas nas
  outras páginas.
- Antes de replicar para outras páginas, **revisar este `SITE_DIRECTION.md`**.

---

## 9. Sistema de layout & responsividade (pente fino da Home)

Regras medidas e validadas na Home — base para as próximas páginas.

### Container & gutters

- Container padrão: **`.wrap`** → `max-width: var(--maxw)` (**1280px**), centrado.
- Gutter lateral do conteúdo no contexto `.hm`: **`--hm-gutter`** =
  `clamp(28px, 11.5vw, 150px)` (~147px no desktop largo). **Todas** as seções de
  conteúdo (números, "o que é", processo, realização) compartilham o mesmo
  inset → margens laterais consistentes.
- O **hero** é exceção intencional: bloco centrado, `max-width: 920px`, padding
  próprio `clamp(24px,6vw,64px)`. Não alinha ao gutter das seções porque é
  full-bleed centrado — não replicar esse paradigma em seções normais.
- Header (route-home, desktop ≥960) segue o **mesmo grid do conteúdo**:
  `max-width: none` + `padding-inline: var(--hm-gutter)`. Logo encosta no gutter
  esquerdo, menu no direito — alinhados às bordas dos cards/títulos. O `.nav-cta`
  (hambúrguer, oculto no desktop) é `display:none` para o menu encostar no gutter
  direito sem sobra de `gap`.

### Ritmo vertical entre seções

- Padrão único: **`.section`** = `padding-block: clamp(56px, 9vw, 128px)`.
- Bandas de cor (números, processo) usam o **mesmo** ritmo `.section` — não criar
  padding vertical custom por seção sem intenção clara (evita bandas com alturas
  diferentes).

### Grids & breakpoints

| Faixa | Nav | Números | "O que é" | Processo (steps) |
|---|---|---|---|---|
| Desktop ≥1024 | horizontal | 4 col | 2 col | auto-fit (4–6) |
| Tablet ~768 | hambúrguer (<960) | 4 col | 1 col | 3 col |
| Mobile ≤480 | hambúrguer | 1 col | 1 col | 1 col |

- Steps: `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))` — quebra
  sozinho conforme a largura. Cards mantêm altura/padding iguais via flex-column.
- Menu colapsa para hambúrguer em **< 960px** (`.nav-main { display:none }`).
- `overflow-x: clip` no `.hm` contém os elementos decorativos com posição
  negativa (splat). **Sem overflow horizontal** em nenhuma faixa testada
  (1440 / 1024 / 768 / 414 / 360).

### Comportamento de cards (padrão consolidado)

- `display: flex; flex-direction: column` + `min-height` + `gap` interno → todos
  os cards de uma seção têm a **mesma altura** e espaçamento previsível.
- Padding interno consistente; texto secundário nunca encosta nas bordas.
- Tipografia fluida com **container queries** (`cqi`) onde o card precisa escalar
  pela própria largura (números, steps) — atenção: `cqi` escala pela largura do
  card, não pelo comprimento do texto; limitar o teto do `clamp` quando o
  conteúdo for longo (ex.: `+R$ 712 mil`), sem aumentar só um card.

### Cuidados para mobile

- Hero reserva topo (`padding-top: clamp(120px,30vw,150px)`) para não colidir com
  o header fixo.
- Largura de leitura confortável: textos com `max-width` em `ch` (52–60ch).
- Garantir margem lateral mínima em telas pequenas (gutter mínimo `28px`).

---

_Fonte de verdade da Home: `src/pages/institutional/Home.jsx`._
_Atualizar este documento sempre que o padrão da Home mudar._
