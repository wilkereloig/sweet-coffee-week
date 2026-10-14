-- Camada de edição Cartoon 2026.2 — fase 2, migration 3/3: REVISÃO E ORGANIZAÇÃO (14/10/2026).
-- Plano: docs/cartoon-2026-2/04-painel.md §4.4–4.5.
--
--  * alterado_apos_aprovacao: qualquer mudança em campo PÚBLICO de um combo já
--    aprovado marca a participação. Não muda o estado sozinho (o autosave
--    dispararia a cada tecla): a marca reenvia, e o reenvio leva a em_analise.
--    A versão publicada segue no ar até a organização publicar a nova.
--  * marca_concluir_cadastro passa a exigir também as pendências de publicação
--    (combo, unidades, modos, horário do combo, alergênicos respondidos).
--  * RPCs da organização: coordenada conferida, fotos, dados públicos do combo,
--    leitura da publicação (vigente × atual) e dos interruptores.

-- ---------------------------------------------------------------- alteração depois da aprovação
create or replace function public.marcar_alterado(p_participacao uuid)
 returns void language sql security definer set search_path to 'public'
as $$
  update public.participacoes set alterado_apos_aprovacao = true
   where id = p_participacao and combo_status = 'aprovado' and not alterado_apos_aprovacao
$$;
revoke all on function public.marcar_alterado(uuid) from public, anon, authenticated;

create or replace function public.participacao_alterou()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if old.combo_status = 'aprovado' and new.combo_status = 'aprovado'
     and (new.combo_nome, new.combo_descricao, new.combo_condicoes) is distinct from
         (old.combo_nome, old.combo_descricao, old.combo_condicoes) then
    new.alterado_apos_aprovacao := true;
  end if;
  return new;
end $$;
drop trigger if exists participacao_alterou on public.participacoes;
create trigger participacao_alterou before update on public.participacoes
  for each row execute function public.participacao_alterou();

create or replace function public.filho_alterou()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare r record; v_alvo uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_table_name = 'participantes_itens' then
    v_alvo := r.participacao_id;
  elsif tg_table_name = 'participacao_unidades' then
    v_alvo := r.participacao_id;
  elsif tg_table_name = 'unidade_disponibilidade' then
    select participacao_id into v_alvo from public.participacao_unidades where id = r.participacao_unidade_id;
  elsif tg_table_name = 'substituicoes' then
    select participacao_id into v_alvo from public.participantes_itens where id = r.item_id;
  elsif tg_table_name = 'declaracoes_alimentares' then
    select i.participacao_id into v_alvo from public.participantes_itens i
     where i.id = coalesce(r.item_id, (select item_id from public.substituicoes where id = r.substituicao_id));
  elsif tg_table_name = 'unidades' then
    perform public.marcar_alterado(pu.participacao_id) from public.participacao_unidades pu where pu.unidade_id = r.id;
    return null;
  elsif tg_table_name = 'participantes' then
    perform public.marcar_alterado(pa.id) from public.participacoes pa where pa.participante_id = r.id;
    return null;
  end if;
  if v_alvo is not null then perform public.marcar_alterado(v_alvo); end if;
  return null;
end $$;

drop trigger if exists itens_alterou on public.participantes_itens;
create trigger itens_alterou after update of nome, descricao, ingredientes on public.participantes_itens
  for each row execute function public.filho_alterou();
drop trigger if exists unidades_part_alterou on public.participacao_unidades;
create trigger unidades_part_alterou after insert or delete or update of participa, consumo_local, retirada, delivery_combo,
  canais_delivery, delivery_regioes, delivery_taxa, observacao_combo, unidade_id on public.participacao_unidades
  for each row execute function public.filho_alterou();
drop trigger if exists disponibilidade_alterou on public.unidade_disponibilidade;
create trigger disponibilidade_alterou after insert or update or delete on public.unidade_disponibilidade
  for each row execute function public.filho_alterou();
drop trigger if exists substituicoes_alterou on public.substituicoes;
create trigger substituicoes_alterou after insert or update or delete on public.substituicoes
  for each row execute function public.filho_alterou();
drop trigger if exists declaracoes_alterou on public.declaracoes_alimentares;
create trigger declaracoes_alterou after insert or update or delete on public.declaracoes_alimentares
  for each row execute function public.filho_alterou();
drop trigger if exists unidades_alterou on public.unidades;
create trigger unidades_alterou after update of nome_unidade, logradouro, numero, complemento, bairro, cidade, uf, referencia,
  whatsapp_publico, whatsapp_autorizado, horario_loja_texto on public.unidades
  for each row execute function public.filho_alterou();
