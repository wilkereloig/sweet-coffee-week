-- 28/10/2026 (pedido do Wilker): o participante preenche TODO o endereço (rua, número, bairro, cidade e CEP) e não
-- tem nada a ver com a conferência do ponto no mapa — essa é só da administração, numa fila única e simples.
--
-- 1) pendencias_publicacao: o endereço da unidade só está completo com rua, NÚMERO, bairro, cidade e CEP.
--    (Mesma função de 20261107_horario_festival.sql; só a condição do endereço mudou.) Marca sem número escreve "S/N".
-- 2) get_localizacoes_unidades: uma linha por unidade que participa da edição, com o endereço, o ponto gravado (se
--    houver) e quem/quando conferiu — alimenta Participantes › Localizações. A conferência em si continua sendo
--    org_verificar_coordenada (producao.gerir), que já existia.
--
-- Não altera dado nenhum: só a regra do que "falta" e uma leitura nova. Reversão em supabase/reverter/.

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
  for r in select pu.*, u.logradouro, u.numero as u_numero, u.cep as u_cep, u.bairro as u_bairro, u.cidade
             from public.participacao_unidades pu left join public.unidades u on u.id = pu.unidade_id
            where pu.participacao_id = p_participacao and pu.participa order by pu.ordem loop
    -- Endereço completo (28/10/2026): rua, número, bairro, cidade e CEP.
    if coalesce(btrim(r.logradouro), '') = '' or coalesce(btrim(r.u_numero), '') = '' or coalesce(btrim(r.u_bairro), '') = ''
       or coalesce(btrim(r.cidade), '') = '' or coalesce(btrim(r.u_cep), '') = '' then
      v_f := v_f || ('unidade:' || r.id_publico || ':endereco');
    end if;
    if 'nao_informado' in (r.consumo_local, r.retirada, r.delivery_combo) then
      v_f := v_f || ('unidade:' || r.id_publico || ':modos');
    end if;
    if r.delivery_combo = 'sim' and jsonb_array_length(coalesce(r.canais_delivery, '[]'::jsonb)) = 0 then
      v_f := v_f || ('unidade:' || r.id_publico || ':canais');
    end if;
    -- Horário no festival (23/10/2026): períodos em participacao_unidades.horario_festival; [] = ainda não respondido.
    if jsonb_array_length(coalesce(r.horario_festival, '[]'::jsonb)) = 0 then
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
end $function$;
revoke all on function public.pendencias_publicacao(uuid) from public, anon, authenticated;

-- ── Fila de localizações (Participantes › Localizações) ─────────────────────────────────────────────
-- Só leitura, `dado.ler`. Unidades que participam da edição, de marca não encerrada nem arquivada, com cadastro
-- permanente (`unidade_id`). A que ainda não foi conferida vem primeiro; dentro de cada grupo, por marca e ordem.
create or replace function public.get_localizacoes_unidades(p_secret text, p_edicao text)
returns table (participacao_unidade_id uuid, unidade_id uuid, participante_id uuid, nome_marca text, id_publico text,
               nome_unidade text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text, cep text,
               lat numeric, lng numeric, coordenada_verificada_em timestamptz, coordenada_verificada_por text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return query
  select pu.id, u.id, pa.participante_id, pt.nome_marca, pu.id_publico,
         u.nome_unidade, u.logradouro, u.numero, u.complemento, u.bairro, u.cidade, u.uf, u.cep,
         u.lat, u.lng, u.coordenada_verificada_em, u.coordenada_verificada_por
    from public.participacao_unidades pu
    join public.unidades u on u.id = pu.unidade_id
    join public.participacoes pa on pa.id = pu.participacao_id
    join public.participantes pt on pt.id = pa.participante_id
   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado' and pt.arquivado_em is null and pu.participa
   order by (u.coordenada_verificada_em is not null), lower(pt.nome_marca), pu.ordem;
end $$;
revoke all on function public.get_localizacoes_unidades(text, text) from public;
grant execute on function public.get_localizacoes_unidades(text, text) to anon, authenticated;
