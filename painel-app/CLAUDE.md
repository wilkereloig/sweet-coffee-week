<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

### 10.4-b Páginas estáticas fora do bundle

⚠️ **Desde 27/08/2026 o painel é o app React em `painel-app/`** (mapa em
`docs/PAINEL-REACT-MAPA.md`). Tudo abaixo que descreve `public/painel/`,
`public/organizacao/` ou `public/marca/index.html` como página estática é
**histórico**: esses HTML não existem mais; nas três pastas restam só `sw.js` e
`app.webmanifest`. As lições (sessão, RPC, push, SW) continuam valendo.

Existem **três**: **`/marca/`** (área da marca participante — login, definir senha,
cadastro da edição e status, tudo numa página que troca de view conforme o estado),
**`/quero-participar/`** (formulário de pré-cadastro) e
**`/organizacao/`** (painel interno da organização). Ficam em `public/`, fora do
React, e é isso que as mantém acessíveis com `COMING_SOON_PUBLICATION = true`
**sem tocar em flag nenhuma** (A3).

⚠️ **A barra final não é opcional.** Sem ela o servidor não resolve o índice do
diretório e a rota cai no fallback do SPA — ou seja, abre a landing. Medido no
build via `vite preview`: `/organizacao` → index.html do SPA · `/organizacao/` →
o painel. O `vercel.json` ganhou rewrite explícito para as três rotas como rede
de segurança em produção (a Vercel checa o sistema de arquivos antes dos
rewrites), mas **todo link interno escreve a barra**.

⛔ **O `redirectTo` do convite NÃO existe mais** — e com ele morreu a
dependência da allowlist de URL do projeto (Authentication → URL Configuration).
A entrega de acesso deixou de passar por link em 22/08/2026: ver "Como a marca
ganha conta", abaixo. **A barra final em `/marca/` continua obrigatória**, pelo
motivo do parágrafo anterior — resolução de índice de diretório —, não mais por
causa de token no `#hash`.

✅ **O dev server passou a servir essas páginas em 22/08/2026.** O Vite não faz
resolução de índice de diretório para `public/`, e por isso `/organizacao/`
caía no fallback do SPA e abria a landing — sintoma que **mentia**, porque uma
página abria, só que a errada. Estava escrito aqui e mesmo assim derrubou duas
pessoas no mesmo dia; virou código. O plugin `paginasEstaticasDev` em
`vite.config.js` é dev-only (`apply: 'serve'`), reescreve `/<nome>/` para
`/<nome>/index.html` quando o arquivo existe, e **redireciona 301 a forma sem
barra** — assim o DEV fica honesto com a produção e um link sem barra falha
onde custa barato. Rota do SPA sem pasta correspondente (`/participar`) segue
para o fallback normalmente.

⚠️ **`sessionStorage` é POR ORIGEM — foi o que quebrou o acesso ao painel.**
O diálogo grava `scw_org` e navega para `/organizacao/`, que lê a mesma chave
e abre direto (`if (senha) abrirPainel()`). Servir o painel de **outra porta**
para contornar o parágrafo acima não resolvia nada: a senha ficava na origem
do site e o painel lia o armazenamento dele, vazio. **O fluxo de acesso só
fecha quando uma única origem serve o SPA e `public/`** — hoje o `npm run dev`,
o `vite preview` e a produção. ⛔ Não testar esse fluxo com dois servidores.

🐛 **RPC `returns void` responde 204 SEM CORPO, e `r.json()` estoura em cima do
vazio** com "Unexpected end of JSON input" — erro que parece de rede e é de
leitura. Atingia **7 RPCs** e deixou cinco botões do painel mortos. O `rpc()`
dos painéis lê `r.text()` e só converte se vier conteúdo; há teste que executa
a função real.
⚠️ **A prova por `curl` não pega isso**: ela lê o corpo fora do caminho do
código. **Chamada por HTTP não é chamada pelo caminho do código.**

🐛 **`id` de elemento vira propriedade global, e isso matou o Turnstile.**
Um `<div id="turnstile">` define `window.turnstile`; o `api.js` da Cloudflare
abre com `if (window.turnstile) return`, guarda contra importar duas vezes.
Ele via a div, concluía que já tinha carregado e **saía sem renderizar** —
script buscado, executado, e nenhum widget na tela, só um aviso no console
dizendo "Turnstile already has been loaded". O alvo passou a ser
`#pa-turnstile` em 25/08/2026, e `tests/quero-participar.test.mjs` reprova o
nome de volta. **A regra é maior que o Turnstile:** `id` curto de elemento
colide com qualquer global que uma biblioteca de terceiro consulte antes de
se instalar.

⚠️ **O aviso do console foi descartado duas vezes como "ruído de recarga"** —
primeiro no navegador embutido, que nem chega a pedir domínio de terceiro, e
por isso produziu um diagnóstico convincente e falso. Só o Playwright contra
`localhost` (que está na lista de hostnames do widget) desmentiu. **Navegador
que não busca a rede não testemunha sobre a rede** — é a mesma lição do
§10.8, subida um nível.

⚠️ **O JS delas mora inline e não passa pelo Vite**, então `npm run build` fica
verde com o script quebrado. `tests/quero-participar.test.mjs` e
o antigo teste da organização (apagado no corte para o painel React; a cobertura hoje está em `tests/painel-app-*.test.mjs` e `tests/painel-infra.test.mjs`) cobrem esse vão: parse, funções **declaradas** (não
só citadas), escape de tudo que vem do banco e ausência de chave secreta.

**Acesso ao painel:** pelo cartão "Organização" do diálogo de acesso — inclusive
na `/em-breve`, que ganhou um cabeçalho reduzido só com o botão. Não há link em
menu nem rodapé, de propósito. A senha é a mesma de `admin_config` e só se
redefine por SQL (`select public.set_admin_secret($$…$$)`); o banco guarda só o
hash, então **ela não é recuperável**.

**Como a marca ganha conta (modelo de 22/08/2026, no ar desde então):** pela
ficha de uma candidatura **aprovada** do `/quero-participar` **ou** pelo cadastro
manual, no painel, de uma marca que nunca preencheu formulário. Os dois pontos de
entrada chamam a mesma Edge Function `criar-acesso-marca`, e **do slug para baixo
o caminho é idêntico** — é isso que impede o cadastro manual de escapar da trava
de primeiro uso.

⛔ **Não há mais convite por e-mail.** A função cria o usuário **com senha
gerada** (12 caracteres, `crypto.getRandomValues`, alfabeto sem I/O/0/1 porque a
senha vai ser lida em voz alta) e devolve as credenciais **uma única vez**, na
resposta. Quem entrega é a organização, por WhatsApp ou copiando da tela.

⚠️ **O login é o NOME DO ESTABELECIMENTO, não um e-mail.** O Auth identifica por
e-mail, então o nome vira um endereço interno determinístico
(`<slug>@marcas.sweetcoffeeweek.com.br`) que **não recebe mensagem** — o e-mail
real da marca continua em `participantes.email`. Consequências que não se
negociam:

- **as duas slugificações têm que casar** — a de `public/marca/index.html` e a da
  Edge Function. Divergiram, a marca digita o nome certo e não entra, e o erro é
  genérico de propósito, então ninguém descobre o motivo. o antigo teste da marca (apagado no corte; hoje em `tests/painel-app-*.test.mjs`)
  compara as duas;
- **"esqueci minha senha" por e-mail foi REMOVIDO, e não é esquecimento:**
  mandar link para um endereço sem caixa de entrada é botão que nunca entrega
  nada. Quem redefine é a organização, gerando acesso novo pelo painel;
- **`deve_trocar_senha` é o que torna aceitável mandar senha por WhatsApp.** A
  senha viaja em texto e fica no histórico da conversa; com a trava, o que ficou
  lá é bilhete de uso único. ⛔ **Não desligar essa flag.** Se o `update` dela
  falhar, a função **apaga o usuário recém-criado** — conta sem trava é pior que
  conta nenhuma.

O quarto destino do painel, **"marcas"**, lista quem já tem conta e em que ponto
do cadastro está. O passo a passo e as decisões estão em
`docs/PLANO-painel-contas-participantes.md`.

#### `/marca/` mudou de dono no banco — 25/08/2026 (Fase 5)

✅ **`participantes` é a MARCA; `participacoes` é a marca NAQUELA EDIÇÃO.** Combo,
tema, preço, itens, unidades, horário e fotos são fato de uma edição, não da
marca — é como o acervo sempre contou a história (410 participações, 123 marcas).
O painel passou a ler e escrever a participação; `participantes` guarda o que
atravessa as edições: nome, responsável, contato, Instagram, site, CNPJ.

| Peça | Onde vive hoje |
|---|---|
| tema, justificativa, preço, `status_cadastro` do cadastro | `participacoes` |
| doce, salgado, bebida (nome, descrição, restrições; ingredientes saíram do formulário em 19/10/2026) | `participantes_itens.participacao_id` |
| endereço, bairro, horário do festival, delivery e canais | `participacao_unidades` |
| nome da marca, responsável, telefone, e-mail, Instagram, site, CNPJ | `participantes` |

⚠️ **`admin_config.edicao_atual` é o que faz a conta nova nascer útil.** As duas
`vincular_*` chamam `abrir_participacao_interna` com esse código; **nula, nenhuma
participação é aberta e a tela diz isso com todas as letras** — a 17ª edição não
foi anunciada e inventar um código seria inventar dado (A4). Quem define é
`definir_edicao_atual(p_secret, p_codigo)`, guardada por `producao.gerir`.

⚠️ **`marca_concluir_cadastro` trocou de argumento: `p_participacao`, não
`p_participante`.** `create or replace` não renomeia argumento, então a antiga foi
derrubada. Chamada com o nome velho, o PostgREST devolve 404 e o botão "concluir"
nunca conclui — sem erro no console.

⚠️ **`participantes_operacao` ficou para trás e não é lida por tela nenhuma.**
Continua no banco com os dados de quem cadastrou pelo modelo antigo (hoje: zero
linhas). Não gravar nela.

🐛 **`text[] || 'literal'` explode com `malformed array literal`.** O Postgres
resolve `anyarray || unknown` como array‖array e tenta ler `'tema_combo'` como
literal de array. É preciso `|| 'tema_combo'::text`. O bug morava na
`marca_concluir_cadastro` original desde 22/08 e **só disparava quando faltava
campo** — ou seja, exatamente no caminho que a função existe para servir. A
conclusão devolvia exceção em vez da lista do que falta.

⚠️ **A marca não escreve caminho de foto em lugar nenhum.** `combo_foto_path` saiu
do grant de `participantes` (briefing §3.5); `participantes_itens.foto_path` já
estava fora. RLS decide LINHA, `grant` decide COLUNA — é preciso os dois.

#### `/organizacao/` alcançou o modelo novo — 25/08/2026 (Fase 6)

A barra passou de **4 para 5 destinos**: `resumo · respostas · marcas · produção
· equipe`. "Os formulários" desceu para dentro do resumo — é lista de
referência, não destino. ⚠️ **`DESTINOS.length` no script e o `repeat(N,1fr)` do
CSS são o mesmo número em dois lugares**; há teste que reprova a divergência.

- **marcas** — a linha virou `<button>` e abre a **ficha completa** da
  participação, numa chamada só (`get_ficha_participacao`).
- **produção** — pedidos com prazo e quem falta responder, arquivos, sessões.
- **equipe** — a edição aberta e as contas nominais por função.

⚠️ **`get_participantes` mudou de forma.** Devolve a participação corrente por
marca, com `unidades` e `itens_prontos` **contados pelo banco**. Quem lê tem que
usar `participacao_id`/`edicao_codigo`/`tema_combo` — `combo_nome`,
`combo_descricao` e `participantes_operacao` são o modelo antigo e vêm vazios.

⚠️ **`left join lateral`, nunca join comum.** Join devolveria a marca repetida
por edição, e a lista de marcas passaria a contar participações.

🐛 **`created_at` não desempata dentro de uma transação.** `now()` é o carimbo da
TRANSAÇÃO, não do comando: duas participações abertas juntas têm a mesma data, e
a escolha vira sorteio. O desempate é pelo **código da edição**, que ordena
sozinho.

🐛 **Coluna de saída chamada `id` sequestra `where id`.** Numa função
`returns table (id uuid, …)`, o plpgsql resolve `id` como VARIÁVEL antes de
resolver como coluna — `select … from admin_config where id` dá
`column reference "id" is ambiguous`, e só na hora da chamada. Apelidar a tabela
resolve.

⚠️ **Contagem que vem do banco é `bigint` e pode chegar como STRING.** `"2" + "1"`
é `"21"`, e `"1" === 1` é falso. Toda contagem passa por `Number()` antes de
virar conta ou plural.

**Duas Edge Functions novas:** `criar-conta-organizacao` (guardada por
`acesso.gerir`, só administrador; aqui o e-mail é **real**, diferente da marca)
e `arquivo-url` (assina upload e download dos buckets privados).

⚠️ **Os bytes não atravessam a Edge Function.** Ela assina; o navegador faz `PUT`
direto no Storage. Um PDF de 20 MB dentro do isolate esbarra em limite de corpo,
de memória e de tempo. O que passa pela função é a **autorização** e o
**caminho** — e o caminho é a única coisa que separa "subir arquivo da marca X"
de "escrever por cima do arquivo da marca Y". Validado nos dois lados, e o do
servidor é o que conta.

⚠️ **`producao.gerir` substituiu `pode_organizacao`** em `registrar_foto_item`,
`agendar_sessao_fotos` e `atualizar_sessao_fotos`. Quem entra como `consulta` lê
tudo e não escreve foto nem remarca sessão — que é o ponto inteiro de ter
funções. ⚠️ **Mas elas só separam algo quando existir conta nominal:** enquanto
todo mundo entrar pela senha compartilhada, `pode()` devolve `true` para as seis
ações.

