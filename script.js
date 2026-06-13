document.addEventListener("DOMContentLoaded", function () {
  const speedRange = document.getElementById("speedRange");
  const speedLabel = document.querySelector('label[for="speedRange"]');
  const overlay = document.getElementById("overlay");
  const engageButton = document.getElementById("engage");
  const fullscreenButton = document.getElementById("fullscreenToggle");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let gentleDrift = reducedMotion; // hold the 120s CSS default until the user asks for speed
  let speed = 1;

  function setSpeed(value) {
    speed = Math.min(30, Math.max(1, value));
    speedRange.value = speed;
    speedLabel.textContent = "Hyperspace Speed — Warp " + speed.toFixed(1);
    speedRange.setAttribute("aria-valuetext", "warp " + speed.toFixed(1));
    if (!gentleDrift) {
      document.documentElement.style.setProperty("--duration", 31 - speed + "s");
    }
  }

  function userSetSpeed(value) {
    gentleDrift = false;
    setSpeed(value);
  }

  speedRange.addEventListener("input", function () {
    userSetSpeed(parseFloat(this.value));
  });

  window.addEventListener("keydown", function (e) {
    if (e.target === speedRange) return; // the slider already handles arrows natively
    if (e.key === "ArrowUp" || e.key === "ArrowRight") userSetSpeed(speed + 1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") userSetSpeed(speed - 1);
    else if (e.key === "f" || e.key === "F") toggleFullscreen();
  });

  engageButton.addEventListener("click", function () {
    document.body.classList.add("engaged");
    overlay.hidden = true;
  });
  if (reducedMotion) {
    document.getElementById("reducedMotionNote").hidden = false;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  if (document.documentElement.requestFullscreen) {
    fullscreenButton.addEventListener("click", toggleFullscreen);
  } else {
    fullscreenButton.hidden = true; // iPhone Safari has no fullscreen API
  }

  document.addEventListener("visibilitychange", function () {
    document.body.classList.toggle("paused", document.hidden);
  });

  setSpeed(parseFloat(speedRange.value));
});
