// PdfEngine — the "pdf" DocumentEngine, wrapping pdf.js's native viewer
// component layer (PDFViewer + PDFLinkService + EventBus from
// web/pdf_viewer.js) without the app shell. Compiled by the package's own
// webpack pipeline, so PDFJSDev defines and the pdfjs-lib alias are active —
// the raw-source-consumption failure mode of the spike (API/Worker version
// handshake) cannot occur here.
//
// Registered for format "pdf" via registerPdfEngine().

import { getDocument, GlobalWorkerOptions } from "pdfjs-lib";
import { EventBus } from "../pdf.js/web/event_utils.js";
import { PDFLinkService } from "../pdf.js/web/pdf_link_service.js";
import { PDFViewer } from "../pdf.js/web/pdf_viewer.js";
import { registerEngine } from "@document-kits/engine-core";

/**
 * @typedef {import("@document-kits/engine-core").DocumentEngine} DocumentEngine
 * @typedef {import("@document-kits/engine-core").Location} Location
 * @typedef {import("@document-kits/engine-core").CapabilityFlags} CapabilityFlags
 * @typedef {import("@document-kits/engine-core").OutlineItem} OutlineItem
 */

const PDF_CAPABILITIES = /** @type {CapabilityFlags} */ ({
  pagination: "stable",
  address: "spatial",
  delivery: "canvas",
  reflow: false,
  textStyle: false,
  outline: true,
  annotationEditing: false, // v1: view-only annotation layers
  tts: false,
});

/**
 * Build a PdfEngine. Resource URLs follow the same convention as
 * createViewerApp's resourcePath.
 *
 * @param {object} [options]
 * @param {string} [options.resourcePath] Base path for worker/cmaps/fonts,
 *   e.g. "./document-viewer" (mirrors createViewerApp).
 */
