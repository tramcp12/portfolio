/* ── Travel cards renderer ───────────────────────────── */
(function () {
  var dataEl = document.getElementById("travel-data");
  if (!dataEl) return;
  var travels;
  try {
    travels = JSON.parse(dataEl.textContent);
  } catch (e) {
    console.warn("[CP12] Travel data parse error:", e);
    return;
  }
  var grid = document.getElementById("travel-tabpanel");
  if (!grid || !Array.isArray(travels)) return;

  /* Map travel.json difficulty strings to i18n key suffixes */
  var diffKeys = { "Easy": "easy", "Medium": "medium", "Hard": "hard", "Easy–Med": "easyMed" };

  /* Localised badge strings — mirrors strings.vi/en.json */
  var badgeStrings = {
    "vi": { easy: "Dễ", medium: "Trung Bình", hard: "Khó", easyMed: "Dễ–TB", runnersPick: "Lựa Chọn Runner" },
    "en": { easy: "Easy", medium: "Medium", hard: "Hard", easyMed: "Easy–Med", runnersPick: "Runner's Pick" }
  };

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Render once only — card text content is English-only in travel.json.
   * Badge labels use data-i18n so lang-switcher handles them on language change. */
  function renderTravel(lang) {
    var b = badgeStrings[lang] || badgeStrings["en"];

    var html = travels.map(function (t) {
      var diffKey = diffKeys[t.difficulty] || "easy";
      var diffI18nKey = "explore.diff." + diffKey;
      var diffLabel = b[diffKey] || escHtml(t.difficulty);

      var runnerBadge = t.badge === "runner"
        ? '<div class="runner-badge">' +
          '<span aria-hidden="true">🏃</span> ' +
          '<span data-i18n="explore.runnersPick">' + b.runnersPick + "</span>" +
          "</div>"
        : "";

      return (
        '<div class="travel-card" data-category="' + escHtml(t.category) + '">' +
        '<div class="travel-card-img">' +
        '<div class="travel-card-img-bg ' + escHtml(t.bgClass) + '"></div>' +
        runnerBadge +
        '<div class="diff-badge" data-i18n="' + diffI18nKey + '">' + diffLabel + "</div>" +
        "</div>" +
        '<div class="travel-body">' +
        '<p class="travel-cat">' + escHtml(t.cat) + "</p>" +
        '<h3 class="travel-name">' + escHtml(t.name) + "</h3>" +
        '<div class="travel-meta">' +
        '<span><span aria-hidden="true">📍</span> ' + escHtml(t.distance) + "</span>" +
        '<span><span aria-hidden="true">⏱</span> ' + escHtml(t.duration) + "</span>" +
        "</div>" +
        '<p class="travel-highlight">' + escHtml(t.highlight) + "</p>" +
        "</div>" +
        "</div>"
      );
    }).join("\n");

    grid.innerHTML = html;
  }

  /* Expose for filter-tabs IIFE re-query and lang-switcher (badge labels via data-i18n) */
  window.cp12RenderTravel = renderTravel;

  /* Initial render — use language already resolved by lang-switcher (IIFE 0) */
  renderTravel(window.cp12Lang || "vi");
})();
