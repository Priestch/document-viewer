// MobiEngine — the "mobi" DocumentEngine (MOBI/KF8/AZW3), reusing the
// pipeline's paginator and the shared book-engine factory (epub_engine.js).
// Only the backend differs: the book is assembled by pipeline/mobi.js (the
// foliate-js MOBI parser ported to our book model) instead of the zip
// pipeline. Rendering, navigation, text extraction and typography are the
// exact same code paths as EPUB — the unified-document-model principle
// (unification at the model/interface layer, not the rendering layer).

import { unzlibSync } from "fflate";

import { sourceToBytes } from "./book_backend.js";
import { parseMobi } from "./pipeline/mobi.js";
import { createBookEngine } from "./epub_engine.js";
import { createWorkerBackend } from "./worker_backend.js";

/**
 * @typedef {import("@document-kits/engine-core").DocumentEngine} DocumentEngine
 * @typedef {import("@document-kits/engine-core").CapabilityFlags} CapabilityFlags
 */

const MOBI_CAPABILITIES = /** @type {CapabilityFlags} */ ({
  pagination: "reflowing",
  address: "positional",
  delivery: "dom",
  reflow: true,
  textStyle: true,
  outline: true, // TOC from the INDX records (KF8) / guide (MOBI6)
  annotationEditing: false,
  tts: false, // no CFI-anchored ranges; text anchors are a later phase
});

/**
 * In-process MOBI backend: parse the bytes into our book shape. `destroy()`
 * revokes every live blob URL in the parser's resource cache — the engine
 * calls it from destroy().
 * @returns {{open: Function, book: object|null, destroy: Function}}
 */
export function createMobiBackend() {
  /** @type {object | null} */
  let book = null;
  return {
    async open(source) {
      book = await parseMobi(await sourceToBytes(source), { unzlib: unzlibSync });
      this.book = book;
      return book;
    },
    book: null,
    destroy() {
      book?.destroy?.();
      book = null;
      this.book = null;
    },
  };
}

/**
 * Build a MobiEngine.
 *
 * @param {object} [options]
 * @param {string} [options.height] CSS height for the mounted view
 *   (default "100%" of the container).
 * @param {import("./book_backend.js").BookBackend|"in-process"} [options]
 *   backend; defaults to the worker backend (record decompression and the
 *   KF8 skeleton/INDX parse in a worker, fake-worker fallback). Pass
 *   `"in-process"` for the all-main-thread pipeline (debug escape hatch).
 * @returns {DocumentEngine}
 */
export function createMobiEngine(options = {}) {
  const { backend = createWorkerBackend({ format: "mobi" }), ...rest } = options;
  return createBookEngine({
    format: "mobi",
    capabilities: MOBI_CAPABILITIES,
    label: "MobiEngine",
    backend: backend === "in-process" ? createMobiBackend() : backend,
    options: rest,
  });
}
