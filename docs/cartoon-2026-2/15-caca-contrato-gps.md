# 15 · Caça aos Carimbos — contrato do GPS e do pedido de revisão de presença

Migration `supabase/migrations/20261214_caca_gps_excecao.sql` (aplicada em 05/11/2026) · teste `supabase/testes/caca-gps-excecao.sql`
(`TESTE_OK`, nada fica no banco) · reversão `supabase/reverter/20261214_caca_gps_excecao.sql`. Regra de produto: `15-caca-especificacao.md`
§12; decisão e prós/contras: `15-caca-gps-excecao.md`. Tudo é **aditivo**: `mapa_carimbar` e `mapa_carimbar_casa` não mudaram.

## O carimbo autônomo (sem mudança no banco)

QR + localização do celular. O banco aceita o celular a até **200 m** do ponto conferido da unidade **mais a margem do GPS, no máximo
300 m** (`distancia ≤ 200 + min(precisão, 300)`). Primeira visita da casa = carimbo pendente até avaliar; 12 h por casa e por pessoa.
Casa sem nenhuma unidade com ponto conferido: o carimbo entra sem GPS (`origem = 'unidade_sem_coordenada'`), vai para a fila de revisão
e só conta pela regra de `caca_carimbo_conta`. Detalhes: `15-caca-contrato-identidade.md` ("O que conta no progresso").

No front (`rota/carimbo.js › capturarPosicao`): a permissão só é pedida no toque em "Carimbar"; até **3 tentativas** progressivas
(janelas de 6, 9 e 12 s; alvos de margem 50, 100 e 250 m) com `watchPosition` em alta precisão, guardando a **melhor** leitura; permissão
negada pára na hora. Só se mostra "Carimbado" com `ok: true` do servidor. A posição só viaja para a RPC.

## Tabela `caca_carimbo_excecao` (fechada: RLS sem política, sem grant)

| Coluna | Observação |
|---|---|
| `id` uuid | opaco; é o que o painel decide |
| `edicao_codigo`, `mapa_id` (cascade), `pessoa` (e-mail normalizado), `participacao_id`, `participacao_unidade_id` | a unidade é a provável (conferida primeiro, depois a mais perto); pode ser trocada na aprovação |
| `motivo` | `sem_localizacao` · `imprecisa` · `longe` |
| `distancia_m`, `precisao_m` | **calculadas pelo servidor** a partir da posição enviada; a posição (lat/lng) **não é guardada** |
| `nota` | até 200 caracteres, sem caracteres de controle; opcional |
| `estado` | `pendente` → `aprovado` \| `negado` |
| `decidido_por`, `decidido_user`, `decidido_em`, `decisao_nota`, `carimbo_id` | auditoria da decisão; `carimbo_id` só quando aprovado |

Apagar o mapa apaga os pedidos dele (cascade). Retenção: **não decidida** (ver `15-caca-gps-excecao.md`, pendências).

## RPCs públicas (por mapa)

### `caca_excecao_pedir(p_chave, p_slug, p_motivo, p_lat, p_lng, p_precisao, p_nota) -> jsonb`
Grava um pedido **pendente**. **Não carimba e não conta nada.** Sucesso: `{ ok:true, id, estado:'pendente', slug }`.
Recusas `{ ok:false, motivo }`:

| `motivo` | Quando |
|---|---|
| `mapa_desconhecido` | chave não reconhecida |
| `motivo_invalido` | `p_motivo` fora dos três |
| `qr_invalido` | casa desconhecida/sem publicação |
| `casa_sem_combo` | casa fora das que contam na Caça |
| `nao_aberta` / `encerrada` | janela da avaliação fechada (carimbos só existem com a janela aberta) |
| `nao_precisa` | a casa **não tem ponto conferido** (o carimbo normal já vale, sem GPS) **ou** o celular está dentro do raio (`≤ 200 + min(precisão,300)`): o pedido seria um atalho |
| `cedo` | a pessoa já carimbou nessa casa há menos de 12 h (`liberado_em`) |
| `ja_pedido` | já pediu para essa casa há menos de 12 h, qualquer que tenha sido a resposta (`liberado_em`) |
| `limite_dia` | 2 pedidos por casa no dia de Natal |
| `muitos_pendentes` | 5 pedidos da pessoa esperando decisão |
| `fila_cheia` | 300 pedidos pendentes na edição |

