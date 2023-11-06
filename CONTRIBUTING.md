# Contributing Guide

## Repo Setup

To develop and test the `@document-kits/viewer`, run `pnpm demos:dev` in the root folder. It will use a custom gulp task
to build based on submodule `pdf.js` in `packages/document-viewer/pdf.js`. The specific process is as follows:

1. Install dependencies for PDF.js if `FORCE_INSTALL_DEPENDENCIES` environment was set
2. Programmatically create a gulp config `packages/document-viewer/pdf.js/gulpfile.custom.js` defines an `app` task
3. Run the custom `app` task to build `@document-kits/viewer` package based on submodule `pdf.js`
4. Start a Vite dev server to test the `@document-kits/viewer` package

## How to upgrade PDF.js

1. Update the pdf.js submodule to a specific release version.
   - Run `git submodule update --remote` to update PDF.js
   - Checkout to the release version want to sync
2. Run `pnpm syncWithUpstream`
3. Review auto-generated files
   - `@document-kits/viewer/src/app_helper.js`
   - `@document-kits/viewer/src/default_app.js`
   - `@document-kits/viewer/src/viewer_template.js`
   - `@document-kits/viewer/src/default_external_services.js`
4. Review commit history to update files
   - `@document-kits/viewer/src/firefox_print_service.js`
   - `@document-kits/viewer/src/firefoxcom.js`
   - `@document-kits/viewer/src/chromecom.js`
   - `@document-kits/viewer/src/genericcom.js`
   - `@document-kits/viewer/src/pdf_print_service.js`
