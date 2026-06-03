// =====================================================================
// render.mjs — motor de geração do roteiro visual (sem dependências de build)
//
// Uso como CLI:   node lib/render.mjs <trip.json> [saida.html]
// Uso como módulo: import { renderTripHtml, buildKml } from "./lib/render.mjs"
//
// O HTML tem 4 abas (Calendário / Transportes / Lugares / Mapa), filtros
// por cidade que valem pras 4 abas, e é self-contained. As 3 primeiras
// abas funcionam offline; a aba Mapa usa tiles do OpenStreetMap (internet).
// =====================================================================

import { readFileSync, writeFileSync } from "node:fs";

const PALETTE = [
  "#0e9e96", "#c0392b", "#2e8b57", "#d98a0b",
  "#7d3cc0", "#3b4bc4", "#1f6feb", "#b8336a",
  "#0f8a8a", "#6b7280",
];
const TRANSIT_COLOR = "#5a5a6e";
const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MON = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const mondayIndex = (date) => (date.getUTCDay() + 6) % 7; // 0=Seg ... 6=Dom
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const dd = (d) => String(d.getUTCDate()).padStart(2, "0");
const fmtShort = (d) => `${dd(d)}/${String(d.getUTCMonth() + 1).padStart(2, "0")} ${WD[mondayIndex(d)]}`;
const fmtFull = (d) => `${dd(d)}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

function normItem(it) {
  if (typeof it === "string") return { type: "bullet", text: it };
  return {
    type: it.type || "bullet",
    text: it.text || "",
    note: it.note || null,       // descrição longa (aparece na aba Roteiro)
    address: it.address || null, // endereço oficial do lugar
    url: it.url || null,
    tickets: it.tickets || null,
    map: it.map || null,
    coords: Array.isArray(it.coords) ? it.coords : null,
  };
}

const osmLink = ([lat, lon]) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
const googleLink = ([lat, lon]) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const mapLinkFor = (coords, provider) => (provider === "osm" ? osmLink(coords) : googleLink(coords));

function itemInner(it, provider) {
  const txt = esc(it.text);
  const main = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${txt}</a>` : txt;
  let extra = "";
  if (it.tickets) extra += ` <a class="lk" href="${esc(it.tickets)}" target="_blank" rel="noopener" title="Comprar ingressos">🎟️</a>`;
  const mapHref = it.map || (it.coords ? mapLinkFor(it.coords, provider) : null);
  if (mapHref) extra += ` <a class="lk" href="${esc(mapHref)}" target="_blank" rel="noopener" title="Ver no mapa">📍</a>`;
  return main + extra;
}

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
    const color = stop.color || (isTransit ? TRANSIT_COLOR : PALETTE[cities.filter((c) => !c.transit).length % PALETTE.length]);
    cities.push({ name: stop.city, color, nights, transit: isTransit });

    const highlights = (stop.highlights || []).map(normItem);

    for (let i = 0; i < nights; i++) {
      const date = addDays(start, offset++);
      let items = [];
      let dayNote = null;

      // days[i] pode ser uma lista de itens OU um objeto { note, items } (note = visão geral do dia)
      const entry = Array.isArray(stop.days) ? stop.days[i] : undefined;
      if (Array.isArray(entry)) {
        items = entry.map(normItem);
      } else if (entry && typeof entry === "object") {
        items = (entry.items || []).map(normItem);
        dayNote = entry.note || null;
      } else {
        if (i === 0 && stop.arrival) items.push({ type: "move", text: stop.arrival });
        if (highlights.length) {
          const mine = highlights.filter((_, hi) => hi % nights === i);
          if (mine.length) items.push(...mine);
          else items.push({ type: "bullet", text: `Tempo livre em ${stop.city}` });
        } else if (!(i === 0 && stop.arrival)) {
          items.push({ type: "bullet", text: `Explorar ${stop.city}` });
        }
      }

      const label = nights > 1 && !isTransit ? `${stop.city} · n${i + 1}` : stop.city;
      cells.push({ date, city: label, cityKey: stop.city, color, items, transit: isTransit, note: dayNote });
    }
  });

  return { cities, cells, start, end: addDays(start, offset - 1) };
}

