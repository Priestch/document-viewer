# EPUB Worker 化准备：BookBackend 接缝与 RPC 协议设计

Date: 2026-10-15
Status: **implemented (2026-10-15), route (b)** — see §7. The byte/parse
half of both the EPUB and MOBI pipelines now runs in a per-book module
worker (`packages/epub-engine/src/worker/book-worker.js`), spoken to via
pdf.js' MessageHandler (rebuilt as the `@document-kits/viewer/message-handler.mjs`
subpath export), with a fake-worker fallback over MessageChannel. DOMParser,
the blob-URL cache and all geometry stay on the main thread, per the red
lines. The original design notes below are kept as-written.

Research basis: `2026-10-14-universal-engine-research.md` §8.3 (binding
time), §10 (light-worker architecture). Recap: EPUB layout CANNOT leave the
main thread at full fidelity (browser CSS engine is the only full-fidelity
implementation); everything around layout CAN move. The seam is exactly
`sections[].load() → blob URL` plus the pure-computation members.

## 1. The seam: BookBackend

`EpubEngine` (and `<foliate-view>`) consume a **book** object. Today that is
the in-process foliate book. The prep introduces an internal seam:

```
createBookBackend(source) → BookBackend
BookBackend.book() → Book        // foliate-book-compatible
```

Two implementations share one contract:

- `InProcessBackend` (today): `makeBook(source)` on the main thread.
- `WorkerBackend` (future): zip + parse + rewrite live in the worker; the
  returned `book` is a **BookProxy** that quacks like a foliate book so
  `<foliate-view>` consumes it unchanged (it must — we do not fork
  paginator/view).

## 2. BookProxy contract (what must be proxied)

Derived from actual consumption sites in foliate-js @1.0.1:

| Member                          | Consumer                                   | Worker-side work                                                                      | RPC shape                                                                                   |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `metadata`, `toc`, `rendition`  | view.open / progress                       | read once at open                                                                     | value snapshot at open                                                                      |
| `sections[i].size, linear, cfi` | SectionProgress, #adjacentIndex            | zip metadata                                                                          | value snapshot at open                                                                      |
| `sections[i].load()`            | paginator #display                         | zip read → DOMParser → URL rewrite → serialize → Blob → **createObjectURL in worker** | `load(i) → url:string` (one round-trip)                                                     |
| `sections[i].unload()`          | paginator on section change                | revoke object URL                                                                     | fire-and-forget                                                                             |
| `sections[i].createDocument()`  | engine getTextContent, resolveHref anchors | return rewritten HTML string                                                          | `text(i) → string`; **DOMParser stays main thread**                                         |
| `book.resolveHref(href)`        | View.goTo                                  | structural resolution                                                                 | `resolveHref → {index, anchorKind, anchorOffsets}` — NOTE: anchor fn needs live doc; see §4 |
| `transformTarget` 'data' events | engine error bridging, host CSS rewrite    | loader runs in worker                                                                 | forwarded as messages `{name, data}`                                                        |
| `isExternal` / `resolveCFI`     | View internals                             | pure CFI/string ops                                                                   | RPC                                                                                         |

NOT proxied (must stay main thread, by design): paginator measurements,
`getVisibleRange`/relocate, overlayer, everything in `<foliate-view>` after
`iframe.src = blobURL`.

## 3. Message protocol (worker ⇄ main)

```
main → worker                     worker → main
─────────────────────────        ─────────────────────────
{t:"open", source}               {t:"opened", snapshot}      // metadata/toc/rendition/sections meta
{t:"load", i}                    {t:"loaded", i, url}
{t:"unload", i}                  (no reply)
{t:"text", i}                    {t:"text", i, str}
{t:"resolveHref", href}          {t:"resolved", ...}
{t:"resolveCFI", cfi}            {t:"resolved", ...}
{t:"search", {index, query}}     {t:"searchProgress", ...}   // later phase
                                 {t:"resourceError", name}   // transformTarget bridge
                                 {t:"error", message}
```

`source` transfer: File/Blob → structured-cloneable directly (no copy of
bytes needed beyond the clone); URL/string → fetch in worker.

## 4. Known hard points (from source study)

