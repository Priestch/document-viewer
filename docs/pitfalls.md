# Common Pitfalls When Integrate PDF.js

### API version mismatch the Worker version

> The API version "a.b.c" does not match the Worker version "x.y.z"

[Reason for the Error](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#reasons-for-the-error-the-api-version-abc-does-not-match-the-worker-version-xyz)

<details>
    <summary>Why such error?</summary>
<blockquote>
PDF.js use a web worker architecture for better rendering performance.

A typical web application has only one bundle result, but PDF.js has two bundles, one for the viewer, one for the worker.

The versions of the two bundles must match to work properly. If the versions mismatch, it may work sometimes, but
when it not, I think it's hard to figure such issues.

Although the explicit error may annoy developer at first, it does save your time from debugging such issues.

</blockquote>
</details>

### Origin not match

> file origin does not match viewer's

[Reason for the Error](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#can-i-load-a-pdf-from-another-server-cross-domain-request)

You can try to use the methods mentioned in the official FAQ to resolve the issue, or you can try the [`@document-kits/viewer`](https://priestch.github.io/document-viewer), it has
a `disableCORSCheck` option to disable the CORS check for quick start. Be careful, you should not enable this option in production if you don't know what it means.
