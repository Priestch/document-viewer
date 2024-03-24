import { PDFViewerApplication } from "./app.js";
import { injectLocaleResource } from "./utils";
import getViewerTemplate from "./viewer_template";
import { ApplicationOptions } from "./application_options";

let activeApp;
let manager = null;

function getViewerConfiguration(el) {
  return {
    appContainer: el,
    mainContainer: el.querySelector("[data-dom-id='viewerContainer']"),
    viewerContainer: el.querySelector("[data-dom-id='viewer']"),
    toolbar: {
      container: el.querySelector("[data-dom-id='toolbarViewer']"),
      numPages: el.querySelector("[data-dom-id='numPages']"),
      pageNumber: el.querySelector("[data-dom-id='pageNumber']"),
      scaleSelect: el.querySelector("[data-dom-id='scaleSelect']"),
      customScaleOption: el.querySelector("[data-dom-id='customScaleOption']"),
      previous: el.querySelector("[data-dom-id='previous']"),
      next: el.querySelector("[data-dom-id='next']"),
      zoomIn: el.querySelector("[data-dom-id='zoomIn']"),
      zoomOut: el.querySelector("[data-dom-id='zoomOut']"),
      viewFind: el.querySelector("[data-dom-id='viewFind']"),
      openFile:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? el.querySelector("[data-dom-id='openFile']")
          : null,
      print: el.querySelector("[data-dom-id='print']"),
      editorFreeTextButton: el.querySelector("[data-dom-id='editorFreeText']"),
      editorFreeTextParamsToolbar: el.querySelector("[data-dom-id='editorFreeTextParamsToolbar']"),
      editorInkButton: el.querySelector("[data-dom-id='editorInk']"),
      editorInkParamsToolbar: el.querySelector("[data-dom-id='editorInkParamsToolbar']"),
      editorStampButton: el.querySelector("[data-dom-id='editorStamp']"),
      editorStampParamsToolbar: el.querySelector("[data-dom-id='editorStampParamsToolbar']"),
      download: el.querySelector("[data-dom-id='download']"),
    },
    secondaryToolbar: {
      toolbar: el.querySelector("[data-dom-id='secondaryToolbar']"),
      toggleButton: el.querySelector("[data-dom-id='secondaryToolbarToggle']"),
      presentationModeButton: el.querySelector("[data-dom-id='presentationMode']"),
      openFileButton:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? el.querySelector("[data-dom-id='secondaryOpenFile']")
          : null,
      printButton: el.querySelector("[data-dom-id='secondaryPrint']"),
      downloadButton: el.querySelector("[data-dom-id='secondaryDownload']"),
      viewBookmarkButton: el.querySelector("[data-dom-id='viewBookmark']"),
      firstPageButton: el.querySelector("[data-dom-id='firstPage']"),
      lastPageButton: el.querySelector("[data-dom-id='lastPage']"),
      pageRotateCwButton: el.querySelector("[data-dom-id='pageRotateCw']"),
      pageRotateCcwButton: el.querySelector("[data-dom-id='pageRotateCcw']"),
      cursorSelectToolButton: el.querySelector("[data-dom-id='cursorSelectTool']"),
      cursorHandToolButton: el.querySelector("[data-dom-id='cursorHandTool']"),
      scrollPageButton: el.querySelector("[data-dom-id='scrollPage']"),
      scrollVerticalButton: el.querySelector("[data-dom-id='scrollVertical']"),
      scrollHorizontalButton: el.querySelector("[data-dom-id='scrollHorizontal']"),
      scrollWrappedButton: el.querySelector("[data-dom-id='scrollWrapped']"),
      spreadNoneButton: el.querySelector("[data-dom-id='spreadNone']"),
      spreadOddButton: el.querySelector("[data-dom-id='spreadOdd']"),
      spreadEvenButton: el.querySelector("[data-dom-id='spreadEven']"),
      documentPropertiesButton: el.querySelector("[data-dom-id='documentProperties']"),
    },
    sidebar: {
      // Divs (and sidebar button)
      outerContainer: el.querySelector("[data-dom-id='outerContainer']"),
      sidebarContainer: el.querySelector("[data-dom-id='sidebarContainer']"),
      toggleButton: el.querySelector("[data-dom-id='sidebarToggle']"),
      resizer: el.querySelector("[data-dom-id='sidebarResizer']"),
      // Buttons
      thumbnailButton: el.querySelector("[data-dom-id='viewThumbnail']"),
      outlineButton: el.querySelector("[data-dom-id='viewOutline']"),
      attachmentsButton: el.querySelector("[data-dom-id='viewAttachments']"),
      layersButton: el.querySelector("[data-dom-id='viewLayers']"),
      // Views
      thumbnailView: el.querySelector("[data-dom-id='thumbnailView']"),
      outlineView: el.querySelector("[data-dom-id='outlineView']"),
      attachmentsView: el.querySelector("[data-dom-id='attachmentsView']"),
      layersView: el.querySelector("[data-dom-id='layersView']"),
      // View-specific options
      outlineOptionsContainer: el.querySelector("[data-dom-id='outlineOptionsContainer']"),
      currentOutlineItemButton: el.querySelector("[data-dom-id='currentOutlineItem']"),
    },
    findBar: {
      bar: el.querySelector("[data-dom-id='findbar']"),
      toggleButton: el.querySelector("[data-dom-id='viewFind']"),
      findField: el.querySelector("[data-dom-id='findInput']"),
      highlightAllCheckbox: el.querySelector("[data-dom-id='findHighlightAll']"),
      caseSensitiveCheckbox: el.querySelector("[data-dom-id='findMatchCase']"),
      matchDiacriticsCheckbox: el.querySelector("[data-dom-id='findMatchDiacritics']"),
      entireWordCheckbox: el.querySelector("[data-dom-id='findEntireWord']"),
      findMsg: el.querySelector("[data-dom-id='findMsg']"),
      findResultsCount: el.querySelector("[data-dom-id='findResultsCount']"),
      findPreviousButton: el.querySelector("[data-dom-id='findPrevious']"),
      findNextButton: el.querySelector("[data-dom-id='findNext']"),
    },
    passwordOverlay: {
      dialog: el.querySelector("[data-dom-id='passwordDialog']"),
      label: el.querySelector("[data-dom-id='passwordText']"),
      input: el.querySelector("[data-dom-id='password']"),
      submitButton: el.querySelector("[data-dom-id='passwordSubmit']"),
      cancelButton: el.querySelector("[data-dom-id='passwordCancel']"),
    },
    documentProperties: {
      dialog: el.querySelector("[data-dom-id='documentPropertiesDialog']"),
      closeButton: el.querySelector("[data-dom-id='documentPropertiesClose']"),
      fields: {
        fileName: el.querySelector("[data-dom-id='fileNameField']"),
        fileSize: el.querySelector("[data-dom-id='fileSizeField']"),
        title: el.querySelector("[data-dom-id='titleField']"),
        author: el.querySelector("[data-dom-id='authorField']"),
        subject: el.querySelector("[data-dom-id='subjectField']"),
        keywords: el.querySelector("[data-dom-id='keywordsField']"),
        creationDate: el.querySelector("[data-dom-id='creationDateField']"),
        modificationDate: el.querySelector("[data-dom-id='modificationDateField']"),
        creator: el.querySelector("[data-dom-id='creatorField']"),
        producer: el.querySelector("[data-dom-id='producerField']"),
        version: el.querySelector("[data-dom-id='versionField']"),
        pageCount: el.querySelector("[data-dom-id='pageCountField']"),
        pageSize: el.querySelector("[data-dom-id='pageSizeField']"),
        linearized: el.querySelector("[data-dom-id='linearizedField']"),
      },
    },
    altTextDialog: {
      dialog: el.querySelector("[data-dom-id='altTextDialog']"),
      optionDescription: el.querySelector("[data-dom-id='descriptionButton']"),
      optionDecorative: el.querySelector("[data-dom-id='decorativeButton']"),
      textarea: el.querySelector("[data-dom-id='descriptionTextarea']"),
      cancelButton: el.querySelector("[data-dom-id='altTextCancel']"),
      saveButton: el.querySelector("[data-dom-id='altTextSave']"),
    },
    annotationEditorParams: {
      editorFreeTextFontSize: el.querySelector("[data-dom-id='editorFreeTextFontSize']"),
      editorFreeTextColor: el.querySelector("[data-dom-id='editorFreeTextColor']"),
      editorInkColor: el.querySelector("[data-dom-id='editorInkColor']"),
      editorInkThickness: el.querySelector("[data-dom-id='editorInkThickness']"),
      editorInkOpacity: el.querySelector("[data-dom-id='editorInkOpacity']"),
      editorStampAddImage: el.querySelector("[data-dom-id='editorStampAddImage']"),
    },
    printContainer: el.querySelector("[data-dom-id='printContainer']"),
    openFileInput:
      typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
        ? el.querySelector("[data-dom-id='fileInput']")
        : null,
    debuggerScriptPath: "../pdf.js/web/debugger.js",
  };
}

