# Iconografia SCW v3 — fonte, regras e uso

Direção nova pedida pelo Wilker em 14/10/2026. Substitui a v2 (traço único 3.2 em
todo tamanho, exportada do Claude Design). Site e painel leem **o mesmo registro**.

## Onde está cada coisa

| Peça | Caminho | Edita? |
|---|---|---|
| Desenhos de interface (grade 24) | `icones/interface/*.svg` | **sim — é a fonte** |
| Desenhos expressivos (grade 48) | `icones/expressiva/*.svg` | **sim — é a fonte** |
| Marca de terceiro (Instagram) | `icones/marcas/*.svg` | só com o glifo oficial |
| Grade, traço por tamanho, margens, CSS gerado, páginas estáticas | `icones/especificacao.json` | sim |
| Nome antigo → nome novo | `icones/aliases.json` | sim |
| Gerador | `scripts/icones/gerar.mjs` | só para mudar o processo |
| Catálogo gerado (site + painel) | `src/components/scw-icons/gerado/` | ⛔ nunca à mão |
| Núcleo de renderização | `src/components/scw-icons/registro.jsx` | raramente |
| Galeria de inspeção (só no dev) | `icones/galeria.html` → `http://localhost:<porta>/icones/galeria.html` | — |
| Inventário da migração | `icones/INVENTARIO.md` | — |

