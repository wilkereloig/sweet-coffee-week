# Painel SCW (React) — mapa técnico

Referência de arquitetura. Estado de `dev/site-completo` depois da revisão
geral de 28/09/2026 (`docs/AUDITORIA-PAINEL-2026-09-28.md`) e da evolução
estrutural de 29/09/2026 (`docs/EVOLUCAO-PAINEL-2026-09.md`). Não é regra de
projeto (isso é `CLAUDE.md`, §10.4-b). Se divergir do código, vale o código.

## 1 · O que é

Painel único (organização + marca participante), app React/Vite em
`painel-app/`, entry próprio. **Vive em `/painel/`**; `/organizacao` e
`/marca` redirecionam para lá (é o escopo do service worker). Quem decide o
que aparece é a sessão gravada em `sessionStorage`, não a URL.

## 2 · Árvore

```
painel-app/
  index.html            manifest, viewport-fit=cover, apple-touch-icon, Typekit
  src/
    main.jsx            registra /painel/sw.js (escopo /painel/), monta <App/>
    App.jsx             máquina de estados (boas-vindas → login → painel),
                        ?ir= do push guardado na aba, saída que desliga o push
    styles/painel.css   sistema único (tokens --scw-*, --f-titulo/--f-ui/--f-texto)
    components/
      PainelShell.jsx       casca org: rail (nomes ≥1280), cabeçalho com quem
                            está logado, Central, links para item (alvo)
      PainelMarcaShell.jsx  casca marca: idem, 6 destinos
      AbasCelular.jsx       barra do celular (≤900px) dos dois painéis: no
                            máximo 4 atalhos + "Mais" (folha com o resto)
      Central.jsx           sino + lista de avisos (os dois painéis)
      Conversa.jsx          mensagens org ⇄ marca (os dois painéis)
      Atividade.jsx         linha do tempo do histórico
      AvisosAparelho.jsx    push deste aparelho (os dois painéis)
      Conexao.jsx           faixa offline / versão nova
      ui.jsx                Carregando, Vazio, Erro, Secao (h2; h3 dentro de
                            Folha), Abas, traduzirErro
      VistaCabeca.jsx       título da vista (<h1> no desktop; no celular o
                            título é o da barra fixa)
      Folha.jsx             gaveta/folha acessível (Esc, foco preso e devolvido)
      Credenciais.jsx       senha de uso único (copiar / WhatsApp)
      Login*/BoasVindas/DefinirSenha
      vistas/     Mesa · Respostas · Marcas (ficha: Cadastro, Operação,
                  Mensagens, Trajetória, Histórico, Acesso — FichaOperacao.jsx) ·
                  Edicao (configuração, cronograma, temas, vendas, revisão,
                  importações, edições) · Producao · Contatos (relacionamento
                  e Press Kit) · GuiaFotos · Equipe
      vistas-marca/  Hoje (próximos passos) · Cadastro · Pedidos (responder) ·
                     Mensagens · Arquivos (leitura + avisos) · GuiaFotos
    lib/          lógica pura, testada em tests/painel-app-*.test.mjs
      rpc.js, marcaApi.js   rede (renovação única por refresh token, 401 = sessão morta)
      central.js            links de aviso, tempo relativo, texto do histórico
      push.js               suporte/permissão/assinatura (injeta quem grava)
      hoje.js               próxima ação da marca (única; lê cronograma, tema, combo, foto, venda)
      operacao.js           rótulos, momento da edição, cronograma, trajetória, filtros de contato, temas, vendas
      cadastro.js, mesa.js, respostas.js, participantes.js, producao.js,
      painelFormat.js, pedidosMarca.js, notificacoes.js (pendências da mesa), avisos.js
```

## 3 · Rede

| Caminho | Quem usa | Como autoriza |
|---|---|---|
| `rpc(nome, corpo)` | organização | senha compartilhada (`p_secret`) **ou** JWT da conta pessoal; o banco decide por `pode(p_secret, ação)` |
| `chamarFuncao(nome, corpo)` | organização | Edge Functions, mesmas duas portas |
| `api(caminho)` | marca | JWT da marca; RLS decide linha, grant decide coluna |

