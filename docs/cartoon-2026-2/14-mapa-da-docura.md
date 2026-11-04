# 14 · Mapa da Doçura — carimbo no balcão, sorteio e pódio

**Estado (03/11/2026):** desenho aprovado pelo Wilker, nada construído. Abre **junto com o site, em 05/11**.
Marcas como no [README](README.md): **[Fato]** · **[Proposta]** · **[Decisão]**.
Nome de trabalho: "Mapa da Doçura" (o nome da página do mapa segue em aberto, §10 do doc 10).

## 14.1 O pedido

Nesta edição o mapa de carimbos não foi impresso. Ele vira uma ação do site: o Sweet Lover junta carimbos das
casas que visita, cada carimbo é uma chance num sorteio de itens do evento, e quem mais carimbar vai ao pódio.

Decisões do Wilker (03/11/2026):

- **[Decisão]** Foto do combo não prova a visita (pode ser burlada). Quem carimba é **o lojista**, lendo um QR
  que aparece na tela do visitante.
- **[Decisão]** **Sem conta.** Os dados do visitante ficam salvos sem cadastro com senha.
- **[Decisão]** A tela inicial do participante (painel da marca) ganha **dois botões fixos: Carimbar (ler o QR)
  e Validar voucher (digitar o código)**.
- **[Decisão]** A avaliação do combo **fecha** o carimbo.
- **[Decisão]** Prêmio = **sorteio** de press kit, vouchers e itens do evento (nada em dinheiro). Precisa de um
  **regulamento**; o Wilker dispensou consulta jurídica. Registro feito uma vez: sorteio ligado a compra costuma
  exigir autorização do Ministério da Fazenda mesmo sem prêmio em dinheiro [Provável]. Decisão dele.
- **[Decisão]** **A casa pode se repetir**: o visitante acumula carimbos.
- **[Decisão]** Pódio dos que mais carimbaram, divulgado; plaquinha **Sweet Lover** para entregar (produção em
  andamento).
- **[Decisão]** Os lojistas são orientados a não carimbar conhecido sem venda.

## 14.2 Regras do jogo

| Regra | Valor |
|---|---|
| Quem dá o carimbo | o lojista, no painel da marca, lendo o QR (ou digitando o código de 6 dígitos) |
| Limite | **Várias casas no mesmo dia, à vontade.** Na **mesma casa**, 1 carimbo por dia (dia no fuso de Natal). Garantido pelo banco |
| Primeira visita a uma casa | o carimbo só **vale** depois de existir a avaliação daquela casa com o e-mail do mapa. Aí a casa ganha cor |
| Visitas seguintes | valem na hora, sem nova avaliação (a avaliação é uma por e-mail por casa) |
| Sorteio | cada carimbo válido = **1 número da sorte** (sequência única da edição) |
| Pódio | 3 primeiros em carimbos válidos. Empate: mais casas diferentes; depois, quem chegou primeiro ao total |
| Ranking público | só apelido, só de quem marcou "quero aparecer no ranking" |
| Janela | a mesma da avaliação: carimbo só com a avaliação aberta no banco (sem interruptor novo) |

**[Proposta]** Por que 1 por dia: sem limite, um balcão carimba o mesmo conhecido 50 vezes numa tarde. Com ele o
teto é 27 casas × 11 dias, e o abuso fica visível na aba da organização.

## 14.3 Visitante — sem conta

- **[Proposta]** Na primeira vez que toca em "Pedir carimbo", um formulário curto: **apelido** (2–24),
  **e-mail**, **WhatsApp** (opcional, para avisar se ganhar), **aceito o regulamento** (obrigatório) e **quero
  aparecer no ranking**. Sem senha.
- O banco cria o mapa e devolve uma **chave secreta** (24 bytes aleatórios) **uma única vez**. O site guarda a
  chave no aparelho (`localStorage`). O banco guarda só o **hash** dela.
- **Guardar meu mapa:** botão que abre o WhatsApp com o link pessoal `/cartoon/minha-rota#mapa=<chave>` para a
  pessoa mandar para si mesma, e botão de copiar. A chave vai **depois do `#`**: não chega à Vercel, ao
  Analytics nem aos logs. Abrir o link em qualquer navegador grava a chave e mostra o mapa.
