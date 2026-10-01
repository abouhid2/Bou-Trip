// =====================================================================
// client-today.mjs — parte do script do navegador que cuida do painel
// Hoje, da barra de baixo do celular e do menu "Mais".
//
// Exportado como string e embutido DENTRO do IIFE de client.mjs: usa q,
// curLang e selectTab de lá. Mesmo ES5 puro.
// =====================================================================

export const TODAY_SCRIPT = `
  // ---------- painel Hoje ----------
  var tdDays = q('.td-day');
  var tdPrev = document.getElementById('tdPrev'), tdNext = document.getElementById('tdNext');
  var tdHome = document.getElementById('tdHome'), tdBan = document.getElementById('tdBanner');
  var tdCur = 0;
  function isoOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dateOf(i) { return tdDays[i].getAttribute('data-date'); }
  // A data do aparelho, não um fuso fixo: no destino o celular já troca de
  // fuso sozinho. Antes da viagem abre o 1º dia; depois dela, o último.
  function homeIndex() {
    var today = isoOf(new Date()), last = tdDays.length - 1;
    if (today <= dateOf(0)) return 0;
    if (today >= dateOf(last)) return last;
    for (var i = 0; i < tdDays.length; i++) if (dateOf(i) === today) return i;
    return 0;
  }
  function tdBanner() {
    if (!tdBan) return;
    var n = Math.round((Date.parse(dateOf(0)) - Date.parse(isoOf(new Date()))) / 864e5);
    if (n <= 0 || tdCur !== 0) { tdBan.hidden = true; return; }
    var w = n === 1 ? TRIP_I18N.daysLeft1 : TRIP_I18N.daysLeft;
    tdBan.textContent = (w[curLang()] || w.en).replace('{n}', n);
    tdBan.hidden = false;
  }
  // "Agora" e "a seguir": só no dia de hoje, só entre itens com horário, e
  // ignorando o que está fora do plano (opção não escolhida, decisão ainda em
  // aberto, opcional pulado).
  function tdNow() {
    q('.td-day .now-tag').forEach(function (t) { t.remove(); });
    q('.td-day .is-now, .td-day .is-next').forEach(function (li) { li.classList.remove('is-now', 'is-next'); });
    var day = tdDays[tdCur];
    if (!day || dateOf(tdCur) !== isoOf(new Date())) return;
    var d = new Date(), mins = d.getHours() * 60 + d.getMinutes(), now = null, next = null;
    q('li[data-start]', day).forEach(function (li) {
      if (li.closest('.ch-off') || li.closest('.ch:not(.decided)') || li.classList.contains('skipped')) return;
      var s = Number(li.getAttribute('data-start'));
      var e = li.hasAttribute('data-end') ? Number(li.getAttribute('data-end')) : s + 60;
      if (e < s) e += 1440; // atravessa a meia-noite (22:00 → 00:40)
      if (s <= mins && mins < e) now = li;
      else if (s > mins && (!next || s < Number(next.getAttribute('data-start')))) next = li;
    });
    [[now, 'is-now', TRIP_I18N.now], [next, 'is-next', TRIP_I18N.next]].forEach(function (x) {
      if (!x[0]) return;
      x[0].classList.add(x[1]);
      var tag = document.createElement('span');
      tag.className = 'now-tag';
      tag.textContent = x[2][curLang()] || x[2].en;
      x[0].insertBefore(tag, x[0].firstChild);
    });
  }
  function tdShow(i) {
    if (!tdDays.length) return;
    tdCur = Math.max(0, Math.min(tdDays.length - 1, i));
    tdDays.forEach(function (el, j) { el.hidden = j !== tdCur; });
    if (tdPrev) tdPrev.disabled = tdCur === 0;
    if (tdNext) tdNext.disabled = tdCur === tdDays.length - 1;
    if (tdHome) tdHome.hidden = tdCur === homeIndex();
    tdBanner();
    tdNow();
  }
  if (tdPrev) tdPrev.addEventListener('click', function () { tdShow(tdCur - 1); });
  if (tdNext) tdNext.addEventListener('click', function () { tdShow(tdCur + 1); });
  if (tdHome) tdHome.addEventListener('click', function () { tdShow(homeIndex()); });
  tdShow(homeIndex());
  setInterval(tdNow, 60000);

  // A visão geral do dia vem recolhida em poucas linhas; um toque abre.
  q('.td-note').forEach(function (p) {
    function toggle() {
      var open = p.classList.toggle('open');
      p.setAttribute('aria-expanded', String(open));
    }
    p.addEventListener('click', toggle);
    p.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
    });
  });

  // Tela cheia com o nome e o endereço do hotel na escrita local, para o taxista.
  var driver = document.getElementById('driver');
  q('.td-driver').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!driver || !driver.showModal) return;
      driver.querySelector('.driver-name').textContent = b.getAttribute('data-name');
      driver.querySelector('.driver-addr').textContent = b.getAttribute('data-addr');
      driver.showModal();
    });
  });

  // ---------- barra de baixo e menu "Mais" ----------
  var sheet = document.getElementById('moresheet');
  var bnMore = document.getElementById('bnMore');
  function goTab(name) {
    var t = document.querySelector('.tab[data-panel="' + name + '"]');
    if (!t) return;
    selectTab(t);
    window.scrollTo(0, 0);
  }
  // Chamado pelo selectTab: a barra de baixo só espelha a aba aberta.
  function onView(name) {
    document.body.setAttribute('data-view', name);
    var inMore = bnMore && (' ' + bnMore.getAttribute('data-more') + ' ').indexOf(' ' + name + ' ') >= 0;
    q('.bn').forEach(function (b) {
      var on = b === bnMore ? inMore : b.getAttribute('data-go') === name;
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (name === 'today') tdNow();
  }
  q('.bn[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { goTab(b.getAttribute('data-go')); });
  });
  if (bnMore && sheet && sheet.showModal) bnMore.addEventListener('click', function () { sheet.showModal(); });
  q('.sheet-btn').forEach(function (b) {
    b.addEventListener('click', function () { sheet.close(); goTab(b.getAttribute('data-go')); });
  });
  // toque fora do cartão (no fundo escurecido) fecha o menu
  if (sheet) sheet.addEventListener('click', function (ev) { if (ev.target === sheet) sheet.close(); });
  onView('today');
`;
