# PDF.js Upgrade Automation Report

- Status: **SUCCESS**
- Mode: **DRY RUN**
- Generated at (UTC): 2026-10-12T12:52:46.626Z
- Duration: 46 ms
- Command: `node scripts/pdfjs-upgrade.mjs --to v5.7.284 --dry-run`

## Commits

- From: `f9bea397f817100a186d0ced2aa3d4b85813b637`
- To: `v5.7.284`
- Current submodule head after run: `f9bea397f817100a186d0ced2aa3d4b85813b637`
- Submodule checkout changed: no
- Dry-run note: source contract checks were executed against current workspace files.

## Upstream change snapshot

### web/pdfjs.js commit log (f9bea397..v5.7.284)

```text
75cba72ca [api-major] Replace `MissingPDFException` and `UnexpectedResponseException` with one exception
2c737bc42 Move the array containing the supported image mime types in display_utils
61ba1ea48 Enable automatic URL linking
fba5f3c23 Create the `borderStyle` of inferred links lazily (PR 19110 follow-up)
6b95095e1 Add the possibility to compress/decompress the signature data in order to store them in the logins storage in Firefox (bug 1946171)
e3cca6d51 Merge pull request #19425 from calixteman/signature_save
165d90fe2 Re-use the `isValidExplicitDest` helper function in the worker/viewer
07bbbf75a Introduce a helper function for clamping a value to a range
abc952288 Avoid (most) string parsing when removing/replacing the hash property of a URL
636ff503f [Editor] Add the possibility to add Popup annotations (bug 1976724)
0ec503e5e Add a function changeLightness in order to change the lightness of a RGB color
ca280399c [Editor] Use the color of the annotation for the background of the comment button
35c909843 Add a new function renderRichText to be used in the annotation layer
7f85c00ee Make sure that a good constrast ratio is respected when darkening/lightening a color
806133379 Refactor a bit page mapping stuff in order to be able to support delete/copy pages
4b4ab10c5 Set a pages mapper per loaded document
2e07715c9 Reduce function creation when using `Map.prototype.getOrInsertComputed()`
0d4e587a5 Reduce allocations when using `Map.prototype.getOrInsert()` with `Array`s
886c90d1a Add support for right-clicking on images
f266c4d8b [Ink] Replace the opacity slider with an alpha-enabled color input
```

### Critical file diff stat

```text
gulpfile.mjs       | 1262 +++++++++++++++++++++++++++++++++++-----------------
 web/app.js         |  762 ++++++++++++++++++++-----------
 web/app_options.js |  170 +++++--
 web/pdfjs.js       |   40 +-
 4 files changed, 1527 insertions(+), 707 deletions(-)
```

## Source integration contract checks

| Check                                                                 | Result | Detail                                                     |
| --------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| webpack alias for pdfjs-lib is configured in both app/library bundles | pass   | found 2 alias declaration(s)                               |
| application options point worker to .mjs                              | pass   | expected pdf.worker.mjs in workerSrc                       |
| application options point sandbox to .mjs                             | pass   | expected pdf.sandbox.mjs in sandboxBundleSrc               |
| application options include debuggerSrc as debugger.mjs               | pass   | expected debuggerSrc=./debugger.mjs                        |
| annotation editor params include free highlight thickness             | pass   | expected editorFreeHighlightThickness binding              |
| annotation editor params include highlight visibility toggle          | pass   | expected editorHighlightShowAll binding                    |
| debugger script path uses debugger.mjs                                | pass   | expected debuggerScriptPath with .mjs                      |
| viewer template includes highlight thickness control                  | pass   | expected editorFreeHighlightThickness element              |
| viewer template includes highlight show-all toggle                    | pass   | expected editorHighlightShowAll element                    |
| viewer template no longer includes static file input                  | pass   | expected removal of static file input from template        |
| default app creates open-file input dynamically                       | pass   | expected dynamic hidden input creation                     |
| helper does not call PDFPrintServiceFactory.initGlobals directly      | pass   | print service binding must stay in src/app.js bindServices |
| open-file handler clicks dynamic input                                | pass   | expected \_openFileInput?.click()                          |

## Command execution

| Step                                         | Status  | Duration | Command                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| resolve-current-submodule-head               | ok      | 3ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js rev-parse HEAD (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                           |
| verify-target-commit-exists                  | ok      | 2ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js cat-file -e v5.7.284^{commit} (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                            |
| collect-web-pdfjs-log                        | ok      | 23ms     | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js log --reverse --oneline f9bea397f817100a186d0ced2aa3d4b85813b637..v5.7.284 -- web/pdfjs.js (cwd: /home/gaopeng/Enter/document-viewer)`                               |
| collect-critical-diff-stat                   | ok      | 8ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js diff --stat f9bea397f817100a186d0ced2aa3d4b85813b637 v5.7.284 -- web/pdfjs.js web/app.js web/app_options.js gulpfile.mjs (cwd: /home/gaopeng/Enter/document-viewer)` |
| checkout-target-submodule-commit             | skipped | 0ms      | `dry-run: checkout skipped`                                                                                                                                                                                                                      |
| sync-wrapper-template-from-upstream          | skipped | 0ms      | `dry-run: syncWithUpstream skipped`                                                                                                                                                                                                              |
| extract-wrapper-js                           | skipped | 0ms      | `dry-run: extract:js skipped`                                                                                                                                                                                                                    |
| build-viewer                                 | skipped | 0ms      | `dry-run: viewer build skipped`                                                                                                                                                                                                                  |
| sync-override-viewer-css                     | skipped | 0ms      | `dry-run: override CSS sync skipped`                                                                                                                                                                                                             |
| build-demos                                  | skipped | 0ms      | `dry-run: demos build skipped`                                                                                                                                                                                                                   |
| smoke-check-dist-assets                      | skipped | 0ms      | `dry-run: smoke checks skipped`                                                                                                                                                                                                                  |
| resolve-current-submodule-head-after-upgrade | ok      | 2ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js rev-parse HEAD (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                           |
| collect-git-status                           | ok      | 7ms      | `git status --short (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                                                  |

## Smoke

- Smoke status: skipped (dry-run)

## Git status (short)

```text
M .gitmodules
 M demos/src/router/index.js
 M demos/vite.config.js
?? demos/public/alice.epub
?? demos/src/engine-spike/
?? demos/src/views/EngineSpike.vue
?? docs/plans/2026-10-11-engine-core-exploration.md
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-ea34e5cc-to-24176a94.md
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-failed.md
?? packages/epub-engine/
```
