# 20 · Movimento nas casas (11/11/2026)

Pedido do Wilker: saber o movimento de cada casa durante a edição. Três fontes, aprovadas na ordem A → C → B ("Sim, nessa ordem").
Nenhuma regra do jogo muda. O público só vê o que for confirmado por gente (B; C mais tarde, se o Wilker quiser).

## A · Movimento pelos carimbos (painel, só leitura)
- Migration `20270125_caca_movimento.sql` (reverter em `supabase/reverter/`): `caca_movimento_estado(p_secret, p_agora)`, `dado.ler`.
- Só carimbos `origem = 'gps'` (feitos no local, na hora). Delivery, visita anterior e exceção aprovada têm o horário da aprovação.
- Janela de **2 h** (o plano dizia 1 h: com 1 h, 39 de 42 casas ficavam "sem dado" no pico de 10/11 — ~1 carimbo/h por casa).
- Nível: `sem_dado` (< 3 na janela) · `sem_base` (1º dia) · `calmo` (< 0,5 × normal) · `agitado` (> 1,5 × normal, ou normal 0) · `normal`.
  Normal = média da mesma janela nos dias anteriores desde `edicoes.festival_inicio`.
- Painel: Edição › Carimbos › **Movimento** — tabela por casa (2 h, normal, nível, pico, hoje) e barras por hora (hoje × média).
- Ensaio (ROLLBACK), 08/11 18h30: 42 unidades · 9 agitadas · 3 normais · 30 pouco dado; Bolomania 12 nas 2 h × 2,7 normal.
- Limite honesto: mede quem joga a Caça, não lotação.

## C · "Tinha fila?" depois do carimbo
- Migration `20270126_caca_fila_resposta.sql` (reverter em `supabase/reverter/`): tabela `caca_fila_resposta` (1 por carimbo,
  fechada para anon) e `caca_fila_responder(p_chave, p_unidade, p_resposta)` — só o dono do mapa, só sobre o próprio carimbo por GPS
  daquela unidade nas últimas 3 h; responder de novo troca. Não toca carimbos, ranking nem prêmio.
- `caca_movimento_estado` passa a trazer `fila` por unidade (respostas da janela de 2 h).
- Site: `src/edicao/caca/FilaPergunta.jsx` na tela do carimbo validado (Sem fila · Fila pequena · Fila grande), textos em `CACA.fila`.
- Painel: coluna "Tinha fila?" na tabela do Movimento. Público: nada por enquanto.
- Ensaio (ROLLBACK): resposta gravada aparece no movimento (1 fila grande na unidade); chave errada → `mapa_desconhecido`;
  resposta fora da lista → `resposta_invalida`. O caminho feliz pela chave real só dá para ver depois de aplicada, num carimbo de verdade.
## B · "Estamos com fila agora" pela casa
- Migration `20270127_caca_fila_aviso.sql` (reverter em `supabase/reverter/`): tabela `caca_fila_aviso` (uma linha por unidade,
  `ate` = agora + 1 h; ligar de novo renova; desligar antes põe `ate` = agora). Modelo do combo esgotado (20270115).
  - Marca: `marca_fila_estado` / `marca_fila_definir` (dona da participação, a unidade é dela, só no período do festival; ligar
    avisa a Organização por `notificar`, tipo `fila_casa`).
  - Organização: `caca_fila_definir` (`producao.gerir`) e `caca_fila_avisos` (`dado.ler`).
  - Público: `filas_agora_publico(p_edicao)` → só slug + id público, só casa com combo publicado e aviso valendo.
- Painel da marca: cartão "Fila no mapa" no Início (durante o festival), um por endereço, ao lado do combo esgotado.
- Painel: coluna "Fila no mapa" na aba Movimento, com "Marcar fila (1 h)" / "Tirar fila" para quem gere a produção.
- Site: o mapa relê junto com o combo esgotado (45 s, foco, aba visível); o cartão da casa mostra "Fila agora, avisou a casa".
- Ensaio (ROLLBACK): ligar → a casa aparece em `filas_agora_publico`; desligar → some; sem senha e sem login → `nao_autorizado`.
- **A confirmar com o Wilker:** prazo de 1 h.

## ✅ Aplicadas em 11/11/2026 ~15h10 Natal (ok do Wilker: "Sim, aplicar as 3")
`20270125` (A) → `20270126` (C) → `20270127` (B). Os reverters desfazem na ordem inversa.
- Conferido depois: `anon` executa movimento, avisos da fila, definir (org, com senha), responder e a leitura pública;
  não executa `caca_fila_gravar` nem as duas da marca (só `authenticated`); as tabelas novas não abrem para `anon`.
  `caca_movimento_estado(null)` → `nao_autorizado`. 0 respostas e 0 avisos de fila no momento.
- Falta: o site e o painel com as telas novas só chegam ao público quando a `dev` for para `master` (decisão do Wilker);
  a conferência visual da aba Movimento e do cartão da marca é dele (pedem login).
