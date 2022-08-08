/* Copyright 2016 Mozilla Foundation
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

if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME")) {
  var defaultUrl; // eslint-disable-line no-var

  (function rewriteUrlClosure() {
    // Run this code outside DOMContentLoaded to make sure that the URL
    // is rewritten as soon as possible.
    const queryString = document.location.search.slice(1);
    const m = /(^|&)file=([^&]*)/.exec(queryString);
    defaultUrl = m ? decodeURIComponent(m[2]) : "";

    // Example: chrome-extension://.../http://example.com/file.pdf
    const humanReadableUrl = "/" + defaultUrl + location.hash;
    history.replaceState(history.state, "", humanReadableUrl);
    if (top === window) {
      // eslint-disable-next-line no-undef
      chrome.runtime.sendMessage("showPageAction");
    }
  })();
}

let bindPrintServiceFactory;
let bindExternalService;

if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
  bindExternalService = require("./firefoxcom.js").bindExternalService;
  bindPrintServiceFactory = require("./firefox_print_service.js").bindPrintServiceFactory;
}
if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("GENERIC")) {
  bindExternalService = require("./genericcom.js").bindExternalService;
}
if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME")) {
  bindExternalService = require("./chromecom.js").bindExternalService;
}
if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME || GENERIC")) {
  bindPrintServiceFactory = require("./pdf_print_service.js").bindPrintServiceFactory;
}
// Block the "load" event until all pages are loaded, to ensure that printing
// works in Firefox; see https://bugzilla.mozilla.org/show_bug.cgi?id=1618553
if (document.blockUnblockOnload) {
  document.blockUnblockOnload(true);
}

export { bindExternalService, bindPrintServiceFactory };
