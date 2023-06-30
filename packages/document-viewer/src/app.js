import { createHelper } from "./app_helper.js";
import { ViewerApplication, PDFPrintServiceFactory } from "./default_app.js";
import { bindExternalService, bindPrintServiceFactory } from "./external_service.js";

class PDFViewerApplication extends ViewerApplication {
  constructor(appOptions) {
    super();
    this.appOptions = appOptions;
    this.helper = createHelper(this);

    this.bindServices();
  }

  bindServices() {
    bindExternalService(this);
    bindPrintServiceFactory(PDFPrintServiceFactory);
  }

  run(config) {
    const { webViewerInitialized } = this.helper;
    this.initialize(config).then(webViewerInitialized);
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
      webViewerSwitchAnnotationEditorMode,
      webViewerSwitchAnnotationEditorParams,
      webViewerAnnotationEditorStatesChanged,
      webViewerPageRender,
      webViewerOpenInExternalApp,
    } = this.helper;

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
    // eventBus._on("save", webViewerSave);
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

  setTitle(title = this._title) {
    this._title = title;
    if (this.isViewerEmbedded) {
      // Embedded PDF viewers should not be changing their parent page's title.
      return;
    }
    if (this.appOptions.get("disableAutoSetTitle")) {
      return;
    }
    const editorIndicator = this._hasAnnotationEditors && !this.pdfRenderingQueue.printing;
    document.title = `${editorIndicator ? "* " : ""}${title}`;
  }

  bindWindowEvents() {
    const { eventBus, _boundEvents } = this;

    const {
      webViewerVisibilityChange,
      webViewerWheel,
      webViewerTouchStart,
      webViewerTouchMove,
      webViewerTouchEnd,
      webViewerClick,
      webViewerKeyDown,
      webViewerKeyUp,
      webViewerResolutionChange,
    } = this.helper;

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
      webViewerPageRender,
      webViewerOpenInExternalApp,
    } = this.helper;

    eventBus._off("resize", webViewerResize);
    eventBus._off("hashchange", webViewerHashchange);
    eventBus._off("beforeprint", _boundEvents.beforePrint);
    eventBus._off("afterprint", _boundEvents.afterPrint);
    eventBus._on("pagerender", webViewerPageRender);
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
    // eventBus._off("save", webViewerSave);
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
      webViewerTouchMove,
      webViewerTouchEnd,
      webViewerClick,
      webViewerKeyDown,
      webViewerKeyUp,
    } = this.helper;

    window.removeEventListener("visibilitychange", webViewerVisibilityChange);
    window.removeEventListener("wheel", webViewerWheel, { passive: false });
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

  /**
   * @private
   */
  _initializeAnnotationStorageCallbacks(pdfDocument) {
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    const { annotationStorage } = pdfDocument;
    annotationStorage.onSetModified = () => {
      window.addEventListener("beforeunload", this.helper.beforeUnload);
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        this._annotationStorageModified = true;
      }
    };
    annotationStorage.onResetModified = () => {
      window.removeEventListener("beforeunload", this.helper.beforeUnload);
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
}

export { PDFViewerApplication };
