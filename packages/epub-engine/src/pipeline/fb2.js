// FB2 (FictionBook, incl. zipped .fb2.zip/.fbz) — the book assembly for the
// "fb2" format.
//
// Ported from foliate-js fb2.js (MIT, John Factotum): the FB2Converter rule
// maps, the body→section splitting, the TOC/idMap machinery and the eager
// per-section XHTML object URLs are foliate's. Deviations:
// - split for the worker seam: `decodeFB2Text` is the pure buffer→text half
//   of foliate's `parseXML` (TextDecoder + XML-declaration encoding re-decode)
//   and runs worker-side; the DOMParser half (`makeFB2`) stays main-thread
//   (red line: DOMParser never crosses). `assembleFB2Book` is the in-process
//   entry doing both halves locally.
// - the stylesheet is INLINED as a <style> element in the section template
//   instead of foliate's module-level object-URL <link> (which was an
//   import-time side effect and a URL that outlives every book).
// - sections carry the pipeline shape (`get url()`, same field set as
//   assembleSections) so the shared engine consumes them unchanged.
// - foliate's `book.resolveHref` is exposed as `book.resolveTOCHref` — our
//   cfi.js delegation seam (it also handles the engine's exotic-href path);
//   the top-level TOC form returns anchor 0 (start of section) instead of a
//   guaranteed-null data-foliate-id lookup. `splitTOCHref`/`getTOCFragment`
//   are foliate-view internals with no consumer here.
// - `metadata.author` is an array of person-name STRINGS (foliate's
//   {name, sortAs} objects would flatten to "[object Object]" in the shared
//   engine metadata path); `getCover` (fetch on a data URI) is dropped —
//   the DocumentEngine surface has no cover method.
//
// DOM boundary: nothing above `makeFB2` touches the DOM, so the worker can
// import this module safely (like mobi.js).

import { createZipSource } from "./zip-source.js";

const normalizeWhitespace = (str) =>
  str
    ? str
        .replace(/[\t\n\f\r ]+/g, " ")
        .replace(/^[\t\n\f\r ]+/, "")
        .replace(/[\t\n\f\r ]+$/, "")
    : "";
const getElementText = (el) => normalizeWhitespace(el?.textContent);

const NS = {
  XLINK: "http://www.w3.org/1999/xlink",
  EPUB: "http://www.idpf.org/2007/ops",
};

const MIME = {
  XML: "application/xml",
  XHTML: "application/xhtml+xml",
};

const STYLE = `
@namespace epub "http://www.idpf.org/2007/ops";
body > img, section > img {
    display: block;
    margin: auto;
}
.title h1 {
    text-align: center;
}
body > section > .title, body.notesBodyType > .title {
    margin: 3em 0;
}
body.notesBodyType > section .title h1 {
    text-align: start;
}
body.notesBodyType > section .title {
    margin: 1em 0;
}
p {
    text-indent: 1em;
    margin: 0;
}
:not(p) + p, p:first-child {
    text-indent: 0;
}
.poem p {
    text-indent: 0;
    margin: 1em 0;
}
.text-author, .date {
    text-align: end;
}
.text-author:before {
    content: "—";
}
table {
    border-collapse: collapse;
}
td, th {
    padding: .25em;
}
a[epub|type~="noteref"] {
    font-size: .75em;
    vertical-align: super;
}
body:not(.notesBodyType) > .title, body:not(.notesBodyType) > .epigraph {
    margin: 3em 0;
}
`;

// foliate fb2.js:223-227 — but with the stylesheet inlined (see header)
const template = (html) => `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head><style>${STYLE}</style></head>
    <body>${html}</body>
</html>`;

// name of the custom ID attribute for TOC items (foliate fb2.js:230)
const dataID = "data-foliate-id";

const STYLE_MAP = {
  strong: ["strong", "self"],
  emphasis: ["em", "self"],
  style: ["span", "self"],
  a: "anchor",
  strikethrough: ["s", "self"],
  sub: ["sub", "self"],
  sup: ["sup", "self"],
  code: ["code", "self"],
  image: "image",
};

