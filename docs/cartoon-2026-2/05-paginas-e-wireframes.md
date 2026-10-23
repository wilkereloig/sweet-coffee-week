# 5 · Páginas, wireframes, movimento e identidade

A navegação é uma sequência de cenas: **apresentação → descoberta → detalhe → informação prática → ação.** Cada página tem uma cena principal, e as informações de serviço ficam em áreas estáveis, sem efeito.

Nos wireframes, **[DEMO]** marca conteúdo de demonstração. Nomes de casas, combos, endereços e horários ali **não são dados reais.** São reais só o tema (Cartoon), o período (5 a 15 de novembro) e o nome do festival.

## 5.1 Entrada da edição (`/cartoon`)

| Bloco | Conteúdo | Fase |
|---|---|---|
| 1 · Abertura | selo oficial da Cartoon (arquivo aprovado, nunca redesenhado), período "5 a 15 de novembro · Natal", uma frase. Ações: "Ver participantes" e "Abrir o mapa" | todas |
| 2 · Como experimentar | três passos literais: escolha a casa, prove o combo, avalie. Em pré-lançamento só os dois primeiros | todas |
| 3 · O elenco | grade das casas publicadas (logo + nome + foto do combo se publicado); link "ver todas" | interruptor 3 |
| 4 · Mapa | prévia estática (lista de bairros com contagem) e ação "Abrir o mapa"; o mapa interativo **não** carrega aqui | interruptor 3 |
| 5 · Avaliação e premiação | estado conforme a fase (2.7) | fases |
| 6 · Dúvidas | 4–6 perguntas práticas (preço, delivery, restrições, avaliação), da FAQ da edição | todas |
| Rodapé | "Sobre o festival" (`/festival`), documentos legais, F2 Experience | todas |

```
DESKTOP ≥ 900px                                         CELULAR 390px
┌──────────────────────────────────────────────────┐    ┌────────────────────────┐
│ [selo] Sweet & Coffee Week Cartoon   Participantes│    │ [selo]          [menu] │
│        Mapa  Minha rota  Avaliar  Sobre o festival│    ├────────────────────────┤
├──────────────────────────────────────────────────┤    │  [lettering CARTOON]   │
│  [lettering CARTOON          ]   [foto real de   │    │  5 a 15 de novembro    │
│  [arquivo aprovado           ]    um combo       │    │  Natal                 │
│  5 a 15 de novembro · Natal       publicado]     │    │  Frase curta [DEMO]    │
│  Frase curta da edição [DEMO]                    │    │  [Ver participantes]   │
│  [Ver participantes]  [Abrir o mapa]             │    │  [Abrir o mapa]        │
├──────────────────────────────────────────────────┤    ├────────────────────────┤
│ 1 Escolha a casa   2 Prove o combo   3 Avalie    │    │ 1 Escolha a casa       │
├──────────────────────────────────────────────────┤    │ 2 Prove o combo        │
│ O elenco                              ver todas →│    │ 3 Avalie               │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │    ├────────────────────────┤
│ │ foto │ │ foto │ │ foto │ │ foto │              │    │ O elenco               │
│ │[logo]│ │[logo]│ │[logo]│ │[logo]│              │    │ ┌──────────┐┌─────────┐│
│ │Casa A│ │Casa B│ │Casa C│ │Casa D│ [DEMO]       │    │ │ foto     ││ foto    ││
│ └──────┘ └──────┘ └──────┘ └──────┘              │    │ │ Casa A   ││ Casa B  ││
├──────────────────────────────────────────────────┤    │ └──────────┘└─────────┘│
│ Onde ficam: Lagoa Nova 4 · Tirol 3 · … [DEMO]    │    │ ver todas              │
│ [Abrir o mapa]                                   │    ├────────────────────────┤
├──────────────────────────────────────────────────┤    │ Onde ficam … [DEMO]    │
│ Avaliação: abre durante o festival               │    │ [Abrir o mapa]         │
├──────────────────────────────────────────────────┤    ├────────────────────────┤
│ Dúvidas  ▸ Quanto custa?  ▸ Tem delivery? …      │    │ Dúvidas ▸ …            │
└──────────────────────────────────────────────────┘    ├────────────────────────┤
                                                        │ Início Casas Mapa Rota │  ← abas fixas
                                                        │        Avaliar         │
                                                        └────────────────────────┘
```

## 5.2 Catálogo (`/cartoon/participantes` e `/cartoon/combos`)

