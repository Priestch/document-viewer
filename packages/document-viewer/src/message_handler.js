// Standalone re-export of pdf.js' MessageHandler as its own small bundle
// (bin/gulpfile.template.js → dist/generic/build/message-handler.mjs).
//
// Consumers outside this package's webpack pipeline (today: the epub-engine
// worker RPC) must not import the pdf.js submodule sources directly: the
// sources rely on build-time PDFJSDev defines and on the pdfjs-lib alias,
// both of which only exist inside this package's gulp/webpack builds — the
// raw-source-consumption failure mode pdf_engine.js's header documents. The
// subpath export gives them the compiled, macro-free module instead.

export { MessageHandler } from "../pdf.js/src/shared/message_handler.js";
