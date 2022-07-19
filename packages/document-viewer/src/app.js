/* Copyright 2012 Mozilla Foundation
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

import {
  animationStarted,
  apiPageLayoutToViewerModes,
  apiPageModeToSidebarView,
  AutoPrintRegExp,
  DEFAULT_SCALE_VALUE,
  isValidRotation,
  isValidScrollMode,
  isValidSpreadMode,
  noContextMenuHandler,
  parseQueryString,
  ProgressBar,
  RendererType,
  ScrollMode,
  SidebarView,
  SpreadMode,
  TextLayerMode,
} from "../pdf.js/web/ui_utils.js";
import { OptionKind } from "../pdf.js/web/app_options.js";
import { AutomationEventBus, EventBus } from "../pdf.js/web/event_utils.js";
import {
  build,
  createPromiseCapability,
  getDocument,
  getFilenameFromUrl,
  getPdfFilenameFromUrl,
  GlobalWorkerOptions,
  InvalidPDFException,
  isPdfFile,
  loadScript,
  MissingPDFException,
  OPS,
  PDFWorker,
  shadow,
  UnexpectedResponseException,
  UNSUPPORTED_FEATURES,
  version,
} from "pdfjs-lib";
import { CursorTool, PDFCursorTools } from "../pdf.js/web/pdf_cursor_tools.js";
import { LinkTarget, PDFLinkService } from "../pdf.js/web/pdf_link_service.js";
import { OverlayManager } from "../pdf.js/web/overlay_manager.js";
import { PasswordPrompt } from "../pdf.js/web/password_prompt.js";
import { PDFAttachmentViewer } from "../pdf.js/web/pdf_attachment_viewer.js";
import { PDFDocumentProperties } from "../pdf.js/web/pdf_document_properties.js";
import { PDFFindBar } from "../pdf.js/web/pdf_find_bar.js";
import { PDFFindController } from "../pdf.js/web/pdf_find_controller.js";
import { PDFHistory } from "../pdf.js/web/pdf_history.js";
import { PDFLayerViewer } from "../pdf.js/web/pdf_layer_viewer.js";
import { PDFOutlineViewer } from "../pdf.js/web/pdf_outline_viewer.js";
import { PDFPresentationMode } from "../pdf.js/web/pdf_presentation_mode.js";
import { PDFRenderingQueue } from "../pdf.js/web/pdf_rendering_queue.js";
import { PDFScriptingManager } from "../pdf.js/web/pdf_scripting_manager.js";
import { PDFSidebar } from "../pdf.js/web/pdf_sidebar.js";
import { PDFSidebarResizer } from "../pdf.js/web/pdf_sidebar_resizer.js";
import { PDFThumbnailViewer } from "../pdf.js/web/pdf_thumbnail_viewer.js";
import { PDFViewer } from "../pdf.js/web/pdf_viewer.js";
import { SecondaryToolbar } from "../pdf.js/web/secondary_toolbar.js";
import { Toolbar } from "../pdf.js/web/toolbar.js";
import { ViewHistory } from "../pdf.js/web/view_history.js";
import { createHelper } from "./app_helper.js";
import { DefaultExternalServices } from "./default_external_services.js";
import { bindExternalService, bindPrintServiceFactory } from "./external_service.js";

const DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT = 5000; // ms
const FORCE_PAGES_LOADED_TIMEOUT = 10000; // ms

const ViewOnLoad = {
  UNKNOWN: -1,
  PREVIOUS: 0, // Default value.
  INITIAL: 1,
};

const ViewerCssTheme = {
  AUTOMATIC: 0, // Default value.
  LIGHT: 1,
  DARK: 2,
};

// Keep these in sync with mozilla-central's Histograms.json.
const KNOWN_VERSIONS = [
  "1.0",
  "1.1",
  "1.2",
  "1.3",
  "1.4",
  "1.5",
  "1.6",
  "1.7",
  "1.8",
  "1.9",
  "2.0",
  "2.1",
  "2.2",
  "2.3",
];
// Keep these in sync with mozilla-central's Histograms.json.
const KNOWN_GENERATORS = [
  "acrobat distiller",
  "acrobat pdfwriter",
  "adobe livecycle",
  "adobe pdf library",
  "adobe photoshop",
  "ghostscript",
  "tcpdf",
  "cairo",
  "dvipdfm",
  "dvips",
  "pdftex",
  "pdfkit",
  "itext",
  "prince",
  "quarkxpress",
  "mac os x",
  "microsoft",
  "openoffice",
  "oracle",
  "luradocument",
  "pdf-xchange",
  "antenna house",
  "aspose.cells",
  "fpdf",
];

/* Abstract factory for the print service. */
const PDFPrintServiceFactory = {
  instance: {
    supportsPrinting: false,
    createPrintService() {
      throw new Error("Not implemented: createPrintService");
    },
  },
};

class PDFViewerApplication {
  initialBookmark = document.location.hash.substring(1);
  _initializedCapability = createPromiseCapability();
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
  _docStats = null;
  _wheelUnusedTicks = 0;
  _idleCallbacks = new Set();
  _PDFBug = null;

  constructor(appOptions) {
    this.appOptions = appOptions;
    this.helper = createHelper(this);

    this.bindServices();
  }

  bindServices() {
    bindExternalService(this);
    bindPrintServiceFactory(PDFPrintServiceFactory);
  }

