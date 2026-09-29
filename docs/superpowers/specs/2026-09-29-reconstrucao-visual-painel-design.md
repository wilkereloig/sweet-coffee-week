# Reconstrução visual do painel + logos dos participantes — desenho

Data: 29/09/2026 · Pedido do Wilker Eloi (três diretrizes: arquitetura visual,
tipografia, logos). Aprovado em 29/09/2026 ("tudo aprovado, faça tudo").
Continua a Fase 14 (acessos + guia da marca). Regras do projeto: `CLAUDE.md`.

## Decisões já tomadas

| Tema | Decisão |
|---|---|
| Ordem | A Fundação → B Logos → C Ficha → D Listagens/menu → E Área da marca |
| Ficha do participante | **página própria** dentro de Participantes (não mais gaveta) |
| Fase 14 | publicada antes, em 29/09 (`0b1b1c4`) |
| Tipografia "tudo em Slab" | causa é o kit Typekit `ngx4uek` respondendo 412 — conserto na conta Adobe (Wilker). O código aplica o sistema de duas vozes; com o kit fora, tudo cai na Slab |
| Logo no slot | `contain` com margem interna — exceção do PAINEL à §6.12 (logo enviada tem proporção qualquer; recortar é perder marca) |

## A · Fundação

**Camadas** (`painel.css`, paleta fechada, nada de branco):
nível 0 = fundo da aplicação **bege**; nível 1 = módulo/card **creme + filete**
`rgba(61,19,8,.14)`, raio 20 (16 ≤760px); nível 2 = bloco interno bege a 55%,
raio 14; alerta = chapa da cor do estado com ícone.

**Espaço**: tokens `--e-1..--e-8` (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64). Dentro
de grupo 8, entre campos 16, entre cards 16–24, entre macroseções 48–64. O
filete no topo da `Secao` sai: separação por espaço e superfície.

**Tipografia**: Slab 900 só em título de página, nome da marca, título de
macroseção e número grande. `h3` e título de card passam a Nexa 700. Rótulo
de campo, `dt`, cabeçalho de tabela e selo: **sem caixa-alta**. Única
caixa-alta: `.ui-macro__rotulo`. Teste reprova `text-transform:uppercase`
fora dela.

**Ícones**: `components/Icone.jsx` — registro único. Nome com `/` vem do
sistema do site (`ScwIcon`, grade 32/traço 3.2); os demais são do registro do
painel, cada um com a sua grade (24 ou 32) e traço normalizado ao mesmo peso
(3.2 em 32 = 2.4 em 24). Os conjuntos soltos das cascas e das vistas migram.
`MODULO_ICONE`: mapa único assunto → ícone (lista, ficha, menu, marca).

**Componentes** (`components/ui.jsx`): `MacroSecao`, `Modulo` (card nível 1:
disco de ícone, título, `Status`, corpo, pé com ação principal nomeada),
`Status` (ícone + texto + cor; deriva de `lib/status.js`, então todo status do
banco ganha ícone), `Acoes` (principal + secundárias + "Mais ações" em
`<details>`), `Chips`, `GradeModulos` (auto-fit minmax 320px), `LogoMarca`,
`Vazio` com ícone e ação.

## B · Logos

**Dados** (migration `20260930_logos_marca.sql`):
- `logos_marca` — uma linha por arquivo: `participante_id`, `path` (chave no
  bucket `logos`, ou caminho do acervo do site `/logos/participants/…`),
  `mime`, `nome_original`, `tamanho`, `largura`, `altura`, versão vetorial
  opcional (`path_vetor`, `mime_vetor`, `nome_vetor`), `origem`
  (participante · organizacao · acervo · edicao_anterior), `edicao_codigo`,
  autor e data.
