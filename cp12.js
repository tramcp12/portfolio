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


/* ── 1. Hero / Video ──────────────────────────────────────── */
(function () {
  var heroPlay = document.getElementById("heroPlayBtn");
  var videoFrame = document.getElementById("videoFrame");

  if (heroPlay) {
    heroPlay.addEventListener("click", function () {
      if (window.cp12OpenModal) window.cp12OpenModal(heroPlay);
    });
  }

  if (videoFrame) {
    videoFrame.addEventListener("click", function () {
      if (window.cp12OpenModal) window.cp12OpenModal(videoFrame);
    });
    videoFrame.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (window.cp12OpenModal) window.cp12OpenModal(videoFrame);
      }
    });
  }
})();


/* ── 2. Travel filter tabs ────────────────────────────────── */
(function () {
  var wrap = document.getElementById("cp12-wrap");
  var tabs = wrap ? wrap.querySelectorAll(".filter-tabs .tab") : [];
  var cards = wrap ? wrap.querySelectorAll(".travel-card") : [];

  function filterCards(f) {
    var count = 0;
    cards.forEach(function (c) {
      var cat = c.getAttribute("data-category");
      var show = f === "all" || cat === f;
      c.style.display = show ? "" : "none";
      if (show) count++;
    });
    /* Announce result count to screen readers via aria-live region */
    var grid = wrap ? wrap.querySelector(".travel-grid") : null;
    if (grid) {
      grid.setAttribute(
        "aria-label",
        count + " destination" + (count !== 1 ? "s" : "") + " shown",
      );
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");
      filterCards(this.getAttribute("data-filter"));
    });
  });
})();


/* ── 3. Modal · Mobile nav · IO reveal · Scroll · Dots · Anchors ── */
(function () {
  try {
    var wrap = document.getElementById("cp12-wrap");
    var modal = document.getElementById("cp12Modal");
    var modalClose = document.getElementById("cp12ModalClose");
    var lastFocus = null;

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
      setTimeout(function () {
        modal.style.display = "";
      }, 300);
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
      var focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
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
    var hamburger = wrap ? wrap.querySelector(".nav-hamburger") : null;
    var mobileNav = document.getElementById("cp12MobileNav");
    var mobileClose = mobileNav
      ? mobileNav.querySelector(".nav-mobile-close")
      : null;
    var mobileLinks = mobileNav ? mobileNav.querySelectorAll("a") : [];

    if (hamburger && mobileNav) {
      hamburger.addEventListener("click", function () {
        mobileNav.classList.add("open");
        hamburger.setAttribute("aria-expanded", "true");
        mobileNav.removeAttribute("aria-hidden");
        if (mobileClose) mobileClose.focus();
      });

      function closeMob() {
        mobileNav.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
        hamburger.focus();
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
        var focusable = mobileNav.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
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
    var revealEls = document.querySelectorAll(".cp12-reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
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
    var sections = Array.from(
      document.querySelectorAll(
        "#home,#video,#rooms,#explore,#about,#journal,#book",
      ),
    );
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(
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
        { threshold: 0.18 },
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
    var dotsNav = document.getElementById("cp12-dots");
    var dots = dotsNav
      ? Array.from(dotsNav.querySelectorAll(".dot"))
      : [];
    var darkSects = { home: 1, video: 1, explore: 1, book: 1 };

    var cachedNav = null;
    function getNav() {
      if (!cachedNav) {
        cachedNav = document.querySelector("#cp12-wrap .cp12-main-nav");
      }
      return cachedNav;
    }

    function updateDots() {
      var scrollY = window.pageYOffset;
      var midY = scrollY + window.innerHeight * 0.5;
      var navH = (getNav() || {}).offsetHeight || 70;
      if (dotsNav) {
        var show = scrollY > window.innerHeight * 0.4;
        dotsNav.classList.toggle("visible", show);
        dotsNav.setAttribute("aria-hidden", show ? "false" : "true");
        dots.forEach(function (d) {
          d.tabIndex = show ? 0 : -1;
        });
      }
      var current = sections[0];
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top + scrollY - navH <= midY)
          current = s;
      });
      dots.forEach(function (d) {
        d.dataset.target === current.id
          ? d.setAttribute("aria-current", "true")
          : d.removeAttribute("aria-current");
      });
      if (dotsNav) {
        dotsNav.classList.toggle("on-dark", !!darkSects[current.id]);
        dotsNav.classList.toggle("on-light", !darkSects[current.id]);
      }
      /* ── Section-aware nav colorway ── */
      var navEl = getNav();
      if (navEl) {
        navEl.classList.toggle("nav-over-dark", !!darkSects[current.id]);
      }
    }

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        var el = document.getElementById(d.dataset.target);
        if (!el) return;
        var navH = (getNav() || {}).offsetHeight || 70;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.pageYOffset - navH,
          behavior: "smooth",
        });
      });
    });

    /* ── Next-section button ── */
    var nextBtn = document.getElementById("cp12-next-btn");

    function updateNextBtn() {
      if (!nextBtn) return;
      var scrollY = window.pageYOffset;
      var atBottom =
        scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - window.innerHeight * 0.2;
      var show = scrollY > window.innerHeight * 0.2 && !atBottom;
      nextBtn.classList.toggle("visible", show);
      nextBtn.setAttribute("aria-hidden", show ? "false" : "true");
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var navH = (getNav() || {}).offsetHeight || 70;
        var scrollY = window.pageYOffset;
        var next = null;
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
            behavior: "smooth",
          });
      });
    }

    /* PageDown / Shift+ArrowDown → next section */
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement || {}).tagName || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === "PageDown" || (e.key === "ArrowDown" && e.shiftKey)) {
        e.preventDefault();
        if (nextBtn) nextBtn.click();
      }
    });

    /* ── Nav transparency + scroll state updates ── */
    var nav = getNav();
    function updateNav() {
      nav = nav || getNav();
      if (!nav) return;
      var y = window.pageYOffset;
      nav.classList.toggle("scrolled", y > 60);
      nav.style.boxShadow = y > 80 ? "0 2px 20px rgba(0,0,0,.08)" : "";
      /* When returning to the top (not scrolled), we are definitively on
         the hero section which is always dark — force nav-over-dark on so
         the dark-pine gradient colorway is immediately correct.           */
      if (y <= 60) {
        nav.classList.add("nav-over-dark");
      }
    }

    var rafPending = false;
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
    var anchors = document.querySelectorAll('#cp12-wrap a[href^="#"]');
    anchors.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = this.getAttribute("href").slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          var navH = (getNav() || {}).offsetHeight || 0;
          var targetTop =
            target.getBoundingClientRect().top +
            window.pageYOffset -
            navH;
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      });
    });
  } catch (e) {
    console.warn("[CP12] Initialization error:", e);
  }
})();
