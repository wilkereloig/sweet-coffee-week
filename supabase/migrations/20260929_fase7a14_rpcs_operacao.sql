-- =============================================================================
-- Fases 4, 7, 9, 10, 12, 13 e 14 da evolução do painel — as portas do banco
-- (docs/EVOLUCAO-PAINEL-2026-09.md). A tela vem depois; o contrato vem antes.
--
-- Toda função da organização: p_secret + pode(ação). O banco decide; esconder
-- botão é só conforto. Autoria sai da sessão (auditoria.ator_rotulo por
-- default, decidido_rotulo por ator_rotulo_atual()) — nunca de um nome que o
-- navegador manda.
--
-- Ações (tabela permissoes):
--   dado.ler             ler tudo
--   edicao.gerir         edição, cronograma                         (administrador)
--   curadoria.decidir    tema, combo, revisão de dados, acervo      (administrador, curadoria)
--   pagamento.gerir      pagamento e liberação para foto            (administrador)
--   producao.gerir       materiais, vendas em nome da marca, fotos  (administrador, produção)
--   relacionamento.gerir contatos e Press Kit                       (administrador, curadoria, produção)
-- =============================================================================

-- ── 0. Utilidades ───────────────────────────────────────────────────────────
create or replace function public.edicao_atual()
returns text language sql stable security definer set search_path = public as $$
  select edicao_atual from public.admin_config where id
$$;
revoke all on function public.edicao_atual() from public, anon;
grant execute on function public.edicao_atual() to authenticated;

-- ── 1. Edição e cronograma (Fase 9) ────────────────────────────────────────
create or replace function public.get_edicoes(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object(
            'atual', e.codigo = public.edicao_atual(),
            'participacoes', (select count(*) from public.participacoes pa where pa.edicao_codigo = e.codigo),
            'historicas', (select count(distinct chave) from public.historico_participacoes h where h.edicao_codigo = e.codigo),
            'cronograma', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordem, k.inicio nulls last), '[]'::jsonb)
                             from public.edicao_cronograma k where k.edicao_codigo = e.codigo))
          order by e.ordem desc), '[]'::jsonb) from public.edicoes e);
end $$;

create or replace function public.salvar_edicao(p_secret text, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_cod text := btrim(coalesce(p_dados ->> 'codigo', ''));
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_cod !~ '^\d{4}(\.\d)?$' then raise exception 'codigo_invalido'; end if;
  insert into public.edicoes (codigo, ordem, nome, classificacao, fonte)
  values (v_cod, (select coalesce(max(ordem), 0) + 1 from public.edicoes),
          coalesce(nullif(btrim(p_dados ->> 'nome'), ''), 'Sweet & Coffee Week ' || v_cod),
          'atual_confirmado', 'Painel · ' || public.ator_rotulo_atual())
  on conflict (codigo) do nothing;
  update public.edicoes set
    nome                 = coalesce(nullif(btrim(p_dados ->> 'nome'), ''), nome),
    tema                 = case when p_dados ? 'tema' then nullif(btrim(p_dados ->> 'tema'), '') else tema end,
    festival_inicio      = case when p_dados ? 'festival_inicio' then (p_dados ->> 'festival_inicio')::date else festival_inicio end,
    festival_fim         = case when p_dados ? 'festival_fim' then (p_dados ->> 'festival_fim')::date else festival_fim end,
    taxa_inscricao       = case when p_dados ? 'taxa_inscricao' then (p_dados ->> 'taxa_inscricao')::numeric else taxa_inscricao end,
    foto_exige_pagamento = coalesce((p_dados ->> 'foto_exige_pagamento')::boolean, foto_exige_pagamento),
    lembrete_vendas_hora = case when p_dados ? 'lembrete_vendas_hora' then (p_dados ->> 'lembrete_vendas_hora')::time else lembrete_vendas_hora end
   where codigo = v_cod;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('edicao.salva', 'edicoes', v_cod, p_dados);
  return v_cod;
end $$;

create or replace function public.salvar_cronograma_item(p_secret text, p_item jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_item ->> 'id', '')::uuid;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(btrim(p_item ->> 'titulo'), '') = '' then raise exception 'titulo_obrigatorio'; end if;
  if v_id is null then
    insert into public.edicao_cronograma (edicao_codigo, chave, titulo, descricao, tipo, inicio, fim, horario,
                                          ordem, obrigatorio, visivel_participante, condicao)
    values (p_item ->> 'edicao_codigo', nullif(p_item ->> 'chave', ''), btrim(p_item ->> 'titulo'),
            nullif(p_item ->> 'descricao', ''), coalesce(p_item ->> 'tipo', 'prazo'),
            nullif(p_item ->> 'inicio', '')::date, nullif(p_item ->> 'fim', '')::date,
            nullif(p_item ->> 'horario', ''), coalesce((p_item ->> 'ordem')::int, 0),
            coalesce((p_item ->> 'obrigatorio')::boolean, false),
            coalesce((p_item ->> 'visivel_participante')::boolean, true), nullif(p_item ->> 'condicao', ''))
    returning id into v_id;
  else
    update public.edicao_cronograma set
      chave = nullif(p_item ->> 'chave', ''), titulo = btrim(p_item ->> 'titulo'),
      descricao = nullif(p_item ->> 'descricao', ''), tipo = coalesce(p_item ->> 'tipo', tipo),
      inicio = nullif(p_item ->> 'inicio', '')::date, fim = nullif(p_item ->> 'fim', '')::date,
      horario = nullif(p_item ->> 'horario', ''), ordem = coalesce((p_item ->> 'ordem')::int, ordem),
      obrigatorio = coalesce((p_item ->> 'obrigatorio')::boolean, obrigatorio),
      visivel_participante = coalesce((p_item ->> 'visivel_participante')::boolean, visivel_participante),
      condicao = nullif(p_item ->> 'condicao', '')
     where id = v_id;
    if not found then raise exception 'item_nao_encontrado'; end if;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('cronograma.salvo', 'edicao_cronograma', v_id::text, p_item);
  return v_id;
end $$;

create or replace function public.remover_cronograma_item(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  delete from public.edicao_cronograma where id = p_id returning to_jsonb(edicao_cronograma.*) into v;
  if v is null then raise exception 'item_nao_encontrado'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('cronograma.removido', 'edicao_cronograma', p_id::text, v);
end $$;

-- ── 2. História (Fase 8/12/13) ─────────────────────────────────────────────
-- Só o que foi CONFIRMADO por uma pessoa entra na história. Sugestão não conta.
create or replace function public.historia_participante(p_participante uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with vinc as (
    select v.chave, m.nome from public.participante_vinculos v
      join public.historico_marcas m on m.chave = v.chave
     where v.participante_id = p_participante and v.status = 'confirmado'),
  hist as (
    select distinct h.edicao_codigo from public.historico_participacoes h where h.chave in (select chave from vinc)),
  sist as (
    select pa.edicao_codigo from public.participacoes pa where pa.participante_id = p_participante),
  todas as (select edicao_codigo from hist union select edicao_codigo from sist),
  eds as (
    select e.codigo, e.nome, e.tema, e.ordem, e.festival_inicio,
           (e.codigo in (select edicao_codigo from hist)) as no_acervo,
           (e.codigo in (select edicao_codigo from sist)) as no_sistema
      from public.edicoes e where e.codigo in (select edicao_codigo from todas)),
  premios as (
    select pr.edicao_codigo, pr.categoria, pr.trilha, pr.colocacao, pr.classificacao
      from public.premiacoes pr
     where pr.chave in (select chave from vinc)
        or pr.participacao_id in (select id from public.participacoes where participante_id = p_participante))
  select jsonb_build_object(
    'status', (select historico_status from public.participantes where id = p_participante),
    'marcas_do_acervo', coalesce((select jsonb_agg(nome order by nome) from vinc), '[]'::jsonb),
    'participacoes', (select count(*) from eds),
    'primeira', (select jsonb_build_object('codigo', codigo, 'nome', nome) from eds order by ordem limit 1),
    'ultima', (select jsonb_build_object('codigo', codigo, 'nome', nome) from eds order by ordem desc limit 1),
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('codigo', codigo, 'nome', nome, 'tema', tema,
                  'ano', extract(year from festival_inicio), 'no_acervo', no_acervo, 'no_sistema', no_sistema)
                  order by ordem) from eds), '[]'::jsonb),
    'premiacoes', coalesce((select jsonb_agg(to_jsonb(p) order by p.edicao_codigo, p.colocacao) from premios p), '[]'::jsonb),
    'podios', (select count(*) from premios),
    'primeiros_lugares', (select count(*) from premios where colocacao = 1))
