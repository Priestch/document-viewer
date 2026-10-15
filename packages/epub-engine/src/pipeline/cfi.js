// CFI glue between the foliate-shaped book, the vendored epubcfi.js and the
// paginator. Ported from foliate-js view.js getCFI/resolveCFI (MIT, John
// Factotum) and foliate-js epub.js resolveCFI/resolveHref — adapted to our
// sections seam, where each section already carries its real spine itemref
// CFI (package.js CFI.fromElements), so no OPF DOM round-trip is needed.

import * as CFI from "./vendor/epubcfi.js";

/**
 * The base (section-level) CFI for a spine index — foliate view.js:418.
 * Uses the section's real itemref CFI when present, fake otherwise.
 */
export function sectionCFI(book, index) {
  return book.sections[index]?.cfi ?? CFI.fake.fromIndex(index);
}

/**
 * Build a range CFI for a position in a section — foliate view.js:418-422.
 *
 * @param {object} book foliate-shaped book ({sections})
 * @param {number} index spine index
 * @param {Range} [range] when omitted, returns the bare section CFI
 * @returns {string} epubcfi(...)
 */
export function getCFI(book, index, range) {
  const baseCFI = sectionCFI(book, index);
  if (!range) return baseCFI;
  return CFI.joinIndir(baseCFI, CFI.fromRange(range));
}

/**
 * Resolve a CFI into a paginator target {index, anchor}, where anchor is
 * `doc => Range | null`. Ported from foliate epub.js:690-705 — instead of
 * resolving the itemref part against the OPF DOM (foliate resolves idref →
 * spine index), we match it against the sections' own spine CFIs, falling
 * back to fake-CFI index decoding (foliate view.js:423-429).
 *
 * @param {object} book foliate-shaped book ({sections})
 * @param {string} cfi
 * @returns {{index: number, anchor: Function}}
 */
export function resolveCFI(book, cfi) {
  const parts = CFI.parse(cfi);
  const indir = parts.parent ?? parts;
  // the first indirection step is the itemref path (epub.js:695);
  // shift it off so the rest resolves inside the section document
  const top = indir.shift();

  let index = -1;
  for (let i = 0; i < book.sections.length; i++) {
    const sectionCFIString = book.sections[i]?.cfi;
    // single-indir CFIs; compare on the parsed step paths (IDs ignored)
    if (sectionCFIString && CFI.compare(CFI.parse(sectionCFIString), [top]) === 0) {
      index = i;
      break;
    }
  }
  if (index === -1) index = CFI.fake.toIndex(top);

  // bare section CFI (no '!' content part): nothing to resolve in-document.
  // The anchor must be DEFENSIVE: a CFI saved from a different book (same
  // format) resolves against this book's DOM with no matching nodes, and
  // CFI.toRange would call range.setStart(null) — degrade to the section
  // start instead of crashing. Hosts should still compare Location.docId
  // before restoring, but the engine must survive cross-document CFIs.
  const anchor = indir.length
    ? (doc) => {
        try {
          return CFI.toRange(doc, parts) ?? null;
        } catch {
          return null;
        }
      }
    : () => null;
  return { index, anchor };
}

// foliate epub.js:906-907 — fragment id lookup with the XHTML anchor
// (<a name="...">) fallback
const getHTMLFragment = (doc, id) =>
  doc.getElementById(id) ?? doc.querySelector(`[name="${CSS.escape(id)}"]`);

/**
 * Resolve an href (e.g. from the TOC, `chapter_001.xhtml#fragment`) into a
 * paginator target — foliate epub.js:1043-1050. The section's `id` is its
 * container href (sections.js), so matching is a plain path comparison.
 *
 * @param {object} book foliate-shaped book ({sections})
 * @param {string} href
 * @returns {{index: number, anchor: Function} | null} null when the href
 *   matches no spine item
 */
export function resolveHref(book, href) {
  // engine-native TOC hrefs that are not container paths: MOBI's
  // `filepos:…` / `kindle:pos:…` addresses (fast path below) and FB2's
  // "sectionIndex#titleIndex" addresses (never path-match) delegate to the
  // book's own resolver (foliate's splitTOCHref seam)
  if (/^(filepos:|kindle:)/.test(href)) {
    return book.resolveTOCHref?.(href) ?? null;
  }
  const [path, hash] = href.split("#");
  const target = decodeURI(path);
  const index = book.sections.findIndex(
    (section) => section.id === target || section.id === decodeURI(target)
  );
  // non-container-path hrefs (FB2's "sectionIndex#titleIndex" TOC addresses)
  // delegate too, like the engine-native ones above
  if (index === -1) return book.resolveTOCHref?.(href) ?? null;
  const anchor = hash ? (doc) => getHTMLFragment(doc, hash) : () => 0;
  return { index, anchor };
}
