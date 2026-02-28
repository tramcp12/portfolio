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

    /* Update lang toggle button state — sync both nav and mobile overlay buttons */
    var langBtns = [
      document.getElementById("cp12-lang-btn"),
      document.getElementById("cp12-lang-btn-mobile")
    ];
    var isEn = lang === "en";
    var langLabel = strings["nav.lang.label"] || (isEn ? "Switch to Vietnamese" : "Switch to English");
    langBtns.forEach(function(btn) {
      if (!btn) return;
      btn.setAttribute("aria-pressed", isEn ? "true" : "false");
      btn.setAttribute("aria-label", langLabel);
      var viEl = btn.querySelector(".lang-vi");
      var enEl = btn.querySelector(".lang-en");
      if (lang === "vi") {
        if (viEl) viEl.classList.add("lang-active");
        if (enEl) enEl.classList.remove("lang-active");
      } else {
        if (viEl) viEl.classList.remove("lang-active");
        if (enEl) enEl.classList.add("lang-active");
      }
    });

    /* Re-render room cards with the new language */
    if (window.cp12RenderRooms) window.cp12RenderRooms(lang);

    /* Refresh room detail modal if open (IIFE 2 exposes this) */
    if (window.cp12RefreshModalLang) window.cp12RefreshModalLang(lang);

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

  /* ── Shared HTML escape utility — exposed for IIFEs 1 & 2 ── */
  window.cp12Esc = function (str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  /* ── Wire lang toggle button clicks — nav + mobile overlay ── */
  var allLangBtns = [
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


/* ── 1. Rooms renderer ───────────────────────────────────── */
(function () {
  var dataEl = document.getElementById("rooms-data");
  if (!dataEl) return;
  var rooms;
  try {
    rooms = JSON.parse(dataEl.textContent);
  } catch (e) {
    console.warn("[CP12] Rooms data parse error:", e);
    return;
  }
  var grid = document.getElementById("rooms-grid");
  if (!grid || !Array.isArray(rooms)) return;

  var escHtml = window.cp12Esc;

  /* Read i18n strings from injected data element — cached per language for the page lifetime */
  var roomStringsCache = {};
  function getRoomStrings(lang) {
    if (roomStringsCache[lang]) return roomStringsCache[lang];
    var el = document.getElementById("lang-" + lang + "-data");
    if (!el) return {};
    try { roomStringsCache[lang] = JSON.parse(el.textContent); } catch (e) { roomStringsCache[lang] = {}; }
    return roomStringsCache[lang];
  }

  function renderRooms(lang) {
    if (rooms.length === 0) {
      var emptyMsg = (lang === "vi") ? "Thông tin phòng sẽ sớm cập nhật." : "Room details coming soon.";
      grid.innerHTML = '<p class="rooms-empty">' + emptyMsg + "</p>";
      return;
    }

    var isVi = lang === "vi";
    var bookLinkText = isVi ? "Đặt phòng này" : "Book this room";
    var featuredText = isVi ? "Nổi Bật" : "Featured";
    var priceLabelText = isVi ? "VND / đêm" : "VND / night";
    var roomStrings = getRoomStrings(lang);
    var viewPhotosPrefix = roomStrings["rooms.viewPhotos"] || (isVi ? "Xem ảnh phòng" : "View photos for");

    var html = rooms.map(function (r) {
      /* CRIT-1: use name_vi when language is Vietnamese */
      var name = (isVi && r.name_vi) ? r.name_vi : r.name;

      var featuredBadge = r.featured
        ? '<span class="featured-badge"><span class="sr-only">Featured room: </span><span aria-hidden="true">⭐</span> ' + featuredText + "</span>"
        : "";

      var amenities = (isVi && r.amenities_vi) ? r.amenities_vi : (r.amenities || []);
      var pills = amenities.map(function (a) {
        return '<span class="pill">' + escHtml(a) + "</span>";
      }).join("\n                  ");

      var metaList = (isVi && r.meta_vi) ? r.meta_vi : (r.meta || []);
      var metaItems = metaList.map(function (m) {
        return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
      }).join("\n                  ");

      var desc = (isVi && r.desc_vi) ? r.desc_vi : r.desc;

      /* Phase 10 update: Native lazy loading instead of intersection observer data-bg */
      var hasCover    = !!r.coverPhoto;
      var bgClassAttr = hasCover ? "" : (r.bgClass ? (" " + escHtml(r.bgClass)) : "");
      var imgOrPattern = hasCover ? '<img class="room-img-bg-asset" src="' + escHtml(r.coverPhoto) + '" alt="' + escHtml(name) + '" loading="lazy" />' : '<div class="room-img-pattern"></div>';

      return (
        '<div class="room-card">' +
        '<div class="room-img">' +
        '<div class="room-img-bg' + bgClassAttr + '">' + imgOrPattern + '</div>' +
        '<div class="room-price-tag"><span class="price-vnd">' + escHtml(r.price) + '</span><span class="price-label">' + priceLabelText + "</span></div>" +
        featuredBadge +
        "</div>" +
        '<div class="room-body">' +
        '<h3 class="room-name">' + escHtml(name) + "</h3>" +
        '<div class="room-meta">' + metaItems + "</div>" +
        '<p class="room-desc">' + escHtml(desc) + "</p>" +
        '<div class="amenity-pills">' + pills + "</div>" +
        '<a href="#book" class="room-link">' + bookLinkText + "</a>" +
        "</div>" +
        "</div>"
      );
    }).join("\n");

    grid.innerHTML = html;

    /* Phase 10: Notify IIFE 6 (lazy-loader.js) of newly rendered [data-bg] elements.
     * cp12ObserveLazy is defined by the time language switches trigger re-render. */
    if (window.cp12ObserveLazy) window.cp12ObserveLazy(grid);

    /* Attach gallery click handlers after each innerHTML write (handlers are destroyed on re-render) */
    var cards = grid.querySelectorAll(".room-card");
    for (var ri = 0; ri < cards.length; ri++) {
      (function (roomIndex) {
        var cardLang = window.cp12Lang || "vi";
        var r = rooms[roomIndex];
        var roomName = r ? ((cardLang === "vi" && r.name_vi) ? r.name_vi : r.name) : "room";

        cards[roomIndex].addEventListener("click", function (e) {
          /* Don't intercept clicks on the "Book this room" anchor */
          if (e.target.closest("a")) return;
          if (window.cp12OpenRoomModal) {
            window.cp12OpenRoomModal(roomIndex, window.cp12Lang || "vi");
          } else {
            console.warn("[CP12] room modal not ready");
          }
        });
        /* Keyboard activation: Enter/Space on the card itself */
        cards[roomIndex].setAttribute("tabindex", "0");
        cards[roomIndex].setAttribute("role", "button");
        cards[roomIndex].setAttribute("aria-label", viewPhotosPrefix + " " + roomName);
        cards[roomIndex].addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (window.cp12OpenRoomModal) {
              window.cp12OpenRoomModal(roomIndex, window.cp12Lang || "vi");
            }
          }
        });
      }(ri));
    }
  }

  /* Expose for lang-switcher (IIFE 0) to call on language change */
  window.cp12RenderRooms = renderRooms;

  /* Initial render using language set by IIFE 0 (lang-switcher runs first) */
  renderRooms(window.cp12Lang || "vi");
})();


