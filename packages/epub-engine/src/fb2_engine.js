// Fb2Engine — the "fb2" DocumentEngine (FictionBook, incl. zipped
// .fb2.zip/.fbz — the container is sniffed by zip magic, not extension),
// reusing the shared book-engine factory (epub_engine.js) over
// pipeline/fb2.js (the foliate-js fb2.js port). The worker half is the byte
// half (unzip + encoding-aware decode, one text snapshot); the DOMParser
// conversion runs main-thread by red line.

import { sourceToBytes } from "./book_backend.js";
import { assembleFB2Book } from "./pipeline/fb2.js";
import { createBookEngine } from "./epub_engine.js";
import { createWorkerBackend } from "./worker_backend.js";

/**
 * @typedef {import("@document-kits/engine-core").DocumentEngine} DocumentEngine
 * @typedef {import("@document-kits/engine-core").CapabilityFlags} CapabilityFlags
 */

const FB2_CAPABILITIES = /** @type {CapabilityFlags} */ ({
  pagination: "reflowing",
  address: "positional",
  delivery: "dom",
  reflow: true,
  textStyle: true,
  outline: true, // TOC from the section titles (data-foliate-id anchors)
  annotationEditing: false,
  tts: false, // no CFI-anchored ranges; text anchors are a later phase
});

/**
 * In-process FB2 backend: decode (+ unzip) and convert on the main thread.
 * `destroy()` revokes the book's eagerly-minted section URLs.
 * @returns {{open: Function, book: object|null, destroy: Function}}
 */
export function createFb2Backend() {
  return {
    async open(source) {
      const name = typeof source?.name === "string" ? source.name : null;
      const book = await assembleFB2Book({ bytes: await sourceToBytes(source), name });
      this.book = book;
      return book;
    },
    book: null,
    destroy() {
      this.book?.destroy?.();
      this.book = null;
    },
  };
}

/**
 * Build an Fb2Engine.
 *
 * @param {object} [options]
 * @param {string} [options.height] CSS height for the mounted view
 *   (default "100%" of the container).
 * @param {import("./book_backend.js").BookBackend|"in-process"} [options]
 *   backend; defaults to the worker backend (unzip + decode in a worker,
 *   fake-worker fallback; the DOMParser conversion is main-thread either
 *   way). Pass `"in-process"` for the all-main-thread pipeline (debug
 *   escape hatch).
 * @returns {DocumentEngine}
 */
export function createFb2Engine(options = {}) {
  const { backend = createWorkerBackend({ format: "fb2" }), ...rest } = options;
  return createBookEngine({
    format: "fb2",
    capabilities: FB2_CAPABILITIES,
    label: "Fb2Engine",
    backend: backend === "in-process" ? createFb2Backend() : backend,
    options: rest,
  });
}
