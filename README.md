# 🚀 Nebula Cruise

Dive into the vastness of space with Nebula Cruise — an immersive hyperspace-jump journey through the cosmos. Take the captain's seat, throttle up, and watch the galaxy streak past.

🛰️ **Live demo:** https://nebula-cruise.vercel.app

![Nebula Cruise](./images/nebula-cruise-screenshot.jpg)

## ⚠️ Warning

If you have a history of epilepsy, light sensitivity, or motion sickness, please be cautious. The animation contains fast-moving, flashing visuals. Nebula Cruise starts paused behind a "press to engage" screen and honours your system's reduced-motion setting — but always view in a safe environment.

## 🌌 What it is

A zero-dependency, static web toy: a CSS 3D "hyperspace tunnel" wrapped in a canvas warp-streak starfield, with a synthesized spacecraft engine and swappable galaxy backdrops. No build step, no frameworks — just open `index.html`.

## 🚀 Features

- 🌀 3D CSS hyperspace tunnel with a seamless, speed-scaled loop
- ✨ Canvas **warp-streak starfield** — gentle dots at low warp, full light-lines at high warp
- 🔊 **Procedural engine** (Web Audio): a deep roar that scales with speed, plus a **hyperspace jump whoosh** when you punch past lightspeed
- 🎨 **Galaxy picker** — 9 built-in backdrops, *plus add your own* (see below)
- 🎛️ Speed via slider, keyboard, or just drift at the default
- 📱 Mobile-friendly, fullscreen, and `prefers-reduced-motion` aware
- ⏸️ Pauses itself when the tab is hidden

## 🔧 How to use

1. Press **ENGAGE HYPERDRIVE** to launch.
2. Drag the **speed slider** (or use ↑ / ↓) to set your warp. Cross ~warp 25 to trigger the jump whoosh.
3. Pick a **galaxy** from the dropdown, or hit **＋** to add your own.
4. Toggle **🔊** sound and **⛶** fullscreen to taste.

### ⌨️ Keyboard shortcuts

| Key | Action |
|-----|--------|
| ↑ / → | Speed up |
| ↓ / ← | Slow down |
| M | Toggle sound |
| F | Toggle fullscreen |

## 🌠 Bring your own galaxy

Any square-ish image works as a backdrop. There are several ways to add one, from easiest to most permanent:

**0. Discover from NASA (no install, instant)** — Click **＋** and the panel searches NASA's public-domain image library right in your browser. Browse the thumbnail grid (try the Nebula / Galaxy / Hubble / Webb chips) and click one to set it as your backdrop. No API key, nothing uploaded — your browser talks to NASA directly.

**1. By URL (no install, instant)** — Click **＋**, paste a direct link to an image (`https://…/something.jpg`), and hit *Add by URL / file*. It loads on the spot and is remembered in your browser.

**2. From your device (no install, instant)** — Click **＋**, *Choose a file*, pick an image. Same deal — instant, and saved locally to your browser.

> Galaxies you add by URL or file live only in *your* browser's `localStorage`. They aren't uploaded anywhere and don't change the site for anyone else.

**3. Permanently, for everyone (a quick PR)** — Make it a built-in:
1. Drop your image into `images/`.
2. Add one line to [`galaxies.js`](./galaxies.js):
   ```js
   { id: "my-galaxy", name: "My Galaxy", texture: "./images/my-galaxy.jpg", accent: "#33ccff", track: "#16607a" },
   ```
   `accent` tints the slider and warp streaks; `track` is the slider track colour.
3. Open a pull request. The dropdown is built from this file, so it shows up automatically.

### 🎨 Generating procedural galaxies

The non-photo built-ins are generated, not sourced. Run the zero-dependency renderer (Node only, no packages) to regenerate or tweak them:

```sh
node tools/gen-galaxies.js
```

It paints domain-warped nebula clouds with ridged filaments and a star field, and writes PNGs straight to `images/` using Node's built-in `zlib`. Edit the palette table at the bottom of the script to add your own colourways.

## 🗂️ Project layout

| File | Role |
|------|------|
| `index.html` | Markup: scene, controls, overlays |
| `styles.css` | 3D tunnel, animations, UI |
| `starfield.js` | Canvas warp-streak layer |
| `audio.js` | Procedural engine + jump whoosh |
| `galaxies.js` | Galaxy catalog (edit to add built-ins) |
| `script.js` | Controller: speed, themes, add-your-own, keyboard |
| `tools/gen-galaxies.js` | Build-time procedural nebula generator |

## 🙌 Credits

- 🌌 Classic galaxy texture ("Blue and purple space galaxy") by **sololos**

## 📜 License

Open source under the [MIT License](LICENSE).
