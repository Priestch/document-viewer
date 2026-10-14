// @document-kits/epub-engine — public surface.
//
// The engines run on the package's own pipeline (src/pipeline/, ported from
// foliate-js — see the port-citation headers there). Rendering stays on the
// main thread; the light-worker seam is future work behind this same
// surface (research doc §10).

import { registerEngine } from "@document-kits/engine-core";
import { createEpubEngine } from "./epub_engine.js";
import { createMobiEngine, createMobiBackend } from "./mobi_engine.js";

export { createEpubEngine, createMobiEngine, createMobiBackend };
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
