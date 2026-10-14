// OPF package-document parsing for the EPUB pipeline.
//
// Pure, DOM-in/IR-out port of the essentials of foliate-js' EPUB.init +
// Resources (epub.js): manifest/spine extraction, minimal Dublin Core
// metadata, and per-itemref CFIs. Runs wherever DOMParser exists (main
// thread); no other DOM dependency, so the IR it returns is plain data.

import { resolveURL, pathDirname } from "./url.js";
import * as CFI from "./vendor/epubcfi.js";

const NS = {
  CONTAINER: "urn:oasis:names:tc:opendocument:xmlns:container",
  OPF: "http://www.idpf.org/2007/opf",
  DC: "http://purl.org/dc/elements/1.1/",
  XHTML: "http://www.w3.org/1999/xhtml",
};

const OEBPS_PACKAGE_MIME = "application/oebps-package+xml";

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

// ported from foliate-js epub.js `childGetter`: namespace-aware getters that
// fall back to localName matching when the namespace never appears in the doc
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

const parseXML = (parser, text, what) => {
  const doc = parser.parseFromString(text, "application/xml");
  const $error = doc.getElementsByTagName("parsererror")[0];
  if ($error) throw new Error(`XML parsing error in ${what}: ${$error.textContent}`);
  return doc;
};

/**
 * Extract the OCF container's rootfile path (the OPF location inside the zip).
 *
 * @param {string} containerXmlText text of META-INF/container.xml
 * @returns {string} zip path of the package document, e.g. "OPS/package.opf"
 */
export function parseContainer(containerXmlText) {
  const doc = parseXML(new DOMParser(), containerXmlText, "META-INF/container.xml");
  const rootfiles = [...doc.getElementsByTagNameNS(NS.CONTAINER, "rootfile")]
    .map((el) => ({
      fullPath: el.getAttribute("full-path"),
      mediaType: el.getAttribute("media-type"),
    }))
    .filter((file) => file.mediaType === OEBPS_PACKAGE_MIME);
  if (!rootfiles.length) throw new Error("No package document defined in container");
  return rootfiles[0].fullPath;
}

/**
 * Parse the OPF package document into plain data.
 *
 * @param {string} containerXmlText text of META-INF/container.xml (used to
 *   resolve hrefs when baseHref is not given)
 * @param {string} opfXmlText text of the package document
 * @param {{baseHref?: string}} [options] directory of the OPF inside the zip
 *   (e.g. "OPS/"); defaults to the dirname of the container's rootfile path
 * @returns {{
 *   metadata: {title: string, author: string[], language: string, identifier: string},
 *   manifest: Map<string, {href: string, id: string, mediaType: string, properties: string[]}>,
 *   spine: Array<{href: string, idref: string, linear: string, cfi: string}>,
 *   dir: string, tocId: string|null (manifest id of the EPUB 2 NCX),
 *   rendition: {layout?: string},
 * }}
 */
export function parsePackage(containerXmlText, opfXmlText, { baseHref } = {}) {
  const parser = new DOMParser();
  const opfPath = parseContainer(containerXmlText);
  const base = baseHref ?? pathDirname(opfPath);
  const resolveHref = (url) => resolveURL(url, base);

  const opf = parseXML(parser, opfXmlText, "package document");
  const { $, $$ } = childGetter(opf, NS.OPF);
  const $package = opf.documentElement;
  const $metadata = $($package, "metadata");
  const $manifest = $($package, "manifest");
  const $spine = $($package, "spine");
  if (!$manifest || !$spine) throw new Error("Package document has no manifest/spine");

  const dcElements = (name) =>
    [...$metadata.children].filter((el) => el.namespaceURI === NS.DC && el.localName === name);

  // metadata: the four fields the pipeline IR needs (foliate's getMetadata
  // keeps the full webpub object; this is the essentials-only subset)
  const uniqueId = $package.getAttribute("unique-identifier");
  const $identifier =
    dcElements("identifier").find((el) => el.getAttribute("id") === uniqueId) ??
    dcElements("identifier")[0];
  const metadata = {
    title: getElementText(dcElements("title")[0]),
    author: dcElements("creator").map(getElementText),
    language: getElementText(dcElements("language")[0]),
    identifier: getElementText($identifier),
  };

  // manifest: keyed by zip-resolved href (properties split to a list)
  const items = $$($manifest, "item").map((el) => ({
    href: resolveHref(el.getAttribute("href")),
    id: el.getAttribute("id"),
    mediaType: el.getAttribute("media-type"),
    properties: el.getAttribute("properties")?.split(/\s/) ?? [],
  }));
  const manifest = new Map(items.map((item) => [item.href, item]));
  // itemrefs point at manifest items by id, not href
  const byID = new Map(items.map((item) => [item.id, item]));

  // spine: itemrefs in document order; CFIs from the actual <itemref>
  // elements (CFI.fromElements — the vendored foliate module)
  const $$itemref = $$($spine, "itemref");
  const cfis = CFI.fromElements($$itemref);
  const spine = $$itemref.map((el, index) => ({
    href: byID.get(el.getAttribute("idref"))?.href ?? null,
    idref: el.getAttribute("idref"),
    linear: el.getAttribute("linear"),
    cfi: cfis[index],
  }));

  // EPUB 3 § page-progression-direction; default is "ltr" per spec
  const dir = $spine.getAttribute("page-progression-direction") || "ltr";
  // EPUB 2 NCX: the spine's toc attribute names the manifest item
  const tocId = $spine.getAttribute("toc");

  // fixed-layout signal: <meta property="rendition:layout">pre-paginated</meta>
  const $layout = [...$metadata.children].find(
    (el) => el.localName === "meta" && el.getAttribute("property") === "rendition:layout"
  );
  const layout = $layout ? getElementText($layout) : undefined;

  return { metadata, manifest, spine, dir, tocId, rendition: { layout } };
}
