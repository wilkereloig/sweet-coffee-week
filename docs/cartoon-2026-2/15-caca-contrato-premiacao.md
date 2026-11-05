# 15 · Caça aos Carimbos, contrato da premiação (migration 20261204)

Aplicada no Supabase `dgfmoibynftadsyjcclg` em 05/11/2026 (nome da migration no banco: `caca_premiacao`). Regra: `15-caca-especificacao.md` §5 e §6.
Todas as funções abaixo são **só de painel**: recebem `p_secret` (a senha do painel, ou nada quando a sessão é de conta da organização) e passam por `public.pode()`.
Erros chegam como `RAISE EXCEPTION '<código>'` (o cliente lê `error.message`). Chamada: `supabase.rpc('<nome>', { p_secret, ... })`, perfil `anon` ou `authenticated`.

| Função | Permissão | Contato (e-mail/WhatsApp) |
|---|---|---|
| `caca_config_ler` | `dado.ler` | não tem |
| `caca_config_gravar` | `edicao.gerir` | não tem |
| `caca_apurar_dia` | `edicao.gerir` | só com `relatorio.ler` |
| `caca_premio_acao` | `edicao.gerir` | só com `relatorio.ler` |
| `caca_premio_listar` | `dado.ler` | só com `relatorio.ler` |
| `caca_sorteio_final` | `edicao.gerir` | só com `relatorio.ler` |

Hoje `edicao.gerir` e `relatorio.ler` são só do Administrador; `dado.ler` vale para qualquer função da organização. Sem permissão: `nao_autorizado`.
Sem `relatorio.ler` as chaves `email` e `whatsapp` **somem** do JSON (não vêm `null`). O **apelido** sempre vem.
Nenhuma dessas funções é pública: o site do visitante e o app da Caça **não** chamam nada daqui. A surpresa do prêmio final não aparece em nenhum retorno.

## Conceitos

- **Pessoa** = e-mail normalizado. `email` nos retornos é essa chave.
- **Foto do dia** (`caca_apuracao_dia`): ranking de `caca_ranking_v2` com corte, gravado uma vez por dia e **imutável**. Anular carimbo depois não muda a foto. `hash` = sha256 de `edição|dia|corte|ranking`.
- **Corte**: hora local de Natal em `fuso` + `corte_hora_local` (padrão 23:59). O minuto inteiro conta (23:59:59 entra, 00:00:00 não). `corte` no retorno é o limite exclusivo (dia seguinte 00:00 local).
- **Estados do prêmio**: `selecionado` → `confirmado` → `entregue`; `expirado`, `substituido`, `cancelado`. Só `confirmado` e `entregue` tiram a pessoa das apurações seguintes; `selecionado` pendente a tira **temporariamente**; `expirado` volta a concorrer em outros dias.
- **E-mail confirmado** (`mapas_lover.email_confirmado_em` no **mapa principal** da pessoa; perfil e contato do prêmio vêm desse mesmo mapa — migration 20261210): o prêmio nasce `confirmado`, sem prazo. Senão nasce `selecionado` com `prazo_ate`.
- **Prazo**: 1ª chamada = `prazo_confirmacao_proximo_dia_hora` (12h) do dia seguinte, em Natal. Chamadas seguintes (substituição) = agora + `prazo_segunda_chamada_min` (120 min, **proposta**). Nada expira sozinho: `vencido: true` no JSON só **sinaliza**; a organização aciona `expirar`/`substituir`.

### Objeto `premio` (retornado por apurar, acao e listar)

