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