/* ── 2. Room detail modal ────────────────────────────────────── */
(function () {
  var modal = document.getElementById("cp12-room-modal");
  if (!modal) return;

  var modalInner  = modal.querySelector(".room-modal-inner");
  var mainImg     = modal.querySelector(".room-modal-main-img");
  var caption     = modal.querySelector(".room-modal-caption");
  var counter     = modal.querySelector(".room-modal-counter");
  var thumbsCont  = modal.querySelector(".room-modal-thumbs");
  var prevBtn     = modal.querySelector(".room-modal-prev");
  var nextBtn     = modal.querySelector(".room-modal-next");
  var closeBtn    = modal.querySelector(".room-modal-close");
  var bookBtn     = modal.querySelector(".room-modal-book-btn");
  var modalName   = modal.querySelector(".room-modal-name");
  var modalPrice  = modal.querySelector(".room-modal-price");
  var modalDesc   = modal.querySelector(".room-modal-desc");
  var modalAmen   = modal.querySelector(".room-modal-amenities");
  var modalMeta   = modal.querySelector(".room-modal-meta");

  var rooms = [];
  try {
    var dataEl = document.getElementById("rooms-data");
    if (dataEl) rooms = JSON.parse(dataEl.textContent);
  } catch (e) {}

  var currentRoomIndex  = -1;
  var currentPhotoIndex = 0;
  var currentPhotos     = [];
  var currentLang       = "vi";
  var selectedCardEl    = null;
  var lastFocus         = null;
  var savedScrollY      = 0;
  var isOpen            = false;

  /* Cache parsed i18n strings per language to avoid repeated JSON.parse */
  var stringsCache = {};
  function loadStrings(lang) {
    if (stringsCache[lang]) return stringsCache[lang];
    var el = document.getElementById("lang-" + lang + "-data");
    if (!el) return {};
    try { stringsCache[lang] = JSON.parse(el.textContent); }
    catch (e) { stringsCache[lang] = {}; }
    return stringsCache[lang];
  }
  function getString(key) {
    return loadStrings(currentLang || "vi")[key] || key;
  }
  function formatPhotoCount(n, total) {
    return getString("panel.photoCount").replace("{n}", n).replace("{total}", total);
  }

  var escHtml = window.cp12Esc;

  /* CRIT-3: set aria-hidden via JS init — display:none alone is sufficient for AT
   * but we also need aria-hidden so removeAttribute("aria-hidden") signals open state */
  modal.setAttribute("aria-hidden", "true");

  /* ── Photo display ── */
  function showPhoto(idx) {
    if (!currentPhotos.length) return;
    if (idx < 0) idx = currentPhotos.length - 1;
    if (idx >= currentPhotos.length) idx = 0;
    currentPhotoIndex = idx;

    var photo    = currentPhotos[idx];
    var altLabel = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || "");

    /* Set via DOM API — no innerHTML url() injection */
    mainImg.style.backgroundImage = "url(" + JSON.stringify(photo.src) + ")";
    mainImg.setAttribute("aria-label", altLabel);
    if (caption) caption.textContent = altLabel;
    if (counter) counter.textContent = formatPhotoCount(idx + 1, currentPhotos.length);

    var thumbs = thumbsCont ? thumbsCont.querySelectorAll(".room-modal-thumb") : [];
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle("active", i === idx);
      thumbs[i].setAttribute("aria-pressed", i === idx ? "true" : "false");
    }
  }

  function buildThumbs() {
    if (!thumbsCont) return;
    thumbsCont.innerHTML = "";
    currentPhotos.forEach(function (photo, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-modal-thumb" + (idx === currentPhotoIndex ? " active" : "");
      /* IMPORTANT-9 pattern: aria-label on thumbs, not title */
      var label = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || ("Photo " + (idx + 1)));
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", idx === currentPhotoIndex ? "true" : "false");
      btn.style.backgroundImage = "url(" + JSON.stringify(photo.src) + ")";
      (function (i) {
        btn.addEventListener("click", function () { showPhoto(i); });
      }(idx));
      thumbsCont.appendChild(btn);
    });
  }

  /* ── Populate modal for a given room + language ── */
  function populateModal(roomIndex, lang) {
    var r = rooms[roomIndex];
    if (!r) return;
    currentLang = lang || "vi";

    var isVi     = currentLang === "vi";
    var name     = (isVi && r.name_vi)     ? r.name_vi     : r.name;
    var desc     = (isVi && r.desc_vi)     ? r.desc_vi     : r.desc;
    var amenities= (isVi && r.amenities_vi)? r.amenities_vi: (r.amenities || []);
    var metaList = (isVi && r.meta_vi)     ? r.meta_vi     : (r.meta || []);
    var nightLbl = isVi ? "VND / đêm" : "VND / night";

    if (modalName)  modalName.textContent  = name;
    if (modalPrice) modalPrice.textContent = r.price + " " + nightLbl;
    if (modalDesc)  modalDesc.textContent  = desc;

    if (modalMeta) {
      modalMeta.innerHTML = metaList.map(function (m) {
        return "<span><span aria-hidden=\"true\">" + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
      }).join("");
    }
    if (modalAmen) {
      modalAmen.innerHTML = amenities.map(function (a) {
        return "<span class=\"room-modal-amenity-chip\">" + escHtml(a) + "</span>";
      }).join("");
    }

    currentPhotos = [];
    if (r.photos && r.photos.length > 0) {
      currentPhotos = r.photos;
    } else if (r.coverPhoto) {
      currentPhotos = [{ src: r.coverPhoto, alt: name, alt_vi: name }];
    }
    currentPhotoIndex = 0;
    buildThumbs();
    if (currentPhotos.length > 0) showPhoto(0);

    /* i18n labels */
    if (bookBtn)  bookBtn.textContent = getString("panel.bookBtn");
    if (closeBtn) closeBtn.setAttribute("aria-label", getString("panel.close"));
    if (prevBtn)  prevBtn.setAttribute("aria-label", getString("panel.prevPhoto"));
    if (nextBtn)  nextBtn.setAttribute("aria-label", getString("panel.nextPhoto"));

    /* Set dialog accessible name (CRIT-4 pattern — static string via JS) */
    modal.setAttribute("aria-label", getString("panel.regionLabel") + " — " + name);
  }

  /* ── Open modal ── */
  function openModal(roomIndex, lang) {
    if (isOpen && roomIndex === currentRoomIndex) return; /* same room, already open */

    /* Update selected card highlight */
    if (selectedCardEl) selectedCardEl.classList.remove("room-card--selected");
    var grid = document.getElementById("rooms-grid");
    if (grid) {
      var cards = grid.querySelectorAll(".room-card");
      if (cards[roomIndex]) {
        selectedCardEl = cards[roomIndex];
        selectedCardEl.classList.add("room-card--selected");
      }
    }
    currentRoomIndex = roomIndex;
    currentLang = lang || "vi";

    if (isOpen) {
      /* Cross-room swap: fade content, repopulate, fade back */
      modalInner.classList.add("room-modal-switching");
      setTimeout(function () {
        populateModal(roomIndex, lang);
        modalInner.classList.remove("room-modal-switching");
      }, 200);
      return;
    }

    /* First open */
    lastFocus    = document.activeElement;
    savedScrollY = window.pageYOffset || window.scrollY;

    populateModal(roomIndex, lang);
    modal.removeAttribute("aria-hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    isOpen = true;

    requestAnimationFrame(function () {
      modal.classList.add("open");
    });

    setTimeout(function () {
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  /* ── Close modal ── */
  function closeModal() {
    if (!isOpen) return;
    isOpen = false;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (selectedCardEl) {
      selectedCardEl.classList.remove("room-card--selected");
      selectedCardEl = null;
    }

    /* IMPORTANT-2: capture and clear lastFocus before async timeout to
     * prevent race condition where scrollTo triggers layout shift and
     * moves focus before restoration completes */
    var focusTarget = lastFocus;
    lastFocus = null;

    setTimeout(function () {
      modal.style.display = "none";
      /* Restore scroll position after display:none to avoid layout shift */
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      /* Focus restored after scroll to prevent scroll-to clobbering focus */
      if (focusTarget && focusTarget.focus) focusTarget.focus();
    }, 320);
  }

  /* ── Refresh language (called by lang-switcher IIFE 0) ── */
  function refreshModalLang(lang) {
    currentLang = lang;
    if (isOpen && currentRoomIndex >= 0) {
      populateModal(currentRoomIndex, lang);
    }
  }

  /* ── Focus trap (WCAG 2.1 AA SC 2.4.3) ── */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !isOpen) return;
    var focusable = modal.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ── Keyboard: Escape closes modal, Arrows navigate photos ── */
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft" && prevBtn) {
      showPhoto(currentPhotoIndex - 1);
      prevBtn.classList.add("btn-active");
      setTimeout(function() { prevBtn.classList.remove("btn-active"); }, 150);
    }
    if (e.key === "ArrowRight" && nextBtn) {
      showPhoto(currentPhotoIndex + 1);
      nextBtn.classList.add("btn-active");
      setTimeout(function() { nextBtn.classList.remove("btn-active"); }, 150);
    }
  });

  /* ── Backdrop click: close if click lands on overlay (not inner) ── */
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  /* ── Photo nav ── */
  if (prevBtn)  prevBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex - 1); });
  if (nextBtn)  nextBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex + 1); });
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  /* ── Expose globals ── */
  window.cp12OpenRoomModal    = openModal;
  window.cp12CloseRoomModal   = closeModal;
  window.cp12RefreshModalLang = refreshModalLang;
})();