⚠️ **A leitura das marcas (`get_participantes`) carrega FORA do `Promise.all` das
quatro origens, com `catch` próprio.** A RPC só existe depois de a migration das
contas ser aplicada; junto das outras, um 404 dela derrubaria o painel inteiro —
inclusive as respostas que já funcionam. **Toda leitura nova que dependa de
migration não aplicada segue a mesma regra.** o antigo teste da organização (apagado no corte para o painel React; a cobertura hoje está em `tests/painel-app-*.test.mjs` e `tests/painel-infra.test.mjs`)
reprova quem a colocar de volta no `Promise.all`.

⚠️ **Status novo no banco tem que ganhar rótulo no painel no mesmo commit.** O
CHECK de `quero_participar` ganhou `cadastro_completo`, e sem entrada em
`ROTULO_STATUS` ele apareceria como string crua e sumiria do filtro. O teste
deriva o vocabulário do próprio CHECK da migration.

#### O painel é um app instalável — armadilhas do 22/08/2026

🔴 **Service worker tem escopo de PASTA, não de configuração.** O do painel vive
em `public/organizacao/sw.js` e é registrado com `scope: '/organizacao/'`.
Servido da raiz, ele assumiria escopo `/` e passaria a interceptar **a landing
que está no ar** — e desfazer isso não é deploy: é desregistro no navegador de
cada visitante. o antigo teste da organização (apagado no corte para o painel React; a cobertura hoje está em `tests/painel-app-*.test.mjs` e `tests/painel-infra.test.mjs`) guarda as duas pontas.

⚠️ **O HTML do painel é sempre `network-first`.** Como o JS é inline no
documento, cachear o HTML congela o painel inteiro na versão antiga, e a
correção só chega quando a pessoa limpa o navegador. Cache ali é socorro de rede
caída, não estratégia.

⚠️ **O SW nunca vê requisição ao banco** — corte por origem no primeiro `if` do
handler de `fetch`. E **o nome do serviço não aparece no `sw.js` nem em
comentário**: sem o host escrito, não há o que copiar e colar quando alguém for
"fazer o offline funcionar". Offline está fora de escopo de propósito.

⚠️ **`/organizacao/app.webmanifest` e `/marca/app.webmanifest` continuam com
escopo próprio**, disjunto de tudo. Barra final nos dois campos de escopo dos
dois arquivos — sem ela o escopo vira a raiz e instalar o painel instalaria o
site.

✅ **`/manifest.webmanifest` (o do SITE) passou a instalar o PAINEL —
decisão do Eloi, 27/08/2026.** Até então era disjunto de propósito (instalar
o site nunca instalava o painel, e vice-versa). O botão "Instalar app do
painel" no diálogo de acesso (`AccessDialog.jsx`) precisava de um clique só,
e `beforeinstallprompt.prompt()` só funciona com gesto do usuário no MESMO
documento onde o evento disparou — não atravessa navegação pra `/painel/`
(verificado contra MDN/web.dev antes de mudar, não é suposição). A única
forma de um clique real é o SITE já ser dono do manifest do painel:
`start_url`/`scope`/`id`/`name`/ícones de `manifest.webmanifest` viraram
idênticos aos de `/painel/app.webmanifest`.
⚠️ **Custo aceito conscientemente:** quem instalar o site por QUALQUER via —
ícone da barra de endereço, "Adicionar à tela de início" do navegador, não só
este botão — instala o Painel SCW, não a vitrine institucional. Instalar "o
site" e instalar "o painel" viraram a mesma coisa. A captura do
`beforeinstallprompt` do site mora em `src/hooks/useInstallPrompt.js`
(módulo, não hook — precisa armar o listener antes de qualquer componente
montar). Se o evento ainda não chegou (engajamento insuficiente, iOS sem essa
API, já instalado), o botão cai no caminho antigo: abre `/painel/` numa aba
nova, que tem a própria captura como reserva (§10.4-b abaixo).
o antigo teste do painel estático (apagado no corte; hoje em `tests/painel-infra.test.mjs`) e o antigo teste da organização (apagado no corte para o painel React; a cobertura hoje está em `tests/painel-app-*.test.mjs` e `tests/painel-infra.test.mjs`) foram atualizados pra
afirmar que site e painel COMPARTILHAM escopo de propósito, e que
organização/marca continuam de fora dessa fusão.

⚠️ **Ícone maskable: a caixa é 326px em 512, não 410.** A máscara do Android
recorta um círculo inscrito. Medido em pixel: com 410px sobravam **2191 pontos
de tinta fora** do círculo; com 326px sobram 9px de folga e zero pixels fora.
`public/favicon-512-maskable.png` foi gerado assim. **Regenerou a marca? remeça
a caixa** — não herde o número.

⚠️ **Altura de esqueleto se mede, não se calcula.** Um `.og-item` real dá
**102px até 900px** e **99px acima** (abaixo de 900px o `.og-item__dir` ganha
linha própria). A conta "padding + conteúdo" dava 74px e esquecia selo e data —
com ela a lista pularia 28px por item na chegada dos dados, que é o defeito que
o esqueleto existe para evitar.

⚠️ **O bloco `prefers-reduced-motion` fica por último no `<style>`, sempre.** Ele
zera animação e transição de tudo que veio antes; regra acrescentada depois dele
escapa sem ninguém notar. Há teste.

⛔ **Atualização otimista de status não entrou, e é decisão.** `salvar()` só diz
"Salvo." depois de o servidor confirmar (§4.1, com teste). Antecipar a
*aparência* é permitido; antecipar a *afirmação* não. Num painel que decide
aprovação de marca, otimismo mal feito é pior que lentidão.

#### Notificações — os dois painéis, 25/08/2026 (Fase 7)

`/marca/` virou aplicativo instalável, como `/organizacao/` já era: **manifest e
service worker próprios, escopo `/marca/`**. São **dois** SW, um por painel, e é
de propósito — um SW só na raiz cobriria os dois com metade do código e cobriria
junto o site público, que não pede nada disso.

⛔ **A chave privada VAPID não está no repositório.** Ela mora em
`eloi-workspace/clientes/sweet-coffee-week-dados/segredos/vapid.txt`, fora do git, e só vale ligada como
**variável de ambiente da Edge Function**. A **pública** está no código dos dois
painéis de propósito: o navegador precisa dela para assinar, e ela é pública.

⚠️ **As duas metades andam juntas.** Assinatura criada com uma chave não aceita
envio assinado por outra, e o sintoma é o pior possível: **some sem erro**,
porque o serviço de push devolve 403 para a função, não para a pessoa. Trocar o
par é trocar `VAPID_PUBLICA` nos dois painéis **e** as três variáveis, na mesma
leva — e toda assinatura existente vira lixo.

🐛 **O separador do RFC 8291 é o BYTE `0x00`, e ele fica FORA do literal de
texto** (`const NUL = new Uint8Array([0])`). Escrito como sequência de escape
dentro da string, esse byte se perdeu **duas vezes** numa sessão só: no heredoc
do shell e no JSON do deploy. Das duas o sintoma seria idêntico — chave
derivada diferente e o navegador **descartando a mensagem sem dizer por quê**.
Há teste que reprova tanto o byte cru quanto o escape.

⚠️ **`enviar-push` autoriza ANTES de conferir o ambiente.** Na primeira versão a
ordem era inversa, e qualquer um que chamasse a função descobria se as chaves
estavam postas. É pouca coisa, e é exatamente o tipo de pouca coisa que descreve
o servidor para quem não devia estar perguntando.

⚠️ **Endpoint de push é credencial.** Quem tem o endpoint de alguém manda
notificação para o aparelho dessa pessoa. Por isso `push_subscriptions` só
deixa a marca ler **as próprias linhas** (`push_marca_le`), e nenhum papel lê
a de outra conta — quem envia é a Edge Function, com `service_role` — e a
resposta do envio nunca devolve endpoint.
🐛 **Sem SELECT nenhum, o DELETE da marca apagava 0 linhas, em silêncio**
(achado em 28/09/2026): DELETE que filtra por coluna (`?endpoint=eq.`) precisa
LER a linha, e o Postgres aplica também as policies de SELECT. "Desligar
avisos" e "Sair" deixavam o aparelho recebendo push, e religar batia no
`unique(endpoint)`. Migration `20260929_push_marca_le_proprias.sql`.
**Policy de DELETE/UPDATE sem a de SELECT correspondente é policy que não
funciona** — conferir com `row_count`, não com a ausência de erro.

⚠️ **A marca grava a própria assinatura pelo PostgREST, não por RPC** (a policy
de insert já existia). Como `update` está revogado de `authenticated`, **upsert
não funciona**: o caminho é apagar a linha do mesmo endpoint — que a RLS limita
ao dono — e só então inserir. O endpoint é `unique`.

⚠️ **No iPhone o push só existe com o painel INSTALADO na tela inicial.** Antes
disso o Safari não expõe `PushManager`. Não é defeito, é como o iOS funciona, e
as duas telas **dizem isso** em vez de mostrarem um botão que não faz nada.

⚠️ **Aviso é por APARELHO, não por conta.** Quem entra da mesma conta no celular
e no computador liga nos dois, separadamente.

⚠️ **`/marca/sw.js` entrou no `no-store` do `vercel.json`**, ao lado do da
organização. SW cacheado prende a correção no navegador de quem já abriu, e
nenhum deploy a alcança.

#### Casca comum, mesa, vendas diárias e agenda de vagas — 25/08/2026 (Fase 8)

Handoff de design "Painel SCW app" aplicado nos dois painéis (`organizacao/`,
`marca/`), a partir de uma investigação prévia que achou o pacote com metade
sem lastro — o README do próprio handoff avisava: a seção do participante foi
desenhada sem ler `public/marca/index.html`. A conferência ficou registrada
como `CONFERENCIA-MARCA.md`, entregue junto do handoff (fora do repositório).

**O que mudou de verdade:**

- **Rail (desktop, 72px) nos dois painéis.** Reusa os MESMOS ícones e o mesmo
  `data-vista`/`irPara()` que a barra de abas do celular já usava em
  `organizacao/` — entrou sem JS novo de navegação. Em `marca/`, que não tinha
  navegação alguma (uma coluna só, rolagem contínua), a rail e as abas são
  novas, com 4 destinos reais: **hoje · cadastro · pedidos · arquivos**. Os
  5 blocos do formulário (A marca/O tema/Os três itens/Preço/Onde encontrar)
  só mudaram de casa — nomes e campos são os que já existiam, conferidos
  contra o arquivo real.
- **"Resumo" (dashboard por origem) virou "mesa"** (kanban de 6 etapas) na
  organização. Mudança de EIXO: mede por etapa da candidatura, não por
  formulário de origem. `nao_selecionado` fica de fora das 6 colunas de
  propósito — seria uma esteira que nunca esvazia; continua visível em
  Respostas, com o filtro que já existia.
- **Tela de boas-vindas + dois setores** (`vBoasVindas` em `marca/`) —
  pedido do Eloi: é a tela de quem abre o app instalado no celular. Repete o
  papel do cartão "Sou participante" do `AccessDialog.jsx` do site, mas
  **local** ao painel estático (não duplica autenticação — só antecede o
  mesmo formulário de sempre). Cor roxa e ícones já testados no site, **não**
  os do PATCH original (amarelo/cyan), que reabririam uma combinação já
  rejeitada por contraste (§6.1/§6.10).
- **Notificações derivadas** (nunca escritas à mão) nos dois painéis. Em
  `organizacao/` abrem na MESMA gaveta que já existia (`abrirFolha` —
  patch §3 já estava resolvido sob outro nome). Em `marca/`, que não tinha
  gaveta nenhuma, é um painel leve (`abrirNotificacoesMarca`), não uma folha
  completa — construir a coreografia de folha/gaveta do zero era escopo maior
  do que a peça pedia.
- **Agenda de fotos, segundo modo.** `sessoes_fotos` ganhou o status
  `'aberto'` (vaga sem dona) em vez de tabela paralela — mesmo conceito, um
  valor a mais (migration `20260825_fase7_vendas_diarias_e_vagas_fotos.sql`).
  A organização abre/fecha vaga (`abrir_vaga_fotos`/`fechar_vaga_fotos`); a
  marca reserva com um `PATCH .../sessoes_fotos?id=eq.X&status=eq.aberto` —
  atômico por construção, sem RPC nova: duas marcas clicando a mesma vaga só
  uma tem linha afetada. "Marcar eu mesma" reaproveita
  `agendar_sessao_fotos`, que já fazia exatamente isso.
- **Lançamento diário de combos vendidos** (view "hoje" da marca) — tabela
  nova `vendas_diarias`, upsert direto por PostgREST sob RLS (sem RPC).
  ⚠️ **Simplificação assumida:** o "momento" antes-de-abrir/em-curso do
  handoff não é distinguido — a página não busca (e não tinha de onde
  buscar) a data de início da edição. O campo de lançamento fica sempre
  visível, em vez de arriscar bloquear um lançamento válido com um sinal que
  não existe.

**O que ficou de fora, e por quê:**

- **DesignSync não foi rodado.** Rodar exige revisar o plano de arquivos
  antes de escrever — não coube no tempo desta rodada.
- **O protótipo (`Painel SCW app.dc.html`) não foi aberto no navegador** para
  conferência visual ponto a ponto — a implementação seguiu README/PATCH em
  texto. Onde os dois divergiam da estrutura real, o código manda (§0.1),
  registrado em `CONFERENCIA-MARCA.md`.
- **`tests/responsive.mjs` não cobre estas duas páginas** — ele testa as 6
  rotas do SPA institucional (`.scw-*`), não `public/organizacao/` nem
  `public/marca/`. Não existe hoje um teste responsivo automatizado para os
  dois painéis; é lacuna a fechar, não algo que esta rodada tenha verificado.
- **Conteúdo autenticado não foi conferido ao vivo.** Sem a senha real de
  nenhum dos dois painéis (que não devo ter nem simular), a verificação foi
  por estrutura e teste (o antigo teste da organização (apagado no corte para o painel React; a cobertura hoje está em `tests/painel-app-*.test.mjs` e `tests/painel-infra.test.mjs`) 59/59,
  o antigo teste da marca (apagado no corte; hoje em `tests/painel-app-*.test.mjs`) 26/26), não por navegação visual logada.
