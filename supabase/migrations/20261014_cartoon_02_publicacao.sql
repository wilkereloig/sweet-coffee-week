-- Camada de edição Cartoon 2026.2 — fase 2, migration 2/3: PUBLICAÇÃO E PROJEÇÃO (14/10/2026).
-- Plano: docs/cartoon-2026-2/03-modelo-de-dados.md §3.6 e 02-arquitetura-rotas-fases.md §2.6.
--
--  * edicao_publicacao — os 4 interruptores da edição que moram no banco (+ fase),
--    acionados pela organização, nunca por data, sempre com auditoria.
--  * publicacoes — a VERSÃO PÚBLICA congelada de cada participação. O site lê
--    daqui, nunca da linha viva: alteração em revisão não muda o que está no ar.
--  * montar_publico() — a LISTA FECHADA de campos públicos. Telefone do
--    responsável, e-mail, CNPJ, custos, notas de revisão e rascunho não existem
--    aqui, então não existem no navegador.
--  * edicao_publica() / participante_publico() — as ÚNICAS funções com grant para
--    anon desta camada. Nenhuma tabela ganha política para anon.

-- ---------------------------------------------------------------- interruptores
create table if not exists public.edicao_publicacao (
  edicao_codigo text primary key references public.edicoes(codigo) on update cascade,
  fase text not null default 'preparacao' check (fase in ('preparacao', 'pre_lancamento', 'em_andamento', 'encerrada')),
  participantes_publicos boolean not null default false,
  combos_publicos boolean not null default false,
  avaliacao_aberta boolean not null default false,
  avaliacao_abre_em timestamptz,
  avaliacao_fecha_em timestamptz,
  resultados_publicos boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  check (not combos_publicos or participantes_publicos),
  check (not avaliacao_aberta or (fase = 'em_andamento' and avaliacao_abre_em is not null
                                  and avaliacao_fecha_em is not null and avaliacao_fecha_em > avaliacao_abre_em)),
  check (not resultados_publicos or not avaliacao_aberta)
);
alter table public.edicao_publicacao enable row level security;
revoke all on public.edicao_publicacao from anon, authenticated;
insert into public.edicao_publicacao (edicao_codigo) values ('2026.2') on conflict do nothing;

-- ---------------------------------------------------------------- versões públicas
create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  versao int not null,
  nivel text not null check (nivel in ('marca', 'marca_e_combo')),
  conteudo jsonb not null,
  publicado_em timestamptz not null default now(),
  publicado_por text,
  vigente boolean not null default true,
  retirado_em timestamptz,
  retirado_por text,
  motivo_retirada text,
  unique (participacao_id, versao),
  check (not vigente or retirado_em is null)
);
create unique index if not exists publicacoes_uma_vigente on public.publicacoes (participacao_id) where vigente;
alter table public.publicacoes enable row level security;
revoke all on public.publicacoes from anon, authenticated;

-- Quem está agindo, para o histórico (pessoa da organização ou "senha da organização").
create or replace function public.rotulo_ator()
 returns text language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select coalesce(nullif(btrim(nome), ''), 'organização') from public.perfis where user_id = auth.uid()),
                  'senha da organização')
$$;
revoke all on function public.rotulo_ator() from public, anon, authenticated;

