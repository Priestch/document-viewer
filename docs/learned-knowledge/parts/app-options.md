There are dozens of times options in PDF.js, and they all belong to four kinds for now. You may wonder why there are so many options, and what they mean at the first time. This document will help you to understand them.

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
- `sandboxBundleSrc`

#### defaultUrl

- Type `URL | string | Uint8Array`

The url of the PDF file. If you got [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) issue when loading a PDF file from a different origin, see details at [origin match error](../pitfalls#origin-not-match) section in common pitfalls page .

#### locale

- Type `string`
- Default `en-US`

The locale of the viewer, it easy to switch a different locale by setting this option. See all supported locales in folder [l10n](https://github.com/mozilla/pdf.js/tree/master/l10n).
