# Universal Viewer Engine Research: Flow Unification & Rendering Roots

Date: 2026-10-14
Status: research consolidation (input to engine-core implementation)

Sources (all local, source-anchored):

- pdf.js v5.7.284 — `packages/document-viewer/pdf.js` (vendored submodule)
- foliate-js @ 78914aef — `packages/epub-engine/foliate-js` (reference copy at `~/Enter/pdf.js/foliate-js`)
- koodo-reader v2.4.6 — `~/Enter/pdf.js/koodo-reader` (kookit engine mined from minified bundle; symbols + char offsets)
- engine-spike runtime verification (2026-10-13, this repo): EPUB contract validated end-to-end; PDF source-consumption path proven fragile (PDFJSDev build-time define missing → version handshake failure)

## 1. Method

Compare the two engines along nine lifecycle concepts, each anchored with
file:line evidence from both sides; validate the unification hypotheses
against a third production implementation (koodo-reader); derive the
rendering-root taxonomy from foliate's own multi-format dispatch.

## 2. Lifecycle flow comparison (pdf.js vs foliate-js)

| Concept     | pdf.js (v5.7.284)                                                                                                                                                                                                        | foliate-js (@78914aef)                                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------------------------------------------------------------------------------------------------------- |
| Open        | `getDocument` → worker handshake (`GetDocRequest`, src/display/api.js:436) → `PDFDocumentProxy`; metadata/outline = worker RPC, cached; pages lazy via `#pagePromises`                                                   | `makeBook(file)` (view.js:79) magic-byte dispatch → format module → book; structure+metadata+TOC eager; section bodies never parsed until displayed (`load()` → blob URL, epub.js:763)                                                               |
| Structure   | fixed page array; viewer builds all `PDFPageView`s upfront (web/pdf_viewer.js:898)                                                                                                                                       | `sections[]` (epub.js:979) with `load()/unload()/createDocument()`, refcounted blob-URL cache (epub.js:706-909); `linear:'no'` skipped by `#adjacentIndex` (paginator.js:1056)                                                                       |
| Render      | operator list streamed from worker (`_pumpOperatorList`, api.js:1873), main thread drains into canvas (`InternalRenderTask`); cancellation is a protocol (RenderTask.cancel + delayed `_abortOperatorList`, api.js:1950) | `View.open` picks renderer (view.js:233-296): paginator (CSS columns) or `<foliate-fxl>`; layout happens in browser CSS engine; `columnize()` (paginator.js:309) + `expand()` measurement (:362); no render task, only `#locked` (paginator.js:1060) |
| Position    | `{pageNumber, scale, top, left}` from `_updateLocation` (pdf_viewer.js:1842); percentage only for network loading                                                                                                        | `relocate` (paginator.js:969) `{reason, range, index, fraction, size}` enriched by View (view.js:329-338) with `SectionProgress` (bytes-weighted percentage, progress.js:74-98) + tocItem + CFI                                                      |
| Navigation  | dest arrays / named dests → `scrollPageIntoView` (pdf_link_service.js:135)                                                                                                                                               | `goTo(number                                                                                                                                                                                                                                         | CFI | href | {fraction})` (view.js:446-470); page turn = CSS column translation (`#scrollPrev/Next`, paginator.js:1027) |
| Text        | `getTextContent()` — worker-side ReadableStream; items carry transform matrices (api.js:1130); never touches DOM                                                                                                         | live DOM only: `createDocument()` + `textWalker` (text-walker.js:30); search is sequential main-thread section iteration (view.js:530-578)                                                                                                           |
| Events      | EventBus: `documentloaded`, `pagechanging`, `updateviewarea`, `pagerendered`, `textlayerrendered`, `documenterror`, ... (web/event_utils.js:70)                                                                          | CustomEvents on `<foliate-view>`: `load`, `relocate`, `link`, `external-link`, `draw-annotation`, `show-annotation`, `create-overlay` (view.js:326-428)                                                                                              |
| Annotations | geometry-attached: `data.rect`/quadPoints in AnnotationLayer (annotation_layer.js:233,366); editor layer serializes page-space geometry                                                                                  | range-attached: `Overlayer.add(key, range, drawFn)` (overlayer.js:17), identity = CFI string; `redraw()` on relayout                                                                                                                                 |
| Errors      | typed exceptions (util.js:524-570); `loadingTask.onProgress/onPassword`; `documenterror` event                                                                                                                           | open-time error classes only (view.js:68); after open: catch-and-`console.warn` everywhere; **no error event** (bridge via `transformTarget` data events)                                                                                            |

