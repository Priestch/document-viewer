import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

let src = "./document-viewer/web/compressed.tracemonkey-pldi-09.pdf";
const appOptions = {
  src,
  resourcePath: "document-viewer",
  disableCORSCheck: true,
  disableAutoSetTitle: true,
};

function injectApps() {
  createViewerApp({ parent: document.getElementById("app1"), ...appOptions });
  createViewerApp({ parent: document.getElementById("app2"), ...appOptions });
}

export { injectApps };
