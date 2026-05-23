import { createViewerApp, AnnotationElement } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

const CUSTOM_STAMP_TYPE = "custom-stamp";

class CustomStampElement extends AnnotationElement {
  constructor(parameters) {
    super(parameters, { isRenderable: true, ignoreBorder: true });
  }

  render() {
    this.container.classList.add("stampAnnotation");
    this.container.style.backgroundColor = this.data.color || "rgba(255, 235, 59, 0.4)";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.container.style.fontSize = "9px";
    this.container.style.fontWeight = "bold";
    this.container.style.color = "#333";
    this.container.textContent = this.data.label || "PLUGIN";
    return this.container;
  }
}

const testPlugin = {
  name: "test-annotations",

  annotationTypes: {
    [CUSTOM_STAMP_TYPE]: CustomStampElement,
  },

  getAnnotations(pageIndex) {
    return Promise.resolve([
      {
        annotationType: CUSTOM_STAMP_TYPE,
        id: `plugin-stamp-${pageIndex}-0`,
        rect: [50, 700, 200, 740],
        label: `Plugin Stamp`,
        color: "rgba(76, 175, 80, 0.3)",
        borderStyle: { width: 0 },
      },
      {
        annotationType: CUSTOM_STAMP_TYPE,
        id: `plugin-stamp-${pageIndex}-1`,
        rect: [250, 650, 400, 680],
        label: `Page ${pageIndex + 1}`,
        color: "rgba(33, 150, 243, 0.3)",
        borderStyle: { width: 0 },
      },
    ]);
  },

  onInit(app) {
    console.log("[test-annotations] onInit", app);
  },

  onDocumentLoad(app) {
    console.log("[test-annotations] onDocumentLoad", app);
  },

  onDestroy(app) {
    console.log("[test-annotations] onDestroy", app);
  },
};

let src = "./document-viewer/web/compressed.tracemonkey-pldi-09.pdf";

const appOptions = {
  src,
  resourcePath: "document-viewer",
  disableCORSCheck: true,
  disableAutoSetTitle: true,
  plugins: [testPlugin],
};

function injectApp(el) {
  return createViewerApp({ parent: el, ...appOptions });
}

export { injectApp };
