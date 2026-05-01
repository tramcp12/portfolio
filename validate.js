#!/usr/bin/env node
/**
 * validate.js — Architectural invariant checker for Trạm CP12
 *
 * Checks 18 invariants across index.html, cp12.css, cp12.js, and source data/CSS.
 * Exit 0 = all pass. Exit 1 = one or more failures.
 */

"use strict";

var fs = require("fs");
var path = require("path");

var root = path.dirname(__filename);
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var css  = fs.readFileSync(path.join(root, "cp12.css"),   "utf8");
var js   = fs.readFileSync(path.join(root, "cp12.js"),    "utf8");
var stringsVi = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "strings.vi.json"), "utf8"));
var stringsEn = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "strings.en.json"), "utf8"));

var failures = [];
var passes   = [];

function check(id, description, condition) {
  if (condition) {
    passes.push("  \u2705 " + id + ": " + description);
  } else {
    failures.push("  \u274C " + id + ": " + description);
  }
}

function listCssFiles(dir) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  var files = [];
  entries.forEach(function (entry) {
    var fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listCssFiles(fullPath));
    } else if (/\.css$/.test(entry.name)) {
      files.push(fullPath);
    }
  });
  return files;
}

/* ── CSS-1: Each font family appears exactly once in cp12.css ── */
var cormorantCount = (css.match(/Cormorant Garamond/g) || []).length;
var beVietnamCount = (css.match(/Be Vietnam Pro/g) || []).length;
check("CSS-1a", "Cormorant Garamond declared exactly once in CSS (found " + cormorantCount + ")", cormorantCount === 1);
check("CSS-1b", "Be Vietnam Pro declared exactly once in CSS (found " + beVietnamCount + ")", beVietnamCount === 1);

/* ── CSS-2: Shared button base exists (.btn-primary, .btn-gold etc grouped) ── */
var btnGrouped = /\.btn-primary,[\s\S]{0,200}\.btn-gold|\.btn-gold,[\s\S]{0,200}\.btn-primary/.test(css) ||
                 /\.btn-base/.test(css);
check("CSS-2", "Shared button base selector (.btn-base or grouped .btn-primary/.btn-gold)", btnGrouped);

/* ── CSS-3: Alpha tokens --gold-20 and --pine-dark-90 defined in :root ── */
check("CSS-3a", "--gold-20 defined in :root", /--gold-20\s*:/.test(css));
check("CSS-3b", "--pine-dark-90 defined in :root", /--pine-dark-90\s*:/.test(css));

/* ── A-1: prefers-reduced-motion guard exists ── */
check("A-1", "@media (prefers-reduced-motion: reduce) exists in CSS", /prefers-reduced-motion\s*:\s*reduce/.test(css));

/* ── R-1: max-width: 768px breakpoint exists ── */
check("R-1", "@media (max-width: 768px) exists in CSS", /max-width\s*:\s*768px/.test(css));

/* ── JS-1: try/catch wraps init block in cp12.js ── */
check("JS-1", "try { } catch (e) { } init guard exists in cp12.js", /try\s*\{/.test(js) && /catch\s*\(e\)/.test(js));

/* ── JS-3: Nav element is cached via cachedNav pattern ── */
check("JS-3", "let cachedNav = null pattern exists in cp12.js", /(var|let) cachedNav\s*=\s*null/.test(js));

/* ── P-1: No authored <img> tags outside the Phase 2 hero picture ── */
/* Strip HTML comments first to avoid false positives */
var htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, "");
var authoredImgTags = htmlNoComments.match(/<img\b[^>]*>/gi) || [];
var heroMediaImgs = authoredImgTags.filter(function (tag) {
  return /class="[^"]*\bhero-media-img\b[^"]*"/.test(tag);
});
check(
  "P-1",
  "No authored <img> tags outside the hero picture fallback",
  authoredImgTags.length === heroMediaImgs.length && heroMediaImgs.length === 1
);

/* ── H-1: og:image meta tag present in index.html ── */
check("H-1", "og:image meta tag present in index.html", /property="og:image"/.test(html));

