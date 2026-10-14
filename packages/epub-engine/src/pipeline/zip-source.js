// Zip container source for the EPUB pipeline, built on fflate.
//
// Mirrors the loader surface of foliate-js' `makeZipLoader` (view.js): an
// entry listing plus per-name text/blob/size access — but backed by fflate's
// central-directory parsing instead of zip.js, so it runs in Node, workers and
// browsers alike. Entries are decompressed lazily, one at a time: `unzipSync`
// with a `filter` parses the whole central directory but only inflates the
// entries the filter accepts.

import { unzipSync, strFromU8 } from "fflate";

/**
 * Create a zip source over an in-memory EPUB (OCF) container.
 *
 * @param {ArrayBuffer} bytes raw zip bytes
 * @returns {{
 *   entries: () => Array<{filename: string, uncompressedSize: number}>,
 *   loadBytes: (filename: string) => Uint8Array | null,
 *   loadText: (filename: string) => string | null,
 *   getSize: (filename: string) => number,
 * }}
 */
export function createZipSource(bytes) {
  const data = new Uint8Array(bytes);

  // Pass one over the central directory: collect name + uncompressed size
  // for every entry without inflating anything.
  const info = new Map();
  unzipSync(data, {
    filter: (file) => {
      info.set(file.name, file.originalSize);
      return false;
    },
  });

  const loadBytes = (filename) => {
    if (!info.has(filename)) return null;
    const out = unzipSync(data, { filter: (file) => file.name === filename });
    return out[filename] ?? null;
  };

  return {
    entries() {
      return Array.from(info, ([filename, uncompressedSize]) => ({ filename, uncompressedSize }));
    },
    loadBytes,
    loadText(filename) {
      const bytes = loadBytes(filename);
      return bytes ? strFromU8(bytes) : null;
    },
    getSize(filename) {
      return info.get(filename) ?? 0;
    },
  };
}
