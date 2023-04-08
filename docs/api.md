# API

## createViewerApp

Create a viewer app.

- [options](#options)

## Options

### properties

| name             | type          | description                              |
| ---------------- | ------------- | ---------------------------------------- |
| parent           | `HTMLElement` | Element the PDF viewer render to.        |
| src              | `string`      | The src of the PDF document.             |
| resourcePath     | `string`      | The resource path of pdf.js.             |
| disableCORSCheck | `boolean`     | Disable CORS check of pdf.js `optional`  |
| appOptions       | `Object`      | Default app options of pdf.js `optional` |
