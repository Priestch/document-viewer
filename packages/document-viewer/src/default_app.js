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
  loadScript,
  MissingPDFException,
  PDFWorker,
  PromiseCapability,
  shadow,
  UnexpectedResponseException,
  version,
} from "pdfjs-lib";
import { AppOptions, OptionKind } from "../pdf.js/web/app_options.js";
import { AutomationEventBus, EventBus } from "../pdf.js/web/event_utils.js";
import { LinkTarget, PDFLinkService } from "../pdf.js/web/pdf_link_service.js";
import { AltTextManager } from "web-alt_text_manager";
import { AnnotationEditorParams } from "web-annotation_editor_params";
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
import { PDFRenderingQueue } from "../pdf.js/web/pdf_rendering_queue.js";
import { PDFScriptingManager } from "../pdf.js/web/pdf_scripting_manager.js";
import { PDFSidebar } from "web-pdf_sidebar";
import { PDFThumbnailViewer } from "web-pdf_thumbnail_viewer";
import { PDFViewer } from "../pdf.js/web/pdf_viewer.js";
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
const ViewerCssTheme = {
  AUTOMATIC: 0,
  // Default value.
  LIGHT: 1,
  DARK: 2,
};
/* Abstract factory for the print service. */
const PDFPrintServiceFactory = {
  instance: {
    supportsPrinting: false,
    createPrintService() {
      throw new Error("Not implemented: createPrintService");
    },
  },
};

class ViewerApplication {
  initialBookmark = document.location.hash.substring(1);
  _initializedCapability = new PromiseCapability();
  appConfig = null;
  pdfDocument = null;
  pdfLoadingTask = null;
  printService = null;
  pdfViewer = null;
  pdfThumbnailViewer = null;
  pdfRenderingQueue = null;
  pdfPresentationMode = null;
  pdfDocumentProperties = null;
  pdfLinkService = null;
  pdfHistory = null;
  pdfSidebar = null;
  pdfOutlineViewer = null;
  pdfAttachmentViewer = null;
  pdfLayerViewer = null;
  pdfCursorTools = null;
  pdfScriptingManager = null;
  store = null;
  downloadManager = null;
  overlayManager = null;
  preferences = null;
  toolbar = null;
  secondaryToolbar = null;
  eventBus = null;
  l10n = null;
  annotationEditorParams = null;
  isInitialViewSet = false;
  downloadComplete = false;
  isViewerEmbedded = window.parent !== window;
  url = "";
  baseUrl = "";
  _downloadUrl = "";
  externalServices = DefaultExternalServices;
  _boundEvents = Object.create(null);
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