1. **anchor functions**: `resolveHref` returns `{index, anchor(doc)}` where
   anchor is a closure over the parsed tree. Closures do not cross RPC.
   Worker returns the anchor's _ingredients_ (element path or char offsets);
   the proxy materializes `anchor(doc)` on the main thread against the live
   document. foliate's anchors are `doc.querySelector`/range-from-offset
   style — mechanically reconstructible.
2. **Double parse**: worker DOMParser (computation) + browser iframe parse
   (display) — accepted (research doc §10 cost 1); LRU-evict worker-side
   parsed sections.
3. **createObjectURL in worker**: verified available; blob URLs are valid
   cross-context (same origin).
4. **textWalker uses the global `document`** for `createTreeWalker`
   (text-walker.js:37) — getTextContent's matching loop stays main-thread
   against the RPC-fetched text unless textWalker is re-sourced; the worker
   can still pre-extract the plain text (pure DOMParser walk) and ship
   `{i, str}` chunks, which is all the engine's stream needs.
5. **Cancellation/queueing**: load() RPCs should coalesce (paginator can
   request-then-abort on fast navigation); a simple per-index promise cache
   plus a generation counter suffices (no pdf.js-grade task protocol needed
   at this scale).

## 5. Migration steps (when triggered)

1. Extract `book_backend.js` seam in epub-engine; EpubEngine consumes
   `backend.book()` instead of `makeBook` directly. No behavior change.
2. Implement `BookProxy` + worker script; wire behind
   `createEpubEngine({ backend: "worker" })`; keep "in-process" default.
3. Re-run the 13-assertion EpubEngine suite + engine demo E2E against the
   worker backend — zero host-visible difference is the acceptance bar.
4. Measure: Alice (small) + a large EPUB (hundreds of sections) — open
   time, first-section latency, search UI responsiveness before/after.

Trigger conditions to start: large-EPUB open latency complaints, or Phase 2
unified search needing parallel section scanning.

## 6. Exploration findings (2026-10-15, empirical — worker prototype)

A working BookProxy prototype (`src/worker_backend.js` +
`src/worker/book-worker.js`) was built and driven in a real browser. Three
obstacles were found and fixed; the fourth is a hard wall on Chromium:

1. ✅ **NodeFilter** — window-only; foliate reads SHOW*\* at module-eval
   (text-walker.js:17) and FILTER*\* at call time (epubcfi.js:197).
   Fixed by `src/worker/nodefilter-polyfill.js`, imported BEFORE foliate
   (sibling imports evaluate in order).
2. ✅ **HTMLElement/customElements** — view.js:609 registers
   `<foliate-view>` at module eval. The element is never instantiated in
   the worker, so an inert base class + no-op registry suffice (same
   polyfill module).
3. ✅ **makeBook wants a named File** — isCBZ/isFBZ read `file.name`
   (view.js:90ff). The worker normalizes URL/ArrayBuffer/Blob sources to
   `new File([bytes], name)`.
4. ❌ **DOMParser is NOT defined in Chromium workers** (verified on the
   local chromium-1228; contrary to the assumption in §2 — DOMParser
   exposure in workers is not universal). `new EPUB()` parses
   container.xml/OPF with DOMParser immediately → the foliate parse path
   cannot run in a Chromium worker as-is. This is the same reason pdf.js's
   XFA module ships its own XML parser (core/xml_parser.js, copied from
   Shumway).

Forward options from here:

- **(a) JS DOM in the worker** — parse5/linkedom/xmldom as the worker's
  DOMParser. Cost: a dependency + a fidelity surface (foliate's CFI and
  section logic must behave identically on a foreign DOM impl); also Range
  (`document.createRange`) is worker-absent and epubcfi needs it for
  fromRange — likely needs the offset-based CFI path from §4 anyway.
- **(b) Narrow the worker to ZIP-BYTES only** — worker holds the zip and
  serves raw entry bytes (`loadBytes(i)`), ALL parsing (DOMParser) stays
  on the main thread. Zero new dependencies; removes inflate from the
  main thread but keeps parse cost there. Smaller win, no fidelity risk.
- **(c) Park it** — keep the polyfills and the prototype; decide (a)/(b)
  when a performance signal arrives (as planned).

Recommendation: (c) now; (b) if measurements show zip inflate is the
dominant cost; (a) only if full parse-offload is ever proven necessary —
and then modeled on pdf.js's own "ship the parser" precedent.

