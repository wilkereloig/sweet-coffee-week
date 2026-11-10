<!-- Parte das regras do projeto. Índice: src/pages/CLAUDE.md. Movido sem reescrita de src/pages/CLAUDE.md em 10/11/2026. -->

### 7.1 Home / O Festival — `/`, amarelo `#FDBB1A`

⛔ **Não alterar sem solicitação explícita.** É a página-mãe: as demais usam a Home como
referência de margem, largura máxima, respiro, hierarquia, ritmo, nível de acabamento e
tom institucional-afetivo. Extrair componente ou constante é permitido **desde que não
mude o comportamento visual** — validar idêntico.

**Reequilibrada em 12/10/2026** (pedido do Wilker): a Home **apresenta o festival o
ano inteiro**; quando houver lançamento autorizado, a edição assume a abertura e o resto
segue igual. A reconstrução de 28/09/2026 abria anunciando a edição de novembro com o
pré-cadastro — isso saiu da abertura e virou uma linha na porta de Participar (06).

**Onde mora:** `src/pages/home/` — `index.jsx` monta as seções na ordem abaixo; uma
seção por arquivo em `secoes/`; `useHome.js` (destaque dos títulos) e
`TituloDestaque.jsx`. Texto editorial em `src/data/conteudo/home.js`; CSS em
`scw-home.css`. Fotos: `heroPhotos('home')` e `fotosHome(chave)` de `imageLibrary.js`.
Dado: `festivalFacts`, `proximaEdicao.js`, `AWARDS_DADOS`.

**Sete seções:** `01 Abertura` · `02 Como funciona` · `03 Em registros` ·
`04 Trajetória` · `05 Sweet Awards` · `06 Faça parte` · `07 Realização` (F2).