drop trigger if exists participantes_alterou on public.participantes;
create trigger participantes_alterou after update of nome_marca, apresentacao_publica, instagram, site, logo_id on public.participantes
  for each row execute function public.filho_alterou();

-- ---------------------------------------------------------------- envio da marca
create or replace function public.marca_concluir_cadastro(p_participacao uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype;
  v_faltando text[] := '{}'; v_unidades int; v_item record; v_entrega boolean;
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
  if v_pa.combo_para_viagem is true and v_pa.custo_embalagem is null then v_faltando := v_faltando || 'custo_embalagem'::text; end if;
  select exists (select 1 from public.participacao_unidades where participacao_id = p_participacao and participa
                   and (faz_delivery or delivery_combo = 'sim')) into v_entrega;
  if v_entrega and v_pa.custo_delivery is null then v_faltando := v_faltando || 'custo_delivery'::text; end if;
  select count(*) into v_unidades from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
   where pu.participacao_id = p_participacao and pu.participa and coalesce(trim(coalesce(u.logradouro, pu.endereco)), '') <> '';
  if v_unidades = 0 then v_faltando := v_faltando || 'unidades'::text; end if;
  for v_item in select tipo, posicao, nome, descricao, ingredientes from public.participantes_itens
                 where participacao_id = p_participacao order by posicao loop
    if coalesce(trim(v_item.nome), '') = '' or coalesce(trim(v_item.descricao), '') = ''
       or coalesce(trim(v_item.ingredientes), '') = '' then
      v_faltando := v_faltando || (case when v_item.posicao = 2 and v_item.tipo = 'doce' then 'item_segundo'
                                        else 'item_' || v_item.tipo end)::text;
    end if;
  end loop;
  -- Camada de edição: o que a página pública precisa (mesma regra de publicar).
  v_faltando := v_faltando || array(select x from unnest(public.pendencias_publicacao(p_participacao)) x
                                     where x not in ('sem_unidade') or v_unidades > 0);
  if array_length(v_faltando, 1) is not null then
    return jsonb_build_object('ok', false, 'faltando', to_jsonb(v_faltando));
  end if;
  update public.participacoes set status_cadastro = 'cadastro_completo' where id = p_participacao;
  -- Reenvio de alteração em combo já aprovado: volta para a fila da organização.
  -- A versão publicada continua no ar (o site lê publicacoes, não esta linha).
  if v_pa.combo_status = 'aprovado' and v_pa.alterado_apos_aprovacao then
    update public.participacoes set combo_status = 'em_analise' where id = p_participacao;
  end if;
  update public.quero_participar set status = 'cadastro_completo' where id = v_p.origem_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id)
       values ('concluir_cadastro', 'participacoes', p_participacao::text, p_participacao);
  return jsonb_build_object('ok', true);
end $function$;

-- O estado da própria publicação, para o painel da marca.
create or replace function public.marca_minha_publicacao(p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_pb public.publicacoes%rowtype; v_pa public.participacoes%rowtype;
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  select * into v_pb from public.publicacoes where participacao_id = p_participacao order by versao desc limit 1;
  return jsonb_build_object(
    'estado', case when v_pb.id is null then 'nao_publicado' when v_pb.vigente then 'publicado' else 'retirado' end,
    'versao', v_pb.versao, 'nivel', v_pb.nivel, 'publicado_em', v_pb.publicado_em,
    'motivo_retirada', v_pb.motivo_retirada, 'slug', v_pa.slug_publico,
    'alterado_apos_aprovacao', v_pa.alterado_apos_aprovacao);
end $$;

-- ---------------------------------------------------------------- organização
create or replace function public.org_verificar_coordenada(p_secret text, p_unidade uuid, p_lat numeric, p_lng numeric)
 returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.unidades set lat = p_lat, lng = p_lng,
         coordenada_verificada_em = case when p_lat is null then null else now() end,
         coordenada_verificada_por = case when p_lat is null then null else public.rotulo_ator() end
   where id = p_unidade;
  if not found then raise exception 'unidade_nao_encontrada'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, ator_rotulo, detalhe)
  values ('unidade.coordenada', 'unidades', p_unidade::text, public.rotulo_ator(), jsonb_build_object('lat', p_lat, 'lng', p_lng));
end $$;