Semantic event mapping: `documentloaded ↔ load`;
`pagechanging + updateviewarea ↔ relocate`; `documenterror ↔ (must be added)`;
`pagerendered`/`textlayerrendered` have **no foliate equivalent** (CSS layout has
no completion event).

## 3. What unifies cleanly (interface-level)

1. **open → document handle** (`{metadata, toc, ordered units, close}`).
   foliate's own pdf.js adapter (FOL pdf.js:115-180) is the existence proof
   that the book shape is format-agnostic.
2. **Ordered addressable units** (page number ↔ section index).
3. **Navigation by opaque address**: `resolveNavigation(target) → {index, anchor?}`; anchor stays engine-opaque.
4. **Position reporting**: one `relocate`-shaped event; pdf.js's payload is the degenerate case of foliate's. **Design the unified Location event after foliate's richer shape** (fraction + tocItem + native address), not after pdf.js's.
5. **Event bus**: `EventBus.dispatch` ≅ CustomEvent `#emit`.
6. **Search results as addresses** (match → address + excerpt).
7. **History**: address stacks on both sides.

## 4. What is essentially different (capability seams — never unify)

1. **scale vs layout**: bitmap re-render at viewport scale vs CSS reflow at
   column width. Unified zoom must degrade to font-size in reflow mode.
2. **geometry- vs range-attached annotations**: lossy to convert; unified API
   takes `{address, draw}` with engine-native address.
3. **Completion semantics**: pdf.js render completion is observable;
   foliate layout has no completion event. A unified "unit ready" is
   best-effort only.
4. **Unit-count determinism**: pdf.js pages known at open; foliate column
   count known only after layout and changes with viewport/fonts. Percentage
   formulas differ (bytes-weighted vs page ratio) by necessity.
5. **Cancellation**: protocol vs boolean lock. Expose cancel only where the
   engine implements it.

## 5. Worker-ization seams (foliate side, in ease order)

1. Zip entry reading is already async (`loadText/loadBlob`, view.js:30) — a
   worker can hold the zip.
2. Search matching is pure over string arrays (search.js:103-130) — shard by
   section. **Blocker: `CFI.fromRange` needs live DOM Ranges** (view.js:528);
   replace with offset-based CFI computed from the parsed tree.
3. CSS layout + `range.getClientRects()` overlay drawing can never leave the
   main thread (overlayer.js:20, paginator.js:362-410). A worker "layout
   engine" for EPUB means replacing browser layout, not moving it.

## 6. koodo-reader case study (what leaving foliate's view layer costs)

koodo v2.x's engine (kookit) = **foliate-js parsers (EPUB class, CFI class,
MOBI/FB2 parsers, zip loaders) + a homemade view layer** (iframe + CSS
columns + scroll paging + rangy highlights). They left foliate's view layer
because their product surface (double-page, vertical writing, scroll mode,
TTS sentence highlight, inline translation, PDF ink, OCR-reflow) exceeds what
foliate's paginator exposes. Observed costs (all code-anchored):

- **Position model broke twice**: kookit never generates CFI
  (`CFI.generate`: 0 calls); restore = 200-char text-snippet match with
  simplified/traditional Chinese conversion fallbacks and ±2 block-index
  tolerance; two location-schema migrations live in the UI layer
  (`viewer/component.tsx:162-224`).
- **Column-gap quantization hack**: `floor(clientWidth/12)` repeated in 10+
  places with a ±10px divisibility search — the layout math drifted because
  no single layout computation owns it.
