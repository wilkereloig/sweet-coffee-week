-- Teste de 20261102 (lembretes automáticos do Social media). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Roda como dono do banco (a função não é executável por authenticated) com o relógio SIMULADO (p_agora). Fortaleza = UTC-3.
-- Precisa de 1 administrador ativo (recebe os avisos). Postagens reais também geram aviso para os responsáveis delas aqui dentro,
-- mas tudo se desfaz no fim; as contagens abaixo olham só as postagens criadas pelo teste.
do $$
declare
  adm uuid; n int;
  p_sa uuid; p_pr uuid; p_at uuid; p_at2 uuid; p_at3 uuid; p_fa uuid; p_fa3 uuid; p_hoje uuid; p_pub uuid; p_can uuid;
  txt text;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo and bloqueado_em is null limit 1;
  if adm is null then raise exception 'preparo: sem administrador ativo'; end if;
  update public.perfis set deve_trocar_senha = false where user_id = adm;

  -- fora da janela 07–22h de Fortaleza nada acontece
  if public.redes_lembretes('2026-12-10 09:30+00') <> 0 then raise exception '06:30 em Fortaleza deveria ficar quieto'; end if;
  if public.redes_lembretes('2026-12-11 01:30+00') <> 0 then raise exception '22:30 em Fortaleza deveria ficar quieto'; end if;

  -- 1 h antes, sem aprovação
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T sem aprovação', 'feed', 'rascunho', '2026-12-12 15:00+00', adm, adm, 'teste', 'teste') returning id into p_sa;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T já aprovada', 'feed', 'pronto', '2026-12-12 15:00+00', adm, adm, 'teste', 'teste') returning id into p_pr;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo, publicado_em, publicado_snapshot)
    values ('T publicada', 'feed', 'publicado', '2026-12-12 15:00+00', adm, adm, 'teste', 'teste', now(), '{}'::jsonb) returning id into p_pub;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T cancelada', 'feed', 'cancelado', '2026-12-12 15:00+00', adm, adm, 'teste', 'teste') returning id into p_can;

  perform public.redes_lembretes('2026-12-12 13:30+00');   -- 1h30 antes: cedo
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_sa || ':lembrete_sem_aprovacao:%';
  if n <> 0 then raise exception 'avisou cedo demais (%)', n; end if;
  perform public.redes_lembretes('2026-12-12 14:05+00');   -- 55 min antes
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_sa || ':lembrete_sem_aprovacao:%';
  if n <> 1 then raise exception '1 h antes deveria avisar o responsável uma vez, avisou %', n; end if;
  perform public.redes_lembretes('2026-12-12 14:15+00');   -- próxima rodada: não repete
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_sa || ':lembrete_sem_aprovacao:%';
  if n <> 1 then raise exception 'repetiu o aviso (%)', n; end if;
  select count(*) into n from public.notificacoes where chave_grupo like 'redes:' || p_pr || ':lembrete_sem_aprovacao:%'
     or chave_grupo like 'redes:' || p_pub || ':lembrete_sem_aprovacao:%' or chave_grupo like 'redes:' || p_can || ':lembrete_sem_aprovacao:%';
  if n <> 0 then raise exception 'aprovada, publicada e cancelada não entram no "sem aprovação" (%)', n; end if;
  update public.redes_posts set programado_para = '2026-12-12 18:00+00' where id = p_sa;   -- reagendar libera um aviso novo
  perform public.redes_lembretes('2026-12-12 17:05+00');
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_sa || ':lembrete_sem_aprovacao:%';
  if n <> 2 then raise exception 'reagendar deveria liberar novo aviso (%)', n; end if;

  -- passou do horário sem confirmar
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T atrasada', 'feed', 'rascunho', '2026-12-13 12:00+00', adm, adm, 'teste', 'teste') returning id into p_at;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T antiga', 'feed', 'rascunho', '2026-12-10 12:00+00', adm, adm, 'teste', 'teste') returning id into p_at2;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T aprovada atrasada', 'feed', 'pronto', '2026-12-13 12:00+00', adm, adm, 'teste', 'teste') returning id into p_at3;
  perform public.redes_lembretes('2026-12-13 12:20+00');   -- só 20 min
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_at || ':lembrete_atrasada:%';
  if n <> 0 then raise exception 'atrasada: cedo demais (%)', n; end if;
  perform public.redes_lembretes('2026-12-13 12:40+00');
  perform public.redes_lembretes('2026-12-13 13:10+00');
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_at || ':lembrete_atrasada:%';
  if n <> 1 then raise exception 'atrasada: deveria avisar uma vez (%)', n; end if;
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_at3 || ':lembrete_atrasada:%';
  if n <> 1 then raise exception 'atrasada e aprovada também avisa o responsável (%)', n; end if;
  perform public.redes_lembretes('2026-12-11 13:00+00');   -- 25 h depois de p_at2: tarde demais
  select count(*) into n from public.notificacoes where chave_grupo like 'redes:' || p_at2 || ':lembrete_atrasada:%';
  if n <> 0 then raise exception 'depois de 24 h não avisa mais (%)', n; end if;

  -- faltando arte/legenda a 2 dias (a partir das 08h)
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T faltando', 'feed', 'rascunho', '2026-12-20 15:00+00', adm, adm, 'teste', 'teste') returning id into p_fa;
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T faltando em 3 dias', 'feed', 'rascunho', '2026-12-21 15:00+00', adm, adm, 'teste', 'teste') returning id into p_fa3;
  perform public.redes_lembretes('2026-12-18 09:00+00');   -- 06:00 em Fortaleza: quieto
  perform public.redes_lembretes('2026-12-18 10:30+00');   -- 07:30: ainda antes das 08h
  select count(*) into n from public.notificacoes where chave_grupo like 'redes:' || p_fa || ':lembrete_faltando:%';
  if n <> 0 then raise exception 'faltando: antes das 08h não avisa (%)', n; end if;
  perform public.redes_lembretes('2026-12-18 11:05+00');
  perform public.redes_lembretes('2026-12-18 11:15+00');
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_fa || ':lembrete_faltando:%';
  if n <> 1 then raise exception 'faltando: deveria avisar uma vez (%)', n; end if;
  select titulo into txt from public.notificacoes where para_user_id = adm and chave_grupo like 'redes:' || p_fa || ':lembrete_faltando:%';
  if txt not like '%arte e legenda%' then raise exception 'título deveria dizer o que falta: %', txt; end if;
  select count(*) into n from public.notificacoes where chave_grupo like 'redes:' || p_fa3 || ':lembrete_faltando:%';
  if n <> 0 then raise exception 'faltando: só a 2 dias (%)', n; end if;

  -- resumo do dia: depois das 08h, uma vez por pessoa e dia
  insert into public.redes_posts (titulo, formato, situacao, programado_para, responsavel_id, criado_por_id, criado_por_rotulo, atualizado_por_rotulo)
    values ('T hoje', 'feed', 'rascunho', '2026-12-14 15:00+00', adm, adm, 'teste', 'teste') returning id into p_hoje;
  perform public.redes_lembretes('2026-12-14 10:30+00');   -- 07:30
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo = 'redes:resumo:2026-12-14';
  if n <> 0 then raise exception 'resumo: antes das 08h não sai (%)', n; end if;
  perform public.redes_lembretes('2026-12-14 11:05+00');
  perform public.redes_lembretes('2026-12-14 11:15+00');
  select count(*) into n from public.notificacoes where para_user_id = adm and chave_grupo = 'redes:resumo:2026-12-14';
  if n <> 1 then raise exception 'resumo: uma vez por dia (%)', n; end if;
  select texto into txt from public.notificacoes where para_user_id = adm and chave_grupo = 'redes:resumo:2026-12-14';
  if txt !~ 'para hoje' then raise exception 'resumo deveria falar das postagens de hoje: %', txt; end if;
  perform public.redes_lembretes('2026-12-15 11:05+00');   -- dia seguinte: p_hoje agora está atrasada
  select texto into txt from public.notificacoes where para_user_id = adm and chave_grupo = 'redes:resumo:2026-12-15';
  if txt is null or txt !~ 'atrasada' then raise exception 'resumo do dia seguinte deveria citar atrasadas: %', txt; end if;

  -- ninguém de fora executa
  set local role authenticated;
  begin perform public.redes_lembretes(); raise exception 'authenticated não pode executar';
  exception when insufficient_privilege then null; end;
  reset role;

  raise exception 'TESTE_OK';
end $$;