- **Uma coleção, duas leituras.** Em `/participantes` o cartão leva a logo e o nome à frente. Em `/combos` leva a foto do combo e a composição ("brigadeiro · coxinha · café gelado" [DEMO]). As duas usam o mesmo filtro e levam à mesma página.
- **Busca:** nome da casa, nome do combo, componentes e bairro. Busca local na lista já carregada, sem nova requisição.
- **Filtros com dados reais:**
  - bairro;
  - modo: consumo no local, retirada, delivery. Só aparece a opção que ao menos uma unidade declarou `sim`;
  - "aberto agora", só em `em_andamento` e só para unidades com disponibilidade cadastrada;
  - "sem glúten declarado" e "sem lactose declarada". Contam só `nao_contem`/`nao`, nunca `nao_informado`, e o rótulo diz "declarado pela casa".
- **Ordem:** alfabética por padrão. Nenhuma ordem por nota ou popularidade antes dos resultados.
- **Sem carrossel.** Grade com 1 coluna a 360px, 2 a 600px, 3 a 900px e 4 a 1200px.
- **Cartão acessível:** o cartão inteiro é um `<a>` único. O Instagram não vai no cartão, porque link aninhado é um defeito herdado da Lovers.
- **Contagem:** "N casas" e "N com delivery" a partir dos dados. Nunca "mais de".

```
DESKTOP                                                CELULAR
┌──────────────────────────────────────────────────┐   ┌────────────────────────┐
│ O elenco da Cartoon                    24 casas  │   │ O elenco      24 casas │
│ [ buscar casa, combo ou bairro            ]      │   │ [ buscar…            ] │
│ Bairro ▾  Local · Retirada · Delivery  Aberto agora   │ [Filtros (2)]          │
│ Sem glúten declarado · Sem lactose declarada     │   ├────────────────────────┤
├──────────────────────────────────────────────────┤   │ ┌────────────────────┐ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │   │ │  foto do combo     │ │
│ │ foto     │ │ foto     │ │ foto     │ │ foto  │ │   │ │ [logo] Casa A      │ │
│ │ [logo]   │ │ [logo]   │ │ [logo]   │ │       │ │   │ │ Lagoa Nova · 2 un. │ │
│ │ Casa A   │ │ Casa B   │ │ Casa C   │ │ …     │ │   │ │ Local · Delivery   │ │
│ │ bairro   │ │ bairro   │ │ bairro   │ │       │ │   │ └────────────────────┘ │
│ │ modos    │ │ modos    │ │ modos    │ │       │ │   │ ┌────────────────────┐ │
│ └──────────┘ └──────────┘ └──────────┘ └───────┘ │   │ │  …                 │ │
│                       [DEMO]                     │   │ └────────────────────┘ │
└──────────────────────────────────────────────────┘   └────────────────────────┘
```

O painel de filtros no celular abre como folha inferior, com "Ver N casas" e "Limpar". Fecha por Escape, pelo véu e pelo botão.

## 5.3 Página do participante (`/cartoon/participantes/:slug`)

Sequência vertical de blocos com funções claras. **Preço, composição, restrições relevantes e formas de compra ficam visíveis sem abas.** No desktop, imagem e informação lado a lado nos blocos B e C; no celular, a mesma ordem empilhada.

| Bloco | Conteúdo | Regras |
|---|---|---|
| **A · Conheça a casa** | logo oficial, nome, apresentação, foto da loja se houver, selo de texto "Participa da Sweet & Coffee Week Cartoon" | sem logo: monograma neutro (não é logo inventada; marcado no painel) |
| **B · Descubra o combo** | foto principal, nome, descrição, **preço confirmado**, condições, acesso à galeria. Resumo rápido logo abaixo do preço: modos disponíveis e alertas alimentares (ex.: "Contém leite, ovo e glúten · ver detalhes") | sem preço confirmado: "preço a confirmar"; sem foto: placeholder honesto "foto em produção" |
| **C · Os três componentes** | doce, salgado (ou segundo doce) e bebida: nome, descrição, foto se houver, ingredientes, alergênicos e características **junto do componente**, substituições do componente | se há só a foto do conjunto: o componente aparece sem foto, com um recorte da foto principal marcado (zoom na região) **só se** a organização definir o foco; nunca uma imagem gerada |
| **D · Antes de pedir** | resumo geral: alergênicos que aparecem em algum componente, contato cruzado declarado, o que não foi informado, substituições e condições. Fecha com "Tem alergia ou restrição? Confirme com a loja antes de pedir" | "não informado" aparece como tal, nunca omitido |
| **E · Escolha como experimentar** | por modo (local, retirada, delivery): disponível em quais unidades; canais de pedido; taxa e região só se informadas; diferenças entre unidades | delivery listado só com `delivery_combo = sim` |
| **F · Encontre a unidade** | um cartão por unidade participante: nome da unidade, endereço, **horário no festival** por dia, estado "aberto agora" no festival, mapa estático pequeno (carregado sob demanda), "Como chegar" (serviço externo), WhatsApp da unidade, "Adicionar à Minha rota" | sem coordenada verificada: sem mapa, com aviso "localização em conferência"; o endereço aparece |
| **G · Avalie sua experiência** | botão "Avaliar esta casa" levando a `/cartoon/avaliar?participante=…&unidade=…`; explicação em duas linhas | só com interruptor 5 e dentro da janela; fora disso, texto da fase |

