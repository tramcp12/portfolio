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
