import { PDFViewerApplication } from "./app.js";
import { AppOptions } from "./application_options.js";
import { injectLocaleResource } from "./utils";
import getViewerTemplate from "./viewer_template";
import { PluginManager, setActivePluginManager } from "./plugin_manager.js";

let activeApp;
let manager = null;

function getViewerConfiguration(el) {
  const q = (id) => el.querySelector(`[data-dom-id='${id}'], #${id}`);
  return {
    appContainer: el,
    principalContainer: q("mainContainer"),
    mainContainer: q("viewerContainer"),
    viewerContainer: q("viewer"),
    viewerAlert: q("viewer-alert"),
    toolbar: {
      container: q("toolbarContainer"),
      numPages: q("numPages"),
      pageNumber: q("pageNumber"),
      scaleSelect: q("scaleSelect"),
      customScaleOption: q("customScaleOption"),
      previous: q("previous"),
      next: q("next"),
      zoomIn: q("zoomInButton"),
      zoomOut: q("zoomOutButton"),
      print: q("printButton"),
      editorCommentButton: q("editorCommentButton"),
      editorCommentParamsToolbar: q("editorCommentParamsToolbar"),
      editorFreeTextButton: q("editorFreeTextButton"),
      editorFreeTextParamsToolbar: q("editorFreeTextParamsToolbar"),
      editorHighlightButton: q("editorHighlightButton"),
      editorHighlightParamsToolbar: q("editorHighlightParamsToolbar"),
      editorHighlightColorPicker: q("editorHighlightColorPicker"),
      editorInkButton: q("editorInkButton"),
      editorInkParamsToolbar: q("editorInkParamsToolbar"),
      editorStampButton: q("editorStampButton"),
      editorStampParamsToolbar: q("editorStampParamsToolbar"),
      editorSignatureButton: q("editorSignatureButton"),
      editorSignatureParamsToolbar: q("editorSignatureParamsToolbar"),
      download: q("downloadButton"),
    },
    secondaryToolbar: {
      toolbar: q("secondaryToolbar"),
      toggleButton: q("secondaryToolbarToggleButton"),
      presentationModeButton: q("presentationMode"),
      openFileButton:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? q("secondaryOpenFile")
          : null,
      printButton: q("secondaryPrint"),
      downloadButton: q("secondaryDownload"),
      viewBookmarkButton: q("viewBookmark"),
      firstPageButton: q("firstPage"),
      lastPageButton: q("lastPage"),
      pageRotateCwButton: q("pageRotateCw"),
      pageRotateCcwButton: q("pageRotateCcw"),
      cursorSelectToolButton: q("cursorSelectTool"),
      cursorHandToolButton: q("cursorHandTool"),
      scrollPageButton: q("scrollPage"),
      scrollVerticalButton: q("scrollVertical"),
      scrollHorizontalButton: q("scrollHorizontal"),
      scrollWrappedButton: q("scrollWrapped"),
      spreadNoneButton: q("spreadNone"),
      spreadOddButton: q("spreadOdd"),
      spreadEvenButton: q("spreadEven"),
      imageAltTextSettingsButton: q("imageAltTextSettings"),
      imageAltTextSettingsSeparator: q("imageAltTextSettingsSeparator"),
      documentPropertiesButton: q("documentProperties"),
    },
    viewsManager: {
      outerContainer: q("outerContainer"),
      toggleButton: q("viewsManagerToggleButton"),
      sidebarContainer: q("viewsManager"),
      resizer: q("viewsManagerResizer"),
      thumbnailButton: q("thumbnailsViewMenu"),
      outlineButton: q("outlinesViewMenu"),
      attachmentsButton: q("attachmentsViewMenu"),
      layersButton: q("layersViewMenu"),
      viewsManagerSelectorButton: q("viewsManagerSelectorButton"),
      viewsManagerSelectorOptions: q("viewsManagerSelectorOptions"),
      thumbnailsView: q("thumbnailsView"),
      outlinesView: q("outlinesView"),
      attachmentsView: q("attachmentsView"),
      layersView: q("layersView"),
      viewsManagerAddFile: {
        button: q("viewsManagerAddFileButton"),
        picker: q("viewsManagerAddFilePicker"),
      },
      viewsManagerCurrentOutlineButton: q("viewsManagerCurrentOutlineButton"),
      viewsManagerHeaderLabel: q("viewsManagerHeaderLabel"),
      viewsManagerStatus: q("viewsManagerStatus"),
      viewsManagerStatusBar: {
        viewsManagerStatusAction: q("viewsManagerStatusAction"),
        viewsManagerStatusActionDeselectButton: q("viewsManagerStatusActionDeselectButton"),
        viewsManagerStatusActionLabel: q("viewsManagerStatusActionLabel"),
      },
      viewsManagerUndoBar: {
        viewsManagerStatusUndo: q("viewsManagerStatusUndo"),
        viewsManagerStatusUndoLabel: q("viewsManagerStatusUndoLabel"),
        viewsManagerStatusUndoButton: q("viewsManagerStatusUndoButton"),
        viewsManagerStatusUndoCloseButton: q("viewsManagerStatusUndoCloseButton"),
      },
      viewsManagerWaitingBar: {
        container: q("viewsManagerStatusWaiting"),
        closeButton: q("viewsManagerStatusWaitingCloseButton"),
        label: q("viewsManagerStatusWaitingLabel"),
      },
      manageMenu: {
        button: q("viewsManagerStatusActionButton"),
        menu: q("viewsManagerStatusActionOptions"),
        copy: q("viewsManagerStatusActionCopy"),
        cut: q("viewsManagerStatusActionCut"),
        delete: q("viewsManagerStatusActionDelete"),
        exportSelected: q("viewsManagerStatusActionExport"),
      },
    },
    findBar: {
      bar: q("findbar"),
      toggleButton: q("viewFindButton"),
      findField: q("findInput"),
      highlightAllCheckbox: q("findHighlightAll"),
      caseSensitiveCheckbox: q("findMatchCase"),
      matchDiacriticsCheckbox: q("findMatchDiacritics"),
      entireWordCheckbox: q("findEntireWord"),
      findMsg: q("findMsg"),
      findResultsCount: q("findResultsCount"),
      findPreviousButton: q("findPreviousButton"),
      findNextButton: q("findNextButton"),
    },
    passwordOverlay: {
      dialog: q("passwordDialog"),
      label: q("passwordText"),
      input: q("password"),
      submitButton: q("passwordSubmit"),
      cancelButton: q("passwordCancel"),
    },
    documentProperties: {
      dialog: q("documentPropertiesDialog"),
      closeButton: q("documentPropertiesClose"),
      fields: {
        fileName: q("fileNameField"),
        fileSize: q("fileSizeField"),
        title: q("titleField"),
        author: q("authorField"),
        subject: q("subjectField"),
        keywords: q("keywordsField"),
        creationDate: q("creationDateField"),
        modificationDate: q("modificationDateField"),
        creator: q("creatorField"),
        producer: q("producerField"),
        version: q("versionField"),
        pageCount: q("pageCountField"),
        pageSize: q("pageSizeField"),
        linearized: q("linearizedField"),
      },
    },
    altTextDialog: {
      dialog: q("altTextDialog"),
      optionDescription: q("descriptionButton"),
      optionDecorative: q("decorativeButton"),
      textarea: q("descriptionTextarea"),
      cancelButton: q("altTextCancel"),
      saveButton: q("altTextSave"),
    },
    newAltTextDialog: {
      dialog: q("newAltTextDialog"),
      title: q("newAltTextTitle"),
      descriptionContainer: q("newAltTextDescriptionContainer"),
      textarea: q("newAltTextDescriptionTextarea"),
      disclaimer: q("newAltTextDisclaimer"),
      learnMore: q("newAltTextLearnMore"),
      imagePreview: q("newAltTextImagePreview"),
      createAutomatically: q("newAltTextCreateAutomatically"),
      createAutomaticallyButton: q("newAltTextCreateAutomaticallyButton"),
      downloadModel: q("newAltTextDownloadModel"),
      downloadModelDescription: q("newAltTextDownloadModelDescription"),
      error: q("newAltTextError"),
      errorCloseButton: q("newAltTextCloseButton"),
      cancelButton: q("newAltTextCancel"),
      notNowButton: q("newAltTextNotNow"),
      saveButton: q("newAltTextSave"),
    },
    altTextSettingsDialog: {
      dialog: q("altTextSettingsDialog"),
      createModelButton: q("createModelButton"),
      learnMore: q("altTextSettingsLearnMore"),
      showAltTextDialogButton: q("showAltTextDialogButton"),
      altTextSettingsCloseButton: q("altTextSettingsCloseButton"),
      closeButton: q("altTextSettingsCloseButton"),
    },
    addSignatureDialog: {
      dialog: q("addSignatureDialog"),
      panels: q("addSignatureActionContainer"),
      typeButton: q("addSignatureTypeButton"),
      typeInput: q("addSignatureTypeInput"),
      drawButton: q("addSignatureDrawButton"),
      drawSVG: q("addSignatureDraw"),
      drawPlaceholder: q("addSignatureDrawPlaceholder"),
      drawThickness: q("addSignatureDrawThickness"),
      imageButton: q("addSignatureImageButton"),
      imageSVG: q("addSignatureImage"),
      imagePlaceholder: q("addSignatureImagePlaceholder"),
      imagePicker: q("addSignatureFilePicker"),
      imagePickerLink: q("addSignatureImageBrowse"),
      description: q("addSignatureDescription"),
      clearButton: q("clearSignatureButton"),
      saveContainer: q("addSignatureSaveContainer"),
      saveCheckbox: q("addSignatureSaveCheckbox"),
      errorBar: q("addSignatureError"),
      errorTitle: q("addSignatureErrorTitle"),
      errorDescription: q("addSignatureErrorDescription"),
      errorCloseButton: q("addSignatureErrorCloseButton"),
      cancelButton: q("addSignatureCancelButton"),
      addButton: q("addSignatureAddButton"),
    },
    editSignatureDialog: {
      dialog: q("editSignatureDescriptionDialog"),
      description: q("editSignatureDescription"),
      editSignatureView: q("editSignatureView"),
      cancelButton: q("editSignatureCancelButton"),
      updateButton: q("editSignatureUpdateButton"),
    },
    annotationEditorParams: {
      editorCommentsSidebar: q("editorCommentsSidebar"),
      editorCommentsSidebarCount: q("editorCommentsSidebarCount"),
      editorCommentsSidebarTitle: q("editorCommentsSidebarTitle"),
      editorCommentsSidebarCloseButton: q("editorCommentsSidebarCloseButton"),
      editorCommentsSidebarList: q("editorCommentsSidebarList"),
      editorCommentsSidebarResizer: q("editorCommentsSidebarResizer"),
      editorFreeTextFontSize: q("editorFreeTextFontSize"),
      editorFreeTextColor: q("editorFreeTextColor"),
      editorInkColor: q("editorInkColor"),
      editorInkThickness: q("editorInkThickness"),
      editorInkOpacity: q("editorInkOpacity"),
      editorStampAddImage: q("editorStampAddImage"),
      editorSignatureAddSignature: q("editorSignatureAddSignature"),
      editorFreeHighlightThickness: q("editorFreeHighlightThickness"),
      editorHighlightShowAll: q("editorHighlightShowAll"),
    },
    printContainer: q("printContainer"),
    editorUndoBar: {
      container: q("editorUndoBar"),
      message: q("editorUndoBarMessage"),
      undoButton: q("editorUndoBarUndoButton"),
      closeButton: q("editorUndoBarCloseButton"),
    },
    editCommentDialog: {
      dialog: q("commentManagerDialog"),
      toolbar: q("commentManagerToolbar"),
      title: q("commentManagerTitle"),
      textInput: q("commentManagerTextInput"),
      cancelButton: q("commentManagerCancelButton"),
      saveButton: q("commentManagerSaveButton"),
    },
    debuggerScriptPath: "../pdf.js/web/debugger.mjs",
  };
}

