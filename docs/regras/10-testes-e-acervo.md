<!-- Parte das regras do projeto. Índice e regras absolutas: CLAUDE.md da raiz. Movido sem reescrita em 03/10/2026. -->

### 10.8 Testes e ferramentas

✅ **`tests/responsive.mjs` passa em 6 de 6 desde 22/08/2026.** A reprova crônica de
"menu-toggle invisível no mobile" acabou — e o diagnóstico antigo desta seção estava
**errado**, o que vale mais que a correção.

A doc dizia: *"`.menu-toggle` é do sistema legado, o teste está desatualizado, a falha
some quando `styles.css` for removido"*. Meia verdade. `styles.css` já tinha sido
demolido e a falha continuava, porque a causa era outra e mais funda: **o teste nunca
carregou o site.** Ele abria `${BASE}/`, e o `vite preview` serve o build de PRODUÇÃO,
onde `import.meta.env.DEV` é `false` — então `COMING_SOON_PUBLICATION` derrubava as seis
viewports na landing `/em-breve` (§3.4). Faltava `?preview=1`, que o `tests/motion.mjs`
sempre teve.

⚠️ **A pista estava no próprio relatório e passou meses sem ser lida:** o teste *achava*
`.brand` e *não achava* `.menu-toggle`. Um seletor do sistema antigo presente e outro
ausente, no mesmo DOM, não é envelhecimento — é **página errada**. (`.brand` é da
`EmBreve.jsx`; a landing nunca teve menu.) **Seletor achado e seletor ausente do mesmo
"sistema morto" é assinatura de rota errada, não de código morto.**

O arquivo foi reescrito na mesma etapa. Saíram quatro premissas do sistema anterior:
`.site-header`/`.brand`/`.menu-toggle`/`.mobile-menu`/`.mobile-overlay` → casca 2026;
breakpoint 960 → **900**; gutter `clamp(28px,11.5vw,150px)` → `--scw-trilho` **lido do CSS
computado**, não redigitado (§5.2 — teste que recopia a fórmula passa a medir a cópia);
rota `/#/` → `/`, o hash routing morreu no Anexo A.3. O piso de toque subiu de 40 para os
**44px** do §6.10, e o fluxo do menu virou o da folha "mais" — que fecha por `.is-fechando`
e só então desmonta, então "fechada" se mede por `state: 'detached'`, não por
invisibilidade.

⚠️ **`tests/icones.mjs` não existe no repositório**, apesar de a documentação antiga mandar
rodá-lo.

⚠️ **`tests/responsive.mjs` e `tests/motion.mjs` rodam contra o BUILD de produção via
`vite preview`, não contra o dev server** — só o build reflete o site real: minificação,
ordem final de CSS, assets com hash. **Por rodarem no build, os dois precisam de
`?preview=1` na URL**, senão medem a landing (acima).

### 10.9 Acervo e dados

⚠️ **Nome de pasta do acervo não é descrição de conteúdo — já falhou duas vezes.**
"encantamento em loja" e "patrocínios e apoios" **eram fotos de festa a fantasia.**
**Inspecionar visualmente antes de confiar.** Contraexemplo útil: a pasta `sinalização/`
tem 9 arquivos chamados `nao usar essas (N).jpg` — aí o nome **é** a instrução.

⚠️ **A Base de Conhecimento não vale como fonte-mestra de contagem.** Ela errou quatro
vezes (2018.1, 2019.2, 2020.1, 2023), tratando pastas mal nomeadas do acervo bruto como se
fossem marcas participantes. **A fonte mais confiável são os cards "Confirmado" oficiais**,
em `acervo-bruto/EDIÇÕES DO FESTIVAL/<edição>/participantes/`, acima do código e muito
acima da Base.

⚠️ **Se `ACERVO.md` ou `src/data/handoff/*` divergirem do código em `src/data/`, vale o
CÓDIGO** — e o resumo é corrigido, não o contrário.

⚠️ **`src/data/_arquivo/` está fora do bundle de propósito. Não importar de lá em código
vivo.**

⚠️ **Campos `null` em `faqCentral.js` não são bug** — ver §7.6.

---

