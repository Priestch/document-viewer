---
title: PDF Viewer API
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/api.html
---

# API

## createViewerApp

```typescript
function createViewerApp(options: Options): PDFViewerApplication {
  // ...
}
```

Create a viewer app.

- [Options](#Options)

## Options

#### properties

| name                                                                                      | type                            | description                                          | defaultValue |
| ----------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- | ------------ |
| parent                                                                                    | `HTMLElement`                   | Element the PDF viewer will be render to.            | -            |
| src                                                                                       | `string,TypedArray,ArrayBuffer` | The source of the PDF document.                      | -            |
| resourcePath                                                                              | `string`                        | The resource path of pdf.js.                         | -            |
| disableCORSCheck `optional`                                                               | `boolean`                       | Disable CORS check of pdf.js.                        | false        |
| disableAutoSetTitle `optional`                                                            | `boolean`                       | Disable auto-set title of document caused by pdf.js. | false        |
| [appOptions](https://github.com/mozilla/pdf.js/blob/master/web/app_options.js) `optional` | `AppOptions`                    | Default app options of pdf.js.                       | {}           |
