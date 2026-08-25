-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 6 · O que a organização precisa LER do modelo novo · 25/08/2026
--
-- A Fase 5 mudou o painel da marca de dono: combo, tema, preço, itens e
-- unidades passaram de `participantes` para `participacoes`. `/organizacao/`
-- ficou atrás — ele lê `get_participantes`, que devolvia `combo_nome`,
-- `combo_descricao`, `combo_preco` e `unidades` do modelo antigo. Não quebrava:
-- as colunas existem. Só vinham VAZIAS, porque a marca deixou de preenchê-las.
-- Painel que mostra campo vazio onde há dado é pior que painel que dá erro.
--
-- Três leituras, e nenhuma tabela nova:
--   1. `get_participantes` passa a trazer a PARTICIPAÇÃO corrente de cada marca.
--   2. `get_ficha_participacao` — a ficha inteira numa chamada só.
--   3. `get_config_admin` — edição atual e estado da senha única.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · A lista de marcas, com a participação da edição corrente ──────────
-- `edicao_atual` nula devolve a participação MAIS RECENTE de cada marca, e não
-- nenhuma: entre edições, a ficha que interessa é a última que existiu. Marca
-- sem participação nenhuma vem com `participacao_id` nulo e
-- `status_cadastro = 'sem_participacao'` — estado que a tela nomeia em vez de
-- deixar em branco.
drop function if exists public.get_participantes(text);

create or replace function public.get_participantes(p_secret text)
returns table (
  id uuid, created_at timestamptz, updated_at timestamptz,
  origem_id uuid, user_id uuid, slug text,
  nome_marca text, responsavel text, telefone text, email text,
  instagram text, site text, cnpj text, razao_social text,
  participacao_id uuid, edicao_codigo text, status_cadastro text,
  tema_combo text, combo_preco numeric,
  unidades bigint, itens_prontos bigint, edicoes bigint
)
language plpgsql stable security definer set search_path = public as $$
declare v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  -- `admin_config c` com apelido, e não `where id`: esta função declara uma
  -- coluna de saída chamada `id`, e o plpgsql resolve `id` como VARIÁVEL antes
  -- de resolver como coluna. Sem o apelido é `column reference "id" is
  -- ambiguous`, e o erro só aparece quando a função é chamada.
  select c.edicao_atual into v_ed from public.admin_config c where c.id;

  return query
    select p.id, p.created_at, p.updated_at,
           p.origem_id, p.user_id, p.slug,
           p.nome_marca, p.responsavel, p.telefone, p.email,
           p.instagram, p.site, p.cnpj, p.razao_social,
           pa.id, pa.edicao_codigo,
           coalesce(pa.status_cadastro, 'sem_participacao'),
           pa.tema_combo, pa.combo_preco,
           (select count(*) from public.participacao_unidades u
             where u.participacao_id = pa.id and coalesce(trim(u.endereco), '') <> ''),
           (select count(*) from public.participantes_itens i
             where i.participacao_id = pa.id
               and coalesce(trim(i.nome), '') <> ''
               and coalesce(trim(i.descricao), '') <> ''
               and coalesce(trim(i.ingredientes), '') <> ''),
           (select count(*) from public.participacoes t where t.participante_id = p.id)
      from public.participantes p
      -- lateral, não join: precisa de UMA participação por marca, escolhida por
      -- regra. Um join comum devolveria a marca repetida por edição, e a lista
      -- de marcas passaria a contar participações.
      left join lateral (
        select pp.* from public.participacoes pp
         where pp.participante_id = p.id
         -- O desempate é pelo CÓDIGO da edição, não pelo `created_at`: os
         -- códigos ordenam sozinhos ('2016' … '2026.1' … '2027'), e a data de
         -- criação da linha só diz quando alguém clicou. Duas participações
         -- abertas na mesma transação têm `created_at` idêntico — `now()` é o
         -- carimbo da TRANSAÇÃO, não do comando —, e aí a ordem seria sorteio.
         order by (pp.edicao_codigo is not distinct from v_ed) desc,
                  pp.edicao_codigo desc, pp.created_at desc
         limit 1
      ) pa on true
     order by p.created_at desc;
