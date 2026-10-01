// =====================================================================
// render.mjs — motor de geração do roteiro visual (sem dependências de build)
//
// Uso como CLI:   node lib/render.mjs <trip.json> [saida.html]
// Uso como módulo: import { renderTripHtml, buildKml } from "./lib/render.mjs"
//
// 5 abas (Calendário/Roteiro/Transportes/Lugares/Mapa), filtro por cidade,
// toggle de idioma (inglês + idioma da viagem) e tema claro/escuro.
// Self-contained; as abas de conteúdo funcionam offline, a aba Mapa usa
// tiles do OpenStreetMap.
//
// i18n: defina trip.lang (ex.: "pt"). Inglês ("en") é sempre a alternativa.
// Qualquer texto pode ser bilíngue: { "en": "...", "pt": "..." }.
// =====================================================================

import { readFileSync, writeFileSync } from "node:fs";

import { CLIENT_SCRIPT } from "./client.mjs";
import { LANG_LABEL, PERIODS, PERIOD_ICON, TIER_ORDER, UI, isBi, mapToolStr, periodStr, tierStr, tx, uiStr } from "./i18n.mjs";
import { CITY_PALETTE, TRANSIT_COLOR, buildCss } from "./theme.mjs";

// Ícones do toggle de tema em SVG (currentColor) em vez de emoji: emoji vem
// sempre colorido e destoa da paleta grafite.
const THEME_ICONS = `<svg class="ico ico-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg><svg class="ico ico-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;

// Chave de filtro compartilhada por todas as paradas de translado. O \u0000 e o
// que garante que nenhuma cidade real colida com ela. Escrito escapado de
// proposito: um NUL cru aqui faz o git tratar este arquivo como binario, e o
// motor inteiro passa a subir sem diff nenhum.
const TRANSIT_KEY = "\u0000transit";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const mondayIndex = (date) => (date.getUTCDay() + 6) % 7;
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const dd = (d) => String(d.getUTCDate()).padStart(2, "0");
const mm = (d) => String(d.getUTCMonth() + 1).padStart(2, "0");
const isoDate = (d) => `${d.getUTCFullYear()}-${mm(d)}-${dd(d)}`;

// Chave de cidade: o inglês manda, porque é o único idioma que todo roteiro tem.
const cityKeyOf = (city) => tx(city, "en") || tx(city, "pt") || String(city);

// "from"/"to" de um trajeto. Aceita texto (simples ou bilíngue) e também
// { name, coords } quando se quer a estação/aeroporto no mapa. O que distingue
// os dois é "name"/"coords" — um objeto bilíngue só tem chaves de idioma.
function normPlace(v) {
  if (!v) return null;
  if (isBi(v) && ("name" in v || "coords" in v)) {
    return { label: v.name ?? "", coords: Array.isArray(v.coords) ? v.coords : null, address: v.address ?? null };
  }
  return { label: v, coords: null, address: null };
}

// Texto de um valor em todos os idiomas de uma vez, para casar palavra-chave
// sem depender de qual idioma o autor usou.
const allText = (v) => (isBi(v) ? Object.values(v).join(" ") : String(v ?? ""));

function normItem(it) {
  if (typeof it === "string") return { type: "bullet", text: it };
  // objeto bilíngue puro (sem campos estruturados) = bullet com esse texto
  if (isBi(it) && !("text" in it) && !("type" in it) && !("items" in it)) {
    return { type: "bullet", text: it };
  }
  return {
    type: it.type || "bullet",
    icon: it.icon ? tx(it.icon, "en") : null,
    from: normPlace(it.from),
    to: normPlace(it.to),
    period: PERIODS.includes(it.period) ? it.period : null,
    // horário livre ("09:15", "~19:30", "10:07→15:20"). Não traduz.
    time: it.time ? String(tx(it.time, "en") || it.time) : null,
    text: it.text ?? "",
    note: it.note ?? null,
    address: it.address ?? null,
    url: tx(it.url, "en") || null, // url não traduz
    tickets: tx(it.tickets, "en") || null,
    image: it.image ? tx(it.image, "en") : null, // foto (URL) — não traduz
    map: it.map || null,
    coords: Array.isArray(it.coords) ? it.coords : null,
  };
}

// Uma reserva. Tudo é opcional menos o nome: a ideia é a pessoa despejar aqui o
// que o e-mail de confirmação tem, e o que faltar simplesmente não aparece.
function normStay(s) {
  return {
    city: s.city ?? "",
    name: s.name ?? "",
    checkIn: tx(s.checkIn, "en") || null,
    checkOut: tx(s.checkOut, "en") || null,
    address: s.address ?? null,
    coords: Array.isArray(s.coords) ? s.coords : null,
    url: tx(s.url, "en") || null,
    phone: tx(s.phone, "en") || null,
    confirmation: tx(s.confirmation, "en") || null,
    price: s.price ?? null,
    note: s.note ?? null,
    image: s.image ? tx(s.image, "en") : null,
  };
}

// Uma sugestão de restaurante. Só o nome é essencial; cada faixa (fine/mid/local)
// vira uma seção dentro da cidade. O que faltar simplesmente não aparece.
function normDining(d) {
  return {
    city: d.city ?? "",
    tier: TIER_ORDER.includes(d.tier) ? d.tier : "mid",
    name: d.name ?? "",
    cuisine: d.cuisine ?? null,
    note: d.note ?? null,
    address: d.address ?? null,
    price: d.price ?? null,
    coords: Array.isArray(d.coords) ? d.coords : null,
    url: tx(d.url, "en") || null,
  };
}

// Ícone por modal. "icon" explícito no item vence; senão infere pelo texto (em
// qualquer idioma, porque o item pode nomear o modal só num deles).
// Ordem importa: "trem-bala" casa antes de "balsa"; voo antes de tudo porque um
// código como BA0169 é o sinal mais forte que existe.
const MODE_ICONS = [
  [/(\bvoo\b|\bflight\b|avi[ãa]o|\bplane\b|airport|aeroporto|\b[A-Z]{2}\d{2,4}\b)/i, "✈️"],
  [/(\btrem\b|\btrain\b|trem-bala|bullet|high-speed|alta velocidade|\b[GDZKT]\d{1,4}\b)/i, "🚆"],
  [/(telef[ée]rico|cable car|chairlift|gondola|bailong)/i, "🚡"],
  [/(metr[ôo]\b|\bmetro\b|subway|linha \d|line \d)/i, "🚇"],
  [/(t[áa]xi|\btaxi\b|didi|\bcarro\b|\bcar\b|transfer)/i, "🚕"],
  [/([ôo]nibus|\bbus\b|shuttle|\bvan\b)/i, "🚌"],
  [/(balsa|barco|\bboat\b|\braft\b|cruzeiro|cruise|ferry|maglev)/i, "⛵"],
  [/(a p[ée]\b|\bwalk\b|caminhada|caminhando)/i, "🚶"],
];

function modeIcon(it) {
  if (it.icon) return it.icon;
  const hay = `${allText(it.text)} ${allText(it.note)}`;
  for (const [re, ico] of MODE_ICONS) if (re.test(hay)) return ico;
  return "🧭";
}

const osmLink = ([lat, lon]) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
const googleLink = ([lat, lon]) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const mapLinkFor = (coords, provider) => (provider === "osm" ? osmLink(coords) : googleLink(coords));

export function buildDays(trip) {
  if (!trip.startDate) throw new Error("trip.startDate é obrigatório (formato AAAA-MM-DD)");
  if (!Array.isArray(trip.stops) || !trip.stops.length) throw new Error("trip.stops precisa de pelo menos uma parada");

  const start = parseDate(trip.startDate);
  const cities = [];
  const cells = [];
  let offset = 0;

  // Cor por cidade, não por parada: quem volta pra mesma cidade tem que
  // reencontrar a mesma cor, senão a segunda estada parece outro lugar.
  const cityColors = new Map();
  const colorFor = (cityKey) => {
    if (!cityColors.has(cityKey)) cityColors.set(cityKey, CITY_PALETTE[cityColors.size % CITY_PALETTE.length]);
    return cityColors.get(cityKey);
  };

  trip.stops.forEach((stop) => {
    const nights = Math.max(1, Number(stop.nights) || 1);
    const isTransit = !!stop.transit;
    const cityKey = cityKeyOf(stop.city);
    const color = stop.color || (isTransit ? TRANSIT_COLOR : colorFor(cityKey));
    cities.push({ raw: stop.city, key: cityKey, color, nights, transit: isTransit });

    const highlights = (stop.highlights || []).map(normItem);

    for (let i = 0; i < nights; i++) {
      const date = addDays(start, offset++);
      let items = [];
      let dayNote = null;

      const entry = Array.isArray(stop.days) ? stop.days[i] : undefined;
      if (Array.isArray(entry)) {
        items = entry.map(normItem);
      } else if (entry && typeof entry === "object" && entry.items) {
        items = (entry.items || []).map(normItem);
        dayNote = entry.note || null;
      } else if (highlights.length) {
        const mine = highlights.filter((_, hi) => hi % nights === i);
        items.push(...(mine.length ? mine : [{ type: "bullet", text: { en: `Free time in ${cityKey}`, pt: `Tempo livre em ${cityKey}` } }]));
      } else {
        items.push({ type: "bullet", text: { en: `Explore ${cityKey}`, pt: `Explorar ${cityKey}` } });
      }

      const suffix = nights > 1 && !isTransit ? ` · n${i + 1}` : "";
      cells.push({ date, cityRaw: stop.city, cityKey, suffix, color, items, transit: isTransit, note: dayNote });
    }
  });

  // Índice do filtro. A chave é a cidade, não a parada: quem visita Shanghai
  // duas vezes tem um índice só, então filtrar Shanghai traz as duas estadas.
  // Todos os dias de translado caem num índice único (um segmento no rail).
  const nameIdx = new Map();
  cities.forEach((c) => {
    const key = c.transit ? TRANSIT_KEY : c.key;
    if (!nameIdx.has(key)) nameIdx.set(key, nameIdx.size);
  });
  const idxOf = (c) => nameIdx.get(c.transit ? TRANSIT_KEY : (c.cityKey ?? c.key));

  return { cities, cells, nameIdx, idxOf, start, end: addDays(start, offset - 1) };
}

// Todos os pontos do mapa, numa lista só, em três tipos:
//   place   — item de um dia (o que sempre existiu)
//   stay    — reserva de trip.stays
//   station — estação/aeroporto vindo do "from"/"to" de um trajeto
// HTML e KML leem daqui, para os dois nunca discordarem sobre o que é ponto.
function collectMarkers(trip, { cells, nameIdx, idxOf }, provider) {
  const out = [];
  const seen = new Map();
  const push = (m) => {
    // A mesma estação aparece em vários trajetos (Hongqiao na ida e na volta):
    // um ponto só, mas acumulando os dias — senão o filtro por dia perderia a
    // segunda passagem, que foi descartada no dedup.
    const key = `${m.kind}:${m.lat},${m.lon}`;
    const hit = seen.get(key);
    if (hit) {
      // days null = ponto sem data conhecida, vale sempre; fundir com qualquer
      // coisa mantém o "vale sempre", que é o lado seguro.
      if (hit.days && m.days) { for (const d of m.days) if (!hit.days.includes(d)) hit.days.push(d); }
      else hit.days = null;
      return;
    }
    seen.set(key, m);
    out.push(m);
  };
  const at = (coords) => ({ lat: coords[0], lon: coords[1], map: mapLinkFor(coords, provider) });
  const ok = (c) => Array.isArray(c) && c.length === 2;

  for (const c of cells) {
    const idx = idxOf(c);
    const day = isoDate(c.date);
    for (const it of c.items) {
      if (ok(it.coords)) {
        push({ kind: "place", ...at(it.coords), name: it.text, idx, days: [day], city: c.cityRaw, color: c.color, url: it.url || null, tickets: it.tickets || null, map: it.map || at(it.coords).map, address: it.address || null });
      }
      if (it.type !== "move") continue;
      for (const p of [it.from, it.to]) {
        if (p && ok(p.coords)) push({ kind: "station", ...at(p.coords), name: p.label, idx, days: [day], city: c.cityRaw, color: c.color, icon: modeIcon(it), address: p.address || null });
      }
    }
  }

  // estações dos voos declarados em trip.flights (casa a data com o dia p/ herdar cor e filtro)
  const cellByDate = new Map(cells.map((c) => [isoDate(c.date), c]));
  for (const f of (trip.flights || [])) {
    const c = cellByDate.get(tx(f.date, "en"));
    if (!c) continue;
    for (const p of [normPlace(f.from), normPlace(f.to)]) {
      if (p && ok(p.coords)) push({ kind: "station", ...at(p.coords), name: p.label, idx: idxOf(c), days: [isoDate(c.date)], city: c.cityRaw, color: c.color, icon: "✈️", address: p.address || null });
    }
  }

  // Hospedagem: herda o filtro da cidade da reserva; cidade desconhecida fica
  // sem data-idx (aparece sempre) em vez de sumir num filtro que não a conhece.
  // Uma reserva vale por todas as noites dela, então acende em cada um desses
  // dias — é a única coisa no mapa que dura mais de um dia.
  const allDays = cells.map((c) => isoDate(c.date));
  for (const s of (trip.stays || []).map(normStay)) {
    if (!ok(s.coords)) continue;
    const nights = s.checkIn && s.checkOut ? allDays.filter((d) => d >= s.checkIn && d < s.checkOut) : null;
    push({ kind: "stay", ...at(s.coords), name: s.name, idx: nameIdx.get(cityKeyOf(s.city)), days: nights, city: s.city, color: null, url: s.url, address: s.address, icon: "🛏️" });
  }

  // Restaurantes: herdam o filtro da cidade e valem para qualquer dia (não têm
  // data), como uma reserva sem check-in. Cidade fora do roteiro fica sem idx.
  for (const d of (trip.dining || []).map(normDining)) {
    if (!ok(d.coords)) continue;
    push({ kind: "food", ...at(d.coords), name: d.name, idx: nameIdx.get(cityKeyOf(d.city)), days: null, city: d.city, color: null, url: d.url, address: d.address, icon: "🍽️", cuisine: d.cuisine, note: d.note, price: d.price });
  }

  return out;
}

export function renderTripHtml(trip) {
  const days = buildDays(trip);
  const { cities, cells, nameIdx, idxOf } = days;
  const provider = trip.maps === "osm" ? "osm" : "google";
  const PRIMARY = trip.lang ? String(trip.lang) : "en";
  const LANGS = PRIMARY === "en" ? ["en"] : ["en", PRIMARY];
  const multi = LANGS.length > 1;
  const stays = (trip.stays || []).map(normStay);
  const dining = (trip.dining || []).map(normDining);

  // ----- helpers de render bilíngue -----
  const span = (l, t) => `<span data-l="${l}">${esc(t)}</span>`;
  const bi = (v) => (isBi(v) ? LANGS.map((l) => span(l, tx(v, l))).join("") : esc(v));
  const uiBi = (key) => LANGS.map((l) => span(l, uiStr(l, key))).join("");
  const mtBi = (key) => LANGS.map((l) => span(l, mapToolStr(l, key))).join("");
  const dateChip = (date) => LANGS.map((l) => { const U = UI[l] || UI.en; return span(l, `${U.mon[date.getUTCMonth()]} · ${U.wd[mondayIndex(date)]}`); }).join("");
  const dateLine = (date) => LANGS.map((l) => { const U = UI[l] || UI.en; return span(l, `${dd(date)}/${mm(date)} ${U.wd[mondayIndex(date)]}`); }).join("");
  // dicionário mínimo entregue ao script do navegador (rótulos criados em runtime)
  const clientI18n = {
    today: Object.fromEntries(LANGS.map((l) => [l, uiStr(l, "today")])),
    mapApp: "📱 " + uiStr(PRIMARY, "mapApp"),
    allDays: Object.fromEntries(LANGS.map((l) => [l, uiStr(l, "allDays")])),
  };

  // Dias na ordem da viagem, para o seletor de dia do mapa. O rótulo já vem
  // pronto nos dois idiomas — o cliente não formata data.
  const dayList = cells.map((c) => ({
    d: isoDate(c.date),
    l: Object.fromEntries(LANGS.map((lg) => [lg, `${dd(c.date)}/${mm(c.date)} ${(UI[lg] || UI.en).wd[mondayIndex(c.date)]} · ${tx(c.cityRaw, lg)}${c.suffix || ""}`])),
  }));

  function itemInner(it) {
    const clock = it.time ? `<span class="t">${esc(it.time)}</span>` : "";
    const main = clock + (it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${bi(it.text)}</a>` : bi(it.text));
    let extra = "";
    if (it.tickets) extra += ` <a class="lk" href="${esc(it.tickets)}" target="_blank" rel="noopener" aria-label="tickets">🎟️</a>`;
    const mapHref = it.map || (it.coords ? mapLinkFor(it.coords, provider) : null);
    if (mapHref) extra += ` <a class="lk" href="${esc(mapHref)}" target="_blank" rel="noopener" aria-label="map">📍</a>`;
    return main + extra;
  }

  // foto do ponto (hotlink, lazy) — some sozinha se a URL falhar; precisa de internet
  const photo = (it, cls) => (it.image
    ? `<img class="${cls}" src="${esc(it.image)}" alt="${esc(tx(it.text, PRIMARY))}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "");

  // nome de uma ponta de trajeto — aceita texto ou { name, coords }
  const plc = (v) => { const p = normPlace(v); return p ? bi(p.label) : ""; };

  // endereço clicável → abre no Google Maps (busca pelo endereço)
  const addrLink = (address, cls) => (address
    ? `<div class="${cls}"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tx(address, PRIMARY))}" target="_blank" rel="noopener">📍 ${bi(address)}</a></div>`
    : "");

  // ----- markers do mapa -----
  const markers = collectMarkers(trip, days, provider);
  const hasMap = markers.length > 0;
  const markerKinds = new Set(markers.map((m) => m.kind));
  const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const kmlStr = hasMap ? (buildKml(trip) || "") : ""; // KML embutido p/ baixar offline

  // ----- componentes -----
  // Rail = trilha da viagem: uma parada = um segmento, na ordem real. Quem volta
  // pra mesma cidade aparece duas vezes, e os dois segmentos acendem juntos ao
  // clicar porque dividem o data-idx da cidade. Largura uniforme: a contagem de
  // noites vive no rótulo "4n", não no tamanho (largura por noites nunca chegou
  // a ser legível — o nome dominava — então saiu junto com o --grow).
  const seg = (cls, color, idx, label, count) => `<button class="seg ${cls}" data-idx="${idx}" aria-pressed="false" style="--city:${color}">
        <span class="seg-bar"></span><span class="seg-name">${label}</span><span class="seg-n">${count}</span>
      </button>`;

  const journeyRail = () => {
    const out = [`<button class="seg all" aria-pressed="true"><span class="seg-bar"></span><span class="seg-name">${uiBi("showAll")}</span><span class="seg-n">${cells.length}d</span></button>`];
    for (const c of cities) {
      if (c.transit) continue;
      out.push(seg("city", c.color, nameIdx.get(c.key), bi(c.raw), `${c.nights}n`));
    }
    // translados: um segmento só para todos eles, senão nomes longos ("Shanghai →
    // Pequim") dominam o rail e as cidades encolhem.
    const transitDays = cities.filter((c) => c.transit).reduce((a, c) => a + c.nights, 0);
    if (transitDays) {
      out.push(seg("city transit", TRANSIT_COLOR, nameIdx.get(TRANSIT_KEY), `→ ${uiBi("transfers")}`, `${transitDays}d`));
    }
    return out.join("\n      ");
  };

  const liClass = (it) => (it.type === "star" ? ' class="star"' : it.type === "move" ? ' class="move"' : "");

  // Rótulo bilíngue de um período ("Manhã"/"Morning"), com o ícone à frente.
  const periodBi = (p) => `<span class="pd-ico" aria-hidden="true">${PERIOD_ICON[p]}</span>${LANGS.map((l) => span(l, periodStr(l, p))).join("")}`;

  // Agrupa os itens de um dia em manhã/tarde/noite. Itens sem "period" caem num
  // grupo sem cabeçalho, renderizado primeiro: roteiros antigos seguem válidos.
  const byPeriod = (items) => {
    const loose = items.filter((it) => !it.period);
    const groups = PERIODS.map((p) => [p, items.filter((it) => it.period === p)]).filter(([, its]) => its.length);
    return { loose, groups };
  };

  // Monta a lista de um dia, com ou sem divisão por período.
  const periodList = (items, ulCls, renderLi) => {
    const { loose, groups } = byPeriod(items);
    if (!groups.length) return `<ul class="${ulCls}">${loose.map(renderLi).join("")}</ul>`;
    const head = loose.length ? `<ul class="${ulCls}">${loose.map(renderLi).join("")}</ul>` : "";
    return head + groups.map(([p, its]) =>
      `<div class="pd pd-${p}"><div class="pd-head">${periodBi(p)}</div><ul class="${ulCls}">${its.map(renderLi).join("")}</ul></div>`
    ).join("");
  };

  const dayCard = (c) => {
    const idx = idxOf(c);
    const col = mondayIndex(c.date) + 1;
    const body = periodList(c.items, "", (it) => `<li${liClass(it)}>${itemInner(it)}</li>`);
    return `<div class="day" data-idx="${idx}" data-date="${isoDate(c.date)}" style="--c:${col};--city:${c.color}">
      <div class="cell-top"><span class="date">${dd(c.date)}</span><span class="wknum">${dateChip(c.date)}</span></div>
      <div class="cell-city">${bi(c.cityRaw)}${c.suffix}</div>
      <div class="cell-body">${body}</div>
    </div>`;
  };

  // Faixa de conexão entre etapas: quando a cidade muda, mostra COMO se vai de
  // uma para a outra, antes do primeiro dia da nova cidade. Resume os moves do
  // dia de chegada — o roteiro passa a se ler como etapa → trajeto → etapa.
  const legBand = (prev, c) => {
    if (!prev || prev.cityKey === c.cityKey) return "";
    const moves = c.items.filter((it) => it.type === "move");
    const flights = (trip.flights || []).filter((f) => tx(f.date, "en") === isoDate(c.date));
    if (!moves.length && !flights.length) return "";
    const bits = [
      ...flights.map((f) => `${"✈️"} <span class="t">${esc([f.dep, f.arr].filter(Boolean).map((v) => tx(v, "en")).join(" → "))}</span>${[f.flightNo ? bi(f.flightNo) : "", ...[f.from, f.to].filter(Boolean).map(plc)].filter(Boolean).join(" · ")}`),
      ...moves.map((it) => `${modeIcon(it)} ${it.time ? `<span class="t">${esc(it.time)}</span>` : ""}${bi(it.text)}`),
    ];
    return `<div class="rt-leg" data-idx="${idxOf(c)}"><span class="rt-leg-from">${bi(prev.cityRaw)}</span><span class="rt-leg-arrow">→</span><span class="rt-leg-to">${bi(c.cityRaw)}</span><div class="rt-leg-body">${bits.map((b) => `<div>${b}</div>`).join("")}</div></div>`;
  };

  const roteiroPanel = () => cells.map((c, i) => {
    const idx = idxOf(c);
    const band = legBand(cells[i - 1], c);
    const head = `<div class="rt-head"><span class="rt-date">${dateLine(c.date)}</span><span class="rt-city">${bi(c.cityRaw)}${c.suffix}</span></div>`;
    const note = c.note ? `<p class="rt-note">${bi(c.note)}</p>` : "";
    const body = periodList(c.items, "rt-items", (it) => {
      const a = addrLink(it.address, "rt-addr");
      const n = it.note ? `<div class="rt-itemnote">${bi(it.note)}</div>` : "";
      return `<li${liClass(it)}>${itemInner(it)}${a}${n}${photo(it, "rt-img")}</li>`;
    });
    return `${band}<div class="rt-day" data-idx="${idx}" style="--city:${c.color}">${head}${note}${body}</div>`;
  }).join("\n    ") || `<p class="empty-msg">—</p>`;

  // Transportes = UMA linha do tempo, na ordem da viagem. Antes eram duas
  // tabelas separadas por tipo (voos x deslocamentos), e a de voos não tinha
  // data-idx — por isso ignorava o filtro por cidade.
  const transportLegs = () => {
    const legs = [];
    // voos declarados em trip.flights: casa a data com a célula do dia p/ herdar
    // o data-idx e a cor da cidade, senão não filtram.
    const cellByDate = new Map(cells.map((c) => [isoDate(c.date), c]));
    for (const f of (trip.flights || [])) {
      const key = tx(f.date, "en");
      const c = cellByDate.get(key);
      if (!c) continue; // voo fora do intervalo da viagem: não inventa linha
      const pair = [f.from, f.to].filter(Boolean).map(plc).join(" → ");
      const label = [f.flightNo ? `<strong>${bi(f.flightNo)}</strong>` : "", pair].filter(Boolean).join(" · ");
      const when = [f.dep, f.arr].filter(Boolean).map((v) => tx(v, "en")).join(" → ");
      legs.push({ date: c.date, sort: when || "00:00", no: tx(f.flightNo, "en"), idx: idxOf(c), color: c.color, icon: "✈️", when, label, note: f.note });
    }
    // Itens de deslocamento dentro dos dias. Um voo declarado em trip.flights
    // costuma ter um item "move" gêmeo no dia (o BA0169 aparecia duas vezes):
    // o item vence, porque carrega horário e nota do dia.
    const flightNos = (trip.flights || []).map((f) => tx(f.flightNo, "en")).filter(Boolean);
    for (const c of cells) {
      for (const it of c.items) {
        if (it.type !== "move") continue;
        const txt = LANGS.map((l) => tx(it.text, l)).join(" ");
        const dupe = flightNos.find((no) => txt.includes(no));
        if (dupe) {
          const i = legs.findIndex((l) => l.no === dupe);
          if (i >= 0) legs.splice(i, 1);
        }
        legs.push({ date: c.date, sort: it.time || "00:00", idx: idxOf(c), color: c.color, icon: modeIcon(it), when: it.time, label: itemInner({ ...it, time: null }), note: it.note });
      }
    }
    legs.sort((a, b) => (a.date - b.date) || String(a.sort).localeCompare(String(b.sort)));
    return legs;
  };

  const transportPanel = () => {
    const legs = transportLegs();
    if (!legs.length) return `<p class="empty-msg">—</p>`;
    const rows = legs.map((l) => `<div class="tl-row" data-idx="${l.idx}" style="--city:${l.color}">
        <span class="tl-date">${dateLine(l.date)}</span>
        <span class="tl-ico" aria-hidden="true">${l.icon}</span>
        <span class="tl-txt">${l.when ? `<span class="t">${esc(l.when)}</span>` : ""}${l.label}${l.note ? `<div class="tl-note">${bi(l.note)}</div>` : ""}</span>
      </div>`).join("\n");
    return `<div class="tl">${rows}</div>`;
  };

  // agrupa dias consecutivos da mesma cidade num bloco só
  const groupByCity = () => {
    const groups = [];
    for (const c of cells) {
      const last = groups[groups.length - 1];
      if (last && last.key === c.cityKey && last.transit === c.transit) last.cells.push(c);
      else groups.push({ key: c.cityKey, raw: c.cityRaw, color: c.color, transit: c.transit, cells: [c] });
    }
    return groups;
  };

  const placeCard = (it, c) => `<div class="pl-card${it.type === "star" ? " star" : ""}">
        ${photo(it, "pl-shot")}
        <div class="pl-body">
          <span class="pl-when">${dateLine(c.date)}</span>
          <span class="pl-name">${itemInner(it)}</span>
          ${addrLink(it.address, "pl-addr")}
        </div>
      </div>`;

  const placesPanel = () => {
    const blocks = [];
    for (const g of groupByCity()) {
      if (g.transit) continue;
      const idx = idxOf(g);
      const first = g.cells[0].date, last = g.cells[g.cells.length - 1].date;
      const range = g.cells.length > 1 ? esc(`${dd(first)}–${dd(last)}/${mm(last)}`) : dateLine(first);
      const cards = g.cells.flatMap((c) => c.items.filter((it) => it.type !== "move").map((it) => placeCard(it, c)));
      if (!cards.length) continue;
      blocks.push(`<div class="pl-group" data-idx="${idx}" style="--city:${g.color}">
      <div class="pl-city"><span class="dot"></span>${bi(g.raw)} <span class="pl-dates">${range}</span></div>
      <div class="pl-grid">${cards.join("\n      ")}</div>
    </div>`);
    }
    return blocks.join("\n") || `<p class="empty-msg">—</p>`;
  };

  // ----- hospedagem -----
  const colorOfKey = new Map(cities.map((c) => [c.key, c.color]));

  const stayNights = (s) => {
    if (!s.checkIn || !s.checkOut) return null;
    const n = Math.round((parseDate(s.checkOut) - parseDate(s.checkIn)) / 86400000);
    return n > 0 ? n : null;
  };

  // Uma linha "rótulo: valor" da reserva. Só existe se a pessoa preencheu.
  const stayMeta = (key, val) => (val ? `<div class="hs-meta"><span class="hs-k">${uiBi(key)}</span><span class="hs-v">${val}</span></div>` : "");

  const stayCard = (s) => {
    const key = cityKeyOf(s.city);
    const idx = nameIdx.get(key);
    // cidade que não é parada da viagem: sem data-idx, aparece em qualquer filtro
    const attr = idx === undefined ? "" : ` data-idx="${idx}"`;
    const color = colorOfKey.get(key) || "var(--accent)";
    const n = stayNights(s);
    const when = s.checkIn
      ? `<div class="hs-dates">${dateLine(parseDate(s.checkIn))}${s.checkOut ? ` → ${dateLine(parseDate(s.checkOut))}` : ""}${n ? ` <span class="hs-n">${n}n</span>` : ""}</div>`
      : "";
    const name = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${bi(s.name)}</a>` : bi(s.name);
    const mapPin = s.coords ? ` <a class="lk" href="${esc(mapLinkFor(s.coords, provider))}" target="_blank" rel="noopener" aria-label="map">📍</a>` : "";
    const metas = [
      stayMeta("conf", s.confirmation ? `<code>${esc(s.confirmation)}</code>` : ""),
      stayMeta("price", s.price ? bi(s.price) : ""),
      stayMeta("phone", s.phone ? `<a href="tel:${esc(String(s.phone).replace(/[^+\d]/g, ""))}">${esc(s.phone)}</a>` : ""),
    ].join("");
    return `<div class="hs-card"${attr} style="--city:${color}">
        ${photo(s, "hs-shot")}
        <div class="hs-body">
          <div class="hs-city"><span class="dot"></span>${bi(s.city)}</div>
          <div class="hs-name">🛏️ ${name}${mapPin}</div>
          ${when}
          ${addrLink(s.address, "hs-addr")}
          ${metas}
          ${s.note ? `<div class="hs-note">${bi(s.note)}</div>` : ""}
        </div>
      </div>`;
  };

  const staysPanel = () => (stays.length ? `<div class="hs-grid">${stays.map(stayCard).join("\n      ")}</div>` : `<p class="empty-msg">—</p>`);

  // ----- restaurantes -----
  const tierBi = (t) => LANGS.map((l) => span(l, tierStr(l, t))).join("");

  const foodCard = (d) => {
    const name = d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${bi(d.name)}</a>` : bi(d.name);
    const mapPin = d.coords ? ` <a class="lk" href="${esc(mapLinkFor(d.coords, provider))}" target="_blank" rel="noopener" aria-label="map">📍</a>` : "";
    const price = d.price ? `<span class="food-price">${bi(d.price)}</span>` : "";
    return `<div class="food-card tier-${d.tier}">
        <div class="food-top"><span class="food-tier tier-${d.tier}">${tierBi(d.tier)}</span>${price}</div>
        <div class="food-name">🍽️ ${name}${mapPin}</div>
        ${d.cuisine ? `<div class="food-cuisine">${bi(d.cuisine)}</div>` : ""}
        ${addrLink(d.address, "food-addr")}
        ${d.note ? `<div class="food-note">${bi(d.note)}</div>` : ""}
      </div>`;
  };

  // Agrupa por cidade na ordem do rail; dentro de cada cidade, do mais chique ao
  // mais simples. Cidade fora do roteiro fica sem data-idx (aparece em qualquer
  // filtro) em vez de sumir, igual a uma reserva órfã.
  const foodPanel = () => {
    if (!dining.length) return `<p class="empty-msg">—</p>`;
    const order = [];
    const seen = new Set();
    for (const c of cities) { if (c.transit || seen.has(c.key)) continue; seen.add(c.key); order.push(c); }
    const byCity = new Map();
    for (const d of dining) {
      const key = cityKeyOf(d.city);
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key).push(d);
    }
    const rank = (t) => TIER_ORDER.indexOf(t);
    const orderedKeys = [...order.map((c) => c.key), ...[...byCity.keys()].filter((k) => !order.some((c) => c.key === k))];
    const blocks = [];
    for (const key of orderedKeys) {
      const list = byCity.get(key);
      if (!list || !list.length) continue;
      list.sort((a, b) => rank(a.tier) - rank(b.tier));
      const idx = nameIdx.get(key);
      const attr = idx === undefined ? "" : ` data-idx="${idx}"`;
      const color = colorOfKey.get(key) || "var(--accent)";
      const cityRaw = (order.find((c) => c.key === key) || {}).raw || list[0].city;
      blocks.push(`<div class="food-group"${attr} style="--city:${color}">
      <div class="pl-city"><span class="dot"></span>${bi(cityRaw)}</div>
      <div class="food-grid">${list.map(foodCard).join("\n      ")}</div>
    </div>`);
    }
    return blocks.join("\n") || `<p class="empty-msg">—</p>`;
  };

  // ----- header -----
  const route = trip.stops.filter((s) => !s.transit).map((s) => bi(s.city)).join(" → ");
  const bases = new Set(cities.filter((c) => !c.transit).map((c) => c.key)).size;
  const nights = cities.reduce((a, c) => a + (c.transit ? 0 : c.nights), 0);
  const f = cells[0].date, l = cells[cells.length - 1].date;
  const metaNights = LANGS.map((lg) => span(lg, `${nights} ${uiStr(lg, "nights")} · ${bases} ${uiStr(lg, bases === 1 ? "base" : "bases")}`)).join("");
  const dateRange = `${dd(f)}/${mm(f)}/${f.getUTCFullYear()} → ${dd(l)}/${mm(l)}/${l.getUTCFullYear()}`;
  const pageTitle = tx(trip.title, PRIMARY) || "Trip";

  const langVisCss = LANGS.map((lg) => `body[data-lang="${lg}"] [data-l="${lg}"] { display: revert; }`).join("\n  ");
  const langButtons = LANGS.map((lg) => `<button class="lang${lg === PRIMARY ? " active" : ""}" data-lang="${lg}" aria-pressed="${lg === PRIMARY}">${esc(LANG_LABEL[lg] || lg.toUpperCase())}</button>`).join("");

  const leafletHead = hasMap
    ? `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>`
    : "";
  const staysTab = stays.length ? `<button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="stays">🛏️ ${uiBi("stays")}</button>` : "";
  const staysPanelHtml = stays.length ? `<div class="panel" role="tabpanel" data-tab="stays">
    ${staysPanel()}
  </div>` : "";

  const foodTab = dining.length ? `<button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="food">🍽️ ${uiBi("food")}</button>` : "";
  const foodPanelHtml = dining.length ? `<div class="panel" role="tabpanel" data-tab="food">
    ${foodPanel()}
  </div>` : "";

  const mapTab = hasMap ? `<button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="map">🗺️ ${uiBi("map")}</button>` : "";
  // Legenda dos tipos de ponto — e o filtro deles. É a mesma coisa: a legenda
  // já lista exatamente os tipos que o mapa tem, então ela é o controle, em vez
  // de duplicar a informação num segundo lugar. Só existe com 2+ tipos: legenda
  // de um item só não explica nada, e desligar o único tipo esvazia o mapa.
  const KIND_LEGEND = [["place", "•", "mkPlace"], ["stay", "🛏️", "mkStay"], ["food", "🍽️", "mkFood"], ["station", "🚉", "mkStation"]];
  const mapLegend = markerKinds.size < 2 ? "" : KIND_LEGEND.filter(([k]) => markerKinds.has(k))
    .map(([k, ico, key]) => `<label class="mk-lg mk-lg-${k}"><input type="checkbox" class="mk-cb" data-kind="${k}" checked><span class="mk-lg-ico">${ico}</span>${uiBi(key)}</label>`).join("");
  const mapPanel = hasMap ? `<div class="panel" role="tabpanel" data-tab="map">
    <div class="map-tools">
      <button class="map-btn" id="dlkml">⬇️ ${mtBi("dl")}</button>
      <a class="map-btn ghost" href="https://www.google.com/mymaps" target="_blank" rel="noopener">🗺️ ${mtBi("my")}</a>
      <div class="map-tip">${mtBi("tip")}</div>
    </div>
    <div class="map-days">
      <button class="mday-nav" id="mdayPrev" aria-label="${esc(uiStr(PRIMARY, "prevDay"))}">◀</button>
      <input type="range" class="mday-range" id="mdayRange" min="0" max="${cells.length}" value="0" step="1" aria-label="${esc(uiStr(PRIMARY, "dayAria"))}">
      <button class="mday-nav" id="mdayNext" aria-label="${esc(uiStr(PRIMARY, "nextDay"))}">▶</button>
      <output class="mday-lbl" id="mdayLbl" for="mdayRange"></output>
    </div>
    ${mapLegend ? `<div class="map-legend">${mapLegend}</div>` : ""}
    <div id="map" class="mapbox"><div class="map-fallback">${uiBi("mapFallback")}</div></div>
  </div>` : "";

  const weekHeader = [0, 1, 2, 3, 4, 5, 6].map((i) => `<div>${LANGS.map((lg) => span(lg, (UI[lg] || UI.en).wf[i])).join("")}</div>`).join("");

  return `<!DOCTYPE html>
<html lang="${esc(PRIMARY)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f6f7fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a0a12" media="(prefers-color-scheme: dark)">
<title>${esc(pageTitle)}</title>
<script>
  // aplica o tema salvo antes da primeira pintura (evita flash ao trocar de tema)
  try { var t = localStorage.getItem('boutrip-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  // idem para o tamanho do texto: o atributo entra antes da pintura, o CSS já escala
  try { var fs = localStorage.getItem('boutrip-fontscale'); if (fs) document.documentElement.setAttribute('data-fontscale', fs); } catch (e) {}
</script>
${leafletHead}
<style>
${buildCss({ langVisCss })}
</style>
</head>
<body data-lang="${esc(PRIMARY)}">
<div class="wrap">

  <div class="appbar">
    <div class="brand">
      <span class="brand-mark">✈️</span>
      <span class="brand-name">Bou-Trip</span>
    </div>
    <div class="bar-actions">
      ${multi ? `<div class="langbar" role="group" aria-label="${esc(uiStr(PRIMARY, "langAria"))}">${langButtons}</div>` : ""}
      <button class="icon-btn" id="fontbtn" aria-label="${esc(uiStr(PRIMARY, "fontSize"))}"><span class="fs-a">A</span></button>
      <button class="icon-btn" id="themebtn" aria-label="${esc(uiStr(PRIMARY, "theme"))}">${THEME_ICONS}</button>
    </div>
  </div>

  <div class="header">
    <div>
      <h1>${esc(trip.emoji || "🧳")} ${bi(trip.title)}</h1>
      <div class="sub">${route}</div>
    </div>
    <div class="meta">
      ${trip.travelers ? `<div>${bi(trip.travelers)}</div>` : ""}
      <div>${metaNights}</div>
      <div>${dateRange}</div>
    </div>
  </div>

  <div class="rail" role="group" aria-label="${esc(uiStr(PRIMARY, "filterAria"))}">
      ${journeyRail()}
  </div>
  <div class="legend">
    <span>${uiBi("filterHint")}</span>
    <span><b>★</b> ${uiBi("highlight")}</span>
    <span><b>→</b> ${uiBi("move")}</span>
  </div>

  <div class="tabs" role="tablist" aria-label="${esc(uiStr(PRIMARY, "tabsAria"))}">
    <button class="tab" role="tab" aria-selected="true" tabindex="0" data-panel="cal">📅 ${uiBi("cal")}</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="roteiro">🗒️ ${uiBi("roteiro")}</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="trans">🚆 ${uiBi("trans")}</button>
    <button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="places">📍 ${uiBi("places")}</button>
    ${staysTab}
    ${foodTab}
    ${mapTab}
  </div>

  <div class="panel active" role="tabpanel" data-tab="cal">
    <div class="weekhdr">${weekHeader}</div>
    <div class="cal">
      ${cells.map(dayCard).join("\n      ")}
    </div>
  </div>

  <div class="panel" role="tabpanel" data-tab="roteiro">
    ${roteiroPanel()}
  </div>

  <div class="panel" role="tabpanel" data-tab="trans">
    ${transportPanel()}
  </div>

  <div class="panel" role="tabpanel" data-tab="places">
    ${placesPanel()}
  </div>

  ${staysPanelHtml}

  ${foodPanelHtml}

  ${mapPanel}

  <div class="footer">${trip.footer ? bi(trip.footer) : ""}</div>

</div>
<script>
var TRIP_MARKERS = ${json(markers)};
var TRIP_DAYS = ${json(dayList)};
var TRIP_KML = ${json(kmlStr)};
var TRIP_I18N = ${json(clientI18n)};
${CLIENT_SCRIPT}
</script>
</body>
</html>
`;
}

