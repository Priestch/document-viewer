// Resource-cache unit tests — the prebuilt-URL seam (worker-minted blob
// URLs) and the refcount cascade that routes revocation back to the worker.

import { test } from "node:test";
import assert from "node:assert/strict";

// Node 18 lacks the CustomEvent global (19+); the cache dispatches 'data'
// events on the EventTarget it creates
if (typeof CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent extends Event {
    #detail;
    constructor(type, { detail = null } = {}) {
      super(type);
      this.#detail = detail;
    }
    get detail() {
      return this.#detail;
    }
  };
}

import { createResourceCache, prebuiltURL } from "../src/pipeline/resources.js";

test("createURL registers prebuilt URLs without minting a local blob", async () => {
  const cache = createResourceCache();
  const revokes = [];
  const url = await cache.createURL(
    prebuiltURL("blob:worker-minted-1", (u) => revokes.push(u)),
    "image/jpeg",
    "OEBPS/img/cover.jpg",
    "OEBPS/text/ch1.xhtml"
  );
  assert.equal(url, "blob:worker-minted-1");
  assert.equal(cache.size(), 1);
  assert.deepEqual(revokes, [], "live prebuilt URLs are not revoked");

  // unref through the parent (section unload cascades to children)
  const sectionUrl = await cache.createURL(
    "<html/>",
    "application/xhtml+xml",
    "OEBPS/text/ch1.xhtml"
  );
  cache.unref(sectionUrl);
  assert.deepEqual(revokes, ["blob:worker-minted-1"], "cascade routes revoke to the worker hook");
  assert.equal(cache.size(), 0);
});

test("destroy revokes prebuilt URLs through their hooks", async () => {
  const cache = createResourceCache();
  const revokes = [];
  await cache.createURL(
    prebuiltURL("blob:w2", (u) => revokes.push(u)),
    "font/woff2",
    "f.woff2"
  );
  cache.destroy();
  assert.deepEqual(revokes, ["blob:w2"]);
});

test("plain bytes still mint main-thread blobs (in-process path unchanged)", async () => {
  const cache = createResourceCache();
  const url = await cache.createURL(new Uint8Array([1, 2, 3]), "image/png", "a.png");
  assert.match(url, /^blob:/);
  cache.destroy();
});