$$;
revoke all on function public.historia_participante(uuid) from public, anon, authenticated;

create or replace function public.get_historia(p_secret text, p_participante uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return public.historia_participante(p_participante) || jsonb_build_object(
    'vinculos', coalesce((select jsonb_agg(jsonb_build_object(
        'chave', v.chave, 'nome', m.nome, 'status', v.status, 'origem', v.origem, 'motivo', v.motivo,
        'decidido_rotulo', v.decidido_rotulo, 'decidido_em', v.decidido_em,
        'edicoes', (select jsonb_agg(distinct h.edicao_codigo) from public.historico_participacoes h where h.chave = v.chave),
        'podios', (select count(*) from public.premiacoes pr where pr.chave = v.chave))
        order by v.status, m.nome)
      from public.participante_vinculos v join public.historico_marcas m on m.chave = v.chave
     where v.participante_id = p_participante), '[]'::jsonb));
end $$;

-- A marca vê a SUA história — nunca a de outra (auth.uid() decide).
create or replace function public.marca_minha_historia()
returns jsonb language sql stable security definer set search_path = public as $$
  select public.historia_participante(p.id)
    from public.participantes p where p.user_id = auth.uid() and public.conta_ativa()
   order by p.created_at desc limit 1
$$;
revoke all on function public.marca_minha_historia() from public, anon;
grant execute on function public.marca_minha_historia() to authenticated;

create or replace function public.buscar_marcas_acervo(p_secret text, p_busca text)
returns table (chave text, nome text, edicoes jsonb, vinculada_a text)
language sql stable security definer set search_path = public as $$
  select m.chave, m.nome,
         (select jsonb_agg(distinct h.edicao_codigo) from public.historico_participacoes h where h.chave = m.chave),
         (select p.nome_marca from public.participante_vinculos v join public.participantes p on p.id = v.participante_id
           where v.chave = m.chave and v.status = 'confirmado')
    from public.historico_marcas m
   where public.pode(p_secret, 'dado.ler')
     and (public.imp_compacto(m.nome) like '%' || public.imp_compacto(p_busca) || '%'
          or exists (select 1 from public.historico_aliases a where a.chave = m.chave
                      and public.imp_compacto(a.alias) like '%' || public.imp_compacto(p_busca) || '%'))
   order by m.nome limit 20
$$;

create or replace function public.decidir_vinculo(p_secret text, p_participante uuid, p_chave text,
                                                  p_status text, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('confirmado','rejeitado','possivel') then raise exception 'status_invalido'; end if;
  insert into public.participante_vinculos (participante_id, chave, status, origem, motivo,
                                            decidido_por, decidido_rotulo, decidido_em)
  values (p_participante, p_chave, p_status, 'manual', p_motivo, auth.uid(), public.ator_rotulo_atual(), now())
  on conflict (participante_id, chave) do update set
    status = excluded.status, motivo = coalesce(excluded.motivo, participante_vinculos.motivo),
    decidido_por = excluded.decidido_por, decidido_rotulo = excluded.decidido_rotulo, decidido_em = now();
  update public.participantes set historico_status = case
      when exists (select 1 from public.participante_vinculos where participante_id = p_participante and status = 'confirmado')
        then 'recorrente_confirmado'
      when exists (select 1 from public.participante_vinculos where participante_id = p_participante and status = 'possivel')
        then 'possivel_correspondencia'
      when historico_status = 'novo_confirmado' then 'novo_confirmado'
      else 'sem_correspondencia_no_acervo' end
   where id = p_participante;
  if not exists (select 1 from public.participante_vinculos where participante_id = p_participante and status = 'possivel') then
    update public.revisao_pendencias set status = 'resolvida', resolucao = 'Correspondência com o acervo decidida',
           resolvido_por = auth.uid(), resolvido_rotulo = public.ator_rotulo_atual(), resolvido_em = now()
     where participante_id = p_participante and tipo = 'possivel_correspondencia' and status = 'aberta'
       and linha_id is not null and titulo like 'Possível participação%';
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('acervo.vinculo', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('marca_acervo', (select nome from public.historico_marcas where chave = p_chave),
                             'status', p_status, 'motivo', p_motivo));
  return public.historia_participante(p_participante);
end $$;

-- "Primeira edição" só quando alguém CONFIRMA — ausência no acervo não basta.
create or replace function public.marcar_participante_novo(p_secret text, p_participante uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if exists (select 1 from public.participante_vinculos where participante_id = p_participante and status = 'confirmado') then
    raise exception 'ja_tem_historico_confirmado';
  end if;
  update public.participante_vinculos set status = 'rejeitado', motivo = coalesce(p_motivo, 'Marcado como primeira participação'),
         decidido_por = auth.uid(), decidido_rotulo = public.ator_rotulo_atual(), decidido_em = now()
   where participante_id = p_participante and status = 'possivel';
  update public.participantes set historico_status = 'novo_confirmado' where id = p_participante;
  update public.revisao_pendencias set status = 'resolvida', resolucao = 'Confirmado como primeira participação',
         resolvido_por = auth.uid(), resolvido_rotulo = public.ator_rotulo_atual(), resolvido_em = now()
   where participante_id = p_participante and tipo = 'possivel_correspondencia' and status = 'aberta';
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('acervo.novo_confirmado', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('motivo', p_motivo));
end $$;

-- ── 3. Fila de revisão (Fase 7) ────────────────────────────────────────────
create or replace function public.get_revisao(p_secret text, p_status text default 'aberta')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
            'marca', (select nome_marca from public.participantes where id = r.participante_id),
            'contato', (select nome from public.contatos_relacionamento where id = r.contato_id),
            'lote_fonte', (select fonte from public.import_lotes where id = r.lote_id),
            'aba', (select aba from public.import_linhas where id = r.linha_id),
            'linha', (select linha from public.import_linhas where id = r.linha_id))
          order by (r.severidade = 'bloqueio') desc, r.created_at), '[]'::jsonb)
            from public.revisao_pendencias r where p_status is null or r.status = p_status);