- **Navegador sem chave** (ex.: abriu pelo Instagram, agora está no Chrome): antes de criar, a tela pergunta
  "Primeira vez? Começar meu mapa" · "Já tenho mapa: abrir pelo meu link". Ninguém cria um segundo mapa calado.
- **Perdeu tudo:** a organização acha o mapa pelo e-mail no painel e gera um link novo (a chave velha morre).
- Dois mapas não dão vantagem: cada número nasce de um carimbo real; dividir carimbos só derruba no ranking.

**Pedir carimbo** (na casa: ficha, cartão do mapa e catálogo — o chip "Já fui" sai e dá lugar a "Pedir carimbo"):
o site pede um código ao banco e mostra o **QR** (pacote `qrcode`, já instalado) com o **código de 6 dígitos**
embaixo. O código vale **2 minutos e uma vez só**; ao vencer, a tela pede outro sozinha. Enquanto o QR está na
tela, o site consulta o estado a cada 2 s e mostra "Carimbado!" (com "visita nº N") quando o lojista confirmar.
Primeira visita: em seguida abre a avaliação daquela casa com apelido e e-mail já preenchidos.

**Minha rota** passa a ser também "meu mapa" (sem rota nova no menu): no topo, o **álbum das 27 casas** — logo
desenhada em rascunho (P&B) que ganha cor na primeira visita válida (casa sem desenho: a logo oficial, em
cinza até a primeira visita), contador "×N" nas repetidas, carimbo
pendente de avaliação em destaque —, os números da sorte, a posição no ranking, "Guardar meu mapa" e "Apagar meu
mapa". O progresso deixa de vir do "Já fui" (salvo no aparelho, autodeclarado) e passa a vir dos carimbos.
"Quero ir" e as paradas continuam como estão.

## 14.4 Lojista — painel da marca

- **[Decisão]** Tela **Início** (`painel-app/src/components/vistas-marca/Hoje.jsx`): dois botões fixos no topo
  durante a edição.
  - **Carimbar:** abre a câmera e lê o QR; ao lado, campo para digitar os 6 dígitos (câmera que falha, tela
    escura). Leu → confirma direto (um toque a menos no balcão cheio) e mostra "Carimbado: <apelido> · visita
    nº N" ou o motivo da recusa: código vencido, já usado, de outra casa, já carimbou hoje nesta casa.
  - **Validar voucher:** atalho para o registro de voucher que já existe (`VouchersMarca.jsx`, `marca_usar_voucher`).
- **[Proposta]** Leitura do QR: `BarcodeDetector` do navegador quando existe (Android); no iPhone, uma
  biblioteca pequena de leitura de QR carregada só ao abrir Carimbar — **única dependência nova**.
- **[Fato]** Uma conta por marca (login = nome do estabelecimento, Supabase Auth). A mesma conta pode estar
  aberta no celular de cada unidade. O voucher já presume o painel no balcão.
- **[Proposta]** Carimbo é da **casa**, não da unidade (a conta da marca não sabe em qual unidade está).

## 14.5 Organização — painel

Aba **Edição › Carimbos** (permissão `dado.ler`; números da sorte e contatos só com `relatorio.ler`):

- totais (mapas, carimbos, válidos, pendentes de avaliação) e carimbos por casa por dia;
- ranking completo (apelido, e-mail, WhatsApp, válidos, casas diferentes, hora do último);
- **alertas**: mesmo mapa com carimbos em casas diferentes a menos de 10 min (rodar várias casas no mesmo dia
  é o esperado e não gera alerta — Wilker, 03/11);
- **lista dos números da sorte válidos** para o sorteio (exporta CSV);
- **link novo** para um mapa (perdeu o aparelho).

## 14.6 Banco

Migration nova, **só aplicada com ok explícito do Wilker**. Padrão do projeto: RLS ligada, tabelas fechadas,
acesso só por funções `security definer`. `pgcrypto` está no schema `extensions` [Fato, 03/11].