/**
 * @docs
 * @ignore
 *
 * @see https://github.com/mozilla/pdf.js/blob/master/web/app_options.js
 * @typedef {object} AppOptions
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
 * @property {AppOptions} [appOptions={}] - Default app options of pdf.js.
 * @property {Array} [plugins=[]] - Plugins to extend viewer behavior.
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
    plugins = [],
  } = options;

  const pluginManager = new PluginManager(plugins);
  setActivePluginManager(pluginManager);
  const workerSrc = `${resourcePath}/build/pdf.worker.mjs`;

  const viewerOptions = new AppOptions();
  Object.keys(appOptions).forEach(function (key) {
    viewerOptions.set(key, appOptions[key]);
  });
  viewerOptions.set("workerSrc", workerSrc);
  viewerOptions.set(
    "sandboxBundleSrc",
    new URL(`${resourcePath}/build/pdf.sandbox.mjs`, document.baseURI).href
  );
  // Upstream defaults are relative to the standalone viewer page (e.g.
  // "../web/cmaps/"); in the embedded context they resolve against the
  // host page and 404 — pin them to the configured resource path.
  const resourceUrl = (path) => new URL(`${resourcePath}/${path}`, document.baseURI).href;
  viewerOptions.set("cMapUrl", resourceUrl("web/cmaps/"));
  viewerOptions.set("iccUrl", resourceUrl("web/iccs/"));
  viewerOptions.set("standardFontDataUrl", resourceUrl("web/standard_fonts/"));
  viewerOptions.set("wasmUrl", resourceUrl("web/wasm/"));
  viewerOptions.set("defaultUrl", src);
  viewerOptions.set("disableCORSCheck", disableCORSCheck);
  viewerOptions.set("disableAutoSetTitle", disableAutoSetTitle);

  // set disablePreferences to enable custom appOptions work
  viewerOptions.set("disablePreferences", true);

  const localeUrl = `${resourcePath}/web/locale/locale.json`;
  injectLocaleResource(localeUrl);

  const app = new PDFViewerApplication(viewerOptions);

  app._pluginManager = pluginManager;

  activeApp = app;

  if (parent) {
    const template = getViewerTemplate();
    parent.appendChild(template);

    const config = getViewerConfiguration(parent);
    app.run(config);
  }

  // Wire plugin lifecycle hooks
  app.initializedPromise
    .then(() => {
      pluginManager.initPlugins(app);

      app.eventBus._on("documentloaded", () => {
        pluginManager.notifyDocumentLoad(app);
      });
    })
    .catch(console.error);

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
          app.appConfig.viewsManager.outerContainer.addEventListener(name, () => {
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
