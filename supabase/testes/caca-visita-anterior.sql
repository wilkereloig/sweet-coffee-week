-- Caça aos Carimbos (migration 20261226): pedido de carimbo de visita anterior (só em 05/11, até 23h59:59 de Natal).
-- Roda DEPOIS da migration, na mesma transação, e sempre termina em exceção: TESTE_OK = passou; nada fica no banco.
-- Troca public.pode e public.caca_visita_anterior_prazo só aqui dentro (o prazo fechado é simulado).
create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

do $t$
declare
  v_chave text; v_chave2 text; v_chave3 text; r jsonb; l jsonb; v_id uuid; v_id2 uuid; v_mapa uuid; v_k uuid;
  multi record; uma record; outra record; n int; v_ant timestamptz;
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

  -- Casa com mais de uma unidade (multi), casa de uma unidade só (uma) e outra casa de uma unidade (outra).
  select pa.id participacao, pa.slug_publico slug into multi
    from public.participacoes pa
   where pa.id in (select public.caca_casas_conta('2026.2'))
     and (select count(*) from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
           where pu.participacao_id = pa.id and pu.participa) > 1
   order by pa.slug_publico limit 1;
  select pa.id participacao, pa.slug_publico slug into uma
    from public.participacoes pa
   where pa.id in (select public.caca_casas_conta('2026.2'))
     and (select count(*) from public.participacao_unidades pu where pu.participacao_id = pa.id and pu.participa) = 1
     and exists (select 1 from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
                  where pu.participacao_id = pa.id and pu.participa)
   order by pa.slug_publico limit 1;
  select pa.id participacao, pa.slug_publico slug into outra
    from public.participacoes pa
   where pa.id in (select public.caca_casas_conta('2026.2')) and pa.id <> uma.participacao and pa.id <> multi.participacao
     and (select count(*) from public.participacao_unidades pu where pu.participacao_id = pa.id and pu.participa) = 1
     and exists (select 1 from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
                  where pu.participacao_id = pa.id and pu.participa)
   order by pa.slug_publico desc limit 1;
  if multi.slug is null or uma.slug is null or outra.slug is null then raise exception 'cenário sem casas: % % %', multi.slug, uma.slug, outra.slug; end if;

  v_chave := public.mapa_criar('2026.2', 'Teste', 'visita-a@exemplo.com.br', null, false, true) ->> 'chave';
  v_chave2 := public.mapa_criar('2026.2', 'Outra', 'visita-b@exemplo.com.br', null, false, true) ->> 'chave';
  v_chave3 := public.mapa_criar('2026.2', 'Terceira', 'visita-c@exemplo.com.br', null, false, true) ->> 'chave';
  select id into v_mapa from public.mapas_lover where chave_hash = public.mapa_hash(v_chave);
  update public.mapas_lover set email_confirmado_em = now() - interval '1 hour' where email_norm in ('visita-a@exemplo.com.br', 'visita-b@exemplo.com.br');

  -- ---- prazo: aberto agora (05/11 antes das 23h59:59 de Natal) e com o instante certo
  r := public.caca_visita_anterior_prazo();
  if (r ->> 'ate')::timestamptz <> timestamptz '2026-11-06 03:00:00+00' or r ->> 'fuso' <> 'America/Fortaleza' then raise exception 'prazo ruim: %', r; end if;

  -- ---- recusas sem gravar
  if public.caca_visita_anterior_pedir('chave-errada', uma.slug, null, current_date, null) ->> 'motivo' <> 'mapa_desconhecido' then raise exception 'chave ruim'; end if;
  r := public.caca_visita_anterior_pedir(v_chave3, uma.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'email_nao_confirmado' then raise exception 'e-mail não confirmado deveria recusar: %', r; end if;
  if public.caca_visita_anterior_pedir(v_chave, 'casa-que-nao-existe', null, (now() at time zone 'America/Fortaleza')::date, null) ->> 'motivo' <> 'qr_invalido' then raise exception 'casa ruim'; end if;
  if public.caca_visita_anterior_pedir(v_chave, uma.slug, null, null, null) ->> 'motivo' <> 'data_invalida' then raise exception 'data nula'; end if;
  if public.caca_visita_anterior_pedir(v_chave, uma.slug, null, date '2026-11-04', null) ->> 'motivo' <> 'data_invalida' then raise exception 'data antes do festival'; end if;
  if public.caca_visita_anterior_pedir(v_chave, uma.slug, null, (now() at time zone 'America/Fortaleza')::date + 1, null) ->> 'motivo' <> 'data_futura' then raise exception 'data futura'; end if;
  r := public.caca_visita_anterior_pedir(v_chave, multi.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'unidade_obrigatoria' then raise exception 'casa de várias unidades exige a unidade: %', r; end if;
  r := public.caca_visita_anterior_pedir(v_chave, multi.slug, 'unidade-que-nao-existe', (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'unidade_invalida' then raise exception 'unidade inválida: %', r; end if;
  -- unidade de OUTRA casa não vale nesta
  r := public.caca_visita_anterior_pedir(v_chave, multi.slug,
    (select pu.id_publico::text from public.participacao_unidades pu where pu.participacao_id = uma.participacao and pu.participa limit 1),
    (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'unidade_invalida' then raise exception 'unidade de outra casa aceita: %', r; end if;
  select count(*) into n from public.caca_carimbo_excecao;
  if n <> 0 then raise exception 'recusa gravou pedido: %', n; end if;

  -- ---- pedido válido: pendente, não conta nada
  r := public.caca_visita_anterior_pedir(v_chave, multi.slug,
    (select pu.id_publico::text from public.participacao_unidades pu where pu.participacao_id = multi.participacao and pu.participa order by pu.ordem limit 1),
    (now() at time zone 'America/Fortaleza')::date, E'Fui   cedo\n' || chr(8203) || 'e não carimbei');
  if not (r ->> 'ok')::boolean or r ->> 'estado' <> 'pendente' then raise exception 'pedido recusado: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  if (select motivo from public.caca_carimbo_excecao where id = v_id) <> 'visita_anterior' then raise exception 'motivo'; end if;
  if (select nota from public.caca_carimbo_excecao where id = v_id) !~ '^Fui +cedo e não carimbei$' then raise exception 'nota não limpa'; end if;
  select count(*) into n from public.carimbos where mapa_id = v_mapa;
  if n <> 0 then raise exception 'pedido criou carimbo'; end if;
  if (public.mapa_ler_v2(v_chave) ->> 'casas_validadas')::int <> 0 then raise exception 'pedido contou casa'; end if;
  r := public.caca_visita_anterior_pedir(v_chave, multi.slug,
    (select pu.id_publico::text from public.participacao_unidades pu where pu.participacao_id = multi.participacao and pu.participa order by pu.ordem desc limit 1),
    (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'ja_pedido' then raise exception 'duplicado (outra unidade da mesma casa) não travou: %', r; end if;
  r := public.caca_excecao_minhas(v_chave);
  if jsonb_array_length(r -> 'pedidos') <> 1 or r -> 'pedidos' -> 0 ->> 'estado' <> 'pendente' or r -> 'pedidos' -> 0 ->> 'motivo' <> 'visita_anterior'
     or (r -> 'pedidos' -> 0) ? 'decisao_nota' or (r -> 'pedidos' -> 0) ? 'nota' then raise exception 'minhas: %', r; end if;
  if jsonb_array_length(public.caca_excecao_minhas(v_chave2) -> 'pedidos') <> 0 then raise exception 'pedido vazou para outra pessoa'; end if;

  -- ---- já tem carimbo na casa: não é visita anterior
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, origem)
  select v_mapa, outra.participacao, pu.id, q.codigo, true, 'gps'
    from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pu.participacao_id = outra.participacao and pu.participa limit 1;
  r := public.caca_visita_anterior_pedir(v_chave, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'ja_carimbou' then raise exception 'quem já carimbou a casa não pode pedir: %', r; end if;

  -- ---- painel: listar mostra a visita; contato só com relatorio.ler
  l := public.caca_excecao_listar('x', '2026.2', 'pendente');
  if (l ->> 'pendentes_visita_anterior')::int <> 1 or l -> 'itens' -> 0 ->> 'motivo' <> 'visita_anterior' or not (l -> 'itens' -> 0) ? 'visita_data'
     or (l -> 'itens' -> 0 ->> 'unidades_na_casa')::int < 2 then raise exception 'listar: %', l; end if;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select p_acao <> 'relatorio.ler' $f$;
  l := public.caca_excecao_listar('x', '2026.2', 'pendente');
  if (l -> 'itens' -> 0) ? 'email' or (l -> 'itens' -> 0) ? 'whatsapp' then raise exception 'contato vazou sem relatorio.ler'; end if;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select false $f$;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'aprovar', null); raise exception 'decidir sem permissão passou';
  exception when others then if sqlerrm <> 'nao_autorizado' then raise; end if; end;
  create or replace function public.pode(p_secret text default null, p_acao text default 'dado.ler') returns boolean language sql as $f$ select true $f$;

  -- ---- APROVAR após o corte do dia e DEPOIS do prazo: o carimbo nasce agora, sem retroagir; a consulta segue aberta
  update public.caca_carimbo_excecao set criado_em = now() - interval '6 hours' where id = v_id;
  create or replace function public.caca_visita_anterior_prazo() returns jsonb language sql stable as $f$
    select jsonb_build_object('aberto', false, 'ate', timestamptz '2026-11-06 03:00:00+00', 'fuso', 'America/Fortaleza', 'agora', now()) $f$;
  r := public.caca_visita_anterior_pedir(v_chave2, uma.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'prazo_encerrado' then raise exception 'prazo fechado deveria recusar: %', r; end if;
  select count(*) into n from public.caca_carimbo_excecao where pessoa = 'visita-b@exemplo.com.br';
  if n <> 0 then raise exception 'prazo fechado gravou pedido'; end if;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'negar', ' '); raise exception 'negar sem motivo passou';
  exception when others then if sqlerrm <> 'nota_obrigatoria' then raise; end if; end;
  v_ant := now();
  r := public.caca_excecao_decidir('x', v_id, 'aprovar', 'Conferido');
  if not (r ->> 'ok')::boolean or r ->> 'estado' <> 'aprovado' then raise exception 'aprovar depois do prazo: %', r; end if;
  v_k := (r ->> 'carimbo_id')::uuid;
  if not exists (select 1 from public.carimbos k where k.id = v_k and k.origem = 'visita_anterior' and not k.conferido and k.mapa_id = v_mapa
                    and k.participacao_id = multi.participacao and k.criado_em >= v_ant and k.anulado_em is null) then
    raise exception 'carimbo da visita anterior errado (origem/data)';
  end if;
  if not exists (select 1 from public.auditoria a where a.acao = 'carimbo.visita_anterior' and a.alvo_id = v_k::text)
     or not exists (select 1 from public.caca_evento ev where ev.acao = 'visita_anterior_aprovada') then raise exception 'sem auditoria'; end if;
  begin
    perform public.caca_excecao_decidir('x', v_id, 'aprovar', null); raise exception 'aprovou duas vezes';
  exception when others then if sqlerrm <> 'transicao_invalida' then raise; end if; end;
  -- aprovado SEM avaliação: ainda não é casa validada
  if (select (c ->> 'estado') from jsonb_array_elements(public.mapa_ler_v2(v_chave) -> 'casas') c where c ->> 'slug' = multi.slug) <> 'pendente' then
    raise exception 'sem avaliação deveria ficar pendente: %', public.mapa_ler_v2(v_chave);
  end if;
  -- avaliar DEPOIS da aprovação valida a casa
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  values ('2026.2', multi.participacao, 'Teste', 'visita-a@exemplo.com.br', '{}'::jsonb);
  if (select (c ->> 'estado') from jsonb_array_elements(public.mapa_ler_v2(v_chave) -> 'casas') c where c ->> 'slug' = multi.slug) <> 'validada' then
    raise exception 'avaliação depois da aprovação não validou: %', public.mapa_ler_v2(v_chave);
  end if;
  r := public.caca_excecao_minhas(v_chave);
  if r -> 'pedidos' -> 0 ->> 'estado' <> 'aprovado' then raise exception 'minhas depois do prazo: %', r; end if;

  -- ---- aprovação COM avaliação prévia: valida na hora
  create or replace function public.caca_visita_anterior_prazo() returns jsonb language sql stable as $f$
    select jsonb_build_object('aberto', true, 'ate', timestamptz '2026-11-06 03:00:00+00', 'fuso', 'America/Fortaleza', 'agora', now()) $f$;
  insert into public.avaliacoes (edicao_codigo, participacao_id, nome, email_norm, notas)
  values ('2026.2', uma.participacao, 'Outra', 'visita-b@exemplo.com.br', '{}'::jsonb);
  r := public.caca_visita_anterior_pedir(v_chave2, uma.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if not (r ->> 'ok')::boolean then raise exception 'pedido do mapa 2: %', r; end if;
  v_id2 := (r ->> 'id')::uuid;
  r := public.caca_excecao_decidir('x', v_id2, 'aprovar', null);
  if (select (c ->> 'estado') from jsonb_array_elements(public.mapa_ler_v2(v_chave2) -> 'casas') c where c ->> 'slug' = uma.slug) <> 'validada' then
    raise exception 'avaliação prévia + aprovação deveria validar: %', public.mapa_ler_v2(v_chave2);
  end if;

  -- ---- negar: motivo registrado, sem carimbo, a pessoa pode tentar de novo uma vez (limite 2 por casa)
  r := public.caca_visita_anterior_pedir(v_chave, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'ja_carimbou' then raise exception 'esperado ja_carimbou: %', r; end if;
  delete from public.carimbos where mapa_id = v_mapa and participacao_id = outra.participacao;
  r := public.caca_visita_anterior_pedir(v_chave, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  v_id := (r ->> 'id')::uuid;
  r := public.caca_excecao_decidir('x', v_id, 'negar', 'Sem registro da visita');
  if r ->> 'estado' <> 'negado' then raise exception 'negar: %', r; end if;
  if exists (select 1 from public.carimbos k where k.mapa_id = v_mapa and k.participacao_id = outra.participacao) then raise exception 'negar criou carimbo'; end if;
  if (select decisao_nota from public.caca_carimbo_excecao where id = v_id) <> 'Sem registro da visita' then raise exception 'motivo da negativa'; end if;
  if public.caca_excecao_minhas(v_chave) -> 'pedidos' -> 0 ? 'decisao_nota' then raise exception 'nota interna vazou'; end if;
  r := public.caca_visita_anterior_pedir(v_chave, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if not (r ->> 'ok')::boolean then raise exception 'novo pedido após negativa: %', r; end if;
  r := public.caca_excecao_decidir('x', (r ->> 'id')::uuid, 'negar', 'De novo');
  r := public.caca_visita_anterior_pedir(v_chave, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  if r ->> 'motivo' <> 'limite_pedidos' then raise exception 'limite de 2 por casa: %', r; end if;

  -- ---- a pessoa carimba a casa depois de pedir: aprovar recusa (ja_carimbou)
  r := public.caca_visita_anterior_pedir(v_chave2, outra.slug, null, (now() at time zone 'America/Fortaleza')::date, null);
  v_id2 := (r ->> 'id')::uuid;
  insert into public.carimbos (mapa_id, participacao_id, participacao_unidade_id, qr_codigo, conferido, origem, criado_em)
  select (select id from public.mapas_lover where chave_hash = public.mapa_hash(v_chave2)), outra.participacao, pu.id, q.codigo, true, 'gps', now() - interval '20 hours'
    from public.participacao_unidades pu join public.carimbo_qr q on q.participacao_unidade_id = pu.id and q.ativo
   where pu.participacao_id = outra.participacao and pu.participa limit 1;
  begin
    perform public.caca_excecao_decidir('x', v_id2, 'aprovar', null); raise exception 'aprovou visita anterior com carimbo já existente';
  exception when others then if sqlerrm <> 'ja_carimbou' then raise; end if; end;

  -- ---- o fluxo de GPS segue igual (motivo antigo e origem antiga continuam valendo)
  if public.caca_excecao_pedir(v_chave, uma.slug, 'qualquer', null, null, null, null) ->> 'motivo' <> 'motivo_invalido' then raise exception 'GPS: motivo ruim passou'; end if;
  if public.caca_excecao_pedir(v_chave, uma.slug, 'visita_anterior', null, null, null, null) ->> 'motivo' <> 'motivo_invalido' then raise exception 'visita_anterior não pode entrar pelo pedido de GPS'; end if;

  raise exception 'TESTE_OK';
end $t$;
