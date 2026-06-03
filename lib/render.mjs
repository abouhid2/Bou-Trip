// =====================================================================
// render.mjs — motor de geração do roteiro visual (sem dependências)
//
// Uso como CLI:   node lib/render.mjs <trip.json> [saida.html]
// Uso como módulo: import { renderTripHtml } from "./lib/render.mjs"
//
// O "trip" é um objeto JSON; veja trip.example.json para o formato.
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

// Normaliza um item de dia: string vira bullet; objeto preserva extras (link/ingresso/coords)
function normItem(it) {
  if (typeof it === "string") return { type: "bullet", text: it };
  return {
    type: it.type || "bullet",
    text: it.text || "",
    url: it.url || null,         // página do lugar (info/oficial)
    tickets: it.tickets || null, // link para comprar ingressos
    map: it.map || null,         // link de mapa explícito (opcional)
    coords: Array.isArray(it.coords) ? it.coords : null, // [lat, lon] WGS-84
  };
}

// Links de mapa. Padrão Google Maps (familiar, funciona na maior parte do mundo).
// Em viagens para a China continental use "maps":"osm" — lá o Google é bloqueado e
// desloca as coordenadas (GCJ-02); OpenStreetMap usa o GPS real (WGS-84).
const osmLink = ([lat, lon]) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
const googleLink = ([lat, lon]) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const mapLinkFor = (coords, provider) => (provider === "osm" ? osmLink(coords) : googleLink(coords));

