# Instruções para o Claude — montar um roteiro

Este repositório é um **gerador de roteiro de viagem**. Quando alguém abrir o projeto
no Claude e pedir algo como *"monta meu roteiro"* / *"me ajuda a planejar minha viagem"*,
siga este fluxo. O resultado é um HTML com **5 abas** (📅 Calendário, 🗒️ Roteiro,
🚆 Transportes, 📍 Lugares, 🗺️ Mapa) e **filtro por cidade** — quanto mais rica a
informação no `trip.json` (descrições, endereços, coordenadas, links), melhor ficam as abas.

## 1. Entreviste a pessoa (em português, ou no idioma dela)
Pergunte, de forma leve e uma coisa de cada vez:
- **Para onde vai?** (uma ou várias cidades)
- **Quando começa?** (data do 1º dia, formato AAAA-MM-DD)
- **Quantas noites em cada parada?**
- **O que não pode perder em cada lugar?** (destaques)
- **Quer registrar voos/trens?** (opcional: data, nº, origem→destino, horários)
- Ritmo (corrido x tranquilo), interesses (natureza, comida, história…) — para sugerir destaques

Se a pessoa não souber, **sugira** com base em conhecimento de viagem (e **pesquise na web**
para preencher endereços oficiais, links de ingresso e coordenadas), mas **nunca invente
dados pessoais** (nomes, documentos, código de reserva): pergunte.

## 2. Monte o `trip.json`
Escreva um `trip.json` seguindo o formato de **`trip.example.json`** (é o exemplo de referência).

### Nível da viagem
- `title` (obrigatório na prática), `startDate` (obrigatório, AAAA-MM-DD)
- `emoji`, `travelers`, `footer` — opcionais
- `maps`: `"google"` (padrão) ou `"osm"`. **Use `"osm"` para viagens à China continental**
  (lá o Google Maps é bloqueado e desloca as coordenadas). Para o resto do mundo, deixe Google.
- `stops`: lista de paradas na ordem da viagem (ver abaixo)
- `flights`: lista opcional `{ date, flightNo, from, to, dep, arr, note }` (aparece na aba Transportes)

### Parada (`stops[]`)
- `city` (texto), `nights` (número)
- `transit: true` para dias de voo/translado (cor cinza, fora da contagem de bases)
- `days`: lista, **um elemento por noite**. Cada elemento pode ser:
  - uma **lista de itens**, OU
  - um **objeto `{ "note": "...", "items": [...] }`** — onde `note` é a **visão geral do dia**
    (aparece em destaque na aba Roteiro). **Prefira o formato objeto** e escreva uma boa `note`
    por dia, é o que deixa a aba Roteiro completa.
- `highlights`: alternativa simples ao `days` (lista de itens distribuída pelos dias). Use `days`
  quando quiser controle dia a dia. `days` tem prioridade sobre `highlights`.

### Item (de um dia)
String vira bullet simples. Para algo rico, use objeto:
```jsonc
{
  "type": "star",                  // "star" (★ imperdível) | "move" (→ deslocamento) | "bullet"
  "text": "Muralha Mutianyu",
  "note": "Trecho menos turístico que Badaling; suba de teleférico e desça de toboggan.",
  "address": "Mutianyu Village, Huairou District, Beijing · 北京市怀柔区渤海镇慕田峪村",
  "url": "https://en.mutianyugreatwall.com/",   // página oficial/info — link no nome
  "tickets": "https://...",                       // comprar ingressos — vira ícone 🎟️
  "coords": [40.4319, 116.5704]                   // [lat, lon] WGS-84 — vira 📍 + ponto no mapa/KML
}
```
**Pesquise e preencha para os pontos principais:**
- `note`: 1-2 frases explicando o lugar (aparece na aba Roteiro). Escreva de verdade, é o ponto alto.
- `address`: **endereço oficial**. Em países de idioma local (China, Japão…), inclua a versão
  no idioma local também (ex.: `... · 北京市朝阳区酒仙桥路2-4号`) — útil para mostrar ao taxista.
- `url`: site oficial / página da atração / guia confiável.
- `tickets`: bilheteria oficial; para China, `trip.com` ou `klook` (use o link específico da atração).
- `coords`: **sempre WGS-84 (GPS real / OpenStreetMap)**. ⚠️ Na China não pegue do Google Maps:
  ele aplica o desvio GCJ-02 e as coordenadas saem ~centenas de metros erradas.

As datas dos dias são **calculadas automaticamente** a partir de `startDate` somando as noites.

## 3. Gere o HTML (e o KML)
```bash
node lib/render.mjs trip.json my-trip.html
```
Isso cria `my-trip.html` (responsivo no celular, imprime como PDF A4 paisagem) e, se houver
`coords`, também `my-trip.kml`. Diga para a pessoa:
- abrir `my-trip.html` no navegador e usar as 5 abas e o filtro por cidade;
- a aba **Mapa** precisa de internet (tiles do OpenStreetMap); as outras funcionam offline;
- importar o `my-trip.kml` no Organic Maps / Google My Maps para ver tudo num mapa offline
  (passo a passo em [`OFFLINE-MAPS.md`](OFFLINE-MAPS.md)).

> ⚠️ **Sempre regenere o `examples/.../*.html` commitado se você mexer no motor ou no exemplo** —
> o dono revisa abrindo o HTML, então o arquivo no repo precisa refletir o código atual.

## Dicas
- `★` = destaque imperdível, `→` = deslocamento. Use os tipos `star` e `move`.
- Para um dia de viagem entre cidades, use uma parada `transit: true` de 1 noite, com `note`
  explicando o trajeto.
- O filtro por cidade vale para as 5 abas; cada parada vira um badge automaticamente.
- Se a pessoa quiser ajustar, edite o `trip.json` e rode o render de novo.
