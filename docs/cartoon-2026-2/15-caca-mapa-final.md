# 15 · Mapa final — a arte do Illustrator no site (05/11/2026)

Substitui o mapa provisório (v2, `mapa-mundo.py`) pela **arte final** que o Wilker fechou no Illustrator
(`06_MATERIAIS_PDV/03_MAPA_IMPRESSO/04_SINALIZACAO/MAPA_IMPRESSÃO.ai`, salvo em 04/11/2026 às 23:32). O arquivo original e
os PNGs dele não foram tocados: o site usa **cópias** geradas por `scripts/edicao/mapa-mundo-final.py`.
Este documento é o plano de uso dos pontos clicáveis; a integração no `Mundo.jsx` é a etapa seguinte (outra frente).

> **Atualização (05/11, novo pedido do Wilker, que prevalece):** o site desenha os marcadores **por código**, com a **logo oficial da casa** como identificação principal e o número só como
> referência discreta. Por isso a base padrão agora é a **LIMPA** (`base-final-v1-limpa-*`, sem as 27 bandeiras de casa, as 3 da Sicredi e as sombras); a arte **com** bandeiras fica como reserva.
> Onde este texto fala de "bandeira desenhada" ou "pontos sobre as bandeiras", leia: o ponto/centro/caixa marcam **onde a bandeira ficava**, e é ali que entra o pin com a logo.

## 1 · O que é o .ai e o que virou arte do site

PDF compatível (abre no PyMuPDF; não precisa do Illustrator). **Duas pranchetas de 216 × 154 mm** = A5 deitado 210 × 148 + 3 mm de
sangria (a mesma convenção de `07_IMPRESSAO/_bastidores/montar_impressao.py`), uma camada ("Camada 1"), fonte Grandstander.

| Página | Papel | Conteúdo |
|---|---|---|
| 0 | **verso — LEGENDA OFICIAL** | texto vivo: 27 entradas (nº · casa · tema) em 3 colunas, alfabética; bandeira 81×82 px de cada linha (imagem); realização/apoios; textos da ativação. **Sem** QR, letreiro da Caça, ícones, mãozinha e trilha (o XMP lista esses arquivos como colocados, mas não saem na prancheta) |
| 1 | **frente — ARTE DO MAPA** | base 6050×4314 px (`mapa-da-docura-v8-sem-bandeiras.png`, a v8 com a Sicredi depois da ponte) + 27 bandeiras de casa (152×156 px, imagens coladas) + 3 da Sicredi (166×170 px, mesma imagem repetida) + título "Mapa da Doçura" + selo da edição + **faixa de aviso** ("Ilustração fora de escala…") + **cartão "Patrocinador / Sicredi"** |

O número impresso na bandeira é pixel (não é texto): o gerador lê o numeral e casa com a imagem da bandeira da legenda; os 27 numerais
saem 1..27 uma vez cada (conferido também a olho em folha de contato).

**O que o site corta, e por quê** (a arte ainda é a final; só sai papel):

- **sangria de 3 mm** — só existe para a gráfica;
- **faixa de aviso** — o site tem o aviso próprio (`avisoIlustrado`), acessível e selecionável; texto assado em imagem não é lido;
- **cartão "Patrocinador / Sicredi"** — peça de papel; no site a Sicredi tem marcador e rótulo próprios. **Achado:** no papel o cartão
  **cobre a casa rosa da Pantera Cor-de-Rosa (bandeira 15)**; no site ela aparece.
Os dois objetos saem do PDF **em memória** (redação de vetores); a base por baixo aparece, nada é pintado por cima. **Título e selo ficam**
na imagem. Na base padrão (limpa) saem também **27 imagens de bandeira de casa, a imagem da Sicredi (3 usos) e as 30 sombras vetoriais** sob elas (a base v8 não tem resto de
bandeira: conferido em 30 recortes ampliados, sem fantasma, buraco nem corte duro). Sem QR e sem marca de corte na frente (não há).

