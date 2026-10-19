-- Ingredientes deixam de ser obrigatórios (19/10/2026, pedido do Wilker): a organização só
-- precisa do nome, da descrição e das informações de alergênicos de cada item.
-- * campos_cadastro: o item passa de 3 para 2 campos obrigatórios (total fixo 16 → 13);
-- * marca_concluir_cadastro: "item completo" = nome + descrição.
-- A coluna participantes_itens.ingredientes continua (dado antigo preservado, ainda lido
-- pela página pública e pelo painel); só deixou de ser exigida. Mudou aqui, muda em
-- painel-app/src/lib/guia.js (camposObrigatorios) e cadastro.js (itemCompleto).

create or replace function public.campos_cadastro(p_participacao uuid)
 returns table(total integer, faltando integer)
 language sql stable security definer set search_path to 'public'
as $function$
  with pa as (select * from public.participacoes where id = p_participacao),
       p as (select pt.* from public.participantes pt join pa on pa.participante_id = pt.id),
       it as (select i.* from public.participantes_itens i where i.participacao_id = p_participacao),
       entrega as (select exists (select 1 from public.participacao_unidades u
                                   where u.participacao_id = p_participacao and u.faz_delivery) as sim),
       vazios as (
         select (case when coalesce(btrim(p.nome_marca), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.responsavel), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.telefone), '') = '' then 1 else 0 end)
              + (case when pa.logo_id is null then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_combo), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_justificativa), '') = '' then 1 else 0 end)
              + (case when pa.combo_para_viagem is true and pa.custo_embalagem is null then 1 else 0 end)
              + (case when (select sim from entrega) and pa.custo_delivery is null then 1 else 0 end)
              + (case when exists (select 1 from public.participacao_unidades u where u.participacao_id = p_participacao
                                      and coalesce(btrim(u.endereco), '') <> '') then 0 else 1 end) as n,
                13 + (case when pa.combo_para_viagem is true then 1 else 0 end)
                   + (case when (select sim from entrega) then 1 else 0 end) as t
           from pa, p)
  select (select t from vazios),
         (select n from vazios)
         + (select coalesce(sum((case when coalesce(btrim(nome), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(descricao), '') = '' then 1 else 0 end)), 0)::int from it)
         + 2 * greatest(0, 3 - (select count(*)::int from it))
$function$;

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
  for v_item in select tipo, posicao, nome, descricao from public.participantes_itens
                 where participacao_id = p_participacao order by posicao loop
    if coalesce(trim(v_item.nome), '') = '' or coalesce(trim(v_item.descricao), '') = '' then
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