const TABLE_MAP = {
  tr: [
    "tr",
    {
      th: ["th", STYLE_MAP, ["colspan", "rowspan", "align", "valign"]],
      td: ["td", STYLE_MAP, ["colspan", "rowspan", "align", "valign"]],
    },
    ["align"],
  ],
};

const POEM_MAP = {
  epigraph: ["blockquote"],
  subtitle: ["h2", STYLE_MAP],
  "text-author": ["p", STYLE_MAP],
  date: ["p", STYLE_MAP],
  stanza: "stanza",
};

const SECTION_MAP = {
  title: [
    "header",
    {
      p: ["h1", STYLE_MAP],
      "empty-line": ["br"],
    },
  ],
  epigraph: ["blockquote", "self"],
  image: "image",
  annotation: ["aside"],
  section: ["section", "self"],
  p: ["p", STYLE_MAP],
  poem: ["blockquote", POEM_MAP],
  subtitle: ["h2", STYLE_MAP],
  cite: ["blockquote", "self"],
  "empty-line": ["br"],
  table: ["table", TABLE_MAP],
  "text-author": ["p", STYLE_MAP],
};

const BODY_MAP = {
  image: "image",
  title: [
    "section",
    {
      p: ["h1", STYLE_MAP],
      "empty-line": ["br"],
    },
  ],
  epigraph: ["section", SECTION_MAP],
  section: ["section", SECTION_MAP],
};
POEM_MAP.epigraph.push(SECTION_MAP);

class FB2Converter {
  constructor(fb2) {
    this.fb2 = fb2;
    this.doc = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html");
    // use this instead of `getElementById` to allow images like
    // `<image l:href="#img1.jpg" id="img1.jpg" />`
    this.bins = new Map(Array.from(this.fb2.getElementsByTagName("binary"), (el) => [el.id, el]));
  }
  getImageSrc(el) {
    const href = el.getAttributeNS(NS.XLINK, "href");
    if (!href) return "data:,";
    const [, id] = href.split("#");
    if (!id) return href;
    const bin = this.bins.get(id);
    return bin ? `data:${bin.getAttribute("content-type")};base64,${bin.textContent}` : href;
  }
  image(node) {
    const el = this.doc.createElement("img");
    // ?? "" — foliate assigns the raw getAttribute null, which the IDL
    // setter stringifies into alt="null" title="null"
    el.alt = node.getAttribute("alt") ?? "";
    el.title = node.getAttribute("title") ?? "";
    el.setAttribute("src", this.getImageSrc(node));
    return el;
  }
  anchor(node) {
    const el = this.convert(node, { a: ["a", STYLE_MAP] });
    el.setAttribute("href", node.getAttributeNS(NS.XLINK, "href"));
    if (node.getAttribute("type") === "note") {
      el.setAttributeNS(NS.EPUB, "epub:type", "noteref");
    }
    return el;
  }
  stanza(node) {
    const el = this.convert(node, {
      stanza: [
        "p",
        {
          title: [
            "header",
            {
              p: ["strong", STYLE_MAP],
              "empty-line": ["br"],
            },
          ],
          subtitle: ["p", STYLE_MAP],
        },
      ],
    });
    for (const child of node.children) {
      if (child.nodeName === "v") {
        el.append(this.doc.createTextNode(child.textContent));
        el.append(this.doc.createElement("br"));
      }
    }
    return el;
  }
  convert(node, def) {
    // not an element; return text content
    if (node.nodeType === 3) return this.doc.createTextNode(node.textContent);
    if (node.nodeType === 4) return this.doc.createCDATASection(node.textContent);
    if (node.nodeType === 8) return this.doc.createComment(node.textContent);

    const d = def?.[node.nodeName];
    if (!d) return null;
    if (typeof d === "string") return this[d](node);

    const [name, opts, attrs] = d;
    const el = this.doc.createElement(name);

    // copy the ID, and set class name from original element name
    if (node.id) el.id = node.id;
    el.classList.add(node.nodeName);

    // copy attributes
    if (Array.isArray(attrs)) {
      for (const attr of attrs) {
        const value = node.getAttribute(attr);
        if (value) el.setAttribute(attr, value);
      }
    }

    // process child elements recursively
    const childDef = opts === "self" ? def : opts;
    let child = node.firstChild;
    while (child) {
      const childEl = this.convert(child, childDef);
      if (childEl) el.append(childEl);
      child = child.nextSibling;
    }
    return el;
  }
}

