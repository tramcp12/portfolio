/* ── 7. FAQ renderer ───────────────────────────────────── */
(function () {
  try {
    const dataEl = document.getElementById("faq-data");
    if (!dataEl) return;
    let faq;
    try {
      faq = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.warn("[CP12] FAQ data parse error:", e);
      return;
    }
    const grid = document.querySelector(".faq-grid");
    if (!grid || !Array.isArray(faq)) return;

    const escHtml = window.cp12Esc;

    function renderFaq(lang) {
      const strings = window.cp12GetStrings(lang);
      
      const html = faq.map(function(item) {
        const qKey = item.key + ".question";
        const aKey = item.key + ".answer";
        const question = strings[qKey] || "";
        const answer = strings[aKey] || "";

        return (
          '<details class="faq-item">' +
            '<summary class="faq-question">' +
              '<h3 data-i18n="' + escHtml(qKey) + '">' + escHtml(question) + '</h3>' +
            '</summary>' +
            '<p class="faq-answer" data-i18n="' + escHtml(aKey) + '">' +
              escHtml(answer) +
            '</p>' +
          '</details>'
        );
      }).join("\n");

      grid.innerHTML = html;
    }

    /* Expose for lang-switcher to call on language change */
    window.cp12RenderFaq = renderFaq;

    /* Initial render */
    renderFaq(window.cp12Lang || "vi");
  } catch (e) { console.warn("[CP12] faq init error:", e); }
})();
