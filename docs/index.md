# PDF Viewer

An out-of-the-box PDF viewer builds on PDF.js.

## Quick Start

You can use the starter to initialize a demo app to explore how to use this package in your own project.

```bash
# initialize a demo project with a quick starter
npm create @document-kits/viewer@latest my-app

cd my-app

npm install
npm run dev
```

## Prepare Resources

PDF.js depends on some resources to work.

All the necessary resources are located in `node_modules/@document-kits/viewer/dist/generic/`.
When building the app using a bundler, make sure to copy these resources.

###### Resource List

- `web/locale/viewer.properties` for i18n
- `web/viewer.css` for viewer style
- `build/pdf.worker.js`
- `build/pdf.sandbox.js`
- `web/standard_fonts/*`
