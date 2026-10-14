// @document-kits/epub-engine — public surface.
//
// The engine runs on the package's own pipeline (src/pipeline/, ported from
// foliate-js — see the port-citation headers there). Rendering stays on the
// main thread; the light-worker seam is future work behind this same
// surface (research doc §10).

import { registerEngine } from "@document-kits/engine-core";
import { createEpubEngine } from "./epub_engine.js";

export { createEpubEngine };

/**
 * Register the "epub" engine with engine-core's factory.
 *
 * @param {{height?: string}} [options] Passed to every created engine.
 */
export function registerEpubEngine(options = {}) {
  registerEngine("epub", () => createEpubEngine(options));
}
