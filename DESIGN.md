# Sweet & Coffee Week — Design System (v2 · handoff Claude Design)

Festival gastronômico de Natal/RN. Linguagem de **campanha editorial gastronômica**:
papel creme, tinta chocolate e quatro acentos pop (coral, pink, cyan, amarelo). Estética
**sticker-forward** — recortes orgânicos, selo da marca, tipografia de cartaz. Nunca
institucional-genérico nem cara de template/IA.

**Register:** brand (o design É o produto). **Stack:** Vite + React (JSX), hash router,
tokens em `src/styles/swc-redesign.css` (`:root`), fontes self-hosted.

---

## 1. Cor

Tokens canônicos no `:root` de `src/styles/swc-redesign.css`. Pontes `--swc-*` e legados
(`--bg`, `--ink`, `--accent`…) mapeiam pro v2.

### Papel / tinta (base — domina, ~80%)
| Token | Hex | Uso |
|---|---|---|
| `--cream` | `#FFF1E6` | fundo da página |
| `--cream-deep` | `#FBE6D2` | seção alternada |
| `--cream-card` | `#FFF8F0` | superfície de card elevado |
| `--paper-line` | `#EAD7C4` | hairline sobre creme |
| `--choco` | `#3A2114` | painel escuro / banda hero |
| `--choco-deep` / `--ink` | `#2B1810` | tinta / texto padrão |
| `--ink-soft` | `#6B4A38` | texto secundário |
| `--ink-mute` | `#A6856F` | labels/captions |

### Acentos pop (energia — pontuais, ~20%)
| Token | Hex | `-deep` (pressed) | Uso |
|---|---|---|---|
| `--coral` | `#E8553A` | `#C13E25` | **accent primário**, botões/energia |
| `--pink` | `#F2548A` | `#D63648` | **"doce"**, destaque quente |
| `--cyan` | `#2BC4E8` | `#149FC0` | secundário, item de menu ativo, focus ring |
| `--yellow` | `#F8B511` | `#D9960A` | botão principal, marcador do menu |
| `--peach` | `#F2B6A0` | — | tint quente |

**Texto sobre acento:** `--on-coral` #FFF1E6 · `--on-pink` #2B1810 · `--on-cyan` #FFF · `--on-yellow` #2B1810 · `--on-choco` #FFF1E6.
**Proporção:** ~80% creme+chocolate · ~20% acentos. Contraste corpo ≥ 4.5:1 (usar os `--on-*`).

---

## 2. Tipografia

Uma família proprietária carrega tudo: **Nexa Slab** (self-hosted, `public/fonts/nexa-slab/`,
@font-face em `src/styles/fonts-nexa-slab.css`). Mono só p/ eyebrow.

| Token | Família | Papel |
|---|---|---|
| `--font-display` | `Nexa Slab Black`, Nexa Slab | headlines de campanha (peso 900) |
| `--font-heading` | `Nexa Slab` | títulos de seção/card |
| `--font-body` | `Nexa Slab` | parágrafos, UI |
| `--font-mono` | `JetBrains Mono` | eyebrows / meta |

Legados `--font-serif`/`--font-sans` → mapeados p/ Nexa Slab.
**Escala (clamp):** `--fs-display-xl/lg/md`, `--fs-h1` clamp(34,4vw,56) … `--fs-eyebrow` 13px.
**Line-height:** display 0.88 / tight 0.95 / snug 1.18 / body 1.65. **Tracking:** display -0.04em / tight -0.02em / eyebrow 0.16em. Títulos com `text-wrap: balance`.

---

## 3. Tokens de forma / efeito / motion

- **Raios:** `--r-sm` 8 · `--r-md` 14 (chip) · `--r-lg` 22 (card) · `--r-xl` 32 (feature) · `--r-pill` 999 (botão/tag).
- **Sombras:** `--shadow-sm` `0 2px 8px` · `--shadow-md` `0 14px 36px` · `--shadow-lg` `0 24px 70px` · `--shadow-pop` `0 6px 0` (drop chunky de sticker). Todas em rgba(43,24,16).
- **Motion:** `--ease-pop` `cubic-bezier(.34,1.56,.64,1)` (bouncy, intencional) · `--ease-out` `cubic-bezier(.22,.61,.36,1)`; dur 140/240/420ms.
- **Focus:** `--ring` = `--cyan-deep`; `:focus-visible { outline:3px solid var(--ring); offset:3px }`.
- **Selo da marca:** `--mask-badge` (data-URI SVG da silhueta escalopada) — aplicar como `mask` p/ recortar imagem/bloco no formato do selo (**PhotoBadge**).
- **Espaço/layout:** escala 4px (`--sp-*`), `--sp-section` clamp(56,8vw,120), `--wrap-max` 1200, `--wrap-pad` clamp(20,5vw,64).

---

## 4. Componentes (do handoff)