-- ---------------------------------------------------------------- o que falta para publicar
-- Códigos estáveis (o painel traduz): combo_nome · sem_unidade ·
-- unidade:<id>:endereco · unidade:<id>:modos · unidade:<id>:canais · unidade:<id>:horario ·
-- item:<posicao>:alimentar. Vale para enviar à revisão E para publicar o combo.
create or replace function public.pendencias_publicacao(p_participacao uuid)
 returns text[] language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_pa public.participacoes%rowtype; v_f text[] := '{}'; r record;
  alergenicos constant text[] := array['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'];
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then return array['participacao_nao_encontrada']; end if;
  if coalesce(btrim(v_pa.combo_nome), '') = '' then v_f := v_f || 'combo_nome'::text; end if;
  if not exists (select 1 from public.participacao_unidades where participacao_id = p_participacao and participa) then
    v_f := v_f || 'sem_unidade'::text;
  end if;
  for r in select pu.*, u.logradouro, u.bairro as u_bairro, u.cidade
             from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
            where pu.participacao_id = p_participacao and pu.participa order by pu.ordem loop
    if coalesce(btrim(r.logradouro), '') = '' or coalesce(btrim(r.u_bairro), '') = '' or coalesce(btrim(r.cidade), '') = '' then
      v_f := v_f || ('unidade:' || r.id_publico || ':endereco');
    end if;
    if 'nao_informado' in (r.consumo_local, r.retirada, r.delivery_combo) then
      v_f := v_f || ('unidade:' || r.id_publico || ':modos');
    end if;
    if r.delivery_combo = 'sim' and jsonb_array_length(coalesce(r.canais_delivery, '[]'::jsonb)) = 0 then
      v_f := v_f || ('unidade:' || r.id_publico || ':canais');
    end if;
    if not exists (select 1 from public.unidade_disponibilidade d where d.participacao_unidade_id = r.id) then
      v_f := v_f || ('unidade:' || r.id_publico || ':horario');
    end if;
  end loop;
  -- Cada componente responde TODOS os alergênicos da lista — "não sei" vale e
  -- grava nao_informado explícito; o que não pode é não ter perguntado.
  for r in select i.id, i.posicao from public.participantes_itens i where i.participacao_id = p_participacao order by i.posicao loop
    if (select count(distinct aspecto) from public.declaracoes_alimentares d
         where d.item_id = r.id and d.aspecto = any (alergenicos)) < array_length(alergenicos, 1) then
      v_f := v_f || ('item:' || r.posicao || ':alimentar');
    end if;
  end loop;
  return v_f;
