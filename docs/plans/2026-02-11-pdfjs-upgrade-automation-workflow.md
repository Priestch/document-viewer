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

## Notes

- The workflow does not auto-merge PRs.
- A quick manual demo check is still recommended before merge.
