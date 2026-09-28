# Auditoria do painel (organização + participante) — 28/09/2026

Estado de partida: `dev/site-completo`, commit `e9b9ba6`. Leitura de código +
banco Supabase `dgfmoibynftadsyjcclg` (só SELECT na auditoria). Sem navegador.
Cada item diz onde está; a seção final ("Reauditoria") diz o que foi feito.

## A · Funcionando

- Login da organização nos dois modos: senha compartilhada (`admin_ping`) e
  conta nominal (Supabase Auth + `minhas_permissoes`, bloqueio de suspenso,
  troca obrigatória de senha).
- Login da marca pelo nome do estabelecimento, troca obrigatória no 1º acesso.
- Isolamento entre marcas no banco: toda policy passa por
  `participantes.user_id = auth.uid()`; guards `pode*`/`admin_ok` fechados para
  `anon` e `authenticated`.
- Funções de organização (administrador · curadoria · produção · consulta) com
  permissões por ação no banco (`pode(p_secret, acao)`); UI esconde o que não
  pode, o banco é quem decide.
- Respostas: 3 origens, busca, status, período, nota, apagar, criar acesso.
- Marcas: lista, ficha, cadastro manual com credenciais de uso único.
- Produção: pedidos (rascunho → publicar → quem falta), arquivos (upload
  assinado), sessões de fotos, vagas.
- Equipe: criar conta, mudar função, suspender/reativar, push de teste.
- Marca: venda do dia, reservar vaga de foto, concluir cadastro, baixar
  arquivo, ligar push, guia de fotos.

## B · Funcionando parcialmente

- Sino da organização: derivado no navegador, depende das vistas visitadas,
  "lida" some ao recarregar, clique leva à vista e não ao item.
- Autosave do cadastro da marca: sem "tentar de novo", sem máscara/validação
  de telefone, CNPJ, preço.
- Pedidos: a marca só lê; "respondido" é marcado à mão pela organização.
- Leitura de arquivo: a tabela `arquivo_leitura` existe, ninguém grava nela —
  o contador "confirmaram leitura" nunca anda.
- Editar sessão de fotos: observações e local não podem ser apagados.
- Sessão nominal da organização expirando em pleno uso: só erro genérico.

## C · Pendente (iniciado)

- Sino da marca: botão sem ação, badge sempre escondido.
- `regerar-senha-conta` (Edge Function publicada) sem nenhuma tela chamando.
- Foto de item do combo (`registrar_foto_item`) sem tela.
- Modo "marcar eu mesma" da agenda só troca o texto.
- Pílulas de pendência em Hoje não navegam.

## D · Não implementado

- Mensagens entre organização e participante (não há tabela nem tela).
- Notificações persistidas (lida/não lida no servidor) e push automático —
  o único envio é o botão de teste.
- Histórico por participante, observações internas, filtro de histórico.
- Nome, último acesso e nova senha nas contas da equipe; `auditoria` grava
  `ator_rotulo = 'senha-compartilhada'` até para conta nominal (default).
- Recuperação de senha autosserviço (marca usa e-mail sintético — decisão
  registrada: a organização gera acesso novo).
- Mesa: cartões não abrem nada.
- Estado "offline", aviso de versão nova, "próximo passo" no Hoje da marca.

## E · Problemas de UX/UI

- **Painel preso numa coluna de ~560 px** em qualquer monitor: regra global
  legada `main{max-width:720px}` (painel.css, bloco concatenado) vence
  `.og-corpo`; `.pn-vista__trilho` repete 720 px. A Mesa rola na horizontal
  até em 2560 px.
- Caixa dentro de caixa (seção bege → item branco com borda → estado
  tracejado), título repetido 3× (cabeçalho, VistaCabeca, h2).
- Só um breakpoint (900); nada se reorganiza em tela larga.
- Sem estado de carregamento (tela em branco) em Respostas, Mesa, Marcas,
  Produção; Equipe mostra "nenhuma conta" antes de carregar.
- 9 famílias de botão, 3 de aviso, 5 de selo; tipografia só em Nexa Slab
  (§6.5 pede Nexa/Nexa Text para interface e leitura).
- Folha sem Esc e sem foco; botões de ícone sem `aria-label`.

## F · Problemas técnicos

- Push morto para quem entra pelo site: `AccessDialog` manda a
  `/organizacao/` e `/marca/`, fora do escopo do SW `/painel/` —
  `serviceWorker.ready` nunca resolve e "Ligar avisos" trava.
- Clique na notificação foca a aba sem navegar; sair não cancela a assinatura.
- Prazo de pedido gravado um dia antes (`new Date('AAAA-MM-DD')` = UTC).
- Preço "29.90" vira 2990 (`precoNumero` remove todo ponto).
- "Concluir cadastro" pode não fazer nada: `required` dentro de bloco
  `hidden` bloqueia o submit sem balão.
- Autosave perdido ao trocar de aba (timer limpo no desmonte).
- Unidade duplicada em rede lenta; vaga de foto duplicada no clique duplo.
- Hoje diz "cadastro entregue" antes de concluir.
- 9 RPCs (`criar_solicitacao`, `publicar_solicitacao`, …) só existem no
  banco, sem arquivo em `supabase/migrations/`.