| Tabela | Colunas principais | Regras |
|---|---|---|
| `mapas_lover` | `id`, `edicao_codigo`, `chave_hash` (sha256), `apelido`, `email_norm`, `whatsapp`, `no_ranking`, `aceite_em`, `criado_em` | `chave_hash` única |
| `carimbo_pedidos` | `id`, `mapa_id`, `participacao_id`, `codigo` (6 dígitos), `expira_em` (+2 min), `usado_em` | `codigo` único entre os não usados; um pedido aberto por mapa |
| `carimbos` | `id`, `numero` (sequência = número da sorte), `mapa_id`, `participacao_id`, `dia` (Natal), `confirmado_em`, `confirmado_por` (auth.uid), `pedido_id` | **única `(mapa_id, participacao_id, dia)`** |

"Válido" não é coluna: é calculado — carimbo repetido, **ou** primeiro da casa com avaliação
(`avaliacoes.participacao_id` + `email_norm` do mapa). Sem gatilho, sem número reemitido: o número existe desde a
confirmação e só entra no sorteio quando válido.

| Função | Quem chama | Faz |
|---|---|---|
| `mapa_criar(apelido, email, whatsapp, ranking, aceite)` | anônimo | valida campos, cria o mapa, devolve a chave uma vez |
| `mapa_ler(chave)` | anônimo | perfil, carimbos por casa (n, válido, pendente), números, posição |
| `mapa_pedir_carimbo(chave, slug)` | anônimo | confere janela aberta e casa publicada, apaga pedidos vencidos e o aberto do mapa, gera código único, devolve `{codigo, expira_em}` |
| `mapa_estado_pedido(chave, codigo)` | anônimo | `aberto` · `carimbado` (visita nº, primeira) · `vencido` |
| `mapa_apagar(chave)` | anônimo | apaga mapa, pedidos e carimbos (LGPD) |
| `ranking_mapa()` | anônimo | top 10 apelidos que optaram, com válidos e casas |
| `marca_carimbar(codigo)` | marca logada | mesmo padrão de `marca_usar_voucher` (`participantes.user_id = auth.uid()` e `conta_ativa()`): confere dono da casa, validade, uso e limite do dia; grava o carimbo; devolve apelido, visita nº, primeira |
| `get_mapa_carimbos(p_secret, …)` | organização | o que a aba do §14.5 mostra |
| `mapa_nova_chave(p_secret, mapa_id)` | organização | troca o hash e devolve a chave nova uma vez |

**[Proposta]** Sem Turnstile em `mapa_criar` (`ponytail:` criar mapa não dá vantagem a robô — carimbo exige
balcão; ligar pelo `enviar-formulario` se aparecer lixo). Evita deploy de Edge Function antes do dia 5.

## 14.7 Regulamento

Página `/cartoon/regulamento` (rota nova no roteador; o rewrite `/cartoon/:path*` já cobre). O texto sai com o
que está decidido e marca **[A DEFINIR]** o que falta — nada inventado (A4):

- realizadora (F2 Experience), período (05 a 15/11/2026), quem participa;
- como acumula (§14.2), limite diário, validade da primeira visita;
- **[A DEFINIR]** lista e quantidade de prêmios; data, local e método do sorteio (ao vivo ou pela Loteria
  Federal); prazo e forma de retirada; idade mínima;
- pódio e plaquinha Sweet Lover; desempate;
- desclassificação por fraude (carimbo sem visita), conferência dos sorteados e do pódio;
- dados pessoais: o que guarda, para quê, até quando (**[Proposta]** apagar os mapas 60 dias depois do
  sorteio), como apagar; uso de apelido no ranking e de nome dos ganhadores;
- contato oficial: o canal que já está no site.

A política de privacidade (`/privacidade`) ganha a seção do mapa no mesmo commit.

## 14.8 Fora desta entrega

Mapa ilustrado de Natal com os temas (fase 2, mesmo dado) · cartão para stories · recuperação por e-mail ·
Turnstile na criação · carimbo por unidade · alerta por distância real · moderação por IA.

## 14.9 Testes