/**
 * Zip magic check (PK\x03\x04) — the container sniff that lets .fb2.zip/.fbz
 * ride the same "fb2" format id as plain FB2 (foliate view.js isZip).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function hasZipMagic(bytes) {
  return (
    bytes.length > 3 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * Decode FB2 bytes to text with encoding handling — the pure half of
 * foliate's parseXML (fb2.js:157-171), worker-safe. The XML declaration is
 * an ASCII byte prefix, so the lossy utf-8 first pass never hides it.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeFB2Text(bytes) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const str = new TextDecoder("utf-8").decode(buffer);
  // `Document.xmlEncoding` is deprecated (removed in Firefox), so foliate
  // parses the declaration manually — we do too, slightly more permissively
  // (encoding may precede version)
  const encoding =
    str.match(/^<\?xml\s+[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/)?.[1] ??
    str.match(
      /^<\?xml\s+version\s*=\s*["']1.\d+"\s+encoding\s*=\s*["']([A-Za-z0-9._-]*)["']/
    )?.[1];
  if (encoding && encoding.toLowerCase() !== "utf-8") {
    return new TextDecoder(encoding).decode(buffer);
  }
  return str;
}

/**
 * Pick the FB2 entry from a zipped container's entries: the one ending in
 * ".fb2", falling back to the first (foliate view.js:97-99).
 * @param {Array<{filename: string}>} entries
 * @returns {{filename: string}}
 */
export function selectFB2Entry(entries) {
  return entries.find((entry) => entry.filename.endsWith(".fb2")) ?? entries[0];
}

/**
 * The main-thread conversion: FB2 text → our book shape (foliate makeFB2,
 * fb2.js:232-360; deviations in the module header). Needs DOMParser and
 * document.implementation — call this ONLY on the main thread.
 *
 * @param {string} text the FB2 XML source (decodeFB2Text output)
 * @param {{name?: string}} [options]
 * @returns {Promise<object>} book ({sections, metadata, toc, dir, rendition,
 *   transformTarget: null, resolveTOCHref, destroy})
 */
