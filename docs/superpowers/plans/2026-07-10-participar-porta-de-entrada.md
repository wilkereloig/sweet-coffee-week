# Plano — Participar como porta de entrada do participante (jul/2026)

## Objetivo
Reconstruir `#/participar` de "formulário com informações" para **início da jornada do
participante**: `interesse → análise → aprovação → (futura) área privada`. A área privada
NÃO é construída agora; só orienta a arquitetura do pré-cadastro, sem prometer função
indisponível.

## Direção visual (dentro do sistema institucional — CLAUDE.md/AGENTS.md)
- Paleta oficial: chocolate `#2B1810/#381610` + creme + coral `#F2693C` (page-accent) +
  amarelo `#F8B511` + rosa + ciano. Sem cor nova, sem sticker, sem eyebrow, sem mono.
- `--hm-gutter`, zona de segurança do header (`--hero-content-start`), breakpoints
  1080/960/720/560/420.
- Assinatura: **console de pré-cadastro em 2 etapas fundido à hero** sobre fotografia real
  de combos em tela cheia (não card flutuante) + tríptico editorial "o que entra em
  circulação".

## Seções (8)
1. Hero imersiva chocolate, foto real full-bleed, título "Sua marca pode ser a próxima
   descoberta de Natal.", lead curto, pré-cadastro como faixa-ferramenta integrada.
2. Pré-cadastro 2 etapas (1. Sua marca / 2. Seu contato) com indicador de progresso.
3. Prova concreta: 16 edições · +100 marcas · +34 mil combos (tipografia grande +
   divisórias, não cards de dashboard; nada de competição entre edições — §11).
4. "O que uma marca coloca em circulação": 3 movimentos (combo autoral / presença na
   campanha / nova relação com público), foto real, sem grade de cards. Inclui
   "1 doce + 1 salgado + 1 bebida".
5. Curadoria: 5 critérios transparentes (perfil e categoria; atendimento; estrutura e
   localização; alinhamento com a edição; disponibilidade de vagas). Sem tom
   eliminatório. Explícito: pré-cadastro não garante participação.
6. Depoimentos: 1 história principal (combo + logo real) + demais como sequência
   editorial (não mural de cards iguais). Só falas reais.
7. Jornada após o interesse: percurso contínuo (pré-cadastro → análise → contato e
   aprovação → próximos passos). Sem prometer painel/login/área exclusiva.
8. Fechamento: CTA "Iniciar pré-cadastro" → rola pro formulário. Sem duplicar o form.

## Pré-cadastro (dados)
Etapa 1: nome da marca, tipo de negócio, bairro, cidade (default `Natal/RN`, editável).
Etapa 2: responsável, e-mail, WhatsApp, Instagram (opcional), apresentação (opcional).
NÃO pedir: CNPJ, documentos, dados do combo, senha, operação da edição.
Estados: validação clara, enviando, sucesso real (limpa form), erro honesto, foco/teclado.
Nunca afirmar que salvou se a gravação falhar.

## Persistência (Supabase — padrão existente `submit_pesquisa`)
- Tabela `participation_interests`: id, created_at, status (servidor, default `novo`),
  campos do form, reviewed_at, internal_notes. Estados: novo | em_analise | contatado |
  aprovado | nao_selecionado | aguardando_cadastro.
- Segurança: RLS habilitado SEM policy (zero acesso anônimo direto). Escrita só via RPC
  `submit_participation_interest` (security definer, grant anon) que valida e fixa
  `status='novo'` — interface pública nunca envia status/notas/revisão. Leitura só via RPC
  admin com senha (`get_participation_interests(p_secret)`), sem leitura pública de PII.
- Migration entregue em `supabase/migrations/`; NÃO aplicada na base de produção.

## TDD
`tests/participation-interest.test.mjs` (node, offline, rpc injetado):
validação (obrigatórios + e-mail), payload sem campos internos, sucesso, erro (não afirma
salvo), bloqueio de envio inválido.

## Arquivos
- `src/lib/participationInterest.js` (novo, puro)
- `tests/participation-interest.test.mjs` (novo)
- `supabase/migrations/20260710_participation_interests.sql` (novo)
- `supabase/schema.sql` (append do mesmo bloco idempotente)
- `src/pages/institutional/Participar.jsx` (reconstrução)

Não tocar: Home, Edições, Curiosidades, Apoiar, Contato, Sweet Awards, Lovers, flags,
rotas QR, WIP não relacionado.
