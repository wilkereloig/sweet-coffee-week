# 1 · Inventário do sistema atual e da experiência Lovers

Branch `dev/site-completo`, HEAD `066510d` (igual a `master`, publicado em 14/10/2026). Há alterações locais não commitadas de outras sessões (renomeação de caminhos de backup em docs e scripts); este plano não as toca.

## 1.1 Site institucional

| Peça | Estado atual | Evidência | Impacto na Cartoon |
|---|---|---|---|
| Roteador | Próprio, sem biblioteca. Lê o hash primeiro e cai para `pathname` se não houver hash; `navigate()` sempre escreve hash | `src/router.js:5-39` | Um QR com caminho limpo (`/cartoon/...`) já é resolvido; a navegação interna troca o endereço para `#/...` |
| Tabela de rotas | Função pura `resolverRota()`, casamento por prefixo; rota desconhecida cai em `home` (não existe 404) | `src/lib/rotas.js:25-50`, `App.jsx:156` | A Cartoon precisa de 404 próprio e de estado "retirado" |
| Carregamento | Um chunk por página, `React.lazy` + `precarregar()` no hover/foco | `src/pages/carregadores.js:14-30` | Reaproveitar o padrão para cada página da edição |
| Flags de publicação | 4 constantes em `App.jsx`, todas `false`; teste reprova se alguma ligar | `App.jsx:54-94`, `tests/redesign-2026.test.mjs:278-286` | Os interruptores novos da edição seguem o mesmo padrão, mas **não** um interruptor único |
| `INSTITUTIONAL_PREVIEW` | `true` em DEV e em `*.vercel.app?preview=1`; aditivo | `App.jsx:103-113` | A Cartoon fica visível só em preview até a publicação autorizada |
| Documentos legais | Resolvidos antes de qualquer gate | `rotas.js:13-26`, `tests/consentimento.test.mjs:139-164` | Mantém-se em todas as fases |
| Redirecionamento Lovers | `/lovers*` (exceto `/lovers/painel`), `/mapa`, `/rota`, `/participantes` → `navigate('/')` no cliente | `App.jsx:120-138` | **Não pode** apontar para a Cartoon. `/mapa` e `/participantes` deixam de ser genéricos |
| Rewrites | Lista explícita, sem curinga; `/sweet-awards` e `/em-breve` não têm rewrite (só funcionam por hash) | `vercel.json` | `/cartoon/:path*` precisa de rewrite |
| Cabeçalhos | `Permissions-Policy: camera=(), geolocation=()`; CSP em modo report-only | `vercel.json:15-16` | "Perto de mim" e o mapa exigem mudar a política e o CSP |
| Metadados | `index.html` estático (um único og:image); em tempo de execução só `title` e `description` | `index.html:9-70`, `src/lib/pageMeta.js:14-56` | Compartilhar `/cartoon/...` mostra hoje o og do institucional; não há canônico |
| Analytics | GA4 com `page_view` manual; caminho fora da lista vira `/` | `src/lib/analytics.js:34-50`, `router.js:15-21` | Rotas da edição precisam entrar na lista; slug de participante deve ser registrado sem dado pessoal |
| Consentimento | Medição ligada por padrão, recusa e Global Privacy Control desligam | `src/lib/consentimento.js`, `analytics.js:4-15` | Mesma regra na Cartoon; nada novo de rastreio sem decisão |
| Casca | Cabeçalho, rodapé e barra de abas por `FOOTER_ROUTES`; cores por rota em `PAGE_COLORS`/`MENU_ESCURO` e `body.route-*` | `App.jsx:118-206`, `src/components/nav.jsx:16-52` | A Cartoon tem casca própria (seção 5); legais e consentimento são compartilhados |
| CSS | CSS de cada página vai no chunk dela; tokens institucionais em `scw-2026.css` | `src/main.jsx:3-8`, `pages/*/index.jsx` | Folha `scw-cartoon.css` só no chunk da edição, prefixo próprio |
| Testes visuais | Paleta conferida só numa lista fixa de arquivos; F2 e WhatsApp isolados com teste de vazamento | `tests/redesign-2026.test.mjs:20-124`, `tests/regua-visual.mjs:32-40` | Paleta Cartoon precisa de lista e teste de vazamento próprios |
| Anúncio da edição na Home | `destaqueEdicao.js` + `proximaEdicao.js` (tema Cartoon, 5 a 15 de novembro, `valorCombo: null`) | `src/data/destaqueEdicao.js:32-77`, `src/data/proximaEdicao.js:7-17` | Passa a apontar para `/cartoon` quando a rota for pública |
| Regra "Cartoon não é histórico" | Teste reprova 2026.2 no histórico de Edições | `tests/edicoes.test.mjs:23` | Muda só no encerramento |

