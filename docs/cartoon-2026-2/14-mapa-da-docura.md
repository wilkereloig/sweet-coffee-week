# 14 · Mapa da Doçura — QR no balcão, sorteio e pódio

**Estado (04/11/2026):** desenho **revisto e aprovado pelo Wilker** (QR fixo na unidade + avaliação). Código no ar em
`dev/site-completo` e migration `20261130_mapa_docura_carimbo.sql` **aplicada em 03/11** (41 QR, teste `TESTE_OK`). Mapa, Minha
rota e álbum **unificados numa página** com o Mundo desenhado em prévia (§14.13), esperando a arte final. Abre **junto com o site, em 05/11**. O primeiro desenho (o lojista lendo o QR do visitante) caiu no
mesmo dia — ver §14.1.
Marcas como no [README](README.md): **[Fato]** · **[Proposta]** · **[Decisão]**.
Nome de trabalho: "Mapa da Doçura" (o nome da página do mapa segue em aberto, §10 do doc 10).

## 14.1 O pedido

Nesta edição o mapa de carimbos não foi impresso. Ele vira uma ação do site: o Sweet Lover junta carimbos das
casas que visita, cada ponto é uma chance num sorteio de itens do evento, e quem mais pontuar vai ao pódio.

Decisões do Wilker (03/11/2026):

- **[Decisão]** O atendente **não opera nada** — "nem todo atendente vai saber executar um celular". Cai o
  primeiro desenho: lojista lendo o QR do visitante, botão Carimbar no painel da marca, código de 2 minutos.
- **[Decisão]** **QR fixo em cada unidade**, colado no balcão. O visitante lê com a câmera do próprio celular:
  é a **etapa 1, a presença**.
- **[Decisão]** A **avaliação do combo** é a **etapa 2**. Primeira vez na casa com avaliação vale mais pontos;
  voltar na mesma casa vale menos, porque a avaliação não se repete (os dados são conferidos).
