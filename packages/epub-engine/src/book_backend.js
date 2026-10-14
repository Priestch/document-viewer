// BookBackend — the worker-ization seam (docs/plans/2026-10-15-epub-worker-prep.md).
//
// EpubEngine consumes `backend.open(source)` / `backend.book` instead of
// calling foliate's makeBook directly. Today there is exactly one
// implementation (in-process). The worker phase adds a WorkerBackend whose
// book() returns a BookProxy quacking like a foliate book, with zero
// host-visible change (acceptance = the 13-assertion engine suite and the
// engine demo E2E pass unchanged).

import { makeBook } from "foliate-js/view.js";

/**
 * @typedef {Object} BookBackend
 * @property {(source: any) => Promise<any>} open Create the book from a
 *   source (string/URL/File/Blob/ArrayBuffer).
 * @property {() => any} book The foliate-book-compatible object (real book
 *   in-process; a BookProxy in the worker implementation).
 */

/**
 * In-process backend: foliate makeBook on the main thread (v1 behavior).
 * @returns {BookBackend}
 */
export function createInProcessBackend() {
  return {
    async open(source) {
      this.book = await makeBook(source);
      return this.book;
    },
    book: null,
  };
}
