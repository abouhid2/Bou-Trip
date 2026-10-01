# Instruções para o Claude — montar um roteiro

Este repositório é um **gerador de roteiro de viagem**. Quando alguém abrir o projeto
no Claude e pedir algo como *"monta meu roteiro"* / *"me ajuda a planejar minha viagem"*,
siga este fluxo. O resultado é um HTML com até **8 abas** (☀️ Hoje, 📅 Calendário, 🗒️ Roteiro,
🚆 Transportes, 📍 Lugares, 🛏️ Hospedagem, 🍽️ Restaurantes, 🗺️ Mapa) e **filtro por cidade** — quanto mais rica a
informação no `trip.json` (descrições, endereços, coordenadas, links), melhor ficam as abas.
A aba Hospedagem só aparece se houver `stays`; a aba Restaurantes, só se houver `dining`.
A aba **Hoje** abre por padrão: o dia da viagem pela data do aparelho (antes da viagem, o 1º dia com
contagem regressiva), com "agora"/"a seguir" pelos horários (`time`) e o hotel da noite com botão
"mostrar ao taxista" (usa a parte em escrita local do `address`). No celular as abas viram uma barra embaixo.

## 1. Entreviste a pessoa (em português, ou no idioma dela)
Pergunte, de forma leve e uma coisa de cada vez:
- **Em que idioma?** (vira `lang`). O HTML **sempre tem inglês + o idioma escolhido**, com um
  toggle. Escreva todo o conteúdo nos **dois idiomas** (ver formato bilíngue abaixo).
- **Para onde vai?** (uma ou várias cidades)
- **Quando começa?** (data do 1º dia, formato AAAA-MM-DD)
- **Quantas noites em cada parada?**
- **O que não pode perder em cada lugar?** (destaques)
- **Quer registrar voos/trens?** (opcional: data, nº, origem→destino, horários)
- **Já tem hospedagem reservada?** Se sim, peça os dados da reserva e monte `stays` (ver abaixo).
  Se ainda não, siga sem — a aba não aparece e nada quebra.
- Ritmo (corrido x tranquilo), interesses (natureza, comida, história…) — para sugerir destaques

### Quanto enriquecer? Pergunte antes (economiza tokens)
O **custo em tokens não está no HTML** — está na **pesquisa web** que eu faço para preencher
cada extra. Logo no começo, ofereça as opções **à la carte** e marque só o que a pessoa quer.
Quanto menos extras, mais barato e rápido (bom para quem está no plano grátis):

- **Base** (sempre incluso, ~zero pesquisa): calendário, roteiro com a `note` de cada dia,
  transportes e filtro por cidade. Já entrega um roteiro completo e legível.
- **📍 Mapa & endereços** (`coords` + `address`): pontos no mapa/KML e endereços clicáveis.
  Exige pesquisar coordenadas WGS-84 e endereços oficiais.
- **🎟️ Ingressos & links** (`url` + `tickets`): link no nome e ícone de bilheteria.
- **🖼️ Fotos** (`image`): uma foto por ponto principal. Exige buscar URLs de imagem estáveis.
- **📝 Notas ricas** (`note` por item): 1-2 frases explicando cada lugar, além da visão do dia.
- **🛏️ Hospedagem** (`stays`): os dados saem dos e-mails de reserva da pessoa, então custa
  ~zero pesquisa — só as `coords` do hotel exigem uma busca. Ofereça sempre que houver reserva.
- **🚉 Estações** (`from`/`to` com `coords`): onde pegar cada trem/voo. Uma busca por estação.
- **🍽️ Restaurantes** (`dining`): 3 sugestões por cidade (alta gastronomia · meio-termo · local
  e barato). Exige pesquisa por cidade — é o extra mais caro em tokens, então ofereça e confirme
  antes. Para viagens longas rende montar um **subagente especialista em restaurantes** que
  pesquisa cidade a cidade (ver [`EXPERTS.md`](EXPERTS.md)).

Se a pessoa não opinar, use o default **Base + Mapa & endereços + Notas ricas** (o que mais
agrega sem explodir o gasto); **Fotos** e **Ingressos** só quando pedir.

Se a pessoa não souber o conteúdo, **sugira** com base em conhecimento de viagem (e **pesquise na
web** apenas para os extras escolhidos acima), mas **nunca invente dados pessoais** (nomes,
documentos, código de reserva): pergunte.

### Quer um time de especialistas? (ofereça — não imponha)
Para viagens **longas ou com muitas cidades**, montar um **subagente por cidade** rende um roteiro
bem melhor do que um agente só tentando lembrar de tudo. Ofereça assim, uma vez, no começo:

> *"Posso montar um time: um especialista por cidade, mais um de transportes e um de hospedagem.
> Eles debatem entre si e discordam de mim quando eu erro — o roteiro sai bem mais afiado, mas
> cada rodada de consulta custa tokens. Quer?"*

