// Acceptance [N] for M1: createZipSource over the real demo book.
//
// Size sanity anchors (from `unzip -l demos/public/alice.epub`):
//   8369  OPS/chapter_001.xhtml
//  36192  OPS/images/cover_th.jpg
//   5110  OPS/package.opf
//    240  META-INF/container.xml

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import { createZipSource } from "../src/pipeline/zip-source.js";

const epubPath = fileURLToPath(new URL("../../../demos/public/alice.epub", import.meta.url));
const bytes = readFileSync(epubPath);
const source = createZipSource(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
);

test("entries() lists the container file with positive sizes", () => {
  const names = source.entries().map((e) => e.filename);
  assert.ok(names.includes("META-INF/container.xml"), "container.xml is listed");
  assert.ok(names.includes("OPS/package.opf"), "package.opf is listed");
  for (const { filename, uncompressedSize } of source.entries()) {
    assert.ok(uncompressedSize > 0, `${filename} has positive uncompressedSize`);
  }
});

test("entry sizes match `unzip -l` for sampled entries", () => {
  assert.equal(source.getSize("OPS/chapter_001.xhtml"), 8369);
  assert.equal(source.getSize("OPS/images/cover_th.jpg"), 36192);
  assert.equal(source.getSize("OPS/package.opf"), 5110);
  assert.equal(source.getSize("META-INF/container.xml"), 240);
  assert.equal(source.getSize("no-such-entry"), 0);
});

test("loadText() reads container.xml containing rootfile", () => {
  const text = source.loadText("META-INF/container.xml");
  assert.ok(text.includes("rootfile"));
  assert.ok(text.includes("application/oebps-package+xml"));
});

test("loadText() on an xhtml entry yields XML markup", () => {
  const text = source.loadText("OPS/chapter_001.xhtml");
  assert.ok(text.startsWith("<?xml") || text.startsWith("<"), "starts with <?xml or <");
  assert.ok(text.includes("<html"));
});

test("loadBytes() returns decompressed bytes and null for missing entries", () => {
  const u8 = source.loadBytes("mimetype");
  assert.ok(u8 instanceof Uint8Array);
  assert.equal(u8.length, 20);
  // "mimetype" is stored uncompressed in a conforming OCF container
  assert.equal(new TextDecoder().decode(u8), "application/epub+zip");
  assert.equal(source.loadBytes("no-such-entry"), null);
  assert.equal(source.loadText("no-such-entry"), null);
});