- `participantes.logo_id` = a logo oficial da MARCA (atravessa edições).
- `participacoes.logo_id` = a logo confirmada PARA AQUELA EDIÇÃO ("utilizada
  em"). Sem cópia por edição: as duas apontam para a mesma linha.
- `acervo_logos` — as 21 logos do site, geradas de `src/data/participants.js`
  por `scripts/acervo-logos-para-sql.mjs` (nunca digitadas).

**Estados** (derivados, sem workflow): *Confirmada* (a participação tem
logo) · *Logo anterior disponível* (a marca tem logo, a edição ainda não
confirmou) · *Arquivo do acervo disponível* (sugestão) · *Não enviada*.
Substituição pedida = `pedir_correcao_campo` no campo `logo`.

**Acervo**: sugestão casa por `normalizar_nome` com o nome da marca ou com a
chave de um vínculo. A organização vê qualquer sugestão; a MARCA só vê a de
vínculo confirmado ("alias não é prova").

**Arquivos**: bucket público `logos` (logo é identidade pública), 10 MB,
tipos SVG, PNG, WEBP, JPG (exibição) e PDF, EPS, AI (vetorial). A marca sobe
direto no Storage, na pasta `<participante_id>/` (policy); a organização sobe
por URL assinada de `arquivo-url` (`cadastro.editar`). Raster com lado maior
< 500px é recusado; SVG com `<script>`/`on…=` é recusado. Prévia local antes
de confirmar.

**Progresso**: a logo entra em `campos_cadastro` (16 → 17) e em
`camposObrigatorios`; vira pendência "Logo do estabelecimento". Não trava o
envio para análise.

## C · Ficha do participante (página)

Endereço de sempre (`#participantes/lista?item=<id>&sub=<aba>`); com `item`,
a aba Marcas mostra a página da ficha no lugar da lista; "‹ Marcas" volta.
- **Cabeçalho** (fixo ao rolar): logo, nome (Slab), selos [edição]
  [recorrente] [situação], "N% concluído · N pendências · atualizado",
  ações: Ver pendências (principal), WhatsApp, Gerenciar acesso, Mais ações.
- **Subnavegação**: Resumo · Cadastro · Combo · Unidades · Operação ·
  Mensagens · Trajetória · Acesso · Histórico.
- **Resumo**: situação + cards clicáveis por módulo (Cadastro, Logo, Combo,
  Unidades, Operação, Mensagens, Acesso).
- **Cadastro**: Situação, Pedir alteração, Dados da marca, Logo.
- **Combo**: macroseções Produtos (Doce · Salgado · Bebida em grade, cada um
  com status e restrições em chips), Informações comerciais (Tema, Preço e
  detalhes), Materiais (arquivos e sessões de foto).
- **Unidades**: "Onde encontrar" (unidades em cards) e Pedidos/delivery.
- Ação sempre nomeada: "Editar doce", "Editar preço", "Adicionar unidade".

## D · Listagens e menu

- **Menu** agrupado: Operação (Visão geral, Participantes, Operação) ·
  Relacionamento (Contatos) · Conteúdo (Arquivos) · Administração (Edição,
  Administração). Rótulo de grupo a partir de 1280px; separador abaixo.
- **Marcas**: linha = seleção · logo + nome (+ tema) · situação · pendências
  · atualização · acesso. Mensagem nova vira contador junto do nome.
- **Vouchers** (por marca): logo na linha. Contatos e Press Kit são pessoas —
  sem logo, mesma limpeza de caixa-alta e hierarquia.

## E · Área da marca

- Cabeçalho da casca: logo + nome da marca + "Edição X · Cadastro N%".
- Início: "Meu estabelecimento" (logo, responsável, WhatsApp, Editar dados)
  e as seções em módulos.
- Meu cadastro: campo **Logo do estabelecimento** no bloco 01 (estados acima,
  orientação curta, prévia, confirmar/trocar).
- Restrições dos itens agrupadas; títulos de bloco em Nexa.

## Fora de escopo

Renomear módulos ou mover abas entre módulos; tabela `<table>` nas listas
(continua linha com colunas alinhadas); tema do painel nas cores da marca.

## Verificação

Build fora do projeto; `npm run test:organizacao`; testes novos:
caixa-alta só no rótulo de macroseção; toda chave de `MODULO_ICONE` existe;
todo tom de status tem ícone; 17 campos em `camposObrigatorios` casando com
`campos_cadastro`; teste de banco (autorização das RPCs de logo, marca só vê
sugestão confirmada, marca não sobe fora da própria pasta) em DO que termina
em exceção. Conferência visual é do Wilker.