### PNG × .ai

`MAPA_IMPRESSÃO_MAPA_ARTE.png` (2552×1819, 21:14) **corresponde** ao .ai (23:32) na frente: alinhado por transformação afim, correlação 0,996, só
sobra reamostragem (nenhuma bandeira movida nem elemento novo). `MAPA_IMPRESSÃO_MAPA_VERSO.png` **não**: o PNG traz QR, letreiro "Caça aos
Carimbos", ícones, mãozinha e trilha que a prancheta 0 do .ai não tem — o verso do .ai está **incompleto** (já anotado no briefing, "manter completo").
A legenda (nomes, temas, ordem) é igual nos dois, e igual a `legenda-mapa-3-colunas.svg` (só mudam as quebras de linha). **Vale a do .ai.**

As bandeiras da arte também batem com `bandeiras-v7.json` (pé do mastro por casa, achado a olho em 04/11): diferença **constante** de 19 px / −4 px em
todas as 27 (é a âncora, não movimento) — nenhuma foi movida à mão. As três da Sicredi idem (a "depois da ponte" subiu 11 px).

## 2 · Exportação

| Arquivo (`public/images/marcas-edicoes/2026.2/mundo/`) | Tamanho | Uso |
|---|---|---|
| `base-final-v1-limpa-1024.webp` | 311 KB | **primeira pintura** (≤ 350 KB) — **padrão, sem bandeiras** |
| `base-final-v1-limpa-2048.webp` | 969 KB | celular no zoom 1 (tela × 3 pede ~1200 px), desktop |
| `base-final-v1-limpa-3072.webp` | 1,7 MB | zoom 1,5–2,25 no celular; desktop retina |
| `base-final-v1-limpa-4096.webp` | 2,4 MB | zoom máximo no desktop |
| `base-final-v1-{1024,2048,3072,4096}.webp` | 304 KB · 921 KB · 1,6 MB · 2,3 MB | **reserva**: a arte COM as bandeiras (intacta) |
| placeholder (data URI no JS, `arte.placeholder`) | 1 KB | fundo borrado até a primeira pintura |

Mestre = a renderização nativa do .ai (base 6050 px, 3 mm de sangria cortados → **5882 × 4146**, proporção 210:148); não se amplia além do
nativo, e o mestre **não** vai para o repositório. WebP qualidade 74, escada **1024 · 2048 · 3072 · 4096** em `srcSet` + `sizes` (o `Mundo.jsx`
já troca de candidato quando o zoom muda; medido no navegador: celular 360 carrega 2048 e, ao aproximar, 3072; desktop 1440 chega a 4096).
**Tiles de 512 px descartados por ora:** exigem carregador próprio no componente e a escada cobre o zoom atual (3 níveis, até 2,25×) sem código novo;
reavaliar só se o zoom passar de ~4×. ⚠️ **Orçamento da primeira pintura:** o navegador escolhe o candidato pelo tamanho × densidade — no celular de
densidade 3 ele pega o de 2048 (921 KB). Para cumprir os ~350 KB, a integração mostra `base.placeholder` e `base.src` (1024) primeiro e só depois
liga o `srcSet`. JPEG de reserva: desnecessário (WebP em todo navegador do projeto).

**Fidelidade (medida):** exportação do site × renderização direta do .ai, fora das duas peças de papel: erro médio 7,4/255, 0,001 % dos pixels acima de 60
(em escala reduzida; no pixel cheio a diferença é só reamostragem de linha). Lado a lado em `tests/capturas-caca-redesign/mapa-final/comparacao-ai-x-site-*.png`.

