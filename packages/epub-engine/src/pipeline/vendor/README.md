# Vendored foliate-js code

Files in this directory are vendored from
[foliate-js](https://github.com/johnfactotum/foliate-js) by John Factotum
(MIT license, see `LICENSE-FOLIATE`).

| File         | Upstream version   | Origin                                                                          |
| ------------ | ------------------ | ------------------------------------------------------------------------------- |
| `epubcfi.js` | foliate-js `1.0.1` | [`epubcfi.js`](https://github.com/johnfactotum/foliate-js/blob/main/epubcfi.js) |

## Local modifications

### `epubcfi.js`

- Header comment added (provenance + modification note).
- `NodeFilter.FILTER_REJECT` / `NodeFilter.FILTER_SKIP` references in
  `getChildNodes()` replaced with the literal constants `2` / `3`
  (`NodeFilter.FILTER_ACCEPT` is `1`). `NodeFilter` is a browser global that
  does not exist in workers/Node without a DOM polyfill; the numeric values
  are stable per the DOM spec, so the literals keep the module importable in
  non-DOM environments without any behavior change.

The `foliate-js` npm dependency was removed once the engine moved onto the
own pipeline (M7); the CFI module stays vendored because the pipeline consumes
it as a self-contained, framework-free string library and we need the
worker-safe (global-free) variant above. When syncing from a newer foliate-js,
re-sync this file from it and re-apply the modification noted above.
