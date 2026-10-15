// BookBackend — the worker-ization seam (docs/plans/2026-10-15-epub-worker-prep.md).
//
// EpubEngine consumes `backend.open(source)` / `backend.book` instead of
// assembling the book itself. Two implementations share one contract:
//
// - `createInProcessBackend` (below) runs the whole pipeline on the main
//   thread over a sync `createZipSource` — the pre-worker behavior, kept as
//   the debug escape hatch (`backend: "in-process"`) and the Node unit-test
//   baseline.
// - `createWorkerBackend` (worker_backend.js) moves the zip byte half into
//   a worker (pdf.js MessageHandler over a module worker, with a
//   fake-worker fallback) and feeds the SAME assembly below through an
//   async zip adapter.
//
// The assembly is written against the async zip surface (`await
// zip.loadText(...)`) so both backends share it verbatim; the sync
// in-process zip simply flattens through the awaits. (The fresh-design
// foliate-based BookProxy prototype that preceded this lived in src/worker/
// and was removed with the foliate-js dependency; findings in the
// worker-prep doc §6.)

import { sourceToBytes } from "./source.js";
import { createZipSource } from "./pipeline/zip-source.js";
import { parseContainer, parsePackage } from "./pipeline/package.js";
import { parseToc, parseNCX } from "./pipeline/toc.js";
import { pathDirname } from "./pipeline/url.js";
import { createResourceCache } from "./pipeline/resources.js";
import { createRewriter } from "./pipeline/rewriter.js";
import { assembleSections, createBook } from "./pipeline/sections.js";

export { sourceToBytes };

const NCX_MEDIA_TYPE = "application/x-dtbncx+xml";

/**
 * Load the table of contents: the EPUB 3 nav document when the manifest
 * declares one, falling back to the EPUB 2 NCX (spine `toc` attribute, then
 * any NCX media-type item). Port of foliate-js epub.js:996-1013 — each parse
 * failure only warns and lets the fallback run.
 *
 * @param {object} zip zip source (sync or async `loadText`)
 * @param {object} pkgIR parsePackage output
 * @returns {Promise<Array<{label: string, href: string, subitems: Array|null}> | null>}
 */
async function loadToc(zip, pkgIR) {
  const items = [...pkgIR.manifest.values()];
  const navPath = items.find((item) => item.properties?.includes("nav"))?.href;
  if (navPath) {
    try {
      const toc = parseToc(await zip.loadText(navPath), { baseHref: pathDirname(navPath) });
      if (toc) return toc;
    } catch (e) {
      console.warn(e);
    }
  }
  // foliate resources.js:656-658 — spine toc attribute first, then any NCX
  const ncxPath =
    items.find((item) => item.id === pkgIR.tocId)?.href ??
    items.find((item) => item.mediaType === NCX_MEDIA_TYPE)?.href;
  if (ncxPath) {
    try {
      return parseNCX(await zip.loadText(ncxPath), { baseHref: pathDirname(ncxPath) });
    } catch (e) {
      console.warn(e);
    }
  }
  return null;
}

/**
 * Assemble the book over a zip source (sync `createZipSource` instance or
 * the worker backend's async adapter — both satisfy `loadText`/`loadBytes`/
 * `getSize`). Everything DOM-flavored (DOMParser parsing, URL rewriting,
 * the blob-URL cache) runs here, on the calling thread, per the red lines.
 *
 * @param {object} zip
 * @returns {Promise<{book: object, cache: object}>} the createBook shape
 *   plus the resource cache (the backend's destroy() needs it)
 */
export async function assembleEpubBook(zip) {
  const containerText = await zip.loadText("META-INF/container.xml");
  if (containerText == null) {
    throw new Error("Not an EPUB: missing META-INF/container.xml");
  }
  const opfPath = parseContainer(containerText);
  const pkgIR = parsePackage(containerText, await zip.loadText(opfPath));

  const cache = createResourceCache({ loadBytes: (n) => zip.loadBytes(n), getSize: zip.getSize });
  const rewriter = createRewriter({ zip, manifest: pkgIR.manifest, cache });
  const sections = assembleSections({ pkgIR, zip, rewriter, cache });
  const book = createBook({
    sections,
    metadata: pkgIR.metadata,
    toc: await loadToc(zip, pkgIR),
    dir: pkgIR.dir,
    rendition: pkgIR.rendition,
    events: cache.events,
  });
  return { book, cache };
}

/**
 * @typedef {Object} BookBackend
 * @property {(source: any) => Promise<any>} open Create the book from a
 *   source (string/URL/File/Blob/ArrayBuffer).
 * @property {() => any} book The book object (our pipeline's createBook
 *   shape: {sections, metadata, toc, dir, rendition, transformTarget}).
 * @property {() => void} [destroy] Release backend-owned resources (blob
 *   URLs etc.).
 */

/**
 * In-process backend: assemble the book from our own pipeline on the main
 * thread. The returned backend also exposes `destroy()` which revokes every
 * live blob URL in the resource cache — the engine calls it from destroy().
 * @returns {BookBackend}
 */
export function createInProcessBackend() {
  /** @type {object | null} the createResourceCache instance (for destroy) */
  let cache = null;
  return {
    async open(source) {
      const zip = createZipSource(await sourceToBytes(source));
      const assembled = await assembleEpubBook(zip);
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
