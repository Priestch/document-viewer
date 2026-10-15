// Lazy PDF-engine chunk: importing this module pulls @document-kits/viewer
// (the pdf.js display layer + app shell, ~1MB minified) AND its CSS only
// when the "pdf" format is first opened — the page never pays for formats
// it does not use. Vite code-splits the dynamic import and loads the
// chunk's CSS with it.

import "@document-kits/viewer/viewer.css";
import { registerPdfEngine } from "@document-kits/viewer";

export const register = () => registerPdfEngine({ resourcePath: "./document-viewer" });