end $$;

create or replace function public.resolver_revisao(p_secret text, p_id uuid, p_status text, p_resolucao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('resolvida','descartada','aberta') then raise exception 'status_invalido'; end if;
  update public.revisao_pendencias set status = p_status, resolucao = nullif(btrim(p_resolucao), ''),
         resolvido_por = case when p_status = 'aberta' then null else auth.uid() end,
         resolvido_rotulo = case when p_status = 'aberta' then null else public.ator_rotulo_atual() end,
         resolvido_em = case when p_status = 'aberta' then null else now() end
   where id = p_id;
  if not found then raise exception 'pendencia_nao_encontrada'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  select 'revisao.' || p_status, 'revisao_pendencias', p_id::text, participante_id,
         jsonb_build_object('titulo', titulo, 'resolucao', p_resolucao)
    from public.revisao_pendencias where id = p_id;
end $$;

-- Correção feita por UMA PESSOA: guarda o valor anterior e fecha a pendência.
create or replace function public.corrigir_participante(p_secret text, p_participante uuid, p_campo text,
                                                        p_valor text, p_pendencia uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes text;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_campo not in ('nome_marca','razao_social','cnpj','responsavel','telefone','email','instagram','site') then
    raise exception 'campo_invalido';
  end if;
  if p_campo = 'nome_marca' and coalesce(btrim(p_valor), '') = '' then raise exception 'nome_obrigatorio'; end if;
  execute format('select %I from public.participantes where id = $1', p_campo) into v_antes using p_participante;
  execute format('update public.participantes set %I = $1 where id = $2', p_campo)
    using nullif(btrim(p_valor), ''), p_participante;
  if p_pendencia is not null then
    update public.revisao_pendencias set status = 'resolvida',
           resolucao = 'Corrigido: ' || p_campo || ' = ' || coalesce(nullif(btrim(p_valor), ''), '(vazio)'),
           resolvido_por = auth.uid(), resolvido_rotulo = public.ator_rotulo_atual(), resolvido_em = now()
     where id = p_pendencia;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('cadastro.corrigido', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('campo', p_campo,
            'de', case when p_campo in ('cnpj','telefone') then public.mascarar(v_antes) else v_antes end,
            'para', case when p_campo in ('cnpj','telefone') then public.mascarar(p_valor) else p_valor end));
end $$;

-- ── 4. Operação da participação (Fase 10) ──────────────────────────────────
create or replace function public.definir_liberacao_foto(p_secret text, p_participacao uuid, p_status text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_part uuid; v_antes text;
begin
  if not public.pode(p_secret, 'pagamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('pendente','liberado','nao_liberado') then raise exception 'status_invalido'; end if;
  select participante_id, foto_liberacao into v_part, v_antes from public.participacoes where id = p_participacao;
  if v_part is null then raise exception 'participacao_nao_encontrada'; end if;
  update public.participacoes set foto_liberacao = p_status, foto_liberacao_motivo = nullif(btrim(p_motivo), '')
   where id = p_participacao;
  if p_status = 'liberado' and v_antes is distinct from 'liberado' then
    perform public.notificar('marca', v_part, 'fotos', 'Sessão de fotos liberada',
      'Você já pode agendar a sua sessão de fotos.', 'cadastro/fotos');
  end if;
end $$;

create or replace function public.definir_pagamento(p_secret text, p_participacao uuid, p_status text, p_obs text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'pagamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('nao_informado','pendente','parcial','quitado','isento') then raise exception 'status_invalido'; end if;
  update public.participacoes set pagamento_status = p_status, pagamento_obs = nullif(btrim(p_obs), '')
   where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
end $$;

-- Tema: propostas da edição, com a ordem de prioridade da regra real —
-- pagamento em dia primeiro, depois quem informou primeiro. O sistema MOSTRA
-- a ordem; quem aprova é a organização.
create or replace function public.get_temas(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text := coalesce(p_edicao, public.edicao_atual());
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(x order by x ->> 'tema_norm', (x ->> 'prioridade')::int), '[]'::jsonb) from (
    select to_jsonb(t) || jsonb_build_object(
             'marca', p.nome_marca, 'participante_id', p.id, 'pagamento_status', pa.pagamento_status,
             'prioridade', row_number() over (partition by t.tema_norm
                             order by (pa.pagamento_status in ('quitado','isento')) desc, t.solicitado_em),
             'conflito', count(*) over (partition by t.tema_norm) > 1,
             'aprovado_por_outro', exists (select 1 from public.temas_propostos o
                                            where o.edicao_codigo = t.edicao_codigo and o.tema_norm = t.tema_norm
                                              and o.status = 'aprovado' and o.id <> t.id)) as x
      from public.temas_propostos t
      join public.participacoes pa on pa.id = t.participacao_id
      join public.participantes p on p.id = pa.participante_id
     where t.edicao_codigo = v_ed and t.status in ('proposto','aprovado')) s);
end $$;

create or replace function public.decidir_tema(p_secret text, p_proposta uuid, p_status text, p_obs text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.temas_propostos%rowtype; v_part uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('aprovado','recusado','proposto') then raise exception 'status_invalido'; end if;
  select * into v from public.temas_propostos where id = p_proposta for update;
  if not found then raise exception 'proposta_nao_encontrada'; end if;
  if p_status = 'aprovado' and exists (select 1 from public.temas_propostos
       where edicao_codigo = v.edicao_codigo and tema_norm = v.tema_norm and status = 'aprovado' and id <> v.id) then
    raise exception 'tema_ja_aprovado_para_outra_marca';
  end if;
  update public.temas_propostos set status = p_status, observacao = nullif(btrim(p_obs), ''),
         decidido_por = auth.uid(), decidido_rotulo = public.ator_rotulo_atual(), decidido_em = now()
   where id = p_proposta;
  select participante_id into v_part from public.participacoes where id = v.participacao_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('tema.' || p_status, 'temas_propostos', p_proposta::text, v.participacao_id,
          jsonb_build_object('tema', v.tema, 'observacao', p_obs));
  if p_status in ('aprovado','recusado') then
    perform public.notificar('marca', v_part, 'tema',
      case p_status when 'aprovado' then 'Tema aprovado: ' || v.tema else 'Tema precisa mudar: ' || v.tema end,
      coalesce(nullif(btrim(p_obs), ''), case p_status when 'aprovado' then 'A organização aprovou o seu tema.'
                                                      else 'Escolha outro tema no cadastro.' end),
      'cadastro');
  end if;
end $$;

create or replace function public.revisar_combo(p_secret text, p_participacao uuid, p_status text, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare v_part uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('aprovado','correcao_solicitada','em_analise') then raise exception 'status_invalido'; end if;
  if p_status = 'correcao_solicitada' and coalesce(btrim(p_nota), '') = '' then raise exception 'nota_obrigatoria'; end if;
  update public.participacoes set combo_status = p_status, combo_revisao_nota = nullif(btrim(p_nota), '')
   where id = p_participacao returning participante_id into v_part;
  if v_part is null then raise exception 'participacao_nao_encontrada'; end if;
  if p_status = 'correcao_solicitada' then
    -- Reabre o cadastro para a marca corrigir; concluir de novo põe o combo em análise.
    update public.participacoes set status_cadastro = 'em_preenchimento'
     where id = p_participacao and status_cadastro = 'cadastro_completo';
    perform public.notificar('marca', v_part, 'combo', 'Ajuste pedido no seu combo', left(p_nota, 200), 'cadastro');
  elsif p_status = 'aprovado' then
    perform public.notificar('marca', v_part, 'combo', 'Combo aprovado',
      coalesce(nullif(btrim(p_nota), ''), 'A organização aprovou o seu combo.'), 'cadastro');
  end if;
end $$;

-- ── 5. Materiais (Fase 10) ──────────────────────────────────────────────────
create or replace function public.get_materiais(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text := coalesce(p_edicao, public.edicao_atual());
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object('marca', p.nome_marca,
            'unidade', (select coalesce(u.endereco, 'Unidade ' || u.ordem) from public.participacao_unidades u where u.id = m.unidade_id))
          order by p.nome_marca, m.item), '[]'::jsonb)
            from public.materiais m join public.participacoes pa on pa.id = m.participacao_id
            join public.participantes p on p.id = pa.participante_id
           where pa.edicao_codigo = v_ed);
end $$;

create or replace function public.salvar_material(p_secret text, p_item jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_item ->> 'id', '')::uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_id is null then
    insert into public.materiais (participacao_id, unidade_id, item, descricao, quantidade, status,
                                  entregue_em, recebido_por, observacao)
    values ((p_item ->> 'participacao_id')::uuid, nullif(p_item ->> 'unidade_id', '')::uuid, p_item ->> 'item',
            nullif(p_item ->> 'descricao', ''), nullif(p_item ->> 'quantidade', '')::int,
            coalesce(p_item ->> 'status', 'previsto'), nullif(p_item ->> 'entregue_em', '')::timestamptz,
            nullif(p_item ->> 'recebido_por', ''), nullif(p_item ->> 'observacao', ''))
    returning id into v_id;
  else
    update public.materiais set
      unidade_id = nullif(p_item ->> 'unidade_id', '')::uuid, item = coalesce(p_item ->> 'item', item),
      descricao = nullif(p_item ->> 'descricao', ''), quantidade = nullif(p_item ->> 'quantidade', '')::int,
      status = coalesce(p_item ->> 'status', status),
      entregue_em = case when p_item ->> 'status' = 'entregue'
                         then coalesce(nullif(p_item ->> 'entregue_em', '')::timestamptz, entregue_em, now())
                         else nullif(p_item ->> 'entregue_em', '')::timestamptz end,
      recebido_por = nullif(p_item ->> 'recebido_por', ''), observacao = nullif(p_item ->> 'observacao', '')
     where id = v_id;
    if not found then raise exception 'item_nao_encontrado'; end if;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('material.salvo', 'materiais', v_id::text, (select participacao_id from public.materiais where id = v_id), p_item);
  return v_id;
end $$;

create or replace function public.remover_material(p_secret text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  delete from public.materiais where id = p_id returning to_jsonb(materiais.*) into v;
  if v is null then raise exception 'item_nao_encontrado'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('material.removido', 'materiais', p_id::text, (v ->> 'participacao_id')::uuid, v);
end $$;

-- ── 6. Vendas diárias (Fase 10) ─────────────────────────────────────────────
create or replace function public.get_vendas_resumo(p_secret text, p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_hoje date := (now() at time zone 'America/Fortaleza')::date;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed, 'hoje', v_hoje,
    'festival_inicio', (select festival_inicio from public.edicoes where codigo = v_ed),
    'festival_fim', (select festival_fim from public.edicoes where codigo = v_ed),
    'marcas', coalesce((select jsonb_agg(jsonb_build_object(
        'participacao_id', pa.id, 'participante_id', p.id, 'marca', p.nome_marca, 'tem_conta', p.user_id is not null,
        'total', coalesce((select sum(quantidade) from public.vendas_diarias v where v.participacao_id = pa.id), 0),
        'registrou_hoje', exists (select 1 from public.vendas_diarias v where v.participacao_id = pa.id and v.dia = v_hoje),
        'dias', coalesce((select jsonb_object_agg(v.dia, v.quantidade) from public.vendas_diarias v where v.participacao_id = pa.id), '{}'::jsonb),
        'corrigidas', (select count(*) from public.auditoria a where a.participacao_id = pa.id and a.acao = 'venda.corrigida'))
      order by p.nome_marca)
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed), '[]'::jsonb));
end $$;

create or replace function public.registrar_venda_org(p_secret text, p_participacao uuid, p_dia date,
                                                      p_quantidade int, p_obs text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if p_quantidade is null or p_quantidade < 0 then raise exception 'quantidade_invalida'; end if;
  insert into public.vendas_diarias (participacao_id, dia, quantidade, observacao, registrado_por)
  values (p_participacao, p_dia, p_quantidade, nullif(btrim(p_obs), ''), auth.uid())
  on conflict (participacao_id, dia) do update set quantidade = excluded.quantidade,
    observacao = coalesce(excluded.observacao, vendas_diarias.observacao);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('venda.registrada_pela_organizacao', 'vendas_diarias', p_participacao::text, p_participacao,
          jsonb_build_object('dia', p_dia, 'quantidade', p_quantidade));
end $$;

-- ── 7. Relacionamento e Press Kit (Fase 14) ────────────────────────────────
-- Uma lista com o CONTEXTO de cada pessoa. Nenhum ranking, nenhuma seleção
-- automática: quem escolhe o destinatário é a equipe.
create or replace function public.get_contatos(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ed text := public.edicao_atual();
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'nome', c.nome, 'instagram', c.instagram, 'telefone', c.telefone, 'endereco', c.endereco,
      'bairro', c.bairro, 'tipo', c.tipo, 'ativo', c.ativo, 'observacoes', c.observacoes,
      'recebimentos', (select count(*) from public.presskit_envios e where e.contato_id = c.id
                        and e.status in ('constou_na_lista','enviado','entregue')
                        and e.edicao_codigo is distinct from v_ed),
      'ultima_edicao', (select e.edicao_codigo from public.presskit_envios e join public.edicoes ed on ed.codigo = e.edicao_codigo
                         where e.contato_id = c.id and e.status in ('constou_na_lista','enviado','entregue')
                           and e.edicao_codigo is distinct from v_ed order by ed.ordem desc limit 1),
      'recebeu_ultima', exists (select 1 from public.presskit_envios e where e.contato_id = c.id
                         and e.status in ('constou_na_lista','enviado','entregue')
                         and e.edicao_codigo = (select e2.edicao_codigo from public.presskit_envios e2
                                                  join public.edicoes ed on ed.codigo = e2.edicao_codigo
                                                 where e2.edicao_codigo is distinct from v_ed
                                                 order by ed.ordem desc limit 1)),
      'atual', (select jsonb_build_object('id', e.id, 'status', e.status, 'itens', e.itens, 'data', e.data,
                         'endereco_confirmado', e.endereco_confirmado, 'responsavel_rotulo', e.responsavel_rotulo)
                  from public.presskit_envios e where e.contato_id = c.id and e.edicao_codigo = v_ed),
      'incompleto', (c.endereco is null or (c.instagram is null and c.telefone is null)),
      'pendencias', (select count(*) from public.revisao_pendencias r where r.contato_id = c.id and r.status = 'aberta'))
    order by c.nome), '[]'::jsonb) from public.contatos_relacionamento c);
end $$;

create or replace function public.get_contato(p_secret text, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select to_jsonb(c) - 'dados_originais' || jsonb_build_object(
      'envios', coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('edicao_nome', ed.nome)
                  order by ed.ordem desc nulls last, e.created_at desc)
                  from public.presskit_envios e left join public.edicoes ed on ed.codigo = e.edicao_codigo
                 where e.contato_id = c.id), '[]'::jsonb),
      'pendencias', coalesce((select jsonb_agg(to_jsonb(r)) from public.revisao_pendencias r
                               where r.contato_id = c.id and r.status = 'aberta'), '[]'::jsonb))
    from public.contatos_relacionamento c where c.id = p_id);
