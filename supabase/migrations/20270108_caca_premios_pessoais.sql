-- Caça: aviso imediato do voucher confirmado e cartão pessoal na aba Prêmios.
-- A lista pública continua sem nomes; cada participante só lê os prêmios ligados ao mapa autenticado pela chave.
-- Reverter: supabase/reverter/20270108_caca_premios_pessoais.sql

create or replace function public.caca_meus_premios(p_chave text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  select * into m
    from public.mapas_lover
   where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then
    return jsonb_build_object('premios', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'premios', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'tipo', p.tipo,
        'dia', p.dia,
        'estado', p.estado,
        'prazo_ate', p.prazo_ate,
        'valido_ate', p.detalhe ->> 'valido_ate'
      ) order by p.dia desc nulls last, p.criado_em desc), '[]'::jsonb)
        from public.caca_premio p
       where p.edicao_codigo = m.edicao_codigo
         and p.mapa_id = m.id
         and p.tipo = 'voucher_dia'
         and p.estado in ('selecionado', 'confirmado', 'entregue')
    )
  );
end $$;
revoke all on function public.caca_meus_premios(text) from public, anon, authenticated;
grant execute on function public.caca_meus_premios(text) to anon, authenticated;

create or replace function public.caca_premio_aviso_confirmado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_auto jsonb; v_aviso uuid; v_titulo text; v_corpo text;
begin
  if new.estado <> 'confirmado' or new.mapa_id is null or new.tipo not in ('voucher_dia', 'final') then return new; end if;
  if tg_op = 'UPDATE' then
    if old.estado is not distinct from new.estado then return new; end if;
  end if;

  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return new; end if;

  v_titulo := case when new.tipo = 'voucher_dia' then 'Você ganhou um voucher!' else 'Seu prêmio foi confirmado!' end;
  v_corpo := case when new.tipo = 'voucher_dia'
    then 'Seu voucher do dia ' || to_char(new.dia, 'DD/MM') || ' está confirmado. Veja os detalhes e acompanhe as orientações em Prêmios.'
    else 'Seu prêmio final está confirmado. Veja os detalhes e acompanhe as orientações em Prêmios.' end;

  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (new.edicao_codigo, 'premio', left(v_titulo, 80), left(v_corpo, 240), '/cartoon/mapa?painel=premios',
          jsonb_build_object('tipo', 'mapas', 'ids', jsonb_build_array(new.mapa_id)), 'enviado', 'automatico',
          'premio:' || new.id || ':confirmado', 'premio', now(), 'premio', 1)
  on conflict (chave_dedupe) do nothing returning id into v_aviso;

  if v_aviso is not null then
    insert into public.caca_aviso_entrega (aviso_id, mapa_id) values (v_aviso, new.mapa_id) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.caca_premio_aviso_confirmado() from public, anon, authenticated;

drop trigger if exists caca_premio_aviso_confirmado on public.caca_premio;
create trigger caca_premio_aviso_confirmado
  after insert or update of estado on public.caca_premio
  for each row execute function public.caca_premio_aviso_confirmado();
