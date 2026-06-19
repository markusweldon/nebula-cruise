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
    if (document.hidden || document.body.classList.contains("picking")) {
      Starfield.stop();
      EngineAudio.suspend();
    } else {
      Starfield.start();
      EngineAudio.resume();
    }
  });

  // ── Galaxies ──────────────────────────────────────────────────────────────
  // Built-ins come from galaxies.js (window.GALAXIES). Users can also add their
  // own at runtime by URL or file; those persist in this browser's localStorage.
  const DEFAULT_ACCENT = "#d100d1", DEFAULT_TRACK = "#7d3c98";
  const galaxies = {};   // id -> galaxy
  const order = [];      // ids in display order

  function registerGalaxy(g) {
    if (!galaxies[g.id]) order.push(g.id);
    galaxies[g.id] = g;
  }
  (window.GALAXIES || []).forEach(registerGalaxy);

  // galaxies the user added on a previous visit
  let customGalaxies = [];
  try { customGalaxies = JSON.parse(localStorage.getItem("nebula.galaxies") || "[]"); } catch (e) {}
  customGalaxies.forEach(registerGalaxy);

  const themeSelect = document.getElementById("theme");
  function rebuildOptions() {
    themeSelect.innerHTML = "";
    order.forEach(function (id) {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = galaxies[id].name;
      themeSelect.appendChild(o);
    });
  }
  rebuildOptions();

  function applyTheme(id) {
    const g = galaxies[id];
    if (!g) return;
    const root = document.documentElement;
    root.style.setProperty("--wall-texture", 'url("' + g.texture + '")');
    root.style.setProperty("--accent", g.accent || DEFAULT_ACCENT);
    root.style.setProperty("--track", g.track || DEFAULT_TRACK);
    Starfield.setTint(g.accent || DEFAULT_ACCENT);
    themeSelect.value = id;
    localStorage.setItem("nebula.theme", id);
  }
  themeSelect.addEventListener("change", function () { applyTheme(this.value); });

  // ── Add-your-own-galaxy panel (URL or file) ──
  const addPanel = document.getElementById("addGalaxy");
  const gxUrl = document.getElementById("gxUrl");
  const gxFile = document.getElementById("gxFile");
  const gxErr = document.getElementById("gxErr");
  const showErr = function (msg) { gxErr.textContent = msg; gxErr.hidden = false; };

  // Opening the picker frees the 3D scene + starfield (see .picking in CSS) and
  // halts their loops, so the NASA gallery doesn't decode on top of the full
  // hyperspace render and crash a memory-constrained phone. Closing restores it.
  function openPicker() {
    gxErr.hidden = true; gxUrl.value = ""; gxFile.value = "";
    document.body.classList.add("picking");
    Starfield.stop();
    EngineAudio.suspend();
    addPanel.hidden = false;
    if (!gxResults.childElementCount) nasaSearch("nebula");
    gxSearch.focus();
  }
  function closePicker() {
    addPanel.hidden = true;
    document.body.classList.remove("picking");
    if (!document.hidden && document.body.classList.contains("engaged")) {
      Starfield.start();
      EngineAudio.resume();
    }
  }

  document.getElementById("addGalaxyBtn").addEventListener("click", openPicker);
  document.getElementById("gxCancel").addEventListener("click", closePicker);

  // Only http(s) image URLs, and nothing that could break out of url("…")
  function safeImageUrl(raw) {
    let u;
    try { u = new URL(raw, location.href); } catch (e) { return null; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (/["')\\]/.test(u.href)) return null;
    return u.href;
  }

  function addCustomGalaxy(texture, label) {
    const g = { id: "custom-" + Date.now(), name: label || "My Galaxy", texture: texture,
                accent: DEFAULT_ACCENT, track: DEFAULT_TRACK };
    registerGalaxy(g);
    rebuildOptions();
    applyTheme(g.id);
    customGalaxies.push(g);
    try { localStorage.setItem("nebula.galaxies", JSON.stringify(customGalaxies)); }
    catch (e) { /* over quota (big data URL) — keep it for this session only */ }
    closePicker();
  }

  document.getElementById("gxApply").addEventListener("click", function () {
    gxErr.hidden = true;
    if (gxFile.files && gxFile.files[0]) {
      const file = gxFile.files[0];
      const reader = new FileReader();
      reader.onload = function () { addCustomGalaxy(reader.result, file.name.replace(/\.[^.]+$/, "")); };
      reader.onerror = function () { showErr("Couldn't read that file."); };
      reader.readAsDataURL(file);
      return;
    }
    const url = safeImageUrl(gxUrl.value.trim());
    if (!url) { showErr("Enter a valid http(s) image URL, or choose a file."); return; }
    const img = new Image();
    img.onload = function () { addCustomGalaxy(url, "My Galaxy"); };
    img.onerror = function () { showErr("That image wouldn't load — check the URL points straight at an image."); };
    img.src = url;
  });

  // ── NASA "Discover" gallery — runs in the visitor's browser; public-domain ──
  const gxSearch = document.getElementById("gxSearch");
  const gxResults = document.getElementById("gxResults");
  const gxPager = document.getElementById("gxPager");
  const gxPrev = document.getElementById("gxPrev");
  const gxNext = document.getElementById("gxNext");
  const gxPageNum = document.getElementById("gxPageNum");
  const gxScroller = addPanel.querySelector(".addgx-card");
  const gxStatus = function (msg) { gxResults.innerHTML = '<p class="gx-status">' + msg + "</p>"; };

  // One NASA "page" == one grid of thumbnails. PAGE_SIZE also caps how many
  // images decode at once, which is what protects a phone's memory budget.
  const PAGE_SIZE = 12;
  let nasaQuery = "", nasaPage = 1, nasaTotalHits = 0;

  function nasaSearch(q, page) {
    if (!q) return;
    nasaQuery = q;
    nasaPage = page || 1;
    gxSearch.value = q;
    gxPager.hidden = true;
    gxStatus("Searching NASA…");
    fetch("https://images-api.nasa.gov/search?media_type=image&page_size=" + PAGE_SIZE +
          "&page=" + nasaPage + "&q=" + encodeURIComponent(q))
      .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
      .then(function (data) {
        const coll = data.collection || {};
        nasaTotalHits = (coll.metadata && coll.metadata.total_hits) || 0;
        renderResults(coll.items || []);
      })
      .catch(function () { gxStatus("Couldn't reach NASA right now — you can still add by URL or file below."); });
  }

  function renderResults(items) {
    gxResults.innerHTML = "";
    let shown = 0;
    items.forEach(function (it) {
      const link = it.links && it.links[0] && it.links[0].href;
      const meta = it.data && it.data[0];
      if (!link || !meta) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gx-thumb";
      btn.title = meta.title || "";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = meta.title || "galaxy";
      img.src = link;
      btn.appendChild(img);
      btn.addEventListener("click", function () { pickNasa(meta.nasa_id, link, meta.title); });
      gxResults.appendChild(btn);
      shown++;
    });
    if (!shown && nasaPage === 1) gxStatus("No images found — try another search.");
    updatePager(shown);
  }

  function updatePager(shown) {
    const hasPrev = nasaPage > 1;
    const hasNext = nasaTotalHits ? nasaPage * PAGE_SIZE < nasaTotalHits : shown === PAGE_SIZE;
    if (!hasPrev && !hasNext) { gxPager.hidden = true; return; }
    gxPager.hidden = false;
    gxPrev.disabled = !hasPrev;
    gxNext.disabled = !hasNext;
    gxPageNum.textContent = nasaTotalHits
      ? "Page " + nasaPage + " / " + Math.ceil(nasaTotalHits / PAGE_SIZE)
      : "Page " + nasaPage;
  }

  function gotoNasaPage(page) {
    if (page < 1) return;
    if (gxScroller) gxScroller.scrollTop = 0; // show the new grid from the top
    nasaSearch(nasaQuery, page);
  }
  gxPrev.addEventListener("click", function () { gotoNasaPage(nasaPage - 1); });
  gxNext.addEventListener("click", function () { gotoNasaPage(nasaPage + 1); });

  function pickNasa(id, thumb, title) {
    // fetch the asset manifest and pick a *moderate* size — never ~orig, which
    // can be tens of MB and crash a phone when painted across 10 wall layers
    fetch("https://images-api.nasa.gov/asset/" + encodeURIComponent(id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        const hrefs = ((data && data.collection && data.collection.items) || [])
          .map(function (i) { return i.href; })
          .filter(function (h) { return /\.(jpe?g|png)$/i.test(h); });
        const bySize = function (tag) {
          return hrefs.filter(function (h) { return new RegExp("~" + tag + "\\.", "i").test(h); })[0];
        };
        const best = bySize("medium") || bySize("small") || bySize("large") || thumb;
        applyNasa(best, thumb, title);
      })
      .catch(function () { applyNasa(thumb, thumb, title); });
  }

  function applyNasa(url, thumb, title) {
    const https = function (u) { return safeImageUrl((u || "").replace(/^http:\/\//i, "https://")); };
    const safe = https(url) || https(thumb);
    if (!safe) { showErr("That NASA image couldn't be used — try another."); return; }
    addCustomGalaxy(safe, title || "NASA Galaxy");
  }

  document.getElementById("gxSearchBtn").addEventListener("click", function () { nasaSearch(gxSearch.value.trim()); });
  gxSearch.addEventListener("keydown", function (e) { if (e.key === "Enter") nasaSearch(gxSearch.value.trim()); });
  Array.prototype.forEach.call(document.querySelectorAll(".gx-chip"), function (chip) {
    chip.addEventListener("click", function () { nasaSearch(chip.getAttribute("data-q")); });
  });

  // Restore saved selection
  const savedTheme = localStorage.getItem("nebula.theme");
  if (savedTheme && galaxies[savedTheme]) applyTheme(savedTheme);

  setSpeed(parseFloat(speedRange.value));
});
