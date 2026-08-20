# Instruções para colar no Claude Design

Cole o bloco abaixo como primeira mensagem numa conversa nova do projeto
**"Sweet & Coffee Week — Componentes (sync)"**.

Por que isso é necessário: o projeto no Claude Design contém duas coisas de
idades diferentes.

| O que | Origem | Atualizado pelo sync? |
| --- | --- | --- |
| `components/`, `styles.css`, `_ds_bundle.*`, `fonts/`, `guidelines/` | gerado do código pelo `design-sync` | **Sim**, a cada re-sync |
| `templates/site-completo/*.dc.html` | protótipo autoral feito no próprio Claude Design (handoff de 28/07/2026) | **Não, nunca** |

O `design-sync` só escreve componentes, CSS, fontes e guidelines. Os templates
de página são artefatos do Claude Design e ficam congelados no estado em que
foram criados — por isso o agente lá "abre o site" e mostra uma versão que não
é a do código.

---

## Bloco para colar

```
Contexto: este projeto tem o design system do site institucional Sweet & Coffee
Week, gerado a partir do código real do repositório.

IMPORTANTE — o que está desatualizado aqui:
os arquivos em `templates/site-completo/*.dc.html` são o protótipo de
28/07/2026 e NÃO refletem o site atual. Não use como referência do estado
presente. A verdade do sistema visual está em `styles.css`, em
`components/general/*` e em `guidelines/docs/GUIA-VISUAL.md`.

Antes de desenhar qualquer coisa, leia nesta ordem:
1. `README.md` (topo traz as convenções e o idioma de estilo)
2. `styles.css` (CSS real; não invente classe que já existe lá)
3. `guidelines/docs/GUIA-VISUAL.md` e `guidelines/docs/FLUXO-DESIGN-CODIGO.md`

Regras que MUDARAM depois do protótipo — não reintroduzir o comportamento antigo:

- Paleta fechada em nove cores. Nenhuma cor fora desta lista:
  creme #FEF0DD · bege #F8E4C1 · chocolate #3D1308 · marrom #6A2C15 ·
  amarelo #FDBB1A · cyan #01AFCC · roxo #4D257E · magenta #F10767 · laranja #FF4810.
  Nunca #E52C4B. Saíram sem substituto: #B3213B, #EBD6B4, #FFF7E9, #D0055B,
  #D19100/#D9BE95/#C99A7E.
- Cor por página: O festival amarelo · Edições cyan · Sweet Awards ROXO (não
  mais ouro) · Participar magenta · Apoiar CYAN (era vinho) · Contato BEGE
  (era marrom).
- A barra de 5px sob o cabeçalho foi REMOVIDA. O herói já é a cor da página.
- Cada página tem fundo de herói próprio (--scw-heroi / --scw-heroi-tinta),
  que não é igual a --scw-pagina: nem toda cor de página fecha contraste como
  fundo de herói.
- Rótulo curto em caixa-alta abrindo as seções (.scw-rotulo) É o padrão atual.
  A regra antiga "não usar eyebrow" está superada. Rótulo sem função continua
  proibido.
- Fonte única Nexa Slab (títulos usam a família 'Nexa Slab Black'). NUNCA fonte
  mono em rótulo, label ou metadado — rejeitado duas vezes.
- Trilho único de 1360px: padding-inline: var(--scw-trilho) em header, seções e
  rodapé. Não inventar largura nem gutter próprios.
- Breakpoints: 1000 · 900 · 820 · 760 · 420. Em 1000 o herói vira dois blocos
  empilhados (foto em cima, texto embaixo — nenhum texto sobre imagem); em 900 a
  casca vira aplicativo (barra inferior de 5 abas, sem menu de topo).
- Corte de foto: rampa em S (token --scw-esfuma), aplicada como MÁSCARA sobre a
  cor de fechamento. Não usar box-shadow inset para dissolver foto — a rampa
  curta marca aresta. O corte fecha na cor do BLOCO seguinte, não na cor do
  herói (em Contato os dois divergem).
- Alvo de toque mínimo de 44px no celular, medido no controle e não na linha
  que o contém.

Nomenclatura obrigatória (não negociável):
- O festival é "Sweet & Coffee Week". Nunca "Sweet" sozinho: não escrever
  "o Sweet", "do Sweet", "história do Sweet".
- Grafias oficiais: Sweet & Coffee Week · Sweet & Coffee Week Lovers ·
  Sweet Awards. Erradas: "Sweet Coffee Week", "Sweet Coffee Awards".
- "SCW" só depois do nome completo já ter aparecido.

Nunca inventar dado histórico, ranking ou vencedor. Se um número não estiver
nas guidelines, deixar a ausência explícita em vez de preencher.

Também não misturar a identidade institucional com a da edição Lovers (paleta
cream/vermelho e tipografia Sofia Pro) — são dois sistemas separados.
```

---

## Se quiser que os templates parem de confundir

Duas saídas, ambas decisão do Wilke:

1. **Apagar `templates/site-completo/` do projeto no Claude Design.** O sync
   passa a ser a única fonte lá. Perde-se o protótipo original como registro.
2. **Refazer os templates dentro do Claude Design**, pedindo ao agente que
   reconstrua cada página a partir dos componentes e do `styles.css` atuais.
   Mais trabalho, mas devolve ao projeto uma visão de página que confere com o
   código.

O `design-sync` não faz nem um nem outro: ele não escreve em `templates/`.
