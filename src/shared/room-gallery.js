/* ── 2. Room Gallery Drawer ───────────────────────────────── */
(function () {
  try {
    var drawer      = document.getElementById("cp12-room-drawer");
    var drawerClose = document.getElementById("cp12-drawer-close");
    var mainImg     = document.getElementById("cp12-drawer-main");
    var thumbStrip  = document.getElementById("cp12-drawer-thumbs");
    var counterEl   = drawer ? drawer.querySelector(".drawer-counter")   : null;
    var nameEl      = drawer ? drawer.querySelector(".drawer-room-name") : null;
    var metaEl      = drawer ? drawer.querySelector(".drawer-room-meta") : null;
    var descEl      = drawer ? drawer.querySelector(".drawer-room-desc") : null;
    var amenEl      = drawer ? drawer.querySelector(".drawer-amenities") : null;
    var prevBtn     = drawer ? drawer.querySelector(".drawer-nav-prev")  : null;
    var nextBtn     = drawer ? drawer.querySelector(".drawer-nav-next")  : null;

    /* aria-hidden set via JS, not static HTML (avoids hidden-focusable validator false positive) */
    if (drawer) drawer.setAttribute("aria-hidden", "true");

    /* ── State ── */
    var currentRoomIndex  = null;
    var currentPhotoIndex = 0;
    var currentPhotos     = [];
    var currentLang       = "vi";
    var drawerLastFocus   = null;

    /* ── Helpers ── */
    function escHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    /* Local interpolation for photo counter string ({n} / {total}) */
    function interpolate(template, n, total) {
      return template.replace("{n}", n).replace("{total}", total);
    }

    function getRooms() {
      try {
        var el = document.getElementById("rooms-data");
        return el ? JSON.parse(el.textContent) : [];
      } catch (e) {
        return [];
      }
    }

    function getStrings(lang) {
      try {
        var id = lang === "en" ? "lang-en-data" : "lang-vi-data";
        var el = document.getElementById(id);
        return el ? JSON.parse(el.textContent) : {};
      } catch (e) {
        return {};
      }
    }

    /* ── Photo display ── */
    function showPhoto(index) {
      if (!currentPhotos.length) return;
      index = Math.max(0, Math.min(index, currentPhotos.length - 1));
      currentPhotoIndex = index;

      var photo = currentPhotos[index];
      if (mainImg) {
        mainImg.style.backgroundImage = "url(\"" + photo.src + "\")";
        var altText = (currentLang === "vi" && photo.alt_vi) ? photo.alt_vi : (photo.alt || "");
        mainImg.setAttribute("aria-label", altText || "Room photo");
      }

      /* Update counter */
      if (counterEl) {
        var strings = getStrings(currentLang);
        var tmpl = strings["drawer.photoCount"] || ("{n} / {total}");
        counterEl.textContent = interpolate(tmpl, index + 1, currentPhotos.length);
      }

      /* Update thumbnails: aria-current="true" on active, remove from others */
      if (thumbStrip) {
        var thumbs = thumbStrip.querySelectorAll(".drawer-thumb");
        for (var i = 0; i < thumbs.length; i++) {
          if (i === index) {
            thumbs[i].setAttribute("aria-current", "true");
            /* Scroll active thumb into view */
            thumbs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
          } else {
            thumbs[i].removeAttribute("aria-current");
          }
        }
      }

      /* Disable prev/next at boundaries */
      if (prevBtn) {
        prevBtn.disabled = (index === 0);
        prevBtn.setAttribute("aria-disabled", index === 0 ? "true" : "false");
      }
      if (nextBtn) {
        nextBtn.disabled = (index === currentPhotos.length - 1);
        nextBtn.setAttribute("aria-disabled", index === currentPhotos.length - 1 ? "true" : "false");
      }
    }

    /* ── Populate drawer with room data ── */
    function populateDrawer(roomIndex, lang) {
      var rooms = getRooms();
      if (!rooms[roomIndex]) return;
      var room = rooms[roomIndex];
      var isVi = lang === "vi";

      currentLang       = lang;
      currentRoomIndex  = roomIndex;
      currentPhotos     = Array.isArray(room.photos) ? room.photos : [];

      /* Room name — CRIT-2: use name_vi when language is Vietnamese */
      if (nameEl) {
        var displayName = (isVi && room.name_vi) ? room.name_vi : (room.name || "");
        nameEl.textContent = displayName;
      }

      /* Meta */
      if (metaEl) {
        var metaList = (isVi && room.meta_vi) ? room.meta_vi : (room.meta || []);
        metaEl.innerHTML = metaList.map(function (m) {
          return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
        }).join("");
      }

      /* Description */
      if (descEl) {
        var desc = (isVi && room.desc_vi) ? room.desc_vi : (room.desc || "");
        descEl.textContent = desc;
      }

      /* Amenities */
      if (amenEl) {
        var amenities = (isVi && room.amenities_vi) ? room.amenities_vi : (room.amenities || []);
        amenEl.innerHTML = amenities.map(function (a) {
          return '<span class="pill">' + escHtml(a) + "</span>";
        }).join("");
      }

      /* Rebuild thumbnail strip */
      if (thumbStrip) {
        thumbStrip.innerHTML = "";
        currentPhotos.forEach(function (photo, idx) {
          var thumb = document.createElement("div");
          thumb.className = "drawer-thumb";
          thumb.setAttribute("role", "listitem"); /* required by role=list parent */
          thumb.style.backgroundImage = "url(\"" + photo.src + "\")";
          var altTxt = (isVi && photo.alt_vi) ? photo.alt_vi : (photo.alt || "Photo " + (idx + 1));
          thumb.setAttribute("title", altTxt);
          thumb.setAttribute("tabindex", "0");
          /* Closure for index */
          (function (photoIdx) {
            thumb.addEventListener("click", function () { showPhoto(photoIdx); });
            thumb.addEventListener("keydown", function (e) {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showPhoto(photoIdx); }
            });
          }(idx));
          thumbStrip.appendChild(thumb);
        });
      }

      /* Show first photo (also updates counter and aria-current) */
      showPhoto(0);
    }

    /* ── Open ── */
    function openDrawer(roomIndex, lang) {
      if (!drawer) return;
      drawerLastFocus = document.activeElement || document.body;
      currentLang = lang || window.cp12Lang || "vi";

      populateDrawer(roomIndex, currentLang);

      drawer.style.display = "block";
      requestAnimationFrame(function () {
        drawer.classList.add("open");
      });
      drawer.removeAttribute("aria-hidden");
      /* Move focus to close button */
      if (drawerClose) drawerClose.focus();
      /* Prevent body scroll */
      document.body.style.overflow = "hidden";
    }

    /* ── Close ── */
    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      setTimeout(function () {
        drawer.style.display = "";
      }, 350);
      if (drawerLastFocus) drawerLastFocus.focus();
    }

    /* ── Refresh language (called by lang-switcher when user toggles language while drawer is open) ── */
    function refreshDrawerLang(lang) {
      if (currentRoomIndex === null || !drawer || !drawer.classList.contains("open")) return;
      populateDrawer(currentRoomIndex, lang);
    }

    /* ── Expose globals ── */
    window.cp12OpenRoomGallery    = openDrawer;
    window.cp12CloseRoomGallery   = closeDrawer;
    window.cp12RefreshDrawerLang  = refreshDrawerLang;

    if (!drawer) return; /* No drawer element — safe exit */

    /* ── Close button click ── */
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);

    /* ── Backdrop click ── */
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) closeDrawer();
    });

    /* ── Keyboard: Escape + ArrowLeft/Right + focus trap (WCAG 2.1 AA — SC 2.4.3) ── */
    document.addEventListener("keydown", function (e) {
      if (!drawer || !drawer.classList.contains("open")) return;

      if (e.key === "Escape") {
        closeDrawer();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPhoto(currentPhotoIndex - 1);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        showPhoto(currentPhotoIndex + 1);
        return;
      }

      /* Focus trap — algorithmic pattern (mirrors modal in scroll-reveal.js) */
      if (e.key === "Tab") {
        var focusable = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
      }
    });

    /* ── Prev / Next buttons ── */
    if (prevBtn) prevBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { showPhoto(currentPhotoIndex + 1); });

  } catch (e) {
    console.warn("[CP12] Room gallery init error:", e);
  }
})();
