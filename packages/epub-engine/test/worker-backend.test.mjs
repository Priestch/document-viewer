// WorkerBackend protocol tests, fake-worker mode (the same book-worker
// module dynamically imported on the main thread, spoken to over a
// MessageChannel — Node has no Web Worker, and pdf.js' MessageHandler runs
// fine over MessagePorts, which is exactly the fallback contract).
//
// Parity baseline: the in-process createZipSource over the same fixture.
// The DOM-flavored half (assembleEpubBook) needs DOMParser and is covered
// by the demos E2E, not here.

import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { createWorkerBackend } from "../src/worker_backend.js";
import { createZipSource } from "../src/pipeline/zip-source.js";
import { parseMobi, prepareMobi } from "../src/pipeline/mobi.js";

const FIXTURE = new URL("../../../demos/public/alice.epub", import.meta.url);
const fixtureBytes = readFileSync(FIXTURE);
const MOBI_FIXTURE = new URL("../../../demos/public/alice.mobi", import.meta.url);
const mobiFixtureBytes = readFileSync(MOBI_FIXTURE);
const MOBI6_FIXTURE = new URL("./fixtures/alice-mobi6.mobi", import.meta.url);
const mobi6FixtureBytes = readFileSync(MOBI6_FIXTURE);

// The MOBI assemblers are parse-level (building the book needs no
// DOMParser — sections/blob URLs stay lazy), so the worker backend can be
// driven END TO END in Node here, directly against a parseMobi baseline.
for (const [name, bytes] of [
  ["KF8 (combo alice.mobi)", mobiFixtureBytes],
  ["MOBI6 (alice-mobi6.mobi)", mobi6FixtureBytes],
]) {
  test(`worker backend (fake): ${name} book matches parseMobi baseline`, async () => {
    const baseline = await parseMobi(bytes, { unzlib: (x) => x });
    const basePrepared = prepareMobi(bytes, { unzlib: (x) => x });
    const backend = createWorkerBackend({ format: "mobi", mode: "fake" });
    try {
      const book = await backend.open(bytes.buffer.slice(0));
      assert.equal(book.metadata.title, baseline.metadata.title);
      assert.deepEqual(book.metadata.author, baseline.metadata.author);
      assert.equal(book.sections.length, baseline.sections.length);
      for (const [i, section] of book.sections.entries()) {
        assert.equal(section.size, baseline.sections[i].size, `section ${i} size`);
        assert.equal(section.linear, baseline.sections[i].linear, `section ${i} linear`);
      }
      assert.deepEqual(book.toc, baseline.toc);
      assert.equal(book.dir, baseline.dir);
      // TOC hrefs resolve synchronously on the main-thread side (the MOBI6
      // Node fallback TOC carries bare-index hrefs that resolve to null in
      // BOTH books — compare like for like)
      for (const item of book.toc) {
        assert.equal(
          book.resolveTOCHref(item.href)?.index,
          baseline.resolveTOCHref(item.href)?.index,
          item.href
        );
      }
      // section text crosses the seam identically (DOMParser-ing it stays
      // main-thread and is covered by the browser demo run)
      const { connect } = await import("../src/worker/book-worker.js");
      const { port1, port2 } = new MessageChannel();
      const workerSide = connect(port2);
      port2.start();
      port1.start();
      const { MessageHandler } = await import("@document-kits/viewer/message-handler.mjs");
      const mainSide = new MessageHandler("main", "worker", port1);
      try {
        await mainSide.sendWithPromise("open", { format: "mobi", source: bytes.buffer.slice(0) });
        for (const i of [0, 1, Math.floor(book.sections.length / 2)]) {
          const expected = await basePrepared.sectionText(i);
          const actual = await mainSide.sendWithPromise("sectionText", { index: i });
          if (basePrepared.kind === "kf8") {
            assert.equal(actual.str, expected.str, `section ${i} text`);
            assert.deepEqual(actual.selectors, expected.selectors, `section ${i} selectors`);
          } else {
            assert.equal(actual, expected, `section ${i} text`);
          }
        }
      } finally {
        workerSide.destroy?.();
        mainSide.destroy?.();
        port1.close();
        port2.close();
      }
      book.destroy();
    } finally {
      backend.destroy();
    }
  });
}

