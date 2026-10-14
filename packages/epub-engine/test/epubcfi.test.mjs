// Ported from foliate-js tests/epubcfi-tests.js (MIT, John Factotum), adapted
// to plain node:test + node:assert.
//
// Only the string-operation tests (parse / toString round-trips / compare /
// fake CFIs) run here: the remaining foliate test blocks exercise
// DOMParser + DOM Range (`CFI.toRange`, `CFI.fromRange`, `CFI.toElement`,
// `CFI.fromElements`) and are therefore skipped in Node with a pointer to the
// upstream file — see the "Range-dependent (skipped)" section at the bottom.
// They are covered indirectly in the browser by test/m2 (parsePackage spine
// CFIs via CFI.fromElements).

import { test } from "node:test";
import assert from "node:assert/strict";

import * as CFI from "../src/pipeline/vendor/epubcfi.js";

test("parse() splits steps, ID assertions and offsets", () => {
  assert.deepEqual(CFI.parse("epubcfi(/6/4)"), [[{ index: 6 }, { index: 4 }]]);
  assert.deepEqual(CFI.parse("/6/4[chap01ref]"), [[{ index: 6 }, { index: 4, id: "chap01ref" }]]);
  assert.deepEqual(CFI.parse("/6/4/2/1:3"), [
    [{ index: 6 }, { index: 4 }, { index: 2 }, { index: 1, offset: 3 }],
  ]);
});

test("parse() splits range CFIs into parent/start/end", () => {
  // from the upstream compare tests: a range with a local path
  const parsed = CFI.parse("/6/4!/2,/3:0,/3:1");
  assert.ok(parsed.parent);
  assert.deepEqual(parsed.start, [[{ index: 3, offset: 0 }]]);
  assert.deepEqual(parsed.end, [[{ index: 3, offset: 1 }]]);
});

test("parse() handles step indirections (!)", () => {
  assert.deepEqual(CFI.parse("/6/4!/10"), [[{ index: 6 }, { index: 4 }], [{ index: 10 }]]);
});

test("string CFIs round-trip through parse + collapse", () => {
  // collapse(str) = toString(parse(str)) for non-range CFIs
  for (const cfi of [
    "epubcfi(/6)",
    "epubcfi(/6/4)",
    "epubcfi(/6/4[chap01ref])",
    "epubcfi(/6/4/2/1:0)",
    "epubcfi(/6/4/2/1:3)",
    // step indirection
    "epubcfi(/6/4!/10)",
    // temporal / spatial offsets
    "epubcfi(/6/4~10.5)",
    "epubcfi(/6/4@3:4)",
    // escaped characters in ID assertions (upstream spec example ids)
    "epubcfi(/6/4[chap0^]!/1ref^^])",
    "epubcfi(/4[body0^]!/1^^]/10[para^]/0^,/5])",
    // text assertion with ;s= side bias
    "epubcfi(/6/4[foo^];s=b])",
  ]) {
    assert.equal(CFI.collapse(cfi), cfi);
  }
});

test("compare() — cases ported verbatim from foliate tests", () => {
  // upstream: tests/epubcfi-tests.js, last block
  for (const [a, b, c] of [
    ["/6/4!/10", "/6/4!/10", 0],
    ["/6/4!/2/3:0", "/6/4!/2", 1],
    ["/6/4!/2/4/6/8/10/3:0", "/6/4!/4", -1],
    ["/6/4[chap0^]!/1ref^^]!/4[body01^^]/10[para^]^,05^^]", "/6/4!/4/10", 0],
    ["/6/4[chap0^]!/1ref^^]!/4[body01^^],/10[para^]^,05^^],/15:10[foo^]]", "/6/4!/4/12", -1],
    ["/6/4", "/6/4!/2", -1],
    ["/6/4!/2", "/6/4!/2!/2", -1],
  ]) {
    const x = CFI.compare(a, b);
    assert.equal(x, c, `compare ${a} and ${b}, expected ${c}, got ${x}`);
  }
});

test("joinIndir() joins two CFIs with an indirection", () => {
  assert.equal(CFI.joinIndir("epubcfi(/6/4)", "epubcfi(/2/1:0)"), "epubcfi(/6/4!/2/1:0)");
});

test("fake.fromIndex()/toIndex() round-trip", () => {
  assert.equal(CFI.fake.fromIndex(0), "epubcfi(/6/2)");
  assert.equal(CFI.fake.fromIndex(5), "epubcfi(/6/12)");
  // toIndex() takes the parts for one document (parse()[0]), not the whole parse tree
  assert.equal(CFI.fake.toIndex(CFI.parse("epubcfi(/6/12)")[0]), 5);
});

test("isCFI matches the wrapped form", () => {
  assert.ok(CFI.isCFI.test("epubcfi(/6/4)"));
  assert.ok(!CFI.isCFI.test("/6/4"));
});

// ---------------------------------------------------------------------------
// Range-dependent (skipped): the upstream test blocks below need DOMParser,
// DOM Range and live documents, which Node does not provide. Ported cases are
// kept as documentation; see foliate-js tests/epubcfi-tests.js:
//
//  - CFI.toElement(opf, CFI.parse('/6/4[chap01ref]')[0]) resolving an
//    <itemref> by ID assertion, including special characters in IDs
//    ('chap0]!/1ref^'), and the fallback to plain indices ('/6/4')
//  - CFI.toRange()/fromRange() round-trips over the EPUB CFI spec example
//    document ('/4[body01]/10[para05]/3:10' etc.), including the documents
//    with removed text nodes, CDATA & comments, entity-encoded characters and
//    reject/skip node filters
//  - range.toString() selecting individual digits ('0'..'9') via
//    `/4/10,/3:${i},/3:${i+1}`
// ---------------------------------------------------------------------------