end $$;

create or replace function public.salvar_contato(p_secret text, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p_dados ->> 'id', '')::uuid;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(btrim(p_dados ->> 'nome'), '') = '' then raise exception 'nome_obrigatorio'; end if;
  if v_id is null then
    insert into public.contatos_relacionamento (nome, instagram, telefone, endereco, bairro, observacoes, tipo, fonte)
    values (btrim(p_dados ->> 'nome'), nullif(btrim(p_dados ->> 'instagram'), ''), nullif(btrim(p_dados ->> 'telefone'), ''),
            nullif(btrim(p_dados ->> 'endereco'), ''), nullif(btrim(p_dados ->> 'bairro'), ''),
            nullif(btrim(p_dados ->> 'observacoes'), ''), coalesce(p_dados ->> 'tipo', 'influenciador'),
            'Painel · ' || public.ator_rotulo_atual())
    returning id into v_id;
  else
    update public.contatos_relacionamento set
      nome = btrim(p_dados ->> 'nome'), instagram = nullif(btrim(p_dados ->> 'instagram'), ''),
      telefone = nullif(btrim(p_dados ->> 'telefone'), ''), endereco = nullif(btrim(p_dados ->> 'endereco'), ''),
      bairro = nullif(btrim(p_dados ->> 'bairro'), ''), observacoes = nullif(btrim(p_dados ->> 'observacoes'), ''),
      tipo = coalesce(p_dados ->> 'tipo', tipo), ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo)
     where id = v_id;
    if not found then raise exception 'contato_nao_encontrado'; end if;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('contato.salvo', 'contatos_relacionamento', v_id::text,
          jsonb_build_object('nome', p_dados ->> 'nome', 'campos', (select jsonb_agg(k) from jsonb_object_keys(p_dados) k)));
  return v_id;