test("worker backend (fake): open reaches main-thread DOM assembly (DOMParser wall)", async () => {
  const backend = createWorkerBackend({ format: "epub", mode: "fake" });
  try {
    // open() runs the worker half (snapshot + protocol round trips) and
    // then the DOM-flavored assembly. Node has no DOMParser, so the expected
    // outcome is the assembly failing at exactly the red-line boundary —
    // proving the worker half completed without touching the DOM.
    await assert.rejects(
      () => backend.open(fixtureBytes.buffer.slice(0)),
      (err) => /DOMParser/.test(err?.message ?? "")
    );
  } finally {
    backend.destroy();
  }
});

// Drive the protocol directly: the worker half of the backend is exactly
// `connect(port)` + the actions below, so we mirror them here to assert
// payload parity without the DOM-dependent assembly.
test("book-worker protocol (fake): open/loadText/loadBytes parity with createZipSource", async () => {
  const { connect } = await import("../src/worker/book-worker.js");
  const { port1, port2 } = new MessageChannel();
  const workerSide = connect(port2);
  port2.start();
  port1.start();
  const mainSide = new (await import("@document-kits/viewer/message-handler.mjs")).MessageHandler(
    "main",
    "worker",
    port1
  );

  try {
    const local = createZipSource(fixtureBytes.buffer.slice(0));
    const bytes = fixtureBytes.buffer.slice(0);
    const { snapshot } = await mainSide.sendWithPromise(
      "open",
      { format: "epub", source: bytes },
      [bytes]
    );
    // plain ArrayBuffer was transferred, not cloned
    assert.equal(bytes.byteLength, 0, "source ArrayBuffer should be transferred");

    assert.equal(snapshot.kind, "epub");
    assert.deepEqual(
      snapshot.entries,
      local.entries(),
      "worker snapshot entries equal in-process central directory"
    );

    const names = [
      "META-INF/container.xml",
      ...local
        .entries()
        .slice(0, 6)
        .map((e) => e.filename),
    ];
    for (const name of names) {
      const workerText = await mainSide.sendWithPromise("loadText", { name });
      assert.equal(workerText, local.loadText(name), `loadText parity: ${name}`);
      const workerBytes = await mainSide.sendWithPromise("loadBytes", { name });
      const localBytes = local.loadBytes(name);
      assert.deepEqual(workerBytes, localBytes, `loadBytes parity: ${name}`);
    }

    const missing = await mainSide.sendWithPromise("loadText", { name: "no/such.entry" });
    assert.equal(missing, null, "missing entries resolve null (in-process semantics)");

    // worker-side blob minting: an image entry comes back as a URL STRING —
    // its bytes never cross the seam (this is the no-copy resource path)
    const imageEntry = snapshot.entries.find((e) => /\.(jpe?g|png|gif|svg)$/i.test(e.filename));
    if (imageEntry) {
      const url = await mainSide.sendWithPromise("makeObjectURL", {
        name: imageEntry.filename,
        mime: "image/jpeg",
      });
      assert.equal(typeof url, "string", `${imageEntry.filename} mints a blob URL`);
      assert.match(url, /^blob:/, "blob URL shape");
      const again = await mainSide.sendWithPromise("makeObjectURL", {
        name: imageEntry.filename,
        mime: "image/jpeg",
      });
      assert.notEqual(again, url, "repeated mints create distinct URLs");
      mainSide.send("revokeObjectURL", { url });
      mainSide.send("revokeObjectURL", { url: again });
    }
    const noUrl = await mainSide.sendWithPromise("makeObjectURL", {
      name: "no/such.entry",
      mime: "image/jpeg",
    });
    assert.equal(noUrl, null, "missing entries mint null");
  } finally {
    workerSide.destroy?.();
    mainSide.destroy?.();
    port1.close();
    port2.close();
  }
});