## 7. Implementation record (2026-10-15, route (b))

Route (b) from §6 — the worker holds the bytes and the pure parse; all
DOMParser/blob-URL/geometry work stays on the main thread (the project red
lines rule out route (a)'s JS-DOM-in-worker regardless).

What landed:

- **MessageHandler reuse**: the viewer's gulp pipeline emits
  `dist/generic/build/message-handler.mjs` (subpath export
  `@document-kits/viewer/message-handler.mjs`); epub-engine depends on it
  for both sides of the RPC. A 10-line compat shim
  (`src/worker/compat.js`) installs `Promise.withResolvers`/`Promise.try`
  when missing (Node < 22/24 unit tests).
- **Worker entry** `src/worker/book-worker.js`: `connect(port)` +
  self-registration guard, so the SAME module runs as a real worker or
  over a MessageChannel in fake-worker mode (pdf.js `#setupFakeWorker`
  pattern; also how Node tests drive the protocol).
- **EPUB**: `createZipSource` lives worker-side; the main thread's
  `WorkerZipSource` adapter serves sync `entries()`/`getSize()` from the
  open snapshot and routes `loadText`/`loadBytes` over RPC (in-flight
  deduped). `assembleEpubBook` (book_backend.js) is shared verbatim by the
  in-process and worker backends — the whole consume chain was already
  async.
- **MOBI**: `pipeline/mobi.js` split into pure prepare halves
  (`prepareMOBI6`/`prepareKF8` — record decompression, pagebreak split,
  skeleton/fragments, INDX TOC) and DOM assemble halves sharing
  `assembleMobiBook`. KF8 fragment selectors discovered worker-side ride
  along with every `sectionText` reply so `resolveTOCHref` stays
  synchronous on the main thread (closures cannot cross RPC).
- **Engines**: `createEpubEngine`/`createMobiEngine` default to
  `createWorkerBackend`; `backend: "in-process"` is the debug escape
  hatch. One worker per book; `destroy()` terminates it, rejects pending
  RPCs and revokes blob URLs.
- Fixed en passant: MOBI6 guide-TOC TDZ (the pre-split factory called
  `resolveTOCHref` before its `const` initializer — the guide TOC silently
  fell back to per-section labels even in browsers); and URL-string
  sources are absolutized against the page base before being posted
  (workers resolve relative URLs against their own module location).

Known costs (accepted): reply transfers are not supported by
MessageHandler's callback path, so per-entry bytes are cloned crossing
back; moving `URL.createObjectURL` itself into the worker (§4.3 — blob
URLs are valid cross-context) would eliminate the copy for resources
entirely and is the natural next optimization.

Verification: `node --test packages/epub-engine/test/` (32 tests incl.
fake-mode protocol parity against `createZipSource`/`parseMobi`
baselines) + demos `#/engine` browser run (real workers confirmed by
counting `new Worker` constructions; EPUB + MOBI render/paginate with
zero console errors; fake mode parity-checked too).

## 8. Resource blob URLs moved worker-side (2026-10-15, follow-up)

§4.3 put to work: pass-through resources (images, fonts, media) are now
blobbed IN the worker (`makeObjectURL` / `revokeObjectURL` actions; the
MOBI `resource` action returns `{url}` for binary records). Their bytes
never cross the seam — only the URL string does. CSS still crosses as a
string (the main thread must rewrite `url(...)`s and apply intake), and
rewritten section HTML still blobs main-side, exactly as before.

Plumbing: `resources.js` accepts `prebuiltURL(url, revoke)` markers —
dedupe/refcount/cascade unchanged, but unref-to-0 and destroy route
revocation through the marker's hook (a fire-and-forget
`revokeObjectURL` RPC) instead of the main-thread `URL.revokeObjectURL`.
The rewriter's non-replaced branch prefers `zip.createBlobURL` when the
seam offers it; the in-process zip falls back to main-thread blobs, so
`backend: "in-process"` behavior is untouched.

Verified: browser run with an instrumented main-thread
`URL.createObjectURL` — the 36KB cover of alice.epub/mobi loads from a
worker-minted blob URL while the main thread only mints the ~1.4KB
section HTML and ~0.5KB CSS blobs. Red-line wording in CLAUDE.md updated
accordingly (DOMParser/geometry remain hard main-thread constraints).