end $$;

create or replace function public.definir_presskit(p_secret text, p_contato uuid, p_status text, p_dados jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_ed text := coalesce(p_dados ->> 'edicao_codigo', public.edicao_atual());
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  if p_status not in ('selecionado','confirmado','enviado','entregue','nao_entregue','cancelado') then
    raise exception 'status_invalido';
  end if;
  insert into public.presskit_envios (contato_id, edicao_codigo, status, data, voucher, itens, endereco_confirmado,
                                      observacao, fonte)
  values (p_contato, v_ed, p_status, nullif(p_dados ->> 'data', '')::date, nullif(p_dados ->> 'voucher', ''),
          nullif(p_dados ->> 'itens', ''), nullif(p_dados ->> 'endereco_confirmado', ''),
          nullif(p_dados ->> 'observacao', ''), 'Painel')
  on conflict (contato_id, edicao_codigo) where edicao_codigo is not null do update set
    status = excluded.status,
    data = coalesce(excluded.data, presskit_envios.data),
    voucher = coalesce(excluded.voucher, presskit_envios.voucher),
    itens = coalesce(excluded.itens, presskit_envios.itens),
    endereco_confirmado = coalesce(excluded.endereco_confirmado, presskit_envios.endereco_confirmado),
    observacao = coalesce(excluded.observacao, presskit_envios.observacao),
    responsavel = auth.uid(), responsavel_rotulo = public.ator_rotulo_atual();
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('presskit.' || p_status, 'contatos_relacionamento', p_contato::text,
          jsonb_build_object('edicao', v_ed) || p_dados);
end $$;

-- ── 8. Participantes: lista e ficha 360 (Fase 13) ──────────────────────────
-- get_participantes ganha colunas no FIM (o painel publicado lê por nome e
-- ignora o que não conhece). Muda o tipo de retorno → drop + create.
drop function if exists public.get_participantes(text);
create function public.get_participantes(p_secret text)
returns table (id uuid, created_at timestamptz, updated_at timestamptz, origem_id uuid, user_id uuid, slug text,
               nome_marca text, responsavel text, telefone text, email text, instagram text, site text, cnpj text,
               razao_social text, participacao_id uuid, edicao_codigo text, status_cadastro text, tema_combo text,
               combo_preco numeric, unidades bigint, itens_prontos bigint, edicoes bigint,
               historico_status text, foto_liberacao text, pagamento_status text, combo_status text,
               pendencias bigint, sessao_fotos timestamptz, participacoes_acervo bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  select c.edicao_atual into v_ed from public.admin_config c where c.id;
  return query
    select p.id, p.created_at, p.updated_at, p.origem_id, p.user_id, p.slug,
           p.nome_marca, p.responsavel, p.telefone, p.email, p.instagram, p.site, p.cnpj, p.razao_social,
           pa.id, pa.edicao_codigo, coalesce(pa.status_cadastro, 'sem_participacao'), pa.tema_combo, pa.combo_preco,
           (select count(*) from public.participacao_unidades u
             where u.participacao_id = pa.id and coalesce(trim(u.endereco), '') <> ''),
           (select count(*) from public.participantes_itens i
             where i.participacao_id = pa.id and coalesce(trim(i.nome), '') <> ''
               and coalesce(trim(i.descricao), '') <> '' and coalesce(trim(i.ingredientes), '') <> ''),
           (select count(*) from public.participacoes t where t.participante_id = p.id),
           p.historico_status, pa.foto_liberacao, pa.pagamento_status, pa.combo_status,
           (select count(*) from public.revisao_pendencias r where r.participante_id = p.id and r.status = 'aberta'),
           (select min(s.data_hora) from public.sessoes_fotos s where s.participacao_id = pa.id
             and s.status in ('agendada','remarcada')),
           (select count(distinct h.edicao_codigo) from public.historico_participacoes h
             join public.participante_vinculos v on v.chave = h.chave
            where v.participante_id = p.id and v.status = 'confirmado')
      from public.participantes p
      left join lateral (
        select pp.* from public.participacoes pp where pp.participante_id = p.id
         order by (pp.edicao_codigo is not distinct from v_ed) desc, pp.edicao_codigo desc, pp.created_at desc
         limit 1) pa on true
     order by p.created_at desc;
end $$;
revoke all on function public.get_participantes(text) from public;
grant execute on function public.get_participantes(text) to anon, authenticated;

-- A ficha ganha operação, temas, materiais, história e pendências — chaves
-- NOVAS no mesmo jsonb; as antigas continuam iguais para o painel publicado.
create or replace function public.get_ficha_360(p_secret text, p_participacao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_part uuid;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  select participante_id into v_part from public.participacoes where id = p_participacao;
  if v_part is null then return null; end if;
  return public.get_ficha_participacao(p_secret, p_participacao) || jsonb_build_object(
    'temas', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc)
                         from public.temas_propostos t where t.participacao_id = p_participacao), '[]'::jsonb),
    'materiais', coalesce((select jsonb_agg(to_jsonb(m) order by m.item)
                             from public.materiais m where m.participacao_id = p_participacao), '[]'::jsonb),
    'historia', public.get_historia(p_secret, v_part),
    'pendencias', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at)
                              from public.revisao_pendencias r where r.participante_id = v_part and r.status = 'aberta'), '[]'::jsonb),
    'aliases', coalesce((select jsonb_agg(a.alias order by a.alias) from public.participante_aliases a
                          where a.participante_id = v_part), '[]'::jsonb));
