/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DefaultExternalServices } from "./default_external_services.js";
import { BasePreferences } from "../pdf.js/web/preferences.js";
import { DownloadManager } from "../pdf.js/web/download_manager.js";
import { GenericL10n } from "../pdf.js/web/genericl10n.js";
import { GenericScripting } from "../pdf.js/web/generic_scripting.js";

if (typeof PDFJSDev !== "undefined" && !PDFJSDev.test("GENERIC")) {
  throw new Error('Module "pdfjs-web/genericcom" shall not be used outside GENERIC build.');
}

const GenericCom = {};

class GenericPreferences extends BasePreferences {
  async _writeToStorage(prefObj) {
    localStorage.setItem("pdfjs.preferences", JSON.stringify(prefObj));
  }

  async _readFromStorage(prefObj) {
    return JSON.parse(localStorage.getItem("pdfjs.preferences"));
  }
}

class GenericExternalServices extends DefaultExternalServices {
  static createDownloadManager() {
    return new DownloadManager();
  }

  static createPreferences() {
    return new GenericPreferences();
  }

  static createL10n(lang) {
    return new GenericL10n(lang);
  }

  static createScripting({ sandboxBundleSrc }) {
    return new GenericScripting(sandboxBundleSrc);
  }
}

function bindExternalService(app) {
  app.externalServices = GenericExternalServices;
}

export { bindExternalService };
