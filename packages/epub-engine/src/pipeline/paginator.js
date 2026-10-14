// The page state machine: loads sections into frames, owns scroll/turn state
// and emits `relocate`. Ported from foliate-js paginator.js (MIT, John
// Factotum) — the `Paginator` custom element stripped to paginated flow and
// flattened into a plain module:
//   - scroll state getters ........ :783-818
//   - afterScroll / relocate ...... :987-1005
//   - display / goTo .............. :1006-1061
//   - scrollToAnchor .............. :953-979
//   - turn / adjacent / lock ...... :1062-1126, :1091-1097
// Everything layout-shaped (columns, gaps, page counts) is delegated to
// layout.js; the frame lifecycle lives in frame.js.
//
// NOTE: RTL uses the "negative scroll type" convention (paginator.js:415) and
// vertical writing modes change the scroll axis (:783-791). Both paths are
// ported faithfully but are UNTESTED here — the acceptance corpus (EPUB) is
// horizontal LTR.

import { createFrame } from "./frame.js";
import { computeParams } from "./layout.js";
import { getVisibleRange, makeRectMapper, uncollapse } from "./visible-range.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a paginator mounted on `host`.
 *
 * @param {object} options
 * @param {Element} options.host the scroll container — should have a fixed
 *   size; the paginator sets `overflow: hidden` and scrolls it page-wise
 * @param {number} [options.maxInlineSize=1000] passed to layout.computeParams
 * @param {number} [options.maxColumnCount=2]
 * @param {number} [options.margin=0]
 * @param {number} [options.gapPercent=0]
 * @returns {{open: Function, display: Function, goTo: Function, next: Function,
 *   prev: Function, goToTextStart: Function, on: Function, destroy: Function,
 *   view: object, index: number, fraction: number}}
 */
