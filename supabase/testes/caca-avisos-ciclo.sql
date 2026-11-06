-- Agendador dos avisos (migration 20261230_caca_avisos_ciclo): ligar vale só daqui para a frente; o ciclo roda sem erro.
-- Roda DEPOIS da migration, na mesma transação, e sempre termina em exceção: TESTE_OK = passou. O net.http_post do ciclo só enfileira
-- no commit, então o rollback também cancela a chamada: nada é enviado.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_secret = 'x' $f$;
do $t$
declare ed constant text := '2026.2'; ca record; ch1 text; id1 uuid; r jsonb;
begin
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
    select ca.participacao, 999, 'marca_e_combo', '{}'::jsonb, true where not exists (select 1 from public.publicacoes pb where pb.participacao_id = ca.participacao and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  update public.unidades set coordenada_verificada_em = null where id in (select unidade_id from public.participacao_unidades where id = ca.unidade);
  ch1 := public.mapa_criar(ed, 'A1', 'a1@exemplo.com.br', null, true, true) ->> 'chave';
  select id into id1 from public.mapas_lover where chave_hash = public.mapa_hash(ch1);

  if (public.caca_avisos_auto_estado('x') ->> 'ligado')::boolean then raise exception 'nasce desligado'; end if;
  if not (public.caca_avisos_auto_estado('x') ->> 'agendado')::boolean then raise exception 'job não está agendado'; end if;
  begin perform public.caca_avisos_auto_estado('errada'); raise exception 'negar'; exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  r := public.caca_avisos_auto_definir('x', true);
  if (r ->> 'desde') is null then raise exception 'ligar tem que gravar desde'; end if;
  -- recua o instante de ligar para 20 h atrás (só dentro do teste)
  update public.caca_config set valor = jsonb_build_object('ligado', true, 'desde', now() - interval '20 hours') where chave = 'avisos_auto';
  -- carimbo antigo (25 h): liberado ANTES de ligar (35 h: liberou há 23 h, antes das 20 h atrás de ligar) -> não gera. Carimbo de 14 h: liberado depois -> gera.
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '35 hours');
  perform public.caca_avisos_ciclo();
  if exists (select 1 from public.caca_aviso where chave_dedupe like 'pendente:' || id1 || ':%') then raise exception 'histórico anterior a ligar virou aviso'; end if;
  delete from public.carimbos where mapa_id = id1;
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
    values (id1, ca.participacao, ca.unidade, ca.qr, true, now() - interval '14 hours');
  perform public.caca_avisos_ciclo();
  if not exists (select 1 from public.caca_aviso where chave_dedupe like 'pendente:' || id1 || ':%') then raise exception 'carimbo liberado depois de ligar deveria gerar'; end if;
  perform public.caca_avisos_ciclo();
  if (select count(*) from public.caca_aviso where chave_dedupe like 'pendente:' || id1 || ':%') <> 1 then raise exception 'ciclo repetido duplicou'; end if;
  if array_length(public.caca_avisos_para_processar(), 1) is null then raise exception 'deveria haver push a processar'; end if;
  r := public.caca_avisos_auto_definir('x', false);
  if (r ->> 'ligado')::boolean then raise exception 'não desligou'; end if;
  if has_function_privilege('anon', 'public.caca_avisos_ciclo()', 'execute') or has_function_privilege('anon', 'public.caca_avisos_para_processar()', 'execute') then raise exception 'interna exposta'; end if;
  raise exception 'TESTE_OK';
end $t$;
