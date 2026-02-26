/* ── 2. Travel filter tabs ────────────────────────────────── */
(function () {
  var wrap = document.getElementById("cp12-wrap");
  var tabs = wrap ? wrap.querySelectorAll(".filter-tabs .tab") : [];
  var cards = wrap ? wrap.querySelectorAll(".travel-card") : [];
  var grid = wrap ? wrap.querySelector(".travel-grid") : null;
  var status = document.getElementById("travel-filter-status");

  /* CRIT-3: Initialise tabpanel aria-labelledby to the default active tab */
  if (grid) grid.setAttribute("aria-labelledby", "tab-all");

  function filterCards(f, activeTabId) {
    var count = 0;
    cards.forEach(function (c) {
      var cat = c.getAttribute("data-category");
      var show = f === "all" || cat === f;
      c.style.display = show ? "" : "none";
      if (show) count++;
    });
    /* CRIT-3: Keep tabpanel label in sync with the active tab */
    if (grid && activeTabId) {
      grid.setAttribute("aria-labelledby", activeTabId);
    }
    /* CRIT-3: Announce result count via dedicated status element (not tabpanel) */
    if (status) {
      status.textContent =
        count + " destination" + (count !== 1 ? "s" : "") + " shown";
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");
      filterCards(this.getAttribute("data-filter"), this.id);
    });
  });
})();
