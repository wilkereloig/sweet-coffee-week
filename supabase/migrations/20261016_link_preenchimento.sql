-- ─────────────────────────────────────────────────────────────────────────────
-- Link de preenchimento — 16/10/2026 (pedido do Wilker)
--
-- As marcas da edição não recebem acesso ao painel agora. Cada participação
-- ganha um LINK ÚNICO (código aleatório: um UUID v4 sem hífens, 122 bits), mandado por WhatsApp,
-- que abre /preencher/#<código>: manual curto da edição + formulário com o que
-- o banco já tem. A marca confirma ou corrige e envia.
--
-- ⛔ O envio NÃO grava no cadastro. Ele vira uma linha `pendente` em
--    `preenchimento_envios`; a organização revisa na ficha (Gestão) e aplica ou
--    descarta (decisão do Wilker: "passa por revisão"). Aplicar usa as MESMAS
--    `org_salvar_*` do editor do painel — mesma validação, mesma auditoria.
--
-- O código vive no fragmento (#) do endereço: não vai para o servidor nem para
-- o Referer. Quem tem o código lê os dados da própria marca (é dela) e propõe
-- mudanças; não grava nada sozinho.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.preenchimento_links (
  id uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[a-f0-9]{32}$'),
  criado_em timestamptz not null default now(),
  criado_por_rotulo text,
  aberto_em timestamptz,
  ultimo_acesso_em timestamptz,
  acessos integer not null default 0,
  enviado_em timestamptz,
  expira_em timestamptz not null,
  revogado_em timestamptz
);
-- Um link vivo por participação; gerar outro revoga o anterior.
create unique index if not exists preenchimento_links_um_ativo
  on public.preenchimento_links (participacao_id) where revogado_em is null;

create table if not exists public.preenchimento_envios (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.preenchimento_links(id) on delete cascade,
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  dados jsonb not null check (jsonb_typeof(dados) = 'object'),
  enviado_em timestamptz not null default now(),
  status text not null default 'pendente'
    check (status in ('pendente', 'aplicado', 'descartado', 'substituido')),
  revisado_em timestamptz,
  revisado_por_rotulo text,
  motivo text check (motivo is null or char_length(motivo) <= 500)
);
create index if not exists preenchimento_envios_participacao
  on public.preenchimento_envios (participacao_id, enviado_em desc);

-- Sem policy: ninguém lê nem escreve direto. Só as funções abaixo.
alter table public.preenchimento_links enable row level security;
alter table public.preenchimento_envios enable row level security;
revoke all on public.preenchimento_links, public.preenchimento_envios from public, anon, authenticated;

-- Prazo do formulário: dado da edição, não constante no front (Fase 12).
insert into public.edicao_cronograma (edicao_codigo, chave, tipo, titulo, fim, ordem, obrigatorio, visivel_participante)
select '2026.2', 'preenchimento', 'prazo', 'Envio do formulário de dados', date '2026-10-24', 35, true, true
 where exists (select 1 from public.edicoes where codigo = '2026.2')
   and not exists (select 1 from public.edicao_cronograma where edicao_codigo = '2026.2' and chave = 'preenchimento');

-- ── O retrato que a página mostra e que o envio devolve (mesma forma) ──────────
create or replace function public.preenchimento_estado(p_participacao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'marca', (select jsonb_build_object(
                'responsavel', p.responsavel, 'telefone', p.telefone, 'email', p.email,
                'instagram', p.instagram, 'site', p.site, 'cnpj', p.cnpj, 'razao_social', p.razao_social)
                from public.participantes p join public.participacoes pa on pa.participante_id = p.id
               where pa.id = p_participacao),
    'combo', (select jsonb_build_object(
                'tema_combo', pa.tema_combo, 'tema_justificativa', pa.tema_justificativa,
                'combo_nome', pa.combo_nome, 'combo_descricao', pa.combo_descricao,
                'combo_para_viagem', pa.combo_para_viagem,
                'custo_embalagem', pa.custo_embalagem, 'custo_delivery', pa.custo_delivery)
                from public.participacoes pa where pa.id = p_participacao),
    'itens', (select jsonb_agg(jsonb_build_object(
                'posicao', g.pos, 'nome', i.nome, 'descricao', i.descricao, 'ingredientes', i.ingredientes)
                order by g.pos)
                from generate_series(1, 3) g(pos)
                left join lateral (select * from public.participantes_itens x
                                    where x.participacao_id = p_participacao and x.posicao = g.pos
                                    limit 1) i on true),
    'unidades', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', pu.id, 'nome_unidade', u.nome_unidade,
                -- Legado: antes da unidade permanente o endereço morava na participação.
                'logradouro', coalesce(u.logradouro, pu.endereco), 'numero', u.numero,
                'complemento', u.complemento, 'bairro', coalesce(u.bairro, pu.bairro),
                'cidade', u.cidade, 'cep', u.cep, 'referencia', u.referencia,
                'whatsapp', u.whatsapp_publico, 'whatsapp_autorizado', coalesce(u.whatsapp_autorizado, false),
                'horario_loja', u.horario_loja_texto, 'horario_combo', pu.horarios,
                'consumo_local', pu.consumo_local, 'retirada', pu.retirada, 'delivery_combo', pu.delivery_combo)
                order by pu.ordem), '[]'::jsonb)
                from public.participacao_unidades pu
                left join public.unidades u on u.id = pu.unidade_id
               where pu.participacao_id = p_participacao and pu.participa is not false)
  )
