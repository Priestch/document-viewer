// EpubEngine — the "epub" DocumentEngine, now consuming our own pipeline
// (src/pipeline/) end to end: the backend assembles the book (zip-source →
// package → toc → resources/rewriter → sections), and rendering runs on our
// paginator port (frame + layout + visible-range) instead of
// <foliate-view>. The engine keeps the DocumentEngine 12-method surface,
// capabilities and options identical to the foliate-backed version.
//
// Error bridging: resource load failures are surfaced by wrapping the
// transformTarget 'data' event promises (the resource cache dispatches them,
// foliate-transformTarget-shaped; reader.js:114 pattern, ported) — the
// pipeline's paginator has no error channel of its own after open.

import { createInProcessBackend } from "./book_backend.js";
import { createPaginator } from "./pipeline/paginator.js";
import { getCFI, resolveCFI, resolveHref as resolveHrefInBook } from "./pipeline/cfi.js";
import { extractText } from "./pipeline/text.js";
import { defaultStyleCSS } from "./pipeline/styles.js";

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

/** Pipeline metadata can hold arrays (author) or language maps; flatten both. */
function flattenLanguageMap(value) {
  if (value == null || typeof value !== "object") return value ?? null;
  if (Array.isArray(value)) return value.filter((v) => v != null && v !== "").join(", ") || null;
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
  const { height = "100%", backend = createInProcessBackend(), textStyle = {} } = options;
  /** Current typography settings — backs the textStyle capability. */
  let styleState = { ...textStyle };

  /** @type {any} book object from the backend ({sections, metadata, toc, ...}) */
  let book = null;
  /** @type {any} our paginator instance */
  let paginator = null;
  /** wrapper element the paginator scrolls (removed on destroy) */
  let host = null;
  let lastRelocate = null; // relocate detail: {reason, index, range, fraction?, size?}
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

  // Our paginator emits `relocate` synchronously at the end of every
  // display/scroll/turn path, so this normally settles without the timer.
  const navigate = async (target) => {
    lastRelocate = null;
    try {
      await paginator.goTo(target);
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
        book = await backend.open(source);
      } catch (err) {
        emitError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
      // Bridge silent resource failures into the engine error channel: wrap
      // the cache's data promises (the transformTarget 'data' events).
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
      host = document.createElement("div");
      host.style.width = "100%";
      host.style.height = height;
      container.appendChild(host);
      paginator = createPaginator({ host });
      paginator.on("relocate", (detail) => {
        lastRelocate = detail;
        for (const w of relocateWaiters.splice(0)) w();
      });
      // The frame is recreated per section — re-apply typography on every
      // load (covers the mount-time display too) or the recipe only
      // survives the section shown at mount.
      paginator.on("load", () => paginator.setStyles(defaultStyleCSS(styleState)));
      paginator.open(book);
      // Establish the position eagerly so getPosition() right after mount()
      // resolves immediately — the paginator emits its first `relocate`
      // synchronously inside display() (spike lesson, kept).
      await navigate({ index: 0, anchor: 0 });
      // Typography injection is handled by the paginator "load" listener
      // above (fires for this display and every section change).
    },

    /**
     * Live typography update (lineHeight/justify/hyphenate/fontFamily/
     * fontSize) — restyles in place, never reloads the iframe. Backs the
     * `textStyle: true` capability.
     * @param {object} patch
     */
    setStyle(patch) {
      if (!paginator) {
        throw new Error("EpubEngine: mount() before setStyle()");
      }
      styleState = { ...styleState, ...patch };
      paginator.setStyles(defaultStyleCSS(styleState));
    },

    async goTo(loc) {
      if (!paginator) {
        throw new Error("EpubEngine: mount() before goTo()");
      }
      const address = loc.nativeAddress ?? loc.cfi;
      let target = null;
      if (typeof address === "string" && address.startsWith("epubcfi(")) {
        target = resolveCFI(book, address); // {index, anchor}
      } else if (typeof loc.sectionIndex === "number") {
        target = { index: loc.sectionIndex };
      } else if (typeof loc.percentage === "number") {
        target = { fraction: loc.percentage };
      }
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
        sectionIndex: d.index,
        nativeAddress: getCFI(book, d.index, d.range),
        percentage: d.fraction ?? 0,
        docId: book?.metadata?.identifier ?? null,
      });
    },

    async next() {
      if (!paginator) throw new Error("EpubEngine: mount() before next()");
      lastRelocate = null;
      await paginator.next();
      await waitForRelocate();
    },

    async prev() {
      if (!paginator) throw new Error("EpubEngine: mount() before prev()");
      lastRelocate = null;
      await paginator.prev();
      await waitForRelocate();
    },

    async resolveHref(href) {
      const resolved = book ? resolveHrefInBook(book, href) : null;
      if (!resolved) {
        return null;
      }
      // Anchor union verified at runtime: Range | Element | number | null.
      // Prefer the live document so ranges land in the rendered tree.
      const doc =
        paginator?.view?.document ?? (await book.sections?.[resolved.index]?.createDocument?.());
      const anchorResult = resolved.anchor(doc);
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
        const str = extractText(doc);
        if (str) yield { str, index: i };
      }
    },

    on(name, cb) {
      if (name === "error") {
        errorListeners.push(cb);
      }
    },

    destroy() {
      paginator?.destroy();
      paginator = null;
      host?.remove();
      host = null;
      book = null;
      lastRelocate = null;
      // revoke every live blob URL in the resource cache
      backend.destroy?.();
    },
  };

  return engine;
}