end $$;
revoke all on function public.pendencias_publicacao(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- lista fechada de campos públicos
create or replace function public.montar_publico(p_participacao uuid, p_nivel text default 'marca_e_combo')
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype; v_e public.edicoes%rowtype;
  v_logo text; v_unidades jsonb; v_itens jsonb; v_fotos jsonb; v_combo jsonb := null;
  v_com_combo boolean := p_nivel = 'marca_e_combo';
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then return null; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id;
  select * into v_e from public.edicoes where codigo = v_pa.edicao_codigo;
  select path into v_logo from public.logos_marca where id = coalesce(v_pa.logo_id, v_p.logo_id);

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'id', pu.id_publico,
           'nome', u.nome_unidade,
           'endereco', jsonb_strip_nulls(jsonb_build_object(
              'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero, 'complemento', u.complemento,
              'bairro', coalesce(u.bairro, pu.bairro), 'cidade', u.cidade, 'uf', u.uf, 'referencia', u.referencia)),
           'coordenada', case when u.coordenada_verificada_em is not null and u.lat is not null
                              then jsonb_build_object('lat', u.lat, 'lng', u.lng) end,
           'whatsapp', case when u.whatsapp_autorizado then u.whatsapp_publico end,
           'horario_loja', u.horario_loja_texto,
           'fotos', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                       from public.midias_participacao m
                      where m.participacao_unidade_id = pu.id and m.papel = 'loja' and m.estado = 'aprovada'),
           'combo', case when v_com_combo then jsonb_strip_nulls(jsonb_build_object(
              'modos', jsonb_build_object('local', pu.consumo_local, 'retirada', pu.retirada, 'delivery', pu.delivery_combo),
              'canais', case when pu.delivery_combo = 'sim' then pu.canais_delivery end,
              'delivery_regioes', case when pu.delivery_combo = 'sim' then pu.delivery_regioes end,
              'delivery_taxa', case when pu.delivery_combo = 'sim' then pu.delivery_taxa end,
              'observacao', pu.observacao_combo,
              'disponibilidade', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                     'data', d.data, 'abre', to_char(d.abre, 'HH24:MI'), 'fecha', to_char(d.fecha, 'HH24:MI'),
                                     'observacao', d.observacao)) order by d.data, d.abre)
                                    from public.unidade_disponibilidade d where d.participacao_unidade_id = pu.id))) end
         )) order by pu.ordem), '[]'::jsonb)
    into v_unidades
    from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = p_participacao and pu.participa;

  if v_com_combo then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'tipo', i.tipo, 'posicao', i.posicao, 'nome', i.nome, 'descricao', i.descricao, 'ingredientes', i.ingredientes,
             'alimentar', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado, 'observacao', d.observacao)) order by d.aspecto)
                             from public.declaracoes_alimentares d where d.item_id = i.id),
             'substituicoes', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                  'original', s.original, 'alternativa', s.alternativa, 'disponibilidade', s.disponibilidade,
                                  'acrescimo', s.acrescimo, 'como_solicitar', s.como_solicitar,
                                  'modalidades', case when cardinality(s.modalidades) > 0 then to_jsonb(s.modalidades) end,
                                  'unidades', case when cardinality(s.unidades) > 0 then
                                                (select jsonb_agg(pu.id_publico) from public.participacao_unidades pu
                                                  where pu.id = any (s.unidades) and pu.participa) end,
                                  'alimentar', (select jsonb_agg(jsonb_build_object('aspecto', d.aspecto, 'estado', d.estado) order by d.aspecto)
                                                  from public.declaracoes_alimentares d where d.substituicao_id = s.id)
                               )) order by s.ordem, s.criado_em)
                                 from public.substituicoes s where s.item_id = i.id),
             'foto', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura)
                        from public.midias_participacao m
                       where m.item_id = i.id and m.papel = 'item' and m.estado = 'aprovada' order by m.ordem limit 1)
           )) order by i.posicao), '[]'::jsonb)
      into v_itens
      from public.participantes_itens i where i.participacao_id = p_participacao;

    select jsonb_strip_nulls(jsonb_build_object(
             'principal', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura,
                                                     'foco', case when m.foco_x is not null then jsonb_build_object('x', m.foco_x, 'y', m.foco_y) end)
                             from public.midias_participacao m
                            where m.participacao_id = p_participacao and m.papel = 'combo_principal' and m.estado = 'aprovada' limit 1),
             'galeria', (select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura) order by m.ordem)
                           from public.midias_participacao m
                          where m.participacao_id = p_participacao and m.papel = 'combo_galeria' and m.estado = 'aprovada')))
      into v_fotos;

    v_combo := jsonb_strip_nulls(jsonb_build_object(
      'nome', v_pa.combo_nome, 'descricao', v_pa.combo_descricao, 'condicoes', v_pa.combo_condicoes,
      'preco', v_e.valor_combo, 'itens', v_itens, 'fotos', v_fotos));
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'slug', v_pa.slug_publico,
    'nivel', p_nivel,
    'casa', jsonb_strip_nulls(jsonb_build_object(
      'nome', v_p.nome_marca, 'apresentacao', v_p.apresentacao_publica,
      'instagram', nullif(btrim(v_p.instagram), ''), 'site', nullif(btrim(v_p.site), ''),
      'logo', case when v_logo is not null then jsonb_build_object('bucket', 'logos', 'path', v_logo) end)),
    'unidades', v_unidades,
    'combo', v_combo));
