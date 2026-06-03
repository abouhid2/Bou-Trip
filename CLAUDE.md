# Instruções para o Claude — montar um roteiro

Este repositório é um **gerador de roteiro de viagem**. Quando alguém abrir o projeto
no Claude e pedir algo como *"monta meu roteiro"* / *"me ajuda a planejar minha viagem"*,
siga este fluxo:

## 1. Entreviste a pessoa (em português, ou no idioma dela)
Pergunte, de forma leve e uma coisa de cada vez:
- **Para onde vai?** (uma ou várias cidades)
- **Quando começa?** (data do 1º dia, formato AAAA-MM-DD)
- **Quantas noites em cada parada?**
- **O que não pode perder em cada lugar?** (destaques)
- **Quer registrar voos/trens?** (opcional: data, nº, origem→destino, horários)
- Ritmo (corrido x tranquilo), interesses (natureza, comida, história…) — para sugerir destaques

Se a pessoa não souber, **sugira** com base em conhecimento de viagem (e pesquise na web se possível),
mas **nunca invente dados pessoais** (nomes, documentos, código de reserva): pergunte.

## 2. Monte o `trip.json`
Escreva um arquivo `trip.json` seguindo exatamente o formato de **`trip.example.json`**.
Resumo do schema:
- `title`, `emoji`, `travelers`, `startDate` (AAAA-MM-DD), `footer` (opcionais menos startDate)
- `maps`: `"google"` (padrão) ou `"osm"`. **Use `"osm"` para viagens à China continental**
  (lá o Google Maps é bloqueado e desloca as coordenadas). Para o resto do mundo, deixe Google.
- `stops`: lista de paradas na ordem da viagem. Cada parada:
  - `city` (texto), `nights` (número)
  - `transit: true` para dias de voo/translado (cor cinza, fora da contagem de bases)
  - `highlights`: lista de itens (string vira bullet; ou objeto, veja abaixo)
  - `days`: **opcional** — array por dia (cada dia é uma lista de itens), para controlar o conteúdo
    dia a dia em paradas de várias noites. Tem prioridade sobre `highlights`.
- `flights`: lista opcional `{ date, flightNo, from, to, dep, arr, note }`

### Item de dia (formato rico)
```jsonc
{
  "type": "star",                  // "star" (★ imperdível) | "move" (→ deslocamento) | "bullet"
  "text": "Muralha Mutianyu",
  "url": "https://...",            // página do lugar (oficial/info) — vira link clicável no nome
  "tickets": "https://...",        // link para comprar ingressos — vira ícone 🎟️
  "coords": [40.4319, 116.5704]    // [lat, lon] WGS-84 — vira ícone 📍 + ponto no mapa offline
}
```

**Pesquise e preencha** `url`, `tickets` e `coords` dos pontos principais (use a web se disponível):
- `url`: site oficial, página da atração, ou guia confiável.
- `tickets`: bilheteria oficial; para China, `trip.com` costuma funcionar.
- `coords`: **sempre WGS-84 (GPS real / OpenStreetMap)** — em qualquer país. ⚠️ Na China não
  pegue do Google Maps: ele aplica o desvio GCJ-02 e as coordenadas saem ~centenas de metros
  erradas. Com `coords`, o 📍 vira link de mapa (Google ou OSM, conforme `maps`) e o ponto
  entra no `my-trip.kml`.

As datas dos dias são **calculadas automaticamente** a partir de `startDate` somando as noites.

## 3. Gere o HTML
Rode:
```bash
node lib/render.mjs trip.json my-trip.html
```
Depois diga para a pessoa abrir `my-trip.html` no navegador (é responsivo no celular e
imprime como PDF em A4 paisagem). Se houver `coords`, o render também cria um
**`my-trip.kml`** — aponte a pessoa para o **[`OFFLINE-MAPS.md`](OFFLINE-MAPS.md)**: importando
esse arquivo no Organic Maps (ou Google My Maps) ela vê todos os pontos num mapa e usa offline.

## Dicas
- `★` = destaque imperdível, `→` = deslocamento. Use os tipos `star` e `move` para isso.
- Para um dia de viagem entre cidades, use uma parada `transit: true` de 1 noite.
- Se a pessoa quiser ajustar, edite o `trip.json` e rode o render de novo.
