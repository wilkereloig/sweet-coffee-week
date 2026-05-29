# Plano — Mapa 3D Fotorrealista (Globo da Terra)

**Status:** planejado, não implementado.
**Objetivo:** adicionar visualização 3D fotorrealista estilo Google Earth (globo + terreno + prédios reais) como **entidade separada**, mantendo o mapa 2D vetorial atual (`MapaGoogle.jsx`) como **fallback**.
**Branch:** `dev/lovers-internal-pages` (regra do projeto — nunca prod/merge).

---

## Decisão de arquitetura

Adicionar um **3º provider** ao padrão já existente (hoje: Google vetorial + Leaflet). Seletor por env var.

```
src/pages/lovers/Mapa.jsx           # roteia provider conforme env/flag
src/pages/lovers/maps/
  MapaGoogle.jsx                     # 2D vetorial (ATUAL — intocado, vira fallback)
  MapaLeaflet.jsx                    # já existe
  MapaGoogle3D.jsx                   # NOVO — Map3DElement (maps3d)
```

`Mapa.jsx` decide:
- `VITE_LOVERS_MAP_PROVIDER === 'google3d'` → tenta `MapaGoogle3D`
- 3D não suportado (navegador sem WebGL2 / API indisponível / erro de load) → **fallback automático** para `MapaGooglePage` (2D)

---

## Tecnologia

- **API:** `google.maps.maps3d.Map3DElement` (web component `<gmp-map-3d>`), biblioteca `maps3d`. Ainda **beta**.
- **Pins:** `Marker3DElement` / `Marker3DInteractiveElement` (≠ `AdvancedMarkerElement` do 2D). Reescrita do sistema de marcadores.
- **Cloud Console:** habilitar **Map Tiles API** (3D Tiles fotorrealistas). Custo por uso — confirmar billing antes.
- **Câmera:** `center {lat,lng,altitude}`, `range`, `tilt`, `heading`. Animação via `flyCameraTo` / `flyCameraAround`.

---

## Escopo de reescrita (no novo arquivo, NÃO no 2D)

Cada recurso do 2D precisa ser readaptado pro 3D:

| Recurso 2D (MapaGoogle.jsx) | Equivalente 3D | Nota |
| --- | --- | --- |
| `AdvancedMarkerElement` (pins HTML) | `Marker3DInteractiveElement` | label/altitude diferentes |
| MarkerClusterer | manual ou sem cluster | maps3d não tem clusterer pronto |
| `InfoWindow.setContent` | popup custom DOM sobre o canvas | InfoWindow 2D não existe em 3D |
| filtro por bairro / sidebar | reaproveita (lógica de dados é a mesma) | só muda a camada do mapa |
| rota (botões já feitos) | reavaliar em 3D | controles custom podem não encaixar |
| user location marker | `Marker3DElement` | — |
| tilt/heading + botões de rotação | nativo no 3D (câmera) | botões custom viram opcionais |

Dados (`participants.js`) **não mudam** — coords/campos servem aos dois.

---

## Fases sugeridas (sessão nova)

1. **Spike/POC** — `MapaGoogle3D.jsx` mínimo: `<gmp-map-3d>` centrado em Natal, 1 pin de teste. Confirmar que Map Tiles API responde e billing OK.
2. **Pins** — render de todos os participantes via `Marker3DInteractiveElement` + clique abre popup custom.
3. **Paridade** — filtro bairro, sidebar, user location, rota.
4. **Fallback** — `Mapa.jsx` detecta suporte/erro → cai pro 2D sem quebrar.
5. **QA** — desktop + mobile <900px; medir custo de tiles.

---

## Riscos / atenção

- **Beta:** API maps3d pode mudar; possíveis bugs.
- **Custo:** Map Tiles API cobra por carregamento — monitorar.
- **Performance mobile:** 3D fotorrealista é pesado; fallback 2D essencial em devices fracos.
- **Não tocar** `MapaGoogle.jsx` (fallback estável) salvo bug.

---

## Estado atual (já entregue nesta sessão)

- Mapa 2D vetorial com `tilt: 45` + `heading: 0` (commit `d2032ea`).
- Par de botões de rotação (⟲ / ⤒ norte / ⟳) + rotação com botão do meio do mouse arrastando (commit `cb25e72`).
- Map ID `bab008b4d82c09f94676ecff` convertido raster→vetorial no Cloud Console.
- Coord Rollab Lagoa Nova (location) corrigida (commit `b5ba19d`).

Último commit: `cb25e72`. Branch limpa e pushada.
