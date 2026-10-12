# PDF.js Upgrade Automation Report

- Status: **SUCCESS**
- Mode: **DRY RUN**
- Generated at (UTC): 2026-10-11T05:49:36.054Z
- Duration: 35 ms
- Command: `node scripts/pdfjs-upgrade.mjs --to v4.10.38 --dry-run`

## Commits

- From: `ea34e5ccf6fdc7b3efcf6eba5b937dc7d63c5961`
- To: `v4.10.38`
- Current submodule head after run: `ea34e5ccf6fdc7b3efcf6eba5b937dc7d63c5961`
- Submodule checkout changed: no
- Dry-run note: source contract checks were executed against current workspace files.

## Upstream change snapshot

### web/pdfjs.js commit log (ea34e5cc..v4.10.38)

```text
f3d177e3e [api-minor] Remove the deprecated `renderTextLayer` and `updateTextLayer` functions (PR 18104 follow-up)
8a979c2d0 [api-minor] Remove `Outliner` from the official API
46fac8b2c [Editor] Take into account the device pixel ratio when drawing an added image
b048420d2 [api-minor] Remove the `CMapCompressionType` enumeration
e1760aab8 Use the `stopEvent` helper function everywhere possible
e0b63ecd0 Move the pinch stuff in its own file in order to use for editors
```

### Critical file diff stat

```text
gulpfile.mjs       |  646 +++++++++++++++------------
 web/app.js         | 1246 ++++++++++++++++++++++++----------------------------
 web/app_options.js |  256 ++++++++---
 web/pdfjs.js       |   14 +-
 4 files changed, 1114 insertions(+), 1048 deletions(-)
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
| verify-target-commit-exists                  | ok      | 2ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js cat-file -e v4.10.38^{commit} (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                            |
| collect-web-pdfjs-log                        | ok      | 8ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js log --reverse --oneline ea34e5ccf6fdc7b3efcf6eba5b937dc7d63c5961..v4.10.38 -- web/pdfjs.js (cwd: /home/gaopeng/Enter/document-viewer)`                               |
| collect-critical-diff-stat                   | ok      | 7ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js diff --stat ea34e5ccf6fdc7b3efcf6eba5b937dc7d63c5961 v4.10.38 -- web/pdfjs.js web/app.js web/app_options.js gulpfile.mjs (cwd: /home/gaopeng/Enter/document-viewer)` |
| checkout-target-submodule-commit             | skipped | 0ms      | `dry-run: checkout skipped`                                                                                                                                                                                                                      |
| sync-wrapper-template-from-upstream          | skipped | 0ms      | `dry-run: syncWithUpstream skipped`                                                                                                                                                                                                              |
| extract-wrapper-js                           | skipped | 0ms      | `dry-run: extract:js skipped`                                                                                                                                                                                                                    |
| build-viewer                                 | skipped | 0ms      | `dry-run: viewer build skipped`                                                                                                                                                                                                                  |
| build-demos                                  | skipped | 0ms      | `dry-run: demos build skipped`                                                                                                                                                                                                                   |
| smoke-check-dist-assets                      | skipped | 0ms      | `dry-run: smoke checks skipped`                                                                                                                                                                                                                  |
| resolve-current-submodule-head-after-upgrade | ok      | 3ms      | `git -C /home/gaopeng/Enter/document-viewer/packages/document-viewer/pdf.js rev-parse HEAD (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                           |
| collect-git-status                           | ok      | 11ms     | `git status --short (cwd: /home/gaopeng/Enter/document-viewer)`                                                                                                                                                                                  |

## Smoke

- Smoke status: skipped (dry-run)

## Git status (short)

```text
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-ea34e5cc-to-24176a94.md
?? docs/plans/2026-10-11-pdfjs-upgrade-auto-failed.md
```
