// WorkerBackend — the BookBackend implementation that moves the byte/parse
// half of the pipeline into a dedicated per-book worker
// (docs/plans/2026-10-15-epub-worker-prep.md, route (b): the worker holds
// the bytes and does inflation/pure parsing; DOMParser, the blob-URL cache
// and all geometry stay on the main thread, per the project red lines).
//
// Dual mode, modeled on pdf.js' PDFWorker→#setupFakeWorker:
// - "worker" (default in browsers): a module worker at
//   ./worker/book-worker.js, spoken to via pdf.js' MessageHandler (reused
//   from the viewer's own compiled subpath export).
// - "fake": the SAME worker module dynamically imported on the main thread,
//   connected over a MessageChannel — the fallback when Worker construction
//   fails and the mode Node unit tests use to exercise the protocol.
//
// Message notes:
// - File/Blob sources cross via structured clone (no byte copy); plain
//   ArrayBuffers are transferred (detached on the sender).
// - Reply payloads (entry bytes/text) are cloned — pdf.js' MessageHandler
//   callback path has no transfer list; per-entry sizes make that fine.
//   Moving createObjectURL itself into the worker (so resource bytes never
//   cross at all) is a possible later step — see the worker-prep doc §4.3.

import "./worker/compat.js";
import { MessageHandler } from "@document-kits/viewer/message-handler.mjs";

import { assembleEpubBook } from "./book_backend.js";
import { assembleMobiBook } from "./pipeline/mobi.js";
import { prebuiltURL } from "./pipeline/resources.js";

// Concurrent identical requests share one in-flight promise (prep doc §4.5
// — no pdf.js-grade task protocol needed at this scale).
const dedupe = (map, key, make) => {
  let promise = map.get(key);
  if (!promise) {
    promise = make();
    map.set(key, promise);
    promise.finally(() => map.delete(key)).catch(() => {});
  }
  return promise;
};

/**
 * Main-thread zip adapter over the worker: sync `entries()`/`getSize()` are
 * served from the open snapshot (everything sections.js:47 needs), while
 * `loadText`/`loadBytes` become RPC round-trips. `createBlobURL` is the
 * worker-side minting seam the rewriter prefers for pass-through resources
 * (images/fonts/media) — their bytes never cross back, only the URL does.
 */
function createWorkerZip(handler, revoke) {
  /** @type {Array<{filename: string, uncompressedSize: number}>} */
  let entries = [];
  const sizes = new Map();
  const inflightText = new Map();
  const inflightBytes = new Map();
  const inflightURL = new Map();

  return {
    initSnapshot(snapshot) {
      entries = snapshot.entries;
      for (const { filename, uncompressedSize } of entries) sizes.set(filename, uncompressedSize);
    },
    entries: () => entries,
    getSize: (filename) => sizes.get(filename) ?? 0,
    /** @returns {Promise<string|null>} */
    loadText(name) {
      return dedupe(inflightText, name, () => handler.sendWithPromise("loadText", { name }));
    },
    /** @returns {Promise<Uint8Array|null>} */
    loadBytes(name) {
      return dedupe(inflightBytes, name, () => handler.sendWithPromise("loadBytes", { name }));
    },
    /** @returns {Promise<string|null>} worker-minted blob URL, null entry */
    createBlobURL(name, mime) {
      return dedupe(inflightURL, name, () =>
        handler.sendWithPromise("makeObjectURL", { name, mime })
      );
    },
    revokeBlobURL: revoke,
  };
}

/**
 * Create the worker-backed BookBackend.
 *
 * @param {object} [options]
 * @param {"epub"|"mobi"} options.format which parse pipeline the worker runs
 * @param {"auto"|"worker"|"fake"} [options.mode] "auto" prefers a real
 *   worker and falls back to the fake worker when `Worker` is unavailable
 *   or construction throws; "fake"/"worker" force a mode.
 * @returns {import("./book_backend.js").BookBackend}
 */
