# Sweet & Coffee Week — Regras do Projeto

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
- Paleta: terracotta (`--bg`, `--ink`, `--accent`, `--peach`)
- Tipografia: Instrument Serif + DM Sans

### Edição Lovers
- Páginas: `src/pages/lovers/` (Hub, Combos, Mapa, Awards)
- Paleta: cream, vermelho lovers (`--lovers-red`), burgundy, pink, yellow
- Tipografia: Sofia Pro Comp (`sofia-pro-comp`) via Typekit + fallbacks
- Wrapper obrigatório: classe `.kv-lovers` em todas as páginas Lovers
- Fontes via CSS custom properties: `--font-lovers-display`, `--font-lovers-body`

Nunca aplicar estilos Lovers em páginas Institucionais nem vice-versa, a menos que explicitamente pedido.

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