end $$;
revoke all on function public.montar_publico(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- publicar e retirar
create or replace function public.publicar_participacao(p_secret text, p_participacao uuid, p_nivel text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype; v_slug text; v_base text; n int := 1;
  v_pend text[]; v_versao int; v_conteudo jsonb;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_nivel not in ('marca', 'marca_e_combo') then raise exception 'nivel_invalido'; end if;
  select * into v_pa from public.participacoes where id = p_participacao for update;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  if v_pa.status_cadastro = 'encerrado' then raise exception 'participacao_encerrada'; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id;

  if not exists (select 1 from public.participacao_unidades where participacao_id = p_participacao and participa) then
    return jsonb_build_object('ok', false, 'faltando', jsonb_build_array('sem_unidade'));
  end if;
  if p_nivel = 'marca_e_combo' then
    if v_pa.combo_status <> 'aprovado' then raise exception 'combo_nao_aprovado'; end if;
    v_pend := public.pendencias_publicacao(p_participacao);
    if array_length(v_pend, 1) is not null then return jsonb_build_object('ok', false, 'faltando', to_jsonb(v_pend)); end if;
  end if;

  -- Slug: gerado do nome oficial na 1ª publicação e congelado depois (QR impresso).
  v_slug := v_pa.slug_publico;
  if v_slug is null then
    v_base := public.slug_publico_de(v_p.nome_marca);
    if v_base is null then raise exception 'nome_sem_slug'; end if;
    v_slug := v_base;
    while exists (select 1 from public.participacoes where edicao_codigo = v_pa.edicao_codigo and slug_publico = v_slug and id <> p_participacao)
       or exists (select 1 from public.participacao_slug_aliases where edicao_codigo = v_pa.edicao_codigo and slug = v_slug and participacao_id <> p_participacao) loop
      n := n + 1; v_slug := v_base || '-' || n;
    end loop;
    update public.participacoes set slug_publico = v_slug where id = p_participacao;
  end if;

  v_conteudo := public.montar_publico(p_participacao, p_nivel);
  select coalesce(max(versao), 0) + 1 into v_versao from public.publicacoes where participacao_id = p_participacao;
  update public.publicacoes set vigente = false where participacao_id = p_participacao and vigente;
  insert into public.publicacoes (participacao_id, versao, nivel, conteudo, publicado_por)
  values (p_participacao, v_versao, p_nivel, v_conteudo, public.rotulo_ator());
  if p_nivel = 'marca_e_combo' then
    update public.participacoes set alterado_apos_aprovacao = false where id = p_participacao;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, ator_rotulo, detalhe)
  values ('publicacao.publicar', 'participacoes', p_participacao::text, v_pa.participante_id, p_participacao, public.rotulo_ator(),
          jsonb_build_object('versao', v_versao, 'nivel', p_nivel, 'slug', v_slug));
  perform public.notificar('marca', v_pa.participante_id, 'publicado',
    case when p_nivel = 'marca' then 'Sua casa foi publicada no site' else 'Sua página foi publicada no site' end,
    'A organização publicou a versão ' || v_versao || ' da sua página na Sweet & Coffee Week Cartoon.', 'inicio');
  return jsonb_build_object('ok', true, 'versao', v_versao, 'slug', v_slug);
end $$;

create or replace function public.retirar_publicacao(p_secret text, p_participacao uuid, p_motivo text)
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare v_part uuid; v_versao int;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'motivo_obrigatorio'; end if;
  update public.publicacoes set vigente = false, retirado_em = now(), retirado_por = public.rotulo_ator(),
         motivo_retirada = left(btrim(p_motivo), 300)
   where participacao_id = p_participacao and vigente returning versao into v_versao;
  if v_versao is null then raise exception 'nada_publicado'; end if;
  select participante_id into v_part from public.participacoes where id = p_participacao;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, ator_rotulo, detalhe)
  values ('publicacao.retirar', 'participacoes', p_participacao::text, v_part, p_participacao, public.rotulo_ator(),
          jsonb_build_object('versao', v_versao, 'motivo', left(btrim(p_motivo), 300)));
  perform public.notificar('marca', v_part, 'retirado', 'Sua página saiu do site', left(btrim(p_motivo), 200), 'inicio');
end $$;

