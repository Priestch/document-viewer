// Resource URL rewriter for the EPUB pipeline — the correctness-critical port
// of foliate-js' `Loader` rewriting half (epub.js:766-897): loadItem/loadHref/
// loadReplaced/replaceCSS, plus the CSS intake transform foliate applies via
// the transformTarget 'data' event (paginator.js:646-656) and we apply inline
// in the stylesheet path. Runs on the main thread only (DOMParser +
// XMLSerializer) over a `createZipSource` instance.
//
// Deliberate exclusions, mirroring foliate:
// - `a[href]` is NEVER rewritten. Internal links are resolved at click time
//   against the book; blindly rewriting them is exactly the bug class
//   foliate's loadReplaced comment warns about (epub.js:803-810 — replacing
//   without parsing "will break things like iframes … or text that just
//   happen to be paths").
// - Scripts are not loaded when `allowScript` is false. Foliate returns null
//   from loadItem for script media types (epub.js:770-771); the generic
//   `[src]` rewrite then writes the unresolvable string "null" into
//   `script[src]`. The elements themselves stay in place — actually blocking
//   execution is the paginator iframe sandbox's job — and inline scripts are
//   left untouched (foliate: "TODO: replace inline scripts? probably not
//   worth the trouble"). We mirror all of that and do NOT strip elements.
//
// Deviations from foliate (documented; none observable on well-formed books):
// - foliate's `replaceString` (blind asset-path replacement inside e.g.
//   scripts) is not ported; it only matters for `allowScript: true`, which the
//   pipeline does not exercise yet.
// - when a referenced href is missing from the manifest, foliate silently
//   keeps the relative href; we keep the href but dispatch a 'data'-shaped
//   diagnostic event `{name}` on `events` so the engine error bridge can see
//   the dangling resource (same shape as resources.js' cache events).

import { isExternal, resolveURL } from "./url.js";
import { prebuiltURL } from "./resources.js";

const MIME = {
  XHTML: "application/xhtml+xml",
  HTML: "text/html",
  CSS: "text/css",
  SVG: "image/svg+xml",
  JS: /\/(x-)?(javascript|ecmascript)/,
};

const NS = {
  XLINK: "http://www.w3.org/1999/xlink",
};

// replace asynchronously and sequentially (foliate epub.js:126-132)
const replaceSeries = async (str, regex, f) => {
  const matches = [];
  str.replace(regex, (...args) => (matches.push(args), null));
  const results = [];
  for (const args of matches) results.push(await f(...args));
  return str.replace(regex, () => results.shift());
};

