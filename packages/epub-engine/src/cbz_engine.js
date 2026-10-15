// CbzEngine — the "cbz" DocumentEngine (comic book archive), reusing the
// shared book-engine factory (epub_engine.js) over pipeline/cbz.js. The book
// is one section per image; rendering rides the standard column paginator —
// a single-image section is exactly one page — with full-bleed layout
// options. Only stable-pagination positions differ from the reflowable
// engines (page = sectionIndex + 1, derived in createBookEngine from
// capabilities.pagination).

import { sourceToBytes } from "./book_backend.js";
import { assembleCbzBook } from "./pipeline/cbz.js";
import { createZipSource } from "./pipeline/zip-source.js";
import { createBookEngine } from "./epub_engine.js";
import { createWorkerBackend } from "./worker_backend.js";

/**
 * @typedef {import("@document-kits/engine-core").DocumentEngine} DocumentEngine
 * @typedef {import("@document-kits/engine-core").CapabilityFlags} CapabilityFlags
 */

const CBZ_CAPABILITIES = /** @type {CapabilityFlags} */ ({
  pagination: "stable", // one image = one page; page count is document data
  address: "positional",
  delivery: "dom",
  reflow: false,
  textStyle: false, // the page is one image; there is no text to style
  outline: true, // TOC = the page files
  annotationEditing: false,
  tts: false, // image-only pages have no text
});

/**
 * In-process CBZ backend: parse the bytes into our book shape over a sync
 * zip source. `destroy()` cascades the resource cache (every live blob URL,
 * page wrappers and images alike).
 * @returns {{open: Function, book: object|null, destroy: Function}}
 */
export function createCbzBackend() {
  /** @type {object | null} */
  let cache = null;
  return {
    async open(source) {
      const name = typeof source?.name === "string" ? source.name : null;
      const zip = createZipSource(await sourceToBytes(source));
      const assembled = await assembleCbzBook({ zip, name });
      cache = assembled.cache;
      this.book = assembled.book;
      return assembled.book;
    },
    book: null,
    destroy() {
      cache?.destroy();
      cache = null;
      this.book = null;
    },
  };
}

/**
 * Build a CbzEngine.
 *
 * @param {object} [options]
 * @param {string} [options.height] CSS height for the mounted view
 *   (default "100%" of the container).
 * @param {import("./book_backend.js").BookBackend|"in-process"} [options]
 *   backend; defaults to the worker backend (zip inflation and image blob
 *   minting in a worker, fake-worker fallback). Pass `"in-process"` for the
 *   all-main-thread pipeline (debug escape hatch).
 * @returns {DocumentEngine}
 */
export function createCbzEngine(options = {}) {
  const { backend = createWorkerBackend({ format: "cbz" }), ...rest } = options;
  return createBookEngine({
    format: "cbz",
    capabilities: CBZ_CAPABILITIES,
    label: "CbzEngine",
    backend: backend === "in-process" ? createCbzBackend() : backend,
    options: {
      // Full-bleed single-column pages. Do NOT add maxInlineSize: Infinity —
      // layout.js derives divisor = min(maxColumnCount, ceil(size /
      // maxInlineSize)) and Infinity drives it to 0; the default 720 is
      // harmless once maxColumnCount is 1.
      layout: { maxColumnCount: 1, margin: 0, gapPercent: 0 },
      ...rest,
    },
  });
}