```
{ id: uuid, tipo: 'voucher_dia' | 'final', dia: 'YYYY-MM-DD' (só voucher_dia), posicao: int|null,
  estado: 'selecionado'|'confirmado'|'entregue'|'expirado'|'substituido'|'cancelado',
  apelido: text, prazo_ate: timestamptz|ausente, vencido: bool (sempre presente), email_confirmado: bool,
  substitui_id: uuid|ausente, motivo: text|ausente, semente: text|ausente (só quando houve sorteio),
  detalhe: { casas, extras, desempate: bool, empatados: int, email_confirmado: bool, segunda_chamada: bool, valido_ate: 'YYYY-MM-DD' }  // voucher
          | { casas, extras, peso, motivo, hash_verificacao }                                                                          // final
  criado_em, atualizado_em,
  email, whatsapp  // só com relatorio.ler; whatsapp ausente se a pessoa não informou
}
```
`posicao` do voucher = posição da pessoa na foto do dia. `posicao` do final = 1..N na ordem em que saiu.

## `caca_config_ler(p_secret text) → jsonb`

Retorna `{ "<chave>": { valor, proposta: bool, nota: text|null, atualizado_em, atualizado_por } , ... }` com as 10 chaves:

| chave | valor (JSON) | padrão |
|---|---|---|
| `voucher_dias` | array de datas `"YYYY-MM-DD"` (1 a 31) | 7 a 11/11/2026 |
| `corte_hora_local` | `"HH:MM"` | `"23:59"` |
| `fuso` | nome IANA | `"America/Fortaleza"` |
| `peso_base` | inteiro 1..10000 | 100 |
| `ganhadores_final` | inteiro 1..20 | 3 |
| `prazo_confirmacao_proximo_dia_hora` | inteiro 0..23 | 12 |
| `prazo_segunda_chamada_min` | inteiro 1..1440 | 120 (**`proposta: true`**, mostrar como proposta na tela) |
| `voucher_validade_ate` | `"YYYY-MM-DD"` | `"2026-11-15"` |
| `intervalo_carimbo_h` | inteiro 0..72 | 12 (**informativo**: `mapa_carimbar` ainda usa 12 fixo) |
| `email_confirmado_se_sem_coluna` | boolean | false (inerte: a coluna já existe) |

Erros: `nao_autorizado`.

## `caca_config_gravar(p_secret text, p_chave text, p_valor jsonb) → jsonb`

Grava **uma chave que já existe** (não cria chave nova). Retorna `{ ok: true, chave, valor }`. Audita em `caca_evento` (`acao = 'config_gravar'`, antes/depois). Mexer em `peso_base`/`ganhadores_final` só vale para sorteios futuros.
Erros: `nao_autorizado`, `chave_desconhecida`, `valor_invalido` (tipo ou faixa errada).

## `caca_apurar_dia(p_secret text, p_edicao text, p_dia date, p_semente text default null) → jsonb`

Congela a foto do dia (se ainda não existe) e seleciona o 1º elegível: mais casas, depois mais extras; empate = sorteio verificável. Excluídos: quem já tem voucher `confirmado`/`entregue`, quem está `selecionado` pendente em qualquer dia, quem já falhou neste mesmo dia (`expirado`/`substituido`/`cancelado`). Só entra quem tem ao menos 1 casa validada até o corte.
`p_semente` só é usada em empate; se vier vazia, o servidor gera uma e a grava em `premio.semente`.
**Idempotente**: se o dia já tem prêmio ativo, devolve o existente (`ja_apurado: true`) sem mexer em nada.

Retorno:
```
{ ok: true, edicao, dia,
  snapshot: { hash, corte, criado_em, participantes: int, ja_existia: bool },
  ja_apurado: bool,
  premio: <premio> | ausente,
  motivo: 'sem_elegivel' | ausente }     // foto criada, mas ninguém elegível
```
Erros: `nao_autorizado`, `parametro_invalido`, `dia_fora_do_periodo` (dia não está em `voucher_dias`), `dia_nao_encerrado` (o corte ainda não passou: a foto não se cria antes, porque é imutável).

## `caca_premio_acao(p_secret text, p_premio uuid, p_acao text, p_nota text default null) → jsonb`

