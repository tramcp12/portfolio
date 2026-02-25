/* ── 0. Rooms renderer ───────────────────────────────────── */
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
  if (rooms.length === 0) {
    grid.innerHTML = '<p class="rooms-empty">Room details coming soon.</p>';
    return;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var html = rooms.map(function (r) {
    var featuredBadge = r.featured
      ? '<span class="featured-badge"><span class="sr-only">Featured room: </span><span aria-hidden="true">⭐</span> Featured</span>'
      : "";
    var pills = (r.amenities || []).map(function (a) {
      return '<span class="pill">' + escHtml(a) + "</span>";
    }).join("\n                  ");
    var metaItems = (r.meta || []).map(function (m) {
      return '<span><span aria-hidden="true">' + escHtml(m.icon) + "</span> " + escHtml(m.text) + "</span>";
    }).join("\n                  ");

    return (
      '<div class="room-card">' +
      '<div class="room-img">' +
      '<div class="room-img-bg ' + escHtml(r.bgClass) + '"><div class="room-img-pattern"></div></div>' +
      '<div class="room-price-tag"><span class="price-vnd">' + escHtml(r.price) + '</span><span class="price-label">VND / night</span></div>' +
      featuredBadge +
      "</div>" +
      '<div class="room-body">' +
      '<h3 class="room-name">' + escHtml(r.name) + "</h3>" +
      '<div class="room-meta">' + metaItems + "</div>" +
      '<p class="room-desc">' + escHtml(r.desc) + "</p>" +
      '<div class="amenity-pills">' + pills + "</div>" +
      '<a href="#book" class="room-link">Book this room</a>' +
      "</div>" +
      "</div>"
    );
  }).join("\n");

  grid.innerHTML = html;
})();