- **Formulários da organização (patch §9)** já existiam quase por inteiro
  antes desta rodada (`abrirNovoPedido`/`abrirNovoArquivo`/`abrirNovaSessao`/
  `abrirNovaConta`, todos via `abrirFolha`) — não foram tocados.

#### Painel unificado — `/painel/`, 26/08/2026 (Fase 9)

Handoff "Painel SCW app" (`handoff/APLICAR.md` + `handoff/INSTRUCAO-painel-completo.md`,
arquivados em `docs/_arquivo-instrucoes-antigas/`). `/organizacao/` e `/marca/` viviam
cada um na própria página estática, com a mesma "casca de app" desenhada duas vezes
(§5.2). Viraram **um painel só**, com login de dois cartões — organização (senha
única) e participante (Supabase Auth) — e nove vistas atrás dele.

⚠️ **Não foi reescrita: foi PORTADA.** `public/painel/index.html` carrega o código real
de `public/organizacao/index.html` e `public/marca/index.html`, cada um na própria IIFE
(`PainelOrg`, `PainelMarca`) dentro do MESMO bloco `<script>` — o teste conta blocos
(`SCRIPTS.length === 1`), então não dá pra ter um por papel. Zero função reescrita à
mão: RPCs, `escapar()`, notificações derivadas, agenda de dois modos, acordeão do
cadastro — tudo o mesmo comportamento já testado nos dois arquivos de origem.

⚠️ **`window.PainelOrg`/`window.PainelMarca` existem só para o boot decidir qual
casca mostrar** — `PainelOrg.temSessao()` roda primeiro (o script da organização vem
primeiro no arquivo); se `false`, `PainelMarca.iniciar()` decide entre login e o
próprio painel. Sem essa ordem, uma sessão de organização restaurada seria coberta de
novo pela tela de login que `iniciar()` da marca mostra por padrão.

⚠️ **A colisão que quase aconteceu: as duas páginas tinham `id="aviso"`.** Um era o
`<div class="og-aviso">` de dentro da vista `mesa` da organização, o outro o banner
global da marca. Viraram `aviso-org` e `aviso-marca` — `document.getElementById`
sempre pega o primeiro do documento, então a outra metade escreveria na caixa errada
(ou numa caixa escondida) sem erro nenhum no console.

🔴 **Três classes `.pn-*` parecem compartilhadas e NÃO SÃO — são exclusivas da
marca.** `.pn-casca` (o grid do `#vPainel`), `.pn-vista`/`.pn-vista__trilho` (a área de
rolagem) e `.pn-abas`/`.pn-aba` (a barra de abas da marca) não têm equivalente em
`/organizacao/`, que faz o mesmo papel por outro caminho: `#painel` por ID em vez de
`.pn-casca`, `.og-vista` em vez de `.pn-vista`, `.og-abasapp`/`.og-abaapp` em vez de
`.pn-abas`/`.pn-aba`. Uma primeira tentativa de "deduplicar" o CSS achou que essas
três eram cópia do que a organização já define e cortou — resultado: `#vPainel` caía
no `display:block` padrão de uma `<div>`, sem grid, sem colunas, sem nada. Achado só
ao renderizar de verdade e medir `getComputedStyle`; a leitura do CSS sozinha não
denunciava. **A lição:** nome de classe `pn-` igual não significa a mesma regra existe
nos dois lados — cada arquivo original tinha a duplicação aceita do §5.2, e um corte
"inteligente" tem que confirmar por classe, não por prefixo.

⚠️ **O bloco de `prefers-reduced-motion` tem que ficar depois de TUDO** — inclusive do
CSS da marca, que entra depois do da organização na concatenação. Ele morava no fim do
CSS da organização; ficou no meio do arquivo combinado até ser movido pro fim de
verdade. Há teste (o antigo teste do painel estático (apagado no corte; hoje em `tests/painel-infra.test.mjs`)) que reprova isso especificamente.

⚠️ **`/organizacao/` e `/marca/` não morreram — viraram só a PORTA.** `abrirPainel()`
(organização) e `ver('painel')` (marca) continuam fazendo tudo que faziam antes e, no
fim, chamam `location.replace('/painel/#painel=org/' + vista)` ou
`.../marca/' + vista`. O redirecionamento é depois do login real confirmado — senha
errada continua mostrando o erro na tela de sempre, nunca redireciona primeiro.
`sw.js`/`app.webmanifest` das duas páginas antigas **não foram apagados** — quem já
instalou o ícone antigo continua com um app que funciona (mostra o painel por um
instante e sai), só precisa reinstalar a partir de `/painel/` pra ganhar o ícone novo.
Ninguém decidiu se isso vira aviso pra equipe; ficou registrado aqui.

⚠️ **`/painel/app.webmanifest` e `/painel/sw.js` são nova infra, mesma receita de
`/organizacao/`** — escopo `/painel/` nos dois campos, `sw.js` com `no-store` no
`vercel.json`, rewrite `/painel` → `/painel/index.html`. Os dois registros de service
worker que já existiam dentro do código portado (`register('/organizacao/sw.js', …)` e
`register('/marca/sw.js', …)`) foram trocados para `/painel/sw.js` — registrar o SW de
uma pasta que a página atual não serve não dá erro, só não ajuda em nada.

⚠️ **O modelo de 6 estágios da mesa (kanban) já estava resolvido, não foi decisão
nova.** O handoff pedia parada pra decidir como os 4 status reais de
`participacoes.status_cadastro` viram 6 colunas — mas a Fase 8 já tinha resolvido isso
em `renderMesa()`: as 4 primeiras colunas vêm do status do formulário
(`quero_participar.status`), e a marca com conta cai em `acesso` ou `completas`
conforme `status_cadastro`. Conferir o código antes de tratar um "não decide sozinho"
do handoff como pergunta em aberto — pode já estar respondido.

#### Login de verdade + cor por vista, 26/08/2026 (Fase 10)

A primeira versão do painel unificado reaproveitou o cartão branco de sempre
(`.og-entrada`) pro login — visualmente pobre perto do documento que o Eloi
mandou (o protótipo `.pn-porta`: fundo chocolate cheio, dois cartões escuros
com disco colorido). Portado de verdade agora: `.pn-porta`/`.pn-setor*`/
`.pn-campo__escuro` do protótipo, tokens trocados pro prefixo `--scw-`.

**Cor por vista, nova.** Cada uma das 5 vistas da organização e das 4 da
marca ganhou uma cor de acento — dentro dos 9 tokens fechados (§6.1),
cíclica e nunca repetida no mesmo painel (§6.3): organização
mesa=amarelo·respostas=cyan·marcas=roxo·produção=laranja·equipe=marrom;
marca hoje=amarelo·cadastro=cyan·pedidos=laranja·arquivos=roxo. Três
variáveis CSS, escritas por `irPara()`/`irParaMarca()` no `<body>`:

| Variável | Serve pra | Regra |
|---|---|---|
| `--pn-acento` | tira sob o cabeçalho (fundo creme/bege), disco do ícone da vista | a cor crua |
| `--pn-acento-tinta` | texto/ícone SOBRE o próprio acento (chapa preenchida) | roxo/marrom → creme; resto → chocolate |
| `--pn-acento-escuro` | texto/ícone da vista ativa SOBRE CHOCOLATE (aba do celular, indicador) | roxo/marrom não sustentam leitura sobre chocolate (1,45:1/1,53:1, §6.2) e caem no amarelo — o mesmo `pageColorDark()` do site institucional |

⚠️ **Testar com `getComputedStyle(el, '::after')` não prova nada.** A
verificação inicial usava isso pra conferir a tira sob o cabeçalho e sempre
devolvia amarelo, mesmo com a variável certa no elemento — armadilha da
ferramenta de automação, não do CSS: o mesmo valor lido num elemento REAL
(o botão ativo da rail) vinha certo. Ler a cor num elemento normal, não
num pseudo-elemento, é o jeito confiável de conferir isso.

🔴 **Bug de verdade, achado por essa mesma verificação:** restaurar o CSS
"casca comum" inteiro da marca (Fase 9) trouxe de volta uma cópia SEM
`@media` de `.pn-cabeca`/`.pn-cabeca__marca`/`__titulo`/`__sub` — a
organização tem a versão de verdade, com `@media (max-width:900px)` real,
em `org_css.css`; a cópia da marca dependia de uma classe `.is-estreito`
que `marca_script.js` nunca aplica (`matchMedia` não existe nesse arquivo —
vestígio de uma versão anterior do próprio `/marca/` original). Cascata sem
condição sempre vence a com `@media`, então a cabeça do celular ficava
creme (devia ser chocolate), o logo da marca não aparecia, o título não
encolhia e o subtítulo saía marrom sobre chocolate — ~1,5:1, ilegível.
Removida a cópia morta; sobrou só o que a marca tem de exclusivo ali
(`.pn-cabeca button.notif`, que a organização não usa — ela usa
`.pn-cabeca__btn`). **A lição do Fase 9 se repete, mais estreita:** um
`.pn-*` "restaurado inteiro pra não quebrar" pode reintroduzir exatamente o
bug que a fusão pretendia evitar. Rodar o teste ao vivo depois de qualquer
restauração de bloco de CSS, não só depois de removê-lo.

#### Revisão geral do painel — 28/09/2026 (Fase 11)

Diagnóstico e reauditoria em `docs/AUDITORIA-PAINEL-2026-09-28.md`. O que
passou a valer:

- **O painel só vive em `/painel/`.** `/organizacao` e `/marca` redirecionam
  (vercel.json + plugin de dev). Motivo: o SW tem escopo `/painel/`; entrando
  por `/organizacao/` o push travava esperando `serviceWorker.ready`.
- **Autoria vem da sessão, no banco.** `auditoria.ator_user_id` e
  `ator_rotulo` têm default (`auth.uid()` / `ator_rotulo_atual()`), e o
  gatilho `auditoria_vincular` corrige o rótulo quando uma Edge Function grava
  com `ator_user_id` explícito. O rótulo é GRAVADO na hora: desativar ou
  renomear a conta não reescreve o passado. ⛔ Nunca aceitar nome de autor
  vindo do navegador.
- **Histórico** = tabela `auditoria` (gatilhos de antes/depois em candidatura,
  cadastro, pedido, vaga; RPCs que já gravavam seguem gravando). Observação
  interna é linha `acao = 'observacao'` — não se edita nem apaga.
  `get_atividade` filtra por marca, pessoa, ação e período.
- **Mensagens** (`mensagens`) e **avisos** (`notificacoes` +
  `notificacao_leitura`, leitura por pessoa na organização) nascem por
  gatilho. A marca lê as suas por RLS e **não vê** o nome interno de quem
  escreveu (grant de coluna sem `autor_rotulo`/`ator_rotulo`).
- **Push automático:** gatilho `disparar_push` → `pg_net` → `enviar-push`
  com `{notificacao_id}`. A função trava o envio (`push_enviado_em`) e relê
  tudo com a chave de serviço: o chamador não escolhe texto nem destinatário.
- **Conta pessoal é a porta principal** da organização; a senha
  compartilhada é reserva e pode ser desligada em Equipe
  (`senha_unica_definir`, que recusa se não houver administrador nominal).
- **Contas não se apagam:** desativar (`suspender_conta`) mantém o nome no
  histórico. `regerar-senha-conta` também atende marca (`participante_id`,
  exige `marca.liberar`) — é o "esqueci a senha" da marca.
- **CSS:** `painel.css` foi reescrito sem regra de elemento solta. ⛔ Não
  voltar a escrever `main{…}`, `label{…}`, `header button{…}` globais: foi o
  que prendeu o painel numa coluna de 560px em qualquer monitor.
- ✅ **Edge Functions publicadas em 28/09/2026** (`enviar-push`,
  `regerar-senha-conta`, `criar-conta-organizacao`), pelo MCP `supabase-scw`
  (ver Fase 12).

#### Evolução estrutural — 29/09/2026 (Fase 12)

Relatório completo, divergências e pendências em
`docs/EVOLUCAO-PAINEL-2026-09.md`. O que passou a valer:

- **A edição é configuração, não código.** `edicoes` + `edicao_cronograma`
  (datas, taxa, regra de foto, horário do lembrete, prazos). A marca, a mesa,
  os lembretes e a próxima ação leem dali. ⛔ Nunca escrever data de edição em
  constante no front.
- **O acervo existe no banco**: `historico_marcas/_aliases/_participacoes` e
  `premiacoes`, GERADOS de `src/data` por `scripts/historico-para-sql.mjs`.
  Mudou o acervo? Rodar o script de novo (idempotente). ⛔ Não digitar.
- **Alias não é prova.** Estabelecimento ⇄ marca do acervo só por
  `participante_vinculos.status = 'confirmado'`, decidido por uma pessoa.
  "Primeira edição" só com `novo_confirmado`; ausência no acervo é
  `sem_correspondencia_no_acervo`. A marca só vê história confirmada.
- **Tema:** a marca escreve `tema_combo`; cada mudança vira proposta em
  `temas_propostos` (30 min de salvamento automático reescrevem a mesma). A
  regra "não repete" é um índice único na APROVAÇÃO; a prioridade (pagamento
  em dia, depois chegada) é calculada e mostrada, a decisão é humana.
- **Foto ≠ pagamento.** `foto_liberacao` e `pagamento_status` são campos
  separados; não presumir que um implica o outro.
- **Importação rastreável**: `import_lotes` → `import_linhas`
  (`dados_originais` nunca reescritos) → `revisao_pendencias`. Nada é
  corrigido sozinho; a promoção PARA se a conferência divergir; reverter por
  lote enquanto nenhuma marca do lote tiver conta. ⛔ **Planilha e JSON cru
  nunca no repositório — ele é público.** Ficam em `eloi-workspace/clientes/sweet-coffee-week-dados/dados-importacao/`.
- **Migration grande entra pelo arquivo do commit**: o banco busca o `.sql`
  por `pg_net` no raw do GitHub, fixado no SHA do commit, e só executa se o
  sha256 bater. Evita transcrever centenas de linhas (e o arquivo divergir do
  banco). O registro da migration guarda o SHA e o hash.
