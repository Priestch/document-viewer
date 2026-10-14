// CapabilityFlags — what an engine can do, declared as data.
//
// The two axis fields (pagination, address) are the P1/P2 properties from
// the research doc (§8.1): they are the ONLY intrinsic differences between
// formats, and every behavioral divergence the host must respect
// (zoom semantics, page-count availability, completion semantics,
// annotation anchoring) is a consequence of these two values. UI code must
// branch on capabilities, never on `format` (red line 2).

/**
 * @typedef {"stable" | "reflowing"} PaginationMode
 * - "stable": page count and unit boundaries are document data (PDF, FXL,
 *   CBZ). View parameters only rescale presentation; completion is
 *   observable; zoom = scale.
 * - "reflowing": pagination is computed at reading time from view
 *   parameters (EPUB, MOBI, TXT). Page count is unknown until layout and
 *   changes with context; completion is best-effort; zoom ≡ font size.
 */

/**
 * @typedef {"spatial" | "positional"} AddressNature
 * - "spatial": positions are page-relative coordinates (PDF dest arrays,
 *   quadPoints). Addresses survive re-render, not re-layout.
 * - "positional": positions are content anchors (CFI, text anchors).
 *   Addresses survive relayout — this is what makes annotations durable in
 *   reflowable formats.
 */

/**
 * @typedef {Object} CapabilityFlags
 * @property {PaginationMode} pagination P1 — pagination stability.
 * @property {AddressNature} address P2 — address nature.
 * @property {"canvas" | "dom"} delivery Red line 5 — the delivery dimension
 *   is part of the interface: canvas (raster) vs dom (live document).
 * @property {boolean} reflow Whether view parameters can change pagination
 *   (true implies pagination:"reflowing").
 * @property {boolean} textStyle Whether text styling (font size, family,
 *   line height) is adjustable.
 * @property {boolean} outline Whether getOutline returns a real tree.
 * @property {boolean} annotationEditing Whether annotations can be
 *   created/edited through the engine (annotation anchoring is engine-native).
 * @property {boolean} tts Whether text-to-speech ranges are available.
 */

/**
 * Runtime shape check for capability objects. Hosts should treat engines
 * whose capabilities fail this check as unusable.
 *
 * @param {unknown} caps
 * @returns {{ok: boolean, missing: string[], invalid: string[]}}
 */
export function validateCapabilities(caps) {
  const missing = [];
  const invalid = [];
  const required = ["pagination", "address", "delivery", "reflow"];
  const enums = {
    pagination: ["stable", "reflowing"],
    address: ["spatial", "positional"],
    delivery: ["canvas", "dom"],
  };
  if (typeof caps !== "object" || caps === null) {
    return { ok: false, missing: required, invalid: [] };
  }
  for (const key of required) {
    // @ts-expect-error index access on validated object
    if (caps[key] === undefined) {
      missing.push(key);
    }
  }
  for (const [key, allowed] of Object.entries(enums)) {
    // @ts-expect-error index access on validated object
    if (caps[key] !== undefined && !allowed.includes(caps[key])) {
      invalid.push(`${key} must be one of ${allowed.join(" | ")}`);
    }
  }
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}
