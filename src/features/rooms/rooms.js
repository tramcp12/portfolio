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

      return (
        '<div class="room-card">' +
        '<div class="room-img">' +
        '<div class="room-img-bg ' + escHtml(r.bgClass) + '"><div class="room-img-pattern"></div></div>' +
        '<div class="room-price-tag"><span class="price-vnd">' + escHtml(r.price) + '</span><span class="price-label">' + priceLabelText + "</span></div>" +
        featuredBadge +
        "</div>" +
        '<div class="room-body">' +
        '<h3 class="room-name">' + escHtml(r.name) + "</h3>" +
        '<div class="room-meta">' + metaItems + "</div>" +
        '<p class="room-desc">' + escHtml(desc) + "</p>" +
        '<div class="amenity-pills">' + pills + "</div>" +
        '<a href="#book" class="room-link">' + bookLinkText + "</a>" +
        "</div>" +
        "</div>"
      );
    }).join("\n");

    grid.innerHTML = html;

    /* Attach gallery click handlers after each innerHTML write (handlers are destroyed on re-render) */
    var cards = grid.querySelectorAll(".room-card");
    for (var ri = 0; ri < cards.length; ri++) {
      (function (roomIndex) {
        cards[roomIndex].addEventListener("click", function (e) {
          /* Don't intercept clicks on the "Book this room" anchor */
          if (e.target.closest("a")) return;
          if (window.cp12OpenRoomGallery) {
            window.cp12OpenRoomGallery(roomIndex, window.cp12Lang || "vi");
          } else {
            console.warn("[CP12] cp12OpenRoomGallery not available");
          }
        });
        /* Keyboard activation: Enter/Space on the card itself */
        cards[roomIndex].setAttribute("tabindex", "0");
        cards[roomIndex].setAttribute("role", "button");
        var roomName = rooms[roomIndex] ? rooms[roomIndex].name : "room";
        cards[roomIndex].setAttribute("aria-label", "View photos for " + roomName);
        cards[roomIndex].addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (window.cp12OpenRoomGallery) {
              window.cp12OpenRoomGallery(roomIndex, window.cp12Lang || "vi");
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