/**
 * @docs
 * @ignore
 *
 * @see https://github.com/mozilla/pdf.js/blob/master/web/app_options.js
 * @typedef {object} ApplicationOptions
 */

/**
 * @docs
 *
 * @typedef Options
 * @property {HTMLElement} parent - Element the PDF viewer will be render to.
 * @property {string | TypedArray | ArrayBuffer} src - The source of the PDF document.
 * @property {string} resourcePath - The resource path of pdf.js.
 * @property {boolean} [disableCORSCheck=false] - Disable CORS check of pdf.js.
 * @property {boolean} [disableAutoSetTitle=false] - Disable auto-set title of document caused by pdf.js.
 * @property {ApplicationOptions} [appOptions={}] - Default app options of pdf.js.
 */

/**
 * Create a viewer app.
 * @docs
 * @param {Options} options
 *
 * @returns {PDFViewerApplication}
 */
function createViewerApp(options) {
  const {
    parent = null,
    resourcePath,
    src,
    disableCORSCheck = false,
    disableAutoSetTitle = false,
    appOptions = {},
  } = options;
  const workerSrc = `${resourcePath}/build/pdf.worker.js`;

  const viewerOptions = new ApplicationOptions();
  Object.keys(appOptions).forEach(function (key) {
    viewerOptions.set(key, appOptions[key]);
  });
  viewerOptions.set("workerSrc", workerSrc);
  viewerOptions.set("sandboxBundleSrc", `${resourcePath}/build/pdf.sandbox.js`);
  viewerOptions.set("defaultUrl", src);
  viewerOptions.set("disableCORSCheck", disableCORSCheck);
  viewerOptions.set("disableAutoSetTitle", disableAutoSetTitle);

  // set disablePreferences to enable custom appOptions work
  viewerOptions.set("disablePreferences", true);

  const localeUrl = `${resourcePath}/web/locale/locale.properties`;
  injectLocaleResource(localeUrl);

  const app = new PDFViewerApplication(viewerOptions);

  activeApp = app;

  if (parent) {
    const template = getViewerTemplate();
    parent.appendChild(template);

    const config = getViewerConfiguration(parent);
    app.run(config);
  }

  return app;
}

