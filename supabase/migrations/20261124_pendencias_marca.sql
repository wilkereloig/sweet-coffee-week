-- 02/11/2026 (pedido do Wilker: "corrige também a porcentagem e o início do painel"). O Início da marca lê o `faltando` de
-- `marca_previa_publica`; ele passa a trazer também o que a tela "Meu combo" já cobra desde 20261123:
--   combo_descricao                      descrição do combo
--   troca:<posição>:<n>:descricao        troca n (na ordem do painel: ordem, criado_em) sem descrição
--   troca:<posição>:<n>:alimentar        troca n sem resposta para os 8 alergênicos (mesma regra do item)
-- ⚠️ Fica FORA de `pendencias_publicacao` de propósito: ela trava `publicar_participacao` e `marca_concluir_cadastro`, e as
-- trocas antigas não têm descrição (campo novo). O site de ninguém deixa de ser publicado por isso.
-- Teste: supabase/testes/pendencias-marca.sql.

create or replace function public.pendencias_marca(p_participacao uuid)
 returns text[] language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_f text[] := public.pendencias_publicacao(p_participacao); r record;
  alergenicos constant text[] := array['gluten', 'leite', 'ovo', 'amendoim', 'castanhas', 'soja', 'peixe', 'crustaceos'];
begin
  if 'participacao_nao_encontrada' = any (v_f) then return v_f; end if;
  if exists (select 1 from public.participacoes where id = p_participacao and coalesce(btrim(combo_descricao), '') = '') then
    v_f := v_f || 'combo_descricao'::text;
  end if;
  for r in select i.posicao, s.id, s.descricao,
                  row_number() over (partition by i.id order by s.ordem, s.criado_em) as n
             from public.participantes_itens i join public.substituicoes s on s.item_id = i.id
            where i.participacao_id = p_participacao order by i.posicao, s.ordem, s.criado_em loop
    if coalesce(btrim(r.descricao), '') = '' then v_f := v_f || ('troca:' || r.posicao || ':' || r.n || ':descricao'); end if;
    if (select count(distinct aspecto) from public.declaracoes_alimentares d
         where d.substituicao_id = r.id and d.aspecto = any (alergenicos)) < array_length(alergenicos, 1) then
      v_f := v_f || ('troca:' || r.posicao || ':' || r.n || ':alimentar');
    end if;
  end loop;
  return v_f;
end $function$;
revoke all on function public.pendencias_marca(uuid) from public, anon, authenticated;

create or replace function public.marca_previa_publica(p_participacao uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.marca_dona_participacao(p_participacao) then raise exception 'nao_autorizado'; end if;
  return jsonb_build_object('previa', public.montar_publico(p_participacao, 'marca_e_combo'),
                            'faltando', to_jsonb(public.pendencias_marca(p_participacao)));
end $function$;
