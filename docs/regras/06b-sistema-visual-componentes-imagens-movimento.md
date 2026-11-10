<!-- Parte das regras do projeto. Índice: src/CLAUDE.md. Movido sem reescrita de src/CLAUDE.md em 10/11/2026. -->

### 6.10 Componentes

**Casca (global):**

| Componente | Classe | Arquivo |
|---|---|---|
| Raiz | `.scw-raiz` | `scw-2026.css` |
| Cabeçalho | `.scw-header`, `.scw-header__linha`, `.scw-header__veu` | `nav.jsx` |
| Menu de desktop | `.scw-nav` em **cápsula** (`--scw-chapa-menu`, chocolate a .76) | `NavPrincipal` em `nav.jsx` — usado pelos DOIS cabeçalhos (site e Edições). ✅ Desde 12/10/2026 os links não dependem mais de a foto do herói ser escura ali: na cápsula o creme fecha **6,4:1 com foto branca atrás** (antes ficavam ilegíveis sobre a faixa clara do Sebrae em Participar). Sem desfoque: atrás há crossfade (§10.3) |
| Aviso de cookies | `.cookie-consent` + diálogo `.scw-pref` | `CookieConsent.jsx` + `PreferenciasCookies.jsx`; preferência em `src/lib/consentimento.js` (fonte única: `scw_privacidade` com versão, escolha, data e validade de 180 dias); Analytics em `src/lib/analytics.js` (o `index.html` não traz mais o gtag). **Modelo desde 13/10/2026 (pedido do Wilker, "coletar todos os dados possíveis", aviso simples): medição LIGADA por padrão, base declarada = legítimo interesse, recusa a um clique.** O aviso é uma frase ("Usamos cookies para entender as visitas e melhorar o site. Saiba mais") e dois botões: **"Ok, entendi"** (amarelo, principal) e **"Recusar"** (contorno, visível). Aparece até haver escolha salva; Global Privacy Control chega recusado. Região nomeada, não modal. Desktop: cartão de 400px no canto inferior direito (~124px). ≤900px: faixa acima da barra de abas (~119px, texto no piso de 15px) — **não cobre a ação dos heróis** (`tests/casca-institucional.mjs`, estrito). ⚠️ Em `localhost` o Analytics não liga (testes e DEV não viram visita), salvo `localStorage.scw_ga_local = "1"`. A altura real vai para `--scw-aviso-h`; peça da página presa à base declara `--scw-base-ocupada` com `useReservaDaBase` (a barra fixa de Participar/Apoiar) e o aviso sobe acima dela. O diálogo (interruptor + "Salvar") abre por `abrirPreferencias()`: rodapé (em todas as páginas, Edições inclusive), folha "mais" e a Política de Cookies |
| Marca | `.scw-marca` → `MARCA_SCW` = `/images/logo-seal-sweet-coffee.svg` | `nav.jsx` (const exportada, reusada pelo rodapé) |
| Navegação | `.scw-nav` | `nav.jsx` |
| Chapa das barras da base | `.scw-casca-base` | `scw-2026.css` — fixa, `rgba(43,14,6,.96)`, `blur(14px)`, filete de creme a .14. **Duas peças a usam**: a barra de abas do site e a barra da ação da `/em-breve`. ⚠️ O chocolate é mais fundo que `--scw-choco` de propósito: sob desfoque a chapa clareia com o que passa atrás |
| Barra inferior mobile | — | `MobileTabBar.jsx` (**5 abas, ≤900px**) — compõe `.scw-casca-base` |
| Folha "mais" | `.scw-folha*` | `MobileMenu.jsx` |
| Painel (organização + marca) | `.og-*` / `.pn-*` | `painel-app/` — app React, entry Vite próprio, servido em `/painel`, `/organizacao` e `/marca` por rewrite (`docs/PAINEL-REACT-MAPA.md`) |
| Diálogo de acesso | `.scw-acesso*` | `AccessDialog.jsx` — duas faixas (topo chocolate + corpo creme), botão "Acesso" **com rótulo**, sem marca-d'água. **Os dois cartões têm peso diferente de propósito**: Organização em chapa chocolate com ação amarela; Participante em card bege com filete sólido e **ação chocolate** (14,46:1). A régua de 5px segue a ordem dos cartões: cyan à esquerda, roxo à direita. ⛔ Não igualar os dois. ⚠️ **Mas o motivo do peso mudou em 25/08/2026, e a regra antiga não vale mais:** até então o cartão do participante era **reserva honesta** (§6.12) — moldura tracejada, selo "Painel · em breve", sem ação — porque `/marca/` não existia. Existe desde 25/08, e o diálogo é a **única porta pública do domínio** enquanto o gate está ligado: manter o selo seria a interface negando a área que ela abre, para a marca que acabou de receber as credenciais. Tracejado e selo saíram; o peso hoje diz **público**, não disponibilidade. ⚠️ **Desde 25/08/2026 a ação do cartão também não é mais `<a>`:** igual à Organização, ela abre um passo de login dentro do MESMO diálogo (nome do estabelecimento + senha), com Supabase Auth de verdade — ver §6.10-b, ponto 4. **Reformulado em 22/08/2026 e 25/08/2026** (§6.10-b) |
| Voltar ao topo | `.scw-topo` | `BotaoTopo.jsx`, flutuante, aparece após **1,5 tela**. **Só o ícone** desde 18/09/2026 (pedido do Wilke): disco chocolate de 46px, `aria-label` e o nome no hover/foco por `.scw-icone-rotulo--esquerda` (§6.11) |
| Rodapé | `.scw-footer*` | `SiteFooter.jsx` — **reconstruído em 14/10/2026**: marca · Explore (6 destinos em 2 colunas fixas) · Contato (Instagram + "Fale com a gente"); linha fina; documentos legais + "Preferências de cookies" (botão); base com direitos e realização. Celular: marca em cima, Explore e Contato lado a lado — o Contato desce para a linha toda quando o @ não cabe. Folgas: `--scw-aviso-h` + `--scw-base-ocupada` embaixo; o "voltar ao topo" ganha recuo à direita (desktop) ou 72px embaixo (com abas). `semLinks` tira Explore e "Fale com a gente" |
| Pular para conteúdo | `.scw-skip` | `nav.jsx` |