- **Nome do participante: SEMPRE padronizado** (pedido do Wilker, 29/09/2026).
  É o nome do EMPREENDIMENTO — nunca pessoa, nunca razão social (sem LTDA/ME).
  Mesma marca escrita diferente → grafia canônica do acervo (a do site, §9.3);
  senão, grafia correta: maiúscula de título, conectivos minúsculos, acentos
  (Café, Bistrô, Pâtisserie), apóstrofo reto, espaço simples; estilo próprio da
  marca (Food&Coffee) fica. Regra única no banco
  (`20260929_fase12_padrao_nomes.sql`): gatilho formata toda gravação;
  importação aplica a regra completa; `padronizar_nomes` revisa/aplica pelo
  painel (Edição → Revisão). O original vira alias e fica em
  `snapshot.nome_informado`. ⚠️ Marca **com conta** só recebe formatação: ela
  entra no painel digitando o nome, e trocar o nome quebraria o login.
- **Marca importada ganha conta pela ficha** (Acesso → Criar acesso →
  `criar-acesso-marca { participante_id }` → `vincular_conta_participante`).
  ⛔ O cadastro manual recusa nome de marca que já existe.
- **Conta de marca desativada** perde o acesso na hora (`conta_ativa()` na
  RLS de `participantes`).
- **Autoria em lote**: só função interna define `scw.ator_rotulo` na
  transação; `scw.silencioso` cala avisos e push (importação).
- **Lembretes** por `pg_cron`: `scw-lembrar-vendas` (hora em hora, só no
  festival, a partir de `edicoes.lembrete_vendas_hora`) e `scw-lembrar-prazos`.
- **Testes do banco**: `supabase/testes/verificacao-2026-09-29.sql`
  (autorização + ponta a ponta; sempre termina em exceção e desfaz).
- ✅ **As 4 Edge Functions publicadas em 28/09/2026** (as três acima e
  `criar-acesso-marca`), conferidas com teste de fumaça (401 sem credencial).
  ⚠️ **Deploy de Edge Function é pelo MCP `supabase-scw`**, não pelo conector
  "Supabase" do claude.ai: nesta app o conector chega sem tipos de parâmetro
  e recusa `verify_jwt`/`files` (ZodError). `supabase-scw` é o MCP oficial
  (`https://mcp.supabase.com/mcp?project_ref=…`) cadastrado no Claude Code
  com escopo local, login por OAuth em `/mcp`. `verify_jwt: false` nas quatro
  (a autorização é o próprio código).

#### Reestruturação do painel — 29/09/2026 (Fase 13)

Pedido do Wilker: organizar o painel por assunto. Spec em
`docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md`, plano em
`docs/superpowers/plans/2026-09-29-painel-reestruturacao.md`. O que passou a valer:

- **Organização: 7 módulos** (`components/Modulos.jsx`), cada um com abas:
  Visão geral · Participantes (Marcas, Candidaturas, Temas, Vendas) · Contatos
  (Pessoas, Press Kit, Vouchers, Recebidos do site) · Operação (Pedidos, Fotos,
  Materiais) · Arquivos (para todas, por participante, Guia de fotos,
  arquivados) · Edição (Configuração com a edição atual, Todas as edições) ·
  Administração (Equipe, Revisão, Importações, Histórico, Formulários).
  **Marca: 5 destinos** (Hoje, Cadastro, Pedidos, Mensagens, Downloads) + botão
  Conta (avisos do aparelho e sair).
- **A tela mora no endereço, depois do `#`** (`lib/rota.js`):
  `#participantes/lista?item=<id>&sub=mensagens`. Recarregar volta ao lugar,
  Voltar fecha a ficha, contador da Visão geral abre a lista filtrada. Links
  antigos gravados no banco (`marcas/…`, `producao/…`, `respostas/…`,
  `edicao/temas`) seguem valendo por `rotaDoLink`. ⛔ Nada de biblioteca de rota.
- **Status: uma fonte só** (`lib/status.js`, rótulo + tom). Os `ROTULO_*`
  antigos derivam dela. ⚠️ Status novo num CHECK entra lá no mesmo commit — o
  teste `painel-app-status` compara com os CHECKs.
- **Excluir = arquivar + restaurar** (decisão do Wilker). Exclusão definitiva
  só de resposta de formulário, como antes.
- **O administrador edita o cadastro da marca** (ação `cadastro.editar`, só
  Administrador), em blocos, pelas RPCs `org_salvar_*`, com antes/depois na
  auditoria. ⚠️ Nome de marca COM conta só muda de grafia: o nome é o login.
- **Arquivos têm categoria** (combo · identidade · guia · documento · outro),
  editar, substituir (mesma pasta, versão +1) e arquivar.
- **Contatos: várias categorias por pessoa** (`categorias text[]`; `tipo`
  segue como a primeira, por gatilho). Press Kit ganha responsável pelo envio
  e recebimento; "constou na lista" aparece como **Sugerido** e "confirmado"
  como **Preparando**.
- **Vouchers:** cada marca da edição cede `edicoes.vouchers_por_participante`
  (padrão 7) vouchers, código `SCW-XXXXX`, válido só nela. A organização gera,
  destina e marca o envio; **a marca registra o uso** pelo código. ⛔ A marca
  não lê a tabela `vouchers` — se visse os códigos não usados, poderia "usar"
  sozinha; ela recebe contagem e os que ela mesma usou (`marca_meus_vouchers`).
- **Pendências da marca campo a campo** (`pendenciasCadastro`, mesma regra dos
  blocos): cada uma abre o bloco e põe o cursor no campo (`campo-<campo>`).

#### Acessos das marcas + guia da marca — 29/09/2026 (Fase 14)

Spec em `docs/superpowers/specs/2026-09-29-acessos-e-guia-da-marca-design.md`.
Migration `20260930_acessos_e_correcoes.sql` (aplicada pelo arquivo do commit,
sha256 conferido) + `20260930_acessos_ajustes_advisor.sql`. O que passou a valer:

- **Status do acesso, uma regra só** (`status_acesso_marca`): não criado ·
  aguardando envio · aguardando primeiro acesso · ativo · bloqueado ·
  desativado. **Bloquear ≠ desativar** (decisão do Wilker): bloquear é pausa
  (`perfis.bloqueado_em`), desativar é conta encerrada (`perfis.ativo`); os
  dois tiram a RLS da marca (`conta_ativa()`) e são reversíveis.
- **Envio das credenciais é registrado** (`acesso_envios`: copiado · WhatsApp
  aberto · enviado). ⛔ Abrir o WhatsApp nunca vira "enviado": só o clique em
  "Marcar como enviado". Senha nova (`perfis.senha_emitida_em`) zera o envio.
- **Ninguém vê a senha definitiva** (hash no Auth). Controlar a conta é gerar
  senha temporária nova, bloquear, encerrar sessões, forçar troca
  (`gerir_acesso_marca`, um RPC para ficha e lote, guardado por `marca.liberar`).
  ⚠️ Encerrar sessões corta a renovação na hora; o token aberto vale até vencer
  (~1 h). `regerar-senha-conta` também encerra as sessões.
- **Alterar login = renomear a marca**: `criar-acesso-marca` com `novo_nome`
  troca o endereço interno junto (a slugificação continua num lugar só).
- **Lista de marcas**: seleção + ações em lote, "Cadastro N% · N pendências",
  status do acesso e filtros novos. Resultado do lote com "Copiar todos os
  acessos" (`textoTodosAcessos`) e WhatsApp com o texto do pedido.
- **WhatsApp = telefone de cadastro**: rótulo, máscara e validação
  (`mascaraWhatsApp`/`validarWhatsApp` em `lib/participantes.js`).
- **Marca: Início · Meu cadastro · Meu combo · Fotos · Arquivos** (decisão do
  Wilker). Pedidos, Mensagens e Guia de fotos ficam fora do menu (abertos do
  Início e do sino). Meu cadastro e Meu combo são o mesmo `Cadastro.jsx` com
  `blocos`. Links antigos (`hoje`, `cadastro/2/…`, `cadastro/fotos`) seguem
  valendo por `interpretarLinkMarca`.
- **Uma leitura do estado da marca** (`useResumoMarca` → `resumoMarca` em
  `lib/guia.js`): progresso = campos obrigatórios preenchidos ÷ 16 (a MESMA
  lista de `campos_cadastro` no banco — mudou lá, muda cá), pendências,
  próxima ação, números das abas, estado de cada campo.
- **Correção por campo**: `pedir_correcao_campo` (motivo obrigatório) põe o
  combo em "alteração solicitada"; a marca vê o motivo junto do campo e envia
  de novo (o gatilho existente devolve para análise); aprovar resolve.
  Pedido da organização ganha `campo` e `prioridade`.
- **Conta pausada**: a marca bloqueada/desativada vê "Seu acesso está pausado"
  em vez de um painel vazio (`precisaTrocarSenha` → `'pausada'`).

#### Reconstrução visual + logo do participante — 29/09/2026 (Fase 15)

Spec em `docs/superpowers/specs/2026-09-29-reconstrucao-visual-painel-design.md`.
Migration `20260930_logos_marca.sql` (aplicada pelo arquivo do commit, sha256
conferido). O que passou a valer:

- **Três níveis e três camadas.** Página (VistaCabeca) → macroseção
  (`MacroSecao`) → módulo (`Modulo`, um card por assunto). Camadas da paleta:
  `--sup-0` (fundo da aplicação, bege-claro por `color-mix`), `--sup-1` (card
  creme com filete), `--sup-2` (bloco interno). Espaço `--e-1..--e-8`. A seção
  perdeu o filete: **o espaço separa, a linha é recurso complementar**.
- **Tipografia do painel.** Slab só em título de página/seção, nome da marca
  e número grande; `h3`/título de card em Nexa. **Caixa-alta só em
  `.ui-macro__rotulo`** — `painel-app-reconstrucao.test.mjs` reprova outra.
  ⚠️ Se o painel parecer "todo em Slab", confira o kit: o fallback das duas vozes
  é a Slab. Em 29/09/2026 a causa era o `<link>` para `ngx4uek.css` (412); o kit
  passou a carregar pelo embed JS (`ngx4uek.js`), que responde.
- **Ícones: um registro só.** ✅ Desde 14/10/2026 (iconografia v3) `components/Icone.jsx`
  é só ADAPTADOR do registro do site (`icones/` → `src/components/scw-icons/gerado/`,
  `icones/README.md`); os nomes antigos do painel valem por `icones/aliases.json`. O texto
  abaixo é o registro de 29/09. Nome com "/" vinha do
  sistema do site (`scw-icons-v2.js`, ⛔ não editar à mão); os do painel têm
  a grade deles e o traço normalizado ao peso do site. `MODULO_ICONE` é o mapa
  assunto → ícone; `ICONE_TOM` dá ícone a todo tom de status. `<Selo>` sempre
  com ícone + texto + cor — ⛔ nada de `<span className="og-selo">` à mão.
- **Ação sempre nomeada** ("Editar bebida", "Adicionar unidade"); uma
  principal, secundárias contornadas, o raro em `MaisAcoes`.
- **Ficha do participante é PÁGINA** (decisão do Wilker), no mesmo endereço
  (`#participantes/lista?item=…&sub=…`): cabeçalho-resumo e subnavegação
  Resumo · Cadastro · Combo · Unidades · Operação · Mensagens · Trajetória ·
  Acesso · Histórico (`vistas/FichaMarcaPagina.jsx`). `sub` vazio = Resumo.
- **Menu da organização em grupos**: Operação · Relacionamento · Conteúdo ·
  Administração (`GRUPOS` em `PainelShell.jsx`).
- **Logo do participante.** `logos_marca` (uma linha por arquivo, nunca
  apagada), `participantes.logo_id` (oficial da marca) e
  `participacoes.logo_id` (confirmada para a edição) apontam para a mesma
  linha. Estado derivado: confirmada · anterior · acervo · não enviada. Bucket
  **público** `logos`: a marca sobe na própria pasta (policy com
  `meu_participante()`), a organização por `arquivo-url` (`cadastro.editar`),
  nunca por cima. `acervo_logos` é GERADO de `src/data/participants.js` por
  `scripts/acervo-logos-para-sql.mjs` — ⛔ não digitar. A organização vê
  sugestão por nome ou vínculo; **a marca só por vínculo confirmado**.
  Raster com lado maior < 500px e SVG com código são recusados.
- **A logo é o 17º campo** do progresso (`campos_cadastro` e
  `camposObrigatorios`, mesma lista). Não trava o envio para análise.
- ✅ **Logo no painel preenche 100% da caixa (`cover`)**, como na §6.12 (revisado em
  01/10/2026; antes era `contain` com margem). O filete de borda do slot é um `::after`
  por cima da imagem, porque `box-shadow inset` do próprio slot ficaria atrás dela.
  ⚠️ Logo enviada que não seja quadrada é cortada nas bordas — as do acervo são
  1080×1080. Se isso virar problema, o ajuste é validar a proporção no envio, não
  devolver a margem.

#### Contas da equipe sem e-mail + função Comercial — 01/10/2026 (Fase 16)

- **Conta da equipe = usuário + senha**, criada pelo administrador em
  Administração › Equipe (`criar-conta-organizacao { usuario }`). O Auth guarda
  `<usuario>@equipe.sweetcoffeeweek.com.br`, endereço interno que não recebe
  mensagem. O login monta o mesmo endereço (`enderecoDaConta` em
  `src/lib/orgAccess.js`); quem digita "@" entra pelo e-mail — as contas antigas
  com e-mail real seguem valendo. ⚠️ Domínio e regra do usuário têm cópia na
  Edge Function; `tests/orgAccess.test.mjs` compara.
- **Usuário é VALIDADO, não slugificado** (`USUARIO_VALIDO`, 3–30 caracteres):
  converter faria dois usuários diferentes virarem a mesma conta.