-- Foto oficial: a organização sobe o arquivo (Edge Function arquivo-url, bucket
-- edicao-publico) e registra aqui. Nasce "enviada"; só "aprovada" vai para o site.
create or replace function public.org_salvar_midia(p_secret text, p_dados jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare v_id uuid := nullif(p_dados ->> 'id', '')::uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_id is null then
    insert into public.midias_participacao (participacao_id, item_id, participacao_unidade_id, papel, origem, path,
                                            largura, altura, alt, credito, ordem, criado_por)
    values ((p_dados ->> 'participacao_id')::uuid, nullif(p_dados ->> 'item_id', '')::uuid,
            nullif(p_dados ->> 'participacao_unidade_id', '')::uuid, p_dados ->> 'papel',
            coalesce(p_dados ->> 'origem', 'sessao_oficial'), p_dados ->> 'path',
            nullif(p_dados ->> 'largura', '')::int, nullif(p_dados ->> 'altura', '')::int,
            nullif(btrim(p_dados ->> 'alt'), ''), nullif(btrim(p_dados ->> 'credito'), ''),
            coalesce(nullif(p_dados ->> 'ordem', '')::smallint, 1), public.rotulo_ator())
    returning id into v_id;
  else
    update public.midias_participacao set
      papel = coalesce(p_dados ->> 'papel', papel),
      item_id = case when p_dados ? 'item_id' then nullif(p_dados ->> 'item_id', '')::uuid else item_id end,
      alt = case when p_dados ? 'alt' then nullif(btrim(p_dados ->> 'alt'), '') else alt end,
      credito = case when p_dados ? 'credito' then nullif(btrim(p_dados ->> 'credito'), '') else credito end,
      foco_x = case when p_dados ? 'foco_x' then nullif(p_dados ->> 'foco_x', '')::numeric else foco_x end,
      foco_y = case when p_dados ? 'foco_y' then nullif(p_dados ->> 'foco_y', '')::numeric else foco_y end,
      ordem = coalesce(nullif(p_dados ->> 'ordem', '')::smallint, ordem)
     where id = v_id;
    if not found then raise exception 'midia_nao_encontrada'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.org_decidir_midia(p_secret text, p_id uuid, p_estado text)
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare v_pa uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_estado not in ('enviada', 'aprovada', 'recusada') then raise exception 'estado_invalido'; end if;
  update public.midias_participacao set estado = p_estado where id = p_id returning participacao_id into v_pa;
  if v_pa is null then raise exception 'midia_nao_encontrada'; end if;
  perform public.marcar_alterado(v_pa);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, ator_rotulo, detalhe)
  values ('midia.' || p_estado, 'midias_participacao', p_id::text, v_pa, public.rotulo_ator(), '{}'::jsonb);
end $$;

-- Dados públicos do combo editados pela organização (cadastro.editar). O slug só
-- muda antes da 1ª publicação; depois, o antigo vira alias (QR impresso segue valendo).
create or replace function public.org_salvar_dados_publicos(p_secret text, p_participacao uuid, p_dados jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare v_pa public.participacoes%rowtype; k text; v_slug text;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao for update;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('combo_nome', 'combo_descricao', 'combo_condicoes', 'slug_publico') then raise exception 'campo_invalido'; end if;
  end loop;
  if p_dados ? 'slug_publico' then
    v_slug := nullif(btrim(p_dados ->> 'slug_publico'), '');
    if v_slug is distinct from v_pa.slug_publico then
      if v_pa.slug_publico is not null and exists (select 1 from public.publicacoes where participacao_id = p_participacao) then
        insert into public.participacao_slug_aliases (edicao_codigo, slug, participacao_id)
        values (v_pa.edicao_codigo, v_pa.slug_publico, p_participacao) on conflict do nothing;
      end if;
      update public.participacoes set slug_publico = v_slug where id = p_participacao;
    end if;
  end if;
  update public.participacoes set
    combo_nome = case when p_dados ? 'combo_nome' then nullif(btrim(p_dados ->> 'combo_nome'), '') else combo_nome end,
    combo_descricao = case when p_dados ? 'combo_descricao' then nullif(btrim(p_dados ->> 'combo_descricao'), '') else combo_descricao end,
    combo_condicoes = case when p_dados ? 'combo_condicoes' then nullif(btrim(p_dados ->> 'combo_condicoes'), '') else combo_condicoes end
   where id = p_participacao;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, ator_rotulo, detalhe)
  values ('publicacao.dados', 'participacoes', p_participacao::text, p_participacao, public.rotulo_ator(), p_dados);
end $$;