**Blocos:**

| Peça | Classe | Variações |
|---|---|---|
| Seção | `.scw-secao` | `--creme` `--bege` `--choco` `--marrom` `--compacta` |
| Card | `.scw-card` | `--destaque` |
| Botão | `.scw-btn` | — |
| Pill / selo | `.scw-pill` | `--bege` `--pagina` |
| Rótulo | `.scw-rotulo` | `--micro` `--com-icone` |
| Foto | `.scw-foto` | `--banner` `--retrato` |
| Abas | `.scw-abas`, `.scw-aba` | `__icone` `__rotulo` `__indicador` |
| Campo | `.scw-campo` | — |
| Marquee | `.scw-marquee` | `__palavra` `__ponto` |
| Reserva | `.scw-reserva` | — |
| Destaque | `.scw-destaque` | — |
| Métrica | `.scw-disco` + `.scw-numeral` | disco na cor do ciclo **+ ícone que diz do que o número fala** → numeral chocolate (`white-space: nowrap`) → rótulo. **Número sem ícone não existe** |

**Prefixos por página:** Home `.hm-` · Edições `.edx-` · Sweet Awards
`.swa-` · Contato `.ctt-` · Participar e Apoiar `.pa-`.

**Regra:** peça usada por **2+ páginas** vira utilitária `.scw-*` em `scw-2026.css`. Peça
de **uma página só** fica no CSS da página, com o prefixo dela. **Não criar um terceiro
lugar.**

**Pisos de toque:** **44px** para qualquer controle — inclusive link de texto e item de
acordeão — **46px** para pílula de ação dentro de card, **54px** no herói. ⚠️ **O piso
vale para o controle real, não para a linha que o contém.**

#### 6.10-b Tela de acesso — reformulada em 22/08/2026 e 25/08/2026

Pedido do Eloi, três frentes.

**1 · Entra pela borda, e cada tela tem a sua.** A caixa centrada acabou nas duas.

| Tela | Peça | Geometria | Entrada / saída |
|---|---|---|---|
| ≤900px | **folha**, a mesma da aba "mais" | colada na base, largura cheia, raio `30px 30px 0 0`, puxador dentro da faixa chocolate, `max-height: 88svh` | `scwFolha` 340ms · `moFolhaSai` 260ms |
| >900px | **gaveta** | colada à direita, do alto ao pé, **520px**, raio `30px 0 0 30px`, sombra para a esquerda | `moGavetaEntra` 340ms · `moGavetaSai` 260ms |

Mesmas durações e curvas da folha nas duas — **só a direção muda** (§6.15.7). A gaveta
tem 520px e não os 760px da caixa antiga: nessa largura os dois cartões empilham, que é
a leitura certa numa peça alta. Fechar é movimento nas duas: `.is-fechando` por 260ms
antes de desmontar, como o `MobileMenu`.
⚠️ A faixa chocolate + a régua ficam num invólucro `.scw-acesso__cabecalho` com
`position: sticky` — quem rola é a caixa, e sem isso o **X sai de cena** junto com o
conteúdo. Na gaveta alta, isso é perder a saída do painel.

**2 · "Entrar" não sai do diálogo.** O botão era um `<a>` para `/organizacao/` e a senha
era pedida lá. Agora o corpo do próprio diálogo **vira o campo de senha**.
⚠️ **Não há autenticação nova aqui — é a mesma, um passo antes.** A lógica vive em
`src/lib/adminAccess.js`, no padrão dos formulários (§4.1): a lib não importa supabase,
a `rpc` é injetada. Ela chama `admin_ping` e, **só com `=== true`**, grava a senha em
`sessionStorage.scw_org` — a chave que `public/organizacao/` **já lê na abertura** para
montar o painel direto. Mesma origem, mesma aba, mesma chave: nada novo é exposto, e a
senha continua morrendo com a aba.
**Nada afirma que entrou sem o banco confirmar**, e os quatro motivos têm recados
diferentes (`vazio`, `senha`, `rede`, `sessao`).

**3 · Contraste.** ⚠️ O rótulo "Falar com a equipe" estava **chocolate sobre chocolate,
1:1, invisível** desde que o pé foi desenhado — a armadilha nº 1 do §10.1 de novo:
`.scw-raiz a { color: inherit }` (0,1,1) vencia `.scw-acesso__cta` (0,1,0). Corrigido por
**prefixo de seletor**, nunca `!important`. O "Entrar" saiu de `<a>` para `<button>` e,
de quebra, saiu do alcance do mesmo reset: antes ele herdava creme e ficava creme sobre
amarelo (~1,4:1); agora é chocolate sobre amarelo, 9,5:1.
⚠️ **Peça que troca de `<a>` para `<button>` precisa de `border: 0` explícito** — senão
herda a borda `2px outset` padrão do navegador. E o hover de `.scw-acesso__acao` inverte
para creme, leitura que só funciona sobre a chapa chocolate do cartão: no passo da senha,
que mora no corpo creme, o botão inverte para **chocolate** (12:1), senão sumiria.

