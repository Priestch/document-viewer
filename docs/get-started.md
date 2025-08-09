---
title: Get Started with @document-kits/viewer
description: A quick start guide to using node package manager like npm/pnpm to initialize a starter project with @document-kits/viewer.
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/get-started.html
---

# PDF Viewer

An out-of-the-box PDF viewer builds on PDF.js.

## Quick Start

You can use the starter to initialize a demo app to explore how to use this package in your own project.

::: code-group

```bash [npm]
# initialize a demo project with a quick starter
npm create @document-kits/viewer@latest my-app

# There will be prompt to let you choose a template to start,
# currently support Vue3, Lit and Solid.js.

cd my-app

# install dependencies
npm install

# run the dev server and open the default browser to view the demo
npm run dev --open
```

```bash [pnpm]
# initialize a demo project with a quick starter
pnpm create @document-kits/viewer@latest my-app

# There will be prompt to let you choose a template to start,
# currently support Vue3, Lit and Solid.js.

cd my-app

# install dependencies
pnpm install

# run the dev server and open the default browser to view the demo
pnpm run dev --open
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