| `p_acao` | de | para | observação |
|---|---|---|---|
| `confirmar` | selecionado | confirmado | limpa `prazo_ate` |
| `entregar` | confirmado | entregue | limpa `prazo_ate` |
| `expirar` | selecionado | expirado | |
| `cancelar` | selecionado, confirmado | cancelado | |
| `substituir` | selecionado, confirmado, expirado (só `voucher_dia`) | substituido | chama o próximo elegível **do mesmo dia**, com `prazo_segunda_chamada_min` (ou já `confirmado` se o e-mail está confirmado) |

`p_nota` vira `motivo` do prêmio e vai ao evento de auditoria. Prêmio `final` aceita `confirmar`, `entregar`, `expirar`, `cancelar` (não `substituir`).
Retorno: `{ ok: true, premio: <premio já no novo estado>, novo_premio: <premio> | ausente }` (`novo_premio` só em `substituir`, com `substitui_id` apontando para o antigo).
Erros: `nao_autorizado`, `premio_nao_encontrado`, `acao_invalida`, `transicao_invalida`, `sem_proximo_elegivel` (em `substituir`; nada muda, nem o estado antigo).

## `caca_premio_listar(p_secret text, p_edicao text) → jsonb`

```
{ premios:   [ <premio>, ... ]                       // ordem: tipo, dia, posicao, criado_em
  apuracoes: [ { dia, corte, hash, total_casas, participantes, criado_em, criado_por,
                 ranking: [ { posicao, apelido, casas, extras, email? } ] } ],   // só posição <= 10; email só com relatorio.ler
  eventos:   [ { id, premio_id|null, acao, ator, antes, depois, nota, quando } ] }  // últimos 200, mais novo primeiro
```
`acao` dos eventos: `apurar_dia`, `selecionar`, `chamar_proximo`, `confirmar`, `entregar`, `expirar`, `cancelar`, `substituir`, `sorteio_final`, `sorteio_final_realizado`, `config_gravar`. `ator` = nome do perfil da organização, ou "Acesso compartilhado" quando entrou pela senha. `antes`/`depois` nunca levam e-mail nem WhatsApp.
Erros: `nao_autorizado`.

## `caca_sorteio_final(p_secret text, p_edicao text, p_semente text, p_simular boolean default true) → jsonb`

Regra (regulamento em `src/edicao/cartoon/regulamento.js`): concorre quem validou **todas** as casas (`casas >= total_casas`).
- **Até `ganhadores_final` completos** (`regra: 'todos_completos_ganham'`): todos ganham (`motivo: 'completo'`); as vagas que sobram vão para quem tem mais casas, depois mais extras (`'vaga_restante'`); se o grupo empatado da última vaga for maior que as vagas, sorteio entre eles (`'vaga_restante_sorteio'`).
- **Mais completos que vagas** (`regra: 'sorteio_ponderado'`): sorteio ponderado **sem reposição**, peso = `peso_base + extras` (0 extras = 100, 5 = 105, 10 = 110). Ganhar voucher **não** exclui. `motivo: 'sorteio_ponderado'`.
- Verificável: PRNG = 48 bits de sha256(`semente` + `:` + índice) / 2^48; lista de concorrentes ordenada por e-mail normalizado; mesma semente + mesmos dados = mesmo resultado. `hash_verificacao` = sha256(`semente|N|peso_base|email:peso,...`).
- **`p_simular = true` (padrão) não cria prêmio**, mas **deixa rastro**: grava o evento `sorteio_simulado` (`semente_hash` = sha256 da semente, `comprometida`, `concorrentes`; a semente em claro não vai para o evento). Só `p_simular = false` grava os prêmios `tipo = 'final'` (estado `selecionado`, `semente` preenchida) e eventos, **uma vez por edição**. **Não rodar `false` fora do sorteio oficial.**
- **Semente comprometida (SEC-07, migration 20261212).** Para o sorteio real a semente tem que ser comprometida **antes** do fim da avaliação: `caca_sorteio_comprometer(p_secret, p_edicao, p_hash)` (gate `edicao.gerir`) grava em `caca_evento` (imutável) o `sha256` da semente (hex minúsculo, texto sem espaços nas pontas). Um compromisso por edição (`compromisso_ja_registrado`), só antes de `avaliacao_fecha_em` (`compromisso_tardio`), hash de 64 hex (`hash_invalido`). O real (`p_simular = false`) só roda **depois** de `avaliacao_fecha_em` (`avaliacao_ainda_aberta`) e com a semente cujo sha256 bate com o compromisso (`semente_nao_comprometida`). Fluxo: escolher a semente, comprometer o hash, publicar o hash, esperar a avaliação fechar, simular/conferir, rodar o real revelando a semente. Fora deste contrato: ação `substituir` para o prêmio **final** (hoje só `cancelar`).

