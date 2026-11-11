# 19 · Disputa e avisos — competição e permanência na Caça (10/11/2026)

Pedido do Wilker: convite ao push no momento certo, mensagens de disputa e o cartão "Sua disputa hoje". **Nenhuma regra do jogo muda.**
Todo número vem do banco, pela mesma conta da apuração (`caca_ranking_v2` + `caca_escolher_dia`); sem número exato, não há aviso;
nada promete voucher; depois do corte, nenhum aviso cita o voucher daquele dia.

## Etapa 1 · Cartão "Sua disputa hoje" (✅ RPC aplicada em 10/11)
- RPC `caca_minha_disputa(p_chave)` — migration `20270123_caca_minha_disputa.sql` (só leitura; reverter em `supabase/reverter/`).
  Estados: `encerrada` · `final` (dia sem voucher, depois do corte ou quem já ganhou) · `sem_carimbo` · `dentro` · `empate` · `fora` (com `faltam` exato).
- Hub: `src/edicao/caca/disputa/hoje.js` (lógica e textos) + `CartaoDisputa.jsx`, primeiro na coluna 2 de `Central.jsx`; o mapa aceita `?perto=1`.
- ⚠️ `no_ranking = true` quer dizer "quero aparecer no ranking" (o pedido supunha o contrário).

## Etapa 2 · Convite ao push (código pronto, sem banco)
- `notificacoes/convite.js` (quando mostrar) + `ConvitePush.jsx`: na tela do carimbo validado (`Carimbo.jsx`) e no hub, abaixo da disputa.
- Só para quem tem carimbo e não tem push no aparelho; permissão só no clique; "Agora não" esconde por 3 dias neste aparelho.
- iPhone sem o app: explica por que e como instalar (o mesmo texto de "Avisos no celular"), sem botão de ativar.
- Uma ativação só: `aparelho.ativarAvisosDoMapa` (a central e o convite); o evento `scw:caca-push` faz as duas peças relerem o aparelho.

## Etapa 3 · Categoria `disputa` (✅ migration aplicada em 10/11 ~17h55, interruptor DESLIGADO)
Migration `20270124_caca_disputa_avisos.sql` + `supabase/reverter/20270124_caca_disputa_avisos.sql`.

| Gatilho | Quando | Limite |
|---|---|---|
| Ultrapassagem | estava na zona no ciclo anterior, caiu de posição e saiu (fora ou empate) | 1 por dia |
| Perto da zona | fora com 1 ou 2 casas, ou empate, das 10h até 2 h antes do corte | 1 por dia |
| Reta final | 2 h antes do corte: na zona, em empate ou a 1 casa | 1 por dia |
| Retomada | tem carimbo e 48 h sem carimbar, na janela da programação (10h–14h) | 1 a cada 2 dias; tira o incentivo neutro do dia |

- Os três primeiros só em dia de voucher e antes do corte; vencem no corte (`vigente_ate`). O corte vem de `caca_corte` (12h no dia 14 com a 20270122).
- **Trava:** mais de 300 avisos num ciclo = nada sai (registrado no estado do agendador). **Retomada espalhada** (decisão do Wilker, 10/11):
  até 150 por ciclo, quem tem mais casas primeiro.
- Push: preferência `disputa` ligada por padrão (quem nunca escolheu recebe); abaixo de prêmio e avaliação pendente (guarda a vaga do
  limite diário para elas) e acima do incentivo. Mesmos limites de hoje (2 por dia, 1 por categoria, 8h–21h).
- Programação: com a disputa ligada, os 4 textos neutros de quem tem carimbo passam a dizer a posição ("… e está em 7º no ranking").
- Painel: Caça › Avisos › "Avisos de disputa" — interruptor (`producao.gerir`) e, por dia e tipo, quantos na central e quantos no celular.
- Site: categoria "Disputa do voucher" nas preferências (`PREFS_PADRAO.disputa = true`), botão "Ver minha disputa" no sino.

### Ensaio com dados reais (ROLLBACK, 10/11 à noite, simulando 11/11)
| Ciclo (Natal) | Resultado |
|---|---|
| 10h00 | 1ª versão: 399 (395 retomada) > 300 → a trava segurou. Com a retomada espalhada: 156 (150 retomada + 6 perto) |
| 10h15 · 10h30 · 10h45 | 150 · 93 · 0 retomada — 393 pessoas, nenhuma duas vezes |
| 15h05 | reta final: 6 (1 na zona, 5 empatados na última vaga) |
| 15h20 | ultrapassagem forçada no estado: 1, texto certo |
| 17h05 | depois do corte: 0 |

