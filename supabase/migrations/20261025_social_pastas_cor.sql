-- ─────────────────────────────────────────────────────────────────────────────
-- Social media › Biblioteca: COR da pasta (21/10/2026, pedido do Wilker).
-- Depende de 20261019_social_pastas.sql e 20261024_social_pastas_contagem.sql.
-- Só ACRESCENTA: uma coluna opcional e as MESMAS três funções (mesma assinatura e
-- mesmo retorno) aceitando/devolvendo `cor`. Sem cor (nula) a pasta usa o acento do
-- módulo, como antes; o painel anterior continua funcionando.
--
-- A cor é uma chave da PALETA da marca (sem cor livre: contraste e coerência
-- garantidos). A lista é a mesma de `CORES_PASTA` em painel-app/src/lib/pastas.js;
-- há teste que reprova divergência.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.social_pastas add column if not exists cor text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'social_pastas_cor_check') then
    alter table public.social_pastas add constraint social_pastas_cor_check
      check (cor is null or cor in ('amarelo', 'cyan', 'laranja', 'magenta', 'roxo', 'verde', 'marrom'));
  end if;
end $$;

create or replace function public.social_pasta_criar(p_secret text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.social_pastas; v_pai uuid := nullif(p_dados->>'pai_id', '')::uuid; v_cor text := nullif(p_dados->>'cor', '');
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if v_cor is not null and v_cor not in ('amarelo', 'cyan', 'laranja', 'magenta', 'roxo', 'verde', 'marrom') then raise exception 'cor_invalida' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  if v_pai is not null then perform public.social_pasta_ativa(v_pai); end if;
  begin
    insert into public.social_pastas (pai_id, nome, edicao_codigo, participante_id, cor, criada_por_id, criada_por_rotulo)
    values (v_pai, public.social_nome_pasta(p_dados->>'nome'), nullif(p_dados->>'edicao_codigo', ''),
            nullif(p_dados->>'participante_id', '')::uuid, v_cor, auth.uid(), public.ator_rotulo_atual())
    returning * into p;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505';
  end;
  perform public.social_registrar('pasta.criada', p.id, jsonb_build_object('nome', p.nome, 'pai_id', p.pai_id, 'cor', p.cor));
  return to_jsonb(p);
end $$;

create or replace function public.social_pasta_editar(p_secret text, p_id uuid, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare antes public.social_pastas; p public.social_pastas; v_cor text := nullif(p_dados->>'cor', '');
begin
  perform public.redes_exigir(p_secret, 'redes.gerir');
  if p_dados ? 'cor' and v_cor is not null and v_cor not in ('amarelo', 'cyan', 'laranja', 'magenta', 'roxo', 'verde', 'marrom') then raise exception 'cor_invalida' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(4207191019); -- organizar é raro: uma operação de pasta por vez (sem ciclo nem destino arquivado em corrida)
  antes := public.social_pasta_ativa(p_id);
  begin
    update public.social_pastas set
      nome = case when p_dados ? 'nome' then public.social_nome_pasta(p_dados->>'nome') else nome end,
      edicao_codigo = case when p_dados ? 'edicao_codigo' then nullif(p_dados->>'edicao_codigo', '') else edicao_codigo end,
      participante_id = case when p_dados ? 'participante_id' then nullif(p_dados->>'participante_id', '')::uuid else participante_id end,
      cor = case when p_dados ? 'cor' then v_cor else cor end,
      atualizada_em = now()
     where id = p_id returning * into p;
  exception when unique_violation then raise exception 'nome_repetido' using errcode = '23505';
  end;
  perform public.social_registrar('pasta.editada', p_id, jsonb_build_object(
    'de', jsonb_build_object('nome', antes.nome, 'edicao_codigo', antes.edicao_codigo, 'participante_id', antes.participante_id, 'cor', antes.cor),
    'para', jsonb_build_object('nome', p.nome, 'edicao_codigo', p.edicao_codigo, 'participante_id', p.participante_id, 'cor', p.cor)));
  return to_jsonb(p);
end $$;

create or replace function public.social_pastas_listar(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redes_exigir(p_secret, 'redes.ver');
  return jsonb_build_object(
    'pastas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'pai_id', p.pai_id, 'nome', p.nome, 'cor', p.cor, 'edicao_codigo', p.edicao_codigo,
               'participante_id', p.participante_id, 'participante_nome', pt.nome_marca,
               'criada_em', p.criada_em, 'criada_por_rotulo', p.criada_por_rotulo, 'atualizada_em', p.atualizada_em,
               -- o que a pasta MOSTRA: arte disponível (uma por arquivo no Storage) e o resto disponível
               'n_itens', (select count(*) from (
                             select 'arte:' || a.path as k
                               from public.social_biblioteca_pasta_item i
                               join public.redes_arquivos a on i.tipo = 'arte' and a.id = i.item_id and a.bucket = 'redes' and a.removido_em is null
                              where i.pasta_id = p.id
                             union
                             select i.tipo || ':' || i.item_id::text
                               from public.social_biblioteca_pasta_item i
                              where i.pasta_id = p.id and i.tipo <> 'arte' and public.social_item_disponivel(i.tipo, i.item_id)) z),
               -- a conta bruta (inclui apagadas): é ela que decide se arquivar a pasta pede confirmação
               'n_itens_todos', (select count(*) from public.social_biblioteca_pasta_item i where i.pasta_id = p.id),
               'n_pastas', (select count(*) from public.social_pastas f where f.pai_id = p.id and f.arquivada_em is null))
             order by lower(p.nome))
        from public.social_pastas p left join public.participantes pt on pt.id = p.participante_id
       where p.arquivada_em is null), '[]'::jsonb),
    'pode_organizar', public.pode(p_secret, 'redes.gerir'));
end $$;