```
DESKTOP                                                    CELULAR
┌───────────────────────────────────────────────────────┐  ┌────────────────────────┐
│ ← Participantes                                       │  │ ← Participantes        │
├───────────────────────────────────────────────────────┤  ├────────────────────────┤
│ A [logo] Casa A                                       │  │ A [logo] Casa A        │
│   Apresentação breve da casa [DEMO]                   │  │   Apresentação [DEMO]  │
│   Participa da Sweet & Coffee Week Cartoon            │  │   Participa da Cartoon │
├───────────────────────────────┬───────────────────────┤  ├────────────────────────┤
│ B ┌─────────────────────────┐ │ Combo Nome [DEMO]     │  │ B ┌────────────────────┐│
│   │                         │ │ Descrição geral       │  │   │ foto principal     ││
│   │   foto principal        │ │ R$ 00,00 [DEMO]       │  │   └────────────────────┘│
│   │   (cover, foco)         │ │ Local · Retirada ·    │  │   Combo Nome [DEMO]    │
│   └─────────────────────────┘ │ Delivery              │  │   R$ 00,00 [DEMO]      │
│   ▢ ▢ ▢  ver galeria (5)      │ ⚠ Contém leite, ovo,  │  │   Local · Delivery     │
│                               │   glúten · detalhes ↓ │  │   ⚠ Contém leite, ovo… │
├───────────────────────────────┴───────────────────────┤  │   ver galeria (5)      │
│ C  Doce            │ Salgado          │ Bebida        │  ├────────────────────────┤
│    [foto]          │ [sem foto]       │ [foto]        │  │ C Doce                 │
│    Nome, descrição │ Nome, descrição  │ Nome, …       │  │   [foto] nome, desc.   │
│    Ingredientes    │ Ingredientes     │ Ingredientes  │  │   Ingredientes         │
│    Contém: leite,  │ Contém: glúten   │ Não informado:│  │   Contém: leite, ovo   │
│    ovo             │ Pode conter:     │ amendoim      │  │   Troca: … ▸           │
│    Troca: … ▸      │ amendoim         │               │  │ C Salgado …            │
├────────────────────┴──────────────────┴───────────────┤  │ C Bebida …             │
│ D Antes de pedir                                      │  ├────────────────────────┤
│   Alergênicos declarados · contato cruzado · não      │  │ D Antes de pedir       │
│   informado · trocas. Confirme com a loja.            │  │   …                    │
├───────────────────────────────────────────────────────┤  ├────────────────────────┤
│ E Como experimentar                                   │  │ E Como experimentar    │
│   No local: Unid. 1, Unid. 2 · Retirada: Unid. 1      │  │   No local: …          │
│   Delivery: Unid. 1 — [iFood] [WhatsApp]  taxa …      │  │   Delivery: … [Pedir]  │
├───────────────────────────────────────────────────────┤  ├────────────────────────┤
│ F Unidade Lagoa Nova [DEMO]  │ Unidade Tirol [DEMO]   │  │ F Unidade Lagoa Nova   │
│   Endereço                   │   Endereço             │  │   Endereço             │
│   Combo: 05–15/11 14h–20h    │   Combo: …             │  │   Combo: 14h–20h       │
│   ● Aberto agora             │   ○ Abre às 14h        │  │   ● Aberto agora       │
│   [mapa pequeno]             │   [mapa pequeno]       │  │   [Como chegar]        │
│   [Como chegar] [WhatsApp]   │   [Como chegar] [WA]   │  │   [WhatsApp]           │
│   [+ Minha rota]             │   [+ Minha rota]       │  │   [+ Minha rota]       │
├───────────────────────────────────────────────────────┤  ├────────────────────────┤
│ G Avalie sua experiência  [Avaliar esta casa]         │  │ G [Avaliar esta casa]  │
└───────────────────────────────────────────────────────┘  └────────────────────────┘
```

**Conteúdo parcial na página:**

