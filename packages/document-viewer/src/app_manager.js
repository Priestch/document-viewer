import { PDFViewerApplication } from "./app.js";
import { AppOptions } from "../pdf.js/web/app_options";
import { injectLocaleResource } from "./utils";
import getViewerTemplate from "./viewer_template";

let activeApp;

function getViewerConfiguration(document) {
  return {
    appContainer: document.body,
    mainContainer: document.getElementById("viewerContainer"),
    viewerContainer: document.getElementById("viewer"),
    toolbar: {
      container: document.getElementById("toolbarViewer"),
      numPages: document.getElementById("numPages"),
      pageNumber: document.getElementById("pageNumber"),
      scaleSelect: document.getElementById("scaleSelect"),
      customScaleOption: document.getElementById("customScaleOption"),
      previous: document.getElementById("previous"),
      next: document.getElementById("next"),
      zoomIn: document.getElementById("zoomIn"),
      zoomOut: document.getElementById("zoomOut"),
      viewFind: document.getElementById("viewFind"),
      openFile:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? document.getElementById("openFile")
          : null,
      print: document.getElementById("print"),
      editorFreeTextButton: document.getElementById("editorFreeText"),
      editorFreeTextParamsToolbar: document.getElementById("editorFreeTextParamsToolbar"),
      editorInkButton: document.getElementById("editorInk"),
      editorInkParamsToolbar: document.getElementById("editorInkParamsToolbar"),
      download: document.getElementById("download"),
    },
    secondaryToolbar: {
      toolbar: document.getElementById("secondaryToolbar"),
      toggleButton: document.getElementById("secondaryToolbarToggle"),
      presentationModeButton: document.getElementById("presentationMode"),
      openFileButton:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? document.getElementById("secondaryOpenFile")
          : null,
      printButton: document.getElementById("secondaryPrint"),
      downloadButton: document.getElementById("secondaryDownload"),
      viewBookmarkButton: document.getElementById("viewBookmark"),
      firstPageButton: document.getElementById("firstPage"),
      lastPageButton: document.getElementById("lastPage"),
      pageRotateCwButton: document.getElementById("pageRotateCw"),
      pageRotateCcwButton: document.getElementById("pageRotateCcw"),
      cursorSelectToolButton: document.getElementById("cursorSelectTool"),
      cursorHandToolButton: document.getElementById("cursorHandTool"),
      scrollPageButton: document.getElementById("scrollPage"),
      scrollVerticalButton: document.getElementById("scrollVertical"),
      scrollHorizontalButton: document.getElementById("scrollHorizontal"),
      scrollWrappedButton: document.getElementById("scrollWrapped"),
      spreadNoneButton: document.getElementById("spreadNone"),
      spreadOddButton: document.getElementById("spreadOdd"),
      spreadEvenButton: document.getElementById("spreadEven"),
      documentPropertiesButton: document.getElementById("documentProperties"),
    },
    sidebar: {
      // Divs (and sidebar button)
      outerContainer: document.getElementById("outerContainer"),
      sidebarContainer: document.getElementById("sidebarContainer"),
      toggleButton: document.getElementById("sidebarToggle"),
      // Buttons
      thumbnailButton: document.getElementById("viewThumbnail"),
      outlineButton: document.getElementById("viewOutline"),
      attachmentsButton: document.getElementById("viewAttachments"),
      layersButton: document.getElementById("viewLayers"),
      // Views
      thumbnailView: document.getElementById("thumbnailView"),
      outlineView: document.getElementById("outlineView"),
      attachmentsView: document.getElementById("attachmentsView"),
      layersView: document.getElementById("layersView"),
      // View-specific options
      outlineOptionsContainer: document.getElementById("outlineOptionsContainer"),
      currentOutlineItemButton: document.getElementById("currentOutlineItem"),
    },
    sidebarResizer: {
      outerContainer: document.getElementById("outerContainer"),
      resizer: document.getElementById("sidebarResizer"),
    },
    findBar: {
      bar: document.getElementById("findbar"),
      toggleButton: document.getElementById("viewFind"),
      findField: document.getElementById("findInput"),
      highlightAllCheckbox: document.getElementById("findHighlightAll"),
      caseSensitiveCheckbox: document.getElementById("findMatchCase"),
      matchDiacriticsCheckbox: document.getElementById("findMatchDiacritics"),
      entireWordCheckbox: document.getElementById("findEntireWord"),
      findMsg: document.getElementById("findMsg"),
      findResultsCount: document.getElementById("findResultsCount"),
      findPreviousButton: document.getElementById("findPrevious"),
      findNextButton: document.getElementById("findNext"),
    },
    passwordOverlay: {
      dialog: document.getElementById("passwordDialog"),
      label: document.getElementById("passwordText"),
      input: document.getElementById("password"),
      submitButton: document.getElementById("passwordSubmit"),
      cancelButton: document.getElementById("passwordCancel"),
    },
    documentProperties: {
      dialog: document.getElementById("documentPropertiesDialog"),
      closeButton: document.getElementById("documentPropertiesClose"),
      fields: {
        fileName: document.getElementById("fileNameField"),
        fileSize: document.getElementById("fileSizeField"),
        title: document.getElementById("titleField"),
        author: document.getElementById("authorField"),
        subject: document.getElementById("subjectField"),
        keywords: document.getElementById("keywordsField"),
        creationDate: document.getElementById("creationDateField"),
        modificationDate: document.getElementById("modificationDateField"),
        creator: document.getElementById("creatorField"),
        producer: document.getElementById("producerField"),
        version: document.getElementById("versionField"),
        pageCount: document.getElementById("pageCountField"),
        pageSize: document.getElementById("pageSizeField"),
        linearized: document.getElementById("linearizedField"),
      },
    },
    annotationEditorParams: {
      editorFreeTextFontSize: document.getElementById("editorFreeTextFontSize"),
      editorFreeTextColor: document.getElementById("editorFreeTextColor"),
      editorInkColor: document.getElementById("editorInkColor"),
      editorInkThickness: document.getElementById("editorInkThickness"),
      editorInkOpacity: document.getElementById("editorInkOpacity"),
    },
    printContainer: document.getElementById("printContainer"),
    openFileInput:
      typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
        ? document.getElementById("fileInput")
        : null,
    debuggerScriptPath: "../pdf.js/web/debugger.js",
  };
}

