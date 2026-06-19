// Galaxy catalog — the one place to add a built-in galaxy.
//
// To add your own permanently: drop an image into images/ and add an entry
// below (give it a unique id). accent/track are the UI colours that ride along
// with it (slider + warp-streak tint). Then open a pull request.
//
// Prefer not to touch code? Just hit the ＋ button in the app to load any image
// by URL or from your device — no edits required.
window.GALAXIES = [
  { id: "classic", name: "Classic Galaxy", texture: "./images/galaxy-1.jpg",       accent: "#d100d1", track: "#7d3c98" },
  { id: "crimson", name: "Crimson Rift",   texture: "./images/galaxy-crimson.png", accent: "#ff3366", track: "#8b0000" },
  { id: "rose",    name: "Rose Nebula",    texture: "./images/galaxy-rose.png",    accent: "#ff66cc", track: "#7a2a5e" },
  { id: "ember",   name: "Solar Ember",    texture: "./images/galaxy-ember.png",   accent: "#ff8c1a", track: "#7a3b08" },
  { id: "gold",    name: "Goldforge",      texture: "./images/galaxy-gold.png",    accent: "#ffcc33", track: "#7a5e10" },
  { id: "emerald", name: "Emerald Drift",  texture: "./images/galaxy-emerald.png", accent: "#22dd88", track: "#0b6640" },
  { id: "ice",     name: "Ice Veil",       texture: "./images/galaxy-ice.png",     accent: "#33ccff", track: "#16607a" },
  { id: "abyss",   name: "Abyssal Blue",   texture: "./images/galaxy-abyss.png",   accent: "#2266ff", track: "#13357a" },
  { id: "violet",  name: "Event Horizon",  texture: "./images/galaxy-violet.png",  accent: "#8855ff", track: "#3b1a8a" },
];
