#!/usr/bin/env node
/**
 * scripts/seed-rooms.js — Phase 8 seed script
 *
 * Scans static/img/rooms/catalog/ and static/img/rooms/details/ and
 * generates a stub rooms.json with all 7 rooms pre-populated with
 * coverPhoto, photos[], and auto-generated alt text.
 *
 * Run once after downloading photos from Google Drive, then fill in
 * the TODO fields (name, price, desc, meta, amenities) in rooms.json.
 *
 * Safety: will NOT overwrite rooms.json if any room already has a name.
 * Delete rooms.json or clear all "name" fields to re-seed.
 */

"use strict";

var fs   = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

/* Sort order for rooms (jan = room 1, nov = room 11, etc.) */
var ROOM_SORT = ["jan-01", "feb-02", "mar-03", "aug-08", "sep-09", "oct-10", "nov-11"];

/* Word corrections for filename → alt text conversion */
var WORD_MAP = {
  "decord":  "Décor",
  "decords": "Décors"
};

function titleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a filename (without extension) to readable alt text.
 *
 * Examples:
 *   "1-bed-view-1"  → "Bed View, Photo 1"
 *   "2-beds-view-2" → "Beds View, Photo 2"
 *   "balcony-door"  → "Balcony Door"
 *   "decord-1"      → "Décor, Photo 1"
 *   "decord"        → "Décor"
 *   "door"          → "Door"
 *   "lock-key-door" → "Lock Key Door"    ← content editor should review
 *   "window-view"   → "Window View"
 *   "window-1"      → "Window, Photo 1"
 *   "toilet-1"      → "Toilet, Photo 1"
 *
 * NOTE: Auto-generated alt text is a starting point for the content editor.
 * Review and improve all alt / alt_vi fields before publishing, especially
 * for compound names like "lock-key-door" and single-word labels like "door".
 */
function fileToAlt(filename) {
  var base = path.basename(filename, path.extname(filename));

  /* Strip leading numeric prefix: "1-bed" → "bed", "2-beds" → "beds" */
  base = base.replace(/^\d+-/, "");

  /* Detect trailing photo number: "view-1" → suffix ", Photo 1" */
  var suffix = "";
  var trailingMatch = base.match(/^(.*)-(\d+)$/);
  if (trailingMatch) {
    base   = trailingMatch[1];
    suffix = ", Photo " + trailingMatch[2];
  }

  /* Split on dashes, apply word map, title-case each word */
  var words = base.split("-").map(function (w) {
    return WORD_MAP[w.toLowerCase()] || titleCase(w);
  });

  return words.join(" ") + suffix;
}

/* ── Safety guard: don't overwrite if any room already has a name ── */
var existingPath = path.join(root, "src", "data", "rooms.json");
if (fs.existsSync(existingPath)) {
  try {
    var existing = JSON.parse(fs.readFileSync(existingPath, "utf8"));
    var anyEdited = Array.isArray(existing) && existing.some(function (r) {
      return r.name && r.name !== "";
    });
    if (anyEdited) {
      console.log(
        "rooms.json has been edited (at least one room has a non-empty name).\n" +
        "Skipping re-seed to protect your edits.\n" +
        "To re-seed: delete src/data/rooms.json or clear all \"name\" fields, then re-run."
      );
      process.exit(0);
    }
  } catch (e) {
    console.error(
      "rooms.json exists but cannot be parsed: " + e.message + "\n" +
      "Fix the JSON syntax error or delete the file, then re-run this script."
    );
    process.exit(1);
  }
}

/* ── Scan disk and build room stubs ── */
var catalogDir = path.join(root, "static", "img", "rooms", "catalog");
var detailsDir = path.join(root, "static", "img", "rooms", "details");

var rooms = ROOM_SORT.map(function (id) {
  var coverPhoto   = "static/img/rooms/catalog/" + id + ".jpg";
  var detailFolder = path.join(detailsDir, id);
  var photos = [];

  if (fs.existsSync(detailFolder)) {
    var files = fs.readdirSync(detailFolder).filter(function (f) {
      return /\.(jpg|jpeg|png|webp)$/i.test(f);
    }).sort();

    photos = files.map(function (f) {
      return {
        src:    "static/img/rooms/details/" + id + "/" + f,
        alt:    fileToAlt(f),
        alt_vi: "" /* TODO: fill in Vietnamese alt text */
      };
    });
  }

  return {
    id:          id,
    coverPhoto:  coverPhoto,
    name:        "", /* TODO: English room name, e.g. "Phòng Trạm — The Signature Room" */
    name_vi:     "", /* TODO: Vietnamese room name, e.g. "Phòng Trạm" */
    price:       "", /* TODO: price string, e.g. "580K" */
    featured:    false, /* TODO: set true for the highlighted/featured room */
    desc:        "", /* TODO: English description (1–2 sentences) */
    desc_vi:     "", /* TODO: Vietnamese description */
    meta:        [], /* TODO: e.g. [{"icon": "👤", "text": "2 guests"}] */
    meta_vi:     [], /* TODO: e.g. [{"icon": "👤", "text": "2 khách"}] */
    amenities:   [], /* TODO: e.g. ["Private Balcony", "WiFi"] */
    amenities_vi: [], /* TODO: e.g. ["Ban Công Riêng", "WiFi"] */
    photos:      photos
  };
});

fs.writeFileSync(existingPath, JSON.stringify(rooms, null, 2) + "\n", "utf8");
console.log("Seeded " + rooms.length + " rooms → src/data/rooms.json");
console.log("Next steps:");
console.log("  1. Fill in name, name_vi, price, featured, desc, desc_vi, meta, meta_vi,");
console.log("     amenities, amenities_vi for each room in src/data/rooms.json");
console.log("  2. Review and improve alt / alt_vi text for all photos");
console.log("  3. Run: npm run build");
