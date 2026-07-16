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
import { LANG_LABEL, UI, isBi, mapToolStr, tx, uiStr } from "./i18n.mjs";
import { CITY_PALETTE, TRANSIT_COLOR, buildCss } from "./theme.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const mondayIndex = (date) => (date.getUTCDay() + 6) % 7;
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const dd = (d) => String(d.getUTCDate()).padStart(2, "0");
const mm = (d) => String(d.getUTCMonth() + 1).padStart(2, "0");
const isoDate = (d) => `${d.getUTCFullYear()}-${mm(d)}-${dd(d)}`;

function normItem(it) {
  if (typeof it === "string") return { type: "bullet", text: it };
  // objeto bilíngue puro (sem campos estruturados) = bullet com esse texto
  if (isBi(it) && !("text" in it) && !("type" in it) && !("items" in it)) {
    return { type: "bullet", text: it };
  }
  return {
    type: it.type || "bullet",
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

  trip.stops.forEach((stop) => {
    const nights = Math.max(1, Number(stop.nights) || 1);
    const isTransit = !!stop.transit;
    const color = stop.color || (isTransit ? TRANSIT_COLOR : CITY_PALETTE[cities.filter((c) => !c.transit).length % CITY_PALETTE.length]);
    const cityKey = tx(stop.city, "en") || tx(stop.city, "pt") || String(stop.city);
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

  return { cities, cells, start, end: addDays(start, offset - 1) };
}

export function renderTripHtml(trip) {
  const { cities, cells } = buildDays(trip);
  const provider = trip.maps === "osm" ? "osm" : "google";
  const PRIMARY = trip.lang ? String(trip.lang) : "en";
  const LANGS = PRIMARY === "en" ? ["en"] : ["en", PRIMARY];
  const multi = LANGS.length > 1;

  const nameIdx = new Map();
  cities.forEach((c) => { if (!nameIdx.has(c.key)) nameIdx.set(c.key, nameIdx.size); });

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
  };

  function itemInner(it) {
    const main = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${bi(it.text)}</a>` : bi(it.text);
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

  // endereço clicável → abre no Google Maps (busca pelo endereço)
  const addrLink = (address, cls) => (address
    ? `<div class="${cls}"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tx(address, PRIMARY))}" target="_blank" rel="noopener">📍 ${bi(address)}</a></div>`
    : "");

  // ----- markers do mapa -----
  const markers = [];
  for (const c of cells) {
    const idx = nameIdx.get(c.cityKey);
    for (const it of c.items) {
      if (it.coords && it.coords.length === 2) {
        markers.push({ lat: it.coords[0], lon: it.coords[1], name: it.text, idx, color: c.color, url: it.url || null, tickets: it.tickets || null, map: it.map || mapLinkFor(it.coords, provider), address: it.address || null });
      }
    }
  }
  const hasMap = markers.length > 0;
  const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const kmlStr = hasMap ? (buildKml(trip) || "") : ""; // KML embutido p/ baixar offline

  // ----- componentes -----
  // rail = trilha da viagem; cada parada cresce na proporção das noites e filtra as 5 abas
  const journeyRail = () => {
    const seen = new Set();
    const out = [`<button class="seg all" aria-pressed="true"><span class="seg-bar"></span><span class="seg-name">${uiBi("showAll")}</span><span class="seg-n">${cells.length}d</span></button>`];
    for (const c of cities) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      out.push(`<button class="seg city" data-idx="${nameIdx.get(c.key)}" aria-pressed="false" style="--city:${c.color};--grow:${c.nights}">
        <span class="seg-bar"></span><span class="seg-name">${bi(c.raw)}</span><span class="seg-n">${c.nights}n</span>
      </button>`);
    }
    return out.join("\n      ");
  };

  const liClass = (it) => (it.type === "star" ? ' class="star"' : it.type === "move" ? ' class="move"' : "");

  const dayCard = (c) => {
    const idx = nameIdx.get(c.cityKey);
    const col = mondayIndex(c.date) + 1;
    const lis = c.items.map((it) => `<li${liClass(it)}>${itemInner(it)}</li>`).join("");
    return `<div class="day" data-idx="${idx}" data-date="${isoDate(c.date)}" style="--c:${col};--city:${c.color}">
      <div class="cell-top"><span class="date">${dd(c.date)}</span><span class="wknum">${dateChip(c.date)}</span></div>
      <div class="cell-city">${bi(c.cityRaw)}${c.suffix}</div>
      <div class="cell-body"><ul>${lis}</ul></div>
    </div>`;
  };

  const roteiroPanel = () => cells.map((c) => {
    const idx = nameIdx.get(c.cityKey);
    const head = `<div class="rt-head"><span class="rt-date">${dateLine(c.date)}</span><span class="rt-city">${bi(c.cityRaw)}${c.suffix}</span></div>`;
    const note = c.note ? `<p class="rt-note">${bi(c.note)}</p>` : "";
    const lis = c.items.map((it) => {
      const a = addrLink(it.address, "rt-addr");
      const n = it.note ? `<div class="rt-itemnote">${bi(it.note)}</div>` : "";
      return `<li${liClass(it)}>${itemInner(it)}${a}${n}${photo(it, "rt-img")}</li>`;
    }).join("");
    return `<div class="rt-day" data-idx="${idx}" style="--city:${c.color}">${head}${note}<ul class="rt-items">${lis}</ul></div>`;
  }).join("\n    ") || `<p class="empty-msg">—</p>`;

  const flightsTable = () => {
    if (!Array.isArray(trip.flights) || !trip.flights.length) return "";
    const rows = trip.flights.map((f) => {
      const tds = [f.date, f.flightNo, [f.from, f.to].filter(Boolean).join(" → "), [f.dep, f.arr].filter(Boolean).join(" → "), f.note]
        .filter(Boolean).map(esc).join("</td><td>");
      return `<tr><td>${tds}</td></tr>`;
    }).join("\n");
    return `<table class="flights"><tbody>\n${rows}\n</tbody></table>`;
  };

  const transportPanel = () => {
    let html = "";
    const ft = flightsTable();
    if (ft) html += `<h2 class="sec">✈️ ${uiBi("flights")}</h2>${ft}`;
    const rows = [];
    for (const c of cells) {
      const idx = nameIdx.get(c.cityKey);
      for (const it of c.items) {
        if (it.type === "move") {
          rows.push(`<div class="tl-row" data-idx="${idx}" style="--city:${c.color}"><span class="tl-date">${dateLine(c.date)}</span><span class="dot"></span><span class="tl-txt">${itemInner(it)}</span></div>`);
        }
      }
    }
    if (rows.length) html += `<h2 class="sec">🧭 ${uiBi("moves")}</h2><div class="tl">${rows.join("\n")}</div>`;
    return html || `<p class="empty-msg">—</p>`;
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
      const idx = nameIdx.get(g.key);
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

  // ----- header -----
  const route = trip.stops.filter((s) => !s.transit).map((s) => bi(s.city)).join(" → ");
  const bases = cities.filter((c) => !c.transit).length;
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
  const mapTab = hasMap ? `<button class="tab" role="tab" aria-selected="false" tabindex="-1" data-panel="map">🗺️ ${uiBi("map")}</button>` : "";
  const mapPanel = hasMap ? `<div class="panel" role="tabpanel" data-tab="map">
    <div class="map-tools">
      <button class="map-btn" id="dlkml">⬇️ ${mtBi("dl")}</button>
      <a class="map-btn ghost" href="https://www.google.com/mymaps" target="_blank" rel="noopener">🗺️ ${mtBi("my")}</a>
      <div class="map-tip">${mtBi("tip")}</div>
    </div>
    <div id="map" class="mapbox"><div class="map-fallback">${uiBi("mapFallback")}</div></div>
  </div>` : "";

  const weekHeader = [0, 1, 2, 3, 4, 5, 6].map((i) => `<div>${LANGS.map((lg) => span(lg, (UI[lg] || UI.en).wf[i])).join("")}</div>`).join("");

  return `<!DOCTYPE html>
<html lang="${esc(PRIMARY)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(pageTitle)}</title>
<script>
  // aplica o tema salvo antes da primeira pintura (evita flash de tela clara)
  try { var t = localStorage.getItem('boutrip-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
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
      <button class="icon-btn" id="themebtn" aria-label="${esc(uiStr(PRIMARY, "theme"))}"><span class="ico-light">🌙</span><span class="ico-dark">☀️</span></button>
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

  ${mapPanel}

  <div class="footer">${trip.footer ? bi(trip.footer) : ""}</div>

</div>
<script>
var TRIP_MARKERS = ${json(markers)};
var TRIP_KML = ${json(kmlStr)};
var TRIP_I18N = ${json(clientI18n)};
${CLIENT_SCRIPT}
</script>
</body>
</html>
`;
}

export function buildKml(trip) {
  const { cells } = buildDays(trip);
  const lang = trip.lang || "en";
  const marks = [];
  for (const c of cells) {
    for (const it of c.items) {
      if (it.coords && it.coords.length === 2) {
        const [lat, lon] = it.coords;
        const name = esc(tx(it.text, lang));
        const cityName = esc(tx(c.cityRaw, lang) + (c.suffix || ""));
        marks.push(`    <Placemark>\n      <name>${name}</name>\n      <description>${cityName}</description>\n      <Point><coordinates>${lon},${lat},0</coordinates></Point>\n    </Placemark>`);
      }
    }
  }
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
