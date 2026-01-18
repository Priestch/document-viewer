# How to Develop a PDF Viewer

Developing a PDF viewer from scratch is a complex and very challenging task, your frontend skills alone will not be enough. You will need a good understanding of the PDF file format, rendering techniques, and performance optimization.

## 3 Major ways to Develop a PDF Viewer

### Based on images

Convert each page of the PDF into an image (e.g., PNG or JPEG) on the server side. Then, display these images in a web application using HTML `<img>` tags or a JavaScript image viewer library. This approach is relatively simple but may not provide the best user experience, especially for large documents. It's not extensible and all other features like text selection, search, annotations, etc. will be limited to what you can do with images.

### Using PDF.js

[PDF.js](https://mozilla.github.io/pdf.js/) is an open-source project developed by Mozilla built using HTML5 technologies. It allows you to render PDF documents directly in the browser. The limitation of this approach is that PDF.js is not developer friendly, the official default viewer is not easy to integrate into existing applications, and customizing it can be challenging. The official packa#ge provided is `pdfjs-dist/`, which only includes the core PDF rendering library without the viewer UI. The default viewer is built on the top of this core library and the whole UI code is not published as a separate package. It's the source of chaos in the ecosystem, but the bad news is that it's on purpose. They try to avoid people customizing the viewer too much to reduce maintenance burden.

### Buying a commercial solution

There are several commercial PDF viewer solutions available. You can see [commercial pdf viewers](/blog/3-ways-to-display-pdf-in-html#commercial-pdf-viewer).
