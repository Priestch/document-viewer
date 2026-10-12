# PDF.js Upgrade Automation Report

- Status: **FAILED**
- Mode: **APPLY**
- Generated at (UTC): 2026-10-12T12:57:35.843Z
- Duration: 12935 ms
- Command: `node scripts/pdfjs-upgrade.mjs --to v5.7.284`

## Commits

- From: `f9bea397f817100a186d0ced2aa3d4b85813b637`
- To: `v5.7.284`
- Current submodule head after run: `7e5b36c2d572ba82e1e3adeb1c266f0052746c73`
- Submodule checkout changed: yes

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

| Step                                         | Status | Duration | Command                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| resolve-current-submodule-head               | ok     | 7ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js rev-parse HEAD (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                           |
| verify-target-commit-exists                  | ok     | 7ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js cat-file -e v5.7.284^{commit} (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                            |
| collect-web-pdfjs-log                        | ok     | 40ms     | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js log --reverse --oneline f9bea397f817100a186d0ced2aa3d4b85813b637..v5.7.284 -- web/pdfjs.js (cwd: /home/gaopeng/Enter/document-viewer)`                               |
| collect-critical-diff-stat                   | ok     | 13ms     | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js diff --stat f9bea397f817100a186d0ced2aa3d4b85813b637 v5.7.284 -- web/pdfjs.js web/app.js web/app_options.js gulpfile.mjs (cwd: /home/gaopeng/Enter/document-viewer)` |
| checkout-target-submodule-commit             | ok     | 587ms    | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js checkout v5.7.284 (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                        |
| sync-wrapper-template-from-upstream          | ok     | 2640ms   | `pnpm --filter @document-kits/viewer run syncWithUpstream (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                            |
| extract-wrapper-js                           | ok     | 3417ms   | `pnpm --filter @document-kits/viewer run extract:js (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                  |
| build-viewer                                 | ok     | 2611ms   | `pnpm viewer:build (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                                                   |
| sync-override-viewer-css                     | ok     | 982ms    | `pnpm --filter @document-kits/viewer run transform:css (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                               |
| apply-override-viewer-css-to-dist            | ok     | 5ms      | `cp packages/document-viewer/src/assets/viewer.css packages/document-viewer/dist/generic/web/viewer.css (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                              |
| build-demos                                  | failed | 2443ms   | `pnpm demos:build (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                                                    |
| resolve-current-submodule-head-after-failure | ok     | 3ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js rev-parse HEAD (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                           |
| collect-git-status-after-failure             | ok     | 177ms    | `git status --short (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                                                  |

## Smoke

- Smoke status: not-run

## Git status (short)

```text
M .gitmodules
 M demos/src/router/index.js
 M demos/vite.config.js
 M docs/plans/2026-02-11-pdfjs-upgrade-automation-workflow.md
 M packages/document-viewer/pdf.js
 M packages/document-viewer/src/app_helper.js
 M packages/document-viewer/src/assets/viewer.css
 M packages/document-viewer/src/default_app.js
 M packages/document-viewer/src/viewer_template.js
?? demos/public/alice.epub
?? demos/src/engine-spike/
?? demos/src/views/EngineSpike.vue
?? docs/plans/2026-10-11-engine-core-exploration.md
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-ea34e5cc-to-24176a94.md
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-failed.md
?? docs/plans/2026-10-12-pdfjs-upgrade-auto-f9bea397-to-v5.7.284.md
?? packages/epub-engine/
```

## Error

```text
Step failed: build-demos
Command: pnpm demos:build (cwd: /home/gaopeng/Enter/document-viewer)
<no stderr>
```
