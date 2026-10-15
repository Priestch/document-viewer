// FB2 tests: the pure halves (zip-magic sniff, encoding-aware decode, zip
// entry selection), the fake-worker protocol end to end (plain AND zipped
// containers), and the DOMParser wall (the conversion provably stays on the
// main thread). The converter itself (sections/TOC/resolveTOCHref) needs
// DOMParser + document.implementation, which Node lacks and which we
// deliberately do not polyfill (linkedom just for tests is not worth the
// divergence) — that half is covered by the browser demo run.
//
// Fixture: demos/public/alice.fb2 — generated with calibre
//   ebook-convert alice.epub alice.fb2
// (same provenance chain as alice.mobi; Alice in Wonderland, public domain).

import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";

import { decodeFB2Text, hasZipMagic, selectFB2Entry } from "../src/pipeline/fb2.js";
import { createWorkerBackend } from "../src/worker_backend.js";

const FIXTURE = new URL("../../../demos/public/alice.fb2", import.meta.url);
const fixtureBytes = readFileSync(FIXTURE);
// readFileSync may hand back a Buffer into a pooled ArrayBuffer (nonzero
// byteOffset) — slice the Buffer's exact window, not [0, byteLength).
const fixtureArrayBuffer = () =>
  fixtureBytes.buffer.slice(
    fixtureBytes.byteOffset,
    fixtureBytes.byteOffset + fixtureBytes.byteLength
  );
const fixtureView = () => new Uint8Array(fixtureArrayBuffer());

const encoder = /* @__PURE__ */ new TextEncoder();

test("hasZipMagic: PK\\x03\\x04 prefix only", () => {
  assert.equal(hasZipMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), true);
  assert.equal(hasZipMagic(encoder.encode("<?xml")), false);
  assert.equal(
    hasZipMagic(new Uint8Array([0x50, 0x4b, 0x05, 0x06])),
    false,
    "EOCD is not a local header"
  );
  assert.equal(hasZipMagic(new Uint8Array([0x50, 0x4b])), false, "truncated");
});

test("decodeFB2Text: utf-8 passthrough", () => {
  const text = '<?xml version="1.0" encoding="utf-8"?>\n<FictionBook>熵</FictionBook>';
  assert.equal(decodeFB2Text(encoder.encode(text)), text);
});

test("decodeFB2Text: re-decodes a declared legacy encoding", () => {
  // "Привет" in windows-1251 bytes (TextDecoder decodes it; we only need the
  // pre-encoded bytes — the utf-8 first pass mangles them but leaves the
  // ASCII declaration intact, which is exactly what the sniff reads)
  const cp1251 = Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
  const bytes = Buffer.concat([
    Buffer.from(`<?xml version="1.0" encoding="windows-1251"?>\n<a>`),
    cp1251,
    Buffer.from("</a>"),
  ]);
  assert.equal(
    decodeFB2Text(new Uint8Array(bytes)),
    '<?xml version="1.0" encoding="windows-1251"?>\n<a>Привет</a>'
  );
});

test("decodeFB2Text: no declaration passes through as-is", () => {
  const text = "<FictionBook>plain</FictionBook>";
  assert.equal(decodeFB2Text(encoder.encode(text)), text);
});

test("selectFB2Entry: prefers the .fb2 entry, falls back to the first", () => {
  const entries = [{ filename: "meta.txt" }, { filename: "book.fb2" }, { filename: "more.txt" }];
  assert.equal(selectFB2Entry(entries).filename, "book.fb2");
  assert.equal(selectFB2Entry([{ filename: "whatever" }]).filename, "whatever");
});

test("decodeFB2Text: fixture round-trips as utf-8", () => {
  const text = decodeFB2Text(fixtureView());
  assert.match(text, /^<\?xml/);
  assert.match(text, /<FictionBook/);
  // the fixture declares UTF-8 (uppercase) — no re-decode needed
  assert.ok(text.includes("Alice"), "decoded text is readable");
});

test("book-worker protocol (fake): plain fb2 crosses as one text snapshot", async () => {
  const { connect } = await import("../src/worker/book-worker.js");
  const { MessageHandler } = await import("@document-kits/viewer/message-handler.mjs");
  const { port1, port2 } = new MessageChannel();
  const workerSide = connect(port2);
  port2.start();
  port1.start();
  const mainSide = new MessageHandler("main", "worker", port1);
  try {
    const bytes = fixtureArrayBuffer();
    const { snapshot } = await mainSide.sendWithPromise("open", { format: "fb2", source: bytes }, [
      bytes,
    ]);
    assert.equal(snapshot.kind, "fb2");
    assert.equal(snapshot.name, null, "ArrayBuffer sources carry no name");
    assert.equal(snapshot.text, decodeFB2Text(fixtureView()), "snapshot text = local decode");
  } finally {
    workerSide.destroy?.();
    mainSide.destroy?.();
    port1.close();
    port2.close();
  }
});

test("book-worker protocol (fake): zipped fb2 unzips + decodes worker-side", async () => {
  // .fb2.zip container: zip magic (not the extension) routes it through the
  // unzip path; the .fb2 entry is selected among decoys
  const zipped = zipSync({
    "readme.txt": encoder.encode("not a book"),
    "book.fb2": fixtureView(),
  });
  const { connect } = await import("../src/worker/book-worker.js");
  const { MessageHandler } = await import("@document-kits/viewer/message-handler.mjs");
  const { port1, port2 } = new MessageChannel();
  const workerSide = connect(port2);
  port2.start();
  port1.start();
  const mainSide = new MessageHandler("main", "worker", port1);
  try {
    const { snapshot } = await mainSide.sendWithPromise("open", { format: "fb2", source: zipped });
    assert.equal(snapshot.kind, "fb2");
    assert.equal(
      snapshot.text,
      decodeFB2Text(fixtureView()),
      "zipped and plain decode identically"
    );
  } finally {
    workerSide.destroy?.();
    mainSide.destroy?.();
    port1.close();
    port2.close();
  }
});

test("worker backend (fake): fb2 open reaches main-thread conversion (DOMParser wall)", async () => {
  const backend = createWorkerBackend({ format: "fb2", mode: "fake" });
  try {
    // the worker half (decode) completes; the makeFB2 conversion is the
    // main-thread DOM half — Node has no DOMParser, so open() must reject at
    // exactly the red-line boundary
    await assert.rejects(
      () => backend.open(fixtureArrayBuffer()),
      (err) => /DOMParser/.test(err?.message ?? "")
    );
  } finally {
    backend.destroy();
  }
});
