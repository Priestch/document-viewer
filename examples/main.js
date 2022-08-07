import { createViewerApp } from "document-viewer";
import doc from "document-viewer/compressed.tracemonkey-pldi-09.pdf?url"
import "document-viewer/viewer.css";
import "./style.css"

const appOptions = {
  doc,
  resourcePath: "document-viewer"
};

createViewerApp({el: document.getElementById("app"), appOptions: appOptions });
