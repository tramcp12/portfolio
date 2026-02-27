/* ── 0. Language Switcher ─────────────────────────────────── */
(function () {
  var STORAGE_KEY = "cp12-lang";
  var DEFAULT_LANG = "vi";

  /* ── Parse string data injected by build.js ── */
  var stringsMap = {};
  try {
    var viEl = document.getElementById("lang-vi-data");
    var enEl = document.getElementById("lang-en-data");
    if (viEl) stringsMap["vi"] = JSON.parse(viEl.textContent);
    if (enEl) stringsMap["en"] = JSON.parse(enEl.textContent);
  } catch (e) {
    console.warn("[CP12] Language data parse error:", e);
  }

  /* ── Apply a language to the page ── */
  function applyLang(lang) {
    var strings = stringsMap[lang];
    if (!strings) return;

    /* data-i18n: replace textContent (no HTML child elements) */
    var textEls = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < textEls.length; i++) {
      var key = textEls[i].getAttribute("data-i18n");
      if (strings[key] !== undefined) textEls[i].textContent = strings[key];
    }

    /* data-i18n-html: replace innerHTML (headings with <br>/<em>) */
    var htmlEls = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < htmlEls.length; j++) {
      var hkey = htmlEls[j].getAttribute("data-i18n-html");
      if (strings[hkey] !== undefined) htmlEls[j].innerHTML = strings[hkey];
    }

    /* data-i18n-aria-label: translate aria-label attribute */
    var ariaEls = document.querySelectorAll("[data-i18n-aria-label]");
    for (var k = 0; k < ariaEls.length; k++) {
      var akey = ariaEls[k].getAttribute("data-i18n-aria-label");
      if (strings[akey] !== undefined) ariaEls[k].setAttribute("aria-label", strings[akey]);
    }

    /* Update <html lang="…"> */
    document.documentElement.lang = lang;

    /* Update lang toggle button state */
    var btn = document.getElementById("cp12-lang-btn");
    if (btn) {
      var isEn = lang === "en";
      btn.setAttribute("aria-pressed", isEn ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        strings["nav.lang.label"] || (isEn ? "Switch to Vietnamese" : "Switch to English"),
      );
      var activeEl = btn.querySelector(".lang-active");
      if (activeEl) activeEl.textContent = lang.toUpperCase();
      var altEl = btn.querySelector(".lang-alt");
      if (altEl) altEl.textContent = (lang === "en" ? "VI" : "EN");
    }

    /* Re-render room cards with the new language */
    if (window.cp12RenderRooms) window.cp12RenderRooms(lang);

    /* Refresh room gallery drawer if open (IIFE 2 exposes this) */
    if (window.cp12RefreshDrawerLang) window.cp12RefreshDrawerLang(lang);

    /* Persist preference */
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    /* Expose globally for other IIFEs */
    window.cp12Lang = lang;
  }

  /* ── Expose switch API (called by lang button and external code) ── */
  window.cp12SwitchLang = function (lang) {
    applyLang(lang);
  };

  /* ── Apply initial language + remove FOUC guard class ── */
  var initialLang = (function () {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) { return DEFAULT_LANG; }
  }());
  window.cp12Lang = initialLang;
  applyLang(initialLang);
  document.documentElement.classList.remove("i18n-loading");

  /* ── Wire lang toggle button click ── */
  var btn = document.getElementById("cp12-lang-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      applyLang(window.cp12Lang === "en" ? "vi" : "en");
    });
  }
})();
