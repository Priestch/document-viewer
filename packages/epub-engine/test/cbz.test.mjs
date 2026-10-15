// CBZ tests: pure page-file picking, the in-process book shape over the real
// fixture, blob-URL lifecycle (mint/cascade — Node has URL.createObjectURL),
// fake-worker end-to-end parity against the in-process baseline, protocol
// snapshot/mint parity, and the DOMParser wall for createDocument(). The
// paginator-driven stable-pagination surface is covered by the demos E2E.
//
// Fixture: demos/public/comic.cbz — 4 tiny generated PNGs (page_001…004)
// zipped in SHUFFLED insertion order plus a ComicInfo.xml, so the central
// directory order differs from page order (proves natural-numeric collation)
// and a non-image entry rides along (proves filtering). Regenerate:
//   convert -size 96x144 xc:'#c0392b' page_001.png
//   convert -size 96x144 xc:'#27ae60' page_002.png
//   convert -size 96x144 xc:'#2980b9' page_003.png
//   convert -size 96x144 gradient:black-white page_004.png
//   zip comic.cbz page_003.png page_001.png page_004.png page_002.png
//   zip comic.cbz ComicInfo.xml   # (echo "not an image" > ComicInfo.xml)

import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { assembleCbzBook, imageMime, pickComicPageFiles } from "../src/pipeline/cbz.js";
import { createZipSource } from "../src/pipeline/zip-source.js";
import { createWorkerBackend } from "../src/worker_backend.js";

const FIXTURE = new URL("../../../demos/public/comic.cbz", import.meta.url);
const fixtureBytes = readFileSync(FIXTURE);
// readFileSync may hand back a Buffer into a pooled ArrayBuffer (nonzero
// byteOffset) — slice the Buffer's exact window, not [0, byteLength).
const fixtureArrayBuffer = () =>
  fixtureBytes.buffer.slice(
    fixtureBytes.byteOffset,
    fixtureBytes.byteOffset + fixtureBytes.byteLength
  );

const PAGE_FILES = ["page_001.png", "page_002.png", "page_003.png", "page_004.png"];

// Node 18 has no global CustomEvent (Node ≥19 does); the resource cache
// dispatches one per createURL. The EPUB tests never reach createURL in Node
// (the DOMParser wall comes first), the cbz load path does — polyfill just
// enough for it. Browsers all have it.
if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent extends Event {
    #detail;
    constructor(type, options = {}) {
      super(type, options);
      this.#detail = options.detail ?? null;
    }
    get detail() {
      return this.#detail;
    }
  };
}

test("pickComicPageFiles: filters non-images and sorts numerically", () => {
  const entries = [
    { filename: "page_010.png" },
    { filename: "ComicInfo.xml" },
    { filename: "page_002.png" },
    { filename: "cover.jpeg" },
    { filename: "notes.txt" },
  ];
  // cover first by collation, page_002 before page_010 (numeric, not lexical)
  assert.deepEqual(pickComicPageFiles(entries), ["cover.jpeg", "page_002.png", "page_010.png"]);
});

test("pickComicPageFiles: throws without image entries", () => {
  assert.throws(() => pickComicPageFiles([{ filename: "a.txt" }]), /No supported image files/);
});

test("imageMime: extension map with case-insensitive fallback", () => {
  assert.equal(imageMime("a.PNG"), "image/png");
  assert.equal(imageMime("b.jpg"), "image/jpeg");
  assert.equal(imageMime("c.webp"), "image/webp");
  assert.equal(imageMime("d.xyz"), "application/octet-stream");
});

test("cbz book (in-process): fixture pages in numeric order, non-images dropped", async () => {
  const zip = createZipSource(fixtureArrayBuffer());
  const { book, cache } = await assembleCbzBook({ zip, name: "comic.cbz" });
  try {
    assert.deepEqual(
      book.sections.map((s) => s.id),
      PAGE_FILES
    );
    assert.equal(book.metadata.title, "comic.cbz");
    assert.deepEqual(
      book.toc,
      PAGE_FILES.map((filename) => ({ label: filename, href: filename }))
    );
    assert.deepEqual(book.rendition, { layout: "pre-paginated" });
    for (const section of book.sections) {
      assert.equal(section.linear, "yes");
      assert.equal(section.size, zip.getSize(section.id));
    }
  } finally {
    cache.destroy();
  }
});

