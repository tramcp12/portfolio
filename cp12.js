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

    /* Refresh room detail panel if open (IIFE 2 exposes this) */
    if (window.cp12RefreshPanelLang) window.cp12RefreshPanelLang(lang);

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

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

      /* Phase 8: coverPhoto via data-cover attribute (set via DOM API after innerHTML to avoid
       * the HTML-entity-decode → CSS-parser attack chain in url('..') context).
       * bgClass gradient is the fallback when no coverPhoto is present. */
      var hasCover    = !!r.coverPhoto;
      var bgClassAttr = (!hasCover && r.bgClass) ? (" " + escHtml(r.bgClass)) : "";
      var dataCover   = hasCover ? ' data-cover="' + escHtml(r.coverPhoto) + '"' : "";
      var patternEl   = hasCover ? "" : '<div class="room-img-pattern"></div>';

      return (
        '<div class="room-card">' +
        '<div class="room-img">' +
        '<div class="room-img-bg' + bgClassAttr + '"' + dataCover + '>' + patternEl + '</div>' +
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

    /* Phase 8: Apply coverPhoto backgrounds via DOM API (immune to HTML-entity-decode
     * attack chain; matches thumb pattern already used in room-gallery.js) */
    var bgDivs = grid.querySelectorAll(".room-img-bg[data-cover]");
    for (var bi = 0; bi < bgDivs.length; bi++) {
      bgDivs[bi].style.backgroundImage = "url(" + JSON.stringify(bgDivs[bi].dataset.cover) + ")";
      bgDivs[bi].removeAttribute("data-cover");
    }

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
          if (window.cp12OpenRoomPanel) {
            window.cp12OpenRoomPanel(roomIndex, window.cp12Lang || "vi");
          } else {
            console.warn("[CP12] cp12OpenRoomPanel not available");
          }
        });
        /* Keyboard activation: Enter/Space on the card itself */
        cards[roomIndex].setAttribute("tabindex", "0");
        cards[roomIndex].setAttribute("role", "button");
        cards[roomIndex].setAttribute("aria-label", "View photos for " + roomName);
        cards[roomIndex].addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (window.cp12OpenRoomPanel) {
              window.cp12OpenRoomPanel(roomIndex, window.cp12Lang || "vi");
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


/* ── 2. Room detail expansion panel ─────────────────────────── */
(function () {
  var panel = document.getElementById("cp12-room-panel");
  if (!panel) return;

  var panelInner   = panel.querySelector(".panel-inner");
  var mainImg      = panel.querySelector(".panel-main-img");
  var mainCaption  = panel.querySelector(".panel-main-caption");
  var counter      = panel.querySelector(".panel-photo-counter");
  var thumbsCont   = panel.querySelector(".panel-thumbs");
  var prevBtn      = panel.querySelector(".panel-prev");
  var nextBtn      = panel.querySelector(".panel-next");
  var closeBtn     = panel.querySelector(".panel-close");
  var bookBtn      = panel.querySelector(".panel-book-btn");
  var panelName    = panel.querySelector(".panel-room-name");
  var panelPrice   = panel.querySelector(".panel-room-price");
  var panelDesc    = panel.querySelector(".panel-room-desc");
  var panelAmen    = panel.querySelector(".panel-amenities");
  var panelMeta    = panel.querySelector(".panel-room-meta");

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
  var panelLastFocus    = null;
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
    var s = loadStrings(currentLang || "vi");
    return s[key] || key;
  }
  function formatPhotoCount(n, total) {
    return getString("panel.photoCount").replace("{n}", n).replace("{total}", total);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* CRIT-3: set aria-hidden via JS init, not static HTML */
  panel.setAttribute("aria-hidden", "true");
  /* IMPORTANT-1: inert blocks tab order when closed */
  panel.inert = true;

  /* ── Photo display ── */
  function showPhoto(idx) {
    if (!currentPhotos.length) return;
    if (idx < 0) idx = currentPhotos.length - 1;
    if (idx >= currentPhotos.length) idx = 0;
    currentPhotoIndex = idx;

    var photo   = currentPhotos[idx];
    var caption = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || "");

    /* Set via DOM API — no innerHTML url() injection risk */
    mainImg.style.backgroundImage = "url(" + JSON.stringify(photo.src) + ")";
    if (mainImg) mainImg.setAttribute("aria-label", caption);
    if (mainCaption) mainCaption.textContent = caption;
    if (counter) counter.textContent = formatPhotoCount(idx + 1, currentPhotos.length);

    /* Update thumbnail active states */
    var thumbs = thumbsCont ? thumbsCont.querySelectorAll(".panel-thumb") : [];
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
      btn.className = "panel-thumb" + (idx === currentPhotoIndex ? " active" : "");
      /* IMPORTANT-9: aria-label on thumbs — title attribute is unreliable for SRs */
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

  /* ── Populate panel content for a given room + language ── */
  function populatePanel(roomIndex, lang) {
    var r = rooms[roomIndex];
    if (!r) return;
    currentLang = lang || "vi";
    /* Invalidate string cache entry on language change (build.js may update strings) */
    stringsCache = {};

    var isVi     = currentLang === "vi";
    var name     = (isVi && r.name_vi)     ? r.name_vi     : r.name;
    var desc     = (isVi && r.desc_vi)     ? r.desc_vi     : r.desc;
    var amenities= (isVi && r.amenities_vi)? r.amenities_vi: (r.amenities || []);
    var metaList = (isVi && r.meta_vi)     ? r.meta_vi     : (r.meta || []);
    var nightLbl = isVi ? "VND / đêm" : "VND / night";

    if (panelName)  panelName.textContent  = name;
    if (panelPrice) panelPrice.textContent = r.price + " " + nightLbl;
    if (panelDesc)  panelDesc.textContent  = desc;

    if (panelMeta) {
      panelMeta.innerHTML = metaList.map(function (m) {
        return "<span><span aria-hidden=\"true\">" + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
      }).join("");
    }
    if (panelAmen) {
      panelAmen.innerHTML = amenities.map(function (a) {
        return "<span class=\"panel-amenity-chip\">" + escHtml(a) + "</span>";
      }).join("");
    }

    /* Photos: real photos array, or fall back to coverPhoto as single entry */
    currentPhotos = [];
    if (r.photos && r.photos.length > 0) {
      currentPhotos = r.photos;
    } else if (r.coverPhoto) {
      currentPhotos = [{ src: r.coverPhoto, alt: name, alt_vi: name }];
    }
    currentPhotoIndex = 0;
    buildThumbs();
    if (currentPhotos.length > 0) showPhoto(0);

    /* i18n button labels */
    if (bookBtn)  bookBtn.textContent = getString("panel.bookBtn");
    if (closeBtn) closeBtn.setAttribute("aria-label", getString("panel.close"));
    if (prevBtn)  prevBtn.setAttribute("aria-label", getString("panel.prevPhoto"));
    if (nextBtn)  nextBtn.setAttribute("aria-label", getString("panel.nextPhoto"));

    /* CRIT-4: set region aria-label as static string + room name (no aria-labelledby) */
    panel.setAttribute("aria-label", getString("panel.regionLabel") + " — " + name);
  }

  /* ── Scroll to panel after transition ends ── */
  function scrollToPanel() {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Open panel ── */
  function openPanel(roomIndex, lang) {
    panelLastFocus = document.activeElement;
    var isSameRoom = (roomIndex === currentRoomIndex && isOpen);

    /* Highlight selected card */
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

    if (isSameRoom) {
      /* Already open on same room — just scroll */
      scrollToPanel();
      return;
    }

    if (isOpen) {
      /* IMPORTANT-3: cross-room fade — opacity-out, repopulate, opacity-in */
      panelInner.classList.add("panel-switching");
      setTimeout(function () {
        populatePanel(roomIndex, lang);
        panelInner.classList.remove("panel-switching");
      }, 200);
    } else {
      /* First open */
      populatePanel(roomIndex, lang);
      panel.removeAttribute("aria-hidden");
      panel.inert = false;
      isOpen = true;

      /* Use rAF to ensure closed state is painted before adding .open */
      requestAnimationFrame(function () {
        panel.classList.add("open");

        /* IMPORTANT-2: wait for max-height transition before scrollIntoView */
        var scrolled = false;
        function onTransitionEnd(e) {
          if (e.propertyName !== "max-height") return;
          if (scrolled) return;
          scrolled = true;
          panel.removeEventListener("transitionend", onTransitionEnd);
          scrollToPanel();
        }
        panel.addEventListener("transitionend", onTransitionEnd);

        /* Fallback for prefers-reduced-motion (no transition → transitionend never fires) */
        setTimeout(function () {
          if (!scrolled) {
            scrolled = true;
            panel.removeEventListener("transitionend", onTransitionEnd);
            scrollToPanel();
          }
        }, 650);

        /* Move focus into panel after it opens */
        setTimeout(function () {
          if (closeBtn) closeBtn.focus();
        }, 100);
      });
    }
  }

  /* ── Close panel ── */
  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;

    if (selectedCardEl) {
      selectedCardEl.classList.remove("room-card--selected");
      selectedCardEl = null;
    }

    /* Restore focus to the element that triggered the panel */
    if (panelLastFocus && panelLastFocus.focus) {
      panelLastFocus.focus();
    }
  }

  /* ── Refresh language (called by lang-switcher IIFE 0) ── */
  function refreshPanelLang(lang) {
    currentLang = lang;
    if (isOpen && currentRoomIndex >= 0) {
      populatePanel(currentRoomIndex, lang);
    }
  }

  /* ── Event listeners ── */
  if (prevBtn)  prevBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex - 1); });
  if (nextBtn)  nextBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex + 1); });
  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  /* ── Expose globals ── */
  window.cp12OpenRoomPanel   = openPanel;
  window.cp12CloseRoomPanel  = closePanel;
  window.cp12RefreshPanelLang = refreshPanelLang;
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
      var isVi = window.cp12Lang === "vi";
      status.textContent = isVi
        ? count + " điểm đến được hiển thị"
        : count + " destination" + (count !== 1 ? "s" : "") + " shown";
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

    if (hamburger && mobileNav) {
      hamburger.addEventListener("click", function () {
        mobileNav.classList.add("open");
        hamburger.setAttribute("aria-expanded", "true");
        mobileNav.removeAttribute("aria-hidden");
        if (mobileClose) mobileClose.focus();
      });

      function closeMob() {
        mobileNav.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
        hamburger.focus();
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
        { threshold: 0.18 },
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
          /* Close room detail panel if open before scrolling (IIFE 2) */
          if (window.cp12CloseRoomPanel) window.cp12CloseRoomPanel();
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