- **[Decisão]** **1 leitura por casa a cada 12 h** por pessoa ("a pessoa não pode ler o QR Code novamente num
  período de 12 horas").
- **[Decisão]** **Localização do celular** na hora da leitura: o carimbo só vale perto da unidade. É o que torna
  inútil a foto do QR mandada num grupo.
- **[Decisão]** **Auditoria do pódio** antes de divulgar (viagem impossível, §14.5).
- **[Decisão]** **Sem conta.** Os dados do visitante ficam salvos sem cadastro com senha.
- **[Decisão]** Prêmio = **sorteio** de press kit, vouchers e itens do evento (nada em dinheiro). Precisa de um
  **regulamento**; o Wilker dispensou consulta jurídica. Registro feito uma vez: sorteio ligado a compra costuma
  exigir autorização do Ministério da Fazenda mesmo sem prêmio em dinheiro [Provável]. Decisão dele.
- **[Decisão]** **A casa pode se repetir**: o visitante acumula carimbos.
- **[Decisão]** Pódio dos que mais pontuaram, divulgado; plaquinha **Sweet Lover** para entregar (produção em
  andamento).
- **[Fato]** O QR fixo prova **presença**, não compra. Plano B guardado, se aparecer fraude: **ficha de uso
  único** entregue com o combo (QR + código que morre no primeiro uso) — trocada pelo QR fixo por ser mais simples
  de imprimir e distribuir antes do dia 5.

## 14.2 Regras do jogo

| Regra | Valor |
|---|---|
| Como carimba | o visitante lê o **QR fixo da unidade** com a câmera do celular; o site pede a localização e o banco confere |
| Pontos | **leitura = 1 ponto**. **Avaliação da casa = +2**, uma vez por casa: vale quando o mapa tem carimbo daquela casa **e** existe a avaliação dela com o e-mail do mapa (a ordem não importa). [Proposta] nos números; mudar não mexe no resto |
| Limite | **Várias casas no mesmo dia, à vontade.** Na **mesma casa**, 1 leitura a cada **12 h** — contada pelo mapa **e** pelo e-mail do mapa (mapa novo com o mesmo e-mail não zera). Casa com várias unidades conta junto |
| Localização | celular a até **200 m** da unidade lida, mais a margem do GPS limitada a 300 m (raio máximo de 500 m). Sem permissão de localização, sem carimbo |
| Unidade sem ponto conferido | [Proposta] o carimbo entra marcado "sem conferência" e aparece nos alertas, para não travar o dia 5. Meta: as 41 conferidas em Participantes › Localizações antes da abertura |
| Sorteio | cada ponto = **1 número da sorte** |
| Pódio | 3 primeiros em pontos, fora os carimbos anulados na auditoria. Empate: mais casas diferentes; depois, quem chegou primeiro ao total |
| Ranking público | só apelido, só de quem marcou "quero aparecer no ranking" |
| Janela | a mesma da avaliação: carimbo só com a avaliação aberta no banco (sem interruptor novo) |

**[Proposta]** Os números da sorte são distribuídos **no fechamento**, depois da auditoria, em ordem de chegada
dos pontos, e a lista (apelido + faixa de números) é publicada antes do sorteio. Durante o festival a tela mostra
"N chances". Assim anular um carimbo suspeito não muda número já mostrado a ninguém.

**Por que cada camada** (03/11): as 12 h acabam com "ficar no balcão escaneando"; a localização acaba com a foto
do QR no grupo; o limite pelo e-mail acaba com a aba anônima; a auditoria pega quem driblar a localização.
Nenhuma pede nada ao atendente.

## 14.3 Visitante — sem conta

**Ler o QR** (câmera do próprio celular, sem app): o QR leva a `/cartoon/carimbo/<código da unidade>` — código
aleatório de 8 letras por unidade; a rota já é coberta pelo rewrite `/cartoon/:path*`. A página:

1. **Sem mapa no aparelho:** "Primeira vez? Começar meu mapa" · "Já tenho mapa: abrir pelo meu link" (ninguém
   cria um segundo mapa calado). Começar = formulário curto: **apelido** (2–24), **e-mail**, **WhatsApp**
   (opcional, para avisar se ganhar), **aceito o regulamento** (obrigatório) e **quero aparecer no ranking**.
   Sem senha.
2. **Localização:** uma linha explica ("para carimbar, o mapa confere que você está na casa") e o site pede a
   posição (`navigator.geolocation`, alta precisão, até 15 s).
3. **Resultado:** "Carimbado! +1 · <casa>". Primeira vez sem avaliação: botão **"Avaliar o combo e ganhar +2"**,
   que abre a avaliação daquela casa com apelido e e-mail preenchidos.
4. **Recusas, sempre com o que fazer:** "Você já carimbou aqui. Volte depois das 20h40" · "Você não parece estar
   na <casa>: chegue perto do balcão e tente de novo" · "Localização desligada: veja como ligar" (passo a passo
   iPhone e Android) · "O Mapa da Doçura abre em 05/11" / "encerrou".

**A chave:** o banco cria o mapa e devolve uma **chave secreta** (24 bytes aleatórios) **uma única vez**. O site
guarda a chave no aparelho (`localStorage`); o banco guarda só o **hash**.

- **Guardar meu mapa:** botão que abre o WhatsApp com o link pessoal `/cartoon/minha-rota#mapa=<chave>` para a
  pessoa mandar para si mesma, e botão de copiar. A chave vai **depois do `#`**: não chega à Vercel, ao
  Analytics nem aos logs. Abrir o link em qualquer navegador grava a chave e mostra o mapa.
- **Perdeu tudo:** a organização acha o mapa pelo e-mail no painel e gera um link novo (a chave velha morre).
- Dois mapas não dão vantagem: cada ponto nasce de uma leitura na casa; dividir pontos só derruba no ranking.

**Privacidade da localização:** a posição vai ao banco só para o cálculo e **não é gravada** — o carimbo guarda
a distância em metros e a precisão informada.

**Minha rota** passa a ser também "meu mapa" (sem rota nova no menu): no topo, o **álbum das 27 casas** — logo
desenhada em rascunho (P&B) que ganha cor no primeiro carimbo (casa sem desenho: a logo oficial, em cinza até
lá), contador "×N" nas repetidas, selo de avaliação feita e "avalie e ganhe +2" nas que faltam —, os pontos
("N chances"), a posição no ranking, "Guardar meu mapa" e "Apagar meu mapa". O progresso deixa de vir do "Já fui"
(autodeclarado) e passa a vir dos carimbos. Nas casas (ficha, cartão do mapa e catálogo) o chip "Já fui" dá lugar
ao estado do carimbo e à dica "leia o QR no balcão". "Quero ir" e as paradas continuam como estão.

## 14.4 Lojista — só o adesivo

