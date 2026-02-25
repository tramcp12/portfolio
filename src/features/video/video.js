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
