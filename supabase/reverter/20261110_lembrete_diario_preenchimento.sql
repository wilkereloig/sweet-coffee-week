-- Reversão de 20261110_lembrete_diario_preenchimento.sql: lembrar_prazos() volta a lembrar só tema e combo.

create or replace function public.lembrar_prazos()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_hoje date := (now() at time zone 'America/Fortaleza')::date; v_n int := 0; k record; r record;
begin
  for k in select * from public.edicao_cronograma
            where edicao_codigo = public.edicao_atual() and tipo = 'prazo' and chave in ('tema','combo')
              and fim in (v_hoje, v_hoje + 2) loop
    for r in select pa.participante_id from public.participacoes pa join public.participantes p on p.id = pa.participante_id
              where pa.edicao_codigo = k.edicao_codigo and p.user_id is not null
                and ((k.chave = 'tema' and coalesce(btrim(pa.tema_combo), '') = '')
                  or (k.chave = 'combo' and pa.combo_status in ('rascunho','correcao_solicitada')))
                and not exists (select 1 from public.notificacoes n where n.participante_id = pa.participante_id
                                 and n.tipo = 'prazo' and n.titulo like '%' || k.titulo || '%'
                                 and (n.criada_em at time zone 'America/Fortaleza')::date = v_hoje) loop
      perform public.notificar('marca', r.participante_id, 'prazo',
        case when k.fim = v_hoje then 'Último dia: ' else 'Faltam 2 dias: ' end || k.titulo,
        'Prazo ' || to_char(k.fim, 'DD/MM') || '.', 'cadastro');
      v_n := v_n + 1;
    end loop;
  end loop;

  return v_n;
end $function$;
