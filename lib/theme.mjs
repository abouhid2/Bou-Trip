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
    --bg: #f6f7fb;
    --bg-blur: rgba(246, 247, 251, .88);
    --surface: #ffffff;
    --surface-2: #f0f1f7;
    --text: #14142b;
    --text-2: #45455f;
    --muted: #7e7e99;
    --border: #e7e8f1;
    --border-strong: #d2d3e2;
    --accent: #4f46e5;
    --accent-fg: #ffffff;
    --accent-soft: rgba(79, 70, 229, .10);
    --star: #c98a06;
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

// Claro é o padrão; data-theme="dark" no <html> troca para o tema escuro.
// A troca é explícita, não por prefers-color-scheme: quem abre o roteiro na rua,
// de dia, quer a folha clara mesmo com o celular em modo escuro.
const themeCss = () => `
  :root {
    color-scheme: light;${TOKENS_LIGHT}

    --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 44px;
    --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-full: 999px;
    --ease: cubic-bezier(.22, .78, .28, 1);
    --dur-fast: 110ms; --dur: 210ms;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
    --tap: 46px;
    /* Escala do conteúdo (botão A na appbar). O conteúdo cresce, a navegação
       não — appbar e tabs ficam em escala 1 para não estourar no mobile. */
    --ui-scale: 1;
    /* Largura do segmento da trilha enquanto ela é carrossel. Uniforme de
       propósito: só onde a trilha inteira cabe na tela a largura pode
       codificar duração — comparar tamanhos exige ver os dois juntos. */
    --seg-w: 150px;
    --fade: var(--sp-6);
  }
  :root[data-theme="dark"] { color-scheme: dark;${TOKENS_DARK}
  }
  /* Três níveis de tamanho do texto, ciclados pelo botão A. O atributo entra
     no <html> ainda no <head> (anti-flash), então a escala já vale na 1ª pintura. */
  :root[data-fontscale="1"] { --ui-scale: 1.15; }
  :root[data-fontscale="2"] { --ui-scale: 1.3; }`;

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
    /* Respiro lateral maior no celular, e as bordas seguras do aparelho (notch,
       barra inferior) entram no cálculo em vez de ficarem por baixo do conteúdo. */
    padding: 0 var(--sp-4) calc(var(--sp-7) + env(safe-area-inset-bottom));
    padding-left: max(var(--sp-4), env(safe-area-inset-left));
    padding-right: max(var(--sp-4), env(safe-area-inset-right));
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
  }
  .wrap { max-width: 1180px; margin: 0 auto; }
  /* Tamanho do texto: escala só o conteúdo de leitura (título + painéis das
     abas). Navegação (appbar, tabs, rail) fica em escala 1, senão a appbar
     apertada do celular estoura. zoom escala tudo junto — fonte E espaçamento —
     que é o que dá legibilidade real sem colar o texto. */
  .header, .panel { zoom: var(--ui-scale, 1); }
  /* O mapa Leaflet posiciona tiles/pinos em px calculados no JS: sob zoom eles
     saem do lugar. O contra-zoom devolve o mapbox à escala real (1), enquanto os
     controles à volta — slider, chips — acompanham o resto do conteúdo. */
  .mapbox { zoom: calc(1 / var(--ui-scale, 1)); }
  [data-l] { display: none; }
  ${langVisCss}

  :where(button, a, summary, [tabindex]):focus-visible {
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
    padding: var(--sp-4) 0;
    padding-top: max(var(--sp-4), env(safe-area-inset-top));
    background: var(--bg-blur);
    -webkit-backdrop-filter: saturate(180%) blur(14px); backdrop-filter: saturate(180%) blur(14px);
    border-bottom: 1px solid transparent;
    transition: border-color var(--dur) var(--ease);
  }
  body.scrolled .appbar { border-bottom-color: var(--border); }
  .brand { display: flex; align-items: center; gap: var(--sp-2); flex: none; }
  .brand-mark {
    width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 15px;
    background: linear-gradient(135deg, #1e1e2e, #2f2f44);
    border: 1px solid var(--border-strong);
  }
  /* nowrap: a appbar do celular ficou apertada com o botão de tamanho somado, e
     o nome comprimia até quebrar em duas linhas. Junto do respiro menor dos
     .lang no mobile (abaixo), mantém a marca numa linha só. */
  .brand-name { font-weight: 800; font-size: 17px; letter-spacing: -.3px; color: var(--text); white-space: nowrap; }
  .bar-actions { display: flex; align-items: center; gap: var(--sp-2); }
  .langbar { display: flex; gap: var(--sp-1); padding: 3px; border-radius: var(--r-full); background: var(--surface-2); }
  .lang {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 13px; font-weight: 600;
    cursor: pointer; min-height: 40px; padding: 0 var(--sp-3); border-radius: var(--r-full); border: 0;
    background: transparent; color: var(--muted);
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }
  .lang:hover { color: var(--text); }
  .lang.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
  .icon-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    width: 44px; height: 44px; display: grid; place-items: center; font-size: 16px;
    border-radius: var(--r-full); border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
    transition: transform var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }
  .icon-btn:hover { border-color: var(--border-strong); transform: translateY(-1px); }
  /* O "A" do botão de tamanho cresce com o nível — o próprio controle mostra em
     que passo está, já que o botão cicla (normal → grande → maior → normal).
     Escala por zoom, não por font-size: quando o atributo do :root muda via JS
     (clique), font-size:calc(var()) não re-computa em elemento distante, mas
     zoom:var() sim — é o mesmo mecanismo que escala o conteúdo. */
  .fs-a { display: inline-block; font-weight: 800; font-size: 13px; line-height: 1; zoom: var(--ui-scale, 1); transition: transform var(--dur-fast) var(--ease); }
  .icon-btn:active { transform: translateY(0) scale(.94); }
  .icon-btn .ico { width: 17px; height: 17px; }
  /* O botão mostra o tema de DESTINO: na folha clara (padrão) aparece a lua. */
  .icon-btn .ico-dark { display: none; }
  :root[data-theme="dark"] .icon-btn .ico-dark { display: block; }
  :root[data-theme="dark"] .icon-btn .ico-light { display: none; }

  /* ---------- hero ---------- */
  .header {
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; gap: var(--sp-3);
    padding: var(--sp-5);
    border-radius: var(--r-lg);
    margin-bottom: var(--sp-5);
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
  .header .sub { font-size: 14px; line-height: 1.5; opacity: .92; }
  .header .meta { display: flex; flex-wrap: wrap; gap: var(--sp-2); font-size: 12.5px; }
  .header .meta > div {
    padding: 6px 12px; border-radius: var(--r-full); font-weight: 600;
    background: rgba(255, 255, 255, .17);
    -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  }

  /* ---------- journey rail (filtro por cidade) ---------- */
  /* O fade nas bordas é o único sinal de que a trilha continua fora da tela:
     ela some sem aviso, e o scrollbar está escondido. As classes vêm do JS,
     conforme a posição do scroll; sem overflow, nenhuma classe e nenhum fade. */
  .rail {
    --fade-l: 0px; --fade-r: 0px;
    display: flex; gap: var(--sp-2); margin-bottom: var(--sp-3); padding-bottom: var(--sp-1);
    overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
  }
  .rail.fade-l { --fade-l: var(--fade); }
  .rail.fade-r { --fade-r: var(--fade); }
  .rail::-webkit-scrollbar { display: none; }
  /* Carrossel: largura uniforme, porque aqui ela não mede nada — quem conta as
     noites é o "4n" no próprio segmento. Com min-width:max-content a largura
     acabava ditada pelo tamanho do NOME, e a leitura saía invertida (a parada
     de 1 noite com o nome mais longo virava o segmento mais largo da trilha). */
  .seg {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left;
    flex: 0 0 var(--seg-w); min-width: 0; min-height: var(--tap);
    display: flex; flex-direction: column; justify-content: center; gap: 6px;
    padding: var(--sp-3);
    border: 0; border-radius: var(--r-sm);
    background: var(--surface); color: var(--text);
    box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), opacity var(--dur) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .seg:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .seg-bar { height: 4px; border-radius: var(--r-full); background: var(--city, var(--border-strong)); opacity: .45; transition: opacity var(--dur) var(--ease); }
  .seg-name { font-size: 13px; font-weight: 700; letter-spacing: -.1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .seg-n { font-size: 11.5px; font-weight: 600; color: var(--muted); }
  .seg[aria-pressed="true"] .seg-bar, .seg.all[aria-pressed="true"] .seg-bar { opacity: 1; }
  .seg[aria-pressed="true"] { box-shadow: var(--shadow-md); }
  .seg.all .seg-bar { background: var(--accent); }
  body.filtering .seg:not([aria-pressed="true"]) { opacity: .42; }
  body.filtering .seg:not([aria-pressed="true"]):hover { opacity: .75; }

  .legend { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-4); font-size: 12px; color: var(--muted); margin-bottom: var(--sp-5); line-height: 1.5; }
  .legend b { color: var(--text-2); font-weight: 600; }

  /* ---------- tabs ---------- */
  /* A barra de abas é o controle mais usado no celular: fica colada no topo, com
     o mesmo fade das bordas da trilha para avisar que há mais abas fora da tela. */
  .tabs {
    --fade-l: 0px; --fade-r: 0px;
    position: sticky; top: 0; z-index: 1000;
    display: flex; gap: var(--sp-2); margin-bottom: var(--sp-5); padding: var(--sp-3) 0;
    overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
    background: var(--bg-blur);
    -webkit-backdrop-filter: saturate(180%) blur(14px); backdrop-filter: saturate(180%) blur(14px);
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent 100%);
  }
  .tabs.fade-l { --fade-l: var(--sp-5); }
  .tabs.fade-r { --fade-r: var(--sp-5); }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap; min-height: var(--tap);
    display: inline-flex; align-items: center; gap: 6px;
    padding: var(--sp-2) var(--sp-5);
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
  .empty-msg { color: var(--muted); font-size: 14px; padding: var(--sp-4); }
  .sec { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin: var(--sp-6) 0 var(--sp-4); }
  .sec:first-child { margin-top: 0; }

  /* ---------- calendário ---------- */
  .weekhdr { display: none; }
  .cal { display: grid; grid-template-columns: 1fr; gap: var(--sp-4); }
  .day {
    position: relative; border-radius: var(--r-md); border: 1px solid var(--border);
    background: var(--surface); overflow: hidden; box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .day:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .day.is-today { box-shadow: 0 0 0 2px var(--accent), var(--shadow-md); }
  .cell-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); padding: var(--sp-3) var(--sp-4); color: #fff; background: var(--city); }
  .cell-top .date { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -.5px; }
  .cell-top .wknum { font-size: 11.5px; opacity: .9; text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
  .today-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; padding: 2px 6px; border-radius: var(--r-full); background: rgba(255, 255, 255, .28); }
  .cell-city { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 5px var(--sp-4); color: #fff; background: var(--city); filter: brightness(.9); }
  .cell-body { padding: var(--sp-4); }
  .cell-body ul { list-style: none; }
  .cell-body li { font-size: 14px; line-height: 1.55; margin-bottom: var(--sp-2); padding-left: 18px; position: relative; color: var(--text-2); }
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
    padding: var(--sp-5) var(--sp-4); margin-bottom: var(--sp-4); box-shadow: var(--shadow-sm);
  }
  .rt-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
  .rt-head::before { content: ""; width: 3px; height: 15px; border-radius: var(--r-full); background: var(--city); flex: none; }
  .rt-date { font-weight: 700; font-size: 13px; color: var(--muted); }
  .rt-city { font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: .4px; color: color-mix(in oklab, white var(--city-lighten), var(--city)); }
  .rt-note { font-size: 15px; line-height: 1.65; color: var(--text-2); margin-bottom: var(--sp-4); }
  .rt-items { list-style: none; }
  .rt-items li { font-size: 15px; line-height: 1.6; margin-bottom: var(--sp-4); padding-left: 20px; position: relative; color: var(--text-2); }
  .rt-items li:last-child { margin-bottom: 0; }
  .rt-items li::before { content: "•"; position: absolute; left: 0; color: var(--border-strong); }
  .rt-items li.star { font-weight: 700; color: var(--text); }
  .rt-items li.star::before { content: "★"; color: var(--star); }
  .rt-items li.move::before { content: "→"; color: var(--accent); font-weight: 700; }
  .rt-itemnote { font-weight: 400; font-size: 13.5px; line-height: 1.6; color: var(--muted); margin-top: var(--sp-1); }
  .rt-addr, .pl-addr { font-weight: 400; font-size: 13px; color: var(--muted); margin-top: var(--sp-1); }
  .rt-img { display: block; margin-top: var(--sp-2); width: 100%; max-width: 300px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--surface-2); }

  /* ---------- decisões, opcionais e avisos ---------- */
  /* Opção que perdeu a escolha. Classe e não [hidden]: o filtro por cidade
     escreve [hidden] nos mesmos elementos e desfaria o estado da escolha. */
  .ch-off { display: none !important; }

  /* Atalho "N decisões em aberto": leva ao primeiro bloco ainda sem escolha. */
  .dec-bar {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; width: 100%; text-align: left;
    display: flex; align-items: center; gap: var(--sp-2);
    min-height: var(--tap); margin-bottom: var(--sp-4); padding: var(--sp-2) var(--sp-4);
    border: 1px solid color-mix(in oklab, var(--star) 45%, var(--border)); border-radius: var(--r-md);
    background: color-mix(in oklab, var(--star) 12%, var(--surface)); color: var(--text);
    font-size: 14px; font-weight: 700;
    transition: transform var(--dur-fast) var(--ease);
  }
  .dec-bar:active { transform: scale(.985); }
  .dec-txt { flex: 1; }
  .dec-go { color: var(--muted); }

  .rt-items li.ch-item, .cell-body li.ch-li { padding-left: 0; }
  .rt-items li.ch-item::before, .cell-body li.ch-li::before { content: none; }
  .ch {
    padding: var(--sp-4); font-weight: 400;
    border: 1px solid color-mix(in oklab, var(--accent) 30%, var(--border)); border-radius: var(--r-md);
    background: color-mix(in oklab, var(--accent) 5%, var(--surface));
  }
  .ch-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-1); }
  .ch-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }
  .ch-open {
    font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
    padding: 2px 8px; border-radius: var(--r-full);
    background: color-mix(in oklab, var(--star) 20%, transparent); color: var(--text-2);
  }
  .ch.decided .ch-open { display: none; }
  .ch-q { font-size: 16px; font-weight: 800; line-height: 1.35; color: var(--text); }
  .ch-note { font-size: 13.5px; line-height: 1.55; color: var(--text-2); margin-top: var(--sp-1); }
  /* As opções são o controle principal: alvos de toque cheios, lado a lado
     enquanto couberem, e a escolhida em destaque. */
  .ch-pick { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-3); }
  .ch-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left;
    flex: 1 1 200px; min-height: var(--tap);
    display: inline-flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--border-strong); border-radius: var(--r-md);
    background: var(--surface); color: var(--text-2); font-size: 14px; font-weight: 600; line-height: 1.3;
    transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
  }
  .ch-btn:active { transform: scale(.97); }
  .ch-btn[aria-checked="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
  .ch-letter {
    flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px;
    border-radius: var(--r-full); font-size: 11.5px; font-weight: 800;
    background: var(--surface-2); color: var(--text-2);
  }
  .ch-btn[aria-checked="true"] .ch-letter { background: color-mix(in oklab, var(--accent-fg) 25%, transparent); color: inherit; }
  .ch-opt { margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px dashed var(--border-strong); }
  .ch-opt-head { display: flex; align-items: center; gap: var(--sp-2); font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: var(--sp-2); }
  .ch-opt-note { font-size: 13.5px; line-height: 1.55; color: var(--muted); margin-bottom: var(--sp-3); }
  /* Escolhida, a opção que sobra já está destacada no botão: o cabeçalho dela
     viraria repetição. */
  .ch.decided .ch-opt-head { display: none; }
  .ch.decided .ch-opt { margin-top: var(--sp-3); padding-top: 0; border-top: 0; }
  .ch-reset {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    display: none; align-items: center; min-height: var(--tap); margin-top: var(--sp-2); padding: 0;
    border: 0; background: none; color: var(--accent); font-size: 13px; font-weight: 600;
    text-decoration: underline; text-underline-offset: 2px;
  }
  .ch.decided .ch-reset { display: inline-flex; }

  /* No calendário: a pergunta e as opções, cada uma com os seus itens. */
  .ch-cal-q { display: block; font-weight: 700; color: var(--accent); }
  .ch-li.decided .ch-cal-q, .ch-li.decided .ch-cal-lbl { display: none; }
  .ch-cal { margin-top: var(--sp-1); }
  .ch-cal-lbl { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--text); }
  .ch-cal .ch-letter { width: 18px; height: 18px; font-size: 10px; }
  .ch-cal ul { list-style: none; margin-top: 2px; }

  .opt-tag {
    display: inline-block; vertical-align: 1px; margin-left: 6px; padding: 1px 7px;
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
    border: 1px dashed var(--border-strong); border-radius: var(--r-full); color: var(--muted);
  }
  .skip-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    display: inline-flex; align-items: center; min-height: var(--tap); margin-top: var(--sp-2); padding: 0 var(--sp-4);
    border: 1px solid var(--border); border-radius: var(--r-full);
    background: var(--surface); color: var(--text-2); font-size: 12.5px; font-weight: 600;
  }
  .sk-undo, .skip-btn.skipped .sk-do { display: none; }
  .skip-btn.skipped .sk-undo { display: inline; }
  /* Pulado: continua na lista (dá para trazer de volta), mas riscado e sem
     os detalhes. */
  li.skipped { color: var(--muted); }
  li.skipped > [data-l], li.skipped > a:not(.lk) { text-decoration: line-through; }
  li.skipped .rt-itemnote, li.skipped .rt-addr, li.skipped .rt-img { display: none; }
  .pl-card.skipped { opacity: .45; }

  .rt-items li.warn {
    padding: var(--sp-3) var(--sp-3) var(--sp-3) 34px; border-radius: var(--r-sm);
    background: color-mix(in oklab, var(--star) 12%, transparent); color: var(--text); font-weight: 600;
  }
  .rt-items li.warn::before, .cell-body li.warn::before { content: "⚠"; color: var(--star); }
  .rt-items li.warn::before { left: var(--sp-3); top: var(--sp-3); }
  .cell-body li.warn { color: var(--text); font-weight: 600; }

  /* ---------- painel Hoje ---------- */
  /* Na tela de hoje o filtro por cidade e o atalho de decisões não servem:
     ela é um dia só, e as decisões dele já aparecem dentro dela. */
  body[data-view="today"] .rail, body[data-view="today"] .legend, body[data-view="today"] .dec-bar { display: none; }

  /* um dia só, lido de cima a baixo: coluna de leitura, não a largura da página */
  .panel[data-tab="today"] { max-width: 760px; margin: 0 auto; }
  .td-nav { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
  .td-step {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; flex: none;
    width: var(--tap); height: var(--tap); border-radius: var(--r-full);
    border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
    font-size: 24px; line-height: 1; display: grid; place-items: center;
  }
  .td-step:disabled { opacity: .35; cursor: default; }
  .td-banner, .td-home { flex: 1; text-align: center; }
  .td-banner { font-size: 14px; font-weight: 700; color: var(--text-2); }
  .td-home {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    min-height: var(--tap); border: 0; background: none; color: var(--accent); font-size: 14px; font-weight: 700;
  }
  /* sem faixa nem botão, o espaço do meio ainda separa as setas */
  .td-nav::after { content: ""; flex: 1; }
  .td-nav:has(.td-banner:not([hidden]))::after, .td-nav:has(.td-home:not([hidden]))::after { display: none; }
  .td-nav .td-step:last-child { order: 3; }

  .td-top {
    display: flex; flex-direction: column; gap: var(--sp-1);
    padding: var(--sp-4); border-radius: var(--r-md); margin-bottom: var(--sp-4);
    background: var(--city); color: #fff; box-shadow: var(--shadow-sm);
  }
  .td-when { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-2); flex-wrap: wrap; }
  .td-date { font-size: 22px; font-weight: 800; letter-spacing: -.4px; }
  .td-count { font-size: 12.5px; font-weight: 700; opacity: .85; }
  .td-city { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .92; }
  /* Visão geral recolhida em 3 linhas: de relance basta o começo. */
  .td-note {
    font-size: 15px; line-height: 1.6; color: var(--text-2); margin-bottom: var(--sp-4); cursor: pointer;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  }
  .td-note.open { display: block; -webkit-line-clamp: unset; }
  .td-items .pd + .pd { margin-top: var(--sp-4); padding-top: var(--sp-3); }
  .td-items .pd-head { font-size: 11px; margin-bottom: var(--sp-2); }
  .td-items .rt-items li { margin-bottom: var(--sp-3); }
  .td-items li.is-now, .td-items li.is-next { border-radius: var(--r-sm); padding: var(--sp-2) var(--sp-3) var(--sp-2) 30px; }
  .td-items li.is-now::before, .td-items li.is-next::before { left: var(--sp-3); top: var(--sp-2); }
  .td-items li.is-now { background: var(--accent-soft); box-shadow: inset 3px 0 0 var(--accent); }
  .td-items li.is-next { box-shadow: inset 3px 0 0 var(--border-strong); background: var(--surface-2); }
  .now-tag {
    display: block; width: fit-content; margin-bottom: 3px; padding: 1px 8px; border-radius: var(--r-full);
    font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
    background: var(--accent); color: var(--accent-fg);
  }
  .is-next .now-tag { background: var(--border-strong); color: var(--text); }
  .td-more { margin-top: 2px; font-weight: 400; }
  .td-more summary {
    display: inline-flex; align-items: center; gap: 4px; min-height: var(--tap); margin: -6px 0; cursor: pointer; list-style: none;
    font-size: 12.5px; font-weight: 600; color: var(--muted);
  }
  .td-more summary::-webkit-details-marker { display: none; }
  .td-more summary::before { content: "▸"; transition: transform var(--dur-fast) var(--ease); }
  .td-more[open] summary::before { transform: rotate(90deg); }

  .td-stay {
    margin-top: var(--sp-5); padding: var(--sp-4);
    border: 1px solid var(--border); border-left: 3px solid var(--city); border-radius: var(--r-md);
    background: var(--surface); box-shadow: var(--shadow-sm);
    display: flex; flex-direction: column; gap: var(--sp-2);
  }
  .td-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .td-stay-name { font-size: 16px; font-weight: 700; line-height: 1.35; color: var(--text); }
  .td-stay-local { font-size: 18px; line-height: 1.45; color: var(--text); }
  .td-acts { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-top: var(--sp-1); }
  .td-act {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap); padding: 0 var(--sp-4);
    border: 1px solid var(--border-strong); border-radius: var(--r-full);
    background: var(--surface); color: var(--text); font-size: 14px; font-weight: 600;
  }
  .panel .td-act { text-decoration: none; }
  .td-driver { background: var(--text); color: var(--bg); border-color: var(--text); }

  /* Tela do taxista: o endereço local o maior possível, fundo branco sempre
     (é lido por outra pessoa, às vezes no sol). */
  .driver {
    position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; border: 0;
    padding: max(var(--sp-6), env(safe-area-inset-top)) var(--sp-5) max(var(--sp-6), env(safe-area-inset-bottom));
    background: #fff; color: #111;
  }
  .driver[open] { display: flex; flex-direction: column; justify-content: center; gap: var(--sp-5); text-align: center; }
  .driver-hint { font-size: 14px; color: #666; }
  .driver-name { font-size: 30px; font-weight: 800; line-height: 1.3; }
  .driver-addr { font-size: clamp(30px, 9vw, 54px); font-weight: 700; line-height: 1.35; word-break: break-all; }
  .driver-close {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    min-height: var(--tap); padding: 0 var(--sp-6); border-radius: var(--r-full);
    border: 1px solid #ccc; background: #fff; color: #111; font-size: 15px; font-weight: 700;
  }

  /* ---------- aba Comprar ---------- */
  /* O atalho mora dentro do Hoje, que esconde o .dec-bar: este fica. */
  body[data-view="today"] .buy-bar { display: flex; }
  /* A lista não é por cidade: filtro e atalho de decisões só atrapalham aqui. */
  body[data-view="buy"] .rail, body[data-view="buy"] .legend, body[data-view="buy"] .dec-bar { display: none; }
  .buy-bar[hidden] { display: none !important; }
  .panel[data-tab="buy"] { max-width: 760px; margin: 0 auto; }
  .bc-intro { font-size: 14px; line-height: 1.55; color: var(--text-2); margin-bottom: var(--sp-4); }
  /* Comprado desce para o fim da lista: o que falta fica no alcance. */
  .bc-list { display: flex; flex-direction: column; gap: var(--sp-3); }
  .bc-tools { display: flex; flex-direction: column; gap: var(--sp-2); margin-bottom: var(--sp-4); }
  .bc-segs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
  .bc-seg {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    min-height: var(--tap); padding: 0 var(--sp-3); border-radius: var(--r-full);
    border: 1px solid var(--border); background: var(--surface); color: var(--text-2); font-size: 13.5px; font-weight: 600;
  }
  .bc-seg[aria-pressed="true"] { background: var(--text); border-color: var(--text); color: var(--bg); }
  .bc-out { display: none !important; }
  .bc {
    display: flex; flex-direction: column; gap: var(--sp-2); padding: var(--sp-4);
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
  }
  .bc.on-sale:not(.bought) { border-left: 3px solid var(--accent); }
  .bc.bought { order: 1; opacity: .6; box-shadow: none; }
  .bc-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); flex-wrap: wrap; }
  .bc-day { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .bc-chip {
    display: none; padding: 2px 10px; border-radius: var(--r-full);
    font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
  }
  .bc:not(.bought).on-sale .bc-onsale { display: inline-block; background: var(--accent); color: var(--accent-fg); }
  .bc:not(.bought):not(.on-sale) .bc-wait { display: inline-block; background: color-mix(in oklab, var(--star) 20%, transparent); color: var(--text-2); }
  .bc.bought .bc-done { display: inline-block; background: var(--surface-2); color: var(--text-2); }
  .bc-what { font-size: 16px; font-weight: 800; line-height: 1.35; color: var(--text); }
  .bc-where { font-size: 14px; font-weight: 600; line-height: 1.5; color: var(--text); }
  .bc-detail { font-size: 14px; line-height: 1.6; color: var(--text-2); white-space: pre-line; }
  .bc.bought .bc-detail, .bc.bought .bc-where { display: none; }
  .bc-mark[aria-pressed="true"] { background: var(--surface-2); color: var(--text-2); }

  /* ---------- aba Frases ---------- */
  body[data-view="phrases"] .rail, body[data-view="phrases"] .legend, body[data-view="phrases"] .dec-bar { display: none; }
  .panel[data-tab="phrases"] { max-width: 760px; margin: 0 auto; }
  /* Atalhos para os grupos: uma faixa que rola de lado, sem quebrar em várias linhas. */
  .ph-jumps { display: flex; gap: 6px; overflow-x: auto; margin: 0 calc(-1 * var(--sp-4)) var(--sp-5); padding: 0 var(--sp-4) 2px; scrollbar-width: none; }
  .ph-jumps::-webkit-scrollbar { display: none; }
  .ph-jump { flex: none; white-space: nowrap; }
  .ph-group { margin-bottom: var(--sp-6); scroll-margin-top: var(--sp-4); }
  .ph-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: var(--sp-2); }
  .ph-gnote { font-size: 13.5px; line-height: 1.6; color: var(--text-2); margin-bottom: var(--sp-3); white-space: pre-line; }
  .ph-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--sp-2); }
  .ph {
    position: relative; display: flex; align-items: center;
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); color: var(--text);
  }
  .ph-open {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left; flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 2px; padding: var(--sp-3) var(--sp-4);
    border: 0; border-radius: inherit; background: none; color: inherit;
  }
  .say-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer;
    flex: none; width: var(--tap); height: var(--tap); margin-right: var(--sp-2); border-radius: var(--r-full);
    border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-size: 17px;
  }
  .say-btn[hidden] { display: none; }
  .ph-tr { font-size: 13px; font-weight: 600; color: var(--muted); }
  .ph-local { font-size: 22px; font-weight: 700; line-height: 1.3; }
  .ph-roman { font-size: 14px; color: var(--text-2); }
  .ph-note { font-size: 12.5px; line-height: 1.5; color: var(--muted); margin-top: 2px; }
  /* Números: grade de quadradinhos, o algarismo em cima. */
  .ph-compact .ph-list { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); }
  .ph-compact .ph-open { align-items: center; text-align: center; padding: var(--sp-3) var(--sp-2) var(--sp-2); }
  /* no quadradinho o alto-falante vai para o canto, menor, sem roubar largura */
  .ph-compact .say-btn { position: absolute; top: 4px; right: 4px; width: 32px; height: 32px; margin: 0; font-size: 13px; border: 0; background: none; }
  .ph-compact .ph-tr { font-size: 17px; font-weight: 800; color: var(--text); }
  .ph-compact .ph-local { font-size: 20px; }
  .ph-compact .ph-roman { font-size: 13px; }
  .phs-roman { font-size: 22px; color: #333; }
  .phs-tr { font-size: 16px; color: #666; }
  .phs-acts { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--sp-2); }
  .phs-say.say-btn { width: auto; height: auto; min-height: var(--tap); margin: 0; padding: 0 var(--sp-6); border: 1px solid #ccc; background: #fff; color: #111; font-size: 15px; font-weight: 700; }

  /* ---------- aba Estudar ---------- */
  body[data-view="study"] .rail, body[data-view="study"] .legend, body[data-view="study"] .dec-bar { display: none; }
  .panel[data-tab="study"] { max-width: 560px; margin: 0 auto; }
  .st-modes { margin-bottom: var(--sp-4); }
  .st-grps { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); }
  .st-grp {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left;
    display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6px var(--sp-2); padding: var(--sp-3);
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); color: var(--text);
  }
  .st-grp[hidden] { display: none; }
  .st-name { font-size: 14px; font-weight: 700; line-height: 1.3; }
  .st-count { font-size: 12.5px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  .st-bar, .st-prog { grid-column: 1 / -1; height: 4px; border-radius: var(--r-full); background: var(--surface-2); overflow: hidden; }
  .st-bar i, .st-prog i { display: block; height: 100%; width: 0; background: var(--accent); }
  .st-grp[data-g="review"] .st-bar { display: none; }
  .st-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
  .st-pos { font-size: 13px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  .st-prog { margin-bottom: var(--sp-4); }
  .st-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-2);
    min-height: 340px; padding: var(--sp-6) var(--sp-5); text-align: center; cursor: pointer; touch-action: pan-y; user-select: none;
    border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); box-shadow: var(--shadow-sm);
  }
  .st-q-local { font-size: clamp(30px, 9vw, 46px); font-weight: 700; line-height: 1.3; }
  .st-q-tr { font-size: 22px; font-weight: 700; line-height: 1.35; }
  .st-hint { font-size: 13px; color: var(--muted); }
  .st-a { display: none; flex-direction: column; align-items: center; gap: var(--sp-1); width: 100%; }
  .st-card.revealed .st-a { display: flex; }
  .st-card.revealed .st-hint { display: none; }
  .st-local { font-size: clamp(28px, 8vw, 40px); font-weight: 700; line-height: 1.3; }
  .st-roman { font-size: 19px; color: var(--text-2); }
  .st-tr { font-size: 17px; font-weight: 700; color: var(--text); }
  .st-note { font-size: 13.5px; line-height: 1.5; color: var(--muted); }
  .st-note:empty, .st-parts:empty { display: none; }
  /* o que quer dizer cada caractere: é aqui que a frase vira vocabulário */
  .st-parts { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: var(--sp-3); padding: 0; }
  .st-parts li { display: flex; align-items: baseline; gap: 6px; padding: 4px 10px; border-radius: var(--r-full); background: var(--surface-2); font-size: 13px; color: var(--text-2); }
  .st-parts b { font-size: 17px; color: var(--text); }
  .st-acts { display: flex; align-items: center; justify-content: center; gap: var(--sp-3); margin-top: var(--sp-4); }
  .st-acts .say-btn { margin: 0; }
  .st-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; flex: 1; max-width: 200px;
    min-height: 52px; padding: 0 var(--sp-4); border-radius: var(--r-full); font-size: 15px; font-weight: 700;
    border: 1px solid var(--border-strong); background: var(--surface); color: var(--text);
  }
  .st-know { background: var(--text); border-color: var(--text); color: var(--bg); }
  .st-btn[hidden] { display: none; }
  .st-done { text-align: center; padding: var(--sp-6) 0; }
  .st-done-title { font-size: 20px; font-weight: 800; }
  .st-score { font-size: 17px; color: var(--text-2); margin-top: var(--sp-2); }
  @media (max-width: 340px) { .st-grps { grid-template-columns: 1fr; } }

  /* ---------- barra de baixo e menu "Mais" (celular) ---------- */
  .bnav { display: none; }
  .ln-short { display: none; }
  .sheet {
    width: 100%; max-width: 520px; margin: auto auto 0; padding: 0; border: 0;
    border-radius: var(--r-lg) var(--r-lg) 0 0; background: var(--surface); color: var(--text);
    box-shadow: var(--shadow-lg);
  }
  .sheet::backdrop, .driver::backdrop { background: rgba(10, 10, 18, .45); }
  /* Sem botão Fechar: tocar fora ou Esc já fecha, e um X a mais seria ruído. */
  .sheet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); padding: var(--sp-5) var(--sp-4) max(var(--sp-5), env(safe-area-inset-bottom)); }
  .sheet-btn {
    -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; text-align: left;
    display: flex; align-items: center; gap: var(--sp-2); min-height: 56px; padding: 0 var(--sp-4);
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface-2); color: var(--text);
    font-size: 15px; font-weight: 600;
  }
  .sheet-ico { font-size: 18px; }

  @media (max-width: 619px) {
    /* No celular as abas viram a barra de baixo: alcance do polegar, e sem o
       carrossel de 8 abas que escondia metade delas. */
    .tabs { display: none; }
    body { padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
    body[data-view="today"] .header, body[data-view="study"] .header { display: none; }
    .ln-full { display: none; }
    .ln-short { display: inline; }
    .bnav {
      display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 1200;
      padding: var(--sp-1) var(--sp-2) env(safe-area-inset-bottom);
      background: var(--bg-blur); border-top: 1px solid var(--border);
      -webkit-backdrop-filter: saturate(180%) blur(14px); backdrop-filter: saturate(180%) blur(14px);
    }
    .bn {
      -webkit-appearance: none; appearance: none; font: inherit; cursor: pointer; flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      min-height: 58px; border: 0; background: none; color: var(--text-2);
      font-size: 11px; font-weight: 600;
    }
    .bn-ico svg { width: 24px; height: 24px; display: block; }
    .bn[aria-current="page"] { color: var(--accent); }
    .bn:active { transform: scale(.94); }
  }

  /* ---------- transportes ---------- */
  table.flights { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; font-size: 12.5px; }
  table.flights td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); color: var(--text-2); }
  table.flights td:first-child { font-weight: 700; color: var(--text); white-space: nowrap; }
  table.flights tr:last-child td { border-bottom: none; }
  .tl { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); overflow: hidden; }
  .tl-row { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-4); border-bottom: 1px solid var(--border); font-size: 14px; line-height: 1.55; color: var(--text-2); }
  .tl-row:last-child { border-bottom: none; }
  .tl-date { font-weight: 700; min-width: 84px; color: var(--muted); font-size: 12px; }
  .tl-txt { flex: 1; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--city); }
  /* A faixa da cor da cidade substitui o antigo dot: com a lista em ordem
     cronológica, ela deixa ler de relance onde uma etapa vira outra. */
  .tl-row { border-left: 3px solid var(--city); align-items: flex-start; }
  .tl-ico { flex: none; font-size: 15px; line-height: 1.3; width: 20px; text-align: center; }
  .tl-note { font-size: 13px; color: var(--muted); margin-top: var(--sp-1); line-height: 1.55; }

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
  .pl-grid { columns: 1; column-gap: var(--sp-4); }
  .pl-card {
    display: flex; flex-direction: column; overflow: hidden;
    break-inside: avoid; margin-bottom: var(--sp-4);
    border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
    transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }
  .pl-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
  .pl-shot { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--surface-2); display: block; }
  .pl-body { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-1); }
  .pl-when { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  .pl-name { font-size: 15px; font-weight: 600; line-height: 1.45; color: var(--text); }
  .pl-card.star .pl-name::before { content: "★ "; color: var(--star); }
  .pl-card.star .pl-name { font-weight: 700; }

  /* ---------- hospedagem ---------- */
  .hs-grid { columns: 1; column-gap: var(--sp-4); }
  .hs-card {
    break-inside: avoid; margin-bottom: var(--sp-4); overflow: hidden;
    border: 1px solid var(--border); border-left: 3px solid var(--city);
    border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
  }
  .hs-shot { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--surface-2); display: block; }
  .hs-body { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2); }
  .hs-city { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  .hs-name { font-size: 16px; font-weight: 700; line-height: 1.4; color: var(--text); }
  .hs-dates { font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .hs-n { font-weight: 700; color: var(--muted); }
  /* rótulo curto + valor: a reserva é uma ficha, não um parágrafo */
  .hs-meta { display: flex; gap: var(--sp-2); font-size: 13px; line-height: 1.55; }
  .hs-k { flex: none; min-width: 78px; color: var(--muted); font-weight: 600; }
  .hs-v { color: var(--text-2); word-break: break-word; }
  .hs-v code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: .02em; background: var(--surface-2); border-radius: 5px; padding: 1px 5px; }
  .hs-note { font-size: 13px; color: var(--muted); line-height: 1.55; margin-top: var(--sp-1); }
  .hs-addr { font-size: 13px; }

  /* ---------- restaurantes ---------- */
  .food-grid { columns: 1; column-gap: var(--sp-4); }
  .food-card {
    break-inside: avoid; margin-bottom: var(--sp-4);
    border: 1px solid var(--border); border-left: 3px solid var(--city, var(--border-strong));
    border-radius: var(--r-md); background: var(--surface); box-shadow: var(--shadow-sm);
    padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-2);
  }
  .food-top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
  /* faixa = etiqueta, não parágrafo: cor sinaliza o nível de relance */
  .food-tier {
    font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
    padding: 2px 8px; border-radius: var(--r-full);
    background: var(--surface-2); color: var(--muted); white-space: nowrap;
  }
  .food-tier.tier-fine { background: color-mix(in oklab, var(--star) 22%, transparent); color: color-mix(in oklab, white var(--city-lighten), var(--star)); }
  .food-tier.tier-mid { background: var(--accent-soft); color: var(--accent); }
  .food-tier.tier-local { background: color-mix(in oklab, var(--border-strong) 45%, transparent); color: var(--text-2); }
  .food-price { font-size: 12px; font-weight: 700; color: var(--text-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .food-name { font-size: 16px; font-weight: 700; line-height: 1.4; color: var(--text); }
  .food-cuisine { font-size: 13px; font-weight: 600; color: var(--muted); }
  .food-addr { font-size: 13px; }
  .food-note { font-size: 13px; color: var(--muted); line-height: 1.6; margin-top: var(--sp-1); }
  .mk-food { border-color: var(--star); }

  /* ---------- mapa ---------- */
  .map-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
  /* seletor de dia do mapa. No celular o rótulo do dia ocupa a linha inteira:
     espremido entre as setas e o slider ele truncava o nome da cidade. */
  .map-days { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
  .mday-lbl { order: 3; flex: 1 0 100%; }
  .mday-nav {
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 12px; cursor: pointer; flex: none;
    display: inline-flex; align-items: center; justify-content: center;
    width: var(--tap); height: var(--tap); border-radius: var(--r-full);
    border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
  }
  .mday-nav:hover { border-color: var(--border-strong); color: var(--text); }
  .mday-range { flex: 1 1 auto; min-width: 0; max-width: 380px; height: var(--tap); accent-color: var(--accent); cursor: pointer; }
  .mday-lbl { font-size: 13px; font-weight: 600; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .map-legend { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); font-size: 12.5px; color: var(--muted); }
  /* A legenda É o filtro — e filtro é controle, não texto. Por isso o item é
     dimensionado pelo alvo de toque (--tap) e desenhado como chip: quem usa
     isto anda na rua, com uma mão. Herdar a métrica de legenda (o que ele era
     antes) dava um alvo de 18px, abaixo do mínimo de 44px. */
  .mk-lg {
    display: inline-flex; align-items: center; gap: var(--sp-2);
    cursor: pointer; user-select: none;
    min-height: var(--tap); padding: 0 var(--sp-3);
    border: 1px solid var(--border); border-radius: var(--r-full);
    background: var(--surface);
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), opacity var(--dur) var(--ease);
  }
  .mk-lg:hover { color: var(--text-2); border-color: var(--border-strong); }
  .mk-cb { accent-color: var(--accent); cursor: pointer; margin: 0; width: 16px; height: 16px; flex: none; }
  /* desmarcado = tipo escondido no mapa; o rótulo apaga junto */
  .mk-lg:has(.mk-cb:not(:checked)) { opacity: .45; }
  .mk-lg:has(.mk-cb:not(:checked)) .mk-lg-ico { filter: grayscale(1); }
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
    -webkit-appearance: none; appearance: none; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: var(--tap); padding: var(--sp-2) var(--sp-4); border-radius: var(--r-sm);
    border: 1px solid var(--accent); background: var(--accent); color: var(--accent-fg); text-decoration: none;
    transition: transform var(--dur-fast) var(--ease), opacity var(--dur-fast) var(--ease);
  }
  .map-btn:hover { transform: translateY(-1px); opacity: .92; }
  .map-btn:active { transform: translateY(0) scale(.97); }
  .map-btn.ghost { background: var(--surface); color: var(--accent); }
  .map-tip { font-size: 12.5px; color: var(--muted); flex: 1 1 100%; line-height: 1.5; }
  /* dvh, não vh: no celular a barra do navegador entra e sai, e com vh o mapa
     ficava alto demais e empurrava os controles para fora da tela. */
  .mapbox { height: 68vh; height: 62dvh; min-height: 380px; border-radius: var(--r-md); overflow: hidden; border: 1px solid var(--border); background: var(--surface-2); }
  /* filtro em cada tile, não no .leaflet-tile-pane: o container de tiles é
     compositado (transform do Leaflet) e um filter no pane não chega a pintar.
     Assim os controles e a atribuição também ficam de fora da inversão. */
  .mapbox .leaflet-tile { filter: var(--tile-filter); }
  .map-fallback { padding: var(--sp-6) var(--sp-5); color: var(--muted); font-size: 13px; text-align: center; line-height: 1.6; }
  .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
  .leaflet-popup-content a { color: #1d4ed8; text-decoration: none; }

  .footer { margin-top: var(--sp-6); font-size: 12px; color: var(--muted); text-align: center; line-height: 1.6; }

  /* ---------- toque ---------- */
  /* Sem mouse não existe "passar por cima": no celular o :hover fica GRUDADO
     depois do toque, e o card levantado nunca voltava ao lugar. Onde o ponteiro
     é grosso, o feedback vem do :active (afundar), não do hover. */
  @media (hover: none) {
    .seg:hover, .day:hover, .pl-card:hover, .icon-btn:hover, .map-btn:hover, .tab:hover { transform: none; }
    .day:hover, .pl-card:hover { box-shadow: var(--shadow-sm); }
  }
  .seg:active, .day:active, .pl-card:active { transform: scale(.985); }

  /* ---------- responsivo ---------- */
  @media (min-width: 620px) {
    .appbar { position: sticky; top: 0; }
    /* Altura medida da appbar no desktop: 16 + 36 (langbar) + 16 + 1 de borda.
       Um valor menor abre uma fresta por onde o conteúdo passa ao rolar. */
    .tabs { top: 69px; }
    .lang { min-height: 30px; padding: 0 12px; }
    .icon-btn { width: 34px; height: 34px; font-size: 15px; }
    .header { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-5); padding: var(--sp-5); }
    .header .meta { justify-content: flex-end; }
    .cal { grid-template-columns: repeat(2, 1fr); }
    .pl-grid, .hs-grid, .food-grid { columns: 2; }
  }
  @media (min-width: 1000px) {
    body { padding: 0 var(--sp-5) var(--sp-7); }
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
    .cell-body .opt-tag { font-size: 7px; padding: 0 4px; margin-left: 3px; }
    .pl-grid { columns: 3; }
  }

  /* ---------- impressão: só o calendário, em papel branco ---------- */
  @media print {
    @page { size: A4 landscape; margin: 7mm; }
    :root { ${TOKENS_LIGHT.trim()} }
    /* O tamanho do texto é preferência de tela: o PDF sai sempre em escala 1. */
    .header, .panel { zoom: 1; }
    body { padding: 0; background: #fff; }
    .appbar, .tabs, .rail, .legend, .footer, .bnav, .dec-bar { display: none; }
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