  async initialize(appConfig) {
    const { appOptions: AppOptions } = this;
    let l10nPromise;
    if (typeof PDFJSDev !== "undefined" && !PDFJSDev.test("GENERIC")) {
      l10nPromise = this.externalServices.createL10n();
    }
    this.appConfig = appConfig;
    if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
      this._nimbusDataPromise = this.externalServices.getNimbusExperimentData();
    }
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
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      l10nPromise = this.externalServices.createL10n();
    }
    this.l10n = await l10nPromise;
    document.getElementsByTagName("html")[0].dir = this.l10n.getDirection();
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      this.l10n.translate(appConfig.appContainer || document.documentElement);
    }
    if (this.isViewerEmbedded && AppOptions.get("externalLinkTarget") === LinkTarget.NONE) {
      AppOptions.set("externalLinkTarget", LinkTarget.TOP);
    }
    await this._initializeViewerComponents();
    this.bindEvents();
    this.bindWindowEvents();
    this._initializedCapability.resolve();
  }

  async _parseHashParams(loadFakeWorker) {
    const { appOptions: AppOptions } = this;
    const hash = document.location.hash.substring(1);
    if (!hash) {
      return;
    }
    const { mainContainer, viewerContainer } = this.appConfig,
      params = parseQueryString(hash);
    if (params.get("disableworker") === "true") {
      try {
        await loadFakeWorker();
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
            await loadPDFBug(this);
            this._PDFBug.loadCSS();
          } catch (ex) {
            console.error(`_parseHashParams: "${ex.message}".`);
          }
          break;
      }
    }
    if (params.has("pdfbug")) {
      AppOptions.set("pdfBug", true);
      AppOptions.set("fontExtraProperties", true);
      const enabled = params.get("pdfbug").split(",");
      try {
        await loadPDFBug(this);
        this._PDFBug.init(mainContainer, enabled);
      } catch (ex) {
        console.error(`_parseHashParams: "${ex.message}".`);
      }
    }
    if ((typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) && params.has("locale")) {
      AppOptions.set("locale", params.get("locale"));
    }
  }

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
    const downloadManager = externalServices.createDownloadManager();
    this.downloadManager = downloadManager;
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
    const isOffscreenCanvasSupported =
      AppOptions.get("isOffscreenCanvasSupported") && FeatureTest.isOffscreenCanvasSupported;
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
      imageResourcesPath: AppOptions.get("imageResourcesPath"),
      enablePrintAutoRotate: AppOptions.get("enablePrintAutoRotate"),
      isOffscreenCanvasSupported,
      maxCanvasPixels: AppOptions.get("maxCanvasPixels"),
      enablePermissions: AppOptions.get("enablePermissions"),
      pageColors,
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
        if (!isOffscreenCanvasSupported) {
          appConfig.toolbar?.editorStampButton?.classList.add("hidden");
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
        () => this._docFilename
      );
    }
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
    this.preferences = this.externalServices.createPreferences();
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
      const fileInput = appConfig.openFileInput;
      fileInput.value = null;
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
        this.open({ url: file });
      } else {
        this._hideViewBookmark();
      }
    } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
      this.initPassiveLoading(file);
    } else {
      throw new Error("Not implemented: run");
    }
  }

  get initialized() {
    return this._initializedCapability.settled;
  }

  get initializedPromise() {
    return this._initializedCapability.promise;
  }

  zoomIn(steps, scaleFactor) {
    const { appOptions: AppOptions } = this;
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.increaseScale({
      drawingDelay: AppOptions.get("defaultZoomDelay"),
      steps,
      scaleFactor,
    });
  }

  zoomOut(steps, scaleFactor) {
    const { appOptions: AppOptions } = this;
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.decreaseScale({
      drawingDelay: AppOptions.get("defaultZoomDelay"),
      steps,
      scaleFactor,
    });
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

  get supportsPrinting() {
    return PDFPrintServiceFactory.instance.supportsPrinting;
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

  initPassiveLoading(file) {
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL || CHROME")) {
      throw new Error("Not implemented: initPassiveLoading");
    }
    this.setTitleUsingUrl(file, file);
    this.externalServices.initPassiveLoading({
      onOpenWithTransport: (range) => {
        this.open({ range });
      },
      onOpenWithData: (data, contentDispositionFilename) => {
        if (isPdfFile(contentDispositionFilename)) {
          this._contentDispositionFilename = contentDispositionFilename;
        }
        this.open({ data });
      },
      onOpenWithURL: (url, length, originalUrl) => {
        this.open({
          url,
          length,
          originalUrl,
        });
      },
      onError: (err) => {
        this.l10n.get("pdfjs-loading-error").then((msg) => {
          this._documentError(msg, err);
        });
      },
      onProgress: (loaded, total) => {
        this.progress(loaded / total);
      },
    });
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
        title = url;
      }
    }
    this.setTitle(title);
  }

  setTitle(title = this._title) {
    this._title = title;
    if (this.isViewerEmbedded) {
      return;
    }
    const editorIndicator = this._hasAnnotationEditors && !this.pdfRenderingQueue.printing;
    document.title = `${editorIndicator ? "* " : ""}${title}`;
  }

  get _docFilename() {
    return this._contentDispositionFilename || getPdfFilenameFromUrl(this.url);
  }

  _hideViewBookmark() {
    const { secondaryToolbar } = this.appConfig;
    secondaryToolbar?.viewBookmarkButton.classList.add("hidden");
    if (secondaryToolbar?.presentationModeButton.classList.contains("hidden")) {
      document.getElementById("viewBookmarkSeparator")?.classList.add("hidden");
    }
  }

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
        await this.save();
      } catch {}
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

  async open(args) {
    const { appOptions: AppOptions } = this;
    if (this.pdfLoadingTask) {
      await this.close();
    }
    const workerParams = AppOptions.getAll(OptionKind.WORKER);
    Object.assign(GlobalWorkerOptions, workerParams);
    if ((typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) && args.url) {
      this.setTitleUsingUrl(args.originalUrl || args.url, args.url);
    }
    if (typeof PDFJSDev === "undefined") {
      AppOptions.set("docBaseUrl", document.URL.split("#", 1)[0]);
    } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
      AppOptions.set("docBaseUrl", this.baseUrl);
    }
    const apiParams = AppOptions.getAll(OptionKind.API);
    const loadingTask = getDocument({
      ...apiParams,
      ...args,
    });
    this.pdfLoadingTask = loadingTask;
    loadingTask.onPassword = (updateCallback, reason) => {
      if (this.isViewerEmbedded) {
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
          return undefined;
        }
        let key = "pdfjs-loading-error";
        if (reason instanceof InvalidPDFException) {
          key = "pdfjs-invalid-file-error";
        } else if (reason instanceof MissingPDFException) {
          key = "pdfjs-missing-file-error";
        } else if (reason instanceof UnexpectedResponseException) {
          key = "pdfjs-unexpected-response-error";
        }
        return this.l10n.get(key).then((msg) => {
          this._documentError(msg, { message: reason?.message });
          throw reason;
        });
      }
    );
  }

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
      const blob = new Blob([data], { type: "application/pdf" });
      await this.downloadManager.download(blob, url, filename, options);
    } catch {
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
      const blob = new Blob([data], { type: "application/pdf" });
      await this.downloadManager.download(blob, url, filename, options);
    } catch (reason) {
      console.error(`Error when saving the document: ${reason.message}`);
      await this.download(options);
    } finally {
      await this.pdfScriptingManager.dispatchDidSave();
      this._saveInProgress = false;
    }
    if (this._hasAnnotationEditors) {
      this.externalServices.reportTelemetry({
        type: "editing",
        data: { type: "save" },
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

  openInExternalApp() {
    this.downloadOrSave({ openInExternalApp: true });
  }

  _documentError(message, moreInfo = null) {
    this._unblockDocumentLoadEvent();
    this._otherError(message, moreInfo);
    this.eventBus.dispatch("documenterror", {
      source: this,
      message,
      reason: moreInfo?.message ?? null,
    });
  }

  _otherError(message, moreInfo = null) {
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
  }

  progress(level) {
    const { appOptions: AppOptions } = this;
    if (!this.loadingBar || this.downloadComplete) {
      return;
    }
    const percent = Math.round(level * 100);
    if (percent <= this.loadingBar.percent) {
      return;
    }
    this.loadingBar.percent = percent;
    if (this.pdfDocument?.loadingParams.disableAutoFetch ?? AppOptions.get("disableAutoFetch")) {
      this.loadingBar.setDisableAutoFetch();
    }
  }

  load(pdfDocument) {
    const { appOptions: AppOptions } = this;
    this.pdfDocument = pdfDocument;
    pdfDocument.getDownloadInfo().then(({ length }) => {
      this._contentLength = length;
      this.downloadComplete = true;
      this.loadingBar?.hide();
      firstPagePromise.then(() => {
        this.eventBus.dispatch("documentloaded", { source: this });
      });
    });
    const pageLayoutPromise = pdfDocument.getPageLayout().catch(() => {});
    const pageModePromise = pdfDocument.getPageMode().catch(() => {});
    const openActionPromise = pdfDocument.getOpenAction().catch(() => {});
    this.toolbar?.setPagesCount(pdfDocument.numPages, false);
    this.secondaryToolbar?.setPagesCount(pdfDocument.numPages);
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME")) {
      const baseUrl = location.href.split("#", 1)[0];
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
      .catch(() => {});
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
          if (pageMode && sidebarView === SidebarView.UNKNOWN) {
            sidebarView = apiPageModeToSidebarView(pageMode);
          }
          if (
            pageLayout &&
            scrollMode === ScrollMode.UNKNOWN &&
            spreadMode === SpreadMode.UNKNOWN
          ) {
            const modes = apiPageLayoutToViewerModes(pageLayout);
            spreadMode = modes.spreadMode;
          }
          this.setInitialView(hash, {
            rotation,
            sidebarView,
            scrollMode,
            spreadMode,
          });
          this.eventBus.dispatch("documentinit", { source: this });
          if (!this.isViewerEmbedded) {
            pdfViewer.focus();
          }
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
          pdfViewer.currentScaleValue = pdfViewer.currentScaleValue;
          this.setInitialView(hash);
        })
        .catch(() => {
          this.setInitialView();
        })
        .then(function () {
          pdfViewer.update();
        });
    });
    pagesPromise.then(
      () => {
        this._unblockDocumentLoadEvent();
        this._initializeAutoPrint(pdfDocument, openActionPromise);
      },
      (reason) => {
        this.l10n.get("pdfjs-loading-error").then((msg) => {
          this._documentError(msg, { message: reason?.message });
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
            return;
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
            return;
          }
          this.pdfAttachmentViewer.render({ attachments });
        });
      }
      if (this.pdfLayerViewer) {
        pdfViewer.optionalContentConfigPromise.then((optionalContentConfig) => {
          if (pdfDocument !== this.pdfDocument) {
            return;
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

  async _scriptingDocProperties(pdfDocument) {
    if (!this.documentInfo) {
      await new Promise((resolve) => {
        this.eventBus._on("metadataloaded", resolve, { once: true });
      });
      if (pdfDocument !== this.pdfDocument) {
        return null;
      }
    }
    if (!this._contentLength) {
      await new Promise((resolve) => {
        this.eventBus._on("documentloaded", resolve, { once: true });
      });
      if (pdfDocument !== this.pdfDocument) {
        return null;
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

  async _initializeAutoPrint(pdfDocument, openActionPromise) {
    const [openAction, jsActions] = await Promise.all([
      openActionPromise,
      this.pdfViewer.enableScripting ? null : pdfDocument.getJSActions(),
    ]);
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    let triggerAutoPrint = openAction?.action === "Print";
    if (jsActions) {
      console.warn("Warning: JavaScript support is not enabled");
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

  async _initializeMetadata(pdfDocument) {
    const { info, metadata, contentDispositionFilename, contentLength } =
      await pdfDocument.getMetadata();
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    this.documentInfo = info;
    this.metadata = metadata;
    this._contentDispositionFilename ??= contentDispositionFilename;
    this._contentLength ??= contentLength;
    console.log(
      `PDF ${pdfDocument.fingerprints[0]} [${info.PDFFormatVersion} ` +
        `${(info.Producer || "-").trim()} / ${(info.Creator || "-").trim()}] ` +
        `(PDF.js: ${version || "?"} [${build || "?"}])`
    );
    let pdfTitle = info.Title;
    const metadataTitle = metadata?.get("dc:title");
    if (metadataTitle) {
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
    this.eventBus.dispatch("metadataloaded", { source: this });
  }

  async _initializePageLabels(pdfDocument) {
    const { appOptions: AppOptions } = this;
    if (typeof PDFJSDev === "undefined" ? window.isGECKOVIEW : PDFJSDev.test("GECKOVIEW")) {
      return;
    }
    const labels = await pdfDocument.getPageLabels();
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    if (!labels || AppOptions.get("disablePageLabels")) {
      return;
    }
    const numLabels = labels.length;
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
    toolbar?.setPagesCount(numLabels, true);
    toolbar?.setPageNumber(pdfViewer.currentPageNumber, pdfViewer.currentPageLabel);
  }

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
    if (initialDest && !this.initialBookmark && viewOnLoad === ViewOnLoad.UNKNOWN) {
      this.initialBookmark = JSON.stringify(initialDest);
      this.pdfHistory.push({
        explicitDest: initialDest,
        pageNumber: null,
      });
    }
  }

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
      if (typeStr) {
        this.externalServices.reportTelemetry({
          type: "editing",
          data: { type: typeStr },
        });
      }
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
    this.toolbar?.setPageNumber(this.pdfViewer.currentPageNumber, this.pdfViewer.currentPageLabel);
    this.secondaryToolbar?.setPageNumber(this.pdfViewer.currentPageNumber);
    if (!this.pdfViewer.currentScaleValue) {
      this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
    }
  }

  _cleanup() {
    const { appOptions: AppOptions } = this;
    if (!this.pdfDocument) {
      return;
    }
    this.pdfViewer.cleanup();
    this.pdfThumbnailViewer?.cleanup();
    this.pdfDocument.cleanup(AppOptions.get("fontExtraProperties"));
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
      .catch(() => {})
      .then(() => {
        return this.pdfDocument?.annotationStorage.print;
      });
    if (this.printService) {
      return;
    }
    if (!this.supportsPrinting) {
      this.l10n.get("pdfjs-printing-not-supported").then((msg) => {
        this._otherError(msg);
      });
      return;
    }
    if (!this.pdfViewer.pageViewsReady) {
      this.l10n.get("pdfjs-printing-not-ready").then((msg) => {
        window.alert(msg);
      });
      return;
    }
    const pagesOverview = this.pdfViewer.getPagesOverview();
    const printContainer = this.appConfig.printContainer;
    const printResolution = AppOptions.get("printResolution");
    const optionalContentConfigPromise = this.pdfViewer.optionalContentConfigPromise;
    const printService = PDFPrintServiceFactory.instance.createPrintService(
      this.pdfDocument,
      pagesOverview,
      printContainer,
      printResolution,
      optionalContentConfigPromise,
      this._printAnnotationStoragePromise
    );
    this.printService = printService;
    this.forceRendering();
    this.setTitle();
    printService.layout();
    if (this._hasAnnotationEditors) {
      this.externalServices.reportTelemetry({
        type: "editing",
        data: { type: "print" },
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
    this.setTitle();
  }

  rotatePages(delta) {
    this.pdfViewer.pagesRotation += delta;
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
    const { appOptions: AppOptions } = this;
    const { eventBus, _boundEvents } = this;
    _boundEvents.beforePrint = this.beforePrint.bind(this);
    _boundEvents.afterPrint = this.afterPrint.bind(this);
    eventBus._on("resize", webViewerResize);
    eventBus._on("hashchange", webViewerHashchange);
    eventBus._on("beforeprint", _boundEvents.beforePrint);
    eventBus._on("afterprint", _boundEvents.afterPrint);
    eventBus._on("pagerender", webViewerPageRender);
    eventBus._on("pagerendered", webViewerPageRendered);
    eventBus._on("updateviewarea", webViewerUpdateViewarea);
    eventBus._on("pagechanging", webViewerPageChanging);
    eventBus._on("scalechanging", webViewerScaleChanging);
    eventBus._on("rotationchanging", webViewerRotationChanging);
    eventBus._on("sidebarviewchanged", webViewerSidebarViewChanged);
    eventBus._on("pagemode", webViewerPageMode);
    eventBus._on("namedaction", webViewerNamedAction);
    eventBus._on("presentationmodechanged", webViewerPresentationModeChanged);
    eventBus._on("presentationmode", webViewerPresentationMode);
    eventBus._on("switchannotationeditormode", webViewerSwitchAnnotationEditorMode);
    eventBus._on("switchannotationeditorparams", webViewerSwitchAnnotationEditorParams);
    eventBus._on("print", webViewerPrint);
    eventBus._on("download", webViewerDownload);
    eventBus._on("openinexternalapp", webViewerOpenInExternalApp);
    eventBus._on("firstpage", webViewerFirstPage);
    eventBus._on("lastpage", webViewerLastPage);
    eventBus._on("nextpage", webViewerNextPage);
    eventBus._on("previouspage", webViewerPreviousPage);
    eventBus._on("zoomin", webViewerZoomIn);
    eventBus._on("zoomout", webViewerZoomOut);
    eventBus._on("zoomreset", webViewerZoomReset);
    eventBus._on("pagenumberchanged", webViewerPageNumberChanged);
    eventBus._on("scalechanged", webViewerScaleChanged);
    eventBus._on("rotatecw", webViewerRotateCw);
    eventBus._on("rotateccw", webViewerRotateCcw);
    eventBus._on("optionalcontentconfig", webViewerOptionalContentConfig);
    eventBus._on("switchscrollmode", webViewerSwitchScrollMode);
    eventBus._on("scrollmodechanged", webViewerScrollModeChanged);
    eventBus._on("switchspreadmode", webViewerSwitchSpreadMode);
    eventBus._on("spreadmodechanged", webViewerSpreadModeChanged);
    eventBus._on("documentproperties", webViewerDocumentProperties);
    eventBus._on("findfromurlhash", webViewerFindFromUrlHash);
    eventBus._on("updatefindmatchescount", webViewerUpdateFindMatchesCount);
    eventBus._on("updatefindcontrolstate", webViewerUpdateFindControlState);
    if (AppOptions.get("pdfBug")) {
      _boundEvents.reportPageStatsPDFBug = reportPageStatsPDFBug;
      eventBus._on("pagerendered", _boundEvents.reportPageStatsPDFBug);
      eventBus._on("pagechanging", _boundEvents.reportPageStatsPDFBug);
    }
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      eventBus._on("fileinputchange", webViewerFileInputChange);
      eventBus._on("openfile", webViewerOpenFile);
    }
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      eventBus._on("annotationeditorstateschanged", webViewerAnnotationEditorStatesChanged);
      eventBus._on("reporttelemetry", webViewerReportTelemetry);
    }
  }

  bindWindowEvents() {
    const { eventBus, _boundEvents } = this;

    function addWindowResolutionChange(evt = null) {
      if (evt) {
        webViewerResolutionChange(evt);
      }
      const mediaQueryList = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`
      );
      mediaQueryList.addEventListener("change", addWindowResolutionChange, { once: true });
      if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
        return;
      }
      _boundEvents.removeWindowResolutionChange ||= function () {
        mediaQueryList.removeEventListener("change", addWindowResolutionChange);
        _boundEvents.removeWindowResolutionChange = null;
      };
    }

    addWindowResolutionChange();
    _boundEvents.windowResize = () => {
      eventBus.dispatch("resize", { source: window });
    };
    _boundEvents.windowHashChange = () => {
      eventBus.dispatch("hashchange", {
        source: window,
        hash: document.location.hash.substring(1),
      });
    };
    _boundEvents.windowBeforePrint = () => {
      eventBus.dispatch("beforeprint", { source: window });
    };
    _boundEvents.windowAfterPrint = () => {
      eventBus.dispatch("afterprint", { source: window });
    };
    _boundEvents.windowUpdateFromSandbox = (event) => {
      eventBus.dispatch("updatefromsandbox", {
        source: window,
        detail: event.detail,
      });
    };
    window.addEventListener("visibilitychange", webViewerVisibilityChange);
    window.addEventListener("wheel", webViewerWheel, { passive: false });
    window.addEventListener("touchstart", webViewerTouchStart, { passive: false });
    window.addEventListener("touchmove", webViewerTouchMove, { passive: false });
    window.addEventListener("touchend", webViewerTouchEnd, { passive: false });
    window.addEventListener("click", webViewerClick);
    window.addEventListener("keydown", webViewerKeyDown);
    window.addEventListener("keyup", webViewerKeyUp);
    window.addEventListener("resize", _boundEvents.windowResize);
    window.addEventListener("hashchange", _boundEvents.windowHashChange);
    window.addEventListener("beforeprint", _boundEvents.windowBeforePrint);
    window.addEventListener("afterprint", _boundEvents.windowAfterPrint);
    window.addEventListener("updatefromsandbox", _boundEvents.windowUpdateFromSandbox);
  }

  unbindEvents() {
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      throw new Error("Not implemented: unbindEvents");
    }
    const { eventBus, _boundEvents } = this;
    eventBus._off("resize", webViewerResize);
    eventBus._off("hashchange", webViewerHashchange);
    eventBus._off("beforeprint", _boundEvents.beforePrint);
    eventBus._off("afterprint", _boundEvents.afterPrint);
    eventBus._off("pagerender", webViewerPageRender);
    eventBus._off("pagerendered", webViewerPageRendered);
    eventBus._off("updateviewarea", webViewerUpdateViewarea);
    eventBus._off("pagechanging", webViewerPageChanging);
    eventBus._off("scalechanging", webViewerScaleChanging);
    eventBus._off("rotationchanging", webViewerRotationChanging);
    eventBus._off("sidebarviewchanged", webViewerSidebarViewChanged);
    eventBus._off("pagemode", webViewerPageMode);
    eventBus._off("namedaction", webViewerNamedAction);
    eventBus._off("presentationmodechanged", webViewerPresentationModeChanged);
    eventBus._off("presentationmode", webViewerPresentationMode);
    eventBus._off("print", webViewerPrint);
    eventBus._off("download", webViewerDownload);
    eventBus._off("openinexternalapp", webViewerOpenInExternalApp);
    eventBus._off("firstpage", webViewerFirstPage);
    eventBus._off("lastpage", webViewerLastPage);
    eventBus._off("nextpage", webViewerNextPage);
    eventBus._off("previouspage", webViewerPreviousPage);
    eventBus._off("zoomin", webViewerZoomIn);
    eventBus._off("zoomout", webViewerZoomOut);
    eventBus._off("zoomreset", webViewerZoomReset);
    eventBus._off("pagenumberchanged", webViewerPageNumberChanged);
    eventBus._off("scalechanged", webViewerScaleChanged);
    eventBus._off("rotatecw", webViewerRotateCw);
    eventBus._off("rotateccw", webViewerRotateCcw);
    eventBus._off("optionalcontentconfig", webViewerOptionalContentConfig);
    eventBus._off("switchscrollmode", webViewerSwitchScrollMode);
    eventBus._off("scrollmodechanged", webViewerScrollModeChanged);
    eventBus._off("switchspreadmode", webViewerSwitchSpreadMode);
    eventBus._off("spreadmodechanged", webViewerSpreadModeChanged);
    eventBus._off("documentproperties", webViewerDocumentProperties);
    eventBus._off("findfromurlhash", webViewerFindFromUrlHash);
    eventBus._off("updatefindmatchescount", webViewerUpdateFindMatchesCount);
    eventBus._off("updatefindcontrolstate", webViewerUpdateFindControlState);
    if (_boundEvents.reportPageStatsPDFBug) {
      eventBus._off("pagerendered", _boundEvents.reportPageStatsPDFBug);
      eventBus._off("pagechanging", _boundEvents.reportPageStatsPDFBug);
      _boundEvents.reportPageStatsPDFBug = null;
    }
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      eventBus._off("fileinputchange", webViewerFileInputChange);
      eventBus._off("openfile", webViewerOpenFile);
    }
    _boundEvents.beforePrint = null;
    _boundEvents.afterPrint = null;
  }

  unbindWindowEvents() {
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      throw new Error("Not implemented: unbindWindowEvents");
    }
    const { _boundEvents } = this;
    window.removeEventListener("visibilitychange", webViewerVisibilityChange);
    window.removeEventListener("wheel", webViewerWheel, { passive: false });
    window.removeEventListener("touchstart", webViewerTouchStart, { passive: false });
    window.removeEventListener("touchmove", webViewerTouchMove, { passive: false });
    window.removeEventListener("touchend", webViewerTouchEnd, { passive: false });
    window.removeEventListener("click", webViewerClick);
    window.removeEventListener("keydown", webViewerKeyDown);
    window.removeEventListener("keyup", webViewerKeyUp);
    window.removeEventListener("resize", _boundEvents.windowResize);
    window.removeEventListener("hashchange", _boundEvents.windowHashChange);
    window.removeEventListener("beforeprint", _boundEvents.windowBeforePrint);
    window.removeEventListener("afterprint", _boundEvents.windowAfterPrint);
    window.removeEventListener("updatefromsandbox", _boundEvents.windowUpdateFromSandbox);
    _boundEvents.removeWindowResolutionChange?.();
    _boundEvents.windowResize = null;
    _boundEvents.windowHashChange = null;
    _boundEvents.windowBeforePrint = null;
    _boundEvents.windowAfterPrint = null;
    _boundEvents.windowUpdateFromSandbox = null;
  }

  _accumulateTicks(ticks, prop) {
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
    if ((this[prop] > 1 && factor < 1) || (this[prop] < 1 && factor > 1)) {
      this[prop] = 1;
    }
    const newFactor =
      Math.floor(previousScale * factor * this[prop] * 100) / (100 * previousScale);
    this[prop] = factor / newFactor;
    return newFactor;
  }

  _centerAtPos(previousScale, x, y) {
    const { pdfViewer } = this;
    const scaleDiff = pdfViewer.currentScale / previousScale - 1;
    if (scaleDiff !== 0) {
      const [top, left] = pdfViewer.containerTopLeft;
      pdfViewer.container.scrollLeft += (x - left) * scaleDiff;
      pdfViewer.container.scrollTop += (y - top) * scaleDiff;
    }
  }

  _unblockDocumentLoadEvent() {
    document.blockUnblockOnload?.(false);
    this._unblockDocumentLoadEvent = () => {};
  }

  get scriptingReady() {
    return this.pdfScriptingManager.ready;
  }
}

export { ViewerApplication, PDFPrintServiceFactory };
