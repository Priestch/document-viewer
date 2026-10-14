// WorkerBackend — BookBackend implementation over the book worker
// (docs/plans/2026-10-15-epub-worker-prep.md). book() returns a BookProxy
// that quacks like a foliate book so <foliate-view> consumes it unchanged.

/**
 * @typedef {import("./book_backend.js").BookBackend} BookBackend
 */

class Rpc {
  #worker;
  #seq = 0;
  /** @type {Map<number, {resolve: Function, reject: Function}>} */
  #pending = new Map();

  constructor(worker) {
    this.#worker = worker;
    worker.addEventListener("message", ({ data: msg }) => {
      if (msg.id != null && this.#pending.has(msg.id)) {
        const { resolve, reject } = this.#pending.get(msg.id);
        this.#pending.delete(msg.id);
        if (msg.t === "error") {
          reject(new Error(msg.message));
        } else {
          resolve(msg);
        }
      }
    });
  }

  /** @returns {Promise<any>} the full reply message */
  call(t, extra = {}) {
    const id = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ t, id, ...extra });
    });
  }

  notify(t, extra = {}) {
    this.#worker.postMessage({ t, id: null, ...extra });
  }

  terminate() {
    this.#worker.terminate();
    for (const { reject } of this.#pending.values()) {
      reject(new Error("worker terminated"));
    }
    this.#pending.clear();
  }
}

/** EventTarget standing in for the loader's transformTarget (error bridge). */
class ProxyTransformTarget extends EventTarget {}

export function createWorkerBackend() {
  const worker = new Worker(new URL("./worker/book-worker.js", import.meta.url), {
    type: "module",
  });
  const rpc = new Rpc(worker);
  let proxy = null;

  return {
    async open(source) {
      const { snapshot } = await rpc.call("open", { source });
      const target = new ProxyTransformTarget();
      worker.addEventListener("message", ({ data: msg }) => {
        if (msg.t === "resourceError") {
          target.dispatchEvent(
            new CustomEvent("data", {
              detail: {
                name: msg.name,
                // mirror the loader contract: a rejected-ish promise the
                // engine's bridge can await
                data: Promise.reject(new Error(msg.message)),
              },
            })
          );
        }
      });
      proxy = {
        metadata: snapshot.metadata,
        toc: snapshot.toc,
        rendition: snapshot.rendition,
        transformTarget: target,
        sections: snapshot.sections.map((meta, i) => ({
          ...meta,
          load: () => rpc.call("load", { i }).then((m) => m.url),
          unload: () => rpc.notify("unload", { i }),
          createDocument: async () => {
            const { str } = await rpc.call("text", { i });
            return new DOMParser().parseFromString(str, "application/xhtml+xml");
          },
        })),
        resolveHref: async (href) => {
          const { resolved } = await rpc.call("resolveHref", { href });
          return resolved ? { index: resolved.index, anchor: () => 0 } : null;
        },
      };
      this.book = proxy;
      return proxy;
    },
    book: null,
  };
}