Regenerar: `python -I scripts/edicao/mapa-mundo-final.py [--ai cópia.ai] [--com-bandeiras] [--verificacao saida.png]` (determinístico; só lê o .ai). Sem `--com-bandeiras` gera a base limpa e os dados
(`arteComBandeiras: false`); com ele, a variante antiga (as duas variantes nunca se apagam).
**Reverter:** `--provisoria` grava `aprovada: false` (a arte continua a final); `python -I scripts/edicao/mapa-mundo.py` devolve **tudo** à v2 provisória
(os arquivos `base-final-*` ficam; o script antigo agora só apaga o que ele mesmo gera).

## 3 · Contrato de dados (`src/data/mundoEdicao.js`, gerado)

Mantidos (o site compila e os testes passam): `versao`, `aprovada`, `quadro` (agora o tamanho da imagem exportada), `larguras`, `unidades[id] = { x, y, numero, slug }`
(`x/y` = **pé do mastro**), `marcos`, `sicredi[{nome, endereco, x, y}]`, `bandeiras` (**vazio**: `bandeira(n)` devolve `null`), `docerias`, `logos`,
`sicrediBandeira` (arquivo provisório, só compatibilidade — a Sicredi já está na arte). **Novos:**

- `arteComBandeiras: false` e `arte.semBandeiras: true` (base limpa; `arte.arquivo = 'base-final-v1-limpa'`, `arte.bandeirasRemovidas` lista o que saiu). Com `--com-bandeiras` fica `true` e
  a arte traz as bandeiras (**aí não desenhar bandeira nem número por cima**). Em qualquer variante `casas[].bandeira` = a caixa de onde a bandeira ficava, e `bandeiras` segue vazio.
- `arte`: `arquivo`, `versao: 'final-v1'`, `fonte`, `salvoEm` (data do .ai), `recorte`, `aprovacao`, `ilustrativa: true`, `geradoPor`, `placeholder`. `aprovada` é `true` **porque o
  Wilker declarou esta a arte final** e a fidelidade foi medida (§2); o teste `cartoon-caca-mapa` agora exige origem, data e aprovação quando `aprovada` é `true`.
- `casas[slug]` (27): `numero`, `nome`, `tema` (da legenda), `ponto` (pé do mastro), `centro` (centro do desenho), `bandeira {x0,y0,x1,y1}` (caixa do desenho: mastro + pano),
  `selo` (canto superior direito do pano), `raio` (raio de acerto sugerido, em larguras da arte, limitado a metade da distância à vizinha), `vizinha` (distância à bandeira mais próxima).
- `sicredi[]` ganha os mesmos campos (`ponto`, `centro`, `bandeira`, `selo`, `raio`, `vizinha`); `x/y` = `ponto`.
- `mundoEdicao().base` ganha `placeholder`.
- **Unidade → ponto:** todas as unidades de uma casa apontam para o mesmo ponto (o da bandeira da casa). A numeração mudou: **ordem alfabética da legenda**, não mais a ordem do
  caminho (Caroli Douces era 1, agora é 7). Todas as coordenadas são 0–1 sobre a imagem **exportada**.

## 4 · Pontos clicáveis (INTEGRADOS em 05/11/2026 — `Mundo.jsx` + `11-mundo.css`)

**Como ficou:** uma `agruparPorCasa` (`rota/mundo.js`, testada) junta as 41 unidades em 27 pins. Cada pin = disco com a **logo oficial** (`mundo/logos/<slug>.webp`) + ponta no `ponto` (pé do mastro) + número do
impresso num selinho no aro inferior esquerdo (16 px, `aria-hidden`: o nome acessível já diz o número). Estado = selo de forma no aro superior direito (`IMAGENS_ESTADO`) + aro do disco contínuo/tracejado/duplo; parada da rota
= selo turquesa no aro superior esquerdo; revisita "+N" no aro inferior direito a partir do zoom; próxima = anel tracejado + rótulo sob a ponta. Nome da casa só na escolhida/ponteiro/foco. Sicredi = letreiro retangular
branco com a marca, **ancorado a 15 % (85 % perto da borda direita) para não bater no pin 22**, rótulo "Patrocinador". Tamanho `--d: clamp(34px, 5.4cqi, 70px)`; alvo ≥ 44 px. Primeira pintura: `placeholder` + 1024, e o `srcSet`
só liga depois do `onLoad`. Reserva: a arte com bandeiras (`--com-bandeiras`) duplicaria o desenho — **não usar com este `Mundo.jsx`**.