- **Timing hacks**: position recorded after `setTimeout(1000)` post
  animation; global `window.isSwiping` gates highlight creation; rAF retry
  when `scrollLeft` doesn't settle.
- Full book re-render for font-size changes; estimated (not actual) total
  page counts.

**Reading**: koodo is the existence proof that keeping foliate's parsers but
rebuilding its view layer costs years of edge-case whack-a-mole. Our plan —
consume foliate's integrated paginator whole — avoids this class of bugs
entirely. If we ever need koodo-class features (double-page etc.), extend at
the foliate-view adapter level, not by replacing the paginator.

### Format-conditional leakage in a production app

koodo's UI is nearly clean via one polymorphic rendition facade + ~90-field
options bag, but ~10 genuine format conditionals remain, in exactly three
categories:

1. **Capability splits** — paginated-bitmap vs reflowable-text (reader-mode
   defaults, style injection skipped, aid modes gated). koodo half-encodes
   these as capability flags (`isReadingRawPDF` is really
   "not-OCR-converted").
2. **Format-exclusive tools** — PDF crop/ink, comic archives.
3. **Legacy data migrations** — old location records rewritten in components.

Engineering rules for our "UI zero format-conditionals" red line: push (1)
into declared `capabilities`; make (2) pluggable tool panels registered by
engines; quarantine (3) in a storage-migration layer.

## 7. Ratified decisions for engine-core v1

1. **Explicit format** at `openDocument(source, { format })`; sniffing
   deferred (user decision 2026-10-13). Registry: `registerEngine(format, create)`.
2. **foliate-js via npm `^1.0.1`** (revised 2026-10-15 with evidence). The
   original plan was a pinned git dependency; in practice the git clone
   through the proxy stalled past 25 minutes while `npm i foliate-js@1.0.1`
   completed in 6.5s. The 1.0.1 snapshot (2025-04) is ~35 commits behind
   the researched commit, but the EpubEngine contract surface is narrow
   (makeBook / <foliate-view> / textWalker / resolveHref) and the full
   13-assertion runtime suite passes against 1.0.1 unchanged (mount 26ms,
   CFI round-trip, outline, text stream). Trade-off accepted: registry
   speed and cache over research-commit fidelity; revisit if a foliate bug
   forces tracking master (then prefer `git+ssh` or a fork tag, not
   `github:` https through the proxy).
3. **PdfEngine lives inside `packages/document-viewer`** (submodule owner),
   wrapping the existing open surface; compiled by the same webpack pipeline
   (PDFJSDev defines present — the spike's source-consumption failure mode
   cannot recur).
4. **engine-core stays zero-dependency**: interface + Location v1 +
   capabilities + factory only.
