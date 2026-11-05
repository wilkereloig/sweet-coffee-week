# 15 · Caça aos Carimbos — contrato do banco: grupos e rota colaborativa

Migration `supabase/migrations/20261206_caca_grupos.sql` (aplicada em 04/11/2026). Teste: `supabase/testes/caca-grupos.sql`.
Regra de produto: `15-caca-especificacao.md` §7 e §8. Chamar sempre por RPC (`supabase.rpc(nome, args)`) com a chave publicável; as tabelas são fechadas.

## Convenções
- **Identidade** = pessoa = e-mail normalizado do mapa. Todas as RPCs recebem `p_chave` (a chave pessoal do mapa, a mesma de `mapa_ler_v2`). Dois mapas com o mesmo e-mail são **um** integrante, e só o **mapa principal** da pessoa (o confirmado mais antigo; senão o mais antigo — `15-caca-contrato-identidade.md`, D8) lê e edita o grupo. O outro mapa do mesmo e-mail recebe `{ ok:false, motivo:'negado' }` em **todas** as RPCs que recebem chave (SEC-01, migration 20261210); o caminho dele é "recuperar mapa". O apelido mostrado no grupo é o do mapa principal.
- **Retorno**: sempre `jsonb`. Sucesso tem `ok: true`. Falha de negócio **não levanta exceção**: `{ "ok": false, "motivo": "<código>" }`. (`caca_grupo_convite_ver` é a exceção: usa `valido`.)
- **Acesso negado é uniforme**: quem não é integrante ativo, grupo inexistente e grupo de outra edição dão o mesmo `negado` (não revela se o grupo existe).
- **Chave desconhecida** em qualquer RPC: `motivo: "mapa_desconhecido"`.
- Nenhuma RPC devolve e-mail, WhatsApp, chave ou hash. Integrante é identificado por `membro_id` (uuid sem relação com o e-mail).
- `slug` = `participacoes.slug_publico` da casa (o mesmo de `mapa_ler_v2.casas[].slug`).
- Quem pode chamar: todas as RPCs abaixo têm `GRANT EXECUTE` para `anon` e `authenticated`; a autorização real é a chave do mapa verificada no servidor.

## Decisões de regra
- **Convite não torna nada público.** `caca_grupo_convite_ver` devolve só nome, quantidade de integrantes e validade. Para entrar é preciso ter mapa próprio e **aceitar** que apelido e progresso serão vistos (`p_aceite_visibilidade = true`; gravado em `aceite_visibilidade_em`). Quem cria também aceita.
- **Link de convite**: qualquer integrante pode gerar um link novo; **só o dono revoga**. Revogar derruba todos os links ativos e trava a geração por integrantes até o dono gerar um novo. Só o **hash** do token fica no banco: **o link só aparece na resposta que o criou** (guardar/mostrar naquele momento; não há como recuperar depois — gere outro).
- **Dono** que sai passa o grupo ao integrante ativo mais antigo; se não sobra ninguém, os convites morrem. **Só o dono remove** integrante; removido não volta a este grupo, nem por link novo (`removido_do_grupo`); quem saiu por conta própria volta com link novo.
- **Ranking do grupo**: integrantes ativos reordenados entre si — mais casas validadas, depois mais extras; empate = **mesma posição** (a seguinte pula, como `rank()`); sem desempate por hora. `posicao: null` para quem ainda não validou casa. O progresso individual vem do `caca_placar_v2` (mesma regra do ranking geral; carimbos feitos antes de entrar no grupo contam).
- **Progresso coletivo** = nº de casas **distintas** validadas por pelo menos um integrante ativo; cada casa conta uma vez. É conquista visual e não altera nenhuma regra individual. Pendente (falta avaliar) não conta.
- **Rota** é lista de planejamento: **nunca cria carimbo nem marca visita**. Qualquer integrante adiciona, move e remove. Posições são sempre densas (1..n). Edições concorrentes são serializadas no servidor por grupo; o front pode mandar `p_versao` (a `rota_versao` que viu) para detectar conflito.
- Limites (tabela `caca_grupo_config`, ajustáveis por `UPDATE` sem migration): 30 integrantes por grupo, 5 grupos ativos por pessoa, link válido por 7 dias, 5 links ativos por grupo. Nome do grupo: 2 a 40 caracteres (espaços repetidos são colapsados).

