document.addEventListener("DOMContentLoaded", function () {
  const speedRange = document.getElementById("speedRange");
  const speedLabel = document.querySelector('label[for="speedRange"]');
  const overlay = document.getElementById("overlay");
  const engageButton = document.getElementById("engage");
  const fullscreenButton = document.getElementById("fullscreenToggle");
  const soundToggle = document.getElementById("soundToggle");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let gentleDrift = reducedMotion; // hold the 120s CSS default until the user asks for speed
  let speed = 1;

  function setSpeed(value) {
    speed = Math.min(30, Math.max(1, value));
    speedRange.value = speed;
    speedLabel.textContent = "Hyperspace Speed — Warp " + speed.toFixed(1);
    speedRange.setAttribute("aria-valuetext", "warp " + speed.toFixed(1));
    setTunnelRate();
    Starfield.setSpeed(gentleDrift ? 0.2 : speed);
    EngineAudio.setSpeed(gentleDrift ? 1 : speed);
  }

  // Drive speed via the Web Animations API playbackRate instead of swapping
  // animation-duration — the latter re-maps elapsed time and snaps the tunnel.
  // The CSS --duration stays put as each animation's base; we just scale rate,
  // so the half-cycle cross-fade offset (a delay ratio) is preserved too.
  function setTunnelRate() {
    document.querySelectorAll(".wrap, .wall").forEach(function (el) {
      el.getAnimations().forEach(function (a) {
        if (gentleDrift) {
          a.updatePlaybackRate(1);
        } else {
          const baseMs = a.effect.getTiming().duration; // resolved ms
          a.updatePlaybackRate(baseMs / ((31 - speed) * 1000));
        }
      });
    });
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
    else if (e.key === "m" || e.key === "M") setSound(!soundOn);
  });

  // Sound: muted by default; a stored "on" preference only arms it —
  // it switches on at the engage click (a real user gesture)
  let soundOn = false;
  const soundArmed = localStorage.getItem("nebula.sound") === "on";
  if (soundArmed) {
    soundToggle.textContent = "🔊";
    soundToggle.setAttribute("aria-pressed", "true");
  }

  function setSound(on) {
    soundOn = on;
    soundToggle.textContent = on ? "🔊" : "🔇";
    soundToggle.setAttribute("aria-pressed", String(on));
    localStorage.setItem("nebula.sound", on ? "on" : "off");
    EngineAudio.setMuted(!on);
  }

  soundToggle.addEventListener("click", function () {
    setSound(!soundOn);
  });

  engageButton.addEventListener("click", function () {
    document.body.classList.add("engaged");
    overlay.hidden = true;
    Starfield.start();
    if (soundArmed && !soundOn) setSound(true);
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
    if (!document.body.classList.contains("engaged")) return;
    if (document.hidden) {
      Starfield.stop();
      EngineAudio.suspend();
    } else {
      Starfield.start();
      EngineAudio.resume();
    }
  });

  // ── Themes ──────────────────────────────────────────────────────────────
  const THEMES = {
    classic: { texture: "url(./images/galaxy-1.jpg)", accent: "#d100d1", track: "#7d3c98" },
    crimson: { hue: 335, accent: "#ff3366", track: "#8b0000" },
    emerald: { hue: 150, accent: "#22dd88", track: "#0b6640" },
    violet:  { hue: 265, accent: "#8855ff", track: "#3b1a8a" },
  };
  const textureCache = {};

  // Tiny seeded PRNG (mulberry32) — same theme always looks the same
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeNebulaTexture(seed, hue) {
    const size = 1024;
    const oc = document.createElement("canvas");
    oc.width = oc.height = size;
    const ox = oc.getContext("2d");
    const rnd = mulberry32(seed);
    ox.fillStyle = "#000";
    ox.fillRect(0, 0, size, size);
    // Layered nebula clouds
    for (let i = 0; i < 28; i++) {
      const rx = rnd() * size, ry = rnd() * size;
      const r = 60 + rnd() * 340;
      const h = hue + (rnd() - 0.5) * 70;
      const l = 45 + rnd() * 15;
      const a = 0.04 + rnd() * 0.10;
      const g = ox.createRadialGradient(rx, ry, 0, rx, ry, r);
      g.addColorStop(0, "hsla(" + h + ",75%," + l + "%," + a + ")");
      g.addColorStop(1, "transparent");
      ox.fillStyle = g;
      ox.fillRect(0, 0, size, size);
    }
    // Stars
    for (let i = 0; i < 700; i++) {
      const sx = rnd() * size, sy = rnd() * size;
      const sr = rnd() < 0.04 ? 1.5 : 0.7;
      const bright = rnd() < 0.04;
      ox.save();
      if (bright) { ox.shadowBlur = 6; ox.shadowColor = "white"; }
      ox.fillStyle = "rgba(255,255,255," + (0.5 + rnd() * 0.5) + ")";
      ox.beginPath();
      ox.arc(sx, sy, sr, 0, Math.PI * 2);
      ox.fill();
      ox.restore();
    }
    return oc.toDataURL("image/jpeg", 0.85);
  }

  function applyTheme(id) {
    const theme = THEMES[id];
    if (!theme) return;
    let tex = theme.texture;
    if (!tex) {
      if (!textureCache[id]) textureCache[id] = "url(" + makeNebulaTexture(id.charCodeAt(0) * 31, theme.hue) + ")";
      tex = textureCache[id];
    }
    const root = document.documentElement;
    root.style.setProperty("--wall-texture", tex);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--track", theme.track);
    Starfield.setTint(theme.accent);
    localStorage.setItem("nebula.theme", id);
  }

  const themeSelect = document.getElementById("theme");
  themeSelect.addEventListener("change", function () { applyTheme(this.value); });

  // Restore saved theme (textures are generated lazily so it's instant)
  const savedTheme = localStorage.getItem("nebula.theme");
  if (savedTheme && THEMES[savedTheme]) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }

  setSpeed(parseFloat(speedRange.value));
});
