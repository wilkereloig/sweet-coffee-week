-- Caça aos Carimbos, premiação coerente com o que o regulamento promete (achados C06 e C03 da revisão de 05/11/2026; Wilker autorizou aplicar).
-- Teste: supabase/testes/caca-premiacao-email-semente.sql. Depende de 20261204, 20261212 e 20261216.
--
-- C06: o regulamento diz que o e-mail do mapa precisa estar confirmado para receber o prêmio, mas 'confirmar' (selecionado ->
--      confirmado) não conferia. Agora caca_premio_acao recusa 'confirmar' com 'email_nao_confirmado' quando o e-mail da pessoa
--      (mapa principal) não está confirmado. 'entregar' já exige o estado 'confirmado', logo herda a regra.
-- C03: o regulamento promete que a organização registra o código (sha256) da semente antes do fim da avaliação, e o servidor exige
--      isso para o sorteio real, mas o painel não tinha como ver nem registrar. caca_sorteio_estado devolve o que está registrado
--      (hash, quando, e se ainda dá tempo) para a aba Prêmio final mostrar o passo; o registro continua sendo caca_sorteio_comprometer.
--
-- Não apaga nem converte dado. Reverter: restaurar caca_premio_acao de 20261204; drop function public.caca_sorteio_estado(text, text).

create or replace function public.caca_premio_acao(p_secret text, p_premio uuid, p_acao text, p_nota text default null) returns jsonb
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare p public.caca_premio%rowtype; v_rel boolean; v_ed text; v_novo uuid; v_pick jsonb; v_estado text; v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
        v_novo_row public.caca_premio%rowtype; v_ator text := coalesce(public.ator_rotulo_atual(), 'Painel');
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  v_rel := public.pode(p_secret, 'relatorio.ler');
  select edicao_codigo into v_ed from public.caca_premio where id = p_premio;
  if v_ed is null then raise exception 'premio_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtext('caca_premio:' || v_ed));
  select * into p from public.caca_premio where id = p_premio for update;

  v_estado := case p_acao
    when 'confirmar' then case when p.estado = 'selecionado' then 'confirmado' end
    when 'entregar' then case when p.estado = 'confirmado' then 'entregue' end
    when 'expirar' then case when p.estado = 'selecionado' then 'expirado' end
    when 'cancelar' then case when p.estado in ('selecionado', 'confirmado') then 'cancelado' end
    when 'substituir' then case when p.tipo = 'voucher_dia' and p.estado in ('selecionado', 'confirmado', 'expirado') then 'substituido' end
    else 'acao_invalida' end;
  if v_estado = 'acao_invalida' then raise exception 'acao_invalida'; end if;
  if v_estado is null then raise exception 'transicao_invalida'; end if;
  if p_acao = 'confirmar' and not public.caca_premio_email_ok(p.edicao_codigo, p.pessoa) then raise exception 'email_nao_confirmado'; end if;

  update public.caca_premio set estado = v_estado, atualizado_em = now(), atualizado_por = v_ator,
         prazo_ate = case when v_estado in ('confirmado', 'entregue') then null else prazo_ate end,
         motivo = coalesce(v_nota, motivo)
   where id = p.id;
  perform public.caca_evento_gravar(p.edicao_codigo, p.id, p_acao, jsonb_build_object('estado', p.estado, 'prazo_ate', p.prazo_ate),
                                    jsonb_build_object('estado', v_estado), v_nota);

  if p_acao = 'substituir' then
    v_pick := public.caca_escolher_dia(p.edicao_codigo, p.dia, null);
    if v_pick is null then raise exception 'sem_proximo_elegivel'; end if;
    v_novo := public.caca_premio_dia_criar(p.edicao_codigo, p.dia, v_pick, p.id, true, v_nota);
    select * into v_novo_row from public.caca_premio where id = v_novo;
  end if;

  select * into p from public.caca_premio where id = p.id;
  return jsonb_build_object('ok', true, 'premio', public.caca_premio_json(p, v_rel),
                            'novo_premio', case when v_novo_row.id is not null then public.caca_premio_json(v_novo_row, v_rel) end);
end $$;

-- O que o painel mostra no passo "Registrar o código da semente": nada secreto (o hash é público por desenho).
create or replace function public.caca_sorteio_estado(p_secret text, p_edicao text) returns jsonb
 language plpgsql stable security definer set search_path to 'public'
as $$
declare v_fecha timestamptz; v_ev record;
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  select avaliacao_fecha_em into v_fecha from public.edicao_publicacao where edicao_codigo = p_edicao;
  if not found then raise exception 'edicao_desconhecida'; end if;
  select e.depois ->> 'hash' hash, e.quando into v_ev from public.caca_evento e
   where e.edicao_codigo = p_edicao and e.acao = 'sorteio_semente_comprometida' order by e.id limit 1;
  return jsonb_build_object('registrado', v_ev.hash is not null, 'hash', v_ev.hash, 'registrado_em', v_ev.quando,
                            'avaliacao_fecha_em', v_fecha, 'fechada', v_fecha is not null and now() >= v_fecha,
                            'sem_data_de_fechamento', v_fecha is null);
end $$;
revoke all on function public.caca_sorteio_estado(text, text) from public, anon, authenticated;
grant execute on function public.caca_sorteio_estado(text, text) to anon, authenticated;
