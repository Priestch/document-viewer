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
  OPS,
  PDFWorker,
  PromiseCapability,
  shadow,
  UnexpectedResponseException,
  version,
} from "pdfjs-lib";
import { AppOptions, OptionKind } from "../pdf.js/web/app_options.js";
import { AutomationEventBus, EventBus } from "../pdf.js/web/event_utils.js";
import { LinkTarget, PDFLinkService } from "../pdf.js/web/pdf_link_service.js";
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
import { PDFSidebarResizer } from "web-pdf_sidebar_resizer";
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
  /** @type {PDFSidebarResizer} */
  pdfSidebarResizer = null;
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
  constructor() {}
  // Called once when the document is loaded.
  async initialize(appConfig) {
    const { appOptions: AppOptions } = this;
    this.preferences = this.externalServices.createPreferences();
    this.appConfig = appConfig;
    await this._initializeOptions();
    this._forceCssTheme();
    await this._initializeL10n();
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

    // We can start UI localization now.
    const appContainer = appConfig.appContainer || document.documentElement;
    this.l10n.translate(appContainer).then(() => {
      // Dispatch the 'localized' event on the `eventBus` once the viewer
      // has been fully initialized and translated.
      this.eventBus.dispatch("localized", {
        source: this,
      });
    });
    this._initializedCapability.resolve();
  }
  /**
   * @private
   */
  async _initializeOptions() {
    const { appOptions: AppOptions } = this;
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      if (AppOptions.get("disablePreferences")) {
        if (AppOptions.get("pdfBugEnabled")) {
          await this._parseHashParams();
        }
        // Give custom implementations of the default viewer a simpler way to
        // opt-out of having the `Preferences` override existing `AppOptions`.
        return;
      }
      if (AppOptions._hasUserOptions()) {
        console.warn(
          "_initializeOptions: The Preferences may override manually set AppOptions; " +
            'please use the "disablePreferences"-option in order to prevent that.'
        );
      }
    }
    try {
      AppOptions.setAll(await this.preferences.getAll());
    } catch (reason) {
      console.error(`_initializeOptions: "${reason.message}".`);
    }
    if (AppOptions.get("pdfBugEnabled")) {
      await this._parseHashParams();
    }
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
        this._PDFBug.init(
          {
            OPS,
          },
          mainContainer,
          enabled
        );
      } catch (ex) {
        console.error(`_parseHashParams: "${ex.message}".`);
      }
    }
    // It is not possible to change locale for the (various) extension builds.
    if ((typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) && params.has("locale")) {
      AppOptions.set("locale", params.get("locale"));
    }
  }
  /**
   * @private
   */
  async _initializeL10n() {
    const { appOptions: AppOptions } = this;
    this.l10n = this.externalServices.createL10n(
      typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
        ? {
            locale: AppOptions.get("locale"),
          }
        : null
    );
    const dir = await this.l10n.getDirection();
    document.getElementsByTagName("html")[0].dir = dir;
  }
  /**
   * @private
   */
  _forceCssTheme() {
    const { appOptions: AppOptions } = this;
    const cssTheme = AppOptions.get("viewerCssTheme");
    if (
      cssTheme === ViewerCssTheme.AUTOMATIC ||
      !Object.values(ViewerCssTheme).includes(cssTheme)
    ) {
      return;
    }
    try {
      const styleSheet = document.styleSheets[0];
      const cssRules = styleSheet?.cssRules || [];
      for (let i = 0, ii = cssRules.length; i < ii; i++) {
        const rule = cssRules[i];
        if (rule instanceof CSSMediaRule && rule.media?.[0] === "(prefers-color-scheme: dark)") {
          if (cssTheme === ViewerCssTheme.LIGHT) {
            styleSheet.deleteRule(i);
            return;
          }
          // cssTheme === ViewerCssTheme.DARK
          const darkRules =
            /^@media \(prefers-color-scheme: dark\) {\n\s*([\w\s-.,:;/\\{}()]+)\n}$/.exec(
              rule.cssText
            );
          if (darkRules?.[1]) {
            styleSheet.deleteRule(i);
            styleSheet.insertRule(darkRules[1], i);
          }
          return;
        }
      }
    } catch (reason) {
      console.error(`_forceCssTheme: "${reason?.message}".`);
    }
  }
  /**
   * @private
   */
  async _initializeViewerComponents() {
    const { appOptions: AppOptions } = this;
    const { appConfig, externalServices } = this;
    const eventBus = externalServices.isInAutomation ? new AutomationEventBus() : new EventBus();
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
      sandboxBundleSrc:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC || CHROME")
          ? AppOptions.get("sandboxBundleSrc")
          : null,
      scriptingFactory: externalServices,
      docPropertiesLookup: this._scriptingDocProperties.bind(this),
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
    this.pdfViewer = new PDFViewer({
      container,
      viewer,
      eventBus,
      renderingQueue: pdfRenderingQueue,
      linkService: pdfLinkService,
      downloadManager,
      findController,
      scriptingManager: AppOptions.get("enableScripting") && pdfScriptingManager,
      l10n: this.l10n,
      textLayerMode: AppOptions.get("textLayerMode"),
      annotationMode: AppOptions.get("annotationMode"),
      annotationEditorMode,
      imageResourcesPath: AppOptions.get("imageResourcesPath"),
      enablePrintAutoRotate: AppOptions.get("enablePrintAutoRotate"),
      useOnlyCssZoom: AppOptions.get("useOnlyCssZoom"),
      isOffscreenCanvasSupported: AppOptions.get("isOffscreenCanvasSupported"),
      maxCanvasPixels: AppOptions.get("maxCanvasPixels"),
      enablePermissions: AppOptions.get("enablePermissions"),
      pageColors,
    });
    pdfRenderingQueue.setViewer(this.pdfViewer);
    pdfLinkService.setViewer(this.pdfViewer);
    pdfScriptingManager.setViewer(this.pdfViewer);
    if (appConfig.sidebar?.thumbnailView) {
      this.pdfThumbnailViewer = new PDFThumbnailViewer({
        container: appConfig.sidebar.thumbnailView,
        renderingQueue: pdfRenderingQueue,
        linkService: pdfLinkService,
        l10n: this.l10n,
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
      this.findBar = new PDFFindBar(appConfig.findBar, eventBus, this.l10n);
    }
    if (appConfig.annotationEditorParams) {
      if (annotationEditorMode !== AnnotationEditorType.DISABLE) {
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
        this.l10n,
        /* fileNameLookup = */ () => {
          return this._docFilename;
        }
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
        if (AppOptions.get("enableFloatingToolbar")) {
          this.toolbar = new Toolbar(appConfig.toolbar, eventBus, this.l10n);
        }
      } else {
        this.toolbar = new Toolbar(appConfig.toolbar, eventBus, this.l10n);
      }
    }
    if (appConfig.secondaryToolbar) {
      this.secondaryToolbar = new SecondaryToolbar(
        appConfig.secondaryToolbar,
        eventBus,
        this.externalServices
      );
    }
    if (this.supportsFullscreen && appConfig.secondaryToolbar?.presentationModeButton) {
      this.pdfPresentationMode = new PDFPresentationMode({
        container,
        pdfViewer: this.pdfViewer,
        eventBus,
      });
    }
    if (appConfig.passwordOverlay) {
      this.passwordPrompt = new PasswordPrompt(
        appConfig.passwordOverlay,
        this.overlayManager,
        this.l10n,
        this.isViewerEmbedded
      );
    }
    if (appConfig.sidebar?.outlineView) {
      this.pdfOutlineViewer = new PDFOutlineViewer({
        container: appConfig.sidebar.outlineView,
        eventBus,
        linkService: pdfLinkService,
        downloadManager,
      });
    }
    if (appConfig.sidebar?.attachmentsView) {
      this.pdfAttachmentViewer = new PDFAttachmentViewer({
        container: appConfig.sidebar.attachmentsView,
        eventBus,
        downloadManager,
      });
    }
    if (appConfig.sidebar?.layersView) {
      this.pdfLayerViewer = new PDFLayerViewer({
        container: appConfig.sidebar.layersView,
        eventBus,
        l10n: this.l10n,
      });
    }
    if (appConfig.sidebar) {
      this.pdfSidebar = new PDFSidebar({
        elements: appConfig.sidebar,
        pdfViewer: this.pdfViewer,
        pdfThumbnailViewer: this.pdfThumbnailViewer,
        eventBus,
        l10n: this.l10n,
      });
      this.pdfSidebar.onToggled = this.forceRendering.bind(this);
      this.pdfSidebarResizer = new PDFSidebarResizer(
        appConfig.sidebarResizer,
        eventBus,
        this.l10n
      );
    }
  }
  run(config) {
    this.initialize(config).then(webViewerInitialized);
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
  set page(val) {
    this.pdfViewer.currentPageNumber = val;
  }
  get supportsPrinting() {
    return PDFPrintServiceFactory.instance.supportsPrinting;
  }
  get supportsFullscreen() {
    return shadow(this, "supportsFullscreen", document.fullscreenEnabled);
  }
  get supportsPinchToZoom() {
    return this.externalServices.supportsPinchToZoom;
  }
  get supportsIntegratedFind() {
    return this.externalServices.supportsIntegratedFind;
  }
  get supportsDocumentFonts() {
    return this.externalServices.supportsDocumentFonts;
  }
  get loadingBar() {
    const barElement = document.getElementById("loadingBar");
    const bar = barElement ? new ProgressBar(barElement) : null;
    return shadow(this, "loadingBar", bar);
  }
  get supportedMouseWheelZoomModifierKeys() {
    return this.externalServices.supportedMouseWheelZoomModifierKeys;
  }
  initPassiveLoading() {
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL || CHROME")) {
      throw new Error("Not implemented: initPassiveLoading");
    }
    this.externalServices.initPassiveLoading({
      onOpenWithTransport: (range) => {
        this.open({
          range,
        });
      },
      onOpenWithData: (data, contentDispositionFilename) => {
        if (isPdfFile(contentDispositionFilename)) {
          this._contentDispositionFilename = contentDispositionFilename;
        }
        this.open({
          data,
        });
      },
      onOpenWithURL: (url, length, originalUrl) => {
        this.open({
          url,
          length,
          originalUrl,
        });
      },
      onError: (err) => {
        this.l10n.get("loading_error").then((msg) => {
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
    this.baseUrl = url.split("#")[0];
    if (downloadUrl) {
      this._downloadUrl = downloadUrl === url ? this.baseUrl : downloadUrl.split("#")[0];
    }
    if (isDataScheme(url)) {
      this._hideViewBookmark();
    }
    let title = getPdfFilenameFromUrl(url, "");
    if (!title) {
      try {
        title = decodeURIComponent(getFilenameFromUrl(url)) || url;
      } catch (ex) {
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
      } catch (reason) {
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
    promises.push(this.pdfScriptingManager.destroyPromise);
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
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      let deprecatedArgs = false;
      if (typeof args === "string") {
        args = {
          url: args,
        }; // URL
        deprecatedArgs = true;
      } else if (args?.byteLength) {
        args = {
          data: args,
        }; // ArrayBuffer
        deprecatedArgs = true;
      }
      if (deprecatedArgs) {
        console.error(
          "The `PDFViewerApplication.open` signature was updated, please use an object instead."
        );
      }
    }
    if (this.pdfLoadingTask) {
      // We need to destroy already opened document.
      await this.close();
    }
    // Set the necessary global worker parameters, using the available options.
    const workerParams = AppOptions.getAll(OptionKind.WORKER);
    Object.assign(GlobalWorkerOptions, workerParams);
    if ((typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) && args.url) {
      // The Firefox built-in viewer always calls `setTitleUsingUrl`, before
      // `initPassiveLoading`, and it never provides an `originalUrl` here.
      this.setTitleUsingUrl(args.originalUrl || args.url, /* downloadUrl = */ args.url);
    }
    // Set the necessary API parameters, using all the available options.
    const apiParams = AppOptions.getAll(OptionKind.API);
    const params = {
      canvasMaxAreaInBytes: this.externalServices.canvasMaxAreaInBytes,
      ...apiParams,
      ...args,
    };
    if (typeof PDFJSDev === "undefined") {
      params.docBaseUrl ||= document.URL.split("#")[0];
    } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
      params.docBaseUrl ||= this.baseUrl;
    }
    const loadingTask = getDocument(params);
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

        let key = "loading_error";
        if (reason instanceof InvalidPDFException) {
          key = "invalid_file_error";
        } else if (reason instanceof MissingPDFException) {
          key = "missing_file_error";
        } else if (reason instanceof UnexpectedResponseException) {
          key = "unexpected_response_error";
        }
        return this.l10n.get(key).then((msg) => {
          this._documentError(msg, {
            message: reason?.message,
          });
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
    } catch (reason) {
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
  openInExternalApp() {
    this.downloadOrSave({
      openInExternalApp: true,
    });
  }
  /**
   * Report the error; used for errors affecting loading and/or parsing of
   * the entire PDF document.
   */
  _documentError(message, moreInfo = null) {
    this._unblockDocumentLoadEvent();
    this._otherError(message, moreInfo);
    this.eventBus.dispatch("documenterror", {
      source: this,
      message,
      reason: moreInfo?.message ?? null,
    });
  }
  /**
   * Report the error; used for errors affecting e.g. only a single page.
   * @param {string} message - A message that is human readable.
   * @param {Object} [moreInfo] - Further information about the error that is
   *                              more technical. Should have a 'message' and
   *                              optionally a 'stack' property.
   */
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
    const pageLayoutPromise = pdfDocument.getPageLayout().catch(function () {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    const pageModePromise = pdfDocument.getPageMode().catch(function () {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    const openActionPromise = pdfDocument.getOpenAction().catch(function () {
      /* Avoid breaking initial rendering; ignoring errors. */
    });
    this.toolbar?.setPagesCount(pdfDocument.numPages, false);
    this.secondaryToolbar?.setPagesCount(pdfDocument.numPages);
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("CHROME")) {
      const baseUrl = location.href.split("#")[0];
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
        return Object.create(null);
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
          if (stored.page && viewOnLoad !== ViewOnLoad.INITIAL) {
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
          // NOTE: Ignore the pageMode/pageLayout in GeckoView since there's no
          // sidebar available, nor any UI for changing the Scroll/Spread modes.
          if (
            typeof PDFJSDev === "undefined" ? !window.isGECKOVIEW : !PDFJSDev.test("GECKOVIEW")
          ) {
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
        this.l10n.get("loading_error").then((msg) => {
          this._documentError(msg, {
            message: reason?.message,
          });
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
    const [openAction, javaScript] = await Promise.all([
      openActionPromise,
      !this.pdfViewer.enableScripting ? pdfDocument.getJavaScript() : null,
    ]);
    if (pdfDocument !== this.pdfDocument) {
      return; // The document was closed while the auto print data resolved.
    }

    let triggerAutoPrint = false;
    if (openAction?.action === "Print") {
      triggerAutoPrint = true;
    }
    if (javaScript) {
      javaScript.some((js) => {
        if (!js) {
          // Don't warn/fallback for empty JavaScript actions.
          return false;
        }
        console.warn("Warning: JavaScript support is not enabled");
        return true;
      });
      if (!triggerAutoPrint) {
        // Hack to support auto printing.
        for (const js of javaScript) {
          if (js && AutoPrintRegExp.test(js)) {
            triggerAutoPrint = true;
            break;
          }
        }
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
      if (typeStr) {
        this.externalServices.reportTelemetry({
          type: "editing",
          data: {
            type: typeStr,
          },
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
    if (!this.pdfDocument) {
      return; // run cleanup when document is loaded
    }

    this.pdfViewer.cleanup();
    this.pdfThumbnailViewer?.cleanup();
    this.pdfDocument.cleanup();
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
      .then(() => {
        return this.pdfDocument?.annotationStorage.print;
      });
    if (this.printService) {
      // There is no way to suppress beforePrint/afterPrint events,
      // but PDFPrintService may generate double events -- this will ignore
      // the second event that will be coming from native window.print().
      return;
    }
    if (!this.supportsPrinting) {
      this.l10n.get("printing_not_supported").then((msg) => {
        this._otherError(msg);
      });
      return;
    }

    // The beforePrint is a sync method and we need to know layout before
    // returning from this method. Ensure that we can get sizes of the pages.
    if (!this.pdfViewer.pageViewsReady) {
      this.l10n.get("printing_not_ready").then((msg) => {
        // eslint-disable-next-line no-alert
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
      this._printAnnotationStoragePromise,
      this.l10n
    );
    this.printService = printService;
    this.forceRendering();
    // Disable the editor-indicator during printing (fixes bug 1790552).
    this.setTitle();
    printService.layout();
    if (this._hasAnnotationEditors) {
      this.externalServices.reportTelemetry({
        type: "editing",
        data: {
          type: "print",
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
      mediaQueryList.addEventListener("change", addWindowResolutionChange, {
        once: true,
      });
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
      eventBus.dispatch("resize", {
        source: window,
      });
    };
    _boundEvents.windowHashChange = () => {
      eventBus.dispatch("hashchange", {
        source: window,
        hash: document.location.hash.substring(1),
      });
    };
    _boundEvents.windowBeforePrint = () => {
      eventBus.dispatch("beforeprint", {
        source: window,
      });
    };
    _boundEvents.windowAfterPrint = () => {
      eventBus.dispatch("afterprint", {
        source: window,
      });
    };
    _boundEvents.windowUpdateFromSandbox = (event) => {
      eventBus.dispatch("updatefromsandbox", {
        source: window,
        detail: event.detail,
      });
    };
    window.addEventListener("visibilitychange", webViewerVisibilityChange);
    window.addEventListener("wheel", webViewerWheel, {
      passive: false,
    });
    window.addEventListener("touchstart", webViewerTouchStart, {
      passive: false,
    });
    window.addEventListener("touchmove", webViewerTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", webViewerTouchEnd, {
      passive: false,
    });
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
    window.removeEventListener("wheel", webViewerWheel, {
      passive: false,
    });
    window.removeEventListener("touchstart", webViewerTouchStart, {
      passive: false,
    });
    window.removeEventListener("touchmove", webViewerTouchMove, {
      passive: false,
    });
    window.removeEventListener("touchend", webViewerTouchEnd, {
      passive: false,
    });
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
  _centerAtPos(previousScale, x, y) {
    const { pdfViewer } = this;
    const scaleDiff = pdfViewer.currentScale / previousScale - 1;
    if (scaleDiff !== 0) {
      const [top, left] = pdfViewer.containerTopLeft;
      pdfViewer.container.scrollLeft += (x - left) * scaleDiff;
      pdfViewer.container.scrollTop += (y - top) * scaleDiff;
    }
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