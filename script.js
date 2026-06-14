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

  // Hyperspace jump: whoosh once when you push up past lightspeed, re-arm on slow-down
  const JUMP_SPEED = 25;
  const JUMP_REARM = 20;
  let jumpArmed = true;

  function setSpeed(value) {
    speed = Math.min(30, Math.max(1, value));
    speedRange.value = speed;
    speedLabel.textContent = "Hyperspace Speed — Warp " + speed.toFixed(1);
    speedRange.setAttribute("aria-valuetext", "warp " + speed.toFixed(1));
    setTunnelRate();
    Starfield.setSpeed(gentleDrift ? 0.2 : speed);
    EngineAudio.setSpeed(gentleDrift ? 1 : speed);

    if (soundOn && document.body.classList.contains("engaged")) {
      if (jumpArmed && speed >= JUMP_SPEED) { EngineAudio.jump(); jumpArmed = false; }
      else if (!jumpArmed && speed < JUMP_REARM) { jumpArmed = true; }
    }
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
  // Textures are pre-baked image files (see tools/gen-galaxies.js for the
  // procedural nebulae; classic is the original photo).
  const THEMES = {
    classic: { texture: "./images/galaxy-1.jpg",       accent: "#d100d1", track: "#7d3c98" },
    crimson: { texture: "./images/galaxy-crimson.png", accent: "#ff3366", track: "#8b0000" },
    emerald: { texture: "./images/galaxy-emerald.png", accent: "#22dd88", track: "#0b6640" },
    violet:  { texture: "./images/galaxy-violet.png",  accent: "#8855ff", track: "#3b1a8a" },
    ember:   { texture: "./images/galaxy-ember.png",   accent: "#ff8c1a", track: "#7a3b08" },
    ice:     { texture: "./images/galaxy-ice.png",     accent: "#33ccff", track: "#16607a" },
    rose:    { texture: "./images/galaxy-rose.png",    accent: "#ff66cc", track: "#7a2a5e" },
    gold:    { texture: "./images/galaxy-gold.png",    accent: "#ffcc33", track: "#7a5e10" },
    abyss:   { texture: "./images/galaxy-abyss.png",   accent: "#2266ff", track: "#13357a" },
  };

  function applyTheme(id) {
    const theme = THEMES[id];
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--wall-texture", "url(" + theme.texture + ")");
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--track", theme.track);
    Starfield.setTint(theme.accent);
    localStorage.setItem("nebula.theme", id);
  }

  const themeSelect = document.getElementById("theme");
  themeSelect.addEventListener("change", function () { applyTheme(this.value); });

  // Restore saved theme
  const savedTheme = localStorage.getItem("nebula.theme");
  if (savedTheme && THEMES[savedTheme]) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }

  setSpeed(parseFloat(speedRange.value));
});
