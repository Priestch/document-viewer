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

| name                        | type                            | description                               | defaultValue |
| --------------------------- | ------------------------------- | ----------------------------------------- | ------------ |
| parent                      | `HTMLElement`                   | Element the PDF viewer will be render to. | -            |
| src                         | `string,TypedArray,ArrayBuffer` | The source of the PDF document.           | -            |
| resourcePath                | `string`                        | The resource path of pdf.js.              | -            |
| disableCORSCheck `optional` | `boolean`                       | Disable CORS check of pdf.js              | false        |
| appOptions `optional`       | `object`                        | Default app options of pdf.js             | {}           |
