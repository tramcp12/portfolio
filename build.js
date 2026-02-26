#!/usr/bin/env node
/**
 * build.js — Trạm CP12 source assembler
 *
 * Phase 1 (complete): CSS split
 *   CSS assembled from src/ source files in cascade order.
 *
 * Phase 2 (complete): HTML split
 *   HTML assembled from src/ partials in DOM order.
 *
 * Phase 3 (complete): JS split
 *   JS assembled from 5 IIFE source files in DOM order.
 *
 * Phase 4 (complete): Data layer
 *   src/data/rooms.json injected as <script id="rooms-data"> for IIFE 1.
 *   src/data/travel.json and src/data/journal.json are reference files
 *   (static HTML partials retained for SEO; no runtime renderers yet).
 *
 * Phase 5 (complete): i18n layer
 *   src/data/strings.vi.json and strings.en.json injected as
 *   <script id="lang-vi-data"> / <script id="lang-en-data"> for IIFE 0.
 *   IIFE 0 (lang-switcher.js) applies [data-i18n] swaps and re-renders rooms.
 *
 * Phase 6 (complete): Static asset migration
 *   Travel images moved from img/ to static/img/travel/ (renamed, no travel- prefix).
 *   favicon.svg kept at repo root. Asset path guard validates all static/img/
 *   url() references in the assembled CSS against real files on disk.
 */

"use strict";

var fs   = require("fs");
var path = require("path");
var cp   = require("child_process");

var root = __dirname;
var t0   = Date.now();

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function readSrc(relPath) {
  return fs.readFileSync(path.join(root, "src", relPath), "utf8");
}

function writeRoot(name, content) {
  fs.writeFileSync(path.join(root, name), content, "utf8");
  var lines = content.split("\n").length;
  var kb    = (Buffer.byteLength(content, "utf8") / 1024).toFixed(1);
  console.log("  wrote " + name + " (" + lines + " lines, " + kb + " KB)");
}

function assertMinSize(name, content, minKB) {
  var actual = Buffer.byteLength(content, "utf8") / 1024;
  if (actual < minKB) {
    throw new Error(
      "Build guard: " + name + " is " + actual.toFixed(1) +
      " KB — expected at least " + minKB + " KB. " +
      "Possible empty-file bug in concat."
    );
  }
}

function run(cmd) {
  cp.execSync(cmd, { stdio: "inherit", cwd: root });
}

/* ── Assembly ─────────────────────────────────────────────────────────────── */

console.log("\nBuilding Trạm CP12...\n");

/* ── Data ── Phase 4 + 5: load src/data/ JSON files ──────────────────────── */

var roomsData  = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "rooms.json"),      "utf8"));
var stringsVi  = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "strings.vi.json"), "utf8"));
var stringsEn  = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "strings.en.json"), "utf8"));

/* ── Security: CRIT-1 — validate data-i18n-html values against tag allowlist ─── */
/* Only <br>, <em>, <strong> are permitted. Any other HTML tag in a translation
 * string would be an unguarded innerHTML injection vector (stored XSS risk).    */
var SAFE_I18N_HTML = /^(?:[^<]|<br\s*\/?>|<\/?em>|<\/?strong>)*$/;
function validateI18nHtmlStrings(filename, strings) {
  Object.keys(strings).forEach(function (key) {
    var val = strings[key];
    if (typeof val === "string" && val.indexOf("<") !== -1) {
      if (!SAFE_I18N_HTML.test(val)) {
        throw new Error(
          "Security guard (CRIT-1): " + filename + "[\"" + key + "\"] contains disallowed HTML tags.\n" +
          "  Value: " + val + "\n" +
          "  Only <br>, <em>, <strong> are permitted in i18n strings."
        );
      }
    }
  });
}
validateI18nHtmlStrings("strings.vi.json", stringsVi);
validateI18nHtmlStrings("strings.en.json", stringsEn);

function injectJson(id, data) {
  return '\n    <script id="' + id + '" type="application/json">\n    ' +
    JSON.stringify(data).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--") +
    "\n    </script>";
}

/* ── HTML ── Phase 2: assemble from src/ partials
 * Order: shell-head → dots → chrome → main-open →
 *   home → video → rooms → explore → about → journal →
 *   main-close → cta → footer → modal → shell-close → jsonld
 */