- Sem `viewport-fit=cover`: safe-area vale 0 no iPhone.

## G · Código/estrutura antiga

- Bloco CSS legado concatenado (regras globais `main`, `header button`,
  `label`, `p`), duplicatas `.pn-casca`, `.pn-rail`, `.pn-badge`, `.pn-notif`,
  classes mortas (`og-entrada*`, `og-regua`, `.is-estreito`…).
- `FolhaNovaConta` duplica `Credenciais.jsx`.
- `seloAcesso` morto; comentários citando `public/marca/index.html` apagado.
- Mapa `PAINEL-REACT-MAPA.md` desatualizado (RPCs, notificações).

## Plano (ordem de execução)

1. **Críticos** — bugs de F (prazo, preço, concluir, autosave, duplicatas,
   push fora do escopo). Primeiro porque quebram dado real.
2. **Banco** — autoria automática (`ator` pela sessão, nunca pelo front),
   nome/último acesso nas contas, histórico por participante com antes/depois,
   observações internas, mensagens, notificações persistidas, push automático
   por trigger. Antes da tela, porque a tela depende do contrato.
3. **Fluxos** — mensagens nos dois lados, central de notificações com link
   para o item, marca responde pedido, leitura de arquivo, histórico e
   observações na ficha, usuários da equipe.
4. **Layout** — tirar a coluna de 720 px, achatar caixas, grade larga.
5. **PWA** — escopo único `/painel/`, safe-area, offline, versão nova.
6. **Refino** — estados de carregamento, Folha acessível, docs, testes.

## Reauditoria (fim do trabalho, 28/09/2026)

Commits em `dev/site-completo`: `5c2e506` (bugs críticos), `336d0e6` (banco
e Edge Functions), `6c71832` (fluxos, UI, layout, PWA), e o de documentação.

| Item do diagnóstico | Situação |
|---|---|
| Painel preso em coluna de ~560 px | ✅ CSS reescrito sem regra global; conteúdo até 1760 px, grades 1→2 colunas, rail com nomes ≥1280 |
| Caixa dentro de caixa, título 3× | ✅ seções sem caixa, listas em linhas; título da vista some no celular |
| Sem estados de carregamento/erro | ✅ Carregando/Vazio/Erro com "tentar de novo" em todas as vistas |
| Mensagens org ⇄ marca | ✅ tabela + RPCs + gatilho; lida/enviada nos dois lados |
| Notificações persistidas, lida no servidor, link ao item | ✅ sino nos dois painéis, marcar todos, deep link |
| Push automático | ✅ banco: gatilho → pg_net → enviar-push · ⚠️ **código da função pendente de publicação** |
| Push travado fora de `/painel/` | ✅ redirects + SW; clique leva ao item; sair desliga o aparelho |
| Autoria / histórico / observações / filtros | ✅ autor pela sessão, antes/depois por gatilho, observação interna, histórico por marca e geral |
| Usuários da equipe (nome, último acesso, desativar, senha nova) | ✅ Equipe · ⚠️ nome na criação vai também por RPC (funciona antes do deploy) |
| Conta pessoal como porta principal | ✅ login abre em conta pessoal; senha compartilhada pode ser desligada em Equipe |
| Marca responde pedido, confirma leitura | ✅ |
| "Esqueci a senha" da marca | ✅ organização gera senha nova na ficha · ⚠️ depende do deploy de `regerar-senha-conta` |
| Hoje sem próximo passo | ✅ próximos passos por urgência + o que já foi feito |
| Bugs de preço, prazo, concluir, autosave, duplicatas | ✅ com teste onde é lógica pura |
| RPCs só no banco | ✅ capturadas em `20260928_painel_mensagens_avisos_autoria.sql` |
| PWA (safe-area, ícones, offline, versão nova) | ✅ · offline mostra a casca e avisa; dados exigem rede (decisão) |
| Mesa: cartões mortos | ✅ abrem a ficha certa |
| Paginação | ⏸ não feita: são 3 respostas e 0 marcas no banco; busca/filtro/ordenação resolvem até centenas |
| Ações em massa | ⏸ não feitas: nenhum fluxo atual pede (publicar pedido já alcança todas) |
| Upload de arquivo pela marca | ⏸ não feito: exige política de Storage nova; pedidos respondem por texto |
| Foto de item do combo (`registrar_foto_item`) | ⏸ segue sem tela |
| Prazo próximo como aviso automático | ⏸ exige `pg_cron`; hoje aparece nos próximos passos e na mesa |
| 9 migrations de junho sem arquivo | ⏸ precisa do CSV do SQL Editor (regra: não transcrever à mão) |
| Validação visual e teste logado | ⏸ não feita por mim (regra do projeto); build e 184 testes verdes |

**Pendências que dependem do Wilke:**
1. Publicar `enviar-push`, `regerar-senha-conta` e `criar-conta-organizacao`
   a partir de `supabase/functions/` (`supabase functions deploy <nome> --no-verify-jwt`).
2. Conferir que as três variáveis VAPID estão na função `enviar-push`.
3. Criar a própria conta de administrador em Equipe e, quando a equipe toda
   tiver conta, desligar o acesso compartilhado.
4. Merge em `master` quando aprovar (A2).
