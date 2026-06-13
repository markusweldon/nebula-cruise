// Canvas warp-streak starfield. Streak length comes from per-frame travel,
// so stars are dots at warp 1 and proper light-lines at warp 30.
window.Starfield = (function () {
  const FAR = 1000;
  const FOCAL = 400;

  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");

  let stars = [];
  let speed = 1;
  let tint = { r: 230, g: 230, b: 255 };
  let rafId = null;
  let lastTime = 0;
  let width = 0;
  let height = 0;

  function respawn(star, depth) {
    star.x = (Math.random() - 0.5) * width * 3;
    star.y = (Math.random() - 0.5) * height * 3;
    star.z = depth !== undefined ? depth : FAR;
    star.pz = star.z;
    return star;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 600 ? 180 : 350;
    while (stars.length < count) {
      stars.push(respawn({}, Math.random() * (FAR - 1) + 1));
    }
    stars.length = count;
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    // Clamp dt so a background-tab resume doesn't smear stars across the screen
    const dt = Math.min((t - lastTime) / 1000, 0.05);
    lastTime = t;
    const velocity = 40 + speed * 60;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";

    for (const s of stars) {
      s.pz = s.z;
      s.z -= velocity * dt;
      if (s.z <= 1) {
        respawn(s);
        continue;
      }
      const k = FOCAL / s.z;
      const sx = cx + s.x * k;
      const sy = cy + s.y * k;
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) {
        respawn(s);
        continue;
      }
      const depth = 1 - s.z / FAR; // 0 = far, 1 = in your face
      const pk = FOCAL / s.pz;
      ctx.strokeStyle =
        "rgba(" + tint.r + "," + tint.g + "," + tint.b + "," + (0.2 + depth * 0.8).toFixed(2) + ")";
      ctx.lineWidth = 0.5 + depth * 2;
      ctx.beginPath();
      ctx.moveTo(cx + s.x * pk, cy + s.y * pk);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }

  window.addEventListener("resize", resize);
  resize();

  return {
    start: function () {
      if (rafId !== null) return;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop: function () {
      cancelAnimationFrame(rafId);
      rafId = null;
    },
    setSpeed: function (value) {
      speed = value;
    },
    setTint: function (hex) {
      // "#rrggbb" → rgb, lightened halfway to white so streaks stay starry
      const n = parseInt(hex.slice(1), 16);
      tint = {
        r: Math.round(((n >> 16 & 255) + 255) / 2),
        g: Math.round(((n >> 8 & 255) + 255) / 2),
        b: Math.round(((n & 255) + 255) / 2),
      };
    },
  };
})();