-- ---------------------------------------------------------------- interruptores da edição
create or replace function public.definir_publicacao_edicao(p_secret text, p_edicao text, p_dados jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_de public.edicao_publicacao%rowtype; v_para public.edicao_publicacao%rowtype; k text;
begin
  -- D-18: participantes e combos públicos = curadoria (quem publica cada casa);
  -- fase, avaliação e resultados = edicao.gerir (administrador).
  if not public.pode(p_secret, 'edicao.gerir') then
    if not public.pode(p_secret, 'curadoria.decidir')
       or exists (select 1 from jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) k
                   where k not in ('participantes_publicos', 'combos_publicos')) then
      raise exception 'nao_autorizado';
    end if;
  end if;
  insert into public.edicao_publicacao (edicao_codigo) values (p_edicao) on conflict do nothing;
  select * into v_de from public.edicao_publicacao where edicao_codigo = p_edicao for update;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('fase', 'participantes_publicos', 'combos_publicos', 'avaliacao_aberta',
                 'avaliacao_abre_em', 'avaliacao_fecha_em', 'resultados_publicos') then
      raise exception 'campo_invalido';
    end if;
  end loop;
  update public.edicao_publicacao set
    fase = coalesce(p_dados ->> 'fase', fase),
    participantes_publicos = coalesce((p_dados ->> 'participantes_publicos')::boolean, participantes_publicos),
    combos_publicos = coalesce((p_dados ->> 'combos_publicos')::boolean, combos_publicos),
    avaliacao_aberta = coalesce((p_dados ->> 'avaliacao_aberta')::boolean, avaliacao_aberta),
    avaliacao_abre_em = case when p_dados ? 'avaliacao_abre_em' then (p_dados ->> 'avaliacao_abre_em')::timestamptz else avaliacao_abre_em end,
    avaliacao_fecha_em = case when p_dados ? 'avaliacao_fecha_em' then (p_dados ->> 'avaliacao_fecha_em')::timestamptz else avaliacao_fecha_em end,
    resultados_publicos = coalesce((p_dados ->> 'resultados_publicos')::boolean, resultados_publicos),
    atualizado_em = now(), atualizado_por = public.rotulo_ator()
   where edicao_codigo = p_edicao
  returning * into v_para;   -- as restrições da tabela barram combinação incoerente
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('publicacao.edicao', 'edicao_publicacao', p_edicao, public.rotulo_ator(),
          jsonb_build_object('de', to_jsonb(v_de) - 'atualizado_em' - 'atualizado_por',
                             'para', to_jsonb(v_para) - 'atualizado_em' - 'atualizado_por'));
  return to_jsonb(v_para);
end $$;

-- ---------------------------------------------------------------- projeção pública (anon)
-- O que cada fase esconde do conteúdo congelado: sem combos públicos, sai o
-- combo; edição encerrada vira registro (sem preço, horário, canais e WhatsApp).
create or replace function public.recortar_publico(p_conteudo jsonb, p_combos boolean, p_fase text)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select case when p_conteudo is null then null else
    jsonb_set(
      case when p_combos and p_fase <> 'encerrada' then p_conteudo
           when p_combos then jsonb_set(p_conteudo, '{combo}', coalesce(p_conteudo -> 'combo', '{}'::jsonb) - 'preco')
           else p_conteudo - 'combo' end,
      '{unidades}',
      coalesce((select jsonb_agg(case when not p_combos then u - 'combo'
                                      when p_fase = 'encerrada' then u - 'combo' - 'whatsapp' - 'horario_loja'
                                      else u end)
                  from jsonb_array_elements(p_conteudo -> 'unidades') u), '[]'::jsonb))
  end
$$;
revoke all on function public.recortar_publico(jsonb, boolean, text) from public, anon, authenticated;

