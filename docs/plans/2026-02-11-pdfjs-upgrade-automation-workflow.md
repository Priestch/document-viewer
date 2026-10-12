# PDF.js Upgrade Automation Workflow

Date: 2026-02-11

## Overview

This workflow automates the repeatable parts of upgrading `packages/document-viewer/pdf.js` and validating wrapper compatibility.

## Local command

```bash
pnpm pdfjs:upgrade --to <target_commit>
```

### What the command does

1. Resolves current `pdf.js` submodule commit.
2. Verifies target commit exists in submodule repository.
3. Collects upstream delta snapshots for key files:
   - `web/pdfjs.js`
   - `web/app.js`
   - `web/app_options.js`
   - `gulpfile.mjs`
4. Checks out submodule to the target commit.
5. Runs wrapper sync/extract tasks:
   - `pnpm --filter @document-kits/viewer run syncWithUpstream`
   - `pnpm --filter @document-kits/viewer run extract:js`
6. Runs source contract checks for known integration breakpoints.
7. Builds viewer and demo bundles.
8. Runs dist smoke checks (`pnpm pdfjs:smoke`).
9. Writes an execution report to `docs/plans/*pdfjs-upgrade-auto*.md`.

### Useful options

```bash
pnpm pdfjs:upgrade --to <target_commit> --from <base_commit>
pnpm pdfjs:upgrade --to <target_commit> --dry-run
pnpm pdfjs:upgrade --to <target_commit> --skip-smoke
pnpm pdfjs:upgrade --to <target_commit> --skip-build
pnpm pdfjs:upgrade --to <target_commit> --report docs/plans/custom-report.md
```

## Smoke-only command

```bash
pnpm pdfjs:smoke
```

This command validates generated dist artifacts and checks for known regression signatures.

### Dry-run mode

`--dry-run` is read-only and intentionally skips:

- submodule checkout
- sync/extract steps
- viewer/demo builds
- smoke checks

It still collects commit/file deltas and runs source integration contract checks, then writes a report.

## CI workflow

Workflow file:

- `.github/workflows/pdfjs-upgrade.yaml`

### Trigger

Manual trigger via **workflow_dispatch** with inputs:

- `target_commit` (required)
- `base_commit` (optional)
- `run_smoke` (boolean)
- `create_pr` (boolean)
- `base_branch` (string)

### CI actions performed

1. Checkout with submodules.
2. Install dependencies with pnpm.
3. Run `pnpm pdfjs:upgrade ...`.
4. Upload generated report as artifact.
5. Optionally create a PR with all generated changes.

## Integration contracts enforced

The automation fails early if any of these regress:

- `pdfjs-lib` webpack alias wiring in `gulpfile.template.js`.
- `.mjs` worker/sandbox/debugger resource paths.
- Highlight editor DOM/config bindings.
- Dynamic open-file input flow (`_openFileInput`).
- `bin/gulpfile.template.js` upstream identifiers exist in `pdf.js/gulpfile.mjs`
  (the template is textually concatenated into `gulpfile.custom.mjs` and relies
  on upstream gulpfile scope; a rename upstream breaks the build cryptically).
- The `src/pdf_js/index.js` facade exports exactly the same symbol set as
  upstream `web/pdfjs.js` (the webpack alias points web code at our facade;
  both missing and extra exports are treated as drift — caught
  `CMapCompressionType` stale export on first run, 2026-10-11).

## Known manual steps (hit during the v4.10.38 upgrade, 2026-10-11)

These are gaps the automation does not cover; recorded here so the next
upgrade does not rediscover them:

1. **Target commit fetch.** The script verifies but never fetches. If the
   target is absent from the submodule's object store, fetch it from the local
   pristine clone first:
   `git -C packages/document-viewer/pdf.js fetch /home/gaopeng/Enter/pdf.js '+refs/heads/master:refs/remotes/upstream-clone/master'`
   (or fetch the specific tag).
2. **Submodule `npm ci` behind the firewall.** Puppeteer browser downloads
   stall the install (18min+ hang). `.puppeteerrc` is a tracked submodule file
   and must not be edited — use env vars instead:
   `PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMEDOWNLOAD=1 http_proxy=http://127.0.0.1:1080 https_proxy=http://127.0.0.1:1080 npm ci`.
3. **Gulp toolchain.** `bin/gulp.sh` invokes the submodule's own
   `node_modules/.bin/gulp` on purpose: the workspace-level gulp is v4 and its
   bundled CLI rejects gulp 5 with "Unsupported gulp version" — and exits 0,
   which once made a failed build look successful while smoke validated a
   stale dist. Do not "simplify" this back to the workspace gulp.
4. **gulp 5 reads binaries as UTF-8 by default.** Every `gulp.src` touching
   binary assets (PDFs, fonts, images) must pass `{ encoding: false }` in
   `gulpfile.template.js`. Symptom of getting it wrong: PDFs grow in size and
   fail with `FormatError: Bad encoding in flate stream` at runtime, while
   existence-based smoke checks still pass.
