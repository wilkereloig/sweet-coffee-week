-- Campanha "Ter com quem contar" (Sicredi): o aviso diário dizia "até 11/11" mesmo depois da prorrogação para 13/11 (10/11/2026).
-- Causa: o corpo do aviso estava escrito à mão na função; a data de `caca_config.campanha_sicredi.fim` só decidia quando parar.
-- Agora o texto lê a data da configuração. Mudar o prazo de novo = mudar só `fim`.
-- Também: o padrão de `fim` passa a 2026-11-13 e os avisos já enviados com a data antiga têm o texto corrigido (só o texto,
-- sem novo envio: nada aqui cria entrega nem push).

create or replace function public.caca_campanha_gerar(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_auto jsonb; v_cfg jsonb; v_ed text; v_loc timestamp; v_dia date; v_h int; v_hora int; v_jan int; v_fim date;
  v_dest text; v_chave text; v_titulo text; v_corpo text; v_ate timestamptz; v_id uuid; v_novo boolean := false; v_n int; v_ids jsonb;
begin
  select valor into v_auto from public.caca_config where chave = 'avisos_auto';
  if coalesce((v_auto ->> 'ligado')::boolean, false) is not true then return jsonb_build_object('ok', true, 'ligado', false); end if;
  v_cfg := '{"ligada":false,"fim":"2026-11-13","hora":10,"janela_horas":4,"destino":"/cartoon/ter-com-quem-contar"}'::jsonb
        || coalesce((select case when jsonb_typeof(valor) = 'object' then valor end from public.caca_config where chave = 'campanha_sicredi'), '{}'::jsonb);
  if coalesce((v_cfg ->> 'ligada')::boolean, false) is not true then return jsonb_build_object('ok', true, 'campanha', false); end if;

  select edicao_codigo into v_ed from public.edicao_publicacao order by edicao_codigo desc limit 1;
  if v_ed is null then return jsonb_build_object('ok', true, 'sem_edicao', true); end if;

  v_fim := (v_cfg ->> 'fim')::date;
  v_dest := v_cfg ->> 'destino';
  if v_dest is null or v_dest !~ '^/(?!/)[A-Za-z0-9/_-]*$' then return jsonb_build_object('ok', false, 'destino_invalido', true); end if;
  v_loc := p_agora at time zone 'America/Fortaleza'; v_dia := v_loc::date; v_h := extract(hour from v_loc)::int;
  v_hora := least(greatest((v_cfg ->> 'hora')::int, 8), 20); v_jan := least(greatest((v_cfg ->> 'janela_horas')::int, 1), 8);
  if v_dia > v_fim then return jsonb_build_object('ok', true, 'encerrada', true, 'dia', v_dia); end if;
  if v_h < v_hora or v_h >= v_hora + v_jan then return jsonb_build_object('ok', true, 'fora_do_horario', true, 'dia', v_dia); end if;

  if v_dia = v_fim then
    v_titulo := 'Último dia para concorrer a 2 vouchers';
    v_corpo := 'Hoje termina o prazo para publicar o seu vídeo no feed com #TerComQuemContar. Dez histórias ganham um par de vouchers. Envie o print e, com aprovação, ganhe um carimbo Sicredi.';
  else
    v_titulo := 'Concorra a 2 vouchers para o festival';
    v_corpo := 'Grave um vídeo de até 1 minuto sobre quem esteve ao seu lado e publique no feed até ' || to_char(v_fim, 'DD/MM')
            || ' com #TerComQuemContar. Dez histórias ganham um par de vouchers. Envie o print e, com aprovação, ganhe um carimbo Sicredi.';
  end if;
  v_ate := ((v_dia + 1)::timestamp at time zone 'America/Fortaleza');
  v_chave := 'camp:sicredi:' || v_dia;

  select coalesce(jsonb_agg(to_jsonb(m2.id)), '[]'::jsonb), count(*)::int into v_ids, v_n
    from public.mapas_lover m2
   where m2.edicao_codigo = v_ed and m2.id = public.caca_mapa_principal(v_ed, m2.email_norm);
  if v_n = 0 then return jsonb_build_object('ok', true, 'sem_mapas', true); end if;

  insert into public.caca_aviso (edicao_codigo, categoria, titulo, corpo, destino, publico, vigente_ate, estado, origem, chave_dedupe,
                                 criado_por, enviado_em, enviado_por, alvos)
  values (v_ed, 'campanha', left(v_titulo, 80), left(v_corpo, 240), v_dest, jsonb_build_object('tipo', 'mapas', 'ids', v_ids), v_ate,
          'enviado', 'automatico', v_chave, 'campanha', p_agora, 'campanha', v_n)
  on conflict (chave_dedupe) do nothing returning id into v_id;
  if v_id is not null then
    v_novo := true;
  else
    select a.id into v_id from public.caca_aviso a where a.chave_dedupe = v_chave;
  end if;
  insert into public.caca_aviso_entrega (aviso_id, mapa_id)
  select v_id, (j #>> '{}')::uuid from jsonb_array_elements(v_ids) j on conflict do nothing;
  update public.caca_aviso set alvos = (select count(*) from public.caca_aviso_entrega e where e.aviso_id = v_id) where id = v_id;
  return jsonb_build_object('ok', true, 'dia', v_dia, 'avisos', case when v_novo then 1 else 0 end, 'pessoas', v_n);
end $function$;

-- Avisos já enviados (06 a 10/11): só o texto do sino passa a dizer o prazo certo.
update public.caca_aviso
   set corpo = replace(corpo, 'até 11/11', 'até 13/11')
 where chave_dedupe like 'camp:sicredi:%'
   and corpo like '%até 11/11%';
