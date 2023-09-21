document.addEventListener("DOMContentLoaded", function () {
  const speedRange = document.getElementById("speedRange");
  const wraps = document.querySelectorAll(".wrap");

  speedRange.addEventListener("input", function () {
    const invertedValue = 31 - this.value; // Inverted the range value for speed slider
    const duration = invertedValue + "s";
    wraps.forEach((wrap) => {
      wrap.style.animationDuration = duration;
      wrap.querySelectorAll(".wall").forEach((wall) => {
        wall.style.animationDuration = duration;
      });
    });
  });
});