  // Called once when the document is loaded.
  async initialize(appConfig) {
    const AppOptions = this.appOptions;

    this.preferences = this.externalServices.createPreferences();
    this.appConfig = appConfig;

    await this._readPreferences();
    await this._parseHashParameters();
    this._forceCssTheme();
    await this._initializeL10n();

    if (
      this.isViewerEmbedded &&
      AppOptions.get("externalLinkTarget") === LinkTarget.NONE
    ) {
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
      this.eventBus.dispatch("localized", { source: this });
    });

    this._initializedCapability.resolve();
  }

  /**
   * @private
   */
  async _readPreferences() {
    const AppOptions = this.appOptions;

    if (
      typeof PDFJSDev === "undefined" ||
      PDFJSDev.test("!PRODUCTION || GENERIC")
    ) {
      if (AppOptions.get("disablePreferences")) {
        // Give custom implementations of the default viewer a simpler way to
        // opt-out of having the `Preferences` override existing `AppOptions`.
        return;
      }
      if (AppOptions._hasUserOptions()) {
        console.warn(
          "_readPreferences: The Preferences may override manually set AppOptions; " +
            'please use the "disablePreferences"-option in order to prevent that.'
        );
      }
    }
    try {
      AppOptions.setAll(await this.preferences.getAll());
    } catch (reason) {
      console.error(`_readPreferences: "${reason?.message}".`);
    }
  }

  /**
   * Potentially parse special debugging flags in the hash section of the URL.
   * @private
   */
  async _parseHashParameters() {
    const AppOptions = this.appOptions;

    if (!AppOptions.get("pdfBugEnabled")) {
      return;
    }
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
        console.error(`_parseHashParameters: "${ex.message}".`);
      }
    }
    if (params.has("disablerange")) {
      AppOptions.set("disableRange", params.get("disablerange") === "true");
    }
    if (params.has("disablestream")) {
      AppOptions.set("disableStream", params.get("disablestream") === "true");
    }
    if (params.has("disableautofetch")) {
      AppOptions.set(
        "disableAutoFetch",
        params.get("disableautofetch") === "true"
      );
    }
    if (params.has("disablefontface")) {
      AppOptions.set(
        "disableFontFace",
        params.get("disablefontface") === "true"
      );
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
            console.error(`_parseHashParameters: "${ex.message}".`);
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
        this._PDFBug.init({ OPS }, mainContainer, enabled);
      } catch (ex) {
        console.error(`_parseHashParameters: "${ex.message}".`);
      }
    }
    // It is not possible to change locale for the (various) extension builds.
    if (
      (typeof PDFJSDev === "undefined" ||
        PDFJSDev.test("!PRODUCTION || GENERIC")) &&
      params.has("locale")
    ) {
      AppOptions.set("locale", params.get("locale"));
    }
  }

  /**
   * @private
   */
  async _initializeL10n() {
    const AppOptions = this.appOptions;

    this.l10n = this.externalServices.createL10n(
      typeof PDFJSDev === "undefined" || PDFJSDev.test("!PRODUCTION || GENERIC")
        ? { locale: AppOptions.get("locale") }
        : null
    );
    const dir = await this.l10n.getDirection();
    document.getElementsByTagName("html")[0].dir = dir;
  }

  /**
   * @private
   */
  _forceCssTheme() {
    const AppOptions = this.appOptions;

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
        if (
          rule instanceof CSSMediaRule &&
          rule.media?.[0] === "(prefers-color-scheme: dark)"
        ) {
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
    const AppOptions = this.appOptions;
    const { appConfig, externalServices } = this;

    const eventBus = externalServices.isInAutomation
      ? new AutomationEventBus()
      : new EventBus();
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
    });
    this.findController = findController;

    const pdfScriptingManager = new PDFScriptingManager({
      eventBus,
      sandboxBundleSrc:
        typeof PDFJSDev === "undefined" ||
        PDFJSDev.test("!PRODUCTION || GENERIC || CHROME")
          ? AppOptions.get("sandboxBundleSrc")
          : null,
      scriptingFactory: externalServices,
      docPropertiesLookup: this._scriptingDocProperties.bind(this),
    });
    this.pdfScriptingManager = pdfScriptingManager;

    const container = appConfig.mainContainer;
    const viewer = appConfig.viewerContainer;
    this.pdfViewer = new PDFViewer({
      container,
      viewer,
      eventBus,
      renderingQueue: pdfRenderingQueue,
      linkService: pdfLinkService,
      downloadManager,
      findController,
      scriptingManager:
        AppOptions.get("enableScripting") && pdfScriptingManager,
      renderer: AppOptions.get("renderer"),
      l10n: this.l10n,
      textLayerMode: AppOptions.get("textLayerMode"),
      annotationMode: AppOptions.get("annotationMode"),
      imageResourcesPath: AppOptions.get("imageResourcesPath"),
      enablePrintAutoRotate: AppOptions.get("enablePrintAutoRotate"),
      useOnlyCssZoom: AppOptions.get("useOnlyCssZoom"),
      maxCanvasPixels: AppOptions.get("maxCanvasPixels"),
      enablePermissions: AppOptions.get("enablePermissions"),
      pageColors: {
        background: AppOptions.get("pageColorsBackground"),
        foreground: AppOptions.get("pageColorsForeground"),
      },
    });
    pdfRenderingQueue.setViewer(this.pdfViewer);
    pdfLinkService.setViewer(this.pdfViewer);
    pdfScriptingManager.setViewer(this.pdfViewer);

    this.pdfThumbnailViewer = new PDFThumbnailViewer({
      container: appConfig.sidebar.thumbnailView,
      eventBus,
      renderingQueue: pdfRenderingQueue,
      linkService: pdfLinkService,
      l10n: this.l10n,
    });
    pdfRenderingQueue.setThumbnailViewer(this.pdfThumbnailViewer);

    // The browsing history is only enabled when the viewer is standalone,
    // i.e. not when it is embedded in a web page.
    if (!this.isViewerEmbedded && !AppOptions.get("disableHistory")) {
      this.pdfHistory = new PDFHistory({
        linkService: pdfLinkService,
        eventBus,
      });
      pdfLinkService.setHistory(this.pdfHistory);
    }

    if (!this.supportsIntegratedFind) {
      this.findBar = new PDFFindBar(appConfig.findBar, eventBus, this.l10n);
    }

    this.pdfDocumentProperties = new PDFDocumentProperties(
      appConfig.documentProperties,
      this.overlayManager,
      eventBus,
      this.l10n
    );

    this.pdfCursorTools = new PDFCursorTools({
      container,
      eventBus,
      cursorToolOnLoad: AppOptions.get("cursorToolOnLoad"),
    });

    this.toolbar = new Toolbar(appConfig.toolbar, eventBus, this.l10n);

    this.secondaryToolbar = new SecondaryToolbar(
      appConfig.secondaryToolbar,
      eventBus
    );

    if (this.supportsFullscreen) {
      this.pdfPresentationMode = new PDFPresentationMode({
        container,
        pdfViewer: this.pdfViewer,
        eventBus,
      });
    }

    this.passwordPrompt = new PasswordPrompt(
      appConfig.passwordOverlay,
      this.overlayManager,
      this.l10n,
      this.isViewerEmbedded
    );

    this.pdfOutlineViewer = new PDFOutlineViewer({
      container: appConfig.sidebar.outlineView,
      eventBus,
      linkService: pdfLinkService,
    });

    this.pdfAttachmentViewer = new PDFAttachmentViewer({
      container: appConfig.sidebar.attachmentsView,
      eventBus,
      downloadManager,
    });

    this.pdfLayerViewer = new PDFLayerViewer({
      container: appConfig.sidebar.layersView,
      eventBus,
      l10n: this.l10n,
    });

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

  run(config) {
    const { webViewerInitialized } = this.helper;
    this.initialize(config).then(webViewerInitialized);
  }

  get initialized() {
    return this._initializedCapability.settled;
  }

  get initializedPromise() {
    return this._initializedCapability.promise;
  }

  zoomIn(steps) {
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.increaseScale(steps);
  }

  zoomOut(steps) {
    if (this.pdfViewer.isInPresentationMode) {
      return;
    }
    this.pdfViewer.decreaseScale(steps);
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

  get supportsIntegratedFind() {
    return this.externalServices.supportsIntegratedFind;
  }

  get supportsDocumentFonts() {
    return this.externalServices.supportsDocumentFonts;
  }

  get loadingBar() {
    const bar = new ProgressBar("#loadingBar");
    return shadow(this, "loadingBar", bar);
  }

  get supportedMouseWheelZoomModifierKeys() {
    return this.externalServices.supportedMouseWheelZoomModifierKeys;
  }

  initPassiveLoading() {
    if (
      typeof PDFJSDev === "undefined" ||
      !PDFJSDev.test("MOZCENTRAL || CHROME")
    ) {
      throw new Error("Not implemented: initPassiveLoading");
    }
    this.externalServices.initPassiveLoading({
      onOpenWithTransport: (url, length, transport) => {
        this.open(url, { length, range: transport });
      },
      onOpenWithData: (data, contentDispositionFilename) => {
        if (isPdfFile(contentDispositionFilename)) {
          this._contentDispositionFilename = contentDispositionFilename;
        }
        this.open(data);
      },
      onOpenWithURL: (url, length, originalUrl) => {
        const file = originalUrl !== undefined ? { url, originalUrl } : url;
        const args = length !== undefined ? { length } : null;

        this.open(file, args);
      },
      onError: err => {
        this.l10n.get("loading_error").then(msg => {
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
      this._downloadUrl =
        downloadUrl === url ? this.baseUrl : downloadUrl.split("#")[0];
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

  setTitle(title) {
    if (this.isViewerEmbedded) {
      // Embedded PDF viewers should not be changing their parent page's title.
      return;
    }
    document.title = title;
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
    // URL does not reflect proper document location - hiding some buttons.
    const { toolbar, secondaryToolbar } = this.appConfig;
    toolbar.viewBookmark.hidden = true;
    secondaryToolbar.viewBookmarkButton.hidden = true;
  }

  /**
   * @private
   */
  _cancelIdleCallbacks() {
    if (!this._idleCallbacks.size) {
      return;
    }
    for (const callback of this._idleCallbacks) {
      window.cancelIdleCallback(callback);
    }
    this._idleCallbacks.clear();
  }

  /**
   * Closes opened PDF document.
   * @returns {Promise} - Returns the promise, which is resolved when all
   *                      destruction is completed.
   */
  async close() {
    this._unblockDocumentLoadEvent();
    this._hideViewBookmark();

    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      const { container } = this.appConfig.errorWrapper;
      container.hidden = true;
    }

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
        await this.save({ sourceEventType: "save" });
      } catch (reason) {
        // Ignoring errors, to ensure that document closing won't break.
      }
    }
    const promises = [];

    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;

    if (this.pdfDocument) {
      this.pdfDocument = null;

      this.pdfThumbnailViewer.setDocument(null);
      this.pdfViewer.setDocument(null);
      this.pdfLinkService.setDocument(null);
      this.pdfDocumentProperties.setDocument(null);
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
    this._docStats = null;

    this._cancelIdleCallbacks();
    promises.push(this.pdfScriptingManager.destroyPromise);

    this.pdfSidebar.reset();
    this.pdfOutlineViewer.reset();
    this.pdfAttachmentViewer.reset();
    this.pdfLayerViewer.reset();

    this.pdfHistory?.reset();
    this.findBar?.reset();
    this.toolbar.reset();
    this.secondaryToolbar.reset();
    this._PDFBug?.cleanup();

    await Promise.all(promises);
  }

  /**
   * Opens PDF document specified by URL or array with additional arguments.
   * @param {string|TypedArray|ArrayBuffer} file - PDF location or binary data.
   * @param {Object} [args] - Additional arguments for the getDocument call,
   *                          e.g. HTTP headers ('httpHeaders') or alternative
   *                          data transport ('range').
   * @returns {Promise} - Returns the promise, which is resolved when document
   *                      is opened.
   */
  async open(file, args) {
    const AppOptions = this.appOptions;

    if (this.pdfLoadingTask) {
      // We need to destroy already opened document.
      await this.close();
    }
    // Set the necessary global worker parameters, using the available options.
    const workerParameters = AppOptions.getAll(OptionKind.WORKER);
    for (const key in workerParameters) {
      GlobalWorkerOptions[key] = workerParameters[key];
    }

    const parameters = Object.create(null);
    if (typeof file === "string") {
      // URL
      this.setTitleUsingUrl(file, /* downloadUrl = */ file);
      parameters.url = file;
    } else if (file && "byteLength" in file) {
      // ArrayBuffer
      parameters.data = file;
    } else if (file.url && file.originalUrl) {
      this.setTitleUsingUrl(file.originalUrl, /* downloadUrl = */ file.url);
      parameters.url = file.url;
    }
    // Set the necessary API parameters, using the available options.
    const apiParameters = AppOptions.getAll(OptionKind.API);
    for (const key in apiParameters) {
      let value = apiParameters[key];

      if (key === "docBaseUrl" && !value) {
        if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("PRODUCTION")) {
          value = document.URL.split("#")[0];
        } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
          value = this.baseUrl;
        }
      }
      parameters[key] = value;
    }
    // Finally, update the API parameters with the arguments (if they exist).
    if (args) {
      for (const key in args) {
        parameters[key] = args[key];
      }
    }

    const loadingTask = getDocument(parameters);
    this.pdfLoadingTask = loadingTask;

    loadingTask.onPassword = (updateCallback, reason) => {
      this.pdfLinkService.externalLinkEnabled = false;
      this.passwordPrompt.setUpdateCallback(updateCallback, reason);
      this.passwordPrompt.open();
    };

    loadingTask.onProgress = ({ loaded, total }) => {
      this.progress(loaded / total);
    };

    // Listen for unsupported features to report telemetry.
    loadingTask.onUnsupportedFeature = this.fallback.bind(this);

    return loadingTask.promise.then(
      pdfDocument => {
        this.load(pdfDocument);
      },
      reason => {
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
        return this.l10n.get(key).then(msg => {
          this._documentError(msg, { message: reason?.message });
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

  async download({ sourceEventType = "download" } = {}) {
    const url = this._downloadUrl,
      filename = this._docFilename;
    try {
      this._ensureDownloadComplete();

      const data = await this.pdfDocument.getData();
      const blob = new Blob([data], { type: "application/pdf" });

      await this.downloadManager.download(blob, url, filename, sourceEventType);
    } catch (reason) {
      // When the PDF document isn't ready, or the PDF file is still
      // downloading, simply download using the URL.
      await this.downloadManager.downloadUrl(url, filename);
    }
  }

  async save({ sourceEventType = "download" } = {}) {
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

      await this.downloadManager.download(blob, url, filename, sourceEventType);
    } catch (reason) {
      // When the PDF document isn't ready, or the PDF file is still
      // downloading, simply fallback to a "regular" download.
      console.error(`Error when saving the document: ${reason.message}`);
      await this.download({ sourceEventType });
    } finally {
      await this.pdfScriptingManager.dispatchDidSave();
      this._saveInProgress = false;
    }
  }

  downloadOrSave(options) {
    if (this.pdfDocument?.annotationStorage.size > 0) {
      this.save(options);
    } else {
      this.download(options);
    }
  }

  fallback(featureId) {
    this.externalServices.reportTelemetry({
      type: "unsupportedFeature",
      featureId,
    });
  }

  /**
   * Show the error box; used for errors affecting loading and/or parsing of
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
   * Show the error box; used for errors affecting e.g. only a single page.
   *
   * @param {string} message - A message that is human readable.
   * @param {Object} [moreInfo] - Further information about the error that is
   *                              more technical.  Should have a 'message' and
   *                              optionally a 'stack' property.
   */
  _otherError(message, moreInfo = null) {
    const moreInfoText = [
      this.l10n.get("error_version_info", {
        version: version || "?",
        build: build || "?",
      }),
    ];
    if (moreInfo) {
      moreInfoText.push(
        this.l10n.get("error_message", { message: moreInfo.message })
      );
      if (moreInfo.stack) {
        moreInfoText.push(
          this.l10n.get("error_stack", { stack: moreInfo.stack })
        );
      } else {
        if (moreInfo.filename) {
          moreInfoText.push(
            this.l10n.get("error_file", { file: moreInfo.filename })
          );
        }
        if (moreInfo.lineNumber) {
          moreInfoText.push(
            this.l10n.get("error_line", { line: moreInfo.lineNumber })
          );
        }
      }
    }

    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      const errorWrapperConfig = this.appConfig.errorWrapper;
      const errorWrapper = errorWrapperConfig.container;
      errorWrapper.hidden = false;

      const errorMessage = errorWrapperConfig.errorMessage;
      errorMessage.textContent = message;

      const closeButton = errorWrapperConfig.closeButton;
      closeButton.onclick = function () {
        errorWrapper.hidden = true;
      };

      const errorMoreInfo = errorWrapperConfig.errorMoreInfo;
      const moreInfoButton = errorWrapperConfig.moreInfoButton;
      const lessInfoButton = errorWrapperConfig.lessInfoButton;
      moreInfoButton.onclick = function () {
        errorMoreInfo.hidden = false;
        moreInfoButton.hidden = true;
        lessInfoButton.hidden = false;
        errorMoreInfo.style.height = errorMoreInfo.scrollHeight + "px";
      };
      lessInfoButton.onclick = function () {
        errorMoreInfo.hidden = true;
        moreInfoButton.hidden = false;
        lessInfoButton.hidden = true;
      };
      moreInfoButton.oncontextmenu = noContextMenuHandler;
      lessInfoButton.oncontextmenu = noContextMenuHandler;
      closeButton.oncontextmenu = noContextMenuHandler;
      moreInfoButton.hidden = false;
      lessInfoButton.hidden = true;
      Promise.all(moreInfoText).then(parts => {
        errorMoreInfo.value = parts.join("\n");
      });
    } else {
      Promise.all(moreInfoText).then(parts => {
        console.error(message + "\n" + parts.join("\n"));
      });
      this.fallback();
    }
  }

  progress(level) {
    const AppOptions = this.appOptions;

    if (this.downloadComplete) {
      // Don't accidentally show the loading bar again when the entire file has
      // already been fetched (only an issue when disableAutoFetch is enabled).
      return;
    }
    const percent = Math.round(level * 100);
    // When we transition from full request to range requests, it's possible
    // that we discard some of the loaded data. This can cause the loading
    // bar to move backwards. So prevent this by only updating the bar if it
    // increases.
    if (percent > this.loadingBar.percent || isNaN(percent)) {
      this.loadingBar.percent = percent;

      // When disableAutoFetch is enabled, it's not uncommon for the entire file
      // to never be fetched (depends on e.g. the file structure). In this case
      // the loading bar will not be completely filled, nor will it be hidden.
      // To prevent displaying a partially filled loading bar permanently, we
      // hide it when no data has been loaded during a certain amount of time.
      const disableAutoFetch = this.pdfDocument
        ? this.pdfDocument.loadingParams.disableAutoFetch
        : AppOptions.get("disableAutoFetch");

      if (disableAutoFetch && percent) {
        if (this.disableAutoFetchLoadingBarTimeout) {
          clearTimeout(this.disableAutoFetchLoadingBarTimeout);
          this.disableAutoFetchLoadingBarTimeout = null;
        }
        this.loadingBar.show();

        this.disableAutoFetchLoadingBarTimeout = setTimeout(() => {
          this.loadingBar.hide();
          this.disableAutoFetchLoadingBarTimeout = null;
        }, DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT);
      }
    }
  }

  load(pdfDocument) {
    this.pdfDocument = pdfDocument;
    const AppOptions = this.appOptions;

    pdfDocument.getDownloadInfo().then(({ length }) => {
      this._contentLength = length; // Ensure that the correct length is used.
      this.downloadComplete = true;
      this.loadingBar.hide();

      firstPagePromise.then(() => {
        this.eventBus.dispatch("documentloaded", { source: this });
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

    this.toolbar.setPagesCount(pdfDocument.numPages, false);
    this.secondaryToolbar.setPagesCount(pdfDocument.numPages);

    let baseDocumentUrl;
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      baseDocumentUrl = null;
    } else if (PDFJSDev.test("MOZCENTRAL")) {
      baseDocumentUrl = this.baseUrl;
    } else if (PDFJSDev.test("CHROME")) {
      baseDocumentUrl = location.href.split("#")[0];
    }
    this.pdfLinkService.setDocument(pdfDocument, baseDocumentUrl);
    this.pdfDocumentProperties.setDocument(pdfDocument, this.url);

    const pdfViewer = this.pdfViewer;
    pdfViewer.setDocument(pdfDocument);
    const { firstPagePromise, onePageRendered, pagesPromise } = pdfViewer;

    const pdfThumbnailViewer = this.pdfThumbnailViewer;
    pdfThumbnailViewer.setDocument(pdfDocument);

    const storedPromise = (this.store = new ViewHistory(
      pdfDocument.fingerprints[0]
    ))
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

    firstPagePromise.then(pdfPage => {
      this.loadingBar.setWidth(this.appConfig.viewerContainer);
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
          this.eventBus.dispatch("documentinit", { source: this });
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
            new Promise(resolve => {
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
      reason => {
        this.l10n.get("loading_error").then(msg => {
          this._documentError(msg, { message: reason?.message });
        });
      }
    );

    onePageRendered.then(data => {
      this.externalServices.reportTelemetry({
        type: "pageInfo",
        timestamp: data.timestamp,
      });

      pdfDocument.getOutline().then(outline => {
        if (pdfDocument !== this.pdfDocument) {
          return; // The document was closed while the outline resolved.
        }
        this.pdfOutlineViewer.render({ outline, pdfDocument });
      });
      pdfDocument.getAttachments().then(attachments => {
        if (pdfDocument !== this.pdfDocument) {
          return; // The document was closed while the attachments resolved.
        }
        this.pdfAttachmentViewer.render({ attachments });
      });
      // Ensure that the layers accurately reflects the current state in the
      // viewer itself, rather than the default state provided by the API.
      pdfViewer.optionalContentConfigPromise.then(optionalContentConfig => {
        if (pdfDocument !== this.pdfDocument) {
          return; // The document was closed while the layers resolved.
        }
        this.pdfLayerViewer.render({ optionalContentConfig, pdfDocument });
      });
      if (
        (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) ||
        "requestIdleCallback" in window
      ) {
        const callback = window.requestIdleCallback(
          () => {
            this._collectTelemetry(pdfDocument);
            this._idleCallbacks.delete(callback);
          },
          { timeout: 1000 }
        );
        this._idleCallbacks.add(callback);
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
      await new Promise(resolve => {
        this.eventBus._on("metadataloaded", resolve, { once: true });
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
      await new Promise(resolve => {
        this.eventBus._on("documentloaded", resolve, { once: true });
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
   * A place to fetch data for telemetry after one page is rendered and the
   * viewer is idle.
   * @private
   */
  async _collectTelemetry(pdfDocument) {
    const markInfo = await this.pdfDocument.getMarkInfo();
    if (pdfDocument !== this.pdfDocument) {
      return; // Document was closed while waiting for mark info.
    }
    const tagged = markInfo?.Marked || false;
    this.externalServices.reportTelemetry({
      type: "tagged",
      tagged,
    });
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
      javaScript.some(js => {
        if (!js) {
          // Don't warn/fallback for empty JavaScript actions.
          return false;
        }
        console.warn("Warning: JavaScript support is not enabled");
        this.fallback(UNSUPPORTED_FEATURES.javaScript);
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
        `(PDF.js: ${version || "-"})`
    );
    let pdfTitle = info?.Title;

    const metadataTitle = metadata?.get("dc:title");
    if (metadataTitle) {
      // Ghostscript can produce invalid 'dc:title' Metadata entries:
      //  - The title may be "Untitled" (fixes bug 1031612).
      //  - The title may contain incorrectly encoded characters, which thus
      //    looks broken, hence we ignore the Metadata entry when it
      //    contains characters from the Specials Unicode block
      //    (fixes bug 1605526).
      if (
        metadataTitle !== "Untitled" &&
        !/[\uFFF0-\uFFFF]/g.test(metadataTitle)
      ) {
        pdfTitle = metadataTitle;
      }
    }
    if (pdfTitle) {
      this.setTitle(
        `${pdfTitle} - ${contentDispositionFilename || document.title}`
      );
    } else if (contentDispositionFilename) {
      this.setTitle(contentDispositionFilename);
    }

    if (
      info.IsXFAPresent &&
      !info.IsAcroFormPresent &&
      !pdfDocument.isPureXfa
    ) {
      if (pdfDocument.loadingParams.enableXfa) {
        console.warn("Warning: XFA Foreground documents are not supported");
      } else {
        console.warn("Warning: XFA support is not enabled");
      }
      this.fallback(UNSUPPORTED_FEATURES.forms);
    } else if (
      (info.IsAcroFormPresent || info.IsXFAPresent) &&
      !this.pdfViewer.renderForms
    ) {
      console.warn("Warning: Interactive form support is not enabled");
      this.fallback(UNSUPPORTED_FEATURES.forms);
    }

    if (info.IsSignaturesPresent) {
      console.warn("Warning: Digital signatures validation is not supported");
      this.fallback(UNSUPPORTED_FEATURES.signatures);
    }

    // Telemetry labels must be C++ variable friendly.
    let versionId = "other";
    if (KNOWN_VERSIONS.includes(info.PDFFormatVersion)) {
      versionId = `v${info.PDFFormatVersion.replace(".", "_")}`;
    }
    let generatorId = "other";
    if (info.Producer) {
      const producer = info.Producer.toLowerCase();
      KNOWN_GENERATORS.some(function (generator) {
        if (!producer.includes(generator)) {
          return false;
        }
        generatorId = generator.replace(/[ .-]/g, "_");
        return true;
      });
    }
    let formType = null;
    if (info.IsXFAPresent) {
      formType = "xfa";
    } else if (info.IsAcroFormPresent) {
      formType = "acroform";
    }
    this.externalServices.reportTelemetry({
      type: "documentInfo",
      version: versionId,
      generator: generatorId,
      formType,
    });

    this.eventBus.dispatch("metadataloaded", { source: this });
  }

  /**
   * @private
   */
  async _initializePageLabels(pdfDocument) {
    const AppOptions = this.appOptions;
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
    pdfThumbnailViewer.setPageLabels(labels);

    // Changing toolbar page display to use labels and we need to set
    // the label of the current page.
    toolbar.setPagesCount(numLabels, true);
    toolbar.setPageNumber(
      pdfViewer.currentPageNumber,
      pdfViewer.currentPageLabel
    );
  }

  /**
   * @private
   */
  _initializePdfHistory({ fingerprint, viewOnLoad, initialDest = null }) {
    const AppOptions = this.appOptions;

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
    if (
      initialDest &&
      !this.initialBookmark &&
      viewOnLoad === ViewOnLoad.UNKNOWN
    ) {
      this.initialBookmark = JSON.stringify(initialDest);
      // TODO: Re-factor the `PDFHistory` initialization to remove this hack
      // that's currently necessary to prevent weird initial history state.
      this.pdfHistory.push({ explicitDest: initialDest, pageNumber: null });
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
  }

  setInitialView(
    storedHash,
    { rotation, sidebarView, scrollMode, spreadMode } = {}
  ) {
    const setRotation = angle => {
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
    this.pdfSidebar.setInitialView(sidebarView);

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
    this.toolbar.setPageNumber(
      this.pdfViewer.currentPageNumber,
      this.pdfViewer.currentPageLabel
    );
    this.secondaryToolbar.setPageNumber(this.pdfViewer.currentPageNumber);

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
    this.pdfThumbnailViewer.cleanup();

    // We don't want to remove fonts used by active page SVGs.
    this.pdfDocument.cleanup(
      /* keepLoadedFonts = */ this.pdfViewer.renderer === RendererType.SVG
    );
  }

  forceRendering() {
    this.pdfRenderingQueue.printing = !!this.printService;
    this.pdfRenderingQueue.isThumbnailViewEnabled =
      this.pdfSidebar.isThumbnailViewVisible;
    this.pdfRenderingQueue.renderHighestPriority();
  }

  beforePrint() {
    const AppOptions = this.appOptions;

    // Given that the "beforeprint" browser event is synchronous, we
    // unfortunately cannot await the scripting event dispatching here.
    this.pdfScriptingManager.dispatchWillPrint();

    if (this.printService) {
      // There is no way to suppress beforePrint/afterPrint events,
      // but PDFPrintService may generate double events -- this will ignore
      // the second event that will be coming from native window.print().
      return;
    }

    if (!this.supportsPrinting) {
      this.l10n.get("printing_not_supported").then(msg => {
        this._otherError(msg);
      });
      return;
    }

    // The beforePrint is a sync method and we need to know layout before
    // returning from this method. Ensure that we can get sizes of the pages.
    if (!this.pdfViewer.pageViewsReady) {
      this.l10n.get("printing_not_ready").then(msg => {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      });
      return;
    }

    const pagesOverview = this.pdfViewer.getPagesOverview();
    const printContainer = this.appConfig.printContainer;
    const printResolution = AppOptions.get("printResolution");
    const optionalContentConfigPromise =
      this.pdfViewer.optionalContentConfigPromise;

    const printService = PDFPrintServiceFactory.instance.createPrintService(
      this.pdfDocument,
      pagesOverview,
      printContainer,
      printResolution,
      optionalContentConfigPromise,
      this.l10n
    );
    this.printService = printService;
    this.forceRendering();

    printService.layout();

    this.externalServices.reportTelemetry({
      type: "print",
    });
  }

  afterPrint() {
    // Given that the "afterprint" browser event is synchronous, we
    // unfortunately cannot await the scripting event dispatching here.
    this.pdfScriptingManager.dispatchDidPrint();

    if (this.printService) {
      this.printService.destroy();
      this.printService = null;

      this.pdfDocument?.annotationStorage.resetModified();
    }
    this.forceRendering();
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
    const AppOptions = this.appOptions;
    const { eventBus, _boundEvents } = this;

    _boundEvents.beforePrint = this.beforePrint.bind(this);
    _boundEvents.afterPrint = this.afterPrint.bind(this);

    const {
      webViewerResize,
      webViewerHashchange,
      webViewerPageRendered,
      webViewerUpdateViewarea,
      webViewerPageChanging,
      webViewerScaleChanging,
      webViewerRotationChanging,
      webViewerSidebarViewChanged,
      webViewerPageMode,
      webViewerNamedAction,
      webViewerPresentationModeChanged,
      webViewerPresentationMode,
      webViewerPrint,
      webViewerDownload,
      webViewerSave,
      webViewerFirstPage,
      webViewerLastPage,
      webViewerNextPage,
      webViewerPreviousPage,
      webViewerZoomIn,
      webViewerZoomOut,
      webViewerZoomReset,
      webViewerPageNumberChanged,
      webViewerScaleChanged,
      webViewerRotateCw,
      webViewerRotateCcw,
      webViewerOptionalContentConfig,
      webViewerSwitchScrollMode,
      webViewerScrollModeChanged,
      webViewerSwitchSpreadMode,
      webViewerSpreadModeChanged,
      webViewerDocumentProperties,
      webViewerFindFromUrlHash,
      webViewerUpdateFindMatchesCount,
      webViewerUpdateFindControlState,
      reportPageStatsPDFBug,
      webViewerFileInputChange,
      webViewerOpenFile,
    } = this.helper;

    eventBus._on("resize", webViewerResize);
    eventBus._on("hashchange", webViewerHashchange);
    eventBus._on("beforeprint", _boundEvents.beforePrint);
    eventBus._on("afterprint", _boundEvents.afterPrint);
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
    eventBus._on("print", webViewerPrint);
    eventBus._on("download", webViewerDownload);
    eventBus._on("save", webViewerSave);
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
  }

  bindWindowEvents() {
    const { eventBus, _boundEvents } = this;

    const {
      webViewerVisibilityChange,
      webViewerWheel,
      webViewerTouchStart,
      webViewerClick,
      webViewerKeyDown,
    } = this.helper;


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
    _boundEvents.windowUpdateFromSandbox = event => {
      eventBus.dispatch("updatefromsandbox", {
        source: window,
        detail: event.detail,
      });
    };

    window.addEventListener("visibilitychange", webViewerVisibilityChange);
    window.addEventListener("wheel", webViewerWheel, { passive: false });
    window.addEventListener("touchstart", webViewerTouchStart, {
      passive: false,
    });
    window.addEventListener("click", webViewerClick);
    window.addEventListener("keydown", webViewerKeyDown);
    window.addEventListener("resize", _boundEvents.windowResize);
    window.addEventListener("hashchange", _boundEvents.windowHashChange);
    window.addEventListener("beforeprint", _boundEvents.windowBeforePrint);
    window.addEventListener("afterprint", _boundEvents.windowAfterPrint);
    window.addEventListener(
      "updatefromsandbox",
      _boundEvents.windowUpdateFromSandbox
    );
  }

  unbindEvents() {
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      throw new Error("Not implemented: unbindEvents");
    }
    const { eventBus, _boundEvents } = this;

    const {
      webViewerResize,
      webViewerHashchange,
      webViewerPageRendered,
      webViewerUpdateViewarea,
      webViewerPageChanging,
      webViewerScaleChanging,
      webViewerRotationChanging,
      webViewerSidebarViewChanged,
      webViewerPageMode,
      webViewerNamedAction,
      webViewerPresentationModeChanged,
      webViewerPresentationMode,
      webViewerPrint,
      webViewerDownload,
      webViewerSave,
      webViewerFirstPage,
      webViewerLastPage,
      webViewerNextPage,
      webViewerPreviousPage,
      webViewerZoomIn,
      webViewerZoomOut,
      webViewerZoomReset,
      webViewerPageNumberChanged,
      webViewerScaleChanged,
      webViewerRotateCw,
      webViewerRotateCcw,
      webViewerOptionalContentConfig,
      webViewerSwitchScrollMode,
      webViewerScrollModeChanged,
      webViewerSwitchSpreadMode,
      webViewerSpreadModeChanged,
      webViewerDocumentProperties,
      webViewerFindFromUrlHash,
      webViewerUpdateFindMatchesCount,
      webViewerUpdateFindControlState,
      reportPageStatsPDFBug,
      webViewerFileInputChange,
      webViewerOpenFile,
    } = this.helper;

    eventBus._off("resize", webViewerResize);
    eventBus._off("hashchange", webViewerHashchange);
    eventBus._off("beforeprint", _boundEvents.beforePrint);
    eventBus._off("afterprint", _boundEvents.afterPrint);
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
    eventBus._off("save", webViewerSave);
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

    const {
      webViewerVisibilityChange,
      webViewerWheel,
      webViewerTouchStart,
      webViewerClick,
      webViewerKeyDown,
    } = this.helper;

    window.removeEventListener("visibilitychange", webViewerVisibilityChange);
    window.removeEventListener("wheel", webViewerWheel, { passive: false });
    window.removeEventListener("touchstart", webViewerTouchStart, {
      passive: false,
    });
    window.removeEventListener("click", webViewerClick);
    window.removeEventListener("keydown", webViewerKeyDown);
    window.removeEventListener("resize", _boundEvents.windowResize);
    window.removeEventListener("hashchange", _boundEvents.windowHashChange);
    window.removeEventListener("beforeprint", _boundEvents.windowBeforePrint);
    window.removeEventListener("afterprint", _boundEvents.windowAfterPrint);
    window.removeEventListener(
      "updatefromsandbox",
      _boundEvents.windowUpdateFromSandbox
    );

    _boundEvents.windowResize = null;
    _boundEvents.windowHashChange = null;
    _boundEvents.windowBeforePrint = null;
    _boundEvents.windowAfterPrint = null;
    _boundEvents.windowUpdateFromSandbox = null;
  }

  accumulateWheelTicks(ticks) {
    // If the scroll direction changed, reset the accumulated wheel ticks.
    if (
      (this._wheelUnusedTicks > 0 && ticks < 0) ||
      (this._wheelUnusedTicks < 0 && ticks > 0)
    ) {
      this._wheelUnusedTicks = 0;
    }
    this._wheelUnusedTicks += ticks;
    const wholeTicks =
      Math.sign(this._wheelUnusedTicks) *
      Math.floor(Math.abs(this._wheelUnusedTicks));
    this._wheelUnusedTicks -= wholeTicks;
    return wholeTicks;
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
   * @ignore
   */
  _reportDocumentStatsTelemetry() {
    const { stats } = this.pdfDocument;
    if (stats !== this._docStats) {
      this._docStats = stats;

      this.externalServices.reportTelemetry({
        type: "documentStats",
        stats,
      });
    }
  }

  /**
   * Used together with the integration-tests, to enable awaiting full
   * initialization of the scripting/sandbox.
   */
  get scriptingReady() {
    return this.pdfScriptingManager.ready;
  }
}

export {
  PDFViewerApplication,
};