5. **Location v1** after foliate's relocate: `{version, sectionIndex|page,
nativeAddress (cfi/dest), fraction, tocRef}` — multi-field superset,
   versioned from birth.

## 8. One conceptual system over all formats

The question is not "canvas vs DOM" (a technical detail that lives inside
engines) but whether a single CONCEPT system covers every document format.
It does. The system has seven concepts, and every format we studied
instantiates all of them:

1. **Document** — opaque content + an ordered sequence of addressable
   content units + metadata + a TOC (tree of addresses).
2. **Address space** — engine-native way to point at a position. Unified
   superset `Location{version, unitIndex|page, nativeAddress, fraction,
tocRef}`. The native address is opaque to the host (dest array, CFI,
   spine index — all fit).
3. **Pagination as a function** — `presentablePages = layout(units,
viewParams)`. This is THE central abstraction: every engine, PDF or EPUB,
   maps content + view parameters to a presentable arrangement. What differs
   is only a PROPERTY of the function, never its shape (§8.1).
4. **Position** — current Location + a progress fraction; the progress
   formula is engine-defined (page ratio / bytes-weighted).
5. **Interaction** — `goto(address | relative)`, `setParams(viewParams)`,
   selection. Uniform across formats.
6. **Events** — `opened`, `relocated`, `unitReady` (best-effort), `error`.
7. **Content queries** — `text(addressRange)`, `search(query) →
{addressRange, excerpt}[]`; annotations as `{addressRange, kind, payload}`
   rendered by the engine.

### 8.1 The collapse: two orthogonal properties explain every "difference"

All five "essential differences" of §4 are not five axes — they are
consequences of TWO properties of the pagination function and address space:

- **P1 — pagination stability**: does changing viewParams change the page
  count / unit boundaries? **stable** (PDF, FXL, CBZ: params only rescale
  presentation; page count invariant, completion well-defined, progress =
  page ratio) vs **reflowing** (EPUB, MOBI, FB2, TXT: font size / viewport
  change repaginate; completion is best-effort; progress needs a
  content-weighted formula). Zoom semantics fall out of P1: for stable
  engines zoom is a presentation scale; for reflowing engines the analogous
  parameter is font size — one `setParams` concept, engine-declared schema.
- **P2 — address nature**: are positions **spatial** (page-relative
  coordinates — PDF dest arrays, quadPoints) or **positional** (content
  anchors — CFI, text anchors)? Determines the annotation anchor form and
  whether addresses survive relayout — but both fit "engine-native address
  inside a unified Location".

Format scatter: PDF (stable, spatial), FXL/CBZ (stable, unit/space),
EPUB/MOBI/FB2/TXT/DOCX (reflowing, positional). Two clusters, one concept
system; engines declare where they sit via capabilities
(`pagination: "stable" | "reflowing"`, address nature implied by the
annotation capability).

### 8.2 Is the vision realistic? (evidence)

Yes — and not as a bet but as a distillation of two production existence
proofs: foliate-js already runs one book model (sections + addresses +
two renderers) over EPUB/MOBI/FB2/CBZ/PDF/dicts, and koodo-reader runs one
rendition facade (~45 methods) over 12 formats including TXT/MD/DOCX/HTML
via HTML-ization. The unified concept system above is exactly what both
converged on, independently. The failure modes observed (koodo's fuzzy
position restore, koodo's format leaks) are all violations of the concept
system — ad-hoc addresses, capability checks written as format checks — not
evidence that the system itself cannot cover a format.

The boundary of the abstraction is also clear from the evidence: the host
must never assume (a) a page count at open (reflowing), (b) zoom semantics
(P1), (c) annotation anchor geometry (P2), (d) render completion (reflowing).
Those are exactly the capability seams of §4 — the interface can cover all
formats precisely because it refuses to promise these four things.

### 8.3 Binding time: the principle that separates the two execution models

At the highest level, "can EPUB run on pdf.js's pipeline?" is not a
technology question. pdf.js's pipeline (worker IR, raster task, precomputed
geometry) exists because a PDF is a RECORDING of finished typesetting: the
producer bound the reading context (page size, fonts, line breaks,
positions) at authoring time. Rendering is replay of a context-free answer —
which is exactly why it can stream, worker-ize, cancel as a task, and know
page counts at open. An EPUB is the opposite: semantic content plus
declarative constraints, where typesetting is COMPUTED at reading time with
the reader's context (viewport, font size, available fonts, a11y settings)
as an input. There is no "the layout", only "a layout for a context".

Making EPUB run the pdf.js pipeline would require fixing the reading context
in advance and baking the result — which does not implement EPUB on that
pipeline; it converts the document from `pagination: reflowing` to
`pagination: stable` (P1), destroying the property that is the format's
reason to exist. The two pipelines are not competing implementations but the
natural execution models of the two P1 classes. What a pdf.js-based engine
CAN inherit for reflowable formats is everything upstream of layout (parse,
bytes, search — context-free, hence worker-able, pdf.js-style) and
downstream of it (task/event/position protocol); the bifurcation happens
precisely at the layout step, because that is where reading context enters
the pipeline. (Corroborating footnote: pdf.js's own XFA layer renders
HTML/CSS content via DOM+CSS, not its canvas pipeline — the first
late-bound content pdf.js met structurally mismatches its flow.)

## 9. Rendering-root taxonomy (source-anchored corroboration)

Exactly THREE rendering roots exist across all formats studied
(foliate-js + koodo-reader, every cell file:line/anchor-verified):

| Root                       | Layout owner                                                                                                                          | Page unit                              | Painting                                                                     | Formats                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **A — CSS reflow**         | browser CSS engine (content interrogated post-hoc: pageCount from `getBoundingClientRect`, paginator.js:364-374)                      | CSS column (count varies with context) | DOM in sandboxed iframe                                                      | EPUB reflowable, MOBI, FB2, TXT/MD/DOCX/HTML (koodo, via HTML-ization), OCR-PDF (koodo) |
| **B — fixed scale-to-fit** | pre-existing geometry (OPF viewport/meta/SVG viewBox/img natural size, fixed-layout.js:6-30); no pagination math, only spread pairing | spine item / archive entry             | DOM `<img>`/HTML + CSS `transform: scale()` (fixed-layout.js:143)            | EPUB FXL, AZW3-fixed (KF8), CBZ                                                         |
| **C — canvas raster**      | PDF user space (MediaBox/CropBox/Rotate, core/document.js:210-264); worker op-list replay                                             | PDF page (file metadata)               | `<canvas>` (canvas.js:687-729) + viewport-transformed text/annotation layers | PDF (proper)                                                                            |

Notes that matter architecturally:

- **Root A formats all collapse through HTML-ization** — foliate's book
  contract (sections → blob URL) transparently carries EPUB/MOBI/FB2;
  koodo proves the same root absorbs TXT/MD/DOCX/HTML by pre-conversion.
  One paginator genuinely serves all of them.
- **Root B is format-blind**: one `<foliate-fxl>` serves FXL, KF8-fixed,
  CBZ with zero format-specific code — it knows only "sections + viewport".
- **The cross-root interface that survives is a BOOK interface, not a
  rendering-engine interface** ("give me a src per section and a viewport")
  — which is exactly foliate's model, and exactly our DocumentEngine
  decision: unify at the document model, keep three engines under it.
- **Why we do NOT route PDF through foliate** (makePDF, FOL pdf.js:115-180):
  zoom re-rasters the whole page per step (no cheap intermediate scale
  states); the blob-HTML shell is an indirection around what pdf.js's own
  viewer does natively; and foliate's Overlayer/annotation pipeline does not
  function for root-B/C formats at all (`getContents()` TODO,
  fixed-layout.js:308-313). Our PdfEngine wraps pdf.js's native viewer flow.
- **CBZ-through-fxl is structurally wasteful** (full sandboxed iframe per
  image, viewport from image decode, default spread pairing wrong for
  webtoon strips) — if comics ever become a target, they want their own
  thin engine, not the B root as-is.
- dictd/stardict sit OUTSIDE the model (lookup-only, dict.js:145) — any
  "all formats" claim must exclude them explicitly.

The root invariants (pagination-math ownership, page semantics, zoom cost
model, selection currency: DOM ranges vs viewport coordinates, location
semantics) are precisely the P1/P2 consequences of §8.1 — the taxonomy
corroborates the concept system rather than complicating it.

### 8.4 Convergence at paint time (the gap, precisely located)

Observation worth recording: BY the time painting happens, the layout IS
determined in both engines — PDF replays stream-given geometry, EPUB has had
its geometry computed by the CSS engine (every glyph rect queryable). The
post-layout pipeline (geometry → paint → present → interact) is therefore
genuinely isomorphic across formats; that is exactly the layer where
DocumentEngine lives, and why the unification there is real rather than
aspirational. The difference survives only in three bounded places:
(i) BEFORE layout — replay-from-data vs evaluate-on-demand; (ii) the
PERSISTENCE of the determined layout — durable file data (page count known
at open, geometry prefetchable) vs ephemeral DOM state (invalidated by any
param change, no serializable IR); (iii) PLACEMENT — the EPUB layout
computer (browser CSS engine) is bound to the live render context's main
thread and cannot be relocated into the context-free worker pipeline. Same
render function, two implementation strategies (table lookup vs
evaluation); at the interface this reduces to the P1 capability field.

### 8.5 Source verification of the binding-time principle (anchors)

- Operator list = geometry replay tape: text ops map 1:1 to stream operators
  (PJ core/evaluator.js:5280-5288); glyph advance = font-program width ×
  scale (:3026-3093); the only line breaks are explicit stream
  `carriageReturn()` (:3377); render-time `showText` is pure replay —
  fillText + advance (PJ display/canvas.js:2203-2458). No layout decisions
  exist at render time.
- pdf.js itself abandons its canvas pipeline when meeting styled content:
  pure-XFA pages render as DOM positioned by CSS instead of canvas
  (PJ web/pdf_page_view.js:1224-1235, display/xfa_layer.js:166-284), and
  even canvas pages defer text-span positioning to main-thread CSS +
  measureText (display/text_layer.js:322-373, 424-443).
- Worker CSSOM-layout is absent everywhere: PJ src/core uses no
  getComputedStyle/getBoundingClientRect (grep-verified; pdf.js ships its
  own XML parser, core/xml_parser.js:13, rather than DOMParser). foliate's
  pagination truth is pure interrogation of a live iframe: pageCount =
  ceil(measured size / page size) after fonts.ready (FJ paginator.js:362-378,
  :278), writing-mode via getComputedStyle (:178-182), ResizeObserver-driven
  expand (:211).
- The one bounded counterexample — XFA's worker-side greedy line breaker
  (PJ core/xfa/text.js:145-298, WIDTH_FACTOR 1.02 fudge) — works ONLY
  because XFA templates fix all container dimensions numerically and emit
  HTML/CSS for the browser anyway (core/xfa/html_utils.js:80-122). It
  delimits the boundary precisely: worker layout is possible exactly when
  the format pre-fixes dimensions and fonts — i.e., when binding time is
  early after all. EPUB's arbitrary author CSS + viewport-dependent reflow
  sits outside that boundary by design.

## 10. The light-worker architecture for epub-engine

Where §8.3/§9 establish that the layout step cannot leave the main thread at
full fidelity, the corollary is NOT "no worker" — it is "worker for the
computational backend, main thread for layout and presentation", in exactly
the shape pdf.js itself uses (PDFWorker → WorkerTransport → thin proxies on
the main thread, RPC over MessageHandler, plus the fake-worker fallback that
lets the same interface degrade to same-thread execution):

```
main thread                                    worker (light)
────────────────────────────────────           ─────────────────────────────
<foliate-view> (paginator / overlayer)
  view.goTo / next / prev          BookBackend (owns zip + parsed structures)
        └──── proxy RPC ─────→       · zip byte reads
                                     · DOMParser parse + URL rewriting
