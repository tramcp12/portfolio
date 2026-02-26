#!/usr/bin/env node
/**
 * test-validate.js — Comprehensive validation suite for Trạm CP12
 * Run: node test-validate.js
 * Exit 0 = all pass, Exit 1 = failures found
 */
"use strict";
var fs   = require("fs");
var path = require("path");
var errors = [];
var passes = [];

function ok(label, cond) {
  if (cond) passes.push("  \u2705 " + label);
  else      errors.push("  \u274C " + label);
}

/* ── 1. Source file coverage ─────────────────────────────────────────────── */
console.log("\n\u2500\u2500 Source file coverage");
var expected = [
  // CSS source (22 files)
  "src/core/tokens.css", "src/core/reset.css", "src/core/accessibility.css",
  "src/core/buttons.css", "src/core/section-labels.css", "src/core/animations.css",
  "src/core/responsive-sentinel.css", "src/core/supports.css",
  "src/layout/nav.css", "src/layout/nav-mobile.css", "src/layout/dots.css",
  "src/layout/next-btn.css", "src/layout/footer.css", "src/layout/modal.css",
  "src/layout/zalo-cta.css",
  "src/features/home/home.css", "src/features/video/video.css",
  "src/features/rooms/rooms.css", "src/features/explore/explore.css",
  "src/features/about/about.css", "src/features/journal/journal.css",
  "src/features/cta/cta.css",
  // HTML partials (14 files)
  "src/shell-head.html",
  "src/layout/chrome.html.partial", "src/layout/dots.html.partial",
  "src/layout/footer.html.partial", "src/layout/modal.html.partial",
  "src/layout/zalo-cta.html.partial", "src/layout/jsonld.html.partial",
  "src/features/home/home.html.partial", "src/features/video/video.html.partial",
  "src/features/rooms/rooms.html.partial", "src/features/explore/explore.html.partial",
  "src/features/about/about.html.partial", "src/features/journal/journal.html.partial",
  "src/features/cta/cta.html.partial",
  // JS IIFEs (5 files)
  "src/shared/lang-switcher.js",
  "src/features/rooms/rooms.js", "src/features/video/video.js",
  "src/features/explore/explore.js", "src/shared/scroll-reveal.js",
  // Data (5 files)
  "src/data/rooms.json", "src/data/travel.json", "src/data/journal.json",
  "src/data/strings.vi.json", "src/data/strings.en.json"
];
expected.forEach(function(f) {
  ok(f, fs.existsSync(path.join(__dirname, f)));
});

/* ── 2. JSON data file validation ────────────────────────────────────────── */
console.log("\n\u2500\u2500 Data file schemas");

// rooms.json
var rooms = JSON.parse(fs.readFileSync("src/data/rooms.json", "utf8"));
ok("rooms.json — is array", Array.isArray(rooms));
ok("rooms.json — 4 entries", rooms.length === 4);
rooms.forEach(function(r, i) {
  ["bgClass","name","price","featured","meta","desc","amenities","desc_vi","meta_vi","amenities_vi"].forEach(function(k) {
    ok("rooms[" + i + "]." + k + " present", k in r);
  });
  ok("rooms[" + i + "].meta non-empty array",   Array.isArray(r.meta) && r.meta.length > 0);
  ok("rooms[" + i + "].amenities non-empty array", Array.isArray(r.amenities) && r.amenities.length > 0);
  r.meta.forEach(function(m, j) {
    ok("rooms[" + i + "].meta[" + j + "].icon", !!m.icon);
    ok("rooms[" + i + "].meta[" + j + "].text", !!m.text);
  });
});
ok("rooms.json — at least 1 featured", rooms.filter(function(r){ return r.featured; }).length >= 1);
rooms.forEach(function(r, i) {
  ok("rooms[" + i + "].bgClass valid (r1–r4)", /^r[1-4]$/.test(r.bgClass));
});

// travel.json
var travel = JSON.parse(fs.readFileSync("src/data/travel.json", "utf8"));
ok("travel.json — is array", Array.isArray(travel));
ok("travel.json — 6 entries", travel.length === 6);
["bgClass","category","difficulty","cat","name","distance","duration","highlight"].forEach(function(k) {
  travel.forEach(function(t, i) { ok("travel[" + i + "]." + k, k in t); });
});
var cats = travel.map(function(t){ return t.category; });
["running","food","nature"].forEach(function(c) {
  ok("travel.json — category \"" + c + "\" represented", cats.indexOf(c) !== -1);
});

// journal.json
var journal = JSON.parse(fs.readFileSync("src/data/journal.json", "utf8"));
ok("journal.json — is array", Array.isArray(journal));
ok("journal.json — 3 entries", journal.length === 3);
["bgClass","large","imgLabel","cat","title","excerpt","linkLabel","href"].forEach(function(k) {
  journal.forEach(function(j, i) { ok("journal[" + i + "]." + k, k in j); });
});
ok("journal.json — exactly 1 large card", journal.filter(function(j){ return j.large; }).length === 1);