## 1.2 Painel

**[Fato]** O painel é a aplicação `painel-app/` servida em `/painel/`, sem supabase-js: `fetch` direto a PostgREST, RPC e Edge Functions (`painel-app/src/lib/rpc.js:58-126`, `marcaApi.js:150-180`).

### Painel da marca

| Bloco | Campos hoje | Tabela | Evidência |
|---|---|---|---|
| 0 · Estabelecimento | nome (só leitura, é o login), logo, responsável, telefone (WhatsApp do responsável), e-mail, Instagram, site, CNPJ, razão social | `participantes` (permanente, compartilhado entre edições) | `Cadastro.jsx:97-111, 608-636` |
| 1 · Tema | tema do combo e justificativa, com estado da proposta | `participacoes`, `temas_propostos` | `Cadastro.jsx:639-654` |
| 2 · Itens | por posição 1–3: nome, descrição, ingredientes, `vegano`, `sem_gluten`, `sem_lactose`, `tem_substituicao` + `substituicao` (até 500) | `participantes_itens` | `Cadastro.jsx:677-713` |
| 3 · Combo e custos | preço só leitura (da edição), para viagem, vegano, diet, custo de embalagem, custo de delivery, delivery e proposta em texto livre | `participacoes`, `edicoes.valor_combo` | `Cadastro.jsx:114-131, 722-754` |
| 4 · Unidades | endereço, bairro, horários (texto livre), faz delivery, canais `{tipo, link}` (aplicativo, whatsapp, site); `mesas` e `so_delivery` só a organização edita | `participacao_unidades` | `Cadastro.jsx:145-152, 757-792`, `FichaCadastro.jsx:223-231` |
| Fotos | agenda da sessão de fotos; foto oficial chega como arquivo publicado pela organização | `sessoes_fotos`, `arquivos` | `Fotos.jsx:38-42`, `Arquivos.jsx:93` |
| Pedidos e correções | pedidos da organização e correções por campo, mostrados junto do campo | `solicitacoes`, `correcoes_campo` | `Pedidos.jsx:34`, `guia.js:152-224` |

- **Salvamento [Fato]:** automático com 900 ms de espera, um por vez, só colunas alteradas; resposta vazia tratada como recusa; descarrega ao esconder a página ou sair (`Cadastro.jsx:155-160, 367-436`). O rascunho é a própria linha viva.
- **Envio [Fato]:** "Enviar para análise" chama `marca_concluir_cadastro`, que devolve `{ok, faltando[]}`; o gatilho `combo_em_analise` muda o combo para `em_analise` (conferido no banco).
- **Edição selecionada [Fato]:** a marca vê sempre a participação mais recente (`participacoes?order=created_at.desc&limit=1`, `Cadastro.jsx:252`).
- **Permissão de escrita [Fato, banco]:** concessão por coluna. A marca escreve em `participantes` (responsável, telefone, e-mail, Instagram, site, CNPJ, razão social, combo_nome, combo_descricao), `participacoes` (tema, flags do combo, custos, delivery, proposta), `participantes_itens` (nome, descrição, ingredientes, flags, substituição) e `participacao_unidades` (tudo, por política `FOR ALL`). Não escreve preço, estado do combo, foto do item nem nome da marca.

### Painel da organização

