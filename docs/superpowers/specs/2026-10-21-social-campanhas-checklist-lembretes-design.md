# Social media — campanhas, checklist e lembretes (21/10/2026)

Pedido do Wilker: depois da auditoria, "funções novas do Social media". Escolhidas por ele: **lembretes automáticos**,
**campanhas** e **checklist por postagem**. Fora deste lote: modelos de legenda/hashtags, duplicar com recorrência, visão por
perfil/formato, opção de cada pessoa desligar lembretes. Publicação: tudo junto no fim (pedido dele), em `master` e
`dev/site-completo`.

Princípios herdados do módulo (`painel-app/CLAUDE.md`, "Social media"): o painel **não publica** no Instagram; toda mudança passa
por RPC `fn(p_secret, …)` guardada por `redes_exigir`; nada é apagado (arquiva); "Salvo" só depois da resposta do servidor;
fuso America/Fortaleza; sinal de sincronização classificado em `lib/sync/dominios.js`.

## 1. Campanhas

**Modelo.** Uma campanha por postagem (decisão do Wilker), ou nenhuma.

- `redes_campanhas`: `id`, `nome` (1–60, único entre as não arquivadas, sem diferenciar maiúscula), `cor` (chave da paleta de
  `CORES_PASTA`: amarelo, laranja, magenta, roxo, cyan, verde, marrom), `descricao` (≤300), `inicio` e `fim` (date, opcionais,
  `fim >= inicio`), `meta` (int ≥ 0, opcional), `arquivada`, `criado_por_id`, `criado_por_rotulo`, `criado_em`, `atualizado_em`.
- `redes_posts.campanha_id uuid null references redes_campanhas(id)` (sem `on delete cascade`; nunca se apaga campanha).
- Permissão: `redes.editar` cria, edita e arquiva/restaura (é o planejamento da Social media). `redes.ver` lê.
- RPCs: `redes_campanhas_listar(p_secret)` (cada campanha com `n_total`, `n_publicadas`, `n_abertas`, `n_atrasadas`; canceladas não
  contam), `redes_campanha_salvar(p_secret, p_id, p_dados)` (cria quando `p_id` é nulo), `redes_campanha_arquivar(p_secret, p_id,
  p_arquivar)`. Erros: `nome_obrigatorio`, `nome_repetido`, `cor_invalida`, `periodo_invalido`, `meta_invalida`,
  `campanha_nao_encontrada`.
- `redes_salvar`/`redes_criar` aceitam `campanha_id` (campanha arquivada não pode ser escolhida para uma postagem nova, mas a
  postagem que já a tem continua com ela). `redes_json` e `redes_listar` devolvem `campanha_id`, `campanha_nome`, `campanha_cor`.
- Mudar a campanha de uma postagem entra no histórico da postagem (`conteudo`, campo `campanha`) e **não** desfaz aprovação
  (como horário e responsável).

**Tela.**

- Ficha da postagem: seletor "Campanha" acima de "Edição" (o rótulo do campo `edicao_codigo` passa de "Edição ou campanha" para
  "Edição"), com "Nova campanha…" que abre o formulário curto no lugar.
- Cartão: ponto colorido + nome curto da campanha. Filtros: "Campanha" (fica no endereço, `camp=<id>`).
- Aba **Campanhas** em `#social/campanhas` (ao lado de Planejamento, Biblioteca, Participantes): cartão por campanha com período,
  barra "12 de 20 publicadas" (meta quando houver; sem meta, "12 publicadas de 18 planejadas"), atrasadas, "Ver no calendário"
  (abre Planejamento já filtrado), editar, arquivar. Arquivadas ficam em "Arquivadas", com "Restaurar".
- Lógica pura em `lib/campanhas.js` (progresso, rótulos, validação do formulário, ordem), testada em Node.

## 2. Checklist por postagem (avisa, não trava)

- `redes_checklist_modelos`: `id`, `formato` (feed, carrossel, reels, story), `ordem`, `texto` (1–80), `ativo`. Itens iniciais,
  que `redes.gerir` ajusta depois no painel:
  - todo formato: "Arte conferida (formato, corte, texto sem erro)", "Legenda revisada", "Marcas e menções conferidas", "Data e horário confirmados";
  - reels: "Capa definida", "Áudio escolhido";
  - story: "Link ou adesivo configurado".
- `redes_checklist_itens`: `id`, `post_id`, `ordem`, `texto` (1–80), `feito`, `feito_por_id`, `feito_por_rotulo`, `feito_em`.
  A postagem recebe a cópia dos itens ativos do modelo do formato ao ser criada; postagem sem itens (antiga) ganha a cópia na
  primeira leitura (`redes_checklist_garantir`, só em postagem aberta). Mudar o formato depois **não** mexe nos itens.
