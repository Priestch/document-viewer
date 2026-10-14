// Location schema v1 — the cross-format position record.
//
// Design (research doc §8.1/§7): a versioned multi-field superset. Every
// engine must be able to produce a Location that round-trips through
// `goTo`. Strong fields are optional per format; `percentage` is the only
// field that must always be present, and `nativeAddress` is the
// engine-opaque exact form (CFI for EPUB, destination array for PDF) that
// survives relayout whenever the format's address nature allows
// (capabilities.address: "positional").

/**
 * @typedef {Object} Location
 * @property {1} version Schema version — present from birth (red line 4).
 * @property {number} [page] 1-based page number. Strong field for
 *   pagination:"stable" engines (PDF).
 * @property {number} [sectionIndex] Spine/array index. Strong field for
 *   section-based engines (EPUB/MOBI/FB2).
 * @property {string} [nativeAddress] Engine-opaque exact address: CFI string
 *   for EPUB, PDF destination array (JSON) for PDF. Prefer this over the
 *   strong fields when restoring position.
 * @property {{text: string, offset: number}} [textAnchor] Relayout-proof
 *   fallback anchor. Field defined in v1; matching algorithm deferred.
 * @property {number} percentage Always present, 0–1. Formula is
 *   engine-defined (page ratio for stable pagination, content-weighted for
 *   reflowing — see research doc §4).
 * @property {string} [docId] Document fingerprint for save-slot keying.
 */

/**
 * Validate and normalize a Location produced by an engine. Returns null when
 * the value is not a usable v1 Location (engines and hosts use this to
 * guard restore paths against corrupt storage).
 *
 * @param {unknown} value
 * @returns {Location | null}
 */
export function coerceLocation(value) {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const loc = /** @type {Location} */ (value);
  if (loc.version !== 1 || typeof loc.percentage !== "number") {
    return null;
  }
  if (Number.isNaN(loc.percentage) || loc.percentage < 0 || loc.percentage > 1) {
    return null;
  }
  return loc;
}
