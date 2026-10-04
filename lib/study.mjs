// =====================================================================
// study.mjs — aba "Estudar": flashcards com as mesmas frases da aba Frases.
// Duas direções: reconhecer (vê o chinês, lembra o sentido) e falar (vê a
// tradução, tenta dizer em chinês). Cada carta mostra também o que quer dizer
// cada caractere, tirado do `glossary` do trip.json.
//
// "Sei" / "Revisar" fica salvo no aparelho; o grupo "Para revisar" junta os erros.
// =====================================================================

const CJK = /[㐀-鿿]/;

// Os caracteres da frase que têm verbete, sem repetir, na ordem em que aparecem.
// Carta de um caractere só não precisa: a resposta já é o verbete.
function partsOf(local, glossary) {
  const chars = [...String(local)].filter((c) => CJK.test(c));
  if (chars.length < 2) return [];
  return [...new Set(chars)].filter((c) => glossary[c]).map((c) => [c, glossary[c].roman, { en: glossary[c].en, pt: glossary[c].pt }]);
}

export function studyCards(phrases, glossary) {
  return phrases.flatMap((g, gi) => g.items.map((p) => ({
    g: gi, local: p.local, roman: p.roman || "", tr: p.text, note: p.note || null, parts: partsOf(p.local, glossary),
  })));
}

export function studyPanel(h) {
  const grp = (g, label) => `<button class="st-grp" type="button" data-g="${g}"><span class="st-name">${label}</span><span class="st-count"></span><span class="st-bar"><i></i></span></button>`;
  const groups = h.phrases.map((g, i) => grp(i, `${g.icon ? `${h.esc(g.icon)} ` : ""}${h.bi(g.group)}`)).join("");
  const mode = (m, key) => `<button class="bc-seg" type="button" data-mode="${m}" aria-pressed="${m === "read"}">${h.uiBi(key)}</button>`;
  return `<div id="study">
    <script type="application/json" id="studydata">${h.json(h.cards)}</script>
    <div class="st-setup">
      <p class="bc-intro">${h.uiBi("studyIntro")}</p>
      <div class="bc-segs st-modes" role="group" aria-label="${h.esc(h.uiStr(h.PRIMARY, "studyModeAria"))}">${mode("read", "studyRead")}${mode("say", "studySay")}</div>
      <div class="st-grps">
        ${grp("all", `📚 ${h.uiBi("studyAll")}`)}
        ${grp("review", `🔁 ${h.uiBi("studyReview")}`)}
        ${groups}
      </div>
    </div>
    <div class="st-session" hidden>
      <div class="st-head">
        <div class="st-top">
          <button class="td-act st-exit" type="button">← ${h.uiBi("studyExit")}</button>
          <span class="st-pos"></span>
        </div>
        <div class="st-prog"><i></i></div>
        <div class="st-acts">
          <button class="st-btn st-again" type="button">↺ ${h.uiBi("studyAgain")}</button>
          <button class="say-btn st-say" type="button" data-say="" aria-label="${h.esc(h.uiStr(h.PRIMARY, "listen"))}" hidden>🔊</button>
          <button class="st-btn st-know" type="button">✓ ${h.uiBi("studyKnow")}</button>
        </div>
      </div>
      <div class="st-card" role="button" tabindex="0" aria-live="polite">
        <div class="st-q"></div>
        <div class="st-hint">${h.uiBi("studyTap")}</div>
        <div class="st-a">
          <div class="st-local" lang="${h.esc(h.speechLang)}"></div>
          <div class="st-roman"></div>
          <div class="st-tr"></div>
          <div class="st-note"></div>
          <ul class="st-parts"></ul>
        </div>
      </div>
    </div>
    <div class="st-done" hidden>
      <p class="st-done-title">${h.uiBi("studyDone")}</p>
      <p class="st-score"><span class="st-score-k"></span> ✓ · <span class="st-score-r"></span> ↺</p>
      <div class="st-acts">
        <button class="st-btn st-retry" type="button">🔁 ${h.uiBi("studyRetry")}</button>
        <button class="st-btn st-back" type="button">${h.uiBi("studyBack")}</button>
      </div>
    </div>
  </div>`;
}