**Só monte se a pessoa disser sim** — e depois **confirme cada rodada antes de disparar**
(mostre o que vai perguntar; cada tanda multiplica o custo pelo número de agentes).
Se ela recusar, ou se a viagem tiver 1-2 cidades, faça sozinho: não vale o gasto.
O padrão completo (papéis e regras que se provaram) está em **[`EXPERTS.md`](EXPERTS.md)**.

## 2. Monte o `trip.json`
Escreva um `trip.json` seguindo o formato de **`trip.example.json`** (é o exemplo de referência).

### Idioma (i18n)
- `lang`: código do idioma principal (ex.: `"pt"`, `"es"`, `"fr"`, `"de"`, `"it"`). Inglês (`"en"`)
  é **sempre** a alternativa do toggle. Se `lang` for `"en"` ou ausente, não há toggle.
- **Qualquer texto pode ser bilíngue**: em vez de `"texto"`, use `{ "en": "...", "<lang>": "..." }`.
  Vale para `title`, `travelers`, `footer`, `city`, a `note` do dia, e `text`/`note` dos itens.
  Strings simples aparecem igual nos dois idiomas (bom para nomes próprios e `address`).
- A UI (abas, botões, dias da semana) já é traduzida para en/pt/es/fr/de/it (outros caem em inglês).
- **Sempre escreva o conteúdo nos dois idiomas** (en + lang) — é o que faz o toggle valer a pena.

### Nível da viagem
- `title` (obrigatório na prática), `startDate` (obrigatório, AAAA-MM-DD)
- `emoji`, `travelers`, `footer` — opcionais
- `maps`: `"google"` (padrão) ou `"osm"`. **Use `"osm"` para viagens à China continental**
  (lá o Google Maps é bloqueado e desloca as coordenadas). Para o resto do mundo, deixe Google.
- `stops`: lista de paradas na ordem da viagem (ver abaixo)
- `flights`: lista opcional `{ date, flightNo, from, to, dep, arr, note }` (aparece na aba Transportes)
- `stays`: lista opcional de reservas (ver abaixo) — cria a aba 🛏️ Hospedagem
- `dining`: lista opcional de restaurantes (ver abaixo) — cria a aba 🍽️ Restaurantes

### Hospedagem (`stays[]`) — opcional
Onde a pessoa despeja os dados da reserva. Só `name` é essencial; **o que faltar simplesmente
não aparece** no card, então não invente nada para preencher.
```jsonc
{
  "city": { "en": "Beijing", "pt": "Pequim" },  // precisa casar com a "city" de uma parada p/ entrar no filtro
  "name": "Lezai Hotel",
  "checkIn": "2026-10-13",                       // AAAA-MM-DD — as noites são calculadas
  "checkOut": "2026-10-17",
  "address": "... · 北京市东城区",                 // clicável; inclua a versão no idioma local
  "coords": [39.9345, 116.4021],                 // 🛏️ ponto próprio no mapa/KML
  "confirmation": "ABC-123",                     // ⚠️ NUNCA invente — só se a pessoa der
  "price": "¥520/noite",
  "phone": "+86 10 1234 5678",                   // vira link de ligar
  "url": "https://...",
  "image": "https://...",
  "note": { "en": "Late check-in ok", "pt": "Check-in tardio ok" }
}
```
- **`city` é o que liga a reserva ao filtro.** Se não casar com nenhuma parada, o card aparece
  em qualquer filtro (não some) — mas o certo é casar.
- `confirmation`, `price` e `phone` são **dados pessoais**: pergunte, nunca pesquise nem deduza.

### Restaurantes (`dining[]`) — opcional
Três sugestões por cidade, uma de cada faixa. Só `name` e `tier` são essenciais; **o que faltar
não aparece** no card. Agrupa por cidade (na ordem do roteiro) e, dentro da cidade, ordena as
faixas de `fine` → `mid` → `local`.
```jsonc
{
  "city": { "en": "Beijing", "pt": "Pequim" },  // casa com a "city" de uma parada p/ entrar no filtro
  "tier": "fine",                                // "fine" (alta gastronomia) | "mid" (meio-termo) | "local" (barato)
  "name": "Da Dong 大董",                         // romanizado + nome local
  "cuisine": { "en": "Peking duck", "pt": "Pato laqueado" },
  "note": { "en": "...", "pt": "..." },          // 1 frase de por que vale
  "address": "... · 北京市东城区",                 // clicável; inclua a versão no idioma local
  "price": "¥400+/pessoa",                        // faixa por pessoa
  "coords": [39.9146, 116.4177],                 // 🍽️ ponto próprio no mapa/KML — WGS-84, nunca do Google na China
  "url": "https://..."                            // site/reserva; vira link no nome
}
```
- **Nunca invente.** Pesquise; se não achar uma faixa numa cidade, deixe-a de fora em vez de inventar.
- Faixas por cidade: `fine` = Michelin/muito chique, `mid` = bom custo-benefício, `local` = onde o local come.

