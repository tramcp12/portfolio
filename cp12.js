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


/* ── 1. Rooms renderer ───────────────────────────────────── */
(function () {
  const dataEl = document.getElementById("rooms-data");
  if (!dataEl) return;
  let rooms;
  try {
    rooms = JSON.parse(dataEl.textContent);
  } catch (e) {
    console.warn("[CP12] Rooms data parse error:", e);
    return;
  }
  const grid = document.getElementById("rooms-grid");
  if (!grid || !Array.isArray(rooms)) return;

  const escHtml = window.cp12Esc || function(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); };

  /* Read i18n strings from injected data element — cached per language for the page lifetime */
  const roomStringsCache = {};
  function getRoomStrings(lang) {
    if (roomStringsCache[lang]) return roomStringsCache[lang];
    const el = document.getElementById("lang-" + lang + "-data");
    if (!el) return {};
    try { roomStringsCache[lang] = JSON.parse(el.textContent); } catch (e) { roomStringsCache[lang] = {}; }
    return roomStringsCache[lang];
  }

  function renderRooms(lang) {
    if (rooms.length === 0) {
      const emptyMsg = (lang === "vi") ? "Thông tin phòng sẽ sớm cập nhật." : "Room details coming soon.";
      grid.innerHTML = '<p class="rooms-empty">' + emptyMsg + "</p>";
      return;
    }

    const isVi = lang === "vi";
    const bookLinkText = isVi ? "Đặt phòng này" : "Book this room";
    const roomStrings = getRoomStrings(lang);
    const featuredText = roomStrings["rooms.featuredBadge"] || (isVi ? "Nổi bật" : "Featured");
    const priceLabelText = isVi ? "VND / đêm" : "VND / night";
    const viewPhotosPrefix = roomStrings["rooms.viewPhotos"] || (isVi ? "Xem ảnh phòng" : "View photos for");
    const viewPhotosText = isVi ? "Xem ảnh" : "View photos";
    const comingSoonText = roomStrings["rooms.comingSoon"] || (isVi ? "Sắp Có" : "Coming Soon");
    const comingSoonDescText = roomStrings["rooms.comingSoonDesc"] || (isVi ? "Phòng dorm sắp khai trương." : "Dorm beds opening soon.");

    const featuredRoom = rooms.filter(function (r) {
      return r.featured && !r.comingSoon;
    })[0] || rooms.filter(function (r) {
      return !r.comingSoon;
    })[0];

    function priceStrip(price) {
      return (
        '<div class="price-strip" aria-label="' + escHtml(price + " " + priceLabelText) + '">' +
        '<span class="price-strip-value num">' + escHtml(price) + " VND</span>" +
        '<span class="price-strip-unit">/ ' + escHtml(isVi ? "đêm" : "night") + "</span>" +
        "</div>"
      );
    }

    function roomImagePicture(src, alt, isFeatured) {
      const extIndex = src.lastIndexOf(".");
      const slashIndex = src.lastIndexOf("/");
      if (extIndex <= slashIndex) {
        return '<img class="room-img-bg-asset" src="' + escHtml(src) + '" alt="' + escHtml(alt) + '" loading="lazy" decoding="async" width="1080" height="1527">';
      }

      const stem = src.slice(slashIndex + 1, extIndex);
      const variantBase = src.slice(0, slashIndex + 1) + "variants/" + stem + "-";
      const widths = [360, 540, 720];
      const sizes = isFeatured
        ? "(max-width: 900px) 100vw, 720px"
        : "(max-width: 768px) 100vw, 540px";

      function srcset(format) {
        return widths.map(function (w) {
          return variantBase + w + "." + format + " " + w + "w";
        }).join(", ");
      }

      const loadingAttr = isFeatured ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

      return (
        '<picture class="room-img-picture">' +
        '<source type="image/avif" srcset="' + escHtml(srcset("avif")) + '" sizes="' + escHtml(sizes) + '">' +
        '<source type="image/webp" srcset="' + escHtml(srcset("webp")) + '" sizes="' + escHtml(sizes) + '">' +
        '<img class="room-img-bg-asset" src="' + escHtml(src) + '" srcset="' + escHtml(srcset("jpg")) + '" sizes="' + escHtml(sizes) + '" alt="' + escHtml(alt) + '" ' + loadingAttr + ' decoding="async" width="1080" height="1527">' +
        "</picture>"
      );
    }

    function renderRoomCard(r) {
      const name = (isVi && r.name_vi) ? r.name_vi : r.name;
      const isFeatured = featuredRoom && r.id === featuredRoom.id;
      const cardClass = "room-card" + (isFeatured ? " room-card-featured" : "");

      /* Coming Soon card — no modal, no booking link */
      if (r.comingSoon) {
        const csName = name;
        const csDesc = (isVi && r.desc_vi) ? r.desc_vi : r.desc;
        const csAmenities = (isVi && r.amenities_vi) ? r.amenities_vi : (r.amenities || []);
        const csPills = csAmenities.map(function (a) { return '<span class="tag">' + escHtml(a) + "</span>"; }).join("\n                  ");
        const csMeta = ((isVi && r.meta_vi) ? r.meta_vi : (r.meta || [])).map(function (m) {
          return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
        }).join("\n                  ");
        return (
          '<div class="room-card room-card-coming-soon">' +
          '<div class="room-img">' +
          '<div class="room-img-bg"><div class="room-coming-soon-overlay" aria-hidden="true"><span class="room-coming-soon-icon">🛏️</span></div></div>' +
          priceStrip(r.price) +
          "</div>" +
          '<div class="room-body">' +
          '<span class="coming-soon-badge" aria-label="' + escHtml(comingSoonText) + '">' + escHtml(comingSoonText) + "</span>" +
          '<h3 class="room-name">' + escHtml(csName) + "</h3>" +
          '<div class="room-meta">' + csMeta + "</div>" +
          '<p class="room-desc">' + escHtml(csDesc) + "</p>" +
          '<div class="amenity-tags">' + csPills + "</div>" +
          '<span class="room-link room-link-soon" aria-disabled="true">' + escHtml(comingSoonText) + " →</span>" +
          "</div>" +
          "</div>"
        );
      }

      const featuredBadge = isFeatured
        ? '<span class="featured-badge"><span class="sr-only">' + escHtml(featuredText) + ': </span>' + escHtml(featuredText) + "</span>"
        : "";

      const amenities = (isVi && r.amenities_vi) ? r.amenities_vi : (r.amenities || []);
      const pills = amenities.map(function (a) {
        return '<span class="tag">' + escHtml(a) + "</span>";
      }).join("\n                  ");

      const metaList = (isVi && r.meta_vi) ? r.meta_vi : (r.meta || []);
      const metaItems = metaList.map(function (m) {
        return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
      }).join("\n                  ");

      const desc = (isVi && r.desc_vi) ? r.desc_vi : r.desc;
      const bestFor = (isVi && r.bestFor_vi) ? r.bestFor_vi : (r.bestFor || null);
      const bestForHtml = bestFor
        ? '<p class="room-best-for">' + escHtml(bestFor) + "</p>"
        : "";

      /* Pre-filled booking deeplink: mailto with room name in subject */
      const bookSubject = (isVi && r.bookSubject_vi) ? r.bookSubject_vi
                      : r.bookSubject ? r.bookSubject
                      : (isVi ? "Đặt phòng — " : "Booking — ") + name;
      const bookGreeting = isVi ? "Xin%20ch%C3%A0o%20CP12%2C" : "Hi%20CP12%2C";
      const bookHref = "mailto:cp12tramdungchill@gmail.com?subject=" +
                     encodeURIComponent(bookSubject) +
                     "&body=" + bookGreeting;

      /* Native lazy loading instead of intersection observer data-bg */
      const hasCover    = !!r.coverPhoto;
      const bgClassAttr = hasCover ? "" : (r.bgClass ? (" " + escHtml(r.bgClass)) : "");
      const imgOrPattern = hasCover ? roomImagePicture(r.coverPhoto, name, isFeatured) : '<div class="room-img-pattern"></div>';

      return (
        '<div class="' + cardClass + '">' +
        '<div class="room-img">' +
        '<div class="room-img-bg' + bgClassAttr + '">' + imgOrPattern + '</div>' +
        priceStrip(r.price) +
        featuredBadge +
        "</div>" +
        '<div class="room-body">' +
        '<h3 class="room-name">' + escHtml(name) + "</h3>" +
        '<div class="room-meta">' + metaItems + "</div>" +
        '<p class="room-desc">' + escHtml(desc) + "</p>" +
        bestForHtml +
        '<div class="amenity-tags">' + pills + "</div>" +
        '<div class="room-actions">' +
        '<button type="button" class="room-link room-photo-btn" data-room-id="' + escHtml(r.id || "") + '" aria-label="' + escHtml(viewPhotosPrefix + " " + name) + '">' + escHtml(viewPhotosText) + "</button>" +
        '<a href="' + escHtml(bookHref) + '" class="room-link">' + bookLinkText + "</a>" +
        "</div>" +
        "</div>" +
        "</div>"
      );
    }

    const orderedRooms = [];
    if (featuredRoom) orderedRooms.push(featuredRoom);
    rooms.forEach(function (r) {
      if (!featuredRoom || r.id !== featuredRoom.id) orderedRooms.push(r);
    });

    const html = orderedRooms.map(renderRoomCard).join("\n");

    grid.innerHTML = html;

    /* Notify IIFE 6 only if future room markup includes lazy CSS backgrounds. */
    if (window.cp12ObserveLazy && grid.querySelector("[data-bg]")) window.cp12ObserveLazy(grid);

    /* Attach gallery click handlers after each innerHTML write (handlers are destroyed on re-render) */
    const photoBtns = grid.querySelectorAll(".room-photo-btn");
    for (let ri = 0; ri < photoBtns.length; ri++) {
      (function (roomIndex) {
        photoBtns[roomIndex].addEventListener("click", function () {
          const roomId = photoBtns[roomIndex].getAttribute("data-room-id");
          const dataIndex = rooms.findIndex(function (room) {
            return room.id === roomId;
          });
          if (dataIndex < 0) return;
          if (window.cp12OpenRoomModal) {
            window.cp12OpenRoomModal(dataIndex, window.cp12Lang || "vi");
          } else {
            console.warn("[CP12] room modal not ready");
          }
        });
      }(ri));
    }
  }

  /* Expose for lang-switcher (IIFE 0) to call on language change */
  window.cp12RenderRooms = renderRooms;

  function renderInitialRooms() {
    renderRooms(window.cp12Lang || "vi");
  }

  /* Rooms sit below the hero; defer the initial card work until after first paint. */
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(function () {
      setTimeout(renderInitialRooms, 0);
    });
  } else {
    setTimeout(renderInitialRooms, 0);
  }
})();


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

  function cssDurationMs(token, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const match = /^([\d.]+)(ms|s)$/.exec(value);
    if (!match) return fallback;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return fallback;
    return match[2] === "s" ? amount * 1000 : amount;
  }

  const modalSwitchMs = cssDurationMs("--dur-3", 380);
  const modalFocusMs = cssDurationMs("--dur-instant", 50);
  const modalCloseMs = cssDurationMs("--dur-320", 320);
  const modalButtonFeedbackMs = cssDurationMs("--dur-150", 150);

  /* Cache parsed i18n strings per language to avoid repeated JSON.parse */
  const stringsCache = {};
  function loadStrings(lang) {
    if (stringsCache[lang]) return stringsCache[lang];
    const el = document.getElementById("lang-" + lang + "-data");
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

  const escHtml = window.cp12Esc || function(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); };

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
      (function (i) {
        btn.addEventListener("click", function () { showPhoto(i); });
      }(idx));
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


