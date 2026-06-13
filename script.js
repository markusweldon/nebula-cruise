document.addEventListener("DOMContentLoaded", function () {
  const speedRange = document.getElementById("speedRange");
  const speedLabel = document.querySelector('label[for="speedRange"]');

  function setSpeed(speed) {
    speed = Math.min(30, Math.max(1, speed));
    speedRange.value = speed;
    document.documentElement.style.setProperty("--duration", 31 - speed + "s");
    speedLabel.textContent = "Hyperspace Speed — Warp " + speed.toFixed(1);
    speedRange.setAttribute("aria-valuetext", "warp " + speed.toFixed(1));
  }

  speedRange.addEventListener("input", function () {
    setSpeed(parseFloat(this.value));
  });

  setSpeed(parseFloat(speedRange.value));
});