Plano original (referência das medidas):

**Um botão por casa, não por unidade** (hoje o `Mundo.jsx` faz 41 botões empilhados em 27 pontos); as unidades aparecem no cartão da casa. Fonte: `casas`
(`unidades` segue para a rota). **Agora a identificação é o pin com a logo da casa** (número discreto), desenhado por código **na posição de `ponto`/`centro`**; o botão cobre o pin. As medidas abaixo
foram tiradas das bandeiras e valem como tamanho de referência do pin.

- **Alvo:** centrado em `centro`, ≥ 44 × 44 CSS px (`max(44 px, 2·raio·largura)`). A bandeira mede 0,0508 da largura da arte: 35 px no celular no zoom 1 (palco de 686 px = 62 % da altura
  × proporção), 45 px no desktop (890), 78 px no zoom 2,25 do celular.
- **Distância mínima** entre bandeiras: **0,0567 da largura** (a **22 · Paneer** e a Sicredi Natal); depois 0,0699 (1 e 3), 0,0707 (21 e 22), 0,0754 (6 e 15), 0,0761 (4 e Sicredi São
  Gonçalo). Os alvos de 44 px deixam de se sobrepor quando a largura do palco ≥ 44 / 0,0567 = **776 px**: no celular no zoom 1 (686 px) só o par 22 / Sicredi Natal se toca (39 px entre
  centros); a partir do zoom 1,5 (1029 px) nenhum par se toca; no desktop (890 px) nenhum. **Desambiguação:** no zoom 1 do celular, encolher os dois alvos desse par a 38 px (o
  desenho dos dois já se encosta no canto — pendência de arte); de resto, z-index pela ordem do teclado (número crescente), e Sicredi acima da casa só onde se tocam.
- **Selos de estado** ancorados em `selo` (canto superior direito do pano), **fora do numeral**: o numeral ocupa x 55–106 e y 48–83 da imagem de 152×156 px da bandeira, e o canto do
  pano (136, 29) fica a 35 px dele = 0,0143 da largura (**≈ 10 px no celular no zoom 1**, 13 no desktop, 22 no zoom 2,25). Selo de **raio ≤ 0,012 da largura**: ~16 px de diâmetro no zoom 1
  (só a forma: ✓ · ! · +N), até ~24 px no zoom 1,5, onde cabe o glifo/contador. **Anel** de próxima casa: centrado em `centro`, raio ≥ 26 px (fora do pano), tracejado, sem tapar nada; o
  rótulo "Próxima" fica **abaixo do pé do mastro** (`ponto`), nunca sobre o desenho. Revisitas: contador "×N" ao lado do selo, a partir do zoom 1,5.
- **Estados distinguíveis sem depender de cor**, cada um com forma própria: *não visitada* = a bandeira como está (nada por cima); *carimbo pendente / falta avaliar* = selo "!" (ampulheta)
  + anel pontilhado fino; *conquistada* = selo "✓" cheio; *revisitas* = "✓" + contador "×N"; *próxima* = anel tracejado grosso + rótulo. A bandeira nunca é recoberta.
- **Texto:** o estado vira nome falado do botão (`TC.casaNoMundo`: "3. Bolomania, tema Divertida Mente, conquistada, 2 revisitas, parada 1 da sua rota, sua próxima casa") e linha do cartão;
  a legenda dos estados (já existe em `Legenda.jsx`) lista as formas. Ordem do teclado: pelo número da legenda.
