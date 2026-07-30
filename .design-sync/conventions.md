## Convenções deste design system

**Escopo do que foi sincronizado.** Este pacote traz só peças de casca
(cabeçalho, rodapé, menus, diálogo de acesso, botões flutuantes, ícones) —
não as páginas do site (essas dependem de rota/dados e não são componentes
reutilizáveis). Construa layouts de página compondo estas peças com marcação
própria, seguindo o idioma abaixo.

**Sem wrapper/provider.** Nenhum componente aqui depende de Context/Provider.
Basta importar e usar. Vários (`AccessDialog`, `MobileMenu`) são
overlays `position:fixed` — só renderizam conteúdo quando a prop `open` é
verdadeira; sem isso retornam `null`.

**Idioma de estilo: classes `.scw-*` + CSS custom properties, nunca inline
do zero.** Não é utility-first (sem `bg-*`/`p-*`). Componha com as classes já
existentes e as variáveis de `:root`:

| Papel | Var | Uso |
| --- | --- | --- |
| Fundo/texto base | `--scw-creme` `#FEF0DD` / `--scw-choco` `#3D1308` | página clara / seção escura |
| Seção alternada | `--scw-bege` `#F8E4C1` | chips, faixas |
| Texto de apoio | `--scw-marrom` `#6A2C15` | rótulos, legendas |
| Acentos (nunca fora destes 9) | `--scw-amarelo` `#FDBB1A` · `--scw-cyan` `#01AFCC` · `--scw-roxo` `#4D257E` · `--scw-magenta` `#F10767` · `--scw-laranja` `#FF4810` | um por página/contexto — nunca repetir cor entre irmãos de uma mesma fileira |
| Cor da página corrente | `--scw-pagina` / `--scw-pagina-tinta` | trocada via classe `body.route-<nome>` |
| Fundo do herói | `--scw-heroi` / `--scw-heroi-tinta` | par dedicado — nem toda página fecha contraste com `--scw-pagina` puro |

Botões são **chapados** — nunca `box-shadow`. Hover sobe 2px
(`transform:translateY(-2px)`), clique volta com leve `scale(.985)`.

**Onde está a verdade.** O CSS real está em `styles.css` (raiz deste
pacote) — leia-o antes de inventar uma classe nova; se a classe que você
precisa não existe lá, componha com as que existem em vez de estilizar
inline do zero. `README.md` lista os componentes; `<Nome>.prompt.md` de
cada um traz o uso esperado.

**Exemplo idiomático** (cabeçalho + rodapé numa página nova):

```jsx
import { SiteHeader, SiteFooter } from 'site-sweet-coffee-week'

function Pagina() {
  return (
    <div className="scw-raiz">
      <SiteHeader route="home" navigate={ir} onOpenAccess={abrirAcesso} accessOpen={false} />
      <main style={{ padding: 'clamp(58px,6vw,100px) max(clamp(24px,5vw,72px), calc((100% - 1360px) / 2))' }}>
        {/* conteúdo da página */}
      </main>
      <SiteFooter route="home" navigate={ir} />
    </div>
  )
}
```

**Movimento.** Transições existentes usam curvas próprias (`--mo-ease`,
`--mo-mola`) e animam só `transform`/`opacity`/`filter`/`scale` — nunca
propriedades de layout. Todo movimento novo deve respeitar
`prefers-reduced-motion`.
