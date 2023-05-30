import { shadow } from "pdfjs-lib";

class DefaultExternalServices {
  constructor() {
    throw new Error("Cannot initialize DefaultExternalServices.");
  }

  static updateFindControlState(data) {}

  static updateFindMatchesCount(data) {}

  static initPassiveLoading(callbacks) {}

  static reportTelemetry(data) {}

  static createDownloadManager() {
    throw new Error("Not implemented: createDownloadManager");
  }

  static createPreferences() {
    throw new Error("Not implemented: createPreferences");
  }

  static createL10n(options) {
    throw new Error("Not implemented: createL10n");
  }

  static createScripting(options) {
    throw new Error("Not implemented: createScripting");
  }

  static get supportsPinchToZoom() {
    return shadow(this, "supportsPinchToZoom", true);
  }

  static get supportsIntegratedFind() {
    return shadow(this, "supportsIntegratedFind", false);
  }

  static get supportsDocumentFonts() {
    return shadow(this, "supportsDocumentFonts", true);
  }

  static get supportedMouseWheelZoomModifierKeys() {
    return shadow(this, "supportedMouseWheelZoomModifierKeys", {
      ctrlKey: true,
      metaKey: true,
    });
  }

  static get isInAutomation() {
    return shadow(this, "isInAutomation", false);
  }

  static updateEditorStates(data) {
    throw new Error("Not implemented: updateEditorStates");
  }

  static get canvasMaxAreaInBytes() {
    return shadow(this, "canvasMaxAreaInBytes", -1);
  }

  static getNimbusExperimentData() {
    return shadow(this, "getNimbusExperimentData", Promise.resolve(null));
  }
}

export { DefaultExternalServices };
