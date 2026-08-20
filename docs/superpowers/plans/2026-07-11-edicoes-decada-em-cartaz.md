# Edições — "A Década em Cartaz" (projeto grandioso)

**Data:** 2026-07-11 · **Status:** proposta (aguardando aprovação)
**Página:** `src/pages/institutional/Edicoes.jsx` (rota `#/edicoes`, inalterada)
**Base:** evolução do "Cinema da Década" (spec 2026-07-07) — mesma mecânica, salto de experiência.

---

## 1. Conceito

Hoje a página é uma apresentação. O projeto transforma em **sessão de cinema**:
o visitante não "navega por edições" — ele **assiste à década**. Três atos:

```
ATO I — ABERTURA FRIA          ATO II — 16 CENAS            ATO III — CRÉDITOS
cena 2016 abre como cold       cada edição = cartaz vivo    a década agradece:
open: tema se monta em         (tema-pôster + corte de      créditos rolando com
tela, sublinhado assina        cena com cortina de tom)     vencedores reais +
o tom, década começa                                        21 marcas Lovers +
                                                            F2 + CTA Awards
```

Nada disso quebra as regras: sem página nova, sem hero separada, sequência 1→16
intacta (créditos = **estado final do trilho**, já autorizado), horizontal no
desktop / vertical no mobile, dados 100% reais, paleta oficial, zero dependência
nova, zero `backdrop-filter` no trilho.

## 2. As 4 assinaturas (o que torna único)

### A. Cortina de tom (corte de cena)
A troca de edição deixa de ser um slide lateral seco: uma **cortina no tom da
PRÓXIMA edição** varre a viewport (translateX/scaleX, transform-only, ~480ms),
e a cena nova entra "revelada" por ela. A década vira uma sequência de cortes
de cor — Páscoa entrega pro rosa, Movies entrega pro ciano. É o tom da edição
funcionando como linguagem, não decoração.

- 1 overlay único na viewport (não 16), animado só em troca de cena.
- Reduced-motion: sem cortina, corte seco.

### B. Tema-pôster (já iniciado, levar ao limite)
O tema é o herói tipográfico (feito). Evoluir para **entrada por linhas
clipadas** (cada linha do tema sobe de dentro de uma máscara, stagger 80ms) +
sublinhado que assina o tom (feito). O título entra como letreiro de pôster
sendo colado, não como texto que aparece.

### C. Medidor da década (progresso que conta história)
A barra de progresso vira **16 segmentos, um por edição, cada um no tom da
edição**. Ao avançar, os segmentos "acendem". Leitura imediata: onde estou na
década, e a década inteira como espectro de cor. Funcional (posição + identidade
de tom), não ornamento. Clicável = salto direto (mesma função do YearRail hoje,
mais expressiva).

### D. Créditos da década (finale)
Depois da cena 16 (Lovers), o trilho termina num **estado final de créditos de
cinema**: rolagem vertical lenta (transform-only, pausa em hover, estática em
reduced-motion) com dados 100% reais:

- "A década em 1º lugar" — vencedores 1º lugar por edição (sweetCoffeeHistory +
  loversAwardsResults, empates preservados);
- "Elenco da Lovers" — as 21 marcas (participants.js);
- "Realização" — F2 Experience;
- CTA único: "Ver o Sweet Awards".

É o epílogo incorporado (pedido anterior) elevado a momento memorável. No
mobile vira o último painel do carrossel (snap), com lista estática.

## 3. Partitura de movimento (motion score)

| Momento | Movimento | Técnica |
|---|---|---|
| Corte de cena | cortina de tom varre → cena nova revelada | overlay transform |
| Título | linhas do tema sobem clipadas, stagger 80ms | clip-path/overflow + translateY |
| Sublinhado | desenha no tom, delay 280ms | scaleX (feito) |
| Meta + lead | fade+rise após título | stagger existente |
| Rail (pódio/curiosidades/participantes) | entra 240ms depois, em sequência | stagger existente |
| Filmstrip | fade discreto por último | opacity |
| Foto | Ken Burns só na cena ativa | feito |
| Medidor | segmento acende na chegada | opacity/scaleY |
| Créditos | rolagem translateY lenta, loop | transform, só quando ativo |

Tudo `transform`/`opacity`/`clip-path`. Nada de width/height/top/left. Nada
contínuo fora da cena ativa. `prefers-reduced-motion`: estados finais diretos.

## 4. O que NÃO entra (disciplina)

- Sem numeral-watermark, sem hairlines de "broadsheet" (defaults rejeitados).
- Sem stickers/doodles; sem som; sem scroll-hijack novo (motor de passos mantido).
- Sem ranking/comparação entre edições — créditos listam vencedores POR edição,
  nunca "a maior edição".
- Sem dependências novas (tudo CSS + React já presentes).

## 5. Dados (fontes reais, nada inventado)

- Créditos: `sweetCoffeeHistory.js` (1ºs por edição, empates) + `loversAwardsResults.js`
  (2026.1) + `participants.js` (21 marcas) — novo seletor derivado
  `src/data/decadeCredits.js` (zero hardcode).
- Curiosidades: `editionInsights.js` (feito, 15 itens verificados).
- Nenhum dado novo digitado à mão além de rótulos de seção.

## 6. Fases de implementação

1. **Cortina de tom** — overlay + orquestração da troca de cena. (impacto máximo)
2. **Tema-pôster completo** — entrada por linhas clipadas + timing do rail.
3. **Medidor da década** — progresso segmentado por tom, clicável, acessível.
4. **Créditos da década** — seletor `decadeCredits.js` + estado final do trilho
   (desktop) / painel final (mobile).
5. **Polish + validação** — a11y (aria-live do ato, foco, teclado), mobile
   320–430, testes novos, `git diff --check`, build.

Cada fase fecha com testes verdes. Commit só com autorização.

## 7. Riscos e mitigação

- **Cortina atrasar a navegação** → cortina curta (≤480ms) e interruptível
  (nova troca cancela a anterior); teclado nunca fica bloqueado.
- **Créditos pesados** → montam só quando o estado final fica `near`; lista
  virtualizada não é necessária (≈40 linhas).
- **Contraste do tema gigante** → scrim já calibrado; título herda text-shadow.
