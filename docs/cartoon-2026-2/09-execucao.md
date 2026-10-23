# 9 · Execução: o que está feito e o roteiro até o encerramento

Registro da execução de 14/10/2026 (pedido do Wilker: "siga todas as fases até finalizar"). Vale junto com o plano (arquivos 01–08). Decisões em [08-decisoes-pendentes.md](08-decisoes-pendentes.md).

## 9.1 Estado por fase

| Fase | Estado | Onde |
|---|---|---|
| 1 · Rotas e configuração | **feita** (`2bb3b3d`) | `src/edicao/config.js`, `src/lib/rotas.js`, `src/router.js` (endereço limpo), `vercel.json` |
| 2 · Modelo de dados e publicação | **TODAS APLICADAS**: 01, 02, 04 e 05 em 14/10; **03 em 15/10/2026** (SQL Editor), junto com o merge do painel; testes SQL ok | `supabase/migrations/20261014_cartoon_01…04_*.sql`, `supabase/testes/edicao-cartoon.sql` |
| 3 · Cadastro e revisão no painel | **NO AR desde 15/10/2026** (merge `cb80048` em `master`; testes 275/275) | `vistas-marca/edicao/*`, `vistas/Publicacao*.jsx`, `lib/edicaoMarca.js`, `lib/publicacao.js` |
| 4 · Páginas públicas | **feita** (`5e25519`) | `src/edicao/**`, `src/styles/scw-cartoon.css` |
| 5 · Mapa e Minha rota | **feita** | `src/edicao/componentes/mapa/MapaUnidades.jsx` (OpenFreeMap, sob demanda), `src/edicao/rota/*` |
| 6 · Avaliação e premiação | **feita no site e no banco** (migration 04 aplicada em 14/10); Edge Function **publicada em 15/10** | `paginas/Avaliar.jsx`, `paginas/Premiacao.jsx`, migration 04, `supabase/functions/enviar-formulario` |
| 7 · Validação integrada | **com dados de demonstração**; com o banco real depende da 9.2 | `npm run test:cartoon`, `npm run test:cartoon-navegador` |
| 8 · Lançamento | **roteiro pronto** (9.5); depende do Wilker | — |
| 9 · Encerramento | **roteiro pronto** (9.6); depois de 15/11 | — |

## 9.2 Aplicar o banco (precisa de você)

A aplicação pela ferramenta foi recusada na tela de permissão duas vezes, então nada foi aplicado. O backup das quatro tabelas que as migrations alteram já está no banco, no esquema `backup_20261014`.

**Atualização, 14/10/2026, fim da noite:**
- Aplicadas: 01, 02 e 04 (pelo Wilker, no SQL Editor) e 05 (fecha a execução direta das funções de gatilho, apontada pelo advisor).
- Os dois blocos de `supabase/testes/edicao-cartoon.sql` deram o resultado esperado:
  - autorização: 12 de 12 conferências como esperado;
  - ponta a ponta: pendências 7 → 0, publicação v1, recorte sem combo, preço R$ 38,90, nada privado na resposta, versão pública intacta depois da alteração, retirada.
- Advisor: "RLS sem política" nas 5 tabelas acessadas só por RPC é proposital; as funções abertas são as previstas.
- **15/10/2026:** 03 aplicada (Wilker, SQL Editor) e painel novo publicado (merge `cb80048`). Testes SQL de novo: autorização 12/12; ponta a ponta ok (o reenvio no teste volta `ok:false` só porque o bloco não preenche tema e itens, campos que a função já exigia antes).
- **Edge Functions publicadas em 15/10/2026** pelo MCP `supabase-scw`: `arquivo-url` v11 (bucket `edicao-publico`) e `enviar-formulario` v11 (avaliação + Turnstile). Teste de fumaça sem gravar nada: `edicao-publico` sem credencial → 401 `nao_autorizado`, caminho fora do padrão → 422; `avaliacao` com corpo nulo → 400 `corpo_invalido` (não mais `formulario_desconhecido`). As outras sete funções já batiam com o repositório.

