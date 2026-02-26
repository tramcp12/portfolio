/* ── Journal renderer ───────────────────────────────── */
(function () {
  var dataEl = document.getElementById("journal-data");
  if (!dataEl) return;
  var entries;
  try {
    entries = JSON.parse(dataEl.textContent);
  } catch (e) {
    console.warn("[CP12] Journal data parse error:", e);
    return;
  }
  var grid = document.getElementById("journal-grid");
  if (!grid || !Array.isArray(entries)) return;

  /* Parse lang strings injected by build.js — same pattern as lang-switcher */
  var stringsMap = {};
  try {
    var viEl = document.getElementById("lang-vi-data");
    var enEl = document.getElementById("lang-en-data");
    if (viEl) stringsMap["vi"] = JSON.parse(viEl.textContent);
    if (enEl) stringsMap["en"] = JSON.parse(enEl.textContent);
  } catch (e) {
    console.warn("[CP12] Journal string data parse error:", e);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderJournal(lang) {
    var strings = stringsMap[lang] || stringsMap["en"] || {};
    var readMore = strings["journal.readMore"] || "Read More";

    var html = entries.map(function (e, i) {
      var n = i + 1;
      var cat     = strings["journal.card" + n + ".cat"]    || e.cat;
      var title   = strings["journal.card" + n + ".title"]  || e.title;
      var excerpt = strings["journal.card" + n + ".excerpt"] || e.excerpt;
      var largeClass = e.large ? " large" : "";

      return (
        '<article class="blog-card' + largeClass + '">' +
        '<div class="blog-card-img" role="img" aria-label="' + escHtml(e.imgLabel) + '">' +
        '<div class="room-img-bg ' + escHtml(e.bgClass) + '"></div>' +
        "</div>" +
        '<div class="blog-card-body">' +
        '<p class="blog-card-cat">' + escHtml(cat) + "</p>" +
        '<h3 class="blog-card-title">' + escHtml(title) + "</h3>" +
        '<p class="blog-card-excerpt">' + escHtml(excerpt) + "</p>" +
        '<a href="' + escHtml(e.href) + '" class="blog-link">' +
        "<span>" + escHtml(readMore) + "</span>" +
        '<span class="sr-only">about ' + escHtml(e.linkLabel) + "</span>&rarr;" +
        "</a>" +
        "</div>" +
        "</article>"
      );
    }).join("\n");

    grid.innerHTML = html;
  }

  /* Expose for lang-switcher to call on language change */
  window.cp12RenderJournal = renderJournal;

  /* Initial render — use language already resolved by lang-switcher (IIFE 0) */
  renderJournal(window.cp12Lang || "vi");
})();
