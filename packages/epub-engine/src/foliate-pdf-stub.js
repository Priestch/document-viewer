// Stub for foliate-js's PDF backend (foliate-js/pdf.js).
//
// Consumers bundling @document-kits/epub-engine should alias
//   foliate-js/pdf.js → @document-kits/epub-engine/foliate-pdf-stub.js
// in their bundler config. Why: foliate's `makeBook` dynamically imports
// ./pdf.js for PDF inputs, and bundlers eagerly include dynamic imports in
// the graph — foliate's pdf.js has top-level await (breaks es2020 build
// targets) and pulls in a ~26k-line vendored pdfjs-dist. We never route
// PDFs through foliate (that's @document-kits/viewer's PdfEngine), so the
// stub replaces it with a loud failure.

export function makePDF() {
  throw new Error(
    'foliate-js PDF backend is stubbed out: open PDFs through the registered "pdf" engine instead'
  );
}