## Códigos de `motivo` (todas as RPCs)
`mapa_desconhecido` · `negado` · `so_dono` · `nome_invalido` · `aceite_obrigatorio` · `limite_grupos` · `limite_convites` · `convite_invalido` · `convite_revogado` · `convite_expirado` · `convite_esgotado` · `edicao_diferente` · `removido_do_grupo` · `grupo_cheio` · `membro_desconhecido` · `use_sair` · `casa_desconhecida` · `nao_esta_na_rota` · `posicao_invalida` · `conflito` · `operacao_invalida` (interno; o front não deve ver).

---

## `caca_grupo_criar(p_chave text, p_nome text, p_aceite_visibilidade boolean default false)`
Cria o grupo; quem cria vira **dono** e já vem com um link de convite.
- Sucesso: `{ ok: true, grupo_id: uuid, nome: text, convite_token: text, convite_expira_em: timestamptz }`
- Erros: `mapa_desconhecido`, `nome_invalido`, `aceite_obrigatorio` (se `p_aceite_visibilidade` não for `true`), `limite_grupos`.
- O link para compartilhar é montado pelo front com `convite_token` (ex.: `/cartoon/caca/grupo?convite=<token>`). Não gravar o token em log/analytics.

## `caca_grupo_convite_ver(p_token text)` — anônimo, sem chave
Pré-visualização do convite para a tela "Você foi convidado".
- Válido: `{ valido: true, nome_do_grupo: text, membros_qtd: int }` — **somente essas 3 chaves**.
- Inválido: `{ valido: false, nome_do_grupo: null, membros_qtd: null, motivo: "convite_invalido" | "convite_revogado" | "convite_expirado" | "convite_esgotado" }`. Nenhum dado do grupo vaza quando inválido.
- Não informa se o grupo está cheio: isso só aparece em `entrar` (`grupo_cheio`).

## `caca_grupo_entrar(p_chave text, p_token text, p_aceite_visibilidade boolean default false)`
Entra no grupo com o mapa **próprio**. Não cria carimbo para ninguém.
- Sucesso: `{ ok: true, grupo_id, nome, ja_membro: boolean }`. **Idempotente**: se a pessoa (pelo mapa principal) já é integrante, devolve `ok: true, ja_membro: true` sem gastar uso do convite — inclusive com convite já revogado.
- Erros (na ordem em que são avaliados): `mapa_desconhecido`, `convite_invalido` (token inexistente ou grupo vazio), `edicao_diferente`, `convite_revogado`, `convite_expirado`, `convite_esgotado`, `removido_do_grupo`, `aceite_obrigatorio`, `grupo_cheio`, `limite_grupos`.
- Quem saiu por conta própria pode voltar com um convite válido (entra como `membro`, com novo aceite).

## `caca_grupo_convite_novo(p_chave text, p_grupo uuid)`
Gera um link novo. Integrante ou dono; integrante só enquanto o dono não tiver revogado (`convites_so_dono`). Quando o dono gera, destrava para os integrantes.
- Sucesso: `{ ok: true, convite_token: text, convite_expira_em: timestamptz }`
- Erros: `mapa_desconhecido`, `negado`, `so_dono`, `limite_convites`.

## `caca_grupo_convite_revogar(p_chave text, p_grupo uuid)` — só dono
Revoga **todos** os links ativos e trava a geração por integrantes.
- Sucesso: `{ ok: true, revogados: int }`
- Erros: `mapa_desconhecido`, `negado`, `so_dono`.

## `caca_grupo_sair(p_chave text, p_grupo uuid)`
O integrante sai (perde o acesso na hora). Se for o dono, a posse passa ao integrante ativo mais antigo; sem ninguém, os convites são revogados.
- Sucesso: `{ ok: true }`
- Erros: `mapa_desconhecido`, `negado` (inclusive "já saiu").

## `caca_grupo_remover_membro(p_chave text, p_grupo uuid, p_membro uuid)` — só dono
`p_membro` = `membro_id` devolvido por `caca_grupo_ler`. Não serve para remover a si mesmo (use `sair`).
- Sucesso: `{ ok: true }`
- Erros: `mapa_desconhecido`, `negado`, `so_dono`, `membro_desconhecido`, `use_sair`.

