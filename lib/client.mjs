// =====================================================================
// client.mjs — script que roda no navegador do HTML gerado.
//
// Exportado como string para o render embutir. Sem dependências: ES5
// puro para abrir em qualquer navegador, inclusive offline.
// =====================================================================

import { TODAY_SCRIPT } from "./client-today.mjs";
import { BUY_SCRIPT } from "./tobuy.mjs";
import { PHRASES_SCRIPT } from "./phrases.mjs";
import { STUDY_SCRIPT } from "./study.mjs";

export const CLIENT_SCRIPT = `
(function () {
  function q(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var root = document.documentElement;

  // ---------- tema: segue o sistema até a pessoa escolher ----------
  var THEME_KEY = 'boutrip-theme';
  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) { /* localStorage bloqueado (file:// em alguns navegadores) */ }

  // claro é o padrão: só data-theme="dark" sai dele
  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  var themeBtn = document.getElementById('themebtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* sem persistência, tema vale só nesta sessão */ }
  });

  // ---------- tamanho do texto (zoom cíclico, 3 níveis) ----------
  // 0 = normal, 1 = grande, 2 = maior. O CSS mapeia data-fontscale -> --ui-scale.
  // O atributo já vem setado do <head> (anti-flash); aqui só ciclamos e persistimos.
  var FS_KEY = 'boutrip-fontscale';
  var fontBtn = document.getElementById('fontbtn');
  if (fontBtn) fontBtn.addEventListener('click', function () {
    var next = (Number(root.getAttribute('data-fontscale') || 0) + 1) % 3;
    if (next) root.setAttribute('data-fontscale', String(next));
    else root.removeAttribute('data-fontscale');
    try { if (next) localStorage.setItem(FS_KEY, String(next)); else localStorage.removeItem(FS_KEY); } catch (e) { /* sem persistência, vale só nesta sessão */ }
    // o mapa calcula tamanhos em px: se estiver aberto, recomputa após o reflow
    if (mapInited && lmap) setTimeout(function () { lmap.invalidateSize(); }, 60);
  });

  // ---------- sombra da app bar ao rolar ----------
  var onScroll = function () { document.body.classList.toggle('scrolled', window.scrollY > 4); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- idioma ----------
  function curLang() { return document.body.getAttribute('data-lang'); }
  function L(v) { return (v && typeof v === 'object') ? (v[curLang()] || v.en || Object.values(v)[0] || '') : (v || ''); }
  q('.lang').forEach(function (b) {
    b.addEventListener('click', function () {
      q('.lang').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('active');
      b.setAttribute('aria-pressed', 'true');
      document.body.setAttribute('data-lang', b.getAttribute('data-lang'));
      dayLabel();
      decCount();
      tdBanner();
      tdNow();
      buyRefresh();
      if (stRoot) { stCounts(); stRender(true); }
      if (mapInited) renderMarkers();
    });
  });

  // ---------- abas (ARIA + navegação por setas) ----------
  var tabs = q('.tab');
  function selectTab(t) {
    tabs.forEach(function (x) { x.setAttribute('aria-selected', 'false'); x.tabIndex = -1; });
    q('.panel').forEach(function (x) { x.classList.remove('active'); });
    t.setAttribute('aria-selected', 'true');
    t.tabIndex = 0;
    var name = t.getAttribute('data-panel');
    var p = document.querySelector('.panel[data-tab="' + name + '"]');
    if (p) p.classList.add('active');
    onView(name);
    // No celular a barra de abas é um carrossel: a aba escolhida pode estar meio
    // fora da tela, e sem isto ela fica selecionada num lugar que não se vê.
    try { t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) { /* navegador antigo: sem rolagem suave, nada quebra */ }
    if (name === 'map') {
      initMap();
      if (lmap) setTimeout(function () { lmap.invalidateSize(); renderMarkers(); }, 60);
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (ev) {
      var dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      ev.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  // ---------- filtro por cidade (vale para todas as abas) ----------
  var allBtn = document.querySelector('.seg.all');
  var citySegs = q('.seg.city');
  var selected = new Set();
  function apply() {
    var on = selected.size > 0;
    document.body.classList.toggle('filtering', on);
    if (allBtn) allBtn.setAttribute('aria-pressed', String(!on));
    citySegs.forEach(function (c) { c.setAttribute('aria-pressed', String(selected.has(c.getAttribute('data-idx')))); });
    q('[data-idx]').forEach(function (el) {
      if (el.classList.contains('seg')) return;
      // um card pode valer para várias paradas ("0 5"): basta uma estar marcada
      el.hidden = on && !el.getAttribute('data-idx').split(' ').some(function (i) { return selected.has(i); });
    });
    if (mapInited) renderMarkers();
  }
  if (allBtn) allBtn.addEventListener('click', function () { selected.clear(); apply(); });
  citySegs.forEach(function (c) {
    c.addEventListener('click', function () {
      var i = c.getAttribute('data-idx');
      if (selected.has(i)) selected.delete(i); else selected.add(i);
      apply();
    });
  });

  // ---------- fade nas bordas da trilha ----------
  // A trilha vira carrossel quando não cabe, e o scrollbar está escondido: sem
  // isto, nada avisa que existem mais cidades fora da tela. Onde ela cabe
  // inteira (desktop), nenhuma classe entra e não há fade.
  // Vale para a trilha de cidades E para a barra de abas: as duas rolam na
  // horizontal no celular e as duas somem sem aviso na borda.
  function edgeFade(el) {
    if (!el) return;
    var max = el.scrollWidth - el.clientWidth;
    el.classList.toggle('fade-l', el.scrollLeft > 2);
    el.classList.toggle('fade-r', el.scrollLeft < max - 2);
  }
  q('.rail, .tabs').forEach(function (el) {
    var upd = function () { edgeFade(el); };
    el.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  });

  // ---------- escolhas do dia e opcionais (salvos só neste aparelho) ----------
  // choices: { idDaEscolha: índiceDaOpção }; skips: { chaveDoItem: true }.
  var CH_KEY = 'boutrip-choices', SK_KEY = 'boutrip-skips';
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem persistência: vale só nesta sessão */ } }
  var choices = load(CH_KEY), skips = load(SK_KEY);

  // opts pode listar várias opções ("0 1"): o item vale se qualquer uma venceu.
  // Sem escolha salva, tudo vale — é o modo de comparar.
  function optAlive(ch, opts) {
    if (!ch || !(ch in choices)) return true;
    return String(opts).split(' ').indexOf(String(choices[ch])) >= 0;
  }
  function applyChoices() {
    q('[data-ch]').forEach(function (el) {
      el.classList.toggle('ch-off', !optAlive(el.getAttribute('data-ch'), el.getAttribute('data-opt')));
    });
    q('[data-choice]').forEach(function (box) {
      var id = box.getAttribute('data-choice'), on = id in choices;
      box.classList.toggle('decided', on);
      q('.ch-btn', box).forEach(function (b) {
        b.setAttribute('aria-checked', String(on && b.getAttribute('data-pick') === String(choices[id])));
      });
    });
    q('[data-sk]').forEach(function (el) { el.classList.toggle('skipped', !!skips[el.getAttribute('data-sk')]); });
    decCount();
    // o "agora" do painel Hoje depende do que está no plano; no 1º passe
    // (ainda na carga) o painel não foi montado e tdDays não existe
    if (tdDays) tdNow();
    if (mapInited) renderMarkers();
  }

  // Contador de decisões em aberto. Conta pelo Roteiro, que tem um bloco por
  // escolha (o calendário repete as mesmas).
  var decBar = document.getElementById('decbar');
  function openChoices() { return q('.panel[data-tab="roteiro"] .ch:not(.decided)'); }
  function decCount() {
    if (!decBar) return;
    var n = openChoices().length;
    decBar.hidden = n === 0;
    var words = n === 1 ? TRIP_I18N.decOne : TRIP_I18N.decMany;
    decBar.querySelector('.dec-txt').textContent = n + ' ' + (words[curLang()] || words.en);
  }
  if (decBar) decBar.addEventListener('click', function () {
    var first = openChoices()[0];
    if (!first) return;
    var tab = document.querySelector('.tab[data-panel="roteiro"]');
    if (tab) selectTab(tab);
    // o filtro por cidade pode estar escondendo o dia da decisão
    if (first.closest('[hidden]')) { selected.clear(); apply(); }
    first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  document.addEventListener('click', function (ev) {
    var el = ev.target;
    var pick = el.closest('.ch-btn');
    if (pick) {
      choices[pick.closest('[data-choice]').getAttribute('data-choice')] = Number(pick.getAttribute('data-pick'));
      save(CH_KEY, choices);
      applyChoices();
      return;
    }
    var reset = el.closest('.ch-reset');
    if (reset) {
      delete choices[reset.closest('[data-choice]').getAttribute('data-choice')];
      save(CH_KEY, choices);
      applyChoices();
      return;
    }
    var skip = el.closest('.skip-btn');
    if (skip) {
      var k = skip.getAttribute('data-sk');
      if (skips[k]) delete skips[k]; else skips[k] = true;
      save(SK_KEY, skips);
      applyChoices();
    }
  });
  applyChoices();

  // ---------- marca o dia de hoje, se a viagem estiver rolando ----------
  (function markToday() {
    var now = new Date();
    var iso = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    var cell = document.querySelector('.day[data-date="' + iso + '"]');
    if (!cell) return;
    cell.classList.add('is-today');
    var tag = document.createElement('span');
    tag.className = 'today-tag';
    Object.keys(TRIP_I18N.today).forEach(function (lg) {
      var s = document.createElement('span');
      s.setAttribute('data-l', lg);
      s.textContent = TRIP_I18N.today[lg];
      tag.appendChild(s);
    });
    var top = cell.querySelector('.cell-top');
    if (top) top.appendChild(tag);
  })();

  // ---------- baixar o KML (embutido no HTML, funciona offline) ----------
  var dl = document.getElementById('dlkml');
  if (dl && TRIP_KML) dl.addEventListener('click', function () {
    var blob = new Blob([TRIP_KML], { type: 'application/vnd.google-earth.kml+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'my-trip.kml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // ---------- filtro por dia (só o mapa) ----------
  // O filtro por cidade vale para todas as abas; este é do mapa e só dele —
  // com 20 dias de viagem, ver todos os pontos de uma vez vira sopa.
  // Índice 0 do range = "todos os dias"; 1..N = TRIP_DAYS[i-1].
  var dayPick = null;
  var dayRange = document.getElementById('mdayRange');
  var dayLbl = document.getElementById('mdayLbl');
  function dayLabel() {
    if (!dayLbl) return;
    var i = dayRange ? Number(dayRange.value) : 0;
    dayLbl.textContent = i === 0 ? (TRIP_I18N.allDays[curLang()] || TRIP_I18N.allDays.en)
                                 : L(TRIP_DAYS[i - 1].l);
  }
  function dayApply() {
    var i = dayRange ? Number(dayRange.value) : 0;
    dayPick = i === 0 ? null : TRIP_DAYS[i - 1].d;
    dayLabel();
    renderMarkers();
  }
  function dayStep(n) {
    if (!dayRange) return;
    var max = Number(dayRange.max);
    // sem wrap: no fim do range os botões param, em vez de pular para o começo
    dayRange.value = Math.min(max, Math.max(0, Number(dayRange.value) + n));
    dayApply();
  }
  if (dayRange) dayRange.addEventListener('input', dayApply);
  var dPrev = document.getElementById('mdayPrev'), dNext = document.getElementById('mdayNext');
  if (dPrev) dPrev.addEventListener('click', function () { dayStep(-1); });
  if (dNext) dNext.addEventListener('click', function () { dayStep(1); });
  dayLabel();

  // ---------- filtro por tipo de ponto (só o mapa) ----------
  // A legenda é o controle. Tipo ausente da lista = tipo que o mapa não tem,
  // então nunca é escondido por engano.
  var kindOff = new Set();
  q('.mk-cb').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var k = cb.getAttribute('data-kind');
      if (cb.checked) kindOff.delete(k); else kindOff.add(k);
      renderMarkers();
    });
  });

  // ---------- mapa ----------
  var mapInited = false, lmap = null, layer = null;
  function popupHtml(m) {
    var nm = L(m.name);
    var s = m.url ? '<a href="' + m.url + '" target="_blank" rel="noopener"><b>' + nm + '</b></a>' : '<b>' + nm + '</b>';
    if (m.tickets) s += ' <a href="' + m.tickets + '" target="_blank" rel="noopener">🎟️</a>';
    if (m.cuisine || m.price) s += '<div style="font-size:12px;margin-top:3px">' + [L(m.cuisine), L(m.price)].filter(Boolean).join(' · ') + '</div>';
    if (m.note) s += '<div style="font-size:12px;margin-top:3px;max-width:260px">' + L(m.note) + '</div>';
    if (m.address) s += '<div style="color:#666;font-size:12px;margin-top:3px">📍 ' + L(m.address) + '</div>';
    var geo = 'geo:' + m.lat + ',' + m.lon + '?q=' + m.lat + ',' + m.lon + '(' + encodeURIComponent(nm) + ')';
    var g = 'https://www.google.com/maps/search/?api=1&query=' + m.lat + ',' + m.lon;
    var osm = 'https://www.openstreetmap.org/?mlat=' + m.lat + '&mlon=' + m.lon + '#map=16/' + m.lat + '/' + m.lon;
    s += '<div style="margin-top:6px;font-size:12px">↪ <a href="' + geo + '">' + TRIP_I18N.mapApp + '</a> · ' +
      '<a href="' + g + '" target="_blank" rel="noopener">Google Maps</a> · ' +
      '<a href="' + osm + '" target="_blank" rel="noopener">OSM</a></div>';
    return s;
  }
  function makeMarker(m) {
    var mk;
    if (m.kind === 'place') {
      mk = window.L.circleMarker([m.lat, m.lon], { radius: 7, color: '#fff', weight: 2, fillColor: m.color, fillOpacity: 1 });
    } else {
      // hospedagem e estação: pino com emoji. A cor já significa "cidade", então
      // o que distingue o tipo de ponto tem que ser a forma, não a cor.
      mk = window.L.marker([m.lat, m.lon], {
        icon: window.L.divIcon({
          html: '<span>' + (m.icon || '📍') + '</span>',
          className: 'mk mk-' + m.kind,
          iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13]
        })
      });
    }
    mk.bindPopup(popupHtml(m));
    return mk;
  }
  function renderMarkers() {
    if (!mapInited) return;
    layer.clearLayers();
    var on = selected.size > 0, pts = [];
    TRIP_MARKERS.forEach(function (m) {
      // sem idx = ponto que não pertence a nenhuma parada (ex.: reserva numa
      // cidade fora do roteiro): fica visível em vez de sumir num filtro que não o conhece.
      if (on && m.idx !== undefined && !String(m.idx).split(' ').some(function (i) { return selected.has(i); })) return;
      // days null = ponto sem data conhecida, aparece em qualquer dia.
      if (dayPick && m.days && m.days.indexOf(dayPick) < 0) return;
      if (kindOff.has(m.kind)) return;
      // ponto de uma opção que perdeu a escolha, ou de um opcional pulado
      if (m.ch && !optAlive(m.ch, m.opt)) return;
      if (m.sk && skips[m.sk]) return;
      makeMarker(m).addTo(layer);
      pts.push([m.lat, m.lon]);
    });
    if (pts.length) lmap.fitBounds(pts, { padding: [34, 34], maxZoom: 13 });
  }
  function initMap() {
    if (mapInited) return;
    if (typeof window.L === 'undefined' || !document.getElementById('map') || !TRIP_MARKERS.length) return;
    lmap = window.L.map('map', { scrollWheelZoom: true });
    // Espelho alemão do OSM: o tile.openstreetmap.org bloqueia a página aberta como
    // arquivo local (file://, sem Referer), e a CARTO passou a exigir chave.
    window.L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(lmap);
    layer = window.L.layerGroup().addTo(lmap);
    mapInited = true;
    renderMarkers();
  }
${TODAY_SCRIPT}
${BUY_SCRIPT}
${PHRASES_SCRIPT}
${STUDY_SCRIPT}
})();
`;
