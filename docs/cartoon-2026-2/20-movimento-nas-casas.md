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

## C · "Tinha fila?" depois do carimbo — a fazer
## B · "Estamos com fila agora" pela casa — a fazer