**4 · A marca entra pelo mesmo caminho — 25/08/2026.** Pedido do Eloi: *"a área da marca
deve funcionar igual a área de login da organização"*. Até então "Sou participante" era
um `<a href="/marca/">` puro — a pessoa saía do diálogo direto para o formulário estático,
sem nenhuma casca da folha/gaveta. Agora ele abre o passo `'marca'` no MESMO diálogo,
desenho idêntico ao passo da organização, só o selo trocando para roxo (a cor do próprio
cartão na escolha).
⚠️ **A autenticação NÃO é a senha compartilhada da organização.** `/marca/` já usava
Supabase Auth de verdade (e-mail sintético `<slug>@marcas.…` + senha, §10.4-b) — o diálogo
só antecipa esse MESMO passo, em `src/lib/marcaAccess.js` (mesmo padrão de
`adminAccess.js`: lib pura, `signIn` injetado, sem import de supabase). A sessão gravada
em `sessionStorage.scw_marca` é o formato exato que `sessaoSalvar()` de
`public/marca/index.html` já produz (`access_token`, `refresh_token`, `expira_em`
calculado, `email`) — é por isso que `window.location.href = '/marca/'`, já autenticado,
abre direto no painel em vez de pedir login de novo.
⚠️ **`slugificar`/`enderecoDeLogin` viraram TRÊS cópias**, não duas: a página estática, a
Edge Function `criar-acesso-marca` e agora `marcaAccess.js`. Com a saída de
`public/marca/index.html` (corte para o painel React) restam **duas**, e
`tests/painel-infra.test.mjs` ("as duas slugificações que restam casam") compara as
duas — divergir uma faz a marca digitar o nome certo e não entrar, com erro genérico de
propósito.
🔴 **A brecha que isso quase abriu:** `public/marca/index.html` decidia, no boot, "achei
sessão em sessionStorage → `carregar()` direto", sem checar `deve_trocar_senha`. Era
seguro só porque a ÚNICA forma de a sessão nascer era o próprio formulário, que sempre
passava por essa checagem antes. Com o diálogo plantando sessão por um segundo caminho,
esse atalho puparia a troca de senha obrigatória do primeiro acesso — a marca cairia no
painel ainda com a senha que veio por WhatsApp (§10.4-b). Corrigido: o boot agora chama
`precisaTrocarSenha()` sempre que acha sessão pronta, **não importa de onde ela veio**.