iframe.src = blobURL ←──── blobURL   · serialize → Blob → createObjectURL
                                     · CFI parse / resolveHref
  relocate → getPosition            · search matching (sharded)
  layout / measure / overlay        · offset computations
  (cannot move, full fidelity)
```

The load-bearing fact: `URL.createObjectURL` is available in workers, so
foliate's key seam — `sections[].load()` returning a blob URL — moves to the
worker wholesale (read → parse → rewrite → serialize → Blob → URL); the main
thread receives the same interface it has today (a URL string) and
`<foliate-view>` stays unchanged. Whether the backend is workerized becomes
an engine-internal detail invisible to DocumentEngine consumers.

Honest costs (accepted):

1. **Double parse** — the worker's DOMParser tree (computation) and the
   iframe's browser tree (display) are two trees from the same source
   string; correctness-neutral, bounded cost, LRU-evictable on the worker
   side.
2. **Offset → Range boundary** — worker search computes offsets; the
   `CFI.fromRange` step (needs live DOM) stays on the main thread as a
   cheap TreeWalker walk. The former "blocker" reduces to one line of
   main-thread backfill.
3. **Duplicated state** — structural state (worker) vs presentation state
   (main thread) reconciled through proxy RPC; the same pattern pdf.js uses
   for page caches.

Phasing: EpubEngine v1 runs entirely on the main thread behind the
DocumentEngine interface; the BookBackend moves into a worker in a later
phase with zero host-visible change.
