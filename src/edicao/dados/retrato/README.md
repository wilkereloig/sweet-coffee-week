# Retrato local da edição Cartoon (2026.2)

Foto do painel para ver o `/cartoon` com dado real no `npm run dev`, inclusive das casas que ainda não foram publicadas.
Spec: `docs/cartoon-2026-2/10-sistema-visual-e-paginas.md` §10.9 e §10.14.

**Os arquivos gerados NÃO ficam no git** (o repositório é público): `cartoon.local.json` e `public/retrato-local/` estão no `.gitignore`. Só a receita fica versionada.

## Como funciona

No DEV, `src/edicao/dados/publico.js` lê nesta ordem: `?demo=1` (demonstração) → retrato (se `cartoon.local.json` existir nesta máquina) → RPC ao vivo. Em outra máquina, sem o arquivo, cai na RPC. Em produção só existe a RPC: o retrato não entra no bundle, e `vite.config.js` (`semRetratoLocal`) tira `public/retrato-local/` do `dist`. Quem confere é `tests/cartoon-rota.test.mjs`.

No DEV cada página mostra a faixa tracejada "Retrato local do painel · dd/mm" (a data é a da leitura).

## Como regenerar (sob pedido)

1. **Ler o banco** (só `SELECT`): rodar `scripts/edicao/retrato-local.sql` pelo MCP `supabase-scw` (`execute_sql`). Se a resposta for grande, o MCP grava num arquivo e informa o caminho.
2. **Gravar o arquivo**: `node scripts/edicao/retrato-salvar.mjs <caminho-da-resposta>` (recusa se aparecer campo privado).
3. **Coordenadas**: `node scripts/edicao/geocodificar-retrato.mjs` (Nominatim, 1 requisição por segundo, ~45 s; só preenche quem está sem coordenada).
4. **Logos desenhadas**: `python -I scripts/edicao/logos-desenhadas.py` (Pillow; lê o Dropbox da edição e gera, VERSIONADOS desde 03/11, `public/images/marcas-edicoes/2026.2/logos-desenhadas/` — P&B, colorida e o pin do mapa — mais `src/data/logosDesenhadasEdicao.js`; acrescenta `casa.logo_desenhada` ao retrato).
5. **Fotos dos combos**: `python -I scripts/edicao/fotos-combo.py` (lê `03_COMBOS/02_ARTES/<marca>/`, a maior versão `aprovada-vN` de cada peça; gera `public/retrato-local/combos/<slug>/` em 1200 × 1500 e preenche `combo.fotos.principal`, `itens[].foto` e `combo.fotos.galeria` com cortados e opções). Leva uns 3 minutos.

Os passos 3 a 5 reescrevem o `cartoon.local.json`, então vêm depois do 2. Conferir tudo: `npm run test:cartoon`.

**Última leitura: 03/11/2026 00:25** (27 casas, 41 unidades, banco ainda em fase `preparacao`, nenhuma casa publicada). O retrato guarda também `criterios` da avaliação.

6. **Fotos para a produção** (lista 13, B2): aplicar a migration `20261129_item_fotos_publicas` e rodar `node --env-file=.env.local scripts/edicao/subir-fotos-combo.mjs` (só o plano) e depois com `--gravar` — sobe as fotos ao bucket `edicao-publico` e registra em `midias_participacao` como aprovadas. Precisa de `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`. **Depois, republicar cada casa no painel**: o site público lê o conteúdo congelado na publicação.

## O que tem

Mesmo formato de `edicao_publica('2026.2')` (`docs/cartoon-2026-2/03-modelo-de-dados.md`), mais a chave `retrato` (`lido_em`, `fase_no_banco`, `casas`, `sem_coordenada`…).

- **Casas**: todas as participações ativas (`status_cadastro <> 'encerrado'`, participante não arquivado), publicadas ou não. Cada uma é `recortar_publico(montar_publico(id, 'marca_e_combo'), true, 'em_andamento')`.
- **Fase `em_andamento`**: `recortar_publico` só tira preço, WhatsApp e horário quando a fase é `encerrada`; qualquer outra deixa combo, preço e unidades inteiros. `em_andamento` é também a fase em que o catálogo mostra os combos. O banco ainda está em `preparacao` (anotado em `retrato.fase_no_banco`), e `participantes_publicos` e `combos_publicos` saem `true` só aqui.
- **Slug**: casa sem `slug_publico` recebe `public.slug_publico_de(nome)` e `"slug_provisorio": true`.
- **Campos do §10.14**: valor do combo (`combo.preco`, da organização), alergênicos e características por item (`alimentar`), trocas (`substituicoes`), modos de atendimento e canais com link (`unidades[].combo.modos`, `canais`), unidades com endereço, horário e WhatsApp autorizado, fotos (`combo.fotos`: vazia no banco, que ainda não tem foto aprovada; no retrato vêm do passo 5, as fotos aprovadas do Dropbox, desde 31/10/2026).
- **Ausência**: o que o painel não tem fica ausente do JSON (nada é inventado). A página mostra "não informado". Casas com combo ainda sem nome ou itens sem nome aparecem assim.
- **Nunca entram**: contato da equipe, WhatsApp não autorizado, custos, pagamento, nota de revisão, dados de conta. A projeção pública do banco já não traz; `retrato-salvar.mjs` e o teste ainda recusam essas chaves.
- **Logos oficiais**: já são públicas (bucket `logos` ou `/logos/participants/…` do site), então nada foi copiado.
- **Logos desenhadas** (`casa.logo_desenhada = { pb, cor, largura, altura }`): 800 × 800, as duas versões com a mesma medida e o mesmo enquadramento (quadrado inteiro, sem recorte). O caminho já vem pronto no JSON.
  Três arquivos da pasta do Dropbox têm nome diferente do slug do site (`casa-1190`, `just-food-coffee`, `marlon-vinicius`); a tabela de apelidos está no script.

## Coordenadas

O banco só publica coordenada **verificada** (13 de 40 unidades em 28/10). As outras vão ao Nominatim com `"conferir": true`, `"fonte": "osm-nominatim"`, e **nada é gravado no banco**: a organização confere no painel antes de publicar.

O script **não chuta**. Fica sem coordenada (listada em `retrato.sem_coordenada`, com o motivo) a unidade cujo endereço:

- o OpenStreetMap não achou;
- deu resultado ambíguo (candidatos a mais de 1,5 km um do outro);
- não é um logradouro no cadastro, ou tem número divergente entre os dois campos;
- só existe como rua, sem o número no mapa (o ponto cairia em qualquer lugar da avenida). `--aceitar-rua` grava esses com `"precisao": "rua"`, para o mapa tratar como aproximado.

Na leitura de 28/10 foram 3 geocodificadas e 24 pendentes: 18 "só a rua", 3 "não achou", 1 ambígua, 1 sem logradouro e 1 com número divergente. Ids públicos das unidades pendentes:

`u2c3c49 u7cdabf ue45b39 ubcaf55 ue330dc uf8dd0a ua69088 ucb6bce uc51698 u563738 u20b74d u80bb36 u6399d7 u63fda6 u7757da ua0bd89 ud14938 ue07cc5` (só a rua) ·
`u24103b ue29f90 uede0e6` (não achou) · `u1ece0e` (ambígua) · `u5bf519` (sem logradouro) · `u3f2682` (número divergente)
