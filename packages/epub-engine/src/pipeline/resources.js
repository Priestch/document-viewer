// Refcounted blob-URL cache for the EPUB pipeline.
//
// Port of the lifecycle half of foliate-js' `Loader` (epub.js:708-764): the
// `#cache`/`#children`/`#refCount` triple plus `createURL`/`ref`/`unref`/
// `destroy`. Foliate keys all three maps by container href; we keep that
// identity-based core (a child must be linkable to its parent before the
// parent's own blob URL exists — foliate's `loadReplaced` registers children
// while still rewriting the parent) but expose a blob-URL-facing surface
// (`unref(url)`) as the pipeline seam requires. Named resources (every href
// the rewriter touches) dedupe to one live blob URL regardless of how many
// times they are loaded.
//
// Error-bridge contract (foliate transformTarget): every `createURL` dispatches
// a "data" event on `events` with `detail = { data: Promise, type }` plus a
// read-only `detail.name` (the resource href). A listener may replace
// `detail.data`/`detail.type` before the blob is made (foliate's paginator
// open(), paginator.js:646-656, does exactly this for CSS), and the engine
// error bridge wraps `detail.data` with a `.catch` keyed on `detail.name`
// (foliate reader.js:114). A resource load failure is passed in as a rejecting
// `bytes` promise: the event fires first, then `createURL` itself rejects —
// the same order foliate's Loader produces.

/**
 * A blob URL minted on the OTHER side of the worker seam. The resource
 * bytes never crossed (the worker inflated the zip entry / MOBI record and
 * blobbed it itself — URL.createObjectURL works in workers and the URLs
 * are valid cross-context); `revoke` routes revocation back there.
 * @typedef {Object} PrebuiltURL
 * @property {true} __prebuilt
 * @property {string} url
 * @property {(url: string) => void} [revoke]
 */
const isPrebuilt = (data) => data != null && typeof data === "object" && data.__prebuilt === true;

/**
 * Wrap a worker-minted blob URL for `createResourceCache.createURL`.
 * @param {string} url
 * @param {(url: string) => void} [revoke]
 */
export const prebuiltURL = (url, revoke) => ({ __prebuilt: true, url, revoke });

/**
 * Create a refcounted blob-URL cache over a zip source.
 *
 * @param {{loadBytes?: Function, getSize?: Function}} [source] the zip
 *   source's byte/size accessors; kept and re-exposed so consumers (section
 *   assembly, a future worker-backed cache) can treat the cache as the single
 *   resource seam
 * @returns {{
 *   createURL: (bytes: any, type: string, name?: string, parent?: string) => Promise<string>,
 *   ref: (url: string, parents?: string | string[]) => string | undefined,
 *   unref: (url: string) => void,
 *   destroy: () => void,
 *   size: () => number,
 *   events: EventTarget,
 *   loadBytes?: Function,
 *   getSize?: Function,
 * }}
 */
export function createResourceCache({ loadBytes, getSize } = {}) {
  const events = new EventTarget();
  const urls = new Map(); // identity (href) → live blob URL
  const urlToId = new Map(); // blob URL → identity
  const refCount = new Map(); // identity → live reference count
  const children = new Map(); // parent identity → [child identity]
  const revokers = new Map(); // identity → prebuilt-URL revoke hook

  // blob URLs and hrefs both work as handles (parents are hrefs at rewrite
  // time, URLs at unload time)
  const idOf = (handle) => urlToId.get(handle) ?? handle;

  const linkChild = (parentId, id) => {
    const childList = children.get(parentId);
    if (childList) childList.push(id);
    else children.set(parentId, [id]);
  };

  async function createURL(bytes, type, name, parent) {
    // one live blob URL per named resource — this dedupe stands in for
    // foliate's early `#cache.has(href)` check in loadItem
    if (name != null && urls.has(name)) return ref(urls.get(name), parent);
    const detail = { data: Promise.resolve(bytes), type };
    Object.defineProperty(detail, "name", { value: name ?? "" }); // read-only
    events.dispatchEvent(new CustomEvent("data", { detail }));
    const data = await detail.data; // a rejection propagates (event already fired)
    const newType = await detail.type; // listeners may have swapped either field
    if (data == null) return "";
    // A prebuilt URL (worker-side blob): the bytes never crossed the seam,
    // so the blob was made in the worker and revocation routes back there
    // (URL.createObjectURL works in workers and blob URLs are valid
    // cross-context — prep doc §4.3). Everything else blobs locally.
    const prebuilt = isPrebuilt(data);
    const url = prebuilt ? data.url : URL.createObjectURL(new Blob([data], { type: newType }));
    const id = name ?? url;
    if (prebuilt && data.revoke) revokers.set(id, data.revoke);
    urls.set(id, url);
    urlToId.set(url, id);
    refCount.set(id, 1);
    if (parent != null) linkChild(idOf(parent), id);
    return url;
  }

  function ref(url, parents) {
    const id = idOf(url);
    if (!refCount.has(id)) return undefined;
    // no parents still counts as one anonymous edge — foliate's ref(href,
    // undefined) increments too (and, like foliate, repeated parentless refs
    // dedupe onto that single edge, capping the count at 2)
    const list = parents == null ? [undefined] : Array.isArray(parents) ? parents : [parents];
    for (const parent of list) {
      const parentId = idOf(parent);
      const childList = children.get(parentId);
      // one increment per distinct parent edge, like foliate's ref()
      if (!childList?.includes(id)) {
        refCount.set(id, refCount.get(id) + 1);
        linkChild(parentId, id);
      }
    }
    return urls.get(id) ?? url;
  }

  function unref(url) {
    const id = idOf(url);
    if (!refCount.has(id)) return;
    const count = refCount.get(id) - 1;
    if (count < 1) {
      const blobUrl = urls.get(id);
      const revoke = revokers.get(id) ?? ((u) => URL.revokeObjectURL(u));
      if (blobUrl != null) revoke(blobUrl);
      urls.delete(id);
      urlToId.delete(blobUrl);
      refCount.delete(id);
      revokers.delete(id);
      // a parent's death cascades: child blobs die with the section blob
      const childList = children.get(id);
      if (childList) while (childList.length) unref(urls.get(childList.pop()));
      children.delete(id);
    } else refCount.set(id, count);
  }

  function destroy() {
    for (const [id, url] of urls) (revokers.get(id) ?? ((u) => URL.revokeObjectURL(u)))(url);
    urls.clear();
    urlToId.clear();
    refCount.clear();
    children.clear();
    revokers.clear();
  }

  return {
    createURL,
    ref,
    unref,
    destroy,
    size: () => refCount.size,
    events,
    loadBytes,
    getSize,
  };
}
