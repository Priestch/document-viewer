import { createViewerApp } from "document-viewer";
import defaultUrl from "document-viewer/compressed.tracemonkey-pldi-09.pdf?url"
import "document-viewer/viewer.css";
import "./style.css"

const appOptions = {
  defaultUrl,
  resourcePath: "document-viewer"
};

createViewerApp({el: document.getElementById("app"), appOptions: appOptions });
