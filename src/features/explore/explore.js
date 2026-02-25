/* ── 2. Travel filter tabs ────────────────────────────────── */
(function () {
  var wrap = document.getElementById("cp12-wrap");
  var tabs = wrap ? wrap.querySelectorAll(".filter-tabs .tab") : [];
  var cards = wrap ? wrap.querySelectorAll(".travel-card") : [];

  function filterCards(f) {
    var count = 0;
    cards.forEach(function (c) {
      var cat = c.getAttribute("data-category");
      var show = f === "all" || cat === f;
      c.style.display = show ? "" : "none";
      if (show) count++;
    });
    /* Announce result count to screen readers via aria-live region */
    var grid = wrap ? wrap.querySelector(".travel-grid") : null;
    if (grid) {
      grid.setAttribute(
        "aria-label",
        count + " destination" + (count !== 1 ? "s" : "") + " shown",
      );
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
      filterCards(this.getAttribute("data-filter"));
    });
  });
})();
