-- Lembrete diário do preenchimento (24/10/2026, pedido do Wilker: "manda notificação todo dia
-- para eles, se ainda faltar informação para eles preencherem ou confirmarem").
--
-- lembrar_prazos() (pg_cron scw-lembrar-prazos, 12:00 UTC = 09:00 de Fortaleza) ganha o prazo
-- `preenchimento` do cronograma: TODO DIA, de hoje até o último dia do prazo (inclusive), cada marca
-- com conta da edição atual que ainda tem algo a fazer recebe UM aviso (sino + push pelo gatilho de
-- `notificacoes`). Algo a fazer = campos obrigatórios faltando (campos_cadastro), pendências da página
-- (pendencias_publicacao: horário, alergênicos, modos…) ou arquivo que pede confirmação de leitura sem a
-- leitura da versão atual (mesma regra de marca_confirmar_leitura: lido_em >= publicado_em - 1 min).
-- Participação encerrada ou já concluída/aprovada não recebe. Depois do prazo, para sozinho.
-- Tema e combo seguem como antes (só no dia e 2 dias antes).

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

  -- Preenchimento: todo dia até o fim do prazo.
  for k in select * from public.edicao_cronograma
            where edicao_codigo = public.edicao_atual() and tipo = 'prazo' and chave = 'preenchimento'
              and fim is not null and v_hoje <= fim loop
    for r in select pa.participante_id from public.participacoes pa join public.participantes p on p.id = pa.participante_id
              where pa.edicao_codigo = k.edicao_codigo and p.user_id is not null and p.arquivado_em is null
                and pa.status_cadastro in ('aguardando_cadastro','em_preenchimento')
                and (coalesce((select c.faltando from public.campos_cadastro(pa.id) c), 0) > 0
                  or coalesce(cardinality(public.pendencias_publicacao(pa.id)), 0) > 0
                  or exists (select 1 from public.arquivos a
                              where a.exige_leitura and not a.arquivado and a.publicado_em is not null
                                and (a.escopo = 'geral' or a.participacao_id = pa.id)
                                and not exists (select 1 from public.arquivo_leitura l
                                                 where l.arquivo_id = a.id and l.participacao_id = pa.id
                                                   and l.lido_em >= a.publicado_em - interval '1 minute')))
                and not exists (select 1 from public.notificacoes n where n.participante_id = pa.participante_id
                                 and n.tipo = 'prazo' and n.titulo like '%seu cadastro%'
                                 and (n.criada_em at time zone 'America/Fortaleza')::date = v_hoje) loop
      perform public.notificar('marca', r.participante_id, 'prazo',
        case when k.fim = v_hoje then 'Último dia para completar seu cadastro'
             else 'Complete seu cadastro até ' || to_char(k.fim, 'DD/MM') end,
        'Ainda faltam informações para preencher ou confirmar. Abra o painel e veja o que falta.',
        'cadastro');
      v_n := v_n + 1;
    end loop;
  end loop;
  return v_n;
end $function$;
