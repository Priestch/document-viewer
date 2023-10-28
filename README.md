# PDF Viewer

An out-of-the-box PDF viewer based on PDF.js.

# Getting Started

```bash
npm create @document-kits/viewer@latest my-app

cd my-app

npm install
npm run dev
```

# Why

> [Using pdfjs in a web application](https://github.com/mozilla/pdf.js#using-pdfjs-in-a-web-application)
>
> To use PDF.js in a web application you can choose to use a pre-built version of the library or to build it from source.
> We supply pre-built versions for usage with NPM and Bower under the pdfjs-dist name.
> For more information and examples please refer to the wiki page on this subject.

The pre-built version can be easily integrated with iframe. But iframe can not be extended easily like normal library or
component, and it suffers some other issues.

I learn a lot from the pdf.js project. This project is somehow giving back to the community. I will try to
make it easier to integrate PDF viewer to your project.

# Docs

See https://priestch.github.io/document-viewer/

# Planed Todos

- [x] Display single PDF document
- [x] Cli starter
- [x] Docs
- [x] Display multiple documents