$$;
revoke all on function public.preenchimento_estado(uuid) from public, anon, authenticated;

-- Link válido pelo código, ou null.
create or replace function public.preenchimento_link_valido(p_codigo text)
returns public.preenchimento_links language sql stable security definer set search_path = public as $$
  select l.* from public.preenchimento_links l
   where p_codigo ~ '^[a-f0-9]{32}$' and l.codigo = p_codigo
     and l.revogado_em is null and l.expira_em > now()
$$;
revoke all on function public.preenchimento_link_valido(text) from public, anon, authenticated;

-- ── Público: abrir o link ──────────────────────────────────────────────────────
create or replace function public.preenchimento_ler(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_l public.preenchimento_links; v_pa public.participacoes; v_p public.participantes;
  v_e public.edicoes; v_logo text; v_ultimo jsonb; v_pendente jsonb;
begin
  v_l := public.preenchimento_link_valido(p_codigo);
  if v_l.id is null then
    if exists (select 1 from public.preenchimento_links where codigo = p_codigo) then
      return jsonb_build_object('estado', 'encerrado');
    end if;
    return jsonb_build_object('estado', 'invalido');
  end if;
  update public.preenchimento_links
     set aberto_em = coalesce(aberto_em, now()), ultimo_acesso_em = now(), acessos = acessos + 1
   where id = v_l.id;
  select * into v_pa from public.participacoes where id = v_l.participacao_id;
  select * into v_p from public.participantes where id = v_pa.participante_id;
  select * into v_e from public.edicoes where codigo = v_pa.edicao_codigo;
  select lm.path into v_logo from public.logos_marca lm where lm.id = coalesce(v_pa.logo_id, v_p.logo_id);
  select jsonb_build_object('enviado_em', e.enviado_em, 'status', e.status) into v_ultimo
    from public.preenchimento_envios e where e.link_id = v_l.id order by e.enviado_em desc limit 1;
  -- Reabriu antes da revisão: a página volta com o que a marca mandou, não com o antigo.
  select e.dados into v_pendente from public.preenchimento_envios e
   where e.link_id = v_l.id and e.status = 'pendente' order by e.enviado_em desc limit 1;
  return jsonb_build_object(
    'estado', 'ok',
    'marca', v_p.nome_marca, 'responsavel', v_p.responsavel, 'logo', v_logo,
    'edicao', jsonb_build_object(
      'codigo', v_e.codigo, 'tema', v_e.tema, 'inicio', v_e.festival_inicio, 'fim', v_e.festival_fim,
      'valor_combo', v_e.valor_combo, 'vouchers', v_e.vouchers_por_participante,
      'cronograma', (select coalesce(jsonb_agg(jsonb_build_object(
                        'chave', c.chave, 'tipo', c.tipo, 'titulo', c.titulo, 'inicio', c.inicio,
                        'fim', c.fim, 'condicao', c.condicao) order by c.ordem), '[]'::jsonb)
                       from public.edicao_cronograma c
                      where c.edicao_codigo = v_e.codigo and c.visivel_participante)),
    'dados', public.preenchimento_estado(v_pa.id),
    'pendente', v_pendente,
    'ultimo_envio', v_ultimo);
end $$;

-- ── Público: enviar ────────────────────────────────────────────────────────────
create or replace function public.preenchimento_enviar(p_codigo text, p_dados jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_l public.preenchimento_links; v_pa public.participacoes; v_marca text; v_id uuid; v_em timestamptz;
begin
  v_l := public.preenchimento_link_valido(p_codigo);
  if v_l.id is null then return jsonb_build_object('ok', false, 'erro', 'link_invalido'); end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' or octet_length(p_dados::text) > 60000 then
    return jsonb_build_object('ok', false, 'erro', 'dados_invalidos');
  end if;
  if (select count(*) from public.preenchimento_envios where link_id = v_l.id) >= 40 then
    return jsonb_build_object('ok', false, 'erro', 'limite');
  end if;
  if exists (select 1 from public.preenchimento_envios
              where link_id = v_l.id and enviado_em > now() - interval '15 seconds') then
    return jsonb_build_object('ok', false, 'erro', 'aguarde');
  end if;
  select * into v_pa from public.participacoes where id = v_l.participacao_id;
  select nome_marca into v_marca from public.participantes where id = v_pa.participante_id;
  -- Envio novo substitui o que ainda esperava revisão: vale o mais recente.
  update public.preenchimento_envios set status = 'substituido'
   where link_id = v_l.id and status = 'pendente';
  insert into public.preenchimento_envios (link_id, participacao_id, dados)
  values (v_l.id, v_pa.id, p_dados) returning id, enviado_em into v_id, v_em;
  update public.preenchimento_links set enviado_em = v_em where id = v_l.id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, ator_rotulo, detalhe)
  values ('preenchimento.recebido', 'preenchimento_envios', v_id::text, v_pa.participante_id, v_pa.id,
          'Marca (link de preenchimento)', jsonb_build_object('confirmados', p_dados -> 'confirmados'));
  perform public.notificar('organizacao', null, 'cadastro', v_marca || ' enviou o formulário de dados',
    'Revise e aplique na ficha da marca (Gestão).', 'marcas/' || v_pa.participante_id || '/gestao');
  return jsonb_build_object('ok', true, 'enviado_em', v_em);
end $$;

-- ── Organização ────────────────────────────────────────────────────────────────
create or replace function public.preenchimento_novo_link(p_participacao uuid)
returns public.preenchimento_links language plpgsql security definer set search_path = public as $$
declare v_l public.preenchimento_links; v_fim date;
begin
  select e.festival_fim into v_fim from public.participacoes pa join public.edicoes e on e.codigo = pa.edicao_codigo
   where pa.id = p_participacao;
  insert into public.preenchimento_links (participacao_id, codigo, expira_em, criado_por_rotulo)
  values (p_participacao, replace(gen_random_uuid()::text, '-', ''),
          coalesce((v_fim + 15)::timestamptz, now() + interval '60 days'), public.rotulo_ator())
  returning * into v_l;
  return v_l;
end $$;
revoke all on function public.preenchimento_novo_link(uuid) from public, anon, authenticated;

-- Resumo da edição para o texto do WhatsApp (prazo vem do cronograma).
create or replace function public.preenchimento_edicao(p_edicao text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('codigo', e.codigo, 'tema', e.tema, 'inicio', e.festival_inicio, 'fim', e.festival_fim,
           'prazo', (select c.fim from public.edicao_cronograma c
                      where c.edicao_codigo = e.codigo and c.chave = 'preenchimento' order by c.ordem limit 1))
    from public.edicoes e where e.codigo = p_edicao
$$;
revoke all on function public.preenchimento_edicao(text) from public, anon, authenticated;

-- Lista da edição atual. p_gerar cria o link de quem ainda não tem.
create or replace function public.org_preenchimentos(p_secret text, p_gerar boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ed text := public.edicao_atual(); v_pa uuid;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if p_gerar then
    if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
    for v_pa in select pa.id from public.participacoes pa
                 where pa.edicao_codigo = v_ed and pa.status_cadastro is distinct from 'encerrado'
                   and not exists (select 1 from public.preenchimento_links l
                                    where l.participacao_id = pa.id and l.revogado_em is null) loop
      perform public.preenchimento_novo_link(v_pa);
    end loop;
  end if;
  return jsonb_build_object('edicao', public.preenchimento_edicao(v_ed), 'marcas',
   (select coalesce(jsonb_agg(to_jsonb(r) order by r.nome), '[]'::jsonb) from (
    select pa.id as participacao_id, p.id as participante_id, p.nome_marca as nome, p.responsavel, p.telefone,
           pa.status_cadastro, l.codigo, l.criado_em, l.aberto_em, l.enviado_em, l.expira_em,
           (select count(*) from public.preenchimento_envios e
             where e.participacao_id = pa.id and e.status = 'pendente')::int as pendentes
      from public.participacoes pa
      join public.participantes p on p.id = pa.participante_id
      left join public.preenchimento_links l on l.participacao_id = pa.id and l.revogado_em is null
     where pa.edicao_codigo = v_ed) r));
end $$;

-- Ficha: link (gera se faltar; p_novo troca por outro), envio a revisar, retrato atual e histórico.
create or replace function public.org_preenchimento(p_secret text, p_participacao uuid,
                                                    p_gerar boolean default false, p_novo boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_l public.preenchimento_links; v_envio jsonb;
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  if not exists (select 1 from public.participacoes where id = p_participacao) then
    raise exception 'participacao_nao_encontrada';
  end if;
  if p_gerar or p_novo then
    if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
    if p_novo then
      update public.preenchimento_links set revogado_em = now()
       where participacao_id = p_participacao and revogado_em is null;
    end if;
    if not exists (select 1 from public.preenchimento_links
                    where participacao_id = p_participacao and revogado_em is null) then
      perform public.preenchimento_novo_link(p_participacao);
    end if;
  end if;
  select * into v_l from public.preenchimento_links
   where participacao_id = p_participacao and revogado_em is null;
  select to_jsonb(e) - 'link_id' into v_envio from public.preenchimento_envios e
   where e.participacao_id = p_participacao and e.status = 'pendente'
   order by e.enviado_em desc limit 1;
  return jsonb_build_object(
    'link', case when v_l.id is null then null else jsonb_build_object(
              'codigo', v_l.codigo, 'criado_em', v_l.criado_em, 'aberto_em', v_l.aberto_em,
              'acessos', v_l.acessos, 'enviado_em', v_l.enviado_em, 'expira_em', v_l.expira_em) end,
    'pendente', v_envio,
    'edicao', public.preenchimento_edicao((select edicao_codigo from public.participacoes where id = p_participacao)),
    'atual', public.preenchimento_estado(p_participacao),
    'historico', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', e.id, 'enviado_em', e.enviado_em, 'status', e.status, 'revisado_em', e.revisado_em,
                    'revisado_por', e.revisado_por_rotulo, 'motivo', e.motivo) order by e.enviado_em desc), '[]'::jsonb)
                    from public.preenchimento_envios e where e.participacao_id = p_participacao));