- **Funções:** Administrador · Curadoria · Produção · **Comercial** (novo:
  `dado.ler`, `relacionamento.gerir`, `mensagem.enviar` — Contatos, Press Kit,
  Vouchers, mensagens) · Consulta. Migration `20261001_funcao_comercial.sql`.
  Função nova é linha em `funcoes`/`permissoes`, nunca lista no código.

#### Refinamento: conversa, fotos, logo, substituição, ajuda e app — 01/10/2026 (Fase 17)

Migration `20261001_painel_refinamento.sql` — ✅ **aplicada em 01/10/2026** pelo arquivo do
commit `2c960e6` (pg_net + sha256 conferido), registrada como `painel_refinamento`; publicada
em `master` no mesmo dia (`3031b90`, só o painel — a Home nova segue em `dev/site-completo`).
- **Conversa a um toque:** botão "Falar com a organização" no cabeçalho da marca, em
  toda tela, com o número de não lidas; mensagem nova vira a primeira "Próxima ação" do
  Início. Abrir a conversa marca como lido também o aviso de mensagem do sino.
- **Fotos:** a policy `fotos_marca_reserva` passou a exigir `foto_liberacao = 'liberado'`
  e vaga futura; índice `sessoes_fotos_uma_ativa` (uma sessão agendada/remarcada por
  participação). Vaga aberta fora da grade aparece para a organização, com "Fechar vaga".
- **Logo:** continua valendo na hora (decisão do Wilker); a organização recebe aviso. A
  marca vê as próprias versões. ⚠️ A checagem de SVG é **só no navegador**
  (`svgInseguro`): quem chama a API do Storage direto passa. Fechar isso é uma Edge
  Function que leia o arquivo antes de `registrar_logo`.
- **Substituição por item:** `participantes_itens.tem_substituicao` + `substituicao`
  (≤500). Opcional, não conta no progresso. O front só envia as colunas se elas vieram do
  banco — antes da migration o PATCH não quebra.
- **Push com dono:** `push_subscriptions.user_id`; gatilho `push_substitui_aparelho`
  (outra conta no mesmo aparelho substitui a anterior) e `push_segue_conta` (conta
  desativada/bloqueada pausa os aparelhos). Assinaturas antigas da organização ficam sem
  dono até serem religadas.
- **Tour guiado** (`components/Tour.jsx`, etapas em `lib/ajuda.js`) — substituiu a
  "Ajuda rápida" em lista, que era o manual que o pedido recusava. Camada sobre o painel,
  sem rota: recorte em volta do elemento real (`data-tour="…"`, primeiro visível vence,
  com reserva — no celular "Arquivos" aponta para "mais"), balão com seta, progresso,
  Voltar/Próximo/Pular/Concluir e "Abrir esta tela". Etapa some sem âncora na tela ou sem a
  ação de `pode()` que ela exige; o texto diz o que a função **não** faz. Abre sozinho uma
  vez por usuário neste aparelho (`scw_tour_<papel>_<usuario>`, localStorage — não vai ao
  banco), nunca por cima de link de aviso/push; reabre pelo botão de informação.
  `tests/painel-app-ajuda` reprova link que não abre tela e `data-tour` que não existe.
  ⚠️ **Botão novo que o tour explica precisa do `data-tour`** — sem ele a etapa some calada.
  ⚠️ A regra `.ui-ajuda` da lista antiga colidia com o `<Ajuda>` recolhível de `ui.jsx`
  (Edição, Press Kit, Vouchers); saiu junto.
- **Painel como app:** `lib/instalar.js` captura `beforeinstallprompt` (importado no
  `main.jsx`, antes do render). `ConviteApp` (Início e Visão geral) junta instalar +
  avisos, com "Agora não" em `localStorage`; reabre pela última etapa do tour e pela
  Conta. Nunca pede permissão sozinho.

#### Redesenho "mesa de trabalho" — 01/10/2026 (Fase 18)

Pedido do Wilker ("faça diferente e melhor todos os componentes"). Só visual e
confirmações; nenhuma regra de negócio mudou.
- **Três raios, três sombras, nada à mão.** `--r-1` 10 (controle pequeno) ·
  `--r-2` 14 (campo, bloco, disco, aviso) · `--r-3` 22 (card, janela);
  `--sombra-1` repouso · `--sombra-2` sob o ponteiro/menu/barra presa ·
  `--sombra-3` janela. `--contorno` é o anel de 1px do card. O teste
  `painel-app-reconstrucao` reprova raio literal fora de pílula/círculo/traço.
- **Card tem UMA definição** (bloco "Superfície elevada" no topo do
  `painel.css`): quem é card entra na lista do seletor; nenhuma regra redeclara
  fundo, borda ou sombra de card. Atalho (`button.`) sobe e acende; card sem
  destino não.
- **Disco de módulo segue o ciclo da paleta** na ordem da grade (§6.3), não um
  bege único; card solto fica amarelo. A cabeça do módulo com corpo vira barra
  de título com filete.
- **Uma peça por papel:** abas (filtro, conteúdo e modo da agenda) = controle
  segmentado; campo = um desenho (48px); aviso = `.og-aviso` (o `.aviso` da
  marca usa a mesma regra); link = uma família; selo = mapa único (andamento
  cyan, feito chocolate, atenção laranja).
- **Folha** com topo chocolate e corpo creme arredondado por cima; puxador no
  celular. **Confirmação própria** (`components/Confirmar.jsx`: `confirmar`,
  `pedirTexto`, `avisar`, `<dialog>` nativo montado uma vez no `App`) —
  ⛔ `window.confirm/prompt/alert` não voltam (teste reprova). Ação que desfaz
  algo sai em laranja (`.og-btn--perigo`); o foco entra em "Voltar".
- **Escolha de uma entre várias = caixa de seleção** (`Escolha` em `ui.jsx`,
  `<select>` nativo com seta própria): filtros, situação de foto/pagamento/combo,
  "ver por". ⛔ Fileira de botões `ui-chip` não volta (teste reprova). Abas de
  navegação (`Abas`, `.og-abas`) seguem como controle segmentado.
- Cartão da esteira mostra a **logo da marca** (`get_logos`, leitura à parte:
  falhou, ficam as iniciais).
- **Versão nova chega ao app instalado** (02/10/2026; refeito em 18/10/2026 — ver "Atualização do painel" abaixo).
  Até 17/10 comparava só o arquivo JS de entrada e recarregava sozinho ao voltar ao app; hoje nunca recarrega sozinho.
- **Desfoque do iOS 26 no topo do app instalado** (02/10/2026): o sistema desenha um
  "Liquid Glass" ~40pt além da barra de status, e nenhum CSS ou meta o desliga.
  ⛔ Cabeçalho `sticky` com fundo sólido **foi testado no iPhone e não resolveu**.
  O que vale é o conteúdo começar abaixo dele: token `--topo-app` (área segura +
  2.5rem só com `-webkit-touch-callout` + `display-mode: standalone` em pé),
  usado no cabeçalho, na faixa de conexão, na folha e no login. Elemento novo
  preso ao topo usa `--topo-app`, nunca `--scw-safe-t` direto.
- **Folha cortada no app do iPhone** (18/10/2026): `-webkit-overflow-scrolling:touch` na
  `.og-vista`/`.pn-vista` fazia o iOS recortar a folha (`position:fixed`, nasce dentro da
  vista) na caixa da vista — cabeçalho e abas cobriam título, X e o pé. Removido;
  ⛔ não voltar (o `painel-infra` reprova). Chrome e o computador não mostram o defeito.
- **Login fica até "Sair"** (02/10/2026, pedido do Wilker): a sessão por token
  da marca (`scw_marca`) e da conta da equipe (`scw_org_conta`) mora no
  aparelho (`localStorage`), só por `lib/sessaoGuardada.js`. Revoga a regra
  antiga "morre com a aba": o iOS apagava o `sessionStorage` ao fechar o app e
  a marca entrava de novo a cada visita. A sessão gravada pelo diálogo do site
  (aba) muda para o aparelho na primeira leitura. ⛔ A senha compartilhada
  (`scw_org`) segue só na aba — é senha em texto puro. Risco aceito: em
  computador compartilhado, quem não tocar em Sair deixa a conta aberta.
- **Só conta pessoal + logins padronizados** (02/10/2026, pedido do Wilker): a
  senha compartilhada saiu do login do painel, do diálogo do site e da tela
  Equipe (no banco já estava desligada). Login da equipe é **gerado**, não
  digitado: nome e sobrenome juntos + sigla da função (`wilkereloi.adm`;
  adm · cur · prod · com · cons), por `usuarioDaEquipe()` em `orgAccess.js`;
  trocar a função depois não troca o login. Login da marca **sem hífen**: só
  letras e números (`caffebasilicos`), então qualquer grafia do nome entra.
  As contas existentes mudaram pela migration `20261002_logins_padrao.sql`
  (senhas intactas; o e-mail real de quem entrava por e-mail ficou em
  `raw_user_meta_data.email_anterior`). ⛔ Slugificação com hífen não volta:
  mudar a regra é migrar o login de todas as contas.
- **Valor do combo é da organização** (02/10/2026, pedido do Wilker): um valor
  por edição em `edicoes.valor_combo` (Edição › Configuração); a marca vê e não
  muda (`combo_preco` saiu do grant da marca e da tela). A marca informa
  `custo_embalagem` — obrigatório se o combo pode ser para viagem — e
  `custo_delivery` — obrigatório se alguma unidade faz delivery; zero vale.
  Progresso = 16 campos fixos + os custos que se aplicam, mesma regra em
  `custosFaltando()` (cadastro.js), `camposObrigatorios()` (guia.js),
  `campos_cadastro` e `marca_concluir_cadastro`.
- ⚠️ Ficou de fora: rodapé fixo de ações nas folhas (as ações moram dentro de
  cada formulário; mover as 25 folhas mexe em lógica) e números no cabeçalho da
  página.


#### Cartoon 2026.2 — organização (14/10/2026)

Plano: `docs/cartoon-2026-2/04-painel.md` §4.4–4.5 e `02-arquitetura-rotas-fases.md`
§2.6–2.8. Contrato: migrations `20261014_cartoon_02_publicacao.sql` e `_03_revisao.sql`
(e `_04_avaliacao.sql` para o resumo). O que passou a valer:

- **Publicação é dimensão separada da revisão.** `status.js` ganhou `publicacao`
  (não publicada · publicada · retirada · alteração em análise — derivado, não CHECK),
  `midia` e `fase_edicao` (CHECKs, conferidos no teste de status). Toda a lógica pura
  (diferença vigente × atual, tradução das pendências, espelho dos CHECKs de
  `edicao_publicacao`, fuso de Fortaleza, coordenada de Natal, erros) mora em
  `lib/publicacao.js`, testada em `tests/painel-app-publicacao.test.mjs`.
- **Participantes › Publicação** (`vistas/Publicacao.jsx`, `ListaPublicacao`): uma linha
  por casa (`get_publicacoes_edicao`), filtro no endereço (`situacao`); abre a ficha na
  aba **Publicação** (`AbaPublicacao`): publicar a casa / casa e combo
  (`publicar_participacao`, `curadoria.decidir`), retirar com motivo, pendências
  traduzidas, diferença campo a campo, prévia, endereço público (só antes da 1ª
  publicação, `cadastro.editar`), coordenada conferida (`producao.gerir`) e fotos
  (aprovar exige texto alternativo).
- **Prévia = o componente do site.** `vistas/edicao/PreviaPublica.jsx` importa
  `FichaParticipante` e `scw-cartoon.css` por `React.lazy`. ⚠️ Fica numa pasta
  `edicao/` de propósito: `tests/rotas-edicao.test.mjs` reprova o estilo da edição fora
  de pasta de edição. ⛔ Não escrever as classes da edição em `edicao-org.css`.
- **Edição › Publicação no site** (`vistas/PublicacaoEdicao.jsx`, `ChavesEdicao`): fase,
  as 4 chaves e a janela da avaliação (`definir_publicacao_edicao`, `edicao.gerir`).
  O botão desliga com o motivo quando a mudança violaria um CHECK; ligar pede
  confirmação; desligar não. **Edição › Avaliações** (`relatorio.ler`): números por
  casa, nenhum dado pessoal.
- ⚠️ **Foto oficial ainda não sobe**: `arquivo-url` só aceita os buckets `arquivos`,
  `combos` e `logos` e caminho `<pasta>/<arquivo>`. A tela já envia
  `{ bucket: 'edicao-publico', path: '<edição>/<participação>/<uuid>.webp' }`; falta a
  função aceitar esse bucket e esse formato de caminho (subir com `producao.gerir`,
  sem `upsert`). Até lá a tela mostra o erro traduzido.

#### Cadastro da marca na camada de edição (Cartoon 2026.2) — 14/10/2026 (fase 3, lado da marca)

Plano: `docs/cartoon-2026-2/04-painel.md` §4.2–4.4. Contrato do banco: migrations
`20261014_cartoon_01..03` (⚠️ **ainda não aplicadas** — o código as segue à letra; sem elas
o cadastro abre e os blocos novos dizem "Esta etapa abre quando…", por `seFaltar` na
leitura de `unidades`). O que passou a valer:

- **Blocos 0 a 7, as duas abas do mesmo `Cadastro.jsx`:** Meu cadastro = 0 marca · 4
  unidades · 6 atendimento e horário do combo (· 7 fotos, sem tela aqui); Meu combo = 1
  tema · 2 itens · 3 combo · 5 informações alimentares e trocas. `vistaDoBloco` (guia.js)
  espelha `link_campo_marca`; os blocos 5 e 6 entram na aba certa sem o `App.jsx` listá-los.
- **Peças em `components/vistas-marca/edicao/`** (Unidades, Atendimento, Alimentar, Envio,
  campos) e **lógica pura em `lib/edicaoMarca.js`** (teste `painel-app-edicao-marca`).
  Estilo em `styles/edicao-marca.css` (prefixo `em-`).
