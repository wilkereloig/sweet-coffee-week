-- Caça aos Carimbos: confere e aprova sozinho os pedidos de "visita anterior" que chegam com foto.
-- Pedido do Wilker (10/11/2026): "cria uma automação para conferir e aceitar a solicitação dos carimbos".
-- Usa a MESMA função de decisão do painel (caca_excecao_decidir): janela, 12 h, duplicidade, QR, auditoria e evento
-- continuam valendo. O que não passa nas conferências, ou que o banco recusa, fica pendente para a organização.
-- Liga/desliga: update caca_config set valor = 'false'::jsonb where chave = 'auto_aprovar_visita_anterior';
-- Reversão: supabase/reverter/20270121_caca_auto_aprovar_visita_anterior.sql

insert into public.caca_config (chave, valor, nota, atualizado_por)
values ('auto_aprovar_visita_anterior', 'true'::jsonb,
        'Aprova sozinho pedido de visita anterior com foto e data válida (job scw-caca-auto-aprovar, a cada 2 min).', 'Wilker Eloi')
on conflict (chave) do nothing;

create or replace function public.caca_excecao_auto_aprovar()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record; v_ligado boolean; v_ini date; v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_ok int := 0; v_pula int := 0; v_falhas jsonb := '[]'::jsonb;
begin
  select coalesce((valor)::text = 'true', false) into v_ligado from public.caca_config where chave = 'auto_aprovar_visita_anterior';
  if not coalesce(v_ligado, false) then return jsonb_build_object('ligado', false); end if;

  perform set_config('scw.sistema_ativo', 'on', true);
  perform set_config('scw.ator_rotulo', 'Automação (visita anterior com foto)', true);

  for r in
    select e.id, e.edicao_codigo, e.visita_data, e.criado_em
      from public.caca_carimbo_excecao e
     where e.estado = 'pendente' and e.motivo = 'visita_anterior'
       and e.imagem_path is not null and e.imagem_removida_em is null
     order by e.criado_em
  loop
    select (avaliacao_abre_em at time zone 'America/Fortaleza')::date into v_ini from public.edicao_publicacao where edicao_codigo = r.edicao_codigo;
    -- conferência da data: informada, dentro do festival e nunca no futuro
    if r.visita_data is null or v_ini is null or r.visita_data < v_ini or r.visita_data > v_hoje then
      v_pula := v_pula + 1; continue;
    end if;
    begin
      perform public.caca_excecao_decidir(null, r.id, 'aprovar', 'Aprovado pela automação: foto enviada e data da visita dentro do festival');
      v_ok := v_ok + 1;
    exception when others then
      v_pula := v_pula + 1;
      v_falhas := v_falhas || jsonb_build_object('pedido', r.id, 'erro', sqlerrm);
    end;
  end loop;

  perform set_config('scw.sistema_ativo', '', true);
  perform set_config('scw.ator_rotulo', '', true);
  return jsonb_build_object('ligado', true, 'aprovados', v_ok, 'pulados', v_pula, 'falhas', v_falhas);
end $$;

revoke all on function public.caca_excecao_auto_aprovar() from public, anon, authenticated;

select cron.schedule('scw-caca-auto-aprovar', '*/2 * * * *', 'select public.caca_excecao_auto_aprovar()');
