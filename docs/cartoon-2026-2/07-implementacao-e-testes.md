# 7 · Plano de implementação e testes

## 7.0 Prazo: a verdade primeiro

Hoje é 14/10/2026. Pela pasta da edição, os combos são lançados em **03/11** e o festival começa em **05/11** [Fato: `00-estado-da-edicao.md`, `edicoes`]. Faltam cerca de três semanas, e as marcas ainda precisam preencher os campos novos: 21 das 26 nem começaram o cadastro atual.

Ordem de corte recomendada, se o tempo apertar:

1. **Obrigatório para 03/11:**
   - fases 1, 2 e 3 (rotas, publicação, cadastro e revisão);
   - fase 4 (entrada, catálogo e participante);
   - a lista de unidades da fase 5, sem mapa interativo.
2. **Obrigatório para 05/11:** avaliação (fase 6), se a organização decidir os critérios até ~24/10.
3. **Pode entrar durante o festival:** mapa interativo, compartilhamento da Minha rota, og por participante.

Cada fase entrega algo utilizável e reversível sozinho (CLAUDE.md §5.5: um subcommit por item lógico, plano aprovado antes).

## 7.1 Fases

### Fase 1 · Rotas e configuração

- **Escopo:**
  - rewrites `/cartoon/:path*`, `/festival`, `/sweet-awards`, `/em-breve`;
  - `resolverRota` com as rotas da edição e 404 próprio;
  - `CARTOON_PUBLICA` e `ENTRADA_PRINCIPAL` em `App.jsx`, com teste de coerência;
  - `src/edicao/config.js`;
  - casca da edição vazia (cabeçalho, rodapé, abas);
  - `cartoon.html` com og próprio;
  - rotas novas em `ROTAS` (Analytics) e em `metaForPath`;
  - D-14, se aprovada: `navigate()` com `pushState`.
- **Arquivos:** `vercel.json`, `vite.config.js` (entrada `cartoon.html`), `src/App.jsx`, `src/lib/rotas.js`, `src/router.js`, `src/pages/carregadores.js`, `src/lib/pageMeta.js`, `src/lib/analytics.js`, `src/edicao/**`, `src/styles/scw-cartoon.css` (tokens), `tests/*`.
- **Dependências:** nenhuma de dados. D-14 para a troca do roteador.
- **Critérios de aceitação:**
  - `/cartoon` só abre em preview com as duas chaves desligadas;
  - `/lovers/*`, `/mapa`, `/rota`, `/participantes` continuam em `/`;
  - legais abrem em todas as combinações;
  - `/festival` mostra a Home;
  - com `ENTRADA_PRINCIPAL = 'cartoon'`, `/` mostra a Entrada e o institucional segue nos próprios endereços.
- **Testes:**
  - `rotas-edicao.test.mjs`: matriz completa de chaves × caminhos, incluindo os endereços Lovers;
  - atualização de `consentimento.test.mjs` (legais sob as novas chaves);
  - `casca-institucional` e `motion` sem regressão;
  - `redesign` (flags novas começam desligadas).
- **Riscos:** a troca para `pushState` muda a URL de todo o site (mitigação: leitura de hash mantida e testes de navegador nas 6 páginas); rewrite faltando em algum caminho limpo.
- **Reversão:** reverter os commits; nada no banco.

### Fase 2 · Modelo de dados e publicação

- **Escopo:** as migrations 1 a 7 da seção 3.7, os testes SQL e o cliente `src/edicao/dados/publico.js`.
- **Arquivos:** `supabase/migrations/2026102x_edicao_cartoon_0[1-7]_*.sql`, `supabase/testes/edicao-cartoon.sql`, `src/edicao/dados/publico.js`.
- **Dependências:** backup (`npm run backup`); D-02 (plano do Supabase); D-16 (caixa limite das coordenadas).
- **Critérios de aceitação:**
  - a projeção devolve **só** chaves da lista permitida;
  - `anon` não lê nenhuma tabela;
  - publicar sem aprovação falha;
  - alteração depois de publicar não muda a versão pública;
  - os interruptores respeitam as regras de coerência;
  - o backfill de unidades e de declarações não perde nada (contagem antes e depois).
