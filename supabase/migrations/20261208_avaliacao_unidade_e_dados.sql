-- Avaliação Cartoon: (1) servidor exige a unidade quando a casa tem mais de uma; (2) leitura de TODOS os dados para a organização exportar.
-- Reversão: recriar submit_avaliacao a partir de 20261014_cartoon_04_avaliacao.sql e `drop function public.get_avaliacoes_dados(text,text)`.
-- A apuração (pesos, mínimo, desempate) é da organização: aqui só se registra e se entrega o dado cru.

create or replace function public.submit_avaliacao(p_edicao text, p_slug text, p_unidade text, p_nome text, p_email text,
                                                   p_notas jsonb, p_comentario text, p_aceita_novidades boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_c public.edicao_publicacao%rowtype; v_pa uuid; v_pu uuid; v_email text := lower(btrim(p_email)); k text; v int;
  v_existia boolean;
begin
  select * into v_c from public.edicao_publicacao where edicao_codigo = p_edicao;
  if v_c.edicao_codigo is null or not v_c.avaliacao_aberta then raise exception 'avaliacao_fechada'; end if;
  if now() < v_c.avaliacao_abre_em then raise exception 'avaliacao_nao_aberta'; end if;
  if now() > v_c.avaliacao_fecha_em then raise exception 'avaliacao_encerrada'; end if;

  select pa.id into v_pa from public.participacoes pa
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado'
     and (pa.slug_publico = p_slug or exists (select 1 from public.participacao_slug_aliases a
                                               where a.edicao_codigo = p_edicao and a.slug = p_slug and a.participacao_id = pa.id))
     and exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente and pb.nivel = 'marca_e_combo');
  if v_pa is null then raise exception 'participante_inelegivel'; end if;
  if nullif(btrim(p_unidade), '') is not null then
    select id into v_pu from public.participacao_unidades where participacao_id = v_pa and id_publico = btrim(p_unidade) and participa;
    if v_pu is null then raise exception 'unidade_inelegivel'; end if;
  elsif (select count(*) from public.participacao_unidades where participacao_id = v_pa and participa) > 1 then
    -- casa com várias unidades: o servidor também exige a unidade (antes só o formulário exigia)
    raise exception 'unidade_obrigatoria';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'email_invalido'; end if;
  if char_length(btrim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_invalido'; end if;
  if jsonb_typeof(p_notas) <> 'object' then raise exception 'notas_invalidas'; end if;
  -- Todas as chaves e só as chaves da edição, cada nota inteira dentro da escala.
  if (select count(*) from jsonb_object_keys(p_notas)) <> (select count(*) from public.edicao_criterios where edicao_codigo = p_edicao) then
    raise exception 'notas_incompletas';
  end if;
  for k in select jsonb_object_keys(p_notas) loop
    if jsonb_typeof(p_notas -> k) <> 'number' then raise exception 'nota_invalida'; end if;
    v := (p_notas ->> k)::int;
    if (p_notas ->> k)::numeric <> v or not exists (select 1 from public.edicao_criterios c
         where c.edicao_codigo = p_edicao and c.chave = k and v between c.minimo and c.maximo) then
      raise exception 'nota_invalida';
    end if;
  end loop;

  select exists (select 1 from public.avaliacoes where edicao_codigo = p_edicao and participacao_id = v_pa and email_norm = v_email) into v_existia;
  insert into public.avaliacoes (edicao_codigo, participacao_id, participacao_unidade_id, nome, email_norm, notas, comentario, aceita_novidades)
  values (p_edicao, v_pa, v_pu, left(btrim(p_nome), 120), v_email, p_notas, nullif(left(btrim(coalesce(p_comentario, '')), 600), ''),
          coalesce(p_aceita_novidades, false))
  on conflict (edicao_codigo, participacao_id, email_norm) do update set
    participacao_unidade_id = excluded.participacao_unidade_id, nome = excluded.nome, notas = excluded.notas,
    comentario = excluded.comentario, aceita_novidades = excluded.aceita_novidades,
    substituicoes = public.avaliacoes.substituicoes + 1, atualizado_em = now();
  return jsonb_build_object('ok', true, 'substituiu', v_existia);
end $$;
revoke all on function public.submit_avaliacao(text, text, text, text, text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_avaliacao(text, text, text, text, text, jsonb, text, boolean) to service_role;

-- Dados individuais SEM nome nem e-mail (relatorio.ler). A organização exporta e decide a apuração.
create or replace function public.get_avaliacoes_dados(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'relatorio.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_agg(x order by x ->> 'casa', x ->> 'criado_em'), '[]'::jsonb) from (
    select jsonb_build_object('casa', pt.nome_marca, 'slug', pa.slug_publico, 'unidade', coalesce(u.nome_unidade, pu.id_publico),
             'notas', av.notas, 'comentario', av.comentario, 'substituicoes', av.substituicoes,
             'criado_em', av.criado_em, 'atualizado_em', av.atualizado_em) x
      from public.avaliacoes av
      join public.participacoes pa on pa.id = av.participacao_id
      join public.participantes pt on pt.id = pa.participante_id
      left join public.participacao_unidades pu on pu.id = av.participacao_unidade_id
      left join public.unidades u on u.id = pu.unidade_id
     where av.edicao_codigo = p_edicao) s);
end $$;
revoke all on function public.get_avaliacoes_dados(text, text) from public, anon, authenticated;
grant execute on function public.get_avaliacoes_dados(text, text) to anon, authenticated;
