// @document-kits/epub-engine — public surface.
//
// The engines run on the package's own pipeline (src/pipeline/, ported from
// foliate-js — see the port-citation headers there). Byte/parse work lives
// in a per-book worker behind the BookBackend seam (worker_backend.js +
// worker/book-worker.js, pdf.js MessageHandler with a fake-worker
// fallback); rendering, DOMParser and the blob-URL cache stay on the main
// thread (docs/plans/2026-10-15-epub-worker-prep.md §7).

import { registerEngine } from "@document-kits/engine-core";
import { createEpubEngine } from "./epub_engine.js";
import { createMobiEngine, createMobiBackend } from "./mobi_engine.js";
import { createWorkerBackend } from "./worker_backend.js";

export { createEpubEngine, createMobiEngine, createMobiBackend, createWorkerBackend };
export { parseMobi, isMobi } from "./pipeline/mobi.js";

/**
 * Register the "epub" engine with engine-core's factory.
 *
 * @param {{height?: string}} [options] Passed to every created engine.
 */
export function registerEpubEngine(options = {}) {
  registerEngine("epub", () => createEpubEngine(options));
}

/**
 * Register the "mobi" engine (MOBI/KF8/AZW3) with engine-core's factory.
 *
 * @param {{height?: string}} [options] Passed to every created engine.
 */
export function registerMobiEngine(options = {}) {
  registerEngine("mobi", () => createMobiEngine(options));
}
