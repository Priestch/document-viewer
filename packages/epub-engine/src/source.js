// Source normalization shared by every backend (in-process, worker) and by
// the worker itself (fetch and Blob#arrayBuffer are both available in
// workers, so the same function runs on either side of the seam).
// Extracted from book_backend.js so the worker entry does not pull the
// DOM-flavored pipeline modules (rewriter/sections) into its chunk.

/**
 * Normalize any supported source (File/Blob/URL string/URL/ArrayBuffer/
 * typed-array view) to raw bytes.
 * @param {any} source
 * @returns {Promise<ArrayBuffer>}
 */
export async function sourceToBytes(source) {
  if (source instanceof ArrayBuffer) return source;
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  // File and Blob both carry arrayBuffer()
  if (source && typeof source.arrayBuffer === "function") return source.arrayBuffer();
  if (typeof source === "string" || source instanceof URL) {
    const response = await fetch(String(source));
    if (!response.ok) throw new Error(`Failed to fetch ${String(source)}: ${response.status}`);
    return response.arrayBuffer();
  }
  throw new Error(`Unsupported book source: ${source}`);
}