5. **Sync tool known bugs (as of v5.7.284).** `transform-html` misses
   `customScaleOption`'s `data-dom-id` (worked around with a fallback
   `#customScaleOption` selector in `app_manager.js`); `extract:js` emits
   unscoped bare references in `default_app.js` — bit twice: the `on*`
   handlers (v4.10.38, masked because `app.js` overrides `bindEvents`) and
   `validateFileURL` at v5.7.284 (upstream declares it as a module-level
   `var` far below its call site in `run()`; the extraction drops it and
   every route hard-crashes — fixed by restoring `run(config,
validateFileURL)` and having `app.js` pass it, same as v4.10). Both
   recurrences mean: after every upgrade, grep the freshly extracted
   `default_app.js`/`app_helper.js` for identifiers with no visible
   declaration.
6. **Submodule hygiene.** `gulpfile.custom.mjs` (the concatenated build file)
   is locally ignored via `.git/modules/pdf.js/info/exclude`, not a tracked
   `.gitignore` — the submodule's `.git` is a gitdir pointer, the real exclude
   lives in the parent repo's modules directory.
7. **`src/assets/viewer.css` regeneration (transform:css) — full incident
   record from the v4.10.38 upgrade (2026-10-11).**

   Mechanism: the gulp task `overrideStyle` copies this file over
   `dist/generic/web/viewer.css`, fully REPLACING upstream's compiled CSS.
   Upstream CSS is **id-selector based** (`#viewerContainer`,
   `#sidebarToggleButton::before`), but the embedded DOM from
   `viewer_template.js` carries **data-dom-id instead of ids**
   (transform:html strips ids so multiple viewers can coexist on one page).

   The upgrade went through four CSS failure modes, in this order:

   - **Stale override.** The sync step for this file simply did not exist;
     the old class-selector-era CSS matched nothing after upstream renamed
     element ids → blank toolbar icons, clipped pages.
   - **Naive copy.** First fix copied the compiled CSS verbatim — but
     id-based rules match an id-less DOM exactly zero times → icons became
     black squares and the `PDFViewer` constructor threw
     `The container must be absolutely positioned` (its
     `#viewerContainer { position: absolute }` rule no longer applied), so
     no document rendered at all (0 pages).
   - **Specificity regression.** Second fix rewrote `#id` to a bare
     `[data-dom-id="id"]` — attribute specificity is (0,1,0), not (1,0,0),
     so later class rules started winning ties: `.toolbarHorizontalGroup {
height: 100% }` overrode what upstream intended to stay id-governed,
     blowing the sidebar toolbar up to container height and parking an
     invisible 863×863 thumbnail button on top of the pages — hovering a
     document blanked it (the button's :hover background) and drew a blue
     focus ring around the page area.
   - **Incomplete rewrite.** The first transform draft only handled
     top-level rules; selectors nested inside `@media` blocks stayed
     unrewritten (fixed by tracking group rules with a block stack).

   Final fix: `pnpm --filter @document-kits/viewer run transform:css`
   (`bin/transform-css.js`) regenerates the file from
   `pdf.js/build/generic/web/viewer.css`, rewriting `#id` selectors to
   `:is(#id, [data-dom-id="id"])` for exactly the ids the template emits.
   The `:is()` wrapper is load-bearing: it takes the specificity of its
   most specific argument (1,0,0), exactly replicating the upstream cascade,
   which a bare attribute selector cannot. The `#id` arm never matches in
   the embedded DOM (no ids exist there); it exists purely for specificity.
   The transform only touches selector segments, never declaration bodies
   (hex colors, url() fragments), and handles `@media`-nested rules.

   Guardrails now in place: the upgrade script runs transform:css
   automatically after `viewer:build` (step `sync-override-viewer-css`), and
   two smoke contracts check the result (icon rules present in rewritten
   form; no bare `#id` selectors for template ids remain).

   Process lesson: automated verification reported green twice while the
   viewer was visually broken — page counts, console checks, and even
   screenshot skims cannot see CSS-level breakage. The manual demo check
   with actual eyes on the rendered page (including a hover interaction) is
   a mandatory step, not a recommendation.

   Caveats: the standalone `dist/generic/web/viewer.html` still carries real
   ids, which this rewritten CSS no longer targets — the supported
   consumption path is the embedded `createViewerApp`, not the standalone
   viewer page. Never hand-edit `src/assets/viewer.css`; customizations
   belong in a separate stylesheet layered on top.

8. **Node >= 20.18.1 required from pdf.js v5.7.284.** The submodule build
   toolchain pulls in cheerio → undici, which uses the `File` global absent
   from Node 18 — `bin/gulp.sh` dies with `ReferenceError: File is not
defined` before webpack even starts. Run builds with fnm's Node 22
   (`~/.fnm/node-versions/v22.14.0/installation/bin` first on PATH). The
   smoke icon-selector contract also had to learn that upstream keeps dead
   legacy `#id::before` rules in its CSS (ids removed from viewer.html);
   only ids present in the template are enforced.

## Notes

- The workflow does not auto-merge PRs.
- A quick manual demo check is still recommended before merge.
