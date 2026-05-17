# Contexto Compactado — Sweet & Coffee Week (site Vite + React)

**Data da compactação:** 2026-05-16
**Sessões:** 2 chats (~60 mensagens no total)

---

## 1. Objetivo

Site oficial do festival **Sweet & Coffee Week** com área dedicada à edição **Sweet & Coffee Week Lovers**. Funciona como vitrine institucional + hub da edição (combos, mapa, premiação). Deploy na Vercel.

---

## 2. Decisões Tomadas

- **Stack: Vite + React JSX** — sem TypeScript, sem react-leaflet (incompatível com React 18.3)
- **Roteamento: hash router customizado** (`useRoute` em `src/router.js`) — sem react-router
- **Mapa: Google Maps via `@googlemaps/js-api-loader` v2.x** — API nova: `setOptions()` + `importLibrary()` (classe `Loader` foi removida na v2)
- **Mapa: imperativo com useEffect** — sem wrapper React; `cancelled` flag para evitar dupla inicialização (React 18 strict mode)
- **Mapa: pins coração customizados** com `AdvancedMarkerElement` + HTML inline
- **Leaflet removido funcionalmente** — pacote ainda no `package.json` mas não usado
- **Menu: sidebar esquerda fixa no desktop, drawer mobile**
- **Duas identidades visuais isoladas** — nunca misturar classes/variáveis Lovers em páginas Institucionais e vice-versa
- **Awards = avaliação de experiência** — não votação direta em melhor combo

---

## 3. Estado Atual

**Funcionando:**
- Todas as páginas institucionais (Home, Curiosidades, Edições, Participar, Apoiar, Contato)
- Hub Lovers, Combos, Combo individual, Awards
- Mapa da Doçura com Google Maps real, 4 pins placeholder, filtro por bairro, busca por nome, contador, panTo ao clicar na lista
- Footer, Nav, sidebar desktop, drawer mobile

**Pendente de dados reais:**
- `src/data/participants.js` — 4 placeholders com coords reais de Natal/RN
- `src/data/combos.js` — array vazio

**Marca d'água "For development purposes only"** — billing vinculado mas propagação pode levar até 24h; some automaticamente em produção.

---

## 4. Arquivos e Artefatos Relevantes

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `src/pages/lovers/Mapa.jsx` | Editado | Google Maps + filtro bairro + busca + panTo |
| `src/data/participants.js` | Criado | 4 placeholders; preencher com dados reais |
| `src/data/combos.js` | Criado | Array vazio; formato documentado no arquivo |
| `src/pages/lovers/Hub.jsx` | Editado | Sem blur overlay; badge "EM BREVE" nos pins |
| `src/pages/lovers/Awards.jsx` | Editado | Hero centralizado |
| `src/pages/institutional/Participar.jsx` | Editado | Form gap 24px |
| `src/pages/institutional/Apoiar.jsx` | Editado | Form gap 24px |
| `src/pages/institutional/Contato.jsx` | Editado | Email cor `--accent` |
| `src/styles.css` | Editado | Footer gap 56px, sidebar labels 11px, footer margin-top 0 |
| `package.json` | Editado | `@googlemaps/js-api-loader@2.0.2` adicionado |

---

## 5. Código e Configurações Críticas

### Google Maps API Key
Chave em `.env.local` (não versionado):
```
VITE_GOOGLE_MAPS_KEY=sua_chave_aqui
```
Uso no código: `import.meta.env.VITE_GOOGLE_MAPS_KEY`

### Padrão correto para inicializar Google Maps (v2 do loader)
```js
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

// DENTRO do useEffect com cancelled flag:
setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' })
const { Map } = await importLibrary('maps')
const { AdvancedMarkerElement } = await importLibrary('marker')
// NÃO usar: new Loader({...}).load() — classe removida na v2
```

### Estrutura de dados de participante
```js
{
  id: "",
  name: "",
  slug: "",
  instagram: "",
  address: "",
  neighborhood: "",
  city: "",
  latitude: null,   // decimal, ex: -5.7840
  longitude: null,  // decimal, ex: -35.2005
  openingHours: ""
}
```

### Estrutura de dados de combo
```js
{
  id: "",
  editionId: "2026-lovers",
  participantId: "",
  slug: "",
  name: "",
  recreatedTheme: "",
  description: "",
  mainImage: "",
  sweetImage: "", sweetDescription: "",
  savoryImage: "", savoryDescription: "",
  drinkImage: "", drinkDescription: "",
  price: ""
}
```

---

## 6. Erros e Armadilhas Conhecidas

- **`react-leaflet@5` exige React 19** — instalar deps com `--legacy-peer-deps` enquanto o projeto usar React 18.3
- **`@googlemaps/js-api-loader` v2 removeu a classe `Loader`** — usar `setOptions()` + `importLibrary()`
- **React 18 strict mode executa useEffect duas vezes** — obrigatório usar flag `cancelled` no useEffect do mapa
- **`mapId: 'DEMO_MAP_ID'`** — necessário para `AdvancedMarkerElement` funcionar
- **Erro silencioso "The above error occurred"** — erro primário vem antes no log; filtrar mensagens secundárias do React

---

## 7. Próximos Passos

- [ ] Preencher `src/data/participants.js` com dados reais
- [ ] Preencher `src/data/combos.js` com combos reais
- [ ] Adicionar fotos reais dos combos (mainImage, sweetImage, savoryImage, drinkImage)
- [ ] Revisar página Awards — linguagem de avaliação, formulário/critérios
- [ ] Revisar consistência visual da área Lovers (cards, espaçamentos, tipografia, responsividade)
- [ ] Configurar domínio na Vercel e restringir API Key ao domínio de produção
- [ ] Remover `react-leaflet` do `package.json` (não usado)

---

## 8. Informações Pendentes

- Critérios do formulário de avaliação Awards
- Ranking histórico de participantes e premiações (para página Edições)
- Fotos finais dos combos e participantes
- Coordenadas reais dos participantes confirmados

---

## 9. Nomenclatura Oficial

| Correto | Errado |
|---------|--------|
| Sweet & Coffee Week | Sweet Coffee Week |
| Sweet & Coffee Week Lovers | Sweet Coffee Lovers / Sweet & Coffee Lovers |
| Sweet & Coffee Week Awards | Sweet Coffee Awards |

---

## 10. Variáveis CSS Relevantes

```css
/* Lovers */
--lovers-red:    #D63648;
--lovers-pink:   #FFB4C2;
--lovers-cream:  #FFF1E6;
--lovers-ink:    #2B1810;
--font-lovers-display: 'sofia-pro-comp', 'Caprasimo', serif;
--font-lovers-body:    'sofia-pro-comp', 'DM Sans', sans-serif;

/* Institucional */
--accent: #E8553A;
--ink:    #2B1810;
```

---

## 11. Regras de Trabalho

- Listar arquivos que serão modificados **antes** de editar
- Usar `Edit` (não `Write`) para arquivos existentes
- Alterar apenas arquivos do escopo do pedido
- Nunca refatorar o projeto inteiro
- Nunca misturar identidade Institucional ↔ Lovers
- Dev server: `npm run dev` → `localhost:5173`

---

> **Instrução para o próximo chat:** Este arquivo contém o contexto compactado de sessões anteriores do projeto Sweet & Coffee Week. Use-o como base para continuar. Não peça ao usuário para repetir informações aqui contidas. Confirme brevemente que entendeu o contexto e pergunte por onde quer continuar.
