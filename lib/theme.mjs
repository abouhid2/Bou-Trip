// =====================================================================
// theme.mjs — design tokens + folha de estilo do roteiro.
//
// Regra: nenhum componente usa cor/espaçamento cru. Tudo sai dos tokens
// abaixo. As cores de cidade são dado da viagem, não token: entram como
// a custom property --city em cada elemento.
//
// Um token do :root não pode derivar de --city (ex.: color-mix(... var(--city))):
// custom property com var() é substituída no elemento onde é declarada, e no
// :root --city ainda não existe — o valor sairia inválido. Por isso o :root
// guarda só a % (--city-lighten) e a mistura acontece onde --city existe.
// =====================================================================

// Paleta de cidades: matizes distinguíveis entre si, todas legíveis com
// texto branco por cima (contraste >= 4.5:1) e estáveis nos dois temas.
export const CITY_PALETTE = [
  "#0d9488", "#e11d48", "#059669", "#d97706",
  "#7c3aed", "#4f46e5", "#0284c7", "#db2777",
  "#0891b2", "#64748b",
];
export const TRANSIT_COLOR = "#6b7280";

const TOKENS_LIGHT = `
    --bg: #f5f6fa;
    --bg-blur: rgba(245, 246, 250, .82);
    --surface: #ffffff;
    --surface-2: #f0f1f6;
    --text: #14142b;
    --text-2: #43435c;
    --muted: #8585a0;
    --border: #e6e7f0;
    --border-strong: #d3d4e0;
    --accent: #4f46e5;
    --accent-fg: #ffffff;
    --accent-soft: rgba(79, 70, 229, .10);
    --star: #d99b0b;
    --shadow-sm: 0 1px 2px rgba(18, 18, 45, .05), 0 1px 3px rgba(18, 18, 45, .04);
    --shadow-md: 0 4px 14px rgba(18, 18, 45, .08);
    --shadow-lg: 0 14px 34px rgba(18, 18, 45, .14);
    --city-lighten: 0%;
    --tile-filter: none;`;

const TOKENS_DARK = `
    --bg: #0a0a12;
    --bg-blur: rgba(10, 10, 18, .82);
    --surface: #14141f;
    --surface-2: #1c1c2b;
    --text: #ececf5;
    --text-2: #b4b4c8;
    --muted: #7e7e97;
    --border: #262636;
    --border-strong: #333349;
    --accent: #7c74ff;
    --accent-fg: #0a0a12;
    --accent-soft: rgba(124, 116, 255, .16);
    --star: #f5c451;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, .4);
    --shadow-md: 0 4px 14px rgba(0, 0, 0, .45);
    --shadow-lg: 0 14px 34px rgba(0, 0, 0, .6);
    --city-lighten: 42%;
    --tile-filter: invert(1) hue-rotate(180deg) brightness(.94) contrast(.86) saturate(.75);`;

// Escuro é o padrão; data-theme="light" no <html> troca para o tema claro.
const themeCss = () => `
  :root {
    color-scheme: dark;${TOKENS_DARK}

    --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px;
    --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-full: 999px;
    --ease: cubic-bezier(.22, .78, .28, 1);
    --dur-fast: 110ms; --dur: 210ms;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
    --tap: 44px;
  }
  :root[data-theme="light"] { color-scheme: light;${TOKENS_LIGHT}
  }`;

