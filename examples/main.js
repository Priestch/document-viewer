import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";
import "./style.css";

const appOptions = {
  src: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  resourcePath: "document-viewer",
  disableCORSCheck: true,
};

createViewerApp({ el: document.getElementById("app"), appOptions: appOptions });
