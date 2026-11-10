<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Desde 10/11/2026 este arquivo é só índice: a abertura do §7 e o §7.8 ficam aqui; §7.1–7.7 e §7.9 foram movidos sem reescrita para docs/regras/07-*.md. -->

## 7 · As páginas

> ⚠️ **Linguagem de participação desde 03/11/2026** (pedido do Wilker: "pré-cadastro precisa sair… tudo sobre
> participação é para a próxima edição"). A Cartoon já tem as casas confirmadas: o texto público não diz mais
> "pré-cadastro" nem "inscrição aberta"; os botões dizem **"Registrar interesse"** e Participar/Apoiar falam das
> **próximas edições**, sem prometer vaga (§8.4). Onde este capítulo citar "Fazer pré-cadastro" ou "pré-cadastro
> aberto", leia "Registrar interesse" / "registro de interesse". Ficaram como estavam, por serem código: o
> `status: 'pre-cadastro'` de `src/data/proximaEdicao.js`, as âncoras `#pre-cadastro` e a rota `/quero-participar/`.

**Antes de mexer numa página, abra o arquivo dela** — seções, decisões e o que já
foi reprovado moram lá. Mudou a página? Corrija o arquivo dela no mesmo commit.

| Seção | Arquivo (`docs/regras/`) |
|---|---|
| §7.1 Home / O Festival — `/`, amarelo | `07-1-home.md` |
| §7.2 Edições — `/edicoes` e `/edicoes/<código>`, laranja | `07-2-edicoes.md` |
| §7.3 Sweet Awards — `/sweet-awards` e `/historico-sweet-awards`, roxo | `07-3-sweet-awards.md` |
| §7.4 Participar — `/participar`, cyan | `07-4-participar.md` |
| §7.5 Apoiar — `/apoiar`, marrom · §7.6 Contato — `/contato`, bege | `07-5-07-6-apoiar-contato.md` |
| §7.7 Em breve — `/em-breve` (e a galeria das 16 edições) | `07-7-em-breve.md` |
| §7.9 Documentos legais — `/privacidade`, `/cookies`, `/termos`, `/uso-de-imagem` | `07-9-documentos-legais.md` |
| §7.8 Como manter — o caminho curto de cada pedido | aqui, abaixo |

### 7.8 Como manter — o caminho curto de cada pedido

Desde 12/10/2026 cada página do institucional é uma pasta (`src/pages/<pagina>/`) e
cada página carrega no próprio chunk (`React.lazy` via `src/pages/carregadores.js`).
`src/pages/institutional/*.jsx` só reexporta — **não editar ali**.

| Pedido | Onde mexer |
|---|---|
| Mudar uma seção (layout, ordem interna, peça) | `src/pages/<pagina>/secoes/<Secao>.jsx`. A ordem das seções está no `index.jsx` da pasta |
| Mudar texto | `src/data/conteudo/<pagina>.js` (`home`, `edicoes`, `sweet-awards`, `participar`, `apoiar`, `contato`). JSX não guarda texto (§5.6). Perguntas da central: `src/data/faqCentral.js` |
| Trocar foto | `src/data/imageLibrary.js` (`heroPhotos`, `fotosHome`, `fotoGanho`…). ⛔ **Nunca `imageVariants.js`** — é gerado por `scripts/gerar-variantes.mjs` |
| Ligar/desligar o destaque de edição na Home | **Ligado desde 13/10/2026.** `src/data/destaqueEdicao.js`: `ativo` liga/desliga; tema, período e ano vêm de `proximaEdicao.js` (nunca escritos aqui); lettering, fundo e vídeo de `fotoProximaEdicao()` em `imageLibrary.js`; o link do reel é `REEL_LANCAMENTO`; a ação só existe com pré-cadastro aberto. Obrigatórios: `titulo`, `tema`, `periodo`, `texto`; vídeo, marca e ação são opcionais, mas inteiros. Faltou um campo, `destaqueValido()` devolve `false` e a abertura institucional continua — nunca um bloco pela metade. Conferir com `npm run test:destaque`. Nada liga por data, e não mexe em flag de publicação (sob o gate atual a Home nem aparece). Decisão do Wilker, nunca automática |
| Validar antes de commitar | `npm run build && npm run test:casca-institucional` · `npm run test:motion` (depois de um build) · `node tests/responsive.mjs` — e o build de verificação fora do projeto (§3.2 da raiz) |

---

