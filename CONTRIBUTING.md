# Contributing Guide

## Repo Setup

To develop and test the `@document-kits/viewer`, run `pnpm examples:dev` in the root folder. It will use a custom gulp task
to build based on submodule `pdf.js` in `packages/document-viewer/pdf.js`. The specific process is as follows:

1. Install dependencies for PDF.js if `FORCE_INSTALL_DEPENDENCIES` environment was set
2. Programmatically create a gulp config `packages/document-viewer/pdf.js/gulpfile.custom.js` defines a `app` task
3. Run the custom `app` task to build `@document-kits/viewer` package based on submodule `pdf.js`
4. Start a Vite dev server to test the `@document-kits/viewer` package

## How to upgrade PDF.js

1. Update the pdf.js submodule to a specific release version.
   - Run `git submodule update --remote` to update PDF.js
   - Checkout to the release version want to sync
2. Run `pnpm syncWithUpstream`
3. Manually review `@document-kits/viewer/src/app_helper.js`, `@document-kits/viewer/src/default_app.js` and `@document-kits/viewer/src/viewer_template.js`