**RPCs da organização:** `admin_ping` · `minhas_permissoes` · `marcar_senha_trocada` ·
`get_quero_participar` · `get_support_interests` · `get_contact_requests` ·
`organizacao_atualizar_registro` · `organizacao_apagar_registro` ·
`get_participantes` · `get_ficha_participacao` · `get_config_admin` ·
`definir_edicao_atual` · `get_solicitacoes_admin` · `criar_solicitacao` ·
`publicar_solicitacao` · `marcar_solicitacao` · `get_pendentes_solicitacao` ·
`get_arquivos_admin` · `publicar_arquivo` · `get_sessoes_fotos` ·
`agendar_sessao_fotos` · `atualizar_sessao_fotos` · `abrir_vaga_fotos` ·
`fechar_vaga_fotos` · `get_contas_organizacao` · `atualizar_conta` ·
`definir_funcao_conta` · `suspender_conta` · `senha_unica_definir` ·
`registrar_push_organizacao` · `remover_push_organizacao` ·
**novas (28/09):** `get_conversas` · `get_mensagens` · `enviar_mensagem` ·
`ler_mensagens_org` · `get_notificacoes_org` · `ler_notificacoes_org` ·
`get_atividade` · `adicionar_observacao`.
**novas (29/09):** `get_edicoes` · `salvar_edicao` · `salvar_cronograma_item` ·
`remover_cronograma_item` · `get_historia` · `buscar_marcas_acervo` ·
`decidir_vinculo` · `marcar_participante_novo` · `get_revisao` ·
`resolver_revisao` · `corrigir_participante` · `definir_liberacao_foto` ·
`definir_pagamento` · `get_temas` · `decidir_tema` · `revisar_combo` ·
`get_materiais` · `salvar_material` · `remover_material` · `get_vendas_resumo` ·
`registrar_venda_org` · `get_contatos` · `get_contato` · `salvar_contato` ·
`definir_presskit` · `get_ficha_360` · `definir_responsaveis_sessao` ·
`get_importacoes` · `get_importacao_linhas` · `importacao_*` (administrador).

**Edge Functions:** `criar-acesso-marca` · `criar-conta-organizacao` ·
`regerar-senha-conta` (organização **e** marca) · `arquivo-url` ·
`enviar-push` (manual pelo teste e automático por `notificacao_id`).

**Marca (PostgREST):** `participantes` · `participacoes` · `participantes_itens` ·
`participacao_unidades` · `vendas_diarias` · `sessoes_fotos` · `solicitacoes` ·
`solicitacao_estado` · `arquivos` · `arquivo_leitura` · `push_subscriptions` ·
`perfis` · `mensagens` · `notificacoes` · RPCs `marca_concluir_cadastro`,
`marcar_senha_trocada`, `marca_enviar_mensagem`, `marca_ler_mensagens`,
`marca_ler_notificacoes`, `marca_responder_solicitacao`, `marca_minha_historia`;
leitura por RLS de `edicoes`, `edicao_cronograma`, `temas_propostos`, `materiais`.

## 4 · Avisos e push

Gatilhos criam `notificacoes` (mensagem, pedido novo, pedido respondido pela
marca, arquivo, sessão de fotos, vaga reservada, cadastro concluído,
formulário do site). Cada aviso tem `link` curto (`pedidos/<id>`,
`marcas/<id>/mensagens`…) que `lib/central.js#interpretarLink` traduz. O
gatilho `disparar_push` chama `enviar-push` por `pg_net`; o SW mostra e, no
clique, manda a aba aberta ir ao item (postMessage) ou abre `/painel/?ir=…`.

## 5 · Build, testes, deploy

- `vite.config.js` declara os dois entries; o painel sai em `dist/painel-app/`.
- `npm run test:organizacao` — libs puras + `painel-infra.test.mjs`
  (invariantes de segurança, CSS, SW, contratos com as Edge Functions).
- Sem teste de componente React e sem teste responsivo automatizado do
  painel (`tests/responsive.mjs` cobre só o site). Conferência visual é manual.
- Produção: o que muda em `dev/site-completo` só vai ao ar com merge em `master`, que é decisão do Wilker (A2). O banco e as Edge Functions são os mesmos para os dois — migration aplicada vale na hora para o painel publicado também.