### Estações e aeroportos no mapa
`from`/`to` — de um voo em `flights` **ou** de um item `type: "move"` — aceitam texto simples
**ou** um objeto com coordenadas. Com coordenadas, a estação/aeroporto vira 🚉 no mapa e no KML:
```jsonc
{
  "type": "move",
  "text": "Trem G8 Hongqiao → Pequim Sul",
  "time": "08:00→12:26",
  "from": { "name": "Shanghai Hongqiao", "coords": [31.1943, 121.3200] },
  "to":   { "name": "Beijing South",     "coords": [39.8654, 116.3786] }
}
```
A mesma estação usada em vários trajetos vira **um ponto só**, acendendo em todos os dias em
que é usada. Vale a mesma regra de sempre: **WGS-84 / OpenStreetMap, nunca do Google Maps na
China.** Para estação chinesa, busque pelo nome local (`芙蓉镇站`) — o nome ocidental costuma
não achar nada. Confira que o resultado é `railway=station` e não a cidade homônima.

A aba Mapa tem **filtro por dia** além do filtro por cidade. Ele sai de graça das datas que já
existem: cada ponto sabe em que dia(s) aparece, e uma reserva acende em todas as suas noites.

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
  "image": "https://commons.wikimedia.org/wiki/Special:FilePath/The_Great_Wall_of_China_at_Jinshanling-edit.jpg?width=600", // foto (Roteiro/Lugares)
  "coords": [40.4319, 116.5704]                   // [lat, lon] WGS-84 — vira 📍 + ponto no mapa/KML
}
```
**Pesquise e preencha para os pontos principais:**
- `note`: 1-2 frases explicando o lugar (aparece na aba Roteiro). Escreva de verdade, é o ponto alto.
- `address`: **endereço oficial**. Em países de idioma local (China, Japão…), inclua a versão
  no idioma local também (ex.: `... · 北京市朝阳区酒仙桥路2-4号`) — útil para mostrar ao taxista.
- `url`: site oficial / página da atração / guia confiável.
- `tickets`: bilheteria oficial; para China, `trip.com` ou `klook` (use o link específico da atração).
- `image`: **URL de foto estável** — prefira **Wikimedia Commons** via
  `https://commons.wikimedia.org/wiki/Special:FilePath/<Nome_do_arquivo>.jpg?width=600` (aceita
  hotlink, não quebra). Aparece nas abas Roteiro e Lugares; carrega com internet e **some sozinha
  se a URL falhar**. **Confirme que a URL existe antes de usar** (ex.: `curl -sIL` deve dar 200 + `image/...`).
- `coords`: **sempre WGS-84 (GPS real / OpenStreetMap)**. ⚠️ Na China não pegue do Google Maps:
  ele aplica o desvio GCJ-02 e as coordenadas saem ~centenas de metros erradas.

### Decisões, opcionais e avisos
Para a pessoa decidir **durante a viagem**, não escreva "PLANO A/B" ou "opcional" no texto:
- **Decisão**: um item `{ "type": "choice", "id": "beijing-wall", "period": "morning", "text": "Qual trecho?",
  "options": [{ "label": "...", "note": "...", "items": [...] }, ...] }`. Vira um card com botões; a
  escolha fica salva no aparelho e esconde as outras opções em todas as abas e no mapa. `id` estável
  (é a chave salva). Um topo "N decisões em aberto" leva até a primeira sem escolha.
- **Opcional**: `"optional": true` num item. Ganha selo e botão "Pular", também salvo no aparelho.
- **Aviso**: `"type": "warn"` para "confirmar antes de comprar" e afins (destaque âmbar).

### O que falta comprar (`toBuy[]`) — opcional
Cria a aba 🎟️ **Comprar** e um atalho "N compras pendentes" no topo do Hoje. Para o que só vende perto
da data (trem na China: 15 dias antes; Cidade Proibida: 7). "Já comprei" fica salvo no aparelho.
```jsonc
{
  "id": "train-zjj-furong",             // estável: é a chave salva
  "date": "2026-10-18",                 // dia de uso
  "opens": "2026-10-04",                // quando a venda abre; sem ele = já à venda
  "what":   { "en": "...", "pt": "Trem Zhangjiajie Oeste → Furongzhen" },
  "where":  { "en": "...", "pt": "12306 ou Trip.com, com o passaporte" },
  "detail": { "en": "...", "pt": "De: Zhangjiajie OESTE (张家界西站), não a antiga..." }, // quebras de linha viram linhas
  "url": "https://..."
}
```
Ponha no `detail` o que costuma dar errado na hora: **qual estação** (nome local), qual portão, qual pacote.

As datas dos dias são **calculadas automaticamente** a partir de `startDate` somando as noites.

## 3. Gere o HTML (e o KML)
```bash
node lib/render.mjs trip.json my-trip.html
```
Isso cria `my-trip.html` (responsivo no celular, imprime como PDF A4 paisagem) e, se houver
`coords`, também `my-trip.kml`. Diga para a pessoa:
- abrir `my-trip.html` no navegador e usar as 5 abas e o filtro por cidade;
- a aba **Mapa** e as **fotos** (`image`) precisam de internet; o resto (calendário, roteiro,
  transportes, lugares sem foto) funciona offline;
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