/**
 * @api
 *
 * @typedef ViewerOptions
 * @property {HTMLElement} parent - Element the PDF viewer render to.
 * @property {string} src - The src of the PDF document.
 * @property {string} resourcePath - The resource path of pdf.js.
 * @property {boolean} [disableCORSCheck=false] - Disable CORS check of pdf.js
 */

/**
 * Create a viewer app.
 * @api
 * @param {ViewerOptions} viewerOptions
 * @returns {PDFViewerApplication}
 */
function createViewerApp(viewerOptions) {
  const { parent = null, resourcePath, src, disableCORSCheck = false } = viewerOptions;
  const workerSrc = `${resourcePath}/build/pdf.worker.js`;

  const options = AppOptions;
  options.set("workerSrc", workerSrc);
  options.set("defaultUrl", src);
  options.set("disableCORSCheck", disableCORSCheck);

  const localeUrl = `${resourcePath}/web/locale/locale.properties`;
  injectLocaleResource(localeUrl);

  const app = new PDFViewerApplication(options);

  activeApp = app;

  if (parent) {
    const template = getViewerTemplate();
    parent.appendChild(template);

    const config = getViewerConfiguration(document);
    app.run(config);
  }

  return app;
}

/**
 * Get current active viewer app.
 * @returns {PDFViewerApplication}
 */
function getActiveApp() {
  return activeApp;
}

export { getActiveApp, createViewerApp, getViewerConfiguration };
