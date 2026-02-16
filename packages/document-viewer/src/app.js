import { createHelper } from "./app_helper.js";
import { ViewerApplication, PDFPrintServiceFactory } from "./default_app.js";
import { bindExternalService, bindPrintServiceFactory } from "./external_service.js";
import { shadow } from "pdfjs-lib";

class PDFViewerApplication extends ViewerApplication {
  constructor(appOptions) {
    super();
    this.appOptions = appOptions;
    this.helper = createHelper(this);

    this.bindServices();
  }

  get externalServices() {
    const services = bindExternalService(this);
    return shadow(this, "externalServices", services);
  }

  bindServices() {
    bindPrintServiceFactory(PDFPrintServiceFactory);
  }

  run(config) {
    const { validateFileURL } = this.helper;
    return super.run(config, validateFileURL);
  }

  _parseHashParams() {
    const { loadFakeWorker } = this.helper;
    return super._parseHashParams(loadFakeWorker);
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

    console.log("Binding events with signal", signal);

    const AppOptions = this.appOptions;
    // const { eventBus, _boundEvents } = this;

    // _boundEvents.beforePrint = this.beforePrint.bind(this);
    // _boundEvents.afterPrint = this.afterPrint.bind(this);

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
      webViewerReportTelemetry,
    } = this.helper;

    eventBus._on("resize", webViewerResize, { signal });
    eventBus._on("hashchange", webViewerHashchange, { signal });
    eventBus._on("beforeprint", this.beforePrint.bind(this), { signal });
    eventBus._on("afterprint", this.afterPrint.bind(this), { signal });
    eventBus._on("pagerender", webViewerPageRender, { signal });
    eventBus._on("pagerendered", webViewerPageRendered, { signal });
    eventBus._on("updateviewarea", webViewerUpdateViewarea, { signal });
    eventBus._on("pagechanging", webViewerPageChanging, { signal });
    eventBus._on("scalechanging", webViewerScaleChanging, { signal });
    eventBus._on("rotationchanging", webViewerRotationChanging, { signal });
    eventBus._on("sidebarviewchanged", webViewerSidebarViewChanged, { signal });
    eventBus._on("pagemode", webViewerPageMode, { signal });
    eventBus._on("namedaction", webViewerNamedAction, { signal });
    eventBus._on("presentationmodechanged", webViewerPresentationModeChanged, { signal });
    eventBus._on("presentationmode", webViewerPresentationMode, { signal });
    eventBus._on("switchannotationeditormode", webViewerSwitchAnnotationEditorMode, { signal });
    eventBus._on("switchannotationeditorparams", webViewerSwitchAnnotationEditorParams, {
      signal,
    });
    eventBus._on("print", webViewerPrint, { signal });
    eventBus._on("download", webViewerDownload, { signal });
    // eventBus._on("openinexternalapp", webViewerOpenInExternalApp);
    // eventBus._on("save", webViewerSave);
    eventBus._on("firstpage", webViewerFirstPage, { signal });
    eventBus._on("lastpage", webViewerLastPage, { signal });
    eventBus._on("nextpage", webViewerNextPage, { signal });
    eventBus._on("previouspage", webViewerPreviousPage, { signal });
    eventBus._on("zoomin", webViewerZoomIn, { signal });
    eventBus._on("zoomout", webViewerZoomOut, { signal });
    eventBus._on("zoomreset", webViewerZoomReset, { signal });
    eventBus._on("pagenumberchanged", webViewerPageNumberChanged, { signal });
    eventBus._on("scalechanged", webViewerScaleChanged, { signal });
    eventBus._on("rotatecw", webViewerRotateCw, { signal });
    eventBus._on("rotateccw", webViewerRotateCcw, { signal });
    eventBus._on("optionalcontentconfig", webViewerOptionalContentConfig, { signal });
    eventBus._on("switchscrollmode", webViewerSwitchScrollMode, { signal });
    eventBus._on("scrollmodechanged", webViewerScrollModeChanged, { signal });
    eventBus._on("switchspreadmode", webViewerSwitchSpreadMode, { signal });
    eventBus._on("spreadmodechanged", webViewerSpreadModeChanged, { signal });
    eventBus._on("documentproperties", webViewerDocumentProperties, { signal });
    eventBus._on("findfromurlhash", webViewerFindFromUrlHash, { signal });
    eventBus._on("updatefindmatchescount", webViewerUpdateFindMatchesCount, { signal });
    eventBus._on("updatefindcontrolstate", webViewerUpdateFindControlState, { signal });

    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      eventBus._on("fileinputchange", webViewerFileInputChange, { signal });
      eventBus._on("openfile", webViewerOpenFile, { signal });
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
    if (this._windowAbortController) {
      return;
    }
    this._windowAbortController = new AbortController();
    const {
      eventBus,
      appConfig: { mainContainer },
      _windowAbortController: { signal },
    } = this;

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
        signal,
      });
    }
    addWindowResolutionChange();

    // _boundEvents.windowResize = () => {
    //   eventBus.dispatch("resize", { source: window });
    // };
    // _boundEvents.windowHashChange = () => {
    //   eventBus.dispatch("hashchange", {
    //     source: window,
    //     hash: document.location.hash.substring(1),
    //   });
    // };
    // _boundEvents.windowBeforePrint = () => {
    //   eventBus.dispatch("beforeprint", { source: window });
    // };
    // _boundEvents.windowAfterPrint = () => {
    //   eventBus.dispatch("afterprint", { source: window });
    // };
    // _boundEvents.windowUpdateFromSandbox = (event) => {
    //   eventBus.dispatch("updatefromsandbox", {
    //     source: window,
    //     detail: event.detail,
    //   });
    // };

    window.addEventListener("visibilitychange", webViewerVisibilityChange, { signal });
    window.addEventListener("wheel", webViewerWheel, { passive: false, signal });
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
    window.addEventListener("click", webViewerClick, { signal });
    window.addEventListener("keydown", webViewerKeyDown, { signal });
    window.addEventListener("keyup", webViewerKeyUp, { signal });
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
        eventBus.dispatch("beforeprint", { source: window });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "afterprint",
      () => {
        eventBus.dispatch("afterprint", { source: window });
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
    };
  }
}

export { PDFViewerApplication };