/* ── A-2: No legacy img/ URL references in cp12.css (all images under static/) ── */
check("A-2", "No legacy url(img/...) references in cp12.css", !/url\(["']?img\//.test(css));

/* ── I18N-1: strings.vi.json and strings.en.json have the same key count ── */
var viKeys = Object.keys(stringsVi);
var enKeys = Object.keys(stringsEn);
check("I18N-1", "strings.vi.json and strings.en.json have equal key counts (vi=" + viKeys.length + ", en=" + enKeys.length + ")", viKeys.length === enKeys.length);

/* ── I18N-2: every key in strings.vi.json exists in strings.en.json ── */
var missingInEn = viKeys.filter(function (k) { return !(k in stringsEn); });
check("I18N-2", "All vi keys present in en (missing: " + (missingInEn.length ? missingInEn.join(", ") : "none") + ")", missingInEn.length === 0);

/* ── I18N-3: every key in strings.en.json exists in strings.vi.json ── */
var missingInVi = enKeys.filter(function (k) { return !(k in stringsVi); });
check("I18N-3", "All en keys present in vi (missing: " + (missingInVi.length ? missingInVi.join(", ") : "none") + ")", missingInVi.length === 0);

/* ── B-1: Room modal exists in index.html and is placed outside <main> ── */
var roomModalExists     = /id="cp12-room-modal"/.test(html);
var roomModalInsideMain = /<main[\s\S]*?id="cp12-room-modal"[\s\S]*?<\/main>/.test(html);
check("B-1", "cp12-room-modal exists in index.html and is outside <main>", roomModalExists && !roomModalInsideMain);

/* ── L-1: Lazy loader active — at least one data-bg attribute in index.html ── */
check("L-1", "At least one [data-bg] element in index.html (lazy-loader.js active)", /data-bg="static\/img\//.test(html));

/* ── INV-18: Feature/layout CSS must use color tokens — no raw rgb()/rgba() ── */
/* Catches literal color values that should be defined as palette tokens in
 * src/core/tokens.css. Detects both legacy rgba(R,G,B,A) and modern rgb(R G B / N%) */
var rawColorLiteralPattern = /\brgba?\([0-9]/g;
var inv18Files = listCssFiles(path.join(root, "src", "features"))
  .concat(listCssFiles(path.join(root, "src", "layout")));
var inv18Violations = [];
inv18Files.forEach(function (filePath) {
  var relPath = path.relative(root, filePath);
  var content = fs.readFileSync(filePath, "utf8");
  var lines = content.split("\n");
  lines.forEach(function (line, index) {
    rawColorLiteralPattern.lastIndex = 0;
    if (rawColorLiteralPattern.test(line)) {
      inv18Violations.push(relPath + ":" + (index + 1));
    }
  });
});
check(
  "INV-18",
  "Feature/layout CSS uses color tokens (no raw rgb/rgba literals)" +
    (inv18Violations.length ? " (" + inv18Violations.slice(0, 8).join(", ") + ")" : ""),
  inv18Violations.length === 0
);

/* ── INV-19: Every build source array entry must exist on disk ──
 * Catches the "delete the file but forget the array entry" bug —
 * which would otherwise surface as an unhelpful ENOENT mid-build.
 */
var buildSrcContent = fs.readFileSync(path.join(root, "build.js"), "utf8");
function extractSourcePaths(arrayName) {
  var blockMatch = buildSrcContent.match(new RegExp("var\\s+" + arrayName + "\\s*=\\s*\\[([\\s\\S]*?)\\]"));
  if (!blockMatch) return [];
  return (blockMatch[1].match(/"([^"]+\.(?:css|js))"/g) || []).map(function (s) { return s.slice(1, -1); });
}
var inv19Sources = extractSourcePaths("cssSources").concat(extractSourcePaths("jsSources"));
var inv19Missing = inv19Sources.filter(function (rel) {
  return !fs.existsSync(path.join(root, "src", rel));
});
check(
  "INV-19",
  "Every build source (cssSources/jsSources) entry exists under src/" +
    (inv19Missing.length ? " (missing: " + inv19Missing.join(", ") + ")" : " (" + inv19Sources.length + " entries verified)"),
  inv19Missing.length === 0
);

/* ── INV-20: Every static/img/... path referenced by social-meta tags must exist ──
 * Covers og:image, twitter:image, and JSON-LD "image" — the class of bug where a
 * redesign moves the hero asset but the social/structured-data tags keep pointing
 * at the old file. URLs are absolute (https://tramcp12.github.io/portfolio/...);
 * we extract the path-relative portion.
 */
var shellHead = fs.readFileSync(path.join(root, "src", "shell-head.html"), "utf8");
var jsonldSrc = fs.readFileSync(path.join(root, "src", "layout", "jsonld.html.partial"), "utf8");
var metaImgPattern = /https:\/\/tramcp12\.github\.io\/portfolio\/(static\/img\/[^"\s)]+)/g;
var inv20Refs = [];
var inv20Match;
while ((inv20Match = metaImgPattern.exec(shellHead + "\n" + jsonldSrc)) !== null) {
  inv20Refs.push(inv20Match[1]);
}
var inv20Missing = inv20Refs.filter(function (p) { return !fs.existsSync(path.join(root, p)); });
check(
  "INV-20",
  "Every social-meta / JSON-LD image path exists" +
    (inv20Missing.length ? " (missing: " + inv20Missing.join(", ") + ")" : " (" + inv20Refs.length + " references verified)"),
  inv20Missing.length === 0
);

/* ── Output ── */
console.log("\nTr\u1ea1m CP12 \u2014 Architectural Invariants\n");
passes.forEach(function (p) { console.log(p); });
if (failures.length) {
  console.log("");
  failures.forEach(function (f) { console.log(f); });
  console.log("\n" + failures.length + " invariant(s) failed.\n");
  process.exit(1);
} else {
  console.log("\nAll " + passes.length + " invariants passed.\n");
  process.exit(0);
}
