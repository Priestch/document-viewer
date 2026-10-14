// Section assembly for the EPUB pipeline: the book seam foliate's paginator
// consumes (epub.js:974-994). `assembleSections` turns the parsePackage IR
// plus the zip source, rewriter and resource cache into `sections[]`;
// `createBook` wraps those into the foliate-book-shaped object
// `{sections, metadata, toc, dir, rendition, transformTarget}` our future
// paginator/engine consumes. `transformTarget` is the resource cache's
// EventTarget — foliate wires the Loader's eventTarget there (epub.js:898-903);
// see resources.js for the 'data'-event contract.

/**
 * Assemble the foliate-shaped `sections[]` from the parsed package IR.
 *
 * @param {{pkgIR: object, zip: object, rewriter: object, cache: object}} options
 *   pkgIR: parsePackage output; zip: createZipSource instance; rewriter:
 *   createRewriter instance; cache: createResourceCache instance
 * @returns {Array<{id: string, url: string, load: Function, unload: Function,
 *   createDocument: Function, size: number, cfi: string, linear: string}>}
 */
export function assembleSections({ pkgIR, zip, rewriter, cache }) {
  return pkgIR.spine
    .map((spineItem) => {
      const href = spineItem.href;
      if (!href) {
        console.warn(`Could not find item with ID "${spineItem.idref}" in manifest`);
        return null;
      }
      const mediaType = pkgIR.manifest.get(href)?.mediaType ?? "application/xhtml+xml";
      let url = null;
      return {
        // the container href is the stable identity (foliate's section.id)
        id: href,
        // the live blob URL once loaded, null before the first load()
        get url() {
          return url;
        },
        load: async () => (url = await rewriter.loadSection(href)),
        // unrefs the section's blob URL; the cache cascades the revoke to the
        // section's children (stylesheets, images), foliate unloadItem style
        unload: () => {
          if (url != null) cache.unref(url);
        },
        // raw document for text extraction / anchor resolution — NO resource
        // rewriting (foliate's createDocument, epub.js:1033-1036: loadText +
        // DOMParser as the manifest media type)
        createDocument: async () =>
          new DOMParser().parseFromString(await zip.loadText(href), mediaType),
        size: cache.getSize?.(href) ?? zip.getSize(href),
        cfi: spineItem.cfi,
        linear: spineItem.linear,
      };
    })
    .filter((section) => section);
}

/**
 * Wrap assembled sections into the foliate-book-shaped object.
 *
 * @param {{sections: Array, metadata?: object, toc?: Array|null,
 *   dir?: string, rendition?: object, events?: EventTarget}} options
 *   events: the resource cache's `events` (becomes `transformTarget`)
 * @returns {object} the book consumed by the paginator/engine
 */
export function createBook({
  sections,
  metadata = {},
  toc = null,
  dir = "ltr",
  rendition = {},
  events = null,
}) {
  return { sections, metadata, toc, dir, rendition, transformTarget: events };
}
