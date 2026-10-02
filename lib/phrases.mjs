// =====================================================================
// phrases.mjs — aba "Frases": o básico para se virar na língua local.
// Cada frase traz a escrita local, a pronúncia romanizada e a tradução;
// um toque abre em tela cheia para mostrar à pessoa (e ouvir, se o
// aparelho tiver voz no idioma).
//
// O conteúdo vem do trip.json (`phrases[]`), então serve para qualquer país.
// =====================================================================

function phraseBtn(h, p) {
  const note = p.note ? `<span class="ph-note">${h.bi(p.note)}</span>` : "";
  // Dois botões lado a lado (botão dentro de botão não vale): abrir em tela cheia e ouvir.
  return `<div class="ph">
          <button class="ph-open" type="button">
            <span class="ph-tr">${h.bi(p.text)}</span>
            <span class="ph-local" lang="${h.esc(h.speechLang)}">${h.esc(p.local)}</span>
            <span class="ph-roman">${h.esc(p.roman || "")}</span>${note}
          </button>
          <button class="ph-say say-btn" type="button" data-say="${h.esc(p.local)}" aria-label="${h.esc(h.uiStr(h.PRIMARY, "listen"))}: ${h.esc(p.roman || p.local)}" hidden>🔊</button>
        </div>`;
}

function phraseGroup(h, g, i) {
  const note = g.note ? `<p class="ph-gnote">${h.bi(g.note)}</p>` : "";
  return `<section class="ph-group${g.compact ? " ph-compact" : ""}" id="ph-g${i}">
      <h3 class="ph-title">${g.icon ? `<span aria-hidden="true">${h.esc(g.icon)}</span> ` : ""}${h.bi(g.group)}</h3>${note}
      <div class="ph-list">
        ${g.items.map((p) => phraseBtn(h, p)).join("\n        ")}
      </div>
    </section>`;
}

export function phrasesPanel(h) {
  const jump = h.phrases.map((g, i) => `<button class="bc-seg ph-jump" type="button" data-target="ph-g${i}">${g.icon ? `${h.esc(g.icon)} ` : ""}${h.bi(g.group)}</button>`).join("");
  return `<p class="bc-intro" data-say-lang="${h.esc(h.speechLang)}">${h.uiBi("phrasesIntro")}</p>
    <nav class="ph-jumps" aria-label="${h.esc(h.uiStr(h.PRIMARY, "phrases"))}">${jump}</nav>
    ${h.phrases.map((g, i) => phraseGroup(h, g, i)).join("\n    ")}
    <dialog class="driver" id="phshow">
      <p class="driver-hint">${h.uiBi("phraseHint")}</p>
      <p class="driver-addr phs-local" lang="${h.esc(h.speechLang)}"></p>
      <p class="phs-roman"></p>
      <p class="phs-tr"></p>
      <div class="phs-acts">
        <button class="driver-close phs-say say-btn" type="button" data-say="" hidden>🔊 ${h.uiBi("listen")}</button>
        <form method="dialog"><button class="driver-close" type="submit">${h.uiBi("close")}</button></form>
      </div>
    </dialog>`;
}

// Script do navegador. Embutido no IIFE de client.mjs: usa q. ES5 puro.
export const PHRASES_SCRIPT = `
  // ---------- voz (Frases e Estudar) ----------
  // A voz vem do aparelho: sem voz no idioma, os botões de ouvir nem aparecem.
  var SAY_LANG = (document.querySelector('[data-say-lang]') || { getAttribute: function () { return ''; } }).getAttribute('data-say-lang');
  var canSpeak = !!(SAY_LANG && window.speechSynthesis && window.SpeechSynthesisUtterance);
  function sayLocal(text) {
    if (!canSpeak) return;
    // "…" marca onde entra um nome ou lugar: não é para ler em voz alta
    var u = new SpeechSynthesisUtterance(String(text).replace(/…/g, ' '));
    u.lang = SAY_LANG;
    u.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    // o Safari do iPhone às vezes começa pausado
    setTimeout(function () { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 100);
  }
  q('.say-btn').forEach(function (b) {
    b.hidden = !canSpeak;
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      sayLocal(b.getAttribute('data-say'));
    });
  });

  // ---------- aba Frases ----------
  var phShow = document.getElementById('phshow');
  q('.ph-open').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!phShow || !phShow.showModal) return;
      var local = b.querySelector('.ph-local').textContent;
      phShow.querySelector('.phs-local').textContent = local;
      phShow.querySelector('.phs-roman').textContent = b.querySelector('.ph-roman').textContent;
      phShow.querySelector('.phs-tr').innerHTML = b.querySelector('.ph-tr').innerHTML;
      phShow.querySelector('.phs-say').setAttribute('data-say', local);
      phShow.showModal();
    });
  });
  if (phShow) phShow.addEventListener('close', function () { if (canSpeak) window.speechSynthesis.cancel(); });
  q('.ph-jump').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = document.getElementById(b.getAttribute('data-target'));
      if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
`;