**Estado anterior (registro):**
- A única mudança aplicada foi a função auxiliar `marca_dona_participacao`, que não é usada por nada.
- Ela entrou porque, num envio, mandei por engano só o primeiro trecho da migration 1, e a ferramenta aceitou. Por isso o histórico de migrations do banco mostra uma entrada `20261014_cartoon_01_estrutura` (versão `20261014203340`) **parcial**.
- O arquivo completo é idempotente (`create or replace`, `if not exists`): pode ser aplicado por cima sem problema.
- Nenhuma tabela ou coluna nova existe no banco ainda.

**Ordem segura:**
- **Aplicar já:** migrations 1, 2 e 4. Só acrescentam, e o painel em produção continua funcionando.
- **Aplicar junto com o merge do painel novo em `master`:** migration 3. Ela muda o que `marca_concluir_cadastro` exige, e o painel publicado hoje não tem esses campos; as marcas ficariam sem conseguir enviar.

Para aplicar, há dois caminhos:

- aprovar a ferramenta `apply_migration` quando eu pedir de novo; ou
- colar cada arquivo no SQL Editor do Supabase, **nesta ordem**:
  1. `20261014_cartoon_01_estrutura.sql`
  2. `20261014_cartoon_02_publicacao.sql`
  3. `20261014_cartoon_04_avaliacao.sql`
  4. `20261014_cartoon_03_revisao.sql`, junto com o merge do painel novo

Depois de aplicar:

1. Rodar os dois blocos de `supabase/testes/edicao-cartoon.sql`, um por vez. Cada bloco termina em exceção de propósito, e a mensagem traz o resultado (o esperado está no cabeçalho do arquivo).
2. Conferir os avisos de segurança do Supabase (advisors).
3. ✅ (15/10/2026) Publicar duas Edge Functions alteradas, pelo caminho de sempre (`docs/regras/04-stack-e-estrutura.md`):
   - `enviar-formulario`: agora aceita a avaliação, com Turnstile;
   - `arquivo-url`: agora aceita o bucket `edicao-publico`, caminho `<edição>/<participação>/<uuid>.webp`, sem sobrescrever. Sem ela, o envio de foto oficial no painel mostra erro.

**Efeito no painel atual:** a marca passa a precisar dos campos novos para enviar o cadastro. São eles: combo, endereço estruturado, modos de atendimento, horário no festival (era "horário do combo" até 23/10/2026) e alergênicos respondidos. Por isso a migration 3 só deve entrar junto com o painel da fase 3.

## 9.3 Testes

| Comando | O que garante |
|---|---|
| `npm run test:cartoon` | rotas e interruptores, regras de leitura (não informado ≠ não contém; sem lactose ≠ sem leite; delivery só do combo; horário de Natal), Minha rota, build sem dado de demonstração |
| `npm run build && npm run test:cartoon-navegador` | as 11 cenas por link direto e recarregar, hash antigo, endereços Lovers, participante completo sem abas, estados parciais e de falha (nunca demo), filtros na URL e posição, Minha rota, avaliação (sucesso só com resposta do servidor), 360 e 1440, alvos ≥ 44px, **contraste medido de todo botão** |
| `node --test tests/turnstile.test.mjs` | a avaliação exige Turnstile e a página desenha o widget |
| `supabase/testes/edicao-cartoon.sql` | anon não lê tabela nenhuma; marca A não toca a B; marca não grava coordenada nem `id_publico` nem publica; projeção sem campo privado; versão publicada intacta durante alteração; reenvio leva a em análise; retirada; slug desconhecido; elenco fechado não confirma quem participa |

**Ver com dados de demonstração:** `npm run dev` e abrir `/cartoon?demo=1`. Só funciona em desenvolvimento; o build de produção não contém esses dados (há teste para isso).

## 9.4 Painel (fase 3)

⚠️ **O painel novo NÃO pode ir para `master` antes de o banco ser aplicado.** Sem as migrations, os blocos 4, 5 e 6 da marca só mostram um aviso, e a marca perderia a edição de endereço que tem hoje. A ordem é: aplicar o banco (9.2), conferir o painel no preview e só depois fazer o merge.

**Marca:**
- **Meu cadastro:**
  - apresentação pública;
  - unidades permanentes com endereço estruturado e WhatsApp autorizado;
  - bloco 6, atendimento: local, retirada e delivery do combo em três estados, mais canais, região, taxa e horário no festival por dia (uma pergunta só: como a unidade funciona em cada dia; 23/10/2026).