end $$;

-- Texto vazio vira null; texto vira texto aparado. Outros tipos ficam de fora.
create or replace function public.preenchimento_texto(p jsonb, k text, p_max int)
returns text language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p -> k) = 'string' then left(nullif(btrim(p ->> k), ''), p_max) end
$$;
revoke all on function public.preenchimento_texto(jsonb, text, int) from public, anon, authenticated;

-- Aplica (ou descarta) um envio. Atômico: se uma parte falhar, nada muda.
create or replace function public.org_preenchimento_decidir(p_secret text, p_envio uuid, p_aplicar boolean,
                                                            p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e public.preenchimento_envios; v_pa public.participacoes; d jsonb; c jsonb; m jsonb; it jsonb; un jsonb;
  v_pos int; v_atual public.participantes_itens; v_pu uuid; v_un uuid; v_dig text; v_txt text;
  v_ordem int; k text; v_num text;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_e from public.preenchimento_envios where id = p_envio for update;
  if not found then raise exception 'envio_nao_encontrado'; end if;
  if v_e.status <> 'pendente' then raise exception 'envio_ja_revisado'; end if;
  select * into v_pa from public.participacoes where id = v_e.participacao_id;

  if not p_aplicar then
    update public.preenchimento_envios
       set status = 'descartado', revisado_em = now(), revisado_por_rotulo = public.rotulo_ator(),
           motivo = left(nullif(btrim(p_motivo), ''), 500)
     where id = p_envio;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
    values ('preenchimento.descartado', 'preenchimento_envios', p_envio::text, v_pa.participante_id, v_pa.id,
            jsonb_build_object('motivo', p_motivo));
    return;
  end if;

  d := v_e.dados;

  -- Marca: só as colunas que o editor do painel aceita (nome da marca fica de fora: é login).
  if jsonb_typeof(d -> 'marca') = 'object' then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into m
      from jsonb_each(d -> 'marca')
     where key in ('responsavel', 'telefone', 'email', 'instagram', 'site', 'cnpj', 'razao_social')
       and jsonb_typeof(value) in ('string', 'null');
    if m <> '{}'::jsonb then perform public.org_salvar_participante(p_secret, v_pa.participante_id, m); end if;
  end if;

  if jsonb_typeof(d -> 'combo') = 'object' then
    c := d -> 'combo';
    m := '{}'::jsonb;
    foreach k in array array['tema_combo', 'tema_justificativa'] loop
      if jsonb_typeof(c -> k) in ('string', 'null') then m := m || jsonb_build_object(k, c -> k); end if;
    end loop;
    if jsonb_typeof(c -> 'combo_para_viagem') in ('boolean', 'null') then
      m := m || jsonb_build_object('combo_para_viagem', c -> 'combo_para_viagem');
    end if;
    -- Custo: "12,50", "R$ 12,50" ou 12.5 → '12.50'. Valor que não é dinheiro fica de fora.
    foreach k in array array['custo_embalagem', 'custo_delivery'] loop
      if jsonb_typeof(c -> k) = 'null' or (jsonb_typeof(c -> k) = 'string' and btrim(c ->> k) = '') then
        m := m || jsonb_build_object(k, null);
      elsif jsonb_typeof(c -> k) in ('string', 'number') then
        v_num := regexp_replace(replace(c ->> k, ',', '.'), '[^0-9.]', '', 'g');
        if v_num ~ '^\d{1,4}(\.\d{1,2})?$' then m := m || jsonb_build_object(k, v_num); end if;
      end if;
    end loop;
    if m <> '{}'::jsonb then perform public.org_salvar_participacao(p_secret, v_pa.id, m); end if;

    if (c ? 'combo_nome' and public.preenchimento_texto(c, 'combo_nome', 80) is distinct from v_pa.combo_nome)
       or (c ? 'combo_descricao' and public.preenchimento_texto(c, 'combo_descricao', 400) is distinct from v_pa.combo_descricao) then
      perform public.org_salvar_dados_publicos(p_secret, v_pa.id, jsonb_build_object(
        'combo_nome', coalesce(public.preenchimento_texto(c, 'combo_nome', 80), ''),
        'combo_descricao', coalesce(public.preenchimento_texto(c, 'combo_descricao', 400), '')));
    end if;
  end if;

  -- Itens: doce (1), salgado (2), bebida (3). Só grava o que mudou.
  if jsonb_typeof(d -> 'itens') = 'array' then
    for it in select value from jsonb_array_elements(d -> 'itens') loop
      continue when jsonb_typeof(it) <> 'object' or coalesce(it ->> 'posicao', '') !~ '^[123]$';
      v_pos := (it ->> 'posicao')::int;
      select * into v_atual from public.participantes_itens
       where participacao_id = v_pa.id and posicao = v_pos limit 1;
      if public.preenchimento_texto(it, 'nome', 120) is distinct from v_atual.nome
         or public.preenchimento_texto(it, 'descricao', 600) is distinct from v_atual.descricao
         or public.preenchimento_texto(it, 'ingredientes', 800) is distinct from v_atual.ingredientes then
        perform public.org_salvar_item(p_secret, v_pa.id, v_pos, jsonb_build_object(
          'nome', coalesce(public.preenchimento_texto(it, 'nome', 120), ''),
          'descricao', coalesce(public.preenchimento_texto(it, 'descricao', 600), ''),
          'ingredientes', coalesce(public.preenchimento_texto(it, 'ingredientes', 800), '')));
      end if;
    end loop;
  end if;

  -- Unidades: a permanente (unidades) e a desta edição (participacao_unidades).
  if jsonb_typeof(d -> 'unidades') = 'array' then
    for un in select value from jsonb_array_elements(d -> 'unidades') limit 12 loop
      continue when jsonb_typeof(un) <> 'object';
      v_pu := null; v_un := null;
      if coalesce(un ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
        select id, unidade_id into v_pu, v_un from public.participacao_unidades
         where id = (un ->> 'id')::uuid and participacao_id = v_pa.id;
      end if;
      if (un ->> 'remover') = 'true' then
        if v_pu is not null then
          update public.participacao_unidades set participa = false where id = v_pu;
        end if;
        continue;
      end if;
      v_txt := public.preenchimento_texto(un, 'logradouro', 160);
      if v_pu is null then
        continue when v_txt is null; -- unidade nova sem endereço não entra
        select coalesce(max(ordem), 0) + 1 into v_ordem from public.participacao_unidades where participacao_id = v_pa.id;
        insert into public.participacao_unidades (participacao_id, ordem, endereco, bairro, faz_delivery, canais_delivery, so_delivery)
        values (v_pa.id, v_ordem, v_txt, public.preenchimento_texto(un, 'bairro', 80), false, '[]'::jsonb, false)
        returning id, unidade_id into v_pu, v_un;   -- o gatilho cria a unidade permanente
      elsif v_un is null then
        -- Linha antiga sem unidade permanente: tocar nela faz o gatilho criar.
        update public.participacao_unidades set ordem = ordem where id = v_pu returning unidade_id into v_un;
      end if;

      v_dig := regexp_replace(coalesce(un ->> 'cep', ''), '\D', '', 'g');
      update public.unidades set
        nome_unidade = case when un ? 'nome_unidade' then public.preenchimento_texto(un, 'nome_unidade', 60) else nome_unidade end,
        logradouro = case when un ? 'logradouro' then v_txt else logradouro end,
        numero = case when un ? 'numero' then public.preenchimento_texto(un, 'numero', 20) else numero end,
        complemento = case when un ? 'complemento' then public.preenchimento_texto(un, 'complemento', 80) else complemento end,
        bairro = case when un ? 'bairro' then public.preenchimento_texto(un, 'bairro', 80) else bairro end,
        cidade = case when un ? 'cidade' then public.preenchimento_texto(un, 'cidade', 80) else cidade end,
        cep = case when not (un ? 'cep') then cep when v_dig = '' then null when v_dig ~ '^\d{8}$' then v_dig else cep end,
        referencia = case when un ? 'referencia' then public.preenchimento_texto(un, 'referencia', 120) else referencia end,
        horario_loja_texto = case when un ? 'horario_loja' then public.preenchimento_texto(un, 'horario_loja', 200) else horario_loja_texto end
       where id = v_un;
      if un ? 'whatsapp' then
        v_dig := regexp_replace(coalesce(un ->> 'whatsapp', ''), '\D', '', 'g');
        if length(v_dig) in (12, 13) and v_dig like '55%' then v_dig := substr(v_dig, 3); end if;
        if v_dig = '' or v_dig ~ '^\d{10,11}$' then
          update public.unidades set whatsapp_publico = nullif(v_dig, ''),
                 whatsapp_autorizado = (un -> 'whatsapp_autorizado') = 'true'::jsonb and v_dig <> ''
           where id = v_un;
        end if;
      end if;

      update public.participacao_unidades pu set
        participa = true,
        -- Espelho para quem ainda lê o endereço da participação (lista, campos_cadastro).
        endereco = nullif(concat_ws(', ', u.logradouro, u.numero), ''),
        bairro = u.bairro,
        horarios = case when un ? 'horario_combo' then public.preenchimento_texto(un, 'horario_combo', 300) else pu.horarios end,
        consumo_local = case when un ->> 'consumo_local' in ('sim', 'nao', 'nao_informado') then un ->> 'consumo_local' else pu.consumo_local end,
        retirada = case when un ->> 'retirada' in ('sim', 'nao', 'nao_informado') then un ->> 'retirada' else pu.retirada end,
        delivery_combo = case when un ->> 'delivery_combo' in ('sim', 'nao', 'nao_informado') then un ->> 'delivery_combo' else pu.delivery_combo end,
        faz_delivery = case when un ->> 'delivery_combo' in ('sim', 'nao', 'nao_informado') then (un ->> 'delivery_combo') = 'sim' else pu.faz_delivery end
        from public.unidades u
       where pu.id = v_pu and u.id = pu.unidade_id;

      insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
      values ('cadastro.editado', 'participacao_unidades', v_pu::text, v_pa.participante_id, v_pa.id,
              jsonb_build_object('bloco', 'unidade', 'origem', 'preenchimento', 'endereco', v_txt));
    end loop;
  end if;

  update public.preenchimento_envios
     set status = 'aplicado', revisado_em = now(), revisado_por_rotulo = public.rotulo_ator()
   where id = p_envio;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('preenchimento.aplicado', 'preenchimento_envios', p_envio::text, v_pa.participante_id, v_pa.id,
          jsonb_build_object('observacao', d -> 'observacao'));
end $$;

revoke all on function public.preenchimento_ler(text), public.preenchimento_enviar(text, jsonb),
  public.org_preenchimentos(text, boolean), public.org_preenchimento(text, uuid, boolean, boolean),
  public.org_preenchimento_decidir(text, uuid, boolean, text) from public;
grant execute on function public.preenchimento_ler(text), public.preenchimento_enviar(text, jsonb),
  public.org_preenchimentos(text, boolean), public.org_preenchimento(text, uuid, boolean, boolean),
  public.org_preenchimento_decidir(text, uuid, boolean, text) to anon, authenticated;
