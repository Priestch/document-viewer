import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

let src1 = "./lc_pdf_overview_format.pdf";
let src2 = "./recognizing_malformed_pdf_f.pdf";

const options1 = {
  src: src1,
  resourcePath: "document-viewer",
  disableCORSCheck: true,
  disableAutoSetTitle: true,
};

const options2 = {
  src: src2,
  resourcePath: "document-viewer",
  disableCORSCheck: true,
  disableAutoSetTitle: true,
};

function injectApps() {
  createViewerApp({ parent: document.getElementById("app1"), ...options1 });
  createViewerApp({ parent: document.getElementById("app2"), ...options2 });
}

export { injectApps };