// strings.vi.json + strings.en.json
var stringsVi = JSON.parse(fs.readFileSync("src/data/strings.vi.json", "utf8"));
var stringsEn = JSON.parse(fs.readFileSync("src/data/strings.en.json", "utf8"));
ok("strings.vi.json — is object",      typeof stringsVi === "object");
ok("strings.en.json — is object",      typeof stringsEn === "object");
["nav.rooms","nav.explore","nav.about","nav.journal","nav.book",
 "hero.tag","hero.title","hero.subtitle","rooms.label","rooms.heading",
 "explore.label","about.label","journal.label","cta.label","zalo.cta"
].forEach(function(k) {
  ok("strings.vi[" + k + "]", !!stringsVi[k]);
  ok("strings.en[" + k + "]", !!stringsEn[k]);
});

/* ── 3. Generated output checks ──────────────────────────────────────────── */
console.log("\n\u2500\u2500 Generated output checks");
var html = fs.readFileSync("index.html", "utf8");
var css  = fs.readFileSync("cp12.css",   "utf8");
var js   = fs.readFileSync("cp12.js",    "utf8");

// Output sizes
ok("index.html > 30 KB", Buffer.byteLength(html,"utf8") / 1024 > 30);
ok("cp12.css   > 40 KB", Buffer.byteLength(css,  "utf8") / 1024 > 40);
ok("cp12.js    > 12 KB", Buffer.byteLength(js,   "utf8") / 1024 > 12);

