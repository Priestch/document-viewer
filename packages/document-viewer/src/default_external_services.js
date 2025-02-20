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

  static async createL10n() {
    throw new Error("Not implemented: createL10n");
  }

  static createScripting() {
    throw new Error("Not implemented: createScripting");
  }

  static updateEditorStates(data) {
    throw new Error("Not implemented: updateEditorStates");
  }

  static getNimbusExperimentData() {
    return shadow(this, "getNimbusExperimentData", Promise.resolve(null));
  }
}

export { DefaultExternalServices };
