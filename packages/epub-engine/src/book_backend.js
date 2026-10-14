// BookBackend — the worker-ization seam (docs/plans/2026-10-15-epub-worker-prep.md).
//
// EpubEngine consumes `backend.open(source)` / `backend.book` instead of
// assembling the book itself. The in-process implementation below builds OUR
// book through the own pipeline (zip-source → package → toc → resources →
// rewriter → sections); a future worker backend would move parts of that
// chain off the main thread behind the same seam (fresh design — the
// foliate-based BookProxy prototype lived in src/worker/ and was removed
// with the foliate-js dependency; findings in the worker-prep doc §6).

import { createZipSource } from "./pipeline/zip-source.js";
import { parseContainer, parsePackage } from "./pipeline/package.js";
import { parseToc, parseNCX } from "./pipeline/toc.js";
import { pathDirname } from "./pipeline/url.js";
import { createResourceCache } from "./pipeline/resources.js";
import { createRewriter } from "./pipeline/rewriter.js";
import { assembleSections, createBook } from "./pipeline/sections.js";

const NCX_MEDIA_TYPE = "application/x-dtbncx+xml";

/**
 * Normalize any supported source (File/Blob/URL string/URL/ArrayBuffer/
 * typed-array view) to raw bytes. Exported for the MOBI backend, which uses
 * the same source surface.
 * @param {any} source
 * @returns {Promise<ArrayBuffer>}
 */
export async function sourceToBytes(source) {
  if (source instanceof ArrayBuffer) return source;
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  // File and Blob both carry arrayBuffer()
  if (source && typeof source.arrayBuffer === "function") return source.arrayBuffer();
  if (typeof source === "string" || source instanceof URL) {
    const response = await fetch(String(source));
    if (!response.ok) throw new Error(`Failed to fetch ${String(source)}: ${response.status}`);
    return response.arrayBuffer();
  }
  throw new Error(`Unsupported book source: ${source}`);
}

/**
 * Load the table of contents: the EPUB 3 nav document when the manifest
 * declares one, falling back to the EPUB 2 NCX (spine `toc` attribute, then
 * any NCX media-type item). Port of foliate-js epub.js:996-1013 — each parse
 * failure only warns and lets the fallback run.
 *
 * @param {object} zip createZipSource instance
 * @param {object} pkgIR parsePackage output
 * @returns {Array<{label: string, href: string, subitems: Array|null}> | null}
 */
function loadToc(zip, pkgIR) {
  const items = [...pkgIR.manifest.values()];
  const navPath = items.find((item) => item.properties?.includes("nav"))?.href;
  if (navPath) {
    try {
      const toc = parseToc(zip.loadText(navPath), { baseHref: pathDirname(navPath) });
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
      return parseNCX(zip.loadText(ncxPath), { baseHref: pathDirname(ncxPath) });
    } catch (e) {
      console.warn(e);
    }
  }
  return null;
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
      const containerText = zip.loadText("META-INF/container.xml");
      if (containerText == null) {
        throw new Error("Not an EPUB: missing META-INF/container.xml");
      }
      const opfPath = parseContainer(containerText);
      const pkgIR = parsePackage(containerText, zip.loadText(opfPath));

      cache = createResourceCache({ loadBytes: zip.loadBytes, getSize: zip.getSize });
      const rewriter = createRewriter({ zip, manifest: pkgIR.manifest, cache });
      const sections = assembleSections({ pkgIR, zip, rewriter, cache });
      const book = createBook({
        sections,
        metadata: pkgIR.metadata,
        toc: loadToc(zip, pkgIR),
        dir: pkgIR.dir,
        rendition: pkgIR.rendition,
        events: cache.events,
      });
      this.book = book;
      return book;
    },
    book: null,
    destroy() {
      cache?.destroy();
      cache = null;
      this.book = null;
    },
  };
}
