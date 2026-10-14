// TOC parsing for the EPUB pipeline.
//
// Ports foliate-js' parseNav (EPUB 3 nav document, epub.js) and parseNCX
// (EPUB 2 .ncx, epub.js) down to the shape the pipeline IR needs:
// [{label, href, subitems}] with hrefs resolved to zip paths.

import { resolveURL } from "./url.js";

const NS = {
  XHTML: "http://www.w3.org/1999/xhtml",
  EPUB: "http://www.idpf.org/2007/ops",
  NCX: "http://www.daisy.org/z3986/2005/ncx/",
};

// strip and collapse ASCII whitespace
// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
const normalizeWhitespace = (str) =>
  str
    ? str
        .replace(/[\t\n\f\r ]+/g, " ")
        .replace(/^[\t\n\f\r ]+/, "")
        .replace(/[\t\n\f\r ]+$/, "")
    : "";

const getElementText = (el) => normalizeWhitespace(el?.textContent);

// ported from foliate-js epub.js `childGetter` (see package.js for rationale)
const childGetter = (doc, ns) => {
  const useNS = doc.lookupNamespaceURI(null) === ns || doc.lookupPrefix(ns);
  const f = useNS
    ? (el, name) => (child) => child.namespaceURI === ns && child.localName === name
    : (_el, name) => (child) => child.localName === name;
  return {
    $: (el, name) => [...el.children].find(f(el, name)),
    $$: (el, name) => [...el.children].filter(f(el, name)),
    $$$: useNS
      ? (el, name) => [...el.getElementsByTagNameNS(ns, name)]
      : (el, name) => [...el.getElementsByTagName(name)],
  };
};

const parseXML = (text, what) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const $error = doc.getElementsByTagName("parsererror")[0];
  if ($error) throw new Error(`XML parsing error in ${what}: ${$error.textContent}`);
  return doc;
};

/**
 * Parse an EPUB 3 nav document and return its `epub:type="toc"` table of
 * contents.
 *
 * @param {string} navDocText text of the nav document (XHTML)
 * @param {{baseHref?: string}} [options] zip path the nav document lives at
 * @returns {Array<{label: string, href: string, subitems: Array|null}>}
 */
export function parseToc(navDocText, { baseHref = "" } = {}) {
  const doc = parseXML(navDocText, "nav document");
  const { $, $$, $$$ } = childGetter(doc, NS.XHTML);
  const resolveHref = (href) => (href ? decodeURI(resolveURL(href, baseHref)) : null);

  // foliate parseLI: <a> (or <span> for heading-only nodes) + nested <ol>
  const parseLI = ($li) => {
    const $a = $($li, "a") ?? $($li, "span");
    const $ol = $($li, "ol");
    return {
      label: getElementText($a) || $a?.getAttribute("title"),
      href: resolveHref($a?.getAttribute("href")),
      subitems: parseOL($ol),
    };
  };
  const parseOL = ($ol) => ($ol ? $$($ol, "li").map(parseLI) : null);

  // first nav whose epub:type list contains "toc"
  for (const $nav of $$$(doc, "nav")) {
    const type = $nav.getAttributeNS(NS.EPUB, "type")?.split(/\s/) ?? [];
    if (type.includes("toc")) return parseOL($($nav, "ol"));
  }
  return null;
}

/**
 * Parse an EPUB 2 NCX file and return its navMap table of contents.
 *
 * @param {string} ncxText text of the .ncx file
 * @param {{baseHref?: string}} [options] zip path the NCX lives at
 * @returns {Array<{label: string, href: string, subitems: Array|null}>}
 */
export function parseNCX(ncxText, { baseHref = "" } = {}) {
  const doc = parseXML(ncxText, "NCX document");
  const { $, $$ } = childGetter(doc, NS.NCX);
  const resolveHref = (href) => (href ? decodeURI(resolveURL(href, baseHref)) : null);

  // foliate parseItem: navLabel/content pair, nested navPoints
  const parseItem = (el) => {
    const label = getElementText($(el, "navLabel"));
    const href = resolveHref($(el, "content")?.getAttribute("src"));
    if (el.localName === "navPoint") {
      const els = $$(el, "navPoint");
      return { label, href, subitems: els.length ? els.map(parseItem) : null };
    }
    return { label, href };
  };

  const $navMap = $(doc.documentElement, "navMap");
  return $navMap ? $$($navMap, "navPoint").map(parseItem) : null;
}