Retorno:
```
{ simulacao: bool, edicao, semente, total_casas, ganhadores_final, peso_base, completos: int,
  regra: 'todos_completos_ganham' | 'sorteio_ponderado', hash_verificacao,
  concorrentes: [ { apelido, casas, extras, peso, email?, whatsapp? } ],   // só os completos
  ganhadores:   [ { posicao, apelido, casas, extras, peso, motivo, email?, whatsapp? } ] }
```
Erros: `nao_autorizado`, `semente_obrigatoria` (vazia ou só espaços); só no modo real: `sorteio_final_ja_realizado`, `avaliacao_ainda_aberta`, `semente_nao_comprometida`.

## Pendências e avisos para quem programa o front

- Não há expiração automática: a tela deve destacar `vencido: true` e oferecer "Expirar" / "Substituir".
- `prazo_segunda_chamada_min` é proposta: exibir com a marca de proposta (`proposta: true`).
- A entrega do voucher (aviso por WhatsApp/e-mail) não está nestas funções; elas só registram o estado. Dado pessoal em `caca_premio` (e-mail, apelido) fica depois do festival até decisão de retenção (regulamento: "a definir").
- O corte e os dias vêm de `caca_premiacao_config`; **não escrever 7..11 nem 23:59 no front**: ler de `caca_config_ler`.
- O ranking/placar do visitante continua em `caca_ranking_publico`/`mapa_ler_v2`; esta migration não os altera.

## Atualização 05/11/2026 (migration 20261218, achados C06 e C03)

- `caca_premio_acao('confirmar')` recusa com `email_nao_confirmado` quando o e-mail da pessoa (mapa principal) não está confirmado; `entregar` herda, pois exige o estado `confirmado`. O painel desabilita "Confirmar" nessa situação.
- **Atualização 20261217_caca_carimbo_premio_correcao (C06):** `entregar` TAMBÉM confere o e-mail (ele pode ter deixado de estar confirmado depois do `confirmar`). Exceção explícita e auditada: as ações `confirmar_excecao` e `entregar_excecao` fazem a mesma transição sem e-mail confirmado, mas exigem `p_nota` com no mínimo 10 caracteres (`nota_obrigatoria`) e o evento fica gravado com o nome da exceção. `entregar` normal passa se o prêmio já foi confirmado por `confirmar_excecao`. Confirmar o e-mail depois **não** promove o prêmio sozinho (continua ação manual de propósito). Só `confirmar` e `entregar` têm versão `_excecao`; qualquer outra (`cancelar_excecao` etc.) dá `acao_invalida`. O painel ainda não tem botão para a exceção (a RPC já aceita); até lá o botão "Confirmar" segue desabilitado sem e-mail confirmado.
- A nota (`p_nota`) passa por `caca_texto_limpo` (sem caractere de controle nem de direção/invisível Unicode; limite de 500 caracteres).
- `caca_sorteio_estado(p_secret, p_edicao)` devolve `{ registrado, hash, registrado_em, avaliacao_fecha_em, fechada, sem_data_de_fechamento }`. A aba Prêmio final tem o passo "Código da semente": calcula o sha256 do texto (sem espaços nas pontas) no navegador e chama `caca_sorteio_comprometer`; a semente nunca sai do navegador. É preciso registrar ANTES de `avaliacao_fecha_em`.
