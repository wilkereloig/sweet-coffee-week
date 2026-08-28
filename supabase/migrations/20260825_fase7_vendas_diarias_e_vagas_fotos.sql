-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 7 · Lançamento diário de vendas + agenda de fotos em dois modos
-- 25/08/2026 — handoff "Painel SCW app", itens 4 e 7 do PATCH.
--
-- Duas features do handoff não tinham NENHUM suporte de banco (achado na
-- investigação: grep no histórico inteiro de migrations e functions não
-- retornou nada para "venda diária" nem para "vaga/slot de agenda"). Esta
-- migration é o alicerce das duas — a UI vem depois, numa fase separada.
--
-- ✅ APLICADA NO BANCO (confirmado por leitura direta do projeto em
-- 27/08/2026: `vendas_diarias` existe com as 3 policies; `abrir_vaga_fotos` e
-- `fechar_vaga_fotos` existem). NÃO RODAR DE NOVO — não há CLI/config.toml
-- neste projeto (§4.1 do CLAUDE.md), então reaplicar exigiria colar o corpo
-- no SQL Editor, e ele contém `drop constraint`/`drop policy` que em
-- produção derrubam a coerência de `sessoes_fotos` e a política de vagas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1 · Lançamento diário de combos vendidos ═══════════════════════════════
-- Uma linha por dia por participação. "Corrigir quantas vezes precisar" (copy
-- do handoff) é UPDATE na mesma linha, não uma nova — daí o unique em
-- (participacao_id, dia), e o front faz upsert (on_conflict) em vez de
-- decidir na mão se é POST ou PATCH.
create table if not exists public.vendas_diarias (
  id              uuid primary key default gen_random_uuid(),
  participacao_id uuid not null references public.participacoes(id) on delete cascade,
  dia             date not null,
  quantidade      integer not null check (quantidade >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint vendas_diarias_uma_por_dia unique (participacao_id, dia)
);

create index if not exists vendas_diarias_participacao_idx
  on public.vendas_diarias (participacao_id);

drop trigger if exists vendas_diarias_touch on public.vendas_diarias;
create trigger vendas_diarias_touch before update on public.vendas_diarias
  for each row execute function public.tocar_updated_at();

alter table public.vendas_diarias enable row level security;

-- A marca lê, lança e corrige o PRÓPRIO lançamento. Nunca apaga — errar o
-- número é sobrescrever, não desfazer o dia (o histórico de "dias já
-- lançados" da tela conta com toda data ter uma linha).
drop policy if exists vendas_marca_le on public.vendas_diarias;
create policy vendas_marca_le on public.vendas_diarias
  for select to authenticated
  using (exists (select 1 from public.participacoes pa
                   join public.participantes p on p.id = pa.participante_id
                  where pa.id = vendas_diarias.participacao_id and p.user_id = auth.uid()));

drop policy if exists vendas_marca_grava on public.vendas_diarias;
create policy vendas_marca_grava on public.vendas_diarias
  for insert to authenticated
  with check (exists (select 1 from public.participacoes pa
                        join public.participantes p on p.id = pa.participante_id
                       where pa.id = vendas_diarias.participacao_id and p.user_id = auth.uid()));

drop policy if exists vendas_marca_atualiza on public.vendas_diarias;
create policy vendas_marca_atualiza on public.vendas_diarias
  for update to authenticated
  using (exists (select 1 from public.participacoes pa
                   join public.participantes p on p.id = pa.participante_id
                  where pa.id = vendas_diarias.participacao_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.participacoes pa
                        join public.participantes p on p.id = pa.participante_id
                       where pa.id = vendas_diarias.participacao_id and p.user_id = auth.uid()));

revoke delete on public.vendas_diarias from anon, authenticated;

-- A organização lê pela ficha — uma chamada só, mesmo padrão de itens/
-- unidades/sessões (não uma quinta RPC de leitura solta).
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
    -- Novo: o histórico de lançamentos, pra mesma leitura da ficha mostrar o
    -- que a marca já lançou sem uma sexta RPC.
    'vendas', coalesce((
      select jsonb_agg(jsonb_build_object('dia', v.dia, 'quantidade', v.quantidade) order by v.dia desc)
        from public.vendas_diarias v where v.participacao_id = p_participacao), '[]'::jsonb),
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

-- ═══ 2 · Agenda de fotos — segundo modo: a marca escolhe entre vagas ════════
-- Hoje sessoes_fotos só serve "a organização agenda, a marca lê" — data_hora é
-- um timestamp livre, sempre com participante_id já definido. O modo novo
-- precisa de uma vaga que EXISTE antes de ter dono: por isso participante_id
-- vira opcional, e ganha edicao_codigo (a vaga pertence a uma edição, não
-- ainda a uma marca) e o status 'aberto'.
--
-- Não nasce tabela nova: seria a MESMA entidade (uma sessão de fotos, num
-- horário) reimplementada em paralelo — exatamente o que o §5.2 do CLAUDE.md
-- proíbe. "Vaga aberta" é só mais um valor de status na tabela que já existe.
alter table public.sessoes_fotos
  alter column participante_id drop not null,
  add column if not exists edicao_codigo text;

alter table public.sessoes_fotos drop constraint if exists sessoes_fotos_status_check;
alter table public.sessoes_fotos add constraint sessoes_fotos_status_check
  check (status in ('aberto', 'agendada', 'realizada', 'cancelada', 'remarcada'));

-- Vaga aberta não tem marca ainda, mas precisa saber de qual edição é (pra
-- filtrar quem pode vê-la). Qualquer outro status é uma sessão de verdade e
-- precisa de marca — o modelo antigo ("organização agenda direto") continua
-- exigindo isso, sem mudança de comportamento.
alter table public.sessoes_fotos drop constraint if exists sessoes_fotos_coerencia;
alter table public.sessoes_fotos add constraint sessoes_fotos_coerencia
  check (
    (status = 'aberto' and participante_id is null and participacao_id is null
     and edicao_codigo is not null)
    or (status <> 'aberto' and participante_id is not null)
  );

-- A marca passa a enxergar, além das PRÓPRIAS sessões (política que já
-- existia), as vagas ABERTAS da edição em que ela está participando — é o que
-- a tela de "As fotos" do cadastro precisa listar antes de escolher.
drop policy if exists fotos_marca_le on public.sessoes_fotos;
create policy fotos_marca_le on public.sessoes_fotos
  for select to authenticated
  using (
    exists (select 1 from public.participantes p
             where p.id = sessoes_fotos.participante_id and p.user_id = auth.uid())
    or (status = 'aberto' and exists (
          select 1 from public.participacoes pa
            join public.participantes p on p.id = pa.participante_id
           where p.user_id = auth.uid() and pa.edicao_codigo = sessoes_fotos.edicao_codigo))
  );

-- Reservar é a ÚNICA escrita que a marca faz aqui — e só numa vaga aberta da
-- própria edição, virando dona dela. RLS decide a linha, o grant de coluna
-- decide que campos: nem ela nem ninguém autenticado pode mexer em
-- data_hora/local/observacoes por aqui (só a organização, via RPC).
drop policy if exists fotos_marca_reserva on public.sessoes_fotos;
create policy fotos_marca_reserva on public.sessoes_fotos
  for update to authenticated
  using (
    status = 'aberto'
    and exists (select 1 from public.participacoes pa
                  join public.participantes p on p.id = pa.participante_id
                 where p.user_id = auth.uid() and pa.edicao_codigo = sessoes_fotos.edicao_codigo)
  )
  with check (
    status = 'agendada'
    and exists (select 1 from public.participacoes pa
                  join public.participantes p on p.id = pa.participante_id
                 where p.user_id = auth.uid()
                   and pa.id = sessoes_fotos.participacao_id
                   and pa.edicao_codigo = sessoes_fotos.edicao_codigo
                   and p.id = sessoes_fotos.participante_id)
  );

grant update (status, participacao_id, participante_id) on public.sessoes_fotos to authenticated;

-- "Fechado" nunca é um status gravado — é a ausência de linha naquele
-- horário. Abrir cria a linha; fechar (só enquanto ninguém reservou) apaga.
create or replace function public.abrir_vaga_fotos(
  p_secret text, p_edicao text, p_data_hora timestamptz, p_local text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  insert into public.sessoes_fotos (status, edicao_codigo, data_hora, local, criado_por)
  values ('aberto', p_edicao, p_data_hora, p_local, auth.uid())
  returning id into v_id;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'abrir_vaga_fotos', 'sessoes_fotos', v_id::text,
          jsonb_build_object('edicao', p_edicao, 'data_hora', p_data_hora));

  return v_id;
end;
$$;

-- Servidor confere de novo o que o clique já evita no cliente: vaga
-- reservada não fecha por aqui (§ "não desmarcar alguém por engano").
create or replace function public.fechar_vaga_fotos(p_secret text, p_sessao_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;

  delete from public.sessoes_fotos where id = p_sessao_id and status = 'aberto';
  if not found then raise exception 'vaga_indisponivel'; end if;

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'fechar_vaga_fotos', 'sessoes_fotos', p_sessao_id::text, '{}'::jsonb);
end;
$$;

-- LEFT JOIN, não JOIN: uma vaga 'aberto' não tem participante_id, e um JOIN
-- comum a apagaria da lista da organização — ela ficaria "vendo" só metade
-- da própria agenda.
create or replace function public.get_sessoes_fotos(p_secret text)
returns table (
  id uuid, participacao_id uuid, participante_id uuid, nome_marca text,
  edicao_codigo text, data_hora timestamptz, local text, status text, observacoes text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.participacao_id, s.participante_id, p.nome_marca,
         coalesce(pa.edicao_codigo, s.edicao_codigo), s.data_hora, s.local, s.status, s.observacoes
    from public.sessoes_fotos s
    left join public.participantes p on p.id = s.participante_id
    left join public.participacoes pa on pa.id = s.participacao_id
   where public.pode(p_secret, 'dado.ler')
   order by s.data_hora desc;
$$;