end $$;

-- Sessões: responsáveis dos dois lados (a planilha já trazia o da marca).
drop function if exists public.get_sessoes_fotos(text);
create function public.get_sessoes_fotos(p_secret text)
returns table (id uuid, participacao_id uuid, participante_id uuid, nome_marca text, edicao_codigo text,
               data_hora timestamptz, local text, status text, observacoes text,
               responsavel_participante text, responsavel_organizacao text, foto_liberacao text)
language sql stable security definer set search_path = public as $$
  select s.id, s.participacao_id, s.participante_id, p.nome_marca,
         coalesce(pa.edicao_codigo, s.edicao_codigo), s.data_hora, s.local, s.status, s.observacoes,
         s.responsavel_participante, s.responsavel_organizacao, pa.foto_liberacao
    from public.sessoes_fotos s
    left join public.participantes p on p.id = s.participante_id
    left join public.participacoes pa on pa.id = s.participacao_id
   where public.pode(p_secret, 'dado.ler')
   order by s.data_hora desc
$$;
revoke all on function public.get_sessoes_fotos(text) from public;
grant execute on function public.get_sessoes_fotos(text) to anon, authenticated;

create or replace function public.definir_responsaveis_sessao(p_secret text, p_sessao uuid,
                                                              p_participante text, p_organizacao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.sessoes_fotos set responsavel_participante = nullif(btrim(p_participante), ''),
         responsavel_organizacao = nullif(btrim(p_organizacao), '')
   where id = p_sessao;
  if not found then raise exception 'sessao_nao_encontrada'; end if;
end $$;

-- ── 9. Conta para estabelecimento que já existe (importado) ────────────────
-- Chamada pela Edge Function criar-acesso-marca no modo { participante_id }.
-- Sem isto, criar acesso para uma marca importada criaria OUTRA marca.
create or replace function public.vincular_conta_participante(p_user uuid, p_participante uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ed text;
begin
  if p_user is null or p_participante is null then raise exception 'argumentos_obrigatorios'; end if;
  if exists (select 1 from public.participantes where id = p_participante and user_id is not null) then
    raise exception 'marca_ja_tem_conta';
  end if;
  insert into public.perfis (user_id, papel) values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;
  update public.participantes set user_id = p_user where id = p_participante;
  if not found then raise exception 'participante_nao_encontrado'; end if;
  insert into public.participantes_operacao (participante_id) values (p_participante)
  on conflict (participante_id) do nothing;
  select edicao_atual into v_ed from public.admin_config where id;
  perform public.abrir_participacao_interna(p_participante, v_ed);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('criar_acesso_marca', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('origem', 'estabelecimento_existente', 'user_id', p_user, 'edicao', v_ed));
  return p_participante;
end $$;
revoke all on function public.vincular_conta_participante(uuid, uuid) from public, anon, authenticated;

-- ── 10. Concluir cadastro: item 2 pode ser doce ────────────────────────────
create or replace function public.marca_concluir_cadastro(p_participacao uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype;
  v_faltando text[] := '{}'; v_unidades int; v_item record;
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'nao_autorizado'; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id and user_id = auth.uid();
  if not found or not public.conta_ativa() then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(v_p.nome_marca), '')          = '' then v_faltando := v_faltando || 'nome_marca'::text; end if;
  if coalesce(trim(v_p.responsavel), '')         = '' then v_faltando := v_faltando || 'responsavel'::text; end if;
  if coalesce(trim(v_p.telefone), '')            = '' then v_faltando := v_faltando || 'telefone'::text; end if;
  if coalesce(trim(v_pa.tema_combo), '')         = '' then v_faltando := v_faltando || 'tema_combo'::text; end if;
  if coalesce(trim(v_pa.tema_justificativa), '') = '' then v_faltando := v_faltando || 'tema_justificativa'::text; end if;
  if v_pa.combo_preco is null or v_pa.combo_preco <= 0 then v_faltando := v_faltando || 'combo_preco'::text; end if;
  select count(*) into v_unidades from public.participacao_unidades
   where participacao_id = p_participacao and coalesce(trim(endereco), '') <> '';
  if v_unidades = 0 then v_faltando := v_faltando || 'unidades'::text; end if;
  for v_item in select tipo, posicao, nome, descricao, ingredientes from public.participantes_itens
                 where participacao_id = p_participacao order by posicao loop
    if coalesce(trim(v_item.nome), '') = '' or coalesce(trim(v_item.descricao), '') = ''
       or coalesce(trim(v_item.ingredientes), '') = '' then
      -- Códigos antigos preservados (item_doce/item_salgado/item_bebida); o
      -- segundo item doce ganha o seu.
      v_faltando := v_faltando || (case when v_item.posicao = 2 and v_item.tipo = 'doce' then 'item_segundo'
                                        else 'item_' || v_item.tipo end)::text;
    end if;
  end loop;
  if array_length(v_faltando, 1) is not null then
    return jsonb_build_object('ok', false, 'faltando', to_jsonb(v_faltando));
  end if;
  update public.participacoes set status_cadastro = 'cadastro_completo' where id = p_participacao;
  update public.quero_participar set status = 'cadastro_completo' where id = v_p.origem_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id)
       values ('concluir_cadastro', 'participacoes', p_participacao::text, p_participacao);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.marca_concluir_cadastro(uuid) from public, anon;
grant execute on function public.marca_concluir_cadastro(uuid) to authenticated;

-- ── 11. Lembretes (Fase 16): venda do dia e prazo chegando ──────────────────
-- Rodam por pg_cron de hora em hora. Um aviso por marca por dia e por tipo —
-- quem já registrou a venda do dia não recebe nada.
create or replace function public.lembrar_vendas()
returns int language plpgsql security definer set search_path = public as $$
declare v_ed public.edicoes%rowtype; v_agora timestamp := now() at time zone 'America/Fortaleza'; v_n int := 0; r record;
begin
  select * into v_ed from public.edicoes where codigo = public.edicao_atual();
  if v_ed.lembrete_vendas_hora is null or v_ed.festival_inicio is null or v_ed.festival_fim is null then return 0; end if;
  if v_agora::date not between v_ed.festival_inicio and v_ed.festival_fim or v_agora::time < v_ed.lembrete_vendas_hora then
    return 0;
  end if;
  for r in select pa.id, pa.participante_id from public.participacoes pa
             join public.participantes p on p.id = pa.participante_id
            where pa.edicao_codigo = v_ed.codigo and p.user_id is not null
              and not exists (select 1 from public.vendas_diarias v where v.participacao_id = pa.id and v.dia = v_agora::date)
              and not exists (select 1 from public.notificacoes n where n.participante_id = pa.participante_id
                               and n.tipo = 'venda' and (n.criada_em at time zone 'America/Fortaleza')::date = v_agora::date) loop
    perform public.notificar('marca', r.participante_id, 'venda', 'Registre as vendas de hoje',
      'Quantos combos saíram hoje? Leva menos de um minuto.', 'hoje');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.lembrar_prazos()
returns int language plpgsql security definer set search_path = public as $$
declare v_hoje date := (now() at time zone 'America/Fortaleza')::date; v_n int := 0; k record; r record;
begin
  for k in select * from public.edicao_cronograma
            where edicao_codigo = public.edicao_atual() and tipo = 'prazo' and chave in ('tema','combo')
              and fim in (v_hoje, v_hoje + 2) loop
    for r in select pa.participante_id from public.participacoes pa join public.participantes p on p.id = pa.participante_id
              where pa.edicao_codigo = k.edicao_codigo and p.user_id is not null
                and ((k.chave = 'tema' and coalesce(btrim(pa.tema_combo), '') = '')
                  or (k.chave = 'combo' and pa.combo_status in ('rascunho','correcao_solicitada')))
                and not exists (select 1 from public.notificacoes n where n.participante_id = pa.participante_id
                                 and n.tipo = 'prazo' and n.titulo like '%' || k.titulo || '%'
                                 and (n.criada_em at time zone 'America/Fortaleza')::date = v_hoje) loop
      perform public.notificar('marca', r.participante_id, 'prazo',
        case when k.fim = v_hoje then 'Último dia: ' else 'Faltam 2 dias: ' end || k.titulo,
        'Prazo ' || to_char(k.fim, 'DD/MM') || '.', 'cadastro');
      v_n := v_n + 1;
    end loop;
  end loop;
  return v_n;
end $$;
revoke all on function public.lembrar_vendas(), public.lembrar_prazos() from public, anon, authenticated;

-- ── 12. Grants das portas da organização ───────────────────────────────────
do $$ declare f text; begin
  foreach f in array array[
    'get_edicoes(text)', 'salvar_edicao(text, jsonb)', 'salvar_cronograma_item(text, jsonb)',
    'remover_cronograma_item(text, uuid)', 'get_historia(text, uuid)', 'buscar_marcas_acervo(text, text)',
    'decidir_vinculo(text, uuid, text, text, text)', 'marcar_participante_novo(text, uuid, text)',
    'get_revisao(text, text)', 'resolver_revisao(text, uuid, text, text)',
    'corrigir_participante(text, uuid, text, text, uuid)', 'definir_liberacao_foto(text, uuid, text, text)',
    'definir_pagamento(text, uuid, text, text)', 'get_temas(text, text)', 'decidir_tema(text, uuid, text, text)',
    'revisar_combo(text, uuid, text, text)', 'get_materiais(text, text)', 'salvar_material(text, jsonb)',
    'remover_material(text, uuid)', 'get_vendas_resumo(text, text)', 'registrar_venda_org(text, uuid, date, int, text)',
    'get_contatos(text)', 'get_contato(text, uuid)', 'salvar_contato(text, jsonb)',
    'definir_presskit(text, uuid, text, jsonb)', 'get_ficha_360(text, uuid)',
    'definir_responsaveis_sessao(text, uuid, text, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