- `tests/mapa-docura.test.mjs` (sem navegador): estado do álbum a partir das linhas do banco (cor, ×N,
  pendente), regra de válido, mensagens de recusa, a chave **só** depois do `#` e nunca em query string, rota do
  regulamento e textos sem "Sweet" sozinho.
- `test:cartoon-navegador`: pedir carimbo com o banco interceptado (QR, código, "Carimbado!"), link
  "Guardar meu mapa" restaurando em outro contexto, 360 e 1440 px.
- Banco: depois de aplicada, uma transação de teste **desfeita (rollback)** cobrindo criar → pedir →
  `marca_carimbar` (com o `auth.uid` de uma marca simulado) → recusa no mesmo dia → válido após avaliação. Só com
  ok do Wilker na hora.
- Painel: `Carimbar` com o código digitado e a câmera negada.

## 14.10 Calendário e o que depende do Wilker

| Quando | O quê | Quem |
|---|---|---|
| 04/11 | código, testes, regulamento com lacunas marcadas, aviso pronto para os participantes | Claude |
| 04/11 | **ok para aplicar a migration**; preencher os [A DEFINIR] do regulamento; enviar o aviso no painel e no WhatsApp das marcas | Wilker |
| 04/11 | teste no celular de verdade: um iPhone e um Android, nos dois papéis | Wilker + Claude |
| 05/11 | publica junto com o site (as flags da publicação já previstas; nada novo a ligar) | Wilker |

## 14.11 Mapa impresso — fundido com o digital (planejado; não desenvolver agora)

**[Decisão]** Pedido do Wilker (03/11/2026): o Mapa da Doçura digital e o mapa impresso são **o mesmo mapa**. O
impresso serve de **sinalização** e para quem quer o mapa na mão; o carimbo continua só no digital.

- **Arte:** Natal desenhada como **mapa de mundo de videogame** ("mundo do Switch", nas palavras do Wilker),
  no traço da Cartoon. Como é feita: §14.12.
- **Cada casa:** **número + nome + logo desenhada** quando couber (a colorida tem 480 px: ~4 cm a 300 dpi, o
  bastante para logo pequena). Sem espaço: **pin com número + nome**, e o tema da casa na legenda lateral
  (número · nome · tema · bairro).
- **Marcas na peça:** selo da edição; **Senac como apoio** (espaço reduzido); **Sicredi como patrocínio**
  (decisão do Wilker, 03/11). Arquivos recebidos copiados para
  `06_MATERIAIS_PDV/03_MAPA_IMPRESSO/00_REFERENCIAS/` no Dropbox da edição (Sicredi em PDF com área de proteção;
  Senac de 22/10).
- **Fusão com o digital:**
  - a **mesma numeração** das casas no impresso, nos pins do mapa do site e no álbum do Mapa da Doçura;
  - **QR no impresso** abrindo o Mapa da Doçura por um código novo no contador `/q/` (ex.: `mapa-impresso`),
    que já entra na aba Operação › QR Codes;
  - texto curto no impresso: como pedir o carimbo e onde está o regulamento;
  - a mesma arte vira a fase 2 do mapa digital (§14.8), com as casas ganhando cor sobre o desenho.
- **Pontos de atenção:**
  - **localização:** a posição no desenho vem do **bairro** (§14.12), não da coordenada — só 15 das 41 unidades
    têm coordenada conferida (03/11). Conferir o bairro de cada unidade antes de imprimir;
  - 7 casas têm várias unidades: **um número por casa**, pin repetido em cada unidade;
  - não há modelo do Wilker para mapa nas pastas da edição (03/11): conferir antes de diagramar se ele tem um.
- **[A DEFINIR]** formato (A3 dobrado? A2 de parede?), tiragem, onde distribuir e onde fixar, data de
  impressão, e se o Sicredi também aparece no site da edição.

## 14.12 Como o mapa é desenhado — mundo de jogo esquemático

**[Decisão]** Wilker, 03/11/2026: entre (A) Google só recolorido, (B) desenho fiel encaixado no Google e (C) mundo
de jogo esquemático, **C**. O mapa mantém a geografia real (litoral, Potengi, ordem dos bairros) e encurta o
espaço vazio, como mapa de metrô. Não é preciso no GPS: "Como chegar" continua abrindo o Google, e a página do
mapa do Google continua no site para quem navega.