/* ── 3. Hero play button — opens welcome-video modal (IIFE 5 owns the modal) ── */
(function () {
  try {
    const heroPlay = document.getElementById("heroPlayBtn");
    if (heroPlay) {
      heroPlay.addEventListener("click", function () {
        if (window.cp12OpenModal) window.cp12OpenModal(heroPlay);
      });
    }
  } catch (e) { console.warn("[CP12] video init error:", e); }
})();


/* ── 4. Travel filter tabs ────────────────────────────────── */
(function () {
  try {
  const wrap = document.getElementById("cp12-wrap");
  const tabs = wrap ? Array.from(wrap.querySelectorAll(".filter-tabs .tab")) : [];
  const cards = wrap ? Array.from(wrap.querySelectorAll(".explore-card")) : [];
  const grid = wrap ? wrap.querySelector(".travel-grid") : null;
  const status = document.getElementById("travel-filter-status");
  const emptyState = wrap ? wrap.querySelector(".explore-empty") : null;

  function cssDurationMs(token, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const match = /^([\d.]+)(ms|s)$/.exec(value);
    if (!match) return fallback;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return fallback;
    return match[2] === "s" ? amount * 1000 : amount;
  }

  /* IMPORTANT-3: duration must match CSS opacity transition on .travel-card */
  const FILTER_FADE_MS = cssDurationMs("--dur-2", 220);

  /* CRIT-3: Initialise tabpanel aria-labelledby to the default active tab */
  if (grid) grid.setAttribute("aria-labelledby", "tab-all");

  function filterCards(f, activeTabId) {
    let count = 0;
    cards.forEach(function (c) {
      const cat = c.getAttribute("data-category");
      const show = f === "all" || cat === f;
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
    

    if (emptyState) {
      if (count === 0) {
        emptyState.classList.remove("sr-only");
        emptyState.removeAttribute("hidden");
      } else {
        emptyState.classList.add("sr-only");
        emptyState.setAttribute("hidden", "true");
      }
    }

    /* CRIT-3: Keep tabpanel label in sync with the active tab */
    if (grid && activeTabId) {
      grid.setAttribute("aria-labelledby", activeTabId);
    }
    /* CRIT-3: Announce result count via dedicated status element (not tabpanel) */
    if (status) {
      const isVi = window.cp12Lang === "vi";
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
      let idx = -1;
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


/* ── 5. Modal · Mobile nav · IO reveal · Scroll · Dots · Anchors ── */
(function () {
  try {
    const wrap = document.getElementById("cp12-wrap");
    /* CRIT-2: Cache reduced-motion preference once — used for all scrollTo calls */
    const prefersReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const modal = document.getElementById("cp12Modal");
    const modalClose = document.getElementById("cp12ModalClose");
    let lastFocus = null;

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
      const dur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dur-320").trim()) || 320;
      setTimeout(function () {
        modal.style.display = "";
      }, dur);
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
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
    const hamburger = wrap ? wrap.querySelector(".nav-hamburger") : null;
    const mobileNav = document.getElementById("cp12MobileNav");
    /* CRIT-4: Set aria-hidden on mobile nav at init — mirrors modal pattern (line 10) */
    if (mobileNav) mobileNav.setAttribute("aria-hidden", "true");
    const mobileClose = mobileNav
      ? mobileNav.querySelector(".nav-mobile-close")
      : null;
    const mobileLinks = mobileNav ? mobileNav.querySelectorAll("a") : [];
    let mobileNavLastFocus = null;

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
        const focusable = mobileNav.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
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
    const revealEls = document.querySelectorAll(".cp12-reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
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
    const sections = Array.from(document.querySelectorAll("[data-section]"));
    if ("IntersectionObserver" in window) {
      const sio = new IntersectionObserver(
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
    const dotsNav = document.getElementById("cp12-dots");
    const dots = dotsNav
      ? Array.from(dotsNav.querySelectorAll(".dot"))
      : [];
    const darkSects = { home: 1, explore: 1, book: 1 };

    let cachedNav = null;
    function getNav() {
      if (!cachedNav) {
        cachedNav = document.querySelector("#cp12-wrap .cp12-main-nav");
      }
      return cachedNav;
    }

    function updateDots() {
      const scrollY = window.pageYOffset;
      const midY = scrollY + window.innerHeight * 0.5;
      const navH = (getNav() || {}).offsetHeight || 70;
      if (dotsNav) {
        const show = scrollY > window.innerHeight * 0.4;
        dotsNav.classList.toggle("visible", show);
        dotsNav.setAttribute("aria-hidden", show ? "false" : "true");
        dots.forEach(function (d) {
          d.tabIndex = show ? 0 : -1;
        });
      }
      let current = sections[0];
      sections.forEach(function (s) {
        if (s.offsetHeight === 0) return; /* skip display:none sections */
        if (s.getBoundingClientRect().top + scrollY - navH <= midY)
          current = s;
      });
      dots.forEach(function (d) {
        if (d.dataset.target === current.id) {
          d.setAttribute("aria-current", "true");
        } else {
          d.removeAttribute("aria-current");
        }
      });
      if (dotsNav) {
        dotsNav.classList.toggle("on-dark", !!darkSects[current.id]);
        dotsNav.classList.toggle("on-light", !darkSects[current.id]);
      }
      /* ── Section-aware nav colorway ── */
      const navEl = getNav();
      if (navEl) {
        navEl.classList.toggle("nav-over-dark", !!darkSects[current.id]);
      }
    }

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        const el = document.getElementById(d.dataset.target);
        if (!el) return;
        const navH = (getNav() || {}).offsetHeight || 70;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.pageYOffset - navH,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      });
    });

    /* ── Next-section button ── */
    const nextBtn = document.getElementById("cp12-next-btn");

    function updateNextBtn() {
      if (!nextBtn) return;
      const scrollY = window.pageYOffset;
      const atBottom =
        scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - window.innerHeight * 0.2;
      const show = scrollY > window.innerHeight * 0.2 && !atBottom;
      nextBtn.classList.toggle("visible", show);
      nextBtn.setAttribute("aria-hidden", show ? "false" : "true");
      nextBtn.tabIndex = show ? 0 : -1;
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        const navH = (getNav() || {}).offsetHeight || 70;
        const scrollY = window.pageYOffset;
        let next = null;
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
      const tag = (document.activeElement || {}).tagName || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === "PageDown" || (e.key === "ArrowDown" && e.shiftKey)) {
        e.preventDefault();
        if (nextBtn) nextBtn.click();
      }
    });

    /* ── Nav transparency + scroll state updates ── */
    let nav = getNav();
    function updateNav() {
      nav = nav || getNav();
      if (!nav) return;
      const y = window.pageYOffset;
      nav.classList.toggle("scrolled", y > 60);
      nav.classList.toggle("scrolled-deep", y > 80);
      /* When returning to the top (not scrolled), we are definitively on
         the hero section which is always dark — force nav-over-dark on so
         the dark-pine gradient colorway is immediately correct.           */
      if (y <= 60) {
        nav.classList.add("nav-over-dark");
      }
    }

    let rafPending = false;
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
    const anchors = document.querySelectorAll('#cp12-wrap a[href^="#"]');
    anchors.forEach(function (a) {
      a.addEventListener("click", function (e) {
        const id = this.getAttribute("href").slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          /* Close room detail modal if open before scrolling (IIFE 2) */
          if (window.cp12CloseRoomModal) window.cp12CloseRoomModal();
          const navH = (getNav() || {}).offsetHeight || 0;
          const targetTop =
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
 * for safe URL escaping (matches data-cover pattern).
 *
 * P-1 safe: new Image() is never inserted into the DOM.
 * Covers: static travel cards and any future [data-bg] elements rendered later.
 *
 * Public API (set on window for IIFE 1 rooms.js):
 *   window.cp12ObserveLazy(container?)
 *     — re-observes [data-bg] inside container (or whole doc)
 *     — available to renderers that add [data-bg] elements after initial load
 * ──────────────────────────────────────────────────────────── */
(function () {
  let lazyObserver;

  /* Apply background-image for one element and mark it loaded */
  function loadBg(el) {
    const src = el.dataset.bg; /* dataset read — XSS safe */
    if (!src) return;

    const preload = new Image(); /* off-DOM — never inserted (P-1 safe) */
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
    const els = (root || document).querySelectorAll("[data-bg]");
    for (let i = 0; i < els.length; i++) {
      lazyObserver.observe(els[i]);
    }
  }

  try {
    lazyObserver = new IntersectionObserver(
      function (entries) {
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) loadBg(entries[i].target);
        }
      },
      {
        rootMargin: "300px 0px", /* start loading 300px before viewport */
        threshold: 0
      }
    );

    /* Initial scan — picks up static travel cards and any server-rendered data-bg elements */
    observeAll(document);

    /* Expose for rooms.js (IIFE 1) to call after each re-render */
    window.cp12ObserveLazy = observeAll;

  } catch (e) {
    console.warn("[CP12] Lazy loader init error:", e);
    /* Graceful fallback: apply all deferred backgrounds immediately */
    try {
      const fallbacks = document.querySelectorAll("[data-bg]");
      for (let j = 0; j < fallbacks.length; j++) {
        const fbSrc = fallbacks[j].dataset.bg;
        if (fbSrc) {
          fallbacks[j].style.backgroundImage = "url(" + JSON.stringify(fbSrc) + ")";
          fallbacks[j].classList.add("cp12-loaded");
          fallbacks[j].removeAttribute("data-bg");
        }
      }
    } catch (fe) { /* silent — best effort */ }
  }
})();