/* ── 1. Hero / Video ──────────────────────────────────────── */
(function () {
  try {
    var heroPlay = document.getElementById("heroPlayBtn");
    var videoFrame = document.getElementById("videoFrame");

    if (heroPlay) {
      heroPlay.addEventListener("click", function () {
        if (window.cp12OpenModal) window.cp12OpenModal(heroPlay);
      });
    }

    if (videoFrame) {
      videoFrame.addEventListener("click", function () {
        if (window.cp12OpenModal) window.cp12OpenModal(videoFrame);
      });
      videoFrame.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (window.cp12OpenModal) window.cp12OpenModal(videoFrame);
        }
      });
    }
  } catch (e) { console.warn("[CP12] video init error:", e); }
})();


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


/* ── 3. Modal · Mobile nav · IO reveal · Scroll · Dots · Anchors ── */
(function () {
  try {
    var wrap = document.getElementById("cp12-wrap");
    /* CRIT-2: Cache reduced-motion preference once — used for all scrollTo calls */
    var prefersReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var modal = document.getElementById("cp12Modal");
    var modalClose = document.getElementById("cp12ModalClose");
    var lastFocus = null;

    /* aria-hidden on modal is set by JS, not static HTML (avoids hidden-focusable validator false positive) */
    if (modal) modal.setAttribute("aria-hidden", "true");

    /* ── Modal ── */
    function openModal(trigger) {
      if (!modal) return;
      lastFocus = trigger || document.body;
      modal.style.display = "flex";
      requestAnimationFrame(function () {
        modal.classList.add("open");
      });
      modal.removeAttribute("aria-hidden");
      if (modalClose) modalClose.focus();
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      setTimeout(function () {
        modal.style.display = "";
      }, 300);
      if (lastFocus) lastFocus.focus();
    }

    window.cp12OpenModal = openModal; // called by heroPlayBtn and videoFrame click handlers

    if (modalClose) modalClose.addEventListener("click", closeModal);
    /* Backdrop click — close if click lands on the overlay, not modal-inner */
    if (modal) modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && modal.classList.contains("open"))
        closeModal();
    });

    /* ── Modal focus trap (WCAG 2.1 AA — SC 2.4.3) ── */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !modal || !modal.classList.contains("open"))
        return;
      var focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    /* ── Mobile nav ── */
    var hamburger = wrap ? wrap.querySelector(".nav-hamburger") : null;
    var mobileNav = document.getElementById("cp12MobileNav");
    /* CRIT-4: Set aria-hidden on mobile nav at init — mirrors modal pattern (line 10) */
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "true");
    var mobileClose = mobileNav
      ? mobileNav.querySelector(".nav-mobile-close")
      : null;
    var mobileLinks = mobileNav ? mobileNav.querySelectorAll("a") : [];
    var mobileNavLastFocus = null;

    if (hamburger && mobileNav) {
      hamburger.addEventListener("click", function () {
        mobileNavLastFocus = document.activeElement;
        mobileNav.classList.add("open");
        hamburger.setAttribute("aria-expanded", "true");
        mobileNav.removeAttribute("aria-hidden");
        if (mobileClose) mobileClose.focus();
      });

      function closeMob() {
        mobileNav.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
        if (mobileNavLastFocus && mobileNavLastFocus.focus) {
          mobileNavLastFocus.focus();
        } else {
          hamburger.focus();
        }
      }

      if (mobileClose) mobileClose.addEventListener("click", closeMob);
      mobileLinks.forEach(function (l) {
        l.addEventListener("click", closeMob);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && mobileNav.classList.contains("open"))
          closeMob();
      });

      /* ── Mobile nav focus trap (WCAG 2.1 AA — SC 2.4.3) ── */
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Tab" || !mobileNav.classList.contains("open"))
          return;
        var focusable = mobileNav.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    /* ── IntersectionObserver reveal (.cp12-reveal elements) ── */
    var revealEls = document.querySelectorAll(".cp12-reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("visible");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.15 },
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("visible");
      });
    }

    /* ── Per-section animation signatures ── */
    var sections = Array.from(
      document.querySelectorAll(
        "#home,#video,#rooms,#explore,#about,#journal,#book",
      ),
    );
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (
              en.isIntersecting &&
              !en.target.classList.contains("animated")
            ) {
              en.target.classList.add("animated");
              sio.unobserve(en.target);
            }
          });
        },
        { threshold: 0, rootMargin: "-10% 0px" },
      );
      sections.forEach(function (s) {
        sio.observe(s);
      });
    } else {
      sections.forEach(function (s) {
        s.classList.add("animated");
      });
    }

    /* ── Section progress dots ── */
    var dotsNav = document.getElementById("cp12-dots");
    var dots = dotsNav
      ? Array.from(dotsNav.querySelectorAll(".dot"))
      : [];
    var darkSects = { home: 1, video: 1, explore: 1, book: 1 };

    var cachedNav = null;
    function getNav() {
      if (!cachedNav) {
        cachedNav = document.querySelector("#cp12-wrap .cp12-main-nav");
      }
      return cachedNav;
    }

    function updateDots() {
      var scrollY = window.pageYOffset;
      var midY = scrollY + window.innerHeight * 0.5;
      var navH = (getNav() || {}).offsetHeight || 70;
      if (dotsNav) {
        var show = scrollY > window.innerHeight * 0.4;
        dotsNav.classList.toggle("visible", show);
        dotsNav.setAttribute("aria-hidden", show ? "false" : "true");
        dots.forEach(function (d) {
          d.tabIndex = show ? 0 : -1;
        });
      }
      var current = sections[0];
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top + scrollY - navH <= midY)
          current = s;
      });
      dots.forEach(function (d) {
        d.dataset.target === current.id
          ? d.setAttribute("aria-current", "true")
          : d.removeAttribute("aria-current");
      });
      if (dotsNav) {
        dotsNav.classList.toggle("on-dark", !!darkSects[current.id]);
        dotsNav.classList.toggle("on-light", !darkSects[current.id]);
      }
      /* ── Section-aware nav colorway ── */
      var navEl = getNav();
      if (navEl) {
        navEl.classList.toggle("nav-over-dark", !!darkSects[current.id]);
      }
    }

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        var el = document.getElementById(d.dataset.target);
        if (!el) return;
        var navH = (getNav() || {}).offsetHeight || 70;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.pageYOffset - navH,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      });
    });

    /* ── Next-section button ── */
    var nextBtn = document.getElementById("cp12-next-btn");

    function updateNextBtn() {
      if (!nextBtn) return;
      var scrollY = window.pageYOffset;
      var atBottom =
        scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - window.innerHeight * 0.2;
      var show = scrollY > window.innerHeight * 0.2 && !atBottom;
      nextBtn.classList.toggle("visible", show);
      nextBtn.setAttribute("aria-hidden", show ? "false" : "true");
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var navH = (getNav() || {}).offsetHeight || 70;
        var scrollY = window.pageYOffset;
        var next = null;
        sections.forEach(function (s) {
          if (
            !next &&
            s.getBoundingClientRect().top + scrollY - navH > scrollY + 80
          )
            next = s;
        });
        if (next)
          window.scrollTo({
            top: next.getBoundingClientRect().top + scrollY - navH,
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
      });
    }

    /* PageDown / Shift+ArrowDown → next section */
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement || {}).tagName || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === "PageDown" || (e.key === "ArrowDown" && e.shiftKey)) {
        e.preventDefault();
        if (nextBtn) nextBtn.click();
      }
    });

    /* ── Nav transparency + scroll state updates ── */
    var nav = getNav();
    function updateNav() {
      nav = nav || getNav();
      if (!nav) return;
      var y = window.pageYOffset;
      nav.classList.toggle("scrolled", y > 60);
      nav.style.boxShadow = y > 80 ? "0 2px 20px rgba(0,0,0,.08)" : "";
      /* When returning to the top (not scrolled), we are definitively on
         the hero section which is always dark — force nav-over-dark on so
         the dark-pine gradient colorway is immediately correct.           */
      if (y <= 60) {
        nav.classList.add("nav-over-dark");
      }
    }

    var rafPending = false;
    window.addEventListener(
      "scroll",
      function () {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
          updateNav();
          updateDots();
          updateNextBtn();
          rafPending = false;
        });
      },
      { passive: true },
    );

    updateNav();
    updateDots();
    updateNextBtn();

    /* ── Smooth anchor scroll ── */
    var anchors = document.querySelectorAll('#cp12-wrap a[href^="#"]');
    anchors.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = this.getAttribute("href").slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          /* Close room detail modal if open before scrolling (IIFE 2) */
          if (window.cp12CloseRoomModal) window.cp12CloseRoomModal();
          var navH = (getNav() || {}).offsetHeight || 0;
          var targetTop =
            target.getBoundingClientRect().top +
            window.pageYOffset -
            navH;
          window.scrollTo({ top: targetTop, behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
      });
    });
  } catch (e) {
    console.warn("[CP12] Initialization error:", e);
  }
})();


/* ── 6. Image Lazy Loader ─────────────────────────────────────
 * src/shared/lazy-loader.js  (IIFE 6 — must run last)
 *
 * Watches all [data-bg] elements via IntersectionObserver.
 * On viewport entry (300px ahead): preloads image off-DOM,
 * then applies via style.backgroundImage using JSON.stringify
 * for safe URL escaping (matches data-cover pattern, Phase 8).
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
