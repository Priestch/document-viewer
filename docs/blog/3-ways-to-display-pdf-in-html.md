---
title: Three Ways to Display a PDF in HTML
description: Learn how to display PDF files in your HTML app with three ways, including using native elements, open source library like PDF.js, and commercial PDF viewers.
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/blog/3-ways-to-display-pdf-in-html.html
---

# Three Ways to display PDF file in HTML

If you want to embed a PDF file into your website, you will need a PDF viewer to do the job. There are 3 major ways to integrate a PDF viewer into your website:

# Contents

[[toc]]

## Native Browser Elements

All common browsers include some sort of built-in PDF support, you can display PDF files with native elements like `<embed>`, `<object>`, `<iframe>`. I will give you examples of how to use them.

### Use `embed` Element

```html
<embed
  src="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
  type="application/pdf"
  width="100%"
  height="500px"
/>
```

### Use `object` Element

```html
<object
  data="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf#page=3"
  type="application/pdf"
  width="100%"
  height="100%"
>
  <iframe
    src="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf#page=3"
    width="100%"
    height="100%"
    style="border: none;"
  >
    <p>Your browser does not support PDFs.</p>
  </iframe>
</object>
```

### Use `iframe` Element

```html
<iframe
  src="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf#page=2"
  width="100%"
  height="100%"
  style="border: none;"
>
  <p>Your browser does not support PDFs.</p>
</iframe>
```

## Open Source Library

The [PDF.js](https://mozilla.github.io/pdf.js/) is the most used open-source library to display PDF files in HTML.

## Commercial PDF Viewer

There are some commercial PDF viewers that can be used to display PDF files in HTML.

### [Apryse](https://apryse.com/products/webviewer)

Apryse, formerly known as PDFTron.

### [PSPDFKit](https://pspdfkit.com/pdf-sdk/web/viewer/)

### [Foxit](https://webviewer-demo.foxit.com/)