`src/components/scw-icons/scw-icons-v2.js` é a **v2 aposentada**: ninguém importa mais;
fica no repositório até o Wilker autorizar a remoção. A fonte dela ("Iconografia
Sistema.dc.html") mora só no projeto "SITE SCW" do Claude Design, que não aceita
escrita por ferramenta — por isso a fonte passou a viver aqui, versionada.

## Como editar e gerar

1. Abra/crie o `.svg` na pasta da família (Illustrator, Figma, editor de texto). Um
   arquivo por significado; o nome do arquivo é o nome do ícone (kebab-case, sem acento).
2. O arquivo aceita só: `<svg viewBox="0 0 G G">`, `<title>` (o significado — obrigatório),
   `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, e `class="detalhe"` (traço fino)
   ou `class="solido"` (preenchido). **Sem cor, sem `stroke-width`, sem `transform`, sem
   `style`** — a especificação decide. Exportou de ferramenta? Limpe esses atributos.
3. `npm run icones` — valida e regenera o catálogo, o CSS de marcadores e as regiões
   marcadas das páginas estáticas. Erro de regra = nada é gravado.
4. Confira na galeria, em tamanho real e nos cinco fundos.
5. `npm run test:icones` — reprova catálogo defasado, nome inexistente no código, tamanho
   fora da escala, SVG solto em tela e glifo de texto como marcador.

Nome antigo que precisa continuar valendo → `icones/aliases.json`. Alias nunca pode ter o
mesmo nome de um desenho nem apontar para nome inexistente (o gerador recusa).

## As duas famílias

Mesma personalidade (terminal e junção redondos, cantos com o mesmo raio relativo, massa
centrada no centro óptico); complexidade e espessura diferentes.

| | Interface | Expressiva |
|---|---|---|
| Para quê | navegação, ações, arquivos, pessoas, estados, operação | gastronomia e símbolos do festival: anatomia do combo, disco de número, destaque |
| Grade · área útil | 24 · geometria entre 2 e 22 | 48 · geometria entre 4 e 44 |
| Tamanhos | **16 · 20 · 24** | **32 · 48 · 64** |
| Traço (unidade da grade → px na tela) | 2,25 → 1,5 px (16) · 2,1 → 1,75 (20) · 2 → 2 (24) | 3,75 → 2,5 px (32) · 3,2 → 3,2 (48) · 2,8 → 3,7 (64) |
| Detalhe interno | 85% do traço | 70% do traço |
| Raio de canto | 2 (1,5 em peça pequena) | 4 |
| Vão entre traços paralelos | eixo a eixo ≥ 4,25 | eixo a eixo ≥ 7 |
| Ponto, migalha, acento | círculo **preenchido** r 1,1–1,6 — nunca anel minúsculo | preenchido, livre |
| Traços por desenho | até 5 | até 8 (aviso acima disso) |

O traço é **ótico**: proporcionalmente mais grosso no menor tamanho, para o desenho não
sumir em 16px nem pesar em 64px. Por isso o tamanho vem sempre do atributo — CSS não
redimensiona ícone.

**O tamanho escolhe a família.** Um nome pode ter os dois desenhos (`cupcake`, `coxinha`,
`xicara`, `combo`, `calendario`, `edicao`, `historico`, `coracao`, `moedas`): até 24px
aparece o de interface, de 32px para cima o expressivo. Pediu tamanho sem desenho daquela
família? Aparece o outro e o console do dev reclama; o teste reprova o literal.

**Alinhamento óptico:** a massa visual vai ao centro, não a caixa — `play` desloca para a
direita, `atendimento` sobe a sineta, a coxinha centraliza o corpo e não a ponta. O
gerador avisa quando o centro geométrico foge mais de 1/16 da grade, para conferir.

## Usar no código

```jsx
import ScwIcon from '../components/scw-icons/ScwIcon'   // as duas famílias (seções, painel)
import IconeUi from '../components/scw-icons/IconeUi'   // só interface (casca do site)
import { Icone } from './Icone'                          // painel — mesmo registro

<ScwIcon nome="cupcake" tamanho={64} />                  // decorativo: aria-hidden
<IconeUi nome="busca" tamanho={20} />
<Icone nome="sucesso" tamanho={16} titulo="Aprovado" />  // informativo: role=img + <title>
```

- **Decorativo por padrão** (`aria-hidden`). Com texto ao lado, não ponha `titulo` —
  duplicaria o anúncio. Ícone que informa sozinho recebe `titulo`.
- **Botão só com ícone:** o nome vai no botão (`aria-label`); o desenho de 20px fica num
  alvo de 44px (`.scw-icone-rotulo` no site; no painel, `BotaoIcone` sem contorno e
  `Botao soIcone`/`LinkIcone`/`MaisAcoes` com a variante do botão). Tooltip complementa,
  não substitui — no toque ela não existe, então só vira ícone o desenho universal.
- **Compartilhar tem dois desenhos, de propósito:** o botão abre as opções DO APARELHO, e
  o desenho é o dele (`ICONE_COMPARTILHAR` no painel): `compartilhar-ios` (quadrado com
  seta) no iPhone/iPad, `compartilhar` (três pontos) no resto.
- **Estado nunca só por cor:** selo = desenho distinto + texto + cor (`ICONE_TOM`).
- **Carregando:** `nome="carregando"` + `className="scw-gira"` (para sozinho com
  movimento reduzido). `BotaoIcone` com `aria-busy` troca sozinho.
- **Marcador em CSS** (painel): variáveis de `gerado/icones.css` — `--icone-feito`,
  `--icone-exclamacao`, `--icone-abrir`, `--icone-avancar` (máscara na cor do texto) e
  versões pintadas para disco colorido. Caractere (`✓ ! ›`) como ícone não volta.
- **Página estática** (`public/quero-participar/`): escreva
  `<!--icone:nome:24--><!--/icone-->` e rode `npm run icones`; o gerador preenche.
- **Rede social:** Instagram é o glifo da marca (proporção oficial), traço fixo, nunca
  disco nem cor do SCW. **WhatsApp não tem asset oficial no repositório** — o botão usa
  `mensagem` com o texto "WhatsApp" até alguém trazer o SVG da brand page (A4: não se
  desenha logo de memória).

## Decisões desta versão

- **Anatomia do combo** (Home 02): capa = cupcake · coxinha · xícara com pires e vapor; o
  ciclo segue mostrando exemplos (fatia de bolo, donut, picolé · pão de queijo, croissant,
  sanduíche · copo para viagem, suco, milkshake) — exemplo ilustra a categoria, não promete
  produto. O coador saiu (não representa "bebida"); o pastel foi reprovado na galeria
  (lia como velocímetro) e deu lugar ao croissant; a coxinha ganhou base plana, pescoço
  côncavo, ponta torcida e migalhas para não ler como gota ou chama.
- **Significados corrigidos:** `contatos` era um coração → cartão de contato;
  `engrenagem` era um sol de raios → controles deslizantes (`configuracoes`); `pedidos`
  era o triângulo de alerta → documento com exclamação (`pedido`); "Copiar link" usava a
  seta de link externo → `copiar`; `medalha` lia como símbolo de Touro → fita + disco com
  estrela; Criatividade e Apresentação (Awards) tinham a mesma estrela → `tema` e `estrela`;
  Participações e Combos vendidos (Home) tinham o mesmo desenho → `loja` e `combo`.
- **Um desenho por ação:** a v2 do site e o registro do painel tinham dois desenhos para
  fechar, voltar, chevron, baixar, pessoa, chave… Agora é um só, com alias para os nomes
  antigos dos dois lados.
