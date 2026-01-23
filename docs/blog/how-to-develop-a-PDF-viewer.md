---
title: How to Develop a PDF Viewer as Frontend Engineer
description: Developing a PDF viewer from scratch is a complex task that requires more than just frontend skills. Learn about the major approaches to building a PDF viewer.
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/blog/how-to-develop-a-PDF-viewer.html
---

# How to Develop a PDF Viewer as Frontend Engineer

Developing a PDF viewer from scratch is a complex and very challenging task, your frontend skills alone will not be enough. You will need a good understanding of the PDF file format, rendering techniques, and performance optimization.

## Four Major ways to Develop a PDF Viewer

### Based on images

Convert each page of the PDF into an image (e.g., PNG or JPEG) on the server side. Then, display these images in a web application using HTML `<img>` tags or a JavaScript image viewer library. This approach is relatively simple but may not provide the best user experience, especially for large documents. It's not extensible and all other features like text selection, search, annotations, etc. will be limited to what you can do with images.

### Using PDF.js

[PDF.js](https://mozilla.github.io/pdf.js/) is an open-source project developed by Mozilla built using HTML5 technologies. It allows you to render PDF documents directly in the browser. The limitation of this approach is that PDF.js is not developer friendly, the official default viewer is not easy to integrate into existing applications, and customizing it can be challenging. The official packa#ge provided is `pdfjs-dist/`, which only includes the core PDF rendering library without the viewer UI. The default viewer is built on the top of this core library and the whole UI code is not published as a separate package. It's the source of chaos in the ecosystem, but the bad news is that it's on purpose. They try to avoid people customizing the viewer too much to reduce maintenance burden.

### Using Compiled PDFium Wasm

> “Foxit is honored to be chosen as the PDF provider for the open-source PDFium project,” says Eugene Xiong – Founder and Chairman of the Board at Foxit. “Our high performance, highly accurate, and platform independent software technology will help developers everywhere to incorporate powerful PDF technology when creating innovative applications.”

[PDFium](https://pdfium.googlesource.com/pdfium/) is an open-source PDF rendering engine first developed by [Foxit](https://www.foxit.com/nl/company/press/5606.html), then acquired by Google. It is used in the Chrome browser and other applications. PDFium can be compiled to WebAssembly (Wasm), allowing it to run in web browsers. This approach provides an alternative to PDF.js for rendering PDF documents in the browser. However, integrating PDFium into a web application can be complex and may require significant effort to set up and optimize. The wasm only provides the rendering engine, and you still need to build the viewer UI and other features on top of it.

#### Related Projects

##### [PDFium Library](https://github.com/paulocoutinhox/pdfium-lib)

A project that provides precompiled PDFium WebAssembly module for easy integration into web applications. It simplifies the process of using PDFium in the browser by providing a ready-to-use Wasm module. There is a [web demo](https://pdfviewer.github.io/) available to show how you can use it to display a PDF file.

##### [EmbedPDF](https://www.embedpdf.com/)

A Open Source PDF viewer also built using PDFium Wasm. It provides a polished, production-ready PDF viewer that drops into your app in seconds. Perfect for standard use cases. You can build you own custom viewer UI from scratch based on their render engine, or using their default viewer.

![EmbedPDF Viewer](/assets/embed_pdf_viewer.png)

### Buying a commercial solution

There are several commercial PDF viewer solutions available. You can see [commercial pdf viewers](/blog/3-ways-to-display-pdf-in-html#commercial-pdf-viewer).