- **Sicredi:** botão próprio (`sicredi[]`), alvo ≥ 44 px, rótulo "Patrocinador", **nunca** selo de estado, fora das contagens e do ranking; "Como chegar" pelas coordenadas oficiais já registradas.
- **Aviso:** a arte é ilustrativa. `avisoIlustrado` fica no componente (a faixa assada foi cortada); posições de bandeira **não são coordenadas reais**.
- **Ainda de pé na integração:** carregar `base.placeholder` → `base.src` → `srcSet`; esconder a bandeira desenhada e o número do `Mundo.jsx` antigo quando `arteComBandeiras`;
  com `aprovada: true` e o `Mundo.jsx` atual, ligar `MAPA_PUBLICO` **antes** da integração mostraria marcadores duplicados sobre as bandeiras.

### 4.1 · Pins que se cobrem (06/11/2026)

Nenhum pin cobre outro, nos três mapas (ilustrado, Google e MapLibre). Fonte única da conta: `src/edicao/componentes/mapa/afastar.js` (função pura,
testada em `tests/cartoon-afastar.test.mjs`); o desenho do fio e do selo mora em `pin.js` (mapa real) e `Mundo.jsx` (ilustrado), o CSS em `11-mundo.css`.

- **Colisão em pixels de tela.** Cada pin entra com a ponta (o ponto verdadeiro) e a caixa. Caixas que se tocam formam um grupo (por contágio).
- **Grupo de até 6 pins (12 de perto):** cada pin vai para um lugar de um anel em volta do grupo, o mais perto do seu ponto, sem cruzar fios e sem que um corpo cubra o ponto verdadeiro de outro. Um **fio fino com bolinha** liga a ponta do pin deslocado ao ponto verdadeiro.
- **Só o desenho se desloca.** No mapa real a coordenada do marcador não muda (o deslocamento é `--dx/--dy`, em px, e o fio é outro marcador preso à coordenada real, então não sai do lugar ao arrastar nem ao ampliar). No ilustrado o fio nasce no `ponto` da arte.
- **Estável.** A ordem vem do `id`; só o zoom muda o desenho (recalculado quando o zoom assenta, nunca durante o arrasto).
- **Grupo grande demais** (mais de 6 de longe, mais de 12 de perto) vira um **selo com a contagem** (alvo de 44 px) que, ao tocar, aproxima o mapa ao menos 2 níveis; a partir do zoom 16 nunca há selo. O selo também é obstáculo: pin ou selo que ele cobriria entra no grupo. O pin escolhido nunca some num selo, e todos continuam na lista e na busca.
- **Google:** o marcador é o próprio botão (`gmpClickable`, `gmp-click`); o invólucro `gmp-advanced-marker` não pega o toque.
- **Teste de navegador:** `node tests/cartoon-mapa-layout-navegador.mjs` (porta 5213; `MAPA_LAYOUT_CAPTURAS=<pasta>` grava as capturas) mede, em celular e desktop, em vários zooms, na tela cheia e com o aparelho deitado: sem rolagem lateral, nenhum pin cobre outro, centro de todo pin livre para o toque, fio terminando no ponto verdadeiro e selos de 44 px.

## 5 · Casas, legenda oficial e banco

Tabela completa: bandeira (nº da legenda) → nome na legenda → slug no banco → posição do pé do mastro na imagem exportada → nº de unidades.
"Banco" = `participacoes` da edição 2026.2 (status do cadastro / do combo, lido em 05/11, só leitura).

