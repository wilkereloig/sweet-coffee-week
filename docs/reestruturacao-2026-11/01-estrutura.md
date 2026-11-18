# 01 · Estrutura

## 1. Quem chega e o que procura

| Público | Pergunta que traz | Onde o site responde | Ação que queremos |
|---|---|---|---|
| **Sweet Lovers** (público) | O que é? Quando é a próxima? Quem ganhou? Posso opinar? | Festival, Edições, Sweet Awards, Dúvidas (sugestão pelo Contato) | Seguir o Instagram, dar opinião, voltar na próxima edição |
| **Casas** (cafeterias, docerias, restaurantes) | Vale a pena? Como entro? Quanto trabalho dá? | Participar, O festival em Natal, Marcas | Registrar interesse |
| **Casas que já participaram** | Onde vejo meu histórico? Onde dou minha opinião? | Marcas (ficha da casa), Painel SCW | Opinar no painel, voltar |
| **Empresas** | Quem é o público? Quem já apoiou? Onde minha marca aparece? | Apoiar, O festival em Natal | Abrir conversa de apoio |
| **Imprensa e criadores** | Tem número? Tem história? Com quem falo? | O festival em Natal, Edições, Dúvidas | Escrever para a organização |
| **Organização** | O que chegou? O que as pessoas estão dizendo? | Painel SCW | Ler, responder, publicar |

## 2. Mapa de páginas

| Página | Rota | Papel | Estado |
|---|---|---|---|
| **Festival** | `/` | O que é, como funciona, a edição mais recente e as três portas | existe; reordenar e reescrever |
| **O festival em Natal** | `/impacto` | O que o festival movimenta: casas, cidade, cultura, redes, imprensa | **nova** |
| **Edições** | `/edicoes`, `/edicoes/<código>` | O acervo por ano, por tema e por marca | existe; ganha duas entradas |
| **Marcas** | `/marcas`, `/marcas/<marca>` | As 131 marcas: edições, combos e prêmios de cada uma | **nova** |
| **Sweet Awards** | `/sweet-awards` | Reconhecimento: resultado, como a nota é dada, Hall, histórico | existe; reescrever |
| **Participar** | `/participar` | Vender a participação para casas | existe; reescrever |
| **Apoiar** | `/apoiar` | Vender o apoio para empresas; mostrar quem apoiou a última edição | existe; reescrever |
| **Dúvidas** | `/contato` | Central de dúvidas por público e formulário | existe; reorganizar |
| **Registro de interesse** | `/quero-participar/` | Formulário das casas | existe; duas perguntas a mais |
| **Painel SCW** | `/painel/` | Organização e casas | existe; ganha "Escuta" |
| **Documentos legais** | `/privacidade`, `/cookies`, `/termos`, `/uso-de-imagem` | Privacidade e uso de conteúdo | existem; atualizar |

A rota `/contato` não muda de endereço, só de rótulo no menu ("Dúvidas"). Assim nenhum link antigo quebra.

## 3. Navegação

**Cabeçalho (seis itens):**
Festival · Edições · Marcas · Sweet Awards · Faça parte · Dúvidas, mais o botão "Painel SCW".

"Faça parte" abre dois caminhos, cada um com uma linha de apoio:

- **Participar** — para casas que querem criar um combo
- **Apoiar** — para empresas que querem estar na próxima edição

**Abas do celular (cinco):** Festival · Edições · Awards · Faça parte · Mais.
"Faça parte" abre a mesma folha de dois caminhos. "Mais" traz Marcas, O festival em Natal, Dúvidas,
Instagram e documentos legais.

**Rodapé (três colunas):**

- *O festival:* Festival · O festival em Natal · Edições · Marcas · Sweet Awards
- *Faça parte:* Participar · Apoiar · Dúvidas
- *Acompanhe:* Instagram · Fale com a organização
- Linha final: realização F2 Experience · Política de Privacidade · Cookies · Termos · Uso de imagem

**Ligações entre páginas (o que impede beco sem saída):**

- Toda página termina com a próxima ação do seu público, nunca com as três ao mesmo tempo.
- Edição → marcas daquela edição → ficha da marca → prêmios da marca → Sweet Awards → edição premiada.
- Todo número exibido leva a "O festival em Natal", seção "De onde vêm os números".
- A chamada "Tem algo a dizer?" (sugestão pelo Contato, assunto "Sugestão ou opinião") aparece no fim da Home, de cada edição e do Sweet Awards.

## 4. Rotas novas e antigas

Novas (cada uma precisa de rewrite no `vercel.json` e de entrada em `tests/rotas-edicao.test.mjs`):
`/impacto`, `/marcas`, `/marcas/:marca`.

Continuam: `/`, `/festival`, `/edicoes`, `/edicoes/:codigo`, `/sweet-awards`, `/historico-sweet-awards`,
`/participar`, `/apoiar`, `/contato`, documentos legais, `/quero-participar/`, `/preencher/`, `/painel/`,
`/q/:codigo`, `/cartoon/*` (fora do ar, cai na Home).

Redirecionamentos a acrescentar: `/participantes` → `/marcas` (hoje cai na Home), `/casas` → `/marcas`,
`/opiniao` e `/sugestoes` → `/contato`, `/numeros` → `/impacto`.

## 5. Os momentos do site

O site tem cinco momentos. Cada um sai de fontes que já existem (`proximaEdicao.js`, `destaqueEdicao.js`,
`src/edicao/config.js`, `resultadosEdicao.js`); nenhuma fonte nova é necessária.