// Script do navegador. Embutido no IIFE de client.mjs depois do PHRASES_SCRIPT:
// usa q, load, save, curLang, L e sayLocal de lá. ES5 puro.
export const STUDY_SCRIPT = `
  // ---------- aba Estudar ----------
  var stRoot = document.getElementById('study');
  var ST_KEY = 'boutrip-study', ST_VIEW = 'boutrip-studyview';
  var stData = stRoot ? JSON.parse(document.getElementById('studydata').textContent) : [];
  var stDeck = [], stIdx = 0, stKnow = 0, stMissed = [];
  function stEl(s) { return stRoot.querySelector(s); }
  function stMode() { return load(ST_VIEW).mode || 'read'; }
  function stPick(g) {
    var prog = load(ST_KEY);
    if (g === 'all') return stData;
    if (g === 'review') return stData.filter(function (c) { return prog[c.local] === 'review'; });
    return stData.filter(function (c) { return String(c.g) === g; });
  }
  function stCounts() {
    if (!stRoot) return;
    var prog = load(ST_KEY);
    q('.st-grp', stRoot).forEach(function (b) {
      var g = b.getAttribute('data-g'), list = stPick(g), k = 0;
      list.forEach(function (c) { if (prog[c.local] === 'know') k++; });
      if (g === 'review') {
        b.hidden = !list.length;
        b.querySelector('.st-count').textContent = list.length;
        return;
      }
      b.querySelector('.st-count').textContent = k + '/' + list.length;
      b.querySelector('.st-bar i').style.width = (list.length ? k * 100 / list.length : 0) + '%';
    });
    q('.bc-seg[data-mode]', stRoot).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === stMode())); });
  }
  function stShow(part) {
    stEl('.st-setup').hidden = part !== 'setup';
    stEl('.st-session').hidden = part !== 'session';
    stEl('.st-done').hidden = part !== 'done';
    if (part === 'setup') stCounts();
    window.scrollTo(0, 0);
  }
  function stShuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function stStart(list) {
    if (!list.length) return;
    stDeck = stShuffle(list.slice()); stIdx = 0; stKnow = 0; stMissed = [];
    stShow('session');
    stRender();
  }
  // keep = só trocou o idioma: a carta continua virada como estava
  function stRender(keep) {
    if (!stRoot || stEl('.st-session').hidden) return;
    if (stIdx >= stDeck.length) { stFinish(); return; }
    var c = stDeck[stIdx], say = stMode() === 'say', card = stEl('.st-card');
    // carta nova começa do topo: os botões fixos não podem cobrir o início dela
    if (!keep) { card.classList.remove('revealed'); window.scrollTo(0, 0); }
    card.style.transform = '';
    var qEl = stEl('.st-q');
    qEl.textContent = say ? L(c.tr) : c.local;
    qEl.className = 'st-q ' + (say ? 'st-q-tr' : 'st-q-local');
    if (say) qEl.removeAttribute('lang'); else qEl.setAttribute('lang', stEl('.st-local').getAttribute('lang'));
    stEl('.st-local').textContent = c.local;
    stEl('.st-local').hidden = !say;
    stEl('.st-roman').textContent = c.roman;
    stEl('.st-tr').textContent = L(c.tr);
    stEl('.st-tr').hidden = say;
    stEl('.st-note').textContent = c.note ? L(c.note) : '';
    stEl('.st-parts').innerHTML = '';
    c.parts.forEach(function (p) {
      var li = document.createElement('li');
      var ch = document.createElement('b'); ch.textContent = p[0];
      var rest = document.createElement('span'); rest.textContent = p[1] + ' · ' + L(p[2]);
      li.appendChild(ch); li.appendChild(rest);
      stEl('.st-parts').appendChild(li);
    });
    stEl('.st-say').setAttribute('data-say', c.local);
    stEl('.st-pos').textContent = (stIdx + 1) + ' / ' + stDeck.length;
    stEl('.st-prog i').style.width = (stIdx * 100 / stDeck.length) + '%';
  }
  function stMark(know) {
    var c = stDeck[stIdx];
    if (!c) return;
    var prog = load(ST_KEY);
    prog[c.local] = know ? 'know' : 'review';
    save(ST_KEY, prog);
    if (know) stKnow++; else stMissed.push(c);
    if (canSpeak) window.speechSynthesis.cancel();
    stIdx++;
    stRender();
  }
  function stFinish() {
    stEl('.st-score-k').textContent = stKnow;
    stEl('.st-score-r').textContent = stMissed.length;
    stEl('.st-retry').hidden = !stMissed.length;
    stShow('done');
  }
  function stFlip() {
    var card = stEl('.st-card');
    card.classList.toggle('revealed');
    // no modo falar, ouvir a resposta ao virar é o que confere a pronúncia
    if (card.classList.contains('revealed') && stMode() === 'say') sayLocal(stDeck[stIdx].local);
  }
  if (stRoot) {
    q('.st-grp', stRoot).forEach(function (b) {
      b.addEventListener('click', function () { stStart(stPick(b.getAttribute('data-g'))); });
    });
    q('.bc-seg[data-mode]', stRoot).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = load(ST_VIEW); v.mode = b.getAttribute('data-mode'); save(ST_VIEW, v);
        stCounts();
      });
    });
    stEl('.st-know').addEventListener('click', function () { stMark(true); });
    stEl('.st-again').addEventListener('click', function () { stMark(false); });
    stEl('.st-exit').addEventListener('click', function () { stShow('setup'); });
    stEl('.st-back').addEventListener('click', function () { stShow('setup'); });
    stEl('.st-retry').addEventListener('click', function () { stStart(stMissed); });

    // Toque vira a carta; arrastar para o lado responde (direita = sei).
    var card = stEl('.st-card'), x0 = null, dx = 0;
    card.addEventListener('pointerdown', function (ev) { x0 = ev.clientX; dx = 0; });
    card.addEventListener('pointermove', function (ev) {
      if (x0 === null) return;
      dx = ev.clientX - x0;
      if (Math.abs(dx) > 6) card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 25) + 'deg)';
    });
    function release() {
      if (x0 === null) return;
      x0 = null;
      if (dx > 90) stMark(true);
      else if (dx < -90) stMark(false);
      else { card.style.transform = ''; if (Math.abs(dx) <= 6) stFlip(); }
    }
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', function () { x0 = null; card.style.transform = ''; });
    card.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); stFlip(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (stEl('.st-session').hidden || document.body.getAttribute('data-view') !== 'study') return;
      if (ev.key === 'ArrowRight') stMark(true);
      else if (ev.key === 'ArrowLeft') stMark(false);
    });
    stCounts();
  }
`;