| Nº | Nome na legenda | Tema | Slug | Posição (x · y) | Unid. | Banco: cadastro / combo | Vizinha |
|---|---|---|---|---|---|---|---|
| 1 | Adocee Doceria | Guerreiras do K-pop | `adocee-doceria` | 0.8389 · 0.1622 | 1 | completo / aprovado | 0.070 |
| 2 | Boldfood Confeitaria Inclusiva | Ursinhos Carinhosos | `boldfood-confeitaria-inclusiva` | 0.5329 · 0.6059 | 1 | completo / aprovado | 0.091 |
| 3 | Bolomania | Divertida Mente | `bolomania` | 0.8610 · 0.2562 | 1 | completo / aprovado | 0.070 |
| 4 | Caffè Basilico's | Lilo & Stitch | `caffe-basilicos` | 0.0706 · 0.4106 | 1 | em preenchimento / rascunho | 0.076 |
| 5 | Canuto's | Pica-Pau | `canutos` | 0.9494 · 0.6904 | 1 | completo / aprovado | 0.151 |
| 6 | Carcará | Chico Bento | `carcara` | 0.7284 · 0.7314 | 1 | em preenchimento / rascunho | 0.075 |
| 7 | Caroli Douces | Moranguinho | `caroli-douces` | 0.3493 · 0.7072 | 5 | aguardando cadastro / rascunho | 0.099 |
| 8 | Casa 1190 Restaurante e Coffee | Os Flintstones | `casa-1190-restaurante-e-coffee` | 0.5550 · 0.3889 | 1 | em preenchimento / rascunho | 0.084 |
| 9 | Casa Alice Doceria | Alice no País das Maravilhas | `casa-alice-doceria` | 0.6791 · 0.5577 | 1 | completo / aprovado | 0.079 |
| 10 | Cookitos | Garfield | `cookitos` | 0.4394 · 0.6494 | 3 | completo / aprovado | 0.098 |
| 11 | Delicato Bolos | Ursinho Pooh | `delicato-bolos` | 0.0773 · 0.7941 | 1 | completo / aprovado | 0.200 |
| 12 | Diva do Café | Moana | `diva-do-cafe` | 0.6009 · 0.0825 | 1 | em preenchimento / rascunho | 0.140 |
| 13 | Jolie Café Pâtisserie | Cinderela | `jolie-cafe-patisserie` | 0.2711 · 0.2441 | 4 | completo / aprovado | 0.106 |
| 14 | Just Food&Coffee | Toy Story | `just-food-e-coffee` | 0.6400 · 0.4612 | 1 | completo / aprovado | 0.079 |
| 15 | Maison Julie Douceur | A Pantera Cor-de-Rosa | `maison-julie-douceur` | 0.8032 · 0.7435 | 1 | completo / aprovado | 0.075 |
| 16 | Mangai | Sítio do Picapau Amarelo | `mangai` | 0.6349 · 0.7072 | 3 | em preenchimento / rascunho | 0.095 |
| 17 | Mariana's Confeitaria | Bob Esponja | `marianas-confeitaria` | 0.7335 · 0.1477 | 2 | completo / aprovado | 0.077 |
| 18 | Marlon Vinicius - Confeitaria e Café | Scooby-Doo | `marlon-vinicius-confeitaria-e-cafe` | 0.7369 · 0.2562 | 1 | completo / aprovado | 0.077 |
| 19 | Mr. Cupcake Confeitaria | Caverna do Dragão | `mr-cupcake-confeitaria` | 0.5244 · 0.7338 | 2 | completo / aprovado | 0.091 |
| 20 | O Maestro Café | Aladdin | `o-maestro-cafe` | 0.0604 · 0.1235 | 1 | completo / aprovado | 0.203 |
| 21 | Padoca do Bosque | As Meninas Superpoderosas | `padoca-do-bosque` | 0.4309 · 0.3503 | 1 | completo / aprovado | 0.071 |
| 22 | Paneer Pâtisserie | Os Simpsons | `paneer-patisserie` | 0.3680 · 0.3045 | 1 | em preenchimento / rascunho | 0.057 |
| 23 | Parma Doces | Looney Tunes | `parma-doces` | 0.5193 · 0.2803 | 1 | em preenchimento / rascunho | 0.084 |
| 24 | Sabor de Pão | O Grinch | `sabor-de-pao` | 0.7794 · 0.6301 | 1 | completo / aprovado | 0.083 |
| 25 | Sweet Duo Confeitaria | Enrolados | `sweet-duo-confeitaria` | 0.2405 · 0.6059 | 1 | em preenchimento / rascunho | 0.130 |
| 26 | Vivianne Castro Doces | Teletubbies | `vivianne-castro-doces` | 0.6009 · 0.8375 | 1 | completo / aprovado | 0.098 |
| 27 | Wow Cookies | O Laboratório de Dexter | `wow-cookies` | 0.6281 · 0.2996 | 2 | completo / aprovado | 0.096 |

