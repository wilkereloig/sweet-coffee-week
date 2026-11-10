<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Desde 10/11/2026 este arquivo é só índice; o texto integral (§10.4-b e as fases) foi movido sem reescrita para docs/regras/10-4b-painel-*.md. -->

# Painel (`painel-app/`) — índice

O painel é o app React em `painel-app/` desde 27/08/2026. Mapa do código:
`docs/PAINEL-REACT-MAPA.md`. Novidades para a equipe: `painel-app/NOVIDADES.txt`.
Testes: `npm run test:organizacao` (todos os `tests/painel-app-*` + `tests/painel-infra`).

**Antes de mexer numa área do painel, abra o arquivo dela na tabela abaixo** — o
detalhe (decisões, armadilhas, matriz de permissões) mora lá. Mudou o
comportamento? Registre no arquivo da área, não aqui.

## Vale sempre (resumo — o texto completo está no arquivo 01, §10.4-b)

- 🐛 RPC `returns void` responde **204 sem corpo**: ler `r.text()` e só converter se vier conteúdo. Prova por `curl` não pega isso.
- 🐛 `id` curto de elemento vira **global** (`window.<id>`) e colide com biblioteca de terceiro (matou o Turnstile).
- ⚠️ `sessionStorage` é **por origem**: o fluxo de acesso só fecha com uma única origem servindo SPA e `public/`. Não testar com dois servidores.
- ⚠️ Rota de pasta em `public/` exige **barra final** (`/marca/`, `/organizacao/`); todo link interno escreve a barra.
- ⚠️ Login da marca é o **nome do estabelecimento** slugificado: as duas slugificações (tela e Edge Function `criar-acesso-marca`) têm que casar.
- ⛔ Não desligar `deve_trocar_senha`. A senha de `admin_config` só se redefine por SQL e **não é recuperável**.
- Navegador que não busca a rede não testemunha sobre a rede: validar terceiro com Playwright contra `localhost`.

## Preciso de… → leia

| Assunto | Arquivo (`docs/regras/`) |
|---|---|
| §10.4-b páginas estáticas (histórico), acesso, conta da marca; Fases 5–18: `/marca/` e `/organizacao/` no banco, app instalável, notificações, casca/mesa/vendas/agenda, painel unificado `/painel/`, login + cor por vista, revisão, evolução e reestruturação, acessos + guia da marca, reconstrução visual, contas sem e-mail + Comercial, refinamento, "mesa de trabalho" | `10-4b-painel-01-estaticas-e-fases-5-18.md` |
| Cartoon 2026.2 — organização; cadastro da marca na edição; tudo que o site mostra se edita no painel; ficha geral do participante; início e formulário da marca; a marca só salva; botões só com ícone; Voltar + telas recentes; "Ver como participante"; logos oficiais e logo em todo lugar; pendências; prévia em Arquivos; Press Kit; endereço e localizações; trocas e bloco "O combo"; Social media › Participantes; link de preenchimento | `10-4b-painel-02-cartoon-cadastro-ficha.md` |
| Social media — planejamento, biblioteca, participantes, permissões (`#social/…`) | `10-4b-painel-03-social-media.md` |
| Equipe: foto, Meu perfil e autoria; atualização do painel e convite do aparelho; sincronização em tempo real; combos para aprovar; aviso de alteração com o campo; Operação › QR Codes; preenchimento automático; descrição da troca opcional; descrições sem limite; vouchers virtuais; fotos do combo por link; Arquivos › Links dos combos; Balcão (vouchers e carimbos à mão) | `10-4b-painel-04-equipe-sync-operacao.md` |

Achar um tema: `grep -n "^#### " docs/regras/10-4b-painel-*.md`.
