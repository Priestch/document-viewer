// THE single layout computer for the EPUB pipeline (anti-koodo rule: no other
// file in this package may do column/gap math — computeParams is the only
// place gap convergence and divisor arithmetic happen, applyColumnStyles the
// only place column CSS is written, measurePageCount the only place page
// counts are derived). Ported from foliate-js paginator.js (MIT, John
// Factotum):
//   - computeParams ......... #beforeRender (:695-771)
//   - applyColumnStyles ..... View.columnize (:301-332) + setImageSize (:333-353)
//   - measurePageCount ...... View.expand (:354-366)
// Paginated flow only — foliate's scrolled flow (:284-300, :381-400) is out of
// scope for this milestone.

const setStylesImportant = (el, styles) => {
  // paginator.js:195-198 — !important so book stylesheets can't fight layout
  const { style } = el;
  for (const [k, v] of Object.entries(styles)) style.setProperty(k, v, "important");
};

/**
 * Compute the column layout params for a host box.
 *
 * Ported from foliate paginator.js #beforeRender (:695-771). The analytic
 * gap-convergence correction (:709-727): the column gap is a percentage of
 * the *content* box, so a percentage gap set on the outer padding comes out
 * smaller than the same percentage used for `column-gap`. Iterating the fix
 * converges to x = a / (1 + a); inverting it (f⁻¹ = -x / (x - 1)) on the gap
 * percentage makes outer padding and inner gap visually equal.
 *
 * @param {DOMRectReadOnly|{width: number, height: number}} containerRect the
 *   host element's rect
 * @param {object} [options]
 * @param {number} [options.maxInlineSize=1000] max column inline size in px
 * @param {number} [options.maxColumnCount=2] max columns per page
 * @param {number} [options.margin=0] block-axis margin in px
 * @param {number} [options.gapPercent=0] gap as a percentage of the host size
 *   (must be < 100)
 * @param {boolean} [options.vertical=false] section writing mode is vertical
 * @param {boolean} [options.rtl=false] section/base direction is RTL
 * @returns {{width: number, height: number, size: number, columnWidth: number,
 *   gap: number, divisor: number, vertical: boolean, rtl: boolean,
 *   margin: number}} params consumed by applyColumnStyles / measurePageCount
 */
export function computeParams(
  containerRect,
  {
    // Foliate host-style defaults (paginator.js:467-472): a book-like
    // 720px-capped column with a 7% column gap and 48px outer margin —
    // NOT edge-to-edge text.
    maxInlineSize = 720,
    maxColumnCount = 2,
    margin = 48,
    gapPercent = 7,
    vertical = false,
    rtl = false,
  } = {}
) {
  const { width, height } = containerRect;
  const size = vertical ? height : width; // :701

  const g = gapPercent / 100; // :709
  // f⁻¹(x) = -x / (x - 1), applied to the gap percentage, scaled by size
  // (:727). Note g = 0 yields gap 0; g >= 1 is degenerate (undefined %).
  const gap = (-g / (g - 1)) * size;

  // :744-745 — never more columns than fit the max inline size
  const divisor = Math.min(maxColumnCount, Math.ceil(size / maxInlineSize));
  const columnWidth = vertical ? size / divisor - margin : size / divisor - gap;

  return { width, height, size, columnWidth, gap, divisor, vertical, rtl, margin };
}

/**
 * Apply the column layout to a section document (columnize +
 * image sizing). Ported from foliate paginator.js View.columnize (:301-332)
 * and setImageSize (:333-353).
 *
 * @param {Document} doc the iframe's content document
 * @param {object} params computeParams output
 */
export function applyColumnStyles(doc, params) {
  if (!doc || !params) return;
  const { width, height, columnWidth, gap, margin, vertical } = params;

  setStylesImportant(doc.documentElement, {
    "box-sizing": "border-box",
    "column-width": `${Math.trunc(columnWidth)}px`,
    "column-gap": vertical ? `${margin}px` : `${gap}px`,
    "column-fill": "auto",
    ...(vertical ? { width: `${width}px` } : { height: `${height}px` }),
    padding: vertical ? `${margin / 2}px ${gap}px` : `0 ${gap / 2}px`,
    overflow: "hidden",
    // force wrap long words
    "overflow-wrap": "break-word",
    // reset some potentially problematic props
    position: "static",
    border: "0",
    margin: "0",
    "max-height": "none",
    "max-width": "none",
    "min-height": "none",
    "min-width": "none",
    // fix glyph clipping in WebKit
    "-webkit-line-box-contain": "block glyphs replaced",
  }); // :306-324
  setStylesImportant(doc.body, {
    "max-height": "none",
    "max-width": "none",
    margin: "0",
  }); // :325-329
  setImageSize(doc, params);
}

// :333-353 — contain images (and svg/video) to the page box, preserving
// sensible author-set max sizes
function setImageSize(doc, { width, height, margin, vertical }) {
  for (const el of doc.body.querySelectorAll("img, svg, video")) {
    // preserve max size if they are already set
    const { maxHeight, maxWidth } = doc.defaultView.getComputedStyle(el);
    setStylesImportant(el, {
      "max-height": vertical
        ? maxHeight !== "none" && maxHeight !== "0px"
          ? maxHeight
          : "100%"
        : `${height - margin * 2}px`,
      "max-width": vertical
        ? `${width - margin * 2}px`
        : maxWidth !== "none" && maxWidth !== "0px"
        ? maxWidth
        : "100%",
      "object-fit": "contain",
      "page-break-inside": "avoid",
      "break-inside": "avoid",
      "box-sizing": "border-box",
    });
  }
}

/**
 * Measure how many pages the columnized content spans.
 * Ported from foliate paginator.js View.expand (:354-366).
 *
 * @param {Document} doc the iframe's content document
 * @param {Range} contentRange range covering doc.body contents
 * @param {object} params computeParams output (uses size/vertical/rtl)
 * @returns {{pageCount: number, expandedSize: number}}
 */
export function measurePageCount(doc, contentRange, params) {
  const { size, vertical, rtl } = params;
  const { documentElement } = doc;
  const side = vertical ? "height" : "width";
  const contentRect = contentRange.getBoundingClientRect();
  const rootRect = documentElement.getBoundingClientRect();
  // offset caused by column break at the start of the page
  // which seem to be supported only by WebKit and only for horizontal writing
  const contentStart = vertical
    ? 0
    : rtl
    ? rootRect.right - contentRect.right
    : contentRect.left - rootRect.left;
  const contentSize = contentStart + contentRect[side];
  const pageCount = Math.ceil(contentSize / size);
  return { pageCount, expandedSize: pageCount * size };
}