- **Unidade = duas linhas:** `unidades` (permanente: endereço estruturado, WhatsApp com
  `whatsapp_autorizado`, horário da loja) + `participacao_unidades` (`participa`, modos em
  três estados, canais, regiões, taxa, observação). Nova = POST `unidades` → POST
  `participacao_unidades` com `unidade_id`. Unidade de outra edição aparece como **sugestão**
  ("Usar nesta edição"), nunca copiada sozinha. `endereco`/`bairro`/`faz_delivery` da
  participação seguem preenchidos como **espelho** para quem ainda os lê. ⛔ A marca não
  grava `lat/lng`: vê só "conferida pela organização" ou "em conferência".
- **Horário DO COMBO** (`unidade_disponibilidade`), por dia de `edicoes.festival_inicio..fim`:
  "Mesmo horário todos os dias" = DELETE das linhas da unidade + POST do lote; ajuste e
  remoção por dia. Operação imediata (`operar`) descarrega a fila antes.
- **Declarações alimentares:** linha ausente = não respondido, **nunca** "não contém"; a
  tela nunca pré-marca. Grava por PATCH no `id` ou POST (o `on_conflict` do PostgREST não
  usa o índice único parcial). "Outro" sem dizer qual não grava (check do banco).
- **Trocas** (`substituicoes`): acréscimo vazio = não informado, `0` = sem custo;
  modalidades/unidades vazias = todas.
- **Legado que deixou de ser escrito:** selos vegano/sem glúten/sem lactose e a
  substituição em texto dos itens; vegano/diet/"sobre o delivery" do combo. "Para viagem"
  fica (decide o custo da embalagem).
- **"Faltam N itens para enviar"** = campos obrigatórios (menos a logo) + `pendenciasEdicao`,
  espelho de `pendencias_publicacao` (mesmos códigos; o teste confere a lista de alergênicos
  contra o SQL). O envio traduz os códigos novos (`unidade:<id>:…`, `item:<n>:alimentar`)
  com o NOME da unidade e leva ao campo (ids `campo-unidade-endereco`, `-2`, `-3`…).
- **Prévia** ("Ver como fica no site"): `marca_previa_publica` desenhada pela MESMA
  `FichaParticipante` do site, carregada sob demanda (`edicao/FichaPrevia.jsx`, que importa
  `scw-cartoon.css`). ⚠️ A classe raiz da edição só pode ser escrita dentro de uma pasta
  `edicao/` — `tests/rotas-edicao` reprova o estilo dela no resto do painel.
- **Publicação ≠ revisão:** `marca_minha_publicacao` dá a linha "Sua página está publicada
  (versão N)" com o link; `alterado_apos_aprovacao` mostra o aviso e troca o botão para
  "Enviar alterações". A marca nunca publica.
- ⚠️ Ficou de fora: tela de fotos do bloco 7, declarações da alternativa de uma troca,
  seletor de edição com duas participações abertas, e o Início (`resumoMarca`) ainda não
  conta as pendências da camada de edição — só a barra do próprio cadastro.

#### Ficha geral do participante — 15/10/2026 (pedido do Wilker)

Clicar no participante abre a **Visão do participante**: tudo o que foi preenchido, numa
página só, para LER. As dez abas (Resumo, Cadastro, Combo, Unidades, Operação, Publicação,
Mensagens, Trajetória, Acesso, Histórico) viraram **quatro vistas**: Visão do participante ·
Comunicação · Histórico · Gestão. ⛔ Não recriar aba por assunto nem o "Resumo" de cards-atalho.

- **Composição pura em `lib/fichaGeral.js`** (teste `painel-app-ficha-geral`). Quatro
  LEITURAS, estado próprio por fonte (carregando · ok · erro · sem_permissao ·
  sem_participacao): `get_ficha_360` (já contém `get_ficha_participacao` — não pedir os
  dois), `get_publicacao` (camada Cartoon: `montar_publico` com alergênicos, trocas,
  unidades e horários; fotos; versão no ar), `get_correcoes`, `get_edicoes` (tema GERAL da
  edição). `criarCarregadorFicha` descarta resposta velha ao trocar de marca; o hook
  `useFichaGeral` (`vistas/FichaVisao.jsx`) guarda de qual participação é o estado.
  ⛔ Abrir a visão não grava nada: a conversa (`ler_mensagens_org`) só monta em Comunicação
  (o teste confere).
