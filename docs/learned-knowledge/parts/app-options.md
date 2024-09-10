There are dozens of options in PDF.js, and they all belong to four kinds for now. You may wonder why there are so many options, and what they mean at the first time. This document will help you to understand them.

Let's crack on them one by one!

### [Option Kinds](https://github.com/mozilla/pdf.js/blob/34506f8874ce86ea21b9db54d0552947208bf4bb/web/app_options.js#L43)

- VIEWER
- API
- WORKER
- PREFERENCE

### Important options

- `defaultUrl`
- `locale`
- `workerSrc`

#### [defaultUrl](https://github.com/mozilla/pdf.js/blob/66ed4b9e255168f230dae394a202168b47da681f/web/app_options.js#L453-L460)

- Type `URL | string | Uint8Array`

The url of the PDF file. If you got [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) issue when loading a PDF file from a different origin, see details at [origin match error](/pitfalls#origin-not-match) section in common pitfalls page .

#### locale

- Type `string`
- Default `en-US`

The locale of the viewer, it easy to switch a different locale by setting this option. See all supported locales in folder [l10n](https://github.com/mozilla/pdf.js/tree/master/l10n).

#### [workerSrc](https://github.com/mozilla/pdf.js/blob/66ed4b9e255168f230dae394a202168b47da681f/web/app_options.js#L440-L450)

The url of the PDF.js web worker bundle.

The PDF.js project use web worker to speed up the rendering process, it means there must be some code creating and initializing the web worker using the `workerSrc`. It configured with default value, but it always depends on how you deploy it. Make sure you can download the worker bundle from the `workerSrc` url.

![Worker Request](/assets/worker-request.png)

### Other options

#### [textLayerMode](https://github.com/mozilla/pdf.js/blob/66ed4b9e255168f230dae394a202168b47da681f/web/app_options.js#L317-L321)

- Type `integer`
- Default `1`
- Values `0`, `1`, `2`
- Source [`web/ui_utils/TextLayerMode`](https://github.com/mozilla/pdf.js/blob/66ed4b9e255168f230dae394a202168b47da681f/web/ui_utils.js#L49-L53)

The `textLayerMode` of text layer.