-- Ficha de publicação: versão no ar × o que seria publicado agora, pendências,
-- fotos, unidades com coordenada — tudo que a organização precisa para decidir.
create or replace function public.get_publicacao(p_secret text, p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_pa public.participacoes%rowtype; v_pb public.publicacoes%rowtype;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  select * into v_pb from public.publicacoes where participacao_id = p_participacao order by versao desc limit 1;
  return jsonb_build_object(
    'estado', case when v_pb.id is null then 'nao_publicado' when v_pb.vigente then 'publicado' else 'retirado' end,
    'vigente', case when v_pb.vigente then jsonb_build_object('versao', v_pb.versao, 'nivel', v_pb.nivel,
                     'publicado_em', v_pb.publicado_em, 'publicado_por', v_pb.publicado_por, 'conteudo', v_pb.conteudo) end,
    'ultima', case when v_pb.id is not null then jsonb_build_object('versao', v_pb.versao, 'retirado_em', v_pb.retirado_em,
                     'retirado_por', v_pb.retirado_por, 'motivo', v_pb.motivo_retirada) end,
    'atual', public.montar_publico(p_participacao, 'marca_e_combo'),
    'pendencias', to_jsonb(public.pendencias_publicacao(p_participacao)),
    'combo_status', v_pa.combo_status,
    'alterado_apos_aprovacao', v_pa.alterado_apos_aprovacao,
    'slug', v_pa.slug_publico,
    'midias', (select coalesce(jsonb_agg(to_jsonb(m) order by m.papel, m.ordem), '[]'::jsonb)
                 from public.midias_participacao m where m.participacao_id = p_participacao),
    'unidades', (select coalesce(jsonb_agg(jsonb_build_object(
                   'participacao_unidade_id', pu.id, 'unidade_id', u.id, 'id_publico', pu.id_publico, 'participa', pu.participa,
                   'nome', u.nome_unidade, 'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero,
                   'bairro', coalesce(u.bairro, pu.bairro), 'cidade', u.cidade, 'lat', u.lat, 'lng', u.lng,
                   'coordenada_verificada_em', u.coordenada_verificada_em, 'coordenada_verificada_por', u.coordenada_verificada_por)
                   order by pu.ordem), '[]'::jsonb)
                   from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
                  where pu.participacao_id = p_participacao));
end $$;

-- Linha por participação da edição, para a lista e os filtros do painel.
create or replace function public.get_publicacoes_edicao(p_secret text, p_edicao text)
 returns table (participacao_id uuid, participante_id uuid, nome_marca text, combo_status text, alterado_apos_aprovacao boolean,
                estado_publicacao text, versao int, nivel text, publicado_em timestamptz, pendencias int, slug text)
 language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return query
  select pa.id, pa.participante_id, pt.nome_marca, pa.combo_status, pa.alterado_apos_aprovacao,
         case when ult.id is null then 'nao_publicado' when ult.vigente then 'publicado' else 'retirado' end,
         ult.versao, ult.nivel, ult.publicado_em,
         coalesce(array_length(public.pendencias_publicacao(pa.id), 1), 0), pa.slug_publico
    from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
    left join lateral (select * from public.publicacoes pb where pb.participacao_id = pa.id order by versao desc limit 1) ult on true
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and pt.arquivado_em is null
   order by lower(pt.nome_marca);
end $$;

create or replace function public.get_publicacao_edicao(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return (select to_jsonb(c) from public.edicao_publicacao c where edicao_codigo = p_edicao);
end $$;

revoke all on function public.marca_minha_publicacao(uuid), public.org_verificar_coordenada(text, uuid, numeric, numeric),
  public.org_salvar_midia(text, jsonb), public.org_decidir_midia(text, uuid, text),
  public.org_salvar_dados_publicos(text, uuid, jsonb), public.get_publicacao(text, uuid),
  public.get_publicacoes_edicao(text, text), public.get_publicacao_edicao(text, text) from public, anon, authenticated;
grant execute on function public.marca_minha_publicacao(uuid) to authenticated;
grant execute on function public.org_verificar_coordenada(text, uuid, numeric, numeric), public.org_salvar_midia(text, jsonb),
  public.org_decidir_midia(text, uuid, text), public.org_salvar_dados_publicos(text, uuid, jsonb),
  public.get_publicacao(text, uuid), public.get_publicacoes_edicao(text, text), public.get_publicacao_edicao(text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------- reverter (só em emergência; ler antes)
-- drop function if exists public.edicao_publica(text), public.participante_publico(text, text), ... ;
-- drop table if exists public.publicacoes, public.edicao_publicacao, public.midias_participacao,
--   public.declaracoes_alimentares, public.substituicoes, public.unidade_disponibilidade, public.participacao_slug_aliases;
-- alter table public.participacao_unidades drop column if exists unidade_id, ...;  drop table if exists public.unidades;
-- marca_concluir_cadastro: recriar a versão de 20261002_valor_combo_edicao.sql.
-- Dados das 4 tabelas originais: backup_20261014.{participacoes,participacao_unidades,participantes_itens,participantes}.
