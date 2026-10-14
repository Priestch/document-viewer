// Pure string URL helpers ported from foliate-js epub.js (MIT, John Factotum).
// Kept verbatim in behavior, including two quirks documented inline, so hrefs
// resolve identically to foliate readers.

/**
 * Resolve a (possibly relative) href against a base path inside the container.
 *
 * Ported from foliate-js epub.js `resolveURL`:
 * - the `%2c` → `,` replacement works around calibre URL-encoding commas in
 *   hrefs (`text%2csplit-part1.xhtml` style), which would otherwise never
 *   match the actual (unencoded) filename in the zip;
 * - the `https://invalid.invalid/` trick: `new URL()` needs a valid absolute
 *   base, but container paths are not URLs — so resolve against a fake
 *   absolute origin and strip it back off. The deliberately non-resolvable
 *   TLD `.invalid` (RFC 2606) guarantees it can't collide with real hrefs.
 * - a base that already contains a scheme (but isn't an `OEBPS`-relative
 *   path, a Calibre quirk) is treated as absolute and a URL object returned.
 */
export const resolveURL = (url, relativeTo) => {
  try {
    // replace %2c in the url with a comma, this might be introduced by calibre
    url = url.replace(/%2c/, ",");
    if (relativeTo.includes(":") && !relativeTo.startsWith("OEBPS"))
      return new URL(url, relativeTo);
    // the base needs to be a valid URL, so set a base URL and then remove it
    const root = "https://invalid.invalid/";
    const obj = new URL(url, root + relativeTo);
    obj.search = "";
    return decodeURI(obj.href.replace(root, ""));
  } catch (e) {
    console.warn(e);
    return url;
  }
};

/** True for hrefs with a scheme other than `blob:` (not container-internal). */
export const isExternal = (uri) => /^(?!blob)\w+:/i.test(uri);

/** Like `path.relative()` in Node.js, for slash-separated container paths. */
export const pathRelative = (from, to) => {
  if (!from) return to;
  const as = from.replace(/\/$/, "").split("/");
  const bs = to.replace(/\/$/, "").split("/");
  const i = (as.length > bs.length ? as : bs).findIndex((_, j) => as[j] !== bs[j]);
  return i < 0
    ? ""
    : Array(as.length - i)
        .fill("..")
        .concat(bs.slice(i))
        .join("/");
};

/** Leading directory portion of a slash-separated path, "" if no slash. */
export const pathDirname = (str) => str.slice(0, str.lastIndexOf("/") + 1);
