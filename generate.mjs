#!/usr/bin/env node
// =====================================================================
// generate.mjs — assistente de terminal para montar seu roteiro
//
//   node generate.mjs
//
// Faz perguntas, salva trip.json e gera my-trip.html (sem dependências).
// =====================================================================

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { renderTripHtml } from "./lib/render.mjs";

const rl = createInterface({ input, output });
const C = { b: "\x1b[1m", d: "\x1b[2m", g: "\x1b[32m", c: "\x1b[36m", y: "\x1b[33m", r: "\x1b[0m" };

async function ask(q, def = "") {
  const hint = def ? ` ${C.d}(${def})${C.r}` : "";
  const a = (await rl.question(`${C.c}?${C.r} ${q}${hint}: `)).trim();
  return a || def;
}
async function askYes(q, def = false) {
  const a = (await ask(`${q} ${def ? "[S/n]" : "[s/N]"}`)).toLowerCase();
  if (!a) return def;
  return a.startsWith("s") || a.startsWith("y");
}
function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime()); }
async function askDate(q, def = "") {
  while (true) {
    const a = await ask(q, def);
    if (isDate(a)) return a;
    console.log(`  ${C.y}↳ use o formato AAAA-MM-DD, ex.: 2026-10-10${C.r}`);
  }
}

console.log(`\n${C.b}🧳 Montador de Roteiro${C.r} ${C.d}— responda e geramos seu calendário em HTML${C.r}\n`);

const trip = {};
trip.title = await ask("Nome da viagem", "Minha Viagem");
trip.emoji = await ask("Emoji do título", "🧳");
trip.travelers = await ask("Quem vai (ex.: Alex & Bia) — opcional", "");
trip.startDate = await askDate("Data de início (1º dia)", "");

console.log(`\n${C.b}Paradas${C.r} ${C.d}— cidade por cidade, na ordem da viagem. Enter vazio para terminar.${C.r}`);
trip.stops = [];
while (true) {
  const n = trip.stops.length + 1;
  const city = await ask(`Parada ${n} — cidade`, "");
  if (!city) {
    if (trip.stops.length) break;
    console.log(`  ${C.y}↳ adicione ao menos uma parada${C.r}`);
    continue;
  }
  const nights = Math.max(1, parseInt(await ask("  Quantas noites", "1"), 10) || 1);
  const hl = await ask("  Destaques (separe por vírgula) — opcional", "");
  const highlights = hl ? hl.split(",").map((s) => ({ type: "star", text: s.trim() })).filter((x) => x.text) : [];
  const stop = { city, nights };
  if (highlights.length) stop.highlights = highlights;
  trip.stops.push(stop);
  console.log(`  ${C.g}✓${C.r} ${city} · ${nights}n${highlights.length ? ` · ${highlights.length} destaque(s)` : ""}`);
}

if (await askYes("\nQuer registrar voos/trens?", false)) {
  console.log(`${C.d}— um por linha; Enter vazio na data para terminar.${C.r}`);
  trip.flights = [];
  while (true) {
    const date = await ask(`Voo ${trip.flights.length + 1} — data (AAAA-MM-DD)`, "");
    if (!date) break;
    const flightNo = await ask("  Nº do voo/trem (ex.: TK216)", "");
    const from = await ask("  De", "");
    const to = await ask("  Para", "");
    const dep = await ask("  Saída (hh:mm)", "");
    const arr = await ask("  Chegada (hh:mm)", "");
    trip.flights.push({ date, flightNo, from, to, dep, arr });
    console.log(`  ${C.g}✓${C.r} ${[date, flightNo, `${from}→${to}`].filter(Boolean).join(" · ")}`);
  }
}

rl.close();

// salva config + gera HTML
const jsonPath = "trip.json";
if (existsSync(jsonPath) && readFileSync(jsonPath, "utf8").trim()) {
  writeFileSync("trip.backup.json", readFileSync(jsonPath, "utf8"));
}
writeFileSync(jsonPath, JSON.stringify(trip, null, 2));
const outPath = "my-trip.html";
writeFileSync(outPath, renderTripHtml(trip));

console.log(`\n${C.g}${C.b}✅ Pronto!${C.r}`);
console.log(`   ${C.b}${outPath}${C.r} — abra no navegador (ou imprima como PDF, A4 paisagem)`);
console.log(`   ${C.b}${jsonPath}${C.r}  — seus dados; edite e rode ${C.c}node lib/render.mjs trip.json${C.r} para atualizar`);
console.log(`\n${C.d}Dica: para detalhar um dia específico, edite "days" daquela parada no trip.json.${C.r}\n`);
