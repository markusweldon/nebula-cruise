// Build-time nebula generator. Zero dependencies — renders each galaxy into an
// RGB buffer and writes a PNG with Node's built-in zlib. NOT shipped to the
// browser; run manually: `node tools/gen-galaxies.js`.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 1024;
const OUT = path.join(__dirname, "..", "images");

// ── seeded value noise ────────────────────────────────────────────────────
function makeHash(seed) {
  return function (x, y) {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}
function smooth(t) {
  return t * t * (3 - 2 * t);
}
function valueNoise(hash, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash(xi, yi), tr = hash(xi + 1, yi);
  const bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  const top = tl + (tr - tl) * u;
  const bot = bl + (br - bl) * u;
  return top + (bot - top) * v;
}
function fractal(hash, x, y, octaves) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(hash, x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// mix across a palette of [r,g,b] (0..1) by t in [0,1]
function rampColor(palette, t) {
  t = Math.max(0, Math.min(0.9999, t)) * (palette.length - 1);
  const i = Math.floor(t), f = t - i;
  const a = palette[i], b = palette[i + 1] || palette[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function renderNebula(seed, palette) {
  const buf = new Float64Array(SIZE * SIZE * 3);
  const cloud = makeHash(seed);
  const mask = makeHash(seed + 101);
  const tint = makeHash(seed + 202);
  const dust = makeHash(seed + 303);
  const scale = 3.2 / SIZE;

  // glow cores — kept small so they're bright knots, not a frame-filling haze
  const cores = [];
  const crnd = makeHash(seed + 404);
  const nCores = 2 + Math.floor(crnd(7, 7) * 2);
  for (let i = 0; i < nCores; i++) {
    cores.push({
      x: crnd(i, 1) * SIZE, y: crnd(i, 2) * SIZE,
      r: SIZE * (0.04 + crnd(i, 3) * 0.07),
      b: 0.45 + crnd(i, 4) * 0.5,
    });
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 3;
      // large-scale where-the-nebula-lives mask — hard threshold leaves real voids
      let m = fractal(mask, x * scale * 0.5, y * scale * 0.5, 3);
      m = smooth(Math.max(0, (m - 0.5) / 0.4));
      let d = fractal(cloud, x * scale, y * scale, 5);
      d = Math.pow(d, 2.6) * m;

      // dark dust lanes carve the clouds
      const dl = fractal(dust, x * scale * 1.7 + 50, y * scale * 1.7 + 50, 4);
      d *= 0.3 + 0.7 * smooth(Math.max(0, (dl - 0.3) / 0.7));

      // color shifts across the cloud
      const cv = fractal(tint, x * scale * 0.8, y * scale * 0.8, 2);
      const col = rampColor(palette, cv * 0.6 + d * 0.4);

      let r = col[0] * d * 3.0, g = col[1] * d * 3.0, b = col[2] * d * 3.0;

      // glow cores add bright bloom in the brightest palette color
      const hot = palette[palette.length - 1];
      for (const c of cores) {
        const dx = x - c.x, dy = y - c.y;
        const g2 = Math.exp(-(dx * dx + dy * dy) / (2 * c.r * c.r)) * c.b;
        r += hot[0] * g2; g += hot[1] * g2; b += hot[2] * g2;
      }

      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b;
    }
  }

  // stars
  const srnd = makeHash(seed + 909);
  const tempCols = [[1, 1, 1], [0.7, 0.8, 1], [1, 0.85, 0.6]];
  const nStars = 1400;
  for (let i = 0; i < nStars; i++) {
    const sx = srnd(i, 11) * SIZE, sy = srnd(i, 12) * SIZE;
    const bright = srnd(i, 13) < 0.04;
    const mag = bright ? 0.9 + srnd(i, 14) * 0.6 : 0.25 + srnd(i, 15) * 0.4;
    const rad = bright ? 1.6 + srnd(i, 16) * 1.8 : 0.7;
    const tc = tempCols[Math.floor(srnd(i, 17) * 3)];
    const ir = Math.ceil(rad * 2);
    for (let oy = -ir; oy <= ir; oy++) {
      for (let ox = -ir; ox <= ir; ox++) {
        const px = Math.round(sx) + ox, py = Math.round(sy) + oy;
        if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
        const fall = Math.exp(-(ox * ox + oy * oy) / (2 * rad * rad)) * mag;
        const idx = (py * SIZE + px) * 3;
        buf[idx] += tc[0] * fall; buf[idx + 1] += tc[1] * fall; buf[idx + 2] += tc[2] * fall;
      }
    }
  }

  // tone-map on luminance only (preserves saturation) + gamma → 8-bit RGB
  const out = Buffer.alloc(SIZE * SIZE * 3);
  for (let i = 0; i < buf.length; i += 3) {
    let r = buf[i], g = buf[i + 1], b = buf[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 0) {
      const s = lum / (1 + lum) / lum; // Reinhard scale applied uniformly to RGB
      r *= s; g *= s; b *= s;
    }
    out[i]     = Math.max(0, Math.min(255, Math.round((Math.pow(r, 1 / 1.9) * 0.98 + 0.006) * 255)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round((Math.pow(g, 1 / 1.9) * 0.98 + 0.006) * 255)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round((Math.pow(b, 1 / 1.9) * 0.98 + 0.008) * 255)));
  }
  return out;
}

// ── minimal PNG encoder (RGB, 8-bit) ──────────────────────────────────────
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // filter byte 0 per scanline
  const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 3 + 1)] = 0;
    rgb.copy(raw, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ── themes ────────────────────────────────────────────────────────────────
const P = (a) => a.map((c) => c.map((v) => v / 255));
const THEMES = {
  crimson: P([[120, 10, 30], [200, 30, 80], [255, 90, 150]]),
  emerald: P([[10, 70, 55], [30, 160, 110], [130, 235, 175]]),
  violet:  P([[40, 20, 90], [95, 50, 185], [165, 125, 255]]),
  ember:   P([[100, 35, 10], [205, 95, 25], [255, 175, 70]]),
  ice:     P([[20, 60, 110], [45, 145, 205], [160, 225, 255]]),
  rose:    P([[110, 25, 85], [215, 65, 155], [255, 150, 215]]),
  gold:    P([[105, 75, 10], [205, 155, 35], [255, 225, 100]]),
  abyss:   P([[10, 30, 90], [25, 85, 165], [90, 155, 235]]),
};

let seed = 1337;
for (const id of Object.keys(THEMES)) {
  process.stdout.write("rendering " + id + " ... ");
  const rgb = renderNebula(seed, THEMES[id]);
  const png = encodePNG(rgb);
  const file = path.join(OUT, "galaxy-" + id + ".png");
  fs.writeFileSync(file, png);
  console.log((png.length / 1024).toFixed(0) + " KB");
  seed += 17;
}
console.log("done");
