// =====================================================================
// today.mjs — painel "Hoje": o dia da viagem em que a pessoa está, feito
// para ser usado na rua. O que vem agora, as decisões do dia e onde dormir,
// com o endereço do hotel em letra grande para mostrar ao taxista.
//
// O HTML traz todos os dias prontos e escondidos; o cliente decide qual
// mostrar pela data do aparelho (que no destino já está no fuso local).
// =====================================================================

const CJK = /[㐀-鿿]/;

// A parte do endereço no idioma local ("... · 上海市黄浦区福州路355号"): é o
// que o taxista lê. Sem escrita local, o endereço inteiro serve.
const localPart = (address) => String(address).split(" · ").find((p) => CJK.test(p)) || null;

// Só os caracteres locais de um nome ("BAIhome Hotel 百致酒店 (...)" → "百致酒店").
const localName = (name) => (String(name).match(/[㐀-鿿　-〿·]+/g) || []).join(" ").trim() || null;

// "~13:45–16:00" → início e fim em minutos, para o cliente achar o "agora".
// Sem horário, o item não entra na conta.
export function timeSpan(time) {
  const hits = [...String(time ?? "").matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (!hits.length) return "";
  return ` data-start="${hits[0]}"${hits[1] > hits[0] ? ` data-end="${hits[1]}"` : ""}`;
}

// A reserva onde se dorme numa data: check-in <= data < check-out.
const stayFor = (stays, iso) => stays.find((s) => s.checkIn && s.checkOut && s.checkIn <= iso && iso < s.checkOut);

function stayCard(h, s) {
  const local = s.address ? localPart(h.tx(s.address, h.PRIMARY)) : null;
  const driver = local || (s.address ? h.tx(s.address, h.PRIMARY) : null);
  const map = s.coords ? `<a class="td-act" href="${h.esc(h.mapLinkFor(s.coords))}" target="_blank" rel="noopener">📍 ${h.uiBi("map")}</a>` : "";
  const phone = s.phone ? `<a class="td-act" href="tel:${h.esc(String(s.phone).replace(/[^+\d]/g, ""))}">📞 ${h.esc(s.phone)}</a>` : "";
  const show = driver
    ? `<button class="td-act td-driver" type="button" data-name="${h.esc(localName(s.name) || h.tx(s.name, h.PRIMARY))}" data-addr="${h.esc(driver)}">🚕 ${h.uiBi("showDriver")}</button>`
    : "";
  return `<div class="td-stay">
        <div class="td-label">🛏️ ${h.uiBi("tonight")}</div>
        <div class="td-stay-name">${h.bi(s.name)}</div>
        ${local ? `<div class="td-stay-local" lang="zh">${h.esc(local)}</div>` : ""}
        <div class="td-acts">${show}${map}${phone}</div>
      </div>`;
}

// Um dia do painel. h = helpers do render (bi, uiBi, esc, tx...), itemsHtml =
// a lista do dia já montada pelo render (com decisões e opcionais).
function dayBlock(h, c, i, total) {
  const iso = h.isoDate(c.date);
  const stay = stayFor(h.stays, iso);
  const count = h.LANGS.map((l) => h.span(l, `${h.uiStr(l, "dayWord")} ${i + 1} ${h.uiStr(l, "ofWord")} ${total}`)).join("");
  const note = c.note ? `<p class="td-note" role="button" tabindex="0" aria-expanded="false">${h.bi(c.note)}</p>` : "";
  return `<section class="td-day" data-date="${iso}" hidden style="--city:${c.color}">
      <div class="td-top">
        <div class="td-when"><span class="td-date">${h.dateLong(c.date)}</span><span class="td-count">${count}</span></div>
        <div class="td-city">${h.bi(c.cityRaw)}${c.suffix}</div>
      </div>
      ${note}
      <div class="td-items">${h.itemsHtml(c)}</div>
      ${stay ? stayCard(h, stay) : ""}
    </section>`;
}

export function todayPanel(h) {
  const days = h.cells.map((c, i) => dayBlock(h, c, i, h.cells.length)).join("\n    ");
  return `<div class="td-nav">
      <button class="td-step" id="tdPrev" type="button" aria-label="${h.esc(h.uiStr(h.PRIMARY, "prevDay"))}">‹</button>
      <div class="td-banner" id="tdBanner" hidden></div>
      <button class="td-home" id="tdHome" type="button" hidden>${h.uiBi("backToday")}</button>
      <button class="td-step" id="tdNext" type="button" aria-label="${h.esc(h.uiStr(h.PRIMARY, "nextDay"))}">›</button>
    </div>
    ${days}
    <dialog class="driver" id="driver">
      <p class="driver-hint">${h.uiBi("driverHint")}</p>
      <p class="driver-name" lang="zh"></p>
      <p class="driver-addr" lang="zh"></p>
      <form method="dialog"><button class="driver-close" type="submit">${h.uiBi("close")}</button></form>
    </dialog>`;
}
