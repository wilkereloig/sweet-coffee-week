-- Caça aos Carimbos: leitura "Sua disputa hoje" para o cartão do hub (pedido do Wilker, 10/11/2026). Só SELECT; nenhuma regra muda.
--
-- Reproduz, para UM mapa e no instante da consulta, a mesma conta que caca_apurar_dia + caca_escolher_dia fazem no corte:
--   - ranking acumulado (caca_ranking_v2): casas validadas desc, carimbos extras desc;
--   - fora da conta: quem tem 0 casas, quem já tem voucher (1 por pessoa) e quem perdeu o voucher de HOJE (expirado/substituído/cancelado);
--   - vagas do dia: caca_voucher_qtd(hoje); corte: caca_corte(hoje) (12h em 14/11 quando a migration 20270122 estiver aplicada);
--   - empate na última vaga = sorteio no corte: estado próprio ('empate'), nunca "dentro".
-- E-mail não confirmado NÃO tira ninguém da conta (a pessoa é selecionada com prazo para confirmar), então não entra aqui.
--
-- Estados: encerrada · final (dia sem voucher, depois do corte ou quem já ganhou voucher) · sem_carimbo · dentro · empate · fora.
-- É uma foto do momento: os outros seguem carimbando até o corte, e a seleção só vale depois da apuração.
-- Reverter: supabase/reverter/20270123_caca_minha_disputa.sql

create or replace function public.caca_minha_disputa(p_chave text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare
  m public.mapas_lover%rowtype;
  v_hoje date := (now() at time zone coalesce(public.caca_pcfg('fuso') #>> '{}', 'America/Fortaleza'))::date;
  v_ini date := (public.caca_pcfg('caca_inicio') #>> '{}')::date;
  v_fim date := (public.caca_pcfg('caca_fim') #>> '{}')::date;
  v_tem_dia boolean;
  v_corte timestamptz;
  v_qtd int;
  v_total int;
  v_pos int; v_casas int := 0; v_extras int := 0;
  v_ganhou boolean;
  v_acima int; v_iguais int;
  v_lim_casas int; v_lim_extras int;
  v_estado text; v_faltam int; v_rank jsonb;
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return null; end if;

  v_total := public.caca_total_casas(m.edicao_codigo);
  v_tem_dia := coalesce(public.caca_pcfg('voucher_dias') @> to_jsonb(v_hoje::text), false);
  v_corte := case when v_tem_dia then public.caca_corte(v_hoje) end;
  v_qtd := case when v_tem_dia then public.caca_voucher_qtd(v_hoje) end;

  -- ponytail: ranking inteiro a cada leitura (mesmo custo do ranking público, 1 por minuto por aba à vista); guardar foto por ciclo se pesar.
  select coalesce(jsonb_agg(jsonb_build_object('pessoa', r.pessoa, 'pos', r.pos, 'casas', r.casas, 'extras', r.extras,
           'conta', r.casas > 0 and not exists (
             select 1 from public.caca_premio p
              where p.edicao_codigo = m.edicao_codigo and p.tipo = 'voucher_dia' and p.pessoa = r.pessoa
                and (p.estado in ('selecionado', 'confirmado', 'entregue')
                     or (p.dia = v_hoje and p.estado in ('expirado', 'substituido', 'cancelado')))))), '[]'::jsonb)
    into v_rank from public.caca_ranking_v2(m.edicao_codigo, null) r;

  select d.pos, d.casas, d.extras into v_pos, v_casas, v_extras
    from jsonb_to_recordset(v_rank) d(pessoa text, pos int, casas int, extras int, conta boolean) where d.pessoa = m.email_norm;
  v_casas := coalesce(v_casas, 0); v_extras := coalesce(v_extras, 0);
  v_ganhou := exists (select 1 from public.caca_premio p where p.edicao_codigo = m.edicao_codigo and p.tipo = 'voucher_dia'
                       and p.pessoa = m.email_norm and p.estado in ('selecionado', 'confirmado', 'entregue'));

  if v_ini is not null and v_fim is not null
     and (v_hoje < v_ini or now() >= public.caca_corte(v_fim)) then
    v_estado := 'encerrada';
  elsif not v_tem_dia or now() >= v_corte or v_ganhou then
    v_estado := 'final';
  elsif v_casas = 0 then
    v_estado := 'sem_carimbo';
  else
    -- Os outros que contam, comparados comigo pela mesma ordem do servidor.
    select count(*) filter (where (d.casas, d.extras) > (v_casas, v_extras)),
           count(*) filter (where (d.casas, d.extras) = (v_casas, v_extras))
      into v_acima, v_iguais
      from jsonb_to_recordset(v_rank) d(pessoa text, casas int, extras int, conta boolean) where d.conta and d.pessoa <> m.email_norm;
    -- A última vaga sem mim: a Q-ésima pessoa da ordem.
    select d.casas, d.extras into v_lim_casas, v_lim_extras
      from jsonb_to_recordset(v_rank) d(pessoa text, casas int, extras int, conta boolean) where d.conta and d.pessoa <> m.email_norm
     order by d.casas desc, d.extras desc limit 1 offset v_qtd - 1;
    if v_acima + v_iguais + 1 <= v_qtd then v_estado := 'dentro';
    elsif v_acima < v_qtd then v_estado := 'empate'; v_faltam := 1;
    else
      v_estado := 'fora';
      v_faltam := v_lim_casas - v_casas + case when v_extras > v_lim_extras then 0 else 1 end;
    end if;
  end if;

  return jsonb_build_object(
    'estado', v_estado,
    'agora', now(),
    'dia', v_hoje,
    'corte', v_corte,
    'vouchers', v_qtd,
    'posicao', v_pos,
    'casas', v_casas,
    'extras', v_extras,
    'total_casas', v_total,
    'faltam_mapa', greatest(v_total - v_casas, 0),
    'ja_ganhou', v_ganhou,
    'limite_casas', case when v_estado in ('dentro', 'empate', 'fora') then v_lim_casas end,
    'faltam', v_faltam,
    'empatados', case when v_estado = 'empate' then v_iguais + 1 end);
end $function$;

revoke all on function public.caca_minha_disputa(text) from public;
grant execute on function public.caca_minha_disputa(text) to anon, authenticated;
