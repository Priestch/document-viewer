import { createViewerApp } from "@document-kits/viewer";
import doc from "@document-kits/viewer/compressed.tracemonkey-pldi-09.pdf?url";
import "@document-kits/viewer/viewer.css";
import "./style.css";

const appOptions = {
  doc,
  resourcePath: "document-viewer",
};

createViewerApp({ el: document.getElementById("app"), appOptions: appOptions });