## `caca_grupo_listar(p_chave text)`
Grupos ativos da pessoa na edição do mapa (mais recentes primeiro).
- Sucesso: `{ ok: true, total_casas: int, grupos: [ { grupo_id, nome, papel: "dono"|"membro", entrou_em, membros_qtd: int, casas_coletivas: int, total_casas: int } ] }`
- Erros: `mapa_desconhecido`.

## `caca_grupo_ler(p_chave text, p_grupo uuid)` — só integrante ativo
- Sucesso:
```json
{
  "ok": true,
  "grupo": { "id": "uuid", "nome": "text", "criado_em": "ts", "convites_so_dono": false },
  "eu": { "membro_id": "uuid", "papel": "dono|membro" },
  "membros": [
    { "membro_id": "uuid", "apelido": "text", "papel": "dono|membro", "casas": 2, "extras": 1,
      "posicao": 1, "entrou_em": "ts", "eu": false }
  ],
  "total_casas": 27,
  "casas_coletivas": 3,
  "faltam_coletivo": 24,
  "casas_coletivas_slugs": ["slug-a", "slug-b"],
  "rota_versao": 6,
  "rota": [
    { "posicao": 1, "slug": "slug-a", "adicionado_por": "apelido", "adicionado_por_membro": "uuid|null", "adicionado_em": "ts" }
  ]
}
```
  - `membros` ordenados por `posicao` (nulos por último) e apelido. `posicao` é a do **grupo** (não a do ranking geral) e é `null` com 0 casas. `eu` marca a própria linha (use `eu.membro_id` para comparar com `adicionado_por_membro`).
  - `total_casas` vem da edição (casas não encerradas com publicação vigente), nunca de número fixo.
  - `casas_coletivas_slugs` = casas validadas por pelo menos um integrante (para pintar o mapa do grupo); sem dizer por quem.
  - `adicionado_por_membro` pode ser `null` se a linha do autor não existir mais.
- Erros: `mapa_desconhecido`, `negado`.

## Rota colaborativa
Todas exigem ser integrante ativo. Resposta de sucesso igual para as três: `{ ok: true, mudou: boolean, versao: int, rota: [ {posicao, slug, adicionado_por, adicionado_por_membro, adicionado_em} ] }`.
`p_versao` é opcional: se enviado e diferente da versão atual, nada é alterado e volta `{ ok: false, motivo: "conflito", versao: <atual>, rota: [...] }` — o front mostra a rota atual e deixa o usuário repetir. A `versao` só sobe quando algo muda de fato (operação repetida/idempotente não sobe).

### `caca_grupo_rota_adicionar(p_chave text, p_grupo uuid, p_slug text, p_versao int default null)`
Adiciona **no fim**. Casa já na rota: `ok: true, mudou: false`. Só casas publicadas (não encerradas, com publicação vigente).
- Erros: `mapa_desconhecido`, `negado`, `conflito`, `casa_desconhecida`.

### `caca_grupo_rota_remover(p_chave text, p_grupo uuid, p_slug text, p_versao int default null)`
Remove e recompacta as posições. Casa fora da rota: `ok: true, mudou: false`.
- Erros: `mapa_desconhecido`, `negado`, `conflito`, `casa_desconhecida`.

### `caca_grupo_rota_mover(p_chave text, p_grupo uuid, p_slug text, p_posicao int, p_versao int default null)`
Leva a casa para `p_posicao` (1-based; maior que o tamanho vira o fim). Mesma posição: `mudou: false`.
- Erros: `mapa_desconhecido`, `negado`, `conflito`, `casa_desconhecida`, `nao_esta_na_rota`, `posicao_invalida` (null ou < 1).

---

## Pendências e riscos conhecidos
- **E-mail não confirmado**: hoje `mapa_criar` não confirma o e-mail, e a identidade do grupo é o e-mail. Quem criar um mapa com o e-mail de outra pessoa passa a ser "essa pessoa" para os grupos dela (vê apelidos e progresso dos grupos, pode editar a rota). Quando existir confirmação de e-mail, exigi-la em um único ponto: o lookup de mapa no começo de cada RPC (ou uma função interna `caca_grupo_mapa(p_chave)`), sem mudar o contrato.
- **Dono transferido automaticamente** quando sai (regra desta migration); se o produto preferir "escolher o novo dono", é função nova.
- Sem painel/organização para grupos (não pedido). Sem notificações de grupo.
- Reverter: bloco `-- reverter:` no fim da migration (drop das funções e das 5 tabelas `caca_grupo*`).
