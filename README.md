# PDF Viewer

An out-of-the-box PDF viewer based on PDF.js.

# How to use
```javascript
import { createViewerApp } from "@document-kits/viewer";
import doc from "@document-kits/viewer/compressed.tracemonkey-pldi-09.pdf?url"
import "@document-kits/viewer/viewer.css";

const appOptions = {
  doc,
  resourcePath: "document-viewer"
};

createViewerApp({el: document.getElementById("app"), appOptions: appOptions });
```

# Why

> [Using pdfjs in a web application](https://github.com/mozilla/pdf.js#using-pdfjs-in-a-web-application)
>
> To use PDF.js in a web application you can choose to use a pre-built version of the library or to build it from source.
> We supply pre-built versions for usage with NPM and Bower under the pdfjs-dist name.
> For more information and examples please refer to the wiki page on this subject.

As a frontend programmer, I can not integrate a PDF viewer to display documents easily. If you want to use PDF.js, you
don't have many choices.

The pre-built version can be easily integrated with iframe. But iframe can not be extended easily like normal library or
component, and it suffers some other issues. Or you can try to build a PDF viewer from scratch based on pdfjs-dist.
Haha, I don't think the manager will give much time for you developers, they always want the feature tomorrow. If you
have plenty time to build from scratch, be cautions, or the final viewer may suffer a lot of performance issues.

# Planed Todos
- [x] Display single PDF document
- [ ] Cli starter
- [ ] Docs
- [ ] Display multiple documents