var htmlParts = [
  readSrc("shell-head.html"),
  readSrc("layout/dots.html.partial"),
  readSrc("layout/chrome.html.partial"),
  "\n      <main id=\"cp12-main\">",
  readSrc("features/home/home.html.partial"),
  readSrc("features/video/video.html.partial"),
  readSrc("features/rooms/rooms.html.partial"),
  readSrc("features/explore/explore.html.partial"),
  readSrc("features/about/about.html.partial"),
  readSrc("features/journal/journal.html.partial"),
  "\n      </main>\n      <!-- /#cp12-main -->",
  readSrc("features/cta/cta.html.partial"),
  readSrc("layout/footer.html.partial"),
  readSrc("layout/modal.html.partial"),
  "    </div>\n    <!-- /#cp12-wrap -->",
  // Phase 4+5: data injected before </body> so defer-loaded cp12.js can find them
  injectJson("lang-vi-data", stringsVi),
  injectJson("lang-en-data", stringsEn),
  injectJson("rooms-data",   roomsData),
  readSrc("layout/jsonld.html.partial"),
];
var html = htmlParts.join("\n");

/* ── CSS  ── Phase 1: concat from src/ source files
 * Cascade order: tokens → reset → accessibility →
 *   nav → nav-mobile → dots → next-btn →
 *   buttons → section-labels → animations →
 *   home → video → rooms → explore → about → journal → cta →
 *   footer → modal → responsive-sentinel → supports
 */
var cssSources = [
  "core/tokens.css",
  "core/reset.css",
  "core/accessibility.css",
  "layout/nav.css",
  "layout/nav-mobile.css",
  "layout/dots.css",
  "layout/next-btn.css",
  "core/buttons.css",
  "core/section-labels.css",
  "core/animations.css",
  "features/home/home.css",
  "features/video/video.css",
  "features/rooms/rooms.css",
  "features/explore/explore.css",
  "features/about/about.css",
  "features/journal/journal.css",
  "features/cta/cta.css",
  "layout/footer.css",
  "layout/modal.css",
  "core/responsive-sentinel.css",
  "core/supports.css"
];
var css = cssSources.map(function(f) { return readSrc(f); }).join("\n");

// CSS-1 build-time pre-check
var cgCount = (css.match(/Cormorant Garamond/g) || []).length;
var bvCount = (css.match(/Be Vietnam Pro/g) || []).length;
if (cgCount !== 1) throw new Error("CSS-1a build guard: Cormorant Garamond appears " + cgCount + " times (expected 1)");
if (bvCount !== 1) throw new Error("CSS-1b build guard: Be Vietnam Pro appears " + bvCount + " times (expected 1)");

/* ── JS   ── Phase 3+5: concat from src/ IIFE source files
 * Order: lang-switcher (IIFE 0) → rooms (IIFE 1) → video (IIFE 2) →
 *        explore (IIFE 3) → scroll-reveal (IIFE 4)
 */
var jsSources = [
  "shared/lang-switcher.js",
  "features/rooms/rooms.js",
  "features/video/video.js",
  "features/explore/explore.js",
  "shared/scroll-reveal.js"
];
var js = jsSources.map(function(f) { return readSrc(f); }).join("\n\n");

/* ── Size guards ── protect against silent empty-file bugs ── */
assertMinSize("index.html", html, 30);
assertMinSize("cp12.css",   css,  40);
assertMinSize("cp12.js",    js,   12);

/* ── Phase 6: Asset path guard — validate static/img/ CSS references ─────── */
/* Every url("static/img/...") in the assembled CSS must point to a file that
 * actually exists in the repo. Catches broken image references at build time. */
var assetGuardRe = /url\(["']?(static\/img\/[^"')]+)["']?\)/g;
var assetMatch;
while ((assetMatch = assetGuardRe.exec(css)) !== null) {
  var assetPath = path.join(root, assetMatch[1]);
  if (!fs.existsSync(assetPath)) {
    throw new Error(
      "Phase 6 asset guard: CSS references missing file:\n" +
      "  url(\"" + assetMatch[1] + "\")\n" +
      "  Full path: " + assetPath
    );
  }
}

writeRoot("index.html", html);
writeRoot("cp12.css",   css);
writeRoot("cp12.js",    js);

/* ── Validate ─────────────────────────────────────────────────────────────── */

console.log("\nRunning architectural invariants...");
run("node validate.js");

console.log("Running HTML lint...");
run("npx html-validate index.html");

var elapsed = ((Date.now() - t0) / 1000).toFixed(2);
console.log("\nBuild complete in " + elapsed + "s\n");