export function buildCss({ langVisCss }) {
  return `${themeCss()}

  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* O filtro por cidade esconde via atributo [hidden], que a folha do navegador
     aplica como display:none — mas QUALQUER display de autor ganha dela. Como
     .tl-row é flex e .day é grid, eles reapareciam e a aba Transportes nunca
     filtrou. Esta regra tem que vir antes dos componentes. */
  [hidden] { display: none !important; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: var(--font);
    color: var(--text);
    background: var(--bg);
    padding: 0 var(--sp-3) var(--sp-6);
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
  }
  .wrap { max-width: 1180px; margin: 0 auto; }
  [data-l] { display: none; }
  ${langVisCss}

  :where(button, a, [tabindex]):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--r-sm);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }

  /* ---------- app bar ---------- */
  .appbar {
    z-index: 1100;
    display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
    padding: var(--sp-3) 0;
    background: var(--bg-blur);
    -webkit-backdrop-filter: saturate(180%) blur(14px); backdrop-filter: saturate(180%) blur(14px);
    border-bottom: 1px solid transparent;
    transition: border-color var(--dur) var(--ease);
  }
  body.scrolled .appbar { border-bottom-color: var(--border); }
  .brand { display: flex; align-items: center; gap: var(--sp-2); }
  .brand-mark {
    width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 15px;
    background: linear-gradient(135deg, #1e1e2e, #2f2f44);
    border: 1px solid var(--border-strong);
  }
  .brand-name { font-weight: 800; font-size: 17px; letter-spacing: -.3px; color: var(--text); }
  .bar-actions { display: flex; align-items: center; gap: var(--sp-2); }
  .langbar { display: flex; gap: var(--sp-1); padding: 3px; border-radius: var(--r-full); background: var(--surface-2); }
  .lang {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; min-height: 38px; padding: 0 14px; border-radius: var(--r-full); border: 0;
    background: transparent; color: var(--muted);
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }
  .lang:hover { color: var(--text); }
  .lang.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
  .icon-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    width: 42px; height: 42px; display: grid; place-items: center; font-size: 16px;
    border-radius: var(--r-full); border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
    transition: transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }
  .icon-btn:hover { border-color: var(--border-strong); transform: translateY(-1px); }
  .icon-btn:active { transform: translateY(0) scale(.94); }
  .icon-btn .ico { width: 17px; height: 17px; }
  .icon-btn .ico-light { display: none; }
  :root[data-theme="light"] .icon-btn .ico-light { display: block; }
  :root[data-theme="light"] .icon-btn .ico-dark { display: none; }

  /* ---------- hero ---------- */
  .header {
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; gap: var(--sp-2);
    padding: var(--sp-4);
    border-radius: var(--r-lg);
    margin-bottom: var(--sp-4);
    color: #fff;
    background:
      radial-gradient(120% 140% at 10% 0%, rgba(255, 255, 255, .07), transparent 52%),
      linear-gradient(125deg, #12121c 0%, #1e1e2e 52%, #2a2a3d 100%);
    box-shadow: var(--shadow-lg);
  }
  .header::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(rgba(255, 255, 255, .08) 1px, transparent 1px);
    background-size: 14px 14px; opacity: .6;
  }
  .header > * { position: relative; z-index: 1; }
  .header h1 { font-size: clamp(21px, 4.4vw, 30px); line-height: 1.12; letter-spacing: -.6px; font-weight: 800; }
  .header .sub { font-size: 13px; line-height: 1.45; opacity: .92; }
  .header .meta { display: flex; flex-wrap: wrap; gap: var(--sp-2); font-size: 11.5px; }
  .header .meta > div {
    padding: 4px 10px; border-radius: var(--r-full); font-weight: 600;
    background: rgba(255, 255, 255, .17);
    -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  }

  /* ---------- journey rail (filtro por cidade) ---------- */
  .rail {
    display: flex; gap: 3px; margin-bottom: var(--sp-2); padding-bottom: var(--sp-1);
    overflow-x: auto; scrollbar-width: none;
  }
  .rail::-webkit-scrollbar { display: none; }
  .seg {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left;
    flex: var(--grow) 1 auto; min-width: max-content;
    display: flex; flex-direction: column; gap: 5px;
    padding: var(--sp-2) var(--sp-3);
    border: 0; border-radius: var(--r-sm);
    background: var(--surface); color: var(--text);
    box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), opacity var(--dur) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .seg:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .seg-bar { height: 4px; border-radius: var(--r-full); background: var(--city, var(--border-strong)); opacity: .45; transition: opacity var(--dur) var(--ease); }
  .seg-name { font-size: 12px; font-weight: 700; letter-spacing: -.1px; white-space: nowrap; }
  .seg-n { font-size: 10.5px; font-weight: 600; color: var(--muted); }
  .seg[aria-pressed="true"] .seg-bar, .seg.all[aria-pressed="true"] .seg-bar { opacity: 1; }
  .seg[aria-pressed="true"] { box-shadow: var(--shadow-md); }
  .seg.all .seg-bar { background: var(--accent); }
  body.filtering .seg:not([aria-pressed="true"]) { opacity: .42; }
  body.filtering .seg:not([aria-pressed="true"]):hover { opacity: .75; }

  .legend { display: flex; flex-wrap: wrap; gap: var(--sp-3); font-size: 11px; color: var(--muted); margin-bottom: var(--sp-4); line-height: 1.5; }
  .legend b { color: var(--text-2); font-weight: 600; }

  /* ---------- tabs ---------- */
  .tabs {
    position: sticky; top: 0; z-index: 1000;
    display: flex; gap: var(--sp-1); margin-bottom: var(--sp-4); padding: var(--sp-2) 0;
    overflow-x: auto; scrollbar-width: none;
    background: var(--bg-blur);
    -webkit-backdrop-filter: saturate(180%) blur(14px); backdrop-filter: saturate(180%) blur(14px);
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 13px; font-weight: 600;
    cursor: pointer; white-space: nowrap; min-height: var(--tap);
    display: inline-flex; align-items: center; gap: 6px;
    padding: var(--sp-2) var(--sp-4);
    border-radius: var(--r-full); border: 1px solid var(--border);
    background: var(--surface); color: var(--text-2);
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
  }
  .tab:hover { color: var(--text); border-color: var(--border-strong); }
  .tab:active { transform: scale(.97); }
  .tab[aria-selected="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }

  .panel { display: none; }
  .panel.active { display: block; animation: fade var(--dur) var(--ease); }
  @keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

  .panel a { color: inherit; text-decoration: underline; text-decoration-color: color-mix(in oklab, var(--accent) 55%, transparent); text-underline-offset: 2px; transition: text-decoration-color var(--dur-fast) var(--ease); }
  .panel a:hover { text-decoration-color: var(--accent); }
  .panel a.lk { text-decoration: none; font-size: .9em; opacity: .8; }
  .panel a.lk:hover { opacity: 1; }
  .empty-msg { color: var(--muted); font-size: 13px; padding: var(--sp-3); }
  .sec { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin: var(--sp-5) 0 var(--sp-3); }
  .sec:first-child { margin-top: 0; }

  /* ---------- calendário ---------- */
  .weekhdr { display: none; }
  .cal { display: grid; grid-template-columns: 1fr; gap: var(--sp-3); }
  .day {
    position: relative; border-radius: var(--r-md); border: 1px solid var(--border);
    background: var(--surface); overflow: hidden; box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .day:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .day.is-today { box-shadow: 0 0 0 2px var(--accent), var(--shadow-md); }
  .cell-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); color: #fff; background: var(--city); }
  .cell-top .date { font-size: 20px; font-weight: 800; line-height: 1; letter-spacing: -.5px; }
  .cell-top .wknum { font-size: 10.5px; opacity: .9; text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
  .today-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; padding: 2px 6px; border-radius: var(--r-full); background: rgba(255, 255, 255, .28); }
  .cell-city { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 3px var(--sp-3); color: #fff; background: var(--city); filter: brightness(.9); }
  .cell-body { padding: var(--sp-3); }
  .cell-body ul { list-style: none; }
  .cell-body li { font-size: 13px; line-height: 1.45; margin-bottom: var(--sp-1); padding-left: 15px; position: relative; color: var(--text-2); }
  .cell-body li::before { content: "•"; position: absolute; left: 0; color: var(--border-strong); }
  .cell-body li.star { font-weight: 700; color: var(--text); }
  .cell-body li.star::before { content: "★"; color: var(--star); }
  .cell-body li.move::before { content: "→"; color: var(--accent); font-weight: 700; }

  /* ---------- períodos do dia (manhã / tarde / noite) ---------- */
  /* Divisor leve: o período orienta a leitura, não compete com o conteúdo. */
  .pd + .pd { margin-top: var(--sp-2); padding-top: var(--sp-2); border-top: 1px solid var(--border); }
  .pd-head {
    display: flex; align-items: center; gap: 5px;
    font-size: 9.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
    color: var(--muted); margin-bottom: var(--sp-1);
  }
  .pd-ico { font-size: 10px; line-height: 1; opacity: .85; }
  .pd-night .pd-ico { opacity: .95; }
  .cell-body .pd ul { margin: 0; }

  /* Horário: tabular-nums para os dígitos alinharem verticalmente entre itens. */
  .t {
    font-variant-numeric: tabular-nums; font-size: .88em; font-weight: 600;
    color: var(--muted); margin-right: 5px; white-space: nowrap;
  }
  li.move .t { color: var(--accent); }

  /* No Roteiro o cabeçalho respira mais — a coluna é larga e o texto é maior. */
  .rt-day .pd + .pd { margin-top: var(--sp-4); padding-top: var(--sp-3); }
  .rt-day .pd-head { font-size: 11px; margin-bottom: var(--sp-2); }
  .rt-day .pd-ico { font-size: 12px; }

  /* ---------- roteiro ---------- */
  .rt-day {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
    padding: var(--sp-4); margin-bottom: var(--sp-3); box-shadow: var(--shadow-sm);
  }
  .rt-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); flex-wrap: wrap; }
  .rt-head::before { content: ""; width: 3px; height: 15px; border-radius: var(--r-full); background: var(--city); flex: none; }
  .rt-date { font-weight: 700; font-size: 12.5px; color: var(--muted); }
  .rt-city { font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: .4px; color: color-mix(in oklab, white var(--city-lighten), var(--city)); }
  .rt-note { font-size: 13.5px; line-height: 1.6; color: var(--text-2); margin-bottom: var(--sp-3); }
  .rt-items { list-style: none; }
  .rt-items li { font-size: 14px; line-height: 1.5; margin-bottom: var(--sp-3); padding-left: 17px; position: relative; color: var(--text-2); }
  .rt-items li:last-child { margin-bottom: 0; }
  .rt-items li::before { content: "•"; position: absolute; left: 0; color: var(--border-strong); }
  .rt-items li.star { font-weight: 700; color: var(--text); }
  .rt-items li.star::before { content: "★"; color: var(--star); }
  .rt-items li.move::before { content: "→"; color: var(--accent); font-weight: 700; }
  .rt-itemnote { font-weight: 400; font-size: 13px; line-height: 1.55; color: var(--muted); margin-top: 3px; }
  .rt-addr, .pl-addr { font-weight: 400; font-size: 12.5px; color: var(--muted); margin-top: 3px; }
  .rt-img { display: block; margin-top: var(--sp-2); width: 100%; max-width: 300px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--surface-2); }

  /* ---------- transportes ---------- */
  table.flights { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; font-size: 12.5px; }
  table.flights td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); color: var(--text-2); }
  table.flights td:first-child { font-weight: 700; color: var(--text); white-space: nowrap; }
  table.flights tr:last-child td { border-bottom: none; }
  .tl { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
  .tl-row { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3); border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-2); }
  .tl-row:last-child { border-bottom: none; }
  .tl-date { font-weight: 700; min-width: 84px; color: var(--muted); font-size: 12px; }
  .tl-txt { flex: 1; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--city); }
  /* A faixa da cor da cidade substitui o antigo dot: com a lista em ordem
     cronológica, ela deixa ler de relance onde uma etapa vira outra. */
  .tl-row { border-left: 3px solid var(--city); align-items: flex-start; }
  .tl-ico { flex: none; font-size: 15px; line-height: 1.3; width: 20px; text-align: center; }
  .tl-note { font-size: 12.5px; color: var(--muted); margin-top: 3px; line-height: 1.5; }

  /* ---------- faixa de conexão entre etapas (aba Roteiro) ---------- */
  .rt-leg {
    display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-2);
    margin: var(--sp-4) 0 var(--sp-3); padding: var(--sp-3) var(--sp-4);
    background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-md);
    font-size: 13px; color: var(--text-2);
  }
  .rt-leg-from, .rt-leg-to { font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text); }
  .rt-leg-arrow { color: var(--accent); font-weight: 700; }
  .rt-leg-body { flex-basis: 100%; display: grid; gap: 3px; line-height: 1.5; }

  /* ---------- lugares (grid de cards) ---------- */
  .pl-city { display: flex; align-items: center; gap: var(--sp-2); font-weight: 800; font-size: 15px; margin: var(--sp-5) 0 var(--sp-3); letter-spacing: -.2px; }
  .pl-group:first-child .pl-city { margin-top: 0; }
  .pl-dates { font-weight: 600; font-size: 12px; color: var(--muted); }
  /* fluxo masonry: cards com e sem foto têm alturas bem diferentes; em grid
     isso abriria buracos na linha. columns deixa cada card com a sua altura. */
  .pl-grid { columns: 1; column-gap: var(--sp-3); }
  .pl-card {
    display: flex; flex-direction: column; overflow: hidden;
    break-inside: avoid; margin-bottom: var(--sp-3);
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .pl-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
  .pl-shot { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--surface-2); display: block; }
  .pl-body { padding: var(--sp-3); display: flex; flex-direction: column; gap: 3px; }
  .pl-when { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  .pl-name { font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--text); }
  .pl-card.star .pl-name::before { content: "★ "; color: var(--star); }
  .pl-card.star .pl-name { font-weight: 700; }

  /* ---------- hospedagem ---------- */
  .hs-grid { columns: 1; column-gap: var(--sp-3); }
  .hs-card {
    break-inside: avoid; margin-bottom: var(--sp-3); overflow: hidden;
    border: 1px solid var(--border); border-left: 3px solid var(--city);
    border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
  }
  .hs-shot { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--surface-2); display: block; }
  .hs-body { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-1); }
  .hs-city { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  .hs-name { font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--text); }
  .hs-dates { font-size: 12.5px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .hs-n { font-weight: 700; color: var(--muted); }
  /* rótulo curto + valor: a reserva é uma ficha, não um parágrafo */
  .hs-meta { display: flex; gap: var(--sp-2); font-size: 12.5px; line-height: 1.5; }
  .hs-k { flex: none; min-width: 74px; color: var(--muted); font-weight: 600; }
  .hs-v { color: var(--text-2); word-break: break-word; }
  .hs-v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: .02em; background: var(--surface-2); border-radius: 5px; padding: 1px 5px; }
  .hs-note { font-size: 12.5px; color: var(--muted); line-height: 1.5; margin-top: var(--sp-1); }
  .hs-addr { font-size: 12px; }

  /* ---------- mapa ---------- */
  .map-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
  /* seletor de dia do mapa */
  .map-days { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); }
  .mday-nav {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 11px; cursor: pointer; flex: none;
    width: 28px; height: 28px; border-radius: var(--r-full);
    border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
  }
  .mday-nav:hover { border-color: var(--border-strong); color: var(--text); }
  .mday-range { flex: 1 1 auto; min-width: 0; max-width: 380px; accent-color: var(--accent); cursor: pointer; }
  .mday-lbl { font-size: 12px; font-weight: 600; color: var(--text-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .map-legend { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-bottom: var(--sp-2); font-size: 11.5px; color: var(--muted); }
  .mk-lg { display: inline-flex; align-items: center; gap: 5px; }
  .mk-lg-ico { font-size: 12px; line-height: 1; }
  .mk-lg-place .mk-lg-ico { color: var(--accent); font-size: 18px; }
  /* Pinos de hospedagem/estação. O "className" do L.divIcon SUBSTITUI a classe
     padrão do Leaflet em vez de somar, então não há .leaflet-div-icon aqui para
     sobrescrever — e também nenhum estilo dele para desfazer. */
  .mk {
    background: var(--surface); border: 1.5px solid var(--border-strong);
    border-radius: var(--r-full); box-shadow: var(--shadow-sm);
    display: flex; align-items: center; justify-content: center; font-size: 13px;
  }
  .mk-stay { border-color: var(--accent); }
  .map-btn {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
    padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm);
    border: 1px solid var(--accent); background: var(--accent); color: var(--accent-fg); text-decoration: none;
    transition: transform var(--dur-fast) var(--ease), opacity var(--dur-fast) var(--ease);
  }
  .map-btn:hover { transform: translateY(-1px); opacity: .92; }
  .map-btn:active { transform: translateY(0) scale(.97); }
  .map-btn.ghost { background: var(--surface); color: var(--accent); }
  .map-tip { font-size: 11.5px; color: var(--muted); flex: 1 1 100%; line-height: 1.45; }
  .mapbox { height: 68vh; min-height: 360px; border-radius: var(--r-md); overflow: hidden; border: 1px solid var(--border); background: var(--surface-2); }
  /* filtro em cada tile, não no .leaflet-tile-pane: o container de tiles é
     compositado (transform do Leaflet) e um filter no pane não chega a pintar.
     Assim os controles e a atribuição também ficam de fora da inversão. */
  .mapbox .leaflet-tile { filter: var(--tile-filter); }
  .map-fallback { padding: var(--sp-6) var(--sp-5); color: var(--muted); font-size: 13px; text-align: center; line-height: 1.6; }
  .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
  .leaflet-popup-content a { color: #1d4ed8; text-decoration: none; }

  .footer { margin-top: var(--sp-5); font-size: 11px; color: var(--muted); text-align: center; line-height: 1.6; }

  /* ---------- responsivo ---------- */
  @media (min-width: 620px) {
    .appbar { position: sticky; top: 0; }
    .tabs { top: 58px; }
    .lang { min-height: 30px; padding: 0 12px; }
    .icon-btn { width: 34px; height: 34px; font-size: 15px; }
    .header { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-5); padding: var(--sp-5); }
    .header .meta { justify-content: flex-end; }
    .cal { grid-template-columns: repeat(2, 1fr); }
    .pl-grid, .hs-grid { columns: 2; }
  }
  @media (min-width: 1000px) {
    body { padding: 0 var(--sp-5) var(--sp-6); }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 5px; grid-auto-flow: row; }
    .day { grid-column: var(--c); box-shadow: none; }
    .day:hover { transform: none; box-shadow: var(--shadow-md); }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 5px; }
    .weekhdr div { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); font-weight: 700; text-align: center; }
    .cell-top { padding: 5px var(--sp-2); }
    .cell-top .date { font-size: 15px; }
    .cell-top .wknum { font-size: 9px; }
    .today-tag { display: none; }
    .cell-city { font-size: 9px; padding: 2px var(--sp-2); }
    .cell-body { padding: 6px var(--sp-2) 7px; }
    .cell-body li { font-size: 9.5px; line-height: 1.34; margin-bottom: 2px; padding-left: 10px; }
    .cell-body .pd + .pd { margin-top: 5px; padding-top: 5px; }
    .cell-body .pd-head { font-size: 7.5px; gap: 3px; margin-bottom: 2px; }
    .cell-body .pd-ico { font-size: 8px; }
    .pl-grid { columns: 3; }
  }

  /* ---------- impressão: só o calendário, em papel branco ---------- */
  @media print {
    @page { size: A4 landscape; margin: 7mm; }
    :root { ${TOKENS_LIGHT.trim()} }
    body { padding: 0; background: #fff; }
    .appbar, .tabs, .rail, .legend, .footer { display: none; }
    .panel { display: none !important; }
    .panel[data-tab="cal"] { display: block !important; animation: none; }
    .header { box-shadow: none; flex-direction: row; align-items: center; justify-content: space-between; }
    .header::after { display: none; }
    .cal { grid-template-columns: repeat(7, 1fr); gap: 4px; grid-auto-flow: row; }
    .day { grid-column: var(--c); box-shadow: none; break-inside: avoid; }
    .day.is-today { box-shadow: none; }
    .weekhdr { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
    .weekhdr div { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #555; font-weight: 700; text-align: center; }
    .cell-top { padding: 4px 7px; }
    .cell-top .date { font-size: 13px; }
    .cell-top .wknum { font-size: 8px; }
    .today-tag { display: none; }
    .cell-city { font-size: 8.5px; padding: 2px 7px; }
    .cell-body { padding: 5px 7px; }
    .cell-body li { font-size: 8.3px; line-height: 1.32; margin-bottom: 1.5px; padding-left: 8px; }
  }`;
}
