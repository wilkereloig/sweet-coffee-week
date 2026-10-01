-- =============================================================================
-- Função "Comercial" na equipe da organização — 01/10/2026 (pedido do Wilker).
--
-- Comercial cuida do relacionamento: Contatos (pessoas, Press Kit, Vouchers,
-- recebidos do site) e mensagens às marcas. Lê tudo, como as outras funções.
-- Não decide curadoria, não mexe em produção, pagamento nem em contas.
--
-- As ações já existem e já guardam as RPCs (pode(…, 'relacionamento.gerir')
-- em salvar_contato, definir_presskit, gerar/destinar/atualizar_voucher). Por
-- isso a função nova é só linha de tabela: nenhuma RPC muda.
-- =============================================================================

update public.funcoes set ordem = ordem + 1 where ordem >= 4;

insert into public.funcoes (codigo, rotulo, ordem)
values ('comercial', 'Comercial', 4)
on conflict (codigo) do update set rotulo = excluded.rotulo, ordem = excluded.ordem;

insert into public.permissoes (funcao, acao) values
  ('comercial', 'dado.ler'),
  ('comercial', 'relacionamento.gerir'),
  ('comercial', 'mensagem.enviar')
on conflict do nothing;
