// Iframe host for one rendered section — the presentation primitive under the
// paginator. Ported from foliate-js paginator.js `View` (MIT, John Factotum)
// as a plain module: the View class owns iframe lifecycle, direction sniffing,
// the content Range, injected styles and expansion; everything else (column
// math) lives in layout.js, which this module calls.
//
// foliate anchors (paginator.js @ foliate-js 1.0.1):
//   - element/iframe styles + sandbox string ......... :200-236
//   - load(): visibility toggle, direction, styles ... :243-276
//   - injected <style> pair .......................... :1013-1020
//   - ResizeObserver on body -> expand ............... :201, :265
//   - doc.fonts.ready -> expand (Firefox RO bug) ..... :267-270
//   - expand() sizing ................................ :354-373 (via layout.js)
//   - setStyles() without iframe reload .............. :1135-1153

import { applyColumnStyles, measurePageCount } from "./layout.js";

// ported from foliate paginator.js:168-177 `getDirection` — the section's own
// writing mode decides the column axis before any layout math runs
const getDirection = (doc) => {
  const { defaultView } = doc;
  const { writingMode, direction } = defaultView.getComputedStyle(doc.body);
  const vertical = writingMode === "vertical-rl" || writingMode === "vertical-lr";
  const rtl = doc.body.dir === "rtl" || direction === "rtl" || doc.documentElement.dir === "rtl";
  return { vertical, rtl };
};

/**
 * Create the iframe host appended to `host`.
 *
 * Layout framing mirrors foliate's host grid (paginator.js:455-486): the
 * visible content box is inset from the host — vertical `margin`, horizontal
 * `gapPercent / 2` percent of the host width — and the SCROLL CONTAINER is
 * the content box (foliate #container), not the host. Layout params must be
 * computed against the content box (frame.contentRect) and scrolling must
 * target frame.scrollEl.
 *
 * @param {Element} host fixed-size element; the frame occupies it fully
 * @param {{onExpand?: Function, margin?: number, gapPercent?: number}} options
 *   onExpand() fires after every expansion pass; margin/gapPercent default to
 *   foliate's host defaults (48px / 7%)
 */
