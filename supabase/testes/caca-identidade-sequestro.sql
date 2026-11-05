-- Caça aos Carimbos, cenário "atacante primeiro" de ponta a ponta (migrations 20261216 e 20261220; achados SEC-01, SEC-03, SEC-07, E2E-2).
-- Roda DEPOIS das migrations, numa transação, e SEMPRE termina em exceção: TESTE_OK = passou; nada fica no banco.
-- Cobre o que caca-identidade-verificada.sql não cobre: e-mail entregável, enchimento do caminho "sem mapa", recuperar em disputa, ranking,
-- grupos, e-mail confirmado/prêmio e apagar o mapa com um mapa de invasor vivo (herança de grupo e registro de prêmio).
do $t$
declare
  ed constant text := '2026.2';
  em constant text := 'vitima@exemplo.com.br';
  ca record; ka text; kv text; kz text; kb text; r jsonb; r2 jsonb; id_a uuid; id_v uuid; gid uuid; e text; v_erro text; n int; pad0 int;
begin
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  select distinct on (pa.id) pa.id participacao, pu.id unidade, q.codigo qr, pa.slug_publico slug into ca
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = ed and pa.status_cadastro <> 'encerrado' order by pa.id limit 1;
  if ca.participacao is null then raise exception 'falta casa com QR'; end if;

  -- ===== SEC-07: só endereço entregável cria mapa e recebe código (o valor vai ao campo "to" do provedor)
  foreach e in array array['a,b@exemplo.com.br', 'a"b@exemplo.com.br', '<a>@exemplo.com.br', 'a b@exemplo.com.br', 'a;b@exemplo.com.br',
                           'a@exemplo.com.br,x@y.com', 'joão@exemplo.com.br', 'a@@exemplo.com.br', 'a@exemplo'] loop
    begin
      perform public.mapa_criar_v2(ed, 'X', e, null, false, true);
      v_erro := 'criou';
    exception when others then v_erro := sqlerrm; end;
    if v_erro is distinct from 'email_invalido' then raise exception 'mapa_criar_v2 com "%" deveria dar email_invalido, deu %', e, v_erro; end if;
    if (public.mapa_codigo_emitir_interno(ed, e, 'recuperar', null, null) ->> 'enviar')::boolean then raise exception 'emitiu código para "%"', e; end if;
  end loop;
  perform public.mapa_criar_v2(ed, 'Com mais', 'ana.maria+caca@exemplo.com.br', null, false, true);   -- ponto e + continuam valendo
  if exists (select 1 from public.mapas_lover where email_norm like '%,%' or email_norm like '%<%') then raise exception 'mapa com e-mail estranho'; end if;

  -- ===== SEC-07: sem mapa responde igual e faz trabalho de enchimento; o limite também independe de existir mapa
  select count(*) into pad0 from public.mapa_codigo_pedido where email_hash like 'pad:%';
  r := public.mapa_codigo_emitir_interno(ed, 'ninguem@exemplo.com.br', 'recuperar', null, null);
  if r <> jsonb_build_object('ok', true, 'enviar', false) then raise exception 'sem mapa: %', r; end if;
  if (select count(*) from public.mapa_codigo_pedido where email_hash like 'pad:%') <> pad0 + 1 then raise exception 'falta o enchimento no caminho sem mapa'; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'ninguem@exemplo.com.br', 'recuperar', null, null);
  if coalesce((r ->> 'limitado')::boolean, false) is not true then raise exception 'sem mapa: o limite por minuto deveria valer igual: %', r; end if;
  kb := public.mapa_criar_v2(ed, 'Bia', 'bia@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.mapa_codigo_emitir_interno(ed, 'bia@exemplo.com.br', 'recuperar', null, null);
  if not (r ->> 'enviar')::boolean then raise exception 'com mapa deveria emitir: %', r; end if;
  r := public.mapa_codigo_emitir_interno(ed, 'bia@exemplo.com.br', 'recuperar', null, null);
  if coalesce((r ->> 'limitado')::boolean, false) is not true then raise exception 'com mapa: o limite por minuto deveria valer igual: %', r; end if;

  -- ===== SEC-01: o invasor cria o mapa ANTES da vítima
  ka := public.mapa_criar_v2(ed, 'Atacante', em, null, true, true) ->> 'chave';
  select id into id_a from public.mapas_lover where chave_hash = public.mapa_hash(ka);
  update public.mapas_lover set criado_em = now() - interval '2 days' where id = id_a;
  kv := public.mapa_criar_v2(ed, 'Vitima', em, '85999990001', true, true) ->> 'chave';
  select id into id_v from public.mapas_lover where chave_hash = public.mapa_hash(kv);
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, criado_em)
  values (id_v, ca.participacao, ca.unidade, ca.qr, true, now() - interval '5 hours');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas, criado_em)
  values (ed, ca.participacao, 'Teste', em, '{}'::jsonb, now() - interval '4 hours');

  -- em disputa: ninguém é principal; cada mapa lê só os seus carimbos; fora do ranking, dos grupos e do prêmio
  if public.caca_mapa_principal(ed, em) is not null then raise exception 'disputa: não deveria haver principal'; end if;
  r := public.mapa_ler_v2(ka);
  if (r ->> 'principal')::boolean is not false or jsonb_array_length(r -> 'casas') <> 0 or (r ->> 'casas_validadas')::int <> 0 or r ->> 'posicao' is not null
    then raise exception 'o invasor enxergou a vítima: %', r; end if;
  r := public.mapa_ler_v2(kv);
  if (r ->> 'principal')::boolean is not false or jsonb_array_length(r -> 'casas') <> 1 or (r ->> 'casas_validadas')::int <> 1 or r ->> 'posicao' is not null
    then raise exception 'a vítima em disputa deveria ver só os próprios carimbos, sem posição: %', r; end if;
  if exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = em) then raise exception 'disputa no placar'; end if;
  if exists (select 1 from public.caca_ranking_v2(ed) p where p.pessoa = em) then raise exception 'disputa no ranking'; end if;
  if public.caca_premio_email_ok(ed, em) then raise exception 'disputa: prêmio exige e-mail confirmado'; end if;
  if public.caca_grupo_criar(ka, 'Grupo do invasor', true) ->> 'motivo' is distinct from 'negado' then raise exception 'invasor criou grupo'; end if;
  if public.caca_grupo_criar(kv, 'Grupo da vítima', true) ->> 'motivo' is distinct from 'negado' then raise exception 'vítima em disputa criou grupo'; end if;

  -- RECUPERAR em disputa: a chave nova é do mapa que tem os carimbos (o da vítima), não do mais antigo (o do invasor)
  r := public.mapa_codigo_emitir_interno(ed, em, 'recuperar', null, null);
  if not (r ->> 'enviar')::boolean or r ->> 'apelido' is distinct from 'Vitima' then raise exception 'recuperar deveria ir ao mapa com carimbos: %', r; end if;
  r2 := public.mapa_codigo_validar(ed, em, r ->> 'codigo', 'recuperar', null);
  if not (r2 ->> 'ok')::boolean or r2 ->> 'apelido' is distinct from 'Vitima' then raise exception 'recuperar: %', r2; end if;
  if public.mapa_ler_v2(kv) is not null then raise exception 'a chave antiga da vítima deveria ter girado'; end if;
  kv := r2 ->> 'chave';
  if public.caca_mapa_principal(ed, em) is distinct from id_v then raise exception 'a vítima (confirmada pela recuperação) deveria ser a principal'; end if;
  if not public.caca_premio_email_ok(ed, em) then raise exception 'e-mail confirmado pela recuperação'; end if;
  r := public.mapa_ler_v2(kv);
  if not (r ->> 'principal')::boolean or (r ->> 'casas_validadas')::int <> 1 or (r ->> 'posicao')::int <> 1 then raise exception 'vítima confirmada: %', r; end if;
  r := public.mapa_ler_v2(ka);
  if (r ->> 'principal')::boolean or jsonb_array_length(r -> 'casas') <> 0 or r ->> 'posicao' is not null then raise exception 'o invasor ainda enxerga: %', r; end if;
  if not exists (select 1 from public.caca_placar_v2(ed) p where p.pessoa = em and p.apelido = 'Vitima' and p.mapa_id = id_v and p.casas = 1)
    then raise exception 'o ranking deveria mostrar o apelido da vítima'; end if;
  if exists (select 1 from public.caca_ranking_v2(ed) p where p.apelido = 'Atacante') then raise exception 'apelido do invasor no ranking'; end if;
  -- 'confirmado' é da PESSOA (do principal); o mapa do invasor só não é o principal
  if (public.mapa_confirmar_email_status(ka) ->> 'principal')::boolean or not (public.mapa_confirmar_email_status(kv) ->> 'principal')::boolean
    then raise exception 'só o mapa confirmado da vítima é o principal'; end if;

  -- grupos: a vítima cria; outra pessoa entra; o invasor não lê nem entra com o mapa dele
  r := public.caca_grupo_criar(kv, 'Grupo da vítima', true);
  if not (r ->> 'ok')::boolean then raise exception 'vítima não criou grupo: %', r; end if;
  gid := (r ->> 'grupo_id')::uuid;
  kz := public.mapa_criar_v2(ed, 'Zeca', 'zeca@exemplo.com.br', null, false, true) ->> 'chave';
  r2 := public.caca_grupo_entrar(kz, r ->> 'convite_token', true);
  if not (r2 ->> 'ok')::boolean then raise exception 'Zeca não entrou: %', r2; end if;
  if (public.caca_grupo_ler(ka, gid) ->> 'ok')::boolean then raise exception 'o invasor leu o grupo da vítima'; end if;
  if (public.caca_grupo_entrar(ka, r ->> 'convite_token', true) ->> 'ok')::boolean then raise exception 'o invasor entrou no grupo (não é principal)'; end if;

  -- prêmio já sorteado: o registro fica quando o mapa é apagado (regulamento)
  insert into public.caca_premio (edicao_codigo, tipo, dia, pessoa, mapa_id, apelido, posicao, estado)
  values (ed, 'voucher_dia', current_date, em, id_v, 'Vitima', 1, 'selecionado');

  -- ===== E2E-2 / SEC-01: a vítima apaga o PRÓPRIO mapa; o mapa não confirmado do invasor não herda grupo nem posse
  if not public.mapa_apagar(kv) then raise exception 'mapa_apagar devolveu false'; end if;
  if exists (select 1 from public.caca_grupo_membro where pessoa = em) then raise exception 'sobrou integrante com o e-mail da vítima'; end if;
  if not exists (select 1 from public.caca_grupo_membro where grupo_id = gid and pessoa = 'zeca@exemplo.com.br' and papel = 'dono' and saiu_em is null)
    then raise exception 'a posse deveria passar a Zeca'; end if;
  if (public.caca_grupo_ler(ka, gid) ->> 'ok')::boolean then raise exception 'o invasor herdou o grupo da vítima'; end if;
  if not exists (select 1 from public.caca_premio where pessoa = em and mapa_id = id_v and estado = 'selecionado') then raise exception 'o registro de prêmio deveria ficar'; end if;
  if exists (select 1 from public.carimbos where mapa_id = id_v) or exists (select 1 from public.mapas_lover where id = id_v) then raise exception 'sobrou mapa ou carimbo da vítima'; end if;
  r := public.mapa_ler_v2(ka);
  if jsonb_array_length(r -> 'casas') <> 0 or (r ->> 'casas_validadas')::int <> 0 then raise exception 'o invasor viu carimbo depois que a vítima apagou: %', r; end if;

  -- com OUTRO mapa confirmado do mesmo e-mail a pessoa segue no grupo (apagar o mapa não confirmado não a tira)
  kv := public.mapa_criar_v2(ed, 'Dois A', 'dois@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.caca_grupo_criar(kv, 'Grupo de dois', true);
  gid := (r ->> 'grupo_id')::uuid;
  kb := public.mapa_criar_v2(ed, 'Dois B', 'dois@exemplo.com.br', null, false, true) ->> 'chave';
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where chave_hash = public.mapa_hash(kb);
  perform public.mapa_apagar(kv);
  if not exists (select 1 from public.caca_grupo_membro where grupo_id = gid and pessoa = 'dois@exemplo.com.br') then raise exception 'com outro mapa confirmado a pessoa fica no grupo'; end if;
  -- mas se o outro mapa NÃO é confirmado, ela sai (ele poderia ser de outra pessoa) e o grupo vazio some
  kv := public.mapa_criar_v2(ed, 'Tres A', 'tres@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.caca_grupo_criar(kv, 'Grupo de tres', true);
  gid := (r ->> 'grupo_id')::uuid;
  perform public.mapa_criar_v2(ed, 'Tres B', 'tres@exemplo.com.br', null, false, true);
  perform public.mapa_apagar(kv);
  if exists (select 1 from public.caca_grupo_membro where pessoa = 'tres@exemplo.com.br') or exists (select 1 from public.caca_grupo where id = gid)
    then raise exception 'sem mapa confirmado restante a pessoa deveria sair do grupo, e o grupo vazio sumir'; end if;

  -- grants: validar aberta, emitir só do service_role, mapa_apagar e mapa_criar_v2 chamáveis pelo visitante
  if not has_function_privilege('anon', 'public.mapa_codigo_validar(text,text,text,text,text)', 'execute') then raise exception 'validar sem grant'; end if;
  if has_function_privilege('anon', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute')
     or has_function_privilege('anon', 'public.caca_mapa_principal(text,text)', 'execute') then raise exception 'função interna aberta'; end if;
  if not has_function_privilege('service_role', 'public.mapa_codigo_emitir_interno(text,text,text,text,text)', 'execute') then raise exception 'service_role sem emitir'; end if;
  if not has_function_privilege('anon', 'public.mapa_apagar(text)', 'execute') or not has_function_privilege('anon', 'public.mapa_criar_v2(text,text,text,text,boolean,boolean)', 'execute')
    then raise exception 'visitante sem apagar/criar'; end if;

  raise exception 'TESTE_OK';
end $t$;
