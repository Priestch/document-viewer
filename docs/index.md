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

PDF.js depends on some resources to work. All these resources in `node_modules/@document-kits/viewer/dist/generic/`.
You must copy these resources when using bundler build the app.

###### Resource List

- `viewer.properties` for i18n
- `pdf.worker.js`

## PDF.js Architecture

![Overview of the PDF.js Architecture](https://hacks.mozilla.org/files/2021/09/pdfjs_architecture.png)

[Read more](https://hacks.mozilla.org/2021/10/implementing-form-filling-and-accessibility-in-the-firefox-pdf-viewer/)
