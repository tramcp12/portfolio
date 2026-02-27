#!/usr/bin/env node
/**
 * validate.js — Architectural invariant checker for Trạm CP12
 *
 * Checks 14 invariants across index.html, cp12.css, cp12.js, and i18n data.
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
check("JS-3", "var cachedNav = null pattern exists in cp12.js", /var cachedNav\s*=\s*null/.test(js));

/* ── P-1: No <img> tags in index.html ── */
/* Strip HTML comments first to avoid false positives */
var htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, "");
check("P-1", "No <img> tags in index.html (all images are CSS backgrounds)", !/<img[\s>]/i.test(htmlNoComments));

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
