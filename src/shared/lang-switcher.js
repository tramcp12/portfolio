/* ── 0. Language Switcher ─────────────────────────────────── */
(function () {
  const STORAGE_KEY = "cp12-lang";
  const DEFAULT_LANG = "vi";

  /* ── Parse string data injected by build.js ── */
  const stringsMap = {};
  try {
    const viEl = document.getElementById("lang-vi-data");
    const enEl = document.getElementById("lang-en-data");
    if (viEl) stringsMap["vi"] = JSON.parse(viEl.textContent);
    if (enEl) stringsMap["en"] = JSON.parse(enEl.textContent);
  } catch (e) {
    console.warn("[CP12] Language data parse error:", e);
  }

  /* ── Apply a language to the page ── */
  function applyLang(lang) {
    const strings = stringsMap[lang];
    if (!strings) return;

    /* data-i18n: replace textContent (no HTML child elements) */
    const textEls = document.querySelectorAll("[data-i18n]");
    for (let i = 0; i < textEls.length; i++) {
      const key = textEls[i].getAttribute("data-i18n");
      if (strings[key] !== undefined) textEls[i].textContent = strings[key];
    }

    /* data-i18n-html: replace innerHTML (headings with <br>/<em>) */
    const htmlEls = document.querySelectorAll("[data-i18n-html]");
    for (let j = 0; j < htmlEls.length; j++) {
      const hkey = htmlEls[j].getAttribute("data-i18n-html");
      if (strings[hkey] !== undefined) htmlEls[j].innerHTML = strings[hkey];
    }

    /* data-i18n-aria-label: translate aria-label attribute */
    const ariaEls = document.querySelectorAll("[data-i18n-aria-label]");
    for (let k = 0; k < ariaEls.length; k++) {
      const akey = ariaEls[k].getAttribute("data-i18n-aria-label");
      if (strings[akey] !== undefined) ariaEls[k].setAttribute("aria-label", strings[akey]);
    }

    /* Update <html lang="…"> */
    document.documentElement.lang = lang;

    /* Update lang toggle button state — sync both nav and mobile overlay buttons */
    const langBtns = [
      document.getElementById("cp12-lang-btn"),
      document.getElementById("cp12-lang-btn-mobile")
    ];
    const isEn = lang === "en";
    const langAction = strings["nav.lang.label"] || (isEn ? "Switch to Vietnamese" : "Switch to English");
    langBtns.forEach(function(btn) {
      if (!btn) return;
      btn.setAttribute("aria-pressed", isEn ? "true" : "false");
      btn.removeAttribute("aria-label");
      const actionEl = btn.querySelector(".lang-action");
      if (actionEl) actionEl.textContent = langAction;
      const langViChild = btn.querySelector(".lang-vi");
      const langEnChild = btn.querySelector(".lang-en");
      if (lang === "vi") {
        if (langViChild) langViChild.classList.add("lang-active");
        if (langEnChild) langEnChild.classList.remove("lang-active");
      } else {
        if (langViChild) langViChild.classList.remove("lang-active");
        if (langEnChild) langEnChild.classList.add("lang-active");
      }
    });

    /* Re-render room cards with the new language */
    if (window.cp12RenderRooms) window.cp12RenderRooms(lang);

    /* Refresh room detail modal if open (IIFE 2 exposes this) */
    if (window.cp12RefreshModalLang) window.cp12RefreshModalLang(lang);

    /* Re-render FAQ with the new language */
    if (window.cp12RenderFaq) window.cp12RenderFaq(lang);

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
  const initialLang = (function () {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) { return DEFAULT_LANG; }
  }());
  window.cp12Lang = initialLang;
  applyLang(initialLang);
  document.documentElement.classList.remove("i18n-loading");

  /* ── Shared HTML escape utility — exposed for IIFEs 1, 2, 7 ── */
  window.cp12Esc = function (str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  /* ── Shared i18n string accessor — exposed for IIFEs 1, 2, 7 ──
   * Single source of truth: stringsMap is parsed once at IIFE-0 init.
   * Downstream IIFEs avoid re-parsing the same JSON.
   * ──────────────────────────────────────────────────────────── */
  window.cp12GetStrings = function (lang) {
    return stringsMap[lang] || {};
  };

  /* ── Shared CSS duration token reader — exposed for IIFEs 2, 4, 5 ──
   * Reads a --dur-* CSS custom property and returns the value in ms.
   * Falls back if the token is missing or malformed.
   * ──────────────────────────────────────────────────────────── */
  window.cp12CssDuration = function (token, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const match = /^([\d.]+)(ms|s)$/.exec(value);
    if (!match) return fallback;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return fallback;
    return match[2] === "s" ? amount * 1000 : amount;
  };

  /* ── Wire lang toggle button clicks — nav + mobile overlay ── */
  const allLangBtns = [
    document.getElementById("cp12-lang-btn"),
    document.getElementById("cp12-lang-btn-mobile")
  ];
  allLangBtns.forEach(function(btn) {
    if (!btn) return;
    btn.addEventListener("click", function () {
      applyLang(window.cp12Lang === "en" ? "vi" : "en");
    });
  });
})();