**Regras de partida**

- **[Fato]** Os termos do Google Maps proíbem criar mapa a partir do dele. A base geográfica vem do
  **OpenStreetMap** (o mapa reserva do site já usa), que permite derivado com o crédito "© colaboradores do
  OpenStreetMap" no rodapé da peça e da página.
- **[Decisão]** Estilo de mundo de jogo (caminhos, regiões, casas como "fases"), **sem nada da Nintendo**:
  nenhum personagem, cano, cogumelo, estrela ou elemento reconhecível de jogo existente. Traço da Cartoon
  (nanquim, cor chapada, sombra), não 3D de brinquedo — a identidade é a da edição.
- **[Fato]** Natal não é Rio: Morro do Careca é duna, nunca Pão de Açúcar (memória "Natal nunca Rio").

**Onde as casas estão** — **[Fato]** banco, 03/11: 41 unidades em 15 bairros. Capim Macio sozinho tem 10
(grafado de dois jeitos no banco, "Capim Macio" e "Capim macio": normalizar); Lagoa Nova e Tirol, 5 cada; Ponta
Negra, 4; Candelária e Nova Parnamirim, 3; Lagoa Seca, Pitimbu e Potengi, 2; Barro Vermelho, Centro
(Parnamirim), Cidade da Esperança, Neópolis e Petrópolis, 1. Na escala real a Zona Sul vira um amontoado: por isso
o esquemático.

**[Proposta]** Regiões como "mundos" do mapa, cada uma com um marco desenhado:

| Região | Bairros das casas | Marco |
|---|---|---|
| Zona Norte | Potengi | Ponte Newton Navarro |
| Zona Leste | Tirol, Petrópolis, Lagoa Seca, Barro Vermelho | Forte dos Reis Magos |
| Zona Oeste | Cidade da Esperança | (a definir) |
| Zona Sul | Capim Macio, Lagoa Nova, Candelária, Neópolis, Pitimbu | Arena das Dunas · Parque das Dunas |
| Ponta Negra | Ponta Negra | Morro do Careca (duna) |
| Parnamirim | Nova Parnamirim, Centro | Cajueiro de Pirangi |

**[Proposta]** Numeração = a ordem do caminho pontilhado (Norte → Leste → Oeste → Sul → Ponta Negra →
Parnamirim). A legenda do impresso sai agrupada por região. Casa com unidades em regiões diferentes: o número vem
da primeira unidade no caminho e se repete nas outras.

**Como fazer**

1. **Rascunho de posições (script):** contorno de Natal e Parnamirim, Potengi e mar a partir do OpenStreetMap;
   uma bolinha numerada por unidade dentro do seu bairro; regiões e caminho. O Wilker confere e ajusta **antes
   de qualquer arte**.
2. **Arte numa imagem só** (como o Wilker prefere), com o rascunho e a faixa `elementos/cena/natal` como
   referência: terreno, mar, caminhos, marcos e uma **plataforma vazia em cada bolinha**. Nada de texto nem de
   logo na arte.
3. **As casas entram por código:** número, logo desenhada de verdade e nome sobre cada plataforma. Logo nunca
   sai da IA, e 27 nomes escritos por IA sairiam errados.
4. **Site:** vista de jogo do Mapa da Doçura — fase visitada ganha cor e bandeira, o caminho até ela se pinta;
   tocar na casa abre o cartão com "Como chegar". Imagem com zoom e arraste; as casas são botões de verdade
   (acessíveis), não pontos dentro da imagem.
5. **Impresso:** a mesma arte com legenda, QR, selo, Senac (apoio) e Sicredi (patrocínio). A imagem da IA sai
   com ~2.000 px e o A3 pede ~5.000 px: ampliar (Magnific) ou gerar em partes; texto e logos entram em vetor ou
   alta resolução, nítidos.

**Ordem:** o carimbo (§14.1–14.10) abre no dia 5 com o álbum de logos; o mapa desenhado entra quando a arte for
aprovada e substitui o álbum como vista principal (o álbum fica como lista). O impresso depende da data de
impressão, ainda a definir.