- **[Decisão]** O atendente não carimba. O que cabe à casa: **manter o adesivo do QR visível no balcão** e, se
  perguntarem, dizer "leia o QR para carimbar".
- **[Proposta]** Um adesivo por unidade (41), cada um com o seu código. Adesivo arrancado, estragado ou copiado em
  massa: a organização gera código novo no painel e reimprime; o velho para de valer.
- **[Proposta]** Painel da marca, tela Início (`painel-app/src/components/vistas-marca/Hoje.jsx`): um cartão só de
  leitura "Carimbos de hoje: N". Nenhum botão novo. **Validar voucher** continua como já existe
  (`VouchersMarca.jsx`, `marca_usar_voucher`).
- **[Fato]** Sem leitor de QR no painel, sai também a dependência nova que o desenho anterior pedia (biblioteca de
  leitura de QR no iPhone).

## 14.5 Organização — painel

Aba **Edição › Carimbos** (permissão `dado.ler`; números da sorte e contatos só com `relatorio.ler`):

- totais (mapas, carimbos, pontos, avaliações que deram bônus) e carimbos por casa por dia;
- ranking completo (apelido, e-mail, WhatsApp, pontos, casas diferentes, hora do último);
- **alertas**, para a auditoria do pódio:
  - **viagem impossível**: dois carimbos do mesmo mapa cuja distância entre as unidades pediria mais de 60 km/h
    (rodar várias casas no mesmo dia é o esperado e não gera alerta — Wilker, 03/11);
  - carimbo em unidade **sem ponto conferido**;
- **anular carimbo** (com motivo): sai do pódio e do sorteio; o mapa continua;
- **QR das unidades**: o código de cada uma, **gerar código novo** (o velho morre) e **imprimir os adesivos**
  (página com os 41, impressão pelo navegador; o Wilker pode trocar a arte no Illustrator mantendo o QR);
- **lista dos números da sorte** no fechamento (exporta CSV);
- **link novo** para um mapa (perdeu o aparelho).

**[Fato]** As coordenadas são as de **Participantes › Localizações** — a fila de conferência que já existe
(`org_verificar_coordenada`, coluna `coordenada_verificada_em`). O Wilker confere lá as 25 que faltam.

## 14.6 Banco

Migration nova, **só aplicada com ok explícito do Wilker**. Padrão do projeto: RLS ligada, tabelas fechadas,
acesso só por funções `security definer`. `pgcrypto` está no schema `extensions` [Fato, 03/11].

| Tabela | Colunas principais | Regras |
|---|---|---|
| `mapas_lover` | `id`, `edicao_codigo`, `chave_hash` (sha256), `apelido`, `email_norm`, `whatsapp`, `no_ranking`, `aceite_em`, `criado_em` | `chave_hash` única |
| `carimbo_qr` | `codigo` (8 letras aleatórias), `unidade_id` (unidade do painel), `participacao_id`, `ativo`, `criado_em` | `codigo` único; um ativo por unidade; a migration cria um para cada unidade da edição |
| `carimbos` | `id`, `mapa_id`, `participacao_id`, `unidade_id`, `qr_codigo`, `distancia_m`, `precisao_m`, `conferido` (a unidade tinha ponto conferido), `criado_em`, `anulado_em`, `anulado_motivo` | as 12 h são conferidas na função, sob um bloqueio por mapa (`pg_advisory_xact_lock`), para duas leituras simultâneas não passarem juntas |

Pontos não são coluna: são calculados — 1 por carimbo não anulado + 2 por casa com carimbo e avaliação
(`avaliacoes.participacao_id` + `email_norm` do mapa). Sem gatilho.

| Função | Quem chama | Faz |
|---|---|---|
| `mapa_criar(apelido, email, whatsapp, ranking, aceite)` | anônimo | valida campos, cria o mapa, devolve a chave uma vez |
| `mapa_ler(chave)` | anônimo | perfil, carimbos por casa (n, último, avaliou), pontos, posição |
| `mapa_carimbar(chave, qr, lat, lng, precisao)` | anônimo | confere janela aberta, QR ativo e casa publicada; calcula a distância à unidade (haversine, sem gravar a posição); confere as 12 h pelo mapa e pelo e-mail; grava; devolve `{casa, primeira, avaliou, pontos}` ou o motivo da recusa (`cedo` com a hora liberada, `longe`, `fora_da_janela`, `qr_invalido`) |
| `mapa_apagar(chave)` | anônimo | apaga mapa e carimbos (LGPD) |
| `ranking_mapa()` | anônimo | top 10 apelidos que optaram, com pontos e casas |
| `marca_carimbos_hoje()` | marca logada | contagem do dia da casa (padrão de `marca_usar_voucher`: `participantes.user_id = auth.uid()` e `conta_ativa()`) |
| `get_mapa_carimbos(p_secret, …)` | organização | o que a aba do §14.5 mostra, com os alertas |
| `carimbo_anular(p_secret, carimbo_id, motivo)` | organização | marca anulado |
| `carimbo_qr_novo(p_secret, unidade_id)` | organização | desativa o código da unidade e cria outro |
| `mapa_nova_chave(p_secret, mapa_id)` | organização | troca o hash e devolve a chave nova uma vez |

