-- Reversão de 20261120_endereco_completo_e_fila_de_localizacao.sql: o endereço volta a exigir só rua, bairro e cidade
-- (a regra de 20261107_horario_festival.sql) e a fila de localizações deixa de ter leitura no banco.
-- Não mexe em dado: só em duas funções.

create or replace function public.pendencias_publicacao(p_participacao uuid)
returns text[] language plpgsql stable security definer set search_path to 'public' as $function$
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
    if jsonb_array_length(coalesce(r.horario_festival, '[]'::jsonb)) = 0 then
      v_f := v_f || ('unidade:' || r.id_publico || ':horario');
    end if;
  end loop;
  for r in select i.id, i.posicao from public.participantes_itens i where i.participacao_id = p_participacao order by i.posicao loop
    if (select count(distinct aspecto) from public.declaracoes_alimentares d
         where d.item_id = r.id and d.aspecto = any (alergenicos)) < array_length(alergenicos, 1) then
      v_f := v_f || ('item:' || r.posicao || ':alimentar');
    end if;
  end loop;
  return v_f;
end $function$;
revoke all on function public.pendencias_publicacao(uuid) from public, anon, authenticated;

drop function if exists public.get_localizacoes_unidades(text, text);
