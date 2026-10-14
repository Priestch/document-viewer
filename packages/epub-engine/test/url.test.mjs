// Acceptance [N] for M2 url.js: pure-string URL helpers ported from
// foliate-js epub.js (see comments in src/pipeline/url.js for the quirks).

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveURL, isExternal, pathRelative, pathDirname } from "../src/pipeline/url.js";

test("resolveURL resolves sibling/child/parent hrefs against container paths", () => {
  // foliate: resolveURL(url, opfPath) maps manifest hrefs to zip paths
  assert.equal(resolveURL("chapter_001.xhtml", "OPS/package.opf"), "OPS/chapter_001.xhtml");
  assert.equal(resolveURL("css/stylesheet.css", "OPS/package.opf"), "OPS/css/stylesheet.css");
  assert.equal(resolveURL("../images/x.jpg", "OPS/chapters/c1.xhtml"), "OPS/images/x.jpg");
  // absolute href: foliate resolves it against the fake origin's root, so
  // the leading slash is stripped — zip paths are always relative
  assert.equal(resolveURL("/top.xhtml", "OPS/package.opf"), "top.xhtml");
  // query strings are stripped (fragment-less comparison of zip paths)
  assert.equal(resolveURL("a.xhtml?x=1", "OPS/package.opf"), "OPS/a.xhtml");
});

test("resolveURL undoes calibre's %2c encoding of commas", () => {
  // foliate epub.js: `url.replace(/%2c/, ',')` — calibre emits %2c in hrefs
  // while the zip entry name contains a literal comma
  assert.equal(resolveURL("a%2cb.xhtml", "OPS/package.opf"), "OPS/a,b.xhtml");
});

test("resolveURL uses the invalid.invalid trick for non-URL bases", () => {
  // foliate: container paths aren't URLs, so resolve against a fake origin
  // (RFC 2606 .invalid TLD, cannot collide) and strip it back off
  assert.equal(resolveURL("x", "dir/"), "dir/x");
});

test("resolveURL treats scheme-ful bases as absolute (except OEBPS quirk)", () => {
  // foliate: `relativeTo.includes(':') && !relativeTo.startsWith('OEBPS')`
  // → returns a real URL object resolved against the absolute base
  const url = resolveURL("foo#a", "https://example.com/base/");
  assert.ok(url instanceof URL);
  assert.equal(url.href, "https://example.com/base/foo#a");
  // the OEBPS escape hatch: Calibre FS paths like "OEBPS:/" must not be
  // mistaken for a scheme — resolved as a container path instead
  assert.equal(typeof resolveURL("x", "OEBPS:dir/"), "string");
});

test("resolveURL falls back to the raw url on error", () => {
  // foliate: catch → console.warn → return original url
  // ("%zz" is malformed percent-encoding, new URL() throws)
  assert.equal(resolveURL("%zz", "dir/"), "%zz");
});

test("isExternal only matches real schemes, never blob: or plain paths", () => {
  assert.equal(isExternal("https://example.com/x"), true);
  assert.equal(isExternal("http://a"), true);
  assert.equal(isExternal("blob:https://origin/uuid"), false);
  assert.equal(isExternal("chapter_001.xhtml"), false);
  assert.equal(isExternal("../images/x.jpg"), false);
});

test("pathRelative mirrors Node's path.relative for slash paths", () => {
  assert.equal(pathRelative("OPS/chapters", "OPS/images/x.jpg"), "../images/x.jpg");
  assert.equal(pathRelative("OPS", "OPS/css/a.css"), "css/a.css");
  assert.equal(pathRelative("a/b", "a/b"), "");
  assert.equal(pathRelative("", "x"), "x");
});

test("pathDirname keeps the trailing slash", () => {
  assert.equal(pathDirname("OPS/package.opf"), "OPS/");
  assert.equal(pathDirname("container.xml"), "");
  assert.equal(pathDirname("a/b/c.xhtml"), "a/b/");
});