// CSS intake transform (foliate paginator.js:646-656). Foliate reads the live
// innerWidth/innerHeight for vw/vh; the pipeline takes one square viewport
// size (default 1000px) because the rewrite happens before layout exists.
// Exported for the MOBI pipeline, which feeds KF8 `kindle:flow` stylesheets
// through the same intake.
export const cssIntake = (css, viewportPx) =>
  css
    // unprefix as most of the props are (only) supported unprefixed
    .replace(/(?<=[{\s;])-epub-/gi, "")
    // replace vw and vh as they cause problems with layout
    .replace(/(\d*\.?\d+)vw/gi, (_, d) => `${(parseFloat(d) * viewportPx) / 100}px`)
    .replace(/(\d*\.?\d+)vh/gi, (_, d) => `${(parseFloat(d) * viewportPx) / 100}px`)
    // `page-break-*` unsupported in columns; replace with `column-break-*`
    .replace(/page-break-(after|before|inside)\s*:/gi, (_, x) => `-webkit-column-break-${x}:`)
    .replace(
      /break-(after|before|inside)\s*:\s*(avoid-)?page/gi,
      (_, x, y) => `break-${x}: ${y ?? ""}column`
    );

/**
 * Create the resource URL rewriter.
 *
 * @param {{zip: object, manifest: Map|Array, baseHref?: string, cache: object,
 *   events?: EventTarget, allowScript?: boolean, viewportPx?: number}} options
 *   zip: createZipSource instance; manifest: parsePackage's manifest (Map
 *   keyed by resolved href); cache: createResourceCache instance; events:
 *   shared EventTarget for diagnostics (defaults to the cache's own)
 * @returns {{loadSection: (href: string) => Promise<string>,
 *   loadStylesheet: (href: string) => Promise<string>}} both resolve to blob
 *   URLs ("" when the underlying bytes are missing, null for empty text)
 */
export function createRewriter({
  zip,
  manifest,
  baseHref = "",
  cache,
  events,
  allowScript = false,
  viewportPx = 1000,
}) {
  const target = events ?? cache.events;
  const getItem = (path) =>
    manifest instanceof Map ? manifest.get(path) : manifest.find((item) => item.href === path);

  const notifyMissing = (name) => {
    const detail = {};
    Object.defineProperty(detail, "name", { value: name }); // read-only
    target.dispatchEvent(new CustomEvent("data", { detail }));
  };

  // foliate loadHref (epub.js:786-793): resolve against the referencing doc,
  // then load through the manifest (external hrefs pass through untouched)
  const loadHref = async (href, base, parents = []) => {
    if (!href || isExternal(href)) return href;
    const path = resolveURL(href, base);
    const item = getItem(path);
    if (!item) {
      notifyMissing(path); // diagnostic addition, see header
      return href;
    }
    return loadItem(item, parents.concat(base));
  };

  // foliate loadItem (epub.js:766-785)
  const loadItem = async (item, parents = []) => {
    if (!item) return null;
    const { href, mediaType } = item;

    const isScript = MIME.JS.test(mediaType);
    if (isScript && !allowScript) return null;

    const parent = parents.at(-1);
    const shouldReplace =
      (isScript || [MIME.XHTML, MIME.HTML, MIME.CSS, MIME.SVG].includes(mediaType)) &&
      // prevent circular references (e.g. @import loops)
      parents.every((p) => p !== href);
    if (shouldReplace) return loadReplaced(item, parents);
    // dedupe of already-live resources happens inside cache.createURL (its
    // name key), standing in for foliate's early `#cache.has` check.
    // Pass-through resources (images, fonts, media) go through the worker's
    // blob minter when the seam offers one, so their bytes never cross;
    // the in-process zip falls back to main-thread blobs.
    const data = zip.createBlobURL
      ? zip
          .createBlobURL(href, mediaType)
          .then((url) => (url ? prebuiltURL(url, zip.revokeBlobURL) : null))
      : Promise.resolve().then(() => zip.loadBytes(href));
    return cache.createURL(data, mediaType, href, parent);
  };

  // foliate loadReplaced (epub.js:792-865)
  const loadReplaced = async (item, parents = []) => {
    const href = item.href;
    const parent = parents.at(-1);
    let str = "";
    try {
      str = await zip.loadText(href);
    } catch (e) {
      return cache.createURL(Promise.reject(e), item.mediaType, href, parent);
    }
    if (!str) return null;

    // parse and replace in HTML
    if ([MIME.XHTML, MIME.HTML, MIME.SVG].includes(item.mediaType)) {
      let type = item.mediaType;
      let doc = new DOMParser().parseFromString(str, type);
      // change to HTML if it's not valid XHTML (foliate mutates the manifest
      // item; we keep the adjusted type local to this load)
      if (
        type === MIME.XHTML &&
        (doc.querySelector("parsererror") || !doc.documentElement?.namespaceURI)
      ) {
        console.warn(doc.querySelector("parsererror")?.innerText ?? "Invalid XHTML");
        type = MIME.HTML;
        doc = new DOMParser().parseFromString(str, type);
      }
      // replace hrefs in XML processing instructions — mainly SVGs using
      // xml-stylesheet
      if ([MIME.XHTML, MIME.SVG].includes(type)) {
        let child = doc.firstChild;
        while (child instanceof ProcessingInstruction) {
          if (child.data) {
            const replacedData = await replaceSeries(
              child.data,
              /(?:^|\s*)(href\s*=\s*['"])([^'"]*)(['"])/i,
              (_, p1, p2, p3) => loadHref(p2, href, parents).then((u) => `${p1}${u}${p3}`)
            );
            child.replaceWith(doc.createProcessingInstruction(child.target, replacedData));
          }
          child = child.nextSibling;
        }
      }
      // replace hrefs (excluding anchors — see header)
      // TODO: srcset? (foliate's TODO too)
      const replace = async (el, attr) =>
        el.setAttribute(attr, await loadHref(el.getAttribute(attr), href, parents));
      for (const el of doc.querySelectorAll("link[href]")) await replace(el, "href");
      for (const el of doc.querySelectorAll("[src]")) await replace(el, "src");
      for (const el of doc.querySelectorAll("[poster]")) await replace(el, "poster");
      for (const el of doc.querySelectorAll("object[data]")) await replace(el, "data");
      for (const el of doc.querySelectorAll("[*|href]:not([href])"))
        el.setAttributeNS(
          NS.XLINK,
          "href",
          await loadHref(el.getAttributeNS(NS.XLINK, "href"), href, parents)
        );
      // replace inline styles (intake transform is NOT applied here — foliate
      // only transforms standalone text/css resources)
      for (const el of doc.querySelectorAll("style"))
        if (el.textContent) el.textContent = await replaceCSS(el.textContent, href, parents);
      for (const el of doc.querySelectorAll("[style]"))
        el.setAttribute("style", await replaceCSS(el.getAttribute("style"), href, parents));
      // TODO: replace inline scripts? probably not worth the trouble (foliate)
      const result = new XMLSerializer().serializeToString(doc);
      return cache.createURL(result, type, href, parent);
    }

    // CSS gets url rewriting + the intake transform; anything else that
    // reached here (scripts with allowScript) is blobbed as-is — foliate's
    // replaceString asset-path pass is not ported (see header)
    const result =
      item.mediaType === MIME.CSS
        ? cssIntake(await replaceCSS(str, href, parents), viewportPx)
        : str;
    return cache.createURL(result, item.mediaType, href, parent);
  };

  // foliate replaceCSS (epub.js:866-876): url(...) in any quoting, plus the
  // string form of @import ("but why?!" — foliate)
  const replaceCSS = async (str, href, parents = []) => {
    const replacedUrls = await replaceSeries(
      str,
      /url\(\s*["']?([^'"\n]*?)\s*["']?\s*\)/gi,
      (_, url) => loadHref(url, href, parents).then((u) => `url("${u}")`)
    );
    return replaceSeries(replacedUrls, /@import\s*["']([^"'\n]*?)["']/gi, (_, url) =>
      loadHref(url, href, parents).then((u) => `@import "${u}"`)
    );
  };

  const loadSection = async (href) => {
    const path = resolveURL(href, baseHref);
    // spine sections are always manifest items; synthesize an XHTML item for
    // callers that hand us a raw path
    const item = getItem(path) ?? { href: path, mediaType: MIME.XHTML, properties: [] };
    return loadItem(item, []);
  };

  const loadStylesheet = async (href) => {
    const path = resolveURL(href, baseHref);
    const item = getItem(path) ?? { href: path, mediaType: MIME.CSS, properties: [] };
    return loadItem(item, []);
  };

  return { loadSection, loadStylesheet };
}