- **Meu combo:**
  - nome, descrição e condições;
  - bloco 5, alimentar: 8 alergênicos, "outro" e 4 características, nada pré-marcado;
  - trocas estruturadas.
- **Envio e publicação:**
  - prévia com a mesma ficha do site;
  - o que falta, traduzido e com o nome da unidade;
  - estado de publicação;
  - "Enviar alterações" quando a marca alterou dados já aprovados.

**Organização:**
- **Participantes › Publicação:** lista com filtros.
- **Aba Publicação na ficha:**
  - publicar a casa, ou casa e combo;
  - retirar com motivo obrigatório;
  - diferença entre a versão no ar e a atual;
  - prévia;
  - endereço público, que só muda antes da 1ª publicação;
  - conferir a localização, dentro da região de Natal;
  - fotos: enviar, aprovar com texto alternativo ou recusar.
- **Edição › Publicação no site:** as chaves com regra de coerência e quem mudou por último. Participantes e combos podem ser ligados pela curadoria (D-18).
- **Edição › Avaliações:** resumo por casa, sem dado pessoal.

**Ficou para depois:**
- foto enviada pela própria marca (bloco 7; hoje quem sobe é a organização);
- declarações alimentares da alternativa de uma troca;
- seletor de edição quando houver duas participações abertas;
- pendências novas no resumo do Início da marca.

## 9.5 Lançamento (fase 8): ordem exata

Cada passo é independente e tem volta. Os passos 1, 5 e 8 mudam o domínio: **só com o seu pedido por escrito**.

| # | Quem | Ação | Volta |
|---|---|---|---|
| 0 | eu | aplicar o banco (9.2) e rodar os testes SQL | bloco "reverter" de cada migration + `backup_20261014` |
| 1 | **Wilker autoriza** | `CARTOON_PUBLICA = true` em `src/edicao/config.js`, commit, merge em `master` | `false` + deploy, ou promover o deploy anterior na Vercel |
| 2 | organização | no painel: fase `pre_lancamento`; publicar cada casa no nível "casa" conforme o post de Confirmados de cada uma | retirar a casa |
| 3 | organização | ligar "participantes públicos" | desligar |
| 4 | eu | `npm run qr:edicao`: QR de cada casa publicada, fora do repositório | — |
| 5 | **Wilker autoriza** (sugestão: 03/11) | publicar o combo de cada casa aprovada e ligar "combos públicos" | desligar |
| 6 | organização | fase `em_andamento` em 05/11 | voltar |
| 7 | organização | definir a janela e ligar "avaliação aberta" | desligar (o servidor recusa na hora) |
| 8 | **Wilker autoriza** (D-01) | `ENTRADA_PRINCIPAL = 'cartoon'` + deploy: `/` mostra a Cartoon e `/festival` a Home | `'institucional'` + deploy |

Antes do passo 1, confira ao vivo o link de compartilhamento (og) de `/cartoon`. Hoje ele mostra o og do institucional, e um og próprio depende de uma imagem 1200×630 aprovada (D-07).

## 9.6 Encerramento (fase 9): depois de 15/11

1. Organização: desligar a avaliação e mudar a fase para `encerrada`. O site vira registro e esconde preço, horário, canais, mapa e Minha rota.
2. Organização: gravar os pódios em `premiacoes` (com `participacao_id`) e ligar "resultados públicos".
3. **Wilker autoriza:** `ENTRADA_PRINCIPAL = 'institucional'` + deploy. `/` volta à Home e `/cartoon` fica como registro.
4. Eu levo para o institucional:
   - **Edições:** um combo por casa, no mesmo formato de `scripts/combos-edicoes.py`, lendo de `publicacoes`.
   - **Histórico do Sweet Awards:** os resultados da Cartoon.
   - **Teste "Cartoon não é histórico"** (`tests/edicoes.test.mjs:23`): passa a aceitar a 2026.2.
5. Eu, depois de backup e numa migration separada: aposentar as colunas legadas (`vegano`/`sem_gluten`/`sem_lactose`, `tem_substituicao`/`substituicao`, `participantes.combo_nome`/`combo_descricao`, `participacao_unidades.endereco`/`bairro`/`horarios`).
