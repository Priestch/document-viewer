import {
  animationStarted,
  apiPageLayoutToViewerModes,
  apiPageModeToSidebarView,
  AutoPrintRegExp,
  CursorTool,
  DEFAULT_SCALE_VALUE,
  getActiveOrFocusedElement,
  isValidRotation,
  isValidScrollMode,
  isValidSpreadMode,
  normalizeWheelEventDirection,
  parseQueryString,
  ProgressBar,
  RenderingStates,
  ScrollMode,
  SidebarView,
  SpreadMode,
  TextLayerMode,
} from "../pdf.js/web/ui_utils.js";
import {
  AnnotationEditorType,
  build,
  FeatureTest,
  getDocument,
  getFilenameFromUrl,
  getPdfFilenameFromUrl,
  GlobalWorkerOptions,
  InvalidPDFException,
  isDataScheme,
  isPdfFile,
  MissingPDFException,
  PDFWorker,
  shadow,
  UnexpectedResponseException,
  version,
} from "pdfjs-lib";
import { AppOptions, OptionKind } from "../pdf.js/web/app_options.js";
import { AutomationEventBus, EventBus } from "../pdf.js/web/event_utils.js";
import { ExternalServices, initCom, MLManager } from "web-external_services";
import { LinkTarget, PDFLinkService } from "../pdf.js/web/pdf_link_service.js";
import { AltTextManager } from "web-alt_text_manager";
import { AnnotationEditorParams } from "web-annotation_editor_params";
import { CaretBrowsingMode } from "../pdf.js/web/caret_browsing.js";
import { DownloadManager } from "web-download_manager";
import { OverlayManager } from "../pdf.js/web/overlay_manager.js";
import { PasswordPrompt } from "../pdf.js/web/password_prompt.js";
import { PDFAttachmentViewer } from "web-pdf_attachment_viewer";
import { PDFCursorTools } from "web-pdf_cursor_tools";
import { PDFDocumentProperties } from "web-pdf_document_properties";
import { PDFFindBar } from "web-pdf_find_bar";
import { PDFFindController } from "../pdf.js/web/pdf_find_controller.js";
import { PDFHistory } from "../pdf.js/web/pdf_history.js";
import { PDFLayerViewer } from "web-pdf_layer_viewer";
import { PDFOutlineViewer } from "web-pdf_outline_viewer";
import { PDFPresentationMode } from "web-pdf_presentation_mode";
import { PDFPrintServiceFactory } from "web-print_service";
import { PDFRenderingQueue } from "../pdf.js/web/pdf_rendering_queue.js";
import { PDFScriptingManager } from "../pdf.js/web/pdf_scripting_manager.js";
import { PDFSidebar } from "web-pdf_sidebar";
import { PDFThumbnailViewer } from "web-pdf_thumbnail_viewer";
import { PDFViewer } from "../pdf.js/web/pdf_viewer.js";
import { Preferences } from "web-preferences";
import { SecondaryToolbar } from "web-secondary_toolbar";
import { Toolbar } from "web-toolbar";
import { ViewHistory } from "../pdf.js/web/view_history.js";
import { DefaultExternalServices } from "./default_external_services.js";
const FORCE_PAGES_LOADED_TIMEOUT = 10000; // ms

// ms

const ViewOnLoad = {
  UNKNOWN: -1,
  PREVIOUS: 0,
  // Default value.
  INITIAL: 1,
};
/* Abstract factory for the print service. */
// const PDFPrintServiceFactory = {
//   instance: {
//     supportsPrinting: false,
//     createPrintService() {
//       throw new Error("Not implemented: createPrintService");
//     },
//   },
// };

class ViewerApplication {
  initialBookmark = document.location.hash.substring(1);
  _initializedCapability = {
    ...Promise.withResolvers(),
    settled: false,
  };
  settled = false;
  appConfig = null;
  /** @type {PDFDocumentProxy} */
  pdfDocument = null;
  /** @type {PDFDocumentLoadingTask} */
  pdfLoadingTask = null;
  printService = null;
  /** @type {PDFViewer} */
  pdfViewer = null;
  /** @type {PDFThumbnailViewer} */
  pdfThumbnailViewer = null;
  /** @type {PDFRenderingQueue} */
  pdfRenderingQueue = null;
  /** @type {PDFPresentationMode} */
  pdfPresentationMode = null;
  /** @type {PDFDocumentProperties} */
  pdfDocumentProperties = null;
  /** @type {PDFLinkService} */
  pdfLinkService = null;
  /** @type {PDFHistory} */
  pdfHistory = null;
  /** @type {PDFSidebar} */
  pdfSidebar = null;
  /** @type {PDFOutlineViewer} */
  pdfOutlineViewer = null;
  /** @type {PDFAttachmentViewer} */
  pdfAttachmentViewer = null;
  /** @type {PDFLayerViewer} */
  pdfLayerViewer = null;
  /** @type {PDFCursorTools} */
  pdfCursorTools = null;
  /** @type {PDFScriptingManager} */
  pdfScriptingManager = null;
  /** @type {ViewHistory} */
  store = null;
  /** @type {DownloadManager} */
  downloadManager = null;
  /** @type {OverlayManager} */
  overlayManager = null;
  /** @type {Preferences} */
  preferences = null;
  /** @type {Toolbar} */
  toolbar = null;
  /** @type {SecondaryToolbar} */
  secondaryToolbar = null;
  /** @type {EventBus} */
  eventBus = null;
  /** @type {IL10n} */
  l10n = null;
  /** @type {AnnotationEditorParams} */
  annotationEditorParams = null;
  isInitialViewSet = false;
  downloadComplete = false;
  isViewerEmbedded = window.parent !== window;
  url = "";
  baseUrl = "";
  _downloadUrl = "";
  _eventBusAbortController = null;
  _windowAbortController = null;
  documentInfo = null;
  metadata = null;
  _contentDispositionFilename = null;
  _contentLength = null;
  _saveInProgress = false;
  _wheelUnusedTicks = 0;
  _wheelUnusedFactor = 1;
  _touchUnusedTicks = 0;
  _touchUnusedFactor = 1;
  _PDFBug = null;
  _hasAnnotationEditors = false;
  _title = document.title;
  _printAnnotationStoragePromise = null;
  _touchInfo = null;
  _isCtrlKeyDown = false;
  _nimbusDataPromise = null;
  _caretBrowsing = null;
  _isScrolling = false;
  constructor() {}
  // Called once when the document is loaded.
  async initialize(appConfig) {
    const { appOptions: AppOptions } = this;
    let l10nPromise;
    // In the (various) extension builds, where the locale is set automatically,
    // initialize the `L10n`-instance as soon as possible.
    if (typeof PDFJSDev !== "undefined" && !PDFJSDev.test("GENERIC")) {
      l10nPromise = this.externalServices.createL10n();
    }
    this.appConfig = appConfig;
    if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
      this._nimbusDataPromise = this.externalServices.getNimbusExperimentData();
    }