- Casa publicada, combo não: blocos A e F (sem horário de combo) e a frase "O combo será revelado em breve". Os blocos B a E e G ficam fora.
- Combo publicado sem dado opcional: o bloco aparece sem o campo; nada é preenchido.

## 5.4 Demais páginas

| Página | Estrutura |
|---|---|
| Mapa | ver 6.1 |
| Minha rota | ver 6.2 |
| Avaliar | ver 6.3: escolha da casa e unidade (busca), formulário, confirmação gravada |
| Premiação | categorias e como funciona (quando definidos); resultados quando o interruptor 6 liga, no formato da página Sweet Awards atual (pódio por categoria, empates permitidos, 2º e 3º lugares ausentes são ausência honesta) |
| 404 da edição | "Não encontramos essa página da Cartoon" + catálogo + mapa |

## 5.5 Identidade Cartoon: o que é aprovado e o que é estudo

Fonte: pasta `2026.2 SCW CARTOONS` (Dropbox), lida em 14/10/2026.

| Item | Estado | Evidência | Uso no site |
|---|---|---|---|
| Selo e lettering CARTOON | **aprovado** (03/10) | `01_IDENTIDADE_VISUAL/01_MARCA/marca-cartoons-2026.2_aprovada.ai`; PNGs ~1,9k px; **SVG vazio** | usar o arquivo, nunca redesenhar; precisa de SVG reexportado (D-19) |
| Direção "Cartaz Cartoon" | **aprovada** (03/10) | `00_BRIEFING_E_DIRECAO/01_SISTEMA_KV/DIRECAO-KV-CARTAZ-CARTOON-v01.md` | fundo creme com papel livre, um lettering por peça, raios só em volta do lettering, um herói por peça, no máximo um par de olhos, selo embaixo à esquerda |
| Conceito "Do traço ao sabor" | **aprovado** | `BASE-CONCEITUAL-KV-E-ECOSSISTEMA.md`, `KV-01-FUNDAMENTOS.md` | "a comida real é protagonista; o cartoon comenta" |
| Paleta | **aprovada** (cores da marca) | KV | amarelo `#FDB901`, vermelho `#ED1C20`, azul `#0184E4`, turquesa `#05BEBA`, roxo `#6424AB`, creme `#FDF2DF`, preto `#050505`, branco `#FCFCFC`; chocolate do selo = `#3D1308` institucional; fundo do herói da Home `#FAC506` (aprovado 13/10) |
| Tipografia web | **indefinida** | os documentos do KV citam Bricolage Grotesque e Instrument Sans; a decisão de 08/10 diz que as fontes da pasta PPT são "estudo, não aprovadas" | D-04; até lá, a estrutura usa a tipografia institucional (Nexa, Typekit) |
| Fundo do herói da Home | **aprovado e publicado** (13/10) | `05_SITE/02_ASSETS/fundo-heroi-home_gpt25_v3a_USADO.png` | pode abrir a Entrada |
| Pranchas de site (home, combos, mapa, celular) | **estudo** | `GUIA-VISUAL-CARTAZ-CARTOON/img/20-25-site-*` | só referência de composição; usam logo, nomes e selos falsos |
| Confirmados v05, Stories v02 | aprovados para redes | `02_CAMPANHA_E_SOCIAL/...` | não são componentes do site |

**O que fica proibido no site [Fato, documentos da edição]:**

- personagens, logos, títulos ou fontes de cartoons de terceiros;
- desenhar ferramentas de animação (lápis, película, rolo);
- olhos como decoração automática (no máximo um par, e nunca perto de ingredientes, endereço ou avaliação);
- linguagem de quadrinhos inteira (retícula e balões só no detalhe);
- alterar a foto real do combo.

**Isolamento [Proposta]:**

- Todo estilo da edição fica sob `.ct-edicao` em `scw-cartoon.css`, carregado só pelo chunk da edição.
- Tokens `--ct-*`.
- Teste novo `test:cartoon-isolamento`:
  - nenhuma cor da paleta Cartoon nem token `--ct-` aparece em CSS ou JSX do institucional e do painel;
  - nenhuma cor fora da paleta Cartoon aprovada aparece na folha da edição.

  Segue o padrão do teste F2 (`tests/redesign-2026.test.mjs:63-95`).
- **Contraste [verificar na implementação]:** o vermelho `#ED1C20` sobre o creme `#FDF2DF` tende a ficar abaixo de 4,5:1 em texto pequeno. Usar cores fortes como fundo de área grande ou em texto grande; texto corrido em preto sobre creme ou amarelo. Cada par será medido.

## 5.6 Movimento por interação

