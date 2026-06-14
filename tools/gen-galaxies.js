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

// ridged fractal — sharp filament-like structures (nebula tendrils)
function ridged(hash, x, y, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    let v = valueNoise(hash, x * freq, y * freq);
    v = 1 - Math.abs(2 * v - 1);
    sum += amp * v * v;
    norm += amp;
    amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

function renderNebula(seed, palette) {
  const buf = new Float64Array(SIZE * SIZE * 3);
  const hA = makeHash(seed);        // warp field 1
  const hB = makeHash(seed + 131);  // warp field 2
  const hC = makeHash(seed + 263);  // density / filaments
  const hM = makeHash(seed + 397);  // big-scale mask
  const hD = makeHash(seed + 521);  // dust
  const hot = palette[palette.length - 1];
  const scale = 2.7 / SIZE;

  // a central nebula body so every seed frames a main mass
  const fr = makeHash(seed + 777);
  const fcx = (0.32 + fr(1, 2) * 0.36) * SIZE;
  const fcy = (0.32 + fr(3, 4) * 0.36) * SIZE;
  const frad = SIZE * (0.42 + fr(5, 6) * 0.22);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 3;
      const nx = x * scale, ny = y * scale;

      // domain warping: push the sample point through two noise fields so the
      // clouds swirl into organic filaments instead of round blobs
      const qx = fractal(hA, nx, ny, 4);
      const qy = fractal(hA, nx + 5.2, ny + 1.3, 4);
      const rx = fractal(hB, nx + 4 * qx + 1.7, ny + 4 * qy + 9.2, 4);
      const ry = fractal(hB, nx + 4 * qx + 8.3, ny + 4 * qy + 2.8, 4);
      const wx = nx + 4 * rx, wy = ny + 4 * ry;

      // central body (framing) unioned with a low-floor large-scale mask: a
      // guaranteed main mass, but real dark voids toward the edges
      const fdx = x - fcx, fdy = y - fcy;
      const frame = Math.exp(-(fdx * fdx + fdy * fdy) / (2 * frad * frad));
      const mVoid = smooth(Math.max(0, (fractal(hM, nx * 0.5 + 11, ny * 0.5 + 7, 3) - 0.35) / 0.5));
      const m = Math.max(mVoid, frame * 0.8);

      let d = Math.pow(Math.max(0, fractal(hC, wx, wy, 5)), 2.4) * m;

      // dust lanes carve deep dark channels through the cloud
      const dl = fractal(hD, nx * 1.5 + 40, ny * 1.5 + 40, 4);
      d *= 0.12 + 0.88 * smooth(Math.max(0, (dl - 0.35) / 0.65));

      // bright filaments riding the warped field
      const fil = ridged(hC, wx, wy, 4);
      const I = d * 1.7 + fil * fil * d * 3.6;

      // color drifts with the warp + density
      const col = rampColor(palette, 0.3 + ry * 0.5 + d * 0.5);
      let r = col[0] * I, g = col[1] * I, b = col[2] * I;

      // hot bloom only in the densest knots
      const glow = Math.max(0, I - 1.3) * 0.6;
      r += hot[0] * glow; g += hot[1] * glow; b += hot[2] * glow;

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
  crimson: P([[60, 5, 18], [190, 30, 80], [255, 95, 150]]),
  emerald: P([[5, 40, 30], [28, 150, 105], [140, 240, 180]]),
  violet:  P([[22, 10, 55], [95, 50, 185], [170, 130, 255]]),
  ember:   P([[55, 18, 5], [200, 85, 22], [255, 180, 80]]),
  ice:     P([[8, 32, 65], [45, 140, 205], [175, 230, 255]]),
  rose:    P([[60, 12, 48], [210, 60, 150], [255, 155, 215]]),
  gold:    P([[48, 32, 4], [180, 130, 30], [255, 220, 110]]),
  abyss:   P([[5, 16, 55], [25, 85, 165], [100, 165, 240]]),
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