- **Testes:**
  - SQL: papéis anon, marca A, marca B, organização sem permissão, organização com permissão;
  - `projecao-publica.test.mjs`: lista permitida, nada de `telefone`, `email`, `cnpj`, `custo_*`, `combo_revisao_nota`;
  - `rls-marcas` estendido às tabelas novas.
- **Riscos:**
  - migration aplicada à mão (sem CLI, segundo `04-stack-e-estrutura.md:56-57`): aplicar uma por vez com verificação;
  - gatilhos novos conflitando com os 13 gatilhos atuais de `participacoes` e afins;
  - concessão por coluna esquecida, que faz a marca não conseguir salvar.
- **Reversão:** bloco `-- reverter` de cada migration; restaurar o backup em caso extremo; as colunas legadas continuam intactas.

### Fase 3 · Cadastro e revisão no painel

- **Escopo:**
  - etapas 1–9 da marca (4.2) e prévia (4.3);
  - publicação, retirada, diferença entre versões, interruptores da edição, verificação de coordenada e aprovação de foto na organização;
  - `status.js` com a dimensão de publicação.
- **Arquivos:** `painel-app/src/components/vistas-marca/Cadastro.jsx` (dividir por etapa), `painel-app/src/lib/{cadastro,guia,status}.js`, `vistas/FichaCadastro.jsx`, `FichaOperacao.jsx`, `Edicao.jsx`, `Marcas.jsx`, novos `vistas/Publicacao.jsx`, `painel-app/CLAUDE.md`.
- **Dependências:** fase 2; D-08 (foto da marca); D-09 (texto alimentar); D-18 (quem publica).
- **Critérios de aceitação:**
  - a marca preenche tudo e retoma sem perder dados;
  - não consegue publicar (botão inexistente e RPC recusada);
  - a organização publica a marca antes do combo;
  - retira e republica;
  - vê a diferença entre a versão publicada e a atual;
  - cada ação aparece no Histórico com autor.
- **Testes:**
  - `painel-app-cadastro` e `painel-app-guia` com campos e etapas novos;
  - `painel-app-status` com os estados de publicação;
  - novo `painel-app-publicacao` (permissões e coerência);
  - navegador: fluxo completo de marca e organização num banco de teste.
- **Riscos:**
  - `Cadastro.jsx` já é grande; dividir sem quebrar o salvamento automático;
  - marcas no meio do preenchimento durante a troca (mitigação: os campos atuais continuam valendo; os novos aparecem como etapas adicionais).
- **Reversão:** reverter o commit do painel; os dados novos ficam no banco sem uso.

### Fase 4 · Páginas públicas e catálogo

- **Escopo:** Entrada, Catálogo (`/participantes`, `/combos`), Participante (com `foco="combo"`), 404 e estados parciais e de falha; `scw-cartoon.css` completo; movimento (5.6); fixtures de demonstração isoladas.
- **Arquivos:** `src/edicao/cartoon/**`, `src/edicao/componentes/**`, `src/styles/scw-cartoon.css`, `src/edicao/dados/demo/**`.
- **Dependências:** fases 1 e 2; D-04 (tipografia; a estrutura pode avançar com a tipografia institucional); D-19 (SVG do selo).
- **Critérios de aceitação:**
  - a página do participante mostra preço, composição, restrições e formas de compra sem abas;
  - "não informado" visível;
  - delivery só com `delivery_combo = sim`;
  - várias unidades com horários diferentes;
  - posição do catálogo restaurada ao voltar;
  - nenhuma chave privada no JSON recebido;
  - produção sem texto de demonstração.