Tokens novos `--ct-mo-*` ao lado de `--mo-*` (`scw-motion.css`). Com `prefers-reduced-motion: reduce`, toda transição vira troca instantânea ou fade de no máximo 120 ms, e nada se move sozinho. O conteúdo está no HTML desde o início: se a animação falhar, nada fica invisível. É a regra que o `test:motion` já cobra ("reveal preso").

| Interação | Movimento | Duração | Movimento reduzido |
|---|---|---|---|
| Abertura da Entrada | o lettering assenta com um leve squash & stretch e os raios aparecem (direção "Cartaz", ~1,2 s no total); texto e ações já visíveis desde o primeiro quadro | ≤ 1,2 s, uma vez | lettering estático |
| Catálogo → participante | continuidade da foto do cartão para a foto do bloco B (View Transitions de mesmo documento, onde o navegador suporta; sem suporte, troca normal) | 280 ms | troca direta |
| Participante → catálogo (voltar) | mesma continuidade inversa + restauração da posição | 240 ms | direta |
| Abrir galeria | foto amplia a partir da miniatura (o padrão da galeria de Edições) | 220 ms | fade 120 ms |
| Expandir troca, ingredientes, dúvida | altura animada + rotação do indicador | 180 ms | sem animação |
| Aplicar filtro | cartões que saem somem com fade, os que ficam se reposicionam | 200 ms | direta |
| Adicionar à Minha rota | o botão vira "Na sua rota ✓"; o contador nas abas pulsa uma vez; anúncio em `aria-live` | 160 ms + 1 pulso | só a troca de texto + anúncio |
| Remover/reordenar parada | item desliza para a nova posição | 180 ms | direta |
| Enviar avaliação | o botão mostra "Enviando…"; o sucesso aparece **só depois** da confirmação do servidor | — | igual |
| Estado "aberto agora" | ponto estático colorido, **sem** piscar | — | — |

**Proibido:** rolagem sequestrada, animação antes de mostrar conteúdo, carrossel obrigatório, parallax em informação de serviço, movimento permanente perto de ingredientes, endereço ou avaliação, olhos que seguem o cursor e laço contínuo (a pasta da edição diz "sem loop contínuo" e "não piscar em loop").

## 5.7 Casca da edição

- **Cabeçalho:** selo da Cartoon (link para `/cartoon`), links Participantes · Mapa · Minha rota (com contador) · Avaliar (só na fase) · Sobre o festival.
- **Abas no celular (≥ 44px):** Início · Casas · Mapa · Rota · Avaliar (vira "Prêmio" fora da avaliação).
- **Rodapé:**
  - "Sweet & Coffee Week Cartoon é uma edição do Sweet & Coffee Week. Realização F2 Experience."
  - Links Sobre o festival, Participar, Apoiar, Contato.
  - Os quatro documentos legais e o acesso às preferências de cookies.
- Usa o aviso de cookies e as preferências existentes. Não há aviso novo nem medição nova.

## 5.8 Estados parciais e de falha

| Situação | O que aparece | Nunca |
|---|---|---|
| Marca confirmada, combo ainda não divulgado | casa e unidades; "O combo será revelado em breve" | nome ou foto de combo provisório |
| Combo publicado, opcional ausente | bloco sem o campo; "não informado" onde a ausência importa (alimentar) | texto genérico preenchendo o espaço |
| Nenhum participante divulgado | Entrada com tema, período e "o elenco será revelado em breve"; catálogo com a mesma frase | lista de demonstração |
| Busca sem resultados | "Nenhuma casa com 'x'"; limpar filtros; sugestão de ver todas | — |
| Falha de carregamento | última cópia com "pode estar desatualizado"; sem cópia, "Não conseguimos carregar as casas agora" + tentar de novo; endereço e documentos legais seguem | dado de demonstração como plano B |
| Unidade indisponível (`participa = false` depois de publicada, ou retirada) | some do mapa e do catálogo; na Minha rota aparece "Esta unidade saiu da edição" com remover | manter no mapa |
| Conteúdo retirado | página "Esta página saiu do ar" sem dados da marca | cópia em cache depois da retirada (o cache tem validade curta e a resposta do servidor manda) |
| Edição encerrada | modo registro (2.7) | preço, horário, canais e avaliação |

**Demonstração isolada [Proposta]:**

- Fixtures em `src/edicao/dados/demo/`, importadas só por `import.meta.env.DEV` com `?demo=1`.
- O teste da fase 4 reprova o build de produção se algum texto das fixtures aparecer no `dist/`.
- O cliente de dados não tem caminho de código que leia demonstração depois de erro.