export function createPaginator({ host, ...layoutOptions }) {
  const listeners = new Map();
  const hostObserver = new ResizeObserver(() => frame?.render()); // :550 + :620-637

  let book = null;
  let frame = null;
  let index = -1;
  let anchor = 0; // anchor view to a fraction (0-1), Range, or Element (:833)
  let locked = false; // while true, prevent any further navigation (:1097)

  host.style.overflow = "hidden"; // foliate #container (:498-502)
  hostObserver.observe(host);

  const on = (name, cb) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(cb);
  };
  // emitted SYNCHRONOUSLY at the end of every display/scroll/turn path
  // (anti-koodo rule 3) — never deferred, never coalesced
  const emit = (name, detail) => {
    for (const cb of listeners.get(name) ?? []) cb(detail);
  };

  // ---- scroll state (paginator.js:783-818, paginated branch) ----
  const vertical = () => frame?.vertical ?? false;
  const rtl = () => frame?.rtl ?? false;
  const sideProp = () => (vertical() ? "height" : "width"); // :788-791
  const scrollProp = () => (vertical() ? "scrollTop" : "scrollLeft"); // :784-786
  const size = () => host.getBoundingClientRect()[sideProp()]; // :793-795
  const viewSize = () => frame.element.getBoundingClientRect()[sideProp()]; // :796-798
  const start = () => Math.abs(host[scrollProp()]); // :799-801
  const end = () => start() + size(); // :802-804
  const page = () => Math.floor((start() + end()) / 2 / size()); // :805-807
  const pages = () => Math.round(viewSize() / size()); // :808-810

  // allows one to process rects as if they were LTR and horizontal
  // (paginator.js:901-918, paginated branch; see visible-range.js)
  const getRectMapper = () =>
    makeRectMapper({ vertical: vertical(), rtl: rtl(), pxSize: pages() * size() });

  // ---- relocate (paginator.js:987-1005) ----
  function afterScroll(reason) {
    if (!frame?.document) return;
    // :983-985 — map the visible window back one page: the element's
    // side margins hold the sentinel pages, so iframe coordinates and the
    // scroll position differ by exactly one page
    const s = rtl() ? -size() : size();
    const range = getVisibleRange(frame.document, {
      start: start() - s,
      end: end() - s,
      vertical: vertical(),
      rtl: rtl(),
      pxSize: pages() * size(),
    });
    if (!range) return;
    // don't set new anchor if relocation was to scroll to anchor (:991-993)
    if (reason !== "selection" && reason !== "navigation" && reason !== "anchor") anchor = range;

    const detail = { reason, index, range };
    if (pages() > 2) {
      // :998-1003 — sentinel math: pages 0 and pages-1 are blank, so the
      // fraction runs from the first to the last *content* page
      detail.fraction = (page() - 1) / (pages() - 2);
      detail.size = 1 / (pages() - 2);
    }
    emit("relocate", detail);
  }

  // ---- scrolling (paginator.js:919-952, instant only — no animation) ----
  function scrollTo(offset, reason) {
    // :927-947 minus smooth/snap handling
    host[scrollProp()] = offset;
    afterScroll(reason);
  }
  function scrollToPage(p, reason) {
    // :949-952 — RTL negative scroll type: pages live at negative offsets
    scrollTo(size() * (rtl() ? -p : p), reason);
  }
  function scrollToRect(rect, reason) {
    // :919-926, paginated branch
    const offset = getRectMapper()(rect).left;
    scrollToPage(Math.floor(offset / size()) + (rtl() ? -1 : 1), reason);
  }
  // port of #scrollToAnchor (:956-979); `target` is a fraction (0-1), a Range
  // or an Element. The default reason is 'anchor' so afterScroll keeps the
  // current anchor instead of adopting the visible range.
  function scrollToAnchor(target, reason = "anchor") {
    anchor = target;
    const rects = uncollapse(target)?.getClientRects?.();
    // if anchor is an element or a range
    if (rects) {
      // when the start of the range is immediately after a hyphen in the
      // previous column, there is an extra zero width rect in that column
      const rect = Array.from(rects).find((r) => r.width > 0 && r.height > 0) || rects[0];
      if (!rect) return;
      scrollToRect(rect, reason);
      return;
    }
    // if anchor is a fraction
    const p = pages();
    if (!p) return;
    const textPages = p - 2;
    scrollToPage(Math.round(target * (textPages - 1)) + 1, reason);
  }

  // ---- display (paginator.js:1006-1035 + #goTo :1039-1055) ----
  const canGoToIndex = (i) => i >= 0 && i <= book.sections.length - 1; // :1036-1038

  async function goToInternal({ index: targetIndex, anchor: targetAnchor }) {
    if (!book || targetIndex == null || !canGoToIndex(targetIndex)) return;
    let src = null;
    if (targetIndex !== index || !frame) {
      // foliate loads the new section before replacing the view, then unloads
      // the old one after the new document is up (:1043-1050)
      src = await book.sections[targetIndex].load();
    }
    const oldIndex = index;
    index = targetIndex;
    if (src != null) {
      // #createView (:659-669) — the whole view is replaced between sections
      if (frame) frame.destroy();
      frame = createFrame(host, {
        // re-anchor after every expansion pass (fonts, resize observer)
        onExpand: () => scrollToAnchor(anchor),
      });
      await frame.loadDoc(src, {
        beforeRender: ({ vertical: v, rtl: r }) =>
          computeParams(host.getBoundingClientRect(), { ...layoutOptions, vertical: v, rtl: r }),
      });
      // wait for the fonts-driven expansion pass before anchoring — the
      // frame registered its own fonts.ready -> expand callback inside
      // loadDoc, so it runs first and the anchor scroll sees the settled
      // geometry (M4 spec: "columnize, wait expand (fonts.ready), scroll to
      // anchor"). Layout triggered by late image loads still re-anchors
      // asynchronously afterwards via onExpand.
      await frame.document?.fonts?.ready;
      // never unload the section we just (re)loaded — only the previous one
      if (oldIndex !== targetIndex) book.sections[oldIndex]?.unload?.();
    }
    const resolved =
      typeof targetAnchor === "function" ? targetAnchor(frame.document) : targetAnchor;
    await scrollToAnchor(resolved ?? 0);
  }

  // ---- public navigation ----
  async function goTo(target) {
    // :1057-1061
    if (locked) return;
    const resolved = await target;
    if (resolved?.fraction != null) {
      await scrollToAnchor(resolved.fraction);
      return;
    }
    if (resolved && canGoToIndex(resolved.index)) await goToInternal(resolved);
  }

  // #adjacentIndex (:1091-1094) — skip spine items marked non-linear
  function adjacentIndex(dir) {
    for (let i = index + dir; canGoToIndex(i); i += dir) {
      if (book.sections[i]?.linear !== "no") return i;
    }
    return null;
  }

  const atStart = () => adjacentIndex(-1) == null && page() <= 1; // :1085-1087
  const atEnd = () => adjacentIndex(1) == null && page() >= pages() - 2; // :1088-1090

  function scrollPrev() {
    // :1062-1072, paginated branch
    if (!frame) return true;
    if (atStart()) return;
    const p = page() - 1;
    scrollToPage(p, "page");
    return p <= 0;
  }
  function scrollNext() {
    // :1073-1084, paginated branch
    if (!frame) return true;
    if (atEnd()) return;
    const p = page() + 1;
    const total = pages();
    scrollToPage(p, "page");
    return p >= total - 1;
  }

  // #turnPage (:1095-1106) — navigation lock prevents interleaved turns
  async function turnPage(dir) {
    if (locked) return;
    locked = true;
    const prev = dir === -1;
    const shouldGo = prev ? scrollPrev() : scrollNext();
    if (shouldGo) {
      await goToInternal({
        index: adjacentIndex(dir),
        anchor: prev ? 1 : 0, // land at the end when going back (:1102)
      });
    }
    await wait(100); // :1104
    locked = false;
  }

  return {
    /** Bind a foliate-shaped book ({sections, ...}); foliate open() (:639-642). */
    open(target) {
      book = target;
    },
    /** Live restyle of the injected style pair — no iframe reload
     *  (anti-koodo rule 4: font/theme changes never re-open the book). */
    setStyles(cssText) {
      frame?.setStyles(cssText);
    },
    /** Display a section (index + optional anchor) — goTo({index, anchor}). */
    display(targetIndex, targetAnchor = 0) {
      return goTo({ index: targetIndex, anchor: targetAnchor });
    },
    /** Go to {index, anchor} or {fraction} (within the current section). */
    goTo,
    next() {
      return turnPage(1);
    },
    prev() {
      return turnPage(-1);
    },
    /** Display the first linear section (foliate firstSection, :1119-1122). */
    goToTextStart() {
      const i = book.sections.findIndex((section) => section.linear !== "no");
      return goTo({ index: i, anchor: 0 });
    },
    on,
    get view() {
      return frame;
    },
    get index() {
      return index;
    },
    /** Current fraction per the sentinel math in afterScroll. */
    get fraction() {
      return pages() > 2 ? (page() - 1) / (pages() - 2) : 0;
    },
    /** Current page count of the displayed section. */
    get pages() {
      return pages();
    },
    destroy() {
      // :1157-1163
      hostObserver.disconnect();
      frame?.destroy();
      frame = null;
      book?.sections[index]?.unload?.();
    },
  };
}
