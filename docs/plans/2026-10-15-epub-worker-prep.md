# EPUB Worker 化准备：BookBackend 接缝与 RPC 协议设计

Date: 2026-10-15
Status: design + seam (Phase 0.5) — implementation deferred until a
performance signal justifies it (large-EPUB open/search latency).

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
