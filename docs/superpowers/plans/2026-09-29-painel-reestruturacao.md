# Painel SCW — reestruturação · Plano de implementação

> Executado em linha nesta sessão (pedido do Wilker: "só pare quando finalizar").
> Spec: `docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md`.

**Goal:** reorganizar o painel em 7 módulos (organização) e 5 destinos (marca),
com endereço por tela, status únicos, administrador editando o cadastro,
arquivos categorizados, contatos com categorias, Press Kit e vouchers.

**Architecture:** React sem biblioteca de rota; o endereço vive depois do `#`
(`lib/rota.js`, puro). Rótulos de status numa fonte só (`lib/status.js`), de
onde os `ROTULO_*` antigos derivam. Toda escrita nova no banco é RPC
`security definer` guardada por `pode()`, com migration em arquivo aplicada
pelo MCP `supabase-scw`.

**Tech Stack:** Vite + React 18, Supabase (PostgREST/RPC, Storage, Edge
Functions), testes `node --test`.

## Global Constraints

- Branch `dev/site-completo`; nunca `master`; nunca `vercel --prod`.
- Não mexer nas flags de `src/App.jsx` (site); não ler `.env`.
- Paleta fechada (9 cores `--scw-*`); nada de hex solto novo em componente.
- Migration nova: `revoke ... from public, anon, authenticated` antes do
  `grant`, conferência por `has_function_privilege`.
- Status novo no banco ganha rótulo em `lib/status.js` no mesmo commit.
- Build de verificação fora do projeto; `npm run test:organizacao` verde.

---

## Etapa 1 — Fundação

### Task 1.1 · `lib/status.js` + `<Selo>`
- Create `painel-app/src/lib/status.js`: `STATUS[dominio][valor] = {rotulo, tom}`
  com tons `neutro|andamento|atencao|ok|encerrado`; `rotulo(dom, v)`,
  `tom(dom, v)`, `rotulos(dom)` (mapa valor→rótulo).
- Modify `lib/operacao.js`, `lib/central.js`, `lib/respostas.js`,
  `lib/participantes.js`: `ROTULO_*`/`ROTULO_STATUS` passam a ser
  `rotulos(...)`.
- Modify `components/ui.jsx`: `export function Selo({ dominio, valor, children })`
  → `<span className="og-selo" data-tom={tom}>`.
- Modify `styles/painel.css`: `.og-selo[data-tom=andamento|atencao|ok|encerrado]`.
- Test `tests/painel-app-status.test.mjs`: todo valor dos CHECKs do banco
  (lista fixa no teste) tem rótulo e tom válido.
- Corrigir os 3 lugares crus: sessão em `FichaOperacao.jsx`, pedido em
  `Marcas.jsx`/`Producao.jsx`, linha de importação em `Edicao.jsx`.

### Task 1.2 · `lib/rota.js` + endereço no shell
- Create `lib/rota.js`: `lerRota(hash) → {vista, aba, filtros}`,
  `montarRota({vista, aba, filtros}) → '#vista/aba?k=v'` (chaves ordenadas,
  vazios fora), `rotaDoLink(link) → {vista, aba, filtros}` (links do banco,
  inclusive os antigos).
- Test `tests/painel-app-rota.test.mjs`: ida e volta, links antigos.
- Modify `components/PainelShell.jsx`: estado da vista vem do endereço;
  `hashchange` atualiza; `irPara` faz `pushState`; vistas recebem
  `rota` e `mudarRota(parcial, {substituir})`.
- Create `components/useRota.js`: `useFiltroUrl(rota, mudarRota)`.
- Modify `components/ui.jsx`: `<Ajuda titulo>` com `<details>` nativo.

## Etapa 2 — Navegação e Visão geral
- `PainelShell.jsx`: DESTINOS `visao, participantes, contatos, operacao,
  arquivos, edicao, admin`; títulos, ícones, acentos, atalhos.
- Módulos-casca com `<Abas>` ligadas a `rota.aba`:
  `vistas/Participantes.jsx` (Lista=Marcas, Candidaturas=Respostas origem
  quero_participar, Temas, Vendas), `vistas/Relacionamento.jsx` (Pessoas,
  Press Kit, Vouchers, Recebidos), `vistas/Operacao.jsx` (Pedidos, Fotos,
  Materiais), `vistas/ArquivosOrg.jsx`, `vistas/Edicao.jsx` (Configuração +
  edição atual, Todas), `vistas/Admin.jsx` (Equipe, Revisão, Importações,
  Histórico, Formulários).
- `Producao.jsx` exporta as seções separadas; `Edicao.jsx` exporta as abas.
- `Respostas.jsx` aceita `origens` por prop.
- `Mesa.jsx` → Visão geral: contadores com filtro no endereço.
- Tests: `painel-app-rota` cobre os links antigos → módulo novo.

## Etapa 3 — Ficha editável
- Migration `20260930_etapa3_cadastro_editavel.sql`: permissão
  `cadastro.editar` (administrador); `participantes.arquivado_em`; RPCs
  `org_salvar_participante`, `org_salvar_participacao`, `org_salvar_item`,
  `org_salvar_unidade`, `org_remover_unidade`, `org_arquivar_participante`;
  `get_participantes` respeita arquivados.
- `vistas/FichaCadastro.jsx`: blocos com Editar/Salvar.
- Marcas: filtro Arquivados; ação Arquivar/Restaurar na aba Acesso.

## Etapa 4 — Arquivos e Downloads
- Migration `20260930_etapa4_arquivos.sql`: `arquivos.categoria`;
  `get_arquivos_org` (inclui arquivados), `atualizar_arquivo`,
  `substituir_arquivo`, `arquivar_arquivo`.
- `vistas/ArquivosOrg.jsx`; marca `vistas-marca/Arquivos.jsx` → Downloads
  por categoria + fotos oficiais do combo.
- `lib/arquivos.js` (puro): `agruparPorCategoria`, `tamanhoLegivel`,
  `tipoLegivel` + testes.

## Etapa 5 — Contatos e Press Kit
- Migration `20260930_etapa5_contatos.sql`: `email`, `cidade`,
  `categorias text[]`; `salvar_contato`, `get_contatos`, `get_contato`
  atualizadas; `get_presskit(edicao)`, `salvar_envio_presskit`.
- `vistas/Contatos.jsx` (Pessoas + ficha em blocos), `vistas/PressKit.jsx`.

## Etapa 6 — Vouchers
- Migration `20260930_etapa6_vouchers.sql`: `edicoes.vouchers_por_participante`,
  tabela `vouchers`, RPCs `gerar_vouchers`, `get_vouchers`,
  `destinar_voucher`, `atualizar_voucher`, `marca_usar_voucher`,
  `marca_meus_vouchers`; histórico por contato em `get_contato`.
- `lib/vouchers.js` (puro: resumo por marca/pessoa) + testes;
  `vistas/Vouchers.jsx`; cartão na marca.

## Etapa 7 — Área da marca
- `PainelMarcaShell.jsx`: 5 destinos, endereço por `#`, botão Conta.
- `lib/hoje.js`/`lib/cadastro.js`: pendência com `bloco`/`campo`;
  `Cadastro.jsx` abre o bloco e foca o campo.
