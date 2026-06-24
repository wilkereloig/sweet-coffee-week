# Sweet & Coffee Week — Design System

Festival gastronômico de Natal/RN. Site institucional + edições temáticas, premiação
(**Sweet Awards**) e comunidade (**Sweet Lovers**). A linguagem visual é uma **campanha
editorial gastronômica**: ousada, pop, afetiva e proprietária — nunca institucional-genérico
nem cara de template/IA.

**Register:** brand (o design É o produto).
**Stack:** Vite + React (JSX), hash router custom, CSS global + `<style>` por página.

---

## 1. Cor

Sistema em dois níveis. Os tokens vivem em `src/styles/swc-redesign.css` (`:root`) e
reskinam os tokens institucionais (`--bg`, `--ink`, `--accent`…).

### Paleta principal (base — domina o site)
| Token | Hex | Uso |
|---|---|---|
| `--swc-chocolate` | `#381610` | Fundos de impacto, títulos escuros, texto sobre áreas claras, hero, cards premium |
| `--swc-coffee` | `#6A2C15` | Detalhes gráficos, sombras quentes, shapes, hover de menu, divisórias |
| `--swc-cream` | `#FEF0DD` | Fundo geral do site, sidebar, áreas de respiro |
| `--swc-cream-2` | `#F8E4C1` | Seções alternadas, cards claros, blocos editoriais |

### Acentos (energia — entram pontuais, nunca como base)
| Token | Hex | Uso |
|---|---|---|
| `--swc-coral` | `#F65D74` | Palavra de destaque no título, blobs, selos, acentos de premiação |
| `--swc-yellow` | `#FDBB1A` | Botão principal (texto chocolate), marcador do menu ativo, sublinhados |
| `--swc-cyan` | `#01AFCC` | Botão secundário, item de menu ativo, labels de navegação |

### Regra de proporção (obrigatória)
- **70%** cremes + marrons
- **20%** chocolate / marrom escuro
- **10%** acentos (coral, amarelo, cyan)

Acentos nunca tomam conta da tela. Contraste de corpo de texto ≥ 4.5:1 (não usar cinza
claro "por elegância" sobre creme).

---

## 2. Tipografia

Pareamento por **contraste de eixo** (slab + sans). Nunca duas sans parecidas.

| Papel | Família | Notas |
|---|---|---|
| Display / títulos / menu / CTAs / números | **Nexa Slab** (`--swc-font-display`) | Self-hosted em `public/fonts/nexa-slab/`. Pesos 700–900. `line-height` ~0.9, `letter-spacing` -0.02 a -0.045em. Menu em **caixa baixa** por direção visual. |
| Corpo / formulários / microcopy | **DM Sans** (`--swc-font-body`) | Google Fonts. `line-height` 1.55–1.7. |

- Títulos com presença de cartaz, quebras expressivas, `text-wrap: balance`.
- Teto de display ~96px (clamp max). Comprimento de linha de corpo 65–75ch.

---

## 3. Layout & estrutura

- **Sidebar fixa creme** à esquerda (260–300px, `--sidebar-w: 284px`): logo grande no topo,
  menu vertical slab lowercase, crédito F2 no rodapé. Item ativo em **cyan + marcador
  amarelo** (shape da marca). No mobile: vira header + drawer fullscreen creme.
- **Hero editorial:** bloco chocolate + foto gastronômica grande à direita, **recorte
  orgânico** (`clip-path`) entre os dois, **onda creme** na transição p/ a próxima seção,
  palavra de destaque em coral, CTAs amarelo + cyan.
- Layout **assimétrico, left-aligned**. Grids variados (evitar grade uniforme repetida).
- **Shapes orgânicos da marca** espalhados nos cantos/seções (`public/images/shapes/`):
  flor coral, estrela cyan, seta amarela, selo choco, splat coral, onda creme.
- **Cards coloridos sobrepostos** (coral/cyan/yellow) sobre fotos, com badge squircle.

---

## 4. Componentes

- **Botões:** `.btn-primary` amarelo (texto chocolate) · `.btn-accent` cyan (texto claro) ·
  `.btn-secondary` borda chocolate. Grandes, pop, memoráveis.
- **Eyebrow:** usar com parcimônia — NÃO repetir kicker em toda seção (tell de IA). No hero,
  barra amarela curta destacada abaixo do texto.
- **Foto editorial** (`PhotoEditorial`, `src/components/placeholders.jsx`): aceita `src`
  (foto real) com caption sobre gradiente inferior; sem `src` cai num gradiente de tom.
  **Sempre preferir foto real** (acervo em `public/images/combos/*`, ver
  `src/data/comboPhotos.js`).
- **Cards de destaque:** fundo de acento, label slab chocolate, ícone em badge squircle.

---

## 5. Motion

Movimento com intenção, nunca enfeite. Materiais: transform/opacity (+ blur/clip-path quando
agrega). Ease-out exponencial, sem bounce.
- Hero: entrada por linha do título, foto com zoom/parallax sutil, shapes flutuando.
- Seções: scroll-reveal (revela conteúdo já visível por padrão).
- Números: count-up ao entrar na viewport.
- **`@media (prefers-reduced-motion: reduce)` obrigatório** em tudo.

---

## 6. Voz & copy

Gastronômica, afetiva, urbana, de comunidade. Memória afetiva de Natal/RN. Convida a
circular pela cidade, montar rota, fotografar, votar, lembrar.

---

## 7. Grafias oficiais da marca (obrigatório)

**Permitido:** Sweet & Coffee Week · SWC · Sweet Awards · Sweet Lovers · Sweet & Coffee Week
Lovers.
**Proibido:** "Sweet Coffee Week", "Sweet Coffee", "Sweet Coffee Awards", "Sweet & Coffee
Lovers", "Sweet" sozinho para o festival.
Categoria de premiação: **"Encantamento em Loja"** (nunca "Envolvimento em Loja").

---

## 8. Faça / Não faça

**Faça:** foto real grande e sensorial; recortes orgânicos; tipografia de campanha; cores
proprietárias; acentos pontuais; movimento na rolagem; mobile desenhado (não só empilhado).

**Não faça:** layout de template; cards todos iguais; eyebrow/kicker em toda seção;
numeração 01/02/03 como scaffold em toda seção; acentos dominando; placeholders no lugar de
foto real; gradient-text; glassmorphism decorativo; side-stripe borders; animação exagerada.

---

## 9. Onde vive no código

```
src/styles/swc-redesign.css      # tokens SWC + sidebar + reveal + shapes (carrega por último)
src/styles/fonts-nexa-slab.css   # @font-face Nexa Slab
src/components/nav.jsx           # sidebar + header + drawer mobile
src/components/icons.jsx         # ícones SVG da marca
src/components/placeholders.jsx  # PhotoEditorial (foto real / gradiente)
src/data/comboPhotos.js          # pool de fotos reais de combos
src/pages/institutional/         # Home, Edicoes, Curiosidades, Participar, Apoiar, Contato, Agradecimento (Sweet Awards)
public/images/shapes/            # shapes orgânicos da marca (.svg)
public/fonts/nexa-slab/          # fontes self-hosted (.woff2)
```

> Identidade Lovers (`src/pages/lovers/`, `src/styles/lovers-system.css`) é um sistema
> separado (burgundy/Sofia Pro) — **nunca misturar** com o institucional.