- RPCs (todas com `redes.editar`, exceto o modelo): `redes_checklist_marcar(p_secret, p_item, p_feito)`,
  `redes_checklist_item_salvar(p_secret, p_post, p_texto)` (acrescentar), `redes_checklist_item_remover(p_secret, p_item)`,
  `redes_checklist_modelos_listar(p_secret)` (`redes.ver`), `redes_checklist_modelo_salvar(p_secret, p_formato, p_itens)`
  (`redes.gerir`, substitui a lista do formato; só afeta postagens novas). Postagem fechada (publicada/cancelada) recusa
  mudança (`post_fechado`, via `redes_post_aberto`).
- `redes_json`/`redes_listar` devolvem `checklist_total` e `checklist_feitos`; a ficha lê os itens por `redes_post`.
- Marcar/remover não sobe a `versao` da postagem nem toca `atualizado_em` (checklist é anotação, não conteúdo aprovado).
- **Tela:** bloco "Checklist" na ficha, antes das gavetas: itens com caixa de marcar (alvo ≥ 44 px), "quem e quando" em
  segundo plano, campo "Acrescentar item" e remover item. "Enviar para aprovação" com itens abertos pede confirmação com a
  lista dos que faltam e deixa seguir. Cartão: "3/5" em postagem aberta que tenha checklist. Modelos: folha "Checklist padrão"
  aberta de "Como funciona"/menu da aba Campanhas, só `redes.gerir`.
- Lógica pura em `lib/checklist.js` (contagem, itens abertos, texto da confirmação).

## 3. Lembretes automáticos

`redes_lembretes(p_agora timestamptz default now())` (security definer, sem `p_secret`: só o `pg_cron` e o dono do banco
executam; `revoke execute` de `public`, `anon` e `authenticated`). Job `scw-redes-lembretes`, `*/10 * * * *`. A função devolve
sem fazer nada fora de **07:00–22:00** de Fortaleza.

| Lembrete | Quando | Quem | Tipo (dedupe) |
|---|---|---|---|
| Resumo do dia | primeira rodada ≥ 08:00 do dia | cada responsável com postagem aberta hoje ou atrasada (um aviso por pessoa; só se houver algo) | `resumo` + data |
| 1 h antes, sem aprovação | `programado_para - 1h <= agora < programado_para`, situação `rascunho`/`aprovacao` | responsável + aprovadores | `sem_aprovacao` + `programado_para` |
| Passou do horário | `programado_para + 30min <= agora < +24h`, situação não fechada | responsável (e aprovadores se não estiver `pronto`) | `atrasada` + `programado_para` |
| Falta arte/legenda a 2 dias | na rodada das 08h, data da postagem (Fortaleza) = hoje + 2, com `sem_arte` ou `sem_legenda` em `redes_pendencias` | responsável | `faltando` + `programado_para` |

- Sem responsável: quem criou a postagem. Conta inativa/bloqueada/sem acesso a redes é pulada (`pode_por_user`).
- `redes_lembretes_enviados(post_id, tipo, chave_dia, user_id, enviado_em)` com `unique (tipo, post_id, chave_dia, user_id)`; o
  `insert … on conflict do nothing` decide se avisa. Reagendar a postagem muda o `chave_dia` e libera um aviso novo.
- Aviso: `avisar_pessoa(user, 'redes', título, texto, 'social/planejamento/<id>', chave, participante)`; o push segue o caminho
  que já existe (`disparar_push`). Resumo: link para `social/planejamento` (lista rápida).
- Teste de banco com `p_agora` simulado: cada regra dispara uma vez, não repete na rodada seguinte, respeita a janela de
  horário e reagendamento libera de novo.

## Sincronização, testes e documentação

- Domínios: `redes` (todas as RPCs novas) e `campanhas` entra no vocabulário só se for necessário para a aba; gatilho de
  sinal em `redes_campanhas`, `redes_checklist_itens` e `redes_checklist_modelos` para o canal `scw:social`.
  `lib/sync/dominios.js` classifica cada RPC nova; `tests/painel-app-sincronizacao-ampliada.test.mjs` reprova esquecimento.
- Migrations (aditivas, cada função substituída conferida por `md5` contra a definição do banco antes de aplicar):
  `20261031_social_campanhas.sql`, `20261101_social_checklist.sql`, `20261102_social_lembretes.sql`
  (prefixo = data, só para ordenar; no banco o registro leva o carimbo do `apply_migration`).
- Testes: Node (`tests/painel-app-campanhas.test.mjs`, `painel-app-checklist.test.mjs`), banco (`supabase/testes/social-campanhas.sql`,
  `social-checklist.sql`, `social-lembretes.sql`, todos terminando em exceção `TESTE_OK`), navegador estendendo
  `tests/painel-social-aprovacao-navegador.mjs` (campanha no cartão, checklist na ficha, confirmação de envio).
- Documentar em `painel-app/CLAUDE.md` e `painel-app/NOVIDADES.txt`; relatório e diário no Dropbox; memória `progresso-scw.md`.

## Fora do lote (de propósito)

Modelos de legenda e hashtags; duplicar com recorrência; visão por perfil/formato; desligar lembretes por pessoa; lembrete de
campanha prestes a acabar; checklist que trava etapa.