**[Proposta]** Sem Turnstile em `mapa_criar` e `mapa_carimbar` (`ponytail:` robô não passa da localização nem das
12 h; ligar pelo `enviar-formulario` se aparecer lixo). Evita deploy de Edge Function antes do dia 5.
**[Fato]** A localização vem do celular e pode ser falsificada por quem souber; a auditoria do pódio é a rede para
isso. Prêmio pequeno, risco aceito.

## 14.7 Regulamento

Página `/cartoon/regulamento` (rota nova no roteador; o rewrite `/cartoon/:path*` já cobre). O texto sai com o
que está decidido e marca **[A DEFINIR]** o que falta — nada inventado (A4):

- realizadora (F2 Experience), período (05 a 15/11/2026), quem participa;
- como acumula (§14.2): QR na unidade, localização exigida, 1 leitura por casa a cada 12 h, pontos (1 + 2 pela
  avaliação), números distribuídos no fechamento;
- **[A DEFINIR]** lista e quantidade de prêmios; data, local e método do sorteio (ao vivo ou pela Loteria
  Federal); prazo e forma de retirada; idade mínima;
- pódio e plaquinha Sweet Lover; desempate;
- desclassificação por fraude (carimbo sem visita, localização falsa), conferência dos sorteados e do pódio;
- dados pessoais: o que guarda, para quê, até quando (**[Proposta]** apagar os mapas 60 dias depois do
  sorteio), como apagar; localização usada só no momento da leitura (guarda a distância, não a posição); uso de
  apelido no ranking e de nome dos ganhadores;
- contato oficial: o canal que já está no site.

A política de privacidade (`/privacidade`) ganha a seção do mapa no mesmo commit.

## 14.8 Fora desta entrega

Mapa ilustrado de Natal com os temas (fase 2, mesmo dado — §14.12) · cartão para stories · recuperação por
e-mail · Turnstile · ficha de uso único (plano B, §14.1) · moderação por IA.

## 14.9 Testes

- `tests/mapa-docura.test.mjs` (sem navegador): estado do álbum a partir das linhas do banco (cor, ×N, avaliação,
  pontos 1 + 2), textos de recusa (a hora das 12 h no fuso de Natal), a chave **só** depois do `#` e nunca em
  query string, rotas `/cartoon/carimbo/<código>` e do regulamento, textos sem "Sweet" sozinho.
- `test:cartoon-navegador`: abrir `/cartoon/carimbo/<código>` com o banco interceptado e a localização simulada
  (perto, longe, negada); criar mapa; "Guardar meu mapa" restaurando em outro contexto; 360 e 1440 px.
- Banco: depois de aplicada, uma transação de teste **desfeita (rollback)**: criar → carimbar perto → recusa antes
  das 12 h (no mesmo mapa e num mapa novo com o mesmo e-mail) → recusa longe → +2 com avaliação → anular. Só com ok
  do Wilker na hora.
- Na rua: um carimbo de verdade numa unidade, com um iPhone e um Android — o GPS dentro de shopping é o que mais
  precisa ser medido.

## 14.10 Calendário e o que depende do Wilker

| Quando | O quê | Quem |
|---|---|---|
| 04/11 | código, testes, regulamento com lacunas marcadas, página dos adesivos, aviso pronto para os participantes | Claude |
| 04/11 | **ok para aplicar a migration**; conferir as 25 localizações que faltam (Participantes › Localizações); preencher os [A DEFINIR]; enviar o aviso às marcas | Wilker |
| 04/11 | imprimir os 41 adesivos e levar às unidades (cada adesivo é de uma unidade: conferir o nome antes de colar) | Wilker / F2 |
| 04–05/11 | teste no celular de verdade, numa unidade: iPhone e Android | Wilker + Claude |
| 05/11 | publica junto com o site (as flags da publicação já previstas; nada novo a ligar) | Wilker |

