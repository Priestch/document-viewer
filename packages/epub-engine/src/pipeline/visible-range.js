// Visible-range computation for a columnized section document. Ported from
// foliate-js paginator.js (MIT, John Factotum):
//   - uncollapse ................ :31-45
//   - bisectNode / makeRange .... :47-64
//   - union getBoundingClientRect :71-84 (Firefox zero-width rect bug)
//   - getVisibleRange ........... :86-143
//   - rect mapper (RTL/vertical)  :901-918 #getRectMapper, paginated branch

const { SHOW_ELEMENT, SHOW_TEXT, SHOW_CDATA_SECTION, FILTER_ACCEPT, FILTER_REJECT, FILTER_SKIP } =
  NodeFilter;

const filter = SHOW_ELEMENT | SHOW_TEXT | SHOW_CDATA_SECTION;

// collapsed range doesn't return client rects sometimes (or always?)
// try make get a non-collapsed range or element (paginator.js:31-45)
export const uncollapse = (range) => {
  if (!range?.collapsed) return range;
  const { endOffset, endContainer } = range;
  if (endContainer.nodeType === 1) {
    const node = endContainer.childNodes[endOffset];
    if (node?.nodeType === 1) return node;
    return endContainer;
  }
  if (endOffset + 1 < endContainer.length) range.setEnd(endContainer, endOffset + 1);
  else if (endOffset > 1) range.setStart(endContainer, endOffset - 1);
  else return endContainer.parentNode;
  return range;
};

const makeRange = (doc, node, start, end = start) => {
  const range = doc.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
};

// use binary search to find an offset value in a text node (paginator.js:55-64)
const bisectNode = (doc, node, cb, start = 0, end = node.nodeValue.length) => {
  if (end - start === 1) {
    const result = cb(makeRange(doc, node, start), makeRange(doc, node, end));
    return result < 0 ? start : end;
  }
  const mid = Math.floor(start + (end - start) / 2);
  const result = cb(makeRange(doc, node, start, mid), makeRange(doc, node, mid, end));
  return result < 0
    ? bisectNode(doc, node, cb, start, mid)
    : result > 0
    ? bisectNode(doc, node, cb, mid, end)
    : mid;
};

// needed cause there seems to be a bug in `getBoundingClientRect()` in Firefox
// where it fails to include rects that have zero width and non-zero height
// (CSSOM spec says "rectangles [...] of which the height or width is not zero")
// which makes the visible range include an extra space at column boundaries
// (paginator.js:71-84)
const getBoundingClientRect = (target) => {
  let top = Infinity;
  let right = -Infinity;
  let left = Infinity;
  let bottom = -Infinity;
  for (const rect of target.getClientRects()) {
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
};

/**
 * Build the rect mapper that lets the walker treat the section as if it were
 * LTR and horizontal. Ported from foliate paginator.js #getRectMapper
 * (:901-918), paginated branch. RTL uses the so-called "negative scroll
 * type" mapping against the total page-box size; vertical maps block-axis
 * coordinates onto the inline axis.
 *
 * NOTE: RTL and vertical are ported faithfully but untested here — alice.epub
 * is horizontal LTR (same caveat as the paginator's scroll math).
 *
 * @param {{vertical?: boolean, rtl?: boolean, pxSize?: number}} options
 *   pxSize: total size of the expanded page box along the scroll axis
 *   (pages * page size)
 * @returns {(rect: {left: number, right: number, top?: number,
 *   bottom?: number}) => {left: number, right: number}}
 */
export const makeRectMapper =
  ({ vertical = false, rtl = false, pxSize = 0 }) =>
  (rect) => {
    if (rtl) {
      const { left, right } = rect;
      return { left: pxSize - right, right: pxSize - left };
    }
    if (vertical) {
      const { top, bottom } = rect;
      return { left: top, right: bottom };
    }
    return rect;
  };

/**
 * Compute the Range of content visible in [start, end] (inline-axis
 * coordinates, already mapped as-if-LTR-horizontal by the caller).
 * Ported from foliate paginator.js getVisibleRange (:86-143).
 *
 * @param {Document} doc the iframe's content document
 * @param {object} options
 * @param {number} options.start visible window start (inline axis)
 * @param {number} options.end visible window end (inline axis)
 * @param {boolean} [options.vertical=false]
 * @param {boolean} [options.rtl=false]
 * @param {number} [options.pxSize=0] expanded page-box size (RTL mapping)
 * @returns {Range | null} null when the document has no body
 */
export function getVisibleRange(doc, { start, end, vertical = false, rtl = false, pxSize = 0 }) {
  if (!doc?.body) return null;
  const mapRect = makeRectMapper({ vertical, rtl, pxSize });
  // first get all visible nodes
  const acceptNode = (node) => {
    const name = node.localName?.toLowerCase();
    // ignore all scripts, styles, and their children
    if (name === "script" || name === "style") return FILTER_REJECT;
    if (node.nodeType === 1) {
      const { left, right } = mapRect(node.getBoundingClientRect());
      // no need to check child nodes if it's completely out of view
      if (right < start || left > end) return FILTER_REJECT;
      // elements must be completely in view to be considered visible
      // because you can't specify offsets for elements
      if (left >= start && right <= end) return FILTER_ACCEPT;
      // TODO: it should probably allow elements that do not contain text
      // because they can exceed the whole viewport in both directions
      // especially in scrolled mode
    } else {
      // ignore empty text nodes
      if (!node.nodeValue?.trim()) return FILTER_SKIP;
      // create range to get rect
      const range = doc.createRange();
      range.selectNodeContents(node);
      const { left, right } = mapRect(range.getBoundingClientRect());
      // it's visible if any part of it is in view
      if (right >= start && left <= end) return FILTER_ACCEPT;
    }
    return FILTER_SKIP;
  };
  const walker = doc.createTreeWalker(doc.body, filter, { acceptNode });
  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);

  // we're only interested in the first and last visible nodes
  const from = nodes[0] ?? doc.body;
  const to = nodes[nodes.length - 1] ?? from;

  // find the offset at which visibility changes
  const startOffset =
    from.nodeType === 1
      ? 0
      : bisectNode(doc, from, (a, b) => {
          const p = mapRect(getBoundingClientRect(a));
          const q = mapRect(getBoundingClientRect(b));
          if (p.right < start && q.left > start) return 0;
          return q.left > start ? -1 : 1;
        });
  const endOffset =
    to.nodeType === 1
      ? 0
      : bisectNode(doc, to, (a, b) => {
          const p = mapRect(getBoundingClientRect(a));
          const q = mapRect(getBoundingClientRect(b));
          if (p.right < end && q.left > end) return 0;
          return q.left > end ? -1 : 1;
        });

  const range = doc.createRange();
  range.setStart(from, startOffset);
  range.setEnd(to, endOffset);
  return range;
}