end;
$$;

grant execute on function public.get_participantes(text) to anon, authenticated;

-- ── 2 · A ficha inteira, numa chamada ─────────────────────────────────────
-- jsonb e não seis RPCs: a ficha abre de uma vez, e seis idas ao servidor
-- desenhariam a tela em seis pedaços que pulam sob o dedo de quem já começou a
-- rolar. É a mesma decisão do `Promise.all` do painel da marca, resolvida um
-- nível abaixo porque aqui quem monta a resposta é o banco.
create or replace function public.get_ficha_participacao(p_secret text, p_participacao uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_part uuid;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;

  select participante_id into v_part from public.participacoes where id = p_participacao;
  if v_part is null then return null; end if;

  select jsonb_build_object(
    'marca', (select to_jsonb(p) from public.participantes p where p.id = v_part),
    'participacao', (select to_jsonb(pa) from public.participacoes pa where pa.id = p_participacao),
    'itens', coalesce((
      select jsonb_agg(to_jsonb(i) order by array_position(array['doce','salgado','bebida'], i.tipo))
        from public.participantes_itens i where i.participacao_id = p_participacao), '[]'::jsonb),
    'unidades', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.ordem)
        from public.participacao_unidades u where u.participacao_id = p_participacao), '[]'::jsonb),
    -- Solicitação vem com o ESTADO desta participação junto, não em lista
    -- separada: "pediram e ela ainda não respondeu" é uma informação só.
    'solicitacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'titulo', s.titulo, 'texto', s.texto, 'bloco', s.bloco,
               'escopo', s.escopo, 'prazo_em', s.prazo_em, 'publicada_em', s.publicada_em,
               'arquivada', s.arquivada,
               'estado', coalesce(e.estado, 'pendente'), 'respondido_em', e.respondido_em)
             order by s.prazo_em nulls last)
        from public.solicitacoes s
        left join public.solicitacao_estado e
               on e.solicitacao_id = s.id and e.participacao_id = p_participacao
       where s.publicada_em is not null and not s.arquivada
         and (s.participacao_id = p_participacao or s.escopo = 'geral')), '[]'::jsonb),
    'arquivos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'nome', a.nome, 'escopo', a.escopo, 'versao', a.versao,
               'path', a.path, 'exige_leitura', a.exige_leitura,
               'lido_em', l.lido_em) order by a.created_at desc)
        from public.arquivos a
        left join public.arquivo_leitura l
               on l.arquivo_id = a.id and l.participacao_id = p_participacao
       where a.publicado_em is not null and not a.arquivado
         and (a.participacao_id = p_participacao or a.escopo = 'geral')), '[]'::jsonb),
    'sessoes', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.data_hora desc)
        from public.sessoes_fotos f
       where f.participacao_id = p_participacao or f.participante_id = v_part), '[]'::jsonb),
    -- O histórico da marca. É o que separa "casa nova" de "casa que está aqui
    -- desde 2019" na hora de decidir qualquer coisa sobre ela.
    'edicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'edicao_codigo', t.edicao_codigo,
               'status_cadastro', t.status_cadastro, 'tema_combo', t.tema_combo)
             order by t.created_at desc)
        from public.participacoes t where t.participante_id = v_part), '[]'::jsonb)
  ) into v;

  return v;
end;
$$;

grant execute on function public.get_ficha_participacao(text, uuid) to anon, authenticated;