- **[Fato]** Sete módulos (Visão geral, Participantes, Contatos, Operação, Arquivos, Edição, Admin) e ficha da marca com nove abas (`Modulos.jsx:50-128`, `FichaMarcaPagina.jsx:249-257`).
- **[Fato]** Cinco funções (administrador, curadoria, producao, comercial, consulta) e 14 permissões; o banco decide por `pode(p_secret, acao)` em cada RPC; a interface só esconde (`PainelShell.jsx:65`, migrations `20260825_*`, `20261001_funcao_comercial.sql`).
- **[Fato]** Revisão: `revisar_combo` (exige nota ao pedir correção, reabre o cadastro e notifica), `decidir_tema`, `pedir_correcao_campo`/`resolver_correcao`, `definir_liberacao_foto`, edição administrativa por `org_salvar_*`. Histórico por `get_atividade` sobre `auditoria`.
- **[Fato]** O dicionário único de estados é `painel-app/src/lib/status.js:24-191`, conferido contra as restrições do banco pelo teste `painel-app-status`.

## 1.3 Banco (leitura em 14/10/2026)

**[Fato]** 50 tabelas no esquema `public`, todas com RLS ligado, nenhuma política para `anon`. O acesso público existente é: funções `submit_*` (formulários), `submit_vote` e `get_rankings` (Lovers), e o bucket público `logos`. Buckets: `arquivos` (privado), `combos` (privado), `logos` (público), `assets` (público).

Tabelas relevantes, com o papel que terão:

| Tabela | Linhas | Papel na Cartoon |
|---|---|---|
| `edicoes` | 17 | edição `2026.2`; ganha estado de publicação (seção 3) |
| `participantes` | 26 | marca (permanente); `slug` é o login, não serve como endereço público |
| `participacoes` | 26 | participação da marca na edição; já guarda estado de cadastro e de combo |
| `participacao_unidades` | 28 | participação da unidade; endereço e horário em texto livre, sem coordenadas |
| `participantes_itens` | 78 | componentes do combo; selos `NOT NULL default false` |
| `correcoes_campo`, `solicitacoes`, `auditoria` | 0 / 0 / 195 | revisão, pedidos e histórico |
| `logos_marca`, `acervo_logos` | 15 / 21 | logo oficial com versões |
| `sessoes_fotos` | 22 | agenda das fotos oficiais |
| `premiacoes` | 271 | pódios históricos; destino dos resultados da Cartoon |
| `votos`, `awards_config`, `vote_emails`, `feedback_geral` | 0 / 0 / 0 / 0 | estrutura Lovers, vazia; `votos` não tem coluna de edição |

**Observações [Fato]:**

- `participantes.slug` só aceita letras e números e muda quando a marca é renomeada (`criar-acesso-marca/index.ts:199-210`). 19 das 26 marcas de 2026.2 têm slug.
- O comentário de `20260822_contas_marcas.sql:26-32` proíbe expor preço, endereço e horário publicamente, citando a regra do institucional (§2.2). Essa regra vale para o institucional; a camada de edição precisa de regra própria escrita (D-13).
- `get_rankings_admin` compara `'encantamento'` com `'envolvimento'` e devolve média nula para essa categoria (`supabase/schema.sql:392-397`).
- As migrations de votação de junho existem só no banco, segundo `docs/regras/04-stack-e-estrutura.md:65-74`.

## 1.4 Experiência Lovers recuperada do Git

Referência: commit `510b0b7` (22/06/2026), "remove páginas públicas Lovers". Estado lido em `510b0b7^` com `git show`. **Nada foi restaurado.** "Código existe" não é "integração verificada": nenhum item abaixo foi executado.