create or replace function public.edicao_publica(p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_e public.edicoes%rowtype; v_c public.edicao_publicacao%rowtype; v_lista jsonb := '[]'::jsonb;
begin
  select * into v_e from public.edicoes where codigo = p_edicao;
  select * into v_c from public.edicao_publicacao where edicao_codigo = p_edicao;
  if v_e.codigo is null or v_c.edicao_codigo is null then return null; end if;
  if v_c.participantes_publicos then
    select coalesce(jsonb_agg(public.recortar_publico(pb.conteudo, v_c.combos_publicos and pb.nivel = 'marca_e_combo', v_c.fase)
                              order by lower(pb.conteudo #>> '{casa,nome}')), '[]'::jsonb)
      into v_lista
      from public.publicacoes pb join public.participacoes pa on pa.id = pb.participacao_id
     where pb.vigente and pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado';
  end if;
  return jsonb_build_object(
    'edicao', jsonb_build_object('codigo', v_e.codigo, 'tema', v_e.tema, 'inicio', v_e.festival_inicio, 'fim', v_e.festival_fim),
    'fase', v_c.fase,
    'participantes_publicos', v_c.participantes_publicos,
    'combos_publicos', v_c.combos_publicos,
    'avaliacao', jsonb_build_object(
      'aberta', coalesce(v_c.avaliacao_aberta and now() between v_c.avaliacao_abre_em and v_c.avaliacao_fecha_em, false),
      'abre_em', v_c.avaliacao_abre_em, 'fecha_em', v_c.avaliacao_fecha_em),
    'resultados_publicos', v_c.resultados_publicos,
    'participantes', v_lista);
end $$;

-- estado: publicado · retirado · nao_divulgado · inexistente. Sem participantes
-- públicos, qualquer slug responde "nao_divulgado" — não confirma quem participa.
create or replace function public.participante_publico(p_edicao text, p_slug text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_c public.edicao_publicacao%rowtype; v_pid uuid; v_pb public.publicacoes%rowtype;
begin
  select * into v_c from public.edicao_publicacao where edicao_codigo = p_edicao;
  if v_c.edicao_codigo is null or not v_c.participantes_publicos then
    return jsonb_build_object('estado', 'nao_divulgado');
  end if;
  select id into v_pid from public.participacoes where edicao_codigo = p_edicao and slug_publico = p_slug;
  if v_pid is null then
    select participacao_id into v_pid from public.participacao_slug_aliases where edicao_codigo = p_edicao and slug = p_slug;
  end if;
  if v_pid is null then return jsonb_build_object('estado', 'inexistente'); end if;
  select * into v_pb from public.publicacoes where participacao_id = v_pid and vigente;
  if v_pb.id is null or exists (select 1 from public.participacoes where id = v_pid and status_cadastro = 'encerrado') then
    return jsonb_build_object('estado', case when exists (select 1 from public.publicacoes where participacao_id = v_pid)
                                             then 'retirado' else 'inexistente' end);
  end if;
  return jsonb_build_object('estado', 'publicado', 'fase', v_c.fase,
    'participante', public.recortar_publico(v_pb.conteudo, v_c.combos_publicos and v_pb.nivel = 'marca_e_combo', v_c.fase));
end $$;

-- ---------------------------------------------------------------- prévias (não gravam versão)
create or replace function public.previa_publica(p_secret text, p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return public.montar_publico(p_participacao, 'marca_e_combo');
end $$;
create or replace function public.marca_previa_publica(p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  return jsonb_build_object('previa', public.montar_publico(p_participacao, 'marca_e_combo'),
                            'faltando', to_jsonb(public.pendencias_publicacao(p_participacao)));
end $$;

-- ---------------------------------------------------------------- concessões
revoke all on function public.publicar_participacao(text, uuid, text), public.retirar_publicacao(text, uuid, text),
  public.definir_publicacao_edicao(text, text, jsonb), public.previa_publica(text, uuid),
  public.edicao_publica(text), public.participante_publico(text, text), public.marca_previa_publica(uuid)
  from public, anon, authenticated;
-- Organização: o padrão do projeto (RPC chamada por anon com senha ou por conta pessoal; pode() decide).
grant execute on function public.publicar_participacao(text, uuid, text), public.retirar_publicacao(text, uuid, text),
  public.definir_publicacao_edicao(text, text, jsonb), public.previa_publica(text, uuid) to anon, authenticated;
grant execute on function public.marca_previa_publica(uuid) to authenticated;
-- Projeção pública: as únicas leituras abertas.
grant execute on function public.edicao_publica(text), public.participante_publico(text, text) to anon, authenticated;
