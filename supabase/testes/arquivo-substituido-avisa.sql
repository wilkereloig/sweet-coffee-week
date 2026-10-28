-- Teste de 20261109 (arquivo substituído avisa quem já confirmou). Não deixa rastro: termina em exceção. Esperado: "TESTE_OK".
-- Precisa de 2 marcas com conta (uma lê, a outra nunca lê).
do $$
declare
  v_pa uuid; v_part uuid; v_outra uuid; v_outro_part uuid; v_arq uuid; v_sem_exigir uuid; v_arquivado uuid; n int;
begin
  select pa_.id, pa_.participante_id into v_pa, v_part
    from public.participacoes pa_ join public.participantes p on p.id = pa_.participante_id
   where p.user_id is not null order by pa_.created_at desc limit 1;
  select pa_.id, pa_.participante_id into v_outra, v_outro_part
    from public.participacoes pa_ join public.participantes p on p.id = pa_.participante_id
   where pa_.participante_id <> v_part and p.user_id is not null limit 1;
  if v_pa is null or v_outra is null then raise exception 'preparo: faltaram marcas com conta'; end if;

  insert into public.arquivos (escopo, nome, path, exige_leitura, publicado_em, versao)
    values ('geral', 'teste substituido', 'geral/teste-substituido.pdf', true, now() - interval '1 day', '1') returning id into v_arq;
  insert into public.arquivos (escopo, nome, path, exige_leitura, publicado_em, versao)
    values ('geral', 'teste sem exigir', 'geral/teste-sem-exigir.pdf', false, now() - interval '1 day', '1') returning id into v_sem_exigir;
  insert into public.arquivos (escopo, nome, path, exige_leitura, publicado_em, versao, arquivado)
    values ('geral', 'teste arquivado', 'geral/teste-arquivado.pdf', true, now() - interval '1 day', '1', true) returning id into v_arquivado;
  -- Só a primeira marca confirmou (há 12 h), em cada um dos três.
  insert into public.arquivo_leitura (arquivo_id, participacao_id, lido_em)
    select x, v_pa, now() - interval '12 hours' from unnest(array[v_arq, v_sem_exigir, v_arquivado]) x;

  -- 1. Substituição de verdade (publicado_em = agora): só quem já confirmou é avisado.
  update public.arquivos set publicado_em = now(), versao = '2' where id = v_arq;
  select count(*) into n from public.notificacoes where titulo = 'Arquivo atualizado: teste substituido' and participante_id = v_part and tipo = 'arquivo' and para = 'marca'
     and link = 'arquivos/' || v_arq;
  if n <> 1 then raise exception '1: a marca que já leu devia receber 1 aviso, recebeu %', n; end if;
  select count(*) into n from public.notificacoes where titulo = 'Arquivo atualizado: teste substituido' and participante_id = v_outro_part;
  if n <> 0 then raise exception '1: quem nunca leu não devia ser avisado (recebeu %)', n; end if;

  -- 2. Mexer em outra coluna não avisa de novo.
  update public.arquivos set descricao = 'outra coisa' where id = v_arq;
  select count(*) into n from public.notificacoes where titulo = 'Arquivo atualizado: teste substituido' and participante_id = v_part;
  if n <> 1 then raise exception '2: outra coluna não devia avisar (total %)', n; end if;

  -- 3. Leitura DENTRO de 1 minuto da nova publicação ainda vale: sem aviso.
  update public.arquivo_leitura set lido_em = now() where arquivo_id = v_arq and participacao_id = v_pa;
  update public.arquivos set publicado_em = now() + interval '30 seconds', versao = '3' where id = v_arq;
  select count(*) into n from public.notificacoes where titulo = 'Arquivo atualizado: teste substituido' and participante_id = v_part;
  if n <> 1 then raise exception '3: leitura ainda válida não devia avisar (total %)', n; end if;

  -- 4. Arquivo que não exige leitura e arquivo arquivado: sem aviso.
  update public.arquivos set publicado_em = now(), versao = '2' where id in (v_sem_exigir, v_arquivado);
  select count(*) into n from public.notificacoes where titulo in ('Arquivo atualizado: teste sem exigir', 'Arquivo atualizado: teste arquivado');
  if n <> 0 then raise exception '4: sem exigir leitura / arquivado não devia avisar (total %)', n; end if;

  -- 5. Só autor do gatilho executa a função (nenhum papel de API).
  if has_function_privilege('anon', 'public.arquivo_substituido_avisa()', 'execute')
     or has_function_privilege('authenticated', 'public.arquivo_substituido_avisa()', 'execute') then
    raise exception '5: função do gatilho aberta a papéis de API';
  end if;

  raise exception 'TESTE_OK';
end $$;