- **Regras de leitura que não se negociam:** declaração ausente = "Sem resposta", nunca
  "não contém"; "não sei" gravado ≠ sem resposta; leite (alergênico) ≠ lactose
  (característica); selos vegano/sem glúten/sem lactose e substituição em texto saem como
  "cadastro anterior, não confirmado"; custo/acréscimo vazio = não informado, `0` = sem
  custo; preço da edição (`edicoes.valor_combo`) separado dos custos da marca; foto
  recebida ≠ aprovada ≠ publicada (está no `vigente.conteudo`); papel da foto é o gravado.
  Tema: `tema_combo` × `temas_propostos` — quando discordam a ficha diz ("mudou depois da
  última proposta"), não escolhe um.
- **Pendências** (`pendenciasDaFicha`): uma por chave estável (a mesma falta de duas
  fontes conta uma vez); campos vazios agrupados por seção; fonte com erro vira "não
  consegui verificar", nunca "nada pendente". Cada item leva à seção.
- **Editar = o editor de sempre, no lugar da seção** (`EdicaoNaSecao` em
  `FichaMarcaPagina.jsx`): `AbaCadastroMarca`, `AbaCombo`, `AbaUnidades`, `AbaOperacao`,
  `AbaPublicacao`, `ConferirLocalizacao` e `RevisarFotos` (exportados de `Publicacao.jsx`).
  Formulário com digitação não enviada pergunta antes de sair (e `beforeunload`).
  Concluir recarrega as fontes. Ações por função em `acoesDaSecao` — o banco decide de novo.
- **Endereço:** `sub` vazio = visão; seção = âncora (`sub=unidades`, gravado sem empilhar);
  `comunicacao`/`historico`/`gestao`. Os `sub` antigos são traduzidos em
  `lib/rota.js` (`destinoNaFicha`): mensagens → Comunicação, acesso → Gestão, trajetoria →
  Histórico (âncora), cadastro/combo/tema/unidades/operacao/publicacao → seção da visão.
- **Lista de Marcas:** busca no endereço (`busca`), clique abre sempre a visão, posição da
  lista volta ao fechar a ficha (`.og-vista` é quem rola).
- **Logo no cabeçalho da ficha é `contain`** (logo inteira, pedido de 15/10/2026) — exceção
  local ao `cover` de `.ui-logo`, só em `.fg-logo`.
- ⚠️ Ficou de fora (lacuna de backend/UI, nada alterado no banco): a organização não edita
  pelo painel os campos da camada Cartoon (nome/descrição/condições do combo — o RPC
  `org_salvar_dados_publicos` aceita, falta a tela —, declarações alimentares, trocas,
  unidade permanente, modos e horário do combo) — quem preenche é a marca; o WhatsApp de unidade não autorizado não chega
  à organização (`montar_publico` só devolve o autorizado); pagamento aparece na visão só para
  `pagamento.gerir`, mas `get_ficha_360` entrega `pagamento_status` a qualquer `dado.ler`
  (restringir é migration). Voltar do navegador com editor sujo não pergunta (só os botões).

#### Logos oficiais da Cartoon — 15/10/2026
As 26 logos de `10_LOGOS_PARTICIPANTES/PRINCIPAIS` (Dropbox da edição) são as oficiais, conferidas pelo Wilker; não recriar nem
questionar. No painel elas entram como logo **do acervo** (`logos_marca.origem = 'acervo'`, caminho `/logos/participants/<slug>.png`,
registrada por `registrar_logo`), que `urlLogo` (`lib/logos.js`) já serve como arquivo do site. Fluxo para trocar uma logo: ver
`src/CLAUDE.md` §6.12 (script `scripts/sincronizar-logos-oficiais.py` + `scripts/acervo-logos-para-sql.mjs`).

#### Link de preenchimento das marcas — 16/10/2026 (pedido do Wilker)
As marcas da edição **não** recebem acesso ao painel agora. Cada participação ganha um link único
`/preencher/#<código>` (página estática `public/preencher/index.html`, mesmo padrão do `/quero-participar`):
manual curto da edição (tudo de `edicoes` + `edicao_cronograma`) e formulário pré-preenchido em 6 blocos
(contato, tema, combo, 3 itens, lojas, observações), cada um com "Conferi". Migration
`20261016_link_preenchimento.sql`; lógica pura em `lib/preenchimento.js`; telas em `vistas/Preenchimento.jsx`;
teste `tests/painel-app-preenchimento.test.mjs`.
- ⛔ **O envio não grava no cadastro** (decisão do Wilker: "passa por revisão"). Vira `preenchimento_envios`
  `pendente`; a organização vê a diferença campo a campo na ficha › **Gestão** e aplica ou descarta
  (`org_preenchimento_decidir`, `cadastro.editar`). Aplicar chama as MESMAS `org_salvar_*` do editor; lojas
  gravam `unidades` + `participacao_unidades` (espelho `endereco`/`bairro`/`faz_delivery`). Nome da marca fica
  de fora (é login): a marca avisa em "Observações".
- O código mora no **fragmento** (`#`), não vai ao servidor nem ao Referer; página `noindex` e `no-referrer`.
  Tabelas sem policy; anon só alcança `preenchimento_ler`/`preenchimento_enviar`, que exigem o código.
  Envio novo substitui o pendente; 15 s entre envios; 40 por link; 60 KB.
- **Participantes › Preenchimento** lista a edição atual: gerar os links que faltam, copiar todas as mensagens,
  WhatsApp por marca. A mensagem diz "obrigatório e urgente" com o prazo do cronograma (`chave = 'preenchimento'`,
  24/10/2026). ⛔ Prazo é dado da edição, não constante no front.
- Trocar o link revoga o anterior (`p_novo`). Link vence em `festival_fim + 15 dias`.
- ⚠️ Fica de fora do formulário: declarações alimentares/alergênicos, trocas, horário do combo por dia
  (`unidade_disponibilidade`) e canais de delivery — o horário do combo chega como texto em
  `participacao_unidades.horarios`; alergias vêm em "Observações".
- **v2 (16/10/2026, pedido do Wilker: "o jeito mais fácil de preencher"):** topo com 3 fatos (datas,
  combo, valor) + prazo, sem agenda; uma confirmação só no fim; opcionais recolhidos em `<details>`;
  ícones do registro (`<!--icone:…-->`, página listada em `icones/especificacao.json` › `estaticos`).
  Quase tudo por seleção: alergênicos (contém / "Nenhum" / traços), características (vegano,
  vegetariano, sem lactose, sem açúcar), troca por item (Sim/Não, disponibilidade, acréscimo em
  valores prontos), custos em valores prontos + "Outro", cidade (Natal/Parnamirim/Outra), bairro com
  sugestões, horários por dias + "das/às" (texto `Ter a Dom, 10h às 22h`, que a página lê de volta).
  Migration `20261016_link_preenchimento_alimentar.sql`: o retrato e o "Aplicar" passam a cobrir
  `declaracoes_alimentares` e `substituicoes`. ⛔ Desmarcar selo não grava "não": vira `nao_informado`
  só se antes estava marcado; alergênico só vira `nao_contem` quando a pessoa respondeu a pergunta.

#### Social media — planejamento, biblioteca e participantes — 16–17/10/2026 (`#social/…`)
Módulo próprio (era Operação › Redes sociais; `#operacao/redes…` e avisos antigos `operacao/redes/<id>` caem aqui —
`migrarRota`/`rotaDoLink` em `lib/rota.js`, e a barra de endereço é corrigida). **Um calendário só.** Abas:
**Planejamento** (`vistas/Redes.jsx` + `RedesFicha.jsx`) · **Biblioteca** (`SocialBiblioteca.jsx`) · **Participantes**
(`SocialParticipantes.jsx`, só com `editorial.ler`). A função `social` ("Social media") entra direto em
`#social/planejamento` (App.jsx, pela função; link direto e aviso têm prioridade) e só vê Visão geral + Social media
(`PODE_MODULO` no PainelShell: sem `dado.ler` os módulos de cadastro nem aparecem). ⛔ O painel **não publica** no
Instagram, não guarda senha de rede e não fala com a Meta. Não confundir com Edição › Publicação no site.
- **Banco, nesta ordem:** `20261017_equipe_perfis_avisos.sql` (foto, diretório, Meu perfil, avisos por pessoa) →
  `20261017_social_media.sql` → `20261017_social_media_ajustes.sql` (`search_path` + `push_pessoal = true`, que só vale
  com a `enviar-push` com `push_destinos` publicada — senão o aviso de uma pessoa iria a todos os aparelhos) →
  `20261018_social_aprovacao.sql` (aprovação, abaixo). Edge Functions `arquivo-url` (bucket `equipe`, materiais gerais
  para `redes.ver`) e `enviar-push` (`push_destinos`) publicadas em 17/10/2026.
- ✅ **Aprovação da Eline — 18/10/2026** (pedido do Wilker). Etapas: **Rascunho → Aguardando aprovação → Aprovado →
  Publicado** (gravado: `rascunho` · `aprovacao` · `pronto` · `publicado`; `preparacao` é legado, fica no CHECK e no
  rótulo, o banco não grava mais). "Enviar para aprovação" (`redes.editar`) exige as pendências do formato; "Aprovar" é
  `redes.aprovar` (só Administrador). O aviso "Aguardando sua aprovação" vai a `admin_config.redes_aprovadores` (Eline);
  vazio → todos com `redes.aprovar`. **Pedir ajuste** (comentário de ajuste) devolve para rascunho — ⚠️ sem tocar em
  `atualizado_em`, senão o selo "Ajuste pedido" some na hora. Mudou legenda, menções, formato ou arte de um APROVADO e
  quem mudou não aprova → volta para "Aguardando aprovação" e a Eline é avisada (`redes_rever_etapa`); horário e
  responsável não desfazem a aprovação. Confirmar publicação continua exigindo `pronto`. **Quem criou cancela a própria
  postagem** enquanto ela não foi aprovada (antes a Social media ficava sem saída); depois disso, só `redes.gerir`.
- **Guia** (`vistas/SocialGuia.jsx`, texto em `lib/socialGuia.js`; refeito em 17/10/2026 para não empurrar o
  calendário): na primeira visita deste aparelho, UMA linha (`GuiaPrimeiraVez`, `etapasResumo`: o caminho inteiro,
  com quem aprova e a publicação manual) + "Ver o passo a passo" / "Entendi" (`scw_social_guia_visto`; quem escondeu o
  guia antigo — `scw_social_guia_recolhido` — não vê de novo). Os seis passos moram numa FOLHA aberta por "Como
  funciona" no cabeçalho (`SocialGuia`).
- **Alertas e atalhos:** a conta vem de `redes_resumo` (TODAS as abertas), não do mês aberto na tela — antes
  dezembro mostrava "0 atrasadas" com atraso em outubro. À vista só os ALERTAS do perfil e só com algo
  (`alertasDoPerfil`: quem aprova vê para aprovar · atrasadas · com ajuste; quem publica vê com ajuste · a publicar ·
  atrasadas). ⛔ Contador zerado não vira bloco. Os outros atalhos são "Lista rápida (todas as datas)" dentro de
  Filtros. Atalho ligado troca o período por uma faixa que DIZ o escopo (`escopoAtalho`: "de qualquer data… Não é a
  semana escolhida") com "Voltar ao calendário".
- **Nova postagem enxuta:** título (único obrigatório), formato, responsável (= quem cria), data, horário e legenda;
  o resto em "Mais detalhes (opcional)". No celular, os campos vêm antes da arte. "Criar postagem" do participante põe o
  @ da casa nas menções (`arrobaDe`) e leva `volta=part:<id>` no endereço: fechar (ou fechar a postagem criada) volta à
  ficha do participante. Escolher a arte na postagem nova cria o rascunho e sobe a arte em seguida
  (`ENVIOS_PENDENTES`). A postagem nova NÃO criada fica guardada neste aparelho (`scw_redes_rascunho_novo`, só o que a
  pessoa mudou); vindo do participante com uma guardada, a tela pergunta ("Continuar a de antes" / "Seguir com a do
  participante") — nunca troca em silêncio. Valor automático (responsável, edição atual) não conta como alteração.
- **Cor do módulo: verde** (`--scw-verde #22B573`, 10ª cor, SÓ do painel — pedido do Wilker, 18/10/2026; chocolate sobre
  ele 6,1:1). Antes repetia o laranja de Operação. ⛔ Não usar no site.
- **Barra do celular escolhida pela pessoa** (`lib/atalhosBarra.js`): Mais › "Escolher os atalhos da barra" marca até 4
  áreas; fica no aparelho, por conta (`scw_barra_<user_id>`). Padrão: Visão geral, Participantes, Social media, Operação
  (Contatos foi para "Mais"). Área que a pessoa deixou de ver sai sozinha da escolha. O painel da marca segue fixo.
- **Planejamento** (refinado em 17/10/2026 — percurso: ver a semana → escolher o dia → abrir o post → conferir arte e
  legenda → próxima ação). Topo em TRÊS níveis: cabeçalho ("Planejamento" — no estreito só para o leitor de tela, a aba
  já é o título —, "Nova postagem", "Como funciona"); período (anterior · intervalo que abre o calendário do aparelho
  por `showPicker` · próximo · Hoje; rótulo curto no celular, `tituloCurto`); ferramentas (Semana/Mês/Dia/Lista —
  segmentado no largo, caixa de seleção no estreito —, "Sem data" com contador, busca, "Filtros" com quantos estão
  ligados e "Limpar filtros"). Tudo no endereço, como antes.
  Abre na SEMANA, **segunda a domingo**. ⚠️ O arranjo segue a LARGURA DO CONTEÚDO, não a do aparelho
  (`useLargura` + `ResizeObserver` → `R.layoutSemana`): **colunas** (≥1040 px de conteúdo: sete colunas de cartões
  curtos, dia clicado abre embaixo), **agenda** (600–1039: dias em linhas, postagens ao lado) e **linhas** (<600: dia,
  data, quantos e alerta; o dia escolhido abre ali mesmo, sem repetir data nem contagem). 1024 px de tela com o menu
  lateral cai em agenda — sete colunas ali ficavam ilegíveis. Nenhuma rolagem automática; hoje destacado.
  ⚠️ **`container-type` contém posição fixa:** o container (`.rd-c`) envolve só o calendário; a ficha e o guia
  (folhas `position:fixed`) ficam FORA dele — dentro, a folha ficaria presa na caixa do calendário. Mesma regra em
  `.sb` (Biblioteca, sem folha) e nunca em `.sp` (Participantes abre folha).
  **Cartão** (`CartaoPost`): miniatura · título (até 2 linhas, sem hifenizar) · hora e formato · situação · responsável
  quando cabe; UM alerta, o mais urgente (`alertaDoCartao`: atrasada > ajuste > mesmo horário > pendências). O cartão
  inteiro é o botão. Mês, Dia, Lista e Sem data continuam; filtro por **participante** (`part`).
- **Ficha da postagem — leitura antes de formulário** (17/10/2026): arte → legenda → programação → "Próximo passo" →
  gavetas recolhidas (detalhes · arquivos e versões · comentários · histórico; nenhuma dentro da outra). Cada bloco
  edita NO LUGAR (`R.SECOES`: legenda sozinha — "Salvar" logo embaixo do campo, ao alcance com o teclado aberto —,
  menções e observações, programação, detalhes); bloco com alteração não salva fica aberto. Pendência leva ao bloco e
  ao campo (`ONDE_PENDENCIA`). A ÚNICA ação em destaque mora no rodapé (`R.proximaAcao`): criar · salvar (com
  alteração não salva é sempre salvar — nenhuma etapa anda com a versão antiga) · enviar para aprovação · aprovar (só
  `redes.aprovar`) · confirmar publicação. O raro fica em "Mais ações". Prévia: arte inteira (contain), altura
  controlada, posição "2 de 7", anterior/próximo e miniaturas (nada depende de gesto), "Ampliar", "Baixar arte"/"Baixar
  as N" com texto; falha de download aparece com "Tentar de novo" (nunca `.catch(() => {})`).
  `Folha` ganhou duas props OPCIONAIS, só o Social media usa: `rodape` (barra fora da rolagem — sem sticky nem margem
  negativa; substituiu o `.rd-rodape` preso com `bottom:-40px`) e `cheia` (tela inteira no celular). As outras folhas
  não mudam.
  Também: "Última alteração: <avatar> nome · quando" e "criada por"; versão de cada arte (substituir sobe
  1, a anterior fica em "Versões anteriores"); origem (enviada aqui × da biblioteca); quem confirmou com avatar;
  comentário com **pedido de ajuste** (selo "Ajuste pedido" até a próxima alteração; avisa responsável e autor);
  "Ver participante e combo". ⛔ Arte enviada por OUTRA pessoa (o designer) só `redes.gerir` substitui ou remove — a
  Social media envia, associa, ordena e pede ajuste (`redes_exigir_dono`).
- **Biblioteca** (`social_biblioteca`): uma lista só, por REFERÊNCIA (nada copiado) — arte final (`redes_arquivos`,
  inclusive da biblioteca com `post_id` nulo, enviada por `redes.gerir`), foto do combo/loja (`midias_participacao`,
  bucket público `edicao-publico`), logo (`logos_marca`, "oficial" × "anterior"), material geral da campanha
  (`arquivos` de escopo geral). Filtros: tipo, edição, participante, situação (padrão "disponível"), busca. Associar a
  uma postagem (`redes_arquivo_associar`) grava bucket + caminho resolvidos NO SERVIDOR pelo id de origem: trocar a foto
  depois não muda a postagem. PDF e SVG ficam "só download". Privado continua privado: `redes` e `equipe` por
  `baixar_varios`, `arquivos` por `baixar` (só `geral/` para `redes.ver`), renovados (`lib/redesArquivos.js`; fonte =
  `{ bucket, path }`).
- **Biblioteca com PASTAS** (17/10/2026, `SocialBiblioteca.jsx` + `lib/pastas.js`). Migration
  `20261019_social_pastas.sql` ✅ **aplicada em 17/10/2026** pelo arquivo do commit `1086da5` (pg_net + sha256
  `1e16229e…` conferido), registrada como `20261019_social_pastas`; cópia das duas funções substituídas e o roteiro de
  reversão em `sweet-coffee-week-dados/backups-supabase/scw-2026-10-17-antes-pastas/`. Sem ela o painel mostraria a
  biblioteca sem pastas e um aviso; nada quebra. Organizar é serializado (`pg_advisory_xact_lock`) e a lista corta
  sempre pelos 300 MAIS RECENTES (a ordem por nome vem depois; a tela avisa quando bate no teto). Arte substituída
  numa postagem herda a pasta da versão anterior (gatilho `social_pasta_herdar_versao`). Pastas VIRTUAIS: `social_pastas` (hierarquia por `pai_id`,
  vínculo opcional a edição/participante, arquivar — nunca apagar) + `social_biblioteca_pasta_item` (`tipo`, `item_id`
  → pasta; sem linha = "Sem pasta") + `social_biblioteca_registro` (auditoria). Mover ou renomear NÃO toca no Storage,
  no caminho, nas versões nem nas postagens; a origem (foto, logo, material) fica intacta. O banco impede ciclo, nome
  vazio/com "/"/repetido no mesmo nível (índice único), pasta arquivada como destino e vínculo quebrado
  (`social_item_existe`). Arquivar pasta com conteúdo exige `p_confirmar` e sobe tudo para a pasta-mãe (ou "Sem pasta").
  Organizar = `redes.gerir`; a Social media navega, baixa e associa. Abre com as pastas primeiro, arquivos embaixo;
  atalhos Biblioteca · Sem pasta · Recentes; caminho + "Voltar" (= voltar do histórico: a casca troca "ir para a URL
  anterior" por `history.back()`); busca em tudo; ordem nome/atualização; seleção explícita ("Selecionar") com barra
  presa embaixo; "Mover para…" mostra a árvore sem a própria pasta nem as de dentro. Envio dentro da pasta aberta
  (`social_biblioteca_registrar` com `pasta_id`), "Enviado e registrado" só depois do banco. O seletor da postagem é o
  MESMO navegador (`NavegadorBiblioteca modo="seletor"`). Pasta, filtros e prévia (`ver=tipo:id`) no endereço.
- **Baixar e salvar** (17/10/2026, `components/vistas/BaixarArquivo.jsx` + `lib/entrega.js`): igual na Biblioteca e na
  ficha. "Baixar" busca o ORIGINAL (nunca a miniatura; nome, formato, resolução e transparência intactos), assina a URL
  na hora e, vencida, assina de novo uma vez; entrega por download direto na mesma aba (antes buckets que não eram
  `redes` abriam aba nova). Vários = UM ZIP sem compressão (`zipArmazenado`, CRC lido em pedaços), nunca downloads
  soltos; limites em `LIMITES` (ZIP 60 arquivos / 300 MB, 100 MB no celular). "Salvar ou compartilhar" só aparece com
  `navigator.canShare({ files })`: compartilha o ARQUIVO (nunca URL privada), até 10 / 60 MB; toque expirado →
  "Abrir opções para salvar" (um toque novo); cancelar = "Cancelado. Nada foi baixado." (sem download automático).
  ⛔ A tela nunca diz "salvo no aparelho" nem que foi para Fotos: diz "download iniciado" / "opções usadas".
  Carrossel sai numerado na ordem da postagem (`01-…`). Sem Web Share no celular: "Baixar" + orientação curta.
- **Participantes** (`editorial_*`): ficha EDITORIAL do mesmo registro, lida por `montar_publico` (a lista fechada de
  campos públicos — sem telefone, e-mail, CNPJ, custos, pagamento) + versão publicada (`publicacoes` vigente) + fotos,
  unidades, postagens ligadas e histórico com autor. "Criar postagem com a descrição" COPIA o texto na hora
  (sessionStorage `scw_social_nova_postagem`): a legenda nasce independente do combo.
- **Matriz de campos do combo** (Social media, `editorial.editar`, `editorial_salvar`):

  | Campo | Social media | Observação |
  |---|---|---|
  | `combo_nome` (≤80) | edita | aprovado → `alterado_apos_aprovacao`; o site não muda |
  | `combo_descricao` (≤400) | edita | idem |
  | `combo_proposta` (≤2000) | edita | não é pública |
  | componente `nome` (≤80) / `descricao` (≤400) | edita | só da mesma participação |
  | `combo_condicoes`, preço (`edicoes.valor_combo`), custos | ⛔ | comercial/edição |
  | tema, ingredientes, declarações alimentares, trocas | ⛔ | da marca e da curadoria |
  | status, revisão, publicação no site | ⛔ | `curadoria.decidir` |

  Trava: manda os valores LIDOS (`p_esperado`); se mudou no banco (a marca salvou) → `versao_desatualizada`, nada
  sobrescrito, e a tela compara e deixa decidir. Auditoria `combo.editorial` campo a campo (de/para, autor da sessão).
  A curadoria (`curadoria.decidir`) recebe "Combo editado", agrupado.
- **Matriz de permissões:**

  | Ação | Administrador | Social media | Outras funções |
  |---|---|---|---|
  | `redes.ver` — planejamento, fichas, biblioteca, baixar | ✓ | ✓ | — |
  | `redes.editar` — criar, editar, legenda, horário, responsável, duplicar, comentar, pedir ajuste, enviar para aprovação, cancelar a PRÓPRIA antes de aprovada | ✓ | ✓ | — |
  | `redes.aprovar` — aprovar (e pedir ajuste do que aguarda aprovação) | ✓ | — | — |
  | `redes.arquivos` — enviar à postagem, ordenar, texto alternativo, associar; substituir/remover o PRÓPRIO | ✓ | ✓ | — |
  | `redes.publicar` — confirmar a publicação | ✓ | ✓ | — |
  | `redes.gerir` — cancelar, reabrir, desfazer/corrigir execução, arte da biblioteca, mexer em arte alheia | ✓ | — | — |
  | `editorial.ler` / `editorial.editar` | ✓ | ✓ | — |
  | `dado.ler`, `acesso.gerir`, `cadastro.editar`, `curadoria.decidir`, `pagamento.gerir`, `relatorio.ler`, `edicao.gerir` | ✓ | — | conforme a função |

- Situação gravada: rascunho · aprovacao · pronto (= Aprovado) · publicado · cancelado (+ `preparacao` legado);
  **atrasada é calculada**; só `redes_confirmar` publica (data e hora reais, link opcional, Story sem link, uma
  confirmação para a sequência). Enviar para aprovação e aprovar exigem as pendências do formato (`redes_pendencias` =
  `pendencias()` em `lib/redes.js`); perder um requisito devolve para rascunho, com registro. `redes_salvar` recebe a `versao` lida e só as chaves mudadas; o não salvo
  fica em `sessionStorage` (`scw_redes_rascunho_<id>`). "Salvo às…" só depois da resposta. Fuso America/Fortaleza fixo
  (teste com TZ de Tóquio e Los Angeles). Conflito de horário = mesmo perfil a < 30 min: avisa, não bloqueia.
- **Avisos** (`redes_avisar` → `avisar_pessoa`): por PESSOA — responsável e quem criou, nunca quem fez; "atribuído" vai
  só ao novo responsável. Eventos: atribuído · arte adicionada/substituída · legenda · horário · pedido de ajuste ·
  comentário · pronto · cancelado · publicado · combo editado (curadoria). Link `social/planejamento/<id>`. Agrupa: mesmo
  autor, mesmo assunto, não lido, 30 min → atualiza o aviso (`n_agrupadas`, "3 alterações"). Gravado na MESMA transação
  da mudança (se a gravação falha, não há aviso). Push: ver a ordem segura acima; `push_destinos` manda o pessoal só aos
  aparelhos do destinatário e o geral só a quem pode ler o tipo; a trava `push_enviado_em` e a tag por aviso evitam
  duplicar; falha de push não desfaz nada. ⛔ Lembrete com o painel fechado NÃO existe (não há agendador).
- 🐛 Esc numa folha que pergunta antes de fechar: a pergunta aberta DURANTE a tecla era cancelada pelo próprio Esc.
  `fechar()` espera a tecla terminar (ficha da postagem e ficha editorial). Outras folhas podem ter o mesmo defeito.
- 🐛 Campo envolvendo `<textarea>` no `<label>`: o texto digitado entra no nome acessível. Rótulo por `htmlFor`.
- 🐛 Endereço traduzido (link antigo, módulo sem permissão) mostrava a tela nova com o endereço velho na barra: o
  `hashchange` do PainelShell agora corrige com `replaceState`.
- Testes: `tests/painel-app-redes.test.mjs` e `tests/painel-app-equipe.test.mjs` (em `test:organizacao`).

#### Equipe: foto de perfil, Meu perfil e autoria — 17/10/2026
- `perfis.avatar_path` → bucket PRIVADO `equipe` (2 MB, webp/jpg), caminho `<user_id>/<uuid>.(webp|jpg)`. A
  `arquivo-url` só assina subida na pasta do PRÓPRIO JWT (conta ativa) ou com `acesso.gerir`; baixar = `dado.ler` ou
  `redes.ver`. `perfil_foto_definir` confere o objeto (pasta, tamanho, tipo) antes de apontar; remover só tira a
  referência — nada se apaga. O painel recorta um QUADRADO (zoom + posição, prévia no canvas; nada esticado) e gera
  512 px em webp (`lib/equipe.js`, `areaRecorte`/`gerarFoto`).
- **Meu perfil** (`components/MeuPerfil.jsx`, botão com avatar + nome no topo): dados, foto, nome de exibição
  (`meu_nome_definir`, 2–60, auditado) e avisos do aparelho. Login, função, ativação e permissões NÃO mudam ali. No
  celular o "Sair" do topo mora aqui (o avatar ocupa o lugar dele). Acesso compartilhado: explica que não é uma pessoa.
  Administração › Equipe: avatar na lista e o mesmo `EditorFoto` para trocar a foto de outra conta.
- **Autoria:** o registro guarda o id da SESSÃO (`auth.uid()`) + o rótulo do momento; o painel só desenha
  (`Avatar`/`Autor` em `components/Avatar.jsx`; diretório `equipe_diretorio` no `EquipeContexto` do PainelShell; fotos
  assinadas numa chamada só). Nome mostrado = o gravado (renomear não reescreve). Sem id: "Acesso compartilhado" (ícone
  de chave) ou "Sistema" — nunca atribuído a uma pessoa. Conta desativada continua no diretório. Foto removida →
  iniciais. Avatar da equipe é redondo; logo de participante (`LogoMarca`) é outra peça.
- Onde aparece: Atividade, sino (avatar + nome + quando + agrupamento), comentários, histórico da postagem, responsável,
  confirmação de publicação, histórico editorial do combo, lista da Equipe.
- Avisos: `notificacoes` ganhou `ator_user_id` (default da sessão), `para_user_id`, `chave_grupo`, `atualizada_em`,
  `n_agrupadas`; `get_notificacoes_org` (tipo de retorno novo) e `ler_notificacoes_org`/`registrar_push_organizacao`
  aceitam qualquer porta de leitura (`membro_org`) — antes a Social media via o aviso e não conseguia marcá-lo como
  lido nem ligar o push.

#### Atualização do painel e convite do aparelho — 18/10/2026 (pedido do Wilker)
- **Identidade da versão = o build inteiro.** `vite.config.js › versaoDoPainel` (depois de gravar o build): sha256 do HTML
  final do painel + todos os arquivos que ele carrega (chunks, inclusive sob demanda, CSS, assets) + `sw.js` e manifesto
  → id de 16 hex. Sai em `<meta name="scw-versao">` (a versão da aba) e em `/painel/versao.json` (`app`, `id`,
  `publicado_em`, `ambiente` = `VERCEL_ENV`, `commit`, `novidades` = 1ª linha de `painel-app/NOVIDADES.txt`). Mesmo
  deploy, então o arquivo nunca aponta para recurso ausente. Compara IGUALDADE (rollback também é "outra versão").
  ⛔ Não voltar a comparar só o arquivo de entrada nem o conteúdo do `sw.js`.
- **Um monitor só** (`lib/versao.js › criarMonitor`, instância em `Conexao.jsx › monitorDoPainel`): ao abrir (3 s), ao
  voltar ao app, ao voltar a internet, a cada 15 min com a aba visível, quando um chunk não carrega (`vite:preloadError`)
  e no push de versão. Uma consulta por vez; no máximo uma por minuto entre as abas (`scw_versao_vista` no localStorage);
  o resultado vai às outras abas por `BroadcastChannel('scw-painel-versao')`. Resposta HTML, JSON alheio, 404 e
  ambiente diferente (produção × preview) são recusados.
- **Aviso:** "Atualização disponível / Uma nova versão do Painel SCW está pronta." com "Atualizar agora" e "Depois".
  "Depois" recolhe para um ponto no botão do perfil/conta (`PontoVersao`), até a aba fechar. Com folha ou diálogo aberto
  o aviso não flutua por cima (recolhe e volta quando fecha); dentro de Meu perfil/Sua conta a mesma caixa aparece
  embutida (`CaixaAtualizacao`), ao lado de "Verificar atualização" — diferente do botão "Atualizar" do topo, que só relê
  os dados.
- **"Atualizar agora"** (`atualizarAgora`): conexão → trabalho pendente → versão ainda no servidor → HTML novo com a MESMA
  id e os arquivos que ele abre respondendo → worker novo em espera ativado por mensagem (`ativar`) e esperado →
  recarga única. Ao abrir, `resultadoDaAtualizacao` confere se a id esperada entrou: "Painel atualizado." ou "não
  entrou" com uma 2ª tentativa por endereço novo (`?atualizar=`); depois disso, para (sem laço).
- **Trabalho pendente declarado** (`lib/pendencias.js`): `usePendencia(ativo, { rotulo, salvar?, guardaRascunho? })`,
  `registrarPendencia` (com `ativo()` perguntado na hora) e `comEnvio` (todo upload). Ligados: ficha da postagem
  (alterações e comentário digitado), edição editorial, editor de seção da ficha do participante, cadastro da marca,
  Meu perfil (nome e foto) e TODOS os envios de arquivo. Um `beforeunload` só, para o painel inteiro. Com pendência, o
  aviso lista o que falta e oferece "Voltar para salvar", "Salvar e atualizar" (quando todos sabem salvar) e
  "Atualizar sem salvar" (confirmação explícita). Envio em andamento nunca é interrompido.
- **Service worker:** sem `skipWaiting` na instalação (o novo ESPERA); ativa pela mensagem `ativar` (fluxo do botão, ou
  aba recém-aberta sem nada pela metade: ao abrir, o painel chama `update()` e o worker que terminar de instalar no
  1º minuto assume — a troca não apaga nada que outra aba use). Caches `scw-painel-casca-v3` e `scw-painel-assets` (este NÃO é apagado por versão:
  aba antiga ainda pede chunk dela; poda pelos 400 mais antigos). Limpeza só com prefixo `scw-painel-`; o `scw-painel-v2`
  antigo migra os `/assets/` e sai. `/painel/versao.json` e o `/painel/` não-navegação vêm sempre da rede. Os workers de
  `/organizacao/` e `/marca/` passaram a limpar só o próprio prefixo (antes apagavam tudo da origem).
  ⚠️ **Transição:** instalações com o painel até `6ea52e3` detectam a versão pelo código ANTIGO (arquivo de entrada) e
  recarregam/avisam como antes; ao abrir a versão nova, o worker novo instala e assume (sem nada pela metade) e o
  cache antigo migra. A partir dela, vale o fluxo novo.
- **Cabeçalhos** (`vercel.json`): `versao.json` e `sw.js` `no-store`; `/painel/` `no-cache`; `/assets/*` imutável.
- **Push de versão — servidor, não navegador.** Migration `20261020_painel_versao.sql`: pg_cron `scw-painel-versao`
  (10 min) → `painel_versao_ciclo()` lê por pg_net o `versao.json` DO DOMÍNIO DE PRODUÇÃO; id novo com
  `ambiente = production` vira linha em `painel_versoes` e chama a `enviar-push` com `{ versao_id }` (modo 3). Texto fixo
  "Painel SCW atualizado / Há melhorias disponíveis. Toque para abrir e atualizar.", tag `scw-versao`, url
  `/painel/?verificar=1`. Uma vez por aparelho e versão (`push_versao_envios`), 404/410 desativa, falha tenta de novo
  (até 3, no 1º dia). Preferência por aparelho: `push_subscriptions.avisar_versao` (`push_aparelho`). Toque com aba
  aberta: o worker manda `verificar-versao` (nunca recarrega); sem aba, abre `?verificar=1`. "ok" no registro = o serviço
  de push ACEITOU, não prova que apareceu na tela.
- **Convite do aparelho** (`AppNoAparelho.jsx › ConviteAparelho`, substituiu o cartão da Mesa/Início): depois do login,
  conta carregada, sem tour, sem folha/diálogo, sem pendência e sem aviso de atualização na frente. Fora do modo app:
  "Tenha o Painel SCW no seu celular" (Instalar painel só com `beforeinstallprompt`; senão "Ver como instalar", com os
  passos do Safari no iPhone e "abrir no Safari" no Chrome do iPhone). Aberto pelo ícone (ou computador sem oferta): "Ative
  as notificações do painel"; sucesso só depois de o servidor confirmar a inscrição desta conta (`push_aparelho`);
  bloqueado = como liberar, sem pedir de novo. "Agora não"/fechar adia 7 dias POR CONTA e aparelho
  (`scw_convite_aparelho_<papel>_<conta>`, só a data). Uma vez por sessão. Meu perfil / Sua conta › "Aplicativo e
  notificações" reabre, mostra o estado deste aparelho e a preferência de aviso de versão.
- Testes: `tests/painel-app-versao.test.mjs` (transição com dependências falsas); navegador com builds reais A→B no
  harness local (fora do repositório).

- **Ingredientes não são mais pedidos** (19/10/2026, pedido do Wilker): a organização só precisa de nome, descrição e dos
  alergênicos/características de cada item. Saíram o campo do formulário `/preencher/` (fica um `<input hidden>` que só deixa o
  valor antigo atravessar, sem apagar nem gerar diferença), o campo do Cadastro da marca e o da ficha da organização; o total de
  campos obrigatórios passou de 16 para 13 (`guia.js › camposObrigatorios`, `cadastro.js › itemCompleto`) e o banco acompanha
  (migration `20261021_ingredientes_opcional.sql`: `campos_cadastro` e `marca_concluir_cadastro`). A coluna
  `participantes_itens.ingredientes` continua: dado antigo é preservado e ainda aparece na ficha e na página pública.
  ⛔ Não voltar a exigir ingredientes sem mudar as duas pontas (app e banco) juntas.

- **Painel SCW na mensagem e na página de preenchimento** (19/10/2026, pedido do Wilker): a mensagem de WhatsApp fecha com
  a apresentação do painel (centro de comunicação com a organização: arquivos, fotos do combo, formulários, atualizar e
  conferir dados), o link `/painel/`, o usuário (`participantes.slug`) e a senha. A página `/preencher/` ganhou o mesmo
  aviso no fim (`#pr-painel`), **sem usuário nem senha**: a página abre só com o código do link. A senha temporária NÃO é
  guardada (aparece uma vez, na tela que a cria), então `painelDaMarca` só a escreve se a credencial acabou de ser criada
  na tela; quem já recebeu a sua leva "a que enviamos na mensagem do seu acesso"; quem já trocou, "a que você criou".
  Em Participantes › Preenchimento, "Criar N acessos e copiar" (`marca.liberar`) chama `criar-acesso-marca` pelo
  `emitirCredenciais` e copia as mensagens já com a senha; a credencial fica só em memória da tela.
  ⛔ Não regerar senha de quem já tem acesso só para pôr na mensagem (invalida a que foi enviada e derruba sessões).

