-- 03/11/2026 (Wilker, ao ver o Marlon cobrado por "Escrever a descrição da troca 1 da bebida" depois de ele ter dito que a água
-- sem gás já se define pelo título): a DESCRIÇÃO da troca passa a ser OPCIONAL. `pendencias_marca` (20261124) deixa de listar
-- `troca:<posição>:<n>:descricao`; segue listando `combo_descricao` e `troca:…:alimentar` (os 8 alergênicos continuam obrigatórios).
-- `pendencias_publicacao` não mudou (nunca cobrou descrição de troca). Teste: supabase/testes/pendencias-marca.sql.
-- Reversão: reaplicar o corpo de 20261124_pendencias_marca.sql.
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
  for r in select i.posicao, s.id,
                  row_number() over (partition by i.id order by s.ordem, s.criado_em) as n
             from public.participantes_itens i join public.substituicoes s on s.item_id = i.id
            where i.participacao_id = p_participacao order by i.posicao, s.ordem, s.criado_em loop
    if (select count(distinct aspecto) from public.declaracoes_alimentares d
         where d.substituicao_id = r.id and d.aspecto = any (alergenicos)) < array_length(alergenicos, 1) then
      v_f := v_f || ('troca:' || r.posicao || ':' || r.n || ':alimentar');
    end if;
  end loop;
  return v_f;
end $function$;
revoke all on function public.pendencias_marca(uuid) from public, anon, authenticated;