// HTML interno de um item: texto (vira link se houver url) + 🎟️ ingressos + 📍 mapa
function itemInner(it, provider) {
  const txt = esc(it.text);
  const main = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${txt}</a>` : txt;
  let extra = "";
  if (it.tickets) extra += ` <a class="lk" href="${esc(it.tickets)}" target="_blank" rel="noopener" title="Comprar ingressos">🎟️</a>`;
  const mapHref = it.map || (it.coords ? mapLinkFor(it.coords, provider) : null);
  if (mapHref) extra += ` <a class="lk" href="${esc(mapHref)}" target="_blank" rel="noopener" title="Ver no mapa">📍</a>`;
  return main + extra;
}

// Expande as paradas (stops) em células de dia com datas sequenciais.
export function buildDays(trip) {
  if (!trip.startDate) throw new Error("trip.startDate é obrigatório (formato AAAA-MM-DD)");
  if (!Array.isArray(trip.stops) || !trip.stops.length) throw new Error("trip.stops precisa de pelo menos uma parada");

  const start = parseDate(trip.startDate);
  const cities = [];
  const cells = [];
  let offset = 0;

  trip.stops.forEach((stop, si) => {
    const nights = Math.max(1, Number(stop.nights) || 1);
    const isTransit = !!stop.transit;
    const color = stop.color || (isTransit ? TRANSIT_COLOR : PALETTE[cities.filter((c) => !c.transit).length % PALETTE.length]);
    cities.push({ name: stop.city, color, nights, transit: isTransit });

    const highlights = (stop.highlights || []).map(normItem);

    for (let i = 0; i < nights; i++) {
      const date = addDays(start, offset++);
      let items = [];

      // 1) itens explícitos por dia (stop.days[i]) têm prioridade
      if (Array.isArray(stop.days) && stop.days[i]) {
        items = stop.days[i].map(normItem);
      } else {
        // 2) auto: chegada no 1º dia + distribui destaques (round-robin)
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
      cells.push({ date, city: label, color, items, transit: isTransit });
    }
  });

  return { cities, cells, start, end: addDays(start, offset - 1) };
}

function legendChips(cities) {
  const seen = new Set();
  const chips = [];
  for (const c of cities) {
    const key = c.name + c.color;
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(`<span class="chip"><span class="dot" style="background:${c.color}"></span>${esc(c.name)} · ${c.nights}n</span>`);
  }
  chips.push('<span class="chip">★ destaque</span>');
  chips.push('<span class="chip">→ deslocamento</span>');
  return chips.join("\n    ");
}

function dayCard(cell, provider) {
  const d = cell.date;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const wk = `${MON[d.getUTCMonth()]} · ${WD[mondayIndex(d)]}`;
  const lis = cell.items.map((it) => {
    const cls = it.type === "star" ? " class=\"star\"" : it.type === "move" ? " class=\"move\"" : "";
    return `<li${cls}>${itemInner(it, provider)}</li>`;
  }).join("");
  return `<div class="day">
      <div class="cell-top" style="background:${cell.color}"><span class="date">${dd}</span><span class="wknum">${wk}</span></div>
      <div class="cell-city" style="background:${cell.color}">${esc(cell.city)}</div>
      <div class="cell-body"><ul>${lis}</ul></div>
    </div>`;
}

function flightsSection(flights) {
  if (!Array.isArray(flights) || !flights.length) return "";
  const rows = flights.map((f) => {
    const parts = [f.date, f.flightNo, [f.from, f.to].filter(Boolean).join(" → "), [f.dep, f.arr].filter(Boolean).join(" → "), f.note]
      .filter(Boolean).map(esc).join("</td><td>");
    return `<tr><td>${parts}</td></tr>`;
  }).join("\n");
  return `
  <h2 class="sec">✈️ Voos</h2>
  <table class="flights"><tbody>
${rows}
  </tbody></table>`;
}

export function renderTripHtml(trip) {
  const { cities, cells } = buildDays(trip);
  const provider = trip.maps === "osm" ? "osm" : "google"; // China continental: use "osm"
  const lead = mondayIndex(cells[0].date); // espaçadores antes do 1º dia (grade desktop)
  const empties = Array.from({ length: lead }, () => '<div class="empty"></div>').join("");
  const route = trip.stops.filter((s) => !s.transit).map((s) => esc(s.city)).join(" → ");
  const bases = cities.filter((c) => !c.transit).length;
  const nights = cities.reduce((a, c) => a + (c.transit ? 0 : c.nights), 0);
  const f = cells[0].date, l = cells[cells.length - 1].date;
  const fmt = (d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(trip.title || "Meu Roteiro")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1a2e; background: #f4f4f8; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: flex; flex-direction: column; gap: 6px; background: linear-gradient(125deg, #c0392b 0%, #8e2de2 55%, #1f6feb 100%); color: #fff; padding: 14px 16px; border-radius: 12px; margin-bottom: 12px; }
  .header h1 { font-size: 20px; line-height: 1.2; }
  .header .sub { font-size: 12px; opacity: .93; line-height: 1.4; }
  .header .meta { font-size: 11px; line-height: 1.55; opacity: .95; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 20px; background: #fff; border: 1px solid rgba(0,0,0,.08); }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .weekhdr { display: none; }
  .cal { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .day { border-radius: 12px; border: 1px solid #e6e6ee; background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(20,20,40,.05); }
  .empty { display: none; }
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
  .cell-body a { color: inherit; text-decoration: underline; text-decoration-color: rgba(31,111,235,.45); text-underline-offset: 2px; }
  .cell-body a:hover { text-decoration-color: #1f6feb; }
  .cell-body a.lk { text-decoration: none; font-size: .9em; opacity: .85; }
  .cell-body a.lk:hover { opacity: 1; }
  .sec { font-size: 14px; margin: 16px 0 8px; color: #1a1a2e; }
  table.flights { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; font-size: 12.5px; }
  table.flights td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  table.flights tr:last-child td { border-bottom: none; }
  .footer { margin-top: 14px; font-size: 11px; color: #888; text-align: center; line-height: 1.5; }
  @media (min-width: 620px) { .cal { grid-template-columns: repeat(2, 1fr); } .header { flex-direction: row; align-items: center; justify-content: space-between; } .header .meta { text-align: right; } }
  @media (min-width: 1000px) {
    body { padding: 14px; }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 5px; }
    .empty { display: block; min-height: 120px; box-shadow: none; background: repeating-linear-gradient(45deg,#fafafc,#fafafc 6px,#f2f2f7 6px,#f2f2f7 12px); border: 1px solid #eee; }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 5px; }
    .weekhdr div { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #555; font-weight: 700; text-align: center; }
    .day { box-shadow: none; }
    .cell-top { padding: 5px 8px; } .cell-top .date { font-size: 15px; } .cell-top .wknum { font-size: 9px; }
    .cell-city { font-size: 9px; padding: 2px 8px; }
    .cell-body { padding: 6px 8px 7px; } .cell-body li { font-size: 9.5px; line-height: 1.34; margin-bottom: 2px; padding-left: 10px; }
  }
  @media print {
    @page { size: A4 landscape; margin: 7mm; }
    body { padding: 0; background: #fff; }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
    .weekhdr div { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #555; font-weight: 700; text-align: center; }
    .empty { display: block; min-height: 116px; box-shadow: none; background: repeating-linear-gradient(45deg,#fafafc,#fafafc 6px,#f2f2f7 6px,#f2f2f7 12px); border: 1px solid #eee; }
    .day { box-shadow: none; break-inside: avoid; }
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
      <div>${fmt(f)} → ${fmt(l)}</div>
    </div>
  </div>

  <div class="legend">
    ${legendChips(cities)}
  </div>

  <div class="weekhdr">
    <div>Segunda</div><div>Terça</div><div>Quarta</div><div>Quinta</div><div>Sexta</div><div>Sábado</div><div>Domingo</div>
  </div>

  <div class="cal">
    ${empties}
    ${cells.map((c) => dayCard(c, provider)).join("\n    ")}
  </div>
${flightsSection(trip.flights)}
  <div class="footer">${esc(trip.footer || "Gerado com trip-template · edite trip.json e rode novamente para atualizar")}</div>

</body>
</html>
`;
}

// Gera um KML com todos os itens que têm coords — para ver os pontos num mapa e usar offline.
// KML é universal: Organic Maps, Maps.me, Google My Maps, Google Earth. Retorna null se não houver coords.
export function buildKml(trip) {
  const { cells } = buildDays(trip);
  const marks = [];
  for (const c of cells) {
    for (const it of c.items) {
      if (it.coords && it.coords.length === 2) {
        const [lat, lon] = it.coords; // KML usa lon,lat
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