**5 · Os dois formulários na mesma tela — 25/08/2026.** A partir do handoff
"Painel SCW app" (`painel-scw.html`), os três passos do diálogo (escolha →
senha → marca) viraram **um**: os dois cards já carregam o campo e o botão de
entrar, sem clique intermediário para revelar o formulário. Cada card é o
próprio `<form>`, com erro e envio independentes — os dois ficam visíveis ao
mesmo tempo. ⚠️ **A cor dos selos trocou**: Organização passa a **amarelo**
(era cyan), Participante passa a **cyan** (era roxo/transparente) — a régua de
5px abaixo do cabeçalho segue a mesma troca. O campo de identidade da marca
virou dois (nome **e** senha): o handoff mostra só um campo ("Login da
marca"), mas entrar de verdade exige senha (Supabase Auth) — um campo a mais
aqui é a leitura compatível, não um desvio do desenho. "Primeiro acesso da
marca" é um link que revela uma nota, não uma tela nova: o primeiro acesso já
usa os MESMOS dois campos, e quem troca a senha é `/marca/`, depois do login
(item 4 acima) — duplicar aqui a tela de senha nova seria um segundo caminho
para o mesmo passo (§5.2).
⛔ **REVERTIDO no item 6 abaixo (27/08/2026).**

**6 · A escolha volta a ser passo próprio, e o botão de entrada padroniza —
27/08/2026.** Pedido do Eloi. Dois ajustes juntos:

- **Três estados, não um.** `passo` (`'boasVindas' | 'organizacao' | 'marca'`)
  em vez dos dois formulários sempre visíveis do item 5. Abre em
  `'boasVindas'`: título **"Bem-vindo ao Painel SCW"**, lead, e os MESMOS dois
  cartões de antes — mas sem campo nenhum, só ícone + "Sou da organização" /
  "Sou participante" + descrição. O cartão inteiro é o gatilho (`<button
  type="button">`, não mais `<form>`) que troca `passo`. Clicar leva à tela de
  login correspondente, com um "‹ Voltar" que só troca `passo` de volta — não
  limpa o que já foi digitado (só fechar o diálogo limpa tudo, efeito que já
  existia). **Nada mudou na autenticação** — `enviarOrg`/`enviarMarca`,
  `RECADO`/`RECADO_MARCA`, tudo igual; só a ORDEM DE REVELAÇÃO voltou a ser
  passo próprio.
  ⚠️ **`.scw-acesso__cartao` virou alvo de `<button>` também** (era só
  `<form>`): ganhou `border:0; background:none; appearance:none; font:inherit`
  na regra base — mesma armadilha do item 3 acima (borda 2px outset do
  navegador), resolvida na fonte em vez de repetida por cartão. Só os dois
  cartões de ESCOLHA levam o modificador `.scw-acesso__cartao--escolha`
  (`width:100%; cursor:pointer`) — os de login continuam `<form>`, sem isso.
  Hover/press (`translateY(-3px)`/`scale(.985)`) já existiam na classe base e
  vieram de graça pros dois cartões novos.
- **Botão de entrada padronizado em todo o site: ícone `ChaveIcon` + texto
  "Painel SCW".** Antes eram três variações — `.scw-acesso-topo` (nav.jsx +
  Edicoes.jsx, que já duplicava a mesma marcação) dizia "Acesso" com
  `ChaveIcon`; `.scw-folha__acesso` do MobileMenu dizia "Área de acesso" com
  um SVG de pessoa desenhado à mão, sem relação com o resto do sistema. Os
  três agora dizem "Painel SCW"; o MobileMenu trocou o SVG solto por
  `ChaveIcon` importado de `nav.jsx` — mesma peça, três lugares, zero ícone
  inventado.
  ⚠️ **`redes/perfil` existe no sistema oficial** (§6.11) e é visualmente quase
  idêntico ao SVG de pessoa que saiu — mas é ícone **expressivo** (piso 24px),
  e os três botões usam 18–20px. `ChaveIcon` (hand-rolled, fora de
  `scw-icons-v2.js`, já usado em dois dos três antes desta mudança) continua
  sendo a peça certa nesse tamanho — não um ícone improvisado.
  ✅ **Desde 14/10/2026 `ChaveIcon` é adaptador do desenho `chave` (v3, §6.11), 20px** —
  o traço 2.4 cravado e o desenho próprio saíram.
  ⚠️ **No topo, desde 18/09/2026, é SÓ o ícone** (pedido do Wilke: "só o ícone,
  mas discreto"). O botão do cabeçalho virou o componente **`AcessoTopo`**
  (`nav.jsx`), usado pelos dois cabeçalhos — o do site e o próprio de Edições,
  que repetiam a marcação. Disco de 44px em creme a 78%, chave chocolate de
  18px, sem texto e sem relevo; o nome "Painel SCW" aparece no hover e no foco
  (`.scw-icone-rotulo--esquerda`) e é o `aria-label`. ⛔ **Não tirar o disco:**
  o cabeçalho é fixo e passa por herói cyan, foto escura e seção creme sob
  véu — a chave solta sumiria em pelo menos um. A folha "mais" do celular
  segue com ícone + texto: ali é item de lista, não botão flutuante.
- **`public/painel/index.html` ganhou a MESMA reversão, mesmo dia.** A tela de
  login estática (`.pn-porta`) tinha o próprio desenho — dois `.pn-setor`
  sempre visíveis, nunca passou pela fusão de 25/08/2026 nem pela reversão do
  React ao mesmo tempo — e ficou divergente do diálogo do site: duas telas de
  "entrar no painel" com desenhos diferentes é exatamente a confusão que a
  reversão do item 6 tentava resolver. Mesmo padrão agora: `#pnEscolha`
  (default) mostra os dois `.pn-setor--escolha` sem campo (`<button>`, não
  `<form>`), `#pnOrg`/`#pnMarca` (escondidos por `hidden`) carregam os forms
  reais, cada um com "‹ Voltar" (`.pn-porta__voltar`) chamando
  `verEntrada('escolha')`. `ver('login')` sempre reseta pra `'escolha'` — reabrir
  o login (inclusive depois de `sair()`) nunca pousa num formulário de senha
  achado. `.pn-setor` ganhou o mesmo reset de chrome nativo do
  `.scw-acesso__cartao` acima (`border:0; appearance:none; text-align:left;
  font:inherit; width:100%`), e só o modificador `.pn-setor--escolha` leva
  `cursor:pointer`.

### 6.11 Iconografia v3 (14/10/2026)

Nova direção pedida pelo Wilker. **Fonte, regras de desenho e processo: `icones/README.md`**
(inventário da migração em `icones/INVENTARIO.md`). Resumo do que vale sempre:

- **Fonte versionada:** um `.svg` por significado em `icones/{interface,expressiva,marcas}/`.
  `npm run icones` valida e gera `src/components/scw-icons/gerado/` — ⛔ o gerado não se
  edita à mão. `scw-icons-v2.js` está aposentado (sem importador).
- **Duas famílias, um nome; o tamanho escolhe:** interface 16 · 20 · 24 (grade 24, traço
  ótico 1,5 → 2 px) e expressiva 32 · 48 · 64 (grade 48, 2,5 → 3,7 px). Nada entre eles.
- **Componentes:** `ScwIcon` (as duas famílias) · `IconeUi` (só interface — casca do site:
  menu, abas, rodapé, diálogo) · `Icone` no painel. Contrato: `nome`, `tamanho`, `titulo`.
- **Tamanho é o atributo:** ⛔ CSS não redimensiona ícone (`svg{width}` em contêiner). O
  disco é que cresce; o desenho fica na escala. Exceção declarada: `.hm-ing__icone`
  (anatomia, 58% do disco fluido).
- **Cor:** `currentColor` sempre. Decorativo = `aria-hidden`; informativo = `titulo`
  (vira `<title>` de verdade — nunca HTML concatenado).
- **Botão só com ícone:** nome no `aria-label` + `.scw-icone-rotulo`, desenho 20 em alvo 44.
- **Estado:** desenho distinto + texto + cor. Carregando = `carregando` + `.scw-gira`.
- **Sem SVG solto em tela e sem caractere como ícone** — `npm run test:icones` reprova,
  junto com nome inexistente, tamanho fora da escala e catálogo defasado.
- **Inspeção visual:** `npm run dev` → `/icones/galeria.html` (fora do build e da navegação).

### 6.12 Imagens

**Fonte única:** todo caminho de imagem sai de `src/data/imageLibrary.js`. **Nenhum
componente monta caminho na mão** — `tests/imagens.test.mjs` reprova; exceções
conscientes ficam na allowlist do próprio teste.

| Pasta (`public/images/`) | Conteúdo |
|---|---|
| `combos/<slug>/` | fotos dos combos por participante |
| `edicoes/<code>/` | **fotos** — acervo normalizado das 16 edições (`NN.webp`) |
| `marcas-edicoes/<code>/logo.png` | **marca** de cada edição (16) |
| `momentos/` | fotos institucionais de público e evento |
| `campanha/` | peças de campanha |
| `imprensa/` | material de imprensa |
| `shapes/` | formas de apoio (restam 2 com função) |
| `logos/participants/` | logos reais dos participantes |

**Regras de uso:**

- Foto real sempre que existir; `object-fit: cover`; proporção preservada; alt adequado.
- **Logo preenche 100% do slot** (11/09/2026): logo de participante e marca de edição
  usam `object-fit: cover` no slot inteiro — o arquivo já traz fundo e respiro próprios, e
  `contain` com margem interna soma respiro em cima de respiro, deixando a marca pequena
  no meio de um vazio. ⛔ Nunca `contain` com margem interna. Sem logo, iniciais sobre
  bege. **Nunca inventar logo** — `resolveParticipant` com fallback em iniciais.
  ⚠️ A regra vale para o **slot de marca**, não para toda imagem de logo: a marca da F2
  e a logo do cabeçalho são assets de proporção própria e seguem como estão.
  ✅ **O PAINEL segue a mesma regra (01/10/2026, pedido do Wilker):** `LogoMarca` /
  `.ui-logo` preenche 100% da caixa com `cover`, sem margem interna. A exceção de
  29/09/2026 (`contain` com margem) foi revogada — ver §10.4-b, Fase 15.
- **Coerência de conteúdo é obrigatória:** página de edição mostra fotos daquela edição;
  página de participante mostra o participante certo; **Sweet Awards mostra a peça
  premiada** (Melhor Doce → o doce, Melhor Salgado → o salgado, Melhor Bebida → a bebida,
  demais → o combo); página histórica não usa só imagem da edição atual; herói usa imagem
  do assunto da página.
- Proporções em uso: **1:1** (pódio, galerias) e **4:5** (card de 1º lugar no desktop,
  vira 1:1 até 820px).

⛔ **Nada gerado por IA entra como registro do festival.** O acervo externo tem pelo menos
uma peça assim, que imita um mapa com lista de participantes em texto deformado. **Uma
peça gerada que finge ser material real é dado inventado por outro meio.** Sinais de
alerta ao varrer acervo: nome de arquivo tipo "Imagem N gerada", texto ilegível ou
derretido em rótulos, logo com forma inconsistente. **Na dúvida, ampliar e ler o texto da
peça antes de usar.**

**Logos oficiais da Cartoon (15/10/2026, decisão do Wilker):** a fonte única é a pasta
`10_LOGOS_PARTICIPANTES/PRINCIPAIS` da edição no Dropbox (26 PNGs em alta resolução, conferidos por ele).
O site carrega `public/logos/participants/<slug>.png` em até 800 px, gerado por
`python scripts/sincronizar-logos-oficiais.py` — **trocar logo = trocar o arquivo na pasta e rodar o script**, nunca
editar o PNG do repositório. Marca que só existe na Cartoon (fora do registro Lovers) entra em
`src/data/logosAcervoExtras.js`, não em `PARTICIPANTS` (que alimenta as páginas históricas). O banco guarda o
caminho em `acervo_logos` (`node scripts/acervo-logos-para-sql.mjs`) e a logo de cada marca em `logos_marca`
(`origem = 'acervo'`). A página pública da edição usa `urlDaImagem` (`src/edicao/dados/modelo.js`): caminho que
começa com `/` é arquivo do site, não do Storage.

**Padrão de nome de arquivo** — o nome explica o conteúdo, **sem** parêntese, espaço,
acento, `final`, `novo`, `cópia` ou número de versão solto:

| Padrão | Exemplo |
|---|---|
| Foto de edição | `edicoes/<code>/NN.webp` |
| Marca de edição | `marcas-edicoes/<code>/logo.png` |
| Combo de participante | `combos/<slug>/main.jpg` |
| Logo de participante | `logos/participants/<slug>.png` — **gerado** por `scripts/sincronizar-logos-oficiais.py` a partir da pasta oficial (abaixo); não editar à mão |
| Foto de acervo numerada | `<pasta>/NN.jpg` |
| Peça de campanha | `<assunto>-<variante>.png` |

**Identidade em disco:**

| Arquivo | Status |
|---|---|
| `/images/logo-seal-sweet-coffee.svg` | ✅ **marca oficial do cabeçalho e do rodapé** |
| `/images/logo-sweet-coffee-week.svg` | ✅ wordmark grande — landing `/em-breve` |
| `/images/logo-f2experience.svg`, `/images/f2-symbol.svg` | ✅ marca da realizadora — seção 07 da Home |
| `/images/logo-sweet-coffee-week-header.svg` | ⚠️ sem uso — mantido |
| `/logos/lockup-scw-creme.svg` | ⚠️ sem uso — **não é a marca do cabeçalho** |
| `/images/logo-f2-experience.svg` (com hífen) | ⚠️ sem uso — a viva é sem hífen |
| `/images/selo-10-anos.svg` + `.png`, `/videos/video-selo10anos.webm` | ⚠️ sem uso — mantido |

**Favicons:** `favicon-sweet.svg` (mestre vetorial) + PNG 32, 48, 96, 192 e
`apple-touch-icon` de 180. Seis em disco, seis declarados no `index.html`.

⚠️ **Acervo não referenciado não é lixo.** As fotos sem página apontando para elas são
acervo do festival. **Não remover conteúdo do festival só porque não aparece na Home.**
Ao usar uma, registrar em `imageLibrary.js`.

**Ausência de imagem:** **reserva honesta** (`.scw-reserva`) — moldura editorial, borda
sutil, fundo da paleta, texto curto ("Foto pendente" / "Galeria pendente"), proporção
definida. **Nunca área vazia sem explicação, nunca imagem aleatória externa, nunca
hotlink, nunca esconder a ausência.**

### 6.13 Elementos gráficos e ilustração

- Todo elemento visual precisa de **função**: estruturar layout, indicar hierarquia,
  representar dado, organizar conteúdo, apoiar fotografia, reforçar identidade. Sem
  função clara → remover.
- **Teste:** *"esse elemento carrega informação ou só enfeita?"* Carrega → fica. Enfeita
  → sai.
- **A regra proíbe decoração gratuita, não elemento visual funcional.** Medalhas,
  pódios, selos de 1º lugar e destaques de categoria **codificam colocação e resultado**
  — são funcionais. Indicador de dado e feedback de UI também.
- ⛔ **Não usar stickers por padrão nas institucionais.** Só em material de campanha ou
  página específica, quando solicitado explicitamente.
- **Página Edições:** linguagem editorial, histórica, fotográfica — **não** estética de
  sticker ou colagem.
- **Ilustração:** hoje o site é **photo-first** e não há ilustração autoral em produção.
  Se entrar: flat artesanal, textura de pincel, formas simples, cores chapadas da paleta,
  aparência autoral, composição editorial, leitura rápida. **Evitar:** 3D, sombra
  realista, acabamento excessivamente digital, cartoon infantil, elemento genérico de
  banco, excesso de detalhe, estética sem relação com Natal ou com o festival.
- **Sweet Lovers = comunidade de fãs, nunca casais românticos.** Podem aparecer amigos,
  famílias, pessoas sozinhas, grupos, gente fotografando combo, seguindo rota, avaliando.

### 6.14 Responsividade

**Escala canônica: 1000 · 900 · 820 · 760 · 420.** Não existe token de breakpoint (CSS
não aceita `var()` em `@media`) — **a consistência é por convenção.**

| Ponto | Significado fixo |
|---|---|
| **1000px** | herói vira dois blocos empilhados — foto em cima, texto embaixo |
| **900px** | a casca vira aplicativo: logo perde o overhang (52px), botão de acesso do topo some, entra a **barra inferior de 5 abas** |
| **820px** | card de 1º lugar do Awards passa de 4:5 para 1:1; a grade de vencedores vira **carrossel de arrasto com snap** |

- Testado em 320, 360, 375, 388, 390, 430, 768, 1024, 1280, 1440, 1544 e 1920 — sem
  rolagem horizontal e sem texto cortado.
- Viewports do script Playwright: 390×844 · 414×896 · 430×932 · 768×1024 · 1024×768 ·
  1366×768.
- **Valor fora da escala só quando o conteúdo exigir ponto próprio — nunca por inércia ou
  cópia. Não renumerar em massa breakpoints já calibrados.**
- **Alvo de toque mínimo 44px no celular**, auditado em 390px nas 6 rotas.
- Mobile: evitar sticky horizontal complexo; evitar overflow lateral; manter leitura
  clara; botões tocáveis; reorganizar grades em coluna; manter logos e fotos
  proporcionais.

### 6.15 Movimento

**Fonte única do institucional:** `src/styles/scw-motion.css` + o motor
`src/hooks/useSiteMotion.js`. ⛔ `src/styles/motion-system.css` é o sistema **anterior** e
sobrevive **só** para a landing `/em-breve` — **não usar em página nova.** O mesmo vale
para `useRevealOnScroll.js` e para as classes `.motion-reveal-left/right`,
`.motion-button-hover`, `.motion-press`, `.motion-float-soft`, todas **removidas** do
institucional.

**Ritmo — uma escala, quatro degraus:**

| Token | Valor | Onde |
|---|---|---|
| `--mo-rapido` | **180ms** | botão, link, ícone |
| `--mo-estado` | **300ms** | hover de card, acordeão, cabeçalho, menu |
| `--mo-entra` | **620ms** | entrada de texto, bloco e card |
| `--mo-longo` | **880ms** | herói e imagem grande |
| `--mo-passo` | **90ms** | intervalo entre itens de uma sequência |
| `--mo-passo-card` | **70ms** | card a card dentro de uma grade |

**Quatro camadas — para que serve cada duração** (Caderno cap. 09, 11/09/2026). Os tokens
não mudam; o que entra é o critério de quando cada um cabe:

| Camada | Token | Gatilho | Repetição | No celular |
|---|---|---|---|---|
| **1 · Resposta** | `--mo-rapido` 180ms | ação direta | a cada ação | igual, sem hover |
| **2 · Continuidade** | `--mo-estado` 300ms | navegação | a cada troca | 260ms; folha sobe de baixo |
| **3 · Narrativa** | `--mo-entra` 620ms | seção entra na tela | **uma vez por sessão** | deslocamento 22 → 14px, degrau 70ms |
| **4 · Atmosfera** | 26–28s, linear | carga da página | infinita, **com pausa** | só um por tela |

**Resposta** confirma que o sistema ouviu: botão, chip, ícone, validação — e o gesto é o
deslocamento de 1px no `active` e de 4px na seta, nunca o `gap` do botão crescendo.
**Continuidade** diz que mudou de lugar, não de página: abas, acordeão, folha, filtro.
**Narrativa** estabelece hierarquia pela ordem de entrada. **Atmosfera** é o único
movimento sem gatilho — e por isso **a pausa visível é obrigatória**, nunca escondida no
hover.

⚠️ **Atmosfera nunca carrega informação.** A faixa de rótulos repete o que já está escrito
na página; se a animação não rodar, nada se perde. **Conteúdo que só existe dentro de um
laço contínuo é conteúdo que alguém vai perder** — foi por isso que a fita de galerias da
Home (28/09/2026) e o giro automático da galeria de Edições (12/10/2026) saíram.

⚠️ **Marquee — invariante de laço.** Em faixa contínua com duas cópias e
`translateX(-50%)`, **metade da largura tem que ser exatamente uma cópia**. `gap` no
contêiner animado quebra isso e o laço salta a cada volta: o espaçamento vai como
`padding-right` **dentro** de cada cópia. ✅ `.scw-marquee` já faz assim — conferido em
11/09/2026; a regra existe para a próxima faixa, não para corrigir esta.

⛔ **A faixa de palavras NÃO tem pausa em página nenhuma — exceção declarada, decisão
do Wilke em 18/09/2026.** O botão `<Marquee comPausa />` (15/09/2026) existia só em
Participar e saiu a pedido dele, avisado de que isso descumpre a camada 4 e a WCAG 2.2.2
(nível A). Com ele saíram a prop, `.is-pausado` e `.scw-marquee__pausa`.
✅ **Desde 14/10/2026 a faixa está logo abaixo do herói em Participar, Apoiar, Sweet
Awards e Contato** (pedido do Wilker: "em todas as páginas, exceto a principal e
Edições"). Palavras: Participar e Apoiar em `src/data/conteudo/*.js` (`PALAVRAS`, as
listas que usavam até 12/10); Awards = categorias da edição em destaque; Contato = os
assuntos da central (`faqCentral`), ambos derivados. A da Home saiu em 28/09/2026. Fora do institucional, a landing `/em-breve` monta a
marcação `.scw-marquee` direto em `EmBreve.jsx`, sem o componente. São essas faixas que
descumprem a camada 4 hoje. O que ainda segura: com `prefers-reduced-motion` a faixa não anda, e ela é `aria-hidden` — repete o
que a página já diz (atmosfera nunca carrega informação). Se a regra voltar a pesar, o
caminho é religar a pausa na fonte (`Marquee.jsx`), não página a página.
A utilitária `.scw-icone-rotulo` (`data-rotulo`, `--esquerda`) **fica**: é a peça do
§6.11 para botão só com ícone, usada pelo som do palco de depoimentos e pelo botão Topo.

**Curvas:** `--mo-ease` (saída suave, **igual a `--scw-ease`**) · `--mo-mola` (chegada que
pousa) · `--mo-suave` (laços de ida e volta).

**Deslocamento:** `--mo-y` 22px · `--mo-y-titulo` 30px · `--mo-y-texto` 14px · `--mo-x`
26px · `--mo-desfoque` 6px. **Abaixo de 900px todos encolhem e o desfoque zera.**

**Como o motor decide.** O JSX **não** carrega classe de animação. `useSiteMotion` varre a
página, guarda **só a ocorrência mais externa de cada ramo** (um `<p>` dentro de um card
dentro de uma grade não é item próprio — a grade é) e carimba:

- `data-mo="sobe|titulo|texto|foto|lado"` — o tipo de entrada;
- `--mo-i` — posição na sequência; **reinicia a cada `<section>` e a cada `.scw-rotulo`**;
- `data-mo-grade` + `--mo-j` nos filhos — cards entram um a um, **teto de 8 degraus**.

**Contrato de marcação (12/10/2026).** A seção diz o que quer por atributo, em vez de o
motor conhecer as classes de cada página:

| Atributo | Efeito |
|---|---|
| `data-mo-fora` | nada ali dentro anima — herói, formulário, central de dúvidas, área de consulta |
| `data-mo-sequencia` | os filhos diretos entram um a um (cards, passos, faixa de números) |
| `data-mo-bloco` | entra como um bloco só (lista longa) |

`ul`/`ol`/`dl` já entram em sequência sozinhos. As listas de classes de página que ainda
existem no motor são legado anterior ao contrato — **seção nova usa só os atributos**.

**Fica de fora:** heróis (coreografados por `@keyframes`), página Edições (arquivo de
consulta: coleção e galeria aparecem prontas), **formulários e a central de dúvidas** (quem chega para preencher ou consultar
não espera uma entrada animada — ficam disponíveis de imediato), e **qualquer elemento
`position: fixed` ou `sticky`** — barra presa à base nunca entra na zona de disparo do
observer e ficaria invisível para sempre.

**Rede de segurança:** revelar um item revela também **todos os anteriores** na ordem do
documento, e o que já está acima da tela na varredura aparece direto. Sem isso, um salto
por âncora (índice do Awards, "Ver as perguntas") ou a rolagem restaurada pelo navegador
deixava os blocos pulados invisíveis.

**Páginas em chunk próprio (12/10/2026).** Cada página carrega sob demanda
(`React.lazy`, `src/pages/carregadores.js`). O motor roda em `MovimentoDaPagina`, **dentro
do `Suspense`** do `App.jsx`: o efeito só dispara quando a página real montou. Um efeito
no próprio App rodaria com o fallback na tela, não acharia nada e deixaria a página sem
movimento — é o que `tests/casca-institucional.mjs` confere navegando entre rotas.

**Salvaguarda:** o estado oculto **só existe sob `html.scw-mo-on`**, classe que o próprio
motor adiciona. Script que não carrega, navegador sem `IntersectionObserver` ou
`prefers-reduced-motion` ligado → **nada é escondido**.

**Regras para criar movimento novo:**

1. reusar as classes e atributos existentes quando bastarem;
2. classe nova **sempre consumindo os tokens `--mo-*`**;
3. animar **só** `transform`, `opacity`, `filter` e `scale` — **sem layout shift**;
4. respeitar `prefers-reduced-motion`, **sempre**, escrito junto;
5. não instalar biblioteca de animação nova sem justificativa;
6. **hover só onde existe ação. Card sem link não sobe** — elevação sem destino é
   decoração e promete algo que não acontece.
7. **Nada de curva ou duração nova.** Se um handoff pedir um tempo que não está no
   sistema, o certo é perguntar, não inventar.

**Movimentos em produção:**

- **Heróis** — sequência foto → selo → título → apoio → ação, com atrasos de 140 a 760ms.
  Em Awards a banda surge e o texto sobe atrás dela.
- **Ciclo da anatomia** (Home 02) — quatro desenhos por ingrediente em 8,8s. Desde
  28/09/2026 é o **único laço contínuo** da Home, além dos crossfades (abertura e, desde
  14/10/2026, a foto de combos da 02, com pausa): a faixa
  de palavras, a respiração das fotos e as fitas saíram dela.
- **Crossfade dos heróis** — 6,2s por foto, relógio único em `useCrossfade.js`, com o
  botão `PausaFotos` sempre que há rotação (§6.9). ⛔ A **respiração da imagem** (laço
  `alternate` em `scale`) e o token `--mo-respiro` saíram em 13/10/2026: nenhum elemento
  os usava desde que os heróis viraram crossfade (§10.3).
- **Transição de página** — `main.page-enter` em **opacidade, 300ms. Sem transform, de
  propósito** (ver §10.3).
- **Cabeçalho** — `.is-rolado` adensa o véu no desktop e recolhe o overhang da logo.
  **Não encolhe altura nem move a logo** — a geometria é regra estrutural.
  ⚠️ **No celular (≤900px) `.is-rolado` faz o cabeçalho SAIR de cena** (opacidade 0 +
  `pointer-events: none`, volta em `:focus-within` por causa do "pular para o
  conteúdo"). Motivo: abaixo de 900px `.scw-nav` e `.scw-acesso-topo` estão em
  `display: none` — sobra só a marca, e a navegação inteira mora na barra de abas.
  Uma barra fixa com conteúdo decorativo passava por cima do texto rolado (o rótulo
  "A anatomia do combo" virava "TOMIA DO COMBO") e o véu, longe do herói, lia como
  mancha marrom sobre a seção creme. Abaixo de 40px de rolagem nada muda: o herói
  continua como desenhado. **A landing `/em-breve` fica de fora** (`--so-acesso`) —
  ali o cabeçalho reduzido é a única porta de acesso (§10.4-b).
- **Menu mobile** — entra por `scwFolha` com itens escalonados; sai por `.is-fechando`
  (260ms) e só então desmonta.
- **Edições** — ken burns `scale(1.06) → scale(1.001)` em 12s; wipe direcional
  (`clip-path: inset()`) de 820ms escalonado 0/110/220ms; deriva de fundo em 46s.

**Seção ou página nova herda o movimento do sistema** — revelação no scroll, cascata dos
filhos, press dos botões, `is-rolado` no cabeçalho, zoom lento nas fotos. **Componente
novo sem movimento é componente incompleto.** E **um patch de layout não toca animação
existente** a menos que diga explicitamente que toca.

---

### 6.16 Cards — seis famílias, comportamento próprio

**Revisão de 11/09/2026** (Caderno cap. 05). **Interativo não é subir 2px.** Cada família
de conteúdo responde do seu jeito, e o essencial fica visível **sem hover**. Teclado e
toque fazem o mesmo caminho do ponteiro.

| Família | Comportamento próprio |
|---|---|
| **Participante** | fundo vira bege, filete escurece, seta avança 4px. O card inteiro é o link |
| **Combo** | foto protagonista 1:1; troca de foto **só por escolha** — crossfade 620ms, a que entra chega em `scale(1.04)` e assenta em 880ms; indicador alonga 8 → 28px |
| **Edição** | expande a curiosidade **no lugar** (300ms, seta gira), sem sair da lista. O botão de destino leva a cor da página de destino |
| **Percurso** | seleção com **três pistas simultâneas** — chapa vira a cor do destino, disco cresce, ponto preenche. Nunca só cor. Funciona como `radiogroup` |
| **Editorial** | resumo → detalhe crescendo no lugar (620ms): a foto recua de 1,04 para 1 e o véu sobe. Sem modal para conteúdo curto |
| **Operacional** | a situação muda em disco + numeral + texto da próxima ação, tudo junto |

**Anatomia comum.** Raio 20, padding 20. **Três superfícies legítimas:** creme com filete
(lista, operação) · fotográfica (foto sangrada, véu chocolate, tinta creme) · chapada (cor
da paleta com a tinta que passa). **Nunca branco.** Rodapé do card em `margin-top: auto`
para irmãos fecharem na mesma altura.

**Estados.** Inicial já diz tudo que importa · hover em 200ms muda **cor**, nunca só
sombra · foco é o anel cyan de 3px · toque responde com `active` de 1px · seleção com
três pistas · expansão no lugar, 300–620ms.

⚠️ **Hover só onde existe ação, e isso não mudou** (§6.15, regra 6). Card sem link não
sobe e não acende: elevação sem destino promete o que não acontece. Nas rotas e nas
etapas da Home quem leva ao destino é o CTA — por isso o card ali não tem estado, e isso
é decisão, não falta.

**Prazo e situação em card operacional:** numeral à direita, separado por filete vertical
— dígito grande em Slab Black, unidade em caixa-alta embaixo. ⛔ **Não usar filete
colorido na lateral do card** (genérico) **nem selo pousado na borda** (colide com o card
vizinho). Respondido vira disco chocolate com a marca de feito.

⛔ **Evitar:** flip que esconde texto · inclinação 3D · informação que só aparece no hover
· card inteiro clicável com botão dentro sem área própria · autoplay de fotos dentro de
card · card idêntico para conteúdos diferentes — participante não é combo, combo não é
edição.

**No celular:** raio cai de 20 para **16** dentro de trilha ou agrupador; **hover não
existe** — o retorno é o `active`; participante vira linha (logo 64px, nome, seta); combo
mantém a foto 1:1 em largura total e a troca vira gesto de arrastar com os mesmos
indicadores; editorial fica em 4:5 e a expansão abre **abaixo** da foto, não sobre ela.

---