export function createPdfEngine(options = {}) {
  const { resourcePath = "" } = options;

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

  let loadingTask = null;
  let pdfDocument = null;
  let eventBus = null;
  let linkService = null;
  let pdfViewer = null;
  /** @type {HTMLDivElement | null} */
  let mountedRoot = null;
  /** Resolves when the viewer built its page views (EventBus "pagesinit");
   *  navigation before this would hit empty page arrays. */
  let pagesReady = Promise.resolve();

  const resourceUrl = (path) => new URL(`${resourcePath}/${path}`, document.baseURI).href;

  /** @type {DocumentEngine} */
  const engine = {
    format: () => "pdf",

    capabilities: () => PDF_CAPABILITIES,

    async open(source) {
      if (pdfDocument) {
        throw new Error("PdfEngine: already open");
      }
      GlobalWorkerOptions.workerSrc ||= resourceUrl("build/pdf.worker.mjs");

      let params;
      if (source instanceof Blob) {
        // File/Blob (user file picker): read bytes; getDocument's data param
        // takes ArrayBuffer/TypedArray, not File.
        params = { data: await source.arrayBuffer() };
      } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        params = { data: source };
      } else {
        params = { url: String(source) };
      }
      loadingTask = getDocument({
        ...params,
        cMapUrl: resourceUrl("web/cmaps/"),
        standardFontDataUrl: resourceUrl("web/standard_fonts/"),
        iccUrl: resourceUrl("web/iccs/"),
        wasmUrl: resourceUrl("web/wasm/"),
      });
      try {
        pdfDocument = await loadingTask.promise;
      } catch (err) {
        emitError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },

    async getMetadata() {
      const { info } = await pdfDocument.getMetadata();
      return { title: info?.Title ?? null, author: info?.Author ?? null };
    },

    async getOutline() {
      // Outline dests carry live Ref objects that do not survive JSON; the
      // host-facing href is eagerly resolved to a page number instead (small
      // trees, cheap). Zoom/scroll precision inside the page is lost — v1
      // navigates page-level.
      const resolvePage = async (dest) => {
        try {
          const array = typeof dest === "string" ? await pdfDocument.getDestination(dest) : dest;
          if (!Array.isArray(array)) {
            return null;
          }
          const pageIndex = await pdfDocument.getPageIndex(array[0]);
          return pageIndex + 1;
        } catch {
          return null;
        }
      };
      /** @type {OutlineItem[]} */
      const map = async (items) =>
        Promise.all(
          (items ?? []).map(async (it) => ({
            label: it.title ?? "",
            href: it.dest ? JSON.stringify({ page: await resolvePage(it.dest) }) : it.url,
            subitems: it.items?.length ? await map(it.items) : undefined,
          }))
        );
      return map(await pdfDocument.getOutline());
    },

    async mount(container) {
      if (!pdfDocument) {
        throw new Error("PdfEngine: open() before mount()");
      }
      mountedRoot = document.createElement("div");
      mountedRoot.style.position = "relative";
      mountedRoot.style.width = "100%";
      mountedRoot.style.height = "100%";
      // pdf.js viewer DOM contract: absolutely-positioned container with a
      // .pdfViewer child div (web/pdf_viewer.js:310-323 validates this).
      const viewerContainer = document.createElement("div");
      viewerContainer.style.position = "absolute";
      viewerContainer.style.inset = "0";
      viewerContainer.style.overflow = "auto";
      const viewerDiv = document.createElement("div");
      viewerDiv.className = "pdfViewer";
      viewerContainer.appendChild(viewerDiv);
      mountedRoot.appendChild(viewerContainer);
      container.appendChild(mountedRoot);

      eventBus = new EventBus();
      linkService = new PDFLinkService({ eventBus });
      pdfViewer = new PDFViewer({
        container: viewerContainer,
        viewer: viewerDiv,
        eventBus,
        linkService,
      });
      linkService.setViewer(pdfViewer);
      linkService.setDocument(pdfDocument);
      eventBus.on("documenterror", (evt) =>
        emitError(new Error(String(evt?.reason ?? "document error")))
      );
      // Subscribe before setDocument so the event cannot race us.
      pagesReady = new Promise((resolve) => eventBus.on("pagesinit", resolve, { once: true }));
      pdfViewer.setDocument(pdfDocument);
      await pagesReady;
    },

    async goTo(loc) {
      if (!pdfViewer) {
        throw new Error("PdfEngine: mount() before goTo()");
      }
      const dest = loc.nativeAddress ? JSON.parse(String(loc.nativeAddress)) : null;
      if (dest && typeof dest === "object" && typeof dest.page === "number") {
        pdfViewer.currentPageNumber = dest.page;
        return;
      }
      if (typeof loc.page === "number") {
        pdfViewer.currentPageNumber = loc.page;
        return;
      }
      // percentage-only restore: round to the nearest page
      const numPages = pdfDocument.numPages;
      pdfViewer.currentPageNumber = Math.min(
        numPages,
        Math.max(1, Math.round(loc.percentage * numPages))
      );
    },

    async getPosition() {
      const page = pdfViewer?.currentPageNumber ?? 1;
      const numPages = pdfDocument.numPages;
      return /** @type {Location} */ ({
        version: 1,
        page,
        percentage: numPages > 1 ? (page - 1) / (numPages - 1) : 0,
        docId: pdfDocument.fingerprints?.[0],
      });
    },

    async next() {
      if (!pdfViewer) throw new Error("PdfEngine: mount() before next()");
      pdfViewer.nextPage();
    },

    async prev() {
      if (!pdfViewer) throw new Error("PdfEngine: mount() before prev()");
      pdfViewer.previousPage();
    },

    async resolveHref(href) {
      try {
        const parsed = JSON.parse(href);
        const page =
          typeof parsed === "object" && parsed !== null && typeof parsed.page === "number"
            ? parsed.page
            : null;
        if (page === null || page < 1 || page > pdfDocument.numPages) {
          return null;
        }
        return { index: page - 1, anchor: () => null };
      } catch {
        return null;
      }
    },

    async *getTextContent() {
      for (let n = 1; n <= pdfDocument.numPages; n++) {
        const page = await pdfDocument.getPage(n);
        const { items } = await page.getTextContent();
        yield { str: items.map((it) => it.str).join(" "), page: n };
      }
    },

    on(name, cb) {
      if (name === "error") {
        errorListeners.push(cb);
      }
    },

    destroy() {
      pdfViewer?.cleanup();
      linkService?.setDocument(null);
      loadingTask?.destroy();
      mountedRoot?.remove();
      pdfDocument = null;
      pdfViewer = null;
      linkService = null;
      eventBus = null;
      loadingTask = null;
      mountedRoot = null;
    },
  };

  return engine;
}

/**
 * Register the "pdf" engine with engine-core's factory.
 *
 * @param {{resourcePath?: string}} [options] Passed to every created engine.
 */
export function registerPdfEngine(options = {}) {
  registerEngine("pdf", () => createPdfEngine(options));
}