export async function makeFB2(text, { name } = {}) {
  const book = {};
  const doc = new DOMParser().parseFromString(text, MIME.XML);
  const converter = new FB2Converter(doc);

  const $ = (x) => doc.querySelector(x);
  const $$ = (x) => [...doc.querySelectorAll(x)];
  const getPerson = (el) => {
    const nick = getElementText(el.querySelector("nickname"));
    if (nick) return nick;
    const first = getElementText(el.querySelector("first-name"));
    const middle = getElementText(el.querySelector("middle-name"));
    const last = getElementText(el.querySelector("last-name"));
    return [first, middle, last].filter((x) => x).join(" ");
  };
  const getDate = (el) => el?.getAttribute("value") ?? getElementText(el);
  const annotation = $("title-info annotation");
  book.metadata = {
    title: getElementText($("title-info book-title")) ?? name ?? null,
    identifier: getElementText($("document-info id")),
    language: getElementText($("title-info lang")),
    // person-name strings (see module header); sortAs is dropped
    author: $$("title-info author").map(getPerson).filter(Boolean),
    translator: $$("title-info translator").map(getPerson).filter(Boolean),
    // document-info authors + the program used (calibre has long used "bkp"
    // for both — foliate shrugs, so do we)
    contributor: [
      ...$$("document-info author").map(getPerson),
      ...$$("document-info program-used").map(getElementText),
    ].filter(Boolean),
    publisher: getElementText($("publish-info publisher")),
    published: getDate($("title-info date")),
    modified: getDate($("document-info date")),
    description: annotation
      ? converter.convert(annotation, { annotation: ["div", SECTION_MAP] }).innerHTML
      : null,
    subject: $$("title-info genre").map(getElementText),
  };

  // convert each body (foliate fb2.js:278-285)
  const bodyData = Array.from(doc.querySelectorAll("body"), (body) => {
    const converted = converter.convert(body, { body: ["body", BODY_MAP] });
    return [
      Array.from(converted.children, (el) => {
        // get list of IDs in the section
        const ids = [el, ...el.querySelectorAll("[id]")].map((el) => el.id);
        return { el, ids };
      }),
      converted,
    ];
  });

  const urls = [];
  const sectionData = bodyData[0][0]
    // make a separate section for each section in the first body
    .map(({ el, ids }) => {
      // set up titles for TOC
      const titles = Array.from(el.querySelectorAll(":scope > section > .title"), (el, index) => {
        el.setAttribute(dataID, index);
        return { title: getElementText(el), index };
      });
      return { ids, titles, el };
    })
    // for additional bodies, only make one section for each body
    .concat(
      bodyData.slice(1).map(([sections, body]) => {
        const ids = sections.map((s) => s.ids).flat();
        body.classList.add("notesBodyType");
        return { ids, el: body, linear: "no" };
      })
    )
    .map(({ ids, titles, el, linear }) => {
      const str = template(el.outerHTML);
      const blob = new Blob([str], { type: MIME.XHTML });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      const title = normalizeWhitespace(
        el.querySelector(".title, .subtitle, p")?.textContent ??
          (el.classList.contains("title") ? el.textContent : "")
      );
      return {
        ids,
        title,
        titles,
        el,
        url,
        str,
        // don't count image data as it'd skew the size too much
        size:
          blob.size -
          Array.from(
            el.querySelectorAll("[src]"),
            (el) => el.getAttribute("src")?.length ?? 0
          ).reduce((a, b) => a + b, 0),
        linear,
      };
    });

  const idMap = new Map();
  book.sections = sectionData.map((section, index) => {
    const { ids, url, str, size, linear } = section;
    for (const id of ids) if (id) idMap.set(id, index);
    return {
      // the section index is the identity (foliate parity) — TOC hrefs ride
      // the resolveTOCHref seam, never the cfi.js path match
      id: index,
      get url() {
        return url;
      },
      load: () => url,
      createDocument: () => new DOMParser().parseFromString(str, MIME.XHTML),
      size,
      linear,
    };
  });

  book.toc = sectionData
    .map(({ title, titles }, index) => {
      const id = index.toString();
      return {
        label: title,
        href: id,
        subitems: titles?.length
          ? titles.map(({ title, index }) => ({
              label: title,
              href: `${id}#${index}`,
            }))
          : null,
      };
    })
    .filter((item) => item);

  // foliate's resolveHref (fb2.js:344-351), exposed on our delegation seam;
  // the TOC top-level form anchors at the section start
  book.resolveTOCHref = (href) => {
    const [a, b] = href.split("#");
    return a
      ? {
          // the link is from the TOC
          index: Number(a),
          anchor: b != null ? (doc) => doc.querySelector(`[${dataID}="${b}"]`) : () => 0,
        }
      : {
          // link from within the page
          index: idMap.get(b),
          anchor: (doc) => doc.getElementById(b),
        };
  };
  book.dir = "ltr";
  book.rendition = { layout: "reflowable" };
  book.transformTarget = null;

  book.destroy = () => {
    for (const url of urls) URL.revokeObjectURL(url);
  };
  return book;
}

/**
 * In-process entry: raw FB2 (or zipped FB2) bytes → book. The worker backend
 * does the same two halves across the seam (decode worker-side, convert
 * main-thread).
 *
 * @param {{bytes: ArrayBuffer, name?: string}} options
 * @returns {Promise<object>} makeFB2's book
 */
export async function assembleFB2Book({ bytes, name }) {
  if (hasZipMagic(new Uint8Array(bytes))) {
    const zip = createZipSource(bytes);
    const entry = selectFB2Entry(zip.entries());
    return makeFB2(decodeFB2Text(zip.loadBytes(entry.filename)), { name });
  }
  return makeFB2(decodeFB2Text(new Uint8Array(bytes)), { name });
}
