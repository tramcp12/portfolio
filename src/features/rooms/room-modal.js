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

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

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
    stringsCache = {}; /* invalidate cache on lang change */

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

  /* ── Keyboard: Escape closes modal ── */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeModal();
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