- **Testes:**
  - `cartoon-paginas.test.mjs` (composição a partir de fixtures: restrição não informada, delivery da loja sem delivery do combo, múltiplas unidades, combo não publicado, retirado);
  - `cartoon-navegador.mjs`: links diretos, recarregar, voltar/avançar, filtros na URL, posição, 404, falha de rede simulada, `prefers-reduced-motion`, 6 larguras, sem rolagem horizontal;
  - `cartoon-isolamento.test.mjs`;
  - `cartoon-demo-fora.test.mjs` sobre o `dist/`.
- **Riscos:**
  - contraste da paleta;
  - fotos ainda em produção (sessões até 19/10);
  - View Transitions sem suporte em parte dos navegadores (é aprimoramento opcional).
- **Reversão:** `CARTOON_PUBLICA = false`; reverter commits.

### Fase 5 · Mapa e Minha rota

- **Escopo:** lista de unidades, mapa sob demanda atrás de `<MapaUnidades>`, "Usar minha localização", "Como chegar", Minha rota completa.
- **Arquivos:** `src/edicao/componentes/mapa/**`, `src/edicao/rota/minhaRota.js`, `src/edicao/cartoon/paginas/{Mapa,MinhaRota}.jsx`, `vercel.json` (`Permissions-Policy`, CSP), `package.json` (dependência do mapa).
- **Dependências:** D-03 (provedor); coordenadas verificadas pela organização.
- **Critérios de aceitação:**
  - a lista funciona sem o mapa;
  - o mapa só carrega quando pedido;
  - localização só por botão;
  - a rota persiste por edição, sem duplicar, trata unidade despublicada e gera o link externo.
- **Testes:** `minha-rota.test.mjs` (persistência, duplicação, ids sumidos, armazenamento quebrado); navegador: mapa com falha forçada mostra lista; teclado na lista e nos marcadores; peso do chunk do mapa medido.
- **Riscos:** custo do provedor; CSP em modo report-only esconde bloqueio até virar enforce.
- **Reversão:** esconder o mapa (a lista fica); reverter a dependência.

### Fase 6 · Avaliação e premiação

- **Escopo:** `avaliacoes`, `edicao_criterios`, `submit_avaliacao` via `enviar-formulario`, página Avaliar, resultados e auditoria no painel, página Premiação com o interruptor 6.
- **Arquivos:** `supabase/migrations/…_08_avaliacao.sql`, `supabase/functions/enviar-formulario/index.ts`, `src/edicao/cartoon/paginas/{Avaliar,Premiacao}.jsx`, `painel-app/src/components/vistas/Avaliacao.jsx`.
- **Dependências:** D-05 (critérios, campos, deduplicação, retenção); D-06 (categorias).
- **Critérios de aceitação:**
  - o servidor recusa fora da janela ou com a chave desligada;
  - recusa participante sem combo publicado e unidade que não participa;
  - sucesso só depois da gravação;
  - dados de uma edição não aparecem em outra;
  - resultados só com o interruptor 6.
- **Testes:** SQL de período, elegibilidade, duplicidade e isolamento por edição; navegador com rede caindo no envio (sem sucesso falso); Turnstile em modo de teste.
- **Riscos:** fraude (mitigado por Turnstile, limite e detector de suspeitos); critérios decididos tarde.
- **Reversão:** desligar o interruptor 5 (o servidor recusa na hora).

### Fase 7 · Validação integrada

- **Escopo:** ensaio completo num ambiente de teste com 3 marcas fictícias **no banco de teste**, nunca no de produção. Uma delas com 3 unidades, delivery só em uma, um componente com tudo "não informado" e uma alteração depois da publicação. O ensaio percorre todas as transições T1–T8 em preview.
- **Testes:**
  - toda a bateria existente: `test:*`, `responsive`, `casca-institucional`, `motion`, `privacidade`, `edicoes-navegador`;
  - a bateria nova;
  - revisão de acessibilidade com teclado e leitor de tela nas páginas G e Avaliar;
  - Lighthouse em celular nas páginas Entrada, Catálogo e Participante.
