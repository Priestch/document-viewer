// EpubEngine — the "epub" DocumentEngine, consuming the foliate-js
// documented contract only: makeBook (view.js), the <foliate-view> custom
// element, book.sections/resolveHref/toc/metadata. Module-private internals
// (paginator's getVisibleRange/bisectNode) are never touched; the visible
// position comes from the `relocate` event instead.
//
// Error bridging: foliate has no error event after open (failures are
// swallowed into console.warn); resource load failures are surfaced by
// wrapping the transformTarget 'data' event promises (reader.js:114 pattern).
//
// Rendering is main-thread browser CSS by design (research doc §8.3/§10);
// the worker seam is sections[].load() → blob URL.

import { makeBook } from "foliate-js/view.js";
import { textWalker } from "foliate-js/text-walker.js";

/**
 * @typedef {import("@document-kits/engine-core").DocumentEngine} DocumentEngine
 * @typedef {import("@document-kits/engine-core").Location} Location
 * @typedef {import("@document-kits/engine-core").CapabilityFlags} CapabilityFlags
 * @typedef {import("@document-kits/engine-core").OutlineItem} OutlineItem
 */

const EPUB_CAPABILITIES = /** @type {CapabilityFlags} */ ({
  pagination: "reflowing",
  address: "positional",
  delivery: "dom",
  reflow: true,
  textStyle: true,
  outline: true,
  annotationEditing: false, // overlayer draws; editing flow is a later phase
  tts: true,
});

/** foliate metadata fields can be language maps ({en: "..."}); flatten them. */
function flattenLanguageMap(value) {
  if (value == null || typeof value !== "object") return value ?? null;
  return Object.values(value)[0] ?? null;
}

/**
 * Build an EpubEngine.
 *
 * @param {object} [options]
 * @param {string} [options.height] CSS height for the mounted view
 *   (default "100%" of the container).
 */
export function createEpubEngine(options = {}) {
  const { height = "100%" } = options;

  /** @type {any} foliate book object */
  let book = null;
  /** @type {any} <foliate-view> element */
  let view = null;
  let lastRelocate = null; // relocate detail: {fraction, cfi, range, tocItem, ...}
  let lastLoad = null; // load detail: {doc, index}
  const relocateWaiters = [];
  /** @type {((err: Error) => void)[]} */
  const errorListeners = [];

  const emitError = (err) => {
    for (const cb of errorListeners) {
      try {
        cb(err);
      } catch {
        /* listener errors must not break the engine */
      }
    }
  };

  const waitForRelocate = (timeoutMs = 3000) => {
    if (lastRelocate) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const i = relocateWaiters.indexOf(settle);
        if (i >= 0) relocateWaiters.splice(i, 1);
        resolve();
      }, timeoutMs);
      const settle = () => clearTimeout(timer);
      relocateWaiters.push(settle);
    });
  };

  const navigate = async (target) => {
    lastRelocate = null;
    try {
      await view.goTo(target);
      await waitForRelocate();
    } catch (err) {
      emitError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  /** @type {DocumentEngine} */
  const engine = {
    format: () => "epub",

    capabilities: () => EPUB_CAPABILITIES,

    async open(source) {
      try {
        book = await makeBook(source);
      } catch (err) {
        emitError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
      // Bridge foliate's silent resource failures into the engine error
      // channel: wrap the loader's data promises.
      book.transformTarget?.addEventListener?.("data", ({ detail }) => {
        detail.data = Promise.resolve(detail.data).catch((e) => {
          emitError(new Error(`Failed to load ${detail.name}`, { cause: e }));
          return "";
        });
      });
    },

    async getMetadata() {
      const m = book?.metadata ?? {};
      return {
        title: flattenLanguageMap(m.title),
        author: flattenLanguageMap(m.author),
      };
    },

    async getOutline() {
      /** @type {(items: any[]) => OutlineItem[]} */
      const map = (items) =>
        (items ?? []).map((it) => ({
          label: flattenLanguageMap(it.label) ?? "",
          href: it.href,
          subitems: it.subitems?.length ? map(it.subitems) : undefined,
        }));
      return map(book?.toc);
    },

    async mount(container) {
      if (!book) {
        throw new Error("EpubEngine: open() before mount()");
      }
      view = document.createElement("foliate-view");
      view.style.width = "100%";
      view.style.height = height;
      view.addEventListener("relocate", (e) => {
        lastRelocate = e.detail;
        for (const w of relocateWaiters.splice(0)) w();
      });
      view.addEventListener("load", (e) => {
        lastLoad = e.detail;
      });
      container.appendChild(view);
      await view.open(book);
      // foliate-view emits its first `relocate` only after a goTo; establish
      // the position eagerly so getPosition() right after mount() resolves
      // immediately instead of stalling for the wait timeout (spike lesson).
      await navigate(0);
    },

    async goTo(loc) {
      if (!view) {
        throw new Error("EpubEngine: mount() before goTo()");
      }
      const target =
        loc.nativeAddress ??
        loc.cfi ??
        (typeof loc.sectionIndex === "number" ? loc.sectionIndex : null) ??
        (typeof loc.percentage === "number" ? { fraction: loc.percentage } : null);
      if (target == null) {
        throw new Error(`EpubEngine.goTo: unusable location ${JSON.stringify(loc)}`);
      }
      await navigate(target);
    },

    async getPosition() {
      if (!lastRelocate) await waitForRelocate();
      const d = lastRelocate ?? {};
      return /** @type {Location} */ ({
        version: 1,
        sectionIndex: lastLoad?.index,
        nativeAddress: d.cfi ?? null,
        percentage: d.fraction ?? 0,
        docId: book?.metadata?.identifier ?? null,
      });
    },

    async next() {
      if (!view) throw new Error("EpubEngine: mount() before next()");
      lastRelocate = null;
      await view.next();
      await waitForRelocate();
    },

    async prev() {
      if (!view) throw new Error("EpubEngine: mount() before prev()");
      lastRelocate = null;
      await view.prev();
      await waitForRelocate();
    },

    async resolveHref(href) {
      const resolved = await book?.resolveHref?.(href);
      if (!resolved) {
        return null;
      }
      // Anchor union verified at runtime: Range | Element | number | null.
      const doc = lastLoad?.doc ?? (await book.sections?.[resolved.index]?.createDocument?.());
      const anchorResult = resolved.anchor?.(doc);
      return {
        index: resolved.index,
        anchor: () => anchorResult,
      };
    },

    async *getTextContent() {
      const sections = book?.sections ?? [];
      for (let i = 0; i < sections.length; i++) {
        let doc;
        try {
          doc = await sections[i].createDocument();
        } catch {
          continue; // non-XHTML resources (images etc.) have no text
        }
        const chunks = [];
        // textWalker's contract: the callback must RETURN an iterable that
        // the walker for-yields over — collecting via side effect alone
        // returns a Number and throws (spike bug, fixed).
        const walker = textWalker(doc, (strs) => {
          chunks.push(strs.join(" "));
          return [];
        });
        for await (const _ of walker) {
          void _; // iterating drives the walker
        }
        if (chunks.length) yield { str: chunks.join(" "), index: i };
      }
    },

    on(name, cb) {
      if (name === "error") {
        errorListeners.push(cb);
      }
    },

    destroy() {
      view?.remove();
      view = null;
      book = null;
      lastRelocate = null;
      lastLoad = null;
    },
  };

  return engine;
}
