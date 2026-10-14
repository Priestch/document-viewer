// Book worker — holds the zip + foliate book on the worker side
// (docs/plans/2026-10-15-epub-worker-prep.md §3 protocol).
//
// Verified worker-safe: foliate's makeBook chain (view.js dispatch →
// epub.js parse → vendor zip loaders) uses only DOMParser/XMLSerializer —
// no document/window globals; view.js's only main-thread globals live in
// View.open (renderer creation), which stays on the main thread.

// Order matters: the polyfill module MUST be imported before foliate —
// text-walker.js reads NodeFilter.SHOW_* at module-eval time, and ES
// sibling imports evaluate in order.
import "./nodefilter-polyfill.js";
import { makeBook } from "foliate-js/view.js";

let book = null;

self.onmessage = async ({ data: msg }) => {
  const reply = (t, extra = {}) => self.postMessage({ t, id: msg.id, ...extra });
  try {
    switch (msg.t) {
      case "open": {
        // makeBook expects a File (isCBZ/isFBZ read file.name) — normalize
        // everything to a named File on the worker side.
        let source = msg.source;
        if (typeof source === "string" || source instanceof URL) {
          source = new File([await (await fetch(String(source))).blob()], msg.name ?? "book");
        } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
          source = new File([source], msg.name ?? "book");
        } else if (source instanceof Blob && !(source instanceof File)) {
          source = new File([source], msg.name ?? "book");
        }
        book = await makeBook(source);
        // transformTarget error bridge: forward resource failures.
        book.transformTarget?.addEventListener?.("data", ({ detail }) => {
          Promise.resolve(detail.data).catch((e) => {
            self.postMessage({ t: "resourceError", name: detail.name, message: String(e) });
          });
        });
        reply("opened", {
          snapshot: {
            metadata: book.metadata,
            toc: book.toc,
            rendition: book.rendition ?? null,
            sections: book.sections.map((s) => ({
              size: s.size,
              linear: s.linear,
              cfi: s.cfi,
              id: s.id,
            })),
          },
        });
        break;
      }
      case "load": {
        const url = await book.sections[msg.i].load();
        reply("loaded", { i: msg.i, url });
        break;
      }
      case "unload": {
        book.sections[msg.i]?.unload?.();
        break; // fire-and-forget
      }
      case "text": {
        const doc = await book.sections[msg.i].createDocument();
        reply("text", {
          i: msg.i,
          str: doc?.documentElement?.outerHTML ?? null,
        });
        break;
      }
      case "resolveHref": {
        const resolved = await book.resolveHref?.(msg.href);
        // anchor closures cannot cross RPC — send ingredients only; the
        // proxy materializes a section-start anchor (degraded vs in-process).
        reply("resolved", {
          resolved: resolved ? { index: resolved.index } : null,
        });
        break;
      }
      default:
        reply("error", { message: `unknown message type ${msg.t}` });
    }
  } catch (err) {
    reply("error", { message: String(err?.stack || err) });
  }
};