export function createFrame(host, { onExpand, margin = 48, gapPercent = 7 } = {}) {
  const viewBox = document.createElement("div"); // content box (grid, :481-486)
  const element = document.createElement("div"); // View.#element (:202)
  const iframe = document.createElement("iframe"); // View.#iframe (:203)
  const contentRange = document.createRange(); // View.#contentRange (:204)
  const observer = new ResizeObserver(() => expand()); // :201
  let styleBefore = null; // injected <style> before content (:1014-1015)
  let styleAfter = null; // injected <style> after content (:1016-1017)
  let vertical = false;
  let rtl = false;
  let params = null; // last layout params (from beforeRender, layout.js)
  let beforeRender = null; // stored so render() can re-run layout on resize
  let pageCount = 0;
  let expandedSize = 0;

  // Host framing: content box inset like foliate's #top grid — fixed
  // vertical margin, horizontal gutters of half the column gap (percent of
  // the host, matching the CSS-% semantics of :467/:481-486).
  Object.assign(host.style, { position: "relative", overflow: "hidden" });
  Object.assign(viewBox.style, {
    boxSizing: "border-box",
    position: "absolute",
    top: `${margin}px`,
    bottom: `${margin}px`,
    left: `${gapPercent / 2}%`,
    right: `${gapPercent / 2}%`,
    overflow: "hidden",
  });

  Object.assign(element.style, {
    boxSizing: "content-box",
    position: "relative",
    overflow: "hidden",
    flex: "0 0 auto",
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }); // :216-225
  Object.assign(iframe.style, {
    overflow: "hidden",
    border: "0",
    display: "none",
    width: "100%",
    height: "100%",
  }); // :226-231
  // `allow-scripts` is needed for events because of WebKit bug
  // https://bugs.webkit.org/show_bug.cgi?id=218086 (:232-234)
  iframe.setAttribute("sandbox", "allow-same-origin allow-scripts");
  iframe.setAttribute("scrolling", "no"); // :235
  element.append(iframe);
  viewBox.append(element);
  host.append(viewBox);

  // ported from View.expand() column branch (:354-373). The page count and
  // expanded size come from layout.js (single source of layout math); this
  // function only applies them to the element/iframe/documentElement boxes.
  function expand() {
    const doc = iframe.contentDocument;
    if (!doc || !params) return;
    const side = vertical ? "height" : "width";
    const otherSide = vertical ? "width" : "height";
    ({ pageCount, expandedSize } = measurePageCount(doc, contentRange, params));
    element.style.padding = "0";
    iframe.style[side] = `${expandedSize}px`;
    element.style[side] = `${expandedSize + params.size * 2}px`;
    iframe.style[otherSide] = "100%";
    element.style[otherSide] = "100%";
    // the sentinel pages live in the element's side margins; the html box
    // itself is exactly one page (:373)
    doc.documentElement.style[side] = `${params.size}px`;
    onExpand?.();
  }

  // re-run layout against the current host size WITHOUT reloading the iframe
  // (Paginator.render -> View.render -> columnize, :772-779 + :277-283)
  function render() {
    const doc = iframe.contentDocument;
    // doc.body is null while the iframe document is still parsing — the
    // paginator's host ResizeObserver can fire in that window (e.g. its
    // initial observe() delivery landing mid-load); there is nothing to
    // re-layout yet
    if (!doc?.body || !beforeRender) return;
    params = beforeRender({ doc, vertical, rtl });
    applyColumnStyles(doc, params);
    expand();
  }

  /**
   * Load a section blob URL into the iframe.
   *
   * @param {string} blobUrl
   * @param {{afterLoad?: Function, beforeRender?: Function}} options
   *   afterLoad(doc) runs before direction sniffing; beforeRender({doc,
   *   vertical, rtl}) must return layout params (layout.computeParams) — its
   *   return value is applied via layout.applyColumnStyles, then the frame
   *   expands once.
   */
  function loadDoc(blobUrl, { afterLoad, beforeRender: beforeRenderCb } = {}) {
    if (typeof blobUrl !== "string") throw new Error(`${blobUrl} is not string`); // :244
    beforeRender = beforeRenderCb;
    return new Promise((resolve) => {
      iframe.addEventListener(
        "load",
        () => {
          const doc = iframe.contentDocument;

          // the injected style pair: one before the book's own content, one
          // after (which therefore wins the cascade) — paginator.js:1013-1020
          if (doc.head && !styleAfter) {
            styleBefore = doc.createElement("style");
            doc.head.prepend(styleBefore);
            styleAfter = doc.createElement("style");
            doc.head.append(styleAfter);
          }
          afterLoad?.(doc);

          // it needs to be visible for Firefox to get computed style
          // (:250-256) — toggle on, read direction, toggle back off
          iframe.style.display = "block";
          ({ vertical, rtl } = getDirection(doc));
          iframe.style.display = "none";

          contentRange.selectNodeContents(doc.body); // :261
          if (beforeRenderCb) params = beforeRenderCb({ doc, vertical, rtl });

          iframe.style.display = "block";
          applyColumnStyles(doc, params);
          expand();
          observer.observe(doc.body); // :265 — fires an initial pass too

          // the resize observer above doesn't work in Firefox
          // (https://bugzilla.mozilla.org/show_bug.cgi?id=1832939);
          // account for font load at least (:267-270)
          doc.fonts?.ready?.then(() => expand());

          resolve();
        },
        { once: true }
      );
      iframe.src = blobUrl;
    });
  }

  /**
   * Swap the injected styles' textContent WITHOUT reloading the iframe —
   * ported from Paginator.setStyles (:1135-1153). Accepts a css string or a
   * [before, after] pair.
   */
  function setStyles(cssText) {
    if (!styleAfter) return;
    if (Array.isArray(cssText)) {
      const [before, after] = cssText;
      styleBefore.textContent = before;
      styleAfter.textContent = after;
    } else {
      styleAfter.textContent = cssText;
    }
    // style changes can reflow (font swaps); re-expand once fonts settle
    // (:1151-1152)
    iframe.contentDocument?.fonts?.ready?.then(() => expand());
  }

  function destroy() {
    observer.disconnect(); // View.destroy (:410-412) unobserves; we also drop
    iframe.remove(); // the iframe and wrapper outright — the paginator
    element.remove(); // replaces the whole view between sections (:659-669)
    viewBox.remove();
  }

  return {
    element,
    iframe,
    /** The scroll container (content box) — paginated scrolling targets this. */
    scrollEl: viewBox,
    /** Layout params must be computed against this rect, not the host's. */
    get contentRect() {
      const { width, height } = viewBox.getBoundingClientRect();
      return { width, height };
    },
    get document() {
      return iframe.contentDocument;
    },
    get contentWindow() {
      return iframe.contentWindow;
    },
    get contentRange() {
      return contentRange;
    },
    get vertical() {
      return vertical;
    },
    get rtl() {
      return rtl;
    },
    get params() {
      return params;
    },
    get pageCount() {
      return pageCount;
    },
    get expandedSize() {
      return expandedSize;
    },
    loadDoc,
    render,
    expand,
    setStyles,
    destroy,
  };
}