-- ── 3 · Configuração que a tela precisa mostrar ───────────────────────────
-- A edição corrente é decisão de produção e aparece no alto do painel: sem ela
-- na tela, "por que a marca nova não tem formulário?" vira chamado de suporte.
create or replace function public.get_config_admin(p_secret text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return (select jsonb_build_object(
            'edicao_atual', edicao_atual,
            'senha_unica_ativa', senha_unica_ativa,
            'funcoes', (select jsonb_agg(jsonb_build_object('codigo', f.codigo, 'rotulo', f.rotulo)
                                         order by f.codigo) from public.funcoes f))
            from public.admin_config where id);
end;
$$;

grant execute on function public.get_config_admin(text) to anon, authenticated;

-- ── 4 · A foto do item segue a participação ───────────────────────────────
-- `registrar_foto_item` continua recebendo o id do ITEM, que já é único por
-- participação. O que muda é o guard: `producao.gerir`, e não
-- `pode_organizacao` — quem entra como `consulta` não escreve foto.
create or replace function public.registrar_foto_item(
  p_secret text, p_item_id uuid, p_foto_path text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  update public.participantes_itens set foto_path = p_foto_path where id = p_item_id;
  if not found then raise exception 'item_nao_encontrado'; end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'registrar_foto_item', 'participantes_itens', p_item_id::text,
          jsonb_build_object('foto_path', p_foto_path));
end;
$$;

/* `agendar_sessao_fotos` passa a aceitar a participação. Sessão é de uma
   edição: a marca é fotografada de novo a cada combo novo.
   ⚠️ O DROP VEM ANTES, e não é ordem qualquer. A assinatura de TIPOS não muda
   — `(text, uuid, timestamptz, text, text)` nos dois —, só o NOME do segundo
   argumento. `create or replace` recusa trocar nome de argumento, e um drop
   escrito depois apagaria a função recém-criada em vez da antiga. */
drop function if exists public.agendar_sessao_fotos(text, uuid, timestamptz, text, text);

create or replace function public.agendar_sessao_fotos(
  p_secret text, p_participacao uuid, p_data_hora timestamptz,
  p_local text default null, p_observacoes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_part uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  select participante_id into v_part from public.participacoes where id = p_participacao;
  if v_part is null then raise exception 'participacao_nao_encontrada'; end if;

  insert into public.sessoes_fotos
         (participante_id, participacao_id, data_hora, local, observacoes, criado_por)
  values (v_part, p_participacao, p_data_hora, p_local, p_observacoes, auth.uid())
  returning id into v_id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'agendar_sessao_fotos', 'sessoes_fotos', v_id::text,
          jsonb_build_object('participacao', p_participacao, 'data_hora', p_data_hora));

  return v_id;
end;
$$;

-- Mesmo guard na irmã: quem entra como `consulta` não remarca sessão.
create or replace function public.atualizar_sessao_fotos(
  p_secret text, p_sessao_id uuid, p_status text default null,
  p_data_hora timestamptz default null, p_local text default null,
  p_observacoes text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  update public.sessoes_fotos set
    status      = coalesce(p_status, status),
    data_hora   = coalesce(p_data_hora, data_hora),
    local       = coalesce(p_local, local),
    observacoes = coalesce(p_observacoes, observacoes)
  where id = p_sessao_id;

  if not found then raise exception 'sessao_nao_encontrada'; end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'atualizar_sessao_fotos', 'sessoes_fotos', p_sessao_id::text,
          jsonb_build_object('status', p_status));
end;
$$;

-- `get_sessoes_fotos` passa a dizer de qual edição é cada sessão.
drop function if exists public.get_sessoes_fotos(text);

create or replace function public.get_sessoes_fotos(p_secret text)
returns table (
  id uuid, participacao_id uuid, participante_id uuid, nome_marca text,
  edicao_codigo text, data_hora timestamptz, local text, status text, observacoes text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.participacao_id, s.participante_id, p.nome_marca,
         pa.edicao_codigo, s.data_hora, s.local, s.status, s.observacoes
    from public.sessoes_fotos s
    join public.participantes p on p.id = s.participante_id
    left join public.participacoes pa on pa.id = s.participacao_id
   where public.pode(p_secret, 'dado.ler')
   order by s.data_hora desc;
$$;

grant execute on function public.get_sessoes_fotos(text) to anon, authenticated;

-- `get_itens_participante` sai sem substituto: a ficha já traz os itens, e uma
-- segunda leitura dos mesmos três registros é a fonte duplicada do §5.2.
drop function if exists public.get_itens_participante(text, uuid);
