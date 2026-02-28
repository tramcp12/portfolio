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

  /* CRIT-2: read i18n strings from injected data element (one parse per render call) */
  function getRoomStrings(lang) {
    var el = document.getElementById("lang-" + lang + "-data");
    if (!el) return {};
    try { return JSON.parse(el.textContent); } catch (e) { return {}; }
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

      /* Phase 10: coverPhoto via data-bg attribute — deferred to IIFE 6 (lazy-loader.js).
       * bgClass gradient is the fallback when no coverPhoto is present.
       * cp12-lazy class adds shimmer placeholder while image loads. */
      var hasCover    = !!r.coverPhoto;
      var bgClassAttr = hasCover ? " cp12-lazy" : (r.bgClass ? (" " + escHtml(r.bgClass)) : "");
      var dataBg      = hasCover ? ' data-bg="' + escHtml(r.coverPhoto) + '"' : "";
      var patternEl   = hasCover ? "" : '<div class="room-img-pattern"></div>';

      return (
        '<div class="room-card">' +
        '<div class="room-img">' +
        '<div class="room-img-bg' + bgClassAttr + '"' + dataBg + '>' + patternEl + '</div>' +
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