Todos aceitam `variant`/`accent` da paleta pop (default em parênteses).
- **Button** — pill sticker. variant(coral)·size sm/md/lg·uppercase·outline·fullWidth. Flat em repouso; hover escurece p/ `-deep` + lift 1px + `--shadow-sm`; focus-visible ring.
- **Sticker** — chip mono-caps girado. variant(pink)·rotate(-3)·shadow. Mono 12px, `0.1em`, `--r-md`.
- **Card** — card editorial elevado. eyebrow·title·body·accent(coral) top-rail|none·badge·dark. Surface `--cream-card`, `--r-lg`, `--shadow-md`, 1px `--paper-line`. Dark = chocolate + texto creme.
- **FeatureTag** — bloco sticker colorido com badge de canto. variant(pink) fill·badge(choco) chip·rotate(0). Min 210×128, `--r-lg`, `--shadow-md`, título 24/800.
- **SideNav** — sidebar fixa. items·logoSrc·width(280). Ativo `--cyan-deep` + seta amarela (shape da marca); hover coral. Mobile = top bar/drawer.
- **SectionHeader** — intro de seção. eyebrow (dot+label)·title·lead·align(left)·dark. Título `--fs-h1`/800/`--ls-tight`. **Não repetir eyebrow em toda seção.**
- **StepCard** — card de processo numerado. number("01")·title·body·accent(coral). Numeral display 56px/900.
- **StatBlock** — métrica grande. value·label·accent(coral) top-rule 3px·dark. Value `--font-display` 900, clamp(40,5vw,60).
- **PhotoBadge** — imagem recortada na silhueta do selo via `--mask-badge`. src·size(100%, 1:1).

---

## 5. Home (exemplo de referência)

Shell duas colunas: **SideNav fixa** (creme, logo no topo) + conteúdo rolando. Container único
(max 1200px, padding fluido). Fundos alternam: cream → cream-deep → cream → **banda chocolate** → cream → cream-deep.

1. **Abertura (hero)** — kicker itálico com barra amarela; headline "O festival mais **doce** de Natal." ("doce" em pink); 2 parágrafos; 2 CTAs pill (amarelo + cyan) no canto inferior direito; **PhotoBadge** grande à direita sangrando p/ a seção 2. Camadas: shapes → foto → texto/controles.
2. **O que é** — SectionHeader + faixa de 3 fotos, cada uma com **FeatureTag** sobreposto (combos exclusivos / tema da edição / 11 dias).
3. **Como funciona** — SectionHeader + 4 **StepCard** (01–04, coral/pink/cyan/yellow).
4. **Números** (banda chocolate) — SectionHeader dark + 4 **StatBlock** (16 · +34 mil · +R$ 712 mil · +10 mi).
5. **Por que importa** — SectionHeader + 4 **Card** com top-rail de acento.
6. **Realização** — heading + parágrafo F2 + Button.

---

## 6. Voz & grafias

Voz gastronômica, afetiva, urbana, de comunidade (memória de Natal/RN).
**Grafias oficiais (obrigatório):** Sweet & Coffee Week · SWC · Sweet Awards · Sweet Lovers · Sweet & Coffee Week Lovers. Nunca "Sweet Coffee Week", "Sweet" sozinho. Premiação tem a categoria **"Encantamento em Loja"** (nunca "Envolvimento").

---

## 7. Acessibilidade

Contraste ≥ 4.5:1 (usar `--on-*`); `prefers-reduced-motion: reduce` obrigatório em toda
animação; `:focus-visible` ring cyan; `alt` em imagens, `aria-hidden` em decorativos; alvos
de toque confortáveis no mobile.

---

## 8. Faça / Não faça

**Faça:** foto real grande (PhotoBadge no hero); recortes orgânicos + selo; tipografia de
cartaz; 4 acentos pontuais; sombra sticker; movimento com intenção; mobile desenhado.
**Não faça:** template; cards todos iguais; eyebrow em toda seção; numeração como scaffold
em tudo; acento dominando; placeholder no lugar de foto; gradient-text; glassmorphism;
side-stripe borders; misturar identidade Lovers (burgundy/Sofia Pro) no institucional.

---

## 9. Onde vive no código

```
src/styles/swc-redesign.css      # tokens v2 (:root) + pontes + sidebar + botões + reveal
src/styles/fonts-nexa-slab.css   # @font-face Nexa Slab (+ alias Nexa Slab Black)
src/components/nav.jsx           # SideNav + header + drawer mobile
src/components/placeholders.jsx  # PhotoEditorial (foto real / gradiente)
src/data/comboPhotos.js          # pool de fotos reais de combos
src/pages/institutional/         # Home, Edicoes, Curiosidades, Participar, Apoiar, Contato, Agradecimento (Sweet Awards)
public/images/shapes/            # shapes da marca (.svg) — star, flower, badge, arrow, splat, wave
public/fonts/nexa-slab/          # Nexa Slab woff2 (Thin→Black)
```

Origem dos tokens: handoff "Sweet & Coffee Week Design System" (Claude Design). Identidade
Lovers (`src/pages/lovers/`, `lovers-system.css`) é sistema separado — **nunca misturar**.
