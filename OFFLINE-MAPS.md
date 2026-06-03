# 🗺️ Ver os lugares num mapa (e quando precisa de app)

Ao gerar o roteiro, se os pontos têm coordenadas, sai também um arquivo **`my-trip.kml`**
com todos os lugares da viagem. Mas **na maioria dos casos você nem precisa instalar app** —
só precisa para o cenário 100% offline. Veja qual é o seu caso:

| Seu caso | O que usar | Instalar app? |
|---|---|---|
| Tenho internet na viagem (eSIM/Wi-Fi) | A **aba Mapa** do próprio `my-trip.html` | ❌ não |
| Quero abrir **um** lugar e navegar | Os links **📍 / endereço** → abrem no **Google/Apple Maps que você já tem** | ❌ não |
| Quero **todos os pontos** num mapa, **online** | **Google My Maps** (importa o `.kml` no site) | ❌ não |
| Quero **todos os pontos**, **100% offline** | Um app que importe KML (lista abaixo) | ✅ sim (1×) |

Ou seja: **app só é necessário para "ver todos os pinos sem internet nenhuma".** Pro resto,
use o que já está no seu celular.

---

## ❌ Sem instalar nada

### A própria aba Mapa (precisa de internet)
Com eSIM ou Wi-Fi, abra o `my-trip.html` → aba **🗺️ Mapa**: todos os pontos aparecem, com
popups que abrem cada lugar no Google Maps / app do celular.

### Google My Maps (todos os pontos, online, sem app novo)
1. Acesse [mymaps.google.com](https://www.google.com/mymaps) → **Criar novo mapa**.
2. **Importar** → suba o **`my-trip.kml`** → todos os lugares aparecem num mapa só.
3. Esse mapa aparece também no app do Google Maps que você já tem (em *Salvos → Mapas*).

> É **online** — ótimo pra ver tudo junto, mas não funciona sem internet.

---

## ✅ Para usar 100% offline (qualquer app que importe KML)

Funciona com **vários apps gratuitos**, não só um:

- **Organic Maps** — leve, sem anúncios, ótimo na China ([Android](https://play.google.com/store/apps/details?id=app.organicmaps) · [iPhone](https://apps.apple.com/app/organic-maps/id1567437057))
- **Maps.me** — popular, importa KML/KMZ
- **OsmAnd** — o mais completo (mais "pesado")
- **Guru Maps** — também importa KML/GPX

Passo a passo (qualquer um deles):
1. Instale o app e **baixe o mapa** do país/região (uma vez, no Wi-Fi).
2. Envie o **`my-trip.kml`** para o celular (AirDrop, e-mail, WhatsApp pra si mesmo, Drive…).
3. Abra o arquivo → **"Abrir com [o app]"** → todos os pontos aparecem e funcionam **offline**.

> Por que um app OSM e não o Google offline: na **China** o Google Maps é bloqueado e mostra as
> ruas deslocadas (GCJ-02). Apps baseados em OpenStreetMap usam o GPS real e funcionam offline.
> Alternativa local na China: **Amap (Gaode)**.

---

## Resumo

O **`my-trip.html`** é o seu **roteiro offline** (as abas Calendário/Roteiro/Transportes/Lugares
funcionam sem internet). Para o **mapa**: com internet, use a aba Mapa ou o Google My Maps (sem
app); para **mapa offline com todos os pinos**, importe o **`my-trip.kml`** num app OSM.
