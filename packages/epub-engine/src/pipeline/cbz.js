// CBZ (comic book archive) — the book-shape assembly for zip archives of
// images: one section per page, each section a generated HTML wrapper around
// a single <img>.
//
// Ported from foliate-js comic-book.js (MIT, John Factotum) — the page-file
// picking and the HTML wrapper are foliate's; deviations:
// - blob lifecycle runs through our refcounted resource cache instead of
//   foliate's own Maps: the page wrapper is minted as "page:<filename>" with
//   the image registered as its child ("img:<filename>" parent edge), so
//   unload() = cache.unref(pageURL) cascades and revokes both (worker-minted
//   image URLs route revocation back over the RPC seam).
// - sections carry a createDocument() (DOMParser, lazily) so the engine's
//   text-extraction surface works; foliate has none.
// - rendition.layout "pre-paginated" is recorded for fidelity; our paginator
//   has no FXL branch yet — a single-image section is exactly one column
//   page (layout.js setImageSize), which the cbz engine pairs with
//   full-bleed layout options (maxColumnCount 1, margin 0, gap 0).

import { prebuiltURL, createResourceCache } from "./resources.js";
import { createBook } from "./sections.js";

/** foliate comic-book.js:19 */
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".jxl",
  ".avif",
];

const IMAGE_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".jxl": "image/jxl",
  ".avif": "image/avif",
};

/**
 * The image entry's MIME type (worker-side minting and local blobbing both
 * need it; unknown extensions fall back to a generic binary type).
 * @param {string} filename
 * @returns {string}
 */
export function imageMime(filename) {
  const ext = IMAGE_EXTENSIONS.find((e) => filename.toLowerCase().endsWith(e));
  return IMAGE_MIME[ext] ?? "application/octet-stream";
}

/**
 * Pick the comic page files from a zip's central directory: image entries
 * only, in natural numeric order (page2 < page10). Port of foliate
 * comic-book.js:20-24.
 *
 * @param {Array<{filename: string}>} entries
 * @returns {string[]} sorted filenames; empty input throws (foliate :24)
 */
export function pickComicPageFiles(entries) {
  const files = entries
    .map((entry) => entry.filename)
    .filter((name) => IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)))
    .sort(new Intl.Collator([], { numeric: true }).compare);
  if (!files.length) throw new Error("No supported image files in archive");
  return files;
}

/** foliate comic-book.js:8 — the generated page around one image */
const wrapPage = (src) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head>` +
  `<body style="margin: 0"><img src="${src}" alt=""></body></html>`;

/**
 * Assemble the foliate-shaped book over a zip source (sync `createZipSource`
 * instance or the worker backend's async adapter). DOM-free until a section's
 * createDocument() runs — open() is testable in Node.
 *
 * @param {object} options
 * @param {object} options.zip zip source ({entries, loadBytes, getSize,
 *   optional createBlobURL/revokeBlobURL — the worker-minting seam})
 * @param {string} [options.name] archive name (book title, foliate's
 *   file.name)
 * @param {object} [options.cache] resource cache (default: a fresh one over
 *   zip.getSize)
 * @returns {Promise<{book: object, cache: object}>}
 */
export async function assembleCbzBook({
  zip,
  name,
  cache = createResourceCache({ getSize: zip.getSize }),
}) {
  const files = pickComicPageFiles(zip.entries());

  const sections = files.map((filename) => {
    /** @type {string | null} the wrapper HTML, set on first load */
    let html = null;
    /** @type {string | null} the page wrapper's live blob URL */
    let url = null;

    const load = async () => {
      if (url != null) return url;
      // The image first: the worker path mints it worker-side (bytes never
      // cross — prebuiltURL routes revocation back over the RPC), the
      // in-process path blobs the loaded bytes. Created WITH the page
      // identity as parent, so unref(pageURL) cascades to revoke both.
      let data;
      if (typeof zip.createBlobURL === "function") {
        data = prebuiltURL(
          await zip.createBlobURL(filename, imageMime(filename)),
          zip.revokeBlobURL
        );
      } else {
        data = await zip.loadBytes(filename);
      }
      const imgURL = await cache.createURL(
        data,
        imageMime(filename),
        `img:${filename}`,
        `page:${filename}`
      );
      html = wrapPage(imgURL);
      url = await cache.createURL(html, "text/html", `page:${filename}`);
      return url;
    };

    return {
      // the container filename is the stable identity — cfi.js resolveHref
      // matches TOC hrefs against it with plain path comparison
      id: filename,
      get url() {
        return url;
      },
      load,
      unload: () => {
        if (url != null) cache.unref(url);
      },
      createDocument: async () => {
        if (html == null) await load();
        return new DOMParser().parseFromString(html, "text/html");
      },
      size: zip.getSize(filename),
      linear: "yes",
    };
  });

  const book = createBook({
    sections,
    metadata: { title: name ?? "Comic Book" },
    toc: files.map((filename) => ({ label: filename, href: filename })),
    // recorded for fidelity (foliate comic-book.js:36); no FXL renderer yet
    rendition: { layout: "pre-paginated" },
    events: cache.events,
  });
  return { book, cache };
}