Limites são por **pessoa (e-mail)**, sob o mesmo bloqueio por e-mail dos carimbos. O front só oferece o pedido depois de 2 falhas de
localização seguidas e quando ainda é plausível a pessoa estar na casa (localização ausente, margem > 100 m ou a ≤ 500 m).

### `caca_excecao_minhas(p_chave) -> jsonb`
`{ ok:true, pedidos:[{ slug, estado, criado_em, decidido_em }] }` (30 mais recentes, da edição e da pessoa). Sem notas internas.

## RPCs do painel (`p_secret` + `public.pode()`)

### `caca_excecao_listar(p_secret, p_edicao, p_estado default null) -> jsonb` · `dado.ler`
`{ pendentes, itens[] }` (até 300; pendentes primeiro, o mais antigo no topo). Cada item: `id, estado, criado_em, motivo, apelido, casa, slug,
unidade, nome_unidade, distancia_m, precisao_m, nota, avaliou, carimbos_na_casa, pedidos_da_pessoa, decidido_por, decidido_em, decisao_nota,
carimbo_id`. **`email` e `whatsapp` só com `relatorio.ler`.** `p_estado` inválido → exceção `parametro_invalido`.

### `caca_excecao_decidir(p_secret, p_id, p_decisao, p_nota default null) -> jsonb` · `producao.gerir`
`p_decisao`: `aprovar` | `negar`. Exceções: `nao_autorizado` · `parametro_invalido` · `pedido_nao_encontrado` · `transicao_invalida`
(já decidido) · `nota_obrigatoria` (negar sem motivo) · `nao_aberta` · `encerrada` · `casa_sem_combo` · `cedo` (carimbo da pessoa na casa
há menos de 12 h) · `qr_invalido` (unidade sem QR ativo).
- **Negar:** registra o motivo; nada é carimbado.
- **Aprovar:** cria **um** carimbo agora (`criado_em = now()`; uma decisão tardia conta a partir dela e **não retroage** apuração já fotografada),
  com `origem = 'excecao_painel'`, `conferido = false`, `distancia_m`/`precisao_m` do pedido. Respeita as 12 h e a janela. Depois o carimbo segue
  a regra normal (precisa da avaliação do combo para validar a casa).
- Auditoria: `caca_evento` (`excecao_pedida` pelo visitante, `excecao_aprovada`/`excecao_negada` pelo ator com a conta pessoal) e, ao
  aprovar, `auditoria` (`carimbo.excecao`).

### `caca_gps_resumo(p_secret, p_edicao) -> jsonb` · `dado.ler`
`{ total, contam, excecao_painel, pedidos_pendentes, por_dia[{dia, sem_gps, contam, pessoas}], por_pessoa[{apelido, sem_gps, contam, ultimo}] }`.
`sem_gps` = carimbos não anulados com origem ≠ `gps`; `contam` = os que entram no progresso (`caca_carimbo_conta`). Dia = dia de Natal.
Sem contato. Alimenta a aba "Revisão sem GPS" e a faixa nas abas de apuração (Vouchers do dia e Prêmio final).

## Tempo real
Gatilho `sync_caca_carimbo_excecao` (domínio `carimbos`, canal `org`): o painel relê a fila quando um pedido entra ou é decidido.

## Segurança — o que ficou garantido
- QR fixo **nunca** carimba sozinho; o pedido não carimba; só a organização (nunca a casa) cria o carimbo de exceção.
- Funcionário da casa fora do fluxo normal e do fluxo da exceção.
- A posição não é gravada (só distância e margem); tabela e utilitário interno sem acesso de `anon`/`authenticated`.
- ⚠️ Como em qualquer GPS vindo do navegador, a posição pode ser forjada por quem controla o aparelho; o pedido não piora isso e passa por
  decisão humana, com limites e trilha de auditoria.

