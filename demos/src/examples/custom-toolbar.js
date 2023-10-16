import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

let src = "./document-viewer/web/compressed.tracemonkey-pldi-09.pdf";
const appOptions = {
  src,
  resourcePath: "document-viewer",
  disableCORSCheck: true,
  disableAutoSetTitle: true,
};

function injectApp(el) {
  console.log("injectApp", el);
  return createViewerApp({ parent: el, ...appOptions });
}

export { injectApp };
