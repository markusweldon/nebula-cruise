# Nebula Cruise — Session Handoff

> Written so a fresh session (ideally one with a **real browser + internet**) can pick up
> immediately and *see* the site instead of working blind. Start by reading this top to bottom.

## What this is
A zero-dependency, no-build static web toy: a CSS 3D "hyperspace tunnel" wrapped in a
canvas warp-streak starfield, a synthesized spacecraft engine, and a swappable galaxy
backdrop picker. Just open `index.html`.

- **Live:** https://nebula-cruise.vercel.app (auto-deploys from `main` on Vercel)
- **Repo:** `markusweldon/nebula-cruise`
- **Default branch:** `main` (this is what deploys; commit as **Markus Weldon**, no Claude attribution)
- **Run locally:** `python3 -m http.server 8000` then open the page (or just open `index.html`).

## File map
| File | Role |
|------|------|
| `index.html` | Markup: 3D scene, controls bar, engage overlay, add-galaxy panel |
| `styles.css` | 3D tunnel + keyframes, UI, add-galaxy/Discover panel styles |
| `starfield.js` | `window.Starfield` — canvas warp-streak layer (rAF loop) |
| `audio.js` | `window.EngineAudio` — procedural engine roar + `jump()` whoosh |
| `galaxies.js` | `window.GALAXIES` — built-in galaxy catalog (data-driven picker) |
| `script.js` | Controller: speed, tunnel rate, themes, add-your-own, NASA gallery, keyboard |
| `tools/gen-galaxies.js` | Build-time Node nebula generator (writes PNGs via built-in zlib) |
| `images/` | `galaxy-1.jpg` (real photo, by **sololos**) + 8 generated `galaxy-*.png` |

## Features built this session
- Fixed the original loop-seam dim-pulse bug; all animation driven by one `--duration` var,
  then switched speed control to Web Animations API `playbackRate` for smooth ramping.
- Repo hygiene: `LICENSE` (MIT), `.gitignore`, favicon, OG/Twitter meta, sololos credit.
- "ENGAGE HYPERDRIVE" start overlay (also the audio-unlock gesture), reduced-motion support,
  controls bar, keyboard (↑↓ speed, M sound, F fullscreen), fullscreen, tab-hidden pause.
- Canvas warp-streak starfield over the tunnel (`starfield.js`).
- Procedural engine (`audio.js`): brown-noise roar + sub-bass + turbine whine that scale with
  speed, plus a one-shot hyperspace **jump whoosh** fired when the slider crosses ~warp 25
  (hysteresis re-arm below 20).
- Galaxies: 9 built-ins (classic photo + 8 generated). Generator reworked to use domain
  warping + ridged noise (organic filaments, dark voids) instead of blobs.
- **Data-driven galaxy picker** built from `galaxies.js`.
- **Add your own galaxy** at runtime: by URL, by file (FileReader→data URL), persisted in
  `localStorage` (`nebula.galaxies`). `url()`-injection guarded; http(s) only.
- **NASA "Discover" gallery**: the ＋ panel searches `images-api.nasa.gov` (client-side, no
  key, public domain), shows a thumbnail grid + quick-pick chips, applies a pick as backdrop.

## ⚠️ KNOWN ISSUE #1 — mobile picker crash (TOP PRIORITY)
**Symptom (reported, with screen recording):** on the live site, opening the image/galaxy
picker "loads and crashes and refreshes the site" — i.e. the browser tab reloads. Seen on a
phone.

**Could not reproduce or fix this session** — this container has **no browser and no internet**
(see Environment below), so it's untested.

**Leading hypothesis:** mobile tab out-of-memory / renderer crash. The page already runs a
3D CSS scene (10 wall layers with large background images) + a rAF starfield + Web Audio;
opening the panel renders ~24 NASA thumbnails on top, and selecting an image previously loaded
the **full-resolution `~orig`** NASA asset (can be tens of MB) painted across all 10 walls.
Any of that can push a phone over its memory limit, and mobile browsers respond by reloading
the tab — which reads exactly as "crashes and refreshes."

**Mitigations applied this session (UNVERIFIED — confirm with a real browser):**
- `pickNasa()` in `script.js` now picks a *moderate* asset size (`~medium`/`~small`/`~large`),
  **never `~orig`**, to avoid the giant-image OOM.
- Added `type="button"` to every `<button>` (rules out any accidental form-submit reload).

**To confirm/fix next session (with a browser):**
1. Load the live site (or local), open DevTools console + device emulation (e.g. iPhone).
2. Engage, open the ＋ picker, watch for: a thrown JS error, a failed NASA `fetch` (CORS?),
   or a memory spike / `Page crashed` in the console.
3. If CORS: `images-api.nasa.gov` must return `Access-Control-Allow-Origin`. If it doesn't,
   the gallery's `fetch` rejects → handled by the `.catch` (shows a message), so that alone
   shouldn't reload — but verify.
4. If OOM: consider lazy-rendering thumbnails, fewer results, downscaling the chosen image to
   a `<canvas>` before use, or applying the backdrop to a single element instead of 10 walls.
5. Verify the two mitigations above actually helped.

## Environment limitations that blocked testing this session
- **No browser** installed (no chrome/chromium; Playwright lib present but **no browser binary**,
  and it can't download one — see next point).
- **No outbound internet** — `curl`/WebFetch return **403** for everything (example.com, NASA,
  Wikimedia). Egress is locked to the git/MCP proxies only.
- **Consequence:** the NASA gallery can't run here, and nothing visual/audio can be observed.
  Verification this session was limited to `node --check`, asset-path checks, and local
  static-serve 200s.

### To make the NEXT session able to *see* the site (do this first)
1. **Enable outbound internet** for the environment (network policy) — required for the NASA
   gallery to work and for installing a browser. See
   https://code.claude.com/docs/en/claude-code-on-the-web
2. **Install a headless browser** so Playwright (already in node_modules globally) can drive the
   page. A `.claude/` `SessionStart` hook running `npx playwright install chromium` would set it
   up automatically (only works once egress is enabled).
3. Then the agent can: serve locally, load the page in headless Chromium, screenshot it,
   reproduce the picker crash with the console open, and verify fixes before pushing.

## ⚠️ KNOWN ISSUE #2 — stale branch can't be deleted from here
`origin/claude/project-review-plan-lp59ev` still exists (old Claude-authored commits). Deleting
it is blocked in this environment: `git push --delete` → **HTTP 403**, and the GitHub MCP has no
ref-delete tool. **`main` itself is 100% clean of any Claude attribution.**
**Action for you:** delete it via GitHub → repo → Branches (trash icon), or
`git push origin --delete claude/project-review-plan-lp59ev` from your machine. That removes the
last Claude trace anywhere in the repo.

## Verification checklist (for the live site / next session)
- [ ] Engage → tunnel animates, starfield streaks over it, no console errors.
- [ ] Slider up = faster tunnel + longer streaks + deeper roar; ~warp 25 fires the jump whoosh.
- [ ] All 9 built-in galaxies retexture the walls and recolor slider/streaks; choice persists.
- [ ] ＋ panel: NASA grid loads, chips work, clicking a thumb applies it **without crashing**.
- [ ] Add by URL and by file both work and persist across reload.
- [ ] Mobile (real device or emulation): no tab crash/reload when opening the picker.
- [ ] Sound off by default; M toggles; F fullscreen; tab-hidden pauses.
