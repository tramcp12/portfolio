/* ── 2. Travel filter tabs ────────────────────────────────── */
(function () {
  try {
  var wrap = document.getElementById("cp12-wrap");
  var tabs = wrap ? Array.from(wrap.querySelectorAll(".filter-tabs .tab")) : [];
  var cards = wrap ? Array.from(wrap.querySelectorAll(".travel-card")) : [];
  var grid = wrap ? wrap.querySelector(".travel-grid") : null;
  var status = document.getElementById("travel-filter-status");
  /* IMPORTANT-3: duration must match CSS opacity transition on .travel-card */
  var FILTER_FADE_MS = 220;

  /* CRIT-3: Initialise tabpanel aria-labelledby to the default active tab */
  if (grid) grid.setAttribute("aria-labelledby", "tab-all");

  function filterCards(f, activeTabId) {
    var count = 0;
    cards.forEach(function (c) {
      var cat = c.getAttribute("data-category");
      var show = f === "all" || cat === f;
      if (show) {
        count++;
        /* IMPORTANT-3: show first, then fade in via rAF (allows CSS transition) */
        c.style.display = "";
        requestAnimationFrame(function () {
          c.classList.remove("is-filtered");
        });
      } else {
        /* IMPORTANT-3: fade out, then hide after transition completes */
        c.classList.add("is-filtered");
        (function (card) {
          setTimeout(function () {
            if (card.classList.contains("is-filtered")) {
              card.style.display = "none";
            }
          }, FILTER_FADE_MS);
        }(c));
      }
    });
    /* CRIT-3: Keep tabpanel label in sync with the active tab */
    if (grid && activeTabId) {
      grid.setAttribute("aria-labelledby", activeTabId);
    }
    /* CRIT-3: Announce result count via dedicated status element (not tabpanel) */
    if (status) {
      var isVi = window.cp12Lang === "vi";
      status.textContent = isVi
        ? count + " điểm đến được hiển thị"
        : count + " destination" + (count !== 1 ? "s" : "") + " shown";
    }
  }

  function activateTab(tab) {
    tabs.forEach(function (t) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
      t.setAttribute("tabindex", "-1");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    tab.setAttribute("tabindex", "0");
    filterCards(tab.getAttribute("data-filter"), tab.id);
  }

  tabs.forEach(function (tab, tabIndex) {
    tab.addEventListener("click", function () {
      activateTab(tab);
    });

    /* REC-1: Arrow key navigation for filter tabs (ARIA tabs pattern) */
    tab.addEventListener("keydown", function (e) {
      var idx = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        idx = (tabIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        idx = (tabIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        idx = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        idx = tabs.length - 1;
      }
      if (idx >= 0) {
        tabs[idx].focus();
        activateTab(tabs[idx]);
      }
    });
  });
  } catch (e) { console.warn("[CP12] explore init error:", e); }
})();
