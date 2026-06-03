// =====================================================================
// render.mjs — motor de geração do roteiro visual (sem dependências de build)
//
// Uso como CLI:   node lib/render.mjs <trip.json> [saida.html]
// Uso como módulo: import { renderTripHtml, buildKml } from "./lib/render.mjs"
//
// 5 abas (Calendário/Roteiro/Transportes/Lugares/Mapa), filtro por cidade,
// e toggle de idioma (inglês + idioma da viagem). Self-contained; as abas
// de conteúdo funcionam offline, a aba Mapa usa tiles do OpenStreetMap.
//
// i18n: defina trip.lang (ex.: "pt"). Inglês ("en") é sempre a alternativa.
// Qualquer texto pode ser bilíngue: { "en": "...", "pt": "..." }.
// =====================================================================

import { readFileSync, writeFileSync } from "node:fs";

const PALETTE = [
  "#0e9e96", "#c0392b", "#2e8b57", "#d98a0b",
  "#7d3cc0", "#3b4bc4", "#1f6feb", "#b8336a",
  "#0f8a8a", "#6b7280",
];
const TRANSIT_COLOR = "#5a5a6e";

// Dicionário de UI por idioma (fallback: en)
const UI = {
  en: { cal: "Calendar", roteiro: "Itinerary", trans: "Transport", places: "Places", map: "Map",
    showAll: "Show all", highlight: "highlight", move: "transfer",
    filterHint: 'Tap a city to see only it (applies to all tabs). "Show all" clears the filter.',
    flights: "Flights", moves: "Transfers along the trip", nights: "nights", base: "base", bases: "bases",
    mapFallback: "🗺️ The live map needs internet — with an eSIM/Wi-Fi it works right here, no app needed. For fully offline use, import the my-trip.kml file into a maps app (Organic Maps, Maps.me, OsmAnd…). The other tabs work offline.",
    wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    mon: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wf: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  pt: { cal: "Calendário", roteiro: "Roteiro", trans: "Transportes", places: "Lugares", map: "Mapa",
    showAll: "Mostrar tudo", highlight: "destaque", move: "deslocamento",
    filterHint: 'Toque numa cidade para ver só ela (vale pras 5 abas). "Mostrar tudo" limpa o filtro.',
    flights: "Voos", moves: "Deslocamentos no roteiro", nights: "noites", base: "base", bases: "bases",
    mapFallback: "🗺️ O mapa ao vivo precisa de internet — com eSIM/Wi-Fi funciona aqui mesmo, sem instalar nada. Só para usar 100% offline, importe o arquivo my-trip.kml num app de mapa (Organic Maps, Maps.me, OsmAnd…). As outras abas funcionam offline.",
    wd: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    mon: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    wf: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] },
  es: { cal: "Calendario", roteiro: "Itinerario", trans: "Transportes", places: "Lugares", map: "Mapa",
    showAll: "Mostrar todo", highlight: "destacado", move: "traslado",
    filterHint: 'Toca una ciudad para ver solo esa (vale para las 5 pestañas). "Mostrar todo" limpia el filtro.',
    flights: "Vuelos", moves: "Traslados del viaje", nights: "noches", base: "base", bases: "bases",
    mapFallback: "🗺️ El mapa en vivo necesita internet — con eSIM/Wi-Fi funciona aquí mismo, sin instalar nada. Solo para uso 100% sin conexión, importa el archivo my-trip.kml en una app de mapas (Organic Maps, Maps.me, OsmAnd…). Las otras pestañas funcionan sin conexión.",
    wd: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    mon: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    wf: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] },
  fr: { cal: "Calendrier", roteiro: "Itinéraire", trans: "Transports", places: "Lieux", map: "Carte",
    showAll: "Tout afficher", highlight: "incontournable", move: "trajet",
    filterHint: 'Touchez une ville pour ne voir qu’elle (vaut pour les 5 onglets). "Tout afficher" réinitialise.',
    flights: "Vols", moves: "Trajets du voyage", nights: "nuits", base: "base", bases: "bases",
    mapFallback: "🗺️ La carte en direct a besoin d’internet — avec une eSIM/Wi-Fi elle marche ici même, sans appli. Pour un usage 100% hors ligne, importez le fichier my-trip.kml dans une appli de cartes (Organic Maps, Maps.me, OsmAnd…). Les autres onglets fonctionnent hors ligne.",
    wd: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    mon: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
    wf: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] },
  de: { cal: "Kalender", roteiro: "Reiseplan", trans: "Transport", places: "Orte", map: "Karte",
    showAll: "Alle zeigen", highlight: "Highlight", move: "Transfer",
    filterHint: 'Tippe eine Stadt an, um nur sie zu sehen (gilt für alle 5 Tabs). "Alle zeigen" setzt zurück.',
    flights: "Flüge", moves: "Transfers der Reise", nights: "Nächte", base: "Basis", bases: "Basen",
    mapFallback: "🗺️ Die Live-Karte braucht Internet — mit eSIM/WLAN funktioniert sie direkt hier, ohne App. Nur für 100% offline importiere die Datei my-trip.kml in eine Karten-App (Organic Maps, Maps.me, OsmAnd…). Die anderen Tabs funktionieren offline.",
    wd: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    mon: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    wf: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] },
  it: { cal: "Calendario", roteiro: "Itinerario", trans: "Trasporti", places: "Luoghi", map: "Mappa",
    showAll: "Mostra tutto", highlight: "imperdibile", move: "spostamento",
    filterHint: 'Tocca una città per vedere solo quella (vale per le 5 schede). "Mostra tutto" azzera.',
    flights: "Voli", moves: "Spostamenti del viaggio", nights: "notti", base: "base", bases: "basi",
    mapFallback: "🗺️ La mappa dal vivo ha bisogno di internet — con eSIM/Wi-Fi funziona qui, senza app. Solo per l’uso 100% offline importa il file my-trip.kml in un’app di mappe (Organic Maps, Maps.me, OsmAnd…). Le altre schede funzionano offline.",
    wd: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    mon: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    wf: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"] },
};
const LANG_LABEL = { en: "English", pt: "Português", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", zh: "中文", ja: "日本語" };

// textos do bloco "Google My Maps" da aba Mapa (fallback: en)
const MAPTOOLS = {
  en: { dl: "⬇️ Download points (.kml)", my: "🗺️ Open Google My Maps", tip: "Download the .kml, then in My Maps: Create map → Import → upload the file → all points appear (no app)." },
  pt: { dl: "⬇️ Baixar pontos (.kml)", my: "🗺️ Abrir Google My Maps", tip: "Baixe o .kml e, no My Maps: Criar mapa → Importar → suba o arquivo → todos os pontos aparecem (sem app)." },
  es: { dl: "⬇️ Descargar puntos (.kml)", my: "🗺️ Abrir Google My Maps", tip: "Descarga el .kml y, en My Maps: Crear mapa → Importar → sube el archivo → aparecen todos los puntos (sin app)." },
  fr: { dl: "⬇️ Télécharger les points (.kml)", my: "🗺️ Ouvrir Google My Maps", tip: "Téléchargez le .kml puis, dans My Maps : Créer une carte → Importer → envoyer le fichier → tous les points apparaissent (sans appli)." },
  de: { dl: "⬇️ Punkte laden (.kml)", my: "🗺️ Google My Maps öffnen", tip: "Lade die .kml und in My Maps: Karte erstellen → Importieren → Datei hochladen → alle Punkte erscheinen (ohne App)." },
  it: { dl: "⬇️ Scarica punti (.kml)", my: "🗺️ Apri Google My Maps", tip: "Scarica il .kml e in My Maps: Crea mappa → Importa → carica il file → compaiono tutti i punti (senza app)." },
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const parseDate = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const mondayIndex = (date) => (date.getUTCDay() + 6) % 7;
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const dd = (d) => String(d.getUTCDate()).padStart(2, "0");
const mm = (d) => String(d.getUTCMonth() + 1).padStart(2, "0");
const uiStr = (lang, key) => ((UI[lang] || UI.en)[key] ?? UI.en[key]);

// pega o texto de um valor (string ou {en,xx}) num idioma
const tx = (v, lang) => (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] ?? v.en ?? Object.values(v)[0] ?? "") : (v ?? "");
const isBi = (v) => v && typeof v === "object" && !Array.isArray(v);

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
    const color = stop.color || (isTransit ? TRANSIT_COLOR : PALETTE[cities.filter((c) => !c.transit).length % PALETTE.length]);
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
      } else {
        if (highlights.length) {
          const mine = highlights.filter((_, hi) => hi % nights === i);
          items.push(...(mine.length ? mine : [{ type: "bullet", text: { en: `Free time in ${cityKey}`, pt: `Tempo livre em ${cityKey}` } }]));
        } else {
          items.push({ type: "bullet", text: { en: `Explore ${cityKey}`, pt: `Explorar ${cityKey}` } });
        }
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
  const primary = trip.lang && UI ? String(trip.lang) : (trip.lang || "en");
  const PRIMARY = primary || "en";
  const LANGS = PRIMARY === "en" ? ["en"] : ["en", PRIMARY];
  const multi = LANGS.length > 1;

  const nameIdx = new Map();
  cities.forEach((c) => { if (!nameIdx.has(c.key)) nameIdx.set(c.key, nameIdx.size); });

  // helpers de render bilíngue
  const span = (l, t) => `<span data-l="${l}">${esc(t)}</span>`;
  const bi = (v) => isBi(v) ? LANGS.map((l) => span(l, tx(v, l))).join("") : esc(v);
  const uiBi = (key) => LANGS.map((l) => span(l, uiStr(l, key))).join("");
  const mtBi = (key) => LANGS.map((l) => span(l, (MAPTOOLS[l] || MAPTOOLS.en)[key])).join("");
  const dateChip = (date) => LANGS.map((l) => { const U = UI[l] || UI.en; return span(l, `${U.mon[date.getUTCMonth()]} · ${U.wd[mondayIndex(date)]}`); }).join("");
  const dateLine = (date) => LANGS.map((l) => { const U = UI[l] || UI.en; return span(l, `${dd(date)}/${mm(date)} ${U.wd[mondayIndex(date)]}`); }).join("");

  function itemInner(it) {
    const main = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${bi(it.text)}</a>` : bi(it.text);
    let extra = "";
    if (it.tickets) extra += ` <a class="lk" href="${esc(it.tickets)}" target="_blank" rel="noopener" title="🎟️">🎟️</a>`;
    const mapHref = it.map || (it.coords ? mapLinkFor(it.coords, provider) : null);
    if (mapHref) extra += ` <a class="lk" href="${esc(mapHref)}" target="_blank" rel="noopener" title="📍">📍</a>`;
    return main + extra;
  }

  // endereço clicável → abre no Google Maps (busca pelo endereço)
  const addrLink = (address, cls) => address
    ? `<div class="${cls}"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tx(address, PRIMARY))}" target="_blank" rel="noopener">📍 ${bi(address)}</a></div>`
    : "";

  // markers do mapa
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
  const kmlStr = hasMap ? (buildKml(trip) || "") : "";        // KML embutido p/ baixar offline
  const kmlJson = JSON.stringify(kmlStr).replace(/</g, "\\u003c");

  // ----- componentes -----
  const filterChips = () => {
    const seen = new Set();
    const out = [`<button class="chip showall active">${uiBi("showAll")}</button>`];
    for (const c of cities) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      out.push(`<button class="chip city" data-idx="${nameIdx.get(c.key)}"><span class="dot" style="background:${c.color}"></span>${bi(c.raw)} · ${c.nights}n</button>`);
    }
    out.push(`<span class="chip info">★ ${uiBi("highlight")}</span>`);
    out.push(`<span class="chip info">→ ${uiBi("move")}</span>`);
    return out.join("\n      ");
  };

  const liClass = (it) => (it.type === "star" ? " class=\"star\"" : it.type === "move" ? " class=\"move\"" : "");

  const dayCard = (c) => {
    const idx = nameIdx.get(c.cityKey);
    const col = mondayIndex(c.date) + 1;
    const lis = c.items.map((it) => `<li${liClass(it)}>${itemInner(it)}</li>`).join("");
    return `<div class="day" data-idx="${idx}" style="--c:${col}">
      <div class="cell-top" style="background:${c.color}"><span class="date">${dd(c.date)}</span><span class="wknum">${dateChip(c.date)}</span></div>
      <div class="cell-city" style="background:${c.color}">${bi(c.cityRaw)}${c.suffix}</div>
      <div class="cell-body"><ul>${lis}</ul></div>
    </div>`;
  };

  const roteiroPanel = () => cells.map((c) => {
    const idx = nameIdx.get(c.cityKey);
    const head = `<div class="rt-head"><span class="rt-date">${dateLine(c.date)}</span><span class="rt-city" style="color:${c.color}">${bi(c.cityRaw)}${c.suffix}</span></div>`;
    const note = c.note ? `<p class="rt-note">${bi(c.note)}</p>` : "";
    const lis = c.items.map((it) => {
      const a = addrLink(it.address, "rt-addr");
      const n = it.note ? `<div class="rt-itemnote">${bi(it.note)}</div>` : "";
      return `<li${liClass(it)}>${itemInner(it)}${a}${n}</li>`;
    }).join("");
    return `<div class="rt-day" data-idx="${idx}">${head}${note}<ul class="rt-items">${lis}</ul></div>`;
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
        if (it.type === "move") rows.push(`<div class="tl-row" data-idx="${idx}"><span class="tl-date">${dateLine(c.date)}</span><span class="dot" style="background:${c.color}"></span><span class="tl-txt">${itemInner(it)}</span></div>`);
      }
    }
    if (rows.length) html += `<h2 class="sec">🧭 ${uiBi("moves")}</h2><div class="tl">${rows.join("\n")}</div>`;
    return html || `<p class="empty-msg">—</p>`;
  };

  const placesPanel = () => {
    const groups = [];
    for (const c of cells) {
      const last = groups[groups.length - 1];
      if (last && last.key === c.cityKey && last.transit === c.transit) last.cells.push(c);
      else groups.push({ key: c.cityKey, raw: c.cityRaw, color: c.color, transit: c.transit, cells: [c] });
    }
    const blocks = [];
    for (const g of groups) {
      if (g.transit) continue;
      const idx = nameIdx.get(g.key);
      const first = g.cells[0].date, last = g.cells[g.cells.length - 1].date;
      const range = g.cells.length > 1 ? `${dd(first)}–${dd(last)}/${mm(last)}` : dateLine(first);
      let daysHtml = "";
      for (const c of g.cells) {
        const places = c.items.filter((it) => it.type !== "move");
        if (!places.length) continue;
        const lis = places.map((it) => `<li${it.type === "star" ? " class=\"star\"" : ""}>${itemInner(it)}${addrLink(it.address, "pl-addr")}</li>`).join("");
        daysHtml += `<div class="pl-day"><span class="pl-d">${dateLine(c.date)}</span><ul>${lis}</ul></div>`;
      }
      if (!daysHtml) continue;
      blocks.push(`<div class="pl-group" data-idx="${idx}"><div class="pl-city"><span class="dot" style="background:${g.color}"></span>${bi(g.raw)} <span class="pl-dates">${typeof range === "string" ? range : range}</span></div>${daysHtml}</div>`);
    }
    return blocks.join("\n") || `<p class="empty-msg">—</p>`;
  };

  // header
  const route = trip.stops.filter((s) => !s.transit).map((s) => bi(s.city)).join(" → ");
  const bases = cities.filter((c) => !c.transit).length;
  const nights = cities.reduce((a, c) => a + (c.transit ? 0 : c.nights), 0);
  const f = cells[0].date, l = cells[cells.length - 1].date;
  const metaNights = LANGS.map((lg) => span(lg, `${nights} ${uiStr(lg, "nights")} · ${bases} ${uiStr(lg, bases === 1 ? "base" : "bases")}`)).join("");
  const dateRange = `${dd(f)}/${mm(f)}/${f.getUTCFullYear()} → ${dd(l)}/${mm(l)}/${l.getUTCFullYear()}`;
  const pageTitle = tx(trip.title, PRIMARY) || "Trip";

  const langVisCss = LANGS.map((lg) => `body[data-lang="${lg}"] [data-l="${lg}"]{display:revert}`).join("\n  ");
  const langBar = multi ? `<div class="langbar">${LANGS.map((lg) => `<button class="lang${lg === PRIMARY ? " active" : ""}" data-lang="${lg}">${esc(LANG_LABEL[lg] || lg.toUpperCase())}</button>`).join("")}</div>` : "";

  const leafletHead = hasMap
    ? `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>`
    : "";
  const mapTab = hasMap ? `<button class="tab" data-panel="map">🗺️ ${uiBi("map")}</button>` : "";
  const mapPanel = hasMap ? `<div class="panel" data-tab="map">
    <div class="map-tools">
      <button class="map-btn" id="dlkml">${mtBi("dl")}</button>
      <a class="map-btn ghost" href="https://www.google.com/mymaps" target="_blank" rel="noopener">${mtBi("my")}</a>
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
<title>${esc(pageTitle)}</title>
${leafletHead}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1a2e; background: #f4f4f8; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-l] { display: none; }
  ${langVisCss}

  .langbar { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 8px; }
  .lang { -webkit-appearance: none; appearance: none; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 12px; border-radius: 20px; border: 1px solid #d9d9e3; background: #fff; color: #555; }
  .lang.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }

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
  .tl-date { font-weight: 700; min-width: 84px; color: #555; font-size: 12px; }
  .tl-txt { flex: 1; }
  .pl-city { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; margin: 18px 0 6px; }
  .pl-group:first-child .pl-city { margin-top: 0; }
  .pl-dates { font-weight: 600; font-size: 12px; color: #999; }
  .pl-day { display: flex; gap: 12px; padding: 6px 0 6px 16px; border-left: 2px solid #eee; margin-left: 5px; }
  .pl-d { min-width: 82px; font-size: 12px; font-weight: 700; color: #666; padding-top: 1px; }
  .pl-day ul { list-style: none; flex: 1; }
  .pl-day li { font-size: 13.5px; line-height: 1.45; margin-bottom: 3px; padding-left: 14px; position: relative; }
  .pl-day li::before { content: "•"; position: absolute; left: 0; color: #b3b3c0; }
  .pl-day li.star { font-weight: 700; }
  .pl-day li.star::before { content: "★"; color: #e6a817; }
  .pl-addr { font-size: 12px; color: #8a8a98; margin-top: 1px; }
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

  .map-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; }
  .map-btn { -webkit-appearance: none; appearance: none; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 7px 12px; border-radius: 8px; border: 1px solid #1f6feb; background: #1f6feb; color: #fff; text-decoration: none; }
  .map-btn.ghost { background: #fff; color: #1f6feb; }
  .map-tip { font-size: 11.5px; color: #888; flex: 1 1 100%; line-height: 1.4; }
  .mapbox { height: 68vh; min-height: 360px; border-radius: 12px; overflow: hidden; border: 1px solid #e6e6ee; background: #e8edf3; }
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
    .langbar, .tabs, .filterbar, .filter-hint { display: none; }
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
<body data-lang="${esc(PRIMARY)}">

  ${langBar}

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

  <div class="tabs">
    <button class="tab active" data-panel="cal">📅 ${uiBi("cal")}</button>
    <button class="tab" data-panel="roteiro">🗒️ ${uiBi("roteiro")}</button>
    <button class="tab" data-panel="trans">🚆 ${uiBi("trans")}</button>
    <button class="tab" data-panel="places">📍 ${uiBi("places")}</button>
    ${mapTab}
  </div>

  <div class="filterbar">
      ${filterChips()}
  </div>
  <div class="filter-hint">${uiBi("filterHint")}</div>

  <div class="panel active" data-tab="cal">
    <div class="weekhdr">${weekHeader}</div>
    <div class="cal">
      ${cells.map(dayCard).join("\n      ")}
    </div>
  </div>

  <div class="panel" data-tab="roteiro">
    ${roteiroPanel()}
  </div>

  <div class="panel" data-tab="trans">
    ${transportPanel()}
  </div>

  <div class="panel" data-tab="places">
    ${placesPanel()}
  </div>

  ${mapPanel}

  <div class="footer">${trip.footer ? bi(trip.footer) : ""}</div>

<script>
var TRIP_MARKERS = ${markersJson};
var TRIP_KML = ${kmlJson};
(function(){
  function q(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}

  // baixar o KML (funciona offline — está embutido no HTML)
  var dl=document.getElementById('dlkml');
  if(dl && TRIP_KML){dl.addEventListener('click',function(){
    var blob=new Blob([TRIP_KML],{type:'application/vnd.google-earth.kml+xml'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download='my-trip.kml';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  });}
  function curLang(){return document.body.getAttribute('data-lang');}
  function L(v){ return (v && typeof v==='object') ? (v[curLang()]||v.en||Object.values(v)[0]||'') : (v||''); }

  // idioma
  q('.lang').forEach(function(b){b.addEventListener('click',function(){
    q('.lang').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    document.body.setAttribute('data-lang', b.getAttribute('data-lang'));
    if(mapInited) renderMarkers();
  });});

  // abas
  q('.tab').forEach(function(t){t.addEventListener('click',function(){
    q('.tab').forEach(function(x){x.classList.remove('active');});
    q('.panel').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active');
    var name=t.getAttribute('data-panel');
    var p=document.querySelector('.panel[data-tab="'+name+'"]');
    if(p){p.classList.add('active');}
    if(name==='map'){ initMap(); if(lmap){ setTimeout(function(){ lmap.invalidateSize(); renderMarkers(); },60); } }
  });});

  // filtros (valem pras 5 abas)
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

  // mapa
  var mapInited=false, lmap=null, layer=null;
  function popupHtml(m){
    var nm=L(m.name);
    var s = m.url ? '<a href="'+m.url+'" target="_blank" rel="noopener"><b>'+nm+'</b></a>' : '<b>'+nm+'</b>';
    if(m.tickets) s += ' <a href="'+m.tickets+'" target="_blank" rel="noopener">🎟️</a>';
    if(m.address) s += '<div style="color:#666;font-size:12px;margin-top:3px">📍 '+L(m.address)+'</div>';
    // "Abrir em": app de mapa do aparelho (geo:), Google Maps, OpenStreetMap
    var geo='geo:'+m.lat+','+m.lon+'?q='+m.lat+','+m.lon+'('+encodeURIComponent(nm)+')';
    var g='https://www.google.com/maps/search/?api=1&query='+m.lat+','+m.lon;
    var osm='https://www.openstreetmap.org/?mlat='+m.lat+'&mlon='+m.lon+'#map=16/'+m.lat+'/'+m.lon;
    s += '<div style="margin-top:6px;font-size:12px">↪ <a href="'+geo+'">📱 app de mapa</a> · <a href="'+g+'" target="_blank" rel="noopener">Google Maps</a> · <a href="'+osm+'" target="_blank" rel="noopener">OSM</a></div>';
    return s;
  }
  function renderMarkers(){
    if(!mapInited) return;
    layer.clearLayers();
    var on=selected.size>0, pts=[];
    TRIP_MARKERS.forEach(function(m){
      if(on && !selected.has(String(m.idx))) return;
      var mk=L_marker(m); mk.addTo(layer); pts.push([m.lat,m.lon]);
    });
    if(pts.length){ lmap.fitBounds(pts,{padding:[34,34],maxZoom:13}); }
  }
  function L_marker(m){
    var mk=window.L.circleMarker([m.lat,m.lon],{radius:7,color:'#fff',weight:2,fillColor:m.color,fillOpacity:1});
    mk.bindPopup(popupHtml(m));
    return mk;
  }
  function initMap(){
    if(mapInited) return;
    if(typeof window.L==='undefined' || !document.getElementById('map') || !TRIP_MARKERS.length) return;
    lmap=window.L.map('map',{scrollWheelZoom:true});
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(lmap);
    layer=window.L.layerGroup().addTo(lmap);
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