export function buildKml(trip) {
  const days = buildDays(trip);
  const lang = trip.lang || "en";
  const provider = trip.maps === "osm" ? "osm" : "google";
  // Mesma coleta do HTML: hospedagem e estações vão junto, com um prefixo no
  // nome para se distinguirem na lista do app de mapa (que não tem legenda).
  const PREFIX = { place: "", stay: "🛏️ ", station: "🚉 ", food: "🍽️ " };
  const marks = collectMarkers(trip, days, provider).map((m) => {
    const name = esc(PREFIX[m.kind] + tx(m.name, lang));
    const desc = esc([tx(m.city, lang), tx(m.address, lang)].filter(Boolean).join(" · "));
    return `    <Placemark>\n      <name>${name}</name>\n      <description>${desc}</description>\n      <Point><coordinates>${m.lon},${m.lat},0</coordinates></Point>\n    </Placemark>`;
  });
  if (!marks.length) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(tx(trip.title, lang) || "Trip")}</name>
${marks.join("\n")}
  </Document>
</kml>
`;
}

// ---------- CLI ----------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , inPath = "trip.json", outPath = "my-trip.html"] = process.argv;
  try {
    const trip = JSON.parse(readFileSync(inPath, "utf8"));
    writeFileSync(outPath, renderTripHtml(trip));
    console.log(`✅ Roteiro gerado: ${outPath}  (a partir de ${inPath})`);
    console.log("   Abra no navegador, ou imprima como PDF (A4 paisagem).");
    const kml = buildKml(trip);
    if (kml) {
      const kmlPath = (outPath.replace(/\.html?$/i, "") || "places") + ".kml";
      writeFileSync(kmlPath, kml);
      console.log(`🗺️  Pontos para o mapa: ${kmlPath}  (importe no Organic Maps / Google My Maps — veja OFFLINE-MAPS.md)`);
    }
  } catch (e) {
    console.error(`❌ Erro: ${e.message}`);
    process.exit(1);
  }
}
