-- 03/11/2026 (Wilker: "revise todos os dados"). `sistema_textos_sem_revisao` = os textos livres da marca que ainda NÃO têm revisão
-- para o ORIGINAL de hoje (a revisão à mão do Word v3.1 e as automáticas ficam como estão; o que mudou depois volta a ser revisado).
-- Usada pela edge function `processar-preenchimento` tanto no envio novo quanto no modo `revisar_participacao`.
create or replace function public.sistema_textos_sem_revisao(p_participacao uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from jsonb_array_elements(public.sistema_textos_para_revisar(p_participacao)) t
   where not exists (select 1 from public.revisoes_texto r
                      where r.participacao_id = p_participacao and r.campo = t ->> 'campo' and r.original = t ->> 'original')
$$;
revoke all on function public.sistema_textos_sem_revisao(uuid) from public, anon, authenticated;
grant execute on function public.sistema_textos_sem_revisao(uuid) to service_role;