Total: 27 casas e 41 unidades (soma da coluna Unid.). **Sem divergência de nome, tema, número ou duplicidade**: legenda, retrato local e banco
coincidem nas 27 casas; os temas da legenda são os do painel. Conferência bandeira por bandeira: `tests/capturas-caca-redesign/mapa-final/verificacao-pontos.png` (ponto amarelo no pé do mastro, círculo = raio, caixa preta = bandeira, anel verde = `selo`).

**Sicredi** (separadas, fora da contagem de casas; marcadores = as 3 bandeiras brancas com o símbolo, cada uma sobre um prédio verde e branco). A arte **não nomeia** qual é qual: atribuição por
geografia desenhada e pela fala do Wilker de 04/11 ("depois da ponte"):

| Marcador (esq. → dir.) | Agência (dado em `sicredi.js`) | Posição (x · y) | Precisão no mapa real |
|---|---|---|---|
| ao pé da ponte | Sicredi São Gonçalo do Amarante | 0.0451 · 0.5165 | confirmada (localizador + Google, 03/11) |
| centro-norte, perto da orla | Sicredi Natal (sede) — Rua Tuiuti, 765 | 0.4012 · 0.2444 | confirmada |
| extremo sul, junto às dunas | Sicredi Shopping Cidade Verde — Av. Ayrton Senna, 1995, L28/L29 | 0.9297 · 0.3649 | confirmada, **número em conferência** |

## 6 · Pendências e dúvidas (não corrigidas em silêncio)

1. **Qual marcador é qual agência** (acima) é inferência; confirmar com o Wilker (impacto: só a posição ilustrativa de cada agência).
2. **Cidade Verde: 1995 × 2349** (Google) segue sem confirmação com a Sicredi; coordenadas e endereços só os já registrados em `sicredi.js`.
3. **Numeração alfabética × "Ordenar pelo caminho do mapa":** **resolvido em 05/11** — `ordemDoCaminho` e `ordemDasCasas` (próximo passo) agora vão **de cima para baixo no desenho** (norte → sul, empate da esquerda
   para a direita); o botão diz "Ordenar de norte a sul no mapa". A ordem do teclado/legenda segue o número. O `14 §14.12` ainda descreve a numeração antiga por rota.
4. **Bandeira 22 (Paneer) encosta na bandeira da Sicredi Natal** no desenho (canto, ~2 % da largura); o teste registra esse único toque. Arte, se quiser separar.
5. **Verso do .ai incompleto** (sem QR, letreiro da Caça, ícones, mãozinha, trilha) — o PNG de 21:14 tem; o `.ai` é o que vale para a frente, mas não para o verso.
6. **Caroli Douces** é a única casa em `aguardando_cadastro` e tem bandeira (7) e 5 unidades; no banco outras 8 casas estão com combo em rascunho (listadas na tabela). Quais entram no total da Caça é decisão
   do servidor (`total_casas`); a arte mostra todas as 27.
7. **Marcos** (Forte, Ponte, Arena, Morro) têm posição lida a olho (ilustrativa). O Morro do Careca é a duna no canto superior direito.
8. **Integração:** com `aprovada: true`, não ligar `MAPA_PUBLICO` antes de o `Mundo.jsx` novo esconder a bandeira/o número desenhados por código (§4).