| Momento | Como o site sabe | Abertura da Home | Ação principal do público | Chamada de sugestão (Contato) pergunta |
|---|---|---|---|---|
| **1. Entre edições** | sem próxima edição anunciada, resultado divulgado | o festival | conhecer as edições | "Que tema você quer ver?" |
| **2. Edição anunciada** | `proximaEdicao` com tema e data | a edição que vem | salvar a data, seguir o Instagram | "O que não pode faltar?" |
| **3. Edição acontecendo** | interruptores da edição ligados | a edição (camada própria) | ver combos, avaliar | a avaliação de combos é o canal |
| **4. Resultado em apuração** *(hoje)* | `resultadosEdicao` em apuração | o festival + capítulo da edição | acompanhar o Sweet Awards | "O que você achou da Cartoon?" |
| **5. Resultado divulgado** | `resultadosEdicao` divulgado | o festival + vencedores | conhecer os vencedores | "O que você achou da Cartoon?" |

Para as casas, o convite muda junto: em 1 e 2, "Registrar interesse"; em 3, nada (inscrição encerrada);
em 4 e 5, "Sua opinião sobre a edição" no painel e "Registrar interesse para a próxima".

## 6. Como mostrar todas as edições

**Três entradas para o mesmo acervo** (`/edicoes`):

1. **Por ano** (padrão): de 2026 a 2016. É a coleção de hoje.
2. **Por tema**: a lista dos 17 temas, em ordem de edição, cada um com a marca da edição. Serve a quem lembra
   do tema e não do ano ("aquela dos Contos de Fadas").
3. **Por marca**: abre o diretório `/marcas`. Uma busca só no site.

**Detalhe da edição** (`/edicoes/<código>`), na ordem:

1. Ficha: tema, período, número de marcas, situação do Sweet Awards, marca da edição.
2. A história da edição: o texto que já existe (por que marcou, um destaque, o que ficou, curiosidades).
3. Os combos: um por marca, com o nome da marca; cada foto leva à ficha da marca.
4. As marcas da edição: lista completa, com ligação para cada ficha. Estreantes marcadas ("primeira vez").
5. Sweet Awards da edição: primeiro lugar de cada categoria, ou o aviso de apuração, ou "esta edição não teve premiação".
6. Lançamento: vídeo e reel, quando existirem.
7. Quem apoiou: só quando a base registra (hoje: 2019.2, 2021.2, 2022, 2024 e 2026.2).
8. Edição anterior e próxima.

Sem bloco de números por edição (decisão D8). O retrato em números existe só para a edição mais recente e
mora na Home e em "O festival em Natal".

**Acervo de fotos.** Dentro de cada edição, a galeria é navegável por marca. A foto ampliada mostra
"Marca · Edição" e o link "Pedir a retirada desta imagem" (`/uso-de-imagem`). Onde a edição só tem registro
geral (2016, 2017.1, 2018.2), a galeria diz isso: "Registros da edição. Os combos desta edição não têm foto
identificada por marca."

## 7. Marcas

**Diretório** (`/marcas`): as 131 marcas em ordem alfabética, com busca e quatro filtros:
"Na última edição" · "Já subiram ao pódio" · "Desde a 1ª edição" (estiveram em 2016) · "Todas".
Cada linha mostra nome, número de edições e, quando há, o selo de premiada.

**Ficha da marca** (`/marcas/<marca>`):

1. Nome e logo (logo só quando o acervo tem a oficial; senão, só o nome).
2. "Esteve em N edições": a lista dos temas, cada um ligado à edição.
3. Os combos da marca, edição por edição (fotos que o acervo tem).
4. Sweet Awards: as colocações da marca, por edição e categoria.
5. Instagram da marca, quando consta na base.
6. Marca encerrada ou que mudou de nome: nota curta ("Participou como …").

Sem endereço, horário, preço ou cardápio (regra §2.2). Contar edições por marca e listar prêmios é
comparação entre participantes, que é permitida.

**Dado:** tudo deriva de `sweetCoffeeHistory.js` (participantes por edição, nomes alternativos unificados),
`editionCombos.js` (fotos) e `awardsData.js` (prêmios). Nenhum arquivo novo de dado.

## 8. De onde vem cada conteúdo

| Conteúdo | Fonte única | Muda? |
|---|---|---|
| Edições, marcas por edição, apoiadores por edição | `src/data/sweetCoffeeHistory.js` | o campo `patrocinadores.parceiros` passa a ser lido pelo site |
| Números e formatação | `src/data/festivalFacts.js` | entram os fatos da Cartoon (arquivo 02) |
| Estado dos resultados | `src/data/resultadosEdicao.js` | não |
| Próxima edição | `src/data/proximaEdicao.js` | não |
| Textos das páginas | `src/data/conteudo/*.js` | reescritos (arquivo 03); entram `impacto.js` e `marcas.js` |
| Perguntas frequentes | `src/data/faqCentral.js` | reagrupadas por público; perguntas novas (arquivo 03) |

## 9. O que sai, o que se funde

- Home: "Em registros" e "Trajetória" fundem-se em "O festival em Natal" (resumo na Home, página completa em `/impacto`).
- Home: "Na imprensa" vai para `/impacto`.
- Home: "Realização F2" e o agradecimento da Cartoon fundem-se em "Quem faz o festival" (apoio da última edição + realização).
- Participar e Apoiar: os blocos de números passam a ler o mesmo conjunto de fatos da Home, sem lista própria.
- Contato: o assunto "Sugestão ou feedback" passa a se chamar "Sugestão ou opinião" e vira a porta de escuta do público (D4: sem página própria).
- Rota da Doçura: continua fora da estrutura até ter especificação. As nove perguntas da central ficam ocultas enquanto o produto não existir.
