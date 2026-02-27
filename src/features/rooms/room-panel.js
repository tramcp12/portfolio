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