/**
 * @param {string[]} events
 */
export function initManager(events) {
  if (manager) {
    return manager;
  }

  manager = {
    /**
     * @param {Options} options
     *
     * @returns {PDFViewerApplication}
     */
    createApp(options) {
      const app = createViewerApp(options);
      this._register(app);
      return app;
    },
    _register(app) {
      let rAF = null;
      const debounceHandler = function (_app) {
        if (rAF) {
          return;
        }
        // schedule an invocation of scroll for next animation frame.
        rAF = window.requestAnimationFrame(() => {
          rAF = null;
          manager.activateApp(_app);
        });
      };

      app.initializedPromise.then(() => {
        events.forEach((name) => {
          app.appConfig.sidebar.outerContainer.addEventListener(name, () => {
            debounceHandler(app);
          });
        });
      });
    },
    activateApp(app) {
      if (activeApp === app) {
        return;
      }
      if (activeApp) {
        window.removeEventListener("keydown", activeApp.helper.webViewerKeyDown);
      }
      activeApp = app;
      window.addEventListener("keydown", activeApp.helper.webViewerKeyDown);
    },
  };

  return manager;
}

/**
 * Get current active viewer app.
 * @returns {PDFViewerApplication}
 */
function getActiveApp() {
  return activeApp;
}

function createApp(options) {
  const appManager = initManager(["mousemove", "click", "mousedown", "touchstart"]);

  return appManager.createApp(options);
}

export { getActiveApp, createApp as createViewerApp, getViewerConfiguration };
