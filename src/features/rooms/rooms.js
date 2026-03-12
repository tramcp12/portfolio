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

  var escHtml = window.cp12Esc || function(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };

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
    var comingSoonText = roomStrings["rooms.comingSoon"] || (isVi ? "Sắp Có" : "Coming Soon");
    var comingSoonDescText = roomStrings["rooms.comingSoonDesc"] || (isVi ? "Phòng dorm sắp khai trương." : "Dorm beds opening soon.");

    var html = rooms.map(function (r) {
      var name = (isVi && r.name_vi) ? r.name_vi : r.name;

      /* Coming Soon card — no modal, no booking link */
      if (r.comingSoon) {
        var csName = name;
        var csDesc = (isVi && r.desc_vi) ? r.desc_vi : r.desc;
        var csAmenities = (isVi && r.amenities_vi) ? r.amenities_vi : (r.amenities || []);
        var csPills = csAmenities.map(function (a) { return '<span class="pill">' + escHtml(a) + "</span>"; }).join("\n                  ");
        var csMeta = ((isVi && r.meta_vi) ? r.meta_vi : (r.meta || [])).map(function (m) {
          return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
        }).join("\n                  ");
        return (
          '<div class="room-card room-card--coming-soon">' +
          '<div class="room-img">' +
          '<div class="room-img-bg"><div class="room-coming-soon-overlay" aria-hidden="true"><span class="room-coming-soon-icon">🛏️</span></div></div>' +
          '<div class="room-price-tag"><span class="price-vnd">' + escHtml(r.price) + '</span><span class="price-label">' + priceLabelText + "</span></div>" +
          "</div>" +
          '<div class="room-body">' +
          '<span class="coming-soon-badge" aria-label="' + escHtml(comingSoonText) + '">' + escHtml(comingSoonText) + "</span>" +
          '<h3 class="room-name">' + escHtml(csName) + "</h3>" +
          '<div class="room-meta">' + csMeta + "</div>" +
          '<p class="room-desc">' + escHtml(csDesc) + "</p>" +
          '<div class="amenity-pills">' + csPills + "</div>" +
          '<span class="room-link room-link--soon" aria-disabled="true">' + escHtml(comingSoonText) + " →</span>" +
          "</div>" +
          "</div>"
        );
      }

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
      var bestFor = (isVi && r.bestFor_vi) ? r.bestFor_vi : (r.bestFor || null);
      var bestForHtml = bestFor
        ? '<p class="room-best-for">' + escHtml(bestFor) + "</p>"
        : "";

      /* Pre-filled booking deeplink: mailto with room name in subject */
      var bookSubject = (isVi && r.bookSubject_vi) ? r.bookSubject_vi
                      : r.bookSubject ? r.bookSubject
                      : (isVi ? "Đặt phòng — " : "Booking — ") + name;
      var bookGreeting = isVi ? "Xin%20ch%C3%A0o%20CP12%2C" : "Hi%20CP12%2C";
      var bookHref = "mailto:cp12tramdungchill@gmail.com?subject=" +
                     encodeURIComponent(bookSubject) +
                     "&body=" + bookGreeting;

      /* Native lazy loading instead of intersection observer data-bg */
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
        bestForHtml +
        '<div class="amenity-pills">' + pills + "</div>" +
        '<a href="' + escHtml(bookHref) + '" class="room-link">' + bookLinkText + "</a>" +
        "</div>" +
        "</div>"
      );
    }).join("\n");

    grid.innerHTML = html;

    /* Notify IIFE 6 (lazy-loader.js) of newly rendered [data-bg] elements.
     * cp12ObserveLazy is defined by the time language switches trigger re-render. */
    if (window.cp12ObserveLazy) window.cp12ObserveLazy(grid);

    /* Attach gallery click handlers after each innerHTML write (handlers are destroyed on re-render) */
    var cards = grid.querySelectorAll(".room-card");
    for (var ri = 0; ri < cards.length; ri++) {
      (function (roomIndex) {
        var cardLang = window.cp12Lang || "vi";
        var r = rooms[roomIndex];
        if (r && r.comingSoon) return; /* coming-soon cards have no modal */
        var isCardVi = cardLang === "vi";
        var roomName = r ? ((isCardVi && r.name_vi) ? r.name_vi : r.name) : "room";

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