| Item | Evidência (em `510b0b7^`) | Fonte de dados | Classe | Motivo |
|---|---|---|---|---|
| Hub Lovers | `src/pages/lovers/Hub.jsx` (319 linhas): contagem regressiva, herói que muda por data, faixa de fotos, carteirinha | estática | **Reconstruir** | Datas, preço (R$ 38,90) e texto fixos no código. Fica a ideia de herói por fase |
| Catálogo de participantes | `Combos.jsx` (451): busca por nome, bairro, Instagram; "Abertas agora"; ordenação; contadores | estática + `utils/openStatus.js` (104) | **Adaptar** | Lógica de filtro genérica. Defeitos: filtro de edição sem chips, `article role="link"` com link aninhado, um intervalo de 4 s por cartão |
| Detalhe do combo | `ComboDetail.jsx` (630): carrossel, cartões por item, cartão por unidade com estado de abertura, mapa, Instagram, WhatsApp, botão Avaliar só na janela, limite de erro, eventos GA4 | estática + janela de `sweetAwards.js` | **Adaptar** | Estrutura boa; texto e cores Lovers fixos. Vira a página do participante |
| Alternador de mapa | `Mapa.jsx` (23) | — | **Reconstruir** | Trivial |
| Mapa 2D Google | `maps/MapaGoogle.jsx` (2591, das quais ~1310 de `<style>` embutido) | estática + Google Maps JS | **Reconstruir** (aproveitar a lógica) | Tamanho e acoplamento visual. Registrava no console os 8 primeiros caracteres da chave |
| Mapa 3D Google | `maps/MapaGoogle3D.jsx` (395) | Google `maps3d` (beta) | **Aposentar** | API beta, custo por carregamento sem confirmação (`docs/PLANO_MAPA_3D.md:31,67`), pesado no celular |
| Mapa Leaflet | `maps/MapaLeaflet.jsx` (498) | tiles OSM | **Aposentar** como código; Leaflet volta como opção (seção 6) | Órfão; dependência removida em `0ee9b3f` |
| Minha rota | `MapaGoogle.jsx:402-480, 669-790` | `localStorage` `sweet-lovers-route` + `?rota=` | **Adaptar** | Função isolável: adicionar, compartilhar link, rota externa com até 9 paradas, imagem 9:16 |
| Votação (interface) | `Votar.jsx` (483): regras → dados → notas → final | RPC `submit_vote` | **Reconstruir** | Coletava e-mail, nome, telefone, Instagram, faixa etária, escolaridade e gênero, todos obrigatórios; caixa "Sigo @" obrigatória e nunca enviada; identidade guardada sem prazo no navegador; sem link de privacidade |
| Votação (servidor) | `supabase/schema.sql:27-305`, Edge Functions `check-email-domain`, `send-vote-email`, `resend-webhook` | `votos`, `awards_config`, `vote_emails`, `feedback_geral` | **Adaptar** | Bom desenho: janela validada no servidor, um voto por e-mail ou telefone por participante, último vale, ranking só com `results_published`, detector de suspeitos. Falta edição, limite de envio e captcha. Três fontes de data divergiam |
| Premiação | `Awards.jsx` (210) | RPC `get_rankings` | **Adaptar** o fluxo | Resultado só aparece com publicação no servidor. A página Sweet Awards atual (`src/pages/sweet-awards/`) já é a referência visual |
| Experiências (Viva) | `Viva.jsx` (136) | estática | **Reconstruir** | Conteúdo exclusivo Lovers; ações especiais não migram (CLAUDE.md §2.1) |
| Cabine de fotos e cartões | `PhotoBoothModal.jsx` (537), `ShareCardModal.jsx` (189) | `html-to-image` | **Aposentar** nesta fase | Fora do escopo pedido; exige câmera, bloqueada por `Permissions-Policy` |
| Navegação móvel | `LoversTabBar` em `App.jsx`, `nav.jsx` (393) | — | **Aposentar** o código; **Reutilizar** o padrão de 5 abas | O site atual tem `MobileTabBar` próprio |
| Slugs, aliases, QR | `scripts/generate-lovers-qrcodes.mjs` (83), `QR_SLUG_ALIASES = {}` | `participants.js` | **Adaptar** | QR apontava para `#/lovers/combos/<slug>`. Gerador hoje quebrado (pacote `qrcode` saiu em `34d8514`) |
| Painel de votos | `src/pages/lovers/Painel.jsx` (1030), removido em `335a425` | RPCs `get_*` admin | **Reconstruir** dentro do `painel-app` | — |
| Sistema visual Lovers | `lovers-system.css` (2400), `components/lovers/*` | — | **Aposentar** | Proibido restaurar (pedido e §2.1) |

**O que restou da Lovers no HEAD [Fato]:**

- `src/data/loversAwardsResults.js` (pódios oficiais 2026.1) → **Reutilizar** como histórico.
- `public/images/combos/<slug>/` (687 arquivos) e `BRAND_LIST` em `src/data/participantAssets.js:86`, alimentando Edições → **Reutilizar** como acervo. A lista é da Lovers: a Cartoon não lê dela.
- Links antigos: `#/lovers/combos/<slug>` e `#/lovers/awards` caem na Home. **Regra deste plano:** nenhum endereço Lovers passa a representar oferta Cartoon (seção 2.6).