## 14.11 Mapa impresso — fundido com o digital (planejado; não desenvolver agora)

**[Decisão]** Pedido do Wilker (03/11/2026): o Mapa da Doçura digital e o mapa impresso são **o mesmo mapa**. O
impresso serve de **sinalização** e para quem quer o mapa na mão; o carimbo continua só no digital.

- **Arte:** Natal desenhada como **mapa de mundo de videogame** ("mundo do Switch", nas palavras do Wilker),
  no traço da Cartoon. Como é feita: §14.12.
- **Cada casa:** **número + nome + logo desenhada** quando couber (a colorida tem 480 px: ~4 cm a 300 dpi, o
  bastante para logo pequena). Sem espaço: **pin com número + nome**, e o tema da casa na legenda lateral
  (número · nome · tema · bairro).
- **Marcas na peça:** selo da edição; REALIZAÇÃO F2 Experience; **APOIOS: Senac RN e Espaço Reduzido** (a
  empresa de Parnamirim, como na face premiação do prisma — corrigido em 03/11: eu tinha lido "espaço
  reduzido" como tamanho); **PATROCÍNIO: Sicredi** (decisão do Wilker, 03/11). Arquivos recebidos copiados para
  `06_MATERIAIS_PDV/03_MAPA_IMPRESSO/00_REFERENCIAS/` no Dropbox da edição (Sicredi em PDF com área de proteção;
  Senac de 22/10).
- **[Decisão]** **Os pontos da Sicredi entram no mapa** (Wilker, 03/11), no impresso e no digital, com marcador
  próprio, diferente das casas (no rascunho: quadrado verde com "S"; na arte, a marca da Sicredi). Fonte da
  lista: `06_MATERIAIS_PDV/03_MAPA_IMPRESSO/01_RASCUNHO_POSICOES/_bastidores/pontos-sicredi.json`.
  - **[Fato]** Localizador de agências da própria Sicredi, 03/11/2026 — três agências na região (Macaíba e
    Extremoz: nenhuma):
    - **Natal (sede):** Rua Tuiuti, 765;
    - **Parnamirim, Shopping Cidade Verde:** Av. Ayrton Senna, 1995, salas L28 e L29 (o Google Maps mostra
      2349 na mesma avenida: **confirmar o número** com a Sicredi antes de imprimir);
    - **São Gonçalo do Amarante:** Shopping Carajás, Av. Bacharel Tomaz Landim, s/n, Conjunto Jardim Lola — a
      oeste do Potengi; o enquadramento do mapa já abre até lá.
  - **[Fato]** A busca "Sicredi" no Google Maps (link do Wilker, 03/11) traz as mesmas 3 e nenhuma outra na
    região.
  - **[A DEFINIR]** se a Sicredi quer mais algum ponto (ativação no festival, quiosque) além das agências.
- **Fusão com o digital:**
  - a **mesma numeração** das casas no impresso, nos pins do mapa do site e no álbum do Mapa da Doçura;
  - **QR no impresso** abrindo o Mapa da Doçura por um código novo no contador `/q/` (ex.: `mapa-impresso`),
    que já entra na aba Operação › QR Codes;
  - texto curto no impresso: como carimbar (ler o QR do balcão de cada casa) e onde está o regulamento;
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

**Pacote para o ChatGPT (03/11):** o Wilker gera as imagens no ChatGPT. Pacote em
`06_MATERIAIS_PDV/03_MAPA_IMPRESSO/02_PACOTE_CHATGPT/` (Dropbox da edição): guia da composição sem texto
(`ref-01`, gerado por `scripts/edicao/mapa-rascunho.mjs`), referências aprovadas, 4 prompts (mapa base, letreiro,
marcadores numerados, marcos soltos), gabarito de posições com números e legenda por região. Pelo manual (§0.2),
a peça impressa é montada pelo Wilker no Illustrator com elementos soltos; logos (edição, casas desenhadas,
Sicredi, apoios) entram como arquivo oficial, nunca pela IA.

**Ordem:** o carimbo (§14.1–14.10) abre no dia 5 com o álbum de logos; o mapa desenhado entra quando a arte for
aprovada e substitui o álbum como vista principal (o álbum fica como lista). O impresso depende da data de
impressão, ainda a definir.

## 14.13 Página única do mapa — Mundo, Mapa real, Lista (04/11/2026)

**[Decisão]** Wilker, 03/11: "aqui a gente trabalha em tudo que for mapa, rota e Minha rota, que a gente vai unificar"; em 04/11:
"monte tudo que não precisar agora do visual". A rota que não cabe no desenho vai para o Google Maps.

- **[Fato]** `/cartoon/mapa` e `/cartoon/minha-rota` são **a mesma página** (`paginas/mapa/index.jsx`; `MinhaRota.jsx` só
  muda a entrada: topo "Minha rota" e, no celular, o painel antes do mapa). Endereços, rota compartilhada (`?u=`) e link
  pessoal (`#mapa=`) seguem valendo. O endereço guarda `?vista`, `?painel`, `?unidade` e os filtros.
- **Três vistas das mesmas casas:** **Mundo** (o mapa desenhado), **Mapa real** (Google; MapLibre de reserva) e **Lista**.
  Filtros valem nas três; no Mundo a casa fora do filtro fica apagada, não some.
- **Ao lado:** o cartão da casa escolhida (parada da rota, carimbos, "Avaliar e ganhar +2") e o painel com duas abas:
  **Minha rota** (paradas, Google Maps em trechos, compartilhar, **"Ordenar pelo caminho do mapa"**, visitadas) e
  **Carimbos** (o álbum). Visitada = "já fui" marcado **ou** carimbo; o estado do Mapa da Doçura é lido uma vez por página
  (`rota/useMeuMapa.js`) e repartido entre álbum, cartão e Mundo.
- **Rota no desenho:** traçado esquemático (pontilhado vermelho) que passa pelas paradas na ordem do visitante — **não segue
  rua**. Para ir: "Como chegar" e "Abrir a rota no Google Maps". "Ordenar pelo caminho" usa a numeração do mapa (Potengi →
  Ponta Negra) e diz que não é o trajeto mais curto.
- **Arte trocável sem mexer no código:** `python -I scripts/edicao/mapa-mundo.py <posicoes-arte-vN.json> <arte-base.png>
  [--aprovada]` gera `src/data/mundoEdicao.js` (x/y de 0 a 1 por unidade, número, marcos, Sicredi, docerias) e as imagens
  em `public/images/marcas-edicoes/2026.2/mundo/` (base em webp nas larguras do zoom; doceria de cada casa; logo da Sicredi
  do PDF oficial). Casa sem doceria desenhada aparece com o pin da logo. **Sem `--aprovada` o Mundo só aparece no DEV**
  (prévia); no ar a página abre no Mapa real (desktop) ou na Lista (celular).
- **Contrato com a arte** (mandado à sessão das imagens em 03/11): JSON no formato de `posicoes-arte-v1.json` +
  `marcos[]` com nome e x/y; base só com terreno, mar, caminhos, marcos e pracinhas vazias (sem casa temática pintada:
  a v1 tem casa-cogumelo, casa-abacaxi, castelo e arco-íris); de preferência ≥ 2048 px no lado menor.
- **Pin da casa = LOGO OFICIAL, com o TEMA ao lado** (Wilker, 03/11): o script reduz a logo para 128 px (a sincronizada
  da pasta PRINCIPAIS; senão a do cadastro). O tema aparece com zoom, no foco, no ponteiro e na casa escolhida — no zoom 1
  os 41 rótulos cobririam o mapa. Os pins temáticos antigos (`05_SITE/10_PINS_MAPA`) não são mais o pin do mapa.
- **[Decisão]** Wilker, 04/11: **sinalização = bandeirinha numerada + legenda**, igual no site e no impresso (regra 14 do
  `BRIEFING-DO-MAPA.md`). Número = `numero` da casa (1–27, ordem da rota); unidades da mesma casa repetem o número. No site,
  zoom 1 mostra o número no pin; a logo entra com zoom, no foco, no ponteiro e na casa escolhida. Sicredi = bandeira verde
  com a logo.
- **v2 aplicada no site (04/11, candidata — o Wilker ainda avalia a versão de impressão):** chão
  `mapa-mundos-polaroid_v3_alta-4x-fiel.jpg` (6144 × 4096; o script aceita arte maior que o quadro na mesma proporção e
  gera 1024/2048/3072) + `posicoes-arte-v2.json` (41 unidades, 3 Sicredi, 4 marcos; os `mundos[]` não são usados no site).
  Pin = as bandeiras aprovadas de `04_SINALIZACAO/bandeiras/` (27 + Sicredi), aparadas a 144 px; no site a bandeira
  acompanha o mapa (`3.6cqi`, 28–60 px) dentro de um botão de no mínimo 44 px, com o pé do mastro no ponto. O rótulo do
  tema saiu (temas pintados no chão; o tema segue no nome acessível). O carimbo virou selo amarelo com ✓ e ×N, não mais
  bandeira, para não confundir com a sinalização. `--aprovada` só depois do ok do Wilker.
- **[Decisão]** Wilker, 04/11: os mundos dos 27 temas vêm **pintados no chão**, perto de cada pin (fonte: `03_MAPA_IMPRESSO/BRIEFING-DO-MAPA.md`).
  As docerias soltas saíram da prévia (o script só as põe com `--docerias`); o rótulo do tema ao lado do pin fica até o chão novo chegar.
- **v2 em paisagem girada** (1536 × 1024, mar em cima, norte à esquerda): o site aceita qualquer proporção; no celular a
  paisagem ganha 62% da altura da tela e rola de lado dentro da janela.
- **Acessibilidade:** cada casa é um `<button>` com nome falado ("3. Caroli Douces, tema …, parada 2 da sua rota, carimbada"), na
  ordem do caminho; zoom por botões de 44 px; arraste com o mouse e rolagem nativa no toque; a Lista diz o mesmo que o desenho.
- **Painel da marca:** cartão só de leitura **"Carimbos de hoje"** no Início (hoje · na edição), durante o festival.
- **Testes:** `tests/cartoon-mundo.test.mjs` (ordem do caminho, traçado, dados gerados x disco x retrato) e a seção Mapa de
  `tests/cartoon-navegador.mjs` (vistas fora do DEV, lista, marcadores, filtros, perto de mim).
- **[A DEFINIR]** depois da arte final: tamanho das casas e da bandeira, rótulos dos marcos perto da borda, aprovar
  (`--aprovada`); posições das 25 unidades que hoje vêm só do bairro, depois de conferidas em Participantes › Localizações.

## 14.14 · Caça aos Carimbos: QR do display e carimbo pendente (04/11/2026)

- **[Decisão]** Wilker, 04/11: a ativação se chama **Caça aos Carimbos** (Mapa da Doçura é o nome do mapa). Regras completas
  no documento interno `06_MATERIAIS_PDV/03_MAPA_IMPRESSO/04_SINALIZACAO/caca-aos-carimbos/caca-aos-carimbos-regras.pdf`:
  5 vouchers digitais (dias 7 a 11/11, um por dia, mais carimbos acumulados desde 5/11, 1 por pessoa, empate por
  sorteio) e prêmio final (press kit + surpresa) por sorteio entre quem completou o mapa, cada carimbo uma chance.
- **[Decisão]** O **QR do display de mesa** (face do combo, `/q/d1-<casa>`) também carimba: `destinoDoCodigo` leva a
  `/cartoon/carimbo/<slug>`, que mostra o nome e a logo da casa, **"Ver o combo"** e o botão de carimbar. A página aceita os
  dois formatos (código de 8 caracteres da unidade ou slug da casa; nenhum slug da edição tem o formato do código).
  `mapa_carimbar_casa(chave, slug, lat, lng, precisão)` escolhe a unidade da casa mais perto do celular e chama
  `mapa_carimbar` (mesmas regras: janela da avaliação, distância, 12 h por casa e por e-mail).
- **[Decisão]** **Carimbo pendente até a avaliação:** os carimbos de uma casa só contam depois que o mapa avaliou o combo
  dela; avaliada, vale os carimbos + 2. Voltas contam sem nova avaliação. `carimbo_placar` conta só casas validadas
  (`avaliadas` = `casas`); o álbum mostra "X de 27 casas validadas" e os pendentes com "Avaliar e validar".
- Migration `20261202_carimbo_por_casa_pendente.sql` (só funções, nenhuma tabela) — **aplicar só com o ok do Wilker**.
- [A DEFINIR] Os "números da sorte" de `get_mapa_carimbos` ainda seguem a regra antiga (todo mapa, avaliação = 2 números):
  ajustar para "só quem completou, 1 número por carimbo validado" e a apuração diária dos vouchers no painel.
  O texto da página `/cartoon/regulamento` também precisa ser reescrito com as regras novas.