export function createWorkerBackend({ format, mode = "auto" } = {}) {
  /** @type {Worker|null} */
  let worker = null;
  /** @type {MessageChannel|null} */
  let channel = null;
  /** @type {MessageHandler|null} */
  let handler = null;
  /** @type {object|null} resource cache (for destroy) */
  let cache = null;
  let destroyed = false;
  /** in-flight RPCs, rejected en masse on destroy (a terminated worker
   * would otherwise leave them pending forever) */
  const pending = new Set();

  const request = (action, data, transfer) => {
    if (!handler) throw new Error("worker backend: not open");
    if (destroyed) throw new Error("worker backend: destroyed");
    // wrapped so destroy() can reject requests a terminated worker would
    // otherwise leave pending forever
    return new Promise((resolve, reject) => {
      const entry = { reject };
      pending.add(entry);
      handler.sendWithPromise(action, data, transfer).then(
        (value) => {
          pending.delete(entry);
          resolve(value);
        },
        (err) => {
          pending.delete(entry);
          reject(err);
        }
      );
    });
  };

  // fire-and-forget revocation of worker-minted blob URLs (the main
  // thread's refcount cascade calls this; a dead worker is not an error)
  const revokeRPC = (url) => {
    if (!handler || destroyed) return;
    handler.send("revokeObjectURL", { url });
  };

  const ensureHandler = async () => {
    if (handler) return handler;
    if (mode === "worker" || (mode === "auto" && typeof Worker !== "undefined")) {
      try {
        worker = new Worker(new URL("./worker/book-worker.js", import.meta.url), {
          type: "module",
        });
        worker.onerror = (e) => {
          // module-load failure (e.g. no bundler rewriting bare imports) —
          // surface it; the host can fall back to `backend: "in-process"`
          console.warn("book worker error:", e.message ?? e);
        };
        handler = new MessageHandler("main", "worker", worker);
        return handler;
      } catch (e) {
        if (mode === "worker") throw e;
        // auto: fall through to the fake worker
      }
    }
    if (mode === "fake" || mode === "auto") {
      channel = new MessageChannel();
      const workerSide = await import("./worker/book-worker.js");
      workerSide.connect(channel.port2);
      channel.port2.start?.();
      channel.port1.start?.();
      handler = new MessageHandler("main", "worker", channel.port1);
      return handler;
    }
    throw new Error(`createWorkerBackend: unknown mode ${mode}`);
  };

  return {
    async open(source) {
      const h = await ensureHandler();
      // URL-string sources must resolve against the PAGE's base, not the
      // worker's module location (a Vite/webpack dev server serves the
      // worker from a different path) — absolutize before posting. Node
      // (fake mode) has no document base; tests pass buffers directly.
      let target = source;
      if (typeof source === "string" || source instanceof URL) {
        const base =
          typeof document !== "undefined"
            ? document.baseURI
            : globalThis.location?.href ?? undefined;
        target = base != null ? new URL(String(source), base).href : String(source);
      }
      // Only plain ArrayBuffers transfer: a typed view may alias a larger
      // buffer, and detaching that would break the caller. Blobs clone
      // without a byte copy; URL strings are fetched worker-side.
      const transfer = target instanceof ArrayBuffer ? [target] : [];
      const { snapshot } = await request("open", { format, source: target }, transfer);

      if (snapshot.kind === "epub") {
        const zip = createWorkerZip(h, revokeRPC);
        zip.initSnapshot(snapshot);
        const assembled = await assembleEpubBook(zip);
        cache = assembled.cache;
        this.book = assembled.book;
        return assembled.book;
      }
      if (snapshot.kind === "kf8" || snapshot.kind === "mobi6") {
        // RPC-backed prepared object — the same assembler `parseMobi` feeds
        // locally. sectionText replies merge into the main thread's
        // fragment-selector mirror inside the assembler (KF8); MOBI6
        // sectionText is a plain string. Binary resource replies arrive as
        // worker-minted blob URLs (prebuilt — bytes never cross); string
        // payloads (CSS intake) still cross as data.
        const inflightSection = new Map();
        const inflightResource = new Map();
        const book = await assembleMobiBook({
          kind: snapshot.kind,
          snapshot,
          sectionText: (index) =>
            dedupe(inflightSection, index, () => request("sectionText", { index })),
          resource: (key) =>
            dedupe(inflightResource, key, () =>
              request("resource", { key }).then(({ url, data, mime }) =>
                url != null ? { data: prebuiltURL(url, revokeRPC), mime } : { data, mime }
              )
            ),
        });
        this.book = book;
        return book;
      }
      throw new Error(`worker backend: unsupported snapshot kind ${snapshot.kind}`);
    },
    book: null,
    destroy() {
      destroyed = true;
      const error = new Error("book worker backend destroyed");
      for (const { reject } of pending) reject(error);
      pending.clear();
      worker?.terminate();
      worker = null;
      if (channel) {
        channel.port1.close();
        channel.port2.close();
        channel = null;
      }
      handler?.destroy?.();
      handler = null;
      // revoke every live blob URL in the resource cache (EPUB keeps the
      // cache in the backend; MOBI books carry their own destroy())
      cache?.destroy();
      cache = null;
      this.book?.destroy?.();
      this.book = null;
    },
  };
}
