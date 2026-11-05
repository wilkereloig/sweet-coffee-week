-- Caça aos Carimbos (migration 20261214): pedido de revisão de presença. Roda DEPOIS da migration, na mesma transação, e sempre
-- termina em exceção: TESTE_OK = passou; nada fica no banco. Liga a janela, publica as casas e troca public.pode só aqui dentro.
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  v_chave text; v_chave2 text; r jsonb; l jsonb; v_id uuid; v_id2 uuid; v_mapa uuid; a record; b record; sem record; n int; v_ok boolean; v_chave3 text; v_chave4 text; v_mapa3 uuid;
begin
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, vigente)
  select distinct pa.id, 999, 'marca_e_combo', '{}'::jsonb, true
    from public.participacoes pa join public.participacao_unidades pu on pu.participacao_id = pa.id and pu.participa
    join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pa.edicao_codigo = '2026.2' and pa.status_cadastro <> 'encerrado'
     and not exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente);
  update public.publicacoes set nivel = 'marca_e_combo' where vigente;
  update public.edicao_publicacao set fase = 'em_andamento', avaliacao_abre_em = now() - interval '1 day',
         avaliacao_fecha_em = now() + interval '1 day', avaliacao_aberta = true where edicao_codigo = '2026.2';

  -- Duas casas com ponto conferido (A, B) e uma sem nenhum (sem).
  select pa.id participacao, pa.slug_publico slug, u.lat, u.lng into a
    from public.carimbo_qr q join public.participacao_unidades pu on pu.id = q.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id and pa.edicao_codigo = '2026.2'
    join public.unidades u on u.id = pu.unidade_id and u.lat is not null and u.coordenada_verificada_em is not null
   where q.ativo order by pa.slug_publico limit 1;
  select pa.id participacao, pa.slug_publico slug, u.lat, u.lng into b
    from public.carimbo_qr q join public.participacao_unidades pu on pu.id = q.participacao_unidade_id and pu.participa
    join public.participacoes pa on pa.id = pu.participacao_id and pa.edicao_codigo = '2026.2' and pa.id <> a.participacao
    join public.unidades u on u.id = pu.unidade_id and u.lat is not null and u.coordenada_verificada_em is not null
   where q.ativo order by pa.slug_publico desc limit 1;
  select pa.id participacao, pa.slug_publico slug into sem
    from public.participacoes pa
   where pa.edicao_codigo = '2026.2' and pa.status_cadastro <> 'encerrado'
     and exists (select 1 from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
                  where pu.participacao_id = pa.id and pu.participa)
     and not exists (select 1 from public.participacao_unidades pu join public.unidades u on u.id = pu.unidade_id
                      where pu.participacao_id = pa.id and pu.participa and u.coordenada_verificada_em is not null and u.lat is not null)
   limit 1;
  if a.slug is null or b.slug is null or sem.slug is null then raise exception 'cenário sem casas A/B/sem: % % %', a.slug, b.slug, sem.slug; end if;

  v_chave := public.mapa_criar('2026.2', 'Teste', 'teste-gps@exemplo.com.br', null, false, true) ->> 'chave';
  v_chave2 := public.mapa_criar('2026.2', 'Outra', 'outra-gps@exemplo.com.br', null, false, true) ->> 'chave';
  select id into v_mapa from public.mapas_lover where chave_hash = public.mapa_hash(v_chave);
  -- 20261217: o pedido exige e-mail confirmado do mapa principal.
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where email_norm in ('teste-gps@exemplo.com.br', 'outra-gps@exemplo.com.br');

  -- ---- recusas sem gravar
  if public.caca_excecao_pedir('chave-errada', a.slug, 'longe', null, null, null, null) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'chave ruim'; end if;
  if public.caca_excecao_pedir(v_chave, a.slug, 'qualquer', null, null, null, null) ->> 'motivo' <> 'motivo_invalido' then raise exception 'motivo ruim'; end if;
  if public.caca_excecao_pedir(v_chave, 'casa-que-nao-existe', 'longe', null, null, null, null) ->> 'motivo' <> 'qr_invalido' then raise exception 'casa ruim'; end if;
  update public.caca_config set valor = '"conta"'::jsonb where chave = 'carimbo_sem_ponto';
  r := public.caca_excecao_pedir(v_chave, sem.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'nao_precisa' then raise exception 'casa sem ponto conferido deveria carimbar normal: %', r; end if;
  update public.caca_config set valor = '"revisao"'::jsonb where chave = 'carimbo_sem_ponto';
  r := public.caca_excecao_pedir(v_chave, a.slug, 'longe', a.lat, a.lng, 15, null);
  if r ->> 'motivo' <> 'nao_precisa' then raise exception 'celular no raio deveria carimbar normal: %', r; end if;
  update public.edicao_publicacao set avaliacao_aberta = false where edicao_codigo = '2026.2';
  r := public.caca_excecao_pedir(v_chave, a.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'nao_aberta' then raise exception 'janela fechada: %', r; end if;
  update public.edicao_publicacao set avaliacao_aberta = true where edicao_codigo = '2026.2';
  select count(*) into n from public.caca_carimbo_excecao;
  if n <> 0 then raise exception 'recusa gravou pedido: %', n; end if;

  -- ---- pedido valido: pendente, não conta nada, guarda só distância/precisão
  r := public.caca_excecao_pedir(v_chave, a.slug, 'longe', a.lat + 0.02, a.lng, 40, E'Estou   no\nbalc' || chr(8203) || E'ão' || chr(8238));   -- 20261217: invisivel/bidi saem da nota
  if not (r ->> 'ok')::boolean or r ->> 'estado' <> 'pendente' then raise exception 'pedido recusado: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  select count(*) into n from public.carimbos where mapa_id = v_mapa;
  if n <> 0 then raise exception 'pedido criou carimbo'; end if;
  if (select distancia_m from public.caca_carimbo_excecao where id = v_id) < 1500 then raise exception 'distância não calculada pelo servidor'; end if;
  if (select nota from public.caca_carimbo_excecao where id = v_id) !~ '^Estou +no balcão$' then raise exception 'nota não limpa'; end if;
  r := public.caca_excecao_pedir(v_chave, a.slug, 'longe', a.lat + 0.02, a.lng, 40, null);
  if r ->> 'motivo' <> 'ja_pedido' then raise exception '1 por casa/12 h não travou: %', r; end if;
  r := public.caca_excecao_minhas(v_chave);
  if jsonb_array_length(r -> 'pedidos') <> 1 or r -> 'pedidos' -> 0 ->> 'estado' <> 'pendente' or (r -> 'pedidos' -> 0) ? 'decisao_nota' then raise exception 'minhas: %', r; end if;
  if jsonb_array_length(public.caca_excecao_minhas(v_chave2) -> 'pedidos') <> 0 then raise exception 'pedido vazou para outra pessoa'; end if;

  -- ---- painel: listar (contato só com relatorio.ler)
  l := public.caca_excecao_listar('x', '2026.2');
  if (l ->> 'pendentes')::int <> 1 or jsonb_array_length(l -> 'itens') <> 1 or not (l -> 'itens' -> 0) ? 'email' then raise exception 'listar: %', l; end if;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_acao <> 'relatorio.ler' $f$;
  l := public.caca_excecao_listar('x', '2026.2', 'pendente');
  if (l -> 'itens' -> 0) ? 'email' or (l -> 'itens' -> 0) ? 'whatsapp' then raise exception 'contato vazou sem relatorio.ler: %', l; end if;
  begin
    perform public.caca_excecao_listar('x', '2026.2', 'lixo'); raise exception 'estado ruim aceito';
  exception when others then if sqlerrm <> 'parametro_invalido' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select false $f$;
  begin
    perform public.caca_excecao_listar('x', '2026.2'); raise exception 'listar sem permissão passou';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'aprovar', null); raise exception 'decidir sem permissão passou';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

  -- ---- decidir: negar exige motivo; aprovar cria o carimbo
  begin
    perform public.caca_excecao_decidir('x', v_id, 'negar', '  '); raise exception 'negar sem motivo passou';
  exception when others then if sqlerrm <> 'nota_obrigatoria' then raise; end if; end;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'talvez', null); raise exception 'decisão ruim aceita';
  exception when others then if sqlerrm <> 'parametro_invalido' then raise; end if; end;
  r := public.caca_excecao_decidir('x', v_id, 'aprovar', 'Conferido com a loja');
  if not (r ->> 'ok')::boolean or r ->> 'estado' <> 'aprovado' then raise exception 'aprovar: %', r; end if;
  if not exists (select 1 from public.carimbos k where k.id = (r ->> 'carimbo_id')::uuid and k.origem = 'excecao_painel' and not k.conferido
                    and k.mapa_id = v_mapa and k.participacao_id = a.participacao and k.anulado_em is null) then raise exception 'carimbo da exceção errado'; end if;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'aprovar', null); raise exception 'decidir duas vezes';
  exception when others then if sqlerrm <> 'transicao_invalida' then raise; end if; end;
  -- Depois da avaliação, o carimbo da exceção vale no progresso.
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  values ('2026.2', a.participacao, 'Teste', 'teste-gps@exemplo.com.br', '{}'::jsonb);
  if (public.mapa_ler_v2(v_chave) ->> 'casas_validadas')::int <> 1 then raise exception 'exceção aprovada não validou a casa: %', public.mapa_ler_v2(v_chave); end if;
  r := public.caca_excecao_pedir(v_chave, a.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'cedo' then raise exception '12 h do carimbo não valem no pedido: %', r; end if;
  if public.caca_excecao_minhas(v_chave) -> 'pedidos' -> 0 ->> 'estado' <> 'aprovado' then raise exception 'minhas aprovado'; end if;

  -- ---- negar registra o motivo e não cria carimbo
  r := public.caca_excecao_pedir(v_chave, b.slug, 'sem_localizacao', null, null, null, null);
  v_id2 := (r ->> 'id')::uuid;
  r := public.caca_excecao_decidir('x', v_id2, 'negar', 'Sem sinal de presença');
  if r ->> 'estado' <> 'negado' then raise exception 'negar: %', r; end if;
  if exists (select 1 from public.carimbos k where k.mapa_id = v_mapa and k.participacao_id = b.participacao) then raise exception 'negar criou carimbo'; end if;
  if (select decisao_nota from public.caca_carimbo_excecao where id = v_id2) <> 'Sem sinal de presença' then raise exception 'motivo da negativa'; end if;
  r := public.caca_excecao_pedir(v_chave, b.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'ja_pedido' then raise exception 'negado deve esperar 12 h: %', r; end if;

  -- ---- aprovar respeita as 12 h do carimbo que apareceu depois do pedido
  r := public.caca_excecao_pedir(v_chave2, b.slug, 'sem_localizacao', null, null, null, null);
  v_id2 := (r ->> 'id')::uuid;
  r := public.mapa_carimbar_casa(v_chave2, b.slug, b.lat, b.lng, 10);
  if not (r ->> 'ok')::boolean then raise exception 'carimbo normal recusou: %', r; end if;
  begin
    perform public.caca_excecao_decidir('x', v_id2, 'aprovar', null); raise exception 'aprovar ignorou as 12 h';
  exception when others then if sqlerrm <> 'cedo' then raise; end if; end;
  -- ... e a janela fechada.
  update public.edicao_publicacao set avaliacao_aberta = false where edicao_codigo = '2026.2';
  begin
    perform public.caca_excecao_decidir('x', v_id2, 'aprovar', null); raise exception 'aprovar com janela fechada';
  exception when others then if sqlerrm <> 'nao_aberta' then raise; end if; end;
  update public.edicao_publicacao set avaliacao_aberta = true where edicao_codigo = '2026.2';

  -- ---- limites: 5 pendentes por pessoa
  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, motivo)
  select '2026.2', (select id from public.mapas_lover where chave_hash = public.mapa_hash(v_chave2)), 'outra-gps@exemplo.com.br', sem.participacao, 'longe'
    from generate_series(1, 4);
  r := public.caca_excecao_pedir(v_chave2, a.slug, 'longe', null, null, null, null);
  if r ->> 'motivo' <> 'muitos_pendentes' then raise exception '5 pendentes não travou: %', r; end if;

  -- ---- resumo e auditoria
  l := public.caca_gps_resumo('x', '2026.2');
  if (l ->> 'total')::int <> 1 or (l ->> 'excecao_painel')::int <> 1 or (l ->> 'contam')::int <> 1 or jsonb_array_length(l -> 'por_dia') <> 1
     or (l ->> 'pedidos_pendentes')::int <> 5 then raise exception 'resumo: %', l; end if;
  select count(*) into n from public.caca_evento where acao in ('excecao_pedida', 'excecao_aprovada', 'excecao_negada');
  if n < 4 then raise exception 'auditoria incompleta: %', n; end if;
  if not exists (select 1 from public.caca_evento where acao = 'excecao_aprovada' and nota = 'Conferido com a loja') then raise exception 'evento da aprovação sem nota'; end if;

  -- ---- 20261217: casa SEM ponto conferido (modo revisao): o QR sozinho não carimba; o pedido é decidido pela organização e vale
  v_chave3 := public.mapa_criar_v2('2026.2', 'Terceira', 'terceira-gps@exemplo.com.br', null, false, true) ->> 'chave';
  select id into v_mapa3 from public.mapas_lover where chave_hash = public.mapa_hash(v_chave3);
  r := public.caca_excecao_pedir(v_chave3, sem.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'email_nao_confirmado' then raise exception 'e-mail não confirmado pediu: %', r; end if;
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where id = v_mapa3;
  r := public.mapa_carimbar(v_chave3, (select cq.codigo from public.carimbo_qr cq join public.participacao_unidades pu on pu.id = cq.participacao_unidade_id
                                        where pu.participacao_id = sem.participacao and cq.ativo limit 1), null, null, null);
  if r ->> 'motivo' <> 'sem_ponto' then raise exception 'QR sozinho carimbou casa sem ponto: %', r; end if;
  r := public.caca_excecao_pedir(v_chave3, sem.slug, 'sem_localizacao', null, null, null, null);
  if not (r ->> 'ok')::boolean then raise exception 'pedido de casa sem ponto recusado: %', r; end if;
  r := public.caca_excecao_decidir('x', (r ->> 'id')::uuid, 'aprovar', 'Conferido com a loja (casa sem ponto)');
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  values ('2026.2', sem.participacao, 'Teste', 'terceira-gps@exemplo.com.br', '{}'::jsonb);
  if (public.mapa_ler_v2(v_chave3) ->> 'casas_validadas')::int <> 1 then raise exception 'exceção em casa sem ponto não contou: %', public.mapa_ler_v2(v_chave3); end if;
  -- mapa que não é o principal (mesmo e-mail) não pede
  v_chave4 := public.mapa_criar_v2('2026.2', 'Terceira2', 'terceira-gps@exemplo.com.br', null, false, true) ->> 'chave';
  r := public.caca_excecao_pedir(v_chave4, b.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'email_nao_confirmado' then raise exception 'mapa que não é o principal pediu: %', r; end if;
  -- fila cheia é POR CASA (20 pendentes): a casa lotada recusa, outra casa segue aceitando
  insert into public.caca_carimbo_excecao (edicao_codigo, mapa_id, pessoa, participacao_id, motivo)
  select '2026.2', v_mapa3, 'lixo' || g || '@exemplo.com.br', b.participacao, 'longe' from generate_series(1, 20) g;
  r := public.caca_excecao_pedir(v_chave3, b.slug, 'sem_localizacao', null, null, null, null);
  if r ->> 'motivo' <> 'fila_cheia' then raise exception 'casa lotada deveria recusar com fila_cheia: %', r; end if;

  -- ---- acesso: tabela fechada e RPCs expostas
  if has_table_privilege('anon', 'public.caca_carimbo_excecao', 'select') or has_table_privilege('authenticated', 'public.caca_carimbo_excecao', 'select') then
    raise exception 'tabela aberta'; end if;
  if has_function_privilege('anon', 'public.caca_excecao_unidade(uuid,numeric,numeric)', 'execute') then raise exception 'utilitário interno exposto'; end if;
  if not has_function_privilege('anon', 'public.caca_excecao_pedir(text,text,text,numeric,numeric,numeric,text)', 'execute') then raise exception 'pedir não exposto'; end if;
  if not exists (select 1 from pg_trigger g where g.tgname = 'sync_caca_carimbo_excecao' and not g.tgisinternal) then raise exception 'sinal ausente'; end if;

  raise exception 'TESTE_OK';
end $t$;