- **Critério de aceitação:** todos os testes passam e o Wilker aprova as capturas. A conferência visual é dele.
- **Risco:** banco de teste. **[Decisão D-20]** um branch do Supabase custa e o plano gratuito não tem; a alternativa é um esquema separado no mesmo projeto.

### Fase 8 · Lançamento autorizado

- **Escopo:** T1 (`CARTOON_PUBLICA`) e T2/T3 pela organização; T4 (`/` → Cartoon) quando o Wilker autorizar por escrito; QR Codes gerados depois do congelamento dos slugs.
- **Critério de aceitação:** produção conferida rota por rota; legais e institucional intactos.
- **Reversão:** deploy anterior na Vercel, que é imediato, ou as chaves de volta.

### Fase 9 · Encerramento e preservação

- **Escopo:**
  - fase `encerrada` (modo registro);
  - resultados publicados;
  - T8 (`/` volta ao institucional);
  - migração de combos e fotos aprovados para Edições: um combo por marca, como em `scripts/combos-edicoes.py`, agora lendo de `publicacoes`;
  - resultados no histórico do Sweet Awards;
  - o teste "Cartoon não é histórico" muda;
  - colunas legadas aposentadas numa migration separada, depois de backup.
- **Critério de aceitação:** `/cartoon` como registro sem dado volátil; Edições com 2026.2; QRs antigos abrindo o registro.
- **Reversão:** reverter os commits.

## 7.2 Matriz de testes por requisito

| Requisito | Teste |
|---|---|
| Rotas e fases | `rotas-edicao.test.mjs` (todas as combinações de chaves e caminhos); `cartoon-navegador.mjs` por fase com fixture |
| Permissões | SQL em `supabase/testes/edicao-cartoon.sql` com anon, marca A, marca B e organização por função; `painel-app-publicacao` |
| Dados privados × públicos | `projecao-publica.test.mjs` (lista permitida de chaves); inspeção da resposta de rede no teste de navegador |
| Revisão × versão publicada | SQL: publicar → alterar → a projeção mantém vN; reenviar → aprovar → publicar → vN+1 |
| Múltiplas unidades | fixture com 3 unidades, horários e modos diferentes |
| Restrição não informada | fixture com tudo `nao_informado`: a página mostra "não informado" e os filtros não a contam como "sem glúten" |
| Delivery da loja ≠ do combo | fixture com `horario_loja_texto` e canal cadastrados, mas `delivery_combo = nao`: sem botão de pedido, sem filtro de delivery |
| Links diretos, QR, navegador | navegador: cada rota por endereço limpo e por hash, recarregar, voltar/avançar, `?o=qr` |
| Falhas de rede | rota interceptada devolvendo erro e tempo esgotado: estado de falha ou cópia antiga, nunca demonstração |
| Responsividade e acessibilidade | 6 larguras (o padrão de `tests/responsive.mjs`), alvos ≥ 44px, um `<h1>`, foco visível, `aria-live` na rota |
| Avaliação isolada por edição | SQL: avaliação em 2026.2 não aparece em consulta de outra edição; `votos` intacta |
| Preservação do institucional e do painel | toda a bateria atual sem mudança de resultado; `cartoon-isolamento.test.mjs`; capturas antes e depois das 6 páginas |

## 7.3 Regras que entram na documentação junto com o código

- `CLAUDE.md` §2.1 e §2.3: a camada de edição existe; as chaves novas entram na tabela §3.4.
- Regra escrita para dado volátil na camada de edição (D-13).
- `src/pages/CLAUDE.md`: nova seção da Cartoon.
- `painel-app/CLAUDE.md`: etapas, publicação e projeção.
- `docs/regras/04-stack-e-estrutura.md`: projeção pública como única exceção ao "nada para anon".