// ---------- componentes ----------

function filterChips(cities, nameIdx) {
  const seen = new Set();
  const chips = ['<button class="chip showall active">Mostrar tudo</button>'];
  for (const c of cities) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    chips.push(`<button class="chip city" data-idx="${nameIdx.get(c.name)}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)} · ${c.nights}n</button>`);
  }
  chips.push('<span class="chip info">★ destaque</span>');
  chips.push('<span class="chip info">→ deslocamento</span>');
  return chips.join("\n      ");
}

function dayCard(cell, provider, idx) {
  const wk = `${MON[cell.date.getUTCMonth()]} · ${WD[mondayIndex(cell.date)]}`;
  const col = mondayIndex(cell.date) + 1; // 1..7 = Seg..Dom (alinha a grade do desktop, mesmo filtrando)
  const lis = cell.items.map((it) => {
    const cls = it.type === "star" ? " class=\"star\"" : it.type === "move" ? " class=\"move\"" : "";
    return `<li${cls}>${itemInner(it, provider)}</li>`;
  }).join("");
  return `<div class="day" data-idx="${idx}" style="--c:${col}">
      <div class="cell-top" style="background:${cell.color}"><span class="date">${dd(cell.date)}</span><span class="wknum">${wk}</span></div>
      <div class="cell-city" style="background:${cell.color}">${esc(cell.city)}</div>
      <div class="cell-body"><ul>${lis}</ul></div>
    </div>`;
}

function flightsTable(flights) {
  if (!Array.isArray(flights) || !flights.length) return "";
  const rows = flights.map((f) => {
    const cells = [f.date, f.flightNo, [f.from, f.to].filter(Boolean).join(" → "), [f.dep, f.arr].filter(Boolean).join(" → "), f.note]
      .filter(Boolean).map(esc).join("</td><td>");
    return `<tr><td>${cells}</td></tr>`;
  }).join("\n");
  return `<table class="flights"><tbody>\n${rows}\n</tbody></table>`;
}

function transportPanel(cells, flights, provider, nameIdx) {
  let html = "";
  const ft = flightsTable(flights);
  if (ft) html += `<h2 class="sec">✈️ Voos</h2>${ft}`;
  const rows = [];
  for (const c of cells) {
    const idx = nameIdx.get(c.cityKey);
    for (const it of c.items) {
      if (it.type === "move") {
        rows.push(`<div class="tl-row" data-idx="${idx}"><span class="tl-date">${fmtShort(c.date)}</span><span class="dot" style="background:${c.color}"></span><span class="tl-txt">${itemInner(it, provider)}</span></div>`);
      }
    }
  }
  if (rows.length) html += `<h2 class="sec">🧭 Deslocamentos no roteiro</h2><div class="tl">${rows.join("\n")}</div>`;
  return html || `<p class="empty-msg">Sem transportes registrados.</p>`;
}

function placesPanel(cells, provider, nameIdx) {
  const groups = [];
  for (const c of cells) {
    const last = groups[groups.length - 1];
    if (last && last.key === c.cityKey && last.transit === c.transit) last.cells.push(c);
    else groups.push({ key: c.cityKey, color: c.color, transit: c.transit, cells: [c] });
  }
  const blocks = [];
  for (const g of groups) {
    if (g.transit) continue;
    const idx = nameIdx.get(g.key);
    const first = g.cells[0].date, last = g.cells[g.cells.length - 1].date;
    const range = g.cells.length > 1
      ? `${dd(first)}–${dd(last)}/${String(last.getUTCMonth() + 1).padStart(2, "0")}`
      : fmtShort(first);
    let daysHtml = "";
    for (const c of g.cells) {
      const places = c.items.filter((it) => it.type !== "move");
      if (!places.length) continue;
      const lis = places.map((it) => `<li${it.type === "star" ? " class=\"star\"" : ""}>${itemInner(it, provider)}${it.address ? `<div class="pl-addr">📍 ${esc(it.address)}</div>` : ""}</li>`).join("");
      daysHtml += `<div class="pl-day"><span class="pl-d">${fmtShort(c.date)}</span><ul>${lis}</ul></div>`;
    }
    if (!daysHtml) continue;
    blocks.push(`<div class="pl-group" data-idx="${idx}"><div class="pl-city"><span class="dot" style="background:${g.color}"></span>${esc(g.key)} <span class="pl-dates">${range}</span></div>${daysHtml}</div>`);
  }
  return blocks.join("\n") || `<p class="empty-msg">Sem lugares registrados.</p>`;
}