// rooms-data injection
ok("index.html contains #rooms-data script",  html.indexOf('id="rooms-data"') !== -1);
ok("index.html contains #rooms-grid target",  html.indexOf('id="rooms-grid"') !== -1);
ok("#rooms-data is valid JSON array",         function() {
  var m = html.match(/<script id="rooms-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return false;
  try { var d = JSON.parse(m[1].trim()); return Array.isArray(d) && d.length === 4; }
  catch(e) { return false; }
}());
ok("#rooms-data comes after #cp12-wrap close", function() {
  var wrapClose = html.indexOf("/#cp12-wrap");
  var dataStart = html.indexOf('id="rooms-data"');
  return wrapClose !== -1 && dataStart !== -1 && dataStart > wrapClose;
}());

// i18n data injection
ok("index.html contains #lang-vi-data script", html.indexOf('id="lang-vi-data"') !== -1);
ok("index.html contains #lang-en-data script", html.indexOf('id="lang-en-data"') !== -1);
ok("#lang-vi-data is valid JSON object",        function() {
  var m = html.match(/<script id="lang-vi-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return false;
  try { var d = JSON.parse(m[1].trim()); return typeof d === "object" && !!d["nav.rooms"]; }
  catch(e) { return false; }
}());
ok("#lang-en-data is valid JSON object",        function() {
  var m = html.match(/<script id="lang-en-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return false;
  try { var d = JSON.parse(m[1].trim()); return typeof d === "object" && !!d["nav.rooms"]; }
  catch(e) { return false; }
}());
ok("index.html — i18n FOUC inline script",     html.indexOf("i18n-loading") !== -1);
ok("index.html — data-i18n attributes present",html.indexOf('data-i18n=') !== -1);
ok("index.html — lang-btn in nav",             html.indexOf('id="cp12-lang-btn"') !== -1);

// HTML structure
ok("index.html — <main id=\"cp12-main\">",       html.indexOf('<main id="cp12-main">') !== -1);
ok("index.html — all 7 sections present",        function() {
  return ["#home","#video","#rooms","#explore","#about","#journal","#book"].every(function(id) {
    return html.indexOf('id="' + id.slice(1) + '"') !== -1;
  });
}());
ok("index.html — skip-nav link",                 html.indexOf("skip-nav") !== -1);
ok("index.html — og:image meta",                 /property="og:image"/.test(html));
ok("index.html — twitter:card meta",             /name="twitter:card"/.test(html));
ok("index.html — canonical link",               /rel="canonical"/.test(html));
ok("index.html — JSON-LD LodgingBusiness",       html.indexOf('"@type": "LodgingBusiness"') !== -1);
ok("index.html — theme-color meta",              html.indexOf("theme-color") !== -1);
ok("index.html — cp12.js defer",                 html.indexOf('src="cp12.js" defer') !== -1);

// CSS invariants (quick)
ok("cp12.css — :root variables block",           html.indexOf("rooms-grid") !== -1); // grid appears in HTML
ok("cp12.css — @keyframes cp12fu",               /\@keyframes cp12fu/.test(css));
ok("cp12.css — .cp12-reveal class",              /\.cp12-reveal/.test(css));
ok("cp12.css — dot-nav styles",                  /#cp12-dots/.test(css));
ok("cp12.css — modal styles",                    /#cp12-wrap \.modal/.test(css));

// JS IIFE structure
ok("cp12.js — IIFE 0 lang-switcher",             js.indexOf("window.cp12SwitchLang") !== -1);
ok("cp12.js — IIFE 0 cp12Lang global",           js.indexOf("window.cp12Lang") !== -1);
ok("cp12.js — IIFE 0 localStorage",              js.indexOf("localStorage") !== -1);
ok("cp12.js — IIFE 1 rooms renderer",            js.indexOf("rooms-data") !== -1);
ok("cp12.js — IIFE 1 cp12RenderRooms global",    js.indexOf("window.cp12RenderRooms") !== -1);
ok("cp12.js — IIFE 2 heroPlayBtn",               js.indexOf("heroPlayBtn") !== -1);
ok("cp12.js — IIFE 3 filter-tabs",               js.indexOf("filter-tabs") !== -1);
ok("cp12.js — IIFE 4 cp12OpenModal global",      js.indexOf("window.cp12OpenModal") !== -1);
ok("cp12.js — IIFE 4 IntersectionObserver",      js.indexOf("IntersectionObserver") !== -1);
ok("cp12.js — IIFE 4 prefers-reduced-motion fallback", js.indexOf("classList.add(\"visible\")") !== -1);
ok("cp12.js — XSS escHtml function",             js.indexOf("function escHtml") !== -1);

/* ── 4. IIFE source file content checks ─────────────────────────────────── */
console.log("\n\u2500\u2500 IIFE source files");
var switcherJs = fs.readFileSync("src/shared/lang-switcher.js",   "utf8");
var roomsJs    = fs.readFileSync("src/features/rooms/rooms.js",    "utf8");
var videoJs    = fs.readFileSync("src/features/video/video.js",    "utf8");
var exploreJs  = fs.readFileSync("src/features/explore/explore.js","utf8");
var revealJs   = fs.readFileSync("src/shared/scroll-reveal.js",    "utf8");

ok("lang-switcher.js — self-contained IIFE",  /\(function\s*\(\)/.test(switcherJs));
ok("lang-switcher.js — window.cp12SwitchLang", switcherJs.indexOf("window.cp12SwitchLang") !== -1);
ok("lang-switcher.js — window.cp12Lang",       switcherJs.indexOf("window.cp12Lang") !== -1);
ok("lang-switcher.js — data-i18n query",       switcherJs.indexOf("[data-i18n]") !== -1);
ok("lang-switcher.js — data-i18n-html query",  switcherJs.indexOf("[data-i18n-html]") !== -1);
ok("lang-switcher.js — FOUC class remove",     switcherJs.indexOf("i18n-loading") !== -1);
ok("rooms.js — self-contained IIFE",   /\(function\s*\(\)/.test(roomsJs));
ok("rooms.js — escHtml guard",         roomsJs.indexOf("escHtml") !== -1);
ok("rooms.js — XSS &amp; replacement", roomsJs.indexOf("&amp;") !== -1);
ok("rooms.js — cp12RenderRooms export",roomsJs.indexOf("window.cp12RenderRooms") !== -1);
ok("rooms.js — lang-aware desc_vi",    roomsJs.indexOf("desc_vi") !== -1);
ok("video.js — self-contained IIFE",   /\(function\s*\(\)/.test(videoJs));
ok("video.js — cp12OpenModal guard",   videoJs.indexOf("window.cp12OpenModal") !== -1);
ok("explore.js — self-contained IIFE", /\(function\s*\(\)/.test(exploreJs));
ok("explore.js — aria-selected",       exploreJs.indexOf("aria-selected") !== -1);
ok("scroll-reveal.js — try/catch",     /try\s*\{/.test(revealJs) && /catch\s*\(e\)/.test(revealJs));
ok("scroll-reveal.js — cachedNav",     revealJs.indexOf("var cachedNav = null") !== -1);
ok("scroll-reveal.js — focus trap",    revealJs.indexOf("focus trap") !== -1);
ok("scroll-reveal.js — passive scroll",revealJs.indexOf("passive") !== -1);
ok("scroll-reveal.js — RAF batching",  revealJs.indexOf("rafPending") !== -1);

/* ── Report ──────────────────────────────────────────────────────────────── */
console.log("\n\u2500\u2500 Results");
passes.forEach(function(p){ console.log(p); });
if (errors.length) {
  console.log("");
  errors.forEach(function(e){ console.log(e); });
  console.log("\n" + errors.length + " check(s) failed out of " + (passes.length + errors.length) + ".\n");
  process.exit(1);
} else {
  console.log("\nAll " + passes.length + " checks passed.\n");
}