## Atualização 05/11/2026 (migration 20261217, achados C01, C02 e SEC-02)

- **GPS decidido pela casa (C01).** Se qualquer unidade participante da casa tem ponto conferido, o carimbo exige a posição e mede a distância até a unidade conferida mais próxima, mesmo que o QR lido seja de outra unidade (quem está na unidade sem ponto fica `longe` e segue pelo pedido de revisão).
- **QR fixo sozinho nunca prova presença (C02).** Em casa sem NENHUM ponto conferido, `mapa_carimbar` responde `{ ok:false, motivo:'sem_ponto' }` e não grava nada; a pessoa pede a revisão (`caca_excecao_pedir`, motivo `sem_localizacao`) e a ORGANIZAÇÃO decide. `caca_config.carimbo_sem_ponto`: `"revisao"` (padrão) ou `"conta"` (o Wilker libera o carimbo sem GPS nessas casas; o regulamento precisa mudar junto). `caca_carimbo_conta` segue a mesma chave.
- **Pedido (SEC-02):** exige mapa principal com e-mail confirmado (`email_nao_confirmado`); fila cheia é por casa (20 pendentes, `fila_cheia`); mantidos 5 pendentes por pessoa, 1 por casa a cada 12 h e 2 por casa por dia. Em casa sem ponto o pedido é aceito mesmo sem posição (`nao_precisa` só no modo `"conta"`).
- `mapa_carimbar` não devolve mais `pontos`; `ranking_mapa(text)` e `mapa_ler(text)` (pontos, regra extinta) deixaram de ser chamáveis por `anon`/`authenticated`.

## Atualização 05/11/2026 (migration 20261217_caca_carimbo_premio_correcao, achados C09, SEC-04, C04, SEC-05)

- **Janela de 12 h sem anulados (C09).** `mapa_carimbar` ignora carimbo ANULADO ao calcular o intervalo (igual ao pedido e à aprovação de revisão): a organização anula e a pessoa volta a poder carimbar na hora. `primeira` é da PESSOA (e-mail normalizado), não do mapa: um segundo mapa do mesmo e-mail não refaz a primeira visita.
- **Coordenada inválida nunca vira erro de banco (SEC-04).** `carimbo_distancia` devolve NULL para NaN, Infinity ou fora de -90..90 / -180..180. `mapa_carimbar` responde `sem_localizacao`; `caca_excecao_pedir` valida o intervalo antes de medir e, sem posição válida, grava o pedido sem distância (`distancia_m` nulo). `mapa_carimbar_casa` herda a mesma proteção.
- **Texto limpo (SEC-04).** `caca_texto_limpo(texto, max)` tira caractere de controle e de formatação Unicode (U+200B-U+200F, U+202A-U+202E, U+2066-U+2069, U+2028/2029, U+FEFF). Vale para a nota do pedido, a nota da decisão e o apelido do mapa (`mapa_criar`; apelido que só tem invisíveis dá `apelido_invalido`). O painel já renderiza como texto.
- **Modo `"conta"` (casa sem ponto conferido):** o carimbo sai com origem `unidade_sem_coordenada`, aparece em `caca_carimbo_revisao_listar` ("Revisão sem GPS") e a organização pode anulá-lo com `carimbo_anular`; o padrão do servidor segue `"revisao"` (decisão do Wilker, ver `15-caca-publicacao-pendencias.md`).
- **Legado fechado (C04).** `ranking_mapa(text)`, `mapa_ler(text)` e `carimbo_placar(text)` sem execute para `anon`/`authenticated` (nenhum front ou painel os chama).
- **`definir_publicacao_edicao` (SEC-05).** O alias ambíguo `k` foi renomeado; sem `edicao.gerir` e sem `curadoria.decidir` a resposta é `nao_autorizado` (antes `column reference "k" is ambiguous`). Curadoria só mexe em `participantes_publicos`/`combos_publicos`; o resto exige `edicao.gerir`. A janela da avaliação não é tocada por nenhuma dessas correções.
