/* ── 2. Room detail modal ────────────────────────────────────── */
(function () {
  const modal = document.getElementById("cp12-room-modal");
  if (!modal) return;

  const modalInner  = modal.querySelector(".room-modal-inner");
  const mainImg     = modal.querySelector(".room-modal-main-img");
  const caption     = modal.querySelector(".room-modal-caption");
  const counter     = modal.querySelector(".room-modal-counter");
  const thumbsCont  = modal.querySelector(".room-modal-thumbs");
  const prevBtn     = modal.querySelector(".room-modal-prev");
  const nextBtn     = modal.querySelector(".room-modal-next");
  const closeBtn    = modal.querySelector(".room-modal-close");
  const bookBtn     = modal.querySelector(".room-modal-book-btn");
  const modalName   = modal.querySelector(".room-modal-name");
  const modalPrice  = modal.querySelector(".room-modal-price");
  const modalDesc   = modal.querySelector(".room-modal-desc");
  const modalAmen   = modal.querySelector(".room-modal-amenities");
  const modalMeta   = modal.querySelector(".room-modal-meta");

  let rooms = [];
  try {
    const dataEl = document.getElementById("rooms-data");
    if (dataEl) rooms = JSON.parse(dataEl.textContent);
  } catch (e) { console.warn("[CP12] room-modal: rooms data parse error:", e); }

  let currentRoomIndex  = -1;
  let currentPhotoIndex = 0;
  let currentPhotos     = [];
  let currentLang       = "vi";
  let lastFocus         = null;
  let savedScrollY      = 0;
  let isOpen            = false;

  const modalSwitchMs = window.cp12CssDuration("--dur-3", 380);
  const modalFocusMs = window.cp12CssDuration("--dur-instant", 50);
  const modalCloseMs = window.cp12CssDuration("--dur-320", 320);
  const modalButtonFeedbackMs = window.cp12CssDuration("--dur-150", 150);

  function getString(key) {
    return window.cp12GetStrings(currentLang || "vi")[key] || key;
  }
  function formatPhotoCount(n, total) {
    return getString("panel.photoCount").replace("{n}", n).replace("{total}", total);
  }

  const escHtml = window.cp12Esc;

  /* CRIT-3: set aria-hidden via JS init — display:none alone is sufficient for AT
   * but we also need aria-hidden so removeAttribute("aria-hidden") signals open state */
  modal.setAttribute("aria-hidden", "true");

  /* ── Photo display ── */
  function showPhoto(idx) {
    if (!currentPhotos.length) return;
    if (idx < 0) idx = currentPhotos.length - 1;
    if (idx >= currentPhotos.length) idx = 0;
    currentPhotoIndex = idx;

    const photo    = currentPhotos[idx];
    const altLabel = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || "");

    /* Set via DOM API — no innerHTML url() injection */
    mainImg.style.backgroundImage = "url(" + JSON.stringify(photo.src) + ")";
    mainImg.setAttribute("aria-label", altLabel);
    if (caption) caption.textContent = altLabel;
    if (counter) counter.textContent = formatPhotoCount(idx + 1, currentPhotos.length);

    const thumbs = thumbsCont ? thumbsCont.querySelectorAll(".room-modal-thumb") : [];
    for (let i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle("active", i === idx);
      thumbs[i].setAttribute("aria-pressed", i === idx ? "true" : "false");
    }
  }

  function buildThumbs() {
    if (!thumbsCont) return;
    thumbsCont.innerHTML = "";
    currentPhotos.forEach(function (photo, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-modal-thumb" + (idx === currentPhotoIndex ? " active" : "");
      /* IMPORTANT-9 pattern: aria-label on thumbs, not title */
      const label = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || ("Photo " + (idx + 1)));
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", idx === currentPhotoIndex ? "true" : "false");
      btn.style.backgroundImage = "url(" + JSON.stringify(photo.src) + ")";
      btn.addEventListener("click", function () { showPhoto(idx); });
      thumbsCont.appendChild(btn);
    });
  }

  /* ── Populate modal for a given room + language ── */
  function populateModal(roomIndex, lang) {
    const r = rooms[roomIndex];
    if (!r) return;
    currentLang = lang || "vi";

    const isVi     = currentLang === "vi";
    const name     = (isVi && r.name_vi) ? r.name_vi : r.name;
    const desc     = (isVi && r.desc_vi)     ? r.desc_vi     : r.desc;
    const amenities= (isVi && r.amenities_vi)? r.amenities_vi: (r.amenities || []);
    const metaList = (isVi && r.meta_vi)     ? r.meta_vi     : (r.meta || []);
    const nightLbl = isVi ? "VND / đêm" : "VND / night";

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

    /* i18n labels + pre-filled booking href */
    if (bookBtn) {
      bookBtn.textContent = getString("panel.bookBtn");
      const bookSubject = (isVi && r.bookSubject_vi) ? r.bookSubject_vi
                      : r.bookSubject ? r.bookSubject
                      : (isVi ? "Đặt phòng — " : "Booking — ") + name;
      bookBtn.href = "mailto:cp12tramdungchill@gmail.com?subject=" +
                     encodeURIComponent(bookSubject);
    }
    if (closeBtn) closeBtn.setAttribute("aria-label", getString("panel.close"));
    if (prevBtn)  prevBtn.setAttribute("aria-label", getString("panel.prevPhoto"));
    if (nextBtn)  nextBtn.setAttribute("aria-label", getString("panel.nextPhoto"));

    /* Set dialog accessible name (CRIT-4 pattern — static string via JS) */
    modal.setAttribute("aria-label", getString("panel.regionLabel") + " — " + name);
  }

  /* ── Open modal ── */
  function openModal(roomIndex, lang) {
    if (isOpen && roomIndex === currentRoomIndex) return; /* same room, already open */

    currentRoomIndex = roomIndex;
    currentLang = lang || "vi";

    if (isOpen) {
      /* Cross-room swap: fade content, repopulate, fade back */
      modalInner.classList.add("room-modal-switching");
      setTimeout(function () {
        populateModal(roomIndex, lang);
        modalInner.classList.remove("room-modal-switching");
      }, modalSwitchMs);
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
    }, modalFocusMs);
  }

  /* ── Close modal ── */
  function closeModal() {
    if (!isOpen) return;
    isOpen = false;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    /* IMPORTANT-2: capture and clear lastFocus before async timeout to
     * prevent race condition where scrollTo triggers layout shift and
     * moves focus before restoration completes */
    const focusTarget = lastFocus;
    lastFocus = null;

    setTimeout(function () {
      modal.style.display = "none";
      /* Restore scroll position after display:none to avoid layout shift */
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      /* Focus restored after scroll to prevent scroll-to clobbering focus */
      if (focusTarget && focusTarget.focus) focusTarget.focus();
    }, modalCloseMs);
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
    const focusable = modal.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
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
      setTimeout(function() { prevBtn.classList.remove("btn-active"); }, modalButtonFeedbackMs);
    }
    if (e.key === "ArrowRight" && nextBtn) {
      showPhoto(currentPhotoIndex + 1);
      nextBtn.classList.add("btn-active");
      setTimeout(function() { nextBtn.classList.remove("btn-active"); }, modalButtonFeedbackMs);
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
