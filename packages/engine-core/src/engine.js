// DocumentEngine — the one interface every format engine implements.
//
// Validated end-to-end by the engine spike (2026-10-13): both a PDF and an
// EPUB engine passed a 12-method shape assertion and the full
// open → mount → goTo → getPosition → restore round-trip. The JSDoc below
// is the contract; JS has no interfaces, so `assertEngineShape` enforces
// the method surface at runtime.

/**
 * @typedef {import("./location.js").Location} Location
 * @typedef {import("./capabilities.js").CapabilityFlags} CapabilityFlags
 */

/**
 * @typedef {Object} OutlineItem
 * @property {string} label
 * @property {string} [href] Engine-native address (CFI / PDF dest string).
 * @property {OutlineItem[]} [subitems]
 */

/**
 * @typedef {Object} EngineMetadata
 * @property {string | null} title
 * @property {string | null} author
 */

/** @typedef {string | URL | File | Blob | ArrayBuffer | Uint8Array} DocumentSource */

/**
 * @typedef {Object} DocumentEngine
 * @property {() => string} format The registered format identifier ("pdf", "epub").
 * @property {() => CapabilityFlags} capabilities Declared as data; hosts branch on
 *   these, never on `format` (red line 2).
 * @property {(source: DocumentSource) => Promise<void>} open Load the document:
 *   structure and metadata become available; content units stay lazy.
 * @property {() => Promise<EngineMetadata>} getMetadata
 * @property {() => Promise<OutlineItem[]>} getOutline
 * @property {(container: HTMLElement) => Promise<void>} mount Attach the engine's
 *   presentation to a host container (canvas for delivery:"canvas", an iframe
 *   subtree for delivery:"dom"). The engine owns everything inside.
 * @property {(loc: Location) => Promise<void>} goTo Navigate to a Location
 *   (strong fields, nativeAddress, or percentage — engine picks the most exact
 *   form available).
 * @property {() => Promise<Location>} getPosition Current position as a v1
 *   Location (research doc §3: modeled after foliate's richer relocate shape).
 * @property {() => Promise<void>} next Unified page-turn primitive.
 * @property {() => Promise<void>} prev
 * @property {(href: string) => Promise<{index: number, anchor: (doc: Document) => Range | Element | number | null} | null>} resolveHref
 *   Resolve an engine-native link address (TOC href, outline dest) to a unit
 *   index plus a lazy anchor resolved against the loaded document. Engines
 *   without DOM-backed documents resolve to a numeric anchor or null.
 * @property {() => AsyncIterableIterator<{str: string, page?: number, index?: number}>} getTextContent
 *   Stream text content for search/export. Geometry is engine-native and
 *   deliberately not unified (research doc §4).
 * @property {(name: "error", cb: (err: Error) => void) => void} on Subscribe to
 *   engine errors. Bridges formats that lack an error channel (foliate
 *   swallows failures into console.warn — spike gap B).
 * @property {() => void} destroy Release all resources (iframes, blob URLs,
 *   workers). The engine is unusable afterwards.
 */

/** The validated method surface (spike-verified). */
export const ENGINE_METHODS = [
  "open",
  "getMetadata",
  "getOutline",
  "goTo",
  "getPosition",
  "resolveHref",
  "getTextContent",
  "mount",
  "next",
  "prev",
  "destroy",
  "on",
];

/**
 * Assert the DocumentEngine method surface at runtime. Used by engine
 * authors (self-check) and by tests; hosts normally trust registered
 * engines.
 *
 * @param {unknown} engine
 * @returns {{ok: boolean, missing: string[]}}
 */
export function assertEngineShape(engine) {
  const missing = ENGINE_METHODS.filter(
    (m) => typeof (/** @type {any} */ (engine)?.[m]) !== "function"
  );
  return { ok: missing.length === 0, missing };
}
