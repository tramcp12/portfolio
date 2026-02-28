/* ── 3. Hero / Video ──────────────────────────────────────── */
(function () {
  try {
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
  } catch (e) { console.warn("[CP12] video init error:", e); }
})();