    // Ensure that `Preferences`, and indirectly `AppOptions`, have initialized
    // before creating e.g. the various viewer components.
    try {
      await this.preferences.initializedPromise;
    } catch (ex) {
      console.error(`initialize: "${ex.message}".`);
    }
    if (AppOptions.get("pdfBugEnabled")) {
      await this._parseHashParams();
    }
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      let mode;
      switch (AppOptions.get("viewerCssTheme")) {
        case 1:
          mode = "is-light";
          break;
        case 2:
          mode = "is-dark";
          break;
      }
      if (mode) {
        document.documentElement.classList.add(mode);
      }
    }

    // Ensure that the `L10n`-instance has been initialized before creating
    // e.g. the various viewer components.
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      l10nPromise = this.externalServices.createL10n();
    }
    this.l10n = await l10nPromise;
    document.getElementsByTagName("html")[0].dir = this.l10n.getDirection();
    // Connect Fluent, when necessary, and translate what we already have.
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      this.l10n.translate(appConfig.appContainer || document.documentElement);
    }
    if (this.isViewerEmbedded && AppOptions.get("externalLinkTarget") === LinkTarget.NONE) {
      // Prevent external links from "replacing" the viewer,
      // when it's embedded in e.g. an <iframe> or an <object>.
      AppOptions.set("externalLinkTarget", LinkTarget.TOP);
    }
    await this._initializeViewerComponents();

    // Bind the various event handlers *after* the viewer has been
    // initialized, to prevent errors if an event arrives too soon.
    this.bindEvents();
    this.bindWindowEvents();
    this._initializedCapability.settled = true;
    this._initializedCapability.resolve();
  }
  /**
   * Potentially parse special debugging flags in the hash section of the URL.
   * @private
   */
  async _parseHashParams() {
    const { appOptions: AppOptions } = this;
    const hash = document.location.hash.substring(1);
    if (!hash) {
      return;
    }
    const { mainContainer, viewerContainer } = this.appConfig,
      params = parseQueryString(hash);
    const loadPDFBug = async () => {
      if (this._PDFBug) {
        return;
      }
      const { PDFBug } =
        typeof PDFJSDev === "undefined"
          ? await import(AppOptions.get("debuggerSrc")) // eslint-disable-line no-unsanitized/method
          : await __non_webpack_import__(AppOptions.get("debuggerSrc"));
      this._PDFBug = PDFBug;
    };
    if (params.get("disableworker") === "true") {
      try {
        GlobalWorkerOptions.workerSrc ||= AppOptions.get("workerSrc");
        if (typeof PDFJSDev === "undefined") {
          globalThis.pdfjsWorker = await import("pdfjs/pdf.worker.js");
        } else {
          await __non_webpack_import__(PDFWorker.workerSrc);
        }
      } catch (ex) {
        console.error(`_parseHashParams: "${ex.message}".`);
      }
    }
    if (params.has("disablerange")) {
      AppOptions.set("disableRange", params.get("disablerange") === "true");
    }
    if (params.has("disablestream")) {
      AppOptions.set("disableStream", params.get("disablestream") === "true");
    }
    if (params.has("disableautofetch")) {
      AppOptions.set("disableAutoFetch", params.get("disableautofetch") === "true");
    }
    if (params.has("disablefontface")) {
      AppOptions.set("disableFontFace", params.get("disablefontface") === "true");
    }
    if (params.has("disablehistory")) {
      AppOptions.set("disableHistory", params.get("disablehistory") === "true");
    }
    if (params.has("verbosity")) {
      AppOptions.set("verbosity", params.get("verbosity") | 0);
    }
    if (params.has("textlayer")) {
      switch (params.get("textlayer")) {
        case "off":
          AppOptions.set("textLayerMode", TextLayerMode.DISABLE);
          break;
        case "visible":
        case "shadow":
        case "hover":
          viewerContainer.classList.add(`textLayer-${params.get("textlayer")}`);
          try {
            await loadPDFBug();
            this._PDFBug.loadCSS();
          } catch (ex) {
            console.error(`_parseHashParams: "${ex.message}".`);
          }
          break;
      }
    }
    if (params.has("pdfbug")) {
      AppOptions.setAll({
        pdfBug: true,
        fontExtraProperties: true,
      });
      const enabled = params.get("pdfbug").split(",");
      try {
        await loadPDFBug();
        this._PDFBug.init(mainContainer, enabled);
      } catch (ex) {
        console.error(`_parseHashParams: "${ex.message}".`);
      }
    }
    // It is not possible to change locale for the (various) extension builds.
    if ((typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) && params.has("locale")) {
      AppOptions.set("locale", params.get("locale"));
    }

    // Set some specific preferences for tests.
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("TESTING")) {
      if (params.has("highlighteditorcolors")) {
        AppOptions.set("highlightEditorColors", params.get("highlighteditorcolors"));
      }
      if (params.has("maxcanvaspixels")) {
        AppOptions.set("maxCanvasPixels", Number(params.get("maxcanvaspixels")));
      }
      if (params.has("supportscaretbrowsingmode")) {
        AppOptions.set(
          "supportsCaretBrowsingMode",
          params.get("supportscaretbrowsingmode") === "true"
        );
      }
    }
  }
  /**
   * @private
   */
  async _initializeViewerComponents() {
    const { appOptions: AppOptions } = this;
    const { appConfig, externalServices, l10n } = this;
    const eventBus = AppOptions.get("isInAutomation") ? new AutomationEventBus() : new EventBus();
    this.eventBus = eventBus;
    this.overlayManager = new OverlayManager();
    const pdfRenderingQueue = new PDFRenderingQueue();
    pdfRenderingQueue.onIdle = this._cleanup.bind(this);
    this.pdfRenderingQueue = pdfRenderingQueue;
    const pdfLinkService = new PDFLinkService({
      eventBus,
      externalLinkTarget: AppOptions.get("externalLinkTarget"),
      externalLinkRel: AppOptions.get("externalLinkRel"),
      ignoreDestinationZoom: AppOptions.get("ignoreDestinationZoom"),
    });
    this.pdfLinkService = pdfLinkService;
    const downloadManager = (this.downloadManager = new DownloadManager());
    const findController = new PDFFindController({
      linkService: pdfLinkService,
      eventBus,
      updateMatchesCountOnProgress:
        typeof PDFJSDev === "undefined" ? !window.isGECKOVIEW : !PDFJSDev.test("GECKOVIEW"),
    });
    this.findController = findController;
    const pdfScriptingManager = new PDFScriptingManager({
      eventBus,
      externalServices,
      docProperties: this._scriptingDocProperties.bind(this),
    });
    this.pdfScriptingManager = pdfScriptingManager;
    const container = appConfig.mainContainer,
      viewer = appConfig.viewerContainer;
    const annotationEditorMode = AppOptions.get("annotationEditorMode");
    const pageColors =
      AppOptions.get("forcePageColors") || window.matchMedia("(forced-colors: active)").matches
        ? {
            background: AppOptions.get("pageColorsBackground"),
            foreground: AppOptions.get("pageColorsForeground"),
          }
        : null;
    const altTextManager = appConfig.altTextDialog
      ? new AltTextManager(appConfig.altTextDialog, container, this.overlayManager, eventBus)
      : null;
    const pdfViewer = new PDFViewer({
      container,
      viewer,
      eventBus,
      renderingQueue: pdfRenderingQueue,
      linkService: pdfLinkService,
      downloadManager,
      altTextManager,
      findController,
      scriptingManager: AppOptions.get("enableScripting") && pdfScriptingManager,
      l10n,
      textLayerMode: AppOptions.get("textLayerMode"),
      annotationMode: AppOptions.get("annotationMode"),
      annotationEditorMode,
      annotationEditorHighlightColors: AppOptions.get("highlightEditorColors"),
      enableHighlightFloatingButton: AppOptions.get("enableHighlightFloatingButton"),
      imageResourcesPath: AppOptions.get("imageResourcesPath"),
      enablePrintAutoRotate: AppOptions.get("enablePrintAutoRotate"),
      maxCanvasPixels: AppOptions.get("maxCanvasPixels"),
      enablePermissions: AppOptions.get("enablePermissions"),
      pageColors,
      mlManager: this.mlManager,
    });
    this.pdfViewer = pdfViewer;
    pdfRenderingQueue.setViewer(pdfViewer);
    pdfLinkService.setViewer(pdfViewer);
    pdfScriptingManager.setViewer(pdfViewer);
    if (appConfig.sidebar?.thumbnailView) {
      this.pdfThumbnailViewer = new PDFThumbnailViewer({
        container: appConfig.sidebar.thumbnailView,
        eventBus,
        renderingQueue: pdfRenderingQueue,
        linkService: pdfLinkService,
        pageColors,
      });
      pdfRenderingQueue.setThumbnailViewer(this.pdfThumbnailViewer);
    }

    // The browsing history is only enabled when the viewer is standalone,
    // i.e. not when it is embedded in a web page.
    if (!this.isViewerEmbedded && !AppOptions.get("disableHistory")) {
      this.pdfHistory = new PDFHistory({
        linkService: pdfLinkService,
        eventBus,
      });
      pdfLinkService.setHistory(this.pdfHistory);
    }
    if (!this.supportsIntegratedFind && appConfig.findBar) {
      this.findBar = new PDFFindBar(appConfig.findBar, eventBus);
    }
    if (appConfig.annotationEditorParams) {
      if (annotationEditorMode !== AnnotationEditorType.DISABLE) {
        if (AppOptions.get("enableStampEditor")) {
          appConfig.toolbar?.editorStampButton?.classList.remove("hidden");
        }
        const editorHighlightButton = appConfig.toolbar?.editorHighlightButton;
        if (editorHighlightButton && AppOptions.get("enableHighlightEditor")) {
          editorHighlightButton.hidden = false;
        }
        this.annotationEditorParams = new AnnotationEditorParams(
          appConfig.annotationEditorParams,
          eventBus
        );
      } else {
        for (const id of ["editorModeButtons", "editorModeSeparator"]) {
          document.getElementById(id)?.classList.add("hidden");
        }
      }
    }
    if (appConfig.documentProperties) {
      this.pdfDocumentProperties = new PDFDocumentProperties(
        appConfig.documentProperties,
        this.overlayManager,
        eventBus,
        l10n,
        /* fileNameLookup = */ () => this._docFilename
      );
    }

    // NOTE: The cursor-tools are unlikely to be helpful/useful in GeckoView,
    // in particular the `HandTool` which basically simulates touch scrolling.
    if (appConfig.secondaryToolbar?.cursorHandToolButton) {
      this.pdfCursorTools = new PDFCursorTools({
        container,
        eventBus,
        cursorToolOnLoad: AppOptions.get("cursorToolOnLoad"),
      });
    }
    if (appConfig.toolbar) {
      if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
        this.toolbar = new Toolbar(appConfig.toolbar, eventBus, await this._nimbusDataPromise);
      } else {
        this.toolbar = new Toolbar(appConfig.toolbar, eventBus);
      }
    }
    if (appConfig.secondaryToolbar) {
      this.secondaryToolbar = new SecondaryToolbar(appConfig.secondaryToolbar, eventBus);
    }
    if (this.supportsFullscreen && appConfig.secondaryToolbar?.presentationModeButton) {
      this.pdfPresentationMode = new PDFPresentationMode({
        container,
        pdfViewer,
        eventBus,
      });
    }
    if (appConfig.passwordOverlay) {
      this.passwordPrompt = new PasswordPrompt(
        appConfig.passwordOverlay,
        this.overlayManager,
        this.isViewerEmbedded
      );
    }
    if (appConfig.sidebar?.outlineView) {
      this.pdfOutlineViewer = new PDFOutlineViewer({
        container: appConfig.sidebar.outlineView,
        eventBus,
        l10n,
        linkService: pdfLinkService,
        downloadManager,
      });
    }
    if (appConfig.sidebar?.attachmentsView) {
      this.pdfAttachmentViewer = new PDFAttachmentViewer({
        container: appConfig.sidebar.attachmentsView,
        eventBus,
        l10n,
        downloadManager,
      });
    }
    if (appConfig.sidebar?.layersView) {
      this.pdfLayerViewer = new PDFLayerViewer({
        container: appConfig.sidebar.layersView,
        eventBus,
        l10n,
      });
    }
    if (appConfig.sidebar) {
      this.pdfSidebar = new PDFSidebar({
        elements: appConfig.sidebar,
        eventBus,
        l10n,
      });
      this.pdfSidebar.onToggled = this.forceRendering.bind(this);
      this.pdfSidebar.onUpdateThumbnails = () => {
        // Use the rendered pages to set the corresponding thumbnail images.
        for (const pageView of pdfViewer.getCachedPageViews()) {
          if (pageView.renderingState === RenderingStates.FINISHED) {
            this.pdfThumbnailViewer.getThumbnail(pageView.id - 1)?.setImage(pageView);
          }
        }
        this.pdfThumbnailViewer.scrollThumbnailIntoView(pdfViewer.currentPageNumber);
      };
    }
  }

  async run(config, validateFileURL) {
    const { appOptions: AppOptions } = this;
    this.preferences = new Preferences();
    await this.initialize(config);
    const { appConfig, eventBus } = this;
    let file;
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      const queryString = document.location.search.substring(1);
      const params = parseQueryString(queryString);
      file = params.get("file") ?? AppOptions.get("defaultUrl");
      validateFileURL(file);
    } else if (PDFJSDev.test("MOZCENTRAL")) {
      file = window.location.href;
    } else if (PDFJSDev.test("CHROME")) {
      file = AppOptions.get("defaultUrl");
    }
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      const fileInput = (this._openFileInput = document.createElement("input"));
      fileInput.id = "fileInput";
      fileInput.hidden = true;
      fileInput.type = "file";
      fileInput.value = null;
      document.body.append(fileInput);
      fileInput.addEventListener("change", function (evt) {
        const { files } = evt.target;
        if (!files || files.length === 0) {
          return;
        }
        eventBus.dispatch("fileinputchange", {
          source: this,
          fileInput: evt.target,
        });
      });

      // Enable dragging-and-dropping a new PDF file onto the viewerContainer.
      appConfig.mainContainer.addEventListener("dragover", function (evt) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = evt.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      });
      appConfig.mainContainer.addEventListener("drop", function (evt) {
        evt.preventDefault();
        const { files } = evt.dataTransfer;
        if (!files || files.length === 0) {
          return;
        }
        eventBus.dispatch("fileinputchange", {
          source: this,
          fileInput: evt.dataTransfer,
        });
      });
    }
    if (!AppOptions.get("supportsDocumentFonts")) {
      AppOptions.set("disableFontFace", true);
      this.l10n.get("pdfjs-web-fonts-disabled").then((msg) => {
        console.warn(msg);
      });
    }
    if (!this.supportsPrinting) {
      appConfig.toolbar?.print?.classList.add("hidden");
      appConfig.secondaryToolbar?.printButton.classList.add("hidden");
    }
    if (!this.supportsFullscreen) {
      appConfig.secondaryToolbar?.presentationModeButton.classList.add("hidden");
    }
    if (this.supportsIntegratedFind) {
      appConfig.toolbar?.viewFind?.classList.add("hidden");
    }
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      if (file) {
        this.open({
          url: file,
        });
      } else {
        this._hideViewBookmark();
      }
    } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
      this.setTitleUsingUrl(file, /* downloadUrl = */ file);
      this.externalServices.initPassiveLoading();
    } else {
      throw new Error("Not implemented: run");
    }
  }

  get externalServices() {
    return shadow(this, "externalServices", new ExternalServices());
  }

  get mlManager() {
    const { appOptions: AppOptions } = this;
    return shadow(this, "mlManager", AppOptions.get("enableML") === true ? new MLManager() : null);
  }

  get initialized() {
    return this._initializedCapability.settled;
  }

  get initializedPromise() {
    return this._initializedCapability.promise;
  }

  updateZoom(steps, scaleFactor, origin) {
    const { appOptions: AppOptions } = this;
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.updateScale({
      drawingDelay: AppOptions.get("defaultZoomDelay"),
      steps,
      scaleFactor,
      origin,
    });
  }

  zoomIn() {
    this.updateZoom(1);
  }

  zoomOut() {
    this.updateZoom(-1);
  }

  zoomReset() {
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
  }

  get pagesCount() {
    return this.pdfDocument ? this.pdfDocument.numPages : 0;
  }

  get page() {
    return this.pdfViewer.currentPageNumber;
  }

  set page(val) {
    this.pdfViewer.currentPageNumber = val;
  }

  get supportsPrinting() {
    return PDFPrintServiceFactory.supportsPrinting;
  }

  get supportsFullscreen() {
    return shadow(this, "supportsFullscreen", document.fullscreenEnabled);
  }

  get supportsPinchToZoom() {
    const { appOptions: AppOptions } = this;
    return shadow(this, "supportsPinchToZoom", AppOptions.get("supportsPinchToZoom"));
  }

  get supportsIntegratedFind() {
    const { appOptions: AppOptions } = this;
    return shadow(this, "supportsIntegratedFind", AppOptions.get("supportsIntegratedFind"));
  }

  get loadingBar() {
    const barElement = document.getElementById("loadingBar");
    const bar = barElement ? new ProgressBar(barElement) : null;
    return shadow(this, "loadingBar", bar);
  }

  get supportsMouseWheelZoomCtrlKey() {
    const { appOptions: AppOptions } = this;
    return shadow(
      this,
      "supportsMouseWheelZoomCtrlKey",
      AppOptions.get("supportsMouseWheelZoomCtrlKey")
    );
  }

  get supportsMouseWheelZoomMetaKey() {
    const { appOptions: AppOptions } = this;
    return shadow(
      this,
      "supportsMouseWheelZoomMetaKey",
      AppOptions.get("supportsMouseWheelZoomMetaKey")
    );
  }

  get supportsCaretBrowsingMode() {
    const { appOptions: AppOptions } = this;
    return AppOptions.get("supportsCaretBrowsingMode");
  }

  moveCaret(isUp, select) {
    this._caretBrowsing ||= new CaretBrowsingMode(
      this.appConfig.mainContainer,
      this.appConfig.viewerContainer,
      this.appConfig.toolbar?.container
    );
    this._caretBrowsing.moveCaret(isUp, select);
  }

  setTitleUsingUrl(url = "", downloadUrl = null) {
    this.url = url;
    this.baseUrl = url.split("#", 1)[0];
    if (downloadUrl) {
      this._downloadUrl = downloadUrl === url ? this.baseUrl : downloadUrl.split("#", 1)[0];
    }
    if (isDataScheme(url)) {
      this._hideViewBookmark();
    }
    let title = getPdfFilenameFromUrl(url, "");
    if (!title) {
      try {
        title = decodeURIComponent(getFilenameFromUrl(url)) || url;
      } catch {
        // decodeURIComponent may throw URIError,
        // fall back to using the unprocessed url in that case
        title = url;
      }
    }
    this.setTitle(title);
  }

  setTitle(title = this._title) {
    this._title = title;
    if (this.isViewerEmbedded) {
      // Embedded PDF viewers should not be changing their parent page's title.
      return;
    }
    const editorIndicator = this._hasAnnotationEditors && !this.pdfRenderingQueue.printing;
    document.title = `${editorIndicator ? "* " : ""}${title}`;
  }

  get _docFilename() {
    // Use `this.url` instead of `this.baseUrl` to perform filename detection
    // based on the reference fragment as ultimate fallback if needed.
    return this._contentDispositionFilename || getPdfFilenameFromUrl(this.url);
  }

  /**
   * @private
   */
  _hideViewBookmark() {
    const { secondaryToolbar } = this.appConfig;
    // URL does not reflect proper document location - hiding some buttons.
    secondaryToolbar?.viewBookmarkButton.classList.add("hidden");

    // Avoid displaying multiple consecutive separators in the secondaryToolbar.
    if (secondaryToolbar?.presentationModeButton.classList.contains("hidden")) {
      document.getElementById("viewBookmarkSeparator")?.classList.add("hidden");
    }
  }

  /**
   * Closes opened PDF document.
   * @returns {Promise} - Returns the promise, which is resolved when all
   *                      destruction is completed.
   */
  async close() {
    this._unblockDocumentLoadEvent();
    this._hideViewBookmark();
    if (!this.pdfLoadingTask) {
      return;
    }
    if (
      (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) &&
      this.pdfDocument?.annotationStorage.size > 0 &&
      this._annotationStorageModified
    ) {
      try {
        // Trigger saving, to prevent data loss in forms; see issue 12257.
        await this.save();
      } catch {
        // Ignoring errors, to ensure that document closing won't break.
      }
    }
    const promises = [];
    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;
    if (this.pdfDocument) {
      this.pdfDocument = null;
      this.pdfThumbnailViewer?.setDocument(null);
      this.pdfViewer.setDocument(null);
      this.pdfLinkService.setDocument(null);
      this.pdfDocumentProperties?.setDocument(null);
    }
    this.pdfLinkService.externalLinkEnabled = true;
    this.store = null;
    this.isInitialViewSet = false;
    this.downloadComplete = false;
    this.url = "";
    this.baseUrl = "";
    this._downloadUrl = "";
    this.documentInfo = null;
    this.metadata = null;
    this._contentDispositionFilename = null;
    this._contentLength = null;
    this._saveInProgress = false;
    this._hasAnnotationEditors = false;
    promises.push(this.pdfScriptingManager.destroyPromise, this.passwordPrompt.close());
    this.setTitle();
    this.pdfSidebar?.reset();
    this.pdfOutlineViewer?.reset();
    this.pdfAttachmentViewer?.reset();
    this.pdfLayerViewer?.reset();
    this.pdfHistory?.reset();
    this.findBar?.reset();
    this.toolbar?.reset();
    this.secondaryToolbar?.reset();
    this._PDFBug?.cleanup();
    await Promise.all(promises);
  }

  /**
   * Opens a new PDF document.
   * @param {Object} args - Accepts any/all of the properties from
   *   {@link DocumentInitParameters}, and also a `originalUrl` string.
   * @returns {Promise} - Promise that is resolved when the document is opened.
   */
  async open(args) {
    const { appOptions: AppOptions } = this;
    if (this.pdfLoadingTask) {
      // We need to destroy already opened document.
      await this.close();
    }
    // Set the necessary global worker parameters, using the available options.
    const workerParams = AppOptions.getAll(OptionKind.WORKER);
    Object.assign(GlobalWorkerOptions, workerParams);
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      if (args.data && isPdfFile(args.filename)) {
        this._contentDispositionFilename = args.filename;
      }
    } else if (args.url) {
      // The Firefox built-in viewer always calls `setTitleUsingUrl`, before
      // `initPassiveLoading`, and it never provides an `originalUrl` here.
      this.setTitleUsingUrl(args.originalUrl || args.url, /* downloadUrl = */ args.url);
    }
    // Always set `docBaseUrl` in development mode, and in the (various)
    // extension builds.
    if (typeof PDFJSDev === "undefined") {
      AppOptions.set("docBaseUrl", document.URL.split("#", 1)[0]);
    } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
      AppOptions.set("docBaseUrl", this.baseUrl);
    }

    // On Android, there is almost no chance to have the font we want so we
    // don't use the system fonts in this case.
    if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
      args.useSystemFonts = false;
    }

    // Set the necessary API parameters, using all the available options.
    const apiParams = AppOptions.getAll(OptionKind.API);
    const loadingTask = getDocument({
      ...apiParams,
      ...args,
    });
    this.pdfLoadingTask = loadingTask;
    loadingTask.onPassword = (updateCallback, reason) => {
      if (this.isViewerEmbedded) {
        // The load event can't be triggered until the password is entered, so
        // if the viewer is in an iframe and its visibility depends on the
        // onload callback then the viewer never shows (bug 1801341).
        this._unblockDocumentLoadEvent();
      }
      this.pdfLinkService.externalLinkEnabled = false;
      this.passwordPrompt.setUpdateCallback(updateCallback, reason);
      this.passwordPrompt.open();
    };
    loadingTask.onProgress = ({ loaded, total }) => {
      this.progress(loaded / total);
    };
    return loadingTask.promise.then(
      (pdfDocument) => {
        this.load(pdfDocument);
      },
      (reason) => {
        if (loadingTask !== this.pdfLoadingTask) {
          return undefined; // Ignore errors for previously opened PDF files.
        }
        let key = "pdfjs-loading-error";
        if (reason instanceof InvalidPDFException) {
          key = "pdfjs-invalid-file-error";
        } else if (reason instanceof MissingPDFException) {
          key = "pdfjs-missing-file-error";
        } else if (reason instanceof UnexpectedResponseException) {
          key = "pdfjs-unexpected-response-error";
        }
        return this._documentError(key, {
          message: reason.message,
        }).then(() => {
          throw reason;
        });
      }
    );
  }

  /**
   * @private
   */
  _ensureDownloadComplete() {
    if (this.pdfDocument && this.downloadComplete) {
      return;
    }
    throw new Error("PDF document not downloaded.");
  }

  async download(options = {}) {
    const url = this._downloadUrl,
      filename = this._docFilename;
    try {
      this._ensureDownloadComplete();
      const data = await this.pdfDocument.getData();
      const blob = new Blob([data], {
        type: "application/pdf",
      });
      await this.downloadManager.download(blob, url, filename, options);
    } catch {
      // When the PDF document isn't ready, or the PDF file is still
      // downloading, simply download using the URL.
      await this.downloadManager.downloadUrl(url, filename, options);
    }
  }

  async save(options = {}) {
    if (this._saveInProgress) {
      return;
    }
    this._saveInProgress = true;
    await this.pdfScriptingManager.dispatchWillSave();
    const url = this._downloadUrl,
      filename = this._docFilename;
    try {
      this._ensureDownloadComplete();
      const data = await this.pdfDocument.saveDocument();
      const blob = new Blob([data], {
        type: "application/pdf",
      });
      await this.downloadManager.download(blob, url, filename, options);
    } catch (reason) {
      // When the PDF document isn't ready, or the PDF file is still
      // downloading, simply fallback to a "regular" download.
      console.error(`Error when saving the document: ${reason.message}`);
      await this.download(options);
    } finally {
      await this.pdfScriptingManager.dispatchDidSave();
      this._saveInProgress = false;
    }
    if (this._hasAnnotationEditors) {
      this.externalServices.reportTelemetry({
        type: "editing",
        data: {
          type: "save",
          stats: this.pdfDocument?.annotationStorage.editorStats,
        },
      });
    }
  }

  downloadOrSave(options = {}) {
    if (this.pdfDocument?.annotationStorage.size > 0) {
      this.save(options);
    } else {
      this.download(options);
    }
  }

  /**
   * Report the error; used for errors affecting loading and/or parsing of
   * the entire PDF document.
   */
  async _documentError(key, moreInfo = null) {
    this._unblockDocumentLoadEvent();
    const message = await this._otherError(key || "pdfjs-loading-error", moreInfo);
    this.eventBus.dispatch("documenterror", {
      source: this,
      message,
      reason: moreInfo?.message ?? null,
    });
  }

  /**
   * Report the error; used for errors affecting e.g. only a single page.
   * @param {string} key - The localization key for the error.
   * @param {Object} [moreInfo] - Further information about the error that is
   *                              more technical. Should have a 'message' and
   *                              optionally a 'stack' property.
   * @returns {string} A (localized) error message that is human readable.
   */
  async _otherError(key, moreInfo = null) {
    const message = await this.l10n.get(key);
    const moreInfoText = [`PDF.js v${version || "?"} (build: ${build || "?"})`];
    if (moreInfo) {
      moreInfoText.push(`Message: ${moreInfo.message}`);
      if (moreInfo.stack) {
        moreInfoText.push(`Stack: ${moreInfo.stack}`);
      } else {
        if (moreInfo.filename) {
          moreInfoText.push(`File: ${moreInfo.filename}`);
        }
        if (moreInfo.lineNumber) {
          moreInfoText.push(`Line: ${moreInfo.lineNumber}`);
        }
      }
    }
    console.error(`${message}\n\n${moreInfoText.join("\n")}`);
    return message;
  }

  progress(level) {
    const { appOptions: AppOptions } = this;
    if (!this.loadingBar || this.downloadComplete) {
      // Don't accidentally show the loading bar again when the entire file has
      // already been fetched (only an issue when disableAutoFetch is enabled).
      return;
    }
    const percent = Math.round(level * 100);
    // When we transition from full request to range requests, it's possible
    // that we discard some of the loaded data. This can cause the loading
    // bar to move backwards. So prevent this by only updating the bar if it
    // increases.
    if (percent <= this.loadingBar.percent) {
      return;
    }
    this.loadingBar.percent = percent;

    // When disableAutoFetch is enabled, it's not uncommon for the entire file
    // to never be fetched (depends on e.g. the file structure). In this case
    // the loading bar will not be completely filled, nor will it be hidden.
    // To prevent displaying a partially filled loading bar permanently, we
    // hide it when no data has been loaded during a certain amount of time.
    if (this.pdfDocument?.loadingParams.disableAutoFetch ?? AppOptions.get("disableAutoFetch")) {
      this.loadingBar.setDisableAutoFetch();
    }
  }

  load(pdfDocument) {
    const { appOptions: AppOptions } = this;
    this.pdfDocument = pdfDocument;
    pdfDocument.getDownloadInfo().then(({ length }) => {
      this._contentLength = length; // Ensure that the correct length is used.
      this.downloadComplete = true;
      this.loadingBar?.hide();
      firstPagePromise.then(() => {
        this.eventBus.dispatch("documentloaded", {
          source: this,
        });
      });
    });

    // Since the `setInitialView` call below depends on this being resolved,
    // fetch it early to avoid delaying initial rendering of the PDF document.
    const pageLayoutPromise = pdfDocument.getPageLayout().catch(() => {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    const pageModePromise = pdfDocument.getPageMode().catch(() => {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    const openActionPromise = pdfDocument.getOpenAction().catch(() => {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    this.toolbar?.setPagesCount(pdfDocument.numPages, false);
    this.secondaryToolbar?.setPagesCount(pdfDocument.numPages);
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME")) {
      const baseUrl = location.href.split("#", 1)[0];
      // Ignore "data:"-URLs for performance reasons, even though it may cause
      // internal links to not work perfectly in all cases (see bug 1803050).
      this.pdfLinkService.setDocument(pdfDocument, isDataScheme(baseUrl) ? null : baseUrl);
    } else {
      this.pdfLinkService.setDocument(pdfDocument);
    }
    this.pdfDocumentProperties?.setDocument(pdfDocument);
    const pdfViewer = this.pdfViewer;
    pdfViewer.setDocument(pdfDocument);
    const { firstPagePromise, onePageRendered, pagesPromise } = pdfViewer;
    this.pdfThumbnailViewer?.setDocument(pdfDocument);
    const storedPromise = (this.store = new ViewHistory(pdfDocument.fingerprints[0]))
      .getMultiple({
        page: null,
        zoom: DEFAULT_SCALE_VALUE,
        scrollLeft: "0",
        scrollTop: "0",
        rotation: null,
        sidebarView: SidebarView.UNKNOWN,
        scrollMode: ScrollMode.UNKNOWN,
        spreadMode: SpreadMode.UNKNOWN,
      })
      .catch(() => {
        /* Unable to read from storage; ignoring errors. */
      });
    firstPagePromise.then((pdfPage) => {
      this.loadingBar?.setWidth(this.appConfig.viewerContainer);
      this._initializeAnnotationStorageCallbacks(pdfDocument);
      Promise.all([
        animationStarted,
        storedPromise,
        pageLayoutPromise,
        pageModePromise,
        openActionPromise,
      ])
        .then(async ([timeStamp, stored, pageLayout, pageMode, openAction]) => {
          const viewOnLoad = AppOptions.get("viewOnLoad");
          this._initializePdfHistory({
            fingerprint: pdfDocument.fingerprints[0],
            viewOnLoad,
            initialDest: openAction?.dest,
          });
          const initialBookmark = this.initialBookmark;

          // Initialize the default values, from user preferences.
          const zoom = AppOptions.get("defaultZoomValue");
          let hash = zoom ? `zoom=${zoom}` : null;
          let rotation = null;
          let sidebarView = AppOptions.get("sidebarViewOnLoad");
          let scrollMode = AppOptions.get("scrollModeOnLoad");
          let spreadMode = AppOptions.get("spreadModeOnLoad");
          if (stored?.page && viewOnLoad !== ViewOnLoad.INITIAL) {
            hash =
              `page=${stored.page}&zoom=${zoom || stored.zoom},` +
              `${stored.scrollLeft},${stored.scrollTop}`;
            rotation = parseInt(stored.rotation, 10);
            // Always let user preference take precedence over the view history.
            if (sidebarView === SidebarView.UNKNOWN) {
              sidebarView = stored.sidebarView | 0;
            }
            if (scrollMode === ScrollMode.UNKNOWN) {
              scrollMode = stored.scrollMode | 0;
            }
            if (spreadMode === SpreadMode.UNKNOWN) {
              spreadMode = stored.spreadMode | 0;
            }
          }
          // Always let the user preference/view history take precedence.
          if (pageMode && sidebarView === SidebarView.UNKNOWN) {
            sidebarView = apiPageModeToSidebarView(pageMode);
          }
          if (
            pageLayout &&
            scrollMode === ScrollMode.UNKNOWN &&
            spreadMode === SpreadMode.UNKNOWN
          ) {
            const modes = apiPageLayoutToViewerModes(pageLayout);
            // TODO: Try to improve page-switching when using the mouse-wheel
            // and/or arrow-keys before allowing the document to control this.
            // scrollMode = modes.scrollMode;
            spreadMode = modes.spreadMode;
          }
          this.setInitialView(hash, {
            rotation,
            sidebarView,
            scrollMode,
            spreadMode,
          });
          this.eventBus.dispatch("documentinit", {
            source: this,
          });
          // Make all navigation keys work on document load,
          // unless the viewer is embedded in a web page.
          if (!this.isViewerEmbedded) {
            pdfViewer.focus();
          }

          // For documents with different page sizes, once all pages are
          // resolved, ensure that the correct location becomes visible on load.
          // (To reduce the risk, in very large and/or slow loading documents,
          //  that the location changes *after* the user has started interacting
          //  with the viewer, wait for either `pagesPromise` or a timeout.)
          await Promise.race([
            pagesPromise,
            new Promise((resolve) => {
              setTimeout(resolve, FORCE_PAGES_LOADED_TIMEOUT);
            }),
          ]);
          if (!initialBookmark && !hash) {
            return;
          }
          if (pdfViewer.hasEqualPageSizes) {
            return;
          }
          this.initialBookmark = initialBookmark;

          // eslint-disable-next-line no-self-assign
          pdfViewer.currentScaleValue = pdfViewer.currentScaleValue;
          // Re-apply the initial document location.
          this.setInitialView(hash);
        })
        .catch(() => {
          // Ensure that the document is always completely initialized,
          // even if there are any errors thrown above.
          this.setInitialView();
        })
        .then(function () {
          // At this point, rendering of the initial page(s) should always have
          // started (and may even have completed).
          // To prevent any future issues, e.g. the document being completely
          // blank on load, always trigger rendering here.
          pdfViewer.update();
        });
    });
    pagesPromise.then(
      () => {
        this._unblockDocumentLoadEvent();
        this._initializeAutoPrint(pdfDocument, openActionPromise);
      },
      (reason) => {
        this._documentError("pdfjs-loading-error", {
          message: reason.message,
        });
      }
    );
    onePageRendered.then((data) => {
      this.externalServices.reportTelemetry({
        type: "pageInfo",
        timestamp: data.timestamp,
      });
      if (this.pdfOutlineViewer) {
        pdfDocument.getOutline().then((outline) => {
          if (pdfDocument !== this.pdfDocument) {
            return; // The document was closed while the outline resolved.
          }
          this.pdfOutlineViewer.render({
            outline,
            pdfDocument,
          });
        });
      }
      if (this.pdfAttachmentViewer) {
        pdfDocument.getAttachments().then((attachments) => {
          if (pdfDocument !== this.pdfDocument) {
            return; // The document was closed while the attachments resolved.
          }
          this.pdfAttachmentViewer.render({
            attachments,
          });
        });
      }
      if (this.pdfLayerViewer) {
        // Ensure that the layers accurately reflects the current state in the
        // viewer itself, rather than the default state provided by the API.
        pdfViewer.optionalContentConfigPromise.then((optionalContentConfig) => {
          if (pdfDocument !== this.pdfDocument) {
            return; // The document was closed while the layers resolved.
          }
          this.pdfLayerViewer.render({
            optionalContentConfig,
            pdfDocument,
          });
        });
      }
    });
    this._initializePageLabels(pdfDocument);
    this._initializeMetadata(pdfDocument);
  }

  /**
   * @private
   */
  async _scriptingDocProperties(pdfDocument) {
    if (!this.documentInfo) {
      // It should be *extremely* rare for metadata to not have been resolved
      // when this code runs, but ensure that we handle that case here.
      await new Promise((resolve) => {
        this.eventBus._on("metadataloaded", resolve, {
          once: true,
        });
      });
      if (pdfDocument !== this.pdfDocument) {
        return null; // The document was closed while the metadata resolved.
      }
    }
    if (!this._contentLength) {
      // Always waiting for the entire PDF document to be loaded will, most
      // likely, delay sandbox-creation too much in the general case for all
      // PDF documents which are not provided as binary data to the API.
      // Hence we'll simply have to trust that the `contentLength` (as provided
      // by the server), when it exists, is accurate enough here.
      await new Promise((resolve) => {
        this.eventBus._on("documentloaded", resolve, {
          once: true,
        });
      });
      if (pdfDocument !== this.pdfDocument) {
        return null; // The document was closed while the downloadInfo resolved.
      }
    }
    return {
      ...this.documentInfo,
      baseURL: this.baseUrl,
      filesize: this._contentLength,
      filename: this._docFilename,
      metadata: this.metadata?.getRaw(),
      authors: this.metadata?.get("dc:creator"),
      numPages: this.pagesCount,
      URL: this.url,
    };
  }

  /**
   * @private
   */
  async _initializeAutoPrint(pdfDocument, openActionPromise) {
    const [openAction, jsActions] = await Promise.all([
      openActionPromise,
      this.pdfViewer.enableScripting ? null : pdfDocument.getJSActions(),
    ]);
    if (pdfDocument !== this.pdfDocument) {
      return; // The document was closed while the auto print data resolved.
    }
    let triggerAutoPrint = openAction?.action === "Print";
    if (jsActions) {
      console.warn("Warning: JavaScript support is not enabled");

      // Hack to support auto printing.
      for (const name in jsActions) {
        if (triggerAutoPrint) {
          break;
        }
        switch (name) {
          case "WillClose":
          case "WillSave":
          case "DidSave":
          case "WillPrint":
          case "DidPrint":
            continue;
        }
        triggerAutoPrint = jsActions[name].some((js) => AutoPrintRegExp.test(js));
      }
    }
    if (triggerAutoPrint) {
      this.triggerPrinting();
    }
  }

  /**
   * @private
   */
  async _initializeMetadata(pdfDocument) {
    const { info, metadata, contentDispositionFilename, contentLength } =
      await pdfDocument.getMetadata();
    if (pdfDocument !== this.pdfDocument) {
      return; // The document was closed while the metadata resolved.
    }
    this.documentInfo = info;
    this.metadata = metadata;
    this._contentDispositionFilename ??= contentDispositionFilename;
    this._contentLength ??= contentLength; // See `getDownloadInfo`-call above.

    // Provides some basic debug information
    console.log(
      `PDF ${pdfDocument.fingerprints[0]} [${info.PDFFormatVersion} ` +
        `${(info.Producer || "-").trim()} / ${(info.Creator || "-").trim()}] ` +
        `(PDF.js: ${version || "?"} [${build || "?"}])`
    );
    let pdfTitle = info.Title;
    const metadataTitle = metadata?.get("dc:title");
    if (metadataTitle) {
      // Ghostscript can produce invalid 'dc:title' Metadata entries:
      //  - The title may be "Untitled" (fixes bug 1031612).
      //  - The title may contain incorrectly encoded characters, which thus
      //    looks broken, hence we ignore the Metadata entry when it contains
      //    characters from the Specials Unicode block (fixes bug 1605526).
      if (metadataTitle !== "Untitled" && !/[\uFFF0-\uFFFF]/g.test(metadataTitle)) {
        pdfTitle = metadataTitle;
      }
    }
    if (pdfTitle) {
      this.setTitle(`${pdfTitle} - ${this._contentDispositionFilename || this._title}`);
    } else if (this._contentDispositionFilename) {
      this.setTitle(this._contentDispositionFilename);
    }
    if (info.IsXFAPresent && !info.IsAcroFormPresent && !pdfDocument.isPureXfa) {
      if (pdfDocument.loadingParams.enableXfa) {
        console.warn("Warning: XFA Foreground documents are not supported");
      } else {
        console.warn("Warning: XFA support is not enabled");
      }
    } else if ((info.IsAcroFormPresent || info.IsXFAPresent) && !this.pdfViewer.renderForms) {
      console.warn("Warning: Interactive form support is not enabled");
    }
    if (info.IsSignaturesPresent) {
      console.warn("Warning: Digital signatures validation is not supported");
    }
    this.eventBus.dispatch("metadataloaded", {
      source: this,
    });
  }

  /**
   * @private
   */
  async _initializePageLabels(pdfDocument) {
    const { appOptions: AppOptions } = this;
    if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
      return;
    }
    const labels = await pdfDocument.getPageLabels();
    if (pdfDocument !== this.pdfDocument) {
      return; // The document was closed while the page labels resolved.
    }
    if (!labels || AppOptions.get("disablePageLabels")) {
      return;
    }
    const numLabels = labels.length;
    // Ignore page labels that correspond to standard page numbering,
    // or page labels that are all empty.
    let standardLabels = 0,
      emptyLabels = 0;
    for (let i = 0; i < numLabels; i++) {
      const label = labels[i];
      if (label === (i + 1).toString()) {
        standardLabels++;
      } else if (label === "") {
        emptyLabels++;
      } else {
        break;
      }
    }
    if (standardLabels >= numLabels || emptyLabels >= numLabels) {
      return;
    }
    const { pdfViewer, pdfThumbnailViewer, toolbar } = this;
    pdfViewer.setPageLabels(labels);
    pdfThumbnailViewer?.setPageLabels(labels);

    // Changing toolbar page display to use labels and we need to set
    // the label of the current page.
    toolbar?.setPagesCount(numLabels, true);
    toolbar?.setPageNumber(pdfViewer.currentPageNumber, pdfViewer.currentPageLabel);
  }

  /**
   * @private
   */
  _initializePdfHistory({ fingerprint, viewOnLoad, initialDest = null }) {
    const { appOptions: AppOptions } = this;
    if (!this.pdfHistory) {
      return;
    }
    this.pdfHistory.initialize({
      fingerprint,
      resetHistory: viewOnLoad === ViewOnLoad.INITIAL,
      updateUrl: AppOptions.get("historyUpdateUrl"),
    });
    if (this.pdfHistory.initialBookmark) {
      this.initialBookmark = this.pdfHistory.initialBookmark;
      this.initialRotation = this.pdfHistory.initialRotation;
    }

    // Always let the browser history/document hash take precedence.
    if (initialDest && !this.initialBookmark && viewOnLoad === ViewOnLoad.UNKNOWN) {
      this.initialBookmark = JSON.stringify(initialDest);
      // TODO: Re-factor the `PDFHistory` initialization to remove this hack
      // that's currently necessary to prevent weird initial history state.
      this.pdfHistory.push({
        explicitDest: initialDest,
        pageNumber: null,
      });
    }
  }

  /**
   * @private
   */
  _initializeAnnotationStorageCallbacks(pdfDocument) {
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    const { annotationStorage } = pdfDocument;
    annotationStorage.onSetModified = () => {
      window.addEventListener("beforeunload", beforeUnload);
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        this._annotationStorageModified = true;
      }
    };
    annotationStorage.onResetModified = () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        delete this._annotationStorageModified;
      }
    };
    annotationStorage.onAnnotationEditor = (typeStr) => {
      this._hasAnnotationEditors = !!typeStr;
      this.setTitle();
    };
  }

  setInitialView(storedHash, { rotation, sidebarView, scrollMode, spreadMode } = {}) {
    const setRotation = (angle) => {
      if (isValidRotation(angle)) {
        this.pdfViewer.pagesRotation = angle;
      }
    };
    const setViewerModes = (scroll, spread) => {
      if (isValidScrollMode(scroll)) {
        this.pdfViewer.scrollMode = scroll;
      }
      if (isValidSpreadMode(spread)) {
        this.pdfViewer.spreadMode = spread;
      }
    };
    this.isInitialViewSet = true;
    this.pdfSidebar?.setInitialView(sidebarView);
    setViewerModes(scrollMode, spreadMode);
    if (this.initialBookmark) {
      setRotation(this.initialRotation);
      delete this.initialRotation;
      this.pdfLinkService.setHash(this.initialBookmark);
      this.initialBookmark = null;
    } else if (storedHash) {
      setRotation(rotation);
      this.pdfLinkService.setHash(storedHash);
    }

    // Ensure that the correct page number is displayed in the UI,
    // even if the active page didn't change during document load.
    this.toolbar?.setPageNumber(this.pdfViewer.currentPageNumber, this.pdfViewer.currentPageLabel);
    this.secondaryToolbar?.setPageNumber(this.pdfViewer.currentPageNumber);
    if (!this.pdfViewer.currentScaleValue) {
      // Scale was not initialized: invalid bookmark or scale was not specified.
      // Setting the default one.
      this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
    }
  }

  /**
   * @private
   */
  _cleanup() {
    const { appOptions: AppOptions } = this;
    if (!this.pdfDocument) {
      return; // run cleanup when document is loaded
    }
    this.pdfViewer.cleanup();
    this.pdfThumbnailViewer?.cleanup();
    this.pdfDocument.cleanup(/* keepLoadedFonts = */ AppOptions.get("fontExtraProperties"));
  }

  forceRendering() {
    this.pdfRenderingQueue.printing = !!this.printService;
    this.pdfRenderingQueue.isThumbnailViewEnabled =
      this.pdfSidebar?.visibleView === SidebarView.THUMBS;
    this.pdfRenderingQueue.renderHighestPriority();
  }

  beforePrint() {
    const { appOptions: AppOptions } = this;
    this._printAnnotationStoragePromise = this.pdfScriptingManager
      .dispatchWillPrint()
      .catch(() => {
        /* Avoid breaking printing; ignoring errors. */
      })
      .then(() => this.pdfDocument?.annotationStorage.print);
    if (this.printService) {
      // There is no way to suppress beforePrint/afterPrint events,
      // but PDFPrintService may generate double events -- this will ignore
      // the second event that will be coming from native window.print().
      return;
    }
    if (!this.supportsPrinting) {
      this._otherError("pdfjs-printing-not-supported");
      return;
    }

    // The beforePrint is a sync method and we need to know layout before
    // returning from this method. Ensure that we can get sizes of the pages.
    if (!this.pdfViewer.pageViewsReady) {
      this.l10n.get("pdfjs-printing-not-ready").then((msg) => {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      });
      return;
    }
    this.printService = PDFPrintServiceFactory.createPrintService({
      pdfDocument: this.pdfDocument,
      pagesOverview: this.pdfViewer.getPagesOverview(),
      printContainer: this.appConfig.printContainer,
      printResolution: AppOptions.get("printResolution"),
      printAnnotationStoragePromise: this._printAnnotationStoragePromise,
    });
    this.forceRendering();
    // Disable the editor-indicator during printing (fixes bug 1790552).
    this.setTitle();
    this.printService.layout();
    if (this._hasAnnotationEditors) {
      this.externalServices.reportTelemetry({
        type: "editing",
        data: {
          type: "print",
          stats: this.pdfDocument?.annotationStorage.editorStats,
        },
      });
    }
  }

  afterPrint() {
    if (this._printAnnotationStoragePromise) {
      this._printAnnotationStoragePromise.then(() => {
        this.pdfScriptingManager.dispatchDidPrint();
      });
      this._printAnnotationStoragePromise = null;
    }
    if (this.printService) {
      this.printService.destroy();
      this.printService = null;
      this.pdfDocument?.annotationStorage.resetModified();
    }
    this.forceRendering();
    // Re-enable the editor-indicator after printing (fixes bug 1790552).
    this.setTitle();
  }

  rotatePages(delta) {
    this.pdfViewer.pagesRotation += delta;
    // Note that the thumbnail viewer is updated, and rendering is triggered,
    // in the 'rotationchanging' event handler.
  }

  requestPresentationMode() {
    this.pdfPresentationMode?.request();
  }

  triggerPrinting() {
    if (!this.supportsPrinting) {
      return;
    }
    window.print();
  }

  bindEvents() {
    if (this._eventBusAbortController) {
      return;
    }
    this._eventBusAbortController = new AbortController();
    const {
      eventBus,
      _eventBusAbortController: { signal },
    } = this;
    eventBus._on("resize", webViewerResize, {
      signal,
    });
    eventBus._on("hashchange", webViewerHashchange, {
      signal,
    });
    eventBus._on("beforeprint", this.beforePrint.bind(this), {
      signal,
    });
    eventBus._on("afterprint", this.afterPrint.bind(this), {
      signal,
    });
    eventBus._on("pagerender", webViewerPageRender, {
      signal,
    });
    eventBus._on("pagerendered", webViewerPageRendered, {
      signal,
    });
    eventBus._on("updateviewarea", webViewerUpdateViewarea, {
      signal,
    });
    eventBus._on("pagechanging", webViewerPageChanging, {
      signal,
    });
    eventBus._on("scalechanging", webViewerScaleChanging, {
      signal,
    });
    eventBus._on("rotationchanging", webViewerRotationChanging, {
      signal,
    });
    eventBus._on("sidebarviewchanged", webViewerSidebarViewChanged, {
      signal,
    });
    eventBus._on("pagemode", webViewerPageMode, {
      signal,
    });
    eventBus._on("namedaction", webViewerNamedAction, {
      signal,
    });
    eventBus._on("presentationmodechanged", webViewerPresentationModeChanged, {
      signal,
    });
    eventBus._on("presentationmode", webViewerPresentationMode, {
      signal,
    });
    eventBus._on("switchannotationeditormode", webViewerSwitchAnnotationEditorMode, {
      signal,
    });
    eventBus._on("switchannotationeditorparams", webViewerSwitchAnnotationEditorParams, {
      signal,
    });
    eventBus._on("print", webViewerPrint, {
      signal,
    });
    eventBus._on("download", webViewerDownload, {
      signal,
    });
    eventBus._on("firstpage", webViewerFirstPage, {
      signal,
    });
    eventBus._on("lastpage", webViewerLastPage, {
      signal,
    });
    eventBus._on("nextpage", webViewerNextPage, {
      signal,
    });
    eventBus._on("previouspage", webViewerPreviousPage, {
      signal,
    });
    eventBus._on("zoomin", webViewerZoomIn, {
      signal,
    });
    eventBus._on("zoomout", webViewerZoomOut, {
      signal,
    });
    eventBus._on("zoomreset", webViewerZoomReset, {
      signal,
    });
    eventBus._on("pagenumberchanged", webViewerPageNumberChanged, {
      signal,
    });
    eventBus._on("scalechanged", webViewerScaleChanged, {
      signal,
    });
    eventBus._on("rotatecw", webViewerRotateCw, {
      signal,
    });
    eventBus._on("rotateccw", webViewerRotateCcw, {
      signal,
    });
    eventBus._on("optionalcontentconfig", webViewerOptionalContentConfig, {
      signal,
    });
    eventBus._on("switchscrollmode", webViewerSwitchScrollMode, {
      signal,
    });
    eventBus._on("scrollmodechanged", webViewerScrollModeChanged, {
      signal,
    });
    eventBus._on("switchspreadmode", webViewerSwitchSpreadMode, {
      signal,
    });
    eventBus._on("spreadmodechanged", webViewerSpreadModeChanged, {
      signal,
    });
    eventBus._on("documentproperties", webViewerDocumentProperties, {
      signal,
    });
    eventBus._on("findfromurlhash", webViewerFindFromUrlHash, {
      signal,
    });
    eventBus._on("updatefindmatchescount", webViewerUpdateFindMatchesCount, {
      signal,
    });
    eventBus._on("updatefindcontrolstate", webViewerUpdateFindControlState, {
      signal,
    });
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      eventBus._on("fileinputchange", webViewerFileInputChange, {
        signal,
      });
      eventBus._on("openfile", webViewerOpenFile, {
        signal,
      });
    }
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      eventBus._on("annotationeditorstateschanged", webViewerAnnotationEditorStatesChanged, {
        signal,
      });
      eventBus._on("reporttelemetry", webViewerReportTelemetry, {
        signal,
      });
    }
  }
  bindWindowEvents() {
    if (this._windowAbortController) {
      return;
    }
    this._windowAbortController = new AbortController();
    const {
      eventBus,
      appConfig: { mainContainer },
      _windowAbortController: { signal },
    } = this;
    function addWindowResolutionChange(evt = null) {
      if (evt) {
        webViewerResolutionChange(evt);
      }
      const mediaQueryList = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`
      );
      mediaQueryList.addEventListener("change", addWindowResolutionChange, {
        once: true,
        signal,
      });
    }
    addWindowResolutionChange();
    window.addEventListener("visibilitychange", webViewerVisibilityChange, {
      signal,
    });
    window.addEventListener("wheel", webViewerWheel, {
      passive: false,
      signal,
    });
    window.addEventListener("touchstart", webViewerTouchStart, {
      passive: false,
      signal,
    });
    window.addEventListener("touchmove", webViewerTouchMove, {
      passive: false,
      signal,
    });
    window.addEventListener("touchend", webViewerTouchEnd, {
      passive: false,
      signal,
    });
    window.addEventListener("click", webViewerClick, {
      signal,
    });
    window.addEventListener("keydown", webViewerKeyDown, {
      signal,
    });
    window.addEventListener("keyup", webViewerKeyUp, {
      signal,
    });
    window.addEventListener(
      "resize",
      () => {
        eventBus.dispatch("resize", {
          source: window,
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "hashchange",
      () => {
        eventBus.dispatch("hashchange", {
          source: window,
          hash: document.location.hash.substring(1),
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "beforeprint",
      () => {
        eventBus.dispatch("beforeprint", {
          source: window,
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "afterprint",
      () => {
        eventBus.dispatch("afterprint", {
          source: window,
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "updatefromsandbox",
      (event) => {
        eventBus.dispatch("updatefromsandbox", {
          source: window,
          detail: event.detail,
        });
      },
      {
        signal,
      }
    );
    if (
      (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) &&
      !("onscrollend" in document.documentElement)
    ) {
      return;
    }
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      // Using the values lastScrollTop and lastScrollLeft is a workaround to
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1881974.
      // TODO: remove them once the bug is fixed.
      ({ scrollTop: this._lastScrollTop, scrollLeft: this._lastScrollLeft } = mainContainer);
    }
    const scrollend = () => {
      if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
        ({ scrollTop: this._lastScrollTop, scrollLeft: this._lastScrollLeft } = mainContainer);
      }
      this._isScrolling = false;
      mainContainer.addEventListener("scroll", scroll, {
        passive: true,
        signal,
      });
      mainContainer.removeEventListener("scrollend", scrollend);
      mainContainer.removeEventListener("blur", scrollend);
    };
    const scroll = () => {
      if (this._isCtrlKeyDown) {
        return;
      }
      if (
        (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) &&
        this._lastScrollTop === mainContainer.scrollTop &&
        this._lastScrollLeft === mainContainer.scrollLeft
      ) {
        return;
      }
      mainContainer.removeEventListener("scroll", scroll, {
        passive: true,
      });
      this._isScrolling = true;
      mainContainer.addEventListener("scrollend", scrollend, {
        signal,
      });
      mainContainer.addEventListener("blur", scrollend, {
        signal,
      });
    };
    mainContainer.addEventListener("scroll", scroll, {
      passive: true,
      signal,
    });
  }
  unbindEvents() {
    this._eventBusAbortController?.abort();
    this._eventBusAbortController = null;
  }
  unbindWindowEvents() {
    this._windowAbortController?.abort();
    this._windowAbortController = null;
  }

  _accumulateTicks(ticks, prop) {
    // If the direction changed, reset the accumulated ticks.
    if ((this[prop] > 0 && ticks < 0) || (this[prop] < 0 && ticks > 0)) {
      this[prop] = 0;
    }
    this[prop] += ticks;
    const wholeTicks = Math.trunc(this[prop]);
    this[prop] -= wholeTicks;
    return wholeTicks;
  }

  _accumulateFactor(previousScale, factor, prop) {
    if (factor === 1) {
      return 1;
    }
    // If the direction changed, reset the accumulated factor.
    if ((this[prop] > 1 && factor < 1) || (this[prop] < 1 && factor > 1)) {
      this[prop] = 1;
    }
    const newFactor =
      Math.floor(previousScale * factor * this[prop] * 100) / (100 * previousScale);
    this[prop] = factor / newFactor;
    return newFactor;
  }

  /**
   * Should be called *after* all pages have loaded, or if an error occurred,
   * to unblock the "load" event; see https://bugzilla.mozilla.org/show_bug.cgi?id=1618553
   * @private
   */
  _unblockDocumentLoadEvent() {
    document.blockUnblockOnload?.(false);

    // Ensure that this method is only ever run once.
    this._unblockDocumentLoadEvent = () => {};
  }

  /**
   * Used together with the integration-tests, to enable awaiting full
   * initialization of the scripting/sandbox.
   */
  get scriptingReady() {
    return this.pdfScriptingManager.ready;
  }
}

export { ViewerApplication, PDFPrintServiceFactory };