function roteiroPanel(cells, provider, nameIdx) {
  const blocks = cells.map((c) => {
    const idx = nameIdx.get(c.cityKey);
    const head = `<div class="rt-head"><span class="rt-date">${fmtShort(c.date)}</span><span class="rt-city" style="color:${c.color}">${esc(c.city)}</span></div>`;
    const note = c.note ? `<p class="rt-note">${esc(c.note)}</p>` : "";
    const lis = c.items.map((it) => {
      const cls = it.type === "star" ? " class=\"star\"" : it.type === "move" ? " class=\"move\"" : "";
      const n = it.note ? `<div class="rt-itemnote">${esc(it.note)}</div>` : "";
      const a = it.address ? `<div class="rt-addr">📍 ${esc(it.address)}</div>` : "";
      return `<li${cls}>${itemInner(it, provider)}${a}${n}</li>`;
    }).join("");
    return `<div class="rt-day" data-idx="${idx}">${head}${note}<ul class="rt-items">${lis}</ul></div>`;
  }).join("\n    ");
  return blocks || `<p class="empty-msg">Sem roteiro.</p>`;
}

export function renderTripHtml(trip) {
  const { cities, cells } = buildDays(trip);
  const provider = trip.maps === "osm" ? "osm" : "google";
  const nameIdx = new Map();
  cities.forEach((c) => { if (!nameIdx.has(c.name)) nameIdx.set(c.name, nameIdx.size); });

  const route = trip.stops.filter((s) => !s.transit).map((s) => esc(s.city)).join(" → ");
  const bases = cities.filter((c) => !c.transit).length;
  const nights = cities.reduce((a, c) => a + (c.transit ? 0 : c.nights), 0);
  const f = cells[0].date, l = cells[cells.length - 1].date;

  // markers do mapa (todos os itens com coords)
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
  const markersJson = JSON.stringify(markers).replace(/</g, "\\u003c");

  const leafletHead = hasMap
    ? `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>`
    : "";

  const mapTab = hasMap ? '<button class="tab" data-panel="map">🗺️ Mapa</button>' : "";
  const mapPanel = hasMap
    ? `<div class="panel" data-tab="map"><div id="map" class="mapbox"><div class="map-fallback">🗺️ O mapa precisa de internet para carregar (tiles do OpenStreetMap). As outras abas funcionam offline.</div></div></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(trip.title || "Meu Roteiro")}</title>
${leafletHead}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1a2e; background: #f4f4f8; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: flex; flex-direction: column; gap: 6px; background: linear-gradient(125deg, #c0392b 0%, #8e2de2 55%, #1f6feb 100%); color: #fff; padding: 14px 16px; border-radius: 12px; margin-bottom: 12px; }
  .header h1 { font-size: 20px; line-height: 1.2; }
  .header .sub { font-size: 12px; opacity: .93; line-height: 1.4; }
  .header .meta { font-size: 11px; line-height: 1.55; opacity: .95; }

  .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .tab { -webkit-appearance: none; appearance: none; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 8px 14px; border-radius: 20px; border: 1px solid #e6e6ee; background: #fff; color: #1a1a2e; }
  .tab.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }

  .filterbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 6px; }
  .filter-hint { font-size: 11px; color: #999; margin-bottom: 12px; }
  .chip { -webkit-appearance: none; appearance: none; font: inherit; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 20px; background: #fff; border: 1px solid rgba(0,0,0,.08); color: #1a1a2e; }
  .chip.showall, .chip.city { cursor: pointer; user-select: none; }
  .chip.showall.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }
  .chip.city.sel { box-shadow: 0 0 0 2px #1f6feb; font-weight: 700; }
  body.filtering .chip.city:not(.sel) { opacity: .4; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }

  .panel { display: none; }
  .panel.active { display: block; }

  .weekhdr { display: none; }
  .cal { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .day { border-radius: 12px; border: 1px solid #e6e6ee; background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(20,20,40,.05); }
  .cell-top { display: flex; align-items: center; justify-content: space-between; padding: 9px 13px; color: #fff; }
  .cell-top .date { font-size: 20px; font-weight: 800; line-height: 1; }
  .cell-top .wknum { font-size: 11px; opacity: .92; text-transform: uppercase; letter-spacing: .5px; }
  .cell-city { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 4px 13px; color: #fff; opacity: .96; }
  .cell-body { padding: 10px 13px 12px; }
  .cell-body ul { list-style: none; }
  .cell-body li { font-size: 13.5px; line-height: 1.45; margin-bottom: 4px; padding-left: 14px; position: relative; color: #2a2a3a; }
  .cell-body li::before { content: "•"; position: absolute; left: 0; color: #b3b3c0; }
  .cell-body li.star { font-weight: 700; color: #1a1a2e; }
  .cell-body li.star::before { content: "★"; color: #e6a817; }
  .cell-body li.move::before { content: "→"; color: #1f6feb; font-weight: 700; }

  .panel a { color: inherit; text-decoration: underline; text-decoration-color: rgba(31,111,235,.45); text-underline-offset: 2px; }
  .panel a:hover { text-decoration-color: #1f6feb; }
  .panel a.lk { text-decoration: none; font-size: .9em; opacity: .85; }
  .panel a.lk:hover { opacity: 1; }

  .sec { font-size: 14px; margin: 16px 0 8px; color: #1a1a2e; }
  .sec:first-child { margin-top: 0; }
  table.flights { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; font-size: 12.5px; }
  table.flights td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  table.flights tr:last-child td { border-bottom: none; }
  .tl { background: #fff; border: 1px solid #e6e6ee; border-radius: 10px; overflow: hidden; }
  .tl-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid #f0f0f4; font-size: 13px; }
  .tl-row:last-child { border-bottom: none; }
  .tl-date { font-weight: 700; min-width: 74px; color: #555; font-size: 12px; }
  .tl-txt { flex: 1; }
  .pl-city { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; margin: 18px 0 6px; }
  .pl-group:first-child .pl-city { margin-top: 0; }
  .pl-dates { font-weight: 600; font-size: 12px; color: #999; }
  .pl-day { display: flex; gap: 12px; padding: 6px 0 6px 16px; border-left: 2px solid #eee; margin-left: 5px; }
  .pl-d { min-width: 72px; font-size: 12px; font-weight: 700; color: #666; padding-top: 1px; }
  .pl-day ul { list-style: none; flex: 1; }
  .pl-day li { font-size: 13.5px; line-height: 1.45; margin-bottom: 3px; padding-left: 14px; position: relative; }
  .pl-day li::before { content: "•"; position: absolute; left: 0; color: #b3b3c0; }
  .pl-day li.star { font-weight: 700; }
  .pl-day li.star::before { content: "★"; color: #e6a817; }
  .empty-msg { color: #888; font-size: 13px; padding: 10px; }

  .rt-day { background: #fff; border: 1px solid #e6e6ee; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
  .rt-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .rt-date { font-weight: 800; font-size: 13px; color: #555; }
  .rt-city { font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: .4px; }
  .rt-note { font-size: 13.5px; line-height: 1.55; color: #444; margin-bottom: 8px; }
  .rt-items { list-style: none; }
  .rt-items li { font-size: 14px; line-height: 1.5; margin-bottom: 9px; padding-left: 16px; position: relative; color: #2a2a3a; }
  .rt-items li::before { content: "•"; position: absolute; left: 0; color: #b3b3c0; }
  .rt-items li.star { font-weight: 700; color: #1a1a2e; }
  .rt-items li.star::before { content: "★"; color: #e6a817; }
  .rt-items li.move::before { content: "→"; color: #1f6feb; font-weight: 700; }
  .rt-itemnote { font-weight: 400; font-size: 13px; line-height: 1.5; color: #666; margin-top: 3px; }
  .rt-addr { font-weight: 400; font-size: 12.5px; color: #7a7a8a; margin-top: 2px; }
  .pl-addr { font-size: 12px; color: #8a8a98; margin-top: 1px; }

  .mapbox { height: 72vh; min-height: 400px; border-radius: 12px; overflow: hidden; border: 1px solid #e6e6ee; background: #e8edf3; }
  .map-fallback { padding: 40px 24px; color: #7a7a8a; font-size: 13px; text-align: center; }
  .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
  .leaflet-popup-content a { color: #1f6feb; text-decoration: none; }

  .footer { margin-top: 16px; font-size: 11px; color: #888; text-align: center; line-height: 1.5; }

  @media (min-width: 620px) {
    .header { flex-direction: row; align-items: center; justify-content: space-between; }
    .header .meta { text-align: right; }
    .cal { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1000px) {
    body { padding: 14px; }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 5px; grid-auto-flow: row; }
    .day { grid-column: var(--c); box-shadow: none; }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 5px; }
    .weekhdr div { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #555; font-weight: 700; text-align: center; }
    .cell-top { padding: 5px 8px; } .cell-top .date { font-size: 15px; } .cell-top .wknum { font-size: 9px; }
    .cell-city { font-size: 9px; padding: 2px 8px; }
    .cell-body { padding: 6px 8px 7px; } .cell-body li { font-size: 9.5px; line-height: 1.34; margin-bottom: 2px; padding-left: 10px; }
  }
  @media print {
    @page { size: A4 landscape; margin: 7mm; }
    body { padding: 0; background: #fff; }
    .tabs, .filterbar, .filter-hint { display: none; }
    .panel { display: none !important; }
    .panel[data-tab="cal"] { display: block !important; }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 4px; grid-auto-flow: row; }
    .day { grid-column: var(--c); box-shadow: none; break-inside: avoid; }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
    .weekhdr div { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #555; font-weight: 700; text-align: center; }
    .header { flex-direction: row; align-items: center; justify-content: space-between; }
    .cell-top { padding: 4px 7px; } .cell-top .date { font-size: 13px; } .cell-top .wknum { font-size: 8px; }
    .cell-city { font-size: 8.5px; padding: 2px 7px; }
    .cell-body { padding: 5px 7px; } .cell-body li { font-size: 8.3px; line-height: 1.32; margin-bottom: 1.5px; padding-left: 8px; }
  }
</style>
</head>
<body>

  <div class="header">
    <div>
      <h1>${esc(trip.emoji || "🧳")} ${esc(trip.title || "Meu Roteiro")}</h1>
      <div class="sub">${route}</div>
    </div>
    <div class="meta">
      ${trip.travelers ? `<div>${esc(trip.travelers)}</div>` : ""}
      <div>${nights} noites · ${bases} ${bases === 1 ? "base" : "bases"}</div>
      <div>${fmtFull(f)} → ${fmtFull(l)}</div>
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" data-panel="cal">📅 Calendário</button>
    <button class="tab" data-panel="roteiro">🗒️ Roteiro</button>
    <button class="tab" data-panel="trans">🚆 Transportes</button>
    <button class="tab" data-panel="places">📍 Lugares</button>
    ${mapTab}
  </div>

  <div class="filterbar">
      ${filterChips(cities, nameIdx)}
  </div>
  <div class="filter-hint">Toque numa cidade para ver só ela (vale pras 5 abas). "Mostrar tudo" limpa o filtro.</div>

  <div class="panel active" data-tab="cal">
    <div class="weekhdr">
      <div>Segunda</div><div>Terça</div><div>Quarta</div><div>Quinta</div><div>Sexta</div><div>Sábado</div><div>Domingo</div>
    </div>
    <div class="cal">
      ${cells.map((c) => dayCard(c, provider, nameIdx.get(c.cityKey))).join("\n      ")}
    </div>
  </div>

  <div class="panel" data-tab="roteiro">
    ${roteiroPanel(cells, provider, nameIdx)}
  </div>

  <div class="panel" data-tab="trans">
    ${transportPanel(cells, trip.flights, provider, nameIdx)}
  </div>

  <div class="panel" data-tab="places">
    ${placesPanel(cells, provider, nameIdx)}
  </div>

  ${mapPanel}

  <div class="footer">${esc(trip.footer || "Gerado com trip-template · edite trip.json e rode novamente para atualizar")}</div>

<script>
var TRIP_MARKERS = ${markersJson};
(function(){
  function q(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}

  // ----- abas -----
  q('.tab').forEach(function(t){t.addEventListener('click',function(){
    q('.tab').forEach(function(x){x.classList.remove('active');});
    q('.panel').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active');
    var name=t.getAttribute('data-panel');
    var p=document.querySelector('.panel[data-tab="'+name+'"]');
    if(p){p.classList.add('active');}
    if(name==='map'){ initMap(); if(lmap){ setTimeout(function(){ lmap.invalidateSize(); renderMarkers(); },60); } }
  });});

  // ----- filtros (valem pras 4 abas) -----
  var allBtn=document.querySelector('.chip.showall');
  var cityChips=q('.chip.city');
  var selected=new Set();
  function apply(){
    var on=selected.size>0;
    document.body.classList.toggle('filtering',on);
    if(allBtn){allBtn.classList.toggle('active',!on);}
    cityChips.forEach(function(c){ c.classList.toggle('sel', selected.has(c.getAttribute('data-idx'))); });
    q('[data-idx]').forEach(function(el){
      if(el.classList.contains('chip')) return;
      el.style.display = (!on || selected.has(el.getAttribute('data-idx'))) ? '' : 'none';
    });
    if(mapInited) renderMarkers();
  }
  if(allBtn){allBtn.addEventListener('click',function(){ selected.clear(); apply(); });}
  cityChips.forEach(function(c){ c.addEventListener('click',function(){
    var i=c.getAttribute('data-idx');
    if(selected.has(i)) selected.delete(i); else selected.add(i);
    apply();
  });});

  // ----- mapa (Leaflet + OpenStreetMap) -----
  var mapInited=false, lmap=null, layer=null;
  function popupHtml(m){
    var s = m.url ? '<a href="'+m.url+'" target="_blank" rel="noopener"><b>'+m.name+'</b></a>' : '<b>'+m.name+'</b>';
    if(m.tickets) s += ' <a href="'+m.tickets+'" target="_blank" rel="noopener">🎟️</a>';
    if(m.map) s += ' <a href="'+m.map+'" target="_blank" rel="noopener">📍</a>';
    if(m.address) s += '<div style="color:#666;font-size:12px;margin-top:3px">📍 '+m.address+'</div>';
    return s;
  }
  function renderMarkers(){
    if(!mapInited) return;
    layer.clearLayers();
    var on=selected.size>0, pts=[];
    TRIP_MARKERS.forEach(function(m){
      if(on && !selected.has(String(m.idx))) return;
      var mk=L.circleMarker([m.lat,m.lon],{radius:7,color:'#fff',weight:2,fillColor:m.color,fillOpacity:1});
      mk.bindPopup(popupHtml(m));
      mk.addTo(layer); pts.push([m.lat,m.lon]);
    });
    if(pts.length){ lmap.fitBounds(pts,{padding:[34,34],maxZoom:13}); }
  }
  function initMap(){
    if(mapInited) return;
    if(typeof L==='undefined' || !document.getElementById('map') || !TRIP_MARKERS.length) return;
    lmap=L.map('map',{scrollWheelZoom:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(lmap);
    layer=L.layerGroup().addTo(lmap);
    mapInited=true;
    renderMarkers();
  }
})();
</script>
</body>
</html>
`;
}

export function buildKml(trip) {
  const { cells } = buildDays(trip);
  const marks = [];
  for (const c of cells) {
    for (const it of c.items) {
      if (it.coords && it.coords.length === 2) {
        const [lat, lon] = it.coords;
        marks.push(`    <Placemark>\n      <name>${esc(it.text)}</name>\n      <description>${esc(c.city)}</description>\n      <Point><coordinates>${lon},${lat},0</coordinates></Point>\n    </Placemark>`);
      }
    }
  }
  if (!marks.length) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(trip.title || "Meu Roteiro")}</name>
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
