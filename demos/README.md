# demos

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Compile and Minify for Production

```sh
pnpm build
```

## PDF-first reader shell

From the repository root, run `pnpm viewer:build`, `pnpm pdfjs:smoke`, then
`pnpm demos:dev`. Open the **PDF Reader** home route (`/#/`); it loads the bundled
14-page sample. The native **More → Open** action also accepts a local PDF.
Use **Theme → System / Light / Dark** to compare chrome themes, and resize the
viewer to exercise the compact two-row toolbar and collapsible **Tools** panel.
Navigation, zoom, search, thumbnails/outline, print, download, and editing remain
connected to the original pdf.js controls. The footer shows the current page
index / total pages and actual zoom, including after scrolling or keyboard navigation;
its bar represents page position, not a claim that pages have been read.

### Design and extension boundary

The information architecture draws on [PdfJsKit's README](https://github.com/GleamTech/PdfJsKit)
and [API docs](https://github.com/GleamTech/PdfJsKit/blob/main/APIDocs.md):
separate navigation/zoom/actions, paired light/dark chrome, responsive controls,
and an on-demand navigation panel. No PdfJsKit code, assets, themes, dependency,
or iframe/runtime-override approach is used. Document Kits instead uses a slate/blue
palette, a document identity row, grouped native controls, and a quiet position footer.
The current pdf.js **Views Manager** is retained rather than rebuilding an older
thumbnail sidebar; its view selector exposes outline, attachments and layers when
available. Small viewers collapse annotation controls behind **Tools**, not into an
unimplemented replacement menu. Existing native commands and shortcuts are preserved.

`packages/document-viewer/src/reader_shell.js` owns presentation and accepts plain
`{ title, page, total, scale, message }` state. `app.js` is the PDF event adapter;
`viewer_template.js` decorates cloned native controls without changing their
`data-dom-id` wiring. `assets/reader_shell.css` contains scoped design tokens and
container queries, appended after the upstream-derived CSS by the existing build.
Theme selection is per viewer instance, defaults to the system, and does **not**
invert PDF pages or persist a new global preference. New chrome labels are currently
English; native controls continue to use pdf.js localization.
Hosts with their own toolbar can pass `readerShell: false` to `createViewerApp`
to retain the undecorated native template (as the Custom Toolbar example does).

This is a PDF-first presentation, not a new universal command API.
`pdf_engine.js` and engine-core are unchanged; the dual-engine demo remains independent.
Future EPUB/MOBI/FB2/CBZ adapters can reuse the chrome/tokens and supply their own
position semantics and capability-driven controls. They must not infer zoom,
typography, outline, or page counts from format names or rendering delivery.
No empty task panels or unsupported engine actions are advertised.

### Manual checks

- Jump to a page, scroll, zoom and choose page-fit; verify footer and native controls agree.
- Search for `trace`, visit a result, and toggle Views Manager / its view selector.
- At 390px and 640px viewer widths, check navigation, zoom, Tools, and More without
  horizontal page overflow; press Escape in Tools and check focus returns to its button.
- Switch all three themes (including OS dark mode); text, form fields and PDF page
  colors must remain unchanged.
- Open another file, inspect properties, download, and enter/exit presentation mode.
- Visit Custom Toolbar, Multiple PDF, Plugin Annotations and Dual Engine to check
  that native template consumers and engine-only rendering still work.
