// MOBI parser unit tests (parse layer only — no Blob/URL.createObjectURL or
// DOMParser in Node; the browser acceptance run covers section load()).
//
// Fixtures:
// - demos/public/alice.mobi — freely licensed (public domain), generated with
//   `ebook-convert alice.epub alice.mobi --mobi-file-type=both`; a "combo"
//   file whose MOBI6 part carries a KF8 (AZW3) part behind the EXTH boundary.
// - /tmp/pwdrive/mobi-test.mobi — a real Chinese combo book (personal copy,
//   NOT committed); these tests skip when it is absent.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseMobi, inspectMobi, isMobi } from "../src/pipeline/mobi.js";

const alicePath = fileURLToPath(new URL("../../../demos/public/alice.mobi", import.meta.url));
const aliceBytes = readFileSync(alicePath);
const bigBookPath = "/tmp/pwdrive/mobi-test.mobi";
const bigBookBytes = existsSync(bigBookPath) ? readFileSync(bigBookPath) : null;

test("isMobi sniffs the BOOKMOBI PDB type", () => {
  assert.equal(isMobi(aliceBytes), true);
  assert.equal(isMobi(new Uint8Array(200)), false);
  const epubBytes = readFileSync(
    fileURLToPath(new URL("../../../demos/public/alice.epub", import.meta.url))
  );
  assert.equal(isMobi(epubBytes), false);
});

test("inspectMobi reads the PDB table and detects the combo KF8 flip", () => {
  const info = inspectMobi(aliceBytes);
  // combo file: record 0 is MOBI6 (version 6) but EXTH boundary points at a
  // KF8 part, which MOBI.open flips to — so version reports 8.
  // PDB type/creator are the 4+4 bytes isMobi concatenates into BOOKMOBI
  assert.equal(info.type, "BOOK");
  assert.equal(info.creator, "MOBI");
  assert.ok(info.numRecords > 10, `numRecords=${info.numRecords}`);
  assert.equal(info.isKF8, true);
  assert.equal(info.version, 8);
  assert.equal(info.encoding, 65001); // UTF-8
  assert.ok(info.exthKeys.includes("title"), JSON.stringify(info.exthKeys));
  assert.equal(info.title, "Alice's Adventures in Wonderland");
});

test("parseMobi builds the foliate-shaped book from the KF8 part", async () => {
  const book = await parseMobi(aliceBytes, { unzlib: (x) => x });
  // metadata
  assert.equal(book.metadata.title, "Alice's Adventures in Wonderland");
  assert.deepEqual(book.metadata.author, ["Lewis Carroll"]);
  assert.equal(book.metadata.identifier, String(Number(book.metadata.identifier)));
  // sections: spine-shaped, lazy, sized
  assert.ok(book.sections.length >= 12, `sections=${book.sections.length}`);
  for (const [i, section] of book.sections.entries()) {
    assert.equal(typeof section.load, "function", `section ${i} load`);
    assert.equal(typeof section.unload, "function", `section ${i} unload`);
    assert.equal(typeof section.createDocument, "function", `section ${i} createDocument`);
    assert.ok(section.size > 0, `section ${i} size`);
    assert.ok(section.linear === "yes" || section.linear === "no", `section ${i} linear`);
    assert.equal(section.cfi, undefined, "MOBI sections carry no CFI (engine fakes one)");
  }
  // TOC from the INDX records: labels + kindle:pos hrefs
  assert.ok(book.toc.length >= 5, `toc=${book.toc.length}`);
  for (const item of book.toc) {
    assert.ok(item.label, "toc label");
    assert.ok(/^kindle:pos:fid:\w+:off:\w+$/.test(item.href), item.href);
  }
  assert.ok(
    book.toc.some((item) => item.label.includes("Rabbit-Hole")),
    book.toc.map((t) => t.label).join(" | ")
  );
  // book shape consumed by the paginator/engine
  assert.equal(book.dir, "ltr");
  assert.deepEqual(book.rendition, { layout: "reflowable" });
  assert.ok(
    book.transformTarget instanceof EventTarget,
    "transformTarget (resource cache events)"
  );
  assert.equal(typeof book.destroy, "function");
  assert.equal(typeof book.resolveTOCHref, "function");
  // TOC hrefs resolve back into section indices
  for (const item of book.toc) {
    const resolved = book.resolveTOCHref(item.href);
    assert.ok(resolved && resolved.index >= 0 && resolved.index < book.sections.length, item.href);
  }
  book.destroy();
});

test("parseMobi resolves kindle:pos hrefs to real fragment anchors after loadText", async () => {
  const book = await parseMobi(aliceBytes, { unzlib: (x) => x });
  const second = book.toc[1]; // "Down The Rabbit-Hole"
  const resolved = book.resolveTOCHref(second.href);
  assert.equal(resolved.index, 3); // verified against the skeleton tables
  book.destroy();
});

test("parseMobi rejects non-MOBI bytes with a clear error", async () => {
  await assert.rejects(parseMobi(new Uint8Array([0, 0, 0, 0])), /Not a MOBI book/);
});

test("pure MOBI6 book: mbp:pagebreak sections, filepos TOC (parse layer)", async () => {
  const bytes = readFileSync(
    fileURLToPath(new URL("./fixtures/alice-mobi6.mobi", import.meta.url))
  );
  // generated with --mobi-file-type=old: no EXTH boundary, stays MOBI6
  const info = inspectMobi(bytes);
  assert.equal(info.isKF8, false);
  assert.equal(info.version, 6);
  assert.equal(info.compression, 2, "PalmDOC compression");

  const book = await parseMobi(bytes, { unzlib: (x) => x });
  assert.equal(book.metadata.title, "Alice's Adventures in Wonderland");
  // sections split at <mbp:pagebreak>
  assert.ok(book.sections.length > 5, `sections=${book.sections.length}`);
  // MOBI6 has no INDX NCX TOC at our seam: guide TOC (needs DOMParser — not
  // available in Node) falls back to per-section labels
  assert.equal(book.toc.length, book.sections.length);
  assert.equal(book.toc[0].label, "Section 1");
  assert.equal(book.dir, "ltr");
  assert.deepEqual(book.rendition, { layout: "reflowable" });
  book.destroy();
});

// ---- the real Chinese book (skipped when the personal copy is absent) ----

test("real Chinese combo book: metadata, sections, TOC (parse layer)", async (t) => {
  if (!bigBookBytes) return t.skip(`${bigBookPath} not present`);
  const book = await parseMobi(bigBookBytes, { unzlib: (x) => x });
  assert.ok(book.metadata.title.includes("囚徒健身"), book.metadata.title);
  assert.deepEqual(book.metadata.author, ["保罗•威德"]);
  assert.deepEqual(book.metadata.language, ["zh-cn"]);
  assert.ok(book.sections.length > 5, `sections=${book.sections.length}`);
  assert.equal(book.sections.length, 144);
  assert.ok(book.toc.length >= 4);
  assert.ok(book.toc[0].label.includes("总目录"), book.toc[0].label);
  // every top-level TOC href resolves into range
  for (const item of book.toc) {
    const resolved = book.resolveTOCHref(item.href);
    assert.ok(resolved && resolved.index >= 0 && resolved.index < book.sections.length);
  }
  book.destroy();
});