Incentivo neutro e retomada para a mesma pessoa no mesmo dia: 0. Só 2 das 395 pessoas paradas têm push.

## Falta (etapa 4 e ponto de decisão 2)
- ✅ 20270124 aplicada (gerador responde `disputa: false`; `anon` não executa o gerador nem os textos; 0 avisos `disputa`).
- Navegador em 360 e 1280 (cartão e convite já conferidos com mapa simulado). Seção do painel: conferência do Wilker (pede login).
- ⏳ Aviso `disputa` real só no mapa do Wilker (apelido "Eloi", 2 iPhones + 1 Windows): aviso `4376f3e6…` criado como `agendado`
  (chave `disputa:2026-11-11:ultrapassagem:teste-wilker`, só esse mapa). Em 10/11 não deu para mandar: ele já tinha os 2 pushes do dia,
  e `urgente` só vale para `imprevisto`. Job de uma vez `scw-teste-disputa-wilker` (pg_cron, `5 11 11 11 *` = 11/11 8h05 Natal) libera
  o aviso, cria a entrega e se apaga; o ciclo das 8h15 entrega. Ensaio (ROLLBACK): entra na fila, nenhum outro destino; hoje passaria
  pela preferência (sem `disputa` nas prefs = ligada) e pararia no limite — o esperado.
  Conferir em 11/11: `push_estado` da entrega = `enviado`, `cron.job` sem o job, e a linha no painel (1 na central · 1 no celular).
- **Ponto de decisão 2:** ligar o interruptor e publicar só com o ok do Wilker.

## Avisos de delivery (11/11/2026 · migration 20270130 ✅ APLICADA 11/11 ~17h, interruptor DESLIGADO)
Pedido do Wilker: "notificações inteligentes … que estimulam a compra" (ex.: Vivianne Castro Doces com entrega grátis).
- Categoria `delivery` (preferência ligada por padrão, como a disputa). Interruptor `delivery_aviso` nasce DESLIGADO; painel: Caça › Avisos › "Avisos de delivery".
- Uma rodada por dia, 17h–19h de Natal: cada pessoa com carimbo recebe UMA das 12 casas com delivery do combo que ainda falta no mapa dela,
  sem repetir casa já avisada (sorteio fixo por pessoa e dia). Um aviso por casa por dia; destino = ficha do combo (`/cartoon/combos/<slug>`).
- Só dado do cadastro: unidade que participa + `delivery_combo = 'sim'` + combo aprovado; "entrega grátis" só se todas as unidades dizem grátis
  (hoje só Vivianne Castro Doces). Texto não promete carimbo ("quando receber, peça o carimbo do delivery na Caça").
- Push: limites de hoje (2/dia, 1 por categoria), prioridade do incentivo. Trava: mais de 1000 pessoas no dia = nada sai.
- Ensaio (ROLLBACK, 11/11 16h50): 16h50 nada; 17h05 → 12 avisos, 697 pessoas (39 a 74 por casa); 17h20 já gerado; dia 12 nenhuma casa repetida;
  ninguém recebe casa onde já tem carimbo. Só 8 pessoas têm push ativo: o alcance real é a central (sino).
- O clique no celular abre a ficha só depois de publicar o `caca-sw.js` novo; antes disso abre a central.
- ✅ Teste da disputa (11/11): entrega do aviso `4376f3e6…` com `push_estado = enviado` às 8h15; o job `scw-teste-disputa-wilker` se apagou.
- ⏳ Teste do delivery só no mapa do Wilker: aviso `c571ec81…` (Vivianne Castro Doces, entrega grátis; chave `teste-delivery:2026-11-12:wilker`,
  fora da contagem do painel) criado como `agendado`. Em 11/11 ele já tinha os 2 pushes do dia. Job de uma vez `scw-teste-delivery-wilker`
  (`5 11 12 11 *` = 12/11 8h05 Natal) libera e cria a entrega; o ciclo das 8h15 manda. Conferir: entrega `enviado`, job apagado.
  Sem o site publicado, o toque abre a central (o `caca-sw.js` novo ainda não está no ar).
