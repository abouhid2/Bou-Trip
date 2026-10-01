// =====================================================================
// tobuy.mjs — aba "Comprar": o que ainda falta reservar, na ordem em que a
// venda abre. Muita coisa na China só vende perto da data (trem: 15 dias,
// Cidade Proibida: 7), então a lista guarda a data de abertura e os dados
// que costumam dar errado na hora (qual estação, qual portão, qual pacote).
//
// O "já comprei" fica salvo no aparelho, igual às decisões do dia.
// =====================================================================

const parseIso = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dm = (iso) => { const d = parseIso(iso); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

// Ordem de uso: primeiro o que abre antes; sem data de abertura = já à venda.
const byOpening = (a, b) => (a.opens || "").localeCompare(b.opens || "") || String(a.date).localeCompare(String(b.date));

// Tipos do filtro. A ordem aqui é a ordem dos botões; tipo desconhecido cai em "tour".
// Os botões vão sem ícone: com ícone os quatro não cabem numa linha no celular.
const KINDS = [["train", "buyTrain"], ["tour", "buyTour"], ["show", "buyShow"]];
const kindOf = (it) => (KINDS.some(([k]) => k === it.kind) ? it.kind : "tour");

function buyCard(h, it) {
  const opens = it.opens ? ` data-opens="${h.esc(it.opens)}"` : "";
  const link = it.url ? `<a class="td-act" href="${h.esc(it.url)}" target="_blank" rel="noopener">↗ ${h.uiBi("buyLink")}</a>` : "";
  const wait = it.opens ? `<span class="bc-chip bc-wait">${h.uiBi("buyOpens")} ${h.esc(dm(it.opens))}<span class="bc-left"></span></span>` : "";
  return `<article class="bc" data-buy="${h.esc(it.id)}" data-kind="${kindOf(it)}" data-date="${h.esc(it.date)}"${opens}>
      <div class="bc-top">
        <span class="bc-day">${h.dateLine(parseIso(it.date))}</span>
        <span class="bc-chip bc-onsale">${h.uiBi("buyOnSale")}</span>${wait}
        <span class="bc-chip bc-done">✓ ${h.uiBi("buyDone")}</span>
      </div>
      <h3 class="bc-what">${h.bi(it.what)}</h3>
      ${it.where ? `<p class="bc-where">${h.bi(it.where)}</p>` : ""}
      ${it.detail ? `<p class="bc-detail">${h.bi(it.detail)}</p>` : ""}
      <div class="td-acts">${link}<button class="td-act bc-mark" type="button" aria-pressed="false">✓ ${h.uiBi("buyMark")}</button></div>
    </article>`;
}

export function buyPanel(h) {
  const items = [...h.toBuy].sort(byOpening);
  const present = KINDS.filter(([k]) => items.some((it) => kindOf(it) === k));
  const kindBtn = (k, key) => `<button class="bc-seg" type="button" data-kind="${k}" aria-pressed="${k === "all"}">${h.uiBi(key)}</button>`;
  const kinds = present.length < 2 ? "" : `<div class="bc-segs" role="group" aria-label="${h.esc(h.uiStr(h.PRIMARY, "buyKindAria"))}">${kindBtn("all", "buyAll")}${present.map(([k, key]) => kindBtn(k, key)).join("")}</div>`;
  const sortBtn = (k, key) => `<button class="bc-seg" type="button" data-sort="${k}" aria-pressed="${k === "opens"}">${h.uiBi(key)}</button>`;
  return `<p class="bc-intro">${h.uiBi("buyIntro")}</p>
    <div class="bc-tools">
      ${kinds}
      <div class="bc-segs" role="group" aria-label="${h.esc(h.uiStr(h.PRIMARY, "buySortAria"))}"><span class="bc-lbl">${h.uiBi("buySortAria")}</span>${sortBtn("opens", "buySortOpen")}${sortBtn("date", "buySortDate")}</div>
    </div>
    <div class="bc-list">
      ${items.map((it) => buyCard(h, it)).join("\n      ")}
    </div>`;
}

// Atalho no topo do Hoje: quantas compras faltam e quantas já dá para fazer.
export const buyLink = (h) => (h.toBuy.length
  ? `<button class="dec-bar buy-bar" id="buybar" type="button" hidden><span class="dec-ico" aria-hidden="true">🎟️</span><span class="dec-txt"></span><span class="dec-go" aria-hidden="true">→</span></button>`
  : "");

// Script do navegador. Embutido no IIFE de client.mjs, depois do TODAY_SCRIPT:
// usa q, load, save, curLang, isoOf e goTab de lá. ES5 puro.
export const BUY_SCRIPT = `
  // ---------- aba Comprar ----------
  var BUY_KEY = 'boutrip-bought';
  var buyCards = q('.bc');
  var buyBar = document.getElementById('buybar');
  function buyRefresh() {
    if (!buyCards.length) return;
    var bought = load(BUY_KEY), today = isoOf(new Date()), lang = curLang(), pend = 0, open = 0;
    buyCards.forEach(function (c) {
      var id = c.getAttribute('data-buy'), opens = c.getAttribute('data-opens');
      var done = !!bought[id], onSale = !opens || opens <= today;
      c.classList.toggle('bought', done);
      c.classList.toggle('on-sale', onSale);
      c.querySelector('.bc-mark').setAttribute('aria-pressed', String(done));
      var left = c.querySelector('.bc-left');
      if (left && !onSale) {
        var n = Math.round((Date.parse(opens) - Date.parse(today)) / 864e5);
        var w = n === 1 ? TRIP_I18N.daysLeft1 : TRIP_I18N.daysLeft;
        left.textContent = ' · ' + (w[lang] || w.en).replace('{n}', n).toLowerCase();
      }
      if (!done) { pend++; if (onSale) open++; }
    });
    if (!buyBar) return;
    buyBar.hidden = pend === 0;
    var p = pend === 1 ? TRIP_I18N.buyPend1 : TRIP_I18N.buyPend;
    var txt = (p[lang] || p.en).replace('{n}', pend);
    if (open) txt += ' · ' + (TRIP_I18N.buyOpenN[lang] || TRIP_I18N.buyOpenN.en).replace('{n}', open);
    buyBar.querySelector('.dec-txt').textContent = txt;
  }
  q('.bc-mark').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.closest('.bc').getAttribute('data-buy'), bought = load(BUY_KEY);
      if (bought[id]) delete bought[id]; else bought[id] = true;
      save(BUY_KEY, bought);
      buyRefresh();
    });
  });
  if (buyBar) buyBar.addEventListener('click', function () { goTab('buy'); });

  // Filtro por tipo e ordenação: preferência de quem olha, lembrada no aparelho.
  var BUYVIEW_KEY = 'boutrip-buyview', buyList = document.querySelector('.bc-list');
  function buyView(v) {
    q('.bc-seg[data-kind]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kind') === v.kind)); });
    q('.bc-seg[data-sort]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sort') === v.sort)); });
    buyCards.forEach(function (c) { c.classList.toggle('bc-out', v.kind !== 'all' && c.getAttribute('data-kind') !== v.kind); });
    // sem data de abertura = já à venda, então vem antes de qualquer data
    function key(c) { return v.sort === 'date' ? c.getAttribute('data-date') : (c.getAttribute('data-opens') || '0') + c.getAttribute('data-date'); }
    buyCards.slice().sort(function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; })
      .forEach(function (c) { buyList.appendChild(c); });
  }
  function buyViewGet() {
    var v = load(BUYVIEW_KEY);
    return { kind: v.kind || 'all', sort: v.sort || 'opens' };
  }
  q('.bc-seg').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = buyViewGet();
      if (b.hasAttribute('data-kind')) v.kind = b.getAttribute('data-kind'); else v.sort = b.getAttribute('data-sort');
      save(BUYVIEW_KEY, v);
      buyView(v);
    });
  });
  if (buyList) buyView(buyViewGet());
  buyRefresh();
`;
