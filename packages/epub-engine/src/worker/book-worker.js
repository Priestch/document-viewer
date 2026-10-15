// The book worker — the byte/parse half of the worker-ization seam
// (docs/plans/2026-10-15-epub-worker-prep.md, route (b)).
//
// What lives here: zip inflation (EPUB), the pure MOBI record decode, and
// the minting of resource blob URLs (images/fonts/media — their bytes
// never cross back; URL.createObjectURL works in workers and the URLs are
// valid cross-context, prep doc §4.3). What must NOT live here:
// DOMParser (absent in Chromium workers), geometry — the DOM-flavored
// pipeline stays on the main thread.
//
// Dual mode (pdf.js fake-worker pattern): the module registers itself on a
// WorkerGlobalScope when loaded as a real worker, but also exports
// `connect(port)` so the main thread can run the very same code over a
// MessageChannel (worker_backend.js "fake" mode — also how Node unit tests
// exercise the protocol without Web Workers).

import "./compat.js"; // Promise statics for pdf.js' MessageHandler (Node)
import { MessageHandler } from "@document-kits/viewer/message-handler.mjs";
import { unzlibSync } from "fflate";

import { sourceToBytes } from "../source.js";
import { createZipSource } from "../pipeline/zip-source.js";
import { prepareMobi } from "../pipeline/mobi.js";

/** A display name for the snapshot: File.name crosses the seam via
 * structured clone; URL sources get their basename. */
const sourceName = (source) => {
  if (typeof source?.name === "string" && source.name) return source.name;
  if (typeof source === "string" || source instanceof URL) {
    return String(source).split("/").pop()?.split("?")[0] || null;
  }
  return null;
};

/**
 * Mint worker-side blob URLs and track them for revocation. The main
 * thread's refcount cascade routes `revokeObjectURL` back here.
 */
function createBlobMinter() {
  const urls = new Set();
  return {
    /** @returns {string|null} null when there are no bytes to blob */
    mint(data, mime) {
      if (data == null) return null;
      const url = URL.createObjectURL(new Blob([data], { type: mime }));
      urls.add(url);
      return url;
    },
    revoke(url) {
      if (urls.delete(url)) URL.revokeObjectURL(url);
    },
  };
}

/**
 * Wire the worker-side handler onto a port (a real worker `self` or a
 * MessageChannel port in fake-worker mode).
 * @param {MessagePort|WorkerGlobalScope} port
 */
export function connect(port) {
  const handler = new MessageHandler("worker", "main", port);
  const blobs = createBlobMinter();

  /** @type {ReturnType<typeof createZipSource>|null} EPUB zip state */
  let zip = null;
  /** @type {ReturnType<typeof prepareMobi>|null} MOBI prepared state */
  let mobi = null;

  handler.on("open", async ({ format, source }) => {
    if (zip != null || mobi != null) throw new Error("book-worker: already open");
    const bytes = await sourceToBytes(source);
    if (format === "epub") {
      zip = createZipSource(bytes);
      return {
        snapshot: {
          kind: "epub",
          // the whole central directory (names + uncompressed sizes) —
          // everything the main thread's sync getSize()/entries() need
          entries: zip.entries(),
        },
      };
    }
    if (format === "cbz") {
      // same zip state as epub: the loadBytes/makeObjectURL/revokeObjectURL
      // RPCs below are gated on `zip` and serve cbz unchanged — the images
      // mint worker-side, bytes never cross
      zip = createZipSource(bytes);
      return { snapshot: { kind: "cbz", entries: zip.entries(), name: sourceName(source) } };
    }
    if (format === "mobi") {
      mobi = prepareMobi(bytes, { unzlib: unzlibSync });
      return { snapshot: mobi.snapshot };
    }
    throw new Error(`book-worker: unsupported format ${format}`);
  });

  handler.on("loadText", ({ name }) => (zip ? zip.loadText(name) : null));
  handler.on("loadBytes", ({ name }) => (zip ? zip.loadBytes(name) : null));

  // Worker-side blob minting: pass-through resources (images, fonts, media)
  // never send their bytes across the seam — only the minted URL does.
  handler.on("makeObjectURL", ({ name, mime }) => blobs.mint(zip?.loadBytes(name), mime));
  handler.on("revokeObjectURL", ({ url }) => blobs.revoke(url));

  // MOBI: sectionText returns {str, selectors} (KF8) or a plain string
  // (MOBI6 — the assembler adapts by snapshot kind)
  handler.on("sectionText", ({ index }) => (mobi ? mobi.sectionText(index) : null));
  // resource key: KF8 kindle: URI strings, MOBI6 recindex-1 numbers.
  // Binary records mint worker-side; string payloads (CSS intake output,
  // which the main thread must rewrite anyway) still cross as data.
  handler.on("resource", ({ key }) => {
    if (!mobi) return null;
    const { data, mime } = mobi.resource(key);
    if (typeof data === "string") return { data, mime };
    return { url: blobs.mint(data, mime), mime };
  });

  return handler;
}

// Real-worker self-registration. The guard keeps the module inert when it
// is dynamically imported onto the main thread (fake-worker mode) — it must
// never touch window.onmessage.
/* global WorkerGlobalScope */
if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
  connect(self);
}
