/* ── 6. Image Lazy Loader ─────────────────────────────────────
 * src/shared/lazy-loader.js  (IIFE 6 — must run last)
 *
 * Watches all [data-bg] elements via IntersectionObserver.
 * On viewport entry (300px ahead): preloads image off-DOM,
 * then applies via style.backgroundImage using JSON.stringify
 * for safe URL escaping (matches data-cover pattern).
 *
 * P-1 safe: new Image() is never inserted into the DOM.
 * Covers: 6 travel cards + 7 room catalog covers.
 *
 * Public API (set on window for IIFE 1 rooms.js):
 *   window.cp12ObserveLazy(container?)
 *     — re-observes [data-bg] inside container (or whole doc)
 *     — called by rooms.js after each re-render
 * ──────────────────────────────────────────────────────────── */
(function () {
  var lazyObserver;

  /* Apply background-image for one element and mark it loaded */
  function loadBg(el) {
    var src = el.dataset.bg; /* dataset read — XSS safe */
    if (!src) return;

    var preload = new Image(); /* off-DOM — never inserted (P-1 safe) */
    preload.onload = function () {
      /* JSON.stringify escapes quotes/special chars in the URL */
      el.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
      el.classList.add("cp12-loaded");
      el.removeAttribute("data-bg");
    };
    preload.onerror = function () {
      /* On failure: clear shimmer so broken state isn't stuck */
      el.classList.add("cp12-loaded");
      el.removeAttribute("data-bg");
      console.warn("[CP12] Lazy image failed to load:", src);
    };
    preload.src = src;
    lazyObserver.unobserve(el);
  }

  /* Observe all [data-bg] elements within root (or document) */
  function observeAll(root) {
    var els = (root || document).querySelectorAll("[data-bg]");
    for (var i = 0; i < els.length; i++) {
      lazyObserver.observe(els[i]);
    }
  }

  try {
    lazyObserver = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) loadBg(entries[i].target);
        }
      },
      {
        rootMargin: "300px 0px", /* start loading 300px before viewport */
        threshold: 0
      }
    );

    /* Initial scan — picks up static travel cards + rendered room cards */
    observeAll(document);

    /* Expose for rooms.js (IIFE 1) to call after each re-render */
    window.cp12ObserveLazy = observeAll;

  } catch (e) {
    console.warn("[CP12] Lazy loader init error:", e);
    /* Graceful fallback: apply all deferred backgrounds immediately */
    try {
      var fallbacks = document.querySelectorAll("[data-bg]");
      for (var j = 0; j < fallbacks.length; j++) {
        var fbSrc = fallbacks[j].dataset.bg;
        if (fbSrc) {
          fallbacks[j].style.backgroundImage = "url(" + JSON.stringify(fbSrc) + ")";
          fallbacks[j].classList.add("cp12-loaded");
          fallbacks[j].removeAttribute("data-bg");
        }
      }
    } catch (fe) { /* silent — best effort */ }
  }
})();