- **01 Abertura (`secoes/Abertura.jsx`, `.hm-abre`)** — dois modos, **uma decisão só:
  `destaqueValido()`** de `src/data/destaqueEdicao.js`. Nunca decidir por `ativo`
  direto: um campo faltando abriria bloco vazio. A classe `.hm-abre` fica nos dois
  modos — `scw-motion.css` coreografa por ela. Altura do conteúdo, não de tela: a seção
  seguinte aparece na primeira dobra do desktop.
  - **Sem destaque válido (`ativo: false`, ou campo faltando):** apresentação do
    festival. Texto à esquerda: rótulo, H1 ("O festival dos *combos autorais* de
    Natal."), lead, duas ações (**"Explorar as edições"** → `/edicoes`; **"Como
    funciona"** rola até `#festival`) e uma ficha de até três linhas (edições desde o
    primeiro ano · marcas · "Próxima edição" **só se `proximaEdicao.js` tiver o mês**).
    Fotos à direita: **pessoas** em crossfade (`useCrossfade`, 6,2s) com um **combo** em
    recorte redondo sobreposto, trocando juntos, e o botão `PausaFotos` quando há
    rotação. Sem movimento, uma camada só.
  - **Com destaque válido (o estado de hoje — ligado em 13/10/2026, autorização do
    Wilker para tema Cartoon e datas 5 a 15 de novembro):** `.hm-abre--edicao`, composição
    própria de anúncio. Rótulo "Próxima edição · 2026" → H1 com "Sweet & Coffee Week" e o
    **lettering oficial CARTOON** (`marcas-edicoes/2026.2/tema.webp`, do PNG da marca
    aprovada no Dropbox F2 — refeito do arquivo "(2)" novo em 13/10/2026; `alt="Cartoon"`, então o nome acessível do H1 é "Sweet & Coffee
    Week Cartoon") → **período em amarelo** → uma frase → ações (**"Quero participar"** →
    `/quero-participar/` só enquanto o pré-cadastro estiver aberto; **"Conhecer o
    festival"** rola até `#festival`). Sem ficha de números nem selo. Tema, período e ano
    vêm de `proximaEdicao.js`. **Só peças da edição nova — nenhuma foto de edição anterior**
    (pedido do Wilker, 13/10/2026):
    - **fundo** ilustrado gerado no Magnific (Nano Banana Pro, dois quadros do vídeo de
      lançamento como referência de estilo; original no Dropbox em
      `05_SITE/02_ASSETS/fundo-heroi-home_magnific_v1.png`). Chapa amarela, tinta
      chocolate; a **data vira chapa chocolate com amarelo** (amarelo em texto sumiria);
    - **vídeo de lançamento** (versão sem "Natal e região", a que está no Instagram) em
      cartão vertical 9:16 com contorno e sombra chapada, `public/videos/edicao-2026-2/
      lancamento.mp4` (720×1280, ~9,7 MB), **`preload="none"`, sem autoplay**, controles
      nativos — só baixa quando a pessoa dá o play;
    - botão **"Ver no Instagram"** (ícone `redes/instagram`, 24px) para o reel oficial,
      em nova aba, link sem parâmetro de rastreio (`REEL_LANCAMENTO` em `destaqueEdicao.js`).
    O lettering tem um **laço "boing"** (`moBoing` em `scw-motion.css`, 3,6s, começa
    depois da entrada do título): achata, estica e pousa, parado ~60% do ciclo. Único
    laço da abertura; some com `prefers-reduced-motion`. ⚠️ Sem botão de pausa, como a
    faixa do Awards (§6.15) — decisão do Wilker.
    Desktop: coluna do vídeo presa ao topo do texto e tela com teto `48svh`, para o botão
    do Instagram ficar acima do aviso de cookies (que mora no canto inferior direito).
    Celular: texto primeiro sobre a área calma do fundo; o vídeo vem depois das ações num
    painel arredondado com a parte dos raios do mesmo fundo. O KV fica só nesta abertura;
    sem o arquivo da marca, o tema sai em tipografia (`.hm-ed__tema--texto`).
  ⚠️ **As fotos de pessoas são todas da Lovers (2026.1) e a legenda diz isso**
  ("Registros da edição Lovers · 2026 · combo …"). Ficam de fora de propósito:
  fantasias (Heróis & Vilões), personagens de desenho ou de contos (Padoca do Bosque, a
  luva do Mickey em `2023/04`) e a faixa do Sebrae (§9.6) — qualquer uma seria lida como
  pista do tema da próxima edição (anunciado em 13/10/2026, mas só a abertura de edição
  fala dele).
  Celular (<1000px): foto no topo, largura cheia, **16:10** (16:9 até 420px; 2:1 entre
  600 e 999px; teto `44svh`) — não o quadrado do §6.9, para título, lead e ação caberem
  acima do aviso de cookies na primeira visita.
- **02 Como funciona (`ComoFunciona.jsx`, `#festival`)** — texto, anatomia do combo e
  três laços (para as casas · para o público · para Natal) à esquerda; à direita, **combos
  completos de cinco casas da Lovers em crossfade** (`fotosHome('combos')`, relógio
  `useCrossfade` com `PausaFotos`, legenda "Marca · Lovers 2026.1" acompanhando a foto —
  14/10/2026, pedido do Wilker). As cinco foram escolhidas por manter doce, salgado e
  bebida nos dois cortes da moldura (4:5 desktop, 4:3 celular). A anatomia continua como era: ⛔ **sempre em UMA LINHA, inclusive no
  celular** (pedido do Eloi, 22/08/2026), escala por `--ing-disco`/`--ing-mais`, quatro
  desenhos por ingrediente em 8,8s (`scwIcnCiclo`; desde 14/10/2026 são desenhos da família
  expressiva do catálogo, listados por nome em `anatomia-combo.js` — capa cupcake · coxinha ·
  xícara), só o primeiro com `prefers-reduced-motion`. **Não empilhar de
  novo.**
  ⚠️ O texto não diz "onze dias" nem "preço único": são fatos das edições passadas que
  soariam como regra da próxima, e duração e valor dela são `null`.
- **03 Em registros (`Registros.jsx`, chocolate)** — mosaico de seis fotos reais de
  edições passadas (`fotosHome('mosaico')`), cada legenda dizendo de onde é o registro,
  e a voz de uma casa participante sempre identificada (pessoa + marca: Carol Barreto,
  Jolie Café Pâtisserie), com a foto da equipe (`fotosHome('jolie')`) e o link para os
  depoimentos em vídeo. **Sem laço, sem autoplay**: a entrada é a do motor, item a
  item. ⛔ A fita automática (`GaleriaCarrossel`/`.hm-fita`) **saiu** em 28/09/2026 e
  não volta.
- **04 Trajetória (`Trajetoria.jsx`, bege)** — quatro números (participações · combos
  vendidos · movimento nas casas · visualizações), contados uma vez ao entrar, **cada um
  com o que mede** (`festivalFacts.*.mede`) e os comerciais com a data em que foram
  apurados; a porta para Edições na cor do destino (laranja), com quatro fotos
  (`fotosHome('edicoes')`); e a imprensa — uma matéria em destaque, quatro na lista e
  "ver todas".
- **05 Sweet Awards (`Reconhecimento.jsx`, chapa roxa — cor do destino)** — foto de uma
  entrega real (`fotosHome('premio')`), quem dá a nota (premiação desde 2019; só Sweet
  Lovers desde 2022), o total de prêmios entregues (271, `estatisticas()` de `sweet-awards/consulta.js` sobre `AWARDS_DADOS` — a mesma conta do herói do Awards, nunca digitado) e
  a ação "Ver o Sweet Awards".
- **06 Faça parte (`FacaParte.jsx`, creme)** — duas portas curtas na cor do destino:
  **casas → Participar (cyan)** e **empresas → Apoiar (marrom)**; embaixo, a linha
  "Outra dúvida?" para o Contato. **O pré-cadastro mora aqui, como linha da porta de
  Participar:** "Próxima edição · <período ou mês> · pré-cadastro aberto", a nota de
  curadoria e o botão "Fazer pré-cadastro" (`<a href>` com barra final, §10.4-b) — e
  **só aparecem quando `proximaEdicao.js` traz `status: 'pre-cadastro'` e o endereço**.
  Outro status some com a linha.
- **07 Realização (`Realizacao.jsx`)** — KV da F2 Experience, a exceção declarada de
  paleta e fonte (§6.1).
- ⛔ **Saíram:** a faixa de palavras (`Marquee`), as Rotas, o Ciclo de quatro etapas, o
  cartão "preço único" (28/09/2026); a chapa cyan "Como participar", "Por que
  participar" e o convite marrom "Apoio" como seções próprias (12/10/2026 — o conteúdo
  válido foi redistribuído: depoimento em 03, números em 04, portas em 06).

> **Alvo do plano institucional:** a Home passa a ter oito seções, com "O festival
> transforma Natal" e "Os temas de todas as edições" ganhando bloco próprio. Ver
> `acervo/plano-site-institucional.md`. **Isso é plano, não estado — e depende de pedido
> explícito para ser executado (A6).**

