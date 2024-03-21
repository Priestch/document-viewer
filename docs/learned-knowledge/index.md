---
title: The Knowledge I Learned from PDF.js
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/learned-knowledge/
---

# Acknowledge

> There are critical comments about the PDF.js project, they say it should be easier to integrate the default
> viewer. I understand them somehow as a developer who want to show a PDF quickly, but knowing the primary goal
> of an OSS project can help us to understand the trade-off decisions made by the maintainers.
>
> All these are what I learned from the PDF.js project. It may not be accurate, but I hope it can help you to understand the PDF.js better.

# Table of Contents

[[toc]]

## Background

[PDF.js](https://github.com/mozilla/pdf.js) is an OSS project supported by Mozilla and developed using HTML5,
It's goal is to create a general-purpose, web standards-based platform for rendering PDFs in the **Firefox browser**. Many people find out that it's hard to integrate it into project, it's [somehow intentionally](#issues-talked-about-why-it-s-hard-to-integrate).

It's not developed as a component or library you can easily integrate like most npm packages, because it's
primary goal is to be used easily in **Firefox browser**, the goal doesn't match most developers expectations.
It's the trade-off decision made by the maintainers, we should understand it.

#### Issues talked about why it's not easy to integrate

- [Issue 5609](https://github.com/mozilla/pdf.js/issues/5609#issuecomment-68530552)
- [Issue 9210](https://github.com/mozilla/pdf.js/issues/9210#issuecomment-347834276)
- [Issue 7203](https://github.com/mozilla/pdf.js/issues/7203#issuecomment-210510569)

## Introduction

PDF.js use [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) for better rendering performance.

A typical web application only has one bundle result, but PDF.js has at least 4 bundles, they are main, worker, sandbox and web bundles.

```javascript{6-9}
// From https://github.com/mozilla/pdf.js/blob/master/gulpfile.mjs#L1001
function buildGeneric(defines, dir) {
  rimraf.sync(dir);

  return merge([
    createMainBundle(defines).pipe(gulp.dest(dir + "build")),
    createWorkerBundle(defines).pipe(gulp.dest(dir + "build")),
    createSandboxBundle(defines).pipe(gulp.dest(dir + "build")),
    createWebBundle(defines, {
      defaultPreferencesDir: defines.SKIP_BABEL
        ? "generic/"
        : "generic-legacy/",
    }).pipe(gulp.dest(dir + "web")),
    // ...
  ]);
}
```

The default viewer uses the web bundle directly, it depends on the main and worker bundles. **Keep in mind you must load the main bundle before using the default viewer**.
Each time a PDF document is opened using the [open](https://github.com/mozilla/pdf.js/blob/a6e0b0292e8d8952576f55073ba3b8df69a2932a/web/app.js#L935) method, it will create a new worker to render the PDF document.

The main bundle is built from [`src/pdf.js`](https://github.com/mozilla/pdf.js/blob/master/src/pdf.js), it's the entry of the main bundle. The worker bundle is built from [`src/pdf.worker.js`](https://github.com/mozilla/pdf.js/blob/master/src/pdf.worker.js), it's the entry of the worker bundle.

The [`src/web`](https://github.com/mozilla/pdf.js/tree/master/web) directory contains the source code of the default viewer,
all modules depend on the main bundle have to import from the `pdfjs-lib` package, it will be resolved to `web/pdfjs.js` using the [`resolve.alias`](https://webpack.js.org/configuration/resolve/#resolvealias) option of webpack when building.

```javascript
// web/pdfjs.js
// https://github.com/mozilla/pdf.js/blob/master/web/pdfjs.js
if ((typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) && !globalThis.pdfjsLib) {
  await globalThis.pdfjsLibPromise;
}

const {
  AbortException,
  // ...
} = globalThis.pdfjsLib;

export {
  AbortException,
  // ...
};
```

As we can see from the code above, the web bundle must load the main bundle first. You can import from the result of
`globalThis.pdfjsLibPromise` only when the main bundle promise is resolved.

```javascript
// An example module in web/alt_text_manager.js depends main bundle.
//
// From https://github.com/mozilla/pdf.js/blob/master/web/alt_text_manager.js
import { DOMSVGFactory, shadow } from "pdfjs-lib";

class AltTextManager {
  // ...
}
```

## PDFViewerApplication

<!--@include: ./parts/application.md-->

## AppOptions

<!--@include: ./parts/app-options.md-->

## Important Events

<!--@include: ./parts/events.md-->

## Gulp Tasks