test("cbz book: title falls back when the archive has no name", async () => {
  const { book, cache } = await assembleCbzBook({ zip: createZipSource(fixtureArrayBuffer()) });
  try {
    assert.equal(book.metadata.title, "Comic Book");
  } finally {
    cache.destroy();
  }
});

test("cbz section load()/unload(): page+image mint, unref cascades to both", async () => {
  const { book, cache } = await assembleCbzBook({ zip: createZipSource(fixtureArrayBuffer()) });
  try {
    const section = book.sections[0];
    assert.equal(section.url, null, "no URL before first load");
    const url = await section.load();
    assert.match(url, /^blob:/, "load() returns the page wrapper's blob URL");
    assert.equal(section.url, url);
    assert.equal(cache.size(), 2, "image + page wrapper cached");
    // reload is idempotent (same URL, no new cache entries)
    assert.equal(await section.load(), url);
    assert.equal(cache.size(), 2);
    section.unload();
    assert.equal(cache.size(), 0, "unref(page) cascades to the child image");
  } finally {
    cache.destroy();
  }
});

test("worker backend (fake): cbz book matches in-process baseline", async () => {
  const baseline = await assembleCbzBook({ zip: createZipSource(fixtureArrayBuffer()) });
  const backend = createWorkerBackend({ format: "cbz", mode: "fake" });
  try {
    // ArrayBuffer source: no File in Node, so the snapshot name is null and
    // the title takes the fallback (the named path is browser-only)
    const book = await backend.open(fixtureArrayBuffer());
    assert.equal(book.metadata.title, "Comic Book");
    assert.deepEqual(
      book.sections.map((s) => s.id),
      baseline.book.sections.map((s) => s.id)
    );
    assert.deepEqual(book.toc, baseline.book.toc);
    for (const [i, section] of book.sections.entries()) {
      assert.equal(section.size, baseline.book.sections[i].size, `section ${i} size`);
      assert.equal(section.linear, baseline.book.sections[i].linear, `section ${i} linear`);
    }
    // the worker-backed load path: image minted worker-side (bytes never
    // cross), wrapper minted main-thread, unload cascades through the cache
    const url = await book.sections[0].load();
    assert.match(url, /^blob:/);
    book.sections[0].unload();
  } finally {
    baseline.cache.destroy();
    backend.destroy();
  }
});

test("worker backend (fake): createDocument stays behind the DOMParser wall", async () => {
  const backend = createWorkerBackend({ format: "cbz", mode: "fake" });
  try {
    const book = await backend.open(fixtureArrayBuffer());
    // open() is DOM-free (the wrapper is a string); the Document exists only
    // main-thread-side — Node has no DOMParser, so this must reject at
    // exactly the red-line boundary.
    await assert.rejects(
      () => book.sections[0].createDocument(),
      (err) => /DOMParser/.test(err?.message ?? "")
    );
  } finally {
    backend.destroy();
  }
});

test("book-worker protocol (fake): cbz snapshot + worker-side image mint", async () => {
  const { connect } = await import("../src/worker/book-worker.js");
  const { MessageHandler } = await import("@document-kits/viewer/message-handler.mjs");
  const { port1, port2 } = new MessageChannel();
  const workerSide = connect(port2);
  port2.start();
  port1.start();
  const mainSide = new MessageHandler("main", "worker", port1);
  try {
    const local = createZipSource(fixtureArrayBuffer());
    const bytes = fixtureArrayBuffer();
    const { snapshot } = await mainSide.sendWithPromise("open", { format: "cbz", source: bytes }, [
      bytes,
    ]);
    assert.equal(snapshot.kind, "cbz");
    assert.equal(snapshot.name, null, "ArrayBuffer sources carry no name");
    assert.deepEqual(snapshot.entries, local.entries(), "snapshot = whole central directory");

    const url = await mainSide.sendWithPromise("makeObjectURL", {
      name: "page_001.png",
      mime: "image/png",
    });
    assert.match(url, /^blob:/, "page image mints worker-side");
    mainSide.send("revokeObjectURL", { url });
  } finally {
    workerSide.destroy?.();
    mainSide.destroy?.();
    port1.close();
    port2.close();
  }
});
