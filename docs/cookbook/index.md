---
title: Cookbook
description: The missing cookbook for pdf.js.
head:
  - - link
    - rel: canonical
      href: https://priestch.github.io/document-viewer/docs/cookbook
---

# The Missing Cookbook for pdf.js

[[toc]]

## How to disable text selection?

You can set [`textLayerMode`](/learned-knowledge/#textlayermode) option to 0 to disable text layer totally.

## How to setup `Range Request` only download necessary data?

The `Range Request` only works if you use the default pdf.js viewer. if not, you have to implement all by yourself to
support `Range Request`. Even if you use the default viewer, the server must also be configured to
support [Range Request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) correctly.

For those who already use the default viewer and still suffer this issue, go through the checklist to ensure your server was configured correctly:

- Make sure you didn't set the `disableRange` option
- Make sure the first get request that downloads the pdf return 200 or 206.
- Make sure the first get request has the right `Content-Length`, `Accept-Ranges` and `Content-Encoding` header
  - The `Content-Length` should be larger then `2 * rangeChunkSize`, the default [rangeChunkSize](https://github.com/mozilla/pdf.js/blob/f6b356eff753358bf3263d174dc0cf4852800edd/src/display/api.js#L76C7-L76C31) is 65536
  - The `Accept-Ranges` should be `bytes` and the server must really support it
  - The `Content-Encoding` should be `identity` if present

If you ensure all these were configured correctly, then you can debug the [code block](https://github.com/mozilla/pdf.js/blob/f6b356eff753358bf3263d174dc0cf4852800edd/src/display/fetch_stream.js#L130-L168) step by step to find out what's the real issue.

I posted a similar comment in [discussion](https://github.com/mozilla/pdf.js/discussions/18524#discussioncomment-10202877).
